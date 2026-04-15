import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCountryMembers(countryId?: string) {
  return useQuery({
    queryKey: ['country_members', countryId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('country_members').select('*');
      if (countryId) q = q.eq('country_id', countryId);
      const { data, error } = await q.order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useAddCountryMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { country_id: string; user_id: string; role_in_country: string }) => {
      const { error } = await supabase.from('country_members').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['country_members'] }),
  });
}

export function useRemoveCountryMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('country_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['country_members'] }),
  });
}
