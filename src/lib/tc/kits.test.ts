import { describe, it, expect } from 'vitest';
import fixture from './__fixtures__/excel-kits.json';
import { computeKits, stockWithReservations } from './kits';
import { DEFAULT_SETTINGS, type TcData, type TcKit, type TcKitItem, type TcKitLabor } from './types';

// Jeu de données saisi dans le VRAI classeur AES puis recalculé par
// LibreOffice : le moteur doit retrouver les mêmes résultats, centime près.
const SOLUTIONS = ['VICTRON', 'HUAWEI', 'LORENTZ', 'CUISSON', 'SPARK'];
const VARIANTS = ['PETIT', 'MOYEN', 'GRAND'];

function buildData(): Pick<TcData, 'settings' | 'solutions' | 'labor' | 'stock' | 'supplierPrices' | 'kits' | 'kitItems' | 'kitLabor'> {
  const labor = fixture.profiles.map((name, i) => ({ id: `p${i}`, name, hourly_rate: fixture.rates[i], sort_order: i }));
  const kits: TcKit[] = [];
  const kitItems: TcKitItem[] = [];
  const kitLabor: TcKitLabor[] = [];
  for (const [key, [material, laborLines, transport]] of Object.entries(fixture.plan) as [string, [[string, number][], [number, number, number][], number]][]) {
    const [solution, block] = key.split('|');
    const id = key;
    kits.push({ id, code: `${solution} – ${VARIANTS[+block]}`, solution_code: solution, variant: VARIANTS[+block], name: id, transport_cost: transport, sort_order: +block, active: true });
    material.forEach(([designation, quantity], i) => kitItems.push({ id: `${id}-m${i}`, kit_id: id, line_no: i + 1, designation, unit: 'u', quantity }));
    laborLines.forEach(([p, people, hours], i) => kitLabor.push({ id: `${id}-l${i}`, kit_id: id, line_no: i + 1, profile_id: `p${p}`, people, hours_per_person: hours }));
  }
  return {
    settings: DEFAULT_SETTINGS,
    solutions: SOLUTIONS.map((code, i) => ({ code, label: code, reservation_priority: i + 1, color: 'sky', active: true })),
    labor,
    stock: fixture.stock.map((s, i) => ({ id: `s${i}`, designation: s.designation, quantity: s.quantity, unit_cost: s.unit_cost, solution_code: s.solution_code, unit: 'u' })),
    supplierPrices: fixture.suppliers.map(([designation, supplier, unit_price], i) => ({ id: `f${i}`, designation: designation as string, supplier: supplier as string, unit_price: unit_price as number })),
    // ordre volontairement mélangé : le moteur doit retrouver l'ordre de réservation
    kits: [...kits].reverse(),
    kitItems,
    kitLabor,
  };
}

describe('computeKits — conformité au classeur Excel', () => {
  const result = computeKits(buildData());

  for (const [key, expected] of Object.entries(fixture.expected)) {
    it(`${key} : récapitulatif identique à Excel`, () => {
      const k = result.byId.get(key)!;
      const r = expected.recap;
      expect(k.materialFromStock).toBeCloseTo(r.stock as number, 2);
      expect(k.materialToBuy).toBeCloseTo(r.buy as number, 2);
      expect(k.materialTotal).toBeCloseTo(r.mat as number, 2);
      expect(k.laborCost).toBeCloseTo(r.mo as number, 2);
      expect(k.laborHours).toBeCloseTo(r.hours as number, 6);
      expect(k.contingency).toBeCloseTo(r.contingency as number, 2);
      expect(k.costPrice).toBeCloseTo(r.cost as number, 2);
      expect(k.margin).toBeCloseTo(r.margin as number, 1);
      expect(k.priceHT).toBeCloseTo(r.ht as number, 1);
      expect(k.vat).toBeCloseTo(r.vat as number, 1);
      expect(k.priceTTC).toBeCloseTo(r.ttc as number, 1);
      expect(k.stockShare).toBeCloseTo(r.share as number, 9);
    });

    it(`${key} : lignes matériel identiques (réservation, achat, fournisseur, statut)`, () => {
      const k = result.byId.get(key)!;
      expect(k.material).toHaveLength(expected.lines.length);
      expected.lines.forEach((line, i) => {
        const m = k.material[i];
        expect(m.designation).toBe(line.B);
        expect(m.stockInitial).toBe(line.E);
        expect(m.alreadyReserved).toBe(line.F);
        expect(m.fromStock).toBe(line.H);
        expect(m.toBuy).toBe(line.I);
        expect(m.supplierUnitCost).toBe(line.K);
        expect(m.supplier).toBe(line.L ?? '');
        expect(m.totalCost).toBeCloseTo(line.O as number, 2);
        expect(m.status).toBe(line.P);
      });
    });
  }

  it('onglet STOCK : réservations par solution et stock restant', () => {
    const rows = stockWithReservations(buildData().stock, result.reservations);
    const rotor = rows.find(r => r.item.designation.startsWith('ROTOR POMPE LORENTZ'))!;
    expect(rotor.reservedBySolution).toEqual({ HUAWEI: 1, SPARK: 4 });
    expect(rotor.remaining).toBe(0);
    const ps600 = rows.find(r => r.item.designation === 'POMPE LORENTZ PS 600 C-SJ 8-5')!;
    expect(ps600.reservedBySolution).toEqual({ VICTRON: 2 });
  });

  it('une marge spécifique au kit remplace la marge par défaut', () => {
    const data = buildData();
    data.kits = data.kits.map(k => (k.id === 'SPARK|0' ? { ...k, margin_rate: 0.4 } : k));
    const k = computeKits(data).byId.get('SPARK|0')!;
    expect(k.priceHT).toBeCloseTo(1596000 * 1.4, 2);
  });

  it('un kit inactif ne réserve pas de stock', () => {
    const data = buildData();
    data.kits = data.kits.map(k => (k.id === 'VICTRON|0' ? { ...k, active: false } : k));
    const r = computeKits(data);
    expect(r.byId.has('VICTRON|0')).toBe(false);
    expect(r.byId.get('VICTRON|1')!.material[0].alreadyReserved).toBe(0);
  });
});
