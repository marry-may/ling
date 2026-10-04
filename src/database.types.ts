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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
