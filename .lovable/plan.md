
## Module Budget → FP&A Platform (inspiré Jedox)

### Ce que Jedox offre (fonctionnalités clés) :
1. **Planification budgétaire** avec grille type Excel (saisie par cellule)
2. **P&L, Bilan, Cash Flow** — états financiers consolidés
3. **Scénarios What-If** — comparer base vs optimiste vs pessimiste
4. **Rolling Forecast** — prévisions glissantes sur 12-18 mois
5. **Analyse des écarts (Variance)** — Budget vs Réel vs Forecast
6. **Workflow d'approbation** — soumission/validation du budget
7. **Dashboards & KPIs** — visualisation temps réel
8. **Export multi-format** — CSV, Excel, PDF

### Plan d'implémentation par phases :

#### Phase 1 — Grille budgétaire type tableur ⚡
- Vue en tableau éditable (colonnes = mois, lignes = postes budgétaires)
- Saisie inline des montants par mois (Jan-Déc)
- Totaux automatiques (ligne et colonne)
- Catégories budgétaires hiérarchiques (OPEX, CAPEX, RH, Marketing, etc.)
- Nouvelle table `budget_lines` avec granularité mensuelle

#### Phase 2 — États financiers & Analyse des écarts
- Vue P&L simplifiée (Revenus - Charges = Résultat)
- Comparaison Budget vs Réel avec calcul des écarts (montant + %)
- Indicateurs visuels : vert si dans le budget, rouge si dépassement
- Graphiques de variance par catégorie

#### Phase 3 — Scénarios & Prévisions
- Créer des scénarios (Base, Optimiste, Pessimiste)
- Ajustement en % sur les lignes budgétaires
- Comparaison côte à côte des scénarios
- Rolling Forecast : projection automatique basée sur la tendance des dépenses

#### Phase 4 — Workflow & Collaboration
- Statuts de budget : Brouillon → Soumis → Approuvé → Verrouillé
- Commentaires par ligne budgétaire
- Historique des modifications
- Notifications lors des soumissions/approbations

#### Phase 5 — Dashboards avancés
- Dashboard P&L interactif
- Cash Burn Rate & Runway
- Répartition par pays/département
- Tendances mensuelles avec prévisions

### ⚠️ Limitations vs Jedox réel :
- Pas de cube OLAP multidimensionnel
- Pas d'intégration ERP/SAP native
- Pas de modèle de données XBRL
- Pas de consolidation multi-entités complexe

Souhaitez-vous que je commence par la **Phase 1** (grille budgétaire mensuelle type tableur) ?
