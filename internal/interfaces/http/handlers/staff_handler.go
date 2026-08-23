package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/auth"
	"github.com/hospitalityos/pkg/httputil"
)

type StaffHandler struct {
	pool *pgxpool.Pool
}

func NewStaffHandler(pool *pgxpool.Pool) *StaffHandler {
	return &StaffHandler{pool: pool}
}

type StaffMember struct {
	ID         string `json:"id"`
	UserID     string `json:"user_id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Role       string `json:"role"`
	Department string `json:"department"`
	Shift      string `json:"shift"`
	Active     bool   `json:"active"`
	HireDate   string `json:"hire_date,omitempty"`
}

type CreateStaffRequest struct {
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Role       string `json:"role"`
	Department string `json:"department"`
	Shift      string `json:"shift"`
	PIN        string `json:"pin"`
	HireDate   string `json:"hire_date"`
}

type UpdateRoleRequest struct {
	Role string `json:"role"`
}

func (h *StaffHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	role := r.URL.Query().Get("role")

	query := `SELECT id, user_id, first_name, last_name, email, phone, role, department, shift, active, COALESCE(hire_date::text, '')
	          FROM staff WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if role != "" {
		query += ` AND role = $` + itoa(argIdx)
		args = append(args, role)
		argIdx++
	}

	query += ` ORDER BY last_name, first_name`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch staff")
		return
	}
	defer rows.Close()

	var members []StaffMember
	for rows.Next() {
		var m StaffMember
		if err := rows.Scan(&m.ID, &m.UserID, &m.FirstName, &m.LastName, &m.Email, &m.Phone,
			&m.Role, &m.Department, &m.Shift, &m.Active, &m.HireDate); err != nil {
			httputil.InternalServerError(w, "failed to scan staff")
			return
		}
		members = append(members, m)
	}

	if members == nil {
		members = []StaffMember{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"staff": members,
	})
}

func (h *StaffHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req CreateStaffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.FirstName == "" || req.LastName == "" {
		httputil.BadRequest(w, "first_name and last_name required")
		return
	}

	if req.Role == "" {
		req.Role = "front_desk"
	}

	validRoles := map[string]bool{
		"admin": true, "manager": true, "front_desk": true,
		"housekeeping": true, "maintenance": true, "read_only": true,
	}
	if !validRoles[req.Role] {
		httputil.BadRequest(w, "invalid role: admin, manager, front_desk, housekeeping, maintenance, read_only")
		return
	}

	ctx := r.Context()
	id := generateID()

	var pinHash string
	if req.PIN != "" {
		hash, err := auth.HashPassword(req.PIN)
		if err != nil {
			httputil.InternalServerError(w, "failed to hash PIN")
			return
		}
		pinHash = hash
	}

	_, err := h.pool.Exec(ctx, `
		INSERT INTO staff (id, tenant_id, first_name, last_name, email, phone, role, department, shift, active, pin_hash, hire_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, NOW(), NOW())
	`, id, tenantID, req.FirstName, req.LastName, req.Email, req.Phone, req.Role, req.Department, req.Shift, pinHash, req.HireDate)
	if err != nil {
		httputil.InternalServerError(w, "failed to create staff member")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *StaffHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	staffID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	validRoles := map[string]bool{
		"admin": true, "manager": true, "front_desk": true,
		"housekeeping": true, "maintenance": true, "read_only": true,
	}
	if !validRoles[req.Role] {
		httputil.BadRequest(w, "invalid role")
		return
	}

	ctx := r.Context()

	res, err := h.pool.Exec(ctx,
		`UPDATE staff SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
		req.Role, staffID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to update role")
		return
	}
	if res.RowsAffected() == 0 {
		httputil.NotFound(w, "staff member not found")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"role": req.Role})
}
