import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
