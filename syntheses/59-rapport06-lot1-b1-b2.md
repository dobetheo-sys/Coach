# Rapport 06 — lot 1 (B2 + B1) livré

*15/09/2026 · commit `53ff738` sur `main` · un seul lot, une seule recapture golden, comme
l'arbitrage le demandait.*

---

## Ce qui est livré

| | avant | après |
|---|---|---|
| décisions affichées, corpus entier | 22 962 | **14 399** (−8 563, **−37 %**) |
| médiane par plan | 17 | **13** |
| pire cas (`PW/tri/S/vallonné`) | 86 | **18** |
| profil réel `REEL/tri/70.3` | 55 | **19** (36 repliées) |
| fuites de vocabulaire interne vers l'écran | **18** | **0** |
| gates de la batterie | 13 | **14** |

---

## B1 — une décision répétée se dit une fois, avec son « quand »

### La mesure d'entrée

`RC1` comptait à lui seul **8 778 occurrences sur 501 plans pour UN SEUL couple
(pourquoi + valeur)** — la même phrase de 262 caractères, une fois par semaine de charge. Sur le
profil réel du fondateur, **33 des 55 lignes (60 %) portaient un `why` déjà écrit plus haut**.
Une liste où trente lignes disent la même chose enseigne à ne plus la lire, et c'est là que
vivent les décisions qui comptent : ce qui borne le plan, les paliers de nage, le manque, la
fréquence.

### Ce qui a été écrit

`src/engine/agregerDecisions.ts`, appelé en **un point** — `src/app/bridge.ts`, juste avant
l'assemblage de `plan._v2`.

- **La clé est le QUADRUPLET `id + what + val + why`.** Agréger sur le seul `why` effacerait la
  valeur : `RN1` porte cinq valeurs distinctes sur le corpus, et deux doses qui ne déplacent pas
  la même chose sont deux décisions.
- **L'agrégation vit dans le MOTEUR.** À l'affichage, le moteur annoncerait 55 et l'écran 19 —
  deux comptes pour une grandeur, sur la carte même où **O-96** a payé ce défaut.
- **La position n'est pas perdue.** La semaine se transporte par `wk`, le nom que `repairLoop`
  lit déjà sur les décisions `C30b` : on ne crée pas un second nom pour une grandeur qui en a un
  (R11.1).
- **`compacterSemaines` rend la PLUS COURTE de deux formes, toutes deux EXACTES** —
  « S3-S7, S9-S14 » quand les trous sont nombreux, « S3-S29 sauf S8, S15 » quand ils sont rares.
  Il n'y a donc **aucun seuil à choisir**, donc aucune valeur qu'un test satisfait en l'épinglant
  sur sa borne (règle 19). Jamais un arrondi, jamais un « … ».
- **`niveau` est STRUCTUREL** : une décision attachée à une semaine décrit une mécanique qui se
  répète (niveau 2), une décision sans semaine est un choix de plan (niveau 1) — celui que
  l'athlète est venu lire.

### Ce que l'écran affiche

> 🧠 Les décisions du moteur (**19 décisions · 36 répétitions agrégées**)
>
> … les choix de plan …
>
> *Ce que le moteur a ajusté semaine par semaine (3)*
> **Repos complet garanti** — S1-S41 sauf S4, S8, S12, S16, S20, S24, S28, S32, S36, S40 (31×)

Le « quand » de `RC1` se lit d'un coup d'œil : **toutes les semaines sauf une sur quatre** — et
cette exception EST la cadence de récupération du plan. L'information était présente 31 fois et
illisible ; elle tient en une ligne et enseigne quelque chose.

### Ce que j'ai essayé et retiré

**Le critère de tri « cite une valeur déclarée par l'athlète » a été mesuré et retiré** :
« semaine 12 » coïncide avec un `vol_max: 12` déclaré, et le tri devenait un tirage. Le critère
livré est structurel.

### Ce que l'écriture a débusqué

