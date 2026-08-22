package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/room"
	"github.com/hospitalityos/pkg/es"
)

type RoomRepository struct {
	pool  *pgxpool.Pool
	store es.EventStore
}

func NewRoomRepository(pool *pgxpool.Pool, store es.EventStore) *RoomRepository {
	return &RoomRepository{pool: pool, store: store}
}

func (r *RoomRepository) Save(ctx context.Context, rm *room.Room) error {
	events := rm.Uncommitted()
	if len(events) == 0 {
		return nil
	}
	streamID := "room-" + rm.ID()
	if err := r.store.Save(streamID, events); err != nil {
		return err
	}
	for _, event := range events {
		switch event.Type {
		case "RoomCreated":
			var ev room.RoomCreated
			if err := ev.FromEvent(event); err != nil {
				return err
			}
			_, err := r.pool.Exec(ctx, `
				INSERT INTO rooms (id, tenant_id, room_type_id, number, floor, status, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
				ON CONFLICT (id) DO UPDATE SET room_type_id=$3, number=$4, floor=$5, status=$6, updated_at=NOW()
			`, ev.RoomID, ev.TenantID, ev.RoomTypeID, ev.Number, ev.Floor, ev.Status)
			if err != nil {
				return err
			}
		case "RoomStatusChanged":
			var ev room.RoomStatusChanged
			if err := ev.FromEvent(event); err != nil {
				return err
			}
			_, err := r.pool.Exec(ctx, `UPDATE rooms SET status=$1, updated_at=NOW() WHERE id=$2`, ev.NewStatus, rm.ID())
			if err != nil {
				return err
			}
		}
	}
	rm.ClearUncommitted()
	return nil
}

func (r *RoomRepository) Load(ctx context.Context, id string) (*room.Room, error) {
	events, err := r.store.Load("room-" + id)
	if err != nil {
		return nil, err
	}
	rm := &room.Room{}
	rm.Load(events)
	return rm, nil
}

func (r *RoomRepository) ListByTenant(ctx context.Context, tenantID string) ([]*room.Room, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, tenant_id, room_type_id, number, floor, status FROM rooms WHERE tenant_id=$1 ORDER BY number`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*room.Room
	for rows.Next() {
		var id, tid, rtid, num, fl, st string
		if err := rows.Scan(&id, &tid, &rtid, &num, &fl, &st); err != nil {
			return nil, err
		}
		rm, err := r.Load(ctx, id)
		if err != nil {
			rm = &room.Room{}
		}
		rooms = append(rooms, rm)
	}
	return rooms, nil
}

func (r *RoomRepository) ListByTenantAndStatus(ctx context.Context, tenantID string, status room.Status) ([]*room.Room, error) {
	rows, err := r.pool.Query(ctx, `SELECT id FROM rooms WHERE tenant_id=$1 AND status=$2 ORDER BY number`, tenantID, string(status))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*room.Room
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		rm, err := r.Load(ctx, id)
		if err != nil {
			continue
		}
		rooms = append(rooms, rm)
	}
	return rooms, nil
}
