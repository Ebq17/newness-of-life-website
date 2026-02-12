export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface RecurrenceRule {
  frequency: 'weekly' | 'monthly' | 'yearly'
  day_of_week?: number // 0-6 for weekly
  day_of_month?: number // 1-31 for monthly
  time: string // HH:MM format
  end_date?: string // ISO date string
}

export interface Database {
  public: {
    Tables: {
      event_categories: {
        Row: {
          id: string
          slug: string
          name: string
          color: string
          icon: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          color?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          color?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          start_date: string
          end_date: string | null
          all_day: boolean
          location: string | null
          category_id: string | null
          main_image_url: string | null
          flyer_pdf_url: string | null
          is_recurring: boolean
          recurrence_rule: RecurrenceRule | null
          is_featured: boolean
          is_published: boolean
          external_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          start_date: string
          end_date?: string | null
          all_day?: boolean
          location?: string | null
          category_id?: string | null
          main_image_url?: string | null
          flyer_pdf_url?: string | null
          is_recurring?: boolean
          recurrence_rule?: RecurrenceRule | null
          is_featured?: boolean
          is_published?: boolean
          external_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          all_day?: boolean
          location?: string | null
          category_id?: string | null
          main_image_url?: string | null
          flyer_pdf_url?: string | null
          is_recurring?: boolean
          recurrence_rule?: RecurrenceRule | null
          is_featured?: boolean
          is_published?: boolean
          external_link?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_images: {
        Row: {
          id: string
          event_id: string
          image_url: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          image_url: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          image_url?: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type EventCategory = Database['public']['Tables']['event_categories']['Row']
export type EventCategoryInsert = Database['public']['Tables']['event_categories']['Insert']
export type EventCategoryUpdate = Database['public']['Tables']['event_categories']['Update']

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type EventImage = Database['public']['Tables']['event_images']['Row']
export type EventImageInsert = Database['public']['Tables']['event_images']['Insert']
export type EventImageUpdate = Database['public']['Tables']['event_images']['Update']

// Extended types with relations
export type EventWithCategory = Event & {
  event_categories: EventCategory | null
}

export type EventWithImages = Event & {
  event_images: EventImage[]
}

export type EventFull = Event & {
  event_categories: EventCategory | null
  event_images: EventImage[]
}
