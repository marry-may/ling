// Sets up Square subscriptions for Ling and stores the settings in the database (private.square_settings).
//
//   npm run payments:square
//
// Reads SQUARE_ENVIRONMENT (sandbox | production), SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID from .env.local, finds or
// creates the "Ling" subscription plan with a monthly and a yearly variation in the location's currency, then writes
// the token and the plan IDs into the database with psql (SUPABASE_DB_URL). The token never reaches the app.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n')
  .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
  .map(([, key, value]) => [key, value.trim().replace(/^["']|["']$/g, '')]))

const ENVIRONMENT = env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
const TOKEN = env.SQUARE_ACCESS_TOKEN
const LOCATION = env.SQUARE_LOCATION_ID
const SITE = (env.VITE_SITE_URL || 'https://ling.uno/').replace(/\/$/, '')
if (!TOKEN || !LOCATION || !env.SUPABASE_DB_URL) throw new Error('Set SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID and SUPABASE_DB_URL in .env.local')

const API = ENVIRONMENT === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'
export const SQUARE_VERSION = '2025-10-16'
/** Prices in the smallest unit of the location's currency: 5 and 40. */
const PRICES = { monthly: 500, yearly: 4000 }
const CADENCE = { monthly: 'MONTHLY', yearly: 'ANNUAL' }

async function square(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Square-Version': SQUARE_VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(data.errors ?? data)}`)
  return data
}

const { location } = await square('GET', `/v2/locations/${LOCATION}`)
const currency = location.currency
console.log(`Square ${ENVIRONMENT}: location ${location.name} (${location.country}, ${currency})`)

// Reuse the plan from an earlier run when it exists.
const search = await square('POST', '/v2/catalog/search', { object_types: ['SUBSCRIPTION_PLAN'], include_related_objects: true })
let plan = (search.objects ?? []).find((object) => object.subscription_plan_data?.name === 'Ling' && !object.is_deleted)
const variationsOf = (planObject) => (search.related_objects ?? []).concat(planObject?.subscription_plan_data?.subscription_plan_variations ?? [])
  .filter((object) => object.type === 'SUBSCRIPTION_PLAN_VARIATION' && object.subscription_plan_variation_data?.subscription_plan_id === planObject?.id)

if (!plan) {
  const created = await square('POST', '/v2/catalog/object', {
    idempotency_key: crypto.randomUUID(),
    object: { type: 'SUBSCRIPTION_PLAN', id: '#ling-plan', subscription_plan_data: { name: 'Ling', all_items: false } },
  })
  plan = created.catalog_object
  console.log('Created plan', plan.id)
}

const ids = {}
for (const period of ['monthly', 'yearly']) {
  const existing = variationsOf(plan).find((object) => object.subscription_plan_variation_data?.name === `Ling ${period}`)
  if (existing) {
    ids[period] = existing.id
    continue
  }
  const created = await square('POST', '/v2/catalog/object', {
    idempotency_key: crypto.randomUUID(),
    object: {
      type: 'SUBSCRIPTION_PLAN_VARIATION',
      id: `#ling-${period}`,
      subscription_plan_variation_data: {
        name: `Ling ${period}`,
        subscription_plan_id: plan.id,
        phases: [{ cadence: CADENCE[period], ordinal: 0, pricing: { type: 'STATIC', price_money: { amount: PRICES[period], currency } } }],
      },
    },
  })
  ids[period] = created.catalog_object.id
  console.log(`Created ${period} variation`, ids[period])
}
console.log('Plan variations:', ids)

if (process.argv.includes('--dry-run')) process.exit(0)
const sql = `insert into private.square_settings (id, environment, access_token, location_id, currency, monthly_variation_id, yearly_variation_id, monthly_amount, yearly_amount, redirect_url)
values (true, :'environment', :'token', :'location', :'currency', :'monthly', :'yearly', ${PRICES.monthly}, ${PRICES.yearly}, :'redirect')
on conflict (id) do update set environment = excluded.environment, access_token = excluded.access_token, location_id = excluded.location_id,
  currency = excluded.currency, monthly_variation_id = excluded.monthly_variation_id, yearly_variation_id = excluded.yearly_variation_id,
  monthly_amount = excluded.monthly_amount, yearly_amount = excluded.yearly_amount, redirect_url = excluded.redirect_url, updated_at = now();`
execFileSync('psql', [env.SUPABASE_DB_URL, '-v', 'ON_ERROR_STOP=1', '-X', '-q',
  '-v', `environment=${ENVIRONMENT}`, '-v', `token=${TOKEN}`, '-v', `location=${LOCATION}`, '-v', `currency=${currency}`,
  '-v', `monthly=${ids.monthly}`, '-v', `yearly=${ids.yearly}`, '-v', `redirect=${SITE}/?payment=done`], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
console.log(`Square ${ENVIRONMENT} configured; buyers return to ${SITE}/?payment=done`)
