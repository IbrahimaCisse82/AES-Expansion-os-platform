import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Play } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion démo');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setSuccess('Vérifiez votre email pour confirmer votre inscription.');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-11 w-[460px] max-w-[95vw] shadow-elevated text-center">
        <div className="w-12 h-12 bg-primary rounded-[14px] flex items-center justify-center mx-auto mb-4">
          <ChevronRight size={20} className="text-primary-foreground" />
        </div>
        <h1 className="font-display text-[26px] font-bold text-primary mb-1.5">ExpansionOS</h1>
        <p className="text-[13px] text-muted-foreground mb-7">
          {isLogin ? 'Connectez-vous à votre plateforme d\'expansion' : 'Créez votre compte ExpansionOS'}
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-3.5">
          {!isLogin && (
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 border-[1.5px] border-border rounded-lg text-[13.5px] bg-cream outline-none focus:border-sage focus:bg-card transition-colors font-sans"
                placeholder="Alice Dupont"
                required
              />
            </div>
          )}
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
          {success && (
            <div className="text-[12.5px] text-sage-dark bg-sage-light rounded-lg px-3 py-2">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-navy-mid transition-all disabled:opacity-50"
          >
            {loading ? '...' : isLogin ? 'Se connecter →' : 'Créer mon compte →'}
          </button>
        </form>

        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
          className="mt-5 text-[13px] text-sage font-medium hover:underline"
        >
          {isLogin ? 'Pas encore de compte ? Inscription' : 'Déjà un compte ? Connexion'}
        </button>

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
  );
}
