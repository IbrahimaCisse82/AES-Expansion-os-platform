import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquareText, Send, Square, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeTotals, rollupBy, marginByProject, monthlySeries, MONTH_LABELS, type BiFact, type BiActivity, type BiFilters } from '@/lib/biAggregate';

interface Props { facts: BiFact[]; activity: BiActivity[]; filters: BiFilters; }
interface Turn { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Quel marché a le plus gros écart entre budget et réalisé ?',
  'Quels projets ont une marge négative et que faire ?',
  'Comment évolue l’exécution budgétaire mois par mois ?',
  'Quelles priorités pour le prochain trimestre ?',
];

export function BiAskAssistant({ facts, activity, filters }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const context = useMemo(() => {
    const totals = computeTotals(facts, filters);
    return {
      periode: `${MONTH_LABELS[filters.monthFrom - 1]} à ${MONTH_LABELS[filters.monthTo - 1]}`,
      totaux: totals,
      par_pays: rollupBy(facts, 'country', filters).slice(0, 20),
      par_pole: rollupBy(facts, 'pole', filters).slice(0, 20),
      marges_projets: marginByProject(facts, filters).slice(0, 30),
      mensuel: monthlySeries(facts, filters),
      taches: activity.filter(a => a.item_type === 'task').length,
      risques: activity.filter(a => a.item_type === 'risk').length,
    };
  }, [facts, activity, filters]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    const history = turns;
    setTurns([...history, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setQuestion('');
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error('Session expirée, reconnectez-vous.');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bi-ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ question: text, history, context }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Erreur ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setTurns(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error((e as Error).message);
        setTurns(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-primary" /> Interroger mes données</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Posez une question en langage naturel sur les marchés de votre périmètre ({context.periode}).</p>
          </div>
          {turns.length > 0 && !loading && (
            <Button size="sm" variant="ghost" onClick={() => setTurns([])} className="gap-1"><Trash2 className="h-3.5 w-3.5" /> Effacer</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <Button key={s} size="sm" variant="outline" className="text-xs h-auto py-1.5 whitespace-normal text-left" onClick={() => ask(s)}>{s}</Button>
            ))}
          </div>
        )}
        <div className="space-y-3 max-h-[520px] overflow-y-auto">
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'ml-auto max-w-[85%] rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm' : 'max-w-full rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap'}>
              {t.content || (loading && i === turns.length - 1 ? 'Analyse en cours…' : '')}
            </div>
          ))}
        </div>
        <form className="flex gap-2 items-end" onSubmit={e => { e.preventDefault(); ask(question); }}>
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(question); } }}
            placeholder="Ex. : Pourquoi le Sénégal dépasse-t-il son budget marketing ?"
            className="min-h-[44px] text-sm"
            maxLength={2000}
          />
          {loading
            ? <Button type="button" size="icon" variant="outline" onClick={() => abortRef.current?.abort()} aria-label="Arrêter"><Square className="h-4 w-4" /></Button>
            : <Button type="submit" size="icon" disabled={!question.trim()} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>}
        </form>
      </CardContent>
    </Card>
  );
}
