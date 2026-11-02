-- Reporting : les rapports marqués « confidentiel » dans le classeur (A4 financier, A6 évaluation individuelle,
-- A7 PPI, A9 Task Force, A10 trimestriel DG) ne sont lisibles que par leur auteur, leurs valideurs et la direction.
-- Avant : tout utilisateur voyait l'évaluation individuelle d'un collègue.
CREATE OR REPLACE FUNCTION public.report_is_confidential(_template text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _template IN ('A4', 'A6', 'A7', 'A9', 'A10');
$$;
GRANT EXECUTE ON FUNCTION public.report_is_confidential(text) TO authenticated;

DROP POLICY IF EXISTS "bi_report_instances_select" ON public.bi_report_instances;
CREATE POLICY "bi_report_instances_select" ON public.bi_report_instances FOR SELECT TO authenticated USING (
  author_id = (SELECT auth.uid())
  OR public.report_can_review((SELECT auth.uid()), template_code)
  OR (NOT public.report_is_confidential(template_code)
      AND (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id)))
);
