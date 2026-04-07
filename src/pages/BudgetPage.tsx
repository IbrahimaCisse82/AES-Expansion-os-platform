import { useState, useEffect } from 'react';
import { useBudgetScenarios, useBudgetCategories, useBudgetLines, useCreateBudgetLine, BudgetCategory } from '@/hooks/useBudgetData';
import { useCountries } from '@/hooks/useExpansionData';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Download, Table2, BarChart3, GitCompare, TrendingUp } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import BudgetSpreadsheet from '@/components/budget/BudgetSpreadsheet';
import ScenarioManager from '@/components/budget/ScenarioManager';
import BudgetKPIs from '@/components/budget/BudgetKPIs';
import BudgetPnL from '@/components/budget/BudgetPnL';
import RollingForecast from '@/components/budget/RollingForecast';

const CAN_WRITE = ['admin', 'director', 'analyst'];
const currentYear = new Date().getFullYear();

type ViewMode = 'spreadsheet' | 'pnl' | 'compare' | 'forecast';

export default function BudgetPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { data: myRole } = useCurrentUserRole();
  const canWrite = CAN_WRITE.includes(myRole ?? '');

  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('spreadsheet');
  const [lineType, setLineType] = useState<'budget' | 'actual' | 'forecast'>('budget');
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [newLineCategoryId, setNewLineCategoryId] = useState('');
  const [newLineCountryId, setNewLineCountryId] = useState('_global');

  const { data: scenarios = [], isLoading: loadingScenarios } = useBudgetScenarios(fiscalYear);
  const { data: categories = [] } = useBudgetCategories();
  const { data: countries = [] } = useCountries();
  const { data: lines = [], isLoading: loadingLines } = useBudgetLines(activeScenarioId ?? undefined);
  const { data: compareLines = [] } = useBudgetLines(compareScenarioId ?? undefined);
  const createLine = useCreateBudgetLine();

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const isLocked = activeScenario?.status === 'locked';

  // Auto-select first scenario
  useEffect(() => {
    if (scenarios.length > 0 && !activeScenarioId) {
      setActiveScenarioId(scenarios[0].id);
    }
  }, [scenarios, activeScenarioId]);

  // Add signal
  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite && activeScenarioId) {
      setAddLineOpen(true);
    }
  }, [addSignal]);

  const handleAddLine = () => {
    if (!newLineCategoryId || !activeScenarioId) { toast.error('Sélectionnez une catégorie'); return; }
    const country = countries.find(c => c.id === newLineCountryId);
    createLine.mutate({
      scenario_id: activeScenarioId,
      category_id: newLineCategoryId,
      country_id: newLineCountryId === '_global' ? null : newLineCountryId,
      country_label: country ? `${country.flag} ${country.name}` : 'Global',
      line_type: lineType,
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
      m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
      notes: '',
    }, {
      onSuccess: () => { toast.success('Ligne ajoutée'); setAddLineOpen(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleExportCSV = () => {
    const data = lines.map(l => {
      const cat = categories.find(c => c.id === l.category_id);
      const row: Record<string, string | number> = {
        'Catégorie': cat?.name || '',
        'Type': cat?.type || '',
        'Marché': l.country_label || 'Global',
        'Ligne': l.line_type,
      };
      MONTHS.forEach((m, i) => { row[m] = Number(l[MONTH_KEYS[i] as keyof typeof l] || 0); });
      row['Total'] = getLineTotal(l);
      return row;
    });
    exportToCSV(data, `budget_${activeScenario?.name || 'export'}_${fiscalYear}`);
    toast.success('Budget exporté en CSV');
  };

  if (loadingScenarios) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const budgetLines = lines.filter(l => l.line_type === 'budget');
  const actualLines = lines.filter(l => l.line_type === 'actual');
  const filteredLines = lines.filter(l => l.line_type === lineType);

  return (
    <div className="animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-0.5">Budget & Planification</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Planification financière · Exercice {fiscalYear} · {scenarios.length} scénario{scenarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(fiscalYear)} onValueChange={v => { setFiscalYear(Number(v)); setActiveScenarioId(null); }}>
            <SelectTrigger className="w-[100px] h-[34px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 text-[12px] h-[34px]" disabled={lines.length === 0}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Scenario tabs */}
      <div className="mb-4">
        <ScenarioManager
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onSelect={setActiveScenarioId}
          canWrite={canWrite}
          fiscalYear={fiscalYear}
        />
      </div>

      {!activeScenarioId ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="font-display text-lg font-semibold text-primary mb-2">Créez votre premier scénario</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Commencez par créer un scénario budgétaire (ex: "Budget Base 2025") pour saisir vos prévisions de revenus et dépenses mois par mois.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <BudgetKPIs lines={lines} categories={categories} scenarioName={activeScenario?.name || ''} />

          {/* View mode + line type toggles */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {([
                { key: 'spreadsheet' as ViewMode, icon: <Table2 size={14} />, label: 'Tableur' },
                { key: 'pnl' as ViewMode, icon: <BarChart3 size={14} />, label: 'P&L' },
                { key: 'forecast' as ViewMode, icon: <TrendingUp size={14} />, label: 'Forecast' },
                { key: 'compare' as ViewMode, icon: <GitCompare size={14} />, label: 'Comparer' },
              ]).map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium transition-colors ${
                    viewMode === v.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {viewMode !== 'pnl' && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {([
                    { key: 'budget' as const, label: 'Budget', color: 'text-accent' },
                    { key: 'actual' as const, label: 'Réel', color: 'text-[hsl(var(--gold))]' },
                    { key: 'forecast' as const, label: 'Prévision', color: 'text-[hsl(var(--sky))]' },
                  ]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setLineType(t.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        lineType === t.key ? `bg-card ${t.color} shadow-sm` : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {canWrite && !isLocked && viewMode === 'spreadsheet' && (
                <Button onClick={() => setAddLineOpen(true)} size="sm" className="gap-1.5 text-[12px] h-[32px]">
                  <Plus className="w-3.5 h-3.5" /> Ligne
                </Button>
              )}
            </div>
          </div>

          {/* Compare scenario selector */}
          {viewMode === 'compare' && (
            <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-muted/50 border border-border rounded-lg">
              <span className="text-[12px] font-medium text-muted-foreground">Comparer avec :</span>
              <Select value={compareScenarioId || '_none'} onValueChange={v => setCompareScenarioId(v === '_none' ? null : v)}>
                <SelectTrigger className="w-[200px] h-[30px] text-[12px]"><SelectValue placeholder="Choisir un scénario" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun</SelectItem>
                  {scenarios.filter(s => s.id !== activeScenarioId).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Views */}
          {viewMode === 'spreadsheet' && (
            <BudgetSpreadsheet
              lines={filteredLines}
              categories={categories}
              scenarioId={activeScenarioId}
              canWrite={canWrite}
              isLocked={isLocked}
              lineType={lineType}
            />
          )}

          {viewMode === 'pnl' && (
            <BudgetPnL
              budgetLines={budgetLines}
              actualLines={actualLines}
              categories={categories}
            />
          )}

          {viewMode === 'compare' && (
            <BudgetSpreadsheet
              lines={filteredLines}
              categories={categories}
              scenarioId={activeScenarioId}
              canWrite={false}
              isLocked={true}
              lineType={lineType}
              compareLines={compareLines.filter(l => l.line_type === lineType)}
              compareLabel={scenarios.find(s => s.id === compareScenarioId)?.name}
            />
          )}
        </>
      )}

      {/* Add line dialog */}
      <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Nouvelle ligne budgétaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12.5px]">Catégorie *</Label>
              <Select value={newLineCategoryId} onValueChange={setNewLineCategoryId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">Revenus</div>
                  {categories.filter((c: BudgetCategory) => c.type === 'revenue').map(c => (
                    <SelectItem key={c.id} value={c.id}>📈 {c.name}</SelectItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase mt-1">Dépenses</div>
                  {categories.filter((c: BudgetCategory) => c.type === 'expense').map(c => (
                    <SelectItem key={c.id} value={c.id}>📉 {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12.5px]">Marché</Label>
              <Select value={newLineCountryId} onValueChange={setNewLineCountryId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_global">🌍 Global</SelectItem>
                  {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12.5px]">Type de données</Label>
              <Select value={lineType} onValueChange={v => setLineType(v as 'budget' | 'actual' | 'forecast')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget prévisionnel</SelectItem>
                  <SelectItem value="actual">Réel (dépenses effectives)</SelectItem>
                  <SelectItem value="forecast">Prévision (rolling forecast)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddLineOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleAddLine} disabled={createLine.isPending}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
