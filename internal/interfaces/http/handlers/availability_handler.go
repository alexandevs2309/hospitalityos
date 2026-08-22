package handlers

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/availability"
	"github.com/hospitalityos/pkg/httputil"
)

type AvailabilityHandler struct {
	engine *availability.Engine
}

func NewAvailabilityHandler(pool *pgxpool.Pool) *AvailabilityHandler {
	return &AvailabilityHandler{engine: availability.NewEngine(pool)}
}

func (h *AvailabilityHandler) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Error(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	checkInStr := r.URL.Query().Get("check_in")
	checkOutStr := r.URL.Query().Get("check_out")
	if checkInStr == "" || checkOutStr == "" {
		httputil.Error(w, http.StatusBadRequest, "check_in and check_out required (YYYY-MM-DD)")
		return
	}

	checkIn, err := time.Parse("2006-01-02", checkInStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid check_in format")
		return
	}
	checkOut, err := time.Parse("2006-01-02", checkOutStr)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid check_out format")
		return
	}
	if !checkOut.After(checkIn) {
		httputil.Error(w, http.StatusBadRequest, "check_out must be after check_in")
		return
	}

	rooms, err := h.engine.AvailableRooms(r.Context(), tenantID, checkIn, checkOut)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if rooms == nil {
		rooms = []availability.AvailableRoom{}
	}
	httputil.JSON(w, http.StatusOK, rooms)
}
