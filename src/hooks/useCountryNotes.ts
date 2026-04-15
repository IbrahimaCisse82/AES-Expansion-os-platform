import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CountryNote {
  id: string;
  country_id: string;
  content: string;
  note_type: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useCountryNotes(countryId: string) {
  return useQuery({
    queryKey: ['country_notes', countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_notes' as never)
        .select('*')
        .eq('country_id', countryId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CountryNote[];
    },
    enabled: !!countryId,
  });
}

export function useCreateCountryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { country_id: string; content: string; note_type: string; author_id?: string; author_name?: string }) => {
      const { error } = await supabase.from('country_notes' as never).insert(note as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['country_notes', v.country_id] }); },
  });
}

export function useDeleteCountryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; countryId: string }) => {
      const { error } = await supabase.from('country_notes' as never).delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['country_notes', v.countryId] }); },
  });
}
