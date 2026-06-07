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
  public: {
    Tables: {
      dm_memory: {
        Row: {
          disliked_tags: string[] | null
          loved_tags: string[] | null
          player_key: string
          profile: string
          total_runs: number
          updated_at: string
          visited_pois: string[] | null
        }
        Insert: {
          disliked_tags?: string[] | null
          loved_tags?: string[] | null
          player_key: string
          profile?: string
          total_runs?: number
          updated_at?: string
          visited_pois?: string[] | null
        }
        Update: {
          disliked_tags?: string[] | null
          loved_tags?: string[] | null
          player_key?: string
          profile?: string
          total_runs?: number
          updated_at?: string
          visited_pois?: string[] | null
        }
        Relationships: []
      }
      journey_parties: {
        Row: {
          card: Json
          city: string | null
          created_at: string
          group_mode: string
          host_key: string
          id: string
          journey: Json
          members: Json
          updated_at: string
        }
        Insert: {
          card: Json
          city?: string | null
          created_at?: string
          group_mode?: string
          host_key?: string
          id: string
          journey: Json
          members?: Json
          updated_at?: string
        }
        Update: {
          card?: Json
          city?: string | null
          created_at?: string
          group_mode?: string
          host_key?: string
          id?: string
          journey?: Json
          members?: Json
          updated_at?: string
        }
        Relationships: []
      }
      postchain_consents: {
        Row: {
          auth_level: string
          player_key: string
          privacy: Json
          updated_at: string
        }
        Insert: {
          auth_level: string
          player_key: string
          privacy: Json
          updated_at?: string
        }
        Update: {
          auth_level?: string
          player_key?: string
          privacy?: Json
          updated_at?: string
        }
        Relationships: []
      }
      postchain_shares: {
        Row: {
          chapter_id: string
          id: string
          payload: Json
          player_key: string
          privacy: Json
          share_text: string
          updated_at: string
        }
        Insert: {
          chapter_id: string
          id: string
          payload: Json
          player_key?: string
          privacy: Json
          share_text: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          id?: string
          payload?: Json
          player_key?: string
          privacy?: Json
          share_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      quest_history: {
        Row: {
          character_class: string
          city: string | null
          created_at: string
          emotion: string | null
          feedback: string | null
          id: string
          liked_stage_orders: number[] | null
          player_key: string
          quest: Json
          rating: number | null
          stages_unlocked: number
        }
        Insert: {
          character_class: string
          city?: string | null
          created_at?: string
          emotion?: string | null
          feedback?: string | null
          id?: string
          liked_stage_orders?: number[] | null
          player_key?: string
          quest: Json
          rating?: number | null
          stages_unlocked?: number
        }
        Update: {
          character_class?: string
          city?: string | null
          created_at?: string
          emotion?: string | null
          feedback?: string | null
          id?: string
          liked_stage_orders?: number[] | null
          player_key?: string
          quest?: Json
          rating?: number | null
          stages_unlocked?: number
        }
        Relationships: []
      }
      saga_archive: {
        Row: {
          archived_at: string
          card_identity: string
          chapter: Json
          chapter_id: string
          city: string | null
          completed_count: number
          player_key: string
          total_count: number
          updated_at: string
        }
        Insert: {
          archived_at?: string
          card_identity: string
          chapter: Json
          chapter_id: string
          city?: string | null
          completed_count?: number
          player_key?: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string
          card_identity?: string
          chapter?: Json
          chapter_id?: string
          city?: string | null
          completed_count?: number
          player_key?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
