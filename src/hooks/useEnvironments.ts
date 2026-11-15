import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from './useUserRoles';
import { allowedEnvs, defaultEnv, type EnvAccess, type EnvId } from '@/lib/environments';

export function useEnvironmentAccess() {
  return useQuery({
    queryKey: ['environment_access'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EnvAccess> => {
      const { data, error } = await supabase.from('environment_access').select('role, env, enabled');
      if (error) throw error;
      const out: EnvAccess = {};
      for (const r of data ?? []) {
        out[r.role] ??= [];
        if (r.enabled) out[r.role].push(r.env as EnvId);
      }
      return out;
    },
  });
}

/** Environnements ouverts pour l'utilisateur connecté (matrice paramétrée, sinon défauts). */
export function useMyEnvironments() {
  const { data: role, isPending: rolePending } = useCurrentUserRole();
  const { data: access, isPending: accessPending, isError } = useEnvironmentAccess();
  const matrix = isError ? null : access ?? null;
  return {
    role: role ?? null,
    isPending: rolePending || (accessPending && !isError),
    envs: allowedEnvs(role, matrix),
    defaultEnv: (last: string | null) => defaultEnv(role, last, matrix),
  };
}

export function useSetEnvironmentAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, env, enabled }: { role: string; env: EnvId; enabled: boolean }) => {
      const { data, error } = await supabase.from('environment_access').update({ enabled }).eq('role', role as never).eq('env', env).select('role');
      if (error) throw error;
      if (!data?.length) throw new Error('Modification refusée (réservée à l’administrateur)');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['environment_access'] }),
  });
}
