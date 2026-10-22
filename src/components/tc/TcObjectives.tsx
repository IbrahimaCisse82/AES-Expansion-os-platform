import { Fragment, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTcCan } from '@/hooks/useTc';
import type { TcEngine } from './tcPeriod';
import { ReadOnlyNote, Section, money, monthLabel, qty } from './tcUi';

type Measure = 'kits_target' | 'revenue_target';

/** Onglet OBJECTIFS : objectifs mensuels par équipe et par solution (kits et CA HT). */
export default function TcObjectives({ engine, months }: { engine: TcEngine; months: string[] }) {
  const { data } = engine;
  const can = useTcCan();
  const canEdit = can('objectives');
  const qc = useQueryClient();
  const [measure, setMeasure] = useState<Measure>('revenue_target');

  const index = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of data.objectives) m.set(`${o.team_id}|${o.solution_code}|${o.month.slice(0, 7)}`, o[measure]);
    return m;
  }, [data.objectives, measure]);

  const commit = async (teamId: string, solution: string, month: string, raw: string) => {
    const value = raw.trim() === '' ? 0 : Number(raw.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) { toast.error('Valeur invalide'); return; }
    const existing = data.objectives.find(o => o.team_id === teamId && o.solution_code === solution && o.month.slice(0, 7) === month.slice(0, 7));
    const { error } = await supabase.from('tc_objectives').upsert({
      ...(existing ? { id: existing.id } : {}),
      team_id: teamId, solution_code: solution, month,
      kits_target: measure === 'kits_target' ? value : existing?.kits_target ?? 0,
      revenue_target: measure === 'revenue_target' ? value : existing?.revenue_target ?? 0,
    }, { onConflict: 'team_id,solution_code,month' });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ['tc'] });
  };

  const total = (filter: (key: string) => boolean) => [...index.entries()].filter(([k]) => filter(k)).reduce((s, [, v]) => s + v, 0);
  const fmt = (v: number) => (measure === 'revenue_target' ? money(v) : qty(v));

  return (
    <Section
      title="Objectifs mensuels par équipe et par solution"
      description="Saisie directe dans la grille (valeur enregistrée en quittant la cellule)."
      actions={
        <Tabs value={measure} onValueChange={v => setMeasure(v as Measure)}>
          <TabsList className="h-8">
            <TabsTrigger value="revenue_target" className="text-xs">CA HT (FCFA)</TabsTrigger>
            <TabsTrigger value="kits_target" className="text-xs">Nombre de kits</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <ReadOnlyNote show={!canEdit} />
      <div className="overflow-x-auto mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sticky left-0 bg-card z-10 min-w-[140px]">Équipe / solution</TableHead>
              {months.map(m => <TableHead key={m} className="text-xs text-right capitalize min-w-[96px]">{monthLabel(m)}</TableHead>)}
              <TableHead className="text-xs text-right min-w-[110px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.teams.map(team => (
              <Fragment key={team.id}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell className="text-xs font-semibold sticky left-0 bg-muted/40 z-10">{team.name}</TableCell>
                  {months.map(m => <TableCell key={m} className="text-xs text-right tabular-nums font-semibold">{fmt(total(k => k.startsWith(`${team.id}|`) && k.endsWith(`|${m.slice(0, 7)}`)))}</TableCell>)}
                  <TableCell className="text-xs text-right tabular-nums font-semibold">{fmt(total(k => k.startsWith(`${team.id}|`) && months.some(m => k.endsWith(`|${m.slice(0, 7)}`))))}</TableCell>
                </TableRow>
                {data.solutions.map(sol => (
                  <TableRow key={`${team.id}-${sol.code}`}>
                    <TableCell className="text-xs pl-6 sticky left-0 bg-card z-10">{sol.label}</TableCell>
                    {months.map(m => {
                      const key = `${team.id}|${sol.code}|${m.slice(0, 7)}`;
                      const v = index.get(key) ?? 0;
                      return (
                        <TableCell key={m} className="py-1 px-1">
                          {canEdit ? (
                            <Input key={`${key}-${v}-${measure}`} defaultValue={v ? String(v) : ''} inputMode="decimal"
                              className="h-7 text-xs text-right tabular-nums px-1.5"
                              onBlur={e => { if (e.target.value !== (v ? String(v) : '')) void commit(team.id, sol.code, m, e.target.value); }}
                              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                          ) : <span className="block text-xs text-right tabular-nums">{v ? fmt(v) : '—'}</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-xs text-right tabular-nums">{fmt(total(k => k.startsWith(`${team.id}|${sol.code}|`) && months.some(m => k.endsWith(`|${m.slice(0, 7)}`))))}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
            <TableRow className="border-t-2">
              <TableCell className="text-xs font-bold sticky left-0 bg-card z-10">TOTAL</TableCell>
              {months.map(m => <TableCell key={m} className="text-xs text-right tabular-nums font-bold">{fmt(total(k => k.endsWith(`|${m.slice(0, 7)}`)))}</TableCell>)}
              <TableCell className="text-xs text-right tabular-nums font-bold">{fmt(total(k => months.some(m => k.endsWith(`|${m.slice(0, 7)}`))))}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}
