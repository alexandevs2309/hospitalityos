package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/internal/application/reservation"
	guesta "github.com/hospitalityos/internal/application/guest"
	"github.com/hospitalityos/internal/infrastructure/eventstore"
	"github.com/hospitalityos/internal/infrastructure/postgres"
	httplib "github.com/hospitalityos/internal/interfaces/http"
	"github.com/hospitalityos/internal/interfaces/http/handlers"
	"github.com/hospitalityos/pkg/es"
)

func main() {
	dbPool := setupDatabase()
	defer dbPool.Close()

	runMigrations(dbPool)

	var store es.EventStore
	if os.Getenv("DATABASE_URL") != "" {
		store = eventstore.NewPGStore(dbPool)
		log.Printf("event store: PostgreSQL")
	} else {
		store = eventstore.NewInMemoryStore()
		log.Printf("event store: in-memory (DATABASE_URL not set)")
	}

	reservationRepo := postgres.NewReservationRepository(dbPool, store)
	createResHandler := reservation.NewCreateReservationHandler(reservationRepo)
	cancelResHandler := reservation.NewCancelReservationHandler(reservationRepo)
	reservationHandler := handlers.NewReservationHandler(createResHandler, cancelResHandler, dbPool)

	guestRepo := postgres.NewGuestRepository(dbPool, store)
	createGuestHandler := guesta.NewCreateGuestHandler(guestRepo)
	guestHandler := handlers.NewGuestHandler(createGuestHandler, dbPool)

	roomHandler := handlers.NewRoomHandler(dbPool)
	roomTypeHandler := handlers.NewRoomTypeHandler(dbPool)
	rateHandler := handlers.NewRateHandler(dbPool)
	availabilityHandler := handlers.NewAvailabilityHandler(dbPool)

	router := httplib.NewRouter(
		reservationHandler,
		guestHandler,
		roomHandler,
		roomTypeHandler,
		rateHandler,
		availabilityHandler,
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
		log.Printf("Hospitality OS API starting on :8081")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-done
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown error: %v", err)
	}
	log.Println("server stopped")
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
		for _, stmt := range strings.Split(string(sql), ";") {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := pool.Exec(context.Background(), stmt); err != nil {
				log.Fatalf("migration %s failed: %v\nSQL: %s", name, err, stmt)
			}
		}
		pool.Exec(context.Background(), "INSERT INTO schema_migrations (filename) VALUES ($1)", name)
		log.Printf("migration applied: %s", name)
	}
}

func setupDatabase() *pgxpool.Pool {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://dev:dev@localhost:5432/hospitality?sslmode=disable"
	}
	pool, err := postgres.NewPool(context.Background(), connStr)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	return pool
}
