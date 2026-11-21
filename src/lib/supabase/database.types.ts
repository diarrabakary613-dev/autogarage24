/**
 * Tipi del database generati dal progetto Supabase reale (mcjlyqplfiyhrxvazzzk).
 * NON modificare a mano: rigenerare dopo ogni migrazione.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          staff_note: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          staff_note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          staff_note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_budget_entries: {
        Row: {
          actual_cents: number | null
          approved_at: string | null
          approved_by: string | null
          campaign_id: string | null
          clicks: number | null
          created_at: string
          created_by: string | null
          founder_approved: boolean
          id: string
          impressions: number | null
          leads: number | null
          notes: string | null
          period_end: string
          period_start: string
          planned_cents: number
          platform: string
          updated_at: string
        }
        Insert: {
          actual_cents?: number | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          clicks?: number | null
          created_at?: string
          created_by?: string | null
          founder_approved?: boolean
          id?: string
          impressions?: number | null
          leads?: number | null
          notes?: string | null
          period_end: string
          period_start: string
          planned_cents: number
          platform: string
          updated_at?: string
        }
        Update: {
          actual_cents?: number | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          clicks?: number | null
          created_at?: string
          created_by?: string | null
          founder_approved?: boolean
          id?: string
          impressions?: number | null
          leads?: number | null
          notes?: string | null
          period_end?: string
          period_start?: string
          planned_cents?: number
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_budget_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_budget_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_budget_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          device: string | null
          event: string
          id: number
          is_entry: boolean
          landing: string | null
          meta: Json
          occurred_at: string
          path: string | null
          referrer_host: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          device?: string | null
          event: string
          id?: never
          is_entry?: boolean
          landing?: string | null
          meta?: Json
          occurred_at?: string
          path?: string | null
          referrer_host?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          device?: string | null
          event?: string
          id?: never
          is_entry?: boolean
          landing?: string | null
          meta?: Json
          occurred_at?: string
          path?: string | null
          referrer_host?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          device: string | null
          digest: string | null
          id: number
          message: string
          occurred_at: string
          path: string | null
          source: string
        }
        Insert: {
          device?: string | null
          digest?: string | null
          id?: never
          message: string
          occurred_at?: string
          path?: string | null
          source: string
        }
        Update: {
          device?: string | null
          digest?: string | null
          id?: never
          message?: string
          occurred_at?: string
          path?: string | null
          source?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          id: string
          note: string | null
          proposed_by: string
          proposed_date: string
          request_id: string
          slot: Database["public"]["Enums"]["time_slot"]
          status: Database["public"]["Enums"]["appointment_status"]
          time_text: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          note?: string | null
          proposed_by: string
          proposed_date: string
          request_id: string
          slot?: Database["public"]["Enums"]["time_slot"]
          status?: Database["public"]["Enums"]["appointment_status"]
          time_text?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          note?: string | null
          proposed_by?: string
          proposed_date?: string
          request_id?: string
          slot?: Database["public"]["Enums"]["time_slot"]
          status?: Database["public"]["Enums"]["appointment_status"]
          time_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_signups: {
        Row: {
          audience: string
          city: string | null
          created_at: string
          email: string
          id: string
          invited_at: string | null
          landing_path: string | null
          privacy_accepted_at: string
          status: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          audience: string
          city?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          landing_path?: string | null
          privacy_accepted_at: string
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          audience?: string
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          landing_path?: string | null
          privacy_accepted_at?: string
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author_id: string | null
          author_name: string
          category_id: string | null
          content: string
          cover_alt: string | null
          cover_path: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          publish_at: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_id?: string | null
          author_name: string
          category_id?: string | null
          content?: string
          cover_alt?: string | null
          cover_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          publish_at?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          category_id?: string | null
          content?: string
          cover_alt?: string | null
          cover_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          publish_at?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      booking_availability: {
        Row: {
          end_time: string
          id: string
          owner_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          owner_id?: string
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          owner_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_blocks: {
        Row: {
          ends_at: string
          id: string
          owner_id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          ends_at: string
          id?: string
          owner_id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          ends_at?: string
          id?: string
          owner_id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_blocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_settings: {
        Row: {
          max_days_ahead: number
          meeting_address: string | null
          min_notice_hours: number
          owner_id: string
          slot_minutes: number
          test_drive_conditions: string | null
          test_drive_enabled: boolean
          test_drive_min_years: number | null
          timezone: string
          updated_at: string
        }
        Insert: {
          max_days_ahead?: number
          meeting_address?: string | null
          min_notice_hours?: number
          owner_id?: string
          slot_minutes?: number
          test_drive_conditions?: string | null
          test_drive_enabled?: boolean
          test_drive_min_years?: number | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          max_days_ahead?: number
          meeting_address?: string | null
          min_notice_hours?: number
          owner_id?: string
          slot_minutes?: number
          test_drive_conditions?: string | null
          test_drive_enabled?: boolean
          test_drive_min_years?: number | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          profile_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          profile_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_audit_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          active: boolean
          applies_to: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          active?: boolean
          applies_to: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      business_lead_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          profile_id: string
          source: string
          source_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          profile_id: string
          source: string
          source_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
          source?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_lead_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_lead_states: {
        Row: {
          assigned_to: string | null
          profile_id: string
          source: string
          source_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          profile_id: string
          source: string
          source_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          profile_id?: string
          source?: string
          source_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_lead_states_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_lead_states_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_lead_states_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_email: string
          invited_by: string | null
          permissions: string[]
          profile_id: string
          revoked_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_email: string
          invited_by?: string | null
          permissions?: string[]
          profile_id: string
          revoked_at?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_email?: string
          invited_by?: string | null
          permissions?: string[]
          profile_id?: string
          revoked_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          position: number
          profile_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          position?: number
          profile_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          position?: number
          profile_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plan_assignments: {
        Row: {
          assigned_by: string | null
          note: string | null
          plan_code: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          note?: string | null
          plan_code: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          note?: string | null
          plan_code?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_plan_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_plan_assignments_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "business_plan_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          country_code: string
          created_at: string
          id: string
          legal_address: string | null
          legal_city: string | null
          legal_name: string
          legal_postal_code: string | null
          legal_province: string | null
          pec_email: string | null
          sdi_code: string | null
          tax_code: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          legal_address?: string | null
          legal_city?: string | null
          legal_name: string
          legal_postal_code?: string | null
          legal_province?: string | null
          pec_email?: string | null
          sdi_code?: string | null
          tax_code?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          legal_address?: string | null
          legal_city?: string | null
          legal_name?: string
          legal_postal_code?: string | null
          legal_province?: string | null
          pec_email?: string | null
          sdi_code?: string | null
          tax_code?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          kind: string
          lead_id: string | null
          lead_source: string | null
          notified_due: boolean
          priority: string
          profile_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          lead_source?: string | null
          notified_due?: boolean
          priority?: string
          profile_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          lead_source?: string | null
          notified_due?: boolean
          priority?: string
          profile_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tasks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          calendar_id: string | null
          last_error: string | null
          owner_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          last_error?: string | null
          owner_id: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          last_error?: string | null
          owner_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          status: string
          target_id: string | null
          target_label: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          archived_at: string | null
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context: Database["public"]["Enums"]["conversation_context"]
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string
          listing_id: string | null
          professional_profile_id: string | null
          request_id: string | null
          status: string
          subject: string
        }
        Insert: {
          context?: Database["public"]["Enums"]["conversation_context"]
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          listing_id?: string | null
          professional_profile_id?: string | null
          request_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          context?: Database["public"]["Enums"]["conversation_context"]
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          listing_id?: string | null
          professional_profile_id?: string | null
          request_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_request_fk"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          claim_id: string
          coupon_id: string
          created_at: string
          discount_cents: number
          id: string
          user_id: string
        }
        Insert: {
          claim_id: string
          coupon_id: string
          created_at?: string
          discount_cents: number
          id?: string
          user_id: string
        }
        Update: {
          claim_id?: string
          coupon_id?: string
          created_at?: string
          discount_cents?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "offer_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "promotional_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_view_counts: {
        Row: {
          day: string
          target_id: string
          target_kind: string
          views: number
        }
        Insert: {
          day?: string
          target_id: string
          target_kind: string
          views?: number
        }
        Update: {
          day?: string
          target_id?: string
          target_kind?: string
          views?: number
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          budget_max_cents: number | null
          city_interest: string | null
          license_category: string
          license_obtained_on: string | null
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max_cents?: number | null
          city_interest?: string | null
          license_category?: string
          license_obtained_on?: string | null
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max_cents?: number | null
          city_interest?: string | null
          license_category?: string
          license_obtained_on?: string | null
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          id: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
          subject: string
          template: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          subject: string
          template: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribe_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          offer_id: string | null
          part_id: string | null
          professional_profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          offer_id?: string | null
          part_id?: string | null
          professional_profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          offer_id?: string | null
          part_id?: string | null
          professional_profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_part_fk"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_part_fk"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_contact_history: {
        Row: {
          changed_by: string | null
          contact_id: string
          created_at: string
          field: string
          id: number
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_by?: string | null
          contact_id: string
          created_at?: string
          field: string
          id?: never
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_by?: string | null
          contact_id?: string
          created_at?: string
          field?: string
          id?: never
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_contact_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_contact_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "field_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      field_contacts: {
        Row: {
          address: string | null
          assigned_to: string | null
          business_name: string
          business_type: string
          category_slug: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_contact_on: string | null
          id: string
          lost_reason: string | null
          next_followup_on: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          professional_profile_id: string | null
          province: string | null
          source: string
          status: string
          status_changed_at: string
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          business_name: string
          business_type: string
          category_slug?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_contact_on?: string | null
          id?: string
          lost_reason?: string | null
          next_followup_on?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          professional_profile_id?: string | null
          province?: string | null
          source?: string
          status?: string
          status_changed_at?: string
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          business_name?: string
          business_type?: string
          category_slug?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_contact_on?: string | null
          id?: string
          lost_reason?: string | null
          next_followup_on?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          professional_profile_id?: string | null
          province?: string | null
          source?: string
          status?: string
          status_changed_at?: string
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_contacts_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "field_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_contacts_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_visits: {
        Row: {
          cars_available: number | null
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          interest_level: string | null
          kind: string
          met_contact_name: string | null
          neo_cars_available: number | null
          next_action: string | null
          next_action_on: string | null
          notes: string | null
          outcome: string | null
          visited_on: string
        }
        Insert: {
          cars_available?: number | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          interest_level?: string | null
          kind?: string
          met_contact_name?: string | null
          neo_cars_available?: number | null
          next_action?: string | null
          next_action_on?: string | null
          notes?: string | null
          outcome?: string | null
          visited_on?: string
        }
        Update: {
          cars_available?: number | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interest_level?: string | null
          kind?: string
          met_contact_name?: string | null
          neo_cars_available?: number | null
          next_action?: string | null
          next_action_on?: string | null
          notes?: string | null
          outcome?: string | null
          visited_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_visits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "field_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_partners: {
        Row: {
          admitted_at: string
          admitted_by: string | null
          contact_id: string
          created_at: string
          id: string
          onboarding_notes: string | null
          professional_profile_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admitted_at?: string
          admitted_by?: string | null
          contact_id: string
          created_at?: string
          id?: string
          onboarding_notes?: string | null
          professional_profile_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admitted_at?: string
          admitted_by?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          onboarding_notes?: string | null
          professional_profile_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_partners_admitted_by_fkey"
            columns: ["admitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_partners_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "field_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_partners_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: true
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_experiments: {
        Row: {
          audience: string | null
          campaign_id: string | null
          change_description: string
          conversions_a: number | null
          conversions_b: number | null
          created_at: string
          created_by: string | null
          decision: string
          end_on: string | null
          hypothesis: string
          id: string
          metric: string
          result_notes: string | null
          sample_a: number | null
          sample_b: number | null
          start_on: string | null
          status: string
          title: string
          updated_at: string
          variant_a: string
          variant_b: string
        }
        Insert: {
          audience?: string | null
          campaign_id?: string | null
          change_description: string
          conversions_a?: number | null
          conversions_b?: number | null
          created_at?: string
          created_by?: string | null
          decision?: string
          end_on?: string | null
          hypothesis: string
          id?: string
          metric: string
          result_notes?: string | null
          sample_a?: number | null
          sample_b?: number | null
          start_on?: string | null
          status?: string
          title: string
          updated_at?: string
          variant_a: string
          variant_b: string
        }
        Update: {
          audience?: string | null
          campaign_id?: string | null
          change_description?: string
          conversions_a?: number | null
          conversions_b?: number | null
          created_at?: string
          created_by?: string | null
          decision?: string
          end_on?: string | null
          hypothesis?: string
          id?: string
          metric?: string
          result_notes?: string | null
          sample_a?: number | null
          sample_b?: number | null
          start_on?: string | null
          status?: string
          title?: string
          updated_at?: string
          variant_a?: string
          variant_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_experiments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_appointments: {
        Row: {
          center_owner_id: string
          center_profile_id: string
          conversation_id: string | null
          created_at: string
          decision_note: string | null
          ends_at: string | null
          id: string
          message: string | null
          plate: string | null
          preferred_date: string | null
          preferred_time: string | null
          proposed_starts_at: string | null
          reminded_24h: boolean
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
          user_vehicle_id: string | null
          vehicle_category: string
          vehicle_desc: string
        }
        Insert: {
          center_owner_id: string
          center_profile_id: string
          conversation_id?: string | null
          created_at?: string
          decision_note?: string | null
          ends_at?: string | null
          id?: string
          message?: string | null
          plate?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          proposed_starts_at?: string | null
          reminded_24h?: boolean
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_vehicle_id?: string | null
          vehicle_category?: string
          vehicle_desc: string
        }
        Update: {
          center_owner_id?: string
          center_profile_id?: string
          conversation_id?: string | null
          created_at?: string
          decision_note?: string | null
          ends_at?: string | null
          id?: string
          message?: string | null
          plate?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          proposed_starts_at?: string | null
          reminded_24h?: boolean
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_category?: string
          vehicle_desc?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_appointments_center_owner_id_fkey"
            columns: ["center_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_appointments_center_profile_id_fkey"
            columns: ["center_profile_id"]
            isOneToOne: false
            referencedRelation: "inspection_centers"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "inspection_appointments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_appointments_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_authorizations: {
        Row: {
          authority: string
          authorization_number: string
          categories: string[]
          created_at: string
          document_path: string
          id: string
          issued_on: string | null
          profile_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          valid_until: string | null
        }
        Insert: {
          authority: string
          authorization_number: string
          categories: string[]
          created_at?: string
          document_path: string
          id?: string
          issued_on?: string | null
          profile_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          valid_until?: string | null
        }
        Update: {
          authority?: string
          authorization_number?: string
          categories?: string[]
          created_at?: string
          document_path?: string
          id?: string
          issued_on?: string | null
          profile_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_authorizations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "inspection_centers"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "inspection_authorizations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_centers: {
        Row: {
          admin_note: string | null
          created_at: string
          hours_text: string | null
          price_notes: string | null
          profile_id: string
          services: string[]
          status: string
          updated_at: string
          vehicle_categories: string[]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          hours_text?: string | null
          price_notes?: string | null
          profile_id: string
          services?: string[]
          status?: string
          updated_at?: string
          vehicle_categories: string[]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          hours_text?: string | null
          price_notes?: string | null
          profile_id?: string
          services?: string[]
          status?: string
          updated_at?: string
          vehicle_categories?: string[]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_centers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_centers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          id: string
          inspection_id: string
          item: string
          note: string | null
          position: number
          result: Database["public"]["Enums"]["inspection_result"]
        }
        Insert: {
          id?: string
          inspection_id: string
          item: string
          note?: string | null
          position?: number
          result: Database["public"]["Enums"]["inspection_result"]
        }
        Update: {
          id?: string
          inspection_id?: string
          item?: string
          note?: string | null
          position?: number
          result?: Database["public"]["Enums"]["inspection_result"]
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          caption: string | null
          id: string
          inspection_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          id?: string
          inspection_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          id?: string
          inspection_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_records: {
        Row: {
          appointment_id: string | null
          center_name: string | null
          center_profile_id: string | null
          created_at: string
          document_path: string | null
          id: string
          inspected_on: string
          maintenance_record_id: string | null
          mileage_km: number | null
          next_due_date: string | null
          notes: string | null
          outcome: string
          owner_id: string
          user_vehicle_id: string
          verification: string
        }
        Insert: {
          appointment_id?: string | null
          center_name?: string | null
          center_profile_id?: string | null
          created_at?: string
          document_path?: string | null
          id?: string
          inspected_on: string
          maintenance_record_id?: string | null
          mileage_km?: number | null
          next_due_date?: string | null
          notes?: string | null
          outcome: string
          owner_id?: string
          user_vehicle_id: string
          verification?: string
        }
        Update: {
          appointment_id?: string | null
          center_name?: string | null
          center_profile_id?: string | null
          created_at?: string
          document_path?: string | null
          id?: string
          inspected_on?: string
          maintenance_record_id?: string | null
          mileage_km?: number | null
          next_due_date?: string | null
          notes?: string | null
          outcome?: string
          owner_id?: string
          user_vehicle_id?: string
          verification?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "inspection_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_records_center_profile_id_fkey"
            columns: ["center_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_records_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_records_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_integrations: {
        Row: {
          contract_ref: string | null
          created_at: string
          endpoint_url: string | null
          id: string
          kind: string
          last_error: string | null
          last_success_at: string | null
          notes: string | null
          partner_id: string
          secret_env_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contract_ref?: string | null
          created_at?: string
          endpoint_url?: string | null
          id?: string
          kind: string
          last_error?: string | null
          last_success_at?: string | null
          notes?: string | null
          partner_id: string
          secret_env_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contract_ref?: string | null
          created_at?: string
          endpoint_url?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          last_success_at?: string | null
          notes?: string | null
          partner_id?: string
          secret_env_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_integrations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "insurance_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_partner_users: {
        Row: {
          added_by: string | null
          created_at: string
          partner_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          partner_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          partner_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_partner_users_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "insurance_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_partner_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_partners: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          coverages: string[]
          created_at: string
          description: string | null
          id: string
          ivass_company_code: string | null
          legal_name: string
          name: string
          partner_type: string
          privacy_url: string | null
          registry_checked_at: string | null
          registry_evidence: string | null
          rui_number: string | null
          rui_section: string | null
          status: string
          status_note: string | null
          updated_at: string
          vat_number: string | null
          verified_at: string | null
          verified_by: string | null
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          coverages?: string[]
          created_at?: string
          description?: string | null
          id?: string
          ivass_company_code?: string | null
          legal_name: string
          name: string
          partner_type: string
          privacy_url?: string | null
          registry_checked_at?: string | null
          registry_evidence?: string | null
          rui_number?: string | null
          rui_section?: string | null
          status?: string
          status_note?: string | null
          updated_at?: string
          vat_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          coverages?: string[]
          created_at?: string
          description?: string | null
          id?: string
          ivass_company_code?: string | null
          legal_name?: string
          name?: string
          partner_type?: string
          privacy_url?: string | null
          registry_checked_at?: string | null
          registry_evidence?: string | null
          rui_number?: string | null
          rui_section?: string | null
          status?: string
          status_note?: string | null
          updated_at?: string
          vat_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_partners_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_quote_requests: {
        Row: {
          contact_channel: string
          contact_phone: string | null
          coverages: string[]
          created_at: string
          desired_start: string | null
          fuel: string | null
          id: string
          notes: string | null
          plate: string | null
          postal_code: string | null
          power_kw: number | null
          province: string
          registration_date: string | null
          status: string
          updated_at: string
          user_id: string
          user_vehicle_id: string | null
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number | null
        }
        Insert: {
          contact_channel?: string
          contact_phone?: string | null
          coverages: string[]
          created_at?: string
          desired_start?: string | null
          fuel?: string | null
          id?: string
          notes?: string | null
          plate?: string | null
          postal_code?: string | null
          power_kw?: number | null
          province: string
          registration_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_make: string
          vehicle_model: string
          vehicle_year?: number | null
        }
        Update: {
          contact_channel?: string
          contact_phone?: string | null
          coverages?: string[]
          created_at?: string
          desired_start?: string | null
          fuel?: string | null
          id?: string
          notes?: string | null
          plate?: string | null
          postal_code?: string | null
          power_kw?: number | null
          province?: string
          registration_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_make?: string
          vehicle_model?: string
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_quote_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_quote_requests_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_quotes: {
        Row: {
          annual_premium_cents: number
          coverages: string
          created_at: string
          created_by: string | null
          deductibles: string | null
          documents_url: string
          duration_months: number
          exclusions: string | null
          external_ref: string | null
          id: string
          limits: string | null
          partner_id: string
          product_name: string
          purchase_url: string | null
          request_partner_id: string
          source: string
          status: string
          valid_until: string
        }
        Insert: {
          annual_premium_cents: number
          coverages: string
          created_at?: string
          created_by?: string | null
          deductibles?: string | null
          documents_url: string
          duration_months: number
          exclusions?: string | null
          external_ref?: string | null
          id?: string
          limits?: string | null
          partner_id: string
          product_name: string
          purchase_url?: string | null
          request_partner_id: string
          source: string
          status?: string
          valid_until: string
        }
        Update: {
          annual_premium_cents?: number
          coverages?: string
          created_at?: string
          created_by?: string | null
          deductibles?: string | null
          documents_url?: string
          duration_months?: number
          exclusions?: string | null
          external_ref?: string | null
          id?: string
          limits?: string | null
          partner_id?: string
          product_name?: string
          purchase_url?: string | null
          request_partner_id?: string
          source?: string
          status?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_quotes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "insurance_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_quotes_request_partner_id_fkey"
            columns: ["request_partner_id"]
            isOneToOne: false
            referencedRelation: "insurance_request_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event: string
          id: number
          note: string | null
          partner_id: string | null
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event: string
          id?: never
          note?: string | null
          partner_id?: string | null
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event?: string
          id?: never
          note?: string | null
          partner_id?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_request_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_request_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "insurance_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "insurance_quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_request_partners: {
        Row: {
          consent_at: string
          consent_version: string
          id: string
          partner_id: string
          partner_note: string | null
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          consent_at?: string
          consent_version?: string
          id?: string
          partner_id: string
          partner_note?: string | null
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          consent_at?: string
          consent_version?: string
          id?: string
          partner_id?: string
          partner_note?: string | null
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_request_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "insurance_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_request_partners_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "insurance_quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          audience: string
          body: string | null
          bullets: string[]
          campaign_id: string | null
          created_at: string
          created_by: string | null
          cta_label: string
          cta_path: string
          experiment_active: boolean
          headline: string
          id: string
          indexable: boolean
          meta_description: string | null
          published_at: string | null
          section: string
          slug: string
          status: string
          subheadline: string | null
          title: string
          updated_at: string
          variant_b_cta_label: string | null
          variant_b_headline: string | null
        }
        Insert: {
          audience?: string
          body?: string | null
          bullets?: string[]
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          cta_label: string
          cta_path: string
          experiment_active?: boolean
          headline: string
          id?: string
          indexable?: boolean
          meta_description?: string | null
          published_at?: string | null
          section?: string
          slug: string
          status?: string
          subheadline?: string | null
          title: string
          updated_at?: string
          variant_b_cta_label?: string | null
          variant_b_headline?: string | null
        }
        Update: {
          audience?: string
          body?: string | null
          bullets?: string[]
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string
          cta_path?: string
          experiment_active?: boolean
          headline?: string
          id?: string
          indexable?: boolean
          meta_description?: string | null
          published_at?: string | null
          section?: string
          slug?: string
          status?: string
          subheadline?: string | null
          title?: string
          updated_at?: string
          variant_b_cta_label?: string | null
          variant_b_headline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_rule_versions: {
        Row: {
          consulted_on: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          exceptions: Json
          id: string
          license_obtained_from: string | null
          license_obtained_to: string | null
          params: Json
          published_at: string | null
          published_by: string | null
          reason: string | null
          rule_id: string
          sources: Json
          status: Database["public"]["Enums"]["rule_status"]
          test_results: Json | null
          tested_at: string | null
          version_label: string
        }
        Insert: {
          consulted_on?: string | null
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          exceptions?: Json
          id?: string
          license_obtained_from?: string | null
          license_obtained_to?: string | null
          params: Json
          published_at?: string | null
          published_by?: string | null
          reason?: string | null
          rule_id: string
          sources?: Json
          status?: Database["public"]["Enums"]["rule_status"]
          test_results?: Json | null
          tested_at?: string | null
          version_label: string
        }
        Update: {
          consulted_on?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          exceptions?: Json
          id?: string
          license_obtained_from?: string | null
          license_obtained_to?: string | null
          params?: Json
          published_at?: string | null
          published_by?: string | null
          reason?: string | null
          rule_id?: string
          sources?: Json
          status?: Database["public"]["Enums"]["rule_status"]
          test_results?: Json | null
          tested_at?: string | null
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_rule_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_rule_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "legal_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_rules: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          category: Database["public"]["Enums"]["maintenance_category"]
          cost_cents: number | null
          created_at: string
          description: string | null
          id: string
          mileage_km: number | null
          notes: string | null
          owner_id: string
          part_id: string | null
          parts_used: string | null
          performed_on: string
          professional_profile_id: string | null
          provider_name: string | null
          request_id: string | null
          source: Database["public"]["Enums"]["record_source"]
          title: string
          updated_at: string
          user_vehicle_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["maintenance_category"]
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          mileage_km?: number | null
          notes?: string | null
          owner_id: string
          part_id?: string | null
          parts_used?: string | null
          performed_on: string
          professional_profile_id?: string | null
          provider_name?: string | null
          request_id?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          title: string
          updated_at?: string
          user_vehicle_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["maintenance_category"]
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          mileage_km?: number | null
          notes?: string | null
          owner_id?: string
          part_id?: string | null
          parts_used?: string | null
          performed_on?: string
          professional_profile_id?: string | null
          provider_name?: string | null
          request_id?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          title?: string
          updated_at?: string
          user_vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_reminders: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_mileage_km: number | null
          id: string
          last_notified_kind: string | null
          last_notified_on: string | null
          notify_days_before: number
          notify_email: boolean
          owner_id: string
          recurrence_km: number | null
          recurrence_months: number | null
          status: Database["public"]["Enums"]["reminder_status"]
          title: string
          updated_at: string
          user_vehicle_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_notified_kind?: string | null
          last_notified_on?: string | null
          notify_days_before?: number
          notify_email?: boolean
          owner_id: string
          recurrence_km?: number | null
          recurrence_months?: number | null
          status?: Database["public"]["Enums"]["reminder_status"]
          title: string
          updated_at?: string
          user_vehicle_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_notified_kind?: string | null
          last_notified_on?: string | null
          notify_days_before?: number
          notify_email?: boolean
          owner_id?: string
          recurrence_km?: number | null
          recurrence_months?: number | null
          status?: Database["public"]["Enums"]["reminder_status"]
          title?: string
          updated_at?: string
          user_vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_reminders_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience: string
          budget_planned_cents: number | null
          channels: string[]
          created_at: string
          created_by: string | null
          end_on: string | null
          id: string
          landing_path: string | null
          name: string
          notes: string | null
          objective: string | null
          promo_code: string | null
          published_at: string | null
          start_on: string | null
          status: Database["public"]["Enums"]["marketing_status"]
          target: string
          updated_at: string
          utm_campaign: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience: string
          budget_planned_cents?: number | null
          channels?: string[]
          created_at?: string
          created_by?: string | null
          end_on?: string | null
          id?: string
          landing_path?: string | null
          name: string
          notes?: string | null
          objective?: string | null
          promo_code?: string | null
          published_at?: string | null
          start_on?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          target?: string
          updated_at?: string
          utm_campaign?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          budget_planned_cents?: number | null
          channels?: string[]
          created_at?: string
          created_by?: string | null
          end_on?: string | null
          id?: string
          landing_path?: string | null
          name?: string
          notes?: string | null
          objective?: string | null
          promo_code?: string | null
          published_at?: string | null
          start_on?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          target?: string
          updated_at?: string
          utm_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_consent_log: {
        Row: {
          consent: boolean
          created_at: string
          id: number
          source: string
          user_id: string
        }
        Insert: {
          consent: boolean
          created_at?: string
          id?: never
          source: string
          user_id: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          id?: never
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_consent_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_origin: string | null
          asset_rights_note: string | null
          asset_url: string | null
          audience: string | null
          body: string | null
          campaign_id: string | null
          channel: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          duration_seconds: number | null
          format: string | null
          generation_prompt: string | null
          headline: string | null
          hook: string | null
          id: string
          kind: string
          notes: string | null
          objective: string | null
          planned_at: string | null
          published_at: string | null
          published_url: string | null
          service: string | null
          status: Database["public"]["Enums"]["marketing_status"]
          title: string
          tone: string | null
          updated_at: string
          variants: Json
          visual_brief: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_origin?: string | null
          asset_rights_note?: string | null
          asset_url?: string | null
          audience?: string | null
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          duration_seconds?: number | null
          format?: string | null
          generation_prompt?: string | null
          headline?: string | null
          hook?: string | null
          id?: string
          kind: string
          notes?: string | null
          objective?: string | null
          planned_at?: string | null
          published_at?: string | null
          published_url?: string | null
          service?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          title: string
          tone?: string | null
          updated_at?: string
          variants?: Json
          visual_brief?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_origin?: string | null
          asset_rights_note?: string | null
          asset_url?: string | null
          audience?: string | null
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          duration_seconds?: number | null
          format?: string | null
          generation_prompt?: string | null
          headline?: string | null
          hook?: string | null
          id?: string
          kind?: string
          notes?: string | null
          objective?: string | null
          planned_at?: string | null
          published_at?: string | null
          published_url?: string | null
          service?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          title?: string
          tone?: string | null
          updated_at?: string
          variants?: Json
          visual_brief?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_messages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          campaign_id: string | null
          channels: string[]
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_path: string | null
          excluded: number | null
          id: string
          recipients: number | null
          segment: Json
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          campaign_id?: string | null
          channels?: string[]
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_path?: string | null
          excluded?: number | null
          id?: string
          recipients?: number | null
          segment?: Json
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          campaign_id?: string | null
          channels?: string[]
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_path?: string | null
          excluded?: number | null
          id?: string
          recipients?: number | null
          segment?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_messages_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sends: {
        Row: {
          channel: string
          created_at: string
          id: number
          message_id: string | null
          outbox_id: string | null
          reason: string | null
          status: string
          user_id: string
          workflow_key: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: never
          message_id?: string | null
          outbox_id?: string | null
          reason?: string | null
          status: string
          user_id: string
          workflow_key?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: never
          message_id?: string | null
          outbox_id?: string | null
          reason?: string | null
          status?: string
          user_id?: string
          workflow_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sends_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "marketing_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "email_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          entity: string
          entity_id: string
          id: number
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id?: never
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: never
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflows: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          active: boolean
          body: string
          condition_description: string
          cooldown_days: number
          delay_days: number
          key: string
          link: string
          max_per_user: number
          name: string
          send_email: boolean
          title: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          active?: boolean
          body: string
          condition_description: string
          cooldown_days?: number
          delay_days: number
          key: string
          link: string
          max_per_user?: number
          name: string
          send_email?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          active?: boolean
          body?: string
          condition_description?: string
          cooldown_days?: number
          delay_days?: number
          key?: string
          link?: string
          max_per_user?: number
          name?: string
          send_email?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflows_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          sender_id: string | null
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string | null
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          created_at: string
          id: string
          is_inconsistent: boolean
          note: string | null
          recorded_on: string
          source: string
          user_vehicle_id: string
          value_km: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_inconsistent?: boolean
          note?: string | null
          recorded_on?: string
          source?: string
          user_vehicle_id: string
          value_km: number
        }
        Update: {
          created_at?: string
          id?: string
          is_inconsistent?: boolean
          note?: string | null
          recorded_on?: string
          source?: string
          user_vehicle_id?: string
          value_km?: number
        }
        Relationships: [
          {
            foreignKeyName: "mileage_logs_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_events: {
        Row: {
          actor_id: string | null
          amount_cents: number | null
          context: string
          context_id: string
          created_at: string
          event: string
          id: number
          note: string | null
        }
        Insert: {
          actor_id?: string | null
          amount_cents?: number | null
          context: string
          context_id: string
          created_at?: string
          event: string
          id?: never
          note?: string | null
        }
        Update: {
          actor_id?: string | null
          amount_cents?: number | null
          context?: string
          context_id?: string
          created_at?: string
          event?: string
          id?: never
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: Json
          in_app: Json
          push: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: Json
          in_app?: Json
          push?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: Json
          in_app?: Json
          push?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          dedupe_key: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          body?: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          dedupe_key?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          dedupe_key?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_claims: {
        Row: {
          claim_code: string
          confirmed_at: string | null
          conversation_id: string | null
          coupon_id: string | null
          created_at: string
          estimated_cents: number
          id: string
          message: string | null
          offer_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          claim_code: string
          confirmed_at?: string | null
          conversation_id?: string | null
          coupon_id?: string | null
          created_at?: string
          estimated_cents: number
          id?: string
          message?: string | null
          offer_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          claim_code?: string
          confirmed_at?: string | null
          conversation_id?: string | null
          coupon_id?: string | null
          created_at?: string
          estimated_cents?: number
          id?: string
          message?: string | null
          offer_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_claims_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_claims_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "promotional_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_claims_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: number
          new_status: string
          note: string | null
          offer_id: string
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: never
          new_status: string
          note?: string | null
          offer_id: string
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: never
          new_status?: string
          note?: string | null
          offer_id?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_status_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      part_categories: {
        Row: {
          active: boolean
          id: string
          name: string
          parent_id: string | null
          position: number
          slug: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          slug: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      part_compatibility: {
        Row: {
          basis: string
          engine: string | null
          engine_code: string | null
          generation: string | null
          id: string
          make_slug: string
          model: string
          notes: string | null
          oem_reference: string | null
          part_id: string
          version: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          basis?: string
          engine?: string | null
          engine_code?: string | null
          generation?: string | null
          id?: string
          make_slug: string
          model: string
          notes?: string | null
          oem_reference?: string | null
          part_id: string
          version?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          basis?: string
          engine?: string | null
          engine_code?: string | null
          generation?: string | null
          id?: string
          make_slug?: string
          model?: string
          notes?: string | null
          oem_reference?: string | null
          part_id?: string
          version?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "part_compatibility_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_compatibility_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_search"
            referencedColumns: ["id"]
          },
        ]
      }
      part_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          part_id: string
          position: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          part_id: string
          position?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          part_id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_images_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_images_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_search"
            referencedColumns: ["id"]
          },
        ]
      }
      part_listings: {
        Row: {
          accepted_terms_at: string | null
          approved_at: string | null
          approved_by: string | null
          category_id: string
          city: string | null
          condition: Database["public"]["Enums"]["part_condition"]
          created_at: string
          declared_accuracy_at: string | null
          declared_photo_rights_at: string | null
          delivery_options: string[]
          description: string | null
          expires_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          manufacturer_brand: string | null
          manufacturer_code: string | null
          manufacturer_code_norm: string | null
          oem_code: string | null
          oem_code_norm: string | null
          owner_id: string
          postal_code: string | null
          price_cents: number | null
          professional_profile_id: string | null
          province: string | null
          published_at: string | null
          quantity: number | null
          refurbishment_notes: string | null
          seller_kind: Database["public"]["Enums"]["seller_kind"]
          shipping_info: string | null
          slug: string
          status: Database["public"]["Enums"]["part_status"]
          status_note: string | null
          title: string
          updated_at: string
          view_count: number
          warranty_text: string | null
        }
        Insert: {
          accepted_terms_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          city?: string | null
          condition?: Database["public"]["Enums"]["part_condition"]
          created_at?: string
          declared_accuracy_at?: string | null
          declared_photo_rights_at?: string | null
          delivery_options?: string[]
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manufacturer_brand?: string | null
          manufacturer_code?: string | null
          manufacturer_code_norm?: string | null
          oem_code?: string | null
          oem_code_norm?: string | null
          owner_id: string
          postal_code?: string | null
          price_cents?: number | null
          professional_profile_id?: string | null
          province?: string | null
          published_at?: string | null
          quantity?: number | null
          refurbishment_notes?: string | null
          seller_kind?: Database["public"]["Enums"]["seller_kind"]
          shipping_info?: string | null
          slug: string
          status?: Database["public"]["Enums"]["part_status"]
          status_note?: string | null
          title: string
          updated_at?: string
          view_count?: number
          warranty_text?: string | null
        }
        Update: {
          accepted_terms_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          city?: string | null
          condition?: Database["public"]["Enums"]["part_condition"]
          created_at?: string
          declared_accuracy_at?: string | null
          declared_photo_rights_at?: string | null
          delivery_options?: string[]
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manufacturer_brand?: string | null
          manufacturer_code?: string | null
          manufacturer_code_norm?: string | null
          oem_code?: string | null
          oem_code_norm?: string | null
          owner_id?: string
          postal_code?: string | null
          price_cents?: number | null
          professional_profile_id?: string | null
          province?: string | null
          published_at?: string | null
          quantity?: number | null
          refurbishment_notes?: string | null
          seller_kind?: Database["public"]["Enums"]["seller_kind"]
          shipping_info?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["part_status"]
          status_note?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          warranty_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_listings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_listings_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          address: string | null
          applicant_type: string
          business_name: string
          cars_available: number | null
          city: string
          contact_id: string | null
          contact_name: string
          created_at: string
          decision_note: string | null
          email: string
          founding_interest: boolean
          id: string
          landing_path: string | null
          message: string | null
          phone: string
          privacy_accepted_at: string
          program: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          address?: string | null
          applicant_type: string
          business_name: string
          cars_available?: number | null
          city: string
          contact_id?: string | null
          contact_name: string
          created_at?: string
          decision_note?: string | null
          email: string
          founding_interest?: boolean
          id?: string
          landing_path?: string | null
          message?: string | null
          phone: string
          privacy_accepted_at: string
          program: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          address?: string | null
          applicant_type?: string
          business_name?: string
          cars_available?: number | null
          city?: string
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          decision_note?: string | null
          email?: string
          founding_interest?: boolean
          id?: string
          landing_path?: string | null
          message?: string | null
          phone?: string
          privacy_accepted_at?: string
          program?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "field_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          advanced_features: boolean
          analytics_days: number
          exports_enabled: boolean
          max_active_offers: number | null
          max_members: number
          max_part_listings: number | null
          max_vehicle_listings: number | null
          plan_code: string
          promo_visibility: boolean
          updated_at: string
        }
        Insert: {
          advanced_features?: boolean
          analytics_days?: number
          exports_enabled?: boolean
          max_active_offers?: number | null
          max_members?: number
          max_part_listings?: number | null
          max_vehicle_listings?: number | null
          plan_code: string
          promo_visibility?: boolean
          updated_at?: string
        }
        Update: {
          advanced_features?: boolean
          analytics_days?: number
          exports_enabled?: boolean
          max_active_offers?: number | null
          max_members?: number
          max_part_listings?: number | null
          max_vehicle_listings?: number | null
          plan_code?: string
          promo_visibility?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_limits_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: true
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: number
          kind: string
          reason: string | null
          redemption_id: string | null
          rule_key: string | null
          source_id: string | null
          source_kind: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: never
          kind: string
          reason?: string | null
          redemption_id?: string | null
          rule_key?: string | null
          source_id?: string | null
          source_kind?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: never
          kind?: string
          reason?: string | null
          redemption_id?: string | null
          rule_key?: string | null
          source_id?: string | null
          source_kind?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_rule_key_fkey"
            columns: ["rule_key"]
            isOneToOne: false
            referencedRelation: "reward_rules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_affiliations: {
        Row: {
          created_at: string
          decided_at: string | null
          garage_profile_id: string
          id: string
          mechanic_profile_id: string
          message: string | null
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          garage_profile_id: string
          id?: string
          mechanic_profile_id: string
          message?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          garage_profile_id?: string
          id?: string
          mechanic_profile_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_affiliations_garage_profile_id_fkey"
            columns: ["garage_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_affiliations_mechanic_profile_id_fkey"
            columns: ["mechanic_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_certifications: {
        Row: {
          created_at: string
          document_path: string | null
          id: string
          issued_on: string | null
          issuer: string | null
          profile_id: string
          title: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          profile_id: string
          title: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_path?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          profile_id?: string
          title?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_certifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          accepts_appointments: boolean
          address_line: string | null
          brands_served: string[]
          business_verified_at: string | null
          categories: string[]
          city: string | null
          closed_days: string | null
          contact_person: string | null
          country_code: string
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_name: string
          documents_checked_at: string | null
          email_public: string | null
          experience_years: number | null
          id: string
          identity_verified_at: string | null
          is_published: boolean
          latitude: number | null
          logo_path: string | null
          longitude: number | null
          opening_hours: Json
          phone_public: string | null
          postal_code: string | null
          professional_type: Database["public"]["Enums"]["app_role"]
          province: string | null
          region: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["profile_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          service_area: string | null
          service_radius_km: number | null
          show_address: boolean
          slug: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          view_count: number
          website: string | null
          work_modes: Database["public"]["Enums"]["work_mode"][]
        }
        Insert: {
          accepts_appointments?: boolean
          address_line?: string | null
          brands_served?: string[]
          business_verified_at?: string | null
          categories?: string[]
          city?: string | null
          closed_days?: string | null
          contact_person?: string | null
          country_code?: string
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_name: string
          documents_checked_at?: string | null
          email_public?: string | null
          experience_years?: number | null
          id?: string
          identity_verified_at?: string | null
          is_published?: boolean
          latitude?: number | null
          logo_path?: string | null
          longitude?: number | null
          opening_hours?: Json
          phone_public?: string | null
          postal_code?: string | null
          professional_type: Database["public"]["Enums"]["app_role"]
          province?: string | null
          region?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["profile_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_area?: string | null
          service_radius_km?: number | null
          show_address?: boolean
          slug: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
          website?: string | null
          work_modes?: Database["public"]["Enums"]["work_mode"][]
        }
        Update: {
          accepts_appointments?: boolean
          address_line?: string | null
          brands_served?: string[]
          business_verified_at?: string | null
          categories?: string[]
          city?: string | null
          closed_days?: string | null
          contact_person?: string | null
          country_code?: string
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_name?: string
          documents_checked_at?: string | null
          email_public?: string | null
          experience_years?: number | null
          id?: string
          identity_verified_at?: string | null
          is_published?: boolean
          latitude?: number | null
          logo_path?: string | null
          longitude?: number | null
          opening_hours?: Json
          phone_public?: string | null
          postal_code?: string | null
          professional_type?: Database["public"]["Enums"]["app_role"]
          province?: string | null
          region?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["profile_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_area?: string | null
          service_radius_km?: number | null
          show_address?: boolean
          slug?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
          website?: string | null
          work_modes?: Database["public"]["Enums"]["work_mode"][]
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          duration_text: string | null
          id: string
          name: string
          position: number
          price_cents: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          profile_id: string
          updated_at: string
          vehicle_types: string | null
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          duration_text?: string | null
          id?: string
          name: string
          position?: number
          price_cents?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          profile_id: string
          updated_at?: string
          vehicle_types?: string | null
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          duration_text?: string | null
          id?: string
          name?: string
          position?: number
          price_cents?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          profile_id?: string
          updated_at?: string
          vehicle_types?: string | null
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "professional_services_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_path: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          locale: string
          marketing_consent: boolean
          marketing_consent_at: string | null
          phone: string | null
          postal_code: string | null
          status_reason: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          locale?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          phone?: string | null
          postal_code?: string | null
          status_reason?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          phone?: string | null
          postal_code?: string | null
          status_reason?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotional_coupons: {
        Row: {
          active: boolean
          assigned_user_id: string | null
          categories: string[]
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_amount_cents: number | null
          offer_id: string | null
          per_user_limit: number
          profile_id: string
          reward_redemption_id: string | null
          uses_count: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean
          assigned_user_id?: string | null
          categories?: string[]
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_amount_cents?: number | null
          offer_id?: string | null
          per_user_limit?: number
          profile_id: string
          reward_redemption_id?: string | null
          uses_count?: number
          valid_from?: string
          valid_until: string
        }
        Update: {
          active?: boolean
          assigned_user_id?: string | null
          categories?: string[]
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_amount_cents?: number | null
          offer_id?: string | null
          per_user_limit?: number
          profile_id?: string
          reward_redemption_id?: string | null
          uses_count?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotional_coupons_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_coupons_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_coupons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_coupons_redemption_fk"
            columns: ["reward_redemption_id"]
            isOneToOne: false
            referencedRelation: "reward_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_offers: {
        Row: {
          category: string
          city: string | null
          click_count: number
          conditions: string
          created_at: string
          description: string
          discount_pct: number | null
          ends_on: string
          id: string
          image_path: string | null
          neo_dedicated: boolean
          neo_topic: string | null
          original_price_cents: number
          owner_id: string
          profile_id: string
          promo_price_cents: number
          quantity_claimed: number
          quantity_total: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          starts_on: string
          status: string
          status_note: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category: string
          city?: string | null
          click_count?: number
          conditions: string
          created_at?: string
          description: string
          discount_pct?: number | null
          ends_on: string
          id?: string
          image_path?: string | null
          neo_dedicated?: boolean
          neo_topic?: string | null
          original_price_cents: number
          owner_id?: string
          profile_id: string
          promo_price_cents: number
          quantity_claimed?: number
          quantity_total?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          starts_on: string
          status?: string
          status_note?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string
          city?: string | null
          click_count?: number
          conditions?: string
          created_at?: string
          description?: string
          discount_pct?: number | null
          ends_on?: string
          id?: string
          image_path?: string | null
          neo_dedicated?: boolean
          neo_topic?: string | null
          original_price_cents?: number
          owner_id?: string
          profile_id?: string
          promo_price_cents?: number
          quantity_claimed?: number
          quantity_total?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          starts_on?: string
          status?: string
          status_note?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotional_offers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_offers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_offers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount_cents: number
          availability_text: string | null
          conditions: string | null
          created_at: string
          decided_at: string | null
          decision_note: string | null
          description: string
          duration_text: string | null
          extra_costs_cents: number | null
          id: string
          is_indicative: boolean
          labor_cents: number | null
          materials: string | null
          parts_cents: number | null
          request_id: string
          requires_inspection: boolean
          sender_id: string
          status: Database["public"]["Enums"]["quote_status"]
          valid_until: string | null
        }
        Insert: {
          amount_cents: number
          availability_text?: string | null
          conditions?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          description: string
          duration_text?: string | null
          extra_costs_cents?: number | null
          id?: string
          is_indicative?: boolean
          labor_cents?: number | null
          materials?: string | null
          parts_cents?: number | null
          request_id: string
          requires_inspection?: boolean
          sender_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          valid_until?: string | null
        }
        Update: {
          amount_cents?: number
          availability_text?: string | null
          conditions?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          description?: string
          duration_text?: string | null
          extra_costs_cents?: number | null
          id?: string
          is_indicative?: boolean
          labor_cents?: number | null
          materials?: string | null
          parts_cents?: number | null
          request_id?: string
          requires_inspection?: boolean
          sender_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          program: string
          qualified_at: string | null
          referred_id: string
          referrer_id: string
          review_note: string | null
          reviewed_by: string | null
          rewarded_at: string | null
          signals: string[]
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          program: string
          qualified_at?: string | null
          referred_id: string
          referrer_id: string
          review_note?: string | null
          reviewed_by?: string | null
          rewarded_at?: string | null
          signals?: string[]
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          program?: string
          qualified_at?: string | null
          referred_id?: string
          referrer_id?: string
          review_note?: string | null
          reviewed_by?: string | null
          rewarded_at?: string | null
          signals?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_requests: {
        Row: {
          accepted_quote_id: string | null
          availability_text: string | null
          category: string
          city: string
          created_at: string
          description: string
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          latitude: number | null
          longitude: number | null
          mileage_km: number | null
          owner_id: string
          postal_code: string | null
          preferred_date: string | null
          preferred_slot: Database["public"]["Enums"]["time_slot"]
          status: string
          updated_at: string
          user_vehicle_id: string | null
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number | null
        }
        Insert: {
          accepted_quote_id?: string | null
          availability_text?: string | null
          category: string
          city: string
          created_at?: string
          description: string
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mileage_km?: number | null
          owner_id?: string
          postal_code?: string | null
          preferred_date?: string | null
          preferred_slot?: Database["public"]["Enums"]["time_slot"]
          status?: string
          updated_at?: string
          user_vehicle_id?: string | null
          vehicle_make: string
          vehicle_model: string
          vehicle_year?: number | null
        }
        Update: {
          accepted_quote_id?: string | null
          availability_text?: string | null
          category?: string
          city?: string
          created_at?: string
          description?: string
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mileage_km?: number | null
          owner_id?: string
          postal_code?: string | null
          preferred_date?: string | null
          preferred_slot?: Database["public"]["Enums"]["time_slot"]
          status?: string
          updated_at?: string
          user_vehicle_id?: string | null
          vehicle_make?: string
          vehicle_model?: string
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_accepted_quote_id_fkey"
            columns: ["accepted_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          event: string
          id: number
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          event: string
          id?: never
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          event?: string
          id?: never
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          completed_at: string | null
          contact_preference: string
          conversation_id: string | null
          created_at: string
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          kind: Database["public"]["Enums"]["request_kind"]
          listing_id: string | null
          location_text: string | null
          message: string
          mileage_km: number | null
          part_code: string | null
          part_id: string | null
          part_inquiry_type: string | null
          preferred_date: string | null
          preferred_slot: Database["public"]["Enums"]["time_slot"] | null
          problem_category: string | null
          problem_started: string | null
          professional_profile_id: string | null
          recipient_id: string | null
          repair_request_id: string | null
          requester_id: string
          service_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          status_reason: string | null
          subject: string
          updated_at: string
          user_vehicle_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        Insert: {
          completed_at?: string | null
          contact_preference?: string
          conversation_id?: string | null
          created_at?: string
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          kind: Database["public"]["Enums"]["request_kind"]
          listing_id?: string | null
          location_text?: string | null
          message: string
          mileage_km?: number | null
          part_code?: string | null
          part_id?: string | null
          part_inquiry_type?: string | null
          preferred_date?: string | null
          preferred_slot?: Database["public"]["Enums"]["time_slot"] | null
          problem_category?: string | null
          problem_started?: string | null
          professional_profile_id?: string | null
          recipient_id?: string | null
          repair_request_id?: string | null
          requester_id: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          status_reason?: string | null
          subject: string
          updated_at?: string
          user_vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Update: {
          completed_at?: string | null
          contact_preference?: string
          conversation_id?: string | null
          created_at?: string
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          listing_id?: string | null
          location_text?: string | null
          message?: string
          mileage_km?: number | null
          part_code?: string | null
          part_id?: string | null
          part_inquiry_type?: string | null
          preferred_date?: string | null
          preferred_slot?: Database["public"]["Enums"]["time_slot"] | null
          problem_category?: string | null
          problem_started?: string | null
          professional_profile_id?: string | null
          recipient_id?: string | null
          repair_request_id?: string | null
          requester_id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          status_reason?: string | null
          subject?: string
          updated_at?: string
          user_vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_part_fk"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_part_fk"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_user_vehicle_fk"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_history: {
        Row: {
          changed_by: string | null
          created_at: string
          field: string
          id: number
          new_value: string | null
          note: string | null
          old_value: string | null
          review_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field: string
          id?: never
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          review_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field?: string
          id?: never
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_history_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_verifications: {
        Row: {
          basis: string
          created_at: string
          customer_confirmed_at: string | null
          id: string
          request_id: string
          seller_confirmed_at: string | null
          verified_at: string | null
        }
        Insert: {
          basis: string
          created_at?: string
          customer_confirmed_at?: string | null
          id?: string
          request_id: string
          seller_confirmed_at?: string | null
          verified_at?: string | null
        }
        Update: {
          basis?: string
          created_at?: string
          customer_confirmed_at?: string | null
          id?: string
          request_id?: string
          seller_confirmed_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_verifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          accuracy_rating: number | null
          author_id: string
          comment: string
          communication_rating: number | null
          created_at: string
          experience_date: string | null
          id: string
          moderation_note: string | null
          professionalism_rating: number | null
          profile_id: string
          quality_rating: number | null
          rating: number
          reliability_rating: number | null
          reply: string | null
          reply_at: string | null
          request_id: string
          review_kind: string
          service_label: string | null
          status: string
          suspicious_reason: string | null
          title: string | null
          updated_at: string
          value_rating: number | null
          verification_id: string | null
        }
        Insert: {
          accuracy_rating?: number | null
          author_id: string
          comment: string
          communication_rating?: number | null
          created_at?: string
          experience_date?: string | null
          id?: string
          moderation_note?: string | null
          professionalism_rating?: number | null
          profile_id: string
          quality_rating?: number | null
          rating: number
          reliability_rating?: number | null
          reply?: string | null
          reply_at?: string | null
          request_id: string
          review_kind?: string
          service_label?: string | null
          status?: string
          suspicious_reason?: string | null
          title?: string | null
          updated_at?: string
          value_rating?: number | null
          verification_id?: string | null
        }
        Update: {
          accuracy_rating?: number | null
          author_id?: string
          comment?: string
          communication_rating?: number | null
          created_at?: string
          experience_date?: string | null
          id?: string
          moderation_note?: string | null
          professionalism_rating?: number | null
          profile_id?: string
          quality_rating?: number | null
          rating?: number
          reliability_rating?: number | null
          reply?: string | null
          reply_at?: string | null
          request_id?: string
          review_kind?: string
          service_label?: string | null
          status?: string
          suspicious_reason?: string | null
          title?: string | null
          updated_at?: string
          value_rating?: number | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "review_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_items: {
        Row: {
          benefit_type: string
          benefit_value: number | null
          category: string
          conditions: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_path: string | null
          min_amount_cents: number | null
          min_tier: string | null
          per_user_limit: number
          points_cost: number
          profile_id: string
          published_at: string | null
          quantity_left: number | null
          quantity_total: number | null
          review_note: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          valid_until: string
          voucher_days: number
        }
        Insert: {
          benefit_type: string
          benefit_value?: number | null
          category: string
          conditions: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          image_path?: string | null
          min_amount_cents?: number | null
          min_tier?: string | null
          per_user_limit?: number
          points_cost: number
          profile_id: string
          published_at?: string | null
          quantity_left?: number | null
          quantity_total?: number | null
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          valid_until: string
          voucher_days?: number
        }
        Update: {
          benefit_type?: string
          benefit_value?: number | null
          category?: string
          conditions?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          min_amount_cents?: number | null
          min_tier?: string | null
          per_user_limit?: number
          points_cost?: number
          profile_id?: string
          published_at?: string | null
          quantity_left?: number | null
          quantity_total?: number | null
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          valid_until?: string
          voucher_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_items_min_tier_fkey"
            columns: ["min_tier"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reward_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          cancel_reason: string | null
          code: string
          coupon_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          item_id: string
          points_spent: number
          profile_id: string
          status: string
          used_at: string | null
          used_by: string | null
          user_id: string
          valid_until: string
        }
        Insert: {
          cancel_reason?: string | null
          code: string
          coupon_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          item_id: string
          points_spent: number
          profile_id: string
          status?: string
          used_at?: string | null
          used_by?: string | null
          user_id: string
          valid_until: string
        }
        Update: {
          cancel_reason?: string | null
          code?: string
          coupon_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          item_id?: string
          points_spent?: number
          profile_id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "promotional_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_rules: {
        Row: {
          active: boolean
          campaign_id: string | null
          description: string
          key: string
          label: string
          max_per_user: number | null
          points: number
          tier_bonus: boolean
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          campaign_id?: string | null
          description: string
          key: string
          label: string
          max_per_user?: number | null
          points: number
          tier_bonus?: boolean
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          campaign_id?: string | null
          description?: string
          key?: string
          label?: string
          max_per_user?: number | null
          points?: number
          tier_bonus?: boolean
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          benefits: string[]
          bonus_pct: number
          code: string
          min_points: number
          name: string
          sort: number
        }
        Insert: {
          benefits?: string[]
          bonus_pct?: number
          code: string
          min_points: number
          name: string
          sort: number
        }
        Update: {
          benefits?: string[]
          bonus_pct?: number
          code?: string
          min_points?: number
          name?: string
          sort?: number
        }
        Relationships: []
      }
      rewards_wallets: {
        Row: {
          tier_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          tier_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          tier_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_wallets_tier_code_fkey"
            columns: ["tier_code"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rewards_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          note: string | null
          request_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          request_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "roadside_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_live_locations: {
        Row: {
          accuracy_m: number | null
          latitude: number
          longitude: number
          request_id: string
          updated_at: string
        }
        Insert: {
          accuracy_m?: number | null
          latitude: number
          longitude: number
          request_id: string
          updated_at?: string
        }
        Update: {
          accuracy_m?: number | null
          latitude?: number
          longitude?: number
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_live_locations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "roadside_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_operators: {
        Row: {
          admin_note: string | null
          available_until: string | null
          created_at: string
          h24: boolean
          hours_text: string | null
          price_notes: string | null
          profile_id: string
          services: string[]
          status: string
          updated_at: string
          vehicle_types: string[]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_note?: string | null
          available_until?: string | null
          created_at?: string
          h24?: boolean
          hours_text?: string | null
          price_notes?: string | null
          profile_id: string
          services: string[]
          status?: string
          updated_at?: string
          vehicle_types?: string[]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_note?: string | null
          available_until?: string | null
          created_at?: string
          h24?: boolean
          hours_text?: string | null
          price_notes?: string | null
          profile_id?: string
          services?: string[]
          status?: string
          updated_at?: string
          vehicle_types?: string[]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadside_operators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_operators_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_quotes: {
        Row: {
          amount_cents: number
          created_at: string
          eta_minutes: number
          id: string
          includes: string
          notes: string | null
          profile_id: string
          request_id: string
          status: string
          valid_until: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          eta_minutes: number
          id?: string
          includes: string
          notes?: string | null
          profile_id: string
          request_id: string
          status?: string
          valid_until: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          eta_minutes?: number
          id?: string
          includes?: string
          notes?: string | null
          profile_id?: string
          request_id?: string
          status?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_quotes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "roadside_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_request_locations: {
        Row: {
          address_text: string | null
          consent_at: string
          contact_phone: string
          latitude: number | null
          longitude: number | null
          plate: string | null
          request_id: string
        }
        Insert: {
          address_text?: string | null
          consent_at?: string
          contact_phone: string
          latitude?: number | null
          longitude?: number | null
          plate?: string | null
          request_id: string
        }
        Update: {
          address_text?: string | null
          consent_at?: string
          contact_phone?: string
          latitude?: number | null
          longitude?: number | null
          plate?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_request_locations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "roadside_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_requests: {
        Row: {
          accepted_quote_id: string | null
          approx_lat: number | null
          approx_lng: number | null
          area_text: string
          cancel_reason: string | null
          completed_at: string | null
          created_at: string
          description: string
          destination_profile_id: string | null
          destination_text: string | null
          id: string
          location_type: string
          operator_profile_id: string | null
          people_safe: boolean
          photo_paths: string[]
          repair_request_id: string | null
          service: string
          status: string
          updated_at: string
          user_id: string
          user_vehicle_id: string | null
          vehicle_desc: string
          vehicle_drivable: boolean
          vehicle_type: string
        }
        Insert: {
          accepted_quote_id?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          area_text: string
          cancel_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          destination_profile_id?: string | null
          destination_text?: string | null
          id?: string
          location_type: string
          operator_profile_id?: string | null
          people_safe: boolean
          photo_paths?: string[]
          repair_request_id?: string | null
          service: string
          status?: string
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_desc: string
          vehicle_drivable?: boolean
          vehicle_type?: string
        }
        Update: {
          accepted_quote_id?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          area_text?: string
          cancel_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          destination_profile_id?: string | null
          destination_text?: string | null
          id?: string
          location_type?: string
          operator_profile_id?: string | null
          people_safe?: boolean
          photo_paths?: string[]
          repair_request_id?: string | null
          service?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_desc?: string
          vehicle_drivable?: boolean
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_requests_destination_profile_id_fkey"
            columns: ["destination_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_requests_operator_profile_id_fkey"
            columns: ["operator_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_requests_quote_fk"
            columns: ["accepted_quote_id"]
            isOneToOne: false
            referencedRelation: "roadside_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_requests_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_requests_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_targets: {
        Row: {
          conversation_id: string | null
          created_at: string
          distance_km: number | null
          profile_id: string
          request_id: string
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          distance_km?: number | null
          profile_id: string
          request_id: string
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          distance_km?: number | null
          profile_id?: string
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_targets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_targets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_targets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "roadside_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      seller_authorizations: {
        Row: {
          authorized_by_name: string
          authorized_on: string
          availability_confirmed: boolean
          contact_id: string | null
          created_at: string
          created_by: string | null
          document_path: string | null
          id: string
          listing_authorized: boolean
          listing_id: string
          method: string
          photos_authorized: boolean
          price_confirmed: boolean
          revoked_at: string | null
          scope: string
        }
        Insert: {
          authorized_by_name: string
          authorized_on: string
          availability_confirmed?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          document_path?: string | null
          id?: string
          listing_authorized?: boolean
          listing_id: string
          method: string
          photos_authorized?: boolean
          price_confirmed?: boolean
          revoked_at?: string | null
          scope: string
        }
        Update: {
          authorized_by_name?: string
          authorized_on?: string
          availability_confirmed?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          document_path?: string | null
          id?: string
          listing_authorized?: boolean
          listing_id?: string
          method?: string
          photos_authorized?: boolean
          price_confirmed?: boolean
          revoked_at?: string | null
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_authorizations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "field_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_authorizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_authorizations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_authorizations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_overrides: {
        Row: {
          canonical: string | null
          description: string | null
          noindex: boolean
          note: string | null
          path: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical?: string | null
          description?: string | null
          noindex?: boolean
          note?: string | null
          path: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical?: string | null
          description?: string | null
          noindex?: boolean
          note?: string | null
          path?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_redirects: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          from_path: string
          id: string
          note: string | null
          status_code: number
          to_path: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_path: string
          id?: string
          note?: string | null
          status_code?: number
          to_path: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_path?: string
          id?: string
          note?: string | null
          status_code?: number
          to_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_redirects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          draft: Json | null
          key: string
          label: string
          published: Json | null
          published_at: string | null
          published_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          draft?: Json | null
          key: string
          label: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          draft?: Json | null
          key?: string
          label?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_content_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content_history: {
        Row: {
          action: string
          actor_id: string | null
          content: Json | null
          created_at: string
          id: number
          key: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          content?: Json | null
          created_at?: string
          id?: never
          key: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          content?: Json | null
          created_at?: string
          id?: never
          key?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_content_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_content_history_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "site_content"
            referencedColumns: ["key"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          audience: string
          code: string
          created_at: string
          features: Json
          id: string
          name: string
          price_note: string | null
        }
        Insert: {
          active?: boolean
          audience: string
          code: string
          created_at?: string
          features?: Json
          id?: string
          name: string
          price_note?: string | null
        }
        Update: {
          active?: boolean
          audience?: string
          code?: string
          created_at?: string
          features?: Json
          id?: string
          name?: string
          price_note?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          conversation_id: string | null
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_in_proposals: {
        Row: {
          buyer_id: string
          conversation_id: string | null
          counter_value_cents: number | null
          created_at: string
          difference_cents: number | null
          id: string
          listing_id: string
          listing_price_cents: number
          message: string | null
          proposed_value_cents: number
          seller_id: string
          status: string
          updated_at: string
          valuation_id: string
        }
        Insert: {
          buyer_id: string
          conversation_id?: string | null
          counter_value_cents?: number | null
          created_at?: string
          difference_cents?: number | null
          id?: string
          listing_id: string
          listing_price_cents: number
          message?: string | null
          proposed_value_cents: number
          seller_id: string
          status?: string
          updated_at?: string
          valuation_id: string
        }
        Update: {
          buyer_id?: string
          conversation_id?: string | null
          counter_value_cents?: number | null
          created_at?: string
          difference_cents?: number | null
          id?: string
          listing_id?: string
          listing_price_cents?: number
          message?: string | null
          proposed_value_cents?: number
          seller_id?: string
          status?: string
          updated_at?: string
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_in_proposals_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_proposals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_proposals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_proposals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_proposals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_proposals_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "vehicle_valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          note: string | null
          request_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          request_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_operators: {
        Row: {
          admin_note: string | null
          created_at: string
          insurance_declared: boolean
          insurance_notes: string | null
          max_distance_km: number | null
          price_notes: string | null
          profile_id: string
          regions: string[]
          services: string[]
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          insurance_declared?: boolean
          insurance_notes?: string | null
          max_distance_km?: number | null
          price_notes?: string | null
          profile_id: string
          regions: string[]
          services: string[]
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          insurance_declared?: boolean
          insurance_notes?: string | null
          max_distance_km?: number | null
          price_notes?: string | null
          profile_id?: string
          regions?: string[]
          services?: string[]
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_operators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_operators_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_quotes: {
        Row: {
          amount_cents: number
          conversation_id: string | null
          created_at: string
          delivery_date: string
          id: string
          includes_insurance: boolean
          notes: string | null
          pickup_date: string
          profile_id: string
          request_id: string
          status: string
          valid_until: string
        }
        Insert: {
          amount_cents: number
          conversation_id?: string | null
          created_at?: string
          delivery_date: string
          id?: string
          includes_insurance?: boolean
          notes?: string | null
          pickup_date: string
          profile_id: string
          request_id: string
          status?: string
          valid_until: string
        }
        Update: {
          amount_cents?: number
          conversation_id?: string | null
          created_at?: string
          delivery_date?: string
          id?: string
          includes_insurance?: boolean
          notes?: string | null
          pickup_date?: string
          profile_id?: string
          request_id?: string
          status?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_quotes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_quotes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_reports: {
        Row: {
          accessories: string | null
          counterpart_name: string | null
          created_at: string
          created_by: string | null
          damages: string | null
          fuel_level: string | null
          id: string
          kind: string
          notes: string | null
          odometer_km: number | null
          photo_paths: string[]
          request_id: string
        }
        Insert: {
          accessories?: string | null
          counterpart_name?: string | null
          created_at?: string
          created_by?: string | null
          damages?: string | null
          fuel_level?: string | null
          id?: string
          kind: string
          notes?: string | null
          odometer_km?: number | null
          photo_paths?: string[]
          request_id: string
        }
        Update: {
          accessories?: string | null
          counterpart_name?: string | null
          created_at?: string
          created_by?: string | null
          damages?: string | null
          fuel_level?: string | null
          id?: string
          kind?: string
          notes?: string | null
          odometer_km?: number | null
          photo_paths?: string[]
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_request_addresses: {
        Row: {
          contact_name: string
          contact_phone: string
          delivery_address: string
          pickup_address: string
          request_id: string
        }
        Insert: {
          contact_name: string
          contact_phone: string
          delivery_address: string
          pickup_address: string
          request_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          delivery_address?: string
          pickup_address?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_request_addresses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_requests: {
        Row: {
          accepted_quote_id: string | null
          cancel_reason: string | null
          completed_at: string | null
          created_at: string
          date_from: string
          date_to: string
          delivery_city: string
          delivery_postal_code: string | null
          delivery_region: string
          id: string
          listing_id: string | null
          notes: string | null
          operator_profile_id: string | null
          photo_paths: string[]
          pickup_city: string
          pickup_postal_code: string | null
          pickup_region: string
          service: string
          status: string
          updated_at: string
          urgency: string
          user_id: string
          user_vehicle_id: string | null
          vehicle_category: string
          vehicle_condition: string | null
          vehicle_desc: string
          vehicle_drivable: boolean
        }
        Insert: {
          accepted_quote_id?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          created_at?: string
          date_from: string
          date_to: string
          delivery_city: string
          delivery_postal_code?: string | null
          delivery_region: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          operator_profile_id?: string | null
          photo_paths?: string[]
          pickup_city: string
          pickup_postal_code?: string | null
          pickup_region: string
          service: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_category?: string
          vehicle_condition?: string | null
          vehicle_desc: string
          vehicle_drivable?: boolean
        }
        Update: {
          accepted_quote_id?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          delivery_city?: string
          delivery_postal_code?: string | null
          delivery_region?: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          operator_profile_id?: string | null
          photo_paths?: string[]
          pickup_city?: string
          pickup_postal_code?: string | null
          pickup_region?: string
          service?: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          user_vehicle_id?: string | null
          vehicle_category?: string
          vehicle_condition?: string | null
          vehicle_desc?: string
          vehicle_drivable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_operator_profile_id_fkey"
            columns: ["operator_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_quote_fk"
            columns: ["accepted_quote_id"]
            isOneToOne: false
            referencedRelation: "transport_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_acquisition: {
        Row: {
          created_at: string
          landing: string | null
          referral_code: string | null
          requested_role: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          landing?: string | null
          referral_code?: string | null
          requested_role?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          landing?: string | null
          referral_code?: string | null
          requested_role?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_acquisition_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vehicle_documents: {
        Row: {
          category: string
          created_at: string
          document_date: string | null
          id: string
          mime_type: string
          owner_id: string
          record_id: string | null
          size_bytes: number
          storage_path: string
          title: string
          user_vehicle_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          document_date?: string | null
          id?: string
          mime_type: string
          owner_id: string
          record_id?: string | null
          size_bytes: number
          storage_path: string
          title: string
          user_vehicle_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          document_date?: string | null
          id?: string
          mime_type?: string
          owner_id?: string
          record_id?: string | null
          size_bytes?: number
          storage_path?: string
          title?: string
          user_vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vehicle_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vehicle_documents_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vehicle_documents_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vehicles: {
        Row: {
          created_at: string
          current_mileage_km: number | null
          deleted_at: string | null
          engine_cc: number | null
          engine_code: string | null
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          inspection_category: string
          is_primary: boolean
          make: string
          make_slug: string | null
          model: string
          owner_id: string
          photo_path: string | null
          plate: string | null
          power_kw: number | null
          purchase_date: string | null
          registration_date: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          usage_type: string
          version: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          current_mileage_km?: number | null
          deleted_at?: string | null
          engine_cc?: number | null
          engine_code?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          inspection_category?: string
          is_primary?: boolean
          make: string
          make_slug?: string | null
          model: string
          owner_id: string
          photo_path?: string | null
          plate?: string | null
          power_kw?: number | null
          purchase_date?: string | null
          registration_date?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          usage_type?: string
          version?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          current_mileage_km?: number | null
          deleted_at?: string | null
          engine_cc?: number | null
          engine_code?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          inspection_category?: string
          is_primary?: boolean
          make?: string
          make_slug?: string | null
          model?: string
          owner_id?: string
          photo_path?: string | null
          plate?: string | null
          power_kw?: number | null
          purchase_date?: string | null
          registration_date?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          usage_type?: string
          version?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_offers: {
        Row: {
          amount_cents: number
          conditions: string | null
          created_at: string
          created_by: string | null
          from_side: string
          id: string
          kind: string
          parent_id: string | null
          profile_id: string
          request_id: string
          requires_inspection: boolean
          status: string
          valid_until: string
        }
        Insert: {
          amount_cents: number
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          from_side: string
          id?: string
          kind: string
          parent_id?: string | null
          profile_id: string
          request_id: string
          requires_inspection?: boolean
          status?: string
          valid_until: string
        }
        Update: {
          amount_cents?: number
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          from_side?: string
          id?: string
          kind?: string
          parent_id?: string | null
          profile_id?: string
          request_id?: string
          requires_inspection?: boolean
          status?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuation_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_offers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "valuation_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_offers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "valuation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_request_targets: {
        Row: {
          conversation_id: string | null
          created_at: string
          decline_reason: string | null
          profile_id: string
          request_id: string
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          decline_reason?: string | null
          profile_id: string
          request_id: string
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          decline_reason?: string | null
          profile_id?: string
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuation_request_targets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_request_targets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_request_targets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "valuation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_requests: {
        Row: {
          consent_at: string
          created_at: string
          id: string
          intent: string
          message: string | null
          share_estimate: boolean
          shared_photos: string[]
          status: string
          user_id: string
          valuation_id: string
        }
        Insert: {
          consent_at?: string
          created_at?: string
          id?: string
          intent?: string
          message?: string | null
          share_estimate?: boolean
          shared_photos?: string[]
          status?: string
          user_id: string
          valuation_id: string
        }
        Update: {
          consent_at?: string
          created_at?: string
          id?: string
          intent?: string
          message?: string | null
          share_estimate?: boolean
          shared_photos?: string[]
          status?: string
          user_id?: string
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_requests_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "vehicle_valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_booking_events: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          data: Json
          event: string
          id: number
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          data?: Json
          event: string
          id?: never
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          data?: Json
          event?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_booking_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "vehicle_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_bookings: {
        Row: {
          alt_starts_at: string | null
          buyer_id: string
          conditions_accepted: boolean
          contact_phone: string | null
          created_at: string
          decision_note: string | null
          driving_years: number | null
          ends_at: string
          id: string
          kind: string
          license_confirmed: boolean
          listing_id: string
          message: string | null
          proposed_starts_at: string | null
          reminded_24h: boolean
          reminded_2h: boolean
          request_id: string | null
          seller_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          alt_starts_at?: string | null
          buyer_id: string
          conditions_accepted?: boolean
          contact_phone?: string | null
          created_at?: string
          decision_note?: string | null
          driving_years?: number | null
          ends_at: string
          id?: string
          kind: string
          license_confirmed?: boolean
          listing_id: string
          message?: string | null
          proposed_starts_at?: string | null
          reminded_24h?: boolean
          reminded_2h?: boolean
          request_id?: string | null
          seller_id: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          alt_starts_at?: string | null
          buyer_id?: string
          conditions_accepted?: boolean
          contact_phone?: string | null
          created_at?: string
          decision_note?: string | null
          driving_years?: number | null
          ends_at?: string
          id?: string
          kind?: string
          license_confirmed?: boolean
          listing_id?: string
          message?: string | null
          proposed_starts_at?: string | null
          reminded_24h?: boolean
          reminded_2h?: boolean
          request_id?: string | null
          seller_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_bookings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_compatibility_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          details: Json
          id: number
          result: Database["public"]["Enums"]["neo_result"]
          rule_version_id: string
          vehicle_id: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          details: Json
          id?: never
          result: Database["public"]["Enums"]["neo_result"]
          rule_version_id: string
          vehicle_id: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          details?: Json
          id?: never
          result?: Database["public"]["Enums"]["neo_result"]
          rule_version_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_compatibility_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_compatibility_checks_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "legal_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_compatibility_checks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_expenses: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          id: string
          owner_id: string
          record_id: string | null
          spent_on: string
          user_vehicle_id: string
        }
        Insert: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          record_id?: string | null
          spent_on: string
          user_vehicle_id: string
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          record_id?: string | null
          spent_on?: string
          user_vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_expenses_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_expenses_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_images: {
        Row: {
          created_at: string
          height: number | null
          id: string
          is_cover: boolean
          listing_id: string
          position: number
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          listing_id: string
          position?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          listing_id?: string
          position?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          created_at: string
          created_by: string | null
          garage_profile_id: string | null
          id: string
          inspected_on: string
          inspector_name: string
          inspector_profile_id: string | null
          listing_id: string
          mileage_km: number | null
          mileage_source: string
          observations: string | null
          published_at: string | null
          published_by: string | null
          recommendations: string | null
          recommended_repairs: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          garage_profile_id?: string | null
          id?: string
          inspected_on: string
          inspector_name: string
          inspector_profile_id?: string | null
          listing_id: string
          mileage_km?: number | null
          mileage_source?: string
          observations?: string | null
          published_at?: string | null
          published_by?: string | null
          recommendations?: string | null
          recommended_repairs?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          garage_profile_id?: string | null
          id?: string
          inspected_on?: string
          inspector_name?: string
          inspector_profile_id?: string | null
          listing_id?: string
          mileage_km?: number | null
          mileage_source?: string
          observations?: string | null
          published_at?: string | null
          published_by?: string | null
          recommendations?: string | null
          recommended_repairs?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_garage_profile_id_fkey"
            columns: ["garage_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_inspector_profile_id_fkey"
            columns: ["inspector_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_listing_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["listing_status"] | null
          id: number
          listing_id: string
          note: string | null
          to_status: Database["public"]["Enums"]["listing_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["listing_status"] | null
          id?: never
          listing_id: string
          note?: string | null
          to_status: Database["public"]["Enums"]["listing_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["listing_status"] | null
          id?: never
          listing_id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["listing_status"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_listing_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listing_status_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listing_status_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_listings: {
        Row: {
          accepted_terms_at: string | null
          admin_suspended: boolean
          approved_at: string | null
          approved_by: string | null
          city: string | null
          condition_notes: string | null
          created_at: string
          currency: string
          declared_accuracy_at: string | null
          declared_availability_at: string | null
          declared_photo_rights_at: string | null
          declared_right_to_publish_at: string | null
          description: string | null
          expires_at: string | null
          extra_info: string | null
          field_contact_id: string | null
          id: string
          interventions_notes: string | null
          known_defects: string | null
          latitude: number | null
          longitude: number | null
          maintenance_notes: string | null
          negotiable: boolean
          neo_checked_at: string | null
          neo_result: Database["public"]["Enums"]["neo_result"] | null
          neo_rule_version_id: string | null
          owner_id: string
          owner_suspended: boolean
          postal_code: string | null
          price_cents: number | null
          professional_profile_id: string | null
          province: string | null
          published_at: string | null
          region: string | null
          seller_kind: Database["public"]["Enums"]["seller_kind"]
          slug: string
          sold_at: string | null
          source: string
          status: Database["public"]["Enums"]["listing_status"]
          status_note: string | null
          title: string
          updated_at: string
          vehicle_id: string
          view_count: number
        }
        Insert: {
          accepted_terms_at?: string | null
          admin_suspended?: boolean
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          condition_notes?: string | null
          created_at?: string
          currency?: string
          declared_accuracy_at?: string | null
          declared_availability_at?: string | null
          declared_photo_rights_at?: string | null
          declared_right_to_publish_at?: string | null
          description?: string | null
          expires_at?: string | null
          extra_info?: string | null
          field_contact_id?: string | null
          id?: string
          interventions_notes?: string | null
          known_defects?: string | null
          latitude?: number | null
          longitude?: number | null
          maintenance_notes?: string | null
          negotiable?: boolean
          neo_checked_at?: string | null
          neo_result?: Database["public"]["Enums"]["neo_result"] | null
          neo_rule_version_id?: string | null
          owner_id: string
          owner_suspended?: boolean
          postal_code?: string | null
          price_cents?: number | null
          professional_profile_id?: string | null
          province?: string | null
          published_at?: string | null
          region?: string | null
          seller_kind?: Database["public"]["Enums"]["seller_kind"]
          slug: string
          sold_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["listing_status"]
          status_note?: string | null
          title: string
          updated_at?: string
          vehicle_id: string
          view_count?: number
        }
        Update: {
          accepted_terms_at?: string | null
          admin_suspended?: boolean
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          condition_notes?: string | null
          created_at?: string
          currency?: string
          declared_accuracy_at?: string | null
          declared_availability_at?: string | null
          declared_photo_rights_at?: string | null
          declared_right_to_publish_at?: string | null
          description?: string | null
          expires_at?: string | null
          extra_info?: string | null
          field_contact_id?: string | null
          id?: string
          interventions_notes?: string | null
          known_defects?: string | null
          latitude?: number | null
          longitude?: number | null
          maintenance_notes?: string | null
          negotiable?: boolean
          neo_checked_at?: string | null
          neo_result?: Database["public"]["Enums"]["neo_result"] | null
          neo_rule_version_id?: string | null
          owner_id?: string
          owner_suspended?: boolean
          postal_code?: string | null
          price_cents?: number | null
          professional_profile_id?: string | null
          province?: string | null
          published_at?: string | null
          region?: string | null
          seller_kind?: Database["public"]["Enums"]["seller_kind"]
          slug?: string
          sold_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["listing_status"]
          status_note?: string | null
          title?: string
          updated_at?: string
          vehicle_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_listings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listings_field_contact_id_fkey"
            columns: ["field_contact_id"]
            isOneToOne: false
            referencedRelation: "field_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listings_neo_rule_version_id_fkey"
            columns: ["neo_rule_version_id"]
            isOneToOne: false
            referencedRelation: "legal_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listings_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_price_history: {
        Row: {
          changed_at: string
          id: number
          listing_id: string
          new_cents: number | null
          old_cents: number | null
        }
        Insert: {
          changed_at?: string
          id?: never
          listing_id: string
          new_cents?: number | null
          old_cents?: number | null
        }
        Update: {
          changed_at?: string
          id?: never
          listing_id?: string
          new_cents?: number | null
          old_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_valuations: {
        Row: {
          accidents: string
          comparables_count: number | null
          condition: string
          created_at: string
          damage_notes: string | null
          engine_cc: number | null
          estimate_max_cents: number | null
          estimate_mid_cents: number | null
          estimate_min_cents: number | null
          estimated_at: string | null
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          inspection_status: string
          make: string
          method: string | null
          mileage_km: number
          missing_info: string[]
          model: string
          options: string[]
          owners_count: number | null
          photo_paths: string[]
          power_kw: number | null
          province: string
          region: string
          reliability: string | null
          settings_snapshot: Json | null
          status: string
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          user_id: string
          user_vehicle_id: string | null
          version: string | null
          year: number
        }
        Insert: {
          accidents?: string
          comparables_count?: number | null
          condition: string
          created_at?: string
          damage_notes?: string | null
          engine_cc?: number | null
          estimate_max_cents?: number | null
          estimate_mid_cents?: number | null
          estimate_min_cents?: number | null
          estimated_at?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          inspection_status?: string
          make: string
          method?: string | null
          mileage_km: number
          missing_info?: string[]
          model: string
          options?: string[]
          owners_count?: number | null
          photo_paths?: string[]
          power_kw?: number | null
          province: string
          region: string
          reliability?: string | null
          settings_snapshot?: Json | null
          status?: string
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          version?: string | null
          year: number
        }
        Update: {
          accidents?: string
          comparables_count?: number | null
          condition?: string
          created_at?: string
          damage_notes?: string | null
          engine_cc?: number | null
          estimate_max_cents?: number | null
          estimate_mid_cents?: number | null
          estimate_min_cents?: number | null
          estimated_at?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          inspection_status?: string
          make?: string
          method?: string | null
          mileage_km?: number
          missing_info?: string[]
          model?: string
          options?: string[]
          owners_count?: number | null
          photo_paths?: string[]
          power_kw?: number | null
          province?: string
          region?: string
          reliability?: string | null
          settings_snapshot?: Json | null
          status?: string
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          user_id?: string
          user_vehicle_id?: string | null
          version?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_valuations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_valuations_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_verifications: {
        Row: {
          evidence: string
          id: string
          kind: string
          listing_id: string
          revoke_reason: string | null
          revoked_at: string | null
          verified_at: string
          verified_by: string | null
        }
        Insert: {
          evidence: string
          id?: string
          kind: string
          listing_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          verified_at?: string
          verified_by?: string | null
        }
        Update: {
          evidence?: string
          id?: string
          kind?: string
          listing_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          verified_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_videos: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          mime_type: string
          position: number
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          mime_type: string
          position?: number
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          mime_type?: string
          position?: number
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_videos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_videos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          co2_g_km: number | null
          color: string | null
          condition: Database["public"]["Enums"]["vehicle_condition"]
          consumption_kwh100: number | null
          consumption_l100: number | null
          created_at: string
          doors: number | null
          emission_class: string | null
          engine_cc: number | null
          equipment: string[]
          first_registration_date: string | null
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          make_name: string
          make_slug: string
          mileage_km: number | null
          model: string
          owner_id: string
          owners_count: number | null
          power_kw: number | null
          power_to_tare_documented: number | null
          seats: number | null
          tare_kg: number | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          variant_code: string | null
          vehicle_category: string
          version: string | null
          year: number | null
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          co2_g_km?: number | null
          color?: string | null
          condition?: Database["public"]["Enums"]["vehicle_condition"]
          consumption_kwh100?: number | null
          consumption_l100?: number | null
          created_at?: string
          doors?: number | null
          emission_class?: string | null
          engine_cc?: number | null
          equipment?: string[]
          first_registration_date?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          make_name: string
          make_slug: string
          mileage_km?: number | null
          model: string
          owner_id: string
          owners_count?: number | null
          power_kw?: number | null
          power_to_tare_documented?: number | null
          seats?: number | null
          tare_kg?: number | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          variant_code?: string | null
          vehicle_category?: string
          version?: string | null
          year?: number | null
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          co2_g_km?: number | null
          color?: string | null
          condition?: Database["public"]["Enums"]["vehicle_condition"]
          consumption_kwh100?: number | null
          consumption_l100?: number | null
          created_at?: string
          doors?: number | null
          emission_class?: string | null
          engine_cc?: number | null
          equipment?: string[]
          first_registration_date?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          make_name?: string
          make_slug?: string
          mileage_km?: number | null
          model?: string
          owner_id?: string
          owners_count?: number | null
          power_kw?: number | null
          power_to_tare_documented?: number | null
          seats?: number | null
          tare_kg?: number | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          variant_code?: string | null
          vehicle_category?: string
          version?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          original_name: string
          owner_id: string
          request_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          original_name: string
          owner_id: string
          request_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          original_name?: string
          owner_id?: string
          request_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string
          decision_note: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
          user_notes: string | null
          verification_type: Database["public"]["Enums"]["verification_type"]
        }
        Insert: {
          created_at?: string
          decision_note?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
          user_notes?: string | null
          verification_type: Database["public"]["Enums"]["verification_type"]
        }
        Update: {
          created_at?: string
          decision_note?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
          user_notes?: string | null
          verification_type?: Database["public"]["Enums"]["verification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_reports: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["maintenance_category"]
          cost_cents: number | null
          created_at: string
          decided_at: string | null
          description: string
          id: string
          mileage_km: number | null
          owner_id: string
          owner_note: string | null
          parts_used: string | null
          performed_on: string
          professional_profile_id: string
          record_id: string | null
          request_id: string
          status: string
          title: string
          user_vehicle_id: string | null
        }
        Insert: {
          author_id: string
          category: Database["public"]["Enums"]["maintenance_category"]
          cost_cents?: number | null
          created_at?: string
          decided_at?: string | null
          description: string
          id?: string
          mileage_km?: number | null
          owner_id: string
          owner_note?: string | null
          parts_used?: string | null
          performed_on: string
          professional_profile_id: string
          record_id?: string | null
          request_id: string
          status?: string
          title: string
          user_vehicle_id?: string | null
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["maintenance_category"]
          cost_cents?: number | null
          created_at?: string
          decided_at?: string | null
          description?: string
          id?: string
          mileage_km?: number | null
          owner_id?: string
          owner_note?: string | null
          parts_used?: string | null
          performed_on?: string
          professional_profile_id?: string
          record_id?: string | null
          request_id?: string
          status?: string
          title?: string
          user_vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_user_vehicle_id_fkey"
            columns: ["user_vehicle_id"]
            isOneToOne: false
            referencedRelation: "user_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listing_search: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          city: string | null
          condition: Database["public"]["Enums"]["vehicle_condition"] | null
          consumption_l100: number | null
          cover_path: string | null
          created_at: string | null
          engine_cc: number | null
          first_registration_date: string | null
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string | null
          latitude: number | null
          longitude: number | null
          make_name: string | null
          make_slug: string | null
          mileage_km: number | null
          model: string | null
          negotiable: boolean | null
          neo_result: Database["public"]["Enums"]["neo_result"] | null
          postal_code: string | null
          power_kw: number | null
          power_to_tare_documented: number | null
          price_cents: number | null
          professional_profile_id: string | null
          province: string | null
          published_at: string | null
          region: string | null
          search_text: string | null
          seller_kind: Database["public"]["Enums"]["seller_kind"] | null
          seller_name: string | null
          slug: string | null
          sold_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          tare_kg: number | null
          title: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          version: string | null
          view_count: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_listings_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      part_search: {
        Row: {
          category_id: string | null
          category_name: string | null
          category_parent_id: string | null
          category_slug: string | null
          city: string | null
          condition: Database["public"]["Enums"]["part_condition"] | null
          cover_path: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          manufacturer_brand: string | null
          manufacturer_code: string | null
          manufacturer_code_norm: string | null
          oem_code: string | null
          oem_code_norm: string | null
          postal_code: string | null
          price_cents: number | null
          professional_profile_id: string | null
          province: string | null
          published_at: string | null
          quantity: number | null
          search_text: string | null
          seller_kind: Database["public"]["Enums"]["seller_kind"] | null
          seller_name: string | null
          slug: string | null
          status: Database["public"]["Enums"]["part_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_categories_parent_id_fkey"
            columns: ["category_parent_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_listings_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_business_invite: {
        Args: { member_id: string }
        Returns: undefined
      }
      accept_roadside_quote: { Args: { quote_id: string }; Returns: undefined }
      accept_transport_quote: { Args: { quote_id: string }; Returns: undefined }
      add_lead_note: {
        Args: {
          body: string
          profile_id: string
          source: string
          source_id: string
        }
        Returns: string
      }
      add_transport_report: {
        Args: {
          accessories?: string
          counterpart_name?: string
          damages?: string
          fuel_level?: string
          kind: string
          notes?: string
          odometer_km?: number
          photo_paths?: string[]
          request_id: string
        }
        Returns: string
      }
      admin_add_insurance_partner_user: {
        Args: { partner_id: string; user_email: string }
        Returns: undefined
      }
      admin_adjust_points: {
        Args: { amount: number; reason: string; user_id: string }
        Returns: undefined
      }
      admin_approve_marketing_message: {
        Args: { message_id: string }
        Returns: undefined
      }
      admin_archive_rule_version: {
        Args: { archive_reason: string; version_id: string }
        Returns: undefined
      }
      admin_assign_plan: {
        Args: { note?: string; plan_code: string; profile_id: string }
        Returns: undefined
      }
      admin_business_overview: { Args: never; Returns: Json }
      admin_cancel_booking: {
        Args: { booking_id: string; reason: string }
        Returns: undefined
      }
      admin_cancel_roadside: {
        Args: { reason: string; request_id: string }
        Returns: undefined
      }
      admin_cancel_transport: {
        Args: { reason: string; request_id: string }
        Returns: undefined
      }
      admin_clear_badge: {
        Args: {
          badge: Database["public"]["Enums"]["verification_type"]
          reason: string
          target_user: string
        }
        Returns: undefined
      }
      admin_content_list: {
        Args: never
        Returns: {
          draft: Json | null
          key: string
          label: string
          published: Json | null
          published_at: string | null
          published_by: string | null
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "site_content"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_dashboard_stats: { Args: { days?: number }; Returns: Json }
      admin_delete_listing: {
        Args: { listing_id: string; reason: string }
        Returns: undefined
      }
      admin_edit_listing: {
        Args: {
          listing_id: string
          new_description: string
          new_price_cents: number
          new_title: string
          reason: string
        }
        Returns: undefined
      }
      admin_grant_role: {
        Args: {
          role_to_grant: Database["public"]["Enums"]["app_role"]
          target_user: string
        }
        Returns: undefined
      }
      admin_growth_center: {
        Args: {
          days?: number
          p_campaign?: string
          p_role?: string
          p_source?: string
        }
        Returns: Json
      }
      admin_growth_stats: { Args: { days?: number }; Returns: Json }
      admin_launch_kpis: { Args: { days?: number }; Returns: Json }
      admin_landing_results: {
        Args: { days?: number; p_slug: string }
        Returns: {
          cta_clicks: number
          variant: string
          views: number
        }[]
      }
      admin_marketing_audience: { Args: { p_segment: Json }; Returns: Json }
      admin_moderate_listing: {
        Args: { action: string; listing_id: string; note?: string }
        Returns: undefined
      }
      admin_moderate_offer: {
        Args: { decision: string; note?: string; offer_id: string }
        Returns: undefined
      }
      admin_moderate_part: {
        Args: { action: string; note?: string; part_id: string }
        Returns: undefined
      }
      admin_moderate_review: {
        Args: { new_status: string; note: string; review_id: string }
        Returns: undefined
      }
      admin_process_deletion: {
        Args: { decision: string; note: string; request_id: string }
        Returns: undefined
      }
      admin_publish_inspection: {
        Args: { inspection_id: string }
        Returns: undefined
      }
      admin_publish_rule_version: {
        Args: { publish_reason: string; version_id: string }
        Returns: undefined
      }
      admin_read_conversation: {
        Args: { conversation_id: string; justification: string }
        Returns: Json
      }
      admin_recent_activity: { Args: { max_rows?: number }; Returns: Json }
      admin_review_application: {
        Args: { application_id: string; new_status: string; note?: string }
        Returns: undefined
      }
      admin_review_inspection_authorization: {
        Args: { authorization_id: string; decision: string; note?: string }
        Returns: undefined
      }
      admin_review_professional_profile: {
        Args: {
          decision: Database["public"]["Enums"]["profile_review_status"]
          note?: string
          profile_id: string
        }
        Returns: undefined
      }
      admin_review_referral: {
        Args: { decision: string; note: string; referral_id: string }
        Returns: undefined
      }
      admin_review_reward_item: {
        Args: { decision: string; item_id: string; note?: string }
        Returns: undefined
      }
      admin_review_verification: {
        Args: {
          decision: Database["public"]["Enums"]["verification_status"]
          note?: string
          request_id: string
        }
        Returns: undefined
      }
      admin_revoke_points: {
        Args: { ledger_id: number; reason: string }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          role_to_revoke: Database["public"]["Enums"]["app_role"]
          target_user: string
        }
        Returns: undefined
      }
      admin_rewards_stats: { Args: never; Returns: Json }
      admin_save_content: {
        Args: { content: Json; content_key: string; publish?: boolean }
        Returns: undefined
      }
      admin_send_marketing_message: {
        Args: { message_id: string }
        Returns: Json
      }
      admin_seo_checks: {
        Args: never
        Returns: {
          area: string
          issue: string
          item: string
          link: string
          severity: string
        }[]
      }
      admin_set_account_status: {
        Args: {
          new_status: Database["public"]["Enums"]["account_status"]
          reason?: string
          target_user: string
        }
        Returns: undefined
      }
      admin_set_founding_partner: {
        Args: {
          admit: boolean
          contact_id: string
          note?: string
          profile_id: string
        }
        Returns: undefined
      }
      admin_set_insurance_partner_status: {
        Args: { new_status: string; note?: string; partner_id: string }
        Returns: undefined
      }
      admin_set_plan_limits: {
        Args: { limits: Json; plan_code: string }
        Returns: undefined
      }
      admin_set_service_operator: {
        Args: {
          kind: string
          new_status: string
          note?: string
          profile_id: string
        }
        Returns: undefined
      }
      admin_set_setting: {
        Args: { setting_key: string; setting_value: Json }
        Returns: undefined
      }
      admin_test_rule_version: { Args: { version_id: string }; Returns: Json }
      admin_unpublish_content: {
        Args: { content_key: string }
        Returns: undefined
      }
      admin_update_report: {
        Args: {
          assign_to_me?: boolean
          new_priority?: string
          new_status: string
          report_id: string
          resolution_text?: string
        }
        Returns: undefined
      }
      admin_update_ticket: {
        Args: { assign_to_me?: boolean; new_status: string; ticket_id: string }
        Returns: undefined
      }
      admin_valuation_stats: { Args: never; Returns: Json }
      admin_verify_certification: {
        Args: { approve: boolean; certification_id: string }
        Returns: undefined
      }
      admin_verify_listing: {
        Args: {
          evidence: string
          kind: string
          listing_id: string
          revoke?: boolean
        }
        Returns: undefined
      }
      become_professional: {
        Args: {
          business_name: string
          kind: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      booking_meeting_info: {
        Args: { booking_id: string }
        Returns: {
          address: string
          test_drive_conditions: string
        }[]
      }
      booking_public_settings: {
        Args: { listing_id: string }
        Returns: {
          enabled: boolean
          slot_minutes: number
          test_drive_conditions: string
          test_drive_enabled: boolean
          test_drive_min_years: number
        }[]
      }
      booking_slots: {
        Args: { days?: number; from_date?: string; listing_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      bootstrap_first_admin: { Args: { target_email: string }; Returns: string }
      business_bookings: {
        Args: { profile_id: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          kind: string
          proposed_starts_at: string
          source: string
          starts_at: string
          status: string
          title: string
        }[]
      }
      business_leads: {
        Args: { p_from?: string; p_to?: string; profile_id: string }
        Returns: {
          assigned_to: string
          conversation_id: string
          customer_city: string
          customer_name: string
          kind: string
          lead_status: string
          notes_count: number
          received_at: string
          source: string
          source_id: string
          source_status: string
          title: string
          vehicle: string
        }[]
      }
      business_log_export: {
        Args: { kind: string; profile_id: string }
        Returns: undefined
      }
      business_plan: { Args: { profile_id: string }; Returns: Json }
      business_profile_completeness: {
        Args: { profile_id: string }
        Returns: Json
      }
      business_respond_booking: {
        Args: {
          action: string
          booking_id: string
          new_starts_at?: string
          note?: string
          profile_id: string
        }
        Returns: undefined
      }
      business_respond_inspection: {
        Args: {
          action: string
          appointment_id: string
          mileage_km?: number
          new_starts_at?: string
          note?: string
          outcome?: string
          profile_id: string
        }
        Returns: undefined
      }
      business_stats: {
        Args: { p_from: string; p_to: string; profile_id: string }
        Returns: Json
      }
      cancel_repair_request: {
        Args: { reason?: string; repair_id: string }
        Returns: undefined
      }
      cancel_reward_redemption: {
        Args: { reason?: string; redemption_id: string }
        Returns: undefined
      }
      claim_offer: {
        Args: { coupon_code?: string; message?: string; offer_id: string }
        Returns: {
          claim_code: string
          claim_id: string
          estimated_cents: number
        }[]
      }
      close_conversation: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      complete_reminder: { Args: { reminder_id: string }; Returns: undefined }
      confirm_vehicle_purchase: {
        Args: { request_id: string }
        Returns: string
      }
      counterpart_avatars: {
        Args: { user_ids: string[] }
        Returns: {
          bucket: string
          path: string
          user_id: string
        }[]
      }
      counterpart_names: {
        Args: { user_ids: string[] }
        Returns: {
          display_name: string
          is_professional: boolean
          user_id: string
        }[]
      }
      create_booking: {
        Args: {
          alt_starts_at?: string
          conditions_accepted?: boolean
          contact_phone?: string
          driving_years?: number
          kind: string
          license_confirmed?: boolean
          listing_id: string
          message?: string
          starts_at: string
        }
        Returns: string
      }
      create_insurance_request: {
        Args: {
          p_consent: boolean
          p_contact_channel?: string
          p_contact_phone?: string
          p_coverages: string[]
          p_desired_start?: string
          p_fuel?: string
          p_notes?: string
          p_partner_ids: string[]
          p_plate?: string
          p_postal_code?: string
          p_power_kw?: number
          p_province: string
          p_registration_date?: string
          p_user_vehicle_id?: string
          p_vehicle_make: string
          p_vehicle_model: string
          p_vehicle_year?: number
        }
        Returns: string
      }
      create_repair_request: {
        Args: {
          p_availability: string
          p_category: string
          p_city: string
          p_description: string
          p_fuel: Database["public"]["Enums"]["fuel_type"]
          p_latitude?: number
          p_longitude?: number
          p_mileage_km: number
          p_postal_code: string
          p_preferred_date: string
          p_preferred_slot: Database["public"]["Enums"]["time_slot"]
          p_user_vehicle_id?: string
          p_vehicle_make: string
          p_vehicle_model: string
          p_vehicle_year: number
        }
        Returns: string
      }
      create_roadside_request: {
        Args: {
          p_address_text?: string
          p_area_text: string
          p_contact_phone: string
          p_description: string
          p_destination_text?: string
          p_latitude?: number
          p_location_consent?: boolean
          p_location_type: string
          p_longitude?: number
          p_people_safe: boolean
          p_photo_paths?: string[]
          p_plate?: string
          p_service: string
          p_user_vehicle_id?: string
          p_vehicle_desc: string
          p_vehicle_drivable: boolean
          p_vehicle_type: string
        }
        Returns: string
      }
      decide_affiliation: {
        Args: { affiliation_id: string; decision: string }
        Returns: undefined
      }
      decide_work_report: {
        Args: {
          approve: boolean
          note?: string
          report_id: string
          target_vehicle_id?: string
        }
        Returns: undefined
      }
      decline_roadside_request: {
        Args: { reason?: string; request_id: string }
        Returns: undefined
      }
      dispatch_repair_request: {
        Args: { profile_ids: string[]; repair_id: string }
        Returns: number
      }
      dispatch_roadside_request: {
        Args: { profile_ids: string[]; request_id: string }
        Returns: number
      }
      estimate_valuation: {
        Args: { valuation_id: string }
        Returns: {
          accidents: string
          comparables_count: number | null
          condition: string
          created_at: string
          damage_notes: string | null
          engine_cc: number | null
          estimate_max_cents: number | null
          estimate_mid_cents: number | null
          estimate_min_cents: number | null
          estimated_at: string | null
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          inspection_status: string
          make: string
          method: string | null
          mileage_km: number
          missing_info: string[]
          model: string
          options: string[]
          owners_count: number | null
          photo_paths: string[]
          power_kw: number | null
          province: string
          region: string
          reliability: string | null
          settings_snapshot: Json | null
          status: string
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          user_id: string
          user_vehicle_id: string | null
          version: string | null
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "vehicle_valuations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evaluate_listing_neo: { Args: { listing_slug: string }; Returns: Json }
      export_my_data: { Args: never; Returns: Json }
      founding_partner_profiles: {
        Args: { profile_ids: string[] }
        Returns: string[]
      }
      health_check: { Args: never; Returns: Json }
      inspection_due_date: {
        Args: {
          p_category: string
          p_last_date?: string
          p_last_outcome?: string
          p_registration_date: string
          p_usage: string
        }
        Returns: {
          checked_on: string
          due_date: string
          rule: string
          source: string
        }[]
      }
      inspection_slots: {
        Args: { days?: number; from_date?: string; profile_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      invite_business_member: {
        Args: {
          email: string
          permissions?: string[]
          profile_id: string
          role: string
        }
        Returns: string
      }
      join_beta: {
        Args: {
          p_audience: string
          p_city: string
          p_email: string
          p_landing?: string
          p_privacy_accepted: boolean
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_website?: string
        }
        Returns: undefined
      }
      link_roadside_repair: {
        Args: { repair_id: string; request_id: string }
        Returns: undefined
      }
      listing_favorite_count: { Args: { listing_id: string }; Returns: number }
      listings_within: {
        Args: { p_lat: number; p_lng: number; p_radius_km: number }
        Returns: {
          distance_km: number
          listing_id: string
        }[]
      }
      map_search: {
        Args: {
          p_brand?: string
          p_category?: string
          p_city?: string
          p_kinds?: string[]
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_min_rating?: number
          p_neo_only?: boolean
          p_only_available?: boolean
          p_postal_code?: string
          p_price_max_cents?: number
          p_radius_km?: number
        }
        Returns: {
          accepts_appointments: boolean
          address: string
          approximate: boolean
          city: string
          distance_km: number
          id: string
          kind: string
          latitude: number
          longitude: number
          mileage_km: number
          name: string
          neo_result: Database["public"]["Enums"]["neo_result"]
          photo_bucket: string
          photo_path: string
          price_cents: number
          rating_avg: number
          review_count: number
          slug: string
          subtitle: string
          year: number
        }[]
      }
      mark_conversation_read: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      marketing_unsubscribe: { Args: { p_token: string }; Returns: boolean }
      match_workshops: {
        Args: { max_rows?: number; radius_km?: number; repair_id: string }
        Returns: {
          already_sent: boolean
          city: string
          display_name: string
          distance_km: number
          matched_services: string[]
          professional_type: Database["public"]["Enums"]["app_role"]
          profile_id: string
          rating_avg: number
          review_count: number
          slug: string
          verified: boolean
        }[]
      }
      my_businesses: {
        Args: never
        Returns: {
          display_name: string
          permissions: string[]
          professional_type: string
          profile_id: string
          role: string
          slug: string
        }[]
      }
      my_referral_code: { Args: never; Returns: string }
      offer_stats: {
        Args: { profile_id: string }
        Returns: {
          claims: number
          clicks: number
          confirmed: number
          coupons_used: number
          offer_id: string
          status: string
          title: string
          used: number
          views: number
        }[]
      }
      open_support_ticket: {
        Args: { category: string; message: string; subject: string }
        Returns: string
      }
      partner_update_insurance_request: {
        Args: { new_status: string; note?: string; request_partner_id: string }
        Returns: undefined
      }
      professional_locations: {
        Args: { profile_ids: string[] }
        Returns: {
          address_line: string
          approximate: boolean
          latitude: number
          longitude: number
          profile_id: string
        }[]
      }
      professional_private_details: {
        Args: { profile_id: string }
        Returns: {
          address_line: string
          contact_person: string
          latitude: number
          longitude: number
          review_note: string
        }[]
      }
      professional_valuation_action: {
        Args: {
          action: string
          amount_cents?: number
          conditions?: string
          kind?: string
          note?: string
          request_id: string
          requires_inspection?: boolean
          valid_days?: number
        }
        Returns: string
      }
      profile_reputation: { Args: { profile_id: string }; Returns: Json }
      propose_appointment: {
        Args: {
          note?: string
          proposed_date: string
          request_id: string
          slot: Database["public"]["Enums"]["time_slot"]
          time_text?: string
        }
        Returns: string
      }
      propose_trade_in: {
        Args: {
          listing_id: string
          message?: string
          proposed_value_cents: number
          share_photos?: boolean
          valuation_id: string
        }
        Returns: string
      }
      propose_work_report: {
        Args: {
          category: Database["public"]["Enums"]["maintenance_category"]
          cost_cents?: number
          description: string
          mileage_km?: number
          parts_used?: string
          performed_on: string
          request_id: string
          title: string
        }
        Returns: string
      }
      public_roadside_operators: {
        Args: { p_city?: string; p_service?: string }
        Returns: {
          available_now: boolean
          city: string
          display_name: string
          h24: boolean
          hours_text: string
          profile_id: string
          services: string[]
          slug: string
          verified: boolean
        }[]
      }
      redeem_reward: {
        Args: { idempotency_key: string; item_id: string }
        Returns: {
          code: string
          redemption_id: string
          valid_until: string
        }[]
      }
      reply_to_review: {
        Args: { reply_text: string; review_id: string }
        Returns: undefined
      }
      report_client_error: {
        Args: {
          p_device?: string
          p_digest?: string
          p_message: string
          p_path?: string
        }
        Returns: undefined
      }
      request_inspection: {
        Args: {
          center_profile_id: string
          message?: string
          plate?: string
          preferred_date?: string
          preferred_time?: string
          starts_at?: string
          user_vehicle_id?: string
          vehicle_category?: string
          vehicle_desc: string
        }
        Returns: string
      }
      request_professional_valuation: {
        Args: {
          consent?: boolean
          intent?: string
          message?: string
          profile_ids: string[]
          share_estimate?: boolean
          shared_photos?: string[]
          valuation_id: string
        }
        Returns: string
      }
      request_vehicle_info: { Args: { request_id: string }; Returns: Json }
      reschedule_appointment: {
        Args: {
          appointment_id: string
          new_date: string
          new_slot: Database["public"]["Enums"]["time_slot"]
          new_time?: string
          note?: string
        }
        Returns: string
      }
      respond_appointment: {
        Args: { action: string; appointment_id: string; reason?: string }
        Returns: undefined
      }
      respond_booking: {
        Args: {
          action: string
          booking_id: string
          new_starts_at?: string
          note?: string
        }
        Returns: undefined
      }
      respond_inspection: {
        Args: {
          action: string
          appointment_id: string
          mileage_km?: number
          new_starts_at?: string
          note?: string
          outcome?: string
        }
        Returns: undefined
      }
      respond_quote: {
        Args: { accept: boolean; note?: string; quote_id: string }
        Returns: undefined
      }
      respond_trade_in: {
        Args: {
          action: string
          counter_cents?: number
          note?: string
          proposal_id: string
        }
        Returns: undefined
      }
      respond_valuation_offer: {
        Args: {
          action: string
          counter_cents?: number
          note?: string
          offer_id: string
        }
        Returns: string
      }
      rewards_wallet: { Args: never; Returns: Json }
      roadside_candidates: {
        Args: { request_id: string }
        Returns: {
          already_sent: boolean
          available_until: string
          city: string
          display_name: string
          distance_km: number
          h24: boolean
          price_notes: string
          profile_id: string
          rating_avg: number
          review_count: number
          slug: string
          verified: boolean
        }[]
      }
      search_inspection_centers: {
        Args: {
          p_category?: string
          p_city?: string
          p_lat?: number
          p_lng?: number
          p_radius_km?: number
        }
        Returns: {
          address: string
          authorized: boolean
          city: string
          display_name: string
          distance_km: number
          hours_text: string
          latitude: number
          longitude: number
          online_booking: boolean
          phone: string
          price_notes: string
          profile_id: string
          rating_avg: number
          review_count: number
          services: string[]
          slug: string
          vehicle_categories: string[]
        }[]
      }
      search_offers: {
        Args: {
          p_category?: string
          p_city?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_neo?: boolean
          p_radius_km?: number
        }
        Returns: {
          category: string
          city: string
          discount_pct: number
          distance_km: number
          ends_on: string
          id: string
          image_path: string
          neo_topic: string
          original_price_cents: number
          partner_name: string
          partner_slug: string
          partner_type: Database["public"]["Enums"]["app_role"]
          promo_price_cents: number
          quantity_left: number
          slug: string
          title: string
        }[]
      }
      search_parts: {
        Args: {
          p_available_only?: boolean
          p_brand?: string
          p_category?: string
          p_city?: string
          p_code?: string
          p_condition?: Database["public"]["Enums"]["part_condition"]
          p_limit?: number
          p_make?: string
          p_model?: string
          p_offset?: number
          p_postal_code?: string
          p_price_max?: number
          p_price_min?: number
          p_query?: string
          p_seller?: Database["public"]["Enums"]["seller_kind"]
          p_sort?: string
          p_year?: number
        }
        Returns: {
          category_name: string
          category_slug: string
          city: string
          condition: Database["public"]["Enums"]["part_condition"]
          cover_path: string
          exact_code: boolean
          id: string
          manufacturer_brand: string
          manufacturer_code: string
          oem_code: string
          price_cents: number
          province: string
          published_at: string
          quantity: number
          seller_kind: Database["public"]["Enums"]["seller_kind"]
          seller_name: string
          slug: string
          status: Database["public"]["Enums"]["part_status"]
          title: string
          total_count: number
        }[]
      }
      search_professionals: {
        Args: {
          p_brand?: string
          p_category?: string
          p_city?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_offset?: number
          p_postal_code?: string
          p_query?: string
          p_radius_km?: number
          p_region?: string
          p_sort?: string
          p_type: Database["public"]["Enums"]["app_role"]
          p_verified_only?: boolean
          p_work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Returns: {
          business_verified: boolean
          categories: string[]
          city: string
          created_at: string
          description: string
          display_name: string
          distance_km: number
          experience_years: number
          id: string
          identity_verified: boolean
          latitude: number
          logo_path: string
          longitude: number
          province: string
          rating_avg: number
          rating_count: number
          region: string
          slug: string
          total_count: number
          work_modes: Database["public"]["Enums"]["work_mode"][]
        }[]
      }
      seller_listing_stats: {
        Args: never
        Returns: {
          bookings: number
          favorites: number
          listing_id: string
          price_changes: number
          requests: number
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          views: number
        }[]
      }
      send_quote: {
        Args: {
          amount_cents: number
          availability_text?: string
          conditions?: string
          description: string
          duration_text?: string
          extra_costs_cents?: number
          materials?: string
          request_id: string
          valid_until?: string
        }
        Returns: string
      }
      send_quote_detailed: {
        Args: {
          availability_text?: string
          conditions?: string
          description: string
          duration_text?: string
          extra_costs_cents?: number
          labor_cents: number
          materials?: string
          parts_cents: number
          request_id: string
          requires_inspection?: boolean
          valid_until?: string
        }
        Returns: string
      }
      send_roadside_quote: {
        Args: {
          amount_cents: number
          eta_minutes: number
          includes: string
          notes?: string
          request_id: string
          valid_minutes?: number
        }
        Returns: string
      }
      send_transport_quote: {
        Args: {
          amount_cents: number
          delivery_date: string
          includes_insurance?: boolean
          notes?: string
          pickup_date: string
          request_id: string
          valid_days?: number
        }
        Returns: string
      }
      seo_local_pages: {
        Args: never
        Returns: {
          city: string
          city_slug: string
          indexable: boolean
          professional_type: string
          profiles: number
        }[]
      }
      seo_neo_bands: {
        Args: never
        Returns: {
          band: string
          indexable: boolean
          listings: number
        }[]
      }
      set_conversation_archived: {
        Args: { archived: boolean; conversation_id: string }
        Returns: undefined
      }
      set_lead_status: {
        Args: {
          assigned_to?: string
          profile_id: string
          source: string
          source_id: string
          status: string
        }
        Returns: undefined
      }
      set_primary_vehicle: { Args: { vehicle_id: string }; Returns: undefined }
      share_operator_location: {
        Args: {
          accuracy_m?: number
          latitude: number
          longitude: number
          request_id: string
        }
        Returns: undefined
      }
      start_conversation: {
        Args: {
          first_message?: string
          target_listing_id?: string
          target_profile_id?: string
        }
        Returns: string
      }
      stop_operator_location: {
        Args: { request_id: string }
        Returns: undefined
      }
      submit_insurance_quote: {
        Args: {
          annual_premium_cents: number
          coverages: string
          deductibles?: string
          documents_url: string
          duration_months: number
          exclusions?: string
          external_ref?: string
          limits?: string
          product_name: string
          purchase_url?: string
          request_partner_id: string
          valid_until: string
        }
        Returns: string
      }
      submit_partner_application: {
        Args: {
          p_address: string
          p_applicant_type: string
          p_business_name: string
          p_cars_available: number
          p_city: string
          p_contact_name: string
          p_email: string
          p_founding_interest: boolean
          p_landing?: string
          p_message: string
          p_phone: string
          p_privacy_accepted: boolean
          p_program: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_website?: string
        }
        Returns: string
      }
      submit_professional_profile:
        | { Args: never; Returns: undefined }
        | { Args: { profile_id: string }; Returns: undefined }
      track_event: {
        Args: {
          p_device?: string
          p_event: string
          p_is_entry?: boolean
          p_landing?: string
          p_meta?: Json
          p_path: string
          p_referrer_host?: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: undefined
      }
      track_listing_view: { Args: { listing_slug: string }; Returns: undefined }
      track_offer: {
        Args: { is_click?: boolean; offer_slug: string }
        Returns: undefined
      }
      track_part_view: { Args: { part_slug: string }; Returns: undefined }
      track_profile_view: { Args: { profile_slug: string }; Returns: undefined }
      update_business_member: {
        Args: {
          member_id: string
          permissions?: string[]
          revoke?: boolean
          role?: string
        }
        Returns: undefined
      }
      update_offer_claim: {
        Args: { claim_id: string; new_status: string }
        Returns: undefined
      }
      update_request_status: {
        Args: {
          new_status: Database["public"]["Enums"]["request_status"]
          reason?: string
          request_id: string
        }
        Returns: undefined
      }
      update_roadside_status: {
        Args: { new_status: string; note?: string; request_id: string }
        Returns: undefined
      }
      update_transport_status: {
        Args: { new_status: string; note?: string; request_id: string }
        Returns: undefined
      }
      use_reward_code: { Args: { p_code: string }; Returns: undefined }
      valuation_professionals: {
        Args: { p_city?: string; p_limit?: number }
        Returns: {
          city: string
          display_name: string
          professional_type: string
          profile_id: string
          rating_avg: number
          review_count: number
          slug: string
          verified: boolean
        }[]
      }
      vehicle_contacted_professionals: {
        Args: { vehicle_id: string }
        Returns: {
          display_name: string
          last_request_at: string
          professional_type: Database["public"]["Enums"]["app_role"]
          profile_id: string
          requests_count: number
          slug: string
        }[]
      }
      verify_reward_code: {
        Args: { p_code: string }
        Returns: {
          benefit_type: string
          benefit_value: number
          conditions: string
          customer_name: string
          item_title: string
          redemption_id: string
          status: string
          valid_until: string
        }[]
      }
      withdraw_insurance_request: {
        Args: { delete_data?: boolean; request_id: string }
        Returns: undefined
      }
      withdraw_valuation_request: {
        Args: { request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "attivo" | "sospeso" | "disattivato"
      app_role:
        | "cliente"
        | "officina"
        | "meccanico"
        | "venditore_auto"
        | "venditore_ricambi"
        | "admin"
        | "super_admin"
        | "moderatore"
        | "operatore_assistenza"
        | "soccorritore"
        | "trasportatore"
        | "centro_revisione"
        | "intermediario_assicurativo"
      appointment_status:
        | "in_attesa"
        | "confermato"
        | "proposta_alternativa"
        | "rifiutato"
        | "annullato"
        | "completato"
      body_type:
        | "berlina"
        | "utilitaria"
        | "suv"
        | "station_wagon"
        | "coupe"
        | "cabrio"
        | "monovolume"
        | "furgone"
        | "altra"
      conversation_context:
        | "auto"
        | "officina"
        | "meccanico"
        | "ricambio"
        | "assistenza"
        | "supporto"
        | "generale"
      expense_category:
        | "riparazioni"
        | "tagliandi"
        | "ricambi"
        | "pneumatici"
        | "assicurazione"
        | "revisione"
        | "bollo"
        | "carburante"
        | "altro"
      fuel_type:
        | "benzina"
        | "diesel"
        | "gpl"
        | "metano"
        | "ibrida"
        | "ibrida_plugin"
        | "elettrica"
        | "altra"
      inspection_result:
        | "controllato"
        | "da_monitorare"
        | "riparazione_consigliata"
        | "non_controllato"
        | "non_applicabile"
      listing_status:
        | "bozza"
        | "in_revisione"
        | "approvato"
        | "pubblicato"
        | "rifiutato"
        | "sospeso"
        | "venduto"
        | "scaduto"
      maintenance_category:
        | "tagliando"
        | "cambio_olio"
        | "filtri"
        | "freni"
        | "pneumatici"
        | "batteria"
        | "distribuzione"
        | "frizione"
        | "sospensioni"
        | "climatizzazione"
        | "revisione"
        | "diagnosi"
        | "riparazione_motore"
        | "riparazione_carrozzeria"
        | "altro"
      marketing_status:
        | "bozza"
        | "in_preparazione"
        | "da_approvare"
        | "approvato"
        | "pubblicato"
        | "archiviato"
      neo_result: "compatibile" | "non_compatibile" | "da_verificare"
      notification_category:
        | "messaggi"
        | "richieste"
        | "preventivi"
        | "appuntamenti"
        | "automobili"
        | "ricambi"
        | "officine"
        | "meccanici"
        | "manutenzione"
        | "amministrazione"
        | "account"
        | "premi"
        | "promozioni"
      part_condition: "nuovo" | "usato" | "ricondizionato"
      part_status:
        | "bozza"
        | "in_revisione"
        | "approvato"
        | "pubblicato"
        | "rifiutato"
        | "sospeso"
        | "esaurito"
        | "venduto"
        | "scaduto"
      price_type: "fisso" | "a_partire_da" | "su_preventivo"
      profile_review_status:
        | "bozza"
        | "inviato"
        | "in_verifica"
        | "approvato"
        | "rifiutato"
        | "sospeso"
      quote_status:
        | "inviato"
        | "accettato"
        | "rifiutato"
        | "sostituito"
        | "ritirato"
      record_source: "manuale" | "professionista" | "importato"
      reminder_status:
        | "attivo"
        | "in_scadenza"
        | "scaduto"
        | "completato"
        | "disattivato"
      request_kind:
        | "info_auto"
        | "appuntamento_auto"
        | "preventivo"
        | "appuntamento"
        | "assistenza"
        | "info_ricambio"
        | "preventivo_ricambio"
      request_status:
        | "nuova"
        | "visualizzata"
        | "in_lavorazione"
        | "risposta_inviata"
        | "preventivo_inviato"
        | "appuntamento_proposto"
        | "accettata"
        | "rifiutata"
        | "completata"
        | "annullata"
      rule_status: "bozza" | "pubblicata" | "archiviata"
      seller_kind: "privato" | "professionista"
      time_slot: "mattina" | "pomeriggio" | "sera" | "qualsiasi"
      transmission_type: "manuale" | "automatico" | "altro"
      vehicle_condition: "nuovo" | "usato" | "km0" | "aziendale" | "altro"
      verification_status:
        | "in_attesa"
        | "in_revisione"
        | "approvata"
        | "rifiutata"
        | "annullata"
      verification_type:
        | "identita"
        | "attivita_professionale"
        | "documentazione"
      work_mode: "sede" | "officina_partner" | "mobile"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}



type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

// Alias usati dal codice della Fase 1
export type AppRoleEnum = Enums<"app_role">;
export type AccountStatusEnum = Enums<"account_status">;
export type VerificationTypeEnum = Enums<"verification_type">;
export type VerificationStatusEnum = Enums<"verification_status">;
export type ProfileRow = Tables<"profiles">;
export type ProfessionalProfileRow = Tables<"professional_profiles">;

