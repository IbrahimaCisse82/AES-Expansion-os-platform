import { useState } from 'react';
import StatusPill from '@/components/StatusPill';
import { useTasks, useCountries, useMilestones } from '@/hooks/useExpansionData';
import { useUpdateTask } from '@/hooks/useTaskMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';

const COLUMNS = [
  { key: 'open', label: 'À faire', color: 'border-[hsl(var(--sky))]' },
  { key: 'wip', label: 'En cours', color: 'border-[hsl(var(--gold))]' },
  { key: 'late', label: 'En retard', color: 'border-destructive' },
  { key: 'done', label: 'Terminée', color: 'border-accent' },
] as const;

export default function KanbanBoard({ searchQuery = '' }: { searchQuery?: string }) {
  const { data: tasks = [] } = useTasks();
  const { data: countries = [] } = useCountries();
  const updateTask = useUpdateTask();
  const { data: myRole } = useCurrentUserRole();
  const canWrite = ['admin', 'director', 'country_manager'].includes(myRole ?? '');

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filtered = searchQuery
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.country_label?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const handleDrop = (status: string) => {
    if (!draggedId || !canWrite) return;
    updateTask.mutate({ id: draggedId, status: status as 'open' | 'done' | 'late' | 'wip' });
    setDraggedId(null);
  };

  return (
    <div className="grid grid-cols-4 gap-3 min-h-[400px]">
      {COLUMNS.map(col => {
        const colTasks = filtered.filter(t => t.status === col.key);
        return (
          <div
            key={col.key}
            className={`bg-muted/30 rounded-lg p-3 border-t-2 ${col.color}`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-foreground">{col.label}</span>
              <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">{colTasks.length}</span>
            </div>
            <div className="space-y-2">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable={canWrite}
                  onDragStart={() => setDraggedId(task.id)}
                  className={`bg-card border border-border rounded-lg p-3 transition-shadow hover:shadow-card ${canWrite ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedId === task.id ? 'opacity-50' : ''}`}
                >
                  <div className="text-[12.5px] font-medium text-foreground mb-1">{task.title}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.country_label && (
                      <span className="text-[10px] text-muted-foreground">{task.country_label}</span>
                    )}
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground">📅 {task.due_date}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full ${
                      task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                      task.priority === 'med' ? 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]' :
                      'bg-accent/10 text-accent'
                    }`}>
                      {task.priority === 'high' ? 'Haute' : task.priority === 'med' ? 'Moy' : 'Basse'}
                    </span>
                    {task.owner_name && (
                      <span className="text-[10px] text-muted-foreground">{task.owner_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
