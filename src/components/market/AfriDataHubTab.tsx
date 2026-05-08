import { useState, useMemo, useCallback } from 'react';
import { Search, Globe, FileText, Building2, Briefcase, Users2, ScrollText, Sparkles, Calendar, MapPin, DollarSign, ExternalLink, ChevronRight, X, Loader2, AlertTriangle, Lightbulb, TrendingUp, Shield, ArrowRight, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AGREEMENTS, PROGRAMS, PROJECTS, FUNDERS, TENDERS, STAKEHOLDERS, TARGET_COUNTRIES, type DealItem } from '@/data/marketIntelData';
import { useCountries } from '@/hooks/useExpansionData';

const STATUS_COLORS: Record<string, string> = {
  'Actif': 'bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage',
  'En cours': 'bg-gold/10 text-gold dark:bg-gold/20 dark:text-gold',
  'Terminé': 'bg-sky/10 text-sky dark:bg-sky/20 dark:text-sky',
  'Planifié': 'bg-plum/10 text-plum dark:bg-plum/20 dark:text-plum',
  'Ouvert': 'bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage',
  'Attribué': 'bg-muted text-muted-foreground',
  'En évaluation': 'bg-gold/10 text-gold dark:bg-gold/20 dark:text-gold',
};

function DealDetailDialog({ item, open, onClose }: { item: DealItem | null; open: boolean; onClose: () => void }) {
  if (!item) return null;
  const d = item.details;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="text-[16px] leading-snug pr-4">{item.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground'}`}>
                  {item.status}
                </span>
                <Badge variant="secondary" className="text-[10.5px]">{item.sector}</Badge>
                {item.type && <Badge variant="outline" className="text-[10.5px]">{item.type}</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Description */}
          <p className="text-[13px] text-muted-foreground leading-relaxed">{item.description}</p>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            {item.countries.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Pays</div>
                  <div className="font-medium text-foreground">{item.countries.join(', ')}</div>
                </div>
              </div>
            )}
            {item.date && (
              <div className="flex items-start gap-2">
                <Calendar size={13} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Date</div>
                  <div className="font-medium text-foreground">{item.date}</div>
                </div>
              </div>
            )}
            {item.amount && (
              <div className="flex items-start gap-2">
                <DollarSign size={13} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Montant</div>
                  <div className="font-semibold text-accent">{item.amount}</div>
                </div>
              </div>
            )}
            {(item.organization || item.partner) && (
              <div className="flex items-start gap-2">
                <Building2 size={13} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">{item.partner ? 'Partenaire' : 'Organisation'}</div>
                  <div className="font-medium text-foreground">{item.organization || item.partner}</div>
                </div>
              </div>
            )}
          </div>

          {/* Objectives */}
          {d?.objectives && d.objectives.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-[13px] font-semibold text-foreground mb-2 flex items-center gap-1.5">🎯 Objectifs</h4>
              <ul className="space-y-1.5">
                {d.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                    <ChevronRight size={12} className="text-accent mt-0.5 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Facts */}
          {d?.key_facts && d.key_facts.length > 0 && (
            <div className="bg-accent/5 rounded-lg p-4">
              <h4 className="text-[13px] font-semibold text-foreground mb-2 flex items-center gap-1.5">📊 Faits clés</h4>
              <ul className="space-y-1.5">
                {d.key_facts.map((fact, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                    <span className="text-accent font-bold mt-0.5">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline */}
          {d?.timeline && (
            <div className="bg-primary/5 rounded-lg p-4">
              <h4 className="text-[13px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">📅 Calendrier</h4>
              <p className="text-[12.5px] text-muted-foreground">{d.timeline}</p>
            </div>
          )}

          {/* Eligibility */}
          {d?.eligibility && (
            <div className="bg-gold/10 dark:bg-gold/20 rounded-lg p-4">
              <h4 className="text-[13px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">✅ Éligibilité</h4>
              <p className="text-[12.5px] text-muted-foreground">{d.eligibility}</p>
            </div>
          )}

          {/* Contacts */}
          {d?.contacts && d.contacts.length > 0 && (
            <div>
              <h4 className="text-[13px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">📞 Contacts</h4>
              <ul className="space-y-1">
                {d.contacts.map((c, i) => (
                  <li key={i} className="text-[12px] text-muted-foreground">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Source URL */}
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:underline font-medium">
              <ExternalLink size={12} />Voir la source officielle
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DealCard({ item, onClick, selectedCountry }: { item: DealItem; onClick: () => void; selectedCountry?: string }) {
  const isSpecific = selectedCountry && selectedCountry !== 'all' && item.countries.length === 1 && item.countries[0] === selectedCountry;
  const isMulti = item.countries.length > 1;

  return (
    <div onClick={onClick} className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all cursor-pointer group ${isSpecific ? 'border-accent/50 ring-1 ring-accent/20' : 'border-border hover:border-accent/30'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedCountry && selectedCountry !== 'all' && (
            isSpecific ? (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
                <MapPin size={9} />Spécifique
              </span>
            ) : isMulti ? (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-muted text-muted-foreground border border-border flex items-center gap-1">
                <Globe size={9} />Multi-pays
              </span>
            ) : null
          )}
          <h4 className="text-[14px] font-semibold text-foreground leading-tight flex-1 group-hover:text-accent transition-colors truncate">{item.title}</h4>
        </div>
        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground'}`}>
          {item.status}
        </span>
      </div>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{item.description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground mb-3">
        {item.countries.length > 0 && (
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-accent" />
            {item.countries.length <= 2 ? item.countries.join(', ') : `${item.countries.slice(0, 2).join(', ')} +${item.countries.length - 2}`}
          </span>
        )}
        {item.date && (
          <span className="flex items-center gap-1"><Calendar size={11} />{item.date}</span>
        )}
        {(item.organization || item.partner) && (
          <span className="flex items-center gap-1"><Building2 size={11} />{item.organization || item.partner}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-secondary text-muted-foreground">{item.sector}</span>
        {item.amount && (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-accent/10 text-accent flex items-center gap-1">
            <DollarSign size={9} /> {item.amount}
          </span>
        )}
        {item.type && (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-primary/10 text-primary">{item.type}</span>
        )}
      </div>
      {item.details && (
        <div className="mt-2 text-[10.5px] text-accent font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Voir les détails <ChevronRight size={10} />
        </div>
      )}
    </div>
  );
}

function SectionView({ items, title, description }: { items: DealItem[]; title: string; description: string }) {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<DealItem | null>(null);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.countries.some(c => c.toLowerCase().includes(q)));
    }
    if (sectorFilter !== 'all') result = result.filter(i => i.sector === sectorFilter);
    if (countryFilter !== 'all') result = result.filter(i => i.countries.includes(countryFilter));
    // Sort: specific items first when a country is selected
    if (countryFilter !== 'all') {
      result = [...result].sort((a, b) => {
        const aSpecific = a.countries.length === 1 && a.countries[0] === countryFilter ? 0 : 1;
        const bSpecific = b.countries.length === 1 && b.countries[0] === countryFilter ? 0 : 1;
        return aSpecific - bSpecific;
      });
    }
    return result;
  }, [items, search, sectorFilter, countryFilter]);

  const specificCount = useMemo(() => {
    if (countryFilter === 'all') return 0;
    return filtered.filter(i => i.countries.length === 1 && i.countries[0] === countryFilter).length;
  }, [filtered, countryFilter]);

  const multiCount = useMemo(() => {
    if (countryFilter === 'all') return 0;
    return filtered.filter(i => i.countries.length > 1).length;
  }, [filtered, countryFilter]);

  const sectors = useMemo(() => [...new Set(items.map(i => i.sector))].sort(), [items]);

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="text-[12.5px] text-muted-foreground">{description}</p>
          </div>
          {countryFilter !== 'all' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30">
                <MapPin size={14} className="text-accent" />
                <span className="text-[12px] font-semibold text-accent">{specificCount}</span>
                <span className="text-[11px] text-muted-foreground">Spécifique{specificCount > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border">
                <Globe size={14} className="text-muted-foreground" />
                <span className="text-[12px] font-semibold text-foreground">{multiCount}</span>
                <span className="text-[11px] text-muted-foreground">Multi-pays</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par pays, titre ou description..." className="pl-9 h-9 text-[13px]" />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[180px] h-9 text-[12px]"><SelectValue placeholder="Pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {TARGET_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px] h-9 text-[12px]"><SelectValue placeholder="Secteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les secteurs</SelectItem>
            {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="text-[12px] text-muted-foreground mb-3">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(item => <DealCard key={item.id} item={item} onClick={() => setSelectedItem(item)} selectedCountry={countryFilter} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucun résultat pour cette recherche</div>
      )}
      <DealDetailDialog item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

interface AIAnalysisResult {
  summary: string;
  country_context: string;
  matched_items: Array<{ id: string; relevance_score: number; relevance_reason: string }>;
  recommendations: Array<{ title: string; description: string; priority: string; category: string }>;
  risks: Array<{ title: string; description: string; severity: string; mitigation: string }>;
  opportunities: Array<{ title: string; description: string; potential_impact: string }>;
  next_steps: string[];
}

const ALL_ITEMS = [...AGREEMENTS, ...PROGRAMS, ...PROJECTS, ...FUNDERS, ...TENDERS, ...STAKEHOLDERS];

const PRIORITY_COLORS: Record<string, string> = {
  haute: 'bg-coral/10 text-coral dark:bg-coral/20 dark:text-coral',
  moyenne: 'bg-gold/10 text-gold dark:bg-gold/20 dark:text-gold',
  basse: 'bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage',
};

const SEVERITY_COLORS: Record<string, string> = {
  'élevé': 'bg-coral/10 text-coral dark:bg-coral/20 dark:text-coral',
  moyen: 'bg-gold/10 text-gold dark:bg-gold/20 dark:text-gold',
  faible: 'bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage',
};

const IMPACT_COLORS: Record<string, string> = {
  fort: 'bg-accent/15 text-accent',
  moyen: 'bg-sky/10 text-sky dark:bg-sky/20 dark:text-sky',
  faible: 'bg-muted text-muted-foreground',
};

function AnalyseIA() {
  const { data: countries = [] } = useCountries();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [streamText, setStreamText] = useState('');
  const [selectedItem, setSelectedItem] = useState<DealItem | null>(null);
  const { toast } = useToast();

  const handleAnalyze = useCallback(async () => {
    if (!selectedCountry && !description) return;
    setIsLoading(true);
    setAiResult(null);
    setStreamText('');

    const countryName = selectedCountry || 'Non spécifié';

    // Build compact data summary for the AI
    const existingData = {
      accords: AGREEMENTS.map(a => ({ id: a.id, title: a.title, countries: a.countries, sector: a.sector, amount: a.amount })),
      programmes: PROGRAMS.map(p => ({ id: p.id, title: p.title, countries: p.countries, sector: p.sector })),
      projets: PROJECTS.map(p => ({ id: p.id, title: p.title, countries: p.countries, sector: p.sector, amount: p.amount })),
      financeurs: FUNDERS.map(f => ({ id: f.id, title: f.title, countries: f.countries, sector: f.sector, amount: f.amount })),
      appels: TENDERS.map(t => ({ id: t.id, title: t.title, countries: t.countries, sector: t.sector })),
      parties: STAKEHOLDERS.map(s => ({ id: s.id, title: s.title, countries: s.countries, sector: s.sector })),
    };

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/afridatahub-analyze`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ country: countryName, description, existingData }),
      });

      if (resp.status === 429) {
        toast({ title: 'Limite atteinte', description: 'Veuillez réessayer dans quelques instants.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: 'Crédits IA épuisés', description: 'Ajoutez des crédits dans les paramètres.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error('Erreur lors de l\'analyse');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullText = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setStreamText(fullText);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Parse JSON from accumulated text
      try {
        // Extract JSON from potential markdown code blocks
        let jsonText = fullText;
        const jsonMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonText = jsonMatch[1].trim();
        
        const parsed = JSON.parse(jsonText) as AIAnalysisResult;
        setAiResult(parsed);
        setStreamText('');
      } catch {
        console.warn('Could not parse AI response as JSON, showing raw text');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast({ title: 'Erreur', description: 'Impossible de lancer l\'analyse IA. Réessayez.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedCountry, description, toast]);

  const matchedDealItems = useMemo(() => {
    if (!aiResult?.matched_items) return [];
    return aiResult.matched_items
      .map(m => {
        const item = ALL_ITEMS.find(i => i.id === m.id);
        return item ? { ...m, item } : null;
      })
      .filter((m): m is { id: string; relevance_score: number; relevance_reason: string; item: DealItem } => m !== null)
      .sort((a, b) => b.relevance_score - a.relevance_score);
  }, [aiResult]);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Brain size={20} className="text-accent" />Analyse IA
        </h3>
        <p className="text-[12.5px] text-muted-foreground">Analyse intelligente propulsée par l'IA — recommandations stratégiques, matching sémantique, risques et opportunités</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Input Panel */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Sparkles size={16} className="text-accent" />Soumettre un projet
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Pays cible</label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="-- Choisir un pays --" /></SelectTrigger>
              <SelectContent>
                {TARGET_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Description du projet</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Projet d'installation d'une usine de transformation agroalimentaire au Sénégal, ciblant l'export de produits transformés vers l'UE..."
              className="w-full p-3 border border-border rounded-lg text-[13px] bg-background resize-none h-32 focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={(!selectedCountry && !description) || isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? <><Loader2 size={14} className="animate-spin" />Analyse en cours...</> : <><Sparkles size={14} />Lancer l'analyse IA</>}
          </button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {isLoading && !aiResult && (
            <div className="bg-card border border-accent/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                  <Loader2 size={16} className="text-accent animate-spin" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-foreground">Analyse en cours...</h4>
                  <p className="text-[11px] text-muted-foreground">L'IA analyse votre projet et génère des recommandations</p>
                </div>
              </div>
              {streamText && (
                <div className="bg-muted/30 rounded-lg p-3 text-[11px] text-muted-foreground max-h-32 overflow-y-auto font-mono">
                  {streamText.substring(0, 200)}...
                </div>
              )}
            </div>
          )}

          {aiResult && (
            <>
              {/* Summary */}
              <div className="bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/20 rounded-lg p-5">
                <h4 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-2">
                  <Brain size={16} className="text-accent" />Résumé exécutif
                </h4>
                <p className="text-[13px] text-foreground leading-relaxed">{aiResult.summary}</p>
                {aiResult.country_context && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Contexte pays : </span>
                      {aiResult.country_context}
                    </p>
                  </div>
                )}
              </div>

              {/* Matched Items */}
              {matchedDealItems.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h4 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                    🎯 Données matchées ({matchedDealItems.length})
                  </h4>
                  <div className="space-y-2">
                    {matchedDealItems.map(m => (
                      <div key={m.id} onClick={() => setSelectedItem(m.item)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted hover:border-accent/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <span className="text-[12px] font-bold text-accent">{m.relevance_score}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium text-foreground truncate">{m.item.title}</div>
                          <div className="text-[11px] text-muted-foreground">{m.relevance_reason}</div>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h4 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                    <Lightbulb size={14} className="text-gold/300" />Recommandations stratégiques
                  </h4>
                  <div className="space-y-3">
                    {aiResult.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_COLORS[rec.priority] || 'bg-muted text-muted-foreground'}`}>
                            {rec.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-secondary text-muted-foreground">{rec.category}</span>
                        </div>
                        <h5 className="text-[12.5px] font-semibold text-foreground">{rec.title}</h5>
                        <p className="text-[11.5px] text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks & Opportunities side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiResult.risks && aiResult.risks.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <h4 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-coral" />Risques identifiés
                    </h4>
                    <div className="space-y-2.5">
                      {aiResult.risks.map((risk, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-coral/10 dark:bg-coral/20 border border-coral/30 dark:border-coral/30">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${SEVERITY_COLORS[risk.severity] || 'bg-muted text-muted-foreground'}`}>
                              {risk.severity}
                            </span>
                          </div>
                          <h5 className="text-[12px] font-semibold text-foreground">{risk.title}</h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{risk.description}</p>
                          <p className="text-[10.5px] text-accent mt-1 flex items-center gap-1">
                            <Shield size={10} />Mitigation : {risk.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.opportunities && aiResult.opportunities.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <h4 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                      <TrendingUp size={14} className="text-sage" />Opportunités
                    </h4>
                    <div className="space-y-2.5">
                      {aiResult.opportunities.map((opp, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-sage/10 dark:bg-sage/20 border border-sage/30 dark:border-sage/30">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${IMPACT_COLORS[opp.potential_impact] || 'bg-muted text-muted-foreground'}`}>
                              Impact {opp.potential_impact}
                            </span>
                          </div>
                          <h5 className="text-[12px] font-semibold text-foreground">{opp.title}</h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{opp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              {aiResult.next_steps && aiResult.next_steps.length > 0 && (
                <div className="bg-card border border-accent/20 rounded-lg p-5">
                  <h4 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                    <ArrowRight size={14} className="text-accent" />Prochaines étapes
                  </h4>
                  <ol className="space-y-2">
                    {aiResult.next_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-[12.5px]">
                        <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {!isLoading && !aiResult && !streamText && (
            <div className="bg-card border border-border rounded-lg p-10 flex items-center justify-center">
              <div className="text-center">
                <Brain size={48} className="mx-auto text-muted-foreground/15 mb-4" />
                <h4 className="text-[14px] font-semibold text-muted-foreground mb-1">Analyse IA intelligente</h4>
                <p className="text-[12px] text-muted-foreground max-w-md">
                  Soumettez un projet avec un pays cible et une description pour obtenir une analyse complète : 
                  matching sémantique avec les données existantes, recommandations stratégiques, risques et opportunités.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <DealDetailDialog item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

const TAB_CONFIG = [
  { id: 'accords', label: 'Accords', icon: FileText, data: AGREEMENTS, title: 'Accords Économiques', desc: 'Accords signés entre pays africains et partenaires internationaux' },
  { id: 'programmes', label: 'Programmes', icon: ScrollText, data: PROGRAMS, title: 'Programmes Économiques', desc: 'Programmes et stratégies de développement' },
  { id: 'projets', label: 'Projets', icon: Briefcase, data: PROJECTS, title: 'Projets Structurants', desc: 'Projets en cours ou planifiés dans les pays cibles' },
  { id: 'financeurs', label: 'Financeurs', icon: Building2, data: FUNDERS, title: 'Financeurs & Investisseurs', desc: 'Banques, fonds et agences actifs' },
  { id: 'appels', label: 'Appels d\'offres', icon: Globe, data: TENDERS, title: 'Appels d\'Offres', desc: 'Marchés publics et appels à projets' },
  { id: 'parties', label: 'Parties prenantes', icon: Users2, data: STAKEHOLDERS, title: 'Parties Prenantes', desc: 'Gouvernements, agences et organisations' },
];

export default function AfriDataHubTab() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="accords" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          {TAB_CONFIG.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-[12px] px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <tab.icon size={13} />{tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="analyse-ia" className="flex items-center gap-1.5 text-[12px] px-3 py-2 data-[state=active]:bg-accent data-[state=active]:text-white">
            <Sparkles size={13} />Analyse IA
          </TabsTrigger>
        </TabsList>
        {TAB_CONFIG.map(tab => (
          <TabsContent key={tab.id} value={tab.id}>
            <SectionView items={tab.data} title={tab.title} description={tab.desc} />
          </TabsContent>
        ))}
        <TabsContent value="analyse-ia">
          <AnalyseIA />
        </TabsContent>
      </Tabs>
    </div>
  );
}
