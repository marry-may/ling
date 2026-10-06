import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, BookMarked, BookOpen, Bookmark, CalendarDays, Check, ChevronDown, Cloud, ChartColumn, Dumbbell, FilePlus2, Flame, Globe, GraduationCap, Library, LoaderCircle, LogOut, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { AdminPage } from './AdminPage'
import { GrammarPage } from './GrammarPage'
import type { Lesson } from './grammar'
import { isAdmin, trackPageView } from './analytics'
import { AccountButton, AuthForm, WelcomeScreen, type AuthFormProps, type AuthMode } from './Account'
import { authErrorText, LANDING_TEXT, type LandingLanguage } from './landingText'
import { isUiLanguage, messages, partTitle, setUiLanguage, UI_LANGUAGES, useMessages, useUiLanguage, type UiLanguage } from './i18n'
import { readBookFile } from './bookImport'
import { catalogBookOf, coverUrl, findCatalogBook, loadCatalogChapters, shelfCopies, type CatalogBook } from './catalog'
import { CatalogPage } from './CatalogPage'
import { deleteAccountBooks, deleteAccountKnownWord, deleteAccountWord, downloadAccountBookContent, getAccountBooks, getAccountKnownWords, getAccountProfile, getAccountWords, saveAccountKnownWords, saveAccountProfile, saveAccountWords, PARTS_MIGRATION_MESSAGE, updateAccountProgress, uploadAccountBook, uploadAccountCollection, uploadGuestLibrary } from './cloud'
import { bookTitleOf, type BookFile, type KnownWords, type SavedWord } from './domain'
import { DEFAULT_LANGUAGE, defaultTranslationLanguage, getLanguage, LANGUAGES } from './languages'
import { TranslationLanguageSelect } from './TranslationLanguageSelect'
import { Landing } from './Landing'
import { LanguagePicker } from './LanguagePicker'
import { currentStreak, EMPTY_PROFILE, lastWeek, mergeProfiles, normalizeProfile, recordDay, sameProfile, type Profile } from './profile'
import { Reader } from './Reader'
import { SAMPLE_BOOKS } from './sampleBooks'
import { isDue, normalizeWord } from './srs'
import { loadCollection, saveCollection } from './storage'
import { cloudEnabled, siteUrl, supabase } from './supabase'
import { splitIntoParts, wordKey, type Section } from './text'
import { useTheme } from './theme'
import { ThemeToggle } from './ThemeToggle'
import { Training } from './Training'
import { WordsPage } from './WordsPage'
import './App.css'

const LANGUAGE_STORAGE_KEY = 'ling-study-language'
const WELCOME_SKIPPED_KEY = 'ling-welcome-skipped'

function readWelcomeSkipped(): boolean {
  try {
    return localStorage.getItem(WELCOME_SKIPPED_KEY) === '1'
  } catch {
    return false
  }
}

/** The page reached in the trial reader on a Ling Library book page (src/TryReader.tsx). */
function readTrialPage(slug: string): number | undefined {
  try {
    const page = Number(localStorage.getItem(`ling-try-page:${slug}`))
    return Number.isInteger(page) && page > 0 ? page : undefined
  } catch {
    return undefined
  }
}

function readStudyLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Languages in use, most books first. The demo book alone does not make English a studied language. */
function activeLanguagesOf(books: BookFile[], words: SavedWord[], profile: Profile): string[] {
  const counts = new Map<string, number>()
  for (const code of profile.languages) counts.set(code, 0)
  const seen = new Set<string>()
  for (const book of books) {
    const key = book.collectionId ?? book.id
    if (book.format === 'DEMO' || seen.has(key)) continue
    seen.add(key)
    counts.set(book.language, (counts.get(book.language) ?? 0) + 1)
  }
  for (const word of words) if (!counts.has(word.language)) counts.set(word.language, 0)
  return Array.from(counts).sort((a, b) => b[1] - a[1]).map(([code]) => code)
}

/** Opens the language used last time if it has content, otherwise the one with the most books. */
function chooseLanguage(data: LoadedScope): string | null {
  const active = activeLanguagesOf(data.books, data.words, data.profile)
  if (!active.length) return null
  const hasContent = (code: string) => data.books.some((book) => book.language === code && book.format !== 'DEMO') || data.words.some((word) => word.language === code)
  const stored = readStudyLanguage()
  if (stored && active.includes(stored) && (hasContent(stored) || !active.some(hasContent))) return stored
  return active[0]
}

type ShelfItem =
  | { kind: 'book'; book: BookFile }
  | { kind: 'folder'; id: string; parts: BookFile[] }

/** Library items in shelf order; the parts of a split book are gathered into one folder. */
function shelfOf(books: BookFile[]): ShelfItem[] {
  const items: ShelfItem[] = []
  const folders = new Map<string, BookFile[]>()
  for (const book of books) {
    if (!book.collectionId) {
      items.push({ kind: 'book', book })
      continue
    }
    let parts = folders.get(book.collectionId)
    if (!parts) {
      parts = []
      folders.set(book.collectionId, parts)
      items.push({ kind: 'folder', id: book.collectionId, parts })
    }
    parts.push(book)
  }
  for (const parts of folders.values()) parts.sort((a, b) => (a.part ?? 0) - (b.part ?? 0))
  return items
}

function folderProgress(parts: BookFile[]): number {
  return Math.round(parts.reduce((sum, part) => sum + part.progress, 0) / Math.max(1, parts.length))
}

/** The part to continue with: one already started, otherwise the first unfinished one. */
function currentPart(parts: BookFile[]): BookFile {
  return parts.find((part) => part.progress > 0 && part.progress < 100) ?? parts.find((part) => part.progress < 100) ?? parts[parts.length - 1]
}

function coverIndex(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 4
}

function normalizeBook(book: Partial<BookFile> & Pick<BookFile, 'id' | 'title'>): BookFile {
  return {
    ...book,
    author: book.author ?? messages().common.myLibraryAuthor,
    content: book.content ?? '',
    format: book.format ?? 'TXT',
    language: book.language ?? DEFAULT_LANGUAGE,
    progress: book.progress ?? 0,
  }
}

type NewBook = { title: string; author: string; format: string; language: string; content: string; sections?: Section[] }

