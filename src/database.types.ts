export type Database = {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          user_id: string
          plan: 'monthly' | 'yearly' | 'promo'
          provider: 'wayforpay' | 'promo' | 'apple' | 'square' | 'lemonsqueezy' | 'stripe'
          current_period_end: string
          order_reference: string | null
          canceled_at: string | null
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      books: {
        Row: {
          id: string
          owner_id: string
          title: string
          author: string
          format: string
          language: string
          progress: number
          original_path: string
          content_path: string
          collection_id: string | null
          collection_title: string | null
          part: number | null
          part_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          author: string
          format: string
          language?: string
          progress?: number
          original_path: string
          content_path: string
          collection_id?: string | null
          collection_title?: string | null
          part?: number | null
          part_count?: number | null
          created_at?: string
        }
        Update: {
          title?: string
          author?: string
          format?: string
          language?: string
          progress?: number
          original_path?: string
          content_path?: string
        }
        Relationships: []
      }
      saved_words: {
        Row: {
          id: string
          owner_id: string
          word: string
          translation: string
          book_title: string
          language: string
          context: string
          level: number
          due_at: string
          known: boolean
          created_at: string
        }
        Insert: {
          id: string
          owner_id: string
          word: string
          translation: string
          book_title: string
          language?: string
          context?: string
          level?: number
          due_at?: string
          known?: boolean
          created_at?: string
        }
        Update: {
          word?: string
          translation?: string
          book_title?: string
          language?: string
          context?: string
          level?: number
          due_at?: string
          known?: boolean
        }
        Relationships: []
      }
      known_words: {
        Row: {
          owner_id: string
          language: string
          word: string
          created_at: string
        }
        Insert: {
          owner_id: string
          language: string
          word: string
          created_at?: string
        }
        Update: {
          language?: string
          word?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          id: number
          created_at: string
          visitor_id: string
          user_id: string | null
          kind: 'landing' | 'app' | 'catalog' | 'book'
          path: string
          referrer: string | null
          device: 'mobile' | 'desktop' | null
        }
        Insert: {
          visitor_id: string
          user_id?: string | null
          kind: 'landing' | 'app' | 'catalog' | 'book'
          path: string
          referrer?: string | null
          device?: 'mobile' | 'desktop' | null
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      admin_stats: { Args: { days?: number }; Returns: unknown }
      redeem_promo: { Args: { p_code: string }; Returns: string }
      lemonsqueezy_checkout: { Args: { p_plan: 'monthly' | 'yearly' }; Returns: string }
      stripe_checkout: { Args: { p_plan: 'monthly' | 'yearly' }; Returns: string }
      lemonsqueezy_sync: { Args: Record<string, never>; Returns: { plan: 'monthly' | 'yearly' | 'promo'; provider: 'wayforpay' | 'promo' | 'apple' | 'square' | 'lemonsqueezy' | 'stripe'; current_period_end: string; canceled_at: string | null } | null }
      stripe_sync: { Args: Record<string, never>; Returns: { plan: 'monthly' | 'yearly' | 'promo'; provider: 'wayforpay' | 'promo' | 'apple' | 'square' | 'lemonsqueezy' | 'stripe'; current_period_end: string; canceled_at: string | null } | null }
      square_checkout: { Args: { p_plan: 'monthly' | 'yearly' }; Returns: string }
      square_sync: { Args: Record<string, never>; Returns: { plan: 'monthly' | 'yearly' | 'promo'; provider: 'wayforpay' | 'promo' | 'apple' | 'square'; current_period_end: string; canceled_at: string | null } | null }
      wayforpay_checkout: { Args: { p_plan: 'monthly' | 'yearly'; p_language?: string }; Returns: { url: string; orderReference: string; fields: [string, string][] } }
      cancel_subscription: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
