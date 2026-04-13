import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCommentReactions(commentIds: string[]) {
  return useQuery({
    queryKey: ['comment_reactions', commentIds],
    queryFn: async () => {
      if (!commentIds.length) return [];
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('*')
        .in('comment_id', commentIds);
      if (error) throw error;
      return data;
    },
    enabled: commentIds.length > 0,
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, emoji, userId }: { commentId: string; emoji: string; userId: string }) => {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('comment_reactions').delete().eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        const { error } = await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: userId, emoji });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comment_reactions'] });
    },
  });
}
