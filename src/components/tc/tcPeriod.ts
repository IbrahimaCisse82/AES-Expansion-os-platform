import type { KitsResult } from '@/lib/tc/kits';
import type { SaleCalc } from '@/lib/tc/sales';
import type { TcData } from '@/lib/tc/types';
import { addMonths, monthRange } from '@/lib/tc/aggregates';

export interface TcEngine { data: TcData; kits: KitsResult; sales: SaleCalc[] }

/**
 * Période d'analyse : comme le classeur (15 mois à partir du premier mois
 * d'objectif), étendue pour couvrir toutes les données saisies et le mois
 * en cours.
 */
export function analysisPeriod(engine: TcEngine, today = new Date()) {
  const current = `${today.toISOString().slice(0, 7)}-01`;
  const dataMonths = [
    ...engine.data.objectives.map(o => o.month.slice(0, 7) + '-01'),
    ...engine.sales.flatMap(s => [s.quoteMonth, s.saleMonth, s.deliveryMonth, s.installMonth].filter((m): m is string => !!m)),
  ].sort();
  const start = dataMonths[0] && dataMonths[0] < current ? dataMonths[0] : current;
  const last = [addMonths(start, 14), current, dataMonths[dataMonths.length - 1] ?? current].sort().pop() as string;
  const months = monthRange(start, last);
  const defaultMonth = months.includes(current) ? current : months[months.length - 1];
  return { periodStart: start, months, defaultMonth };
}
