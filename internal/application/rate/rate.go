package rate

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Engine struct {
	pool *pgxpool.Pool
}

func NewEngine(pool *pgxpool.Pool) *Engine {
	return &Engine{pool: pool}
}

type RateInfo struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	AmountCents int64     `json:"amount_cents"`
	Currency    string    `json:"currency"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
}

func (e *Engine) GetRate(ctx context.Context, tenantID, rateID string) (*RateInfo, error) {
	var r RateInfo
	err := e.pool.QueryRow(ctx, `
		SELECT id, name, amount_cents, currency, start_date, end_date
		FROM rates WHERE id=$1 AND tenant_id=$2
	`, rateID, tenantID).Scan(&r.ID, &r.Name, &r.AmountCents, &r.Currency, &r.StartDate, &r.EndDate)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (e *Engine) CalculateTotal(ctx context.Context, tenantID, rateID string, checkIn, checkOut time.Time) (int64, string, error) {
	rate, err := e.GetRate(ctx, tenantID, rateID)
	if err != nil {
		return 0, "", err
	}
	nights := int64(checkOut.Sub(checkIn).Hours() / 24)
	if nights < 1 {
		nights = 1
	}
	return rate.AmountCents * nights, rate.Currency, nil
}
