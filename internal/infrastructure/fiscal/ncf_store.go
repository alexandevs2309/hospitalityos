package fiscal

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NCFStore struct {
	pool *pgxpool.Pool
}

func NewNCFStore(pool *pgxpool.Pool) *NCFStore {
	return &NCFStore{pool: pool}
}

func (s *NCFStore) NextNCF(ctx context.Context, tenantID string, ncfType NCFType) (string, error) {
	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	tx, err := conn.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return "", fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var prefix string
	var currentNumber int
	var maxNumber int

	err = tx.QueryRow(ctx, `
		SELECT prefix, current_number, max_number
		FROM ncf_sequences
		WHERE tenant_id = $1 AND ncf_type = $2 AND active = true
		FOR UPDATE
	`, tenantID, string(ncfType)).Scan(&prefix, &currentNumber, &maxNumber)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("NCF sequence not configured for type %s (tenant: %s)", ncfType, tenantID)
	}
	if err != nil {
		return "", fmt.Errorf("failed to read NCF sequence: %w", err)
	}

	if currentNumber > maxNumber {
		return "", fmt.Errorf("NCF sequence exhausted for type %s (max: %d)", ncfType, maxNumber)
	}

	ncf := fmt.Sprintf("%s%s%08d", prefix, string(ncfType), currentNumber)

	_, err = tx.Exec(ctx, `
		UPDATE ncf_sequences
		SET current_number = current_number + 1, updated_at = NOW()
		WHERE tenant_id = $1 AND ncf_type = $2
	`, tenantID, string(ncfType))
	if err != nil {
		return "", fmt.Errorf("failed to increment NCF sequence: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("failed to commit NCF generation: %w", err)
	}

	return ncf, nil
}

func (s *NCFStore) Remaining(ctx context.Context, tenantID string, ncfType NCFType) (int, error) {
	var current, max int
	err := s.pool.QueryRow(ctx, `
		SELECT current_number, max_number
		FROM ncf_sequences
		WHERE tenant_id = $1 AND ncf_type = $2 AND active = true
	`, tenantID, string(ncfType)).Scan(&current, &max)
	if err != nil {
		return 0, err
	}
	return max - current + 1, nil
}

func (s *NCFStore) EnsureSequences(ctx context.Context, tenantID, rnc string) error {
	types := []struct {
		Type   NCFType
		Prefix string
	}{
		{NCFTypeNormal, ""},
		{NCFTypeCreditoFiscal, ""},
		{NCFTypeNotaCredito, ""},
		{NCFTypeNotaDebito, ""},
	}

	for _, t := range types {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO ncf_sequences (tenant_id, rnc, ncf_type, prefix, current_number, max_number, active)
			VALUES ($1, $2, $3, $4, 1, 99999999, true)
			ON CONFLICT (tenant_id, ncf_type) DO NOTHING
		`, tenantID, rnc, string(t.Type), t.Prefix)
		if err != nil {
			return fmt.Errorf("failed to ensure NCF sequence %s: %w", t.Type, err)
		}
	}
	return nil
}
