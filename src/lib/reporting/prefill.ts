// Pré-remplissage des rapports A1–A12 à partir des données déjà saisies dans la plateforme :
// journal des ventes (technico-commercial), finance (P&L, trésorerie) et KPI officiels.
// Tout est pur et testable ; l'écran fusionne le résultat avec la saisie existante (mergePrefill).
import type { SaleCalc } from '@/lib/tc/sales';
import type { TcData } from '@/lib/tc/types';
import { capacityPlan, type NeedRow } from '@/lib/tc/aggregates';
import { autoKpis, SOLUTION_TO_PNL, type PnlLine, type PnlValue, type treasury as treasuryFn } from '@/lib/fin/engine';
import { computeCell, isGroupRow, periodRange, ragFromAttainment, templateByCode, type ReportData, type TableRow } from './templates';

export interface FinSnapshot {
  pnlLines: PnlLine[];
  pnlValues: PnlValue[];
  treasury: ReturnType<typeof treasuryFn> | null;
  kpiValues: { kpi_code: string; month: string; target: number | null; actual: number | null }[];
}

export interface PrefillContext {
  period: string;
  tc: Pick<TcData, 'objectives' | 'teams' | 'kitItems' | 'zones' | 'kits'>;
  sales: SaleCalc[];
  needs?: NeedRow[];
  fin?: FinSnapshot | null;
  /** A12 : vente / installation de départ. */
  saleId?: string | null;
}

