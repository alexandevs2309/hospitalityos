package http

import (
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/infrastructure/observability"
	"github.com/hospitalityos/internal/interfaces/http/handlers"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
)

func NewRouter(
	reservationHandler *handlers.ReservationHandler,
	guestHandler *handlers.GuestHandler,
	roomHandler *handlers.RoomHandler,
	roomTypeHandler *handlers.RoomTypeHandler,
	rateHandler *handlers.RateHandler,
	availabilityHandler *handlers.AvailabilityHandler,
	authHandler *handlers.AuthHandler,
	frontDeskHandler *handlers.FrontDeskHandler,
	folioHandler *handlers.FolioHandler,
	nightAuditHandler *handlers.NightAuditHandler,
	pool *pgxpool.Pool,
) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)
	r.Use(chimw.SetHeader("Content-Type", "application/json"))
	r.Use(chimw.Throttle(100))

	r.Get("/health", observability.HealthHandler(pool))
	r.Get("/metrics", observability.MetricsHandler())

	r.Post("/auth/login", authHandler.Login)
	r.Post("/auth/refresh", authHandler.Refresh)
	r.Post("/auth/logout", authHandler.Logout)
	r.Post("/auth/seed-admin", authHandler.SeedAdmin)

	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.Auth)
		r.Use(middleware.Tenant)
		r.Use(middleware.AuditLog(pool))

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAnyStaff)

			r.Post("/reservations", reservationHandler.Create)
			r.Post("/reservations/cancel", reservationHandler.Cancel)
			r.Post("/reservations/{id}/check-in", reservationHandler.CheckIn)
			r.Post("/reservations/{id}/check-out", reservationHandler.CheckOut)
			r.Get("/reservations", reservationHandler.List)
			r.Get("/reservations/{id}", reservationHandler.Get)

			r.Post("/guests", guestHandler.Create)
			r.Get("/guests", guestHandler.List)
			r.Get("/guests/{id}", guestHandler.Get)

			r.Get("/rooms", roomHandler.ListRooms)
			r.Get("/rooms/{id}", roomHandler.GetRoom)

			r.Get("/room-types", roomTypeHandler.List)
			r.Get("/room-types/{id}", roomTypeHandler.Get)

			r.Get("/rates", rateHandler.List)

			r.Get("/availability", availabilityHandler.CheckAvailability)

			r.Get("/frontdesk/today", frontDeskHandler.Today)

			r.Get("/reservations/{id}/folio", folioHandler.GetFolio)
			r.Post("/reservations/{id}/folio/entries", folioHandler.AddEntry)
			r.Post("/reservations/{id}/folio/close", folioHandler.CloseFolio)

			r.Post("/night-audit/run", nightAuditHandler.Run)
			r.Get("/night-audit/history", nightAuditHandler.History)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireFrontDesk)

			r.Post("/rooms", roomHandler.CreateRoom)
			r.Patch("/rooms/{id}/status", roomHandler.UpdateRoomStatus)

			r.Post("/room-types", roomTypeHandler.Create)
			r.Post("/rates", rateHandler.Create)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireManagerOrAdmin)

			r.Delete("/reservations/{id}", reservationHandler.Cancel)
		})
	})

	return r
}
