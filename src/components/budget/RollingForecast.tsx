import { useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface RollingForecastProps {
  budgetLines: BudgetLine[];
  actualLines: BudgetLine[];
  categories: BudgetCategory[];
  forecastHorizon: number; // months beyond current month to forecast
}

function getCurrentMonth(): number {
  return new Date().getMonth(); // 0-indexed (0=Jan)
}

/**
 * Simple linear regression on an array of values.
 * Returns { slope, intercept } for y = slope * x + intercept.
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Compute moving average for smoothing.
 */
function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

const FORECAST_MONTHS_LABELS = [
  ...MONTHS,
  'Jan+1', 'Fév+1', 'Mar+1', 'Avr+1', 'Mai+1', 'Jun+1',
];

export default function RollingForecast({ budgetLines, actualLines, categories, forecastHorizon = 6 }: RollingForecastProps) {
  const currentMonth = getCurrentMonth();

  const forecastData = useMemo(() => {
    // Aggregate actuals by month
    const actualByMonth = MONTH_KEYS.map((k, _i) =>
      actualLines.reduce((sum, l) => sum + Number(l[k as keyof BudgetLine] || 0), 0)
    );

    // Aggregate budget by month
    const budgetByMonth = MONTH_KEYS.map((k, _i) =>
      budgetLines.reduce((sum, l) => sum + Number(l[k as keyof BudgetLine] || 0), 0)
    );

    // Use actual data up to current month for trend
    const knownActuals = actualByMonth.slice(0, currentMonth + 1).filter(v => v !== 0);
    const smoothed = movingAverage(knownActuals.length > 0 ? knownActuals : budgetByMonth.slice(0, currentMonth + 1), 3);

    // Linear regression on known data
    const { slope, intercept } = linearRegression(smoothed);

    // Build 18-month dataset
    const totalMonths = 12 + forecastHorizon;
    const rows = [];

    for (let i = 0; i < totalMonths; i++) {
      const label = FORECAST_MONTHS_LABELS[i] || `M${i + 1}`;
      const isHistory = i <= currentMonth;
      const isFutureSameYear = i > currentMonth && i < 12;
      const isNextYear = i >= 12;

      const actual = i < 12 ? actualByMonth[i] : undefined;
      const budget = i < 12 ? budgetByMonth[i] : undefined;

      // Forecast: trend-based projection
      let forecast: number | undefined;
      if (i > currentMonth || (knownActuals.length === 0 && i >= 0)) {
        const trendIdx = knownActuals.length > 0 ? knownActuals.length + (i - currentMonth - 1) : i;
        forecast = Math.max(0, Math.round(slope * trendIdx + intercept));
      }

      rows.push({
        month: label,
        idx: i,
        actual: isHistory && actual !== undefined ? actual : undefined,
        budget: budget,
        forecast: forecast,
        isCurrent: i === currentMonth,
      });
    }

    return rows;
  }, [budgetLines, actualLines, currentMonth, forecastHorizon]);

  // Summary stats
  const totalActual = forecastData.reduce((s, r) => s + (r.actual || 0), 0);
  const totalForecast = forecastData.reduce((s, r) => s + (r.forecast || 0), 0);
  const totalBudget = forecastData.slice(0, 12).reduce((s, r) => s + (r.budget || 0), 0);
  const projectedTotal = totalActual + totalForecast;

  // Category breakdown for forecast
  const categoryForecasts = useMemo(() => {
    const revenueCategories = categories.filter(c => c.type === 'revenue');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const computeCatForecast = (cats: BudgetCategory[]) => {
      return cats.map(cat => {
        const catActuals = MONTH_KEYS.map(k =>
          actualLines.filter(l => l.category_id === cat.id).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
        );
        const catBudget = MONTH_KEYS.map(k =>
          budgetLines.filter(l => l.category_id === cat.id).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
        );

        const known = catActuals.slice(0, currentMonth + 1).filter(v => v !== 0);
        const source = known.length > 0 ? known : catBudget.slice(0, currentMonth + 1);
        const sm = movingAverage(source, 3);
        const { slope, intercept } = linearRegression(sm);

        const projected = [];
        for (let i = currentMonth + 1; i < 12 + forecastHorizon; i++) {
          const idx = sm.length + (i - currentMonth - 1);
          projected.push(Math.max(0, Math.round(slope * idx + intercept)));
        }

        const actualTotal = catActuals.slice(0, currentMonth + 1).reduce((a, b) => a + b, 0);
        const forecastTotal = projected.reduce((a, b) => a + b, 0);

        return { name: cat.name, type: cat.type, actualTotal, forecastTotal, total: actualTotal + forecastTotal };
      });
    };

    return {
      revenue: computeCatForecast(revenueCategories),
      expense: computeCatForecast(expenseCategories),
    };
  }, [categories, budgetLines, actualLines, currentMonth, forecastHorizon]);

  const totalRevForecast = categoryForecasts.revenue.reduce((s, c) => s + c.total, 0);
  const totalExpForecast = categoryForecasts.expense.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Réel YTD', value: `${totalActual}K`, color: 'text-accent' },
          { label: 'Prévision restante', value: `${totalForecast}K`, color: 'text-[hsl(var(--sky))]' },
          { label: 'Projection annuelle', value: `${projectedTotal}K`, color: 'text-primary' },
          { label: 'vs Budget', value: totalBudget > 0 ? `${((projectedTotal / totalBudget) * 100).toFixed(0)}%` : 'N/A', color: projectedTotal > totalBudget ? 'text-destructive' : 'text-accent' },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Rolling forecast chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-[13px] font-bold text-foreground mb-3">📈 Rolling Forecast — Projection glissante ({12 + forecastHorizon} mois)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
              <Tooltip
                contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number, name: string) => [`${value}K`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={MONTHS[currentMonth]} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: 'Aujourd\'hui', fontSize: 10 }} />
              <Line type="monotone" dataKey="budget" name="Budget" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="actual" name="Réel" stroke="hsl(var(--accent))" dot={{ r: 3 }} strokeWidth={2} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" name="Prévision" stroke="hsl(var(--sky))" strokeDasharray="3 3" dot={{ r: 2 }} strokeWidth={2} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Catégorie</th>
              <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Réel YTD</th>
              <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Prévision</th>
              <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Total projeté</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-accent/5 border-b border-border">
              <td className="px-3 py-1.5 font-bold text-accent" colSpan={4}>📈 Revenus</td>
            </tr>
            {categoryForecasts.revenue.map(c => (
              <tr key={c.name} className="border-b border-border/50">
                <td className="px-3 py-1.5 pl-6">{c.name}</td>
                <td className="text-right px-3 py-1.5">{c.actualTotal}K</td>
                <td className="text-right px-3 py-1.5 text-[hsl(var(--sky))]">{c.forecastTotal}K</td>
                <td className="text-right px-3 py-1.5 font-semibold">{c.total}K</td>
              </tr>
            ))}
            <tr className="bg-destructive/5 border-b border-border">
              <td className="px-3 py-1.5 font-bold text-destructive" colSpan={4}>📉 Dépenses</td>
            </tr>
            {categoryForecasts.expense.map(c => (
              <tr key={c.name} className="border-b border-border/50">
                <td className="px-3 py-1.5 pl-6">{c.name}</td>
                <td className="text-right px-3 py-1.5">{c.actualTotal}K</td>
                <td className="text-right px-3 py-1.5 text-[hsl(var(--sky))]">{c.forecastTotal}K</td>
                <td className="text-right px-3 py-1.5 font-semibold">{c.total}K</td>
              </tr>
            ))}
            <tr className="bg-primary/5 border-t-2 border-primary">
              <td className="px-3 py-2 font-bold text-primary">Résultat Net projeté</td>
              <td className="text-right px-3 py-2 font-bold">{categoryForecasts.revenue.reduce((s, c) => s + c.actualTotal, 0) - categoryForecasts.expense.reduce((s, c) => s + c.actualTotal, 0)}K</td>
              <td className="text-right px-3 py-2 font-bold text-[hsl(var(--sky))]">{categoryForecasts.revenue.reduce((s, c) => s + c.forecastTotal, 0) - categoryForecasts.expense.reduce((s, c) => s + c.forecastTotal, 0)}K</td>
              <td className={`text-right px-3 py-2 font-bold ${totalRevForecast - totalExpForecast >= 0 ? 'text-accent' : 'text-destructive'}`}>{totalRevForecast - totalExpForecast}K</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
