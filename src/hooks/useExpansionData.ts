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
