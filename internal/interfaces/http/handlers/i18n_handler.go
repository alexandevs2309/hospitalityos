package handlers

import (
	"net/http"

	"github.com/hospitalityos/internal/infrastructure/i18n"
	"github.com/hospitalityos/internal/interfaces/http/middleware"
	"github.com/hospitalityos/pkg/httputil"
)

type I18nHandler struct{}

func NewI18nHandler() *I18nHandler {
	return &I18nHandler{}
}

type TranslationResponse struct {
	Language    string            `json:"language"`
	Translations map[string]string `json:"translations"`
}

func (h *I18nHandler) GetTranslations(w http.ResponseWriter, r *http.Request) {
	lang := middleware.GetLanguage(r.Context())
	langCode := i18n.Language(lang)

	if !i18n.Global.HasLanguage(langCode) {
		langCode = i18n.DefaultLanguage
	}

	keys := []string{
		"app.name", "app.welcome",
		"auth.login", "auth.logout", "auth.username", "auth.password",
		"nav.dashboard", "nav.rooms", "nav.reservations", "nav.guests",
		"nav.frontdesk", "nav.housekeeping", "nav.maintenance", "nav.reports",
		"room.available", "room.occupied", "room.clean", "room.dirty",
		"reservation.pending", "reservation.confirmed", "reservation.checked_in",
		"folio.charge", "folio.payment", "folio.balance", "folio.close",
		"housekeeping.pending", "housekeeping.in_progress", "housekeeping.completed",
		"maintenance.open", "maintenance.completed",
		"report.occupancy", "report.revenue", "report.adr", "report.revpar",
		"error.not_found", "error.unauthorized", "error.bad_request",
		"success.saved", "success.deleted", "success.updated",
		"common.save", "common.cancel", "common.delete", "common.edit",
		"common.search", "common.loading", "common.no_data",
	}

	translations := make(map[string]string)
	for _, key := range keys {
		translations[key] = i18n.Global.T(langCode, key)
	}

	httputil.JSON(w, http.StatusOK, TranslationResponse{
		Language:     string(langCode),
		Translations: translations,
	})
}

func (h *I18nHandler) GetLanguages(w http.ResponseWriter, r *http.Request) {
	type LangInfo struct {
		Code   string `json:"code"`
		Name   string `json:"name"`
		Native string `json:"native"`
	}

	langs := []LangInfo{
		{Code: "es", Name: "Spanish", Native: "Espanol"},
		{Code: "en", Name: "English", Native: "English"},
		{Code: "fr", Name: "French", Native: "Francais"},
		{Code: "pt", Name: "Portuguese", Native: "Portugues"},
		{Code: "de", Name: "German", Native: "Deutsch"},
		{Code: "it", Name: "Italian", Native: "Italiano"},
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"languages": langs,
		"default":   "es",
	})
}
