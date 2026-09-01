# Module Business Intelligence (BI) pour ExpansionOS

Nouveau module transversal « Business Intelligence », accessible depuis la barre latérale (section ANALYSE). Le BI **désagrège** les données de la plateforme ExpansionOS (pays, tâches, risques, jalons, KPIs, budget FP&A) selon une hiérarchie budgétaire à plusieurs niveaux, et reprend la logique du classeur financier AES Burkina (pôles COMM / TECH / ADM / RH / DG / BOBO, trésorerie, compte de résultat, marge projet, KPI dashboard) — en modèle de structure uniquement, sans importer les chiffres du fichier.

## Hiérarchie budgétaire

```text
Budget global (consolidé, tous pays)
 └── Pays (BE, BJ, BF, CI, UG, SN)
      └── Pôle (COMM, TECH, ADM, RH, DG, BOBO)
           └── Projet  ← sous-budget
                └── Catégorie / ligne budgétaire (mensuel M1..M12)
```

Chaque niveau affiche budget, réalisé, écart, % d'exécution, en FCFA. Le budget global est la somme des sous-budgets projets ; un projet peut être rattaché à un pays et à un pôle. Drill-down et remontée (roll-up) à tous les niveaux.

## Ce que l'utilisateur obtient

Une page `/app/bi` avec 6 onglets :

1. **Vue d'ensemble** — budget global consolidé : exécution budgétaire, résultat par pôle, tendance trésorerie, avancement pays, top risques, KPIs clés. Filtres globaux persistants : pays, pôle, projet, période (mois/trimestre/année), scénario, devise d'affichage (FCFA pivot).
2. **Sous-budgets par projet** — liste des projets avec leur enveloppe, consommé, reste, % et alerte de dépassement ; fiche projet détaillée (mensuel budget vs réalisé, marge, tâches et risques rattachés, jalons).
3. **Analyse par pôle** — restitution type classeur AES : budget vs réalisé par pôle et par mois, consolidation multi-pôles, marge par projet, drill-down pôle → projet → catégorie → ligne.
4. **Constructeur de rapports** — dimensions (pays, pôle, projet, catégorie, mois, statut, assignataire) et mesures (budget, réalisé, écart, %, marge, nombre de tâches/risques), rendu en tableau croisé + graphique au choix, filtres et tri. Rapports sauvegardables, renommables, partageables (privé / équipe).
5. **Diffusion** — export Excel et PDF de tout rapport, plus planification d'envoi par email (quotidien / hebdomadaire / mensuel) vers des destinataires internes, en réutilisant l'infrastructure email existante.
6. **Analyse IA** — synthèse en français des écarts et tendances du rapport courant, détection d'anomalies (dérive d'un sous-budget projet, sur-consommation) et recommandations, via Lovable AI.
7. **Rapports opérationnels** — les 12 modèles de rapports du classeur AES reproduits en formulaires numériques pré-remplis depuis les données de la plateforme (tâches, jalons, budget, risques, KPIs), exportables en Excel/PDF et envoyables par email selon leur fréquence et leurs destinataires :
   - **A1 — Flash hebdomadaire** (chaque lundi 10h, DG) : chiffres clés, alertes, décisions requises.
   - **A2 à A5 — Rapports mensuels par pôle** (avant le 5 du mois) : COMM, TECH, ADM, RH — exécution du sous-budget, activités, incidents, besoins.
   - **A6 — Fiche d'évaluation individuelle** (mensuelle/semestrielle/annuelle/probatoire).
   - **A7 — Plan de Progrès Individuel 90 jours** (déclenché si note ≤ 2/4, suivi mensuel).
   - **A8 — Rapport de formation** (par session).
   - **A9 — Compte rendu Task Force** (hebdo, diffusé sous 24h, confidentiel Direction).
   - **A10 — Rapport trimestriel de pilotage DG** (comité de direction / actionnaires) : consolidé global, écarts, risques, décisions.
   - **A11 — Fiche de poste** (modèle par poste).
   - **A12 — Fiche d'intervention** (suivi technique/terrain).


