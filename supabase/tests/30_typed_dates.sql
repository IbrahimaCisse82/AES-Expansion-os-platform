-- Analyseur des dates historiques et types des colonnes (audit 2026-10-21).
BEGIN;
SELECT test_utils.assert(public.parse_legacy_date(v) IS NOT DISTINCT FROM e::date, format('parse_legacy_date(%L) = %s', v, coalesce(e, 'NULL')))
FROM (VALUES
  ('2025-08-15', '2025-08-15'),
  ('2025-08-15T10:00:00Z', '2025-08-15'),
  ('15/08/2025', '2025-08-15'),
  ('5-8-2025', '2025-08-05'),
  ('30 Juil 2025', '2025-07-30'),
  ('5 Août 2025', '2025-08-05'),
  ('1er sept. 2025', '2025-09-01'),
  ('20 Déc 2025', '2025-12-20'),
  ('Mars 2025', '2025-03-01'),
  ('Fév 2025', '2025-02-01'),
  ('juillet 2026', '2026-07-01'),
  ('2026-03', '2026-03-01'),
  ('T3 2025', '2025-07-01'),
  ('Q1 2026', '2026-01-01'),
  ('31/02/2025', NULL),
  ('bientôt', NULL),
  ('', NULL),
  (NULL, NULL)
) AS t(v, e);

SELECT test_utils.assert(
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND data_type <> 'date' AND (table_name, column_name) IN (
     ('tasks','due_date'), ('tasks','recurrence_next_date'), ('milestones','target_date'),
     ('milestones','start_date'), ('milestones','end_date'), ('risks','review_date'),
     ('budget_capex_items','acquisition_date'), ('budget_close_tasks','due_date'),
     ('budget_investments','acquisition_date'), ('budget_journal_entries','entry_date'),
     ('market_intel_items','date'))) = 0,
  'les 11 colonnes de dates sont de type DATE');

-- Mois : format AAAA-MM imposé
INSERT INTO public.countries (id, name) VALUES ('zz', 'Test');
DO $$ BEGIN
  INSERT INTO public.kpi_history (country_id, month) VALUES ('zz', 'Mars 2025');
  RAISE EXCEPTION 'ÉCHEC : un mois au format libre a été accepté';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok — kpi_history.month refuse un format libre';
END $$;

-- Intégrité : pas de ligne rattachée à un pays inexistant
DO $$ BEGIN
  INSERT INTO public.country_notes (country_id, content) VALUES ('pays-fantome', 'x');
  RAISE EXCEPTION 'ÉCHEC : note créée pour un pays inexistant';
EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'ok — country_notes exige un pays existant';
END $$;
ROLLBACK;
