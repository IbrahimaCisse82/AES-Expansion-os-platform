import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountries } from '@/hooks/useExpansionData';
import { useBiPoles, useBiProjects, useBiScenarios, useBiScope } from '@/hooks/useBiData';
import { MONTH_LABELS, type BiFilters as Filters } from '@/lib/biAggregate';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const ALL = '__all__';

export function BiFilters({ filters, onChange }: Props) {
  const { data: countries } = useCountries();
  const { data: poles } = useBiPoles();
  const { data: projects } = useBiProjects();
  const { data: scenarios } = useBiScenarios();
  const scope = useBiScope().data;

  // RAF / profil scopé : le filtre pays est verrouillé sur son pays
  useEffect(() => {
    if (scope && filters.countryId !== scope) onChange({ ...filters, countryId: scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
      <Select value={filters.countryId ?? ALL} onValueChange={v => set({ countryId: v === ALL ? null : v, projectId: null })} disabled={!!scope}>
        <SelectTrigger className="text-xs"><SelectValue placeholder="Pays" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les pays</SelectItem>
          {countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.poleId ?? ALL} onValueChange={v => set({ poleId: v === ALL ? null : v })}>
        <SelectTrigger className="text-xs"><SelectValue placeholder="Pôle" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les pôles</SelectItem>
          {poles?.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.projectId ?? ALL} onValueChange={v => set({ projectId: v === ALL ? null : v })}>
        <SelectTrigger className="text-xs"><SelectValue placeholder="Projet" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les projets</SelectItem>
          {projects?.filter(p => !filters.countryId || p.country_id === filters.countryId || !p.country_id)
            .map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.scenarioId ?? ALL} onValueChange={v => set({ scenarioId: v === ALL ? null : v })}>
        <SelectTrigger className="text-xs"><SelectValue placeholder="Scénario" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les scénarios</SelectItem>
          {scenarios?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={String(filters.monthFrom)} onValueChange={v => set({ monthFrom: Number(v) })}>
        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTH_LABELS.map((l, i) => <SelectItem key={l} value={String(i + 1)}>De {l}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={String(filters.monthTo)} onValueChange={v => set({ monthTo: Number(v) })}>
        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTH_LABELS.map((l, i) => <SelectItem key={l} value={String(i + 1)}>À {l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
