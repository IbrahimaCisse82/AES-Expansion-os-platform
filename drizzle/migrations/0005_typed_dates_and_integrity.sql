-- =====================================================================
-- 0005 — Dates typées et intégrité référentielle (audit 2026-10-21)
--
-- 1. 11 colonnes de dates stockées en texte ("30 Juil 2025", "Mars 2025",
--    "2025-08-15"…) passent au type DATE. Le front écrit déjà de l'ISO et
--    PostgREST renvoie les DATE en "AAAA-MM-JJ" : transparent pour le code.
--    SANS PERTE : chaque valeur d'origine est d'abord copiée dans
--    public.legacy_date_backup (avec la date obtenue, NULL si illisible).
-- 2. Colonnes « mois » (AAAA-MM) : contrainte de format.
-- 3. Clés étrangères vers countries sur les 11 colonnes qui n'en avaient
--    pas (créées NOT VALID puis validées si aucune donnée orpheline).
-- =====================================================================

-- 1a. Analyseur des formats de date rencontrés ---------------------------
CREATE OR REPLACE FUNCTION public.parse_legacy_date(_raw text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _s text;
  _m text[];
  _month int;
  _months constant jsonb := '{
    "jan":1,"janv":1,"janvier":1,"january":1,
    "fev":2,"fevr":2,"fevrier":2,"feb":2,"february":2,
    "mar":3,"mars":3,"march":3,
    "avr":4,"avril":4,"apr":4,"april":4,
    "mai":5,"may":5,
    "juin":6,"jun":6,"june":6,
    "juil":7,"juillet":7,"jul":7,"july":7,
    "aou":8,"aout":8,"aug":8,"august":8,
    "sep":9,"sept":9,"septembre":9,"september":9,
    "oct":10,"octobre":10,"october":10,
    "nov":11,"novembre":11,"november":11,
    "dec":12,"decembre":12,"december":12
  }';
BEGIN
  IF _raw IS NULL OR btrim(_raw) = '' THEN RETURN NULL; END IF;
  _s := lower(btrim(_raw));
  _s := translate(_s, 'éèêëàâäûüôöîïç', 'eeeeaaauuooiic');
  _s := regexp_replace(_s, '\.', '', 'g');

  -- AAAA-MM-JJ (éventuellement suivi d'une heure)
  _m := regexp_match(_s, '^(\d{4})-(\d{1,2})-(\d{1,2})');
  IF _m IS NOT NULL THEN RETURN make_date(_m[1]::int, _m[2]::int, _m[3]::int); END IF;

  -- JJ/MM/AAAA ou JJ-MM-AAAA (format français)
  _m := regexp_match(_s, '^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$');
  IF _m IS NOT NULL THEN RETURN make_date(_m[3]::int, _m[2]::int, _m[1]::int); END IF;

  -- AAAA-MM -> 1er du mois
  _m := regexp_match(_s, '^(\d{4})-(\d{1,2})$');
  IF _m IS NOT NULL THEN RETURN make_date(_m[1]::int, _m[2]::int, 1); END IF;

  -- "30 juil 2025", "1er sept 2025"
  _m := regexp_match(_s, '^(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})$');
  IF _m IS NOT NULL THEN
    _month := (_months ->> _m[2])::int;
    IF _month IS NOT NULL THEN RETURN make_date(_m[3]::int, _month, _m[1]::int); END IF;
  END IF;

  -- "mars 2025" -> 1er du mois
  _m := regexp_match(_s, '^([a-z]+)\s+(\d{4})$');
  IF _m IS NOT NULL THEN
    _month := (_months ->> _m[1])::int;
    IF _month IS NOT NULL THEN RETURN make_date(_m[2]::int, _month, 1); END IF;
  END IF;

  -- "T3 2025" / "Q3 2025" -> 1er jour du trimestre
  _m := regexp_match(_s, '^[tq]([1-4])\s+(\d{4})$');
  IF _m IS NOT NULL THEN RETURN make_date(_m[2]::int, (_m[1]::int - 1) * 3 + 1, 1); END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- date impossible (31/02…) : on ne devine pas
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.parse_legacy_date(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parse_legacy_date(text) TO authenticated, service_role;

-- 1b. Sauvegarde des valeurs d'origine -----------------------------------
CREATE TABLE IF NOT EXISTS public.legacy_date_backup (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  column_name text NOT NULL,
  row_id uuid NOT NULL,
  original_value text NOT NULL,
  converted_value date,
  note text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legacy_date_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Legacy dates readable by admin" ON public.legacy_date_backup;
CREATE POLICY "Legacy dates readable by admin" ON public.legacy_date_backup FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));
REVOKE ALL ON public.legacy_date_backup FROM anon;

-- 1c. Conversion -----------------------------------------------------------
DO $conv$
DECLARE
  _c record;
  _lost int;
  _required boolean;
BEGIN
  FOR _c IN
    SELECT * FROM (VALUES
      ('budget_capex_items', 'acquisition_date'),
      ('budget_close_tasks', 'due_date'),
      ('budget_investments', 'acquisition_date'),
      ('budget_journal_entries', 'entry_date'),
      ('market_intel_items', 'date'),
      ('milestones', 'target_date'),
      ('milestones', 'start_date'),
      ('milestones', 'end_date'),
      ('risks', 'review_date'),
      ('tasks', 'due_date'),
      ('tasks', 'recurrence_next_date')
    ) AS v(tbl, col)
  LOOP
    -- déjà converti (migration rejouée) ?
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = _c.tbl AND column_name = _c.col) <> 'text' THEN
      CONTINUE;
    END IF;

    SELECT is_nullable = 'NO' INTO _required FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _c.tbl AND column_name = _c.col;

    EXECUTE format(
      'INSERT INTO public.legacy_date_backup (table_name, column_name, row_id, original_value, converted_value, note)
       SELECT %1$L, %2$L, id, %2$I, public.parse_legacy_date(%2$I),
              CASE WHEN public.parse_legacy_date(%2$I) IS NULL AND %3$L
                   THEN %4$L END
       FROM public.%1$I WHERE %2$I IS NOT NULL AND btrim(%2$I) <> %5$L',
      _c.tbl, _c.col, _required, 'colonne obligatoire : date de création de la ligne retenue', '');

    -- l'ancien défaut '' n'est pas une date
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', _c.tbl, _c.col);

    IF _required THEN
      -- Colonne obligatoire : une valeur illisible prend la date de création
      -- de la ligne (tracée dans legacy_date_backup.note) plutôt qu'une date
      -- inventée ; les nouvelles lignes prennent la date du jour par défaut.
      EXECUTE format(
        'ALTER TABLE public.%1$I ALTER COLUMN %2$I TYPE date
           USING COALESCE(public.parse_legacy_date(%2$I), created_at::date, CURRENT_DATE)',
        _c.tbl, _c.col);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT CURRENT_DATE', _c.tbl, _c.col);
    ELSE
      EXECUTE format(
        'ALTER TABLE public.%1$I ALTER COLUMN %2$I TYPE date USING public.parse_legacy_date(%2$I)',
        _c.tbl, _c.col);
    END IF;

    SELECT count(*) INTO _lost FROM public.legacy_date_backup
      WHERE table_name = _c.tbl AND column_name = _c.col AND converted_value IS NULL AND note IS NULL;
    IF _lost > 0 THEN
      RAISE WARNING '%.% : % valeur(s) illisible(s) mise(s) à NULL — originaux dans legacy_date_backup',
        _c.tbl, _c.col, _lost;
    END IF;
  END LOOP;
