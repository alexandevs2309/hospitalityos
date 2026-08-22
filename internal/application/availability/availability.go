package availability

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Engine struct {
	pool *pgxpool.Pool
}

func NewEngine(pool *pgxpool.Pool) *Engine {
	return &Engine{pool: pool}
}

func (e *Engine) IsRoomAvailable(ctx context.Context, tenantID, roomID string, checkIn, checkOut time.Time) (bool, error) {
	var exists bool
	err := e.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM reservations
			WHERE tenant_id = $1 AND room_id = $2
			AND status IN ('confirmed', 'checked_in')
			AND check_in < $4 AND check_out > $3
		)
	`, tenantID, roomID, checkIn, checkOut).Scan(&exists)
	if err != nil {
		return false, err
	}
	return !exists, nil
}

type AvailableRoom struct {
	RoomID     string `json:"room_id"`
	RoomNumber string `json:"room_number"`
	RoomType   string `json:"room_type"`
	Floor      string `json:"floor"`
	PriceCents int64  `json:"price_cents"`
	Currency   string `json:"currency"`
}

func (e *Engine) AvailableRooms(ctx context.Context, tenantID string, checkIn, checkOut time.Time) ([]AvailableRoom, error) {
	rows, err := e.pool.Query(ctx, `
		SELECT r.id, r.number, rt.name, r.floor, COALESCE(rt.base_price_cents, 0), 'DOP'
		FROM rooms r
		JOIN room_types rt ON r.room_type_id = rt.id
		WHERE r.tenant_id = $1
		AND r.status != 'maintenance'
		AND r.id NOT IN (
			SELECT res.room_id FROM reservations res
			WHERE res.tenant_id = $1
			AND res.status IN ('confirmed', 'checked_in')
			AND res.check_in < $3 AND res.check_out > $2
		)
		ORDER BY r.number
	`, tenantID, checkIn, checkOut)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []AvailableRoom
	for rows.Next() {
		var ar AvailableRoom
		if err := rows.Scan(&ar.RoomID, &ar.RoomNumber, &ar.RoomType, &ar.Floor, &ar.PriceCents, &ar.Currency); err != nil {
			return nil, err
		}
		rooms = append(rooms, ar)
	}
	return rooms, nil
}
