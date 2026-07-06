package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/hospitalityos/internal/application/guest"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
)

type GuestHandler struct {
	createHandler *guest.CreateGuestHandler
}

func NewGuestHandler(create *guest.CreateGuestHandler) *GuestHandler {
	return &GuestHandler{createHandler: create}
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
