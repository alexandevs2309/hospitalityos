package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/availability"
	"github.com/hospitalityos/internal/application/reservation"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
	"github.com/hospitalityos/pkg/httputil"
)

type ReservationHandler struct {
	createHandler     *reservation.CreateReservationHandler
	cancelHandler     *reservation.CancelReservationHandler
	availability      *availability.Engine
	pool              *pgxpool.Pool
}

func NewReservationHandler(create *reservation.CreateReservationHandler, cancel *reservation.CancelReservationHandler, avail *availability.Engine, pool *pgxpool.Pool) *ReservationHandler {
	return &ReservationHandler{
		createHandler:     create,
		cancelHandler:     cancel,
		availability:      avail,
		pool:              pool,
	}
}

type CreateReservationRequest struct {
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	RoomID        string `json:"room_id"`
	RoomTypeID    string `json:"room_type_id"`
	RateID        string `json:"rate_id"`
	CheckIn       string `json:"check_in"`
	CheckOut      string `json:"check_out"`
	Adults        int    `json:"adults"`
	Children      int    `json:"children"`
	TotalCents    int64  `json:"total_cents"`
	Currency      string `json:"currency"`
}

type CreatePublicReservationRequest struct {
	ReservationID string `json:"reservation_id"`
	GuestID       string `json:"guest_id"`
	RoomID        string `json:"room_id"`
	RoomTypeID    string `json:"room_type_id"`
	RateID        string `json:"rate_id"`
	CheckIn       string `json:"check_in"`
	CheckOut      string `json:"check_out"`
	Adults        int    `json:"adults"`
	Children      int    `json:"children"`
	TotalCents    int64  `json:"total_cents"`
	Currency      string `json:"currency"`
}

func (h *ReservationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ReservationID == "" || req.GuestID == "" || req.RoomID == "" || req.CheckIn == "" || req.CheckOut == "" {
		httputil.BadRequest(w, "reservation_id, guest_id, room_id, check_in, check_out required")
		return
	}
	if req.Adults < 1 {
		httputil.BadRequest(w, "at least 1 adult required")
		return
	}
	if req.TotalCents <= 0 {
		httputil.BadRequest(w, "total_cents must be positive")
		return
	}

	checkIn, err := httputil.ParseDate(req.CheckIn)
	if err != nil {
		httputil.BadRequest(w, "invalid check_in format (YYYY-MM-DD)")
		return
	}
	checkOut, err := httputil.ParseDate(req.CheckOut)
	if err != nil {
		httputil.BadRequest(w, "invalid check_out format (YYYY-MM-DD)")
		return
	}
	if !checkOut.After(checkIn) {
		httputil.BadRequest(w, "check_out must be after check_in")
		return
	}

	tenantID := middleware.TenantFromContext(r.Context())

	if h.availability != nil {
		available, err := h.availability.IsRoomAvailable(r.Context(), tenantID, req.RoomID, checkIn, checkOut)
		if err != nil {
			httputil.InternalServerError(w, "failed to check availability")
			return
		}
		if !available {
			httputil.Conflict(w, "room is not available for the selected dates")
			return
		}
	}

	cmd := reservation.CreateReservationCommand{
		ReservationID: req.ReservationID,
		TenantID:      tenantID,
		GuestID:       req.GuestID,
		RoomID:        req.RoomID,
		RateID:        req.RateID,
		CheckIn:       checkIn,
		CheckOut:      checkOut,
		Adults:        req.Adults,
		Children:      req.Children,
		TotalCents:    req.TotalCents,
		Currency:      req.Currency,
	}

	if err := h.createHandler.Handle(r.Context(), cmd); err != nil {
		httputil.Conflict(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"id": req.ReservationID})
}

type CancelReservationRequest struct {
	ReservationID string `json:"reservation_id"`
}

func (h *ReservationHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	var req CancelReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}
	if req.ReservationID == "" {
		httputil.BadRequest(w, "reservation_id required")
		return
	}

	tenantID := middleware.TenantFromContext(r.Context())
	cmd := reservation.CancelReservationCommand{
		ReservationID: req.ReservationID,
		TenantID:      tenantID,
	}

	if err := h.cancelHandler.Handle(r.Context(), cmd); err != nil {
		httputil.Conflict(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "canceled"})
}

