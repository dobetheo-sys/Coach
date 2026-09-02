# 45 — L'intégration visuelle Zenna, et l'étape 1 du Bikefit

**02/09/2026** · branche `claude/integration-travail-visuel-bjvugr` · commits `7b3c1a2` ·
`ce22ca9` · `2a22f0b`

Deux demandes en une session : *« vérifie la cohérence du brief, puis intègre le travail
visuel »*, et *« vérifie le handoff Bikefitting, puis ajoute »*. Les deux ont été vérifiées
AVANT d'être suivies, et dans les deux cas la vérification a changé ce qui a été livré.

---

## §1 — Le brief de vérification : juste sur ce qu'il affirme, incomplet sur ce qu'il omet

Le brief a d'abord été passé au dépôt **sans le paquet**, qui n'était pas encore arrivé. Ce
qu'il annonçait s'est vérifié :

| Affirmation du brief | Mesuré |
|---|---|
| base `e53bb169670b` | existe (fiche 47) ; HEAD a avancé d'un commit, **qui ne touche aucun** des 10 fichiers |
| `git status` liste exactement 10 fichiers | **exact** — et le diff est quasi purement additif : **16 lignes retirées** au total |
| contradiction README §1 / §5 sur `paymentFailure` | **réelle** : ligne 32 contre lignes 111 et 202. C'est la ligne 32 qui est fausse |
| `journaliserProjection` appelée une seule fois | **exact** — `tab-plan-general.js:410`, unique appel, juste avant l'unique `predictionViewHTML` |
| §3 : double animation sur Semaine | **confirmé mécaniquement** : `renderTabWeek` pose `znPlayDays()`, puis `renderActiveTab` pose `znPlayOnce("week")` |
| §5.1 : cinq onglets | exact |

**Ce que le brief omettait**, et qui a coûté deux gates rouges :

- **`check:sw`** — `sw.js` référence `zenna-tabs.css` et `zenna-motion.js`. Sans
  `npm run build:sw`, le lot n'atteint **aucun navigateur ayant déjà ouvert l'app**. C'est
  O-24 mot pour mot, et le §6 du brief ne le mentionnait pas.
- **`check:tokens`** — le cliquet porte un budget épinglé pour `zenna-tabs.css`
  (`{ hex: 50, durees: 9 }`), et le paquet réécrit ce fichier.
- **la liste de suites** citait `smoke-usage`, `smoke-typo`, `smoke-r4`, `smoke-feasibility`,
  `smoke-projlog` — et ratait `smoke-zenna`, la garde du thème, dont la ligne 475 garde
  précisément *« un onglet sans `znPlay` serait entièrement vide »*, c'est-à-dire le risque
  central du lot. Ratait aussi `smoke-tabs`, `smoke-educatifs`, `smoke-carte-seance`.
- **`RV-UI-B` n'est pas une suite** mais un critère, vivant dans `smoke-feasibility.mjs` et
  `smoke-projlog.mjs`.
- Les deux fichiers présentés comme neufs (`zenna-motion.js` 472 l., `zenna-tabs.css` 991 l.)
  **existaient déjà** depuis `76c58e8`. Le paquet les ÉTEND, il ne les crée pas.

---

## §2 — Le cliquet de tokens a trouvé un défaut de contraste, pas un formalisme

`check:tokens` rouge : **52 hex pour un plafond de 50**, deux littéraux nouveaux. Les deux
sont `#e63946`, peint en dur par le bloc « Prélèvement refusé » (`.pay-lab`, `.pay-dot`).

Or **le même fichier, 490 lignes plus haut, écrit lui-même que cette couleur ne passe pas sur
le sombre** et pose la règle de repli. Mesuré indépendamment :

| fond | `#e63946` | `#ff7d92` |
|---|---|---|
| `--zn-surface` `#111318` (celui de `.shop-card`) | **4,46:1** | 7,61:1 |
| `--zn-surface-2` `#181c22` | 4,10:1 | 7,00:1 |
| `--zn-surface-3` `#20252c` | 3,70:1 | 6,31:1 |

Le seuil AA pour un texte est **4,5:1**. `.pay-lab` est un texte de 9,5 px en capitales sur
`--zn-surface` : **il est sous le seuil**. Le paquet connaissait la règle et ne se l'est pas
appliquée à son propre nouvel état.

**Corrigé de façon idiomatique plutôt qu'en montant le plafond** — le script dit lui-même
*« tokenise-les ou déclare le token manquant »*, et il exempte les lignes de déclaration du
comptage : `--zn-bad: #ff7d92` est déclaré dans `zenna-today.css` (coût **0** contre son
budget, qui est à saturation), les **quatre** littéraux rouges de `zenna-tabs.css` sont routés
dessus, et la règle `.d1 { animation-delay: 0ms }` est retirée — elle restate le défaut, le
raccourci `animation` de la règle de base remettant déjà le délai à zéro.

