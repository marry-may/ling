import { BookOpen, X } from 'lucide-react'
import { useMessages } from './i18n'
import { LANGUAGES } from './languages'
import { TranslationLanguageSelect } from './TranslationLanguageSelect'

type LanguagePickerProps = {
  /** Languages already being studied; they are not offered again. */
  exclude?: string[]
  onPick: (code: string) => void
  /** Without onClose the picker is the first-run screen rather than a dialog. */
  onClose?: () => void
  /** On the first-run screen: the language words are translated into. */
  translation?: { value: string; onChange: (code: string) => void }
}

export function LanguagePicker({ exclude = [], onPick, onClose, translation }: LanguagePickerProps) {
  const t = useMessages()
  const options = LANGUAGES.filter((language) => !exclude.includes(language.code))
  const grid = (
    <div className="language-grid">{options.map((language) => (
      <button key={language.code} className="language-card" onClick={() => onPick(language.code)}>
        <span className="language-greeting">{language.greeting}</span>
        <strong>{language.name}</strong>
      </button>
    ))}</div>
  )

  if (!onClose) {
    return (
      <section className="onboarding">
        <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
        <span className="eyebrow">{t.picker.welcome}</span>
        <h1>{t.picker.question}<span className="heading-period">?</span></h1>
        <p>{t.picker.lead}</p>
        {translation && <div className="onboarding-translation"><TranslationLanguageSelect value={translation.value} onChange={translation.onChange} /></div>}
        {grid}
      </section>
    )
  }

  return (
    <div className="translation-scrim account-scrim" onClick={onClose}>
      <section className="account-panel language-dialog" role="dialog" aria-modal="true" aria-label={t.picker.addLabel} onClick={(event) => event.stopPropagation()}>
        <button className="icon-button panel-close" onClick={onClose} aria-label={t.common.close}><X size={18} /></button>
        <span className="panel-kicker">{t.picker.newLanguage}</span>
        <h2>{t.picker.addQuestion}</h2>
        {grid}
      </section>
    </div>
  )
}
