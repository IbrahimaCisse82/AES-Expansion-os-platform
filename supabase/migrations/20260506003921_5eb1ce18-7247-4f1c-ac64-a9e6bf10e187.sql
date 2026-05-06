
CREATE TABLE public.exchange_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code text NOT NULL,
  rate_to_fcfa numeric NOT NULL CHECK (rate_to_fcfa > 0),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'manual',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (currency_code, effective_date)
);

CREATE INDEX idx_exchange_rates_currency_date ON public.exchange_rates (currency_code, effective_date DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates readable by authenticated"
ON public.exchange_rates FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Exchange rates insertable by admin/director"
ON public.exchange_rates FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Exchange rates updatable by admin/director"
ON public.exchange_rates FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Exchange rates deletable by admin/director"
ON public.exchange_rates FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE TRIGGER trg_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed indicative rates (BCEAO reference values, to be updated)
INSERT INTO public.exchange_rates (currency_code, rate_to_fcfa, effective_date, source, notes) VALUES
  ('FCFA', 1, CURRENT_DATE, 'pivot', 'Devise pivot'),
  ('XOF', 1, CURRENT_DATE, 'pivot', 'Identique au FCFA'),
  ('XAF', 1, CURRENT_DATE, 'pivot', 'Identique au FCFA'),
  ('EUR', 655.957, CURRENT_DATE, 'BCEAO', 'Parité fixe EUR/XOF'),
  ('USD', 605.000, CURRENT_DATE, 'BCEAO', 'Indicatif'),
  ('GBP', 765.000, CURRENT_DATE, 'BCEAO', 'Indicatif'),
  ('NGN', 0.380, CURRENT_DATE, 'manual', 'Indicatif'),
  ('KES', 4.700, CURRENT_DATE, 'manual', 'Indicatif'),
  ('ZAR', 33.500, CURRENT_DATE, 'manual', 'Indicatif'),
  ('MAD', 60.500, CURRENT_DATE, 'manual', 'Indicatif'),
  ('EGP', 12.300, CURRENT_DATE, 'manual', 'Indicatif'),
  ('GHS', 38.000, CURRENT_DATE, 'manual', 'Indicatif');
