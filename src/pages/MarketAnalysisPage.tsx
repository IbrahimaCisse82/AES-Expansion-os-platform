import { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useCountries } from '@/hooks/useExpansionData';

const ANALYSIS_BASE_URL = 'https://africa-deal-spark.lovable.app';

export default function MarketAnalysisPage() {
  const { data: countries = [], isLoading } = useCountries();
  const [fullscreen, setFullscreen] = useState(false);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

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
            href={ANALYSIS_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className={`bg-card border border-border rounded-lg overflow-hidden transition-all ${fullscreen ? 'fixed inset-4 z-50' : ''}`}>
        {fullscreen && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium text-primary">Africa Deal Spark</span>
            <button onClick={() => setFullscreen(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <Minimize2 size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}
        <iframe
          src={ANALYSIS_BASE_URL}
          className={`w-full border-0 ${fullscreen ? 'h-[calc(100%-41px)]' : 'h-[calc(100vh-220px)]'}`}
          title="Analyse Marché - Africa Deal Spark"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      {fullscreen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFullscreen(false)} />}
    </div>
  );
}