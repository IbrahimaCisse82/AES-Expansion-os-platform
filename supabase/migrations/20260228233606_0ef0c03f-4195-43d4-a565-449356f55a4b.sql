
-- =============================================
-- ExpansionOS Database Schema
-- =============================================

-- 1. Enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'director', 'country_manager', 'analyst', 'observer', 'partner');
CREATE TYPE public.country_status AS ENUM ('active', 'planning', 'done', 'paused');
CREATE TYPE public.task_status AS ENUM ('open', 'done', 'late', 'wip');
CREATE TYPE public.task_priority AS ENUM ('high', 'med', 'low');
CREATE TYPE public.risk_level AS ENUM ('high', 'medium', 'low');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#1C2B3A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'observer',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Countries table
CREATE TABLE public.countries (
  id TEXT PRIMARY KEY,
  flag TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  phase INTEGER NOT NULL DEFAULT 0,
  pct INTEGER NOT NULL DEFAULT 0,
  status country_status NOT NULL DEFAULT 'planning',
  color TEXT NOT NULL DEFAULT 'sage',
  budget TEXT NOT NULL DEFAULT '0',
  team_size INTEGER NOT NULL DEFAULT 0,
  risk_count INTEGER NOT NULL DEFAULT 0,
  population TEXT DEFAULT '',
  gdp TEXT DEFAULT '',
  language TEXT DEFAULT '',
  local_contact TEXT DEFAULT '',
  description TEXT DEFAULT '',
  kpi_ca TEXT DEFAULT 'N/A',
  kpi_clients TEXT DEFAULT 'N/A',
  kpi_nps TEXT DEFAULT 'N/A',
  kpi_retention TEXT DEFAULT 'N/A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- 6. Milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id TEXT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  icon TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  target_date TEXT DEFAULT '',
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- 7. Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  country_id TEXT REFERENCES public.countries(id) ON DELETE SET NULL,
  country_label TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  priority task_priority NOT NULL DEFAULT 'med',
  status task_status NOT NULL DEFAULT 'open',
  owner_name TEXT DEFAULT '',
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 8. Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID,
  author_name TEXT NOT NULL DEFAULT '',
  author_initials TEXT NOT NULL DEFAULT '',
  author_color TEXT NOT NULL DEFAULT '#1C2B3A',
  market_id TEXT REFERENCES public.countries(id) ON DELETE SET NULL,
  market_label TEXT DEFAULT '',
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 9. Risks table
CREATE TABLE public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  country_id TEXT REFERENCES public.countries(id) ON DELETE SET NULL,
  country_label TEXT DEFAULT '',
  category TEXT DEFAULT '',
  level risk_level NOT NULL DEFAULT 'medium',
  description TEXT DEFAULT '',
  mitigation TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

-- 10. Budget entries table
CREATE TABLE public.budget_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id TEXT REFERENCES public.countries(id) ON DELETE SET NULL,
  country_label TEXT DEFAULT '',
  category TEXT DEFAULT '',
  allocated_k INTEGER NOT NULL DEFAULT 0,
  spent_k INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT 'sage',
  fiscal_year INTEGER NOT NULL DEFAULT 2025,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

-- 11. Activity log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  market_flag TEXT DEFAULT '',
  color TEXT DEFAULT 'navy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 12. Roadmap bars
CREATE TABLE public.roadmap_bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id TEXT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  start_month INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'sage',
  label TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roadmap_bars ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Countries readable" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Countries insertable" ON public.countries FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);
CREATE POLICY "Countries updatable" ON public.countries FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Countries deletable" ON public.countries FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);

CREATE POLICY "Milestones readable" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Milestones insertable" ON public.milestones FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Milestones updatable" ON public.milestones FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Milestones deletable" ON public.milestones FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);

CREATE POLICY "Tasks readable" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks insertable" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Tasks updatable" ON public.tasks FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Tasks deletable" ON public.tasks FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);

CREATE POLICY "Comments readable" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comments insertable" ON public.comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Comments deletable" ON public.comments FOR DELETE TO authenticated USING (
  auth.uid() = author_id OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Risks readable" ON public.risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Risks insertable" ON public.risks FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Risks updatable" ON public.risks FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Risks deletable" ON public.risks FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);

CREATE POLICY "Budget readable" ON public.budget_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Budget insertable" ON public.budget_entries FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'analyst')
);
CREATE POLICY "Budget updatable" ON public.budget_entries FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'analyst')
);
CREATE POLICY "Budget deletable" ON public.budget_entries FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);

CREATE POLICY "Activity readable" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity insertable" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Roadmap readable" ON public.roadmap_bars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Roadmap insertable" ON public.roadmap_bars FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Roadmap updatable" ON public.roadmap_bars FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Roadmap deletable" ON public.roadmap_bars FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director')
);

-- =============================================
-- Triggers
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_updated_at BEFORE UPDATE ON public.budget_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2))
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'observer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