type LoadedScope = { scope: string; books: BookFile[]; words: SavedWord[]; known: KnownWords; profile: Profile; offline: boolean }

async function loadScopeCollections(userId: string | null): Promise<LoadedScope> {
  const scope = userId ? `user:${userId}` : 'anonymous'
  const [storedBooks, storedWords, cachedKnown, storedProfile] = await Promise.all([
    loadCollection<BookFile[]>('books', `${scope}:books`, userId ? '' : 'ling-books', []),
    loadCollection<SavedWord[]>('words', `${scope}:words`, userId ? '' : 'ling-words', []),
    loadCollection<KnownWords>('words', `${scope}:known`, '', {}),
    loadCollection<Profile>('words', `${scope}:profile`, '', EMPTY_PROFILE),
  ])
  const cachedBooks = storedBooks.map(normalizeBook)
  const cachedWords = storedWords.map(normalizeWord)
  const cachedProfile = normalizeProfile(storedProfile)
  if (!userId) return { scope, books: cachedBooks, words: cachedWords, known: cachedKnown, profile: cachedProfile, offline: false }

  try {
    const [remoteBooks, remoteWords, remoteKnown, remoteProfile] = await Promise.all([getAccountBooks(userId), getAccountWords(userId), getAccountKnownWords(userId), getAccountProfile().catch(() => null)])
    // Without the account copy the device copy is used as is, so it cannot overwrite newer account data.
    const profile = remoteProfile ? mergeProfiles(cachedProfile, remoteProfile) : cachedProfile
    if (remoteProfile && !sameProfile(profile, remoteProfile)) void saveAccountProfile(profile).catch(() => undefined)
    const localBooks = new Map(cachedBooks.map((book) => [book.id, book]))
    const books = remoteBooks.map((book) => {
      const cached = localBooks.get(book.id)
      const samePosition = cached?.progress === book.progress
      return { ...book, content: cached?.content ?? '', page: samePosition ? cached.page : undefined }
    })
    await Promise.all([
      saveCollection('books', `${scope}:books`, books),
      saveCollection('words', `${scope}:words`, remoteWords),
      saveCollection('words', `${scope}:known`, remoteKnown),
      saveCollection('words', `${scope}:profile`, profile),
    ])
    return { scope, books, words: remoteWords, known: remoteKnown, profile, offline: false }
  } catch {
    return { scope, books: cachedBooks, words: cachedWords, known: cachedKnown, profile: cachedProfile, offline: true }
  }
}

const guestMigrationKey = (userId: string) => `ling-guest-migrated:${userId}`

/**
 * Copies the guest library into the account. Runs on every password sign-in (`force`) and once per
 * account otherwise, because confirming the email link signs in without going through the form.
 */
async function migrateGuestLibrary(userId: string, force: boolean): Promise<void> {
  try {
    if (!force && localStorage.getItem(guestMigrationKey(userId))) return
  } catch {
    // Without storage the copy runs again; uploadGuestLibrary skips books already in the account.
  }
  const guest = await loadScopeCollections(null)
  await uploadGuestLibrary(userId, guest.books, guest.words, guest.known)
  try {
    localStorage.setItem(guestMigrationKey(userId), '1')
  } catch {
    // See above.
  }
}

