package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type RateHandler struct {
	pool *pgxpool.Pool
}

func NewRateHandler(pool *pgxpool.Pool) *RateHandler {
	return &RateHandler{pool: pool}
}

func (h *RateHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}
	ctx := r.Context()
	rows, err := h.pool.Query(ctx,
		`SELECT id, tenant_id, name, amount_cents, currency, start_date, end_date FROM rates WHERE tenant_id=$1 ORDER BY start_date`,
		tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to query rates")
		return
	}
	defer rows.Close()

	type rateRow struct {
		ID          string
		TenantID    string
		Name        string
		AmountCents int64
		Currency    string
		StartDate   time.Time
		EndDate     time.Time
	}
	type rateResp struct {
		ID          string `json:"id"`
		TenantID    string `json:"tenant_id"`
		Name        string `json:"name"`
		AmountCents int64  `json:"amount_cents"`
		Currency    string `json:"currency"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
	}
	var rates []rateResp
	for rows.Next() {
		var rt rateRow
		if err := rows.Scan(&rt.ID, &rt.TenantID, &rt.Name, &rt.AmountCents, &rt.Currency, &rt.StartDate, &rt.EndDate); err != nil {
			httputil.InternalServerError(w, "failed to scan rate")
			return
		}
		rates = append(rates, rateResp{
			ID:          rt.ID,
			TenantID:    rt.TenantID,
			Name:        rt.Name,
			AmountCents: rt.AmountCents,
			Currency:    rt.Currency,
			StartDate:   rt.StartDate.Format("2006-01-02"),
			EndDate:     rt.EndDate.Format("2006-01-02"),
		})
	}
	if rates == nil {
		rates = []rateResp{}
	}
	httputil.JSON(w, http.StatusOK, rates)
}

func (h *RateHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}
	var input struct {
		Name        string `json:"name"`
		AmountCents int64  `json:"amount_cents"`
		Currency    string `json:"currency"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.BadRequest(w, "invalid body")
		return
	}
	if input.Name == "" || input.AmountCents <= 0 {
		httputil.BadRequest(w, "name and positive amount_cents required")
		return
	}
	if input.Currency == "" {
		input.Currency = "DOP"
	}
	if input.StartDate == "" || input.EndDate == "" {
		httputil.BadRequest(w, "start_date and end_date required (YYYY-MM-DD)")
		return
	}
	id := generateID()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO rates (id, tenant_id, name, amount_cents, currency, start_date, end_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
		id, tenantID, input.Name, input.AmountCents, input.Currency, input.StartDate, input.EndDate)
	if err != nil {
		httputil.InternalServerError(w, "failed to create rate")
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}
