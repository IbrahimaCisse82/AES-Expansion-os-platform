import { useState } from 'react';
import { BudgetScenario, useCreateScenario, useUpdateScenario, useDeleteScenario, useDuplicateScenario, useAdjustScenarioPercent } from '@/hooks/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Copy, Trash2, Lock, Unlock, Send, CheckCircle2, Percent } from 'lucide-react';

interface ScenarioManagerProps {
  scenarios: BudgetScenario[];
  activeScenarioId: string | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  fiscalYear: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  draft: { label: 'Brouillon', icon: <Unlock size={12} />, color: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Soumis', icon: <Send size={12} />, color: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]' },
  approved: { label: 'Approuvé', icon: <CheckCircle2 size={12} />, color: 'bg-accent/15 text-accent' },
  locked: { label: 'Verrouillé', icon: <Lock size={12} />, color: 'bg-destructive/15 text-destructive' },
};

export default function ScenarioManager({ scenarios, activeScenarioId, onSelect, canWrite, fiscalYear }: ScenarioManagerProps) {
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario();
  const deleteScenario = useDeleteScenario();
  const duplicateScenario = useDuplicateScenario();
  const adjustPercent = useAdjustScenarioPercent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustLineType, setAdjustLineType] = useState<string>('budget');
  const [adjustCatType, setAdjustCatType] = useState<string>('all');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Le nom est requis'); return; }

    if (duplicateSource) {
      duplicateScenario.mutate(
        { sourceId: duplicateSource, name: name.trim(), description, fiscalYear },
        {
          onSuccess: (data) => { toast.success('Scénario dupliqué avec toutes ses lignes'); setDialogOpen(false); setDuplicateSource(null); onSelect(data.id); },
          onError: (err: Error) => toast.error(err.message),
        }
      );
    } else {
      createScenario.mutate(
        { name: name.trim(), description, fiscal_year: fiscalYear, is_baseline: scenarios.length === 0 },
        {
          onSuccess: (data) => { toast.success('Scénario créé'); setDialogOpen(false); onSelect(data.id); },
          onError: (err: Error) => toast.error(err.message),
        }
      );
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateScenario.mutate(
      { id, status: status as BudgetScenario['status'] },
      {
        onSuccess: () => toast.success('Statut mis à jour'),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {scenarios.map(s => {
          const cfg = STATUS_CONFIG[s.status];
          const isActive = s.id === activeScenarioId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                isActive
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="font-semibold">{s.name}</span>
              {s.is_baseline && <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">BASE</span>}
              <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
              {canWrite && isActive && s.status !== 'locked' && (
                <Select value={s.status} onValueChange={v => handleStatusChange(s.id, v)}>
                  <SelectTrigger className="h-5 w-5 p-0 border-0 bg-transparent [&>svg]:hidden">
                    <span className="sr-only">Statut</span>
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-muted-foreground"><path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="submitted">Soumis</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="locked">Verrouillé</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {canWrite && isActive && (
                <button onClick={(e) => {
                  e.stopPropagation();
                  setDuplicateSource(s.id);
                  setName(`${s.name} (copie)`);
                  setDescription(s.description || '');
                  setDialogOpen(true);
                }} className="p-0.5 hover:bg-primary/10 rounded" title="Dupliquer">
                  <Copy size={10} className="text-primary" />
                </button>
              )}
              {canWrite && isActive && (
                <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }} className="p-0.5 hover:bg-destructive/10 rounded">
                  <Trash2 size={10} className="text-destructive" />
                </button>
              )}
            </button>
          );
        })}

        {canWrite && (
          <button
            onClick={() => { setName(''); setDescription(''); setDuplicateSource(null); setDialogOpen(true); }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Plus size={14} /> Scénario
          </button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{duplicateSource ? '📋 Dupliquer le scénario' : 'Nouveau scénario'}</DialogTitle>
          </DialogHeader>
          {duplicateSource && (
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Toutes les lignes budgétaires du scénario source seront copiées dans le nouveau scénario.
            </p>
          )}
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={60} className="mt-1" placeholder="Ex: Budget Base 2025" />
            </div>
            <div>
              <Label className="text-[12.5px]">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={200} className="mt-1" placeholder="Scénario réaliste…" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setDuplicateSource(null); }}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createScenario.isPending || duplicateScenario.isPending}>
                {duplicateSource ? 'Dupliquer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce scénario ?</AlertDialogTitle>
            <AlertDialogDescription>Toutes les lignes budgétaires de ce scénario seront supprimées définitivement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteScenario.mutate(deleteId, {
                  onSuccess: () => { toast.success('Scénario supprimé'); setDeleteId(null); },
                  onError: (err: Error) => toast.error(err.message),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
