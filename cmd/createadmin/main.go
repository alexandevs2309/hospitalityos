package main

import (
	"context"
	"fmt"
	"os"

	"github.com/hospitalityos/internal/infrastructure/auth"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	hash, err := auth.HashPassword("admin123")
	if err != nil {
		panic(err)
	}

	_, err = pool.Exec(context.Background(),
		`INSERT INTO users (tenant_id, email, password, role, full_name, active)
		 VALUES ($1, $2, $3, 'admin', $4, true)
		 ON CONFLICT (tenant_id, email) DO UPDATE SET password = $3`,
		"eden-hotel", "admin@eden.com", hash, "Admin Eden")
	if err != nil {
		panic(err)
	}
	fmt.Println("OK admin user created")
}
