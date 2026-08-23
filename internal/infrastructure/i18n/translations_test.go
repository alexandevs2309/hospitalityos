package i18n

import (
	"os"
	"path/filepath"
	"testing"
)

func TestT_DirectLookup(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"hello": "Hola"},
			"en": {"hello": "Hello"},
		},
	}

	if got := tr.T("es", "hello"); got != "Hola" {
		t.Errorf("T(es, hello) = %q, want %q", got, "Hola")
	}
	if got := tr.T("en", "hello"); got != "Hello" {
		t.Errorf("T(en, hello) = %q, want %q", got, "Hello")
	}
}

func TestT_FallbackToDefault(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"hello": "Hola"},
		},
	}

	if got := tr.T("fr", "hello"); got != "Hola" {
		t.Errorf("T(fr, hello) = %q, want %q (fallback to es)", got, "Hola")
	}
}

func TestT_ReturnsKeyIfMissing(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {},
		},
	}

	if got := tr.T("es", "nonexistent"); got != "nonexistent" {
		t.Errorf("T(es, nonexistent) = %q, want %q", got, "nonexistent")
	}
}

func TestT_EmptyTranslations(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{},
	}

	if got := tr.T("es", "hello"); got != "hello" {
		t.Errorf("T(es, hello) = %q, want %q", got, "hello")
	}
}

func TestT_FormatString(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"welcome": "Bienvenido {}"},
		},
	}

	if got := tr.T("es", "welcome", "Carlos"); got != "Bienvenido Carlos" {
		t.Errorf("T(es, welcome, Carlos) = %q, want %q", got, "Bienvenido Carlos")
	}
}

func TestT_FormatStringInt(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"count": "{} habitaciones"},
		},
	}

	if got := tr.T("es", "count", 5); got != "5 habitaciones" {
		t.Errorf("T(es, count, 5) = %q, want %q", got, "5 habitaciones")
	}
}

func TestHasLanguage(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"hello": "Hola"},
			"en": {"hello": "Hello"},
		},
	}

	if !tr.HasLanguage("es") {
		t.Error("expected HasLanguage(es) = true")
	}
	if !tr.HasLanguage("en") {
		t.Error("expected HasLanguage(en) = true")
	}
	if tr.HasLanguage("fr") {
		t.Error("expected HasLanguage(fr) = false")
	}
}

func TestAvailableLanguages(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {},
			"en": {},
			"fr": {},
		},
	}

	langs := tr.AvailableLanguages()
	if len(langs) != 3 {
		t.Errorf("len(AvailableLanguages) = %d, want 3", len(langs))
	}
}

func TestFormatString_MultipleArgs(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"booking": "Reserva {} para {} noches"},
		},
	}

	got := tr.T("es", "booking", "Suite", 3)
	want := "Reserva Suite para 3 noches"
	if got != want {
		t.Errorf("T(es, booking, Suite, 3) = %q, want %q", got, want)
	}
}

func TestFormatString_NoArgs(t *testing.T) {
	tr := &Translations{
		translations: map[Language]map[string]string{
			"es": {"open": "Abrir {} cerrar"},
		},
	}

	if got := tr.T("es", "open"); got != "Abrir {} cerrar" {
		t.Errorf("T(es, open) = %q, want %q", got, "Abrir {} cerrar")
	}
}

func TestLoad_FromDir(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "es.json"), []byte(`{"hello":"Hola","goodbye":"Adiós"}`), 0644)
	os.WriteFile(filepath.Join(dir, "en.json"), []byte(`{"hello":"Hello","goodbye":"Goodbye"}`), 0644)

	tr := &Translations{
		translations: make(map[Language]map[string]string),
	}
	tr.Load(dir)

	if got := tr.T("es", "hello"); got != "Hola" {
		t.Errorf("T(es, hello) = %q, want %q", got, "Hola")
	}
	if got := tr.T("en", "goodbye"); got != "Goodbye" {
		t.Errorf("T(en, goodbye) = %q, want %q", got, "Goodbye")
	}
}

func TestInterfaceToString(t *testing.T) {
	tests := []struct {
		input    interface{}
		expected string
	}{
		{"hello", "hello"},
		{42, "42"},
		{3.14, "3.14"},
		{true, "true"},
		{false, "false"},
		{nil, "<nil>"},
	}

	for _, tt := range tests {
		got := interfaceToString(tt.input)
		if got != tt.expected {
			t.Errorf("interfaceToString(%v) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}
