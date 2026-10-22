import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, MessageSquare, Settings, User, Users, X } from 'lucide-react';
import { useCountries, useTasks, useRisks } from '@/hooks/useExpansionData';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { canAccessBi } from '@/lib/biAccess';
import { envById, writeLastEnv, type EnvId, type Environment } from '@/lib/environments';
import { useMyEnvironments } from '@/hooks/useEnvironments';
import { useMyNotifications } from '@/hooks/useMyNotifications';
import { envForLink } from '@/lib/environments';

interface AppSidebarProps {
  env: EnvId;
  globalProgress?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const COMMON = [
  { path: '/app/comments', label: 'Discussions', icon: MessageSquare },
  { path: '/app/team', label: 'Équipe', icon: Users },
  { path: '/app/settings', label: 'Paramètres', icon: Settings },
  { path: '/app/profile', label: 'Mon profil', icon: User },
];

function EnvSwitcher({ envs, current, onPick, unread }: { envs: Environment[]; current: EnvId; onPick: (e: Environment) => void; unread: Record<string, number> }) {
  if (envs.length <= 1) return null;
  return (
    <div className="px-2.5 pt-3">
      <div className="text-[9.5px] font-bold tracking-[1.4px] uppercase text-muted-foreground px-1 pb-1.5">Environnement</div>
      <div role="tablist" aria-label="Environnement" className="grid grid-cols-2 gap-1.5">
        {envs.map(e => {
          const active = e.id === current;
          const Icon = e.icon;
          return (
            <button key={e.id} role="tab" aria-selected={active} title={e.description} onClick={() => onPick(e)}
              className={`relative flex items-center gap-1.5 rounded-lg border px-2 py-2 text-[11.5px] font-medium text-left transition-colors
                ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'}`}>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${e.accent}`} />
              <Icon size={13} className="shrink-0" />
              <span className="leading-tight">{e.short}</span>
              {unread[e.id] > 0 && !active && (
                <span aria-label={`${unread[e.id]} notification(s) non lue(s)`} className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center border-[1.5px] border-card">{unread[e.id] > 9 ? '9+' : unread[e.id]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AppSidebar({ env, globalProgress = 0, mobileOpen, onMobileClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: myRole } = useCurrentUserRole();
  const { envs } = useMyEnvironments();
  const { data: notifs = [] } = useMyNotifications();
  const unread: Record<string, number> = {};
  for (const n of notifs) if (!n.is_read) { const k = envForLink(n.link) ?? 'common'; unread[k] = (unread[k] ?? 0) + 1; }
  const current = envById(env);
  // Les données Expansion ne sont chargées que dans l'environnement Expansion
  const inExpansion = env === 'expansion';
  const { data: countries = [] } = useCountries({ enabled: inExpansion });
  const { data: tasks = [] } = useTasks({ enabled: inExpansion });
  const { data: risks = [] } = useRisks({ enabled: inExpansion });
  const badgeCounts: Record<string, number> = {
    countries: countries.length,
    tasks: tasks.filter((t) => t.status === 'open' || t.status === 'late').length,
    risks: risks.filter((r) => r.level === 'high').length,
  };

  const pick = (e: Environment) => {
    writeLastEnv(e.id);
    navigate(e.home);
    onMobileClose?.();
  };
  const linkCls = (active: boolean) => `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 mb-0.5
    ${active ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;
  const isActive = (path: string, end?: boolean) => end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const sidebarContent = (
    <>
      <div className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChevronRight size={16} className="text-primary-foreground" />
            </div>
            <span className="font-display text-[19px] font-bold text-primary">ExpansionOS</span>
          </div>
          <div className="text-[10.5px] text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${current.accent}`} />{current.label}
          </div>
        </div>
        <button onClick={onMobileClose} aria-label="Fermer le menu" className="lg:hidden p-1 rounded-lg hover:bg-muted transition-colors">
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>

      <EnvSwitcher envs={envs} current={env} onPick={pick} unread={unread} />

      <nav aria-label={current.label} className="flex-1 overflow-y-auto px-2.5 py-2">
        {current.nav.map(group => {
          const items = group.items.filter(i => !i.requiresBiAccess || canAccessBi(myRole));
          if (!items.length) return null;
          return (
            <div key={group.label}>
              <div className="text-[9.5px] font-bold tracking-[1.4px] uppercase text-muted-foreground px-3 pt-3 pb-1">{group.label}</div>
              {items.map(item => {
                const active = isActive(item.path, item.end);
                const Icon = item.icon;
                const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <NavLink key={item.path} to={item.path} end={item.end} onClick={() => onMobileClose?.()} className={linkCls(active)}>
                    <Icon size={16} />
                    <span className="truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className={`ml-auto text-[9.5px] font-bold px-1.5 rounded-full ${active ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>{badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}

        <div className="text-[9.5px] font-bold tracking-[1.4px] uppercase text-muted-foreground px-3 pt-4 pb-1">Commun</div>
        {COMMON.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} onClick={() => onMobileClose?.()} className={linkCls(isActive(item.path))}>
              <Icon size={16} /><span>{item.label}</span>
              {item.path === '/app/comments' && unread.common > 0 && <span className="ml-auto text-[9.5px] font-bold px-1.5 rounded-full bg-destructive text-destructive-foreground">{unread.common}</span>}
            </NavLink>
          );
        })}
      </nav>

      {inExpansion && (
        <div className="px-3 py-3.5 border-t border-border">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Progression globale</span>
            <strong className="text-foreground">{globalProgress}%</strong>
          </div>
          <div className="h-[5px] bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-700" style={{ width: `${globalProgress}%` }} />
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[248px] bg-card border-r border-border flex-col z-50">
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/40" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border flex flex-col z-10 animate-page-enter">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
