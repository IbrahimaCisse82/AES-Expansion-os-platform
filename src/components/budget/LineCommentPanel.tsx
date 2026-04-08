import { useState } from 'react';
import { useBudgetLineComments, useCreateLineComment, useDeleteLineComment, useBudgetAuditLog } from '@/hooks/useBudgetExtras';
import { BudgetLine, BudgetCategory } from '@/hooks/useBudgetData';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, History, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LineCommentPanelProps {
  line: BudgetLine;
  category?: BudgetCategory;
  onClose: () => void;
}

export default function LineCommentPanel({ line, category, onClose }: LineCommentPanelProps) {
  const { data: comments = [] } = useBudgetLineComments(line.id);
  const { data: auditLog = [] } = useBudgetAuditLog(line.id);
  const createComment = useCreateLineComment();
  const deleteComment = useDeleteLineComment();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate(
      { budget_line_id: line.id, content: newComment.trim() },
      {
        onSuccess: () => { setNewComment(''); toast.success('Commentaire ajouté'); },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const fieldLabels: Record<string, string> = {
    m1: 'Jan', m2: 'Fév', m3: 'Mar', m4: 'Avr', m5: 'Mai', m6: 'Jun',
    m7: 'Jul', m8: 'Aoû', m9: 'Sep', m10: 'Oct', m11: 'Nov', m12: 'Déc',
    notes: 'Notes', line_type: 'Type',
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg w-[340px] max-h-[450px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div>
          <div className="text-[12px] font-bold text-foreground">{category?.name || 'Ligne'}</div>
          <div className="text-[10px] text-muted-foreground">{line.country_label || 'Global'}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
      </div>

      <Tabs defaultValue="comments" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 h-7">
          <TabsTrigger value="comments" className="text-[10px] gap-1 h-6">
            <MessageSquare size={10} /> Commentaires ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] gap-1 h-6">
            <History size={10} /> Historique ({auditLog.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 px-3 pb-3">
          <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0 max-h-[240px]">
            {comments.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-4">Aucun commentaire</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="bg-muted/50 rounded-md px-2.5 py-2 group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-foreground">{c.author_name || 'Anonyme'}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                    </span>
                    <button
                      onClick={() => deleteComment.mutate({ id: c.id, budgetLineId: line.id })}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                    >
                      <Trash2 size={9} className="text-destructive" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-foreground">{c.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="min-h-[50px] text-[11px] resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            />
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || createComment.isPending} className="shrink-0 h-8 w-8 p-0">
              <Send size={12} />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto px-3 pb-3 max-h-[300px]">
          {auditLog.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-4">Aucune modification enregistrée</p>
          )}
          {auditLog.map(entry => (
            <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{entry.user_name || 'Système'}</span>
                  {' '}a modifié <span className="font-medium text-primary">{fieldLabels[entry.field_name] || entry.field_name}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-destructive line-through">{entry.old_value || '-'}</span>
                  {' → '}
                  <span className="text-accent font-medium">{entry.new_value || '-'}</span>
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: fr })}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
