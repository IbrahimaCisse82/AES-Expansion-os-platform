import { describe, it, expect } from 'vitest';
import { formatDateFr } from './dates';

describe('formatDateFr', () => {
  it('formate une date ISO en français', () => {
    expect(formatDateFr('2025-07-30')).toBe('30 juil. 2025');
    expect(formatDateFr('2026-01-01')).toBe('1 janv. 2026');
  });
  it('ignore l’heure éventuelle', () => {
    expect(formatDateFr('2025-12-20T23:30:00Z')).toBe('20 déc. 2025');
  });
  it('renvoie les valeurs non ISO telles quelles et vide pour null', () => {
    expect(formatDateFr('Mars 2025')).toBe('Mars 2025');
    expect(formatDateFr(null)).toBe('');
    expect(formatDateFr('')).toBe('');
  });
});
