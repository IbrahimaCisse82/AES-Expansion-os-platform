import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSubtasks(taskId?: string) {
  return useQuery({
    queryKey: ['subtasks', taskId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('subtasks').select('*').order('sort_order');
      if (taskId) q = q.eq('task_id', taskId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { task_id: string; title: string; sort_order?: number }) => {
      const { error } = await supabase.from('subtasks').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase.from('subtasks').update({ is_done }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  });
}
