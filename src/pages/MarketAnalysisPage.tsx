import { useState, useMemo } from 'react';
import { useCountries, useBudgetEntries, useRisks } from '@/hooks/useExpansionData';
import { TrendingUp, Users, AlertTriangle, DollarSign, Globe, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function MarketAnalysisPage() {
  const { data: countries = [], isLoading } = useCountries();
  const { data: budgetEntries = [] } = useBudgetEntries();
  const { data: risks = [] } = useRisks();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const country = countries.find(c => c.id === selectedCountry);

  // Aggregate data
  const marketData = useMemo(() => countries.map(c => {
    const countryRisks = risks.filter(r => r.country_id === c.id);
    const countryBudget = budgetEntries.filter(b => b.country_id === c.id);
    const totalBudget = countryBudget.reduce((s, b) => s + (b.allocated_k || 0), 0);
    const totalSpent = countryBudget.reduce((s, b) => s + (b.spent_k || 0), 0);
    return {
      ...c,
      riskCount: countryRisks.length,
      highRisks: countryRisks.filter(r => r.level === 'high').length,
      totalBudget,
      totalSpent,
      budgetUsage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    };
  }), [countries, risks, budgetEntries]);

  const progressData = marketData.map(c => ({ name: c.flag + ' ' + c.name, progression: c.pct, budget: c.totalBudget }));

  const statusDistribution = useMemo(() => {
    const counts = { active: 0, planning: 0, done: 0, paused: 0 };
    countries.forEach(c => { counts[c.status as keyof typeof counts]++; });
    return [
      { name: 'Actif', value: counts.active, color: '#10b981' },
      { name: 'Planification', value: counts.planning, color: '#f59e0b' },
      { name: 'Terminé', value: counts.done, color: 'hsl(var(--primary))' },
      { name: 'En pause', value: counts.paused, color: '#94a3b8' },
    ].filter(s => s.value > 0);
  }, [countries]);

  const radarData = useMemo(() => {
    if (!country) return [];
    const m = marketData.find(c => c.id === country.id);
    if (!m) return [];
    return [
      { metric: 'Progression', value: m.pct, max: 100 },
      { metric: 'Équipe', value: Math.min(m.team_size * 10, 100), max: 100 },
      { metric: 'Budget', value: m.budgetUsage, max: 100 },
      { metric: 'Risques', value: Math.max(100 - m.highRisks * 25, 0), max: 100 },
      { metric: 'Phase', value: m.phase * 25, max: 100 },
    ];
  }, [country, marketData]);

  const regionData = useMemo(() => {
    const map = new Map<string, { count: number; avgPct: number; totalBudget: number }>();
    marketData.forEach(c => {
      const r = map.get(c.region) || { count: 0, avgPct: 0, totalBudget: 0 };
      r.count++;
      r.avgPct += c.pct;
      r.totalBudget += c.totalBudget;
      map.set(c.region, r);
    });
    return Array.from(map.entries()).map(([region, d]) => ({
      region,
      count: d.count,
      avgPct: Math.round(d.avgPct / d.count),
      totalBudget: d.totalBudget,
    }));
  }, [marketData]);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const totalBudgetAll = marketData.reduce((s, c) => s + c.totalBudget, 0);
  const avgProgress = countries.length ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0;
  const totalTeam = countries.reduce((s, c) => s + c.team_size, 0);
  const highRiskTotal = risks.filter(r => r.level === 'high').length;

  return (
    <div className="animate-page-enter space-y-6">
      <div>
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Analyse Marché</h2>
        <p className="text-[12.5px] text-muted-foreground">
          {countries.length} marché{countries.length > 1 ? 's' : ''} · Vue consolidée et analyse détaillée
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Marchés actifs', value: countries.filter(c => c.status === 'active').length, icon: Globe, color: 'text-accent' },
          { label: 'Progression moy.', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-primary' },
          { label: 'Équipe totale', value: totalTeam, icon: Users, color: 'text-blue-500' },
          { label: 'Risques élevés', value: highRiskTotal, icon: AlertTriangle, color: 'text-destructive' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
              <kpi.icon size={14} className={kpi.color} />
            </div>
            <div className="text-xl font-bold text-foreground">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress bar chart */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">Progression par marché</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={progressData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="progression" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">Répartition par statut</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional breakdown */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-primary mb-4">Analyse par région</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {regionData.map(r => (
            <div key={r.region} className="bg-muted/40 border border-border rounded-lg p-4">
              <div className="text-[12px] text-muted-foreground mb-1">{r.region}</div>
              <div className="text-lg font-bold text-foreground">{r.count} marché{r.count > 1 ? 's' : ''}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className="text-muted-foreground">Prog. moy: <strong className="text-primary">{r.avgPct}%</strong></span>
                <span className="text-muted-foreground">Budget: <strong className="text-foreground">{r.totalBudget}K</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Country selector + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Sélectionner un marché</h3>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {marketData.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCountry(c.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12.5px] transition-colors border ${
                  selectedCountry === c.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 text-left font-medium">{c.name}</span>
                <span className={`text-[10px] font-bold ${selectedCountry === c.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{c.pct}%</span>
              </button>
            ))}
          </div>
        </div>

        {country ? (
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{country.flag}</span>
              <div>
                <h3 className="text-lg font-bold text-primary">{country.name}</h3>
                <p className="text-[12px] text-muted-foreground">{country.region} · Phase {country.phase}</p>
              </div>
              <span className={`ml-auto px-3 py-1 rounded-full text-[11px] font-semibold ${
                country.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                country.status === 'planning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-muted text-muted-foreground'
              }`}>
                {country.status}
              </span>
            </div>

            {/* Country KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Population', value: country.population || 'N/A' },
                { label: 'PIB', value: country.gdp || 'N/A' },
                { label: 'Langue', value: country.language || 'N/A' },
                { label: 'Équipe', value: `${country.team_size} pers.` },
              ].map(k => (
                <div key={k.label} className="bg-muted/40 rounded-lg p-3">
                  <div className="text-[10px] text-muted-foreground">{k.label}</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{k.value}</div>
                </div>
              ))}
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'CA', value: country.kpi_ca || 'N/A', icon: DollarSign },
                { label: 'Clients', value: country.kpi_clients || 'N/A', icon: Users },
                { label: 'NPS', value: country.kpi_nps || 'N/A', icon: BarChart3 },
                { label: 'Rétention', value: country.kpi_retention || 'N/A', icon: TrendingUp },
              ].map(k => (
                <div key={k.label} className="bg-muted/40 rounded-lg p-3 flex items-center gap-2">
                  <k.icon size={14} className="text-accent" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">{k.label}</div>
                    <div className="text-sm font-semibold text-foreground">{k.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar chart */}
            {radarData.length > 0 && (
              <div>
                <h4 className="text-[12px] font-semibold text-primary mb-2">Profil marché</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Progression bar */}
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-bold text-primary">{country.pct}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${country.pct}%` }} />
              </div>
            </div>

            {/* Risks for this country */}
            {(() => {
              const countryRisks = risks.filter(r => r.country_id === country.id);
              if (!countryRisks.length) return null;
              return (
                <div>
                  <h4 className="text-[12px] font-semibold text-primary mb-2">Risques ({countryRisks.length})</h4>
                  <div className="space-y-1.5">
                    {countryRisks.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-[12px] py-1.5 px-2.5 rounded-lg bg-muted/40">
                        <span className={`w-2 h-2 rounded-full ${r.level === 'high' ? 'bg-destructive' : r.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <span className="text-foreground">{r.title}</span>
                        <span className="ml-auto text-muted-foreground capitalize">{r.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 flex items-center justify-center">
            <div className="text-center">
              <Globe size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Sélectionnez un marché pour voir l'analyse détaillée</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
