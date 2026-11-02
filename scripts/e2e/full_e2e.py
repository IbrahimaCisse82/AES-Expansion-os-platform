#!/usr/bin/env python3
"""Recette E2E complète de la plateforme AES : 14 profils, 4 environnements, parcours métier de bout en bout.

Pré-requis (local uniquement) :
  - base peuplée par scripts/e2e/seed_full.sql (14 utilisateurs, exercice 2026 complet) ;
  - PostgREST + proxy d'authentification + Vite (VITE_SUPABASE_URL pointant sur le proxy) ;
  - variables : E2E_BASE (http://127.0.0.1:5173), E2E_USERS (users.json), E2E_JWT_SECRET, E2E_OUT (dossier du rapport),
    PGHOST/PGPORT/PGUSER/E2E_DB pour les vérifications en base.
Sortie : E2E_OUT/results.json + captures d'écran. Code retour 1 si un contrôle échoue.
"""
import asyncio, base64, datetime, hashlib, hmac, json, os, re, subprocess, sys, time
from playwright.async_api import async_playwright

BASE = os.environ.get('E2E_BASE', 'http://127.0.0.1:5173')
OUT = os.environ.get('E2E_OUT', 'e2e-report')
USERS = json.load(open(os.environ['E2E_USERS']))
SECRET = os.environ['E2E_JWT_SECRET']
DB = os.environ.get('E2E_DB', 'aes_e2e')
TODAY = datetime.date.today().isoformat()
RUN = datetime.datetime.now().strftime('%H%M%S')
os.makedirs(f'{OUT}/shots', exist_ok=True)

ENV_LABEL = {'expansion': 'Expansion', 'tc': 'Technico-commercial', 'finance': 'Finance', 'reporting': 'Reporting'}
ENV_NAV = {
    'expansion': ['/app/dashboard', '/app/roadmap', '/app/countries', '/app/tasks', '/app/calendar', '/app/risks', '/app/kpis',
                  '/app/market-analysis', '/app/budget', '/app/bi', '/app/history'],
    'tc': ['/app/tc/dg', '/app/tc/performance', '/app/tc/marges', '/app/tc/commissions', '/app/tc/analyses', '/app/tc/ventes',
           '/app/tc/objectifs', '/app/tc/kits', '/app/tc/synthese', '/app/tc/stock', '/app/tc/achats', '/app/tc/dormant',
           '/app/tc/capacite', '/app/tc/referentiels', '/app/tc/raci'],
    'finance': ['/app/finance', '/app/finance/budgets', '/app/finance/tresorerie', '/app/finance/resultat', '/app/finance/kpi'],
    'reporting': ['/app/reporting', '/app/reporting/a-valider', '/app/reporting/mes-rapports', '/app/reporting/modeles'],
}
COMMON = ['/app/comments', '/app/team', '/app/settings', '/app/profile']
BI_ROLES = {'admin', 'director', 'country_manager', 'dhr', 'technical_director', 'commercial_director', 'analyst', 'raf'}
SALES_CREATE = {'admin', 'director', 'commercial_director', 'sales_rep'}
FIN_EDIT = {'admin', 'director', 'raf'}
KPI_EDIT = {'admin', 'director', 'raf', 'dhr', 'technical_director', 'commercial_director'}

results = []
def check(section, profile, name, ok, detail='', shot=None):
    results.append({'section': section, 'profile': profile, 'check': name, 'ok': bool(ok), 'detail': str(detail)[:300], 'shot': shot})
    print(f"  {'✔' if ok else '✘'} [{profile}] {name}{' — ' + str(detail)[:160] if detail and not ok else ''}", flush=True)

def sql(q):
    r = subprocess.run(['psql', '-d', DB, '-Atc', q], capture_output=True, text=True)
    return r.stdout.strip()

