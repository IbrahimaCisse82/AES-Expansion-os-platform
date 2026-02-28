import { useRoadmapBars, useCountries } from '@/hooks/useExpansionData';

const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const colorMap: Record<string, string> = { sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum' };
const currentMonth = 7;

export default function RoadmapPage() {
  const { data: bars = [], isLoading } = useRoadmapBars();
  const { data: countries = [] } = useCountries();

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  // Group bars by country
  const countryIds = [...new Set(bars.map(b => b.country_id))];
  const rows = countryIds.map(cid => {
    const c = countries.find(x => x.id === cid);
    return { flag: c?.flag || '', name: c?.name || cid, bars: bars.filter(b => b.country_id === cid) };
  });

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Feuille de Route</h2>
        <p className="text-[12.5px] text-muted-foreground">Timeline interactive des marchés · 2025</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-5 overflow-x-auto">
        <div className="grid grid-cols-[165px_repeat(12,1fr)] mb-1.5 min-w-[900px]">
          <div className="text-[10px] font-semibold text-muted-foreground">Marché</div>
          {months.map((m, i) => (
            <div key={m} className={`text-[10px] font-semibold text-center py-1 ${i + 1 === currentMonth ? 'text-terracotta' : 'text-muted-foreground'}`}>{m}</div>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-[165px_repeat(12,1fr)] items-center mb-1 min-w-[900px]">
            <div className="text-[12.5px] font-medium flex items-center gap-2">
              <span className="text-lg">{row.flag}</span>{row.name}
            </div>
            {Array.from({ length: 12 }, (_, ci) => {
              const monthIdx = ci + 1;
              const bar = row.bars.find(b => b.start_month === monthIdx);
              const isToday = monthIdx === currentMonth;
              return (
                <div key={ci} className="h-9 border-l border-ivory relative">
                  {isToday && <div className="absolute w-0.5 bg-terracotta top-0 bottom-0 z-10 left-1/2 -translate-x-1/2" />}
                  {bar && (
                    <div className={`absolute h-6 top-1.5 ${colorMap[bar.color] || 'bg-sage'} rounded-md flex items-center px-2 text-[10px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:brightness-110 transition-all z-[1]`}
                      style={{ left: '2px', width: `calc(${bar.end_month - bar.start_month} * 100% - 4px)` }}>
                      {bar.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex gap-4 mt-4 pt-3 border-t border-ivory">
          {[{ color: 'bg-sage', label: 'Étude' }, { color: 'bg-gold', label: 'Légal' }, { color: 'bg-sky', label: 'Mise en place' }, { color: 'bg-terracotta', label: 'Lancement' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[12px]">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} /><span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
