/**
 * Grammar lessons: a short explanation in Russian (the app's language) with examples, then exercises that are
 * checked one by one. In texts, **double asterisks** mark the words to highlight; ___ marks the gap to fill.
 */
export type Example = { text: string; translation: string }

export type TheoryBlock = {
  heading?: string
  text: string
  examples?: Example[]
  table?: { head: string[]; rows: string[][] }
}

export type Exercise =
  /** Pick the option that fills the gap. */
  | { kind: 'choice'; prompt: string; options: string[]; answer: number; explain: string }
  /** Type the missing form; `hint` is shown in brackets after the gap. */
  | { kind: 'input'; prompt: string; hint?: string; answers: string[]; explain: string }
  /** Put the words in order to translate the sentence; with no translation, just put them in order. */
  | { kind: 'order'; translation: string; answer: string; explain?: string }

export type Lesson = {
  id: string
  language: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  title: string
  summary: string
  theory: TheoryBlock[]
  exercises: Exercise[]
}
