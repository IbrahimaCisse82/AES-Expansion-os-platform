import { useState } from 'react';
import { BudgetScenario, useUpdateScenario } from '@/hooks/useBudgetData';
import { notifyBudgetStatusChange } from '@/hooks/useBudgetExtras';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Clock, Send, Lock, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApprovalWorkflowProps {
  scenario: BudgetScenario & { reviewer_id?: string | null; reviewed_at?: string | null; review_notes?: string | null; country_scope?: string | null; rejected_at?: string | null; rejected_by?: string | null };
  profiles: { user_id: string; full_name: string; initials: string }[];
  canWrite: boolean;
  isAdmin: boolean;
}

const STEPS = [
  { status: 'draft', label: 'Brouillon', icon: <Clock size={14} />, description: 'En cours de saisie' },
  { status: 'submitted', label: 'Soumis', icon: <Send size={14} />, description: 'En attente de revue' },
  { status: 'approved', label: 'Approuvé', icon: <CheckCircle2 size={14} />, description: 'Validé par un réviseur' },
  { status: 'locked', label: 'Verrouillé', icon: <Lock size={14} />, description: 'Finalisé, non modifiable' },
];

export default function ApprovalWorkflow({ scenario, profiles, canWrite, isAdmin }: ApprovalWorkflowProps) {
  const updateScenario = useUpdateScenario();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [nextStatus, setNextStatus] = useState<string>('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const currentStepIndex = STEPS.findIndex(s => s.status === scenario.status);

  const handleTransition = async (newStatus: string) => {
    if (newStatus === 'submitted' || newStatus === 'approved') {
      setNextStatus(newStatus);
      setReviewNotes('');
      setReviewOpen(true);
      return;
    }
    if (newStatus === 'rejected') {
      setRejectReason('');
      setRejectOpen(true);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    updateScenario.mutate(
      { id: scenario.id, status: newStatus as BudgetScenario['status'] },
      {
        onSuccess: () => {
          toast.success(`Statut mis à jour : ${STEPS.find(s => s.status === newStatus)?.label}`);
          notifyBudgetStatusChange({
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            newStatus,
            excludeUserId: user?.id,
          });
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const handleSubmitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Record<string, unknown> = {
      id: scenario.id,
      status: nextStatus,
      review_notes: reviewNotes,
    };
    if (nextStatus === 'approved') {
      updates.reviewer_id = user?.id;
      updates.reviewed_at = new Date().toISOString();
    }
    if (reviewerId) {
      updates.reviewer_id = reviewerId;
    }

    updateScenario.mutate(
      updates as Parameters<typeof updateScenario.mutate>[0],
      {
        onSuccess: () => {
          toast.success(nextStatus === 'submitted' ? 'Scénario soumis pour approbation' : 'Scénario approuvé');
          setReviewOpen(false);
          notifyBudgetStatusChange({
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            newStatus: nextStatus,
            excludeUserId: user?.id,
          });
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const handleSubmitReject = async () => {
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10) {
      toast.error('Le motif de rejet doit comporter au moins 10 caractères');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    updateScenario.mutate(
      {
        id: scenario.id,
        status: 'rejected',
        review_notes: trimmed,
        rejected_by: user?.id,
        rejected_at: new Date().toISOString(),
      } as Parameters<typeof updateScenario.mutate>[0],
      {
        onSuccess: () => {
          toast.success('Scénario rejeté');
          setRejectOpen(false);
          notifyBudgetStatusChange({
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            newStatus: 'rejected',
            excludeUserId: user?.id,
          });
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress steps */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-[13px] font-bold text-foreground mb-4">Workflow d'approbation</h3>
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, i) => {
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={step.status} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isDone ? 'bg-accent text-accent-foreground' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : isDone ? 'text-accent' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{step.description}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 ${isDone ? 'bg-accent' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Review info */}
        {scenario.reviewer_id && (
          <div className="bg-muted/30 rounded-md px-3 py-2 text-[11px] text-muted-foreground">
            Réviseur : {profiles.find(p => p.user_id === scenario.reviewer_id)?.full_name || 'N/A'}
            {scenario.reviewed_at && ` · Approuvé le ${format(new Date(scenario.reviewed_at), 'dd MMM yyyy', { locale: fr })}`}
            {scenario.review_notes && <div className="mt-1 italic">« {scenario.review_notes} »</div>}
          </div>
        )}

        {/* Rejection info */}
        {scenario.status === 'rejected' && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-[11px] text-destructive">
            <div className="flex items-center gap-1.5 font-semibold">
              <XCircle size={12} /> Scénario rejeté
              {scenario.rejected_by && ` par ${profiles.find(p => p.user_id === scenario.rejected_by)?.full_name || 'N/A'}`}
              {scenario.rejected_at && ` · ${format(new Date(scenario.rejected_at), 'dd MMM yyyy', { locale: fr })}`}
            </div>
            {scenario.review_notes && <div className="mt-1 italic">Motif : « {scenario.review_notes} »</div>}
          </div>
        )}

        {/* Action buttons */}
        {canWrite && (
          <div className="flex items-center gap-2 mt-3">
            {scenario.status === 'draft' && (
              <Button size="sm" onClick={() => handleTransition('submitted')} className="gap-1.5 text-[11px]">
                <Send size={12} /> Soumettre pour approbation
              </Button>
            )}
            {scenario.status === 'submitted' && isAdmin && (
              <>
                <Button size="sm" onClick={() => handleTransition('approved')} className="gap-1.5 text-[11px] bg-accent hover:bg-accent/90">
                  <CheckCircle2 size={12} /> Approuver
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleTransition('rejected')} className="gap-1.5 text-[11px]">
                  <XCircle size={12} /> Rejeter
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleTransition('draft')} className="gap-1.5 text-[11px]">
                  <AlertCircle size={12} /> Renvoyer en brouillon
                </Button>
              </>
            )}
            {scenario.status === 'approved' && isAdmin && (
              <Button size="sm" onClick={() => handleTransition('locked')} className="gap-1.5 text-[11px] bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <Lock size={12} /> Verrouiller
              </Button>
            )}
            {scenario.status === 'locked' && isAdmin && (
              <Button size="sm" variant="outline" onClick={() => handleTransition('draft')} className="gap-1.5 text-[11px]">
                <Clock size={12} /> Déverrouiller (brouillon)
              </Button>
            )}
            {scenario.status === 'rejected' && (
              <Button size="sm" onClick={() => handleTransition('draft')} className="gap-1.5 text-[11px]">
                <Clock size={12} /> Reprendre en brouillon
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {nextStatus === 'submitted' ? '📩 Soumettre pour approbation' : '✅ Approuver le scénario'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {nextStatus === 'submitted' && (
              <div>
                <Label className="text-[12px]">Assigner un réviseur</Label>
                <Select value={reviewerId} onValueChange={setReviewerId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-[12px]">Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className="mt-1 min-h-[80px]"
                placeholder={nextStatus === 'submitted' ? 'Commentaires pour le réviseur…' : 'Commentaires d\'approbation…'}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setReviewOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSubmitReview} disabled={updateScenario.isPending}>
                {nextStatus === 'submitted' ? 'Soumettre' : 'Approuver'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <XCircle size={18} className="text-destructive" /> Rejeter le scénario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-[12px] text-muted-foreground">
              Le créateur sera notifié du rejet et du motif fourni. Le scénario pourra être repris en brouillon.
            </div>
            <div>
              <Label className="text-[12px]">
                Motif du rejet <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="mt-1 min-h-[100px]"
                placeholder="Expliquez clairement la raison du rejet (min. 10 caractères)…"
                autoFocus
              />
              <div className={`text-[10px] mt-1 ${rejectReason.trim().length < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {rejectReason.trim().length} / 10 caractères minimum
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Annuler</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmitReject}
                disabled={updateScenario.isPending || rejectReason.trim().length < 10}
              >
                Confirmer le rejet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
