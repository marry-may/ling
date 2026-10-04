import type { SavedWord } from './domain'
import { DEFAULT_LANGUAGE } from './languages'

const DAY = 24 * 60 * 60 * 1000
/** Delay before the next review after reaching each learning stage. */
const STAGE_DELAYS: Record<number, number> = { 1: 0, 2: DAY, 3: 3 * DAY, 4: 7 * DAY }

export const MAX_LEVEL = 4

export type Grade = 'again' | 'good' | 'easy'

export function schedule(level: number, now = Date.now()): number {
  return now + (STAGE_DELAYS[level] ?? 0)
}

export function setLevel(word: SavedWord, level: number, now = Date.now()): SavedWord {
  if (level > MAX_LEVEL) return { ...word, level: MAX_LEVEL, known: true }
  return { ...word, level, known: false, dueAt: schedule(level, now) }
}

export function review(word: SavedWord, grade: Grade, now = Date.now()): SavedWord {
  if (grade === 'easy') return setLevel(word, MAX_LEVEL + 1, now)
  if (grade === 'again') return setLevel(word, 1, now)
  return setLevel(word, word.level + 1, now)
}

export function isDue(word: SavedWord, now = Date.now()): boolean {
  return !word.known && word.dueAt <= now
}

/** Fills in fields missing from words saved by earlier app versions. */
export function normalizeWord(word: Partial<SavedWord> & Pick<SavedWord, 'id' | 'word'>): SavedWord {
  return {
    id: word.id,
    word: word.word,
    translation: word.translation ?? '',
    bookTitle: word.bookTitle ?? 'Без книги',
    language: word.language ?? DEFAULT_LANGUAGE,
    context: word.context ?? '',
    level: Math.min(MAX_LEVEL, Math.max(1, word.level ?? 1)),
    dueAt: word.dueAt ?? 0,
    known: word.known ?? false,
  }
}
