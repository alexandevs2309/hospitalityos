package reservation

import (
	"time"

	"github.com/hospitalityos/pkg/es"
	"github.com/hospitalityos/pkg/types"
)

type Status string

const (
	StatusPending   Status = "pending"
	StatusConfirmed Status = "confirmed"
	StatusCanceled  Status = "canceled"
	StatusCheckedIn Status = "checked_in"
	StatusCheckedOut Status = "checked_out"
)

type Reservation struct {
	es.BaseAggregate
	id          string
	tenantID    string
	guestID     string
	roomID      string
	rateID      string
	checkIn     time.Time
	checkOut    time.Time
	status      Status
	adults      int
	children    int
	total       types.Money
}

func NewReservation(id, tenantID, guestID, roomID, rateID string, checkIn, checkOut time.Time, adults, children int, total types.Money) (*Reservation, error) {
	if checkIn.IsZero() || checkOut.IsZero() {
		return nil, ErrInvalidDateRange
	}
	if !checkOut.After(checkIn) {
		return nil, ErrInvalidDateRange
	}
	if adults < 1 {
		return nil, ErrInvalidGuests
	}
	if total.IsZero() {
		return nil, ErrInvalidAmount
	}

	r := &Reservation{id: id}
	event := ReservationCreated{
		ReservationID: id,
		TenantID:      tenantID,
		GuestID:       guestID,
		RoomID:        roomID,
		RateID:        rateID,
		CheckIn:       checkIn,
		CheckOut:      checkOut,
		Adults:        adults,
		Children:      children,
		TotalCents:    total.Cents(),
		Currency:      string(total.Currency()),
	}
	r.Apply(event.toEvent())
	r.handleCreated(event)
	return r, nil
}

func (r *Reservation) Cancel() error {
	if r.status == StatusCanceled {
		return ErrAlreadyCanceled
	}
	if r.status == StatusCheckedOut {
		return ErrCannotCancelCheckedOut
	}
	event := ReservationCanceled{
		ReservationID: r.ID(),
	}
	r.Apply(event.toEvent())
	r.handleCanceled(event)
	return nil
}

func (r *Reservation) CheckInGuest() error {
	if r.status != StatusConfirmed {
		return ErrInvalidStatus
	}
	event := GuestCheckedIn{
		ReservationID: r.ID(),
		Timestamp:     time.Now(),
	}
	r.Apply(event.toEvent())
	r.handleCheckedIn(event)
	return nil
}

func (r *Reservation) CheckOutGuest() error {
	if r.status != StatusCheckedIn {
		return ErrInvalidStatus
	}
	event := GuestCheckedOut{
		ReservationID: r.ID(),
		Timestamp:     time.Now(),
	}
	r.Apply(event.toEvent())
	r.handleCheckedOut(event)
	return nil
}

func (r *Reservation) Load(events []es.Event) {
	for _, e := range events {
		r.BaseAggregate.Apply(e)
		switch e.Type {
		case "ReservationCreated":
			var ev ReservationCreated
			ev.FromEvent(e)
			r.id = ev.ReservationID
			r.handleCreated(ev)
		case "ReservationCanceled":
			var ev ReservationCanceled
			ev.FromEvent(e)
			r.handleCanceled(ev)
		case "GuestCheckedIn":
			var ev GuestCheckedIn
			ev.FromEvent(e)
			r.handleCheckedIn(ev)
		case "GuestCheckedOut":
			var ev GuestCheckedOut
			ev.FromEvent(e)
			r.handleCheckedOut(ev)
		}
	}
}

func (r *Reservation) ID() string      { return r.id }
func (r *Reservation) TenantID() string { return r.tenantID }
func (r *Reservation) RoomID() string   { return r.roomID }
func (r *Reservation) CheckIn() time.Time  { return r.checkIn }
func (r *Reservation) CheckOut() time.Time { return r.checkOut }

func (r *Reservation) handleCreated(e ReservationCreated) {
	r.tenantID = e.TenantID
	r.guestID = e.GuestID
	r.roomID = e.RoomID
	r.rateID = e.RateID
	r.checkIn = e.CheckIn
	r.checkOut = e.CheckOut
	r.adults = e.Adults
	r.children = e.Children
	r.total = types.NewMoney(e.TotalCents, types.Currency(e.Currency))
	r.status = StatusConfirmed
}

func (r *Reservation) handleCanceled(_ ReservationCanceled) {
	r.status = StatusCanceled
}

func (r *Reservation) handleCheckedIn(_ GuestCheckedIn) {
	r.status = StatusCheckedIn
}

func (r *Reservation) handleCheckedOut(_ GuestCheckedOut) {
	r.status = StatusCheckedOut
}
