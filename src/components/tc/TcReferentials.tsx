import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTcCan, useTcCatalog, useTcMutations, useTcRaci } from '@/hooks/useTc';
import { missionCost } from '@/lib/tc/sales';
import type { TcSettings } from '@/lib/tc/types';
import type { Database } from '@/integrations/supabase/types';
import type { TcEngine } from './tcPeriod';
import { EditableTable, ReadOnlyNote, Section, money } from './tcUi';

const err = (e: Error) => toast.error(e.message);

// ---------------------------------------------------------------------
// PARAMETRES
// ---------------------------------------------------------------------
const SETTINGS_FIELDS: { section: string; rows: { key: keyof TcSettings; label: string; kind: 'pct' | 'money' | 'int' | 'date'; hint?: string }[] }[] = [
  { section: 'Prix et marges', rows: [
    { key: 'margin_rate', label: 'Taux de marge sur prix de revient', kind: 'pct', hint: 'Par défaut ; modifiable kit par kit' },
    { key: 'vat_rate', label: 'Taux de TVA', kind: 'pct', hint: 'TVA Burkina Faso' },
    { key: 'contingency_rate', label: 'Imprévus (% matériel + MO + transport)', kind: 'pct' },
    { key: 'inventory_date', label: "Date de l'inventaire de référence", kind: 'date' },
    { key: 'payment_delay_days', label: 'Délai de paiement client (jours après livraison)', kind: 'int', hint: 'Au-delà : créance en retard' },
  ] },
  { section: 'Frais terrain et SAV', rows: [
    { key: 'cost_per_km', label: 'Coût véhicule (FCFA / km)', kind: 'money', hint: 'Carburant + usure + chauffeur' },
    { key: 'per_diem', label: 'Per diem (FCFA / jour / personne)', kind: 'money' },
    { key: 'lodging_per_night', label: 'Hébergement (FCFA / nuit / personne)', kind: 'money' },
    { key: 'default_mission_people', label: 'Nb de personnes par mission (défaut)', kind: 'int' },
    { key: 'warranty_rate', label: 'Provision garantie / SAV (% CA HT)', kind: 'pct' },
  ] },
  { section: 'Commissions et prévisions', rows: [
    { key: 'commission_rate', label: 'Taux de commission de base (% CA HT vendu)', kind: 'pct', hint: 'Acquise à la vente, payable quand le client a soldé' },
    { key: 'bonus_threshold', label: "Seuil de bonus (% de l'objectif CA mensuel)", kind: 'pct' },
    { key: 'bonus_rate', label: 'Taux de bonus (% CA HT vendu du mois)', kind: 'pct' },
    { key: 'default_probability', label: 'Probabilité de signature par défaut', kind: 'pct' },
  ] },
];

