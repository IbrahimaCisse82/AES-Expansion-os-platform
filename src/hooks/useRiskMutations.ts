import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from './useActivityLogger';

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (risk: TablesInsert<'risks'>) => {
      const { data, error } = await supabase.from('risks').insert(risk).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: `a créé le risque "${data.title}"`, entityType: 'risk', entityId: data.id });
    },
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'risks'> & { id: string }) => {
      const { data, error } = await supabase.from('risks').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: `a modifié le risque "${data.title}"`, entityType: 'risk', entityId: data.id });
    },
  });
}

export function useDeleteRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('risks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: 'a supprimé un risque', entityType: 'risk' });
    },
  });
}
