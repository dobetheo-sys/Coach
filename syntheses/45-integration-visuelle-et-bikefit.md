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

---

## §9 — Le handoff « bilan posture », et pourquoi sa palette n'a pas été reprise

Troisième paquet de la session (`design_handoff_bilan_posture_zenna` : un README de 349
lignes, une référence de design de 18 cadres, 15 captures). Ce n'est pas du code : la
référence est un prototype HTML à styles inline, et son README le dit — *« pas du code de
production à copier »*.

**Sa prémisse porteuse est fausse, et elle décide de tout le reste.** Il annonce
*« l'environnement existant de Zenna (React + Tailwind, d'après `src/index.css` du repo
Bikefiting) »* : c'est le stack du dépôt **Bikefitting**, déduit de son propre CSS, pas celui
de Zenna. La PWA sert **45 modules ES sans étape de construction**. Les écrans se recréent, ils
ne se transposent pas.

### La palette de la référence est celle de Zenna, à un cheveu près — et c'est le problème

Le README annonce des jetons *« repris du système Zenna courant »*. Mesuré sur les 39 couleurs
distinctes du fichier de design :

| | nombre | occurrences |
|---|---|---|
| **déjà un jeton `--zn-*`** | 13 | 243 |
| **quasi-doublon d'un jeton** (distance < 45/442) | **23** | 400 |
| réellement nouvelles | **3** | 71 |

Les quasi-doublons sont indiscernables à l'œil : `#111417` contre `--zn-surface` `#111318`
est à **1** sur 442, `#262a30` contre `--zn-border` `#26292f` à **1**, `#22262b` contre
`--zn-track-bg` à **2**, `#08090a` contre `--zn-on-accent` à **2**. Et la référence porte
**les deux palettes à la fois** : `#ff3d00` (le jeton) y côtoie `#f2481b` (65 occurrences).

Les reprendre littéralement créerait une seconde palette dans le produit — ce que `check:spec`
et `check:tokens` existent pour empêcher — et ferait déborder un cliquet à saturation. Elles
sont donc **routées sur les jetons** ; `zenna-posture.css` porte **zéro littéral**, et son
plafond au cliquet **naît à 0** au lieu de photographier une dette.

### ⚠ Et l'un des trois gris nouveaux ne passe pas le seuil AA

`#6d737a`, qui porte les eyebrows de section (9 px, capitales) et les chevrons, mesure
**4,38:1 sur `--zn-bg`** et **3,88:1 sur `--zn-surface`**. Le seuil AA est 4,5. Éclairci à
teinte constante jusqu'au premier palier qui passe des DEUX côtés : `#787f86`, **5,18** et
**4,58**. Contre-prouvé — remettre le gris de la référence fait rougir §5 de la garde avec
ses six textes fautifs et leurs ratios.

**C'est la deuxième fois dans la même session**, après le `#e63946` du paquet précédent, et par
le même chemin : un cliquet de littéraux qui refuse une couleur nouvelle, et la couleur se
révèle sous le seuil. Le cliquet ne mesure pas le contraste — il oblige seulement à REGARDER
chaque couleur qui entre, et c'est ce qui suffit.

### La typographie réintroduit exactement ce que R16.8 a retiré

168 déclarations en demi-pixels (**9,5 ×76 · 10,5 ×31 · 11,5 ×22 · 12,5 ×39**) et **6 à 8 px**,
sous le plancher que `smoke-typo` garde. R16.8 avait précisément supprimé cette famille —
« 21 tailles distinctes dont quatre sous le pixel (7,5 / 8,5 / 11,5 / 12,5) ». Chaque taille est
rabattue sur le palier `--fs-*` le plus proche. (Les 6 valeurs à 8 px se répartissent 3 dans le
tour 1, qui n'est pas à implémenter, et **3 dans le tour 2**, qui l'est.)

Sans conséquence, mais noté : le README fait venir Poppins, Inter et IBM Plex Mono de Google
Fonts quand `font-src 'self'` les veut locales — ce sont **exactement** les trois polices que
la PWA embarque déjà.

