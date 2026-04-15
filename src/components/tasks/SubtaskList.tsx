import { useState } from 'react';
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface Props {
  taskId: string;
  canWrite: boolean;
}

export default function SubtaskList({ taskId, canWrite }: Props) {
  const { data: subtasks = [] } = useSubtasks(taskId);
  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createSubtask.mutate(
      { task_id: taskId, title: newTitle.trim(), sort_order: subtasks.length },
      { onSuccess: () => { setNewTitle(''); setAdding(false); } }
    );
  };

  const done = subtasks.filter(s => s.is_done).length;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Sous-tâches {subtasks.length > 0 && `(${done}/${subtasks.length})`}
        </span>
        {canWrite && !adding && (
          <button onClick={() => setAdding(true)} className="text-[10.5px] text-accent hover:underline flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Ajouter
          </button>
        )}
      </div>

      {subtasks.map(s => (
        <div key={s.id} className="flex items-center gap-2 py-1 group">
          <div
            onClick={() => canWrite && toggleSubtask.mutate({ id: s.id, is_done: !s.is_done })}
            className={`w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center transition-colors ${canWrite ? 'cursor-pointer' : ''} ${s.is_done ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}
          >
            {s.is_done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent-foreground" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>}
          </div>
          <span className={`text-[12px] flex-1 ${s.is_done ? 'line-through text-muted-foreground' : ''}`}>{s.title}</span>
          {canWrite && (
            <button onClick={() => deleteSubtask.mutate(s.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10">
              <X className="w-3 h-3 text-destructive" />
            </button>
          )}
        </div>
      ))}

      {adding && (
        <div className="flex gap-1 mt-1">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Sous-tâche…"
            className="h-7 text-[12px]"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <Button size="sm" className="h-7 text-[11px]" onClick={handleAdd} disabled={createSubtask.isPending}>OK</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setAdding(false)}><X className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </div>
  );
}
