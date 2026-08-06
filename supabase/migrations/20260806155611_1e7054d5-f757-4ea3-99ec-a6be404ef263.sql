ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS scope_country_id text REFERENCES public.countries(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.user_scope_country(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT scope_country_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_access_country(_user_id uuid, _country_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT scope_country_id IS NULL OR scope_country_id = _country_id
       FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    false)
$$;

REVOKE EXECUTE ON FUNCTION public.user_scope_country(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_country(uuid, text) FROM anon;

-- Budget lines: RAF peut écrire uniquement sur son pays
DROP POLICY IF EXISTS "Lines insertable" ON public.budget_lines;
CREATE POLICY "Lines insertable" ON public.budget_lines FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
  OR (has_role(auth.uid(), 'analyst') AND public.can_access_country(auth.uid(), country_id))
  OR (has_role(auth.uid(), 'raf') AND public.can_access_country(auth.uid(), country_id))
);

DROP POLICY IF EXISTS "Lines updatable" ON public.budget_lines;
CREATE POLICY "Lines updatable" ON public.budget_lines FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
  OR (has_role(auth.uid(), 'analyst') AND public.can_access_country(auth.uid(), country_id))
  OR (has_role(auth.uid(), 'raf') AND public.can_access_country(auth.uid(), country_id))
);

-- Budget entries
DROP POLICY IF EXISTS "Budget insertable" ON public.budget_entries;
CREATE POLICY "Budget insertable" ON public.budget_entries FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
  OR (has_role(auth.uid(), 'analyst') AND public.can_access_country(auth.uid(), country_id))
  OR (has_role(auth.uid(), 'raf') AND public.can_access_country(auth.uid(), country_id))
);

DROP POLICY IF EXISTS "Budget updatable" ON public.budget_entries;
CREATE POLICY "Budget updatable" ON public.budget_entries FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
  OR (has_role(auth.uid(), 'analyst') AND public.can_access_country(auth.uid(), country_id))
  OR (has_role(auth.uid(), 'raf') AND public.can_access_country(auth.uid(), country_id))
);

-- Journal entries: RAF sur son pays
DROP POLICY IF EXISTS "Journal insertable" ON public.budget_journal_entries;
CREATE POLICY "Journal insertable" ON public.budget_journal_entries FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst')
  OR (has_role(auth.uid(), 'raf') AND public.can_access_country(auth.uid(), country_id))
);

DROP POLICY IF EXISTS "Journal updatable" ON public.budget_journal_entries;
CREATE POLICY "Journal updatable" ON public.budget_journal_entries FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'analyst')
  OR (has_role(auth.uid(), 'raf') AND public.can_access_country(auth.uid(), country_id))
);