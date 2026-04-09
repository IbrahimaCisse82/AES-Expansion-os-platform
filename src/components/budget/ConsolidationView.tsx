import { useMemo, useState } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { IntercompanyElimination } from '@/hooks/useBudgetConsolidation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, ChevronRight, Globe, Building2 } from 'lucide-react';

interface ConsolidationViewProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  eliminations: IntercompanyElimination[];
  countries: { id: string; name: string; flag: string; local_currency?: string; exchange_rate_to_fcfa?: number }[];
  lineType: 'budget' | 'actual' | 'forecast';
}

const COLORS = [
  'hsl(145, 40%, 52%)', 'hsl(209, 55%, 55%)', 'hsl(42, 80%, 52%)',
  'hsl(15, 70%, 55%)', 'hsl(300, 19%, 52%)', 'hsl(175, 40%, 45%)',
];

function formatK(val: number): string {
  if (val === 0) return '-';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}M`;
  return `${Math.round(val)}K`;
}

export default function ConsolidationView({ lines, categories, eliminations, countries, lineType }: ConsolidationViewProps) {
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [drillDownRegion, setDrillDownRegion] = useState<string | null>(null);

  const filteredLines = useMemo(() => lines.filter(l => l.line_type === lineType), [lines, lineType]);

  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Aggregate by country
  const countryAggregation = useMemo(() => {
    const map = new Map<string, { countryId: string; label: string; flag: string; revenue: number[]; expense: number[]; totalRevenue: number; totalExpense: number; net: number }>();

    filteredLines.forEach(l => {
      const key = l.country_id || '_global';
      const country = countries.find(c => c.id === key);
      if (!map.has(key)) {
        map.set(key, {
          countryId: key,
          label: l.country_label || 'Global (Holding)',
          flag: country?.flag || '🌍',
          revenue: Array(12).fill(0),
          expense: Array(12).fill(0),
          totalRevenue: 0,
          totalExpense: 0,
          net: 0,
        });
      }
      const entry = map.get(key)!;
      const isRevenue = revenueCategories.some(c => c.id === l.category_id);
      MONTH_KEYS.forEach((k, i) => {
        const val = Number(l[k as keyof BudgetLine] || 0);
        if (isRevenue) entry.revenue[i] += val;
        else entry.expense[i] += val;
      });
    });

    map.forEach(entry => {
      entry.totalRevenue = entry.revenue.reduce((a, b) => a + b, 0);
      entry.totalExpense = entry.expense.reduce((a, b) => a + b, 0);
      entry.net = entry.totalRevenue - entry.totalExpense;
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredLines, countries, revenueCategories]);

  // IC elimination totals
  const icTotalByMonth = useMemo(() => {
    return MONTH_KEYS.map((k, i) =>
      eliminations.reduce((s, el) => s + Number(el[`m${i + 1}` as keyof IntercompanyElimination] || 0), 0)
    );
  }, [eliminations]);

  // Consolidated totals (after eliminations)
  const consolidated = useMemo(() => {
    const grossRevenue = MONTH_KEYS.map((_, i) => countryAggregation.reduce((s, c) => s + c.revenue[i], 0));
    const grossExpense = MONTH_KEYS.map((_, i) => countryAggregation.reduce((s, c) => s + c.expense[i], 0));
    const netRevenue = grossRevenue.map((r, i) => r - icTotalByMonth[i]);
    const netExpense = grossExpense.map((e, i) => e - icTotalByMonth[i]);
    const netResult = netRevenue.map((r, i) => r - netExpense[i]);
    return {
      grossRevenue, grossExpense, netRevenue, netExpense, netResult,
      totalGrossRevenue: grossRevenue.reduce((a, b) => a + b, 0),
      totalGrossExpense: grossExpense.reduce((a, b) => a + b, 0),
      totalICElim: icTotalByMonth.reduce((a, b) => a + b, 0),
      totalNetResult: netResult.reduce((a, b) => a + b, 0),
    };
  }, [countryAggregation, icTotalByMonth]);

  // Pie data for country share
  const pieData = countryAggregation.filter(c => c.totalRevenue > 0).map(c => ({
    name: c.label, value: c.totalRevenue,
  }));

  // Bar chart data
  const barData = MONTHS.map((m, i) => ({
    month: m,
    revenue: consolidated.grossRevenue[i],
    expense: consolidated.grossExpense[i],
    eliminations: icTotalByMonth[i],
    net: consolidated.netRevenue[i] - consolidated.netExpense[i],
  }));

  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' };

  return (
    <div className="space-y-4">
      {/* Consolidated KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Revenus Consolidés</div>
          <div className="text-lg font-bold text-accent">{formatK(consolidated.totalGrossRevenue)} FCFA</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Dépenses Consolidées</div>
          <div className="text-lg font-bold text-destructive">{formatK(consolidated.totalGrossExpense)} FCFA</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Éliminations IC</div>
          <div className="text-lg font-bold text-[hsl(var(--gold))]">-{formatK(consolidated.totalICElim)} FCFA</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Résultat Net Groupe</div>
          <div className={`text-lg font-bold ${consolidated.totalNetResult >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {formatK(consolidated.totalNetResult)} FCFA
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Entités</div>
          <div className="text-lg font-bold text-primary">{countryAggregation.length}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
            <Globe size={14} /> P&L Consolidé Mensuel
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}K FCFA`, name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--accent))" opacity={0.8} radius={[2, 2, 0, 0]} />
              <Bar dataKey="expense" name="Dépenses" fill="hsl(var(--destructive))" opacity={0.6} radius={[2, 2, 0, 0]} />
              <Bar dataKey="net" name="Résultat" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {pieData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
              <Building2 size={14} /> Part de revenus par entité
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${formatK(v)} FCFA`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Drill-down table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="sticky left-0 bg-muted/50 z-10 text-left px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase w-[220px]">
                Entité / Pays
              </th>
              {MONTHS.map(m => (
                <th key={m} className="text-right px-2 py-2.5 text-[10px] font-bold text-muted-foreground w-[65px]">{m}</th>
              ))}
              <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground w-[90px]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {/* Country rows with drill-down */}
            {countryAggregation.map(country => {
              const isExpanded = expandedCountry === country.countryId;
              const countryLines = filteredLines.filter(l => (l.country_id || '_global') === country.countryId);
              return (
                <tbody key={country.countryId}>
                  <tr
                    className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedCountry(isExpanded ? null : country.countryId)}
                  >
                    <td className="sticky left-0 bg-card z-10 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span className="font-semibold">{country.label}</span>
                      </div>
                    </td>
                    {MONTH_KEYS.map((_, i) => (
                      <td key={i} className="text-right px-2 py-2">
                        <div className="text-accent">{formatK(country.revenue[i])}</div>
                        <div className="text-destructive text-[9px]">-{formatK(country.expense[i])}</div>
                      </td>
                    ))}
                    <td className="text-right px-3 py-2">
                      <div className={`font-bold ${country.net >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {formatK(country.net)}
                      </div>
                    </td>
                  </tr>
                  {/* Drill-down: detail by category */}
                  {isExpanded && categories.map(cat => {
                    const catLines = countryLines.filter(l => l.category_id === cat.id);
                    if (catLines.length === 0) return null;
                    const values = MONTH_KEYS.map(k => catLines.reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0));
                    const total = values.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={cat.id} className="border-b border-border/30 bg-muted/10">
                        <td className="sticky left-0 bg-muted/10 z-10 px-3 py-1 pl-8 text-[10px] text-muted-foreground">
                          {cat.type === 'revenue' ? '📈' : '📉'} {cat.name}
                        </td>
                        {values.map((v, i) => (
                          <td key={i} className="text-right px-2 py-1 text-[10px]">{formatK(v)}</td>
                        ))}
                        <td className="text-right px-3 py-1 text-[10px] font-semibold">{formatK(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}

            {/* IC Eliminations row */}
            {consolidated.totalICElim > 0 && (
              <tr className="border-b border-border bg-[hsl(var(--gold))]/5">
                <td className="sticky left-0 bg-[hsl(var(--gold))]/5 z-10 px-3 py-2 font-semibold text-[hsl(var(--gold))]">
                  🔄 Éliminations inter-compagnies
                </td>
                {icTotalByMonth.map((v, i) => (
                  <td key={i} className="text-right px-2 py-2 text-[hsl(var(--gold))]">-{formatK(v)}</td>
                ))}
                <td className="text-right px-3 py-2 font-bold text-[hsl(var(--gold))]">-{formatK(consolidated.totalICElim)}</td>
              </tr>
            )}

            {/* Consolidated total */}
            <tr className="bg-primary/10 border-t-2 border-primary">
              <td className="sticky left-0 bg-primary/10 z-10 px-3 py-2.5 text-[12px] font-bold text-primary">
                🏢 TOTAL CONSOLIDÉ GROUPE
              </td>
              {consolidated.netResult.map((v, i) => (
                <td key={i} className={`text-right px-2 py-2.5 text-[11px] font-bold ${v >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {formatK(v)}
                </td>
              ))}
              <td className={`text-right px-3 py-2.5 text-[12px] font-bold ${consolidated.totalNetResult >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatK(consolidated.totalNetResult)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
