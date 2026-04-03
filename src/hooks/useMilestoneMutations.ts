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
        action: 'created',
        entity_type: 'milestone',
        entity_id: data.id,
        description: `Jalon créé: ${data.title}`,
      });
      qc.invalidateQueries({ queryKey: ['milestones', vars.country_id] });
      qc.invalidateQueries({ queryKey: ['milestones', 'all'] });
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
        action: 'updated',
        entity_type: 'milestone',
        entity_id: data.id,
        description: `Jalon modifié: ${data.title}`,
      });
      qc.invalidateQueries({ queryKey: ['milestones', data.country_id] });
      qc.invalidateQueries({ queryKey: ['milestones', 'all'] });
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
        action: 'deleted',
        entity_type: 'milestone',
        entity_id: countryId,
        description: 'Jalon supprimé',
      });
      qc.invalidateQueries({ queryKey: ['milestones', countryId] });
      qc.invalidateQueries({ queryKey: ['milestones', 'all'] });
    },
  });
}
