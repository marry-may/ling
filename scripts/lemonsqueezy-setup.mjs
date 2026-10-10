// Connects the Lemon Squeezy store to Ling and stores the settings in the database (private.lemonsqueezy_settings).
//
//   npm run payments:lemonsqueezy             find the store and plans, save them
//   npm run payments:lemonsqueezy -- --dry-run   only show what was found
//
// Reads LEMONSQUEEZY_API_KEY from .env.local (a test-mode key gives test mode, returning to the local dev server). Finds the "Ling" store (or the only one)
// and its monthly and yearly subscription variants, then writes them with psql (SUPABASE_DB_URL). The key never reaches
// the app. Prices themselves are set in Lemon Squeezy; src/subscription.ts shows the same ones.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n')
  .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
  .map(([, key, value]) => [key, value.trim().replace(/^["']|["']$/g, '')]))
const KEY = env.LEMONSQUEEZY_API_KEY
const SITE = (env.VITE_SITE_URL || 'https://ling.uno/').replace(/\/$/, '')
/** Test payments come back to the local dev server, where the new code runs; live ones to the site. */
const LOCAL = 'http://localhost:5173'
if (!KEY || !env.SUPABASE_DB_URL) throw new Error('Set LEMONSQUEEZY_API_KEY and SUPABASE_DB_URL in .env.local')

async function api(path) {
  const response = await fetch(`https://api.lemonsqueezy.com/v1/${path}`, { headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/vnd.api+json' } })
  const data = await response.json()
  if (!response.ok) throw new Error(`${path}: ${JSON.stringify(data.errors ?? data)}`)
  return data
}

const me = await api('users/me')
const testMode = Boolean(me.meta?.test_mode)
const stores = (await api('stores')).data
const store = stores.find((item) => item.attributes.name === 'Ling') ?? (stores.length === 1 ? stores[0] : null)
if (!store) throw new Error(`Name the store "Ling" or keep one store; found: ${stores.map((item) => item.attributes.name).join(', ')}`)

// Variants can only be listed per product.
const products = (await api(`products?filter[store_id]=${store.id}&page[size]=100`)).data
const variants = (await Promise.all(products.map((product) => api(`variants?filter[product_id]=${product.id}&page[size]=100`))))
  .flatMap((list) => list.data)
  .filter((variant) => variant.attributes.is_subscription && variant.attributes.interval_count === 1)
const pick = (interval) => {
  const found = variants.filter((variant) => variant.attributes.interval === interval)
  if (!found.length) throw new Error(`No subscription variant billed every ${interval} in store ${store.attributes.name}`)
  return found[0]
}
const monthly = pick('month')
const yearly = pick('year')
const returnTo = `${testMode ? LOCAL : SITE}/?payment=done`
const money = (variant) => `${(variant.attributes.price / 100).toFixed(2)} ${store.attributes.currency}`
console.log(`Lemon Squeezy ${testMode ? 'TEST' : 'LIVE'} mode · store ${store.attributes.name} (${store.attributes.currency})`)
console.log(`  monthly: variant ${monthly.id}, ${money(monthly)}`)
console.log(`  yearly:  variant ${yearly.id}, ${money(yearly)}`)
if (process.argv.includes('--dry-run')) process.exit(0)

const sql = `insert into private.lemonsqueezy_settings (id, api_key, store_id, monthly_variant_id, yearly_variant_id, test_mode, redirect_url)
values (true, :'key', :'store', :'monthly', :'yearly', :'test', :'redirect')
on conflict (id) do update set api_key = excluded.api_key, store_id = excluded.store_id, monthly_variant_id = excluded.monthly_variant_id,
  yearly_variant_id = excluded.yearly_variant_id, test_mode = excluded.test_mode, redirect_url = excluded.redirect_url, updated_at = now();`
execFileSync('psql', [env.SUPABASE_DB_URL, '-v', 'ON_ERROR_STOP=1', '-X', '-q',
  '-v', `key=${KEY}`, '-v', `store=${store.id}`, '-v', `monthly=${monthly.id}`, '-v', `yearly=${yearly.id}`,
  '-v', `test=${testMode}`, '-v', `redirect=${returnTo}`], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
console.log(`Saved. Buyers return to ${returnTo}`)
