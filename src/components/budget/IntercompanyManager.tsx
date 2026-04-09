import { useState } from 'react';
import { useIntercompanyEliminations, useCreateIntercompany, useDeleteIntercompany, IntercompanyElimination } from '@/hooks/useBudgetConsolidation';
import { BudgetCategory, MONTHS, MONTH_KEYS } from '@/hooks/useBudgetData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface IntercompanyManagerProps {
  scenarioId: string;
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
}

function formatK(val: number): string {
  if (val === 0) return '-';
  return `${Math.round(val)}K`;
}

export default function IntercompanyManager({ scenarioId, categories, countries, canWrite }: IntercompanyManagerProps) {
  const { data: eliminations = [] } = useIntercompanyEliminations(scenarioId);
  const createIC = useCreateIntercompany();
  const deleteIC = useDeleteIntercompany();
  const [addOpen, setAddOpen] = useState(false);

  const [sourceCountry, setSourceCountry] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [elimType, setElimType] = useState('revenue_expense');
  const [description, setDescription] = useState('');
  const [monthValues, setMonthValues] = useState<number[]>(Array(12).fill(0));

  const handleCreate = () => {
    if (!sourceCountry || !targetCountry || !categoryId) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    if (sourceCountry === targetCountry) {
      toast.error('Les entités source et cible doivent être différentes');
      return;
    }
    const payload: Record<string, unknown> = {
      scenario_id: scenarioId,
      source_country_id: sourceCountry,
      target_country_id: targetCountry,
      category_id: categoryId,
      elimination_type: elimType,
      description,
      amount: monthValues.reduce((a, b) => a + b, 0),
    };
    MONTH_KEYS.forEach((k, i) => { payload[k] = monthValues[i]; });

    createIC.mutate(payload as Omit<IntercompanyElimination, 'id' | 'created_at' | 'updated_at'>, {
      onSuccess: () => { toast.success('Élimination IC ajoutée'); setAddOpen(false); resetForm(); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const resetForm = () => {
    setSourceCountry(''); setTargetCountry(''); setCategoryId('');
    setElimType('revenue_expense'); setDescription('');
    setMonthValues(Array(12).fill(0));
  };

  const getCountryLabel = (id: string) => {
    const c = countries.find(c => c.id === id);
    return c ? `${c.flag} ${c.name}` : id;
  };

  const totalEliminations = eliminations.reduce((s, el) => {
    return s + MONTH_KEYS.reduce((ms, k, i) => ms + Number(el[`m${i + 1}` as keyof IntercompanyElimination] || 0), 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-foreground">🔄 Éliminations Inter-Compagnies</h3>
          <p className="text-[11px] text-muted-foreground">
            Gérer les transactions intra-groupe à éliminer lors de la consolidation · Total : {formatK(totalEliminations)} FCFA
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }} className="gap-1.5 text-[12px]">
            <Plus size={14} /> Élimination
          </Button>
        )}
      </div>

      {eliminations.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">🔄</div>
          <p className="text-[12px] text-muted-foreground">Aucune élimination inter-compagnies configurée.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Transaction</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase">Type</th>
                {MONTHS.map(m => (
                  <th key={m} className="text-right px-1.5 py-2 text-[10px] font-bold text-muted-foreground">{m}</th>
                ))}
                <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">TOTAL</th>
                <th className="w-[30px]" />
              </tr>
            </thead>
            <tbody>
              {eliminations.map(el => {
                const total = MONTH_KEYS.reduce((s, _, i) => s + Number(el[`m${i + 1}` as keyof IntercompanyElimination] || 0), 0);
                return (
                  <tr key={el.id} className="border-b border-border/50 hover:bg-muted/20 group">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span>{getCountryLabel(el.source_country_id)}</span>
                        <ArrowRight size={10} className="text-muted-foreground" />
                        <span>{getCountryLabel(el.target_country_id)}</span>
                      </div>
                      {el.description && <div className="text-[9px] text-muted-foreground">{el.description}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{el.elimination_type}</td>
                    {MONTH_KEYS.map((_, i) => (
                      <td key={i} className="text-right px-1.5 py-1.5 text-[hsl(var(--gold))]">
                        {formatK(Number(el[`m${i + 1}` as keyof IntercompanyElimination] || 0))}
                      </td>
                    ))}
                    <td className="text-right px-3 py-1.5 font-bold text-[hsl(var(--gold))]">{formatK(total)}</td>
                    <td className="px-1">
                      {canWrite && (
                        <button
                          onClick={() => deleteIC.mutate({ id: el.id, scenarioId })}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10"
                        >
                          <Trash2 size={12} className="text-destructive" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">🔄 Nouvelle élimination IC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Entité source *</Label>
                <Select value={sourceCountry} onValueChange={setSourceCountry}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Entité cible *</Label>
                <Select value={targetCountry} onValueChange={setTargetCountry}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Catégorie *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.type === 'revenue' ? '📈' : '📉'} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Type d'élimination</Label>
                <Select value={elimType} onValueChange={setElimType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue_expense">Revenus/Charges</SelectItem>
                    <SelectItem value="debt">Dettes</SelectItem>
                    <SelectItem value="capital">Capital</SelectItem>
                    <SelectItem value="profit">Profit non réalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[12px]">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" placeholder="Ex: Facturation services IT intra-groupe" />
            </div>
            <div>
              <Label className="text-[12px]">Montants mensuels (K FCFA)</Label>
              <div className="grid grid-cols-6 gap-1.5 mt-1">
                {MONTHS.map((m, i) => (
                  <div key={m}>
                    <div className="text-[9px] text-muted-foreground text-center">{m}</div>
                    <Input
                      type="number"
                      value={monthValues[i] || ''}
                      onChange={e => {
                        const next = [...monthValues];
                        next[i] = Number(e.target.value) || 0;
                        setMonthValues(next);
                      }}
                      className="h-7 text-[10px] text-center px-1"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createIC.isPending}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
