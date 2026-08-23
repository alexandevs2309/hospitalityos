package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type RateSeasonHandler struct {
	pool *pgxpool.Pool
}

func NewRateSeasonHandler(pool *pgxpool.Pool) *RateSeasonHandler {
	return &RateSeasonHandler{pool: pool}
}

type RateSeason struct {
	ID         string `json:"id"`
	TenantID   string `json:"tenant_id"`
	RoomTypeID string `json:"room_type_id"`
	Name       string `json:"name"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	AmountCents int64  `json:"amount_cents"`
	Currency   string `json:"currency"`
	Priority   int    `json:"priority"`
	Active     bool   `json:"active"`
}

type CreateSeasonRequest struct {
	RoomTypeID  string `json:"room_type_id"`
	Name        string `json:"name"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
	AmountCents int64  `json:"amount_cents"`
	Currency    string `json:"currency"`
	Priority    int    `json:"priority"`
}

func (h *RateSeasonHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	roomTypeID := r.URL.Query().Get("room_type_id")

	var rows [][]interface{}
	var err error

	if roomTypeID != "" {
		err = h.pool.QueryRow(ctx,
			`SELECT id, room_type_id, name, start_date::text, end_date::text, amount_cents, currency, priority, active
			 FROM rate_seasons WHERE tenant_id = $1 AND room_type_id = $2 AND active = TRUE
			 ORDER BY start_date`,
			tenantID, roomTypeID).Scan(&rows)
	} else {
		err = h.pool.QueryRow(ctx,
			`SELECT id, room_type_id, name, start_date::text, end_date::text, amount_cents, currency, priority, active
			 FROM rate_seasons WHERE tenant_id = $1 AND active = TRUE
			 ORDER BY start_date`,
			tenantID).Scan(&rows)
	}
	_ = err

	rowsQuery, qErr := h.pool.Query(ctx,
		`SELECT id, room_type_id, name, start_date::text, end_date::text, amount_cents, currency, priority, active
		 FROM rate_seasons WHERE tenant_id = $1 AND active = TRUE
		 ORDER BY start_date`, tenantID)
	if qErr != nil {
		httputil.InternalServerError(w, "failed to fetch seasons")
		return
	}
	defer rowsQuery.Close()

	var seasons []RateSeason
	for rowsQuery.Next() {
		var s RateSeason
		if err := rowsQuery.Scan(&s.ID, &s.RoomTypeID, &s.Name, &s.StartDate, &s.EndDate,
			&s.AmountCents, &s.Currency, &s.Priority, &s.Active); err != nil {
			httputil.InternalServerError(w, "failed to scan season")
			return
		}
		s.TenantID = tenantID
		seasons = append(seasons, s)
	}

	if seasons == nil {
		seasons = []RateSeason{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"seasons": seasons,
	})
}

func (h *RateSeasonHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req CreateSeasonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.RoomTypeID == "" || req.Name == "" || req.StartDate == "" || req.EndDate == "" || req.AmountCents == 0 {
		httputil.BadRequest(w, "room_type_id, name, start_date, end_date, amount_cents required")
		return
	}

	if req.Currency == "" {
		req.Currency = "DOP"
	}

	ctx := r.Context()

	var roomTypeExists bool
	err := h.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM room_types WHERE id = $1 AND tenant_id = $2)`,
		req.RoomTypeID, tenantID).Scan(&roomTypeExists)
	if err != nil || !roomTypeExists {
		httputil.NotFound(w, "room type not found")
		return
	}

	id := generateID()
	_, err = h.pool.Exec(ctx, `
		INSERT INTO rate_seasons (id, tenant_id, room_type_id, name, start_date, end_date, amount_cents, currency, priority, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
	`, id, tenantID, req.RoomTypeID, req.Name, req.StartDate, req.EndDate, req.AmountCents, req.Currency, req.Priority)
	if err != nil {
		httputil.InternalServerError(w, "failed to create season")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *RateSeasonHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	id := chi.URLParam(r, "id")
	ctx := r.Context()

	res, err := h.pool.Exec(ctx,
		`UPDATE rate_seasons SET active = FALSE, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
		id, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to deactivate season")
		return
	}
	if res.RowsAffected() == 0 {
		httputil.NotFound(w, "season not found")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "deactivated"})
}
