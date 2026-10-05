import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, LoaderCircle } from 'lucide-react'
import { findCatalogBook, loadCatalogChapters } from './catalog'
import type { BookFile, KnownWords, SavedWord } from './domain'
import { defaultTranslationLanguage, TRANSLATION_LANGUAGES } from './languages'
import { normalizeProfile } from './profile'
import { Reader } from './Reader'
import { normalizeWord } from './srs'
import { loadCollection, saveCollection } from './storage'
import { splitIntoParts, wordKey } from './text'
import { useTheme } from './theme'

// The trial reader keeps its words where the app keeps a guest's, so they are waiting in Ling (and move into the
// account on sign-up) when the reader goes on to the app.
const GUEST = 'anonymous'
const params = new URLSearchParams(window.location.search)
const slug = params.get('book') ?? ''
const entry = findCatalogBook(slug)
/** The language of the library page the reader is embedded in: a first guess for the translation language. */
const pageLanguage = params.get('lang') ?? ''
const pageKey = `ling-try-page:${slug}`

function readPage(): number | undefined {
  try {
    const page = Number(localStorage.getItem(pageKey))
    return Number.isInteger(page) && page > 0 ? page : undefined
  } catch {
    return undefined
  }
}

/** Opens the whole app with this book, outside the frame the trial reader runs in. */
function openInApp() {
  window.open(new URL(`./?book=${encodeURIComponent(slug)}`, window.location.href).href, '_top')
}

async function loadGuest() {
  const [words, known, profile] = await Promise.all([
    loadCollection<SavedWord[]>('words', `${GUEST}:words`, 'ling-words', []),
    loadCollection<KnownWords>('words', `${GUEST}:known`, '', {}),
    loadCollection<unknown>('words', `${GUEST}:profile`, '', null),
  ])
  const translation = normalizeProfile(profile).translationLanguage
    ?? (TRANSLATION_LANGUAGES.some((language) => language.code === pageLanguage) ? pageLanguage : defaultTranslationLanguage())
  return { words: words.map(normalizeWord), known, translation }
}

/** The app's reader on a Ling Library book page: the first part of the book, no account needed. */
export function TryReader() {
  const [theme, toggleTheme] = useTheme()
  const [book, setBook] = useState<BookFile | null>(null)
  const [words, setWords] = useState<SavedWord[]>([])
  const [known, setKnown] = useState<KnownWords>({})
  const [translationLanguage, setTranslationLanguage] = useState('ru')
  const [failed, setFailed] = useState(!entry)
  const [savedHere, setSavedHere] = useState(0)
  const bookLanguage = book?.language ?? ''
  const knownKeys = useMemo(() => new Set(known[bookLanguage] ?? []), [known, bookLanguage])

  useEffect(() => {
    if (!entry) return
    let isActive = true
    Promise.all([loadCatalogChapters(entry), loadGuest()]).then(([sections, guest]) => {
      if (!isActive) return
      const parts = splitIntoParts(sections)
      const details = { id: `try:${entry.slug}`, author: entry.author, format: 'LING', language: entry.language, progress: 0, page: readPage() }
      setBook(parts.length === 1
        ? { ...details, title: entry.title, content: parts[0].content }
        : { ...details, title: `Часть 1${parts[0].title ? ` · ${parts[0].title}` : ''}`, content: parts[0].content, collectionTitle: entry.title, part: 1, partCount: parts.length })
      setWords(guest.words)
      setKnown(guest.known)
      setTranslationLanguage(guest.translation)
    }, () => { if (isActive) setFailed(true) })
    return () => { isActive = false }
  }, [])

  if (failed || !entry) {
    return <div className="try-message"><BookOpen size={22} /><p>Не удалось открыть книгу.</p><button className="primary-action" onClick={openInApp}>Открыть в Ling</button></div>
  }
  if (!book) {
    return <div className="try-message"><LoaderCircle size={22} className="spin" /></div>
  }
  const language = book.language

  // Each change re-reads the stored lists first, so words saved meanwhile in the app (another tab) are kept.
  async function saveWord(word: SavedWord) {
    const stored = (await loadGuest()).words
    const key = wordKey(word.word)
    const index = stored.findIndex((item) => item.id === word.id || (item.language === word.language && wordKey(item.word) === key))
    const next = index >= 0 ? stored.map((item, itemIndex) => itemIndex === index ? { ...word, id: item.id } : item) : [word, ...stored]
    await saveCollection('words', `${GUEST}:words`, next)
    setWords(next)
    if (index < 0) setSavedHere((count) => count + 1)
  }

  async function markKnown(keys: string[]) {
    const { known: stored, words: storedWords } = await loadGuest()
    const list = stored[language] ?? []
    const skip = new Set([...list, ...storedWords.filter((word) => word.language === language).map((word) => wordKey(word.word))])
    const fresh = Array.from(new Set(keys)).filter((key) => key && !skip.has(key))
    const next = fresh.length ? { ...stored, [language]: [...list, ...fresh] } : stored
    if (fresh.length) await saveCollection('words', `${GUEST}:known`, next)
    setKnown(next)
  }

  function changePage(page: number) {
    setBook((current) => current && { ...current, page })
    try {
      localStorage.setItem(pageKey, String(page))
    } catch {
      // The page is only remembered for this visit.
    }
  }

  return (
    <main className="main-area try-reader">
      <Reader
        book={book}
        words={words}
        known={knownKeys}
        onBack={openInApp}
        onNextPart={openInApp}
        theme={theme}
        onToggleTheme={toggleTheme}
        translationLanguage={translationLanguage}
        onOpenWords={openInApp}
        onPageChange={changePage}
        onSaveWord={saveWord}
        onMarkKnown={markKnown}
      />
      <div className="try-bar">
        <span>{savedHere > 0 ? `Сохранено слов: ${savedHere}. Они уже ждут тебя в Ling.` : 'Нажми на любое слово, чтобы увидеть перевод.'}</span>
        <button className="primary-action" onClick={openInApp}>Читать в Ling <ArrowRight size={15} /></button>
      </div>
    </main>
  )
}
