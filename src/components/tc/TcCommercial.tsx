import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import {
  marginsBy, monthlySeries, repCommissions, salesByKit, teamCommissions, teamForecasts, teamPerformance,
  type MarginRow, type Stage, type TeamPerf,
} from '@/lib/tc/aggregates';
import { formatDateFr } from '@/lib/dates';
import type { TcEngine } from './tcPeriod';
import { MonthSelect, Section, Stat, money, moneyShort, monthLabel, objectiveClass, pct, qty } from './tcUi';

// ---------------------------------------------------------------------
// PERF_EQUIPES
// ---------------------------------------------------------------------
function PerfTable({ rows, total }: { rows: TeamPerf[]; total: Omit<TeamPerf, 'team' | 'rank'> }) {
  const line = (label: string, r: Omit<TeamPerf, 'team' | 'rank'>, rank: number | null, bold = false) => (
    <TableRow key={label} className={bold ? 'border-t-2 font-semibold' : ''}>
      <TableCell className="text-xs py-1.5">{label}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(r.quotedQty)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.quotedAmount)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(r.soldQty)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.soldAmount)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(r.deliveredQty)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.deliveredAmount)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(r.targetQty)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.targetRevenue)}</TableCell>
      <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(r.pctQty)}`}>{pct(r.pctQty)}</TableCell>
      <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(r.pctRevenue)}`}>{pct(r.pctRevenue)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{pct(r.conversionRate)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{rank ?? ''}</TableCell>
    </TableRow>
  );
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {['Équipe', 'Qté devisée', 'Montant devisé HT', 'Qté vendue', 'CA vendu HT', 'Qté livrée', 'CA livré HT', 'Objectif qté', 'Objectif CA', '% obj. qté', '% obj. CA', 'Transfo. devis', 'Rang']
              .map((h, i) => <TableHead key={h} className={`text-xs ${i ? 'text-right' : ''}`}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => line(r.team.name, r, r.rank))}
          {line('TOTAL', total, null, true)}
        </TableBody>
      </Table>
    </div>
  );
}

