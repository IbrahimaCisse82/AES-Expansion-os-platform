# Module Business Intelligence (BI) pour ExpansionOS

Nouveau module transversal « Business Intelligence », accessible depuis la barre latérale (section ANALYSE), qui agrège toutes les données de la plateforme (pays, tâches, risques, jalons, KPIs, budget FP&A) et reprend la logique du classeur financier AES Burkina (pôles COMM / TECH / ADM / RH / DG / BOBO, trésorerie, compte de résultat, marge projet, KPI dashboard) — en modèle de structure uniquement, sans importer les chiffres du fichier.

## Ce que l'utilisateur obtient

Une page `/app/bi` avec 5 onglets :

1. **Vue d'ensemble** — dashboards interactifs : exécution budgétaire, résultat par pôle, tendance trésorerie, avancement pays, top risques, KPIs clés. Filtres globaux persistants : pays, pôle, période (mois/trimestre/année), scénario, devise d'affichage (FCFA pivot).
2. **Analyse par pôle** — restitution type classeur AES : budget vs réalisé par pôle et par mois, consolidation multi-pôles, marge par projet, avec drill-down (pôle → catégorie → ligne).
3. **Constructeur de rapports** — sélection de dimensions (pays, pôle, catégorie, mois, statut, assignataire) et de mesures (budget, réalisé, écart, %, nombre de tâches/risques), rendu en tableau croisé + graphique au choix, filtres et tri. Rapports sauvegardables, renommables, partageables (privé / équipe).
4. **Diffusion** — export Excel et PDF de tout rapport, plus planification d'envoi par email (quotidien / hebdomadaire / mensuel) vers des destinataires internes, en réutilisant l'infrastructure email existante.
5. **Analyse IA** — synthèse en français des écarts et tendances du rapport courant, détection d'anomalies et recommandations, via Lovable AI.

Tout est en français, montants en FCFA, couleurs issues des tokens du thème existant.

## Règles d'accès

- Admin / Directeur : toutes les données, tous les pays.
- RAF et rôles avec périmètre pays : BI limité automatiquement à leur pays (les filtres n'exposent pas les autres).
- Observateur / partenaire : lecture seule, pas de création ni de planification de rapports.
- Les rapports sauvegardés sont visibles par leur auteur ; le partage « équipe » les rend visibles aux utilisateurs du même périmètre pays.

## Détails techniques

**Base de données (nouvelles tables, avec GRANT + RLS scopées par `can_access_country` / `has_role`)**
- `bi_pole` (enum ou table de référence) : COMM, TECH, ADM, RH, DG, BOBO — configurable.
- `bi_saved_reports` : nom, description, `config` jsonb (dimensions, mesures, filtres, type de graphique), `owner_id`, `visibility` (`private` | `team`), `scope_country_id`.
- `bi_report_schedules` : `report_id`, fréquence, heure, destinataires, actif, `last_sent_at`.
- Ajout d'une colonne `pole` (nullable) sur `budget_lines` pour l'axe pôle, avec valeur par défaut nulle et mapping depuis la catégorie quand absent.
- Vues SQL d'agrégation (`bi_budget_facts`, `bi_activity_facts`) pour éviter le calcul lourd côté client, exposées en lecture seule et soumises aux mêmes règles de périmètre.

**Frontend**
- `src/pages/BiPage.tsx` + route lazy dans `src/pages/Index.tsx`, entrée dans `AppSidebar` (section ANALYSE).
- `src/components/bi/` : `BiFilters.tsx`, `BiOverview.tsx`, `BiPoleAnalysis.tsx`, `BiReportBuilder.tsx`, `BiDistribution.tsx`, `BiAiInsights.tsx`.
- `src/hooks/useBiData.ts` (agrégats via TanStack Query, `staleTime` 60s) et `src/hooks/useBiReports.ts` (CRUD rapports + planifications).
- `src/lib/biAggregate.ts` : pivot dimensions/mesures, calcul d'écarts, formatage FCFA — couvert par des tests Vitest.
- Exports en imports dynamiques (`xlsx`, `jspdf`) comme dans le module Budget, pour ne pas alourdir le bundle ; onglets en `React.lazy`.

**Backend**
- Edge function `bi-ai-insights` : appel Lovable AI (modèle Gemini Flash récent) sur l'agrégat du rapport, sortie structurée (synthèse, anomalies, recommandations), gestion explicite des erreurs 402/429.
- Edge function `bi-report-scheduler` déclenchée par le cron quotidien existant : génère les rapports dus et les envoie via `send-transactional-email` avec un nouveau template FR `bi-report`.

**Qualité**
- Typage strict, aucun `any`, tokens sémantiques uniquement.
- Tests unitaires sur l'agrégation et le calcul d'écarts ; passage E2E Playwright sur la nouvelle route.
