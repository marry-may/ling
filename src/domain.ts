export type BookFile = {
  id: string
  title: string
  author: string
  content: string
  format: string
  language: string
  progress: number
  page?: number
  cloudOriginalPath?: string
  cloudContentPath?: string
  /** Set on each part of a book that was too long and was split; all parts share one folder. */
  collectionId?: string
  collectionTitle?: string
  part?: number
  partCount?: number
}

export type SavedWord = {
  id: string
  word: string
  translation: string
  bookTitle: string
  language: string
  context: string
  /** Learning stage 1–4; a word with `known: true` is past all stages. */
  level: number
  dueAt: number
  known: boolean
}

/** Words marked as known without being saved, grouped by language code. */
export type KnownWords = Record<string, string[]>

/** The title of the whole book, for parts of a split book as well. */
export function bookTitleOf(book: Pick<BookFile, 'title' | 'collectionTitle'>): string {
  return book.collectionTitle ?? book.title
}
