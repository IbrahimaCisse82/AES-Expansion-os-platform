import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type RiskRow = Database['public']['Tables']['risks']['Row'];
type CommentRow = Database['public']['Tables']['comments']['Row'];
type MentionRow = Database['public']['Tables']['comment_mentions']['Row'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type PrefEntry = { email?: boolean; in_app?: boolean };
type PrefsMap = Record<string, PrefEntry>;

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

    // Load preferences once; default = enabled in-app
    let prefs: PrefsMap = {};
    supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        prefs = (data?.notification_preferences ?? {}) as PrefsMap;
      });
    const inAppEnabled = (type: string): boolean => {
      const p = prefs[type];
      return p ? p.in_app !== false : true;
    };

    const channel = supabase
      .channel('realtime-notifications')
      // Tasks
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        const newRow = payload.new as Partial<TaskRow> | undefined;
        const oldRow = payload.old as Partial<TaskRow> | undefined;
        const record = newRow ?? oldRow;
        if (record?.created_by === user.id) return;

        switch (payload.eventType) {
          case 'INSERT':
            if (newRow?.title) {
              toast.info(`📋 Nouvelle tâche : ${newRow.title}`, {
                description: newRow.country_label || undefined,
              });
            }
            break;
          case 'UPDATE': {
            const newData = newRow;
            const oldData = oldRow;
            if (!newData?.title) break;
            const statusChanged = oldData?.status !== newData?.status;
            toast.info(
              statusChanged
                ? `🔄 Tâche "${newData.title}" → ${statusLabels[newData.status ?? ''] || newData.status}`
                : `✏️ Tâche modifiée : ${newData.title}`,
              { description: newData.country_label || undefined }
            );
            break;
          }
          case 'DELETE':
            toast.info(`🗑️ Tâche supprimée`, { description: oldRow?.title || undefined });
            break;
        }
      })
      // Risks
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risks' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['risks'] });
        const newRow = payload.new as Partial<RiskRow> | undefined;
        const oldRow = payload.old as Partial<RiskRow> | undefined;

        switch (payload.eventType) {
          case 'INSERT': {
            const r = newRow;
            if (!r?.title) break;
            toast.info(`⚠️ Nouveau risque : ${r.title}`, {
              description: `${riskLevelLabels[r.level ?? ''] || r.level} · ${r.country_label || ''}`,
            });
            break;
          }
          case 'UPDATE': {
            const r = newRow;
            if (!r?.title) break;
            toast.info(`🔄 Risque modifié : ${r.title}`, {
              description: `${riskLevelLabels[r.level ?? ''] || r.level} · ${r.country_label || ''}`,
            });
            break;
          }
          case 'DELETE':
            toast.info(`🗑️ Risque supprimé`, { description: oldRow?.title || undefined });
            break;
        }
      })
      // Comments
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['comments'] });
        const newRow = payload.new as Partial<CommentRow> | undefined;
        const oldRow = payload.old as Partial<CommentRow> | undefined;
        const record = newRow ?? oldRow;
        if (record?.author_id === user.id) return;

        switch (payload.eventType) {
          case 'INSERT': {
            const c = newRow;
            if (!c) break;
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
      // Mentions — notify when YOU are mentioned
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comment_mentions' }, (payload) => {
        const mention = payload.new as Partial<MentionRow> | undefined;
        if (mention?.mentioned_user_id === user.id && inAppEnabled('mention')) {
          toast.info(`🔔 Vous avez été mentionné(e) par un collègue`, {
            description: `@${mention.mentioned_name}`,
            duration: 6000,
          });
        }
      })
      // Generic notifications table — owner only via RLS, but filter just in case
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        const n = payload.new as Partial<NotificationRow> | undefined;
        if (!n?.title) return;
        if (!inAppEnabled(n.type ?? '')) return;
        toast.info(n.title, { description: n.message || undefined, duration: 6000 });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
