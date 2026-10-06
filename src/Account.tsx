import type { FormEvent } from 'react'
import { ArrowLeft, BookOpen, LoaderCircle, UserRound } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useMessages } from './i18n'
import type { AuthText } from './landingText'
import { TranslationLanguageSelect } from './TranslationLanguageSelect'

export type AuthMode = 'signin' | 'signup'

export type AuthFormProps = {
  mode: AuthMode
  email: string
  password: string
  busy: boolean
  message: string
  onModeChange: (mode: AuthMode) => void
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** Asked when creating an account: the language words are translated into. */
  translationLanguage: string
  onTranslationLanguageChange: (code: string) => void
  /** Wording of the form, in the interface language. */
  text: AuthText
}

export function AuthForm({ mode, email, password, busy, message, onModeChange, onEmailChange, onPasswordChange, onSubmit, translationLanguage, onTranslationLanguageChange, text, showModeToggle = true }: AuthFormProps & { showModeToggle?: boolean }) {
  return (
    <>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>{text.email}<input type="email" autoComplete="email" required value={email} onChange={(event) => onEmailChange(event.target.value)} /></label>
        <label>{text.password}<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder={mode === 'signup' ? text.passwordHint : undefined} /></label>
        {mode === 'signup' && <TranslationLanguageSelect value={translationLanguage} onChange={onTranslationLanguageChange} label={text.translateTo} hint={text.translationHint} />}
        <button className="primary-action auth-submit" type="submit" disabled={busy}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <UserRound size={16} />}
          {busy ? text.busy : mode === 'signin' ? text.signIn : text.signUp}
        </button>
        {showModeToggle && (
          <button className="auth-mode-toggle" type="button" onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? text.toSignUp : text.toSignIn}
          </button>
        )}
      </form>
      {message && <p className="auth-message" role="status">{message}</p>}
    </>
  )
}

/** The first screen for visitors who are not signed in. */
export function WelcomeScreen({ form, onSkip, onBack, note, lang }: { form: AuthFormProps; onSkip: () => void; onBack: () => void; note?: string; lang: string }) {
  const { text } = form
  return (
    <section className="welcome" lang={lang}>
      <button className="quiet-button welcome-back" onClick={onBack}><ArrowLeft size={16} /> {text.back}</button>
      <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
      <span className="eyebrow">{text.eyebrow}</span>
      <h1>{text.title}<span className="heading-period">.</span></h1>
      <p>{note ?? text.lead}</p>
      <div className="welcome-card">
        <div className="segmented welcome-tabs" role="tablist" aria-label={text.tabs}>
          <button role="tab" aria-selected={form.mode === 'signin'} className={form.mode === 'signin' ? 'selected' : ''} onClick={() => form.onModeChange('signin')}>{text.signIn}</button>
          <button role="tab" aria-selected={form.mode === 'signup'} className={form.mode === 'signup' ? 'selected' : ''} onClick={() => form.onModeChange('signup')}>{text.signUp}</button>
        </div>
        <AuthForm {...form} showModeToggle={false} />
      </div>
      <button className="quiet-button welcome-skip" onClick={onSkip}>{text.skip}</button>
    </section>
  )
}

/** The account entry in the top-right corner: the initial when signed in, a sign-in prompt otherwise. */
export function AccountButton({ user, onClick }: { user: User | null; onClick: () => void }) {
  const t = useMessages()
  return (
    <button className={user ? 'account-corner signed-in' : 'account-corner'} onClick={onClick} aria-label={user ? t.account.cornerUser(user.email ?? '') : t.account.cornerSignIn}>
      <span className="account-corner-avatar">{user?.email ? user.email[0].toUpperCase() : <UserRound size={16} />}</span>
      <span className="account-corner-label">{user ? user.email : t.account.signIn}</span>
    </button>
  )
}
