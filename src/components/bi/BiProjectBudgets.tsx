import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useCountries } from '@/hooks/useExpansionData';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useBiPoles, useBiProjects, type BiProject } from '@/hooks/useBiData';
import { useBiProjectMutations, type BiProjectInput } from '@/hooks/useBiProjects';
import { rollupBy, marginByProject, formatCompact, formatFcfa, type BiFact, type BiFilters } from '@/lib/biAggregate';

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié', active: 'Actif', paused: 'En pause', done: 'Terminé',
};

const emptyForm = (): BiProjectInput => ({
  code: '', name: '', country_id: null, pole_id: null,
  start_date: null, end_date: null, budget_total: 0, status: 'planned', notes: null,
});

interface Props { facts: BiFact[]; filters: BiFilters; }

export function BiProjectBudgets({ facts, filters }: Props) {
  const { data: projects } = useBiProjects();
  const { data: poles } = useBiPoles();
  const { data: countries } = useCountries();
  const role = useCurrentUserRole().data;
  const canEdit = role === 'admin' || role === 'director' || role === 'raf';
  const mutations = useBiProjectMutations();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BiProjectInput>(emptyForm());

  const rollup = useMemo(() => rollupBy(facts, 'project', filters), [facts, filters]);
  const margins = useMemo(() => marginByProject(facts, filters), [facts, filters]);

  const rows = useMemo(() => (projects ?? [])
    .filter(p => !filters.countryId || p.country_id === filters.countryId || !p.country_id)
    .filter(p => !filters.poleId || p.pole_id === filters.poleId)
    .filter(p => !filters.projectId || p.id === filters.projectId)
    .map(p => {
      const r = rollup.find(x => x.key === p.id);
      const m = margins.find(x => x.projectId === p.id);
      return { project: p, budget: r?.budget ?? 0, actual: r?.actual ?? 0, pct: r?.pct ?? 0, margin: m?.margin ?? 0 };
    }), [projects, rollup, margins, filters]);

  const openEdit = (p: BiProject) => {
    setEditId(p.id);
    setForm({
      code: p.code, name: p.name, country_id: p.country_id, pole_id: p.pole_id,
      start_date: p.start_date, end_date: p.end_date, budget_total: p.budget_total,
      status: p.status, notes: p.notes,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.code.trim()) return;
    if (editId) mutations.update.mutate({ id: editId, ...form });
    else mutations.create.mutate(form);
    setOpen(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const NONE = '__none__';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm">Sous-budgets par projet</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Le budget global de la plateforme se décompose ici en sous-budgets par projet. Montants en FCFA.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" className="gap-1" onClick={() => { setEditId(null); setForm(emptyForm()); setOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Nouveau sous-budget
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">Projet</TableHead>
              <TableHead className="text-xs">Pays</TableHead>
              <TableHead className="text-xs">Pôle</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs text-right">Enveloppe</TableHead>
              <TableHead className="text-xs text-right">Budgété (lignes)</TableHead>
              <TableHead className="text-xs text-right">Réalisé</TableHead>
              <TableHead className="text-xs text-right">Exéc.</TableHead>
              <TableHead className="text-xs text-right">Marge</TableHead>
              {canEdit && <TableHead className="text-xs" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ project: p, budget, actual, pct, margin }) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs font-mono">{p.code}</TableCell>
                <TableCell className="text-xs font-medium">{p.name}</TableCell>
                <TableCell className="text-xs">{countries?.find(c => c.id === p.country_id)?.name ?? 'Global'}</TableCell>
                <TableCell className="text-xs">{poles?.find(x => x.id === p.pole_id)?.label ?? '—'}</TableCell>
                <TableCell className="text-xs"><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{STATUS_LABELS[p.status] ?? p.status}</Badge></TableCell>
                <TableCell className="text-xs text-right" title={formatFcfa(p.budget_total)}>{formatCompact(p.budget_total)}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(budget)}</TableCell>
                <TableCell className="text-xs text-right">{formatCompact(actual)}</TableCell>
                <TableCell className={`text-xs text-right ${pct > 100 ? 'text-destructive font-semibold' : ''}`}>{pct.toFixed(0)} %</TableCell>
                <TableCell className={`text-xs text-right ${margin < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCompact(margin)}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                      {role === 'admin' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mutations.remove.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={canEdit ? 11 : 10} className="text-center text-xs text-muted-foreground py-8">
                Aucun sous-budget projet. Créez-en un pour découper le budget global.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Modifier le sous-budget' : 'Nouveau sous-budget projet'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PRJ-01" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nom *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom du projet" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pays</Label>
              <Select value={form.country_id ?? NONE} onValueChange={v => setForm({ ...form, country_id: v === NONE ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Global (tous pays)</SelectItem>
                  {countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pôle</Label>
              <Select value={form.pole_id ?? NONE} onValueChange={v => setForm({ ...form, pole_id: v === NONE ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Aucun</SelectItem>
                  {poles?.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Début</Label>
              <Input type="date" value={form.start_date ?? ''} onChange={e => setForm({ ...form, start_date: e.target.value || null })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fin</Label>
              <Input type="date" value={form.end_date ?? ''} onChange={e => setForm({ ...form, end_date: e.target.value || null })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Enveloppe (FCFA)</Label>
              <Input type="number" min={0} value={form.budget_total} onChange={e => setForm({ ...form, budget_total: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={!form.name.trim() || !form.code.trim()}>{editId ? 'Enregistrer' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
