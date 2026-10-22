import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCurrentUserRole } from './useUserRoles';
import type { ReportData } from '@/lib/reporting/templates';

export type ReportStatus = 'draft' | 'submitted' | 'validated' | 'rejected';

export interface Report {
  id: string;
  template_code: string;
  title: string;
  country_id: string | null;
  pole_id: string | null;
  period: string;
  data: ReportData;
  author_id: string | null;
  author_name: string | null;
  status: ReportStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<ReportStatus, string> = { draft: 'Brouillon', submitted: 'Soumis', validated: 'Validé', rejected: 'À corriger' };

/** Miroir de public.report_can_review (la base reste l'arbitre). */
export function canReview(role: string | null | undefined, template: string) {
  if (role === 'admin' || role === 'director') return true;
  if (template === 'A4' && role === 'raf') return true;
  return ['A5', 'A6', 'A7', 'A8', 'A11'].includes(template) && role === 'dhr';
}

export function useReports(opts: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: opts.enabled ?? true,
    queryKey: ['bi_report_instances'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('bi_report_instances').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({ ...r, data: (r.data ?? {}) as ReportData, status: r.status as ReportStatus })) as Report[];
    },
  });
}

export function useReportingRole() {
  const { user } = useAuth();
  const { data: role } = useCurrentUserRole();
  return {
    userId: user?.id ?? null,
    userName: ((user?.user_metadata as Record<string, string> | undefined)?.full_name ?? user?.email ?? null) as string | null,
    role: role ?? null,
    canWrite: !!role && !['observer', 'partner'].includes(role),
  };
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

/** RLS : une ligne non visible ou non modifiable n'est pas une erreur SQL, juste 0 ligne touchée. */
function touched<T>(rows: T[] | null): T[] {
  if (!rows?.length) throw new Error('Action non autorisée pour votre profil');
  return rows;
}

export function useReportMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['bi_report_instances'] });
  const create = useMutation({
    mutationFn: async (input: { template_code: string; title: string; period: string; data: ReportData; pole_id: string | null; country_id: string | null; author_name: string | null; status: 'draft' | 'submitted' }) =>
      must(supabase.from('bi_report_instances').insert({ ...input, data: input.data as never }).select('id').single()),
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; data?: ReportData; period?: string; status?: ReportStatus; review_comment?: string | null }) =>
      touched(await must(supabase.from('bi_report_instances').update({ ...patch, data: patch.data as never }).eq('id', id).select('id'))),
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => touched(await must(supabase.from('bi_report_instances').delete().eq('id', id).select('id'))),
    onSuccess: done,
  });
  return { create, update, remove };
}
