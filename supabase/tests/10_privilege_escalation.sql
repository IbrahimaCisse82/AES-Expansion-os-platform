-- Régression : élévation de privilèges via set_user_role (audit 2026-10-21).
BEGIN;
SELECT test_utils.make_user('premier@test.local', 'admin');
DO $$
DECLARE _victim uuid := test_utils.make_user('observateur@test.local', 'observer');
BEGIN
  -- 1. Appel anonyme : doit être refusé
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM public.set_user_role(_victim, 'admin');
    RAISE EXCEPTION 'ÉCHEC : anon a pu appeler set_user_role';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok — anon ne peut pas appeler set_user_role';
  END;
  EXECUTE 'RESET ROLE';

  -- 2. Utilisateur connecté qui tente de se promouvoir
  PERFORM test_utils.login(_victim);
  BEGIN
    PERFORM public.set_user_role(_victim, 'admin');
    RAISE EXCEPTION 'ÉCHEC : un observateur a pu se nommer admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok — un observateur ne peut pas se promouvoir';
  END;

  -- 3. Mise à jour directe de user_roles : bloquée par la RLS
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = _victim;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(
    (SELECT role FROM public.user_roles WHERE user_id = _victim) = 'observer',
    'user_roles non modifiable par son propriétaire');

  -- 4. Le serveur (service_role) peut toujours attribuer un rôle
  EXECUTE 'SET LOCAL ROLE service_role';
  PERFORM public.set_user_role(_victim, 'analyst');
  EXECUTE 'RESET ROLE';
  PERFORM test_utils.assert(
    (SELECT role FROM public.user_roles WHERE user_id = _victim) = 'analyst',
    'service_role peut attribuer un rôle');
END $$;

-- 5. Pièces jointes : bucket privé
SELECT test_utils.assert(
  NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'comment-attachments' AND public),
  'bucket comment-attachments privé');

-- 6. Aucune fonction SECURITY DEFINER sensible exécutable par anon
SELECT test_utils.assert(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  'aucune fonction SECURITY DEFINER exécutable par anon');
ROLLBACK;
