export interface Country {
  id: string;
  flag: string;
  name: string;
  region: string;
  phase: number;
  pct: number;
  st: 'active' | 'done' | 'planning';
  color: string;
  budget: string;
  team: number;
  risks: number;
  pop: string;
  pib: string;
  langue: string;
  contact: string;
  desc: string;
  kpiCa: string;
  kpiClients: string;
  kpiNps: string;
  kpiRet: string;
  milestones: Milestone[];
}

export interface Milestone {
  icon: string;
  title: string;
  date: string;
  done: boolean;
}

export interface Task {
  id: number;
  title: string;
  country: string;
  due: string;
  priority: 'high' | 'med' | 'low';
  status: 'open' | 'done' | 'late';
  owner: string;
}

export interface Comment {
  id: number;
  author: string;
  initials: string;
  color: string;
  time: string;
  market: string;
  marketId: string;
  text: string;
  tags: string[];
}

export interface Risk {
  title: string;
  country: string;
  category: string;
  level: 'high' | 'medium' | 'low';
}

export interface HistoryItem {
  color: string;
  text: string;
  time: string;
  market: string;
}

export const phaseNames = [
  'Phase 0 — Prospection',
  'Phase 1 — Étude & Légal',
  'Phase 2 — Mise en place',
  'Phase 3 — Lancement',
  'Phase 4 — Opérationnel',
];

