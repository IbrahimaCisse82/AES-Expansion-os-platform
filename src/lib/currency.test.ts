import { describe, it, expect } from 'vitest';
import { toFCFA, formatFCFA, formatFCFACompact, parseFCFA } from './currency';

const rates = [
  { currency_code: 'EUR', rate_to_fcfa: 655.957, effective_date: '2026-01-01' },
  { currency_code: 'USD', rate_to_fcfa: 600, effective_date: '2026-01-01' },
];

describe('toFCFA', () => {
  it('returns same amount when already in FCFA/XOF/XAF', () => {
    expect(toFCFA(1000, 'FCFA', rates)).toBe(1000);
    expect(toFCFA(1000, 'XOF', rates)).toBe(1000);
  });
  it('converts EUR using the latest rate', () => {
    expect(toFCFA(100, 'EUR', rates)).toBe(65596);
  });
  it('returns 0 for unknown currency', () => {
    expect(toFCFA(100, 'JPY', rates)).toBe(0);
  });
  it('handles non-finite input', () => {
    expect(toFCFA(Number.NaN, 'EUR', rates)).toBe(0);
  });
});

describe('formatFCFA', () => {
  it('formats with thin spaces and suffix', () => {
    expect(formatFCFA(1_250_000)).toMatch(/FCFA$/);
    expect(formatFCFA(null)).toBe('— FCFA');
  });
  it('handles negatives', () => {
    expect(formatFCFA(-1000)).toMatch(/^-/);
  });
});

describe('formatFCFACompact', () => {
  it('uses Md for billions', () => {
    expect(formatFCFACompact(2_500_000_000)).toMatch(/Md/);
  });
  it('uses M for millions', () => {
    expect(formatFCFACompact(3_400_000)).toMatch(/M/);
  });
  it('uses k for thousands', () => {
    expect(formatFCFACompact(5_000)).toMatch(/k/);
  });
});

describe('parseFCFA', () => {
  it('parses formatted strings', () => {
    expect(parseFCFA('1 250 000 FCFA')).toBe(1250000);
    expect(parseFCFA('500')).toBe(500);
    expect(parseFCFA('')).toBe(0);
  });
});