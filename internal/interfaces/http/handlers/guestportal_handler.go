package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type GuestPortalHandler struct {
	pool *pgxpool.Pool
}

func NewGuestPortalHandler(pool *pgxpool.Pool) *GuestPortalHandler {
	return &GuestPortalHandler{pool: pool}
}

func (h *GuestPortalHandler) setTenant(ctx context.Context, pool *pgxpool.Pool, tenantID string) {
	pool.Exec(ctx, `SET app.current_tenant = $1`, tenantID)
}

func (h *GuestPortalHandler) generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

type PortalReservation struct {
	ReservationID   string  `json:"reservation_id"`
	GuestName       string  `json:"guest_name"`
	GuestEmail      string  `json:"guest_email"`
	GuestPhone      string  `json:"guest_phone"`
	RoomNumber      string  `json:"room_number"`
	RoomType        string  `json:"room_type"`
	CheckIn         string  `json:"check_in"`
	CheckOut        string  `json:"check_out"`
	Status          string  `json:"status"`
	TotalCents      int64   `json:"total_cents"`
	BalanceCents    int64   `json:"balance_cents"`
	Currency        string  `json:"currency"`
}

func (h *GuestPortalHandler) GenerateToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ReservationID string `json:"reservation_id"`
		TenantID      string `json:"tenant_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request")
		return
	}

	tenantID := req.TenantID
	if tenantID == "" {
		tenantID = httputil.ExtractTenantID(r)
	}

	ctx := r.Context()

	var guestID string
	err := h.pool.QueryRow(ctx,
		`SELECT guest_id FROM reservations WHERE id = $1 AND tenant_id = $2`,
		req.ReservationID, tenantID).Scan(&guestID)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}

	token := h.generateToken()
	expiresAt := time.Now().Add(72 * time.Hour)

	_, err = h.pool.Exec(ctx,
		`INSERT INTO guest_portal_tokens (id, tenant_id, reservation_id, guest_id, token, expires_at, created_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
		tenantID, req.ReservationID, guestID, token, expiresAt)
	if err != nil {
		httputil.InternalServerError(w, "failed to generate token")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"token":          token,
		"reservation_id": req.ReservationID,
		"expires_at":     expiresAt.Format(time.RFC3339),
		"portal_url":     "/portal/" + token,
	})
}

