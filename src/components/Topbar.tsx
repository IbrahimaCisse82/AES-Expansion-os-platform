import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useExpansionData';
import { useTheme } from '@/hooks/useTheme';

const pageNames: Record<string, string> = {
  dashboard: 'Tableau de bord',
  roadmap: 'Feuille de route',
  countries: 'Pays Cibles',
  tasks: 'Tâches',
  calendar: 'Calendrier',
  kpis: 'KPIs Post-Lancement',
  budget: 'Budget & Finances',
  risks: 'Registre des Risques',
  comments: 'Commentaires',
  history: 'Historique',
  team: 'Équipe',
  profile: 'Mon profil',
  settings: 'Paramètres',
  'country-detail': 'Fiche Pays',
  bi: 'Business Intelligence',
};

const ADDABLE_PAGES = ['tasks', 'risks', 'budget', 'comments', 'countries', 'roadmap'];

interface TopbarProps {
  activePage: string;
  onAdd?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onMenuToggle?: () => void;
}

export default function Topbar({ activePage, onAdd, searchQuery, onSearchChange, onMenuToggle }: TopbarProps) {
  const { signOut, user } = useAuth();
  const { data: activity = [] } = useActivityLog();
  const { isDark, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() || 'U');

  const showAdd = ADDABLE_PAGES.includes(activePage) && !!onAdd;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 lg:px-8 h-[62px] flex items-center gap-3">
      {/* Mobile menu button */}
      <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors -ml-1">
        <Menu size={20} className="text-primary" />
      </button>

      <h1 className="font-display text-base lg:text-lg font-semibold text-primary flex-1 truncate">
        {pageNames[activePage] || activePage}
      </h1>

      <div className="relative hidden sm:block">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          className="pl-8 pr-3 py-2 border-[1.5px] border-border rounded-lg text-[13px] w-[160px] lg:w-[200px] bg-card outline-none focus:border-accent focus:w-[200px] lg:focus:w-[240px] transition-all font-sans"
        />
      </div>

      {showAdd && (
        <button
          onClick={onAdd}
          className="h-[34px] px-3 lg:px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-all hover:-translate-y-px hover:shadow-card-hover"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      )}

      {/* Notifications bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(prev => !prev)}
          className="relative w-[34px] h-[34px] border border-border rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <Bell size={16} />
          {activity.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full border-[1.5px] border-card" />
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-[42px] w-[300px] sm:w-[340px] bg-card border border-border rounded-lg shadow-elevated z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[13px] font-semibold text-primary">Activité récente</h3>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {activity.length === 0 && (
                <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">Aucune activité</div>
              )}
              {activity.slice(0, 10).map(item => (
                <div key={item.id} className="px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                  <div className="text-[12px] leading-relaxed">
                    <span className="font-medium text-primary">{item.user_name}</span>{' '}
                    <span className="text-muted-foreground">{item.action}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-[34px] h-[34px] rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer">
        {initials}
      </div>

      <button
        onClick={toggleTheme}
        className="w-[34px] h-[34px] border border-border rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        title={isDark ? 'Mode clair' : 'Mode sombre'}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <button
        onClick={signOut}
        className="w-[34px] h-[34px] border border-border rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors"
        title="Se déconnecter"
      >
        <LogOut size={14} />
      </button>
    </header>
  );
}
