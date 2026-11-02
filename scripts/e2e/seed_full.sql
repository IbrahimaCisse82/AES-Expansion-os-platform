-- =====================================================================
-- Jeu de données de RECETTE (local uniquement — jamais en production)
-- Peuple les 4 environnements avec un exercice 2026 réaliste pour AES :
-- 14 utilisateurs (tous les rôles), 4 pays, ~90 devis/ventes, budgets des
-- 6 pôles, trésorerie, compte de résultat, 38 KPI, rapports A1–A12 à
-- différents stades, discussions avec mentions.
-- Prérequis : migrations appliquées + supabase/tests/00_helpers.sql.
-- Variables psql affichées en sortie : USER <clé> <uuid> (lues par le runner).
-- =====================================================================
\set ON_ERROR_STOP 1
SET client_min_messages = error;
DO $$ BEGIN CREATE ROLE authenticator LOGIN NOINHERIT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. Utilisateurs : un par rôle (deux commerciaux)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE seed_users (key text PRIMARY KEY, id uuid, email text, name text, role text, scope text);
INSERT INTO seed_users (key, email, name, role, scope) VALUES
  ('admin',               'admin@aes.local',       'Karim Sawadogo (Admin)',          'admin', NULL),
  ('director',            'dg@aes.local',          'Awa Ouédraogo (DG)',              'director', NULL),
  ('raf',                 'raf@aes.local',         'Mamadou Diallo (RAF)',            'raf', NULL),
  ('dhr',                 'drh@aes.local',         'Aminata Koné (DRH)',              'dhr', NULL),
  ('commercial_director', 'dircom@aes.local',      'Ousmane Traoré (Dir. commercial)', 'commercial_director', NULL),
  ('technical_director',  'dirtech@aes.local',     'Boukary Zongo (Dir. technique)',  'technical_director', NULL),
  ('sales_rep',           'commercial@aes.local',  'Issa Kaboré',                     'sales_rep', NULL),
  ('sales_rep2',          'commercial2@aes.local', 'Mariam Zongo',                    'sales_rep', NULL),
  ('technician',          'technicien@aes.local',  'Seydou Sanou',                    'technician', NULL),
  ('logistics',           'magasin@aes.local',     'Rasmané Ouédraogo',               'logistics', NULL),
  ('country_manager',     'cm.sn@aes.local',       'Fatou Ndiaye (CM Sénégal)',       'country_manager', NULL),
  ('analyst',             'analyste@aes.local',    'Jean Kaboré (Analyste)',          'analyst', NULL),
  ('observer',            'observateur@aes.local', 'Observateur Conseil',             'observer', NULL),
  ('partner',             'partenaire@aes.local',  'Partenaire GET.invest',           'partner', NULL);

INSERT INTO public.countries (id, name, flag, region, status, phase, pct, language, description, local_currency, exchange_rate_to_fcfa) VALUES
  ('bf', 'Burkina Faso',  '🇧🇫', 'Afrique de l''Ouest', 'active',   4, 85, 'Français', 'Siège AES — pompage solaire et kits PV', 'XOF', 1),
  ('ci', 'Côte d''Ivoire', '🇨🇮', 'Afrique de l''Ouest', 'active',   3, 55, 'Français', 'Ouverture d''une antenne à Bouaké', 'XOF', 1),
  ('sn', 'Sénégal',        '🇸🇳', 'Afrique de l''Ouest', 'planning', 2, 30, 'Français', 'Partenariat agropoles en étude', 'XOF', 1),
  ('ml', 'Mali',           '🇲🇱', 'Afrique de l''Ouest', 'paused',   1, 10, 'Français', 'En pause (contexte sécuritaire)', 'XOF', 1)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE u record; _id uuid;
BEGIN
  FOR u IN SELECT * FROM seed_users LOOP
    _id := test_utils.make_user(u.email, u.role::public.app_role, u.scope);
    UPDATE seed_users SET id = _id WHERE key = u.key;
    UPDATE public.profiles SET full_name = u.name,
      initials = upper(left(split_part(u.name, ' ', 1), 1) || left(split_part(u.name, ' ', 2), 1))
    WHERE user_id = _id;
  END LOOP;
END $$;
SELECT 'USER ' || key || ' ' || id FROM seed_users ORDER BY key;

INSERT INTO public.country_members (country_id, user_id, role_in_country)
SELECT 'sn', id, 'lead' FROM seed_users WHERE key = 'country_manager'
UNION ALL SELECT 'bf', id, 'lead' FROM seed_users WHERE key = 'director'
UNION ALL SELECT 'ci', id, 'member' FROM seed_users WHERE key = 'commercial_director';

