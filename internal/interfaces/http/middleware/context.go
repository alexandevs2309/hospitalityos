package middleware

import (
	"context"
)

type i18nContextKey string

const LanguageKey i18nContextKey = "i18n_language"

func WithLanguage(ctx context.Context, lang string) context.Context {
	return context.WithValue(ctx, LanguageKey, lang)
}

func GetLanguage(ctx context.Context) string {
	if lang, ok := ctx.Value(LanguageKey).(string); ok {
		return lang
	}
	return "es"
}
