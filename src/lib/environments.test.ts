import { describe, it, expect } from 'vitest';
import { ENVIRONMENTS, allowedEnvs, defaultEnv, envForPath } from './environments';

describe('environnements', () => {
  it('quatre environnements, chemins sans doublon', () => {
    expect(ENVIRONMENTS.map(e => e.id)).toEqual(['expansion', 'tc', 'finance', 'reporting']);
    const paths = ENVIRONMENTS.flatMap(e => e.nav.flatMap(g => g.items.map(i => i.path)));
    expect(new Set(paths).size).toBe(paths.length);
    for (const e of ENVIRONMENTS) for (const p of e.nav.flatMap(g => g.items.map(i => i.path))) expect(envForPath(p), p).toBe(e.id);
  });
  it('URL → environnement ; pages communes hors environnement', () => {
    expect(envForPath('/app/tc/ventes')).toBe('tc');
    expect(envForPath('/app/reporting/1234')).toBe('reporting');
    expect(envForPath('/app/countries/bf')).toBe('expansion');
    expect(envForPath('/app/comments')).toBeNull();
  });
  it('accès par rôle', () => {
    expect(allowedEnvs('admin').length).toBe(4);
    expect(allowedEnvs('sales_rep').map(e => e.id)).toEqual(['tc', 'reporting']);
    expect(allowedEnvs('raf').map(e => e.id)).toEqual(['tc', 'finance', 'reporting']);
    expect(allowedEnvs('partner').map(e => e.id)).toEqual(['expansion']);
    expect(allowedEnvs(null)).toEqual([]);
  });
  it('environnement d’arrivée', () => {
    expect(defaultEnv('sales_rep', null)?.id).toBe('tc');
    expect(defaultEnv('raf', null)?.id).toBe('finance');
    expect(defaultEnv('raf', 'reporting')?.id).toBe('reporting');
    expect(defaultEnv('sales_rep', 'finance')?.id).toBe('tc'); // dernier environnement non autorisé ignoré
    expect(defaultEnv('admin', null)?.id).toBe('expansion');
  });
});
