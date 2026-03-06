import { 
  LayoutDashboard, Map, Globe, ListTodo, Calendar, BarChart3, 
  Wallet, AlertTriangle, MessageSquare, Clock, Users, ChevronRight, Settings, User, X
} from 'lucide-react';
import { useCountries, useTasks, useRisks } from '@/hooks/useExpansionData';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: 'countries' | 'tasks' | 'risks';
  section?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={16} />, section: 'PILOTAGE' },
  { id: 'roadmap', label: 'Feuille de route', icon: <Map size={16} /> },
  { id: 'countries', label: 'Pays Cibles', icon: <Globe size={16} />, badgeKey: 'countries' },
  { id: 'tasks', label: 'Tâches', icon: <ListTodo size={16} />, badgeKey: 'tasks', section: 'OPÉRATIONS' },
  { id: 'calendar', label: 'Calendrier', icon: <Calendar size={16} /> },
  { id: 'kpis', label: 'KPIs', icon: <BarChart3 size={16} />, section: 'ANALYSE' },
  { id: 'budget', label: 'Budget', icon: <Wallet size={16} /> },
  { id: 'risks', label: 'Risques', icon: <AlertTriangle size={16} />, badgeKey: 'risks' },
  { id: 'comments', label: 'Commentaires', icon: <MessageSquare size={16} />, section: 'ÉQUIPE' },
  { id: 'history', label: 'Historique', icon: <Clock size={16} /> },
  { id: 'team', label: 'Équipe', icon: <Users size={16} /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={16} />, section: 'SYSTÈME' },
  { id: 'profile', label: 'Mon profil', icon: <User size={16} /> },
];

interface AppSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  globalProgress?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AppSidebar({ activePage, onNavigate, globalProgress = 0, mobileOpen, onMobileClose }: AppSidebarProps) {
  let currentSection = '';
  const { data: countries = [] } = useCountries();
  const { data: tasks = [] } = useTasks();
  const { data: risks = [] } = useRisks();

  const badgeCounts: Record<string, number> = {
    countries: countries.length,
    tasks: tasks.filter((t: any) => t.status === 'open' || t.status === 'late').length,
    risks: risks.filter((r: any) => r.level === 'high').length,
  };

  const handleNav = (id: string) => {
    onNavigate(id);
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChevronRight size={16} className="text-primary-foreground" />
            </div>
            <span className="font-display text-[19px] font-bold text-primary">ExpansionOS</span>
          </div>
          <div className="text-[10.5px] text-muted-foreground tracking-wider uppercase">
            Plan d'Expansion International
          </div>
        </div>
        {/* Mobile close button */}
        <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-muted transition-colors">
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {navItems.map((item) => {
          const showSection = item.section && item.section !== currentSection;
          if (item.section) currentSection = item.section;

          return (
            <div key={item.id}>
              {showSection && (
                <div className="text-[9.5px] font-bold tracking-[1.4px] uppercase text-muted-foreground px-3 pt-3 pb-1">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 mb-0.5
                  ${activePage === item.id 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-ivory hover:text-foreground'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                  <span className={`ml-auto text-[9.5px] font-bold px-1.5 rounded-full
                    ${activePage === item.id 
                      ? 'bg-white/25 text-primary-foreground' 
                      : 'bg-destructive text-white'
                    }`}>
                    {badgeCounts[item.badgeKey]}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer progress */}
      <div className="px-3 py-3.5 border-t border-border">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Progression globale</span>
          <strong className="text-foreground">{globalProgress}%</strong>
        </div>
        <div className="h-[5px] bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-700"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[248px] bg-card border-r border-border flex-col z-50">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border flex flex-col z-10 animate-page-enter">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
