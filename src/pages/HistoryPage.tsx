import { useState, useMemo } from 'react';
import { useActivityLog, useTasks } from '@/hooks/useExpansionData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const dotColors: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]', navy: 'bg-primary' };

const ENTITY_TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'country', label: '🌍 Pays' },
  { value: 'task', label: '✅ Tâches' },
  { value: 'risk', label: '⚠️ Risques' },
  { value: 'budget', label: '💰 Budget' },
  { value: 'milestone', label: '🎯 Jalons' },
  { value: 'kpi_history', label: '📊 KPIs' },
  { value: 'comment', label: '💬 Commentaires' },
  { value: 'roadmap', label: '🗺️ Roadmap' },
];

const PAGE_SIZE = 30;

export default function HistoryPage({ searchQuery = '' }: { searchQuery?: string }) {
  const { data: activity = [], isLoading } = useActivityLog();
  const { data: tasks = [] } = useTasks();

  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = activity;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.action.toLowerCase().includes(q) || a.user_name?.toLowerCase().includes(q));
    }

    // Entity type filter
    if (entityFilter !== 'all') {
      result = result.filter(a => a.entity_type === entityFilter);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(a => new Date(a.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      result = result.filter(a => new Date(a.created_at) <= to);
    }

    return result;
  }, [activity, searchQuery, entityFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const highRiskActions = activity.filter(a => a.entity_type === 'risk').length;

  // Reset page on filter change
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(0); };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Historique des Modifications</h2>
        <p className="text-[12.5px] text-muted-foreground">Traçabilité complète de toutes les actions effectuées</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={entityFilter} onValueChange={handleFilterChange(setEntityFilter)}>
          <SelectTrigger className="w-[180px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(et => <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Du</span>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="h-8 text-[12px] w-[140px]" />
          <span className="text-[11px] text-muted-foreground">au</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="h-8 text-[12px] w-[140px]" />
        </div>
        {(entityFilter !== 'all' || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="text-[11px] h-8" onClick={() => { setEntityFilter('all'); setDateFrom(''); setDateTo(''); setPage(0); }}>
            Réinitialiser
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground self-center ml-auto">{filtered.length} résultat(s)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          {paginated.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune activité trouvée</p>
          ) : paginated.map(item => (
            <div key={item.id} className="flex gap-3 py-2.5 border-b border-border last:border-b-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColors[item.color || 'navy'] || 'bg-muted'}`} />
              <div className="flex-1">
                <div className="text-[12.5px] leading-relaxed">
                  <span className="font-medium">{item.user_name}</span> {item.action}
                </div>
                <div className="flex gap-2 items-center mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {item.entity_type && (
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                      {ENTITY_TYPES.find(et => et.value === item.entity_type)?.label?.replace(/^[^\s]+ /, '') || item.entity_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="gap-1 text-[11px]">
                <ChevronLeft className="w-3.5 h-3.5" /> Précédent
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Page {page + 1} / {totalPages}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="gap-1 text-[11px]">
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-primary mb-4">Statistiques</h3>
          <div className="space-y-3">
            {[
              ['Actions totales', String(activity.length), 'text-primary'],
              ['Tâches terminées', String(doneTasks), 'text-accent'],
              ['Actions risques', String(highRiskActions), 'text-destructive'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[12.5px] text-muted-foreground">{label}</span>
                <span className={`font-display text-xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Activity by type breakdown */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Par type</h4>
            <div className="space-y-1.5">
              {ENTITY_TYPES.filter(et => et.value !== 'all').map(et => {
                const count = activity.filter(a => a.entity_type === et.value).length;
                if (count === 0) return null;
                const pct = Math.round((count / activity.length) * 100);
                return (
                  <div key={et.value} className="flex items-center gap-2">
                    <span className="text-[11px] w-[90px] truncate">{et.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10.5px] text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
