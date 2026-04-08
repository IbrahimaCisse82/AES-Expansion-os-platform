import { useState, useCallback, useRef, useEffect } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { useUpdateBudgetLine, useDeleteBudgetLine } from '@/hooks/useBudgetData';
import { logBudgetChange } from '@/hooks/useBudgetExtras';
import { Trash2, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import LineCommentPanel from './LineCommentPanel';

interface SpreadsheetProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioId: string;
  canWrite: boolean;
  isLocked: boolean;
  lineType: 'budget' | 'actual' | 'forecast';
  compareLines?: BudgetLine[];
  compareLabel?: string;
}

function formatK(val: number): string {
  if (val === 0) return '-';
  if (val >= 1000) return `${(val / 1000).toFixed(1)}M`;
  return `${val}K`;
}

function getVarianceClass(budget: number, actual: number, isRevenue: boolean): string {
  if (budget === 0 && actual === 0) return '';
  const diff = isRevenue ? actual - budget : budget - actual;
  if (diff > 0) return 'text-accent';
  if (diff < 0) return 'text-destructive';
  return '';
}

export default function BudgetSpreadsheet({
  lines, categories, scenarioId, canWrite, isLocked, lineType, compareLines, compareLabel,
}: SpreadsheetProps) {
  const updateLine = useUpdateBudgetLine();
  const deleteLine = useDeleteBudgetLine();
  const [editingCell, setEditingCell] = useState<{ lineId: string; month: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [commentLineId, setCommentLineId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  const handleCellClick = useCallback((lineId: string, month: string, currentVal: number) => {
    if (!canWrite || isLocked) return;
    setEditingCell({ lineId, month });
    setEditValue(currentVal === 0 ? '' : String(currentVal));
  }, [canWrite, isLocked]);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const val = Number(editValue) || 0;
    const line = lines.find(l => l.id === editingCell.lineId);
    if (!line) { setEditingCell(null); return; }
    const currentVal = Number(line[editingCell.month as keyof BudgetLine] || 0);
    if (val !== currentVal) {
      // Log audit trail
      logBudgetChange({
        budgetLineId: editingCell.lineId,
        fieldName: editingCell.month,
        oldValue: String(currentVal),
        newValue: String(val),
      });
      updateLine.mutate({
        id: editingCell.lineId,
        scenario_id: scenarioId,
        [editingCell.month]: val,
      }, { onError: (err: Error) => toast.error(err.message) });
    }
    setEditingCell(null);
  }, [editingCell, editValue, lines, scenarioId, updateLine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') setEditingCell(null);
  }, [commitEdit]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const getLinesForCategory = (catId: string) => lines.filter(l => l.category_id === catId && l.line_type === lineType);
  const getCompareForCategory = (catId: string) => compareLines?.filter(l => l.category_id === catId) || [];

  const getCategoryTotal = (catId: string, month: string) =>
    getLinesForCategory(catId).reduce((s, l) => s + Number(l[month as keyof BudgetLine] || 0), 0);

  const getSectionTotal = (cats: BudgetCategory[], month: string) =>
    cats.reduce((s, cat) => s + getCategoryTotal(cat.id, month), 0);

  const getSectionGrandTotal = (cats: BudgetCategory[]) =>
    cats.reduce((s, cat) => s + getLinesForCategory(cat.id).reduce((s2, l) => s2 + getLineTotal(l), 0), 0);

  const renderCategorySection = (cats: BudgetCategory[], sectionLabel: string, isRevenue: boolean) => {
    const sectionTotalByMonth = MONTH_KEYS.map(k => getSectionTotal(cats, k));
    const sectionGrand = getSectionGrandTotal(cats);

    return (
      <>
        {/* Section header */}
        <tr className="bg-primary/5 border-b border-border">
          <td className="sticky left-0 bg-primary/5 z-10 px-3 py-2 text-[12px] font-bold text-primary uppercase tracking-wider" colSpan={1}>
            {sectionLabel}
          </td>
          {MONTH_KEYS.map((k, i) => (
            <td key={k} className="px-2 py-2 text-[11px] font-bold text-primary text-right">{formatK(sectionTotalByMonth[i])}</td>
          ))}
          <td className="px-3 py-2 text-[12px] font-bold text-primary text-right">{formatK(sectionGrand)}</td>
          <td className="px-2 py-2" />
        </tr>

        {cats.map(cat => {
          const catLines = getLinesForCategory(cat.id);
          const isCollapsed = collapsedCategories.has(cat.id);
          const catTotalByMonth = MONTH_KEYS.map(k => getCategoryTotal(cat.id, k));
          const catGrand = catLines.reduce((s, l) => s + getLineTotal(l), 0);
          const compareCatLines = getCompareForCategory(cat.id);

          return (
            <tbody key={cat.id}>
              {/* Category row */}
              <tr className="bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors">
                <td className="sticky left-0 bg-muted/30 z-10 px-3 py-1.5">
                  <button onClick={() => toggleCategory(cat.id)} className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                    {catLines.length > 0 ? (isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />) : <span className="w-3" />}
                    {cat.name}
                    <span className="text-muted-foreground font-normal ml-1">({catLines.length})</span>
                  </button>
                </td>
                {MONTH_KEYS.map((k, i) => (
                  <td key={k} className="px-2 py-1.5 text-[11px] font-semibold text-foreground text-right">{formatK(catTotalByMonth[i])}</td>
                ))}
                <td className="px-3 py-1.5 text-[12px] font-bold text-foreground text-right">{formatK(catGrand)}</td>
                <td className="px-2 py-1.5" />
              </tr>

              {/* Lines */}
              {!isCollapsed && catLines.map(line => (
                <tr key={line.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="sticky left-0 bg-card z-10 px-3 py-1 pl-8">
                    <div className="text-[11.5px] text-foreground">{line.country_label || 'Global'}</div>
                  </td>
                  {MONTH_KEYS.map(k => {
                    const val = Number(line[k as keyof BudgetLine] || 0);
                    const isEditing = editingCell?.lineId === line.id && editingCell?.month === k;
                    const compareLine = compareCatLines.find(cl => cl.category_id === line.category_id && cl.country_id === line.country_id);
                    const compareVal = compareLine ? Number(compareLine[k as keyof BudgetLine] || 0) : undefined;

                    return (
                      <td
                        key={k}
                        className={`px-1 py-1 text-right cursor-pointer transition-colors ${isEditing ? '' : 'hover:bg-accent/10'}`}
                        onClick={() => handleCellClick(line.id, k, val)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-1 py-0.5 text-[11px] text-right bg-accent/10 border border-accent rounded outline-none"
                          />
                        ) : (
                          <div>
                            <div className="text-[11px] text-foreground">{val === 0 ? '-' : `${val}K`}</div>
                            {compareVal !== undefined && compareVal !== val && (
                              <div className={`text-[9px] ${getVarianceClass(compareVal, val, isRevenue)}`}>
                                {val - compareVal > 0 ? '+' : ''}{val - compareVal}K
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1 text-right">
                    <span className="text-[12px] font-semibold text-foreground">{formatK(getLineTotal(line))}</span>
                  </td>
                  <td className="px-2 py-1 relative">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setCommentLineId(commentLineId === line.id ? null : line.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/10 transition-all"
                        title="Commentaires & historique"
                      >
                        <MessageSquare size={12} className="text-primary" />
                      </button>
                      {canWrite && !isLocked && (
                        <button
                          onClick={() => deleteLine.mutate({ id: line.id, scenario_id: scenarioId })}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 size={12} className="text-destructive" />
                        </button>
                      )}
                    </div>
                    {commentLineId === line.id && (
                      <div className="absolute right-0 top-full z-30 mt-1">
                        <LineCommentPanel
                          line={line}
                          category={categories.find(c => c.id === line.category_id)}
                          onClose={() => setCommentLineId(null)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </>
    );
  };

  // P&L calculation
  const revenueByMonth = MONTH_KEYS.map(k => getSectionTotal(revenueCategories, k));
  const expenseByMonth = MONTH_KEYS.map(k => getSectionTotal(expenseCategories, k));
  const netByMonth = revenueByMonth.map((r, i) => r - expenseByMonth[i]);
  const totalRevenue = getSectionGrandTotal(revenueCategories);
  const totalExpense = getSectionGrandTotal(expenseCategories);
  const netTotal = totalRevenue - totalExpense;

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-card">
      <table className="w-full min-w-[1100px] border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="sticky left-0 bg-muted/50 z-20 text-left px-3 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-[200px]">
              Poste budgétaire
            </th>
            {MONTHS.map(m => (
              <th key={m} className="px-2 py-2.5 text-[10px] font-bold text-muted-foreground text-right w-[70px]">{m}</th>
            ))}
            <th className="px-3 py-2.5 text-[11px] font-bold text-muted-foreground text-right w-[90px]">TOTAL</th>
            <th className="w-[36px]" />
          </tr>
        </thead>

        {renderCategorySection(revenueCategories, '📈 Revenus', true)}
        {renderCategorySection(expenseCategories, '📉 Dépenses', false)}

        {/* Net result row */}
        <tfoot>
          <tr className="bg-primary/10 border-t-2 border-primary">
            <td className="sticky left-0 bg-primary/10 z-10 px-3 py-2.5 text-[13px] font-bold text-primary">
              Résultat Net
            </td>
            {netByMonth.map((val, i) => (
              <td key={i} className={`px-2 py-2.5 text-[12px] font-bold text-right ${val >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatK(val)}
              </td>
            ))}
            <td className={`px-3 py-2.5 text-[13px] font-bold text-right ${netTotal >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {formatK(netTotal)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
