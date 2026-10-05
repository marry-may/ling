import { Languages } from 'lucide-react'
import { TRANSLATION_LANGUAGES } from './languages'

type TranslationLanguageSelectProps = { value: string; onChange: (code: string) => void; hint?: string }

/** Picks the learner's own language, which words are translated into. */
export function TranslationLanguageSelect({ value, onChange, hint }: TranslationLanguageSelectProps) {
  return (
    <label className="translation-language">
      <span className="translation-language-label"><Languages size={15} /> Переводить на</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {TRANSLATION_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
      </select>
      {hint && <small>{hint}</small>}
    </label>
  )
}
