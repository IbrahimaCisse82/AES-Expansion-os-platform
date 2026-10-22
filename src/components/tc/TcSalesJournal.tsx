import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { tcCan, useSaveSale, useTcMutations } from '@/hooks/useTc';
import { computeSale, type SaleCalc, type SaleStatus } from '@/lib/tc/sales';
import type { TcSale } from '@/lib/tc/types';
import { formatDateFr } from '@/lib/dates';
import type { TcEngine } from './tcPeriod';
import { PaymentBadge, SaleStatusBadge, Section, exportRows, money, pct, qty } from './tcUi';

type Draft = {
  id?: string;
  quote_no: string; quote_date: string; team_id: string; salesperson: string; client: string; kit_id: string;
  quantity: string; applied_price: string; discount_pct: string; sale_date: string; delivery_date: string; lost: boolean;
  remark: string; deposit_amount: string; deposit_date: string; balance_amount: string; balance_date: string;
  zone_id: string; mission_people: string; probability_pct: string; planned_install_date: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (s: string) => (s.trim() === '' ? null : Number(s.replace(/\s/g, '').replace(',', '.')));

function toDraft(s: TcSale | null, defaults: { team: string; kit: string; salesperson: string; nextNo: string }): Draft {
  return {
    id: s?.id,
    quote_no: s?.quote_no ?? defaults.nextNo,
    quote_date: s?.quote_date ?? today(),
    team_id: s?.team_id ?? defaults.team,
    salesperson: s?.salesperson ?? defaults.salesperson,
    client: s?.client ?? '',
    kit_id: s?.kit_id ?? defaults.kit,
    quantity: String(s?.quantity ?? 1),
    applied_price: s?.applied_price == null ? '' : String(s.applied_price),
    discount_pct: s ? String(Math.round(s.discount_rate * 10000) / 100) : '0',
    sale_date: s?.sale_date ?? '',
    delivery_date: s?.delivery_date ?? '',
    lost: s?.lost ?? false,
    remark: s?.remark ?? '',
    deposit_amount: String(s?.deposit_amount ?? 0),
    deposit_date: s?.deposit_date ?? '',
    balance_amount: String(s?.balance_amount ?? 0),
    balance_date: s?.balance_date ?? '',
    zone_id: s?.zone_id ?? '',
    mission_people: s?.mission_people == null ? '' : String(s.mission_people),
    probability_pct: s?.probability == null ? '' : String(Math.round(s.probability * 100)),
    planned_install_date: s?.planned_install_date ?? '',
  };
}

function validate(d: Draft): string | null {
  if (!d.quote_no.trim()) return 'Le N° de devis est obligatoire.';
  if (!d.client.trim()) return 'Le client est obligatoire.';
  if (!d.team_id) return "L'équipe est obligatoire (sinon la ligne n'est pas comptée).";
  if (!d.kit_id) return 'Le kit est obligatoire.';
  const q = n(d.quantity);
  if (q === null || !(q > 0)) return 'La quantité doit être supérieure à 0.';
  const disc = n(d.discount_pct) ?? 0;
  if (disc < 0 || disc >= 100) return 'La remise doit être comprise entre 0 et 100 %.';
  const prob = n(d.probability_pct);
  if (prob !== null && (prob < 0 || prob > 100)) return 'La probabilité doit être comprise entre 0 et 100 %.';
  if (d.delivery_date && !d.sale_date) return 'Une livraison suppose une date de vente.';
  if (d.lost && d.sale_date) return 'Un devis perdu ne peut pas avoir de date de vente.';
  if ((n(d.deposit_amount) ?? 0) > 0 && !d.deposit_date) return "Indiquez la date de l'acompte.";
  if ((n(d.balance_amount) ?? 0) > 0 && !d.balance_date) return 'Indiquez la date du solde.';
  if (d.sale_date && d.sale_date < d.quote_date) return 'La date de vente précède la date du devis.';
  if (d.delivery_date && d.sale_date && d.delivery_date < d.sale_date) return 'La date de livraison précède la date de vente.';
  return null;
}

function draftToSale(d: Draft): TcSale {
  return {
    id: d.id ?? 'draft',
    quote_no: d.quote_no.trim(), quote_date: d.quote_date, team_id: d.team_id, salesperson: d.salesperson.trim() || null,
    client: d.client.trim(), kit_id: d.kit_id, quantity: n(d.quantity) ?? 0,
    applied_price: n(d.applied_price), discount_rate: (n(d.discount_pct) ?? 0) / 100,
    sale_date: d.sale_date || null, delivery_date: d.delivery_date || null, lost: d.lost, remark: d.remark.trim() || null,
    deposit_amount: n(d.deposit_amount) ?? 0, deposit_date: d.deposit_date || null,
    balance_amount: n(d.balance_amount) ?? 0, balance_date: d.balance_date || null,
    zone_id: d.zone_id || null, mission_people: n(d.mission_people), probability: n(d.probability_pct) === null ? null : (n(d.probability_pct) as number) / 100,
    planned_install_date: d.planned_install_date || null,
  };
}

const STATUSES: SaleStatus[] = ['Devis en cours', 'Vendu', 'Livré', 'Perdu'];

export default function TcSalesJournal({ engine }: { engine: TcEngine }) {
  const { data, kits, sales } = engine;
  const { user } = useAuth();
  const { data: role } = useCurrentUserRole();
  const save = useSaveSale();
  const { remove } = useTcMutations('tc_sales');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [previous, setPrevious] = useState<TcSale | null>(null);
  const [toDelete, setToDelete] = useState<SaleCalc | null>(null);

  const canCreate = tcCan(role, 'sales_create');
  const canManage = tcCan(role, 'sales_manage');
  const canDelete = tcCan(role, 'sales_delete');
  const canEditRow = (s: TcSale) => canManage || (role === 'sales_rep' && s.created_by === user?.id);

  const activeKits = data.kits.filter(k => k.active);
  const fullName = (user?.user_metadata as Record<string, string> | undefined)?.full_name ?? '';

  const nextNo = useMemo(() => {
    const year = new Date().getFullYear();
    const nums = data.sales.map(s => Number(/(\d+)\D*$/.exec(s.quote_no)?.[1] ?? 0));
    return `DEV-${year}-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
  }, [data.sales]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales
      .filter(s => status === 'all' || s.status === status)
      .filter(s => teamFilter === 'all' || s.sale.team_id === teamFilter)
      .filter(s => !q || [s.sale.quote_no, s.sale.client, s.sale.salesperson ?? '', s.kitCode, s.kitName].some(v => v.toLowerCase().includes(q)))
      .sort((a, b) => b.sale.quote_date.localeCompare(a.sale.quote_date) || b.sale.quote_no.localeCompare(a.sale.quote_no));
  }, [sales, search, status, teamFilter]);

  const preview = useMemo(() => (draft && draft.kit_id && draft.team_id ? computeSale(draftToSale(draft), { kits, data }) : null), [draft, kits, data]);
  const readOnly = !!draft?.id && !!previous && !canEditRow(previous);

  const openNew = () => {
    setPrevious(null);
    setDraft(toDraft(null, { team: data.teams[0]?.id ?? '', kit: activeKits[0]?.id ?? '', salesperson: fullName, nextNo }));
  };
  const openEdit = (s: SaleCalc) => { setPrevious(s.sale); setDraft(toDraft(s.sale, { team: '', kit: '', salesperson: '', nextNo })); };

  const submit = () => {
    if (!draft) return;
    const err = validate(draft);
    if (err) { toast.error(err); return; }
    const s = draftToSale(draft);
    const check = computeSale(s, { kits, data });
    if (check.collected > check.amountTTC + 1) { toast.error(`Les encaissements (${money(check.collected)}) dépassent le montant TTC (${money(check.amountTTC)}).`); return; }
    const { id: _ignored, ...fields } = s;
    void _ignored;
    save.mutate(
      { sale: { ...fields, ...(draft.id ? { id: draft.id } : {}) }, previous, kits },
      {
        onSuccess: () => { toast.success(draft.id ? 'Ligne mise à jour' : 'Devis créé'); setDraft(null); },
        onError: (e: Error) => toast.error(e.message.includes('duplicate') ? 'Ce N° de devis existe déjà.' : e.message),
      },
    );
  };

  const exportExcel = () => exportRows('journal_ventes.xlsx', 'Journal', [
    'N° devis', 'Date devis', 'Équipe', 'Commercial', 'Client', 'Kit', 'Qté', 'Montant HT', 'Statut', 'Date vente', 'Date livraison',
    'Montant TTC', 'Encaissé', 'Reste à encaisser', 'Paiement', 'Jours de retard', 'Marge brute', 'Marge nette', 'Probabilité', 'CA pondéré', 'Commission',
  ], rows.map(s => [
    s.sale.quote_no, s.sale.quote_date, s.teamName, s.sale.salesperson ?? '', s.sale.client, s.kitCode, s.sale.quantity, Math.round(s.amountHT), s.status,
    s.sale.sale_date ?? '', s.sale.delivery_date ?? '', Math.round(s.amountTTC), Math.round(s.collected), Math.round(s.remaining ?? 0), s.paymentStatus,
    s.daysLate ?? '', Math.round(s.grossMargin), Math.round(s.netMargin), s.probability, Math.round(s.weightedRevenue), Math.round(s.commissionBase),
  ]));

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => (d ? { ...d, [k]: v } : d));

  return (
    <div className="space-y-4">
      <Section
        title="Journal des devis, ventes et livraisons"
        description="Une ligne par devis. Statut : Devis en cours → Vendu (date de vente) → Livré (date de livraison) ; « Perdu » = devis non transformé."
        actions={<>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportExcel} disabled={rows.length === 0}><Download className="h-3.5 w-3.5" />Excel</Button>
          {canCreate && <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openNew} disabled={activeKits.length === 0 || data.teams.length === 0}><Plus className="h-3.5 w-3.5" />Nouveau devis</Button>}
        </>}
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="N°, client, commercial, kit…" className="h-8 pl-8 text-xs w-[240px]" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes les équipes</SelectItem>
              {data.teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground self-center">{rows.length} ligne(s)</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">N° devis</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Équipe</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Kit</TableHead>
                <TableHead className="text-xs text-right">Qté</TableHead>
                <TableHead className="text-xs text-right">Montant HT</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs">Paiement</TableHead>
                <TableHead className="text-xs text-right">Reste dû</TableHead>
                <TableHead className="text-xs text-right">Retard</TableHead>
                <TableHead className="text-xs text-right">Marge nette</TableHead>
                {canDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={13} className="text-center text-sm text-muted-foreground py-8">
                  {sales.length === 0 ? 'Aucun devis saisi pour le moment.' : 'Aucune ligne ne correspond aux filtres.'}
                </TableCell></TableRow>
              )}
              {rows.map(s => (
                <TableRow key={s.sale.id} className="cursor-pointer" onClick={() => openEdit(s)}>
                  <TableCell className="text-xs py-1.5 font-medium whitespace-nowrap">{s.sale.quote_no}</TableCell>
                  <TableCell className="text-xs py-1.5 whitespace-nowrap">{formatDateFr(s.sale.quote_date)}</TableCell>
                  <TableCell className="text-xs py-1.5 whitespace-nowrap">{s.teamName}</TableCell>
                  <TableCell className="text-xs py-1.5">{s.sale.client}</TableCell>
                  <TableCell className="text-xs py-1.5 whitespace-nowrap">{s.kitCode}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(s.sale.quantity)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums whitespace-nowrap">{money(s.amountHT)}</TableCell>
                  <TableCell className="py-1.5"><SaleStatusBadge status={s.status} /></TableCell>
                  <TableCell className="py-1.5"><PaymentBadge status={s.paymentStatus} /></TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums whitespace-nowrap">{s.remaining === null ? '—' : money(Math.max(0, s.remaining))}</TableCell>
                  <TableCell className={`text-xs py-1.5 text-right tabular-nums ${(s.daysLate ?? 0) > 0 ? 'text-destructive font-semibold' : ''}`}>{s.daysLate ? `${s.daysLate} j` : '—'}</TableCell>
                  <TableCell className={`text-xs py-1.5 text-right tabular-nums whitespace-nowrap ${s.netMargin < 0 ? 'text-destructive' : ''}`}>{s.amountHT ? money(s.netMargin) : '—'}</TableCell>
                  {canDelete && (
                    <TableCell className="py-1.5" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Supprimer" onClick={() => setToDelete(s)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Dialog open={!!draft} onOpenChange={o => { if (!o) setDraft(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? `Devis ${draft.quote_no}` : 'Nouveau devis'}</DialogTitle>
          </DialogHeader>
          {draft && (
            <fieldset disabled={readOnly} className="space-y-5">
              {readOnly && <p className="text-xs text-muted-foreground">Lecture seule : seul l'auteur de ce devis ou la direction peuvent le modifier.</p>}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">1. Devis</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="N° devis"><Input className="h-8 text-xs" value={draft.quote_no} onChange={e => set('quote_no', e.target.value)} /></Field>
                  <Field label="Date du devis"><Input type="date" className="h-8 text-xs" value={draft.quote_date} onChange={e => set('quote_date', e.target.value)} /></Field>
                  <Field label="Équipe">
                    <Select value={draft.team_id} onValueChange={v => set('team_id', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Équipe" /></SelectTrigger>
                      <SelectContent>{data.teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Commercial"><Input className="h-8 text-xs" value={draft.salesperson} onChange={e => set('salesperson', e.target.value)} /></Field>
                  <Field label="Client" className="md:col-span-2"><Input className="h-8 text-xs" value={draft.client} onChange={e => set('client', e.target.value)} /></Field>
                  <Field label="Kit" className="md:col-span-2">
                    <Select value={draft.kit_id} onValueChange={v => set('kit_id', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kit" /></SelectTrigger>
                      <SelectContent>
                        {activeKits.map(k => (
                          <SelectItem key={k.id} value={k.id} className="text-xs">{k.code} — {k.name} ({money(kits.byId.get(k.id)?.priceHT ?? 0)} HT)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Quantité"><Input inputMode="decimal" className="h-8 text-xs text-right" value={draft.quantity} onChange={e => set('quantity', e.target.value)} /></Field>
                  <Field label="Prix appliqué HT (vide = catalogue)"><Input inputMode="decimal" className="h-8 text-xs text-right" value={draft.applied_price} placeholder={preview ? String(Math.round(preview.catalogPrice)) : ''} onChange={e => set('applied_price', e.target.value)} /></Field>
                  <Field label="Remise %"><Input inputMode="decimal" className="h-8 text-xs text-right" value={draft.discount_pct} onChange={e => set('discount_pct', e.target.value)} /></Field>
                  <Field label="Probabilité de signature %"><Input inputMode="decimal" className="h-8 text-xs text-right" value={draft.probability_pct} placeholder={String(Math.round(data.settings.default_probability * 100))} onChange={e => set('probability_pct', e.target.value)} /></Field>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">2. Vente et livraison</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                  <Field label="Date de vente (signature)"><Input type="date" className="h-8 text-xs" value={draft.sale_date} onChange={e => set('sale_date', e.target.value)} /></Field>
                  <Field label="Date de livraison"><Input type="date" className="h-8 text-xs" value={draft.delivery_date} onChange={e => set('delivery_date', e.target.value)} /></Field>
                  <label className="flex items-center gap-2 text-xs h-8"><Checkbox checked={draft.lost} onCheckedChange={v => set('lost', v === true)} />Devis perdu / annulé</label>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">3. Encaissements</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Acompte encaissé"><Input inputMode="decimal" className="h-8 text-xs text-right" value={draft.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} /></Field>
                  <Field label="Date acompte"><Input type="date" className="h-8 text-xs" value={draft.deposit_date} onChange={e => set('deposit_date', e.target.value)} /></Field>
                  <Field label="Solde encaissé"><Input inputMode="decimal" className="h-8 text-xs text-right" value={draft.balance_amount} onChange={e => set('balance_amount', e.target.value)} /></Field>
                  <Field label="Date solde"><Input type="date" className="h-8 text-xs" value={draft.balance_date} onChange={e => set('balance_date', e.target.value)} /></Field>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">4. Terrain et installation</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Zone du client">
                    <Select value={draft.zone_id || 'none'} onValueChange={v => set('zone_id', v === 'none' ? '' : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">— Aucune —</SelectItem>
                        {data.zones.map(z => <SelectItem key={z.id} value={z.id} className="text-xs">{z.name} ({z.distance_km} km)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nb pers. mission (vide = défaut)"><Input inputMode="numeric" className="h-8 text-xs text-right" value={draft.mission_people} placeholder={String(data.settings.default_mission_people)} onChange={e => set('mission_people', e.target.value)} /></Field>
                  <Field label="Date d'installation prévue"><Input type="date" className="h-8 text-xs" value={draft.planned_install_date} onChange={e => set('planned_install_date', e.target.value)} /></Field>
                  <Field label="Remarque" className="col-span-2 md:col-span-3"><Textarea rows={2} className="text-xs" value={draft.remark} onChange={e => set('remark', e.target.value)} /></Field>
                </div>
              </div>

              {preview && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">5. Calculs automatiques</h4>
                    <SaleStatusBadge status={preview.status} />
                    <PaymentBadge status={preview.paymentStatus} />
                    {preview.usesSnapshot && <span className="text-[11px] text-muted-foreground">coût figé à la signature</span>}
                  </div>
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
                    <Kv k="Montant HT" v={money(preview.amountHT)} />
                    <Kv k="Montant TTC" v={money(preview.amountTTC)} />
                    <Kv k="Coût de revient" v={money(preview.costTotal)} />
                    <Kv k="Marge brute" v={`${money(preview.grossMargin)} (${pct(preview.grossMarginRate, 1)})`} />
                    <Kv k="Frais de déplacement" v={money(preview.travelCost)} />
                    <Kv k="Provision garantie / SAV" v={money(preview.warrantyProvision)} />
                    <Kv k="Marge nette" v={`${money(preview.netMargin)} (${pct(preview.netMarginRate, 1)})`} />
                    <Kv k="Reste à encaisser" v={preview.remaining === null ? '—' : money(preview.remaining)} />
                    <Kv k="Probabilité retenue" v={pct(preview.probability)} />
                    <Kv k="CA pondéré" v={money(preview.weightedRevenue)} />
                    <Kv k="Commission de base" v={money(preview.commissionBase)} />
                    <Kv k="Heures d'installation" v={`${qty(preview.installHours)} h`} />
                  </dl>
                  {preview.catalogPrice === 0 && draft.applied_price === '' && (
                    <p className="text-[11px] text-destructive mt-2">Le kit n'a pas encore de prix catalogue : saisissez un prix appliqué HT.</p>
                  )}
                </div>
              )}
            </fieldset>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>Fermer</Button>
            {!readOnly && <Button size="sm" onClick={submit} disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={o => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le devis {toDelete?.sale.quote_no} ?</AlertDialogTitle>
            <AlertDialogDescription>La ligne et ses encaissements seront définitivement supprimés. Pour un devis non transformé, préférez « Devis perdu ».</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.sale.id, {
              onSuccess: () => toast.success('Devis supprimé'), onError: (e: Error) => toast.error(e.message),
            })}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// <label> englobant : le libellé est associé au champ (lecteurs d'écran, clic).
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Kv({ k, v }: { k: string; v: string }) {
  return <div className="flex flex-col"><dt className="text-[10.5px] text-muted-foreground">{k}</dt><dd className="tabular-nums font-medium">{v}</dd></div>;
}
