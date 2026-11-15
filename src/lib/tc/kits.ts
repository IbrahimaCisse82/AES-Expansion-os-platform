// Modélisation des kits — reprise exacte des onglets VICTRON…SPARK,
// STOCK (réservations) et SYNTHESE du classeur technico-commercial.
//
// Règle de réservation du stock (DIRECTIVES §6) : un article utilisé dans
// plusieurs kits n'est compté qu'une fois ; le stock est réservé dans
// l'ordre des solutions (VICTRON → HUAWEI → LORENTZ → CUISSON → SPARK),
// puis kit par kit (PETIT → MOYEN → GRAND), puis ligne par ligne.
// Ce qui manque est acheté au prix fournisseur le plus bas.

import { VARIANT_ORDER, type TcData, type TcKit, type TcSupplierPrice } from './types';

export type MaterialStatus = 'Stock OK' | 'Achat requis' | 'Prix fournisseur manquant' | 'CU stock manquant';

export interface MaterialLine {
  line_no: number;
  designation: string;
  unit: string;
  required: number;
  stockInitial: number;
  alreadyReserved: number;
  stockAvailable: number;
  fromStock: number;
  toBuy: number;
  stockUnitCost: number;
  supplierUnitCost: number;
  supplier: string;
  stockCost: number;
  purchaseCost: number;
  totalCost: number;
  status: MaterialStatus;
}

export interface LaborLine {
  line_no: number;
  profileId: string;
  profileName: string;
  people: number;
  hoursPerPerson: number;
  totalHours: number;
  hourlyRate: number;
  cost: number;
  status: '' | 'Taux horaire manquant';
}

export interface KitCost {
  kit: TcKit;
  material: MaterialLine[];
  labor: LaborLine[];
  materialFromStock: number;
  materialToBuy: number;
  materialTotal: number;
  laborCost: number;
  laborHours: number;
  transport: number;
  contingencyRate: number;
  contingency: number;
  costPrice: number;
  marginRate: number;
  margin: number;
  priceHT: number;
  vat: number;
  priceTTC: number;
  stockShare: number;
  warnings: string[];
}

export interface KitsResult {
  kits: KitCost[];
  byId: Map<string, KitCost>;
  /** Quantité réservée par article et par solution (onglet STOCK). */
  reservations: Map<string, Map<string, number>>;
}

const norm = (s: string) => s.trim().toUpperCase();

/** Prix fournisseur le plus bas d'un article (MINIFS) et le fournisseur correspondant. */
export function bestSupplierPrice(designation: string, prices: TcSupplierPrice[]): TcSupplierPrice | null {
  const key = norm(designation);
  let best: TcSupplierPrice | null = null;
  for (const p of prices) {
    if (norm(p.designation) !== key || !(p.unit_price > 0)) continue;
    if (!best || p.unit_price < best.unit_price) best = p;
  }
  return best;
}

