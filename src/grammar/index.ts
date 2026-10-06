import type { UiLanguage } from '../i18n'
import { ENGLISH_LESSONS } from './en'
import { SPANISH_LESSONS } from './es'
import enTexts from './i18n/en.json'
import ukTexts from './i18n/uk.json'
import type { Lesson } from './types'

export type { Exercise, Example, Lesson, TheoryBlock } from './types'

const LESSONS: Lesson[] = [...ENGLISH_LESSONS, ...SPANISH_LESSONS]

/**
 * Lessons are written in Russian; i18n/<language>.json holds the other interface languages as "path → text" for
 * every Russian string of a lesson (e.g. "theory.0.examples.1.translation"). An empty text hides that line.
 */
const TRANSLATIONS: Partial<Record<UiLanguage, Record<string, Record<string, string>>>> = { uk: ukTexts, en: enTexts }

function translated(lesson: Lesson, texts: Record<string, string> | undefined): Lesson {
  if (!texts) return lesson
  const copy = structuredClone(lesson) as unknown as Record<string, unknown>
  for (const [path, text] of Object.entries(texts)) {
    const keys = path.split('.')
    const last = keys.pop()!
    let target = copy
    for (const key of keys) target = target[key] as Record<string, unknown>
    target[last] = text
  }
  return copy as unknown as Lesson
}

const cache = new Map<string, Lesson[]>()

/** The lessons for a studied language, explained in the interface language. */
export function lessonsFor(language: string, uiLanguage: UiLanguage = 'ru'): Lesson[] {
  const key = `${language}:${uiLanguage}`
  if (!cache.has(key)) {
    const texts = TRANSLATIONS[uiLanguage]
    cache.set(key, LESSONS.filter((lesson) => lesson.language === language).map((lesson) => translated(lesson, texts?.[lesson.id])))
  }
  return cache.get(key)!
}

/** Languages that have grammar lessons so far. */
export const GRAMMAR_LANGUAGES = Array.from(new Set(LESSONS.map((lesson) => lesson.language)))

/** A lesson counts as passed from this share of right answers (percent). */
export const PASS_SCORE = 70

const strip = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '')

/** Lowercased, with apostrophes unified, spaces collapsed and, for sentences, punctuation removed. */
function clean(text: string, punctuation = false): string {
  let value = text.toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim()
  if (punctuation) value = value.replace(/[¿?¡!.,;:«»"]/g, '').replace(/\s+/g, ' ').trim()
  return value
}

/**
 * `correct` when the answer matches; `accent` when it matches only without accent marks (counted as right,
 * with a note); otherwise `wrong`.
 */
export function checkAnswer(given: string, answers: string[], sentence = false): 'correct' | 'accent' | 'wrong' {
  const value = clean(given, sentence)
  if (!value) return 'wrong'
  const options = answers.map((answer) => clean(answer, sentence))
  if (options.includes(value)) return 'correct'
  return options.some((option) => strip(option) === strip(value)) ? 'accent' : 'wrong'
}