def b64(o): return base64.urlsafe_b64encode(json.dumps(o, separators=(',', ':')).encode()).rstrip(b'=').decode()
def session(key):
    u = USERS[key]; exp = int(time.time()) + 8 * 3600
    data = f"{b64({'alg': 'HS256', 'typ': 'JWT'})}.{b64({'sub': u['id'], 'role': 'authenticated', 'aud': 'authenticated', 'email': u['email'], 'exp': exp})}"
    sig = base64.urlsafe_b64encode(hmac.new(SECRET.encode(), data.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
    return {'access_token': f'{data}.{sig}', 'token_type': 'bearer', 'expires_in': 28800, 'expires_at': exp, 'refresh_token': 'x',
            'user': {'id': u['id'], 'email': u['email'], 'aud': 'authenticated', 'role': 'authenticated', 'user_metadata': {'full_name': u['name']}, 'app_metadata': {}}}

IGNORED = ('WebSocket', 'realtime', 'functions/v1', 'ERR_', 'status of 404', 'fonts.g')
class Actor:
    def __init__(self, browser, key, mobile=False):
        self.browser, self.key, self.mobile = browser, key, mobile
        self.role = sql(f"select role from user_roles where user_id = '{USERS[key]['id']}'")
    async def __aenter__(self):
        vp = {'width': 390, 'height': 844} if self.mobile else {'width': 1440, 'height': 950}
        self.ctx = await self.browser.new_context(viewport=vp, locale='fr-FR', accept_downloads=True)
        await self.ctx.add_init_script(f"localStorage.setItem('sb-localhost-auth-token', {json.dumps(json.dumps(session(self.key)))});")
        self.page = await self.ctx.new_page(); self.errors = []
        self.page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' and not any(i in m.text for i in IGNORED) else None)
        self.page.on('pageerror', lambda e: self.errors.append('PAGEERROR ' + str(e)))
        return self
    async def __aexit__(self, *a): await self.ctx.close()
    async def go(self, path, wait=700):
        await self.page.goto(BASE + path, wait_until='networkidle'); await self.page.wait_for_timeout(wait)
    def path(self): return self.page.url.replace(BASE, '')
    async def shot(self, name, full=False):
        f = f'shots/{self.key}_{name}.jpg'
        await self.page.screenshot(path=f'{OUT}/{f}', full_page=full, type='jpeg', quality=55)
        return f
    async def toast(self):
        return ' | '.join(await self.page.locator('[data-sonner-toast]').all_inner_texts())
    async def unread(self):
        lab = await self.page.get_by_role('button', name=re.compile('^Notifications')).get_attribute('aria-label') or ''
        m = re.search(r'\((\d+) non lues\)', lab); return int(m.group(1)) if m else 0

def expected_envs(role):
    if role == 'admin': return ['expansion', 'tc', 'finance', 'reporting']
    rows = sql(f"select env from environment_access where role = '{role}' and enabled").split()
    return [e for e in ['expansion', 'tc', 'finance', 'reporting'] if e in rows]

# ---------------------------------------------------------------------------
# A. Tour complet par profil : environnements, toutes les pages, accès refusés, droits d'édition
# ---------------------------------------------------------------------------
async def tour(browser, key):
    sec = 'A. Profils & navigation'
    async with Actor(browser, key) as a:
        envs = expected_envs(a.role)
        await a.go('/app', 1200)
        landing = a.path()
        tabs = [t.strip() for t in await a.page.locator('[role=tablist][aria-label=Environnement] [role=tab]').all_inner_texts()]
        shown = [e for e, l in ENV_LABEL.items() if l in tabs] if tabs else envs[:1]
        check(sec, key, f'environnements visibles = {", ".join(ENV_LABEL[e] for e in envs)}', shown == envs, f'vu : {tabs}')
        def env_of(path):
            for e, pages in ENV_NAV.items():
                if any(path.split('?')[0] == p or path.startswith(p + '/') for p in pages): return e
            return None
        check(sec, key, 'arrivée dans un environnement autorisé', env_of(landing) in envs, landing)
        shot = await a.shot('accueil')
        pages_ok, failures = 0, []
        for e in envs:
            for p in ENV_NAV[e]:
                if p == '/app/bi' and a.role not in BI_ROLES: continue
                n0 = len(a.errors)
                await a.go(p, 500)
                body = await a.page.locator('main').inner_text()
                over = await a.page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
                bad = a.path().split('?')[0] != p or len(body) < 40 or 'Impossible de charger' in body or over or len(a.errors) > n0
                if bad: failures.append(f"{p} → {a.path()} {'débordement ' if over else ''}{a.errors[n0:n0+1]}")
                else: pages_ok += 1
        total = sum(len([p for p in ENV_NAV[e] if p != '/app/bi' or a.role in BI_ROLES]) for e in envs)
        check(sec, key, f'{total} pages des environnements ouvertes sans erreur', not failures, '; '.join(failures[:3]), shot)
        for p in COMMON:
            await a.go(p, 400)
            if a.path() != p: check(sec, key, f'page commune {p}', False, a.path())
        denied = [e for e in ENV_NAV if e not in envs]
        leaks = []
        for e in denied:
            await a.go(ENV_NAV[e][1] if len(ENV_NAV[e]) > 1 else ENV_NAV[e][0], 900)
            if env_of(a.path()) == e: leaks.append(f'{e} ({a.path()})')
        if denied: check(sec, key, f'accès refusé à {", ".join(ENV_LABEL[e] for e in denied)} (redirection)', not leaks, leaks)
        # Droits d'édition visibles
        if 'tc' in envs:
            await a.go('/app/tc/ventes', 900)
            has_btn = await a.page.get_by_role('button', name='Nouveau devis').count() > 0
            check('B. Droits par rôle', key, f"« Nouveau devis » {'présent' if a.role in SALES_CREATE else 'absent'}", has_btn == (a.role in SALES_CREATE))
        if 'finance' in envs:
            await a.go('/app/finance/tresorerie', 900)
            editable = await a.page.locator('main table input').count() > 0
            check('B. Droits par rôle', key, f"trésorerie {'modifiable' if a.role in FIN_EDIT else 'en lecture seule'}", editable == (a.role in FIN_EDIT))
            await a.go('/app/finance/kpi', 900)
            kedit = await a.page.locator('main table input').count() > 0
            check('B. Droits par rôle', key, f"KPI officiels {'saisissables' if a.role in KPI_EDIT else 'en lecture seule'}", kedit == (a.role in KPI_EDIT))
        await a.go('/app/settings', 900)
        sw = a.page.get_by_role('switch', name='Commercial — Finance', exact=True)
        if await sw.count():
            check('B. Droits par rôle', key, f"matrice des environnements {'modifiable' if a.role == 'admin' else 'non modifiable'}", (not await sw.is_disabled()) == (a.role == 'admin'))
        check(sec, key, 'aucune erreur JavaScript pendant le parcours', not a.errors, a.errors[:2])

# ---------------------------------------------------------------------------
# C. Parcours métier de bout en bout
# ---------------------------------------------------------------------------
async def sales_cycle(browser):
    sec = 'C1. Cycle de vente (Technico-commercial → Finance)'
    client = f'Recette {RUN}'
    raf_before = int(sql(f"select count(*) from notifications where user_id = '{USERS['raf']['id']}'") or 0)
    async with Actor(browser, 'sales_rep') as a:
        await a.go('/app/tc/ventes', 1200)
        await a.page.get_by_role('button', name='Nouveau devis').click()
        dlg = a.page.get_by_role('dialog')
        await dlg.get_by_label('Client', exact=True).fill(client)
        await dlg.get_by_label('Quantité', exact=True).fill('2')
        await dlg.get_by_role('button', name='Enregistrer').click(); await a.page.wait_for_timeout(1500)
        row = a.page.get_by_role('row').filter(has_text=client)
        check(sec, 'sales_rep', 'le commercial crée un devis', await row.count() == 1)
        await row.click(); dlg = a.page.get_by_role('dialog')
        await dlg.get_by_label('Date de vente (signature)').fill(TODAY)
        await dlg.get_by_role('button', name='Enregistrer').click(); await a.page.wait_for_timeout(1500)
        check(sec, 'sales_rep', 'il signe la vente (statut « Vendu »)', 'Vendu' in await row.inner_text())
        snap = sql(f"select unit_cost_snapshot is not null and catalog_price_snapshot is not null and install_hours_snapshot is not null from tc_sales where client = '{client}'")
        check(sec, 'sales_rep', 'coût, prix et heures figés à la signature', snap == 't', snap)
        await row.click(); dlg = a.page.get_by_role('dialog')
        await dlg.get_by_label('Acompte encaissé').fill('999999999'); await dlg.get_by_label('Date acompte').fill(TODAY)
        await dlg.get_by_role('button', name='Enregistrer').click(); await a.page.wait_for_timeout(900)
        check(sec, 'sales_rep', 'trop-perçu refusé', 'dépassent le montant TTC' in await a.toast(), await a.toast())
        await a.page.keyboard.press('Escape')
        check(sec, 'sales_rep', 'aucune erreur JavaScript', not a.errors, a.errors[:2], await a.shot('vente_signee'))
    raf_after = int(sql(f"select count(*) from notifications where user_id = '{USERS['raf']['id']}' and type = 'tc_sale_signed'") or 0)
    check(sec, 'raf', 'le RAF est notifié de la vente signée', raf_after >= 1, f'{raf_before} → {raf_after}')
    async with Actor(browser, 'sales_rep2') as a:
        await a.go(f'/app/tc/ventes?q={client.split()[-1]}', 1200)
        await a.page.get_by_role('row').filter(has_text=client).click()
        ro = await a.page.get_by_role('dialog').locator('fieldset[disabled]').count() > 0
        check(sec, 'sales_rep2', "un autre commercial ne peut pas modifier ce devis", ro)
    async with Actor(browser, 'technician') as a:
        await a.go(f'/app/tc/ventes?q={client.split()[-1]}', 1200)
        await a.page.get_by_role('row').filter(has_text=client).click(); dlg = a.page.get_by_role('dialog')
        await dlg.get_by_label('Date de livraison').fill(TODAY)
        await dlg.get_by_role('button', name='Enregistrer').click(); await a.page.wait_for_timeout(1500)
        check(sec, 'technician', 'le technicien enregistre la livraison (statut « Livré »)', 'Livré' in await a.page.get_by_role('row').filter(has_text=client).inner_text())
    rep_n = sql(f"select count(*) from notifications where user_id = '{USERS['sales_rep']['id']}' and type = 'tc_sale_delivered'")
    check(sec, 'sales_rep', 'le commercial est notifié de la livraison', int(rep_n or 0) >= 1)
    async with Actor(browser, 'raf') as a:
        await a.go('/app/finance', 1200)
        badge = int(await a.unread())
        check(sec, 'raf', 'la cloche du RAF affiche les notifications non lues', badge >= 2, badge)
        await a.page.get_by_role('button', name=re.compile('^Notifications')).click()
        await a.page.get_by_text(f'Livraison effectuée : {client}').first.click(); await a.page.wait_for_timeout(1500)
        check(sec, 'raf', 'la notification ouvre le devis dans le journal', '/app/tc/ventes?q=' in a.path() and await a.page.locator('main tbody tr').count() == 1, a.path())
        await a.page.get_by_role('row').filter(has_text=client).click(); dlg = a.page.get_by_role('dialog')
        await dlg.get_by_label('Acompte encaissé').fill('500000'); await dlg.get_by_label('Date acompte').fill(TODAY)
        await dlg.get_by_role('button', name='Enregistrer').click(); await a.page.wait_for_timeout(1500)
        dep = sql(f"select deposit_amount from tc_sales where client = '{client}'")
        check(sec, 'raf', 'le RAF saisit l’acompte encaissé', dep.startswith('500000'), dep, await a.shot('acompte'))

async def finance_flow(browser):
    sec = 'C2. Finance'
    async with Actor(browser, 'raf') as a:
        await a.go('/app/finance/tresorerie', 1500)
        btn = a.page.get_by_role('button', name=re.compile('Reprendre les encaissements'))
        has = await btn.count() > 0
        check(sec, 'raf', 'encaissements du journal proposés en trésorerie', has)
        if has:
            await btn.click(); await a.page.wait_for_timeout(1800)
        n = sql("select count(*) from fin_treasury_values where line_code in ('enc_pv','enc_pompage') and month between 1 and 12")
        check(sec, 'raf', 'encaissements repris dans la trésorerie (base)', int(n or 0) > 5, n)
        await a.go('/app/finance/resultat', 1200)
        b2 = a.page.get_by_role('button', name=re.compile('Reprendre le réalisé'))
        if await b2.count(): await b2.click(); await a.page.wait_for_timeout(1800)
        ca = sql("select actual from fin_pnl_values where line_code = 'ca_pompage'")
        check(sec, 'raf', 'chiffre d’affaires réalisé repris des ventes dans le compte de résultat', float(ca or 0) > 0, ca)
        await a.go('/app/finance/budgets', 1200)
        await a.page.get_by_role('button', name='COMM', exact=True).click(); await a.page.wait_for_timeout(500)
        inp = a.page.locator('main table input').first
        await inp.fill('3456000'); await inp.press('Enter'); await a.page.wait_for_timeout(1500)
        v = sql("select m1+m2+m3+m4+m5+m6+m7+m8+m9+m10+m11+m12 from budget_lines bl join bi_poles p on p.id = bl.pole_id where p.code='COMM' and line_type='budget' order by (m1+m2+m3+m4+m5+m6+m7+m8+m9+m10+m11+m12 = 3456) desc limit 1")
        check(sec, 'raf', 'budget annuel d’un poste saisi et réparti sur 12 mois (stocké en milliers)', v.startswith('3456'), v)
        await a.go('/app', 800); await a.go('/app/finance', 1200)
        check(sec, 'raf', 'vue d’ensemble Finance cohérente (4 indicateurs)', await a.page.get_by_text('Exécution budgétaire').count() == 1, '', await a.shot('finance', True))
        check(sec, 'raf', 'aucune erreur JavaScript', not a.errors, a.errors[:2])
    async with Actor(browser, 'dhr') as a:
        await a.go('/app/finance/kpi', 1500)
        row = a.page.get_by_role('row').filter(has_text='RH1')
        inp = row.locator('input').nth(1)
        await inp.fill('44'); await inp.press('Tab'); await a.page.wait_for_timeout(1500)
        v = sql("select actual from fin_kpi_values where kpi_code='RH1' order by month desc limit 1")
        check(sec, 'dhr', 'la DRH saisit l’effectif réalisé (KPI RH1)', v.startswith('44'), v)
        await a.go('/app/finance/tresorerie', 1200)
        check(sec, 'dhr', 'la DRH consulte la trésorerie en lecture seule', await a.page.locator('main table input').count() == 0)

async def reporting_flow(browser):
    sec = 'C3. Reporting'
    async with Actor(browser, 'commercial_director') as a:
        await a.go('/app/reporting/nouveau/A2', 1500)
        await a.page.get_by_label('Période').fill('2026-10')
        await a.page.get_by_role('button', name='Pré-remplir depuis la plateforme').click(); await a.page.wait_for_timeout(800)
        ca = await a.page.get_by_role('row').filter(has_text='CA réalisé (FCFA)').locator('input').nth(1).input_value()
        check(sec, 'commercial_director', 'A2 pré-rempli depuis les ventes d’octobre', ca not in ('', '0'), ca)
        await a.page.get_by_label('1. Résumé exécutif du mois').fill('Octobre en retrait, pipeline pompage solide.')
        await a.page.get_by_role('button', name='Soumettre pour validation').click(); await a.page.wait_for_timeout(1800)
        rid = a.path().rsplit('/', 1)[-1]
        check(sec, 'commercial_director', 'A2 soumis (verrouillé pour l’auteur)', await a.page.get_by_role('button', name='Soumettre pour validation').count() == 0, rid)
    dg_n = sql(f"select count(*) from notifications where user_id = '{USERS['director']['id']}' and type='report_submitted'")
    check(sec, 'director', 'la DG est notifiée de la soumission', int(dg_n or 0) >= 1)
    async with Actor(browser, 'director') as a:
        await a.go('/app/reporting/a-valider', 1200)
        check(sec, 'director', '« À valider » liste les rapports soumis', await a.page.locator('main tbody tr').count() >= 2)
        await a.go(f'/app/reporting/{rid}', 1200)
        await a.page.get_by_label('Motif du renvoi').fill('Ajouter le détail du pipeline Bobo')
        await a.page.get_by_role('button', name='Renvoyer').click(); await a.page.wait_for_timeout(1500)
        check(sec, 'director', 'la DG renvoie avec un motif', sql(f"select status from bi_report_instances where id='{rid}'") == 'rejected')
    async with Actor(browser, 'commercial_director') as a:
        await a.go(f'/app/reporting/{rid}', 1200)
        check(sec, 'commercial_director', 'l’auteur voit le motif du renvoi', await a.page.get_by_text('Ajouter le détail du pipeline Bobo').count() >= 1)
        await a.page.get_by_label('1. Résumé exécutif du mois').fill('Octobre en retrait. Pipeline Bobo : 3 devis Lorentz.')
        await a.page.get_by_role('button', name='Soumettre pour validation').click(); await a.page.wait_for_timeout(1500)
    async with Actor(browser, 'director') as a:
        await a.go(f'/app/reporting/{rid}', 1200)
        await a.page.get_by_role('button', name='Valider').click(); await a.page.wait_for_timeout(1500)
        check(sec, 'director', 'la DG valide le rapport corrigé', sql(f"select status from bi_report_instances where id='{rid}'") == 'validated')
        async with a.page.expect_download() as dl:
            await a.page.get_by_role('button', name='PDF').click()
        d = await dl.value
        check(sec, 'director', 'export PDF du rapport', d.suggested_filename == 'A2_2026-10.pdf', d.suggested_filename, await a.shot('a2_valide'))
    async with Actor(browser, 'raf') as a:
        a4 = sql("select id from bi_report_instances where template_code='A4' and status='submitted' limit 1")
        await a.go(f'/app/reporting/{a4}', 1200)
        await a.page.get_by_role('button', name='Valider').click(); await a.page.wait_for_timeout(1500)
        check(sec, 'raf', 'le RAF valide le rapport A4', sql(f"select status from bi_report_instances where id='{a4}'") == 'validated')
        a3 = sql("select id from bi_report_instances where template_code='A3' and status='submitted' limit 1")
        await a.go(f'/app/reporting/{a3}', 1200)
        check(sec, 'raf', 'le RAF ne peut pas valider le rapport technique A3', await a.page.get_by_role('button', name='Valider').count() == 0)
    async with Actor(browser, 'technician') as a:
        await a.go('/app/reporting/nouveau/A12', 1500)
        await a.page.get_by_label('Vente').select_option(index=1)
        await a.page.get_by_role('button', name='Pré-remplir depuis la plateforme').click(); await a.page.wait_for_timeout(800)
        mats = await a.page.get_by_role('row').filter(has=a.page.locator('input')).count()
        await a.page.get_by_role('button', name='Soumettre pour validation').click(); await a.page.wait_for_timeout(1500)
        check(sec, 'technician', 'fiche d’intervention A12 créée depuis une vente et soumise', '/app/reporting/' in a.path() and mats > 3, mats)
    async with Actor(browser, 'sales_rep') as a:
        a3 = sql("select id from bi_report_instances where template_code='A3' and status='submitted' limit 1")
        await a.go(f'/app/reporting/{a3}', 1200)
        check(sec, 'sales_rep', 'un commercial ne voit pas les boutons de validation', await a.page.get_by_role('button', name='Valider').count() == 0)

async def chat_flow(browser):
    sec = 'C4. Discussions & notifications'
    async with Actor(browser, 'sales_rep') as a:
        await a.go('/app/tc/ventes?q=DEV-2026-0003', 1200)
        await a.page.get_by_role('button', name=re.compile('Discuter du devis')).first.click(); await a.page.wait_for_timeout(1200)
        box = a.page.locator('#comment-input')
        val = await box.input_value()
        check(sec, 'sales_rep', 'discussion du devis préremplie (#dev-2026-0003)', val.startswith('#dev-2026-0003'), val)
        await box.fill(val + f"@{USERS['raf']['name']} acompte confirmé ({RUN})")
        await a.page.get_by_role('button', name='Publier →').click(); await a.page.wait_for_timeout(1500)
        tags = sql(f"select tags::text from comments where content like '%({RUN})%'")
        check(sec, 'sales_rep', 'message publié dans le canal Technico-commercial avec le tag du devis', tags == '{Technico-commercial,dev-2026-0003}', tags)
    mid = sql(f"select id from comments where content like '%({RUN})%'")
    check(sec, 'raf', 'le RAF mentionné reçoit une notification', sql(f"select count(*) from notifications where user_id='{USERS['raf']['id']}' and type='mention' and entity_id='{mid}'") == '1')
    async with Actor(browser, 'raf') as a:
        await a.go('/app/comments', 1200)
        await a.page.get_by_role('button', name='#dev-2026-0003').click(); await a.page.wait_for_timeout(500)
        check(sec, 'raf', 'filtre par tag du devis', await a.page.get_by_text(f'acompte confirmé ({RUN})').count() == 1)
        msg = a.page.get_by_text(f'acompte confirmé ({RUN})')
        await msg.hover()
        await msg.locator('xpath=ancestor::div[.//button[@title="Répondre"]][1]').locator('button[title="Répondre"]').first.click()
        await a.page.get_by_placeholder('Répondre dans le thread…').fill('Bien reçu, merci')
        await a.page.locator('button:not([title])', has_text='Répondre').click(); await a.page.wait_for_timeout(1500)
        rep = sql(f"select count(*) from notifications where user_id='{USERS['sales_rep']['id']}' and type='comment_reply'")
        check(sec, 'sales_rep', 'l’auteur est notifié de la réponse', int(rep or 0) >= 1, rep, await a.shot('discussion'))

async def env_admin_flow(browser):
    sec = 'C5. Environnements paramétrables'
    async with Actor(browser, 'admin') as a:
        await a.go('/app/settings', 1200)
        await a.page.get_by_role('switch', name='RAF (Resp. Admin. & Financier) — Expansion', exact=True).click(); await a.page.wait_for_timeout(1200)
        check(sec, 'admin', 'l’admin ouvre Expansion au RAF', sql("select enabled from environment_access where role='raf' and env='expansion'") == 't', '', await a.shot('matrice'))
    async with Actor(browser, 'raf') as a:
        await a.go('/app', 1200)
        check(sec, 'raf', 'le RAF voit maintenant Expansion', await a.page.get_by_role('tab', name='Expansion').count() == 1)
    sql("update environment_access set enabled=false where role='raf' and env='expansion'")

async def search_flow(browser):
    sec = 'C6. Recherche globale'
    async with Actor(browser, 'director') as a:
        await a.go('/app/finance', 1200)
        await a.page.keyboard.press('Control+k'); await a.page.wait_for_timeout(500)
        await a.page.keyboard.type('Banfora'); await a.page.wait_for_timeout(800)
        n = await a.page.get_by_role('option', name=re.compile('Usine de Banfora')).count()
        check(sec, 'director', 'Ctrl+K trouve les devis d’un client', n >= 1, n)
        await a.page.keyboard.press('Control+a'); await a.page.keyboard.type('A4 septembre'); await a.page.wait_for_timeout(600)
        n2 = await a.page.get_by_role('option', name=re.compile('A4 — septembre 2026')).count()
        check(sec, 'director', 'Ctrl+K trouve un rapport', n2 >= 1, n2, await a.shot('recherche'))
        await a.page.get_by_role('option', name=re.compile('A4 — septembre 2026')).first.click(); await a.page.wait_for_timeout(1000)
        check(sec, 'director', 'le résultat ouvre le rapport', '/app/reporting/' in a.path(), a.path())
    async with Actor(browser, 'sales_rep') as a:
        await a.go('/app/tc/dg', 1000)
        await a.page.keyboard.press('Control+k'); await a.page.wait_for_timeout(500)
        await a.page.keyboard.type('Trésorerie'); await a.page.wait_for_timeout(600)
        check(sec, 'sales_rep', 'la recherche ne propose pas les pages Finance au commercial', await a.page.get_by_role('option', name=re.compile('Trésorerie')).count() == 0)

async def mobile_flow(browser):
    sec = 'C7. Mobile (390 px)'
    for key, path in (('sales_rep', '/app/tc/ventes'), ('raf', '/app/finance/tresorerie'), ('director', '/app/reporting/a-valider'), ('country_manager', '/app/countries')):
        async with Actor(browser, key, mobile=True) as a:
            await a.go(path, 1200)
            over = await a.page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            await a.page.get_by_role('button').first.click(); await a.page.wait_for_timeout(500)
            tabs = await a.page.locator('[role=tablist][aria-label=Environnement] [role=tab]').count()
            check(sec, key, f'{path} sans débordement horizontal, menu et sélecteur accessibles', not over and (tabs >= 1 or len(expected_envs(a.role)) == 1), f'débordement={over} onglets={tabs}', await a.shot('mobile'))

async def main():
    keys = [k for k in USERS]
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        print('A/B — tour des profils', flush=True)
        for k in keys:
            await tour(browser, k)
        for name, fn in (('C1', sales_cycle), ('C2', finance_flow), ('C3', reporting_flow), ('C4', chat_flow), ('C5', env_admin_flow), ('C6', search_flow), ('C7', mobile_flow)):
            print(name, flush=True)
            try:
                await fn(browser)
            except Exception as e:  # un scénario qui plante est un échec, pas un arrêt
                check(f'{name}', 'runner', 'scénario exécuté jusqu’au bout', False, repr(e)[:300])
        await browser.close()
    data = {'run_at': datetime.datetime.now().isoformat(timespec='seconds'), 'results': results,
            'counts': {'total': len(results), 'ok': sum(r['ok'] for r in results)},
            'dataset': {k: sql(q) for k, q in {
                'users': 'select count(*) from auth.users', 'sales': 'select count(*) from tc_sales',
                'signed': 'select count(*) from tc_sales where sale_date is not null', 'budget_lines': 'select count(*) from budget_lines',
                'treasury_values': 'select count(*) from fin_treasury_values', 'kpi_values': 'select count(*) from fin_kpi_values',
                'reports': 'select count(*) from bi_report_instances', 'comments': 'select count(*) from comments',
                'notifications': 'select count(*) from notifications', 'tasks': 'select count(*) from tasks', 'risks': 'select count(*) from risks'}.items()}}
    json.dump(data, open(f'{OUT}/results.json', 'w'), ensure_ascii=False, indent=1)
    print(f"\n{data['counts']['ok']}/{data['counts']['total']} contrôles réussis")
    sys.exit(0 if data['counts']['ok'] == data['counts']['total'] else 1)

asyncio.run(main())
