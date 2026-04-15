import { useState, useMemo } from 'react';
import { Search, Globe, FileText, Building2, Briefcase, Users2, ScrollText, Sparkles, Calendar, MapPin, DollarSign, ExternalLink, ChevronRight, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AGREEMENTS, PROGRAMS, PROJECTS, FUNDERS, TENDERS, STAKEHOLDERS, TARGET_COUNTRIES, type DealItem } from '@/data/marketIntelData';
import { useCountries } from '@/hooks/useExpansionData';

const STATUS_COLORS: Record<string, string> = {
  'Actif': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'En cours': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Terminé': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Planifié': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Ouvert': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Attribué': 'bg-muted text-muted-foreground',
  'En évaluation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
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
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4">
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

function AnalyseIA() {
  const { data: countries = [] } = useCountries();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [description, setDescription] = useState('');
  const [results, setResults] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<DealItem | null>(null);

  const handleAnalyze = () => {
    const country = countries.find(c => c.name === selectedCountry);
    const countryName = country?.name || selectedCountry || 'Afrique de l\'Ouest';
    const matchingAccords = AGREEMENTS.filter(a => a.countries.includes(countryName));
    const matchingProgs = PROGRAMS.filter(p => p.countries.includes(countryName));
    const matchingProjects = PROJECTS.filter(p => p.countries.includes(countryName));
    const matchingFunders = FUNDERS.filter(f => f.countries.includes(countryName));
    const matchingTenders = TENDERS.filter(t => t.countries.includes(countryName));
    const matchingStakeholders = STAKEHOLDERS.filter(s => s.countries.includes(countryName));

    setResults({
      country: countryName,
      accords: matchingAccords, programmes: matchingProgs, projets: matchingProjects,
      financeurs: matchingFunders, appels: matchingTenders, parties: matchingStakeholders,
      total: matchingAccords.length + matchingProgs.length + matchingProjects.length + matchingFunders.length + matchingTenders.length + matchingStakeholders.length,
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">Analyse IA</h3>
        <p className="text-[12.5px] text-muted-foreground">Soumettez un projet pour découvrir les accords, programmes, financeurs et appels d'offres compatibles</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Sparkles size={16} className="text-accent" />Soumettre un projet
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Sélectionner un pays cible</label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="-- Choisir un pays --" /></SelectTrigger>
              <SelectContent>
                {TARGET_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Ou décrivez votre projet</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez le projet, son secteur, son pays, ses objectifs..." className="w-full p-3 border border-border rounded-lg text-[13px] bg-background resize-none h-28 focus:outline-none focus:border-accent" />
          </div>
          <button onClick={handleAnalyze} disabled={!selectedCountry && !description} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50">
            <Sparkles size={14} />Lancer l'analyse
          </button>
        </div>
        {results ? (
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-bold text-primary">Résultats pour {results.country}</h4>
              <span className="text-[12px] text-muted-foreground">{results.total} correspondance{results.total > 1 ? 's' : ''}</span>
            </div>
            {[
              { label: 'Accords', items: results.accords, icon: '📄' },
              { label: 'Programmes', items: results.programmes, icon: '📋' },
              { label: 'Projets', items: results.projets, icon: '🏗️' },
              { label: 'Financeurs', items: results.financeurs, icon: '🏦' },
              { label: 'Appels d\'offres', items: results.appels, icon: '📢' },
              { label: 'Parties prenantes', items: results.parties, icon: '🤝' },
            ].map(cat => (
              <div key={cat.label}>
                <div className="text-[12px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <span>{cat.icon}</span> {cat.label} ({cat.items.length})
                </div>
                {cat.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {cat.items.map((item: DealItem) => (
                      <div key={item.id} onClick={() => setSelectedItem(item)}
                        className="flex items-center gap-2 text-[12px] py-1.5 px-3 rounded-lg bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted hover:border-accent/30 transition-colors">
                        <span className="font-medium text-foreground flex-1">{item.title}</span>
                        {item.amount && <span className="text-accent text-[10.5px] font-semibold">{item.amount}</span>}
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground'}`}>{item.status}</span>
                        <ChevronRight size={12} className="text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Aucun résultat dans cette catégorie</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 flex items-center justify-center">
            <div className="text-center">
              <Sparkles size={40} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Les résultats de l'analyse apparaîtront ici</p>
            </div>
          </div>
        )}
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
