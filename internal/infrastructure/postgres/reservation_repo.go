package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/reservation"
	"github.com/hospitalityos/pkg/es"
)

type ReservationRepository struct {
	pool  *pgxpool.Pool
	store es.EventStore
}

func NewReservationRepository(pool *pgxpool.Pool, store es.EventStore) *ReservationRepository {
	return &ReservationRepository{pool: pool, store: store}
}

func (r *ReservationRepository) Save(ctx context.Context, res *reservation.Reservation) error {
	events := res.Uncommitted()
	if len(events) == 0 {
		return nil
	}
	streamID := "reservation-" + res.ID()
	if err := r.store.Save(streamID, events); err != nil {
		return err
	}
	if err := r.project(ctx, res.ID(), events); err != nil {
		return err
	}
	res.ClearUncommitted()
	return nil
}

func (r *ReservationRepository) Load(ctx context.Context, id string) (*reservation.Reservation, error) {
	streamID := "reservation-" + id
	events, err := r.store.Load(streamID)
	if err != nil {
		return nil, err
	}
	r2 := &reservation.Reservation{}
	r2.Load(events)
	return r2, nil
}

func (r *ReservationRepository) project(ctx context.Context, id string, events []es.Event) error {
	for _, event := range events {
		switch event.Type {
		case "ReservationCreated":
			var ev reservation.ReservationCreated
			if err := ev.FromEvent(event); err != nil {
				return err
			}
			if err := r.insertReadModel(ctx, ev); err != nil {
				return err
			}
		case "ReservationCanceled":
			_, err := r.pool.Exec(ctx,
				`UPDATE reservations SET status = 'canceled', updated_at = NOW() WHERE id = $1`, id)
			if err != nil {
				return err
			}
		case "GuestCheckedIn":
			_, err := r.pool.Exec(ctx,
				`UPDATE reservations SET status = 'checked_in', updated_at = NOW() WHERE id = $1`, id)
			if err != nil {
				return err
			}
		case "GuestCheckedOut":
			_, err := r.pool.Exec(ctx,
				`UPDATE reservations SET status = 'checked_out', updated_at = NOW() WHERE id = $1`, id)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *ReservationRepository) insertReadModel(ctx context.Context, ev reservation.ReservationCreated) error {
	metadata, _ := json.Marshal(map[string]string{})
	_, err := r.pool.Exec(ctx, `
		INSERT INTO reservations (id, tenant_id, guest_id, room_id, rate_id, check_in, check_out, adults, children, total_cents, currency, status, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed', $12, NOW(), NOW())
	`, ev.ReservationID, ev.TenantID, ev.GuestID, ev.RoomID, ev.RateID, ev.CheckIn, ev.CheckOut, ev.Adults, ev.Children, ev.TotalCents, ev.Currency, metadata)
	return err
}
