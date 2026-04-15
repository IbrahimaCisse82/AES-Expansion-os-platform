
-- Add recurrence fields to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_next_date text;

-- Add dependency to roadmap_bars
ALTER TABLE public.roadmap_bars
ADD COLUMN IF NOT EXISTS depends_on uuid REFERENCES public.roadmap_bars(id) ON DELETE SET NULL;

-- Custom KPI definitions
CREATE TABLE IF NOT EXISTS public.custom_kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT '',
  aggregation text NOT NULL DEFAULT 'sum',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom KPI defs readable" ON public.custom_kpi_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Custom KPI defs insertable" ON public.custom_kpi_definitions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Custom KPI defs updatable" ON public.custom_kpi_definitions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Custom KPI defs deletable" ON public.custom_kpi_definitions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- Custom KPI values
CREATE TABLE IF NOT EXISTS public.custom_kpi_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.custom_kpi_definitions(id) ON DELETE CASCADE,
  country_id text NOT NULL,
  month text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kpi_id, country_id, month)
);

ALTER TABLE public.custom_kpi_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom KPI vals readable" ON public.custom_kpi_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Custom KPI vals insertable" ON public.custom_kpi_values FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Custom KPI vals updatable" ON public.custom_kpi_values FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst'));
CREATE POLICY "Custom KPI vals deletable" ON public.custom_kpi_values FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- Comment attachments
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments readable" ON public.comment_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Attachments insertable" ON public.comment_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Attachments deletable" ON public.comment_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Create storage bucket for comment attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('comment-attachments', 'comment-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Comment attachments readable" ON storage.objects FOR SELECT USING (bucket_id = 'comment-attachments');
CREATE POLICY "Comment attachments uploadable" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comment-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Comment attachments deletable" ON storage.objects FOR DELETE USING (bucket_id = 'comment-attachments' AND auth.uid() IS NOT NULL);
