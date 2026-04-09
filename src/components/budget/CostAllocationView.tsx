import { useState } from 'react';
import { useCostAllocations, useCreateCostAllocation, useDeleteCostAllocation } from '@/hooks/useBudgetConsolidation';
import { BudgetCategory } from '@/hooks/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface CostAllocationViewProps {
  scenarioId: string;
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
}

const ALLOCATION_KEYS: Record<string, string> = {
  equal: 'Répartition égale',
  revenue_weighted: 'Pondérée par chiffre d\'affaires',
  headcount_weighted: 'Pondérée par effectifs',
  custom: 'Personnalisée',
};

export default function CostAllocationView({ scenarioId, categories, countries, canWrite }: CostAllocationViewProps) {
  const { data: allocations = [] } = useCostAllocations(scenarioId);
  const createAlloc = useCreateCostAllocation();
  const deleteAlloc = useDeleteCostAllocation();
  const [addOpen, setAddOpen] = useState(false);

  const [allocName, setAllocName] = useState('');
  const [catId, setCatId] = useState('');
  const [allocKey, setAllocKey] = useState('equal');
  const [totalAmount, setTotalAmount] = useState('');
  const [weights, setWeights] = useState<Record<string, number>>({});

  const handleCreate = () => {
    if (!allocName.trim() || !catId || !totalAmount) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    const rules = countries.map(c => ({
      country_id: c.id,
      weight: weights[c.id] ?? (allocKey === 'equal' ? 1 : 0),
    })).filter(r => r.weight > 0);

    createAlloc.mutate({
      scenario_id: scenarioId,
      name: allocName.trim(),
      source_category_id: catId,
      allocation_key: allocKey,
      allocation_rules: rules,
      total_amount: Number(totalAmount),
    }, {
      onSuccess: () => { toast.success('Règle d\'allocation créée'); setAddOpen(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
            <Share2 size={16} /> Allocations de coûts
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Répartir les charges centrales de la Holding vers les filiales par pays
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => { setAllocName(''); setCatId(''); setAllocKey('equal'); setTotalAmount(''); setWeights({}); setAddOpen(true); }} className="gap-1.5 text-[12px]">
            <Plus size={14} /> Règle
          </Button>
        )}
      </div>

      {allocations.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-[12px] text-muted-foreground">Aucune règle d'allocation. Créez des clés de répartition pour distribuer les charges centrales.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allocations.map(alloc => {
            const rules = Array.isArray(alloc.allocation_rules) ? alloc.allocation_rules : [];
            const totalWeight = rules.reduce((s: number, r: { weight: number }) => s + r.weight, 0);
            return (
              <div key={alloc.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[12px] font-semibold">{alloc.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Catégorie : {getCategoryName(alloc.source_category_id)} · Clé : {ALLOCATION_KEYS[alloc.allocation_key] || alloc.allocation_key} · Montant : {Math.round(alloc.total_amount)}K FCFA
                    </div>
                  </div>
                  {canWrite && (
                    <button onClick={() => deleteAlloc.mutate({ id: alloc.id, scenarioId })} className="p-1 rounded hover:bg-destructive/10">
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {rules.map((r: { country_id: string; weight: number }) => {
                    const country = countries.find(c => c.id === r.country_id);
                    const pct = totalWeight > 0 ? (r.weight / totalWeight * 100).toFixed(1) : '0';
                    const amount = totalWeight > 0 ? Math.round(alloc.total_amount * r.weight / totalWeight) : 0;
                    return (
                      <div key={r.country_id} className="bg-muted/50 rounded-md px-2 py-1 text-[10px]">
                        <span className="font-semibold">{country?.flag} {country?.name || r.country_id}</span>
                        <span className="text-muted-foreground ml-1">({pct}% · {amount}K)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">📊 Nouvelle règle d'allocation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-[12px]">Nom *</Label>
              <Input value={allocName} onChange={e => setAllocName(e.target.value)} className="mt-1" placeholder="Ex: Frais siège social" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Catégorie de charge *</Label>
                <Select value={catId} onValueChange={setCatId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'expense').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Montant total (K FCFA) *</Label>
                <Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-[12px]">Clé de répartition</Label>
              <Select value={allocKey} onValueChange={setAllocKey}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ALLOCATION_KEYS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {allocKey === 'custom' && (
              <div>
                <Label className="text-[12px]">Poids par pays</Label>
                <div className="grid grid-cols-2 gap-2 mt-1 max-h-[150px] overflow-y-auto">
                  {countries.map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="text-[10px] min-w-[80px]">{c.flag} {c.name}</span>
                      <Input
                        type="number"
                        value={weights[c.id] || ''}
                        onChange={e => setWeights(prev => ({ ...prev, [c.id]: Number(e.target.value) || 0 }))}
                        className="h-7 text-[10px] w-20"
                        placeholder="Poids"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createAlloc.isPending}>Créer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
