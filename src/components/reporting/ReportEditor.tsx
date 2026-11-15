import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow as UiRow } from '@/components/ui/table';
import { ArrowLeft, Check, FileDown, MessageSquare, Plus, Send, Trash2, Undo2, Wand2, X } from 'lucide-react';
import { discussionLink, objectTag } from '@/lib/chatTags';
import { useDiscussionCount } from '@/hooks/useDiscussion';
import { toast } from 'sonner';
import { Section } from '@/components/tc/tcUi';
import { useTcEngine } from '@/hooks/useTc';
import { useFinData } from '@/hooks/useFin';
import { useBiPoles } from '@/hooks/useBiData';
import { STATUS_LABEL, canReview, useReportMutations, useReportingRole, useReports, type Report } from '@/hooks/useReporting';
import { stockNeeds } from '@/lib/tc/aggregates';
import { treasury } from '@/lib/fin/engine';
import { mergePrefill, prefill } from '@/lib/reporting/prefill';
import { cellText, exportReportPdf } from '@/lib/reporting/pdf';
import {
  computeCell, defaultPeriod, emptyData, hotAverage, isGroupRow, periodLabel, periodRange, weightedEvaluation,
  type ReportData, type ReportField, type ReportSection, type ReportTemplate, type TableColumn, type TableRow,
} from '@/lib/reporting/templates';

