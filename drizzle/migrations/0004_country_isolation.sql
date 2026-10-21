-- =====================================================================
-- 0004 — Cloisonnement par pays (audit 2026-10-21)
--
-- Constat : les règles d'écriture (INSERT/UPDATE/DELETE) ne vérifiaient
-- que le rôle, jamais le pays ; certaines lectures étaient ouvertes à tous
-- (commentaires, membres pays, règles de validation…).
--
-- Correctif : une règle RESTRICTIVE par table portant un pays. Une règle
-- restrictive se cumule (ET logique) avec les règles permissives
-- existantes : les droits par rôle restent inchangés, mais ne s'exercent
-- plus que dans le périmètre pays de l'utilisateur. Les lignes sans pays
-- (NULL) restent des données globales.
-- =====================================================================

DO $iso$
DECLARE
  _t record;
BEGIN
  FOR _t IN
    SELECT * FROM (VALUES
      ('bi_projects', 'country_id'),
      ('bi_report_instances', 'country_id'),
      ('budget_capex_items', 'country_id'),
      ('budget_close_tasks', 'country_id'),
      ('budget_entries', 'country_id'),
      ('budget_journal_entries', 'country_id'),
      ('budget_lines', 'country_id'),
      ('budget_validation_rules', 'country_id'),
      ('comments', 'market_id'),
      ('country_documents', 'country_id'),
      ('country_members', 'country_id'),
      ('country_notes', 'country_id'),
      ('custom_kpi_values', 'country_id'),
      ('kpi_history', 'country_id'),
      ('milestones', 'country_id'),
      ('phase_checklist_items', 'country_id'),
      ('risks', 'country_id'),
      ('roadmap_bars', 'country_id'),
      ('tasks', 'country_id'),
      ('countries', 'id')
    ) AS v(tbl, col)
  LOOP
    IF to_regclass('public.' || _t.tbl) IS NULL THEN
      RAISE NOTICE 'table % absente, ignorée', _t.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS country_scope_guard ON public.%I', _t.tbl);
    EXECUTE format(
      'CREATE POLICY country_scope_guard ON public.%1$I AS RESTRICTIVE FOR ALL TO authenticated
         USING (%2$I IS NULL OR public.can_access_country((SELECT auth.uid()), %2$I))
         WITH CHECK (%2$I IS NULL OR public.can_access_country((SELECT auth.uid()), %2$I))',
      _t.tbl, _t.col);
  END LOOP;
END
$iso$;

-- Enfants des commentaires : même périmètre que le commentaire parent.
DROP POLICY IF EXISTS country_scope_guard ON public.comment_mentions;
CREATE POLICY country_scope_guard ON public.comment_mentions AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id));

DROP POLICY IF EXISTS country_scope_guard ON public.comment_reactions;
CREATE POLICY country_scope_guard ON public.comment_reactions AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id));

DROP POLICY IF EXISTS country_scope_guard ON public.comment_attachments;
CREATE POLICY country_scope_guard ON public.comment_attachments AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id));

-- Journal d'activité : market_flag contient un drapeau emoji (🇸🇳), pas un
-- identifiant pays. L'ancienne règle comparait le périmètre ('sn') au
-- drapeau : un utilisateur limité à un pays ne voyait jamais son activité.
CREATE OR REPLACE FUNCTION public.can_access_flag(_user_id uuid, _flag text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _flag IS NULL OR _flag = '' THEN true
    WHEN public.user_scope_country(_user_id) IS NULL
      THEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
    ELSE EXISTS (
      SELECT 1 FROM public.countries c
      WHERE c.flag = _flag AND c.id = public.user_scope_country(_user_id))
  END
$$;
REVOKE ALL ON FUNCTION public.can_access_flag(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_flag(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Activity readable by scoped users" ON public.activity_log;
DROP POLICY IF EXISTS "Activity insertable by scoped users" ON public.activity_log;
DO $act$
DECLARE _p record;
BEGIN
  -- supprime toute autre règle SELECT/INSERT historique sur activity_log
  FOR _p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'activity_log' AND cmd IN ('SELECT', 'INSERT')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.activity_log', _p.policyname);
  END LOOP;
END
$act$;
CREATE POLICY "Activity readable by scoped users" ON public.activity_log FOR SELECT TO authenticated
  USING (public.can_access_flag((SELECT auth.uid()), market_flag));
CREATE POLICY "Activity insertable by scoped users" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.can_access_flag((SELECT auth.uid()), market_flag));

-- Paramètres applicatifs : table créée hors migrations, sécurité inconnue
-- en production. Lecture pour les connectés, écriture admin uniquement.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DO $set$
DECLARE _p record;
BEGIN
  FOR _p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.app_settings', _p.policyname);
  END LOOP;
END
$set$;
CREATE POLICY "Settings readable by authenticated" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings writable by admin" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));
REVOKE ALL ON public.app_settings FROM anon;

-- Premier inscrit = admin automatique : dangereux si l'inscription est
-- ouverte lors d'un (re)déploiement. Tout nouvel inscrit est observateur ;
-- le premier admin s'attribue via le serveur (voir README, « Amorçage »).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2))
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'observer');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
