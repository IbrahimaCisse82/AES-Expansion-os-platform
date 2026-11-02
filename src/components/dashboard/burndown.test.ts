import { describe, it, expect } from 'vitest';
import { burndown } from './BurndownChart';

describe('burn-down des jalons', () => {
  it('prévu selon les échéances, restant avec les retards jusqu’au mois courant', () => {
    const ms = [
      { id: '1', is_done: true, created_at: '', country_id: 'bf', target_date: '2026-02-15' },
      { id: '2', is_done: false, created_at: '', country_id: 'bf', target_date: '2026-03-10' }, // en retard
      { id: '3', is_done: false, created_at: '', country_id: 'bf', target_date: '2026-06-30' },
    ];
    const d = burndown(ms, new Date('2026-04-15T00:00:00Z'));
    expect(d.map(x => x['Prévu'])).toEqual([2, 1, 1, 1, 0]);       // fév → juin
    expect(d.map(x => x['Restant'])).toEqual([2, 2, 2, undefined, undefined]);
    expect(burndown([])).toEqual([]);
  });
});
