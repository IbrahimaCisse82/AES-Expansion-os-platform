import { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useCountries } from '@/hooks/useExpansionData';

const ANALYSIS_BASE_URL = 'https://africa-deal-spark.lovable.app';

export default function MarketAnalysisPage() {
  const { data: countries = [], isLoading } = useCountries();
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const activeCountry = countries.find(c => c.id === activeTab);
  const iframeUrl = activeCountry
    ? `${ANALYSIS_BASE_URL}?country=${encodeURIComponent(activeCountry.name)}`
    : ANALYSIS_BASE_URL;

  return (
    <div className="animate-page-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-1">Analyse Marché</h2>
          <p className="text-[12.5px] text-muted-foreground">
            {countries.length} marché{countries.length > 1 ? 's' : ''} ciblé{countries.length > 1 ? 's' : ''} · Données en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(f => !f)}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title={fullscreen ? 'Réduire' : 'Plein écran'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Country tabs */}
      {countries.length > 0 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Tous les marchés
          </button>
          {countries.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                activeTab === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active country info bar */}
      {activeCountry && (
        <div className="flex items-center gap-4 mb-4 px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-[12px]">
          <span className="text-lg">{activeCountry.flag}</span>
          <span className="font-semibold text-primary">{activeCountry.name}</span>
          <span className="text-muted-foreground">{activeCountry.region}</span>
          {activeCountry.population && <span className="text-muted-foreground">Pop: {activeCountry.population}</span>}
          {activeCountry.gdp && <span className="text-muted-foreground">PIB: {activeCountry.gdp}</span>}
          {activeCountry.language && <span className="text-muted-foreground">Langue: {activeCountry.language}</span>}
        </div>
      )}

      <div className={`bg-card border border-border rounded-lg overflow-hidden transition-all ${fullscreen ? 'fixed inset-4 z-50' : ''}`}>
        {fullscreen && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium text-primary">
              Africa Deal Spark {activeCountry ? `· ${activeCountry.flag} ${activeCountry.name}` : ''}
            </span>
            <button onClick={() => setFullscreen(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <Minimize2 size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}
        <iframe
          src={iframeUrl}
          className={`w-full border-0 ${fullscreen ? 'h-[calc(100%-41px)]' : 'h-[calc(100vh-280px)]'}`}
          title={`Analyse Marché${activeCountry ? ` - ${activeCountry.name}` : ''}`}
          allow="clipboard-read; clipboard-write"
        />
      </div>

      {fullscreen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFullscreen(false)} />}
    </div>
  );
}