import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { MONTH_LABELS, applyFilters, formatCompact, type BiFact, type BiFilters } from '@/lib/biAggregate';
import { fetchAllRows } from '@/lib/fetchAll';

interface Props { facts: BiFact[]; filters: BiFilters }

const pct = (c: number, p: number) => (p === 0 ? null : ((c - p) / p) * 100);
const fmtPct = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)} %`);

export function BiYearOverYear({ facts, filters }: Props) {
  const { data: scenarios = [] } = useQuery({
    queryKey: ['bi_scenario_years'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('budget_scenarios').select('id, fiscal_year');
      if (error) throw error;
      return data;
    },
  });
  const { data: kpis = [] } = useQuery({
    queryKey: ['bi_kpi_years'],
    staleTime: 60_000,
    queryFn: async () => {
      const ordered = supabase.from('kpi_history').select('country_id, month, ca, clients').order('id');
      return fetchAllRows((from, to) => ordered.range(from, to));
    },
  });

  const yearOf = useMemo(() => new Map(scenarios.map(s => [s.id, s.fiscal_year])), [scenarios]);
  const years = useMemo(() => {
    const set = new Set<number>(scenarios.map(s => s.fiscal_year));
    kpis.forEach(k => set.add(Number(k.month.slice(0, 4))));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [scenarios, kpis]);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const prev = year - 1;
  // Comparaison inter-années : on ignore le filtre scénario
  const scoped = useMemo(() => applyFilters(facts, { ...filters, scenarioId: null }), [facts, filters]);

  const sum = (y: number, type: string, m: number) =>
    scoped.reduce((s, f) => (yearOf.get(f.scenario_id) === y && f.line_type === type ? s + (f.months[m] || 0) : s), 0);

  const kpiSum = (y: number, m: number, key: 'ca' | 'clients') =>
    kpis.reduce((s, k) => {
      if (filters.countryId && k.country_id !== filters.countryId) return s;
      return k.month === `${y}-${String(m + 1).padStart(2, '0')}` ? s + Number(k[key]) : s;
    }, 0);

  const rows = MONTH_LABELS.map((label, m) => ({
    month: label,
    actualN: sum(year, 'actual', m), actualN1: sum(prev, 'actual', m),
    budgetN: sum(year, 'budget', m), budgetN1: sum(prev, 'budget', m),
    caN: kpiSum(year, m, 'ca'), caN1: kpiSum(prev, m, 'ca'),
  })).filter((_, m) => m + 1 >= filters.monthFrom && m + 1 <= filters.monthTo);

  const tot = (k: keyof typeof rows[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const cards = [
    { label: 'Budget', c: tot('budgetN'), p: tot('budgetN1') },
    { label: 'Réalisé', c: tot('actualN'), p: tot('actualN1') },
    { label: "Chiffre d'affaires (KPI)", c: tot('caN'), p: tot('caN1') },
  ];
  const hasPrev = cards.some(c => c.p > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Année comparée</span>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">vs {prev}</span>
      </div>

      {!hasPrev && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md p-3">
          Aucune donnée {prev} sur ce périmètre. Créez un scénario budgétaire pour l'exercice {prev} ou saisissez les KPI {prev} pour activer la comparaison.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map(c => {
          const v = pct(c.c, c.p);
          return (
            <Card key={c.label}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold mt-1">{formatCompact(c.c)} FCFA</p>
              <p className={`text-xs mt-1 ${v === null ? 'text-muted-foreground' : v >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {fmtPct(v)} <span className="text-muted-foreground">({prev} : {formatCompact(c.p)})</span>
              </p>
            </CardContent></Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Réalisé {year} vs {prev} par mois</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip formatter={(v: number) => `${formatCompact(v)} FCFA`} />
              <Legend />
              <Bar dataKey="actualN1" name={`Réalisé ${prev}`} fill="hsl(var(--muted-foreground) / 0.35)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actualN" name={`Réalisé ${year}`} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Line dataKey="caN" name={`CA ${year}`} stroke="hsl(var(--accent))" strokeWidth={2} />
              <Line dataKey="caN1" name={`CA ${prev}`} stroke="hsl(var(--accent))" strokeDasharray="4 4" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Mois</TableHead>
            <TableHead className="text-xs text-right">Réalisé {prev}</TableHead>
            <TableHead className="text-xs text-right">Réalisé {year}</TableHead>
            <TableHead className="text-xs text-right">Évol.</TableHead>
            <TableHead className="text-xs text-right">CA {prev}</TableHead>
            <TableHead className="text-xs text-right">CA {year}</TableHead>
            <TableHead className="text-xs text-right">Évol.</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.month}>
                <TableCell className="text-xs">{r.month}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(r.actualN1)}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(r.actualN)}</TableCell>
                <TableCell className="text-xs text-right">{fmtPct(pct(r.actualN, r.actualN1))}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(r.caN1)}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(r.caN)}</TableCell>
                <TableCell className="text-xs text-right">{fmtPct(pct(r.caN, r.caN1))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
