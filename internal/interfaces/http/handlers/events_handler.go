package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type EventsHandler struct {
	pool *pgxpool.Pool
}

func NewEventsHandler(pool *pgxpool.Pool) *EventsHandler {
	return &EventsHandler{pool: pool}
}

func (h *EventsHandler) setCtx(ctx context.Context, tenantID string) {
	h.pool.Exec(ctx, `SET app.current_tenant = $1`, tenantID)
}

type Event struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	EventType   string   `json:"event_type"`
	StartDate   string   `json:"start_date"`
	EndDate     string   `json:"end_date"`
	GuestCount  int      `json:"guest_count"`
	RoomTypeIDs []string `json:"room_type_ids"`
	Status      string   `json:"status"`
	Notes       string   `json:"notes"`
	CreatedAt   string   `json:"created_at"`
}

func (h *EventsHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	rows, err := h.pool.Query(ctx,
		`SELECT id::text, name, event_type, start_date::text, end_date::text,
		        guest_count, COALESCE(room_type_ids,'{}'), status, COALESCE(notes,''), created_at::text
		 FROM group_events WHERE tenant_id = $1 ORDER BY start_date DESC`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed")
		return
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		rows.Scan(&e.ID, &e.Name, &e.EventType, &e.StartDate, &e.EndDate,
			&e.GuestCount, &e.RoomTypeIDs, &e.Status, &e.Notes, &e.CreatedAt)
		events = append(events, e)
	}
	if events == nil {
		events = []Event{}
	}
	httputil.JSON(w, http.StatusOK, map[string]interface{}{"events": events})
}

func (h *EventsHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	var body struct {
		Name       string `json:"name"`
		EventType  string `json:"event_type"`
		StartDate  string `json:"start_date"`
		EndDate    string `json:"end_date"`
		GuestCount int    `json:"guest_count"`
		Notes      string `json:"notes"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Name == "" || body.StartDate == "" || body.EndDate == "" {
		httputil.BadRequest(w, "name, start_date, end_date required")
		return
	}
	if body.EventType == "" {
		body.EventType = "conference"
	}

	var id string
	err := h.pool.QueryRow(ctx,
		`INSERT INTO group_events (tenant_id, name, event_type, start_date, end_date, guest_count, notes, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING id::text`,
		tenantID, body.Name, body.EventType, body.StartDate, body.EndDate, body.GuestCount, body.Notes).Scan(&id)
	if err != nil {
		httputil.InternalServerError(w, "failed to create event")
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *EventsHandler) UpdateEventStatus(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	eventID := chi.URLParam(r, "id")
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	var body struct {
		Status string `json:"status"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Status == "" {
		httputil.BadRequest(w, "status required")
		return
	}

	valid := map[string]bool{"pending": true, "confirmed": true, "cancelled": true, "completed": true}
	if !valid[body.Status] {
		httputil.BadRequest(w, "invalid status")
		return
	}

	_, err := h.pool.Exec(ctx,
		`UPDATE group_events SET status = $1 WHERE id = $2 AND tenant_id = $3`,
		body.Status, eventID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to update")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": body.Status})
}

func (h *EventsHandler) BlockDates(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	var body struct {
		Name      string   `json:"name"`
		StartDate string   `json:"start_date"`
		EndDate   string   `json:"end_date"`
		RoomIDs   []string `json:"room_ids"`
		Reason    string   `json:"reason"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.StartDate == "" || body.EndDate == "" {
		httputil.BadRequest(w, "start_date and end_date required")
		return
	}

	start, _ := time.Parse("2006-01-02", body.StartDate)
	end, _ := time.Parse("2006-01-02", body.EndDate)

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		for _, roomID := range body.RoomIDs {
			h.pool.Exec(ctx,
				`INSERT INTO room_blocked_dates (tenant_id, room_id, blocked_date, reason, created_at)
				 VALUES ($1, $2, $3, $4, NOW())
				 ON CONFLICT (tenant_id, room_id, blocked_date) DO NOTHING`,
				tenantID, roomID, dateStr, body.Reason)
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  "blocked",
		"message": "Fechas bloqueadas",
	})
}

func (h *EventsHandler) GetEventAvailability(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" || endDate == "" {
		httputil.BadRequest(w, "start_date and end_date required")
		return
	}

	rows, err := h.pool.Query(ctx,
		`SELECT rm.id::text, rm.number, rt.name as room_type_name
		 FROM rooms rm JOIN room_types rt ON rt.id = rm.room_type_id AND rt.tenant_id = rm.tenant_id
		 WHERE rm.tenant_id = $1 AND rm.status = 'available'
		 AND rm.id NOT IN (
		     SELECT rbd.room_id FROM room_blocked_dates rbd
		     WHERE rbd.tenant_id = $1 AND rbd.blocked_date BETWEEN $2 AND $3
		 )
		 ORDER BY rm.number`, tenantID, startDate, endDate)
	if err != nil {
		httputil.InternalServerError(w, "failed")
		return
	}
	defer rows.Close()

	type RoomAvail struct {
		ID       string `json:"id"`
		Number   string `json:"number"`
		RoomType string `json:"room_type"`
	}
	var rooms []RoomAvail
	for rows.Next() {
		var rm RoomAvail
		rows.Scan(&rm.ID, &rm.Number, &rm.RoomType)
		rooms = append(rooms, rm)
	}
	if rooms == nil {
		rooms = []RoomAvail{}
	}
	httputil.JSON(w, http.StatusOK, map[string]interface{}{"available_rooms": rooms})
}