**Le cliquet DESCEND de 50 à 48** dans le même commit, comme le script l'exige, au lieu de
monter. `check:sw` reconstruit : `eb-pwa-9af98a71c88a`, 63 assets.

---

## §3 — Les trois gardes que la refonte a fait rougir : aucune n'est une régression du produit

Première passe complète : **22/25 suites vertes**, trois rouges. Les trois épinglaient l'état
du jour où elles ont été écrites, et la refonte a changé cet état délibérément.

**`smoke-educatifs` A6 MOURAIT** — exception, donc aucune ligne de rapport (le mode de
défaillance d'O-9). Depuis que les sources d'une section vivent DANS la section, une
`.edu-section` porte **deux `<summary>`** — le sien et celui de sa boîte de sources — et le
mode strict de Playwright refuse le clic. Le critère vise le **premier**, celui de la section,
qui est ce qu'A6 mesure ; compter les `<summary>` l'aurait fait bouger à la première source
ajoutée.

**`smoke-tabs`** épinglait *« exactement UNE boîte de sources »*. Mesuré au rendu :
**5 boîtes pour 5 sections, 0 de bas de page, 13 références**. Rien n'est perdu — c'est la
PLACE qui change. Le critère porte désormais sur la propriété (les sources sont rendues ET
référencées) et **publie ce qu'il trouve**, conformément à la règle 17.

**`smoke-usage` R24.6** rougissait sur le **comportement voulu** : le profil de la suite n'a
aucune séance validée, et la refonte a décidé qu'un graphique à trois courbes plates sur zéro
se lit comme un échec — il cède la place à sa phrase. Le critère n'avait qu'une moitié ; il en
a deux — l'état vide (la phrase, pas de tracé) et l'état nourri (la courbe revient d'elle-même
et porte « tu es ici »).

**Trois fautes de mon écriture, publiées.** (1) La coche posée sans re-render explicite
laissait la mesure sur l'onglet **Plan** — `renderTabs` rend l'onglet ACTIF, qui ne l'était
pas — d'où un `svgTrouve: false` que j'allais lire comme une disparition du graphique ;
c'est une sonde qui mesure un écran voisin de celui qu'elle nomme, la famille la plus fréquente
de ce dépôt. (2) La première version ne rendait pas l'état, et la suite **se contaminait
elle-même** : R24.9 lit le jour courant et rougissait. La coche est donc un TÉMOIN, retiré
après mesure. (3) Mon premier diagnostic parlait de « régression » avant d'avoir lu les
commentaires du paquet, qui documentent les deux changements comme voulus.

Seconde passe : **24/25**. La seule rouge est `smoke-nofallback`
(`icon-192.png net::ERR_ABORTED`), la flakiness déjà nommée dans `CLAUDE.md` — rejouée
**trois fois seule, trois fois verte**, 29 assertions (règle 18). Aucun des trois commits
n'approche le service worker ni les assets.

---

## §4 — Le handoff Bikefitting : exact, à deux omissions près

Vérifié contre le dépôt cloné, avant d'être suivi.

| Ce qu'il annonce | Mesuré |
|---|---|
| les 3 commandes qui font foi | `0` et `7` — **exact** |
| les 8 comptes de lignes du §2 | **exacts au chiffre près**, 5 955 au total |
| `npm test` → 70 tests | **70 tests, 70 verts** |
| code mort non importé hors de ses tests | **exact** (5 occurrences, toutes des commentaires ou la définition) |
| `HANDOFF_CLAUDE_CODE.md` périmé, bandeau posé | exact |

**Deux omissions**, toutes deux par défaut :

- son §3 annonce **3 devDependencies** ; le `package.json` réel en porte **9** (Vite 8,
  TypeScript 6, `@vitejs/plugin-react`, trois `@types`). Avec les 4 `dependencies`,
  l'intégration complète amène **13 paquets**, pas 7 ;
- il ne dit **rien de la CSP**, qui est ce qui bloque réellement.

---

## §5 — Ce qui est ajouté : `src/bikefit/`, 56 tests, zéro paquet

Étape 1 sur 5 du §8 du handoff, et rien d'autre.

| Fichier | Lignes | Contenu |
|---|---|---|
| `postureAeroEngine.ts` | 578 | tout le scoring : validation, confort, aéro, plages de sensibilité, Pareto, recalibration du feedback. **Zéro import.** |
| `captureProcessing.ts` | 378 | géométrie des angles, mesures manuelles ASLR/PMH/PMB, pFSA depuis un masque |
| les deux `.test.ts` | 820 | **56 tests, 56 verts** — `npm run test:bikefit`, en CI |
| `docs/SPEC_POSTURE_AERO_MOTEUR.md` | — | quels seuils sont `[SOURCED]`, lesquels sont `[DEFAULT]` |

**Le dépôt reste à zéro dépendance, et c'est le seul changement de fond au code porté** :
l'original passe par `tsx`. Ici les imports portent leur extension `.ts` — la convention de
`src/` — et **Node exécute le TypeScript nativement**. `tsx` disparaît.

**56 sur 70, et les 14 manquants sont nommés** : 6 couvraient `extractTrialAngles`, l'entrée
du pipeline de détection AUTOMATIQUE, mort après deux échecs sur de vraies vidéos ; 3
couvraient `pose-integration.ts`, mort aussi ; 5 la segmentation MediaPipe, non portable sans
la dépendance. La fonction morte est retirée **avec une note à sa place** plutôt qu'en
silence, pour la raison que le handoff donne lui-même : *la porter donnerait l'illusion qu'une
détection auto existe*.

---

## §6 — Ce qui est bloqué, et pourquoi c'est mécanique

Les étapes 2 à 5 (l'UI : `App.jsx` 2 095 l. + `PostureCaptureFlow.jsx` 1 537 l., React 18 +
Tailwind v4 + Vite) butent sur trois murs mesurés dans ce dépôt.

1. **La PWA n'a aucune étape de construction.** `endurabuild/index.html` charge
   `<script type="module" src="js/app.js">` et **45 modules ES servis tels quels**. Du JSX
   exige un bundler sur le chemin du produit — ce que `build:standalone` (23 modules recousus
   en `Blob` + `importmap`) et `check:sw` (VERSION = hachage du contenu SERVI) supposent absent.
2. **La CSP interdit le WASM, et un gate le garde.** `script-src 'self'`, sans plus. MediaPipe
   — que le handoff conserve pour la segmentation de la photo frontale — exige
   `'wasm-unsafe-eval'`. Or `tests/e2e/smoke-securite.mjs:31` asserte
   `/script-src 'self'(;|$)/` : **ajouter le jeton rend ce gate rouge**. Ce n'est pas un
   obstacle à contourner, c'est la décision S-4 ; la lever est un arbitrage du fondateur.
3. **Les polices.** L'`index.html` d'origine charge Bebas Neue, Inter et IBM Plex Mono depuis
   Google Fonts (3 références) quand ici `font-src 'self'`, les polices sont auto-hébergées
   (D19) et `check:hosts` dérive sa liste blanche de la CSP. **Sans conséquence** : ce sont
   exactement les polices que la PWA embarque déjà.

Le §5 du handoff (design system) est **à moitié acquis d'avance** : les tokens que son
`@theme` déclare sont ceux de `zenna-today.css` au nom près (`--color-orange` = `#ff3d00`,
`--color-cyan` = `#00e0c6`, `--color-gold` = `#ffd23d`, les trois surfaces). Rien à inventer
le jour où l'UI sera réécrite en modules ES.

**Le portage ne branche rien** : `src/bikefit/` n'est importé par aucun module, n'entre pas
dans l'`ORDER` de `buildApp.mjs`, ne touche aucun plan. `audit:v1`, le golden et les bancs
sont inertes **par construction**, et c'est vérifié plutôt que supposé (`src/engine`,
`Coach_Pro_V1.5.html`, `engine.js`, `golden/` intacts).

