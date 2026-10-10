import { ArrowRight, LoaderCircle, Plus } from 'lucide-react'
import { CATALOG, readingTime, shelfCopies, type CatalogBook } from './catalog'
import { CatalogCover, catalogCoverIndex } from './CatalogPage'
import type { BookFile } from './domain'
import { useMessages } from './i18n'
import { getLanguage } from './languages'

type LibraryPicksProps = {
  shelf: BookFile[]
  studyLanguage: string
  busySlug: string | null
  onOpen: (slug: string) => void
  onAdd: (book: CatalogBook) => void
  onAll: () => void
}

const PICKS = 4
const LEVEL_ORDER: Record<CatalogBook['difficulty'], number> = { easy: 0, medium: 1, hard: 2 }

/**
 * A band of Ling Library books in the language being learned, under the shelf on the home page, so the library is
 * found without looking for it: the easiest books not yet on the shelf come first.
 */
export function LibraryPicks({ shelf, studyLanguage, busySlug, onOpen, onAdd, onAll }: LibraryPicksProps) {
  const t = useMessages()
  const inLanguage = CATALOG.filter((book) => book.language === studyLanguage)
  const picks = inLanguage
    .filter((book) => !shelfCopies(book, shelf).length)
    .sort((a, b) => LEVEL_ORDER[a.difficulty] - LEVEL_ORDER[b.difficulty] || a.words - b.words)
    .slice(0, PICKS)
  if (!picks.length) return null

  return (
    <section className="library-picks" aria-label={t.common.lingLibrary}>
      <div className="library-toolbar">
        <div><span className="section-marker library-marker" /> {t.home.picksTitle(getLanguage(studyLanguage).name.toUpperCase())}</div>
        <button className="library-picks-all" onClick={onAll}>{t.home.picksAll(inLanguage.length)} <ArrowRight size={14} /></button>
      </div>
      <p className="library-picks-lead">{t.home.picksLead}</p>
      <div className="library-picks-row">
        {picks.map((book) => {
          const busy = busySlug === book.slug
          return (
            <div className={`book-slot cover-${catalogCoverIndex(book.slug)}`} key={book.slug}>
              <button className="book-card" onClick={() => onOpen(book.slug)}>
                <CatalogCover book={book} />
                <div className="book-card-info">
                  <div className="book-card-title" lang={book.language}>{book.title}</div>
                  <div className="book-card-author">{book.author}</div>
                  <div className="catalog-card-meta"><span>{t.catalog.levels[book.difficulty]} · {readingTime(book.words).replace('≈ ', '')}</span></div>
                </div>
              </button>
              <button className="library-pick-add" onClick={() => onAdd(book)} disabled={busy}>
                {busy ? <LoaderCircle size={14} className="spin" /> : <Plus size={14} />} {t.home.picksAdd}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
