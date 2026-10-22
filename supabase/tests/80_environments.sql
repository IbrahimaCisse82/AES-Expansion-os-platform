-- Environnements : seul l'admin modifie la matrice ; l'admin garde tout ; une vente signée prévient la finance.
BEGIN;
DO $$
DECLARE
  _admin uuid := test_utils.make_user('env.admin@test.local', 'admin');
  _raf uuid := test_utils.make_user('env.raf@test.local', 'raf');
  _rep uuid := test_utils.make_user('env.rep@test.local', 'sales_rep');
  _team uuid := (SELECT id FROM public.tc_teams ORDER BY sort_order LIMIT 1);
  _kit uuid := (SELECT id FROM public.tc_kits ORDER BY sort_order LIMIT 1);
  _sale uuid;
  _ok boolean := false;
BEGIN
  PERFORM test_utils.assert((SELECT count(*) FROM public.environment_access) = 4 * cardinality(enum_range(NULL::public.app_role)),
    'une ligne par rôle et par environnement');
  PERFORM test_utils.assert((SELECT array_agg(env ORDER BY env) FROM public.environment_access WHERE role = 'sales_rep' AND enabled) = ARRAY['reporting', 'tc'],
    'commercial : Technico-commercial et Reporting');

  PERFORM test_utils.login(_raf);
  UPDATE public.environment_access SET enabled = true WHERE role = 'sales_rep' AND env = 'finance';
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(NOT (SELECT enabled FROM public.environment_access WHERE role = 'sales_rep' AND env = 'finance'), 'le RAF ne modifie pas la matrice');

  PERFORM test_utils.login(_admin);
  UPDATE public.environment_access SET enabled = true WHERE role = 'raf' AND env = 'expansion';
  BEGIN UPDATE public.environment_access SET enabled = false WHERE role = 'admin' AND env = 'tc'; EXCEPTION WHEN check_violation THEN _ok := true; END;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT enabled AND updated_by = _admin FROM public.environment_access WHERE role = 'raf' AND env = 'expansion'), 'l''admin ouvre Expansion au RAF (tracé)');
  PERFORM test_utils.assert(_ok, 'impossible de retirer un environnement à l''admin');

  -- Vente signée par le commercial → notification au RAF, pas au commercial
  PERFORM test_utils.login(_rep);
  INSERT INTO public.tc_sales (quote_no, quote_date, team_id, client, kit_id, quantity) VALUES ('ENV-1', DATE '2026-10-01', _team, 'Client Env', _kit, 1) RETURNING id INTO _sale;
  UPDATE public.tc_sales SET sale_date = DATE '2026-10-02' WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _raf AND type = 'tc_sale_signed' AND link = '/app/tc/ventes?q=ENV-1'),
    'le RAF est prévenu de la vente signée (lien vers la vente)');
  PERFORM test_utils.assert(NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _rep AND type = 'tc_sale_signed'), 'l''auteur n''est pas notifié de sa propre action');

  PERFORM test_utils.login(_admin);
  UPDATE public.tc_sales SET delivery_date = DATE '2026-10-05' WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _rep AND type = 'tc_sale_delivered'), 'le commercial est prévenu de la livraison de sa vente');
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _raf AND type = 'tc_sale_delivered'), 'le RAF est prévenu du solde à encaisser');
  RAISE NOTICE 'environments: OK';
END $$;
ROLLBACK;
