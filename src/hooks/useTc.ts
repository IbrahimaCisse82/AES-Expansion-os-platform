import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { fetchAllRows } from '@/lib/fetchAll';
import { computeKits } from '@/lib/tc/kits';
import { computeSale, snapshotOnSale } from '@/lib/tc/sales';
import { DEFAULT_SETTINGS, type TcData, type TcRaci, type TcSale } from '@/lib/tc/types';
import { useCurrentUserRole } from './useUserRoles';

type Tables = Database['public']['Tables'];
export type TcTable = Extract<keyof Tables, `tc_${string}`>;

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Charge tout le référentiel TC + le journal (volumes modestes : quelques milliers de lignes). */
export function useTcData() {
  return useQuery({
    queryKey: ['tc', 'data'],
    staleTime: 30_000,
    queryFn: async (): Promise<TcData> => {
      // Tri total (clé primaire en dernier) pour une pagination stable
      const all = <T extends TcTable>(table: T, order: string, key = 'id') => {
        const q = supabase.from(table).select('*').order(order).order(key);
        return fetchAllRows<Tables[T]['Row']>((from, to) => q.range(from, to) as unknown as PromiseLike<{ data: Tables[T]['Row'][] | null; error: unknown }>);
      };
      const [settings, solutions, labor, zones, teams, stock, supplierPrices, kits, kitItems, kitLabor, objectives, sales] = await Promise.all([
        all('tc_settings', 'updated_at'),
        all('tc_solutions', 'reservation_priority', 'code'),
        all('tc_labor_profiles', 'sort_order'),
        all('tc_zones', 'sort_order'),
        all('tc_teams', 'sort_order'),
        all('tc_stock_items', 'designation'),
        all('tc_supplier_prices', 'designation'),
        all('tc_kits', 'sort_order'),
        all('tc_kit_items', 'line_no'),
        all('tc_kit_labor', 'line_no'),
        all('tc_objectives', 'month'),
        all('tc_sales', 'quote_date'),
      ]);
      const s = settings[0];
      return {
        settings: s ? {
          margin_rate: num(s.margin_rate), vat_rate: num(s.vat_rate), contingency_rate: num(s.contingency_rate),
          currency: s.currency, inventory_date: s.inventory_date, payment_delay_days: num(s.payment_delay_days),
          cost_per_km: num(s.cost_per_km), per_diem: num(s.per_diem), lodging_per_night: num(s.lodging_per_night),
          default_mission_people: num(s.default_mission_people), warranty_rate: num(s.warranty_rate),
          commission_rate: num(s.commission_rate), bonus_threshold: num(s.bonus_threshold),
          bonus_rate: num(s.bonus_rate), default_probability: num(s.default_probability),
        } : DEFAULT_SETTINGS,
        solutions: solutions.map(x => ({ ...x, reservation_priority: num(x.reservation_priority) })),
        labor: labor.map(x => ({ ...x, hourly_rate: num(x.hourly_rate) })),
        zones: zones.map(x => ({ ...x, distance_km: num(x.distance_km), mission_days: num(x.mission_days), nights: num(x.nights) })),
        teams: teams.map(x => ({ ...x, technicians: num(x.technicians), hours_per_day: num(x.hours_per_day), working_days: num(x.working_days), availability_rate: num(x.availability_rate) })),
        stock: stock.map(x => ({ ...x, quantity: num(x.quantity), unit_cost: num(x.unit_cost) })),
        supplierPrices: supplierPrices.map(x => ({ ...x, unit_price: num(x.unit_price) })),
        kits: kits.map(x => ({ ...x, transport_cost: num(x.transport_cost), margin_rate: x.margin_rate === null ? null : num(x.margin_rate) })),
        kitItems: kitItems.map(x => ({ ...x, quantity: num(x.quantity) })),
        kitLabor: kitLabor.map(x => ({ ...x, people: num(x.people), hours_per_person: num(x.hours_per_person) })),
        objectives: objectives.map(x => ({ ...x, kits_target: num(x.kits_target), revenue_target: num(x.revenue_target) })),
        sales: sales.map(x => ({
          ...x, quantity: num(x.quantity), discount_rate: num(x.discount_rate),
          applied_price: x.applied_price === null ? null : num(x.applied_price),
          deposit_amount: num(x.deposit_amount), balance_amount: num(x.balance_amount),
          probability: x.probability === null ? null : num(x.probability),
          unit_cost_snapshot: x.unit_cost_snapshot === null ? null : num(x.unit_cost_snapshot),
          catalog_price_snapshot: x.catalog_price_snapshot === null ? null : num(x.catalog_price_snapshot),
          install_hours_snapshot: x.install_hours_snapshot === null ? null : num(x.install_hours_snapshot),
        })),
      };
    },
  });
}

