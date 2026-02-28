export default function CalendarPage() {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const today = 15; // July 15

  const events: Record<number, { label: string; color: string }[]> = {
    3: [{ label: '🇩🇪 Réunion légale', color: 'bg-sage' }],
    7: [{ label: '🇯🇵 Brief équipe', color: 'bg-sky' }],
    10: [{ label: '🇧🇷 Call ANVISA', color: 'bg-gold' }],
    15: [{ label: '🇩🇪 Signature bail', color: 'bg-sage' }, { label: '🇯🇵 Review KPIs', color: 'bg-sky' }],
    20: [{ label: '🇦🇺 Prospection', color: 'bg-terracotta' }],
    25: [{ label: '🇳🇬 Analyse cadre', color: 'bg-plum' }],
    28: [{ label: '🇯🇵 Launch prep', color: 'bg-sky' }],
  };

  // Generate calendar grid for July 2025
  const firstDay = 1; // Tuesday (0=Mon)
  const daysInMonth = 31;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Calendrier</h2>
        <p className="text-[12.5px] text-muted-foreground">Événements et jalons par marché</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="w-[30px] h-[30px] border border-border rounded-md bg-card flex items-center justify-center text-sm hover:bg-ivory transition-colors">‹</button>
          <h3 className="font-display text-lg font-semibold text-primary flex-1">Juillet 2025</h3>
          <button className="w-[30px] h-[30px] border border-border rounded-md bg-card flex items-center justify-center text-sm hover:bg-ivory transition-colors">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-[10.5px] font-semibold text-muted-foreground tracking-wide py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-[80px] rounded-lg p-1.5 ${
                day === today ? 'bg-sage-light border-[1.5px] border-sage' :
                day ? 'bg-ivory' : 'opacity-40 bg-ivory'
              }`}
            >
              {day && (
                <>
                  <div className={`text-[11.5px] font-semibold mb-1 ${day === today ? 'text-sage-dark font-bold' : 'text-muted-foreground'}`}>
                    {day}
                  </div>
                  {events[day]?.map((ev, j) => (
                    <div key={j} className={`text-[10px] font-medium text-white px-1.5 py-0.5 rounded mb-0.5 truncate ${ev.color}`}>
                      {ev.label}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