func (h *ReservationHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	query := `
		SELECT id, tenant_id, guest_id, room_id, COALESCE(rate_id,''), check_in::text, check_out::text, adults, children, total_cents, COALESCE(currency,'USD'), status::text
		FROM reservations WHERE tenant_id=$1
	`
	args := []interface{}{tenantID}

	if status := r.URL.Query().Get("status"); status != "" {
		query += " AND status=$2"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			query += " LIMIT " + strconv.Itoa(limit)
		}
	}

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to query reservations")
		return
	}
	defer rows.Close()

	type resResp struct {
		ID         string `json:"id"`
		TenantID   string `json:"tenant_id"`
		GuestID    string `json:"guest_id"`
		RoomID     string `json:"room_id"`
		RateID     string `json:"rate_id"`
		CheckIn    string `json:"check_in"`
		CheckOut   string `json:"check_out"`
		Adults     int    `json:"adults"`
		Children   int    `json:"children"`
		TotalCents int64  `json:"total_cents"`
		Currency   string `json:"currency"`
		Status     string `json:"status"`
	}
	var reservations []resResp
	for rows.Next() {
		var res resResp
		if err := rows.Scan(&res.ID, &res.TenantID, &res.GuestID, &res.RoomID, &res.RateID, &res.CheckIn, &res.CheckOut, &res.Adults, &res.Children, &res.TotalCents, &res.Currency, &res.Status); err != nil {
			httputil.InternalServerError(w, "failed to scan reservation")
			return
		}
		reservations = append(reservations, res)
	}
	if reservations == nil {
		reservations = []resResp{}
	}
	httputil.JSON(w, http.StatusOK, reservations)
}

func (h *ReservationHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	var res struct {
		ID         string `json:"id"`
		TenantID   string `json:"tenant_id"`
		GuestID    string `json:"guest_id"`
		RoomID     string `json:"room_id"`
		RateID     string `json:"rate_id"`
		CheckIn    string `json:"check_in"`
		CheckOut   string `json:"check_out"`
		Adults     int    `json:"adults"`
		Children   int    `json:"children"`
		TotalCents int64  `json:"total_cents"`
		Currency   string `json:"currency"`
		Status     string `json:"status"`
	}
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id, guest_id, room_id, COALESCE(rate_id,''), check_in::text, check_out::text, adults, children, total_cents, COALESCE(currency,'USD'), status::text FROM reservations WHERE id=$1 AND tenant_id=$2`, id, tenantID).
		Scan(&res.ID, &res.TenantID, &res.GuestID, &res.RoomID, &res.RateID, &res.CheckIn, &res.CheckOut, &res.Adults, &res.Children, &res.TotalCents, &res.Currency, &res.Status)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}
	httputil.JSON(w, http.StatusOK, res)
}

func (h *ReservationHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	var res struct {
		ID         string `json:"id"`
		TenantID   string `json:"tenant_id"`
		GuestID    string `json:"guest_id"`
		RoomID     string `json:"room_id"`
		RateID     string `json:"rate_id"`
		CheckIn    string `json:"check_in"`
		CheckOut   string `json:"check_out"`
		Adults     int    `json:"adults"`
		Children   int    `json:"children"`
		TotalCents int64  `json:"total_cents"`
		Currency   string `json:"currency"`
		Status     string `json:"status"`
	}
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id, guest_id, room_id, COALESCE(rate_id,''), check_in::text, check_out::text, adults, children, total_cents, COALESCE(currency,'USD'), status::text FROM reservations WHERE id=$1 AND tenant_id=$2`, id, tenantID).
		Scan(&res.ID, &res.TenantID, &res.GuestID, &res.RoomID, &res.RateID, &res.CheckIn, &res.CheckOut, &res.Adults, &res.Children, &res.TotalCents, &res.Currency, &res.Status)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}

	// Fetch room + guest info for display
	var roomNumber, roomType, guestName, guestEmail string
	_ = h.pool.QueryRow(ctx, `SELECT r.number, rt.name FROM rooms r LEFT JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = $1 AND r.tenant_id = $2`, res.RoomID, tenantID).Scan(&roomNumber, &roomType)
	_ = h.pool.QueryRow(ctx, `SELECT first_name, last_name, email FROM guests WHERE id = $1 AND tenant_id = $2`, res.GuestID, tenantID).Scan(&guestName, &guestEmail, &guestEmail)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id": res.ID, "room_id": res.RoomID, "guest_id": res.GuestID,
		"room_number": roomNumber, "room_type": roomType, "guest_name": guestName,
		"check_in": res.CheckIn, "check_out": res.CheckOut,
		"adults": res.Adults, "children": res.Children,
		"total_cents": res.TotalCents, "currency": res.Currency, "status": res.Status,
	})
}

