package room

import "context"

type Repository interface {
	Save(ctx context.Context, room *Room) error
	Load(ctx context.Context, id string) (*Room, error)
	ListByTenant(ctx context.Context, tenantID string) ([]*Room, error)
	ListByTenantAndStatus(ctx context.Context, tenantID string, status Status) ([]*Room, error)
}
