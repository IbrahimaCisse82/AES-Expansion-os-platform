import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import StatusPill from '@/components/StatusPill';
import PhaseChecklist from '@/components/country/PhaseChecklist';
import CountryDocuments from '@/components/country/CountryDocuments';
import CountryMembers from '@/components/country/CountryMembers';
import CountryKpiCharts from '@/components/country/CountryKpiCharts';
import CountryNotes from '@/components/country/CountryNotes';
import { computeMarketScore, getScoreColor, getScoreLabel, buildScoreInputs } from '@/lib/marketScoring';
import { useCountries, useMilestones, useRisks, useBudgetEntries } from '@/hooks/useExpansionData';
import { useKpiHistory } from '@/hooks/useKpiHistory';
import { formatFCFACompact } from '@/lib/currency';
import { useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestoneMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';

const phaseNames = [
  'Phase 0 — Prospection', 'Phase 1 — Étude & Légal', 'Phase 2 — Mise en place',
  'Phase 3 — Lancement', 'Phase 4 — Opérationnel',
];

const milestoneSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(200),
  icon: z.string().max(10).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type MilestoneForm = z.infer<typeof milestoneSchema>;
const EMPTY_FORM: MilestoneForm = { title: '', icon: '📌', start_date: '', end_date: '' };
const CAN_WRITE = ['admin', 'director', 'country_manager'];

interface CountryDetailPageProps {
  onBack: () => void;
}

export default function CountryDetailPage({ onBack }: CountryDetailPageProps) {
  const { countryId } = useParams<{ countryId: string }>();
  const { data: countries = [] } = useCountries();
  const { data: milestones = [] } = useMilestones(countryId ?? undefined);
  const { data: risks = [] } = useRisks();
  const { data: kpiHistory = [] } = useKpiHistory(countryId ?? undefined);
  const { data: budgetEntries = [] } = useBudgetEntries();
  // Dernier mois de KPI saisi : source de vérité des indicateurs affichés
  const lastKpi = kpiHistory.length > 0 ? kpiHistory.reduce((a, b) => (b.month > a.month ? b : a)) : null;
  const { data: myRole } = useCurrentUserRole();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const canWrite = CAN_WRITE.includes(myRole ?? '');
  const country = countries.find(c => c.id === countryId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<MilestoneForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!countryId) return null;

  if (!country) return null;

  const colorMap: Record<string, string> = { sage: 'text-sage', sky: 'text-sky', gold: 'text-gold', terracotta: 'text-terracotta', plum: 'text-plum' };

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setDialogOpen(true); };
  const openEdit = (m: typeof milestones[0]) => {
    setForm({ title: m.title, icon: m.icon, start_date: m.start_date ?? '', end_date: m.end_date ?? '' });
    setEditingId(m.id); setErrors({}); setDialogOpen(true);
  };
  const toggleDone = (m: typeof milestones[0]) => {
    if (!canWrite) return;
    updateMilestone.mutate({ id: m.id, is_done: !m.is_done, country_id: countryId });
  };

  const handleSubmit = () => {
    const result = milestoneSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(e => { fe[e.path[0] as string] = e.message; });
      setErrors(fe); return;
    }
    const payload = {
      title: result.data.title, icon: result.data.icon || '📌',
      target_date: result.data.end_date || null, start_date: result.data.start_date || null,
      end_date: result.data.end_date || null, country_id: countryId,
    };
    if (editingId) {
      updateMilestone.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { toast.success('Jalon modifié'); setDialogOpen(false); },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      createMilestone.mutate(payload, {
        onSuccess: () => { toast.success('Jalon créé'); setDialogOpen(false); },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMilestone.mutate({ id: deleteId, countryId }, {
      onSuccess: () => { toast.success('Jalon supprimé'); setDeleteId(null); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="animate-page-enter">
      <button onClick={onBack} className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={14} /> Retour aux pays
      </button>
      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{country.flag}</span>
        <div className="flex-1">
          <h2 className="font-display text-[26px] font-bold text-primary">{country.name}</h2>
          <p className="text-[13px] text-muted-foreground">{country.region} · {phaseNames[country.phase]}</p>
        </div>
        <StatusPill status={country.status} />
      </div>

      {/* Phase Progress */}
      <div className="flex items-center gap-0 mb-6">
        {phaseNames.map((phase, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex-1 py-2 px-1.5 text-center text-[11px] font-semibold rounded-lg border-[1.5px] transition-all ${
              i < country.phase ? 'bg-sage-light text-sage-dark border-sage' :
              i === country.phase ? 'bg-primary text-primary-foreground border-primary shadow-card-hover' :
              'bg-muted text-muted-foreground border-border'
            }`}>{phase.split(' — ')[0]}</div>
            {i < 4 && <div className="w-5 text-center text-border text-sm flex-shrink-0">›</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Informations */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Informations</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[['Population', country.population], ['PIB', country.gdp], ['Langue', country.language], ['Contact', country.local_contact]].map(([k, v]) => (
              <div key={k} className="bg-muted rounded-lg p-3">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{k}</div>
                <div className="text-[13.5px] font-semibold text-primary">{v}</div>
              </div>
            ))}
          </div>
          <div className="bg-muted rounded-lg p-3.5 text-[13px] leading-relaxed">{country.description}</div>
        </div>

        {/* Milestones */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15.5px] font-semibold text-primary">Jalons clés</h3>
            {canWrite && (
              <Button onClick={openCreate} variant="outline" size="sm" className="gap-1 text-[11px] h-7">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </Button>
            )}
          </div>
          {milestones.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucun jalon</div>}
          {milestones.map(m => (
            <div key={m.id} className="flex gap-3 py-3 border-b border-border last:border-b-0 group">
              <div onClick={() => toggleDone(m)} className={`w-5 h-5 mt-0.5 border-2 rounded flex-shrink-0 flex items-center justify-center transition-colors ${canWrite ? 'cursor-pointer' : ''} ${m.is_done ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}>
                {m.is_done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent-foreground" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>}
              </div>
              <span className="text-lg w-7 text-center flex-shrink-0">{m.icon}</span>
              <div className="flex-1">
                <div className={`text-[13px] font-medium ${m.is_done ? 'line-through text-muted-foreground' : ''}`}>{m.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {m.start_date && m.end_date ? `${m.start_date} → ${m.end_date}` : m.end_date || m.start_date || m.target_date}
                </div>
              </div>
              <StatusPill status={m.is_done ? 'done' : 'planning'} />
              {canWrite && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setDeleteId(m.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Phase Checklist */}
        <PhaseChecklist countryId={countryId} phase={country.phase} canWrite={canWrite} />

        {/* Market Score */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Scoring Marché</h3>
          {(() => {
            const score = computeMarketScore(country, buildScoreInputs(country.id, { milestones, risks, kpiHistory, budgetEntries }));
            const colorClass = getScoreColor(score);
            const label = getScoreLabel(score);
            return (
              <div className="text-center py-4">
                <div className={`font-display text-[42px] font-bold ${colorClass}`}>{score}</div>
                <div className="text-[12px] text-muted-foreground">{label}</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mt-3 mx-auto max-w-[200px]">
                  <div className={`h-full rounded-full ${score >= 75 ? 'bg-accent' : score >= 50 ? 'bg-[hsl(var(--sky))]' : score >= 25 ? 'bg-[hsl(var(--gold))]' : 'bg-destructive'}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Documents */}
        <CountryDocuments countryId={countryId} canWrite={canWrite} />

        {/* Team Members */}
        <CountryMembers countryId={countryId} canWrite={canWrite} />

        {/* KPI Charts inline */}
        <CountryKpiCharts countryId={countryId} />

        {/* Journal de Bord */}
        <CountryNotes countryId={countryId} canWrite={canWrite} />

        {/* KPIs snapshot */}
        <div className="bg-card border border-border rounded-lg p-5 col-span-2">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">
            KPIs{lastKpi && <span className="ml-2 text-[11px] font-normal text-muted-foreground">({lastKpi.month})</span>}
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {(lastKpi
              ? [['CA Mensuel', formatFCFACompact(lastKpi.ca), 'sage'], ['Clients', lastKpi.clients.toLocaleString('fr-FR'), 'sky'], ['NPS', String(lastKpi.nps), 'gold'], ['Rétention', `${lastKpi.retention} %`, 'terracotta']]
              : [['CA Mensuel', country.kpi_ca || 'N/A', 'sage'], ['Clients', country.kpi_clients || 'N/A', 'sky'], ['NPS', country.kpi_nps || 'N/A', 'gold'], ['Rétention', country.kpi_retention || 'N/A', 'terracotta']]
            ).map(([label, value, color]) => (
              <div key={label} className="bg-muted rounded-lg p-4 text-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
                <div className={`font-display text-[22px] font-bold ${value === 'N/A' ? 'text-muted-foreground' : (colorMap[color as string] || 'text-sage')}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestone Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier le jalon' : 'Nouveau jalon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={200} className="mt-1" />
              {errors.title && <p className="text-destructive text-[11px] mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label className="text-[12.5px]">Icône</Label>
              <Input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} maxLength={10} placeholder="📌" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Date début</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-[12.5px]">Date fin</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createMilestone.isPending || updateMilestone.isPending}>
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce jalon ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
