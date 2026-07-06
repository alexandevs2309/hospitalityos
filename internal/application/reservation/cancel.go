package reservation

import (
	"context"

	domain "github.com/hospitalityos/internal/domain/reservation"
)

type CancelReservationCommand struct {
	ReservationID string
}

type CancelReservationHandler struct {
	repo domain.Repository
}

func NewCancelReservationHandler(repo domain.Repository) *CancelReservationHandler {
	return &CancelReservationHandler{repo: repo}
}

func (h *CancelReservationHandler) Handle(ctx context.Context, cmd CancelReservationCommand) error {
	r, err := h.repo.Load(ctx, cmd.ReservationID)
	if err != nil {
		return err
	}
	if err := r.Cancel(); err != nil {
		return err
	}
	return h.repo.Save(ctx, r)
}
