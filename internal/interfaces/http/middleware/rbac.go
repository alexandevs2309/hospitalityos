package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/hospitalityos/internal/infrastructure/auth"
)

func writeForbidden(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]string{
			"code":    "FORBIDDEN",
			"message": message,
		},
	})
}

func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(ClaimsKey).(*auth.Claims)
			if !ok || claims == nil {
				writeAuthError(w, http.StatusUnauthorized, "authentication required")
				return
			}
			allowed := false
			for _, role := range roles {
				if claims.Role == role {
					allowed = true
					break
				}
			}
			if !allowed {
				writeForbidden(w, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return RequireRole("admin")(next)
}

func RequireManagerOrAdmin(next http.Handler) http.Handler {
	return RequireRole("admin", "manager")(next)
}

func RequireFrontDesk(next http.Handler) http.Handler {
	return RequireRole("admin", "manager", "front_desk")(next)
}

func RequireAnyStaff(next http.Handler) http.Handler {
	return RequireRole("admin", "manager", "front_desk", "housekeeping", "maintenance", "read_only")(next)
}
