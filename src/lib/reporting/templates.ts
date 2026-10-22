// Modèles de rapports A1–A12 — reprise fidèle des onglets du classeur financier AES Burkina.
// Chaque modèle est une suite de sections (champs d'en-tête, textes, tableaux, choix) ;
// les données saisies sont stockées en JSON dans bi_report_instances.data.

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'pct' | 'date' | 'time' | 'select';
export type PeriodKind = 'week' | 'month' | 'quarter' | 'date';

export interface ReportField { key: string; label: string; type: FieldType; options?: string[] }

/** Colonnes calculées : à partir de « target » (objectif) et « actual » (réalisé) de la même ligne. */
export type ComputedKind = 'attainment' | 'gap' | 'gapPct' | 'progress';

export interface TableColumn {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  computed?: ComputedKind;
  width?: number;
}

export type ReportSection =
  | { kind: 'fields'; title?: string; fields: ReportField[] }
  | { kind: 'text'; key: string; title: string; hint?: string }
  | { kind: 'table'; key: string; title: string; columns: TableColumn[]; rows?: string[]; emptyRows?: number; extensible?: boolean }
  | { kind: 'choice'; key: string; title: string; options: string[]; multiple?: boolean };

export interface ReportTemplate {
  code: string;
  name: string;
  description: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
  /** Ligne « Réf. » du classeur : échéance et destinataire. */
  reference: string;
  period: PeriodKind;
  poleCode?: string;
  /** Valideur(s) — reflète public.report_can_review. */
  reviewer: string;
  /** Données pré-remplies depuis la plateforme (journal des ventes, finance, KPI). */
  prefill?: boolean;
  confidential?: boolean;
  sections: ReportSection[];
  signatures: string[];
}

/** Ligne de tableau : `label` est la 1re colonne figée pour les lignes prédéfinies. */
export type TableRow = Record<string, string | number | null>;
export type ReportData = Record<string, unknown>;

