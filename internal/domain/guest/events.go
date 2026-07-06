package guest

import (
	"encoding/json"
	"time"

	"github.com/hospitalityos/pkg/es"
)

type GuestCreated struct {
	GuestID   string `json:"guest_id"`
	TenantID  string `json:"tenant_id"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (e GuestCreated) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "GuestCreated",
		AggregateID: e.GuestID,
		Data:        data,
		Timestamp:   time.Now(),
	}
}

func (e *GuestCreated) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}

type GuestProfileUpdated struct {
	GuestID   string `json:"guest_id"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (e GuestProfileUpdated) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "GuestProfileUpdated",
		AggregateID: e.GuestID,
		Data:        data,
		Timestamp:   time.Now(),
	}
}

func (e *GuestProfileUpdated) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}
