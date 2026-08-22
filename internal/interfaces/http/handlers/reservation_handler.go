package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/reservation"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
	"github.com/hospitalityos/pkg/httputil"
)

type ReservationHandler struct {
	createHandler *reservation.CreateReservationHandler
	cancelHandler *reservation.CancelReservationHandler
	pool          *pgxpool.Pool
}

func NewReservationHandler(create *reservation.CreateReservationHandler, cancel *reservation.CancelReservationHandler, pool *pgxpool.Pool) *ReservationHandler {
	return &ReservationHandler{
		createHandler: create,
		cancelHandler: cancel,
		pool:          pool,
	}
}

type CreateReservationRequest struct {
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	RoomID        string `json:"room_id"`
	RateID        string `json:"rate_id"`
	CheckIn       string `json:"check_in"`
	CheckOut      string `json:"check_out"`
	Adults        int    `json:"adults"`
	Children      int    `json:"children"`
	TotalCents    int64  `json:"total_cents"`
	Currency      string `json:"currency"`
}

func (h *ReservationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	checkIn, err := httputil.ParseDate(req.CheckIn)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid check_in format (YYYY-MM-DD)")
		return
	}
	checkOut, err := httputil.ParseDate(req.CheckOut)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid check_out format (YYYY-MM-DD)")
		return
	}

	tenantID := middleware.TenantFromContext(r.Context())
	cmd := reservation.CreateReservationCommand{
		ReservationID: req.ReservationID,
		TenantID:      tenantID,
		GuestID:       req.GuestID,
		RoomID:        req.RoomID,
		RateID:        req.RateID,
		CheckIn:       checkIn,
		CheckOut:      checkOut,
		Adults:        req.Adults,
		Children:      req.Children,
		TotalCents:    req.TotalCents,
		Currency:      req.Currency,
	}

	if err := h.createHandler.Handle(r.Context(), cmd); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": req.ReservationID})
}

type CancelReservationRequest struct {
	ReservationID string `json:"reservation_id"`
}

func (h *ReservationHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	var req CancelReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	cmd := reservation.CancelReservationCommand{
		ReservationID: req.ReservationID,
	}

	if err := h.cancelHandler.Handle(r.Context(), cmd); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "canceled"})
}

func (h *ReservationHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	ctx := r.Context()
	query := `
		SELECT id, tenant_id, guest_id, room_id, rate_id, check_in, check_out, adults, children, total_cents, currency, status
		FROM reservations WHERE tenant_id=$1
	`
	args := []interface{}{tenantID}

	if status := r.URL.Query().Get("status"); status != "" {
		query += " AND status=$2"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type resResp struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id"`
		GuestID   string `json:"guest_id"`
		RoomID    string `json:"room_id"`
		RateID    string `json:"rate_id"`
		CheckIn   string `json:"check_in"`
		CheckOut  string `json:"check_out"`
		Adults    int    `json:"adults"`
		Children  int    `json:"children"`
		TotalCents int64 `json:"total_cents"`
		Currency  string `json:"currency"`
		Status    string `json:"status"`
	}
	var reservations []resResp
	for rows.Next() {
		var res resResp
		if err := rows.Scan(&res.ID, &res.TenantID, &res.GuestID, &res.RoomID, &res.RateID, &res.CheckIn, &res.CheckOut, &res.Adults, &res.Children, &res.TotalCents, &res.Currency, &res.Status); err != nil {
			httputil.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		reservations = append(reservations, res)
	}
	if reservations == nil {
		reservations = []resResp{}
	}
	httputil.JSON(w, http.StatusOK, reservations)
}

func (h *ReservationHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	var res struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id"`
		GuestID   string `json:"guest_id"`
		RoomID    string `json:"room_id"`
		RateID    string `json:"rate_id"`
		CheckIn   string `json:"check_in"`
		CheckOut  string `json:"check_out"`
		Adults    int    `json:"adults"`
		Children  int    `json:"children"`
		TotalCents int64 `json:"total_cents"`
		Currency  string `json:"currency"`
		Status    string `json:"status"`
	}
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id, guest_id, room_id, rate_id, check_in, check_out, adults, children, total_cents, currency, status FROM reservations WHERE id=$1`, id).
		Scan(&res.ID, &res.TenantID, &res.GuestID, &res.RoomID, &res.RateID, &res.CheckIn, &res.CheckOut, &res.Adults, &res.Children, &res.TotalCents, &res.Currency, &res.Status)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "reservation not found")
		return
	}
	httputil.JSON(w, http.StatusOK, res)
}

func (h *ReservationHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	_, err := h.pool.Exec(ctx, `UPDATE reservations SET status='checked_in', updated_at=NOW() WHERE id=$1 AND status='confirmed'`, id)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "checked_in"})
}

func (h *ReservationHandler) CheckOut(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	_, err := h.pool.Exec(ctx, `UPDATE reservations SET status='checked_out', updated_at=NOW() WHERE id=$1 AND status='checked_in'`, id)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "checked_out"})
}
