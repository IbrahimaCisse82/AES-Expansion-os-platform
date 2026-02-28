import { useState } from 'react';
import StatusPill from '@/components/StatusPill';
import { useTasks } from '@/hooks/useExpansionData';

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const filters = [
    { key: 'all', label: `Toutes (${tasks.length})` },
    { key: 'open', label: `À faire (${tasks.filter(t => t.status === 'open').length})` },
    { key: 'late', label: `En retard (${tasks.filter(t => t.status === 'late').length})` },
    { key: 'done', label: `Terminées (${tasks.filter(t => t.status === 'done').length})` },
  ];

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Tâches</h2>
        <p className="text-[12.5px] text-muted-foreground">Suivi des tâches par marché et priorité</p>
      </div>
      <div className="flex gap-1 bg-ivory p-1 rounded-lg mb-5 w-fit">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-md text-[12.5px] font-medium transition-all ${filter === f.key ? 'bg-card text-primary shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-lg p-5">
        {filtered.map(task => (
          <div key={task.id} className="flex items-start gap-3 py-3 border-b border-ivory last:border-b-0 group">
            <div className={`w-[19px] h-[19px] border-2 rounded-[5px] flex-shrink-0 mt-0.5 cursor-pointer transition-colors flex items-center justify-center ${task.status === 'done' ? 'bg-sage border-sage' : 'border-border hover:border-sage'}`}>
              {task.status === 'done' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</div>
              <div className="text-[11px] text-muted-foreground flex gap-2 flex-wrap mt-0.5">
                <span>{task.country_label}</span><span>·</span><span>📅 {task.due_date}</span><span>·</span><span>{task.owner_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {task.status === 'late' && <StatusPill status="late" />}
              {task.status === 'done' && <StatusPill status="done" />}
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-terracotta/10 text-terracotta' : task.priority === 'med' ? 'bg-gold/10 text-gold' : 'bg-sage/10 text-sage'}`}>
                {task.priority === 'high' ? 'Haute' : task.priority === 'med' ? 'Moyenne' : 'Faible'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
