import { useState } from 'react';
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry, JournalEntry } from '@/hooks/useBudgetNewFeatures';
import { BudgetCategory } from '@/hooks/useBudgetData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Check, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface JournalEntriesViewProps {
  scenarioId: string;
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
  isAdmin: boolean;
}

export default function JournalEntriesView({ scenarioId, categories, countries, canWrite, isAdmin }: JournalEntriesViewProps) {
  const { data: entries = [] } = useJournalEntries(scenarioId);
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const [addOpen, setAddOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [entryType, setEntryType] = useState('adjustment');
  const [countryId, setCountryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!desc) { toast.error('Description requise'); return; }
    createEntry.mutate({
      scenario_id: scenarioId, description: desc, entry_type: entryType,
      country_id: countryId || null, category_id: categoryId || null,
      debit_amount: Number(debit) || 0, credit_amount: Number(credit) || 0,
      status: 'draft', created_by: null, notes,
    }, {
      onSuccess: () => { toast.success('Écriture ajoutée'); setAddOpen(false); setDesc(''); setDebit(''); setCredit(''); setNotes(''); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleApprove = (entry: JournalEntry) => {
    updateEntry.mutate({ id: entry.id, scenarioId, status: 'approved', approved_at: new Date().toISOString() }, {
      onSuccess: () => toast.success('Écriture approuvée'),
    });
  };

  const statusBadge = (s: string) => s === 'approved' ? 'default' : s === 'posted' ? 'secondary' : 'outline';
  const fmt = (v: number) => v === 0 ? '-' : v.toLocaleString('fr-FR');
  const totalDebit = entries.reduce((s, e) => s + e.debit_amount, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-bold text-primary">Écritures de consolidation</h3></div>
        {canWrite && <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 text-[12px]"><Plus className="w-3.5 h-3.5" /> Écriture</Button>}
      </div>

      {entries.length === 0 ? (
        <Card className="p-8 text-center"><BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Aucune écriture de consolidation. Ajoutez des ajustements manuels.</p></Card>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Description</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground">Type</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground">Catégorie</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Débit</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Crédit</th>
                <th className="text-center px-2 py-2 text-[10px] font-bold text-muted-foreground">Statut</th>
                <th className="w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const cat = categories.find(c => c.id === e.category_id);
                return (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-medium">{e.description}</td>
                    <td className="px-2 py-1.5 text-muted-foreground capitalize">{e.entry_type}</td>
                    <td className="px-2 py-1.5">{cat?.name || '-'}</td>
                    <td className="text-right px-2 py-1.5 font-medium">{fmt(e.debit_amount)}</td>
                    <td className="text-right px-2 py-1.5 font-medium">{fmt(e.credit_amount)}</td>
                    <td className="text-center px-2 py-1.5"><Badge variant={statusBadge(e.status) as 'default' | 'secondary' | 'outline'} className="text-[9px]">{e.status}</Badge></td>
                    <td className="px-1 flex items-center gap-1">
                      {isAdmin && e.status === 'draft' && <button onClick={() => handleApprove(e)} className="p-1 hover:text-green-600"><Check className="w-3 h-3" /></button>}
                      {canWrite && <button onClick={() => deleteEntry.mutate({ id: e.id, scenarioId })} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-primary/5 border-t-2 border-primary">
                <td className="px-3 py-2 font-bold text-primary" colSpan={3}>TOTAL</td>
                <td className="text-right px-2 py-2 font-bold">{fmt(totalDebit)}</td>
                <td className="text-right px-2 py-2 font-bold">{fmt(totalCredit)}</td>
                <td className="text-center px-2 py-2 font-bold">{totalDebit === totalCredit ? <Badge variant="default" className="text-[9px]">Équilibré</Badge> : <Badge variant="destructive" className="text-[9px]">Déséquilibré</Badge>}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle className="font-display">Nouvelle écriture</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="text-[12px]">Description *</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Élimination IC vente France → Sénégal" className="mt-1" /></div>
            <div><Label className="text-[12px]">Type</Label>
              <Select value={entryType} onValueChange={setEntryType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Ajustement</SelectItem>
                  <SelectItem value="elimination">Élimination</SelectItem>
                  <SelectItem value="reclassification">Reclassification</SelectItem>
                  <SelectItem value="revaluation">Réévaluation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-[12px]">Catégorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="mt-1"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px]">Débit</Label><Input type="number" value={debit} onChange={e => setDebit(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-[12px]">Crédit</Label><Input type="number" value={credit} onChange={e => setCredit(e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label className="text-[12px]">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={2} /></div>
            <Button onClick={handleAdd} className="w-full" disabled={createEntry.isPending}>Créer l'écriture</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
