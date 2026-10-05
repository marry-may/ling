import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { CATALOG, type CatalogBook } from './catalog'
import { COVER_ART } from './coverArt'
import type { LandingText } from './landingText'
import './BookShelf.css'

/**
 * The Ling Library as a shelf of spines that drifts sideways; the book in the middle turns to show its cover.
 * Spines and covers are drawn here (no scans), each book with its own palette and layout.
 */

type Palette = { bg: string; ink: string; accent: string }

const PALETTES: Palette[] = [
  { bg: '#f3a6bd', ink: '#2b1d22', accent: '#e8473f' },
  { bg: '#ee6b52', ink: '#fff6ee', accent: '#2d2a26' },
  { bg: '#f29a38', ink: '#2a2016', accent: '#fff3df' },
  { bg: '#2e7d78', ink: '#f4efe4', accent: '#f2b84b' },
  { bg: '#23292a', ink: '#f1ece2', accent: '#ee6b52' },
  { bg: '#efe7d6', ink: '#23302b', accent: '#c8412f' },
  { bg: '#3456a3', ink: '#f4efe6', accent: '#f3a6bd' },
  { bg: '#e3b23c', ink: '#22302b', accent: '#315b4d' },
  { bg: '#b8a4de', ink: '#231e33', accent: '#ffffff' },
  { bg: '#315b4d', ink: '#f3efe3', accent: '#e9b44c' },
  { bg: '#c63f2e', ink: '#fbf1e6', accent: '#23292a' },
  { bg: '#9cc8e8', ink: '#14283d', accent: '#ee6b52' },
]
const COVER_LAYOUTS = ['frame', 'type', 'circle', 'bands', 'pattern', 'split'] as const
const SPINE_LAYOUTS = ['serif', 'caps', 'banded'] as const
type CoverLayout = (typeof COVER_LAYOUTS)[number]
type SpineLayout = (typeof SPINE_LAYOUTS)[number]

type ShelfBook = { book: CatalogBook; palette: Palette; cover: CoverLayout; spine: SpineLayout; height: number; thickness: number; lean: number }

function hash(text: string): number {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0
  return Math.abs(value)
}

// Neighbours on the shelf never share a palette or a layout: the steps are coprime with the list lengths.
const SHELF: ShelfBook[] = CATALOG.map((book, index) => ({
  book,
  palette: PALETTES[(index * 5) % PALETTES.length],
  cover: COVER_LAYOUTS[(index * 5) % COVER_LAYOUTS.length],
  spine: SPINE_LAYOUTS[index % SPINE_LAYOUTS.length],
  /** Share of the shelf height, 0.78–1. */
  height: 0.78 + (hash(book.slug) % 23) / 100,
  /** Spine width as a share of the shelf height: longer books are thicker. */
  thickness: Math.min(0.18, Math.max(0.085, 0.06 + Math.sqrt(book.words) * 0.00045)),
  /** Degrees: a few books lean on the next one (positive) or the previous one (negative); never two side by side. */
  lean: index % 6 === 2 ? 5 + (hash(book.slug) % 5) : index % 6 === 5 ? -(4 + (hash(book.slug) % 4)) : 0,
}))
const COUNT = SHELF.length
const COPIES = 3
const COVER_RATIO = 0.68
const AUTOPLAY_MS = 3400
const TURN_MS = 850
const HEADROOM = 0.78

const clamp = (index: number) => Math.min(COUNT * COPIES - 1, Math.max(0, index))
const shortAuthor = (author: string) => author.split(' ').at(-1) ?? author

