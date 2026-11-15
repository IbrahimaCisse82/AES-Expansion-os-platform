-- =====================================================================
-- 0009 — Environnement Finance AES (classeur « AES Burkina Classeur Financier V4 »)
--
-- 1. Plan de comptes AES (5 rubriques, 21 postes) dans budget_categories :
--    les budgets par pôle (COMM/TECH/ADM/RH/DG/BOBO) sont saisis dans
--    budget_lines (pole_id) et alimentent donc directement le module BI.
-- 2. Trésorerie mensuelle : 7 postes d'encaissement, 13 de décaissement,
--    solde initial, seuil minimal, prévision annuelle par poste.
-- 3. Compte de résultat budget vs réalisé (21 postes saisis, totaux calculés).
-- 4. Les 38 KPI officiels du plan AES, avec leur SENS (plus haut / plus bas
--    / cible) : le classeur jugeait « délai » et « coût » comme des chiffres
--    d'affaires (statut faux pour DSO, CAC, absentéisme…).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fin_can(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text = ANY (CASE _perm
        WHEN 'finance' THEN ARRAY['admin','director','raf']
        WHEN 'kpi'     THEN ARRAY['admin','director','raf','dhr','technical_director','commercial_director']
        ELSE ARRAY[]::text[] END))
$$;
REVOKE ALL ON FUNCTION public.fin_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_can(text) TO authenticated, service_role;

-- Le RAF (finance) peut ouvrir et modifier un exercice budgétaire
DROP POLICY IF EXISTS "Scenarios insertable by raf" ON public.budget_scenarios;
CREATE POLICY "Scenarios insertable by raf" ON public.budget_scenarios FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'raf'));
DROP POLICY IF EXISTS "Scenarios updatable by raf" ON public.budget_scenarios;
CREATE POLICY "Scenarios updatable by raf" ON public.budget_scenarios FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'raf'));

-- 1. Plan de comptes AES -------------------------------------------------
ALTER TABLE public.budget_categories ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS budget_categories_code_key ON public.budget_categories (code) WHERE code IS NOT NULL;

INSERT INTO public.budget_categories (code, name, type, sort_order, is_system) VALUES ('AES-1', 'AES — CHARGES DE PERSONNEL', 'expense', 100, true) ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-1.1', 'Salaires bruts', 'expense', id, 101, true FROM public.budget_categories WHERE code = 'AES-1' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-1.2', 'Charges sociales patronales (CNSS 16%)', 'expense', id, 102, true FROM public.budget_categories WHERE code = 'AES-1' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-1.3', 'Indemnités & primes de performance', 'expense', id, 103, true FROM public.budget_categories WHERE code = 'AES-1' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-1.4', 'Frais de formation & certification', 'expense', id, 104, true FROM public.budget_categories WHERE code = 'AES-1' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, sort_order, is_system) VALUES ('AES-2', 'AES — CHARGES OPÉRATIONNELLES', 'expense', 105, true) ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-2.1', 'Carburant & déplacements terrain', 'expense', id, 106, true FROM public.budget_categories WHERE code = 'AES-2' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-2.2', 'Téléphonie & internet', 'expense', id, 107, true FROM public.budget_categories WHERE code = 'AES-2' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-2.3', 'Fournitures de bureau', 'expense', id, 108, true FROM public.budget_categories WHERE code = 'AES-2' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-2.4', 'Entretien matériel & équipements', 'expense', id, 109, true FROM public.budget_categories WHERE code = 'AES-2' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-2.5', 'Sous-traitance & prestations externes', 'expense', id, 110, true FROM public.budget_categories WHERE code = 'AES-2' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, sort_order, is_system) VALUES ('AES-3', 'AES — CHARGES COMMERCIALES', 'expense', 111, true) ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-3.1', 'Actions marketing & communication', 'expense', id, 112, true FROM public.budget_categories WHERE code = 'AES-3' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-3.2', 'Déplacements & représentation clients', 'expense', id, 113, true FROM public.budget_categories WHERE code = 'AES-3' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-3.3', 'Frais de prospection & appels d''offres', 'expense', id, 114, true FROM public.budget_categories WHERE code = 'AES-3' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, sort_order, is_system) VALUES ('AES-4', 'AES — INVESTISSEMENTS', 'expense', 115, true) ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-4.1', 'Matériel informatique & logiciels', 'expense', id, 116, true FROM public.budget_categories WHERE code = 'AES-4' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-4.2', 'Véhicules & mobilité', 'expense', id, 117, true FROM public.budget_categories WHERE code = 'AES-4' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-4.3', 'Outillage technique', 'expense', id, 118, true FROM public.budget_categories WHERE code = 'AES-4' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-4.4', 'Mobilier & agencement bureau', 'expense', id, 119, true FROM public.budget_categories WHERE code = 'AES-4' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, sort_order, is_system) VALUES ('AES-5', 'AES — CHARGES DIVERSES', 'expense', 120, true) ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-5.1', 'Assurances', 'expense', id, 121, true FROM public.budget_categories WHERE code = 'AES-5' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-5.2', 'Frais bancaires & agios', 'expense', id, 122, true FROM public.budget_categories WHERE code = 'AES-5' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-5.3', 'Taxes & contributions diverses', 'expense', id, 123, true FROM public.budget_categories WHERE code = 'AES-5' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
INSERT INTO public.budget_categories (code, name, type, parent_id, sort_order, is_system) SELECT 'AES-5.4', 'Provision imprévus (3% du budget total)', 'expense', id, 124, true FROM public.budget_categories WHERE code = 'AES-5' ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;

