
-- Trigger: dispatch transactional email for each new notification when the user has email enabled for that type
CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _email text;
  _email_enabled boolean;
  _supabase_url text := 'https://ywwyjenswccqopisidnb.supabase.co';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3d3lqZW5zd2NjcW9waXNpZG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjgxMjgsImV4cCI6MjA5MzUwNDEyOH0.GgskRteCnBA3Q2HqbnEFMjWdgRgrImaROBvXtu17KQ4';
BEGIN
  -- Look up preference; default = email disabled for safety (user opts in via Settings)
  SELECT COALESCE(np.email_enabled, false)
    INTO _email_enabled
  FROM public.notification_preferences np
  WHERE np.user_id = NEW.user_id AND np.notif_type = NEW.type;

  IF NOT COALESCE(_email_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Resolve recipient email from auth.users
  SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
  IF _email IS NULL OR _email = '' THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget POST to send-transactional-email
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
  -- Never block the notification insert on email dispatch failure
  RAISE WARNING 'dispatch_notification_email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_notification_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_dispatch_notification_email ON public.notifications;
CREATE TRIGGER trg_dispatch_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_email();
