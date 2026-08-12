-- Budget close tasks scoped by country
DROP POLICY IF EXISTS "Close tasks readable" ON public.budget_close_tasks;
DROP POLICY IF EXISTS "Close readable" ON public.budget_close_tasks;
CREATE POLICY "Close tasks readable by scoped users" ON public.budget_close_tasks FOR SELECT TO authenticated
USING (country_id IS NULL OR public.can_access_country(auth.uid(), country_id));

-- Budget scenarios scoped by country_scope
DROP POLICY IF EXISTS "Scenarios readable" ON public.budget_scenarios;
DROP POLICY IF EXISTS "Scenarios readable by authenticated" ON public.budget_scenarios;
CREATE POLICY "Scenarios readable by scoped users" ON public.budget_scenarios FOR SELECT TO authenticated
USING (country_scope IS NULL OR country_scope = '' OR public.can_access_country(auth.uid(), country_scope));

-- Role assignments: only own row, admins and directors
DROP POLICY IF EXISTS "Roles readable" ON public.user_roles;
DROP POLICY IF EXISTS "Roles readable by authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "User roles readable" ON public.user_roles;
CREATE POLICY "Roles readable by self or managers" ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'director'::app_role)
);

-- Helper so any user can notify approvers without reading the full role table
CREATE OR REPLACE FUNCTION public.approver_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin','director')
$$;

REVOKE EXECUTE ON FUNCTION public.approver_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approver_user_ids() TO authenticated, service_role;