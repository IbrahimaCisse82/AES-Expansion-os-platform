import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseAmount } from '@/lib/parseAmount';

interface Country {
  id: string;
  name: string;
  flag: string;
  pct: number;
  team_size: number;
  risk_count: number;
  population?: string | null;
  gdp?: string | null;
  kpi_nps?: string | null;
  kpi_retention?: string | null;
  kpi_ca?: string | null;
}

const COLORS = ['hsl(var(--accent))', 'hsl(var(--sky))', 'hsl(var(--gold))'];

function parseNum(v?: string | null): number {
  return parseAmount(v) ?? 0;
}

export default function RadarComparison({ countries }: { countries: Country[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleCountry = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  };

  const selectedCountries = countries.filter(c => selected.includes(c.id));

  const metrics = ['Progression', 'Équipe', 'NPS', 'Rétention', 'CA'];

  const data = metrics.map(metric => {
    const entry: Record<string, string | number> = { metric };
    selectedCountries.forEach(c => {
      let val = 0;
      switch (metric) {
        case 'Progression': val = c.pct; break;
        case 'Équipe': val = Math.min(c.team_size * 10, 100); break;
        case 'NPS': val = parseNum(c.kpi_nps); break;
        case 'Rétention': val = parseNum(c.kpi_retention); break;
        case 'CA': val = Math.min(parseNum(c.kpi_ca) / 10_000, 100); break; // 1 M = 100
      }
      entry[`${c.flag} ${c.name}`] = val;
    });
    return entry;
  });

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-3">Comparaison Radar</h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {countries.map(c => (
          <button
            key={c.id}
            onClick={() => toggleCountry(c.id)}
            className={`px-2 py-1 rounded-md text-[10.5px] font-medium transition-colors ${
              selected.includes(c.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>
      {selectedCountries.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sélectionnez 2-3 marchés à comparer</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <PolarRadiusAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
            {selectedCountries.map((c, i) => (
              <Radar
                key={c.id}
                name={`${c.flag} ${c.name}`}
                dataKey={`${c.flag} ${c.name}`}
                stroke={COLORS[i]}
                fill={COLORS[i]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
