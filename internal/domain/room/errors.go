package room

import "errors"

var (
	ErrRoomNumberRequired = errors.New("room number is required")
	ErrInvalidStatus      = errors.New("invalid status transition")
)
