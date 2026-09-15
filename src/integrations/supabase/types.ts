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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bi_poles: {
        Row: {
          code: string
          color: string
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bi_projects: {
        Row: {
          budget_total: number
          code: string
          country_id: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          pole_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_total?: number
          code: string
          country_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          pole_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_total?: number
          code?: string
          country_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          pole_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_projects_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_projects_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "bi_poles"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_report_instances: {
        Row: {
          author_id: string | null
          author_name: string | null
          country_id: string | null
          created_at: string
          data: Json
          id: string
          period: string
          pole_id: string | null
          sent_at: string | null
          status: string
          template_code: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          country_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          period?: string
          pole_id?: string | null
          sent_at?: string | null
          status?: string
          template_code: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          country_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          period?: string
          pole_id?: string | null
          sent_at?: string | null
          status?: string
          template_code?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_report_instances_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_report_instances_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "bi_poles"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_report_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          frequency: string
          hour: number
          id: string
          is_active: boolean
          last_sent_at: string | null
          recipients: Json
          report_id: string | null
          template_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          frequency?: string
          hour?: number
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          recipients?: Json
          report_id?: string | null
          template_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          frequency?: string
          hour?: number
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          recipients?: Json
          report_id?: string | null
          template_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "bi_saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_saved_reports: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string | null
          scope_country_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          scope_country_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          scope_country_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_saved_reports_scope_country_id_fkey"
            columns: ["scope_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
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
      budget_capex_items: {
        Row: {
          acquisition_cost: number
          acquisition_date: string
          category_id: string | null
          country_id: string | null
          country_label: string | null
          created_at: string
          depreciation_method: string
          id: string
          name: string
          notes: string | null
          salvage_value: number
          scenario_id: string
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          acquisition_cost?: number
          acquisition_date?: string
          category_id?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          depreciation_method?: string
          id?: string
          name: string
          notes?: string | null
          salvage_value?: number
          scenario_id: string
          updated_at?: string
          useful_life_months?: number
        }
        Update: {
          acquisition_cost?: number
          acquisition_date?: string
          category_id?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          depreciation_method?: string
          id?: string
          name?: string
          notes?: string | null
          salvage_value?: number
          scenario_id?: string
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_capex_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_capex_items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
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
      budget_close_tasks: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          country_id: string | null
          country_label: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          scenario_id: string
          status: string
          task_name: string
          task_order: number
          updated_at: string
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          scenario_id: string
          status?: string
          task_name: string
          task_order?: number
          updated_at?: string
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          scenario_id?: string
          status?: string
          task_name?: string
          task_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_close_tasks_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_cost_allocations: {
        Row: {
          allocation_key: string
          allocation_rules: Json
          created_at: string
          id: string
          is_applied: boolean
          name: string
          scenario_id: string
          source_category_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          allocation_key?: string
          allocation_rules?: Json
          created_at?: string
          id?: string
          is_applied?: boolean
          name: string
          scenario_id: string
          source_category_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          allocation_key?: string
          allocation_rules?: Json
          created_at?: string
          id?: string
          is_applied?: boolean
          name?: string
          scenario_id?: string
          source_category_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_cost_allocations_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_cost_allocations_source_category_id_fkey"
            columns: ["source_category_id"]
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
      budget_intercompany: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          description: string | null
          elimination_type: string
          id: string
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
          scenario_id: string
          source_country_id: string
          target_country_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          description?: string | null
          elimination_type?: string
          id?: string
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
          scenario_id: string
          source_country_id: string
          target_country_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          description?: string | null
          elimination_type?: string
          id?: string
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
          scenario_id?: string
          source_country_id?: string
          target_country_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_intercompany_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_intercompany_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_investments: {
        Row: {
          acquisition_cost: number
          acquisition_date: string | null
          book_value: number
          consolidation_method: string
          created_at: string
          id: string
          notes: string | null
          ownership_pct: number
          parent_entity_id: string
          parent_entity_label: string | null
          scenario_id: string
          status: string
          subsidiary_entity_id: string
          subsidiary_entity_label: string | null
          updated_at: string
        }
        Insert: {
          acquisition_cost?: number
          acquisition_date?: string | null
          book_value?: number
          consolidation_method?: string
          created_at?: string
          id?: string
          notes?: string | null
          ownership_pct?: number
          parent_entity_id: string
          parent_entity_label?: string | null
          scenario_id: string
          status?: string
          subsidiary_entity_id: string
          subsidiary_entity_label?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_cost?: number
          acquisition_date?: string | null
          book_value?: number
          consolidation_method?: string
          created_at?: string
          id?: string
          notes?: string | null
          ownership_pct?: number
          parent_entity_id?: string
          parent_entity_label?: string | null
          scenario_id?: string
          status?: string
          subsidiary_entity_id?: string
          subsidiary_entity_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_investments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          credit_amount: number
          debit_amount: number
          description: string
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          scenario_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          debit_amount?: number
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          scenario_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          debit_amount?: number
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          scenario_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_journal_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_journal_entries_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
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
          pole_id: string | null
          project_id: string | null
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
          pole_id?: string | null
          project_id?: string | null
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
          pole_id?: string | null
          project_id?: string | null
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
            foreignKeyName: "budget_lines_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "bi_poles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bi_projects"
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
      budget_scenario_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          scenario_id: string
          snapshot_data: Json
          version_name: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          scenario_id: string
          snapshot_data?: Json
          version_name: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          scenario_id?: string
          snapshot_data?: Json
          version_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_scenario_versions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_scenarios: {
        Row: {
          country_scope: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fiscal_year: number
          id: string
          is_baseline: boolean
          name: string
          rejected_at: string | null
          rejected_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          country_scope?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_year?: number
          id?: string
          is_baseline?: boolean
          name: string
          rejected_at?: string | null
          rejected_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          country_scope?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_year?: number
          id?: string
          is_baseline?: boolean
          name?: string
          rejected_at?: string | null
          rejected_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_segments: {
        Row: {
          color: string | null
          country_ids: string[]
          created_at: string
          id: string
          scenario_id: string
          segment_name: string
          segment_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          country_ids?: string[]
          created_at?: string
          id?: string
          scenario_id: string
          segment_name: string
          segment_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          country_ids?: string[]
          created_at?: string
          id?: string
          scenario_id?: string
          segment_name?: string
          segment_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_segments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_validation_rules: {
        Row: {
          category_id: string | null
          country_id: string | null
          created_at: string
          formula: string | null
          id: string
          is_active: boolean
          max_value: number | null
          min_value: number | null
          rule_name: string
          rule_type: string
          scenario_id: string
          severity: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          country_id?: string | null
          created_at?: string
          formula?: string | null
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          rule_name: string
          rule_type?: string
          scenario_id: string
          severity?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          country_id?: string | null
          created_at?: string
          formula?: string | null
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          rule_name?: string
          rule_type?: string
          scenario_id?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_validation_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_validation_rules_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_by: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_by?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_name: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_name?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_name?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
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
          parent_id: string | null
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
          parent_id?: string | null
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
          parent_id?: string | null
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
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
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
          exchange_rate_to_fcfa: number
          flag: string
          gdp: string | null
          id: string
          kpi_ca: string | null
          kpi_clients: string | null
          kpi_nps: string | null
          kpi_retention: string | null
          language: string | null
          local_contact: string | null
          local_currency: string
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
          exchange_rate_to_fcfa?: number
          flag?: string
          gdp?: string | null
          id: string
          kpi_ca?: string | null
          kpi_clients?: string | null
          kpi_nps?: string | null
          kpi_retention?: string | null
          language?: string | null
          local_contact?: string | null
          local_currency?: string
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
          exchange_rate_to_fcfa?: number
          flag?: string
          gdp?: string | null
          id?: string
          kpi_ca?: string | null
          kpi_clients?: string | null
          kpi_nps?: string | null
          kpi_retention?: string | null
          language?: string | null
          local_contact?: string | null
          local_currency?: string
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
      country_documents: {
        Row: {
          country_id: string
          created_at: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          name: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          name: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          name?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: []
      }
      country_members: {
        Row: {
          country_id: string
          created_at: string
          id: string
          role_in_country: string
          user_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          role_in_country?: string
          user_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          role_in_country?: string
          user_id?: string
        }
        Relationships: []
      }
      country_notes: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string
          country_id: string
          created_at: string
          id: string
          note_type: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content: string
          country_id: string
          created_at?: string
          id?: string
          note_type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string
          country_id?: string
          created_at?: string
          id?: string
          note_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_kpi_definitions: {
        Row: {
          aggregation: string
          created_at: string
          id: string
          name: string
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          aggregation?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          aggregation?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_kpi_values: {
        Row: {
          country_id: string
          created_at: string
          id: string
          kpi_id: string
          month: string
          target_value: number
          updated_at: string
          value: number
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          kpi_id: string
          month: string
          target_value?: number
          updated_at?: string
          value?: number
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          kpi_id?: string
          month?: string
          target_value?: number
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_kpi_values_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "custom_kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency_code: string
          effective_date: string
          id: string
          notes: string | null
          rate_to_fcfa: number
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          effective_date?: string
          id?: string
          notes?: string | null
          rate_to_fcfa: number
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          effective_date?: string
          id?: string
          notes?: string | null
          rate_to_fcfa?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_history: {
        Row: {
          ca: number
          clients: number
          country_id: string
          created_at: string
          id: string
          month: string
          notes: string | null
          nps: number
          retention: number
          target_ca: number
          target_clients: number
          target_nps: number
          target_retention: number
          updated_at: string
        }
        Insert: {
          ca?: number
          clients?: number
          country_id: string
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          nps?: number
          retention?: number
          target_ca?: number
          target_clients?: number
          target_nps?: number
          target_retention?: number
          updated_at?: string
        }
        Update: {
          ca?: number
          clients?: number
          country_id?: string
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          nps?: number
          retention?: number
          target_ca?: number
          target_clients?: number
          target_nps?: number
          target_retention?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_intel_items: {
        Row: {
          amount: string | null
          category: string
          countries: string[]
          created_at: string
          date: string | null
          description: string
          details: Json
          id: string
          image_url: string | null
          organization: string | null
          partner: string | null
          sector: string
          source_url: string | null
          status: string
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          amount?: string | null
          category?: string
          countries?: string[]
          created_at?: string
          date?: string | null
          description?: string
          details?: Json
          id?: string
          image_url?: string | null
          organization?: string | null
          partner?: string | null
          sector?: string
          source_url?: string | null
          status?: string
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: string | null
          category?: string
          countries?: string[]
          created_at?: string
          date?: string | null
          description?: string
          details?: Json
          id?: string
          image_url?: string | null
          organization?: string | null
          partner?: string | null
          sector?: string
          source_url?: string | null
          status?: string
          title?: string
          type?: string | null
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
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      phase_checklist_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          country_id: string
          created_at: string
          id: string
          is_checked: boolean
          label: string
          phase: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          country_id: string
          created_at?: string
          id?: string
          is_checked?: boolean
          label: string
          phase?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          country_id?: string
          created_at?: string
          id?: string
          is_checked?: boolean
          label?: string
          phase?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          full_name: string
          id: string
          initials: string
          notification_preferences: Json
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          full_name: string
          id?: string
          initials?: string
          notification_preferences?: Json
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id?: string
          initials?: string
          notification_preferences?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      risk_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_impact: number | null
          new_level: string | null
          new_probability: number | null
          new_status: string | null
          note: string | null
          old_impact: number | null
          old_level: string | null
          old_probability: number | null
          old_status: string | null
          risk_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_impact?: number | null
          new_level?: string | null
          new_probability?: number | null
          new_status?: string | null
          note?: string | null
          old_impact?: number | null
          old_level?: string | null
          old_probability?: number | null
          old_status?: string | null
          risk_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_impact?: number | null
          new_level?: string | null
          new_probability?: number | null
          new_status?: string | null
          note?: string | null
          old_impact?: number | null
          old_level?: string | null
          old_probability?: number | null
          old_status?: string | null
          risk_id?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          category: string | null
          category_id: string | null
          country_id: string | null
          country_label: string | null
          created_at: string
          description: string | null
          estimated_cost: number
          id: string
          impact: number
          level: Database["public"]["Enums"]["risk_level"]
          mitigation: string | null
          owner_id: string | null
          owner_name: string | null
          probability: number
          project_id: string | null
          review_date: string | null
          risk_status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number
          id?: string
          impact?: number
          level?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          owner_id?: string | null
          owner_name?: string | null
          probability?: number
          project_id?: string | null
          review_date?: string | null
          risk_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          country_id?: string | null
          country_label?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number
          id?: string
          impact?: number
          level?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          owner_id?: string | null
          owner_name?: string | null
          probability?: number
          project_id?: string | null
          review_date?: string | null
          risk_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "risk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_bars: {
        Row: {
          color: string
          country_id: string
          created_at: string
          depends_on: string | null
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
          depends_on?: string | null
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
          depends_on?: string | null
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
          {
            foreignKeyName: "roadmap_bars_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "roadmap_bars"
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
      subtasks: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          sort_order: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          country_id: string
          country_label: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          owner_name: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence: string
          recurrence_interval: number
          recurrence_next_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          country_id: string
          country_label?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: string
          recurrence_interval?: number
          recurrence_next_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          country_id?: string
          country_label?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: string
          recurrence_interval?: number
          recurrence_next_date?: string | null
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
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope_country_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_country_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_country_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_scope_country_id_fkey"
            columns: ["scope_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bi_activity_facts: {
        Row: {
          country_id: string | null
          country_label: string | null
          created_at: string | null
          id: string | null
          item_type: string | null
          project_id: string | null
          status: string | null
        }
        Relationships: []
      }
      bi_budget_facts: {
        Row: {
          category_id: string | null
          category_name: string | null
          category_type: string | null
          country_id: string | null
          country_label: string | null
          id: string | null
          line_type: string | null
          m1: number | null
          m10: number | null
          m11: number | null
          m12: number | null
          m2: number | null
          m3: number | null
          m4: number | null
          m5: number | null
          m6: number | null
          m7: number | null
          m8: number | null
          m9: number | null
          pole_code: string | null
          pole_id: string | null
          pole_label: string | null
          project_id: string | null
          project_name: string | null
          scenario_id: string | null
          total: number | null
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
            foreignKeyName: "budget_lines_pole_id_fkey"
            columns: ["pole_id"]
            isOneToOne: false
            referencedRelation: "bi_poles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bi_projects"
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
    }
    Functions: {
      approver_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      can_access_country: {
        Args: { _country_id: string; _user_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _link?: string
          _message?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_scope_country: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "director"
        | "country_manager"
        | "analyst"
        | "observer"
        | "partner"
        | "raf"
        | "dhr"
        | "technical_director"
        | "commercial_director"
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
    Enums: {
      app_role: [
        "admin",
        "director",
        "country_manager",
        "analyst",
        "observer",
        "partner",
        "raf",
        "dhr",
        "technical_director",
        "commercial_director",
      ],
      country_status: ["active", "planning", "done", "paused"],
      risk_level: ["high", "medium", "low"],
      task_priority: ["high", "med", "low"],
      task_status: ["open", "done", "late", "wip"],
    },
  },
} as const
