package nightaudit

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/folio"
)

type Engine struct {
	pool *pgxpool.Pool
}

func NewEngine(pool *pgxpool.Pool) *Engine {
	return &Engine{pool: pool}
}

type AuditResult struct {
	RunID                 string `json:"run_id"`
	RunDate               string `json:"run_date"`
	ReservationsProcessed int    `json:"reservations_processed"`
	ChargesPosted         int64  `json:"charges_posted"`
	TotalRevenue          int64  `json:"total_revenue"`
	Status                string `json:"status"`
	CompletedAt           string `json:"completed_at"`
}

type AuditRun struct {
	ID                    string    `json:"id"`
	TenantID              string    `json:"tenant_id"`
	RunDate               string    `json:"run_date"`
	ReservationsProcessed int       `json:"reservations_processed"`
	ChargesPosted         int64     `json:"charges_posted"`
	TotalRevenue          int64     `json:"total_revenue"`
	Status                string    `json:"status"`
	StartedAt             time.Time `json:"started_at"`
	CompletedAt           time.Time `json:"completed_at,omitempty"`
	CreatedBy             string    `json:"created_by"`
}

func (e *Engine) Run(ctx context.Context, tenantID, runDate string, createdBy string) (*AuditResult, error) {
	conn, err := e.pool.Acquire(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	tx, err := conn.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var exists bool
	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM night_audit_runs WHERE tenant_id = $1 AND run_date = $2)`,
		tenantID, runDate).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing audit: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("night audit already run for %s on %s", tenantID, runDate)
	}

	rows, err := tx.Query(ctx, `
		SELECT res.id, res.room_id, res.rate_id, res.total_cents, res.currency,
		       COALESCE(r.amount_cents, 0) as rate_amount
		FROM reservations res
		LEFT JOIN rates r ON r.id = res.rate_id AND r.tenant_id = res.tenant_id
		WHERE res.tenant_id = $1 AND res.status = 'checked_in'
		  AND res.check_in <= $2::date
		  AND res.check_out > $2::date
	`, tenantID, runDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query in-house reservations: %w", err)
	}
	defer rows.Close()

	type reservationInfo struct {
		ID         string
		RoomID     string
		RateID     string
		TotalCents int64
		Currency   string
		RateAmount int64
	}

	var reservations []reservationInfo
	for rows.Next() {
		var r reservationInfo
		if err := rows.Scan(&r.ID, &r.RoomID, &r.RateID, &r.TotalCents, &r.Currency, &r.RateAmount); err != nil {
			return nil, fmt.Errorf("failed to scan reservation: %w", err)
		}
		reservations = append(reservations, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating reservations: %w", err)
	}

	var totalCharges int64
	for _, res := range reservations {
		chargeAmount := res.RateAmount
		if chargeAmount == 0 {
			chargeAmount = res.TotalCents
		}

		entryID := generateID()
		_, err := tx.Exec(ctx, `
			INSERT INTO folio_entries (id, tenant_id, reservation_id, type, description, amount_cents, currency, reference, metadata, created_by, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (reference, reservation_id) DO NOTHING
		`, entryID, tenantID, res.ID, folio.EntryTypeCharge,
			fmt.Sprintf("Nightly charge for %s", runDate),
			chargeAmount, res.Currency,
			fmt.Sprintf("night-audit-%s", runDate),
			"{}", "night-audit", time.Now())
		if err != nil {
			return nil, fmt.Errorf("failed to post charge for reservation %s: %w", res.ID, err)
		}
		totalCharges += chargeAmount
	}

	runID := generateID()
	_, err = tx.Exec(ctx, `
		INSERT INTO night_audit_runs (id, tenant_id, run_date, reservations_processed, charges_posted, total_revenue, status, started_at, completed_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $5, 'completed', NOW(), NOW(), $6)
	`, runID, tenantID, runDate, len(reservations), totalCharges, createdBy)
	if err != nil {
		return nil, fmt.Errorf("failed to record audit run: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit night audit: %w", err)
	}

	return &AuditResult{
		RunID:                 runID,
		RunDate:               runDate,
		ReservationsProcessed: len(reservations),
		ChargesPosted:         totalCharges,
		TotalRevenue:          totalCharges,
		Status:                "completed",
		CompletedAt:           time.Now().Format(time.RFC3339),
	}, nil
}

func (e *Engine) History(ctx context.Context, tenantID string, limit int) ([]AuditRun, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	rows, err := e.pool.Query(ctx, `
		SELECT id, tenant_id, run_date::text, reservations_processed, charges_posted, total_revenue, status, started_at, COALESCE(completed_at, started_at), created_by
		FROM night_audit_runs
		WHERE tenant_id = $1
		ORDER BY run_date DESC
		LIMIT $2
	`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []AuditRun
	for rows.Next() {
		var run AuditRun
		if err := rows.Scan(&run.ID, &run.TenantID, &run.RunDate, &run.ReservationsProcessed,
			&run.ChargesPosted, &run.TotalRevenue, &run.Status, &run.StartedAt, &run.CompletedAt, &run.CreatedBy); err != nil {
			return nil, err
		}
		runs = append(runs, run)
	}
	if runs == nil {
		runs = []AuditRun{}
	}
	return runs, nil
}

func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b)
}