type UpdateReservationRequest struct {
	RoomID     string `json:"room_id"`
	CheckIn    string `json:"check_in"`
	CheckOut   string `json:"check_out"`
	Adults     int    `json:"adults"`
	Children   int    `json:"children"`
	TotalCents int64  `json:"total_cents"`
}

func (h *ReservationHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := middleware.TenantFromContext(r.Context())
	ctx := r.Context()

	var req UpdateReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	var currentStatus string
	err := h.pool.QueryRow(ctx,
		`SELECT status::text FROM reservations WHERE id=$1 AND tenant_id=$2`, id, tenantID).
		Scan(&currentStatus)
	if err != nil {
		httputil.NotFound(w, "reservation not found")
		return
	}
	if currentStatus != "pending" && currentStatus != "confirmed" {
		httputil.Conflict(w, "can only update pending or confirmed reservations")
		return
	}

	checkIn, err := httputil.ParseDate(req.CheckIn)
	if err != nil {
		httputil.BadRequest(w, "invalid check_in format (YYYY-MM-DD)")
		return
	}
	checkOut, err := httputil.ParseDate(req.CheckOut)
	if err != nil {
		httputil.BadRequest(w, "invalid check_out format (YYYY-MM-DD)")
		return
	}
	if !checkOut.After(checkIn) {
		httputil.BadRequest(w, "check_out must be after check_in")
		return
	}
	if req.RoomID == "" {
		httputil.BadRequest(w, "room_id required")
		return
	}
	if req.Adults < 1 {
		httputil.BadRequest(w, "at least 1 adult required")
		return
	}
	if req.TotalCents <= 0 {
		httputil.BadRequest(w, "total_cents must be positive")
		return
	}

	if h.availability != nil {
		available, err := h.availability.IsRoomAvailableExcluding(ctx, tenantID, req.RoomID, checkIn, checkOut, id)
		if err != nil {
			httputil.InternalServerError(w, "failed to check availability")
			return
		}
		if !available {
			httputil.Conflict(w, "room is not available for the selected dates")
			return
		}
	}

	tag, err := h.pool.Exec(ctx, `
		UPDATE reservations
		SET room_id=$1, check_in=$2, check_out=$3, adults=$4, children=$5, total_cents=$6, updated_at=NOW()
		WHERE id=$7 AND tenant_id=$8 AND status IN ('pending','confirmed')
	`, req.RoomID, checkIn, checkOut, req.Adults, req.Children, req.TotalCents, id, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to update reservation")
		return
	}
	if tag.RowsAffected() == 0 {
		httputil.NotFound(w, "reservation not found or not updatable")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ReservationHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	tag, err := h.pool.Exec(ctx, `UPDATE reservations SET status='checked_in', updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='confirmed'`, id, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to check in")
		return
	}
	if tag.RowsAffected() == 0 {
		httputil.NotFound(w, "reservation not found or not in confirmed status")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "checked_in"})
}

func (h *ReservationHandler) CheckOut(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	tag, err := h.pool.Exec(ctx, `UPDATE reservations SET status='checked_out', updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='checked_in'`, id, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to check out")
		return
	}
	if tag.RowsAffected() == 0 {
		httputil.NotFound(w, "reservation not found or not in checked_in status")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "checked_out"})
}

