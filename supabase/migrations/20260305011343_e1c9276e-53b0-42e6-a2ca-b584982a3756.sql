
CREATE TABLE public.roadmap_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT 'sage',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Roadmap types readable" ON public.roadmap_types FOR SELECT USING (true);

-- Admin/director can manage
CREATE POLICY "Roadmap types insertable" ON public.roadmap_types FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

CREATE POLICY "Roadmap types updatable" ON public.roadmap_types FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

CREATE POLICY "Roadmap types deletable" ON public.roadmap_types FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

-- Seed default types
INSERT INTO public.roadmap_types (label, color, sort_order) VALUES
  ('Étude', 'sage', 0),
  ('Légal', 'gold', 1),
  ('Mise en place', 'sky', 2),
  ('Lancement', 'terracotta', 3);
