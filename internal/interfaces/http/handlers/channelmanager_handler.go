package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/channelmanager"
	"github.com/hospitalityos/pkg/httputil"
)

type ChannelManagerHandler struct {
	pool *pgxpool.Pool
}

func NewChannelManagerHandler(pool *pgxpool.Pool) *ChannelManagerHandler {
	return &ChannelManagerHandler{pool: pool}
}

type ChannelConfig struct {
	ID                string `json:"id"`
	ChannelName       string `json:"channel_name"`
	PropertyID        string `json:"property_id"`
	SyncEnabled       bool   `json:"sync_enabled"`
	SyncRates         bool   `json:"sync_rates"`
	SyncAvailability  bool   `json:"sync_availability"`
	SyncReservations  bool   `json:"sync_reservations"`
	LastSyncAt        string `json:"last_sync_at,omitempty"`
}

type SyncLogEntry struct {
	ID           string `json:"id"`
	ChannelName  string `json:"channel_name"`
	SyncType     string `json:"sync_type"`
	Direction    string `json:"direction"`
	EntityType   string `json:"entity_type"`
	EntityID     string `json:"entity_id"`
	Status       string `json:"status"`
	ErrorMessage string `json:"error_message,omitempty"`
	CreatedAt    string `json:"created_at"`
}

func (h *ChannelManagerHandler) ListChannels(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	rows, err := h.pool.Query(ctx, `
		SELECT id, channel_name, property_id, sync_enabled, sync_rates, sync_availability, sync_reservations,
		       COALESCE(last_sync_at::text, '')
		FROM channel_config WHERE tenant_id = $1
		ORDER BY channel_name
	`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch channels")
		return
	}
	defer rows.Close()

	var channels []ChannelConfig
	for rows.Next() {
		var ch ChannelConfig
		if err := rows.Scan(&ch.ID, &ch.ChannelName, &ch.PropertyID, &ch.SyncEnabled,
			&ch.SyncRates, &ch.SyncAvailability, &ch.SyncReservations, &ch.LastSyncAt); err != nil {
			continue
		}
		channels = append(channels, ch)
	}
	if channels == nil {
		channels = []ChannelConfig{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"channels": channels,
	})
}

