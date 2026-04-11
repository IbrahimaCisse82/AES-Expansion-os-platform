import { useState, useMemo } from 'react';
import { useCloseTasks, useCreateCloseTask, useUpdateCloseTask, useDeleteCloseTask } from '@/hooks/useBudgetNewFeatures';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Check, Clock, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface CloseManagementProps {
  scenarioId: string;
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
}

const DEFAULT_TASKS = [
  'Collecte des données',
  'Validation des soldes',
  'Réconciliation intercompagnies',
  'Écritures d\'ajustement',
  'Revue du P&L',
  'Approbation finale',
];

export default function CloseManagement({ scenarioId, countries, canWrite }: CloseManagementProps) {
  const { data: tasks = [] } = useCloseTasks(scenarioId);
  const createTask = useCreateCloseTask();
  const updateTask = useUpdateCloseTask();
  const deleteTask = useDeleteCloseTask();
  const [addOpen, setAddOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const byCountry = useMemo(() => {
    const map = new Map<string, { label: string; tasks: typeof tasks; completed: number; total: number }>();
    tasks.forEach(t => {
      const key = t.country_id || '_global';
      const existing = map.get(key) || { label: t.country_label || 'Groupe', tasks: [], completed: 0, total: 0 };
      existing.tasks.push(t);
      existing.total++;
      if (t.status === 'completed') existing.completed++;
      map.set(key, existing);
    });
    return Array.from(map.entries());
  }, [tasks]);

  const totalCompleted = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const handleAdd = () => {
    if (!taskName) { toast.error('Nom de tâche requis'); return; }
    const country = countries.find(c => c.id === countryId);
    createTask.mutate({
      scenario_id: scenarioId, task_name: taskName, task_order: tasks.length,
      country_id: countryId || null, country_label: country ? `${country.flag} ${country.name}` : 'Groupe',
      status: 'pending', assigned_to: null, assigned_name: '', due_date: dueDate, notes: '',
    }, {
      onSuccess: () => { toast.success('Tâche ajoutée'); setAddOpen(false); setTaskName(''); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleInitChecklist = () => {
    const items = countries.length > 0
      ? countries.flatMap((c, ci) => DEFAULT_TASKS.map((t, ti) => ({
          scenario_id: scenarioId, task_name: t, task_order: ci * DEFAULT_TASKS.length + ti,
          country_id: c.id, country_label: `${c.flag} ${c.name}`,
          status: 'pending', assigned_to: null, assigned_name: '', due_date: '', notes: '',
        })))
      : DEFAULT_TASKS.map((t, i) => ({
          scenario_id: scenarioId, task_name: t, task_order: i,
          country_id: null, country_label: 'Groupe',
          status: 'pending', assigned_to: null, assigned_name: '', due_date: '', notes: '',
        }));

    Promise.all(items.map(item => createTask.mutateAsync(item)))
      .then(() => toast.success(`${items.length} tâches de clôture créées`))
      .catch((e: Error) => toast.error(e.message));
  };

  const toggleStatus = (taskId: string, current: string) => {
    const newStatus = current === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({
      id: taskId, scenarioId, status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : { completed_at: null }),
    });
  };

  const statusColor = (s: string) => s === 'completed' ? 'default' : s === 'in_progress' ? 'secondary' : 'outline';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-bold text-primary">Gestion de la clôture</h3></div>
        <div className="flex gap-2">
          {canWrite && tasks.length === 0 && <Button onClick={handleInitChecklist} variant="outline" size="sm" className="gap-1.5 text-[12px]"><ClipboardList className="w-3.5 h-3.5" /> Checklist auto</Button>}
          {canWrite && <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 text-[12px]"><Plus className="w-3.5 h-3.5" /> Tâche</Button>}
        </div>
      </div>

      {totalTasks > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold">Progression globale</span>
            <span className="text-[12px] font-bold text-primary">{overallProgress}% ({totalCompleted}/{totalTasks})</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </Card>
      )}

      {byCountry.length === 0 ? (
        <Card className="p-8 text-center"><ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Initialisez la checklist de clôture pour chaque pays.</p></Card>
      ) : (
        <div className="space-y-3">
          {byCountry.map(([key, group]) => {
            const pct = group.total > 0 ? Math.round((group.completed / group.total) * 100) : 0;
            return (
              <Card key={key} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[13px]">{group.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{group.completed}/{group.total}</span>
                    <Progress value={pct} className="w-[100px] h-1.5" />
                    <Badge variant={pct === 100 ? 'default' : 'outline'} className="text-[9px]">{pct === 100 ? 'Clôturé' : `${pct}%`}</Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  {group.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50">
                      <button onClick={() => toggleStatus(t.id, t.status)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${t.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                        {t.status === 'completed' && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <span className={`text-[11px] flex-1 ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{t.task_name}</span>
                      {t.due_date && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{t.due_date}</span>}
                      {canWrite && <button onClick={() => deleteTask.mutate({ id: t.id, scenarioId })} className="p-0.5 hover:text-destructive"><Trash2 className="w-2.5 h-2.5" /></button>}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-display">Nouvelle tâche de clôture</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="text-[12px]">Tâche *</Label><Input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Réconciliation bancaire" className="mt-1" /></div>
            <div><Label className="text-[12px]">Pays</Label>
              <Select value={countryId} onValueChange={setCountryId}><SelectTrigger className="mt-1"><SelectValue placeholder="Groupe (tous)" /></SelectTrigger>
                <SelectContent><SelectItem value="_global">🌍 Groupe</SelectItem>{countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-[12px]">Date limite</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" /></div>
            <Button onClick={handleAdd} className="w-full" disabled={createTask.isPending}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
