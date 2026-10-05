export type Language = { code: string; name: string; label: string; speech: string; ocr: string; greeting: string }

export const LANGUAGES: Language[] = [
  { code: 'en', greeting: 'Hello', ocr: 'eng', name: 'English', label: 'АНГЛИЙСКОЕ СЛОВО', speech: 'en-US' },
  { code: 'de', greeting: 'Hallo', ocr: 'deu', name: 'Deutsch', label: 'НЕМЕЦКОЕ СЛОВО', speech: 'de-DE' },
  { code: 'fr', greeting: 'Bonjour', ocr: 'fra', name: 'Français', label: 'ФРАНЦУЗСКОЕ СЛОВО', speech: 'fr-FR' },
  { code: 'es', greeting: 'Hola', ocr: 'spa', name: 'Español', label: 'ИСПАНСКОЕ СЛОВО', speech: 'es-ES' },
  { code: 'it', greeting: 'Ciao', ocr: 'ita', name: 'Italiano', label: 'ИТАЛЬЯНСКОЕ СЛОВО', speech: 'it-IT' },
  { code: 'pt', greeting: 'Olá', ocr: 'por', name: 'Português', label: 'ПОРТУГАЛЬСКОЕ СЛОВО', speech: 'pt-PT' },
  { code: 'nl', greeting: 'Hoi', ocr: 'nld', name: 'Nederlands', label: 'НИДЕРЛАНДСКОЕ СЛОВО', speech: 'nl-NL' },
  { code: 'pl', greeting: 'Cześć', ocr: 'pol', name: 'Polski', label: 'ПОЛЬСКОЕ СЛОВО', speech: 'pl-PL' },
  { code: 'cs', greeting: 'Ahoj', ocr: 'ces', name: 'Čeština', label: 'ЧЕШСКОЕ СЛОВО', speech: 'cs-CZ' },
  { code: 'sv', greeting: 'Hej', ocr: 'swe', name: 'Svenska', label: 'ШВЕДСКОЕ СЛОВО', speech: 'sv-SE' },
  { code: 'tr', greeting: 'Merhaba', ocr: 'tur', name: 'Türkçe', label: 'ТУРЕЦКОЕ СЛОВО', speech: 'tr-TR' },
  { code: 'uk', greeting: 'Привіт', ocr: 'ukr', name: 'Українська', label: 'УКРАИНСКОЕ СЛОВО', speech: 'uk-UA' },
]

export const DEFAULT_LANGUAGE = 'en'

/** Languages words can be translated into: the learner's own language, chosen at sign-up and in the account. */
export const TRANSLATION_LANGUAGES: { code: string; name: string }[] = [
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pl', name: 'Polski' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sv', name: 'Svenska' },
  { code: 'tr', name: 'Türkçe' },
]

/** A first guess at the learner's own language, from the browser. */
export function defaultTranslationLanguage(): string {
  const browser = navigator.language.slice(0, 2).toLowerCase()
  return TRANSLATION_LANGUAGES.some((language) => language.code === browser) ? browser : 'ru'
}

export function getLanguage(code: string): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]
}

// The most frequent short words of each language; enough to tell languages apart on one page of text.
const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'and', 'of', 'to', 'is', 'was', 'that', 'with', 'for', 'you', 'he', 'she'],
  de: ['der', 'die', 'und', 'das', 'ist', 'nicht', 'mit', 'sie', 'ein', 'ich', 'zu', 'den'],
  fr: ['le', 'la', 'les', 'et', 'est', 'des', 'une', 'que', 'pas', 'dans', 'il', 'du'],
  es: ['el', 'la', 'los', 'que', 'y', 'es', 'en', 'una', 'por', 'con', 'las', 'del'],
  it: ['il', 'la', 'che', 'di', 'e', 'non', 'per', 'una', 'sono', 'gli', 'della', 'un'],
  pt: ['o', 'a', 'que', 'não', 'uma', 'os', 'com', 'para', 'é', 'do', 'da', 'em'],
  nl: ['de', 'het', 'een', 'en', 'van', 'is', 'niet', 'dat', 'ik', 'je', 'op', 'zijn'],
  pl: ['i', 'w', 'nie', 'się', 'na', 'że', 'jest', 'to', 'z', 'do', 'jak', 'ale'],
  cs: ['a', 'se', 'na', 'je', 'že', 'to', 'v', 'ne', 'jsem', 's', 'jak', 'ale'],
  sv: ['och', 'att', 'det', 'som', 'en', 'är', 'på', 'inte', 'jag', 'för', 'med', 'har'],
  tr: ['ve', 'bir', 'bu', 'da', 'de', 'için', 'ne', 'çok', 'ile', 'ben', 'o', 'gibi'],
  uk: ['і', 'в', 'не', 'на', 'що', 'я', 'та', 'з', 'це', 'він', 'як', 'але'],
}

export function detectLanguage(text: string): string | undefined {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
  let best: string | undefined
  let bestScore = 0
  for (const [language, stopwords] of Object.entries(STOPWORDS)) {
    const set = new Set(stopwords)
    const score = words.filter((word) => set.has(word)).length
    if (score > bestScore) {
      best = language
      bestScore = score
    }
  }
  return bestScore >= 5 ? best : undefined
}

export function speak(text: string, languageCode: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = getLanguage(languageCode).speech
  window.speechSynthesis.speak(utterance)
}
