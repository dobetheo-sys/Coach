# 18 — Le moteur gère le cycle de 10 jours **en rotation de créneaux**, et compte le volume **en semaines de 7**

**Date** : 24/08/2026 · **Aucune correction** — diagnostic seul, `src/` byte-identique.
**Profil** : `REEL/tri/70.3/nage-limitante` (celui du diagnostic 17).

---

## Réponse en une ligne

**Les deux à la fois, et c'est le problème.** Le cycle de 10 jours existe et agit — mais
seulement sur la **rotation des créneaux**. Tout ce qui porte du **VOLUME** (phases, courbe de
charge, croissance C22, `peakH`, `structurel`, la semaine affichée) est indexé sur une
**semaine calendaire de 7 jours, codée en dur**. Le plan livré ne contient **aucune semaine de
10 jours** : 43 semaines de 7 jours dans les deux configurations.

---

## 1. Où la longueur de cycle est déterminée

| site | rôle |
|---|---|
| `reasoningEngine.ts:373` | `use10 = dispo === "quotidienne" && shift_ok === "oui" && offDays.length < 2` |
| `reasoningEngine.ts:374` | décision « Cycle de 10 jours — activé » |
| `weekBuilder.ts:122` | **`const cycleLen = r.use10 ? 10 : 7`** — la seule longueur de cycle du moteur |
| `weekBuilder.ts:91-104` | `schema(use10, …)` — 10 positions ou 7 |
| `weekBuilder.ts:143-175` | la boucle de jours : `dic >= cycleLen` ouvre un cycle |
| `weekBuilder.ts:171` | `cyclesDansPic = ceil(semaines_pic × 7 / cycleLen)` |
| `weekBuilder.ts:179` | `pas = cycleLen / 7` — conversion cycle → semaines pour les phases |
| `planGenerator.ts:2373` | `nSem = round(days.length / (use10 ? 10 : 7))` |

