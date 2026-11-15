-- =====================================================================
-- 0007 — Environnement Technico-Commercial (AES Burkina)
--
-- Remplace le classeur « AES TABLEAU DE BORD TECHNICO-COMMERCIAL.xlsm » :
-- modélisation des kits (nomenclatures, stock d'abord puis fournisseur le
-- moins cher), journal devis → vente → livraison, encaissements, marges,
-- commissions, objectifs, capacité des équipes, besoins d'achat, stock
-- dormant, matrice RACI.
--
-- Seules les DONNÉES SAISIES sont stockées ; tous les calculs du classeur
-- sont faits par le moteur src/lib/tc/engine.ts (testé).
-- Amélioration par rapport au classeur : le coût de revient et le prix
-- catalogue d'un kit sont FIGÉS au moment de la vente (colonnes *_snapshot) ;
-- dans le classeur, modifier un kit recalculait la marge des ventes passées.
--
-- Droits : fonction tc_can(permission) alignée sur la matrice RACI ;
-- cloisonnement pays par la règle restrictive country_scope_guard.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permissions (RACI → rôles applicatifs)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tc_can(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text = ANY (CASE _perm
        WHEN 'settings'     THEN ARRAY['admin','director','raf']
        WHEN 'labor'        THEN ARRAY['admin','director','dhr','raf']
        WHEN 'zones'        THEN ARRAY['admin','director','raf','logistics']
        WHEN 'teams'        THEN ARRAY['admin','director','technical_director','commercial_director']
        WHEN 'kits'         THEN ARRAY['admin','director','technical_director','technician']
        WHEN 'stock'        THEN ARRAY['admin','director','logistics']
        WHEN 'suppliers'    THEN ARRAY['admin','director','logistics','raf']
        WHEN 'objectives'   THEN ARRAY['admin','director','commercial_director']
        WHEN 'sales_create' THEN ARRAY['admin','director','commercial_director','sales_rep']
        WHEN 'sales_manage' THEN ARRAY['admin','director','commercial_director','raf','technical_director','technician']
        WHEN 'sales_delete' THEN ARRAY['admin','director','commercial_director']
        WHEN 'raci'         THEN ARRAY['admin','director']
        ELSE ARRAY[]::text[]
      END)
  )
$$;
REVOKE ALL ON FUNCTION public.tc_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tc_can(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tc_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.tc_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Référentiels
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tc_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  margin_rate numeric(6,4) NOT NULL DEFAULT 0.25 CHECK (margin_rate >= 0 AND margin_rate < 10),
  vat_rate numeric(6,4) NOT NULL DEFAULT 0.18 CHECK (vat_rate >= 0 AND vat_rate < 1),
  contingency_rate numeric(6,4) NOT NULL DEFAULT 0.05 CHECK (contingency_rate >= 0 AND contingency_rate < 1),
  currency text NOT NULL DEFAULT 'FCFA',
  inventory_date date,
  payment_delay_days integer NOT NULL DEFAULT 30 CHECK (payment_delay_days >= 0),
  cost_per_km numeric(12,2) NOT NULL DEFAULT 350 CHECK (cost_per_km >= 0),
  per_diem numeric(12,2) NOT NULL DEFAULT 10000 CHECK (per_diem >= 0),
  lodging_per_night numeric(12,2) NOT NULL DEFAULT 15000 CHECK (lodging_per_night >= 0),
  default_mission_people integer NOT NULL DEFAULT 2 CHECK (default_mission_people > 0),
  warranty_rate numeric(6,4) NOT NULL DEFAULT 0.03 CHECK (warranty_rate >= 0 AND warranty_rate < 1),
  commission_rate numeric(6,4) NOT NULL DEFAULT 0.02 CHECK (commission_rate >= 0 AND commission_rate < 1),
  bonus_threshold numeric(6,4) NOT NULL DEFAULT 1 CHECK (bonus_threshold >= 0),
  bonus_rate numeric(6,4) NOT NULL DEFAULT 0.01 CHECK (bonus_rate >= 0 AND bonus_rate < 1),
  default_probability numeric(6,4) NOT NULL DEFAULT 0.5 CHECK (default_probability >= 0 AND default_probability <= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id)
);

CREATE TABLE IF NOT EXISTS public.tc_solutions (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  reservation_priority integer NOT NULL,
  color text NOT NULL DEFAULT 'sky',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.tc_labor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  hourly_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  comment text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, name)
);

