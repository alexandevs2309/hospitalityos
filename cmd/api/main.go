package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/availability"
	"github.com/hospitalityos/internal/application/reservation"
	guesta "github.com/hospitalityos/internal/application/guest"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
	"github.com/hospitalityos/internal/infrastructure/observability"
	"github.com/hospitalityos/internal/infrastructure/postgres"
	httplib "github.com/hospitalityos/internal/interfaces/http"
	"github.com/hospitalityos/internal/interfaces/http/handlers"
	"github.com/hospitalityos/pkg/es"
)

func main() {
	logger := observability.NewLogger()
	slog.SetDefault(logger)

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("FATAL: DATABASE_URL environment variable is required")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is required")
	}

	pool := setupDatabase(connStr)
	defer pool.Close()

	runMigrations(pool)

	var store es.EventStore
	store = eventstore.NewPGStore(pool)
	slog.Info("event store: PostgreSQL")

	reservationRepo := postgres.NewReservationRepository(pool, store)
	createResHandler := reservation.NewCreateReservationHandler(reservationRepo)
	cancelResHandler := reservation.NewCancelReservationHandler(reservationRepo)
	availEngine := availability.NewEngine(pool)
	reservationHandler := handlers.NewReservationHandler(createResHandler, cancelResHandler, availEngine, pool)

	guestRepo := postgres.NewGuestRepository(pool, store)
	createGuestHandler := guesta.NewCreateGuestHandler(guestRepo)
	guestHandler := handlers.NewGuestHandler(createGuestHandler, pool)

	roomHandler := handlers.NewRoomHandler(pool)
	roomTypeHandler := handlers.NewRoomTypeHandler(pool)
	rateHandler := handlers.NewRateHandler(pool)
	availabilityHandler := handlers.NewAvailabilityHandler(pool)
	authHandler := handlers.NewAuthHandler(pool)
	frontDeskHandler := handlers.NewFrontDeskHandler(pool)
	folioHandler := handlers.NewFolioHandler(pool)
	nightAuditHandler := handlers.NewNightAuditHandler(pool)
	rateSeasonHandler := handlers.NewRateSeasonHandler(pool)
	guestProfileHandler := handlers.NewGuestProfileHandler(pool)
	housekeepingHandler := handlers.NewHousekeepingHandler(pool)
	paymentHandler := handlers.NewPaymentHandler(pool)
	staffHandler := handlers.NewStaffHandler(pool)
	maintenanceHandler := handlers.NewMaintenanceHandler(pool)
	reportHandler := handlers.NewReportHandler(pool)
	whatsappHandler := handlers.NewWhatsAppHandler(pool, nil)
	offlineHandler := handlers.NewOfflineHandler(pool)
	i18nHandler := handlers.NewI18nHandler()
	paymentGatewayHandler := handlers.NewPaymentGatewayHandler(pool, nil)
	channelManagerHandler := handlers.NewChannelManagerHandler(pool)
	fiscalHandler := handlers.NewFiscalHandler(pool, "")
	analyticsHandler := handlers.NewAnalyticsHandler(pool)

	router := httplib.NewRouter(
		reservationHandler,
		guestHandler,
		roomHandler,
		roomTypeHandler,
		rateHandler,
		availabilityHandler,
		authHandler,
		frontDeskHandler,
		folioHandler,
		nightAuditHandler,
		rateSeasonHandler,
		guestProfileHandler,
		housekeepingHandler,
		paymentHandler,
		staffHandler,
		maintenanceHandler,
		reportHandler,
		whatsappHandler,
		offlineHandler,
		i18nHandler,
		paymentGatewayHandler,
		channelManagerHandler,
		fiscalHandler,
		analyticsHandler,
		pool,
	)

	srv := &http.Server{
		Addr:         ":8081",
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("Hospitality OS API starting", "addr", ":8081")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-done
	slog.Info("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
		os.Exit(1)
	}
	slog.Info("server stopped")
}

func runMigrations(pool *pgxpool.Pool) {
	dir := "internal/infrastructure/postgres/migrations"
	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		log.Fatalf("failed to read migrations: %v", err)
	}
	sort.Strings(files)

	pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)

	for _, f := range files {
		name := filepath.Base(f)
		var exists int
		pool.QueryRow(context.Background(), "SELECT 1 FROM schema_migrations WHERE filename = $1", name).Scan(&exists)
		if exists == 1 {
			continue
		}
		sql, err := os.ReadFile(f)
		if err != nil {
			log.Fatalf("failed to read %s: %v", name, err)
		}
		for _, stmt := range splitSQLStatements(string(sql)) {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := pool.Exec(context.Background(), stmt); err != nil {
				log.Fatalf("migration %s failed: %v\nSQL: %s", name, err, stmt)
			}
		}
		pool.Exec(context.Background(), "INSERT INTO schema_migrations (filename) VALUES ($1)", name)
		slog.Info("migration applied", "file", name)
	}
}

func setupDatabase(connStr string) *pgxpool.Pool {
	pool, err := postgres.NewPool(context.Background(), connStr)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	return pool
}

func splitSQLStatements(sql string) []string {
	var statements []string
	var current strings.Builder
	inDollarQuote := false

	for i := 0; i < len(sql); i++ {
		ch := sql[i]

		if inDollarQuote {
			current.WriteByte(ch)
			if ch == '$' && i+1 < len(sql) && sql[i+1] == '$' {
				inDollarQuote = false
				current.WriteByte('$')
				i++
			}
			continue
		}

		if ch == '$' {
			current.WriteByte(ch)
			if i+1 < len(sql) && sql[i+1] == '$' {
				inDollarQuote = true
				current.WriteByte('$')
				i++
			}
			continue
		}

		if ch == '-' && i+1 < len(sql) && sql[i+1] == '-' {
			for i < len(sql) && sql[i] != '\n' {
				i++
			}
			continue
		}

		if ch == ';' {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			continue
		}

		current.WriteByte(ch)
	}

	stmt := strings.TrimSpace(current.String())
	if stmt != "" {
		statements = append(statements, stmt)
	}

	return statements
}
