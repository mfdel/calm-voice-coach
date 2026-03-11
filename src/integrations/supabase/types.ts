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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      child_profiles: {
        Row: {
          age_group: string
          birth_date: string | null
          calming_preferences: Json | null
          created_at: string
          development_notes: string | null
          display_name: string
          id: string
          known_triggers: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string
          birth_date?: string | null
          calming_preferences?: Json | null
          created_at?: string
          development_notes?: string | null
          display_name: string
          id?: string
          known_triggers?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string
          birth_date?: string | null
          calming_preferences?: Json | null
          created_at?: string
          development_notes?: string | null
          display_name?: string
          id?: string
          known_triggers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incident_feedback: {
        Row: {
          created_at: string
          feedback_note: string | null
          id: string
          incident_id: string
          outcome: string
          reason_tags: Json | null
        }
        Insert: {
          created_at?: string
          feedback_note?: string | null
          id?: string
          incident_id: string
          outcome: string
          reason_tags?: Json | null
        }
        Update: {
          created_at?: string
          feedback_note?: string | null
          id?: string
          incident_id?: string
          outcome?: string
          reason_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_feedback_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_suggestions: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          position: number
          reason: string | null
          script: string | null
          source_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          position?: number
          reason?: string | null
          script?: string | null
          source_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          position?: number
          reason?: string | null
          script?: string | null
          source_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_suggestions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          child_id: string | null
          context_signals: Json | null
          created_at: string
          id: string
          input_mode: string | null
          latency_ms: number | null
          note_text: string | null
          problem_category: string
          summary_text: string | null
          used_fallback: boolean | null
          user_id: string
        }
        Insert: {
          child_id?: string | null
          context_signals?: Json | null
          created_at?: string
          id?: string
          input_mode?: string | null
          latency_ms?: number | null
          note_text?: string | null
          problem_category: string
          summary_text?: string | null
          used_fallback?: boolean | null
          user_id: string
        }
        Update: {
          child_id?: string | null
          context_signals?: Json | null
          created_at?: string
          id?: string
          input_mode?: string | null
          latency_ms?: number | null
          note_text?: string | null
          problem_category?: string
          summary_text?: string | null
          used_fallback?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          age_groups: Json
          description: string | null
          editorial_status: string
          id: string
          problem_category: string
          source_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          age_groups?: Json
          description?: string | null
          editorial_status?: string
          id?: string
          problem_category: string
          source_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          age_groups?: Json
          description?: string | null
          editorial_status?: string
          id?: string
          problem_category?: string
          source_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_snippets: {
        Row: {
          applicable_triggers: Json | null
          article_id: string
          blocked_by_red_lines: Json | null
          content: string
          embedding: string | null
          id: string
          snippet_type: string
          success_signals: Json | null
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          applicable_triggers?: Json | null
          article_id: string
          blocked_by_red_lines?: Json | null
          content: string
          embedding?: string | null
          id?: string
          snippet_type?: string
          success_signals?: Json | null
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          applicable_triggers?: Json | null
          article_id?: string
          blocked_by_red_lines?: Json | null
          content?: string
          embedding?: string | null
          id?: string
          snippet_type?: string
          success_signals?: Json | null
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_snippets_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      parenting_preferences: {
        Row: {
          household_notes: string | null
          id: string
          parenting_values: Json | null
          style: string | null
          tone_preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          household_notes?: string | null
          id?: string
          parenting_values?: Json | null
          style?: string | null
          tone_preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          household_notes?: string | null
          id?: string
          parenting_values?: Json | null
          style?: string | null
          tone_preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          locale: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          locale?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          locale?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prompt_runs: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          input_token_estimate: number | null
          model_name: string | null
          output_token_count: number | null
          prompt_version: string | null
          red_line_violation_detected: boolean | null
          response_valid: boolean | null
          retry_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          input_token_estimate?: number | null
          model_name?: string | null
          output_token_count?: number | null
          prompt_version?: string | null
          red_line_violation_detected?: boolean | null
          response_valid?: boolean | null
          retry_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          input_token_estimate?: number | null
          model_name?: string | null
          output_token_count?: number | null
          prompt_version?: string | null
          red_line_violation_detected?: boolean | null
          response_valid?: boolean | null
          retry_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_runs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      red_lines: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          notes: string | null
          severity: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      retrieval_events: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          query_filters: Json | null
          query_text: string | null
          retrieval_ms: number | null
          top_results: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          query_filters?: Json | null
          query_text?: string | null
          retrieval_ms?: number | null
          top_results?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          query_filters?: Json | null
          query_text?: string | null
          retrieval_ms?: number | null
          top_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
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
