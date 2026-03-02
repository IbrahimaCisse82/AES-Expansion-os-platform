import { useState, useEffect } from 'react';
import { useRisks, useCountries } from '@/hooks/useExpansionData';
import { useCreateRisk, useUpdateRisk, useDeleteRisk } from '@/hooks/useRiskMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';

const levelConfig: Record<string, { bg: string; text: string; bar: string; label: string }> = {
  high: { bg: 'bg-destructive/10', text: 'text-destructive', bar: 'bg-destructive', label: 'Élevé' },
  medium: { bg: 'bg-[hsl(var(--gold))]/10', text: 'text-[hsl(var(--gold))]', bar: 'bg-[hsl(var(--gold))]', label: 'Moyen' },
  low: { bg: 'bg-accent/10', text: 'text-accent', bar: 'bg-accent', label: 'Faible' },
};

const riskSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(200),
  description: z.string().max(1000).optional(),
  mitigation: z.string().max(1000).optional(),
  level: z.enum(['high', 'medium', 'low']),
  category: z.string().max(100).optional(),
  country_id: z.string().optional(),
  country_label: z.string().optional(),
});

type RiskForm = z.infer<typeof riskSchema>;

const EMPTY_FORM: RiskForm = {
  title: '', description: '', mitigation: '', level: 'medium', category: '', country_id: '', country_label: '',
};

const CAN_WRITE = ['admin', 'director', 'country_manager'];

export default function RisksPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { data: myRole } = useCurrentUserRole();
  const { data: risks = [], isLoading } = useRisks();
  const { data: countries = [] } = useCountries();
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();

  const canWrite = CAN_WRITE.includes(myRole ?? '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RiskForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite) openCreate();
  }, [addSignal]);

  const searchedRisks = searchQuery ? risks.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.country_label?.toLowerCase().includes(searchQuery.toLowerCase()) || r.category?.toLowerCase().includes(searchQuery.toLowerCase())) : risks;
  const highCount = searchedRisks.filter(r => r.level === 'high').length;
  const medCount = searchedRisks.filter(r => r.level === 'medium').length;
  const lowCount = searchedRisks.filter(r => r.level === 'low').length;

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setDialogOpen(true); };

  const openEdit = (r: typeof risks[0]) => {
    setForm({
      title: r.title, description: r.description ?? '', mitigation: r.mitigation ?? '',
      level: r.level, category: r.category ?? '', country_id: r.country_id ?? '', country_label: r.country_label ?? '',
    });
    setEditingId(r.id);
    setErrors({});
    setDialogOpen(true);
  };

  const handleCountryChange = (cid: string) => {
    const c = countries.find(x => x.id === cid);
    setForm(p => ({ ...p, country_id: cid, country_label: c ? `${c.flag} ${c.name}` : '' }));
  };

  const handleSubmit = () => {
    const result = riskSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(e => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const payload = {
      title: result.data.title,
      level: result.data.level,
      description: result.data.description || null,
      mitigation: result.data.mitigation || null,
      category: result.data.category || null,
      country_id: result.data.country_id || null,
      country_label: result.data.country_label || null,
    };
    if (editingId) {
      updateRisk.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { toast.success('Risque modifié'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    } else {
      createRisk.mutate(payload, {
        onSuccess: () => { toast.success('Risque créé'); setDialogOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRisk.mutate(deleteId, {
      onSuccess: () => { toast.success('Risque supprimé'); setDeleteId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Registre des Risques</h2>
          <p className="text-[12.5px] text-muted-foreground">Suivi et priorisation des risques par marché</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Nouveau risque
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Risques Actifs</h3>
          {searchedRisks.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucun risque enregistré</div>}
          {searchedRisks.map(r => {
            const cfg = levelConfig[r.level] || levelConfig.medium;
            return (
              <div key={r.id} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0 group">
                <div className={`w-[5px] h-[34px] rounded-sm flex-shrink-0 ${cfg.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{r.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{r.country_label} · {r.category}</div>
                  {r.description && <div className="text-[11px] text-muted-foreground mt-0.5">{r.description}</div>}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                {canWrite && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Matrice Impact / Probabilité</h3>
          <div className="space-y-1.5">
            {['ÉLEVÉ', 'MOYEN', 'FAIBLE'].map((level, row) => (
              <div key={level} className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5 items-center">
                <div className="text-[9.5px] font-bold text-muted-foreground text-right pr-1.5">{level}</div>
                {[0, 1, 2].map(col => {
                  const bgColor = row === 0 ? 'bg-destructive/10' : row === 1 ? (col === 0 ? 'bg-accent/10' : 'bg-[hsl(var(--gold))]/10') : 'bg-accent/10';
                  const showVal = (row === 0 && col === 0) ? highCount : (row === 1 && col === 1) ? medCount : (row === 2 && col === 0) ? lowCount : 0;
                  const textCol = row === 0 ? 'text-destructive' : row === 1 ? 'text-[hsl(var(--gold))]' : 'text-accent';
                  return (
                    <div key={col} className={`h-[60px] ${bgColor} rounded-md flex items-center justify-center`}>
                      {showVal > 0 && <span className={`text-[11px] font-bold ${textCol}`}>{showVal}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5 mt-1">
              <div />{['FAIBLE', 'MOYEN', 'ÉLEVÉ'].map(l => <div key={l} className="text-[9.5px] font-bold text-muted-foreground text-center">{l}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier le risque' : 'Nouveau risque'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={200} className="mt-1" />
              {errors.title && <p className="text-destructive text-[11px] mt-1">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Niveau</Label>
                <Select value={form.level} onValueChange={v => setForm(p => ({ ...p, level: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div>
              <Label className="text-[12.5px]">Catégorie</Label>
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} maxLength={100} placeholder="Réglementaire, Opérationnel…" className="mt-1" />
            </div>
            <div>
              <Label className="text-[12.5px]">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={1000} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-[12.5px]">Mitigation</Label>
              <Textarea value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))} maxLength={1000} rows={2} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createRisk.isPending || updateRisk.isPending}>
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
            <AlertDialogTitle>Supprimer ce risque ?</AlertDialogTitle>
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
