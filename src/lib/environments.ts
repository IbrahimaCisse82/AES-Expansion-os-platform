// Quatre environnements distincts (barre latérale propre à chacun) reliés par les données,
// la messagerie et les notifications. Un rôle n'affiche que les environnements qui le concernent ;
// les droits sur les données restent appliqués en base (RLS).
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle, BarChart3, Boxes, Calculator, Calendar, CheckSquare, ClipboardList, Clock, Coins, FilePlus2, FileText, Gauge,
  Globe, Grid3X3, Landmark, LayoutDashboard, LineChart, ListTodo, Map, Package, PieChart, Receipt, Scale, Settings2,
  ShoppingCart, Target, TrendingUp, Truck, Users, Wallet, Wrench, Zap,
} from 'lucide-react';

export type EnvId = 'expansion' | 'tc' | 'finance' | 'reporting';

export interface EnvNavItem { path: string; label: string; icon: LucideIcon; badgeKey?: 'countries' | 'tasks' | 'risks'; requiresBiAccess?: boolean; end?: boolean }
export interface EnvNavGroup { label: string; items: EnvNavItem[] }

export interface Environment {
  id: EnvId;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Classe Tailwind de la couleur d'accent (pastille, bandeau actif). */
  accent: string;
  home: string;
  /** Rôles autorisés. */
  roles: string[];
  nav: EnvNavGroup[];
}

