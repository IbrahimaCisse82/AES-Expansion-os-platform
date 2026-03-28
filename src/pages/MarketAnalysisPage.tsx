import { ExternalLink } from 'lucide-react';
import { useCountries } from '@/hooks/useExpansionData';

const ANALYSIS_BASE_URL = 'https://africa-deal-spark.lovable.app';

export default function MarketAnalysisPage() {
  const { data: countries = [], isLoading } = useCountries();

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Analyse Marché</h2>
        <p className="text-[12.5px] text-muted-foreground">
          Informations économiques et commerciales pour vos marchés cibles · Mis à jour automatiquement
        </p>
      </div>

      {/* Link to full platform */}
      <a
        href={ANALYSIS_BASE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mb-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <ExternalLink size={15} />
        Ouvrir la plateforme d'analyse complète
      </a>

      {countries.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Ajoutez des pays cibles pour accéder à leurs analyses de marché
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {countries.map(c => (
            <a
              key={c.id}
              href={ANALYSIS_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border border-border rounded-lg p-5 hover:shadow-card hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[28px]">{c.flag}</span>
                <div>
                  <div className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.region}</div>
                </div>
                <ExternalLink size={14} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1.5 text-[12px]">
                {c.population && <div className="flex justify-between"><span className="text-muted-foreground">Population</span><span className="font-medium">{c.population}</span></div>}
                {c.gdp && <div className="flex justify-between"><span className="text-muted-foreground">PIB</span><span className="font-medium">{c.gdp}</span></div>}
                {c.language && <div className="flex justify-between"><span className="text-muted-foreground">Langue</span><span className="font-medium">{c.language}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-accent' : c.status === 'done' ? 'bg-[hsl(var(--sky))]' : 'bg-[hsl(var(--gold))]'}`} />
                <span className="text-[11px] text-muted-foreground capitalize">{c.status}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
