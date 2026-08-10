import { describe, it, expect } from 'vitest';
import { validateActualInput, validateRowTotal, MAX_AMOUNT_FCFA } from './actualsValidation';

const base = { monthIndex: 0, fiscalYear: 2020, budgetValue: 0 };

describe('validations de la saisie du réalisé (§5.9.3)', () => {
  it('1. format : refuse les caractères non numériques', () => {
    expect(validateActualInput({ ...base, raw: '12a4' }).issues[0].level).toBe('error');
  });
  it('1bis. format : accepte la virgule décimale et les espaces', () => {
    expect(validateActualInput({ ...base, raw: '1 250,50' }).value).toBe(1250.5);
  });
  it('2. signe : refuse les montants négatifs', () => {
    const r = validateActualInput({ ...base, raw: '-100' });
    expect(r.issues.some(i => i.level === 'error')).toBe(true);
  });
  it('3. plafond : bloque au-delà de 10^12 FCFA', () => {
    const r = validateActualInput({ ...base, raw: String(MAX_AMOUNT_FCFA) });
    expect(r.issues.some(i => i.level === 'error')).toBe(true);
  });
  it('4. période : refuse un mois postérieur au mois courant', () => {
    const y = new Date().getFullYear() + 1;
    const r = validateActualInput({ raw: '100', monthIndex: 0, fiscalYear: y, budgetValue: 0 });
    expect(r.issues.some(i => i.level === 'error')).toBe(true);
  });
  it('5. cohérence des totaux : divergence bloquante', () => {
    expect(validateRowTotal([10, 10, 10], 40)[0].level).toBe('error');
    expect(validateRowTotal([10, 10, 10], 30)).toHaveLength(0);
  });
  it('6. écart significatif > 20 % : avertissement non bloquant', () => {
    const r = validateActualInput({ ...base, raw: '130', budgetValue: 100 });
    expect(r.issues.some(i => i.level === 'warning')).toBe(true);
    expect(r.issues.some(i => i.level === 'error')).toBe(false);
    expect(validateActualInput({ ...base, raw: '110', budgetValue: 100 }).issues).toHaveLength(0);
  });
});
