import { useState } from 'react';
import { BudgetLine, BudgetCategory, MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface AIPredictionsProps {
  lines: BudgetLine[];
  categories: BudgetCategory[];
  scenarioId: string;
}

interface Forecast {
  category: string;
  m7: number; m8: number; m9: number; m10: number; m11: number; m12: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface Anomaly {
  line_id: string;
  category: string;
  month: string;
  value: number;
  expected: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface Recommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  estimated_savings: number;
}

type AITab = 'forecast' | 'anomalies' | 'recommendations';

export default function AIPredictions({ lines, categories, scenarioId }: AIPredictionsProps) {
  const [activeTab, setActiveTab] = useState<AITab>('forecast');
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const runAI = async (action: AITab) => {
    if (lines.length === 0) { toast.error('Aucune donnée budgétaire à analyser'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('budget-ai-predict', {
        body: { lines, categories, action },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (action === 'forecast') {
        setForecasts(data.forecasts || []);
        setSummaries(prev => ({ ...prev, forecast: data.summary || '' }));
      } else if (action === 'anomalies') {
        setAnomalies(data.anomalies || []);
        setSummaries(prev => ({ ...prev, anomalies: data.summary || '' }));
      } else {
        setRecommendations(data.recommendations || []);
        setSummaries(prev => ({ ...prev, recommendations: data.summary || '' }));
      }
      toast.success('Analyse IA terminée');
    } catch (err) {
      toast.error(`Erreur IA : ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: AITab; icon: React.ReactNode; label: string }[] = [
    { key: 'forecast', icon: <TrendingUp size={14} />, label: 'Prévisions' },
    { key: 'anomalies', icon: <AlertTriangle size={14} />, label: 'Anomalies' },
    { key: 'recommendations', icon: <Lightbulb size={14} />, label: 'Recommandations' },
  ];

  const severityColor = (s: string) => s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';
  const trendIcon = (t: string) => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';
  const impactLabel = (i: string) => i === 'high' ? 'Impact fort' : i === 'medium' ? 'Impact moyen' : 'Impact faible';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-primary">JedoxAI — Intelligence prédictive</h3>
        </div>
        <Button onClick={() => runAI(activeTab)} disabled={loading} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          {loading ? 'Analyse en cours…' : 'Lancer l\'analyse'}
        </Button>
      </div>

      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${activeTab === t.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {summaries[activeTab] && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <p className="text-[12px] text-foreground">{summaries[activeTab]}</p>
        </Card>
      )}

      {activeTab === 'forecast' && forecasts.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Catégorie</th>
                <th className="text-center px-2 py-2 text-[10px] font-bold text-muted-foreground">Tendance</th>
                {['Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'].map(m => (
                  <th key={m} className="text-right px-2 py-2 text-[10px] font-bold text-muted-foreground">{m}</th>
                ))}
                <th className="text-right px-3 py-2 text-[10px] font-bold text-muted-foreground">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium">{f.category}</td>
                  <td className="text-center px-2 py-1.5">{trendIcon(f.trend)}</td>
                  <td className="text-right px-2 py-1.5">{(f.m7 / 1000).toFixed(1)}K</td>
                  <td className="text-right px-2 py-1.5">{(f.m8 / 1000).toFixed(1)}K</td>
                  <td className="text-right px-2 py-1.5">{(f.m9 / 1000).toFixed(1)}K</td>
                  <td className="text-right px-2 py-1.5">{(f.m10 / 1000).toFixed(1)}K</td>
                  <td className="text-right px-2 py-1.5">{(f.m11 / 1000).toFixed(1)}K</td>
                  <td className="text-right px-2 py-1.5">{(f.m12 / 1000).toFixed(1)}K</td>
                  <td className="text-right px-3 py-1.5">
                    <Badge variant={f.confidence > 0.7 ? 'default' : 'secondary'}>{Math.round(f.confidence * 100)}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'anomalies' && anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((a, i) => (
            <Card key={i} className="p-3 flex items-start gap-3">
              <AlertTriangle className={`w-4 h-4 mt-0.5 ${a.severity === 'high' ? 'text-destructive' : a.severity === 'medium' ? 'text-gold' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[12px]">{a.category}</span>
                  <Badge variant={severityColor(a.severity) as 'destructive' | 'secondary' | 'outline'} className="text-[9px]">{a.severity}</Badge>
                  <span className="text-[10px] text-muted-foreground">{a.month}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{a.description}</p>
                <div className="flex gap-4 mt-1 text-[10px]">
                  <span>Valeur : <strong>{a.value?.toLocaleString()}</strong></span>
                  <span>Attendu : <strong>{a.expected?.toLocaleString()}</strong></span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'recommendations' && recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((r, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-gold" />
                <span className="font-semibold text-[12px]">{r.title}</span>
                <Badge variant="outline" className="text-[9px]">{impactLabel(r.impact)}</Badge>
                {r.estimated_savings > 0 && (
                  <span className="text-[10px] text-sage font-medium ml-auto">💰 {r.estimated_savings.toLocaleString()} économisés</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{r.description}</p>
            </Card>
          ))}
        </div>
      )}

      {((activeTab === 'forecast' && forecasts.length === 0) || (activeTab === 'anomalies' && anomalies.length === 0) || (activeTab === 'recommendations' && recommendations.length === 0)) && !loading && (
        <Card className="p-8 text-center">
          <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Cliquez sur "Lancer l'analyse" pour obtenir des insights IA sur vos données budgétaires.</p>
        </Card>
      )}
    </div>
  );
}
