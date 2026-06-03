import { describe, it, expect } from 'vitest';
import { getLineTotal, MONTH_KEYS, MONTHS, type BudgetLine } from './useBudgetData';

const makeLine = (overrides: Partial<BudgetLine> = {}): BudgetLine => ({
  id: 'l1', scenario_id: 's1', category_id: 'c1', country_id: null, country_label: 'BF',
  line_type: 'budget',
  m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
  notes: '', created_at: '', updated_at: '',
  ...overrides,
});

describe('getLineTotal', () => {
  it('sums all twelve months', () => {
    const line = makeLine({ m1: 100, m2: 200, m12: 700 });
    expect(getLineTotal(line)).toBe(1000);
  });
  it('returns 0 for an empty line', () => {
    expect(getLineTotal(makeLine())).toBe(0);
  });
  it('handles negative values', () => {
    expect(getLineTotal(makeLine({ m1: 500, m2: -200 }))).toBe(300);
  });
});

describe('budget month constants', () => {
  it('exposes 12 months and 12 keys aligned', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTH_KEYS).toHaveLength(12);
    expect(MONTH_KEYS[0]).toBe('m1');
    expect(MONTH_KEYS[11]).toBe('m12');
  });
});