### Ce qui est livré : le socle et l'écran 2a

`tab-posture.js` + `zenna-posture.css` + une ligne dans `tab-outils.js`. Trois états (aucun
bilan · en cours · terminé), l'état dans `SHARED_KEYS` (un bilan de position décrit l'athlète,
pas un plan — la raison d'`educatifs`), `pendingTrial` non persisté comme le dépôt d'origine
l'a décidé.

**Ce module ne calcule rien.** Le moteur porté (`src/bikefit/`, 56 tests) n'entre pas dans le
bundle servi ; l'y faire entrer est une décision de bundling qui n'appartient pas à un écran de
liste.

Trois décisions de rendu qui ne viennent pas de la référence : l'état vide **n'affiche pas
« 0 / 3 »** (reprocher à qui n'a pas commencé, c'est U1) · le creux des essais n'existe que
s'il y a des essais · le CTA **dit** que le parcours arrive au lot suivant plutôt que
d'absorber le tap en silence, ce que la règle d'interaction du handoff interdit elle-même.

Et **aucune seconde cascade n'est posée** : `znPlay` fait déjà le stagger plafonné et le repli
`prefers-reduced-motion`. En poser une ici serait exactement le double mouvement que le §3 du
brief signale sur l'onglet Semaine.

**Garde `smoke-posture.mjs`** (28ᵉ suite, 12 assertions) sur des propriétés et non des valeurs,
**contre-prouvée trois fois sur trois** : gris de la référence remis → §5 rouge avec ses six
textes ; orange posé en dur → §3 rouge (`rgb(255,61,0) → rgb(255,61,0)`, la couleur ne descend
plus) ; entrée du registre retirée → §1 rouge deux fois.



---

## §10 — Les 18 écrans du bilan posture, livrés

Six lots après le §9, le parcours existe. Ce qui suit ne redit pas la vérification de la
palette (§9) : seulement ce que la construction a trouvé.

### Le parcours livré

`2a` entrée · `2b` préparatif · `3a` souplesse · `3f` type d'essai · `2c` pointage ·
`3h` relecture · `2d` réglages du vélo · `2e` résultats · `3e` provisoire à deux essais ·
`3c` historique et tendance · `3d` retour post-sortie · `3b` étalonnage · `3g` silhouette
(mécanisme). La boucle est fermée : on mesure, on pointe, on relit, on enregistre, on compare.

