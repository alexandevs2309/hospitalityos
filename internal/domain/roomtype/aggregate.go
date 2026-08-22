package roomtype

import (
	"github.com/hospitalityos/pkg/es"
)

type RoomType struct {
	es.BaseAggregate
	id           string
	tenantID     string
	name         string
	capacity     int
	basePriceCents int64
	currency     string
	amenities    string
}

func NewRoomType(id, tenantID, name string, capacity int, basePriceCents int64, currency, amenities string) (*RoomType, error) {
	if name == "" {
		return nil, ErrNameRequired
	}
	if capacity < 1 {
		return nil, ErrInvalidCapacity
	}
	rt := &RoomType{id: id}
	event := RoomTypeCreated{
		RoomTypeID:    id,
		TenantID:      tenantID,
		Name:          name,
		Capacity:      capacity,
		BasePriceCents: basePriceCents,
		Currency:      currency,
		Amenities:     amenities,
	}
	rt.Apply(event.toEvent())
	rt.handleCreated(event)
	return rt, nil
}

func (rt *RoomType) ID() string          { return rt.id }
func (rt *RoomType) Name() string        { return rt.name }
func (rt *RoomType) Capacity() int       { return rt.capacity }
func (rt *RoomType) BasePriceCents() int64 { return rt.basePriceCents }

func (rt *RoomType) Load(events []es.Event) {
	for _, e := range events {
		rt.BaseAggregate.Apply(e)
		if e.Type == "RoomTypeCreated" {
			var ev RoomTypeCreated
			ev.FromEvent(e)
			rt.handleCreated(ev)
		}
	}
}

func (rt *RoomType) handleCreated(e RoomTypeCreated) {
	rt.tenantID = e.TenantID
	rt.name = e.Name
	rt.capacity = e.Capacity
	rt.basePriceCents = e.BasePriceCents
	rt.currency = e.Currency
	rt.amenities = e.Amenities
}
