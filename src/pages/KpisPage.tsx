import { countries } from '@/data/expansionData';

export default function KpisPage() {
  const launched = countries.filter(c => c.kpiCa !== 'N/A');

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">KPIs Post-Lancement</h2>
        <p className="text-[12.5px] text-muted-foreground">Performance commerciale des marchés lancés · Mise à jour mensuelle</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {launched.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-5">
            <div className="text-[28px] mb-2">{c.flag}</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">{c.name}</div>
            <div className="space-y-1.5">
              {[
                ['CA/mois', c.kpiCa],
                ['Clients', c.kpiClients],
                ['NPS', c.kpiNps],
                ['Rétention', c.kpiRet],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-baseline">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className="font-display text-xl font-bold text-primary">{val}</span>
                </div>
              ))}
            </div>
            {/* Mini sparkline */}
            <div className="flex items-end gap-1 h-9 mt-3">
              {[40, 55, 48, 62, 58, 70, 65, 78, 82, 88, 85, 92].map((v, i) => (
                <div key={i} className="flex-1 bg-sage/30 rounded-t-sm" style={{ height: `${v}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Japan detailed */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Objectifs vs Réalisé — Japon (marché le plus avancé)</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'CA Mensuel', value: '284K€', obj: '250K€', pct: '+14%', bg: 'bg-sage-light', textColor: 'text-sage-dark' },
            { label: 'Clients Actifs', value: '1,240', obj: '1,000', pct: '+24%', bg: 'bg-sky-light', textColor: 'text-sky' },
            { label: 'NPS Score', value: '72', obj: '60', pct: '+20%', bg: 'bg-gold-light', textColor: 'text-gold' },
            { label: 'Rétention', value: '89%', obj: '85%', pct: '+4pts', bg: 'bg-terracotta-light', textColor: 'text-terracotta' },
          ].map(item => (
            <div key={item.label} className={`text-center p-4 ${item.bg} rounded-lg`}>
              <div className={`text-[11px] font-semibold ${item.textColor} uppercase tracking-wide mb-2`}>{item.label}</div>
              <div className="font-display text-[26px] font-bold text-primary">{item.value}</div>
              <div className={`text-[11px] ${item.textColor} mt-1`}>
                obj: {item.obj} <span className="font-semibold text-sage">{item.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
