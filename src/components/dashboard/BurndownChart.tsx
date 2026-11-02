import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface Milestone {
  id: string;
  is_done: boolean;
  created_at: string;
  country_id: string;
  target_date?: string | null;
}

/**
 * Burn-down par mois sur l'horizon des jalons :
 * « Prévu » = jalons dont l'échéance est postérieure à la fin du mois ;
 * « Restant » (jusqu'au mois courant) = prévu + jalons échus non terminés (le retard).
 */
export function burndown(milestones: Milestone[], today = new Date()) {
  const dated = milestones.filter(m => m.target_date);
  if (dated.length === 0) return [];
  const months = dated.map(m => (m.target_date as string).slice(0, 7)).sort();
  const cur = today.toISOString().slice(0, 7);
  const first = months[0] < cur ? months[0] : cur;
  const last = months[months.length - 1] > cur ? months[months.length - 1] : cur;
  const out: { week: string; 'Prévu': number; 'Restant'?: number }[] = [];
  for (let d = new Date(`${first}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= last; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const ym = d.toISOString().slice(0, 7);
    const planned = dated.filter(m => (m.target_date as string).slice(0, 7) > ym).length;
    const overdue = dated.filter(m => !m.is_done && (m.target_date as string).slice(0, 7) <= ym).length;
    out.push({ week: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }), 'Prévu': planned, ...(ym <= cur ? { 'Restant': planned + overdue } : {}) });
  }
  return out;
}

export default function BurndownChart({ milestones }: { milestones: Milestone[] }) {
  const chartData = useMemo(() => burndown(milestones), [milestones]);

  if (chartData.length < 2) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Burn-down Jalons</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Pas assez de données</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-1">Burn-down Jalons</h3>
      <p className="text-[11px] text-muted-foreground mb-3">Jalons restants par mois : prévu selon les échéances, réel avec les retards.</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          <Line type="stepAfter" dataKey="Prévu" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
          <Line type="stepAfter" dataKey="Restant" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
