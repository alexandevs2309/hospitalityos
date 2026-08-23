package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type PaymentHandler struct {
	pool *pgxpool.Pool
}

func NewPaymentHandler(pool *pgxpool.Pool) *PaymentHandler {
	return &PaymentHandler{pool: pool}
}

type Payment struct {
	ID            string `json:"id"`
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	Method        string `json:"method"`
	AmountCents   int64  `json:"amount_cents"`
	Currency      string `json:"currency"`
	Reference     string `json:"reference"`
	Status        string `json:"status"`
	Notes         string `json:"notes"`
	CreatedBy     string `json:"created_by"`
	CreatedAt     string `json:"created_at"`
}

type CreatePaymentRequest struct {
	ReservationID string `json:"reservation_id"`
	Method        string `json:"method"`
	AmountCents   int64  `json:"amount_cents"`
	Currency      string `json:"currency"`
	Reference     string `json:"reference"`
	Notes         string `json:"notes"`
	CreatedBy     string `json:"created_by"`
}

type Receipt struct {
	PaymentID     string `json:"payment_id"`
	ReservationID string `json:"reservation_id"`
	Method        string `json:"method"`
	AmountCents   int64  `json:"amount_cents"`
	Currency      string `json:"currency"`
	Reference     string `json:"reference"`
	Date          string `json:"date"`
	ReceivedBy    string `json:"received_by"`
}

func (h *PaymentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ReservationID == "" || req.Method == "" || req.AmountCents == 0 {
		httputil.BadRequest(w, "reservation_id, method, amount_cents required")
		return
	}

	validMethods := map[string]bool{"cash": true, "card": true, "transfer": true, "check": true, "mobile": true, "other": true}
	if !validMethods[req.Method] {
		httputil.BadRequest(w, "invalid method: cash, card, transfer, check, mobile, other")
		return
	}

	if req.AmountCents < 0 {
		httputil.BadRequest(w, "amount_cents must be positive")
		return
	}

	if req.Currency == "" {
		req.Currency = "DOP"
	}

	ctx := r.Context()

	var guestID, resStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT COALESCE(guest_id, ''), status FROM reservations WHERE id = $1 AND tenant_id = $2`,
		req.ReservationID, tenantID).Scan(&guestID, &resStatus)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}

	if resStatus == "cancelled" {
		httputil.Conflict(w, "cannot record payment for cancelled reservation")
		return
	}

	id := generateID()
	createdBy := req.CreatedBy
	if createdBy == "" {
		createdBy = "system"
	}

	_, err = h.pool.Exec(ctx, `
		INSERT INTO payments (id, tenant_id, reservation_id, guest_id, method, amount_cents, currency, reference, status, notes, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, $10, NOW(), NOW())
	`, id, tenantID, req.ReservationID, guestID, req.Method, req.AmountCents, req.Currency, req.Reference, req.Notes, createdBy)
	if err != nil {
		httputil.InternalServerError(w, "failed to record payment")
		return
	}

	receipt := Receipt{
		PaymentID:     id,
		ReservationID: req.ReservationID,
		Method:        req.Method,
		AmountCents:   req.AmountCents,
		Currency:      req.Currency,
		Reference:     req.Reference,
		Date:          time.Now().Format(time.RFC3339),
		ReceivedBy:    createdBy,
	}

	httputil.JSON(w, http.StatusCreated, receipt)
}

func (h *PaymentHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	reservationID := r.URL.Query().Get("reservation_id")

	query := `SELECT id, reservation_id, guest_id, method, amount_cents, currency, reference, status, notes, created_by, created_at::text
	          FROM payments WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if reservationID != "" {
		query += ` AND reservation_id = $` + itoa(argIdx)
		args = append(args, reservationID)
		argIdx++
	}

	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch payments")
		return
	}
	defer rows.Close()

	var payments []Payment
	for rows.Next() {
		var p Payment
		if err := rows.Scan(&p.ID, &p.ReservationID, &p.GuestID, &p.Method, &p.AmountCents,
			&p.Currency, &p.Reference, &p.Status, &p.Notes, &p.CreatedBy, &p.CreatedAt); err != nil {
			httputil.InternalServerError(w, "failed to scan payment")
			return
		}
		payments = append(payments, p)
	}

	if payments == nil {
		payments = []Payment{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"payments": payments,
	})
}

func (h *PaymentHandler) GetReceipt(w http.ResponseWriter, r *http.Request) {
	paymentID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	var p Payment
	err := h.pool.QueryRow(ctx, `
		SELECT id, reservation_id, guest_id, method, amount_cents, currency, reference, status, notes, created_by, created_at::text
		FROM payments WHERE id = $1 AND tenant_id = $2
	`, paymentID, tenantID).Scan(&p.ID, &p.ReservationID, &p.GuestID, &p.Method, &p.AmountCents,
		&p.Currency, &p.Reference, &p.Status, &p.Notes, &p.CreatedBy, &p.CreatedAt)
	if err != nil {
		httputil.NotFound(w, "payment not found")
		return
	}

	receipt := Receipt{
		PaymentID:     p.ID,
		ReservationID: p.ReservationID,
		Method:        p.Method,
		AmountCents:   p.AmountCents,
		Currency:      p.Currency,
		Reference:     p.Reference,
		Date:          p.CreatedAt,
		ReceivedBy:    p.CreatedBy,
	}

	httputil.JSON(w, http.StatusOK, receipt)
}
