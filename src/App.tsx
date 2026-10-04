import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, Bookmark, Check, ChevronDown, Cloud, FilePlus2, Headphones, Languages, Library, LoaderCircle, LogOut, Sparkles, Trash2, UserRound, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { readBookFile } from './bookImport'
import { deleteAccountBook, deleteAccountKnownWord, deleteAccountWord, downloadAccountBookContent, getAccountBooks, getAccountKnownWords, getAccountWords, saveAccountKnownWords, saveAccountWords, updateAccountProgress, uploadAccountBook, uploadGuestLibrary } from './cloud'
import type { BookFile, KnownWords, SavedWord } from './domain'
import { DEFAULT_LANGUAGE, getLanguage, LANGUAGES } from './languages'
import { Reader } from './Reader'
import { isDue, normalizeWord } from './srs'
import { loadCollection, saveCollection } from './storage'
import { cloudEnabled, supabase } from './supabase'
import { wordKey } from './text'
import { WordsPage } from './WordsPage'
import './App.css'

const LANGUAGE_STORAGE_KEY = 'ling-study-language'

const sampleBook: BookFile = {
  id: 'sample',
  title: 'The Lighthouse Keeper',
  author: 'Ling Reader',
  format: 'DEMO',
  language: 'en',
  progress: 0,
  content: `Every morning, Clara climbed the narrow stairs to the top of the lighthouse. The sea was still and silver beneath the early sun, and the gulls circled above the quiet harbor. She kept a notebook by the window, filling it with small observations: the weather, the ships, and the changing color of the water.\n\nOn the first day of spring, Clara noticed a tiny boat drifting beyond the rocks. She raised the brass telescope and saw a bright red scarf waving from its deck. Without hesitation, she called the harbor station and watched the rescue boat hurry across the bay. By sunset, the stranger was safe, and the lighthouse glowed warmly against the darkening sky.`,
}

function readStudyLanguage(): string {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
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

type LoadedScope = { scope: string; books: BookFile[]; words: SavedWord[]; known: KnownWords; offline: boolean }

async function loadScopeCollections(userId: string | null): Promise<LoadedScope> {
  const scope = userId ? `user:${userId}` : 'anonymous'
  const [storedBooks, storedWords, cachedKnown] = await Promise.all([
    loadCollection<BookFile[]>('books', `${scope}:books`, userId ? '' : 'ling-books', userId ? [] : [sampleBook]),
    loadCollection<SavedWord[]>('words', `${scope}:words`, userId ? '' : 'ling-words', []),
    loadCollection<KnownWords>('words', `${scope}:known`, '', {}),
  ])
  const cachedBooks = storedBooks.map(normalizeBook)
  const cachedWords = storedWords.map(normalizeWord)
  if (!userId) return { scope, books: cachedBooks, words: cachedWords, known: cachedKnown, offline: false }

  try {
    const [remoteBooks, remoteWords, remoteKnown] = await Promise.all([getAccountBooks(userId), getAccountWords(userId), getAccountKnownWords(userId)])
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
    ])
    return { scope, books, words: remoteWords, known: remoteKnown, offline: false }
  } catch {
    return { scope, books: cachedBooks, words: cachedWords, known: cachedKnown, offline: true }
  }
}

