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
      activity_log: {
        Row: {
          action: string
          color: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          market_flag: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          color?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          market_flag?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          color?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          market_flag?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      budget_audit_log: {
        Row: {
          budget_line_id: string
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          budget_line_id: string
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          budget_line_id?: string
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_entries: {
        Row: {
          allocated_k: number
          category: string | null
          color: string | null
          country_id: string | null
          country_label: string | null
          created_at: string
          fiscal_year: number
          id: string
          spent_k: number
          updated_at: string
        }
        Insert: {
          allocated_k?: number
          category?: string | null
          color?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          fiscal_year?: number
          id?: string
          spent_k?: number
          updated_at?: string
        }
        Update: {
          allocated_k?: number
          category?: string | null
          color?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          fiscal_year?: number
          id?: string
          spent_k?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          budget_line_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          budget_line_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          budget_line_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          category_id: string
          country_id: string | null
          country_label: string | null
          created_at: string
          id: string
          line_type: string
          m1: number
          m10: number
          m11: number
          m12: number
          m2: number
          m3: number
          m4: number
          m5: number
          m6: number
          m7: number
          m8: number
          m9: number
          notes: string | null
          scenario_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          id?: string
          line_type?: string
          m1?: number
          m10?: number
          m11?: number
          m12?: number
          m2?: number
          m3?: number
          m4?: number
          m5?: number
          m6?: number
          m7?: number
          m8?: number
          m9?: number
          notes?: string | null
          scenario_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          id?: string
          line_type?: string
          m1?: number
          m10?: number
          m11?: number
          m12?: number
          m2?: number
          m3?: number
          m4?: number
          m5?: number
          m6?: number
          m7?: number
          m8?: number
          m9?: number
          notes?: string | null
          scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          scenario_id: string
          scenario_name: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          scenario_id: string
          scenario_name?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          scenario_id?: string
          scenario_name?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_scenarios: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fiscal_year: number
          id: string
          is_baseline: boolean
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_year?: number
          id?: string
          is_baseline?: boolean
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_year?: number
          id?: string
          is_baseline?: boolean
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_color: string
          author_id: string | null
          author_initials: string
          author_name: string
          content: string
          created_at: string
          id: string
          market_id: string | null
          market_label: string | null
          tags: string[] | null
        }
        Insert: {
          author_color?: string
          author_id?: string | null
          author_initials?: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          market_id?: string | null
          market_label?: string | null
          tags?: string[] | null
        }
        Update: {
          author_color?: string
          author_id?: string | null
          author_initials?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          market_id?: string | null
          market_label?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          budget: string
          color: string
          created_at: string
          description: string | null
          flag: string
          gdp: string | null
          id: string
          kpi_ca: string | null
          kpi_clients: string | null
          kpi_nps: string | null
          kpi_retention: string | null
          language: string | null
          local_contact: string | null
          name: string
          pct: number
          phase: number
          population: string | null
          region: string
          risk_count: number
          status: Database["public"]["Enums"]["country_status"]
          team_size: number
          updated_at: string
        }
        Insert: {
          budget?: string
          color?: string
          created_at?: string
          description?: string | null
          flag?: string
          gdp?: string | null
          id: string
          kpi_ca?: string | null
          kpi_clients?: string | null
          kpi_nps?: string | null
          kpi_retention?: string | null
          language?: string | null
          local_contact?: string | null
          name: string
          pct?: number
          phase?: number
          population?: string | null
          region?: string
          risk_count?: number
          status?: Database["public"]["Enums"]["country_status"]
          team_size?: number
          updated_at?: string
        }
        Update: {
          budget?: string
          color?: string
          created_at?: string
          description?: string | null
          flag?: string
          gdp?: string | null
          id?: string
          kpi_ca?: string | null
          kpi_clients?: string | null
          kpi_nps?: string | null
          kpi_retention?: string | null
          language?: string | null
          local_contact?: string | null
          name?: string
          pct?: number
          phase?: number
          population?: string | null
          region?: string
          risk_count?: number
          status?: Database["public"]["Enums"]["country_status"]
          team_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          country_id: string
          created_at: string
          end_date: string | null
          icon: string
          id: string
          is_done: boolean
          sort_order: number
          start_date: string | null
          target_date: string | null
          title: string
        }
        Insert: {
          country_id: string
          created_at?: string
          end_date?: string | null
          icon?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          start_date?: string | null
          target_date?: string | null
          title: string
        }
        Update: {
          country_id?: string
          created_at?: string
          end_date?: string | null
          icon?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          start_date?: string | null
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          full_name: string
          id: string
          initials: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          full_name: string
          id?: string
          initials?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id?: string
          initials?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          category: string | null
          country_id: string | null
          country_label: string | null
          created_at: string
          description: string | null
          id: string
          level: Database["public"]["Enums"]["risk_level"]
          mitigation: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_bars: {
        Row: {
          color: string
          country_id: string
          created_at: string
          end_month: number
          id: string
          label: string
          sort_order: number
          start_month: number
        }
        Insert: {
          color?: string
          country_id: string
          created_at?: string
          end_month: number
          id?: string
          label?: string
          sort_order?: number
          start_month: number
        }
        Update: {
          color?: string
          country_id?: string
          created_at?: string
          end_month?: number
          id?: string
          label?: string
          sort_order?: number
          start_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_bars_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_types: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          country_id: string | null
          country_label: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          owner_name: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "director"
        | "country_manager"
        | "analyst"
        | "observer"
        | "partner"
      country_status: "active" | "planning" | "done" | "paused"
      risk_level: "high" | "medium" | "low"
      task_priority: "high" | "med" | "low"
      task_status: "open" | "done" | "late" | "wip"
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
    Enums: {
      app_role: [
        "admin",
        "director",
        "country_manager",
        "analyst",
        "observer",
        "partner",
      ],
      country_status: ["active", "planning", "done", "paused"],
      risk_level: ["high", "medium", "low"],
      task_priority: ["high", "med", "low"],
      task_status: ["open", "done", "late", "wip"],
    },
  },
} as const
