import catalogData from '../catalog/books.json'
import type { BookFile } from './domain'
import { messages, type UiLanguage } from './i18n'
import type { Section } from './text'

/** A public-domain book of the Ling Library (catalog/books.json; texts are built by scripts/build-library.mjs). */
export type CatalogBook = {
  slug: string
  gutenbergId: number
  title: string
  author: string
  authorYears: string
  year: number
  language: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: Record<'ru' | 'uk' | 'en', string>
  /** The edition's own cover is in catalog/covers/<slug>.jpg (a scan from Project Gutenberg). */
  cover?: boolean
  words: number
  chapters: number
}

export const CATALOG = catalogData as CatalogBook[]

export function findCatalogBook(slug: string): CatalogBook | undefined {
  return CATALOG.find((book) => book.slug === slug)
}

/** The scanned cover of the book's edition, when it has one; other books get a drawn cover. */
export function coverUrl(book: CatalogBook | undefined): string | undefined {
  return book?.cover ? `library/${book.slug}/cover.jpg` : undefined
}

/** The Ling Library book a shelf book was added from, matched by title and language. */
export function catalogBookOf(title: string, language: string): CatalogBook | undefined {
  return CATALOG.find((book) => book.title === title && book.language === language)
}

/** The book's public page on the site, in the interface language. */
export function catalogPageUrl(book: CatalogBook, language: UiLanguage): string {
  return `${language === 'ru' ? '' : `${language}/`}library/${book.slug}/`
}

export function readingTime(words: number): string {
  const minutes = Math.round(words / 180)
  const t = messages().catalog
  return minutes >= 90 ? t.hours(Math.round(minutes / 60)) : t.minutes(Math.max(5, Math.round(minutes / 5) * 5))
}

/** The learner's copy of a catalog book (or its parts), matched by title and language. */
export function shelfCopies(book: CatalogBook, shelf: BookFile[]): BookFile[] {
  return shelf
    .filter((item) => item.language === book.language && (item.collectionTitle ?? item.title) === book.title)
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0))
}

export async function loadCatalogChapters(book: CatalogBook): Promise<Section[]> {
  const response = await fetch(`library/${book.slug}/book.json`)
  if (!response.ok) throw new Error(messages().catalog.loadFailed)
  const { chapters } = await response.json() as { chapters: { title: string; text: string }[] }
  return chapters.map((chapter) => ({ title: chapter.title, content: chapter.text }))
}
