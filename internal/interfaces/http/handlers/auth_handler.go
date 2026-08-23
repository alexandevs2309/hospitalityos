package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/auth"
	"github.com/hospitalityos/pkg/httputil"
)

type AuthHandler struct {
	pool *pgxpool.Pool
}

func NewAuthHandler(pool *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{pool: pool}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	TenantID string `json:"tenant_id"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	User         UserInfo `json:"user"`
}

type UserInfo struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	FullName string `json:"full_name"`
	TenantID string `json:"tenant_id"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.TenantID == "" {
		httputil.BadRequest(w, "email, password, and tenant_id required")
		return
	}

	var user struct {
		ID           string
		TenantID     string
		Email        string
		PasswordHash string
		Role         string
		FullName     string
		Active       bool
	}
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, tenant_id, email, password, role, full_name, active FROM users WHERE email=$1 AND tenant_id=$2`,
		req.Email, req.TenantID,
	).Scan(&user.ID, &user.TenantID, &user.Email, &user.PasswordHash, &user.Role, &user.FullName, &user.Active)
	if err != nil {
		httputil.Unauthorized(w, "invalid credentials")
		return
	}
	if !user.Active {
		httputil.Unauthorized(w, "account disabled")
		return
	}
	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		httputil.Unauthorized(w, "invalid credentials")
		return
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.TenantID, user.Role, user.Email)
	if err != nil {
		httputil.InternalServerError(w, "failed to generate token")
		return
	}
	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		httputil.InternalServerError(w, "failed to generate refresh token")
		return
	}

	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (gen_random_uuid(), $1, $2, $3)`,
		user.ID, refreshToken, time.Now().Add(7*24*time.Hour),
	)
	if err != nil {
		httputil.InternalServerError(w, "failed to store refresh token")
		return
	}

	httputil.JSON(w, http.StatusOK, LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900,
		User: UserInfo{
			ID:       user.ID,
			Email:    user.Email,
			Role:     user.Role,
			FullName: user.FullName,
			TenantID: user.TenantID,
		},
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		httputil.BadRequest(w, "refresh_token required")
		return
	}

	var user struct {
		ID       string
		TenantID string
		Email    string
		Role     string
		FullName string
	}
	var expiresAt time.Time
	err := h.pool.QueryRow(r.Context(),
		`SELECT u.id, u.tenant_id, u.email, u.role, u.full_name, r.expires_at
		 FROM refresh_tokens r JOIN users u ON u.id = r.user_id
		 WHERE r.token = $1`,
		req.RefreshToken,
	).Scan(&user.ID, &user.TenantID, &user.Email, &user.Role, &user.FullName, &expiresAt)
	if err != nil {
		httputil.Unauthorized(w, "invalid refresh token")
		return
	}
	if time.Now().After(expiresAt) {
		h.pool.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE token=$1`, req.RefreshToken)
		httputil.Unauthorized(w, "refresh token expired")
		return
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.TenantID, user.Role, user.Email)
	if err != nil {
		httputil.InternalServerError(w, "failed to generate token")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"access_token": accessToken,
		"expires_in":   900,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.RefreshToken != "" {
		h.pool.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE token=$1`, req.RefreshToken)
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

func (h *AuthHandler) SeedAdmin(w http.ResponseWriter, r *http.Request) {
	secret := os.Getenv("SEED_SECRET")
	if secret == "" || r.Header.Get("X-Seed-Secret") != secret {
		httputil.Forbidden(w, "forbidden")
		return
	}
	var req struct {
		TenantID string `json:"tenant_id"`
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid body")
		return
	}
	if req.TenantID == "" || req.Email == "" || req.Password == "" {
		httputil.BadRequest(w, "tenant_id, email, password required")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		httputil.InternalServerError(w, "hash error")
		return
	}
	if req.FullName == "" {
		req.FullName = req.Email
	}
	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO users (tenant_id, email, password, role, full_name) VALUES ($1, $2, $3, 'admin', $4)
		 ON CONFLICT (tenant_id, email) DO UPDATE SET password=$3, full_name=$4`,
		req.TenantID, req.Email, hash, req.FullName)
	if err != nil {
		httputil.InternalServerError(w, err.Error())
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"status": "admin created"})
}
