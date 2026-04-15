import { useState, useMemo } from 'react';
import { useCountries } from '@/hooks/useExpansionData';
import { useKpiHistory, useUpsertKpiHistory, useDeleteKpiHistory, type KpiHistoryEntry } from '@/hooks/useKpiHistory';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { logActivity } from '@/hooks/useActivityLogger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Save, Trash2, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const EDITABLE_ROLES = ['admin', 'director', 'analyst'];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function KpisPage() {
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const { data: role } = useCurrentUserRole();
  const canEdit = EDITABLE_ROLES.includes(role ?? '');

  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const countryId = selectedCountry === 'all' ? undefined : selectedCountry;
  const { data: history = [], isLoading: loadingHistory } = useKpiHistory(countryId);
  const upsert = useUpsertKpiHistory();
  const deleteMut = useDeleteKpiHistory();
  const { logActivity } = useActivityLogger();

  // Inline edit state
  const [editRow, setEditRow] = useState<Partial<KpiHistoryEntry> & { isNew?: boolean } | null>(null);

  const launched = countries.filter(c => c.kpi_ca && c.kpi_ca !== 'N/A');
  const selectedCountryObj = countries.find(c => c.id === selectedCountry);

  // Chart data
  const chartData = useMemo(() => {
    if (selectedCountry === 'all') {
      // Aggregate by month
      const byMonth: Record<string, { ca: number; clients: number; nps: number[]; retention: number[] }> = {};
      history.forEach(h => {
        if (!byMonth[h.month]) byMonth[h.month] = { ca: 0, clients: 0, nps: [], retention: [] };
        byMonth[h.month].ca += Number(h.ca);
        byMonth[h.month].clients += Number(h.clients);
        byMonth[h.month].nps.push(Number(h.nps));
        byMonth[h.month].retention.push(Number(h.retention));
      });
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({
          month: formatMonth(month),
          CA: v.ca,
          Clients: v.clients,
          NPS: v.nps.length ? Math.round(v.nps.reduce((s, n) => s + n, 0) / v.nps.length) : 0,
          'Rétention (%)': v.retention.length ? Math.round(v.retention.reduce((s, n) => s + n, 0) / v.retention.length) : 0,
        }));
    }
    return history.map(h => ({
      month: formatMonth(h.month),
      CA: Number(h.ca),
      Clients: Number(h.clients),
      NPS: Number(h.nps),
      'Rétention (%)': Number(h.retention),
    }));
  }, [history, selectedCountry]);

  // Latest KPIs summary
  const latestKpis = useMemo(() => {
    if (history.length === 0) return null;
    const sorted = [...history].sort((a, b) => b.month.localeCompare(a.month));
    if (selectedCountry === 'all') {
      const latestMonth = sorted[0].month;
      const latest = sorted.filter(h => h.month === latestMonth);
      return {
        ca: latest.reduce((s, h) => s + Number(h.ca), 0),
        clients: latest.reduce((s, h) => s + Number(h.clients), 0),
        nps: latest.length ? Math.round(latest.reduce((s, h) => s + Number(h.nps), 0) / latest.length) : 0,
        retention: latest.length ? Math.round(latest.reduce((s, h) => s + Number(h.retention), 0) / latest.length) : 0,
        month: latestMonth,
      };
    }
    const l = sorted[0];
    return { ca: Number(l.ca), clients: Number(l.clients), nps: Number(l.nps), retention: Number(l.retention), month: l.month };
  }, [history, selectedCountry]);

  const handleSave = async () => {
    if (!editRow || !editRow.country_id || !editRow.month) return;
    try {
      await upsert.mutateAsync({
        country_id: editRow.country_id,
        month: editRow.month,
        ca: editRow.ca ?? 0,
        clients: editRow.clients ?? 0,
        nps: editRow.nps ?? 0,
        retention: editRow.retention ?? 0,
        notes: editRow.notes ?? '',
      });
      const country = countries.find(c => c.id === editRow.country_id);
      logActivity(`a ${editRow.isNew ? 'ajouté' : 'modifié'} les KPIs ${editRow.month} pour ${country?.name ?? editRow.country_id}`, 'kpi_history', editRow.country_id, country?.flag);
      toast.success(editRow.isNew ? 'KPI ajouté' : 'KPI mis à jour');
      setEditRow(null);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (entry: KpiHistoryEntry) => {
    try {
      await deleteMut.mutateAsync(entry.id);
      const country = countries.find(c => c.id === entry.country_id);
      logActivity(`a supprimé les KPIs ${entry.month} pour ${country?.name ?? entry.country_id}`, 'kpi_history', entry.country_id, country?.flag);
      toast.success('Entrée supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const startNew = () => {
    setEditRow({
      isNew: true,
      country_id: selectedCountry === 'all' ? (countries[0]?.id ?? '') : selectedCountry,
      month: currentMonth(),
      ca: 0,
      clients: 0,
      nps: 0,
      retention: 0,
      notes: '',
    });
  };

  if (loadingCountries || loadingHistory) {
    return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;
  }

  return (
    <div className="animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <TrendingUp size={22} className="text-accent" />
            <h2 className="font-display text-[23px] font-bold text-primary">KPIs Post-Lancement</h2>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Performance commerciale des marchés lancés · Historique mensuel · Tendances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCountry} onValueChange={v => { setSelectedCountry(v); setEditRow(null); }}>
            <SelectTrigger className="w-[220px] h-9 text-[13px]">
              <SelectValue placeholder="Sélectionner un pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌍 Tous les pays</SelectItem>
              {countries.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button size="sm" onClick={startNew} className="gap-1.5 h-9">
              <Plus size={14} /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI cards */}
      {latestKpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'CA Mensuel', value: `${latestKpis.ca.toLocaleString('fr-FR')} FCFA`, bg: 'bg-[hsl(var(--sage-light))]', text: 'text-[hsl(var(--sage-dark))]' },
            { label: 'Clients Actifs', value: String(latestKpis.clients), bg: 'bg-[hsl(var(--sky-light))]', text: 'text-[hsl(var(--sky))]' },
            { label: 'NPS Score', value: String(latestKpis.nps), bg: 'bg-[hsl(var(--gold-light))]', text: 'text-[hsl(var(--gold))]' },
            { label: 'Rétention', value: `${latestKpis.retention}%`, bg: 'bg-[hsl(var(--terra-light))]', text: 'text-destructive' },
          ].map(item => (
            <div key={item.label} className={`text-center p-4 ${item.bg} rounded-lg`}>
              <div className={`text-[10.5px] font-semibold ${item.text} uppercase tracking-wide mb-2`}>{item.label}</div>
              <div className="font-display text-[26px] font-bold text-primary">{item.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{formatMonth(latestKpis.month)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trend Charts */}
      {chartData.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-accent" />
              <h3 className="font-display text-[15.5px] font-semibold text-primary">CA & Clients</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="left" type="monotone" dataKey="CA" stroke="hsl(var(--sage))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="Clients" stroke="hsl(var(--sky))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-accent" />
              <h3 className="font-display text-[15.5px] font-semibold text-primary">NPS & Rétention</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="NPS" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Rétention (%)" stroke="hsl(var(--plum))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Inline edit row */}
      {editRow && (
        <div className="bg-card border-2 border-accent rounded-lg p-4 mb-4">
          <h4 className="text-[13px] font-semibold text-primary mb-3">
            {editRow.isNew ? '➕ Nouvelle entrée KPI' : '✏️ Modifier KPI'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {selectedCountry === 'all' && (
              <div>
                <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">Pays</label>
                <Select value={editRow.country_id ?? ''} onValueChange={v => setEditRow({ ...editRow, country_id: v })}>
                  <SelectTrigger className="h-8 text-[12px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">Mois</label>
              <Input type="month" className="h-8 text-[12px] mt-1" value={editRow.month ?? ''} onChange={e => setEditRow({ ...editRow, month: e.target.value })} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">CA (FCFA)</label>
              <Input type="number" className="h-8 text-[12px] mt-1" value={editRow.ca ?? 0} onChange={e => setEditRow({ ...editRow, ca: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">Clients</label>
              <Input type="number" className="h-8 text-[12px] mt-1" value={editRow.clients ?? 0} onChange={e => setEditRow({ ...editRow, clients: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">NPS</label>
              <Input type="number" className="h-8 text-[12px] mt-1" value={editRow.nps ?? 0} onChange={e => setEditRow({ ...editRow, nps: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">Rétention (%)</label>
              <Input type="number" className="h-8 text-[12px] mt-1" value={editRow.retention ?? 0} onChange={e => setEditRow({ ...editRow, retention: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending} className="h-8 gap-1">
                <Save size={13} /> Sauver
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditRow(null)} className="h-8">Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display text-[15.5px] font-semibold text-primary">
            Historique mensuel {selectedCountryObj ? `— ${selectedCountryObj.flag} ${selectedCountryObj.name}` : '— Tous les pays'}
          </h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucune donnée KPI enregistrée.{canEdit && ' Cliquez sur "Ajouter" pour commencer.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-muted/30">
                  {selectedCountry === 'all' && <th className="text-left p-3 font-semibold text-muted-foreground">Pays</th>}
                  <th className="text-left p-3 font-semibold text-muted-foreground">Mois</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">CA (FCFA)</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Clients</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">NPS</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Rétention</th>
                  {canEdit && <th className="text-center p-3 font-semibold text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {[...history].sort((a, b) => b.month.localeCompare(a.month)).map(entry => {
                  const country = countries.find(c => c.id === entry.country_id);
                  return (
                    <tr key={entry.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      {selectedCountry === 'all' && (
                        <td className="p-3">
                          <span className="mr-1.5">{country?.flag}</span>
                          {country?.name ?? entry.country_id}
                        </td>
                      )}
                      <td className="p-3 font-medium">{formatMonth(entry.month)}</td>
                      <td className="p-3 text-right font-display font-semibold">{Number(entry.ca).toLocaleString('fr-FR')}</td>
                      <td className="p-3 text-right font-display font-semibold">{Number(entry.clients).toLocaleString('fr-FR')}</td>
                      <td className="p-3 text-right font-display font-semibold">{Number(entry.nps)}</td>
                      <td className="p-3 text-right font-display font-semibold">{Number(entry.retention)}%</td>
                      {canEdit && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setEditRow({ ...entry, isNew: false })}
                            >
                              <Save size={13} />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(entry)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatMonth(m: string): string {
  const [year, month] = m.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}
