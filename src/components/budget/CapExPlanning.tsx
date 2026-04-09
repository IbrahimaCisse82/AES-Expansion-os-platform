import { useState, useMemo } from 'react';
import { useCapExItems, useCreateCapExItem, useDeleteCapExItem, calculateMonthlyDepreciation } from '@/hooks/useBudgetConsolidation';
import { BudgetCategory, MONTHS } from '@/hooks/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface CapExPlanningProps {
  scenarioId: string;
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
}

function formatK(val: number): string {
  if (val === 0) return '-';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}M`;
  return `${Math.round(val)}K`;
}

export default function CapExPlanning({ scenarioId, categories, countries, canWrite }: CapExPlanningProps) {
  const { data: items = [] } = useCapExItems(scenarioId);
  const createItem = useCreateCapExItem();
  const deleteItem = useDeleteCapExItem();
  const [addOpen, setAddOpen] = useState(false);

  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('_global');
  const [categoryId, setCategoryId] = useState('');
  const [acqDate, setAcqDate] = useState('');
  const [acqCost, setAcqCost] = useState('');
  const [lifeMonths, setLifeMonths] = useState('60');
  const [salvage, setSalvage] = useState('0');
  const [method, setMethod] = useState('linear');

  const handleCreate = () => {
    if (!name.trim() || !acqCost) { toast.error('Nom et coût requis'); return; }
    const country = countries.find(c => c.id === countryId);
    createItem.mutate({
      scenario_id: scenarioId,
      name: name.trim(),
      country_id: countryId === '_global' ? null : countryId,
      country_label: country ? `${country.flag} ${country.name}` : 'Global',
      category_id: categoryId || null,
      acquisition_date: acqDate,
      acquisition_cost: Number(acqCost),
      useful_life_months: Number(lifeMonths) || 60,
      depreciation_method: method,
      salvage_value: Number(salvage) || 0,
      notes: '',
    }, {
      onSuccess: () => { toast.success('Actif CapEx ajouté'); setAddOpen(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  // Total depreciation by month
  const depreciationSchedule = useMemo(() => {
    const totals = Array(12).fill(0);
    items.forEach(item => {
      const monthly = calculateMonthlyDepreciation(item);
      monthly.forEach((v, i) => { totals[i] += v; });
    });
    return totals;
  }, [items]);

  const totalCapex = items.reduce((s, i) => s + i.acquisition_cost, 0);
  const totalDepreciation = depreciationSchedule.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
            <TrendingDown size={16} /> Planification CapEx & Amortissements
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {items.length} actif{items.length !== 1 ? 's' : ''} · Investissement total : {formatK(totalCapex)} FCFA · Amortissement annuel : {formatK(totalDepreciation)} FCFA
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-[12px]">
            <Plus size={14} /> Actif
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">🏗️</div>
          <p className="text-[12px] text-muted-foreground">Aucun actif CapEx. Ajoutez des investissements pour calculer les amortissements.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Actif</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground">Pays</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Coût</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Durée</th>
                {MONTHS.map(m => (
                  <th key={m} className="text-right px-1.5 py-2 text-[9px] font-bold text-muted-foreground">{m}</th>
                ))}
                <th className="w-[30px]" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const monthly = calculateMonthlyDepreciation(item);
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 group">
                    <td className="px-3 py-1.5 font-semibold">{item.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{item.country_label || 'Global'}</td>
                    <td className="text-right px-2 py-1.5">{formatK(item.acquisition_cost)}</td>
                    <td className="text-right px-2 py-1.5">{item.useful_life_months}m</td>
                    {monthly.map((v, i) => (
                      <td key={i} className="text-right px-1.5 py-1.5 text-destructive">{v > 0 ? `-${Math.round(v)}` : '-'}</td>
                    ))}
                    <td className="px-1">
                      {canWrite && (
                        <button onClick={() => deleteItem.mutate({ id: item.id, scenarioId })} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10">
                          <Trash2 size={12} className="text-destructive" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-primary/5 border-t border-primary">
                <td colSpan={4} className="px-3 py-2 font-bold text-primary">Total Amortissements</td>
                {depreciationSchedule.map((v, i) => (
                  <td key={i} className="text-right px-1.5 py-2 font-bold text-destructive">{v > 0 ? `-${Math.round(v)}` : '-'}</td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">🏗️ Nouvel actif CapEx</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-[12px]">Nom de l'actif *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Ex: Serveurs data center" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Pays</Label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_global">🌍 Global</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Catégorie</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'expense').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Coût d'acquisition (K FCFA) *</Label>
                <Input type="number" value={acqCost} onChange={e => setAcqCost(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Date d'acquisition</Label>
                <Input type="date" value={acqDate} onChange={e => setAcqDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[12px]">Durée de vie (mois)</Label>
                <Input type="number" value={lifeMonths} onChange={e => setLifeMonths(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Valeur résiduelle</Label>
                <Input type="number" value={salvage} onChange={e => setSalvage(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Méthode</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linéaire</SelectItem>
                    <SelectItem value="degressive">Dégressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createItem.isPending}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
