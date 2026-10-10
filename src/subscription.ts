/*
 * Paid reading: the first FREE_PAGES pages of every book are free; reading further needs an active subscription.
 * Subscriptions are paid on Stripe's checkout page or granted by a promo code. The database functions that talk to
 * Stripe are in supabase/migrations/*_stripe.sql; promo codes in *_subscriptions.sql.
 */
import { supabase } from './supabase'

export const FREE_PAGES = 5
export type Plan = 'monthly' | 'yearly'
/** Shown prices; they must match the plans in Stripe (`npm run payments:stripe` prints those). */
export const PRICES: Record<Plan, number> = { monthly: 5, yearly: 39 }
/** A price as shown on the site, e.g. €5 or €3.25. */
export const formatPrice = (amount: number) => `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
/** How much cheaper a year is than twelve months, in percent. */
export const YEARLY_SAVING = Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100)

export type Subscription = {
  plan: 'monthly' | 'yearly' | 'promo'
  provider: 'wayforpay' | 'promo' | 'apple' | 'square' | 'lemonsqueezy' | 'stripe'
  periodEnd: Date
  canceled: boolean
}

export const isActive = (subscription: Subscription | null) => Boolean(subscription && subscription.periodEnd.getTime() > Date.now())

/**
 * The signed-in user's subscription, or null when there is none (or nobody is signed in). The database checks it with
 * Stripe when needed (after a payment, near the end of the paid period), so renewals and cancellations show here.
 */
export async function loadSubscription(): Promise<Subscription | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('stripe_sync')
  if (error) throw error
  if (!data) return null
  return { plan: data.plan, provider: data.provider, periodEnd: new Date(data.current_period_end), canceled: Boolean(data.canceled_at) }
}

export type PromoError = 'invalid_code' | 'code_used_up' | 'already_redeemed' | 'not_signed_in' | 'failed'

/** Applies a promo code; on failure throws an Error whose message is a PromoError. */
export async function redeemPromo(code: string): Promise<void> {
  if (!supabase) throw new Error('failed')
  const { error } = await supabase.rpc('redeem_promo', { p_code: code })
  if (!error) return
  const known: PromoError[] = ['invalid_code', 'code_used_up', 'already_redeemed', 'not_signed_in']
  throw new Error(known.find((reason) => error.message.includes(reason)) ?? 'failed')
}

/** Creates a Stripe checkout for the plan and leaves for it; Stripe returns to /?payment=done. */
export async function startCheckout(plan: Plan): Promise<void> {
  if (!supabase) throw new Error('payments_not_configured')
  const { data, error } = await supabase.rpc('stripe_checkout', { p_plan: plan })
  if (error || !data) throw error ?? new Error('checkout_failed')
  window.location.href = data
}

/** Stops automatic renewals; access stays until the end of the paid period. */
export async function cancelSubscription(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('cancel_subscription')
  if (error) throw error
}