const RAG = ['Vert', 'Orange', 'Rouge'];
const DONE = ['Fait', 'En cours', 'Bloqué'];
const OBJ = (first = 'Indicateur', extra: TableColumn[] = [{ key: 'comment', label: 'Commentaire' }]): TableColumn[] => [
  { key: 'label', label: first },
  { key: 'target', label: 'Objectif', type: 'number' },
  { key: 'actual', label: 'Réalisé', type: 'number' },
  { key: 'att', label: 'Atteinte (%)', computed: 'attainment' },
  { key: 'status', label: 'Statut', type: 'select', options: RAG },
  ...extra,
];
const DEPARTMENTS = ['Direction Générale', 'Pôle Adm. & Financier', 'Pôle Commercial', 'Pôle Technique', 'Ressources Humaines', 'Agence Bobo', 'TOTAL AES BURKINA'];
const PILLARS = ['Excellence Opérationnelle', 'Évaluation Personnel', 'Reporting Départemental', 'Outils RH', 'Formation', 'Task Force'];

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    code: 'A1', name: 'Flash hebdomadaire', frequency: 'weekly', period: 'week', prefill: true,
    description: 'Faits marquants, indicateurs clés de la semaine, actions en cours, priorités et alertes.',
    reference: 'Hebdomadaire — chaque lundi avant 10h00 · Destinataire : Direction Générale', reviewer: 'Direction générale',
    sections: [
      { kind: 'fields', fields: [
        { key: 'pole', label: 'Département / Pôle', type: 'select', options: ['Direction Générale', 'Commercial & Marketing', 'Technique & Opérations', 'Administratif & Financier', 'Ressources Humaines', 'Agence Bobo'] },
        { key: 'manager', label: 'Responsable', type: 'text' },
        { key: 'sent_on', label: 'Date de transmission', type: 'date' },
      ] },
      { kind: 'text', key: 'highlights', title: '1. Faits marquants de la semaine', hint: 'Résumez en 3 à 5 points les faits marquants, réussites et événements importants.' },
      { kind: 'table', key: 'kpis', title: '2. Indicateurs clés — semaine', columns: OBJ(), emptyRows: 5, extensible: true },
      { kind: 'table', key: 'actions', title: '3. Tâches & actions en cours', emptyRows: 6, extensible: true, columns: [
        { key: 'label', label: 'Action / Tâche' }, { key: 'owner', label: 'Responsable' }, { key: 'due', label: 'Délai', type: 'date' },
        { key: 'status', label: 'Statut', type: 'select', options: DONE }, { key: 'comment', label: 'Commentaire / Blocage' }] },
      { kind: 'table', key: 'priorities', title: '4. Priorités semaine prochaine', emptyRows: 5, columns: [
        { key: 'label', label: 'Action prioritaire' }, { key: 'owner', label: 'Responsable' }, { key: 'due', label: 'Délai', type: 'date' }, { key: 'resources', label: 'Ressources nécessaires' }] },
      { kind: 'text', key: 'alerts', title: '5. Alertes pour la direction', hint: 'Points nécessitant une décision ou une intervention urgente.' },
    ],
    signatures: ['Responsable'],
  },
  {
    code: 'A2', name: 'Rapport mensuel Commercial & Marketing', frequency: 'monthly', period: 'month', poleCode: 'COMM', prefill: true,
    description: 'Résultats vs objectifs, pipeline, performance par commercial, marketing, satisfaction client.',
    reference: 'Mensuel — avant le 5 du mois · Destinataire : Direction Générale (copie RAF)', reviewer: 'Direction générale',
    sections: [
      { kind: 'fields', fields: [
        { key: 'manager', label: 'Responsable Commercial', type: 'text' }, { key: 'marketing_lead', label: 'Chargé(e) Marketing', type: 'text' },
        { key: 'written_on', label: 'Date de rédaction', type: 'date' }, { key: 'sent_on', label: 'Date de transmission au DG', type: 'date' },
      ] },
      { kind: 'text', key: 'summary', title: '1. Résumé exécutif du mois', hint: 'Synthèse en 5 à 8 lignes : résultats vs objectifs, faits marquants, tendances.' },
      { kind: 'table', key: 'kpis', title: '2. Tableau de bord commercial — résultats vs objectifs', columns: [
        { key: 'label', label: 'Indicateur' }, { key: 'target', label: 'Objectif mensuel', type: 'number' }, { key: 'actual', label: 'Réalisé', type: 'number' },
        { key: 'gap', label: 'Écart absolu', computed: 'gap' }, { key: 'gapPct', label: 'Écart (%)', computed: 'gapPct' },
        { key: 'status', label: 'Statut', type: 'select', options: RAG }, { key: 'comment', label: 'Commentaire' }],
        rows: ['CA réalisé (FCFA)', 'Nombre de prospects contactés', 'Nombre de visites commerciales', 'Nombre de devis émis', 'Nombre de commandes reçues',
          'Taux de conversion (%)', 'Valeur des commandes (FCFA)', 'Nombre de nouveaux clients', 'Délai moyen de vente (jours)', 'Nombre de clients relancés'] },
      { kind: 'table', key: 'pipeline', title: '3. État du pipeline commercial (au dernier jour du mois)', emptyRows: 8, extensible: true, columns: [
        { key: 'label', label: 'Client / Prospect' }, { key: 'product', label: 'Produit / Projet' }, { key: 'value', label: 'Valeur estimée (FCFA)', type: 'money' },
        { key: 'stage', label: 'Étape pipeline', type: 'select', options: ['Prospect', 'Qualifié', 'Devis', 'Négociation', 'Signé'] },
        { key: 'prob', label: 'Prob. closing (%)', type: 'number' }, { key: 'close', label: 'Date closing prévue', type: 'date' }, { key: 'rep', label: 'Commercial responsable' }] },
      { kind: 'table', key: 'reps', title: '4. Performance par commercial', extensible: true, columns: [
        { key: 'label', label: 'Commercial' }, { key: 'prospects', label: 'Prospects', type: 'number' }, { key: 'quotes', label: 'Devis', type: 'number' },
        { key: 'sales', label: 'Ventes', type: 'number' }, { key: 'actual', label: 'CA généré (FCFA)', type: 'money' }, { key: 'target', label: 'Objectif CA', type: 'money' },
        { key: 'att', label: 'Atteinte %', computed: 'attainment' }, { key: 'comment', label: 'Commentaire' }],
        rows: ['Assistant Commercial 1', 'Assistant Commercial 2', 'Assistant Commercial 3', 'TC Bobo 1', 'TC Bobo 2'] },
      { kind: 'table', key: 'marketing', title: '5. Actions marketing du mois', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Action marketing' }, { key: 'channel', label: 'Canal utilisé' }, { key: 'target_aud', label: 'Cible' },
        { key: 'leads', label: 'Leads générés', type: 'number' }, { key: 'cost', label: 'Coût (FCFA)', type: 'money' }, { key: 'conv', label: 'Conversions', type: 'number' },
        { key: 'roi', label: 'ROI estimé' }, { key: 'status', label: 'Statut', type: 'select', options: DONE }] },
      { kind: 'table', key: 'satisfaction', title: '6. Satisfaction client & réclamations', columns: [
        { key: 'label', label: 'Indicateur' }, { key: 'actual', label: 'Ce mois', type: 'number' }, { key: 'previous', label: 'Mois précédent', type: 'number' },
        { key: 'trend', label: 'Tendance', type: 'select', options: ['↑', '↓', '='] }, { key: 'actions', label: 'Actions' }],
        rows: ['Nombre de réclamations reçues', 'Réclamations résolues', 'Délai moyen de résolution (jours)', 'Note satisfaction client (/5)', "Nombre d'enquêtes envoyées"] },
      { kind: 'text', key: 'strengths', title: "7. Analyse — points forts du mois", hint: 'Ce qui a bien fonctionné.' },
      { kind: 'text', key: 'weaknesses', title: "Points d'amélioration", hint: "Ce qui n'a pas fonctionné." },
      { kind: 'text', key: 'action_plan', title: "Plan d'action correctif pour le mois prochain" },
    ],
    signatures: ['Resp. Commercial', 'DG pour validation'],
  },
  {
    code: 'A3', name: 'Rapport mensuel Technique & Opérations', frequency: 'monthly', period: 'month', poleCode: 'TECH', prefill: true,
    description: 'Tableau de bord opérationnel, projets en cours, ressources terrain, incidents, SAV, stocks.',
    reference: 'Mensuel — avant le 5 du mois · Destinataire : Direction Générale (copie Resp. Comm.)', reviewer: 'Direction générale',
    sections: [
      { kind: 'fields', fields: [{ key: 'manager', label: 'Responsable Technique', type: 'text' }, { key: 'written_on', label: 'Date de rédaction', type: 'date' }] },
      { kind: 'text', key: 'summary', title: '1. Résumé exécutif', hint: "Synthèse des opérations du mois : faits marquants, points d'attention, décisions nécessaires." },
      { kind: 'table', key: 'kpis', title: '2. Tableau de bord opérationnel', columns: OBJ('Indicateur technique'),
        rows: ["Nombre d'interventions réalisées", 'Projets livrés dans les délais (%)', 'Taux de conformité installations (%)', "Nombre d'incidents / non-conformités",
          'Taux de reprise sur installations (%)', 'Tickets SAV ouverts', 'Tickets SAV résolus en < 48h (%)', "Taux d'utilisation des techniciens (%)",
          'Coût moyen intervention vs budget (%)', 'Score satisfaction client technique (/5)'] },
      { kind: 'table', key: 'projects', title: '3. État des projets en cours', emptyRows: 7, extensible: true, columns: [
        { key: 'label', label: 'Projet / Client' }, { key: 'type', label: 'Type de prestation' }, { key: 'start', label: 'Date début', type: 'date' },
        { key: 'due', label: 'Date fin prévue', type: 'date' }, { key: 'end', label: 'Date fin réelle', type: 'date' }, { key: 'progress', label: 'Avancement (%)', type: 'number' },
        { key: 'techs', label: 'Technicien(s)' }, { key: 'status', label: 'Statut', type: 'select', options: ['Planifié', 'En cours', 'Terminé', 'Bloqué'] }, { key: 'issues', label: 'Problèmes' }] },
      { kind: 'table', key: 'staff', title: '4. Gestion des ressources humaines terrain', extensible: true, columns: [
        { key: 'label', label: 'Technicien' }, { key: 'skill', label: 'Spécialisation' }, { key: 'projects', label: 'Projets affectés', type: 'number' },
        { key: 'actual', label: 'Jours travaillés', type: 'number' }, { key: 'target', label: 'Jours dispo.', type: 'number' },
        { key: 'att', label: 'Taux utilisation', computed: 'attainment' }, { key: 'skills', label: 'Compétences à renforcer' }],
        rows: Array.from({ length: 9 }, (_, i) => `Technicien ${i + 1}`) },
      { kind: 'table', key: 'incidents', title: '5. Incidents & non-conformités — analyse des causes', emptyRows: 5, extensible: true, columns: [
        { key: 'date', label: 'Date', type: 'date' }, { key: 'label', label: 'Projet / Client' }, { key: 'desc', label: "Description de l'incident" },
        { key: 'cause', label: 'Cause racine identifiée' }, { key: 'fix', label: 'Action corrective' }, { key: 'owner', label: 'Responsable' },
        { key: 'status', label: 'Statut', type: 'select', options: ['Ouvert', 'En cours', 'Clos'] }] },
      { kind: 'table', key: 'sav', title: '6. Suivi des tickets SAV', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Ticket N°' }, { key: 'client', label: 'Client' }, { key: 'opened', label: 'Date ouverture', type: 'date' }, { key: 'nature', label: 'Nature du problème' },
        { key: 'tech', label: 'Technicien assigné' }, { key: 'closed', label: 'Date résolution', type: 'date' }, { key: 'hours', label: 'Délai (h)', type: 'number' },
        { key: 'sat', label: 'Satisfaction (/5)', type: 'number' }] },
      { kind: 'table', key: 'stock', title: '7. Suivi des stocks et approvisionnements', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Matériel / Équipement' }, { key: 'stock', label: 'Stock actuel', type: 'number' }, { key: 'min', label: 'Stock mini requis', type: 'number' },
        { key: 'order', label: 'À commander', type: 'number' }, { key: 'urgency', label: 'Urgence', type: 'select', options: ['Haute', 'Moyenne', 'Faible'] }, { key: 'supplier', label: 'Fournisseur' }] },
      { kind: 'text', key: 'analysis', title: '8. Analyse & recommandations', hint: 'Points forts, enseignements du mois, recommandations pour améliorer les opérations.' },
    ],
    signatures: ['Resp. Technique', 'DG pour validation'],
  },
  {
    code: 'A4', name: 'Rapport mensuel Administratif & Financier', frequency: 'monthly', period: 'month', poleCode: 'ADM', prefill: true, confidential: true,
    description: 'Compte de résultat simplifié, trésorerie, prévision 3 mois, créances clients, conformité fiscale et sociale.',
    reference: 'Mensuel — avant le 5 du mois · Destinataire : Direction Générale — Confidentiel', reviewer: 'Direction générale ou RAF',
    sections: [
      { kind: 'fields', fields: [{ key: 'manager', label: 'Responsable Administratif et Financier', type: 'text' }, { key: 'written_on', label: 'Date de rédaction', type: 'date' }, { key: 'attachments', label: 'Pièces jointes', type: 'text' }] },
      { kind: 'text', key: 'summary', title: '1. Résumé exécutif financier', hint: 'Message clé du mois : situation financière, faits marquants, alertes, décisions nécessaires.' },
      { kind: 'table', key: 'pnl', title: '2. Compte de résultat simplifié du mois', columns: [
        { key: 'label', label: 'Rubrique' }, { key: 'budget_m', label: 'Budget mensuel', type: 'money' }, { key: 'month', label: 'Réalisé du mois', type: 'money' },
        { key: 'actual', label: 'Cumul YTD', type: 'money' }, { key: 'target', label: 'Budget YTD', type: 'money' },
        { key: 'gap', label: 'Écart YTD', computed: 'gap' }, { key: 'gapPct', label: 'Écart (%)', computed: 'gapPct' }, { key: 'comment', label: 'Commentaire' }],
        rows: ["§ CHIFFRE D'AFFAIRES", 'CA Installations solaires', 'CA Pompage solaire', 'CA Chambres froides', 'CA SAV & Maintenance', 'CA Agence Bobo', 'TOTAL CA',
          '§ CHARGES DIRECTES', 'Achats matériel & équipements', 'Sous-traitance technique', 'Transport & déplacements terrain', 'MARGE BRUTE',
          '§ CHARGES DE STRUCTURE', 'Salaires & charges sociales', 'Loyers & charges locatives', 'Frais administratifs & bureautique', 'Frais marketing & communication',
          'Amortissements', 'Autres charges', 'TOTAL CHARGES', 'RÉSULTAT NET'] },
      { kind: 'table', key: 'cash', title: '3. Situation de trésorerie détaillée (par semaine)', columns: [
        { key: 'label', label: 'Semaine' }, { key: 'open', label: 'Solde début', type: 'money' }, { key: 'in_clients', label: 'Encaissements clients', type: 'money' },
        { key: 'in_other', label: 'Autres entrées', type: 'money' }, { key: 'out_suppliers', label: 'Paiements fournisseurs', type: 'money' },
        { key: 'out_salaries', label: 'Salaires & charges', type: 'money' }, { key: 'out_tax', label: 'Taxes & impôts', type: 'money' },
        { key: 'out_other', label: 'Autres sorties', type: 'money' }, { key: 'close', label: 'Solde fin', type: 'money' }, { key: 'alert', label: 'Alerte' }],
        rows: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4', 'TOTAL MOIS'] },
      { kind: 'table', key: 'forecast', title: '4. Prévision de trésorerie — 3 prochains mois', columns: [
        { key: 'label', label: 'Poste' }, { key: 'm1', label: 'Mois M+1', type: 'money' }, { key: 'm2', label: 'Mois M+2', type: 'money' }, { key: 'm3', label: 'Mois M+3', type: 'money' }],
        rows: ['§ Encaissements prévus', 'Clients confirmés', 'Pipeline à fort % closing', '§ Décaissements prévus', 'Salaires & charges sociales', 'Fournisseurs à payer', 'Taxes et impôts', 'SOLDE NET PRÉVISIONNEL'] },
      { kind: 'table', key: 'receivables', title: '5. Suivi des créances clients', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Client' }, { key: 'invoice', label: 'N° Facture' }, { key: 'amount', label: 'Montant (FCFA)', type: 'money' },
        { key: 'date', label: 'Date facture', type: 'date' }, { key: 'due', label: 'Échéance', type: 'date' }, { key: 'late', label: 'Jours de retard', type: 'number' },
        { key: 'status', label: 'Statut', type: 'select', options: ['Non payé', 'Partiel', 'Soldé', 'Contentieux'] }, { key: 'reminder', label: 'Relance effectuée' }, { key: 'next', label: 'Action suivante' }] },
      { kind: 'table', key: 'tax', title: '6. Conformité fiscale et sociale', columns: [
        { key: 'label', label: 'Obligation' }, { key: 'due', label: 'Échéance légale', type: 'date' }, { key: 'amount', label: 'Montant (FCFA)', type: 'money' },
        { key: 'paid', label: 'Payé ?', type: 'select', options: ['Oui', 'Non', 'Partiel'] }, { key: 'paid_on', label: 'Date paiement', type: 'date' },
        { key: 'receipt', label: 'N° quittance' }, { key: 'note', label: 'Observation' }],
        rows: ['Déclaration TVA mensuelle', 'Cotisations CNSS', 'Impôt sur les bénéfices (IS) — acompte', 'IRPP / Retenues à la source', 'Patente / Taxe professionnelle', 'Autres obligations légales'] },
      { kind: 'text', key: 'analysis', title: '7. Analyse financière & recommandations', hint: "Analyse de la situation financière, points d'attention critiques, recommandations au DG." },
    ],
    signatures: ['RAF', 'DG pour validation'],
  },
  {
    code: 'A5', name: 'Rapport mensuel Ressources Humaines', frequency: 'monthly', period: 'month', poleCode: 'RH', prefill: true,
    description: 'Tableau de bord RH, présence par département, évaluations, formation, recrutements, PPI, discipline.',
    reference: 'Mensuel — avant le 5 du mois · Destinataire : Direction Générale', reviewer: 'Direction générale ou DRH',
    sections: [
      { kind: 'fields', fields: [{ key: 'manager', label: 'Responsable RH', type: 'text' }, { key: 'headcount', label: 'Effectif total à la date du rapport', type: 'number' }, { key: 'written_on', label: 'Date de rédaction', type: 'date' }] },
      { kind: 'text', key: 'summary', title: '1. Résumé exécutif RH', hint: 'Message clé : faits RH marquants, tendances, alertes, décisions nécessaires.' },
      { kind: 'table', key: 'kpis', title: '2. Tableau de bord RH du mois', columns: [
        { key: 'label', label: 'Indicateur RH' }, { key: 'target', label: 'Objectif', type: 'number' }, { key: 'actual', label: 'Réalisé ce mois', type: 'number' },
        { key: 'previous', label: 'Mois précédent', type: 'number' }, { key: 'trend', label: 'Tendance', type: 'select', options: ['↑', '↓', '='] },
        { key: 'status', label: 'Statut', type: 'select', options: RAG }, { key: 'comment', label: 'Commentaire' }],
        rows: ['Effectif total', 'Entrées du mois', 'Sorties du mois', 'Postes vacants', 'Taux de présence (%) — objectif ≥ 95 %', 'Jours absence injustifiée — < 5 % masse',
          'Heures supplémentaires', 'Taux de rotation annualisé (%) — < 10 %'] },
      { kind: 'table', key: 'attendance', title: '3. Présence détaillée par département', columns: [
        { key: 'label', label: 'Département' }, { key: 'staff', label: 'Effectif', type: 'number' }, { key: 'target', label: 'Jours ouvrables', type: 'number' },
        { key: 'actual', label: 'Jours présence', type: 'number' }, { key: 'abs_j', label: 'Jours abs. just.', type: 'number' }, { key: 'abs_i', label: 'Jours abs. injust.', type: 'number' },
        { key: 'att', label: 'Taux présence (%)', computed: 'attainment' }, { key: 'note', label: 'Observations' }], rows: DEPARTMENTS },
      { kind: 'table', key: 'evaluations', title: '4. Suivi des évaluations du personnel', columns: [
        { key: 'label', label: 'Département' }, { key: 'staff', label: 'Effectif', type: 'number' }, { key: 'target', label: 'Évals planifiées', type: 'number' },
        { key: 'actual', label: 'Évals réalisées', type: 'number' }, { key: 'att', label: 'Réalisation', computed: 'attainment' }, { key: 'score', label: 'Score moy. (/4)', type: 'number' },
        { key: 'ppi', label: '% avec PPI actif', type: 'number' }, { key: 'note', label: 'Observations' }], rows: DEPARTMENTS },
      { kind: 'table', key: 'training', title: '5. Suivi du plan de formation', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Formation' }, { key: 'audience', label: 'Public cible' }, { key: 'status', label: 'Statut', type: 'select', options: ['Planifiée', 'En cours', 'Réalisée', 'Reportée'] },
        { key: 'people', label: 'Participants', type: 'number' }, { key: 'hours', label: 'Heures réalisées', type: 'number' }, { key: 'cost', label: 'Coût (FCFA)', type: 'money' },
        { key: 'sat', label: 'Satisfaction (/5)', type: 'number' }, { key: 'transfer', label: 'Transfert terrain (J+30)' }] },
      { kind: 'table', key: 'recruitment', title: '6. Recrutements en cours', emptyRows: 4, extensible: true, columns: [
        { key: 'label', label: 'Poste' }, { key: 'dept', label: 'Département' }, { key: 'opened', label: 'Date ouverture', type: 'date' }, { key: 'reason', label: 'Motif' },
        { key: 'apps', label: 'Candidatures', type: 'number' }, { key: 'interviews', label: 'Entretiens', type: 'number' }, { key: 'hired', label: 'Candidat retenu' },
        { key: 'start', label: 'Date prise de poste', type: 'date' }, { key: 'status', label: 'Statut', type: 'select', options: ['Ouvert', 'Entretiens', 'Pourvu', 'Suspendu'] }] },
      { kind: 'table', key: 'ppi', title: '7. Plans de progrès individuels (PPI) en cours', emptyRows: 4, extensible: true, columns: [
        { key: 'label', label: 'Collaborateur' }, { key: 'job', label: 'Poste' }, { key: 'start', label: 'Date déclenchement', type: 'date' }, { key: 'reason', label: 'Motif' },
        { key: 'month', label: 'Mois en cours', type: 'select', options: ['M1', 'M2', 'M3'] }, { key: 'reached', label: 'Objectifs atteints ?', type: 'select', options: ['Oui', 'Partiellement', 'Non'] },
        { key: 'decision', label: 'Décision prévue' }] },
      { kind: 'table', key: 'discipline', title: '8. Points disciplinaires & signalements', emptyRows: 4, extensible: true, columns: [
        { key: 'date', label: 'Date', type: 'date' }, { key: 'label', label: 'Collaborateur' }, { key: 'job', label: 'Poste' }, { key: 'fact', label: 'Nature du fait' },
        { key: 'measure', label: 'Mesure prise' }, { key: 'status', label: 'Statut', type: 'select', options: ['Ouvert', 'Clos'] }] },
      { kind: 'text', key: 'analysis', title: '9. Analyse & recommandations RH', hint: 'Climat social, tendances, risques RH identifiés, recommandations au DG.' },
    ],
    signatures: ['Resp. RH', 'DG pour validation'],
  },
  {
    code: 'A6', name: 'Évaluation individuelle', frequency: 'adhoc', period: 'date', poleCode: 'RH', confidential: true,
    description: 'Grille pondérée sur 4 dimensions (performance 40 %, compétences 25 %, comportements 20 %, initiative 15 %).',
    reference: 'Mensuelle / Semestrielle / Annuelle / Probatoire · RH — document confidentiel archivé au dossier individuel', reviewer: 'Direction générale ou DRH',
    sections: [
      { kind: 'fields', title: 'Informations générales', fields: [
        { key: 'employee', label: 'Nom et prénom', type: 'text' }, { key: 'job', label: 'Poste', type: 'text' }, { key: 'dept', label: 'Département', type: 'text' },
        { key: 'manager', label: 'Manager évaluateur', type: 'text' }, { key: 'hired_on', label: "Date d'embauche", type: 'date' }, { key: 'seniority', label: 'Ancienneté', type: 'text' },
        { key: 'period_label', label: 'Période évaluée', type: 'text' }, { key: 'interview_on', label: 'Date entretien', type: 'date' },
        { key: 'eval_type', label: "Type d'évaluation", type: 'select', options: ['Mensuelle', 'Semestrielle', 'Annuelle', 'Probatoire', '360°'] },
      ] },
      { kind: 'table', key: 'previous', title: 'Objectifs de la période précédente', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Objectif fixé' }, { key: 'measure', label: 'Mesure de succès définie' }, { key: 'reached', label: 'Atteint ?', type: 'select', options: ['Oui', 'Partiellement', 'Non'] }, { key: 'comment', label: 'Commentaire' }] },
      { kind: 'table', key: 'grid', title: "Grille d'évaluation — 1 = Insuffisant · 2 = À améliorer · 3 = Satisfaisant · 4 = Excellent", columns: [
        { key: 'label', label: 'Critère' }, { key: 'manager', label: 'Note manager (/4)', type: 'number' }, { key: 'self', label: 'Auto-évaluation (/4)', type: 'number' },
        { key: 'final', label: 'Note finale (/4)', type: 'number' }, { key: 'improve', label: 'Points à améliorer' }],
        rows: ['§ Dimension 1 — Performance & résultats (40 %)', 'Atteinte des objectifs fixés', 'Qualité du travail livré', 'Respect des délais et engagements',
          '§ Dimension 2 — Compétences techniques (25 %)', 'Maîtrise technique du poste', 'Résolution des problèmes', 'Connaissance des produits et services',
          '§ Dimension 3 — Comportements & valeurs (20 %)', 'Ponctualité et assiduité', "Esprit d'équipe et collaboration", 'Respect des procédures', 'Intégrité et éthique professionnelle',
          '§ Dimension 4 — Initiative & innovation (15 %)', 'Force de proposition et créativité', 'Adaptabilité et gestion du changement'] },
      { kind: 'text', key: 'strengths', title: "Points forts identifiés lors de l'entretien" },
      { kind: 'text', key: 'improvements', title: "Axes d'amélioration prioritaires pour la prochaine période" },
      { kind: 'text', key: 'training_needs', title: 'Besoins de formation identifiés' },
      { kind: 'table', key: 'smart', title: 'Objectifs SMART pour la prochaine période', emptyRows: 4, extensible: true, columns: [
        { key: 'label', label: 'Objectif' }, { key: 'measure', label: 'Mesure de succès' }, { key: 'resources', label: 'Ressources nécessaires' },
        { key: 'due', label: 'Délai', type: 'date' }, { key: 'priority', label: 'Priorité', type: 'select', options: ['HAUTE', 'MOYENNE', 'NORMALE'] }] },
      { kind: 'choice', key: 'decision', title: 'Décision RH', multiple: true, options: ['Maintien au poste — bonne performance', 'Reconduction avec objectifs renforcés',
        'Plan de progrès individuel 90 jours (PPI)', 'Formation urgente déclenchée', 'Avertissement formel', 'Promotion / évolution de poste', 'Prime de performance', 'Autre'] },
    ],
    signatures: ['Manager évaluateur', 'Collaborateur évalué', 'Direction / RH'],
  },
  {
    code: 'A7', name: 'Plan de progrès individuel (PPI) — 90 jours', frequency: 'adhoc', period: 'date', poleCode: 'RH', confidential: true,
    description: 'Déclenché sur note ≤ 2/4 : lacunes, objectifs SMART, revues J+30 / J+60 / J+90 et décision.',
    reference: 'Déclenché sur note ≤ 2/4 · suivi mensuel obligatoire · RH + Manager direct + DG', reviewer: 'Direction générale ou DRH',
    sections: [
      { kind: 'fields', fields: [
        { key: 'employee', label: 'Collaborateur', type: 'text' }, { key: 'job', label: 'Poste', type: 'text' }, { key: 'dept', label: 'Département', type: 'text' },
        { key: 'manager', label: 'Manager direct', type: 'text' }, { key: 'hr', label: 'Resp. RH en charge', type: 'text' }, { key: 'trigger_score', label: 'Note déclenchante (/4)', type: 'number' },
        { key: 'start', label: 'Date de déclenchement', type: 'date' }, { key: 'review_on', label: 'Date réévaluation prévue', type: 'date' },
      ] },
      { kind: 'text', key: 'gaps', title: 'Motif du PPI — lacunes identifiées', hint: "Description précise des lacunes identifiées lors de l'évaluation." },
      { kind: 'table', key: 'objectives', title: 'Objectifs du PPI — actions sur 90 jours', emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: "Axe d'amélioration" }, { key: 'smart', label: 'Objectif SMART' }, { key: 'action', label: 'Action à mener' },
        { key: 'resources', label: 'Ressources / Formation' }, { key: 'kpi', label: 'Indicateur de succès' }, { key: 'due', label: 'Date limite', type: 'date' }] },
      { kind: 'table', key: 'reviews', title: "Suivi mensuel — revues d'avancement", columns: [
        { key: 'label', label: 'Critère de suivi' }, { key: 'd30', label: 'Point J+30' }, { key: 'd60', label: 'Point J+60' }, { key: 'd90', label: 'Point J+90 (décision)' }],
        rows: ['Objectifs atteints ? (Oui / Partiellement / Non)', 'Comportement général observé', 'Formation suivie et appliquée ?', 'Engagement du collaborateur',
          'Points positifs observés', 'Points encore insuffisants', 'Actions supplémentaires décidées'] },
      { kind: 'choice', key: 'decision', title: "Décision à l'issue des 90 jours", options: [
        "Objectifs atteints — clôture positive — retour au processus d'évaluation normal", 'Objectifs partiellement atteints — prolongation du PPI de 30 jours',
        'Objectifs non atteints — mesure disciplinaire engagée (avertissement / rupture)'] },
      { kind: 'text', key: 'justification', title: 'Justification de la décision' },
    ],
    signatures: ['Collaborateur', 'Manager', 'RH'],
  },
  {
    code: 'A8', name: 'Rapport de formation', frequency: 'adhoc', period: 'date', poleCode: 'RH',
    description: 'Participants, évaluation à chaud et acquis (Kirkpatrick 1–2), plan de suivi du transfert (3–4).',
    reference: 'Par session — archivé dans le dossier Formation · RH + DG pour information', reviewer: 'Direction générale ou DRH',
    sections: [
      { kind: 'fields', fields: [
        { key: 'title', label: 'Intitulé de la formation', type: 'text' }, { key: 'trainer', label: 'Formateur / Organisme', type: 'text' },
        { key: 'type', label: 'Type', type: 'select', options: ['Interne', 'Externe', 'En ligne', 'Sur le terrain'] }, { key: 'dates', label: 'Dates', type: 'text' },
        { key: 'place', label: 'Lieu', type: 'text' }, { key: 'hours', label: 'Durée totale (heures)', type: 'number' }, { key: 'cost', label: 'Coût total (FCFA)', type: 'money' },
        { key: 'funding', label: 'Financement', type: 'text' },
      ] },
      { kind: 'table', key: 'participants', title: 'Liste des participants', emptyRows: 8, extensible: true, columns: [
        { key: 'label', label: 'Nom et prénom' }, { key: 'job', label: 'Poste' }, { key: 'dept', label: 'Département' },
        { key: 'present', label: 'Présent(e) ?', type: 'select', options: ['Oui', 'Non'] }, { key: 'target', label: 'Note pré-formation', type: 'number' },
        { key: 'actual', label: 'Note post-formation', type: 'number' }, { key: 'progress', label: 'Progression', computed: 'progress' }] },
      { kind: 'table', key: 'hot', title: 'Évaluation à chaud — niveau 1 Kirkpatrick (nombre de réponses)', columns: [
        { key: 'label', label: "Critère d'évaluation" }, { key: 'n4', label: 'Très bien (4)', type: 'number' }, { key: 'n3', label: 'Bien (3)', type: 'number' },
        { key: 'n2', label: 'Moyen (2)', type: 'number' }, { key: 'n1', label: 'Insuffisant (1)', type: 'number' }, { key: 'comment', label: 'Commentaires participants' }],
        rows: ['Qualité et pertinence du contenu', 'Clarté des explications du formateur', 'Lien avec les situations réelles de travail', 'Qualité des supports et outils pédagogiques',
          'Organisation logistique (salle, matériel, timing)', 'Durée adaptée au contenu'] },
      { kind: 'text', key: 'acquired', title: 'Analyse des résultats — niveau 2 Kirkpatrick', hint: 'Compétences et connaissances acquises ou renforcées.' },
      { kind: 'text', key: 'remaining', title: 'Lacunes restantes', hint: 'Sujets à approfondir lors de prochaines formations.' },
      { kind: 'table', key: 'followup', title: 'Plan de suivi — niveaux 3 & 4 Kirkpatrick', columns: [
        { key: 'label', label: 'Action de suivi' }, { key: 'owner', label: 'Responsable' }, { key: 'due', label: 'Délai' }, { key: 'kpi', label: 'Indicateur de transfert' },
        { key: 'status', label: 'Statut', type: 'select', options: ['À faire', 'Fait'] }],
        rows: ['Observation terrain par le manager (J+30)', 'Entretien de suivi avec le participant (J+30)', 'Deuxième observation terrain (J+90)', "Mesure de l'impact sur les KPI concernés"] },
    ],
    signatures: ['Resp. RH', 'Formateur'],
  },
  {
    code: 'A9', name: 'Compte rendu Task Force', frequency: 'weekly', period: 'week', confidential: true,
    description: 'Revue des actions, avancement du plan de restructuration par pilier, décisions, plan d’action, escalades.',
    reference: 'Hebdomadaire — diffusé dans les 24h · Confidentiel direction · Membres Task Force + DG', reviewer: 'Direction générale',
    sections: [
      { kind: 'fields', fields: [
        { key: 'date', label: 'Date de la réunion', type: 'date' }, { key: 'start', label: 'Heure début', type: 'time' }, { key: 'end', label: 'Heure fin', type: 'time' },
        { key: 'place', label: 'Lieu', type: 'text' }, { key: 'session', label: 'Numéro de séance TF', type: 'number' }, { key: 'facilitator', label: 'Animateur', type: 'text' },
        { key: 'secretary', label: 'Secrétaire de séance', type: 'text' }, { key: 'present', label: 'Membres présents', type: 'textarea' },
        { key: 'excused', label: 'Membres excusés', type: 'text' }, { key: 'next', label: 'Prochaine réunion', type: 'date' },
      ] },
      { kind: 'table', key: 'review', title: '1. Revue des actions de la semaine précédente', emptyRows: 6, extensible: true, columns: [
        { key: 'label', label: 'Action' }, { key: 'owner', label: 'Responsable' }, { key: 'due', label: 'Délai prévu', type: 'date' },
        { key: 'status', label: 'Statut', type: 'select', options: ['Fait', 'En cours', 'Non fait', 'Annulé'] }, { key: 'comment', label: 'Commentaire / Blocage' }, { key: 'next', label: 'Suite' }] },
      { kind: 'table', key: 'pillars', title: '2. Avancement du plan de restructuration par pilier', columns: [
        { key: 'label', label: 'Pilier' }, { key: 'track', label: 'Avancement global', type: 'select', options: ['Sur track', 'Retard', 'Avance'] },
        { key: 'done', label: 'Réalisations de la semaine' }, { key: 'blocking', label: 'Points bloquants' }, { key: 'alert', label: 'Alerte ?', type: 'select', options: ['Oui', 'Non'] },
        { key: 'actions', label: 'Actions décidées' }], rows: PILLARS },
      { kind: 'text', key: 'decisions', title: '3. Points discutés et décisions prises', hint: "Points à l'ordre du jour discutés, analyses faites, décisions arrêtées." },
      { kind: 'table', key: 'plan', title: "4. Plan d'action semaine prochaine", emptyRows: 7, extensible: true, columns: [
        { key: 'label', label: 'Action à mener' }, { key: 'owner', label: 'Responsable' }, { key: 'due', label: 'Délai précis', type: 'date' },
        { key: 'resources', label: 'Ressources nécessaires' }, { key: 'success', label: 'Critère de succès' }] },
      { kind: 'text', key: 'escalations', title: '5. Escalades pour la Direction Générale', hint: "Blocages, décisions ou ressources nécessitant l'intervention directe du DG." },
    ],
    signatures: ['Validé par le DG', 'Diffusé par'],
  },
  {
    code: 'A10', name: 'Rapport trimestriel de pilotage — DG', frequency: 'quarterly', period: 'quarter', poleCode: 'DG', prefill: true, confidential: true,
    description: 'Tableau de bord stratégique consolidé, analyse par pôle, restructuration, finances, risques, perspectives.',
    reference: 'Trimestriel · Destinataire : Comité de direction / Actionnaires', reviewer: 'Direction générale',
    sections: [
      { kind: 'fields', fields: [
        { key: 'prepared_by', label: 'Préparé par', type: 'text' }, { key: 'approved_by', label: 'Validé par (DG)', type: 'text' },
        { key: 'presented_on', label: 'Date de présentation', type: 'date' }, { key: 'recipients', label: 'Destinataires', type: 'text' },
      ] },
      { kind: 'text', key: 'message', title: '1. Message du Directeur Général', hint: "Faits marquants du trimestre, perspectives, remerciements." },
      { kind: 'table', key: 'kpis', title: '2. Résumé exécutif — tableau de bord trimestriel consolidé', columns: [
        { key: 'label', label: 'Indicateur stratégique' }, { key: 'annual', label: 'Objectif annuel', type: 'number' }, { key: 'target', label: 'Objectif T', type: 'number' },
        { key: 'actual', label: 'Réalisé T', type: 'number' }, { key: 'att', label: 'Atteinte T (%)', computed: 'attainment' }, { key: 'ytd', label: 'Cumul YTD', type: 'number' },
        { key: 'trend', label: 'Tendance', type: 'select', options: ['↑', '↓', '='] }, { key: 'status', label: 'Statut', type: 'select', options: RAG }],
        rows: ["Chiffre d'affaires (FCFA)", 'Marge brute (%)', 'Résultat net (FCFA)', 'Trésorerie fin de T (FCFA)', 'Nombre de projets livrés', 'Taux de conversion comm. (%)',
          'Taux de conformité technique (%)', '% collaborateurs évalués', 'Heures de formation cumulées', 'Score moyen évaluation (/4)', "Taux d'absentéisme (%)"] },
      { kind: 'text', key: 'pole_comm', title: '3. Pôle Commercial & Marketing', hint: 'Faits marquants, analyses, décisions.' },
      { kind: 'text', key: 'pole_tech', title: 'Pôle Technique & Opérations', hint: 'Faits marquants, analyses, décisions.' },
      { kind: 'text', key: 'pole_adm', title: 'Pôle Administratif & Financier', hint: 'Faits marquants, analyses, décisions.' },
      { kind: 'text', key: 'pole_rh', title: 'Ressources Humaines', hint: 'Faits marquants, analyses, décisions.' },
      { kind: 'table', key: 'restructuring', title: '4. Avancement du plan de restructuration', columns: [
        { key: 'label', label: 'Pilier / Axe' }, { key: 'progress', label: 'Avancement (%)', type: 'number' }, { key: 'done', label: 'Réalisations clés du trimestre' },
        { key: 'issues', label: 'Difficultés rencontrées' }, { key: 'next', label: 'Prochaines étapes' }],
        rows: ['Excellence Opérationnelle', 'Évaluation Personnel', 'Reporting Départemental', 'Outils Performance RH', 'Politique de Formation', 'Task Force',
          'Organisation & Fiches de Poste', 'Budget et Pilotage Financier'] },
      { kind: 'table', key: 'finance', title: '5. Analyse financière trimestrielle', columns: [
        { key: 'label', label: 'Poste' }, { key: 'actual', label: 'T actuel (FCFA)', type: 'money' }, { key: 'target', label: 'T précédent (FCFA)', type: 'money' },
        { key: 'gapPct', label: 'Évolution (%)', computed: 'gapPct' }, { key: 'budget', label: 'Budget annuel (FCFA)', type: 'money' },
        { key: 'consumed', label: '% budget consommé', type: 'number' }, { key: 'comment', label: 'Commentaire' }],
        rows: ["Chiffre d'affaires", 'Marge brute', 'Résultat net', 'Dépenses de restructuration', 'Budget restant restructuration'] },
      { kind: 'table', key: 'risks', title: "6. Risques identifiés et mesures d'atténuation", emptyRows: 5, extensible: true, columns: [
        { key: 'label', label: 'Risque identifié' }, { key: 'prob', label: 'Probabilité', type: 'select', options: ['Faible', 'Moyenne', 'Élevée'] },
        { key: 'impact', label: 'Impact', type: 'select', options: ['Faible', 'Moyen', 'Élevé'] }, { key: 'current', label: 'Mesures en place' }, { key: 'extra', label: 'Mesures supplémentaires à décider' }] },
      { kind: 'text', key: 'outlook', title: "7. Perspectives et plan d'action du prochain trimestre", hint: 'Objectifs stratégiques, priorités absolues et principales actions.' },
    ],
    signatures: ['Directeur Général'],
  },
  {
    code: 'A11', name: 'Fiche de poste', frequency: 'adhoc', period: 'date', poleCode: 'RH',
    description: 'Mission, responsabilités, compétences, formation et expérience, KPI du poste, conditions de travail.',
    reference: 'À dupliquer pour chaque nouveau poste · mise à jour annuelle RH · RH — Direction Générale', reviewer: 'Direction générale ou DRH',
    sections: [
      { kind: 'fields', fields: [
        { key: 'job_title', label: 'Intitulé du poste', type: 'text' }, { key: 'dept', label: 'Département / Pôle', type: 'text' },
        { key: 'reports_to', label: 'Rattachement hiérarchique direct', type: 'text' }, { key: 'supervises', label: 'Postes supervisés', type: 'text' },
        { key: 'status', label: 'Statut', type: 'select', options: ['Cadre', 'Agent de maîtrise', 'Employé'] }, { key: 'location', label: 'Localisation', type: 'text' },
        { key: 'created_on', label: 'Date de création de la fiche', type: 'date' }, { key: 'updated_on', label: 'Date de dernière mise à jour', type: 'date' },
      ] },
      { kind: 'text', key: 'mission', title: 'Mission principale', hint: "Décrire en 2 à 3 phrases la raison d'être du poste." },
      { kind: 'text', key: 'responsibilities', title: 'Responsabilités détaillées', hint: 'Lister les 4 à 6 domaines de responsabilité principaux avec leurs activités clés.' },
      { kind: 'table', key: 'skills', title: 'Compétences requises', extensible: true, columns: [
        { key: 'label', label: 'Type de compétence' }, { key: 'skill', label: 'Compétence' },
        { key: 'level', label: 'Niveau requis', type: 'select', options: ['Débutant', 'Confirmé', 'Expert'] }, { key: 'critical', label: 'Critique ?', type: 'select', options: ['Oui', 'Non'] }],
        rows: ['Technique', 'Technique', 'Sectorielle', 'Managériale', 'Relationnelle', 'Informatique / digitale'] },
      { kind: 'fields', title: 'Formation et expérience requises', fields: [
        { key: 'education', label: "Niveau d'études minimum", type: 'text' }, { key: 'diplomas', label: 'Diplômes ou certifications requis', type: 'text' },
        { key: 'experience', label: 'Expérience professionnelle minimum', type: 'text' }, { key: 'specific', label: 'Expériences spécifiques requises', type: 'text' },
      ] },
      { kind: 'table', key: 'kpis', title: 'Indicateurs de performance du poste (KPI)', emptyRows: 6, extensible: true, columns: [
        { key: 'label', label: 'KPI' }, { key: 'desc', label: 'Description' }, { key: 'target', label: 'Cible' },
        { key: 'freq', label: 'Fréquence de mesure', type: 'select', options: ['Hebdomadaire', 'Mensuelle', 'Trimestrielle', 'Annuelle'] }] },
      { kind: 'fields', title: 'Conditions de travail', fields: [
        { key: 'hours', label: 'Horaires de travail', type: 'text' }, { key: 'travel', label: 'Déplacements requis', type: 'text' },
        { key: 'equipment', label: 'Équipements fournis', type: 'text' }, { key: 'benefits', label: 'Avantages spécifiques', type: 'text' },
      ] },
    ],
    signatures: ['Validé par le DG', 'Resp. RH'],
  },
  {
    code: 'A12', name: "Fiche d'intervention technique", frequency: 'adhoc', period: 'date', poleCode: 'TECH', prefill: true,
    description: 'Intervention terrain : matériel posé, check-list qualité, anomalies, satisfaction client.',
    reference: 'Par intervention — à remettre au Resp. Technique dans les 24h · Resp. Technique + Client', reviewer: 'Direction générale',
    sections: [
      { kind: 'fields', title: 'Informations générales', fields: [
        { key: 'sheet_no', label: 'N° de fiche', type: 'text' }, { key: 'date', label: "Date d'intervention", type: 'date' },
        { key: 'techs', label: 'Technicien(s) intervenant(s)', type: 'text' }, { key: 'lead', label: "Chef d'équipe", type: 'text' },
        { key: 'client', label: 'Client', type: 'text' }, { key: 'site', label: 'Localisation / Adresse du site', type: 'text' },
        { key: 'contact', label: 'Contact client sur site', type: 'text' },
        { key: 'type', label: "Type d'intervention", type: 'select', options: ['Installation', 'Maintenance', 'Dépannage', 'Contrôle qualité', 'Formation client'] },
        { key: 'left_at', label: 'Heure de départ du dépôt', type: 'time' }, { key: 'arrived_at', label: "Heure d'arrivée sur site", type: 'time' },
        { key: 'ended_at', label: "Heure de fin d'intervention", type: 'time' }, { key: 'duration', label: 'Durée totale (heures)', type: 'number' },
      ] },
      { kind: 'text', key: 'work', title: "Description de l'intervention", hint: 'Nature du travail réalisé (installation, maintenance, dépannage, contrôle qualité, formation client).' },
      { kind: 'table', key: 'materials', title: 'Matériel utilisé et posé', emptyRows: 5, extensible: true, columns: [
        { key: 'ref', label: 'Référence matériel' }, { key: 'label', label: 'Désignation' }, { key: 'qty', label: 'Quantité posée', type: 'number' },
        { key: 'serial', label: 'N° de série' }, { key: 'origin', label: 'Origine', type: 'select', options: ['Stock', 'Commande spéciale'] }] },
      { kind: 'table', key: 'quality', title: 'Check-list qualité — à compléter avant signature client', columns: [
        { key: 'label', label: 'Contrôle qualité' }, { key: 'answer', label: 'Résultat', type: 'select', options: ['Oui', 'Non', 'N/A'] }, { key: 'note', label: 'Observations' }],
        rows: ['Panneaux solaires correctement fixés et orientés', 'Câblage conforme et protégé', 'Onduleur paramétré et fonctionnel', 'Batteries / accumulateurs testés',
          'Pompe / système de pompage testé (si applicable)', 'Chambre froide testée en température (si applicable)', 'Nettoyage du chantier effectué',
          "Notice d'utilisation remise au client", 'Formation de base du client réalisée', "Photos de l'installation prises et transmises"] },
      { kind: 'text', key: 'anomalies', title: 'Anomalies et observations', hint: 'Anomalies détectées, problèmes rencontrés, points à surveiller, travaux complémentaires.' },
      { kind: 'choice', key: 'satisfaction', title: 'Satisfaction client', options: ['5 — Excellent', '4 — Bien', '3 — Correct', '2 — À améliorer', '1 — Insatisfait'] },
    ],
    signatures: ["Technicien chef d'équipe", 'Client / responsable site'],
  },
];

