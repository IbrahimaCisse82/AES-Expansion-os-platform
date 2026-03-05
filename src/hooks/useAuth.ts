import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const DEMO_EMAIL = 'demo@expansionos.app';
const DEMO_COUNTRY_IDS = ['jp', 'de', 'br', 'au', 'ng', 'sa'];

async function cleanDemoData() {
  // Delete demo-seeded data by known IDs (order matters for FK)
  await supabase.from('activity_log').delete().is('user_id', null);
  await supabase.from('comments').delete().in('market_id', DEMO_COUNTRY_IDS);
  await supabase.from('budget_entries').delete().in('country_id', DEMO_COUNTRY_IDS);
  await supabase.from('milestones').delete().in('country_id', DEMO_COUNTRY_IDS);
  await supabase.from('roadmap_bars').delete().in('country_id', DEMO_COUNTRY_IDS);
  await supabase.from('risks').delete().in('country_id', DEMO_COUNTRY_IDS);
  await supabase.from('tasks').delete().in('country_id', DEMO_COUNTRY_IDS);
  await supabase.from('countries').delete().in('id', DEMO_COUNTRY_IDS);
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // If current user is demo, clean up demo data before signing out
    const currentEmail = session?.user?.email;
    if (currentEmail === DEMO_EMAIL) {
      await cleanDemoData();
    }
    await supabase.auth.signOut();
  };

  return { session, loading, signOut, user: session?.user ?? null };
}
