package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/whatsapp"
	"github.com/hospitalityos/pkg/httputil"
)

type WhatsAppHandler struct {
	pool   *pgxpool.Pool
	client *whatsapp.Client
}

func NewWhatsAppHandler(pool *pgxpool.Pool, client *whatsapp.Client) *WhatsAppHandler {
	return &WhatsAppHandler{pool: pool, client: client}
}

type SendMessageRequest struct {
	ReservationID string `json:"reservation_id"`
	To            string `json:"to"`
	Template      string `json:"template"`
	Message       string `json:"message"`
	Language      string `json:"language"`
}

func (h *WhatsAppHandler) VerifyWebhook(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("hub.mode")
	token := r.URL.Query().Get("hub.verify_token")
	challenge := r.URL.Query().Get("hub.challenge")

	expectedToken := os.Getenv("WHATSAPP_VERIFY_TOKEN")
	if expectedToken == "" {
		expectedToken = "hospitalityos_webhook_token"
	}

	if mode == "subscribe" && token == expectedToken {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(challenge))
		return
	}

	w.WriteHeader(http.StatusForbidden)
}

func (h *WhatsAppHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		httputil.BadRequest(w, "failed to read body")
		return
	}
	defer r.Body.Close()

	appSecret := os.Getenv("WHATSAPP_APP_SECRET")
	if appSecret != "" {
		sig := r.Header.Get("X-Hub-Signature-256")
		if !verifyWebhookSignature(appSecret, sig, body) {
			httputil.Unauthorized(w, "invalid webhook signature")
			return
		}
	}

	if h.client == nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	msg, err := h.client.ParseWebhook(body)
	if err != nil {
		httputil.BadRequest(w, "invalid webhook payload")
		return
	}

	if msg.Object != "whatsapp_business_account" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := r.Context()

	for _, entry := range msg.Entry {
		for _, change := range entry.Changes {
			if change.Field != "messages" {
				continue
			}

			for _, message := range change.Value.Messages {
				h.processIncomingMessage(ctx, message.From, message.Text.Body, message.ID)
			}

			for _, status := range change.Value.Statuses {
				h.processStatusUpdate(ctx, status.ID, status.Status)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}

func (h *WhatsAppHandler) processIncomingMessage(ctx context.Context, from, body, externalID string) {
	tenantID := "eden-hotel"
	var guestID, reservationID string

	h.pool.QueryRow(ctx,
		`SELECT id, tenant_id FROM guests WHERE phone = $1 LIMIT 1`, from).Scan(&guestID, &tenantID)

	if tenantID == "" {
		tenantID = "eden-hotel"
	}

	if guestID != "" {
		h.pool.QueryRow(ctx,
			`SELECT id FROM reservations WHERE guest_id = $1 AND tenant_id = $2 AND status IN ('confirmed','checked_in') ORDER BY created_at DESC LIMIT 1`,
			guestID, tenantID).Scan(&reservationID)
	}

	h.pool.Exec(ctx, `
		INSERT INTO whatsapp_messages (id, tenant_id, reservation_id, guest_id, direction, from_number, to_number, content, external_id, status, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, 'inbound', $4, '', $5, $6, 'received', NOW())
	`, tenantID, reservationID, guestID, from, body, externalID)
}

func (h *WhatsAppHandler) processStatusUpdate(ctx context.Context, externalID, status string) {
	var updateCol string
	switch status {
	case "sent":
		updateCol = "sent_at"
	case "delivered":
		updateCol = "delivered_at"
	case "read":
		updateCol = "read_at"
	default:
		return
	}

	h.pool.Exec(ctx, `
		UPDATE whatsapp_messages SET status = $1, `+updateCol+` = NOW() WHERE external_id = $2
	`, status, externalID)
}

func (h *WhatsAppHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.To == "" || (req.Template == "" && req.Message == "") {
		httputil.BadRequest(w, "to and template or message required")
		return
	}

	if h.client == nil {
		httputil.InternalServerError(w, "WhatsApp not configured")
		return
	}

	lang := req.Language
	if lang == "" {
		lang = "es"
	}

	ctx := r.Context()
	tenantID := httputil.ExtractTenantID(r)

	var resp *whatsapp.MessageResponse
	var err error

	if req.Template != "" {
		tmpl, ok := whatsapp.GetTemplate(whatsapp.TemplateName(req.Template))
		if !ok {
			httputil.BadRequest(w, "template not found")
			return
		}
		_ = tmpl
		resp, err = h.client.SendTemplate(req.To, req.Template, lang, nil)
	} else {
		resp, err = h.client.SendText(req.To, req.Message)
	}

	if err != nil {
		httputil.InternalServerError(w, "failed to send: "+err.Error())
		return
	}

	msgID := ""
	if len(resp.Messages) > 0 {
		msgID = resp.Messages[0].ID
	}

	h.pool.Exec(ctx, `
		INSERT INTO whatsapp_messages (id, tenant_id, reservation_id, direction, from_number, to_number, content, message_type, external_id, status, created_at, sent_at)
		VALUES (gen_random_uuid(), $1, $2, 'outbound', '', $3, $4, 'template', $5, 'sent', NOW(), NOW())
	`, tenantID, req.ReservationID, req.To, req.Message, msgID)

	httputil.JSON(w, http.StatusOK, map[string]string{
		"message_id": msgID,
		"status":     "sent",
	})
}

func (h *WhatsAppHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	reservationID := r.URL.Query().Get("reservation_id")

	query := `SELECT id, reservation_id, direction, from_number, to_number, content, status, created_at::text
	          FROM whatsapp_messages WHERE tenant_id = $1`
	args := []interface{}{tenantID}

	if reservationID != "" {
		query += ` AND reservation_id = $2`
		args = append(args, reservationID)
	}

	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch messages")
		return
	}
	defer rows.Close()

	type Msg struct {
		ID            string `json:"id"`
		ReservationID string `json:"reservation_id"`
		Direction     string `json:"direction"`
		From          string `json:"from_number"`
		To            string `json:"to_number"`
		Content       string `json:"content"`
		Status        string `json:"status"`
		CreatedAt     string `json:"created_at"`
	}

	var messages []Msg
	for rows.Next() {
		var m Msg
		if err := rows.Scan(&m.ID, &m.ReservationID, &m.Direction, &m.From, &m.To, &m.Content, &m.Status, &m.CreatedAt); err != nil {
			continue
		}
		messages = append(messages, m)
	}
	if messages == nil {
		messages = []Msg{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"messages": messages})
}

func verifyWebhookSignature(appSecret, signature string, body []byte) bool {
	if signature == "" {
		return false
	}

	sig, err := hex.DecodeString(signature[7:])
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(appSecret))
	mac.Write(body)
	expected := mac.Sum(nil)

	return hmac.Equal(sig, expected)
}
