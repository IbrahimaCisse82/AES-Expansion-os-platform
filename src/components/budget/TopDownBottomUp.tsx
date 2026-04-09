import { useState, useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTH_KEYS, MONTHS, getLineTotal, useCreateBudgetLine } from '@/hooks/useBudgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDown, ArrowUp, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface TopDownBottomUpProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioId: string;
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
}

function formatK(val: number): string {
  if (val === 0) return '-';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}M`;
  return `${Math.round(val)}K`;
}

export default function TopDownBottomUp({ lines, categories, scenarioId, countries, canWrite }: TopDownBottomUpProps) {
  const [mode, setMode] = useState<'topdown' | 'bottomup'>('topdown');
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [totalTarget, setTotalTarget] = useState('');
  const [allocMethod, setAllocMethod] = useState<'equal' | 'proportional'>('equal');
  const createLine = useCreateBudgetLine();

  const budgetLines = useMemo(() => lines.filter(l => l.line_type === 'budget'), [lines]);

  // Bottom-up: aggregate from countries
  const bottomUpByCountry = useMemo(() => {
    const map = new Map<string, { label: string; revenue: number; expense: number; net: number }>();
    budgetLines.forEach(l => {
      const key = l.country_id || '_global';
      if (!map.has(key)) {
        map.set(key, { label: l.country_label || 'Global', revenue: 0, expense: 0, net: 0 });
      }
      const entry = map.get(key)!;
      const isRevenue = categories.some(c => c.id === l.category_id && c.type === 'revenue');
      const total = getLineTotal(l);
      if (isRevenue) entry.revenue += total;
      else entry.expense += total;
      entry.net = entry.revenue - entry.expense;
    });
    return Array.from(map.values());
  }, [budgetLines, categories]);

  const totalGroupRevenue = bottomUpByCountry.reduce((s, c) => s + c.revenue, 0);
  const totalGroupExpense = bottomUpByCountry.reduce((s, c) => s + c.expense, 0);
  const totalGroupNet = totalGroupRevenue - totalGroupExpense;

  // Top-down allocation
  const handleTopDownAllocate = () => {
    if (!targetCategoryId || !totalTarget) {
      toast.error('Catégorie et montant requis');
      return;
    }
    const target = Number(totalTarget);
    const targetCountries = countries.length > 0 ? countries : [{ id: '_global', name: 'Global', flag: '🌍' }];

    let shares: number[];
    if (allocMethod === 'equal') {
      shares = targetCountries.map(() => target / targetCountries.length);
    } else {
      // Proportional to existing revenue
      const countryRevenues = targetCountries.map(c => {
        return budgetLines
          .filter(l => l.country_id === c.id && categories.some(cat => cat.id === l.category_id && cat.type === 'revenue'))
          .reduce((s, l) => s + getLineTotal(l), 0);
      });
      const totalRev = countryRevenues.reduce((a, b) => a + b, 0) || 1;
      shares = countryRevenues.map(r => (r / totalRev) * target);
    }

    let created = 0;
    targetCountries.forEach((c, idx) => {
      const monthlyAmount = Math.round(shares[idx] / 12);
      const monthValues: Record<string, number> = {};
      MONTH_KEYS.forEach(k => { monthValues[k] = monthlyAmount; });

      createLine.mutate({
        scenario_id: scenarioId,
        category_id: targetCategoryId,
        country_id: c.id === '_global' ? null : c.id,
        country_label: `${c.flag} ${c.name}`,
        line_type: 'budget',
        ...monthValues as { m1: number; m2: number; m3: number; m4: number; m5: number; m6: number; m7: number; m8: number; m9: number; m10: number; m11: number; m12: number },
        notes: `Allocation top-down: ${formatK(shares[idx])} FCFA`,
      }, {
        onSuccess: () => { created++; if (created === targetCountries.length) { toast.success('Allocation top-down appliquée'); setAllocateOpen(false); } },
        onError: (err: Error) => toast.error(err.message),
      });
    });
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMode('topdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium transition-colors ${mode === 'topdown' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            <ArrowDown size={14} /> Top-Down
          </button>
          <button
            onClick={() => setMode('bottomup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium transition-colors ${mode === 'bottomup' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            <ArrowUp size={14} /> Bottom-Up
          </button>
        </div>
        {canWrite && mode === 'topdown' && (
          <Button size="sm" onClick={() => setAllocateOpen(true)} className="gap-1.5 text-[12px]">
            <Layers size={14} /> Allouer
          </Button>
        )}
      </div>

      {mode === 'topdown' ? (
        /* Top-Down View: Group target, show breakdown */
        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="text-[11px] text-muted-foreground uppercase font-bold mb-1">Objectif Groupe</div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[10px] text-muted-foreground">Revenus</div>
                <div className="text-lg font-bold text-accent">{formatK(totalGroupRevenue)} FCFA</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Dépenses</div>
                <div className="text-lg font-bold text-destructive">{formatK(totalGroupExpense)} FCFA</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Résultat Net</div>
                <div className={`text-lg font-bold ${totalGroupNet >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatK(totalGroupNet)} FCFA</div>
              </div>
            </div>
          </div>

          <div className="text-[12px] font-semibold text-foreground">⬇️ Ventilation par pays (allocation actuelle)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {bottomUpByCountry.map(c => (
              <div key={c.label} className="bg-card border border-border rounded-lg p-3">
                <div className="text-[12px] font-semibold mb-1">{c.label}</div>
                <div className="flex items-center gap-4 text-[10px]">
                  <span className="text-accent">Rev: {formatK(c.revenue)}</span>
                  <span className="text-destructive">Dep: {formatK(c.expense)}</span>
                  <span className={c.net >= 0 ? 'text-accent font-bold' : 'text-destructive font-bold'}>Net: {formatK(c.net)}</span>
                </div>
                {totalGroupRevenue > 0 && (
                  <div className="mt-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (c.revenue / totalGroupRevenue) * 100)}%` }} />
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{((c.revenue / totalGroupRevenue) * 100).toFixed(1)}% du CA Groupe</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Bottom-Up View: Countries remit to Group */
        <div className="space-y-3">
          <div className="text-[12px] font-semibold text-foreground">⬆️ Remontée des budgets pays vers le Groupe</div>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Pays</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Revenus</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Dépenses</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Résultat</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">% Groupe</th>
                </tr>
              </thead>
              <tbody>
                {bottomUpByCountry.map(c => (
                  <tr key={c.label} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-semibold">{c.label}</td>
                    <td className="text-right px-3 py-1.5 text-accent">{formatK(c.revenue)}</td>
                    <td className="text-right px-3 py-1.5 text-destructive">{formatK(c.expense)}</td>
                    <td className={`text-right px-3 py-1.5 font-bold ${c.net >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatK(c.net)}</td>
                    <td className="text-right px-3 py-1.5 text-muted-foreground">
                      {totalGroupRevenue > 0 ? `${((c.revenue / totalGroupRevenue) * 100).toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary/10 border-t-2 border-primary">
                  <td className="px-3 py-2 font-bold text-primary">TOTAL GROUPE</td>
                  <td className="text-right px-3 py-2 font-bold text-accent">{formatK(totalGroupRevenue)}</td>
                  <td className="text-right px-3 py-2 font-bold text-destructive">{formatK(totalGroupExpense)}</td>
                  <td className={`text-right px-3 py-2 font-bold ${totalGroupNet >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatK(totalGroupNet)}</td>
                  <td className="text-right px-3 py-2 font-bold text-primary">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top-down allocation dialog */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">⬇️ Allocation Top-Down</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Définissez un objectif Groupe et répartissez-le automatiquement vers chaque pays.
          </p>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-[12px]">Catégorie *</Label>
              <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.type === 'revenue' ? '📈' : '📉'} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Montant total Groupe (K FCFA) *</Label>
              <Input type="number" value={totalTarget} onChange={e => setTotalTarget(e.target.value)} className="mt-1" placeholder="Ex: 50000" />
            </div>
            <div>
              <Label className="text-[12px]">Méthode de répartition</Label>
              <Select value={allocMethod} onValueChange={v => setAllocMethod(v as 'equal' | 'proportional')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Répartition égale</SelectItem>
                  <SelectItem value="proportional">Proportionnelle au CA existant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAllocateOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleTopDownAllocate} disabled={createLine.isPending}>Allouer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
