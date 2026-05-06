# Plan de mise en conformité ExpansionOS

Livraison en **4 phases successives**. Chaque phase est validée par un build vert avant la suivante. Je commence dès ton OK et je te rends la main entre chaque phase pour QA.

---

## Phase 1 — Typage strict (suppression de tous les `any`)

**Objectif** : 0 occurrence de `any` dans `src/`.

### Fichiers refactorés
| Fichier | Approche |
|---|---|
| `src/hooks/useRealtimeNotifications.ts` | Créer types `TaskRow`, `RiskRow`, `CommentRow`, `MentionRow` à partir de `Database['public']['Tables'][...]['Row']`. Typer les payloads `RealtimePostgresChangesPayload<T>`. |
| `src/pages/TasksPage.tsx` | Étendre type `Task` avec `recurrence?: 'none' \| 'daily' \| 'weekly' \| 'monthly'`. Supprimer les `(task as any)`. |
| `src/components/GanttChart.tsx` | Étendre type `Milestone` avec `start_date?: string \| null; end_date?: string \| null`. |
| `src/hooks/useBudgetData.ts` | Typer la jointure `budget_lines + budget_categories` via interface `BudgetLineWithCategory`. |
| `src/components/AppSidebar.tsx` | Typer `tasks: Task[]`, `risks: Risk[]` dans le composant. |
| `src/components/MentionInput.tsx` | Typer `allUsers: Profile[]`. |
| `src/pages/CommentsPage.tsx` | Créer `CommentTreeProps` typé, `Profile`, `Reaction`, `CommentPayload`. Plus gros chantier (~15 occurrences). |

### Règle ESLint
Ajouter `"@typescript-eslint/no-explicit-any": "error"` dans `eslint.config.js` pour bloquer les régressions.

---

## Phase 2 — Multi-devises & FCFA

### Migration SQL
```text
table public.exchange_rates
  ├─ currency_code  text       (FCFA, EUR, USD, GBP, NGN, KES, ZAR, MAD, EGP, GHS)
  ├─ rate_to_fcfa   numeric    (ex: 1 EUR = 655.957 FCFA)
  ├─ effective_date date
  ├─ source         text       (ECB, BCEAO, manual)
  └─ unique(currency_code, effective_date)

policies : lecture authentifiée ; écriture admin/director uniquement
```
Seed initial avec taux pivot BCEAO du jour.

### Code
- `src/hooks/useExchangeRates.ts` — TanStack Query, cache 1 h
- `src/lib/currency.ts` — helpers :
  - `toFCFA(amount, currency, date?)`
  - `formatFCFA(amount)` → `"1 250 000 FCFA"` (espaces insécables, pas de décimales)
  - `parseFCFA(text)` → `number`
- `src/components/ExchangeRatesSettings.tsx` — table éditable dans Paramètres (admin)
- Remplacer `"Unité (%, €, pts)"` → `"Unité (%, FCFA, pts)"` dans `KpisPage.tsx`
- `marketIntelData.ts` : conserver USD/EUR (données externes, contexte continental) mais ajouter conversion FCFA en tooltip

---

## Phase 3 — Score de marché (formule officielle)

Réécriture de `src/lib/marketScoring.ts` :

```text
Score = 0.25 × checklistCompletionPct
      + 0.20 × milestonesCompletedPct
      + 0.25 × kpisGreenPct        (KPIs ≥ 80 % de leur cible)
      + 0.20 × (100 − riskExposurePct)
      + 0.10 × budgetAdherencePct  (100 − |spent − allocated| / allocated)
```

- Signature : `computeMarketScore(country, milestones, kpis, risks, budget): { score: number; breakdown: ... }`
- Badge couleur : ≥ 75 = sage, 50-74 = gold, < 50 = coral
- Tests unitaires Vitest sur 4 cas (parfait / dégradé / sans données / négatif)
- Mise à jour des composants consommateurs : `Dashboard`, `MarketDetail`, `AfricaMap`

---

## Phase 4 — 7 notifications manquantes

| # | Type | Trigger | Canal |
|---|---|---|---|
| 1 | Jalon J-7 | Edge function CRON quotidien | toast + email |
| 2 | Nouveau membre invité | Trigger DB `auth.users` insert → notify admins | toast + email admin |
| 3 | Rôle modifié | Trigger DB `user_roles` update | toast + email user concerné |
| 4 | Document uploadé sur pays suivi | Trigger DB `country_documents` insert + check `country_members` | toast |
| 5 | Changement statut marché | Trigger DB `countries` update si `status` change | toast tous |
| 6 | Rapport clôture mensuelle | CRON 1er du mois | email résumé KPIs + budget |
| 7 | Alerte budget > 90 % | Trigger sur `budget_entries` UPDATE | toast + email finance |

### Implémentation
- Edge function planifiée `notifications-cron` (jalons J-7, rapport mensuel)
- Triggers DB `notify_*` SECURITY DEFINER qui inserent dans `budget_notifications` (renommé en `notifications` générique) ou queue email via `enqueue_email`
- Page `Paramètres > Notifications` : toggles par type × canal (in-app / email) sauvegardés dans `profiles.notification_preferences` (jsonb)

---

## Détails techniques globaux
- Aucune mutation sans `useMutation` + invalidation TanStack Query
- Toutes les Edge Functions : `corsHeaders` + validation Zod + JWT vérifié manuellement
- Toute table modifiée → RLS revue
- Pas de couleur en dur introduite (utiliser tokens `sage`, `coral`, `gold`, `navy`, `cream`)
- Activity log alimenté pour chaque changement structurel

---

## Ordre & livraison
1. Phase 1 (~30 min) — refacto typage seul, zéro impact métier
2. Phase 2 (~40 min) — migration + helper + UI Settings
3. Phase 3 (~20 min) — pure logique + tests
4. Phase 4 (~50 min) — la plus lourde (DB triggers + edge function CRON + UI préférences)

Total ≈ 2 h de build effectif, livré phase par phase pour que tu valides à chaque étape.
