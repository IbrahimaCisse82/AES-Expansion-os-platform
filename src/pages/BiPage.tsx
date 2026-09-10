import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BiFilters } from '@/components/bi/BiFilters';
import { BiOverview } from '@/components/bi/BiOverview';
import { BiProjectBudgets } from '@/components/bi/BiProjectBudgets';
import { BiPoleAnalysis } from '@/components/bi/BiPoleAnalysis';
import { BiReportBuilder } from '@/components/bi/BiReportBuilder';
import { BiDistribution } from '@/components/bi/BiDistribution';
import { BiAiInsights } from '@/components/bi/BiAiInsights';
import { BiOperationalReports } from '@/components/bi/BiOperationalReports';
import { useBiFacts, useBiActivity, useBiScope } from '@/hooks/useBiData';
import { emptyFilters, type BiFilters as Filters } from '@/lib/biAggregate';

export default function BiPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const scope = useBiScope().data;
  const { data: facts, isLoading } = useBiFacts();
  const { data: activity } = useBiActivity();

  // RAF / profil scopé : le filtre pays démarre sur son pays
  const effectiveFilters = useMemo<Filters>(
    () => (scope ? { ...filters, countryId: scope } : filters),
    [filters, scope],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Business Intelligence</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Pilotage global : budget, sous-budgets projets, rapports et analyse — montants en FCFA.
        </p>
      </div>

      <BiFilters filters={effectiveFilters} onChange={setFilters} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Chargement des données…</p>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">Sous-budgets projets</TabsTrigger>
            <TabsTrigger value="poles" className="text-xs">Analyse par pôle</TabsTrigger>
            <TabsTrigger value="builder" className="text-xs">Constructeur</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">Rapports A1–A12</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">Diffusion</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">Analyse IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><BiOverview facts={facts ?? []} filters={effectiveFilters} /></TabsContent>
          <TabsContent value="projects" className="mt-4"><BiProjectBudgets facts={facts ?? []} filters={effectiveFilters} /></TabsContent>
          <TabsContent value="poles" className="mt-4"><BiPoleAnalysis facts={facts ?? []} filters={effectiveFilters} /></TabsContent>
          <TabsContent value="builder" className="mt-4"><BiReportBuilder facts={facts ?? []} activity={activity ?? []} filters={effectiveFilters} /></TabsContent>
          <TabsContent value="reports" className="mt-4"><BiOperationalReports /></TabsContent>
          <TabsContent value="distribution" className="mt-4"><BiDistribution /></TabsContent>
          <TabsContent value="ai" className="mt-4"><BiAiInsights facts={facts ?? []} activity={activity ?? []} filters={effectiveFilters} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
