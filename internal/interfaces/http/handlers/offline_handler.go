package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type OfflineHandler struct {
	pool *pgxpool.Pool
}

func NewOfflineHandler(pool *pgxpool.Pool) *OfflineHandler {
	return &OfflineHandler{pool: pool}
}

type SyncRequest struct {
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Payload    json.RawMessage `json:"payload"`
}

type SyncItem struct {
	ID         string `json:"id"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	Payload    string `json:"payload"`
	CreatedAt  string `json:"created_at"`
}

type SyncResponse struct {
	Pending  int        `json:"pending"`
	Synced   int        `json:"synced"`
	Items    []SyncItem `json:"items"`
}

func (h *OfflineHandler) Push(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var items []SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if len(items) == 0 {
		httputil.BadRequest(w, "at least one item required")
		return
	}

	ctx := r.Context()
	synced := 0

	for _, item := range items {
		if item.Action == "" || item.EntityType == "" {
			continue
		}

		validActions := map[string]bool{"create": true, "update": true, "delete": true}
		if !validActions[item.Action] {
			continue
		}

		_, err := h.pool.Exec(ctx, `
			INSERT INTO offline_sync_queue (id, tenant_id, user_id, action, entity_type, entity_id, payload, status, created_at)
			VALUES (gen_random_uuid(), $1, '', $2, $3, $4, $5, 'pending', NOW())
		`, tenantID, item.Action, item.EntityType, item.EntityID, item.Payload)
		if err == nil {
			synced++
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]int{
		"synced": synced,
		"total":  len(items),
	})
}

func (h *OfflineHandler) Pull(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	rows, err := h.pool.Query(ctx, `
		SELECT id, action, entity_type, entity_id, payload::text, created_at::text
		FROM offline_sync_queue
		WHERE tenant_id = $1 AND status = 'pending'
		ORDER BY created_at ASC
		LIMIT 100
	`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch sync queue")
		return
	}
	defer rows.Close()

	var items []SyncItem
	for rows.Next() {
		var item SyncItem
		if err := rows.Scan(&item.ID, &item.Action, &item.EntityType, &item.EntityID, &item.Payload, &item.CreatedAt); err != nil {
			continue
		}
		items = append(items, item)
	}

	if items == nil {
		items = []SyncItem{}
	}

	httputil.JSON(w, http.StatusOK, SyncResponse{
		Pending: len(items),
		Synced:  0,
		Items:   items,
	})
}

func (h *OfflineHandler) Ack(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if len(req.IDs) == 0 {
		httputil.BadRequest(w, "ids required")
		return
	}

	ctx := r.Context()

	for _, id := range req.IDs {
		h.pool.Exec(ctx, `
			UPDATE offline_sync_queue SET status = 'synced', synced_at = NOW()
			WHERE id = $1 AND tenant_id = $2
		`, id, tenantID)
	}

	httputil.JSON(w, http.StatusOK, map[string]int{"acknowledged": len(req.IDs)})
}

func (h *OfflineHandler) Bootstrap(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	type RoomData struct {
		ID       string `json:"id"`
		Number   string `json:"number"`
		Floor    string `json:"floor"`
		Status   string `json:"status"`
		RoomType string `json:"room_type"`
	}

	roomRows, err := h.pool.Query(ctx, `
		SELECT r.id, r.number, r.floor, r.status, COALESCE(rt.name, '') as room_type
		FROM rooms r
		LEFT JOIN room_types rt ON rt.id = r.room_type_id AND rt.tenant_id = r.tenant_id
		WHERE r.tenant_id = $1 ORDER BY r.number
	`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to bootstrap")
		return
	}
	defer roomRows.Close()

	var rooms []RoomData
	for roomRows.Next() {
		var rm RoomData
		if roomRows.Scan(&rm.ID, &rm.Number, &rm.Floor, &rm.Status, &rm.RoomType) == nil {
			rooms = append(rooms, rm)
		}
	}
	if rooms == nil {
		rooms = []RoomData{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"rooms":  rooms,
		"date":   currentDate(),
		"status": "online",
	})
}
