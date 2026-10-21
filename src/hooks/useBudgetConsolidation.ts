import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Intercompany Eliminations ───
export interface IntercompanyElimination {
  id: string;
  scenario_id: string;
  source_country_id: string;
  target_country_id: string;
  category_id: string;
  amount: number;
  description: string;
  elimination_type: string;
  m1: number; m2: number; m3: number; m4: number;
  m5: number; m6: number; m7: number; m8: number;
  m9: number; m10: number; m11: number; m12: number;
  created_at: string;
  updated_at: string;
}

export function useIntercompanyEliminations(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_intercompany', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_intercompany')
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as IntercompanyElimination[];
    },
  });
}

export function useCreateIntercompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<IntercompanyElimination, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('budget_intercompany').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_intercompany', vars.scenario_id] }),
  });
}

export function useDeleteIntercompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_intercompany').delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_intercompany', scenarioId] }),
  });
}

// ─── Scenario Versions ───
export interface ScenarioVersion {
  id: string;
  scenario_id: string;
  version_name: string;
  version_number: number;
  snapshot_data: Record<string, unknown>[];
  created_by: string | null;
  created_at: string;
}

export function useScenarioVersions(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_scenario_versions', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_scenario_versions')
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScenarioVersion[];
    },
  });
}

export function useCreateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scenarioId, versionName }: { scenarioId: string; versionName: string }) => {
      // Get current lines
      const { data: lines, error: lErr } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('scenario_id', scenarioId);
      if (lErr) throw lErr;

      // Get current version count
      const { count } = await supabase
        .from('budget_scenario_versions')
        .select('*', { count: 'exact', head: true })
        .eq('scenario_id', scenarioId);

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.from('budget_scenario_versions').insert({
        scenario_id: scenarioId,
        version_name: versionName,
        version_number: (count ?? 0) + 1,
        snapshot_data: lines ?? [],
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['budget_scenario_versions', data.scenario_id] }),
  });
}

// ─── Cost Allocations ───
export interface CostAllocationRule {
  id: string;
  scenario_id: string;
  name: string;
  source_category_id: string;
  allocation_key: string;
  allocation_rules: { country_id: string; weight: number }[];
  total_amount: number;
  is_applied: boolean;
  created_at: string;
  updated_at: string;
}

export function useCostAllocations(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_cost_allocations', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_cost_allocations')
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as CostAllocationRule[];
    },
  });
}

export function useCreateCostAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CostAllocationRule, 'id' | 'created_at' | 'updated_at' | 'is_applied'>) => {
      const { data, error } = await supabase.from('budget_cost_allocations').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_cost_allocations', vars.scenario_id] }),
  });
}

export function useDeleteCostAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_cost_allocations').delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_cost_allocations', scenarioId] }),
  });
}

// ─── CapEx Items ───
export interface CapExItem {
  id: string;
  scenario_id: string;
  name: string;
  country_id: string | null;
  country_label: string;
  category_id: string | null;
  acquisition_date: string;
  acquisition_cost: number;
  useful_life_months: number;
  depreciation_method: string;
  salvage_value: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function useCapExItems(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_capex_items', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_capex_items')
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as CapExItem[];
    },
  });
}

export function useCreateCapExItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CapExItem, 'id' | 'created_at' | 'updated_at' | 'acquisition_date'> & { acquisition_date?: string }) => {
      const { data, error } = await supabase.from('budget_capex_items').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_capex_items', vars.scenario_id] }),
  });
}

export function useDeleteCapExItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_capex_items').delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_capex_items', scenarioId] }),
  });
}

// ─── Depreciation Calculation ───
export function calculateMonthlyDepreciation(item: CapExItem): number[] {
  const { acquisition_cost, salvage_value, useful_life_months, acquisition_date } = item;
  const depreciableAmount = acquisition_cost - salvage_value;
  const monthlyDep = depreciableAmount / Math.max(1, useful_life_months);
  
  const startMonth = acquisition_date ? new Date(acquisition_date).getMonth() : 0;
  const months = Array(12).fill(0);
  
  for (let i = startMonth; i < 12 && i < startMonth + useful_life_months; i++) {
    months[i] = Math.round(monthlyDep * 100) / 100;
  }
  return months;
}
