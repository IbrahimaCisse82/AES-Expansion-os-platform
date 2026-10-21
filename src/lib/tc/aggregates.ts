// Tableaux de bord du classeur AES : PERF_EQUIPES, MARGES_ENCAISSEMENTS,
// COMMISSIONS_PREVISIONS, SUIVI_MENSUEL, VENTES_PAR_KIT, CAPACITE,
// NOMENCLATURES / CONSO_STOCK / ACHATS, STOCK_DORMANT, TABLEAU_DG.

import { bestSupplierPrice, type KitsResult } from './kits';
import type { SaleCalc } from './sales';
import type { TcData, TcObjective, TcStockItem, TcTeam } from './types';

const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0);
const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);
const norm = (s: string) => s.trim().toUpperCase();

/** Ajoute n mois à AAAA-MM-01. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** Liste de mois de `from` à `to` inclus. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 240; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function objectiveTotals(objectives: TcObjective[], filter: (o: TcObjective) => boolean) {
  const rows = objectives.filter(filter);
  return { kits: sum(rows, o => o.kits_target), revenue: sum(rows, o => o.revenue_target) };
}

// ---------------------------------------------------------------------
// PERF_EQUIPES
// ---------------------------------------------------------------------
export interface TeamPerf {
  team: TcTeam;
  quotedQty: number;
  quotedAmount: number;
  soldQty: number;
  soldAmount: number;
  deliveredQty: number;
  deliveredAmount: number;
  targetQty: number;
  targetRevenue: number;
  pctQty: number | null;
  pctRevenue: number | null;
  conversionRate: number | null;
  rank: number | null;
}

export function teamPerformance(
  teams: TcTeam[], sales: SaleCalc[], objectives: TcObjective[], from: string, to: string,
): { rows: TeamPerf[]; total: Omit<TeamPerf, 'team' | 'rank'> } {
  const inRange = (m: string | null) => !!m && m >= from && m <= to;
  const rows: TeamPerf[] = teams.map(team => {
    const mine = sales.filter(s => s.sale.team_id === team.id);
    const quoted = mine.filter(s => inRange(s.quoteMonth));
    const sold = mine.filter(s => inRange(s.saleMonth) && s.status !== 'Perdu');
    const delivered = mine.filter(s => inRange(s.deliveryMonth));
    const obj = objectiveTotals(objectives, o => o.team_id === team.id && o.month >= from && o.month <= to);
    const quotedQty = sum(quoted, s => s.sale.quantity);
    const convertedQty = sum(quoted.filter(s => s.isFirm), s => s.sale.quantity);
    const soldQty = sum(sold, s => s.sale.quantity);
    const soldAmount = sum(sold, s => s.amountHT);
    return {
      team,
      quotedQty, quotedAmount: sum(quoted, s => s.amountHT),
      soldQty, soldAmount,
      deliveredQty: sum(delivered, s => s.sale.quantity), deliveredAmount: sum(delivered, s => s.amountHT),
      targetQty: obj.kits, targetRevenue: obj.revenue,
      pctQty: ratio(soldQty, obj.kits), pctRevenue: ratio(soldAmount, obj.revenue),
      conversionRate: ratio(convertedQty, quotedQty),
      rank: null,
    };
  });
  const ranked = [...rows].filter(r => r.soldAmount > 0).sort((a, b) => b.soldAmount - a.soldAmount);
  for (const r of rows) {
    if (r.soldAmount > 0) r.rank = 1 + ranked.filter(x => x.soldAmount > r.soldAmount).length;
  }
  const allQuoted = sales.filter(s => inRange(s.quoteMonth));
  const quotedQty = sum(rows, r => r.quotedQty);
  const soldQty = sum(rows, r => r.soldQty);
  const soldAmount = sum(rows, r => r.soldAmount);
  const targetQty = sum(rows, r => r.targetQty);
  const targetRevenue = sum(rows, r => r.targetRevenue);
  return {
    rows,
    total: {
      quotedQty, quotedAmount: sum(rows, r => r.quotedAmount),
      soldQty, soldAmount,
      deliveredQty: sum(rows, r => r.deliveredQty), deliveredAmount: sum(rows, r => r.deliveredAmount),
      targetQty, targetRevenue,
      pctQty: ratio(soldQty, targetQty), pctRevenue: ratio(soldAmount, targetRevenue),
      conversionRate: ratio(sum(allQuoted.filter(s => s.isFirm), s => s.sale.quantity), quotedQty),
    },
  };
}

// ---------------------------------------------------------------------
// MARGES_ENCAISSEMENTS
// ---------------------------------------------------------------------
export interface MarginRow {
  key: string;
  label: string;
  kitsSold: number;
  revenueHT: number;
  cost: number;
  grossMargin: number;
  grossMarginRate: number;
  revenueTTC: number;
  collected: number;
  remaining: number;
  collectedRate: number;
  overdueAmount: number;
  overdueCount: number;
  travel: number;
  warranty: number;
  netMargin: number;
  netMarginRate: number;
}

export function marginRow(key: string, label: string, rows: SaleCalc[]): MarginRow {
  const firm = rows.filter(s => s.isFirm);
  const revenueHT = sum(firm, s => s.amountHT);
  const cost = sum(firm, s => s.costTotal);
  const revenueTTC = sum(firm, s => s.amountTTC);
  const collected = sum(firm, s => s.collected);
  const grossMargin = revenueHT - cost;
  const travel = sum(firm, s => s.travelCost);
  const warranty = sum(firm, s => s.warrantyProvision);
  const netMargin = grossMargin - travel - warranty;
  const overdue = rows.filter(s => (s.daysLate ?? 0) > 0);
  return {
    key, label,
    kitsSold: sum(firm, s => s.sale.quantity),
    revenueHT, cost, grossMargin,
    grossMarginRate: revenueHT === 0 ? 0 : grossMargin / revenueHT,
    revenueTTC, collected,
    remaining: sum(rows, s => s.remaining ?? 0),
    collectedRate: revenueTTC === 0 ? 0 : collected / revenueTTC,
    overdueAmount: sum(overdue, s => s.remaining ?? 0),
    overdueCount: overdue.length,
    travel, warranty, netMargin,
    netMarginRate: revenueHT === 0 ? 0 : netMargin / revenueHT,
  };
}

export function marginsBy<K extends string>(sales: SaleCalc[], keyOf: (s: SaleCalc) => K, labels: { key: K; label: string }[]): MarginRow[] {
  return labels.map(l => marginRow(l.key, l.label, sales.filter(s => keyOf(s) === l.key)));
}

// ---------------------------------------------------------------------
// COMMISSIONS_PREVISIONS
// ---------------------------------------------------------------------
export interface TeamCommission {
  team: TcTeam;
  revenue: number;
  target: number;
  pct: number | null;
  base: number;
  bonus: number;
  total: number;
  payable: number;
}

export function teamCommissions(
  teams: TcTeam[], sales: SaleCalc[], objectives: TcObjective[], month: string, settings: TcData['settings'],
): TeamCommission[] {
  return teams.map(team => {
    const sold = sales.filter(s => s.sale.team_id === team.id && s.saleMonth === month && s.status !== 'Perdu');
    const revenue = sum(sold, s => s.amountHT);
    const target = objectiveTotals(objectives, o => o.team_id === team.id && o.month === month).revenue;
    const pct = ratio(revenue, target);
    const base = sum(sold, s => s.commissionBase);
    const bonus = target > 0 && (pct ?? 0) >= settings.bonus_threshold ? revenue * settings.bonus_rate : 0;
    return { team, revenue, target, pct, base, bonus, total: base + bonus, payable: sum(sold, s => s.commissionPayable) };
  });
}

export interface RepCommission {
  salesperson: string;
  teamName: string;
  kitsSold: number;
  revenue: number;
  base: number;
  payable: number;
  remaining: number;
}

export function repCommissions(sales: SaleCalc[]): RepCommission[] {
  const reps = new Map<string, SaleCalc[]>();
  for (const s of sales) {
    const name = s.sale.salesperson?.trim();
    if (!name) continue;
    reps.set(name, [...(reps.get(name) ?? []), s]);
  }
  return [...reps.entries()]
    .map(([salesperson, rows]) => {
      const firm = rows.filter(s => s.isFirm);
      const base = sum(rows, s => s.commissionBase);
      const payable = sum(rows, s => s.commissionPayable);
      return {
        salesperson,
        teamName: rows[0]?.teamName ?? '',
        kitsSold: sum(firm, s => s.sale.quantity),
        revenue: sum(firm, s => s.amountHT),
        base, payable, remaining: base - payable,
      };
    })
    .filter(r => r.kitsSold > 0)
    .sort((a, b) => a.salesperson.localeCompare(b.salesperson, 'fr'));
}

export interface TeamForecast {
  team: TcTeam;
  soldRevenue: number;
  openQuotes: number;
  openQuotesAmount: number;
  weightedPipeline: number;
  forecast: number;
  target: number;
  pct: number | null;
  remainingToSell: number;
}

export function teamForecasts(teams: TcTeam[], sales: SaleCalc[], objectives: TcObjective[]): TeamForecast[] {
  return teams.map(team => {
    const mine = sales.filter(s => s.sale.team_id === team.id);
    const open = mine.filter(s => s.status === 'Devis en cours');
    const soldRevenue = sum(mine.filter(s => s.isFirm), s => s.amountHT);
    const weightedPipeline = sum(open, s => s.weightedRevenue);
    const target = objectiveTotals(objectives, o => o.team_id === team.id).revenue;
    const forecast = soldRevenue + weightedPipeline;
    return {
      team, soldRevenue,
      openQuotes: open.length, openQuotesAmount: sum(open, s => s.amountHT),
      weightedPipeline, forecast, target,
      pct: ratio(forecast, target),
      remainingToSell: Math.max(0, target - soldRevenue),
    };
  });
}

// ---------------------------------------------------------------------
// SUIVI_MENSUEL / VENTES_PAR_KIT
// ---------------------------------------------------------------------
export type Stage = 'quote' | 'sale' | 'delivery';
const stageMonth = (s: SaleCalc, stage: Stage) =>
  stage === 'quote' ? s.quoteMonth : stage === 'sale' ? (s.status === 'Perdu' ? null : s.saleMonth) : s.deliveryMonth;

export interface MonthlyPoint {
  month: string;
  quotedQty: number;
  quotedAmount: number;
  soldQty: number;
  soldAmount: number;
  deliveredQty: number;
  deliveredAmount: number;
  targetQty: number;
  targetRevenue: number;
  grossMargin: number;
  netMargin: number;
  collected: number;
}

export function monthlySeries(
  months: string[], sales: SaleCalc[], objectives: TcObjective[],
  filter: { teamId?: string | null; solution?: string | null } = {},
): MonthlyPoint[] {
  const rows = sales.filter(s => (!filter.teamId || s.sale.team_id === filter.teamId) && (!filter.solution || s.solution === filter.solution));
  const objs = objectives.filter(o => (!filter.teamId || o.team_id === filter.teamId) && (!filter.solution || o.solution_code === filter.solution));
  return months.map(month => {
    const q = rows.filter(s => stageMonth(s, 'quote') === month);
    const so = rows.filter(s => stageMonth(s, 'sale') === month);
    const d = rows.filter(s => stageMonth(s, 'delivery') === month);
    const obj = objectiveTotals(objs, o => o.month === month);
    const collected = sum(rows, s =>
      (monthOfDate(s.sale.deposit_date) === month ? s.sale.deposit_amount : 0)
      + (monthOfDate(s.sale.balance_date) === month ? s.sale.balance_amount : 0));
    return {
      month,
      quotedQty: sum(q, s => s.sale.quantity), quotedAmount: sum(q, s => s.amountHT),
      soldQty: sum(so, s => s.sale.quantity), soldAmount: sum(so, s => s.amountHT),
      deliveredQty: sum(d, s => s.sale.quantity), deliveredAmount: sum(d, s => s.amountHT),
      targetQty: obj.kits, targetRevenue: obj.revenue,
      grossMargin: sum(so, s => s.grossMargin), netMargin: sum(so, s => s.netMargin),
      collected,
    };
  });
}

const monthOfDate = (d: string | null | undefined) => (d ? `${d.slice(0, 7)}-01` : null);

export function salesByKit(months: string[], sales: SaleCalc[], stage: Stage, kitIds: string[]) {
  return kitIds.map(kitId => {
    const rows = sales.filter(s => s.sale.kit_id === kitId);
    const perMonth = months.map(m => {
      const r = rows.filter(s => stageMonth(s, stage) === m);
      return { month: m, qty: sum(r, s => s.sale.quantity), amount: sum(r, s => s.amountHT) };
    });
    return { kitId, perMonth, qty: sum(perMonth, p => p.qty), amount: sum(perMonth, p => p.amount) };
  });
}

// ---------------------------------------------------------------------
// CAPACITE
// ---------------------------------------------------------------------
export interface CapacityRow {
  team: TcTeam;
  capacity: number;
  load: Record<string, number>;
  occupancy: Record<string, number | null>;
}

export const teamCapacity = (t: TcTeam) => t.technicians * t.hours_per_day * t.working_days * t.availability_rate;

export function capacityPlan(teams: TcTeam[], sales: SaleCalc[], months: string[]): CapacityRow[] {
  return teams.map(team => {
    const capacity = teamCapacity(team);
    const load: Record<string, number> = {};
    const occupancy: Record<string, number | null> = {};
    for (const m of months) {
      load[m] = sum(sales.filter(s => s.sale.team_id === team.id && s.installMonth === m), s => s.installHours);
      occupancy[m] = capacity === 0 ? null : load[m] / capacity;
    }
    return { team, capacity, load, occupancy };
  });
}

// ---------------------------------------------------------------------
// NOMENCLATURES / CONSO_STOCK / ACHATS / STOCK_DORMANT
// ---------------------------------------------------------------------
export interface NeedRow {
  designation: string;
  stockInitial: number;
  consumed: number;
  committed: number;
  firmNeed: number;
  coveredByStock: number;
  toOrder: number;
  stockLeft: number;
  quoteNeed: number;
  stockAfterQuotes: number;
  stockUnitCost: number;
  consumedValue: number;
  supplierPrice: number;
  supplier: string;
  leadDays: number | null;
  orderAmount: number;
  status: 'OK' | 'À commander' | 'À commander – prix manquant' | 'Risque rupture (devis)';
}

/** Quantité par article et par statut de vente (nomenclature × kits). */
function bomNeeds(data: Pick<TcData, 'kitItems'>, sales: SaleCalc[]) {
  const needs = new Map<string, { label: string; quote: number; committed: number; consumed: number; kits: Set<string> }>();
  for (const item of data.kitItems) {
    if (!(item.quantity > 0)) continue;
    const key = norm(item.designation);
    const n = needs.get(key) ?? { label: item.designation.trim(), quote: 0, committed: 0, consumed: 0, kits: new Set<string>() };
    n.kits.add(item.kit_id);
    for (const s of sales.filter(x => x.sale.kit_id === item.kit_id)) {
      const q = item.quantity * s.sale.quantity;
      if (s.status === 'Devis en cours') n.quote += q;
      else if (s.status === 'Vendu') n.committed += q;
      else if (s.status === 'Livré') n.consumed += q;
    }
    needs.set(key, n);
  }
  return needs;
}

