import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Download, Info } from 'lucide-react';
import { useCountries, useTasks, useRisks, useBudgetEntries } from '@/hooks/useExpansionData';
import { exportToCSV } from '@/lib/csvExport';

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

function DataExportSection() {
  const { data: countries = [] } = useCountries();
  const { data: tasks = [] } = useTasks();
  const { data: risks = [] } = useRisks();
  const { data: budget = [] } = useBudgetEntries();

  const exportAll = (type: 'countries' | 'tasks' | 'risks' | 'budget') => {
    if (type === 'countries') {
      exportToCSV(countries.map(c => ({
        'Pays': c.name, 'Region': c.region, 'Statut': c.status, 'Phase': c.phase,
        'Progression': `${c.pct}%`, 'Population': c.population, 'PIB': c.gdp,
        'Langue': c.language, 'Contact': c.local_contact,
      })), 'pays');
    } else if (type === 'tasks') {
      exportToCSV(tasks.map(t => ({
        'Titre': t.title, 'Marche': t.country_label || '', 'Priorite': t.priority,
        'Statut': t.status, 'Echeance': t.due_date || '', 'Responsable': t.owner_name || '',
      })), 'taches');
    } else if (type === 'risks') {
      exportToCSV(risks.map(r => ({
        'Titre': r.title, 'Niveau': r.level, 'Impact': r.impact,
        'Probabilite': r.probability, 'Marche': r.country_label || '',
        'Mitigation': r.mitigation || '',
      })), 'risques');
    } else {
      exportToCSV(budget.map(b => ({
        'Categorie': b.category === 'market' ? b.country_label : b.category,
        'Alloue (K FCFA)': b.allocated_k, 'Depense (K FCFA)': b.spent_k,
        'Exercice': b.fiscal_year,
      })), 'budget');
    }
    toast.success('Export CSV termine');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">Export de donnees</h3>
        <p className="text-[12px] text-muted-foreground">Exportez vos donnees au format CSV</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'countries' as const, label: 'Pays', count: countries.length },
          { key: 'tasks' as const, label: 'Taches', count: tasks.length },
          { key: 'risks' as const, label: 'Risques', count: risks.length },
          { key: 'budget' as const, label: 'Budget', count: budget.length },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => exportAll(item.key)}
            disabled={item.count === 0}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground">{item.label}</div>
              <div className="text-[11px] text-muted-foreground">{item.count} entrees</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlatformInfoSection() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="font-display text-[16px] font-semibold text-primary">A propos</h3>
        <p className="text-[12px] text-muted-foreground">Informations sur la plateforme</p>
      </div>
      <div className="space-y-3">
        {[
          ['Plateforme', 'ExpansionOS'],
          ['Version', '1.0.0'],
          ['Editeur', 'GrowHub Senegal'],
          ['Base de donnees', 'Supabase (PostgreSQL)'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
            <span className="text-[12.5px] text-muted-foreground">{k}</span>
            <span className="text-[12.5px] font-medium text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useRoadmapTypes() {
  return useQuery({
    queryKey: ['roadmap_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

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
    mutationFn: async (payload: { label: string; color: string; sort_order: number }) => {
      const { error } = await supabase.from('roadmap_types').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap_types'] }); toast.success('Type créé'); setDialogOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateType = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; label: string; color: string }) => {
      const { error } = await supabase.from('roadmap_types').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap_types'] }); toast.success('Type modifié'); setDialogOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roadmap_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap_types'] }); toast.success('Type supprimé'); setDeleteId(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => { setLabel(''); setColor('sage'); setEditingId(null); setDialogOpen(true); };
  const openEdit = (t: any) => { setLabel(t.label); setColor(t.color); setEditingId(t.id); setDialogOpen(true); };

  const handleSubmit = () => {
    if (!label.trim()) { toast.error('Le libellé est requis'); return; }
    if (editingId) {
      updateType.mutate({ id: editingId, label: label.trim(), color });
    } else {
      createType.mutate({ label: label.trim(), color, sort_order: types.length });
    }
  };

  if (!canManage) {
    return (
      <div className="animate-page-enter">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Paramètres</h2>
        <p className="text-muted-foreground text-sm mt-4">Vous n'avez pas les droits pour accéder aux paramètres.</p>
      </div>
    );
  }

  return (
    <div className="animate-page-enter">
      <h2 className="font-display text-[23px] font-bold text-primary mb-1">Paramètres</h2>
      <p className="text-[12.5px] text-muted-foreground mb-8">Gerez les parametres de votre plateforme</p>

      <div className="space-y-6 max-w-xl">

      <DataExportSection />

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-[16px] font-semibold text-primary">Types de Roadmap</h3>
            <p className="text-[12px] text-muted-foreground">Catégories utilisées dans la feuille de route</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : types.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun type défini</p>
        ) : (
          <div className="space-y-1.5">
            {types.map((t: any) => {
              const colorOpt = COLOR_OPTIONS.find(c => c.value === t.color);
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className={`w-3 h-3 rounded-full ${colorOpt?.css || 'bg-sage'}`} />
                  <span className="text-[13px] font-medium text-foreground flex-1">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground capitalize">{colorOpt?.label || t.color}</span>
                  <button onClick={() => openEdit(t)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteId(t.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
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
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editingId ? 'Modifier le type' : 'Nouveau type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Libellé *</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} maxLength={50} className="mt-1" placeholder="Ex: Recherche" />
            </div>
            <div>
              <Label className="text-[12.5px]">Couleur</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${c.css}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createType.isPending || updateType.isPending}>
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
            <AlertDialogTitle>Supprimer ce type ?</AlertDialogTitle>
            <AlertDialogDescription>Les barres existantes utilisant ce type ne seront pas affectées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteType.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
