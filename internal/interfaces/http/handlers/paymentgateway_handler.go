package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/paymentgateway"
	"github.com/hospitalityos/pkg/httputil"
)

type PaymentGatewayHandler struct {
	pool   *pgxpool.Pool
	client *paymentgateway.Client
}

func NewPaymentGatewayHandler(pool *pgxpool.Pool, client *paymentgateway.Client) *PaymentGatewayHandler {
	return &PaymentGatewayHandler{pool: pool, client: client}
}

type CreatePaymentIntentRequest struct {
	Amount      int64             `json:"amount"`
	Currency    string            `json:"currency"`
	Description string            `json:"description"`
	ReservationID string          `json:"reservation_id"`
	Metadata    map[string]string `json:"metadata"`
}

type PaymentIntentResponse struct {
	ID           string `json:"id"`
	ClientSecret string `json:"client_secret"`
	Status       string `json:"status"`
	Amount       int64  `json:"amount"`
	Currency     string `json:"currency"`
}

func (h *PaymentGatewayHandler) CreatePaymentIntent(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req CreatePaymentIntentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.Amount == 0 || req.Currency == "" {
		httputil.BadRequest(w, "amount and currency required")
		return
	}

	if req.Metadata == nil {
		req.Metadata = make(map[string]string)
	}
	req.Metadata["tenant_id"] = tenantID
	if req.ReservationID != "" {
		req.Metadata["reservation_id"] = req.ReservationID
	}

	intent, err := h.client.CreatePaymentIntent(req.Amount, req.Currency, req.Description, req.Metadata)
	if err != nil {
		httputil.InternalServerError(w, "failed to create payment intent: "+err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, PaymentIntentResponse{
		ID:           intent.ID,
		ClientSecret: intent.ClientSecret,
		Status:       intent.Status,
		Amount:       intent.Amount,
		Currency:     intent.Currency,
	})
}

func (h *PaymentGatewayHandler) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PaymentIntentID string `json:"payment_intent_id"`
		PaymentMethodID string `json:"payment_method_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.PaymentIntentID == "" || req.PaymentMethodID == "" {
		httputil.BadRequest(w, "payment_intent_id and payment_method_id required")
		return
	}

	intent, err := h.client.ConfirmPaymentIntent(req.PaymentIntentID, req.PaymentMethodID)
	if err != nil {
		httputil.InternalServerError(w, "failed to confirm payment: "+err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{
		"id":     intent.ID,
		"status": intent.Status,
	})
}

func (h *PaymentGatewayHandler) CreateRefund(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChargeID string `json:"charge_id"`
		Amount   int64  `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ChargeID == "" {
		httputil.BadRequest(w, "charge_id required")
		return
	}

	refund, err := h.client.CreateRefund(req.ChargeID, req.Amount)
	if err != nil {
		httputil.InternalServerError(w, "failed to create refund: "+err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id":     refund.ID,
		"amount": refund.Amount,
		"status": refund.Status,
	})
}

func (h *PaymentGatewayHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		httputil.BadRequest(w, "failed to read body")
		return
	}
	defer r.Body.Close()

	sigHeader := r.Header.Get("Stripe-Signature")
	event, err := h.client.ParseWebhook(body, sigHeader)
	if err != nil {
		httputil.BadRequest(w, "invalid webhook")
		return
	}

	ctx := r.Context()

	switch event.Type {
	case "payment_intent.succeeded":
		var intent paymentgateway.PaymentIntent
		json.Unmarshal(event.Data.Object, &intent)
		h.handlePaymentSucceeded(ctx, intent)

	case "payment_intent.payment_failed":
		var intent paymentgateway.PaymentIntent
		json.Unmarshal(event.Data.Object, &intent)
		h.handlePaymentFailed(ctx, intent)

	case "charge.refunded":
		var charge paymentgateway.Charge
		json.Unmarshal(event.Data.Object, &charge)
		h.handleRefund(ctx, charge)
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "received"})
}

func (h *PaymentGatewayHandler) handlePaymentSucceeded(ctx context.Context, intent paymentgateway.PaymentIntent) {
	if tenantID, ok := intent.Metadata["tenant_id"]; ok {
		if reservationID, ok := intent.Metadata["reservation_id"]; ok {
			h.pool.Exec(ctx, `
				INSERT INTO payments (id, tenant_id, reservation_id, method, amount_cents, currency, reference, status, created_at, updated_at)
				VALUES (gen_random_uuid(), $1, $2, 'card', $3, $4, $5, 'completed', NOW(), NOW())
			`, tenantID, reservationID, intent.Amount, intent.Currency, intent.ID)
		}
	}
}

func (h *PaymentGatewayHandler) handlePaymentFailed(ctx context.Context, intent paymentgateway.PaymentIntent) {
}

func (h *PaymentGatewayHandler) handleRefund(ctx context.Context, charge paymentgateway.Charge) {
}