-- 2. Trésorerie ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_treasury_lines (
  code text PRIMARY KEY,
  section text NOT NULL CHECK (section IN ('ENC','DEC')),
  label text NOT NULL,
  sort_order integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.fin_treasury_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  opening_balance numeric(16,2) NOT NULL DEFAULT 0,
  min_threshold numeric(16,2) NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, fiscal_year)
);
CREATE TABLE IF NOT EXISTS public.fin_treasury_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  line_code text NOT NULL REFERENCES public.fin_treasury_lines (code) ON UPDATE CASCADE,
  -- 1..12 = réalisé du mois ; 0 = prévision annuelle (« BUDGET PRÉV. »)
  month smallint NOT NULL CHECK (month BETWEEN 0 AND 12),
  amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, fiscal_year, line_code, month)
);

-- 3. Compte de résultat ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_pnl_lines (
  code text PRIMARY KEY,
  section text NOT NULL CHECK (section IN ('PRODUITS','VARIABLES','PERSONNEL','OPEX','FINANCIER','IMPOT')),
  label text NOT NULL,
  sort_order integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.fin_pnl_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  line_code text NOT NULL REFERENCES public.fin_pnl_lines (code) ON UPDATE CASCADE,
  budget numeric(16,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  actual numeric(16,2) NOT NULL DEFAULT 0 CHECK (actual >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, fiscal_year, line_code)
);

-- 4. KPI officiels ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_kpis (
  code text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('FIN','COM','TECH','RH','PROJ')),
  label text NOT NULL,
  unit text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up','down','target')),
  sort_order integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.fin_kpi_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE CASCADE,
  kpi_code text NOT NULL REFERENCES public.fin_kpis (code) ON UPDATE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  target numeric(18,4),
  actual numeric(18,4),
  comment text,
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (country_id, kpi_code, month)
);

