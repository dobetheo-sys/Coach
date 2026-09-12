# Décisions du rapport 05 appliquées — A2 · B1 · B3 · B4 + l'angle mort du moment A (12/09/2026)

Les quatre décisions sont traitées. Trois écrites, une refusée comme demandé, plus la fermeture
de l'angle mort que le rapport 05 avait publié.

## 1. A2 — le bundle est livré sans ses commentaires · **LIVRÉ**

`esbuild` en devDependency de BUILD (jamais servie à l'athlète), `scripts/buildApp.mjs`.

**Mesuré avant d'écrire, protocole d'A3** — et la méthode a dû changer sur le point qui décide :
le serveur du harnais E2E sert **en clair** quand GitHub Pages **gzippe**. A3 déplaçait des
requêtes sans changer les octets, la compression y était neutre ; A2 change les octets, donc
mesurer sans gzip aurait surestimé le gain d'un facteur ~3 — dans le sens qui arrange. Les deux
sont publiés (Fast 3G émulé par CDP, contexte neuf, 3 tirages par condition) :

| condition | serveur gzippé (comme la prod) | serveur brut (harnais E2E) |
|---|---|---|
| avec commentaires | 5 578 · 5 561 · 5 581 ms | 14 441 · 14 439 · 14 423 ms |
| sans commentaires | **3 912 · 3 915 · 3 917 ms** | 9 343 · 9 357 · 9 349 ms |

**−1,7 s (−30 %) au premier affichage**, poids **527 → 166 Ko gzip (−68 %)**, bundle
1 566 → 529 Ko. C'est le même instrument qui a RETIRÉ A3 (il coûtait 2 s) et qui valide A2.

**`minifyWhitespace` seul, jamais `minifyIdentifiers`.** Le mangling rendrait 15 Ko gzip de plus
et rendrait illisible un moteur PUBLIC dont l'explicabilité est le contre-positionnement (S-1).
Le gain abandonné est publié plutôt que tu.

**Deux commentaires survivent, vérifiés AVANT d'écrire** : l'en-tête « généré, ne pas éditer »
(concaténé après le strip) et les marqueurs `/*__EBV2_START__*/` / `/*__EBV2_END__*/`, par
lesquels `audit_v6.mjs` extrait le moteur du monolithe. Ils sont posés **autour** du bundle, hors
de portée du strip. Un strip est un producteur de masse de règle 17 : sans cette vérification, un
gate aurait rougi loin de sa cause. `audit:v6` : 75 verts, marqueurs intacts.

**Aucune chaîne contenant `//` n'a cassé** — esbuild est un vrai analyseur, pas une expression
régulière ; l'auto-test du build évalue désormais le bundle STRIPÉ (on teste ce qu'on livre) et
`golden:bundle` prouve que les plans sont identiques à ceux de la source.

### ⚠ Ce que la décision n'anticipait pas, et ça touche la règle de méthode 0

**Le job `audit` de la CI — celui qui protège `main` — n'installait rien**, et c'est lui qui
exécute `check:app`, lequel rejoue ce build. Sans installation, il serait sorti en **erreur de
module au lieu d'un verdict**. Une étape `npm ci` est posée **juste avant `check:app`**, pas en
tête du job : tout ce qui précède reste sans dépendance. La ligne « Zéro dépendance » du workflow
est **rectifiée** plutôt que laissée fausse. `npm ci --dry-run` vérifié en phase avec le lockfile.

## 2. B1 — chiffrement de l'export · **REFUSÉ, comme décidé**

Aucune écriture. L'entrée reste dans `BUGS_OUVERTS.md` comme option future.

## 3. B3 — hôte du relais épinglé, réglage avancé retiré · **LIVRÉ**

- `connect-src` nomme l'**hôte exact** au lieu de `*.workers.dev`, qui autorisait tout worker
  Cloudflare de la planète — un joker d'un cran plus fin que `https:`, pas autre chose.
- L'attendu de la garde n'est **pas recopié** : il est **dérivé de `STRAVA_RELAY_DEFAULT`**
  (`config.js`), seule source de l'URL.
- Le champ « Réglages avancés (relais) » quitte le Profil, et `stravaRelayUrl()` ne lit plus que
  la config. `stravaRelay` quitte aussi `SHARED_KEYS` ; une clé résiduelle dans un état déjà
  enregistré est **ignorée, jamais effacée**.
- `smoke-securite` : 47 → **50 assertions**.

**Trouvé en l'écrivant** : `stravaRelayUrl()` faisait gagner la valeur collée par l'athlète **sur**
la config, sous un commentaire qui annonçait l'inverse (« celle de l'app d'abord ») — un
commentaire qui décrivait le contraire de sa ligne.

**Faute de mon propre critère, publiée** : ma première écriture cherchait `answers.stravaRelay`
dans le TEXTE des modules et rougissait sur le **commentaire qui explique le retrait** — onzième
occurrence de « mesurer ce qui est écrit au lieu de ce qui s'exécute » (règle 15), dans la garde
du lot qui la cite. Les commentaires sont retirés avant la recherche.

