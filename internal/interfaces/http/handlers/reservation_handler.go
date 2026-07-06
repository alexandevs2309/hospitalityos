package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/hospitalityos/internal/application/reservation"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
	"github.com/hospitalityos/pkg/types"
)

type ReservationHandler struct {
	createHandler *reservation.CreateReservationHandler
	cancelHandler *reservation.CancelReservationHandler
}

func NewReservationHandler(create *reservation.CreateReservationHandler, cancel *reservation.CancelReservationHandler) *ReservationHandler {
	return &ReservationHandler{
		createHandler: create,
		cancelHandler: cancel,
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

	checkIn, err := time.Parse(time.RFC3339, req.CheckIn)
	if err != nil {
		http.Error(w, "invalid check_in format", http.StatusBadRequest)
		return
	}
	checkOut, err := time.Parse(time.RFC3339, req.CheckOut)
	if err != nil {
		http.Error(w, "invalid check_out format", http.StatusBadRequest)
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
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": req.ReservationID})
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
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "canceled"})
}

type MoneyResponse struct {
	Cents    int64  `json:"cents"`
	Currency string `json:"currency"`
}

func (m MoneyResponse) FromMoney(money types.Money) MoneyResponse {
	return MoneyResponse{Cents: money.Cents(), Currency: string(money.Currency())}
}
