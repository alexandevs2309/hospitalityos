package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type RevenueHandler struct {
	pool *pgxpool.Pool
}

func NewRevenueHandler(pool *pgxpool.Pool) *RevenueHandler {
	return &RevenueHandler{pool: pool}
}

type PricingSuggestion struct {
	RoomTypeID     string  `json:"room_type_id"`
	RoomTypeName   string  `json:"room_type_name"`
	Date           string  `json:"date"`
	CurrentPrice   int64   `json:"current_price_cents"`
	SuggestedPrice int64   `json:"suggested_price_cents"`
	Demand         string  `json:"demand"`
	Occupancy      float64 `json:"occupancy_pct"`
	Reason         string  `json:"reason"`
}

func (h *RevenueHandler) GetPricingSuggestions(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	conn, err := h.pool.Acquire(ctx)
	if err != nil {
		httputil.InternalServerError(w, "db failed")
		return
	}
	defer conn.Release()
	conn.Exec(ctx, `SET app.current_tenant = $1`, tenantID)

	daysAhead := 7

	type rtInfo struct {
		ID         string
		Name       string
		BaseCents  int64
		TotalRooms int
	}
	var roomTypes []rtInfo
	rows, _ := conn.Query(ctx,
		`SELECT rt.id::text, rt.name, rt.base_price_cents, COUNT(rm.id)
		 FROM room_types rt
		 LEFT JOIN rooms rm ON rm.room_type_id = rt.id AND rm.tenant_id = rt.tenant_id
		 WHERE rt.tenant_id = $1
		 GROUP BY rt.id, rt.name, rt.base_price_cents`, tenantID)
	defer rows.Close()
	for rows.Next() {
		var rt rtInfo
		rows.Scan(&rt.ID, &rt.Name, &rt.BaseCents, &rt.TotalRooms)
		if rt.TotalRooms == 0 {
			rt.TotalRooms = 1
		}
		roomTypes = append(roomTypes, rt)
	}

	var suggestions []PricingSuggestion
	now := time.Now()

	for i := 0; i < daysAhead; i++ {
		date := now.AddDate(0, 0, i+1)
		dateStr := date.Format("2006-01-02")
		weekday := date.Weekday()

		for _, rt := range roomTypes {
			var booked int
			conn.QueryRow(ctx,
				`SELECT COUNT(*) FROM reservations res
				 JOIN rooms rm ON rm.id = res.room_id AND rm.tenant_id = res.tenant_id
				 WHERE rm.room_type_id = $1 AND res.tenant_id = $2
				 AND res.status IN ('confirmed','checked_in')
				 AND res.check_in <= $3 AND res.check_out > $3`,
				rt.ID, tenantID, dateStr).Scan(&booked)

			occupancy := float64(booked) / float64(rt.TotalRooms)
			seasonMult := getSeasonMultiplier(date)
			weekdayMult := getWeekdayMultiplier(weekday)

			demandRaw := occupancy * 100
			demandLabel := "low"
			if demandRaw > 70 {
				demandLabel = "high"
			} else if demandRaw > 40 {
				demandLabel = "medium"
			}

			suggestedPrice := float64(rt.BaseCents) * seasonMult * weekdayMult

			if demandRaw > 85 {
				suggestedPrice *= 1.2
			} else if demandRaw < 30 {
				suggestedPrice *= 0.9
			}

			suggestedPrice = math.Round(suggestedPrice/1000) * 1000
			priceDiff := suggestedPrice - float64(rt.BaseCents)
			pctDiff := (priceDiff / float64(rt.BaseCents)) * 100

			reason := "Tarifa base"
			if math.Abs(pctDiff) > 5 {
				if pctDiff > 0 {
					reason = "Alta demanda + temporadas"
				} else {
					reason = "Baja demanda"
				}
			} else if math.Abs(pctDiff) > 2 {
				if pctDiff > 0 {
					reason = "Temporada alta / fin de semana"
				} else {
					reason = "Temporada baja"
				}
			}

			suggestions = append(suggestions, PricingSuggestion{
				RoomTypeID:     rt.ID,
				RoomTypeName:   rt.Name,
				Date:           dateStr,
				CurrentPrice:   rt.BaseCents,
				SuggestedPrice: int64(suggestedPrice),
				Demand:         demandLabel,
				Occupancy:      math.Round(occupancy*100) / 100,
				Reason:         reason,
			})
		}
	}

	if suggestions == nil {
		suggestions = []PricingSuggestion{}
	}

	sort.Slice(suggestions, func(i, j int) bool {
		if suggestions[i].Date == suggestions[j].Date {
			return suggestions[i].RoomTypeName < suggestions[j].RoomTypeName
		}
		return suggestions[i].Date < suggestions[j].Date
	})

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"suggestions": suggestions})
}

