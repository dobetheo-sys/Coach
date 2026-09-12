# Rapport 05 traité — Performance & robustesse · Sécurité & données (12/09/2026)

Ordre choisi : ce rapport d'abord parce que huit de ses dix axes sont en effort S, ne touchent
pas le moteur, et portent trois des dix priorités transverses (jetons Strava exportés, rechargement
au premier chargement, erreurs sans surface). Suite prévue : 06 produit/explicabilité → 03
design/accessibilité → 04 ergonomie/friction → 02 code/maintenabilité → 01 conception/programmes.

## Livré (8 axes sur 10), chacun mesuré avant/après

| Axe | Constat mesuré AVANT | Ce qui est livré | Mesuré APRÈS |
|---|---|---|---|
| **A1** premier chargement | **2 navigations** (seconde à 0,6-1,7 s ; 71 s sur Slow 3G) — `clients.claim()` → `controllerchange` → `location.reload()` sans contrôleur préalable | `avaitControleur` lu avant `register()` ; on ne recharge que pour REMPLACER un worker | **1 navigation**, page contrôlée (hors ligne dès la 2ᵉ ouverture) — **contre-prouvé rouge** en retirant la garde |
| **A4** erreurs sans surface | 0 `onerror`, 0 `unhandledrejection`, `S.saveFailed` lu par personne | bandeau `role="status"` « ton plan n'a pas bougé » ; échecs réseau filtrés | une exception → bandeau ; un `Failed to fetch` → rien |
| **B5** écriture muette | `setItem` cru sur parole | `ebSave` RELIT ce qu'il écrit (`RelectureError`), émet `eb:savefailed` | bandeau « ce que tu viens de faire n'est PAS sauvegardé (QuotaExceededError) » |
| **A5** cache & état | 404 mis en cache jusqu'au prochain `VERSION` ; copies corrompues jamais purgées ; `eb_state_v1` gardée | `res.ok && type === "basic"` ; une seule copie corrompue ; v1 retirée après relecture intacte | gardé par la suite |
| **nomodule** | page blanche sous iOS < 14 / Chrome < 85 | `<script nomodule src="js/nomodule.js">` (ES5) | phrase à la place du blanc |
| **B1** export JSON | jetons Strava (access + refresh) + données de santé en clair | `exportSansJetons` (shared + chaque plan) ; avertissement AVANT le geste | fichier sans `stravaAuth` ni secret, 1 459 octets, plans + shared intacts |
| **B2** effacement | aucun geste complet ; `S.shared` survivait à la suppression de tous les plans | « Effacer toutes mes données de cet appareil » : Strava, mémoire, `eb_*`, session, caches, worker, rechargement | `unregister` + `caches.delete` observés, app repart sur le questionnaire, 0 sport / 0 réponse / 0 jeton |
| **B3** anti-cadrage | `frame-ancestors` ignoré en `<meta>` | `if (self !== top)` → page cachée + lien `_top` | gardé |
| **B4** GPS / OAuth | position au mètre vers Open-Meteo ; `state` = URL de retour, pas de nonce | `toFixed(2)` (~1 km) ; nonce tiré par l'app, transporté par le relais dans `state {ret, nonce}`, renvoyé dans le fragment, **refusé s'il diffère** | gardé ; **redéploiement du worker = action humaine** (tolérance écrite tant qu'il n'est pas redéployé) |

Garde : `tests/e2e/smoke-securite.mjs` **25 → 47 assertions**, dont A1/A4/B5/B1/B2 mesurés dans le
navigateur (pas sur la source). Entrée `AUDIT05-SECU` dans `BUGS_OUVERTS.md` avec son bloc `verify`.

## A3 — écrit, MESURÉ, RETIRÉ (règle 7, et une faute d'instrument publiée)

Le bloc `modulepreload` (53 modules + 11 feuilles, généré par `buildSW.mjs` depuis le disque) a
été écrit tel que l'audit le proposait. Ma première mesure était le **mauvais instrument** : U7
chronomètre check-in → séance (1-2 ms), pas le chargement (règle 15). La bonne — temps au premier
contenu de `#screen` sur Fast 3G émulé (CDP : 1,6 Mbit/s, 150 ms RTT), contexte neuf, **trois
tirages de chaque côté** (règle 18) :

- **AVEC preload : 16 421 · 16 420 · 16 417 ms**
- **SANS preload : 14 416 · 14 416 · 14 410 ms**

Le preload **coûte 2 s** : 64 requêtes lancées d'emblée se disputent la bande passante avec
`engine.js`, qui EST le chemin critique. À ce débit c'est le VOLUME qui borne, pas la profondeur
du graphe — la prémisse de l'axe. Retiré ; la suite garde l'absence de `<link rel="modulepreload">`
avec le chiffre. Le levier réel est **A2** (bundle 523 → 185 Ko gzip sans les commentaires).

