package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func SetTenantContext(ctx context.Context, pool *pgxpool.Pool, tenantID string) error {
	_, err := pool.Exec(ctx, fmt.Sprintf("SET LOCAL app.current_tenant = '%s'", tenantID))
	return err
}

func WithTenant(ctx context.Context, pool *pgxpool.Pool, tenantID string, fn func() error) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()

	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = $1", tenantID)
	if err != nil {
		return err
	}

	if err := fn(); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
