package handlers

import (
	"context"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type CRMHandler struct {
	pool *pgxpool.Pool
}

func NewCRMHandler(pool *pgxpool.Pool) *CRMHandler {
	return &CRMHandler{pool: pool}
}

func (h *CRMHandler) setTenant(ctx context.Context, tenantID string) {
	h.pool.Exec(ctx, `SET app.current_tenant = $1`, tenantID)
}

type Segment struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

func (h *CRMHandler) GetSegments(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	segments := []Segment{}

	queries := map[string]string{
		"vip":         `SELECT COUNT(DISTINCT gt.guest_id) FROM guest_tags gt WHERE gt.tenant_id = $1 AND gt.tag = 'vip'`,
		"corporate":   `SELECT COUNT(DISTINCT gt.guest_id) FROM guest_tags gt WHERE gt.tenant_id = $1 AND gt.tag = 'corporate'`,
		"returning":   `SELECT COUNT(DISTINCT guest_id) FROM reservations WHERE tenant_id = $1 AND guest_id IN (SELECT guest_id FROM reservations WHERE tenant_id = $1 GROUP BY guest_id HAVING COUNT(*) > 1)`,
		"new":         `SELECT COUNT(DISTINCT guest_id) FROM reservations WHERE tenant_id = $1 AND guest_id IN (SELECT guest_id FROM reservations WHERE tenant_id = $1 GROUP BY guest_id HAVING COUNT(*) = 1)`,
		"checked_in":  `SELECT COUNT(DISTINCT guest_id) FROM reservations WHERE tenant_id = $1 AND status = 'checked_in'`,
		"total":       `SELECT COUNT(*) FROM guests WHERE tenant_id = $1`,
	}

	for name, query := range queries {
		var count int
		h.pool.QueryRow(ctx, query, tenantID).Scan(&count)
		segments = append(segments, Segment{Name: name, Count: count})
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"segments": segments})
}

