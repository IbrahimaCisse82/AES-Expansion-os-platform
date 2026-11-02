#!/usr/bin/env python3
"""Rapport de recette visuelle par profil : mission attendue, contrôles réussis, captures de chaque écran."""
import base64, html, io, json, os, sys
from PIL import Image

out = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('E2E_OUT', 'e2e-report')
VIS = f'{out}/visual'
idx = json.load(open(f'{VIS}/index.json'))
res = json.load(open(f'{out}/results.json')) if os.path.exists(f'{out}/results.json') else {'results': []}
FINDINGS = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else []

MISSION = {
    'admin': ('Administrateur', 'Administre la plateforme : les 4 environnements, la matrice des accès par rôle et les comptes.'),
    'director': ('Directrice générale', 'Pilote l’ensemble : voit tout, valide tous les rapports, suit la trésorerie et les ventes.'),
    'raf': ('RAF', 'Tient la Finance (budgets, trésorerie, compte de résultat, KPI), saisit les encaissements, valide l’A4.'),
    'dhr': ('DRH', 'Saisit les KPI RH, rédige et valide les rapports RH (A5–A8, A11) ; consulte la Finance.'),
    'commercial_director': ('Directeur commercial', 'Fixe les objectifs, gère les ventes de toutes les équipes, rédige l’A2.'),
    'technical_director': ('Directeur technique', 'Modélise les kits, suit livraisons et capacité, rédige l’A3.'),
    'sales_rep': ('Commercial (Issa)', 'Crée et signe ses propres devis ; consulte le reste en lecture seule.'),
    'sales_rep2': ('Commerciale (Mariam)', 'Mêmes droits qu’Issa, sans pouvoir modifier les devis d’Issa.'),
    'technician': ('Technicien', 'Enregistre les livraisons, ajuste la composition des kits, rédige les fiches d’intervention A12.'),
    'logistics': ('Logistique / magasin', 'Tient le stock, les prix fournisseurs et les zones.'),
    'country_manager': ('Country manager', 'Suit son pays dans Expansion (jalons, tâches, risques) et le Reporting.'),
    'analyst': ('Analyste', 'Consulte les 4 environnements et la BI, sans saisie opérationnelle.'),
    'observer': ('Observateur', 'Lecture seule dans les 4 environnements.'),
    'partner': ('Partenaire', 'Lecture seule de l’environnement Expansion uniquement.'),
}
ENV = {'expansion': 'Expansion', 'tc': 'Technico-commercial', 'finance': 'Finance', 'reporting': 'Reporting'}

def thumb(path, w=760):
    im = Image.open(path).convert('RGB')
    im = im.resize((w, int(im.height * w / im.width)))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=52, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

esc = lambda s: html.escape(str(s))
checks = {}
for r in res['results']:
    checks.setdefault(r['profile'], []).append(r)

nav, sections = [], []
total_ok = sum(r['ok'] for r in res['results']); total = len(res['results'])
for p in idx:
    name, mission = MISSION.get(p['key'], (p['key'], ''))
    cs = checks.get(p['key'], [])
    ok = sum(c['ok'] for c in cs)
    status = 'ok' if ok == len(cs) and not p['errors'] else 'ko'
    nav.append(f'<a href="#{p["key"]}" class="chip {status}">{esc(name)}</a>')
    lis = ''.join(f'<li class="{"ok" if c["ok"] else "ko"}"><span>{"✓" if c["ok"] else "✗"}</span>{esc(c["check"])}</li>' for c in cs)
    figs = ''.join(f'<figure><img loading="lazy" src="{thumb(f"{VIS}/{s["file"]}")}" alt="{esc(s["label"])}"><figcaption>{esc(s["label"])}</figcaption></figure>' for s in p['shots'])
    sections.append(f"""<section id="{p['key']}">
<header class="ph"><div><h2>{esc(name)}</h2><p class="mis">{esc(mission)}</p></div>
<div class="envs">{''.join(f'<span class="env">{ENV[e]}</span>' for e in p['envs'])}</div></header>
<div class="cols"><div class="chk"><h3>Contrôles automatiques <b>{ok}/{len(cs)}</b></h3><ul>{lis or '<li>—</li>'}</ul>
{'<p class="err">Erreurs JavaScript : ' + esc('; '.join(p['errors'][:2])) + '</p>' if p['errors'] else ''}</div>
<div class="gal">{figs}</div></div></section>""")

