-- Rattrapage (audit 2026-10-21) : la table app_settings existe en production
-- mais n'était créée par aucune migration, ce qui empêchait de rejouer le
-- schéma de zéro. Idempotent : sans effet là où la table existe déjà.
-- Sa sécurité (RLS + règles) est garantie par drizzle/0004.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
