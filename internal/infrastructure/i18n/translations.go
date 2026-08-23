package i18n

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type Language string

const (
	LanguageSpanish  Language = "es"
	LanguageEnglish  Language = "en"
	LanguageFrench   Language = "fr"
	LanguagePortuguese Language = "pt"
	LanguageGerman   Language = "de"
	LanguageItalian  Language = "it"
)

var DefaultLanguage = LanguageSpanish

type Translations struct {
	mu       sync.RWMutex
	translations map[Language]map[string]string
}

var Global = &Translations{
	translations: make(map[Language]map[string]string),
}

func (t *Translations) Load(dir string) error {
	langs := []Language{LanguageSpanish, LanguageEnglish, LanguageFrench, LanguagePortuguese, LanguageGerman, LanguageItalian}

	for _, lang := range langs {
		file := filepath.Join(dir, string(lang)+".json")
		data, err := os.ReadFile(file)
		if err != nil {
			continue
		}

		var msgs map[string]string
		if err := json.Unmarshal(data, &msgs); err != nil {
			continue
		}

		t.mu.Lock()
		t.translations[lang] = msgs
		t.mu.Unlock()
	}

	return nil
}

func (t *Translations) T(lang Language, key string, args ...interface{}) string {
	t.mu.RLock()
	msgs, ok := t.translations[lang]
	t.mu.RUnlock()

	if !ok {
		t.mu.RLock()
		msgs, ok = t.translations[DefaultLanguage]
		t.mu.RUnlock()
	}

	if !ok {
		return key
	}

	msg, ok := msgs[key]
	if !ok {
		return key
	}

	if len(args) == 0 {
		return msg
	}

	return formatString(msg, args...)
}

func (t *Translations) HasLanguage(lang Language) bool {
	t.mu.RLock()
	_, ok := t.translations[lang]
	t.mu.RUnlock()
	return ok
}

func (t *Translations) AvailableLanguages() []Language {
	t.mu.RLock()
	defer t.mu.RUnlock()

	var langs []Language
	for lang := range t.translations {
		langs = append(langs, lang)
	}
	return langs
}

func formatString(s string, args ...interface{}) string {
	result := ""
	argIdx := 0
	for i := 0; i < len(s); i++ {
		if i < len(s)-1 && s[i] == '{' && s[i+1] == '}' {
			if argIdx < len(args) {
				result += interfaceToString(args[argIdx])
				argIdx++
				i++
			} else {
				result += "{}"
				i++
			}
		} else {
			result += string(s[i])
		}
	}
	return result
}

func interfaceToString(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case int:
		return fmt.Sprintf("%d", val)
	case float64:
		return fmt.Sprintf("%g", val)
	case bool:
		if val {
			return "true"
		}
		return "false"
	default:
		return fmt.Sprintf("%v", val)
	}
}
