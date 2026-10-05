import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ling-theme'
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** The theme the visitor picked, or null to follow the system setting. */
function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // The browser chrome on phones follows the page background.
  const background = getComputedStyle(document.documentElement).getPropertyValue('--s-f5f8f5').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background || '#f5f8f5')
}

/**
 * The current theme and a toggle. index.html applies the same choice before React starts, so the page never
 * flashes in the wrong theme.
 */
export function useTheme(): [Theme, () => void] {
  const [stored, setStored] = useState(readStoredTheme)
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)
  const theme: Theme = stored ?? (systemDark ? 'dark' : 'light')

  useEffect(() => {
    const query = darkQuery()
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => applyTheme(theme), [theme])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setStored(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The choice still applies until the page is closed.
    }
  }

  return [theme, toggle]
}
