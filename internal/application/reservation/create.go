package reservation

import (
	"context"
	"time"

	domain "github.com/hospitalityos/internal/domain/reservation"
	"github.com/hospitalityos/pkg/types"
)

type CreateReservationCommand struct {
	ReservationID string
	TenantID      string
	GuestID       string
	RoomID        string
	RateID        string
	CheckIn       time.Time
	CheckOut      time.Time
	Adults        int
	Children      int
	TotalCents    int64
	Currency      string
}

type CreateReservationHandler struct {
	repo domain.Repository
}

func NewCreateReservationHandler(repo domain.Repository) *CreateReservationHandler {
	return &CreateReservationHandler{repo: repo}
}

func (h *CreateReservationHandler) Handle(ctx context.Context, cmd CreateReservationCommand) error {
	money := types.NewMoney(cmd.TotalCents, types.Currency(cmd.Currency))
	reservation, err := domain.NewReservation(
		cmd.ReservationID,
		cmd.TenantID,
		cmd.GuestID,
		cmd.RoomID,
		cmd.RateID,
		cmd.CheckIn,
		cmd.CheckOut,
		cmd.Adults,
		cmd.Children,
		money,
	)
	if err != nil {
		return err
	}
	return h.repo.Save(ctx, reservation)
}
