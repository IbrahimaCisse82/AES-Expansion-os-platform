import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';

// Types
export interface BudgetScenario {
  id: string;
  name: string;
  description: string;
  fiscal_year: number;
  status: 'draft' | 'submitted' | 'approved' | 'locked' | 'rejected';
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
      const ordered = supabase
        .from('budget_lines')
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at')
        .order('id');
      return (await fetchAllRows((from, to) => ordered.range(from, to))) as BudgetLine[];
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

export function useDuplicateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, name, description, fiscalYear }: { sourceId: string; name: string; description?: string; fiscalYear: number }) => {
      // 1. Create new scenario
      const { data: newScenario, error: scErr } = await supabase
        .from('budget_scenarios')
        .insert({ name, description: description || '', fiscal_year: fiscalYear, is_baseline: false })
        .select()
        .single();
      if (scErr) throw scErr;

      // 2. Fetch source lines
      const { data: sourceLines, error: lnErr } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('scenario_id', sourceId);
      if (lnErr) throw lnErr;

      // 3. Copy lines to new scenario
      if (sourceLines && sourceLines.length > 0) {
        const copies = sourceLines.map(l => ({
          scenario_id: newScenario.id,
          category_id: l.category_id,
          country_id: l.country_id,
          country_label: l.country_label,
          line_type: l.line_type,
          m1: l.m1, m2: l.m2, m3: l.m3, m4: l.m4,
          m5: l.m5, m6: l.m6, m7: l.m7, m8: l.m8,
          m9: l.m9, m10: l.m10, m11: l.m11, m12: l.m12,
          notes: l.notes,
        }));
        const { error: cpErr } = await supabase.from('budget_lines').insert(copies);
        if (cpErr) throw cpErr;
      }

      return newScenario;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget_scenarios'] });
      qc.invalidateQueries({ queryKey: ['budget_lines'] });
    },
  });
}

export function useAdjustScenarioPercent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scenarioId, percent, lineType, categoryType }: {
      scenarioId: string;
      percent: number; // e.g. 10 for +10%, -5 for -5%
      lineType?: 'budget' | 'actual' | 'forecast';
      categoryType?: 'revenue' | 'expense';
    }) => {
      // Fetch lines for this scenario
      let query = supabase.from('budget_lines').select('*, budget_categories!budget_lines_category_id_fkey(type)').eq('scenario_id', scenarioId);
      if (lineType) query = query.eq('line_type', lineType);
      const { data: lines, error } = await query;
      if (error) throw error;
      if (!lines || lines.length === 0) return;

      const factor = 1 + percent / 100;
      const MKEYS = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12'];

      type LineWithCat = (typeof lines)[number] & { budget_categories: { type: string } | null };
      const updates = (lines as LineWithCat[])
        .filter(l => !categoryType || l.budget_categories?.type === categoryType)
        .map(l => {
          const adjusted: Record<string, number> = {};
          MKEYS.forEach(k => {
            const val = (l as unknown as Record<string, number | null>)[k];
            adjusted[k] = Math.round(Number(val ?? 0) * factor * 100) / 100;
          });
          return supabase.from('budget_lines').update(adjusted).eq('id', l.id);
        });

      const results = await Promise.all(updates);
      const firstError = results.find(r => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget_lines'] });
    },
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
