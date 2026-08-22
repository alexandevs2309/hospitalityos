package room

import (
	"github.com/hospitalityos/pkg/es"
)

type Status string

const (
	StatusAvailable  Status = "available"
	StatusOccupied   Status = "occupied"
	StatusCleaning   Status = "cleaning"
	StatusMaintenance Status = "maintenance"
)

type Room struct {
	es.BaseAggregate
	id         string
	tenantID   string
	roomTypeID string
	number     string
	floor      string
	status     Status
}

func NewRoom(id, tenantID, roomTypeID, number, floor string) (*Room, error) {
	if number == "" {
		return nil, ErrRoomNumberRequired
	}
	r := &Room{id: id}
	event := RoomCreated{
		RoomID:     id,
		TenantID:   tenantID,
		RoomTypeID: roomTypeID,
		Number:     number,
		Floor:      floor,
		Status:     string(StatusAvailable),
	}
	r.Apply(event.toEvent())
	r.handleCreated(event)
	return r, nil
}

func (r *Room) ID() string            { return r.id }
func (r *Room) TenantID() string      { return r.tenantID }
func (r *Room) RoomTypeID() string    { return r.roomTypeID }
func (r *Room) Number() string        { return r.number }
func (r *Room) Floor() string         { return r.floor }
func (r *Room) Status() Status        { return r.status }

func (r *Room) SetStatus(newStatus Status) error {
	if err := validateTransition(r.status, newStatus); err != nil {
		return err
	}
	event := RoomStatusChanged{
		RoomID:    r.id,
		OldStatus: string(r.status),
		NewStatus: string(newStatus),
	}
	r.Apply(event.toEvent())
	r.status = newStatus
	return nil
}

func validateTransition(from, to Status) error {
	valid := map[Status][]Status{
		StatusAvailable:  {StatusOccupied, StatusMaintenance},
		StatusOccupied:   {StatusCleaning, StatusMaintenance},
		StatusCleaning:   {StatusAvailable, StatusMaintenance},
		StatusMaintenance: {StatusAvailable},
	}
	for _, allowed := range valid[from] {
		if allowed == to {
			return nil
		}
	}
	return ErrInvalidStatus
}

func (r *Room) Load(events []es.Event) {
	for _, e := range events {
		r.BaseAggregate.Apply(e)
		switch e.Type {
		case "RoomCreated":
			var ev RoomCreated
			ev.FromEvent(e)
			r.handleCreated(ev)
		case "RoomStatusChanged":
			var ev RoomStatusChanged
			ev.FromEvent(e)
			r.status = Status(ev.NewStatus)
		}
	}
}

func (r *Room) handleCreated(e RoomCreated) {
	r.tenantID = e.TenantID
	r.roomTypeID = e.RoomTypeID
	r.number = e.Number
	r.floor = e.Floor
	r.status = Status(e.Status)
}
