package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/auth"
)

type auditEntry struct {
	TenantID  string      `json:"tenant_id"`
	ActorID   string      `json:"actor_id"`
	ActorEmail string    `json:"actor_email"`
	Action    string      `json:"action"`
	Entity    string      `json:"entity"`
	EntityID  string      `json:"entity_id"`
	OldValues interface{} `json:"old_values"`
	NewValues interface{} `json:"new_values"`
	IPAddress string      `json:"ip_address"`
	UserAgent string      `json:"user_agent"`
}

func AuditLog(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			body, _ := io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewReader(body))

			rec := &responseRecorder{ResponseWriter: w, statusCode: 200}
			next.ServeHTTP(rec, r)

			claims, _ := r.Context().Value(ClaimsKey).(*auth.Claims)
			tenantID := ""
			actorID := ""
			actorEmail := ""
			if claims != nil {
				tenantID = claims.TenantID
				actorID = claims.UserID
				actorEmail = claims.Email
			}

			action := mapMethodToAction(r.Method)
			entity, entityID := extractEntityAndID(r.URL.Path)

			entry := auditEntry{
				TenantID:   tenantID,
				ActorID:    actorID,
				ActorEmail: actorEmail,
				Action:     action,
				Entity:     entity,
				EntityID:   entityID,
				IPAddress:  r.RemoteAddr,
				UserAgent:  r.UserAgent(),
			}

			var newValues interface{}
			if len(body) > 0 && len(body) < 10000 {
				var parsed interface{}
				if json.Unmarshal(body, &parsed) == nil {
					newValues = parsed
				}
			}
			entry.NewValues = newValues

			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				pool.Exec(ctx, `
					INSERT INTO audit_logs (tenant_id, actor_id, actor_email, action, entity, entity_id, new_values, ip_address, user_agent)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
				`, entry.TenantID, entry.ActorID, entry.ActorEmail, entry.Action, entry.Entity, entry.EntityID, entry.NewValues, entry.IPAddress, entry.UserAgent)
			}()
		})
	}
}

func mapMethodToAction(method string) string {
	switch method {
	case http.MethodPost:
		return "create"
	case http.MethodPut, http.MethodPatch:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return method
	}
}

func extractEntityAndID(path string) (string, string) {
	path = strings.TrimPrefix(path, "/v1/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 {
		return "unknown", ""
	}
	entity := parts[0]
	entityID := ""
	if len(parts) >= 2 {
		entityID = parts[1]
	}
	return entity, entityID
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}
