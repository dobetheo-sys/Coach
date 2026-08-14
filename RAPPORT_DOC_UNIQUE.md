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

## Ce qui reste (ordre §8)

1. **O-35** — mettre la chaîne natation dans UNE unité, sonde V2.1 mesurant le RENDU
   (ferme T-25/T-23).
2. Phase 3 (critique DA, cadre des trois espaces — la collision brick/récup `#9b72ff` y
   entre).
3. Enrichissement du golden (additif, stratifié sur le volume DE COURSE) → B-26 (périmètre
   élargi au tri) → révision de l'ancrage [1,5 h → 1,15].

**État CI : 28 gates verts · E2E 25/25 · `audit:v1` 459 · invariants 22×54 · v6 73 verts
0 régression · banc du lot : 8 verts · 19 rouges attendus (tous listés) · 0 régression.**
