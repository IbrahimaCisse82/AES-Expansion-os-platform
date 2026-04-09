
-- 1. Scenario Versioning (snapshots)
CREATE TABLE public.budget_scenario_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  version_name text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  snapshot_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_scenario_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Versions readable" ON public.budget_scenario_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Versions insertable" ON public.budget_scenario_versions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Versions deletable" ON public.budget_scenario_versions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 2. Intercompany Eliminations
CREATE TABLE public.budget_intercompany (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  source_country_id text NOT NULL,
  target_country_id text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  elimination_type text NOT NULL DEFAULT 'revenue_expense',
  m1 numeric NOT NULL DEFAULT 0, m2 numeric NOT NULL DEFAULT 0, m3 numeric NOT NULL DEFAULT 0,
  m4 numeric NOT NULL DEFAULT 0, m5 numeric NOT NULL DEFAULT 0, m6 numeric NOT NULL DEFAULT 0,
  m7 numeric NOT NULL DEFAULT 0, m8 numeric NOT NULL DEFAULT 0, m9 numeric NOT NULL DEFAULT 0,
  m10 numeric NOT NULL DEFAULT 0, m11 numeric NOT NULL DEFAULT 0, m12 numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_intercompany ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IC readable" ON public.budget_intercompany FOR SELECT TO authenticated USING (true);
CREATE POLICY "IC insertable" ON public.budget_intercompany FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "IC updatable" ON public.budget_intercompany FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "IC deletable" ON public.budget_intercompany FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 3. Cost Allocation Rules
CREATE TABLE public.budget_cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_category_id uuid NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  allocation_key text NOT NULL DEFAULT 'equal',
  allocation_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  is_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_cost_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alloc readable" ON public.budget_cost_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Alloc insertable" ON public.budget_cost_allocations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Alloc updatable" ON public.budget_cost_allocations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Alloc deletable" ON public.budget_cost_allocations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 4. CapEx Items
CREATE TABLE public.budget_capex_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  name text NOT NULL,
  country_id text,
  country_label text DEFAULT '',
  category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  acquisition_date text NOT NULL DEFAULT '',
  acquisition_cost numeric NOT NULL DEFAULT 0,
  useful_life_months integer NOT NULL DEFAULT 60,
  depreciation_method text NOT NULL DEFAULT 'linear',
  salvage_value numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_capex_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CapEx readable" ON public.budget_capex_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "CapEx insertable" ON public.budget_capex_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "CapEx updatable" ON public.budget_capex_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "CapEx deletable" ON public.budget_capex_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 5. Add currency fields to countries
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS local_currency text NOT NULL DEFAULT 'FCFA';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS exchange_rate_to_fcfa numeric NOT NULL DEFAULT 1;

-- 6. Add workflow fields to budget_scenarios
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS reviewer_id uuid;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS review_notes text DEFAULT '';
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS country_scope text DEFAULT '';

-- Triggers for updated_at
CREATE TRIGGER update_budget_intercompany_updated_at BEFORE UPDATE ON public.budget_intercompany FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_cost_allocations_updated_at BEFORE UPDATE ON public.budget_cost_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_capex_items_updated_at BEFORE UPDATE ON public.budget_capex_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
