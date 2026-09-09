import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BiProjectInput {
  code: string;
  name: string;
  country_id: string | null;
  pole_id: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_total: number;
  status: string;
  notes: string | null;
}

export function useBiProjectMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['bi_projects'] });

  const create = useMutation({
    mutationFn: async (input: BiProjectInput) => {
      const { error } = await supabase.from('bi_projects').insert(input);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Sous-budget projet créé'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: BiProjectInput & { id: string }) => {
      const { error } = await supabase.from('bi_projects').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Sous-budget mis à jour'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bi_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Sous-budget supprimé'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  return { create, update, remove };
}
