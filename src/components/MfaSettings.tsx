import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface EnrollState {
  factorId: string;
  qr: string;
  secret: string;
}

export default function MfaSettings() {
  const qc = useQueryClient();
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: factors } = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp ?? [];
    },
  });

  const verified = (factors ?? []).filter(f => f.status === 'verified');

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `ExpansionOS ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enroll || code.trim().length < 6) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) throw error;
      toast.success('Double authentification activée');
      setEnroll(null);
      setCode('');
      qc.invalidateQueries({ queryKey: ['mfa-factors'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setBusy(false);
    }
  };

  const disable = async (factorId: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('Double authentification désactivée');
      qc.invalidateQueries({ queryKey: ['mfa-factors'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mt-6">
      <h3 className="font-display text-[16px] font-semibold text-primary mb-1 flex items-center gap-2">
        {verified.length > 0
          ? <ShieldCheck size={16} className="text-sage" />
          : <ShieldAlert size={16} className="text-gold" />}
        Double authentification (2FA)
      </h3>
      <p className="text-[12.5px] text-muted-foreground mb-4">
        Protégez votre compte avec une application d'authentification (Google Authenticator, Authy…).
      </p>

      {verified.length > 0 ? (
        <div className="space-y-3">
          {verified.map(f => (
            <div key={f.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <span className="text-[12.5px] text-foreground">{f.friendly_name || 'Application TOTP'}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => disable(f.id)}>
                Désactiver
              </Button>
            </div>
          ))}
        </div>
      ) : enroll ? (
        <div className="space-y-4">
          <img src={enroll.qr} alt="QR code de configuration 2FA" className="w-44 h-44 border border-border rounded-lg bg-card" />
          <p className="text-[12px] text-muted-foreground break-all">
            Clé manuelle : <span className="font-mono">{enroll.secret}</span>
          </p>
          <div>
            <Label className="text-[12.5px]">Code à 6 chiffres</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="mt-1 w-32 font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || code.length < 6} onClick={confirmEnroll}>
              {busy ? 'Vérification…' : 'Activer'}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setEnroll(null); setCode(''); }}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" disabled={busy} onClick={startEnroll}>
          {busy ? 'Préparation…' : 'Activer la 2FA'}
        </Button>
      )}
    </div>
  );
}