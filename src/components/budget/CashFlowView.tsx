import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { MONTHS, MONTH_KEYS, type BudgetLine, type BudgetCategory } from '@/hooks/useBudgetData';

interface Props {
  lines: BudgetLine[];
  categories: BudgetCategory[];
}

export default function CashFlowView({ lines, categories }: Props) {
  const cashFlowData = useMemo(() => {
    return MONTHS.map((month, i) => {
      const mk = MONTH_KEYS[i];
      const revenueLines = lines.filter(l => {
        const cat = categories.find(c => c.id === l.category_id);
        return cat?.type === 'revenue' && l.line_type === 'budget';
      });
      const expenseLines = lines.filter(l => {
        const cat = categories.find(c => c.id === l.category_id);
        return cat?.type === 'expense' && l.line_type === 'budget';
      });
      const actualRevenueLines = lines.filter(l => {
        const cat = categories.find(c => c.id === l.category_id);
        return cat?.type === 'revenue' && l.line_type === 'actual';
      });
      const actualExpenseLines = lines.filter(l => {
        const cat = categories.find(c => c.id === l.category_id);
        return cat?.type === 'expense' && l.line_type === 'actual';
      });

      const budgetIn = revenueLines.reduce((s, l) => s + Number(l[mk] || 0), 0);
      const budgetOut = expenseLines.reduce((s, l) => s + Number(l[mk] || 0), 0);
      const actualIn = actualRevenueLines.reduce((s, l) => s + Number(l[mk] || 0), 0);
      const actualOut = actualExpenseLines.reduce((s, l) => s + Number(l[mk] || 0), 0);

      return {
        month,
        'Entrées Budget': budgetIn,
        'Sorties Budget': -budgetOut,
        'Entrées Réel': actualIn,
        'Sorties Réel': -actualOut,
        'Flux Net Budget': budgetIn - budgetOut,
        'Flux Net Réel': actualIn - actualOut,
      };
    });
  }, [lines, categories]);

  const cumulativeData = useMemo(() => {
    let cumBudget = 0;
    let cumActual = 0;
    return cashFlowData.map(d => {
      cumBudget += d['Flux Net Budget'];
      cumActual += d['Flux Net Réel'];
      return { ...d, 'Tréso. Budget Cumulée': cumBudget, 'Tréso. Réelle Cumulée': cumActual };
    });
  }, [cashFlowData]);

  const totalNetBudget = cashFlowData.reduce((s, d) => s + d['Flux Net Budget'], 0);
  const totalNetActual = cashFlowData.reduce((s, d) => s + d['Flux Net Réel'], 0);
  const runway = cumulativeData.findIndex(d => d['Tréso. Budget Cumulée'] < 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flux Net Budgété (Annuel)</div>
          <div className={`font-display text-xl font-bold ${totalNetBudget >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {totalNetBudget.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flux Net Réel (Annuel)</div>
          <div className={`font-display text-xl font-bold ${totalNetActual >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {totalNetActual.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Runway (mois avant déficit)</div>
          <div className="font-display text-xl font-bold text-primary">
            {runway < 0 ? '12+ mois ✅' : `${runway} mois ⚠️`}
          </div>
        </div>
      </div>

      {/* Cash Flow Bar Chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Cash-Flow Mensuel</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={cashFlowData}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="Entrées Budget" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Sorties Budget" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative treasury */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Trésorerie Cumulée</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cumulativeData}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
            <Bar dataKey="Tréso. Budget Cumulée" fill="hsl(var(--sky))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Mois</th>
              <th className="px-3 py-2 text-right font-semibold text-accent">Entrées</th>
              <th className="px-3 py-2 text-right font-semibold text-destructive">Sorties</th>
              <th className="px-3 py-2 text-right font-semibold text-primary">Flux Net</th>
              <th className="px-3 py-2 text-right font-semibold text-[hsl(var(--sky))]">Cumulé</th>
            </tr>
          </thead>
          <tbody>
            {cumulativeData.map(d => (
              <tr key={d.month} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{d.month}</td>
                <td className="px-3 py-2 text-right text-accent">{d['Entrées Budget'].toLocaleString('fr-FR')}</td>
                <td className="px-3 py-2 text-right text-destructive">{Math.abs(d['Sorties Budget']).toLocaleString('fr-FR')}</td>
                <td className={`px-3 py-2 text-right font-bold ${d['Flux Net Budget'] >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {d['Flux Net Budget'].toLocaleString('fr-FR')}
                </td>
                <td className={`px-3 py-2 text-right font-bold ${d['Tréso. Budget Cumulée'] >= 0 ? 'text-[hsl(var(--sky))]' : 'text-destructive'}`}>
                  {d['Tréso. Budget Cumulée'].toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
