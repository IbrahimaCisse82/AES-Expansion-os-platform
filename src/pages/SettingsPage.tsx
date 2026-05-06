import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useRiskCategories, useCreateRiskCategory, useUpdateRiskCategory, useDeleteRiskCategory } from '@/hooks/useRiskCategories';
import { useNotificationPreferences, useUpsertNotificationPref, NOTIF_TYPES } from '@/hooks/useNotificationPreferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Download, Mail, Bell, Shield } from 'lucide-react';
import { useCountries, useTasks, useRisks, useBudgetEntries } from '@/hooks/useExpansionData';
import { exportToCSV } from '@/lib/csvExport';
import ExchangeRatesSettings from '@/components/settings/ExchangeRatesSettings';

const COLOR_OPTIONS = [
  { value: 'sage', label: 'Vert', css: 'bg-sage' },
  { value: 'gold', label: 'Or', css: 'bg-gold' },
  { value: 'sky', label: 'Bleu', css: 'bg-sky' },
  { value: 'terracotta', label: 'Orange', css: 'bg-terracotta' },
  { value: 'plum', label: 'Violet', css: 'bg-plum' },
  { value: 'coral', label: 'Corail', css: 'bg-coral' },
  { value: 'teal', label: 'Sarcelle', css: 'bg-teal' },
  { value: 'indigo', label: 'Indigo', css: 'bg-indigo' },
  { value: 'amber', label: 'Ambre', css: 'bg-amber' },
  { value: 'rose', label: 'Rose', css: 'bg-rose' },
];

