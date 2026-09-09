import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BiFact, BiActivity } from '@/lib/biAggregate';
import { useMyCountryScope } from './useUserRoles';

export interface BiPole {
  id: string;
  code: string;
  label: string;
  color: string;
  sort_order: number;
}

export interface BiProject {
  id: string;
  code: string;
  name: string;
  country_id: string | null;
  pole_id: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_total: number;
  status: string;
  owner_name: string | null;
  notes: string | null;
}

export function useBiPoles() {
  return useQuery({
    queryKey: ['bi_poles'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_poles').select('*').order('sort_order');
      if (error) throw error;
      return data as BiPole[];
    },
  });
}

export function useBiProjects() {
  return useQuery({
    queryKey: ['bi_projects'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_projects').select('*').order('name');
      if (error) throw error;
      return data as BiProject[];
    },
  });
}

export function useBiFacts() {
  return useQuery({
    queryKey: ['bi_budget_facts'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_budget_facts').select('*');
      if (error) throw error;
      return (data ?? []).map((r): BiFact => ({
        id: r.id as string,
        scenario_id: r.scenario_id as string,
        country_id: r.country_id ?? null,
        country_label: r.country_label ?? null,
        pole_id: r.pole_id ?? null,
        pole_code: (r as Record<string, unknown>).pole_code as string | null,
        pole_label: (r as Record<string, unknown>).pole_label as string | null,
        project_id: (r as Record<string, unknown>).project_id as string | null,
        project_name: (r as Record<string, unknown>).project_name as string | null,
        category_id: r.category_id ?? null,
        category_name: (r as Record<string, unknown>).category_name as string | null,
        category_type: (r as Record<string, unknown>).category_type as string | null,
        line_type: r.line_type as string,
        months: [r.m1, r.m2, r.m3, r.m4, r.m5, r.m6, r.m7, r.m8, r.m9, r.m10, r.m11, r.m12].map(v => Number(v) || 0),
      }));
    },
  });
}

export function useBiActivity() {
  return useQuery({
    queryKey: ['bi_activity_facts'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_activity_facts').select('*');
      if (error) throw error;
      return (data ?? []).map((r): BiActivity => ({
        id: r.id as string,
        item_type: (r as Record<string, unknown>).item_type as 'task' | 'risk',
        country_id: r.country_id ?? null,
        project_id: (r as Record<string, unknown>).project_id as string | null,
        status: r.status as string,
      }));
    },
  });
}

export function useBiScenarios() {
  return useQuery({
    queryKey: ['bi_scenarios'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_scenarios')
        .select('id, name, status, is_baseline')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Périmètre pays effectif pour le BI (RAF / country manager scopés). */
export function useBiScope() {
  return useMyCountryScope();
}
