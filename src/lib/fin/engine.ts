// Environnement Finance AES — calculs du classeur « AES Burkina Classeur
// Financier V4 » (pôles, CONSOLIDATION, TRÉSORERIE, COMPTE_RÉSULTAT,
// KPI_DASHBOARD), corrigés de ses erreurs de formule :
//  - % réalisé du compte de résultat = réalisé / budget (le classeur
//    divisait le réalisé par lui-même ou par une autre ligne) ;
//  - résultat net = résultat avant impôt − ITS (le classeur oubliait l'impôt) ;
//  - statut des KPI selon leur sens (pour un délai ou un coût, plus bas = mieux).

import type { SaleCalc } from '@/lib/tc/sales';
import type { TcObjective, TcTeam } from '@/lib/tc/types';

export const MONTH_KEYS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'] as const;
type MonthKey = typeof MONTH_KEYS[number];
const sum = (xs: number[]) => xs.reduce((a, b) => a + (Number(b) || 0), 0);
const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);

// ---------------------------------------------------------------------
// Budgets par pôle (budget annuel + réalisé mensuel)
// ---------------------------------------------------------------------
export interface Account { id: string; code: string; name: string; parent_id: string | null; sort_order: number }
export interface BudgetLineRow { id: string; category_id: string | null; pole_id: string | null; line_type: string; m1: number; m2: number; m3: number; m4: number; m5: number; m6: number; m7: number; m8: number; m9: number; m10: number; m11: number; m12: number }

export interface GridRow {
  account: Account;
  isGroup: boolean;
  budget: number;
  months: number[];
  actual: number;
  variance: number;
  rate: number | null;
  budgetLineId?: string;
  actualLineId?: string;
}

const months = (l: BudgetLineRow | undefined) => MONTH_KEYS.map(k => Number(l?.[k]) || 0);

