import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Check, ExternalLink, LoaderCircle, Plus } from 'lucide-react'
import { CATALOG, catalogPageUrl, coverUrl, DIFFICULTY_LABELS, readingTime, shelfCopies, type CatalogBook } from './catalog'
import type { BookFile } from './domain'
import { getLanguage } from './languages'

type CatalogPageProps = {
  shelf: BookFile[]
  studyLanguage: string
  selectedSlug: string | null
  busySlug: string | null
  onSelect: (slug: string | null) => void
  /** Adds the book to the shelf if needed and opens it. */
  onStart: (book: CatalogBook) => void
  onAdd: (book: CatalogBook) => void
}

const CATALOG_LANGUAGES = Array.from(new Set(CATALOG.map((book) => book.language)))

function coverIndex(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 4
}

function shelfProgress(copies: BookFile[]): number {
  return Math.round(copies.reduce((sum, copy) => sum + copy.progress, 0) / Math.max(1, copies.length))
}

function Cover({ book }: { book: CatalogBook }) {
  const image = coverUrl(book)
  if (image) return <div className="book-cover has-image"><img className="cover-image" src={image} alt="" loading="lazy" /></div>
  return (
    <div className="book-cover"><span className="cover-stamp">{book.language.toUpperCase()}</span><BookOpen size={25} strokeWidth={1.5} /><div className="cover-lines"><span /><span /><span /></div><span className="cover-title">{book.title}</span><span className="cover-author">{book.author}</span></div>
  )
}

export function CatalogPage({ shelf, studyLanguage, selectedSlug, busySlug, onSelect, onStart, onAdd }: CatalogPageProps) {
  const [filter, setFilter] = useState(() => (CATALOG_LANGUAGES.includes(studyLanguage) ? studyLanguage : 'all'))
  const visible = useMemo(() => CATALOG.filter((book) => filter === 'all' || book.language === filter), [filter])
  const selected = CATALOG.find((book) => book.slug === selectedSlug)

  if (selected) {
    const copies = shelfCopies(selected, shelf)
    const progress = shelfProgress(copies)
    const busy = busySlug === selected.slug
    return (
      <section className="catalog-detail">
        <button className="quiet-button folder-back" onClick={() => onSelect(null)}><ArrowLeft size={16} /> Библиотека Ling</button>
        <div className="catalog-detail-main">
          <div className={`catalog-detail-cover cover-${coverIndex(selected.slug)}`}><Cover book={selected} /></div>
          <div className="catalog-detail-info">
            <span className="eyebrow">{getLanguage(selected.language).name.toUpperCase()} · {selected.year}</span>
            <h1 lang={selected.language}>{selected.title}</h1>
            <p className="catalog-author">{selected.author} <span>({selected.authorYears})</span></p>
            <ul className="catalog-facts">
              <li>Сложность: <strong>{DIFFICULTY_LABELS[selected.difficulty]}</strong></li>
              <li>{selected.words.toLocaleString('ru-RU')} слов</li>
              <li>{selected.chapters} глав</li>
              <li>{readingTime(selected.words)}</li>
            </ul>
            <p className="catalog-description">{selected.description.ru}</p>
            {copies.length > 0 && <div className="folder-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress > 0 ? `${progress}% прочитано` : 'На полке, ещё не начата'}</small></div>}
            <div className="catalog-actions">
              <button className="primary-action" onClick={() => onStart(selected)} disabled={busy}>
                {busy ? <LoaderCircle size={16} className="spin" /> : <BookOpen size={16} />}
                {busy ? 'Загружаем книгу...' : copies.length ? 'Продолжить чтение' : 'Начать читать'}
              </button>
              {copies.length
                ? <span className="catalog-owned"><Check size={15} /> В моих книгах</span>
                : <button className="secondary-action" onClick={() => onAdd(selected)} disabled={busy}><Plus size={16} /> Добавить в мои книги</button>}
              <a className="quiet-button catalog-page-link" href={catalogPageUrl(selected)} target="_blank" rel="noreferrer">Страница книги <ExternalLink size={14} /></a>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <header className="page-header"><div><span className="eyebrow">БИБЛИОТЕКА LING</span><h1>Книги в оригинале<span className="heading-period">.</span></h1><p>Классика в свободном доступе. Добавь книгу на свою полку и читай с переводом любого слова.</p></div></header>
      <nav className="language-switcher" aria-label="Язык книг">
        <button className={filter === 'all' ? 'language-chip selected' : 'language-chip'} onClick={() => setFilter('all')}>Все языки<small>{CATALOG.length}</small></button>
        {CATALOG_LANGUAGES.map((code) => (
          <button key={code} className={filter === code ? 'language-chip selected' : 'language-chip'} onClick={() => setFilter(code)}>
            {getLanguage(code).name}<small>{CATALOG.filter((book) => book.language === code).length}</small>
          </button>
        ))}
      </nav>
      <section className="library-content">
        <div className="book-grid">{visible.map((book) => {
          const copies = shelfCopies(book, shelf)
          return (
            <div className={`book-slot cover-${coverIndex(book.slug)}`} key={book.slug}>
              <button className="book-card" onClick={() => onSelect(book.slug)}>
                <Cover book={book} />
                <div className="book-card-info">
                  <div className="book-card-title">{book.title}</div>
                  <div className="book-card-author">{book.author}</div>
                  <div className="catalog-card-meta">
                    {copies.length ? <span className="catalog-owned small"><Check size={12} /> На полке · {shelfProgress(copies)}%</span> : <span>{DIFFICULTY_LABELS[book.difficulty]} · {readingTime(book.words).replace('≈ ', '')}</span>}
                  </div>
                </div>
              </button>
            </div>
          )
        })}</div>
      </section>
    </>
  )
}