CREATE TABLE IF NOT EXISTS public.tc_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  distance_km numeric(10,1) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  mission_days numeric(6,1) NOT NULL DEFAULT 1 CHECK (mission_days >= 0),
  nights numeric(6,1) NOT NULL DEFAULT 0 CHECK (nights >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, name)
);

CREATE TABLE IF NOT EXISTS public.tc_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  manager text,
  region text,
  technicians integer NOT NULL DEFAULT 2 CHECK (technicians >= 0),
  hours_per_day numeric(5,2) NOT NULL DEFAULT 8 CHECK (hours_per_day >= 0 AND hours_per_day <= 24),
  working_days numeric(5,2) NOT NULL DEFAULT 22 CHECK (working_days >= 0 AND working_days <= 31),
  availability_rate numeric(5,4) NOT NULL DEFAULT 0.8 CHECK (availability_rate >= 0 AND availability_rate <= 1),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, name)
);

-- ---------------------------------------------------------------------
-- Articles : stock, catalogue Odoo, prix fournisseurs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tc_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  designation text NOT NULL,
  inventory_category text,
  solution_code text,
  quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  unit text NOT NULL DEFAULT 'u',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, designation)
);

CREATE TABLE IF NOT EXISTS public.tc_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  designation text NOT NULL,
  odoo_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (odoo_cost >= 0),
  UNIQUE (designation)
);

CREATE TABLE IF NOT EXISTS public.tc_supplier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  designation text NOT NULL,
  supplier text NOT NULL,
  contact text,
  unit_price numeric(14,2) NOT NULL CHECK (unit_price > 0),
  lead_days integer CHECK (lead_days >= 0),
  quote_date date,
  remark text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tc_supplier_prices_designation_idx ON public.tc_supplier_prices (designation);

-- ---------------------------------------------------------------------
-- Kits et nomenclatures
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tc_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  code text NOT NULL,
  solution_code text NOT NULL REFERENCES public.tc_solutions (code) ON UPDATE CASCADE,
  variant text NOT NULL,
  name text NOT NULL,
  customer_need text,
  transport_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (transport_cost >= 0),
  margin_rate numeric(6,4) CHECK (margin_rate IS NULL OR (margin_rate >= 0 AND margin_rate < 10)),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, code)
);

CREATE TABLE IF NOT EXISTS public.tc_kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.tc_kits (id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  designation text NOT NULL,
  unit text NOT NULL DEFAULT 'u',
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  UNIQUE (kit_id, line_no)
);

CREATE TABLE IF NOT EXISTS public.tc_kit_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.tc_kits (id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.tc_labor_profiles (id) ON DELETE RESTRICT,
  people numeric(6,2) NOT NULL DEFAULT 1 CHECK (people > 0),
  hours_per_person numeric(8,2) NOT NULL DEFAULT 0 CHECK (hours_per_person >= 0),
  UNIQUE (kit_id, line_no)
);

-- ---------------------------------------------------------------------
-- Objectifs et journal des ventes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tc_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.tc_teams (id) ON DELETE CASCADE,
  solution_code text NOT NULL REFERENCES public.tc_solutions (code) ON UPDATE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  kits_target numeric(10,2) NOT NULL DEFAULT 0 CHECK (kits_target >= 0),
  revenue_target numeric(16,2) NOT NULL DEFAULT 0 CHECK (revenue_target >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, solution_code, month)
);

