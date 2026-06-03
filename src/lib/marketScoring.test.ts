import { describe, it, expect } from 'vitest';
import { computeMarketScoreDetailed, getScoreLabel } from './marketScoring';

const baseCountry = {
  pct: 0,
  risk_count: 0,
  team_size: 0,
  kpi_ca: null,
  kpi_clients: null,
  kpi_nps: null,
  kpi_retention: null,
  population: null,
  gdp: null,
  phase: 1,
};

describe('computeMarketScoreDetailed', () => {
  it('returns 0 components when nothing tracked', () => {
    const r = computeMarketScoreDetailed(baseCountry);
    expect(r.checklist).toBe(0);
    expect(r.milestones).toBe(0);
    expect(r.kpis).toBe(0);
    expect(r.risks).toBe(100); // 100 - 0 exposure
    expect(r.budget).toBe(100); // no budget = full mark
  });

  it('rewards completed milestones', () => {
    const r = computeMarketScoreDetailed(baseCountry, {
      milestones: [{ is_done: true }, { is_done: true }, { is_done: false }, { is_done: false }],
    });
    expect(r.milestones).toBe(50);
  });

  it('counts only green KPIs (>= 80% target)', () => {
    const r = computeMarketScoreDetailed(baseCountry, {
      kpis: [
        { value: 100, target: 100 }, // green
        { value: 80, target: 100 },  // green
        { value: 40, target: 100 },  // red
        { value: 50, target: 100 },  // red
      ],
    });
    expect(r.kpis).toBe(50);
  });

  it('penalises high-risk exposure', () => {
    const r = computeMarketScoreDetailed(baseCountry, {
      risks: [{ level: 'high' }, { level: 'high' }, { level: 'high' }, { level: 'high' }],
    });
    // 4 × 30 = 120 → clamped 100 → risksScore = 0
    expect(r.risks).toBe(0);
  });

  it('penalises budget deviation', () => {
    const r = computeMarketScoreDetailed(baseCountry, {
      budget: { allocated_k: 1_000_000, spent_k: 1_500_000 }, // 50% over
    });
    expect(r.budget).toBe(50);
  });

  it('clamps the final score 0-100', () => {
    const r = computeMarketScoreDetailed({ ...baseCountry, pct: 100 }, {
      milestones: [{ is_done: true }],
      kpis: [{ value: 200, target: 100 }],
      risks: [],
      budget: { allocated_k: 100, spent_k: 100 },
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBe(100);
  });
});

describe('getScoreLabel', () => {
  it('labels scores by tier', () => {
    expect(getScoreLabel(90)).toBe('Excellent');
    expect(getScoreLabel(60)).toBe('Bon');
    expect(getScoreLabel(30)).toBe('Moyen');
    expect(getScoreLabel(10)).toBe('Faible');
  });
});