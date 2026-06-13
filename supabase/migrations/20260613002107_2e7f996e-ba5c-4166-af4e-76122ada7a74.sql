ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_preferences') THEN
    UPDATE public.profiles p
    SET notification_preferences = sub.prefs
    FROM (
      SELECT user_id,
             jsonb_object_agg(notif_type, jsonb_build_object('email', email_enabled, 'in_app', in_app_enabled)) AS prefs
      FROM public.notification_preferences
      GROUP BY user_id
    ) sub
    WHERE p.user_id = sub.user_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _email text;
  _email_enabled boolean;
  _prefs jsonb;
  _supabase_url text := 'https://ywwyjenswccqopisidnb.supabase.co';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3d3lqZW5zd2NjcW9waXNpZG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjgxMjgsImV4cCI6MjA5MzUwNDEyOH0.GgskRteCnBA3Q2HqbnEFMjWdgRgrImaROBvXtu17KQ4';
BEGIN
  SELECT notification_preferences INTO _prefs FROM public.profiles WHERE user_id = NEW.user_id;
  _email_enabled := COALESCE((_prefs -> NEW.type ->> 'email')::boolean, false);

  IF NOT COALESCE(_email_enabled, false) THEN
    RETURN NEW;
  END IF;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
  IF _email IS NULL OR _email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key,
      'apikey', _anon_key
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