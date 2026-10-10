// Connects the Stripe account to Ling and stores the settings in the database (private.stripe_settings).
//
//   npm run payments:stripe               find (or create) the plans, save them
//   npm run payments:stripe -- --dry-run  only show what was found
//
// Reads STRIPE_SECRET_KEY from .env.local (an sk_test_ key gives test mode, returning to the local dev server). Looks
// for the prices with lookup keys ling_monthly and ling_yearly and creates a "Ling" product with them when they are
// missing, at the prices from src/subscription.ts. Then writes them with psql (SUPABASE_DB_URL). The key never
// reaches the app.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n')
  .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
  .map(([, key, value]) => [key, value.trim().replace(/^["']|["']$/g, '')]))
const KEY = env.STRIPE_SECRET_KEY
const SITE = (env.VITE_SITE_URL || 'https://ling.uno/').replace(/\/$/, '')
/** Test payments come back to the local dev server, where the new code runs; live ones to the site. */
const LOCAL = 'http://localhost:5173'
if (!KEY || !env.SUPABASE_DB_URL) throw new Error('Set STRIPE_SECRET_KEY and SUPABASE_DB_URL in .env.local')
const testMode = /^(sk|rk)_test_/.test(KEY)
const dryRun = process.argv.includes('--dry-run')

/** The plans as src/subscription.ts shows them, in cents. */
const PLANS = {
  monthly: { lookup: 'ling_monthly', interval: 'month', amount: 500 },
  yearly: { lookup: 'ling_yearly', interval: 'year', amount: 3900 },
}
const CURRENCY = 'eur'

async function api(method, path, form) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form && new URLSearchParams(form),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`${path}: ${data.error?.message ?? JSON.stringify(data)}`)
  return data
}

const account = await api('GET', 'account')
console.log(`Stripe ${testMode ? 'TEST' : 'LIVE'} mode · ${account.settings?.dashboard?.display_name || account.email || account.id}`)

const lookups = Object.values(PLANS).map((plan) => `lookup_keys[]=${plan.lookup}`).join('&')
const found = (await api('GET', `prices?active=true&${lookups}`)).data
let product = null
const prices = {}
for (const [name, plan] of Object.entries(PLANS)) {
  prices[name] = found.find((price) => price.lookup_key === plan.lookup)
  if (prices[name] || dryRun) continue
  product ??= found[0]?.product ?? (await api('POST', 'products', { name: 'Ling' })).id
  prices[name] = await api('POST', 'prices', {
    product, currency: CURRENCY, unit_amount: String(plan.amount), 'recurring[interval]': plan.interval,
    lookup_key: plan.lookup, nickname: `Ling ${name}`,
  })
  console.log(`  created ${name} price`)
}
for (const name of Object.keys(PLANS)) {
  const price = prices[name]
  console.log(`  ${name.padEnd(8)} ${price ? `${price.id}, ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}` : 'missing, will be created'}`)
}
if (dryRun) process.exit(0)

const back = testMode ? LOCAL : SITE
const successUrl = `${back}/?payment=done`
const cancelUrl = `${back}/`
const sql = `insert into private.stripe_settings (id, secret_key, monthly_price_id, yearly_price_id, test_mode, success_url, cancel_url)
values (true, :'key', :'monthly', :'yearly', :'test', :'success', :'cancel')
on conflict (id) do update set secret_key = excluded.secret_key, monthly_price_id = excluded.monthly_price_id,
  yearly_price_id = excluded.yearly_price_id, test_mode = excluded.test_mode, success_url = excluded.success_url,
  cancel_url = excluded.cancel_url, updated_at = now();`
execFileSync('psql', [env.SUPABASE_DB_URL, '-v', 'ON_ERROR_STOP=1', '-X', '-q',
  '-v', `key=${KEY}`, '-v', `monthly=${prices.monthly.id}`, '-v', `yearly=${prices.yearly.id}`,
  '-v', `test=${testMode}`, '-v', `success=${successUrl}`, '-v', `cancel=${cancelUrl}`], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
console.log(`Saved. Buyers return to ${successUrl}`)
