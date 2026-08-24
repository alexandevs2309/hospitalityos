package handlers

import (
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/analytics"
	"github.com/hospitalityos/pkg/httputil"
)

type AnalyticsHandler struct {
	pool *pgxpool.Pool
}

func NewAnalyticsHandler(pool *pgxpool.Pool) *AnalyticsHandler {
	return &AnalyticsHandler{pool: pool}
}

type PredictionResponse struct {
	Predictions  []analytics.Prediction `json:"predictions"`
	Confidence   float64                `json:"average_confidence"`
	DataPoints   int                    `json:"data_points_used"`
}

type RevenueForecastResponse struct {
	Forecast analytics.RevenueForecast `json:"forecast"`
}

type InsightsResponse struct {
	BestDay      string  `json:"best_day"`
	WorstDay     string  `json:"worst_day"`
	AverageOccupancy float64 `json:"average_occupancy"`
	SeasonTrend  string  `json:"season_trend"`
	Recommendations []string `json:"recommendations"`
}

func (h *AnalyticsHandler) PredictOccupancy(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	daysAhead := 30
	if d := r.URL.Query().Get("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 && parsed <= 90 {
			daysAhead = parsed
		}
	}

	ctx := r.Context()

	rows, err := h.pool.Query(ctx, `
		SELECT r.date::text, r.occupied, r.total_rooms, r.rate, COALESCE(r.revenue, 0) as revenue
		FROM (
			SELECT res_dates.date,
			       COUNT(DISTINCT res.room_id) as occupied,
			       (SELECT COUNT(*) FROM rooms WHERE tenant_id = $1) as total_rooms,
			       ROUND(COUNT(DISTINCT res.room_id)::numeric / NULLIF((SELECT COUNT(*) FROM rooms WHERE tenant_id = $1), 0) * 100, 2) as rate,
			       sub_rev.revenue
			FROM (
				SELECT DISTINCT check_in::date as date
				FROM reservations
				WHERE tenant_id = $1 AND check_in >= CURRENT_DATE - INTERVAL '90 days'
				UNION
				SELECT DISTINCT generated_date::date as date
				FROM generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, '1 day') as generated_date
			) res_dates
			LEFT JOIN reservations res ON res.tenant_id = $1
				AND res.check_in <= res_dates.date AND res.check_out > res_dates.date
				AND res.status IN ('checked_in', 'checked_out')
			LEFT JOIN (
				SELECT created_at::date as date, SUM(amount_cents) as revenue
				FROM folio_entries
				WHERE tenant_id = $1 AND type IN ('charge', 'transfer')
				AND created_at >= CURRENT_DATE - INTERVAL '90 days'
				GROUP BY created_at::date
			) sub_rev ON sub_rev.date = res_dates.date
			GROUP BY res_dates.date, sub_rev.revenue
			ORDER BY res_dates.date ASC
		) r
	`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch historical data: "+err.Error())
		return
	}
	defer rows.Close()

	var stats []analytics.DailyStats
	for rows.Next() {
		var s analytics.DailyStats
		if err := rows.Scan(&s.Date, &s.Occupied, &s.TotalRooms, &s.Rate, &s.Revenue); err != nil {
			continue
		}
		stats = append(stats, s)
	}

	analytics.SortDailyStats(stats)

	predictor := analytics.NewOccupancyPredictor(stats)
	predictions := predictor.Predict(daysAhead)

	var totalConfidence float64
	for _, p := range predictions {
		totalConfidence += p.Confidence
	}
	avgConfidence := totalConfidence / float64(len(predictions))

	httputil.JSON(w, http.StatusOK, PredictionResponse{
		Predictions: predictions,
		Confidence:  avgConfidence,
		DataPoints:  len(stats),
	})
}

