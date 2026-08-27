package middleware

import (
	"context"
	"net/http"

	"github.com/hospitalityos/pkg/httputil"
)

func PublicTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID := r.Header.Get("X-Tenant-ID")
		if tenantID == "" {
			httputil.BadRequest(w, "X-Tenant-ID header required")
			return
		}
		ctx := context.WithValue(r.Context(), httputil.TenantIDKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
