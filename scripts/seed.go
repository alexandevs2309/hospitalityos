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
		connStr = "postgres://dev:dev@localhost:5432/hospitality?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("connection failed: %v", err)
	}
	defer pool.Close()

	tenantID := "seed-tenant-1"
	guestID := "seed-guest-1"
	roomTypeID := "seed-roomtype-1"
	roomID := "seed-room-101"
	rateID := "seed-rate-1"

	_, err = pool.Exec(context.Background(), `
		INSERT INTO tenants (id, name, slug, timezone, currency)
		VALUES ($1, 'Hotel Paraíso', 'hotel-paraiso', 'America/Mexico_City', 'MXN')
		ON CONFLICT (id) DO NOTHING
	`, tenantID)
	if err != nil {
		log.Fatalf("insert tenant: %v", err)
	}
	fmt.Println("OK  tenant")

	_, err = pool.Exec(context.Background(), `
		INSERT INTO guests (id, tenant_id, email, phone, first_name, last_name)
		VALUES ($1, $2, 'juan@example.com', '+521234567890', 'Juan', 'Pérez')
		ON CONFLICT (id) DO NOTHING
	`, guestID, tenantID)
	if err != nil {
		log.Fatalf("insert guest: %v", err)
	}
	fmt.Println("OK  guest")

	_, err = pool.Exec(context.Background(), `
		INSERT INTO room_types (id, tenant_id, name, capacity)
		VALUES ($1, $2, 'Habitación Doble', 2)
		ON CONFLICT (id) DO NOTHING
	`, roomTypeID, tenantID)
	if err != nil {
		log.Fatalf("insert room_type: %v", err)
	}
	fmt.Println("OK  room_type")

	_, err = pool.Exec(context.Background(), `
		INSERT INTO rooms (id, tenant_id, room_type_id, number, floor)
		VALUES ($1, $2, $3, '101', '1')
		ON CONFLICT (id) DO NOTHING
	`, roomID, tenantID, roomTypeID)
	if err != nil {
		log.Fatalf("insert room: %v", err)
	}
	fmt.Println("OK  room")

	now := time.Now()
	_, err = pool.Exec(context.Background(), `
		INSERT INTO rates (id, tenant_id, name, amount_cents, currency, start_date, end_date)
		VALUES ($1, $2, 'Tarifa Estándar', 120000, 'MXN', $3, $4)
		ON CONFLICT (id) DO NOTHING
	`, rateID, tenantID, now, now.Add(365*24*time.Hour))
	if err != nil {
		log.Fatalf("insert rate: %v", err)
	}
	fmt.Println("OK  rate")

	fmt.Println("Seed completed")
}
