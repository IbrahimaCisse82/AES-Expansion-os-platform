-- Discussions : mentions et réponses notifient le destinataire ; personne ne fabrique de mention pour un autre.
BEGIN;
DO $$
DECLARE
  _a uuid := test_utils.make_user('chat.a@test.local', 'raf');
  _b uuid := test_utils.make_user('chat.b@test.local', 'sales_rep');
  _c uuid := test_utils.make_user('chat.c@test.local', 'technician');
  _msg uuid;
  _ok boolean := false;
BEGIN
  PERFORM test_utils.login(_a);
  INSERT INTO public.comments (author_id, author_name, content, tags) VALUES (_a, 'Awa RAF', '@Issa merci de relancer la Clinique Manga', ARRAY['Finance', 'relance'])
  RETURNING id INTO _msg;
  INSERT INTO public.comment_mentions (comment_id, mentioned_user_id, mentioned_name) VALUES (_msg, _b, 'Issa');
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _b AND type = 'mention' AND title LIKE '%#Finance%' AND link = '/app/comments'),
    'la personne mentionnée reçoit une notification (avec le canal)');

  PERFORM test_utils.login(_c);
  BEGIN
    INSERT INTO public.comment_mentions (comment_id, mentioned_user_id, mentioned_name) VALUES (_msg, _c, 'moi');
  EXCEPTION WHEN insufficient_privilege THEN _ok := true;
  END;
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(_ok, 'impossible de créer une mention sur le message d''un autre');

  PERFORM test_utils.login(_b);
  INSERT INTO public.comments (author_id, author_name, content, parent_id, tags) VALUES (_b, 'Issa', 'Fait, acompte promis vendredi', _msg, ARRAY['Finance']);
  PERFORM test_utils.logout();
  PERFORM test_utils.assert(EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _a AND type = 'comment_reply'),
    'l''auteur du message est notifié de la réponse');
  PERFORM test_utils.assert(NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _b AND type = 'comment_reply'),
    'on n''est pas notifié de sa propre réponse');
  RAISE NOTICE 'chat notifications: OK';
END $$;
ROLLBACK;
