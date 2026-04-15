import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CHECKLIST: Record<number, string[]> = {
  0: ['Étude de marché préliminaire', 'Identification des opportunités', 'Analyse concurrentielle', 'Budget prévisionnel estimé'],
  1: ['Étude légale & réglementaire', 'Partenaire local identifié', 'Licence / agrément obtenu', 'Structure juridique définie', 'Contrat cadre négocié'],
  2: ['Entité locale créée', 'Équipe recrutée', 'Infrastructure IT déployée', 'Compte bancaire ouvert', 'Partenariats signés'],
  3: ['Produit / service lancé', 'Premiers clients acquis', 'Marketing lancé', 'Support client opérationnel', 'Tableau de bord KPIs actif'],
  4: ['Objectifs CA atteints', 'Processus stabilisés', 'Équipe autonome', 'Reporting mensuel en place', 'Plan de croissance validé'],
};

export function usePhaseChecklist(countryId: string, phase: number) {
  return useQuery({
    queryKey: ['phase_checklist', countryId, phase],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_checklist_items')
        .select('*')
        .eq('country_id', countryId)
        .eq('phase', phase)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useInitPhaseChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ countryId, phase }: { countryId: string; phase: number }) => {
      const labels = DEFAULT_CHECKLIST[phase] || [];
      const items = labels.map((label, i) => ({
        country_id: countryId,
        phase,
        label,
        sort_order: i,
        is_checked: false,
      }));
      const { error } = await supabase.from('phase_checklist_items').insert(items);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['phase_checklist', vars.countryId, vars.phase] });
    },
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_checked, countryId, phase }: { id: string; is_checked: boolean; countryId: string; phase: number }) => {
      const { error } = await supabase.from('phase_checklist_items')
        .update({ is_checked, checked_at: is_checked ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
      return { countryId, phase };
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['phase_checklist', vars.countryId, vars.phase] });
    },
  });
}
