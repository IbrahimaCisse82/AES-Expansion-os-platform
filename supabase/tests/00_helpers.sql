-- Outils communs aux tests SQL (exécutés en premier, ordre alphabétique).
CREATE SCHEMA IF NOT EXISTS test_utils;
GRANT USAGE ON SCHEMA test_utils TO anon, authenticated, service_role;

-- Crée un utilisateur avec un rôle et un périmètre pays (NULL = tous).
CREATE OR REPLACE FUNCTION test_utils.make_user(_email text, _role public.app_role, _scope text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (_id, _email);
  -- handle_new_user crée profil + rôle observer (ou admin pour le 1er inscrit)
  UPDATE public.user_roles SET role = _role, scope_country_id = _scope WHERE user_id = _id;
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role, scope_country_id) VALUES (_id, _role, _scope);
  END IF;
  RETURN _id;
END $$;

-- Bascule la session sur un utilisateur connecté (comme PostgREST).
CREATE OR REPLACE FUNCTION test_utils.login(_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', _id::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE OR REPLACE FUNCTION test_utils.logout() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END $$;

CREATE OR REPLACE FUNCTION test_utils.assert(_ok boolean, _msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _ok IS NOT TRUE THEN RAISE EXCEPTION 'ÉCHEC : %', _msg; END IF;
  RAISE NOTICE 'ok — %', _msg;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test_utils TO anon, authenticated, service_role;
