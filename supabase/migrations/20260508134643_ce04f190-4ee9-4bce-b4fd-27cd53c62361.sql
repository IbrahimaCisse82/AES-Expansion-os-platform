
-- =========================================================
-- Generic notifications table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text DEFAULT '',
  link text DEFAULT '',
  entity_type text DEFAULT '',
  entity_id text DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications readable by owner" ON public.notifications;
CREATE POLICY "Notifications readable by owner" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notifications insertable by authenticated" ON public.notifications;
CREATE POLICY "Notifications insertable by authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Notifications updatable by owner" ON public.notifications;
CREATE POLICY "Notifications updatable by owner" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notifications deletable by owner" ON public.notifications;
CREATE POLICY "Notifications deletable by owner" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- Helper: insert notification (SECURITY DEFINER bypasses RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, _type text, _title text, _message text DEFAULT '',
  _link text DEFAULT '', _entity_type text DEFAULT '', _entity_id text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
  VALUES (_user_id, _type, _title, COALESCE(_message,''), COALESCE(_link,''), COALESCE(_entity_type,''), COALESCE(_entity_id,''));
END;
$$;

-- =========================================================
-- Trigger 1: nouveau membre (insert sur user_roles)
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_new_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid; _name text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE user_id = NEW.user_id;
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' AND user_id <> NEW.user_id LOOP
    PERFORM public.create_notification(
      _admin, 'new_member', '👤 Nouveau membre',
      COALESCE(_name, 'Un utilisateur') || ' a rejoint la plateforme avec le rôle ' || NEW.role::text,
      '/equipe', 'user_role', NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_member ON public.user_roles;
CREATE TRIGGER trg_notify_new_member
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_member();

-- =========================================================
-- Trigger 2: rôle modifié (update sur user_roles)
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_role_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.create_notification(
      NEW.user_id, 'role_changed', '🔐 Votre rôle a changé',
      'Votre rôle est désormais : ' || NEW.role::text,
      '/profil', 'user_role', NEW.id::text
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_role_changed ON public.user_roles;
CREATE TRIGGER trg_notify_role_changed
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.notify_role_changed();

-- =========================================================
-- Trigger 3: document uploadé sur pays
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_document_uploaded()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _member uuid; _country_label text;
BEGIN
  SELECT name INTO _country_label FROM public.countries WHERE id = NEW.country_id;
  FOR _member IN
    SELECT user_id FROM public.country_members
    WHERE country_id = NEW.country_id AND user_id <> COALESCE(NEW.uploaded_by, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    PERFORM public.create_notification(
      _member, 'document_uploaded', '📄 Nouveau document',
      COALESCE(NEW.uploaded_by_name, 'Un membre') || ' a ajouté « ' || NEW.name || ' » sur ' || COALESCE(_country_label, NEW.country_id),
      '/pays/' || NEW.country_id, 'country_document', NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_document_uploaded ON public.country_documents;
CREATE TRIGGER trg_notify_document_uploaded
  AFTER INSERT ON public.country_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_document_uploaded();

-- =========================================================
-- Trigger 4: changement de statut marché
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_market_status_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    FOR _u IN SELECT user_id FROM public.user_roles LOOP
      PERFORM public.create_notification(
        _u, 'market_status_changed', '🌍 Statut marché modifié',
        NEW.flag || ' ' || NEW.name || ' est désormais en statut « ' || NEW.status::text || ' »',
        '/pays/' || NEW.id, 'country', NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_market_status_changed ON public.countries;
CREATE TRIGGER trg_notify_market_status_changed
  AFTER UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.notify_market_status_changed();

-- =========================================================
-- Trigger 5: alerte budget > 90 % (sur budget_entries)
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_budget_threshold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid; _ratio numeric; _old_ratio numeric;
BEGIN
  IF NEW.allocated_k IS NULL OR NEW.allocated_k <= 0 THEN RETURN NEW; END IF;
  _ratio := NEW.spent_k::numeric / NEW.allocated_k::numeric;
  _old_ratio := CASE WHEN OLD.allocated_k > 0 THEN OLD.spent_k::numeric / OLD.allocated_k::numeric ELSE 0 END;
  -- Trigger only on threshold crossing
  IF _ratio >= 0.9 AND _old_ratio < 0.9 THEN
    FOR _u IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','director','analyst') LOOP
      PERFORM public.create_notification(
        _u, 'budget_threshold', '💰 Budget > 90 %',
        'Le budget ' || COALESCE(NEW.country_label, NEW.category, '') || ' a atteint ' || ROUND(_ratio * 100)::text || ' % de l''enveloppe',
        '/budget', 'budget_entry', NEW.id::text
      );
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_budget_threshold ON public.budget_entries;
CREATE TRIGGER trg_notify_budget_threshold
  AFTER UPDATE ON public.budget_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_budget_threshold();
