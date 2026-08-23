package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("FATAL: DATABASE_URL environment variable is required")
	}

	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("connection failed: %v", err)
	}
	defer pool.Close()

	tenantID := "eden-samana"
	start := time.Now()
	end := start.Add(365 * 24 * time.Hour)

	_, err = pool.Exec(context.Background(), `
		INSERT INTO tenants (id, name, slug, timezone, currency)
		VALUES ($1, 'Edén Hotel Santa Bárbara Samaná', 'eden-hotel-samana', 'America/Santo_Domingo', 'DOP')
		ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
	`, tenantID)
	if err != nil {
		log.Fatalf("insert tenant: %v", err)
	}
	fmt.Println("OK  Edén Hotel Santa Bárbara Samaná (DOP)")

	type roomType struct {
		id       string
		name     string
		capacity int
		price    int64
	}
	roomTypes := []roomType{
		{"rt-estandar", "Habitación Estándar", 2, 250000},
		{"rt-superior", "Habitación Superior Vista Mar", 2, 350000},
		{"rt-deluxe", "Habitación Deluxe", 3, 450000},
		{"rt-suite", "Suite Junior", 3, 650000},
		{"rt-presidencial", "Suite Presidencial", 4, 950000},
	}

	for _, rt := range roomTypes {
		_, err = pool.Exec(context.Background(), `
			INSERT INTO room_types (id, tenant_id, name, capacity, amenities)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
		`, rt.id, tenantID, rt.name, rt.capacity, `["wifi", "tv", "aire acondicionado"]`)
		if err != nil {
			log.Fatalf("insert room_type %s: %v", rt.name, err)
		}

		rateID := "rate-" + rt.id
		_, err = pool.Exec(context.Background(), `
			INSERT INTO rates (id, tenant_id, name, amount_cents, currency, start_date, end_date)
			VALUES ($1, $2, $3, $4, 'DOP', $5, $6)
			ON CONFLICT (id) DO NOTHING
		`, rateID, tenantID, rt.name, rt.price, start, end)
		if err != nil {
			log.Fatalf("insert rate for %s: %v", rt.name, err)
		}

		fmt.Printf("OK  %s — DOP %d/noche\n", rt.name, rt.price)
	}

	type room struct {
		id     string
		rtID   string
		number string
		floor  string
	}
	rooms := []room{
		{"rm-101", "rt-estandar", "101", "1"},
		{"rm-102", "rt-estandar", "102", "1"},
		{"rm-103", "rt-estandar", "103", "1"},
		{"rm-104", "rt-estandar", "104", "1"},
		{"rm-105", "rt-superior", "105", "1"},
		{"rm-106", "rt-superior", "106", "1"},
		{"rm-201", "rt-estandar", "201", "2"},
		{"rm-202", "rt-estandar", "202", "2"},
		{"rm-203", "rt-superior", "203", "2"},
		{"rm-204", "rt-superior", "204", "2"},
		{"rm-205", "rt-deluxe", "205", "2"},
		{"rm-301", "rt-deluxe", "301", "3"},
		{"rm-302", "rt-deluxe", "302", "3"},
		{"rm-303", "rt-suite", "303", "3"},
		{"rm-304", "rt-suite", "304", "3"},
		{"rm-305", "rt-presidencial", "305", "3"},
	}

	for _, rm := range rooms {
		_, err = pool.Exec(context.Background(), `
			INSERT INTO rooms (id, tenant_id, room_type_id, number, floor)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id) DO NOTHING
		`, rm.id, tenantID, rm.rtID, rm.number, rm.floor)
		if err != nil {
			log.Fatalf("insert room %s: %v", rm.number, err)
		}
	}
	fmt.Printf("OK  %d habitaciones\n", len(rooms))

	type sampleGuest struct {
		id        string
		email     string
		phone     string
		firstName string
		lastName  string
	}
	guests := []sampleGuest{
		{"guest-jperez", "juan.perez@email.com", "+18091234567", "Juan", "Pérez"},
		{"guest-mrodriguez", "maria.rodriguez@email.com", "+18099876543", "María", "Rodríguez"},
		{"guest-rgarcia", "roberto.garcia@email.com", "+18095551111", "Roberto", "García"},
		{"guest-lmartinez", "laura.martinez@email.com", "+18094442222", "Laura", "Martínez"},
	}

	for _, g := range guests {
		_, err = pool.Exec(context.Background(), `
			INSERT INTO guests (id, tenant_id, email, phone, first_name, last_name)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (id) DO NOTHING
		`, g.id, tenantID, g.email, g.phone, g.firstName, g.lastName)
		if err != nil {
			log.Fatalf("insert guest %s: %v", g.email, err)
		}
	}
	fmt.Printf("OK  %d huéspedes de muestra\n", len(guests))

	fmt.Println("\n✅ Hotel listo. 5 tipos de habitación, 16 habitaciones, tarifas en DOP.")
}