-- ---------------------------------------------------------------------
-- 2. Expansion : jalons, tâches, risques, KPI pays, budgets
-- ---------------------------------------------------------------------
INSERT INTO public.milestones (country_id, icon, title, target_date, is_done, sort_order) VALUES
  ('bf', '🏁', 'Agrément ministère de l''Énergie', '2026-02-15', true, 1), ('bf', '🏭', 'Entrepôt Ouaga Nord opérationnel', '2026-04-30', true, 2),
  ('bf', '💧', '100 installations de pompage', '2026-12-31', false, 3), ('ci', '📄', 'Immatriculation filiale CI', '2026-05-31', true, 1),
  ('ci', '🤝', 'Contrat distributeur Bouaké', '2026-11-15', false, 2), ('ci', '🏪', 'Ouverture showroom Abidjan', '2027-02-28', false, 3),
  ('sn', '🔎', 'Étude de marché agropoles', '2026-10-29', false, 1), ('sn', '🧾', 'Dossier PPP SCE', '2027-01-31', false, 2),
  ('ml', '⏸️', 'Réévaluation du contexte', '2027-03-31', false, 1);

INSERT INTO public.tasks (title, country_id, country_label, due_date, priority, status, owner_name, assigned_to, created_by)
SELECT t.title, t.c, (SELECT flag || ' ' || name FROM public.countries WHERE id = t.c), t.due::date, t.p::public.task_priority, t.s::public.task_status,
       (SELECT name FROM seed_users WHERE key = t.who), (SELECT id FROM seed_users WHERE key = t.who), (SELECT id FROM seed_users WHERE key = 'director')
FROM (VALUES
  ('Valider le plan de trésorerie T4', 'bf', '2026-10-30', 'high', 'wip', 'raf'),
  ('Relancer les créances > 30 jours', 'bf', '2026-10-25', 'high', 'open', 'raf'),
  ('Former 2 techniciens sur Lorentz PS2', 'bf', '2026-11-15', 'med', 'open', 'technical_director'),
  ('Recruter un commercial Bobo', 'bf', '2026-11-30', 'med', 'wip', 'dhr'),
  ('Campagne radio pompage solaire', 'bf', '2026-10-15', 'low', 'late', 'commercial_director'),
  ('Inventaire trimestriel du magasin', 'bf', '2026-09-30', 'med', 'done', 'logistics'),
  ('Négocier remise fournisseur panneaux 550 Wc', 'bf', '2026-11-05', 'high', 'open', 'logistics'),
  ('Due diligence distributeur Bouaké', 'ci', '2026-11-10', 'high', 'wip', 'commercial_director'),
  ('Ouvrir le compte bancaire filiale', 'ci', '2026-10-10', 'med', 'late', 'raf'),
  ('Cartographier les agropoles Nord', 'sn', '2026-10-28', 'high', 'wip', 'country_manager'),
  ('Rencontrer la SCE (PPP)', 'sn', '2026-11-12', 'med', 'open', 'country_manager'),
  ('Note de conjoncture sécurité', 'ml', '2026-12-15', 'low', 'open', 'analyst')
) t(title, c, due, p, s, who);

INSERT INTO public.risks (title, country_id, country_label, category, level, description, mitigation, probability, impact, risk_status, owner_name, review_date)
SELECT r.title, r.c, (SELECT flag || ' ' || name FROM public.countries WHERE id = r.c), r.cat, r.l::public.risk_level, r.d, r.m, r.p, r.i, 'open', r.o, r.rv::date
FROM (VALUES
  ('Retards de paiement clients agricoles', 'bf', 'Financier', 'high', 'DSO à 45 j contre 30 j visés', 'Acompte 50 % + relance J+7', 4, 4, 'Mamadou Diallo (RAF)', '2026-11-01'),
  ('Rupture panneaux 550 Wc', 'bf', 'Opérationnel', 'medium', 'Un seul fournisseur fiable', 'Second fournisseur qualifié', 3, 4, 'Rasmané Ouédraogo', '2026-11-15'),
  ('Turnover techniciens', 'bf', 'RH', 'medium', '2 départs en 6 mois', 'Plan de carrière + primes', 3, 3, 'Aminata Koné (DRH)', '2026-12-01'),
  ('Change EUR/XOF sur Victron', 'ci', 'Financier', 'low', 'Achats en euros', 'Parité fixe XOF/EUR', 1, 2, 'Mamadou Diallo (RAF)', '2027-01-15'),
  ('Instabilité sécuritaire', 'ml', 'Pays', 'high', 'Déplacements impossibles au Nord', 'Activité suspendue', 5, 5, 'Awa Ouédraogo (DG)', '2026-12-31'),
  ('Lenteur procédure PPP', 'sn', 'Réglementaire', 'medium', 'Calendrier SCE incertain', 'Partenaire local', 3, 3, 'Fatou Ndiaye (CM Sénégal)', '2026-11-20')
) r(title, c, cat, l, d, m, p, i, o, rv);

