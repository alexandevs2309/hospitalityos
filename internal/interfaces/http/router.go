package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
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
) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.SetHeader("Content-Type", "application/json"))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.Tenant)
		r.Use(middleware.Auth)

		r.Post("/reservations", reservationHandler.Create)
		r.Post("/reservations/cancel", reservationHandler.Cancel)
		r.Post("/reservations/{id}/check-in", reservationHandler.CheckIn)
		r.Post("/reservations/{id}/check-out", reservationHandler.CheckOut)
		r.Get("/reservations", reservationHandler.List)
		r.Get("/reservations/{id}", reservationHandler.Get)

		r.Post("/guests", guestHandler.Create)
		r.Get("/guests", guestHandler.List)
		r.Get("/guests/{id}", guestHandler.Get)

		r.Post("/rooms", roomHandler.CreateRoom)
		r.Get("/rooms", roomHandler.ListRooms)
		r.Get("/rooms/{id}", roomHandler.GetRoom)
		r.Patch("/rooms/{id}/status", roomHandler.UpdateRoomStatus)

		r.Post("/room-types", roomTypeHandler.Create)
		r.Get("/room-types", roomTypeHandler.List)
		r.Get("/room-types/{id}", roomTypeHandler.Get)

		r.Post("/rates", rateHandler.Create)
		r.Get("/rates", rateHandler.List)

		r.Get("/availability", availabilityHandler.CheckAvailability)
	})

	return r
}
