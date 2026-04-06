
-- Budget scenarios (Base, Optimistic, Pessimistic)
CREATE TABLE public.budget_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  fiscal_year INTEGER NOT NULL DEFAULT 2025,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'locked')),
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scenarios readable" ON public.budget_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Scenarios insertable" ON public.budget_scenarios FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Scenarios updatable" ON public.budget_scenarios FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Scenarios deletable" ON public.budget_scenarios FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

CREATE TRIGGER update_budget_scenarios_updated_at BEFORE UPDATE ON public.budget_scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Budget categories (hierarchical)
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('revenue', 'expense')),
  parent_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories readable" ON public.budget_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Categories insertable" ON public.budget_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Categories updatable" ON public.budget_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Categories deletable" ON public.budget_categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- Budget lines (monthly granularity)
CREATE TABLE public.budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  country_id TEXT REFERENCES public.countries(id) ON DELETE SET NULL,
  country_label TEXT DEFAULT '',
  line_type TEXT NOT NULL DEFAULT 'budget' CHECK (line_type IN ('budget', 'actual', 'forecast')),
  m1 NUMERIC NOT NULL DEFAULT 0,
  m2 NUMERIC NOT NULL DEFAULT 0,
  m3 NUMERIC NOT NULL DEFAULT 0,
  m4 NUMERIC NOT NULL DEFAULT 0,
  m5 NUMERIC NOT NULL DEFAULT 0,
  m6 NUMERIC NOT NULL DEFAULT 0,
  m7 NUMERIC NOT NULL DEFAULT 0,
  m8 NUMERIC NOT NULL DEFAULT 0,
  m9 NUMERIC NOT NULL DEFAULT 0,
  m10 NUMERIC NOT NULL DEFAULT 0,
  m11 NUMERIC NOT NULL DEFAULT 0,
  m12 NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lines readable" ON public.budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lines insertable" ON public.budget_lines FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Lines updatable" ON public.budget_lines FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Lines deletable" ON public.budget_lines FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

CREATE TRIGGER update_budget_lines_updated_at BEFORE UPDATE ON public.budget_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default categories
INSERT INTO public.budget_categories (name, type, sort_order, is_system) VALUES
  ('Chiffre d''affaires', 'revenue', 1, true),
  ('Subventions & Aides', 'revenue', 2, true),
  ('Autres revenus', 'revenue', 3, true),
  ('Salaires & Charges', 'expense', 10, true),
  ('Marketing & Communication', 'expense', 11, true),
  ('Déplacements & Missions', 'expense', 12, true),
  ('Juridique & Conformité', 'expense', 13, true),
  ('Technologie & IT', 'expense', 14, true),
  ('Locaux & Bureaux', 'expense', 15, true),
  ('Sous-traitance', 'expense', 16, true),
  ('Frais généraux', 'expense', 17, true),
  ('CAPEX', 'expense', 20, true);
