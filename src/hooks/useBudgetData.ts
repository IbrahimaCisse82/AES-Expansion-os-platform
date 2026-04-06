import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface BudgetScenario {
  id: string;
  name: string;
  description: string;
  fiscal_year: number;
  status: 'draft' | 'submitted' | 'approved' | 'locked';
  is_baseline: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  type: 'revenue' | 'expense';
  parent_id: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
}

export interface BudgetLine {
  id: string;
  scenario_id: string;
  category_id: string;
  country_id: string | null;
  country_label: string;
  line_type: 'budget' | 'actual' | 'forecast';
  m1: number; m2: number; m3: number; m4: number;
  m5: number; m6: number; m7: number; m8: number;
  m9: number; m10: number; m11: number; m12: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'] as const;
export const MONTH_KEYS = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12'] as const;

export function getLineTotal(line: BudgetLine): number {
  return MONTH_KEYS.reduce((sum, k) => sum + Number(line[k] || 0), 0);
}

// Hooks
export function useBudgetScenarios(fiscalYear?: number) {
  return useQuery({
    queryKey: ['budget_scenarios', fiscalYear],
    queryFn: async () => {
      let query = supabase.from('budget_scenarios').select('*').order('created_at', { ascending: true });
      if (fiscalYear) query = query.eq('fiscal_year', fiscalYear);
      const { data, error } = await query;
      if (error) throw error;
      return data as BudgetScenario[];
    },
  });
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: ['budget_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('budget_categories').select('*').order('sort_order');
      if (error) throw error;
      return data as BudgetCategory[];
    },
  });
}

export function useBudgetLines(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_lines', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return data as BudgetLine[];
    },
  });
}

// Mutations
export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; fiscal_year: number; is_baseline?: boolean }) => {
      const { data, error } = await supabase.from('budget_scenarios').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_scenarios'] }),
  });
}

export function useUpdateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetScenario> & { id: string }) => {
      const { error } = await supabase.from('budget_scenarios').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_scenarios'] }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_scenarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_scenarios'] }),
  });
}

export function useCreateBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<BudgetLine, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('budget_lines').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_lines', vars.scenario_id] }),
  });
}

export function useUpdateBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetLine> & { id: string; scenario_id: string }) => {
      const { error } = await supabase.from('budget_lines').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_lines', vars.scenario_id] }),
  });
}

export function useDeleteBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenario_id }: { id: string; scenario_id: string }) => {
      const { error } = await supabase.from('budget_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_lines', vars.scenario_id] }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; type: 'revenue' | 'expense'; sort_order?: number; parent_id?: string }) => {
      const { data, error } = await supabase.from('budget_categories').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_categories'] }),
  });
}
