import { useState, useCallback } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import Topbar from '@/components/Topbar';
import DashboardPage from '@/pages/DashboardPage';
import CountriesPage from '@/pages/CountriesPage';
import CountryDetailPage from '@/pages/CountryDetailPage';
import TasksPage from '@/pages/TasksPage';
import BudgetPage from '@/pages/BudgetPage';
import RisksPage from '@/pages/RisksPage';
import HistoryPage from '@/pages/HistoryPage';
import TeamPage from '@/pages/TeamPage';
import CommentsPage from '@/pages/CommentsPage';
import KpisPage from '@/pages/KpisPage';
import CalendarPage from '@/pages/CalendarPage';
import RoadmapPage from '@/pages/RoadmapPage';
import SettingsPage from '@/pages/SettingsPage';
import MarketAnalysisPage from '@/pages/MarketAnalysisPage';
import ProfilePage from '@/pages/ProfilePage';
import { useCountries } from '@/hooks/useExpansionData';

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
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/countries" element={<CountriesPage onSelectCountry={handleSelectCountry} addSignal={addSignal} />} />
            <Route path="/countries/:countryId" element={<CountryDetailPage onBack={handleBackFromCountry} />} />
            <Route path="/tasks" element={<TasksPage addSignal={addSignal} searchQuery={searchQuery} />} />
            <Route path="/budget" element={<BudgetPage addSignal={addSignal} searchQuery={searchQuery} />} />
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
        </div>
      </main>
    </div>
  );
};

export default Index;
