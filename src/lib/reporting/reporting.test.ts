import { describe, it, expect } from 'vitest';
import { REPORT_TEMPLATES, type TableRow, computeCell, defaultPeriod, emptyData, hotAverage, periodLabel, periodRange, weightedEvaluation } from './templates';
import { A4_PNL_MAP, mergePrefill, prefill } from './prefill';
import { computeSale } from '@/lib/tc/sales';
import { computeKits } from '@/lib/tc/kits';
import { DEFAULT_SETTINGS, type TcSale } from '@/lib/tc/types';
import { treasury } from '@/lib/fin/engine';

describe('modèles A1–A12', () => {
  it('les 12 rapports du classeur sont présents, avec des clés uniques', () => {
    expect(REPORT_TEMPLATES.map(t => t.code)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12']);
    for (const t of REPORT_TEMPLATES) {
      const keys = t.sections.flatMap(s => (s.kind === 'fields' ? s.fields.map(f => f.key) : [s.key]));
      expect(new Set(keys).size, t.code).toBe(keys.length);
      for (const s of t.sections) if (s.kind === 'table') expect(s.columns[0].key === 'label' || s.columns.some(c => c.key === 'label'), `${t.code}.${s.key}`).toBe(true);
    }
  });
  it('les lignes prédéfinies reprennent le classeur', () => {
    const a2 = emptyData(REPORT_TEMPLATES[1]);
    expect((a2.kpis as { label: string }[]).map(r => r.label)).toContain('Délai moyen de vente (jours)');
    const a4 = REPORT_TEMPLATES.find(t => t.code === 'A4')!;
    const pnlRows = a4.sections.find(s => s.kind === 'table' && s.key === 'pnl');
    // chaque rubrique alimentée par la finance existe bien dans le modèle
    for (const label of Object.keys(A4_PNL_MAP)) expect(pnlRows && pnlRows.kind === 'table' && pnlRows.rows?.includes(label), label).toBe(true);
  });
  it('colonnes calculées', () => {
    expect(computeCell('attainment', { target: 200, actual: 150 })).toBe(0.75);
    expect(computeCell('gap', { target: 200, actual: 150 })).toBe(-50);
    expect(computeCell('gapPct', { target: '200', actual: '250' })).toBe(0.25);
    expect(computeCell('attainment', { target: 0, actual: 5 })).toBeNull();
  });
  it('A6 : score pondéré par dimension (40/25/20/15)', () => {
    const rows: TableRow[] = [
      { label: '§ Dimension 1 — Performance & résultats (40 %)' }, { label: 'a', final: 4 }, { label: 'b', final: 4 },
      { label: '§ Dimension 2 — Compétences techniques (25 %)' }, { label: 'c', final: 2 },
      { label: '§ Dimension 3 — Comportements & valeurs (20 %)' }, { label: 'd', final: 3 },
      { label: '§ Dimension 4 — Initiative & innovation (15 %)' }, { label: 'e', manager: 1 },
    ];
    const r = weightedEvaluation(rows);
    expect(r.score).toBeCloseTo(4 * 0.4 + 2 * 0.25 + 3 * 0.2 + 1 * 0.15, 9);
    expect(r.level).toBe('3 — Satisfaisant');
  });
  it('A8 : moyenne des réponses à chaud', () => {
    expect(hotAverage({ n4: 2, n3: 2, n2: 0, n1: 0 })).toBe(3.5);
    expect(hotAverage({})).toBeNull();
  });
  it('périodes : semaine ISO, mois, trimestre', () => {
    expect(periodRange('2026-W43')).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(periodRange('2026-W01')).toEqual({ from: '2025-12-29', to: '2026-01-04' });
    expect(periodRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('2026-T4')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(defaultPeriod('week', new Date('2026-10-22T10:00:00Z'))).toBe('2026-W43');
    expect(defaultPeriod('quarter', new Date('2026-10-22T10:00:00Z'))).toBe('2026-T4');
    expect(periodLabel('2026-10')).toBe('octobre 2026');
  });
});

describe('pré-remplissage depuis la plateforme', () => {
  const data = {
    settings: DEFAULT_SETTINGS, solutions: [], labor: [], stock: [], supplierPrices: [], kitLabor: [],
    zones: [{ id: 'z', name: 'Kaya', distance_km: 100, sort_order: 0 }] as never[],
    teams: [{ id: 't', name: 'Équipe Nord', technicians: 2, hours_per_day: 8, working_days: 22, availability_rate: 1, sort_order: 0, active: true }],
    kits: [{ id: 'k', code: 'K', solution_code: 'LORENTZ', variant: 'PETIT', name: 'Pompe P', transport_cost: 0, sort_order: 0, active: true }],
    kitItems: [{ id: 'i1', kit_id: 'k', line_no: 1, designation: 'POMPE PS2', unit: 'u', quantity: 1 }, { id: 'i2', kit_id: 'k', line_no: 2, designation: 'PANNEAU 550', unit: 'u', quantity: 4 }],
    objectives: [{ id: 'o', team_id: 't', solution_code: 'LORENTZ', month: '2026-10-01', kits_target: 4, revenue_target: 4_000_000 }],
  };
  const kits = computeKits(data);
  const mk = (o: Partial<TcSale>): TcSale => ({ id: o.quote_no ?? 'x', quote_no: 'x', quote_date: '2026-10-01', team_id: 't', client: 'A', kit_id: 'k', quantity: 1, applied_price: 1_000_000, discount_rate: 0, lost: false, deposit_amount: 0, balance_amount: 0, ...o });
  const sales = [
    mk({ quote_no: 'D1', client: 'Coop Kaya', salesperson: 'Issa', zone_id: 'z', sale_date: '2026-10-20', planned_install_date: '2026-11-05', deposit_amount: 500_000, deposit_date: '2026-10-21' }),
    mk({ quote_no: 'D2', client: 'Hôtel Yako', salesperson: 'Issa', quote_date: '2026-10-14', probability: 0.6, applied_price: 2_000_000 }),
    mk({ quote_no: 'D3', client: 'Ferme', salesperson: 'Mariam', quote_date: '2026-10-02', lost: true }),
  ].map(s => computeSale(s, { kits, data: { ...data, sales: [] } as never, today: new Date('2026-10-30T00:00:00Z') }));
  const ctx = { tc: data as never, sales };

  it('A1 : CA signé, encaissements et objectif de la semaine', () => {
    const d = prefill('A1', { ...ctx, period: '2026-W43' });
    const kpis = d.kpis as Record<string, unknown>[];
    expect(kpis[0]).toMatchObject({ label: 'CA signé (FCFA)', actual: 1_000_000, target: Math.round(4_000_000 * 7 / 31) });
    expect(kpis[0].status).toBe('Vert');
    expect(kpis.find(k => k.label === 'Encaissements (FCFA)')?.actual).toBe(500_000);
  });

  it('A2 : tableau de bord, pipeline et performance par commercial', () => {
    const d = prefill('A2', { ...ctx, period: '2026-10' });
    const kpis = d.kpis as Record<string, Record<string, unknown>>;
    expect(kpis['CA réalisé (FCFA)']).toMatchObject({ target: 4_000_000, actual: 1_000_000, status: 'Rouge' });
    expect(kpis['Nombre de devis émis'].actual).toBe(3);
    expect(kpis['Taux de conversion (%)'].actual).toBeCloseTo(33.3, 1);
    expect(d.pipeline).toEqual([expect.objectContaining({ label: 'Hôtel Yako', value: 2_000_000, prob: 60, rep: 'Issa' })]);
    const reps = d.reps as Record<string, unknown>[];
    expect(reps.find(r => r.label === 'Issa')).toMatchObject({ quotes: 2, sales: 1, actual: 1_000_000 });
  });

  it('A4 : compte de résultat simplifié, trésorerie du mois et créances', () => {
    const pnlLines = [{ code: 'ca_pompage', section: 'PRODUITS', label: 'x', sort_order: 0 }, { code: 'pe_salaires', section: 'PERSONNEL', label: 'y', sort_order: 1 }];
    const t = treasury([{ code: 'enc_pompage', section: 'ENC', label: 'e', sort_order: 0 }, { code: 'dec_personnel', section: 'DEC', label: 'd', sort_order: 1 }],
      [{ line_code: 'enc_pompage', month: 10, amount: 500_000 }, { line_code: 'dec_personnel', month: 9, amount: 300_000 }, { line_code: 'dec_personnel', month: 10, amount: 300_000 }], 1_000_000, 800_000);
    const d = prefill('A4', { ...ctx, period: '2026-10', fin: { pnlLines, pnlValues: [{ line_code: 'ca_pompage', budget: 12_000_000, actual: 7_000_000 }, { line_code: 'pe_salaires', budget: 6_000_000, actual: 4_000_000 }], treasury: t, kpiValues: [] } });
    const pnl = d.pnl as Record<string, Record<string, unknown>>;
    expect(pnl['CA Pompage solaire']).toMatchObject({ budget_m: 1_000_000, month: 1_000_000, actual: 7_000_000, target: 10_000_000 });
    expect(pnl['RÉSULTAT NET']).toMatchObject({ actual: 3_000_000, target: 5_000_000 });
    const cash = d.cash as Record<string, Record<string, unknown>>;
    expect(cash['TOTAL MOIS']).toMatchObject({ open: 700_000, in_clients: 500_000, out_salaries: 300_000, close: 900_000 });
    expect((d.forecast as Record<string, Record<string, number>>)['Salaires & charges sociales'].m1).toBe(300_000);
    expect(d.receivables).toEqual([expect.objectContaining({ label: 'Coop Kaya', invoice: 'D1', amount: 1_180_000 - 500_000 })]);
  });

  it('A12 : fiche d’intervention depuis une vente (client, site, matériel)', () => {
    const d = prefill('A12', { ...ctx, period: '2026-11-05', saleId: 'D1' });
    expect(d).toMatchObject({ client: 'Coop Kaya', site: 'Kaya', date: '2026-11-05', type: 'Installation' });
    expect(d.materials).toEqual([{ label: 'POMPE PS2', qty: 1, origin: 'Stock' }, { label: 'PANNEAU 550', qty: 4, origin: 'Stock' }]);
  });

  it('fusion : ne remplace pas une saisie existante', () => {
    const current = { summary: 'déjà écrit', kpis: [{ label: 'CA réalisé (FCFA)', comment: 'ok' }], pipeline: [{ label: 'Prospect manuel', value: 10 }, {}] };
    const merged = mergePrefill('A2', current, prefill('A2', { ...ctx, period: '2026-10' }));
    expect(merged.summary).toBe('déjà écrit');
    expect((merged.kpis as Record<string, unknown>[])[0]).toMatchObject({ comment: 'ok', actual: 1_000_000 });
    expect((merged.pipeline as Record<string, unknown>[]).map(r => r.label)).toEqual(['Prospect manuel', 'Hôtel Yako']);
  });
});
