import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAppSetting(key: string) {
  return useQuery({
    queryKey: ['app_settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings' as never)
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data as { value: string } | null)?.value ?? null;
    },
  });
}

export function useUpdateAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings' as never)
        .update({ value, updated_at: new Date().toISOString() } as never)
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['app_settings', vars.key] });
    },
  });
}
