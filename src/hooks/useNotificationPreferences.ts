import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const NOTIF_TYPES = [
  { key: 'task_assigned', label: 'Tâche assignée' },
  { key: 'task_overdue', label: 'Tâche en retard' },
  { key: 'risk_alert', label: 'Risque élevé' },
  { key: 'kpi_alert', label: 'Alerte KPI' },
  { key: 'mention', label: 'Mention (@)' },
  { key: 'budget_workflow', label: 'Workflow budget' },
  { key: 'comment_reply', label: 'Réponse commentaire' },
  { key: 'milestone_j7', label: 'Jalon dans 7 jours' },
  { key: 'new_member', label: 'Nouveau membre' },
  { key: 'role_changed', label: 'Changement de rôle' },
  { key: 'document_uploaded', label: 'Document ajouté (pays suivi)' },
  { key: 'market_status_changed', label: 'Statut marché modifié' },
  { key: 'budget_threshold', label: 'Budget > 90 %' },
  { key: 'monthly_report', label: 'Rapport mensuel' },
] as const;

export { NOTIF_TYPES };

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification_preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useUpsertNotificationPref() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ notif_type, email_enabled, in_app_enabled }: {
      notif_type: string; email_enabled: boolean; in_app_enabled: boolean;
    }) => {
      if (!user?.id) throw new Error('Non authentifié');
      const { error } = await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        notif_type,
        email_enabled,
        in_app_enabled,
      }, { onConflict: 'user_id,notif_type' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_preferences'] }),
  });
}
