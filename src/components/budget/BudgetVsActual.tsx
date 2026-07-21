import { useMemo, useState } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS } from '@/hooks/useBudgetData';
import { sumByMonth, variancePercent, isFutureMonth } from '@/lib/actualsValidation';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Props {
  budgetLines: BudgetLine[];
  actualLines: BudgetLine[];
  categories: BudgetCategory[];
  fiscalYear: number;
}

function fmt(v: number): string {
  if (!v) return '—';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} M`;
  return `${Math.round(v).toLocaleString('fr-FR')} K`;
}

export default function BudgetVsActual({ budgetLines, actualLines, categories, fiscalYear }: Props) {
  const [scope, setScope] = useState<'all' | 'revenue' | 'expense'>('all');

  const scopedBudget = useMemo(
    () => budgetLines.filter(l => scope === 'all' || categories.find(c => c.id === l.category_id)?.type === scope),
    [budgetLines, categories, scope]
  );
  const scopedActual = useMemo(
    () => actualLines.filter(l => scope === 'all' || categories.find(c => c.id === l.category_id)?.type === scope),
    [actualLines, categories, scope]
  );

  const monthlyData = useMemo(() => {
    const b = sumByMonth(scopedBudget);
    const a = sumByMonth(scopedActual);
    return MONTHS.map((m, i) => ({
      mois: m,
      Prévu: b[i],
      Réel: a[i],
      Écart: a[i] - b[i],
      future: isFutureMonth(i, fiscalYear),
    }));
  }, [scopedBudget, scopedActual, fiscalYear]);

  const byCategory = useMemo(() => {
    return categories
      .filter(c => scope === 'all' || c.type === scope)
      .map(cat => {
        const bTotal = scopedBudget
          .filter(l => l.category_id === cat.id)
          .reduce((s, l) => s + MONTH_KEYS.reduce((sm, k) => sm + Number(l[k] || 0), 0), 0);
        const aTotal = scopedActual
          .filter(l => l.category_id === cat.id)
          .reduce((s, l) => s + MONTH_KEYS.reduce((sm, k) => sm + Number(l[k] || 0), 0), 0);
        return {
          id: cat.id, name: cat.name, type: cat.type,
          budget: bTotal, actual: aTotal,
          variance: aTotal - bTotal,
          variancePct: variancePercent(aTotal, bTotal),
        };
      })
      .filter(r => r.budget !== 0 || r.actual !== 0)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [categories, scopedBudget, scopedActual, scope]);

  const totals = useMemo(() => {
    const b = byCategory.reduce((s, r) => s + r.budget, 0);
    const a = byCategory.reduce((s, r) => s + r.actual, 0);
    return { budget: b, actual: a, variance: a - b, pct: variancePercent(a, b) };
  }, [byCategory]);

  return (
    <div className="space-y-5">
      {/* Header + scope */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[15px] font-semibold text-primary">Prévu vs Réel — Exercice {fiscalYear}</h3>
          <p className="text-[11.5px] text-muted-foreground">Comparaison mensuelle et par catégorie · Montants en K FCFA</p>
        </div>
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {(['all', 'revenue', 'expense'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${scope === s ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s === 'all' ? 'Tout' : s === 'revenue' ? 'Revenus' : 'Dépenses'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3.5">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Prévu (annuel)</div>
          <div className="text-[18px] font-semibold text-primary mt-0.5 tabular-nums">{fmt(totals.budget)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3.5">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Réalisé</div>
          <div className="text-[18px] font-semibold text-accent mt-0.5 tabular-nums">{fmt(totals.actual)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3.5">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Écart</div>
          <div className={`text-[18px] font-semibold mt-0.5 tabular-nums flex items-center gap-1 ${totals.variance >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {totals.variance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {fmt(totals.variance)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3.5">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Variance %</div>
          <div className={`text-[18px] font-semibold mt-0.5 tabular-nums ${totals.pct === null ? 'text-muted-foreground' : totals.pct >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {totals.pct === null ? '—' : `${totals.pct > 0 ? '+' : ''}${totals.pct} %`}
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-[13px] font-semibold text-primary mb-3">Évolution mensuelle</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => fmt(v)} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                formatter={(v: number) => fmt(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Prévu" fill="hsl(var(--primary))" opacity={0.7} />
              <Bar dataKey="Réel" fill="hsl(var(--accent))" />
              <Line type="monotone" dataKey="Écart" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <h4 className="text-[13px] font-semibold text-primary">Détail mensuel</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Mois</th>
                <th className="text-right px-3 py-2">Prévu</th>
                <th className="text-right px-3 py-2">Réel</th>
                <th className="text-right px-3 py-2">Écart</th>
                <th className="text-right px-3 py-2">Variance %</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(row => {
                const pct = variancePercent(row.Réel, row.Prévu);
                return (
                  <tr key={row.mois} className={`border-t border-border ${row.future ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-1.5 font-medium">{row.mois}{row.future && <span className="ml-1 text-[10px] text-muted-foreground">(à venir)</span>}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{fmt(row.Prévu)}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-accent">{fmt(row.Réel)}</td>
                    <td className={`text-right px-3 py-1.5 tabular-nums ${row.Écart > 0 ? 'text-accent' : row.Écart < 0 ? 'text-destructive' : ''}`}>{fmt(row.Écart)}</td>
                    <td className={`text-right px-3 py-1.5 tabular-nums ${pct === null ? 'text-muted-foreground' : pct > 0 ? 'text-accent' : pct < 0 ? 'text-destructive' : ''}`}>
                      {pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct} %`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category variance */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <h4 className="text-[13px] font-semibold text-primary">Écarts par catégorie (triés)</h4>
        </div>
        {byCategory.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-[12px]">Aucune donnée à comparer.</div>
        ) : (
          <div className="h-[280px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="budget" name="Prévu" fill="hsl(var(--primary))" opacity={0.7} />
                <Bar dataKey="actual" name="Réel" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-[11.5px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Catégorie</th>
                <th className="text-center px-3 py-2">Type</th>
                <th className="text-right px-3 py-2">Prévu</th>
                <th className="text-right px-3 py-2">Réel</th>
                <th className="text-right px-3 py-2">Écart</th>
                <th className="text-right px-3 py-2">Variance</th>
                <th className="text-center px-3 py-2">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map(r => {
                const isPositive = r.type === 'revenue' ? r.variance >= 0 : r.variance <= 0;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-1.5 font-medium">{r.name}</td>
                    <td className="text-center px-3 py-1.5 text-muted-foreground">{r.type === 'revenue' ? 'Revenu' : 'Dépense'}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{fmt(r.budget)}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-accent">{fmt(r.actual)}</td>
                    <td className={`text-right px-3 py-1.5 tabular-nums ${r.variance > 0 ? 'text-accent' : r.variance < 0 ? 'text-destructive' : ''}`}>{fmt(r.variance)}</td>
                    <td className={`text-right px-3 py-1.5 tabular-nums ${r.variancePct === null ? 'text-muted-foreground' : isPositive ? 'text-accent' : 'text-destructive'}`}>
                      {r.variancePct === null ? '—' : `${r.variancePct > 0 ? '+' : ''}${r.variancePct} %`}
                    </td>
                    <td className="text-center px-3 py-1.5">
                      {r.variance === 0
                        ? <Minus className="w-3.5 h-3.5 inline text-muted-foreground" />
                        : isPositive
                          ? <TrendingUp className="w-3.5 h-3.5 inline text-accent" />
                          : <TrendingDown className="w-3.5 h-3.5 inline text-destructive" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
