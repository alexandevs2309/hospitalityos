package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type FrontDeskHandler struct {
	pool *pgxpool.Pool
}

func NewFrontDeskHandler(pool *pgxpool.Pool) *FrontDeskHandler {
	return &FrontDeskHandler{pool: pool}
}

type RoomStatus struct {
	ID            string `json:"id"`
	Number        string `json:"number"`
	Floor         string `json:"floor"`
	RoomType      string `json:"room_type"`
	Status        string `json:"status"`
	GuestName     string `json:"guest_name,omitempty"`
	ReservationID string `json:"reservation_id,omitempty"`
	CheckIn       string `json:"check_in,omitempty"`
	CheckOut      string `json:"check_out,omitempty"`
}

type TodayArrival struct {
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	GuestName     string `json:"guest_name"`
	RoomNumber    string `json:"room_number"`
	RoomID        string `json:"room_id"`
	CheckIn       string `json:"check_in"`
	CheckOut      string `json:"check_out"`
	Adults        int    `json:"adults"`
	Children      int    `json:"children"`
	Status        string `json:"status"`
}

type TodayDeparture struct {
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	GuestName     string `json:"guest_name"`
	RoomNumber    string `json:"room_number"`
	RoomID        string `json:"room_id"`
	CheckIn       string `json:"check_in"`
	CheckOut      string `json:"check_out"`
	Status        string `json:"status"`
}

type InHouseGuest struct {
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	GuestName     string `json:"guest_name"`
	RoomNumber    string `json:"room_number"`
	RoomID        string `json:"room_id"`
	CheckIn       string `json:"check_in"`
	CheckOut      string `json:"check_out"`
	Adults        int    `json:"adults"`
	Children      int    `json:"children"`
}

type FrontDeskResponse struct {
	Date       string           `json:"date"`
	Rooms      []RoomStatus     `json:"rooms"`
	Arrivals   []TodayArrival   `json:"arrivals"`
	Departures []TodayDeparture `json:"departures"`
	InHouse    []InHouseGuest   `json:"in_house"`
	Summary    FrontDeskSummary `json:"summary"`
}

type FrontDeskSummary struct {
	TotalRooms      int `json:"total_rooms"`
	Occupied        int `json:"occupied"`
	Available       int `json:"available"`
	ArrivalsToday   int `json:"arrivals_today"`
	DeparturesToday int `json:"departures_today"`
	InHouseCount    int `json:"in_house_count"`
}

func (h *FrontDeskHandler) Today(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	today := r.URL.Query().Get("date")
	if today == "" {
		today = currentDate()
	}

	rooms, err := h.fetchRooms(ctx, tenantID, today)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch rooms")
		return
	}

	arrivals, err := h.fetchArrivals(ctx, tenantID, today)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch arrivals")
		return
	}

	departures, err := h.fetchDepartures(ctx, tenantID, today)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch departures")
		return
	}

	inHouse, err := h.fetchInHouse(ctx, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch in-house guests")
		return
	}

	summary := FrontDeskSummary{
		TotalRooms:      len(rooms),
		Occupied:        0,
		Available:       0,
		ArrivalsToday:   len(arrivals),
		DeparturesToday: len(departures),
		InHouseCount:    len(inHouse),
	}
	for _, rm := range rooms {
		switch rm.Status {
		case "occupied":
			summary.Occupied++
		case "available":
			summary.Available++
		}
	}

	httputil.JSON(w, http.StatusOK, FrontDeskResponse{
		Date:       today,
		Rooms:      rooms,
		Arrivals:   arrivals,
		Departures: departures,
		InHouse:    inHouse,
		Summary:    summary,
	})
}

