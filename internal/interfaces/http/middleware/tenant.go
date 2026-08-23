package middleware

import (
	"context"
	"net/http"

	"github.com/hospitalityos/internal/infrastructure/auth"
	"github.com/hospitalityos/pkg/httputil"
)

func Tenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(ClaimsKey).(*auth.Claims)
		if ok && claims.TenantID != "" {
			ctx := context.WithValue(r.Context(), httputil.TenantIDKey, claims.TenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		httputil.Unauthorized(w, "authentication required")
	})
}

func TenantFromContext(ctx context.Context) string {
	id, _ := ctx.Value(httputil.TenantIDKey).(string)
	return id
}
