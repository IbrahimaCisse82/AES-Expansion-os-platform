import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error'>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (data.valid === false && data.reason === 'already_unsubscribed') {
          setStatus('already');
        } else if (data.valid) {
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('invalid');
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus('success');
      } else if (data?.reason === 'already_unsubscribed') {
        setStatus('already');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <h1 className="font-display text-xl font-bold text-primary">ExpansionOS</h1>

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Vérification en cours…</p>
        )}

        {status === 'valid' && (
          <>
            <p className="text-sm text-muted-foreground">
              Souhaitez-vous vous désabonner des emails de notification ?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={processing}
              className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {processing ? 'Traitement…' : 'Confirmer le désabonnement'}
            </button>
          </>
        )}

        {status === 'success' && (
          <p className="text-sm text-[hsl(var(--sage))]">
            ✓ Vous avez été désabonné avec succès.
          </p>
        )}

        {status === 'already' && (
          <p className="text-sm text-muted-foreground">
            Vous êtes déjà désabonné.
          </p>
        )}

        {status === 'invalid' && (
          <p className="text-sm text-destructive">
            Lien de désabonnement invalide ou expiré.
          </p>
        )}

        {status === 'error' && (
          <p className="text-sm text-destructive">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}
      </div>
    </div>
  );
}
