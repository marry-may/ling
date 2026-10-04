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