INSERT INTO public.kpi_history (country_id, month, ca, clients, nps, retention, target_ca, target_clients, target_nps, target_retention)
SELECT c, to_char(m, 'YYYY-MM'), base * (0.8 + 0.05 * extract(month FROM m)), (8 + extract(month FROM m))::int * mult, 42 + extract(month FROM m), 88,
       base, 15 * mult, 50, 90
FROM (VALUES ('bf', 45000000::numeric, 2), ('ci', 12000000::numeric, 1)) x(c, base, mult),
     generate_series('2026-01-01'::date, '2026-09-01'::date, '1 month') m;

INSERT INTO public.budget_entries (country_id, country_label, category, allocated_k, spent_k, color, fiscal_year)
SELECT c, (SELECT flag || ' ' || name FROM public.countries WHERE id = c), cat, a, s, col, 2026
FROM (VALUES ('bf', 'Installation & logistique', 60000, 48500, 'sage'), ('bf', 'Marketing', 15000, 11200, 'gold'),
             ('ci', 'Implantation filiale', 40000, 22000, 'sky'), ('ci', 'Recrutement', 12000, 4000, 'plum'),
             ('sn', 'Études', 8000, 3500, 'terracotta')) b(c, cat, a, s, col);

-- ---------------------------------------------------------------------
-- 3. Technico-commercial : référentiels, kits complets, objectifs, ventes
-- ---------------------------------------------------------------------
UPDATE public.tc_labor_profiles SET hourly_rate = v.rate FROM (VALUES
 ('Ingénieur / Chef de projet', 6000), ('Chef d''équipe / Technicien supérieur', 4000), ('Technicien électricien', 3000),
 ('Technicien plombier / pompiste', 3000), ('Aide-technicien / Manœuvre', 1500), ('Chauffeur', 1200)) v(name, rate)
WHERE tc_labor_profiles.name = v.name;
UPDATE public.tc_teams SET name = v.n, manager = v.m, region = v.r FROM (VALUES
 ('Équipe 1', 'Équipe Ouaga Nord', 'Moussa Sawadogo', 'Centre'), ('Équipe 2', 'Équipe Ouaga Sud', 'Fatim Traoré', 'Centre-Sud'),
 ('Équipe 3', 'Équipe Bobo', 'Seydou Sanou', 'Hauts-Bassins'), ('Équipe 4', 'Équipe Est', 'Rasmané Ouédraogo', 'Est')) v(o, n, m, r)
WHERE tc_teams.name = v.o;
INSERT INTO public.tc_supplier_prices (designation, supplier, unit_price, lead_days, quote_date) VALUES
 ('PANNEAU SOLAIRE 550 WC', 'Solaris BF', 85000, 7, '2026-09-01'), ('PANNEAU SOLAIRE 550 WC', 'Energie+ Ouaga', 79000, 14, '2026-09-03'),
 ('CABLE SOLAIRE 6MM² (m)', 'Quincaillerie du Faso', 900, 2, '2026-09-02'), ('STRUCTURE ALU 4 PANNEAUX', 'Métal Pro', 145000, 10, '2026-09-02'),
 ('FOYER AMÉLIORÉ SOLAIRE', 'Cuisine Verte SARL', 175000, 21, '2026-08-20');

