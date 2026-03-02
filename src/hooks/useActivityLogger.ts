import { supabase } from '@/integrations/supabase/client';

interface LogParams {
  action: string;
  entityType?: string;
  entityId?: string;
  marketFlag?: string;
}

export async function logActivity({ action, entityType, entityId, marketFlag }: LogParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const fullName = user.user_metadata?.full_name || user.email || 'Utilisateur';

  await supabase.from('activity_log').insert({
    action,
    entity_type: entityType ?? '',
    entity_id: entityId ?? '',
    user_id: user.id,
    user_name: fullName,
    market_flag: marketFlag ?? '',
    color: 'navy',
  });
}
