import { useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { Section } from '@/components/tc/tcUi';
import { ReportEditor, STATUS_TONE, previousAnchor } from '@/components/reporting/ReportEditor';
import { STATUS_LABEL, canReview, useReportingRole, useReports, type Report } from '@/hooks/useReporting';
import { FREQUENCY_LABEL, REPORT_TEMPLATES, defaultPeriod, periodLabel, templateByCode } from '@/lib/reporting/templates';

/** Rapports périodiques attendus pour la dernière période écoulée (A9 : semaine en cours). */
function expected() {
  return REPORT_TEMPLATES.filter(t => t.frequency !== 'adhoc').map(t => ({
    t, period: defaultPeriod(t.period, t.code === 'A9' ? new Date() : previousAnchor(t.period)),
  }));
}

type View = 'overview' | 'review' | 'mine' | 'templates';
const VIEW_TITLE: Record<View, string> = { overview: "Reporting — vue d'ensemble", review: 'Rapports à valider', mine: 'Mes rapports', templates: 'Nouveau rapport (A1–A12)' };

export function ReportingHome({ embedded = false, view = 'overview' }: { embedded?: boolean; view?: View }) {
  const navigate = useNavigate();
  const me = useReportingRole();
  const { data: reports, isLoading, error } = useReports();
  const tab = view === 'review' ? 'review' : view === 'mine' ? 'mine' : 'all';
  const toReview = (reports ?? []).filter(r => r.status === 'submitted' && canReview(me.role, r.template_code));
  const shown = useMemo(() => (reports ?? []).filter(r => tab === 'all' || (tab === 'mine' ? r.author_id === me.userId : r.status === 'submitted' && canReview(me.role, r.template_code))), [reports, tab, me]);
  const open = (r: Report) => navigate(`/app/reporting/${r.id}`);

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h1 className="text-xl font-bold">{VIEW_TITLE[view]}</h1>
          <p className="text-xs text-muted-foreground mt-1">Les 12 rapports normalisés du classeur AES (A1–A12) : rédaction, pré-remplissage depuis la plateforme, validation par la direction et export PDF.</p>
        </div>
      )}
      {view === 'overview' && <Section title="À produire" description="Rapports périodiques attendus pour la dernière période écoulée.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
          {expected().map(({ t, period }) => {
            const existing = (reports ?? []).find(r => r.template_code === t.code && r.period === period);
            return (
              <button key={t.code} type="button" onClick={() => (existing ? open(existing) : navigate(`/app/reporting/nouveau/${t.code}?periode=${period}`))}
                className="text-left rounded-md border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{t.code}</Badge><span className="text-xs font-medium truncate">{t.name}</span></div>
                <p className="text-[11px] text-muted-foreground mt-1">{periodLabel(period)}</p>
                <Badge variant="outline" className={`mt-2 border-0 text-[10.5px] ${existing ? STATUS_TONE[existing.status] : 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]'}`}>{existing ? STATUS_LABEL[existing.status] : 'À rédiger'}</Badge>
              </button>
            );
          })}
        </div>
      </Section>}

      {view !== 'templates' && <Section title={view === 'review' ? `À valider (${toReview.length})` : view === 'mine' ? 'Rapports que j\'ai rédigés' : 'Tous les rapports'}>
        {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{['Rapport', 'Période', 'Auteur', 'Statut', 'Mis à jour'].map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {shown.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => open(r)}>
                    <TableCell className="text-xs"><Badge variant="outline" className="mr-2 text-[10px]">{r.template_code}</Badge>{templateByCode(r.template_code)?.name ?? r.title}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{periodLabel(r.period)}</TableCell>
                    <TableCell className="text-xs">{r.author_name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={`border-0 text-[10.5px] whitespace-nowrap ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.updated_at).toLocaleDateString('fr-FR')}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && shown.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">{view === 'review' ? 'Aucun rapport en attente de validation.' : 'Aucun rapport.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>}

      {(view === 'templates' || embedded) && <Section title="Modèles A1–A12" description="Reprise fidèle des onglets du classeur financier AES.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {REPORT_TEMPLATES.map(t => (
            <div key={t.code} className="rounded-md border p-3 flex flex-col">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{t.code}</Badge><span className="text-xs font-medium">{t.name}</span></div>
              <p className="text-[11px] text-muted-foreground mt-1 flex-1">{t.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10.5px] text-muted-foreground">{FREQUENCY_LABEL[t.frequency]}{t.prefill ? ' · pré-rempli' : ''}</span>
                {me.canWrite && <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate(`/app/reporting/nouveau/${t.code}`)}><Plus className="h-3.5 w-3.5" />Nouveau</Button>}
              </div>
            </div>
          ))}
        </div>
      </Section>}
    </div>
  );
}

function NewReport() {
  const { code } = useParams();
  const t = templateByCode(code ?? '');
  const [params] = useSearchParams();
  const periode = params.get('periode');
  if (!t) return <p className="text-sm text-muted-foreground py-10 text-center">Modèle inconnu.</p>;
  return <ReportEditor key={`${t.code}-${periode}`} template={t} report={null} initialPeriod={periode} />;
}

function ExistingReport() {
  const { id } = useParams();
  const { data, isLoading } = useReports();
  const r = data?.find(x => x.id === id);
  const t = r ? templateByCode(r.template_code) : null;
  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Chargement…</p>;
  if (!r) return <p className="text-sm text-muted-foreground py-10 text-center">Rapport introuvable ou accès refusé.</p>;
  if (!t) return <p className="text-sm text-muted-foreground py-10 text-center">Ce rapport utilise un ancien modèle ({r.template_code}) ; il reste consultable en PDF depuis le module BI.</p>;
  return <ReportEditor key={`${r.id}-${r.updated_at}`} template={t} report={r} />;
}

export default function ReportingPage() {
  return (
    <Routes>
      <Route index element={<ReportingHome />} />
      <Route path="a-valider" element={<ReportingHome view="review" />} />
      <Route path="mes-rapports" element={<ReportingHome view="mine" />} />
      <Route path="modeles" element={<ReportingHome view="templates" />} />
      <Route path="nouveau/:code" element={<NewReport />} />
      <Route path=":id" element={<ExistingReport />} />
    </Routes>
  );
}
