import { useState, useEffect } from 'react';
import { useBudgetScenarios, useBudgetCategories, useBudgetLines, useCreateBudgetLine, BudgetCategory } from '@/hooks/useBudgetData';
import { useIntercompanyEliminations } from '@/hooks/useBudgetConsolidation';
import { useCountries } from '@/hooks/useExpansionData';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Download, Table2, BarChart3, GitCompare, TrendingUp, FileSpreadsheet, FileText, LayoutDashboard, BookOpen, Globe, ArrowUpDown, Share2, TrendingDown, History, ClipboardCheck, PieChart, Brain, Layers, FileCode, ShieldCheck, Building2, ClipboardList } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { exportBudgetXLSX, exportBudgetPDF } from '@/lib/budgetExport';
import { MONTHS, MONTH_KEYS, getLineTotal } from '@/hooks/useBudgetData';
import BudgetSpreadsheet from '@/components/budget/BudgetSpreadsheet';
import ScenarioManager from '@/components/budget/ScenarioManager';
import BudgetKPIs from '@/components/budget/BudgetKPIs';
import BudgetPnL from '@/components/budget/BudgetPnL';
import RollingForecast from '@/components/budget/RollingForecast';
import ScenarioComparison from '@/components/budget/ScenarioComparison';
import BudgetDashboard from '@/components/budget/BudgetDashboard';
import FinancialStatements from '@/components/budget/FinancialStatements';
import BudgetNotifications from '@/components/budget/BudgetNotifications';
import ConsolidationView from '@/components/budget/ConsolidationView';
import IntercompanyManager from '@/components/budget/IntercompanyManager';
import TopDownBottomUp from '@/components/budget/TopDownBottomUp';
import CostAllocationView from '@/components/budget/CostAllocationView';
import CapExPlanning from '@/components/budget/CapExPlanning';
import VersionManager from '@/components/budget/VersionManager';
import ApprovalWorkflow from '@/components/budget/ApprovalWorkflow';
import BudgetImport from '@/components/budget/BudgetImport';
import AdHocReporting from '@/components/budget/AdHocReporting';
import AIPredictions from '@/components/budget/AIPredictions';
import SegmentConsolidation from '@/components/budget/SegmentConsolidation';
import JournalEntriesView from '@/components/budget/JournalEntriesView';
import CloseManagementView from '@/components/budget/CloseManagement';
import DataValidation from '@/components/budget/DataValidation';
import InvestmentRegister from '@/components/budget/InvestmentRegister';
import XBRLExport from '@/components/budget/XBRLExport';
const CAN_WRITE = ['admin', 'director', 'analyst'];
const currentYear = new Date().getFullYear();

type ViewMode = 'spreadsheet' | 'pnl' | 'compare' | 'forecast' | 'dashboard' | 'statements' | 'consolidation' | 'topdown' | 'allocations' | 'capex' | 'versions' | 'approval' | 'adhoc' | 'ai' | 'segments' | 'journal' | 'close' | 'validation' | 'investments' | 'xbrl';

