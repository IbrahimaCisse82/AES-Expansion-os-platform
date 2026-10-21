-- =====================================================================
-- 0006 — Rôles de l'environnement Technico-Commercial (AES)
-- Profils du classeur « Tableau de bord technico-commercial » absents de
-- la plateforme : commerciaux, techniciens, magasin / achats.
-- (Fichier séparé : une valeur d'enum ajoutée ne peut pas être utilisée
--  dans la même transaction que son ajout.)
-- =====================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_rep';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technician';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'logistics';
