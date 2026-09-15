import { describe, it, expect } from 'vitest';
import { canAccessBi } from '../biAccess';

describe('canAccessBi', () => {
  it('autorise les profils habilités', () => {
    for (const role of ['admin', 'director', 'country_manager', 'dhr', 'technical_director', 'commercial_director', 'analyst', 'raf']) {
      expect(canAccessBi(role)).toBe(true);
    }
  });

  it('refuse partner et observer', () => {
    expect(canAccessBi('partner')).toBe(false);
    expect(canAccessBi('observer')).toBe(false);
  });

  it('refuse par défaut un rôle inconnu ou absent', () => {
    expect(canAccessBi(null)).toBe(false);
    expect(canAccessBi(undefined)).toBe(false);
    expect(canAccessBi('unknown')).toBe(false);
  });
});
