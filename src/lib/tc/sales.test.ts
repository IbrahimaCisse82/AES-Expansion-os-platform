import { describe, it, expect } from 'vitest';
import { computeSale, missionCost, monthOf, saleStatus, snapshotOnSale } from './sales';
import {
  addMonths, capacityPlan, dgDashboard, dormantStock, marginRow, monthRange, monthlySeries,
  purchasesBySupplier, repCommissions, stockNeeds, teamCommissions, teamForecasts, teamPerformance,
} from './aggregates';
import { computeKits } from './kits';
import { DEFAULT_SETTINGS, type TcData, type TcSale } from './types';

// Valeurs attendues calculées à la main à partir des formules de
// JOURNAL_VENTES, PERF_EQUIPES, COMMISSIONS_PREVISIONS, MARGES_ENCAISSEMENTS,
// CAPACITE, CONSO_STOCK, ACHATS et STOCK_DORMANT.

const settings = { ...DEFAULT_SETTINGS };
const team1 = { id: 't1', name: 'Équipe 1', technicians: 2, hours_per_day: 8, working_days: 22, availability_rate: 0.8, sort_order: 0, active: true };
const team2 = { ...team1, id: 't2', name: 'Équipe 2', sort_order: 1 };
const zoneKaya = { id: 'z1', name: 'Kaya', distance_km: 100, mission_days: 1, nights: 0, sort_order: 0 };
const zoneBobo = { id: 'z2', name: 'Bobo-Dioulasso', distance_km: 360, mission_days: 3, nights: 2, sort_order: 1 };

// Kit : 2 panneaux (stock 3 à 100 000) + 1 onduleur (hors stock, fournisseur 400 000) + 10 h de MO à 2 000/h
const base: TcData = {
  settings,
  solutions: [{ code: 'VICTRON', label: 'Victron', reservation_priority: 1, color: 'sky', active: true }],
  labor: [{ id: 'p1', name: 'Technicien', hourly_rate: 2000, sort_order: 0 }],
  zones: [zoneKaya, zoneBobo],
  teams: [team1, team2],
  stock: [
    { id: 's1', designation: 'PANNEAU 550 WC', quantity: 3, unit_cost: 100000, unit: 'u', solution_code: 'VICTRON' },
    { id: 's2', designation: 'BATTERIE DORMANTE', quantity: 4, unit_cost: 50000, unit: 'u', solution_code: 'AUTRE' },
  ],
  supplierPrices: [
    { id: 'f1', designation: 'ONDULEUR 3 KVA', supplier: 'Solaris', unit_price: 400000, lead_days: 10 },
    { id: 'f2', designation: 'PANNEAU 550 WC', supplier: 'Solaris', unit_price: 120000, lead_days: 5 },
  ],
  kits: [{ id: 'k1', code: 'VICTRON – PETIT', solution_code: 'VICTRON', variant: 'PETIT', name: 'Kit petit', transport_cost: 0, sort_order: 0, active: true }],
  kitItems: [
    { id: 'i1', kit_id: 'k1', line_no: 1, designation: 'PANNEAU 550 WC', unit: 'u', quantity: 2 },
    { id: 'i2', kit_id: 'k1', line_no: 2, designation: 'ONDULEUR 3 KVA', unit: 'u', quantity: 1 },
  ],
  kitLabor: [{ id: 'l1', kit_id: 'k1', line_no: 1, profile_id: 'p1', people: 2, hours_per_person: 5 }],
  objectives: [
    { id: 'o1', team_id: 't1', solution_code: 'VICTRON', month: '2026-10-01', kits_target: 2, revenue_target: 1_500_000 },
    { id: 'o2', team_id: 't2', solution_code: 'VICTRON', month: '2026-10-01', kits_target: 2, revenue_target: 1_500_000 },
  ],
  sales: [],
};
// Coût de revient = (200 000 + 400 000 + 20 000) × 1,05 = 651 000 ; prix HT = 813 750 ; TTC = 960 225
const kits = computeKits(base);
const sale = (o: Partial<TcSale>): TcSale => ({
  id: o.id ?? 'x', quote_no: o.quote_no ?? 'D', quote_date: o.quote_date ?? '2026-10-02', team_id: o.team_id ?? 't1',
  client: 'Client', kit_id: 'k1', quantity: 1, discount_rate: 0, lost: false, deposit_amount: 0, balance_amount: 0, ...o,
});
const today = new Date('2026-12-15T00:00:00Z');
const calc = (s: TcSale) => computeSale(s, { kits, data: base, today });

