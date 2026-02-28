import KpiCard from '@/components/KpiCard';
import { useBudgetEntries } from '@/hooks/useExpansionData';

const budgetColors: Record<string, string> = { sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum' };
const textColors: Record<string, string> = { sage: 'text-sage', sky: 'text-sky', gold: 'text-gold', terracotta: 'text-terracotta', plum: 'text-plum' };

export default function BudgetPage() {
  const { data: entries = [], isLoading } = useBudgetEntries();

  const byMarket = entries.filter(e => e.category === 'market');
  const byCategory = entries.filter(e => e.category !== 'market');
  const totalAllocated = byMarket.reduce((s, b) => s + b.allocated_k, 0);
  const totalSpent = byMarket.reduce((s, b) => s + b.spent_k, 0);
  const remaining = totalAllocated - totalSpent;

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Budget & Finances</h2>
        <p className="text-[12.5px] text-muted-foreground">Allocation et consommation · Exercice 2025</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Budget Total" value={`${(totalAllocated / 1000).toFixed(1)}M€`} meta="Approuvé CA" accentColor="sage" />
        <KpiCard label="Dépensé" value={`${(totalSpent / 1000).toFixed(1)}M€`} meta="du budget" accentColor="gold" trend={{ value: `${Math.round(totalSpent / totalAllocated * 100)}%`, up: false }} />
        <KpiCard label="Restant" value={`${(remaining / 1000).toFixed(1)}M€`} meta="disponible" accentColor="sky" trend={{ value: `${Math.round(remaining / totalAllocated * 100)}%`, up: true }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Par Marché</h3>
          {byMarket.map(b => {
            const pct = Math.round(b.spent_k / b.allocated_k * 100);
            return (
              <div key={b.id} className="py-3 border-b border-ivory last:border-b-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-medium">{b.country_label}</span>
                  <span className={`text-[11.5px] font-semibold ${textColors[b.color || 'sage']}`}>{b.spent_k}K / {b.allocated_k}K€ · {pct}%</span>
                </div>
                <div className="h-1.5 bg-ivory rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${budgetColors[b.color || 'sage']}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Par Catégorie</h3>
          {byCategory.map(cat => {
            const pct = Math.round(cat.spent_k / cat.allocated_k * 100);
            return (
              <div key={cat.id} className="py-3 border-b border-ivory last:border-b-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-medium">{cat.category}</span>
                  <span className={`text-[11.5px] font-semibold ${textColors[cat.color || 'sage']}`}>{cat.spent_k}K€</span>
                </div>
                <div className="h-1.5 bg-ivory rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${budgetColors[cat.color || 'sage']}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
