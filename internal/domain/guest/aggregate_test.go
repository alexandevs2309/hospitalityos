package guest_test

import (
	"testing"

	"github.com/hospitalityos/internal/domain/guest"
)

func TestNewGuest_Success(t *testing.T) {
	g, err := guest.NewGuest("g-1", "t-1", "juan@example.com", "+521234567890", "Juan", "Perez")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if g.ID() != "g-1" {
		t.Errorf("expected g-1, got %s", g.ID())
	}
	events := g.Uncommitted()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "GuestCreated" {
		t.Errorf("expected GuestCreated, got %s", events[0].Type)
	}
}

func TestNewGuest_NoEmail(t *testing.T) {
	_, err := guest.NewGuest("g-1", "t-1", "", "", "Juan", "Perez")
	if err == nil {
		t.Fatal("expected error for empty email")
	}
}

func TestNewGuest_InvalidEmail(t *testing.T) {
	_, err := guest.NewGuest("g-1", "t-1", "not-an-email", "", "Juan", "Perez")
	if err == nil {
		t.Fatal("expected error for invalid email")
	}
}

func TestNewGuest_NoName(t *testing.T) {
	_, err := guest.NewGuest("g-1", "t-1", "juan@example.com", "", "", "")
	if err == nil {
		t.Fatal("expected error for empty name")
	}
}

func TestUpdateProfile(t *testing.T) {
	g, _ := guest.NewGuest("g-1", "t-1", "juan@example.com", "+521234567890", "Juan", "Perez")
	g.ClearUncommitted()

	err := g.UpdateProfile("juan.nuevo@example.com", "+521111111111", "Juan", "Martinez")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	events := g.Uncommitted()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "GuestProfileUpdated" {
		t.Errorf("expected GuestProfileUpdated, got %s", events[0].Type)
	}
}

func TestLoadFromEvents(t *testing.T) {
	original, _ := guest.NewGuest("g-1", "t-1", "juan@example.com", "+521234567890", "Juan", "Perez")
	events := original.Uncommitted()

	g := &guest.Guest{}
	g.Load(events)

	if g.ID() != "g-1" {
		t.Errorf("expected id g-1 after load, got %s", g.ID())
	}
}
