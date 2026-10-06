import { Moon, Sun } from 'lucide-react'
import { useMessages } from './i18n'
import type { Theme } from './theme'

export function ThemeToggle({ theme, onToggle, className = 'icon-button theme-toggle' }: { theme: Theme; onToggle: () => void; className?: string }) {
  const { theme: labels } = useMessages().account
  const label = theme === 'dark' ? labels.light : labels.dark
  return (
    <button className={className} onClick={onToggle} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
