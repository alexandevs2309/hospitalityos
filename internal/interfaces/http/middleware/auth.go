package middleware

import (
	"context"
	"net/http"
	"strings"
)

const UserKey contextKey = "user_id"

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "" && strings.HasPrefix(auth, "Bearer ") {
			claims := strings.TrimPrefix(auth, "Bearer ")
			ctx := context.WithValue(r.Context(), UserKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		} else {
			ctx := context.WithValue(r.Context(), UserKey, "anonymous")
			next.ServeHTTP(w, r.WithContext(ctx))
		}
	})
}