fixed = ''.join(f'<li>{esc(f)}</li>' for f in FINDINGS)
page = f"""<title>Recette visuelle AES</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{{--bg:#f4f6f5;--card:#ffffff;--fg:#17221d;--mut:#5f6e67;--line:#dde4e0;--acc:#1f6f54;--ok:#2f7a4f;--ko:#b3412e;--okbg:#e5f2ea;--kobg:#f9e7e3}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#111714;--card:#18201c;--fg:#e6eee9;--mut:#9aaba2;--line:#2a3530;--acc:#6cc39b;--ok:#79c99a;--ko:#ee8b77;--okbg:#17271e;--kobg:#2d1b17;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#111714;--card:#18201c;--fg:#e6eee9;--mut:#9aaba2;--line:#2a3530;--acc:#6cc39b;--ok:#79c99a;--ko:#ee8b77;--okbg:#17271e;--kobg:#2d1b17;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif}}
main{{max-width:1180px;margin:0 auto;padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:20px}}
h1{{font-size:24px;margin:0;text-wrap:balance}}.sub{{color:var(--mut);margin:4px 0 0;max-width:70ch}}
.sum{{display:flex;flex-wrap:wrap;gap:10px}}.sum div{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}}.sum b{{display:block;font-size:20px;font-variant-numeric:tabular-nums}}.sum span{{font-size:12px;color:var(--mut)}}
.nav{{display:flex;flex-wrap:wrap;gap:6px}}.chip{{text-decoration:none;color:var(--fg);border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 10px;font-size:12.5px}}.chip.ok::before{{content:"✓ ";color:var(--ok)}}.chip.ko::before{{content:"✗ ";color:var(--ko)}}
.chip:focus-visible{{outline:2px solid var(--acc)}}
.fix{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px}}.fix h2{{font-size:15px;margin:0 0 6px}}.fix ul{{margin:0;padding-left:18px}}.fix li{{margin:3px 0}}
section{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;scroll-margin-top:12px;min-width:0}}
.ph{{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:flex-start}}h2{{font-size:17px;margin:0}}.mis{{margin:2px 0 0;color:var(--mut);max-width:70ch}}
.envs{{display:flex;flex-wrap:wrap;gap:6px}}.env{{font-size:11.5px;border-radius:6px;padding:2px 8px;background:var(--okbg);color:var(--acc)}}
.cols{{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:16px;margin-top:12px}}@media (max-width:820px){{.cols{{grid-template-columns:minmax(0,1fr)}}}}
.chk h3{{font-size:13px;margin:0 0 6px;color:var(--mut);font-weight:600}}.chk h3 b{{color:var(--fg)}}.chk ul{{list-style:none;margin:0;padding:0;display:grid;gap:4px}}.chk li{{display:grid;grid-template-columns:16px 1fr;gap:4px;font-size:12.5px}}
.chk li.ok span{{color:var(--ok)}}.chk li.ko{{color:var(--ko)}}.err{{color:var(--ko);font-size:12px}}
.gal{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;min-width:0}}figure{{margin:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--bg)}}
figure img{{display:block;width:100%;max-width:100%;cursor:zoom-in}}figcaption{{font-size:11.5px;color:var(--mut);padding:5px 8px}}
#lb{{position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:9;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}}#lb img{{max-width:100%;max-height:100%}}
</style>
<main lang="fr">
<header><h1>Recette visuelle par profil — plateforme AES</h1>
<p class="sub">Chaque profil a été ouvert dans l’application avec un exercice 2026 complet : environnements visibles, chaque module, et les gestes propres au rôle (créer ou ouvrir un devis, valider un rapport, saisir en finance, cloche, recherche).</p></header>
<div class="sum"><div><b>{len(idx)}</b><span>profils</span></div><div><b>{sum(len(p['shots']) for p in idx)}</b><span>écrans capturés</span></div>
<div><b>{total_ok}/{total}</b><span>contrôles automatiques réussis</span></div></div>
<nav class="nav" aria-label="Profils">{''.join(nav)}</nav>
{f'<div class="fix"><h2>Défauts trouvés pendant la revue visuelle, corrigés</h2><ul>{fixed}</ul></div>' if fixed else ''}
{''.join(sections)}
</main><div id="lb" hidden><img alt="Capture agrandie"></div>
<script>
const lb=document.getElementById('lb'),li=lb.querySelector('img');
document.addEventListener('click',e=>{{const im=e.target.closest('figure img');if(im){{li.src=im.src;li.alt=im.alt;lb.hidden=false}}else if(e.target.closest('#lb'))lb.hidden=true}});
document.addEventListener('keydown',e=>{{if(e.key==='Escape')lb.hidden=true}});
</script>"""
open(f'{out}/recette-visuelle.html', 'w').write(page)
print(f'{out}/recette-visuelle.html', round(len(page) / 1e6, 1), 'Mo')
