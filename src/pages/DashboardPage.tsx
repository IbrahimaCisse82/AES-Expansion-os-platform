import KpiCard from '@/components/KpiCard';
import StatusPill from '@/components/StatusPill';
import { countries, tasks, historyItems } from '@/data/expansionData';

export default function DashboardPage() {
  const lateTasks = tasks.filter(t => t.status === 'late').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="animate-page-enter">
      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="Marchés actifs" value="6" meta="marchés ciblés" accentColor="sage" trend={{ value: '+2', up: true }} />
        <KpiCard label="Progression" value="52%" meta="avancement moyen" accentColor="sky" trend={{ value: '+8%', up: true }} />
        <KpiCard label="Tâches en retard" value={String(lateTasks)} meta="nécessitent attention" accentColor="terracotta" />
        <KpiCard label="Équipe déployée" value="31" meta="personnes · 5 pays" accentColor="gold" trend={{ value: '+3', up: true }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Countries status */}
        <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15.5px] font-semibold text-primary">Statut des marchés</h3>
            <button className="text-[12px] text-sage font-medium hover:underline">Voir tout →</button>
          </div>
          <div className="space-y-0">
            {countries.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-ivory last:border-b-0 cursor-pointer hover:pl-1 transition-all">
                <span className="text-2xl leading-none">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.region}</div>
                </div>
                <StatusPill status={c.st} />
                <div className="text-right">
                  <div className="h-1 w-[90px] bg-ivory rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full bg-${c.color}`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <div className="text-[10.5px] text-muted-foreground">{c.pct}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15.5px] font-semibold text-primary">Activité récente</h3>
          </div>
          <div className="space-y-0">
            {historyItems.map((item, i) => (
              <div key={i} className="flex gap-3 py-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 bg-${item.color}`} />
                  {i < historyItems.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] leading-relaxed">{item.text}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task summary */}
      <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[15.5px] font-semibold text-primary">Tâches prioritaires</h3>
          <button className="text-[12px] text-sage font-medium hover:underline">Voir toutes →</button>
        </div>
        <div className="space-y-0">
          {tasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center gap-3 py-3 border-b border-ivory last:border-b-0">
              <div className={`w-[19px] h-[19px] border-2 rounded-[5px] flex-shrink-0 ${
                task.status === 'done' ? 'bg-sage border-sage' : 'border-border hover:border-sage'
              } cursor-pointer transition-colors`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{task.title}</div>
                <div className="text-[11px] text-muted-foreground flex gap-2">
                  <span>{task.country}</span>
                  <span>·</span>
                  <span>📅 {task.due}</span>
                  <span>·</span>
                  <span>{task.owner}</span>
                </div>
              </div>
              {task.status === 'late' && <StatusPill status="late" />}
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                task.priority === 'high' ? 'bg-terracotta/10 text-terracotta' :
                task.priority === 'med' ? 'bg-gold/10 text-gold' :
                'bg-sage/10 text-sage'
              }`}>
                {task.priority === 'high' ? 'Haute' : task.priority === 'med' ? 'Moyenne' : 'Faible'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
