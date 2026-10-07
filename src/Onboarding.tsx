import { useRef, useState } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import { LessonArt } from './grammar/art'
import { setUiLanguage, useMessages, useUiLanguage } from './i18n'
import { ShelfIllustration } from './LandingIllustrations'
import { LANDING_TEXT } from './landingText'
import type { Theme } from './theme'
import { ThemeToggle } from './ThemeToggle'
import './Landing.css'
import './Onboarding.css'

type OnboardingProps = {
  theme: Theme
  onToggleTheme: () => void
  onSignUp: () => void
  onSignIn: () => void
}

/** A real screenshot of the app in a phone frame, in the interface language and theme. */
function Shot({ name, alt, theme }: { name: string; alt: string; theme: Theme }) {
  const language = useUiLanguage()
  return (
    <figure className="phone-frame intro-phone">
      <img src={`landing/${language}/${name}${theme === 'dark' ? '-dark' : ''}.webp`} alt={alt} width={780} height={1688} />
    </figure>
  )
}

/** The library shelf above a grammar lesson card: what the app offers besides reading. */
function LibraryAndGrammar({ level, title }: { level: string; title: string }) {
  return (
    <div className="intro-collage" aria-hidden="true">
      <ShelfIllustration />
      <div className="intro-lesson">
        <LessonArt id="en-present-perfect" />
        <span>{level}</span>
        <strong>{title}</strong>
      </div>
    </div>
  )
}

/**
 * The first screen of the mobile app: three swipeable slides about what Ling does, then sign-in or sign-up.
 * The website shows the landing page instead (src/Landing.tsx).
 */
export function Onboarding({ theme, onToggleTheme, onSignUp, onSignIn }: OnboardingProps) {
  const t = useMessages()
  const language = useUiLanguage()
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const slides = t.intro.slides
  const last = index === slides.length - 1

  function goTo(next: number) {
    const element = track.current
    if (!element) return
    element.scrollTo({ left: next * element.clientWidth, behavior: 'smooth' })
  }

  function onScroll() {
    const element = track.current
    if (element) setIndex(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)))
  }

  return (
    <section className="intro landing" aria-label={t.intro.label}>
      <header className="intro-top">
        <span className="brand"><span className="brand-mark"><BookOpen size={18} strokeWidth={2.2} /></span><span>ling<span className="brand-period">.</span></span></span>
        <div className="intro-top-actions">
          {/* Same order as on the landing page. */}
          <div className="landing-lang" role="group" aria-label="Language">
            {(['uk', 'ru', 'en'] as const).map((code) => (
              <button key={code} className={code === language ? 'selected' : ''} aria-pressed={code === language} lang={code} onClick={() => setUiLanguage(code)}>{LANDING_TEXT[code].label}</button>
            ))}
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} className="landing-theme" />
        </div>
      </header>

      <div className="intro-track" ref={track} onScroll={onScroll}>
        {slides.map((slide, slideIndex) => (
          <article className="intro-slide" key={slideIndex} aria-hidden={slideIndex !== index}>
            <div className="intro-visual">
              {slideIndex === 0 && <Shot name="phone-reader" alt={slide.alt} theme={theme} />}
              {slideIndex === 1 && <Shot name="phone-training" alt={slide.alt} theme={theme} />}
              {slideIndex === 2 && <LibraryAndGrammar level={t.intro.lessonLevel} title={t.intro.lessonTitle} />}
            </div>
            <div className="intro-copy">
              <span className="eyebrow">{t.intro.step(slideIndex + 1, slides.length)}</span>
              <h1>{slide.title}<span className="heading-period">.</span></h1>
              <p>{slide.text}</p>
            </div>
          </article>
        ))}
      </div>

      <footer className="intro-bottom">
        <div className="intro-dots" role="tablist" aria-label={t.intro.label}>
          {slides.map((slide, slideIndex) => (
            <button key={slideIndex} role="tab" aria-selected={slideIndex === index} aria-label={slide.title} className={slideIndex === index ? 'active' : ''} onClick={() => goTo(slideIndex)} />
          ))}
        </div>
        {last ? (
          <>
            <button className="primary-action intro-main" onClick={onSignUp}>{t.intro.start} <ArrowRight size={17} /></button>
            <button className="quiet-button intro-secondary" onClick={onSignIn}>{t.intro.haveAccount}</button>
          </>
        ) : (
          <>
            <button className="primary-action intro-main" onClick={() => goTo(index + 1)}>{t.intro.next} <ArrowRight size={17} /></button>
            <button className="quiet-button intro-secondary" onClick={onSignIn}>{t.intro.skip}</button>
          </>
        )}
      </footer>
    </section>
  )
}
