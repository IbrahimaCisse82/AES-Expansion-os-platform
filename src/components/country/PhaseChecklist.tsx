import { usePhaseChecklist, useInitPhaseChecklist, useToggleChecklistItem } from '@/hooks/usePhaseChecklist';
import { Button } from '@/components/ui/button';
import { ListChecks } from 'lucide-react';

const phaseLabels = ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];

interface Props {
  countryId: string;
  phase: number;
  canWrite: boolean;
}

export default function PhaseChecklist({ countryId, phase, canWrite }: Props) {
  const { data: items = [], isLoading } = usePhaseChecklist(countryId, phase);
  const initChecklist = useInitPhaseChecklist();
  const toggleItem = useToggleChecklistItem();

  const checkedCount = items.filter(i => i.is_checked).length;
  const pct = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

  if (isLoading) return null;

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-3">Checklist — {phaseLabels[phase]}</h3>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Aucune checklist pour cette phase</p>
          {canWrite && (
            <Button size="sm" variant="outline" className="gap-1.5 text-[12px]" onClick={() => initChecklist.mutate({ countryId, phase })} disabled={initChecklist.isPending}>
              <ListChecks className="w-3.5 h-3.5" /> Initialiser la checklist
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[15.5px] font-semibold text-primary">Checklist — {phaseLabels[phase]}</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">{checkedCount}/{items.length} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => canWrite && toggleItem.mutate({ id: item.id, is_checked: !item.is_checked, countryId, phase })}
            className={`flex items-center gap-3 py-2 px-2 rounded-md transition-colors ${canWrite ? 'cursor-pointer hover:bg-muted' : ''}`}
          >
            <div className={`w-[18px] h-[18px] border-2 rounded flex-shrink-0 flex items-center justify-center transition-colors ${item.is_checked ? 'bg-accent border-accent' : 'border-border'}`}>
              {item.is_checked && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent-foreground" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
            </div>
            <span className={`text-[13px] ${item.is_checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