Tout est en français, montants en FCFA, couleurs issues des tokens du thème existant.

## Règles d'accès

- Admin / Directeur : toutes les données, tous les pays.
- RAF et rôles avec périmètre pays : BI limité automatiquement à leur pays (les filtres n'exposent pas les autres).
- Observateur / partenaire : lecture seule, pas de création ni de planification de rapports.
- Les rapports sauvegardés sont visibles par leur auteur ; le partage « équipe » les rend visibles aux utilisateurs du même périmètre pays.

## Détails techniques

**Base de données (nouvelles tables, avec GRANT + RLS scopées par `can_access_country` / `has_role`)**
- `bi_poles` : table de référence des pôles (code, libellé, couleur, ordre) — pré-remplie avec COMM, TECH, ADM, RH, DG, BOBO, modifiable par un admin.
- `bi_projects` : sous-budgets — nom, code, `country_id`, `pole_id`, dates début/fin, `budget_total` (FCFA), statut, responsable, notes.
- `bi_saved_reports` : nom, description, `config` jsonb (dimensions, mesures, filtres, type de graphique), `owner_id`, `visibility` (`private` | `team`), `scope_country_id`.
- `bi_report_schedules` : `report_id`, fréquence, heure, destinataires, actif, `last_sent_at`.
- `bi_report_instances` : un exemplaire généré d'un modèle A1–A12 — `template_code` (A1…A12), pays/pôle, période, `data` jsonb (sections du rapport), `author_id`, statut (brouillon / soumis / validé), `sent_at`.
- Ajout de colonnes nullables `pole_id` et `project_id` sur `budget_lines` (rattachement d'une ligne à un pôle et à un sous-budget projet) ; les lignes sans projet remontent au niveau « non affecté » du budget global.
- Rattachement optionnel `project_id` sur `tasks` et `risks` pour croiser l'exécution opérationnelle avec les sous-budgets.
- Vues SQL d'agrégation (`bi_budget_facts` par pays/pôle/projet/mois, `bi_activity_facts`) pour éviter le calcul lourd côté client, exposées en lecture seule et soumises aux mêmes règles de périmètre.

**Frontend**
- `src/pages/BiPage.tsx` + route lazy dans `src/pages/Index.tsx`, entrée dans `AppSidebar` (section ANALYSE).
- `src/components/bi/` : `BiFilters.tsx`, `BiOverview.tsx`, `BiProjectBudgets.tsx` (liste + fiche sous-budget), `BiPoleAnalysis.tsx`, `BiReportBuilder.tsx`, `BiDistribution.tsx`, `BiAiInsights.tsx`.
- `src/hooks/useBiData.ts` (agrégats hiérarchiques via TanStack Query, `staleTime` 60s), `src/hooks/useBiProjects.ts` (CRUD sous-budgets) et `src/hooks/useBiReports.ts` (CRUD rapports + planifications).
- `src/lib/biAggregate.ts` : roll-up global → pays → pôle → projet → catégorie, pivot dimensions/mesures, calcul d'écarts et de marge, formatage FCFA — couvert par des tests Vitest.
- Exports en imports dynamiques (`xlsx`, `jspdf`) comme dans le module Budget, pour ne pas alourdir le bundle ; onglets en `React.lazy`.

**Backend**
- Edge function `bi-ai-insights` : appel Lovable AI (modèle Gemini Flash récent) sur l'agrégat du rapport, sortie structurée (synthèse, anomalies, recommandations), gestion explicite des erreurs 402/429.
- Edge function `bi-report-scheduler` déclenchée par le cron quotidien existant : génère les rapports dus et les envoie via `send-transactional-email` avec un nouveau template FR `bi-report`.

**Qualité**
- Typage strict, aucun `any`, tokens sémantiques uniquement.
- Tests unitaires sur l'agrégation et le calcul d'écarts ; passage E2E Playwright sur la nouvelle route.
