
DROP POLICY IF EXISTS "Countries readable" ON public.countries;
CREATE POLICY "Countries readable" ON public.countries FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), id));

DROP POLICY IF EXISTS "Tasks readable" ON public.tasks;
CREATE POLICY "Tasks readable" ON public.tasks FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Risks readable" ON public.risks;
CREATE POLICY "Risks readable" ON public.risks FOR SELECT TO authenticated
  USING (country_id IS NULL OR public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Milestones readable" ON public.milestones;
CREATE POLICY "Milestones readable" ON public.milestones FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "KPI history readable" ON public.kpi_history;
CREATE POLICY "KPI history readable" ON public.kpi_history FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Custom KPI vals readable" ON public.custom_kpi_values;
CREATE POLICY "Custom KPI vals readable" ON public.custom_kpi_values FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Checklist readable" ON public.phase_checklist_items;
CREATE POLICY "Checklist readable" ON public.phase_checklist_items FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Notes readable" ON public.country_notes;
CREATE POLICY "Notes readable" ON public.country_notes FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Docs readable" ON public.country_documents;
CREATE POLICY "Docs readable" ON public.country_documents FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Roadmap readable" ON public.roadmap_bars;
CREATE POLICY "Roadmap readable" ON public.roadmap_bars FOR SELECT TO authenticated
  USING (public.can_access_country(auth.uid(), country_id));