END
$conv$;

CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS milestones_target_date_idx ON public.milestones (target_date);

-- 2. Colonnes « mois » au format AAAA-MM ---------------------------------
DO $month$
DECLARE _c record;
BEGIN
  FOR _c IN SELECT * FROM (VALUES ('kpi_history', 'month'), ('custom_kpi_values', 'month')) AS v(tbl, col)
  LOOP
    EXECUTE format('ALTER TABLE public.%1$I DROP CONSTRAINT IF EXISTS %1$s_month_format', _c.tbl);
    EXECUTE format(
      'ALTER TABLE public.%1$I ADD CONSTRAINT %1$s_month_format
         CHECK (%2$I ~ %3$L) NOT VALID',
      _c.tbl, _c.col, '^\d{4}-(0[1-9]|1[0-2])$');
    BEGIN
      EXECUTE format('ALTER TABLE public.%1$I VALIDATE CONSTRAINT %1$s_month_format', _c.tbl);
    EXCEPTION WHEN check_violation THEN
      RAISE WARNING '%.% : des mois existants ne sont pas au format AAAA-MM (contrainte appliquée aux nouvelles lignes seulement)',
        _c.tbl, _c.col;
    END;
  END LOOP;
END
$month$;

-- 3. Clés étrangères vers countries ---------------------------------------
--    Données opérationnelles d'un pays : supprimées avec lui (comme
--    milestones/roadmap_bars). Données financières : conservées, pays NULL
--    (comme budget_lines).
DO $fk$
DECLARE _c record; _name text;
BEGIN
  FOR _c IN
    SELECT * FROM (VALUES
      ('country_documents', 'CASCADE'),
      ('country_members', 'CASCADE'),
      ('country_notes', 'CASCADE'),
      ('phase_checklist_items', 'CASCADE'),
      ('kpi_history', 'CASCADE'),
      ('custom_kpi_values', 'CASCADE'),
      ('budget_capex_items', 'SET NULL'),
      ('budget_close_tasks', 'SET NULL'),
      ('budget_journal_entries', 'SET NULL'),
      ('budget_validation_rules', 'SET NULL'),
      ('budget_investments', 'SET NULL')
    ) AS v(tbl, on_delete)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = _c.tbl AND column_name = 'country_id') THEN
      CONTINUE;
    END IF;
    _name := _c.tbl || '_country_id_fkey';
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = _name) THEN CONTINUE; END IF;
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (country_id)
         REFERENCES public.countries (id) ON UPDATE CASCADE ON DELETE %s NOT VALID',
      _c.tbl, _name, _c.on_delete);
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', _c.tbl, _name);
    EXCEPTION WHEN foreign_key_violation THEN
      RAISE WARNING '% : lignes rattachées à un pays inexistant (clé appliquée aux nouvelles lignes seulement)', _c.tbl;
    END;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (country_id)', _c.tbl || '_country_id_idx', _c.tbl);
  END LOOP;
END
$fk$;