export default function BudgetPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { data: myRole } = useCurrentUserRole();
  const canWrite = CAN_WRITE.includes(myRole ?? '');
  const isAdmin = myRole === 'admin' || myRole === 'director';

  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [compareScenarioIds, setCompareScenarioIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('spreadsheet');
  const [lineType, setLineType] = useState<'budget' | 'actual' | 'forecast'>('budget');
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [newLineCategoryId, setNewLineCategoryId] = useState('');
  const [newLineCountryId, setNewLineCountryId] = useState('_global');

  const { data: scenarios = [], isLoading: loadingScenarios } = useBudgetScenarios(fiscalYear);
  const { data: categories = [] } = useBudgetCategories();
  const { data: countries = [] } = useCountries();
  const { data: lines = [], isLoading: loadingLines } = useBudgetLines(activeScenarioId ?? undefined);
  const { data: eliminations = [] } = useIntercompanyEliminations(activeScenarioId ?? undefined);
  const createLine = useCreateBudgetLine();

  // Profiles for approval workflow
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, initials');
      if (error) throw error;
      return data as { user_id: string; full_name: string; initials: string }[];
    },
  });

  const compareQueries = compareScenarioIds.map(id => useBudgetLines(id));
  const allCompareLines: Record<string, unknown[]> = {};
  compareScenarioIds.forEach((id, i) => {
    allCompareLines[id] = compareQueries[i]?.data || [];
  });
  if (activeScenarioId) allCompareLines[activeScenarioId] = lines;

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const isLocked = activeScenario?.status === 'locked';

  useEffect(() => {
    if (scenarios.length > 0 && !activeScenarioId) setActiveScenarioId(scenarios[0].id);
  }, [scenarios, activeScenarioId]);

  useEffect(() => {
    if (addSignal && addSignal > 0 && canWrite && activeScenarioId) setAddLineOpen(true);
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
      const row: Record<string, string | number> = { 'Catégorie': cat?.name || '', 'Type': cat?.type || '', 'Marché': l.country_label || 'Global', 'Ligne': l.line_type };
      MONTHS.forEach((m, i) => { row[m] = Number(l[MONTH_KEYS[i] as keyof typeof l] || 0); });
      row['Total'] = getLineTotal(l);
      return row;
    });
    exportToCSV(data, `budget_${activeScenario?.name || 'export'}_${fiscalYear}`);
    toast.success('Budget exporté en CSV');
  };

  const toggleCompareScenario = (id: string) => {
    setCompareScenarioIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loadingScenarios) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  const budgetLines = lines.filter(l => l.line_type === 'budget');
  const actualLines = lines.filter(l => l.line_type === 'actual');
  const filteredLines = lines.filter(l => l.line_type === lineType);

  const VIEW_TABS: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: 'spreadsheet', icon: <Table2 size={14} />, label: 'Tableur' },
    { key: 'consolidation', icon: <Globe size={14} />, label: 'Consolidation' },
    { key: 'pnl', icon: <BarChart3 size={14} />, label: 'P&L' },
    { key: 'statements', icon: <BookOpen size={14} />, label: 'États fin.' },
    { key: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Dashboard' },
    { key: 'topdown', icon: <ArrowUpDown size={14} />, label: 'Top-Down/Up' },
    { key: 'allocations', icon: <Share2 size={14} />, label: 'Allocations' },
    { key: 'capex', icon: <TrendingDown size={14} />, label: 'CapEx' },
    { key: 'forecast', icon: <TrendingUp size={14} />, label: 'Forecast' },
    { key: 'compare', icon: <GitCompare size={14} />, label: 'Comparer' },
    { key: 'versions', icon: <History size={14} />, label: 'Versions' },
    { key: 'approval', icon: <ClipboardCheck size={14} />, label: 'Workflow' },
    { key: 'adhoc', icon: <PieChart size={14} />, label: 'Ad hoc' },
  ];

  const showLineTypeToggle = ['spreadsheet', 'compare', 'consolidation', 'adhoc'].includes(viewMode);

  return (
    <div className="animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold text-primary mb-0.5">Budget & Planification — Holding</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Consolidation financière · Exercice {fiscalYear} · {scenarios.length} scénario{scenarios.length !== 1 ? 's' : ''} · {countries.length} pays
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BudgetNotifications />
          <Select value={String(fiscalYear)} onValueChange={v => { setFiscalYear(Number(v)); setActiveScenarioId(null); }}>
            <SelectTrigger className="w-[100px] h-[34px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            {activeScenarioId && (
              <BudgetImport scenarioId={activeScenarioId} categories={categories} countries={countries} onComplete={() => {}} />
            )}
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 text-[12px] h-[34px]" disabled={lines.length === 0}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button onClick={() => activeScenario && exportBudgetXLSX({ lines, categories, scenarioName: activeScenario.name, fiscalYear })} variant="outline" size="sm" className="gap-1.5 text-[12px] h-[34px]" disabled={lines.length === 0}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
            </Button>
            <Button onClick={() => activeScenario && exportBudgetPDF({ lines, categories, scenarioName: activeScenario.name, fiscalYear })} variant="outline" size="sm" className="gap-1.5 text-[12px] h-[34px]" disabled={lines.length === 0}>
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Scenario tabs */}
      <div className="mb-4">
        <ScenarioManager scenarios={scenarios} activeScenarioId={activeScenarioId} onSelect={setActiveScenarioId} canWrite={canWrite} fiscalYear={fiscalYear} />
      </div>

      {!activeScenarioId ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="font-display text-lg font-semibold text-primary mb-2">Créez votre premier scénario</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Commencez par créer un scénario budgétaire pour saisir vos prévisions de revenus et dépenses mois par mois.
          </p>
        </div>
      ) : (
        <>
          <BudgetKPIs lines={lines} categories={categories} scenarioName={activeScenario?.name || ''} />

          {/* View mode toggles */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 flex-wrap">
              {VIEW_TABS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10.5px] font-medium transition-colors ${
                    viewMode === v.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {showLineTypeToggle && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {(['budget', 'actual', 'forecast'] as const).map(t => (
                    <button key={t} onClick={() => setLineType(t)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${lineType === t ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                      {t === 'budget' ? 'Budget' : t === 'actual' ? 'Réel' : 'Prévision'}
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
            <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-muted/50 border border-border rounded-lg flex-wrap">
              <span className="text-[12px] font-medium text-muted-foreground">Scénarios :</span>
              {scenarios.map(s => (
                <label key={s.id} className="flex items-center gap-1.5 text-[11px]">
                  <Checkbox checked={s.id === activeScenarioId || compareScenarioIds.includes(s.id)} onCheckedChange={() => { if (s.id !== activeScenarioId) toggleCompareScenario(s.id); }} disabled={s.id === activeScenarioId} />
                  <span className={s.id === activeScenarioId ? 'font-bold text-primary' : ''}>{s.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* Views */}
          {viewMode === 'spreadsheet' && <BudgetSpreadsheet lines={filteredLines} categories={categories} scenarioId={activeScenarioId} canWrite={canWrite} isLocked={isLocked} lineType={lineType} />}
          {viewMode === 'consolidation' && <ConsolidationView lines={lines} categories={categories} eliminations={eliminations} countries={countries} lineType={lineType} />}
          {viewMode === 'pnl' && <BudgetPnL budgetLines={budgetLines} actualLines={actualLines} categories={categories} />}
          {viewMode === 'statements' && <FinancialStatements budgetLines={budgetLines} actualLines={actualLines} categories={categories} />}
          {viewMode === 'dashboard' && <BudgetDashboard budgetLines={budgetLines} actualLines={actualLines} categories={categories} />}
          {viewMode === 'topdown' && <TopDownBottomUp lines={lines} categories={categories} scenarioId={activeScenarioId} countries={countries} canWrite={canWrite} />}
          {viewMode === 'allocations' && (
            <div className="space-y-6">
              <CostAllocationView scenarioId={activeScenarioId} categories={categories} countries={countries} canWrite={canWrite} />
              <IntercompanyManager scenarioId={activeScenarioId} categories={categories} countries={countries} canWrite={canWrite} />
            </div>
          )}
          {viewMode === 'capex' && <CapExPlanning scenarioId={activeScenarioId} categories={categories} countries={countries} canWrite={canWrite} />}
          {viewMode === 'forecast' && <RollingForecast budgetLines={budgetLines} actualLines={actualLines} categories={categories} forecastHorizon={6} />}
          {viewMode === 'compare' && <ScenarioComparison scenarios={[activeScenario!, ...scenarios.filter(s => compareScenarioIds.includes(s.id))]} allLines={allCompareLines as Record<string, never[]>} categories={categories} lineType={lineType} />}
          {viewMode === 'versions' && <VersionManager scenarioId={activeScenarioId} scenarioName={activeScenario?.name || ''} canWrite={canWrite} />}
          {viewMode === 'approval' && <ApprovalWorkflow scenario={activeScenario as Parameters<typeof ApprovalWorkflow>[0]['scenario']} profiles={profiles} canWrite={canWrite} isAdmin={isAdmin} />}
          {viewMode === 'adhoc' && <AdHocReporting lines={lines} categories={categories} countries={countries} />}
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
