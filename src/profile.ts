/** Study activity in one language. Kept compact because it travels in the account's user metadata. */
export type LanguageActivity = { days: number; streak: number; lastDay: string; recent: string[] }

export type Profile = {
  /** Languages the learner added explicitly, even before uploading a book. */
  languages: string[]
  activity: Record<string, LanguageActivity>
  /** The learner's own language, which words are translated into. */
  translationLanguage?: string
  /** Interface language: ru, uk or en (src/i18n). */
  uiLanguage?: string
  /** Languages that already received a starter book, so a deleted one does not come back. */
  samples?: string[]
  /** Best result of each grammar lesson, in percent, by lesson id (src/grammar). */
  grammar?: Record<string, number>
}

export const EMPTY_PROFILE: Profile = { languages: [], activity: {} }
const RECENT_DAYS = 14

function dayString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function today(): string {
  return dayString(new Date())
}

function yesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return dayString(date)
}

/** Returns the profile with today counted for `language`, or null when today is already counted. */
export function recordDay(profile: Profile, language: string): Profile | null {
  const day = today()
  const current = profile.activity[language]
  if (current?.lastDay === day) return null
  const activity: LanguageActivity = {
    days: (current?.days ?? 0) + 1,
    streak: current?.lastDay === yesterday() ? current.streak + 1 : 1,
    lastDay: day,
    recent: [...(current?.recent ?? []), day].slice(-RECENT_DAYS),
  }
  return { ...profile, activity: { ...profile.activity, [language]: activity } }
}

/** Days in a row up to today; a streak survives until the end of the day after the last session. */
export function currentStreak(activity?: LanguageActivity): number {
  if (!activity) return 0
  return activity.lastDay === today() || activity.lastDay === yesterday() ? activity.streak : 0
}

/** Days of the last week with a session, oldest first. */
export function lastWeek(activity?: LanguageActivity): { day: string; active: boolean }[] {
  const recent = new Set(activity?.recent ?? [])
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const day = dayString(date)
    return { day, active: recent.has(day) }
  })
}

export function normalizeProfile(value: unknown): Profile {
  const profile = value as Partial<Profile> | null | undefined
  return {
    languages: Array.isArray(profile?.languages) ? profile.languages.filter((code) => typeof code === 'string') : [],
    activity: profile?.activity && typeof profile.activity === 'object' ? profile.activity : {},
    translationLanguage: typeof profile?.translationLanguage === 'string' ? profile.translationLanguage : undefined,
    uiLanguage: typeof profile?.uiLanguage === 'string' ? profile.uiLanguage : undefined,
    samples: Array.isArray(profile?.samples) ? profile.samples.filter((code) => typeof code === 'string') : undefined,
    grammar: normalizeGrammar(profile?.grammar),
  }
}

function normalizeGrammar(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
  return entries.length ? Object.fromEntries(entries) : undefined
}

function mergeGrammar(local?: Record<string, number>, remote?: Record<string, number>): Record<string, number> | undefined {
  if (!local && !remote) return undefined
  const merged = { ...remote }
  for (const [lesson, score] of Object.entries(local ?? {})) merged[lesson] = Math.max(score, merged[lesson] ?? 0)
  return merged
}

/** Combines the device copy and the account copy, keeping the furthest progress of each language. */
export function mergeProfiles(local: Profile, remote: Profile): Profile {
  const activity: Record<string, LanguageActivity> = { ...remote.activity }
  for (const [language, entry] of Object.entries(local.activity)) {
    const other = activity[language]
    if (!other) {
      activity[language] = entry
      continue
    }
    const latest = entry.lastDay >= other.lastDay ? entry : other
    activity[language] = {
      ...latest,
      days: Math.max(entry.days, other.days),
      recent: Array.from(new Set([...other.recent, ...entry.recent])).sort().slice(-RECENT_DAYS),
    }
  }
  return {
    languages: Array.from(new Set([...remote.languages, ...local.languages])),
    activity,
    // A choice made on another device reaches this one through the account copy.
    translationLanguage: remote.translationLanguage ?? local.translationLanguage,
    uiLanguage: remote.uiLanguage ?? local.uiLanguage,
    samples: remote.samples || local.samples ? Array.from(new Set([...(remote.samples ?? []), ...(local.samples ?? [])])) : undefined,
    // The best result of a lesson on any device wins.
    grammar: mergeGrammar(local.grammar, remote.grammar),
  }
}

export function sameProfile(a: Profile, b: Profile): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
