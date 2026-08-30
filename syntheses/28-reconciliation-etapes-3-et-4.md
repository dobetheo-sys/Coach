# 28 — Réconciliation étape 3 / étape 4 : **les deux rapports se contredisent, et les DEUX ont tort**

**Brief 29** · 25/08/2026 · **aucune ligne écrite** — `src/` byte-identique, aucun plan proposé.
Ce lot réfute une conclusion de la fiche 26 **et** le diagnostic de cause racine de la fiche 27,
c'est-à-dire deux de mes propres rapports.

---

## 0. La réponse courte

| | ce que le rapport disait | ce que la mesure dit |
|---|---|---|
| **Fiche 26** | « la courbe est honorée, il n'y a rien à convertir » | **réfuté** — le ratio était mesuré contre une cible RABATTUE sur le livré : bornée à ±10 % par construction, 50 % des semaines à 1,000 exactement |
| **Fiche 27** | « l'unité de la courbe est la cause racine » | **non soutenu** — la cible de BOUCLE vaut **13,0 h dans les DEUX modes**. La courbe ne vise pas plus bas sous `use10` |

Elles ne se contredisent donc pas sur un fait : **elles commettent la même faute en miroir** —
lire `vol_declared`, qui est une SORTIE rabattue, comme si c'était l'entrée qu'il vise
(règle 12 / O-43). L'une en conclut « tout va bien », l'autre « la mauvaise unité » ; la vérité
est ailleurs, et elle est mesurable.

---

## 1. Ce que la mesure de la fiche 26 teste réellement (tâche 1)

Elle compare le livré de la semaine calendaire à **`vol_declared` de la même semaine**. Or
`vol_declared` est réécrit sur le livré à **deux endroits** de `planGenerator.ts` :

```js
// ligne 1208 — vers le haut
if (delivered > (wk.vol_declared ?? wk.vol) * lim) { wk.vol_declared = delivered; … }

// ligne 1227 — dans les DEUX sens, tolérance 10 %
if (declared > 0 && Math.abs(declared - delivered) / declared > 0.10) { wk.vol_declared = delivered; }
```

**Le ratio ne peut donc pas sortir de [0,90 ; 1,10]**, et toute semaine qui sous-livrerait de
plus de 10 % voit sa cible réécrite à la valeur livrée — c'est-à-dire que **la mesure rend 1,000
précisément là où le manque est le plus grand**.

Mesuré sur les 31 profils `use10`, 480 semaines de charge pleines :

```
ratio hors de [0,90 ; 1,10]                          2 / 480   (0,4 %)
déclaré == livré (signature du rabattement)        240 / 480   (50,0 %)
min 0,893 · p10 0,947 · méd 0,990 · p90 1,003 · max 1,076
```

Le dépôt le savait déjà, et c'est écrit dans son propre code, quinze lignes au-dessus de la
décision `manque` : *« mesurer le manque dessus annonçait 0,6 h là où il en manque 3,6 à 5,0 :
le rabattement efface sa propre trace. »* **J'ai commis dans la fiche 26 exactement la faute que
le commentaire du moteur met en garde de commettre.**

### La même question, posée à la cible de BOUCLE

`_ciblesBoucle` archive `targetH` AVANT tout rabattement, et la décision `manque` la publie.
**9 profils `use10` sur 31 déclarent un manque** :

```
O-21b/run/10k ×4                pic visé 5,5 h/sem — livré 3,7   (écart 1,8 h/sem)
CYCLE10/tri/S/debutant          pic visé 4,1 — livré 3,4         (0,6)
CYCLE10/tri/S/inter             pic visé 4,7 — livré 3,8         (0,9)
CYCLE10/tri/S/avance            pic visé 4,1 — livré 3,5         (0,6)
CYCLE10/duathlon/L/inter        pic visé 10 — livré 9,5          (0,6)
REEL/tri/70.3/nage-limitante    pic visé 13 — livré 11,5   (1,5 h/sem, 55,3 h sur la prépa)
```

**La courbe n'est PAS honorée. La fiche 26 §2 est réfutée par sa propre mesure, relue
correctement.**

Et en retirant les semaines rabattues, une tendance apparaît là où la fiche 26 n'en voyait pas :

| créneaux | 3 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|
| semaines non rabattues | 8 | 99 | 120 | 3 | 2 | 4 | 3 |
| ratio moyen | 0,967 | 0,969 | 0,974 | **0,902** | **0,938** | **0,941** | **0,947** |

Les effectifs à 7-10 créneaux sont petits (12 semaines) — je le dis plutôt que de conclure : la
tendance est **cohérente** avec « plus la semaine est fournie, moins la cible est tenue », elle
n'est pas **établie** par ces effectifs.

---

## 2. La désynchronisation phase / cycle se généralise (tâche 2)

Frontières de phase tombant ailleurs que sur une frontière de cycle, sur les 31 profils :

```
31 profils sur 31 en portent au moins une
121 frontières sur 124  (98 %)
```

