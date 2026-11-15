import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTcCan, useTcCatalog, useTcMutations } from '@/hooks/useTc';
import type { KitCost } from '@/lib/tc/kits';
import { VARIANT_ORDER } from '@/lib/tc/types';
import type { TcEngine } from './tcPeriod';
import { ReadOnlyNote, Section, money, pct, qty } from './tcUi';

const variantRank = (v: string) => { const i = VARIANT_ORDER.indexOf(v.toUpperCase()); return i === -1 ? VARIANT_ORDER.length : i; };

const STATUS_TONE: Record<string, string> = {
  'Stock OK': 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]',
  'Achat requis': 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]',
  'Prix fournisseur manquant': 'bg-destructive/10 text-destructive',
  'CU stock manquant': 'bg-destructive/10 text-destructive',
};

function NumberCell({ value, onCommit, disabled, className = '' }: { value: number; onCommit: (v: number) => void; disabled: boolean; className?: string }) {
  if (disabled) return <span className={`tabular-nums ${className}`}>{qty(value)}</span>;
  return (
    <Input key={value} defaultValue={String(value)} inputMode="decimal" className={`h-7 text-xs text-right tabular-nums px-1.5 ${className}`}
      onBlur={e => {
        const v = Number(e.target.value.replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(v) || v < 0) { e.target.value = String(value); toast.error('Valeur invalide'); return; }
        if (v !== value) onCommit(v);
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

export default function TcKits({ engine }: { engine: TcEngine }) {
  const { data, kits } = engine;
  const can = useTcCan();
  const canEdit = can('kits');
  const catalog = useTcCatalog();
  const kitMut = useTcMutations('tc_kits');
  const itemMut = useTcMutations('tc_kit_items');
  const laborMut = useTcMutations('tc_kit_labor');

  const [solution, setSolution] = useState(data.solutions[0]?.code ?? '');
  const solutionKits = useMemo(() => data.kits
    .filter(k => k.solution_code === solution)
    .sort((a, b) => variantRank(a.variant) - variantRank(b.variant) || a.sort_order - b.sort_order), [data.kits, solution]);
  const [kitId, setKitId] = useState<string | null>(null);
  const kit = data.kits.find(k => k.id === (kitId && solutionKits.some(k2 => k2.id === kitId) ? kitId : solutionKits[0]?.id));
  const cost: KitCost | undefined = kit ? kits.byId.get(kit.id) : undefined;
  const [newLine, setNewLine] = useState({ designation: '', quantity: '1' });
  const [newVariant, setNewVariant] = useState('');

  const designations = useMemo(() => {
    const s = new Set<string>();
    data.stock.forEach(x => s.add(x.designation));
    data.supplierPrices.forEach(x => s.add(x.designation));
    (catalog.data ?? []).forEach(x => s.add(x.designation));
    return [...s].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [data.stock, data.supplierPrices, catalog.data]);

  const items = kit ? data.kitItems.filter(i => i.kit_id === kit.id).sort((a, b) => a.line_no - b.line_no) : [];
  const labor = kit ? data.kitLabor.filter(l => l.kit_id === kit.id).sort((a, b) => a.line_no - b.line_no) : [];
  const err = (e: Error) => toast.error(e.message);

  const addMaterial = () => {
    if (!kit) return;
    const designation = newLine.designation.trim();
    const quantity = Number(newLine.quantity.replace(',', '.'));
    if (!designation) { toast.error("Choisissez ou saisissez l'article"); return; }
    if (!(quantity > 0)) { toast.error('Quantité invalide'); return; }
    const unit = data.stock.find(s => s.designation === designation)?.unit ?? 'u';
    itemMut.insert.mutate({ kit_id: kit.id, line_no: Math.max(0, ...items.map(i => i.line_no)) + 1, designation, quantity, unit },
      { onSuccess: () => setNewLine({ designation: '', quantity: '1' }), onError: err });
  };

  const addKit = () => {
    const variant = newVariant.trim().toUpperCase();
    if (!variant) { toast.error('Indiquez le nom de la variante'); return; }
    const code = `${solution} – ${variant}`;
    if (data.kits.some(k => k.code === code)) { toast.error('Ce kit existe déjà'); return; }
    kitMut.insert.mutate({ code, solution_code: solution, variant, name: `Kit ${solution} ${variant.toLowerCase()}`, sort_order: solutionKits.length },
      { onSuccess: () => { toast.success('Kit créé'); setNewVariant(''); }, onError: err });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {data.solutions.map(s => (
          <Button key={s.code} size="sm" variant={s.code === solution ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => { setSolution(s.code); setKitId(null); }}>{s.label}</Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {solutionKits.map(k => {
          const c = kits.byId.get(k.id);
          return (
            <button key={k.id} type="button" onClick={() => setKitId(k.id)}
              className={`text-left rounded-lg border px-3 py-2 min-w-[180px] transition-colors ${kit?.id === k.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'} ${k.active ? '' : 'opacity-50'}`}>
              <div className="text-xs font-semibold">{k.variant}{!k.active && ' (inactif)'}</div>
              <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{k.name}</div>
              <div className="text-xs tabular-nums mt-1">{c && c.priceHT > 0 ? `${money(c.priceHT)} HT` : <span className="text-destructive">sans prix</span>}</div>
            </button>
          );
        })}
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <Input value={newVariant} onChange={e => setNewVariant(e.target.value)} placeholder="Nouvelle variante (ex. XL)" className="h-8 text-xs w-[170px]"
              onKeyDown={e => { if (e.key === 'Enter') addKit(); }} />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={addKit}><Plus className="h-3.5 w-3.5" />Ajouter</Button>
          </div>
        )}
      </div>
      <ReadOnlyNote show={!canEdit} />

      {kit && (
        <>
          <Section title={kit.code} description="Le stock est utilisé en priorité, le reste est acheté au prix fournisseur le plus bas. Réservation : VICTRON → HUAWEI → LORENTZ → CUISSON → SPARK, puis PETIT → MOYEN → GRAND.">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Nom / description du kit</Label>
                <Input key={`n-${kit.id}-${kit.name}`} defaultValue={kit.name} disabled={!canEdit} className="h-8 text-xs"
                  onBlur={e => e.target.value.trim() && e.target.value !== kit.name && kitMut.update.mutate({ id: kit.id, name: e.target.value.trim() }, { onError: err })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Transport / logistique (forfait FCFA)</Label>
                <NumberCell value={kit.transport_cost} disabled={!canEdit} onCommit={v => kitMut.update.mutate({ id: kit.id, transport_cost: v }, { onError: err })} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Marge propre au kit % (vide = {pct(data.settings.margin_rate)})</Label>
                <Input key={`m-${kit.id}-${kit.margin_rate}`} defaultValue={kit.margin_rate == null ? '' : String(Math.round(kit.margin_rate * 10000) / 100)} disabled={!canEdit} inputMode="decimal" className="h-8 text-xs text-right"
                  onBlur={e => {
                    const raw = e.target.value.trim();
                    const v = raw === '' ? null : Number(raw.replace(',', '.')) / 100;
                    if (v !== null && (!Number.isFinite(v) || v < 0)) { toast.error('Marge invalide'); return; }
                    if (v !== kit.margin_rate) kitMut.update.mutate({ id: kit.id, margin_rate: v }, { onError: err });
                  }} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label className="text-[11px] text-muted-foreground">Besoin client / dimensionnement</Label>
                <Textarea key={`b-${kit.id}`} rows={2} defaultValue={kit.customer_need ?? ''} disabled={!canEdit} className="text-xs"
                  onBlur={e => e.target.value !== (kit.customer_need ?? '') && kitMut.update.mutate({ id: kit.id, customer_need: e.target.value || null }, { onError: err })} />
              </div>
              <label className="flex items-center gap-2 text-xs self-end h-8">
                <Switch checked={kit.active} disabled={!canEdit} onCheckedChange={v => kitMut.update.mutate({ id: kit.id, active: v }, { onError: err })} />
                Kit actif (commercialisé)
              </label>
            </div>
          </Section>

          <Section title="A. Matériel" description={cost?.warnings.length ? `${cost.warnings.length} point(s) à compléter` : undefined}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['N°', 'Désignation', 'Unité', 'Qté requise', 'Stock initial', 'Déjà réservé', 'Stock dispo', 'Pris du stock', 'À acheter', 'CU stock', 'CU fournisseur', 'Fournisseur', 'Coût stock', 'Coût achat', 'Coût total', 'Statut']
                      .map((h, i) => <TableHead key={h} className={`text-xs whitespace-nowrap ${i > 2 && i !== 11 && i !== 15 ? 'text-right' : ''}`}>{h}</TableHead>)}
                    {canEdit && <TableHead className="w-8" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && <TableRow><TableCell colSpan={17} className="text-center text-sm text-muted-foreground py-6">Aucun article : composez le kit ci-dessous.</TableCell></TableRow>}
                  {items.map((it, idx) => {
                    const m = cost?.material.find(x => x.line_no === it.line_no);
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="text-xs py-1">{idx + 1}</TableCell>
                        <TableCell className="text-xs py-1 min-w-[220px]">{it.designation}</TableCell>
                        <TableCell className="text-xs py-1">{it.unit}</TableCell>
                        <TableCell className="text-xs py-1 w-[90px]"><NumberCell value={it.quantity} disabled={!canEdit} onCommit={v => v > 0 ? itemMut.update.mutate({ id: it.id, quantity: v }, { onError: err }) : toast.error('La quantité doit être > 0')} /></TableCell>
                        {m ? (
                          <>
                            {[qty(m.stockInitial), qty(m.alreadyReserved), qty(m.stockAvailable), qty(m.fromStock), qty(m.toBuy), money(m.stockUnitCost), m.supplierUnitCost ? money(m.supplierUnitCost) : '—']
                              .map((v, i) => <TableCell key={i} className="text-xs py-1 text-right tabular-nums whitespace-nowrap">{v}</TableCell>)}
                            <TableCell className="text-xs py-1">{m.supplier || '—'}</TableCell>
                            {[money(m.stockCost), money(m.purchaseCost), money(m.totalCost)].map((v, i) => <TableCell key={i} className="text-xs py-1 text-right tabular-nums whitespace-nowrap">{v}</TableCell>)}
                            <TableCell className="py-1"><Badge variant="outline" className={`border-0 text-[10.5px] whitespace-nowrap ${STATUS_TONE[m.status]}`}>{m.status}</Badge></TableCell>
                          </>
                        ) : <TableCell colSpan={12} />}
                        {canEdit && <TableCell className="py-1"><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Supprimer la ligne" onClick={() => itemMut.remove.mutate(it.id, { onError: err })}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></TableCell>}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2 items-end mt-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Article (stock, catalogue Odoo ou fournisseur)</Label>
                  <Input list="tc-designations" value={newLine.designation} onChange={e => setNewLine(l => ({ ...l, designation: e.target.value }))} className="h-8 text-xs w-[380px]" placeholder="Rechercher un article…" />
                  <datalist id="tc-designations">{designations.map(d => <option key={d} value={d} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Quantité</Label>
                  <Input value={newLine.quantity} onChange={e => setNewLine(l => ({ ...l, quantity: e.target.value }))} inputMode="decimal" className="h-8 text-xs w-[90px] text-right" />
                </div>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={addMaterial}><Plus className="h-3.5 w-3.5" />Ajouter l'article</Button>
              </div>
            )}
          </Section>

          <Section title="B. Main d'œuvre">
            <Table>
              <TableHeader>
                <TableRow>
                  {['N°', 'Profil', 'Nb personnes', 'Heures / pers.', 'Total heures', 'Taux horaire', 'Coût MO', 'Statut'].map((h, i) => <TableHead key={h} className={`text-xs ${i > 1 && i < 7 ? 'text-right' : ''}`}>{h}</TableHead>)}
                  {canEdit && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {labor.map((l, idx) => {
                  const c = cost?.labor.find(x => x.line_no === l.line_no);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs py-1">{idx + 1}</TableCell>
                      <TableCell className="text-xs py-1">
                        {canEdit ? (
                          <Select value={l.profile_id} onValueChange={v => laborMut.update.mutate({ id: l.id, profile_id: v }, { onError: err })}>
                            <SelectTrigger className="h-7 text-xs w-[240px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{data.labor.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : c?.profileName}
                      </TableCell>
                      <TableCell className="text-xs py-1 w-[90px]"><NumberCell value={l.people} disabled={!canEdit} onCommit={v => v > 0 ? laborMut.update.mutate({ id: l.id, people: v }, { onError: err }) : toast.error('Au moins une personne')} /></TableCell>
                      <TableCell className="text-xs py-1 w-[90px]"><NumberCell value={l.hours_per_person} disabled={!canEdit} onCommit={v => laborMut.update.mutate({ id: l.id, hours_per_person: v }, { onError: err })} /></TableCell>
                      <TableCell className="text-xs py-1 text-right tabular-nums">{qty(c?.totalHours)}</TableCell>
                      <TableCell className="text-xs py-1 text-right tabular-nums">{money(c?.hourlyRate)}</TableCell>
                      <TableCell className="text-xs py-1 text-right tabular-nums">{money(c?.cost)}</TableCell>
                      <TableCell className="text-xs py-1 text-destructive">{c?.status}</TableCell>
                      {canEdit && <TableCell className="py-1"><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Supprimer la ligne" onClick={() => laborMut.remove.mutate(l.id, { onError: err })}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></TableCell>}
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold border-t-2">
                  <TableCell colSpan={4} className="text-xs py-1.5">Total main d'œuvre</TableCell>
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{qty(cost?.laborHours)} h</TableCell>
                  <TableCell />
                  <TableCell className="text-xs py-1.5 text-right tabular-nums">{money(cost?.laborCost)}</TableCell>
                  <TableCell colSpan={canEdit ? 2 : 1} />
                </TableRow>
              </TableBody>
            </Table>
            {canEdit && data.labor.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mt-3"
                onClick={() => laborMut.insert.mutate({ kit_id: kit.id, line_no: Math.max(0, ...labor.map(l => l.line_no)) + 1, profile_id: data.labor[0].id, people: 1, hours_per_person: 0 }, { onError: err })}>
                <Plus className="h-3.5 w-3.5" />Ajouter un profil
              </Button>
            )}
          </Section>

          {cost && (
            <Section title="C. Récapitulatif et prix de vente">
              <div className="max-w-xl">
                {[
                  ['Matériel pris en stock', money(cost.materialFromStock)],
                  ['Matériel à acheter (fournisseurs locaux)', money(cost.materialToBuy)],
                  ['Total matériel', money(cost.materialTotal)],
                  ["Main d'œuvre", money(cost.laborCost)],
                  ['Transport / déplacement / logistique', money(cost.transport)],
                  [`Imprévus (${pct(cost.contingencyRate)})`, money(cost.contingency)],
                  ['PRIX DE REVIENT', money(cost.costPrice), true],
                  [`Marge (${pct(cost.marginRate)})`, money(cost.margin)],
                  ['PRIX DE VENTE HT', money(cost.priceHT), true],
                  [`TVA (${pct(data.settings.vat_rate)})`, money(cost.vat)],
                  ['PRIX DE VENTE TTC', money(cost.priceTTC), true],
                  ['Part du matériel couverte par le stock', pct(cost.stockShare)],
                ].map(([k, v, strong]) => (
                  <div key={k as string} className={`flex justify-between py-1.5 border-b border-border text-xs ${strong ? 'font-bold text-primary' : ''}`}>
                    <span>{k}</span><span className="tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
              {cost.warnings.length > 0 && (
                <ul className="mt-3 text-[11.5px] text-destructive list-disc pl-5 space-y-0.5">
                  {cost.warnings.map(w => <li key={w}>{w}</li>)}
                </ul>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

export function TcSynthesis({ engine }: { engine: TcEngine }) {
  const { kits } = engine;
  return (
    <Section title="Synthèse des kits à commercialiser" description="Comparaison des kits : coûts, prix de vente, marge et part couverte par le stock.">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {['Solution', 'Variante', 'Nom du kit', 'Matériel stock', 'Matériel à acheter', 'Total matériel', "Main d'œuvre", 'Transport', 'Prix de revient', 'Prix de vente HT', 'Prix de vente TTC', 'Marge', 'Part stock', 'Points à compléter']
                .map((h, i) => <TableHead key={h} className={`text-xs whitespace-nowrap ${i > 2 && i < 13 ? 'text-right' : ''}`}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.kits.map(k => (
              <TableRow key={k.kit.id}>
                <TableCell className="text-xs py-1.5">{k.kit.solution_code}</TableCell>
                <TableCell className="text-xs py-1.5">{k.kit.variant}</TableCell>
                <TableCell className="text-xs py-1.5">{k.kit.name}</TableCell>
                {[k.materialFromStock, k.materialToBuy, k.materialTotal, k.laborCost, k.transport, k.costPrice, k.priceHT, k.priceTTC, k.margin].map((v, i) => (
                  <TableCell key={i} className={`text-xs py-1.5 text-right tabular-nums whitespace-nowrap ${i === 6 && v === 0 ? 'text-destructive' : ''}`}>{money(v)}</TableCell>
                ))}
                <TableCell className="text-xs py-1.5 text-right tabular-nums">{pct(k.stockShare)}</TableCell>
                <TableCell className="text-xs py-1.5 text-destructive">{k.material.length === 0 ? 'Composition à saisir' : k.warnings.length ? `${k.warnings.length}` : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}
