-- =====================================================================
-- 0003 — Verrouillage sécurité (audit 2026-10-21)
-- 1. set_user_role : n'était appelable par PUBLIC/anon/authenticated
--    sans aucun contrôle -> élévation de privilèges anonyme vers admin.
-- 2. Fonctions déclencheurs : EXECUTE encore hérité de PUBLIC.
-- 3. Bucket comment-attachments : public -> privé (le front utilise
--    déjà createSignedUrl, aucun impact fonctionnel).
-- 4. Tâches planifiées : ajout de l'en-tête Authorization (clé de
--    service lue dans le Vault) exigé désormais par les fonctions edge.
-- =====================================================================

-- 1. Élévation de privilèges ------------------------------------------
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO service_role;

-- Défense en profondeur : même appelée via service_role, la fonction
-- refuse un appelant authentifié qui n'est pas administrateur.
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'set_user_role: réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_roles SET role = new_role WHERE user_id = target_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, new_role);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO service_role;

-- 2. Fonctions déclencheurs : retirer l'héritage PUBLIC ----------------
REVOKE EXECUTE ON FUNCTION public.check_budget_overrun() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_kpi_drop() FROM PUBLIC;

-- 3. Pièces jointes des commentaires : bucket privé --------------------
UPDATE storage.buckets SET public = false WHERE id = 'comment-attachments';

-- 4. Tâches planifiées : injecter l'en-tête Authorization -------------
DO $cron$
DECLARE
  _job record;
  _auth text := $a$'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1), $a$;
  _cmd text;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron absent : rien à mettre à jour';
    RETURN;
  END IF;

  FOR _job IN
    SELECT jobid, jobname, command FROM cron.job
    WHERE command ~ 'functions/v1/(bi-report-scheduler|kpi-recurring-check|notifications-cron|detect-overdue-tasks)'
      AND command NOT ILIKE '%Authorization%'
  LOOP
    _cmd := regexp_replace(_job.command, '''apikey''\s*,', _auth || '''apikey'',');
    IF _cmd = _job.command THEN
      RAISE WARNING 'Tâche cron % (%) : en-tête non injecté automatiquement, à corriger à la main', _job.jobname, _job.jobid;
    ELSE
      PERFORM cron.alter_job(job_id := _job.jobid, command := _cmd);
      RAISE NOTICE 'Tâche cron % : en-tête Authorization ajouté', _job.jobname;
    END IF;
  END LOOP;
END
$cron$;

-- 5. Notifications email : le déclencheur appelait send-transactional-email
--    avec la clé publique, désormais refusée. Il passe par la clé de service
--    du Vault (déjà utilisée par la file d'emails).
CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  _email text;
  _email_enabled boolean;
  _prefs jsonb;
  _supabase_url text := 'https://ywwyjenswccqopisidnb.supabase.co';
  _service_key text;
BEGIN
  SELECT notification_preferences INTO _prefs FROM public.profiles WHERE user_id = NEW.user_id;
  _email_enabled := COALESCE((_prefs -> NEW.type ->> 'email')::boolean, false);

  IF NOT COALESCE(_email_enabled, false) THEN
    RETURN NEW;
  END IF;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
  SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets
   WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF _service_key IS NULL THEN
    RAISE WARNING 'dispatch_notification_email: secret Vault email_queue_service_role_key absent';
    RETURN NEW;
  END IF;
  IF _email IS NULL OR _email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key,
      'apikey', _service_key
    ),
    body := jsonb_build_object(
      'templateName', 'notification',
      'recipientEmail', _email,
      'idempotencyKey', 'notif-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'title', NEW.title,
        'message', NEW.message,
        'link', NEW.link,
        'type', NEW.type
      )
    )::text,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_notification_email failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.dispatch_notification_email() FROM PUBLIC, anon, authenticated;
