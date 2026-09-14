import { useState, useCallback, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import Topbar from '@/components/Topbar';
import { useCountries } from '@/hooks/useExpansionData';
import { useCurrentUserRole } from '@/hooks/useUserRoles';

function RequireRole({ deny, children }: { deny: string[]; children: ReactNode }) {
  const { data: role, isLoading } = useCurrentUserRole();
  if (isLoading) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  if (deny.includes(role ?? 'observer')) return <Navigate to="/app/dashboard" replace />;
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

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [addSignal, setAddSignal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: countries = [] } = useCountries();

  const getActivePage = () => {
    const path = location.pathname.replace(/^\/app\/?/, '').split('/')[0] || 'dashboard';
    return path;
  };

  const activePage = getActivePage();
  const avgPct = countries.length ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0;

  const handleNavigate = (page: string) => {
    navigate(`/app/${page}`);
    setSearchQuery('');
  };

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
        activePage={activePage === 'countries' || activePage.startsWith('countries/') ? 'countries' : activePage}
        onNavigate={handleNavigate}
        globalProgress={avgPct}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <main className="lg:ml-[248px] flex-1 flex flex-col min-h-screen">
        <Topbar
          activePage={activePage}
          onAdd={handleAdd}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setMobileMenuOpen(prev => !prev)}
        />
        <div className="p-4 lg:p-8 flex-1">
          <Suspense fallback={<div className="text-muted-foreground text-sm">Chargement…</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/countries" element={<CountriesPage onSelectCountry={handleSelectCountry} addSignal={addSignal} />} />
            <Route path="/countries/:countryId" element={<CountryDetailPage onBack={handleBackFromCountry} />} />
            <Route path="/tasks" element={<TasksPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/budget" element={<BudgetPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/bi" element={<RequireRole deny={['partner', 'observer']}><BiPage /></RequireRole>} />
            <Route path="/risks" element={<RisksPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/history" element={<HistoryPage searchQuery={searchQuery} />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/comments" element={<CommentsPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/kpis" element={<KpisPage />} />
            <Route path="/market-analysis" element={<MarketAnalysisPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/roadmap" element={<RoadmapPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Index;
