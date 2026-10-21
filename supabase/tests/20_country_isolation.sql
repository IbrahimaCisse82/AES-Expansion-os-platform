-- Cloisonnement par pays : un utilisateur limité à un pays ne lit ni
-- n'écrit les données d'un autre pays (audit 2026-10-21).
BEGIN;
INSERT INTO public.countries (id, name, flag) VALUES ('sn', 'Sénégal', '🇸🇳'), ('ci', 'Côte d''Ivoire', '🇨🇮');
DO $$
DECLARE
  _admin uuid := test_utils.make_user('admin@test.local', 'admin');
  _cm_sn uuid := test_utils.make_user('cm.sn@test.local', 'country_manager', 'sn');
  _dir_ci uuid := test_utils.make_user('dir.ci@test.local', 'director', 'ci');
  _obs uuid := test_utils.make_user('obs@test.local', 'observer');
  _n int;
BEGIN
  -- Données de référence (superutilisateur : hors RLS)
  INSERT INTO public.tasks (title, country_id, assigned_to) VALUES ('Tâche SN', 'sn', _cm_sn), ('Tâche CI', 'ci', _dir_ci);
  INSERT INTO public.comments (content, market_id) VALUES ('Com SN', 'sn'), ('Com CI', 'ci'), ('Com global', NULL);
  INSERT INTO public.activity_log (action, market_flag) VALUES ('act SN', '🇸🇳'), ('act CI', '🇨🇮'), ('act global', '');

  -- Country manager Sénégal ------------------------------------------
  PERFORM test_utils.login(_cm_sn);
  SELECT count(*) INTO _n FROM public.countries;
  PERFORM test_utils.assert(_n = 1, 'CM SN ne voit que le Sénégal');
  SELECT count(*) INTO _n FROM public.tasks;
  PERFORM test_utils.assert(_n = 1, 'CM SN ne voit que les tâches SN');
  SELECT count(*) INTO _n FROM public.comments;
  PERFORM test_utils.assert(_n = 2, 'CM SN voit commentaires SN + globaux, pas CI');
  SELECT count(*) INTO _n FROM public.activity_log WHERE action IN ('act SN', 'act global');
  PERFORM test_utils.assert(_n = 2, 'CM SN voit son activité (drapeau) et l''activité globale');
  SELECT count(*) INTO _n FROM public.activity_log WHERE action = 'act CI';
  PERFORM test_utils.assert(_n = 0, 'CM SN ne voit pas l''activité CI');

  BEGIN
    INSERT INTO public.tasks (title, country_id, assigned_to) VALUES ('Intrusion', 'ci', _cm_sn);
    RAISE EXCEPTION 'ÉCHEC : CM SN a créé une tâche en Côte d''Ivoire';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok — CM SN ne peut pas créer de tâche hors périmètre';
  END;
  INSERT INTO public.tasks (title, country_id, assigned_to) VALUES ('Nouvelle SN', 'sn', _cm_sn);
  PERFORM test_utils.assert(true, 'CM SN crée une tâche dans son pays');

  UPDATE public.countries SET pct = 99 WHERE id = 'ci';
  BEGIN
    UPDATE public.tasks SET country_id = 'ci' WHERE title = 'Nouvelle SN';
    RAISE EXCEPTION 'ÉCHEC : CM SN a déplacé une tâche vers la CI';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok — CM SN ne peut pas transférer une tâche vers un autre pays';
  END;
  BEGIN
    INSERT INTO public.comments (content, market_id, author_id) VALUES ('Intrusion', 'ci', _cm_sn);
    RAISE EXCEPTION 'ÉCHEC : CM SN a commenté le marché CI';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok — CM SN ne peut pas commenter un marché hors périmètre';
  END;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT pct FROM public.countries WHERE id = 'ci') IS DISTINCT FROM 99,
    'CM SN ne peut pas modifier la fiche CI');

  -- Directeur limité à la CI : son rôle ne l'autorise pas hors périmètre
  PERFORM test_utils.login(_dir_ci);
  DELETE FROM public.tasks WHERE country_id = 'sn';
  PERFORM test_utils.logout();
  SELECT count(*) INTO _n FROM public.tasks WHERE country_id = 'sn';
  PERFORM test_utils.assert(_n = 2, 'Directeur CI ne peut pas supprimer les tâches SN');

  -- Admin global : voit tout
  PERFORM test_utils.login(_admin);
  SELECT count(*) INTO _n FROM public.tasks;
  PERFORM test_utils.assert(_n = 3, 'Admin global voit toutes les tâches');
  SELECT count(*) INTO _n FROM public.activity_log WHERE action LIKE 'act %';
  PERFORM test_utils.assert(_n = 3, 'Admin global voit toute l''activité');
  INSERT INTO public.app_settings (key, value) VALUES ('test_key', '1');
  PERFORM test_utils.logout();

  -- Paramètres : lecture seule pour les non-admins
  PERFORM test_utils.login(_obs);
  UPDATE public.app_settings SET value = 'pirate' WHERE key = 'test_key';
  PERFORM test_utils.logout();
  PERFORM test_utils.assert((SELECT value FROM public.app_settings WHERE key = 'test_key') = '1',
    'un observateur ne peut pas modifier les paramètres');

  -- Anonyme : rien
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO _n FROM public.tasks;
  EXECUTE 'RESET ROLE';
  PERFORM test_utils.assert(_n = 0, 'anon ne voit aucune tâche');
END $$;
ROLLBACK;

-- Premier inscrit : jamais admin automatiquement
BEGIN;
DELETE FROM public.user_roles;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000aa', 'premier@test.local');
SELECT test_utils.assert(
  (SELECT role FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-0000000000aa') = 'observer',
  'le premier inscrit est observateur, pas admin');
ROLLBACK;
