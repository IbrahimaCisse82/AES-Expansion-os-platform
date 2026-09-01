-- Pôles BI
CREATE TABLE public.bi_poles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'navy',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bi_poles TO authenticated;
GRANT ALL ON public.bi_poles TO service_role;
ALTER TABLE public.bi_poles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_poles_select" ON public.bi_poles FOR SELECT TO authenticated USING (true);
CREATE POLICY "bi_poles_admin_manage" ON public.bi_poles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_bi_poles_updated_at BEFORE UPDATE ON public.bi_poles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.bi_poles (code, label, color, sort_order) VALUES
  ('COMM', 'Commercial & Marketing', 'gold', 1),
  ('TECH', 'Technique & Opérations', 'accent', 2),
  ('ADM', 'Administratif & Financier', 'primary', 3),
  ('RH', 'Ressources Humaines', 'sage', 4),
  ('DG', 'Direction Générale', 'primary', 5),
  ('BOBO', 'Antenne Bobo-Dioulasso', 'accent', 6);

-- Sous-budgets projets
CREATE TABLE public.bi_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  country_id text REFERENCES public.countries(id),
  pole_id uuid REFERENCES public.bi_poles(id),
  start_date date,
  end_date date,
  budget_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  owner_id uuid,
  owner_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_projects TO authenticated;
GRANT ALL ON public.bi_projects TO service_role;
ALTER TABLE public.bi_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_projects_select" ON public.bi_projects FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
  OR country_id IS NULL OR public.can_access_country(auth.uid(), country_id)
);
CREATE POLICY "bi_projects_insert" ON public.bi_projects FOR INSERT TO authenticated WITH CHECK (
  NOT (public.has_role(auth.uid(), 'observer') OR public.has_role(auth.uid(), 'partner'))
  AND (country_id IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.can_access_country(auth.uid(), country_id))
);
CREATE POLICY "bi_projects_update" ON public.bi_projects FOR UPDATE TO authenticated USING (
  NOT (public.has_role(auth.uid(), 'observer') OR public.has_role(auth.uid(), 'partner'))
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR country_id IS NULL OR public.can_access_country(auth.uid(), country_id))
);
CREATE POLICY "bi_projects_delete" ON public.bi_projects FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE TRIGGER update_bi_projects_updated_at BEFORE UPDATE ON public.bi_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rapports sauvegardés du constructeur
CREATE TABLE public.bi_saved_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_id uuid,
  visibility text NOT NULL DEFAULT 'private',
  scope_country_id text REFERENCES public.countries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_saved_reports TO authenticated;
GRANT ALL ON public.bi_saved_reports TO service_role;
ALTER TABLE public.bi_saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_saved_reports_select" ON public.bi_saved_reports FOR SELECT TO authenticated USING (
  owner_id = auth.uid()
  OR (visibility = 'team' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR scope_country_id IS NULL OR public.can_access_country(auth.uid(), scope_country_id)))
);
CREATE POLICY "bi_saved_reports_insert" ON public.bi_saved_reports FOR INSERT TO authenticated WITH CHECK (
  owner_id = auth.uid() AND NOT (public.has_role(auth.uid(), 'observer') OR public.has_role(auth.uid(), 'partner'))
);
CREATE POLICY "bi_saved_reports_update" ON public.bi_saved_reports FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "bi_saved_reports_delete" ON public.bi_saved_reports FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER update_bi_saved_reports_updated_at BEFORE UPDATE ON public.bi_saved_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planifications d'envoi
CREATE TABLE public.bi_report_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid REFERENCES public.bi_saved_reports(id) ON DELETE CASCADE,
  template_code text,
  frequency text NOT NULL DEFAULT 'weekly',
  hour integer NOT NULL DEFAULT 8,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_report_schedules TO authenticated;