**Un filtre et deux extractions par regex identifiaient leur cible par un LIBELLÉ** : le filtre
qui retire une décision `C31` déclassée (`dc.what.includes("(sem. " + wk.num + ")")`) et deux
`/sem\. (\d+)/.exec(d.what)` dans `repairLoop`. En déplaçant la semaine du texte vers `wk`, les
trois se seraient tus **en silence** — c'est la règle 17 dans sa forme de **producteur de masse** :
un renommage de donnée produit ne touche aucune structure et passe tous les gates. Les trois
lisent `d.wk`.

**Et le module a été ajouté à la liste `ORDER` de `buildApp.mjs`** — la liste tenue à la main qui
a déjà coûté au lot « plancher de fréquence » un bundle avec des appels et sans définitions.

---

## B2 — le vocabulaire interne n'atteint plus l'écran

### Deux prémisses du rapport rectifiées, dont une qui inverse son classement

1. **Le `**` de l'avertissement d'eau libre n'est pas universel** : **28 profils sur 1 080
   (2,6 %)**, uniquement quand la continuité de nage n'est pas renseignée. Le rapport 06 citait
   une chaîne trouvée dans un **commentaire** — règle 15, quatrième occurrence de cette famille
   dans le dépôt, et cette fois dans le rapport qui l'audite.
2. **Le jargon, lui, l'est** : `courbe` (« Bandes normalisées × pic, récup ×0.62, lissage C22 »)
   et `budget` (« Budget déclaré ∧ budget implicite du volume ») sont émis pour **chaque** plan,
   soit 100 %. **B2 est donc plus gros que B1 en portée, l'inverse du classement du rapport.**

### Le gate — `npm run lint:athlete`, 14ᵉ gate CI

Il porte sur la **SORTIE** : il génère les 1 080 profils et lit les champs que l'athlète VOIT —
`decisions.what/val/why`, `warnings`, et `name`/`det`/`note` de chaque séance. **487 465 champs,
51,8 millions de caractères, 13 secondes.**

- **Les identifiants sont DÉRIVÉS par motif** (`C\d+`, `R\d+\.\d+`, `V\d\.\d`, `X-\d+`, `I\d+`) —
  jamais une liste écrite à la main, qui divergerait du registre à la première règle ajoutée. Le
  prix de la dérivation est le faux positif, et il se paie en **exclusions NOMMÉES une par une
  avec leur raison** (`R1`/`R2` sont les courses d'un duathlon, `T1`/`T2` les transitions d'un
  triathlon), jamais en rétrécissant le motif jusqu'à ne plus rien voir.
- **Les mots de métier sont un DICTIONNAIRE** qui porte le remplacement français à côté du terme.
  Ce n'est pas un interdit, c'est une traduction : celui qui rouvre le fichier après avoir fait
  rougir le gate y trouve la phrase à écrire, pas seulement celle à ne pas écrire.
- **La population est ÉPINGLÉE et PUBLIÉE.** Le succès de ce gate est « 0 fuite », c'est-à-dire
  la valeur qu'un balayage VIDE rendrait aussi. `plans générés + refus typés` doit boucler sur
  1 080, et le nombre de champs lus est imprimé : **la mesure se prouve séparément de son
  résultat**.

### Les 18 fuites, fermées à la source

| texte | plans |
|---|---|
| `budget` : « Budget déclaré **∧** budget implicite du volume » | 1 066 |
| `courbe` : « **Bandes normalisées** × pic, récup ×0.62, **lissage C22** » | 1 066 |
| `« OFF (lissage) »` → `« OFF (allègement) »` | 233 (370 séances) |
| `C20` : « Une séance **C15** ≈ 25min » | 233 |
| `V2.1` : « Promesse calibrée par **sonde de capacité** » / « (formats, **C15/C21/C24**) » | 226 |
| avertissement « **C29d —** … » | 117 |
| `O-83` : « ne peut pas dépasser 850 m (**C15**) » | 78 |
| `RN1` : « si le **readiness** n'est pas vert » | 74 |
| blessure/âge : « plafond de charge (**R6.2/R6.3**) » | 37 |
| `**` de l'avertissement d'eau libre | 28 |
| `recup` : « cadence resserrée (**R6.3**) » | 11 |
| `B17-continuite` : « la course, pas le plan (**O-17**) » | 3 |
| mineur : « la VO2max attendra la majorité (**R6.3**) » | 1 (6 séances) |

