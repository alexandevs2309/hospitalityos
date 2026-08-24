package guest

import (
	"regexp"

	"github.com/hospitalityos/pkg/es"
)

type Guest struct {
	es.BaseAggregate
	id        string
	tenantID  string
	email     string
	phone     string
	firstName string
	lastName  string
}

func NewGuest(id, tenantID, email, phone, firstName, lastName string) (*Guest, error) {
	if email == "" {
		return nil, ErrEmailRequired
	}
	if !emailRegex.MatchString(email) {
		return nil, ErrInvalidEmail
	}
	if firstName == "" || lastName == "" {
		return nil, ErrNameRequired
	}

	g := &Guest{id: id}
	event := GuestCreated{
		GuestID:   id,
		TenantID:  tenantID,
		Email:     email,
		Phone:     phone,
		FirstName: firstName,
		LastName:  lastName,
	}
	g.Apply(event.toEvent())
	g.handleCreated(event)
	return g, nil
}

func (g *Guest) ID() string      { return g.id }
func (g *Guest) TenantID() string { return g.tenantID }

func (g *Guest) UpdateProfile(email, phone, firstName, lastName string) error {
	if firstName == "" || lastName == "" {
		return ErrNameRequired
	}
	if email != "" && !emailRegex.MatchString(email) {
		return ErrInvalidEmail
	}
	event := GuestProfileUpdated{
		GuestID:   g.id,
		Email:     email,
		Phone:     phone,
		FirstName: firstName,
		LastName:  lastName,
	}
	g.Apply(event.toEvent())
	g.handleUpdated(event)
	return nil
}

func (g *Guest) Load(events []es.Event) {
	for _, e := range events {
		g.BaseAggregate.Apply(e)
		switch e.Type {
		case "GuestCreated":
			var ev GuestCreated
			ev.FromEvent(e)
			g.id = ev.GuestID
			g.handleCreated(ev)
		case "GuestProfileUpdated":
			var ev GuestProfileUpdated
			ev.FromEvent(e)
			g.handleUpdated(ev)
		}
	}
}

func (g *Guest) handleCreated(e GuestCreated) {
	g.tenantID = e.TenantID
	g.email = e.Email
	g.phone = e.Phone
	g.firstName = e.FirstName
	g.lastName = e.LastName
}

func (g *Guest) handleUpdated(e GuestProfileUpdated) {
	g.email = e.Email
	g.phone = e.Phone
	g.firstName = e.FirstName
	g.lastName = e.LastName
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
