import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KpiHistoryEntry {
  id: string;
  country_id: string;
  month: string;
  ca: number;
  clients: number;
  nps: number;
  retention: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useKpiHistory(countryId?: string) {
  return useQuery({
    queryKey: ['kpi-history', countryId],
    queryFn: async () => {
      let q = supabase
        .from('kpi_history')
        .select('*')
        .order('month', { ascending: true });
      if (countryId) q = q.eq('country_id', countryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as KpiHistoryEntry[];
    },
  });
}

export function useUpsertKpiHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      country_id: string;
      month: string;
      ca: number;
      clients: number;
      nps: number;
      retention: number;
      notes?: string;
    }) => {
      const { data: existing } = await supabase
        .from('kpi_history')
        .select('id')
        .eq('country_id', entry.country_id)
        .eq('month', entry.month)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('kpi_history')
          .update({
            ca: entry.ca,
            clients: entry.clients,
            nps: entry.nps,
            retention: entry.retention,
            notes: entry.notes ?? '',
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kpi_history')
          .insert(entry);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi-history'] });
    },
  });
}

export function useDeleteKpiHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kpi_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi-history'] });
    },
  });
}
