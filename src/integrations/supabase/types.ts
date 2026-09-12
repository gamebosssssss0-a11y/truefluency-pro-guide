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
        Relationships: [
          {
            foreignKeyName: "ai_question_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          is_peer_copy: boolean
          mime_type: string
          peer_alias: string | null
          published: boolean
          published_at: string | null
          show_owner_name: boolean
          show_owner_photo: boolean
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
          is_peer_copy?: boolean
          mime_type: string
          peer_alias?: string | null
          published?: boolean
          published_at?: string | null
          show_owner_name?: boolean
          show_owner_photo?: boolean
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
          is_peer_copy?: boolean
          mime_type?: string
          peer_alias?: string | null
          published?: boolean
          published_at?: string | null
          show_owner_name?: boolean
          show_owner_photo?: boolean
          size_bytes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "course_topic_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "library_shares_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "mock_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
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
          avatar_path?: string | null
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
          avatar_path?: string | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          paid_until: string | null
          paying_user_number: number | null
          tier: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          paid_until?: string | null
          paying_user_number?: number | null
          tier?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          paid_until?: string | null
          paying_user_number?: number | null
          tier?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          count: number
          created_at: string
          day: string
          feature: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          day?: string
          feature: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          feature?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_full_access: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      set_updated_at: {
        Args: Record<string, never>
        Returns: undefined
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

type PublicSchema = Database["public"]

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"]),
> = (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
    Row: infer R
  }
  ? R
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never

export type TablesRow<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"],
> = PublicSchema["Enums"][PublicEnumNameOrOptions]

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"],
> = PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
