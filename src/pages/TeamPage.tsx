import { useState } from 'react';
import { useAllUsersWithRoles, useCurrentUserRole, useUpdateUserRole } from '@/hooks/useUserRoles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Directeur' },
  { value: 'country_manager', label: 'Country Manager' },
  { value: 'analyst', label: 'Analyste' },
  { value: 'observer', label: 'Observateur' },
  { value: 'partner', label: 'Partenaire' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-destructive/15 text-destructive',
  director: 'bg-[hsl(var(--plum))]/15 text-[hsl(var(--plum))]',
  country_manager: 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]',
  analyst: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]',
  observer: 'bg-muted text-muted-foreground',
  partner: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]',
};

export default function TeamPage() {
  const { user } = useAuth();
  const { data: myRole } = useCurrentUserRole();
  const { data: users, isLoading, refetch } = useAllUsersWithRoles();
  const updateRole = useUpdateUserRole();

  const isAdmin = myRole === 'admin';

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('observer');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: inviteEmail, full_name: inviteName || inviteEmail, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('observer');
      setShowInvite(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate(
      { userId, newRole },
      {
        onSuccess: () => toast.success('Rôle mis à jour'),
        onError: (err: any) => toast.error(err.message || 'Erreur lors de la mise à jour'),
      }
    );
  };

  return (
    <div className="animate-page-enter">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Équipe & Rôles</h2>
          <p className="text-[12.5px] text-muted-foreground">
            {isAdmin
              ? 'Gérez les accès et invitez de nouveaux membres'
              : 'Membres de l\'équipe d\'expansion internationale'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus size={15} />
            Inviter
          </button>
        )}
      </div>

      {showInvite && isAdmin && (
        <div className="bg-card border border-border rounded-lg p-5 mb-6 space-y-3">
          <h3 className="text-[14px] font-semibold text-primary">Inviter un nouveau membre</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Email *"
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-accent transition-colors"
            />
            <input
              type="text"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              placeholder="Nom complet"
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-accent transition-colors"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="h-[38px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-[13px]">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {inviting ? 'Envoi…' : 'Envoyer l\'invitation'}
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-[13px] text-muted-foreground hover:text-primary transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Inscription</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.user_id} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-primary-foreground"
                        style={{ backgroundColor: u.avatar_color }}
                      >
                        {u.initials}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-semibold text-primary">{u.full_name}</div>
                        {u.user_id === user?.id && (
                          <span className="text-[10.5px] text-muted-foreground">(vous)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12.5px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-4">
                    {isAdmin && u.user_id !== user?.id ? (
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u.user_id, val)}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-[12.5px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value} className="text-[12.5px]">
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11.5px] font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.observer}`}>
                        {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
