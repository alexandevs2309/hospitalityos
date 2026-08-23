package analytics

import (
	"math"
	"sort"
	"time"
)

type OccupancyPredictor struct {
	historicalData []DailyStats
}

type DailyStats struct {
	Date        string  `json:"date"`
	Occupied    int     `json:"occupied"`
	TotalRooms  int     `json:"total_rooms"`
	Rate        float64 `json:"occupancy_rate"`
	Revenue     int64   `json:"revenue_cents"`
}

type Prediction struct {
	Date          string  `json:"date"`
	PredictedRate float64 `json:"predicted_occupancy_rate"`
	Confidence    float64 `json:"confidence"`
	LowerBound    float64 `json:"lower_bound"`
	UpperBound    float64 `json:"upper_bound"`
}

type RevenueForecast struct {
	StartDate     string `json:"start_date"`
	EndDate       string `json:"end_date"`
	DailyForecast []DailyForecast `json:"daily_forecast"`
	TotalRevenue  int64  `json:"total_revenue_cents"`
	AverageDaily  int64  `json:"average_daily_revenue_cents"`
	Currency      string `json:"currency"`
}

type DailyForecast struct {
	Date           string `json:"date"`
	Revenue        int64  `json:"revenue_cents"`
	OccupancyRate  float64 `json:"occupancy_rate"`
	ADR            int64  `json:"adr_cents"`
}

func NewOccupancyPredictor(data []DailyStats) *OccupancyPredictor {
	return &OccupancyPredictor{historicalData: data}
}

func (p *OccupancyPredictor) Predict(daysAhead int) []Prediction {
	if len(p.historicalData) < 7 {
		return p.simplePredict(daysAhead)
	}

	rates := make([]float64, len(p.historicalData))
	for i, d := range p.historicalData {
		rates[i] = d.Rate
	}

	avg := average(rates)
	stddev := standardDeviation(rates)

	weeklyPattern := p.calculateWeeklyPattern()

	predictions := make([]Prediction, daysAhead)
	lastDate := time.Now()

	for i := 0; i < daysAhead; i++ {
		futureDate := lastDate.AddDate(0, 0, i+1)
		weekday := int(futureDate.Weekday())

		weeklyFactor := 1.0
		if weekday < len(weeklyPattern) {
			weeklyFactor = weeklyPattern[weekday]
		}

		trendFactor := 1.0 + (float64(i) * 0.001)

		predicted := avg * weeklyFactor * trendFactor
		predicted = math.Max(0, math.Min(100, predicted))

		confidence := math.Max(0.5, 1.0-float64(i)*0.02)

		predictions[i] = Prediction{
			Date:          futureDate.Format("2006-01-02"),
			PredictedRate: math.Round(predicted*100) / 100,
			Confidence:    math.Round(confidence*100) / 100,
			LowerBound:    math.Max(0, math.Round((predicted-stddev*1.5)*100)/100),
			UpperBound:    math.Min(100, math.Round((predicted+stddev*1.5)*100)/100),
		}
	}

	return predictions
}

func (p *OccupancyPredictor) calculateWeeklyPattern() []float64 {
	weekdayData := make(map[int][]float64)

	for d := range p.historicalData {
		t, err := time.Parse("2006-01-02", p.historicalData[d].Date)
		if err != nil {
			continue
		}
		weekday := int(t.Weekday())
		weekdayData[weekday] = append(weekdayData[weekday], p.historicalData[d].Rate)
	}

	overallAvg := 0.0
	count := 0
	for _, rates := range weekdayData {
		for _, r := range rates {
			overallAvg += r
			count++
		}
	}
	if count > 0 {
		overallAvg /= float64(count)
	}

	pattern := make([]float64, 7)
	for day := 0; day < 7; day++ {
		if rates, ok := weekdayData[day]; ok && len(rates) > 0 {
			dayAvg := average(rates)
			if overallAvg > 0 {
				pattern[day] = dayAvg / overallAvg
			} else {
				pattern[day] = 1.0
			}
		} else {
			pattern[day] = 1.0
		}
	}

	return pattern
}

func (p *OccupancyPredictor) simplePredict(daysAhead int) []Prediction {
	avg := 0.0
	if len(p.historicalData) > 0 {
		for _, d := range p.historicalData {
			avg += d.Rate
		}
		avg /= float64(len(p.historicalData))
	} else {
		avg = 65.0
	}

	predictions := make([]Prediction, daysAhead)
	for i := 0; i < daysAhead; i++ {
		futureDate := time.Now().AddDate(0, 0, i+1)
		predictions[i] = Prediction{
			Date:          futureDate.Format("2006-01-02"),
			PredictedRate: math.Round(avg*100) / 100,
			Confidence:    0.6,
			LowerBound:    math.Max(0, math.Round((avg-15)*100)/100),
			UpperBound:    math.Min(100, math.Round((avg+15)*100)/100),
		}
	}

	return predictions
}

func (p *OccupancyPredictor) ForecastRevenue(daysAhead int, avgRate int64) RevenueForecast {
	predictions := p.Predict(daysAhead)

	forecast := RevenueForecast{
		StartDate:     predictions[0].Date,
		EndDate:       predictions[len(predictions)-1].Date,
		DailyForecast: make([]DailyForecast, daysAhead),
		Currency:      "DOP",
	}

	var totalRevenue int64
	for i, pred := range predictions {
		estimatedRooms := int(float64(getTotalRooms(p.historicalData)) * pred.PredictedRate / 100)
		dailyRevenue := int64(estimatedRooms) * avgRate

		forecast.DailyForecast[i] = DailyForecast{
			Date:          pred.Date,
			Revenue:       dailyRevenue,
			OccupancyRate: pred.PredictedRate,
			ADR:           avgRate,
		}
		totalRevenue += dailyRevenue
	}

	forecast.TotalRevenue = totalRevenue
	if daysAhead > 0 {
		forecast.AverageDaily = totalRevenue / int64(daysAhead)
	}

	return forecast
}

func average(data []float64) float64 {
	if len(data) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range data {
		sum += v
	}
	return sum / float64(len(data))
}

func standardDeviation(data []float64) float64 {
	if len(data) == 0 {
		return 0
	}
	avg := average(data)
	sumSquares := 0.0
	for _, v := range data {
		diff := v - avg
		sumSquares += diff * diff
	}
	return math.Sqrt(sumSquares / float64(len(data)))
}

func getTotalRooms(data []DailyStats) int {
	if len(data) > 0 {
		return data[0].TotalRooms
	}
	return 16
}

func SortDailyStats(data []DailyStats) {
	sort.Slice(data, func(i, j int) bool {
		return data[i].Date < data[j].Date
	})
}
