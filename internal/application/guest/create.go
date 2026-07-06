package guest

import (
	"context"

	"github.com/hospitalityos/internal/domain/guest"
)

type CreateGuestCommand struct {
	GuestID   string
	TenantID  string
	Email     string
	Phone     string
	FirstName string
	LastName  string
}

type CreateGuestHandler struct {
	repo guest.Repository
}

func NewCreateGuestHandler(repo guest.Repository) *CreateGuestHandler {
	return &CreateGuestHandler{repo: repo}
}

func (h *CreateGuestHandler) Handle(ctx context.Context, cmd CreateGuestCommand) error {
	g, err := guest.NewGuest(cmd.GuestID, cmd.TenantID, cmd.Email, cmd.Phone, cmd.FirstName, cmd.LastName)
	if err != nil {
		return err
	}
	return h.repo.Save(ctx, g)
}
