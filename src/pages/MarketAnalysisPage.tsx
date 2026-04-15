import { Globe, BarChart3, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CountryAnalysisTab from '@/components/market/CountryAnalysisTab';
import AfriDataHubTab from '@/components/market/AfriDataHubTab';
import SwotComparison from '@/components/market/SwotComparison';
import { useCountries } from '@/hooks/useExpansionData';

export default function MarketAnalysisPage() {
  const { data: countries = [] } = useCountries();

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Globe size={22} className="text-accent" />
          <h2 className="font-display text-[23px] font-bold text-primary">Analyse de Marché</h2>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          Données en temps réel par pays cible · KPIs, tâches, risques, budget · Intelligence économique
        </p>
      </div>

      <Tabs defaultValue="analyse-pays" className="space-y-4">
        <TabsList className="h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="analyse-pays" className="flex items-center gap-1.5 text-[13px] px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 size={14} />
            Analyse Pays
          </TabsTrigger>
          <TabsTrigger value="afridatahub" className="flex items-center gap-1.5 text-[13px] px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe size={14} />
            AfriDataHub
          </TabsTrigger>
          <TabsTrigger value="swot" className="flex items-center gap-1.5 text-[13px] px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield size={14} />
            SWOT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyse-pays">
          <CountryAnalysisTab />
        </TabsContent>

        <TabsContent value="afridatahub">
          <AfriDataHubTab />
        </TabsContent>

        <TabsContent value="swot">
          <SwotComparison countries={countries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
