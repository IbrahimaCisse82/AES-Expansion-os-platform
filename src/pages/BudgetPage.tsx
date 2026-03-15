import { useState, useEffect } from 'react';
import KpiCard from '@/components/KpiCard';
import { useBudgetEntries, useCountries } from '@/hooks/useExpansionData';
import { useCreateBudgetEntry, useUpdateBudgetEntry, useDeleteBudgetEntry } from '@/hooks/useBudgetMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';

const budgetColors: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]' };
const textColors: Record<string, string> = { sage: 'text-accent', sky: 'text-[hsl(var(--sky))]', gold: 'text-[hsl(var(--gold))]', terracotta: 'text-destructive', plum: 'text-[hsl(var(--plum))]' };

const COLOR_OPTIONS = [
  { value: 'sage', label: 'Vert' },
  { value: 'sky', label: 'Bleu' },
  { value: 'gold', label: 'Or' },
  { value: 'terracotta', label: 'Orange' },
  { value: 'plum', label: 'Violet' },
];

const budgetSchema = z.object({
  country_label: z.string().max(100).optional(),
  country_id: z.string().optional(),
  category: z.string().max(100).optional(),
  allocated_k: z.number().min(0, 'Doit être ≥ 0'),
  spent_k: z.number().min(0, 'Doit être ≥ 0'),
  color: z.string().optional(),
  fiscal_year: z.number().min(2020).max(2100),
});

type BudgetForm = z.infer<typeof budgetSchema>;

const currentYear = new Date().getFullYear();

const EMPTY_FORM: BudgetForm = {
  country_label: '', country_id: '', category: 'market', allocated_k: 0, spent_k: 0, color: 'sage', fiscal_year: currentYear,
};

const CAN_WRITE = ['admin', 'director', 'analyst'];