const ALL_INTERNAL = ['admin', 'director', 'observer'];

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'expansion', label: 'Expansion', short: 'Expansion', icon: Globe, accent: 'bg-[hsl(var(--sky))]',
    description: 'Plan d\'expansion international : pays, feuille de route, risques, BI',
    home: '/app/dashboard', roles: [...ALL_INTERNAL, 'country_manager', 'analyst', 'partner'],
    nav: [
      { label: 'Pilotage', items: [
        { path: '/app/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        { path: '/app/roadmap', label: 'Feuille de route', icon: Map },
        { path: '/app/countries', label: 'Pays cibles', icon: Globe, badgeKey: 'countries' },
      ] },
      { label: 'Opérations', items: [
        { path: '/app/tasks', label: 'Tâches', icon: ListTodo, badgeKey: 'tasks' },
        { path: '/app/calendar', label: 'Calendrier', icon: Calendar },
        { path: '/app/risks', label: 'Risques', icon: AlertTriangle, badgeKey: 'risks' },
      ] },
      { label: 'Analyse', items: [
        { path: '/app/kpis', label: 'KPIs', icon: BarChart3 },
        { path: '/app/market-analysis', label: 'Analyse marché', icon: LineChart },
        { path: '/app/budget', label: 'Budget', icon: Wallet },
        { path: '/app/bi', label: 'Business Intelligence', icon: PieChart, requiresBiAccess: true },
        { path: '/app/history', label: 'Historique', icon: Clock },
      ] },
    ],
  },
  {
    id: 'tc', label: 'Technico-commercial', short: 'Technico-commercial', icon: Zap, accent: 'bg-[hsl(var(--gold))]',
    description: 'Kits, devis, ventes, encaissements, stock et achats',
    home: '/app/tc/dg', roles: [...ALL_INTERNAL, 'raf', 'commercial_director', 'technical_director', 'sales_rep', 'technician', 'logistics', 'analyst'],
    nav: [
      { label: 'Pilotage', items: [
        { path: '/app/tc/dg', label: 'Tableau DG', icon: Gauge },
        { path: '/app/tc/performance', label: 'Performance équipes', icon: TrendingUp },
        { path: '/app/tc/marges', label: 'Marges & encaissements', icon: Coins },
        { path: '/app/tc/commissions', label: 'Commissions & prévisions', icon: Calculator },
        { path: '/app/tc/analyses', label: 'Analyses mensuelles', icon: LineChart },
      ] },
      { label: 'Saisie commerciale', items: [
        { path: '/app/tc/ventes', label: 'Journal des ventes', icon: Receipt },
        { path: '/app/tc/objectifs', label: 'Objectifs', icon: Target },
      ] },
      { label: 'Kits', items: [
        { path: '/app/tc/kits', label: 'Modélisation des kits', icon: Wrench },
        { path: '/app/tc/synthese', label: 'Synthèse des kits', icon: Boxes },
      ] },
      { label: 'Stock & achats', items: [
        { path: '/app/tc/stock', label: 'Stock', icon: Package },
        { path: '/app/tc/achats', label: 'Besoins & achats', icon: ShoppingCart },
        { path: '/app/tc/dormant', label: 'Stock dormant', icon: Clock },
        { path: '/app/tc/capacite', label: 'Capacité', icon: Truck },
      ] },
      { label: 'Référentiels', items: [
        { path: '/app/tc/referentiels', label: 'Paramètres & référentiels', icon: Settings2 },
        { path: '/app/tc/raci', label: 'Matrice RACI', icon: Grid3X3 },
      ] },
    ],
  },
  {
    id: 'finance', label: 'Finance', short: 'Finance', icon: Landmark, accent: 'bg-[hsl(var(--sage))]',
    description: 'Budgets par pôle, trésorerie, compte de résultat, KPI officiels',
    home: '/app/finance', roles: [...ALL_INTERNAL, 'raf', 'dhr', 'commercial_director', 'technical_director', 'analyst'],
    nav: [
      { label: 'Finance', items: [
        { path: '/app/finance', label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
        { path: '/app/finance/budgets', label: 'Budgets par pôle', icon: Wallet },
        { path: '/app/finance/tresorerie', label: 'Trésorerie', icon: Coins },
        { path: '/app/finance/resultat', label: 'Compte de résultat', icon: Scale },
        { path: '/app/finance/kpi', label: 'KPI officiels', icon: Target },
      ] },
    ],
  },
  {
    id: 'reporting', label: 'Reporting', short: 'Reporting', icon: FileText, accent: 'bg-[hsl(var(--plum))]',
    description: 'Rapports A1–A12 : rédaction, validation, PDF',
    home: '/app/reporting', roles: [...ALL_INTERNAL, 'raf', 'dhr', 'commercial_director', 'technical_director', 'sales_rep', 'technician', 'logistics', 'country_manager', 'analyst'],
    nav: [
      { label: 'Rapports', items: [
        { path: '/app/reporting', label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
        { path: '/app/reporting/a-valider', label: 'À valider', icon: CheckSquare },
        { path: '/app/reporting/mes-rapports', label: 'Mes rapports', icon: ClipboardList },
        { path: '/app/reporting/modeles', label: 'Nouveau rapport (A1–A12)', icon: FilePlus2 },
      ] },
    ],
  },
];

/** Pages communes à tous les environnements. */
export const COMMON_NAV: EnvNavItem[] = [
  { path: '/app/comments', label: 'Discussions', icon: Users },
  { path: '/app/team', label: 'Équipe', icon: Users },
  { path: '/app/settings', label: 'Paramètres', icon: Settings2 },
];
export const COMMON_PREFIXES = ['/app/comments', '/app/team', '/app/settings', '/app/profile'];

export const envById = (id: EnvId) => ENVIRONMENTS.find(e => e.id === id)!;

/** Environnement d'une URL ; null pour les pages communes. */
export function envForPath(path: string): EnvId | null {
  if (COMMON_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))) return null;
  if (path.startsWith('/app/tc')) return 'tc';
  if (path.startsWith('/app/finance')) return 'finance';
  if (path.startsWith('/app/reporting')) return 'reporting';
  return 'expansion';
}

export function allowedEnvs(role: string | null | undefined): Environment[] {
  if (!role) return [];
  return ENVIRONMENTS.filter(e => e.roles.includes(role));
}

/** Environnement d'arrivée : le dernier utilisé s'il est autorisé, sinon celui qui correspond le mieux au rôle. */
const ROLE_HOME: Record<string, EnvId> = {
  sales_rep: 'tc', technician: 'tc', logistics: 'tc', commercial_director: 'tc', technical_director: 'tc',
  raf: 'finance', dhr: 'reporting', country_manager: 'expansion', partner: 'expansion',
};
export function defaultEnv(role: string | null | undefined, last: string | null): Environment | null {
  const allowed = allowedEnvs(role);
  if (!allowed.length) return null;
  return allowed.find(e => e.id === last) ?? allowed.find(e => e.id === ROLE_HOME[role ?? '']) ?? allowed[0];
}

export const LAST_ENV_KEY = 'expansionos:last-env';
export function readLastEnv(): string | null { try { return localStorage.getItem(LAST_ENV_KEY); } catch { return null; } }
export function writeLastEnv(id: EnvId) { try { localStorage.setItem(LAST_ENV_KEY, id); } catch { /* stockage indisponible */ } }
