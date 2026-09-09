import { describe, it, expect } from 'vitest';
import {
  applyFilters, computeTotals, rollupBy, monthlySeries, marginByProject, buildReport,
  emptyFilters, formatFcfa, formatCompact,
  type BiFact, type BiActivity,
} from './biAggregate';

const m = (...vals: number[]) => vals.concat(Array(12 - vals.length).fill(0));

const facts: BiFact[] = [
  { id: '1', scenario_id: 's1', country_id: 'BF', country_label: 'Burkina Faso', pole_id: 'p1', pole_code: 'COMM', pole_label: 'Commercial', project_id: 'pr1', project_name: 'Projet A', category_id: 'c1', category_name: 'Ventes', category_type: 'revenue', line_type: 'budget', months: m(1000, 1000) },
  { id: '2', scenario_id: 's1', country_id: 'BF', country_label: 'Burkina Faso', pole_id: 'p1', pole_code: 'COMM', pole_label: 'Commercial', project_id: 'pr1', project_name: 'Projet A', category_id: 'c1', category_name: 'Ventes', category_type: 'revenue', line_type: 'actual', months: m(800, 900) },
  { id: '3', scenario_id: 's1', country_id: 'CI', country_label: 'Côte d\u2019Ivoire', pole_id: 'p2', pole_code: 'TECH', pole_label: 'Technique', project_id: null, project_name: null, category_id: 'c2', category_name: 'Salaires', category_type: 'expense', line_type: 'budget', months: m(500, 500) },
];

describe('applyFilters', () => {
  it('filtre par pays', () => {
    expect(applyFilters(facts, { ...emptyFilters(), countryId: 'BF' })).toHaveLength(2);
  });
  it('filtre par pôle', () => {
    expect(applyFilters(facts, { ...emptyFilters(), poleId: 'p2' })).toHaveLength(1);
  });
});

describe('computeTotals', () => {
  it('calcule budget/réalisé/écart sur la période M1-M2', () => {
    const t = computeTotals(facts, { ...emptyFilters(), monthTo: 2 });
    expect(t.budget).toBe(3000);
    expect(t.actual).toBe(1700);
    expect(t.variance).toBe(-1300);
    expect(t.pct).toBeCloseTo(56.67, 1);
    expect(t.revenue).toBe(2000);
    expect(t.expense).toBe(1000);
    expect(t.result).toBe(1000);
  });
  it('pct vaut 0 sans budget', () => {
    expect(computeTotals([], emptyFilters()).pct).toBe(0);
  });
});

describe('rollupBy', () => {
  it('agrège par pays', () => {
    const rows = rollupBy(facts, 'country', { ...emptyFilters(), monthTo: 2 });
    expect(rows.map(r => r.label)).toContain('Burkina Faso');
    const bf = rows.find(r => r.key === 'BF');
    expect(bf?.budget).toBe(2000);
    expect(bf?.actual).toBe(1700);
  });
  it('regroupe les lignes sans projet sous Non affecté', () => {
    const rows = rollupBy(facts, 'project', { ...emptyFilters(), monthTo: 2 });
    expect(rows.find(r => r.key === 'none')?.label).toBe('Non affecté');
  });
});

describe('monthlySeries', () => {
  it('produit un point par mois de la période', () => {
    const s = monthlySeries(facts, { ...emptyFilters(), monthTo: 2 });
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ month: 'Jan', budget: 1500, actual: 800 });
  });
});

describe('marginByProject', () => {
  it('calcule la marge revenus - dépenses par projet', () => {
    const rows = marginByProject(facts, { ...emptyFilters(), monthTo: 2 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: 'Projet A', revenue: 2000, margin: 2000 });
  });
});

describe('buildReport', () => {
  it('mesure budget par catégorie', () => {
    const rows = buildReport(facts, [], { dimension: 'category', measure: 'budget', chart: 'bar' }, { ...emptyFilters(), monthTo: 2 });
    expect(rows.find(r => r.label === 'Ventes')?.value).toBe(2000);
  });
  it('mesure variancePct', () => {
    const rows = buildReport(facts, [], { dimension: 'pole', measure: 'variancePct', chart: 'table' }, { ...emptyFilters(), monthTo: 2 });
    expect(rows.find(r => r.label === 'Commercial')?.value).toBeCloseTo(-15, 0);
  });
  it('compte les tâches par pays', () => {
    const activity: BiActivity[] = [
      { id: 'a', item_type: 'task', country_id: 'BF', project_id: null, status: 'open' },
      { id: 'b', item_type: 'risk', country_id: 'BF', project_id: null, status: 'open' },
    ];
    const rows = buildReport([], activity, { dimension: 'country', measure: 'risks', chart: 'bar' }, emptyFilters());
    expect(rows).toEqual([{ label: 'BF', value: 1 }]);
  });
});

describe('formatage', () => {
  it('formatFcfa', () => expect(formatFcfa(1234567)).toContain('FCFA'));
  it('formatCompact', () => {
    expect(formatCompact(2500000)).toBe('2.5M');
    expect(formatCompact(1500)).toBe('2K');
    expect(formatCompact(500)).toBe('500');
  });
});
