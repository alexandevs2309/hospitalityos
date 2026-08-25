package handlers

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type TapeChartHandler struct {
	pool *pgxpool.Pool
}

func NewTapeChartHandler(pool *pgxpool.Pool) *TapeChartHandler {
	return &TapeChartHandler{pool: pool}
}

type TapeChartRoom struct {
	ID       string `json:"id"`
	Number   string `json:"number"`
	Floor    string `json:"floor"`
	RoomType string `json:"room_type"`
	Status   string `json:"status"`
}

type TapeChartReservation struct {
	ID         string `json:"id"`
	RoomID     string `json:"room_id"`
	GuestName  string `json:"guest_name"`
	CheckIn    string `json:"check_in"`
	CheckOut   string `json:"check_out"`
	Status     string `json:"status"`
	TotalCents int64  `json:"total_cents"`
	Currency   string `json:"currency"`
}

type TapeChartResponse struct {
	Rooms        []TapeChartRoom        `json:"rooms"`
	Reservations []TapeChartReservation `json:"reservations"`
	StartDate    string                 `json:"start_date"`
	EndDate      string                 `json:"end_date"`
}

func (h *TapeChartHandler) GetTapeChart(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	startStr := r.URL.Query().Get("start_date")
	endStr := r.URL.Query().Get("end_date")

	now := time.Now()
	startDate := now.AddDate(0, 0, -7)
	endDate := now.AddDate(0, 0, 21)

	if startStr != "" {
		parsed, err := time.Parse("2006-01-02", startStr)
		if err != nil {
			httputil.BadRequest(w, "invalid start_date format (YYYY-MM-DD)")
			return
		}
		startDate = parsed
	}
	if endStr != "" {
		parsed, err := time.Parse("2006-01-02", endStr)
		if err != nil {
			httputil.BadRequest(w, "invalid end_date format (YYYY-MM-DD)")
			return
		}
		endDate = parsed
	}

	if !endDate.After(startDate) {
		httputil.BadRequest(w, "end_date must be after start_date")
		return
	}

	// Cap at 90 days
	if endDate.Sub(startDate).Hours() > 90*24 {
		endDate = startDate.AddDate(0, 0, 90)
	}

	ctx := r.Context()

	// Set tenant for RLS
	conn, err := h.pool.Acquire(ctx)
	if err != nil {
		httputil.InternalServerError(w, "database error")
		return
	}
	defer conn.Release()
	conn.Exec(ctx, "SET app.current_tenant = $1", tenantID)

	// Get rooms ordered by floor and number
	roomsRows, err := conn.Query(ctx,
		`SELECT r.id, r.number, COALESCE(r.floor, '1'), COALESCE(rt.name, ''), r.status
		 FROM rooms r
		 LEFT JOIN room_types rt ON rt.id = r.room_type_id AND rt.tenant_id = r.tenant_id
		 WHERE r.tenant_id = $1
		 ORDER BY r.floor ASC, r.number ASC`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to query rooms")
		return
	}
	defer roomsRows.Close()

	var rooms []TapeChartRoom
	for roomsRows.Next() {
		var rm TapeChartRoom
		if err := roomsRows.Scan(&rm.ID, &rm.Number, &rm.Floor, &rm.RoomType, &rm.Status); err != nil {
			httputil.InternalServerError(w, "failed to scan room")
			return
		}
		rooms = append(rooms, rm)
	}
	if rooms == nil {
		rooms = []TapeChartRoom{}
	}

	// Get reservations that overlap with the date range
	// Use half-open range [check_in, check_out) to match exclusion constraint
	resRows, err := conn.Query(ctx,
		`SELECT res.id, res.room_id, COALESCE(g.first_name || ' ' || g.last_name, 'Guest'),
		        res.check_in::text, res.check_out::text, res.status::text,
		        res.total_cents, res.currency
		 FROM reservations res
		 LEFT JOIN guests g ON g.id = res.guest_id AND g.tenant_id = res.tenant_id
		 WHERE res.tenant_id = $1
		   AND res.check_in < $3
		   AND res.check_out > $2
		   AND res.status NOT IN ('canceled')
		 ORDER BY res.room_id, res.check_in`, tenantID, startDate, endDate)
	if err != nil {
		httputil.InternalServerError(w, "failed to query reservations")
		return
	}
	defer resRows.Close()

	var reservations []TapeChartReservation
	for resRows.Next() {
		var res TapeChartReservation
		if err := resRows.Scan(&res.ID, &res.RoomID, &res.GuestName,
			&res.CheckIn, &res.CheckOut, &res.Status,
			&res.TotalCents, &res.Currency); err != nil {
			httputil.InternalServerError(w, "failed to scan reservation")
			return
		}
		reservations = append(reservations, res)
	}
	if reservations == nil {
		reservations = []TapeChartReservation{}
	}

	httputil.JSON(w, http.StatusOK, TapeChartResponse{
		Rooms:        rooms,
		Reservations: reservations,
		StartDate:    startDate.Format("2006-01-02"),
		EndDate:      endDate.Format("2006-01-02"),
	})
}