INSERT INTO public.fin_treasury_lines (code, section, label, sort_order) VALUES
  ('enc_pv', 'ENC', 'Ventes équipements photovoltaïques', 0),
  ('enc_pompage', 'ENC', 'Ventes systèmes de pompage solaire', 1),
  ('enc_froid', 'ENC', 'Ventes chambres froides solaires', 2),
  ('enc_elec', 'ENC', 'Électrification rurale & raccordements', 3),
  ('enc_sav', 'ENC', 'Service après-vente & maintenance', 4),
  ('enc_subv', 'ENC', 'Subventions & financements projets', 5),
  ('enc_autres', 'ENC', 'Autres recettes & produits divers', 6),
  ('dec_achats', 'DEC', 'Achats marchandises & équipements', 7),
  ('dec_personnel', 'DEC', 'Charges de personnel (salaires + CNSS)', 8),
  ('dec_loyers', 'DEC', 'Loyers & charges locatives', 9),
  ('dec_carburant', 'DEC', 'Carburant & transport', 10),
  ('dec_telecom', 'DEC', 'Téléphonie & internet', 11),
  ('dec_fournitures', 'DEC', 'Fournitures & consommables', 12),
  ('dec_marketing', 'DEC', 'Frais marketing & communication', 13),
  ('dec_soustraitance', 'DEC', 'Sous-traitance & prestations', 14),
  ('dec_emprunts', 'DEC', 'Remboursements emprunts (principal)', 15),
  ('dec_interets', 'DEC', 'Intérêts bancaires & frais financiers', 16),
  ('dec_tva', 'DEC', 'TVA à reverser & impôts', 17),
  ('dec_invest', 'DEC', 'Investissements & immobilisations', 18),
  ('dec_autres', 'DEC', 'Autres décaissements divers', 19)
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.fin_pnl_lines (code, section, label, sort_order) VALUES
  ('ca_pv', 'PRODUITS', 'Ventes équipements PV', 0),
  ('ca_pompage', 'PRODUITS', 'Ventes pompage solaire', 1),
  ('ca_froid', 'PRODUITS', 'Chambres froides solaires', 2),
  ('ca_elec', 'PRODUITS', 'Électrification & raccordements', 3),
  ('ca_sav', 'PRODUITS', 'Maintenance & SAV', 4),
  ('ca_subv', 'PRODUITS', 'Subventions & autres produits', 5),
  ('cv_marchandises', 'VARIABLES', 'Achats marchandises revendues', 6),
  ('cv_matieres', 'VARIABLES', 'Achats matières & consommables', 7),
  ('cv_soustraitance', 'VARIABLES', 'Sous-traitance technique', 8),
  ('cv_commissions', 'VARIABLES', 'Commissions & frais de vente', 9),
  ('pe_salaires', 'PERSONNEL', 'Salaires bruts (tous pôles)', 10),
  ('pe_cnss', 'PERSONNEL', 'Charges sociales patronales CNSS', 11),
  ('pe_primes', 'PERSONNEL', 'Primes & indemnités', 12),
  ('op_loyers', 'OPEX', 'Loyers & charges locatives', 13),
  ('op_carburant', 'OPEX', 'Carburant & déplacements', 14),
  ('op_telecom', 'OPEX', 'Téléphonie & internet', 15),
  ('op_marketing', 'OPEX', 'Marketing & communication', 16),
  ('op_autres', 'OPEX', 'Autres charges opérationnelles', 17),
  ('fi_interets', 'FINANCIER', 'Intérêts bancaires & agios', 18),
  ('fi_frais', 'FINANCIER', 'Frais bancaires', 19),
  ('is_its', 'IMPOT', 'ITS estimé', 20)
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.fin_kpis (code, category, label, unit, direction, sort_order) VALUES
  ('F1', 'FIN', 'Chiffre d''affaires mensuel moyen', 'FCFA', 'up', 0),
  ('F2', 'FIN', 'Taux de marge brute', '%', 'up', 1),
  ('F3', 'FIN', 'Résultat net', 'FCFA', 'up', 2),
  ('F4', 'FIN', 'Trésorerie disponible — solde moyen', 'FCFA', 'up', 3),
  ('F5', 'FIN', 'DSO — délai moyen de paiement clients', 'jours', 'down', 4),
  ('F6', 'FIN', 'Taux d''exécution budgétaire global', '%', 'target', 5),
  ('C1', 'COM', 'Chiffre d''affaires réalisé vs objectif', '%', 'up', 6),
  ('C2', 'COM', 'Nombre de nouveaux clients acquis (mois)', 'nb', 'up', 7),
  ('C3', 'COM', 'Nombre de devis émis (mois)', 'nb', 'up', 8),
  ('C4', 'COM', 'Taux de conversion devis → commande', '%', 'up', 9),
  ('C5', 'COM', 'Valeur du pipeline commercial', 'FCFA', 'up', 10),
  ('C6', 'COM', 'Délai moyen de conclusion d''une vente', 'jours', 'down', 11),
  ('C7', 'COM', 'Nombre de leads marketing générés', 'nb', 'up', 12),
  ('C8', 'COM', 'Coût d''acquisition client (CAC)', 'FCFA', 'down', 13),
  ('T1', 'TECH', 'Nombre de projets réalisés dans les délais', 'nb', 'up', 14),
  ('T2', 'TECH', 'Taux de livraison dans les délais', '%', 'up', 15),
  ('T3', 'TECH', 'Taux de satisfaction client', '%', 'up', 16),
  ('T4', 'TECH', 'Taux de conformité des installations', '%', 'up', 17),
  ('T5', 'TECH', 'Taux de réclamations / incidents', '%', 'down', 18),
  ('T6', 'TECH', 'Nombre de tickets SAV traités (mois)', 'nb', 'up', 19),
  ('T7', 'TECH', 'Délai moyen de résolution SAV', 'heures', 'down', 20),
  ('T8', 'TECH', 'Productivité par technicien (projets/mois)', 'nb', 'up', 21),
  ('RH1', 'RH', 'Effectif total AES Burkina', 'nb', 'target', 22),
  ('RH2', 'RH', 'Taux de présence moyen', '%', 'up', 23),
  ('RH3', 'RH', 'Taux d''absentéisme', '%', 'down', 24),
  ('RH4', 'RH', 'Taux de rotation du personnel', '%', 'down', 25),
  ('RH5', 'RH', '% collaborateurs évalués dans l''année', '%', 'up', 26),
  ('RH6', 'RH', 'Score moyen d''évaluation global (/4)', 'nb', 'up', 27),
  ('RH7', 'RH', 'Heures de formation / collaborateur / an', 'heures', 'up', 28),
  ('RH8', 'RH', 'Taux de satisfaction collaborateurs', '%', 'up', 29),
  ('RH9', 'RH', 'Nombre de plans de progrès actifs', 'nb', 'down', 30),
  ('PR1', 'PROJ', '% d''avancement Phase 1 — Diagnostic', '%', 'up', 31),
  ('PR2', 'PROJ', '% d''avancement Phase 2 — Outils', '%', 'up', 32),
  ('PR3', 'PROJ', '% d''avancement Phase 3 — Formation', '%', 'up', 33),
  ('PR4', 'PROJ', '% d''avancement Phase 4 — Évaluation', '%', 'up', 34),
  ('PR5', 'PROJ', 'Nombre d''outils déployés', 'nb', 'up', 35),
  ('PR6', 'PROJ', 'Nombre de fiches de poste validées', 'nb', 'up', 36),
  ('PR7', 'PROJ', 'Niveau de maturité opérationnelle (1→4)', 'nb', 'up', 37)
