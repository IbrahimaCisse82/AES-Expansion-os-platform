import { useMemo, useState } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FinancialStatementsProps {
  budgetLines: BudgetLine[];
  actualLines: BudgetLine[];
  categories: BudgetCategory[];
}

function formatK(val: number): string {
  if (val === 0) return '-';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}M`;
  return `${val}K`;
}

function StatementTable({ rows, title }: { rows: { label: string; values: number[]; total: number; isBold?: boolean; isTotal?: boolean; indent?: boolean }[]; title: string }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-[11px]">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="sticky left-0 bg-muted/50 z-10 text-left px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase w-[220px]">{title}</th>
            {MONTHS.map(m => (
              <th key={m} className="text-right px-2 py-2.5 text-[10px] font-bold text-muted-foreground w-[65px]">{m}</th>
            ))}
            <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground w-[80px]">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b ${row.isTotal ? 'border-t-2 border-primary bg-primary/5' : 'border-border/50'} ${row.isBold ? 'bg-muted/30' : ''}`}>
              <td className={`sticky left-0 z-10 px-3 py-1.5 ${row.isTotal ? 'bg-primary/5 font-bold text-primary' : row.isBold ? 'bg-muted/30 font-semibold' : 'bg-card'} ${row.indent ? 'pl-6' : ''}`}>
                {row.label}
              </td>
              {row.values.map((v, mi) => (
                <td key={mi} className={`text-right px-2 py-1.5 ${row.isTotal ? 'font-bold' : ''} ${v < 0 ? 'text-destructive' : ''}`}>
                  {formatK(v)}
                </td>
              ))}
              <td className={`text-right px-3 py-1.5 font-bold ${row.isTotal ? '' : ''} ${row.total < 0 ? 'text-destructive' : ''}`}>
                {formatK(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancialStatements({ budgetLines, actualLines, categories }: FinancialStatementsProps) {
  const [source, setSource] = useState<'budget' | 'actual'>('budget');
  const lines = source === 'budget' ? budgetLines : actualLines;

  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // P&L rows
  const pnlRows = useMemo(() => {
    const rows: { label: string; values: number[]; total: number; isBold?: boolean; isTotal?: boolean; indent?: boolean }[] = [];

    // Revenue section
    rows.push({ label: '📈 REVENUS', values: Array(12).fill(0), total: 0, isBold: true });
    revenueCategories.forEach(cat => {
      const catLines = lines.filter(l => l.category_id === cat.id);
      const values = MONTH_KEYS.map(k => catLines.reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0));
      rows.push({ label: cat.name, values, total: values.reduce((a, b) => a + b, 0), indent: true });
    });
    const totalRevByMonth = MONTH_KEYS.map(k =>
      lines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );
    rows.push({ label: 'Total Revenus', values: totalRevByMonth, total: totalRevByMonth.reduce((a, b) => a + b, 0), isBold: true });

    // Expense section
    rows.push({ label: '📉 DÉPENSES', values: Array(12).fill(0), total: 0, isBold: true });
    expenseCategories.forEach(cat => {
      const catLines = lines.filter(l => l.category_id === cat.id);
      const values = MONTH_KEYS.map(k => catLines.reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0));
      rows.push({ label: cat.name, values, total: values.reduce((a, b) => a + b, 0), indent: true });
    });
    const totalExpByMonth = MONTH_KEYS.map(k =>
      lines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );
    rows.push({ label: 'Total Dépenses', values: totalExpByMonth, total: totalExpByMonth.reduce((a, b) => a + b, 0), isBold: true });

    // Net
    const netByMonth = totalRevByMonth.map((r, i) => r - totalExpByMonth[i]);
    rows.push({ label: 'RÉSULTAT NET', values: netByMonth, total: netByMonth.reduce((a, b) => a + b, 0), isTotal: true });

    return rows;
  }, [lines, revenueCategories, expenseCategories]);

  // Balance Sheet (simplified)
  const balanceRows = useMemo(() => {
    const totalRevByMonth = MONTH_KEYS.map(k =>
      lines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );
    const totalExpByMonth = MONTH_KEYS.map(k =>
      lines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );

    let cumCash = 0;
    const cashByMonth = totalRevByMonth.map((r, i) => { cumCash += r - totalExpByMonth[i]; return cumCash; });

    // Simplified: receivables = 30% of revenue (unpaid), payables = 20% of expenses (unpaid)
    const receivables = totalRevByMonth.map(r => Math.round(r * 0.3));
    const payables = totalExpByMonth.map(e => Math.round(e * 0.2));

    const totalAssets = cashByMonth.map((cash, i) => cash + receivables[i]);
    const equity = cashByMonth;
    const totalLiabilities = payables.map((p, i) => p + equity[i]);

    return [
      { label: '💼 ACTIFS', values: Array(12).fill(0), total: 0, isBold: true },
      { label: 'Trésorerie', values: cashByMonth, total: cumCash, indent: true },
      { label: 'Créances clients', values: receivables, total: receivables.reduce((a, b) => a + b, 0), indent: true },
      { label: 'TOTAL ACTIFS', values: totalAssets, total: totalAssets[11] || 0, isTotal: true },
      { label: '📋 PASSIFS & CAPITAUX', values: Array(12).fill(0), total: 0, isBold: true },
      { label: 'Dettes fournisseurs', values: payables, total: payables.reduce((a, b) => a + b, 0), indent: true },
      { label: 'Capitaux propres', values: equity, total: cumCash, indent: true },
      { label: 'TOTAL PASSIFS', values: totalLiabilities, total: totalLiabilities[11] || 0, isTotal: true },
    ];
  }, [lines, revenueCategories, expenseCategories]);

  // Cash Flow Statement
  const cashFlowRows = useMemo(() => {
    const totalRevByMonth = MONTH_KEYS.map(k =>
      lines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );
    const totalExpByMonth = MONTH_KEYS.map(k =>
      lines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );

    const operatingCF = totalRevByMonth.map((r, i) => r - totalExpByMonth[i]);
    // Simplified investing (capex = 5% of expenses)
    const investingCF = totalExpByMonth.map(e => -Math.round(e * 0.05));
    const financingCF = Array(12).fill(0);
    const netCF = operatingCF.map((op, i) => op + investingCF[i] + financingCF[i]);
    let cumCash = 0;
    const endingCash = netCF.map(cf => { cumCash += cf; return cumCash; });

    return [
      { label: '🏭 ACTIVITÉS OPÉRATIONNELLES', values: Array(12).fill(0), total: 0, isBold: true },
      { label: 'Résultat net', values: operatingCF, total: operatingCF.reduce((a, b) => a + b, 0), indent: true },
      { label: 'Cash flow opérationnel', values: operatingCF, total: operatingCF.reduce((a, b) => a + b, 0), isBold: true },
      { label: '🏗️ ACTIVITÉS D\'INVESTISSEMENT', values: Array(12).fill(0), total: 0, isBold: true },
      { label: 'Investissements (CAPEX)', values: investingCF, total: investingCF.reduce((a, b) => a + b, 0), indent: true },
      { label: '💳 ACTIVITÉS DE FINANCEMENT', values: Array(12).fill(0), total: 0, isBold: true },
      { label: 'Financement net', values: financingCF, total: 0, indent: true },
      { label: 'VARIATION NETTE DE TRÉSORERIE', values: netCF, total: netCF.reduce((a, b) => a + b, 0), isTotal: true },
      { label: 'Trésorerie fin de période', values: endingCash, total: cumCash, isBold: true },
    ];
  }, [lines, revenueCategories, expenseCategories]);

  return (
    <div className="space-y-4">
      {/* Source toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Source :</span>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(['budget', 'actual'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${source === s ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s === 'budget' ? 'Budget' : 'Réel'}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl" className="text-[11px]">📊 Compte de Résultat (P&L)</TabsTrigger>
          <TabsTrigger value="balance" className="text-[11px]">📋 Bilan</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-[11px]">💰 Flux de Trésorerie</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <StatementTable rows={pnlRows} title="Compte de Résultat" />
        </TabsContent>

        <TabsContent value="balance">
          <StatementTable rows={balanceRows} title="Bilan" />
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            * Bilan simplifié basé sur les données budgétaires. Créances = 30% revenus, Dettes fournisseurs = 20% dépenses.
          </p>
        </TabsContent>

        <TabsContent value="cashflow">
          <StatementTable rows={cashFlowRows} title="Flux de Trésorerie" />
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            * Cash flow simplifié. CAPEX estimé à 5% des dépenses opérationnelles.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
