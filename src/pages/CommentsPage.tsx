const comments = [
  { author: 'Alice Dupont', initials: 'AD', color: 'bg-navy', time: 'Il y a 2h', market: '🇯🇵 Japon', text: 'Super nouvelles du Japon ! Le contrat avec Tokyo Distribution est signé. Yuki, on peut prévoir le brief équipe pour la semaine prochaine ?', tags: ['#Japon', '#Lancement'] },
  { author: 'Yuki Tanaka', initials: 'YT', color: 'bg-sky', time: 'Il y a 3h', market: '🇯🇵 Japon', text: 'Bien sûr ! Je prépare le deck pour le lancement de septembre. @Alice je t\'envoie le draft vendredi.', tags: ['#Japon'] },
  { author: 'Marc Richter', initials: 'MR', color: 'bg-sage', time: 'Hier', market: '🇩🇪 Allemagne', text: 'La visite du bureau à Berlin s\'est très bien passée. Espace parfait, 350m². Signature du bail prévue le 20 juillet.', tags: ['#Allemagne', '#Bureau'] },
  { author: 'Amara Okafor', initials: 'AO', color: 'bg-plum', time: 'Hier', market: '🇳🇬 Nigeria', text: '⚠️ Attention : le gouvernement nigérian vient de publier de nouvelles réglementations sur les opérateurs étrangers.', tags: ['#Nigeria', '#Risque'] },
  { author: 'Carlos Silva', initials: 'CS', color: 'bg-terracotta', time: 'Il y a 3j', market: '🇧🇷 Brésil', text: 'L\'ANVISA a reçu notre dossier. Délai de traitement estimé à 4-6 mois. On reste dans les temps.', tags: ['#Brésil', '#ANVISA'] },
];

export default function CommentsPage() {
  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Commentaires & Discussions</h2>
        <p className="text-[12.5px] text-muted-foreground">Échanges de l'équipe sur les marchés et tâches</p>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          {comments.map((c, i) => (
            <div key={i} className="flex gap-3 py-3.5 border-b border-ivory last:border-b-0">
              <div className={`w-8 h-8 rounded-full ${c.color} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 mt-0.5`}>
                {c.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-primary">{c.author}</span>
                  <span className="text-[11px] text-muted-foreground">{c.time}</span>
                  <span className="text-[11px] text-muted-foreground ml-auto">{c.market}</span>
                </div>
                <div className="text-[13px] leading-relaxed">{c.text}</div>
                <div className="flex gap-1.5 mt-1.5">
                  {c.tags.map(t => (
                    <span key={t} className="text-[10.5px] font-medium bg-ivory text-muted-foreground px-2 py-0.5 rounded-md">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-ivory">
            <textarea
              className="w-full p-3 border-[1.5px] border-border rounded-lg text-[13.5px] bg-cream outline-none focus:border-sage focus:bg-card transition-colors resize-none font-sans"
              rows={3}
              placeholder="Ajouter un commentaire…"
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-navy-mid transition-colors">
                Publier →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 h-fit">
          <h3 className="font-display text-sm font-semibold text-primary mb-3">Filtrer par marché</h3>
          <div className="space-y-1.5">
            {['Tous les marchés', '🇩🇪 Allemagne', '🇯🇵 Japon', '🇧🇷 Brésil', '🇳🇬 Nigeria'].map((m, i) => (
              <button key={m} className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] transition-colors ${
                i === 0 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-ivory'
              }`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
