import { useMemo } from 'react';
import { useCountries, useMilestones } from '@/hooks/useExpansionData';

const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const currentMonth = new Date().getMonth(); // 0-indexed

const colorMap: Record<string, string> = {
  sage: 'bg-[hsl(var(--sage))]',
  sky: 'bg-[hsl(var(--sky))]',
  gold: 'bg-[hsl(var(--gold))]',
  terracotta: 'bg-destructive',
  plum: 'bg-[hsl(var(--plum))]',
};
const borderColorMap: Record<string, string> = {
  sage: 'border-[hsl(var(--sage))]',
  sky: 'border-[hsl(var(--sky))]',
  gold: 'border-[hsl(var(--gold))]',
  terracotta: 'border-destructive',
  plum: 'border-[hsl(var(--plum))]',
};

function parseMonthIndex(dateStr: string | null): number | null {
  if (!dateStr) return null;
  // Try ISO date
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso.getMonth();
  // Try French month names
  const lower = dateStr.toLowerCase();
  const frMonths: Record<string, number> = {
    'jan': 0, 'fév': 1, 'fev': 1, 'mar': 2, 'avr': 3, 'mai': 4, 'juin': 5,
    'juil': 6, 'jul': 6, 'août': 7, 'aou': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'déc': 11, 'dec': 11,
  };
  for (const [key, idx] of Object.entries(frMonths)) {
    if (lower.includes(key)) return idx;
  }
  return null;
}

export default function GanttChart() {
  const { data: countries = [] } = useCountries();
  const { data: milestones = [] } = useMilestones(null);

  const rows = useMemo(() => {
    const ms = milestones;
    return countries
      .filter(c => ms.some(m => m.country_id === c.id))
      .map(country => {
        const countryMilestones = ms
          .filter(m => m.country_id === country.id)
          .map(m => ({
            ...m,
            startMonthIdx: parseMonthIndex((m as any).start_date) ?? parseMonthIndex(m.target_date),
            endMonthIdx: parseMonthIndex((m as any).end_date) ?? parseMonthIndex(m.target_date),
          }))
          .filter(m => m.startMonthIdx !== null || m.endMonthIdx !== null)
          .sort((a, b) => (a.startMonthIdx ?? a.endMonthIdx ?? 0) - (b.startMonthIdx ?? b.endMonthIdx ?? 0));

        const allMonths = countryMilestones.flatMap(m => [m.startMonthIdx, m.endMonthIdx].filter((v): v is number => v !== null));
        const startMonth = allMonths.length > 0 ? Math.min(...allMonths) : 0;
        const endMonth = allMonths.length > 0 ? Math.max(...allMonths) : 11;

        return {
          country,
          milestones: countryMilestones,
          startMonth,
          endMonth,
        };
      });
  }, [countries, milestones]);

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
        Aucun jalon avec date pour afficher le diagramme de Gantt. Ajoutez des dates à vos jalons.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Diagramme de Gantt — Jalons</h3>

      {/* Header */}
      <div className="grid grid-cols-[140px_repeat(12,1fr)] mb-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Marché</div>
        {months.map((m, i) => (
          <div
            key={m}
            className={`text-[10px] font-semibold text-center py-1 ${
              i === currentMonth ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map(({ country, milestones: cms, startMonth, endMonth }) => (
        <div
          key={country.id}
          className="grid grid-cols-[140px_repeat(12,1fr)] items-center border-t border-border"
        >
          {/* Country label */}
          <div className="text-[12.5px] font-medium flex items-center gap-2 py-3">
            <span className="text-lg leading-none">{country.flag}</span>
            <span className="truncate">{country.name}</span>
          </div>

          {/* Month cells */}
          {Array.from({ length: 12 }, (_, ci) => {
            const isInRange = ci >= startMonth && ci <= endMonth;
            const milestone = cms.find(m => m.monthIdx === ci);
            const isToday = ci === currentMonth;

            return (
              <div key={ci} className="h-12 border-l border-border relative flex items-center justify-center">
                {/* Today indicator */}
                {isToday && (
                  <div className="absolute w-0.5 bg-destructive top-0 bottom-0 z-10 left-1/2 -translate-x-1/2 opacity-40" />
                )}

                {/* Progress bar spanning months */}
                {ci === startMonth && endMonth > startMonth && (
                  <div
                    className={`absolute h-2 top-1/2 -translate-y-1/2 rounded-full ${colorMap[country.color] || 'bg-accent'} opacity-30 z-[1]`}
                    style={{
                      left: '50%',
                      width: `calc(${endMonth - startMonth} * 100%)`,
                    }}
                  />
                )}

                {/* Milestone diamond */}
                {milestone && (
                  <div className="relative z-[5] group cursor-default">
                    <div
                      className={`w-4 h-4 rotate-45 border-2 ${
                        milestone.is_done
                          ? `${colorMap[country.color] || 'bg-accent'} ${borderColorMap[country.color] || 'border-accent'}`
                          : `bg-card ${borderColorMap[country.color] || 'border-accent'}`
                      } transition-transform hover:scale-125`}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                      <div className="bg-popover border border-border text-popover-foreground rounded-lg shadow-lg px-3 py-2 whitespace-nowrap text-[11px]">
                        <div className="font-semibold">{milestone.icon} {milestone.title}</div>
                        <div className="text-muted-foreground mt-0.5">
                          {milestone.target_date} · {milestone.is_done ? '✅ Terminé' : '⏳ En cours'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-5 mt-4 pt-3 border-t border-border flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="w-3 h-3 rotate-45 bg-accent border border-accent rounded-[1px]" />
          <span>Jalon terminé</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="w-3 h-3 rotate-45 bg-card border-2 border-accent rounded-[1px]" />
          <span>Jalon en cours</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="w-0.5 h-4 bg-destructive opacity-40" />
          <span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}