DO $$
DECLARE k record; it record; n int; lab uuid; tech uuid; aide uuid; mult int;
BEGIN
  SELECT id INTO tech FROM tc_labor_profiles WHERE name = 'Technicien électricien';
  SELECT id INTO aide FROM tc_labor_profiles WHERE name = 'Aide-technicien / Manœuvre';
  SELECT id INTO lab FROM tc_labor_profiles WHERE name = 'Technicien plombier / pompiste';
  FOR k IN SELECT * FROM tc_kits LOOP
    mult := CASE k.variant WHEN 'PETIT' THEN 1 WHEN 'MOYEN' THEN 2 ELSE 3 END;
    n := 0;
    FOR it IN SELECT designation FROM tc_stock_items
      WHERE solution_code = k.solution_code AND quantity > 0 AND unit_cost > 0
      ORDER BY unit_cost DESC LIMIT 2 + mult LOOP
      n := n + 1;
      INSERT INTO tc_kit_items (kit_id, line_no, designation, quantity) VALUES (k.id, n, it.designation, mult);
    END LOOP;
    IF k.solution_code = 'CUISSON' THEN
      INSERT INTO tc_kit_items (kit_id, line_no, designation, quantity) VALUES (k.id, n + 1, 'FOYER AMÉLIORÉ SOLAIRE', mult);
    ELSE
      INSERT INTO tc_kit_items (kit_id, line_no, designation, quantity) VALUES (k.id, n + 1, 'PANNEAU SOLAIRE 550 WC', 4 * mult),
                                                                              (k.id, n + 2, 'CABLE SOLAIRE 6MM² (m)', 30 * mult);
    END IF;
    INSERT INTO tc_kit_labor (kit_id, line_no, profile_id, people, hours_per_person) VALUES
      (k.id, 1, CASE WHEN k.solution_code = 'LORENTZ' THEN lab ELSE tech END, 2, 8 * mult),
      (k.id, 2, aide, 1, 8 * mult);
    UPDATE tc_kits SET transport_cost = 25000 * mult, customer_need = 'Dimensionnement standard AES' WHERE id = k.id;
  END LOOP;
END $$;

INSERT INTO public.tc_objectives (team_id, solution_code, month, kits_target, revenue_target)
SELECT t.id, s.code, m::date, CASE s.code WHEN 'LORENTZ' THEN 2 ELSE 1 END, CASE s.code WHEN 'LORENTZ' THEN 9000000 WHEN 'VICTRON' THEN 5000000 ELSE 3500000 END
FROM public.tc_teams t CROSS JOIN public.tc_solutions s CROSS JOIN generate_series('2026-01-01'::date, '2026-12-01'::date, '1 month') m
WHERE s.code IN ('VICTRON', 'LORENTZ', 'HUAWEI');

-- ~90 devis répartis sur janvier → octobre, tous les stades (perdu, devis, vendu, livré, payé, en retard)
DO $$
DECLARE
  i int; h int; qd date; sd date; dd date; kit record; team uuid; zone uuid; rep record; st int;
  clients text[] := ARRAY['Coopérative de Ziniaré','Ferme Kaya Bio','Clinique Manga','Maraîchers de Bobo','Mairie de Fada','École de Koudougou',
    'Hôtel Yako','Usine de Banfora','Centre de santé Dori','Boulangerie Tenkodogo','GIE Femmes de Kongoussi','Union des producteurs de Dédougou',
    'Lycée de Gaoua','Pharmacie Ouahigouya','Station agricole Diébougou','Restaurant Le Baobab','ONG Eau Pour Tous','Coopérative rizicole Bagré',
    'Mine artisanale Kaya','Dispensaire Ziniaré'];
  price numeric; dep numeric; bal numeric;
BEGIN
  FOR i IN 1..90 LOOP
    h := abs(hashtext('aes' || i));
    qd := DATE '2026-01-05' + (i * 3) + (h % 3);
    IF qd > DATE '2026-10-20' THEN qd := DATE '2026-10-20' - (h % 10); END IF;
    SELECT * INTO kit FROM tc_kits WHERE solution_code <> 'SPARK' OR variant = 'PETIT' ORDER BY sort_order OFFSET (h % 13) LIMIT 1;
    SELECT id INTO team FROM tc_teams ORDER BY sort_order OFFSET (h % 4) LIMIT 1;
    SELECT id INTO zone FROM tc_zones ORDER BY sort_order OFFSET (h % 16) LIMIT 1;
    SELECT * INTO rep FROM seed_users WHERE key = CASE WHEN h % 3 = 0 THEN 'sales_rep2' ELSE 'sales_rep' END;
    st := h % 10;   -- 0 perdu · 1-2 devis · 3-4 vendu · 5-9 livré
    IF qd > DATE '2026-10-01' AND st >= 5 THEN st := 3; END IF;
    sd := CASE WHEN st >= 3 THEN qd + 3 + (h % 12) END;
    IF sd > DATE '2026-10-21' THEN sd := DATE '2026-10-21'; END IF;
    dd := CASE WHEN st >= 5 THEN sd + 5 + (h % 15) END;
    IF dd > DATE '2026-10-21' THEN dd := NULL; END IF;
    price := NULL;
    dep := 0; bal := 0;
    INSERT INTO tc_sales (quote_no, quote_date, team_id, salesperson, client, kit_id, quantity, discount_rate, sale_date, delivery_date, lost,
      zone_id, probability, planned_install_date, created_by, remark)
    VALUES ('DEV-2026-' || lpad(i::text, 4, '0'), qd, team, rep.name, clients[1 + (h % 20)], kit.id, 1 + (h % 3),
      CASE WHEN h % 7 = 0 THEN 0.05 ELSE 0 END, sd, dd, st = 0, zone,
      CASE WHEN st IN (1, 2) THEN (ARRAY[0.3, 0.5, 0.7, 0.9])[1 + (h % 4)] END,
      CASE WHEN st IN (3, 4) THEN sd + 10 + (h % 20) WHEN st IN (1, 2) THEN qd + 30 END, rep.id,
      CASE WHEN st = 0 THEN 'Budget client insuffisant' END);
  END LOOP;
