interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** The published site; links in auth emails lead here. */
  readonly VITE_SITE_URL?: string
}
