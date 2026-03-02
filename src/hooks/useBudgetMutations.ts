import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from './useActivityLogger';

export function useCreateBudgetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: TablesInsert<'budget_entries'>) => {
      const { data, error } = await supabase.from('budget_entries').insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['budget_entries'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: `a ajouté une entrée budget "${data.category}"`, entityType: 'budget', entityId: data.id });
    },
  });
}

export function useUpdateBudgetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'budget_entries'> & { id: string }) => {
      const { data, error } = await supabase.from('budget_entries').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['budget_entries'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: `a modifié l'entrée budget "${data.category}"`, entityType: 'budget', entityId: data.id });
    },
  });
}

export function useDeleteBudgetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget_entries'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: 'a supprimé une entrée budget', entityType: 'budget' });
    },
  });
}
