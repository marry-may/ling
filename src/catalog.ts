import catalogData from '../catalog/books.json'
import type { BookFile } from './domain'
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
  words: number
  chapters: number
}

export const CATALOG = catalogData as CatalogBook[]

export const DIFFICULTY_LABELS: Record<CatalogBook['difficulty'], string> = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' }

export function findCatalogBook(slug: string): CatalogBook | undefined {
  return CATALOG.find((book) => book.slug === slug)
}

/** The book's public page on the site. */
export function catalogPageUrl(book: CatalogBook): string {
  return `library/${book.slug}/`
}

export function readingTime(words: number): string {
  const minutes = Math.round(words / 180)
  return minutes >= 90 ? `≈ ${Math.round(minutes / 60)} ч чтения` : `≈ ${Math.max(5, Math.round(minutes / 5) * 5)} мин чтения`
}

/** The learner's copy of a catalog book (or its parts), matched by title and language. */
export function shelfCopies(book: CatalogBook, shelf: BookFile[]): BookFile[] {
  return shelf
    .filter((item) => item.language === book.language && (item.collectionTitle ?? item.title) === book.title)
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0))
}

export async function loadCatalogChapters(book: CatalogBook): Promise<Section[]> {
  const response = await fetch(`library/${book.slug}/book.json`)
  if (!response.ok) throw new Error('Не удалось загрузить книгу из библиотеки Ling.')
  const { chapters } = await response.json() as { chapters: { title: string; text: string }[] }
  return chapters.map((chapter) => ({ title: chapter.title, content: chapter.text }))
}
