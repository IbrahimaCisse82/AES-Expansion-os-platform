import KpiCard from '@/components/KpiCard';
import StatusPill from '@/components/StatusPill';
import { useCountries, useTasks, useActivityLog } from '@/hooks/useExpansionData';

export default function DashboardPage() {
  const { data: countries = [] } = useCountries();
  const { data: tasks = [] } = useTasks();
  const { data: activity = [] } = useActivityLog();

  const lateTasks = tasks.filter(t => t.status === 'late').length;
  const totalTeam = countries.reduce((s, c) => s + (c.team_size || 0), 0);
  const avgPct = countries.length ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0;

  const colorMap: Record<string, string> = { sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum' };
  const dotColors: Record<string, string> = { sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum', navy: 'bg-navy' };

  return (
    <div className="animate-page-enter">
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="Marchés actifs" value={String(countries.length)} meta="marchés ciblés" accentColor="sage" trend={{ value: '+2', up: true }} />
        <KpiCard label="Progression" value={`${avgPct}%`} meta="avancement moyen" accentColor="sky" trend={{ value: '+8%', up: true }} />
        <KpiCard label="Tâches en retard" value={String(lateTasks)} meta="nécessitent attention" accentColor="terracotta" />
        <KpiCard label="Équipe déployée" value={String(totalTeam)} meta={`personnes · ${countries.length} pays`} accentColor="gold" trend={{ value: '+3', up: true }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15.5px] font-semibold text-primary">Statut des marchés</h3>
          </div>
          {countries.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-ivory last:border-b-0 cursor-pointer hover:pl-1 transition-all">
              <span className="text-2xl leading-none">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.region}</div>
              </div>
              <StatusPill status={c.status as any} />
              <div className="text-right">
                <div className="h-1 w-[90px] bg-ivory rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${colorMap[c.color] || 'bg-sage'}`} style={{ width: `${c.pct}%` }} />
                </div>
                <div className="text-[10.5px] text-muted-foreground">{c.pct}%</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15.5px] font-semibold text-primary">Activité récente</h3>
          </div>
          {activity.map((item, i) => (
            <div key={item.id} className="flex gap-3 py-2.5">
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${dotColors[item.color || 'navy'] || 'bg-muted'}`} />
                {i < activity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] leading-relaxed">{item.user_name} {item.action}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[15.5px] font-semibold text-primary">Tâches prioritaires</h3>
        </div>
        {tasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
          <div key={task.id} className="flex items-center gap-3 py-3 border-b border-ivory last:border-b-0">
            <div className={`w-[19px] h-[19px] border-2 rounded-[5px] flex-shrink-0 ${
              task.status === 'done' ? 'bg-sage border-sage' : 'border-border hover:border-sage'
            } cursor-pointer transition-colors`} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">{task.title}</div>
              <div className="text-[11px] text-muted-foreground flex gap-2">
                <span>{task.country_label}</span><span>·</span><span>📅 {task.due_date}</span><span>·</span><span>{task.owner_name}</span>
              </div>
            </div>
            {task.status === 'late' && <StatusPill status="late" />}
            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
              task.priority === 'high' ? 'bg-terracotta/10 text-terracotta' :
              task.priority === 'med' ? 'bg-gold/10 text-gold' : 'bg-sage/10 text-sage'
            }`}>
              {task.priority === 'high' ? 'Haute' : task.priority === 'med' ? 'Moyenne' : 'Faible'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
