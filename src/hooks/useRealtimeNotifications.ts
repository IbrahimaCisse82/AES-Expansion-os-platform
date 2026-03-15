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

const riskLevelLabels: Record<string, string> = {
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
};

export function useRealtimeNotifications() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime-notifications')
      // Tasks
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['tasks'] });
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
            toast.info(`🗑️ Tâche supprimée`, { description: (payload.old as any)?.title });
            break;
        }
      })
      // Risks
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risks' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['risks'] });

        switch (payload.eventType) {
          case 'INSERT': {
            const r = payload.new as any;
            toast.info(`⚠️ Nouveau risque : ${r.title}`, {
              description: `${riskLevelLabels[r.level] || r.level} · ${r.country_label || ''}`,
            });
            break;
          }
          case 'UPDATE': {
            const r = payload.new as any;
            toast.info(`🔄 Risque modifié : ${r.title}`, {
              description: `${riskLevelLabels[r.level] || r.level} · ${r.country_label || ''}`,
            });
            break;
          }
          case 'DELETE':
            toast.info(`🗑️ Risque supprimé`, { description: (payload.old as any)?.title });
            break;
        }
      })
      // Comments
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['comments'] });
        const record = (payload.new as any) || (payload.old as any);
        if (record?.author_id === user.id) return;

        switch (payload.eventType) {
          case 'INSERT': {
            const c = payload.new as any;
            toast.info(`💬 ${c.author_name} a commenté`, {
              description: c.content?.substring(0, 80) || undefined,
            });
            break;
          }
          case 'DELETE':
            toast.info(`🗑️ Commentaire supprimé`);
            break;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