## Trouvé en passant les gates — cinq suites E2E vertes PAR LE CHEMIN

Après A1, cinq suites (`tabs`, `retention`, `improvements`, `dates`, `educatifs`) mouraient sur
`TimeoutError` : un overlay interceptait tout clic — la **déclaration de saison** (moment A), posée
le « jour de création » parce que la fixture E2E ne porte pas de `plan_start`. Cet overlay a
**toujours été là** (vérifié sur un worktree HEAD pur, 1,5 s après le rechargement), et les suites
passaient parce que le rechargement parasite de la première installation du worker — le défaut A1
— rechargeait la page juste après que `momentA_montre` ait été persisté. Retirer le défaut a retiré
la protection accidentelle : « protégé par le chemin, pas par le critère ».

**Une faute de méthode à moi, publiée** : ma première bisection accusait `state.js` (le retrait de
`eb_state_v1`) sur UN tirage par variante. Rejouée variante par variante — sans retrait v1, sans
relecture, `state.js` de HEAD, HEAD pur — l'overlay est présent dans les quatre. Correctif : la
fixture `runnerStateV1` déclare `momentA_montre: true` (un athlète qui a déjà un plan a déjà vu sa
déclaration), commenté dans `harness.mjs`. **Angle mort publié, non traité** : aucune suite n'asserte
que le moment A apparaît — dix suites touchent `.eb-overlay`, toutes le retirent ou testent la
célébration.

## Non livré — décisions qui vous reviennent

1. **A2 — strip des commentaires du bundle** (−65 % gzip, et c'est le VRAI levier de chargement
   d'après la mesure ci-dessus) : un strip maison peut casser une chaîne contenant `//` ; le faire
   proprement demande **esbuild en devDependency de BUILD** — c'est la politique « zéro dépendance »
   qui est en jeu. `golden:bundle` prouverait l'identité de sortie.
2. **B1 — chiffrement de l'export** par phrase de passe (WebCrypto, zéro dépendance) : une phrase
   oubliée = sauvegarde perdue. Décision d'UX/support.
3. **B3 — épingler l'hôte exact du relais dans la CSP** au lieu de `*.workers.dev` : rend l'URL de
   relais « réglages avancés » inopérante hors de cet hôte. Retirer le réglage, ou garder le joker.
4. **B4 — rate-limit sur `/refresh`** : réglage Cloudflare (dashboard), humain — noté dans
   `server/README.md` avec le redéploiement du worker (nonce).

## Ce qui a été vérifié (règle 0, clause 2)

Sortie de `npm run batterie` telle qu'imprimée (13 gates nommés, exit global 0) :

```
✓ audit:v1         exit=0  [4s]
✓ audit:invariants exit=0  [4s]
✓ audit:v6         exit=0  [10s]
✓ audit:v7         exit=0  [26s]
✓ audit:monotonie  exit=0  [3s]
✓ audit:r13        exit=0  [1s]
✓ audit:r14        exit=0  [2s]
✓ audit:r14.1      exit=0  [2s]
✓ audit:r18        exit=0  [10s]
✓ golden:verify    exit=0  [18s]
✓ golden:bundle    exit=0  [25s]
✓ check:dates      exit=0  [0s]
✓ lotPhysio        exit=0  [23s]
EXIT=0
```

- `npm run test:e2e` : **27/27 suites vertes** (dont `smoke-securite` 47 assertions, et les cinq
  suites tombées après A1 : tabs 17 · retention 18 · improvements 84 · dates 12 · educatifs 25).
- `check:app` ✓ (bundle à jour) · `check:sw` ✓ (`eb-pwa-c2af2b5845ed`, 81 assets) · `check:dup` ✓
  (Z-03, tables réfléchies identiques) · `check:chemins` ✓ (248 fichiers).
- `src/` byte-identique : ce rapport ne touche pas le moteur ; le golden est inchangé.

## Fichiers touchés

`endurabuild/js/app.js` · `state.js` · `sw.js` · `index.html` · `js/nomodule.js` (nouveau) ·
`js/strava.js` · `js/ui/readiness.js` · `js/ui/tab-profile.js` · `server/strava-relay.js` ·
`server/README.md` · `scripts/buildSW.mjs` (preload écrit puis retiré) · `tests/e2e/harness.mjs` ·
`tests/e2e/smoke-securite.mjs` · `BUGS_OUVERTS.md` · `CLAUDE.md`.

## Prochain rapport

06 produit / explicabilité, puis 03 design/accessibilité → 04 ergonomie → 02 code → 01 conception.

