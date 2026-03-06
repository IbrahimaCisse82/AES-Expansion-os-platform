import { useMemo } from 'react';
import { useTasks } from '@/hooks/useExpansionData';

export default function CalendarPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = now.getDate();

  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Build calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirst = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday-based
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < adjustedFirst; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Map tasks with due dates to calendar days
  const tasksByDay = useMemo(() => {
    const map: Record<number, { label: string; color: string }[]> = {};
    tasks.forEach(t => {
      if (!t.due_date) return;
      // Try to parse the date
      const parsed = new Date(t.due_date);
      if (isNaN(parsed.getTime())) return;
      if (parsed.getMonth() !== currentMonth || parsed.getFullYear() !== currentYear) return;
      const day = parsed.getDate();
      if (!map[day]) map[day] = [];
      const colorMap: Record<string, string> = { high: 'bg-destructive', med: 'bg-[hsl(var(--gold))]', low: 'bg-accent' };
      map[day].push({
        label: `${t.country_label ? t.country_label.split(' ')[0] + ' ' : ''}${t.title.slice(0, 25)}`,
        color: colorMap[t.priority] || 'bg-accent',
      });
    });
    return map;
  }, [tasks, currentMonth, currentYear]);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Calendrier</h2>
        <p className="text-[12.5px] text-muted-foreground">Tâches et échéances par date</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-display text-lg font-semibold text-primary flex-1 capitalize">{monthName}</h3>
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
                day === today ? 'bg-accent/10 border-[1.5px] border-accent' :
                day ? 'bg-muted/30' : 'opacity-40 bg-muted/30'
              }`}
            >
              {day && (
                <>
                  <div className={`text-[11.5px] font-semibold mb-1 ${day === today ? 'text-accent font-bold' : 'text-muted-foreground'}`}>
                    {day}
                  </div>
                  {tasksByDay[day]?.map((ev, j) => (
                    <div key={j} className={`text-[10px] font-medium text-white px-1.5 py-0.5 rounded mb-0.5 truncate ${ev.color}`}>
                      {ev.label}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 mt-4">Aucune tâche avec échéance. Ajoutez des dates à vos tâches pour les voir ici.</p>
        )}
      </div>
    </div>
  );
}
