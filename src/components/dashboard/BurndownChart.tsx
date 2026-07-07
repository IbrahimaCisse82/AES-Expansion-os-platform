import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Milestone {
  id: string;
  is_done: boolean;
  created_at: string;
  country_id: string;
}

export default function BurndownChart({ milestones }: { milestones: Milestone[] }) {
  const chartData = useMemo(() => {
    if (milestones.length === 0) return [];
    const sorted = [...milestones].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const total = sorted.length;
    const byWeek: Record<string, { total: number; done: number }> = {};
    const now = new Date();
    const startDate = new Date(sorted[0].created_at);
    const current = new Date(startDate);
    while (current <= now) {
      const weekKey = `${current.getFullYear()}-S${String(Math.ceil((current.getDate() + new Date(current.getFullYear(), current.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
      const label = current.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const doneByDate = milestones.filter(m => m.is_done && new Date(m.created_at) <= current).length;
      byWeek[label] = { total, done: doneByDate };
      current.setDate(current.getDate() + 7);
    }
    const lastLabel = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const currentDone = milestones.filter(m => m.is_done).length;
    byWeek[lastLabel] = { total, done: currentDone };

    return Object.entries(byWeek).map(([week, v]) => ({
      week,
      'Restant': v.total - v.done,
      'Idéal': 0,
    }));
  }, [milestones]);

  if (chartData.length < 2) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Burn-down Jalons</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Pas assez de données</p>
      </div>
    );
  }

  // Add ideal line
  const total = chartData[0]?.Restant || 0;
  const len = chartData.length;
  const dataWithIdeal = chartData.map((d, i) => ({
    ...d,
    'Idéal': Math.round(total * (1 - i / (len - 1))),
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Burn-down Jalons</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dataWithIdeal}>
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          <Line type="monotone" dataKey="Idéal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="Restant" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3 }} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
