package guest

import "errors"

var (
	ErrEmailRequired = errors.New("email is required")
	ErrInvalidEmail  = errors.New("invalid email format")
	ErrNameRequired  = errors.New("first and last name are required")
)
