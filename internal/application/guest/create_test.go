package guest_test

import (
	"context"
	"sync"
	"testing"

	"github.com/hospitalityos/internal/application/guest"
	domainguest "github.com/hospitalityos/internal/domain/guest"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
	"github.com/hospitalityos/pkg/es"
)

type inMemoryGuestRepo struct {
	mu    sync.RWMutex
	store es.EventStore
	items map[string]*domainguest.Guest
}

func newRepo() *inMemoryGuestRepo {
	return &inMemoryGuestRepo{
		store: eventstore.NewInMemoryStore(),
		items: make(map[string]*domainguest.Guest),
	}
}

func (r *inMemoryGuestRepo) Save(ctx context.Context, g *domainguest.Guest) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	events := g.Uncommitted()
	if len(events) > 0 {
		if err := r.store.Save("guest-"+g.ID(), events); err != nil {
			return err
		}
	}
	r.items[g.ID()] = g
	g.ClearUncommitted()
	return nil
}

func (r *inMemoryGuestRepo) Load(ctx context.Context, id string) (*domainguest.Guest, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	events, err := r.store.Load("guest-" + id)
	if err != nil {
		return nil, err
	}
	g := &domainguest.Guest{}
	g.Load(events)
	return g, nil
}

func TestCreateGuest(t *testing.T) {
	repo := newRepo()
	handler := guest.NewCreateGuestHandler(repo)

	cmd := guest.CreateGuestCommand{
		GuestID:   "app-guest-1",
		TenantID:  "tenant-1",
		Email:     "maria@example.com",
		Phone:     "+521234567890",
		FirstName: "Maria",
		LastName:  "Lopez",
	}

	err := handler.Handle(context.Background(), cmd)
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	loaded, err := repo.Load(context.Background(), "app-guest-1")
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}
	if loaded == nil {
		t.Fatal("loaded guest is nil")
	}
}

func TestCreateGuest_InvalidEmail(t *testing.T) {
	repo := newRepo()
	handler := guest.NewCreateGuestHandler(repo)

	cmd := guest.CreateGuestCommand{
		GuestID:   "app-guest-2",
		Email:     "bad",
		FirstName: "Test",
		LastName:  "User",
	}

	err := handler.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("expected error for invalid email")
	}
}