function SettingsForm({ settings }: { settings: TcSettings }) {
  const can = useTcCan();
  const canEdit = can('settings');
  const qc = useQueryClient();
  const save = async (key: keyof TcSettings, value: number | string | null) => {
    const { data: rows, error: e1 } = await supabase.from('tc_settings').select('id').limit(1);
    if (e1) { toast.error(e1.message); return; }
    const payload = { [key]: value } as Database['public']['Tables']['tc_settings']['Update'];
    const { error } = rows?.[0]
      ? await supabase.from('tc_settings').update(payload).eq('id', rows[0].id)
      : await supabase.from('tc_settings').insert(payload);
    if (error) toast.error(error.message.includes('check') ? 'Valeur hors limites' : error.message);
    else { toast.success('Paramètre enregistré'); qc.invalidateQueries({ queryKey: ['tc'] }); }
  };
  return (
    <div className="space-y-4">
      <ReadOnlyNote show={!canEdit} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {SETTINGS_FIELDS.map(sec => (
          <Section key={sec.section} title={sec.section}>
            <div className="space-y-3">
              {sec.rows.map(f => {
                const v = settings[f.key];
                const display = v === null || v === undefined ? '' : f.kind === 'pct' ? String(Math.round(Number(v) * 10000) / 100) : String(v);
                return (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{f.label}{f.kind === 'pct' ? ' (%)' : ''}</Label>
                    <Input key={`${f.key}-${display}`} defaultValue={display} disabled={!canEdit} type={f.kind === 'date' ? 'date' : 'text'}
                      inputMode={f.kind === 'date' ? undefined : 'decimal'} className={`h-8 text-xs ${f.kind === 'date' ? '' : 'text-right tabular-nums'}`}
                      onBlur={e => {
                        if (e.target.value === display) return;
                        if (f.kind === 'date') { void save(f.key, e.target.value || null); return; }
                        const n = Number(e.target.value.replace(/\s/g, '').replace(',', '.'));
                        if (!Number.isFinite(n) || n < 0) { toast.error('Valeur invalide'); e.target.value = display; return; }
                        void save(f.key, f.kind === 'pct' ? n / 100 : f.kind === 'int' ? Math.round(n) : n);
                      }} />
                    {f.hint && <p className="text-[10.5px] text-muted-foreground">{f.hint}</p>}
                  </div>
                );
              })}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Catalogue Odoo (lecture)
// ---------------------------------------------------------------------
function Catalog() {
  const { data = [], isLoading } = useTcCatalog();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? data.filter(r => `${r.designation} ${r.category ?? ''}`.toLowerCase().includes(s)) : data).slice(0, 300);
  }, [data, q]);
  return (
    <Section title="Catalogue des articles Odoo" description={`${data.length} articles — pour choisir un article hors stock dans un kit.`}>
      <div className="relative mb-3 w-[300px]">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="h-8 pl-8 text-xs" />
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Catégorie Odoo</TableHead><TableHead className="text-xs">Article</TableHead><TableHead className="text-xs text-right">Coût Odoo</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs py-1.5">{r.category}</TableCell>
                <TableCell className="text-xs py-1.5">{r.designation}</TableCell>
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{Number(r.odoo_cost) ? money(Number(r.odoo_cost)) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {rows.length === 300 && <p className="text-[11px] text-muted-foreground mt-2">Affinez la recherche pour voir plus de résultats.</p>}
    </Section>
  );
}

// ---------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------
export function TcReferentials({ engine }: { engine: TcEngine }) {
  const { data } = engine;
  const can = useTcCan();
  const labor = useTcMutations('tc_labor_profiles');
  const zones = useTcMutations('tc_zones');
  const teams = useTcMutations('tc_teams');
  const suppliers = useTcMutations('tc_supplier_prices');
  const [sp, setSp] = useState({ designation: '', supplier: '', unit_price: '', lead_days: '' });
  const designations = useMemo(() => [...new Set(data.stock.map(s => s.designation))].sort(), [data.stock]);

  const addSupplierPrice = () => {
    const price = Number(sp.unit_price.replace(/\s/g, '').replace(',', '.'));
    if (!sp.designation.trim() || !sp.supplier.trim() || !(price > 0)) { toast.error('Article, fournisseur et prix (> 0) sont obligatoires'); return; }
    suppliers.insert.mutate({
      designation: sp.designation.trim(), supplier: sp.supplier.trim(), unit_price: price,
      lead_days: sp.lead_days ? Number(sp.lead_days) : null, quote_date: new Date().toISOString().slice(0, 10),
    }, { onSuccess: () => { setSp({ designation: '', supplier: '', unit_price: '', lead_days: '' }); toast.success('Prix ajouté'); }, onError: err });
  };

  return (
    <Tabs defaultValue="settings">
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="settings" className="text-xs">Paramètres</TabsTrigger>
        <TabsTrigger value="labor" className="text-xs">Main d'œuvre</TabsTrigger>
        <TabsTrigger value="zones" className="text-xs">Zones / frais terrain</TabsTrigger>
        <TabsTrigger value="suppliers" className="text-xs">Prix fournisseurs</TabsTrigger>
        <TabsTrigger value="teams" className="text-xs">Équipes</TabsTrigger>
        <TabsTrigger value="catalog" className="text-xs">Catalogue Odoo</TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="mt-4"><SettingsForm settings={data.settings} /></TabsContent>

      <TabsContent value="labor" className="mt-4">
        <Section title="Coût horaire du personnel à déployer" description="Coût horaire chargé de chaque profil, utilisé dans la main d'œuvre des kits.">
          <ReadOnlyNote show={!can('labor')} />
          <EditableTable rows={data.labor} canEdit={can('labor')}
            onSave={(id, patch) => labor.update.mutate({ id, ...(patch as object) }, { onError: err })}
            onAdd={() => labor.insert.mutate({ name: `Nouveau profil ${data.labor.length + 1}`, hourly_rate: 0, sort_order: data.labor.length }, { onError: err })}
            onDelete={r => labor.remove.mutate(r.id, { onError: (e: Error) => toast.error(e.message.includes('foreign key') ? 'Profil utilisé dans un kit : retirez-le des kits avant de le supprimer.' : e.message) })}
            addLabel="Ajouter un profil"
            columns={[
              { key: 'name', label: 'Profil' },
              { key: 'hourly_rate', label: 'Coût horaire (FCFA/h)', type: 'money', width: '170px' },
              { key: 'comment', label: 'Commentaire' },
            ]} />
        </Section>
      </TabsContent>

      <TabsContent value="zones" className="mt-4">
        <Section title="Zones d'intervention" description={`Coût mission = distance × 2 × ${money(data.settings.cost_per_km)}/km + jours × ${data.settings.default_mission_people} pers. × per diem + nuitées × pers. × hébergement.`}>
          <ReadOnlyNote show={!can('zones')} />
          <EditableTable rows={data.zones} canEdit={can('zones')}
            onSave={(id, patch) => zones.update.mutate({ id, ...(patch as object) }, { onError: err })}
            onAdd={() => zones.insert.mutate({ name: `Nouvelle zone ${data.zones.length + 1}`, distance_km: 0, mission_days: 1, nights: 0, sort_order: data.zones.length }, { onError: err })}
            onDelete={r => zones.remove.mutate(r.id, { onError: err })}
            addLabel="Ajouter une zone"
            columns={[
              { key: 'name', label: 'Zone' },
              { key: 'distance_km', label: 'Distance aller (km)', type: 'number', width: '140px' },
              { key: 'mission_days', label: 'Jours de mission', type: 'number', width: '130px' },
              { key: 'nights', label: 'Nuitées', type: 'number', width: '100px' },
              { key: 'id', label: 'Coût mission type', render: z => money(missionCost(z, data.settings.default_mission_people, data.settings)), align: 'right' },
            ]} />
        </Section>
      </TabsContent>

      <TabsContent value="suppliers" className="mt-4">
        <Section title="Prix fournisseurs locaux" description="Un devis par ligne. Si plusieurs fournisseurs proposent un même article, les kits retiennent automatiquement le prix le plus bas.">
          <ReadOnlyNote show={!can('suppliers')} />
          {can('suppliers') && (
            <div className="flex flex-wrap gap-2 items-end mb-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Article</Label>
                <Input list="tc-stock-designations" value={sp.designation} onChange={e => setSp(s => ({ ...s, designation: e.target.value }))} className="h-8 text-xs w-[300px]" />
                <datalist id="tc-stock-designations">{designations.map(d => <option key={d} value={d} />)}</datalist>
              </div>
              <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Fournisseur</Label><Input value={sp.supplier} onChange={e => setSp(s => ({ ...s, supplier: e.target.value }))} className="h-8 text-xs w-[180px]" /></div>
              <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Prix unitaire HT</Label><Input value={sp.unit_price} inputMode="decimal" onChange={e => setSp(s => ({ ...s, unit_price: e.target.value }))} className="h-8 text-xs w-[130px] text-right" /></div>
              <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Délai (jours)</Label><Input value={sp.lead_days} inputMode="numeric" onChange={e => setSp(s => ({ ...s, lead_days: e.target.value }))} className="h-8 text-xs w-[90px] text-right" /></div>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={addSupplierPrice}><Plus className="h-3.5 w-3.5" />Ajouter</Button>
            </div>
          )}
          <EditableTable rows={data.supplierPrices} canEdit={can('suppliers')}
            onSave={(id, patch) => suppliers.update.mutate({ id, ...(patch as object) }, { onError: (e: Error) => toast.error(e.message.includes('check') ? 'Le prix doit être > 0' : e.message) })}
            onDelete={r => suppliers.remove.mutate(r.id, { onError: err })}
            empty="Aucun prix fournisseur saisi : les articles hors stock apparaîtront « Prix fournisseur manquant »."
            columns={[
              { key: 'designation', label: 'Désignation' },
              { key: 'supplier', label: 'Fournisseur', width: '160px' },
              { key: 'contact', label: 'Contact', width: '150px' },
              { key: 'unit_price', label: 'Prix unitaire HT', type: 'money', width: '140px' },
              { key: 'lead_days', label: 'Délai (j)', type: 'number', width: '90px' },
              { key: 'quote_date', label: 'Date devis', type: 'date', width: '140px' },
              { key: 'remark', label: 'Remarque' },
            ]} />
        </Section>
      </TabsContent>

      <TabsContent value="teams" className="mt-4">
        <Section title="Équipes commerciales et techniques" description="Renommez les équipes avec leurs vrais noms ; la capacité se règle dans l'onglet Capacité.">
          <ReadOnlyNote show={!can('teams')} />
          <EditableTable rows={data.teams} canEdit={can('teams')}
            onSave={(id, patch) => teams.update.mutate({ id, ...(patch as object) }, { onError: err })}
            onAdd={() => teams.insert.mutate({ name: `Équipe ${data.teams.length + 1}`, sort_order: data.teams.length }, { onError: err })}
            onDelete={r => teams.remove.mutate(r.id, { onError: (e: Error) => toast.error(e.message.includes('foreign key') ? 'Équipe utilisée dans le journal des ventes : impossible de la supprimer.' : e.message) })}
            addLabel="Ajouter une équipe"
            columns={[
              { key: 'name', label: 'Équipe' },
              { key: 'manager', label: 'Responsable' },
              { key: 'region', label: 'Zone / région' },
            ]} />
        </Section>
      </TabsContent>

      <TabsContent value="catalog" className="mt-4"><Catalog /></TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------
// RACI
// ---------------------------------------------------------------------
const RACI_ROLES = ['Directeur Général', 'Directeur commercial', 'Commerciaux (équipes)', 'Responsable technique', 'Techniciens', 'Magasin / Logistique', 'Achats', 'Finance / Comptabilité', 'RH', 'Contrôle'];
const RACI_VALUES = ['R', 'A', 'C', 'I', 'R/A'];
const RACI_TONE: Record<string, string> = {
  R: 'bg-[hsl(var(--sky))]/20', A: 'bg-[hsl(var(--plum))]/20 font-semibold', 'R/A': 'bg-[hsl(var(--plum))]/20 font-semibold', C: 'bg-[hsl(var(--gold))]/15', I: 'bg-muted',
};

export function TcRaci() {
  const { data = [], isLoading } = useTcRaci();
  const can = useTcCan();
  const canEdit = can('raci');
  const qc = useQueryClient();
  const setCell = async (id: string, assignments: Record<string, string>, role: string, value: string) => {
    const next = { ...assignments };
    if (value === '-') delete next[role]; else next[role] = value;
    const { error } = await supabase.from('tc_raci').update({ assignments: next }).eq('id', id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ['tc', 'raci'] });
  };
  // Contrôle de cohérence : un seul « A » (ou R/A) par activité
  const issues = data.filter(r => Object.values(r.assignments).filter(v => v === 'A' || v === 'R/A').length !== 1);
  return (
    <Section title="Matrice RACI — responsabilités" description="R = réalise · A = approuve / rend des comptes (un seul par activité) · C = consulté · I = informé.">
      <ReadOnlyNote show={!canEdit} />
      {issues.length > 0 && <p className="text-[11.5px] text-destructive mb-2">{issues.length} activité(s) sans « A » unique : {issues.map(i => i.sort_order).join(', ')}.</p>}
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">N°</TableHead>
                <TableHead className="text-xs">Processus</TableHead>
                <TableHead className="text-xs min-w-[220px]">Activité</TableHead>
                <TableHead className="text-xs">Fréquence</TableHead>
                {RACI_ROLES.map(r => <TableHead key={r} className="text-[10.5px] text-center min-w-[80px]">{r}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs py-1">{r.sort_order}</TableCell>
                  <TableCell className="text-[11px] py-1 text-muted-foreground">{r.process}</TableCell>
                  <TableCell className="text-xs py-1">{r.activity}</TableCell>
                  <TableCell className="text-[11px] py-1 text-muted-foreground">{r.frequency}</TableCell>
                  {RACI_ROLES.map(role => {
                    const v = r.assignments[role] ?? '';
                    return (
                      <TableCell key={role} className={`text-xs py-1 text-center ${RACI_TONE[v] ?? ''}`}>
                        {canEdit ? (
                          <Select value={v || '-'} onValueChange={val => void setCell(r.id, r.assignments, role, val)}>
                            <SelectTrigger className="h-7 text-xs border-0 bg-transparent justify-center px-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{['-', ...RACI_VALUES].map(x => <SelectItem key={x} value={x} className="text-xs">{x}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : v}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">Les droits d'écriture de la plateforme (paramètres, kits, stock, prix, objectifs, ventes) sont appliqués en base selon cette répartition.</p>
    </Section>
  );
}
