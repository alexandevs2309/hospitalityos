package roomtype

import (
	"encoding/json"
	"time"

	"github.com/hospitalityos/pkg/es"
)

type RoomTypeCreated struct {
	RoomTypeID     string `json:"room_type_id"`
	TenantID       string `json:"tenant_id"`
	Name           string `json:"name"`
	Capacity       int    `json:"capacity"`
	BasePriceCents int64  `json:"base_price_cents"`
	Currency       string `json:"currency"`
	Amenities      string `json:"amenities"`
}

func (e RoomTypeCreated) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{Type: "RoomTypeCreated", AggregateID: e.RoomTypeID, Data: data, Timestamp: time.Now()}
}

func (e *RoomTypeCreated) FromEvent(ev es.Event) error { return json.Unmarshal(ev.Data, e) }
