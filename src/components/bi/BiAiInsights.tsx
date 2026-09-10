import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeTotals, rollupBy, marginByProject, monthlySeries, formatFcfa, type BiFact, type BiActivity, type BiFilters } from '@/lib/biAggregate';
import { MONTH_LABELS } from '@/lib/biAggregate';

interface Props { facts: BiFact[]; activity: BiActivity[]; filters: BiFilters; }

export function BiAiInsights({ facts, activity, filters }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');

  const context = useMemo(() => {
    const totals = computeTotals(facts, filters);
    const countries = rollupBy(facts, 'country', filters).slice(0, 10);
    const poles = rollupBy(facts, 'pole', filters).slice(0, 10);
    const projects = marginByProject(facts, filters).slice(0, 10);
    const series = monthlySeries(facts, filters);
    return {
      periode: `${MONTH_LABELS[filters.monthFrom - 1]} à ${MONTH_LABELS[filters.monthTo - 1]}`,
      budget_total: totals.budget,
      realise_total: totals.actual,
      taux_execution: totals.pct,
      resultat_net: totals.result,
      par_pays: countries.map(r => ({ pays: r.label, budget: r.budget, realise: r.actual, ecart_pct: r.pct })),
      par_pole: poles.map(r => ({ pole: r.label, budget: r.budget, realise: r.actual })),
      marges_projets: projects.map(m => ({ projet: m.label, marge: m.margin })),
      mensuel: series.map(p => ({ mois: p.month, budget: p.budget, realise: p.actual })),
      taches: activity.filter(a => a.item_type === 'task').length,
      risques: activity.filter(a => a.item_type === 'risk').length,
    };
  }, [facts, activity, filters]);

  const run = async () => {
    setLoading(true);
    setAnalysis('');
    try {
      const { data, error } = await supabase.functions.invoke('bi-ai-insights', { body: { context } });
      if (error) throw error;
      const payload = data as { analysis?: string; error?: string };
      if (payload.error) throw new Error(payload.error);
      setAnalysis(payload.analysis ?? '');
    } catch (e) {
      toast.error(`Analyse impossible : ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Analyse IA</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Lecture automatique des données du périmètre filtré : écarts, tendances, recommandations.</p>
          </div>
          <Button size="sm" className="gap-1" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Lancer l'analyse
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-xs text-muted-foreground">Analyse en cours, quelques secondes…</p>}
        {!loading && !analysis && (
          <p className="text-xs text-muted-foreground">
            Budget actuel du périmètre : {formatFcfa(context.budget_total)} · Réalisé : {formatFcfa(context.realise_total)} · Exécution : {context.taux_execution.toFixed(1)} %.
            Lancez l'analyse pour un commentaire détaillé.
          </p>
        )}
        {analysis && (
          <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap rounded-md border bg-muted/40 p-4">
            {analysis}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
