import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  countryId: string;
}

export default function CountryKpiCharts({ countryId }: Props) {
  const { data: history = [] } = useQuery({
    queryKey: ['kpi_history', countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_history')
        .select('*')
        .eq('country_id', countryId)
        .order('month');
      if (error) throw error;
      return data;
    },
    enabled: !!countryId,
  });

  if (history.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 col-span-2">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-2">Évolution KPIs</h3>
        <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée KPI historique</p>
      </div>
    );
  }

  const chartData = history.map(h => ({
    month: h.month,
    CA: Number(h.ca),
    'Obj CA': Number(h.target_ca),
    Clients: Number(h.clients),
    'Obj Clients': Number(h.target_clients),
    NPS: Number(h.nps),
    Rétention: Number(h.retention),
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-5 col-span-2">
      <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Évolution KPIs</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">CA vs Objectif</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="CA" stroke="hsl(var(--sage))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Obj CA" stroke="hsl(var(--sage))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Clients vs Objectif</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Clients" stroke="hsl(var(--sky))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Obj Clients" stroke="hsl(var(--sky))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">NPS</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="NPS" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Rétention (%)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Rétention" stroke="hsl(var(--terracotta))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
