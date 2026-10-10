import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, LoaderCircle, LockKeyhole, Ticket } from 'lucide-react'
import { useMessages, useUiLanguage, type UiLanguage } from './i18n'
import { cancelSubscription, formatPrice, FREE_PAGES, isActive, PRICES, redeemPromo, startCheckout, YEARLY_SAVING, type Plan, type PromoError, type Subscription } from './subscription'

/** The terms and refund rules are published in every interface language (public/legal, `npm run legal`). */
const legalPage = (language: UiLanguage, page: 'terms' | 'refund') => `legal/${language}/${page}.html`

/** The two plans and the button that leads to Square's checkout page. */
function Plans() {
  const t = useMessages()
  const language = useUiLanguage()
  const [plan, setPlan] = useState<Plan>('yearly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function subscribe() {
    setBusy(true)
    setError('')
    try {
      await startCheckout(plan)
    } catch {
      setError(t.paywall.checkoutFailed)
      setBusy(false)
    }
  }

  return (
    <div className="paywall-plans">
      <div className="paywall-plan-list" role="radiogroup">
        {(['monthly', 'yearly'] as const).map((id) => (
          <button key={id} role="radio" aria-checked={plan === id} className={`paywall-plan${plan === id ? ' selected' : ''}`} onClick={() => setPlan(id)}>
            <span className="paywall-plan-check">{plan === id && <Check size={13} />}</span>
            <strong>{t.paywall.plans[id]}</strong>
            <span>{t.paywall.price[id](formatPrice(PRICES[id]))}</span>
            {id === 'yearly' && <em>{t.paywall.yearlyNote(YEARLY_SAVING)}</em>}
          </button>
        ))}
      </div>
      <button className="primary-action paywall-subscribe" onClick={() => void subscribe()} disabled={busy}>
        {busy ? <><LoaderCircle size={16} className="spin" /> {t.paywall.redirecting}</> : <>{t.paywall.subscribe} <ArrowRight size={16} /></>}
      </button>
      {error && <p className="paywall-error" role="alert">{error}</p>}
      <p className="paywall-fine">
        {t.paywall.renews} {t.paywall.agree} <a href={legalPage(language, 'terms')} target="_blank" rel="noreferrer">{t.paywall.offer}</a> {t.paywall.and} <a href={legalPage(language, 'refund')} target="_blank" rel="noreferrer">{t.paywall.refund}</a>.
      </p>
    </div>
  )
}

/** A promo code field, folded behind a link until asked for. */
export function PromoForm({ onApplied, startOpen = false }: { onApplied: () => Promise<Subscription | null>; startOpen?: boolean }) {
  const t = useMessages()
  const [open, setOpen] = useState(startOpen)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function apply(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      await redeemPromo(code)
      const subscription = await onApplied()
      const until = subscription?.periodEnd.toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' }) ?? ''
      setMessage({ ok: true, text: t.paywall.promoDone(until) })
      setCode('')
    } catch (error) {
      const reason = (error instanceof Error ? error.message : 'failed') as PromoError
      setMessage({ ok: false, text: t.paywall.promoErrors[reason] ?? t.paywall.promoErrors.failed })
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <button className="link-button paywall-promo-toggle" onClick={() => setOpen(true)}><Ticket size={15} /> {t.paywall.promoToggle}</button>
  return (
    <form className="paywall-promo" onSubmit={(event) => void apply(event)}>
      <input value={code} onChange={(event) => setCode(event.target.value)} placeholder={t.paywall.promoPlaceholder} aria-label={t.paywall.promoPlaceholder} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
      <button className="secondary-action" type="submit" disabled={busy || !code.trim()}>{busy ? <LoaderCircle size={15} className="spin" /> : t.paywall.promoApply}</button>
      {message && <p className={message.ok ? 'paywall-ok' : 'paywall-error'} role="status">{message.text}</p>}
    </form>
  )
}

type PaywallProps = {
  /** web: plans and promo code; guest: sign in first; app: no purchases inside the iOS app (App Store rules). */
  mode: 'web' | 'guest' | 'app'
  onSignIn: () => void
  onRefresh: () => Promise<Subscription | null>
}

/** Shown in the reader instead of the text after the free pages. */
export function Paywall({ mode, onSignIn, onRefresh }: PaywallProps) {
  const t = useMessages()
  const [checking, setChecking] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function check() {
    setChecking(true)
    setNotFound(false)
    try {
      setNotFound(!isActive(await onRefresh()))
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="paywall">
      <span className="paywall-icon"><LockKeyhole size={20} /></span>
      <span className="eyebrow">{t.paywall.kicker}</span>
      <h2>{mode === 'app' ? t.paywall.appText : t.paywall.title}</h2>
      {mode !== 'app' && <p>{t.paywall.lead(FREE_PAGES)}</p>}
      {mode === 'web' && <><Plans /><PromoForm onApplied={onRefresh} /></>}
      {mode === 'guest' && <><p className="paywall-guest">{t.paywall.guest}</p><button className="primary-action paywall-subscribe" onClick={onSignIn}>{t.paywall.signIn} <ArrowRight size={16} /></button></>}
      {mode === 'app' && <>
        <button className="secondary-action" onClick={() => void check()} disabled={checking}>{checking ? <LoaderCircle size={15} className="spin" /> : null}{t.paywall.appRefresh}</button>
        {notFound && <p className="paywall-error" role="status">{t.paywall.appNone}</p>}
      </>}
    </section>
  )
}

/** The subscription block of the account panel: status, and on the website plans, promo code and cancelling. */
export function SubscriptionPanel({ subscription, isApp, onRefresh }: { subscription: Subscription | null; isApp: boolean; onRefresh: () => Promise<Subscription | null> }) {
  const t = useMessages()
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')
  const active = isActive(subscription)
  const date = subscription?.periodEnd.toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' }) ?? ''

  async function cancel() {
    if (!window.confirm(t.subscription.confirmCancel)) return
    setCanceling(true)
    setError('')
    try {
      await cancelSubscription()
      await onRefresh()
    } catch {
      setError(t.subscription.cancelFailed)
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="subscription-panel">
      <span className="subscription-title">{t.subscription.title}</span>
      <p className={active ? 'subscription-status active' : 'subscription-status'}>
        {active && subscription
          ? subscription.canceled ? t.subscription.canceled(date) : t.subscription.active(date, t.subscription.plans[subscription.plan])
          : t.subscription.none(FREE_PAGES)}
      </p>
      {!isApp && !active && <Plans />}
      {!isApp && <PromoForm onApplied={onRefresh} />}
      {!isApp && active && subscription?.provider !== 'promo' && subscription?.provider !== 'apple' && !subscription?.canceled && (
        <button className="link-button subscription-cancel" onClick={() => void cancel()} disabled={canceling}>{canceling ? t.subscription.canceling : t.subscription.cancel}</button>
      )}
      {error && <p className="paywall-error" role="alert">{error}</p>}
    </div>
  )
}
