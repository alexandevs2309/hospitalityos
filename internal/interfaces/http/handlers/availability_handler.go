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
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	checkInStr := r.URL.Query().Get("check_in")
	checkOutStr := r.URL.Query().Get("check_out")
	if checkInStr == "" || checkOutStr == "" {
		httputil.BadRequest(w, "check_in and check_out required (YYYY-MM-DD)")
		return
	}

	checkIn, err := time.Parse("2006-01-02", checkInStr)
	if err != nil {
		httputil.BadRequest(w, "invalid check_in format (YYYY-MM-DD)")
		return
	}
	checkOut, err := time.Parse("2006-01-02", checkOutStr)
	if err != nil {
		httputil.BadRequest(w, "invalid check_out format (YYYY-MM-DD)")
		return
	}
	if !checkOut.After(checkIn) {
		httputil.BadRequest(w, "check_out must be after check_in")
		return
	}

	rooms, err := h.engine.AvailableRooms(r.Context(), tenantID, checkIn, checkOut)
	if err != nil {
		httputil.InternalServerError(w, "failed to check availability")
		return
	}
	if rooms == nil {
		rooms = []availability.AvailableRoom{}
	}
	httputil.JSON(w, http.StatusOK, rooms)
}
