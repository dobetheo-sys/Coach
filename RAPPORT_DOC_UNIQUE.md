# RAPPORT — exécution du DOC_UNIQUE_R202_ET_APRES_B1 (14/08/2026)

**Branche** : `fix/moteur-physio`. L'ordre unifié du §8 a été suivi ; chaque point porte sa
mesure. Trois choses à arbitrer en fin de rapport, dont un arbitrage ROUVERT sur prémisse
réfutée.

---

## §5 — `sessionSplit` IMPORTE (vérifié à la source)

`bridge.ts › sessionSplitForUI` se termine par `return intensitySplit(...)` — un wrapper de
refs, pas une réimplémentation. **T-01 confronte désormais TROIS voix** (zoneClass ·
sessionIntensity · EBV2.sessionSplit) sur toute zone de ZDEF : sessionSplit n'ajoute aucune
divergence, le rouge de T-01 reste celui que A-01 fermera. Pas de P0.

## §2/§3 — R20.2 : le correctif, et ce que T-25 a trouvé en chemin

**Livré comme spécifié** : PLAFONDS en `min()` parallèle (l'argmin est CE QUI BORNE, les
autres contribuent zéro), FACTEURS en produit inchangé, message avec la ligne levier
(« Si tu levais cette contrainte, X te plafonnerait à Y »), record `plan._r202` émis sur
tout plan. Sur le profil de la classe capture : `R20.2 · pic à 8,5 h — ce qui borne, c'est
la durée de ta préparation` avec `V2.1 · 11,0 h` à côté — **les deux blocs s'accordent**,
plus aucun « ton historique (13 h) » sous une sonde à 7,8.

**Tests écrits rouges d'abord, comptes réels** : T-25 `945/945 sans record` · T-26
`583/583` · T-23 `22/218 écrans incohérents` (le défaut du §1.2, mesuré sur le golden —
pire cas : natation reprise débutant, « ton historique » à 1,2 h pour un pic à 0,7).

**T-26 : VERT le jour même** (invariance par permutation, argmin recalculé par le test sans
ordre, zéro retrait fantôme). **T-19 conserve son vert** (sa clause argmin porte désormais la
garde d'observation, même règle publiée que le moteur).

**T-25 a mordu quatre fois en naissant, et c'est son travail** :

1. **La COURBE déclarée manquait à l'énumération** — run/5k sur 6 semaines : la bande de base
   (0,5) montée à ≤ +10 %/sem n'atteint que Lw = 0,67 au pic ; la chaîne nommait « ton
   historique » (4 h) pour un pic à 2,6 h que seule la montée expliquait. Ajoutée.
2. **La croissance D3/D4 sur le LIVRÉ** la prolonge — mesurée à l'écrêtage (jamais
   reconstruite), avec sa cause (`courbe`/`ramp`/`growth`/`ref`). Ajoutée.
