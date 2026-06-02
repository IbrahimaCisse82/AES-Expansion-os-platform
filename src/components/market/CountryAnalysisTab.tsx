import { useState, useMemo } from 'react';
import { useCountries, useTasks, useRisks, useBudgetEntries, useMilestones } from '@/hooks/useExpansionData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { MapPin, Users, TrendingUp, Shield, CheckCircle2, Clock, AlertTriangle, DollarSign, Activity, Target } from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--gold))',
  'hsl(var(--sage))',
  'hsl(var(--plum))',
  'hsl(var(--rose))',
];

import type { LucideIcon } from 'lucide-react';
function KpiBox({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[16px] font-bold text-foreground">{value}</p>
        {sub && <p className="text-[10.5px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function CountryAnalysisTab() {
  const { data: countries = [] } = useCountries();
  const { data: allTasks = [] } = useTasks();
  const { data: allRisks = [] } = useRisks();
  const { data: allBudget = [] } = useBudgetEntries();
  const { data: allMilestones = [] } = useMilestones();
  const [selectedCountryId, setSelectedCountryId] = useState('all');

  const selectedCountry = useMemo(() => countries.find(c => c.id === selectedCountryId), [countries, selectedCountryId]);

  const tasks = useMemo(() => {
    if (selectedCountryId === 'all') return allTasks;
    return allTasks.filter(t => t.country_id === selectedCountryId);
  }, [allTasks, selectedCountryId]);

  const risks = useMemo(() => {
    if (selectedCountryId === 'all') return allRisks;
    return allRisks.filter(r => r.country_id === selectedCountryId);
  }, [allRisks, selectedCountryId]);

  const budget = useMemo(() => {
    if (selectedCountryId === 'all') return allBudget;
    return allBudget.filter(b => b.country_id === selectedCountryId);
  }, [allBudget, selectedCountryId]);

  const milestones = useMemo(() => {
    if (selectedCountryId === 'all') return allMilestones;
    return allMilestones.filter(m => m.country_id === selectedCountryId);
  }, [allMilestones, selectedCountryId]);

  // Task stats
  const tasksDone = tasks.filter(t => t.status === 'done').length;
  const tasksOpen = tasks.filter(t => t.status === 'open').length;
  const tasksLate = tasks.filter(t => t.status === 'late').length;
  const tasksWip = tasks.filter(t => t.status === 'wip').length;

  // Risk stats
  const risksHigh = risks.filter(r => r.level === 'high').length;
  const risksMed = risks.filter(r => r.level === 'medium').length;
  const risksLow = risks.filter(r => r.level === 'low').length;

  // Budget stats
  const totalAllocated = budget.reduce((s, b) => s + (b.allocated_k || 0), 0);
  const totalSpent = budget.reduce((s, b) => s + (b.spent_k || 0), 0);
  const budgetUsage = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Milestones stats
  const milestonesDone = milestones.filter(m => m.is_done).length;

  // Charts data
  const taskChartData = [
    { name: 'Terminées', value: tasksDone, color: 'hsl(var(--sage))' },
    { name: 'En cours', value: tasksWip, color: 'hsl(var(--gold))' },
    { name: 'Ouvertes', value: tasksOpen, color: 'hsl(var(--primary))' },
    { name: 'En retard', value: tasksLate, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const riskChartData = [
    { name: 'Élevé', value: risksHigh, color: 'hsl(var(--destructive))' },
    { name: 'Moyen', value: risksMed, color: 'hsl(var(--gold))' },
    { name: 'Faible', value: risksLow, color: 'hsl(var(--sage))' },
  ].filter(d => d.value > 0);

  // Per-country comparison for bar chart (when "all" selected)
  const countryComparisonData = useMemo(() => {
    if (selectedCountryId !== 'all') return [];
    return countries.map(c => ({
      name: c.flag + ' ' + c.name.slice(0, 10),
      progression: c.pct,
      equipe: c.team_size,
      risques: c.risk_count,
    }));
  }, [countries, selectedCountryId]);

  // Radar data for single country
  const radarData = useMemo(() => {
    if (!selectedCountry) return [];
    const countryTasks = allTasks.filter(t => t.country_id === selectedCountryId);
    const countryRisks = allRisks.filter(r => r.country_id === selectedCountryId);
    const countryMilestones = allMilestones.filter(m => m.country_id === selectedCountryId);
    const countryBudget = allBudget.filter(b => b.country_id === selectedCountryId);
    const alloc = countryBudget.reduce((s, b) => s + (b.allocated_k || 0), 0);
    const spent = countryBudget.reduce((s, b) => s + (b.spent_k || 0), 0);

    return [
      { metric: 'Progression', value: selectedCountry.pct, max: 100 },
      { metric: 'Tâches terminées', value: countryTasks.length > 0 ? Math.round((countryTasks.filter(t => t.status === 'done').length / countryTasks.length) * 100) : 0, max: 100 },
      { metric: 'Jalons', value: countryMilestones.length > 0 ? Math.round((countryMilestones.filter(m => m.is_done).length / countryMilestones.length) * 100) : 0, max: 100 },
      { metric: 'Budget utilisé', value: alloc > 0 ? Math.round((spent / alloc) * 100) : 0, max: 100 },
      { metric: 'Équipe', value: Math.min(selectedCountry.team_size * 10, 100), max: 100 },
    ];
  }, [selectedCountry, selectedCountryId, allTasks, allRisks, allMilestones, allBudget]);

  // Budget per category
  const budgetByCategory = useMemo(() => {
    const map: Record<string, { allocated: number; spent: number }> = {};
    budget.forEach(b => {
      const cat = b.category || 'Autre';
      if (!map[cat]) map[cat] = { allocated: 0, spent: 0 };
      map[cat].allocated += b.allocated_k || 0;
      map[cat].spent += b.spent_k || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [budget]);

  return (
    <div className="space-y-5">
      {/* Country selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
          <SelectTrigger className="w-[260px] h-10 text-[13px]">
            <SelectValue placeholder="Sélectionner un pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🌍 Vue consolidée – Tous les pays</SelectItem>
            {countries.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCountry && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{selectedCountry.status}</span>
            <span>Phase {selectedCountry.phase}</span>
            <span>·</span>
            <span>{selectedCountry.region}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiBox icon={Target} label="Progression" value={selectedCountry ? `${selectedCountry.pct}%` : `${countries.length > 0 ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0}%`} sub={selectedCountry ? `Phase ${selectedCountry.phase}` : `${countries.length} pays`} />
        <KpiBox icon={CheckCircle2} label="Tâches" value={`${tasksDone}/${tasks.length}`} sub={`${tasksLate} en retard`} />
        <KpiBox icon={Shield} label="Risques" value={`${risks.length}`} sub={`${risksHigh} élevés`} />
        <KpiBox icon={DollarSign} label="Budget" value={`${totalAllocated}k`} sub={`${budgetUsage}% utilisé`} />
        <KpiBox icon={Activity} label="Jalons" value={`${milestonesDone}/${milestones.length}`} sub="complétés" />
        <KpiBox icon={Users} label="Équipe" value={selectedCountry ? `${selectedCountry.team_size}` : `${countries.reduce((s, c) => s + c.team_size, 0)}`} sub="membres" />
      </div>

      {/* Country detail card */}
      {selectedCountry && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-[15px] font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="text-xl">{selectedCountry.flag}</span> Fiche pays – {selectedCountry.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12.5px]">
            <div><span className="text-muted-foreground">Population :</span> <span className="font-semibold text-foreground">{selectedCountry.population || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">PIB :</span> <span className="font-semibold text-foreground">{selectedCountry.gdp || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Langue :</span> <span className="font-semibold text-foreground">{selectedCountry.language || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Devise :</span> <span className="font-semibold text-foreground">{selectedCountry.local_currency}</span></div>
            <div><span className="text-muted-foreground">CA :</span> <span className="font-semibold text-foreground">{selectedCountry.kpi_ca || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Clients :</span> <span className="font-semibold text-foreground">{selectedCountry.kpi_clients || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">NPS :</span> <span className="font-semibold text-foreground">{selectedCountry.kpi_nps || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Rétention :</span> <span className="font-semibold text-foreground">{selectedCountry.kpi_retention || 'N/A'}</span></div>
            {selectedCountry.local_contact && (
              <div className="col-span-2"><span className="text-muted-foreground">Contact local :</span> <span className="font-semibold text-foreground">{selectedCountry.local_contact}</span></div>
            )}
            {selectedCountry.description && (
              <div className="col-span-full"><span className="text-muted-foreground">Description :</span> <span className="font-medium text-foreground">{selectedCountry.description}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Country comparison or Radar */}
        {selectedCountryId === 'all' ? (
          <div className="bg-card border border-border rounded-lg p-5">
            <h4 className="text-[13px] font-bold text-foreground mb-3">Progression par pays</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={countryComparisonData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="progression" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Progression %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-5">
            <h4 className="text-[13px] font-bold text-foreground mb-3">Profil pays – Radar</h4>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Score" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chart 2: Tasks pie */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h4 className="text-[13px] font-bold text-foreground mb-3">Répartition des tâches</h4>
          {taskChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={taskChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10 }}>
                  {taskChartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune tâche</div>
          )}
        </div>

        {/* Chart 3: Budget by category */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h4 className="text-[13px] font-bold text-foreground mb-3">Budget par catégorie</h4>
          {budgetByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetByCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="allocated" fill="hsl(var(--primary))" name="Alloué (k)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="hsl(var(--accent))" name="Dépensé (k)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucun budget</div>
          )}
        </div>

        {/* Chart 4: Risks */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h4 className="text-[13px] font-bold text-foreground mb-3">Risques par niveau</h4>
          {riskChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={riskChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10 }}>
                  {riskChartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucun risque</div>
          )}
        </div>
      </div>

      {/* Recent milestones */}
      {milestones.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h4 className="text-[13px] font-bold text-foreground mb-3">Jalons</h4>
          <div className="space-y-2">
            {milestones.slice(0, 8).map(m => (
              <div key={m.id} className="flex items-center gap-3 text-[12.5px] py-2 px-3 rounded-lg bg-muted/30">
                <span>{m.icon || '📌'}</span>
                <span className="flex-1 font-medium text-foreground">{m.title}</span>
                {m.target_date && <span className="text-muted-foreground text-[11px]">{m.target_date}</span>}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.is_done ? 'bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage' : 'bg-gold/10 text-gold dark:bg-gold/20 dark:text-gold'}`}>
                  {m.is_done ? 'Terminé' : 'En cours'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
