import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCountryScope } from './useUserRoles';
import { fetchAllRows } from '@/lib/fetchAll';

export function useCountries(opts: { enabled?: boolean } = {}) {
  const { data: scope } = useMyCountryScope();
  return useQuery({
    enabled: opts.enabled ?? true,
    queryKey: ['countries', scope ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('countries')
        .select('*')
        .order('pct', { ascending: false });
      if (scope) query = query.eq('id', scope);
      const ordered = query.order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

export function useMilestones(countryId?: string | null) {
  return useQuery({
    queryKey: ['milestones', countryId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('milestones').select('*').order('sort_order');
      if (countryId) query = query.eq('country_id', countryId);
      const ordered = query.order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

export function useTasks(opts: { enabled?: boolean } = {}) {
  const { data: scope } = useMyCountryScope();
  return useQuery({
    enabled: opts.enabled ?? true,
    queryKey: ['tasks', scope ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (scope) query = query.eq('country_id', scope);
      const ordered = query.order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

export function useRisks(opts: { enabled?: boolean } = {}) {
  const { data: scope } = useMyCountryScope();
  return useQuery({
    enabled: opts.enabled ?? true,
    queryKey: ['risks', scope ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('risks')
        .select('*')
        .order('level');
      if (scope) query = query.eq('country_id', scope);
      const ordered = query.order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

export function useBudgetEntries() {
  const { data: scope } = useMyCountryScope();
  return useQuery({
    queryKey: ['budget_entries', scope ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('budget_entries')
        .select('*');
      if (scope) query = query.eq('country_id', scope);
      const ordered = query.order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

export function useActivityLog() {
  return useQuery({
    queryKey: ['activity_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useComments() {
  return useQuery({
    queryKey: ['comments'],
    queryFn: async () => {
      const ordered = supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

export function useRoadmapBars() {
  return useQuery({
    queryKey: ['roadmap_bars'],
    queryFn: async () => {
      const ordered = supabase
        .from('roadmap_bars')
        .select('*')
        .order('sort_order')
        .order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });
}

/**
 * Indicateurs réels par pays (risques ouverts, membres d'équipe, budget alloué en K FCFA),
 * à la place des colonnes figées countries.risk_count / team_size / budget.
 */
export function useCountryStats(opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled ?? true;
  const { data: risks = [] } = useRisks({ enabled });
  const { data: budget = [] } = useBudgetEntries();
  const { data: members = [] } = useQuery({
    queryKey: ['country_members', 'stats'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('country_members').select('country_id');
      if (error) throw error;
      return data ?? [];
    },
  });
  const stats: Record<string, { risks: number; team: number; budgetK: number }> = {};
  const get = (id: string | null | undefined) => (id ? (stats[id] ??= { risks: 0, team: 0, budgetK: 0 }) : null);
  for (const r of risks) { const s = get(r.country_id); if (s && (r as { risk_status?: string | null }).risk_status !== 'closed') s.risks += 1; }
  for (const m of members) { const s = get(m.country_id); if (s) s.team += 1; }
  for (const b of budget) { const s = get(b.country_id); if (s) s.budgetK += Number(b.allocated_k) || 0; }
  return stats;
}
