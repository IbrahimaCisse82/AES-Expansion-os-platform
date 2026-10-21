-- Technico-Commercial : droits alignés sur la matrice RACI du classeur AES.
BEGIN;
DO $$
DECLARE
  _admin uuid := test_utils.make_user('tc.admin@test.local', 'admin');
  _rep1 uuid := test_utils.make_user('tc.rep1@test.local', 'sales_rep');
  _rep2 uuid := test_utils.make_user('tc.rep2@test.local', 'sales_rep');
  _tech uuid := test_utils.make_user('tc.tech@test.local', 'technician');
  _log uuid := test_utils.make_user('tc.log@test.local', 'logistics');
  _raf uuid := test_utils.make_user('tc.raf@test.local', 'raf');
  _obs uuid := test_utils.make_user('tc.obs@test.local', 'observer');
  _team uuid := (SELECT id FROM public.tc_teams ORDER BY sort_order LIMIT 1);
  _kit uuid := (SELECT id FROM public.tc_kits ORDER BY sort_order LIMIT 1);
  _sale uuid;
  _n int;
BEGIN
  PERFORM test_utils.assert(_team IS NOT NULL AND _kit IS NOT NULL, 'données de référence AES chargées');

  -- Un commercial crée un devis ; l'auteur est forcé à lui-même
  PERFORM test_utils.login(_rep1);
  INSERT INTO public.tc_sales (quote_no, quote_date, team_id, client, kit_id, quantity, created_by)
  VALUES ('DEV-001', DATE '2026-10-05', _team, 'Client A', _kit, 2, _admin)
  RETURNING id INTO _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT created_by FROM public.tc_sales WHERE id = _sale) = _rep1,
    'l''auteur du devis est forcé à l''utilisateur connecté');

  -- Un autre commercial ne peut pas modifier ce devis
  PERFORM test_utils.login(_rep2);
  UPDATE public.tc_sales SET client = 'Piraté' WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT client FROM public.tc_sales WHERE id = _sale) = 'Client A',
    'un commercial ne modifie pas le devis d''un autre');

  -- Son auteur peut le faire passer en vente
  PERFORM test_utils.login(_rep1);
  UPDATE public.tc_sales SET sale_date = DATE '2026-10-12' WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT sale_date FROM public.tc_sales WHERE id = _sale) = DATE '2026-10-12',
    'le commercial auteur signe sa vente');
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.activity_log WHERE entity_type = 'tc_sale' AND action LIKE 'a signé la vente DEV-001%'),
    'la signature est tracée dans l''historique');

  -- La finance saisit les encaissements ; le technicien la livraison
  PERFORM test_utils.login(_raf);
  UPDATE public.tc_sales SET deposit_amount = 100000, deposit_date = DATE '2026-10-12' WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.login(_tech);
  UPDATE public.tc_sales SET delivery_date = DATE '2026-10-20' WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT deposit_amount = 100000 AND delivery_date IS NOT NULL FROM public.tc_sales WHERE id = _sale),
    'finance (encaissement) et technique (livraison) mettent à jour le journal');

  -- Un commercial ne supprime pas ; un observateur n'écrit rien
  PERFORM test_utils.login(_rep1);
  DELETE FROM public.tc_sales WHERE id = _sale;
  PERFORM test_utils.logout();
  PERFORM test_utils.login(_obs);
  UPDATE public.tc_stock_items SET quantity = 0;
  UPDATE public.tc_settings SET margin_rate = 0;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.tc_sales WHERE id = _sale), 'un commercial ne supprime pas une vente');
  PERFORM test_utils.assert((SELECT sum(quantity) FROM public.tc_stock_items) > 0, 'un observateur ne modifie pas le stock');
  PERFORM test_utils.assert((SELECT margin_rate FROM public.tc_settings LIMIT 1) = 0.25, 'un observateur ne modifie pas les paramètres');

  -- Magasin : stock oui, paramètres non
  PERFORM test_utils.login(_log);
  UPDATE public.tc_stock_items SET quantity = quantity + 1 WHERE designation = 'POMPE LORENTZ PU 150 - BOOST';
  UPDATE public.tc_settings SET vat_rate = 0;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT quantity FROM public.tc_stock_items WHERE designation = 'POMPE LORENTZ PU 150 - BOOST') = 2,
    'le magasin met à jour le stock');
  PERFORM test_utils.assert((SELECT vat_rate FROM public.tc_settings LIMIT 1) = 0.18, 'le magasin ne modifie pas la TVA');

  -- Technicien : compose les kits
  PERFORM test_utils.login(_tech);
  INSERT INTO public.tc_kit_items (kit_id, line_no, designation, quantity) VALUES (_kit, 1, 'POMPE LORENTZ PU 150 - BOOST', 1);
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.tc_kit_items WHERE kit_id = _kit), 'le technicien compose un kit');

  -- Commercial : ne compose pas les kits
  PERFORM test_utils.login(_rep1);
  BEGIN
    INSERT INTO public.tc_kit_items (kit_id, line_no, designation, quantity) VALUES (_kit, 2, 'X', 1);
    RAISE EXCEPTION 'ÉCHEC : un commercial a modifié une nomenclature';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok — un commercial ne modifie pas les nomenclatures';
  END;
  PERFORM test_utils.logout();

  -- Anonyme : aucune lecture
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    SELECT count(*) INTO _n FROM public.tc_sales;
    RAISE EXCEPTION 'ÉCHEC : anon lit le journal des ventes';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok — anon ne lit pas le journal des ventes';
  END;
  EXECUTE 'RESET ROLE';
END $$;

-- Cohérence des saisies
DO $$
DECLARE _team uuid := (SELECT id FROM public.tc_teams LIMIT 1); _kit uuid := (SELECT id FROM public.tc_kits LIMIT 1);
BEGIN
  BEGIN
    INSERT INTO public.tc_sales (quote_no, quote_date, team_id, client, kit_id, delivery_date)
    VALUES ('DEV-X', CURRENT_DATE, _team, 'C', _kit, CURRENT_DATE);
    RAISE EXCEPTION 'ÉCHEC : livraison sans vente acceptée';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok — pas de livraison sans date de vente';
  END;
  BEGIN
    INSERT INTO public.tc_sales (quote_no, quote_date, team_id, client, kit_id, deposit_amount)
    VALUES ('DEV-Y', CURRENT_DATE, _team, 'C', _kit, 5000);
    RAISE EXCEPTION 'ÉCHEC : encaissement sans date accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok — un encaissement exige sa date';
  END;
  BEGIN
    INSERT INTO public.tc_sales (quote_no, quote_date, team_id, client, kit_id, discount_rate)
    VALUES ('DEV-Z', CURRENT_DATE, _team, 'C', _kit, 1.5);
    RAISE EXCEPTION 'ÉCHEC : remise de 150 %% acceptée';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok — remise bornée entre 0 et 100 %%';
  END;
END $$;
ROLLBACK;
