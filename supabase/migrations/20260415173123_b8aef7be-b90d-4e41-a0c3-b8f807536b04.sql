
CREATE TABLE public.country_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text NOT NULL,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'info',
  author_id uuid,
  author_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.country_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes readable" ON public.country_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notes insertable" ON public.country_notes FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'country_manager')
);
CREATE POLICY "Notes updatable" ON public.country_notes FOR UPDATE TO authenticated USING (
  auth.uid() = author_id OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Notes deletable" ON public.country_notes FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
);

CREATE TRIGGER update_country_notes_updated_at BEFORE UPDATE ON public.country_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
