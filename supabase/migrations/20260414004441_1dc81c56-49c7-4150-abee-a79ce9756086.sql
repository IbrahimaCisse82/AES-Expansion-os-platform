
-- Table for dynamic market intelligence data
CREATE TABLE public.market_intel_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL DEFAULT 'accords',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  countries text[] NOT NULL DEFAULT '{}',
  date text NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Actif',
  sector text NOT NULL DEFAULT '',
  amount text NULL DEFAULT '',
  partner text NULL DEFAULT '',
  organization text NULL DEFAULT '',
  type text NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}',
  source_url text NULL DEFAULT '',
  image_url text NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_intel_items ENABLE ROW LEVEL SECURITY;

-- Readable by all authenticated
CREATE POLICY "Market intel readable" ON public.market_intel_items
  FOR SELECT TO authenticated USING (true);

-- Insertable by admin, director, analyst
CREATE POLICY "Market intel insertable" ON public.market_intel_items
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'director') OR 
    has_role(auth.uid(), 'analyst')
  );

-- Updatable by admin, director, analyst
CREATE POLICY "Market intel updatable" ON public.market_intel_items
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'director') OR 
    has_role(auth.uid(), 'analyst')
  );

-- Deletable by admin, director
CREATE POLICY "Market intel deletable" ON public.market_intel_items
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'director')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_intel_items;
