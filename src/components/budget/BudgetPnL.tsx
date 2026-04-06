import { useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ComposedChart, Line } from 'recharts';

interface BudgetPnLProps {
  budgetLines: BudgetLine[];
  actualLines: BudgetLine[];
  categories: BudgetCategory[];
}

export default function BudgetPnL({ budgetLines, actualLines, categories }: BudgetPnLProps) {
  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const chartData = useMemo(() => {
    return MONTH_KEYS.map((k, i) => {
      const budgetRev = budgetLines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
      const budgetExp = budgetLines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
      const actualRev = actualLines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
      const actualExp = actualLines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
      return {
        month: MONTHS[i],
        budgetRevenue: budgetRev,
        budgetExpense: budgetExp,
        budgetNet: budgetRev - budgetExp,
        actualRevenue: actualRev,
        actualExpense: actualExp,
        actualNet: actualRev - actualExp,
        variance: (actualRev - actualExp) - (budgetRev - budgetExp),
      };
    });
  }, [budgetLines, actualLines, revenueCategories, expenseCategories]);

  // Cumulative data
  const cumulativeData = useMemo(() => {
    let cumBudget = 0, cumActual = 0;
    return chartData.map(d => {
      cumBudget += d.budgetNet;
      cumActual += d.actualNet;
      return { ...d, cumBudget, cumActual };
    });
  }, [chartData]);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '11px',
  };

  const hasActualData = actualLines.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      {/* P&L Chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[14px] font-semibold text-primary mb-4">Compte de Résultat Mensuel</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickFormatter={(v: number) => `${v}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}K FCFA`, name]} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="budgetRevenue" name="Revenus (Budget)" fill="hsl(var(--accent))" radius={[2,2,0,0]} opacity={0.7} />
            <Bar dataKey="budgetExpense" name="Dépenses (Budget)" fill="hsl(var(--destructive))" radius={[2,2,0,0]} opacity={0.7} />
            {hasActualData && <Line dataKey="actualNet" name="Résultat (Réel)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />}
            <Line dataKey="budgetNet" name="Résultat (Budget)" stroke="hsl(var(--gold))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Cash Flow */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[14px] font-semibold text-primary mb-4">Cash Flow Cumulé</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickFormatter={(v: number) => `${v}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}K FCFA`, name]} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Area dataKey="cumBudget" name="Budget cumulé" stroke="hsl(var(--gold))" fill="hsl(var(--gold))" fillOpacity={0.1} strokeDasharray="5 5" />
            {hasActualData && <Area dataKey="cumActual" name="Réel cumulé" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Variance Analysis */}
      {hasActualData && (
        <div className="bg-card border border-border rounded-lg p-5 lg:col-span-2">
          <h3 className="font-display text-[14px] font-semibold text-primary mb-4">Analyse des Écarts (Budget vs Réel)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickFormatter={(v: number) => `${v}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`, 'Écart']} />
              <Bar dataKey="variance" name="Écart" radius={[3,3,0,0]}>
                {chartData.map((entry, i) => (
                  <rect key={i} fill={entry.variance >= 0 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
