-- Environnements (Expansion, Technico-commercial, Finance, Reporting) :
-- 1. matrice rôle × environnement paramétrable par l'administrateur ;
-- 2. notifications qui relient les environnements (vente signée / livrée → finance et direction commerciale).

CREATE TABLE IF NOT EXISTS public.environment_access (
  role public.app_role NOT NULL,
  env text NOT NULL CHECK (env IN ('expansion', 'tc', 'finance', 'reporting')),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (role, env),
  -- l'administrateur garde toujours la main sur tout (pas de verrouillage involontaire)
  CONSTRAINT environment_access_admin_all CHECK (role <> 'admin' OR enabled)
);

INSERT INTO public.environment_access (role, env, enabled)
SELECT r::public.app_role, e, CASE
  WHEN r IN ('admin', 'director', 'observer', 'analyst') THEN true
  WHEN e = 'expansion' THEN r IN ('country_manager', 'partner')
  WHEN e = 'tc' THEN r IN ('raf', 'commercial_director', 'technical_director', 'sales_rep', 'technician', 'logistics')
  WHEN e = 'finance' THEN r IN ('raf', 'dhr', 'commercial_director', 'technical_director')
  WHEN e = 'reporting' THEN r IN ('raf', 'dhr', 'commercial_director', 'technical_director', 'sales_rep', 'technician', 'logistics', 'country_manager')
  ELSE false END
FROM unnest(enum_range(NULL::public.app_role)::text[]) r, unnest(ARRAY['expansion', 'tc', 'finance', 'reporting']) e
ON CONFLICT (role, env) DO NOTHING;

ALTER TABLE public.environment_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.environment_access FROM anon;
GRANT SELECT, UPDATE ON public.environment_access TO authenticated;
DROP POLICY IF EXISTS environment_access_read ON public.environment_access;
CREATE POLICY environment_access_read ON public.environment_access FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS environment_access_admin_update ON public.environment_access;
CREATE POLICY environment_access_admin_update ON public.environment_access FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin')) WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.environment_access_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.role := OLD.role; NEW.env := OLD.env;
  NEW.updated_at := now(); NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS environment_access_stamp ON public.environment_access;
CREATE TRIGGER environment_access_stamp BEFORE UPDATE ON public.environment_access
  FOR EACH ROW EXECUTE FUNCTION public.environment_access_stamp();

-- 2. Vente signée → RAF (acompte à encaisser) et direction commerciale ; livrée → RAF (solde à facturer).
CREATE OR REPLACE FUNCTION public.tc_sales_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _type text; _title text; _msg text; _roles public.app_role[]; _r record;
BEGIN
  IF NEW.sale_date IS NOT NULL AND OLD.sale_date IS NULL AND NOT NEW.lost THEN
    _type := 'tc_sale_signed';
    _title := format('Vente signée : %s', NEW.client);
    _msg := format('Devis %s — %s kit(s). Acompte à suivre en trésorerie.', NEW.quote_no, NEW.quantity);
    _roles := ARRAY['raf', 'commercial_director', 'director']::public.app_role[];
  ELSIF NEW.delivery_date IS NOT NULL AND OLD.delivery_date IS NULL THEN
    _type := 'tc_sale_delivered';
    _title := format('Livraison effectuée : %s', NEW.client);
    _msg := format('Devis %s livré le %s — solde à facturer et encaisser.', NEW.quote_no, to_char(NEW.delivery_date, 'DD/MM/YYYY'));
    _roles := ARRAY['raf']::public.app_role[];
  ELSE
    RETURN NEW;
  END IF;
  FOR _r IN SELECT DISTINCT ur.user_id FROM public.user_roles ur
            WHERE ur.role = ANY (_roles) AND ur.user_id IS DISTINCT FROM auth.uid()
              AND (NEW.country_id IS NULL OR public.can_access_country(ur.user_id, NEW.country_id)) LOOP
    PERFORM public.create_notification(_r.user_id, _type, _title, _msg,
      '/app/tc/ventes?q=' || NEW.quote_no, 'tc_sale', NEW.id::text);
  END LOOP;
  -- le commercial auteur est prévenu quand un autre que lui livre sa vente
  IF _type = 'tc_sale_delivered' AND NEW.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM auth.uid() THEN
    PERFORM public.create_notification(NEW.created_by, _type, _title, _msg, '/app/tc/ventes?q=' || NEW.quote_no, 'tc_sale', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tc_sales_notify() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_tc_sales_notify ON public.tc_sales;
CREATE TRIGGER trg_tc_sales_notify AFTER UPDATE ON public.tc_sales
  FOR EACH ROW EXECUTE FUNCTION public.tc_sales_notify();
