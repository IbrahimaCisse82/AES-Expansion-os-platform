import { describe, it, expect } from 'vitest';
import { autoKpis, kpiAttainment, kpiStatus, pnl, poleGrid, spreadAnnual, treasury } from './engine';
import { computeSale } from '@/lib/tc/sales';
import { computeKits } from '@/lib/tc/kits';
import { DEFAULT_SETTINGS, type TcSale } from '@/lib/tc/types';

const accounts = [
  { id: 'g1', code: 'AES-1', name: 'Personnel', parent_id: null, sort_order: 1 },
  { id: 'a1', code: 'AES-1.1', name: 'Salaires', parent_id: 'g1', sort_order: 2 },
  { id: 'a2', code: 'AES-1.2', name: 'CNSS', parent_id: 'g1', sort_order: 3 },
  { id: 'g2', code: 'AES-2', name: 'Opérationnelles', parent_id: null, sort_order: 4 },
  { id: 'b1', code: 'AES-2.1', name: 'Carburant', parent_id: 'g2', sort_order: 5 },
];
const z = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
const lines = [
  { id: 'l1', category_id: 'a1', pole_id: 'COMM', line_type: 'budget', ...spreadAnnual(12_000_000) },
  { id: 'l2', category_id: 'a1', pole_id: 'COMM', line_type: 'actual', ...z, m1: 900_000, m2: 1_100_000 },
  { id: 'l3', category_id: 'b1', pole_id: 'TECH', line_type: 'budget', ...spreadAnnual(1_000_000) },
  { id: 'l4', category_id: 'b1', pole_id: 'TECH', line_type: 'actual', ...z, m1: 400_000 },
];

describe('budgets par pôle', () => {
  it('répartition annuelle exacte, proportionnelle si déjà répartie', () => {
    const s = spreadAnnual(1_000_000);
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBe(1_000_000);
    const p = spreadAnnual(2_400, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100]);
    expect(p.m12).toBe(2_400);
    expect(p.m1).toBe(0);
  });

  it('grille d’un pôle : sous-totaux, écart, taux d’exécution', () => {
    const { rows, total } = poleGrid(accounts, lines, 'COMM');
    const salaires = rows.find(r => r.account.id === 'a1')!;
    expect(salaires.budget).toBe(12_000_000);
    expect(salaires.actual).toBe(2_000_000);
    expect(salaires.variance).toBe(10_000_000);
    expect(salaires.rate).toBeCloseTo(2 / 12, 9);
    expect(salaires.budgetLineId).toBe('l1');
    expect(rows.find(r => r.account.id === 'g1')!.budget).toBe(12_000_000);
    expect(total.actual).toBe(2_000_000);
  });

  it('consolidation : tous les pôles', () => {
    const { total } = poleGrid(accounts, lines, null);
    expect(total.budget).toBe(13_000_000);
    expect(total.actual).toBe(2_400_000);
    expect(total.months[0]).toBe(1_300_000);
  });
});

describe('trésorerie', () => {
  const tl = [
    { code: 'enc', section: 'ENC' as const, label: 'Ventes', sort_order: 0 },
    { code: 'dec', section: 'DEC' as const, label: 'Achats', sort_order: 1 },
  ];
  it('solde cumulé mois par mois, seuil minimal, prévision', () => {
    const t = treasury(tl, [
      { line_code: 'enc', month: 1, amount: 1_000_000 }, { line_code: 'dec', month: 1, amount: 1_500_000 },
      { line_code: 'enc', month: 2, amount: 2_000_000 }, { line_code: 'enc', month: 0, amount: 20_000_000 },
    ], 1_000_000, 800_000);
    expect(t.closingM[0]).toBe(500_000);
    expect(t.openingM[1]).toBe(500_000);
    expect(t.closingM[1]).toBe(2_500_000);
    expect(t.belowThreshold[0]).toBe(true);
    expect(t.belowThreshold[1]).toBe(false);
    expect(t.finalBalance).toBe(2_500_000);
    expect(t.forecastEnc).toBe(20_000_000);
    expect(t.totalNet).toBe(1_500_000);
  });
});

describe('compte de résultat', () => {
  const pl = [
    { code: 'ca', section: 'PRODUITS', label: 'Ventes', sort_order: 0 },
    { code: 'cv', section: 'VARIABLES', label: 'Achats', sort_order: 1 },
    { code: 'pe', section: 'PERSONNEL', label: 'Salaires', sort_order: 2 },
    { code: 'op', section: 'OPEX', label: 'Loyers', sort_order: 3 },
    { code: 'fi', section: 'FINANCIER', label: 'Agios', sort_order: 4 },
    { code: 'its', section: 'IMPOT', label: 'ITS', sort_order: 5 },
  ];
  it('marge brute, EBIT, résultat net APRÈS impôt (le classeur l’oubliait)', () => {
    const r = pnl(pl, [
      { line_code: 'ca', budget: 100, actual: 80 }, { line_code: 'cv', budget: 40, actual: 30 },
      { line_code: 'pe', budget: 20, actual: 20 }, { line_code: 'op', budget: 10, actual: 5 },
      { line_code: 'fi', budget: 5, actual: 5 }, { line_code: 'its', budget: 7, actual: 5 },
    ]);
    expect(r.grossMargin.actual).toBe(50);
    expect(r.grossMarginRate.actual).toBeCloseTo(50 / 80, 9);
    expect(r.ebit.budget).toBe(30);
    expect(r.preTax.actual).toBe(20);
    expect(r.net.actual).toBe(15);
    expect(r.suggestedTax.actual).toBeCloseTo(5.5, 9);
  });
});

