import { useEffect, useRef, type CSSProperties } from 'react'
import { ArrowRight, BookOpen, Check, Cloud, FileScan, Languages, Layers, Volume2, WifiOff, type LucideIcon } from 'lucide-react'
import { HeroDecor, ShelfIllustration, TapWordIllustration, TrainingIllustration, UploadIllustration } from './LandingIllustrations'
import { BookShelf } from './BookShelf'
import { setUiLanguage, useUiLanguage } from './i18n'
import { LANDING_TEXT, type LandingLanguage } from './landingText'
import type { Theme } from './theme'
import { ThemeToggle } from './ThemeToggle'
import './Landing.css'

const LANGUAGES: LandingLanguage[] = ['uk', 'ru', 'en']
const MORE_ICONS: LucideIcon[] = [Languages, FileScan, Layers, Cloud, WifiOff, Volume2]
const STEP_ILLUSTRATIONS = [UploadIllustration, TapWordIllustration, TrainingIllustration]
const YEAR = new Date().getFullYear()

/** Public library pages: /library/ in Russian, /uk/library/ and /en/library/ in the other languages. */
function libraryPath(language: LandingLanguage, slug?: string) {
  return `${language === 'ru' ? '' : `${language}/`}library/${slug ? `${slug}/` : ''}`
}

type LandingProps = {
  theme: Theme
  onToggleTheme: () => void
  /** Both receive the page language, a first guess for the language words are translated into. */
  onSignUp: (language: LandingLanguage) => void
  onSignIn: (language: LandingLanguage) => void
}

type ShotProps = { name: string; alt: string; theme: Theme; language: LandingLanguage }

/**
 * Screenshots exist per page language (public/landing/<language>/) and theme (*-dark.webp): the Ukrainian page
 * shows translations into Ukrainian, the English one a Spanish book translated into English.
 */
function shotSource(name: string, theme: Theme, language: LandingLanguage) {
  return `landing/${language}/${name}${theme === 'dark' ? '-dark' : ''}.webp`
}

function BrowserFrame({ name, alt, theme, language, height = 1000 }: ShotProps & { height?: number }) {
  return (
    <figure className="browser-frame">
      <div className="browser-bar" aria-hidden="true"><i /><i /><i /><span>ling.uno</span></div>
      <img src={shotSource(name, theme, language)} alt={alt} loading="lazy" width={1600} height={height} />
    </figure>
  )
}

function PhoneFrame({ name, alt, theme, language }: ShotProps) {
  return (
    <figure className="phone-frame">
      <img src={shotSource(name, theme, language)} alt={alt} loading="lazy" width={780} height={1688} />
    </figure>
  )
}

/** A heading with the words between *asterisks* set in italic. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/\*([^*]+)\*/).map((part, index) => (index % 2 ? <em key={index}>{part}</em> : part))}</>
}

/** Marks a block that fades in when it scrolls into view; `order` staggers the blocks of one section. */
function reveal(order = 0) {
  return { 'data-reveal': '', style: { '--reveal-order': order } as CSSProperties }
}

/** Shows the marked blocks as they come into view (all at once when the visitor prefers less motion). */
function useReveal() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const blocks = root.current?.querySelectorAll('[data-reveal]') ?? []
    const show = (block: Element) => block.classList.add('is-revealed')
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      blocks.forEach(show)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        show(entry.target)
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 })
    blocks.forEach((block) => observer.observe(block))
    return () => observer.disconnect()
  }, [])
  return root
}

function Points({ points }: { points: string[] }) {
  return <ul className="landing-points">{points.map((point) => <li key={point}><Check size={16} />{point}</li>)}</ul>
}

