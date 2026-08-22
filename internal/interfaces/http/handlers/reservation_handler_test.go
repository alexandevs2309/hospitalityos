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

func (r *inMemoryReservationRepo) Save(_ context.Context, res *reservation.Reservation) error {
	events := res.Uncommitted()
	if len(events) > 0 {
		if err := r.store.Save("reservation-"+res.ID(), events); err != nil {
			return err
		}
	}
	res.ClearUncommitted()
	return nil
}

func (r *inMemoryReservationRepo) Load(_ context.Context, id string) (*reservation.Reservation, error) {
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
	reservationHandler := handlers.NewReservationHandler(createHandler, cancelHandler, nil)
	guestHandler := handlers.NewGuestHandler(nil, nil)
	roomHandler := handlers.NewRoomHandler(nil)
	roomTypeHandler := handlers.NewRoomTypeHandler(nil)
	rateHandler := handlers.NewRateHandler(nil)
	availabilityHandler := handlers.NewAvailabilityHandler(nil)
	router := httplib.NewRouter(reservationHandler, guestHandler, roomHandler, roomTypeHandler, rateHandler, availabilityHandler)
	server := httptest.NewServer(router)
	defer server.Close()

	now := time.Now().Truncate(time.Second)
	body, _ := json.Marshal(map[string]interface{}{
		"reservation_id": "http-test-1",
		"guest_id":       "guest-1",
		"room_id":        "room-1",
		"rate_id":        "rate-1",
		"check_in":       now.Format("2006-01-02"),
		"check_out":      now.Add(48 * time.Hour).Format("2006-01-02"),
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
