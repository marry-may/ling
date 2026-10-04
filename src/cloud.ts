import type { BookFile, KnownWords, SavedWord } from './domain'
import { normalizeProfile, type Profile } from './profile'
import { supabase } from './supabase'

const BOOK_BUCKET = 'book-files'
const PAGE_SIZE = 1000

function getClient() {
  if (!supabase) throw new Error('Облачный аккаунт не настроен.')
  return supabase
}

/** Supabase returns at most 1000 rows per request, so large word lists are read in ranges. */
async function fetchAllRows<T>(fetchRange: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchRange(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

export async function getAccountBooks(ownerId: string): Promise<BookFile[]> {
  const client = getClient()
  const { data, error } = await client
    .from('books')
    .select('id, title, author, format, language, progress, original_path, content_path')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    format: row.format,
    language: row.language,
    progress: row.progress,
    content: '',
    cloudOriginalPath: row.original_path,
    cloudContentPath: row.content_path,
  }))
}

export async function getAccountWords(ownerId: string): Promise<SavedWord[]> {
  const client = getClient()
  const rows = await fetchAllRows((from, to) => client
    .from('saved_words')
    .select('id, word, translation, book_title, language, context, level, due_at, known')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .range(from, to))
  return rows.map((row) => ({
    id: row.id,
    word: row.word,
    translation: row.translation,
    bookTitle: row.book_title,
    language: row.language,
    context: row.context,
    level: row.level,
    dueAt: Date.parse(row.due_at),
    known: row.known,
  }))
}

export async function getAccountKnownWords(ownerId: string): Promise<KnownWords> {
  const client = getClient()
  const rows = await fetchAllRows((from, to) => client
    .from('known_words')
    .select('language, word')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .range(from, to))
  const known: KnownWords = {}
  for (const row of rows) (known[row.language] ??= []).push(row.word)
  return known
}

export async function uploadAccountBook(ownerId: string, book: BookFile, originalFile: File): Promise<BookFile> {
  const client = getClient()
  const extension = originalFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const originalPath = `${ownerId}/${book.id}/source.${extension}`
  const contentPath = `${ownerId}/${book.id}/reader.txt`
  const bucket = client.storage.from(BOOK_BUCKET)
  const originalUpload = await bucket.upload(originalPath, originalFile, {
    contentType: originalFile.type || 'application/octet-stream',
    upsert: true,
  })
  if (originalUpload.error) throw originalUpload.error

  const contentUpload = await bucket.upload(contentPath, new Blob([book.content], { type: 'text/plain;charset=utf-8' }), {
    contentType: 'text/plain;charset=utf-8',
    upsert: true,
  })
  if (contentUpload.error) {
    await bucket.remove([originalPath])
    throw contentUpload.error
  }

  const { error } = await client.from('books').insert({
    id: book.id,
    owner_id: ownerId,
    title: book.title,
    author: book.author,
    format: book.format,
    language: book.language,
    progress: book.progress,
    original_path: originalPath,
    content_path: contentPath,
  })
  if (error) {
    await bucket.remove([originalPath, contentPath])
    throw error
  }

  return { ...book, cloudOriginalPath: originalPath, cloudContentPath: contentPath }
}

export async function deleteAccountBook(ownerId: string, book: BookFile): Promise<void> {
  const client = getClient()
  const { error } = await client.from('books').delete().eq('owner_id', ownerId).eq('id', book.id)
  if (error) throw error
  const paths = [book.cloudOriginalPath, book.cloudContentPath].filter((path): path is string => Boolean(path))
  if (paths.length) await client.storage.from(BOOK_BUCKET).remove(paths)
}

export async function uploadGuestLibrary(ownerId: string, books: BookFile[], words: SavedWord[], known: KnownWords): Promise<void> {
  const existingBooks = await getAccountBooks(ownerId)
  const makeKey = (book: Pick<BookFile, 'title' | 'author' | 'format'>) => `${book.title.trim().toLowerCase()}|${book.author.trim().toLowerCase()}|${book.format}`
  const existingBooksByKey = new Set(existingBooks.map(makeKey))
  for (const book of books) {
    const bookKey = makeKey(book)
    if (book.format === 'DEMO' || book.cloudContentPath || existingBooksByKey.has(bookKey)) continue
    const copy = { ...book, id: crypto.randomUUID() }
    const textFile = new File([book.content], `${book.title}.txt`, { type: 'text/plain' })
    await uploadAccountBook(ownerId, copy, textFile)
    existingBooksByKey.add(bookKey)
  }
  if (words.length) await saveAccountWords(ownerId, words)
  for (const [language, list] of Object.entries(known)) await saveAccountKnownWords(ownerId, language, list)
}

export async function saveAccountWords(ownerId: string, words: SavedWord[]): Promise<void> {
  if (!words.length) return
  const { error } = await getClient().from('saved_words').upsert(
    words.map((word) => ({
      id: word.id,
      owner_id: ownerId,
      word: word.word,
      translation: word.translation,
      book_title: word.bookTitle,
      language: word.language,
      context: word.context,
      level: word.level,
      due_at: new Date(word.dueAt).toISOString(),
      known: word.known,
    })),
    { onConflict: 'owner_id,language,word' },
  )
  if (error) throw error
}

export async function deleteAccountWord(ownerId: string, wordId: string): Promise<void> {
  const { error } = await getClient().from('saved_words').delete().eq('owner_id', ownerId).eq('id', wordId)
  if (error) throw error
}

export async function saveAccountKnownWords(ownerId: string, language: string, words: string[]): Promise<void> {
  const client = getClient()
  for (let start = 0; start < words.length; start += PAGE_SIZE) {
    const { error } = await client.from('known_words').upsert(
      words.slice(start, start + PAGE_SIZE).map((word) => ({ owner_id: ownerId, language, word })),
      { onConflict: 'owner_id,language,word', ignoreDuplicates: true },
    )
    if (error) throw error
  }
}

export async function deleteAccountKnownWord(ownerId: string, language: string, word: string): Promise<void> {
  const { error } = await getClient().from('known_words').delete().eq('owner_id', ownerId).eq('language', language).eq('word', word)
  if (error) throw error
}

export async function updateAccountProgress(ownerId: string, bookId: string, progress: number): Promise<void> {
  const { error } = await getClient().from('books').update({ progress }).eq('owner_id', ownerId).eq('id', bookId)
  if (error) throw error
}

export async function downloadAccountBookContent(path: string): Promise<string> {
  const { data, error } = await getClient().storage.from(BOOK_BUCKET).download(path)
  if (error) throw error
  return data.text()
}

/** The study profile lives in the account's user metadata, so it needs no table of its own. */
export async function getAccountProfile(): Promise<Profile> {
  const { data, error } = await getClient().auth.getUser()
  if (error) throw error
  return normalizeProfile(data.user.user_metadata?.ling_profile)
}

export async function saveAccountProfile(profile: Profile): Promise<void> {
  const { error } = await getClient().auth.updateUser({ data: { ling_profile: profile } })
  if (error) throw error
}
