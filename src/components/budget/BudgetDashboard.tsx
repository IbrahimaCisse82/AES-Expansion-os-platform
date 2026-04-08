import { useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import KpiCard from '@/components/KpiCard';

interface BudgetDashboardProps {
  budgetLines: BudgetLine[];
  actualLines: BudgetLine[];
  categories: BudgetCategory[];
}

const COLORS = [
  'hsl(145, 40%, 52%)', 'hsl(209, 55%, 55%)', 'hsl(42, 80%, 52%)',
  'hsl(15, 70%, 55%)', 'hsl(300, 19%, 52%)', 'hsl(175, 40%, 45%)',
  'hsl(240, 45%, 55%)', 'hsl(25, 75%, 52%)', 'hsl(340, 55%, 52%)',
];

export default function BudgetDashboard({ budgetLines, actualLines, categories }: BudgetDashboardProps) {
  const currentMonth = new Date().getMonth();
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const revenueCategories = categories.filter(c => c.type === 'revenue');

  // Burn rate & runway
  const { burnRate, runway, totalBudgetExpense, totalActualExpense, totalActualRevenue, totalBudgetRevenue } = useMemo(() => {
    const totalBudgetExpense = budgetLines
      .filter(l => expenseCategories.some(c => c.id === l.category_id))
      .reduce((s, l) => s + getLineTotal(l), 0);
    const totalActualExpense = actualLines
      .filter(l => expenseCategories.some(c => c.id === l.category_id))
      .reduce((s, l) => s + getLineTotal(l), 0);
    const totalActualRevenue = actualLines
      .filter(l => revenueCategories.some(c => c.id === l.category_id))
      .reduce((s, l) => s + getLineTotal(l), 0);
    const totalBudgetRevenue = budgetLines
      .filter(l => revenueCategories.some(c => c.id === l.category_id))
      .reduce((s, l) => s + getLineTotal(l), 0);

    const monthsElapsed = Math.max(1, currentMonth + 1);
    const burnRate = Math.round(totalActualExpense / monthsElapsed);
    const remainingBudget = totalBudgetExpense - totalActualExpense;
    const runway = burnRate > 0 ? Math.round(remainingBudget / burnRate) : 0;

    return { burnRate, runway, totalBudgetExpense, totalActualExpense, totalActualRevenue, totalBudgetRevenue };
  }, [budgetLines, actualLines, currentMonth, expenseCategories, revenueCategories]);

  // By country
  const countryData = useMemo(() => {
    const map = new Map<string, { label: string; budget: number; actual: number }>();
    budgetLines.forEach(l => {
      const key = l.country_label || 'Global';
      const entry = map.get(key) || { label: key, budget: 0, actual: 0 };
      entry.budget += getLineTotal(l);
      map.set(key, entry);
    });
    actualLines.forEach(l => {
      const key = l.country_label || 'Global';
      const entry = map.get(key) || { label: key, budget: 0, actual: 0 };
      entry.actual += getLineTotal(l);
      map.set(key, entry);
    });
    return Array.from(map.values()).filter(d => d.budget > 0 || d.actual > 0);
  }, [budgetLines, actualLines]);

  // By category (expenses only for pie)
  const categoryPieData = useMemo(() => {
    return expenseCategories.map(cat => {
      const total = actualLines
        .filter(l => l.category_id === cat.id)
        .reduce((s, l) => s + getLineTotal(l), 0);
      return { name: cat.name, value: total };
    }).filter(d => d.value > 0);
  }, [actualLines, expenseCategories]);

  // Monthly burn rate trend
  const burnTrend = useMemo(() => {
    return MONTH_KEYS.map((k, i) => {
      const expense = actualLines
        .filter(l => expenseCategories.some(c => c.id === l.category_id))
        .reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
      const revenue = actualLines
        .filter(l => revenueCategories.some(c => c.id === l.category_id))
        .reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
      return { month: MONTHS[i], expense, revenue, net: revenue - expense };
    });
  }, [actualLines, expenseCategories, revenueCategories]);

  // Cumulative cash position
  const cashPosition = useMemo(() => {
    let cumulative = 0;
    return burnTrend.map(d => {
      cumulative += d.net;
      return { ...d, cumulative };
    });
  }, [burnTrend]);

  const formatK = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${v}K`;
  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Burn Rate mensuel" value={`${formatK(burnRate)} FCFA`} meta="Dépense moyenne/mois" accentColor="terracotta" />
        <KpiCard label="Runway" value={runway > 0 ? `${runway} mois` : 'N/A'} meta="Budget restant / burn rate" accentColor={runway > 6 ? 'sage' : 'terracotta'} />
        <KpiCard
          label="Taux d'exécution"
          value={totalBudgetExpense > 0 ? `${Math.round(totalActualExpense / totalBudgetExpense * 100)}%` : 'N/A'}
          meta={`${formatK(totalActualExpense)} / ${formatK(totalBudgetExpense)}`}
          accentColor="gold"
        />
        <KpiCard
          label="Marge nette"
          value={totalActualRevenue > 0 ? `${((totalActualRevenue - totalActualExpense) / totalActualRevenue * 100).toFixed(1)}%` : 'N/A'}
          meta={`Revenu réel : ${formatK(totalActualRevenue)}`}
          accentColor={totalActualRevenue > totalActualExpense ? 'sage' : 'terracotta'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash position */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-bold text-foreground mb-3">💰 Position de trésorerie cumulée</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashPosition}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`]} />
              <Area type="monotone" dataKey="cumulative" name="Position cumulée" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Burn rate trend */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-bold text-foreground mb-3">🔥 Tendance Burn Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={burnTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}K FCFA`, name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="expense" name="Dépenses" fill="hsl(var(--destructive))" radius={[2,2,0,0]} opacity={0.8} />
              <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--accent))" radius={[2,2,0,0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By country */}
        {countryData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[13px] font-bold text-foreground mb-3">🌍 Répartition par pays</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}K FCFA`, name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="budget" name="Budget" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[0,2,2,0]} />
                <Bar dataKey="actual" name="Réel" fill="hsl(var(--primary))" radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By category pie */}
        {categoryPieData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[13px] font-bold text-foreground mb-3">📊 Répartition dépenses par catégorie</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                  {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
