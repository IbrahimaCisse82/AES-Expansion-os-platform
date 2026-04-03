import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from './useActivityLogger';

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: TablesInsert<'milestones'>) => {
      const { data, error } = await supabase.from('milestones').insert(milestone).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      logActivity({
        action: `a créé le jalon "${data.title}"`,
        entityType: 'milestone',
        entityId: data.id,
      });
      qc.invalidateQueries({ queryKey: ['milestones', vars.country_id] });
      qc.invalidateQueries({ queryKey: ['milestones', 'all'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
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
    onSuccess: (data) => {
      logActivity({
        action: `a modifié le jalon "${data.title}"`,
        entityType: 'milestone',
        entityId: data.id,
      });
      qc.invalidateQueries({ queryKey: ['milestones', data.country_id] });
      qc.invalidateQueries({ queryKey: ['milestones', 'all'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
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
    onSuccess: (countryId) => {
      logActivity({
        action: 'a supprimé un jalon',
        entityType: 'milestone',
        entityId: countryId,
      });
      qc.invalidateQueries({ queryKey: ['milestones', countryId] });
      qc.invalidateQueries({ queryKey: ['milestones', 'all'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
  });
}