export const countries: Country[] = [
  {
    id: 'de', flag: '🇩🇪', name: 'Allemagne', region: 'Europe', phase: 2, pct: 75, st: 'active',
    color: 'sage', budget: '1.8M€', team: 8, risks: 1,
    pop: '83M', pib: '4,200 Mds$', langue: 'Allemand', contact: 'Marc Richter',
    desc: 'Marché prioritaire avec fort potentiel B2B. Bureau à Berlin en préparation. Partenariats industriels avancés avec 3 distributeurs majeurs.',
    kpiCa: '156K€', kpiClients: '580', kpiNps: '68', kpiRet: '91%',
    milestones: [
      { icon: '📋', title: 'Étude de marché complète', date: 'Mars 2025', done: true },
      { icon: '⚖️', title: 'Dépôt de marque', date: 'Mai 2025', done: true },
      { icon: '🏢', title: 'Ouverture bureau Berlin', date: 'Juil 2025', done: false },
      { icon: '🚀', title: 'Lancement commercial', date: 'Oct 2025', done: false },
    ],
  },
  {
    id: 'jp', flag: '🇯🇵', name: 'Japon', region: 'Asie-Pacifique', phase: 3, pct: 88, st: 'active',
    color: 'sky', budget: '2.0M€', team: 12, risks: 1,
    pop: '125M', pib: '4,940 Mds$', langue: 'Japonais', contact: 'Yuki Tanaka',
    desc: 'Marché le plus avancé. Bureau Tokyo opérationnel. Partenariat signé avec Tokyo Distribution. Lancement grand public prévu septembre.',
    kpiCa: '284K€', kpiClients: '1,240', kpiNps: '72', kpiRet: '89%',
    milestones: [
      { icon: '🤝', title: 'Contrat partenaire Tokyo', date: 'Fév 2025', done: true },
      { icon: '🏢', title: 'Bureau Tokyo opérationnel', date: 'Avr 2025', done: true },
      { icon: '📜', title: 'Certifications PSE/JIS', date: 'Juin 2025', done: true },
      { icon: '🚀', title: 'Lancement grand public', date: 'Sep 2025', done: false },
    ],
  },
  {
    id: 'br', flag: '🇧🇷', name: 'Brésil', region: 'Amérique Latine', phase: 1, pct: 42, st: 'active',
    color: 'gold', budget: '1.2M€', team: 5, risks: 2,
    pop: '214M', pib: '1,920 Mds$', langue: 'Portugais', contact: 'Carlos Silva',
    desc: 'Marché à haut potentiel malgré les défis réglementaires. Dossier ANVISA en cours. Focus sur São Paulo, Rio et Belo Horizonte.',
    kpiCa: 'N/A', kpiClients: 'N/A', kpiNps: 'N/A', kpiRet: 'N/A',
    milestones: [
      { icon: '📋', title: 'Étude SP, RJ, BH', date: 'Avr 2025', done: true },
      { icon: '📄', title: 'Dossier ANVISA soumis', date: 'Juil 2025', done: false },
      { icon: '🏢', title: 'Bureau São Paulo', date: 'Nov 2025', done: false },
    ],
  },
  {
    id: 'au', flag: '🇦🇺', name: 'Australie', region: 'Asie-Pacifique', phase: 1, pct: 35, st: 'active',
    color: 'terracotta', budget: '900K€', team: 3, risks: 1,
    pop: '26M', pib: '1,690 Mds$', langue: 'Anglais', contact: 'Yuki Tanaka',
    desc: 'Extension AU + NZ. Prospection de 3 distributeurs en cours. Potentiel fort sur le segment premium.',
    kpiCa: 'N/A', kpiClients: 'N/A', kpiNps: 'N/A', kpiRet: 'N/A',
    milestones: [
      { icon: '📋', title: 'Étude AU + NZ', date: 'Mai 2025', done: true },
      { icon: '🤝', title: 'Accord distributeur', date: 'Sep 2025', done: false },
      { icon: '🏢', title: 'Bureau Sydney', date: 'Déc 2025', done: false },
    ],
  },
  {
    id: 'ng', flag: '🇳🇬', name: 'Nigeria', region: 'Afrique', phase: 0, pct: 15, st: 'planning',
    color: 'plum', budget: '600K€', team: 2, risks: 3,
    pop: '220M', pib: '440 Mds$', langue: 'Anglais', contact: 'Amara Okafor',
    desc: 'Phase de prospection initiale. Focus Lagos et Abuja. Environnement réglementaire complexe à surveiller de près.',
    kpiCa: 'N/A', kpiClients: 'N/A', kpiNps: 'N/A', kpiRet: 'N/A',
    milestones: [
      { icon: '📋', title: 'Étude de marché Lagos', date: 'Juil 2025', done: false },
      { icon: '⚖️', title: 'Cadre légal CAMA', date: 'Oct 2025', done: false },
    ],
  },
  {
    id: 'sa', flag: '🇸🇦', name: 'Arabie Saoudite', region: 'Moyen-Orient', phase: 0, pct: 10, st: 'planning',
    color: 'gold', budget: '500K€', team: 1, risks: 2,
    pop: '36M', pib: '1,060 Mds$', langue: 'Arabe', contact: 'Alice Dupont',
    desc: 'Opportunité Vision 2030. Étude préliminaire en cours. Potentiel de JV avec acteur local.',
    kpiCa: 'N/A', kpiClients: 'N/A', kpiNps: 'N/A', kpiRet: 'N/A',
    milestones: [
      { icon: '📋', title: 'Étude Vision 2030', date: 'Sep 2025', done: false },
      { icon: '⚖️', title: 'Cadre légal SAGIA', date: 'Déc 2025', done: false },
    ],
  },
];

