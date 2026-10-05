import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, Bookmark, CalendarDays, Check, ChevronDown, Cloud, Dumbbell, FilePlus2, Flame, Library, LoaderCircle, LogOut, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { AccountButton, AuthForm, WelcomeScreen, type AuthFormProps, type AuthMode } from './Account'
import { readBookFile } from './bookImport'
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
import { splitIntoParts, wordKey } from './text'
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

function partsLabel(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'частей'
  if (last === 1) return 'часть'
  if (last >= 2 && last <= 4) return 'части'
  return 'частей'
}

function coverIndex(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 4
}

function daysLabel(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

function normalizeBook(book: Partial<BookFile> & Pick<BookFile, 'id' | 'title'>): BookFile {
  return {
    ...book,
    author: book.author ?? 'Моя библиотека',
    content: book.content ?? '',
    format: book.format ?? 'TXT',
    language: book.language ?? DEFAULT_LANGUAGE,
    progress: book.progress ?? 0,
  }
}

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
  const [books, setBooks] = useState<BookFile[]>([])
  const [words, setWords] = useState<SavedWord[]>([])
  const [knownWords, setKnownWords] = useState<KnownWords>({})
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [studyLanguage, setStudyLanguage] = useState(() => readStudyLanguage() ?? DEFAULT_LANGUAGE)
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false)
  const [openCollection, setOpenCollection] = useState<string | null>(null)
  const [activeBook, setActiveBook] = useState<BookFile | null>(null)
  const [view, setView] = useState<'library' | 'words' | 'training'>('library')
  const [notice, setNotice] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataScope, setDataScope] = useState('anonymous')
  const [accountUser, setAccountUser] = useState<User | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [welcomeSkipped, setWelcomeSkipped] = useState(readWelcomeSkipped)
  // Visitors who are not signed in see the landing page first; its buttons open the sign-in screen.
  const [authScreenOpen, setAuthScreenOpen] = useState(false)
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
        if (stored.offline) setNotice('Нет связи с аккаунтом. Открыта сохранённая копия.')
        else if (migrationFailed) setNotice('Вход выполнен, но часть локальной библиотеки не удалось перенести.')
      } catch {
        if (isActive) setNotice('Не удалось загрузить сохранённые данные.')
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
        setNotice('Не удалось подключиться к хранилищу. Проверь настройки аккаунта.')
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
    try {
      const result = authMode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        : await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          // The new account starts with the chosen translation language in its profile.
          options: { emailRedirectTo: siteUrl, data: { ling_profile: { ...EMPTY_PROFILE, translationLanguage } } },
        })
      if (result.error) throw result.error
      if (!result.data.session || !result.data.user) {
        setAuthMessage(`Проверь почту ${authEmail.trim()}: мы отправили ссылку для подтверждения. Она откроет ${new URL(siteUrl).host}, и ты сразу войдёшь в аккаунт.`)
        return
      }

      let migrationMessage = ''
      try {
        await migrateGuestLibrary(result.data.user.id, true)
      } catch {
        migrationMessage = ' Вход выполнен, но часть локальной библиотеки не удалось перенести.'
      }
      applyScope(await loadScopeCollections(result.data.user.id))
      setAccountUser(result.data.user)
      setAccountOpen(false)
      setAuthPassword('')
      setNotice(`Библиотека подключена к аккаунту.${migrationMessage}`)
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Не удалось выполнить вход.')
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
      setAuthMessage('Не удалось выйти из аккаунта.')
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
        setNotice('Книга-пример добавлена на устройство, но не загрузилась в аккаунт.')
      }
    }
    try {
      await persistBooks([book, ...books])
    } catch {
      setNotice('Не удалось добавить книгу-пример.')
    }
  }

  async function persistKnown(nextKnown: KnownWords) {
    knownRef.current = nextKnown
    setKnownWords(nextKnown)
    await saveCollection('words', `${dataScope}:known`, nextKnown)
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return
    setIsImporting(true)
    setNotice('')
    try {
      let uploadWarning = ''
      const imported = (await Promise.all(Array.from(files).map(async (file): Promise<BookFile[]> => {
        const { language: detectedLanguage, sections, ...parsed } = await readBookFile(file, { fallbackLanguage: studyLanguage, onProgress: setNotice })
        const title = parsed.title ?? file.name.replace(/\.[^.]+$/, '')
        const details = {
          author: parsed.author ?? 'Моя библиотека',
          format: file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
          language: LANGUAGES.some((language) => language.code === detectedLanguage) ? detectedLanguage! : studyLanguage,
          progress: 0,
        }
        const parts = splitIntoParts(sections ?? [{ content: parsed.content }])
        if (parts.length === 1) {
          const book: BookFile = { id: crypto.randomUUID(), title, content: parsed.content, ...details }
          if (!accountUser || !book.content.trim()) return [book]
          try {
            return [await uploadAccountBook(accountUser.id, book, file)]
          } catch {
            uploadWarning = ' Книга добавлена на устройство, но не загрузилась в аккаунт.'
            return [book]
          }
        }

        // A long book becomes a folder of parts that are read, synced and tracked one by one.
        const collectionId = crypto.randomUUID()
        const books: BookFile[] = parts.map((part, index) => ({
          id: crypto.randomUUID(),
          title: `Часть ${index + 1}${part.title ? ` · ${part.title}` : ''}`,
          content: part.content,
          collectionId,
          collectionTitle: title,
          part: index + 1,
          partCount: parts.length,
          ...details,
        }))
        if (!accountUser) return books
        try {
          return await uploadAccountCollection(accountUser.id, books, file)
        } catch (error) {
          uploadWarning = error instanceof Error && error.message === PARTS_MIGRATION_MESSAGE ? ` ${error.message}` : ' Книга добавлена на устройство, но не загрузилась в аккаунт.'
          return books
        }
      }))).flat()
      const usable = imported.filter((book) => book.content.trim())
      await persistBooks([...usable, ...books])
      if (!usable.length) {
        setNotice('В файле не найден текст для чтения.')
        return
      }
      const otherLanguage = usable.find((book) => book.language !== studyLanguage)?.language
      if (otherLanguage && !usable.some((book) => book.language === studyLanguage)) changeStudyLanguage(otherLanguage)
      const bookCount = new Set(usable.map((book) => book.collectionId ?? book.id)).size
      const splitInto = usable.find((book) => book.partCount)?.partCount
      setNotice(`Добавлено книг: ${bookCount}${otherLanguage ? ` · язык: ${getLanguage(otherLanguage).name}` : ''}${splitInto ? ` · большая книга разделена на ${splitInto} частей в одной папке` : ''}.${uploadWarning}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось открыть файл.')
    } finally {
      setIsImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  /** Deletes a book, or all parts of a split book at once. */
  async function deleteBooks(targets: BookFile[]) {
    const title = bookTitleOf(targets[0])
    if (!window.confirm(`Удалить книгу «${title}»${targets.length > 1 ? ` (${targets.length} частей)` : ''}? Сохранённые слова останутся в словаре.`)) return
    try {
      const synced = targets.filter((book) => book.cloudContentPath)
      if (accountUser && synced.length) await deleteAccountBooks(accountUser.id, synced)
      const ids = new Set(targets.map((book) => book.id))
      await persistBooks(books.filter((item) => !ids.has(item.id)))
      setOpenCollection(null)
    } catch {
      setNotice('Не удалось удалить книгу из аккаунта.')
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
      setNotice('Не удалось сохранить слово. Проверь свободное место на устройстве.')
      return
    }
    if (accountUser) {
      try {
        await saveAccountWords(accountUser.id, [nextWords[index >= 0 ? index : 0]])
      } catch {
        setNotice('Слово сохранено на устройстве, но не синхронизировано с аккаунтом.')
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
      setNotice('Не удалось сохранить знакомые слова.')
      return
    }
    if (accountUser) {
      try {
        await saveAccountKnownWords(accountUser.id, language, fresh)
      } catch {
        setNotice('Знакомые слова сохранены на устройстве, но не синхронизированы.')
      }
    }
  }

  async function deleteWord(wordId: string) {
    try {
      if (accountUser) await deleteAccountWord(accountUser.id, wordId)
      await persistWords(wordsRef.current.filter((word) => word.id !== wordId))
    } catch {
      setNotice('Не удалось удалить слово из аккаунта.')
    }
  }

  function updatePage(bookId: string, page: number, pageCount: number) {
    const language = books.find((book) => book.id === bookId)?.language
    if (language) recordActivity(language)
    const progress = Math.round(((page + 1) / pageCount) * 100)
    const nextBooks = books.map((book) => book.id === bookId ? { ...book, page, progress } : book)
    setBooks(nextBooks)
    setActiveBook((book) => book ? { ...book, page, progress } : null)
    void saveCollection('books', `${dataScope}:books`, nextBooks).catch(() => setNotice('Не удалось сохранить прогресс чтения.'))
    if (accountUser) void updateAccountProgress(accountUser.id, bookId, progress).catch(() => setNotice('Прогресс сохранён на устройстве, но не синхронизирован.'))
  }

  async function openBook(book: BookFile) {
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
      setNotice('Не удалось загрузить книгу из аккаунта.')
    }
  }

  function showLibrary() {
    setView('library')
    setActiveBook(null)
    setOpenCollection(null)
  }

  function showWords() {
    setView('words')
    setActiveBook(null)
  }

  function showTraining() {
    setView('training')
    setActiveBook(null)
  }

  if (isLoadingData) {
    return <div className="loading-screen"><span className="brand-mark"><BookOpen size={19} /></span><LoaderCircle size={19} className="spin" /></div>
  }

  const noticeBar = notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Скрыть уведомление"><X size={15} /></button></div>

  const onboarding = !activeBook && !activeLanguages.length
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
    const openAuth = (mode: AuthMode, landingLanguage: string) => {
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
        <a className="brand" href="#library" onClick={showLibrary} aria-label="Ling, библиотека">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
          <span>ling<span className="brand-period">.</span></span>
        </a>
        <span className="side-label">ТВОЁ ПРОСТРАНСТВО</span>
        <nav className="side-nav" aria-label="Основная навигация">
          <button className={!activeBook && view === 'library' ? 'nav-item selected' : 'nav-item'} onClick={showLibrary}><Library size={18} /> Библиотека <span className="nav-count">{shelf.length}</span></button>
          <button className={!activeBook && view === 'training' ? 'nav-item selected' : 'nav-item'} onClick={showTraining}><Dumbbell size={18} /> Тренировка {dueCount > 0 && <span className="nav-count due">{dueCount}</span>}</button>
          <button className={!activeBook && view === 'words' ? 'nav-item selected' : 'nav-item'} onClick={showWords}><Bookmark size={18} /> Мои слова <span className="nav-count">{languageWords.length}</span></button>
        </nav>
        <div className="sidebar-bottom">
          <button className="streak-badge" onClick={showLibrary}><Flame size={17} /><span><strong>{streak} {daysLabel(streak)}</strong><small>подряд · {getLanguage(studyLanguage).name}</small></span></button>
          <span className="side-footnote">Читай. Замечай. Запоминай.</span>
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
          <WelcomeScreen form={authForm} onSkip={skipWelcome} onBack={() => setAuthScreenOpen(false)} />
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
              <div><span className="eyebrow">ИЗУЧАЮ</span><h1>{getLanguage(studyLanguage).name}<span className="heading-period">.</span></h1><p>{languageBooks.length ? 'Читай в своём ритме — каждое новое слово остаётся с тобой.' : 'Добавь первую книгу на этом языке, чтобы начать читать.'}</p></div>
              <button className="import-button" onClick={() => fileInput.current?.click()} disabled={isImporting}>{isImporting ? <LoaderCircle size={17} className="spin" /> : <FilePlus2 size={18} />}{isImporting ? 'Загружаем...' : 'Добавить книгу'}</button>
              <input ref={fileInput} className="file-input" type="file" accept=".txt,.md,.epub,.pdf,text/plain,text/markdown,application/pdf,application/epub+zip" multiple onChange={(event) => void importFiles(event.target.files)} />
            </header>
            <nav className="language-switcher" aria-label="Изучаемые языки">
              {activeLanguages.map((code) => (
                <button key={code} className={code === studyLanguage ? 'language-chip selected' : 'language-chip'} aria-current={code === studyLanguage} onClick={() => changeStudyLanguage(code)}>
                  {getLanguage(code).name}<small>{bookCountByLanguage.get(code) ?? 0}</small>
                </button>
              ))}
              <button className="language-chip add" onClick={() => setLanguageDialogOpen(true)}><Plus size={14} /> Добавить язык</button>
            </nav>
            <section className="stats-row" aria-label="Прогресс">
              <div className="stat-tile"><Flame size={17} /><strong>{streak}</strong><small>{daysLabel(streak)} подряд</small></div>
              <div className="stat-tile"><CalendarDays size={17} /><strong>{activity?.days ?? 0}</strong><small>{daysLabel(activity?.days ?? 0)} занятий</small><span className="week-dots" aria-label="Занятия за неделю">{lastWeek(activity).map(({ day, active }) => <i key={day} className={active ? 'on' : ''} />)}</span></div>
              <div className="stat-tile"><Sparkles size={17} /><strong>{knownCount.toLocaleString('ru-RU')}</strong><small>слов знаю</small></div>
              <button className="stat-tile" onClick={showTraining}><Dumbbell size={17} /><strong>{dueCount}</strong><small>на повторении</small></button>
            </section>
            {noticeBar}
            <section className="library-content">
              <div className="library-toolbar"><div><span className="section-marker" /> МОЯ БИБЛИОТЕКА <span className="toolbar-count">{shelf.length}</span></div><button className="sort-button" onClick={() => void persistBooks([...books].reverse()).catch(() => setNotice('Не удалось сохранить порядок библиотеки.'))}>Недавно добавленные <ChevronDown size={15} /></button></div>
              {languageBooks.length > 0 ? (
                <div className="book-grid">{shelf.map((item) => {
                  if (item.kind === 'folder') {
                    const first = item.parts[0]
                    const progress = folderProgress(item.parts)
                    return (
                      <div className={`book-slot cover-${coverIndex(item.id)}`} key={item.id}>
                        <button className="book-card" onClick={() => setOpenCollection(item.id)}><div className="book-cover is-folder"><span className="cover-stamp">{item.parts.length} {partsLabel(item.parts.length).toUpperCase()}</span><BookOpen size={25} strokeWidth={1.5} /><div className="cover-lines"><span /><span /><span /></div><span className="cover-title">{bookTitleOf(first)}</span><span className="cover-author">{first.author}</span></div><div className="book-card-info"><div className="book-card-title">{bookTitleOf(first)}</div><div className="book-card-author">Часть {currentPart(item.parts).part} из {item.parts.length}</div><div className="book-card-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress > 0 ? `${progress}%` : 'Ещё не начато'}</small></div></div></button>
                        <button className="delete-book" onClick={() => void deleteBooks(item.parts)} aria-label={`Удалить книгу ${bookTitleOf(first)}`}><Trash2 size={15} /></button>
                      </div>
                    )
                  }
                  const { book } = item
                  return (
                    <div className={`book-slot cover-${coverIndex(book.id)}`} key={book.id}>
                      <button className="book-card" onClick={() => void openBook(book)}><div className="book-cover"><span className="cover-stamp">{book.format}</span><BookOpen size={25} strokeWidth={1.5} /><div className="cover-lines"><span /><span /><span /></div><span className="cover-title">{book.title}</span><span className="cover-author">{book.author}</span></div><div className="book-card-info"><div className="book-card-title">{book.title}</div><div className="book-card-author">{book.author}</div><div className="book-card-progress"><span><i style={{ width: `${book.progress}%` }} /></span><small>{book.progress > 0 ? `${book.progress}%` : 'Ещё не начато'}</small></div></div></button>
                      <button className="delete-book" onClick={() => void deleteBooks([book])} aria-label={`Удалить книгу ${book.title}`}><Trash2 size={15} /></button>
                    </div>
                  )
                })}</div>
              ) : <div className="empty-library"><div className="empty-icon"><FilePlus2 size={22} /></div><h2>Полка ждёт первую книгу</h2><p>Добавь файл в формате EPUB, PDF, TXT или MD на языке {getLanguage(studyLanguage).name}, чтобы начать читать.</p><button className="import-button" onClick={() => fileInput.current?.click()}><FilePlus2 size={17} /> Добавить книгу</button></div>}
              <button className="add-book-row" onClick={() => fileInput.current?.click()}><span><FilePlus2 size={18} /></span><strong>Добавить ещё одну книгу</strong><small>EPUB, PDF, TXT, MD</small></button>
            </section>
            <section className="reading-note"><div className="note-icon"><Dumbbell size={20} /></div><div><span>ТРЕНИРОВКА</span><strong>{dueCount ? `${dueCount} слов ждут повторения` : languageWords.length ? `${languageWords.length} слов в словаре — потренируйся` : 'Сохраняй слова прямо во время чтения'}</strong></div><button onClick={showTraining} aria-label="Перейти к тренировке"><ArrowLeft size={18} /></button></section>
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Основная навигация"><button className={!activeBook && view === 'library' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showLibrary}><Library size={20} /><span>Библиотека</span></button><button className={!activeBook && view === 'training' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showTraining}><Dumbbell size={20} /><span>Тренировка</span>{dueCount > 0 && <i />}</button><button className={!activeBook && view === 'words' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showWords}><Bookmark size={20} /><span>Слова</span></button></nav>
      {languageDialogOpen && <LanguagePicker exclude={[...activeLanguages, translationLanguage]} onPick={addLanguage} onClose={() => setLanguageDialogOpen(false)} />}
      {accountOpen && <div className="translation-scrim account-scrim" onClick={() => setAccountOpen(false)}><section className="account-panel" role="dialog" aria-modal="true" aria-label="Аккаунт Ling" onClick={(event) => event.stopPropagation()}><button className="icon-button panel-close" onClick={() => setAccountOpen(false)} aria-label="Закрыть"><X size={18} /></button><span className="account-panel-icon"><Cloud size={21} /></span><span className="panel-kicker">LING ACCOUNT</span><h2>{accountUser ? 'Аккаунт подключён' : 'Твоя библиотека везде'}</h2>{(accountUser || !cloudEnabled || authMode === 'signin') && <div className="account-settings"><TranslationLanguageSelect value={translationLanguage} onChange={changeTranslationLanguage} hint="Новые слова будут переводиться на этот язык. Уже сохранённые переводы не изменятся." /></div>}{!cloudEnabled ? <div className="cloud-setup-note"><p>Подключи проект Supabase, чтобы включить вход и синхронизацию книг.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div> : accountUser ? <div className="account-connected"><p>{accountUser.email}</p><span><Check size={15} /> Книги и слова привязаны к аккаунту</span><button className="account-signout" onClick={() => void handleSignOut()} disabled={authBusy}><LogOut size={16} />{authBusy ? 'Выходим...' : 'Выйти из аккаунта'}</button></div> : <AuthForm {...authForm} />}{accountUser && authMessage && <p className="auth-message" role="status">{authMessage}</p>}</section></div>}
    </div>
  )
}

type FolderViewProps = { parts: BookFile[]; onBack: () => void; onOpen: (part: BookFile) => void; onDelete: () => void }

/** A split book: its parts in order, each with its own progress. */
function FolderView({ parts, onBack, onOpen, onDelete }: FolderViewProps) {
  const first = parts[0]
  const progress = folderProgress(parts)
  const current = currentPart(parts)
  return (
    <section className="folder-view">
      <button className="quiet-button folder-back" onClick={onBack}><ArrowLeft size={16} /> Библиотека</button>
      <header className="folder-header">
        <div className={`folder-cover cover-${coverIndex(first.collectionId ?? first.id)}`}><div className="book-cover is-folder"><BookOpen size={22} strokeWidth={1.5} /></div></div>
        <div className="folder-info">
          <span className="eyebrow">ПАПКА · {parts.length} {partsLabel(parts.length).toUpperCase()} · {first.format}</span>
          <h1>{bookTitleOf(first)}</h1>
          <p>{first.author}</p>
          <div className="folder-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress}% прочитано</small></div>
          <div className="folder-actions">
            <button className="primary-action" onClick={() => onOpen(current)}><BookOpen size={16} /> {progress > 0 ? 'Продолжить' : 'Начать'} · часть {current.part}</button>
            <button className="quiet-button" onClick={onDelete}><Trash2 size={15} /> Удалить книгу</button>
          </div>
        </div>
      </header>
      <ol className="part-list">{parts.map((part) => (
        <li key={part.id}>
          <button className={`part-row${part.id === current.id ? ' current' : ''}${part.progress >= 100 ? ' done' : ''}`} onClick={() => onOpen(part)}>
            <span className="part-number">{part.progress >= 100 ? <Check size={14} /> : part.part}</span>
            <span className="part-title"><strong>{part.title}</strong><small>{part.progress >= 100 ? 'Прочитано' : part.id === current.id && part.progress > 0 ? 'Читаешь сейчас' : part.progress > 0 ? 'Начато' : 'Не начато'}</small></span>
            <span className="part-progress"><i style={{ width: `${part.progress}%` }} /></span>
            <small className="part-percent">{part.progress}%</small>
          </button>
        </li>
      ))}</ol>
    </section>
  )
}

export default App
