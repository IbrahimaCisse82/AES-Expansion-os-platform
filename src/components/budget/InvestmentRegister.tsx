import { useState } from 'react';
import { useInvestments, useCreateInvestment, useDeleteInvestment } from '@/hooks/useBudgetNewFeatures';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface InvestmentRegisterProps {
  scenarioId: string;
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
}

export default function InvestmentRegister({ scenarioId, countries, canWrite }: InvestmentRegisterProps) {
  const { data: investments = [] } = useInvestments(scenarioId);
  const createInv = useCreateInvestment();
  const deleteInv = useDeleteInvestment();
  const [addOpen, setAddOpen] = useState(false);
  const [parentId, setParentId] = useState('');
  const [subId, setSubId] = useState('');
  const [ownershipPct, setOwnershipPct] = useState('100');
  const [acqDate, setAcqDate] = useState('');
  const [acqCost, setAcqCost] = useState('');
  const [bookValue, setBookValue] = useState('');
  const [method, setMethod] = useState('full');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!parentId || !subId) { toast.error('Sélectionnez les deux entités'); return; }
    const parent = countries.find(c => c.id === parentId);
    const sub = countries.find(c => c.id === subId);
    createInv.mutate({
      scenario_id: scenarioId,
      parent_entity_id: parentId, parent_entity_label: parent ? `${parent.flag} ${parent.name}` : parentId,
      subsidiary_entity_id: subId, subsidiary_entity_label: sub ? `${sub.flag} ${sub.name}` : subId,
      ownership_pct: Number(ownershipPct) || 100,
      acquisition_date: acqDate || null, acquisition_cost: Number(acqCost) || 0,
      book_value: Number(bookValue) || 0, consolidation_method: method,
      status: 'active', notes,
    }, {
      onSuccess: () => { toast.success('Investissement ajouté'); setAddOpen(false); setParentId(''); setSubId(''); setOwnershipPct('100'); setAcqCost(''); setBookValue(''); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const methodLabel = (m: string) => m === 'full' ? 'Intégration globale' : m === 'equity' ? 'Mise en équivalence' : m === 'proportional' ? 'Intégration proportionnelle' : m;
  const methodColor = (m: string): 'default' | 'secondary' | 'outline' => m === 'full' ? 'default' : m === 'equity' ? 'secondary' : 'outline';
  const totalAcqCost = investments.reduce((s, i) => s + i.acquisition_cost, 0);
  const totalBookValue = investments.reduce((s, i) => s + i.book_value, 0);
  const fmt = (v: number) => v === 0 ? '-' : v.toLocaleString('fr-FR');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-bold text-primary">Registre des participations</h3></div>
        {canWrite && <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 text-[12px]"><Plus className="w-3.5 h-3.5" /> Participation</Button>}
      </div>

      {investments.length === 0 ? (
        <Card className="p-8 text-center"><Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Enregistrez les participations et pourcentages de détention du groupe.</p></Card>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Maison mère</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground">Filiale</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">% Détention</th>
                <th className="text-center px-2 py-2 text-[10px] font-bold text-muted-foreground">Méthode</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Coût d'acq.</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Valeur compt.</th>
                <th className="text-center px-2 py-2 text-[10px] font-bold text-muted-foreground">Statut</th>
                <th className="w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium">{inv.parent_entity_label}</td>
                  <td className="px-2 py-1.5">{inv.subsidiary_entity_label}</td>
                  <td className="text-right px-2 py-1.5 font-bold">{inv.ownership_pct}%</td>
                  <td className="text-center px-2 py-1.5"><Badge variant={methodColor(inv.consolidation_method)} className="text-[9px]">{methodLabel(inv.consolidation_method)}</Badge></td>
                  <td className="text-right px-2 py-1.5">{fmt(inv.acquisition_cost)}</td>
                  <td className="text-right px-2 py-1.5">{fmt(inv.book_value)}</td>
                  <td className="text-center px-2 py-1.5"><Badge variant={inv.status === 'active' ? 'default' : 'secondary'} className="text-[9px]">{inv.status}</Badge></td>
                  <td className="px-1">{canWrite && <button onClick={() => deleteInv.mutate({ id: inv.id, scenarioId })} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}</td>
                </tr>
              ))}
              <tr className="bg-primary/5 border-t-2 border-primary">
                <td className="px-3 py-2 font-bold text-primary" colSpan={4}>TOTAL</td>
                <td className="text-right px-2 py-2 font-bold">{fmt(totalAcqCost)}</td>
                <td className="text-right px-2 py-2 font-bold">{fmt(totalBookValue)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle className="font-display">Nouvelle participation</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="text-[12px]">Maison mère *</Label>
              <Select value={parentId} onValueChange={setParentId}><SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-[12px]">Filiale *</Label>
              <Select value={subId} onValueChange={setSubId}><SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{countries.filter(c => c.id !== parentId).map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px]">% Détention</Label><Input type="number" value={ownershipPct} onChange={e => setOwnershipPct(e.target.value)} min="0" max="100" className="mt-1" /></div>
              <div><Label className="text-[12px]">Méthode</Label>
                <Select value={method} onValueChange={setMethod}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Intégration globale</SelectItem>
                    <SelectItem value="proportional">Proportionnelle</SelectItem>
                    <SelectItem value="equity">Mise en équivalence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px]">Coût d'acquisition</Label><Input type="number" value={acqCost} onChange={e => setAcqCost(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-[12px]">Valeur comptable</Label><Input type="number" value={bookValue} onChange={e => setBookValue(e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label className="text-[12px]">Date d'acquisition</Label><Input type="date" value={acqDate} onChange={e => setAcqDate(e.target.value)} className="mt-1" /></div>
            <Button onClick={handleAdd} className="w-full" disabled={createInv.isPending}>Ajouter la participation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
