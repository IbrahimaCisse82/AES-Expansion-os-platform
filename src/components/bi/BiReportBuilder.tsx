import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, FileSpreadsheet, FileText, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  buildReport, formatCompact, formatFcfa,
  type BiFact, type BiActivity, type BiFilters, type ReportConfig, type ReportDimension, type ReportMeasure,
} from '@/lib/biAggregate';
import { useSavedReports, useBiReportMutations } from '@/hooks/useBiReports';
import { useAuth } from '@/hooks/useAuth';

const DIMENSIONS: { v: ReportDimension; l: string }[] = [
  { v: 'country', l: 'Pays' }, { v: 'pole', l: 'Pôle' }, { v: 'project', l: 'Projet' },
  { v: 'category', l: 'Catégorie' }, { v: 'month', l: 'Mois' }, { v: 'lineType', l: 'Budget/Réalisé' },
];
const MEASURES: { v: ReportMeasure; l: string }[] = [
  { v: 'budget', l: 'Montant budget' }, { v: 'actual', l: 'Montant réalisé' }, { v: 'variance', l: 'Écart' },
  { v: 'variancePct', l: 'Écart %' }, { v: 'margin', l: 'Marge (revenus − dépenses)' },
  { v: 'tasks', l: 'Nombre de tâches' }, { v: 'risks', l: 'Nombre de risques' },
];
const CHARTS = [
  { v: 'table' as const, l: 'Tableau' }, { v: 'bar' as const, l: 'Barres' },
  { v: 'line' as const, l: 'Ligne' }, { v: 'area' as const, l: 'Aires' },
];

interface Props { facts: BiFact[]; activity: BiActivity[]; filters: BiFilters; }

export function BiReportBuilder({ facts, activity, filters }: Props) {
  const { user } = useAuth();
  const { data: saved } = useSavedReports();
  const { saveReport, deleteReport } = useBiReportMutations();

  const [cfg, setCfg] = useState<ReportConfig>({ dimension: 'country', measure: 'budget', chart: 'bar' });
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team'>('private');

  const rows = useMemo(() => buildReport(facts, activity, cfg, filters), [facts, activity, cfg, filters]);
  const isAmount = ['budget', 'actual', 'variance', 'margin'].includes(cfg.measure);
  const chartData = rows.slice(0, 20).map(r => ({ name: r.label, value: r.value }));

  const title = `${DIMENSIONS.find(d => d.v === cfg.dimension)?.l} × ${MEASURES.find(m => m.v === cfg.measure)?.l}`;
  const dimLabel = DIMENSIONS.find(d => d.v === cfg.dimension)?.l ?? 'Dimension';
  const measureLabel = MEASURES.find(m => m.v === cfg.measure)?.l ?? 'Valeur';
  const cellValue = (v: number) => isAmount ? formatFcfa(v) : cfg.measure === 'variancePct' ? `${v.toFixed(1)} %` : String(Math.round(v));

  const exportExcel = () => {
    const { exportToCSV } = require('@/lib/csvExport') as typeof import('@/lib/csvExport');
    exportToCSV(rows.map(r => ({ [dimLabel]: r.label, [measureLabel]: cellValue(r.value) })), `rapport-bi-${Date.now()}.csv`);
    toast.success('Export CSV généré');
  };

  const exportPdf = async () => {
    const [{ default: JsPDF }, autoTable] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    doc.setFontSize(14);
    doc.text(`Rapport BI — ${title}`, 14, 16);
    doc.setFontSize(9);
    doc.text(`ExpansionOS · ${new Date().toLocaleDateString('fr-FR')} · Montants en FCFA`, 14, 23);
    autoTable.default(doc, {
      head: [[dimLabel, measureLabel]],
      body: rows.map(r => [r.label, cellValue(r.value)]),
      startY: 28,
      styles: { fontSize: 8 },
    });
    doc.save(`rapport-bi-${Date.now()}.pdf`);
    toast.success('Export PDF généré');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Constructeur de rapports</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Select value={cfg.dimension} onValueChange={v => setCfg({ ...cfg, dimension: v as ReportDimension })}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{DIMENSIONS.map(d => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={cfg.measure} onValueChange={v => setCfg({ ...cfg, measure: v as ReportMeasure })}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MEASURES.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={cfg.chart} onValueChange={v => setCfg({ ...cfg, chart: v as ReportConfig['chart'] })}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CHARTS.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1" onClick={exportExcel}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={exportPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={() => setSaveOpen(true)} disabled={!user}><Save className="h-3.5 w-3.5" /> Sauvegarder ce rapport</Button>
          </div>

          {cfg.chart !== 'table' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {cfg.chart === 'bar' ? (
                  <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => isAmount ? formatFcfa(v) : v.toFixed(1)} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} /></BarChart>
                ) : cfg.chart === 'line' ? (
                  <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => isAmount ? formatFcfa(v) : v.toFixed(1)} /><Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} /></LineChart>
                ) : (
                  <AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => isAmount ? formatFcfa(v) : v.toFixed(1)} /><Area dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.25)" /></AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">{DIMENSIONS.find(d => d.v === cfg.dimension)?.l}</TableHead>
                <TableHead className="text-xs text-right">{MEASURES.find(m => m.v === cfg.measure)?.l}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.label}>
                    <TableCell className="text-xs">{r.label}</TableCell>
                    <TableCell className="text-xs text-right">
                      {isAmount ? formatFcfa(r.value) : cfg.measure === 'variancePct' ? `${r.value.toFixed(1)} %` : Math.round(r.value)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-6">Aucune donnée</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
          <p className="text-[11px] text-muted-foreground">{rows.length} ligne(s) — montants {isAmount ? 'en FCFA' : ''}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Rapports sauvegardés</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(saved ?? []).map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div>
                <p className="text-xs font-medium">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.config ? `${DIMENSIONS.find(d => d.v === r.config.report.dimension)?.l ?? ''} × ${MEASURES.find(m => m.v === r.config.report.measure)?.l ?? ''}` : ''}
                  {' · '}{r.visibility === 'team' ? 'Équipe' : 'Privé'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => r.config && setCfg(r.config.report)}><Play className="h-3 w-3" /></Button>
                {r.owner_id === user?.id && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteReport.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                )}
              </div>
            </div>
          ))}
          {(saved ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aucun rapport sauvegardé.</p>}
        </CardContent>
      </Card>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sauvegarder le rapport</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Budget par pays T1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Visibilité</Label>
              <Select value={visibility} onValueChange={v => setVisibility(v as 'private' | 'team')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privé (moi seul)</SelectItem>
                  <SelectItem value="team">Équipe (périmètre pays)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Annuler</Button>
            <Button disabled={!name.trim()} onClick={() => {
              saveReport.mutate({ name: name.trim(), description, config: { report: cfg, filters }, visibility, scope_country_id: filters.countryId });
              setSaveOpen(false);
            }}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
