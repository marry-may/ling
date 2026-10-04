import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const cloudEnabled = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = cloudEnabled
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Where links in auth emails lead. The published site is used even when signing up from a dev server or the
 * iOS app, whose own addresses cannot open the link. Supabase must list it under Auth → URL Configuration.
 */
export const siteUrl = import.meta.env.VITE_SITE_URL?.trim() || `${window.location.origin}${window.location.pathname}`
