package handlers

import (
	"encoding/json"
	"net/http"

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
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
		return
	}
	ctx := r.Context()
	rows, err := h.pool.Query(ctx,
		`SELECT id, tenant_id, name, amount_cents, currency, start_date, end_date FROM rates WHERE tenant_id=$1 ORDER BY start_date`,
		tenantID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

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
		var rt rateResp
		if err := rows.Scan(&rt.ID, &rt.TenantID, &rt.Name, &rt.AmountCents, &rt.Currency, &rt.StartDate, &rt.EndDate); err != nil {
			httputil.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		rates = append(rates, rt)
	}
	if rates == nil {
		rates = []rateResp{}
	}
	httputil.JSON(w, http.StatusOK, rates)
}

func (h *RateHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
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
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if input.Name == "" || input.AmountCents <= 0 {
		httputil.Error(w, http.StatusBadRequest, "name and amount_cents required")
		return
	}
	if input.Currency == "" {
		input.Currency = "DOP"
	}
	id := generateID()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO rates (id, tenant_id, name, amount_cents, currency, start_date, end_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
		id, tenantID, input.Name, input.AmountCents, input.Currency, input.StartDate, input.EndDate)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}
