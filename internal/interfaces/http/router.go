package http

import (
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/hospitalityos/internal/interfaces/http/handlers"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
)

func NewRouter(reservationHandler *handlers.ReservationHandler, guestHandler *handlers.GuestHandler) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.SetHeader("Content-Type", "application/json"))

	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.Tenant)
		r.Use(middleware.Auth)

		r.Post("/reservations", reservationHandler.Create)
		r.Post("/reservations/cancel", reservationHandler.Cancel)
		r.Post("/guests", guestHandler.Create)
	})

	return r
}
