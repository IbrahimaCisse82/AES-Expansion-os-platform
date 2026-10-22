import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { envById } from '@/lib/environments';
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

export default function TechnicoCommercialPage() {
  const { engine, isLoading, error } = useTcEngine();
  const period = useMemo(() => (engine ? analysisPeriod(engine) : null), [engine]);
  const { pathname } = useLocation();
  const title = envById('tc').nav.flatMap(g => g.items).find(i => pathname.startsWith(i.path))?.label ?? 'Technico-commercial';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Technico-commercial — remplace le classeur « Tableau de bord technico-commercial ».</p>
      </div>

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
