CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by authenticated" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Settings updatable by admin/director" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

CREATE POLICY "Settings insertable by admin/director" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

INSERT INTO public.app_settings (key, value) VALUES ('kpi_alert_threshold', '80');