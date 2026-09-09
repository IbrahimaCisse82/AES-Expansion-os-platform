import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { computeTotals, monthlySeries, rollupBy, formatFcfa, formatCompact, type BiFact, type BiFilters, type BiDimension } from '@/lib/biAggregate';

const DRILL: { dim: BiDimension; label: string; next?: BiDimension }[] = [
  { dim: 'country', label: 'Pays', next: 'pole' },
  { dim: 'pole', label: 'Pôle', next: 'project' },
  { dim: 'project', label: 'Projet', next: 'category' },
  { dim: 'category', label: 'Catégorie' },
];

interface Props { facts: BiFact[]; filters: BiFilters; }

export function BiOverview({ facts, filters }: Props) {
  const [level, setLevel] = useState(0);
  const totals = useMemo(() => computeTotals(facts, filters), [facts, filters]);
  const series = useMemo(() => monthlySeries(facts, filters), [facts, filters]);
  const rows = useMemo(() => rollupBy(facts, DRILL[level].dim, filters), [facts, filters, level]);

  const kpis = [
    { label: 'Budget global', value: totals.budget, hint: 'planifié' },
    { label: 'Réalisé', value: totals.actual, hint: 'dépensé / constaté' },
    { label: 'Écart', value: totals.variance, hint: totals.variance < 0 ? 'sous-consommation' : 'dépassement' },
    { label: 'Résultat net', value: totals.result, hint: 'revenus − dépenses' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold mt-1" title={formatFcfa(k.value)}>{formatCompact(k.value)} FCFA</p>
              <p className="text-[11px] text-muted-foreground mt-1">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="col-span-2 xl:col-span-4">
          <CardContent className="p-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Taux d'exécution</span>
            <span className={`text-sm font-semibold ${totals.pct > 100 ? 'text-destructive' : 'text-primary'}`}>{totals.pct.toFixed(1)} %</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${totals.pct > 100 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, totals.pct)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Budget vs Réalisé par mois</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series.map(p => ({ ...p, budget: p.budget / 1000, actual: p.actual / 1000 }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${formatCompact(v * 1000)} FCFA`} />
              <Legend />
              <Bar dataKey="budget" name="Budget (K FCFA)" fill="hsl(var(--primary) / 0.35)" radius={[3, 3, 0, 0]} />
              <Line dataKey="actual" name="Réalisé (K FCFA)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Répartition par {DRILL[level].label}</CardTitle>
            <div className="flex gap-1">
              {DRILL.map((d, i) => (
                <Button key={d.dim} size="sm" variant={i === level ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setLevel(i)}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows.filter(r => r.budget > 0)} dataKey="budget" nameKey="label" innerRadius={50} outerRadius={90}>
                    {rows.map((r, i) => <Cell key={r.key} fill={`hsl(var(--primary) / ${1 - i * 0.08})`} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatFcfa(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{DRILL[level].label}</TableHead>
                  <TableHead className="text-xs text-right">Budget</TableHead>
                  <TableHead className="text-xs text-right">Réalisé</TableHead>
                  <TableHead className="text-xs text-right">Écart</TableHead>
                  <TableHead className="text-xs text-right">Exéc.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map(r => (
                  <TableRow key={r.key}>
                    <TableCell className="text-xs">{r.label}</TableCell>
                    <TableCell className="text-xs text-right">{formatCompact(r.budget)}</TableCell>
                    <TableCell className="text-xs text-right">{formatCompact(r.actual)}</TableCell>
                    <TableCell className={`text-xs text-right ${r.variance > 0 ? 'text-destructive' : 'text-primary'}`}>{formatCompact(r.variance)}</TableCell>
                    <TableCell className="text-xs text-right">{r.pct.toFixed(0)} %</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Aucune donnée sur ce périmètre</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