export const tasks: Task[] = [
  { id: 1, title: 'Déposer la marque en Allemagne', country: '🇩🇪 Allemagne', due: '30 Juil 2025', priority: 'high', status: 'done', owner: 'Marc Richter' },
  { id: 2, title: 'Finaliser contrat partenaire Tokyo', country: '🇯🇵 Japon', due: '5 Août 2025', priority: 'high', status: 'done', owner: 'Yuki Tanaka' },
  { id: 3, title: 'Rédiger plan de communication Brésil', country: '🇧🇷 Brésil', due: '15 Août 2025', priority: 'med', status: 'open', owner: 'Carlos Silva' },
  { id: 4, title: 'Recruter directeur pays Australie', country: '🇦🇺 Australie', due: '1 Sep 2025', priority: 'high', status: 'open', owner: 'Yuki Tanaka' },
  { id: 5, title: 'Analyser cadre réglementaire Nigeria', country: '🇳🇬 Nigeria', due: '20 Juil 2025', priority: 'high', status: 'late', owner: 'Amara Okafor' },
  { id: 6, title: 'Ouvrir compte bancaire Allemagne', country: '🇩🇪 Allemagne', due: '10 Août 2025', priority: 'med', status: 'open', owner: 'Marc Richter' },
  { id: 7, title: 'Traduire documentation produit (japonais)', country: '🇯🇵 Japon', due: '25 Juil 2025', priority: 'med', status: 'late', owner: 'Yuki Tanaka' },
  { id: 8, title: 'Validation ANVISA Brésil', country: '🇧🇷 Brésil', due: '1 Nov 2025', priority: 'high', status: 'open', owner: 'Carlos Silva' },
  { id: 9, title: 'Prospection distributeurs Australie', country: '🇦🇺 Australie', due: '15 Août 2025', priority: 'med', status: 'done', owner: 'Yuki Tanaka' },
  { id: 10, title: 'Étude de marché Nigeria finalisée', country: '🇳🇬 Nigeria', due: '10 Juil 2025', priority: 'med', status: 'late', owner: 'Amara Okafor' },
];

export const risks: Risk[] = [
  { title: 'Instabilité réglementaire', country: '🇳🇬 Nigeria', category: 'Juridique', level: 'high' },
  { title: 'Inflation monnaie locale +18%', country: '🇧🇷 Brésil', category: 'Financier', level: 'high' },
  { title: 'Délai certification produit', country: '🇯🇵 Japon', category: 'Opérationnel', level: 'medium' },
  { title: 'Pénurie de talents locaux', country: '🇩🇪 Allemagne', category: 'RH', level: 'medium' },
  { title: 'Barrière culturelle', country: '🇦🇺 Australie', category: 'Com', level: 'low' },
];

export const historyItems: HistoryItem[] = [
  { color: 'sage', text: 'Marc Richter a mis à jour l\'avancement Allemagne à 75%', time: 'Il y a 2h', market: '🇩🇪' },
  { color: 'sky', text: 'Yuki Tanaka a terminé "Finaliser contrat Tokyo"', time: 'Il y a 3h', market: '🇯🇵' },
  { color: 'navy', text: 'Alice Dupont a commenté le marché Japon', time: 'Il y a 4h', market: '🇯🇵' },
  { color: 'terracotta', text: 'Amara Okafor a créé une alerte risque Nigeria', time: 'Hier à 16h', market: '🇳🇬' },
  { color: 'gold', text: 'Carlos Silva a fait passer le Brésil en Phase 1', time: 'Hier à 14h', market: '🇧🇷' },
  { color: 'plum', text: 'Alice Dupont a approuvé le budget Q3 Australie', time: 'Il y a 3j', market: '🇦🇺' },
];

export const budgetData = [
  { country: '🇩🇪 Allemagne', allocated: 1800, spent: 1240, color: 'sage' },
  { country: '🇯🇵 Japon', allocated: 2000, spent: 1850, color: 'sky' },
  { country: '🇧🇷 Brésil', allocated: 1200, spent: 560, color: 'gold' },
  { country: '🇦🇺 Australie', allocated: 900, spent: 420, color: 'terracotta' },
  { country: '🇳🇬 Nigeria', allocated: 600, spent: 95, color: 'plum' },
];

export const budgetCategories = [
  { name: 'Juridique & Compliance', amount: 810, pct: 80, color: 'sage' },
  { name: 'Infrastructure & Bureaux', amount: 1450, pct: 65, color: 'sky' },
  { name: 'Marketing & Com', amount: 920, pct: 55, color: 'terracotta' },
  { name: 'RH & Recrutement', amount: 780, pct: 70, color: 'gold' },
  { name: 'Études de Marché', amount: 210, pct: 35, color: 'plum' },
];
