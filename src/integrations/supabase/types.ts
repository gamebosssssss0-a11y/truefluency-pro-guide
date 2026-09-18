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
      ai_question_sets: {
        Row: {
          course_code: string | null
          data: Json | null
          generated_at: string | null
          id: string
          questions: Json | null
          user_id: string | null
        }
        Insert: {
          course_code?: string | null
          data?: Json | null
          generated_at?: string | null
          id?: string
          questions?: Json | null
          user_id?: string | null
        }
        Update: {
          course_code?: string | null
          data?: Json | null
          generated_at?: string | null
          id?: string
          questions?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          conversation_id: string
          course_code: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          course_code: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          course_code?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      course_context: {
        Row: {
          content: string
          course_code: string
          created_at: string | null
          embedding: string | null
          id: string
          source_url: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          content: string
          course_code: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_url?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          content?: string
          course_code?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_url?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          course_code: string
          created_at: string | null
          extracted_content: string | null
          extraction_error: string | null
          extraction_status: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          is_peer_copy: boolean
          mime_type: string
          peer_alias: string | null
          published: boolean
          published_at: string | null
          show_owner_name: boolean
          show_owner_photo: boolean
          size_bytes: number
          user_id: string | null
        }
        Insert: {
          course_code: string
          created_at?: string | null
          extracted_content?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          is_peer_copy?: boolean
          mime_type: string
          peer_alias?: string | null
          published?: boolean
          published_at?: string | null
          show_owner_name?: boolean
          show_owner_photo?: boolean
          size_bytes: number
          user_id?: string | null
        }
        Update: {
          course_code?: string
          created_at?: string | null
          extracted_content?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          is_peer_copy?: boolean
          mime_type?: string
          peer_alias?: string | null
          published?: boolean
          published_at?: string | null
          show_owner_name?: boolean
          show_owner_photo?: boolean
          size_bytes?: number
          user_id?: string | null
        }
        Relationships: []
      }
      course_topic_analysis: {
        Row: {
          analyzed_at: string | null
          course_code: string | null
          created_at: string | null
          id: string
          material_id: string | null
          topics: Json | null
          user_id: string | null
        }
        Insert: {
          analyzed_at?: string | null
          course_code?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          topics?: Json | null
          user_id?: string | null
        }
        Update: {
          analyzed_at?: string | null
          course_code?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          topics?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          card_count: number
          course_code: string | null
          created_at: string | null
          id: string
          material_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          card_count?: number
          course_code?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          card_count?: number
          course_code?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string | null
          deck_id: string
          difficulty: number | null
          due_at: string
          front: string
          id: string
          lapses: number
          last_reviewed_at: string | null
          reps: number
          source_excerpt: string | null
          stability: number | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string | null
          deck_id: string
          difficulty?: number | null
          due_at?: string
          front: string
          id?: string
          lapses?: number
          last_reviewed_at?: string | null
          reps?: number
          source_excerpt?: string | null
          stability?: number | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string | null
          deck_id?: string
          difficulty?: number | null
          due_at?: string
          front?: string
          id?: string
          lapses?: number
          last_reviewed_at?: string | null
          reps?: number
          source_excerpt?: string | null
          stability?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_question_log: {
        Row: {
          created_at: string | null
          id: string
          material_id: string
          question_stem: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id: string
          question_stem: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string
          question_stem?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      library_shares: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_revoked: boolean
          material_id: string
          max_uses: number
          owner_id: string
          token: string
          use_count: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_revoked?: boolean
          material_id: string
          max_uses?: number
          owner_id: string
          token: string
          use_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          material_id?: string
          max_uses?: number
          owner_id?: string
          token?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_shares_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_attempt_results: {
        Row: {
          course_code: string
          created_at: string | null
          difficulty: string | null
          id: string
          item_type: string | null
          topic: string
          user_id: string
          was_correct: boolean
        }
        Insert: {
          course_code: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          item_type?: string | null
          topic: string
          user_id: string
          was_correct: boolean
        }
        Update: {
          course_code?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          item_type?: string | null
          topic?: string
          user_id?: string
          was_correct?: boolean
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
          answers: Json | null
          correct: number | null
          course_code: string | null
          course_title: string | null
          data: Json | null
          id: string
          questions: Json | null
          score: number | null
          settings: Json | null
          submitted_at: string | null
          topics: Json | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          correct?: number | null
          course_code?: string | null
          course_title?: string | null
          data?: Json | null
          id?: string
          questions?: Json | null
          score?: number | null
          settings?: Json | null
          submitted_at?: string | null
          topics?: Json | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          correct?: number | null
          course_code?: string | null
          course_title?: string | null
          data?: Json | null
          id?: string
          questions?: Json | null
          score?: number | null
          settings?: Json | null
          submitted_at?: string | null
          topics?: Json | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      mock_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          job_id: string
          result: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          job_id: string
          result?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          job_id?: string
          result?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          cgpa_actual: Json | null
          cgpa_inputs: Json | null
          cgpa_intro_seen: boolean | null
          cgpa_plan: Json | null
          data: Json | null
          department: string | null
          disclaimer_accepted: boolean | null
          display_name: string | null
          email: string | null
          faculty: string | null
          freeze_used_on: string | null
          freezes_available: number
          goal: Json | null
          has_completed_first_mock: boolean | null
          last_active_date: string | null
          last_qualifying_day: string | null
          level: number | null
          mastered_courses: Json | null
          setup_complete: boolean | null
          streak_days: number | null
          study_preference: Json | null
          timeline: Json | null
          tour_seen: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          cgpa_actual?: Json | null
          cgpa_inputs?: Json | null
          cgpa_intro_seen?: boolean | null
          cgpa_plan?: Json | null
          data?: Json | null
          department?: string | null
          disclaimer_accepted?: boolean | null
          display_name?: string | null
          email?: string | null
          faculty?: string | null
          freeze_used_on?: string | null
          freezes_available?: number
          goal?: Json | null
          has_completed_first_mock?: boolean | null
          last_active_date?: string | null
          last_qualifying_day?: string | null
          level?: number | null
          mastered_courses?: Json | null
          setup_complete?: boolean | null
          streak_days?: number | null
          study_preference?: Json | null
          timeline?: Json | null
          tour_seen?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          cgpa_actual?: Json | null
          cgpa_inputs?: Json | null
          cgpa_intro_seen?: boolean | null
          cgpa_plan?: Json | null
          data?: Json | null
          department?: string | null
          disclaimer_accepted?: boolean | null
          display_name?: string | null
          email?: string | null
          faculty?: string | null
          freeze_used_on?: string | null
          freezes_available?: number
          goal?: Json | null
          has_completed_first_mock?: boolean | null
          last_active_date?: string | null
          last_qualifying_day?: string | null
          level?: number | null
          mastered_courses?: Json | null
          setup_complete?: boolean | null
          streak_days?: number | null
          study_preference?: Json | null
          timeline?: Json | null
          tour_seen?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          paid_until: string | null
          paying_user_number: number | null
          tier: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          paid_until?: string | null
          paying_user_number?: number | null
          tier?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          paid_until?: string | null
          paying_user_number?: number | null
          tier?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number | null
          created_at: string | null
          day: string
          feature: string
          id: string
          user_id: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          day: string
          feature: string
          id?: string
          user_id?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          day?: string
          feature?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_courses: {
        Row: {
          course_code: string | null
          course_name: string | null
          created_at: string | null
          id: string
          label_override: string | null
          source: string | null
          status: string | null
          test_settings: Json | null
          title: string | null
          units: number | null
          user_id: string | null
        }
        Insert: {
          course_code?: string | null
          course_name?: string | null
          created_at?: string | null
          id?: string
          label_override?: string | null
          source?: string | null
          status?: string | null
          test_settings?: Json | null
          title?: string | null
          units?: number | null
          user_id?: string | null
        }
        Update: {
          course_code?: string | null
          course_name?: string | null
          created_at?: string | null
          id?: string
          label_override?: string | null
          source?: string | null
          status?: string | null
          test_settings?: Json | null
          title?: string | null
          units?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_course_context: {
        Args: {
          match_count?: number
          match_course_code: string
          query_embedding: string
        }
        Returns: {
          content: string
          similarity: number
          title: string
        }[]
      }
      record_mock_streak: {
        Args: { answered_count: number }
        Returns: {
          event: string
          freeze_used_on: string
          freezes_available: number
          last_active_date: string
          streak_days: number
          today_wat: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
