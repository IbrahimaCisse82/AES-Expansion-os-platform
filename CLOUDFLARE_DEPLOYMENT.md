# Déploiement sur Cloudflare Pages

Ce guide vous explique comment déployer votre application sur Cloudflare Pages.

## Prérequis

1. Un compte Cloudflare (gratuit) - [Créer un compte](https://dash.cloudflare.com/sign-up)
2. Node.js et npm installés localement
3. Git installé et votre code dans un repository Git (GitHub, GitLab, etc.)

## Option 1 : Déploiement via l'interface Cloudflare (Recommandé)

### Étape 1 : Connecter votre repository

1. Connectez-vous à votre [Dashboard Cloudflare](https://dash.cloudflare.com/)
2. Allez dans **Workers & Pages** dans le menu de gauche
3. Cliquez sur **Create application**
4. **IMPORTANT : Sélectionnez l'onglet "Pages" (PAS "Workers")**
5. Cliquez sur **Connect to Git**
6. Autorisez Cloudflare à accéder à votre compte GitHub/GitLab
7. Sélectionnez le repository de votre application

### Étape 2 : Configurer le build

Utilisez les paramètres suivants :

- **Project name** : `expansion-tracker` (ou le nom de votre choix)
- **Production branch** : `main` (ou votre branche principale)
- **Framework preset** : Sélectionnez "None" ou "Vite"
- **Build command** : `bun run build` (ou `npm run build` si vous utilisez npm)
- **Build output directory** : `dist`
- **Root directory** : `/` (laisser vide ou par défaut)

**IMPORTANT** : Ne configurez AUCUNE commande de déploiement (Deploy command). Laissez ce champ vide ou supprimez-le s'il est rempli automatiquement. Pour Cloudflare Pages, le déploiement se fait automatiquement après le build.

### Étape 3 : Ajouter les variables d'environnement

Dans la section **Environment variables**, ajoutez les variables suivantes :

```
VITE_SUPABASE_URL=https://rjzxdfawpbvkvjwtrkuz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqenhkZmF3cGJ2a3Zqd3Rya3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMTczOTcsImV4cCI6MjA4Nzg5MzM5N30.9ZuwwjYvewlkijar2z6boqsueTX8cSPXWXkW6Olut2U
VITE_SUPABASE_PROJECT_ID=rjzxdfawpbvkvjwtrkuz
```

**Important** : Ajoutez ces variables pour l'environnement **Production** ET **Preview**.

### Étape 4 : Déployer

1. Cliquez sur **Save and Deploy**
2. Cloudflare va automatiquement :
   - Cloner votre repository
   - Installer les dépendances
   - Exécuter le build
   - Déployer votre application

Le déploiement prend généralement 2-5 minutes.

### Étape 5 : Accéder à votre application

Une fois le déploiement terminé :
- Votre application sera disponible sur `https://expansion-tracker.pages.dev` (ou le nom que vous avez choisi)
- Vous pouvez configurer un domaine personnalisé dans **Custom domains**

## Option 2 : Déploiement via Wrangler CLI

### Étape 1 : Installer Wrangler

```bash
npm install -g wrangler
```

### Étape 2 : Se connecter à Cloudflare

```bash
wrangler login
```

### Étape 3 : Déployer

```bash
npm run pages:deploy
```

## Déploiements automatiques

Avec l'option 1 (interface Cloudflare), chaque push sur votre branche principale déclenchera automatiquement un nouveau déploiement.

Les pull requests créeront automatiquement des déploiements de prévisualisation.

## Configuration du domaine personnalisé

1. Dans votre projet Cloudflare Pages, allez dans **Custom domains**
2. Cliquez sur **Set up a custom domain**
3. Entrez votre domaine (ex: `monapp.com`)
4. Suivez les instructions pour configurer les DNS

Cloudflare fournira automatiquement un certificat SSL gratuit.

## Rollback en cas de problème

Si un déploiement pose problème :

1. Allez dans l'onglet **Deployments** de votre projet
2. Trouvez le dernier déploiement fonctionnel
3. Cliquez sur les trois points (**...**) à côté du déploiement
4. Sélectionnez **Rollback to this deployment**

## Support et documentation

- [Documentation Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Guide de déploiement Vite](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/)
- [Variables d'environnement](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)

## Différences avec Vercel et Lovable

### Avantages de Cloudflare Pages :

- **Performance** : CDN mondial ultra-rapide
- **Gratuit** : Bande passante illimitée sur le plan gratuit
- **Sécurité** : Protection DDoS intégrée
- **Functions** : Support des Workers pour le serverless
- **Analytics** : Analytics gratuits et respectueux de la vie privée

### Points à noter :

- Les variables d'environnement doivent être préfixées par `VITE_` pour être accessibles côté client
- Les fichiers `_headers` et `_redirects` à la racine du projet permettent de configurer les en-têtes HTTP et redirections
- Le fichier `wrangler.toml` contient la configuration du projet

## Troubleshooting

### Erreur "Missing entry-point to Worker script"

Cela signifie que vous avez configuré une "Deploy command" alors que ce n'est pas nécessaire pour Pages.

**Solution** :
1. Allez dans les paramètres de votre projet Pages sur Cloudflare
2. Allez dans **Settings** → **Builds & deployments**
3. Dans la section "Deploy command", assurez-vous que ce champ est **VIDE** ou **NON CONFIGURÉ**
4. Sauvegardez et redéployez

### Le build échoue

Vérifiez que :
- Les variables d'environnement sont bien configurées
- La commande de build est correcte : `npm run build` ou `bun run build`
- Le répertoire de sortie est bien `dist`
- Aucune "Deploy command" n'est configurée

### L'application ne se charge pas

Vérifiez que :
- Le fichier `_redirects` est bien présent
- Les variables d'environnement Supabase sont correctes
- Les CORS sont bien configurés dans Supabase

### Erreurs de connexion Supabase

Assurez-vous que :
- L'URL de votre site Cloudflare est ajoutée dans les URL autorisées de Supabase
- Les variables d'environnement correspondent exactement à celles de votre projet Supabase
