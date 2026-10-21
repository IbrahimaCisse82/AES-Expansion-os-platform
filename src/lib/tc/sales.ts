// Journal des ventes — colonnes calculées de JOURNAL_VENTES (classeur AES).

import type { KitsResult } from './kits';
import type { TcData, TcSale, TcSettings, TcZone } from './types';

export type SaleStatus = 'Devis en cours' | 'Vendu' | 'Livré' | 'Perdu';
export type PaymentStatus = '' | 'Non payé' | 'Partiel' | 'Soldé';

export interface SaleCalc {
  sale: TcSale;
  status: SaleStatus;
  solution: string;
  kitCode: string;
  kitName: string;
  teamName: string;
  quoteMonth: string;
  saleMonth: string | null;
  deliveryMonth: string | null;
  installMonth: string | null;
  catalogPrice: number;
  amountHT: number;
  unitCost: number;
  costTotal: number;
  grossMargin: number;
  grossMarginRate: number | null;
  amountTTC: number;
  collected: number;
  /** null quand la ligne n'est pas une vente ferme (devis, perdu). */
  remaining: number | null;
  paymentStatus: PaymentStatus;
  /** null si pas de retard calculable. */
  daysLate: number | null;
  travelCost: number;
  warrantyProvision: number;
  netMargin: number;
  netMarginRate: number | null;
  probability: number;
  weightedRevenue: number;
  commissionBase: number;
  commissionPayable: number;
  installHours: number;
  isFirm: boolean;
  /** Valeurs figées : vrai si le coût vient de la vente et non du kit actuel. */
  usesSnapshot: boolean;
}

/** AAAA-MM-JJ → AAAA-MM-01 (EOMONTH(d,-1)+1). */
export function monthOf(date: string | null | undefined): string | null {
  if (!date) return null;
  return `${date.slice(0, 7)}-01`;
}

export function saleStatus(s: Pick<TcSale, 'lost' | 'sale_date' | 'delivery_date'>): SaleStatus {
  if (s.lost) return 'Perdu';
  if (s.delivery_date) return 'Livré';
  if (s.sale_date) return 'Vendu';
  return 'Devis en cours';
}

/** Coût de mission : km × 2 × coût/km + jours × personnes × per diem + nuitées × personnes × hébergement. */
export function missionCost(zone: TcZone | undefined, people: number, settings: TcSettings): number {
  if (!zone) return 0;
  return zone.distance_km * 2 * settings.cost_per_km
    + zone.mission_days * people * settings.per_diem
    + zone.nights * people * settings.lodging_per_night;
}

const daysBetween = (from: string, to: Date) =>
  Math.floor((to.getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);

export function computeSale(
  sale: TcSale,
  ctx: { kits: KitsResult; data: Pick<TcData, 'settings' | 'zones' | 'teams' | 'kits'>; today?: Date },
): SaleCalc {
  const { settings } = ctx.data;
  const today = ctx.today ?? new Date();
  const kitCost = ctx.kits.byId.get(sale.kit_id);
  const kit = kitCost?.kit ?? ctx.data.kits.find(k => k.id === sale.kit_id);
  const team = ctx.data.teams.find(t => t.id === sale.team_id);
  const status = saleStatus(sale);
  const isFirm = status === 'Vendu' || status === 'Livré';
  const qty = Number(sale.quantity) || 0;

  // Une vente signée utilise les valeurs figées ; un devis, le kit actuel.
  const usesSnapshot = isFirm && sale.unit_cost_snapshot != null;
  const catalogPrice = (isFirm && sale.catalog_price_snapshot != null) ? sale.catalog_price_snapshot : (kitCost?.priceHT ?? 0);
  const unitCost = usesSnapshot ? Number(sale.unit_cost_snapshot) : (kitCost?.costPrice ?? 0);
  const hoursPerKit = (isFirm && sale.install_hours_snapshot != null) ? sale.install_hours_snapshot : (kitCost?.laborHours ?? 0);

  const unitPrice = sale.applied_price != null ? Number(sale.applied_price) : catalogPrice;
  const amountHT = qty * unitPrice * (1 - (Number(sale.discount_rate) || 0));
  const costTotal = qty * unitCost;
  const grossMargin = amountHT - costTotal;
  const amountTTC = amountHT * (1 + settings.vat_rate);

  const collected = (Number(sale.deposit_amount) || 0) + (Number(sale.balance_amount) || 0);
  const remaining = isFirm ? amountTTC - collected : null;
  const paymentStatus: PaymentStatus = remaining === null ? ''
    : collected === 0 ? 'Non payé'
    : remaining <= 0.5 ? 'Soldé'
    : 'Partiel';
  const daysLate = remaining === null || !sale.delivery_date ? null
    : remaining <= 0.5 ? null
    : Math.max(0, daysBetween(sale.delivery_date, today) - settings.payment_delay_days);

  const zone = ctx.data.zones.find(z => z.id === sale.zone_id);
  const people = sale.mission_people ?? settings.default_mission_people;
  const travelCost = missionCost(zone, people, settings);
  const warrantyProvision = amountHT * settings.warranty_rate;
  const netMargin = grossMargin - travelCost - warrantyProvision;

  const probability = status === 'Perdu' ? 0 : isFirm ? 1 : (sale.probability ?? settings.default_probability);
  const commissionBase = isFirm ? amountHT * settings.commission_rate : 0;

  return {
    sale,
    status,
    solution: kit?.solution_code ?? '',
    kitCode: kit?.code ?? '',
    kitName: kit?.name ?? '',
    teamName: team?.name ?? '',
    quoteMonth: monthOf(sale.quote_date) as string,
    saleMonth: monthOf(sale.sale_date),
    deliveryMonth: monthOf(sale.delivery_date),
    installMonth: !isFirm ? null : monthOf(sale.delivery_date) ?? monthOf(sale.planned_install_date),
    catalogPrice,
    amountHT,
    unitCost,
    costTotal,
    grossMargin,
    grossMarginRate: amountHT === 0 ? null : grossMargin / amountHT,
    amountTTC,
    collected,
    remaining,
    paymentStatus,
    daysLate,
    travelCost,
    warrantyProvision,
    netMargin,
    netMarginRate: amountHT === 0 ? null : netMargin / amountHT,
    probability,
    weightedRevenue: amountHT * probability,
    commissionBase,
    commissionPayable: paymentStatus === 'Soldé' ? commissionBase : 0,
    installHours: qty * hoursPerKit,
    isFirm,
    usesSnapshot,
  };
}

/**
 * Valeurs à figer au moment où un devis devient une vente (date de vente
 * saisie). Renvoie null si rien à figer.
 */
export function snapshotOnSale(
  before: Pick<TcSale, 'sale_date' | 'unit_cost_snapshot'> | null,
  after: Pick<TcSale, 'sale_date' | 'kit_id'>,
  kits: KitsResult,
): Pick<TcSale, 'unit_cost_snapshot' | 'catalog_price_snapshot' | 'install_hours_snapshot'> | null {
  const becomesSale = !!after.sale_date && (!before || !before.sale_date || before.unit_cost_snapshot == null);
  if (!becomesSale) return null;
  const k = kits.byId.get(after.kit_id);
  if (!k) return null;
  return { unit_cost_snapshot: k.costPrice, catalog_price_snapshot: k.priceHT, install_hours_snapshot: k.laborHours };
}
