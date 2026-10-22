import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import type { Database } from '@/integrations/supabase/types';
import type { Account, BudgetLineRow, PnlLine, PnlValue, TreasuryLine, TreasuryValue } from '@/lib/fin/engine';
import { useCurrentUserRole } from './useUserRoles';

type Tables = Database['public']['Tables'];
const n = (v: unknown) => Number(v ?? 0) || 0;

export interface FinData {
  scenario: Tables['budget_scenarios']['Row'] | null;
  poles: Tables['bi_poles']['Row'][];
  accounts: Account[];
  lines: BudgetLineRow[];
  treasuryLines: TreasuryLine[];
  treasuryValues: TreasuryValue[];
  treasuryYear: Tables['fin_treasury_years']['Row'] | null;
  pnlLines: PnlLine[];
  pnlValues: PnlValue[];
  kpis: Tables['fin_kpis']['Row'][];
  kpiValues: Tables['fin_kpi_values']['Row'][];
}

export const scenarioName = (year: number) => `Budget AES ${year}`;

export function useFinData(year: number) {
  return useQuery({
    queryKey: ['fin', year],
    staleTime: 30_000,
    queryFn: async (): Promise<FinData> => {
      const one = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>) => { const { data, error } = await p; if (error) throw error; return data; };
      const [scenarios, poles, cats, tLines, tValues, tYear, pLines, pValues, kpis, kpiValues] = await Promise.all([
        one(supabase.from('budget_scenarios').select('*').eq('fiscal_year', year).eq('name', scenarioName(year))),
        one(supabase.from('bi_poles').select('*').order('sort_order')),
        one(supabase.from('budget_categories').select('id, code, name, parent_id, sort_order').like('code', 'AES-%').order('sort_order')),
        one(supabase.from('fin_treasury_lines').select('*').order('sort_order')),
        one(supabase.from('fin_treasury_values').select('line_code, month, amount').eq('fiscal_year', year)),
        one(supabase.from('fin_treasury_years').select('*').eq('fiscal_year', year).limit(1)),
        one(supabase.from('fin_pnl_lines').select('*').order('sort_order')),
        one(supabase.from('fin_pnl_values').select('line_code, budget, actual').eq('fiscal_year', year)),
        one(supabase.from('fin_kpis').select('*').order('sort_order')),
        one(supabase.from('fin_kpi_values').select('*').gte('month', `${year}-01-01`).lte('month', `${year}-12-01`)),
      ]);
      const scenario = scenarios?.[0] ?? null;
      let lines: BudgetLineRow[] = [];
      if (scenario) {
        const q = supabase.from('budget_lines').select('id, category_id, pole_id, line_type, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12')
          .eq('scenario_id', scenario.id).not('pole_id', 'is', null).order('id');
        lines = (await fetchAllRows((from, to) => q.range(from, to))).map(l => ({
          ...l, m1: n(l.m1), m2: n(l.m2), m3: n(l.m3), m4: n(l.m4), m5: n(l.m5), m6: n(l.m6), m7: n(l.m7), m8: n(l.m8), m9: n(l.m9), m10: n(l.m10), m11: n(l.m11), m12: n(l.m12),
        }));
      }
      return {
        scenario,
        poles: poles ?? [],
        accounts: (cats ?? []).map(c => ({ ...c, code: c.code ?? '', sort_order: n(c.sort_order) })),
        lines,
        treasuryLines: (tLines ?? []).map(l => ({ ...l, section: l.section as 'ENC' | 'DEC' })),
        treasuryValues: (tValues ?? []).map(v => ({ ...v, amount: n(v.amount) })),
        treasuryYear: tYear?.[0] ?? null,
        pnlLines: pLines ?? [],
        pnlValues: (pValues ?? []).map(v => ({ ...v, budget: n(v.budget), actual: n(v.actual) })),
        kpis: kpis ?? [],
        kpiValues: kpiValues ?? [],
      };
    },
  });
}

export function useFinCan() {
  const { data: role } = useCurrentUserRole();
  return {
    finance: ['admin', 'director', 'raf'].includes(role ?? ''),
    kpi: ['admin', 'director', 'raf', 'dhr', 'technical_director', 'commercial_director'].includes(role ?? ''),
    openYear: ['admin', 'director', 'raf', 'analyst'].includes(role ?? ''),
  };
}

/** Mutations finance : chaque appel rafraîchit l'exercice (et le BI, alimenté par budget_lines). */
export function useFinMutation<A>(fn: (args: A) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin'] });
      qc.invalidateQueries({ queryKey: ['bi_budget_facts'] });
      qc.invalidateQueries({ queryKey: ['budget_lines'] });
    },
  });
}

export async function must(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}