---

## §7 — Vérification

- **Gates statiques** : `check:app` · `check:noop` · `check:dup` · `check:chemins` ·
  `check:hosts` · `check:spec` · `check:tokens` · `check:sw` · `check:dates` — **neuf verts**.
- **E2E** : **24/25 suites**, la seule rouge étant la flakiness documentée, verte trois fois
  sur trois en isolation.
- **`npm run test:bikefit`** : 56/56.
- **Moteur** : inerte par construction, vérifié par `git status` sur `src/engine`,
  `Coach_Pro_V1.5.html`, `engine.js` et `golden/`.

---

## §8 — Deux décisions qui restent au fondateur

1. **Le double mouvement de l'onglet Semaine (§3 du brief).** Le mécanisme est confirmé : à la
   première arrivée, la grille anime ses sept jours pendant que son conteneur monte en `.rise`.
   La piste du brief — ne pas appeler `znPlayDays()` au premier rendu — est faisable, mais elle
   prive alors Semaine de la cascade globale que le §5.1 promet à **chaque** onglet. C'est un
   arbitrage à l'œil, pas une mesure.
2. **Ouvrir `'wasm-unsafe-eval'` dans la CSP**, ou non. C'est ce qui décide si le Bikefit peut
   un jour porter sa pFSA dans cette app, ou si la segmentation reste dehors.

Et un rappel qui n'est pas une décision : le bouton **« Mettre à jour le paiement »** est un
point de branchement, pas un parcours de paiement — le README du paquet le dit, et il ne doit
pas partir en service tel quel.
