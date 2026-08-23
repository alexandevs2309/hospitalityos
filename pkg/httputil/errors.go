package httputil

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func ErrorWithCode(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIError{
		Error: ErrorDetail{Code: code, Message: message},
	})
}

func BadRequest(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusBadRequest, "BAD_REQUEST", message)
}

func Unauthorized(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusConflict, "CONFLICT", message)
}

func Unprocessable(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusUnprocessableEntity, "UNPROCESSABLE", message)
}

func InternalServerError(w http.ResponseWriter, message string) {
	ErrorWithCode(w, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
