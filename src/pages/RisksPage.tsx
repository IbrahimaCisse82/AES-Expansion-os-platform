import { useState, useEffect } from 'react';
import { useRisks, useCountries } from '@/hooks/useExpansionData';
import { useCreateRisk, useUpdateRisk, useDeleteRisk } from '@/hooks/useRiskMutations';
import { useCreateTask } from '@/hooks/useTaskMutations';
import { useRiskHistory } from '@/hooks/useRiskHistory';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Download, History, ShieldPlus } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { notifyAdminsViaEmail } from '@/lib/notificationEmail';
import { z } from 'zod';

const levelConfig: Record<string, { bg: string; text: string; bar: string; label: string }> = {
  high: { bg: 'bg-destructive/10', text: 'text-destructive', bar: 'bg-destructive', label: 'Élevé' },
  medium: { bg: 'bg-[hsl(var(--gold))]/10', text: 'text-[hsl(var(--gold))]', bar: 'bg-[hsl(var(--gold))]', label: 'Moyen' },
  low: { bg: 'bg-accent/10', text: 'text-accent', bar: 'bg-accent', label: 'Faible' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Ouvert', bg: 'bg-destructive/10', text: 'text-destructive' },
  mitigating: { label: 'En mitigation', bg: 'bg-[hsl(var(--gold))]/10', text: 'text-[hsl(var(--gold))]' },
  mitigated: { label: 'Mitigé', bg: 'bg-[hsl(var(--sky))]/10', text: 'text-[hsl(var(--sky))]' },
  closed: { label: 'Fermé', bg: 'bg-accent/10', text: 'text-accent' },
};

const riskSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(200),
  description: z.string().max(1000).optional(),
  mitigation: z.string().max(1000).optional(),
  level: z.enum(['high', 'medium', 'low']),
  category: z.string().max(100).optional(),
  country_id: z.string().optional(),
  country_label: z.string().optional(),
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  risk_status: z.string(),
  owner_name: z.string().max(100).optional(),
  review_date: z.string().optional(),
  estimated_cost: z.number().min(0).optional(),
});

type RiskForm = z.infer<typeof riskSchema>;

const EMPTY_FORM: RiskForm = {
  title: '', description: '', mitigation: '', level: 'medium', category: '', country_id: '', country_label: '',
  probability: 3, impact: 3, risk_status: 'open', owner_name: '', review_date: '', estimated_cost: 0,
};

const CAN_WRITE = ['admin', 'director', 'country_manager'];

