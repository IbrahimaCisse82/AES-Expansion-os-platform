# Recette E2E complète (local uniquement)

- `seed_full.sql` : peuple une base **locale** (14 utilisateurs, un par rôle ; 4 pays ; ~90 devis/ventes ; budgets des 6 pôles,
  trésorerie, compte de résultat, 38 KPI ; rapports A1–A12 à tous les stades ; discussions). Jamais en production.
- `full_e2e.py` : parcours Playwright — tour de toutes les pages par profil, droits par rôle, et 7 parcours métier
  (cycle de vente, finance, reporting, discussions, environnements, recherche Ctrl+K, mobile).
- `report.py` : transforme `results.json` en rapport HTML autonome.

Pré-requis : migrations rejouées (`npm run test:db`), `supabase/tests/00_helpers.sql`, PostgREST + un proxy d'authentification
(JWT HS256 signé avec `E2E_JWT_SECRET`) et `vite` avec `VITE_SUPABASE_URL` pointant sur ce proxy.

```bash
E2E_USERS=users.json E2E_JWT_SECRET=… E2E_OUT=./rapport python3 scripts/e2e/full_e2e.py
python3 scripts/e2e/report.py ./rapport
```
