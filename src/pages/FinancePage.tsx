import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { ArrowRight, Download, Wand2 } from 'lucide-react';
import { envById } from '@/lib/environments';
import { useReports, STATUS_LABEL } from '@/hooks/useReporting';
import { periodLabel } from '@/lib/reporting/templates';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFinCan, useFinData, useFinMutation, must, scenarioName, toK, type FinData } from '@/hooks/useFin';
import { useTcEngine } from '@/hooks/useTc';
import {
  KPI_CATEGORY_LABEL, MONTH_KEYS, autoKpis, finSuggestions, kpiAttainment, kpiStatus, pnl, poleGrid, spreadAnnual, treasury,
  type GridRow, type KpiDirection,
} from '@/lib/fin/engine';
import { ReadOnlyNote, Section, Stat, exportRows, money, moneyShort, pct, qty } from '@/components/tc/tcUi';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const parse = (s: string) => { const v = Number(s.replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null; };

function AmountInput({ value, disabled, onCommit, className = '' }: { value: number; disabled: boolean; onCommit: (v: number) => void; className?: string }) {
  if (disabled) return <span className={`tabular-nums ${className}`}>{value ? Math.round(value).toLocaleString('fr-FR') : ''}</span>;
  return (
    <Input key={value} defaultValue={value ? String(Math.round(value)) : ''} inputMode="decimal"
      className={`h-7 text-[11px] text-right tabular-nums px-1 min-w-[84px] ${className}`}
      onBlur={e => {
        const v = e.target.value.trim() === '' ? 0 : parse(e.target.value);
        if (v === null || v < 0) { toast.error('Montant invalide'); e.target.value = value ? String(Math.round(value)) : ''; return; }
        if (v !== Math.round(value)) onCommit(v);
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

// ---------------------------------------------------------------------
// Budgets par pôle + consolidation
// ---------------------------------------------------------------------
function PoleBudgets({ data, year, canEdit }: { data: FinData; year: number; canEdit: boolean }) {
  const [poleId, setPoleId] = useState<string>(data.poles[0]?.id ?? '');
  const scenario = data.scenario;
  const locked = !!scenario && ['approved', 'locked'].includes(scenario.status);
  const editable = canEdit && !!scenario && !locked;
  const grid = useMemo(() => poleGrid(data.accounts, data.lines, poleId || null), [data, poleId]);

  const save = useFinMutation(async ({ row, kind, month, value }: { row: GridRow; kind: 'budget' | 'actual'; month?: number; value: number }) => {
    if (!scenario) return;
    const id = kind === 'budget' ? row.budgetLineId : row.actualLineId;
    const existing = data.lines.find(l => l.id === id);
    const fcfa: Record<string, number> = kind === 'budget'
      ? spreadAnnual(value, existing ? MONTH_KEYS.map(k => existing[k]) : undefined)
      : { [MONTH_KEYS[month as number]]: value };
    const patch = Object.fromEntries(Object.entries(fcfa).map(([k, v]) => [k, toK(v)]));
    if (existing) await must(supabase.from('budget_lines').update(patch).eq('id', existing.id));
    else await must(supabase.from('budget_lines').insert({ scenario_id: scenario.id, category_id: row.account.id, pole_id: poleId, line_type: kind, ...patch }));
  });
  const commit = (row: GridRow, kind: 'budget' | 'actual', value: number, month?: number) =>
    save.mutate({ row, kind, month, value }, { onError: (e: Error) => toast.error(e.message) });

  const pole = data.poles.find(p => p.id === poleId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {data.poles.map(p => <Button key={p.id} size="sm" variant={p.id === poleId ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setPoleId(p.id)}>{p.code}</Button>)}
        <Button size="sm" variant={!poleId ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setPoleId('')}>CONSOLIDATION</Button>
      </div>
      {locked && <p className="text-[11.5px] text-muted-foreground">Exercice {scenario?.status === 'locked' ? 'verrouillé' : 'approuvé'} : lecture seule.</p>}
      <ReadOnlyNote show={!canEdit} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Budget annuel" value={money(grid.total.budget)} />
        <Stat label="Réalisé cumulé" value={money(grid.total.actual)} />
        <Stat label="Écart (budget − réalisé)" value={money(grid.total.variance)} tone={grid.total.variance < 0 ? 'text-destructive' : undefined} />
        <Stat label="Taux d'exécution" value={pct(grid.total.rate, 1)} tone={(grid.total.rate ?? 0) > 1 ? 'text-destructive' : undefined} />
      </div>
      <Section
        title={pole ? `Budget ${pole.label} (${pole.code}) — exercice ${year}` : `Budget consolidé AES — exercice ${year}`}
        description={pole ? 'Budget annuel et réalisé mensuel par poste (saisie directe). Les montants alimentent le module BI.' : 'Somme de tous les pôles (lecture seule).'}
        actions={<Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportRows(`budget_${pole?.code ?? 'consolide'}_${year}.xlsx`, pole?.code ?? 'Consolidation',
          ['Poste', 'Budget annuel', ...MONTHS, 'Total réalisé', 'Écart', 'Taux'],
          [...grid.rows, grid.total].map(r => [r.isGroup ? `∑ ${r.account.name}` : r.account.name, r.budget, ...r.months, r.actual, r.variance, r.rate ?? '']))}><Download className="h-3.5 w-3.5" />Excel</Button>}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky left-0 bg-card z-10 min-w-[230px]">Poste budgétaire</TableHead>
                <TableHead className="text-xs text-right min-w-[110px]">Budget annuel</TableHead>
                {MONTHS.map(m => <TableHead key={m} className="text-xs text-right">{m}</TableHead>)}
                <TableHead className="text-xs text-right">Total réalisé</TableHead>
                <TableHead className="text-xs text-right">Écart</TableHead>
                <TableHead className="text-xs text-right">Taux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...grid.rows, grid.total].map(r => (
                <TableRow key={r.account.id} className={r.isGroup ? 'bg-muted/40 hover:bg-muted/40 font-semibold' : ''}>
                  <TableCell className={`text-xs py-1 sticky left-0 z-10 ${r.isGroup ? 'bg-muted/40' : 'bg-card'}`}>{r.isGroup ? `∑ ${r.account.name.replace(/^AES — /, 'Sous-total — ')}` : r.account.name}</TableCell>
                  <TableCell className="text-xs py-1 text-right">{r.isGroup || !poleId ? money(r.budget) : <AmountInput value={r.budget} disabled={!editable} onCommit={v => commit(r, 'budget', v)} />}</TableCell>
                  {r.months.map((m, i) => (
                    <TableCell key={i} className="text-[11px] py-1 text-right tabular-nums">
                      {r.isGroup || !poleId ? (m ? Math.round(m).toLocaleString('fr-FR') : '') : <AmountInput value={m} disabled={!editable} onCommit={v => commit(r, 'actual', v, i)} />}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs py-1 text-right tabular-nums whitespace-nowrap">{money(r.actual)}</TableCell>
                  <TableCell className={`text-xs py-1 text-right tabular-nums whitespace-nowrap ${r.variance < 0 ? 'text-destructive' : ''}`}>{money(r.variance)}</TableCell>
                  <TableCell className={`text-xs py-1 text-right tabular-nums ${(r.rate ?? 0) > 1 ? 'text-destructive' : ''}`}>{pct(r.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// Trésorerie
// ---------------------------------------------------------------------
function Treasury({ data, year, canEdit, suggestions }: { data: FinData; year: number; canEdit: boolean; suggestions: Record<string, number[]> }) {
  const opening = Number(data.treasuryYear?.opening_balance ?? 0);
  const threshold = Number(data.treasuryYear?.min_threshold ?? 0);
  const t = useMemo(() => treasury(data.treasuryLines, data.treasuryValues, opening, threshold), [data, opening, threshold]);

  const saveValue = useFinMutation(async ({ code, month, amount }: { code: string; month: number; amount: number }) => {
    await must(supabase.from('fin_treasury_values').upsert({ fiscal_year: year, line_code: code, month, amount }, { onConflict: 'country_id,fiscal_year,line_code,month' }));
  });
  const saveYear = useFinMutation(async (patch: { opening_balance?: number; min_threshold?: number }) => {
    if (data.treasuryYear) await must(supabase.from('fin_treasury_years').update(patch).eq('id', data.treasuryYear.id));
    else await must(supabase.from('fin_treasury_years').insert({ fiscal_year: year, ...patch }));
  });
  const applySuggestions = useFinMutation(async () => {
    const rows = Object.entries(suggestions).flatMap(([code, m]) => m.map((amount, i) => ({ fiscal_year: year, line_code: code, month: i + 1, amount })).filter(r => r.amount > 0));
    if (rows.length) await must(supabase.from('fin_treasury_values').upsert(rows, { onConflict: 'country_id,fiscal_year,line_code,month' }));
  });
  const err = (e: Error) => toast.error(e.message);
  const suggestedTotal = Object.values(suggestions).flat().reduce((a, b) => a + b, 0);

  const block = (rows: typeof t.enc, title: string, totals: number[]) => (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40"><TableCell colSpan={15} className="text-[11px] font-semibold uppercase tracking-wide py-1.5">{title}</TableCell></TableRow>
      {rows.map(r => (
        <TableRow key={r.line.code}>
          <TableCell className="text-xs py-1 sticky left-0 bg-card z-10">{r.line.label}</TableCell>
          {r.months.map((m, i) => <TableCell key={i} className="text-[11px] py-1 text-right"><AmountInput value={m} disabled={!canEdit} onCommit={v => saveValue.mutate({ code: r.line.code, month: i + 1, amount: v }, { onError: err })} /></TableCell>)}
          <TableCell className="text-xs py-1 text-right tabular-nums whitespace-nowrap font-medium">{money(r.total)}</TableCell>
          <TableCell className="text-[11px] py-1 text-right"><AmountInput value={r.forecast} disabled={!canEdit} onCommit={v => saveValue.mutate({ code: r.line.code, month: 0, amount: v }, { onError: err })} /></TableCell>
        </TableRow>
      ))}
      <TableRow className="font-semibold border-t-2">
        <TableCell className="text-xs py-1.5 sticky left-0 bg-card z-10">∑ {title.toLowerCase()}</TableCell>
        {totals.map((m, i) => <TableCell key={i} className="text-[11px] py-1.5 text-right tabular-nums">{m ? Math.round(m).toLocaleString('fr-FR') : ''}</TableCell>)}
        <TableCell className="text-xs py-1.5 text-right tabular-nums whitespace-nowrap">{money(totals.reduce((a, b) => a + b, 0))}</TableCell>
        <TableCell className="text-xs py-1.5 text-right tabular-nums whitespace-nowrap">{money(rows.reduce((a, r) => a + r.forecast, 0))}</TableCell>
      </TableRow>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Total encaissements" value={money(t.totalEnc)} hint={`prévu ${moneyShort(t.forecastEnc)}`} />
        <Stat label="Total décaissements" value={money(t.totalDec)} hint={`prévu ${moneyShort(t.forecastDec)}`} />
        <Stat label="Flux net annuel" value={money(t.totalNet)} tone={t.totalNet < 0 ? 'text-destructive' : undefined} />
        <Stat label="Trésorerie finale" value={money(t.finalBalance)} tone={threshold > 0 && t.finalBalance < threshold ? 'text-destructive' : undefined} hint={t.belowThreshold.some(Boolean) ? `${t.belowThreshold.filter(Boolean).length} mois sous le seuil` : undefined} />
      </div>
      <Section title={`Trésorerie mensuelle — ${year}`} description="Mouvements réels du mois ; la dernière colonne est la prévision annuelle (budget)."
        actions={canEdit && suggestedTotal > 0 ? (
          <Button size="sm" variant="outline" className="min-h-8 h-auto py-1.5 whitespace-normal text-left text-xs gap-1.5" onClick={() => applySuggestions.mutate(undefined, { onSuccess: () => toast.success('Encaissements du journal des ventes repris'), onError: err })}>
            <Wand2 className="h-3.5 w-3.5" />Reprendre les encaissements du journal ({moneyShort(suggestedTotal)})
          </Button>
        ) : undefined}>
        <ReadOnlyNote show={!canEdit} />
        <div className="flex flex-wrap gap-4 mb-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Solde de trésorerie initial (1er janvier)
            <AmountInput value={opening} disabled={!canEdit} onCommit={v => saveYear.mutate({ opening_balance: v }, { onError: err })} className="h-8 w-[160px]" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Seuil de trésorerie minimale acceptable
            <AmountInput value={threshold} disabled={!canEdit} onCommit={v => saveYear.mutate({ min_threshold: v }, { onError: err })} className="h-8 w-[160px]" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky left-0 bg-card z-10 min-w-[240px]">Poste de trésorerie</TableHead>
                {MONTHS.map(m => <TableHead key={m} className="text-xs text-right">{m}</TableHead>)}
                <TableHead className="text-xs text-right">Total annuel</TableHead>
                <TableHead className="text-xs text-right">Budget prév.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {block(t.enc, 'Encaissements', t.encM)}
              {block(t.dec, 'Décaissements', t.decM)}
              <TableRow className="bg-muted/40 hover:bg-muted/40"><TableCell colSpan={15} className="text-[11px] font-semibold uppercase tracking-wide py-1.5">Soldes et position de trésorerie</TableCell></TableRow>
              {[['Solde initial (début de mois)', t.openingM], ['Flux net du mois', t.net], ['Solde fin de mois (cumulé)', t.closingM]].map(([label, vals]) => (
                <TableRow key={label as string}>
                  <TableCell className="text-xs py-1.5 sticky left-0 bg-card z-10 font-medium">{label as string}</TableCell>
                  {(vals as number[]).map((v, i) => (
                    <TableCell key={i} className={`text-[11px] py-1.5 text-right tabular-nums ${v < 0 || (label === 'Solde fin de mois (cumulé)' && t.belowThreshold[i]) ? 'text-destructive font-semibold' : ''}`}>{Math.round(v).toLocaleString('fr-FR')}</TableCell>
                  ))}
                  <TableCell colSpan={2} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
      <Section title="Évolution de la trésorerie">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={MONTHS.map((m, i) => ({ m, enc: t.encM[i], dec: t.decM[i], solde: t.closingM[i] }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="m" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => moneyShort(v).replace(/\u00a0FCFA/, '')} width={70} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="enc" name="Encaissements" fill="hsl(var(--sage))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="dec" name="Décaissements" fill="hsl(var(--terracotta))" radius={[3, 3, 0, 0]} />
              <Line dataKey="solde" name="Solde fin de mois" stroke="hsl(var(--sky))" strokeWidth={2} />
              {threshold > 0 && <ReferenceLine y={threshold} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: 'Seuil', fontSize: 10 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// Compte de résultat
// ---------------------------------------------------------------------
const PNL_SECTIONS: { key: 'produits' | 'variables' | 'personnel' | 'opex' | 'financier' | 'impot'; title: string }[] = [
  { key: 'produits', title: 'Produits (revenus)' }, { key: 'variables', title: 'Achats & charges variables' }, { key: 'personnel', title: 'Charges de personnel' },
  { key: 'opex', title: 'Charges opérationnelles' }, { key: 'financier', title: 'Charges financières' }, { key: 'impot', title: 'Impôt sur les bénéfices (ITS 27,5 %)' },
];

function ProfitAndLoss({ data, year, canEdit, suggestions }: { data: FinData; year: number; canEdit: boolean; suggestions: Record<string, number> }) {
  const r = useMemo(() => pnl(data.pnlLines, data.pnlValues), [data]);
  const save = useFinMutation(async ({ code, field, value }: { code: string; field: 'budget' | 'actual'; value: number }) => {
    const current = data.pnlValues.find(v => v.line_code === code);
    await must(supabase.from('fin_pnl_values').upsert({ fiscal_year: year, line_code: code, budget: current?.budget ?? 0, actual: current?.actual ?? 0, [field]: value }, { onConflict: 'country_id,fiscal_year,line_code' }));
  });
  const apply = useFinMutation(async () => {
    const rows = data.pnlLines.filter(l => suggestions[l.code] !== undefined).map(l => ({
      fiscal_year: year, line_code: l.code, budget: data.pnlValues.find(v => v.line_code === l.code)?.budget ?? 0, actual: Math.round(suggestions[l.code]),
    }));
    if (rows.length) await must(supabase.from('fin_pnl_values').upsert(rows, { onConflict: 'country_id,fiscal_year,line_code' }));
  });
  const err = (e: Error) => toast.error(e.message);
  const line = (label: string, b: number, a: number, strong = false, rate?: { budget: number | null; actual: number | null }) => (
    <TableRow key={label} className={strong ? 'font-semibold bg-muted/30' : ''}>
      <TableCell className="text-xs py-1.5">{label}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{rate ? pct(rate.budget, 1) : money(b)}</TableCell>
      <TableCell className={`text-xs py-1.5 text-right tabular-nums ${!rate && a < 0 ? 'text-destructive' : ''}`}>{rate ? pct(rate.actual, 1) : money(a)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{rate ? '' : money(b - a)}</TableCell>
      <TableCell className="text-xs py-1.5 text-right tabular-nums">{rate ? '' : pct(b ? a / b : null)}</TableCell>
      <TableCell />
    </TableRow>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Chiffre d'affaires réalisé" value={money(r.ca.actual)} hint={`budget ${moneyShort(r.ca.budget)}`} />
        <Stat label="Marge brute" value={money(r.grossMargin.actual)} hint={pct(r.grossMarginRate.actual, 1)} />
        <Stat label="EBIT" value={money(r.ebit.actual)} hint={pct(r.ebitRate.actual, 1)} tone={r.ebit.actual < 0 ? 'text-destructive' : undefined} />
        <Stat label="Résultat net" value={money(r.net.actual)} hint={pct(r.netRate.actual, 1)} tone={r.net.actual < 0 ? 'text-destructive' : undefined} />
      </div>
      <Section title={`Compte de résultat — budget vs réalisé ${year}`} description="% réalisé = réalisé / budget. Résultat net = résultat avant impôt − ITS."
        actions={canEdit && Object.keys(suggestions).length > 0 ? (
          <Button size="sm" variant="outline" className="min-h-8 h-auto py-1.5 whitespace-normal text-left text-xs gap-1.5" onClick={() => apply.mutate(undefined, { onSuccess: () => toast.success('Réalisé repris des ventes et des pôles'), onError: err })}>
            <Wand2 className="h-3.5 w-3.5" />Reprendre le réalisé (ventes + pôles)
          </Button>
        ) : undefined}>
        <ReadOnlyNote show={!canEdit} />
        <Table>
          <TableHeader>
            <TableRow>
              {['Poste', 'Budget', 'Réalisé cumulé', 'Écart (B − R)', '% réalisé', 'Calculé (plateforme)'].map((h, i) => <TableHead key={h} className={`text-xs ${i ? 'text-right' : ''}`}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PNL_SECTIONS.map(sec => (
              <Fragment key={sec.key}>
                <TableRow className="bg-muted/40 hover:bg-muted/40"><TableCell colSpan={6} className="text-[11px] font-semibold uppercase tracking-wide py-1.5">{sec.title}</TableCell></TableRow>
                {r.sections[sec.key].map(row => (
                  <TableRow key={row.line.code}>
                    <TableCell className="text-xs py-1 pl-5">{row.line.label}</TableCell>
                    <TableCell className="text-xs py-1 text-right"><AmountInput value={row.budget} disabled={!canEdit} onCommit={v => save.mutate({ code: row.line.code, field: 'budget', value: v }, { onError: err })} /></TableCell>
                    <TableCell className="text-xs py-1 text-right"><AmountInput value={row.actual} disabled={!canEdit} onCommit={v => save.mutate({ code: row.line.code, field: 'actual', value: v }, { onError: err })} /></TableCell>
                    <TableCell className="text-xs py-1 text-right tabular-nums">{money(row.budget - row.actual)}</TableCell>
                    <TableCell className="text-xs py-1 text-right tabular-nums">{pct(row.budget ? row.actual / row.budget : null)}</TableCell>
                    <TableCell className="text-[11px] py-1 text-right tabular-nums text-muted-foreground">{suggestions[row.line.code] !== undefined ? money(suggestions[row.line.code]) : sec.key === 'impot' ? `suggéré ${money(r.suggestedTax.actual)}` : ''}</TableCell>
                  </TableRow>
                ))}
                {sec.key === 'produits' && line("CHIFFRE D'AFFAIRES TOTAL", r.ca.budget, r.ca.actual, true)}
                {sec.key === 'variables' && <>{line('TOTAL CHARGES VARIABLES', r.cv.budget, r.cv.actual, true)}{line('MARGE BRUTE', r.grossMargin.budget, r.grossMargin.actual, true)}{line('% MARGE BRUTE', 0, 0, true, r.grossMarginRate)}</>}
                {sec.key === 'personnel' && line('TOTAL CHARGES DE PERSONNEL', r.personnel.budget, r.personnel.actual, true)}
                {sec.key === 'opex' && <>{line('TOTAL CHARGES OPÉRATIONNELLES', r.opex.budget, r.opex.actual, true)}{line("RÉSULTAT D'EXPLOITATION (EBIT)", r.ebit.budget, r.ebit.actual, true)}{line('% EBIT / CA', 0, 0, true, r.ebitRate)}</>}
                {sec.key === 'financier' && <>{line('TOTAL CHARGES FINANCIÈRES', r.financial.budget, r.financial.actual, true)}{line('RÉSULTAT AVANT IMPÔT', r.preTax.budget, r.preTax.actual, true)}</>}
                {sec.key === 'impot' && <>{line('RÉSULTAT NET', r.net.budget, r.net.actual, true)}{line('% MARGE NETTE / CA', 0, 0, true, r.netRate)}</>}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// KPI officiels
// ---------------------------------------------------------------------
const STATUS_TONE: Record<string, string> = {
  '✅ Atteint': 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]', '⚠️ En cours': 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]',
  '🔴 Alerte': 'bg-destructive/10 text-destructive', '— À saisir': 'bg-muted text-muted-foreground',
};
const fmtKpi = (unit: string, v: number | null | undefined) => v === null || v === undefined ? '—'
  : unit === '%' ? pct(v, 1) : unit === 'FCFA' ? money(v) : `${qty(Math.round(v * 100) / 100)}${unit === 'jours' ? ' j' : unit === 'heures' ? ' h' : ''}`;

function OfficialKpis({ data, year, canEdit, auto }: { data: FinData; year: number; canEdit: boolean; auto: (month: string) => Record<string, number | null> }) {
  const now = new Date();
  const [month, setMonth] = useState(`${year}-${String(now.getFullYear() === year ? now.getMonth() + 1 : 12).padStart(2, '0')}-01`);
  const computed = useMemo(() => auto(month), [auto, month]);
  const values = data.kpiValues.filter(v => v.month === month);
  const save = useFinMutation(async ({ code, patch }: { code: string; patch: { target?: number | null; actual?: number | null; comment?: string | null } }) => {
    const cur = values.find(v => v.kpi_code === code);
    await must(supabase.from('fin_kpi_values').upsert({ kpi_code: code, month, target: cur?.target ?? null, actual: cur?.actual ?? null, comment: cur?.comment ?? null, ...patch }, { onConflict: 'country_id,kpi_code,month' }));
  });
  const err = (e: Error) => toast.error(e.message);
  const toInput = (unit: string, v: number | null | undefined) => (v === null || v === undefined ? '' : unit === '%' ? String(Math.round(v * 10000) / 100) : String(v));
  const fromInput = (unit: string, s: string) => { if (s.trim() === '') return null; const v = parse(s); return v === null ? undefined : unit === '%' ? v / 100 : v; };
  const rows = data.kpis.map(k => {
    const v = values.find(x => x.kpi_code === k.code);
    const actual = v?.actual ?? computed[k.code] ?? null;
    const target = v?.target ?? null;
    return { k, v, actual: actual === null ? null : Number(actual), target: target === null ? null : Number(target), fromPlatform: (v?.actual ?? null) === null && computed[k.code] != null };
  });
  const byStatus = (s: string) => rows.filter(r => kpiStatus(r.k.direction as KpiDirection, r.target, r.actual) === s).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Mois</span>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => { const v = `${year}-${String(i + 1).padStart(2, '0')}-01`; return <SelectItem key={v} value={v} className="text-xs">{m} {year}</SelectItem>; })}</SelectContent>
        </Select>
        <span className="text-[11.5px] text-muted-foreground">{byStatus('✅ Atteint')} atteints · {byStatus('⚠️ En cours')} en cours · {byStatus('🔴 Alerte')} en alerte · {byStatus('— À saisir')} à saisir</span>
      </div>
      <ReadOnlyNote show={!canEdit} />
      {Object.entries(KPI_CATEGORY_LABEL).map(([cat, title]) => (
        <Section key={cat} title={title} description={cat === 'FIN' || cat === 'COM' ? 'Les valeurs marquées « plateforme » sont calculées automatiquement ; saisir un réalisé les remplace.' : undefined}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {['N°', 'Indicateur', 'Sens', 'Objectif', 'Réalisé', 'Taux', 'Statut', 'Commentaire / action'].map((h, i) => <TableHead key={h} className={`text-xs ${i >= 3 && i <= 5 ? 'text-right' : ''}`}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.filter(r => r.k.category === cat).map(({ k, v, actual, target, fromPlatform }) => {
                  const status = kpiStatus(k.direction as KpiDirection, target, actual);
                  const att = kpiAttainment(k.direction as KpiDirection, target, actual);
                  return (
                    <TableRow key={k.code}>
                      <TableCell className="text-xs py-1 font-medium">{k.code}</TableCell>
                      <TableCell className="text-xs py-1 min-w-[230px]">{k.label} <span className="text-muted-foreground">({k.unit})</span></TableCell>
                      <TableCell className="text-[11px] py-1 text-muted-foreground whitespace-nowrap">{k.direction === 'up' ? '↑ plus haut' : k.direction === 'down' ? '↓ plus bas' : '◎ cible'}</TableCell>
                      <TableCell className="text-xs py-1 text-right w-[120px]">
                        {canEdit ? <Input key={`t-${k.code}-${month}-${v?.target}`} defaultValue={toInput(k.unit, target)} inputMode="decimal" className="h-7 text-xs text-right"
                          onBlur={e => { const n2 = fromInput(k.unit, e.target.value); if (n2 === undefined) { toast.error('Valeur invalide'); return; } if (n2 !== target) save.mutate({ code: k.code, patch: { target: n2 } }, { onError: err }); }} /> : fmtKpi(k.unit, target)}
                      </TableCell>
                      <TableCell className="text-xs py-1 text-right w-[140px]">
                        {canEdit ? <Input key={`a-${k.code}-${month}-${v?.actual}-${computed[k.code]}`} defaultValue={toInput(k.unit, v?.actual ?? null)} placeholder={computed[k.code] != null ? toInput(k.unit, k.unit === '%' ? Math.round(Number(computed[k.code]) * 10000) / 10000 : Math.round(Number(computed[k.code]) * 100) / 100) : ''} inputMode="decimal" className="h-7 text-xs text-right"
                          onBlur={e => { const n2 = fromInput(k.unit, e.target.value); if (n2 === undefined) { toast.error('Valeur invalide'); return; } if (n2 !== (v?.actual ?? null)) save.mutate({ code: k.code, patch: { actual: n2 } }, { onError: err }); }} /> : fmtKpi(k.unit, actual)}
                        {fromPlatform && <div className="text-[10px] text-muted-foreground mt-0.5">plateforme : {fmtKpi(k.unit, actual)}</div>}
                      </TableCell>
                      <TableCell className="text-xs py-1 text-right tabular-nums">{pct(att)}</TableCell>
                      <TableCell className="py-1"><Badge variant="outline" className={`border-0 text-[10.5px] whitespace-nowrap ${STATUS_TONE[status]}`}>{status}</Badge></TableCell>
                      <TableCell className="py-1 min-w-[200px]">
                        {canEdit ? <Textarea key={`c-${k.code}-${month}-${v?.comment}`} rows={1} defaultValue={v?.comment ?? ''} className="text-xs min-h-[28px] py-1"
                          onBlur={e => { if (e.target.value !== (v?.comment ?? '')) save.mutate({ code: k.code, patch: { comment: e.target.value || null } }, { onError: err }); }} /> : <span className="text-xs">{v?.comment}</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Vue d'ensemble (accueil de l'environnement Finance)
// ---------------------------------------------------------------------
function FinanceOverview({ data, year, consolidated, auto, suggestions }: {
  data: FinData; year: number; consolidated: ReturnType<typeof poleGrid> | null;
  auto: (month: string) => Record<string, number | null>; suggestions: { treasury: Record<string, number[]>; pnlActual: Record<string, number> };
}) {
  const t = useMemo(() => treasury(data.treasuryLines, data.treasuryValues, Number(data.treasuryYear?.opening_balance ?? 0), Number(data.treasuryYear?.min_threshold ?? 0)), [data]);
  const r = useMemo(() => pnl(data.pnlLines, data.pnlValues), [data]);
  const now = new Date();
  const current = `${year}-${String(now.getFullYear() === year ? now.getMonth() + 1 : 12).padStart(2, '0')}-01`;
  // Dernier mois renseigné de l'exercice (le mois en cours est souvent encore vide)
  const month = data.kpiValues.map(v => v.month).filter(m => m <= current && m.startsWith(String(year))).sort().pop() ?? current;
  const computed = useMemo(() => auto(month), [auto, month]);
  const statuses = data.kpis.map(k => {
    const v = data.kpiValues.find(x => x.kpi_code === k.code && x.month === month);
    const actual = v?.actual ?? computed[k.code] ?? null;
    return { k, status: kpiStatus(k.direction as KpiDirection, v?.target == null ? null : Number(v.target), actual == null ? null : Number(actual)) };
  });
  const alerts = statuses.filter(s => s.status === '🔴 Alerte');
  const lastMonth = t.encM.reduce((last, v, i) => (v || t.decM[i] ? i : last), -1);
  const below = t.belowThreshold.filter((b, i) => b && i <= lastMonth).length;
  const toImport = Object.values(suggestions.treasury).flat().reduce((a, b) => a + b, 0);
  const { data: reports } = useReports();
  const a4 = (reports ?? []).filter(x => x.template_code === 'A4').slice(0, 3);
  const card = (to: string, label: string, value: string, hint?: string, tone?: string) => (
    <Link to={to} className="block rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors">
      <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold mt-1 ${tone ?? ''}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </Link>
  );
  return (
    <div className="space-y-4">
      {!data.scenario && <div className="rounded-md border border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/10 p-3 text-xs">L'exercice {year} n'est pas encore ouvert : <Link to="/app/finance/budgets" className="underline font-medium">l'ouvrir dans Budgets par pôle</Link>.</div>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {card('/app/finance/budgets', 'Exécution budgétaire', pct(consolidated?.total.rate ?? null, 1), consolidated ? `${moneyShort(consolidated.total.actual)} / ${moneyShort(consolidated.total.budget)}` : undefined, (consolidated?.total.rate ?? 0) > 1 ? 'text-destructive' : undefined)}
        {card('/app/finance/tresorerie', 'Trésorerie fin de mois', lastMonth >= 0 ? money(t.closingM[lastMonth]) : '—', below ? `${below} mois sous le seuil` : 'au-dessus du seuil', below ? 'text-destructive' : undefined)}
        {card('/app/finance/resultat', 'Résultat net (réalisé)', money(r.net.actual), `CA ${moneyShort(r.ca.actual)} · marge nette ${pct(r.netRate.actual, 1)}`, r.net.actual < 0 ? 'text-destructive' : undefined)}
        {card('/app/finance/kpi', 'KPI en alerte', String(alerts.length), `${statuses.filter(s => s.status === '✅ Atteint').length} atteints · ${statuses.filter(s => s.status === '— À saisir').length} à saisir`, alerts.length ? 'text-destructive' : undefined)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="KPI en alerte" description={`Mois de ${periodLabel(month.slice(0, 7))}`}>
          {alerts.length === 0 ? <p className="text-xs text-muted-foreground">Aucun KPI en alerte.</p> : (
            <ul className="space-y-1.5">{alerts.map(a => <li key={a.k.code} className="text-xs flex gap-2"><Badge variant="outline" className="text-[10px]">{a.k.code}</Badge>{a.k.label}</li>)}</ul>
          )}
        </Section>
        <Section title="Liens avec les autres environnements">
          <ul className="space-y-2 text-xs">
            <li className="flex items-center justify-between gap-3">
              <span>Encaissements du journal des ventes non encore repris en trésorerie</span>
              <Link to="/app/finance/tresorerie" className="inline-flex items-center gap-1 font-medium text-accent whitespace-nowrap">{moneyShort(toImport)} <ArrowRight className="h-3 w-3" /></Link>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Ventes, marges et créances clients (Technico-commercial)</span>
              <Link to="/app/tc/marges" className="inline-flex items-center gap-1 font-medium text-accent whitespace-nowrap">Ouvrir <ArrowRight className="h-3 w-3" /></Link>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Rapport mensuel administratif & financier (A4){a4[0] ? ` — dernier : ${periodLabel(a4[0].period)}, ${STATUS_LABEL[a4[0].status].toLowerCase()}` : ' — aucun rédigé'}</span>
              <Link to={a4[0] ? `/app/reporting/${a4[0].id}` : '/app/reporting/nouveau/A4'} className="inline-flex items-center gap-1 font-medium text-accent whitespace-nowrap">{a4[0] ? 'Ouvrir' : 'Rédiger'} <ArrowRight className="h-3 w-3" /></Link>
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
export default function FinancePage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, isLoading, error } = useFinData(year);
  const tc = useTcEngine();
  const can = useFinCan();
  const { pathname } = useLocation();
  const title = [...envById('finance').nav[0].items].reverse().find(i => pathname.startsWith(i.path))?.label ?? 'Finance';

  const openYear = useFinMutation(async () => {
    await must(supabase.from('budget_scenarios').insert({ name: scenarioName(year), fiscal_year: year, description: 'Budget AES par pôle (plan de comptes du classeur financier)', is_baseline: true }));
  });

  const consolidated = useMemo(() => (data ? poleGrid(data.accounts, data.lines, null) : null), [data]);
  const suggestions = useMemo(() => (data && tc.engine && consolidated ? finSuggestions(year, tc.engine.sales, consolidated) : { treasury: {}, pnlActual: {} }), [data, tc.engine, consolidated, year]);
  const auto = useMemo(() => (month: string) => {
    if (!data || !tc.engine) return {};
    const t = treasury(data.treasuryLines, data.treasuryValues, Number(data.treasuryYear?.opening_balance ?? 0), Number(data.treasuryYear?.min_threshold ?? 0));
    return autoKpis({ month, sales: tc.engine.sales, objectives: tc.engine.data.objectives, teams: tc.engine.data.teams, pnl: pnl(data.pnlLines, data.pnlValues), treasury: t, budgetExecution: consolidated?.total.rate ?? null });
  }, [data, tc.engine, consolidated]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">Finance — remplace le classeur financier AES.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Exercice</span>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive py-10 text-center">Impossible de charger les données : {(error as Error).message}</p>
        : isLoading || !data ? <p className="text-sm text-muted-foreground py-10 text-center">Chargement…</p>
        : (
          <Routes>
            <Route index element={<FinanceOverview data={data} year={year} consolidated={consolidated} auto={auto} suggestions={suggestions} />} />
            <Route path="budgets" element={data.scenario ? <PoleBudgets data={data} year={year} canEdit={can.finance} /> : (
              <Section title={`Exercice ${year} non ouvert`} description="Ouvrir l'exercice crée le budget de référence dans lequel chaque pôle saisit son budget et son réalisé.">
                {can.openYear
                  ? <Button size="sm" className="h-8 text-xs" onClick={() => openYear.mutate(undefined, { onSuccess: () => toast.success(`Exercice ${year} ouvert`), onError: (e: Error) => toast.error(e.message) })}>Ouvrir l'exercice {year}</Button>
                  : <p className="text-sm text-muted-foreground">Demandez à la direction ou au RAF d'ouvrir l'exercice.</p>}
              </Section>
            )} />
            <Route path="tresorerie" element={<Treasury data={data} year={year} canEdit={can.finance} suggestions={suggestions.treasury} />} />
            <Route path="resultat" element={<ProfitAndLoss data={data} year={year} canEdit={can.finance} suggestions={suggestions.pnlActual} />} />
            <Route path="kpi" element={<OfficialKpis data={data} year={year} canEdit={can.kpi} auto={auto} />} />
            <Route path="*" element={<Navigate to="/app/finance" replace />} />
          </Routes>
        )}
    </div>
  );
}