export const templateByCode = (code: string) => REPORT_TEMPLATES.find(t => t.code === code) ?? null;

export const FREQUENCY_LABEL: Record<ReportTemplate['frequency'], string> = { weekly: 'Hebdomadaire', monthly: 'Mensuel', quarterly: 'Trimestriel', adhoc: 'À la demande' };

// ---------------------------------------------------------------------
// Calculs et utilitaires purs
// ---------------------------------------------------------------------
export const isGroupRow = (label: unknown) => typeof label === 'string' && label.startsWith('§ ');
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function computeCell(kind: ComputedKind, row: TableRow): number | null {
  const t = num(row.target), a = num(row.actual);
  if (kind === 'gap') return t === null || a === null ? null : a - t;
  if (t === null || a === null || t === 0) return null;
  if (kind === 'attainment') return a / t;
  if (kind === 'gapPct') return (a - t) / Math.abs(t);
  return (a - t) / Math.abs(t); // progress (post vs pré)
}

/** Statut feu tricolore à partir du taux d'atteinte (≥ 100 % vert, ≥ 80 % orange). */
export const ragFromAttainment = (att: number | null): string | null => (att === null ? null : att >= 1 ? 'Vert' : att >= 0.8 ? 'Orange' : 'Rouge');

/** Lignes initiales d'un tableau : lignes prédéfinies (libellé figé) ou lignes vides. */
export function initialRows(section: Extract<ReportSection, { kind: 'table' }>): TableRow[] {
  if (section.rows) return section.rows.map(label => ({ label }));
  return Array.from({ length: section.emptyRows ?? 3 }, () => ({}));
}

