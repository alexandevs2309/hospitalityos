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
	rateSeasonHandler *handlers.RateSeasonHandler,
	guestProfileHandler *handlers.GuestProfileHandler,
	housekeepingHandler *handlers.HousekeepingHandler,
	paymentHandler *handlers.PaymentHandler,
	staffHandler *handlers.StaffHandler,
	maintenanceHandler *handlers.MaintenanceHandler,
	reportHandler *handlers.ReportHandler,
	whatsappHandler *handlers.WhatsAppHandler,
	offlineHandler *handlers.OfflineHandler,
	i18nHandler *handlers.I18nHandler,
	paymentGatewayHandler *handlers.PaymentGatewayHandler,
	channelManagerHandler *handlers.ChannelManagerHandler,
	pool *pgxpool.Pool,
) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)
	r.Use(chimw.SetHeader("Content-Type", "application/json"))
	r.Use(chimw.Throttle(100))

	r.Use(middleware.I18n)

	r.Get("/health", observability.HealthHandler(pool))
	r.Get("/metrics", observability.MetricsHandler())

	r.Post("/auth/login", authHandler.Login)
	r.Post("/auth/refresh", authHandler.Refresh)
	r.Post("/auth/logout", authHandler.Logout)
	r.Post("/auth/seed-admin", authHandler.SeedAdmin)

	r.Route("/webhooks", func(r chi.Router) {
		r.Get("/whatsapp", whatsappHandler.VerifyWebhook)
		r.Post("/whatsapp", whatsappHandler.HandleWebhook)
		r.Post("/stripe", paymentGatewayHandler.HandleWebhook)
	})

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

			r.Get("/rate-seasons", rateSeasonHandler.List)
			r.Post("/rate-seasons", rateSeasonHandler.Create)
			r.Delete("/rate-seasons/{id}", rateSeasonHandler.Delete)

			r.Get("/guests/{id}/profile", guestProfileHandler.GetProfile)
			r.Post("/guests/{id}/preferences", guestProfileHandler.SetPreference)
			r.Post("/guests/{id}/tags", guestProfileHandler.AddTag)
			r.Delete("/guests/{id}/tags/{tag}", guestProfileHandler.RemoveTag)

			r.Get("/housekeeping/tasks", housekeepingHandler.ListTasks)
			r.Post("/housekeeping/tasks", housekeepingHandler.CreateTask)
			r.Patch("/housekeeping/tasks/{id}/status", housekeepingHandler.UpdateStatus)

			r.Post("/payments", paymentHandler.Create)
			r.Get("/payments", paymentHandler.List)
			r.Get("/payments/{id}/receipt", paymentHandler.GetReceipt)

			r.Get("/staff", staffHandler.List)
			r.Post("/staff", staffHandler.Create)
			r.Patch("/staff/{id}/role", staffHandler.UpdateRole)

			r.Get("/maintenance", maintenanceHandler.List)
			r.Post("/maintenance", maintenanceHandler.Create)
			r.Patch("/maintenance/{id}/status", maintenanceHandler.UpdateStatus)

			r.Get("/reports/dashboard", reportHandler.Dashboard)
			r.Get("/reports/occupancy", reportHandler.Occupancy)
			r.Get("/reports/revenue", reportHandler.Revenue)
			r.Get("/reports/guest-stats", reportHandler.GuestStats)

			r.Post("/whatsapp/send", whatsappHandler.SendMessage)
			r.Get("/whatsapp/messages", whatsappHandler.ListMessages)

			r.Post("/offline/sync/push", offlineHandler.Push)
			r.Get("/offline/sync/pull", offlineHandler.Pull)
			r.Post("/offline/sync/ack", offlineHandler.Ack)
			r.Get("/offline/bootstrap", offlineHandler.Bootstrap)

			r.Get("/channels", channelManagerHandler.ListChannels)
			r.Post("/channels", channelManagerHandler.ConfigureChannel)
			r.Post("/channels/sync/rates", channelManagerHandler.SyncRates)
			r.Post("/channels/sync/availability", channelManagerHandler.SyncAvailability)
			r.Get("/channels/pull/reservations", channelManagerHandler.PullReservations)
			r.Get("/channels/sync/log", channelManagerHandler.SyncLog)

			r.Get("/i18n/translations", i18nHandler.GetTranslations)
			r.Get("/i18n/languages", i18nHandler.GetLanguages)

			r.Post("/payments/intent", paymentGatewayHandler.CreatePaymentIntent)
			r.Post("/payments/confirm", paymentGatewayHandler.ConfirmPayment)
			r.Post("/payments/refund", paymentGatewayHandler.CreateRefund)
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
