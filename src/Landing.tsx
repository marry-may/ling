import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Check, Cloud, FileScan, Languages, Layers, Volume2, WifiOff, type LucideIcon } from 'lucide-react'
import { HeroDecor, ShelfIllustration, TapWordIllustration, TrainingIllustration, UploadIllustration } from './LandingIllustrations'
import { detectLandingLanguage, LANDING_TEXT, type LandingLanguage } from './landingText'
import type { Theme } from './theme'
import { ThemeToggle } from './ThemeToggle'
import './Landing.css'

const LANGUAGES: LandingLanguage[] = ['uk', 'ru', 'en']
const MORE_ICONS: LucideIcon[] = [Languages, FileScan, Layers, Cloud, WifiOff, Volume2]
const STEP_ILLUSTRATIONS = [UploadIllustration, TapWordIllustration, TrainingIllustration]
const YEAR = new Date().getFullYear()

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

function Points({ points }: { points: string[] }) {
  return <ul className="landing-points">{points.map((point) => <li key={point}><Check size={16} />{point}</li>)}</ul>
}

/** The public page for visitors who are not signed in: what Ling is, with screenshots, in three languages. */
export function Landing({ theme, onToggleTheme, onSignUp, onSignIn }: LandingProps) {
  const [language, setLanguage] = useState<LandingLanguage>(detectLandingLanguage)
  const text = LANDING_TEXT[language]

  useEffect(() => {
    document.documentElement.lang = language
    return () => { document.documentElement.lang = 'ru' }
  }, [language])

  function chooseLanguage(next: LandingLanguage) {
    setLanguage(next)
    try {
      localStorage.setItem('ling-landing-language', next)
    } catch {
      // The choice still applies on this visit.
    }
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <span className="brand"><span className="brand-mark"><BookOpen size={18} strokeWidth={2.2} /></span><span>ling<span className="brand-period">.</span></span></span>
          <div className="landing-nav-actions">
            <div className="landing-lang" role="group" aria-label="Language">
              {LANGUAGES.map((code) => (
                <button key={code} className={code === language ? 'selected' : ''} aria-pressed={code === language} lang={code} onClick={() => chooseLanguage(code)}>{LANDING_TEXT[code].label}</button>
              ))}
            </div>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} className="landing-theme" />
            <button className="landing-login" onClick={() => onSignIn(language)}>{text.login}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero landing-container">
          <HeroDecor />
          <span className="eyebrow">{text.eyebrow}</span>
          <h1>{text.title}<span className="heading-period">.</span></h1>
          <p className="landing-lead">{text.lead}</p>
          <div className="landing-cta">
            <button className="primary-action" onClick={() => onSignUp(language)}>{text.start} <ArrowRight size={16} /></button>
            <button className="landing-secondary" onClick={() => onSignIn(language)}>{text.haveAccount}</button>
          </div>
          <p className="landing-facts">{text.facts}</p>
          <div className="hero-shots">
            <BrowserFrame theme={theme} language={language} name="reader-translate" alt={text.imageAlt.reader} />
            <PhoneFrame theme={theme} language={language} name="phone-reader" alt={text.imageAlt.readerPhone} />
          </div>
          {text.interfaceNote && <p className="landing-note">{text.interfaceNote}</p>}
        </section>

        <section className="landing-section landing-container">
          <h2>{text.stepsTitle}</h2>
          <ol className="landing-steps">{text.steps.map((step, index) => {
            const Illustration = STEP_ILLUSTRATIONS[index]
            return <li key={step.title}><Illustration /><span className="step-number">{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>
          })}</ol>
        </section>

        <section className="landing-feature landing-container">
          <div className="feature-copy"><span className="eyebrow">01</span><h2>{text.reading.title}</h2><Points points={text.reading.points} /></div>
          <BrowserFrame theme={theme} language={language} name="reader" alt={text.imageAlt.reader} />
        </section>

        <section className="landing-feature reverse landing-container">
          <div className="feature-copy"><span className="eyebrow">02</span><h2>{text.training.title}</h2><Points points={text.training.points} /></div>
          <div className="feature-stack">
            <BrowserFrame theme={theme} language={language} name="training-choice" alt={text.imageAlt.training} height={800} />
            <PhoneFrame theme={theme} language={language} name="phone-training" alt={text.imageAlt.trainingPhone} />
          </div>
        </section>

        <section className="landing-feature landing-container">
          <div className="feature-copy"><span className="eyebrow">03</span><h2>{text.progress.title}</h2><Points points={text.progress.points} /></div>
          <BrowserFrame theme={theme} language={language} name="library" alt={text.imageAlt.library} />
        </section>

        <section className="landing-section landing-container">
          <h2>{text.moreTitle}</h2>
          <div className="landing-grid">{text.more.map((item, index) => {
            const Icon = MORE_ICONS[index]
            return <div className="landing-card" key={item.title}><Icon size={20} /><h3>{item.title}</h3><p>{item.text}</p></div>
          })}</div>
        </section>

        <section className="landing-final landing-container">
          <ShelfIllustration />
          <h2>{text.finalTitle}<span className="heading-period">.</span></h2>
          <p>{text.finalText}</p>
          <button className="primary-action" onClick={() => onSignUp(language)}>{text.start} <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <span>© {YEAR} Ling</span>
        <span>ling.uno</span>
      </footer>
    </div>
  )
}