ON CONFLICT (code) DO NOTHING;

-- Droits ---------------------------------------------------------------------
DO $rls$
DECLARE _r record;
BEGIN
  FOR _r IN SELECT * FROM (VALUES
    ('fin_treasury_lines', 'finance', false), ('fin_pnl_lines', 'finance', false), ('fin_kpis', 'finance', false),
    ('fin_treasury_years', 'finance', true), ('fin_treasury_values', 'finance', true),
    ('fin_pnl_values', 'finance', true), ('fin_kpi_values', 'kpi', true)
  ) AS v(tbl, perm, has_country)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _r.tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', _r.tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', _r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS fin_read ON public.%I', _r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS fin_write ON public.%I', _r.tbl);
    EXECUTE format('CREATE POLICY fin_read ON public.%I FOR SELECT TO authenticated USING (true)', _r.tbl);
    EXECUTE format('CREATE POLICY fin_write ON public.%I FOR ALL TO authenticated USING (public.fin_can(%L)) WITH CHECK (public.fin_can(%L))', _r.tbl, _r.perm, _r.perm);
    IF _r.has_country THEN
      EXECUTE format('DROP POLICY IF EXISTS country_scope_guard ON public.%I', _r.tbl);
      EXECUTE format('CREATE POLICY country_scope_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
        USING (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id))
        WITH CHECK (country_id IS NULL OR public.can_access_country((SELECT auth.uid()), country_id))', _r.tbl);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_touch ON public.%I', _r.tbl);
      EXECUTE format('CREATE TRIGGER trg_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at()', _r.tbl);
    END IF;
  END LOOP;
END
$rls$;
