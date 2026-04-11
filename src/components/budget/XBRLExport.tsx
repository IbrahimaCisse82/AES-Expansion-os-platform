import { useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileCode } from 'lucide-react';
import { toast } from 'sonner';

interface XBRLExportProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioName: string;
  fiscalYear: number;
}

export default function XBRLExport({ lines, categories, scenarioName, fiscalYear }: XBRLExportProps) {
  const financialData = useMemo(() => {
    const budgetLines = lines.filter(l => l.line_type === 'budget');
    const revenueLines = budgetLines.filter(l => categories.find(c => c.id === l.category_id)?.type === 'revenue');
    const expenseLines = budgetLines.filter(l => categories.find(c => c.id === l.category_id)?.type === 'expense');
    const totalRevenue = revenueLines.reduce((s, l) => s + getLineTotal(l), 0);
    const totalExpenses = expenseLines.reduce((s, l) => s + getLineTotal(l), 0);
    const netIncome = totalRevenue - totalExpenses;

    const byCategory = categories.map(cat => {
      const catLines = budgetLines.filter(l => l.category_id === cat.id);
      return { name: cat.name, type: cat.type, total: catLines.reduce((s, l) => s + getLineTotal(l), 0) };
    }).filter(c => c.total !== 0);

    return { totalRevenue, totalExpenses, netIncome, byCategory };
  }, [lines, categories]);

  const generateXBRL = () => {
    const now = new Date().toISOString().split('T')[0];
    const periodEnd = `${fiscalYear}-12-31`;
    const periodStart = `${fiscalYear}-01-01`;

    const xbrl = `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:link="http://www.xbrl.org/2003/linkbase"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:iso4217="http://www.xbrl.org/2003/iso4217"
  xmlns:ifrs-full="http://xbrl.ifrs.org/taxonomy/2023-03-23/ifrs-full">

  <!-- Context -->
  <xbrli:context id="CurrentYear">
    <xbrli:entity>
      <xbrli:identifier scheme="http://www.expansion-os.com">${scenarioName}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:startDate>${periodStart}</xbrli:startDate>
      <xbrli:endDate>${periodEnd}</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>

  <!-- Unit -->
  <xbrli:unit id="XOF">
    <xbrli:measure>iso4217:XOF</xbrli:measure>
  </xbrli:unit>

  <!-- Revenue -->
  <ifrs-full:Revenue contextRef="CurrentYear" unitRef="XOF" decimals="0">${financialData.totalRevenue}</ifrs-full:Revenue>

  <!-- Cost of Sales -->
  <ifrs-full:CostOfSales contextRef="CurrentYear" unitRef="XOF" decimals="0">${financialData.totalExpenses}</ifrs-full:CostOfSales>

  <!-- Profit (Loss) -->
  <ifrs-full:ProfitLoss contextRef="CurrentYear" unitRef="XOF" decimals="0">${financialData.netIncome}</ifrs-full:ProfitLoss>

  <!-- Detailed Items -->
${financialData.byCategory.map(c => `  <!-- ${c.name} -->
  <ifrs-full:${c.type === 'revenue' ? 'OtherIncome' : 'OtherExpenseByNature'} contextRef="CurrentYear" unitRef="XOF" decimals="0">${c.total}</ifrs-full:${c.type === 'revenue' ? 'OtherIncome' : 'OtherExpenseByNature'}>
  </ifrs-full:${c.type === 'revenue' ? 'OtherIncome' : 'OtherExpenseByNature'}>`).join('\n')}

  <!-- Filing Info -->
  <!-- Generated: ${now} -->
  <!-- Scenario: ${scenarioName} -->
  <!-- Fiscal Year: ${fiscalYear} -->

</xbrli:xbrl>`;

    const blob = new Blob([xbrl], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbrl_${scenarioName}_${fiscalYear}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier XBRL généré');
  };

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FileCode className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-bold text-primary">Export XBRL</h3></div>
        <Button onClick={generateXBRL} size="sm" className="gap-1.5 text-[12px]" disabled={lines.length === 0}>
          <FileCode className="w-3.5 h-3.5" /> Générer XBRL
        </Button>
      </div>

      <Card className="p-4">
        <h4 className="text-[12px] font-semibold mb-3">Aperçu des données XBRL (IFRS)</h4>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Élément XBRL</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-muted-foreground">Taxonomy</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Valeur (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 bg-green-50/50">
                <td className="px-3 py-1.5 font-semibold">Revenue</td>
                <td className="px-2 py-1.5 text-muted-foreground">ifrs-full:Revenue</td>
                <td className="text-right px-3 py-1.5 font-bold text-green-600">{fmt(financialData.totalRevenue)}</td>
              </tr>
              <tr className="border-b border-border/50 bg-red-50/50">
                <td className="px-3 py-1.5 font-semibold">CostOfSales</td>
                <td className="px-2 py-1.5 text-muted-foreground">ifrs-full:CostOfSales</td>
                <td className="text-right px-3 py-1.5 font-bold text-destructive">{fmt(financialData.totalExpenses)}</td>
              </tr>
              <tr className="border-b border-border/50 bg-primary/5">
                <td className="px-3 py-1.5 font-bold text-primary">ProfitLoss</td>
                <td className="px-2 py-1.5 text-muted-foreground">ifrs-full:ProfitLoss</td>
                <td className={`text-right px-3 py-1.5 font-bold ${financialData.netIncome < 0 ? 'text-destructive' : 'text-green-600'}`}>{fmt(financialData.netIncome)}</td>
              </tr>
              {financialData.byCategory.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-3 py-1.5 pl-6">{c.name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground text-[10px]">ifrs-full:{c.type === 'revenue' ? 'OtherIncome' : 'OtherExpenseByNature'}</td>
                  <td className="text-right px-3 py-1.5">{fmt(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          ⓘ Le fichier XBRL généré suit la taxonomie IFRS 2023. Format : xBRL-XML instance document.
          Contexte : {scenarioName} • Période : {fiscalYear}-01-01 au {fiscalYear}-12-31 • Devise : FCFA (XOF)
        </p>
      </Card>
    </div>
  );
}
