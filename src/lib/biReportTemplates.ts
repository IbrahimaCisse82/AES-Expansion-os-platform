// Modèles de rapports opérationnels inspirés du classeur AES Burkina (A1–A12)

export interface BiReportField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'kpi';
}

export interface BiReportTemplate {
  code: string;
  name: string;
  description: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
  poleCode?: string;
  fields: BiReportField[];
}

export const BI_REPORT_TEMPLATES: BiReportTemplate[] = [
  {
    code: 'A1', name: 'Flash hebdomadaire', description: 'Synthèse hebdomadaire : faits marquants, chiffres clés, alertes.', frequency: 'weekly',
    fields: [
      { key: 'highlights', label: 'Faits marquants', type: 'textarea' },
      { key: 'ca_week', label: 'CA de la semaine (FCFA)', type: 'number' },
      { key: 'clients', label: 'Nouveaux clients', type: 'number' },
      { key: 'alerts', label: 'Alertes / points de blocage', type: 'textarea' },
      { key: 'next_week', label: 'Priorités semaine prochaine', type: 'textarea' },
    ],
  },
  {
    code: 'A2', name: 'Rapport mensuel Commercial', description: 'Activité commerciale : ventes, pipeline, prospection.', frequency: 'monthly', poleCode: 'COMM',
    fields: [
      { key: 'ca_month', label: 'CA du mois (FCFA)', type: 'number' },
      { key: 'deals_won', label: 'Affaires signées', type: 'number' },
      { key: 'pipeline', label: 'Pipeline en cours (FCFA)', type: 'number' },
      { key: 'visits', label: 'Visites / RDV réalisés', type: 'number' },
      { key: 'comments', label: 'Commentaires', type: 'textarea' },
    ],
  },
  {
    code: 'A3', name: 'Rapport mensuel Technique', description: 'Production technique : interventions, incidents, disponibilité.', frequency: 'monthly', poleCode: 'TECH',
    fields: [
      { key: 'interventions', label: 'Interventions réalisées', type: 'number' },
      { key: 'incidents', label: 'Incidents majeurs', type: 'number' },
      { key: 'availability', label: 'Taux de disponibilité (%)', type: 'number' },
      { key: 'comments', label: 'Commentaires', type: 'textarea' },
    ],
  },
  {
    code: 'A4', name: 'Rapport mensuel Administratif', description: 'Fonction support : achats, logistique, conformité.', frequency: 'monthly', poleCode: 'ADM',
    fields: [
      { key: 'purchases', label: 'Achats du mois (FCFA)', type: 'number' },
      { key: 'contracts', label: 'Contrats traités', type: 'number' },
      { key: 'compliance', label: 'Points de conformité', type: 'textarea' },
      { key: 'comments', label: 'Commentaires', type: 'textarea' },
    ],
  },
  {
    code: 'A5', name: 'Rapport mensuel RH', description: 'Ressources humaines : effectifs, recrutements, formations.', frequency: 'monthly', poleCode: 'RH',
    fields: [
      { key: 'headcount', label: 'Effectif total', type: 'number' },
      { key: 'hires', label: 'Recrutements', type: 'number' },
      { key: 'departures', label: 'Départs', type: 'number' },
      { key: 'trainings', label: 'Formations dispensées', type: 'number' },
      { key: 'comments', label: 'Commentaires', type: 'textarea' },
    ],
  },
  {
    code: 'A6', name: 'Évaluation individuelle', description: 'Évaluation de performance d\u2019un collaborateur.', frequency: 'quarterly',
    fields: [
      { key: 'employee', label: 'Collaborateur', type: 'text' },
      { key: 'objectives', label: 'Objectifs', type: 'textarea' },
      { key: 'results', label: 'Résultats obtenus', type: 'textarea' },
      { key: 'score', label: 'Note globale (/20)', type: 'number' },
      { key: 'recommendations', label: 'Recommandations', type: 'textarea' },
    ],
  },
  {
    code: 'A7', name: 'PPI 90 jours', description: 'Plan de performance individuel à 90 jours.', frequency: 'quarterly',
    fields: [
      { key: 'employee', label: 'Collaborateur', type: 'text' },
      { key: 'objectives', label: 'Objectifs 90 jours', type: 'textarea' },
      { key: 'milestones', label: 'Jalons clés', type: 'textarea' },
      { key: 'support', label: 'Accompagnement prévu', type: 'textarea' },
    ],
  },
  {
    code: 'A8', name: 'Rapport de formation', description: 'Compte rendu d\u2019une session de formation.', frequency: 'adhoc', poleCode: 'RH',
    fields: [
      { key: 'topic', label: 'Thème', type: 'text' },
      { key: 'trainer', label: 'Formateur', type: 'text' },
      { key: 'participants', label: 'Participants', type: 'number' },
      { key: 'satisfaction', label: 'Satisfaction (/10)', type: 'number' },
      { key: 'learnings', label: 'Acquis / suites', type: 'textarea' },
    ],
  },
  {
    code: 'A9', name: 'Compte rendu Task Force', description: 'Compte rendu de réunion de la task force pays.', frequency: 'monthly',
    fields: [
      { key: 'attendees', label: 'Participants', type: 'text' },
      { key: 'agenda', label: 'Ordre du jour', type: 'textarea' },
      { key: 'decisions', label: 'Décisions prises', type: 'textarea' },
      { key: 'actions', label: 'Plan d\u2019action', type: 'textarea' },
    ],
  },
  {
    code: 'A10', name: 'Rapport trimestriel DG', description: 'Synthèse trimestrielle pour la direction générale.', frequency: 'quarterly', poleCode: 'DG',
    fields: [
      { key: 'ca_quarter', label: 'CA du trimestre (FCFA)', type: 'number' },
      { key: 'result', label: 'Résultat net (FCFA)', type: 'number' },
      { key: 'achievements', label: 'Réalisations majeures', type: 'textarea' },
      { key: 'challenges', label: 'Défis', type: 'textarea' },
      { key: 'outlook', label: 'Perspectives', type: 'textarea' },
    ],
  },
  {
    code: 'A11', name: 'Fiche de poste', description: 'Description d\u2019un poste : missions, responsabilités, profil.', frequency: 'adhoc', poleCode: 'RH',
    fields: [
      { key: 'job_title', label: 'Intitulé du poste', type: 'text' },
      { key: 'missions', label: 'Missions', type: 'textarea' },
      { key: 'responsibilities', label: 'Responsabilités', type: 'textarea' },
      { key: 'profile', label: 'Profil recherché', type: 'textarea' },
    ],
  },
  {
    code: 'A12', name: 'Fiche d\u2019intervention', description: 'Compte rendu d\u2019une intervention terrain.', frequency: 'adhoc', poleCode: 'TECH',
    fields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'date', label: 'Date d\u2019intervention', type: 'date' },
      { key: 'work_done', label: 'Travaux réalisés', type: 'textarea' },
      { key: 'issues', label: 'Problèmes rencontrés', type: 'textarea' },
      { key: 'follow_up', label: 'Suites à donner', type: 'textarea' },
    ],
  },
];
