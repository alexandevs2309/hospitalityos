package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/fiscal"
	"github.com/hospitalityos/pkg/httputil"
)

type FiscalHandler struct {
	pool       *pgxpool.Pool
	ncfStore   *fiscal.NCFStore
	calculator *fiscal.TaxCalculator
	dgii       *fiscal.DGIClient
}

func NewFiscalHandler(pool *pgxpool.Pool, dgiiAPIKey string) *FiscalHandler {
	return &FiscalHandler{
		pool:       pool,
		ncfStore:   fiscal.NewNCFStore(pool),
		calculator: fiscal.NewTaxCalculator(),
		dgii:       fiscal.NewDGIClient(dgiiAPIKey),
	}
}

type IssueReceiptRequest struct {
	ReservationID string `json:"reservation_id"`
	PaymentID     string `json:"payment_id"`
	RNC           string `json:"rnc"`
	NCFType       string `json:"ncf_type"`
	FormaPago     string `json:"forma_pago"`
}

type FiscalReceipt struct {
	ID            string `json:"id"`
	NCF           string `json:"ncf"`
	NCFType       string `json:"ncf_type"`
	RNC           string `json:"rnc"`
	RNCName       string `json:"rnc_name"`
	SubtotalCents int64  `json:"subtotal_cents"`
	ITBISCents    int64  `json:"itbis_cents"`
	PropinaCents  int64  `json:"propina_cents"`
	TotalCents    int64  `json:"total_cents"`
	Currency      string `json:"currency"`
	Status        string `json:"status"`
	DGIIStatus    string `json:"dgii_status"`
	IssuedAt      string `json:"issued_at"`
}

