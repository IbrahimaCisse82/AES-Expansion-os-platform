import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/** Notifications personnelles (mentions, rapports à valider, alertes…) — rafraîchies en temps réel par useRealtimeNotifications. */
export function useMyNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ids: string[] | 'all') => {
      let q = supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
      if (ids !== 'all') q = q.in('id', ids);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
