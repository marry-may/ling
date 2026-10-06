import { useMemo, useState } from 'react'
import { ArrowRight, Bookmark, Check, Dumbbell, Search, Volume2, X } from 'lucide-react'
import type { SavedWord } from './domain'
import { useMessages } from './i18n'
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

const FILTERS: Filter[] = ['all', 'learning', 'known']

export function WordsPage({ words, language, onDeleteWord, onOpenLibrary, onOpenTraining }: WordsPageProps) {
  const t = useMessages()
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
      <header className="page-header words-header"><div><span className="eyebrow">{t.words.kicker(getLanguage(language).name.toUpperCase())}</span><h1>{t.words.title}<span className="heading-period">.</span></h1><p>{t.words.lead}</p></div><div className="header-stats"><strong>{words.length}</strong><span>{t.words.saved}</span></div></header>
      <section className="words-page">
        {words.length > 0 ? (
          <>
            <button className="practice-banner" onClick={onOpenTraining}>
              <span className="practice-banner-icon"><Dumbbell size={20} /></span>
              <span><strong>{dueCount ? t.words.dueTitle : t.words.training}</strong><span>{dueCount ? t.words.dueText(dueCount) : t.words.trainingText}</span></span>
              <span className="practice-cta">{t.words.start} <ArrowRight size={16} /></span>
            </button>
            <div className="words-toolbar">
              <div className="segmented" role="tablist" aria-label={t.words.filter}>{FILTERS.map((id) => (
                <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{t.words.filters[id]} <small>{counts[id]}</small></button>
              ))}</div>
              <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.words.search} aria-label={t.words.search} /></label>
            </div>
            <div className="word-list">{visible.map((word) => (
              <article className={`word-row${word.known ? ' word-known' : ''}`} key={word.id}>
                <button className="word-initial" onClick={() => speak(word.word, word.language)} aria-label={t.words.speak(word.word)}><Volume2 size={14} /></button>
                <div className="word-details"><strong>{word.word}</strong><span>{word.bookTitle}</span></div>
                <div className="word-translation">{word.translation}</div>
                {word.known
                  ? <span className="known-label"><Check size={13} /> {t.words.known}</span>
                  : <span className="level-dots" aria-label={t.words.level(word.level, MAX_LEVEL)}>{Array.from({ length: MAX_LEVEL }, (_, index) => <i key={index} className={index < word.level ? 'filled' : ''} />)}</span>}
                <button className="delete-word" aria-label={t.words.delete(word.word)} onClick={() => void onDeleteWord(word.id)}><X size={16} /></button>
              </article>
            ))}</div>
            {!visible.length && <p className="list-empty">{t.words.nothing}</p>}
          </>
        ) : <div className="empty-state"><div className="empty-icon"><Bookmark size={23} /></div><h2>{t.words.emptyTitle}</h2><p>{t.words.emptyText}</p><button className="primary-action" onClick={onOpenLibrary}>{t.common.openLibrary}</button></div>}
      </section>
    </>
  )
}
