import { useMemo, useState, useCallback } from 'react';
import { useTasks, useCountries, useMilestones } from '@/hooks/useExpansionData';
import { useCreateTask, useUpdateTask } from '@/hooks/useTaskMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useAllUsersWithRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CAN_WRITE = ['admin', 'director', 'country_manager'];

export default function CalendarPage() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: countries = [] } = useCountries();
  const { data: allMilestones = [] } = useMilestones(null);
  const { data: myRole } = useCurrentUserRole();
  const { data: members = [] } = useAllUsersWithRoles();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const canWrite = CAN_WRITE.includes(myRole ?? '');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const todayDate = now.getDate();
  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCountryId, setNewCountryId] = useState('');
  const [newMilestoneId, setNewMilestoneId] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'med' | 'low'>('med');

  const countryMilestones = allMilestones.filter(m => m.country_id === newCountryId);

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const adjustedFirst = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < adjustedFirst; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDay = useMemo(() => {
    const map: Record<number, { id: string; label: string; color: string }[]> = {};
    tasks.forEach(t => {
      if (!t.due_date) return;
      const parsed = new Date(t.due_date);
      if (isNaN(parsed.getTime())) return;
      if (parsed.getMonth() !== viewMonth || parsed.getFullYear() !== viewYear) return;
      const day = parsed.getDate();
      if (!map[day]) map[day] = [];
      const colorMap: Record<string, string> = { high: 'bg-destructive', med: 'bg-[hsl(var(--gold))]', low: 'bg-accent' };
      map[day].push({
        id: t.id,
        label: `${t.country_label ? t.country_label.split(' ')[0] + ' ' : ''}${t.title.slice(0, 25)}`,
        color: colorMap[t.priority] || 'bg-accent',
      });
    });
    return map;
  }, [tasks, viewMonth, viewYear]);

  const handleDrop = useCallback((day: number) => {
    if (!dragTaskId || !canWrite) return;
    const newDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    updateTask.mutate({ id: dragTaskId, due_date: newDate }, {
      onSuccess: () => toast.success('Tâche replanifiée'),
      onError: (err: Error) => toast.error(err.message),
    });
    setDragTaskId(null);
  }, [dragTaskId, canWrite, viewYear, viewMonth, updateTask]);

  const openCreateForDay = (day: number) => {
    if (!canWrite) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setNewDate(dateStr);
    setNewTitle('');
    setNewCountryId('');
    setNewMilestoneId('');
    setNewAssigneeId('');
    setNewPriority('med');
    setDialogOpen(true);
  };

  const handleCountryChange = (cid: string) => {
    setNewCountryId(cid);
    setNewMilestoneId('');
  };

  const handleCreate = () => {
    if (!newTitle.trim()) { toast.error('Le titre est requis'); return; }
    if (!newCountryId) { toast.error('Le marche est requis'); return; }
    if (!newMilestoneId) { toast.error('Le jalon est requis'); return; }
    if (!newAssigneeId) { toast.error('La personne assignée est requise'); return; }

    const country = countries.find(c => c.id === newCountryId);
    const assignee = members.find(m => m.user_id === newAssigneeId);
    createTask.mutate({
      title: newTitle.trim(),
      due_date: newDate,
      priority: newPriority,
      status: 'open',
      country_id: newCountryId,
      country_label: country ? `${country.flag} ${country.name}` : null,
      milestone_id: newMilestoneId,
      assigned_to: newAssigneeId,
      owner_name: assignee?.full_name ?? '',
      created_by: user?.id ?? null,
    }, {
      onSuccess: () => { toast.success('Tache creee'); setDialogOpen(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement...</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Calendrier</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Taches et echeances par date
            {canWrite && ' - Cliquez sur un jour pour ajouter une tache'}
          </p>
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          <button onClick={() => setViewType('month')} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${viewType === 'month' ? 'bg-card text-primary shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>Mois</button>
          <button onClick={() => setViewType('week')} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${viewType === 'week' ? 'bg-card text-primary shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>Semaine</button>
        </div>
      </div>

      {viewType === 'week' ? (() => {
        // Week view
        const startOfWeek = new Date(viewYear, viewMonth, now.getDate() - ((now.getDay() + 6) % 7));
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(d.getDate() + i);
          return d;
        });
        const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7h-18h

        return (
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-display text-lg font-semibold text-primary flex-1 text-center">
                Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </h3>
            </div>
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border">
              <div className="bg-card" />
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === now.toDateString();
                return (
                  <div key={i} className={`bg-card text-center py-2 ${isToday ? 'font-bold text-accent' : 'text-muted-foreground'}`}>
                    <div className="text-[10.5px] font-semibold">{days[i]}</div>
                    <div className="text-[13px]">{d.getDate()}</div>
                  </div>
                );
              })}
              {hours.map(h => (
                <>
                  <div key={`h-${h}`} className="bg-card text-[10px] text-muted-foreground text-right pr-2 py-3">{h}:00</div>
                  {weekDays.map((d, di) => {
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const dayTasks = tasks.filter(t => t.due_date === dateStr);
                    return (
                      <div
                        key={`${h}-${di}`}
                        onClick={() => canWrite && openCreateForDay(d.getDate())}
                        className={`bg-card border-t border-border min-h-[44px] p-0.5 ${canWrite ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                      >
                        {h === 9 && dayTasks.map((t, j) => {
                          const colorMap: Record<string, string> = { high: 'bg-destructive', med: 'bg-[hsl(var(--gold))]', low: 'bg-accent' };
                          return (
                            <div key={j} className={`text-[9px] font-medium text-white px-1 py-0.5 rounded mb-0.5 truncate ${colorMap[t.priority] || 'bg-accent'}`}>
                              {t.title.slice(0, 20)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        );
      })() : (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={goToPrev} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Mois precedent">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="font-display text-lg font-semibold text-primary flex-1 text-center capitalize">{monthName}</h3>
          <button onClick={goToNext} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Mois suivant">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          {!isCurrentMonth && (
            <button onClick={goToToday} className="text-[11px] font-medium text-accent hover:underline ml-1">Aujourd'hui</button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-[10.5px] font-semibold text-muted-foreground tracking-wide py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const isToday = isCurrentMonth && day === todayDate;
            return (
              <div
                key={i}
                onClick={() => day && canWrite && openCreateForDay(day)}
                onDragOver={e => { if (day && canWrite) { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-accent'); } }}
                onDragLeave={e => { e.currentTarget.classList.remove('ring-2', 'ring-accent'); }}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-accent'); if (day) handleDrop(day); }}
                className={`min-h-[80px] rounded-lg p-1.5 group relative transition-all ${
                  isToday ? 'bg-accent/10 border-[1.5px] border-accent' :
                  day ? 'bg-muted/30' : 'opacity-40 bg-muted/30'
                } ${day && canWrite ? 'cursor-pointer hover:bg-muted/60' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11.5px] font-semibold mb-1 ${isToday ? 'text-accent font-bold' : 'text-muted-foreground'}`}>
                        {day}
                      </span>
                      {canWrite && (
                        <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    {tasksByDay[day]?.map((ev, j) => (
                      <div
                        key={j}
                        draggable={canWrite}
                        onDragStart={e => { e.stopPropagation(); setDragTaskId(ev.id); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => setDragTaskId(null)}
                        className={`text-[10px] font-medium text-white px-1.5 py-0.5 rounded mb-0.5 truncate ${ev.color} ${canWrite ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        {ev.label}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 mt-4">Aucune tache avec echeance. Ajoutez des dates a vos taches pour les voir ici.</p>
        )}
      </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Nouvelle tache - {newDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Titre *</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                maxLength={200}
                className="mt-1"
                placeholder="Ex: Preparer contrat..."
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[12.5px]">Marche *</Label>
              <Select value={newCountryId || '_none'} onValueChange={v => handleCountryChange(v === '_none' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selectionner un marche" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Selectionner un marche</SelectItem>
                  {countries.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12.5px]">Jalon *</Label>
              <Select
                value={newMilestoneId || '_none'}
                onValueChange={v => setNewMilestoneId(v === '_none' ? '' : v)}
                disabled={!newCountryId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={!newCountryId ? "Choisir un marche d'abord" : 'Selectionner un jalon'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Selectionner un jalon</SelectItem>
                  {countryMilestones.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.icon} {m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12.5px]">Priorite</Label>
              <Select value={newPriority} onValueChange={v => setNewPriority(v as 'high' | 'med' | 'low')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="med">Moyenne</SelectItem>
                  <SelectItem value="low">Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createTask.isPending}>
                Creer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
