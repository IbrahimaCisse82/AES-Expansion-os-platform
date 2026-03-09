import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import { useCountries } from '@/hooks/useExpansionData';
import { useCreateCountry, useUpdateCountry, useDeleteCountry } from '@/hooks/useCountryMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { COUNTRY_LIST } from '@/data/countryList';

const phaseNames = [
  'Phase 0 — Prospection', 'Phase 1 — Étude & Légal', 'Phase 2 — Mise en place',
  'Phase 3 — Lancement', 'Phase 4 — Opérationnel',
];

const countrySchema = z.object({
  id: z.string().trim().min(1, 'Pays requis').max(10),
  name: z.string().trim().min(1, 'Nom requis').max(100),
  flag: z.string().min(1, 'Drapeau requis').max(10),
  region: z.string().min(1, 'Région requise').max(100),
  color: z.string().min(1).max(20),
  status: z.enum(['active', 'planning', 'done', 'paused']),
});

type CountryForm = z.infer<typeof countrySchema>;
const EMPTY_FORM: CountryForm = { id: '', name: '', flag: '🏳️', region: '', color: 'sage', status: 'planning' };
const CAN_WRITE = ['admin', 'director'];

interface CountriesPageProps {
  onSelectCountry: (id: string) => void;
  addSignal?: number;
}

export default function CountriesPage({ onSelectCountry, addSignal }: CountriesPageProps) {
  const { data: countries = [], isLoading } = useCountries();
  const { data: myRole } = useCurrentUserRole();
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();

  const existingIds = countries.map(c => c.id);
  const availableCountries = COUNTRY_LIST.filter(c => !existingIds.includes(c.code));
  const canWrite = CAN_WRITE.includes(myRole ?? '');
  const colorMap: Record<string, string> = { sage: 'bg-accent', sky: 'bg-[hsl(var(--sky))]', gold: 'bg-[hsl(var(--gold))]', terracotta: 'bg-destructive', plum: 'bg-[hsl(var(--plum))]' };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CountryForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite) {
      openCreate();
    }
  }, [addSignal]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setDialogOpen(true); };

  const openEdit = (c: typeof countries[0]) => {
    setForm({ id: c.id, name: c.name, flag: c.flag, region: c.region, color: c.color, status: c.status });
    setEditingId(c.id);
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const result = countrySchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(e => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    if (editingId) {
      const { id, ...updates } = result.data;
      updateCountry.mutate({ id: editingId, ...updates }, {
        onSuccess: () => { toast.success('Pays modifié'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    } else {
      createCountry.mutate(result.data as any, {
        onSuccess: () => { toast.success('Pays créé'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteCountry.mutate(deleteId, {
      onSuccess: () => { toast.success('Pays supprimé'); setDeleteId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Pays Cibles</h2>
          <p className="text-[12.5px] text-muted-foreground">Vue d'ensemble des marchés · {countries.length} pays ciblés</p>
        </div>
        {canWrite && availableCountries.length > 0 && (
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Nouveau pays
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {countries.map(c => {
          const riskColor = c.risk_count > 1 ? 'text-terracotta' : c.risk_count === 1 ? 'text-gold' : 'text-sage';
          return (
            <div key={c.id} className="bg-card border border-border rounded-lg p-5 cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:shadow-card-hover relative group">
              <div onClick={() => onSelectCountry(c.id)} className="flex items-center gap-3 mb-3.5">
                <span className="text-[38px] leading-none">{c.flag}</span>
                <div className="flex-1">
                  <div className="font-display text-[17px] font-bold text-primary">{c.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">{c.region}</div>
                </div>
                <StatusPill status={c.status as any} />
              </div>
              <div onClick={() => onSelectCountry(c.id)}>
                <div className="text-[12.5px] font-medium mb-2">{phaseNames[c.phase] || `Phase ${c.phase}`}</div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full ${colorMap[c.color] || 'bg-accent'}`} style={{ width: `${c.pct}%` }} />
                </div>
                <div className="flex justify-between text-[11.5px] text-muted-foreground mb-3.5">
                  <span>Avancement</span><span className="font-semibold">{c.pct}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 border-t border-border pt-3 text-center">
                  <div><div className="font-display text-sm font-bold text-primary">{c.budget}</div><div className="text-[9.5px] text-muted-foreground mt-0.5">Budget</div></div>
                  <div><div className="font-display text-sm font-bold text-primary">{c.team_size}</div><div className="text-[9.5px] text-muted-foreground mt-0.5">Équipe</div></div>
                  <div><div className={`font-display text-sm font-bold ${riskColor}`}>{c.risk_count}</div><div className="text-[9.5px] text-muted-foreground mt-0.5">Risques</div></div>
                </div>
              </div>
              {canWrite && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }} className="p-1.5 rounded-lg bg-card border border-border hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              )}
              <div onClick={() => onSelectCountry(c.id)} className="text-center mt-3 text-[12px] text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">Voir la fiche détaillée →</div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier le pays' : 'Nouveau pays'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!editingId ? (
              <div>
                <Label className="text-[12.5px]">Pays *</Label>
                <Select value={form.id || '_none'} onValueChange={v => {
                  if (v === '_none') { setForm(EMPTY_FORM); return; }
                  const entry = COUNTRY_LIST.find(c => c.code === v);
                  if (entry) setForm(prev => ({ ...prev, id: entry.code, name: entry.name, flag: entry.flag, region: entry.region }));
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="_none">Sélectionner un pays</SelectItem>
                    {availableCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} — {c.region}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.id && <p className="text-destructive text-[11px] mt-1">{errors.id}</p>}
                {form.id && (
                  <div className="mt-2 p-2.5 bg-secondary rounded-lg text-[12px] flex items-center gap-2">
                    <span className="text-[24px]">{form.flag}</span>
                    <div>
                      <div className="font-medium text-foreground">{form.name}</div>
                      <div className="text-muted-foreground">Code ISO : {form.id.toUpperCase()} · {form.region}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-secondary rounded-lg text-[12px] flex items-center gap-2">
                <span className="text-[24px]">{form.flag}</span>
                <div>
                  <div className="font-medium text-foreground">{form.name}</div>
                  <div className="text-muted-foreground">Code ISO : {form.id.toUpperCase()} · {form.region}</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Couleur</Label>
                <Select value={form.color} onValueChange={v => setForm(p => ({ ...p, color: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['sage', 'sky', 'gold', 'terracotta', 'plum'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="done">Terminé</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createCountry.isPending || updateCountry.isPending}>
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
            <AlertDialogTitle>Supprimer ce pays ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprimera aussi les jalons, tâches et données liées à ce pays.</AlertDialogDescription>
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
