package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/hospitalityos/internal/domain/reservation"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
	"github.com/hospitalityos/pkg/types"
)

func TestReservationRepository_SaveAndLoad(t *testing.T) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	store := eventstore.NewInMemoryStore()
	pool, err := NewPool(context.Background(), connStr)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()
	pool.Exec(ctx, `INSERT INTO tenants (id, name, slug) VALUES ('int-test-tenant', 'Test', 'test') ON CONFLICT (id) DO NOTHING`)
	pool.Exec(ctx, `INSERT INTO guests (id, tenant_id, email, first_name, last_name) VALUES ('int-test-guest', 'int-test-tenant', 't@t.com', 'Test', 'User') ON CONFLICT (id) DO NOTHING`)
	pool.Exec(ctx, `INSERT INTO room_types (id, tenant_id, name, capacity) VALUES ('int-test-rt', 'int-test-tenant', 'Test', 2) ON CONFLICT (id) DO NOTHING`)
	pool.Exec(ctx, `INSERT INTO rooms (id, tenant_id, room_type_id, number) VALUES ('int-test-room', 'int-test-tenant', 'int-test-rt', 'T1') ON CONFLICT (id) DO NOTHING`)
	pool.Exec(ctx, `INSERT INTO rates (id, tenant_id, name, amount_cents, currency, start_date, end_date) VALUES ('int-test-rate', 'int-test-tenant', 'Test', 1000, 'USD', NOW(), NOW() + INTERVAL '1 year') ON CONFLICT (id) DO NOTHING`)

	repo := NewReservationRepository(pool, store)
	now := time.Now().Truncate(time.Second)

	id := "int-test-res-" + time.Now().Format("150405.000")
	r, err := reservation.NewReservation(
		id, "int-test-tenant", "int-test-guest", "int-test-room", "int-test-rate",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(15000, types.USD),
	)
	if err != nil {
		t.Fatalf("failed to create: %v", err)
	}

	if err := repo.Save(ctx, r); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	loaded, err := repo.Load(ctx, id)
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}
	if loaded == nil {
		t.Fatal("loaded is nil")
	}
}
