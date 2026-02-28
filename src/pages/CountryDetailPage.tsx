import { ArrowLeft } from 'lucide-react';
import StatusPill from '@/components/StatusPill';
import { useCountries, useMilestones } from '@/hooks/useExpansionData';

const phaseNames = [
  'Phase 0 — Prospection', 'Phase 1 — Étude & Légal', 'Phase 2 — Mise en place',
  'Phase 3 — Lancement', 'Phase 4 — Opérationnel',
];

interface CountryDetailPageProps {
  countryId: string;
  onBack: () => void;
}

export default function CountryDetailPage({ countryId, onBack }: CountryDetailPageProps) {
  const { data: countries = [] } = useCountries();
  const { data: milestones = [] } = useMilestones(countryId);
  const country = countries.find(c => c.id === countryId);
  if (!country) return null;

  const colorMap: Record<string, string> = { sage: 'text-sage', sky: 'text-sky', gold: 'text-gold', terracotta: 'text-terracotta', plum: 'text-plum' };

  return (
    <div className="animate-page-enter">
      <button onClick={onBack} className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={14} /> Retour aux pays
      </button>
      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{country.flag}</span>
        <div className="flex-1">
          <h2 className="font-display text-[26px] font-bold text-primary">{country.name}</h2>
          <p className="text-[13px] text-muted-foreground">{country.region} · {phaseNames[country.phase]}</p>
        </div>
        <StatusPill status={country.status as any} />
      </div>

      <div className="flex items-center gap-0 mb-6">
        {phaseNames.map((phase, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex-1 py-2 px-1.5 text-center text-[11px] font-semibold rounded-lg border-[1.5px] transition-all ${
              i < country.phase ? 'bg-sage-light text-sage-dark border-sage' :
              i === country.phase ? 'bg-primary text-primary-foreground border-primary shadow-card-hover' :
              'bg-ivory text-muted-foreground border-border'
            }`}>{phase.split(' — ')[0]}</div>
            {i < 4 && <div className="w-5 text-center text-border text-sm flex-shrink-0">›</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Informations</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[['Population', country.population], ['PIB', country.gdp], ['Langue', country.language], ['Contact', country.local_contact]].map(([k, v]) => (
              <div key={k} className="bg-ivory rounded-lg p-3">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{k}</div>
                <div className="text-[13.5px] font-semibold text-primary">{v}</div>
              </div>
            ))}
          </div>
          <div className="bg-ivory rounded-lg p-3.5 text-[13px] leading-relaxed">{country.description}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Jalons clés</h3>
          {milestones.map(m => (
            <div key={m.id} className="flex gap-3 py-3 border-b border-ivory last:border-b-0">
              <span className="text-lg w-7 text-center flex-shrink-0">{m.icon}</span>
              <div className="flex-1">
                <div className={`text-[13px] font-medium ${m.is_done ? 'line-through text-muted-foreground' : ''}`}>{m.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{m.target_date}</div>
              </div>
              <StatusPill status={m.is_done ? 'done' : 'planning'} />
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 col-span-2">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">KPIs</h3>
          <div className="grid grid-cols-4 gap-3">
            {[['CA Mensuel', country.kpi_ca, 'sage'], ['Clients', country.kpi_clients, 'sky'], ['NPS', country.kpi_nps, 'gold'], ['Rétention', country.kpi_retention, 'terracotta']].map(([label, value, color]) => (
              <div key={label} className="bg-ivory rounded-lg p-4 text-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
                <div className={`font-display text-[22px] font-bold ${value === 'N/A' ? 'text-muted-foreground' : (colorMap[color as string] || 'text-sage')}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
