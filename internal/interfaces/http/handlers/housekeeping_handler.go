package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type HousekeepingHandler struct {
	pool *pgxpool.Pool
}

func NewHousekeepingHandler(pool *pgxpool.Pool) *HousekeepingHandler {
	return &HousekeepingHandler{pool: pool}
}

type HousekeepingTask struct {
	ID          string  `json:"id"`
	RoomID      string  `json:"room_id"`
	RoomNumber  string  `json:"room_number"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	AssignedTo  string  `json:"assigned_to"`
	Notes       string  `json:"notes"`
	StartedAt   *string `json:"started_at,omitempty"`
	CompletedAt *string `json:"completed_at,omitempty"`
	CreatedAt   string  `json:"created_at"`
}

type CreateTaskRequest struct {
	RoomID     string `json:"room_id"`
	RoomNumber string `json:"room_number"`
	Type       string `json:"type"`
	Priority   string `json:"priority"`
	AssignedTo string `json:"assigned_to"`
	Notes      string `json:"notes"`
}

type UpdateTaskStatusRequest struct {
	Status string `json:"status"`
}

func (h *HousekeepingHandler) ListTasks(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	status := r.URL.Query().Get("status")
	assignedTo := r.URL.Query().Get("assigned_to")

	query := `SELECT id, room_id, room_number, type, status, priority, assigned_to, notes,
	                 started_at::text, completed_at::text, created_at::text
	          FROM housekeeping_tasks WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if status != "" {
		query += ` AND status = $` + itoa(argIdx)
		args = append(args, status)
		argIdx++
	}
	if assignedTo != "" {
		query += ` AND assigned_to = $` + itoa(argIdx)
		args = append(args, assignedTo)
		argIdx++
	}

	query += ` ORDER BY
		CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END,
		created_at ASC`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch tasks")
		return
	}
	defer rows.Close()

	var tasks []HousekeepingTask
	for rows.Next() {
		var t HousekeepingTask
		var startedAt, completedAt, createdAt string
		if err := rows.Scan(&t.ID, &t.RoomID, &t.RoomNumber, &t.Type, &t.Status, &t.Priority,
			&t.AssignedTo, &t.Notes, &startedAt, &completedAt, &createdAt); err != nil {
			httputil.InternalServerError(w, "failed to scan task")
			return
		}
		if startedAt != "" {
			t.StartedAt = &startedAt
		}
		if completedAt != "" {
			t.CompletedAt = &completedAt
		}
		t.CreatedAt = createdAt
		tasks = append(tasks, t)
	}

	if tasks == nil {
		tasks = []HousekeepingTask{}
	}
	httputil.JSON(w, http.StatusOK, tasks)
}

func (h *HousekeepingHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.RoomID == "" || req.RoomNumber == "" {
		httputil.BadRequest(w, "room_id and room_number required")
		return
	}

	if req.Type == "" {
		req.Type = "cleaning"
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}

	validTypes := map[string]bool{"cleaning": true, "maintenance": true, "inspection": true, "turndown": true, "deep_clean": true}
	if !validTypes[req.Type] {
		httputil.BadRequest(w, "invalid type: cleaning, maintenance, inspection, turndown, deep_clean")
		return
	}

	validPriorities := map[string]bool{"low": true, "normal": true, "high": true, "urgent": true}
	if !validPriorities[req.Priority] {
		httputil.BadRequest(w, "invalid priority: low, normal, high, urgent")
		return
	}

	ctx := r.Context()
	id := generateID()

	_, err := h.pool.Exec(ctx, `
		INSERT INTO housekeeping_tasks (id, tenant_id, room_id, room_number, type, status, priority, assigned_to, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, NOW(), NOW())
	`, id, tenantID, req.RoomID, req.RoomNumber, req.Type, req.Priority, req.AssignedTo, req.Notes)
	if err != nil {
		httputil.InternalServerError(w, "failed to create task")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *HousekeepingHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req UpdateTaskStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	validStatuses := map[string]bool{"pending": true, "in_progress": true, "completed": true, "cancelled": true}
	if !validStatuses[req.Status] {
		httputil.BadRequest(w, "invalid status: pending, in_progress, completed, cancelled")
		return
	}

	ctx := r.Context()

	var currentStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT status FROM housekeeping_tasks WHERE id = $1 AND tenant_id = $2`,
		taskID, tenantID).Scan(&currentStatus)
	if err != nil {
		httputil.NotFound(w, "task not found")
		return
	}

	now := time.Now()
	var startedAt interface{} = nil
	var completedAt interface{} = nil

	if req.Status == "in_progress" && currentStatus == "pending" {
		startedAt = now
	} else if req.Status == "completed" {
		completedAt = now
	}

	_, err = h.pool.Exec(ctx, `
		UPDATE housekeeping_tasks
		SET status = $1, started_at = COALESCE($4, started_at), completed_at = COALESCE($5, completed_at), updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, req.Status, taskID, tenantID, startedAt, completedAt)
	if err != nil {
		httputil.InternalServerError(w, "failed to update task")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func itoa(i int) string {
	return string(rune('0' + i))
}
