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

type PrefEntry = { email: boolean; in_app: boolean };
type PrefsMap = Record<string, PrefEntry>;

interface PrefRow {
  notif_type: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification_preferences', user?.id],
    queryFn: async (): Promise<PrefRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      const prefs = (data?.notification_preferences ?? {}) as PrefsMap;
      return Object.entries(prefs).map(([notif_type, v]) => ({
        notif_type,
        email_enabled: !!v?.email,
        in_app_enabled: !!v?.in_app,
      }));
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
      const { data: cur, error: readErr } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .maybeSingle();
      if (readErr) throw readErr;
      const prefs = { ...((cur?.notification_preferences ?? {}) as PrefsMap) };
      prefs[notif_type] = { email: email_enabled, in_app: in_app_enabled };
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: prefs })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_preferences'] }),
  });
}