CREATE TABLE IF NOT EXISTS public.tc_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE SET NULL,
  quote_no text NOT NULL,
  quote_date date NOT NULL,
  team_id uuid NOT NULL REFERENCES public.tc_teams (id) ON DELETE RESTRICT,
  salesperson text,
  client text NOT NULL,
  kit_id uuid NOT NULL REFERENCES public.tc_kits (id) ON DELETE RESTRICT,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  applied_price numeric(16,2) CHECK (applied_price IS NULL OR applied_price >= 0),
  discount_rate numeric(6,4) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate < 1),
  sale_date date,
  delivery_date date,
  lost boolean NOT NULL DEFAULT false,
  remark text,
  deposit_amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  deposit_date date,
  balance_amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
  balance_date date,
  zone_id uuid REFERENCES public.tc_zones (id) ON DELETE SET NULL,
  mission_people integer CHECK (mission_people IS NULL OR mission_people > 0),
  probability numeric(6,4) CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1)),
  planned_install_date date,
  -- Valeurs figées à la vente (null tant que le devis n'est pas signé)
  unit_cost_snapshot numeric(16,2) CHECK (unit_cost_snapshot IS NULL OR unit_cost_snapshot >= 0),
  catalog_price_snapshot numeric(16,2) CHECK (catalog_price_snapshot IS NULL OR catalog_price_snapshot >= 0),
  install_hours_snapshot numeric(10,2) CHECK (install_hours_snapshot IS NULL OR install_hours_snapshot >= 0),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tc_sales_delivery_after_sale CHECK (delivery_date IS NULL OR sale_date IS NOT NULL),
  CONSTRAINT tc_sales_payment_dates CHECK (
    (deposit_amount = 0 OR deposit_date IS NOT NULL) AND (balance_amount = 0 OR balance_date IS NOT NULL)),
  CONSTRAINT tc_sales_lost_not_sold CHECK (NOT lost OR sale_date IS NULL),
  UNIQUE NULLS NOT DISTINCT (country_id, quote_no)
);
CREATE INDEX IF NOT EXISTS tc_sales_team_idx ON public.tc_sales (team_id);
CREATE INDEX IF NOT EXISTS tc_sales_kit_idx ON public.tc_sales (kit_id);
CREATE INDEX IF NOT EXISTS tc_sales_sale_date_idx ON public.tc_sales (sale_date);

-- ---------------------------------------------------------------------
-- Matrice RACI
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tc_raci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL,
  process text NOT NULL,
  activity text NOT NULL,
  screen text,
  frequency text,
  assignments jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sort_order)
);

-- ---------------------------------------------------------------------
-- updated_at automatiques
-- ---------------------------------------------------------------------
DO $t$
DECLARE _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY['tc_settings','tc_labor_profiles','tc_zones','tc_teams','tc_stock_items',
    'tc_supplier_prices','tc_kits','tc_objectives','tc_sales','tc_raci']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch ON public.%I', _t);
    EXECUTE format('CREATE TRIGGER trg_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at()', _t);
  END LOOP;
END
$t$;

-- ---------------------------------------------------------------------
-- RLS : lecture pour tout utilisateur connecté (dans son périmètre pays),
-- écriture selon tc_can(). Règle restrictive pays sur les tables à pays.
-- ---------------------------------------------------------------------
DO $rls$
DECLARE
  _r record;
BEGIN
  FOR _r IN SELECT * FROM (VALUES
    ('tc_settings', 'settings', 'settings', 'settings', true),
    ('tc_solutions', 'kits', 'kits', 'settings', false),
    ('tc_labor_profiles', 'labor', 'labor', 'labor', true),
    ('tc_zones', 'zones', 'zones', 'zones', true),
    ('tc_teams', 'teams', 'teams', 'teams', true),
    ('tc_stock_items', 'stock', 'stock', 'stock', true),
    ('tc_catalog_items', 'stock', 'stock', 'stock', false),
    ('tc_supplier_prices', 'suppliers', 'suppliers', 'suppliers', true),
    ('tc_kits', 'kits', 'kits', 'kits', true),
    ('tc_objectives', 'objectives', 'objectives', 'objectives', false),
    ('tc_raci', 'raci', 'raci', 'raci', false)
  ) AS v(tbl, ins, upd, del, has_country)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _r.tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', _r.tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', _r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS tc_read ON public.%I', _r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS tc_insert ON public.%I', _r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS tc_update ON public.%I', _r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS tc_delete ON public.%I', _r.tbl);
    EXECUTE format('CREATE POLICY tc_read ON public.%I FOR SELECT TO authenticated USING (true)', _r.tbl);
    EXECUTE format('CREATE POLICY tc_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.tc_can(%L))', _r.tbl, _r.ins);
    EXECUTE format('CREATE POLICY tc_update ON public.%I FOR UPDATE TO authenticated USING (public.tc_can(%L)) WITH CHECK (public.tc_can(%L))', _r.tbl, _r.upd, _r.upd);
    EXECUTE format('CREATE POLICY tc_delete ON public.%I FOR DELETE TO authenticated USING (public.tc_can(%L))', _r.tbl, _r.del);
    IF _r.has_country THEN
      EXECUTE format('DROP POLICY IF EXISTS country_scope_guard ON public.%I', _r.tbl);
      EXECUTE format(
        'CREATE POLICY country_scope_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
           USING (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id))
           WITH CHECK (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id))', _r.tbl);
    END IF;
  END LOOP;
END
$rls$;

