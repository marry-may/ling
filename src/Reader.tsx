import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, Check, ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus, Sparkles, Type, Volume2, X } from 'lucide-react'
import { bookTitleOf, type BookFile, type SavedWord } from './domain'
import { partTitle, useMessages } from './i18n'
import { getLanguage, speak } from './languages'
import { FONT_SIZE_RANGE, LINE_HEIGHTS, readerTextStyle, useReaderSettings } from './readerSettings'
import { MAX_LEVEL, schedule, setLevel } from './srs'
import { cleanWord, countWords, paginate, sentenceAt, tokenize, wordKey, type Token } from './text'
import type { Theme } from './theme'
import { ThemeToggle } from './ThemeToggle'
import { translateWord, type TranslationGroup } from './translate'

type Panel = {
  word: string
  key: string
  context: string
  loading: boolean
  failed: boolean
  groups: TranslationGroup[]
  draft: string
}

type ReaderProps = {
  book: BookFile
  words: SavedWord[]
  known: Set<string>
  onBack: () => void
  /** Present when the book is a part of a split book and a later part exists. */
  onNextPart?: () => void
  theme: Theme
  onToggleTheme: () => void
  /** The learner's own language, which words are translated into. */
  translationLanguage: string
  onOpenWords: () => void
  onPageChange: (page: number, pageCount: number) => void
  onSaveWord: (word: SavedWord) => Promise<void>
  onMarkKnown: (keys: string[]) => Promise<void>
}

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1)