type RevenueForecast struct {
	Date          string  `json:"date"`
	ExpectedRev   int64   `json:"expected_revenue_cents"`
	OccupancyRate float64 `json:"occupancy_rate"`
}

func (h *RevenueHandler) GetRevenueForecast(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	conn, err := h.pool.Acquire(ctx)
	if err != nil {
		httputil.InternalServerError(w, "db failed")
		return
	}
	defer conn.Release()
	conn.Exec(ctx, `SET app.current_tenant = $1`, tenantID)

	daysAhead := 30
	now := time.Now()
	var forecasts []RevenueForecast

	for i := 0; i < daysAhead; i++ {
		date := now.AddDate(0, 0, i+1)
		dateStr := date.Format("2006-01-02")

		var totalRooms int
		conn.QueryRow(ctx, `SELECT COUNT(*) FROM rooms WHERE tenant_id = $1`, tenantID).Scan(&totalRooms)
		if totalRooms == 0 {
			totalRooms = 1
		}

		var booked int
		conn.QueryRow(ctx,
			`SELECT COUNT(DISTINCT room_id) FROM reservations
			 WHERE tenant_id = $1 AND status IN ('confirmed','checked_in')
			 AND check_in <= $2 AND check_out > $2`,
			tenantID, dateStr).Scan(&booked)

		occupancy := float64(booked) / float64(totalRooms)
		seasonMult := getSeasonMultiplier(date)
		weekdayMult := getWeekdayMultiplier(date.Weekday())

		var avgRate int64
		conn.QueryRow(ctx,
			`SELECT COALESCE(AVG(r.total_cents / NULLIF(EXTRACT(DAY FROM (r.check_out - r.check_in)),0)),0)
			 FROM reservations r WHERE r.tenant_id = $1 AND r.status IN ('confirmed','checked_in')
			 AND r.check_in <= $2 AND r.check_out > $2`,
			tenantID, dateStr).Scan(&avgRate)

		if avgRate == 0 {
			var baseAvg int64
			conn.QueryRow(ctx, `SELECT COALESCE(AVG(base_price_cents),0) FROM room_types WHERE tenant_id = $1`, tenantID).Scan(&baseAvg)
			avgRate = int64(float64(baseAvg) * seasonMult * weekdayMult)
		}

		expectedRev := int64(float64(booked) * float64(avgRate))
		forecasts = append(forecasts, RevenueForecast{
			Date:          dateStr,
			ExpectedRev:   expectedRev,
			OccupancyRate: math.Round(occupancy*10000) / 10000,
		})
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{"forecasts": forecasts})
}

type ApplyPriceRequest struct {
	RoomTypeID    string `json:"room_type_id"`
	Date          string `json:"date"`
	NewPriceCents int64  `json:"new_price_cents"`
}

func (h *RevenueHandler) ApplySeasonPrice(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	var body ApplyPriceRequest
	json.NewDecoder(r.Body).Decode(&body)
	if body.RoomTypeID == "" || body.Date == "" || body.NewPriceCents <= 0 {
		httputil.BadRequest(w, "room_type_id, date, new_price_cents required")
		return
	}

	_, err := h.pool.Exec(ctx,
		`INSERT INTO rate_seasons (tenant_id, room_type_id, start_date, end_date, amount_cents, name)
		 VALUES ($1, $2, $3, $3, $4, $5)
		 ON CONFLICT (tenant_id, room_type_id, start_date) DO UPDATE SET amount_cents = $4`,
		tenantID, body.RoomTypeID, body.Date, body.NewPriceCents, "Dynamic Price")
	if err != nil {
		httputil.InternalServerError(w, "failed to apply price")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  "applied",
		"message": "Precio aplicado",
	})
}

func getSeasonMultiplier(date time.Time) float64 {
	month := date.Month()
	switch month {
	case time.December, time.January, time.February:
		return 1.3
	case time.March, time.April:
		return 1.2
	case time.June, time.July, time.August:
		return 1.15
	case time.November:
		return 1.1
	default:
		return 1.0
	}
}

func getWeekdayMultiplier(weekday time.Weekday) float64 {
	switch weekday {
	case time.Friday, time.Saturday:
		return 1.15
	case time.Sunday:
		return 1.05
	case time.Monday, time.Tuesday:
		return 0.95
	default:
		return 1.0
	}
}