function App() {
  const [theme, toggleTheme] = useTheme()
  const t = useMessages()
  const uiLanguage = useUiLanguage()
  const [books, setBooks] = useState<BookFile[]>([])
  const [words, setWords] = useState<SavedWord[]>([])
  const [knownWords, setKnownWords] = useState<KnownWords>({})
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [studyLanguage, setStudyLanguage] = useState(() => readStudyLanguage() ?? DEFAULT_LANGUAGE)
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false)
  const [openCollection, setOpenCollection] = useState<string | null>(null)
  const [activeBook, setActiveBook] = useState<BookFile | null>(null)
  const [view, setView] = useState<'library' | 'catalog' | 'words' | 'training' | 'grammar' | 'admin'>('library')
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null)
  const [catalogBusy, setCatalogBusy] = useState<string | null>(null)
  // A book page on the site links here as ?book=<slug>; it opens once the visitor is in the app.
  const [pendingBook, setPendingBook] = useState<string | null>(() => {
    const slug = new URLSearchParams(window.location.search).get('book')
    return slug && findCatalogBook(slug) ? slug : null
  })
  const [notice, setNotice] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataScope, setDataScope] = useState('anonymous')
  const [accountUser, setAccountUser] = useState<User | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const pageViewTracked = useRef(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [welcomeSkipped, setWelcomeSkipped] = useState(readWelcomeSkipped)
  // Visitors who are not signed in see the landing page first; its buttons open the sign-in screen.
  const [authScreenOpen, setAuthScreenOpen] = useState(() => Boolean(pendingBook))
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const authFlowRef = useRef(false)
  const activeScopeRef = useRef('')
  // Word lists change several times in a row (e.g. marking a page known), so writes read the latest value from refs.
  const wordsRef = useRef<SavedWord[]>([])
  const knownRef = useRef<KnownWords>({})
  const profileRef = useRef<Profile>(EMPTY_PROFILE)
  const fileInput = useRef<HTMLInputElement>(null)

  const languageBooks = useMemo(() => books.filter((book) => book.language === studyLanguage), [books, studyLanguage])
  const languageWords = useMemo(() => words.filter((word) => word.language === studyLanguage), [words, studyLanguage])
  const knownCount = (knownWords[studyLanguage]?.length ?? 0) + languageWords.filter((word) => word.known).length
  const dueCount = useMemo(() => languageWords.filter((word) => isDue(word)).length, [languageWords])
  const readerWords = useMemo(() => activeBook ? words.filter((word) => word.language === activeBook.language) : [], [words, activeBook])
  const readerKnown = useMemo(() => new Set(activeBook ? knownWords[activeBook.language] ?? [] : []), [knownWords, activeBook])
  const shelf = useMemo(() => shelfOf(languageBooks), [languageBooks])
  const openFolder = shelf.find((item): item is Extract<ShelfItem, { kind: 'folder' }> => item.kind === 'folder' && item.id === openCollection)
  const nextPart = activeBook?.collectionId ? books.find((book) => book.collectionId === activeBook.collectionId && book.part === (activeBook.part ?? 0) + 1) : undefined
  const adminUser = Boolean(accountUser && adminId === accountUser.id)
  const activeLanguages = useMemo(() => activeLanguagesOf(books, words, profile), [books, words, profile])
  const activity = profile.activity[studyLanguage]
  const translationLanguage = profile.translationLanguage ?? defaultTranslationLanguage()
  const streak = currentStreak(activity)
  const bookCountByLanguage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of shelfOf(books)) {
      const language = item.kind === 'book' ? item.book.language : item.parts[0].language
      counts.set(language, (counts.get(language) ?? 0) + 1)
    }
    return counts
  }, [books])

  function applyScope(data: LoadedScope) {
    activeScopeRef.current = data.scope
    wordsRef.current = data.words
    knownRef.current = data.known
    profileRef.current = data.profile
    setDataScope(data.scope)
    setBooks(data.books)
    setWords(data.words)
    setKnownWords(data.known)
    setProfile(data.profile)
    const language = chooseLanguage(data)
    if (language) setStudyLanguage(language)
  }

  useEffect(() => {
    let isActive = true
    let unsubscribe = () => {}

    const activateScope = async (user: User | null) => {
      // A cancelled effect run (React StrictMode) must not claim the scope the live run is about to load.
      if (!isActive) return
      const scope = user ? `user:${user.id}` : 'anonymous'
      setAccountUser(user)
      if (activeScopeRef.current === scope) return
      activeScopeRef.current = scope
      setIsLoadingData(true)
      try {
        let migrationFailed = false
        if (user) await migrateGuestLibrary(user.id, false).catch(() => { migrationFailed = true })
        const stored = await loadScopeCollections(user?.id ?? null)
        if (!isActive) return
        applyScope(stored)
        if (stored.offline) setNotice(messages().notices.offline)
        else if (migrationFailed) setNotice(messages().notices.migrationPartial)
      } catch {
        if (isActive) setNotice(messages().notices.loadFailed)
      } finally {
        if (isActive) setIsLoadingData(false)
      }
    }

    const initialize = async () => {
      if (!supabase) {
        await activateScope(null)
        return
      }
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      await activateScope(data.session?.user ?? null)
      if (!isActive) return
      const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null
        if (authFlowRef.current) {
          setAccountUser(user)
          return
        }
        // Supabase must not be called from inside this callback, so loading waits for the next tick.
        setTimeout(() => void activateScope(user), 0)
      })
      unsubscribe = () => authData.subscription.unsubscribe()
    }

    void initialize().catch(() => {
      if (isActive) {
        setNotice(messages().notices.storageFailed)
        setIsLoadingData(false)
      }
    })
    return () => {
      isActive = false
      // Let a re-run of this effect (React StrictMode) load the scope again instead of skipping it.
      activeScopeRef.current = ''
      unsubscribe()
    }
  }, [])

  // The admin center tab is shown to admins only; the statistics themselves are refused to anyone else by the database.
  useEffect(() => {
    if (!accountUser) return
    let isActive = true
    void isAdmin().then((admin) => { if (isActive) setAdminId(admin ? accountUser.id : null) })
    return () => { isActive = false }
  }, [accountUser])

  // One page view per load, once it is known whether the visitor sees the landing page or the app.
  useEffect(() => {
    if (isLoadingData || pageViewTracked.current) return
    pageViewTracked.current = true
    const onLanding = cloudEnabled && !accountUser && !welcomeSkipped && !authScreenOpen
    trackPageView(onLanding ? 'landing' : 'app', accountUser?.id ?? null)
  }, [isLoadingData, accountUser, welcomeSkipped, authScreenOpen])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('book')) return
    url.searchParams.delete('book')
    window.history.replaceState(null, '', url)
  }, [])

  function changeStudyLanguage(language: string) {
    setStudyLanguage(language)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The choice still applies for this session.
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true)
    setAuthMessage('')
    authFlowRef.current = true
    const text = LANDING_TEXT[uiLanguage].auth
    try {
      const result = authMode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        : await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          // The new account starts with the chosen translation language in its profile.
          options: { emailRedirectTo: siteUrl, data: { ling_profile: { ...EMPTY_PROFILE, translationLanguage, uiLanguage } } },
        })
      if (result.error) throw result.error
      if (!result.data.session || !result.data.user) {
        setAuthMessage(text.checkEmail(authEmail.trim(), new URL(siteUrl).host))
        return
      }

      let migrationMessage = ''
      try {
        await migrateGuestLibrary(result.data.user.id, true)
      } catch {
        migrationMessage = ` ${t.notices.migrationPartial}`
      }
      applyScope(await loadScopeCollections(result.data.user.id))
      setAccountUser(result.data.user)
      setAccountOpen(false)
      setAuthPassword('')
      setNotice(`${t.notices.connected}${migrationMessage}`)
    } catch (error) {
      setAuthMessage(authErrorText(error, text))
    } finally {
      authFlowRef.current = false
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    authFlowRef.current = true
    setAuthBusy(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      applyScope(await loadScopeCollections(null))
      setActiveBook(null)
      setAccountUser(null)
      setAccountOpen(false)
    } catch {
      setAuthMessage(t.notices.signOutFailed)
    } finally {
      authFlowRef.current = false
      setAuthBusy(false)
    }
  }

  async function persistBooks(nextBooks: BookFile[]) {
    await saveCollection('books', `${dataScope}:books`, nextBooks)
    setBooks(nextBooks)
  }

  async function persistWords(nextWords: SavedWord[]) {
    wordsRef.current = nextWords
    setWords(nextWords)
    await saveCollection('words', `${dataScope}:words`, nextWords)
  }

  function persistProfile(nextProfile: Profile) {
    profileRef.current = nextProfile
    setProfile(nextProfile)
    void saveCollection('words', `${dataScope}:profile`, nextProfile).catch(() => undefined)
    if (accountUser) void saveAccountProfile(nextProfile).catch(() => undefined)
  }

  /** Counts today as a study day for the language; called on reading, saving words and training. */
  function recordActivity(language: string) {
    const nextProfile = recordDay(profileRef.current, language)
    if (nextProfile) persistProfile(nextProfile)
  }

  function changeUiLanguage(code: UiLanguage) {
    setUiLanguage(code)
    persistProfile({ ...profileRef.current, uiLanguage: code })
  }

  function changeTranslationLanguage(code: string) {
    persistProfile({ ...profileRef.current, translationLanguage: code })
  }

  function addLanguage(code: string) {
    const current = profileRef.current
    const giveSample = Boolean(SAMPLE_BOOKS[code]) && !current.samples?.includes(code) && !books.some((book) => book.language === code)
    persistProfile({
      ...current,
      languages: current.languages.includes(code) ? current.languages : [...current.languages, code],
      samples: giveSample ? [...(current.samples ?? []), code] : current.samples,
    })
    changeStudyLanguage(code)
    setLanguageDialogOpen(false)
    showLibrary()
    if (giveSample) void addSampleBook(code)
  }

  /** Puts the starter book for a language on the shelf, and into the account when signed in. */
  async function addSampleBook(language: string) {
    const sample = SAMPLE_BOOKS[language]
    let book: BookFile = { id: crypto.randomUUID(), ...sample, format: 'TXT', language, progress: 0 }
    if (accountUser) {
      try {
        book = await uploadAccountBook(accountUser.id, book, new File([sample.content], `${sample.title}.txt`, { type: 'text/plain' }))
      } catch {
        setNotice(t.notices.sampleNotUploaded)
      }
    }
    try {
      await persistBooks([book, ...books])
    } catch {
      setNotice(t.notices.sampleFailed)
    }
  }

  async function persistKnown(nextKnown: KnownWords) {
    knownRef.current = nextKnown
    setKnownWords(nextKnown)
    await saveCollection('words', `${dataScope}:known`, nextKnown)
  }

  /**
   * Creates a book from its text, or a folder of parts when it is long, and uploads it to the account when
   * signed in. A failed upload keeps the book on this device and returns a warning for the notice.
   */
  async function createBooks(source: NewBook, file: File): Promise<{ books: BookFile[]; warning: string }> {
    const details = { author: source.author, format: source.format, language: source.language, progress: 0 }
    const uploadFailed = ` ${t.notices.uploadFailed}`
    const parts = splitIntoParts(source.sections ?? [{ content: source.content }])
    if (parts.length === 1) {
      const book: BookFile = { id: crypto.randomUUID(), title: source.title, content: parts[0].content, ...details }
      if (!accountUser || !book.content.trim()) return { books: [book], warning: '' }
      try {
        return { books: [await uploadAccountBook(accountUser.id, book, file)], warning: '' }
      } catch {
        return { books: [book], warning: uploadFailed }
      }
    }

    // A long book becomes a folder of parts that are read, synced and tracked one by one.
    const collectionId = crypto.randomUUID()
    const books: BookFile[] = parts.map((part, index) => ({
      id: crypto.randomUUID(),
      title: `${t.common.part(index + 1)}${part.title ? ` · ${part.title}` : ''}`,
      content: part.content,
      collectionId,
      collectionTitle: source.title,
      part: index + 1,
      partCount: parts.length,
      ...details,
    }))
    if (!accountUser) return { books, warning: '' }
    try {
      return { books: await uploadAccountCollection(accountUser.id, books, file), warning: '' }
    } catch (error) {
      return { books, warning: error instanceof Error && error.message === PARTS_MIGRATION_MESSAGE ? ` ${error.message}` : uploadFailed }
    }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return
    setIsImporting(true)
    setNotice('')
    try {
      let uploadWarning = ''
      const imported = (await Promise.all(Array.from(files).map(async (file): Promise<BookFile[]> => {
        const { language: detectedLanguage, sections, ...parsed } = await readBookFile(file, { fallbackLanguage: studyLanguage, onProgress: setNotice })
        const created = await createBooks({
          title: parsed.title ?? file.name.replace(/\.[^.]+$/, ''),
          author: parsed.author ?? t.common.myLibraryAuthor,
          format: file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
          language: LANGUAGES.some((language) => language.code === detectedLanguage) ? detectedLanguage! : studyLanguage,
          content: parsed.content,
          sections,
        }, file)
        uploadWarning ||= created.warning
        return created.books
      }))).flat()
      const usable = imported.filter((book) => book.content.trim())
      await persistBooks([...usable, ...books])
      if (!usable.length) {
        setNotice(t.notices.noText)
        return
      }
      const otherLanguage = usable.find((book) => book.language !== studyLanguage)?.language
      if (otherLanguage && !usable.some((book) => book.language === studyLanguage)) changeStudyLanguage(otherLanguage)
      const bookCount = new Set(usable.map((book) => book.collectionId ?? book.id)).size
      const splitInto = usable.find((book) => book.partCount)?.partCount
      setNotice(`${t.notices.added(bookCount, otherLanguage ? getLanguage(otherLanguage).name : '', splitInto ?? 0)}${uploadWarning}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.openFailed)
    } finally {
      setIsImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  /** Deletes a book, or all parts of a split book at once. */
  async function deleteBooks(targets: BookFile[]) {
    const title = bookTitleOf(targets[0])
    if (!window.confirm(t.notices.confirmDelete(title, targets.length))) return
    try {
      const synced = targets.filter((book) => book.cloudContentPath)
      if (accountUser && synced.length) await deleteAccountBooks(accountUser.id, synced)
      const ids = new Set(targets.map((book) => book.id))
      await persistBooks(books.filter((item) => !ids.has(item.id)))
      setOpenCollection(null)
    } catch {
      setNotice(t.notices.deleteFailed)
    }
  }

  async function saveWord(word: SavedWord) {
    recordActivity(word.language)
    const current = wordsRef.current
    const key = wordKey(word.word)
    const index = current.findIndex((item) => item.id === word.id || (item.language === word.language && wordKey(item.word) === key))
    const nextWords = index >= 0
      ? current.map((item, itemIndex) => itemIndex === index ? { ...word, id: item.id } : item)
      : [word, ...current]
    try {
      await persistWords(nextWords)
    } catch {
      setNotice(t.notices.wordFailed)
      return
    }
    if (accountUser) {
      try {
        await saveAccountWords(accountUser.id, [nextWords[index >= 0 ? index : 0]])
      } catch {
        setNotice(t.notices.wordNotSynced)
      }
    }

    const knownList = knownRef.current[word.language] ?? []
    if (knownList.includes(key)) {
      await persistKnown({ ...knownRef.current, [word.language]: knownList.filter((item) => item !== key) }).catch(() => undefined)
      if (accountUser) void deleteAccountKnownWord(accountUser.id, word.language, key).catch(() => undefined)
    }
  }

  async function markKnown(language: string, keys: string[]) {
    const list = knownRef.current[language] ?? []
    const alreadyKnown = new Set(list)
    const savedKeys = new Set(wordsRef.current.filter((word) => word.language === language).map((word) => wordKey(word.word)))
    const fresh = Array.from(new Set(keys)).filter((key) => key && !alreadyKnown.has(key) && !savedKeys.has(key))
    if (!fresh.length) return
    try {
      await persistKnown({ ...knownRef.current, [language]: [...list, ...fresh] })
    } catch {
      setNotice(t.notices.knownFailed)
      return
    }
    if (accountUser) {
      try {
        await saveAccountKnownWords(accountUser.id, language, fresh)
      } catch {
        setNotice(t.notices.knownNotSynced)
      }
    }
  }

  async function deleteWord(wordId: string) {
    try {
      if (accountUser) await deleteAccountWord(accountUser.id, wordId)
      await persistWords(wordsRef.current.filter((word) => word.id !== wordId))
    } catch {
      setNotice(t.notices.wordDeleteFailed)
    }
  }

  function updatePage(bookId: string, page: number, pageCount: number) {
    const language = books.find((book) => book.id === bookId)?.language
    if (language) recordActivity(language)
    const progress = Math.round(((page + 1) / pageCount) * 100)
    const nextBooks = books.map((book) => book.id === bookId ? { ...book, page, progress } : book)
    setBooks(nextBooks)
    setActiveBook((book) => book ? { ...book, page, progress } : null)
    void saveCollection('books', `${dataScope}:books`, nextBooks).catch(() => setNotice(t.notices.progressFailed))
    if (accountUser) void updateAccountProgress(accountUser.id, bookId, progress).catch(() => setNotice(t.notices.progressNotSynced))
  }

  async function openBook(book: BookFile) {
    setPendingBook(null)
    setView('library')
    setNotice('')
    setActiveBook(book)
    if (book.content || !book.cloudContentPath) return
    try {
      const content = await downloadAccountBookContent(book.cloudContentPath)
      const loadedBook = { ...book, content }
      setActiveBook(loadedBook)
      await persistBooks(books.map((item) => item.id === book.id ? loadedBook : item))
    } catch {
      setNotice(t.notices.bookLoadFailed)
    }
  }

  function showLibrary() {
    setPendingBook(null)
    setView('library')
    setActiveBook(null)
    setOpenCollection(null)
  }

  function showWords() {
    setPendingBook(null)
    setView('words')
    setActiveBook(null)
  }

  function showCatalog(slug: string | null = null) {
    setPendingBook(null)
    setView('catalog')
    setActiveBook(null)
    setCatalogSlug(slug)
  }

  /** Makes a language one of the learner's, without the starter book a newly added language gets. */
  function ensureLanguage(code: string) {
    const current = profileRef.current
    if (!current.languages.includes(code)) persistProfile({ ...current, languages: [...current.languages, code] })
    changeStudyLanguage(code)
  }

  /** Puts a Ling Library book on the learner's shelf (as a folder when long) and optionally opens it. */
  async function addCatalogBook(entry: CatalogBook, open: boolean) {
    const copies = shelfCopies(entry, books)
    if (copies.length) {
      if (open) void openBook(currentPart(copies))
      return
    }
    setCatalogBusy(entry.slug)
    try {
      const sections = await loadCatalogChapters(entry)
      const content = sections.map((section) => section.content).join('\n\n')
      const file = new File([content], `${entry.slug}.txt`, { type: 'text/plain' })
      const created = await createBooks({ title: entry.title, author: entry.author, format: 'LING', language: entry.language, content, sections }, file)
      // Pick up where the trial reader on the book's library page left off (it shows the first part).
      const trialPage = readTrialPage(entry.slug)
      if (trialPage) created.books[0] = { ...created.books[0], page: trialPage }
      await persistBooks([...created.books, ...books])
      ensureLanguage(entry.language)
      if (open) {
        void openBook(created.books[0])
        if (created.warning) setNotice(created.warning.trim())
      } else {
        setNotice(`${t.notices.catalogAdded(entry.title)}${created.warning}`)
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.notices.catalogFailed)
    } finally {
      setCatalogBusy(null)
    }
  }

  function showTraining() {
    setPendingBook(null)
    setView('training')
    setActiveBook(null)
  }

  function showGrammar() {
    setPendingBook(null)
    setView('grammar')
    setActiveBook(null)
  }

  /** Keeps the best result of a grammar lesson; finishing a lesson counts as a study day. */
  function saveGrammarResult(lesson: Lesson, percent: number) {
    const current = profileRef.current
    const best = Math.max(percent, current.grammar?.[lesson.id] ?? 0)
    if (best !== current.grammar?.[lesson.id]) persistProfile({ ...current, grammar: { ...current.grammar, [lesson.id]: best } })
    recordActivity(lesson.language)
  }

  function showAdmin() {
    setPendingBook(null)
    setView('admin')
    setActiveBook(null)
  }

  // The page language and tab title follow the interface language, on the landing page and in the app.
  useEffect(() => {
    document.documentElement.lang = uiLanguage
    document.title = LANDING_TEXT[uiLanguage].pageTitle
  }, [uiLanguage])

  // An account carries its interface language to every device it signs in on.
  const profileUiLanguage = profile.uiLanguage
  useEffect(() => {
    if (isUiLanguage(profileUiLanguage)) setUiLanguage(profileUiLanguage)
  }, [profileUiLanguage])
  // …and a language picked on the landing page replaces the one the profile kept.
  useEffect(() => {
    const kept = profileRef.current.uiLanguage
    if (kept && kept !== uiLanguage) persistProfile({ ...profileRef.current, uiLanguage })
  }, [uiLanguage]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoadingData) {
    return <div className="loading-screen"><span className="brand-mark"><BookOpen size={19} /></span><LoaderCircle size={19} className="spin" /></div>
  }

  const noticeBar = notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice('')} aria-label={t.nav.hideNotice}><X size={15} /></button></div>

  // Arriving from a book page (?book=…) shows that book in the Ling Library until the visitor goes elsewhere;
  // a first-time visitor browsing the Ling Library skips the language picker, since adding a book sets its language.
  const pendingShown = pendingBook && !activeBook && !(cloudEnabled && !accountUser && !welcomeSkipped) ? pendingBook : null
  const currentView = pendingShown ? 'catalog' : view
  const onboarding = !activeBook && !activeLanguages.length && currentView !== 'catalog'
  const showWelcome = cloudEnabled && !accountUser && !welcomeSkipped
  const openAccount = () => {
    setAuthMessage('')
    setAccountOpen(true)
  }
  const authForm: AuthFormProps = {
    mode: authMode,
    email: authEmail,
    password: authPassword,
    busy: authBusy,
    message: authMessage,
    onModeChange: (mode) => {
      setAuthMode(mode)
      setAuthMessage('')
    },
    onEmailChange: setAuthEmail,
    onPasswordChange: setAuthPassword,
    onSubmit: (event) => void handleAuthSubmit(event),
    translationLanguage,
    onTranslationLanguageChange: changeTranslationLanguage,
    text: LANDING_TEXT[uiLanguage].auth,
  }
  const skipWelcome = () => {
    setWelcomeSkipped(true)
    try {
      localStorage.setItem(WELCOME_SKIPPED_KEY, '1')
    } catch {
      // The welcome screen just shows again next time.
    }
  }

  if (showWelcome && !authScreenOpen) {
    const openAuth = (mode: AuthMode, landingLanguage: LandingLanguage) => {
      // The language the visitor read the landing page in is the best first guess for translations.
      if (!profileRef.current.translationLanguage) changeTranslationLanguage(landingLanguage)
      authForm.onModeChange(mode)
      setAuthScreenOpen(true)
      window.scrollTo({ top: 0 })
    }
    return <Landing theme={theme} onToggleTheme={toggleTheme} onSignUp={(language) => openAuth('signup', language)} onSignIn={(language) => openAuth('signin', language)} />
  }

  return (
    <div className={showWelcome || onboarding ? 'app-shell onboarding-mode' : 'app-shell'}>
      <aside className="sidebar">
        <a className="brand" href="#library" onClick={showLibrary} aria-label={t.nav.brand}>
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
          <span>ling<span className="brand-period">.</span></span>
        </a>
        <span className="side-label">{t.nav.space}</span>
        <nav className="side-nav" aria-label={t.nav.main}>
          <button className={!activeBook && currentView === 'library' ? 'nav-item selected' : 'nav-item'} onClick={showLibrary}><Library size={18} /> {t.nav.myBooks} <span className="nav-count">{shelf.length}</span></button>
          <button className={!activeBook && currentView === 'catalog' ? 'nav-item selected' : 'nav-item'} onClick={() => showCatalog()}><BookMarked size={18} /> {t.nav.catalog}</button>
          <button className={!activeBook && currentView === 'training' ? 'nav-item selected' : 'nav-item'} onClick={showTraining}><Dumbbell size={18} /> {t.nav.training} {dueCount > 0 && <span className="nav-count due">{dueCount}</span>}</button>
          <button className={!activeBook && currentView === 'grammar' ? 'nav-item selected' : 'nav-item'} onClick={showGrammar}><GraduationCap size={18} /> {t.nav.grammar}</button>
          <button className={!activeBook && currentView === 'words' ? 'nav-item selected' : 'nav-item'} onClick={showWords}><Bookmark size={18} /> {t.nav.words} <span className="nav-count">{languageWords.length}</span></button>
          {adminUser && <button className={!activeBook && currentView === 'admin' ? 'nav-item selected' : 'nav-item'} onClick={showAdmin}><ChartColumn size={18} /> {t.nav.admin}</button>}
        </nav>
        <div className="sidebar-bottom">
          <button className="streak-badge" onClick={showLibrary}><Flame size={17} /><span><strong>{streak} {t.common.days(streak)}</strong><small>{t.nav.streak(getLanguage(studyLanguage).name)}</small></span></button>
          <span className="side-footnote">{t.nav.motto}</span>
        </div>
      </aside>

      <main className="main-area">
        {!activeBook && (
          <div className="corner-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {!showWelcome && <AccountButton user={accountUser} onClick={openAccount} />}
          </div>
        )}
        {showWelcome ? (
          <WelcomeScreen form={authForm} lang={uiLanguage} onSkip={skipWelcome} onBack={() => setAuthScreenOpen(false)} note={pendingBook ? LANDING_TEXT[uiLanguage].auth.bookNote(findCatalogBook(pendingBook)?.title ?? '') : undefined} />
        ) : onboarding ? (
          <LanguagePicker exclude={[translationLanguage]} onPick={addLanguage} translation={{ value: translationLanguage, onChange: changeTranslationLanguage }} />
        ) : activeBook ? (
          <>
            {noticeBar}
            <Reader
              book={activeBook}
              words={readerWords}
              known={readerKnown}
              onBack={() => {
                showLibrary()
                setOpenCollection(activeBook.collectionId ?? null)
              }}
              onNextPart={nextPart ? () => void openBook(nextPart) : undefined}
              theme={theme}
              onToggleTheme={toggleTheme}
              translationLanguage={translationLanguage}
              onOpenWords={showWords}
              onPageChange={(page, pageCount) => updatePage(activeBook.id, page, pageCount)}
              onSaveWord={saveWord}
              onMarkKnown={(keys) => markKnown(activeBook.language, keys)}
            />
          </>
        ) : view === 'words' ? (
          <>
            {noticeBar}
            <WordsPage words={languageWords} language={studyLanguage} onDeleteWord={deleteWord} onOpenLibrary={showLibrary} onOpenTraining={showTraining} />
          </>
        ) : currentView === 'catalog' ? (
          <>
            {noticeBar}
            <CatalogPage
              shelf={books}
              studyLanguage={studyLanguage}
              selectedSlug={pendingShown ?? catalogSlug}
              busySlug={catalogBusy}
              onSelect={(slug) => showCatalog(slug)}
              onStart={(entry) => void addCatalogBook(entry, true)}
              onAdd={(entry) => void addCatalogBook(entry, false)}
            />
          </>
        ) : view === 'grammar' ? (
          <>
            {noticeBar}
            <GrammarPage key={studyLanguage} language={studyLanguage} progress={profile.grammar ?? {}} onResult={saveGrammarResult} />
          </>
        ) : view === 'admin' && adminUser ? (
          <AdminPage />
        ) : view === 'training' ? (
          <>
            {noticeBar}
            <Training words={languageWords} language={studyLanguage} onSaveWord={saveWord} onActivity={() => recordActivity(studyLanguage)} onOpenLibrary={showLibrary} />
          </>
        ) : openFolder ? (
          <>
            {noticeBar}
            <FolderView parts={openFolder.parts} onBack={() => setOpenCollection(null)} onOpen={(part) => void openBook(part)} onDelete={() => void deleteBooks(openFolder.parts)} />
          </>
        ) : (
          <>
            <header className="page-header library-header">
              <div><span className="eyebrow">{t.home.studying}</span><h1>{getLanguage(studyLanguage).name}<span className="heading-period">.</span></h1><p>{languageBooks.length ? t.home.leadWithBooks : t.home.leadEmpty}</p></div>
              <button className="import-button" onClick={() => fileInput.current?.click()} disabled={isImporting}>{isImporting ? <LoaderCircle size={17} className="spin" /> : <FilePlus2 size={18} />}{isImporting ? t.home.importing : t.home.addBook}</button>
              <input ref={fileInput} className="file-input" type="file" accept=".txt,.md,.epub,.pdf,text/plain,text/markdown,application/pdf,application/epub+zip" multiple onChange={(event) => void importFiles(event.target.files)} />
            </header>
            <nav className="language-switcher" aria-label={t.home.languages}>
              {activeLanguages.map((code) => (
                <button key={code} className={code === studyLanguage ? 'language-chip selected' : 'language-chip'} aria-current={code === studyLanguage} onClick={() => changeStudyLanguage(code)}>
                  {getLanguage(code).name}<small>{bookCountByLanguage.get(code) ?? 0}</small>
                </button>
              ))}
              <button className="language-chip add" onClick={() => setLanguageDialogOpen(true)}><Plus size={14} /> {t.home.addLanguage}</button>
            </nav>
            <section className="stats-row" aria-label={t.home.progress}>
              <div className="stat-tile"><Flame size={17} /><strong>{streak}</strong><small>{t.home.inARow(streak)}</small></div>
              <div className="stat-tile"><CalendarDays size={17} /><strong>{activity?.days ?? 0}</strong><small>{t.home.studyDays(activity?.days ?? 0)}</small><span className="week-dots" aria-label={t.home.week}>{lastWeek(activity).map(({ day, active }) => <i key={day} className={active ? 'on' : ''} />)}</span></div>
              <div className="stat-tile"><Sparkles size={17} /><strong>{knownCount.toLocaleString(t.locale)}</strong><small>{t.home.known}</small></div>
              <button className="stat-tile" onClick={showTraining}><Dumbbell size={17} /><strong>{dueCount}</strong><small>{t.home.due}</small></button>
            </section>
            {noticeBar}
            <section className="library-content">
              <div className="library-toolbar"><div><span className="section-marker" /> {t.home.myLibrary} <span className="toolbar-count">{shelf.length}</span></div><button className="sort-button" onClick={() => void persistBooks([...books].reverse()).catch(() => setNotice(t.notices.orderFailed))}>{t.home.recent} <ChevronDown size={15} /></button></div>
              {languageBooks.length > 0 ? (
                <div className="book-grid">{shelf.map((item) => {
                  if (item.kind === 'folder') {
                    const first = item.parts[0]
                    const progress = folderProgress(item.parts)
                    return (
                      <div className={`book-slot cover-${coverIndex(item.id)}`} key={item.id}>
                        <button className="book-card" onClick={() => setOpenCollection(item.id)}><ShelfCover book={first} folder={`${item.parts.length} ${t.common.parts(item.parts.length).toUpperCase()}`} /><div className="book-card-info"><div className="book-card-title">{bookTitleOf(first)}</div><div className="book-card-author">{t.common.partOf(currentPart(item.parts).part ?? 1, item.parts.length)}</div><div className="book-card-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress > 0 ? `${progress}%` : t.home.notStarted}</small></div></div></button>
                        <button className="delete-book" onClick={() => void deleteBooks(item.parts)} aria-label={t.home.deleteBook(bookTitleOf(first))}><Trash2 size={15} /></button>
                      </div>
                    )
                  }
                  const { book } = item
                  return (
                    <div className={`book-slot cover-${coverIndex(book.id)}`} key={book.id}>
                      <button className="book-card" onClick={() => void openBook(book)}><ShelfCover book={book} /><div className="book-card-info"><div className="book-card-title">{book.title}</div><div className="book-card-author">{book.author}</div><div className="book-card-progress"><span><i style={{ width: `${book.progress}%` }} /></span><small>{book.progress > 0 ? `${book.progress}%` : t.home.notStarted}</small></div></div></button>
                      <button className="delete-book" onClick={() => void deleteBooks([book])} aria-label={t.home.deleteBook(book.title)}><Trash2 size={15} /></button>
                    </div>
                  )
                })}</div>
              ) : <div className="empty-library"><div className="empty-icon"><FilePlus2 size={22} /></div><h2>{t.home.emptyTitle}</h2><p>{t.home.emptyText(getLanguage(studyLanguage).name)}</p><button className="import-button" onClick={() => fileInput.current?.click()}><FilePlus2 size={17} /> {t.home.addBook}</button></div>}
              <button className="add-book-row" onClick={() => fileInput.current?.click()}><span><FilePlus2 size={18} /></span><strong>{t.home.addAnother}</strong><small>EPUB, PDF, TXT, MD</small></button>
            </section>
            <section className="reading-note"><div className="note-icon"><Dumbbell size={20} /></div><div><span>{t.home.trainingKicker}</span><strong>{dueCount ? t.home.trainingDue(dueCount) : languageWords.length ? t.home.trainingWords(languageWords.length) : t.home.trainingEmpty}</strong></div><button onClick={showTraining} aria-label={t.home.toTraining}><ArrowLeft size={18} /></button></section>
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label={t.nav.main}><button className={!activeBook && currentView === 'library' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showLibrary}><Library size={20} /><span>{t.nav.myBooks}</span></button><button className={!activeBook && currentView === 'catalog' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => showCatalog()}><BookMarked size={20} /><span>{t.nav.catalogShort}</span></button><button className={!activeBook && currentView === 'training' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showTraining}><Dumbbell size={20} /><span>{t.nav.training}</span>{dueCount > 0 && <i />}</button><button className={!activeBook && currentView === 'grammar' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showGrammar}><GraduationCap size={20} /><span>{t.nav.grammar}</span></button><button className={!activeBook && currentView === 'words' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showWords}><Bookmark size={20} /><span>{t.nav.wordsShort}</span></button>{adminUser && <button className={!activeBook && currentView === 'admin' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showAdmin}><ChartColumn size={20} /><span>{t.nav.adminShort}</span></button>}</nav>
      {languageDialogOpen && <LanguagePicker exclude={[...activeLanguages, translationLanguage]} onPick={addLanguage} onClose={() => setLanguageDialogOpen(false)} />}
      {accountOpen && <div className="translation-scrim account-scrim" onClick={() => setAccountOpen(false)}><section className="account-panel" role="dialog" aria-modal="true" aria-label={t.account.label} onClick={(event) => event.stopPropagation()}><button className="icon-button panel-close" onClick={() => setAccountOpen(false)} aria-label={t.common.close}><X size={18} /></button><span className="account-panel-icon"><Cloud size={21} /></span><span className="panel-kicker">LING ACCOUNT</span><h2>{accountUser ? t.account.connected : t.account.everywhere}</h2>{(accountUser || !cloudEnabled || authMode === 'signin') && <div className="account-settings"><label className="translation-language"><span className="translation-language-label"><Globe size={15} /> {t.account.interface}</span><select value={uiLanguage} onChange={(event) => changeUiLanguage(event.target.value as UiLanguage)}>{UI_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}</select></label><TranslationLanguageSelect value={translationLanguage} onChange={changeTranslationLanguage} label={t.account.translateTo} hint={t.account.translationHint} /></div>}{!cloudEnabled ? <div className="cloud-setup-note"><p>{t.account.setup}</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div> : accountUser ? <div className="account-connected"><p>{accountUser.email}</p><span><Check size={15} /> {t.account.linked}</span><button className="account-signout" onClick={() => void handleSignOut()} disabled={authBusy}><LogOut size={16} />{authBusy ? t.account.signingOut : t.account.signOut}</button></div> : <AuthForm {...authForm} />}{accountUser && authMessage && <p className="auth-message" role="status">{authMessage}</p>}</section></div>}
    </div>
  )
}

type FolderViewProps = { parts: BookFile[]; onBack: () => void; onOpen: (part: BookFile) => void; onDelete: () => void }

/** A split book: its parts in order, each with its own progress. */
/** A book's cover on the shelf: the scanned cover of a Ling Library book, otherwise a drawn one. */
function ShelfCover({ book, folder }: { book: BookFile; folder?: string }) {
  const title = bookTitleOf(book)
  const image = coverUrl(catalogBookOf(title, book.language))
  const className = folder ? 'book-cover is-folder' : 'book-cover'
  if (image) return <div className={`${className} has-image`}><img className="cover-image" src={image} alt="" loading="lazy" /></div>
  return <div className={className}><span className="cover-stamp">{folder ?? book.format}</span><BookOpen size={25} strokeWidth={1.5} /><div className="cover-lines"><span /><span /><span /></div><span className="cover-title">{title}</span><span className="cover-author">{book.author}</span></div>
}

function FolderView({ parts, onBack, onOpen, onDelete }: FolderViewProps) {
  const t = useMessages()
  const first = parts[0]
  const progress = folderProgress(parts)
  const current = currentPart(parts)
  const cover = coverUrl(catalogBookOf(bookTitleOf(first), first.language))
  return (
    <section className="folder-view">
      <button className="quiet-button folder-back" onClick={onBack}><ArrowLeft size={16} /> {t.common.library}</button>
      <header className="folder-header">
        <div className={`folder-cover cover-${coverIndex(first.collectionId ?? first.id)}`}>{cover ? <div className="book-cover is-folder has-image"><img className="cover-image" src={cover} alt="" /></div> : <div className="book-cover is-folder"><BookOpen size={22} strokeWidth={1.5} /></div>}</div>
        <div className="folder-info">
          <span className="eyebrow">{t.folder.kicker(parts.length, first.format)}</span>
          <h1>{bookTitleOf(first)}</h1>
          <p>{first.author}</p>
          <div className="folder-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{t.common.percentRead(progress)}</small></div>
          <div className="folder-actions">
            <button className="primary-action" onClick={() => onOpen(current)}><BookOpen size={16} /> {progress > 0 ? t.folder.continue : t.folder.begin} · {t.folder.part(current.part ?? 1)}</button>
            <button className="quiet-button" onClick={onDelete}><Trash2 size={15} /> {t.folder.delete}</button>
          </div>
        </div>
      </header>
      <ol className="part-list">{parts.map((part) => (
        <li key={part.id}>
          <button className={`part-row${part.id === current.id ? ' current' : ''}${part.progress >= 100 ? ' done' : ''}`} onClick={() => onOpen(part)}>
            <span className="part-number">{part.progress >= 100 ? <Check size={14} /> : part.part}</span>
            <span className="part-title"><strong>{partTitle(part.title, part.part, t)}</strong><small>{part.progress >= 100 ? t.folder.read : part.id === current.id && part.progress > 0 ? t.folder.current : part.progress > 0 ? t.folder.started : t.folder.notStarted}</small></span>
            <span className="part-progress"><i style={{ width: `${part.progress}%` }} /></span>
            <small className="part-percent">{part.progress}%</small>
          </button>
        </li>
      ))}</ol>
    </section>
  )
}

export default App
