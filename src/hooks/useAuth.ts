import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const DEMO_EMAIL = 'demo@expansionos.app';

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
    // If current user is demo, clean up demo data server-side
    const currentEmail = session?.user?.email;
    if (currentEmail === DEMO_EMAIL) {
      try {
        await supabase.functions.invoke('demo-login', {
          body: { action: 'cleanup' },
        });
      } catch {
        // Cleanup failure shouldn't block sign out
      }
    }
    await supabase.auth.signOut();
  };

  return { session, loading, signOut, user: session?.user ?? null };
}
