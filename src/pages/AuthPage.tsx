import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Play } from 'lucide-react';
import authIllustration from '@/assets/auth-illustration.jpg';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('demo-login');
      if (fnErr) throw fnErr;
      const { email, password } = data;
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion démo');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle background shapes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-11 w-[460px] max-w-[95vw] shadow-elevated text-center relative z-10">
          <div className="w-12 h-12 bg-primary rounded-[14px] flex items-center justify-center mx-auto mb-4">
            <ChevronRight size={20} className="text-primary-foreground" />
          </div>
          <h1 className="font-display text-[26px] font-bold text-primary mb-1.5">ExpansionOS</h1>
          <p className="text-[13px] text-muted-foreground mb-7">
            Connectez-vous à votre plateforme d'expansion
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
                className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-lg text-[13.5px] bg-cream outline-none focus:border-sage focus:bg-card transition-colors font-sans"
                placeholder="alice@company.com"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-lg text-[13.5px] bg-cream outline-none focus:border-sage focus:bg-card transition-colors font-sans"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-[12.5px] text-terracotta bg-terracotta-light rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-navy-mid transition-all disabled:opacity-50"
            >
              {loading ? '...' : 'Se connecter →'}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-1.5">
            <a href="/forgot-password" className="text-[12px] text-primary hover:underline">
              Mot de passe oublié ?
            </a>
            <p className="text-[12px] text-muted-foreground">
              Pas encore de compte ? Contactez votre administrateur.
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <button
              onClick={handleDemo}
              disabled={demoLoading}
              className="w-full py-2.5 bg-muted text-primary text-[13px] font-medium rounded-lg hover:bg-muted/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play size={14} />
              {demoLoading ? 'Préparation…' : 'Accéder au compte démo'}
            </button>
            <p className="text-[11px] text-muted-foreground mt-2">Explorez la plateforme avec des données de test</p>
          </div>
        </div>
      </div>

      {/* Right — Illustration (hidden on mobile) */}
      <div className="hidden lg:block w-1/2 relative">
        <img
          src={authIllustration}
          alt="Carte mondiale de l'expansion internationale"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/40" />
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <p className="text-primary-foreground/90 font-display text-2xl font-semibold leading-snug">
            Pilotez votre expansion<br />internationale en temps réel
          </p>
          <p className="text-primary-foreground/60 text-sm mt-2">
            Suivi des marchés · Gestion des risques · Roadmap collaborative
          </p>
        </div>
      </div>
    </div>
  );
}
