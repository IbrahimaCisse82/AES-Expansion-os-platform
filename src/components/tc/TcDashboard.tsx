import { Fragment, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import {
  capacityPlan, dgDashboard, dormantStock, marginsBy, monthlySeries, stockNeeds, teamPerformance, type DgIndicator,
} from '@/lib/tc/aggregates';
import type { TcEngine } from './tcPeriod';
import { AlertBadge, MonthSelect, Section, money, moneyShort, monthLabel, objectiveClass, pct, qty } from './tcUi';

function fmt(v: number | null | undefined, f: DgIndicator['format']) {
  if (v === null || v === undefined) return '—';
  return f === 'money' ? money(v) : f === 'percent' ? pct(v, 1) : qty(v);
}

export default function TcDashboard({ engine, months, defaultMonth, periodStart }: { engine: TcEngine; months: string[]; defaultMonth: string; periodStart: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const { data, kits, sales } = engine;

  const view = useMemo(() => {
    const capacity = capacityPlan(data.teams, sales, months);
    const needs = stockNeeds(data, sales);
    const dormant = dormantStock(data, sales);
    const dg = dgDashboard({ data, kits, sales, month, periodStart, capacity, needs, dormant });
    const series = monthlySeries(months, sales, data.objectives);
    const upTo = sales.filter(s => s.saleMonth && s.saleMonth >= periodStart && s.saleMonth <= month);
    const bySolution = marginsBy(upTo, s => s.solution, data.solutions.map(s => ({ key: s.code, label: s.label })));
    const perf = teamPerformance(data.teams, sales, data.objectives, periodStart, month);
    return { dg, series, bySolution, perf };
  }, [data, kits, sales, month, months, periodStart]);

  const alerts = view.dg.alerts;
  const red = alerts.filter(a => a.level === 'Alerte').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelect value={month} months={months} onChange={setMonth} />
        <p className="text-[11.5px] text-muted-foreground">Période : {monthLabel(periodStart)} → {monthLabel(month)} · montants HT en {data.settings.currency}</p>
      </div>

      <Section title="Alertes et points d'attention" description={red > 0 ? `${red} alerte(s) à traiter` : 'Aucune alerte rouge'}>
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6">
          {alerts.map(a => (
            <li key={a.label} className="flex items-center justify-between gap-3 py-2 border-b border-border">
              <span className="text-xs">{a.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs tabular-nums text-muted-foreground">{a.value}</span>
                <AlertBadge level={a.level} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

          <Section title="Indicateurs du mois" description="Mois choisi, mois précédent et cumul depuis le début de la période.">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Indicateur</TableHead>
                    <TableHead className="text-xs text-right">Mois</TableHead>
                    <TableHead className="text-xs text-right">Objectif</TableHead>
                    <TableHead className="text-xs text-right">% obj.</TableHead>
                    <TableHead className="text-xs text-right">Mois préc.</TableHead>
                    <TableHead className="text-xs text-right">Évol.</TableHead>
                    <TableHead className="text-xs text-right">Cumul</TableHead>
                    <TableHead className="text-xs text-right">% obj. cumul</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.dg.indicators.map(sec => (
                    <Fragment key={sec.section}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={8} className="text-[11px] font-semibold uppercase tracking-wide py-1.5">{sec.section}</TableCell>
                      </TableRow>
                      {sec.rows.map(r => (
                        <TableRow key={`${sec.section}-${r.label}`}>
                          <TableCell className="text-xs py-1.5">{r.label}</TableCell>
                          <TableCell className="text-xs py-1.5 text-right tabular-nums font-medium">{fmt(r.month, r.format)}</TableCell>
                          <TableCell className="text-xs py-1.5 text-right tabular-nums">{r.target === undefined ? '' : fmt(r.target, r.format)}</TableCell>
                          <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(r.pct)}`}>{r.pct === undefined ? '' : pct(r.pct)}</TableCell>
                          <TableCell className="text-xs py-1.5 text-right tabular-nums">{r.previous === undefined ? '' : fmt(r.previous, r.format)}</TableCell>
                          <TableCell className={`text-xs py-1.5 text-right tabular-nums ${(r.evolution ?? 0) < 0 ? 'text-destructive' : ''}`}>{r.evolution === undefined || r.evolution === null ? '' : `${r.evolution > 0 ? '+' : ''}${pct(r.evolution)}`}</TableCell>
                          <TableCell className="text-xs py-1.5 text-right tabular-nums">{r.cumulative === undefined ? '' : fmt(r.cumulative, r.format)}</TableCell>
                          <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(r.cumulativePct)}`}>{r.cumulativePct === undefined ? '' : pct(r.cumulativePct)}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

      <Section title="Évolution mensuelle" description="Objectif de CA, CA vendu et encaissements (HT, encaissements TTC).">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={view.series.map(p => ({ ...p, label: monthLabel(p.month) }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => moneyShort(v).replace(/\u00a0FCFA/, '')} width={70} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="soldAmount" name="CA vendu" fill="hsl(var(--sky))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="collected" name="Encaissé" fill="hsl(var(--sage))" radius={[3, 3, 0, 0]} />
              <Line dataKey="targetRevenue" name="Objectif CA" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Performance par solution" description="Cumul de la période jusqu'au mois analysé.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Solution</TableHead>
                <TableHead className="text-xs text-right">Kits</TableHead>
                <TableHead className="text-xs text-right">CA HT</TableHead>
                <TableHead className="text-xs text-right">Marge nette</TableHead>
                <TableHead className="text-xs text-right">Marge %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.bySolution.map(r => (
                <TableRow key={r.key}>
                  <TableCell className="text-xs py-1.5">{r.label}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(r.kitsSold)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.revenueHT)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.netMargin)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{r.revenueHT ? pct(r.netMarginRate, 1) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
        <Section title="Performance par équipe" description="Cumul de la période jusqu'au mois analysé.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Équipe</TableHead>
                <TableHead className="text-xs text-right">CA vendu</TableHead>
                <TableHead className="text-xs text-right">Objectif</TableHead>
                <TableHead className="text-xs text-right">% obj.</TableHead>
                <TableHead className="text-xs text-right">Transfo.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.perf.rows.map(r => (
                <TableRow key={r.team.id}>
                  <TableCell className="text-xs py-1.5">{r.team.name}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.soldAmount)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.targetRevenue)}</TableCell>
                  <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(r.pctRevenue)}`}>{pct(r.pctRevenue)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{pct(r.conversionRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>
    </div>
  );
}