Exemples de réécriture :

- « Bandes normalisées × pic, récup ×0.62, lissage C22 ≤+10%/sem » → *« La charge monte vers le
  pic puis redescend avant la course ; les semaines de décharge valent 62 % de leurs voisines, et
  le plan ne monte jamais de plus de 10 % d'une semaine à l'autre. »*
- « Budget déclaré ∧ budget implicite du volume (4.0h ÷ 1.15h/séance) » → *« Le plus petit des
  deux : ce que tu as déclaré, et ce que ton volume permet (4.0 h à répartir, environ 1.15 h par
  séance). »*
- « Promesse calibrée par sonde de capacité » → *« Promesse calibrée sur ce que tes séances
  peuvent contenir. »*

**⚠ Deux de ces fuites n'étaient PAS dans mon balayage préparatoire**, qui lisait la photo golden
**stockée** — elle datait d'avant `O-83`. Le gate, lui, **génère**. C'est exactement la différence
entre lire une photo et mesurer ce qui s'exécute, et elle a valu deux fuites de plus.

---

## Rayon golden : 1 066 profils sur 1 080, et pas une minute déplacée

Mesuré **champ par champ** entre les deux photos :

```
champs NUMÉRIQUES / steps / comptes de séance qui changent : 0
renommages de séance :  370   OFF (lissage)  →  OFF (allègement)
```

Les seuls champs qui bougent sont des **textes** (`decisions.why` 4 208 · `.val` 2 694 ·
`.what` 2 427 · `warnings` 175 · `sessions.name` 370 · `.det`/`.note` 6+6) et les **métadonnées
B1** (`niveau` 14 399 · `repetitions` 1 066 · `quand` 648 · `wk` 615 · `n` 581).

---

## Les gardes, contre-prouvées rouges

| garde | contre-preuve | verdict |
|---|---|---|
| `T-54` (5) doublons | agrégation désactivée dans `bridge.ts` | **ROUGE** |
| `T-54` (6a) identité comptable | `n` jamais posé | **ROUGE** |
| `T-54` (6b) décompression | `quand` tronqué à 2 semaines | **ROUGE** |
| `T-54` (6) | `wk` retiré de l'émission de `RC1` | **ROUGE** |
| `lint:athlete` | « (R6.3) » remis dans un texte athlète | **ROUGE** |
| `lint:athlete` population | corpus tronqué à 612 profils | **ROUGE** (« 0 fuite » ET refus de conclure) |
| `smoke-usage` B1 (4 critères) | fixture sans répétition | **témoin vert** |

Toutes les mutations passent par `npm run casser` — jamais un `sed` à la main.

### ⚠ Une faute de ma propre écriture, publiée

**Mon premier critère (6) de `T-54` était sous-spécifié, et la contre-preuve l'a dit.** Il portait
« `n > 1` implique un `quand` non vide » — or le correctif le moins coûteux qui le satisfait est
de **ne jamais poser `n`**. Mesuré : neutraliser la pose de `n` laissait `T-54` **verte** pendant
que la position était intégralement perdue, c'est-à-dire le défaut même que le critère existe pour
empêcher. C'est la **règle 19**, que j'avais citée en écrivant le module une heure plus tôt.

Il porte désormais deux propriétés qu'aucune suppression ne satisfait :

- **(6a) identité comptable** — la somme des `n − 1` vaut exactement `repetitions`. Jeter les
  doublons en silence donne 0 ≠ 36.
- **(6b) décompression** — le « quand » se décompresse en exactement `n` semaines distinctes.
  C'est l'opération **inverse** de la compaction, pas une seconde copie de son algorithme : elle
  attrape une liste tronquée, un « … », un arrondi.

---

## Règle 17, appliquée mécaniquement

