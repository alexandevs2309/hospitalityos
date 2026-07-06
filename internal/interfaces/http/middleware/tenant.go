package middleware

import (
	"context"
	"net/http"
)

type contextKey string

const TenantKey contextKey = "tenant_id"

func Tenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID := r.Header.Get("X-Tenant-ID")
		if tenantID == "" {
			http.Error(w, "X-Tenant-ID header required", http.StatusBadRequest)
			return
		}
		ctx := context.WithValue(r.Context(), TenantKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func TenantFromContext(ctx context.Context) string {
	id, _ := ctx.Value(TenantKey).(string)
	return id
}
