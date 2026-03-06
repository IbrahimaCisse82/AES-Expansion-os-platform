import { useActivityLog, useTasks } from '@/hooks/useExpansionData';

const dotColors: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]', navy: 'bg-primary' };

export default function HistoryPage({ searchQuery = '' }: { searchQuery?: string }) {
  const { data: activity = [], isLoading } = useActivityLog();
  const { data: tasks = [] } = useTasks();

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const filtered = searchQuery ? activity.filter(a => a.action.toLowerCase().includes(searchQuery.toLowerCase()) || a.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) : activity;

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const highRiskActions = activity.filter(a => a.entity_type === 'risk').length;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Historique des Modifications</h2>
        <p className="text-[12.5px] text-muted-foreground">Traçabilité complète de toutes les actions effectuées</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune activité enregistrée</p>
          ) : filtered.map(item => (
            <div key={item.id} className="flex gap-3 py-2.5 border-b border-border last:border-b-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColors[item.color || 'navy'] || 'bg-muted'}`} />
              <div className="flex-1">
                <div className="text-[12.5px] leading-relaxed">{item.user_name} {item.action}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-primary mb-4">Statistiques</h3>
          <div className="space-y-3">
            {[
              ['Actions récentes', String(activity.length), 'text-primary'],
              ['Tâches terminées', String(doneTasks), 'text-accent'],
              ['Alertes risques', String(highRiskActions), 'text-destructive'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[12.5px] text-muted-foreground">{label}</span>
                <span className={`font-display text-xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
