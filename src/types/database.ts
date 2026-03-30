export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          sns_links: Json | null
          is_teacher: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          sns_links?: Json | null
          is_teacher?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          sns_links?: Json | null
          is_teacher?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      events: {
        Row: {
          id: string
          creator_id: string | null
          title: string
          description: string | null
          datetime: string
          location: string | null
          capacity: number | null
          price: number
          image_url: string | null
          is_published: boolean
          slug: string
          category: string | null
          teacher_name: string | null
          teacher_bio: string | null
          line_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id?: string | null
          title: string
          description?: string | null
          datetime: string
          location?: string | null
          capacity?: number | null
          price?: number
          image_url?: string | null
          is_published?: boolean
          slug: string
          category?: string | null
          teacher_name?: string | null
          teacher_bio?: string | null
          line_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string | null
          title?: string
          description?: string | null
          datetime?: string
          location?: string | null
          capacity?: number | null
          price?: number
          image_url?: string | null
          is_published?: boolean
          slug?: string
          category?: string | null
          teacher_name?: string | null
          teacher_bio?: string | null
          line_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          guest_name: string
          guest_email: string
          guest_phone: string | null
          status: 'confirmed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          guest_name: string
          guest_email: string
          guest_phone?: string | null
          status?: 'confirmed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          guest_name?: string
          guest_email?: string
          guest_phone?: string | null
          status?: 'confirmed' | 'cancelled'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          event_id: string
          reviewer_name: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          reviewer_name: string
          rating: number
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          reviewer_name?: string
          rating?: number
          comment?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      line_accounts: {
        Row: {
          id: string
          user_id: string
          channel_name: string
          channel_access_token: string
          is_active: boolean
          notify_on_booking: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          channel_name?: string
          channel_access_token: string
          is_active?: boolean
          notify_on_booking?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          channel_name?: string
          channel_access_token?: string
          is_active?: boolean
          notify_on_booking?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      event_messages: {
        Row: {
          id: string
          event_id: string
          sender_id: string
          subject: string
          body: string
          recipient_count: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          sender_id: string
          subject: string
          body: string
          recipient_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          sender_id?: string
          subject?: string
          body?: string
          recipient_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_messages_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_email: string
          type: string
          subject: string
          body: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_email: string
          type: string
          subject: string
          body: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_email?: string
          type?: string
          subject?: string
          body?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_booking_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      book_event: {
        Args: {
          p_event_id: string
          p_user_id: string | null
          p_guest_name: string
          p_guest_email: string
          p_guest_phone: string | null
        }
        Returns: {
          id: string
          event_id: string
          user_id: string | null
          guest_name: string
          guest_email: string
          guest_phone: string | null
          status: string
          created_at: string
        }
      }
    }
    Enums: {
      booking_status: 'confirmed' | 'cancelled'
    }
    CompositeTypes: Record<string, never>
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type EventMessage = Database['public']['Tables']['event_messages']['Row']
export type EventMessageInsert = Database['public']['Tables']['event_messages']['Insert']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type LineAccount = Database['public']['Tables']['line_accounts']['Row']
export type LineAccountInsert = Database['public']['Tables']['line_accounts']['Insert']
export type LineAccountUpdate = Database['public']['Tables']['line_accounts']['Update']

export type BookingStatus = 'confirmed' | 'cancelled'

export type SnsLinks = {
  twitter?: string
  instagram?: string
  facebook?: string
  website?: string
  [key: string]: string | undefined
}

/** Event row augmented with a live booking count */
export type EventWithBookingCount = Event & { booking_count: number }