type GuestWithCRM struct {
	ID            string `json:"id"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
		Email         string `json:"email"`
	Phone         string `json:"phone"`
	TotalStays    int    `json:"total_stays"`
	TotalSpent    int64  `json:"total_spent_cents"`
	AvgStayNights float64 `json:"average_stay_nights"`
	LastStayDate  string `json:"last_stay_date"`
	Segment       string `json:"segment"`
	Tags          []string `json:"tags"`
}

func (h *CRMHandler) ListGuestsCRM(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	h.setTenant(ctx, tenantID)

	segment := r.URL.Query().Get("segment")
	search := r.URL.Query().Get("search")

	query := `
		SELECT g.id, COALESCE(g.first_name,''), COALESCE(g.last_name,''),
		       COALESCE(g.email,''), COALESCE(g.phone,''),
		       COUNT(r.id) as total_stays,
		       COALESCE(SUM(r.total_cents), 0) as total_spent,
		       COALESCE(AVG(r.check_out - r.check_in), 0) as avg_nights,
		       MAX(r.check_out)::text as last_stay
		FROM guests g
		LEFT JOIN reservations r ON r.guest_id = g.id AND r.tenant_id = g.tenant_id
		WHERE g.tenant_id = $1`
	args := []interface{}{tenantID}

	if search != "" {
		query += ` AND (LOWER(g.first_name) LIKE LOWER($2) OR LOWER(g.last_name) LIKE LOWER($2) OR LOWER(g.email) LIKE LOWER($2) OR g.phone LIKE $2)`
		args = append(args, "%"+search+"%")
	}

	query += ` GROUP BY g.id, g.first_name, g.last_name, g.email, g.phone`

	if segment == "returning" {
		query += ` HAVING COUNT(r.id) > 1`
	} else if segment == "new" {
		query += ` HAVING COUNT(r.id) = 1`
	} else if segment == "vip" || segment == "corporate" {
		query += ` HAVING g.id IN (SELECT gt2.guest_id FROM guest_tags gt2 WHERE gt2.tenant_id = $1 AND gt2.tag = $3)`
		args = append(args, segment)
	}

	query += ` ORDER BY total_stays DESC, total_spent DESC LIMIT 100`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch guests")
		return
	}
	defer rows.Close()

	var guests []GuestWithCRM
	for rows.Next() {
		var g GuestWithCRM
		var tags []string

		err := rows.Scan(&g.ID, &g.FirstName, &g.LastName, &g.Email, &g.Phone,
			&g.TotalStays, &g.TotalSpent, &g.AvgStayNights, &g.LastStayDate)
		if err != nil {
			continue
		}

		h.pool.QueryRow(ctx, `SELECT ARRAY_AGG(tag) FROM guest_tags WHERE guest_id = $1 AND tenant_id = $2`, g.ID, tenantID).Scan(&tags)
		if tags == nil {
			tags = []string{}
		}
		g.Tags = tags

		if g.TotalStays > 3 {
			g.Segment = "loyal"
		} else if g.TotalStays > 1 {
			g.Segment = "returning"
		} else {
			g.Segment = "new"
		}

		for _, t := range tags {
			if t == "vip" {
				g.Segment = "vip"
			}
			if t == "corporate" {
				g.Segment = "corporate"
			}
		}

		if g.TotalSpent > 5000000 {
			g.Segment = "high_value"
		}

		guests = append(guests, g)
	}
	if guests == nil {
		guests = []GuestWithCRM{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"guests": guests})
}

func (h *CRMHandler) GetGuestStayHistory(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	guestID := r.URL.Query().Get("guest_id")
	if guestID == "" {
		httputil.BadRequest(w, "guest_id required")
		return
	}

	ctx := r.Context()

	type Stay struct {
		ReservationID string `json:"reservation_id"`
		RoomNumber    string `json:"room_number"`
		CheckIn       string `json:"check_in"`
		CheckOut      string `json:"check_out"`
		Status        string `json:"status"`
		TotalCents    int64  `json:"total_cents"`
		Currency      string `json:"currency"`
		Nights        int    `json:"nights"`
	}

	rows, err := h.pool.Query(ctx,
		`SELECT r.id::text, COALESCE(rm.number,''), r.check_in::text, r.check_out::text,
		        r.status, COALESCE(r.total_cents,0), COALESCE(r.currency,'DOP'),
		        (r.check_out - r.check_in) as nights
		 FROM reservations r
		 LEFT JOIN rooms rm ON rm.id = r.room_id AND rm.tenant_id = r.tenant_id
		 WHERE r.guest_id = $1 AND r.tenant_id = $2
		 ORDER BY r.check_in DESC`,
		guestID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch stay history")
		return
	}
	defer rows.Close()

	var stays []Stay
	for rows.Next() {
		var s Stay
		rows.Scan(&s.ReservationID, &s.RoomNumber, &s.CheckIn, &s.CheckOut, &s.Status, &s.TotalCents, &s.Currency, &s.Nights)
		stays = append(stays, s)
	}
	if stays == nil {
		stays = []Stay{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"stays": stays})
}

func (h *CRMHandler) GetGuestCommunications(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	guestID := r.URL.Query().Get("guest_id")
	if guestID == "" {
		httputil.BadRequest(w, "guest_id required")
		return
	}

	ctx := r.Context()

	type Comm struct {
		ID          string `json:"id"`
		Type        string `json:"type"`
		Direction   string `json:"direction"`
		Content     string `json:"content"`
		Status      string `json:"status"`
		CreatedAt   string `json:"created_at"`
	}

	rows, err := h.pool.Query(ctx,
		`SELECT id::text, COALESCE(message_type,'text'), direction, COALESCE(content,''), COALESCE(status,''), created_at::text
		 FROM whatsapp_messages
		 WHERE guest_id = $1 AND tenant_id = $2
		 ORDER BY created_at DESC LIMIT 50`,
		guestID, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch communications")
		return
	}
	defer rows.Close()

	var comms []Comm
	for rows.Next() {
		var c Comm
		rows.Scan(&c.ID, &c.Type, &c.Direction, &c.Content, &c.Status, &c.CreatedAt)
		comms = append(comms, c)
	}
	if comms == nil {
		comms = []Comm{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"communications": comms})
}