Ce lot renomme une séance et réécrit treize textes athlète : c'est un producteur de masse d'entrées
de registre qui basculent en « ne reproduit plus ». Plutôt que de le vérifier à l'œil,
**`registry:check` a été rejoué des DEUX côtés du lot** (worktree sur `639ed1e`, le commit
d'avant) et les deux listes comparées :

> **0 entrée ne bascule en « ne reproduit plus » à cause de ce lot.**

`O-87` basculait **déjà avant** : son `attendu` citait `livre=10`, la valeur du jour de sa
fermeture, que deux lots ont depuis déplacée à **8**. Vérifié à la main contre le moteur d'avant :
`val=11 · livre=8` des deux côtés. Il est **réancré sur la PROPRIÉTÉ** — les deux comptes existent
et le livré ne dépasse pas le prescrit — et publie ce qu'il trouve.

*(Trois autres entrées diffèrent dans l'autre sens — `O-120`, `O-121`, `AUDIT05-SECU` — parce
qu'elles lancent des suites E2E que le worktree de comparaison ne peut pas exécuter, n'ayant pas
de `node_modules`. Artefact de la méthode, pas une réparation : dit plutôt que tu.)*

---

## Vérification — sortie complète de `npm run batterie`

```
✓ audit:v1         exit=0  [5s]
✓ audit:invariants exit=0  [6s]
✓ audit:v6         exit=0  [14s]
✓ audit:v7         exit=0  [34s]
✓ audit:monotonie  exit=0  [4s]
✓ audit:r13        exit=0  [2s]
✓ audit:r14        exit=0  [2s]
✓ audit:r14.1      exit=0  [2s]
✓ audit:r18        exit=0  [12s]
✓ golden:verify    exit=0  [19s]
✓ golden:bundle    exit=0  [30s]
✓ check:dates      exit=0  [0s]
✓ lint:athlete     exit=0  [13s]
✓ lotPhysio        exit=0  [26s]

14 gate(s) vert(s) · 0 rouge(s)
```

Plus : **E2E 27/27 suites**, `audit:v1` 459 combinaisons à 0 violation dure,
`lotPhysio` 33 verts · 24 rouges attendus · **0 régression**,
`check:app` / `check:sw` (`eb-pwa-c496960a9c57`, 81 assets) / `check:dup` / `check:spec` verts.

---

## Ce que ce lot ne fait pas

- **Aucun renommage de séance au-delà de `OFF (lissage)` → `OFF (allègement)`.** « Nage seuil
  (+dist) » reste intact — l'arbitrage le réserve à son propre commit, après stabilisation de
  cette recapture.
- **Aucun texte moteur produit côté affichage.** B3 (« pourquoi aujourd'hui ») reste sur sa table
  de formulations, non commencé.
- **Aucun plan modifié.** Zéro minute, zéro séance, zéro step.

---

## Reste de la file, dans l'ordre arbitré

**B3** (« pourquoi aujourd'hui », option c) → **B4/B5** (glossaire dérivé de `ZDEF` · pont
Éducatifs ↔ séance) → **A3** (règle du jeu écrite) → **A4** (boutique sans prix ni « ACTIVER ») →
**A1** (Strava ferme la boucle, commit isolé) → **A5** (budget d'interruption) → **A2(a)**
(`VALARM` dans l'export iCalendar).

---

## Deux points d'attention pour toi

1. **Le 52 % est la moitié honnête du résultat de B1** : **558 plans sur 1 066 ne portent aucune
   répétition**. L'agrégation sert les plans longs et multisport — un 10 km de quatorze semaines
   ne voit rien changer. Si tu attendais un gain universel, il n'y en a pas, et c'est mesuré.

2. **Ce lot est parti sur `main`**, comme les trois lots du rapport 05 de cette session. La
   consigne de branche de mon environnement nomme `claude/mockup-engine-integration-ftnf7f` — mais
   cette branche distante est restée à `docs(phase0)` / `R30`, elle ne contient aucun des rapports
   01 à 05, et y poser ce lot le construirait sur une base périmée. Dis-moi si tu veux que la
   suite y aille quand même : ça demanderait de rebaser cette branche sur `main` d'abord.
