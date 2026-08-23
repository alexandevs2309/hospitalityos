package auth

import (
	"os"
	"testing"
	"time"
)

func TestHashPassword(t *testing.T) {
	hash, err := HashPassword("testpassword123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hash == "" {
		t.Fatal("expected non-empty hash")
	}
	if hash == "testpassword123" {
		t.Fatal("hash should not equal plaintext")
	}
}

func TestCheckPassword_Correct(t *testing.T) {
	hash, _ := HashPassword("mypassword")
	if !CheckPassword("mypassword", hash) {
		t.Error("expected correct password to match")
	}
}

func TestCheckPassword_Wrong(t *testing.T) {
	hash, _ := HashPassword("mypassword")
	if CheckPassword("wrongpassword", hash) {
		t.Error("expected wrong password to not match")
	}
}

func TestCheckPassword_EmptyHash(t *testing.T) {
	if CheckPassword("password", "") {
		t.Error("expected empty hash to not match")
	}
}

func TestGenerateAccessToken_Success(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-1234567890")
	defer os.Unsetenv("JWT_SECRET")

	token, err := GenerateAccessToken("user-1", "tenant-1", "admin", "test@example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
}

func TestGenerateAccessToken_MissingSecret(t *testing.T) {
	os.Unsetenv("JWT_SECRET")

	_, err := GenerateAccessToken("user-1", "tenant-1", "admin", "test@example.com")
	if err != ErrMissingSecret {
		t.Fatalf("expected ErrMissingSecret, got %v", err)
	}
}

func TestValidateToken_Success(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-1234567890")
	defer os.Unsetenv("JWT_SECRET")

	token, _ := GenerateAccessToken("user-1", "tenant-1", "admin", "test@example.com")
	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claims.UserID != "user-1" {
		t.Errorf("UserID = %q, want %q", claims.UserID, "user-1")
	}
	if claims.TenantID != "tenant-1" {
		t.Errorf("TenantID = %q, want %q", claims.TenantID, "tenant-1")
	}
	if claims.Role != "admin" {
		t.Errorf("Role = %q, want %q", claims.Role, "admin")
	}
	if claims.Email != "test@example.com" {
		t.Errorf("Email = %q, want %q", claims.Email, "test@example.com")
	}
}

func TestValidateToken_Invalid(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-1234567890")
	defer os.Unsetenv("JWT_SECRET")

	_, err := ValidateToken("invalid.token.here")
	if err != ErrInvalidToken {
		t.Fatalf("expected ErrInvalidToken, got %v", err)
	}
}

func TestValidateToken_WrongSecret(t *testing.T) {
	os.Setenv("JWT_SECRET", "secret-1")
	token, _ := GenerateAccessToken("user-1", "tenant-1", "admin", "test@example.com")
	os.Setenv("JWT_SECRET", "secret-2")

	_, err := ValidateToken(token)
	if err != ErrInvalidToken {
		t.Fatalf("expected ErrInvalidToken for wrong secret, got %v", err)
	}
	os.Unsetenv("JWT_SECRET")
}

func TestValidateToken_MissingSecret(t *testing.T) {
	os.Unsetenv("JWT_SECRET")

	_, err := ValidateToken("any-token")
	if err != ErrMissingSecret {
		t.Fatalf("expected ErrMissingSecret, got %v", err)
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	token, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(token) != 64 {
		t.Errorf("expected 64-char hex string, got %d chars", len(token))
	}

	token2, _ := GenerateRefreshToken()
	if token == token2 {
		t.Error("refresh tokens should be unique")
	}
}

func TestClaims_Issuer(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-1234567890")
	defer os.Unsetenv("JWT_SECRET")

	token, _ := GenerateAccessToken("user-1", "tenant-1", "admin", "test@example.com")
	claims, _ := ValidateToken(token)

	if claims.Issuer != "hospitalityos" {
		t.Errorf("Issuer = %q, want %q", claims.Issuer, "hospitalityos")
	}
}

func TestClaims_Expiry(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-1234567890")
	defer os.Unsetenv("JWT_SECRET")

	token, _ := GenerateAccessToken("user-1", "tenant-1", "admin", "test@example.com")
	claims, _ := ValidateToken(token)

	if claims.ExpiresAt == nil {
		t.Fatal("expected ExpiresAt to be set")
	}
	diff := claims.ExpiresAt.Time.Sub(time.Now())
	if diff > 16*time.Minute || diff < 14*time.Minute {
		t.Errorf("expected ~15min expiry, got %v from now", diff)
	}
}
