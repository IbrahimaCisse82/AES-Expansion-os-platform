import { describe, it, expect } from 'vitest';
import { parseEurAmount, withFcfaEquivalent, EUR_TO_FCFA } from './eurToFcfa';

describe('parseEurAmount', () => {
  it('parses millions', () => {
    expect(parseEurAmount('150 millions EUR')).toBe(150_000_000);
  });
  it('parses milliards', () => {
    expect(parseEurAmount('1.5 milliard EUR')).toBe(1_500_000_000);
  });
  it('parses decimals with comma', () => {
    expect(parseEurAmount('98,3 millions EUR')).toBe(98_300_000);
  });
  it('parses bare EUR', () => {
    expect(parseEurAmount('2500 EUR')).toBe(2500);
  });
  it('returns null when no EUR amount', () => {
    expect(parseEurAmount('Pas de montant ici')).toBeNull();
  });
});

describe('withFcfaEquivalent', () => {
  it('appends FCFA equivalent', () => {
    const out = withFcfaEquivalent('100 millions EUR');
    expect(out).toContain('100 millions EUR');
    expect(out).toContain('FCFA');
  });
  it('uses the official peg rate', () => {
    expect(EUR_TO_FCFA).toBeCloseTo(655.957, 3);
  });
  it('passes through when no EUR detected', () => {
    expect(withFcfaEquivalent('Texte sans montant')).toBe('Texte sans montant');
  });
});