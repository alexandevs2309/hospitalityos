package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/domain/room"
	"github.com/hospitalityos/pkg/httputil"
)

func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b)
}

type RoomHandler struct {
	pool *pgxpool.Pool
}

func NewRoomHandler(pool *pgxpool.Pool) *RoomHandler {
	return &RoomHandler{pool: pool}
}

func (h *RoomHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}
	statusFilter := r.URL.Query().Get("status")

	ctx := r.Context()
	var rows pgx.Rows
	var err error
	if statusFilter != "" {
		if !room.IsValidStatus(room.Status(statusFilter)) {
			httputil.BadRequest(w, "invalid status value: available, occupied, cleaning, maintenance")
			return
		}
		rows, err = h.pool.Query(ctx,
			`SELECT id, tenant_id, room_type_id, number, floor, status FROM rooms WHERE tenant_id=$1 AND status=$2 ORDER BY number`,
			tenantID, statusFilter)
	} else {
		rows, err = h.pool.Query(ctx,
			`SELECT id, tenant_id, room_type_id, number, floor, status FROM rooms WHERE tenant_id=$1 ORDER BY number`,
			tenantID)
	}
	if err != nil {
		httputil.InternalServerError(w, "failed to query rooms")
		return
	}
	defer rows.Close()

	type roomResp struct {
		ID         string `json:"id"`
		TenantID   string `json:"tenant_id"`
		RoomTypeID string `json:"room_type_id"`
		Number     string `json:"number"`
		Floor      string `json:"floor"`
		Status     string `json:"status"`
	}
	var rooms []roomResp
	for rows.Next() {
		var rm roomResp
		if err := rows.Scan(&rm.ID, &rm.TenantID, &rm.RoomTypeID, &rm.Number, &rm.Floor, &rm.Status); err != nil {
			httputil.InternalServerError(w, "failed to scan room")
			return
		}
		rooms = append(rooms, rm)
	}
	if rooms == nil {
		rooms = []roomResp{}
	}
	httputil.JSON(w, http.StatusOK, rooms)
}

func (h *RoomHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	var rm struct {
		ID         string `json:"id"`
		TenantID   string `json:"tenant_id"`
		RoomTypeID string `json:"room_type_id"`
		Number     string `json:"number"`
		Floor      string `json:"floor"`
		Status     string `json:"status"`
	}
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id, room_type_id, number, floor, status FROM rooms WHERE id=$1 AND tenant_id=$2`, id, tenantID).
		Scan(&rm.ID, &rm.TenantID, &rm.RoomTypeID, &rm.Number, &rm.Floor, &rm.Status)
	if err != nil {
		httputil.NotFound(w, "room not found")
		return
	}
	httputil.JSON(w, http.StatusOK, rm)
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	var input struct {
		RoomTypeID string `json:"room_type_id"`
		Number     string `json:"number"`
		Floor      string `json:"floor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.BadRequest(w, "invalid body")
		return
	}
	if input.RoomTypeID == "" || input.Number == "" {
		httputil.BadRequest(w, "room_type_id and number required")
		return
	}

	ctx := r.Context()
	id := generateID()
	rm, err := room.NewRoom(id, tenantID, input.RoomTypeID, input.Number, input.Floor)
	if err != nil {
		httputil.BadRequest(w, err.Error())
		return
	}

	tag, err := h.pool.Exec(ctx, `
		INSERT INTO rooms (id, tenant_id, room_type_id, number, floor, status, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'available', NOW())
	`, id, tenantID, input.RoomTypeID, input.Number, input.Floor)
	if err != nil {
		httputil.InternalServerError(w, "failed to create room")
		return
	}
	if tag.RowsAffected() == 0 {
		httputil.Conflict(w, "room creation failed")
		return
	}
	_ = rm

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *RoomHandler) UpdateRoomStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	var input struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.BadRequest(w, "invalid body")
		return
	}
	if input.Status == "" {
		httputil.BadRequest(w, "status required")
		return
	}
	if !room.IsValidStatus(room.Status(input.Status)) {
		httputil.BadRequest(w, "invalid status: available, occupied, cleaning, maintenance")
		return
	}

	ctx := r.Context()
	tag, err := h.pool.Exec(ctx, `UPDATE rooms SET status=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3`, input.Status, id, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to update room status")
		return
	}
	if tag.RowsAffected() == 0 {
		httputil.NotFound(w, "room not found")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"message": "status updated"})
}
