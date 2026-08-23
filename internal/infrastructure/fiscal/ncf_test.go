package fiscal

import (
	"testing"
)

func TestValidateRNCJuridico(t *testing.T) {
	tests := []struct {
		name  string
		rnc   string
		valid bool
	}{
		{"valid RNC juridico", "101000007", true},
		{"valid RNC with dashes", "101-00000-7", true},
		{"invalid RNC wrong check digit", "101000000", false},
		{"invalid RNC short", "12345678", false},
		{"invalid RNC long", "1234567890", false},
		{"invalid RNC letters", "ABCDEFGHI", false},
		{"empty RNC", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateRNC(tt.rnc)
			if result != tt.valid {
				t.Errorf("ValidateRNC(%q) = %v, want %v", tt.rnc, result, tt.valid)
			}
		})
	}
}

func TestValidateRNCFisico(t *testing.T) {
	tests := []struct {
		name  string
		rnc   string
		valid bool
	}{
		{"valid RNC fisico 11 digits", "00112345678", false},
		{"invalid RNC fisico", "12345678901", false},
		{"too short", "1234567890", false},
		{"too long", "123456789012", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateRNC(tt.rnc)
			if result != tt.valid {
				t.Errorf("ValidateRNC(%q) = %v, want %v", tt.rnc, result, tt.valid)
			}
		})
	}
}

func TestFormatRNC(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"101000007", "101-00000-7"},
		{"101-00000-7", "101-00000-7"},
		{"10112345670", "101-12345-670"},
		{"456", "456"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := FormatRNC(tt.input)
			if result != tt.expected {
				t.Errorf("FormatRNC(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
