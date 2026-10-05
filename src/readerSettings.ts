import { useState, type CSSProperties } from 'react'

export type ReaderFont = 'serif' | 'sans'
export type ReaderSettings = { fontSize: number; lineHeight: number; font: ReaderFont }

export const FONT_SIZE_RANGE = { min: 14, max: 28 }
export const LINE_HEIGHTS: { value: number; label: string }[] = [
  { value: 1.6, label: 'Плотно' },
  { value: 1.95, label: 'Обычно' },
  { value: 2.3, label: 'Свободно' },
]

const STORAGE_KEY = 'ling-reader-settings'
const DEFAULTS: ReaderSettings = { fontSize: 18, lineHeight: 1.95, font: 'serif' }

function readSettings(): ReaderSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ReaderSettings>
    return {
      fontSize: typeof stored.fontSize === 'number' ? Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, stored.fontSize)) : DEFAULTS.fontSize,
      lineHeight: LINE_HEIGHTS.some((option) => option.value === stored.lineHeight) ? stored.lineHeight! : DEFAULTS.lineHeight,
      font: stored.font === 'sans' ? 'sans' : DEFAULTS.font,
    }
  } catch {
    return DEFAULTS
  }
}

/** Text size, line spacing and typeface of the reader, remembered on this device. */
export function useReaderSettings(): [ReaderSettings, (change: Partial<ReaderSettings>) => void] {
  const [settings, setSettings] = useState(readSettings)
  function update(change: Partial<ReaderSettings>) {
    const next = { ...settings, ...change }
    setSettings(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // The settings still apply until the page is closed.
    }
  }
  return [settings, update]
}

export function readerTextStyle(settings: ReaderSettings): CSSProperties {
  return {
    '--reader-size': `${settings.fontSize}px`,
    '--reader-leading': String(settings.lineHeight),
    '--reader-font': settings.font === 'serif' ? 'var(--serif)' : '"DM Sans", sans-serif',
  } as CSSProperties
}