function App() {
  const [books, setBooks] = useState<BookFile[]>([])
  const [words, setWords] = useState<SavedWord[]>([])
  const [knownWords, setKnownWords] = useState<KnownWords>({})
  const [studyLanguage, setStudyLanguage] = useState(readStudyLanguage)
  const [activeBook, setActiveBook] = useState<BookFile | null>(null)
  const [view, setView] = useState<'library' | 'words'>('library')
  const [notice, setNotice] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataScope, setDataScope] = useState('anonymous')
  const [accountUser, setAccountUser] = useState<User | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const authFlowRef = useRef(false)
  const activeScopeRef = useRef('')
  // Word lists change several times in a row (e.g. marking a page known), so writes read the latest value from refs.
  const wordsRef = useRef<SavedWord[]>([])
  const knownRef = useRef<KnownWords>({})
  const fileInput = useRef<HTMLInputElement>(null)

  const languageBooks = useMemo(() => books.filter((book) => book.language === studyLanguage), [books, studyLanguage])
  const languageWords = useMemo(() => words.filter((word) => word.language === studyLanguage), [words, studyLanguage])
  const knownCount = (knownWords[studyLanguage]?.length ?? 0) + languageWords.filter((word) => word.known).length
  const dueCount = useMemo(() => languageWords.filter((word) => isDue(word)).length, [languageWords])
  const readerWords = useMemo(() => activeBook ? words.filter((word) => word.language === activeBook.language) : [], [words, activeBook])
  const readerKnown = useMemo(() => new Set(activeBook ? knownWords[activeBook.language] ?? [] : []), [knownWords, activeBook])
  const bookCountByLanguage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const book of books) counts.set(book.language, (counts.get(book.language) ?? 0) + 1)
    return counts
  }, [books])

  function applyScope(data: LoadedScope) {
    activeScopeRef.current = data.scope
    wordsRef.current = data.words
    knownRef.current = data.known
    setDataScope(data.scope)
    setBooks(data.books)
    setWords(data.words)
    setKnownWords(data.known)
  }

  useEffect(() => {
    let isActive = true
    let unsubscribe = () => {}

    const activateScope = async (user: User | null) => {
      const scope = user ? `user:${user.id}` : 'anonymous'
      setAccountUser(user)
      if (activeScopeRef.current === scope) return
      activeScopeRef.current = scope
      setIsLoadingData(true)
      try {
        const stored = await loadScopeCollections(user?.id ?? null)
        if (!isActive) return
        applyScope(stored)
        if (stored.offline) setNotice('Нет связи с аккаунтом. Открыта сохранённая копия.')
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
        void activateScope(user)
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
        : await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword })
      if (result.error) throw result.error
      if (!result.data.session || !result.data.user) {
        setAuthMessage('Проверь почту: отправили ссылку для подтверждения аккаунта.')
        return
      }

      let migrationMessage = ''
      try {
        await uploadGuestLibrary(result.data.user.id, books, words, knownWords)
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
      const imported = await Promise.all(Array.from(files).map(async (file) => {
        const { language: detectedLanguage, ...parsed } = await readBookFile(file)
        const book: BookFile = {
          id: crypto.randomUUID(),
          ...parsed,
          title: parsed.title ?? file.name.replace(/\.[^.]+$/, ''),
          author: parsed.author ?? 'Моя библиотека',
          format: file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
          language: LANGUAGES.some((language) => language.code === detectedLanguage) ? detectedLanguage! : studyLanguage,
          progress: 0,
        }
        if (!accountUser) return book
        try {
          return await uploadAccountBook(accountUser.id, book, file)
        } catch {
          setNotice('Книга добавлена на устройство, но не загрузилась в аккаунт.')
          return book
        }
      }))
      const usable = imported.filter((book) => book.content.trim())
      await persistBooks([...usable, ...books])
      if (!usable.length) {
        setNotice('В файле не найден текст для чтения.')
        return
      }
      const otherLanguage = usable.find((book) => book.language !== studyLanguage)?.language
      if (otherLanguage && !usable.some((book) => book.language === studyLanguage)) changeStudyLanguage(otherLanguage)
      setNotice(`Добавлено книг: ${usable.length}${otherLanguage ? ` · язык: ${getLanguage(otherLanguage).name}` : ''}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось открыть файл.')
    } finally {
      setIsImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function deleteBook(book: BookFile) {
    if (!window.confirm(`Удалить книгу «${book.title}»? Сохранённые слова останутся в словаре.`)) return
    try {
      if (accountUser && book.cloudContentPath) await deleteAccountBook(accountUser.id, book)
      await persistBooks(books.filter((item) => item.id !== book.id))
    } catch {
      setNotice('Не удалось удалить книгу из аккаунта.')
    }
  }

  async function saveWord(word: SavedWord) {
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
  }

  function showWords() {
    setView('words')
    setActiveBook(null)
  }

  if (isLoadingData) {
    return <div className="loading-screen"><span className="brand-mark"><BookOpen size={19} /></span><LoaderCircle size={19} className="spin" /></div>
  }

  const noticeBar = notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Скрыть уведомление"><X size={15} /></button></div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#library" onClick={showLibrary} aria-label="Ling, библиотека">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
          <span>ling<span className="brand-period">.</span></span>
        </a>
        <span className="side-label">ТВОЁ ПРОСТРАНСТВО</span>
        <nav className="side-nav" aria-label="Основная навигация">
          <button className={!activeBook && view === 'library' ? 'nav-item selected' : 'nav-item'} onClick={showLibrary}><Library size={18} /> Библиотека <span className="nav-count">{languageBooks.length}</span></button>
          <button className={!activeBook && view === 'words' ? 'nav-item selected' : 'nav-item'} onClick={showWords}><Bookmark size={18} /> Мои слова <span className="nav-count">{dueCount > 0 ? `${dueCount} ↻` : languageWords.length}</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-badge"><Sparkles size={17} /><span><strong>{knownCount.toLocaleString('ru-RU')}</strong><small>слов знаю · {getLanguage(studyLanguage).name}</small></span></div>
          <span className="side-footnote">Читай. Замечай. Запоминай.</span>
          <button className="account-entry" onClick={() => { setAuthMessage(''); setAccountOpen(true) }}>
            <span className="account-avatar"><UserRound size={17} /></span>
            <span><strong>{accountUser?.email ?? (cloudEnabled ? 'Войти в аккаунт' : 'Аккаунт Ling')}</strong><small>{accountUser ? 'Библиотека синхронизируется' : cloudEnabled ? 'Вход и регистрация' : 'Облако не настроено'}</small></span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        {activeBook ? (
          <>
            {noticeBar}
            <Reader
              book={activeBook}
              words={readerWords}
              known={readerKnown}
              onBack={showLibrary}
              onOpenWords={showWords}
              onPageChange={(page, pageCount) => updatePage(activeBook.id, page, pageCount)}
              onSaveWord={saveWord}
              onMarkKnown={(keys) => markKnown(activeBook.language, keys)}
            />
          </>
        ) : view === 'words' ? (
          <>
            {noticeBar}
            <WordsPage words={languageWords} language={studyLanguage} onSaveWord={saveWord} onDeleteWord={deleteWord} onOpenLibrary={showLibrary} />
          </>
        ) : (
          <>
            <header className="page-header library-header">
              <div><span className="eyebrow">ТВОЯ ПОЛКА</span><h1>Время читать<span className="heading-period">.</span></h1><p>Загружай книги. Открывай новые слова. Читай в своём ритме.</p></div>
              <div className="library-actions">
                <label className="language-select"><Languages size={16} /><span className="visually-hidden">Изучаемый язык</span>
                  <select value={studyLanguage} onChange={(event) => changeStudyLanguage(event.target.value)}>
                    {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.name}{bookCountByLanguage.get(language.code) ? ` · ${bookCountByLanguage.get(language.code)}` : ''}</option>)}
                  </select>
                </label>
                <button className="import-button" onClick={() => fileInput.current?.click()} disabled={isImporting}>{isImporting ? <LoaderCircle size={17} className="spin" /> : <FilePlus2 size={18} />}{isImporting ? 'Загружаем...' : 'Добавить книгу'}</button>
              </div>
              <input ref={fileInput} className="file-input" type="file" accept=".txt,.md,.epub,.pdf,text/plain,text/markdown,application/pdf,application/epub+zip" multiple onChange={(event) => void importFiles(event.target.files)} />
            </header>
            {noticeBar}
            <section className="library-content">
              <div className="library-toolbar"><div><span className="section-marker" /> МОЯ БИБЛИОТЕКА <span className="toolbar-count">{languageBooks.length}</span></div><button className="sort-button" onClick={() => void persistBooks([...books].reverse()).catch(() => setNotice('Не удалось сохранить порядок библиотеки.'))}>Недавно добавленные <ChevronDown size={15} /></button></div>
              {languageBooks.length > 0 ? (
                <div className="book-grid">{languageBooks.map((book, index) => (
                  <div className={`book-slot cover-${index % 4}`} key={book.id}>
                    <button className="book-card" onClick={() => void openBook(book)}><div className="book-cover"><span className="cover-stamp">{book.format}</span><BookOpen size={25} strokeWidth={1.5} /><div className="cover-lines"><span /><span /><span /></div><span className="cover-title">{book.title}</span><span className="cover-author">{book.author}</span></div><div className="book-card-info"><div className="book-card-title">{book.title}</div><div className="book-card-author">{book.author}</div><div className="book-card-progress"><span><i style={{ width: `${book.progress}%` }} /></span><small>{book.progress > 0 ? `${book.progress}%` : 'Ещё не начато'}</small></div></div></button>
                    <button className="delete-book" onClick={() => void deleteBook(book)} aria-label={`Удалить книгу ${book.title}`}><Trash2 size={15} /></button>
                  </div>
                ))}</div>
              ) : <div className="empty-library"><div className="empty-icon"><FilePlus2 size={22} /></div><h2>Полка ждёт первую книгу</h2><p>Добавь файл в формате EPUB, PDF, TXT или MD на языке {getLanguage(studyLanguage).name}, чтобы начать читать.</p><button className="import-button" onClick={() => fileInput.current?.click()}><FilePlus2 size={17} /> Добавить книгу</button></div>}
              <button className="add-book-row" onClick={() => fileInput.current?.click()}><span><FilePlus2 size={18} /></span><strong>Добавить ещё одну книгу</strong><small>EPUB, PDF, TXT, MD</small></button>
            </section>
            <section className="reading-note"><div className="note-icon"><Headphones size={20} /></div><div><span>ТВОЙ СЛОВАРЬ РАСТЁТ</span><strong>{dueCount ? `${dueCount} слов ждут повторения` : languageWords.length ? `${languageWords.length} слов сохранено` : 'Сохраняй слова прямо во время чтения'}</strong></div><button onClick={showWords} aria-label="Перейти к моим словам"><ArrowLeft size={18} /></button></section>
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Основная навигация"><button className={!activeBook && view === 'library' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showLibrary}><Library size={20} /><span>Библиотека</span></button><button className={!activeBook && view === 'words' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={showWords}><Bookmark size={20} /><span>Мои слова</span>{dueCount > 0 && <i />}</button><button className="mobile-nav-item" onClick={() => { setAuthMessage(''); setAccountOpen(true) }}><UserRound size={20} /><span>Аккаунт</span></button></nav>
      {accountOpen && <div className="translation-scrim account-scrim" onClick={() => setAccountOpen(false)}><section className="account-panel" role="dialog" aria-modal="true" aria-label="Аккаунт Ling" onClick={(event) => event.stopPropagation()}><button className="icon-button panel-close" onClick={() => setAccountOpen(false)} aria-label="Закрыть"><X size={18} /></button><span className="account-panel-icon"><Cloud size={21} /></span><span className="panel-kicker">LING ACCOUNT</span><h2>{accountUser ? 'Аккаунт подключён' : 'Твоя библиотека везде'}</h2>{!cloudEnabled ? <div className="cloud-setup-note"><p>Подключи проект Supabase, чтобы включить вход и синхронизацию книг.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div> : accountUser ? <div className="account-connected"><p>{accountUser.email}</p><span><Check size={15} /> Книги и слова привязаны к аккаунту</span><button className="account-signout" onClick={() => void handleSignOut()} disabled={authBusy}><LogOut size={16} />{authBusy ? 'Выходим...' : 'Выйти из аккаунта'}</button></div> : <form className="auth-form" onSubmit={(event) => void handleAuthSubmit(event)}><label>Электронная почта<input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /></label><label>Пароль<input type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} /></label><button className="primary-action auth-submit" type="submit" disabled={authBusy}>{authBusy ? <LoaderCircle size={16} className="spin" /> : <UserRound size={16} />}{authBusy ? 'Подключаем...' : authMode === 'signin' ? 'Войти' : 'Создать аккаунт'}</button><button className="auth-mode-toggle" type="button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage('') }}>{authMode === 'signin' ? 'Первый раз в Ling? Создать аккаунт' : 'Уже есть аккаунт? Войти'}</button></form>}{authMessage && <p className="auth-message" role="status">{authMessage}</p>}</section></div>}
    </div>
  )
}

export default App
