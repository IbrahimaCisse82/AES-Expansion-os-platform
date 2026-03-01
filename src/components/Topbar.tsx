import { Search, Bell, Plus, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  'country-detail': 'Fiche Pays',
};

// Pages that support the "+ Ajouter" action
const ADDABLE_PAGES = ['tasks', 'risks', 'budget', 'comments', 'countries', 'roadmap'];

interface TopbarProps {
  activePage: string;
  onAdd?: () => void;
}

export default function Topbar({ activePage, onAdd }: TopbarProps) {
  const { signOut, user } = useAuth();
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() || 'U');

  const showAdd = ADDABLE_PAGES.includes(activePage) && !!onAdd;

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-8 h-[62px] flex items-center gap-3">
      <h1 className="font-display text-lg font-semibold text-primary flex-1">
        {pageNames[activePage] || activePage}
      </h1>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher…"
          className="pl-8 pr-3 py-2 border-[1.5px] border-border rounded-lg text-[13px] w-[200px] bg-card outline-none focus:border-sage focus:w-[240px] transition-all font-sans"
        />
      </div>

      {showAdd && (
        <button
          onClick={onAdd}
          className="h-[34px] px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg flex items-center gap-1.5 hover:bg-navy-mid transition-all hover:-translate-y-px hover:shadow-card-hover"
        >
          <Plus size={14} />
          Ajouter
        </button>
      )}

      <button className="relative w-[34px] h-[34px] border border-border rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:bg-ivory transition-colors">
        <Bell size={16} />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-terracotta rounded-full border-[1.5px] border-card" />
      </button>

      <div className="w-[34px] h-[34px] rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer">
        {initials}
      </div>

      <button
        onClick={signOut}
        className="w-[34px] h-[34px] border border-border rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:bg-terracotta-light hover:text-terracotta hover:border-terracotta transition-colors"
        title="Se déconnecter"
      >
        <LogOut size={14} />
      </button>
    </header>
  );
}
