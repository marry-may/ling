/*
 * The interface language: one choice for the landing page and the app (Russian, Ukrainian or English). It starts
 * from the language picked on the landing page or the browser's, is kept on the device and, once signed in, in the
 * account profile. Components read texts with useMessages(); code outside React with messages().
 */
import { useSyncExternalStore } from 'react'
import { detectLandingLanguage, type LandingLanguage } from '../landingText'
import { en } from './en'
import { ru, type Messages } from './ru'
import { uk } from './uk'

export type { Messages } from './ru'
export type UiLanguage = LandingLanguage

export const UI_LANGUAGES: { code: UiLanguage; name: string }[] = [
  { code: 'uk', name: 'Українська' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
]

const MESSAGES: Record<UiLanguage, Messages> = { ru, uk, en }
const STORAGE_KEY = 'ling-landing-language'

export const isUiLanguage = (value: unknown): value is UiLanguage => value === 'ru' || value === 'uk' || value === 'en'

let current: UiLanguage = detectLandingLanguage()
const listeners = new Set<() => void>()

export function uiLanguage(): UiLanguage {
  return current
}

/** `remember: false` applies the language to this page only, leaving the device's choice as it is. */
export function setUiLanguage(language: UiLanguage, remember = true) {
  try {
    if (remember) localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The choice still applies on this visit.
  }
  if (language === current) return
  current = language
  listeners.forEach((listener) => listener())
}

/** Texts in the current interface language, for code outside components. */
export function messages(): Messages {
  return MESSAGES[current]
}

export function messagesFor(language: UiLanguage): Messages {
  return MESSAGES[language]
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The current interface language; the component re-renders when it changes. */
export function useUiLanguage(): UiLanguage {
  return useSyncExternalStore(subscribe, uiLanguage)
}

/** Texts in the current interface language; the component re-renders when it changes. */
export function useMessages(): Messages {
  return MESSAGES[useUiLanguage()]
}

const PART_PREFIX = /^(?:Часть|Частина|Part) \d+(?: · )?/

/**
 * The title of a part of a long book. Parts are stored as "<Part N> · <chapter>" in the language of the import,
 * so the prefix is rebuilt in the current interface language.
 */
export function partTitle(title: string, part: number | undefined, t: Messages): string {
  if (!part) return title
  const chapter = title.replace(PART_PREFIX, '')
  return chapter ? `${t.common.part(part)} · ${chapter}` : t.common.part(part)
}
