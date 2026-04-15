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

function parseNumeric(val: string | null): number | null {
  if (!val || val === 'N/A') return null;
  const n = parseFloat(val.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function computeMarketScore(c: CountryData): number {
  let score = 0;
  let weights = 0;

  // Progression (25%)
  score += (c.pct / 100) * 25;
  weights += 25;

  // Phase advancement (15%)
  score += (c.phase / 4) * 15;
  weights += 15;

  // Team deployed (10%)
  const teamScore = Math.min(c.team_size / 10, 1) * 10;
  score += teamScore;
  weights += 10;

  // Low risk (15%) — inverse: fewer risks = higher score
  const riskScore = Math.max(0, 1 - c.risk_count / 10) * 15;
  score += riskScore;
  weights += 15;

  // KPI performance (35% total)
  const kpiMetrics = [
    { val: parseNumeric(c.kpi_ca), weight: 10, max: 1000000 },
    { val: parseNumeric(c.kpi_clients), weight: 10, max: 500 },
    { val: parseNumeric(c.kpi_nps), weight: 8, max: 100 },
    { val: parseNumeric(c.kpi_retention), weight: 7, max: 100 },
  ];

  for (const m of kpiMetrics) {
    if (m.val !== null) {
      score += Math.min(m.val / m.max, 1) * m.weight;
    }
    weights += m.weight;
  }

  return weights > 0 ? Math.round((score / weights) * 100) : 0;
}

export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-accent';
  if (score >= 50) return 'text-[hsl(var(--sky))]';
  if (score >= 25) return 'text-[hsl(var(--gold))]';
  return 'text-destructive';
}

export function getScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Bon';
  if (score >= 25) return 'Moyen';
  return 'Faible';
}