/** Grille d'un pôle (ou de tous les pôles si poleId === null : CONSOLIDATION). */
export function poleGrid(accounts: Account[], lines: BudgetLineRow[], poleId: string | null): { rows: GridRow[]; total: GridRow } {
  const groups = accounts.filter(a => !a.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const inPole = lines.filter(l => poleId === null ? l.pole_id !== null : l.pole_id === poleId);
  const rows: GridRow[] = [];
  const groupTotals: GridRow[] = [];
  for (const g of groups) {
    const children = accounts.filter(a => a.parent_id === g.id).sort((a, b) => a.sort_order - b.sort_order);
    const childRows = children.map(acc => {
      const b = inPole.filter(l => l.category_id === acc.id && l.line_type === 'budget');
      const a = inPole.filter(l => l.category_id === acc.id && l.line_type === 'actual');
      const budget = sum(b.flatMap(months));
      const m = MONTH_KEYS.map((_, i) => sum(a.map(l => months(l)[i])));
      const actual = sum(m);
      return {
        account: acc, isGroup: false, budget, months: m, actual, variance: budget - actual, rate: ratio(actual, budget),
        budgetLineId: poleId ? b[0]?.id : undefined, actualLineId: poleId ? a[0]?.id : undefined,
      };
    });
    const gb = sum(childRows.map(r => r.budget));
    const gm = MONTH_KEYS.map((_, i) => sum(childRows.map(r => r.months[i])));
    const ga = sum(gm);
    const groupRow: GridRow = { account: g, isGroup: true, budget: gb, months: gm, actual: ga, variance: gb - ga, rate: ratio(ga, gb) };
    rows.push(...childRows, groupRow);
    groupTotals.push(groupRow);
  }
  const tb = sum(groupTotals.map(r => r.budget));
  const tm = MONTH_KEYS.map((_, i) => sum(groupTotals.map(r => r.months[i])));
  const ta = sum(tm);
  return {
    rows,
    total: { account: { id: 'total', code: 'TOTAL', name: 'TOTAL', parent_id: null, sort_order: 9999 }, isGroup: true, budget: tb, months: tm, actual: ta, variance: tb - ta, rate: ratio(ta, tb) },
  };
}

/**
 * Répartit un budget annuel sur 12 mois. Si une répartition existe déjà,
 * elle est conservée proportionnellement ; sinon répartition égale. La somme
 * est toujours exactement égale au budget (écart d'arrondi sur décembre).
 */
export function spreadAnnual(annual: number, existing?: number[]): Record<MonthKey, number> {
  const base = existing && sum(existing) > 0 ? existing.map(v => v / sum(existing)) : Array(12).fill(1 / 12);
  const parts = base.map(w => Math.round(annual * w));
  parts[11] += Math.round(annual) - sum(parts);
  return Object.fromEntries(MONTH_KEYS.map((k, i) => [k, parts[i]])) as Record<MonthKey, number>;
}

// ---------------------------------------------------------------------
// Trésorerie
// ---------------------------------------------------------------------
export interface TreasuryLine { code: string; section: 'ENC' | 'DEC'; label: string; sort_order: number }
export interface TreasuryValue { line_code: string; month: number; amount: number }

export function treasury(lines: TreasuryLine[], values: TreasuryValue[], opening: number, threshold: number) {
  const val = (code: string, m: number) => sum(values.filter(v => v.line_code === code && v.month === m).map(v => v.amount));
  const rows = lines.sort((a, b) => a.sort_order - b.sort_order).map(l => {
    const m = Array.from({ length: 12 }, (_, i) => val(l.code, i + 1));
    return { line: l, months: m, total: sum(m), forecast: val(l.code, 0) };
  });
  const enc = rows.filter(r => r.line.section === 'ENC');
  const dec = rows.filter(r => r.line.section === 'DEC');
  const encM = Array.from({ length: 12 }, (_, i) => sum(enc.map(r => r.months[i])));
  const decM = Array.from({ length: 12 }, (_, i) => sum(dec.map(r => r.months[i])));
  const net = encM.map((e, i) => e - decM[i]);
  const openingM: number[] = [];
  const closingM: number[] = [];
  let bal = opening;
  for (let i = 0; i < 12; i++) { openingM.push(bal); bal += net[i]; closingM.push(bal); }
  return {
    enc, dec, encM, decM, net, openingM, closingM,
    totalEnc: sum(encM), totalDec: sum(decM), totalNet: sum(net), finalBalance: bal,
    forecastEnc: sum(enc.map(r => r.forecast)), forecastDec: sum(dec.map(r => r.forecast)),
    belowThreshold: closingM.map(c => threshold > 0 && c < threshold),
    minBalance: Math.min(...closingM),
    averageBalance: sum(closingM) / 12,
  };
}

// ---------------------------------------------------------------------
// Compte de résultat
// ---------------------------------------------------------------------
export interface PnlLine { code: string; section: string; label: string; sort_order: number }
export interface PnlValue { line_code: string; budget: number; actual: number }
export const ITS_RATE = 0.275;

export function pnl(lines: PnlLine[], values: PnlValue[]) {
  const v = (code: string) => values.find(x => x.line_code === code) ?? { budget: 0, actual: 0 };
  const section = (s: string) => lines.filter(l => l.section === s).sort((a, b) => a.sort_order - b.sort_order)
    .map(l => ({ line: l, budget: Number(v(l.code).budget) || 0, actual: Number(v(l.code).actual) || 0 }));
  const tot = (rows: { budget: number; actual: number }[]) => ({ budget: sum(rows.map(r => r.budget)), actual: sum(rows.map(r => r.actual)) });
  const sub = (a: { budget: number; actual: number }, b: { budget: number; actual: number }) => ({ budget: a.budget - b.budget, actual: a.actual - b.actual });
  const S = { produits: section('PRODUITS'), variables: section('VARIABLES'), personnel: section('PERSONNEL'), opex: section('OPEX'), financier: section('FINANCIER'), impot: section('IMPOT') };
  const ca = tot(S.produits);
  const cv = tot(S.variables);
  const grossMargin = sub(ca, cv);
  const personnel = tot(S.personnel);
  const opex = tot(S.opex);
  const ebit = sub(sub(grossMargin, personnel), opex);
  const financial = tot(S.financier);
  const preTax = sub(ebit, financial);
  const tax = tot(S.impot);
  const net = sub(preTax, tax);
  const rate = (x: { budget: number; actual: number }) => ({ budget: ratio(x.budget, ca.budget), actual: ratio(x.actual, ca.actual) });
  return {
    sections: S, ca, cv, grossMargin, grossMarginRate: rate(grossMargin), personnel, opex, ebit, ebitRate: rate(ebit),
    financial, preTax, tax, net, netRate: rate(net),
    /** ITS suggéré à 27,5 % du résultat avant impôt positif. */
    suggestedTax: { budget: Math.max(0, preTax.budget) * ITS_RATE, actual: Math.max(0, preTax.actual) * ITS_RATE },
  };
}

// ---------------------------------------------------------------------
// KPI officiels
// ---------------------------------------------------------------------
export type KpiDirection = 'up' | 'down' | 'target';
export type KpiStatus = '✅ Atteint' | '⚠️ En cours' | '🔴 Alerte' | '— À saisir';

/** Taux d'atteinte : pour « plus bas = mieux », objectif / réalisé. */
export function kpiAttainment(direction: KpiDirection, target: number | null, actual: number | null): number | null {
  if (target === null || actual === null || target === undefined || actual === undefined) return null;
  if (direction === 'up') return target === 0 ? null : actual / target;
  if (direction === 'down') return actual === 0 ? (target >= 0 ? 1 : null) : target / actual;
  return target === 0 ? null : 1 - Math.abs(actual - target) / Math.abs(target);
}

export function kpiStatus(direction: KpiDirection, target: number | null, actual: number | null): KpiStatus {
  const a = kpiAttainment(direction, target, actual);
  if (a === null) return '— À saisir';
  if (direction === 'target') return a >= 0.95 ? '✅ Atteint' : a >= 0.8 ? '⚠️ En cours' : '🔴 Alerte';
  return a >= 1 ? '✅ Atteint' : a >= 0.8 ? '⚠️ En cours' : '🔴 Alerte';
}

const daysBetween = (a: string, b: string) => (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000;
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

/**
 * KPI calculables à partir des données de la plateforme pour un mois
 * (AAAA-MM-01). Les autres KPI (RH, projet, satisfaction…) se saisissent.
 */
export function autoKpis(input: {
  month: string;
  sales: SaleCalc[];
  objectives: TcObjective[];
  teams: TcTeam[];
  pnl?: ReturnType<typeof pnl>;
  treasury?: ReturnType<typeof treasury>;
  budgetExecution?: number | null;
}): Record<string, number | null> {
  const { month, sales } = input;
  const year = month.slice(0, 4);
  const ytd = sales.filter(s => s.saleMonth && s.saleMonth.slice(0, 4) === year && s.saleMonth <= month && s.status !== 'Perdu');
  const monthsElapsed = Number(month.slice(5, 7));
  const soldMonth = sales.filter(s => s.saleMonth === month && s.status !== 'Perdu');
  const quotedMonth = sales.filter(s => s.quoteMonth === month);
  const target = input.objectives.filter(o => o.month.slice(0, 7) === month.slice(0, 7)).reduce((a, o) => a + o.revenue_target, 0);
  const revenueMonth = sum(soldMonth.map(s => s.amountHT));

  // Nouveaux clients : première vente du client dans le mois
  const firstSale = new Map<string, string>();
  for (const s of sales.filter(x => x.isFirm && x.sale.sale_date)) {
    const k = s.sale.client.trim().toLowerCase();
    const d = s.sale.sale_date as string;
    if (!firstSale.has(k) || d < (firstSale.get(k) as string)) firstSale.set(k, d);
  }
  const newClients = [...firstSale.values()].filter(d => d.slice(0, 7) === month.slice(0, 7)).length;

  // DSO : livraison → encaissement complet, ventes soldées
  const settled = sales.filter(s => s.paymentStatus === 'Soldé' && s.sale.delivery_date);
  const dso = avg(settled.map(s => {
    const last = [s.sale.deposit_date, s.sale.balance_date].filter(Boolean).sort().pop() as string;
    return Math.max(0, daysBetween(s.sale.delivery_date as string, last));
  }));
  const closing = avg(sales.filter(s => s.sale.sale_date && s.saleMonth === month).map(s => Math.max(0, daysBetween(s.sale.quote_date, s.sale.sale_date as string))));
  const deliveredMonth = sales.filter(s => s.deliveryMonth === month);
  const onTime = deliveredMonth.filter(s => s.sale.planned_install_date && s.sale.delivery_date && s.sale.delivery_date <= s.sale.planned_install_date);
  const withPlan = deliveredMonth.filter(s => s.sale.planned_install_date);
  const technicians = sum(input.teams.map(t => t.technicians));

  return {
    F1: monthsElapsed ? sum(ytd.map(s => s.amountHT)) / monthsElapsed : null,
    F2: input.pnl?.grossMarginRate.actual ?? null,
    F3: input.pnl ? input.pnl.net.actual : null,
    F4: input.treasury ? input.treasury.averageBalance : null,
    F5: dso,
    F6: input.budgetExecution ?? null,
    C1: ratio(revenueMonth, target),
    C2: newClients,
    C3: quotedMonth.length,
    C4: ratio(quotedMonth.filter(s => s.isFirm).length, quotedMonth.length),
    C5: sum(sales.filter(s => s.status === 'Devis en cours').map(s => s.amountHT)),
    C6: closing,
    T1: onTime.length,
    T2: ratio(onTime.length, withPlan.length),
    T8: technicians ? sum(deliveredMonth.map(s => s.sale.quantity)) / technicians : null,
  };
}

export const KPI_CATEGORY_LABEL: Record<string, string> = {
  FIN: '💰 KPI financiers', COM: '📈 KPI commerciaux', TECH: '⚙️ KPI techniques & opérations', RH: '👥 KPI ressources humaines', PROJ: '🚀 KPI du plan de restructuration',
};

// ---------------------------------------------------------------------
// Pré-remplissage depuis la plateforme (Technico-commercial + pôles)
// ---------------------------------------------------------------------
/** Solution TC → poste de trésorerie / de produit. */
export const SOLUTION_TO_TREASURY: Record<string, string> = { LORENTZ: 'enc_pompage' };
export const SOLUTION_TO_PNL: Record<string, string> = { LORENTZ: 'ca_pompage' };
const DEFAULT_TREASURY = 'enc_pv';
const DEFAULT_PNL = 'ca_pv';

/** Poste du plan de comptes AES (nom) → poste du compte de résultat. */
export const ACCOUNT_TO_PNL: Record<string, string> = {
  'Salaires bruts': 'pe_salaires',
  'Charges sociales patronales (CNSS 16%)': 'pe_cnss',
  'Indemnités & primes de performance': 'pe_primes',
  'Carburant & déplacements terrain': 'op_carburant',
  'Téléphonie & internet': 'op_telecom',
  'Actions marketing & communication': 'op_marketing',
  'Sous-traitance & prestations externes': 'cv_soustraitance',
  'Frais bancaires & agios': 'fi_frais',
  'Fournitures de bureau': 'op_autres',
  'Entretien matériel & équipements': 'op_autres',
  'Déplacements & représentation clients': 'op_autres',
  "Frais de prospection & appels d'offres": 'op_autres',
  'Frais de formation & certification': 'op_autres',
  'Assurances': 'op_autres',
  'Taxes & contributions diverses': 'op_autres',
};

export function finSuggestions(year: number, sales: SaleCalc[], grid: { rows: GridRow[] }) {
  const y = String(year);
  // Trésorerie : encaissements réels du journal, au mois de l'encaissement
  const treasury: Record<string, number[]> = {};
  for (const s of sales) {
    const code = SOLUTION_TO_TREASURY[s.solution] ?? DEFAULT_TREASURY;
    for (const [amount, date] of [[s.sale.deposit_amount, s.sale.deposit_date], [s.sale.balance_amount, s.sale.balance_date]] as [number, string | null | undefined][]) {
      if (!amount || !date || date.slice(0, 4) !== y) continue;
      treasury[code] ??= Array(12).fill(0);
      treasury[code][Number(date.slice(5, 7)) - 1] += amount;
    }
  }
  // Compte de résultat : ventes fermes de l'exercice (HT), coût des kits, commissions
  const pnlActual: Record<string, number> = {};
  const add = (k: string, v: number) => { pnlActual[k] = (pnlActual[k] ?? 0) + v; };
  for (const s of sales.filter(x => x.isFirm && x.saleMonth?.slice(0, 4) === y)) {
    add(SOLUTION_TO_PNL[s.solution] ?? DEFAULT_PNL, s.amountHT);
    add('cv_marchandises', s.costTotal);
    add('cv_commissions', s.commissionBase);
  }
  for (const r of grid.rows.filter(x => !x.isGroup)) {
    const code = ACCOUNT_TO_PNL[r.account.name];
    if (code && r.actual) add(code, r.actual);
  }
  return { treasury, pnlActual };
}