func (h *AnalyticsHandler) ForecastRevenue(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	daysAhead := 30
	if d := r.URL.Query().Get("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 && parsed <= 90 {
			daysAhead = parsed
		}
	}

	ctx := r.Context()

	var avgRate int64
	h.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(amount_cents), 1500000)
		FROM rates WHERE tenant_id = $1
	`, tenantID).Scan(&avgRate)

	rows, err := h.pool.Query(ctx, `
		SELECT res_dates.date::text,
		       COALESCE(COUNT(DISTINCT res.room_id), 0) as occupied,
		       (SELECT COUNT(*) FROM rooms WHERE tenant_id = $1) as total_rooms
		FROM (
			SELECT DISTINCT check_in::date as date
			FROM reservations
			WHERE tenant_id = $1 AND check_in >= CURRENT_DATE - INTERVAL '90 days'
			UNION
			SELECT DISTINCT generated_date::date as date
			FROM generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, '1 day') as generated_date
		) res_dates
		LEFT JOIN reservations res ON res.tenant_id = $1
			AND res.check_in <= res_dates.date AND res.check_out > res_dates.date
			AND res.status IN ('checked_in', 'checked_out')
		GROUP BY res_dates.date
		ORDER BY res_dates.date ASC
	`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed to fetch revenue history: "+err.Error())
		return
	}
	defer rows.Close()

	var stats []analytics.DailyStats
	for rows.Next() {
		var s analytics.DailyStats
		if err := rows.Scan(&s.Date, &s.Occupied, &s.TotalRooms); err != nil {
			continue
		}
		s.Rate = 0
		if s.TotalRooms > 0 {
			s.Rate = float64(s.Occupied) / float64(s.TotalRooms) * 100
		}
		stats = append(stats, s)
	}

	predictor := analytics.NewOccupancyPredictor(stats)
	forecast := predictor.ForecastRevenue(daysAhead, avgRate)

	httputil.JSON(w, http.StatusOK, RevenueForecastResponse{
		Forecast: forecast,
	})
}

func (h *AnalyticsHandler) GetInsights(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	if tenantID == "" {
		httputil.Unauthorized(w, "tenant_id required")
		return
	}

	ctx := r.Context()

	var avgOccupancy float64
	h.pool.QueryRow(ctx, `
		SELECT COALESCE(
			ROUND(COUNT(DISTINCT room_id)::numeric / NULLIF((SELECT COUNT(*) FROM rooms WHERE tenant_id = $1), 0) * 100, 2),
			65.0
		)
		FROM reservations WHERE tenant_id = $1 AND status IN ('checked_in', 'checked_out')
		  AND check_in <= CURRENT_DATE AND check_out > CURRENT_DATE
	`, tenantID).Scan(&avgOccupancy)

	var bestDayData, worstDayData struct {
		Day  string
		Rate float64
	}
	h.pool.QueryRow(ctx, `
		SELECT TO_CHAR(date, 'Day') as day, AVG(rate) as avg_rate
		FROM (
			SELECT check_in::date as date,
			       COUNT(DISTINCT room_id)::numeric / NULLIF((SELECT COUNT(*) FROM rooms WHERE tenant_id = $1), 0) * 100 as rate
			FROM reservations
			WHERE tenant_id = $1 AND status IN ('checked_in', 'checked_out')
			  AND check_in >= CURRENT_DATE - INTERVAL '90 days'
			GROUP BY check_in::date
		) daily
		GROUP BY TO_CHAR(date, 'Day')
		ORDER BY avg_rate DESC LIMIT 1
	`, tenantID).Scan(&bestDayData.Day, &bestDayData.Rate)

	h.pool.QueryRow(ctx, `
		SELECT TO_CHAR(date, 'Day') as day, AVG(rate) as avg_rate
		FROM (
			SELECT check_in::date as date,
			       COUNT(DISTINCT room_id)::numeric / NULLIF((SELECT COUNT(*) FROM rooms WHERE tenant_id = $1), 0) * 100 as rate
			FROM reservations
			WHERE tenant_id = $1 AND status IN ('checked_in', 'checked_out')
			  AND check_in >= CURRENT_DATE - INTERVAL '90 days'
			GROUP BY check_in::date
		) daily
		GROUP BY TO_CHAR(date, 'Day')
		ORDER BY avg_rate ASC LIMIT 1
	`, tenantID).Scan(&worstDayData.Day, &worstDayData.Rate)

	bestDay := bestDayData.Day
	worstDay := worstDayData.Day
	if bestDay == "" {
		bestDay = "N/A"
	}
	if worstDay == "" {
		worstDay = "N/A"
	}

	trend := "stable"
	if avgOccupancy > 75 {
		trend = "increasing"
	} else if avgOccupancy < 50 {
		trend = "decreasing"
	}

	recommendations := []string{}
	if avgOccupancy < 60 {
		recommendations = append(recommendations, "Consider promotional rates to increase occupancy")
		recommendations = append(recommendations, "Review channel manager distribution")
	}
	if avgOccupancy > 85 {
		recommendations = append(recommendations, "High demand period - consider rate optimization")
		recommendations = append(recommendations, "Review minimum stay restrictions")
	}
	recommendations = append(recommendations, "Monitor booking pace daily")

	httputil.JSON(w, http.StatusOK, InsightsResponse{
		BestDay:          bestDay,
		WorstDay:         worstDay,
		AverageOccupancy: avgOccupancy,
		SeasonTrend:      trend,
		Recommendations:  recommendations,
	})
}
