import { useMemo } from 'react';

interface Country {
  id: string;
  name: string;
  flag: string;
  pct: number;
  status: string;
}

// Simplified Africa country positions (approximate lat/lon mapped to SVG coords)
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
  SN: { x: 78, y: 155 }, CI: { x: 105, y: 180 }, ML: { x: 110, y: 140 },
  BF: { x: 120, y: 155 }, GH: { x: 115, y: 180 }, TG: { x: 122, y: 180 },
  BJ: { x: 128, y: 180 }, NE: { x: 140, y: 140 }, NG: { x: 145, y: 180 },
  CM: { x: 160, y: 195 }, GA: { x: 155, y: 215 }, CG: { x: 165, y: 225 },
  CD: { x: 195, y: 225 }, RW: { x: 210, y: 215 }, BI: { x: 210, y: 225 },
  KE: { x: 235, y: 205 }, TZ: { x: 230, y: 225 }, UG: { x: 220, y: 205 },
  ET: { x: 240, y: 175 }, DJ: { x: 255, y: 165 }, SO: { x: 260, y: 185 },
  MG: { x: 265, y: 260 }, MZ: { x: 230, y: 265 }, ZA: { x: 195, y: 300 },
  ZM: { x: 205, y: 255 }, ZW: { x: 210, y: 270 }, AO: { x: 170, y: 250 },
  NA: { x: 165, y: 280 }, BW: { x: 190, y: 280 }, MW: { x: 225, y: 250 },
  TN: { x: 150, y: 60 }, MA: { x: 100, y: 55 }, DZ: { x: 130, y: 65 },
  LY: { x: 165, y: 75 }, EG: { x: 210, y: 80 }, SD: { x: 215, y: 140 },
  TD: { x: 170, y: 140 }, CF: { x: 175, y: 185 }, GN: { x: 90, y: 170 },
  SL: { x: 85, y: 178 }, LR: { x: 92, y: 185 }, MR: { x: 85, y: 125 },
  GM: { x: 75, y: 160 }, GW: { x: 78, y: 165 }, CV: { x: 50, y: 145 },
  ST: { x: 140, y: 210 }, GQ: { x: 150, y: 210 }, SS: { x: 210, y: 175 },
  ER: { x: 245, y: 155 }, LS: { x: 200, y: 295 }, SZ: { x: 215, y: 290 },
  KM: { x: 260, y: 245 }, SC: { x: 280, y: 225 }, MU: { x: 285, y: 270 },
};

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(var(--accent))',
  planning: 'hsl(var(--sky))',
  done: 'hsl(var(--gold))',
  paused: 'hsl(var(--destructive))',
};

export default function AfricaMap({ countries }: { countries: Country[] }) {
  const markers = useMemo(() => {
    return countries.map(c => {
      const coords = COUNTRY_COORDS[c.id.toUpperCase()];
      if (!coords) return null;
      return { ...c, ...coords };
    }).filter(Boolean) as (Country & { x: number; y: number })[];
  }, [countries]);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-3">Carte des Marchés</h3>
      <div className="relative">
        <svg viewBox="30 30 280 300" className="w-full h-auto max-h-[280px]">
          {/* Africa simplified outline */}
          <path
            d="M100,45 L155,40 L175,50 L220,55 L245,70 L260,100 L265,135 L260,155 L270,180 L265,200 L275,220 L270,250 L250,270 L230,280 L220,295 L205,310 L190,310 L175,300 L160,295 L150,280 L140,265 L130,250 L125,235 L130,220 L140,210 L145,195 L135,180 L120,175 L105,180 L90,175 L80,165 L75,150 L70,135 L65,120 L75,95 L85,70 L100,50 Z"
            fill="hsl(var(--muted))"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.5"
          />
          {/* Country markers */}
          {markers.map(m => {
            const color = STATUS_COLORS[m.status] || STATUS_COLORS.planning;
            const r = 6 + (m.pct / 100) * 6;
            return (
              <g key={m.id}>
                <circle cx={m.x} cy={m.y} r={r + 2} fill={color} opacity={0.2} />
                <circle cx={m.x} cy={m.y} r={r} fill={color} stroke="hsl(var(--card))" strokeWidth="1.5" />
                <text x={m.x} y={m.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize="6" fontWeight="bold" fill="white">
                  {m.flag}
                </text>
                <text x={m.x} y={m.y + r + 9} textAnchor="middle" fontSize="6.5" fontWeight="600" fill="hsl(var(--foreground))">
                  {m.id}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {[
            { label: 'Actif', color: STATUS_COLORS.active },
            { label: 'Planification', color: STATUS_COLORS.planning },
            { label: 'Terminé', color: STATUS_COLORS.done },
            { label: 'En pause', color: STATUS_COLORS.paused },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
