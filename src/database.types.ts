export type Database = {
  public: {
    Tables: {
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
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
