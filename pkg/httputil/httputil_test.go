package httputil

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestBadRequest(t *testing.T) {
	w := httptest.NewRecorder()
	BadRequest(w, "test error")

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	var body APIError
	json.NewDecoder(w.Body).Decode(&body)
	if body.Error.Code != "BAD_REQUEST" {
		t.Errorf("code = %q, want %q", body.Error.Code, "BAD_REQUEST")
	}
	if body.Error.Message != "test error" {
		t.Errorf("message = %q, want %q", body.Error.Message, "test error")
	}
}

func TestUnauthorized(t *testing.T) {
	w := httptest.NewRecorder()
	Unauthorized(w, "not authenticated")

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
	var body APIError
	json.NewDecoder(w.Body).Decode(&body)
	if body.Error.Code != "UNAUTHORIZED" {
		t.Errorf("code = %q, want %q", body.Error.Code, "UNAUTHORIZED")
	}
}

func TestForbidden(t *testing.T) {
	w := httptest.NewRecorder()
	Forbidden(w, "access denied")

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", w.Code, http.StatusForbidden)
	}
	var body APIError
	json.NewDecoder(w.Body).Decode(&body)
	if body.Error.Code != "FORBIDDEN" {
		t.Errorf("code = %q, want %q", body.Error.Code, "FORBIDDEN")
	}
}

func TestNotFound(t *testing.T) {
	w := httptest.NewRecorder()
	NotFound(w, "resource missing")

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
	var body APIError
	json.NewDecoder(w.Body).Decode(&body)
	if body.Error.Code != "NOT_FOUND" {
		t.Errorf("code = %q, want %q", body.Error.Code, "NOT_FOUND")
	}
}

func TestConflict(t *testing.T) {
	w := httptest.NewRecorder()
	Conflict(w, "already exists")

	if w.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d", w.Code, http.StatusConflict)
	}
}

func TestUnprocessable(t *testing.T) {
	w := httptest.NewRecorder()
	Unprocessable(w, "invalid data")

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnprocessableEntity)
	}
}

func TestInternalServerError(t *testing.T) {
	w := httptest.NewRecorder()
	InternalServerError(w, "db error")

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	JSON(w, http.StatusOK, map[string]string{"status": "ok"})

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want %q", ct, "application/json")
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["status"] != "ok" {
		t.Errorf("body.status = %q, want %q", body["status"], "ok")
	}
}

func TestExtractTenantID_FromContext(t *testing.T) {
	ctx := context.WithValue(context.Background(), TenantIDKey, "tenant-123")
	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(ctx)

	result := ExtractTenantID(req)
	if result != "tenant-123" {
		t.Errorf("ExtractTenantID = %q, want %q", result, "tenant-123")
	}
}

func TestExtractTenantID_Empty(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	result := ExtractTenantID(req)
	if result != "" {
		t.Errorf("ExtractTenantID = %q, want empty", result)
	}
}

func TestGetTenantID_FromContext(t *testing.T) {
	ctx := context.WithValue(context.Background(), TenantIDKey, "tenant-456")

	result := GetTenantID(ctx)
	if result != "tenant-456" {
		t.Errorf("GetTenantID = %q, want %q", result, "tenant-456")
	}
}

func TestGetTenantID_Empty(t *testing.T) {
	result := GetTenantID(context.Background())
	if result != "" {
		t.Errorf("GetTenantID = %q, want empty", result)
	}
}

func TestParseDate_Valid(t *testing.T) {
	d, err := ParseDate("2025-01-15")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Year() != 2025 || d.Month() != 1 || d.Day() != 15 {
		t.Errorf("parsed date = %v, want 2025-01-15", d)
	}
}

func TestParseDate_Invalid(t *testing.T) {
	_, err := ParseDate("15-01-2025")
	if err == nil {
		t.Fatal("expected error for invalid format")
	}
}

func TestParseDate_Empty(t *testing.T) {
	_, err := ParseDate("")
	if err == nil {
		t.Fatal("expected error for empty string")
	}
}

func TestError(t *testing.T) {
	w := httptest.NewRecorder()
	Error(w, http.StatusTeapot, "coffee missing")

	if w.Code != http.StatusTeapot {
		t.Errorf("status = %d, want %d", w.Code, http.StatusTeapot)
	}
	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["error"] != "coffee missing" {
		t.Errorf("error = %q, want %q", body["error"], "coffee missing")
	}
}

func TestParseDate_FutureDate(t *testing.T) {
	d, err := ParseDate("2030-12-31")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Year() != 2030 || d.Month() != time.December || d.Day() != 31 {
		t.Errorf("parsed date = %v, want 2030-12-31", d)
	}
}
