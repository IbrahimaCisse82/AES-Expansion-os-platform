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
        action: 'created',
        entity_type: 'country',
        entity_id: data.id,
        description: `Pays créé: ${data.flag} ${data.name}`,
      });
      qc.invalidateQueries({ queryKey: ['countries'] });
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
        action: 'updated',
        entity_type: 'country',
        entity_id: data.id,
        description: `Pays modifié: ${data.flag} ${data.name}`,
      });
      qc.invalidateQueries({ queryKey: ['countries'] });
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
        action: 'deleted',
        entity_type: 'country',
        entity_id: id,
        description: 'Pays supprimé',
      });
      qc.invalidateQueries({ queryKey: ['countries'] });
    },
  });
}
