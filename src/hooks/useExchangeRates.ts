import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ExchangeRateRow = Database['public']['Tables']['exchange_rates']['Row'];
type ExchangeRateInsert = Database['public']['Tables']['exchange_rates']['Insert'];

/**
 * Charge tous les taux de change vers FCFA. Cache 1 h.
 */
export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange_rates'],
    queryFn: async (): Promise<ExchangeRateRow[]> => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useUpsertExchangeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ExchangeRateInsert) => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .upsert(payload, { onConflict: 'currency_code,effective_date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchange_rates'] }),
  });
}

export function useDeleteExchangeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exchange_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchange_rates'] }),
  });
}