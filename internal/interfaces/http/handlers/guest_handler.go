package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/guest"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
	"github.com/hospitalityos/pkg/httputil"
)

type GuestHandler struct {
	createHandler *guest.CreateGuestHandler
	pool          *pgxpool.Pool
}

func NewGuestHandler(create *guest.CreateGuestHandler, pool *pgxpool.Pool) *GuestHandler {
	return &GuestHandler{createHandler: create, pool: pool}
}

type CreateGuestRequest struct {
	GuestID   string `json:"guest_id"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (h *GuestHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateGuestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	tenantID := middleware.TenantFromContext(r.Context())
	cmd := guest.CreateGuestCommand{
		GuestID:   req.GuestID,
		TenantID:  tenantID,
		Email:     req.Email,
		Phone:     req.Phone,
		FirstName: req.FirstName,
		LastName:  req.LastName,
	}

	if err := h.createHandler.Handle(r.Context(), cmd); err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": req.GuestID})
}

func (h *GuestHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	search := r.URL.Query().Get("search")
	ctx := r.Context()

	var rows pgx.Rows
	var err error
	if search != "" {
		rows, err = h.pool.Query(ctx,
			`SELECT id, tenant_id, first_name, last_name, email, phone FROM guests WHERE tenant_id=$1 AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2) ORDER BY first_name`,
			tenantID, "%"+search+"%")
	} else {
		rows, err = h.pool.Query(ctx,
			`SELECT id, tenant_id, first_name, last_name, email, phone FROM guests WHERE tenant_id=$1 ORDER BY first_name`,
			tenantID)
	}
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type guestResp struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Phone     string `json:"phone"`
	}
	var guests []guestResp
	for rows.Next() {
		var g guestResp
		if err := rows.Scan(&g.ID, &g.TenantID, &g.FirstName, &g.LastName, &g.Email, &g.Phone); err != nil {
			httputil.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		guests = append(guests, g)
	}
	if guests == nil {
		guests = []guestResp{}
	}
	httputil.JSON(w, http.StatusOK, guests)
}

func (h *GuestHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	var g struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Phone     string `json:"phone"`
	}
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id, first_name, last_name, email, phone FROM guests WHERE id=$1`, id).
		Scan(&g.ID, &g.TenantID, &g.FirstName, &g.LastName, &g.Email, &g.Phone)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "guest not found")
		return
	}
	httputil.JSON(w, http.StatusOK, g)
}
