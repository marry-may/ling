export type Language = { code: string; name: string; label: string; speech: string }

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', label: 'АНГЛИЙСКОЕ СЛОВО', speech: 'en-US' },
  { code: 'de', name: 'Deutsch', label: 'НЕМЕЦКОЕ СЛОВО', speech: 'de-DE' },
  { code: 'fr', name: 'Français', label: 'ФРАНЦУЗСКОЕ СЛОВО', speech: 'fr-FR' },
  { code: 'es', name: 'Español', label: 'ИСПАНСКОЕ СЛОВО', speech: 'es-ES' },
  { code: 'it', name: 'Italiano', label: 'ИТАЛЬЯНСКОЕ СЛОВО', speech: 'it-IT' },
  { code: 'pt', name: 'Português', label: 'ПОРТУГАЛЬСКОЕ СЛОВО', speech: 'pt-PT' },
  { code: 'nl', name: 'Nederlands', label: 'НИДЕРЛАНДСКОЕ СЛОВО', speech: 'nl-NL' },
  { code: 'pl', name: 'Polski', label: 'ПОЛЬСКОЕ СЛОВО', speech: 'pl-PL' },
  { code: 'cs', name: 'Čeština', label: 'ЧЕШСКОЕ СЛОВО', speech: 'cs-CZ' },
  { code: 'sv', name: 'Svenska', label: 'ШВЕДСКОЕ СЛОВО', speech: 'sv-SE' },
  { code: 'tr', name: 'Türkçe', label: 'ТУРЕЦКОЕ СЛОВО', speech: 'tr-TR' },
  { code: 'uk', name: 'Українська', label: 'УКРАИНСКОЕ СЛОВО', speech: 'uk-UA' },
]

export const DEFAULT_LANGUAGE = 'en'
export const TARGET_LANGUAGE = 'ru'

export function getLanguage(code: string): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]
}

export function speak(text: string, languageCode: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = getLanguage(languageCode).speech
  window.speechSynthesis.speak(utterance)
}
