import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Clock } from 'lucide-react';
import { useReportSchedules, useSavedReports, useBiReportMutations } from '@/hooks/useBiReports';
import { BI_REPORT_TEMPLATES } from '@/lib/biReportTemplates';

const FREQ_LABELS: Record<string, string> = { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel' };

export function BiDistribution() {
  const { data: schedules } = useReportSchedules();
  const { data: saved } = useSavedReports();
  const { saveSchedule, toggleSchedule, deleteSchedule } = useBiReportMutations();

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(''); // saved report id OU template_code
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [hour, setHour] = useState(7);
  const [emails, setEmails] = useState('');

  const submit = () => {
    const recipients = emails.split(/[,;\s]+/).map(e => e.trim()).filter(e => /.+@.+\..+/.test(e));
    if (!target || recipients.length === 0) return;
    const isTemplate = target.startsWith('A');
    saveSchedule.mutate({
      ...(isTemplate ? { template_code: target } : { report_id: target }),
      frequency, hour, recipients,
    });
    setOpen(false);
    setTarget('');
    setEmails('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm">Diffusion des rapports</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Envoi automatique par email selon la fréquence choisie.</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Planifier un envoi</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(schedules ?? []).map(s => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {s.template_code ? `${s.template_code} — ${BI_REPORT_TEMPLATES.find(t => t.code === s.template_code)?.name ?? ''}` : saved?.find(r => r.id === s.report_id)?.name ?? 'Rapport sauvegardé'}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {FREQ_LABELS[s.frequency] ?? s.frequency} à {s.hour}h · {s.recipients.length} destinataire(s)
                {s.last_sent_at && ` · dernier envoi ${new Date(s.last_sent_at).toLocaleDateString('fr-FR')}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={s.is_active} onCheckedChange={v => toggleSchedule.mutate({ id: s.id, is_active: v })} />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteSchedule.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
        {(schedules ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aucun envoi planifié.</p>}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Planifier un envoi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Rapport</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Choisir un rapport" /></SelectTrigger>
                <SelectContent>
                  {BI_REPORT_TEMPLATES.map(t => <SelectItem key={t.code} value={t.code}><Badge variant="outline" className="mr-1 text-[10px]">{t.code}</Badge>{t.name}</SelectItem>)}
                  {(saved ?? []).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fréquence</Label>
                <Select value={frequency} onValueChange={v => setFrequency(v as typeof frequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Heure (UTC)</Label>
                <Input type="number" min={0} max={23} value={hour} onChange={e => setHour(Math.min(23, Math.max(0, Number(e.target.value) || 0)))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Destinataires (emails séparés par des virgules) *</Label>
              <Input value={emails} onChange={e => setEmails(e.target.value)} placeholder="dg@example.com, raf@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!target || !emails.trim()} onClick={submit}>Planifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
