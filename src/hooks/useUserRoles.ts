import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

export function useCurrentUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? 'observer';
    },
    enabled: !!user,
  });
}

/** Périmètre pays du profil courant : null = tous les pays */
export function useMyCountryScope() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-scope', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('scope_country_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.scope_country_id ?? null;
    },
    enabled: !!user,
  });
}

export function useAllUsersWithRoles() {
  return useQuery({
    queryKey: ['all-users-roles'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('*');
      if (rErr) throw rErr;

      return (profiles ?? []).map((p) => {
        const userRole = (roles ?? []).find((r) => r.user_id === p.user_id);
        return {
          ...p,
          role: userRole?.role ?? 'observer',
          role_id: userRole?.id,
          scope_country_id: userRole?.scope_country_id ?? null,
        };
      });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as Database['public']['Enums']['app_role'] })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users-roles'] });
      qc.invalidateQueries({ queryKey: ['my-role'] });
    },
  });
}

export function useUpdateUserScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, countryId }: { userId: string; countryId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ scope_country_id: countryId })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users-roles'] });
      qc.invalidateQueries({ queryKey: ['my-scope'] });
    },
  });
}
