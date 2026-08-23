package middleware

import (
	"net/http"
	"strings"

	"github.com/hospitalityos/internal/infrastructure/i18n"
)

func I18n(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lang := detectLanguage(r)
		ctx := WithLanguage(r.Context(), string(lang))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func detectLanguage(r *http.Request) i18n.Language {
	if lang := r.Header.Get("Accept-Language"); lang != "" {
		parts := strings.Split(lang, ",")
		if len(parts) > 0 {
			code := strings.TrimSpace(parts[0])
			code = strings.Split(code, ";")[0]
			code = strings.Split(code, "-")[0]

			switch strings.ToLower(code) {
			case "es":
				return i18n.LanguageSpanish
			case "en":
				return i18n.LanguageEnglish
			case "fr":
				return i18n.LanguageFrench
			case "pt":
				return i18n.LanguagePortuguese
			case "de":
				return i18n.LanguageGerman
			case "it":
				return i18n.LanguageItalian
			}
		}
	}

	return i18n.DefaultLanguage
}
