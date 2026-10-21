import KpiCard from '@/components/KpiCard';
import StatusPill from '@/components/StatusPill';
import { useCountries, useTasks, useActivityLog, useRisks, useMilestones, useBudgetEntries } from '@/hooks/useExpansionData';
import { useKpiHistory } from '@/hooks/useKpiHistory';
import { PipelineChart, RiskWeatherChart, ProgressChart, MarketScoreCard, KpiTrendChart, NvsN1Card } from '@/components/dashboard/DashboardCharts';
import AfricaMap from '@/components/dashboard/AfricaMap';
import BurndownChart from '@/components/dashboard/BurndownChart';
import RadarComparison from '@/components/dashboard/RadarComparison';
import { computeMarketScore, buildScoreInputs } from '@/lib/marketScoring';
import { formatDateFr } from '@/lib/dates';

export default function DashboardPage() {
  const { data: countries = [] } = useCountries();
  const { data: tasks = [] } = useTasks();
  const { data: activity = [] } = useActivityLog();
  const { data: risks = [] } = useRisks();
  const { data: milestones = [] } = useMilestones(null);
  const { data: kpiHistory = [] } = useKpiHistory();
  const { data: budgetEntries = [] } = useBudgetEntries();

  const lateTasks = tasks.filter(t => t.status === 'late').length;
  const totalTeam = countries.reduce((s, c) => s + (c.team_size || 0), 0);
  const avgPct = countries.length ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0;

  const colorMap: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]' };
  const dotColors: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]', navy: 'bg-primary' };

  const scores = countries.map(c => ({ name: c.name, flag: c.flag, score: computeMarketScore(c, buildScoreInputs(c.id, { milestones, risks, kpiHistory, budgetEntries })) }));

  const isEmpty = countries.length === 0 && tasks.length === 0;

  return (
    <div className="animate-page-enter">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Marchés actifs" value={String(countries.length)} meta="marchés ciblés" accentColor="sage" />
        <KpiCard label="Progression" value={`${avgPct}%`} meta="avancement moyen" accentColor="sky" />
        <KpiCard label="Tâches en retard" value={String(lateTasks)} meta="nécessitent attention" accentColor="terracotta" />
        <KpiCard label="Équipe déployée" value={String(totalTeam)} meta={`personnes · ${countries.length} pays`} accentColor="gold" />
      </div>

      {isEmpty ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="font-display text-lg font-semibold text-primary mb-2">Bienvenue sur ExpansionOS</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Commencez par ajouter vos marchés cibles pour piloter votre expansion internationale.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <PipelineChart countries={countries} />
            <RiskWeatherChart risks={risks} />
            <MarketScoreCard scores={scores} />
          </div>

          {/* Africa Map + Burn-down */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <AfricaMap countries={countries} />
            <BurndownChart milestones={milestones} />
          </div>

          {/* Radar Comparison */}
          <div className="mb-4">
            <RadarComparison countries={countries} />
          </div>

          {/* Trend + N vs N-1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <KpiTrendChart />
            </div>
            <NvsN1Card />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ProgressChart countries={countries} />

            <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[15.5px] font-semibold text-primary">Statut des marchés</h3>
              </div>
              {countries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun marché ajouté</p>
              ) : countries.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
                  <span className="text-2xl leading-none">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.region}</div>
                  </div>
                  <StatusPill status={c.status} />
                  <div className="text-right hidden sm:block">
                    <div className="h-1 w-[90px] bg-muted rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${colorMap[c.color] || 'bg-accent'}`} style={{ width: `${c.pct}%` }} />
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">{c.pct}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[15.5px] font-semibold text-primary">Activité récente</h3>
              </div>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune activité enregistrée</p>
              ) : activity.slice(0, 8).map((item, i) => (
                <div key={item.id} className="flex gap-3 py-2.5">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${dotColors[item.color || 'navy'] || 'bg-muted'}`} />
                    {i < Math.min(activity.length, 8) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
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

            <div className="bg-card border border-border rounded-lg p-5 transition-shadow hover:shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[15.5px] font-semibold text-primary">Tâches prioritaires</h3>
              </div>
              {tasks.filter(t => t.status !== 'done').length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Toutes les tâches sont terminées 🎉</p>
              ) : tasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
                  <div className={`w-[19px] h-[19px] border-2 rounded-[5px] flex-shrink-0 ${
                    task.status === 'done' ? 'bg-accent border-accent' : 'border-border'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{task.title}</div>
                    <div className="text-[11px] text-muted-foreground flex gap-2 flex-wrap">
                      {task.country_label && <span>{task.country_label}</span>}
                      {task.due_date && <><span>·</span><span>📅 {formatDateFr(task.due_date)}</span></>}
                      {task.owner_name && <><span>·</span><span>{task.owner_name}</span></>}
                    </div>
                  </div>
                  {task.status === 'late' && <StatusPill status="late" />}
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                    task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                    task.priority === 'med' ? 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]' : 'bg-accent/10 text-accent'
                  }`}>
                    {task.priority === 'high' ? 'Haute' : task.priority === 'med' ? 'Moyenne' : 'Faible'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
