package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type MaintenanceHandler struct {
	pool *pgxpool.Pool
}

func NewMaintenanceHandler(pool *pgxpool.Pool) *MaintenanceHandler {
	return &MaintenanceHandler{pool: pool}
}

type MaintenanceRequest struct {
	ID          string  `json:"id"`
	RoomID      string  `json:"room_id"`
	RoomNumber  string  `json:"room_number"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Priority    string  `json:"priority"`
	Status      string  `json:"status"`
	ReportedBy  string  `json:"reported_by"`
	AssignedTo  string  `json:"assigned_to"`
	CostCents   int64   `json:"cost_cents"`
	Notes       string  `json:"notes"`
	StartedAt   *string `json:"started_at,omitempty"`
	CompletedAt *string `json:"completed_at,omitempty"`
	CreatedAt   string  `json:"created_at"`
}

type CreateMaintenanceRequest struct {
	RoomID      string `json:"room_id"`
	RoomNumber  string `json:"room_number"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Priority    string `json:"priority"`
	ReportedBy  string `json:"reported_by"`
}

type UpdateMaintenanceStatusRequest struct {
	Status   string `json:"status"`
	AssignedTo string `json:"assigned_to"`
	CostCents  int64  `json:"cost_cents"`
	Notes      string `json:"notes"`
}

func (h *MaintenanceHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	status := r.URL.Query().Get("status")
	roomID := r.URL.Query().Get("room_id")

	query := `SELECT id, room_id, room_number, title, description, category, priority, status,
	                 reported_by, assigned_to, cost_cents, notes,
	                 started_at::text, completed_at::text, created_at::text
	          FROM maintenance_requests WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if status != "" {
		query += ` AND status = $` + itoa(argIdx)
		args = append(args, status)
		argIdx++
	}
	if roomID != "" {
		query += ` AND room_id = $` + itoa(argIdx)
		args = append(args, roomID)
		argIdx++
	}

	query += ` ORDER BY
		CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END,
		created_at DESC`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch maintenance requests")
		return
	}
	defer rows.Close()

	var requests []MaintenanceRequest
	for rows.Next() {
		var req MaintenanceRequest
		var startedAt, completedAt, createdAt string
		if err := rows.Scan(&req.ID, &req.RoomID, &req.RoomNumber, &req.Title, &req.Description,
			&req.Category, &req.Priority, &req.Status, &req.ReportedBy, &req.AssignedTo,
			&req.CostCents, &req.Notes, &startedAt, &completedAt, &createdAt); err != nil {
			httputil.InternalServerError(w, "failed to scan request")
			return
		}
		if startedAt != "" {
			req.StartedAt = &startedAt
		}
		if completedAt != "" {
			req.CompletedAt = &completedAt
		}
		req.CreatedAt = createdAt
		requests = append(requests, req)
	}

	if requests == nil {
		requests = []MaintenanceRequest{}
	}
	httputil.JSON(w, http.StatusOK, requests)
}

func (h *MaintenanceHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req CreateMaintenanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.Title == "" {
		httputil.BadRequest(w, "title required")
		return
	}

	if req.Category == "" {
		req.Category = "general"
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}

	validCategories := map[string]bool{
		"general": true, "plumbing": true, "electrical": true, "hvac": true,
		"furniture": true, "appliance": true, "structural": true, "safety": true,
	}
	if !validCategories[req.Category] {
		httputil.BadRequest(w, "invalid category")
		return
	}

	validPriorities := map[string]bool{"low": true, "normal": true, "high": true, "urgent": true}
	if !validPriorities[req.Priority] {
		httputil.BadRequest(w, "invalid priority")
		return
	}

	ctx := r.Context()
	id := generateID()

	_, err := h.pool.Exec(ctx, `
		INSERT INTO maintenance_requests (id, tenant_id, room_id, room_number, title, description, category, priority, status, reported_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, NOW(), NOW())
	`, id, tenantID, req.RoomID, req.RoomNumber, req.Title, req.Description, req.Category, req.Priority, req.ReportedBy)
	if err != nil {
		httputil.InternalServerError(w, "failed to create maintenance request")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *MaintenanceHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	requestID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req UpdateMaintenanceStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	validStatuses := map[string]bool{"open": true, "in_progress": true, "completed": true, "cancelled": true}
	if !validStatuses[req.Status] {
		httputil.BadRequest(w, "invalid status: open, in_progress, completed, cancelled")
		return
	}

	ctx := r.Context()

	var currentStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT status FROM maintenance_requests WHERE id = $1 AND tenant_id = $2`,
		requestID, tenantID).Scan(&currentStatus)
	if err != nil {
		httputil.NotFound(w, "request not found")
		return
	}

	now := time.Now()
	var startedAt interface{} = nil
	var completedAt interface{} = nil

	if req.Status == "in_progress" && currentStatus == "open" {
		startedAt = now
	} else if req.Status == "completed" {
		completedAt = now
	}

	_, err = h.pool.Exec(ctx, `
		UPDATE maintenance_requests
		SET status = $1,
		    assigned_to = COALESCE(NULLIF($4, ''), assigned_to),
		    cost_cents = CASE WHEN $5 > 0 THEN $5 ELSE cost_cents END,
		    notes = COALESCE(NULLIF($6, ''), notes),
		    started_at = COALESCE($7, started_at),
		    completed_at = COALESCE($8, completed_at),
		    updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, req.Status, requestID, tenantID, req.AssignedTo, req.CostCents, req.Notes, startedAt, completedAt)
	if err != nil {
		httputil.InternalServerError(w, "failed to update request")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": req.Status})
}