END $$;

-- Encaissements : acompte 50 % à la signature, solde à la livraison pour une partie (le reste est en retard)
CREATE TEMP TABLE seed_prices AS
SELECT s.id, s.quantity * coalesce(
  (SELECT sum(coalesce(sp.unit_price, si.unit_cost) * ki.quantity) FROM tc_kit_items ki
     LEFT JOIN LATERAL (SELECT unit_cost FROM tc_stock_items si WHERE upper(si.designation) = upper(ki.designation) LIMIT 1) si ON true
     LEFT JOIN LATERAL (SELECT min(unit_price) unit_price FROM tc_supplier_prices sp WHERE upper(sp.designation) = upper(ki.designation)) sp ON true
   WHERE ki.kit_id = s.kit_id), 1000000) * 1.25 * 1.18 * (1 - s.discount_rate) AS ttc
FROM tc_sales s WHERE s.sale_date IS NOT NULL;
UPDATE tc_sales s SET deposit_amount = round(p.ttc * 0.5, -3), deposit_date = s.sale_date
FROM seed_prices p WHERE p.id = s.id AND abs(hashtext(s.quote_no)) % 6 <> 0;
UPDATE tc_sales s SET balance_amount = round(p.ttc * 0.45, -3), balance_date = s.delivery_date + 10
FROM seed_prices p WHERE p.id = s.id AND s.delivery_date IS NOT NULL AND s.delivery_date + 10 <= DATE '2026-10-21'
  AND abs(hashtext(s.quote_no)) % 4 <> 0;

-- ---------------------------------------------------------------------
-- 4. Finance : exercice 2026 ouvert, budgets des 6 pôles, trésorerie, P&L, KPI
-- ---------------------------------------------------------------------
INSERT INTO public.budget_scenarios (name, fiscal_year, status, is_baseline, description)
VALUES ('Budget AES 2026', 2026, 'draft', true, 'Budget AES par pôle (recette)');

WITH s AS (SELECT id FROM public.budget_scenarios WHERE name = 'Budget AES 2026'),
acc AS (SELECT id, code, row_number() OVER (ORDER BY sort_order) rn FROM public.budget_categories WHERE code ~ '^AES-\d+\.\d+$'),
p AS (SELECT id, code, CASE code WHEN 'COMM' THEN 1.2 WHEN 'TECH' THEN 1.5 WHEN 'ADM' THEN 1 WHEN 'RH' THEN 0.6 WHEN 'DG' THEN 0.8 ELSE 0.5 END f FROM public.bi_poles),
base AS (SELECT s.id sid, acc.id aid, p.id pid, round((150000 + (abs(hashtext(acc.code || p.code)) % 9) * 50000) * p.f, -3) AS m, acc.code, p.code pc
         FROM s, acc, p)
INSERT INTO public.budget_lines (scenario_id, category_id, pole_id, line_type, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12)
SELECT sid, aid, pid, 'budget', m/1000, m/1000, m/1000, m/1000, m/1000, m/1000, m/1000, m/1000, m/1000, m/1000, m/1000, m/1000 FROM base -- milliers de FCFA
UNION ALL
SELECT sid, aid, pid, 'actual',
  round(m * 0.9, -3)/1000, round(m * 1.05, -3)/1000, round(m * 0.95, -3)/1000, round(m * 1.1, -3)/1000, round(m * 0.85, -3)/1000, round(m * 1.0, -3)/1000,
  round(m * 1.2, -3)/1000, round(m * 0.9, -3)/1000, round(m * (CASE WHEN pc = 'COMM' AND code = 'AES-3.1' THEN 2.4 ELSE 1.05 END), -3)/1000, 0, 0, 0
FROM base;

