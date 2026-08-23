package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/folio"
)

type FolioRepository struct {
	pool *pgxpool.Pool
}

func NewFolioRepository(pool *pgxpool.Pool) *FolioRepository {
	return &FolioRepository{pool: pool}
}

func (r *FolioRepository) GetEntries(ctx context.Context, tenantID, reservationID string) ([]folio.Entry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, tenant_id, reservation_id, type, description, amount_cents, currency, reference, COALESCE(metadata, '{}'), created_by, created_at
		FROM folio_entries
		WHERE tenant_id = $1 AND reservation_id = $2
		ORDER BY created_at ASC
	`, tenantID, reservationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []folio.Entry
	for rows.Next() {
		var e folio.Entry
		if err := rows.Scan(&e.ID, &e.TenantID, &e.ReservationID, &e.Type, &e.Description,
			&e.AmountCents, &e.Currency, &e.Reference, &e.Metadata, &e.CreatedBy, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (r *FolioRepository) AddEntry(ctx context.Context, entry folio.Entry) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO folio_entries (id, tenant_id, reservation_id, type, description, amount_cents, currency, reference, metadata, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, entry.ID, entry.TenantID, entry.ReservationID, entry.Type, entry.Description,
		entry.AmountCents, entry.Currency, entry.Reference, entry.Metadata, entry.CreatedBy, entry.CreatedAt)
	return err
}

func (r *FolioRepository) GetBalance(ctx context.Context, tenantID, reservationID string) (int64, error) {
	var balance int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE WHEN type IN ('charge', 'transfer') THEN amount_cents
			     WHEN type IN ('payment', 'refund', 'deposit') THEN -amount_cents
			     ELSE 0 END
		), 0)
		FROM folio_entries
		WHERE tenant_id = $1 AND reservation_id = $2
	`, tenantID, reservationID).Scan(&balance)
	return balance, err
}

func (r *FolioRepository) EntryCount(ctx context.Context, tenantID, reservationID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM folio_entries
		WHERE tenant_id = $1 AND reservation_id = $2
	`, tenantID, reservationID).Scan(&count)
	return count, err
}
