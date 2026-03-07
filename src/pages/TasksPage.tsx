import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import { useTasks, useCountries, useMilestones } from '@/hooks/useExpansionData';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTaskMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(200),
  country_id: z.string().min(1, 'Le marché est requis'),
  country_label: z.string().optional(),
  milestone_id: z.string().min(1, 'Le jalon est requis'),
  priority: z.enum(['high', 'med', 'low']),
  status: z.enum(['open', 'done', 'late', 'wip']),
  due_date: z.string().optional(),
  owner_name: z.string().max(100).optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

const EMPTY_FORM: TaskForm = {
  title: '',
  priority: 'med',
  status: 'open',
  due_date: '',
  owner_name: '',
  country_id: '',
  country_label: '',
  milestone_id: '',
};

const CAN_WRITE_ROLES = ['admin', 'director', 'country_manager'];

export default function TasksPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { user } = useAuth();
  const { data: myRole } = useCurrentUserRole();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: countries = [] } = useCountries();
  const { data: allMilestones = [] } = useMilestones();
  const countryMilestones = allMilestones.filter(m => m.country_id === form.country_id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const canWrite = CAN_WRITE_ROLES.includes(myRole ?? '');

  const [filter, setFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite) openCreate();
  }, [addSignal]);

  const searched = searchQuery ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.country_label?.toLowerCase().includes(searchQuery.toLowerCase()) || t.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())) : tasks;
  const filtered = filter === 'all' ? searched : searched.filter(t => t.status === filter);
  const filters = [
    { key: 'all', label: `Toutes (${tasks.length})` },
    { key: 'open', label: `À faire (${tasks.filter(t => t.status === 'open').length})` },
    { key: 'wip', label: `En cours (${tasks.filter(t => t.status === 'wip').length})` },
    { key: 'late', label: `En retard (${tasks.filter(t => t.status === 'late').length})` },
    { key: 'done', label: `Terminées (${tasks.filter(t => t.status === 'done').length})` },
  ];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (task: typeof tasks[0]) => {
    setForm({
      title: task.title,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? '',
      owner_name: task.owner_name ?? '',
      country_id: task.country_id ?? '',
      country_label: task.country_label ?? '',
      milestone_id: (task as any).milestone_id ?? '',
    });
    setEditingId(task.id);
    setErrors({});
    setDialogOpen(true);
  };

  const handleCountryChange = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    setForm(prev => ({ ...prev, country_id: countryId, country_label: country ? `${country.flag} ${country.name}` : '', milestone_id: '' }));
  };

  const handleSubmit = () => {
    const result = taskSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      title: result.data.title,
      priority: result.data.priority,
      status: result.data.status,
      due_date: result.data.due_date || null,
      owner_name: result.data.owner_name || null,
      country_id: result.data.country_id || null,
      country_label: result.data.country_label || null,
      milestone_id: result.data.milestone_id || null,
    };

    if (editingId) {
      updateTask.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { toast.success('Tâche modifiée'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    } else {
      createTask.mutate({ ...payload, created_by: user?.id ?? null }, {
        onSuccess: () => { toast.success('Tâche créée'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTask.mutate(deleteId, {
      onSuccess: () => { toast.success('Tâche supprimée'); setDeleteId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const toggleDone = (task: typeof tasks[0]) => {
    if (!canWrite) return;
    const newStatus = task.status === 'done' ? 'open' : 'done';
    updateTask.mutate({ id: task.id, status: newStatus });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Tâches</h2>
          <p className="text-[12.5px] text-muted-foreground">Suivi des tâches par marché et priorité</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Nouvelle tâche
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-secondary p-1 rounded-lg mb-5 w-fit">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-md text-[12.5px] font-medium transition-all ${filter === f.key ? 'bg-card text-primary shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">Aucune tâche dans cette catégorie</div>
        )}
        {filtered.map(task => (
          <div key={task.id} className="flex items-start gap-3 py-3 border-b border-border last:border-b-0 group">
            <div
              onClick={() => toggleDone(task)}
              className={`w-[19px] h-[19px] border-2 rounded-[5px] flex-shrink-0 mt-0.5 transition-colors flex items-center justify-center ${canWrite ? 'cursor-pointer' : ''} ${task.status === 'done' ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}
            >
              {task.status === 'done' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent-foreground" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</div>
              <div className="text-[11px] text-muted-foreground flex gap-2 flex-wrap mt-0.5">
                {task.country_label && <span>{task.country_label}</span>}
                {(task as any).milestone_id && (() => {
                  const ms = allMilestones.find(m => m.id === (task as any).milestone_id);
                  return ms ? <><span>·</span><span>🎯 {ms.title}</span></> : null;
                })()}
                {task.due_date && <><span>·</span><span>📅 {task.due_date}</span></>}
                {task.owner_name && <><span>·</span><span>{task.owner_name}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {task.status === 'late' && <StatusPill status="late" />}
              {task.status === 'done' && <StatusPill status="done" />}
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'med' ? 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]' : 'bg-accent/10 text-accent'}`}>
                {task.priority === 'high' ? 'Haute' : task.priority === 'med' ? 'Moyenne' : 'Faible'}
              </span>
              {canWrite && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(task)} className="p-1 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteId(task.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={200} className="mt-1" />
              {errors.title && <p className="text-destructive text-[11px] mt-1">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Marché</Label>
                <Select value={form.country_id || '_none'} onValueChange={v => handleCountryChange(v === '_none' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucun</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="med">Moyenne</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">À faire</SelectItem>
                    <SelectItem value="wip">En cours</SelectItem>
                    <SelectItem value="late">En retard</SelectItem>
                    <SelectItem value="done">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Échéance</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-[12.5px]">Responsable</Label>
              <Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} maxLength={100} placeholder="Nom du responsable" className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createTask.isPending || updateTask.isPending}>
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