func (h *GuestPortalHandler) GetPortalData(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		httputil.BadRequest(w, "token required")
		return
	}

	ctx := r.Context()

	var reservationID, guestID, tenantID string
	var expiresAt time.Time
	err := h.pool.QueryRow(ctx,
		`SELECT reservation_id, guest_id, tenant_id, expires_at
		 FROM guest_portal_tokens WHERE token = $1`, token).Scan(
		&reservationID, &guestID, &tenantID, &expiresAt)
	if err != nil {
		httputil.NotFound(w, "invalid portal token")
		return
	}

	if time.Now().After(expiresAt) {
		httputil.Unauthorized(w, "portal token expired")
		return
	}

	h.setTenant(ctx, h.pool, tenantID)

	var p PortalReservation
	err = h.pool.QueryRow(ctx,
		`SELECT r.id::text, COALESCE(g.first_name,'') || ' ' || COALESCE(g.last_name,''),
		        COALESCE(g.email,''), COALESCE(g.phone,''),
		        COALESCE(rm.number,''), '',
		        r.check_in::text, r.check_out::text, r.status,
		        COALESCE(r.total_cents,0), 0, COALESCE(r.currency,'DOP')
		 FROM reservations r
		 LEFT JOIN guests g ON g.id = r.guest_id AND g.tenant_id = r.tenant_id
		 LEFT JOIN rooms rm ON rm.id = r.room_id AND rm.tenant_id = r.tenant_id
		 WHERE r.id = $1 AND r.tenant_id = $2`,
		reservationID, tenantID).Scan(
		&p.ReservationID, &p.GuestName, &p.GuestEmail, &p.GuestPhone,
		&p.RoomNumber, &p.RoomType, &p.CheckIn, &p.CheckOut, &p.Status,
		&p.TotalCents, &p.BalanceCents, &p.Currency)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}

	h.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE reservation_id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&p.BalanceCents)
	p.BalanceCents = p.TotalCents - p.BalanceCents

	folioRows, _ := h.pool.Query(ctx,
		`SELECT id::text, description, amount_cents, entry_type, created_at::text
		 FROM folio_entries WHERE reservation_id = $1 AND tenant_id = $2 ORDER BY created_at`,
		reservationID, tenantID)
	defer folioRows.Close()

	type FolioEntry struct {
		ID          string `json:"id"`
		Description string `json:"description"`
		AmountCents int64  `json:"amount_cents"`
		EntryType   string `json:"entry_type"`
		CreatedAt   string `json:"created_at"`
	}
	var folio []FolioEntry
	for folioRows.Next() {
		var e FolioEntry
		folioRows.Scan(&e.ID, &e.Description, &e.AmountCents, &e.EntryType, &e.CreatedAt)
		folio = append(folio, e)
	}
	if folio == nil {
		folio = []FolioEntry{}
	}

	serviceRows, _ := h.pool.Query(ctx,
		`SELECT id::text, request_type, description, status, priority, created_at::text
		 FROM guest_service_requests WHERE reservation_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
		reservationID, tenantID)
	defer serviceRows.Close()

	type ServiceRequest struct {
		ID          string `json:"id"`
		Type        string `json:"request_type"`
		Description string `json:"description"`
		Status      string `json:"status"`
		Priority    string `json:"priority"`
		CreatedAt   string `json:"created_at"`
	}
	var requests []ServiceRequest
	for serviceRows.Next() {
		var s ServiceRequest
		serviceRows.Scan(&s.ID, &s.Type, &s.Description, &s.Status, &s.Priority, &s.CreatedAt)
		requests = append(requests, s)
	}
	if requests == nil {
		requests = []ServiceRequest{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"reservation": p,
		"folio":       folio,
		"requests":    requests,
	})
}

func (h *GuestPortalHandler) SelfCheckIn(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	ctx := r.Context()

	var reservationID, tenantID string
	var expiresAt time.Time
	err := h.pool.QueryRow(ctx,
		`SELECT reservation_id, tenant_id, expires_at FROM guest_portal_tokens WHERE token = $1`,
		token).Scan(&reservationID, &tenantID, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		httputil.Unauthorized(w, "invalid or expired token")
		return
	}

	h.setTenant(ctx, h.pool, tenantID)

	var status string
	h.pool.QueryRow(ctx,
		`SELECT status FROM reservations WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&status)

	if status != "confirmed" {
		httputil.BadRequest(w, "reservation cannot be checked in (status: "+status+")")
		return
	}

	_, err = h.pool.Exec(ctx,
		`UPDATE reservations SET status = 'checked_in', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "check-in failed")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{
		"status":  "checked_in",
		"message": "Check-in completado exitosamente",
	})
}

func (h *GuestPortalHandler) SelfCheckOut(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	ctx := r.Context()

	var reservationID, tenantID string
	var expiresAt time.Time
	err := h.pool.QueryRow(ctx,
		`SELECT reservation_id, tenant_id, expires_at FROM guest_portal_tokens WHERE token = $1`,
		token).Scan(&reservationID, &tenantID, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		httputil.Unauthorized(w, "invalid or expired token")
		return
	}

	h.setTenant(ctx, h.pool, tenantID)

	var status string
	h.pool.QueryRow(ctx,
		`SELECT status FROM reservations WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&status)

	if status != "checked_in" {
		httputil.BadRequest(w, "reservation cannot be checked out (status: "+status+")")
		return
	}

	var balance int64
	h.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE reservation_id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&balance)

	var total int64
	h.pool.QueryRow(ctx,
		`SELECT COALESCE(total_cents,0) FROM reservations WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&total)

	if total > balance {
		httputil.BadRequest(w, "outstanding balance must be paid before checkout")
		return
	}

	_, err = h.pool.Exec(ctx,
		`UPDATE reservations SET status = 'checked_out', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "check-out failed")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{
		"status":  "checked_out",
		"message": "Check-out completado exitosamente",
	})
}

func (h *GuestPortalHandler) CreateServiceRequest(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	ctx := r.Context()

	var reservationID, guestID, tenantID string
	var expiresAt time.Time
	err := h.pool.QueryRow(ctx,
		`SELECT reservation_id, guest_id, tenant_id, expires_at FROM guest_portal_tokens WHERE token = $1`,
		token).Scan(&reservationID, &guestID, &tenantID, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		httputil.Unauthorized(w, "invalid or expired token")
		return
	}

	h.setTenant(ctx, h.pool, tenantID)

	var req struct {
		RequestType string `json:"request_type"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.RequestType == "" {
		httputil.BadRequest(w, "request_type required")
		return
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}

	_, err = h.pool.Exec(ctx,
		`INSERT INTO guest_service_requests (id, tenant_id, reservation_id, guest_id, request_type, description, status, priority, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW())`,
		tenantID, reservationID, guestID, req.RequestType, req.Description, req.Priority)
	if err != nil {
		httputil.InternalServerError(w, "failed to create request")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{
		"status":  "pending",
		"message": "Solicitud enviada",
	})
}

func (h *GuestPortalHandler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	ctx := r.Context()

	var reservationID, guestID, tenantID string
	var expiresAt time.Time
	err := h.pool.QueryRow(ctx,
		`SELECT reservation_id, guest_id, tenant_id, expires_at FROM guest_portal_tokens WHERE token = $1`,
		token).Scan(&reservationID, &guestID, &tenantID, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		httputil.Unauthorized(w, "invalid or expired token")
		return
	}

	h.setTenant(ctx, h.pool, tenantID)

	var req struct {
		Rating   int    `json:"rating"`
		Category string `json:"category"`
		Comment  string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		httputil.BadRequest(w, "rating must be between 1 and 5")
		return
	}
	if req.Category == "" {
		req.Category = "overall"
	}

	_, err = h.pool.Exec(ctx,
		`INSERT INTO guest_reviews (id, tenant_id, reservation_id, guest_id, rating, category, comment, created_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
		tenantID, reservationID, guestID, req.Rating, req.Category, req.Comment)
	if err != nil {
		httputil.InternalServerError(w, "failed to submit review")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{
		"status":  "submitted",
		"message": "Gracias por tu evaluacion",
	})
}
