import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Send, CheckCircle2, XCircle, Lock, ClipboardCheck, ArrowRight, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BudgetScenario } from '@/hooks/useBudgetData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';

type ScenarioFull = BudgetScenario & {
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
};

interface Profile { user_id: string; full_name: string; initials: string }

interface WorkflowDashboardProps {
  profiles: Profile[];
  onOpenScenario: (id: string, fiscalYear: number) => void;
}

const STATUS_META: Record<string, { label: string; icon: typeof Clock; tone: string; bg: string }> = {
  draft: { label: 'Brouillon', icon: Clock, tone: 'text-muted-foreground', bg: 'bg-muted' },
  submitted: { label: 'En attente', icon: Send, tone: 'text-[hsl(var(--gold))]', bg: 'bg-[hsl(var(--gold))]/10' },
  approved: { label: 'Approuvé', icon: CheckCircle2, tone: 'text-accent', bg: 'bg-accent/10' },
  rejected: { label: 'Rejeté', icon: XCircle, tone: 'text-destructive', bg: 'bg-destructive/10' },
  locked: { label: 'Verrouillé', icon: Lock, tone: 'text-primary', bg: 'bg-primary/10' },
};

const STATUS_ORDER = ['draft', 'submitted', 'approved', 'rejected', 'locked'] as const;

