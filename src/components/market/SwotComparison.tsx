import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Country {
  id: string;
  name: string;
  flag: string;
  pct: number;
  risk_count: number;
  team_size: number;
  status: string;
  population?: string | null;
  gdp?: string | null;
  description?: string | null;
}

const SWOT_LABELS = {
  strengths: { label: 'Forces', icon: '💪', bg: 'bg-accent/10', border: 'border-accent/30' },
  weaknesses: { label: 'Faiblesses', icon: '⚠️', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  opportunities: { label: 'Opportunités', icon: '🌟', bg: 'bg-[hsl(var(--sky))]/10', border: 'border-[hsl(var(--sky))]/30' },
  threats: { label: 'Menaces', icon: '🔥', bg: 'bg-[hsl(var(--gold))]/10', border: 'border-[hsl(var(--gold))]/30' },
};

function autoSwot(c: Country) {
  const s: string[] = [];
  const w: string[] = [];
  const o: string[] = [];
  const t: string[] = [];

  if (c.pct >= 70) s.push('Progression avancée');
  else if (c.pct < 30) w.push('Faible progression');

  if (c.team_size >= 5) s.push('Équipe solide déployée');
  else if (c.team_size === 0) w.push('Aucune équipe sur place');

  if (c.risk_count === 0) s.push('Aucun risque identifié');
  else if (c.risk_count >= 3) t.push(`${c.risk_count} risques actifs`);

  if (c.status === 'active') s.push('Marché actif');
  if (c.status === 'paused') w.push('Expansion en pause');

  if (c.gdp) o.push(`PIB: ${c.gdp}`);
  if (c.population) o.push(`Population: ${c.population}`);

  t.push('Instabilité réglementaire possible');
  o.push('Croissance du marché digital');

  return { strengths: s, weaknesses: w, opportunities: o, threats: t };
}

export default function SwotComparison({ countries }: { countries: Country[] }) {
  const [ids, setIds] = useState<string[]>([]);

  const selected = countries.filter(c => ids.includes(c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {countries.map(c => (
          <button
            key={c.id}
            onClick={() => setIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : prev.length >= 3 ? prev : [...prev, c.id])}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              ids.includes(c.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sélectionnez 1-3 marchés pour voir l'analyse SWOT</p>
      ) : (
        <div className={`grid gap-4 ${selected.length === 1 ? 'grid-cols-1' : selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {selected.map(c => {
            const swot = autoSwot(c);
            return (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-display text-[14px] font-semibold text-primary mb-3">{c.flag} {c.name}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(SWOT_LABELS) as [keyof typeof SWOT_LABELS, typeof SWOT_LABELS[keyof typeof SWOT_LABELS]][]).map(([key, cfg]) => (
                    <div key={key} className={`${cfg.bg} border ${cfg.border} rounded-md p-2.5`}>
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5">{cfg.icon} {cfg.label}</div>
                      <ul className="space-y-0.5">
                        {swot[key].map((item, i) => (
                          <li key={i} className="text-[10px] text-foreground leading-snug">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
