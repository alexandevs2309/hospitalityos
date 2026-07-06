package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	app "github.com/hospitalityos/internal/application/reservation"
	"github.com/hospitalityos/internal/domain/reservation"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
	httplib "github.com/hospitalityos/internal/interfaces/http"
	"github.com/hospitalityos/internal/interfaces/http/handlers"
	"github.com/hospitalityos/pkg/es"
)

type inMemoryReservationRepo struct {
	store es.EventStore
}

func newRepo() *inMemoryReservationRepo {
	return &inMemoryReservationRepo{store: eventstore.NewInMemoryStore()}
}

func (r *inMemoryReservationRepo) Save(ctx context.Context, res *reservation.Reservation) error {
	events := res.Uncommitted()
	if len(events) > 0 {
		if err := r.store.Save("reservation-"+res.ID(), events); err != nil {
			return err
		}
	}
	res.ClearUncommitted()
	return nil
}

func (r *inMemoryReservationRepo) Load(ctx context.Context, id string) (*reservation.Reservation, error) {
	events, err := r.store.Load("reservation-" + id)
	if err != nil {
		return nil, err
	}
	res := &reservation.Reservation{}
	res.Load(events)
	return res, nil
}

func TestCreateReservationViaHTTP(t *testing.T) {
	repo := newRepo()
	createHandler := app.NewCreateReservationHandler(repo)
	cancelHandler := app.NewCancelReservationHandler(repo)
	reservationHandler := handlers.NewReservationHandler(createHandler, cancelHandler)

	emptyGuestHandler := handlers.NewGuestHandler(nil)
	router := httplib.NewRouter(reservationHandler, emptyGuestHandler)
	server := httptest.NewServer(router)
	defer server.Close()

	now := time.Now().Truncate(time.Second)
	body, _ := json.Marshal(map[string]interface{}{
		"reservation_id": "http-test-1",
		"guest_id":       "guest-1",
		"room_id":        "room-1",
		"rate_id":        "rate-1",
		"check_in":       now.Format(time.RFC3339),
		"check_out":      now.Add(48 * time.Hour).Format(time.RFC3339),
		"adults":         2,
		"children":       0,
		"total_cents":    20000,
		"currency":       "USD",
	})

	req, _ := http.NewRequest("POST", server.URL+"/v1/reservations", bytes.NewReader(body))
	req.Header.Set("X-Tenant-ID", "tenant-1")
	req.Header.Set("Authorization", "Bearer test-token")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected 201, got %d", resp.StatusCode)
	}
}
