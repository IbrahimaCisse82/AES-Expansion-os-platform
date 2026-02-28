import { historyItems } from '@/data/expansionData';

const dotColors: Record<string, string> = {
  sage: 'bg-sage', sky: 'bg-sky', gold: 'bg-gold', terracotta: 'bg-terracotta', plum: 'bg-plum', navy: 'bg-navy',
};

export default function HistoryPage() {
  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Historique des Modifications</h2>
        <p className="text-[12.5px] text-muted-foreground">Traçabilité complète de toutes les actions effectuées</p>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          {historyItems.map((item, i) => (
            <div key={i} className="flex gap-3 py-2.5 border-b border-ivory last:border-b-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColors[item.color] || 'bg-muted'}`} />
              <div className="flex-1">
                <div className="text-[12.5px] leading-relaxed">{item.text}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{item.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display text-sm font-semibold text-primary mb-4">Statistiques</h3>
            <div className="space-y-3">
              {[
                ['Actions cette semaine', '24', 'text-primary'],
                ['Tâches terminées', '8', 'text-sage'],
                ['Alertes déclenchées', '3', 'text-terracotta'],
              ].map(([label, value, color]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[12.5px] text-muted-foreground">{label}</span>
                  <span className={`font-display text-xl font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