export default function BudgetPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { data: myRole } = useCurrentUserRole();
  const { data: entries = [], isLoading } = useBudgetEntries();
  const { data: countries = [] } = useCountries();
  const createEntry = useCreateBudgetEntry();
  const updateEntry = useUpdateBudgetEntry();
  const deleteEntry = useDeleteBudgetEntry();

  const canWrite = CAN_WRITE.includes(myRole ?? '');
  const canDelete = ['admin', 'director'].includes(myRole ?? '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite) openCreate();
  }, [addSignal]);

  const searched = searchQuery ? entries.filter(e => e.country_label?.toLowerCase().includes(searchQuery.toLowerCase()) || e.category?.toLowerCase().includes(searchQuery.toLowerCase())) : entries;
  const byMarket = searched.filter(e => e.category === 'market');
  const byCategory = searched.filter(e => e.category !== 'market');
  const totalAllocated = byMarket.reduce((s, b) => s + b.allocated_k, 0);
  const totalSpent = byMarket.reduce((s, b) => s + b.spent_k, 0);
  const remaining = totalAllocated - totalSpent;

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setDialogOpen(true); };

  const openEdit = (b: typeof entries[0]) => {
    setForm({
      country_label: b.country_label ?? '', country_id: b.country_id ?? '', category: b.category ?? 'market',
      allocated_k: b.allocated_k, spent_k: b.spent_k, color: b.color ?? 'sage', fiscal_year: b.fiscal_year,
    });
    setEditingId(b.id);
    setErrors({});
    setDialogOpen(true);
  };

  const handleCountryChange = (cid: string) => {
    const c = countries.find(x => x.id === cid);
    setForm(p => ({ ...p, country_id: cid, country_label: c ? `${c.flag} ${c.name}` : '' }));
  };

  const handleSubmit = () => {
    const result = budgetSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(e => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const payload = {
      allocated_k: result.data.allocated_k,
      spent_k: result.data.spent_k,
      fiscal_year: result.data.fiscal_year,
      color: result.data.color || 'sage',
      category: result.data.category || null,
      country_id: result.data.country_id || null,
      country_label: result.data.country_label || null,
    };
    if (editingId) {
      updateEntry.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { toast.success('Entrée modifiée'); setDialogOpen(false); },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      createEntry.mutate(payload, {
        onSuccess: () => { toast.success('Entrée créée'); setDialogOpen(false); },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteEntry.mutate(deleteId, {
      onSuccess: () => { toast.success('Entrée supprimée'); setDeleteId(null); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const renderEntryRow = (b: typeof entries[0]) => {
    const pct = b.allocated_k > 0 ? Math.round(b.spent_k / b.allocated_k * 100) : 0;
    return (
      <div key={b.id} className="py-3 border-b border-border last:border-b-0 group">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[13px] font-medium">{b.category === 'market' ? b.country_label : b.category}</span>
          <div className="flex items-center gap-2">
            <span className={`text-[11.5px] font-semibold ${textColors[b.color || 'sage']}`}>
              {b.spent_k}K / {b.allocated_k}K FCFA · {pct}%
            </span>
            {canWrite && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(b)} className="p-1 rounded hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                {canDelete && <button onClick={() => setDeleteId(b.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>}
              </div>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${budgetColors[b.color || 'sage']}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="animate-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Budget & Finances</h2>
          <p className="text-[12.5px] text-muted-foreground">Allocation et consommation · Exercice {currentYear}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Nouvelle entrée
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <KpiCard label="Budget Total" value={`${(totalAllocated / 1000).toFixed(1)}M FCFA`} meta="Approuvé CA" accentColor="sage" />
        <KpiCard label="Dépensé" value={`${(totalSpent / 1000).toFixed(1)}M FCFA`} meta="du budget" accentColor="gold" trend={{ value: totalAllocated > 0 ? `${Math.round(totalSpent / totalAllocated * 100)}%` : '0%', up: false }} />
        <KpiCard label="Restant" value={`${(remaining / 1000).toFixed(1)}M FCFA`} meta="disponible" accentColor="sky" trend={{ value: totalAllocated > 0 ? `${Math.round(remaining / totalAllocated * 100)}%` : '0%', up: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Par Marché</h3>
          {byMarket.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucune entrée</div>}
          {byMarket.map(renderEntryRow)}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Par Catégorie</h3>
          {byCategory.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucune entrée</div>}
          {byCategory.map(renderEntryRow)}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier l\'entrée' : 'Nouvelle entrée budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Type</Label>
                <Select value={form.category === 'market' ? 'market' : 'category'} onValueChange={v => setForm(p => ({ ...p, category: v === 'market' ? 'market' : '' }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Par marché</SelectItem>
                    <SelectItem value="category">Par catégorie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.category === 'market' ? (
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
              ) : (
                <div>
                  <Label className="text-[12.5px]">Catégorie</Label>
                  <Input value={form.category ?? ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} maxLength={100} placeholder="RH, Legal…" className="mt-1" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Alloué (K FCFA) *</Label>
                <Input type="number" min={0} value={form.allocated_k} onChange={e => setForm(p => ({ ...p, allocated_k: Number(e.target.value) }))} className="mt-1" />
                {errors.allocated_k && <p className="text-destructive text-[11px] mt-1">{errors.allocated_k}</p>}
              </div>
              <div>
                <Label className="text-[12.5px]">Dépensé (K€) *</Label>
                <Input type="number" min={0} value={form.spent_k} onChange={e => setForm(p => ({ ...p, spent_k: Number(e.target.value) }))} className="mt-1" />
                {errors.spent_k && <p className="text-destructive text-[11px] mt-1">{errors.spent_k}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Couleur</Label>
                <Select value={form.color} onValueChange={v => setForm(p => ({ ...p, color: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Exercice</Label>
                <Input type="number" min={2020} max={2100} value={form.fiscal_year} onChange={e => setForm(p => ({ ...p, fiscal_year: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createEntry.isPending || updateEntry.isPending}>
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
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
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
