import KpiCard from '@/components/KpiCard';
import { budgetData, budgetCategories } from '@/data/expansionData';

const budgetColors: Record<string, string> = {
  sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum',
};
const textColors: Record<string, string> = {
  sage: 'text-sage', sky: 'text-sky', gold: 'text-gold', terracotta: 'text-terracotta', plum: 'text-plum',
};

export default function BudgetPage() {
  const totalAllocated = budgetData.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);
  const remaining = totalAllocated - totalSpent;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Budget & Finances</h2>
        <p className="text-[12.5px] text-muted-foreground">Allocation et consommation du budget d'expansion · Exercice 2025</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Budget Total" value="6.5M€" meta="Approuvé CA · Jan 2025" accentColor="sage" />
        <KpiCard label="Dépensé" value={`${(totalSpent / 1000).toFixed(1)}M€`} meta="du budget" accentColor="gold" trend={{ value: `${Math.round(totalSpent / totalAllocated * 100)}%`, up: false }} />
        <KpiCard label="Restant" value={`${(remaining / 1000).toFixed(1)}M€`} meta="disponible" accentColor="sky" trend={{ value: `${Math.round(remaining / totalAllocated * 100)}%`, up: true }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* By Market */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Par Marché</h3>
          <div className="space-y-0">
            {budgetData.map((b, i) => {
              const pct = Math.round(b.spent / b.allocated * 100);
              return (
                <div key={i} className="py-3 border-b border-ivory last:border-b-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[13px] font-medium">{b.country}</span>
                    <span className={`text-[11.5px] font-semibold ${textColors[b.color]}`}>
                      {(b.spent / 1000).toFixed(b.spent >= 1000 ? 2 : 0)}{b.spent >= 1000 ? 'M' : 'K'} / {(b.allocated / 1000).toFixed(1)}M€ · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-ivory rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${budgetColors[b.color]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Par Catégorie</h3>
          <div className="space-y-0">
            {budgetCategories.map((cat, i) => (
              <div key={i} className="py-3 border-b border-ivory last:border-b-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-medium">{cat.name}</span>
                  <span className={`text-[11.5px] font-semibold ${textColors[cat.color]}`}>{cat.amount}K€</span>
                </div>
                <div className="h-1.5 bg-ivory rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${budgetColors[cat.color]} transition-all duration-700`} style={{ width: `${cat.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
