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
  if (!val || val === 'N/A') return null;
  const n = parseFloat(val.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
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
  const milestones = ms.length === 0 ? 0 : (ms.filter(m => m.is_done).length / ms.length) * 100;

  // 3. KPIs verts (≥ 80% cible)
  let kpis = 0;
  if (inputs.kpis && inputs.kpis.length > 0) {
    const greens = inputs.kpis.filter(k => k.target > 0 && k.value / k.target >= 0.8).length;
    kpis = (greens / inputs.kpis.length) * 100;
  } else {
    // Fallback sur les snapshots de pays si aucun KPI structuré
    const fallback = [
      ratio(parseNumeric(c.kpi_ca), 1_000_000),
      ratio(parseNumeric(c.kpi_clients), 500),
      ratio(parseNumeric(c.kpi_nps), 100),
      ratio(parseNumeric(c.kpi_retention), 100),
    ].filter((v): v is number => v !== null);
    kpis = fallback.length === 0 ? 0 : (fallback.reduce((a, b) => a + b, 0) / fallback.length) * 100;
  }

  // 4. Exposition risque (100 = pas de risque)
  const rs = inputs.risks;
  let exposure: number;
  if (rs && rs.length > 0) {
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
  return Math.min(val / max, 1);
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
