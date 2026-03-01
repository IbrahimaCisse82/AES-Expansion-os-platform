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

const Index = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  // Counter that increments to signal "open create dialog" to child pages
  const [addSignal, setAddSignal] = useState(0);

  const currentPage = selectedCountry ? 'country-detail' : activePage;

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setSelectedCountry(null);
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
      case 'countries': return <CountriesPage onSelectCountry={setSelectedCountry} />;
      case 'tasks': return <TasksPage addSignal={addSignal} />;
      case 'budget': return <BudgetPage addSignal={addSignal} />;
      case 'risks': return <RisksPage addSignal={addSignal} />;
      case 'history': return <HistoryPage />;
      case 'team': return <TeamPage />;
      case 'comments': return <CommentsPage addSignal={addSignal} />;
      case 'kpis': return <KpisPage />;
      case 'calendar': return <CalendarPage />;
      case 'roadmap': return <RoadmapPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar activePage={selectedCountry ? 'countries' : activePage} onNavigate={handleNavigate} />
      <main className="ml-[248px] flex-1 flex flex-col min-h-screen">
        <Topbar activePage={currentPage} onAdd={handleAdd} />
        <div className="p-8 flex-1">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default Index;
