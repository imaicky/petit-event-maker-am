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
          line_user_id: string | null
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
          line_user_id?: string | null
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
          line_user_id?: string | null
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
          price_note: string | null
          is_limited: boolean
          limited_passcode: string | null
          line_notified_at: string | null
          line_scheduled_at: string | null
          short_code: string | null
          line_schedule_message: string | null
          location_type: string | null
          online_url: string | null
          zoom_meeting_id: string | null
          zoom_passcode: string | null
          location_url: string | null
          reminder_24h_sent: boolean
          reminder_2h_sent: boolean
          payment_method: string | null
          payment_link: string | null
          payment_info: string | null
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
          price_note?: string | null
          is_limited?: boolean
          limited_passcode?: string | null
          line_notified_at?: string | null
          line_scheduled_at?: string | null
          short_code?: string | null
          line_schedule_message?: string | null
          location_type?: string | null
          online_url?: string | null
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          location_url?: string | null
          reminder_24h_sent?: boolean
          reminder_2h_sent?: boolean
          payment_method?: string | null
          payment_link?: string | null
          payment_info?: string | null
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
          price_note?: string | null
          is_limited?: boolean
          limited_passcode?: string | null
          line_notified_at?: string | null
          line_scheduled_at?: string | null
          short_code?: string | null
          line_schedule_message?: string | null
          location_type?: string | null
          online_url?: string | null
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          location_url?: string | null
          reminder_24h_sent?: boolean
          reminder_2h_sent?: boolean
          payment_method?: string | null
          payment_link?: string | null
          payment_info?: string | null
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
          status: 'confirmed' | 'cancelled' | 'waitlisted'
          attended: boolean | null
          stripe_session_id: string | null
          payment_status: 'none' | 'pending' | 'paid' | 'failed' | 'refunded'
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          guest_name: string
          guest_email: string
          guest_phone?: string | null
          status?: 'confirmed' | 'cancelled' | 'waitlisted'
          attended?: boolean | null
          stripe_session_id?: string | null
          payment_status?: 'none' | 'pending' | 'paid' | 'failed' | 'refunded'
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          guest_name?: string
          guest_email?: string
          guest_phone?: string | null
          status?: 'confirmed' | 'cancelled' | 'waitlisted'
          attended?: boolean | null
          stripe_session_id?: string | null
          payment_status?: 'none' | 'pending' | 'paid' | 'failed' | 'refunded'
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
          channel_secret: string | null
          bot_user_id: string | null
          bot_basic_id: string | null
          owner_line_user_id: string | null
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
          channel_secret?: string | null
          bot_user_id?: string | null
          bot_basic_id?: string | null
          owner_line_user_id?: string | null
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
          channel_secret?: string | null
          bot_user_id?: string | null
          bot_basic_id?: string | null
          owner_line_user_id?: string | null
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
      line_followers: {
        Row: {
          id: string
          line_account_id: string
          line_user_id: string
          display_name: string | null
          picture_url: string | null
          is_following: boolean
          followed_at: string
          unfollowed_at: string | null
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          line_account_id: string
          line_user_id: string
          display_name?: string | null
          picture_url?: string | null
          is_following?: boolean
          followed_at?: string
          unfollowed_at?: string | null
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          line_account_id?: string
          line_user_id?: string
          display_name?: string | null
          picture_url?: string | null
          is_following?: boolean
          followed_at?: string
          unfollowed_at?: string | null
          tags?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_followers_line_account_id_fkey'
            columns: ['line_account_id']
            isOneToOne: false
            referencedRelation: 'line_accounts'
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
          channel: 'email' | 'line' | 'both'
          recipient_count: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          sender_id: string
          subject: string
          body: string
          channel?: 'email' | 'line' | 'both'
          recipient_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          sender_id?: string
          subject?: string
          body?: string
          channel?: 'email' | 'line' | 'both'
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
      line_messages: {
        Row: {
          id: string
          line_account_id: string
          line_user_id: string
          direction: 'incoming' | 'outgoing'
          message_type: string
          content: string
          line_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          line_account_id: string
          line_user_id: string
          direction: 'incoming' | 'outgoing'
          message_type?: string
          content: string
          line_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          line_account_id?: string
          line_user_id?: string
          direction?: 'incoming' | 'outgoing'
          message_type?: string
          content?: string
          line_message_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'line_messages_line_account_id_fkey'
            columns: ['line_account_id']
            isOneToOne: false
            referencedRelation: 'line_accounts'
            referencedColumns: ['id']
          }
        ]
      }
      menus: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          price: number
          price_note: string | null
          image_url: string | null
          capacity: number | null
          custom_fields: Json
          is_published: boolean
          slug: string
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          price?: number
          price_note?: string | null
          image_url?: string | null
          capacity?: number | null
          custom_fields?: Json
          is_published?: boolean
          slug: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          price?: number
          price_note?: string | null
          image_url?: string | null
          capacity?: number | null
          custom_fields?: Json
          is_published?: boolean
          slug?: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'menus_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      menu_bookings: {
        Row: {
          id: string
          menu_id: string
          user_id: string | null
          guest_name: string
          guest_email: string
          guest_phone: string | null
          custom_field_values: Json
          status: 'confirmed' | 'cancelled' | 'waitlisted'
          attended: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          user_id?: string | null
          guest_name: string
          guest_email: string
          guest_phone?: string | null
          custom_field_values?: Json
          status?: 'confirmed' | 'cancelled' | 'waitlisted'
          attended?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          menu_id?: string
          user_id?: string | null
          guest_name?: string
          guest_email?: string
          guest_phone?: string | null
          custom_field_values?: Json
          status?: 'confirmed' | 'cancelled' | 'waitlisted'
          attended?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'menu_bookings_menu_id_fkey'
            columns: ['menu_id']
            isOneToOne: false
            referencedRelation: 'menus'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'menu_bookings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      menu_messages: {
        Row: {
          id: string
          menu_id: string
          sender_id: string
          subject: string
          body: string
          channel: 'email' | 'line' | 'both'
          recipient_count: number
          created_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          sender_id: string
          subject: string
          body: string
          channel?: 'email' | 'line' | 'both'
          recipient_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          menu_id?: string
          sender_id?: string
          subject?: string
          body?: string
          channel?: 'email' | 'line' | 'both'
          recipient_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'menu_messages_menu_id_fkey'
            columns: ['menu_id']
            isOneToOne: false
            referencedRelation: 'menus'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'menu_messages_sender_id_fkey'
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
      stripe_settings: {
        Row: {
          id: string
          user_id: string
          stripe_account_id: string | null
          stripe_secret_key: string
          stripe_webhook_id: string | null
          stripe_webhook_secret: string | null
          display_name: string
          is_test_mode: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_account_id?: string | null
          stripe_secret_key: string
          stripe_webhook_id?: string | null
          stripe_webhook_secret?: string | null
          display_name?: string
          is_test_mode?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_account_id?: string | null
          stripe_secret_key?: string
          stripe_webhook_id?: string | null
          stripe_webhook_secret?: string | null
          display_name?: string
          is_test_mode?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stripe_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      event_admins: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          email: string | null
          invite_token: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          email?: string | null
          invite_token?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          email?: string | null
          invite_token?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_admins_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_admins_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
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
      booking_status: 'confirmed' | 'cancelled' | 'waitlisted'
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

export type LineFollower = Database['public']['Tables']['line_followers']['Row']
export type LineFollowerInsert = Database['public']['Tables']['line_followers']['Insert']
export type LineFollowerUpdate = Database['public']['Tables']['line_followers']['Update']

export type LineMessage = Database['public']['Tables']['line_messages']['Row']
export type LineMessageInsert = Database['public']['Tables']['line_messages']['Insert']

export type Menu = Database['public']['Tables']['menus']['Row']
export type MenuInsert = Database['public']['Tables']['menus']['Insert']
export type MenuUpdate = Database['public']['Tables']['menus']['Update']

export type MenuBooking = Database['public']['Tables']['menu_bookings']['Row']
export type MenuBookingInsert = Database['public']['Tables']['menu_bookings']['Insert']

export type MenuMessage = Database['public']['Tables']['menu_messages']['Row']
export type MenuMessageInsert = Database['public']['Tables']['menu_messages']['Insert']

export type StripeSettings = Database['public']['Tables']['stripe_settings']['Row']
export type StripeSettingsInsert = Database['public']['Tables']['stripe_settings']['Insert']
export type StripeSettingsUpdate = Database['public']['Tables']['stripe_settings']['Update']

export type EventAdmin = Database['public']['Tables']['event_admins']['Row']
export type EventAdminInsert = Database['public']['Tables']['event_admins']['Insert']
export type EventAdminUpdate = Database['public']['Tables']['event_admins']['Update']

export type BookingStatus = 'confirmed' | 'cancelled' | 'waitlisted'

export type CustomField = {
  id: string
  type: 'text' | 'date' | 'select'
  label: string
  required: boolean
  options?: string[]
}

/** Menu row augmented with a live booking count */
export type MenuWithBookingCount = Menu & { booking_count: number }

export type SnsLinks = {
  twitter?: string
  instagram?: string
  facebook?: string
  website?: string
  [key: string]: string | undefined
}

/** Event row augmented with a live booking count */
export type EventWithBookingCount = Event & { booking_count: number }
