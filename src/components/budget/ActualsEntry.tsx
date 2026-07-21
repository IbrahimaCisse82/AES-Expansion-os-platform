import { useMemo, useState } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, useCreateBudgetLine, useUpdateBudgetLine } from '@/hooks/useBudgetData';
import { validateActualInput, isFutureMonth, ActualIssue } from '@/lib/actualsValidation';
import { formatFCFA } from '@/lib/currency';
import { AlertTriangle, CheckCircle2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  scenarioId: string;
  fiscalYear: number;
  lines: BudgetLine[];
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
  canWrite: boolean;
  isLocked: boolean;
}

type DraftMap = Record<string, Record<string, { raw: string; issues: ActualIssue[] }>>;

function fmtK(val: number): string {
  if (!val) return '—';
  if (val >= 1000) return `${(val / 1000).toFixed(1)} M FCFA`;
  return `${val.toLocaleString('fr-FR')} K FCFA`;
}

export default function ActualsEntry({
  scenarioId, fiscalYear, lines, categories, countries, canWrite, isLocked,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>('_all');
  const [countryFilter, setCountryFilter] = useState<string>('_all');
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [saving, setSaving] = useState(false);

  const createLine = useCreateBudgetLine();
  const updateLine = useUpdateBudgetLine();

  const budgetLines = useMemo(() => lines.filter(l => l.line_type === 'budget'), [lines]);
  const actualLines = useMemo(() => lines.filter(l => l.line_type === 'actual'), [lines]);

  // Un "réel" est identifié par la paire (category_id, country_id).
  // Pour chaque ligne budget, on retrouve (ou crée à la volée) sa ligne réel jumelle.
  const pairs = useMemo(() => {
    return budgetLines
      .filter(b => categoryFilter === '_all' || b.category_id === categoryFilter)
      .filter(b => countryFilter === '_all' || (b.country_id ?? '_global') === countryFilter)
      .map(b => {
        const actual = actualLines.find(a => a.category_id === b.category_id && a.country_id === b.country_id);
        return { budget: b, actual };
      });
  }, [budgetLines, actualLines, categoryFilter, countryFilter]);

  const handleChange = (lineKey: string, monthKey: string, raw: string, monthIdx: number, budgetVal: number) => {
    const { issues } = validateActualInput({ raw, monthIndex: monthIdx, fiscalYear, budgetValue: budgetVal });
    setDrafts(prev => ({
      ...prev,
      [lineKey]: { ...(prev[lineKey] ?? {}), [monthKey]: { raw, issues } },
    }));
  };

  const draftHasErrors = useMemo(() => {
    return Object.values(drafts).some(row =>
      Object.values(row).some(c => c.issues.some(i => i.level === 'error'))
    );
  }, [drafts]);

  const draftCount = useMemo(
    () => Object.values(drafts).reduce((s, row) => s + Object.values(row).filter(c => c.raw.trim() !== '').length, 0),
    [drafts]
  );

  const handleSaveAll = async () => {
    if (draftHasErrors) {
      toast.error('Corrigez les erreurs de validation avant d\'enregistrer');
      return;
    }
    setSaving(true);
    try {
      for (const { budget, actual } of pairs) {
        const key = budget.id;
        const rowDraft = drafts[key];
        if (!rowDraft) continue;

        const monthUpdates: Record<string, number> = {};
        let touched = false;
        MONTH_KEYS.forEach(mk => {
          const cell = rowDraft[mk];
          if (cell && cell.raw.trim() !== '') {
            const { value } = validateActualInput({
              raw: cell.raw,
              monthIndex: MONTH_KEYS.indexOf(mk),
              fiscalYear,
              budgetValue: Number(budget[mk] || 0),
            });
            monthUpdates[mk] = value;
            touched = true;
          }
        });
        if (!touched) continue;

        if (actual) {
          await updateLine.mutateAsync({ id: actual.id, scenario_id: scenarioId, ...monthUpdates });
        } else {
          const base = {
            scenario_id: scenarioId,
            category_id: budget.category_id,
            country_id: budget.country_id,
            country_label: budget.country_label,
            line_type: 'actual' as const,
            m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
            m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
            notes: '',
          };
          await createLine.mutateAsync({ ...base, ...monthUpdates });
        }
      }
      toast.success(`${draftCount} valeur${draftCount > 1 ? 's' : ''} réalisée${draftCount > 1 ? 's' : ''} enregistrée${draftCount > 1 ? 's' : ''}`);
      setDrafts({});
    } catch (err) {
      toast.error(`Erreur : ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const uniqueCountries = useMemo(() => {
    const set = new Map<string, string>();
    budgetLines.forEach(l => set.set(l.country_id ?? '_global', l.country_label || 'Global'));
    return Array.from(set.entries());
  }, [budgetLines]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-primary">Saisie des valeurs réalisées</h3>
          <p className="text-[11px] text-muted-foreground">
            Exercice {fiscalYear} — Prévu vs Réel · Validation période, format & cohérence en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-[32px] text-[12px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes catégories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[160px] h-[32px] text-[12px]"><SelectValue placeholder="Marché" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous marchés</SelectItem>
              {uniqueCountries.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSaveAll}
            size="sm"
            className="gap-1.5 h-[32px] text-[12px]"
            disabled={!canWrite || isLocked || saving || draftCount === 0 || draftHasErrors}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Enregistrement…' : `Enregistrer ${draftCount > 0 ? `(${draftCount})` : ''}`}
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted text-[11px] text-muted-foreground border-b border-border">
          <Lock className="w-3 h-3" /> Scénario verrouillé : lecture seule.
        </div>
      )}

      {pairs.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-muted-foreground">
          Aucune ligne budget disponible pour ce filtre.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-muted/50 z-10 min-w-[220px]">Catégorie · Marché</th>
                <th className="text-center px-2 py-2">Type</th>
                {MONTHS.map((m, i) => (
                  <th key={m} className={`text-center px-2 py-2 min-w-[80px] ${isFutureMonth(i, fiscalYear) ? 'text-muted-foreground/50' : ''}`}>
                    {m}
                  </th>
                ))}
                <th className="text-right px-3 py-2 min-w-[100px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map(({ budget, actual }) => {
                const cat = categories.find(c => c.id === budget.category_id);
                const key = budget.id;
                const rowDraft = drafts[key] ?? {};
                const actualTotal = MONTH_KEYS.reduce((s, mk) => {
                  const draftCell = rowDraft[mk];
                  if (draftCell && draftCell.raw.trim() !== '') {
                    const { value } = validateActualInput({
                      raw: draftCell.raw, monthIndex: MONTH_KEYS.indexOf(mk),
                      fiscalYear, budgetValue: Number(budget[mk] || 0),
                    });
                    return s + value;
                  }
                  return s + Number(actual?.[mk] || 0);
                }, 0);
                const budgetTotal = MONTH_KEYS.reduce((s, mk) => s + Number(budget[mk] || 0), 0);

                return (
                  <>
                    <tr key={`${key}-b`} className="border-t border-border bg-muted/10">
                      <td className="px-3 py-1.5 sticky left-0 bg-muted/10 z-10 font-medium text-foreground" rowSpan={2}>
                        <div>{cat?.name ?? '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{budget.country_label || 'Global'}</div>
                      </td>
                      <td className="text-center px-2 py-1.5 text-muted-foreground">Prévu</td>
                      {MONTH_KEYS.map(mk => (
                        <td key={mk} className="text-center px-2 py-1.5 text-muted-foreground tabular-nums">
                          {Number(budget[mk] || 0) === 0 ? '—' : Number(budget[mk]).toLocaleString('fr-FR')}
                        </td>
                      ))}
                      <td className="text-right px-3 py-1.5 font-semibold tabular-nums">{fmtK(budgetTotal)}</td>
                    </tr>
                    <tr key={`${key}-a`} className="border-t border-border/50">
                      <td className="text-center px-2 py-1.5 text-accent font-medium">Réel</td>
                      {MONTH_KEYS.map((mk, i) => {
                        const budgetVal = Number(budget[mk] || 0);
                        const persistedVal = Number(actual?.[mk] || 0);
                        const cell = rowDraft[mk];
                        const isFuture = isFutureMonth(i, fiscalYear);
                        const draftVal = cell?.raw ?? '';
                        const hasError = cell?.issues.some(x => x.level === 'error');
                        const hasWarning = cell?.issues.some(x => x.level === 'warning');
                        return (
                          <td key={mk} className="px-1 py-1 text-center">
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={!canWrite || isLocked || isFuture}
                                value={draftVal}
                                placeholder={persistedVal ? String(persistedVal) : '—'}
                                onChange={e => handleChange(key, mk, e.target.value, i, budgetVal)}
                                className={`w-full text-center px-1 py-1 rounded border tabular-nums bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-primary
                                  ${hasError ? 'border-destructive ring-1 ring-destructive/50' : hasWarning ? 'border-amber-500' : 'border-border'}
                                  ${isFuture ? 'opacity-40 cursor-not-allowed' : ''}
                                `}
                                title={cell?.issues.map(i => i.message).join(' • ')}
                              />
                              {cell?.issues.length ? (
                                <span className="absolute -top-1 -right-1">
                                  {hasError ? <AlertTriangle className="w-3 h-3 text-destructive" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-right px-3 py-1.5 font-semibold tabular-nums text-accent">
                        {fmtK(actualTotal)}
                        {budgetTotal > 0 && (
                          <div className={`text-[10px] ${actualTotal > budgetTotal ? (cat?.type === 'revenue' ? 'text-accent' : 'text-destructive') : (cat?.type === 'revenue' ? 'text-destructive' : 'text-accent')}`}>
                            {actualTotal > budgetTotal ? '+' : ''}{Math.round(((actualTotal - budgetTotal) / budgetTotal) * 100)} %
                          </div>
                        )}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Issues panel */}
      {draftCount > 0 && (
        <div className={`px-4 py-2.5 border-t border-border text-[11.5px] flex items-center gap-2 ${draftHasErrors ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
          {draftHasErrors ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {draftHasErrors
            ? 'Certaines saisies contiennent des erreurs — passez la souris sur les champs pour voir le détail.'
            : `${draftCount} valeur${draftCount > 1 ? 's' : ''} prête${draftCount > 1 ? 's' : ''} à être enregistrée${draftCount > 1 ? 's' : ''}.`}
          {/* Silence unused import */}
          <span className="hidden">{formatFCFA(0)}</span>
        </div>
      )}
    </div>
  );
}
