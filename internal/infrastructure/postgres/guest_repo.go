package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/guest"
	"github.com/hospitalityos/pkg/es"
)

type GuestRepository struct {
	pool  *pgxpool.Pool
	store es.EventStore
}

func NewGuestRepository(pool *pgxpool.Pool, store es.EventStore) *GuestRepository {
	return &GuestRepository{pool: pool, store: store}
}

func (r *GuestRepository) Save(ctx context.Context, g *guest.Guest) error {
	events := g.Uncommitted()
	if len(events) == 0 {
		return nil
	}
	streamID := "guest-" + g.ID()
	if err := r.store.Save(streamID, events); err != nil {
		return err
	}
	if err := r.project(ctx, g.ID(), g.TenantID(), events); err != nil {
		return err
	}
	g.ClearUncommitted()
	return nil
}

func (r *GuestRepository) Load(ctx context.Context, id string) (*guest.Guest, error) {
	events, err := r.store.Load("guest-" + id)
	if err != nil {
		return nil, err
	}
	g := &guest.Guest{}
	g.Load(events)
	return g, nil
}

func (r *GuestRepository) project(ctx context.Context, id, tenantID string, events []es.Event) error {
	for _, event := range events {
		switch event.Type {
		case "GuestCreated":
			var ev guest.GuestCreated
			if err := ev.FromEvent(event); err != nil {
				return err
			}
			if err := r.insertReadModel(ctx, ev); err != nil {
				return err
			}
		case "GuestProfileUpdated":
			var ev guest.GuestProfileUpdated
			if err := ev.FromEvent(event); err != nil {
				return err
			}
			_, err := r.pool.Exec(ctx, `
				UPDATE guests SET email = $1, phone = $2, first_name = $3, last_name = $4, updated_at = NOW()
				WHERE id = $5 AND tenant_id = $6
			`, ev.Email, ev.Phone, ev.FirstName, ev.LastName, id, tenantID)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *GuestRepository) insertReadModel(ctx context.Context, ev guest.GuestCreated) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO guests (id, tenant_id, email, phone, first_name, last_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET email = $3, phone = $4, first_name = $5, last_name = $6, updated_at = NOW()
	`, ev.GuestID, ev.TenantID, ev.Email, ev.Phone, ev.FirstName, ev.LastName)
	return err
}
