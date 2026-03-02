import { useState, useCallback } from 'react';
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
import { useCountries } from '@/hooks/useExpansionData';

const Index = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [addSignal, setAddSignal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: countries = [] } = useCountries();

  const currentPage = selectedCountry ? 'country-detail' : activePage;

  // Compute global progress
  const avgPct = countries.length ? Math.round(countries.reduce((s, c) => s + c.pct, 0) / countries.length) : 0;

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setSelectedCountry(null);
    setSearchQuery('');
  };

  const handleAdd = useCallback(() => {
    setAddSignal(prev => prev + 1);
  }, []);

  const renderPage = () => {
    if (selectedCountry) {
      return <CountryDetailPage countryId={selectedCountry} onBack={() => setSelectedCountry(null)} />;
    }
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'countries': return <CountriesPage onSelectCountry={setSelectedCountry} addSignal={addSignal} />;
      case 'tasks': return <TasksPage addSignal={addSignal} searchQuery={searchQuery} />;
      case 'budget': return <BudgetPage addSignal={addSignal} searchQuery={searchQuery} />;
      case 'risks': return <RisksPage addSignal={addSignal} searchQuery={searchQuery} />;
      case 'history': return <HistoryPage searchQuery={searchQuery} />;
      case 'team': return <TeamPage />;
      case 'comments': return <CommentsPage addSignal={addSignal} searchQuery={searchQuery} />;
      case 'kpis': return <KpisPage />;
      case 'calendar': return <CalendarPage />;
      case 'roadmap': return <RoadmapPage addSignal={addSignal} searchQuery={searchQuery} />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar activePage={selectedCountry ? 'countries' : activePage} onNavigate={handleNavigate} globalProgress={avgPct} />
      <main className="ml-[248px] flex-1 flex flex-col min-h-screen">
        <Topbar activePage={currentPage} onAdd={handleAdd} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="p-8 flex-1">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default Index;