-- Lignes de kits : mêmes droits et même périmètre que le kit parent
DO $kit$
DECLARE _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY['tc_kit_items', 'tc_kit_labor']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', _t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', _t);
    EXECUTE format('DROP POLICY IF EXISTS tc_read ON public.%I', _t);
    EXECUTE format('DROP POLICY IF EXISTS tc_write ON public.%I', _t);
    EXECUTE format('CREATE POLICY tc_read ON public.%I FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.tc_kits k WHERE k.id = kit_id))', _t);
    EXECUTE format('CREATE POLICY tc_write ON public.%I FOR ALL TO authenticated
      USING (public.tc_can(''kits'') AND EXISTS (SELECT 1 FROM public.tc_kits k WHERE k.id = kit_id))
      WITH CHECK (public.tc_can(''kits'') AND EXISTS (SELECT 1 FROM public.tc_kits k WHERE k.id = kit_id))', _t);
  END LOOP;
END
$kit$;

-- Objectifs : périmètre de l'équipe
DROP POLICY IF EXISTS country_scope_guard ON public.tc_objectives;
CREATE POLICY country_scope_guard ON public.tc_objectives AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tc_teams t WHERE t.id = team_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tc_teams t WHERE t.id = team_id));

-- Ventes : un commercial crée ses devis et ne modifie que les siens ;
-- direction, finance et technique gèrent l'ensemble.
ALTER TABLE public.tc_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tc_sales FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_sales TO authenticated;
DROP POLICY IF EXISTS tc_read ON public.tc_sales;
DROP POLICY IF EXISTS tc_insert ON public.tc_sales;
DROP POLICY IF EXISTS tc_update ON public.tc_sales;
DROP POLICY IF EXISTS tc_delete ON public.tc_sales;
CREATE POLICY tc_read ON public.tc_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY tc_insert ON public.tc_sales FOR INSERT TO authenticated
  WITH CHECK (public.tc_can('sales_create') AND created_by = (SELECT auth.uid()));
CREATE POLICY tc_update ON public.tc_sales FOR UPDATE TO authenticated
  USING (public.tc_can('sales_manage') OR (public.has_role((SELECT auth.uid()), 'sales_rep') AND created_by = (SELECT auth.uid())))
  WITH CHECK (public.tc_can('sales_manage') OR (public.has_role((SELECT auth.uid()), 'sales_rep') AND created_by = (SELECT auth.uid())));
CREATE POLICY tc_delete ON public.tc_sales FOR DELETE TO authenticated USING (public.tc_can('sales_delete'));
DROP POLICY IF EXISTS country_scope_guard ON public.tc_sales;
CREATE POLICY country_scope_guard ON public.tc_sales AS RESTRICTIVE FOR ALL TO authenticated
  USING (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id))
  WITH CHECK (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id));

-- L'auteur d'un devis est toujours l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.tc_sales_force_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN NEW.created_by := auth.uid();
    ELSE NEW.created_by := OLD.created_by; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tc_sales_force_author() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_force_author ON public.tc_sales;
CREATE TRIGGER trg_force_author BEFORE INSERT OR UPDATE ON public.tc_sales
  FOR EACH ROW EXECUTE FUNCTION public.tc_sales_force_author();

-- Journalisation dans l'activité de la plateforme
CREATE OR REPLACE FUNCTION public.tc_sales_log_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _msg := 'a créé le devis ' || NEW.quote_no || ' (' || NEW.client || ')';
  ELSIF NEW.lost AND NOT OLD.lost THEN
    _msg := 'a marqué perdu le devis ' || NEW.quote_no;
  ELSIF NEW.sale_date IS NOT NULL AND OLD.sale_date IS NULL THEN
    _msg := 'a signé la vente ' || NEW.quote_no || ' (' || NEW.client || ')';
  ELSIF NEW.delivery_date IS NOT NULL AND OLD.delivery_date IS NULL THEN
    _msg := 'a livré la vente ' || NEW.quote_no;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.activity_log (user_id, user_name, action, entity_type, entity_id, market_flag, color)
  VALUES (auth.uid(),
          COALESCE((SELECT full_name FROM public.profiles WHERE user_id = auth.uid()), 'Système'),
          _msg, 'tc_sale', NEW.id::text, '', 'gold');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tc_sales_log_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_log_status ON public.tc_sales;
CREATE TRIGGER trg_log_status AFTER INSERT OR UPDATE ON public.tc_sales
  FOR EACH ROW EXECUTE FUNCTION public.tc_sales_log_status();
