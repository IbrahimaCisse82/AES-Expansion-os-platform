import { useBudgetNotifications, useMarkNotificationRead } from '@/hooks/useBudgetExtras';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_STYLES: Record<string, string> = {
  submitted: 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]',
  approved: 'bg-accent/10 text-accent',
  locked: 'bg-destructive/10 text-destructive',
  draft: 'bg-muted text-muted-foreground',
};

export default function BudgetNotifications() {
  const { data: notifications = [] } = useBudgetNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 rounded-md hover:bg-muted transition-colors">
          <Bell size={16} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="px-3 py-2 border-b border-border">
          <h4 className="text-[12px] font-bold text-foreground">Notifications Budget</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-6">Aucune notification</p>
          )}
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${TYPE_STYLES[n.type] || TYPE_STYLES.draft}`}>
                      {n.type}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
