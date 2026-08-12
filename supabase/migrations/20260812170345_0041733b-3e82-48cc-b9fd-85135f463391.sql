DROP POLICY IF EXISTS "Line comments readable" ON public.budget_line_comments;
DROP POLICY IF EXISTS "Comments readable" ON public.budget_line_comments;
DROP POLICY IF EXISTS "Budget line comments readable" ON public.budget_line_comments;
CREATE POLICY "Line comments readable by scoped users" ON public.budget_line_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budget_lines bl
    WHERE bl.id = budget_line_comments.budget_line_id
      AND (bl.country_id IS NULL OR public.can_access_country(auth.uid(), bl.country_id))
  )
);

DROP POLICY IF EXISTS "Risk history readable" ON public.risk_history;
DROP POLICY IF EXISTS "Risk history readable by authenticated" ON public.risk_history;
CREATE POLICY "Risk history readable by scoped users" ON public.risk_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.risks r
    WHERE r.id = risk_history.risk_id
      AND (r.country_id IS NULL OR public.can_access_country(auth.uid(), r.country_id))
  )
);