Le moteur porté (`src/bikefit/`) entre dans le bundle en deux temps — la géométrie d'abord
(l'écran de pointage calcule des angles, pas des coordonnées), le scoring ensuite, **quand il a
eu son écran** : exposer une fonction que rien n'appelle est une promesse que rien ne tient.

### Trois défauts trouvés en construisant, dont un vivant

**⚠ Un zéro lu comme une performance.** Avec `pFSA_cm2 = 0`, la surface normalisée vaut 0, donc
`computeAeroScore` la lit comme la plus petite de la cohorte et rend **90** — le meilleur score
aéro possible. L'essai qu'on n'a PAS photographié remportait `equilibre` et `aero_max` : la
position recommandée était celle dont on ne sait rien. **Et 2e livrait exactement cet état** :
faute d'écran de photo de face, tous les essais partent à 0. L'écran annonçait « leur score
aéro repose sur une surface frontale absente » et affichait le classement bâti dessus. Corrigé
au moteur (§3f du handoff), 5 tests, les deux moitiés assertées séparément : écarté du front
aéro, **jamais** exclu au sens de `validateTrial`.

**`object-fit: contain` déformait le pointage.** L'image est mise à l'échelle *dans* son élément
et **centrée** : sur le cadre réel avec une image 400×200, il reste **155 px de vide** en haut
et en bas. Diviser par la hauteur de l'*élément* est juste au centre — où les deux repères
coïncident — et faux partout ailleurs. Invisible au centre, donc un essai à la main le rate.

**Les points en 0..1 déforment les angles.** Un angle est un rapport entre `dx` et `dy` ; les
diviser par des nombres différents change ce rapport. Mesuré : **116,57° en pixels contre
104,04° en 0..1** sur une image 400×200.

### Quatre fautes de mes propres gardes, publiées

1. **Un critère satisfait par le défaut qu'il nomme** — ma figure de test était un angle droit
   **axé**, que la normalisation laisse à 90° dans les deux unités (règle 19).
2. **Un critère qui ne peut pas atteindre sa cible** — §7b *pose* les points directement, donc
   il mesure le moteur, jamais la conversion. Sa contre-preuve est sortie **verte**.
3. **Trois sondes qui mesuraient un écran sans styles** — elles rendaient dans un `<div>`
   détaché alors que tout le CSS est scopé `body.theme-zenna #screen .pt-*`. Elles annonçaient
   « bandes de 0 px » là où il y en a 155.
4. **Une fixture fausse prise pour un défaut moteur** — trois essais rendaient
   `insufficient_valid_trials` parce que le mien avait une hanche à 39° pour un plancher de 40.
   C'est le moteur qui avait raison.

### Trois écarts assumés avec la référence, chacun mesuré

| | référence | livré | raison |
|---|---|---|---|
| palette | 26 couleurs hors jeton | **zéro littéral** | 23 étaient des quasi-doublons, dont un sous AA |
| 3a, étapes de placement | 4 dessinées | **5** | sa légende en annonce 5, la source en porte 7 ; la manquante est « pas de contre-jour » |
| 3g, silhouette | 6 cercles dessinés | **mécanisme sans donnée** | le handoff exige un tracé annoté par un fitter — au jugé, elle produit le décalage qu'elle corrige |

### Ce qui reste, et qui n'est pas du code

- **`3i` — modal ou onglet ?** Le handoff fournit les deux « pour être comparés à taille
  réelle » et dit « à trancher avec l'équipe ». Non tranché ici : c'est un choix de produit.
- **La CSP.** La segmentation MediaPipe exige `'wasm-unsafe-eval'` dans `script-src`, que
  `smoke-securite.mjs:31` interdit. Sans elle, pas de surface frontale, donc pas de score aéro.
  Tout le reste du bilan fonctionne sans.
- **Le sélecteur d'image dans une vidéo** — les écrans de pointage demandent une image fixe et
  le disent.


---

## §11 — Le double mouvement de Semaine, tranché

Trois captures vidéo du geste réel (le même profil, le même clic, capturé depuis le code sur
la branche — pas une simulation) ont été montrées au fondateur en comparaison côte à côte.
Verdict, mot pour mot : « je vois pas bien la différence, je te laisse choisir ».

**Décision : garder l'état actuel.** Trois raisons, dans l'ordre où elles pèsent :

1. **La mesure la plus honnête qui existe** vient de la tomber : si la personne qui va s'en
   servir tous les jours ne perçoit pas l'effet en le voyant tourner en vrai, aucun jugement
   porté sur une vidéo ne vaut mieux que cette réponse-là.
2. **La fenêtre est minuscule** — une seule fois, à la toute première arrivée sur l'onglet dans
   la session. Les retours et les changements de semaine ne sont jamais concernés.
3. **Les deux corrections cassent une promesse ailleurs.** Retirer la cascade des jours au
   premier rendu prive Semaine de la grammaire « chaque arrivée anime jour par jour » qu'elle
   tient partout ailleurs. Retirer la montée du conteneur prive Semaine de la cascade d'entrée
   que les quatre autres onglets ont — l'incohérence exacte que cette cascade existe pour lever.

Les deux payent un coût réel pour un effet que personne ne voit. **Documenté au point de
décision plutôt que laissé en commentaire ouvert** : `tabs.js` (le côté conteneur) et
`tab-week.js` (le côté grille) portent désormais l'arbitrage et sa date, avec un renvoi croisé
l'un vers l'autre — le prochain qui touche l'un des deux fichiers voit l'autre moitié du
mécanisme sans avoir à la redécouvrir.

Aucun comportement ne change ; aucune garde n'a besoin d'un nouveau critère.
