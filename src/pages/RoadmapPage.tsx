import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoadmapBars, useCountries } from '@/hooks/useExpansionData';
import { useCreateRoadmapBar, useUpdateRoadmapBar, useDeleteRoadmapBar } from '@/hooks/useRoadmapMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import GanttChart from '@/components/GanttChart';
import { z } from 'zod';

const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const currentYear = new Date().getFullYear();
function useRoadmapTypes() {
  return useQuery({
    queryKey: ['roadmap_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as { id: string; label: string; color: string; sort_order: number }[];
    },
  });
}
const colorMap: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]' };
const currentMonth = new Date().getMonth() + 1; // 1-indexed to match start_month/end_month

const barSchema = z.object({
  country_id: z.string().min(1, 'Pays requis'),
  label: z.string().trim().min(1, 'Libellé requis').max(100),
  start_month: z.number().min(1).max(12),
  end_month: z.number().min(1).max(12),
  color: z.string().min(1),
}).refine(d => d.end_month > d.start_month, { message: 'Le mois de fin doit être après le début', path: ['end_month'] });

type BarForm = z.infer<typeof barSchema>;

const EMPTY_FORM: BarForm = { country_id: '', label: '', start_month: 1, end_month: 3, color: 'sage' };
const CAN_WRITE = ['admin', 'director', 'country_manager'];

export default function RoadmapPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { data: myRole } = useCurrentUserRole();
  const { data: bars = [], isLoading } = useRoadmapBars();
  const { data: countries = [] } = useCountries();
  const { data: roadmapTypes = [] } = useRoadmapTypes();
  const createBar = useCreateRoadmapBar();
  const updateBar = useUpdateRoadmapBar();
  const deleteBar = useDeleteRoadmapBar();

  const canWrite = CAN_WRITE.includes(myRole ?? '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BarForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite) openCreate();
  }, [addSignal]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setDialogOpen(true); };

  const openEdit = (bar: typeof bars[0]) => {
    setForm({ country_id: bar.country_id, label: bar.label, start_month: bar.start_month, end_month: bar.end_month, color: bar.color });
    setEditingId(bar.id);
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const result = barSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(e => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const payload = {
      country_id: result.data.country_id,
      label: result.data.label,
      start_month: result.data.start_month,
      end_month: result.data.end_month,
      color: result.data.color,
    };
    if (editingId) {
      updateBar.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { toast.success('Barre modifiée'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    } else {
      createBar.mutate(payload, {
        onSuccess: () => { toast.success('Barre créée'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteBar.mutate(deleteId, {
      onSuccess: () => { toast.success('Barre supprimée'); setDeleteId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const searchedBars = searchQuery ? bars.filter(b => {
    const c = countries.find(x => x.id === b.country_id);
    return b.label.toLowerCase().includes(searchQuery.toLowerCase()) || c?.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) : bars;
  const countryIds = [...new Set(searchedBars.map(b => b.country_id))];
  const rows = countryIds.map(cid => {
    const c = countries.find(x => x.id === cid);
    return { flag: c?.flag || '', name: c?.name || cid, bars: searchedBars.filter(b => b.country_id === cid) };
  });

  return (
    <div className="animate-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Feuille de Route</h2>
          <p className="text-[12.5px] text-muted-foreground">Timeline interactive des marchés · {currentYear}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Nouvelle barre
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-5 overflow-x-auto">
        <div className="grid grid-cols-[165px_repeat(12,1fr)] mb-1.5 min-w-[900px]">
          <div className="text-[10px] font-semibold text-muted-foreground">Marché</div>
          {months.map((m, i) => (
            <div key={m} className={`text-[10px] font-semibold text-center py-1 ${i + 1 === currentMonth ? 'text-terracotta' : 'text-muted-foreground'}`}>{m}</div>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-[165px_repeat(12,1fr)] items-center mb-1 min-w-[900px]">
            <div className="text-[12.5px] font-medium flex items-center gap-2">
              <span className="text-lg">{row.flag}</span>{row.name}
            </div>
            {Array.from({ length: 12 }, (_, ci) => {
              const monthIdx = ci + 1;
              const bar = row.bars.find(b => b.start_month === monthIdx);
              const isToday = monthIdx === currentMonth;
              return (
              <div key={ci} className="h-9 border-l border-border relative">
                  {isToday && <div className="absolute w-0.5 bg-destructive top-0 bottom-0 z-10 left-1/2 -translate-x-1/2" />}
                  {bar && (
                    <div
                      className={`absolute h-6 top-1.5 ${colorMap[bar.color] || 'bg-sage'} rounded-md flex items-center px-2 text-[10px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:brightness-110 transition-all z-[1] group`}
                      style={{ left: '2px', width: `calc(${bar.end_month - bar.start_month} * 100% - 4px)` }}
                      onClick={() => canWrite && openEdit(bar)}
                    >
                      {bar.label}
                      {canWrite && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(bar.id); }}
                          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex gap-4 mt-4 pt-3 border-t border-ivory">
          {roadmapTypes.map(l => (
            <div key={l.id} className="flex items-center gap-1.5 text-[12px]">
              <div className={`w-2.5 h-2.5 rounded-full ${colorMap[l.color] || 'bg-sage'}`} /><span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="mt-6">
        <GanttChart />
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier la barre' : 'Nouvelle barre'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Libellé *</Label>
              <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} maxLength={100} className="mt-1" />
              {errors.label && <p className="text-destructive text-[11px] mt-1">{errors.label}</p>}
            </div>
            <div>
              <Label className="text-[12.5px]">Pays *</Label>
              <Select value={form.country_id || '_none'} onValueChange={v => setForm(p => ({ ...p, country_id: v === '_none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sélectionner</SelectItem>
                  {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.country_id && <p className="text-destructive text-[11px] mt-1">{errors.country_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Mois début</Label>
                <Select value={String(form.start_month)} onValueChange={v => setForm(p => ({ ...p, start_month: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Mois fin</Label>
                <Select value={String(form.end_month)} onValueChange={v => setForm(p => ({ ...p, end_month: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                {errors.end_month && <p className="text-destructive text-[11px] mt-1">{errors.end_month}</p>}
              </div>
            </div>
            <div>
              <Label className="text-[12.5px]">Type / Couleur</Label>
              <Select value={form.color} onValueChange={v => setForm(p => ({ ...p, color: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roadmapTypes.map(c => <SelectItem key={c.color} value={c.color}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createBar.isPending || updateBar.isPending}>
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
            <AlertDialogTitle>Supprimer cette barre ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