export function stockNeeds(data: Pick<TcData, 'kitItems' | 'stock' | 'supplierPrices'>, sales: SaleCalc[]): NeedRow[] {
  const stockByKey = new Map(data.stock.map(s => [norm(s.designation), s]));
  return [...bomNeeds(data, sales).entries()]
    .map(([key, n]) => {
      const st = stockByKey.get(key);
      const stockInitial = st?.quantity ?? 0;
      const firmNeed = n.consumed + n.committed;
      const coveredByStock = Math.min(stockInitial, firmNeed);
      const toOrder = firmNeed - coveredByStock;
      const stockLeft = stockInitial - coveredByStock;
      const stockAfterQuotes = stockLeft - n.quote;
      const best = bestSupplierPrice(n.label, data.supplierPrices);
      const supplierPrice = best?.unit_price ?? 0;
      const status: NeedRow['status'] = toOrder > 0
        ? (supplierPrice === 0 ? 'À commander – prix manquant' : 'À commander')
        : stockAfterQuotes < 0 ? 'Risque rupture (devis)' : 'OK';
      return {
        designation: n.label, stockInitial, consumed: n.consumed, committed: n.committed, firmNeed,
        coveredByStock, toOrder, stockLeft, quoteNeed: n.quote, stockAfterQuotes,
        stockUnitCost: st?.unit_cost ?? 0, consumedValue: coveredByStock * (st?.unit_cost ?? 0),
        supplierPrice, supplier: best?.supplier ?? '', leadDays: best?.lead_days ?? null,
        orderAmount: toOrder * supplierPrice, status,
      };
    })
    .sort((a, b) => a.designation.localeCompare(b.designation, 'fr'));
}

