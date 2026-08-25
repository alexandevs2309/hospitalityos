package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/auth"
	"github.com/hospitalityos/pkg/httputil"
)

type RegisterHandler struct {
	pool *pgxpool.Pool
}

func NewRegisterHandler(pool *pgxpool.Pool) *RegisterHandler {
	return &RegisterHandler{pool: pool}
}

type RegisterRequest struct {
	HotelName string `json:"hotel_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	FullName  string `json:"full_name"`
	Phone     string `json:"phone"`
	City      string `json:"city"`
	Country   string `json:"country"`
}

func (h *RegisterHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	req.HotelName = strings.TrimSpace(req.HotelName)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FullName = strings.TrimSpace(req.FullName)

	if req.HotelName == "" || req.Email == "" || req.Password == "" {
		httputil.BadRequest(w, "hotel_name, email, and password are required")
		return
	}
	if len(req.Password) < 6 {
		httputil.BadRequest(w, "password must be at least 6 characters")
		return
	}

	ctx := r.Context()

	// Check if email already registered
	var exists int
	err := h.pool.QueryRow(ctx,
		`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, req.Email,
	).Scan(&exists)
	if err == nil && exists == 1 {
		httputil.Conflict(w, "email already registered")
		return
	}

	// Generate tenant ID from hotel name
	tenantID := generateTenantID(req.HotelName)

	// Check tenant doesn't exist
	err = h.pool.QueryRow(ctx,
		`SELECT 1 FROM tenants WHERE id = $1 LIMIT 1`, tenantID,
	).Scan(&exists)
	if err == nil && exists == 1 {
		httputil.Conflict(w, "hotel name already taken")
		return
	}

	// Hash password
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		httputil.InternalServerError(w, "failed to process password")
		return
	}

	if req.FullName == "" {
		req.FullName = req.Email
	}

	// Create tenant + admin user in a transaction
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		httputil.InternalServerError(w, "database error")
		return
	}
	defer tx.Rollback(ctx)

	// Create tenant
	_, err = tx.Exec(ctx,
		`INSERT INTO tenants (id, name, created_at) VALUES ($1, $2, NOW())`,
		tenantID, req.HotelName,
	)
	if err != nil {
		httputil.InternalServerError(w, "failed to create hotel")
		return
	}

	// Create admin user
	_, err = tx.Exec(ctx,
		`INSERT INTO users (tenant_id, email, password, role, full_name, active)
		 VALUES ($1, $2, $3, 'admin', $4, true)`,
		tenantID, req.Email, hash, req.FullName,
	)
	if err != nil {
		httputil.InternalServerError(w, "failed to create admin user")
		return
	}

	// Create seed room type
	_, err = tx.Exec(ctx,
		`INSERT INTO room_types (id, tenant_id, name, capacity, amenities, base_price_cents, currency)
		 VALUES (gen_random_uuid(), $1, 'Standard', 2, '[]', 5000000, 'USD')`,
		tenantID,
	)
	if err != nil {
		httputil.InternalServerError(w, "failed to create default room type")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		httputil.InternalServerError(w, "failed to complete registration")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"status":   "hotel registered",
		"tenant_id": tenantID,
		"email":    req.Email,
		"message":  "You can now log in with your credentials",
	})
}

func generateTenantID(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "'", "")
	slug = strings.ReplaceAll(slug, ".", "")
	slug = strings.ReplaceAll(slug, ",", "")
	slug = strings.ReplaceAll(slug, "á", "a")
	slug = strings.ReplaceAll(slug, "é", "e")
	slug = strings.ReplaceAll(slug, "í", "i")
	slug = strings.ReplaceAll(slug, "ó", "o")
	slug = strings.ReplaceAll(slug, "ú", "u")
	slug = strings.ReplaceAll(slug, "ñ", "n")
	// Remove multiple dashes
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")
	if len(slug) > 40 {
		slug = slug[:40]
	}
	return slug
}
