-- Insert default KPI alert threshold setting (80%)
INSERT INTO public.app_settings (key, value) 
VALUES ('kpi_alert_threshold', '80')
ON CONFLICT (key) DO NOTHING;