package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type GuestProfileHandler struct {
	pool *pgxpool.Pool
}

func NewGuestProfileHandler(pool *pgxpool.Pool) *GuestProfileHandler {
	return &GuestProfileHandler{pool: pool}
}

type GuestProfile struct {
	ID            string            `json:"id"`
	FirstName     string            `json:"first_name"`
	LastName      string            `json:"last_name"`
	Email         string            `json:"email"`
	Phone         string            `json:"phone"`
	Country       string            `json:"country"`
	IDType        string            `json:"id_type"`
	IDNumber      string            `json:"id_number"`
	TotalStays    int               `json:"total_stays"`
	TotalSpent    int64             `json:"total_spent_cents"`
	Currency      string            `json:"currency"`
	AverageStay   float64           `json:"average_stay_nights"`
	LastStayDate  string            `json:"last_stay_date,omitempty"`
	Preferences   map[string]string `json:"preferences"`
	Tags          []string          `json:"tags"`
	Notes         string            `json:"notes"`
}

type Preference struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (h *GuestProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	guestID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	var profile GuestProfile
	err := h.pool.QueryRow(ctx, `
		SELECT id, COALESCE(first_name,''), COALESCE(last_name,''), COALESCE(email,''),
		       COALESCE(phone,''), COALESCE(country,''), COALESCE(id_type,''), COALESCE(id_number,'')
		FROM guests WHERE id = $1 AND tenant_id = $2
	`, guestID, tenantID).Scan(&profile.ID, &profile.FirstName, &profile.LastName, &profile.Email,
		&profile.Phone, &profile.Country, &profile.IDType, &profile.IDNumber)
	if err != nil {
		httputil.NotFound(w, "guest not found")
		return
	}

	profile.Currency = "DOP"

	h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(total_cents), 0)
		FROM reservations WHERE guest_id = $1 AND tenant_id = $2
	`, guestID, tenantID).Scan(&profile.TotalStays, &profile.TotalSpent)

	if profile.TotalStays > 0 {
		var totalNights int
		h.pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (check_out - check_in)) / 86400), 0)
			FROM reservations WHERE guest_id = $1 AND tenant_id = $2 AND check_out > check_in
		`, guestID, tenantID).Scan(&totalNights)
		profile.AverageStay = float64(totalNights) / float64(profile.TotalStays)
	}

	h.pool.QueryRow(ctx, `
		SELECT check_in::text FROM reservations
		WHERE guest_id = $1 AND tenant_id = $2 AND status = 'checked_out'
		ORDER BY check_in DESC LIMIT 1
	`, guestID, tenantID).Scan(&profile.LastStayDate)

	prefRows, err := h.pool.Query(ctx, `
		SELECT key, value FROM guest_preferences WHERE guest_id = $1 AND tenant_id = $2
	`, guestID, tenantID)
	if err == nil {
		defer prefRows.Close()
		profile.Preferences = make(map[string]string)
		for prefRows.Next() {
			var k, v string
			if prefRows.Scan(&k, &v) == nil {
				profile.Preferences[k] = v
			}
		}
	}
	if profile.Preferences == nil {
		profile.Preferences = make(map[string]string)
	}

	tagRows, err := h.pool.Query(ctx, `
		SELECT tag FROM guest_tags WHERE guest_id = $1 AND tenant_id = $2 ORDER BY tag
	`, guestID, tenantID)
	if err == nil {
		defer tagRows.Close()
		for tagRows.Next() {
			var tag string
			if tagRows.Scan(&tag) == nil {
				profile.Tags = append(profile.Tags, tag)
			}
		}
	}
	if profile.Tags == nil {
		profile.Tags = []string{}
	}

	httputil.JSON(w, http.StatusOK, profile)
}

func (h *GuestProfileHandler) SetPreference(w http.ResponseWriter, r *http.Request) {
	guestID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req Preference
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.Key == "" {
		httputil.BadRequest(w, "key required")
		return
	}

	ctx := r.Context()

	var exists bool
	h.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM guests WHERE id = $1 AND tenant_id = $2)`,
		guestID, tenantID).Scan(&exists)
	if !exists {
		httputil.NotFound(w, "guest not found")
		return
	}

	_, err := h.pool.Exec(ctx, `
		INSERT INTO guest_preferences (id, tenant_id, guest_id, key, value, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (tenant_id, guest_id, key) DO UPDATE SET value = $4, updated_at = NOW()
	`, tenantID, guestID, req.Key, req.Value)
	if err != nil {
		httputil.InternalServerError(w, "failed to save preference")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (h *GuestProfileHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	guestID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req struct {
		Tag string `json:"tag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.Tag == "" {
		httputil.BadRequest(w, "tag required")
		return
	}

	ctx := r.Context()

	_, err := h.pool.Exec(ctx, `
		INSERT INTO guest_tags (id, tenant_id, guest_id, tag, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, NOW())
		ON CONFLICT (tenant_id, guest_id, tag) DO NOTHING
	`, tenantID, guestID, req.Tag)
	if err != nil {
		httputil.InternalServerError(w, "failed to add tag")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"status": "added"})
}

func (h *GuestProfileHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	guestID := chi.URLParam(r, "id")
	tag := chi.URLParam(r, "tag")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	res, err := h.pool.Exec(ctx,
		`DELETE FROM guest_tags WHERE tenant_id = $1 AND guest_id = $2 AND tag = $3`,
		tenantID, guestID, tag)
	if err != nil {
		httputil.InternalServerError(w, "failed to remove tag")
		return
	}
	if res.RowsAffected() == 0 {
		httputil.NotFound(w, "tag not found")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "removed"})
}
