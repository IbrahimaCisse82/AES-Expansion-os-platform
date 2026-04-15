
CREATE TABLE public.kpi_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id TEXT NOT NULL,
  month TEXT NOT NULL,
  ca NUMERIC NOT NULL DEFAULT 0,
  clients INTEGER NOT NULL DEFAULT 0,
  nps NUMERIC NOT NULL DEFAULT 0,
  retention NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT kpi_history_country_month_unique UNIQUE (country_id, month)
);

CREATE INDEX idx_kpi_history_country ON public.kpi_history(country_id);
CREATE INDEX idx_kpi_history_month ON public.kpi_history(month);

ALTER TABLE public.kpi_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KPI history readable" ON public.kpi_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "KPI history insertable" ON public.kpi_history
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "KPI history updatable" ON public.kpi_history
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "KPI history deletable" ON public.kpi_history
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
  );

CREATE TRIGGER update_kpi_history_updated_at
  BEFORE UPDATE ON public.kpi_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