// ── Data Export ──
function DataExportSection() {
  const { data: countries = [] } = useCountries();
  const { data: tasks = [] } = useTasks();
  const { data: risks = [] } = useRisks();
  const { data: budget = [] } = useBudgetEntries();

  const exportAll = (type: 'countries' | 'tasks' | 'risks' | 'budget') => {
    if (type === 'countries') {
      exportToCSV(countries.map(c => ({ 'Pays': c.name, 'Region': c.region, 'Statut': c.status, 'Phase': c.phase, 'Progression': `${c.pct}%`, 'Population': c.population, 'PIB': c.gdp, 'Langue': c.language, 'Contact': c.local_contact })), 'pays');
    } else if (type === 'tasks') {
      exportToCSV(tasks.map(t => ({ 'Titre': t.title, 'Marche': t.country_label || '', 'Priorite': t.priority, 'Statut': t.status, 'Echeance': t.due_date || '', 'Responsable': t.owner_name || '' })), 'taches');
    } else if (type === 'risks') {
      exportToCSV(risks.map(r => ({ 'Titre': r.title, 'Niveau': r.level, 'Categorie': r.category || '', 'Marche': r.country_label || '', 'Description': r.description || '', 'Mitigation': r.mitigation || '' })), 'risques');
    } else {
      exportToCSV(budget.map(b => ({ 'Categorie': b.category === 'market' ? b.country_label : b.category, 'Alloue (K FCFA)': b.allocated_k, 'Depense (K FCFA)': b.spent_k, 'Exercice': b.fiscal_year })), 'budget');
    }
    toast.success('Export CSV terminé');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">Export de données</h3>
        <p className="text-[12px] text-muted-foreground">Exportez vos données au format CSV</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([['countries', 'Pays', countries.length], ['tasks', 'Tâches', tasks.length], ['risks', 'Risques', risks.length], ['budget', 'Budget', budget.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => exportAll(key)} disabled={count === 0} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground">{label}</div>
              <div className="text-[11px] text-muted-foreground">{count} entrées</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── KPI Alert Threshold ──
function KpiAlertThresholdSection() {
  const { data: settings } = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => { const { data, error } = await supabase.from('app_settings').select('*'); if (error) throw error; return data; },
  });
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState('80');
  const currentThreshold = settings?.find(s => s.key === 'kpi_alert_threshold')?.value || '80';
  const updateThreshold = useMutation({
    mutationFn: async (newValue: string) => { const { error } = await supabase.from('app_settings').upsert({ key: 'kpi_alert_threshold', value: newValue }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app_settings'] }); toast.success('Seuil mis à jour'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const handleSave = () => {
    const val = parseInt(threshold);
    if (isNaN(val) || val < 1 || val > 100) { toast.error('Le seuil doit être entre 1 et 100%'); return; }
    updateThreshold.mutate(threshold);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">Seuil d'alerte KPI</h3>
        <p className="text-[12px] text-muted-foreground">Déclenche une alerte email lorsqu'un KPI tombe sous ce pourcentage de l'objectif</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-[12.5px] mb-1.5 block">Seuil d'alerte (%)</Label>
          <Input type="number" min="1" max="100" value={threshold} onChange={e => setThreshold(e.target.value)} onFocus={() => setThreshold(currentThreshold)} placeholder={currentThreshold} className="w-full" />
        </div>
        <Button onClick={handleSave} disabled={updateThreshold.isPending} size="sm">Enregistrer</Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Valeur actuelle : {currentThreshold}%</p>
    </div>
  );
}

// ── Risk Categories ──
function RiskCategoriesSection() {
  const { data: categories = [] } = useRiskCategories();
  const createCat = useCreateRiskCategory();
  const updateCat = useUpdateRiskCategory();
  const deleteCat = useDeleteRiskCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setName(''); setColor('#6B7280'); setEditId(null); setDialogOpen(true); };
  const openEdit = (c: { id: string; name: string; color: string }) => { setName(c.name); setColor(c.color); setEditId(c.id); setDialogOpen(true); };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Le nom est requis'); return; }
    if (editId) {
      updateCat.mutate({ id: editId, name: name.trim(), color }, { onSuccess: () => { toast.success('Catégorie modifiée'); setDialogOpen(false); }, onError: (e: Error) => toast.error(e.message) });
    } else {
      createCat.mutate({ name: name.trim(), color, sort_order: categories.length }, { onSuccess: () => { toast.success('Catégorie créée'); setDialogOpen(false); }, onError: (e: Error) => toast.error(e.message) });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-[16px] font-semibold text-primary flex items-center gap-2"><Shield className="w-4 h-4" /> Catégories de risques</h3>
          <p className="text-[12px] text-muted-foreground">Types de risques utilisés dans le registre</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]"><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>
      {categories.length === 0 ? <p className="text-sm text-muted-foreground">Aucune catégorie</p> : (
        <div className="space-y-1.5">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[13px] font-medium text-foreground flex-1">{c.name}</span>
              <button onClick={() => openEdit(c)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button onClick={() => setDeleteId(c.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle className="font-display text-lg">{editId ? 'Modifier' : 'Nouvelle catégorie'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-[12.5px]">Nom *</Label><Input value={name} onChange={e => setName(e.target.value)} maxLength={50} className="mt-1" /></div>
            <div><Label className="text-[12.5px]">Couleur</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 h-10 w-20" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit}>{editId ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle><AlertDialogDescription>Les risques existants ne seront pas affectés.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteCat.mutate(deleteId, { onSuccess: () => { toast.success('Catégorie supprimée'); setDeleteId(null); } })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Notification Preferences ──
function NotificationPreferencesSection() {
  const { data: prefs = [] } = useNotificationPreferences();
  const upsertPref = useUpsertNotificationPref();

  const getPref = (type: string) => {
    const p = prefs.find(x => x.notif_type === type);
    return { email: p?.email_enabled ?? true, inApp: p?.in_app_enabled ?? true };
  };

  const toggle = (type: string, field: 'email' | 'inApp') => {
    const cur = getPref(type);
    upsertPref.mutate({
      notif_type: type,
      email_enabled: field === 'email' ? !cur.email : cur.email,
      in_app_enabled: field === 'inApp' ? !cur.inApp : cur.inApp,
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary flex items-center gap-2"><Bell className="w-4 h-4" /> Préférences de notifications</h3>
        <p className="text-[12px] text-muted-foreground">Choisissez les notifications que vous souhaitez recevoir</p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_60px_60px] gap-2 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide px-2">
          <div>Type</div><div className="text-center">Email</div><div className="text-center">In-app</div>
        </div>
        {NOTIF_TYPES.map(nt => {
          const p = getPref(nt.key);
          return (
            <div key={nt.key} className="grid grid-cols-[1fr_60px_60px] gap-2 items-center px-2 py-1.5 rounded-lg hover:bg-muted/50">
              <span className="text-[13px]">{nt.label}</span>
              <div className="flex justify-center"><Switch checked={p.email} onCheckedChange={() => toggle(nt.key, 'email')} /></div>
              <div className="flex justify-center"><Switch checked={p.inApp} onCheckedChange={() => toggle(nt.key, 'inApp')} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Email Dashboard ──
function EmailDashboardSection() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['email_send_log_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_send_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Deduplicate by message_id
  const deduped = (() => {
    const seen = new Map<string, typeof logs[0]>();
    for (const l of logs) {
      const key = l.message_id || l.id;
      if (!seen.has(key)) seen.set(key, l);
    }
    return Array.from(seen.values());
  })();

  const sent = deduped.filter(l => l.status === 'sent').length;
  const failed = deduped.filter(l => l.status === 'dlq' || l.status === 'failed').length;
  const pending = deduped.filter(l => l.status === 'pending').length;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary flex items-center gap-2"><Mail className="w-4 h-4" /> Monitoring Emails</h3>
        <p className="text-[12px] text-muted-foreground">Suivi des emails envoyés par la plateforme</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[['Total', deduped.length, 'bg-muted'], ['Envoyés', sent, 'bg-accent/10'], ['En attente', pending, 'bg-[hsl(var(--gold))]/10'], ['Échoués', failed, 'bg-destructive/10']].map(([label, count, bg]) => (
              <div key={label as string} className={`rounded-lg p-3 text-center ${bg}`}>
                <div className="text-[20px] font-bold text-foreground">{String(count)}</div>
                <div className="text-[10.5px] text-muted-foreground">{label as string}</div>
              </div>
            ))}
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {deduped.slice(0, 20).map(l => (
              <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 text-[12px]">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${l.status === 'sent' ? 'bg-accent' : l.status === 'pending' ? 'bg-[hsl(var(--gold))]' : 'bg-destructive'}`} />
                <span className="flex-1 truncate">{l.template_name}</span>
                <span className="text-muted-foreground truncate max-w-[120px]">{l.recipient_email}</span>
                <span className="text-muted-foreground text-[10.5px]">{new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Platform Info ──
function PlatformInfoSection() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">À propos</h3>
        <p className="text-[12px] text-muted-foreground">Informations sur la plateforme</p>
      </div>
      <div className="space-y-3">
        {[['Plateforme', 'ExpansionOS'], ['Version', '2.0.0'], ['Éditeur', 'GrowHub Sénégal']].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
            <span className="text-[12.5px] text-muted-foreground">{k}</span>
            <span className="text-[12.5px] font-medium text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Currency Settings ──
function CurrencySettingsSection() {
  const { data: settings } = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => { const { data, error } = await supabase.from('app_settings').select('*'); if (error) throw error; return data; },
  });
  const qc = useQueryClient();
  const currentCurrency = settings?.find(s => s.key === 'default_currency')?.value || 'FCFA';
  const [currency, setCurrency] = useState('FCFA');
  const updateCurrency = useMutation({
    mutationFn: async (newValue: string) => { const { error } = await supabase.from('app_settings').upsert({ key: 'default_currency', value: newValue }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app_settings'] }); toast.success('Devise mise à jour'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const CURRENCIES = ['FCFA', 'EUR', 'USD', 'GBP', 'XOF', 'XAF', 'NGN', 'KES', 'ZAR', 'MAD', 'EGP', 'GHS'];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">Devise de référence</h3>
        <p className="text-[12px] text-muted-foreground">Devise utilisée comme base pour les montants (actuellement: {currentCurrency})</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-[12.5px] mb-1.5 block">Devise</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => updateCurrency.mutate(currency)} disabled={updateCurrency.isPending} size="sm">Enregistrer</Button>
      </div>
    </div>
  );
}

// ── Theme Customization ──
function ThemeCustomizationSection() {
  const { data: settings } = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => { const { data, error } = await supabase.from('app_settings').select('*'); if (error) throw error; return data; },
  });
  const qc = useQueryClient();
  const currentName = settings?.find(s => s.key === 'company_name')?.value || 'ExpansionOS';
  const [companyName, setCompanyName] = useState('');
  const updateName = useMutation({
    mutationFn: async (newValue: string) => { const { error } = await supabase.from('app_settings').upsert({ key: 'company_name', value: newValue }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app_settings'] }); toast.success('Nom mis à jour'); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">Personnalisation</h3>
        <p className="text-[12px] text-muted-foreground">Nom de l'entreprise affiché dans la plateforme (actuel: {currentName})</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-[12.5px] mb-1.5 block">Nom de l'entreprise</Label>
          <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={currentName} onFocus={() => setCompanyName(currentName)} />
        </div>
        <Button onClick={() => { if (companyName.trim()) updateName.mutate(companyName.trim()); }} disabled={updateName.isPending} size="sm">Enregistrer</Button>
      </div>
    </div>
  );
}

// ── Roadmap Types ──
function useRoadmapTypes() {
  return useQuery({
    queryKey: ['roadmap_types'],
    queryFn: async () => { const { data, error } = await supabase.from('roadmap_types').select('*').order('sort_order', { ascending: true }); if (error) throw error; return data; },
  });
}

// ── Main Settings Page ──
export default function SettingsPage() {
  const { data: myRole } = useCurrentUserRole();
  const { data: types = [], isLoading } = useRoadmapTypes();
  const qc = useQueryClient();
  const canManage = ['admin', 'director'].includes(myRole ?? '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('sage');

  const createType = useMutation({
    mutationFn: async (payload: { label: string; color: string; sort_order: number }) => { const { error } = await supabase.from('roadmap_types').insert(payload); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap_types'] }); toast.success('Type créé'); setDialogOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateType = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; label: string; color: string }) => { const { error } = await supabase.from('roadmap_types').update(updates).eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap_types'] }); toast.success('Type modifié'); setDialogOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteType = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('roadmap_types').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap_types'] }); toast.success('Type supprimé'); setDeleteId(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => { setLabel(''); setColor('sage'); setEditingId(null); setDialogOpen(true); };
  const openEdit = (t: { id: string; label: string; color: string }) => { setLabel(t.label); setColor(t.color); setEditingId(t.id); setDialogOpen(true); };
  const handleSubmit = () => {
    if (!label.trim()) { toast.error('Le libellé est requis'); return; }
    if (editingId) updateType.mutate({ id: editingId, label: label.trim(), color });
    else createType.mutate({ label: label.trim(), color, sort_order: types.length });
  };

  if (!canManage) {
    return (
      <div className="animate-page-enter">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Paramètres</h2>
        <div className="space-y-6 max-w-xl mt-6">
          <NotificationPreferencesSection />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page-enter">
      <h2 className="font-display text-[23px] font-bold text-primary mb-1">Paramètres</h2>
      <p className="text-[12.5px] text-muted-foreground mb-8">Gérez les paramètres de votre plateforme</p>

      <div className="space-y-6 max-w-xl">
        <CurrencySettingsSection />
        <ExchangeRatesSettings />
        <ThemeCustomizationSection />
        <KpiAlertThresholdSection />
        <NotificationPreferencesSection />
        <RiskCategoriesSection />
        <DataExportSection />
        <EmailDashboardSection />

        {/* Roadmap Types */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-[16px] font-semibold text-primary">Types de Roadmap</h3>
              <p className="text-[12px] text-muted-foreground">Catégories utilisées dans la feuille de route</p>
            </div>
            <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]"><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
          {isLoading ? <p className="text-muted-foreground text-sm">Chargement…</p> : types.length === 0 ? <p className="text-muted-foreground text-sm">Aucun type défini</p> : (
            <div className="space-y-1.5">
              {types.map((t: { id: string; label: string; color: string }) => {
                const colorOpt = COLOR_OPTIONS.find(c => c.value === t.color);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className={`w-3 h-3 rounded-full ${colorOpt?.css || 'bg-sage'}`} />
                    <span className="text-[13px] font-medium text-foreground flex-1">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground capitalize">{colorOpt?.label || t.color}</span>
                    <button onClick={() => openEdit(t)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteId(t.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PlatformInfoSection />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle className="font-display text-lg">{editingId ? 'Modifier le type' : 'Nouveau type'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-[12.5px]">Libellé *</Label><Input value={label} onChange={e => setLabel(e.target.value)} maxLength={50} className="mt-1" placeholder="Ex: Recherche" /></div>
            <div>
              <Label className="text-[12.5px]">Couleur</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (<SelectItem key={c.value} value={c.value}><div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${c.css}`} />{c.label}</div></SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createType.isPending || updateType.isPending}>{editingId ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce type ?</AlertDialogTitle><AlertDialogDescription>Les barres existantes utilisant ce type ne seront pas affectées.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteType.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
