package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/nightaudit"
	"github.com/hospitalityos/pkg/httputil"
)

type NightAuditHandler struct {
	engine *nightaudit.Engine
}

func NewNightAuditHandler(pool *pgxpool.Pool) *NightAuditHandler {
	return &NightAuditHandler{engine: nightaudit.NewEngine(pool)}
}

type RunAuditRequest struct {
	RunDate string `json:"run_date"`
}

func (h *NightAuditHandler) Run(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req RunAuditRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.RunDate == "" {
		httputil.BadRequest(w, "run_date required (YYYY-MM-DD)")
		return
	}

	ctx := r.Context()
	result, err := h.engine.Run(ctx, tenantID, req.RunDate, "api")
	if err != nil {
		httputil.Conflict(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, result)
}

func (h *NightAuditHandler) History(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	runs, err := h.engine.History(ctx, tenantID, 30)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch audit history")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"runs": runs,
	})
}
