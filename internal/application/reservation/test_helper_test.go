package reservation_test

import (
	"context"
	"sync"

	"github.com/hospitalityos/internal/domain/reservation"
	"github.com/hospitalityos/pkg/es"
)

type inMemoryReservationRepo struct {
	mu      sync.RWMutex
	store   es.EventStore
	entries map[string]*reservation.Reservation
}

func newInMemoryReservationRepo(store es.EventStore) *inMemoryReservationRepo {
	return &inMemoryReservationRepo{
		store:   store,
		entries: make(map[string]*reservation.Reservation),
	}
}

func (r *inMemoryReservationRepo) Save(ctx context.Context, res *reservation.Reservation) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	events := res.Uncommitted()
	if len(events) > 0 {
		if err := r.store.Save("reservation-"+res.ID(), events); err != nil {
			return err
		}
	}
	r.entries[res.ID()] = res
	res.ClearUncommitted()
	return nil
}

func (r *inMemoryReservationRepo) Load(ctx context.Context, id string) (*reservation.Reservation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	events, err := r.store.Load("reservation-" + id)
	if err != nil {
		return nil, err
	}
	res := &reservation.Reservation{}
	res.Load(events)
	return res, nil
}
