import StatusPill from '@/components/StatusPill';
import { countries, phaseNames } from '@/data/expansionData';

interface CountriesPageProps {
  onSelectCountry: (id: string) => void;
}

export default function CountriesPage({ onSelectCountry }: CountriesPageProps) {
  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Pays Cibles</h2>
        <p className="text-[12.5px] text-muted-foreground">Vue d'ensemble des marchés d'expansion · 6 pays ciblés</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {countries.map(c => {
          const colorMap: Record<string, string> = {
            sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum',
          };
          const riskColor = c.risks > 1 ? 'text-terracotta' : c.risks === 1 ? 'text-gold' : 'text-sage';
          return (
            <div
              key={c.id}
              onClick={() => onSelectCountry(c.id)}
              className="bg-card border border-border rounded-lg p-5 cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:shadow-card-hover relative group"
            >
              <div className="flex items-center gap-3 mb-3.5">
                <span className="text-[38px] leading-none">{c.flag}</span>
                <div className="flex-1">
                  <div className="font-display text-[17px] font-bold text-primary">{c.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">{c.region}</div>
                </div>
                <StatusPill status={c.st} />
              </div>

              <div className="text-[12.5px] font-medium mb-2">{phaseNames[c.phase]}</div>
              <div className="h-1 bg-ivory rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${colorMap[c.color] || 'bg-sage'}`} style={{ width: `${c.pct}%` }} />
              </div>
              <div className="flex justify-between text-[11.5px] text-muted-foreground mb-3.5">
                <span>Avancement</span>
                <span className="font-semibold">{c.pct}%</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 border-t border-ivory pt-3 text-center">
                <div>
                  <div className="font-display text-sm font-bold text-primary">{c.budget}</div>
                  <div className="text-[9.5px] text-muted-foreground mt-0.5">Budget</div>
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-primary">{c.team}</div>
                  <div className="text-[9.5px] text-muted-foreground mt-0.5">Équipe</div>
                </div>
                <div>
                  <div className={`font-display text-sm font-bold ${riskColor}`}>{c.risks}</div>
                  <div className="text-[9.5px] text-muted-foreground mt-0.5">Risques</div>
                </div>
              </div>

              <div className="text-center mt-3 text-[12px] text-sage font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Voir la fiche détaillée →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