export const STATUS_TONE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', submitted: 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]',
  validated: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]', rejected: 'bg-destructive/10 text-destructive',
};
const parseNum = (s: string): number | null | undefined => {
  if (s.trim() === '') return null;
  const v = Number(s.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
};
const selectCls = 'h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70';

/** Données d'un rapport complétées par la structure du modèle (lignes prédéfinies, tableaux vides). */
function hydrate(t: ReportTemplate, data: ReportData | undefined): ReportData {
  const base = emptyData(t);
  const out: ReportData = { ...base, ...(data ?? {}) };
  for (const s of t.sections) if (s.kind === 'table' && !Array.isArray(out[s.key])) out[s.key] = base[s.key];
  return out;
}

function PeriodInput({ kind, value, onChange, disabled }: { kind: ReportTemplate['period']; value: string; onChange: (v: string) => void; disabled: boolean }) {
  if (kind === 'quarter') {
    const y = new Date().getFullYear();
    const opts = [y - 1, y].flatMap(yy => [1, 2, 3, 4].map(q => `${yy}-T${q}`));
    return <select aria-label="Période" className={`${selectCls} w-[150px]`} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>{opts.map(o => <option key={o} value={o}>{periodLabel(o)}</option>)}</select>;
  }
  return <Input aria-label="Période" type={kind === 'week' ? 'week' : kind === 'month' ? 'month' : 'date'} value={value} disabled={disabled} onChange={e => e.target.value && onChange(e.target.value)} className="h-8 w-[170px] text-xs" />;
}

function FieldInput({ f, value, onChange, disabled }: { f: ReportField; value: unknown; onChange: (v: unknown) => void; disabled: boolean }) {
  const v = value === null || value === undefined ? '' : String(value);
  if (f.type === 'textarea') return <Textarea rows={2} value={v} disabled={disabled} onChange={e => onChange(e.target.value)} className="text-xs" />;
  if (f.type === 'select') return (
    <select className={selectCls} value={v} disabled={disabled} onChange={e => onChange(e.target.value || null)}>
      <option value="">—</option>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const numeric = ['number', 'money', 'pct'].includes(f.type);
  return <Input value={v} disabled={disabled} inputMode={numeric ? 'decimal' : undefined} type={f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'} className="h-8 text-xs"
    onChange={e => onChange(numeric ? (parseNum(e.target.value) ?? e.target.value) : e.target.value)}
    onBlur={e => { if (numeric && parseNum(e.target.value) === undefined) { toast.error(`${f.label} : nombre attendu`); onChange(null); } }} />;
}

function CellInput({ c, row, onChange, disabled }: { c: TableColumn; row: TableRow; onChange: (v: string | number | null) => void; disabled: boolean }) {
  const v = row[c.key];
  if (disabled) return <span className="text-xs">{cellText(c, row)}</span>;
  if (c.type === 'select') return (
    <select className={`${selectCls} min-w-[90px]`} value={v === null || v === undefined ? '' : String(v)} onChange={e => onChange(e.target.value || null)}>
      <option value="">—</option>{c.options?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const numeric = c.type === 'number' || c.type === 'money' || c.type === 'pct';
  return <Input value={v === null || v === undefined ? '' : String(v)} type={c.type === 'date' ? 'date' : 'text'} inputMode={numeric ? 'decimal' : undefined}
    className={`h-8 text-xs ${numeric ? 'text-right tabular-nums min-w-[90px]' : 'min-w-[120px]'}`}
    onChange={e => onChange(numeric ? (parseNum(e.target.value) ?? e.target.value) : e.target.value)}
    onBlur={e => { if (numeric && parseNum(e.target.value) === undefined) { toast.error(`${c.label} : nombre attendu`); onChange(null); } }} />;
}

function TableSection({ t, s, rows, setRows, disabled }: { t: ReportTemplate; s: Extract<ReportSection, { kind: 'table' }>; rows: TableRow[]; setRows: (r: TableRow[]) => void; disabled: boolean }) {
  const fixed = new Set(s.rows ?? []);
  const isHot = t.code === 'A8' && s.key === 'hot';
  const set = (i: number, key: string, v: string | number | null) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const evaluation = t.code === 'A6' && s.key === 'grid' ? weightedEvaluation(rows) : null;
  return (
    <Section title={s.title}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <UiRow>
              {s.columns.map(c => <TableHead key={c.key} className={`text-[11px] whitespace-nowrap ${c.computed || c.type === 'number' || c.type === 'money' ? 'text-right' : ''}`}>{c.label}</TableHead>)}
              {isHot && <TableHead className="text-[11px] text-right">Note moy.</TableHead>}
              {!disabled && s.extensible && <TableHead className="w-8" />}
            </UiRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => isGroupRow(row.label) ? (
              <UiRow key={i} className="bg-muted/40 hover:bg-muted/40"><TableCell colSpan={s.columns.length + 2} className="text-[11px] font-semibold uppercase tracking-wide py-1.5">{String(row.label).slice(2)}</TableCell></UiRow>
            ) : (
              <UiRow key={i}>
                {s.columns.map(c => (
                  <TableCell key={c.key} className={`py-1 ${c.computed ? 'text-right tabular-nums text-xs' : ''}`}>
                    {c.computed ? (() => { const v = computeCell(c.computed, row); const txt = cellText(c, row); return <span className={c.computed === 'attainment' && v !== null ? (v >= 1 ? 'text-[hsl(var(--sage))] font-semibold' : v >= 0.8 ? 'text-[hsl(var(--gold))] font-semibold' : 'text-destructive font-semibold') : ''}>{txt || '—'}</span>; })()
                      : c.key === 'label' && fixed.has(String(row.label ?? '')) ? <span className={`text-xs whitespace-nowrap ${/^(TOTAL|MARGE|RÉSULTAT|SOLDE)/.test(String(row.label)) ? 'font-semibold' : ''}`}>{String(row.label)}</span>
                      : <CellInput c={c} row={row} disabled={disabled} onChange={v => set(i, c.key, v)} />}
                  </TableCell>
                ))}
                {isHot && <TableCell className="py-1 text-right text-xs tabular-nums">{(() => { const a = hotAverage(row); return a === null ? '—' : a.toFixed(2).replace('.', ','); })()}</TableCell>}
                {!disabled && s.extensible && (
                  <TableCell className="py-1">
                    {!fixed.has(String(row.label ?? '')) && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Supprimer la ligne" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </TableCell>
                )}
              </UiRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!disabled && s.extensible && <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 mt-2" onClick={() => setRows([...rows, {}])}><Plus className="h-3.5 w-3.5" />Ajouter une ligne</Button>}
      {isHot && (() => { const avgs = rows.map(hotAverage).filter((x): x is number => x !== null); return avgs.length ? <p className="text-xs font-semibold mt-2">Moyenne globale : {(avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2).replace('.', ',')} / 4</p> : null; })()}
      {evaluation && (
        <div className="mt-3 rounded-md border p-3 text-xs flex flex-wrap gap-x-6 gap-y-1">
          <span className="font-semibold">Score global pondéré : {evaluation.score === null ? '—' : `${evaluation.score.toFixed(2).replace('.', ',')} / 4`}</span>
          <span>Niveau : <strong>{evaluation.level ?? '—'}</strong></span>
          {evaluation.byDimension.map(d => <span key={d.label} className="text-muted-foreground">{d.label.replace(/\s*\(.*\)/, '')} : {d.avg === null ? '—' : d.avg.toFixed(2).replace('.', ',')}</span>)}
          {evaluation.score !== null && evaluation.score <= 2 && <span className="text-destructive font-semibold">Note ≤ 2/4 : déclencher un PPI 90 jours (A7).</span>}
        </div>
      )}
    </Section>
  );
}

export function ReportEditor({ template: t, report, initialPeriod }: { template: ReportTemplate; report: Report | null; initialPeriod?: string | null }) {
  const navigate = useNavigate();
  const me = useReportingRole();
  const { data: all } = useReports();
  const { data: poles } = useBiPoles();
  const { create, update, remove } = useReportMutations();
  const [period, setPeriod] = useState(report?.period ?? initialPeriod ?? defaultPeriod(t.period, t.period === 'month' || t.period === 'quarter' || t.code === 'A1' ? previousAnchor(t.period) : new Date()));
  const [data, setData] = useState<ReportData>(() => hydrate(t, report?.data));
  const [dirty, setDirty] = useState(false);
  const [comment, setComment] = useState('');
  const [saleId, setSaleId] = useState('');

  const status = report?.status ?? 'draft';
  const isAuthor = !report || report.author_id === me.userId;
  const editable = me.canWrite && isAuthor && ['draft', 'rejected'].includes(status);
  const reviewer = !!report && status === 'submitted' && canReview(me.role, t.code);

  const year = Number((periodRange(period)?.from ?? new Date().toISOString()).slice(0, 4));
  const tc = useTcEngine();
  const fin = useFinData(year);
  const duplicate = useMemo(() => t.period !== 'date' && (all ?? []).find(r => r.template_code === t.code && r.period === period && r.id !== report?.id), [all, t, period, report]);

  const patch = (key: string, v: unknown) => { setData(d => ({ ...d, [key]: v })); setDirty(true); };

  const runPrefill = () => {
    if (!tc.engine) { toast.error('Données technico-commerciales indisponibles'); return; }
    const f = fin.data;
    const snapshot = f ? {
      pnlLines: f.pnlLines, pnlValues: f.pnlValues, kpiValues: f.kpiValues.map(k => ({ ...k, target: k.target === null ? null : Number(k.target), actual: k.actual === null ? null : Number(k.actual) })),
      treasury: treasury(f.treasuryLines, f.treasuryValues, Number(f.treasuryYear?.opening_balance ?? 0), Number(f.treasuryYear?.min_threshold ?? 0)),
    } : null;
    const pre = prefill(t.code, { period, tc: tc.engine.data, sales: tc.engine.sales, needs: stockNeeds(tc.engine.data, tc.engine.sales), fin: snapshot, saleId });
    if (!Object.keys(pre).length) { toast.info('Aucune donnée de la plateforme pour cette période'); return; }
    setData(d => mergePrefill(t.code, d, pre));
    setDirty(true);
    toast.success('Rapport pré-rempli : vérifiez et complétez avant de soumettre');
  };

  const save = async (submit: boolean) => {
    try {
      if (report) {
        await update.mutateAsync({ id: report.id, data, period, ...(submit ? { status: 'submitted' as const } : {}) });
      } else {
        const res = await create.mutateAsync({
          template_code: t.code, title: t.name, period, data, status: submit ? 'submitted' : 'draft', country_id: null, author_name: me.userName,
          pole_id: t.poleCode ? poles?.find(p => p.code === t.poleCode)?.id ?? null : null,
        });
        if (res) navigate(`/app/reporting/${res.id}`, { replace: true });
      }
      setDirty(false);
      toast.success(submit ? 'Rapport soumis pour validation' : 'Brouillon enregistré');
    } catch (e) { toast.error((e as Error).message); }
  };
  const transition = async (s: 'draft' | 'validated' | 'rejected') => {
    if (!report) return;
    if (s === 'rejected' && !comment.trim()) { toast.error('Indiquez le motif du renvoi'); return; }
    try {
      await update.mutateAsync({ id: report.id, status: s, ...(s === 'rejected' ? { review_comment: comment.trim() } : {}) });
      toast.success(s === 'validated' ? 'Rapport validé' : s === 'rejected' ? 'Rapport renvoyé à son auteur' : 'Soumission retirée');
      setComment('');
    } catch (e) { toast.error((e as Error).message); }
  };

  const tag = report ? objectTag(`${t.code}-${report.period}`) : null;
  const { data: discussionCount } = useDiscussionCount(tag);
  const firmSales = (tc.engine?.sales ?? []).filter(s => s.isFirm).sort((a, b) => (b.sale.sale_date ?? '').localeCompare(a.sale.sale_date ?? ''));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="h-7 -ml-2 text-xs gap-1" onClick={() => navigate('/app/reporting')}><ArrowLeft className="h-3.5 w-3.5" />Tous les rapports</Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{t.code}</Badge>
            <h1 className="text-lg font-bold">{t.name}</h1>
            <Badge variant="outline" className={`border-0 ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</Badge>
            {t.confidential && <Badge variant="outline" className="text-[10px]">Confidentiel</Badge>}
          </div>
          <p className="text-[11.5px] text-muted-foreground">{t.reference} · Validation : {t.reviewer}</p>
          {report && <p className="text-[11px] text-muted-foreground">Rédigé par {report.author_name ?? '—'}{report.submitted_at ? ` · soumis le ${new Date(report.submitted_at).toLocaleDateString('fr-FR')}` : ''}{report.reviewed_at ? ` · ${status === 'validated' ? 'validé' : 'traité'} le ${new Date(report.reviewed_at).toLocaleDateString('fr-FR')}` : ''}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Période</span>
          <PeriodInput kind={t.period} value={period} disabled={!editable} onChange={v => { setPeriod(v); setDirty(true); }} />
          {tag && <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate(discussionLink('Reporting', tag, `${t.code} ${periodLabel(report!.period)} :`))}><MessageSquare className="h-3.5 w-3.5" />Discussion{discussionCount ? ` (${discussionCount})` : ''}</Button>}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => void exportReportPdf(t, { period, data, author_name: report?.author_name ?? me.userName, status, review_comment: report?.review_comment }, STATUS_LABEL[status])}><FileDown className="h-3.5 w-3.5" />PDF</Button>
        </div>
      </div>

      {status === 'rejected' && report?.review_comment && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs"><strong>Renvoyé pour correction :</strong> {report.review_comment}</div>
      )}
      {duplicate && editable && <div className="rounded-md border border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/10 p-3 text-xs">Un rapport {t.code} existe déjà pour {periodLabel(period)} ({STATUS_LABEL[duplicate.status]}, {duplicate.author_name ?? 'auteur inconnu'}).</div>}

      {editable && t.prefill && (
        <div className="rounded-md border bg-muted/30 p-3 flex flex-wrap items-center gap-3">
          <Wand2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs flex-1 min-w-[240px]">
            {t.code === 'A12' ? 'Partir d’une vente du journal : client, site, équipe et matériel du kit sont repris.'
              : 'Les chiffres déjà présents dans la plateforme (ventes, encaissements, finance, KPI) peuvent être repris pour cette période. Vos saisies sont conservées.'}
          </p>
          {t.code === 'A12' && (
            <select aria-label="Vente" className={`${selectCls} w-[280px]`} value={saleId} onChange={e => setSaleId(e.target.value)}>
              <option value="">Choisir une vente…</option>
              {firmSales.map(s => <option key={s.sale.id} value={s.sale.id}>{s.sale.quote_no} — {s.sale.client} ({s.kitName})</option>)}
            </select>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" disabled={tc.isLoading || (t.code === 'A12' && !saleId)} onClick={runPrefill}><Wand2 className="h-3.5 w-3.5" />Pré-remplir depuis la plateforme</Button>
        </div>
      )}

      {t.sections.map((s, i) => {
        if (s.kind === 'fields') return (
          <Section key={i} title={s.title ?? 'En-tête'}>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {s.fields.map(f => <label key={f.key} className="space-y-1 block"><span className="text-[11px] text-muted-foreground">{f.label}</span><FieldInput f={f} value={data[f.key]} disabled={!editable} onChange={v => patch(f.key, v)} /></label>)}
            </div>
          </Section>
        );
        if (s.kind === 'text') return (
          <Section key={i} title={s.title} description={s.hint}>
            {editable ? <Textarea aria-label={s.title} rows={4} value={String(data[s.key] ?? '')} onChange={e => patch(s.key, e.target.value)} className="text-sm" />
              : <p className="text-sm whitespace-pre-wrap">{String(data[s.key] ?? '') || <span className="text-muted-foreground">—</span>}</p>}
          </Section>
        );
        if (s.kind === 'table') return <TableSection key={i} t={t} s={s} rows={(data[s.key] as TableRow[]) ?? []} setRows={rows => patch(s.key, rows)} disabled={!editable} />;
        const v = data[s.key];
        const chosen = Array.isArray(v) ? v as string[] : v ? [String(v)] : [];
        return (
          <Section key={i} title={s.title} description={s.multiple ? 'Plusieurs choix possibles.' : undefined}>
            <div className="space-y-1.5">
              {s.options.map(o => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input type={s.multiple ? 'checkbox' : 'radio'} name={s.key} disabled={!editable} checked={chosen.includes(o)}
                    onChange={e => patch(s.key, s.multiple ? (e.target.checked ? [...chosen, o] : chosen.filter(x => x !== o)) : o)} />
                  {o}
                </label>
              ))}
            </div>
          </Section>
        );
      })}

      <div className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 backdrop-blur px-1 py-3 flex flex-wrap items-center gap-2">
        {editable && <>
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={create.isPending || update.isPending} onClick={() => void save(false)}>Enregistrer le brouillon</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" disabled={create.isPending || update.isPending} onClick={() => void save(true)}><Send className="h-3.5 w-3.5" />Soumettre pour validation</Button>
          {dirty && <span className="text-[11px] text-muted-foreground">Modifications non enregistrées</span>}
        </>}
        {report && isAuthor && status === 'submitted' && <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => void transition('draft')}><Undo2 className="h-3.5 w-3.5" />Retirer la soumission</Button>}
        {reviewer && <>
          <Input aria-label="Motif du renvoi" placeholder="Observation / motif en cas de renvoi" value={comment} onChange={e => setComment(e.target.value)} className="h-8 text-xs w-[320px]" />
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => void transition('rejected')}><X className="h-3.5 w-3.5" />Renvoyer</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => void transition('validated')}><Check className="h-3.5 w-3.5" />Valider</Button>
        </>}
        {report && ((isAuthor && ['draft', 'rejected'].includes(status)) || me.role === 'admin') && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive ml-auto gap-1.5" onClick={async () => {
            if (!window.confirm('Supprimer définitivement ce rapport ?')) return;
            try { await remove.mutateAsync(report.id); toast.success('Rapport supprimé'); navigate('/app/reporting'); } catch (e) { toast.error((e as Error).message); }
          }}><Trash2 className="h-3.5 w-3.5" />Supprimer</Button>
        )}
      </div>
    </div>
  );
}

/** Les rapports périodiques portent sur la période écoulée : semaine, mois ou trimestre précédent. */
export function previousAnchor(kind: ReportTemplate['period'], today = new Date()): Date {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (kind === 'week') d.setUTCDate(d.getUTCDate() - 7);
  else if (kind === 'month') d.setUTCDate(0);
  else if (kind === 'quarter') d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3, 0);
  return d;
}
