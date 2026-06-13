import { describe, it, expect } from 'vitest';
import { calculateMonthlyDepreciation, type CapExItem } from './useBudgetConsolidation';

const makeItem = (o: Partial<CapExItem> = {}): CapExItem => ({
  id: 'i1', scenario_id: 's1', name: 'Machine', country_id: null, country_label: 'BF',
  category_id: null,
  acquisition_date: '2026-01-15',
  acquisition_cost: 12000,
  useful_life_months: 12,
  depreciation_method: 'linear',
  salvage_value: 0,
  notes: '',
  created_at: '', updated_at: '',
  ...o,
});

describe('calculateMonthlyDepreciation', () => {
  it('amortit linéairement sur 12 mois depuis janvier', () => {
    const months = calculateMonthlyDepreciation(makeItem());
    expect(months).toHaveLength(12);
    expect(months[0]).toBe(1000);
    expect(months[11]).toBe(1000);
    expect(months.reduce((s, v) => s + v, 0)).toBeCloseTo(12000, 2);
  });

  it('soustrait la valeur résiduelle', () => {
    const months = calculateMonthlyDepreciation(makeItem({ acquisition_cost: 10000, salvage_value: 2000, useful_life_months: 8 }));
    // (10000 - 2000) / 8 = 1000 per month, 8 months from Jan
    expect(months.slice(0, 8).every((m) => m === 1000)).toBe(true);
    expect(months.slice(8).every((m) => m === 0)).toBe(true);
  });

  it('démarre l\'amortissement au mois d\'acquisition', () => {
    const months = calculateMonthlyDepreciation(makeItem({ acquisition_date: '2026-07-01', useful_life_months: 6 }));
    expect(months[0]).toBe(0);
    expect(months[6]).toBeGreaterThan(0);
    expect(months[11]).toBeGreaterThan(0);
  });

  it('gère useful_life_months = 0 sans crash', () => {
    const months = calculateMonthlyDepreciation(makeItem({ useful_life_months: 0 }));
    expect(months).toHaveLength(12);
  });
});