describe('KPI officiels', () => {
  it('plus haut = mieux', () => {
    expect(kpiStatus('up', 100, 100)).toBe('✅ Atteint');
    expect(kpiStatus('up', 100, 85)).toBe('⚠️ En cours');
    expect(kpiStatus('up', 100, 50)).toBe('🔴 Alerte');
  });
  it('plus bas = mieux (DSO, délais, CAC) : le classeur les jugeait à l’envers', () => {
    expect(kpiStatus('down', 30, 25)).toBe('✅ Atteint');
    expect(kpiStatus('down', 30, 35)).toBe('⚠️ En cours');
    expect(kpiStatus('down', 30, 60)).toBe('🔴 Alerte');
    expect(kpiAttainment('down', 30, 60)).toBe(0.5);
  });
  it('cible (effectif, exécution budgétaire)', () => {
    expect(kpiStatus('target', 1, 0.97)).toBe('✅ Atteint');
    expect(kpiStatus('target', 1, 1.15)).toBe('⚠️ En cours');
    expect(kpiStatus('target', 20, 12)).toBe('🔴 Alerte');
    expect(kpiStatus('up', null, 5)).toBe('— À saisir');
  });

  it('KPI calculés depuis le journal des ventes', () => {
    const data = {
      settings: DEFAULT_SETTINGS, solutions: [], labor: [], stock: [], supplierPrices: [], kitItems: [], kitLabor: [],
      zones: [], teams: [{ id: 't', name: 'É1', technicians: 2, hours_per_day: 8, working_days: 22, availability_rate: 1, sort_order: 0, active: true }],
      kits: [{ id: 'k', code: 'K', solution_code: 'X', variant: 'PETIT', name: 'K', transport_cost: 0, sort_order: 0, active: true }],
    };
    const kits = computeKits(data);
    const mk = (o: Partial<TcSale>): TcSale => ({ id: o.quote_no ?? 'x', quote_no: 'x', quote_date: '2026-10-01', team_id: 't', client: 'A', kit_id: 'k', quantity: 1, applied_price: 1_000_000, discount_rate: 0, lost: false, deposit_amount: 0, balance_amount: 0, ...o });
    const sales = [
      mk({ quote_no: '1', client: 'A', sale_date: '2026-10-11', delivery_date: '2026-10-20', planned_install_date: '2026-10-25', deposit_amount: 1_180_000, deposit_date: '2026-11-04' }),
      mk({ quote_no: '2', client: 'B', quote_date: '2026-10-05' }),
      mk({ quote_no: '3', client: 'A', quote_date: '2026-09-01', sale_date: '2026-09-15' }),
    ].map(s => computeSale(s, { kits, data, today: new Date('2026-11-10T00:00:00Z') }));
    const k = autoKpis({ month: '2026-10-01', sales, objectives: [{ id: 'o', team_id: 't', solution_code: 'X', month: '2026-10-01', kits_target: 2, revenue_target: 2_000_000 }], teams: data.teams });
    expect(k.C1).toBe(0.5);
    expect(k.C2).toBe(0); // A a déjà acheté en septembre
    expect(k.C3).toBe(2);
    expect(k.C4).toBe(0.5);
    expect(k.C5).toBe(1_000_000);
    expect(k.C6).toBe(10);
    expect(k.F5).toBe(15); // livré le 20/10, soldé le 04/11
    expect(k.T2).toBe(1);
    expect(k.T8).toBe(0.5);
    expect(k.F1).toBeCloseTo(2_000_000 / 10, 6);
  });
});

import { finSuggestions } from './engine';
describe('pré-remplissage depuis la plateforme', () => {
  it('encaissements TC → trésorerie, ventes et coûts → compte de résultat, charges des pôles', () => {
    const fake = (o: Partial<{ solution: string; isFirm: boolean; saleMonth: string; amountHT: number; costTotal: number; commissionBase: number; dep: number; depd: string; bal: number; bald: string }>) => ({
      solution: o.solution ?? 'VICTRON', isFirm: o.isFirm ?? true, saleMonth: o.saleMonth ?? '2026-10-01', amountHT: o.amountHT ?? 0, costTotal: o.costTotal ?? 0, commissionBase: o.commissionBase ?? 0,
      sale: { deposit_amount: o.dep ?? 0, deposit_date: o.depd ?? null, balance_amount: o.bal ?? 0, balance_date: o.bald ?? null },
    }) as unknown as Parameters<typeof finSuggestions>[1][number];
    const r = finSuggestions(2026, [
      fake({ solution: 'LORENTZ', amountHT: 1000, costTotal: 600, commissionBase: 20, dep: 500, depd: '2026-10-05', bal: 680, bald: '2026-11-02' }),
      fake({ solution: 'HUAWEI', amountHT: 300, costTotal: 200, dep: 100, depd: '2025-12-20' }),
      fake({ solution: 'SPARK', isFirm: false, amountHT: 999 }),
    ], { rows: [{ account: { name: 'Salaires bruts' }, isGroup: false, actual: 5000 }, { account: { name: 'Assurances' }, isGroup: false, actual: 70 }] as never });
    expect(r.treasury.enc_pompage[9]).toBe(500);
    expect(r.treasury.enc_pompage[10]).toBe(680);
    expect(r.treasury.enc_pv).toBeUndefined(); // encaissement de 2025 ignoré
    expect(r.pnlActual).toEqual({ ca_pompage: 1000, ca_pv: 300, cv_marchandises: 800, cv_commissions: 20, pe_salaires: 5000, op_autres: 70 });
  });
});
