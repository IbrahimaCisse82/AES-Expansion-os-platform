import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    // Check hash for recovery token
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl p-11 w-[460px] max-w-[95vw] shadow-elevated text-center">
          <CheckCircle size={48} className="text-primary mx-auto mb-4" />
          <h1 className="font-display text-[22px] font-bold text-primary mb-2">Mot de passe mis à jour</h1>
          <p className="text-[13px] text-muted-foreground mb-6">
            Votre mot de passe a été modifié avec succès.
          </p>
          <a
            href="/"
            className="inline-block w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-all text-center"
          >
            Accéder à la plateforme →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-11 w-[460px] max-w-[95vw] shadow-elevated text-center">
        <div className="w-12 h-12 bg-primary rounded-[14px] flex items-center justify-center mx-auto mb-4">
          <ChevronRight size={20} className="text-primary-foreground" />
        </div>
        <h1 className="font-display text-[22px] font-bold text-primary mb-1.5">
          {isRecovery ? 'Réinitialiser le mot de passe' : 'Définir votre mot de passe'}
        </h1>
        <p className="text-[13px] text-muted-foreground mb-7">
          {isRecovery
            ? 'Choisissez un nouveau mot de passe pour votre compte'
            : 'Créez un mot de passe pour accéder à votre compte'}
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-lg text-[13.5px] bg-muted outline-none focus:border-primary focus:bg-card transition-colors font-sans"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-lg text-[13.5px] bg-muted outline-none focus:border-primary focus:bg-card transition-colors font-sans"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-[12.5px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'Enregistrer le mot de passe →'}
          </button>
        </form>
      </div>
    </div>
  );
}
