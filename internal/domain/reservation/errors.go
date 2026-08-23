package reservation

import "errors"

var (
	ErrInvalidDateRange    = errors.New("check-out must be after check-in")
	ErrInvalidGuests       = errors.New("at least one adult is required")
	ErrInvalidAmount       = errors.New("total amount must be greater than zero")
	ErrAlreadyCanceled      = errors.New("reservation is already canceled")
	ErrCannotCancelCheckedOut = errors.New("cannot cancel a checked-out reservation")
	ErrInvalidStatus       = errors.New("invalid status for this operation")
	ErrNotFound            = errors.New("reservation not found")
	ErrRoomNotAvailable    = errors.New("room is not available for the selected dates")
	ErrUnauthorized        = errors.New("unauthorized access to reservation")
)
