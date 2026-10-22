import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTcCan, useTcMutations } from '@/hooks/useTc';
import { stockWithReservations } from '@/lib/tc/kits';
import { capacityPlan, dormantStock, purchasesBySupplier, stockNeeds, teamCapacity } from '@/lib/tc/aggregates';
import type { TcEngine } from './tcPeriod';
import { EditableTable, ReadOnlyNote, Section, Stat, exportRows, money, monthLabel, pct, qty } from './tcUi';

// ---------------------------------------------------------------------
// STOCK
// ---------------------------------------------------------------------
export function TcStockView({ engine }: { engine: TcEngine }) {
  const { data, kits } = engine;
  const can = useTcCan();
  const canEdit = can('stock');
  const mut = useTcMutations('tc_stock_items');
  const [search, setSearch] = useState('');
  const [solution, setSolution] = useState('all');
  const [newItem, setNewItem] = useState('');
  const rows = useMemo(() => stockWithReservations(data.stock, kits.reservations), [data.stock, kits.reservations]);
  const solutions = useMemo(() => [...new Set(data.stock.map(s => s.solution_code ?? 'AUTRE'))].sort(), [data.stock]);
  const filtered = rows
    .filter(r => solution === 'all' || (r.item.solution_code ?? 'AUTRE') === solution)
    .filter(r => !search.trim() || `${r.item.designation} ${r.item.inventory_category ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const missingCost = rows.filter(r => r.item.quantity > 0 && !(r.item.unit_cost > 0));
  const err = (e: Error) => toast.error(e.message);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Valeur du stock" value={money(total)} hint={data.settings.inventory_date ? `inventaire au ${new Date(data.settings.inventory_date).toLocaleDateString('fr-FR')}` : undefined} />
        <Stat label="Articles" value={qty(rows.length)} hint={`${rows.filter(r => r.item.quantity > 0).length} en stock`} />
        <Stat label="Réservé par les kits" value={money(rows.reduce((s, r) => s + r.reservedTotal * r.item.unit_cost, 0))} />
        <Stat label="Coûts unitaires manquants" value={String(missingCost.length)} tone={missingCost.length ? 'text-destructive' : undefined} hint={missingCost.slice(0, 2).map(r => r.item.designation).join(', ')} />
      </div>
      <Section
        title="Stock disponible"
        description="Source prioritaire des kits. Les colonnes « Réservé » viennent de la modélisation des kits. Mettre à jour Qté et CU après chaque inventaire."
        actions={<Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportRows('stock.xlsx', 'Stock',
          ['Catégorie', 'Solution', 'Désignation', 'Qté stock', 'CU', 'Valeur', ...data.solutions.map(s => `Réservé ${s.code}`), 'Total réservé', 'Stock restant', 'Valeur restante'],
          filtered.map(r => [r.item.inventory_category ?? '', r.item.solution_code ?? '', r.item.designation, r.item.quantity, r.item.unit_cost, r.value,
            ...data.solutions.map(s => r.reservedBySolution[s.code] ?? 0), r.reservedTotal, r.remaining, r.remainingValue]))}><Download className="h-3.5 w-3.5" />Excel</Button>}
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un article…" className="h-8 pl-8 text-xs w-[260px]" />
          </div>
          <Select value={solution} onValueChange={setSolution}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes les solutions</SelectItem>
              {solutions.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <ReadOnlyNote show={!canEdit} />
        </div>
        <EditableTable
          rows={filtered.map(r => ({ ...r.item, _r: r }))}
          canEdit={canEdit}
          onSave={(id, patch) => mut.update.mutate({ id, ...(patch as object) }, { onError: err })}
          columns={[
            { key: 'inventory_category', label: 'Catégorie', width: '170px' },
            { key: 'solution_code', label: 'Solution', width: '100px' },
            { key: 'designation', label: 'Désignation', readOnly: true },
            { key: 'quantity', label: 'Qté stock', type: 'number', width: '90px' },
            { key: 'unit_cost', label: 'CU (FCFA)', type: 'money', width: '120px' },
            { key: 'unit', label: 'Valeur', render: r => money(r._r.value), align: 'right' },
            ...data.solutions.map(s => ({ key: 'id' as const, label: `Rés. ${s.code}`, render: (r: { _r: typeof rows[number] }) => qty(r._r.reservedBySolution[s.code] ?? 0) || '', align: 'right' as const })),
            { key: 'id', label: 'Restant', render: r => <span className={r._r.remaining < 0 ? 'text-destructive' : ''}>{qty(r._r.remaining)}</span>, align: 'right' },
          ]}
        />
        {canEdit && (
          <div className="flex items-center gap-2 mt-3">
            <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Désignation exacte du nouvel article" className="h-8 text-xs w-[320px]" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
              const name = newItem.trim();
              if (!name) return;
              if (data.stock.some(s => s.designation.toUpperCase() === name.toUpperCase())) { toast.error('Article déjà présent'); return; }
              mut.insert.mutate({ designation: name, quantity: 0, unit_cost: 0, solution_code: solution === 'all' ? null : solution },
                { onSuccess: () => setNewItem(''), onError: err });
            }}>Ajouter l'article</Button>
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// CONSO_STOCK + ACHATS
// ---------------------------------------------------------------------
const NEED_TONE: Record<string, string> = {
  OK: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]',
  'À commander': 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]',
  'À commander – prix manquant': 'bg-destructive/10 text-destructive',
  'Risque rupture (devis)': 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]',
};

export function TcPurchases({ engine }: { engine: TcEngine }) {
  const { data, sales } = engine;
  const needs = useMemo(() => stockNeeds(data, sales), [data, sales]);
  const purchases = useMemo(() => purchasesBySupplier(needs), [needs]);
  const [supplier, setSupplier] = useState('TOUS');
  const detail = needs.filter(n => n.toOrder > 0 && (supplier === 'TOUS' || n.supplier === supplier || (supplier === '(sans prix)' && !n.supplier)));

  const exportOrders = () => exportRows('bons_de_commande.xlsx', 'Achats',
    ['Fournisseur', 'Désignation', 'Qté à commander', 'Prix unitaire HT', 'Montant HT', 'Délai (jours)', 'Statut'],
    detail.map(n => [n.supplier || '(sans prix)', n.designation, n.toOrder, n.supplierPrice, n.orderAmount, n.leadDays ?? '', n.status]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Articles à commander" value={String(needs.filter(n => n.toOrder > 0).length)} />
        <Stat label="Montant à engager HT" value={money(purchases.total)} />
        <Stat label="Sans prix fournisseur" value={String(purchases.withoutPrice.length)} tone={purchases.withoutPrice.length ? 'text-destructive' : undefined} />
        <Stat label="Risques de rupture (devis)" value={String(needs.filter(n => n.status === 'Risque rupture (devis)').length)} />
      </div>
      <Section title="A. Achats par fournisseur" description="Quantités nécessaires aux ventes fermes (Vendu + Livré) non couvertes par le stock, au fournisseur le moins cher.">
        {purchases.suppliers.length === 0 && purchases.withoutPrice.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Aucun achat à lancer.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Fournisseur', 'Nb articles', 'Montant HT à commander', 'Délai max (jours)'].map((h, i) => <TableHead key={h} className={`text-xs ${i ? 'text-right' : ''}`}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.suppliers.map(s => (
                <TableRow key={s.supplier} className="cursor-pointer" onClick={() => setSupplier(s.supplier)}>
                  <TableCell className="text-xs py-1.5">{s.supplier}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{s.lines.length}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(s.amount)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{s.maxLeadDays || '—'}</TableCell>
                </TableRow>
              ))}
              {purchases.withoutPrice.length > 0 && (
                <TableRow className="cursor-pointer" onClick={() => setSupplier('(sans prix)')}>
                  <TableCell className="text-xs py-1.5 text-destructive">(sans prix fournisseur)</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{purchases.withoutPrice.length}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">—</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section
        title="B. Détail des articles à commander"
        actions={<>
          <Select value={supplier} onValueChange={setSupplier}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TOUS" className="text-xs">Tous les fournisseurs</SelectItem>
              {purchases.suppliers.map(s => <SelectItem key={s.supplier} value={s.supplier} className="text-xs">{s.supplier}</SelectItem>)}
              {purchases.withoutPrice.length > 0 && <SelectItem value="(sans prix)" className="text-xs">(sans prix)</SelectItem>}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportOrders} disabled={detail.length === 0}><Download className="h-3.5 w-3.5" />Bon de commande</Button>
        </>}
      >
        {detail.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Rien à commander.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Fournisseur', 'Désignation', 'Qté', 'Prix unitaire HT', 'Montant HT', 'Délai', 'Statut'].map((h, i) => <TableHead key={h} className={`text-xs ${i > 1 && i < 6 ? 'text-right' : ''}`}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.map(n => (
                <TableRow key={n.designation}>
                  <TableCell className="text-xs py-1.5">{n.supplier || '—'}</TableCell>
                  <TableCell className="text-xs py-1.5">{n.designation}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(n.toOrder)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{n.supplierPrice ? money(n.supplierPrice) : '—'}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(n.orderAmount)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{n.leadDays ?? '—'}</TableCell>
                  <TableCell className="py-1.5"><Badge variant="outline" className={`border-0 text-[10.5px] ${NEED_TONE[n.status]}`}>{n.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section title="C. Stock consommé et engagé par les ventes" description="Composition des kits × kits vendus. Livré = consommé ; Vendu non livré = engagé ; devis en cours = besoin potentiel (« après devis » négatif = risque de rupture).">
        {needs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Aucun article dans les kits modélisés.</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Désignation', 'Stock initial', 'Consommé (livré)', 'Engagé (vendu)', 'Besoin ferme', 'Couvert stock', 'À commander', 'Stock restant', 'Besoin devis', 'Après devis', 'Valeur consommée', 'Statut']
                    .map((h, i) => <TableHead key={h} className={`text-xs whitespace-nowrap ${i && i < 11 ? 'text-right' : ''}`}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {needs.map(n => (
                  <TableRow key={n.designation}>
                    <TableCell className="text-xs py-1.5">{n.designation}</TableCell>
                    {[n.stockInitial, n.consumed, n.committed, n.firmNeed, n.coveredByStock, n.toOrder, n.stockLeft, n.quoteNeed].map((v, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums">{qty(v)}</TableCell>)}
                    <TableCell className={`text-xs py-1.5 text-right tabular-nums ${n.stockAfterQuotes < 0 ? 'text-destructive font-semibold' : ''}`}>{qty(n.stockAfterQuotes)}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(n.consumedValue)}</TableCell>
                    <TableCell className="py-1.5"><Badge variant="outline" className={`border-0 text-[10.5px] whitespace-nowrap ${NEED_TONE[n.status]}`}>{n.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// STOCK_DORMANT
// ---------------------------------------------------------------------
export function TcDormant({ engine }: { engine: TcEngine }) {
  const { data, sales } = engine;
  const d = useMemo(() => dormantStock(data, sales), [data, sales]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Valeur du stock" value={money(d.totalValue)} />
        <Stat label="Valeur dormante (aucun kit)" value={money(d.dormantValue)} tone="text-destructive" />
        <Stat label="Valeur excédentaire" value={money(d.excessValue)} />
        <Stat label="Part du stock à écouler" value={pct(d.shareToClear)} tone={(d.shareToClear ?? 0) > 0.5 ? 'text-destructive' : undefined} />
      </div>
      <Section title="Par solution">
        <Table>
          <TableHeader>
            <TableRow>{['Solution', 'Valeur stock', 'Valeur dormante', 'Valeur excédent', '% à écouler'].map((h, i) => <TableHead key={h} className={`text-xs ${i ? 'text-right' : ''}`}>{h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {d.bySolution.map(r => (
              <TableRow key={r.solution}>
                <TableCell className="text-xs py-1.5">{r.solution}</TableCell>
                {[money(r.value), money(r.dormant), money(r.excess), pct(r.shareToClear)].map((v, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums">{v}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
      <Section title="Articles à écouler en priorité" description="Dormant = utilisé dans aucun kit ; excédent = au-delà des besoins des ventes et devis. Trié par valeur à écouler.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {['Désignation', 'Solution', 'Qté', 'CU', 'Valeur', 'Kits', 'Besoin ventes + devis', 'Excédent', 'Valeur à écouler', 'Classement', 'Action suggérée']
                  .map((h, i) => <TableHead key={h} className={`text-xs whitespace-nowrap ${i > 1 && i < 9 ? 'text-right' : ''}`}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.rows.map(r => (
                <TableRow key={r.item.id}>
                  <TableCell className="text-xs py-1.5">{r.item.designation}</TableCell>
                  <TableCell className="text-xs py-1.5">{r.item.solution_code}</TableCell>
                  {[qty(r.item.quantity), money(r.item.unit_cost), money(r.value), String(r.kitsUsing), qty(r.need), qty(r.excessQty), money(r.valueToClear)].map((v, i) => <TableCell key={i} className="text-xs py-1.5 text-right tabular-nums whitespace-nowrap">{v}</TableCell>)}
                  <TableCell className="text-xs py-1.5 whitespace-nowrap">{r.classification}</TableCell>
                  <TableCell className="text-xs py-1.5 text-muted-foreground">{r.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------
// CAPACITE
// ---------------------------------------------------------------------
export function TcCapacity({ engine, months }: { engine: TcEngine; months: string[] }) {
  const { data, sales } = engine;
  const can = useTcCan();
  const canEdit = can('teams');
  const mut = useTcMutations('tc_teams');
  const plan = useMemo(() => capacityPlan(data.teams, sales, months), [data.teams, sales, months]);
  const tone = (o: number | null) => o === null ? '' : o > 1 ? 'bg-destructive/15 text-destructive font-semibold' : o >= 0.8 ? 'bg-[hsl(var(--gold))]/15' : o > 0 ? 'bg-[hsl(var(--sage))]/10' : '';
  return (
    <div className="space-y-4">
      <Section title="A. Capacité mensuelle par équipe" description="Capacité = techniciens × heures/jour × jours ouvrés × taux de disponibilité.">
        <ReadOnlyNote show={!canEdit} />
        <EditableTable
          rows={data.teams}
          canEdit={canEdit}
          onSave={(id, patch) => mut.update.mutate({ id, ...(patch as object) }, { onError: (e: Error) => toast.error(e.message) })}
          columns={[
            { key: 'name', label: 'Équipe', readOnly: true },
            { key: 'technicians', label: 'Nb techniciens', type: 'number', width: '110px' },
            { key: 'hours_per_day', label: 'Heures / jour', type: 'number', width: '110px' },
            { key: 'working_days', label: 'Jours ouvrés / mois', type: 'number', width: '130px' },
            { key: 'availability_rate', label: 'Disponibilité %', type: 'percent', width: '120px' },
            { key: 'id', label: 'Capacité (h)', render: t => qty(teamCapacity(t)), align: 'right' },
          ]}
        />
      </Section>
      <Section title="B. Charge planifiée et taux d'occupation" description="Charge = kits vendus × heures de main d'œuvre du kit, au mois de livraison ou, à défaut, au mois d'installation prévue. Rouge > 100 % = surcharge.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky left-0 bg-card">Équipe</TableHead>
                {months.map(m => <TableHead key={m} className="text-xs text-right capitalize">{monthLabel(m)}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map(r => (
                <TableRow key={r.team.id}>
                  <TableCell className="text-xs py-1.5 sticky left-0 bg-card">{r.team.name}<div className="text-[10.5px] text-muted-foreground">{qty(r.capacity)} h dispo</div></TableCell>
                  {months.map(m => (
                    <TableCell key={m} className={`text-xs py-1.5 text-right tabular-nums ${tone(r.occupancy[m])}`}>
                      {r.load[m] ? <>{qty(r.load[m])} h<div className="text-[10.5px]">{pct(r.occupancy[m])}</div></> : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}
