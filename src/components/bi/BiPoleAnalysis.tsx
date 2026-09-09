import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { rollupBy, formatCompact, formatFcfa, type BiFact, type BiFilters } from '@/lib/biAggregate';

interface Props { facts: BiFact[]; filters: BiFilters; }

export function BiPoleAnalysis({ facts, filters }: Props) {
  const rows = useMemo(() => rollupBy(facts, 'pole', filters), [facts, filters]);
  const chartData = rows.map(r => ({ name: r.label, budget: r.budget / 1000, actual: r.actual / 1000, margin: (r.budget - r.actual) / 1000 }));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Budget vs Réalisé par pôle (K FCFA)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${formatCompact(v * 1000)} FCFA`} />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="hsl(var(--primary) / 0.35)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" name="Réalisé" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Détail par pôle</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Pôle</TableHead>
                <TableHead className="text-xs text-right">Budget</TableHead>
                <TableHead className="text-xs text-right">Réalisé</TableHead>
                <TableHead className="text-xs text-right">Écart</TableHead>
                <TableHead className="text-xs text-right">Exéc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.key}>
                  <TableCell className="text-xs font-medium">{r.label}</TableCell>
                  <TableCell className="text-xs text-right" title={formatFcfa(r.budget)}>{formatCompact(r.budget)}</TableCell>
                  <TableCell className="text-xs text-right" title={formatFcfa(r.actual)}>{formatCompact(r.actual)}</TableCell>
                  <TableCell className={`text-xs text-right ${r.variance > 0 ? 'text-destructive' : 'text-primary'}`}>{formatCompact(r.variance)}</TableCell>
                  <TableCell className="text-xs text-right">{r.pct.toFixed(0)} %</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">Aucune ligne rattachée à un pôle sur ce périmètre</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
