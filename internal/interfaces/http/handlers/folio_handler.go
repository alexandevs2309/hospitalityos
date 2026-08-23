package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/folio"
	"github.com/hospitalityos/internal/infrastructure/postgres"
	"github.com/hospitalityos/pkg/httputil"
)

type FolioHandler struct {
	repo *postgres.FolioRepository
	pool *pgxpool.Pool
}

func NewFolioHandler(pool *pgxpool.Pool) *FolioHandler {
	return &FolioHandler{
		repo: postgres.NewFolioRepository(pool),
		pool: pool,
	}
}

type FolioResponse struct {
	ReservationID string         `json:"reservation_id"`
	Entries       []folio.Entry  `json:"entries"`
	Balance       int64          `json:"balance"`
	TotalCharges  int64          `json:"total_charges"`
	TotalPayments int64          `json:"total_payments"`
	Closed        bool           `json:"closed"`
}

type AddEntryRequest struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	AmountCents int64  `json:"amount_cents"`
	Currency    string `json:"currency"`
	Reference   string `json:"reference"`
	CreatedBy   string `json:"created_by"`
}

func (h *FolioHandler) GetFolio(w http.ResponseWriter, r *http.Request) {
	reservationID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)

	ctx := r.Context()

	var resStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT status FROM reservations WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&resStatus)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}

	entries, err := h.repo.GetEntries(ctx, tenantID, reservationID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch folio entries")
		return
	}

	balance, err := h.repo.GetBalance(ctx, tenantID, reservationID)
	if err != nil {
		httputil.InternalServerError(w, "failed to calculate balance")
		return
	}

	f := folio.NewFolio(tenantID, reservationID)
	for _, e := range entries {
		f.AddEntry(e)
	}

	if entries == nil {
		entries = []folio.Entry{}
	}

	closed := resStatus == "checked_out"

	httputil.JSON(w, http.StatusOK, FolioResponse{
		ReservationID: reservationID,
		Entries:       entries,
		Balance:       balance,
		TotalCharges:  f.TotalCharges(),
		TotalPayments: f.TotalPayments(),
		Closed:        closed,
	})
}

func (h *FolioHandler) AddEntry(w http.ResponseWriter, r *http.Request) {
	reservationID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)

	var req AddEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.Type == "" || req.AmountCents == 0 {
		httputil.BadRequest(w, "type and amount_cents required")
		return
	}

	entryType := folio.EntryType(req.Type)
	switch entryType {
	case folio.EntryTypeCharge, folio.EntryTypePayment, folio.EntryTypeAdjustment,
		folio.EntryTypeRefund, folio.EntryTypeDeposit, folio.EntryTypeTransfer:
	default:
		httputil.BadRequest(w, "invalid type: charge, payment, adjustment, refund, deposit, transfer")
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

	var resStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT status FROM reservations WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&resStatus)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}
	if resStatus == "checked_out" {
		httputil.Conflict(w, "cannot add entries to a closed folio")
		return
	}

	createdBy := req.CreatedBy
	if createdBy == "" {
		createdBy = "system"
	}

	entry := folio.Entry{
		ID:            generateID(),
		TenantID:      tenantID,
		ReservationID: reservationID,
		Type:          entryType,
		Description:   req.Description,
		AmountCents:   req.AmountCents,
		Currency:      req.Currency,
		Reference:     req.Reference,
		CreatedBy:     createdBy,
		CreatedAt:     time.Now(),
	}

	if err := h.repo.AddEntry(ctx, entry); err != nil {
		httputil.InternalServerError(w, "failed to add folio entry")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":      entry.ID,
		"balance": entry.SignedAmount(),
	})
}

type CloseFolioResponse struct {
	ReservationID string `json:"reservation_id"`
	FinalBalance  int64  `json:"final_balance"`
	Status        string `json:"status"`
}

func (h *FolioHandler) CloseFolio(w http.ResponseWriter, r *http.Request) {
	reservationID := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	var resStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT status FROM reservations WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID).Scan(&resStatus)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}

	if resStatus != "checked_in" {
		httputil.Conflict(w, "folio can only be closed for checked-in reservations")
		return
	}

	balance, err := h.repo.GetBalance(ctx, tenantID, reservationID)
	if err != nil {
		httputil.InternalServerError(w, "failed to calculate balance")
		return
	}

	if balance != 0 {
		httputil.Conflict(w, "folio balance must be zero to close (current balance: "+formatCents(balance)+")")
		return
	}

	_, err = h.pool.Exec(ctx,
		`UPDATE reservations SET status = 'checked_out', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
		reservationID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to close folio")
		return
	}

	httputil.JSON(w, http.StatusOK, CloseFolioResponse{
		ReservationID: reservationID,
		FinalBalance:  balance,
		Status:        "closed",
	})
}

func formatCents(cents int64) string {
	negative := false
	if cents < 0 {
		negative = true
		cents = -cents
	}
	result := ""
	digits := make([]byte, 0)
	for cents > 0 {
		digits = append([]byte{byte('0' + cents%10)}, digits...)
		cents /= 10
	}
	if len(digits) == 0 {
		digits = []byte("0")
	}
	for i, d := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			result += ","
		}
		result += string(d)
	}
	if negative {
		result = "-" + result
	}
	return result + " cents"
}
