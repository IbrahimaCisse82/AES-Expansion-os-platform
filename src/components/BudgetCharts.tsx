import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CHART_COLORS: Record<string, string> = {
  sage: 'hsl(145, 40%, 52%)',
  sky: 'hsl(209, 55%, 55%)',
  gold: 'hsl(42, 80%, 52%)',
  terracotta: 'hsl(15, 70%, 55%)',
  plum: 'hsl(300, 19%, 52%)',
  coral: 'hsl(0, 65%, 55%)',
  teal: 'hsl(175, 40%, 45%)',
  indigo: 'hsl(240, 45%, 55%)',
  amber: 'hsl(25, 75%, 52%)',
  rose: 'hsl(340, 55%, 52%)',
};

interface BudgetEntry {
  id: string;
  country_label: string | null;
  category: string | null;
  allocated_k: number;
  spent_k: number;
  color: string | null;
}

interface BudgetChartsProps {
  entries: BudgetEntry[];
}

export default function BudgetCharts({ entries }: BudgetChartsProps) {
  const pieData = useMemo(() => {
    return entries
      .filter(e => e.allocated_k > 0)
      .map(e => ({
        name: e.category === 'market' ? (e.country_label || 'Marché') : (e.category || 'Autre'),
        value: e.allocated_k,
        color: CHART_COLORS[e.color || 'sage'] || CHART_COLORS.sage,
      }));
  }, [entries]);

  const barData = useMemo(() => {
    return entries
      .filter(e => e.allocated_k > 0)
      .map(e => ({
        name: e.category === 'market'
          ? (e.country_label?.replace(/^[^\s]+\s/, '') || 'Marché')
          : (e.category || 'Autre'),
        allocated: e.allocated_k,
        spent: e.spent_k,
        color: CHART_COLORS[e.color || 'sage'] || CHART_COLORS.sage,
      }));
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Allocation budgetaire</h3>
        {pieData.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Aucune donnee</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}K FCFA`, 'Alloue']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Alloue vs Depense</h3>
        {barData.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Aucune donnee</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barGap={4}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}K`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}K FCFA`,
                  name === 'allocated' ? 'Alloue' : 'Depense',
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="allocated" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Alloue" />
              <Bar dataKey="spent" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} name="Depense" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
