package room

import (
	"encoding/json"
	"time"

	"github.com/hospitalityos/pkg/es"
)

type RoomCreated struct {
	RoomID     string `json:"room_id"`
	TenantID   string `json:"tenant_id"`
	RoomTypeID string `json:"room_type_id"`
	Number     string `json:"number"`
	Floor      string `json:"floor"`
	Status     string `json:"status"`
}

func (e RoomCreated) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{Type: "RoomCreated", AggregateID: e.RoomID, Data: data, Timestamp: time.Now()}
}

func (e *RoomCreated) FromEvent(ev es.Event) error { return json.Unmarshal(ev.Data, e) }

type RoomStatusChanged struct {
	RoomID    string `json:"room_id"`
	OldStatus string `json:"old_status"`
	NewStatus string `json:"new_status"`
}

func (e RoomStatusChanged) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{Type: "RoomStatusChanged", AggregateID: e.RoomID, Data: data, Timestamp: time.Now()}
}

func (e *RoomStatusChanged) FromEvent(ev es.Event) error { return json.Unmarshal(ev.Data, e) }