func (h *ReservationHandler) CreatePublic(w http.ResponseWriter, r *http.Request) {
	var req CreatePublicReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if req.ReservationID == "" || req.GuestID == "" || req.CheckIn == "" || req.CheckOut == "" {
		httputil.BadRequest(w, "reservation_id, guest_id, check_in, check_out required")
		return
	}
	if req.Adults < 1 {
		httputil.BadRequest(w, "at least 1 adult required")
		return
	}

	checkIn, err := httputil.ParseDate(req.CheckIn)
	if err != nil {
		httputil.BadRequest(w, "invalid check_in format (YYYY-MM-DD)")
		return
	}
	checkOut, err := httputil.ParseDate(req.CheckOut)
	if err != nil {
		httputil.BadRequest(w, "invalid check_out format (YYYY-MM-DD)")
		return
	}
	if !checkOut.After(checkIn) {
		httputil.BadRequest(w, "check_out must be after check_in")
		return
	}

	tenantID := middleware.TenantFromContext(r.Context())

	// Determine the room: explicit room_id or first available of the requested type
	var roomID string
	if req.RoomID != "" {
		err := h.pool.QueryRow(r.Context(), `
			SELECT id FROM rooms
			WHERE id = $1 AND tenant_id = $2 AND status = 'available'
		`, req.RoomID, tenantID).Scan(&roomID)
		if err != nil {
			httputil.Conflict(w, "selected room is not available")
			return
		}
	} else {
		if req.RoomTypeID == "" {
			httputil.BadRequest(w, "room_id or room_type_id required")
			return
		}
		err := h.pool.QueryRow(r.Context(), `
			SELECT id FROM rooms
			WHERE tenant_id = $1 AND room_type_id = $2 AND status = 'available'
			ORDER BY number
			LIMIT 1
		`, tenantID, req.RoomTypeID).Scan(&roomID)
		if err != nil {
			httputil.Conflict(w, "no available rooms of the selected type for these dates")
			return
		}
	}

	// Check availability for the specific room
	if h.availability != nil {
		available, err := h.availability.IsRoomAvailable(r.Context(), tenantID, roomID, checkIn, checkOut)
		if err != nil {
			httputil.InternalServerError(w, "failed to check availability")
			return
		}
		if !available {
			httputil.Conflict(w, "room is not available for the selected dates")
			return
		}
	}

	// Compute total server-side (never trust client total): rate × nights
	var basePriceCents int64
	currency := req.Currency
	var currencyFromType string
	err = h.pool.QueryRow(r.Context(), `
		SELECT COALESCE(rt.base_price_cents, 0), COALESCE(rt.currency, 'USD')
		FROM rooms r
		JOIN room_types rt ON rt.id = r.room_type_id
		WHERE r.id = $1 AND r.tenant_id = $2
	`, roomID, tenantID).Scan(&basePriceCents, &currencyFromType)
	if err != nil {
		httputil.InternalServerError(w, "failed to load room pricing")
		return
	}
	if basePriceCents <= 0 {
		httputil.InternalServerError(w, "room has no configured price")
		return
	}
	if currency == "" {
		currency = currencyFromType
	}

	// If a rate_id was provided, prefer its nightly price
	if req.RateID != "" {
		var rateCents int64
		if err := h.pool.QueryRow(r.Context(), `
			SELECT COALESCE(amount_cents, 0) FROM rates WHERE id = $1 AND tenant_id = $2
		`, req.RateID, tenantID).Scan(&rateCents); err == nil && rateCents > 0 {
			basePriceCents = rateCents
		}
	}

	nights := int(checkOut.Sub(checkIn).Hours() / 24)
	if nights < 1 {
		nights = 1
	}
	totalCents := basePriceCents * int64(nights)

	cmd := reservation.CreateReservationCommand{
		ReservationID: req.ReservationID,
		TenantID:      tenantID,
		GuestID:       req.GuestID,
		RoomID:        roomID,
		RateID:        req.RateID,
		CheckIn:       checkIn,
		CheckOut:      checkOut,
		Adults:        req.Adults,
		Children:      req.Children,
		TotalCents:    totalCents,
		Currency:      currency,
	}

	if err := h.createHandler.Handle(r.Context(), cmd); err != nil {
		httputil.Conflict(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id": req.ReservationID, "room_id": roomID,
		"total_cents": totalCents, "currency": currency,
	})
}
