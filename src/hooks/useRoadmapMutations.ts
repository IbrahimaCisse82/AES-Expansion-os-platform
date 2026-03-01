import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export function useCreateRoadmapBar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bar: TablesInsert<'roadmap_bars'>) => {
      const { data, error } = await supabase.from('roadmap_bars').insert(bar).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap_bars'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap_bars'] }),
  });
}

export function useDeleteRoadmapBar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roadmap_bars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap_bars'] }),
  });
}
