import { useState } from 'react';
import { 
  LayoutDashboard, Map, Globe, ListTodo, Calendar, BarChart3, 
  Wallet, AlertTriangle, MessageSquare, Clock, Users, ChevronRight
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={16} />, section: 'PILOTAGE' },
  { id: 'roadmap', label: 'Feuille de route', icon: <Map size={16} /> },
  { id: 'countries', label: 'Pays Cibles', icon: <Globe size={16} />, badge: 6 },
  { id: 'tasks', label: 'Tâches', icon: <ListTodo size={16} />, badge: 3, section: 'OPÉRATIONS' },
  { id: 'calendar', label: 'Calendrier', icon: <Calendar size={16} /> },
  { id: 'kpis', label: 'KPIs', icon: <BarChart3 size={16} />, section: 'ANALYSE' },
  { id: 'budget', label: 'Budget', icon: <Wallet size={16} /> },
  { id: 'risks', label: 'Risques', icon: <AlertTriangle size={16} />, badge: 2 },
  { id: 'comments', label: 'Commentaires', icon: <MessageSquare size={16} />, section: 'ÉQUIPE' },
  { id: 'history', label: 'Historique', icon: <Clock size={16} /> },
  { id: 'team', label: 'Équipe', icon: <Users size={16} /> },
];

interface AppSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  let currentSection = '';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[248px] bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-border">
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
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 mb-0.5
                  ${activePage === item.id 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-ivory hover:text-foreground'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`ml-auto text-[9.5px] font-bold px-1.5 rounded-full
                    ${activePage === item.id 
                      ? 'bg-white/25 text-primary-foreground' 
                      : 'bg-terracotta text-white'
                    }`}>
                    {item.badge}
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
          <strong className="text-sage-dark">52%</strong>
        </div>
        <div className="h-[5px] bg-ivory rounded-full overflow-hidden">
          <div className="h-full w-[52%] bg-gradient-to-r from-sage to-sage-dark rounded-full transition-all duration-700" />
        </div>
      </div>
    </aside>
  );
}
