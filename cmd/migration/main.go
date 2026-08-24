package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func splitStatements(sql string) []string {
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

	migrationsDir := "internal/infrastructure/postgres/migrations"
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		log.Fatalf("failed to read migrations: %v", err)
	}
	sort.Strings(files)

	_, err = pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		log.Fatalf("failed to create migrations table: %v", err)
	}

	for _, f := range files {
		filename := filepath.Base(f)
		var exists int
		pool.QueryRow(context.Background(), "SELECT 1 FROM schema_migrations WHERE filename = $1", filename).Scan(&exists)
		if exists == 1 {
			fmt.Printf("SKIP  %s (already applied)\n", filename)
			continue
		}

		sql, err := os.ReadFile(f)
		if err != nil {
			log.Fatalf("failed to read %s: %v", filename, err)
		}

		statements := splitStatements(string(sql))
		for _, stmt := range statements {
			if _, err := pool.Exec(context.Background(), stmt); err != nil {
				log.Fatalf("migration %s failed: %v\nSQL: %s", filename, err, stmt)
			}
		}

		_, err = pool.Exec(context.Background(), "INSERT INTO schema_migrations (filename) VALUES ($1)", filename)
		if err != nil {
			log.Fatalf("failed to record migration %s: %v", filename, err)
		}
		fmt.Printf("OK    %s\n", filename)
	}
}
