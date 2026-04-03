import { useMemo, useState } from 'react';
import { useTasks, useCountries, useMilestones } from '@/hooks/useExpansionData';
import { useCreateTask } from '@/hooks/useTaskMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
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
  const createTask = useCreateTask();
  const canWrite = CAN_WRITE.includes(myRole ?? '');

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
    const map: Record<number, { label: string; color: string }[]> = {};
    tasks.forEach(t => {
      if (!t.due_date) return;
      const parsed = new Date(t.due_date);
      if (isNaN(parsed.getTime())) return;
      if (parsed.getMonth() !== viewMonth || parsed.getFullYear() !== viewYear) return;
      const day = parsed.getDate();
      if (!map[day]) map[day] = [];
      const colorMap: Record<string, string> = { high: 'bg-destructive', med: 'bg-[hsl(var(--gold))]', low: 'bg-accent' };
      map[day].push({
        label: `${t.country_label ? t.country_label.split(' ')[0] + ' ' : ''}${t.title.slice(0, 25)}`,
        color: colorMap[t.priority] || 'bg-accent',
      });
    });
    return map;
  }, [tasks, viewMonth, viewYear]);

  const openCreateForDay = (day: number) => {
    if (!canWrite) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setNewDate(dateStr);
    setNewTitle('');
    setNewCountryId('');
    setNewMilestoneId('');
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

    const country = countries.find(c => c.id === newCountryId);
    createTask.mutate({
      title: newTitle.trim(),
      due_date: newDate,
      priority: newPriority,
      status: 'open',
      country_id: newCountryId,
      country_label: country ? `${country.flag} ${country.name}` : null,
      milestone_id: newMilestoneId,
      created_by: user?.id ?? null,
    }, {
      onSuccess: () => { toast.success('Tache creee'); setDialogOpen(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement...</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Calendrier</h2>
        <p className="text-[12.5px] text-muted-foreground">
          Taches et echeances par date
          {canWrite && ' - Cliquez sur un jour pour ajouter une tache'}
        </p>
      </div>

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
                className={`min-h-[80px] rounded-lg p-1.5 group relative ${
                  isToday ? 'bg-accent/10 border-[1.5px] border-accent' :
                  day ? 'bg-muted/30' : 'opacity-40 bg-muted/30'
                } ${day && canWrite ? 'cursor-pointer hover:bg-muted/60 transition-colors' : ''}`}
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
                      <div key={j} className={`text-[10px] font-medium text-white px-1.5 py-0.5 rounded mb-0.5 truncate ${ev.color}`}>
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