export function emptyData(t: ReportTemplate): ReportData {
  const d: ReportData = {};
  for (const s of t.sections) if (s.kind === 'table') d[s.key] = initialRows(s);
  return d;
}

/** Score pondéré A6 : moyenne des notes finales par dimension × poids (40/25/20/15). Résultat /4. */
export function weightedEvaluation(rows: TableRow[]): { score: number | null; level: string | null; byDimension: { label: string; avg: number | null; weight: number }[] } {
  const dims: { label: string; weight: number; notes: number[] }[] = [];
  for (const r of rows) {
    if (isGroupRow(r.label)) {
      const w = Number(/\((\d+)\s*%\)/.exec(String(r.label))?.[1] ?? 0) / 100;
      dims.push({ label: String(r.label).slice(2), weight: w, notes: [] });
    } else if (dims.length) {
      const n = num(r.final) ?? num(r.manager);
      if (n !== null && n >= 1 && n <= 4) dims[dims.length - 1].notes.push(n);
    }
  }
  const byDimension = dims.map(d => ({ label: d.label, weight: d.weight, avg: d.notes.length ? d.notes.reduce((a, b) => a + b, 0) / d.notes.length : null }));
  const rated = byDimension.filter(d => d.avg !== null);
  const wsum = rated.reduce((a, d) => a + d.weight, 0);
  const score = wsum ? rated.reduce((a, d) => a + (d.avg as number) * d.weight, 0) / wsum : null;
  const level = score === null ? null : score < 1.5 ? '1 — Insuffisant' : score < 2.5 ? '2 — À améliorer' : score < 3.5 ? '3 — Satisfaisant' : '4 — Excellent';
  return { score, level, byDimension };
}