export function Reader({ book, words, known, onBack, onNextPart, theme, onToggleTheme, translationLanguage, onOpenWords, onPageChange, onSaveWord, onMarkKnown }: ReaderProps) {
  const t = useMessages()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, updateSettings] = useReaderSettings()
  const textRef = useRef<HTMLDivElement>(null)

  const pages = useMemo(() => paginate(book.content), [book.content])
  const totalWords = useMemo(() => countWords(book.content), [book.content])
  const pageCount = Math.max(1, pages.length)
  const page = Math.min(pageCount - 1, Math.max(0, book.page ?? Math.round((book.progress / 100) * pageCount) - 1))
  const paragraphs = useMemo(() => pages[page] ?? [], [pages, page])
  const pageTokens = useMemo(() => paragraphs.map(tokenize), [paragraphs])
  const savedByKey = useMemo(() => new Map(words.map((word) => [wordKey(word.word), word])), [words])

  const statusOf = (key: string): 'new' | 'learning' | 'known' => {
    const saved = savedByKey.get(key)
    if (saved) return saved.known ? 'known' : 'learning'
    return known.has(key) ? 'known' : 'new'
  }

  const newKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const tokens of pageTokens) {
      for (const token of tokens) if (token.key && !savedByKey.has(token.key) && !known.has(token.key)) keys.add(token.key)
    }
    return Array.from(keys)
  }, [pageTokens, savedByKey, known])

  const title = bookTitleOf(book)
  const bookWordCount = useMemo(() => words.filter((word) => word.bookTitle === title).length, [words, title])

  function goTo(nextPage: number) {
    if (nextPage < 0 || nextPage >= pageCount || nextPage === page) return
    setPanel(null)
    onPageChange(nextPage, pageCount)
    textRef.current?.scrollTo({ top: 0 })
  }

  async function finishPage() {
    setBusy(true)
    try {
      await onMarkKnown(newKeys)
      // On the last page this records the book as fully read.
      if (page === pageCount - 1) onPageChange(page, pageCount)
      else goTo(page + 1)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.key === 'Escape') setPanel(null)
      if (panel) return
      if (event.key === 'ArrowRight') goTo(page + 1)
      if (event.key === 'ArrowLeft') goTo(page - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function selectWord(token: Token, paragraph: string) {
    const word = cleanWord(token.text)
    if (!word) return
    const { key } = token
    setPanel({
      word,
      key,
      context: sentenceAt(paragraph, token.start),
      loading: true,
      failed: false,
      groups: [],
      draft: savedByKey.get(key)?.translation ?? '',
    })
    try {
      const groups = await translateWord(word, book.language, translationLanguage)
      setPanel((current) => current?.key === key ? { ...current, loading: false, groups, draft: current.draft || groups[0]?.variants[0] || '' } : current)
    } catch {
      setPanel((current) => current?.key === key ? { ...current, loading: false, failed: true } : current)
    }
  }

  function buildWord(current: Panel): SavedWord {
    const existing = savedByKey.get(current.key)
    const translation = current.draft.trim()
    if (existing) return { ...existing, translation: translation || existing.translation, context: existing.context || current.context }
    return {
      id: crypto.randomUUID(),
      word: current.word.toLowerCase(),
      translation,
      bookTitle: title,
      language: book.language,
      context: current.context,
      level: 1,
      dueAt: schedule(1),
      known: false,
    }
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function saveTranslation() {
    if (!panel?.draft.trim()) return
    void runAction(() => onSaveWord(buildWord(panel)))
  }

  function changeLevel(level: number) {
    if (!panel) return
    const existing = savedByKey.get(panel.key)
    if (level > MAX_LEVEL && !existing) {
      void runAction(() => onMarkKnown([panel.key]))
      return
    }
    void runAction(() => onSaveWord(setLevel(buildWord(panel), level)))
  }

  const saved = panel ? savedByKey.get(panel.key) : undefined
  const panelStatus = panel ? statusOf(panel.key) : 'new'
  const activeLevel = saved ? (saved.known ? MAX_LEVEL + 1 : saved.level) : panelStatus === 'known' ? MAX_LEVEL + 1 : 0
  const translationUnchanged = Boolean(saved && saved.translation === panel?.draft.trim())
  const isLastPage = page === pageCount - 1
  const languageName = getLanguage(book.language).name

  return (
    <>
      <header className="reader-topbar">
        <button className="icon-button back-button" onClick={onBack} aria-label={t.reader.back}><ArrowLeft size={19} /></button>
        <div className="reader-heading"><span>{book.part ? t.reader.partOf(book.part, book.partCount ?? book.part) : t.reader.reading}</span><strong>{title}</strong></div>
        <div className="reader-tools">
          <button className={settingsOpen ? 'icon-button text-settings-button active' : 'icon-button text-settings-button'} onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-label={t.reader.textSettings} title={t.reader.textSettings}><Type size={17} /></button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="quiet-button" onClick={onOpenWords}><Bookmark size={16} /> <span>{t.reader.myWords}</span></button>
          {settingsOpen && (
            <div className="text-settings" role="dialog" aria-label={t.reader.textSettings}>
              <div className="text-settings-row">
                <span>{t.reader.size}</span>
                <div className="stepper">
                  <button className="icon-button" onClick={() => updateSettings({ fontSize: settings.fontSize - 1 })} disabled={settings.fontSize <= FONT_SIZE_RANGE.min} aria-label={t.reader.smaller}><Minus size={15} /></button>
                  <strong>{settings.fontSize}</strong>
                  <button className="icon-button" onClick={() => updateSettings({ fontSize: settings.fontSize + 1 })} disabled={settings.fontSize >= FONT_SIZE_RANGE.max} aria-label={t.reader.bigger}><Plus size={15} /></button>
                </div>
              </div>
              <div className="text-settings-row column">
                <span>{t.reader.spacing}</span>
                <div className="segmented">{LINE_HEIGHTS.map((option) => (
                  <button key={option.value} className={settings.lineHeight === option.value ? 'selected' : ''} aria-pressed={settings.lineHeight === option.value} onClick={() => updateSettings({ lineHeight: option.value })}>{t.reader.lineHeights[option.name]}</button>
                ))}</div>
              </div>
              <div className="text-settings-row column">
                <span>{t.reader.font}</span>
                <div className="segmented">
                  <button className={settings.font === 'serif' ? 'selected serif-sample' : 'serif-sample'} aria-pressed={settings.font === 'serif'} onClick={() => updateSettings({ font: 'serif' })}>{t.reader.serif}</button>
                  <button className={settings.font === 'sans' ? 'selected' : ''} aria-pressed={settings.font === 'sans'} onClick={() => updateSettings({ font: 'sans' })}>{t.reader.sans}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      <section className="reader-layout">
        <article className="reading-column">
          <div className="reading-meta"><span>{book.author}</span><span>{languageName.toUpperCase()}</span><span>{book.format}</span></div>
          <h1 className="book-title" title={title}>{title}</h1>
          {book.part && <p className="part-subtitle" title={partTitle(book.title, book.part, t)}>{partTitle(book.title, book.part, t)}</p>}
          <div className="reading-hint">
            <span className="legend legend-new">{t.reader.legendNew}</span>
            <span className="legend legend-learning">{t.reader.legendLearning}</span>
            <span>{t.reader.tapHint}</span>
          </div>
          <div className="book-text" ref={textRef} style={readerTextStyle(settings)}>
            {book.content ? pageTokens.map((tokens, paragraphIndex) => (
              <p key={`${page}-${paragraphIndex}`}>
                {tokens.map((token, index) => {
                  if (!token.key) return token.text
                  const status = statusOf(token.key)
                  const level = status === 'learning' ? ` level-${savedByKey.get(token.key)?.level}` : ''
                  const selected = panel?.key === token.key ? ' selected' : ''
                  return <button className={`word-token is-${status}${level}${selected}`} key={index} onClick={() => void selectWord(token, paragraphs[paragraphIndex])}>{token.text}</button>
                })}
              </p>
            )) : <div className="book-loading"><LoaderCircle size={17} className="spin" /> {t.reader.loading}</div>}
          </div>
          {book.content && (
            <div className="page-controls">
              <button className="icon-button" onClick={() => goTo(page - 1)} disabled={page === 0} aria-label={t.reader.previous}><ChevronLeft size={19} /></button>
              <span>{t.reader.page(page + 1, pageCount)}</span>
              {newKeys.length > 0
                ? <button className="finish-page" onClick={() => void finishPage()} disabled={busy}><Check size={16} />{isLastPage ? t.reader.knowAll(newKeys.length) : t.reader.knowAndNext(newKeys.length)}</button>
                : isLastPage && onNextPart
                  ? <button className="finish-page" onClick={onNextPart}>{t.reader.nextPart} <ChevronRight size={16} /></button>
                  : <button className="icon-button" onClick={() => goTo(page + 1)} disabled={isLastPage} aria-label={t.reader.next}><ChevronRight size={19} /></button>}
            </div>
          )}
          <div className="reading-footer"><span>{t.reader.totalWords(totalWords.toLocaleString(t.locale))}</span><span>{t.common.percentRead(book.progress)}</span></div>
        </article>
        <aside className="reader-side-note">
          <div className="book-progress-label"><span>{t.reader.yourProgress}</span><span>{book.progress}%</span></div>
          <div className="progress-track"><span style={{ width: `${book.progress}%` }} /></div>
          <div className="reader-stat"><Bookmark size={18} /><span><strong>{bookWordCount}</strong><small>{t.reader.bookWords}</small></span></div>
          <div className="reader-stat"><Sparkles size={18} /><span><strong>{newKeys.length}</strong><small>{t.reader.newOnPage}</small></span></div>
        </aside>
      </section>
      {panel && (
        <div className="translation-scrim" onClick={() => setPanel(null)}>
          <section className="translation-panel" role="dialog" aria-modal="true" aria-label={t.reader.translationOf(panel.word)} onClick={(event) => event.stopPropagation()}>
            <button className="icon-button panel-close" onClick={() => setPanel(null)} aria-label={t.common.close}><X size={18} /></button>
            <span className="panel-kicker">{panelStatus === 'known' ? t.reader.known : panelStatus === 'learning' ? t.reader.learning : t.reader.newWord}</span>
            <div className="translation-wordline"><h2>{panel.word}</h2><button className="icon-button sound-button" onClick={() => speak(panel.word, book.language)} aria-label={t.common.speak}><Volume2 size={19} /></button></div>
            {panel.context && <p className="translation-context">{tokenize(panel.context).map((token, index) => token.key === panel.key ? <mark key={index}>{token.text}</mark> : token.text)}</p>}
            {panel.loading
              ? <div className="translation-loading"><LoaderCircle size={17} className="spin" /> {t.reader.searching}</div>
              : panel.groups.length
                ? <div className="variant-groups">{panel.groups.map((group) => (
                  <div className="variant-list" key={group.pos || 'main'}>
                    {group.pos && <span className="variant-pos">{t.reader.pos[group.pos as keyof typeof t.reader.pos] ?? group.pos}</span>}
                    {group.variants.map((variant) => <button className={panel.draft === variant ? 'variant selected' : 'variant'} key={variant} onClick={() => setPanel({ ...panel, draft: variant })}>{variant}</button>)}
                  </div>
                ))}</div>
                : <p className="translation-result">{panel.failed ? t.reader.offline : t.reader.notFound}</p>}
            <label className="translation-input">{t.reader.yourTranslation}<input value={panel.draft} placeholder={t.reader.yourVariant} onChange={(event) => setPanel({ ...panel, draft: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') saveTranslation() }} /></label>
            <div className="status-row" role="group" aria-label={t.reader.howWell}>
              <span>{t.reader.status}</span>
              {LEVELS.map((level) => <button key={level} className={`status-pill level-${level}${activeLevel === level ? ' active' : ''}`} aria-pressed={activeLevel === level} disabled={busy || (!saved && !panel.draft.trim())} onClick={() => changeLevel(level)}>{level}</button>)}
              <button className={`status-pill status-known${activeLevel > MAX_LEVEL ? ' active' : ''}`} aria-pressed={activeLevel > MAX_LEVEL} aria-label={t.reader.knowIt} disabled={busy} onClick={() => changeLevel(MAX_LEVEL + 1)}><Check size={14} /></button>
            </div>
            <div className="panel-divider" />
            <button className={translationUnchanged ? 'save-word saved' : 'save-word'} disabled={busy || translationUnchanged || !panel.draft.trim()} onClick={saveTranslation}>
              {translationUnchanged ? <Check size={17} /> : <Bookmark size={17} />}{translationUnchanged ? t.reader.saved : saved ? t.reader.update : t.reader.save}
            </button>
          </section>
        </div>
      )}
    </>
  )
}