INSERT INTO public.fin_treasury_years (fiscal_year, opening_balance, min_threshold, country_id) VALUES (2026, 42000000, 20000000, NULL);
-- Décaissements mensuels (janvier → septembre) ; les encaissements viennent du journal des ventes (bouton de reprise)
INSERT INTO public.fin_treasury_values (fiscal_year, line_code, month, amount, country_id)
SELECT 2026, l.code, m, round(v * (0.85 + (abs(hashtext(l.code || m)) % 30) / 100.0), -3), NULL
FROM (VALUES ('dec_achats', 14000000), ('dec_personnel', 9500000), ('dec_loyers', 1200000), ('dec_carburant', 1800000), ('dec_telecom', 350000),
             ('dec_fournitures', 400000), ('dec_marketing', 900000), ('dec_soustraitance', 1500000), ('dec_emprunts', 1250000), ('dec_interets', 300000),
             ('dec_tva', 2100000), ('dec_invest', 0), ('dec_autres', 250000), ('enc_subv', 0), ('enc_sav', 900000), ('enc_autres', 200000)) l(code, v),
     generate_series(1, 9) m
WHERE v > 0;
INSERT INTO public.fin_treasury_values (fiscal_year, line_code, month, amount, country_id) VALUES
  (2026, 'enc_subv', 4, 25000000, NULL), (2026, 'dec_invest', 3, 18000000, NULL), (2026, 'dec_invest', 8, 6500000, NULL);
-- Prévisions annuelles (mois 0)
INSERT INTO public.fin_treasury_values (fiscal_year, line_code, month, amount, country_id)
SELECT 2026, code, 0, v, NULL FROM (VALUES ('enc_pv', 260000000), ('enc_pompage', 300000000), ('enc_sav', 12000000), ('enc_subv', 25000000),
  ('dec_achats', 170000000), ('dec_personnel', 115000000), ('dec_tva', 26000000)) x(code, v);

INSERT INTO public.fin_pnl_values (fiscal_year, line_code, budget, actual, country_id)
SELECT 2026, code, b, a, NULL FROM (VALUES
  ('ca_pv', 260000000, 0), ('ca_pompage', 300000000, 0), ('ca_froid', 30000000, 4500000), ('ca_elec', 20000000, 9800000), ('ca_sav', 12000000, 8100000),
  ('ca_subv', 25000000, 25000000), ('cv_marchandises', 330000000, 0), ('cv_matieres', 15000000, 11200000), ('cv_soustraitance', 18000000, 13100000),
  ('cv_commissions', 0, 0), ('pe_salaires', 96000000, 71500000), ('pe_cnss', 15400000, 11450000), ('pe_primes', 6000000, 3900000),
  ('op_loyers', 14400000, 10800000), ('op_carburant', 21600000, 17300000), ('op_telecom', 4200000, 3150000), ('op_marketing', 10800000, 9700000),
  ('op_autres', 6000000, 4100000), ('fi_interets', 3600000, 2700000), ('fi_frais', 1200000, 950000), ('is_its', 15000000, 0)) x(code, b, a);

-- Encaissements et chiffre d'affaires déjà repris du journal des ventes (comme le bouton « Reprendre » du RAF)
INSERT INTO public.fin_treasury_values (fiscal_year, line_code, month, amount, country_id)
SELECT 2026, CASE WHEN k.solution_code = 'LORENTZ' THEN 'enc_pompage' ELSE 'enc_pv' END, extract(month FROM x.d)::int, sum(x.a), NULL
FROM (SELECT kit_id, deposit_date d, deposit_amount a FROM tc_sales WHERE deposit_amount > 0 AND deposit_date >= '2026-01-01'
      UNION ALL SELECT kit_id, balance_date, balance_amount FROM tc_sales WHERE balance_amount > 0 AND balance_date >= '2026-01-01') x
JOIN tc_kits k ON k.id = x.kit_id
GROUP BY 2, 3;
UPDATE public.fin_pnl_values v SET actual = s.ht FROM (
  SELECT CASE WHEN k.solution_code = 'LORENTZ' THEN 'ca_pompage' ELSE 'ca_pv' END code, round(sum(p.ttc) / 1.18, -3) ht
  FROM seed_prices p JOIN tc_sales t ON t.id = p.id JOIN tc_kits k ON k.id = t.kit_id GROUP BY 1) s
WHERE v.line_code = s.code AND v.fiscal_year = 2026;
UPDATE public.fin_pnl_values v SET actual = round((SELECT actual FROM public.fin_pnl_values WHERE line_code IN ('ca_pv')) * 0.62 + (SELECT actual FROM public.fin_pnl_values WHERE line_code = 'ca_pompage') * 0.6, -3)
WHERE line_code = 'cv_marchandises';
UPDATE public.fin_pnl_values SET actual = round((SELECT sum(actual) FROM public.fin_pnl_values WHERE line_code IN ('ca_pv','ca_pompage')) * 0.02, -3) WHERE line_code = 'cv_commissions';

