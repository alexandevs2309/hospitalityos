package reservation

import "context"

type Repository interface {
	Save(ctx context.Context, reservation *Reservation) error
	Load(ctx context.Context, id string) (*Reservation, error)
}
