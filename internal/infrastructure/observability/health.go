package observability

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
	Uptime   string            `json:"uptime"`
}

var startTime = time.Now()

func HealthHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		services := map[string]string{
			"api": "ok",
		}

		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		if pool != nil {
			if err := pool.Ping(ctx); err != nil {
				services["database"] = "error: " + err.Error()
			} else {
				services["database"] = "ok"
			}
		} else {
			services["database"] = "not configured"
		}

		status := "ok"
		for _, v := range services {
			if v != "ok" {
				status = "degraded"
				break
			}
		}

		resp := HealthResponse{
			Status:   status,
			Services: services,
			Uptime:   time.Since(startTime).Round(time.Second).String(),
		}

		w.Header().Set("Content-Type", "application/json")
		if status != "ok" {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		json.NewEncoder(w).Encode(resp)
	}
}

type MetricsResponse struct {
	Uptime       string `json:"uptime"`
	TotalRequests int64 `json:"total_requests"`
}

func MetricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := MetricsResponse{
			Uptime: time.Since(startTime).Round(time.Second).String(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