-- KPI : objectifs pour tous les mois, réalisés pour les KPI non calculés automatiquement
INSERT INTO public.fin_kpi_values (kpi_code, month, target, actual, comment, country_id)
SELECT k.code, m::date,
  CASE k.code WHEN 'F5' THEN 30 WHEN 'C7' THEN 40 WHEN 'C8' THEN 150000 WHEN 'T3' THEN 0.9 WHEN 'T4' THEN 0.95 WHEN 'T5' THEN 0.05 WHEN 'T6' THEN 12
    WHEN 'T7' THEN 48 WHEN 'RH1' THEN 42 WHEN 'RH2' THEN 0.95 WHEN 'RH3' THEN 0.05 WHEN 'RH4' THEN 0.10 WHEN 'RH5' THEN 1 WHEN 'RH6' THEN 3
    WHEN 'RH7' THEN 2 WHEN 'RH8' THEN 0.8 WHEN 'RH9' THEN 2 WHEN 'C1' THEN 1 WHEN 'C4' THEN 0.4 WHEN 'F2' THEN 0.25 ELSE NULL END,
  CASE WHEN k.code IN ('C7','C8','T3','T4','T5','T6','T7') OR k.code LIKE 'RH%' OR k.code LIKE 'PR%' THEN
    CASE k.code WHEN 'C7' THEN 30 + extract(month FROM m) WHEN 'C8' THEN 175000 WHEN 'T3' THEN 0.86 WHEN 'T4' THEN 0.97 WHEN 'T5' THEN 0.07
      WHEN 'T6' THEN 9 + extract(month FROM m) % 5 WHEN 'T7' THEN 52 WHEN 'RH1' THEN 40 + extract(month FROM m) % 3 WHEN 'RH2' THEN 0.93
      WHEN 'RH3' THEN 0.06 WHEN 'RH4' THEN 0.12 WHEN 'RH5' THEN 0.6 + extract(month FROM m) / 30 WHEN 'RH6' THEN 2.8 WHEN 'RH7' THEN 1.5
      WHEN 'RH8' THEN 0.74 WHEN 'RH9' THEN 3 ELSE 0.1 * extract(month FROM m) END
  END,
  CASE WHEN k.code = 'C8' AND m = '2026-09-01' THEN 'CAC en hausse : campagne radio peu efficace' END, NULL
FROM public.fin_kpis k CROSS JOIN generate_series('2026-01-01'::date, '2026-09-01'::date, '1 month') m;

-- ---------------------------------------------------------------------
-- 5. Reporting : rapports A1–A12 à tous les stades du circuit
-- ---------------------------------------------------------------------
INSERT INTO public.bi_report_instances (template_code, title, period, status, author_id, author_name, submitted_at, reviewed_by, reviewed_at, review_comment, pole_id, data)
SELECT r.code, r.title, r.period, r.status, a.id, a.name,
  CASE WHEN r.status <> 'draft' THEN now() - interval '3 days' END,
  CASE WHEN r.status IN ('validated', 'rejected') THEN v.id END, CASE WHEN r.status IN ('validated', 'rejected') THEN now() - interval '1 day' END,
  r.rc, (SELECT id FROM public.bi_poles WHERE code = r.pole), r.data::jsonb
FROM (VALUES
  ('A1', 'Flash hebdomadaire', '2026-W42', 'validated', 'commercial_director', 'director', NULL, 'COMM',
   '{"highlights":"Signature Usine de Banfora (4 kits Lorentz). Stock panneaux tendu.","alerts":"Créance Clinique Manga à 17 j de retard"}'),
  ('A2', 'Rapport mensuel Commercial & Marketing', '2026-09', 'validated', 'commercial_director', 'director', NULL, 'COMM',
   '{"summary":"Septembre : 59 % de l''objectif CA, pipeline solide sur le pompage.","strengths":"Lorentz moyen très demandé."}'),
  ('A3', 'Rapport mensuel Technique & Opérations', '2026-09', 'submitted', 'technical_director', NULL, NULL, 'TECH',
   '{"summary":"12 installations, 2 reprises sur câblage.","analysis":"Renforcer le contrôle qualité avant mise en service."}'),
  ('A4', 'Rapport mensuel Administratif & Financier', '2026-09', 'submitted', 'raf', NULL, NULL, 'ADM',
   '{"summary":"Trésorerie au-dessus du seuil, DSO en dégradation.","analysis":"Imposer 50 % d''acompte."}'),
  ('A5', 'Rapport mensuel Ressources Humaines', '2026-09', 'rejected', 'dhr', 'director', 'Ajouter le suivi des recrutements Bobo', 'RH',
   '{"summary":"Effectif 41, 1 départ.","headcount":41}'),
  ('A6', 'Évaluation individuelle', '2026-09-30', 'draft', 'dhr', NULL, NULL, 'RH',
   '{"employee":"Seydou Sanou","job":"Technicien","eval_type":"Semestrielle"}'),
  ('A9', 'Compte rendu Task Force', '2026-W43', 'submitted', 'director', NULL, NULL, NULL,
   '{"decisions":"Valider le recrutement d''un commercial à Bobo. Lancer le second fournisseur panneaux."}'),
  ('A10', 'Rapport trimestriel de pilotage — DG', '2026-T3', 'draft', 'director', NULL, NULL, 'DG',
   '{"message":"Trimestre de croissance malgré les retards de paiement."}'),
  ('A12', 'Fiche d''intervention technique', '2026-10-18', 'draft', 'technician', NULL, NULL, 'TECH',
   '{"client":"Clinique Manga","site":"Manga","type":"Installation","work":"Installation Huawei petit, mise en service OK"}')
) r(code, title, period, status, author, reviewer, rc, pole, data)
JOIN seed_users a ON a.key = r.author LEFT JOIN seed_users v ON v.key = r.reviewer;