func (h *FrontDeskHandler) fetchRooms(ctx context.Context, tenantID, today string) ([]RoomStatus, error) {
	rows, err := h.pool.Query(ctx, `
		SELECT r.id, r.number, r.floor, COALESCE(rt.name, '') as room_type, r.status
		FROM rooms r
		LEFT JOIN room_types rt ON rt.id = r.room_type_id AND rt.tenant_id = r.tenant_id
		WHERE r.tenant_id = $1
		ORDER BY r.number
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []RoomStatus
	for rows.Next() {
		var rm RoomStatus
		if err := rows.Scan(&rm.ID, &rm.Number, &rm.Floor, &rm.RoomType, &rm.Status); err != nil {
			return nil, err
		}
		rooms = append(rooms, rm)
	}

	guestRows, err := h.pool.Query(ctx, `
		SELECT res.room_id, g.first_name || ' ' || g.last_name as guest_name,
		       res.id as reservation_id, res.check_in::text, res.check_out::text
		FROM reservations res
		LEFT JOIN guests g ON g.id = res.guest_id AND g.tenant_id = res.tenant_id
		WHERE res.tenant_id = $1 AND res.status = 'checked_in'
	`, tenantID)
	if err != nil {
		return rooms, nil
	}
	defer guestRows.Close()

	type guestInfo struct {
		GuestName     string
		ReservationID string
		CheckIn       string
		CheckOut      string
	}
	guestMap := make(map[string]guestInfo)
	for guestRows.Next() {
		var roomID, guestName, resID, checkIn, checkOut string
		if err := guestRows.Scan(&roomID, &guestName, &resID, &checkIn, &checkOut); err != nil {
			continue
		}
		guestMap[roomID] = guestInfo{guestName, resID, checkIn, checkOut}
	}

	for i := range rooms {
		if g, ok := guestMap[rooms[i].ID]; ok {
			rooms[i].GuestName = g.GuestName
			rooms[i].ReservationID = g.ReservationID
			rooms[i].CheckIn = g.CheckIn
			rooms[i].CheckOut = g.CheckOut
		}
	}

	return rooms, nil
}

func (h *FrontDeskHandler) fetchArrivals(ctx context.Context, tenantID, today string) ([]TodayArrival, error) {
	rows, err := h.pool.Query(ctx, `
		SELECT res.id, res.guest_id, COALESCE(g.first_name || ' ' || g.last_name, 'Walk-in') as guest_name,
		       COALESCE(rm.number, '') as room_number, res.room_id,
		       res.check_in::text, res.check_out::text,
		       res.adults, res.children, res.status
		FROM reservations res
		LEFT JOIN guests g ON g.id = res.guest_id AND g.tenant_id = res.tenant_id
		LEFT JOIN rooms rm ON rm.id = res.room_id AND rm.tenant_id = res.tenant_id
		WHERE res.tenant_id = $1 AND res.check_in = $2 AND res.status IN ('confirmed', 'pending')
		ORDER BY rm.number
	`, tenantID, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var arrivals []TodayArrival
	for rows.Next() {
		var a TodayArrival
		if err := rows.Scan(&a.ReservationID, &a.GuestID, &a.GuestName, &a.RoomNumber, &a.RoomID,
			&a.CheckIn, &a.CheckOut, &a.Adults, &a.Children, &a.Status); err != nil {
			return nil, err
		}
		arrivals = append(arrivals, a)
	}
	return arrivals, nil
}

func (h *FrontDeskHandler) fetchDepartures(ctx context.Context, tenantID, today string) ([]TodayDeparture, error) {
	rows, err := h.pool.Query(ctx, `
		SELECT res.id, res.guest_id, COALESCE(g.first_name || ' ' || g.last_name, '') as guest_name,
		       COALESCE(rm.number, '') as room_number, res.room_id,
		       res.check_in::text, res.check_out::text, res.status
		FROM reservations res
		LEFT JOIN guests g ON g.id = res.guest_id AND g.tenant_id = res.tenant_id
		LEFT JOIN rooms rm ON rm.id = res.room_id AND rm.tenant_id = res.tenant_id
		WHERE res.tenant_id = $1 AND res.check_out = $2 AND res.status IN ('checked_in')
		ORDER BY rm.number
	`, tenantID, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var departures []TodayDeparture
	for rows.Next() {
		var d TodayDeparture
		if err := rows.Scan(&d.ReservationID, &d.GuestID, &d.GuestName, &d.RoomNumber, &d.RoomID,
			&d.CheckIn, &d.CheckOut, &d.Status); err != nil {
			return nil, err
		}
		departures = append(departures, d)
	}
	return departures, nil
}

func (h *FrontDeskHandler) fetchInHouse(ctx context.Context, tenantID string) ([]InHouseGuest, error) {
	rows, err := h.pool.Query(ctx, `
		SELECT res.id, res.guest_id, COALESCE(g.first_name || ' ' || g.last_name, '') as guest_name,
		       COALESCE(rm.number, '') as room_number, res.room_id,
		       res.check_in::text, res.check_out::text,
		       res.adults, res.children
		FROM reservations res
		LEFT JOIN guests g ON g.id = res.guest_id AND g.tenant_id = res.tenant_id
		LEFT JOIN rooms rm ON rm.id = res.room_id AND rm.tenant_id = res.tenant_id
		WHERE res.tenant_id = $1 AND res.status = 'checked_in'
		ORDER BY rm.number
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var guests []InHouseGuest
	for rows.Next() {
		var g InHouseGuest
		if err := rows.Scan(&g.ReservationID, &g.GuestID, &g.GuestName, &g.RoomNumber, &g.RoomID,
			&g.CheckIn, &g.CheckOut, &g.Adults, &g.Children); err != nil {
			return nil, err
		}
		guests = append(guests, g)
	}
	return guests, nil
}

func currentDate() string {
	return time.Now().Format("2006-01-02")
}
