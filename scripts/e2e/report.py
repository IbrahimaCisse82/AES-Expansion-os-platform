#!/usr/bin/env python3
"""Transforme E2E_OUT/results.json en un rapport HTML autonome (captures intégrées)."""
import base64, html, json, os, sys
from collections import OrderedDict

out = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('E2E_OUT', 'e2e-report')
data = json.load(open(f'{out}/results.json'))
res = data['results']
ok, total = data['counts']['ok'], data['counts']['total']
PROFILE = {
    'admin': 'Administrateur', 'director': 'Directrice générale', 'raf': 'RAF', 'dhr': 'DRH', 'commercial_director': 'Directeur commercial',
    'technical_director': 'Directeur technique', 'sales_rep': 'Commercial (Issa)', 'sales_rep2': 'Commercial (Mariam)', 'technician': 'Technicien',
    'logistics': 'Logistique / magasin', 'country_manager': 'Country manager', 'analyst': 'Analyste', 'observer': 'Observateur', 'partner': 'Partenaire',
    'runner': 'Exécution',
}
DATASET = {'users': 'utilisateurs', 'sales': 'devis et ventes', 'signed': 'ventes signées', 'budget_lines': 'lignes budgétaires',
           'treasury_values': 'écritures de trésorerie', 'kpi_values': 'valeurs de KPI', 'reports': 'rapports A1–A12', 'comments': 'messages',
           'notifications': 'notifications', 'tasks': 'tâches', 'risks': 'risques'}

def img(path):
    if not path or not os.path.exists(f'{out}/{path}'): return ''
    return 'data:image/jpeg;base64,' + base64.b64encode(open(f'{out}/{path}', 'rb').read()).decode()

sections = OrderedDict()
for r in res: sections.setdefault(r['section'], []).append(r)

def esc(s): return html.escape(str(s))

rows_html = []
for sec, items in sections.items():
    n_ok = sum(i['ok'] for i in items)
    lis = []
    for i in items:
        shot = img(i.get('shot'))
        lis.append(f"""<tr class="{'ok' if i['ok'] else 'ko'}">
<td class="st">{'✓' if i['ok'] else '✗'}</td><td class="pf">{esc(PROFILE.get(i['profile'], i['profile']))}</td>
<td>{esc(i['check'])}{f'<div class="det">{esc(i["detail"])}</div>' if i['detail'] and not i['ok'] else ''}</td>
<td class="sh">{f'<a href="#" data-src="{shot}" class="thumb">capture</a>' if shot else ''}</td></tr>""")
    rows_html.append(f"""<section><h2>{esc(sec)} <span class="count {'all' if n_ok == len(items) else 'some'}">{n_ok}/{len(items)}</span></h2>
<div class="tw"><table><thead><tr><th></th><th>Profil</th><th>Contrôle</th><th></th></tr></thead><tbody>{''.join(lis)}</tbody></table></div></section>""")

gallery = []
seen = set()
for r in res:
    s = r.get('shot')
    if s and s not in seen and os.path.exists(f'{out}/{s}'):
        seen.add(s)
        gallery.append(f'<figure><img loading="lazy" src="{img(s)}" alt=""><figcaption>{esc(PROFILE.get(r["profile"], r["profile"]))} — {esc(r["check"])}</figcaption></figure>')