/** Moteur de calcul mémorisé : kits + journal calculé. */
export function useTcEngine() {
  const query = useTcData();
  const engine = useMemo(() => {
    if (!query.data) return null;
    const data = query.data;
    const kits = computeKits(data);
    const today = new Date();
    const sales = data.sales.map(s => computeSale(s, { kits, data, today }));
    return { data, kits, sales };
  }, [query.data]);
  return { ...query, engine };
}

export function useTcCatalog() {
  return useQuery({
    queryKey: ['tc', 'catalog'],
    staleTime: 5 * 60_000,
    queryFn: () => {
      const q = supabase.from('tc_catalog_items').select('*').order('designation').order('id');
      return fetchAllRows<Tables['tc_catalog_items']['Row']>((from, to) => q.range(from, to));
    },
  });
}

export function useTcRaci() {
  return useQuery({
    queryKey: ['tc', 'raci'],
    queryFn: async (): Promise<TcRaci[]> => {
      const { data, error } = await supabase.from('tc_raci').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []).map(r => ({ ...r, assignments: (r.assignments ?? {}) as Record<string, string> }));
    },
  });
}

/** Mutations génériques (insert / update / upsert / delete) avec rafraîchissement. */
export function useTcMutations<T extends TcTable>(table: T) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['tc'] });
  const insert = useMutation({
    mutationFn: async (rows: Tables[T]['Insert'] | Tables[T]['Insert'][]) => {
      const { error } = await supabase.from(table).insert(rows as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Tables[T]['Update'] & { id: string }) => {
      const { error } = await supabase.from(table).update(patch as never).eq('id' as never, id as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id' as never, id as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { insert, update, remove };
}

/**
 * Enregistre une vente : fige coût / prix / heures du kit au moment où le
 * devis devient une vente (amélioration par rapport au classeur).
 */
export function useSaveSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sale, previous, kits }: {
      sale: Database['public']['Tables']['tc_sales']['Insert'] & { id?: string };
      previous: TcSale | null;
      kits: ReturnType<typeof computeKits>;
    }) => {
      const snapshot = snapshotOnSale(previous, { sale_date: sale.sale_date ?? null, kit_id: sale.kit_id }, kits);
      // Retour en devis (date de vente effacée) : on libère les valeurs figées
      const reset = !sale.sale_date ? { unit_cost_snapshot: null, catalog_price_snapshot: null, install_hours_snapshot: null } : {};
      const payload = { ...sale, ...reset, ...(snapshot ?? {}) };
      if (sale.id) {
        const { id, ...patch } = payload;
        const { error } = await supabase.from('tc_sales').update(patch).eq('id', id as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tc_sales').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tc'] }),
  });
}

/** Droits d'écriture côté interface (miroir de tc_can en base). */
const PERMS: Record<string, string[]> = {
  settings: ['admin', 'director', 'raf'],
  labor: ['admin', 'director', 'dhr', 'raf'],
  zones: ['admin', 'director', 'raf', 'logistics'],
  teams: ['admin', 'director', 'technical_director', 'commercial_director'],
  kits: ['admin', 'director', 'technical_director', 'technician'],
  stock: ['admin', 'director', 'logistics'],
  suppliers: ['admin', 'director', 'logistics', 'raf'],
  objectives: ['admin', 'director', 'commercial_director'],
  sales_create: ['admin', 'director', 'commercial_director', 'sales_rep'],
  sales_manage: ['admin', 'director', 'commercial_director', 'raf', 'technical_director', 'technician'],
  sales_delete: ['admin', 'director', 'commercial_director'],
  raci: ['admin', 'director'],
};
export type TcPermission = keyof typeof PERMS;

export function tcCan(role: string | null | undefined, perm: TcPermission): boolean {
  return PERMS[perm].includes(role ?? '');
}

export function useTcCan() {
  const { data: role } = useCurrentUserRole();
  return (perm: TcPermission) => tcCan(role, perm);
}
