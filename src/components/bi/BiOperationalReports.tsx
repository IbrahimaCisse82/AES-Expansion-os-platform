import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { BI_REPORT_TEMPLATES, type BiReportTemplate } from '@/lib/biReportTemplates';
import { useReportInstances, useBiInstanceMutations, type ReportInstance } from '@/hooks/useBiReports';
import { useCountries } from '@/hooks/useExpansionData';
import { useBiPoles } from '@/hooks/useBiData';
import { useAuth } from '@/hooks/useAuth';

const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', submitted: 'Soumis', validated: 'Validé' };

export function BiOperationalReports() {
  const { user } = useAuth();
  const { data: instances } = useReportInstances();
  const { data: countries } = useCountries();
  const { data: poles } = useBiPoles();
  const { saveInstance, updateInstance } = useBiInstanceMutations();

  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<BiReportTemplate | null>(null);
  const [editing, setEditing] = useState<ReportInstance | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [countryId, setCountryId] = useState<string>('');

  const openNew = (t: BiReportTemplate) => {
    setTemplate(t);
    setEditing(null);
    setValues({});
    setCountryId('');
    setPeriod(new Date().toISOString().slice(0, 7));
    setOpen(true);
  };

  const openEdit = (i: ReportInstance) => {
    const t = BI_REPORT_TEMPLATES.find(x => x.code === i.template_code) ?? null;
    setTemplate(t);
    setEditing(i);
    setValues(Object.fromEntries(Object.entries(i.data ?? {}).map(([k, v]) => [k, String(v ?? '')])));
    setCountryId(i.country_id ?? '');
    setPeriod(i.period);
    setOpen(true);
  };

  const submit = () => {
    if (!template) return;
    if (editing) {
      updateInstance.mutate({ id: editing.id, data: values });
      toast.success('Rapport mis à jour');
    } else {
      saveInstance.mutate({
        template_code: template.code,
        title: template.name,
        country_id: countryId || null,
        pole_id: template.poleCode ? poles?.find(p => p.code === template.poleCode)?.id ?? null : null,
        period,
        data: values,
        author_id: user?.id ?? null,
        author_name: (user?.user_metadata as Record<string, string> | undefined)?.full_name ?? user?.email ?? null,
      });
    }
    setOpen(false);
  };

  const exportPdf = async (i: ReportInstance) => {
    const t = BI_REPORT_TEMPLATES.find(x => x.code === i.template_code);
    const [{ default: JsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new JsPDF();
    doc.setFontSize(14);
    doc.text(`${i.template_code} — ${i.title}`, 14, 16);
    doc.setFontSize(9);
    doc.text(`Période : ${i.period} · ExpansionOS`, 14, 23);
    autoTable.default(doc, {
      head: [['Champ', 'Valeur']],
      body: (t?.fields ?? []).map(f => [f.label, String(i.data?.[f.key] ?? '—')]),
      startY: 28,
      styles: { fontSize: 8 },
    });
    doc.save(`${i.template_code}-${i.period}.pdf`);
    toast.success('PDF généré');
  };

  const FREQ_LABELS: Record<string, string> = { weekly: 'Hebdo', monthly: 'Mensuel', quarterly: 'Trimestriel', adhoc: 'À la demande' };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Modèles de rapports (A1–A12)</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {BI_REPORT_TEMPLATES.map(t => (
            <button key={t.code} onClick={() => openNew(t)} className="text-left rounded-md border p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.code}</Badge>
                <span className="text-xs font-medium">{t.name}</span>
                <Plus className="h-3 w-3 ml-auto text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{t.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{FREQ_LABELS[t.frequency]}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Rapports saisis</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Période</TableHead>
                <TableHead className="text-xs">Pays</TableHead>
                <TableHead className="text-xs">Auteur</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(instances ?? []).map(i => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs"><Badge variant="outline" className="mr-1 text-[10px]">{i.template_code}</Badge>{i.title}</TableCell>
                  <TableCell className="text-xs">{i.period}</TableCell>
                  <TableCell className="text-xs">{countries?.find(c => c.id === i.country_id)?.name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{i.author_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={i.status === 'validated' ? 'default' : i.status === 'submitted' ? 'secondary' : 'outline'}>{STATUS_LABELS[i.status] ?? i.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="PDF" onClick={() => void exportPdf(i)}><FileText className="h-3 w-3" /></Button>
                      {i.status === 'draft' && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Modifier" onClick={() => openEdit(i)}><Send className="h-3 w-3 rotate-45" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Soumettre" onClick={() => { updateInstance.mutate({ id: i.id, status: 'submitted' }); toast.success('Rapport soumis'); }}><Send className="h-3 w-3" /></Button>
                        </>
                      )}
                      {i.status === 'submitted' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Valider" onClick={() => { updateInstance.mutate({ id: i.id, status: 'validated' }); toast.success('Rapport validé'); }}><Check className="h-3 w-3" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(instances ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">Aucun rapport saisi. Choisissez un modèle ci-dessus.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{template ? `${template.code} — ${template.name}` : 'Rapport'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Période</Label>
                <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} disabled={!!editing && editing.status !== 'draft'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pays</Label>
                <Select value={countryId} onValueChange={setCountryId} disabled={!!editing && editing.status !== 'draft'}>
                  <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    {countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {template?.fields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea rows={3} value={values[f.key] ?? ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />
                ) : (
                  <Input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={values[f.key] ?? ''}
                    onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit}>{editing ? 'Enregistrer' : 'Créer le rapport'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