3. **O-35 (nouvelle entrée au registre)** : la chaîne natation est incohérente en UNITÉ dans
   les DEUX sens — débutant livré ≪ min annoncé (pire : 61 % d'écart, et la sonde V2.1 y
   mesure 2,0 h pour des semaines qui livrent 0,5-0,7) ; inter livré ≫ min (3,7 h au-dessus
   d'un « plafond » à 2,16). Une conversion × swimTime a été essayée puis RETIRÉE : ajustée
   sur UN cas, elle inversait l'identité sur 148 profils. En attendant O-35, une **garde
   d'observation** protège le message : un plafond que le pic dépasse ne peut pas être nommé
   « ce qui borne ».
4. **Le rendu discret** : 158 cas à 0,1-0,2 h — tes « 18 minutes » du §0, mesurées à
   l'échelle. La sonde sature un clone continu, le plan rend des séances discrètes.

**Résidu final : 439/945**, deux causes, deux tickets (O-35 + rendu discret), T-25 reste
ROUGE ATTENDU — un vert obtenu en élargissant la tolérance serait le test qui s'ajuste au
défaut. T-23 : 37/218 (le périmètre de l'instrument s'est élargi avec le record — les 22
d'avant ne sont pas comparables, c'est écrit dans le test).

**Golden 949 recapturé : 945 profils changent, champs `_r202` + `decisions` UNIQUEMENT** —
vérifié en les retirant de la comparaison : 0 écart. Pas une séance, pas une minute.

## §6.3 — la liste, en cliquet

`ROUGES_ATTENDUS` : 19 entrées, chacune avec son ticket de fermeture (A-01 · B-01 · B-02 ·
B-03 · B-17 · B-23 · B-26 · N-01 · N-02 · A-02 · A-04 · A-05/A-06 · O-35 · patron B-24).
Contre-prouvé : un rouge hors liste ET une entrée périmée font tous deux sortir le banc en 1.

## T-21 / T-22 — écrits rouges, comptés

- **T-21** : 28 chaînes de message à littéral-avec-unité dans generator + reasoningEngine
  (« +10 % par semaine », « ≈ 25min »…) — chacune peut mentir dès que la constante bouge.
  Fermeture : généralisation du patron B-24/V-11. (R20.2 non refondu, conformément au §0.)
- **T-22** : 14 steps de corps sans zone dans des séances qui NOMMENT une allure — le R2 du
  brick duathlon, **et T-22 en a trouvé AUSSI en tri** (« Brick vélo+CAP ») : le périmètre
  B-26 (416 séances duathlon) est à élargir. Exception récup posée (sans elle : 11 034 faux
  rouges, comme prévu).

## Z-11 étendu + §6.1 + §6.2

- **Trois espaces de noms** (MARQUE · DISCIPLINE · ÉTAT), valeurs LUES dans les fichiers,
  cliquet au plafond mesuré : **3 partages** — `#ff3d00` (O-31, arbitré), `#ffd23d` (doublon
  n°3), et **`#9b72ff` trouvé par le cliquet en l'écrivant** (brick = charge récup =
  violet). Contre-prouvé (cyan → couleur natation : 4/3, rouge).
- **n°5 (fatigue = orange-2) : RÉSOLU par B1** — son seul consommateur (courbes CTL/ATL) est
  mort ; les tokens `--zn-fatigue`/`--zn-form` sont RETIRÉS (un token mort est une invitation
  à le recâbler) et Z-11 rougit s'ils reviennent.
- **§6.1** : prévu/validé est encodé par opacité ET imbrication (barre validée à 56 % de
  largeur, décalée) — pas la seule opacité. Épinglé par le gate, contre-prouvé.
- **§6.2** : MESURÉ — le moteur ÉMET la durée des blocs à distance (`_min` sur chaque step,
  R5.6a ; 71/71 sur swim/demifond). `_blkMin` est donc une occurrence de la règle 12, dette
  libellée **« à brancher »**, portée par l'UI. Le branchement attend sa propre mesure
  (sémantique reps × `_min`).

## ⚠ ARBITRAGE ROUVERT — V-08/B-02a : « aligner sw.aero » reposait sur une faute d'unité

Ta décision « Aligner, et arbitrer C26d dans le même ticket » a été instruite AVANT
d'écrire une ligne, et la mesure a réfuté la prémisse que je t'avais présentée :

- La comparaison mêlait des ratios de **VITESSE** (sw.aero = 94,3 % de la vitesse CSS) à des
  ratios de **PUISSANCE** (bk.ss = 88-94 % FTP). Dans l'eau, traînée ⇒ **P ∝ v³** :
  sw.aero = (1/1,06)³ = **84 % de l'effort seuil**.
- 84 % est SOUS le plancher de la ligne tempo (88 %) et SOUS le propre plafond de `rn.easy`
  (86 %, classée easy). **Le classement actuel respecte l'ordre des efforts.** La ligne tempo
  n'a pas d'homologue natation : les zones de nage sautent de 84 % à 100 %.
