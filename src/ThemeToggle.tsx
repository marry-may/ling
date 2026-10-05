import { Moon, Sun } from 'lucide-react'
import type { Theme } from './theme'

export function ThemeToggle({ theme, onToggle, className = 'icon-button theme-toggle' }: { theme: Theme; onToggle: () => void; className?: string }) {
  const label = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'
  return (
    <button className={className} onClick={onToggle} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
