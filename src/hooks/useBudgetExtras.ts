import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Audit Log ───
export interface BudgetAuditEntry {
  id: string;
  budget_line_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export function useBudgetAuditLog(budgetLineId?: string) {
  return useQuery({
    queryKey: ['budget_audit_log', budgetLineId],
    enabled: !!budgetLineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_audit_log')
        .select('*')
        .eq('budget_line_id', budgetLineId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BudgetAuditEntry[];
    },
  });
}

export async function logBudgetChange(params: {
  budgetLineId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('budget_audit_log').insert({
    budget_line_id: params.budgetLineId,
    field_name: params.fieldName,
    old_value: params.oldValue,
    new_value: params.newValue,
    user_id: user.id,
    user_name: user.user_metadata?.full_name || user.email || '',
  });
}

// ─── Line Comments ───
export interface BudgetLineComment {
  id: string;
  budget_line_id: string;
  content: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

export function useBudgetLineComments(budgetLineId?: string) {
  return useQuery({
    queryKey: ['budget_line_comments', budgetLineId],
    enabled: !!budgetLineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_line_comments')
        .select('*')
        .eq('budget_line_id', budgetLineId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as BudgetLineComment[];
    },
  });
}

export function useCreateLineComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { budget_line_id: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('budget_line_comments').insert({
        budget_line_id: params.budget_line_id,
        content: params.content,
        author_id: user?.id,
        author_name: user?.user_metadata?.full_name || user?.email || '',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budget_line_comments', vars.budget_line_id] }),
  });
}

export function useDeleteLineComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, budgetLineId }: { id: string; budgetLineId: string }) => {
      const { error } = await supabase.from('budget_line_comments').delete().eq('id', id);
      if (error) throw error;
      return budgetLineId;
    },
    onSuccess: (budgetLineId) => qc.invalidateQueries({ queryKey: ['budget_line_comments', budgetLineId] }),
  });
}

// ─── Budget Notifications ───
export interface BudgetNotification {
  id: string;
  scenario_id: string;
  scenario_name: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useBudgetNotifications() {
  return useQuery({
    queryKey: ['budget_notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as BudgetNotification[];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_notifications'] }),
  });
}

export async function notifyBudgetStatusChange(params: {
  scenarioId: string;
  scenarioName: string;
  newStatus: string;
  excludeUserId?: string;
}) {
  const statusLabels: Record<string, string> = {
    submitted: 'soumis pour approbation',
    approved: 'approuvé',
    rejected: 'rejeté',
    locked: 'verrouillé',
    draft: 'remis en brouillon',
  };
  const message = `Le scénario "${params.scenarioName}" a été ${statusLabels[params.newStatus] || params.newStatus}`;

  // Get all users with admin/director roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'director']);

  if (!roles || roles.length === 0) return;

  const notifications = roles
    .filter(r => r.user_id !== params.excludeUserId)
    .map(r => ({
      scenario_id: params.scenarioId,
      scenario_name: params.scenarioName,
      user_id: r.user_id,
      type: params.newStatus,
      message,
    }));

  if (notifications.length > 0) {
    await supabase.from('budget_notifications').insert(notifications);
  }
}
