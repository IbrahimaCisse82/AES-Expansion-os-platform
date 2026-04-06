import { BudgetLine, BudgetCategory, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import KpiCard from '@/components/KpiCard';

interface BudgetKPIsProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioName: string;
}

export default function BudgetKPIs({ lines, categories, scenarioName }: BudgetKPIsProps) {
  const budgetLines = lines.filter(l => l.line_type === 'budget');
  const actualLines = lines.filter(l => l.line_type === 'actual');

  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const totalRevenue = budgetLines
    .filter(l => revenueCategories.some(c => c.id === l.category_id))
    .reduce((s, l) => s + getLineTotal(l), 0);
  const totalExpense = budgetLines
    .filter(l => expenseCategories.some(c => c.id === l.category_id))
    .reduce((s, l) => s + getLineTotal(l), 0);
  const netBudget = totalRevenue - totalExpense;

  const actualRevenue = actualLines
    .filter(l => revenueCategories.some(c => c.id === l.category_id))
    .reduce((s, l) => s + getLineTotal(l), 0);
  const actualExpense = actualLines
    .filter(l => expenseCategories.some(c => c.id === l.category_id))
    .reduce((s, l) => s + getLineTotal(l), 0);

  const currentMonth = new Date().getMonth(); // 0-indexed
  const burnRate = actualExpense > 0 && currentMonth > 0
    ? Math.round(actualExpense / currentMonth)
    : 0;
  const runway = burnRate > 0 ? Math.round((totalExpense - actualExpense) / burnRate) : 0;

  const variancePct = totalExpense > 0
    ? Math.round(((actualExpense - totalExpense) / totalExpense) * 100)
    : 0;

  const formatVal = (v: number) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}M`;
    return `${v}K`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <KpiCard
        label="Budget Revenus"
        value={`${formatVal(totalRevenue)} FCFA`}
        meta={scenarioName}
        accentColor="sage"
      />
      <KpiCard
        label="Budget Dépenses"
        value={`${formatVal(totalExpense)} FCFA`}
        meta={`Résultat net : ${formatVal(netBudget)}`}
        accentColor={netBudget >= 0 ? 'sky' : 'terracotta'}
      />
      <KpiCard
        label="Dépensé (Réel)"
        value={`${formatVal(actualExpense)} FCFA`}
        meta={totalExpense > 0 ? `${Math.round(actualExpense / totalExpense * 100)}% du budget` : 'Aucun budget'}
        accentColor="gold"
        trend={variancePct !== 0 ? { value: `${variancePct > 0 ? '+' : ''}${variancePct}%`, up: variancePct > 0 } : undefined}
      />
      <KpiCard
        label="Burn Rate"
        value={burnRate > 0 ? `${formatVal(burnRate)} FCFA/mois` : 'N/A'}
        meta={runway > 0 ? `Runway : ${runway} mois` : 'Pas de données'}
        accentColor="plum"
      />
    </div>
  );
}
