-- Finance AES : seuls direction / RAF écrivent budgets, trésorerie et P&L ;
-- les directeurs métiers saisissent les KPI ; un observateur ne fait que lire.
BEGIN;
DO $$
DECLARE
  _raf uuid := test_utils.make_user('fin.raf@test.local', 'raf');
  _dhr uuid := test_utils.make_user('fin.dhr@test.local', 'dhr');
  _obs uuid := test_utils.make_user('fin.obs@test.local', 'observer');
  _n int;
BEGIN
  PERFORM test_utils.assert((SELECT count(*) FROM public.fin_kpis) = 38, '38 KPI officiels chargés');
  PERFORM test_utils.assert((SELECT count(*) FROM public.fin_treasury_lines) = 20, '20 postes de trésorerie');
  PERFORM test_utils.assert((SELECT count(*) FROM public.fin_pnl_lines) = 21, '21 postes de compte de résultat');

  -- Le RAF ouvre l'exercice et saisit trésorerie + P&L
  PERFORM test_utils.login(_raf);
  INSERT INTO public.budget_scenarios (name, fiscal_year) VALUES ('Budget AES 2031', 2031);
  INSERT INTO public.fin_treasury_values (fiscal_year, line_code, month, amount) VALUES (2031, 'enc_pv', 1, 1000000);
  INSERT INTO public.fin_pnl_values (fiscal_year, line_code, budget, actual) VALUES (2031, 'ca_pv', 5000000, 0);
  INSERT INTO public.fin_kpi_values (kpi_code, month, target, actual) VALUES ('F1', DATE '2031-01-01', 10, 8);
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.budget_scenarios WHERE name = 'Budget AES 2031'), 'le RAF ouvre l''exercice');
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.fin_treasury_values WHERE fiscal_year = 2031), 'le RAF saisit la trésorerie');

  -- Le DRH saisit un KPI mais ne touche pas à la trésorerie
  PERFORM test_utils.login(_dhr);
  INSERT INTO public.fin_kpi_values (kpi_code, month, target, actual) VALUES ('RH1', DATE '2031-01-01', 20, 19);
  BEGIN
    INSERT INTO public.fin_treasury_values (fiscal_year, line_code, month, amount) VALUES (2031, 'enc_pv', 2, 999);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.fin_pnl_values SET actual = 1 WHERE fiscal_year = 2031;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.fin_kpi_values WHERE kpi_code = 'RH1'), 'le DRH saisit ses KPI');
  PERFORM test_utils.assert(NOT EXISTS (SELECT 1 FROM public.fin_treasury_values WHERE fiscal_year = 2031 AND month = 2), 'le DRH n''écrit pas la trésorerie');
  PERFORM test_utils.assert((SELECT actual FROM public.fin_pnl_values WHERE fiscal_year = 2031 AND line_code = 'ca_pv') = 0, 'le DRH ne modifie pas le P&L');

  -- L'observateur lit mais n'écrit rien
  PERFORM test_utils.login(_obs);
  SELECT count(*) INTO _n FROM public.fin_treasury_values WHERE fiscal_year = 2031;
  UPDATE public.fin_kpi_values SET actual = 0;
  DELETE FROM public.fin_treasury_values;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(_n = 1, 'l''observateur lit la trésorerie de son pays');
  PERFORM test_utils.assert((SELECT actual FROM public.fin_kpi_values WHERE kpi_code = 'F1') = 8, 'l''observateur ne modifie pas les KPI');
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.fin_treasury_values WHERE fiscal_year = 2031), 'l''observateur ne supprime rien');
  RAISE NOTICE 'fin permissions: OK';
END $$;
ROLLBACK;