-- ---------------------------------------------------------------------
-- 6. Discussions : canaux, hashtags, mentions, réponses
-- ---------------------------------------------------------------------
DO $$
DECLARE
  _c1 uuid; _c2 uuid; _c3 uuid;
  dg record; raf record; dircom record; rep record; tech record; drh record;
BEGIN
  SELECT * INTO dg FROM seed_users WHERE key = 'director';
  SELECT * INTO raf FROM seed_users WHERE key = 'raf';
  SELECT * INTO dircom FROM seed_users WHERE key = 'commercial_director';
  SELECT * INTO rep FROM seed_users WHERE key = 'sales_rep';
  SELECT * INTO tech FROM seed_users WHERE key = 'technician';
  SELECT * INTO drh FROM seed_users WHERE key = 'dhr';
  INSERT INTO comments (author_id, author_name, content, tags, market_id, market_label, created_at) VALUES
    (raf.id, raf.name, '@' || rep.name || ' merci de relancer la Clinique Manga, acompte attendu #relance', ARRAY['Finance', 'relance'], 'bf', '🇧🇫 Burkina Faso', now() - interval '2 days')
    RETURNING id INTO _c1;
  INSERT INTO comment_mentions (comment_id, mentioned_user_id, mentioned_name) VALUES (_c1, rep.id, rep.name);
  INSERT INTO comments (author_id, author_name, content, tags, parent_id, created_at) VALUES
    (rep.id, rep.name, 'Relancée ce matin, paiement promis vendredi', ARRAY['Finance'], _c1, now() - interval '1 day');
  INSERT INTO comments (author_id, author_name, content, tags, created_at) VALUES
    (dircom.id, dircom.name, 'Objectif octobre à 48 % : on concentre les équipes sur le pompage #lorentz', ARRAY['Technico-commercial', 'lorentz'], now() - interval '30 hours')
    RETURNING id INTO _c2;
  INSERT INTO comments (author_id, author_name, content, tags, created_at) VALUES
    (tech.id, tech.name, '#dev-2026-0008 installation reportée : pompe en rupture', ARRAY['Technico-commercial', 'dev-2026-0008'], now() - interval '20 hours'),
    (drh.id, drh.name, 'Le rapport RH de septembre sera corrigé demain #a5-2026-09', ARRAY['Reporting', 'a5-2026-09'], now() - interval '10 hours');
  INSERT INTO comments (author_id, author_name, content, tags, created_at) VALUES
    (dg.id, dg.name, '@' || raf.name || ' peux-tu préparer le point trésorerie pour la Task Force ?', ARRAY['Direction'], now() - interval '5 hours')
    RETURNING id INTO _c3;
  INSERT INTO comment_mentions (comment_id, mentioned_user_id, mentioned_name) VALUES (_c3, raf.id, raf.name);
  INSERT INTO comments (author_id, author_name, content, tags, created_at) VALUES
    (dg.id, dg.name, 'Bienvenue sur la plateforme AES : chaque environnement a son canal.', ARRAY['Général'], now() - interval '3 days');
END $$;

SELECT 'SEED OK : ' || (SELECT count(*) FROM tc_sales) || ' devis, ' || (SELECT count(*) FROM budget_lines) || ' lignes budgétaires, '
  || (SELECT count(*) FROM bi_report_instances) || ' rapports, ' || (SELECT count(*) FROM comments) || ' messages, '
  || (SELECT count(*) FROM notifications) || ' notifications';
