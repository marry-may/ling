import { BookOpen, X } from 'lucide-react'
import { LANGUAGES } from './languages'

type LanguagePickerProps = {
  /** Languages already being studied; they are not offered again. */
  exclude?: string[]
  onPick: (code: string) => void
  /** Without onClose the picker is the first-run screen rather than a dialog. */
  onClose?: () => void
}

export function LanguagePicker({ exclude = [], onPick, onClose }: LanguagePickerProps) {
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
        <span className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В LING</span>
        <h1>Какой язык ты учишь<span className="heading-period">?</span></h1>
        <p>Книги, слова и прогресс хранятся отдельно для каждого языка. Другие языки можно добавить позже.</p>
        {grid}
      </section>
    )
  }

  return (
    <div className="translation-scrim account-scrim" onClick={onClose}>
      <section className="account-panel language-dialog" role="dialog" aria-modal="true" aria-label="Добавить язык" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button panel-close" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
        <span className="panel-kicker">НОВЫЙ ЯЗЫК</span>
        <h2>Какой язык добавить?</h2>
        {grid}
      </section>
    </div>
  )
}
