-- Reporting A1–A12 : un auteur ne valide pas son propre rapport ; un rapport validé est verrouillé.
BEGIN;
DO $$
DECLARE
  _dg uuid := test_utils.make_user('rep.dg@test.local', 'director');
  _raf uuid := test_utils.make_user('rep.raf@test.local', 'raf');
  _com uuid := test_utils.make_user('rep.com@test.local', 'commercial_director');
  _id uuid;
  _a4 uuid;
  _ok boolean;
BEGIN
  PERFORM test_utils.login(_com);
  INSERT INTO public.bi_report_instances (template_code, title, period, data, status, author_id)
  VALUES ('A2', 'Rapport mensuel commercial', '2026-10', '{"summary":"x"}', 'validated', _dg) RETURNING id INTO _id;
  PERFORM test_utils.assert((SELECT author_id = _com AND status = 'draft' FROM public.bi_report_instances WHERE id = _id),
    'à la création : auteur forcé, statut ramené à brouillon');

  _ok := false;
  BEGIN UPDATE public.bi_report_instances SET status = 'validated' WHERE id = _id; EXCEPTION WHEN check_violation OR insufficient_privilege THEN _ok := true; END;
  PERFORM test_utils.assert(_ok, 'l''auteur ne valide pas un brouillon');

  UPDATE public.bi_report_instances SET status = 'submitted' WHERE id = _id;
  _ok := false;
  BEGIN UPDATE public.bi_report_instances SET status = 'validated' WHERE id = _id; EXCEPTION WHEN insufficient_privilege THEN _ok := true; END;
  PERFORM test_utils.assert(_ok, 'l''auteur ne valide pas son rapport soumis');
  _ok := false;
  BEGIN UPDATE public.bi_report_instances SET data = '{"summary":"modifié"}' WHERE id = _id; EXCEPTION WHEN check_violation THEN _ok := true; END;
  PERFORM test_utils.assert(_ok, 'un rapport soumis n''est plus modifiable par l''auteur');
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _dg AND type = 'report_submitted' AND entity_id = _id::text),
    'la direction est notifiée de la soumission');
  PERFORM test_utils.assert(NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _raf AND entity_id = _id::text),
    'le RAF n''est pas sollicité pour un rapport commercial');

  -- Le RAF ne valide pas un A2 ; la DG renvoie avec motif puis valide
  PERFORM test_utils.login(_raf);
  UPDATE public.bi_report_instances SET status = 'validated' WHERE id = _id;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT status FROM public.bi_report_instances WHERE id = _id) = 'submitted', 'le RAF ne valide pas le rapport commercial');

  PERFORM test_utils.login(_dg);
  _ok := false;
  BEGIN UPDATE public.bi_report_instances SET status = 'rejected' WHERE id = _id; EXCEPTION WHEN check_violation THEN _ok := true; END;
  PERFORM test_utils.assert(_ok, 'un renvoi exige un motif');
  UPDATE public.bi_report_instances SET status = 'rejected', review_comment = 'Compléter le pipeline' WHERE id = _id;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _com AND type = 'report_reviewed'), 'l''auteur est notifié du renvoi');

  PERFORM test_utils.login(_com);
  UPDATE public.bi_report_instances SET data = '{"summary":"complété"}', status = 'submitted' WHERE id = _id;
  PERFORM test_utils.logout();
  PERFORM test_utils.login(_dg);
  UPDATE public.bi_report_instances SET status = 'validated' WHERE id = _id;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT status = 'validated' AND reviewed_by = _dg AND reviewed_at IS NOT NULL FROM public.bi_report_instances WHERE id = _id),
    'la DG valide après correction (traçabilité valideur + date)');

  PERFORM test_utils.login(_com);
  _ok := false;
  BEGIN UPDATE public.bi_report_instances SET data = '{}' WHERE id = _id; EXCEPTION WHEN check_violation THEN _ok := true; END;
  DELETE FROM public.bi_report_instances WHERE id = _id;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(_ok AND EXISTS (SELECT 1 FROM public.bi_report_instances WHERE id = _id), 'un rapport validé est verrouillé et non supprimable');

  -- Le RAF valide le rapport administratif & financier (A4)
  PERFORM test_utils.login(_com);
  INSERT INTO public.bi_report_instances (template_code, title, period, status) VALUES ('A4', 'Rapport adm.', '2026-10', 'submitted') RETURNING id INTO _a4;
  PERFORM test_utils.logout();
  PERFORM test_utils.login(_raf);
  UPDATE public.bi_report_instances SET status = 'validated' WHERE id = _a4;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT status FROM public.bi_report_instances WHERE id = _a4) = 'validated', 'le RAF valide l''A4');
  RAISE NOTICE 'reporting workflow: OK';
END $$;
ROLLBACK;
