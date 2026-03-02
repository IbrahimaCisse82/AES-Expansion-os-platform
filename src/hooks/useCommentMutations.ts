import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from './useActivityLogger';

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: TablesInsert<'comments'>) => {
      const { data, error } = await supabase.from('comments').insert(comment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: 'a publié un commentaire', entityType: 'comment' });
    },
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'comments'> & { id: string }) => {
      const { data, error } = await supabase.from('comments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: 'a modifié un commentaire', entityType: 'comment' });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      logActivity({ action: 'a supprimé un commentaire', entityType: 'comment' });
    },
  });
}
