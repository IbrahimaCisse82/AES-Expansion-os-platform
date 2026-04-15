import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRiskHistory(riskId?: string) {
  return useQuery({
    queryKey: ['risk_history', riskId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('risk_history').select('*').order('created_at', { ascending: false });
      if (riskId) q = q.eq('risk_id', riskId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!riskId,
  });
}

export function useLogRiskChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      risk_id: string;
      old_level?: string | null;
      new_level?: string | null;
      old_status?: string | null;
      new_status?: string | null;
      old_probability?: number | null;
      new_probability?: number | null;
      old_impact?: number | null;
      new_impact?: number | null;
      changed_by?: string | null;
      changed_by_name?: string;
      note?: string;
    }) => {
      const { error } = await supabase.from('risk_history').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risk_history'] }),
  });
}