ds = ''.join(f'<div class="kv"><b>{esc(v)}</b><span>{esc(DATASET.get(k, k))}</span></div>' for k, v in data['dataset'].items())
fails = [r for r in res if not r['ok']]
page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recette E2E AES</title>
<style>
:root{{--bg:#f7f5f1;--card:#fff;--fg:#1c2b3a;--mut:#6b7280;--line:#e5e1d8;--ok:#3f7d5a;--ko:#b4412f;--okbg:#e8f2ec;--kobg:#f8e6e2}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#12171d;--card:#1a2129;--fg:#e8edf2;--mut:#9aa4b1;--line:#2a333d;--ok:#7cc59a;--ko:#ef8a78;--okbg:#18291f;--kobg:#2e1a17}}}}
:root[data-theme="dark"]{{--bg:#12171d;--card:#1a2129;--fg:#e8edf2;--mut:#9aa4b1;--line:#2a333d;--ok:#7cc59a;--ko:#ef8a78;--okbg:#18291f;--kobg:#2e1a17}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:28px 16px 60px}}h1{{font-size:24px;margin:0 0 4px}}.sub{{color:var(--mut);margin:0 0 20px}}
.score{{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0 24px}}.big{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;min-width:150px}}
.big b{{display:block;font-size:26px}}.big span{{color:var(--mut);font-size:12.5px}}.big.good b{{color:var(--ok)}}.big.bad b{{color:var(--ko)}}
.ds{{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:28px}}.kv{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}}
.kv b{{display:block;font-size:18px}}.kv span{{color:var(--mut);font-size:12px}}
section{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:16px}}h2{{font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px}}
.count{{font-size:12px;padding:2px 8px;border-radius:999px}}.count.all{{background:var(--okbg);color:var(--ok)}}.count.some{{background:var(--kobg);color:var(--ko)}}
.tw{{overflow-x:auto}}table{{width:100%;border-collapse:collapse;font-size:13px}}th{{text-align:left;color:var(--mut);font-weight:500;padding:6px 8px;border-bottom:1px solid var(--line)}}
td{{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}}tr:last-child td{{border-bottom:0}}.st{{width:22px;font-weight:700}}tr.ok .st{{color:var(--ok)}}tr.ko .st{{color:var(--ko)}}
tr.ko{{background:var(--kobg)}}.pf{{white-space:nowrap;color:var(--mut)}}.det{{color:var(--ko);font-size:12px;margin-top:2px;word-break:break-word}}.sh{{white-space:nowrap}}
a.thumb{{color:inherit;font-size:12px}}.gal{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}}figure{{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}}
figure img{{width:100%;display:block;cursor:zoom-in}}figcaption{{padding:6px 10px;font-size:12px;color:var(--mut)}}
#lb{{position:fixed;inset:0;background:rgba(0,0,0,.8);display:none;align-items:center;justify-content:center;padding:16px;z-index:9}}#lb img{{max-width:100%;max-height:100%}}
.fails li{{margin-bottom:4px}}
</style></head><body><main>
<h1>Recette E2E — plateforme AES</h1>
<p class="sub">Exécutée le {esc(data['run_at'].replace('T', ' à '))} · 14 profils · 4 environnements · navigateur Chromium (bureau 1440 px et mobile 390 px)</p>
<div class="score">
<div class="big {'good' if ok == total else 'bad'}"><b>{ok}/{total}</b><span>contrôles réussis</span></div>
<div class="big"><b>{len(sections)}</b><span>blocs de test</span></div>
<div class="big"><b>{len(set(r['profile'] for r in res) - {'runner'})}</b><span>profils testés</span></div>
<div class="big {'good' if not fails else 'bad'}"><b>{len(fails)}</b><span>échec(s)</span></div>
</div>
{'<section class="fails"><h2>Échecs à traiter</h2><ul>' + ''.join(f'<li><b>{esc(PROFILE.get(f["profile"], f["profile"]))}</b> — {esc(f["check"])} <span class="det">{esc(f["detail"])}</span></li>' for f in fails) + '</ul></section>' if fails else ''}
<h2 style="margin:0 0 10px">Jeu de données de recette</h2><div class="ds">{ds}</div>
{''.join(rows_html)}
<section><h2>Captures</h2><div class="gal">{''.join(gallery)}</div></section>
</main><div id="lb"><img alt=""></div>
<script>
const lb=document.getElementById('lb'),li=lb.querySelector('img');
document.addEventListener('click',e=>{{const a=e.target.closest('a.thumb');const im=e.target.closest('figure img');
if(a){{e.preventDefault();li.src=a.dataset.src;lb.style.display='flex'}}else if(im){{li.src=im.src;lb.style.display='flex'}}else if(e.target.closest('#lb'))lb.style.display='none'}});
</script></body></html>"""
open(f'{out}/rapport-recette-e2e.html', 'w').write(page)
print(f'{out}/rapport-recette-e2e.html', ok, '/', total)
