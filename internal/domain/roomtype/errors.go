package roomtype

import "errors"

var (
	ErrNameRequired     = errors.New("room type name is required")
	ErrInvalidCapacity  = errors.New("capacity must be at least 1")
)
