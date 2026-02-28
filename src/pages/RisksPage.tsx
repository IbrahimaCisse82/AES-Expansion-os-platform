import { risks } from '@/data/expansionData';

const levelConfig = {
  high: { bg: 'bg-[#FEE8E6]', text: 'text-[#C0392B]', bar: 'bg-[#C0392B]', label: 'Élevé' },
  medium: { bg: 'bg-gold-light', text: 'text-gold', bar: 'bg-gold', label: 'Moyen' },
  low: { bg: 'bg-sage-light', text: 'text-sage-dark', bar: 'bg-sage', label: 'Faible' },
};

export default function RisksPage() {
  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Registre des Risques</h2>
        <p className="text-[12.5px] text-muted-foreground">Suivi et priorisation des risques par marché</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Risques Actifs</h3>
          <div className="space-y-0">
            {risks.map((r, i) => {
              const cfg = levelConfig[r.level];
              return (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-ivory last:border-b-0">
                  <div className={`w-[5px] h-[34px] rounded-sm flex-shrink-0 ${cfg.bar}`} />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{r.title}</div>
                    <div className="text-[11.5px] text-muted-foreground">{r.country} · {r.category}</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-display text-[15.5px] font-semibold text-primary mb-4">Matrice Impact / Probabilité</h3>
          <div className="space-y-1.5">
            {['ÉLEVÉ', 'MOYEN', 'FAIBLE'].map((level, row) => (
              <div key={level} className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5 items-center">
                <div className="text-[9.5px] font-bold text-muted-foreground text-right pr-1.5">{level}</div>
                {[0, 1, 2].map(col => {
                  const isHighImpact = row === 0 && col === 0;
                  const isMedium = row === 1 && col === 1;
                  const isLow = row === 2 && col === 0;
                  const bgColor = row === 0 ? 'bg-[#FEE8E6]' : row === 1 ? (col === 0 ? 'bg-sage-light' : 'bg-gold-light') : 'bg-sage-light';
                  return (
                    <div key={col} className={`h-[60px] ${bgColor} rounded-md flex items-center justify-center`}>
                      {isHighImpact && <span className="text-[11px] font-bold text-[#C0392B]">2</span>}
                      {isMedium && <span className="text-[11px] font-bold text-gold">2</span>}
                      {isLow && <span className="text-[11px] font-bold text-sage-dark">1</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5 mt-1">
              <div />
              {['FAIBLE', 'MOYEN', 'ÉLEVÉ'].map(l => (
                <div key={l} className="text-[9.5px] font-bold text-muted-foreground text-center">{l}</div>
              ))}
            </div>
            <div className="text-center text-[10.5px] text-muted-foreground">← Probabilité →</div>
          </div>
        </div>
      </div>
    </div>
  );
}
