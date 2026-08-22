package eventstore

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hospitalityos/pkg/es"
)

// ErrConcurrencyConflict is returned when saving events would violate the
// UNIQUE(stream_id, version) constraint, i.e. another writer appended to the
// stream concurrently.
var ErrConcurrencyConflict = errors.New("eventstore: concurrency conflict")

const (
	pgUniqueViolationCode = "23505"

	createEventsTableSQL = `
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    stream_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stream_id, version)
)`

	createStreamIndexSQL = `
CREATE INDEX IF NOT EXISTS idx_events_stream_id ON events(stream_id)`
)

type PGStore struct {
	pool *pgxpool.Pool

	mu    sync.Mutex
	ready bool
}

func NewPGStore(pool *pgxpool.Pool) *PGStore {
	s := &PGStore{pool: pool}
	// Provision the schema eagerly; if the database is not reachable yet the
	// attempt is retried lazily on the first Save/Load call.
	_ = s.ensureSchema()
	return s
}

func (s *PGStore) ensureSchema() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.ready {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	for _, stmt := range []string{createEventsTableSQL, createStreamIndexSQL} {
		if _, err := s.pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("eventstore: ensure schema: %w", err)
		}
	}

	s.ready = true
	return nil
}

func (s *PGStore) Save(streamID string, newEvents []es.Event) error {
	if len(newEvents) == 0 {
		return nil
	}
	if err := s.ensureSchema(); err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("eventstore: begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentVersion int
	if err := tx.QueryRow(ctx,
		`SELECT COALESCE(MAX(version), 0) FROM events WHERE stream_id = $1`,
		streamID,
	).Scan(&currentVersion); err != nil {
		return fmt.Errorf("eventstore: read stream %q version: %w", streamID, err)
	}

	for i, event := range newEvents {
		version := event.Version
		if version <= 0 {
			version = currentVersion + i + 1
		}

		timestamp := event.Timestamp
		if timestamp.IsZero() {
			timestamp = time.Now().UTC()
		}

		data := event.Data
		if data == nil {
			data = []byte("{}")
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO events (stream_id, event_type, data, version, created_at)
			VALUES ($1, $2, $3::jsonb, $4, $5)
		`, streamID, event.Type, data, version, timestamp); err != nil {
			if isUniqueViolation(err) {
				return fmt.Errorf(
					"eventstore: %w: stream %q already has an event at version %d",
					ErrConcurrencyConflict, streamID, version,
				)
			}
			return fmt.Errorf("eventstore: insert event into stream %q: %w", streamID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("eventstore: commit stream %q: %w", streamID, err)
	}
	return nil
}

func (s *PGStore) Load(streamID string) ([]es.Event, error) {
	if err := s.ensureSchema(); err != nil {
		return nil, err
	}

	ctx := context.Background()
	rows, err := s.pool.Query(ctx, `
		SELECT id, event_type, data, version, created_at
		FROM events
		WHERE stream_id = $1
		ORDER BY version ASC
	`, streamID)
	if err != nil {
		return nil, fmt.Errorf("eventstore: query stream %q: %w", streamID, err)
	}
	defer rows.Close()

	events := make([]es.Event, 0)
	for rows.Next() {
		var (
			dbID      int64
			eventType string
			data      []byte
			version   int
			createdAt time.Time
		)
		if err := rows.Scan(&dbID, &eventType, &data, &version, &createdAt); err != nil {
			return nil, fmt.Errorf("eventstore: scan event from stream %q: %w", streamID, err)
		}
		events = append(events, es.Event{
			ID:        strconv.FormatInt(dbID, 10),
			Type:      eventType,
			Data:      data,
			Version:   version,
			Timestamp: createdAt,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("eventstore: iterate stream %q: %w", streamID, err)
	}

	if len(events) == 0 {
		return nil, fmt.Errorf("stream %s not found", streamID)
	}
	return events, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolationCode
}