`tri/Full` (26 cycles) en porte 3 sur 4, tous les autres 4 sur 4. **Le constat de la fiche 27 §4
n'est pas propre à `REEL` : il est universel sous `use10`.**

Mais il faut le dire précisément : **aujourd'hui, la phase et la courbe sont SYNCHRONISÉES entre
elles** — les deux changent à une frontière de semaine calendaire. C'est le **cycle** qui est
désynchronisé des deux. La désynchronisation phase/courbe que décrit la fiche 27 n'existe que
DANS le correctif retiré, pas dans le moteur livré.

---

## 3. La synthèse qui réconcilie — et ce n'est pas celle que le brief proposait (tâche 3)

Le brief proposait : *« la courbe est bien honorée en valeur (fiche 26) mais mal synchronisée
dans le temps (fiche 27) — deux propriétés différentes. »* **Ce n'est pas ça.** La première
moitié est fausse : la courbe n'est pas honorée en valeur, la mesure qui le disait était aveugle.

La réconciliation réelle tient en une expérience à facteur unique, sur `REEL`, tout le reste égal
(`dispo: quotidienne` → `semaine`) :

```
                        use10          7 jours
cible de BOUCLE         13,0 h/sem     13,0 h/sem     ← IDENTIQUE
pic livré               11,5 h         12,3 h
manque déclaré          1,5 h/sem      0,7 h/sem
cible déclarée max      12,70 h        13,00 h        ← rabattue, donc conséquence
créneaux au pic         9              8
min/séance au pic       76,8           92,4
maillon R20.2           structurel     structurel     (« le nombre de séances »)
```

**La cible est la même. L'écart de 0,80 h est donc à 100 % un écart de PLACEMENT, pas de
cible.** Et par conséquent :

> ⚠ **Rectification de la fiche 27 §5.** J'y avais décomposé l'écart en « ≈ 0,30 h de cible
> déclarée plus basse + ≈ 0,50 h de sous-livraison ». Les 0,30 h n'existent pas comme cause :
> 12,70 est la cible **rabattue**, c'est-à-dire l'écho du manque, pas son origine. La faute est
> la même que celle de la fiche 26 — j'ai lu une sortie comme une entrée. **La décomposition
> correcte est : 0,80 h de sous-livraison, 0,00 h de cible.**

---

## 4. Ce qui produit réellement l'écart — et ce n'est pas le calendrier (tâche 3 bis)

Composition de la semaine de pic de `REEL`, à facteur unique :

```
use10   S37  11,52 h  ·  Endurance vélo 2×101 · Brick 173 · Longue CAP 90
                          Nage récup 2×34 · Allure course 64 · Nage seuil 59 · Footing 35
7 j     S41  12,32 h  ·  Brick 212 · Endurance vélo 110 · Longue CAP 100 · VO2max vélo 73
                          Nage seuil 70 · Allure course 68 · Nage récup 56 · Footing 50
```

Sous `use10`, deux créneaux FACILES sont dédoublés (Endurance vélo, Nage récup) et **la VO2max
vélo disparaît de la semaine de pic**. Sur le plan ENTIER, la substitution est systématique :

```
                      use10   7 jours
Endurance vélo         ×39     ×30
VO2max vélo            ×14     ×21
Sortie longue CAP      ×20     ×25
Sortie longue vélo      ×4      ×6
total du plan          363 h   366 h      ← quasi identique
séances                 317     305       ← plus nombreuses, plus courtes
```

**Le cycle de 10 ne perd pas de volume sur la préparation (363 contre 366 h) : il le
REDISTRIBUE**, en remplaçant de la qualité et des sorties longues par de l'endurance dédoublée.
C'est O-102 (`dur1` une fois par 10 jours au lieu d'une fois par 7) et O-103, généralisés au plan
entier. Le pic en souffre parce que c'est là que la qualité et la longue pèsent le plus.

### ⚠ Et « le cycle de 10 coûte 0,8 h de pic » ne se généralise PAS

Expérience à facteur unique sur les **31** profils (`dispo` seul varie) :

```
31 profils · 9 livrent MOINS sous use10 · 22 livrent autant ou plus
Δ pic cumulé  +0,83 h   (use10 livre PLUS, en agrégat)
```

Les swimrun gagnent +0,75 à +1,10 h, `trail/debutant` +0,38, `run/marathon/inter` +0,35. Les
perdants sont `REEL` (−0,80), `tri/S/inter` (−1,18), `tri/S/avance` (−0,70) et les quatre
`O-21b/run/10k` (−0,22). **La perte est une propriété du TRIATHLON LONG à budget élevé, pas du
cycle de 10.** La fiche 18 avait mesuré ce chiffre sur le seul profil du fondateur et l'avait
écrit ainsi (« le fondateur perd 0,8 h ») — c'est correct ; ce qui manquait était la population,
et la voici.

**Un fait à ne pas manquer** : `REEL` est **le seul des 31** dont le nombre de créneaux au pic
change (9 sous `use10` contre 8) — il reçoit un créneau de PLUS et livre moins.

