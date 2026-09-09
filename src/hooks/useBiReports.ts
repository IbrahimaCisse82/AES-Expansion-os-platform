import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReportConfig } from '@/lib/biAggregate';
import type { BiFilters } from '@/lib/biAggregate';
import { useAuth } from './useAuth';

export interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  config: { report: ReportConfig; filters: BiFilters };
  owner_id: string | null;
  visibility: 'private' | 'team';
  scope_country_id: string | null;
  created_at: string;
}

export interface ReportSchedule {
  id: string;
  report_id: string | null;
  template_code: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: number;
  recipients: string[];
  is_active: boolean;
  last_sent_at: string | null;
}

export interface ReportInstance {
  id: string;
  template_code: string;
  title: string;
  country_id: string | null;
  pole_id: string | null;
  period: string;
  data: Record<string, unknown>;
  author_id: string | null;
  author_name: string | null;
  status: 'draft' | 'submitted' | 'validated';
  sent_at: string | null;
  created_at: string;
}

export function useSavedReports() {
  return useQuery({
    queryKey: ['bi_saved_reports'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_saved_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedReport[];
    },
  });
}

export function useReportSchedules() {
  return useQuery({
    queryKey: ['bi_report_schedules'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_report_schedules').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({ ...r, recipients: (r.recipients as string[]) ?? [] })) as unknown as ReportSchedule[];
    },
  });
}

export function useReportInstances() {
  return useQuery({
    queryKey: ['bi_report_instances'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_report_instances').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReportInstance[];
    },
  });
}

export function useBiReportMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const saveReport = useMutation({
    mutationFn: async (input: { name: string; description: string; config: SavedReport['config']; visibility: 'private' | 'team'; scope_country_id: string | null }) => {
      const { error } = await supabase.from('bi_saved_reports').insert({
        name: input.name,
        description: input.description || null,
        config: input.config as unknown as Record<string, never>,
        owner_id: user?.id ?? null,
        visibility: input.visibility,
        scope_country_id: input.scope_country_id,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bi_saved_reports'] }); toast.success('Rapport sauvegardé'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bi_saved_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bi_saved_reports'] }); toast.success('Rapport supprimé'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const saveSchedule = useMutation({
    mutationFn: async (input: { report_id?: string; template_code?: string; frequency: string; hour: number; recipients: string[] }) => {
      const { error } = await supabase.from('bi_report_schedules').insert({
        report_id: input.report_id ?? null,
        template_code: input.template_code ?? null,
        frequency: input.frequency,
        hour: input.hour,
        recipients: input.recipients,
        created_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bi_report_schedules'] }); toast.success('Planification créée'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('bi_report_schedules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bi_report_schedules'] }),
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bi_report_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bi_report_schedules'] }); toast.success('Planification supprimée'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  return { saveReport, deleteReport, saveSchedule, toggleSchedule, deleteSchedule };
}

export function useBiInstanceMutations() {
  const qc = useQueryClient();

  const saveInstance = useMutation({
    mutationFn: async (input: { template_code: string; title: string; country_id: string | null; pole_id: string | null; period: string; data: Record<string, unknown>; author_id: string | null; author_name: string | null }) => {
      const { data, error } = await supabase.from('bi_report_instances').insert({
        ...input,
        data: input.data as never,
        status: 'draft',
      } as never).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bi_report_instances'] }); toast.success('Rapport créé (brouillon)'); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  const updateInstance = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; data?: Record<string, unknown>; status?: string; sent_at?: string }) => {
      const { error } = await supabase.from('bi_report_instances').update(patch as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bi_report_instances'] }); },
    onError: (e) => toast.error(`Erreur : ${(e as Error).message}`),
  });

  return { saveInstance, updateInstance };
}
