import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useKpiHistory } from '@/hooks/useKpiHistory';
import { useMemo } from 'react';

interface Country {
  id: string;
  name: string;
  flag: string;
  phase: number;
  pct: number;
  status: string;
  risk_count: number;
}

interface Risk {
  id: string;
  level: string;
  country_label: string | null;
}

const PHASE_LABELS = ['Prospection', 'Étude', 'Mise en place', 'Lancement', 'Opérationnel'];

export function PipelineChart({ countries }: { countries: Country[] }) {
  const data = PHASE_LABELS.map((label, i) => ({
    name: label,
    count: countries.filter(c => c.phase === i).length,
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Pipeline d'expansion</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={28}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(val: number) => [`${val} marché(s)`, '']}
          />
          <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const RISK_COLORS: Record<string, string> = {
  high: 'hsl(var(--destructive))',
  medium: 'hsl(var(--gold))',
  low: 'hsl(var(--accent))',
};

const RISK_LABELS: Record<string, string> = { high: 'Élevé', medium: 'Moyen', low: 'Faible' };

export function RiskWeatherChart({ risks }: { risks: Risk[] }) {
  const data = ['high', 'medium', 'low']
    .map(level => ({ name: RISK_LABELS[level], value: risks.filter(r => r.level === level).length, color: RISK_COLORS[level] }))
    .filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Météo Risques</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Aucun risque enregistré</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Météo Risques</h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={3} strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-[12px] text-foreground">{d.name}: <strong>{d.value}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProgressChart({ countries }: { countries: Country[] }) {
  const sorted = [...countries].sort((a, b) => b.pct - a.pct).slice(0, 8);
  const data = sorted.map(c => ({ name: `${c.flag} ${c.name}`, pct: c.pct }));

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Progression par marché</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" barSize={14}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} width={120} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(val: number) => [`${val}%`, 'Progression']}
          />
          <Bar dataKey="pct" fill="hsl(var(--sky))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ScoreEntry {
  name: string;
  flag: string;
  score: number;
}

export function MarketScoreCard({ scores }: { scores: ScoreEntry[] }) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Scoring Marchés</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun marché</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((s, i) => {
            const color = s.score >= 75 ? 'bg-accent' : s.score >= 50 ? 'bg-[hsl(var(--sky))]' : s.score >= 25 ? 'bg-[hsl(var(--gold))]' : 'bg-destructive';
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">{s.flag}</span>
                <span className="text-[12.5px] font-medium flex-1 min-w-0 truncate">{s.name}</span>
                <div className="w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${s.score}%` }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right">{s.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── NEW: KPI Trend Chart (aggregated monthly CA across all countries) ──
function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[parseInt(mo) - 1]} ${y?.slice(2)}`;
}

export function KpiTrendChart() {
  const { data: history = [] } = useKpiHistory(undefined);

  const chartData = useMemo(() => {
    const byMonth: Record<string, { ca: number; clients: number }> = {};
    history.forEach(h => {
      if (!byMonth[h.month]) byMonth[h.month] = { ca: 0, clients: 0 };
      byMonth[h.month].ca += Number(h.ca);
      byMonth[h.month].clients += Number(h.clients);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month: formatMonth(month), 'CA (FCFA)': v.ca, Clients: v.clients }));
  }, [history]);

  if (chartData.length < 2) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Tendance CA & Clients</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Pas assez de données historiques</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Tendance CA & Clients</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line yAxisId="left" type="monotone" dataKey="CA (FCFA)" stroke="hsl(var(--sage))" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="Clients" stroke="hsl(var(--sky))" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── NEW: N vs N-1 Comparison Card ──
export function NvsN1Card() {
  const { data: history = [] } = useKpiHistory(undefined);

  const comparison = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;
    const thisMonth = String(now.getMonth() + 1).padStart(2, '0');

    const thisYearData = history.filter(h => h.month.startsWith(String(thisYear)));
    const lastYearData = history.filter(h => h.month.startsWith(String(lastYear)));

    // Compare up to current month for fair comparison
    const thisFiltered = thisYearData.filter(h => h.month <= `${thisYear}-${thisMonth}`);
    const lastFiltered = lastYearData.filter(h => h.month <= `${lastYear}-${thisMonth}`);

    const sumCA = (arr: typeof history) => arr.reduce((s, h) => s + Number(h.ca), 0);
    const sumClients = (arr: typeof history) => arr.reduce((s, h) => s + Number(h.clients), 0);

    const caThis = sumCA(thisFiltered);
    const caLast = sumCA(lastFiltered);
    const clientsThis = sumClients(thisFiltered);
    const clientsLast = sumClients(lastFiltered);

    return { caThis, caLast, clientsThis, clientsLast, thisYear, lastYear };
  }, [history]);

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? '+∞' : '—';
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  if (comparison.caThis === 0 && comparison.caLast === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">
        Comparaison {comparison.thisYear} vs {comparison.lastYear}
      </h3>
      <div className="space-y-4">
        {([
          { label: 'CA Cumulé', curr: comparison.caThis, prev: comparison.caLast, fmt: (v: number) => `${(v / 1000).toFixed(0)}K FCFA` },
          { label: 'Clients Cumulés', curr: comparison.clientsThis, prev: comparison.clientsLast, fmt: (v: number) => String(v) },
        ]).map(item => {
          const change = pctChange(item.curr, item.prev);
          const isPositive = change.startsWith('+') && change !== '+∞';
          const isNegative = change.startsWith('-');
          return (
            <div key={item.label}>
              <div className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{item.label}</div>
              <div className="flex items-end gap-3">
                <div className="font-display text-[22px] font-bold text-primary">{item.fmt(item.curr)}</div>
                <div className={`text-[13px] font-semibold mb-0.5 ${isPositive ? 'text-accent' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {change}
                </div>
              </div>
              <div className="text-[10.5px] text-muted-foreground">{comparison.lastYear}: {item.fmt(item.prev)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
