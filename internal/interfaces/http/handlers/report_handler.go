package handlers

import (
	"math"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type ReportHandler struct {
	pool *pgxpool.Pool
}

func NewReportHandler(pool *pgxpool.Pool) *ReportHandler {
	return &ReportHandler{pool: pool}
}

type OccupancyReport struct {
	Date            string  `json:"date"`
	TotalRooms      int     `json:"total_rooms"`
	Occupied        int     `json:"occupied"`
	Available       int     `json:"available"`
	OutOfOrder     int     `json:"out_of_order"`
	OccupancyRate   float64 `json:"occupancy_rate"`
	Arrivals        int     `json:"arrivals"`
	Departures      int     `json:"departures"`
	InHouse         int     `json:"in_house"`
}

type RevenueReport struct {
	StartDate       string `json:"start_date"`
	EndDate         string `json:"end_date"`
	TotalRevenue    int64  `json:"total_revenue_cents"`
	AverageDaily    int64  `json:"average_daily_rate_cents"`
	RevPAR          int64  `json:"revpar_cents"`
	TotalPayments   int64  `json:"total_payments_cents"`
	OutstandingBal  int64  `json:"outstanding_balance_cents"`
	Currency        string `json:"currency"`
}

type GuestStats struct {
	TotalGuests       int     `json:"total_guests"`
	NewGuests         int     `json:"new_guests"`
	ReturningGuests   int     `json:"returning_guests"`
	AverageStay       float64 `json:"average_stay_nights"`
	AverageSpend      int64   `json:"average_spend_cents"`
	TopCountries      []CountryStat `json:"top_countries"`
	Currency          string  `json:"currency"`
}

type CountryStat struct {
	Country string `json:"country"`
	Count   int    `json:"count"`
}

type DashboardSummary struct {
	Date             string  `json:"date"`
	OccupancyRate    float64 `json:"occupancy_rate"`
	TodayRevenue     int64   `json:"today_revenue_cents"`
	MonthRevenue     int64   `json:"month_revenue_cents"`
	TotalReservations int    `json:"total_reservations"`
	ActiveGuests     int     `json:"active_guests"`
	PendingTasks     int     `json:"pending_tasks"`
	OpenMaintenance  int     `json:"open_maintenance"`
	Currency         string  `json:"currency"`
}

func (h *ReportHandler) Occupancy(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	date := r.URL.Query().Get("date")
	if date == "" {
		date = currentDate()
	}

	var totalRooms, outOfOrder int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM rooms WHERE tenant_id = $1`, tenantID).Scan(&totalRooms)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM rooms WHERE tenant_id = $1 AND status = 'out_of_order'`, tenantID).Scan(&outOfOrder)

	var occupied int
	h.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT room_id) FROM reservations
		WHERE tenant_id = $1 AND status = 'checked_in'
		  AND check_in <= $2::date AND check_out > $2::date
	`, tenantID, date).Scan(&occupied)

	var arrivals, departures int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM reservations WHERE tenant_id = $1 AND check_in = $2::date AND status IN ('confirmed', 'pending')`,
		tenantID, date).Scan(&arrivals)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM reservations WHERE tenant_id = $1 AND check_out = $2::date AND status IN ('checked_in', 'checked_out')`,
		tenantID, date).Scan(&departures)

	sellable := totalRooms - outOfOrder
	available := sellable - occupied
	var occupancyRate float64
	if sellable > 0 {
		occupancyRate = float64(occupied) / float64(sellable) * 100
	}

	httputil.JSON(w, http.StatusOK, OccupancyReport{
		Date:          date,
		TotalRooms:    totalRooms,
		Occupied:      occupied,
		Available:     available,
		OutOfOrder:   outOfOrder,
		OccupancyRate: math.Round(occupancyRate*100) / 100,
		Arrivals:      arrivals,
		Departures:    departures,
		InHouse:       occupied,
	})
}

func (h *ReportHandler) Revenue(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" {
		startDate = "2000-01-01"
	}
	if endDate == "" {
		endDate = "2099-12-31"
	}

	var totalRooms int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM rooms WHERE tenant_id = $1`, tenantID).Scan(&totalRooms)

	var totalRevenue, totalPayments int64
	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM folio_entries WHERE tenant_id = $1 AND type IN ('charge', 'transfer')
		AND created_at::date BETWEEN $2::date AND $3::date
	`, tenantID, startDate, endDate).Scan(&totalRevenue)

	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM payments WHERE tenant_id = $1 AND status = 'completed'
		AND created_at::date BETWEEN $2::date AND $3::date
	`, tenantID, startDate, endDate).Scan(&totalPayments)

	var roomNightsSold int
	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			LEAST(check_out, $3::date) - GREATEST(check_in, $2::date)
		), 0)
		FROM reservations WHERE tenant_id = $1 AND status IN ('checked_in', 'checked_out')
		  AND check_in <= $3::date AND check_out > $2::date
	`, tenantID, startDate, endDate).Scan(&roomNightsSold)

	outstandingBal := totalRevenue - totalPayments

	var adr, revpar int64
	if roomNightsSold > 0 {
		adr = totalRevenue / int64(roomNightsSold)
	}
	if totalRooms > 0 {
		revpar = totalRevenue / int64(totalRooms)
	}

	httputil.JSON(w, http.StatusOK, RevenueReport{
		StartDate:      startDate,
		EndDate:        endDate,
		TotalRevenue:   totalRevenue,
		AverageDaily:   adr,
		RevPAR:         revpar,
		TotalPayments:  totalPayments,
		OutstandingBal: outstandingBal,
		Currency:       "DOP",
	})
}

func (h *ReportHandler) GuestStats(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	var totalGuests int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM guests WHERE tenant_id = $1`, tenantID).Scan(&totalGuests)

	var newGuests int
	h.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM guests g
		WHERE g.tenant_id = $1
		  AND (SELECT COUNT(*) FROM reservations res WHERE res.guest_id = g.id AND res.tenant_id = g.tenant_id) = 1
	`, tenantID).Scan(&newGuests)

	returningGuests := totalGuests - newGuests
	if returningGuests < 0 {
		returningGuests = 0
	}

	var totalStays, totalNights, totalSpend int64
	h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(total_cents), 0)
		FROM reservations WHERE tenant_id = $1
	`, tenantID).Scan(&totalStays, &totalSpend)

	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (check_out - check_in)) / 86400), 0)
		FROM reservations WHERE tenant_id = $1 AND check_out > check_in
	`, tenantID).Scan(&totalNights)

	var avgStay float64
	var avgSpend int64
	if totalStays > 0 {
		avgStay = float64(totalNights) / float64(totalStays)
		avgSpend = totalSpend / totalStays
	}

	countryRows, err := h.pool.Query(ctx, `
		SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as cnt
		FROM guests WHERE tenant_id = $1
		GROUP BY country ORDER BY cnt DESC LIMIT 5
	`, tenantID)
	var countries []CountryStat
	if err == nil {
		defer countryRows.Close()
		for countryRows.Next() {
			var c CountryStat
			if countryRows.Scan(&c.Country, &c.Count) == nil {
				countries = append(countries, c)
			}
		}
	}
	if countries == nil {
		countries = []CountryStat{}
	}

	httputil.JSON(w, http.StatusOK, GuestStats{
		TotalGuests:     totalGuests,
		NewGuests:       newGuests,
		ReturningGuests: returningGuests,
		AverageStay:     avgStay,
		AverageSpend:    avgSpend,
		TopCountries:    countries,
		Currency:        "DOP",
	})
}

func (h *ReportHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()
	today := currentDate()

	var totalRooms, occupied, totalReservations, activeGuests, pendingTasks, openMaintenance int

	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM rooms WHERE tenant_id = $1`, tenantID).Scan(&totalRooms)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM reservations WHERE tenant_id = $1 AND status = 'checked_in'`, tenantID).Scan(&occupied)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM reservations WHERE tenant_id = $1 AND status IN ('confirmed', 'pending', 'checked_in')`, tenantID).Scan(&totalReservations)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT guest_id) FROM reservations WHERE tenant_id = $1 AND status = 'checked_in' AND guest_id != ''`, tenantID).Scan(&activeGuests)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM housekeeping_tasks WHERE tenant_id = $1 AND status IN ('pending', 'in_progress')`, tenantID).Scan(&pendingTasks)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM maintenance_requests WHERE tenant_id = $1 AND status IN ('open', 'in_progress')`, tenantID).Scan(&openMaintenance)

	var occupancyRate float64
	if totalRooms > 0 {
		occupancyRate = float64(occupied) / float64(totalRooms) * 100
	}

	var todayRevenue, monthRevenue int64
	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0) FROM folio_entries
		WHERE tenant_id = $1 AND type IN ('charge', 'transfer') AND created_at::date = $2::date
	`, tenantID, today).Scan(&todayRevenue)

	h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0) FROM folio_entries
		WHERE tenant_id = $1 AND type IN ('charge', 'transfer')
		AND created_at >= date_trunc('month', NOW())
	`, tenantID).Scan(&monthRevenue)

	httputil.JSON(w, http.StatusOK, DashboardSummary{
		Date:              today,
		OccupancyRate:     occupancyRate,
		TodayRevenue:      todayRevenue,
		MonthRevenue:      monthRevenue,
		TotalReservations: totalReservations,
		ActiveGuests:      activeGuests,
		PendingTasks:      pendingTasks,
		OpenMaintenance:   openMaintenance,
		Currency:          "DOP",
	})
}