export interface PurchaseBySupplier {
  supplier: string;
  lines: NeedRow[];
  amount: number;
  maxLeadDays: number;
}

export function purchasesBySupplier(needs: NeedRow[]): { suppliers: PurchaseBySupplier[]; withoutPrice: NeedRow[]; total: number } {
  const toOrder = needs.filter(n => n.toOrder > 0);
  const map = new Map<string, NeedRow[]>();
  for (const n of toOrder.filter(x => x.supplier)) map.set(n.supplier, [...(map.get(n.supplier) ?? []), n]);
  const suppliers = [...map.entries()].map(([supplier, lines]) => ({
    supplier, lines, amount: sum(lines, l => l.orderAmount), maxLeadDays: Math.max(0, ...lines.map(l => l.leadDays ?? 0)),
  })).sort((a, b) => b.amount - a.amount);
  return { suppliers, withoutPrice: toOrder.filter(n => !n.supplier), total: sum(toOrder, n => n.orderAmount) };
}

export type DormantClass = 'Dormant – aucun kit' | 'Excédent' | 'Couvert par les ventes';
export interface DormantRow {
  item: TcStockItem;
  value: number;
  kitsUsing: number;
  need: number;
  excessQty: number;
  valueToClear: number;
  classification: DormantClass;
  action: string;
}