export default function WorkflowDashboard({ profiles, onOpenScenario }: WorkflowDashboardProps) {
  const { toast } = useToast();
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['budget_scenarios_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_scenarios')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ScenarioFull[];
    },
  });

  const profileName = (id?: string | null) => profiles.find(p => p.user_id === id)?.full_name || '—';

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = scenarios.filter(x => x.status === s).length;
    return acc;
  }, {});

  const pending = scenarios.filter(s => s.status === 'submitted');
  const rejected = scenarios.filter(s => s.status === 'rejected');
  const recent = scenarios.slice(0, 8);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });

    doc.setFontSize(16);
    doc.setTextColor(28, 43, 58);
    doc.text('Tableau de bord Workflow Budget', 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`ExpansionOS — Édition du ${today}`, 40, 68);
    doc.text(`Total scénarios : ${scenarios.length}`, 40, 82);

    // Summary counters
    autoTable(doc, {
      startY: 100,
      head: [['Statut', 'Nombre']],
      body: STATUS_ORDER.map(s => [STATUS_META[s].label, String(counts[s] || 0)]),
      headStyles: { fillColor: [28, 43, 58] },
      styles: { fontSize: 10 },
    });

    // Pending
    type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };
    let cursorY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? 100) + 24;
    doc.setFontSize(12);
    doc.setTextColor(28, 43, 58);
    doc.text(`En attente d'approbation (${pending.length})`, 40, cursorY);
    autoTable(doc, {
      startY: cursorY + 8,
      head: [['Scénario', 'FY', 'Soumis par', 'Mis à jour']],
      body: pending.map(s => [
        s.name,
        String(s.fiscal_year),
        profileName(s.created_by),
        format(new Date(s.updated_at), 'dd MMM yyyy', { locale: fr }),
      ]),
      headStyles: { fillColor: [180, 140, 30] },
      styles: { fontSize: 9 },
    });

    // Rejected
    cursorY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? cursorY) + 24;
    doc.setFontSize(12);
    doc.text(`Scénarios rejetés (${rejected.length})`, 40, cursorY);
    autoTable(doc, {
      startY: cursorY + 8,
      head: [['Scénario', 'FY', 'Rejeté par', 'Date', 'Motif']],
      body: rejected.map(s => [
        s.name,
        String(s.fiscal_year),
        profileName(s.rejected_by),
        s.rejected_at ? format(new Date(s.rejected_at), 'dd MMM yyyy', { locale: fr }) : '—',
        s.review_notes || '—',
      ]),
      headStyles: { fillColor: [200, 60, 60] },
      styles: { fontSize: 9, cellWidth: 'wrap' },
      columnStyles: { 4: { cellWidth: 180 } },
    });

    // Recent activity
    cursorY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? cursorY) + 24;
    doc.setFontSize(12);
    doc.text('Activité récente', 40, cursorY);
    autoTable(doc, {
      startY: cursorY + 8,
      head: [['Scénario', 'FY', 'Statut', 'Mis à jour']],
      body: recent.map(s => [
        s.name,
        String(s.fiscal_year),
        STATUS_META[s.status]?.label || s.status,
        format(new Date(s.updated_at), 'dd MMM yyyy', { locale: fr }),
      ]),
      headStyles: { fillColor: [80, 100, 120] },
      styles: { fontSize: 9 },
    });

    doc.save(`workflow-budget-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Export PDF généré', description: 'Le tableau de bord a été téléchargé.' });
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm p-6">Chargement du tableau de bord…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-primary">Tableau de bord Workflow</h3>
            <p className="text-[11.5px] text-muted-foreground">
              Vue consolidée — toutes années, tous scénarios ({scenarios.length} au total)
            </p>
          </div>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" /> Export PDF
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_ORDER.map(status => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <div key={status} className={`${meta.bg} rounded-lg p-4 border border-border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${meta.tone}`}>{meta.label}</span>
                <Icon className={`w-4 h-4 ${meta.tone}`} />
              </div>
              <div className={`text-[26px] font-bold ${meta.tone}`}>{counts[status] || 0}</div>
              <div className="text-[10.5px] text-muted-foreground">scénario{(counts[status] || 0) > 1 ? 's' : ''}</div>
            </div>
          );
        })}
      </div>

      {/* Pending approvals */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-[14px] font-semibold text-primary flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-[hsl(var(--gold))]" /> En attente d'approbation
          </h4>
          <span className="text-[11px] text-muted-foreground">{pending.length} scénario{pending.length > 1 ? 's' : ''}</span>
        </div>
        {pending.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground italic">Aucun scénario en attente.</p>
        ) : (
          <div className="space-y-1.5">
            {pending.map(s => (
              <button
                key={s.id}
                onClick={() => onOpenScenario(s.id, s.fiscal_year)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-foreground truncate">{s.name}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">FY {s.fiscal_year}</span>
                    {s.is_baseline && <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">BASE</span>}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground mt-0.5">
                    Soumis par {profileName(s.created_by)} · mis à jour {format(new Date(s.updated_at), 'dd MMM yyyy', { locale: fr })}
                    {s.reviewer_id && ` · réviseur : ${profileName(s.reviewer_id)}`}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rejected */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-[14px] font-semibold text-primary flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-destructive" /> Scénarios rejetés
          </h4>
          <span className="text-[11px] text-muted-foreground">{rejected.length} scénario{rejected.length > 1 ? 's' : ''}</span>
        </div>
        {rejected.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground italic">Aucun rejet récent.</p>
        ) : (
          <div className="space-y-2">
            {rejected.map(s => (
              <button
                key={s.id}
                onClick={() => onOpenScenario(s.id, s.fiscal_year)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-foreground truncate">{s.name}</span>
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">FY {s.fiscal_year}</span>
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  Rejeté par {profileName(s.rejected_by)}
                  {s.rejected_at && ` · ${format(new Date(s.rejected_at), 'dd MMM yyyy', { locale: fr })}`}
                </div>
                {s.review_notes && (
                  <div className="text-[11px] italic text-destructive mt-1">« {s.review_notes} »</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h4 className="font-display text-[14px] font-semibold text-primary mb-3">Activité récente</h4>
        <div className="space-y-1">
          {recent.map(s => {
            const meta = STATUS_META[s.status] || STATUS_META.draft;
            const Icon = meta.icon;
            return (
              <button
                key={s.id}
                onClick={() => onOpenScenario(s.id, s.fiscal_year)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 transition-colors text-left"
              >
                <Icon className={`w-3.5 h-3.5 ${meta.tone} flex-shrink-0`} />
                <span className="text-[12.5px] font-medium text-foreground flex-1 truncate">{s.name}</span>
                <span className="text-[10px] text-muted-foreground">FY {s.fiscal_year}</span>
                <span className={`text-[10px] font-semibold ${meta.tone} px-1.5 py-0.5 rounded-full ${meta.bg}`}>{meta.label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums w-[70px] text-right">
                  {format(new Date(s.updated_at), 'dd MMM', { locale: fr })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}