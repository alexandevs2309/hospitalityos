package reservation_test

import (
	"testing"
	"time"

	"github.com/hospitalityos/internal/domain/reservation"
	"github.com/hospitalityos/pkg/types"
)

func TestNewReservation_Success(t *testing.T) {
	now := time.Now()
	r, err := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if r.ID() != "res-123" {
		t.Errorf("expected id res-123, got %s", r.ID())
	}
	events := r.Uncommitted()
	if len(events) != 1 {
		t.Fatalf("expected 1 uncommitted event, got %d", len(events))
	}
	if events[0].Type != "ReservationCreated" {
		t.Errorf("expected ReservationCreated event, got %s", events[0].Type)
	}
}

func TestNewReservation_InvalidDateRange(t *testing.T) {
	now := time.Now()
	_, err := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(-1*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	if err == nil {
		t.Fatal("expected error for invalid date range")
	}
}

func TestNewReservation_NoAdults(t *testing.T) {
	now := time.Now()
	_, err := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		0, 1, types.NewMoney(20000, types.USD),
	)
	if err == nil {
		t.Fatal("expected error for zero adults")
	}
}

func TestCancel_Success(t *testing.T) {
	now := time.Now()
	r, _ := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	r.ClearUncommitted()

	err := r.Cancel()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	events := r.Uncommitted()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "ReservationCanceled" {
		t.Errorf("expected ReservationCanceled, got %s", events[0].Type)
	}
}

func TestCancel_AlreadyCanceled(t *testing.T) {
	now := time.Now()
	r, _ := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	r.ClearUncommitted()
	r.Cancel()
	r.ClearUncommitted()

	err := r.Cancel()
	if err == nil {
		t.Fatal("expected error for double cancel")
	}
}

func TestCheckIn_Success(t *testing.T) {
	now := time.Now()
	r, _ := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	r.ClearUncommitted()

	err := r.CheckInGuest()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestCheckIn_RequiresConfirmed(t *testing.T) {
	now := time.Now()
	r, _ := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	r.ClearUncommitted()
	r.Cancel()

	err := r.CheckInGuest()
	if err == nil {
		t.Fatal("expected error for canceled reservation check-in")
	}
}

func TestCheckOut_Success(t *testing.T) {
	now := time.Now()
	r, _ := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	r.ClearUncommitted()
	r.CheckInGuest()
	r.ClearUncommitted()

	err := r.CheckOutGuest()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestLoadFromEvents(t *testing.T) {
	now := time.Now()
	original, _ := reservation.NewReservation(
		"res-123", "tenant-1", "guest-1", "room-101", "rate-1",
		now, now.Add(48*time.Hour),
		2, 1, types.NewMoney(20000, types.USD),
	)
	events := original.Uncommitted()
	original.ClearUncommitted()
	original.Cancel()
	events = append(events, original.Uncommitted()...)

	r := &reservation.Reservation{}
	r.Load(events)

	if r.ID() == "" {
		t.Error("expected ID to be set after load")
	}
}
