const teamMembers = [
  { initials: 'AD', name: 'Alice Dupont', role: 'Directrice Expansion', color: 'bg-navy', markets: 'Tous les marchés' },
  { initials: 'MR', name: 'Marc Richter', role: 'Country Manager', color: 'bg-sage', markets: '🇩🇪 Allemagne' },
  { initials: 'YT', name: 'Yuki Tanaka', role: 'Country Manager', color: 'bg-sky', markets: '🇯🇵 Japon · 🇦🇺 Australie' },
  { initials: 'CS', name: 'Carlos Silva', role: 'Country Manager', color: 'bg-terracotta', markets: '🇧🇷 Brésil' },
  { initials: 'AO', name: 'Amara Okafor', role: 'Country Manager', color: 'bg-plum', markets: '🇳🇬 Nigeria' },
  { initials: 'CF', name: 'Claire Finance', role: 'Analyste Financier', color: 'bg-gold', markets: 'Tous les marchés' },
];

export default function TeamPage() {
  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Équipe</h2>
        <p className="text-[12.5px] text-muted-foreground">Membres de l'équipe d'expansion internationale</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {teamMembers.map((m, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5 transition-all hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full ${m.color} flex items-center justify-center text-white text-sm font-bold`}>
                {m.initials}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-primary">{m.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{m.role}</div>
              </div>
            </div>
            <div className="text-[12px] text-muted-foreground bg-ivory rounded-lg px-3 py-2">
              📍 {m.markets}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
