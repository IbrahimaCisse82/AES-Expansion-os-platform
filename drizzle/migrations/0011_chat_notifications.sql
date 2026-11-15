-- Discussions : mentions → notification plateforme (+ e-mail via dispatch_notification_email),
-- canaux par environnement (tags), e-mail activé par défaut comme l'affiche l'écran Paramètres.

-- 1. Une mention ne peut être créée que par l'auteur du message (évite le spam de notifications)
DELETE FROM public.comment_mentions a USING public.comment_mentions b
 WHERE a.ctid > b.ctid AND a.comment_id = b.comment_id AND a.mentioned_user_id = b.mentioned_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS comment_mentions_unique ON public.comment_mentions (comment_id, mentioned_user_id);
DROP POLICY IF EXISTS "Mentions insertable by authenticated" ON public.comment_mentions;
CREATE POLICY "Mentions insertable by comment author" ON public.comment_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.author_id = (SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.notify_comment_mention()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c record;
BEGIN
  SELECT author_id, author_name, content, tags INTO _c FROM public.comments WHERE id = NEW.comment_id;
  IF NOT FOUND OR NEW.mentioned_user_id IS NOT DISTINCT FROM _c.author_id THEN RETURN NEW; END IF;
  PERFORM public.create_notification(NEW.mentioned_user_id, 'mention',
    format('%s vous a mentionné%s', coalesce(nullif(_c.author_name, ''), 'Un collègue'),
           CASE WHEN coalesce(array_length(_c.tags, 1), 0) > 0 THEN ' dans #' || _c.tags[1] ELSE '' END),
    left(_c.content, 200), '/app/comments', 'comment', NEW.comment_id::text);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_comment_mention() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_comment_mention ON public.comment_mentions;
CREATE TRIGGER notify_comment_mention AFTER INSERT ON public.comment_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mention();

-- 2. Réponse à un message : l'auteur du message d'origine est notifié
CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _parent record;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT author_id INTO _parent FROM public.comments WHERE id = NEW.parent_id;
  IF NOT FOUND OR _parent.author_id IS NULL OR _parent.author_id IS NOT DISTINCT FROM NEW.author_id THEN RETURN NEW; END IF;
  PERFORM public.create_notification(_parent.author_id, 'comment_reply',
    format('%s a répondu à votre message', coalesce(nullif(NEW.author_name, ''), 'Un collègue')),
    left(NEW.content, 200), '/app/comments', 'comment', NEW.parent_id::text);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_comment_reply() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_comment_reply ON public.comments;
CREATE TRIGGER notify_comment_reply AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_reply();

CREATE INDEX IF NOT EXISTS comments_tags_idx ON public.comments USING gin (tags);

-- 3. E-mail : activé par défaut (l'écran Paramètres affiche « activé » quand rien n'est choisi)
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
  _email_enabled := COALESCE((_prefs -> NEW.type ->> 'email')::boolean, true); -- aligné sur l'écran Paramètres (activé par défaut)

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
