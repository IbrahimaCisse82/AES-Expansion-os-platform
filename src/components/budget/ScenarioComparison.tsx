import { useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal, BudgetScenario } from '@/hooks/useBudgetData';

interface ScenarioComparisonProps {
  scenarios: BudgetScenario[];
  allLines: Record<string, BudgetLine[]>; // scenarioId -> lines
  categories: BudgetCategory[];
  lineType: 'budget' | 'actual' | 'forecast';
}

function formatK(val: number): string {
  if (val === 0) return '-';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}M`;
  return `${val}K`;
}

export default function ScenarioComparison({ scenarios, allLines, categories, lineType }: ScenarioComparisonProps) {
  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const summaryData = useMemo(() => {
    return scenarios.map(scenario => {
      const lines = (allLines[scenario.id] || []).filter(l => l.line_type === lineType);
      const revTotal = lines
        .filter(l => revenueCategories.some(c => c.id === l.category_id))
        .reduce((s, l) => s + getLineTotal(l), 0);
      const expTotal = lines
        .filter(l => expenseCategories.some(c => c.id === l.category_id))
        .reduce((s, l) => s + getLineTotal(l), 0);

      const monthlyRevenue = MONTH_KEYS.map(k =>
        lines.filter(l => revenueCategories.some(c => c.id === l.category_id))
          .reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
      );
      const monthlyExpense = MONTH_KEYS.map(k =>
        lines.filter(l => expenseCategories.some(c => c.id === l.category_id))
          .reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
      );
      const monthlyNet = monthlyRevenue.map((r, i) => r - monthlyExpense[i]);

      return {
        scenario,
        revTotal,
        expTotal,
        netTotal: revTotal - expTotal,
        monthlyRevenue,
        monthlyExpense,
        monthlyNet,
        margin: revTotal > 0 ? ((revTotal - expTotal) / revTotal * 100).toFixed(1) : '0',
      };
    });
  }, [scenarios, allLines, lineType, revenueCategories, expenseCategories]);

  // Category-level comparison
  const categoryComparison = useMemo(() => {
    const allCats = [...revenueCategories, ...expenseCategories];
    return allCats.map(cat => {
      const scenarioTotals = scenarios.map(sc => {
        const lines = (allLines[sc.id] || []).filter(l => l.line_type === lineType && l.category_id === cat.id);
        return lines.reduce((s, l) => s + getLineTotal(l), 0);
      });
      return { category: cat, totals: scenarioTotals };
    }).filter(row => row.totals.some(t => t !== 0));
  }, [scenarios, allLines, lineType, revenueCategories, expenseCategories]);

  const baseScenario = summaryData[0];

  if (scenarios.length < 2) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <div className="text-3xl mb-3">📊</div>
        <h3 className="font-display text-lg font-semibold text-primary mb-2">Sélectionnez au moins 2 scénarios</h3>
        <p className="text-sm text-muted-foreground">Utilisez les cases à cocher ci-dessus pour comparer les scénarios côte à côte.</p>
      </div>
    );
  }

  return (
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {summaryData.map((s, i) => (
          <div key={s.scenario.id} className={`bg-card border rounded-lg p-4 ${i === 0 ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-[13px] font-bold text-foreground">{s.scenario.name}</h4>
              {i === 0 && <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">RÉFÉRENCE</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-muted-foreground">Revenus</div>
                <div className="font-bold text-accent">{formatK(s.revTotal)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Dépenses</div>
                <div className="font-bold text-destructive">{formatK(s.expTotal)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Net</div>
                <div className={`font-bold ${s.netTotal >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatK(s.netTotal)}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Marge : {s.margin}%
              {i > 0 && baseScenario.netTotal !== 0 && (
                <span className={`ml-2 ${s.netTotal > baseScenario.netTotal ? 'text-accent' : 'text-destructive'}`}>
                  ({s.netTotal > baseScenario.netTotal ? '+' : ''}{formatK(s.netTotal - baseScenario.netTotal)} vs réf.)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly comparison table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="sticky left-0 bg-muted/50 z-10 text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase w-[180px]">Résultat Net</th>
              {MONTHS.map(m => (
                <th key={m} className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground w-[65px]">{m}</th>
              ))}
              <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground w-[80px]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((s, i) => (
              <tr key={s.scenario.id} className={`border-b border-border ${i === 0 ? 'bg-primary/5' : 'hover:bg-muted/20'}`}>
                <td className="sticky left-0 bg-card z-10 px-3 py-1.5 font-semibold">{s.scenario.name}</td>
                {s.monthlyNet.map((v, mi) => (
                  <td key={mi} className={`text-right px-2 py-1.5 ${v >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatK(v)}</td>
                ))}
                <td className={`text-right px-3 py-1.5 font-bold ${s.netTotal >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatK(s.netTotal)}</td>
              </tr>
            ))}
            {/* Variance row vs base */}
            {summaryData.length > 1 && summaryData.slice(1).map(s => (
              <tr key={`var-${s.scenario.id}`} className="border-b border-border bg-muted/30">
                <td className="sticky left-0 bg-muted/30 z-10 px-3 py-1 text-[10px] text-muted-foreground italic">
                  Δ {s.scenario.name} vs {baseScenario.scenario.name}
                </td>
                {s.monthlyNet.map((v, mi) => {
                  const diff = v - baseScenario.monthlyNet[mi];
                  return (
                    <td key={mi} className={`text-right px-2 py-1 text-[10px] ${diff >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {diff === 0 ? '-' : `${diff > 0 ? '+' : ''}${formatK(diff)}`}
                    </td>
                  );
                })}
                <td className={`text-right px-3 py-1 text-[10px] font-semibold ${s.netTotal - baseScenario.netTotal >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {s.netTotal - baseScenario.netTotal > 0 ? '+' : ''}{formatK(s.netTotal - baseScenario.netTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Category-level comparison */}
      {categoryComparison.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Catégorie</th>
                {scenarios.map(sc => (
                  <th key={sc.id} className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">{sc.name}</th>
                ))}
                <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Écart max</th>
              </tr>
            </thead>
            <tbody>
              {categoryComparison.map(row => {
                const max = Math.max(...row.totals);
                const min = Math.min(...row.totals.filter(t => t > 0));
                const maxDiff = max - min;
                return (
                  <tr key={row.category.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-1.5">
                      <span className="mr-1">{row.category.type === 'revenue' ? '📈' : '📉'}</span>
                      {row.category.name}
                    </td>
                    {row.totals.map((t, i) => (
                      <td key={i} className="text-right px-3 py-1.5 font-medium">{formatK(t)}</td>
                    ))}
                    <td className={`text-right px-3 py-1.5 font-semibold ${maxDiff > 0 ? 'text-[hsl(var(--gold))]' : ''}`}>
                      {maxDiff === 0 ? '-' : formatK(maxDiff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
