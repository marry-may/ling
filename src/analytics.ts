import { supabase } from './supabase'

/** Shared with the Ling Library pages (scripts/build-library.mjs), which count their visits under the same id. */
const VISITOR_KEY = 'ling-visitor'
// Read at startup: the app drops ?book= from the address once it has picked the book up.
const INITIAL_SEARCH = window.location.search

export type PageKind = 'landing' | 'app'

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

/** Where the visitor came from, unless it was another page of this site. */
function externalReferrer(): string | null {
  try {
    const referrer = document.referrer && new URL(document.referrer)
    return referrer && referrer.host !== window.location.host ? referrer.href.slice(0, 300) : null
  } catch {
    return null
  }
}

/** Counts one page load for the admin center. Only the published site counts; failures are ignored. */
export function trackPageView(kind: PageKind, userId: string | null): void {
  if (!supabase || !import.meta.env.PROD) return
  const params = new URLSearchParams(INITIAL_SEARCH)
  const book = params.get('book')
  void supabase.from('page_views').insert({
    visitor_id: visitorId(),
    user_id: userId,
    kind,
    path: `/${book ? `?book=${book}` : ''}`.slice(0, 300),
    referrer: externalReferrer(),
    device: window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop',
  }).then(() => undefined, () => undefined)
}

export type AdminStats = {
  days: number
  users: { total: number; confirmed: number; new_7d: number; new_period: number; active_7d: number }
  content: { books: number; saved_words: number; known_words: number }
  traffic: { views: number; visitors: number; visitors_7d: number; mobile_share: number }
  daily: { day: string; views: number; visitors: number; signups: number }[]
  by_kind: { kind: 'landing' | 'app' | 'catalog' | 'book'; views: number }[]
  top_pages: { path: string; views: number; visitors: number }[]
  referrers: { host: string; views: number }[]
  recent_users: { email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean; books: number; words: number; languages: string[] }[]
}

export async function isAdmin(): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_admin')
  return !error && data === true
}

export async function getAdminStats(days: number): Promise<AdminStats> {
  if (!supabase) throw new Error('Облачный аккаунт не настроен.')
  const { data, error } = await supabase.rpc('admin_stats', { days })
  if (error) throw error
  return data as AdminStats
}
