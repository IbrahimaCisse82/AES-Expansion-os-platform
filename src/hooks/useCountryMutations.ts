import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from './useActivityLogger';

export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (country: TablesInsert<'countries'>) => {
      const { data, error } = await supabase.from('countries').insert(country).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      logActivity({
        action: `a ajouté le pays ${data.flag} ${data.name}`,
        entityType: 'country',
        entityId: data.id,
        marketFlag: data.flag ?? '',
      });
      qc.invalidateQueries({ queryKey: ['countries'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
  });
}

export function useUpdateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'countries'> & { id: string }) => {
      const { data, error } = await supabase.from('countries').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      logActivity({
        action: `a modifié le pays ${data.flag} ${data.name}`,
        entityType: 'country',
        entityId: data.id,
        marketFlag: data.flag ?? '',
      });
      qc.invalidateQueries({ queryKey: ['countries'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
  });
}

export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('countries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      logActivity({
        action: 'a supprimé un pays',
        entityType: 'country',
        entityId: id,
      });
      qc.invalidateQueries({ queryKey: ['countries'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
    },
  });
}
