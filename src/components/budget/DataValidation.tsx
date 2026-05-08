import { useState, useMemo } from 'react';
import { useValidationRules, useCreateValidationRule, useDeleteValidationRule, ValidationRule } from '@/hooks/useBudgetNewFeatures';
import { BudgetLine, BudgetCategory, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DataValidationProps {
  scenarioId: string;
  lines: BudgetLine[];
  categories: BudgetCategory[];
  canWrite: boolean;
}

interface Violation {
  rule: ValidationRule;
  line: BudgetLine;
  month: string;
  value: number;
  message: string;
}

export default function DataValidation({ scenarioId, lines, categories, canWrite }: DataValidationProps) {
  const { data: rules = [] } = useValidationRules(scenarioId);
  const createRule = useCreateValidationRule();
  const deleteRule = useDeleteValidationRule();
  const [addOpen, setAddOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('range');
  const [categoryId, setCategoryId] = useState('');
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const [severity, setSeverity] = useState('warning');

  const violations = useMemo<Violation[]>(() => {
    const result: Violation[] = [];
    const activeRules = rules.filter(r => r.is_active);
    for (const rule of activeRules) {
      const targetLines = rule.category_id ? lines.filter(l => l.category_id === rule.category_id) : lines;
      for (const line of targetLines) {
        if (rule.rule_type === 'range') {
          for (const mk of MONTH_KEYS) {
            const val = Number(line[mk] || 0);
            if (val === 0) continue;
            if (rule.min_value !== null && val < rule.min_value) {
              const cat = categories.find(c => c.id === line.category_id);
              result.push({ rule, line, month: mk, value: val, message: `${cat?.name || ''} ${mk}: ${val.toLocaleString()} < min ${rule.min_value?.toLocaleString()}` });
            }
            if (rule.max_value !== null && val > rule.max_value) {
              const cat = categories.find(c => c.id === line.category_id);
              result.push({ rule, line, month: mk, value: val, message: `${cat?.name || ''} ${mk}: ${val.toLocaleString()} > max ${rule.max_value?.toLocaleString()}` });
            }
          }
        } else if (rule.rule_type === 'total_limit') {
          const total = getLineTotal(line);
          if (rule.max_value !== null && total > rule.max_value) {
            const cat = categories.find(c => c.id === line.category_id);
            result.push({ rule, line, month: 'total', value: total, message: `${cat?.name || ''} total: ${total.toLocaleString()} > limite ${rule.max_value?.toLocaleString()}` });
          }
        } else if (rule.rule_type === 'variance') {
          const vals = MONTH_KEYS.map(mk => Number(line[mk] || 0)).filter(v => v !== 0);
          if (vals.length >= 2) {
            const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
            const threshold = rule.max_value || 50;
            for (let i = 0; i < MONTH_KEYS.length; i++) {
              const val = Number(line[MONTH_KEYS[i]] || 0);
              if (val === 0) continue;
              const pctDiff = Math.abs((val - avg) / avg * 100);
              if (pctDiff > threshold) {
                const cat = categories.find(c => c.id === line.category_id);
                result.push({ rule, line, month: MONTH_KEYS[i], value: val, message: `${cat?.name || ''} ${MONTH_KEYS[i]}: écart ${pctDiff.toFixed(0)}% vs moyenne` });
              }
            }
          }
        }
      }
    }
    return result;
  }, [rules, lines, categories]);

  const handleAdd = () => {
    if (!ruleName) { toast.error('Nom requis'); return; }
    createRule.mutate({
      scenario_id: scenarioId, rule_name: ruleName, rule_type: ruleType,
      category_id: categoryId || null, country_id: null,
      min_value: minVal ? Number(minVal) : null, max_value: maxVal ? Number(maxVal) : null,
      formula: '', severity, is_active: true,
    }, {
      onSuccess: () => { toast.success('Règle créée'); setAddOpen(false); setRuleName(''); setMinVal(''); setMaxVal(''); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const sevColor = (s: string) => s === 'error' ? 'destructive' : s === 'warning' ? 'secondary' : 'outline';
  const errorCount = violations.filter(v => v.rule.severity === 'error').length;
  const warnCount = violations.filter(v => v.rule.severity === 'warning').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-bold text-primary">Validation des données</h3></div>
        {canWrite && <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 text-[12px]"><Plus className="w-3.5 h-3.5" /> Règle</Button>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{rules.filter(r => r.is_active).length}</div>
          <div className="text-[10px] text-muted-foreground">Règles actives</div>
        </Card>
        <Card className={`p-3 text-center ${errorCount > 0 ? 'border-destructive/50 bg-destructive/5' : ''}`}>
          <div className={`text-2xl font-bold ${errorCount > 0 ? 'text-destructive' : 'text-sage'}`}>{errorCount}</div>
          <div className="text-[10px] text-muted-foreground">Erreurs</div>
        </Card>
        <Card className={`p-3 text-center ${warnCount > 0 ? 'border-gold/300/50 bg-gold/10' : ''}`}>
          <div className={`text-2xl font-bold ${warnCount > 0 ? 'text-gold' : 'text-sage'}`}>{warnCount}</div>
          <div className="text-[10px] text-muted-foreground">Avertissements</div>
        </Card>
      </div>

      {rules.length > 0 && (
        <Card className="p-3">
          <h4 className="text-[12px] font-semibold mb-2">Règles configurées</h4>
          <div className="space-y-1.5">
            {rules.map(r => (
              <div key={r.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant={sevColor(r.severity) as 'destructive' | 'secondary' | 'outline'} className="text-[9px]">{r.severity}</Badge>
                  <span className="text-[11px] font-medium">{r.rule_name}</span>
                  <span className="text-[9px] text-muted-foreground capitalize">{r.rule_type}</span>
                  {r.min_value !== null && <span className="text-[9px] text-muted-foreground">min:{r.min_value}</span>}
                  {r.max_value !== null && <span className="text-[9px] text-muted-foreground">max:{r.max_value}</span>}
                </div>
                {canWrite && <button onClick={() => deleteRule.mutate({ id: r.id, scenarioId })} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {violations.length > 0 ? (
        <div className="space-y-1.5">
          <h4 className="text-[12px] font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-gold/300" /> Violations détectées ({violations.length})</h4>
          {violations.slice(0, 50).map((v, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] ${v.rule.severity === 'error' ? 'bg-destructive/10 border border-destructive/30' : 'bg-gold/10 border border-gold/30'}`}>
              {v.rule.severity === 'error' ? <AlertTriangle className="w-3 h-3 text-destructive" /> : <AlertTriangle className="w-3 h-3 text-gold/300" />}
              <span className="font-medium">{v.rule.rule_name}</span>
              <span className="text-muted-foreground">{v.message}</span>
            </div>
          ))}
        </div>
      ) : rules.length > 0 ? (
        <Card className="p-4 text-center border-sage/30 bg-sage/10">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-sage" />
          <p className="text-[12px] text-sage font-medium">Toutes les validations sont conformes ✓</p>
        </Card>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="font-display">Nouvelle règle de validation</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="text-[12px]">Nom *</Label><Input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="Budget max par mois" className="mt-1" /></div>
            <div><Label className="text-[12px]">Type</Label>
              <Select value={ruleType} onValueChange={setRuleType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">Plage min/max par mois</SelectItem>
                  <SelectItem value="total_limit">Limite total annuel</SelectItem>
                  <SelectItem value="variance">Écart vs moyenne (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-[12px]">Catégorie (optionnel)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="mt-1"><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px]">{ruleType === 'variance' ? 'Seuil (%)' : 'Min'}</Label><Input type="number" value={minVal} onChange={e => setMinVal(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-[12px]">{ruleType === 'variance' ? 'Seuil max (%)' : 'Max'}</Label><Input type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label className="text-[12px]">Sévérité</Label>
              <Select value={severity} onValueChange={setSeverity}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">🔴 Erreur (bloquant)</SelectItem>
                  <SelectItem value="warning">🟡 Avertissement</SelectItem>
                  <SelectItem value="info">🔵 Information</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createRule.isPending}>Créer la règle</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
