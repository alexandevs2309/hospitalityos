package reservation_test

import (
	"context"
	"testing"
	"time"

	app "github.com/hospitalityos/internal/application/reservation"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
)

func TestCreateAndCancelReservation(t *testing.T) {
	store := eventstore.NewInMemoryStore()
	repo := newInMemoryReservationRepo(store)
	ctx := context.Background()

	createHandler := app.NewCreateReservationHandler(repo)
	cancelHandler := app.NewCancelReservationHandler(repo)

	now := time.Now().Truncate(time.Second)
	cmd := app.CreateReservationCommand{
		ReservationID: "app-test-1",
		TenantID:      "tenant-1",
		GuestID:       "guest-1",
		RoomID:        "room-1",
		RateID:        "rate-1",
		CheckIn:       now,
		CheckOut:      now.Add(48 * time.Hour),
		Adults:        2,
		Children:      0,
		TotalCents:    10000,
		Currency:      "USD",
	}

	if err := createHandler.Handle(ctx, cmd); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	cancelCmd := app.CancelReservationCommand{
		ReservationID: "app-test-1",
		TenantID:      "tenant-1",
	}
	if err := cancelHandler.Handle(ctx, cancelCmd); err != nil {
		t.Fatalf("cancel failed: %v", err)
	}

	loaded, err := repo.Load(ctx, "app-test-1")
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}
	if loaded == nil {
		t.Fatal("loaded reservation is nil")
	}
}

func TestCreateReservation_InvalidTotal(t *testing.T) {
	store := eventstore.NewInMemoryStore()
	repo := newInMemoryReservationRepo(store)
	handler := app.NewCreateReservationHandler(repo)

	cmd := app.CreateReservationCommand{
		ReservationID: "test-invalid",
		TotalCents:    0,
	}
	err := handler.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("expected error for zero total")
	}
}
