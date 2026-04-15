
-- 1. Phase checklist items table
CREATE TABLE public.phase_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id text NOT NULL,
  phase integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  checked_by uuid,
  checked_at timestamp with time zone,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.phase_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checklist readable" ON public.phase_checklist_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Checklist insertable" ON public.phase_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role) OR has_role(auth.uid(), 'country_manager'::app_role));

CREATE POLICY "Checklist updatable" ON public.phase_checklist_items
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role) OR has_role(auth.uid(), 'country_manager'::app_role));

CREATE POLICY "Checklist deletable" ON public.phase_checklist_items
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE TRIGGER update_phase_checklist_items_updated_at
  BEFORE UPDATE ON public.phase_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Risks table enhancements
ALTER TABLE public.risks
  ADD COLUMN probability integer NOT NULL DEFAULT 3,
  ADD COLUMN impact integer NOT NULL DEFAULT 3,
  ADD COLUMN risk_status text NOT NULL DEFAULT 'open',
  ADD COLUMN owner_id uuid,
  ADD COLUMN owner_name text DEFAULT '',
  ADD COLUMN review_date text,
  ADD COLUMN estimated_cost numeric NOT NULL DEFAULT 0;