describe('kit de référence', () => {
  it('coût de revient et prix de vente', () => {
    const k = kits.byId.get('k1')!;
    expect(k.costPrice).toBe(651000);
    expect(k.priceHT).toBe(813750);
    expect(k.priceTTC).toBe(960225);
    expect(k.laborHours).toBe(10);
  });
});

describe('journal des ventes', () => {
  it('statuts dans l’ordre du classeur (Perdu > Livré > Vendu > Devis)', () => {
    expect(saleStatus({ lost: false, sale_date: null, delivery_date: null })).toBe('Devis en cours');
    expect(saleStatus({ lost: false, sale_date: '2026-10-05', delivery_date: null })).toBe('Vendu');
    expect(saleStatus({ lost: false, sale_date: '2026-10-05', delivery_date: '2026-10-10' })).toBe('Livré');
    expect(saleStatus({ lost: true, sale_date: null, delivery_date: null })).toBe('Perdu');
    expect(monthOf('2026-10-27')).toBe('2026-10-01');
  });

  it('devis en cours : prix catalogue, probabilité par défaut, pas de commission', () => {
    const c = calc(sale({ quantity: 2 }));
    expect(c.amountHT).toBe(1_627_500);
    expect(c.probability).toBe(0.5);
    expect(c.weightedRevenue).toBe(813_750);
    expect(c.remaining).toBeNull();
    expect(c.commissionBase).toBe(0);
    expect(c.installMonth).toBeNull();
  });

  it('prix appliqué et remise', () => {
    const c = calc(sale({ applied_price: 1_000_000, discount_rate: 0.1, sale_date: '2026-10-05' }));
    expect(c.amountHT).toBe(900_000);
    expect(c.grossMargin).toBe(249_000);
    expect(c.amountTTC).toBeCloseTo(1_062_000, 6);
    expect(c.commissionBase).toBe(18_000);
  });

  it('encaissements : partiel, retard au-delà du délai de paiement', () => {
    // livré le 2026-10-20, délai 30 j → retard au 2026-12-15 = 56 − 30 = 26 j
    const c = calc(sale({ sale_date: '2026-10-05', delivery_date: '2026-10-20', deposit_amount: 300_000, deposit_date: '2026-10-05' }));
    expect(c.paymentStatus).toBe('Partiel');
    expect(c.remaining).toBeCloseTo(660_225, 6);
    expect(c.daysLate).toBe(26);
    expect(c.commissionPayable).toBe(0);
  });

  it('soldé : plus de retard, commission payable', () => {
    const c = calc(sale({ sale_date: '2026-10-05', delivery_date: '2026-10-20', deposit_amount: 460_225, deposit_date: '2026-10-05', balance_amount: 500_000, balance_date: '2026-11-02' }));
    expect(c.paymentStatus).toBe('Soldé');
    expect(c.daysLate).toBeNull();
    expect(c.commissionPayable).toBeCloseTo(16_275, 6);
  });

  it('frais terrain, provision SAV et marge nette', () => {
    // Bobo : 360 × 2 × 350 + 3 × 3 × 10 000 + 2 × 3 × 15 000 = 252 000 + 90 000 + 90 000
    expect(missionCost(zoneBobo, 3, settings)).toBe(432_000);
    const c = calc(sale({ sale_date: '2026-10-05', zone_id: 'z1' }));
    expect(c.travelCost).toBe(90_000); // Kaya, 2 personnes par défaut
    expect(c.warrantyProvision).toBeCloseTo(24_412.5, 6);
    expect(c.netMargin).toBeCloseTo(813_750 - 651_000 - 90_000 - 24_412.5, 6);
  });

  it('la marge d’une vente signée reste figée si le kit change', () => {
    const signed = sale({ sale_date: '2026-10-05', unit_cost_snapshot: 500_000, catalog_price_snapshot: 700_000, install_hours_snapshot: 8 });
    const c = calc(signed);
    expect(c.usesSnapshot).toBe(true);
    expect(c.amountHT).toBe(700_000);
    expect(c.grossMargin).toBe(200_000);
    expect(c.installHours).toBe(8);
  });

  it('snapshotOnSale fige coût, prix et heures à la signature seulement', () => {
    expect(snapshotOnSale(null, { sale_date: null, kit_id: 'k1' }, kits)).toBeNull();
    expect(snapshotOnSale({ sale_date: null, unit_cost_snapshot: null }, { sale_date: '2026-10-05', kit_id: 'k1' }, kits))
      .toEqual({ unit_cost_snapshot: 651000, catalog_price_snapshot: 813750, install_hours_snapshot: 10 });
    expect(snapshotOnSale({ sale_date: '2026-10-05', unit_cost_snapshot: 1 }, { sale_date: '2026-10-05', kit_id: 'k1' }, kits)).toBeNull();
  });

  it('mois d’installation : livraison sinon date prévue', () => {
    expect(calc(sale({ sale_date: '2026-10-05', planned_install_date: '2026-11-12' })).installMonth).toBe('2026-11-01');
    expect(calc(sale({ sale_date: '2026-10-05', delivery_date: '2026-10-28', planned_install_date: '2026-11-12' })).installMonth).toBe('2026-10-01');
  });
});

