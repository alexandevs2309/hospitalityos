package roomtype

import "context"

type Repository interface {
	Save(ctx context.Context, rt *RoomType) error
	Load(ctx context.Context, id string) (*RoomType, error)
	ListByTenant(ctx context.Context, tenantID string) ([]*RoomType, error)
}