export function TcPerformance({ engine, months, defaultMonth, periodStart }: { engine: TcEngine; months: string[]; defaultMonth: string; periodStart: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const { data, sales } = engine;
  const monthPerf = useMemo(() => teamPerformance(data.teams, sales, data.objectives, month, month), [data, sales, month]);
  const cumul = useMemo(() => teamPerformance(data.teams, sales, data.objectives, periodStart, month), [data, sales, month, periodStart]);
  return (
    <div className="space-y-4">
      <MonthSelect value={month} months={months} onChange={setMonth} />
      <Section title={`Performance du mois : ${monthLabel(month)}`} description="Devisé au mois du devis, vendu au mois de la vente, livré au mois de la livraison. Vert ≥ 100 %, orange 70–99 %, rouge < 70 %.">
        <PerfTable {...monthPerf} />
      </Section>
      <Section title={`Cumul de ${monthLabel(periodStart)} à ${monthLabel(month)}`}>
        <PerfTable {...cumul} />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// MARGES_ENCAISSEMENTS
// ---------------------------------------------------------------------
function MarginTable({ rows, first }: { rows: MarginRow[]; first: string }) {
  const total = rows.reduce((t, r) => ({
    kitsSold: t.kitsSold + r.kitsSold, revenueHT: t.revenueHT + r.revenueHT, cost: t.cost + r.cost, grossMargin: t.grossMargin + r.grossMargin,
    revenueTTC: t.revenueTTC + r.revenueTTC, collected: t.collected + r.collected, remaining: t.remaining + r.remaining,
    overdueAmount: t.overdueAmount + r.overdueAmount, overdueCount: t.overdueCount + r.overdueCount, travel: t.travel + r.travel,
    warranty: t.warranty + r.warranty, netMargin: t.netMargin + r.netMargin,
  }), { kitsSold: 0, revenueHT: 0, cost: 0, grossMargin: 0, revenueTTC: 0, collected: 0, remaining: 0, overdueAmount: 0, overdueCount: 0, travel: 0, warranty: 0, netMargin: 0 });
  const cells = (r: typeof total) => [
    qty(r.kitsSold), money(r.revenueHT), money(r.cost), money(r.grossMargin), r.revenueHT ? pct(r.grossMargin / r.revenueHT, 1) : '—',
    money(r.revenueTTC), money(r.collected), money(r.remaining), r.revenueTTC ? pct(r.collected / r.revenueTTC) : '—',
    money(r.overdueAmount), String(r.overdueCount), money(r.travel), money(r.warranty), money(r.netMargin), r.revenueHT ? pct(r.netMargin / r.revenueHT, 1) : '—',
  ];
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {[first, 'Kits vendus', 'CA HT', 'Coût de revient', 'Marge brute', 'Marge %', 'CA TTC', 'Encaissé', 'Reste à encaisser', '% encaissé', 'Créances en retard', 'Nb en retard', 'Frais déplacement', 'Provision SAV', 'Marge nette', 'Marge nette %']
              .map((h, i) => <TableHead key={h} className={`text-xs whitespace-nowrap ${i ? 'text-right' : ''}`}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.key}>
              <TableCell className="text-xs py-1.5 whitespace-nowrap">{r.label}</TableCell>
              {cells(r).map((c, i) => <TableCell key={i} className={`text-xs py-1.5 text-right tabular-nums ${i === 9 && r.overdueAmount > 0 ? 'text-destructive font-semibold' : ''}`}>{c}</TableCell>)}
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-semibold">
            <TableCell className="text-xs py-1.5">TOTAL</TableCell>
            {cells(total).map((c, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums">{c}</TableCell>)}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function TcMargins({ engine }: { engine: TcEngine }) {
  const { data, sales } = engine;
  const byTeam = useMemo(() => marginsBy(sales, s => s.sale.team_id, data.teams.map(t => ({ key: t.id, label: t.name }))), [sales, data.teams]);
  const byKit = useMemo(() => marginsBy(sales, s => s.sale.kit_id, data.kits.map(k => ({ key: k.id, label: `${k.code}` }))).filter(r => r.kitsSold > 0 || r.remaining > 0), [sales, data.kits]);
  const overdue = useMemo(() => sales.filter(s => (s.daysLate ?? 0) > 0).sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0)), [sales]);
  const receivable = useMemo(() => sales.filter(s => (s.remaining ?? 0) > 0.5), [sales]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="CA HT ferme" value={money(byTeam.reduce((s, r) => s + r.revenueHT, 0))} hint="ventes Vendu + Livré" />
        <Stat label="Marge nette" value={money(byTeam.reduce((s, r) => s + r.netMargin, 0))} />
        <Stat label="Reste à encaisser" value={money(receivable.reduce((s, r) => s + (r.remaining ?? 0), 0))} hint={`${receivable.length} vente(s)`} />
        <Stat label="Créances en retard" value={money(overdue.reduce((s, r) => s + (r.remaining ?? 0), 0))} hint={`au-delà de ${data.settings.payment_delay_days} j après livraison`} tone={overdue.length ? 'text-destructive' : undefined} />
      </div>
      <Section title="A. Par équipe" description="Ventes fermes (Vendu + Livré). Marge = montant HT – prix de revient figé à la vente.">
        <MarginTable rows={byTeam} first="Équipe" />
      </Section>
      <Section title="B. Par kit">
        {byKit.length ? <MarginTable rows={byKit} first="Kit" /> : <p className="text-sm text-muted-foreground py-4 text-center">Aucune vente ferme.</p>}
      </Section>
      <Section title="C. Créances en retard — à relancer" description="Triées par ancienneté du retard.">
        {overdue.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Aucune créance en retard.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                {['N° devis', 'Client', 'Équipe', 'Livré le', 'Montant TTC', 'Encaissé', 'Reste dû', 'Retard'].map((h, i) => <TableHead key={h} className={`text-xs ${i > 3 ? 'text-right' : ''}`}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map(s => (
                <TableRow key={s.sale.id}>
                  <TableCell className="text-xs py-1.5">{s.sale.quote_no}</TableCell>
                  <TableCell className="text-xs py-1.5">{s.sale.client}</TableCell>
                  <TableCell className="text-xs py-1.5">{s.teamName}</TableCell>
                  <TableCell className="text-xs py-1.5">{formatDateFr(s.sale.delivery_date)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(s.amountTTC)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(s.collected)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums font-semibold">{money(s.remaining)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right"><Badge variant="outline" className="border-0 bg-destructive/10 text-destructive text-[11px]">{s.daysLate} j</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// COMMISSIONS_PREVISIONS
// ---------------------------------------------------------------------
export function TcCommissions({ engine, months, defaultMonth }: { engine: TcEngine; months: string[]; defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const { data, sales } = engine;
  const teams = useMemo(() => teamCommissions(data.teams, sales, data.objectives, month, data.settings), [data, sales, month]);
  const forecasts = useMemo(() => teamForecasts(data.teams, sales, data.objectives), [data, sales]);
  const reps = useMemo(() => repCommissions(sales), [sales]);
  const s = data.settings;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelect value={month} months={months} onChange={setMonth} />
        <p className="text-[11.5px] text-muted-foreground">
          Commission {pct(s.commission_rate, 1)} du CA HT vendu, + bonus {pct(s.bonus_rate, 1)} si l'équipe atteint {pct(s.bonus_threshold)} de son objectif du mois ; payable quand le client a soldé.
        </p>
      </div>
      <Section title={`A. Commissions du mois par équipe — ${monthLabel(month)}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {['Équipe', 'CA HT vendu', 'Objectif CA', '% objectif', 'Commission de base', 'Bonus objectif', 'Commission totale', 'dont payable'].map((h, i) => <TableHead key={h} className={`text-xs ${i ? 'text-right' : ''}`}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map(t => (
              <TableRow key={t.team.id}>
                <TableCell className="text-xs py-1.5">{t.team.name}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(t.revenue)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(t.target)}</TableCell>
                <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(t.pct)}`}>{pct(t.pct)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(t.base)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(t.bonus)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums font-semibold">{money(t.total)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(t.payable)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-semibold">
              <TableCell className="text-xs py-1.5">TOTAL</TableCell>
              {[teams.reduce((s2, t) => s2 + t.revenue, 0), teams.reduce((s2, t) => s2 + t.target, 0)].map((v, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums">{money(v)}</TableCell>)}
              <TableCell className="text-xs py-1.5 text-right tabular-nums">{pct(teams.reduce((a, t) => a + t.target, 0) ? teams.reduce((a, t) => a + t.revenue, 0) / teams.reduce((a, t) => a + t.target, 0) : null)}</TableCell>
              {[teams.reduce((a, t) => a + t.base, 0), teams.reduce((a, t) => a + t.bonus, 0), teams.reduce((a, t) => a + t.total, 0), teams.reduce((a, t) => a + t.payable, 0)].map((v, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums">{money(v)}</TableCell>)}
            </TableRow>
          </TableBody>
        </Table>
      </Section>
      <Section title="B. Prévision de CA par équipe" description="Toute la période : CA vendu + devis en cours pondérés par leur probabilité.">
        <Table>
          <TableHeader>
            <TableRow>
              {['Équipe', 'CA HT vendu (cumul)', 'Devis en cours', 'Devis en cours HT', 'Pipeline pondéré', 'CA prévisionnel', 'Objectif période', '% prév. / obj.', 'Reste à vendre'].map((h, i) => <TableHead key={h} className={`text-xs ${i ? 'text-right' : ''}`}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {forecasts.map(f => (
              <TableRow key={f.team.id}>
                <TableCell className="text-xs py-1.5">{f.team.name}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(f.soldRevenue)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{f.openQuotes}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(f.openQuotesAmount)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(f.weightedPipeline)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums font-semibold">{money(f.forecast)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(f.target)}</TableCell>
                <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(f.pct)}`}>{pct(f.pct)}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(f.remainingToSell)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
      <Section title="C. Commissions par commercial" description="Toute la période.">
        {reps.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Aucune vente ferme avec un commercial renseigné.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Commercial', 'Équipe', 'Kits vendus', 'CA HT vendu', 'Commission acquise', 'Commission payable', 'Reste à payer'].map((h, i) => <TableHead key={h} className={`text-xs ${i > 1 ? 'text-right' : ''}`}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reps.map(r => (
                <TableRow key={r.salesperson}>
                  <TableCell className="text-xs py-1.5">{r.salesperson}</TableCell>
                  <TableCell className="text-xs py-1.5">{r.teamName}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(r.kitsSold)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.revenue)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.base)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.payable)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.remaining)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// SUIVI_MENSUEL + VENTES_PAR_KIT
// ---------------------------------------------------------------------
export function TcAnalyses({ engine, months }: { engine: TcEngine; months: string[] }) {
  const { data, sales } = engine;
  const [teamId, setTeamId] = useState('all');
  const [solution, setSolution] = useState('all');
  const [stage, setStage] = useState<Stage>('sale');
  const series = useMemo(() => monthlySeries(months, sales, data.objectives, { teamId: teamId === 'all' ? null : teamId, solution: solution === 'all' ? null : solution }), [months, sales, data.objectives, teamId, solution]);
  const kitRows = useMemo(() => salesByKit(months, sales.filter(s => solution === 'all' || s.solution === solution).filter(s => teamId === 'all' || s.sale.team_id === teamId), stage, data.kits.filter(k => solution === 'all' || k.solution_code === solution).map(k => k.id)), [months, sales, stage, data.kits, solution, teamId]);
  const kitById = new Map(data.kits.map(k => [k.id, k]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Toutes les équipes</SelectItem>
            {data.teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={solution} onValueChange={setSolution}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Toutes les solutions</SelectItem>
            {data.solutions.map(s => <SelectItem key={s.code} value={s.code} className="text-xs">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Section title="Suivi mensuel" description="CA devisé, vendu et livré face à l'objectif, mois par mois.">
        <div className="h-72 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series.map(p => ({ ...p, label: monthLabel(p.month) }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => moneyShort(v).replace(/\u00a0FCFA/, '')} width={70} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="quotedAmount" name="Devisé" fill="hsl(var(--muted-foreground))" opacity={0.35} radius={[3, 3, 0, 0]} />
              <Bar dataKey="soldAmount" name="Vendu" fill="hsl(var(--sky))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="deliveredAmount" name="Livré" fill="hsl(var(--sage))" radius={[3, 3, 0, 0]} />
              <Line dataKey="targetRevenue" name="Objectif" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Mois</TableHead>
                {['Kits devisés', 'Devisé HT', 'Kits vendus', 'Vendu HT', 'Kits livrés', 'Livré HT', 'Objectif kits', 'Objectif CA', '% obj. CA', 'Marge nette', 'Encaissé'].map(h => <TableHead key={h} className="text-xs text-right whitespace-nowrap">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map(p => (
                <TableRow key={p.month}>
                  <TableCell className="text-xs py-1.5 capitalize">{monthLabel(p.month)}</TableCell>
                  {[qty(p.quotedQty), money(p.quotedAmount), qty(p.soldQty), money(p.soldAmount), qty(p.deliveredQty), money(p.deliveredAmount), qty(p.targetQty), money(p.targetRevenue)].map((v, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums">{v}</TableCell>)}
                  <TableCell className={`text-xs py-1.5 text-right tabular-nums ${objectiveClass(p.targetRevenue ? p.soldAmount / p.targetRevenue : null)}`}>{pct(p.targetRevenue ? p.soldAmount / p.targetRevenue : null)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(p.netMargin)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(p.collected)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
      <Section
        title="Ventes par kit et par mois"
        actions={
          <Tabs value={stage} onValueChange={v => setStage(v as Stage)}>
            <TabsList className="h-8">
              <TabsTrigger value="quote" className="text-xs">Devis</TabsTrigger>
              <TabsTrigger value="sale" className="text-xs">Ventes</TabsTrigger>
              <TabsTrigger value="delivery" className="text-xs">Livraisons</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky left-0 bg-card min-w-[150px]">Kit</TableHead>
                {months.map(m => <TableHead key={m} className="text-xs text-right capitalize">{monthLabel(m)}</TableHead>)}
                <TableHead className="text-xs text-right">Qté</TableHead>
                <TableHead className="text-xs text-right">Montant HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kitRows.map(r => (
                <TableRow key={r.kitId}>
                  <TableCell className="text-xs py-1.5 sticky left-0 bg-card whitespace-nowrap">{kitById.get(r.kitId)?.code}</TableCell>
                  {r.perMonth.map(p => <TableCell key={p.month} className="text-xs py-1.5 text-right tabular-nums">{p.qty ? qty(p.qty) : ''}</TableCell>)}
                  <TableCell className="text-xs py-1.5 text-right tabular-nums font-semibold">{qty(r.qty)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}