const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + (f(x) || 0), 0);
const inRange = (d: string | null | undefined, r: { from: string; to: string }) => !!d && d >= r.from && d <= r.to;
const round = (v: number, digits = 0) => { const k = 10 ** digits; return Math.round(v * k) / k; };
const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : round(v * 100, 1));
const daysInMonth = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
const withStatus = (r: TableRow): TableRow => {
  const att = computeCell('attainment', r);
  return att === null ? r : { ...r, status: ragFromAttainment(att) };
};
const monthsOf = (r: { from: string; to: string }) => {
  const out: string[] = [];
  for (let d = new Date(`${r.from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 10) <= r.to; d.setUTCMonth(d.getUTCMonth() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
};
const firm = (s: SaleCalc) => s.isFirm && !!s.sale.sale_date;

export function prefill(code: string, ctx: PrefillContext): ReportData {
  const r = periodRange(ctx.period);
  if (!r && code !== 'A12') return {};
  switch (code) {
    case 'A1': return prefillA1(ctx, r!);
    case 'A2': return prefillA2(ctx, r!);
    case 'A3': return prefillA3(ctx, r!);
    case 'A4': return prefillA4(ctx, r!);
    case 'A5': return prefillA5(ctx, r!);
    case 'A10': return prefillA10(ctx, r!);
    case 'A12': return prefillA12(ctx);
    default: return {};
  }
}

function prefillA1(ctx: PrefillContext, r: { from: string; to: string }): ReportData {
  const month = `${r.from.slice(0, 7)}-01`;
  const share = 7 / daysInMonth(month);
  const objs = ctx.tc.objectives.filter(o => o.month === month);
  const signed = ctx.sales.filter(s => firm(s) && inRange(s.sale.sale_date, r));
  const collected = sum(ctx.sales, s => (inRange(s.sale.deposit_date, r) ? Number(s.sale.deposit_amount) : 0) + (inRange(s.sale.balance_date, r) ? Number(s.sale.balance_amount) : 0));
  const kpis: TableRow[] = [
    withStatus({ label: 'CA signé (FCFA)', target: objs.length ? round(sum(objs, o => o.revenue_target) * share) : null, actual: round(sum(signed, s => s.amountHT)) }),
    withStatus({ label: 'Ventes signées (nb)', target: objs.length ? round(sum(objs, o => o.kits_target) * share, 1) : null, actual: signed.length }),
    { label: 'Devis émis (nb)', actual: ctx.sales.filter(s => inRange(s.sale.quote_date, r)).length },
    { label: 'Encaissements (FCFA)', actual: round(collected) },
    { label: 'Livraisons / installations (nb)', actual: ctx.sales.filter(s => inRange(s.sale.delivery_date, r)).length },
  ];
  const late = ctx.sales.filter(s => (s.remaining ?? 0) > 0 && (s.daysLate ?? 0) > 0).sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0)).slice(0, 5);
  const alerts = late.map(s => `• Créance en retard : ${s.sale.client} (${s.sale.quote_no}) — ${Math.round(s.remaining ?? 0).toLocaleString('fr-FR')} FCFA, ${s.daysLate} j de retard`);
  return { kpis, ...(alerts.length ? { alerts: alerts.join('\n') } : {}) };
}

function prefillA2(ctx: PrefillContext, r: { from: string; to: string }): ReportData {
  const month = `${r.from.slice(0, 7)}-01`;
  const objs = ctx.tc.objectives.filter(o => o.month === month);
  const signed = ctx.sales.filter(s => firm(s) && s.saleMonth === month);
  const quotes = ctx.sales.filter(s => s.quoteMonth === month);
  const k = autoKpis({ month, sales: ctx.sales, objectives: ctx.tc.objectives, teams: ctx.tc.teams });
  const ca = sum(signed, s => s.amountHT);
  const rows: Record<string, TableRow> = {
    'CA réalisé (FCFA)': withStatus({ target: objs.length ? sum(objs, o => o.revenue_target) : null, actual: round(ca) }),
    'Nombre de devis émis': { actual: quotes.length },
    'Nombre de commandes reçues': withStatus({ target: objs.length ? sum(objs, o => o.kits_target) : null, actual: signed.length }),
    'Taux de conversion (%)': { actual: pct(quotes.length ? quotes.filter(s => s.isFirm).length / quotes.length : null) },
    'Valeur des commandes (FCFA)': { actual: round(sum(signed, s => s.amountTTC)) },
    'Nombre de nouveaux clients': { actual: k.C2 ?? null },
    'Délai moyen de vente (jours)': { actual: k.C6 === null || k.C6 === undefined ? null : round(k.C6, 1) },
  };
  const pipeline: TableRow[] = ctx.sales
    .filter(s => s.status === 'Devis en cours' && s.sale.quote_date <= r.to)
    .sort((a, b) => b.amountHT - a.amountHT)
    .map(s => ({ label: s.sale.client, product: s.kitName, value: round(s.amountHT), stage: 'Devis', prob: pct(s.probability), close: s.sale.planned_install_date ?? null, rep: s.sale.salesperson ?? null }));
  const byRep = new Map<string, TableRow>();
  for (const s of ctx.sales) {
    const inQuotes = s.quoteMonth === month, inSales = firm(s) && s.saleMonth === month;
    if (!inQuotes && !inSales) continue;
    const key = s.sale.salesperson?.trim() || '(non renseigné)';
    const row = byRep.get(key) ?? { label: key, quotes: 0, sales: 0, actual: 0 };
    if (inQuotes) row.quotes = Number(row.quotes) + 1;
    if (inSales) { row.sales = Number(row.sales) + 1; row.actual = round(Number(row.actual) + s.amountHT); }
    byRep.set(key, row);
  }
  return { kpis: rows, pipeline, ...(byRep.size ? { reps: [...byRep.values()] } : {}) };
}

function prefillA3(ctx: PrefillContext, r: { from: string; to: string }): ReportData {
  const month = `${r.from.slice(0, 7)}-01`;
  const k = autoKpis({ month, sales: ctx.sales, objectives: ctx.tc.objectives, teams: ctx.tc.teams });
  const cap = capacityPlan(ctx.tc.teams, ctx.sales, [month]);
  const capacity = sum(cap, c => c.capacity), load = sum(cap, c => c.load[month]);
  const kpis: Record<string, TableRow> = {
    "Nombre d'interventions réalisées": { actual: ctx.sales.filter(s => inRange(s.sale.delivery_date, r)).length },
    'Projets livrés dans les délais (%)': { actual: pct(k.T2) },
    "Taux d'utilisation des techniciens (%)": { actual: capacity ? pct(load / capacity) : null },
  };
  const projects: TableRow[] = ctx.sales
    .filter(s => s.status === 'Vendu' && (s.sale.sale_date ?? '') <= r.to)
    .map(s => ({
      label: `${s.sale.client} — ${s.sale.quote_no}`, type: s.kitName, start: s.sale.sale_date ?? null, due: s.sale.planned_install_date ?? null,
      techs: s.teamName, status: s.sale.planned_install_date ? 'Planifié' : 'En cours',
    }));
  const stock: TableRow[] = (ctx.needs ?? [])
    .filter(n => n.toOrder > 0 || n.status === 'Risque rupture (devis)')
    .sort((a, b) => b.toOrder - a.toOrder)
    .map(n => ({
      label: n.designation, stock: round(n.stockInitial - n.consumed, 2), min: round(n.firmNeed, 2), order: round(n.toOrder, 2),
      urgency: n.toOrder > 0 ? 'Haute' : 'Moyenne', supplier: n.supplier || null,
    }));
  return { kpis, ...(projects.length ? { projects } : {}), ...(stock.length ? { stock } : {}) };
}

/** Rubriques du compte de résultat simplifié (A4) → codes du compte de résultat AES. */
export const A4_PNL_MAP: Record<string, string[]> = {
  'CA Installations solaires': ['ca_pv', 'ca_elec'],
  'CA Pompage solaire': ['ca_pompage'],
  'CA Chambres froides': ['ca_froid'],
  'CA SAV & Maintenance': ['ca_sav', 'ca_subv'],
  'Achats matériel & équipements': ['cv_marchandises', 'cv_matieres'],
  'Sous-traitance technique': ['cv_soustraitance'],
  'Transport & déplacements terrain': ['op_carburant'],
  'Salaires & charges sociales': ['pe_salaires', 'pe_cnss', 'pe_primes'],
  'Loyers & charges locatives': ['op_loyers'],
  'Frais administratifs & bureautique': ['op_telecom'],
  'Frais marketing & communication': ['op_marketing'],
  'Autres charges': ['op_autres', 'cv_commissions', 'fi_interets', 'fi_frais', 'is_its'],
};
const CA_ROWS = ['CA Installations solaires', 'CA Pompage solaire', 'CA Chambres froides', 'CA SAV & Maintenance', 'CA Agence Bobo'];
const DIRECT_ROWS = ['Achats matériel & équipements', 'Sous-traitance technique', 'Transport & déplacements terrain'];
const STRUCT_ROWS = ['Salaires & charges sociales', 'Loyers & charges locatives', 'Frais administratifs & bureautique', 'Frais marketing & communication', 'Amortissements', 'Autres charges'];

function prefillA4(ctx: PrefillContext, r: { from: string; to: string }): ReportData {
  const out: ReportData = {};
  const month = `${r.from.slice(0, 7)}-01`;
  const mi = Number(r.from.slice(5, 7));
  const fin = ctx.fin;
  if (fin && fin.pnlLines.length) {
    const v = (codes: string[]) => ({
      budget: sum(codes, c => fin.pnlValues.find(x => x.line_code === c)?.budget ?? 0),
      actual: sum(codes, c => fin.pnlValues.find(x => x.line_code === c)?.actual ?? 0),
    });
    const signed = ctx.sales.filter(s => firm(s) && s.saleMonth === month);
    const caMonth = (codes: string[]) => sum(signed.filter(s => codes.includes(SOLUTION_TO_PNL[s.solution] ?? 'ca_pv')), s => s.amountHT);
    const rows: Record<string, TableRow> = {};
    const totals = new Map<string, { b: number; a: number; m: number | null }>();
    for (const [label, codes] of Object.entries(A4_PNL_MAP)) {
      const x = v(codes);
      const m = CA_ROWS.includes(label) ? caMonth(codes) : null;
      totals.set(label, { b: x.budget, a: x.actual, m });
      rows[label] = { budget_m: round(x.budget / 12), month: m === null ? null : round(m), actual: round(x.actual), target: round(x.budget * mi / 12) };
    }
    const agg = (labels: string[]) => {
      const xs = labels.map(l => totals.get(l)).filter(Boolean) as { b: number; a: number; m: number | null }[];
      return { b: sum(xs, x => x.b), a: sum(xs, x => x.a), m: xs.some(x => x.m !== null) ? sum(xs, x => x.m ?? 0) : null };
    };
    const put = (label: string, x: { b: number; a: number; m: number | null }) => { rows[label] = { budget_m: round(x.b / 12), month: x.m === null ? null : round(x.m), actual: round(x.a), target: round(x.b * mi / 12) }; };
    const ca = agg(CA_ROWS), direct = agg(DIRECT_ROWS), struct = agg(STRUCT_ROWS);
    put('TOTAL CA', ca);
    put('MARGE BRUTE', { b: ca.b - direct.b, a: ca.a - direct.a, m: null });
    put('TOTAL CHARGES', { b: direct.b + struct.b, a: direct.a + struct.a, m: null });
    put('RÉSULTAT NET', { b: ca.b - direct.b - struct.b, a: ca.a - direct.a - struct.a, m: null });
    out.pnl = rows;
  }
  const t = fin?.treasury;
  if (t) {
    const at = (rows: typeof t.enc, codes: string[] | null, exclude: string[] = []) =>
      sum(rows.filter(x => (codes ? codes.includes(x.line.code) : !exclude.includes(x.line.code))), x => x.months[mi - 1]);
    const otherIn = ['enc_subv', 'enc_autres'];
    const known = ['dec_achats', 'dec_soustraitance', 'dec_fournitures', 'dec_personnel', 'dec_tva'];
    out.cash = {
      'TOTAL MOIS': {
        open: round(t.openingM[mi - 1]), in_clients: round(at(t.enc, null, otherIn)), in_other: round(at(t.enc, otherIn)),
        out_suppliers: round(at(t.dec, ['dec_achats', 'dec_soustraitance', 'dec_fournitures'])), out_salaries: round(at(t.dec, ['dec_personnel'])),
        out_tax: round(at(t.dec, ['dec_tva'])), out_other: round(at(t.dec, null, known)), close: round(t.closingM[mi - 1]),
        alert: t.belowThreshold[mi - 1] ? 'Sous le seuil minimal' : t.closingM[mi - 1] < 0 ? 'Trésorerie négative' : null,
      },
    };
    // Prévision M+1..M+3 : moyenne des mois réalisés pour les charges récurrentes
    const past = Array.from({ length: mi }, (_, i) => i);
    const avg = (codes: string[]) => { const xs = past.map(i => sum(t.dec.filter(x => codes.includes(x.line.code)), x => x.months[i])).filter(x => x > 0); return xs.length ? round(sum(xs, x => x) / xs.length) : 0; };
    const salaries = avg(['dec_personnel']), suppliers = avg(['dec_achats', 'dec_soustraitance']), taxes = avg(['dec_tva']);
    const bucket = (s: SaleCalc) => {
      const d = s.sale.planned_install_date;
      if (!d) return 2;
      const diff = (Number(d.slice(0, 4)) - Number(month.slice(0, 4))) * 12 + Number(d.slice(5, 7)) - mi;
      return Math.min(3, Math.max(1, diff));
    };
    const confirmed = round(sum(ctx.sales.filter(s => s.isFirm), s => Math.max(0, s.remaining ?? 0)));
    const hot = [0, 0, 0];
    for (const s of ctx.sales.filter(x => x.status === 'Devis en cours' && x.probability >= 0.5)) hot[bucket(s) - 1] += s.amountTTC;
    const enc = [confirmed + hot[0], hot[1], hot[2]];
    const dec = [salaries + suppliers + taxes, salaries + suppliers + taxes, salaries + suppliers + taxes];
    out.forecast = {
      'Clients confirmés': { m1: confirmed, m2: 0, m3: 0 },
      'Pipeline à fort % closing': { m1: round(hot[0]), m2: round(hot[1]), m3: round(hot[2]) },
      'Salaires & charges sociales': { m1: salaries, m2: salaries, m3: salaries },
      'Fournisseurs à payer': { m1: suppliers, m2: suppliers, m3: suppliers },
      'Taxes et impôts': { m1: taxes, m2: taxes, m3: taxes },
      'SOLDE NET PRÉVISIONNEL': { m1: round(enc[0] - dec[0]), m2: round(enc[1] - dec[1]), m3: round(enc[2] - dec[2]) },
    };
  }
  const receivables: TableRow[] = ctx.sales
    .filter(s => (s.remaining ?? 0) > 0)
    .sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0))
    .map(s => ({ label: s.sale.client, invoice: s.sale.quote_no, amount: round(s.remaining ?? 0), date: s.sale.sale_date ?? null, late: s.daysLate ?? 0, status: s.paymentStatus || null }));
  if (receivables.length) out.receivables = receivables;
  return out;
}

const kpiAt = (fin: FinSnapshot | null | undefined, code: string, month: string) => fin?.kpiValues.find(v => v.kpi_code === code && v.month === month) ?? null;
const prevMonth = (m: string) => { const d = new Date(`${m}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 10); };

function prefillA5(ctx: PrefillContext, r: { from: string; to: string }): ReportData {
  const month = `${r.from.slice(0, 7)}-01`;
  const row = (code: string, isPct = false): TableRow | null => {
    const cur = kpiAt(ctx.fin, code, month), prev = kpiAt(ctx.fin, code, prevMonth(month));
    if (!cur && !prev) return null;
    const f = (v: number | null | undefined) => (v === null || v === undefined ? null : isPct ? pct(Number(v)) : Number(v));
    const a = f(cur?.actual), p = f(prev?.actual);
    return { target: f(cur?.target), actual: a, previous: p, trend: a === null || p === null ? null : a > p ? '↑' : a < p ? '↓' : '=' };
  };
  const kpis: Record<string, TableRow> = {};
  const add = (label: string, x: TableRow | null) => { if (x) kpis[label] = x; };
  add('Effectif total', row('RH1'));
  add('Taux de présence (%) — objectif ≥ 95 %', row('RH2', true));
  add('Taux de rotation annualisé (%) — < 10 %', row('RH4', true));
  const headcount = kpiAt(ctx.fin, 'RH1', month)?.actual;
  return { ...(Object.keys(kpis).length ? { kpis } : {}), ...(headcount !== null && headcount !== undefined ? { headcount: Number(headcount) } : {}) };
}

function prefillA10(ctx: PrefillContext, r: { from: string; to: string }): ReportData {
  const months = monthsOf(r);
  const year = r.from.slice(0, 4);
  const ytd = { from: `${year}-01-01`, to: r.to };
  const prevQ = (() => { const d = new Date(`${r.from}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 3); const f = d.toISOString().slice(0, 10); const e = new Date(`${r.from}T00:00:00Z`); e.setUTCDate(0); return { from: f, to: e.toISOString().slice(0, 10) }; })();
  const signedIn = (rg: { from: string; to: string }) => ctx.sales.filter(s => firm(s) && inRange(s.sale.sale_date, rg));
  const caOf = (rg: { from: string; to: string }) => round(sum(signedIn(rg), s => s.amountHT));
  const gmOf = (rg: { from: string; to: string }) => round(sum(signedIn(rg), s => s.grossMargin));
  const gmRate = (rg: { from: string; to: string }) => { const ca = sum(signedIn(rg), s => s.amountHT); return ca ? pct(sum(signedIn(rg), s => s.grossMargin) / ca) : null; };
  const objYear = ctx.tc.objectives.filter(o => o.month.startsWith(year)), objQ = ctx.tc.objectives.filter(o => months.includes(o.month));
  const quotesQ = ctx.sales.filter(s => inRange(s.sale.quote_date, r));
  const lastKpi = (code: string, isPct = false) => {
    for (const m of [...months].reverse()) { const v = kpiAt(ctx.fin, code, m); if (v && v.actual !== null && v.actual !== undefined) return isPct ? pct(Number(v.actual)) : Number(v.actual); }
    return null;
  };
  const pnlNet = (() => {
    if (!ctx.fin?.pnlLines.length) return null;
    const by = (sec: string, field: 'budget' | 'actual') => sum(ctx.fin!.pnlLines.filter(l => l.section === sec), l => ctx.fin!.pnlValues.find(v => v.line_code === l.code)?.[field] ?? 0);
    const net = (f: 'budget' | 'actual') => by('PRODUITS', f) - by('VARIABLES', f) - by('PERSONNEL', f) - by('OPEX', f) - by('FINANCIER', f) - by('IMPOT', f);
    return { budget: round(net('budget')), actual: round(net('actual')), caBudget: round(by('PRODUITS', 'budget')), gmBudget: round(by('PRODUITS', 'budget') - by('VARIABLES', 'budget')) };
  })();
  const qEnd = Number(r.to.slice(5, 7));
  const kpis: Record<string, TableRow> = {
    "Chiffre d'affaires (FCFA)": withStatus({ annual: objYear.length ? sum(objYear, o => o.revenue_target) : pnlNet?.caBudget ?? null, target: objQ.length ? sum(objQ, o => o.revenue_target) : null, actual: caOf(r), ytd: caOf(ytd) }),
    'Marge brute (%)': { actual: gmRate(r), ytd: gmRate(ytd) },
    'Résultat net (FCFA)': { annual: pnlNet?.budget ?? null, ytd: pnlNet?.actual ?? null },
    'Trésorerie fin de T (FCFA)': { actual: ctx.fin?.treasury ? round(ctx.fin.treasury.closingM[qEnd - 1]) : null },
    'Nombre de projets livrés': { actual: ctx.sales.filter(s => inRange(s.sale.delivery_date, r)).length, ytd: ctx.sales.filter(s => inRange(s.sale.delivery_date, ytd)).length },
    'Taux de conversion comm. (%)': { actual: pct(quotesQ.length ? quotesQ.filter(s => s.isFirm).length / quotesQ.length : null) },
    'Taux de conformité technique (%)': { actual: lastKpi('T4', true) },
    '% collaborateurs évalués': { actual: lastKpi('RH5', true) },
    'Heures de formation cumulées': { actual: lastKpi('RH7') },
    'Score moyen évaluation (/4)': { actual: lastKpi('RH6') },
    "Taux d'absentéisme (%)": { actual: lastKpi('RH3', true) },
  };
  const ca = caOf(r), caYtd = caOf(ytd);
  const finance: Record<string, TableRow> = {
    "Chiffre d'affaires": { actual: ca, target: caOf(prevQ), budget: pnlNet?.caBudget ?? null, consumed: pnlNet?.caBudget ? pct(caYtd / pnlNet.caBudget) : null },
    'Marge brute': { actual: gmOf(r), target: gmOf(prevQ), budget: pnlNet?.gmBudget ?? null, consumed: pnlNet?.gmBudget ? pct(gmOf(ytd) / pnlNet.gmBudget) : null },
    'Résultat net': { budget: pnlNet?.budget ?? null },
  };
  return { kpis, finance };
}

function prefillA12(ctx: PrefillContext): ReportData {
  const s = ctx.sales.find(x => x.sale.id === ctx.saleId);
  if (!s) return {};
  const zone = ctx.tc.zones.find(z => z.id === s.sale.zone_id);
  const materials: TableRow[] = ctx.tc.kitItems
    .filter(i => i.kit_id === s.sale.kit_id && i.quantity > 0)
    .sort((a, b) => a.line_no - b.line_no)
    .map(i => ({ label: i.designation, qty: round(i.quantity * s.sale.quantity, 2), origin: 'Stock' }));
  return {
    sheet_no: `FI-${s.sale.quote_no}`,
    date: s.sale.planned_install_date ?? s.sale.delivery_date ?? null,
    client: s.sale.client,
    site: zone?.name ?? null,
    techs: s.teamName,
    type: 'Installation',
    duration: s.installHours ? round(s.installHours / Math.max(1, s.sale.mission_people ?? 1), 1) : null,
    work: `Installation ${s.kitName} × ${s.sale.quantity} — devis ${s.sale.quote_no}`,
    ...(materials.length ? { materials } : {}),
  };
}

// ---------------------------------------------------------------------
// Fusion avec la saisie
// ---------------------------------------------------------------------
/**
 * Fusionne le pré-remplissage dans les données du rapport :
 * - tableaux à lignes prédéfinies : la valeur pré-remplie remplace la cellule (objet {libellé: ligne}) ;
 * - tableaux libres : les lignes calculées remplacent les lignes vides, les lignes saisies sont conservées ;
 * - champs et textes : remplis seulement s'ils sont vides.
 */
export function mergePrefill(code: string, current: ReportData, pre: ReportData): ReportData {
  const t = templateByCode(code);
  if (!t) return current;
  const out: ReportData = { ...current };
  for (const [key, value] of Object.entries(pre)) {
    const section = t.sections.find(s => s.kind === 'table' && s.key === key);
    if (section && section.kind === 'table') {
      const rows = (Array.isArray(current[key]) ? current[key] : []) as TableRow[];
      if (Array.isArray(value)) {
        const filled = rows.filter(r => Object.entries(r).some(([k, v]) => k !== 'label' && v !== null && v !== ''));
        const fresh = (value as TableRow[]).filter(v => !filled.some(f => f.label === v.label && (f.invoice ?? f.product ?? null) === (v.invoice ?? v.product ?? null)));
        out[key] = [...filled, ...fresh];
      } else {
        const patch = value as Record<string, TableRow>;
        const base = rows.length ? rows : (section.rows ?? []).map(label => ({ label }));
        out[key] = base.map(r => (isGroupRow(r.label) || !patch[String(r.label)]) ? r
          : { ...r, ...Object.fromEntries(Object.entries(patch[String(r.label)]).filter(([, v]) => v !== null && v !== undefined)) });
      }
    } else if (current[key] === undefined || current[key] === null || current[key] === '') {
      out[key] = value;
    }
  }
  return out;
}
