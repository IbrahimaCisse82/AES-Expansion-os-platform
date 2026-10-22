import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Nombre de messages portant le tag d'un objet (rapport, devis…). */
export function useDiscussionCount(tag: string | null) {
  return useQuery({
    queryKey: ['comments', 'tag-count', tag],
    enabled: !!tag,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase.from('comments').select('id', { count: 'exact', head: true }).contains('tags', [tag as string]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
