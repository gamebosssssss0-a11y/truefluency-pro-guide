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
          course_code: string
          created_at: string
          generated_at: string
          id: string
          questions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          course_code?: string
          created_at?: string
          generated_at?: string
          id?: string
          questions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          course_code?: string
          created_at?: string
          generated_at?: string
          id?: string
          questions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          course_code: string
          created_at: string
          extracted_content: string | null
          extraction_error: string | null
          extraction_status: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          mime_type: string
          size_bytes: number
          user_id: string
        }
        Insert: {
          course_code: string
          created_at?: string
          extracted_content?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          mime_type: string
          size_bytes: number
          user_id: string
        }
        Update: {
          course_code?: string
          created_at?: string
          extracted_content?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          user_id?: string
        }
        Relationships: []
      }
      course_topic_analysis: {
        Row: {
          analyzed_at: string
          course_code: string
          created_at: string
          id: string
          material_id: string | null
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          analyzed_at?: string
          course_code: string
          created_at?: string
          id?: string
          material_id?: string | null
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          analyzed_at?: string
          course_code?: string
          created_at?: string
          id?: string
          material_id?: string | null
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
          answers: Json | null
          correct: number
          course_code: string
          course_title: string
          created_at: string
          id: string
          questions: Json | null
          score: number
          settings: Json | null
          submitted_at: string
          topics: Json
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          correct?: number
          course_code: string
          course_title?: string
          created_at?: string
          id: string
          questions?: Json | null
          score?: number
          settings?: Json | null
          submitted_at?: string
          topics?: Json
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          correct?: number
          course_code?: string
          course_title?: string
          created_at?: string
          id?: string
          questions?: Json | null
          score?: number
          settings?: Json | null
          submitted_at?: string
          topics?: Json
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cgpa_actual: Json | null
          cgpa_inputs: Json | null
          cgpa_intro_seen: boolean
          cgpa_plan: Json | null
          created_at: string
          department: string | null
          disclaimer_accepted: boolean
          display_name: string | null
          email: string | null
          faculty: string | null
          goal: string | null
          has_completed_first_mock: boolean
          last_qualifying_day: string | null
          level: number | null
          mastered_courses: Json
          setup_complete: boolean
          streak_days: number
          study_preference: string | null
          timeline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cgpa_actual?: Json | null
          cgpa_inputs?: Json | null
          cgpa_intro_seen?: boolean
          cgpa_plan?: Json | null
          created_at?: string
          department?: string | null
          disclaimer_accepted?: boolean
          display_name?: string | null
          email?: string | null
          faculty?: string | null
          goal?: string | null
          has_completed_first_mock?: boolean
          last_qualifying_day?: string | null
          level?: number | null
          mastered_courses?: Json
          setup_complete?: boolean
          streak_days?: number
          study_preference?: string | null
          timeline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cgpa_actual?: Json | null
          cgpa_inputs?: Json | null
          cgpa_intro_seen?: boolean
          cgpa_plan?: Json | null
          created_at?: string
          department?: string | null
          disclaimer_accepted?: boolean
          display_name?: string | null
          email?: string | null
          faculty?: string | null
          goal?: string | null
          has_completed_first_mock?: boolean
          last_qualifying_day?: string | null
          level?: number | null
          mastered_courses?: Json
          setup_complete?: boolean
          streak_days?: number
          study_preference?: string | null
          timeline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_courses: {
        Row: {
          course_code: string
          created_at: string
          id: string
          label_override: string | null
          source: string
          status: string
          test_settings: Json | null
          title: string
          units: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_code: string
          created_at?: string
          id?: string
          label_override?: string | null
          source?: string
          status?: string
          test_settings?: Json | null
          title?: string
          units?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_code?: string
          created_at?: string
          id?: string
          label_override?: string | null
          source?: string
          status?: string
          test_settings?: Json | null
          title?: string
          units?: number | null
          updated_at?: string
          user_id?: string
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