- Le coût du reclassement, mesuré sur le golden : **411 semaines** passaient au-dessus de la
  borne C26d des 40 % de modéré (0 aujourd'hui) — la machinerie aurait déclassé des plans
  entiers pour un changement d'étiquette. L'arbitrage C26d devient **sans objet** sous la
  lentille corrigée. (382 plans portent de l'aero : swim 136 · swimrun 136 · tri 110 — pas
  106.)
- T-15 est réécrit sur l'invariant qui tient : **les classes respectent l'ordre des efforts
  entre disciplines** (fractions publiées : facile 56-86 % · tempo 88-94 % · seuil
  95-105 % · VO2 103-137 % — sw.aero 84 % entre les deux premières). Vert, contre-prouvé
  rouge en poussant sw.aero à 1,01 (97 %).

**Je n'ai PAS reclassé.** Exécuter un arbitrage dont la prémisse est mesurée fausse serait la
faute que ton §0 corrige chez toi-même. Si tu maintiens « aligner » en connaissance des
chiffres, c'est un sed d'une ligne (`.aero` dans `MOD_SUFFIX`) + l'arbitrage C26d à
reprendre — mais la physique et le coût plaident pour l'état actuel.

---

# Suite — ARBITRAGE_SW_AERO (§7), même journée

## §4 — `sw.css` / `bk.thr` / `rn.thr` côte à côte : B-02a se FERME sur sa propre mesure

| zone | ZDEF | classe |
|---|---|---|
| `sw.css` | lo 1,00 · hi 1,00 (ref css) | **hard** |
| `bk.thr` | lo 0,95 · hi 1,05 (ref ftp) | **hard** |
| `rn.thr` | lo 1,00 · hi 1,05 (ref thrPace) | **hard** |

Homogène — et la conversion y est bien neutre (1,00³ = 1,00), donc le résultat ne doit rien à
l'argument `sw.aero`, comme ton §4 l'exigeait. **Vérifié aussi en PRATIQUE** (leçon R19.1 : une
déclaration qui n'agit pas) : sur `swim/demifond`, **8 séances sur 8** portant un step `sw.css`
comptent effectivement des minutes DURES (87 min cumulées). B-02a est clos par la mesure.

## §5 — O-35 : le test décisif, et il désignait `peakH`

**`capacityH` est en heures d'EAU** (il compte des minutes réellement prescrites). C'est
**`peakH`** qui était générique : mesuré, `peakH` = 6,00 h pour un `volPeak` de 2,40 —
**rapport 2,50 = 1/0,4 au chiffre près**, quand le témoin course rend 1,00. Et l'unité changeait
avec le NIVEAU (C20 rabote `peakH` avec 25 min/séance, donc le débutant avait déjà l'unité
d'arrivée). D'où le mécanisme complet : **la sonde V2.1 mordait toujours en natation et servait
de convertisseur d'unité par accident**.

**Trois modèles mesurés avant d'en adopter un** — ta note de méthode du §2, appliquée :

| | modèle | rayon sur les 949 | verdict |
|---|---|---|---|
| A | l'état d'avant | — | la promesse ment de 1,6× |
| B | convertir `peakH` comme `volPeak` | 123 profils, **92 baisses jusqu'à −55 %** | **REFUSÉ** — 3 séances de 15 min |
| **C** | **convertir la seule DÉCLARATION** | **88 profils · 47 au plan INTACT · 41 à ±6 %** | **ADOPTÉ** |

**C est structurel, pas calibré** : `SWIM_TIME_FACTOR` code « 60 % du temps déclaré en BASSIN
n'est pas de la nage » — une conversion de ce que l'ATHLÈTE déclare, jamais des tables du
moteur. `HISTORY_CAPS`/`UTIL` sont du volume d'entraînement, comme les lignes course et vélo qui
ne subissent aucune conversion. R20.7 avait déjà posé le principe sur la rampe. **Et l'argument
décisif : sous C le plan livré ne bouge pratiquement pas** — la courbe est pilotée par `peakH`,
jamais converti, donc le moteur traite les tables comme des heures d'eau depuis toujours. C
aligne la PROMESSE sur le plan déjà livré (`swim/sprint/reprise/inter` : 700 min avant, 700 min
après ; promesse 1,1 → 2,0 h pour un pic réel de 1,78).

`swimTime` a quitté la liste des FACTEURS : rien n'est retiré par une conversion, et annoncer
« ce qui réduit le plus, c'est le temps passé dans l'eau » était faux. L'explication vit
désormais sur le plafond `declared` (« 10 h de piscine, soit 4 h réellement dans l'eau »).

**Septième faute d'unité du chantier, dans mon propre correctif** : le retrait annoncé restait
calculé sur `L.declared × Q` sans la conversion — « −7 h/sem » pour une demande convertie qui
ne vaut que 4 h. Trouvée en relisant le message RENDU, pas le code.

**T-25 : 439 → 368.** **T-23 EMPIRE en taux — 10 % → 34 % (22/218 → 61/177) — et je le publie
tel quel** : le correctif retire une compensation qui MASQUAIT l'autre moitié du défaut. Les
plafonds n'étant plus déflatés par 0,4, l'écart entre ce que la sonde V2.1 annonce et ce que la
semaine LIVRE devient visible (nage débutant : 1,6 h/sem annoncées pour 0,7 livrées ; la sonde
sature un clone continu quand le plan rend des séances discrètes). Deux erreurs se compensaient ;
en corriger une seule expose la seconde. Même ticket — c'est la moitié restante d'O-35, avec sa
condition de sortie écrite : **faire mesurer à la sonde ce que la semaine RENDUE livre**.

**Sur B-09** : la sur-pénalisation que tu redoutais venait de l'application aux TABLES, pas de
la valeur 0,4. B-09 perd son urgence ; sa valeur reste une constante nouvelle, donc un
arbitrage — je ne l'ai pas touchée.

**Un site reste NON converti, et c'est une mesure, pas un oubli.** `sessionScale` compare bien
`volMax` (piscine) à `util` (table) quand la déclaration borde, et P11 exige de corriger un
piège d'unité sur TOUT le chemin — j'ai donc écrit la conversion, et **`audit:v1` l'a réfutée** :
violation DURE du manifeste sur `swim/sprint/ancien/debutant`, « 1 saut > +25 % de volume réel
entre semaines de charge ». Diviser l'échelle des séances par 2,5 les envoie toutes sur leurs
planchers C24/C24b, et une semaine épinglée au plancher ne suit plus la courbe : la progression
devient un escalier. Priorité 2 du manifeste contre cohérence d'unité — la sécurité gagne,
l'écart est NOMMÉ dans O-35. Il ne mord que sur les profils déclarant peu de piscine, que le
golden ne contient pas (famille A-2, sixième occurrence).

## §7.3 — Règle 14 et la note de méthode

Écrites dans `CLAUDE.md` : l'exposant appartient à la discipline (vélo natif · course ≈ 1 ·
nage ≈ 3), et la règle 7 vaut aussi pour les tickets d'ALIGNEMENT — deuxième fois qu'un
correctif de cohérence aurait fait des dégâts réels sans mesure.

## Ce qui reste

1. **O-35, moitié restante** — la sonde V2.1 doit mesurer ce que la semaine RENDUE livre
   (planchers, quantification) ; ferme T-25/T-23.
2. Phase 3 (critique DA, cadre des trois espaces — la collision brick/récup `#9b72ff` y
   entre).
3. Enrichissement du golden (additif, stratifié sur le volume DE COURSE) → B-26 (périmètre
   élargi au tri par T-22) → révision de l'ancrage [1,5 h → 1,15].

**État CI (mesuré sur l'état livré) : 28 gates verts · E2E 25/25 · `audit:v1` 459 ·
invariants 22×54 · v6 73 verts 0 régression · golden 949 · banc du lot : 8 verts · 19 rouges
attendus (tous listés) · 0 régression.**
