
-- 1. Country Documents table
CREATE TABLE public.country_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID,
  uploaded_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.country_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs readable" ON public.country_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Docs insertable" ON public.country_documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'country_manager'));
CREATE POLICY "Docs deletable" ON public.country_documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 2. Country Members table
CREATE TABLE public.country_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  role_in_country TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, user_id)
);
ALTER TABLE public.country_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members readable" ON public.country_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members insertable" ON public.country_members FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Members updatable" ON public.country_members FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Members deletable" ON public.country_members FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- 3. Risk History table
CREATE TABLE public.risk_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL,
  old_level TEXT,
  new_level TEXT,
  old_status TEXT,
  new_status TEXT,
  old_probability INTEGER,
  new_probability INTEGER,
  old_impact INTEGER,
  new_impact INTEGER,
  changed_by UUID,
  changed_by_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Risk history readable" ON public.risk_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Risk history insertable" ON public.risk_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subtasks readable" ON public.subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Subtasks insertable" ON public.subtasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Subtasks updatable" ON public.subtasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Subtasks deletable" ON public.subtasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Risk Categories table
CREATE TABLE public.risk_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Risk cats readable" ON public.risk_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Risk cats insertable" ON public.risk_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Risk cats updatable" ON public.risk_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Risk cats deletable" ON public.risk_categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- Insert default risk categories
INSERT INTO public.risk_categories (name, color, sort_order) VALUES
  ('Réglementaire', '#EF4444', 0),
  ('Financier', '#F59E0B', 1),
  ('Opérationnel', '#3B82F6', 2),
  ('Juridique', '#8B5CF6', 3),
  ('Commercial', '#10B981', 4),
  ('RH / Talent', '#EC4899', 5),
  ('Politique', '#6366F1', 6),
  ('Technologique', '#14B8A6', 7);

-- 6. Notification Preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notif_type TEXT NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notif_type)
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prefs readable by owner" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Prefs insertable by owner" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Prefs updatable by owner" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Storage bucket for country documents
INSERT INTO storage.buckets (id, name, public) VALUES ('country-documents', 'country-documents', false);

-- Storage policies
CREATE POLICY "Auth users can upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'country-documents');
CREATE POLICY "Auth users can view docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'country-documents');
CREATE POLICY "Admin/director can delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'country-documents' AND (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'director'))));

-- 8. Add risk_category_id to risks table
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.risk_categories(id);