function Cover({ book, palette, layout, id }: { book: CatalogBook; palette: Palette; layout: CoverLayout; id: string }) {
  const style = { '--bg': palette.bg, '--ink': palette.ink, '--accent': palette.accent } as CSSProperties
  const meta = <span className="shelf-cover-meta">{book.language.toUpperCase()} · {book.year}</span>
  const title = <span className="shelf-cover-title" lang={book.language}>{book.title}</span>
  const author = <span className="shelf-cover-author">{book.author}</span>
  const art = <svg className="shelf-art" viewBox="0 0 100 100" aria-hidden="true">{COVER_ART[book.slug]}</svg>
  return (
    <span className={`shelf-cover cover-layout-${layout}${book.title.length > 24 ? ' is-long' : ''}`} style={style}>
      {layout === 'frame' && <><span className="shelf-cover-frame" />{author}{art}{title}{meta}</>}
      {layout === 'type' && <>{meta}{title}{art}{author}</>}
      {layout === 'circle' && <><span className="shelf-cover-sun">{art}</span>{title}{author}</>}
      {layout === 'bands' && <>{author}{title}{art}<span className="shelf-cover-bands"><i /><i /><i /></span></>}
      {layout === 'pattern' && <><svg className="shelf-cover-pattern" aria-hidden="true"><defs><pattern id={`dots-${id}`} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.2" /></pattern></defs><rect width="100%" height="100%" fill={`url(#dots-${id})`} /></svg><span className="shelf-cover-badge">{art}</span><span className="shelf-cover-label">{title}{author}</span></>}
      {layout === 'split' && <><span className="shelf-cover-strip"><span>{book.language.toUpperCase()}</span></span><span className="shelf-cover-body">{art}{title}{author}</span></>}
    </span>
  )
}

function Spine({ book, palette, layout, height }: { book: CatalogBook; palette: Palette; layout: SpineLayout; height: number }) {
  // Room for the title along the spine (the author takes the rest), at about 0.62 em per character.
  const fit = (height * 0.68) / (book.title.length * (layout === 'caps' ? 0.72 : 0.56))
  const style = { '--bg': palette.bg, '--ink': palette.ink, '--accent': palette.accent, '--fit': `${Math.max(9, fit)}px` } as CSSProperties
  return (
    <span className={`shelf-spine spine-layout-${layout}`} style={style}>
      {layout === 'banded' && <i className="shelf-spine-band" />}
      <span className="shelf-spine-title" lang={book.language}>{book.title}</span>
      <span className="shelf-spine-author">{shortAuthor(book.author)}</span>
      {layout === 'banded' && <i className="shelf-spine-band" />}
    </span>
  )
}

type BookShelfProps = {
  text: LandingText
  hrefFor: (slug: string) => string
}

export function BookShelf({ text, hrefFor }: BookShelfProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 1000, height: 360 })
  // The shelf is drawn three times over so it can drift forever; the active book is kept in the middle copy.
  const [active, setActive] = useState(COUNT)
  const [jumping, setJumping] = useState(false)
  const [paused, setPaused] = useState(false)
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)

  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth, height: element.clientHeight }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (paused || reduceMotion) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => clamp(current + 1))
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, reduceMotion])

  // Once a turn has finished outside the middle copy, the same book in the middle copy takes over, without animation.
  useEffect(() => {
    if (active >= COUNT && active < COUNT * 2) return
    const timer = window.setTimeout(() => {
      setJumping(true)
      setActive((current) => ((current % COUNT) + COUNT) % COUNT + COUNT)
      requestAnimationFrame(() => requestAnimationFrame(() => setJumping(false)))
    }, TURN_MS + 50)
    return () => window.clearTimeout(timer)
  }, [active])

  // The tallest book takes 78% of the shelf, leaving room above it for the lift on hover.
  const unit = size.height * HEADROOM
  const gap = Math.max(10, unit * 0.06)
  const heightAt = (index: number) => SHELF[((index % COUNT) + COUNT) % COUNT].height * unit
  const items = Array.from({ length: COUNT * COPIES }, (_, index) => {
    const entry = SHELF[index % COUNT]
    const height = entry.height * unit
    // A leaning book pivots on its bottom corner and touches its neighbour near the top: the gap on that side
    // is where its edge, tilted by the angle, meets the neighbour's.
    const angle = (Math.abs(entry.lean) * Math.PI) / 180
    const reach = Math.min(height * Math.cos(angle), heightAt(index + Math.sign(entry.lean))) * 0.97
    const leanGap = entry.lean && index !== active ? Math.max(0, reach * Math.tan(angle) - gap) : 0
    return { ...entry, index, height, spineWidth: entry.thickness * unit, coverWidth: height * COVER_RATIO, leanGap }
  })
  const widthOf = (item: (typeof items)[number]) => (item.index === active ? item.coverWidth : item.spineWidth)
  let before = 0
  for (const item of items.slice(0, active)) before += widthOf(item) + gap + item.leanGap
  const offset = size.width / 2 - (before + items[active].coverWidth / 2)
  const current = SHELF[active % COUNT].book

  function choose(index: number, event: MouseEvent) {
    if (drag.current?.moved) {
      event.preventDefault()
      return
    }
    // The first click brings a book to the middle; a click on the open book follows its link.
    if (index !== active) {
      event.preventDefault()
      setActive(index)
    }
  }

  function onPointerDown(event: PointerEvent) {
    drag.current = { x: event.clientX, moved: false }
  }

  function onPointerUp(event: PointerEvent) {
    const start = drag.current
    if (!start) return
    const distance = event.clientX - start.x
    if (Math.abs(distance) > 40) {
      start.moved = true
      setActive((value) => clamp(value + (distance < 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(distance) / 120))))
    }
    window.setTimeout(() => { drag.current = null }, 0)
  }

  return (
    <div className={`shelf${jumping ? ' is-jumping' : ''}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="shelf-viewport" ref={viewport} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null }}>
        <div className="shelf-track" style={{ transform: `translateX(${offset}px)`, gap }}>
          {items.map((item) => {
            const isActive = item.index === active
            const middle = item.index >= COUNT && item.index < COUNT * 2
            const leaning = item.lean !== 0 && !isActive
            const style = {
              width: widthOf(item),
              height: item.height,
              '--spine': `${item.spineWidth}px`,
              '--cover': `${item.coverWidth}px`,
              rotate: leaning ? `${item.lean}deg` : '0deg',
              transformOrigin: item.lean > 0 ? 'right bottom' : 'left bottom',
              marginRight: item.lean > 0 ? item.leanGap : 0,
              marginLeft: item.lean < 0 ? item.leanGap : 0,
            } as CSSProperties
            return (
              <a
                key={item.index}
                className={`shelf-book${isActive ? ' is-open' : ''}`}
                style={style}
                href={hrefFor(item.book.slug)}
                onClick={(event) => choose(item.index, event)}
                // Keyboard focus opens the book; a mouse click focuses too, but is handled by `choose`.
                onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setActive(item.index) }}
                tabIndex={middle ? 0 : -1}
                aria-hidden={middle ? undefined : true}
                aria-label={`${item.book.title} — ${item.book.author}`}
                draggable={false}
              >
                <span className="shelf-book-3d">
                  <Spine book={item.book} palette={item.palette} layout={item.spine} height={item.height} />
                  <Cover book={item.book} palette={item.palette} layout={item.cover} id={String(item.index)} />
                </span>
              </a>
            )
          })}
        </div>
      </div>
      <div className="shelf-caption">
        <button className="shelf-arrow" onClick={() => setActive((value) => clamp(value - 1))} aria-label={text.shelf.previous}><ArrowLeft size={18} /></button>
        <div aria-live="polite">
          <strong lang={current.language}>{current.title}</strong>
          <span>{current.author} · {current.language.toUpperCase()} · {text.shelf.difficulty[current.difficulty]}</span>
          <a href={hrefFor(current.slug)}>{text.shelf.open} →</a>
        </div>
        <button className="shelf-arrow" onClick={() => setActive((value) => clamp(value + 1))} aria-label={text.shelf.next}><ArrowRight size={18} /></button>
      </div>
    </div>
  )
}
