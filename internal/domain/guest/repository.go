package guest

import "context"

type Repository interface {
	Save(ctx context.Context, guest *Guest) error
	Load(ctx context.Context, id string) (*Guest, error)
}