/** Note moyenne d'un critère d'évaluation à chaud (A8). */
export function hotAverage(r: TableRow): number | null {
  const counts = [num(r.n4) ?? 0, num(r.n3) ?? 0, num(r.n2) ?? 0, num(r.n1) ?? 0];
  const n = counts.reduce((a, b) => a + b, 0);
  return n ? (counts[0] * 4 + counts[1] * 3 + counts[2] * 2 + counts[3]) / n : null;
}

// ---------------------------------------------------------------------
// Périodes
// ---------------------------------------------------------------------
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Période par défaut selon le type : semaine ISO, mois, trimestre ou date du jour. */
export function defaultPeriod(kind: PeriodKind, today = new Date()): string {
  if (kind === 'month') return iso(today).slice(0, 7);
  if (kind === 'quarter') return `${today.getUTCFullYear()}-T${Math.floor(today.getUTCMonth() / 3) + 1}`;
  if (kind === 'date') return iso(today);
  const { year, week } = isoWeek(today);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7) };
}

/** Bornes [début, fin] (AAAA-MM-JJ inclus) d'une période saisie. */
export function periodRange(period: string): { from: string; to: string } | null {
  let m = /^(\d{4})-W(\d{2})$/.exec(period);
  if (m) {
    const y = Number(m[1]), w = Number(m[2]);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const monday = new Date(jan4); monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7);
    const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }
  m = /^(\d{4})-T([1-4])$/.exec(period);
  if (m) {
    const y = Number(m[1]), q = Number(m[2]);
    return { from: iso(new Date(Date.UTC(y, (q - 1) * 3, 1))), to: iso(new Date(Date.UTC(y, q * 3, 0))) };
  }
  m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) return { from: `${period}-01`, to: iso(new Date(Date.UTC(Number(m[1]), Number(m[2]), 0))) };
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return { from: period, to: period };
  return null;
}

export function periodLabel(period: string): string {
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  let m = /^(\d{4})-W(\d{2})$/.exec(period);
  if (m) { const r = periodRange(period)!; return `Semaine ${Number(m[2])} (${r.from.slice(8)}/${r.from.slice(5, 7)} → ${r.to.slice(8)}/${r.to.slice(5, 7)}/${m[1]})`; }
  m = /^(\d{4})-T([1-4])$/.exec(period);
  if (m) return `${m[2]}${m[2] === '1' ? 'er' : 'e'} trimestre ${m[1]}`;
  m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return period;
}
