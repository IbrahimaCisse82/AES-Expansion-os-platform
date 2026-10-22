import { lazy, Suspense, useMemo } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useTcEngine } from '@/hooks/useTc';
import { analysisPeriod } from '@/components/tc/tcPeriod';

const TcDashboard = lazy(() => import('@/components/tc/TcDashboard'));
const TcSalesJournal = lazy(() => import('@/components/tc/TcSalesJournal'));
const TcObjectives = lazy(() => import('@/components/tc/TcObjectives'));
const TcKits = lazy(() => import('@/components/tc/TcKits'));
const Commercial = lazy(() => import('@/components/tc/TcCommercial').then(m => ({ default: m.TcPerformance })));
const Margins = lazy(() => import('@/components/tc/TcCommercial').then(m => ({ default: m.TcMargins })));
const Commissions = lazy(() => import('@/components/tc/TcCommercial').then(m => ({ default: m.TcCommissions })));
const Analyses = lazy(() => import('@/components/tc/TcCommercial').then(m => ({ default: m.TcAnalyses })));
const Synthesis = lazy(() => import('@/components/tc/TcKits').then(m => ({ default: m.TcSynthesis })));
const Stock = lazy(() => import('@/components/tc/TcStock').then(m => ({ default: m.TcStockView })));
const Purchases = lazy(() => import('@/components/tc/TcStock').then(m => ({ default: m.TcPurchases })));
const Dormant = lazy(() => import('@/components/tc/TcStock').then(m => ({ default: m.TcDormant })));
const Capacity = lazy(() => import('@/components/tc/TcStock').then(m => ({ default: m.TcCapacity })));
const Referentials = lazy(() => import('@/components/tc/TcReferentials').then(m => ({ default: m.TcReferentials })));
const Raci = lazy(() => import('@/components/tc/TcReferentials').then(m => ({ default: m.TcRaci })));

/** Organisation du classeur : pilotage · saisie commerciale · kits · stock & achats · référentiels. */
export const TC_NAV: { group: string; items: { path: string; label: string }[] }[] = [
  { group: 'Pilotage', items: [
    { path: 'dg', label: 'Tableau DG' },
    { path: 'performance', label: 'Performance équipes' },
    { path: 'marges', label: 'Marges & encaissements' },
    { path: 'commissions', label: 'Commissions & prévisions' },
    { path: 'analyses', label: 'Analyses mensuelles' },
  ] },
  { group: 'Saisie commerciale', items: [
    { path: 'ventes', label: 'Journal des ventes' },
    { path: 'objectifs', label: 'Objectifs' },
  ] },
  { group: 'Kits', items: [
    { path: 'kits', label: 'Modélisation des kits' },
    { path: 'synthese', label: 'Synthèse des kits' },
  ] },
  { group: 'Stock & achats', items: [
    { path: 'stock', label: 'Stock' },
    { path: 'achats', label: 'Besoins & achats' },
    { path: 'dormant', label: 'Stock dormant' },
    { path: 'capacite', label: 'Capacité' },
  ] },
  { group: 'Référentiels', items: [
    { path: 'referentiels', label: 'Paramètres & référentiels' },
    { path: 'raci', label: 'Matrice RACI' },
  ] },
];

export default function TechnicoCommercialPage() {
  const { engine, isLoading, error } = useTcEngine();
  const period = useMemo(() => (engine ? analysisPeriod(engine) : null), [engine]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Technico-commercial</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Kits, devis, ventes, encaissements, stock et achats — remplace le classeur « Tableau de bord technico-commercial ».
        </p>
      </div>

      <nav aria-label="Technico-commercial" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-3">
        {TC_NAV.map(g => (
          <div key={g.group} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</span>
            <div className="flex flex-wrap gap-1">
              {g.items.map(i => (
                <NavLink key={i.path} to={i.path}
                  className={({ isActive }) => `text-xs px-2.5 py-1 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
                  {i.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {error ? (
        <p className="text-sm text-destructive py-10 text-center">Impossible de charger les données : {(error as Error).message}</p>
      ) : isLoading || !engine || !period ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Chargement des données technico-commerciales…</p>
      ) : (
        <Suspense fallback={<p className="text-sm text-muted-foreground py-10 text-center">Chargement…</p>}>
          <Routes>
            <Route index element={<Navigate to="dg" replace />} />
            <Route path="dg" element={<TcDashboard engine={engine} {...period} />} />
            <Route path="performance" element={<Commercial engine={engine} {...period} />} />
            <Route path="marges" element={<Margins engine={engine} />} />
            <Route path="commissions" element={<Commissions engine={engine} months={period.months} defaultMonth={period.defaultMonth} />} />
            <Route path="analyses" element={<Analyses engine={engine} months={period.months} />} />
            <Route path="ventes" element={<TcSalesJournal engine={engine} />} />
            <Route path="objectifs" element={<TcObjectives engine={engine} months={period.months} />} />
            <Route path="kits" element={<TcKits engine={engine} />} />
            <Route path="synthese" element={<Synthesis engine={engine} />} />
            <Route path="stock" element={<Stock engine={engine} />} />
            <Route path="achats" element={<Purchases engine={engine} />} />
            <Route path="dormant" element={<Dormant engine={engine} />} />
            <Route path="capacite" element={<Capacity engine={engine} months={period.months} />} />
            <Route path="referentiels" element={<Referentials engine={engine} />} />
            <Route path="raci" element={<Raci />} />
            <Route path="*" element={<Navigate to="dg" replace />} />
          </Routes>
        </Suspense>
      )}
    </div>
  );
}
