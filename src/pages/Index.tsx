import { useState, useCallback, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import Topbar from '@/components/Topbar';
import { useCountries } from '@/hooks/useExpansionData';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { canAccessBi } from '@/lib/biAccess';
import { allowedEnvs, defaultEnv, envForPath, readLastEnv, writeLastEnv, type EnvId } from '@/lib/environments';

function RequireBiAccess({ children }: { children: ReactNode }) {
  const { data: role, isPending } = useCurrentUserRole();
  if (isPending) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  if (!canAccessBi(role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** /app : arrivée dans l'environnement par défaut du rôle (ou le dernier utilisé). */
function EnvHome() {
  const { data: role, isPending } = useCurrentUserRole();
  if (isPending) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  const env = defaultEnv(role, readLastEnv());
  if (!env) return <p className="text-sm text-muted-foreground py-10 text-center">Aucun environnement n'est ouvert pour votre profil. Contactez l'administrateur.</p>;
  return <Navigate to={env.home} replace />;
}

/** Un environnement non autorisé pour le rôle renvoie vers l'environnement par défaut. */
function RequireEnv({ env, children }: { env: EnvId; children: ReactNode }) {
  const { data: role, isPending } = useCurrentUserRole();
  if (isPending) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  if (!allowedEnvs(role).some(e => e.id === env)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const CountriesPage = lazy(() => import('@/pages/CountriesPage'));
const CountryDetailPage = lazy(() => import('@/pages/CountryDetailPage'));
const TasksPage = lazy(() => import('@/pages/TasksPage'));
const BudgetPage = lazy(() => import('@/pages/BudgetPage'));
const BiPage = lazy(() => import('@/pages/BiPage'));
const RisksPage = lazy(() => import('@/pages/RisksPage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const CommentsPage = lazy(() => import('@/pages/CommentsPage'));
const KpisPage = lazy(() => import('@/pages/KpisPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const RoadmapPage = lazy(() => import('@/pages/RoadmapPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const MarketAnalysisPage = lazy(() => import('@/pages/MarketAnalysisPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const TechnicoCommercialPage = lazy(() => import('@/pages/TechnicoCommercialPage'));
const FinancePage = lazy(() => import('@/pages/FinancePage'));
const ReportingPage = lazy(() => import('@/pages/ReportingPage'));

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [addSignal, setAddSignal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: role } = useCurrentUserRole();
  const pathEnv = envForPath(location.pathname);
  const [env, setEnv] = useState<EnvId>(() => {
    const last = readLastEnv();
    return pathEnv ?? (last === 'expansion' || last === 'tc' || last === 'finance' || last === 'reporting' ? last : 'expansion');
  });
  useEffect(() => {
    if (pathEnv) { setEnv(pathEnv); writeLastEnv(pathEnv); }
    else if (role) { const d = defaultEnv(role, readLastEnv()); if (d && !allowedEnvs(role).some(e => e.id === env)) setEnv(d.id); }
  }, [pathEnv, role, env]);
  const { data: countries = [] } = useCountries({ enabled: env === 'expansion' });

  const getActivePage = () => {
    const path = location.pathname.replace(/^\/app\/?/, '').split('/')[0] || 'dashboard';
    return path;
  };

  const activePage = getActivePage();
  const avgPct = countries.length ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0;

  const handleAdd = useCallback(() => {
    setAddSignal(prev => prev + 1);
  }, []);

  const handleSelectCountry = (countryId: string) => {
    navigate(`/app/countries/${countryId}`);
  };

  const handleBackFromCountry = () => {
    navigate('/app/countries');
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        env={env}
        globalProgress={avgPct}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <main className="lg:ml-[248px] flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar
          activePage={activePage}
          onAdd={handleAdd}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setMobileMenuOpen(prev => !prev)}
        />
        <div className="p-4 lg:p-8 flex-1 min-w-0">
          <Suspense fallback={<div className="text-muted-foreground text-sm">Chargement…</div>}>
          <Routes>
            <Route path="/" element={<EnvHome />} />
            <Route path="/dashboard" element={<RequireEnv env="expansion"><DashboardPage /></RequireEnv>} />
            <Route path="/countries" element={<RequireEnv env="expansion"><CountriesPage onSelectCountry={handleSelectCountry} addSignal={addSignal} /></RequireEnv>} />
            <Route path="/countries/:countryId" element={<RequireEnv env="expansion"><CountryDetailPage onBack={handleBackFromCountry} /></RequireEnv>} />
            <Route path="/tasks" element={<RequireEnv env="expansion"><TasksPage addSignal={addSignal} searchQuery={searchQuery} /></RequireEnv>} />
            <Route path="/budget" element={<RequireEnv env="expansion"><BudgetPage addSignal={addSignal} searchQuery={searchQuery} /></RequireEnv>} />
            <Route path="/tc/*" element={<RequireEnv env="tc"><TechnicoCommercialPage /></RequireEnv>} />
            <Route path="/finance/*" element={<RequireEnv env="finance"><FinancePage /></RequireEnv>} />
            <Route path="/reporting/*" element={<RequireEnv env="reporting"><ReportingPage /></RequireEnv>} />
            <Route path="/bi" element={<RequireEnv env="expansion"><RequireBiAccess><BiPage /></RequireBiAccess></RequireEnv>} />
            <Route path="/risks" element={<RequireEnv env="expansion"><RisksPage addSignal={addSignal} searchQuery={searchQuery} /></RequireEnv>} />
            <Route path="/history" element={<RequireEnv env="expansion"><HistoryPage searchQuery={searchQuery} /></RequireEnv>} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/comments" element={<CommentsPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/kpis" element={<RequireEnv env="expansion"><KpisPage /></RequireEnv>} />
            <Route path="/market-analysis" element={<RequireEnv env="expansion"><MarketAnalysisPage /></RequireEnv>} />
            <Route path="/calendar" element={<RequireEnv env="expansion"><CalendarPage /></RequireEnv>} />
            <Route path="/roadmap" element={<RequireEnv env="expansion"><RoadmapPage addSignal={addSignal} searchQuery={searchQuery} /></RequireEnv>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Index;