// Risk History Panel component
function RiskHistoryPanel({ riskId, riskTitle }: { riskId: string; riskTitle: string }) {
  const { data: history = [], isLoading } = useRiskHistory(riskId);
  if (isLoading) return <p className="text-[11px] text-muted-foreground">Chargement…</p>;
  if (history.length === 0) return <p className="text-[11px] text-muted-foreground text-center py-2">Aucun historique</p>;
  return (
    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
      {history.map(h => (
        <div key={h.id} className="flex gap-2 py-1.5 border-b border-border last:border-b-0">
          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px]">
              {h.old_level && h.new_level && h.old_level !== h.new_level && <span>Niveau: {h.old_level} → <strong>{h.new_level}</strong> · </span>}
              {h.old_status && h.new_status && h.old_status !== h.new_status && <span>Statut: {h.old_status} → <strong>{h.new_status}</strong> · </span>}
              {h.note && <span>{h.note}</span>}
            </div>
            <div className="text-[10px] text-muted-foreground">{h.changed_by_name} · {new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RisksPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { data: myRole } = useCurrentUserRole();
  const { data: risks = [], isLoading } = useRisks();
  const { data: countries = [] } = useCountries();
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name');
      if (error) throw error;
      return data;
    },
  });
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();
  const createTask = useCreateTask();
  const { user } = useAuth();

  const canWrite = CAN_WRITE.includes(myRole ?? '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailRiskId, setDetailRiskId] = useState<string | null>(null);
  const [form, setForm] = useState<RiskForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite) openCreate();
  }, [addSignal]);

  const searchedRisks = (searchQuery ? risks.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.country_label?.toLowerCase().includes(searchQuery.toLowerCase()) || r.category?.toLowerCase().includes(searchQuery.toLowerCase())) : risks)
    .filter(r => statusFilter === 'all' || (r as Record<string, unknown>).risk_status === statusFilter);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setDialogOpen(true); };

  const openEdit = (r: typeof risks[0]) => {
    const rAny = r as Record<string, unknown>;
    setForm({
      title: r.title, description: r.description ?? '', mitigation: r.mitigation ?? '',
      level: r.level, category: r.category ?? '', country_id: r.country_id ?? '', country_label: r.country_label ?? '',
      probability: (rAny.probability as number) ?? 3,
      impact: (rAny.impact as number) ?? 3,
      risk_status: (rAny.risk_status as string) ?? 'open',
      owner_name: (rAny.owner_name as string) ?? '',
      review_date: (rAny.review_date as string) ?? '',
      estimated_cost: (rAny.estimated_cost as number) ?? 0,
    });
    setEditingId(r.id);
    setErrors({});
    setDialogOpen(true);
  };

  const handleCountryChange = (cid: string) => {
    const c = countries.find(x => x.id === cid);
    setForm(p => ({ ...p, country_id: cid, country_label: c ? `${c.flag} ${c.name}` : '' }));
  };

  const handleSubmit = () => {
    const result = riskSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach(e => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const payload = {
      title: result.data.title,
      level: result.data.level,
      description: result.data.description || null,
      mitigation: result.data.mitigation || null,
      category: result.data.category || null,
      country_id: result.data.country_id || null,
      country_label: result.data.country_label || null,
      probability: result.data.probability,
      impact: result.data.impact,
      risk_status: result.data.risk_status,
      owner_name: result.data.owner_name || null,
      review_date: result.data.review_date || null,
      estimated_cost: result.data.estimated_cost || 0,
    };
    if (editingId) {
      updateRisk.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { toast.success('Risque modifié'); setDialogOpen(false); },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      createRisk.mutate(payload, {
        onSuccess: (data) => {
          toast.success('Risque créé');
          setDialogOpen(false);
          if (payload.level === 'high') {
            notifyAdminsViaEmail({
              templateName: 'risk-alert',
              idempotencyKey: `risk-alert-${data?.id || crypto.randomUUID()}`,
              templateData: {
                riskTitle: payload.title,
                level: 'Élevé',
                countryName: payload.country_label || '',
                description: payload.description || '',
                category: payload.category || '',
              },
            });
          }
        },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRisk.mutate(deleteId, {
      onSuccess: () => { toast.success('Risque supprimé'); setDeleteId(null); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleExportCSV = () => {
    const dataToExport = searchedRisks.map(r => {
      const rAny = r as Record<string, unknown>;
      return {
        'Titre': r.title,
        'Niveau': levelConfig[r.level]?.label || r.level,
        'Probabilité': String(rAny.probability ?? 3),
        'Impact': String(rAny.impact ?? 3),
        'Score': String(((rAny.probability as number) ?? 3) * ((rAny.impact as number) ?? 3)),
        'Statut': statusConfig[(rAny.risk_status as string) ?? 'open']?.label || 'Ouvert',
        'Responsable': (rAny.owner_name as string) || '',
        'Catégorie': r.category || '',
        'Marché': r.country_label || '',
        'Description': r.description || '',
        'Mitigation': r.mitigation || '',
        'Coût estimé': String(rAny.estimated_cost ?? 0),
        'Date revue': (rAny.review_date as string) || '',
      };
    });
    exportToCSV(dataToExport, 'risques');
    toast.success('Risques exportés en CSV');
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  // Build real matrix data from probability × impact
  const matrixData: Record<string, number> = {};
  searchedRisks.forEach(r => {
    const rAny = r as Record<string, unknown>;
    const prob = (rAny.probability as number) ?? 3;
    const imp = (rAny.impact as number) ?? 3;
    const key = `${prob}-${imp}`;
    matrixData[key] = (matrixData[key] || 0) + 1;
  });

  return (
    <div className="animate-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Registre des Risques</h2>
          <p className="text-[12.5px] text-muted-foreground">Suivi et priorisation des risques par marché</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="open">Ouvert</SelectItem>
              <SelectItem value="mitigating">En mitigation</SelectItem>
              <SelectItem value="mitigated">Mitigé</SelectItem>
              <SelectItem value="closed">Fermé</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 text-[12.5px]">
            <Download className="w-4 h-4" /> Exporter
          </Button>
          {canWrite && (
            <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
              <Plus className="w-4 h-4" /> Nouveau risque
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Risques Actifs</h3>
          {searchedRisks.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucun risque enregistré</div>}
          {searchedRisks.map(r => {
            const cfg = levelConfig[r.level] || levelConfig.medium;
            const rAny = r as Record<string, unknown>;
            const rStatus = statusConfig[(rAny.risk_status as string) ?? 'open'] || statusConfig.open;
            const riskScore = ((rAny.probability as number) ?? 3) * ((rAny.impact as number) ?? 3);
            return (
              <div key={r.id} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0 group">
                <div className={`w-[5px] h-[34px] rounded-sm flex-shrink-0 ${cfg.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{r.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {r.country_label}{r.category ? ` · ${r.category}` : ''}
                    {(rAny.owner_name as string) ? ` · 👤 ${rAny.owner_name}` : ''}
                  </div>
                  {r.description && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{r.description}</div>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rStatus.bg} ${rStatus.text}`}>{rStatus.label}</span>
                  <span className="text-[10px] text-muted-foreground">P{String(rAny.probability)}×I{String(rAny.impact)} = <strong>{riskScore}</strong></span>
                  <button onClick={() => setDetailRiskId(r.id)} className="text-[9.5px] text-accent hover:underline">Historique</button>
                </div>
                {canWrite && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Risk Detail / History Panel */}
      {detailRiskId && (() => {
        const risk = searchedRisks.find(r => r.id === detailRiskId);
        if (!risk) return null;
        const rAny = risk as Record<string, unknown>;
        return (
          <div className="bg-card border border-border rounded-lg p-5 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[15.5px] font-semibold text-primary flex items-center gap-2">
                <History className="w-4 h-4" /> Historique — {risk.title}
              </h3>
              <div className="flex gap-2">
                {canWrite && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-[11px]"
                    onClick={() => {
                      if (!risk.country_id) { toast.error('Le risque doit être associé à un marché'); return; }
                      if (!user) { toast.error('Authentification requise'); return; }
                      createTask.mutate({
                        title: `Mitigation: ${risk.title}`,
                        priority: risk.level === 'high' ? 'high' : 'med',
                        status: 'open',
                        country_id: risk.country_id,
                        country_label: risk.country_label || null,
                        milestone_id: null,
                        due_date: (rAny.review_date as string) || null,
                        owner_name: (rAny.owner_name as string) || null,
                        assigned_to: user.id,
                        created_by: user.id,
                      }, {
                        onSuccess: () => toast.success('Tâche de mitigation créée'),
                        onError: (err: Error) => toast.error(err.message),
                      });
                    }}
                  >
                    <ShieldPlus className="w-3.5 h-3.5" /> Créer tâche de mitigation
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-[11px]" onClick={() => setDetailRiskId(null)}>Fermer</Button>
              </div>
            </div>
            <RiskHistoryPanel riskId={detailRiskId} riskTitle={risk.title} />
          </div>
        );
      })()}

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Heat Map — Probabilité × Impact</h3>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map(prob => (
              <div key={prob} className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_1fr] gap-1 items-center">
                <div className="text-[9.5px] font-bold text-muted-foreground text-right pr-1">P{prob}</div>
                {[1, 2, 3, 4, 5].map(imp => {
                  const score = prob * imp;
                  const count = matrixData[`${prob}-${imp}`] || 0;
                  const risksHere = searchedRisks.filter(r => {
                    const ra = r as Record<string, unknown>;
                    return ((ra.probability as number) ?? 3) === prob && ((ra.impact as number) ?? 3) === imp;
                  });
                  const bg = score >= 20 ? 'bg-destructive/30' : score >= 15 ? 'bg-destructive/20' : score >= 10 ? 'bg-[hsl(var(--gold))]/25' : score >= 5 ? 'bg-[hsl(var(--gold))]/10' : 'bg-accent/10';
                  const textCol = score >= 15 ? 'text-destructive' : score >= 8 ? 'text-[hsl(var(--gold))]' : 'text-accent';
                  return (
                    <div
                      key={imp}
                      className={`h-[52px] ${bg} rounded-md flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all relative group`}
                      title={risksHere.map(r => r.title).join('\n') || `P${prob} × I${imp} = ${score}`}
                    >
                      {count > 0 ? (
                        <>
                          <span className={`text-[13px] font-bold ${textCol}`}>{count}</span>
                          <span className="text-[7px] text-muted-foreground">score {score}</span>
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded-md p-2 shadow-lg hidden group-hover:block z-20 w-[160px]">
                            {risksHere.slice(0, 3).map(r => (
                              <div key={r.id} className="text-[9px] text-foreground truncate">• {r.title}</div>
                            ))}
                            {risksHere.length > 3 && <div className="text-[8px] text-muted-foreground">+{risksHere.length - 3} autres</div>}
                          </div>
                        </>
                      ) : (
                        <span className="text-[8px] text-muted-foreground/50">{score}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_1fr] gap-1 mt-1">
              <div />
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="text-[9.5px] font-bold text-muted-foreground text-center">I{i}</div>)}
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-2 px-8">
              <span>↑ Probabilité</span>
              <span>Impact →</span>
            </div>
            {/* Legend */}
            <div className="flex gap-3 mt-3 justify-center">
              {[
                { label: 'Critique (15-25)', bg: 'bg-destructive/25' },
                { label: 'Élevé (8-14)', bg: 'bg-[hsl(var(--gold))]/20' },
                { label: 'Faible (1-7)', bg: 'bg-accent/10' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <div className={`w-3 h-3 rounded ${l.bg}`} />{l.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier le risque' : 'Nouveau risque'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={200} className="mt-1" />
              {errors.title && <p className="text-destructive text-[11px] mt-1">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Niveau</Label>
                <Select value={form.level} onValueChange={v => setForm(p => ({ ...p, level: v as 'high' | 'medium' | 'low' }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Statut</Label>
                <Select value={form.risk_status} onValueChange={v => setForm(p => ({ ...p, risk_status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="mitigating">En mitigation</SelectItem>
                    <SelectItem value="mitigated">Mitigé</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Probabilité (1-5)</Label>
                <Select value={String(form.probability)} onValueChange={v => setForm(p => ({ ...p, probability: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['Rare', 'Peu probable', 'Possible', 'Probable', 'Quasi certain'][n - 1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Impact (1-5)</Label>
                <Select value={String(form.impact)} onValueChange={v => setForm(p => ({ ...p, impact: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['Négligeable', 'Mineur', 'Modéré', 'Majeur', 'Critique'][n - 1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Marché</Label>
                <Select value={form.country_id || '_none'} onValueChange={v => handleCountryChange(v === '_none' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucun</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12.5px]">Responsable</Label>
                <Select value={form.owner_name || '_none'} onValueChange={v => setForm(p => ({ ...p, owner_name: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucun</SelectItem>
                    {profiles.map(p => <SelectItem key={p.user_id} value={p.full_name}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12.5px]">Catégorie</Label>
                <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} maxLength={100} placeholder="Réglementaire…" className="mt-1" />
              </div>
              <div>
                <Label className="text-[12.5px]">Date de revue</Label>
                <Input type="date" value={form.review_date} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-[12.5px]">Coût estimé (FCFA)</Label>
              <Input type="number" min={0} value={form.estimated_cost} onChange={e => setForm(p => ({ ...p, estimated_cost: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-[12.5px]">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={1000} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-[12.5px]">Mitigation</Label>
              <Textarea value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))} maxLength={1000} rows={2} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createRisk.isPending || updateRisk.isPending}>
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
            <AlertDialogTitle>Supprimer ce risque ?</AlertDialogTitle>
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
