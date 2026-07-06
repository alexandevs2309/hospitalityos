package reservation

import (
	"encoding/json"
	"time"

	"github.com/hospitalityos/pkg/es"
)

type ReservationCreated struct {
	ReservationID string    `json:"reservation_id"`
	TenantID      string    `json:"tenant_id"`
	GuestID       string    `json:"guest_id"`
	RoomID        string    `json:"room_id"`
	RateID        string    `json:"rate_id"`
	CheckIn       time.Time `json:"check_in"`
	CheckOut      time.Time `json:"check_out"`
	Adults        int       `json:"adults"`
	Children      int       `json:"children"`
	TotalCents    int64     `json:"total_cents"`
	Currency      string    `json:"currency"`
}

func (e ReservationCreated) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "ReservationCreated",
		AggregateID: e.ReservationID,
		Data:        data,
		Timestamp:   time.Now(),
	}
}

func (e *ReservationCreated) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}

type ReservationCanceled struct {
	ReservationID string    `json:"reservation_id"`
	CancelledAt   time.Time `json:"cancelled_at"`
}

func (e ReservationCanceled) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "ReservationCanceled",
		AggregateID: e.ReservationID,
		Data:        data,
		Timestamp:   time.Now(),
	}
}

func (e *ReservationCanceled) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}

type GuestCheckedIn struct {
	ReservationID string    `json:"reservation_id"`
	Timestamp     time.Time `json:"timestamp"`
}

func (e GuestCheckedIn) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "GuestCheckedIn",
		AggregateID: e.ReservationID,
		Data:        data,
		Timestamp:   time.Now(),
	}
}

func (e *GuestCheckedIn) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}

type GuestCheckedOut struct {
	ReservationID string    `json:"reservation_id"`
	Timestamp     time.Time `json:"timestamp"`
}

func (e GuestCheckedOut) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "GuestCheckedOut",
		AggregateID: e.ReservationID,
		Data:        data,
		Timestamp:   time.Now(),
	}
}

func (e *GuestCheckedOut) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}
