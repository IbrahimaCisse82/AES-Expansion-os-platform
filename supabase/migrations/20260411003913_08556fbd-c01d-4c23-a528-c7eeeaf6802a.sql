
-- 1. Journal Entries (écritures de consolidation)
CREATE TABLE public.budget_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  entry_date text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  entry_type text NOT NULL DEFAULT 'adjustment',
  country_id text,
  category_id uuid REFERENCES public.budget_categories(id),
  debit_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "JE readable" ON public.budget_journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "JE insertable" ON public.budget_journal_entries FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "JE updatable" ON public.budget_journal_entries FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "JE deletable" ON public.budget_journal_entries FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 2. Close Management Tasks
CREATE TABLE public.budget_close_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  country_id text,
  country_label text DEFAULT '',
  task_name text NOT NULL,
  task_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  assigned_name text DEFAULT '',
  due_date text DEFAULT '',
  completed_at timestamptz,
  completed_by uuid,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_close_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Close readable" ON public.budget_close_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Close insertable" ON public.budget_close_tasks FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Close updatable" ON public.budget_close_tasks FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Close deletable" ON public.budget_close_tasks FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 3. Validation Rules
CREATE TABLE public.budget_validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_type text NOT NULL DEFAULT 'range',
  category_id uuid REFERENCES public.budget_categories(id),
  country_id text,
  min_value numeric,
  max_value numeric,
  formula text DEFAULT '',
  severity text NOT NULL DEFAULT 'warning',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_validation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VR readable" ON public.budget_validation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "VR insertable" ON public.budget_validation_rules FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "VR updatable" ON public.budget_validation_rules FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "VR deletable" ON public.budget_validation_rules FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 4. Investment Register
CREATE TABLE public.budget_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  parent_entity_id text NOT NULL,
  parent_entity_label text DEFAULT '',
  subsidiary_entity_id text NOT NULL,
  subsidiary_entity_label text DEFAULT '',
  ownership_pct numeric NOT NULL DEFAULT 100,
  acquisition_date text DEFAULT '',
  acquisition_cost numeric NOT NULL DEFAULT 0,
  book_value numeric NOT NULL DEFAULT 0,
  consolidation_method text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'active',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inv readable" ON public.budget_investments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv insertable" ON public.budget_investments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Inv updatable" ON public.budget_investments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Inv deletable" ON public.budget_investments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 5. Segments for consolidation grouping
CREATE TABLE public.budget_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  segment_name text NOT NULL,
  segment_type text NOT NULL DEFAULT 'region',
  country_ids text[] NOT NULL DEFAULT '{}',
  color text DEFAULT '#6B7280',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seg readable" ON public.budget_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Seg insertable" ON public.budget_segments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Seg updatable" ON public.budget_segments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Seg deletable" ON public.budget_segments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- Triggers for updated_at
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.budget_journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_close_tasks_updated_at BEFORE UPDATE ON public.budget_close_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_validation_rules_updated_at BEFORE UPDATE ON public.budget_validation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.budget_investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.budget_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