export function dormantStock(data: Pick<TcData, 'kitItems' | 'stock'>, sales: SaleCalc[]) {
  const needs = bomNeeds(data, sales);
  const rows: DormantRow[] = data.stock
    .filter(s => s.quantity > 0)
    .map(item => {
      const n = needs.get(norm(item.designation));
      const kitsUsing = n?.kits.size ?? 0;
      const need = n ? n.quote + n.committed + n.consumed : 0;
      const excessQty = Math.max(0, item.quantity - need);
      const classification: DormantClass = kitsUsing === 0 ? 'Dormant – aucun kit' : excessQty > 0 ? 'Excédent' : 'Couvert par les ventes';
      return {
        item, value: item.quantity * item.unit_cost, kitsUsing, need, excessQty,
        valueToClear: excessQty * item.unit_cost, classification,
        action: classification === 'Dormant – aucun kit' ? 'Intégrer dans un kit, promotion ou déstockage'
          : classification === 'Excédent' ? "Pousser la vente des kits qui l'utilisent" : '—',
      };
    })
    .sort((a, b) => b.valueToClear - a.valueToClear);
  const totalValue = sum(rows, r => r.value);
  const dormantValue = sum(rows.filter(r => r.classification === 'Dormant – aucun kit'), r => r.valueToClear);
  const excessValue = sum(rows.filter(r => r.classification === 'Excédent'), r => r.valueToClear);
  const bySolution = [...new Set(data.stock.map(s => s.solution_code ?? 'AUTRE'))].sort().map(solution => {
    const r = rows.filter(x => (x.item.solution_code ?? 'AUTRE') === solution);
    const value = sum(r, x => x.value);
    const dormant = sum(r.filter(x => x.classification === 'Dormant – aucun kit'), x => x.valueToClear);
    const excess = sum(r.filter(x => x.classification === 'Excédent'), x => x.valueToClear);
    return { solution, value, dormant, excess, shareToClear: value === 0 ? null : (dormant + excess) / value };
  });
  return { rows, totalValue, dormantValue, excessValue, shareToClear: totalValue === 0 ? null : (dormantValue + excessValue) / totalValue, bySolution };
}