func (h *ChannelManagerHandler) ConfigureChannel(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req struct {
		ChannelName      string `json:"channel_name"`
		APIKey           string `json:"api_key"`
		APISecret        string `json:"api_secret"`
		PropertyID       string `json:"property_id"`
		SyncRates        bool   `json:"sync_rates"`
		SyncAvailability bool   `json:"sync_availability"`
		SyncReservations bool   `json:"sync_reservations"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ChannelName == "" || req.PropertyID == "" {
		httputil.BadRequest(w, "channel_name and property_id required")
		return
	}

	validChannels := map[string]bool{
		"booking_com": true, "expedia": true, "airbnb": true,
		"hostelworld": true, "custom": true,
	}
	if !validChannels[req.ChannelName] {
		httputil.BadRequest(w, "invalid channel")
		return
	}

	ctx := r.Context()
	id := generateID()

	_, err := h.pool.Exec(ctx, `
		INSERT INTO channel_config (id, tenant_id, channel_name, api_key, api_secret, property_id,
		                            sync_enabled, sync_rates, sync_availability, sync_reservations, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, NOW(), NOW())
		ON CONFLICT (tenant_id, channel_name) DO UPDATE SET
			api_key = $4, api_secret = $5, property_id = $6,
			sync_rates = $7, sync_availability = $8, sync_reservations = $9, updated_at = NOW()
	`, id, tenantID, req.ChannelName, req.APIKey, req.APISecret, req.PropertyID,
		req.SyncRates, req.SyncAvailability, req.SyncReservations)
	if err != nil {
		httputil.InternalServerError(w, "failed to configure channel")
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *ChannelManagerHandler) SyncRates(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req struct {
		ChannelName string                   `json:"channel_name"`
		Rates       []channelmanager.RateUpdate `json:"rates"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ChannelName == "" {
		httputil.BadRequest(w, "channel_name required")
		return
	}

	ctx := r.Context()

	var apiKey, apiSecret, propertyID string
	err := h.pool.QueryRow(ctx, `
		SELECT api_key, api_secret, property_id FROM channel_config
		WHERE tenant_id = $1 AND channel_name = $2 AND sync_enabled = TRUE
	`, tenantID, req.ChannelName).Scan(&apiKey, &apiSecret, &propertyID)
	if err != nil {
		httputil.NotFound(w, "channel not configured")
		return
	}

	client := channelmanager.NewClient(
		channelmanager.Channel(req.ChannelName),
		apiKey, apiSecret, propertyID,
	)

	result, err := client.SyncRates(req.Rates)
	if err != nil {
		httputil.InternalServerError(w, "sync failed: "+err.Error())
		return
	}

	h.logSync(ctx, tenantID, req.ChannelName, "rates", "outbound", "rate", "", result)

	httputil.JSON(w, http.StatusOK, result)
}

func (h *ChannelManagerHandler) SyncAvailability(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req struct {
		ChannelName  string                        `json:"channel_name"`
		Availability []channelmanager.AvailabilityUpdate `json:"availability"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	ctx := r.Context()

	var apiKey, apiSecret, propertyID string
	err := h.pool.QueryRow(ctx, `
		SELECT api_key, api_secret, property_id FROM channel_config
		WHERE tenant_id = $1 AND channel_name = $2 AND sync_enabled = TRUE
	`, tenantID, req.ChannelName).Scan(&apiKey, &apiSecret, &propertyID)
	if err != nil {
		httputil.NotFound(w, "channel not configured")
		return
	}

	client := channelmanager.NewClient(
		channelmanager.Channel(req.ChannelName),
		apiKey, apiSecret, propertyID,
	)

	result, err := client.SyncAvailability(req.Availability)
	if err != nil {
		httputil.InternalServerError(w, "sync failed")
		return
	}

	h.logSync(ctx, tenantID, req.ChannelName, "availability", "outbound", "availability", "", result)

	httputil.JSON(w, http.StatusOK, result)
}

func (h *ChannelManagerHandler) PullReservations(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	channelName := r.URL.Query().Get("channel")
	if channelName == "" {
		httputil.BadRequest(w, "channel parameter required")
		return
	}

	ctx := r.Context()

	var apiKey, apiSecret, propertyID string
	err := h.pool.QueryRow(ctx, `
		SELECT api_key, api_secret, property_id FROM channel_config
		WHERE tenant_id = $1 AND channel_name = $2 AND sync_enabled = TRUE
	`, tenantID, channelName).Scan(&apiKey, &apiSecret, &propertyID)
	if err != nil {
		httputil.NotFound(w, "channel not configured")
		return
	}

	client := channelmanager.NewClient(
		channelmanager.Channel(channelName),
		apiKey, apiSecret, propertyID,
	)

	reservations, err := client.PullReservations()
	if err != nil {
		httputil.InternalServerError(w, "pull failed")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"channel":     channelName,
		"reservations": reservations,
		"count":       len(reservations),
	})
}

func (h *ChannelManagerHandler) SyncLog(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	channelName := r.URL.Query().Get("channel")

	query := `SELECT id, channel_name, sync_type, direction, entity_type, entity_id, status, error_message, created_at::text
	          FROM channel_sync_log WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if channelName != "" {
		query += ` AND channel_name = $` + itoa(argIdx)
		args = append(args, channelName)
		argIdx++
	}

	query += ` ORDER BY created_at DESC LIMIT 50`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch sync log")
		return
	}
	defer rows.Close()

	var logs []SyncLogEntry
	for rows.Next() {
		var log SyncLogEntry
		if err := rows.Scan(&log.ID, &log.ChannelName, &log.SyncType, &log.Direction,
			&log.EntityType, &log.EntityID, &log.Status, &log.ErrorMessage, &log.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, log)
	}
	if logs == nil {
		logs = []SyncLogEntry{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"logs": logs,
	})
}

func (h *ChannelManagerHandler) logSync(ctx context.Context, tenantID, channel, syncType, direction, entityType, entityID string, result *channelmanager.SyncResult) {
	status := "success"
	errorMsg := ""
	if !result.Success {
		status = "failed"
		errorMsg = result.Error
	}

	h.pool.Exec(ctx, `
		INSERT INTO channel_sync_log (id, tenant_id, channel_name, sync_type, direction, entity_type, entity_id, status, error_message, created_at, completed_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
	`, tenantID, channel, syncType, direction, entityType, entityID, status, errorMsg)
}
