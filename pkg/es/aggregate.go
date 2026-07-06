package es

import "time"

type Aggregate interface {
	ID() string
	Version() int
	Load(events []Event)
	Uncommitted() []Event
	ClearUncommitted()
}

type Event struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	AggregateID string  `json:"aggregate_id"`
	Data      []byte    `json:"data"`
	Version   int       `json:"version"`
	Timestamp time.Time `json:"timestamp"`
}

type BaseAggregate struct {
	id         string
	version    int
	uncommitted []Event
}

func (b *BaseAggregate) ID() string            { return b.id }
func (b *BaseAggregate) Version() int          { return b.version }
func (b *BaseAggregate) Uncommitted() []Event  { return b.uncommitted }
func (b *BaseAggregate) ClearUncommitted()     { b.uncommitted = nil }

func (b *BaseAggregate) Apply(event Event) {
	b.uncommitted = append(b.uncommitted, event)
	b.version++
}

type EventStore interface {
	Save(streamID string, events []Event) error
	Load(streamID string) ([]Event, error)
}
