# Rapport de migration PWA — Coach_Pro_V1.5.html → endurabuild/

> Depuis cette migration, la vue plan a été réorganisée en **4 onglets** —
> voir `RAPPORT-ONGLETS.md` (brief `BRIEF_CLAUDE_CODE_ONGLETS.md`).

Livrable du brief `BRIEF_CLAUDE_CODE_MIGRATION_PWA.md`. Migration réalisée par
**extraction mécanique** (`scripts/splitPwa.py`) : les chunks top-level du script
principal sont copiés verbatim et routés par nom — la fidélité est garantie par
construction, pas par relecture.

## Arborescence livrée

Conforme au brief : `index.html`, `manifest.json`, `sw.js`, `css/styles.css` +
`css/mobile.css` (couche mobile-first séparée), `js/engine.js`, `js/legacy-fallback.js`,
`js/state.js`, `js/config.js`, `js/ui/{steps,plan-view,readiness}.js`, `js/export.js`
(+ export PNG ajouté), `assets/fonts/*.woff2`, `assets/icon-{192,512}.png`.

Un ajout par rapport au brief : **`js/config.js`** (SPORTS, PREMIUM_STEPS_DEF, labels) —
partagé par les steps ET le legacy, il ne pouvait appartenir à aucun des deux.

## Le moteur V2 n'a PAS été extrait du HTML — mieux

`js/engine.js` est **généré** par `npm run build:app` depuis `src/` (TypeScript), le même
bundle auto-testé que celui injecté dans le monolithe. C'est plus fort qu'une extraction
fidèle : c'est la même génération, auditée à l'identique. `npm run check:app` (CI) refuse
désormais un `engine.js` désynchronisé, comme pour le monolithe.

## Collisions et doublons relevés (demandés par le brief)

| Constat | Résolution |
|---|---|
| Deux `fmtInt`, deux `hrZones`, deux calculs de durée de step (`_blkMin` UI vs `stepMin` moteur) — legacy vs bundle V2 | **Aucune collision runtime** : les fonctions legacy vivent dans la closure de `buildPlanLegacy` ou dans leur module ; celles du moteur dans l'IIFE `engine.js`. Rien n'a été fusionné (le brief interdisait de toucher la logique) — le doublon est documenté, pas résolu par du code. |
| `buildPlan` (legacy) vs `buildPlan` (wrapper V2) | Le legacy est renommé **`buildPlanLegacy`** dans son module — seule transformation de code de la migration, signalée ici. Le wrapper V2 vit dans `app.js` et garde le comportement exact du monolithe (V2 d'abord, legacy en repli sur échec). |
| Handlers inline `onclick="…"` dans les templates HTML (résolvent sur `window`, cassés en modules ES) | 4 fonctions relevées par scan (`ebAvailSet`, `ebAvailDur`, `ebAddTest`, `stravaImport`) et exposées explicitement sur `window` dans `app.js`. |
| Imports faux-positifs (identifiants cités dans des commentaires) | Quelques imports superflus générés par l'analyse textuelle (ex. `buildPlan` importé par `legacy-fallback.js` via un commentaire). Inoffensifs (bindings non appelés), conservés pour ne pas éditer les modules à la main. |
| Cycles d'imports (steps ↔ plan-view ↔ app) | Assumés : uniquement des déclarations de fonctions (hoistées), jamais appelées pendant l'évaluation des modules — sans danger en ES modules. |

## Décisions de migration

- **Polices** : le monolithe embarquait déjà les 3 polices en base64 (note RGPD D19).
  Extraites en vrais `.woff2` dans `assets/fonts/` (−116 Ko de CSS), `@font-face` réécrits.
  Zéro requête externe conservé.
- **Mobile-first** : couche `css/mobile.css` séparée — cibles tactiles ≥44 px
  (`.btn/.opt/.doneBtn/inputs`), `font-size:16px` sur les champs (anti-zoom iOS),
  grille du plan 2 colonnes puis 1 sur petit écran, nav sticky en bas de plan,
  `safe-area-inset`, `:focus-visible`.
- **Accessibilité de base** : `<main role="main">`, `nav aria-label`, `#screen`
  `aria-live="polite"`, `noscript`. (Les templates générés gardent leurs `<button>`
  natifs — clavier OK par défaut.)
- **Service worker** : cache-first pour l'app shell même-origine, versionné avec purge à
  l'activation ; **Open-Meteo jamais mis en cache** (une météo périmée est pire qu'absente).
- **Icônes** : PNG 192/512 générés par `scripts/makeIcons.mjs` (zlib natif, zéro
  dépendance), même géométrie que le favicon SVG du monolithe.
- **`splitPwa.py` est un outil one-shot** : depuis cette migration, les modules
  `endurabuild/js/` sont la source de vérité de l'UI (l'export PNG et son bouton y ont
  été ajoutés directement). Le relancer écraserait ces ajouts — il reste dans le dépôt
  comme trace de la méthode.

## Validation

- **486/486 profils verts** après découpage (`npm run audit:v1` + `npm run audit:v2`),
  démos réparation + readiness vertes, `check:app` vérifie monolithe ET `engine.js`.
- **Navigateur réel** (Chromium headless, serveur statique `python3 -m http.server`) :
  1. `index.html` → sélecteur de sport rendu (graphe de modules opérationnel) ;
  2. état pré-chargé `onPlan:true` → **vue plan complète rendue via EBV2** : semaines,
     prédiction de course, décisions du moteur, forme du jour, répartition des
     intensités, régularité, bouton PNG — tous présents dans le DOM.
- Le monolithe `Coach_Pro_V1.5.html` est **conservé intact** (brief, étape 9) et reste
  construit/audité — il ne sera retiré qu'après validation de la PWA en usage réel.

## Reste à faire côté humain (étape 8 du brief)

Tester le flux complet SUR TÉLÉPHONE : servir `endurabuild/` (GitHub Pages, Netlify, ou
`python3 -m http.server` sur le réseau local), installer sur l'écran d'accueil, générer
un plan avec le profil réel, cocher une séance, consulter « Forme du jour », couper le
réseau et rouvrir (offline).
