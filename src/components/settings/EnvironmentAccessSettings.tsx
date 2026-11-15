import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { LayoutGrid } from 'lucide-react';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useEnvironmentAccess, useSetEnvironmentAccess } from '@/hooks/useEnvironments';
import { ENVIRONMENTS } from '@/lib/environments';
import { ROLES } from '@/lib/roles';

/** Matrice rôle × environnement : quels environnements apparaissent pour chaque rôle. */
export default function EnvironmentAccessSettings() {
  const { data: role } = useCurrentUserRole();
  const { data: access, isLoading, error } = useEnvironmentAccess();
  const set = useSetEnvironmentAccess();
  const isAdmin = role === 'admin';
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-display text-[16px] font-semibold text-primary flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Environnements par rôle</h3>
      <p className="text-[12px] text-muted-foreground mt-1 mb-4">
        Choisit les environnements visibles pour chaque rôle. Les droits sur les données (lecture, saisie, validation) restent ceux du rôle.
        {!isAdmin && ' Seul l’administrateur peut modifier ce tableau.'}
      </p>
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium py-1.5 pr-3">Rôle</th>
                {ENVIRONMENTS.map(e => <th key={e.id} className="font-medium py-1.5 px-2 text-center whitespace-nowrap">{e.short}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROLES.map(r => (
                <tr key={r.value} className="border-t border-border">
                  <td className="py-1.5 pr-3">{r.label}</td>
                  {ENVIRONMENTS.map(e => {
                    const on = r.value === 'admin' || !!access?.[r.value]?.includes(e.id);
                    return (
                      <td key={e.id} className="py-1.5 px-2 text-center">
                        <Switch checked={on} disabled={!isAdmin || r.value === 'admin' || set.isPending}
                          aria-label={`${r.label} — ${e.label}`}
                          onCheckedChange={v => set.mutate({ role: r.value, env: e.id, enabled: v }, {
                            onSuccess: () => toast.success(`${e.label} ${v ? 'ouvert' : 'fermé'} pour ${r.label}`),
                            onError: (err: Error) => toast.error(err.message),
                          })} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
