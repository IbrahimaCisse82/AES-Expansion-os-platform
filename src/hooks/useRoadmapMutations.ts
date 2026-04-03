import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from './useActivityLogger';

export function useCreateRoadmapBar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bar: TablesInsert<'roadmap_bars'>) => {
      const { data, error } = await supabase.from('roadmap_bars').insert(bar).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      logActivity({
        action: 'created',
        entity_type: 'roadmap_bar',
        entity_id: data.id,
        description: `Barre roadmap créée`,
      });
      qc.invalidateQueries({ queryKey: ['roadmap_bars'] });
    },
  });
}

export function useUpdateRoadmapBar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'roadmap_bars'> & { id: string }) => {
      const { data, error } = await supabase.from('roadmap_bars').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      logActivity({
        action: 'updated',
        entity_type: 'roadmap_bar',
        entity_id: data.id,
        description: `Barre roadmap modifiée`,
      });
      qc.invalidateQueries({ queryKey: ['roadmap_bars'] });
    },
  });
}

export function useDeleteRoadmapBar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roadmap_bars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      logActivity({
        action: 'deleted',
        entity_type: 'roadmap_bar',
        entity_id: id,
        description: 'Barre roadmap supprimée',
      });
      qc.invalidateQueries({ queryKey: ['roadmap_bars'] });
    },
  });
}
