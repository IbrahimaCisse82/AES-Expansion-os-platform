import { useCountries } from '@/hooks/useExpansionData';

export default function KpisPage() {
  const { data: countries = [], isLoading } = useCountries();
  const launched = countries.filter(c => c.kpi_ca && c.kpi_ca !== 'N/A');

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">KPIs Post-Lancement</h2>
        <p className="text-[12.5px] text-muted-foreground">Performance commerciale des marchés lancés · Mise à jour mensuelle</p>
      </div>

      {launched.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">Aucun marché avec des KPIs disponibles</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {launched.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-5">
            <div className="text-[28px] mb-2">{c.flag}</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">{c.name}</div>
            <div className="space-y-1.5">
              {[
                ['CA/mois', c.kpi_ca],
                ['Clients', c.kpi_clients],
                ['NPS', c.kpi_nps],
                ['Rétention', c.kpi_retention],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-baseline">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className="font-display text-xl font-bold text-primary">{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {launched.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">
            Objectifs vs Réalisé — {launched[0].name} (marché le plus avancé)
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'CA Mensuel', value: launched[0].kpi_ca, bg: 'bg-[hsl(var(--sage-light))]', textColor: 'text-[hsl(var(--sage-dark))]' },
              { label: 'Clients Actifs', value: launched[0].kpi_clients, bg: 'bg-[hsl(var(--sky-light))]', textColor: 'text-[hsl(var(--sky))]' },
              { label: 'NPS Score', value: launched[0].kpi_nps, bg: 'bg-[hsl(var(--gold-light))]', textColor: 'text-[hsl(var(--gold))]' },
              { label: 'Rétention', value: launched[0].kpi_retention, bg: 'bg-[hsl(var(--terra-light))]', textColor: 'text-destructive' },
            ].map(item => (
              <div key={item.label} className={`text-center p-4 ${item.bg} rounded-lg`}>
                <div className={`text-[11px] font-semibold ${item.textColor} uppercase tracking-wide mb-2`}>{item.label}</div>
                <div className="font-display text-[26px] font-bold text-primary">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
