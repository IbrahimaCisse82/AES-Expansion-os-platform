import { parseAmount } from './parseAmount';

/**
 * ExpansionOS — Score de marché (formule officielle 25/20/25/20/10)
 *
 *   Score = 0.25 × checklist  (progression % du marché)
 *         + 0.20 × jalons completés %
 *         + 0.25 × KPIs verts % (≥ 80% de la cible)
 *         + 0.20 × (100 − exposition risque)
 *         + 0.10 × respect budget %
 */

interface CountryData {
  pct: number;
  risk_count: number;
  team_size: number;
  kpi_ca: string | null;
  kpi_clients: string | null;
  kpi_nps: string | null;
  kpi_retention: string | null;
  population: string | null;
  gdp: string | null;
  phase: number;
}

export interface ScoreInputs {
  /** Liste des jalons du pays */
  milestones?: { is_done: boolean }[];
  /** Risques avec niveau (high|medium|low) */
  risks?: { level: string }[];
  /** KPIs avec valeur courante et cible */
  kpis?: { value: number; target: number }[];
  /** Budget : alloué et dépensé en FCFA */
  budget?: { allocated_k: number; spent_k: number };
}

export interface ScoreBreakdown {
  score: number;
  checklist: number;
  milestones: number;
  kpis: number;
  risks: number;
  budget: number;
}

function parseNumeric(val: string | null): number | null {
  return parseAmount(val);
}

/** Lignes brutes utiles au score (types minimaux pour rester découplé de Supabase). */
export interface ScoreSourceData {
  milestones?: { country_id: string; is_done: boolean }[];
  risks?: { country_id: string | null; level: string }[];
  kpiHistory?: {
    country_id: string; month: string;
    ca: number; clients: number; nps: number; retention: number;
    target_ca: number; target_clients: number; target_nps: number; target_retention: number;
  }[];
  budgetEntries?: { country_id: string | null; allocated_k: number; spent_k: number }[];
}

/**
 * Assemble les entrées structurées du score d'un pays à partir des données
 * réelles (jalons, risques, dernier mois de KPI, budget). Sans ces entrées,
 * le score retombait sur les champs texte de la fiche pays et la composante
 * « jalons » valait toujours 0.
 */
export function buildScoreInputs(countryId: string, src: ScoreSourceData): ScoreInputs {
  const inputs: ScoreInputs = {};

  const ms = src.milestones?.filter(m => m.country_id === countryId);
  if (ms && ms.length > 0) inputs.milestones = ms;

  const rs = src.risks?.filter(r => r.country_id === countryId);
  if (src.risks) inputs.risks = rs ?? [];

  const months = src.kpiHistory?.filter(k => k.country_id === countryId) ?? [];
  if (months.length > 0) {
    const last = months.reduce((a, b) => (b.month > a.month ? b : a));
    inputs.kpis = [
      { value: last.ca, target: last.target_ca },
      { value: last.clients, target: last.target_clients },
      { value: last.nps, target: last.target_nps },
      { value: last.retention, target: last.target_retention },
    ].filter(k => k.target > 0);
    if (inputs.kpis.length === 0) delete inputs.kpis;
  }

  const be = src.budgetEntries?.filter(b => b.country_id === countryId) ?? [];
  if (be.length > 0) {
    inputs.budget = {
      allocated_k: be.reduce((s, b) => s + (b.allocated_k || 0), 0),
      spent_k: be.reduce((s, b) => s + (b.spent_k || 0), 0),
    };
  }
  return inputs;
}

/**
 * Calcule le score détaillé d'un marché selon la formule officielle ExpansionOS.
 * Toutes les composantes manquantes valent 0 (et non "ignorées") pour refléter
 * un marché sous-piloté.
 */
export function computeMarketScoreDetailed(c: CountryData, inputs: ScoreInputs = {}): ScoreBreakdown {
  // 1. Checklist : progression marché
  const checklist = clamp(c.pct ?? 0);

  // 2. Jalons complétés
  const ms = inputs.milestones ?? [];
  const milestones = ms.length === 0 ? 0 : clamp((ms.filter(m => m.is_done).length / ms.length) * 100);

  // 3. KPIs verts (≥ 80% cible)
  let kpis = 0;
  if (inputs.kpis && inputs.kpis.length > 0) {
    const greens = inputs.kpis.filter(k => k.target > 0 && k.value / k.target >= 0.8).length;
    kpis = clamp((greens / inputs.kpis.length) * 100);
  } else {
    // Fallback sur les snapshots de pays si aucun KPI structuré
    const fallback = [
      ratio(parseNumeric(c.kpi_ca), 1_000_000),
      ratio(parseNumeric(c.kpi_clients), 500),
      ratio(parseNumeric(c.kpi_nps), 100),
      ratio(parseNumeric(c.kpi_retention), 100),
    ].filter((v): v is number => v !== null);
    kpis = fallback.length === 0 ? 0 : clamp((fallback.reduce((a, b) => a + b, 0) / fallback.length) * 100);
  }

  // 4. Exposition risque (100 = pas de risque)
  const rs = inputs.risks;
  let exposure: number;
  if (rs) {
    // données de risques chargées : aucun risque = aucune exposition
    const weight = (lvl: string) => (lvl === 'high' ? 30 : lvl === 'medium' ? 15 : 5);
    exposure = clamp(rs.reduce((acc, r) => acc + weight(r.level), 0));
  } else {
    // Fallback : count brut de risques
    exposure = clamp((c.risk_count ?? 0) * 10);
  }
  const risksScore = 100 - exposure;

  // 5. Respect du budget : 100 si dépensé == alloué (à date), pénalité au-delà
  let budget = 100;
  if (inputs.budget && inputs.budget.allocated_k > 0) {
    const deviation = Math.abs(inputs.budget.spent_k - inputs.budget.allocated_k) / inputs.budget.allocated_k;
    budget = clamp(100 - deviation * 100);
  }

  const score = Math.round(
    0.25 * checklist + 0.20 * milestones + 0.25 * kpis + 0.20 * risksScore + 0.10 * budget,
  );

  return {
    score: clamp(score),
    checklist: Math.round(checklist),
    milestones: Math.round(milestones),
    kpis: Math.round(kpis),
    risks: Math.round(risksScore),
    budget: Math.round(budget),
  };
}

/**
 * Variante simplifiée — conserve la signature historique pour les composants existants.
 */
export function computeMarketScore(c: CountryData, inputs: ScoreInputs = {}): number {
  return computeMarketScoreDetailed(c, inputs).score;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function ratio(val: number | null, max: number): number | null {
  if (val === null) return null;
  return Math.max(0, Math.min(val / max, 1));
}

export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-[hsl(var(--sage))]';
  if (score >= 50) return 'text-[hsl(var(--gold))]';
  return 'text-[hsl(var(--coral))]';
}

export function getScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Bon';
  if (score >= 25) return 'Moyen';
  return 'Faible';
}