**Conséquence documentée** (`server/README.md`) : déployer un autre relais demande désormais
**deux** modifications de code — la config **et** la CSP — au lieu d'un champ dans l'app.

## 4. B4 — rate-limit · **documenté seulement**

`server/README.md` liste les deux actions humaines, numérotées : redéployer le worker (c'est ce
qui rend le nonce STRICT) et poser la règle de limitation de débit Cloudflare. Aucun code.

## 5. L'angle mort publié est fermé

`smoke-tabs` §4 : sur un plan qui ne l'a jamais vue, la **déclaration de saison apparaît**, se
ferme, et **ne revient pas** au rechargement — une fois et une seule. La cible se trouve par une
**propriété** (l'overlay qui porte `#momentAClose`), jamais par un libellé, et le titre trouvé est
publié dans le verdict (règle 17).

Et un critère de `smoke-improvements` **encodait la décision renversée** (« champ URL du relais
présent ») : **réécrit, pas supprimé** — il garde désormais la propriété qui remplace l'ancienne
(l'URL n'est plus saisissable) plus celle qu'il ne fallait pas perdre (le repli jeton manuel).

## Ce qui a été vérifié

Sortie de `npm run batterie` telle qu'imprimée (13 gates nommés, exit global 0) :

```
✓ audit:v1         exit=0  [4s]
✓ audit:invariants exit=0  [5s]
✓ audit:v6         exit=0  [13s]
✓ audit:v7         exit=0  [32s]
✓ audit:monotonie  exit=0  [3s]
✓ audit:r13        exit=0  [2s]
✓ audit:r14        exit=0  [2s]
✓ audit:r14.1      exit=0  [2s]
✓ audit:r18        exit=0  [12s]
✓ golden:verify    exit=0  [28s]
✓ golden:bundle    exit=0  [32s]
✓ check:dates      exit=0  [0s]
✓ lotPhysio        exit=0  [30s]
EXIT=0
```

- `npm run test:e2e` : **27/27 suites vertes** (`smoke-securite` 47 → **50**, `smoke-tabs` 17 → **20**,
  `smoke-improvements` 84 → **85**).
- `check:app` ✓ · `check:sw` ✓ (`eb-pwa-9e37bbf328f7`, 81 assets) · `check:dup` ✓ · `check:hosts` ✓
  · `check:chemins` ✓ · `check:tokens` ✓.
- **`golden:bundle` est la preuve qui compte pour A2** : le bundle stripé rend des plans identiques
  à ceux construits depuis `src/`. `golden:verify` inchangé. **`src/` byte-identique**.

### Les quatre contre-preuves, toutes rouges

| cassure (par `npm run casser`) | verdict attendu | obtenu |
|---|---|---|
| `*.workers.dev` remis dans la CSP | rouge | **2 ÉCHECS** (épinglage + joker) |
| `stravaRelayUrl()` relit `answers.stravaRelay` | rouge | **1 ÉCHEC** |
| moment A neutralisé (`return false`) | rouge | **2 ÉCHECS** |
| strip désactivé (`minifyWhitespace: false`) | rouge | **`check:app` ✗** |

La troisième a d'abord fait **MOURIR** la suite sur un `TimeoutError` — code de sortie correct,
aucune ligne de verdict. C'est le défaut d'instrument déjà payé deux fois ici : le clic est
désormais gardé et la suite RAPPORTE (« bouton jamais apparu »).

### Règle 17 — un strip est un producteur de masse, et la réponse est structurelle

Les 165 blocs `verify` du registre ont été balayés : **aucun ne lit le bundle comme du TEXTE**
(ceux qui nomment `engine.js` l'EXÉCUTENT par `require`, et le seul qui grep `endurabuild/js/`
exclut explicitement le bundle). Le strip ne peut donc mécaniquement faire basculer aucune
entrée — argument plus fort qu'un diff de listes. Contrôle croisé sur les fichiers touchés par
B3 : `O-23`, `O-41-promotion`, `O-118`, `§4-D10-9` **reproduisent tous**, comme les trois entrées
`AUDIT05-*`. `registry:check` complet : **117 reproduisent · 39 au §4 · 9 commandes cassées** —
état préexistant du registre, hors CI par construction.

## Fichiers touchés

`scripts/buildApp.mjs` · `package.json` (esbuild 0.28.2, exact) · `.github/workflows/audit.yml` ·
`endurabuild/index.html` · `js/strava.js` · `js/state.js` · `js/ui/tab-profile.js` ·
`js/engine.js` + `Coach_Pro_V1.5.html` + `sw.js` (régénérés) · `server/README.md` ·
`tests/e2e/smoke-securite.mjs` · `smoke-tabs.mjs` · `smoke-improvements.mjs` ·
`BUGS_OUVERTS.md` · `CLAUDE.md`.

## Ensuite

Rapport 06 (produit / explicabilité), dans l'ordre annoncé.
