import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('pct', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMilestones(countryId?: string | null) {
  return useQuery({
    queryKey: ['milestones', countryId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('milestones').select('*').order('sort_order');
      if (countryId) query = query.eq('country_id', countryId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRisks() {
  return useQuery({
    queryKey: ['risks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .order('level');
      if (error) throw error;
      return data;
    },
  });
}

export function useBudgetEntries() {
  return useQuery({
    queryKey: ['budget_entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_entries')
        .select('*');
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRoadmapBars() {
  return useQuery({
    queryKey: ['roadmap_bars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_bars')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}
