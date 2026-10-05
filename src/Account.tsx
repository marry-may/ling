import type { FormEvent } from 'react'
import { ArrowLeft, BookOpen, LoaderCircle, UserRound } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
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
}

export function AuthForm({ mode, email, password, busy, message, onModeChange, onEmailChange, onPasswordChange, onSubmit, translationLanguage, onTranslationLanguageChange, showModeToggle = true }: AuthFormProps & { showModeToggle?: boolean }) {
  return (
    <>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>Электронная почта<input type="email" autoComplete="email" required value={email} onChange={(event) => onEmailChange(event.target.value)} /></label>
        <label>Пароль<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder={mode === 'signup' ? 'Не короче 8 символов' : undefined} /></label>
        {mode === 'signup' && <TranslationLanguageSelect value={translationLanguage} onChange={onTranslationLanguageChange} hint="Твой родной язык. Его можно поменять в любой момент в аккаунте." />}
        <button className="primary-action auth-submit" type="submit" disabled={busy}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <UserRound size={16} />}
          {busy ? 'Подключаем...' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
        </button>
        {showModeToggle && (
          <button className="auth-mode-toggle" type="button" onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Первый раз в Ling? Создать аккаунт' : 'Уже есть аккаунт? Войти'}
          </button>
        )}
      </form>
      {message && <p className="auth-message" role="status">{message}</p>}
    </>
  )
}

/** The first screen for visitors who are not signed in. */
export function WelcomeScreen({ form, onSkip, onBack, note }: { form: AuthFormProps; onSkip: () => void; onBack: () => void; note?: string }) {
  return (
    <section className="welcome">
      <button className="quiet-button welcome-back" onClick={onBack}><ArrowLeft size={16} /> О приложении</button>
      <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
      <span className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В LING</span>
      <h1>Читай книги и учи слова<span className="heading-period">.</span></h1>
      <p>{note ?? 'Войди или создай аккаунт: книги, слова и прогресс будут с тобой на всех устройствах.'}</p>
      <div className="welcome-card">
        <div className="segmented welcome-tabs" role="tablist" aria-label="Вход или регистрация">
          <button role="tab" aria-selected={form.mode === 'signin'} className={form.mode === 'signin' ? 'selected' : ''} onClick={() => form.onModeChange('signin')}>Вход</button>
          <button role="tab" aria-selected={form.mode === 'signup'} className={form.mode === 'signup' ? 'selected' : ''} onClick={() => form.onModeChange('signup')}>Регистрация</button>
        </div>
        <AuthForm {...form} showModeToggle={false} />
      </div>
      <button className="quiet-button welcome-skip" onClick={onSkip}>Попробовать без аккаунта</button>
    </section>
  )
}

/** The account entry in the top-right corner: the initial when signed in, a sign-in prompt otherwise. */
export function AccountButton({ user, onClick }: { user: User | null; onClick: () => void }) {
  return (
    <button className={user ? 'account-corner signed-in' : 'account-corner'} onClick={onClick} aria-label={user ? `Аккаунт ${user.email}` : 'Войти в аккаунт'}>
      <span className="account-corner-avatar">{user?.email ? user.email[0].toUpperCase() : <UserRound size={16} />}</span>
      <span className="account-corner-label">{user ? user.email : 'Войти'}</span>
    </button>
  )
}
