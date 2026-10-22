-- Reporting AES (A1–A12) : circuit brouillon → soumis → validé / renvoyé, verrouillé une fois validé.
-- Avant : l'auteur pouvait passer lui-même son rapport à « validé » et le modifier ensuite.

ALTER TABLE public.bi_report_instances
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_comment text;

UPDATE public.bi_report_instances SET status = 'draft' WHERE status NOT IN ('draft', 'submitted', 'validated', 'rejected');
ALTER TABLE public.bi_report_instances DROP CONSTRAINT IF EXISTS bi_report_instances_status_check;
ALTER TABLE public.bi_report_instances ADD CONSTRAINT bi_report_instances_status_check
  CHECK (status IN ('draft', 'submitted', 'validated', 'rejected'));
CREATE INDEX IF NOT EXISTS bi_report_instances_template_period_idx ON public.bi_report_instances (template_code, period);

-- Qui valide : direction générale, ou le RAF pour le rapport administratif & financier (A4).
CREATE OR REPLACE FUNCTION public.report_can_review(_uid uuid, _template text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR public.has_role(_uid, 'director')
      OR (_template = 'A4' AND public.has_role(_uid, 'raf'))
      OR (_template IN ('A5', 'A6', 'A7', 'A8', 'A11') AND public.has_role(_uid, 'dhr'));
$$;
REVOKE ALL ON FUNCTION public.report_can_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_can_review(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bi_report_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _reviewer boolean;
  _r record;
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF; -- service / migrations
  _reviewer := public.report_can_review(_uid, NEW.template_code);

  IF TG_OP = 'INSERT' THEN
    NEW.author_id := _uid;
    IF NEW.status NOT IN ('draft', 'submitted') THEN NEW.status := 'draft'; END IF;
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.review_comment := NULL;
    NEW.submitted_at := CASE WHEN NEW.status = 'submitted' THEN now() END;
  ELSE
    NEW.author_id := OLD.author_id;
    NEW.template_code := OLD.template_code;
    IF OLD.status = 'validated' AND NOT (public.has_role(_uid, 'admin') AND NEW.status = 'draft') THEN
      RAISE EXCEPTION 'Rapport validé : il est verrouillé' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'submitted' AND OLD.status IN ('draft', 'rejected') THEN
        NEW.submitted_at := now();
      ELSIF NEW.status IN ('validated', 'rejected') AND OLD.status = 'submitted' THEN
        IF NOT _reviewer THEN RAISE EXCEPTION 'Seule la direction peut valider ou renvoyer ce rapport' USING ERRCODE = 'insufficient_privilege'; END IF;
        IF NEW.status = 'rejected' AND coalesce(trim(NEW.review_comment), '') = '' THEN
          RAISE EXCEPTION 'Un motif est requis pour renvoyer un rapport' USING ERRCODE = 'check_violation';
        END IF;
        NEW.reviewed_by := _uid; NEW.reviewed_at := now();
      ELSIF NEW.status = 'draft' AND (OLD.status IN ('submitted', 'rejected') OR public.has_role(_uid, 'admin')) THEN
        NULL; -- retrait de la soumission par l'auteur, ou réouverture par l'admin
      ELSE
        RAISE EXCEPTION 'Transition de statut non autorisée (% → %)', OLD.status, NEW.status USING ERRCODE = 'check_violation';
      END IF;
    ELSIF OLD.status = 'submitted' AND NEW.data IS DISTINCT FROM OLD.data AND NOT _reviewer THEN
      RAISE EXCEPTION 'Rapport soumis : retirez la soumission pour le modifier' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT _reviewer THEN
      NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at; NEW.review_comment := OLD.review_comment;
    END IF;
  END IF;

  -- Notifications
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    FOR _r IN SELECT DISTINCT ur.user_id FROM public.user_roles ur
              WHERE ur.user_id <> _uid AND public.report_can_review(ur.user_id, NEW.template_code)
                AND (NEW.country_id IS NULL OR public.can_access_country(ur.user_id, NEW.country_id)) LOOP
      PERFORM public.create_notification(_r.user_id, 'report_submitted',
        format('Rapport %s à valider', NEW.template_code),
        format('%s — %s (%s)', NEW.title, NEW.period, coalesce(NEW.author_name, 'auteur')),
        '/app/reporting', 'bi_report_instance', NEW.id::text);
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('validated', 'rejected') AND OLD.status = 'submitted' AND NEW.author_id IS NOT NULL THEN
    PERFORM public.create_notification(NEW.author_id, 'report_reviewed',
      format('Rapport %s %s', NEW.template_code, CASE NEW.status WHEN 'validated' THEN 'validé' ELSE 'renvoyé pour correction' END),
      coalesce(NEW.review_comment, NEW.title || ' — ' || NEW.period),
      '/app/reporting', 'bi_report_instance', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.bi_report_workflow() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bi_report_workflow ON public.bi_report_instances;
CREATE TRIGGER bi_report_workflow BEFORE INSERT OR UPDATE ON public.bi_report_instances
  FOR EACH ROW EXECUTE FUNCTION public.bi_report_workflow();

-- Les valideurs voient et traitent les rapports qu'ils doivent valider.
DROP POLICY IF EXISTS "bi_report_instances_update" ON public.bi_report_instances;
CREATE POLICY "bi_report_instances_update" ON public.bi_report_instances FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()) OR public.report_can_review((SELECT auth.uid()), template_code))
  WITH CHECK (author_id = (SELECT auth.uid()) OR public.report_can_review((SELECT auth.uid()), template_code));
DROP POLICY IF EXISTS "bi_report_instances_delete" ON public.bi_report_instances;
CREATE POLICY "bi_report_instances_delete" ON public.bi_report_instances FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin')
     OR (author_id = (SELECT auth.uid()) AND status IN ('draft', 'rejected')));
