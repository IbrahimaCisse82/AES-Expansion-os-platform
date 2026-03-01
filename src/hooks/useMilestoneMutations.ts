import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: TablesInsert<'milestones'>) => {
      const { data, error } = await supabase.from('milestones').insert(milestone).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['milestones', vars.country_id] }),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'milestones'> & { id: string }) => {
      const { data, error } = await supabase.from('milestones').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['milestones', data.country_id] }),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, countryId }: { id: string; countryId: string }) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) throw error;
      return countryId;
    },
    onSuccess: (countryId) => qc.invalidateQueries({ queryKey: ['milestones', countryId] }),
  });
}