---

## 5. Surface réelle d'une conversion de `vol_declared` au cycle (tâche 4)

**Bornes de phase** — 9 occurrences de `p.start`/`p.end`, 4 fichiers, dont **3 lectures de
POSITION** seulement (`planGenerator.ts:3053`, `weekBuilder.ts:170` et `:174`) et une de
PROGRESSION dans la phase (`:3054`, `:3862`, `weekBuilder.ts:439`). Petite surface.

**`vol_declared`** — 16 occurrences dans `src/`, 5 dans `scripts/`, 13 dans la PWA ; les
consommateurs sont `coherenceScorer` (l'auditeur), `runV1Audit`, `retentionDemo`, `export.js`,
`lotPhysio`, `mesureManque`.

**Ce qui décide de la taille, c'est `plan.weeks`** : 55 lectures dans 13 modules de la PWA,
21 modules de `src/` hors générateur, **60 scripts et bancs**. Deux formes possibles, et une
seule est finançable :

- **(a) conversion INTERNE** — la courbe se calcule par CYCLE puis se répartit au prorata sur les
  semaines calendaires ; `plan.weeks` reste hebdomadaire. Surface : **une boucle, un fichier**
  (`planGenerator.ts` 3052-3140, ~90 lignes), plus `_ciblesBoucle` et la réindexation de
  `refWeekCaps[w]`. Rien d'autre ne bouge.
- **(b) `plan.weeks` devient des cycles** — casse le contrat public (une « semaine » de 10 jours),
  les 60 bancs, le golden, l'auditeur et la PWA. **À écarter.**

**Garantie d'identité à `cycleLen = 7`** : elle tient STRUCTURELLEMENT — `Math.floor(i/7)`,
`wd.length / 7`, `prog = (w − ph.start) / (ph.weeks − 1)` et `refWeekCaps[w]` sont tous indexés
par la même grandeur, et le plan de référence de `refWeekCaps` porte le même `use10` donc le même
`cycleLen`. **Mais je ne l'ai pas VÉRIFIÉE** : aucune ligne n'a été écrite dans ce lot. Pour
`structurel` (étape 2) et pour C22 (étape 3) la garantie a été vérifiée par mesure
(`golden:verify` 0 écart sur les 985 profils non-`use10`) ; la même vérification est disponible
ici, et elle est la condition d'acceptation, pas une conclusion à emprunter.

**Profils dont le comportement changerait** : les **31** `use10`, et **eux seuls**, si la
garantie tient — les 985 autres ont `cycleLen = 7`, donc `cycleLen/7 = 1`. Le risque de
débordement n'est pas nul et il porte un nom : **O-36** — l'auditeur vérifie C22 semaine par
semaine (`coherenceScorer.ts:330`, `w.declaredMin > prevDecl × 1,1`) ; si le générateur change
l'unité de la cible, l'auditeur doit changer dans le MÊME commit.

---

## 6. Conclusion explicite (tâche 5)

> **Non. Un chantier ciblé sur `vol_declared` seul ne fermerait PAS l'écart de 0,80 h sur
> `REEL`, et la mesure le dit sans ambiguïté : la cible de boucle vaut déjà 13,0 h dans les deux
> modes. Convertir une cible que le moteur vise déjà correctement ne changera pas ce qu'il
> place.**

Ce qui reste, nommé, dans l'ordre où la mesure le désigne :

1. **O-102 / O-103 — le vocabulaire du schéma de 10 jours.** C'est le producteur mesuré : un
   `dur1` par 10 jours au lieu d'un par 7, deux créneaux faciles dédoublés, VO2max ×14 contre
   ×21 et sortie longue CAP ×20 contre ×25 sur le plan entier. **C'est la seule pièce dont la
   mesure montre qu'elle porte l'écart.**
2. **La borne de séance sous doublage** — `REEL` reçoit 9 créneaux et 76,8 min/séance contre 8 et
   92,4 : plus de créneaux, moins de minutes. La question ouverte est de savoir ce qui empêche
   les séances de grandir quand il y en a plus, et elle croise O-97 et le maillon `structurel`.
3. **L'unité de la courbe** — utile pour la COHÉRENCE (une cible hebdomadaire posée sur un
   plan qui ne raisonne pas en semaines reste une faute d'unité, et O-104 en vit), mais **la
   mesure ne lui attribue aucune part de l'écart de volume**. À traiter comme un chantier de
   justesse, pas comme le levier du pic.
4. **O-106 reste ouvert** avec sa décomposition rectifiée (0,80 h de sous-livraison, 0,00 h de
   cible).

---

## Vérifications

```
src/                  0 ligne modifiée · aucun plan proposé
mesures               31 profils use10 · 480 semaines de charge · 124 frontières de phase
                      expérience à facteur unique (dispo seul) sur les 31, deux sens
faute d'instrument    ma première sonde lisait plan.decisions (0 décision sur 31 —
                      zéro saturé) ; les décisions vivent dans plan._v2.decisions
```
