package folio

import (
	"encoding/json"
	"time"

	"github.com/hospitalityos/pkg/es"
)

type EntryAdded struct {
	ReservationID string    `json:"reservation_id"`
	EntryID       string    `json:"entry_id"`
	Type          EntryType `json:"type"`
	Description   string    `json:"description"`
	AmountCents   int64     `json:"amount_cents"`
	Currency      string    `json:"currency"`
	Reference     string    `json:"reference"`
	CreatedBy     string    `json:"created_by"`
	Timestamp     time.Time `json:"timestamp"`
}

func (e EntryAdded) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "FolioEntryAdded",
		AggregateID: e.ReservationID,
		Data:        data,
		Timestamp:   e.Timestamp,
	}
}

func (e *EntryAdded) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}

type FolioClosed struct {
	ReservationID string    `json:"reservation_id"`
	ClosedAt      time.Time `json:"closed_at"`
	FinalBalance  int64     `json:"final_balance"`
}

func (e FolioClosed) toEvent() es.Event {
	data, _ := json.Marshal(e)
	return es.Event{
		Type:        "FolioClosed",
		AggregateID: e.ReservationID,
		Data:        data,
		Timestamp:   e.ClosedAt,
	}
}

func (e *FolioClosed) FromEvent(ev es.Event) error {
	return json.Unmarshal(ev.Data, e)
}