/** The public page for visitors who are not signed in: what Ling is, with screenshots, in three languages. */
export function Landing({ theme, onToggleTheme, onSignUp, onSignIn }: LandingProps) {
  const language = useUiLanguage()
  const text = LANDING_TEXT[language]
  const root = useReveal()

  const chooseLanguage = (next: LandingLanguage) => setUiLanguage(next)

  return (
    <div className="landing" ref={root}>
      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <span className="brand"><span className="brand-mark"><BookOpen size={18} strokeWidth={2.2} /></span><span>ling<span className="brand-period">.</span></span></span>
          <div className="landing-nav-actions">
            <div className="landing-lang" role="group" aria-label="Language">
              {LANGUAGES.map((code) => (
                <button key={code} className={code === language ? 'selected' : ''} aria-pressed={code === language} lang={code} onClick={() => chooseLanguage(code)}>{LANDING_TEXT[code].label}</button>
              ))}
            </div>
            <a className="landing-library-link" href={libraryPath(language)}>{text.libraryNav}</a>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} className="landing-theme" />
            <button className="landing-login" onClick={() => onSignIn(language)}>{text.login}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero landing-container">
          <HeroDecor greeting={text.greeting} />
          <span className="eyebrow" {...reveal(0)}>{text.eyebrow}</span>
          <h1 {...reveal(1)}><Rich text={text.title} /><span className="heading-period">.</span></h1>
          <p className="landing-lead" {...reveal(2)}>{text.lead}</p>
          <div className="landing-cta" {...reveal(3)}>
            <button className="primary-action" onClick={() => onSignUp(language)}>{text.start} <ArrowRight size={16} /></button>
            <button className="landing-secondary" onClick={() => onSignIn(language)}>{text.haveAccount}</button>
          </div>
          <p className="landing-facts" {...reveal(4)}>{text.facts}</p>
          <div className="hero-shots" {...reveal(5)}>
            <BrowserFrame theme={theme} language={language} name="reader-translate" alt={text.imageAlt.reader} />
            <PhoneFrame theme={theme} language={language} name="phone-reader" alt={text.imageAlt.readerPhone} />
          </div>
        </section>

        <section className="landing-section landing-container">
          <h2 {...reveal()}><Rich text={text.stepsTitle} /></h2>
          <ol className="landing-steps">{text.steps.map((step, index) => {
            const Illustration = STEP_ILLUSTRATIONS[index]
            return <li key={step.title} {...reveal(index + 1)}><Illustration /><span className="step-number">{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>
          })}</ol>
        </section>

        <section className="landing-feature landing-container">
          <div className="feature-copy" {...reveal()}><span className="eyebrow">01</span><h2><Rich text={text.reading.title} /></h2><Points points={text.reading.points} /></div>
          <div {...reveal(1)}><BrowserFrame theme={theme} language={language} name="reader" alt={text.imageAlt.reader} /></div>
        </section>

        <section className="landing-feature reverse landing-container">
          <div className="feature-copy" {...reveal()}><span className="eyebrow">02</span><h2><Rich text={text.training.title} /></h2><Points points={text.training.points} /></div>
          <div className="feature-stack" {...reveal(1)}>
            <BrowserFrame theme={theme} language={language} name="training-choice" alt={text.imageAlt.training} height={800} />
            <PhoneFrame theme={theme} language={language} name="phone-training" alt={text.imageAlt.trainingPhone} />
          </div>
        </section>

        <section className="landing-feature landing-container">
          <div className="feature-copy" {...reveal()}><span className="eyebrow">03</span><h2><Rich text={text.progress.title} /></h2><Points points={text.progress.points} /></div>
          <div {...reveal(1)}><BrowserFrame theme={theme} language={language} name="library" alt={text.imageAlt.library} /></div>
        </section>

        <section className="landing-section landing-container landing-library">
          <h2 {...reveal()}><Rich text={text.libraryTitle} /></h2>
          <p className="landing-section-lead" {...reveal(1)}>{text.libraryText}</p>
          <div className="landing-shelf" {...reveal(2)}><BookShelf text={text} hrefFor={(slug) => libraryPath(language, slug)} /></div>
          <a className="landing-secondary" href={libraryPath(language)} {...reveal(3)}>{text.libraryAll} →</a>
        </section>

        <section className="landing-section landing-container">
          <h2 {...reveal()}><Rich text={text.moreTitle} /></h2>
          <div className="landing-grid">{text.more.map((item, index) => {
            const Icon = MORE_ICONS[index]
            return <div className="landing-card" key={item.title} {...reveal(index + 1)}><Icon size={20} /><h3>{item.title}</h3><p>{item.text}</p></div>
          })}</div>
        </section>

        <section className="landing-final landing-container">
          <div {...reveal()}><ShelfIllustration /></div>
          <h2 {...reveal(1)}><Rich text={text.finalTitle} /><span className="heading-period">.</span></h2>
          <p {...reveal(2)}>{text.finalText}</p>
          <button className="primary-action" onClick={() => onSignUp(language)} {...reveal(3)}>{text.start} <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <span>© {YEAR} Ling</span>
        <span>ling.uno</span>
      </footer>
    </div>
  )
}