func (h *FiscalHandler) IssueReceipt(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req IssueReceiptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ReservationID == "" || req.RNC == "" {
		httputil.BadRequest(w, "reservation_id and rnc required")
		return
	}

	ncfType := fiscal.NCFType(req.NCFType)
	if ncfType == "" {
		ncfType = fiscal.NCFTypeNormal
	}

	validTypes := map[fiscal.NCFType]bool{
		fiscal.NCFTypeNormal:        true,
		fiscal.NCFTypeCreditoFiscal: true,
		fiscal.NCFTypeNotaCredito:  true,
		fiscal.NCFTypeNotaDebito:   true,
	}
	if !validTypes[ncfType] {
		httputil.BadRequest(w, "invalid ncf_type: B01, B02, B03, B04")
		return
	}

	if !fiscal.ValidateRNC(req.RNC) {
		httputil.BadRequest(w, "invalid RNC")
		return
	}

	ctx := r.Context()

	var subtotalCents int64
	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM folio_entries WHERE reservation_id = $1 AND tenant_id = $2 AND type IN ('charge', 'transfer')
	`, req.ReservationID, tenantID).Scan(&subtotalCents)

	if subtotalCents == 0 {
		httputil.BadRequest(w, "no charges to issue receipt for")
		return
	}

	ncf, err := h.ncfStore.NextNCF(ctx, tenantID, ncfType)
	if err != nil {
		httputil.InternalServerError(w, "NCF generation failed: "+err.Error())
		return
	}

	taxes := h.calculator.Calculate(subtotalCents)

	rncName := ""
	dgiiResponse, err := h.dgii.ValidateRNC(req.RNC)
	if err == nil && dgiiResponse.Valido {
		rncName = dgiiResponse.Nombre
	}

	receiptID := generateID()
	_, err = h.pool.Exec(ctx, `
		INSERT INTO fiscal_receipts (id, tenant_id, reservation_id, payment_id, ncf, ncf_type, rnc, rnc_name,
		                             subtotal_cents, itbis_cents, propina_cents, total_cents, currency, status, dgii_status, issued_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'DOP', 'issued', 'pending', NOW(), NOW())
	`, receiptID, tenantID, req.ReservationID, req.PaymentID, ncf, string(ncfType),
		fiscal.FormatRNC(req.RNC), rncName, taxes.SubtotalCents, taxes.ITBISCents, taxes.PropinaCents, taxes.TotalCents)
	if err != nil {
		httputil.InternalServerError(w, "failed to save receipt")
		return
	}

	go h.submitToDGII(receiptID, tenantID, req.RNC, ncf, ncfType, taxes)

	httputil.JSON(w, http.StatusCreated, FiscalReceipt{
		ID:            receiptID,
		NCF:           ncf,
		NCFType:       string(ncfType),
		RNC:           fiscal.FormatRNC(req.RNC),
		RNCName:       rncName,
		SubtotalCents: taxes.SubtotalCents,
		ITBISCents:    taxes.ITBISCents,
		PropinaCents:  taxes.PropinaCents,
		TotalCents:    taxes.TotalCents,
		Currency:      "DOP",
		Status:        "issued",
		DGIIStatus:    "pending",
		IssuedAt:      time.Now().Format(time.RFC3339),
	})
}

func (h *FiscalHandler) submitToDGII(receiptID, tenantID, rnc, ncf string, ncfType fiscal.NCFType, taxes fiscal.TaxBreakdown) {
	ctx := context.Background()

	req := fiscal.ECFRequest{
		RNC:          rnc,
		NCF:          ncf,
		NCFType:      string(ncfType),
		RNCDestino:   rnc,
		FechaEmision: time.Now().Format("2006-01-02"),
		MontoTotal:   taxes.TotalCents,
		MontoGravado: taxes.SubtotalCents,
		ITBIS:        taxes.ITBISCents,
		Propina:      taxes.PropinaCents,
		FormaPago:    "efectivo",
		TipoPago:     "contado",
	}

	resp, err := h.dgii.SubmitECF(req)
	if err != nil {
		h.pool.Exec(ctx, `UPDATE fiscal_receipts SET dgii_status='error' WHERE id=$1 AND tenant_id=$2`,
			receiptID, tenantID)
		return
	}

	h.pool.Exec(ctx, `UPDATE fiscal_receipts SET dgii_status=$1, dgii_track_id=$2 WHERE id=$3 AND tenant_id=$4`,
		resp.Estado, resp.TrackID, receiptID, tenantID)
}

func (h *FiscalHandler) ValidateRNC(w http.ResponseWriter, r *http.Request) {
	rnc := r.URL.Query().Get("rnc")
	if rnc == "" {
		httputil.BadRequest(w, "rnc parameter required")
		return
	}

	valid := fiscal.ValidateRNC(rnc)
	if !valid {
		httputil.BadRequest(w, "invalid RNC format")
		return
	}

	response, err := h.dgii.ValidateRNC(rnc)
	if err != nil {
		httputil.InternalServerError(w, "failed to validate with DGII")
		return
	}

	httputil.JSON(w, http.StatusOK, response)
}

func (h *FiscalHandler) GetReceipts(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	rnc := r.URL.Query().Get("rnc")

	query := `SELECT id, ncf, ncf_type, rnc, rnc_name, subtotal_cents, itbis_cents, propina_cents, total_cents, status, dgii_status, issued_at::text
	          FROM fiscal_receipts WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if rnc != "" {
		query += ` AND rnc = $` + itoa(argIdx)
		args = append(args, fiscal.FormatRNC(rnc))
		argIdx++
	}

	query += ` ORDER BY issued_at DESC LIMIT 100`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch receipts")
		return
	}
	defer rows.Close()

	var receipts []FiscalReceipt
	for rows.Next() {
		var receipt FiscalReceipt
		if err := rows.Scan(&receipt.ID, &receipt.NCF, &receipt.NCFType, &receipt.RNC, &receipt.RNCName,
			&receipt.SubtotalCents, &receipt.ITBISCents, &receipt.PropinaCents, &receipt.TotalCents,
			&receipt.Status, &receipt.DGIIStatus, &receipt.IssuedAt); err != nil {
			continue
		}
		receipt.Currency = "DOP"
		receipts = append(receipts, receipt)
	}
	if receipts == nil {
		receipts = []FiscalReceipt{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"receipts": receipts,
	})
}

func (h *FiscalHandler) FiscalSummary(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	var totalReceipts int
	var totalSubtotal, totalITBIS, totalPropina, totalGeneral int64

	h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(subtotal_cents), 0), COALESCE(SUM(itbis_cents), 0),
		       COALESCE(SUM(propina_cents), 0), COALESCE(SUM(total_cents), 0)
		FROM fiscal_receipts WHERE tenant_id = $1 AND issued_at::date = CURRENT_DATE
	`, tenantID).Scan(&totalReceipts, &totalSubtotal, &totalITBIS, &totalPropina, &totalGeneral)

	var pendingCount int
	h.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM fiscal_receipts WHERE tenant_id = $1 AND dgii_status = 'pending'
	`, tenantID).Scan(&pendingCount)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"date":            time.Now().Format("2006-01-02"),
		"total_receipts":  totalReceipts,
		"subtotal_cents":  totalSubtotal,
		"itbis_cents":     totalITBIS,
		"propina_cents":   totalPropina,
		"total_cents":     totalGeneral,
		"pending_dgii":    pendingCount,
		"currency":        "DOP",
	})
}
