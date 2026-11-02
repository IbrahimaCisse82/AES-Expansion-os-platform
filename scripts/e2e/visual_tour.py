#!/usr/bin/env python3
"""Tour visuel : capture chaque module tel que le voit chaque profil, avec les états d'action propres au rôle
(dialogue de devis, validation de rapport, saisie finance, cloche, recherche). Produit E2E_OUT/visual/index.json."""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'full_e2e.py')).read().split('async def main():')[0]
ns = {}; exec(src, ns)
Actor, USERS, OUT, ENV_NAV, BI_ROLES, sql, expected_envs = ns['Actor'], ns['USERS'], ns['OUT'], ns['ENV_NAV'], ns['BI_ROLES'], ns['sql'], ns['expected_envs']
VIS = f'{OUT}/visual'; os.makedirs(VIS, exist_ok=True)

LABEL = {p: p.replace('/app/', '') for e in ENV_NAV.values() for p in e}
# Pages dont l'affichage dépend du rôle (droits d'édition) : capturées pour tous les profils concernés
ROLE_SENSITIVE = {'/app/tc/dg', '/app/tc/ventes', '/app/tc/objectifs', '/app/tc/kits', '/app/tc/stock', '/app/tc/referentiels',
                  '/app/finance', '/app/finance/budgets', '/app/finance/tresorerie', '/app/finance/kpi',
                  '/app/reporting', '/app/reporting/a-valider', '/app/dashboard', '/app/tasks', '/app/budget'}

async def capture(a, shots, label, full=False):
    f = f'{a.key}__{len(shots):02d}.jpg'
    await a.page.screenshot(path=f'{VIS}/{f}', full_page=full, type='jpeg', quality=70)
    shots.append({'label': label, 'file': f, 'path': a.path()})

async def profile(browser, key, everything):
    shots = []
    async with Actor(browser, key) as a:
        envs = expected_envs(a.role)
        await a.go('/app', 1500); await capture(a, shots, 'Arrivée')
        await a.page.get_by_role('button', name=re.compile('^Notifications')).click(); await a.page.wait_for_timeout(500)
        await capture(a, shots, 'Cloche de notifications'); await a.page.keyboard.press('Escape'); await a.page.mouse.click(700, 500)
        for e in envs:
            for p in ENV_NAV[e]:
                if p == '/app/bi' and a.role not in BI_ROLES: continue
                if not everything and p not in ROLE_SENSITIVE: continue
                await a.go(p, 900); await capture(a, shots, LABEL[p])
                if p == '/app/tc/ventes':
                    if await a.page.get_by_role('button', name='Nouveau devis').count():
                        await a.page.get_by_role('button', name='Nouveau devis').click(); await a.page.wait_for_timeout(600)
                        await capture(a, shots, 'Journal › nouveau devis'); await a.page.keyboard.press('Escape'); await a.page.wait_for_timeout(300)
                    own = USERS.get('sales_rep', {}).get('name', '')
                    row = a.page.get_by_role('row').filter(has_text='Vendu').filter(has_text=own).first
                    if await row.count():
                        await row.click(); await a.page.wait_for_timeout(700)
                        await capture(a, shots, 'Journal › devis signé d’Issa (édition ou lecture seule)'); await a.page.keyboard.press('Escape')
                if p == '/app/reporting/a-valider':
                    rid = sql("select id from bi_report_instances where template_code='A3' and status='submitted' limit 1")
                    if rid:
                        await a.go(f'/app/reporting/{rid}', 1000); await capture(a, shots, 'Rapport A3 soumis (boutons selon le rôle)')
                    await a.go('/app/reporting/nouveau/A2', 1000)
                    btn = a.page.get_by_role('button', name='Pré-remplir depuis la plateforme')
                    if await btn.count():
                        await a.page.get_by_label('Période').fill('2026-10'); await btn.click(); await a.page.wait_for_timeout(800)
                    await capture(a, shots, 'Nouveau rapport A2 (pré-rempli si autorisé)')
        if 'expansion' in envs and everything:
            await a.go('/app/countries/bf', 1200); await capture(a, shots, 'Fiche pays Burkina Faso')
        for p, lab in (('/app/comments', 'Discussions'), ('/app/settings', 'Paramètres')):
            await a.go(p, 900); await capture(a, shots, lab)
        await a.go(ENV_NAV[envs[0]][0] if envs else '/app', 900)
        await a.page.keyboard.press('Control+k'); await a.page.wait_for_timeout(400)
        await a.page.keyboard.type('a'); await a.page.wait_for_timeout(700)
        await capture(a, shots, 'Recherche Ctrl+K')
        errors = list(a.errors)
    return {'key': key, 'role': a.role, 'name': USERS[key]['name'], 'envs': envs, 'shots': shots, 'errors': errors}

async def main():
    only = sys.argv[1:]
    res = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for k in USERS:
            if only and k not in only: continue
            print('…', k, flush=True)
            res.append(await profile(b, k, everything=(k in ('admin',))))
        await b.close()
    old = {}
    if os.path.exists(f'{VIS}/index.json') and only:
        old = {r['key']: r for r in json.load(open(f'{VIS}/index.json'))}
    for r in res: old[r['key']] = r
    order = list(USERS)
    json.dump([old[k] for k in order if k in old], open(f'{VIS}/index.json', 'w'), ensure_ascii=False, indent=1)
    print('captures :', sum(len(r['shots']) for r in res))

asyncio.run(main())
