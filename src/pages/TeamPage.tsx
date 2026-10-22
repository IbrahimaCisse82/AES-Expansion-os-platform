import { useState, useEffect, useMemo } from 'react';
import { useAllUsersWithRoles, useCurrentUserRole, useUpdateUserRole, useUpdateUserScope } from '@/hooks/useUserRoles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, useCountries } from '@/hooks/useExpansionData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, MailCheck, Ban, ShieldCheck, RefreshCw, Trash2, BarChart3 } from 'lucide-react';
import { ROLES, ROLE_COLOR } from '@/lib/roles';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const ROLE_COLORS = ROLE_COLOR;

interface UserStatus {
  user_id: string;
  email: string;
  email_confirmed: boolean;
  last_sign_in: string | null;
  banned: boolean;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { data: myRole } = useCurrentUserRole();
  const { data: users, isLoading, refetch } = useAllUsersWithRoles();
  const updateRole = useUpdateUserRole();
  const updateScope = useUpdateUserScope();
  const { data: tasks = [] } = useTasks();
  const { data: countries = [] } = useCountries();
  const { data: countryMembers = [] } = useQuery({
    queryKey: ['country_members_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('country_members').select('*');
      if (error) throw error;
      return data;
    },
  });
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isAdmin = myRole === 'admin';

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('observer');
  const [inviteScope, setInviteScope] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Fetch auth statuses
  const fetchStatuses = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'list_status' },
      });
      if (error) throw error;
      setStatuses(data?.statuses ?? []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (isAdmin) fetchStatuses();
  }, [isAdmin]);

  const getStatus = (userId: string) => statuses.find((s) => s.user_id === userId);

  const handleResendInvite = async (userId: string) => {
    const status = getStatus(userId);
    if (!status?.email) return;
    setLoadingAction(userId + '-resend');
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'resend_invite', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.temporary_password) {
        toast.success(
          `Invitation relancee pour ${data.email}\n\nNouveau mot de passe temporaire: ${data.temporary_password}`,
          { duration: 15000 }
        );
      } else {
        toast.success(`Invitation renvoyee a ${status.email}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentlyBanned: boolean) => {
    setLoadingAction(userId + '-block');
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: currentlyBanned ? 'unblock' : 'block', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(currentlyBanned ? 'Accès restauré' : 'Utilisateur bloqué');
      fetchStatuses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${userName} ? Cette action est irréversible.`)) return;
    setLoadingAction(userId + '-delete');
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${userName} a été supprimé`);
      refetch();
      fetchStatuses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    if (!inviteScope) {
      toast.error('Sélectionnez un pays attribué ou l\'accès global');
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          full_name: inviteName || inviteEmail,
          role: inviteRole,
          scope_country_id: inviteScope === '_all' ? null : inviteScope,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.temporary_password) {
        toast.success(
          `Utilisateur créé avec succès!\n\nEmail: ${data.email}\nMot de passe temporaire: ${data.temporary_password}\n\nL'utilisateur devra changer ce mot de passe à la première connexion.`,
          { duration: 10000 }
        );
      } else {
        toast.success(`Invitation envoyée à ${inviteEmail}`);
      }

      setInviteEmail('');
      setInviteName('');
      setInviteRole('observer');
      setInviteScope('');
      setShowInvite(false);
      refetch();
      fetchStatuses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'invitation';
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate(
      { userId, newRole },
      {
        onSuccess: () => toast.success('Rôle mis à jour'),
        onError: (err: Error) => toast.error(err.message || 'Erreur lors de la mise à jour'),
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <Select value={inviteScope} onValueChange={setInviteScope}>
              <SelectTrigger className="h-[38px] text-[13px]">
                <SelectValue placeholder="Pays attribué *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all" className="text-[13px]">🌍 Accès global (tous les pays)</SelectItem>
                {countries.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-[13px]">{c.flag} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            Chaque membre doit être rattaché à un pays précis ou disposer d'un accès global.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail || !inviteScope}
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
                <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Pays attribué</th>
                {isAdmin && (
                  <th className="px-5 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => {
                const status = getStatus(u.user_id);
                const isBanned = status?.banned ?? false;
                const hasSignedIn = !!status?.last_sign_in;
                const isMe = u.user_id === user?.id;

                return (
                  <tr
                    key={u.user_id}
                    className={`border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors ${isBanned ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-primary-foreground"
                          style={{ backgroundColor: u.avatar_color }}
                        >
                          {u.initials}
                        </div>
                        <div>
                          <div className="text-[13.5px] font-semibold text-primary">
                            {u.full_name}
                            {isBanned && <Ban size={13} className="inline ml-1.5 text-destructive" />}
                          </div>
                          {isMe && (
                            <span className="text-[10.5px] text-muted-foreground">(vous)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/15 text-destructive">
                          <Ban size={11} /> Bloque
                        </span>
                      ) : hasSignedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]">
                          <ShieldCheck size={11} /> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                          <MailCheck size={11} /> En attente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isAdmin && !isMe ? (
                        <Select
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.user_id, val)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-[12.5px]">
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
                    <td className="px-5 py-4">
                      {isAdmin ? (
                        <Select
                          value={u.scope_country_id ?? '_all'}
                          onValueChange={(val) =>
                            updateScope.mutate(
                              { userId: u.user_id, countryId: val === '_all' ? null : val },
                              {
                                onSuccess: () => toast.success('Périmètre pays mis à jour'),
                                onError: (err: Error) => toast.error(err.message),
                              }
                            )
                          }
                          disabled={updateScope.isPending}
                        >
                          <SelectTrigger className="w-[170px] h-8 text-[12.5px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_all" className="text-[12.5px]">🌍 Tous les pays</SelectItem>
                            {countries.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-[12.5px]">
                                {c.flag} {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[12.5px] text-muted-foreground">
                          {u.scope_country_id
                            ? (() => {
                                const c = countries.find((x) => x.id === u.scope_country_id);
                                return c ? `${c.flag} ${c.name}` : u.scope_country_id;
                              })()
                            : '🌍 Tous les pays'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4">
                        {!isMe && (
                          <div className="flex items-center gap-2">
                            {!hasSignedIn && !isBanned && (
                              <button
                                onClick={() => handleResendInvite(u.user_id)}
                                disabled={loadingAction === u.user_id + '-resend'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                                title="Relancer l'invitation"
                              >
                                <RefreshCw size={12} className={loadingAction === u.user_id + '-resend' ? 'animate-spin' : ''} />
                                Relancer
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleBlock(u.user_id, isBanned)}
                              disabled={loadingAction === u.user_id + '-block'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium rounded-md transition-colors disabled:opacity-50 ${
                                isBanned
                                  ? 'bg-[hsl(var(--sage))]/10 text-[hsl(var(--sage))] hover:bg-[hsl(var(--sage))]/20'
                                  : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              }`}
                              title={isBanned ? 'Débloquer' : 'Bloquer'}
                            >
                              {isBanned ? <ShieldCheck size={12} /> : <Ban size={12} />}
                              {isBanned ? 'Débloquer' : 'Bloquer'}
                            </button>
                            <button
                              onClick={() => handleDelete(u.user_id, u.full_name)}
                              disabled={loadingAction === u.user_id + '-delete'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                              title="Supprimer définitivement"
                            >
                              <Trash2 size={12} />
                              Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Workload & Country Assignments */}
      {(users ?? []).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {/* Workload Bar Chart */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display text-[15.5px] font-semibold text-primary flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" /> Répartition des tâches
            </h3>
            {(() => {
              const chartData = (users ?? []).map(u => {
                const userTasks = tasks.filter(t => t.assigned_to === u.user_id);
                return {
                  name: u.full_name.split(' ')[0],
                  'En cours': userTasks.filter(t => t.status === 'open' || t.status === 'wip').length,
                  'En retard': userTasks.filter(t => t.status === 'late').length,
                  'Terminées': userTasks.filter(t => t.status === 'done').length,
                };
              }).filter(d => d['En cours'] + d['En retard'] + d['Terminées'] > 0);

              return chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune tâche assignée</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="En cours" stackId="a" fill="hsl(var(--sky))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="En retard" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Terminées" stackId="a" fill="hsl(var(--accent))" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* Charge de travail detail */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display text-[15.5px] font-semibold text-primary flex items-center gap-2 mb-4">
              Charge de travail
            </h3>
            <div className="space-y-2">
              {(users ?? []).map(u => {
                const userTasks = tasks.filter(t => t.assigned_to === u.user_id);
                const openTasks = userTasks.filter(t => t.status !== 'done').length;
                const doneTasks = userTasks.filter(t => t.status === 'done').length;
                const lateTasks = userTasks.filter(t => t.status === 'late').length;
                const total = userTasks.length;
                if (total === 0) return null;
                return (
                  <div key={u.user_id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: u.avatar_color }}>
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{u.full_name}</div>
                      <div className="flex gap-2 text-[10.5px] text-muted-foreground">
                        <span>{openTasks} en cours</span>
                        <span>·</span>
                        <span className="text-accent">{doneTasks} terminées</span>
                        {lateTasks > 0 && <><span>·</span><span className="text-destructive">{lateTasks} en retard</span></>}
                      </div>
                    </div>
                    <div className="w-[60px] h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${lateTasks > 0 ? 'bg-destructive' : 'bg-accent'}`} style={{ width: `${total > 0 ? Math.min((openTasks / Math.max(total, 1)) * 100, 100) : 0}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground w-6 text-right">{total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Marchés assignés</h3>
            <div className="space-y-2">
              {(users ?? []).map(u => {
                const memberEntries = countryMembers.filter(cm => cm.user_id === u.user_id);
                if (memberEntries.length === 0) return null;
                return (
                  <div key={u.user_id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: u.avatar_color }}>
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{u.full_name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {memberEntries.map(cm => {
                          const country = countries.find(c => c.id === cm.country_id);
                          return country ? (
                            <span key={cm.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                              {country.flag} {country.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(users ?? []).every(u => countryMembers.filter(cm => cm.user_id === u.user_id).length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune assignation de marché</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
