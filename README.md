# ExpansionOS

Plateforme de pilotage d'expansion internationale : marchés et fiches pays,
feuille de route, tâches, risques, KPI, budget multi-scénarios (workflow
d'approbation, consolidation, prévisions glissantes) et module BI.

**Stack** : React 18 · TypeScript (strict) · Vite · Tailwind / shadcn-ui ·
TanStack Query · Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions).

## Démarrer

```sh
npm ci
cp .env.example .env    # renseigner l'URL et la clé publique Supabase
npm run dev
```

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production (`dist/`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict |
| `npm test` | tests unitaires (Vitest) |
| `npm run test:db` | rejoue **toutes** les migrations sur un PostgreSQL vierge puis lance les tests de sécurité SQL (`supabase/tests`) |

`npm run test:db` attend un PostgreSQL 16 accessible via les variables
standard (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`). L'intégration continue
(`.github/workflows/ci.yml`) exécute tout cela à chaque demande de fusion.

## Variables d'environnement

Front (fichier `.env`, préfixe `VITE_`) :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publique (anon) |
| `VITE_DEMO_MODE` | `true` uniquement sur un déploiement de démonstration (affiche le bouton « compte démo ») |

Secrets des fonctions edge (Supabase → Edge Functions → Secrets) :

| Secret | Description |
|---|---|
| `DEMO_MODE` | `true` **uniquement** dans un projet Supabase dédié à la démo. Absent = `demo-login` désactivé. |
| `CRON_SECRET` | optionnel : secret alternatif accepté par les fonctions planifiées (en-tête `x-cron-secret`) |

## Modèle de sécurité

- **Rôles** (`user_roles.role`) : `admin`, `director`, `country_manager`,
  `raf`, `analyst`, `dhr`, `technical_director`, `commercial_director`,
  `observer`, `partner`. Seul le serveur (clé `service_role`) peut attribuer un
  rôle (`set_user_role`).
- **Périmètre pays** (`user_roles.scope_country_id`) : `NULL` = tous les pays.
  Chaque table métier porte une règle RLS *restrictive* `country_scope_guard` :
  quels que soient ses droits, un utilisateur ne lit ni n'écrit hors de son
  périmètre. Les lignes sans pays sont des données globales.
- **Fonctions planifiées** (`bi-report-scheduler`, `kpi-recurring-check`,
  `notifications-cron`, `detect-overdue-tasks`, `process-email-queue`) :
  réservées au serveur. pg_cron les appelle avec la clé de service lue dans le
  Vault (`email_queue_service_role_key`).
- **Emails transactionnels** : un utilisateur connecté ne peut écrire qu'à un
  utilisateur de la plateforme (`__user__:<id>`) ou aux admins (`__admins__`).
- **Pièces jointes** : buckets privés, accès par URL signées.

### Amorçage du premier administrateur

Les nouveaux inscrits sont `observer`. Pour un nouvel environnement, créez le
compte puis, dans l'éditeur SQL Supabase (exécuté en `service_role`) :

```sql
SELECT public.set_user_role('<uuid du compte>', 'admin');
```

## Migrations

- `drizzle/migrations/` — **système actuel** (journal `meta/_journal.json`).
  Toute nouvelle migration va ici.
- `supabase/migrations/` — historique figé (jusqu'à septembre 2026), rejoué
  avant Drizzle par `npm run test:db`.

## Déploiement

Hébergement : **Vercel** (déploiement automatique de `main`, prévisualisation
pour chaque demande de fusion). Le front est un site statique (`dist/`) ; la
réécriture SPA et les en-têtes de sécurité (CSP, HSTS, X-Frame-Options…) sont
dans `vercel.json`. Si un nouveau domaine externe doit être appelé depuis le
navigateur, l'ajouter à la directive `connect-src` de la CSP.

Les fonctions edge et les migrations se déploient sur Supabase, séparément.
