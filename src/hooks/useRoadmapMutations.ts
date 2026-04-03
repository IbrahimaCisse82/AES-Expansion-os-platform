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
        action: `a créé une barre roadmap "${data.label}"`,
        entityType: 'roadmap_bar',
        entityId: data.id,
      });
      qc.invalidateQueries({ queryKey: ['roadmap_bars'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
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
        action: `a modifié la barre roadmap "${data.label}"`,
        entityType: 'roadmap_bar',
        entityId: data.id,
      });
      qc.invalidateQueries({ queryKey: ['roadmap_bars'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
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
        action: 'a supprimé une barre roadmap',
        entityType: 'roadmap_bar',
        entityId: id,
      });
      qc.invalidateQueries({ queryKey: ['roadmap_bars'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
  });
}