describe('tableaux de bord', () => {
  const sales: TcSale[] = [
    sale({ id: 'a', quote_no: 'A', team_id: 't1', salesperson: 'Awa', quantity: 2, sale_date: '2026-10-08', delivery_date: '2026-10-25', planned_install_date: '2026-10-20', deposit_amount: 1_920_450, deposit_date: '2026-10-08' }),
    sale({ id: 'b', quote_no: 'B', team_id: 't1', salesperson: 'Awa', quote_date: '2026-10-10' }),
    sale({ id: 'c', quote_no: 'C', team_id: 't2', salesperson: 'Issa', quantity: 1, sale_date: '2026-10-15', planned_install_date: '2026-11-05' }),
    sale({ id: 'd', quote_no: 'D', team_id: 't2', quote_date: '2026-10-12', lost: true }),
    sale({ id: 'e', quote_no: 'E', team_id: 't2', quote_date: '2026-09-20', probability: 0.8 }),
  ];
  const calcs = sales.map(calc);
  const data = { ...base, sales };

  it('performance des équipes du mois (devisé, vendu, livré, % objectif, transformation, rang)', () => {
    const { rows, total } = teamPerformance(base.teams, calcs, base.objectives, '2026-10-01', '2026-10-01');
    const t1 = rows[0];
    expect(t1.quotedQty).toBe(3);
    expect(t1.soldAmount).toBe(1_627_500);
    expect(t1.deliveredQty).toBe(2);
    expect(t1.pctRevenue).toBeCloseTo(1.085, 6);
    expect(t1.conversionRate).toBeCloseTo(2 / 3, 6);
    expect(t1.rank).toBe(1);
    expect(rows[1].rank).toBe(2);
    expect(total.soldQty).toBe(3);
  });

  it('commissions par équipe : bonus si objectif atteint', () => {
    const [t1, t2] = teamCommissions(base.teams, calcs, base.objectives, '2026-10-01', settings);
    expect(t1.base).toBe(32_550);
    expect(t1.bonus).toBe(16_275); // 108,5 % ≥ 100 % → 1 % du CA
    expect(t1.payable).toBe(32_550); // client soldé
    expect(t2.bonus).toBe(0); // 54 %
  });

  it('commissions par commercial et prévisions pondérées', () => {
    const reps = repCommissions(calcs);
    expect(reps.map(r => r.salesperson)).toEqual(['Awa', 'Issa']);
    expect(reps[0].kitsSold).toBe(2);
    const [f1, f2] = teamForecasts(base.teams, calcs, base.objectives);
    expect(f1.weightedPipeline).toBe(406_875);
    expect(f2.weightedPipeline).toBeCloseTo(651_000, 6); // 0,8 × 813 750
    expect(f2.forecast).toBeCloseTo(813_750 + 651_000, 6);
  });

  it('marges et créances par équipe', () => {
    const t2 = marginRow('t2', 'Équipe 2', calcs.filter(c => c.sale.team_id === 't2'));
    expect(t2.kitsSold).toBe(1);
    expect(t2.revenueHT).toBe(813_750);
    expect(t2.collected).toBe(0);
    expect(t2.remaining).toBeCloseTo(960_225, 6);
  });

  it('capacité : charge au mois de livraison sinon d’installation prévue', () => {
    const [t1, t2] = capacityPlan(base.teams, calcs, ['2026-10-01', '2026-11-01']);
    expect(t1.capacity).toBeCloseTo(281.6, 6);
    expect(t1.load['2026-10-01']).toBe(20);
    expect(t2.load['2026-11-01']).toBe(10);
  });

  it('besoins de stock, achats et stock dormant', () => {
    const needs = stockNeeds(data, calcs);
    const panel = needs.find(n => n.designation === 'PANNEAU 550 WC')!;
    // livré 2 kits → 4 panneaux consommés ; vendu 1 → 2 engagés ; devis B (1) + E (1) → 4 potentiels
    expect(panel.consumed).toBe(4);
    expect(panel.committed).toBe(2);
    expect(panel.coveredByStock).toBe(3);
    expect(panel.toOrder).toBe(3);
    expect(panel.orderAmount).toBe(360_000);
    const inverter = needs.find(n => n.designation === 'ONDULEUR 3 KVA')!;
    expect(inverter.toOrder).toBe(3);
    const purchases = purchasesBySupplier(needs);
    expect(purchases.suppliers[0].supplier).toBe('Solaris');
    expect(purchases.total).toBe(360_000 + 1_200_000);

    const dormant = dormantStock(data, calcs);
    const battery = dormant.rows.find(r => r.item.designation === 'BATTERIE DORMANTE')!;
    expect(battery.classification).toBe('Dormant – aucun kit');
    expect(dormant.dormantValue).toBe(200_000);
    expect(dormant.rows.find(r => r.item.designation === 'PANNEAU 550 WC')!.classification).toBe('Couvert par les ventes');
  });

  it('série mensuelle et tableau DG avec alertes', () => {
    const months = monthRange('2026-09-01', '2026-11-01');
    expect(months).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01');
    const series = monthlySeries(months, calcs, base.objectives);
    expect(series[1].soldAmount).toBe(2_441_250);
    expect(series[1].collected).toBe(1_920_450);

    const capacity = capacityPlan(base.teams, calcs, months);
    const dg = dgDashboard({ data, kits, sales: calcs, month: '2026-10-01', periodStart: '2026-10-01', capacity, needs: stockNeeds(data, calcs), dormant: dormantStock(data, calcs) });
    const ventes = dg.indicators[0].rows;
    expect(ventes[0].month).toBe(2_441_250);
    expect(ventes[0].pct).toBeCloseTo(2_441_250 / 3_000_000, 6);
    const alert = (label: string) => dg.alerts.find(a => a.label === label)!;
    expect(alert('CA du mois vs objectif').level).toBe('Vigilance'); // 81 %
    expect(alert('Articles à commander').level).toBe('Vigilance');
    expect(alert('Coûts horaires non renseignés').level).toBe('OK');
  });
});
