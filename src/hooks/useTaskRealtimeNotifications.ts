import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  open: 'À faire',
  wip: 'En cours',
  late: 'En retard',
  done: 'Terminée',
};

export function useTaskRealtimeNotifications() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          // Invalidate cache so lists refresh
          qc.invalidateQueries({ queryKey: ['tasks'] });

          // Don't notify the user about their own changes
          const record = (payload.new as any) || (payload.old as any);
          if (record?.created_by === user.id) return;

          switch (payload.eventType) {
            case 'INSERT':
              toast.info(`📋 Nouvelle tâche : ${(payload.new as any).title}`, {
                description: (payload.new as any).country_label || undefined,
              });
              break;
            case 'UPDATE': {
              const newData = payload.new as any;
              const oldData = payload.old as any;
              const statusChanged = oldData?.status !== newData?.status;
              toast.info(
                statusChanged
                  ? `🔄 Tâche "${newData.title}" → ${statusLabels[newData.status] || newData.status}`
                  : `✏️ Tâche modifiée : ${newData.title}`,
                { description: newData.country_label || undefined }
              );
              break;
            }
            case 'DELETE':
              toast.info(`🗑️ Tâche supprimée`, {
                description: (payload.old as any)?.title,
              });
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