GRANT ALL ON public.bi_report_schedules TO service_role;
ALTER TABLE public.bi_report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_report_schedules_select" ON public.bi_report_schedules FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE POLICY "bi_report_schedules_insert" ON public.bi_report_schedules FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND NOT (public.has_role(auth.uid(), 'observer') OR public.has_role(auth.uid(), 'partner'))
);
CREATE POLICY "bi_report_schedules_update" ON public.bi_report_schedules FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE POLICY "bi_report_schedules_delete" ON public.bi_report_schedules FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE TRIGGER update_bi_report_schedules_updated_at BEFORE UPDATE ON public.bi_report_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Exemplaires des rapports opérationnels A1–A12
CREATE TABLE public.bi_report_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code text NOT NULL,
  title text NOT NULL,
  country_id text REFERENCES public.countries(id),
  pole_id uuid REFERENCES public.bi_poles(id),
  period text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  author_id uuid,
  author_name text,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_report_instances TO authenticated;
GRANT ALL ON public.bi_report_instances TO service_role;
ALTER TABLE public.bi_report_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_report_instances_select" ON public.bi_report_instances FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
  OR author_id = auth.uid()
  OR country_id IS NULL OR public.can_access_country(auth.uid(), country_id)
);
CREATE POLICY "bi_report_instances_insert" ON public.bi_report_instances FOR INSERT TO authenticated WITH CHECK (
  NOT (public.has_role(auth.uid(), 'observer') OR public.has_role(auth.uid(), 'partner'))
);
CREATE POLICY "bi_report_instances_update" ON public.bi_report_instances FOR UPDATE TO authenticated USING (
  author_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE POLICY "bi_report_instances_delete" ON public.bi_report_instances FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE TRIGGER update_bi_report_instances_updated_at BEFORE UPDATE ON public.bi_report_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Axes pôle / projet sur les données existantes
ALTER TABLE public.budget_lines ADD COLUMN pole_id uuid REFERENCES public.bi_poles(id);
ALTER TABLE public.budget_lines ADD COLUMN project_id uuid REFERENCES public.bi_projects(id);
ALTER TABLE public.tasks ADD COLUMN project_id uuid REFERENCES public.bi_projects(id);
ALTER TABLE public.risks ADD COLUMN project_id uuid REFERENCES public.bi_projects(id);

-- Vues d'agrégation (RLS des tables de base appliquée)
CREATE VIEW public.bi_budget_facts
WITH (security_invoker = true) AS
SELECT
  bl.id,
  bl.scenario_id,
  bl.country_id,
  bl.country_label,
  bl.pole_id,
  p.code AS pole_code,
  p.label AS pole_label,
  bl.project_id,
  bp.name AS project_name,
  bl.category_id,
  c.name AS category_name,
  c.type AS category_type,
  bl.line_type,
  bl.m1, bl.m2, bl.m3, bl.m4, bl.m5, bl.m6,
  bl.m7, bl.m8, bl.m9, bl.m10, bl.m11, bl.m12,
  (bl.m1+bl.m2+bl.m3+bl.m4+bl.m5+bl.m6+bl.m7+bl.m8+bl.m9+bl.m10+bl.m11+bl.m12) AS total
FROM public.budget_lines bl
LEFT JOIN public.bi_poles p ON p.id = bl.pole_id
LEFT JOIN public.bi_projects bp ON bp.id = bl.project_id
LEFT JOIN public.budget_categories c ON c.id = bl.category_id;
GRANT SELECT ON public.bi_budget_facts TO authenticated;
GRANT SELECT ON public.bi_budget_facts TO service_role;

CREATE VIEW public.bi_activity_facts
WITH (security_invoker = true) AS
SELECT
  t.id,
  'task'::text AS item_type,
  t.country_id,
  t.country_label,
  t.project_id,
  t.status::text AS status,
  t.created_at
FROM public.tasks t
UNION ALL
SELECT
  r.id,
  'risk'::text AS item_type,
  r.country_id,
  r.country_label,
  r.project_id,
  r.risk_status AS status,
  r.created_at
FROM public.risks r;
GRANT SELECT ON public.bi_activity_facts TO authenticated;
GRANT SELECT ON public.bi_activity_facts TO service_role;