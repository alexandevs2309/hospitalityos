package httputil

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/hospitalityos/internal/interfaces/http/middleware"
)

type contextKey string

const TenantIDKey contextKey = "tenant_id"

func ExtractTenantID(r *http.Request) string {
	return middleware.TenantFromContext(r.Context())
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

func GetTenantID(ctx context.Context) string {
	if v, ok := ctx.Value(TenantIDKey).(string); ok {
		return v
	}
	return ""
}

func ParseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}
