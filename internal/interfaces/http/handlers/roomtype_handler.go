package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type RoomTypeHandler struct {
	pool *pgxpool.Pool
}

func NewRoomTypeHandler(pool *pgxpool.Pool) *RoomTypeHandler {
	return &RoomTypeHandler{pool: pool}
}

func (h *RoomTypeHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
		return
	}
	ctx := r.Context()
	rows, err := h.pool.Query(ctx,
		`SELECT id, tenant_id, name, capacity, base_price_cents, currency, amenities FROM room_types WHERE tenant_id=$1 ORDER BY name`,
		tenantID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type rtResp struct {
		ID             string `json:"id"`
		TenantID       string `json:"tenant_id"`
		Name           string `json:"name"`
		Capacity       int    `json:"capacity"`
		BasePriceCents int64  `json:"base_price_cents"`
		Currency       string `json:"currency"`
		Amenities      string `json:"amenities"`
	}
	var rts []rtResp
	for rows.Next() {
		var rt rtResp
		if err := rows.Scan(&rt.ID, &rt.TenantID, &rt.Name, &rt.Capacity, &rt.BasePriceCents, &rt.Currency, &rt.Amenities); err != nil {
			httputil.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		rts = append(rts, rt)
	}
	if rts == nil {
		rts = []rtResp{}
	}
	httputil.JSON(w, http.StatusOK, rts)
}

func (h *RoomTypeHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()
	var rt struct {
		ID             string `json:"id"`
		TenantID       string `json:"tenant_id"`
		Name           string `json:"name"`
		Capacity       int    `json:"capacity"`
		BasePriceCents int64  `json:"base_price_cents"`
		Currency       string `json:"currency"`
		Amenities      string `json:"amenities"`
	}
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, capacity, base_price_cents, currency, amenities FROM room_types WHERE id=$1`, id).
		Scan(&rt.ID, &rt.TenantID, &rt.Name, &rt.Capacity, &rt.BasePriceCents, &rt.Currency, &rt.Amenities)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "room type not found")
		return
	}
	httputil.JSON(w, http.StatusOK, rt)
}

func (h *RoomTypeHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
		return
	}
	var input struct {
		Name           string `json:"name"`
		Capacity       int    `json:"capacity"`
		BasePriceCents int64  `json:"base_price_cents"`
		Currency       string `json:"currency"`
		Amenities      string `json:"amenities"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if input.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name required")
		return
	}
	if input.Capacity < 1 {
		input.Capacity = 2
	}
	if input.Currency == "" {
		input.Currency = "DOP"
	}
	id := generateID()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO room_types (id, tenant_id, name, capacity, base_price_cents, currency, amenities, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		id, tenantID, input.Name, input.Capacity, input.BasePriceCents, input.Currency, input.Amenities)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}
