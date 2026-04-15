import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRiskCategories() {
  return useQuery({
    queryKey: ['risk_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRiskCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color: string; sort_order: number }) => {
      const { error } = await supabase.from('risk_categories').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risk_categories'] }),
  });
}

export function useUpdateRiskCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { error } = await supabase.from('risk_categories').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risk_categories'] }),
  });
}

export function useDeleteRiskCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('risk_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risk_categories'] }),
  });
}
