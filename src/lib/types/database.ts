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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      complaint_categories: {
        Row: {
          created_at: string
          display_order: number
          id: number
          is_active: boolean
          name_en: string
          name_ne: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: never
          is_active?: boolean
          name_en: string
          name_ne: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: never
          is_active?: boolean
          name_en?: string
          name_ne?: string
          updated_at?: string
        }
        Relationships: []
      }
      complaint_status_events: {
        Row: {
          changed_by: string | null
          complaint_id: number
          created_at: string
          id: number
          note: string | null
          status: Database["public"]["Enums"]["complaint_status"]
        }
        Insert: {
          changed_by?: string | null
          complaint_id: number
          created_at?: string
          id?: never
          note?: string | null
          status: Database["public"]["Enums"]["complaint_status"]
        }
        Update: {
          changed_by?: string | null
          complaint_id?: number
          created_at?: string
          id?: never
          note?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
        }
        Relationships: [
          {
            foreignKeyName: "complaint_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_status_events_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          category_id: number
          created_at: string
          description: string
          id: number
          is_published: boolean
          location_text: string
          photo_file: string | null
          staff_note: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          ticket_id: string
          updated_at: string
          user_id: string
          withdrawal_reason: string | null
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          category_id: number
          created_at?: string
          description: string
          id?: never
          is_published?: boolean
          location_text: string
          photo_file?: string | null
          staff_note?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          ticket_id?: string
          updated_at?: string
          user_id?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string
          id?: never
          is_published?: boolean
          location_text?: string
          photo_file?: string | null
          staff_note?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          ticket_id?: string
          updated_at?: string
          user_id?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "complaint_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_withdrawn_by_fkey"
            columns: ["withdrawn_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_albums: {
        Row: {
          cover_photo_id: number | null
          created_at: string
          created_by: string
          display_order: number
          id: number
          is_published: boolean
          slug: string
          title_en: string
          title_ne: string
          updated_at: string
          year_bs: number
        }
        Insert: {
          cover_photo_id?: number | null
          created_at?: string
          created_by?: string
          display_order?: number
          id?: never
          is_published?: boolean
          slug: string
          title_en: string
          title_ne: string
          updated_at?: string
          year_bs: number
        }
        Update: {
          cover_photo_id?: number | null
          created_at?: string
          created_by?: string
          display_order?: number
          id?: never
          is_published?: boolean
          slug?: string
          title_en?: string
          title_ne?: string
          updated_at?: string
          year_bs?: number
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_albums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          album_id: number
          caption_en: string | null
          caption_ne: string | null
          created_at: string
          display_order: number
          id: number
          photo_public_id: string
          updated_at: string
        }
        Insert: {
          album_id: number
          caption_en?: string | null
          caption_ne?: string | null
          created_at?: string
          display_order?: number
          id?: never
          photo_public_id: string
          updated_at?: string
        }
        Update: {
          album_id?: number
          caption_en?: string | null
          caption_ne?: string | null
          created_at?: string
          display_order?: number
          id?: never
          photo_public_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_categories: {
        Row: {
          created_at: string
          display_order: number
          id: number
          is_active: boolean
          name_en: string
          name_ne: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: never
          is_active?: boolean
          name_en: string
          name_ne: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: never
          is_active?: boolean
          name_en?: string
          name_ne?: string
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          attachment_public_id: string | null
          body_en: string
          body_ne: string
          category_id: number
          created_at: string
          created_by: string
          id: number
          is_published: boolean
          published_at: string | null
          title_en: string
          title_ne: string
          updated_at: string
        }
        Insert: {
          attachment_public_id?: string | null
          body_en: string
          body_ne: string
          category_id: number
          created_at?: string
          created_by?: string
          id?: never
          is_published?: boolean
          published_at?: string | null
          title_en: string
          title_ne: string
          updated_at?: string
        }
        Update: {
          attachment_public_id?: string | null
          body_en?: string
          body_ne?: string
          category_id?: number
          created_at?: string
          created_by?: string
          id?: never
          is_published?: boolean
          published_at?: string | null
          title_en?: string
          title_ne?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "notice_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      program_registrations: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: number
          note: string | null
          phone: string
          program_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: never
          note?: string | null
          phone: string
          program_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: never
          note?: string | null
          phone?: string
          program_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          banner_public_id: string | null
          created_at: string
          created_by: string
          description_en: string
          description_ne: string
          end_date: string | null
          id: number
          is_published: boolean
          registration_deadline: string | null
          registration_open: boolean
          start_date: string
          title_en: string
          title_ne: string
          updated_at: string
        }
        Insert: {
          banner_public_id?: string | null
          created_at?: string
          created_by?: string
          description_en: string
          description_ne: string
          end_date?: string | null
          id?: never
          is_published?: boolean
          registration_deadline?: string | null
          registration_open?: boolean
          start_date: string
          title_en: string
          title_ne: string
          updated_at?: string
        }
        Update: {
          banner_public_id?: string | null
          created_at?: string
          created_by?: string
          description_en?: string
          description_ne?: string
          end_date?: string | null
          id?: never
          is_published?: boolean
          registration_deadline?: string | null
          registration_open?: boolean
          start_date?: string
          title_en?: string
          title_ne?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      representatives: {
        Row: {
          bio_en: string
          bio_ne: string
          created_at: string
          created_by: string
          display_order: number
          email: string | null
          full_name_en: string
          full_name_ne: string
          id: number
          is_active: boolean
          phone: string | null
          photo_public_id: string | null
          role_en: string
          role_ne: string
          updated_at: string
        }
        Insert: {
          bio_en: string
          bio_ne: string
          created_at?: string
          created_by?: string
          display_order?: number
          email?: string | null
          full_name_en: string
          full_name_ne: string
          id?: never
          is_active?: boolean
          phone?: string | null
          photo_public_id?: string | null
          role_en: string
          role_ne: string
          updated_at?: string
        }
        Update: {
          bio_en?: string
          bio_ne?: string
          created_at?: string
          created_by?: string
          display_order?: number
          email?: string | null
          full_name_en?: string
          full_name_ne?: string
          id?: never
          is_active?: boolean
          phone?: string | null
          photo_public_id?: string | null
          role_en?: string
          role_ne?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "representatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      complaints_public: {
        Row: {
          category_name_en: string | null
          category_name_ne: string | null
          created_at: string | null
          description: string | null
          location_text: string | null
          status: Database["public"]["Enums"]["complaint_status"] | null
          ticket_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_profile_role: {
        Args: {
          new_is_active: boolean
          new_role: Database["public"]["Enums"]["user_role"]
          target_id: string
        }
        Returns: undefined
      }
      complaint_rate_ok: { Args: never; Returns: boolean }
      complaint_stats: {
        Args: never
        Returns: {
          action_required: number
          active_total: number
          closed: number
          in_progress: number
          received: number
          resolved: number
          resolved_pct: number
          total: number
          withdrawn: number
        }[]
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      next_complaint_ticket: { Args: never; Returns: string }
      program_is_open: { Args: { p_program_id: number }; Returns: boolean }
      registration_count: { Args: never; Returns: number }
    }
    Enums: {
      complaint_status:
        | "received"
        | "in_progress"
        | "action_required"
        | "resolved"
        | "closed"
      form_status:
        | "submitted"
        | "in_review"
        | "action_required"
        | "ready"
        | "completed"
        | "rejected"
      user_role: "resident" | "ward_secretary" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      complaint_status: [
        "received",
        "in_progress",
        "action_required",
        "resolved",
        "closed",
      ],
      form_status: [
        "submitted",
        "in_review",
        "action_required",
        "ready",
        "completed",
        "rejected",
      ],
      user_role: ["resident", "ward_secretary", "admin"],
    },
  },
} as const
