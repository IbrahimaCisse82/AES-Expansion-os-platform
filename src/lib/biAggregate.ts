// Agrégations BI : roll-up global → pays → pôle → projet → catégorie (FCFA)

export const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface BiFact {
  id: string;
  scenario_id: string;
  country_id: string | null;
  country_label: string | null;
  pole_id: string | null;
  pole_code: string | null;
  pole_label: string | null;
  project_id: string | null;
  project_name: string | null;
  category_id: string | null;
  category_name: string | null;
  category_type: string | null;
  line_type: string; // 'budget' | 'actual'
  months: number[]; // 12 valeurs m1..m12
}

export interface BiActivity {
  id: string;
  item_type: 'task' | 'risk';
  country_id: string | null;
  project_id: string | null;
  status: string;
}

export interface BiFilters {
  countryId: string | null;
  poleId: string | null;
  projectId: string | null;
  scenarioId: string | null;
  monthFrom: number; // 1..12
  monthTo: number;
}

export const emptyFilters = (): BiFilters => ({
  countryId: null, poleId: null, projectId: null, scenarioId: null, monthFrom: 1, monthTo: 12,
});

export function applyFilters(facts: BiFact[], f: BiFilters): BiFact[] {
  return facts.filter(x =>
    (!f.countryId || x.country_id === f.countryId) &&
    (!f.poleId || x.pole_id === f.poleId) &&
    (!f.projectId || x.project_id === f.projectId) &&
    (!f.scenarioId || x.scenario_id === f.scenarioId),
  );
}

export function applyActivityFilters(items: BiActivity[], f: BiFilters): BiActivity[] {
  return items.filter(x =>
    (!f.countryId || x.country_id === f.countryId) &&
    (!f.projectId || x.project_id === f.projectId),
  );
}

function sumMonths(facts: BiFact[], lineType: string, f: BiFilters): number {
  let s = 0;
  for (const x of facts) {
    if (x.line_type !== lineType) continue;
    for (let m = f.monthFrom; m <= f.monthTo; m++) s += x.months[m - 1] || 0;
  }
  return s;
}

export interface BiTotals {
  budget: number;
  actual: number;
  variance: number;   // actual - budget
  pct: number;        // actual / budget * 100 (0 si budget 0)
  revenue: number;    // budget revenus
  expense: number;    // budget dépenses
  result: number;     // revenus - dépenses (budget)
}

export function computeTotals(facts: BiFact[], f: BiFilters): BiTotals {
  const scoped = applyFilters(facts, f);
  const budget = sumMonths(scoped, 'budget', f);
  const actual = sumMonths(scoped, 'actual', f);
  let revenue = 0;
  let expense = 0;
  for (const x of scoped) {
    if (x.line_type !== 'budget') continue;
    for (let m = f.monthFrom; m <= f.monthTo; m++) {
      const v = x.months[m - 1] || 0;
      if (x.category_type === 'revenue') revenue += v; else expense += v;
    }
  }
  return {
    budget, actual, variance: actual - budget,
    pct: budget > 0 ? (actual / budget) * 100 : 0,
    revenue, expense, result: revenue - expense,
  };
}

// Roll-up par dimension
export type BiDimension = 'country' | 'pole' | 'project' | 'category';

export interface BiRollupRow {
  key: string;
  label: string;
  budget: number;
  actual: number;
  variance: number;
  pct: number;
}

const dimGetter: Record<BiDimension, (x: BiFact) => { key: string; label: string }> = {
  country: x => ({ key: x.country_id ?? 'none', label: x.country_label ?? 'Non affecté' }),
  pole: x => ({ key: x.pole_id ?? 'none', label: x.pole_label ?? 'Non affecté' }),
  project: x => ({ key: x.project_id ?? 'none', label: x.project_name ?? 'Non affecté' }),
  category: x => ({ key: x.category_id ?? 'none', label: x.category_name ?? 'Non catégorisé' }),
};

export function rollupBy(facts: BiFact[], dim: BiDimension, f: BiFilters): BiRollupRow[] {
  const scoped = applyFilters(facts, f);
  const map = new Map<string, BiRollupRow>();
  for (const x of scoped) {
    const { key, label } = dimGetter[dim](x);
    let row = map.get(key);
    if (!row) { row = { key, label, budget: 0, actual: 0, variance: 0, pct: 0 }; map.set(key, row); }
    if (x.line_type !== 'budget' && x.line_type !== 'actual') continue;
    for (let m = f.monthFrom; m <= f.monthTo; m++) {
      if (x.line_type === 'budget') row.budget += x.months[m - 1] || 0;
      else row.actual += x.months[m - 1] || 0;
    }
  }
  const rows = [...map.values()];
  for (const r of rows) { r.variance = r.actual - r.budget; r.pct = r.budget > 0 ? (r.actual / r.budget) * 100 : 0; }
  return rows.sort((a, b) => b.budget - a.budget);
}

