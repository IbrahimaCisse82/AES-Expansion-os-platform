import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ArrowLeft, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl p-11 w-[460px] max-w-[95vw] shadow-elevated text-center">
          <MailCheck size={48} className="text-primary mx-auto mb-4" />
          <h1 className="font-display text-[22px] font-bold text-primary mb-2">Email envoyé</h1>
          <p className="text-[13px] text-muted-foreground mb-6">
            Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Retour à la connexion
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
        <h1 className="font-display text-[22px] font-bold text-primary mb-1.5">Mot de passe oublié</h1>
        <p className="text-[13px] text-muted-foreground mb-7">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-lg text-[13.5px] bg-muted outline-none focus:border-primary focus:bg-card transition-colors font-sans"
              placeholder="alice@company.com"
              required
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
            {loading ? '...' : 'Envoyer le lien →'}
          </button>
        </form>

        <a
          href="/"
          className="inline-flex items-center gap-1.5 mt-5 text-[12px] text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={13} /> Retour à la connexion
        </a>
      </div>
    </div>
  );
}