// ---------------------------------------------------------------------
// TABLEAU_DG
// ---------------------------------------------------------------------
export type AlertLevel = 'OK' | 'Vigilance' | 'Alerte' | 'À définir';
export interface DgAlert { label: string; value: string; level: AlertLevel; }

export interface DgIndicator {
  label: string;
  month: number | null;
  target?: number | null;
  pct?: number | null;
  previous?: number | null;
  evolution?: number | null;
  cumulative?: number | null;
  cumulativeTarget?: number | null;
  cumulativePct?: number | null;
  format: 'money' | 'count' | 'percent';
}

const pctLevel = (p: number | null): AlertLevel => p === null ? 'À définir' : p >= 1 ? 'OK' : p >= 0.7 ? 'Vigilance' : 'Alerte';
const evo = (cur: number | null, prev: number | null) => (prev === null || prev === 0 || cur === null ? null : cur / prev - 1);

export function dgDashboard(input: {
  data: TcData; kits: KitsResult; sales: SaleCalc[]; month: string; periodStart: string;
  capacity: CapacityRow[]; needs: NeedRow[]; dormant: ReturnType<typeof dormantStock>;
}) {
  const { data, kits, sales, month, periodStart, capacity, needs, dormant } = input;
  const prev = addMonths(month, -1);
  const soldIn = (from: string, to: string) => sales.filter(s => s.saleMonth && s.saleMonth >= from && s.saleMonth <= to && s.status !== 'Perdu');
  const quotedIn = (from: string, to: string) => sales.filter(s => s.quoteMonth >= from && s.quoteMonth <= to);
  const objIn = (from: string, to: string) => objectiveTotals(data.objectives, o => o.month >= from && o.month <= to);
  const conv = (rows: SaleCalc[]) => ratio(rows.filter(s => s.isFirm).length, rows.length);

  const m = soldIn(month, month), p = soldIn(prev, prev), c = soldIn(periodStart, month);
  const om = objIn(month, month), oc = objIn(periodStart, month);
  const revM = sum(m, s => s.amountHT), revP = sum(p, s => s.amountHT), revC = sum(c, s => s.amountHT);
  const qtyM = sum(m, s => s.sale.quantity), qtyP = sum(p, s => s.sale.quantity), qtyC = sum(c, s => s.sale.quantity);
  const gmM = sum(m, s => s.grossMargin), gmP = sum(p, s => s.grossMargin), gmC = sum(c, s => s.grossMargin);
  const nmM = sum(m, s => s.netMargin), nmP = sum(p, s => s.netMargin), nmC = sum(c, s => s.netMargin);
  const feesM = sum(m, s => s.travelCost + s.warrantyProvision), feesP = sum(p, s => s.travelCost + s.warrantyProvision), feesC = sum(c, s => s.travelCost + s.warrantyProvision);
  const nmRateC = ratio(nmC, revC);

  const monthEnd = `${month.slice(0, 7)}-31`;
  const collectedMonth = sum(sales, s =>
    (s.sale.deposit_date && s.sale.deposit_date >= month && s.sale.deposit_date <= monthEnd ? s.sale.deposit_amount : 0)
    + (s.sale.balance_date && s.sale.balance_date >= month && s.sale.balance_date <= monthEnd ? s.sale.balance_amount : 0));
  const receivable = sum(sales, s => s.remaining ?? 0);
  const overdue = sales.filter(s => (s.daysLate ?? 0) > 0 && (s.remaining ?? 0) > 0);
  const overdueAmount = sum(overdue, s => s.remaining ?? 0);
  const soldNotDelivered = sales.filter(s => s.status === 'Vendu');
  const noInstallDate = soldNotDelivered.filter(s => !s.sale.planned_install_date).length;
  const hoursPlanned = sum(capacity, r => r.load[month] ?? 0);
  const capTotal = sum(capacity, r => r.capacity);
  const overloadedMonths = capacity.reduce((n, r) => n + Object.values(r.occupancy).filter(o => (o ?? 0) > 1).length, 0);
  const toOrder = needs.filter(n => n.toOrder > 0);
  const kitsWithoutPrice = kits.kits.filter(k => k.priceHT === 0).length;
  const laborWithoutRate = data.labor.filter(l => !(l.hourly_rate > 0)).length;
  const monthsWithoutObjectives = monthRange(periodStart, addMonths(periodStart, 14)).filter(mm => objIn(mm, mm).revenue === 0).length;

  const indicators: { section: string; rows: DgIndicator[] }[] = [
    { section: '1. Ventes', rows: [
      { label: 'CA HT vendu', month: revM, target: om.revenue, pct: ratio(revM, om.revenue), previous: revP, evolution: evo(revM, revP), cumulative: revC, cumulativeTarget: oc.revenue, cumulativePct: ratio(revC, oc.revenue), format: 'money' },
      { label: 'Kits vendus (nb)', month: qtyM, target: om.kits, pct: ratio(qtyM, om.kits), previous: qtyP, evolution: evo(qtyM, qtyP), cumulative: qtyC, cumulativeTarget: oc.kits, cumulativePct: ratio(qtyC, oc.kits), format: 'count' },
      { label: 'Devis émis (nb)', month: quotedIn(month, month).length, previous: quotedIn(prev, prev).length, evolution: evo(quotedIn(month, month).length, quotedIn(prev, prev).length), cumulative: quotedIn(periodStart, month).length, format: 'count' },
      { label: 'Taux de transformation des devis', month: conv(quotedIn(month, month)), previous: conv(quotedIn(prev, prev)), evolution: evo(conv(quotedIn(month, month)), conv(quotedIn(prev, prev))), cumulative: conv(quotedIn(periodStart, month)), format: 'percent' },
      { label: 'Devis en cours (nb) – à date', month: sales.filter(s => s.status === 'Devis en cours').length, format: 'count' },
      { label: 'Pipeline pondéré', month: sum(sales.filter(s => s.status === 'Devis en cours'), s => s.weightedRevenue), format: 'money' },
    ] },
    { section: '2. Rentabilité', rows: [
      { label: 'Marge brute', month: gmM, previous: gmP, evolution: evo(gmM, gmP), cumulative: gmC, format: 'money' },
      { label: 'Marge brute %', month: ratio(gmM, revM), previous: ratio(gmP, revP), cumulative: ratio(gmC, revC), format: 'percent' },
      { label: 'Frais terrain + provision SAV', month: feesM, previous: feesP, evolution: evo(feesM, feesP), cumulative: feesC, format: 'money' },
      { label: 'Marge nette', month: nmM, previous: nmP, evolution: evo(nmM, nmP), cumulative: nmC, format: 'money' },
      { label: 'Marge nette %', month: ratio(nmM, revM), previous: ratio(nmP, revP), cumulative: nmRateC, format: 'percent' },
      { label: 'Commissions commerciales (base)', month: sum(m, s => s.commissionBase), format: 'money' },
    ] },
    { section: '3. Trésorerie', rows: [
      { label: 'CA TTC facturé (ventes)', month: sum(m, s => s.amountTTC), format: 'money' },
      { label: 'Encaissements du mois', month: collectedMonth, format: 'money' },
      { label: 'Reste à encaisser – à date', month: receivable, format: 'money' },
      { label: 'dont créances en retard', month: overdueAmount, format: 'money' },
      { label: 'Nb de ventes en retard de paiement', month: overdue.length, format: 'count' },
    ] },
    { section: '4. Opérations', rows: [
      { label: 'Kits livrés / installés (nb)', month: sum(sales.filter(s => s.deliveryMonth === month), s => s.sale.quantity), format: 'count' },
      { label: 'Kits vendus non livrés – à date', month: sum(soldNotDelivered, s => s.sale.quantity), format: 'count' },
      { label: "Ventes sans date d'installation", month: noInstallDate, format: 'count' },
      { label: "Heures d'installation planifiées", month: hoursPlanned, format: 'count' },
      { label: "Taux d'occupation des techniciens (mois)", month: ratio(hoursPlanned, capTotal), format: 'percent' },
    ] },
    { section: '5. Stock & achats', rows: [
      { label: 'Valeur du stock', month: dormant.totalValue, format: 'money' },
      { label: 'Part du stock à écouler (dormant + excédent)', month: dormant.shareToClear, format: 'percent' },
      { label: 'Articles à commander (nb)', month: toOrder.length, format: 'count' },
      { label: 'Montant des achats à engager', month: sum(toOrder, n => n.orderAmount), format: 'money' },
    ] },
  ];

  const pctTxt = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);
  const alerts: DgAlert[] = [
    { label: 'CA du mois vs objectif', value: pctTxt(ratio(revM, om.revenue)), level: pctLevel(ratio(revM, om.revenue)) },
    { label: 'CA cumulé vs objectif', value: pctTxt(ratio(revC, oc.revenue)), level: pctLevel(ratio(revC, oc.revenue)) },
    { label: 'Marge nette % (cumul) vs marge cible', value: pctTxt(nmRateC),
      level: nmRateC === null ? 'À définir' : nmRateC >= data.settings.margin_rate * 0.8 ? 'OK' : nmRateC >= data.settings.margin_rate * 0.5 ? 'Vigilance' : 'Alerte' },
    { label: 'Créances en retard', value: `${Math.round(overdueAmount).toLocaleString('fr-FR')} ${data.settings.currency}`,
      level: overdueAmount === 0 ? 'OK' : overdueAmount < receivable * 0.2 ? 'Vigilance' : 'Alerte' },
    { label: "Ventes non installées sans date", value: String(noInstallDate), level: noInstallDate === 0 ? 'OK' : 'Alerte' },
    { label: 'Mois en surcharge technique (>100 %)', value: String(overloadedMonths), level: overloadedMonths === 0 ? 'OK' : 'Alerte' },
    { label: 'Articles à commander', value: String(toOrder.length), level: toOrder.length === 0 ? 'OK' : 'Vigilance' },
    { label: 'Part du stock à écouler', value: pctTxt(dormant.shareToClear),
      level: dormant.shareToClear === null ? 'À définir' : dormant.shareToClear <= 0.2 ? 'OK' : dormant.shareToClear <= 0.5 ? 'Vigilance' : 'Alerte' },
    { label: 'Kits sans prix de vente', value: String(kitsWithoutPrice), level: kitsWithoutPrice === 0 ? 'OK' : 'Alerte' },
    { label: 'Coûts horaires non renseignés', value: String(laborWithoutRate), level: laborWithoutRate === 0 ? 'OK' : 'Alerte' },
    { label: 'Objectifs non saisis (mois)', value: String(monthsWithoutObjectives), level: monthsWithoutObjectives === 0 ? 'OK' : 'Alerte' },
  ];

  return { indicators, alerts };
}
