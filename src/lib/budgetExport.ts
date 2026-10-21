import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { downloadXlsx } from '@/lib/spreadsheet';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportParams {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioName: string;
  fiscalYear: number;
}

export async function exportBudgetXLSX({ lines, categories, scenarioName, fiscalYear }: ExportParams) {
  // P&L Sheet
  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const pnlData: (string | number)[][] = [];
  pnlData.push(['Compte de Résultat', '', ...MONTHS, 'TOTAL']);
  pnlData.push([]);

  const addSection = (cats: BudgetCategory[], sectionLabel: string, lineFilter: BudgetLine[]) => {
    pnlData.push([sectionLabel]);
    cats.forEach(cat => {
      const catLines = lineFilter.filter(l => l.category_id === cat.id);
      const values = MONTH_KEYS.map(k => catLines.reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0));
      pnlData.push([`  ${cat.name}`, '', ...values, values.reduce((a, b) => a + b, 0)]);
    });
    const totalValues = MONTH_KEYS.map(k =>
      lineFilter.filter(l => cats.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
    );
    pnlData.push([`Total ${sectionLabel}`, '', ...totalValues, totalValues.reduce((a, b) => a + b, 0)]);
    pnlData.push([]);
  };

  const budgetLines = lines.filter(l => l.line_type === 'budget');
  addSection(revenueCategories, 'Revenus', budgetLines);
  addSection(expenseCategories, 'Dépenses', budgetLines);

  const revByMonth = MONTH_KEYS.map(k =>
    budgetLines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
  );
  const expByMonth = MONTH_KEYS.map(k =>
    budgetLines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
  );
  const netByMonth = revByMonth.map((r, i) => r - expByMonth[i]);
  pnlData.push(['RÉSULTAT NET', '', ...netByMonth, netByMonth.reduce((a, b) => a + b, 0)]);

  // Detail Sheet
  const detailData: (string | number)[][] = [];
  detailData.push(['Catégorie', 'Type', 'Marché', 'Type ligne', ...MONTHS, 'TOTAL', 'Notes']);
  lines.forEach(l => {
    const cat = categories.find(c => c.id === l.category_id);
    const values = MONTH_KEYS.map(k => Number(l[k as keyof BudgetLine] || 0));
    detailData.push([
      cat?.name || '', cat?.type || '', l.country_label || 'Global', l.line_type,
      ...values, getLineTotal(l), l.notes || '',
    ]);
  });
  await downloadXlsx(
    [
      { name: 'P&L', rows: pnlData, widths: [25, 5, ...MONTHS.map(() => 10), 12] },
      { name: 'Détail', rows: detailData, widths: [20, 10, 15, 10, ...MONTHS.map(() => 10), 12, 30] },
    ],
    `Budget_${scenarioName}_${fiscalYear}.xlsx`,
  );
}

export function exportBudgetPDF({ lines, categories, scenarioName, fiscalYear }: ExportParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.text(`États Financiers — ${scenarioName}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Exercice ${fiscalYear}`, 14, 22);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 27);

  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const budgetLines = lines.filter(l => l.line_type === 'budget');

  const formatVal = (v: number) => v === 0 ? '-' : `${v}K`;

  // P&L table
  const tableRows: string[][] = [];

  const addCatSection = (cats: BudgetCategory[], sectionLabel: string) => {
    tableRows.push([sectionLabel, ...Array(13).fill('')]);
    cats.forEach(cat => {
      const catLines = budgetLines.filter(l => l.category_id === cat.id);
      const values = MONTH_KEYS.map(k => catLines.reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0));
      const total = values.reduce((a, b) => a + b, 0);
      tableRows.push([`  ${cat.name}`, ...values.map(formatVal), formatVal(total)]);
    });
  };

  addCatSection(revenueCategories, 'REVENUS');
  addCatSection(expenseCategories, 'DÉPENSES');

  const revByMonth = MONTH_KEYS.map(k =>
    budgetLines.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
  );
  const expByMonth = MONTH_KEYS.map(k =>
    budgetLines.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0)
  );
  const netByMonth = revByMonth.map((r, i) => r - expByMonth[i]);
  tableRows.push(['RÉSULTAT NET', ...netByMonth.map(formatVal), formatVal(netByMonth.reduce((a, b) => a + b, 0))]);

  autoTable(doc, {
    startY: 32,
    head: [['Poste', ...MONTHS, 'TOTAL']],
    body: tableRows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [28, 43, 58], textColor: 255, fontSize: 7 },
    columnStyles: { 0: { cellWidth: 35 } },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: function(data) {
      // Bold for section headers and net result
      if (data.section === 'body') {
        const text = String(data.cell.raw);
        if (text === 'REVENUS' || text === 'DÉPENSES' || text === 'RÉSULTAT NET') {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  doc.save(`Budget_${scenarioName}_${fiscalYear}.pdf`);
}