/** Ordre de réservation : priorité de la solution, variante, ordre d'affichage. */
export function sortKitsForReservation(kits: TcKit[], solutionPriority: Map<string, number>): TcKit[] {
  const variantRank = (v: string) => {
    const i = VARIANT_ORDER.indexOf(v.toUpperCase());
    return i === -1 ? VARIANT_ORDER.length : i;
  };
  return [...kits].sort((a, b) =>
    (solutionPriority.get(a.solution_code) ?? 99) - (solutionPriority.get(b.solution_code) ?? 99)
    || variantRank(a.variant) - variantRank(b.variant)
    || a.sort_order - b.sort_order
    || a.code.localeCompare(b.code));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeKits(data: Pick<TcData, 'settings' | 'solutions' | 'labor' | 'stock' | 'supplierPrices' | 'kits' | 'kitItems' | 'kitLabor'>): KitsResult {
  const { settings } = data;
  const priority = new Map(data.solutions.map(s => [s.code, s.reservation_priority]));
  const stockByKey = new Map(data.stock.map(s => [norm(s.designation), s]));
  const laborById = new Map(data.labor.map(l => [l.id, l]));
  const reservedSoFar = new Map<string, number>();
  const reservations = new Map<string, Map<string, number>>();

  const kits: KitCost[] = [];
  for (const kit of sortKitsForReservation(data.kits.filter(k => k.active), priority)) {
    const items = data.kitItems.filter(i => i.kit_id === kit.id).sort((a, b) => a.line_no - b.line_no);
    const warnings: string[] = [];

    const material: MaterialLine[] = items.map(item => {
      const key = norm(item.designation);
      const stock = stockByKey.get(key);
      const stockInitial = stock?.quantity ?? 0;
      const alreadyReserved = reservedSoFar.get(key) ?? 0;
      const stockAvailable = Math.max(0, stockInitial - alreadyReserved);
      const required = Number(item.quantity) || 0;
      const fromStock = Math.min(required, stockAvailable);
      const toBuy = required - fromStock;
      const stockUnitCost = stock?.unit_cost ?? 0;
      const best = bestSupplierPrice(item.designation, data.supplierPrices);
      const supplierUnitCost = best?.unit_price ?? 0;

      reservedSoFar.set(key, alreadyReserved + fromStock);
      if (fromStock > 0) {
        const bySolution = reservations.get(key) ?? new Map<string, number>();
        bySolution.set(kit.solution_code, (bySolution.get(kit.solution_code) ?? 0) + fromStock);
        reservations.set(key, bySolution);
      }

      const status: MaterialStatus =
        toBuy > 0 && supplierUnitCost === 0 ? 'Prix fournisseur manquant'
        : fromStock > 0 && stockUnitCost === 0 ? 'CU stock manquant'
        : toBuy > 0 ? 'Achat requis'
        : 'Stock OK';
      if (status === 'Prix fournisseur manquant' || status === 'CU stock manquant') {
        warnings.push(`${item.designation} : ${status.toLowerCase()}`);
      }

      const stockCost = fromStock * stockUnitCost;
      const purchaseCost = toBuy * supplierUnitCost;
      return {
        line_no: item.line_no, designation: item.designation, unit: item.unit, required,
        stockInitial, alreadyReserved, stockAvailable, fromStock, toBuy,
        stockUnitCost, supplierUnitCost, supplier: best?.supplier ?? '',
        stockCost, purchaseCost, totalCost: stockCost + purchaseCost, status,
      };
    });

    const labor: LaborLine[] = data.kitLabor
      .filter(l => l.kit_id === kit.id)
      .sort((a, b) => a.line_no - b.line_no)
      .map(l => {
        const profile = laborById.get(l.profile_id);
        const totalHours = (Number(l.people) || 0) * (Number(l.hours_per_person) || 0);
        const hourlyRate = profile?.hourly_rate ?? 0;
        if (hourlyRate === 0) warnings.push(`${profile?.name ?? 'Profil'} : taux horaire manquant`);
        return {
          line_no: l.line_no, profileId: l.profile_id, profileName: profile?.name ?? '—',
          people: Number(l.people) || 0, hoursPerPerson: Number(l.hours_per_person) || 0,
          totalHours, hourlyRate, cost: totalHours * hourlyRate,
          status: hourlyRate === 0 ? 'Taux horaire manquant' : '',
        };
      });

    const materialFromStock = material.reduce((s, m) => s + m.stockCost, 0);
    const materialToBuy = material.reduce((s, m) => s + m.purchaseCost, 0);
    const materialTotal = materialFromStock + materialToBuy;
    const laborCost = labor.reduce((s, l) => s + l.cost, 0);
    const laborHours = labor.reduce((s, l) => s + l.totalHours, 0);
    const transport = Number(kit.transport_cost) || 0;
    const contingencyRate = settings.contingency_rate;
    const contingency = contingencyRate * (materialTotal + laborCost + transport);
    const costPrice = materialTotal + laborCost + transport + contingency;
    const marginRate = kit.margin_rate ?? settings.margin_rate;
    const margin = costPrice * marginRate;
    const priceHT = costPrice + margin;
    const vat = priceHT * settings.vat_rate;

    kits.push({
      kit, material, labor,
      materialFromStock: round2(materialFromStock),
      materialToBuy: round2(materialToBuy),
      materialTotal: round2(materialTotal),
      laborCost: round2(laborCost),
      laborHours,
      transport,
      contingencyRate,
      contingency: round2(contingency),
      costPrice: round2(costPrice),
      marginRate,
      margin: round2(margin),
      priceHT: round2(priceHT),
      vat: round2(vat),
      priceTTC: round2(priceHT + vat),
      stockShare: materialTotal === 0 ? 0 : materialFromStock / materialTotal,
      warnings,
    });
  }

  return { kits, byId: new Map(kits.map(k => [k.kit.id, k])), reservations };
}

/** Onglet STOCK : réservé par solution, stock restant, valeur restante. */
export interface StockRow {
  item: TcData['stock'][number];
  value: number;
  reservedBySolution: Record<string, number>;
  reservedTotal: number;
  remaining: number;
  remainingValue: number;
}

export function stockWithReservations(stock: TcData['stock'], reservations: KitsResult['reservations']): StockRow[] {
  return stock.map(item => {
    const bySolution = reservations.get(norm(item.designation)) ?? new Map<string, number>();
    const reservedBySolution = Object.fromEntries(bySolution);
    const reservedTotal = [...bySolution.values()].reduce((a, b) => a + b, 0);
    const remaining = item.quantity - reservedTotal;
    return {
      item,
      value: item.quantity * item.unit_cost,
      reservedBySolution,
      reservedTotal,
      remaining,
      remainingValue: remaining * item.unit_cost,
    };
  });
}
