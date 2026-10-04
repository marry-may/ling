import { useMemo, useState } from 'react'
import { ArrowRight, Bookmark, Check, Dumbbell, Search, Volume2, X } from 'lucide-react'
import type { SavedWord } from './domain'
import { getLanguage, speak } from './languages'
import { isDue, MAX_LEVEL } from './srs'

type Filter = 'all' | 'learning' | 'known'

type WordsPageProps = {
  words: SavedWord[]
  language: string
  onDeleteWord: (wordId: string) => Promise<void>
  onOpenLibrary: () => void
  onOpenTraining: () => void
}

const FILTERS: { id: Filter; title: string }[] = [
  { id: 'all', title: 'Все' },
  { id: 'learning', title: 'Изучаю' },
  { id: 'known', title: 'Выучено' },
]

export function WordsPage({ words, language, onDeleteWord, onOpenLibrary, onOpenTraining }: WordsPageProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const dueCount = useMemo(() => words.filter((word) => isDue(word)).length, [words])
  const counts = useMemo(() => ({ all: words.length, learning: words.filter((word) => !word.known).length, known: words.filter((word) => word.known).length }), [words])
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    return words.filter((word) => (filter === 'all' || (filter === 'known') === word.known)
      && (!search || word.word.toLowerCase().includes(search) || word.translation.toLowerCase().includes(search)))
  }, [words, filter, query])

  return (
    <>
      <header className="page-header words-header"><div><span className="eyebrow">ТВОЙ СЛОВАРЬ · {getLanguage(language).name.toUpperCase()}</span><h1>Мои слова<span className="heading-period">.</span></h1><p>Все слова, которые ты сохранила во время чтения.</p></div><div className="header-stats"><strong>{words.length}</strong><span>сохранено</span></div></header>
      <section className="words-page">
        {words.length > 0 ? (
          <>
            <button className="practice-banner" onClick={onOpenTraining}>
              <span className="practice-banner-icon"><Dumbbell size={20} /></span>
              <span><strong>{dueCount ? 'Пора повторить' : 'Тренировка'}</strong><span>{dueCount ? `${dueCount} ждут повторения` : '5 видов упражнений по 10 слов'}</span></span>
              <span className="practice-cta">Начать <ArrowRight size={16} /></span>
            </button>
            <div className="words-toolbar">
              <div className="segmented" role="tablist" aria-label="Фильтр слов">{FILTERS.map(({ id, title }) => (
                <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{title} <small>{counts[id]}</small></button>
              ))}</div>
              <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти слово" aria-label="Найти слово" /></label>
            </div>
            <div className="word-list">{visible.map((word) => (
              <article className={`word-row${word.known ? ' word-known' : ''}`} key={word.id}>
                <button className="word-initial" onClick={() => speak(word.word, word.language)} aria-label={`Произнести ${word.word}`}><Volume2 size={14} /></button>
                <div className="word-details"><strong>{word.word}</strong><span>{word.bookTitle}</span></div>
                <div className="word-translation">{word.translation}</div>
                {word.known
                  ? <span className="known-label"><Check size={13} /> Выучено</span>
                  : <span className="level-dots" aria-label={`Уровень ${word.level} из ${MAX_LEVEL}`}>{Array.from({ length: MAX_LEVEL }, (_, index) => <i key={index} className={index < word.level ? 'filled' : ''} />)}</span>}
                <button className="delete-word" aria-label={`Удалить слово ${word.word}`} onClick={() => void onDeleteWord(word.id)}><X size={16} /></button>
              </article>
            ))}</div>
            {!visible.length && <p className="list-empty">Ничего не найдено.</p>}
          </>
        ) : <div className="empty-state"><div className="empty-icon"><Bookmark size={23} /></div><h2>Словарь пока пуст</h2><p>Открой книгу и нажми на незнакомое слово, чтобы сохранить его сюда.</p><button className="primary-action" onClick={onOpenLibrary}>Открыть библиотеку</button></div>}
      </section>
    </>
  )
}
