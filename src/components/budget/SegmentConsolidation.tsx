import { useState, useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { useSegments, useCreateSegment, useDeleteSegment, Segment } from '@/hooks/useBudgetNewFeatures';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface SegmentConsolidationProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioId: string;
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
  lineType: string;
}

export default function SegmentConsolidation({ lines, categories, scenarioId, countries, canWrite, lineType }: SegmentConsolidationProps) {
  const { data: segments = [] } = useSegments(scenarioId);
  const createSegment = useCreateSegment();
  const deleteSegment = useDeleteSegment();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('region');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const filteredLines = lines.filter(l => l.line_type === lineType);

  const segmentData = useMemo(() => {
    return segments.map(seg => {
      const segLines = filteredLines.filter(l => l.country_id && seg.country_ids.includes(l.country_id));
      const revenue = segLines.filter(l => categories.find(c => c.id === l.category_id)?.type === 'revenue').reduce((s, l) => s + getLineTotal(l), 0);
      const expense = segLines.filter(l => categories.find(c => c.id === l.category_id)?.type === 'expense').reduce((s, l) => s + getLineTotal(l), 0);
      const monthlyData = MONTH_KEYS.map(mk => segLines.reduce((s, l) => s + Number(l[mk] || 0), 0));
      return { ...seg, revenue, expense, result: revenue - expense, monthlyData, lineCount: segLines.length };
    });
  }, [segments, filteredLines, categories]);

  const handleAdd = () => {
    if (!name || selectedCountries.length === 0) { toast.error('Remplissez tous les champs'); return; }
    createSegment.mutate({ scenario_id: scenarioId, segment_name: name, segment_type: type, country_ids: selectedCountries, color: 'hsl(var(--muted-foreground))', sort_order: segments.length }, {
      onSuccess: () => { toast.success('Segment créé'); setAddOpen(false); setName(''); setSelectedCountries([]); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const fmt = (v: number) => v === 0 ? '-' : Math.abs(v) >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-primary">Consolidation par segment</h3>
        </div>
        {canWrite && <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 text-[12px]"><Plus className="w-3.5 h-3.5" /> Segment</Button>}
      </div>

      {segmentData.length === 0 ? (
        <Card className="p-8 text-center"><Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Créez des segments pour regrouper les pays par région ou division.</p></Card>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase w-[180px]">Segment</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground">Type</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Pays</th>
                {MONTHS.map(m => <th key={m} className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground w-[55px]">{m}</th>)}
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Revenus</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Charges</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">Résultat</th>
                <th className="w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {segmentData.map(s => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-semibold">{s.segment_name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground capitalize">{s.segment_type}</td>
                  <td className="text-right px-2 py-1.5">{s.country_ids.length}</td>
                  {s.monthlyData.map((v, i) => <td key={i} className="text-right px-2 py-1.5">{fmt(v)}</td>)}
                  <td className="text-right px-2 py-1.5 font-medium text-sage">{fmt(s.revenue)}</td>
                  <td className="text-right px-2 py-1.5 font-medium text-destructive">{fmt(s.expense)}</td>
                  <td className={`text-right px-2 py-1.5 font-bold ${s.result < 0 ? 'text-destructive' : 'text-sage'}`}>{fmt(s.result)}</td>
                  <td className="px-1">
                    {canWrite && <button onClick={() => deleteSegment.mutate({ id: s.id, scenarioId })} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5 border-t-2 border-primary">
                <td className="px-3 py-2 font-bold text-primary" colSpan={3}>TOTAL CONSOLIDÉ</td>
                {Array(12).fill(0).map((_, i) => {
                  const total = segmentData.reduce((s, seg) => s + seg.monthlyData[i], 0);
                  return <td key={i} className="text-right px-2 py-2 font-bold">{fmt(total)}</td>;
                })}
                <td className="text-right px-2 py-2 font-bold text-sage">{fmt(segmentData.reduce((s, seg) => s + seg.revenue, 0))}</td>
                <td className="text-right px-2 py-2 font-bold text-destructive">{fmt(segmentData.reduce((s, seg) => s + seg.expense, 0))}</td>
                <td className="text-right px-2 py-2 font-bold">{fmt(segmentData.reduce((s, seg) => s + seg.result, 0))}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="font-display">Nouveau segment</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-[12px]">Nom</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Afrique de l'Ouest" className="mt-1" /></div>
            <div><Label className="text-[12px]">Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">Région</SelectItem>
                  <SelectItem value="division">Division</SelectItem>
                  <SelectItem value="business_unit">Business Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-[12px]">Pays inclus</Label>
              <div className="mt-1 max-h-[200px] overflow-y-auto space-y-1.5 border rounded-md p-2">
                {countries.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-[11px]">
                    <Checkbox checked={selectedCountries.includes(c.id)} onCheckedChange={checked => setSelectedCountries(prev => checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                    {c.flag} {c.name}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createSegment.isPending}>Créer le segment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
