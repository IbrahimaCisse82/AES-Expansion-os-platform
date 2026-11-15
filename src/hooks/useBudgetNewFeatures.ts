import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Journal Entries ───
export interface JournalEntry {
  id: string;
  scenario_id: string;
  entry_date: string;
  description: string;
  entry_type: string;
  country_id: string | null;
  category_id: string | null;
  debit_amount: number;
  credit_amount: number;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function useJournalEntries(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_journal_entries', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_journal_entries' as never)
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as JournalEntry[];
    },
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at'>) => {
      const { data, error } = await supabase.from('budget_journal_entries' as never).insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_journal_entries', vars.scenario_id] }),
  });
}

export function useUpdateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId, ...updates }: { id: string; scenarioId: string } & Partial<JournalEntry>) => {
      const { error } = await supabase.from('budget_journal_entries' as never).update(updates as never).eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_journal_entries', scenarioId] }),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_journal_entries' as never).delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_journal_entries', scenarioId] }),
  });
}

// ─── Close Tasks ───
export interface CloseTask {
  id: string;
  scenario_id: string;
  country_id: string | null;
  country_label: string;
  task_name: string;
  task_order: number;
  status: string;
  assigned_to: string | null;
  assigned_name: string;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function useCloseTasks(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_close_tasks', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_close_tasks' as never)
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('task_order');
      if (error) throw error;
      return (data ?? []) as unknown as CloseTask[];
    },
  });
}

export function useCreateCloseTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CloseTask, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by'>) => {
      const { data, error } = await supabase.from('budget_close_tasks' as never).insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_close_tasks', vars.scenario_id] }),
  });
}

export function useUpdateCloseTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId, ...updates }: { id: string; scenarioId: string } & Partial<CloseTask>) => {
      const { error } = await supabase.from('budget_close_tasks' as never).update(updates as never).eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_close_tasks', scenarioId] }),
  });
}

export function useDeleteCloseTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_close_tasks' as never).delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_close_tasks', scenarioId] }),
  });
}

// ─── Validation Rules ───
export interface ValidationRule {
  id: string;
  scenario_id: string;
  rule_name: string;
  rule_type: string;
  category_id: string | null;
  country_id: string | null;
  min_value: number | null;
  max_value: number | null;
  formula: string;
  severity: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useValidationRules(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_validation_rules', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_validation_rules' as never)
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as ValidationRule[];
    },
  });
}

export function useCreateValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<ValidationRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('budget_validation_rules' as never).insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_validation_rules', vars.scenario_id] }),
  });
}

export function useDeleteValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_validation_rules' as never).delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_validation_rules', scenarioId] }),
  });
}

// ─── Investments ───
export interface Investment {
  id: string;
  scenario_id: string;
  parent_entity_id: string;
  parent_entity_label: string;
  subsidiary_entity_id: string;
  subsidiary_entity_label: string;
  ownership_pct: number;
  acquisition_date: string | null;
  acquisition_cost: number;
  book_value: number;
  consolidation_method: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function useInvestments(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_investments', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_investments' as never)
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as Investment[];
    },
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Investment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('budget_investments' as never).insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_investments', vars.scenario_id] }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_investments' as never).delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_investments', scenarioId] }),
  });
}

// ─── Segments ───
export interface Segment {
  id: string;
  scenario_id: string;
  segment_name: string;
  segment_type: string;
  country_ids: string[];
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useSegments(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget_segments', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_segments' as never)
        .select('*')
        .eq('scenario_id', scenarioId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as Segment[];
    },
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('budget_segments' as never).insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_segments', vars.scenario_id] }),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase.from('budget_segments' as never).delete().eq('id', id);
      if (error) throw error;
      return scenarioId;
    },
    onSuccess: (scenarioId) => qc.invalidateQueries({ queryKey: ['budget_segments', scenarioId] }),
  });
}
