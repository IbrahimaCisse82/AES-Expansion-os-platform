import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setInitials(profile.initials ?? '');
    }
  }, [profile]);

  const currentName = fullName ?? profile?.full_name ?? '';
  const currentInitials = initials ?? profile?.initials ?? '';

  const handleSaveProfile = async () => {
    if (!user || !currentName.trim()) return;
    setSaving(true);
    try {
      const computedInitials = currentInitials.trim() || currentName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: currentName.trim(), initials: computedInitials })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Profil mis à jour');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Mot de passe modifié');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="animate-page-enter max-w-xl">
      <h2 className="font-display text-[23px] font-bold text-primary mb-1">Mon profil</h2>
      <p className="text-[12.5px] text-muted-foreground mb-8">Gérez vos informations personnelles</p>

      {/* Profile info */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-display text-[16px] font-semibold text-primary mb-4">Informations</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-[12.5px]">Email</Label>
            <Input value={user?.email || ''} disabled className="mt-1 bg-muted" />
          </div>
          <div>
            <Label className="text-[12.5px]">Nom complet</Label>
            <Input
              value={currentName}
              onChange={e => setFullName(e.target.value)}
              maxLength={100}
              className="mt-1"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <Label className="text-[12.5px]">Initiales</Label>
            <Input
              value={currentInitials}
              onChange={e => setInitials(e.target.value.toUpperCase())}
              maxLength={3}
              className="mt-1 w-24"
              placeholder="AB"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} size="sm">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-display text-[16px] font-semibold text-primary mb-4">Changer le mot de passe</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-[12.5px]">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="mt-1"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <div>
            <Label className="text-[12.5px]">Confirmer</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPw || !newPassword} size="sm" variant="outline">
            {changingPw ? 'Modification…' : 'Modifier le mot de passe'}
          </Button>
        </div>
      </div>
    </div>
  );
}
