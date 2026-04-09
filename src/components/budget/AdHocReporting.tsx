import { useState, useMemo } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

interface AdHocReportingProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
}

type ChartType = 'bar' | 'line' | 'pie' | 'area';
type Dimension = 'month' | 'country' | 'category' | 'line_type';
type Metric = 'total' | 'revenue' | 'expense' | 'net';

const COLORS = [
  'hsl(145, 40%, 52%)', 'hsl(209, 55%, 55%)', 'hsl(42, 80%, 52%)',
  'hsl(15, 70%, 55%)', 'hsl(300, 19%, 52%)', 'hsl(175, 40%, 45%)',
  'hsl(240, 45%, 55%)', 'hsl(25, 75%, 52%)',
];

export default function AdHocReporting({ lines, categories, countries }: AdHocReportingProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dimension, setDimension] = useState<Dimension>('country');
  const [metric, setMetric] = useState<Metric>('net');
  const [filterLineType, setFilterLineType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const revenueCategories = useMemo(() => categories.filter(c => c.type === 'revenue'), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

  const filteredLines = useMemo(() => {
    let result = lines;
    if (filterLineType !== 'all') result = result.filter(l => l.line_type === filterLineType);
    if (filterCategory !== 'all') result = result.filter(l => l.category_id === filterCategory);
    return result;
  }, [lines, filterLineType, filterCategory]);

  const getMetricValue = (subset: BudgetLine[]): number => {
    if (metric === 'total') return subset.reduce((s, l) => s + getLineTotal(l), 0);
    if (metric === 'revenue') return subset.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + getLineTotal(l), 0);
    if (metric === 'expense') return subset.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + getLineTotal(l), 0);
    // net
    const rev = subset.filter(l => revenueCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + getLineTotal(l), 0);
    const exp = subset.filter(l => expenseCategories.some(c => c.id === l.category_id)).reduce((s, l) => s + getLineTotal(l), 0);
    return rev - exp;
  };

  const chartData = useMemo(() => {
    if (dimension === 'month') {
      return MONTHS.map((m, i) => {
        const k = MONTH_KEYS[i];
        const rev = filteredLines.filter(l => revenueCategories.some(c => c.id === l.category_id))
          .reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
        const exp = filteredLines.filter(l => expenseCategories.some(c => c.id === l.category_id))
          .reduce((s, l) => s + Number(l[k as keyof BudgetLine] || 0), 0);
        return { name: m, value: metric === 'revenue' ? rev : metric === 'expense' ? exp : metric === 'net' ? rev - exp : rev + exp };
      });
    }
    if (dimension === 'country') {
      const map = new Map<string, BudgetLine[]>();
      filteredLines.forEach(l => {
        const key = l.country_label || 'Global';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(l);
      });
      return Array.from(map.entries()).map(([name, subset]) => ({
        name, value: getMetricValue(subset),
      })).filter(d => d.value !== 0).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    }
    if (dimension === 'category') {
      return categories.map(cat => {
        const subset = filteredLines.filter(l => l.category_id === cat.id);
        return { name: cat.name, value: subset.reduce((s, l) => s + getLineTotal(l), 0) };
      }).filter(d => d.value > 0);
    }
    // line_type
    const types = ['budget', 'actual', 'forecast'];
    return types.map(t => ({
      name: t === 'budget' ? 'Budget' : t === 'actual' ? 'Réel' : 'Prévision',
      value: getMetricValue(lines.filter(l => l.line_type === t)),
    })).filter(d => d.value !== 0);
  }, [filteredLines, dimension, metric, categories, revenueCategories, expenseCategories, lines]);

  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' };

  const renderChart = () => {
    if (chartData.length === 0) return <div className="text-center text-muted-foreground py-12">Aucune donnée pour cette sélection</div>;

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`]} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`]} />
            <Area type="monotone" dataKey="value" name="Valeur" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`]} />
            <Line type="monotone" dataKey="value" name="Valeur" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={dimension === 'category' ? -25 : 0} textAnchor={dimension === 'category' ? 'end' : 'middle'} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}K FCFA`]} />
          <Bar dataKey="value" name="Valeur" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-bold text-foreground">📊 Reporting ad hoc</h3>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 bg-muted/30 border border-border rounded-lg p-3">
        <div>
          <Label className="text-[10px]">Dimension</Label>
          <Select value={dimension} onValueChange={v => setDimension(v as Dimension)}>
            <SelectTrigger className="w-[130px] h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Par mois</SelectItem>
              <SelectItem value="country">Par pays</SelectItem>
              <SelectItem value="category">Par catégorie</SelectItem>
              <SelectItem value="line_type">Par type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Métrique</Label>
          <Select value={metric} onValueChange={v => setMetric(v as Metric)}>
            <SelectTrigger className="w-[120px] h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="net">Résultat net</SelectItem>
              <SelectItem value="revenue">Revenus</SelectItem>
              <SelectItem value="expense">Dépenses</SelectItem>
              <SelectItem value="total">Total</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Graphique</Label>
          <Select value={chartType} onValueChange={v => setChartType(v as ChartType)}>
            <SelectTrigger className="w-[100px] h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Barres</SelectItem>
              <SelectItem value="line">Ligne</SelectItem>
              <SelectItem value="area">Aire</SelectItem>
              <SelectItem value="pie">Camembert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Type de ligne</Label>
          <Select value={filterLineType} onValueChange={setFilterLineType}>
            <SelectTrigger className="w-[110px] h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="actual">Réel</SelectItem>
              <SelectItem value="forecast">Prévision</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Catégorie</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        {renderChart()}
      </div>

      {/* Summary table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">
                {dimension === 'month' ? 'Mois' : dimension === 'country' ? 'Pays' : dimension === 'category' ? 'Catégorie' : 'Type'}
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Valeur (K FCFA)</th>
              <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">% du total</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d, i) => {
              const total = chartData.reduce((s, x) => s + Math.abs(x.value), 0);
              return (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-semibold">{d.name}</td>
                  <td className={`text-right px-3 py-1.5 ${d.value >= 0 ? 'text-accent' : 'text-destructive'}`}>{Math.round(d.value)}K</td>
                  <td className="text-right px-3 py-1.5 text-muted-foreground">{total > 0 ? `${((Math.abs(d.value) / total) * 100).toFixed(1)}%` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
