# Relais OAuth Strava — déploiement (≈15 min, gratuit)

Ce dossier contient le SEUL composant serveur du projet : un relais OAuth minuscule
(`strava-relay.js`, un fichier, zéro dépendance) qui permet le bouton **« Se connecter
avec Strava »** dans l'app. Sans lui, l'import Strava reste possible avec le jeton
manuel (rien ne casse).

**Pourquoi un serveur ?** Le `client_secret` Strava ne doit jamais apparaître dans le
code de l'app (100 % côté client, donc lisible par tous). Le relais est le seul à le
connaître ; il ne stocke rien, ne journalise aucun token — il échange les codes et
renvoie le résultat au navigateur.

## Étape 1 — Créer ton application Strava (2 min, à faire une fois)

1. Va sur <https://www.strava.com/settings/api> (connecté à ton compte Strava).
2. Remplis : nom `EnduraBuild`, site web = l'URL où tu héberges l'app,
   **Authorization Callback Domain** = le domaine du worker (tu l'auras à l'étape 2,
   ex. `endurabuild-strava.TONCOMPTE.workers.dev` — reviens le remplir après).
3. Note le **Client ID** et le **Client Secret**.

## Étape 2 — Déployer le worker sur Cloudflare (gratuit)

### Option A — dashboard (aucun outil à installer)

1. Crée un compte sur <https://dash.cloudflare.com> (offre gratuite : 100 000 requêtes/jour,
   très au-delà du besoin).
2. **Workers & Pages → Create → Worker**, nomme-le (ex. `endurabuild-strava`), *Deploy*.
3. **Edit code** → remplace tout le contenu par celui de `strava-relay.js` → *Deploy*.
4. **Settings → Variables and Secrets** :
   - `STRAVA_CLIENT_ID` — type *Text* — ton Client ID.
   - `STRAVA_CLIENT_SECRET` — type **Secret** — ton Client Secret.
   - `APP_ORIGINS` — type *Text* — les origines de ton app séparées par des virgules,
     ex. `https://toncompte.github.io,http://localhost:8000`.
5. Note l'URL du worker (ex. `https://endurabuild-strava.toncompte.workers.dev`) et
   retourne la mettre comme **Authorization Callback Domain** dans les réglages Strava
   (le domaine seul, sans `https://`).

### Option B — ligne de commande (wrangler)

```bash
npm create cloudflare@latest endurabuild-strava -- --type hello-world
cp strava-relay.js endurabuild-strava/src/index.js
cd endurabuild-strava
npx wrangler secret put STRAVA_CLIENT_SECRET
npx wrangler deploy --var STRAVA_CLIENT_ID:TON_ID --var APP_ORIGINS:https://toncompte.github.io
```

## Étape 3 — Brancher l'app (30 s)

Dans l'app : onglet **📋 Profil → 🔗 Strava** → colle l'URL du worker dans « URL du
relais » → **Se connecter avec Strava** → autorise sur la page Strava → tu reviens dans
l'app connecté(e). Le bouton « Importer mes activités » lit ensuite tes 50 dernières
activités (lecture seule) et alimente les références vivantes (FTP/allure/CSS estimées)
comme l'import FIT.

## Sécurité — ce que le relais garantit

- Le `client_secret` ne quitte jamais Cloudflare (variable *Secret*, pas dans le code).
- `APP_ORIGINS` est une liste blanche : le relais refuse tout autre site (redirections
  `/auth`/`/callback` ET appels `/refresh` en CORS).
- Les tokens transitent dans le **fragment** d'URL (`#…`), jamais dans une query string :
  un fragment n'est pas envoyé aux serveurs et n'apparaît pas dans les logs.
- Scope demandé : `activity:read_all` — lecture seule, l'app n'écrit jamais sur Strava.
- Le relais est sans état : rien n'est stocké, rien à fuir. Les tokens vivent uniquement
  dans le localStorage du navigateur de l'utilisateur (même niveau de confiance que le
  reste de l'état de l'app).
