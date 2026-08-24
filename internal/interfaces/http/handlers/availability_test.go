package handlers_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/availability"
	"github.com/hospitalityos/internal/application/reservation"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
	"github.com/hospitalityos/internal/infrastructure/postgres"
)

func getTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	connStr := "postgres://postgres:4CFqpDSBrAfOtZbNsRUi1EgF1@localhost:5432/hospitality?sslmode=disable"
	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		t.Skip("database not available, skipping integration test")
	}
	return pool
}

func TestDoubleBooking_AvailabilityEngineDirectly(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	ctx := context.Background()
	tenantID := "eden-hotel"

	var roomID string
	err := pool.QueryRow(ctx, "SELECT id FROM rooms WHERE tenant_id = $1 LIMIT 1", tenantID).Scan(&roomID)
	if err != nil {
		t.Fatalf("no rooms found: %v", err)
	}

	guestID := fmt.Sprintf("guest-avail-%d", time.Now().UnixNano())
	_, err = pool.Exec(ctx, `INSERT INTO guests (id, tenant_id, first_name, last_name, email, phone)
		VALUES ($1, $2, 'Avail', 'Test', $3, '809-111-0001')`, guestID, tenantID, guestID+"@test.com")
	if err != nil {
		t.Fatalf("insert guest: %v", err)
	}

	var rateID string
	pool.QueryRow(ctx, "SELECT id FROM rates WHERE tenant_id = $1 LIMIT 1", tenantID).Scan(&rateID)

	checkIn := time.Now().AddDate(0, 0, 10).Truncate(24 * time.Hour)
	checkOut := checkIn.AddDate(0, 0, 2)

	resID := fmt.Sprintf("res-avail-%d", time.Now().UnixNano())
	_, err = pool.Exec(ctx, `INSERT INTO reservations (id, tenant_id, guest_id, room_id, rate_id, check_in, check_out, adults, children, total_cents, currency, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 0, 30000, 'DOP', 'confirmed')`,
		resID, tenantID, guestID, roomID, rateID, checkIn, checkOut)
	if err != nil {
		t.Fatalf("insert reservation: %v", err)
	}

	availEngine := availability.NewEngine(pool)

	available, err := availEngine.IsRoomAvailable(ctx, tenantID, roomID, checkIn, checkOut)
	if err != nil {
		t.Fatalf("availability check failed: %v", err)
	}
	if available {
		t.Error("room should NOT be available (already booked)")
	}

	overlappingStart := checkIn.AddDate(0, 0, 1)
	overlappingEnd := checkOut.AddDate(0, 0, 1)
	available, err = availEngine.IsRoomAvailable(ctx, tenantID, roomID, overlappingStart, overlappingEnd)
	if err != nil {
		t.Fatalf("availability check failed: %v", err)
	}
	if available {
		t.Error("overlapping range should NOT be available")
	}

	futureStart := checkOut.AddDate(0, 0, 5)
	futureEnd := futureStart.AddDate(0, 0, 2)
	available, err = availEngine.IsRoomAvailable(ctx, tenantID, roomID, futureStart, futureEnd)
	if err != nil {
		t.Fatalf("availability check failed: %v", err)
	}
	if !available {
		t.Error("non-overlapping future range should be available")
	}

	pool.Exec(ctx, "DELETE FROM reservations WHERE id = $1", resID)
	pool.Exec(ctx, "DELETE FROM guests WHERE id = $1", guestID)
}

func TestDoubleBooking_PreventedByConcurrency(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	ctx := context.Background()
	tenantID := "eden-hotel"

	var roomID string
	err := pool.QueryRow(ctx, "SELECT id FROM rooms WHERE tenant_id = $1 LIMIT 1", tenantID).Scan(&roomID)
	if err != nil {
		t.Fatalf("no rooms found: %v", err)
	}

	guestID := fmt.Sprintf("guest-conc-%d", time.Now().UnixNano())
	_, err = pool.Exec(ctx, `INSERT INTO guests (id, tenant_id, first_name, last_name, email, phone)
		VALUES ($1, $2, 'Concurrent', 'Test', $3, '809-222-0001')`, guestID, tenantID, guestID+"@test.com")
	if err != nil {
		t.Fatalf("insert guest: %v", err)
	}

	var rateID string
	pool.QueryRow(ctx, "SELECT id FROM rates WHERE tenant_id = $1 LIMIT 1", tenantID).Scan(&rateID)

	checkIn := time.Now().AddDate(0, 0, 20).Truncate(24 * time.Hour)
	checkOut := checkIn.AddDate(0, 0, 3)

	pgStore := eventstore.NewPGStore(pool)
	repo := postgres.NewReservationRepository(pool, pgStore)
	createHandler := reservation.NewCreateReservationHandler(repo)
	availEngine := availability.NewEngine(pool)

	var successCount int64
	var errCount int64
	var wg sync.WaitGroup

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			available, _ := availEngine.IsRoomAvailable(ctx, tenantID, roomID, checkIn, checkOut)
			if !available {
				return
			}

			cmd := reservation.CreateReservationCommand{
				ReservationID: fmt.Sprintf("conc-%d-%d", time.Now().UnixNano(), id),
				TenantID:      tenantID,
				GuestID:       guestID,
				RoomID:        roomID,
				RateID:        rateID,
				CheckIn:       checkIn,
				CheckOut:      checkOut,
				Adults:        1,
				Children:      0,
				TotalCents:    50000,
				Currency:      "DOP",
			}

			err := createHandler.Handle(ctx, cmd)
			if err != nil {
				atomic.AddInt64(&errCount, 1)
			} else {
				atomic.AddInt64(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()

	pool.Exec(ctx, "DELETE FROM reservations WHERE guest_id = $1 AND room_id = $2", guestID, roomID)
	pool.Exec(ctx, "DELETE FROM guests WHERE id = $1", guestID)

	t.Logf("Concurrent attempts: 10, Successful: %d, Failed: %d", successCount, errCount)
	if successCount != 1 {
		t.Errorf("expected exactly 1 successful booking, got %d", successCount)
	}
}