**Aucun autre terme n'existe** : ni `microcycle`, ni `weekLength`, ni `cycle_len` côté plan
(`cycle_*` dans le schéma désigne le cycle MENSTRUEL, pas l'entraînement).

### ⚠ Et la ligne qui décide de tout

```js
weekBuilder.ts:173   const w = Math.floor(i / 7);     // l'index de SEMAINE
weekBuilder.ts:265   days.push({ week: w + 1, … })
```

**L'index de semaine est une division entière par 7, en dur, quel que soit `cycleLen`.** C'est
lui qui range chaque jour dans sa semaine, et c'est cette semaine que lisent : les **phases**
(`p.start`/`p.end` sont des numéros de semaine), la **courbe de charge** (une cible par
semaine), **C22** (+10 % max entre semaines de charge), **`peakH`**, **`structurel`**, et
l'écran.

---

## 2. Déclaré vs réellement utilisé, sur le profil

| | déclaré | utilisé |
|---|---|---|
| longueur de cycle | **10 jours** (`use10 = true`, décision publiée) | **10 jours pour la rotation des créneaux** |
| unité de volume | — | **7 jours**, en dur |
| semaines livrées | — | **43 semaines de 7 jours** (`7/1` — la dernière est tronquée par N2) |

`structurel` (`planGenerator.ts:4583-4634`) clone **`wPic.days`**, c'est-à-dire les jours d'une
**semaine calendaire de 7 jours** — jamais un cycle de 10. Sa valeur est donc une capacité
« par 7 jours », comparée à des plafonds eux aussi en h/**semaine**. **Les unités sont
cohérentes** ; ce qui ne l'est pas, c'est que la composition d'une semaine de 7 varie quand le
cycle en fait 10.

---

## 3. Ce que ça coûte, mesuré à facteur unique

| | `use10 = true` (quotidienne) | `use10 = false` (semaine) |
|---|---|---|
| `structurel` | **11,81 h** | **12,41 h** |
| **pic livré** | **11,52 h** (9 créneaux) | **12,32 h** (8 créneaux) |
| créneaux/semaine de charge | min **7** · médiane 8 · max **10** | **8 · 8 · 8** (constant) |
| capacité sur 10 j glissants | 16,38 h (= 11,47 h /7 j) | 18,63 h (= 13,04 h /7 j) |

**Le cycle de 10 donne PLUS de créneaux au pic (10 contre 8) et livre MOINS (−0,8 h).** La cause
est dans la ligne du dessous : sous `use10`, le nombre de créneaux **varie de 7 à 10** d'une
semaine à l'autre, alors que le schéma de 7 en pose **8, toujours**. La courbe vise une valeur
par semaine ; les semaines à 7 créneaux ne peuvent pas la tenir, et la croissance C22 se
mesure entre des semaines qui ne portent pas la même structure.

**Le fondateur perd donc 0,8 h de pic — et 3 h sur la capacité mesurée en fenêtre de 10 jours —
en activant le cycle qui est censé lui en donner plus.**

---

## 4. L'hypothèse « 7 jours × 3 doublés » du diagnostic 17

**Rectification de ma propre formulation.** Ce n'était pas une constante du code, et je l'avais
écrite comme si c'en était une. Mesuré :

- le **7** EST codé en dur — `Math.floor(i / 7)`, et toute la chaîne de volume derrière ;
- le **« 3 doublés » ne l'est nulle part** : c'est le nombre de créneaux dont la branche `dbl`
  du module de sport **AJOUTE** une séance au lieu d'en substituer une (`dur1`, `dur2`,
  `facileR`) — un émergent, pas un réglage (fiche 09).

**Généralisable ?** Le `cycleLen` l'est déjà pour la rotation ; ce qui ne l'est pas, c'est
l'unité de volume. La rendre variable toucherait les phases (numérotées en semaines), C22, la
courbe, la décision `recup`, et l'affichage — c'est un chantier, pas un paramètre.

---

## 5. O-103 et le diagnostic 17 : **même cause racine**, mesurée

O-103 dit : *le cycle de 10 ne livre que 77-82 % de ses positions clés, contre 100 % pour le
schéma de 7.* Le §3 ci-dessus en donne la conséquence chiffrée : **créneaux de 7 à 10 au lieu
de 8 constants**, `structurel` −0,6 h, pic livré −0,8 h.

C'est **le même mécanisme** — un cycle de 10 découpé en semaines de 7 —, vu à deux endroits :

```
O-103         la POSITION dérive        (77-82 % des positions clés portent leur créneau)
O-104         le VOLUME d'une semaine dépend du jour de course (facteur 6 autour d'une course B)
diagnostic 17 le PLAFOND `structurel` est plus bas sous use10 qu'à 7 jours
```

**Un seul correctif les couvre : que l'unité de volume soit le CYCLE, pas la semaine
calendaire.** Un correctif local à `j7` (O-103) ou au jour de course (O-104) laisserait les
deux autres.

---

## 6. Question ouverte — retirer le doublage serait-il simple ?

**Mécaniquement, oui : c'est un drapeau.** `doubles` est lu en un point
(`reasoningEngine.ts:642` → `dbl`), et le module de sport porte des branches `if (dbl)`. Aucun
couplage avec le calcul de `structurel` : la sonde mesure la semaine livrée, quelle qu'elle
soit.

**Mais le coût est le plus élevé de tous les leviers du moteur.** Mesuré sur ce profil :

| | pic livré | créneaux max | `structurel` | total |
|---|---|---|---|---|
| `doubles: oui` | **11,52 h** | 10 | 11,81 h | 363 h |
| `doubles: parfois` | **8,70 h** | 7 | 7,72 h | 294 h |
| `doubles: non` | **8,70 h** | 7 | 7,72 h | 294 h |

**−2,8 h de pic (−24 %) et −69 h sur la préparation.** Et le maillon change de nom : sans
doublage, `structurel` tombe à 7,72 h et c'est `caps` (13 h) qui devient l'argmin — le moteur
dirait alors « ce qui borne, c'est ton historique » sur un plan qui en livre 8,7.

⚠ **À noter aussi** : `parfois` et `non` rendent le **même plan au centième** — le moteur ne
place de seconde séance que sur `oui`. Retirer l'option reviendrait donc à figer tout le monde
sur le comportement `non`, qui est déjà celui de deux réponses sur trois.

**Recommandation, à arbitrer** : retirer le doublage ne simplifierait pas le calcul 10 jours —
il ne l'affecte pas — et coûterait un quart du volume au seul profil qui l'utilise. Si le but
est de simplifier avant de corriger le cycle, le levier moins cher est de **désactiver
`use10`** (une condition, `reasoningEngine.ts:373`) : mesuré, ça **rend** 0,8 h de pic au lieu
d'en retirer 2,8.

---

## Reproduire

```bash
npm run mesure:cycle10    # §1 la séquence · §4 la dérive (O-103) · §6 où tombe l'écart
npm run mesure:doublage   # §A l'effet de `doubles` par sport · §F la fenêtre de 10 jours
```