// Série mensuelle budget vs réalisé
export interface BiMonthPoint { month: string; budget: number; actual: number; variance: number; }

export function monthlySeries(facts: BiFact[], f: BiFilters): BiMonthPoint[] {
  const scoped = applyFilters(facts, f);
  const out: BiMonthPoint[] = [];
  for (let m = f.monthFrom; m <= f.monthTo; m++) {
    let budget = 0; let actual = 0;
    for (const x of scoped) {
      const v = x.months[m - 1] || 0;
      if (x.line_type === 'budget') budget += v;
      else if (x.line_type === 'actual') actual += v;
    }
    out.push({ month: MONTH_LABELS[m - 1], budget, actual, variance: actual - budget });
  }
  return out;
}

// Marge par projet (revenus - dépenses sur lignes budgétaires)
export interface ProjectMargin { projectId: string; label: string; revenue: number; expense: number; margin: number; }

export function marginByProject(facts: BiFact[], f: BiFilters): ProjectMargin[] {
  const scoped = applyFilters(facts, f).filter(x => x.line_type === 'budget' && x.project_id);
  const map = new Map<string, ProjectMargin>();
  for (const x of scoped) {
    const id = x.project_id as string;
    let row = map.get(id);
    if (!row) { row = { projectId: id, label: x.project_name ?? 'Sans nom', revenue: 0, expense: 0, margin: 0 }; map.set(id, row); }
    for (let m = f.monthFrom; m <= f.monthTo; m++) {
      const v = x.months[m - 1] || 0;
      if (x.category_type === 'revenue') row.revenue += v; else row.expense += v;
    }
  }
  const rows = [...map.values()];
  for (const r of rows) r.margin = r.revenue - r.expense;
  return rows.sort((a, b) => b.margin - a.margin);
}

// Constructeur de rapports
export type ReportDimension = BiDimension | 'month' | 'lineType';
export type ReportMeasure = 'budget' | 'actual' | 'variance' | 'variancePct' | 'margin' | 'tasks' | 'risks';

export interface ReportConfig {
  dimension: ReportDimension;
  measure: ReportMeasure;
  chart: 'table' | 'bar' | 'line' | 'area';
}

export interface ReportRow { label: string; value: number; }

export function buildReport(facts: BiFact[], activity: BiActivity[], cfg: ReportConfig, f: BiFilters): ReportRow[] {
  if (cfg.measure === 'tasks' || cfg.measure === 'risks') {
    const items = applyActivityFilters(activity, f).filter(a => a.item_type === (cfg.measure === 'tasks' ? 'task' : 'risk'));
    const map = new Map<string, number>();
    for (const a of items) {
      const label = cfg.dimension === 'project'
        ? (a.project_id ? (facts.find(x => x.project_id === a.project_id)?.project_name ?? 'Projet') : 'Non affecté')
        : (a.country_id ?? 'Non affecté');
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((x, y) => y.value - x.value);
  }
  const scoped = applyFilters(facts, f);
  const buckets = new Map<string, { budget: number; actual: number; revenue: number; expense: number }>();
  const keyOf = (x: BiFact, m: number): string => {
    switch (cfg.dimension) {
      case 'country': return x.country_label ?? 'Non affecté';
      case 'pole': return x.pole_label ?? 'Non affecté';
      case 'project': return x.project_name ?? 'Non affecté';
      case 'category': return x.category_name ?? 'Non catégorisé';
      case 'month': return MONTH_LABELS[m - 1];
      case 'lineType': return x.line_type === 'budget' ? 'Budget' : 'Réalisé';
    }
  };
  for (const x of scoped) {
    for (let m = f.monthFrom; m <= f.monthTo; m++) {
      const label = cfg.dimension === 'lineType' ? keyOf(x, m) : keyOf(x, m);
      let b = buckets.get(label);
      if (!b) { b = { budget: 0, actual: 0, revenue: 0, expense: 0 }; buckets.set(label, b); }
      const v = x.months[m - 1] || 0;
      if (x.line_type === 'budget') {
        b.budget += v;
        if (x.category_type === 'revenue') b.revenue += v; else b.expense += v;
      } else if (x.line_type === 'actual') {
        b.actual += v;
      }
    }
  }
  const rows: ReportRow[] = [...buckets.entries()].map(([label, b]) => {
    switch (cfg.measure) {
      case 'budget': return { label, value: b.budget };
      case 'actual': return { label, value: b.actual };
      case 'variance': return { label, value: b.actual - b.budget };
      case 'variancePct': return { label, value: b.budget > 0 ? ((b.actual - b.budget) / b.budget) * 100 : 0 };
      case 'margin': return { label, value: b.revenue - b.expense };
      default: return { label, value: b.budget };
    }
  });
  return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function formatFcfa(v: number): string {
  return `${Math.round(v).toLocaleString('fr-FR')} FCFA`;
}

export function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${Math.round(v)}`;
}
