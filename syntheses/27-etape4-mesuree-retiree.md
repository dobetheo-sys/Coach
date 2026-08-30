# 27 — Étape 4 (phases en jours) : écrite, mesurée, RETIRÉE

**Brief 28** · 25/08/2026 · moteur `src/` byte-identique à `HEAD` après le lot ·
diff conservé dans `e4-phases-en-jours.patch` (30 lignes) · registre **O-106**

---

## 1. Ce que l'étape 4 devait faire

Faire raisonner les bornes de phase en **jours** (via `phaseJours()`, livrée à l'étape 1) et les
**caler sur les frontières de cycle**, pour qu'une transition de phase ne tombe plus au milieu
d'un cycle de 10 jours. Hypothèse du brief : c'est un candidat plausible pour expliquer pourquoi
le pic de `REEL` sous `use10` n'a pas bougé malgré les étapes 1-3.

Écrit : `bornesJ` + `phaseAJour` dans `src/generator/weekBuilder.ts`, `phaseJours()` importé
depuis `src/engine/types.ts` — **aucun champ parallèle**, source unique respectée.

## 2. La mesure : la cible diagnostique est atteinte, la cible produit est manquée

Sur `REEL/tri/70.3/nage-limitante`, avant → après :

| grandeur | avant | après | |
|---|---|---|---|
| cycles à cheval sur une frontière de phase | **4 / 30** | **0 / 30** | ✓ |
| **pic livré** | **11,52 h** | **10,53 h** | ✖ **−0,99 h** |
| cible DÉCLARÉE max | 12,70 h | 10,60 h | ✖ −2,10 h |
| valeurs distinctes de la courbe déclarée | 29 | 16 | |

Et la courbe déclarée **cesse de monter**, par phase :

```
base   3,70–10,60 h      spec   5,30–10,60 h
dev    4,50–10,60 h      peak   3,90–10,60 h
```

Les quatre phases plafonnent sur la MÊME valeur. Ce n'est pas une périodisation.

## 3. Sur les 31 profils `use10` — c'est la mesure qui tranche

Le brief demandait l'effet sur le pic livré, pas seulement sur les grandeurs diagnostiques.

```
15 profils bougent sur 31 · 4 montent · 11 BAISSENT
somme des pics 224,95 → 221,47 h  (−3,47 h)
```

Les baisses, en clair : `REEL` −0,99 · `duathlon/L/debutant` −0,75 · `trail/debutant` −0,62 ·
`tri/S/debutant` −0,83 · `trail/inter` −0,22 · `trail/avance` −0,21 · `tri/S/avance` −0,20 ·
`trail/datee` −0,08 · les trois `bike/gravel` −0,03. Les hausses : `swimrun/debutant` +0,33 ·
`swim/fond/debutant` +0,15 · deux `tri/Full` +0,02.

**La pièce est strictement défavorable au critère pour lequel le chantier existe.** Elle est donc
RETIRÉE — `src/generator/weekBuilder.ts` restauré, `npm run build:app` relancé, `git status`
propre hors le fichier de patch conservé.

## 4. La cause, et c'est elle le ticket (O-106)

`r.phases[i].start` / `.end` **restent des index de SEMAINE**, et c'est ce couple que lit la
courbe de volume — `vol_declared` est une valeur **par semaine calendaire**. Caler les bornes de
phase sur des frontières de CYCLE les désynchronise de la courbe : la phase change au jour 10, la
courbe change au jour 7, et le volume promis suit la seconde.

Une frontière de cycle à J10 vaut la semaine **1,43** — **non représentable** dans un index de
semaine entier. `phaseJours()` ne suffit pas : elle DÉRIVE des jours depuis des semaines, elle ne
convertit pas ce qui les consomme.

## 5. Réponse franche à la tâche 5 du brief

**Non, le pic de `REEL` sous `use10` n'atteint pas 12,32 h. Il reste à 11,52 h — l'écart de
0,80 h du critère de clôture (fiche 19, étape 7) n'est pas comblé, et le chantier n'est pas
terminé.**

Décomposition mesurée de cet écart, pour dire où il vit :

```
cible DÉCLARÉE max     use10 12,70 h   ·   7 jours 13,00 h    →  ≈ 0,30 h
ratio livré / cible    use10 0,907     ·   7 jours 0,947      →  ≈ 0,50 h
pic livré              use10 11,52 h   ·   7 jours 12,32 h
créneaux au pic        use10 9         ·   7 jours 8
min/séance au pic      use10 76,8      ·   7 jours 92,4
```

**Ce qui reste à traiter** : la BOUCLE DE VOLUME elle-même doit itérer sur des cycles —
`vol_declared` par cycle et non par semaine calendaire —, c'est-à-dire `const w = Math.floor(i /
7)` (`weekBuilder.ts:173`) **et tous ses lecteurs**. Tant que l'unité de la courbe est la
semaine, aligner les phases sur le cycle ne peut que faire diverger les deux. Ce n'est pas de la
granularité d'une étape du plan 19 : c'est la fusion de ce qui reste du chantier, et il vaut
mieux le dire que de livrer une pièce qui fait baisser 11 profils sur 15.

## 6. Gates

`npm run batterie` **12/12 vert** sur le moteur restauré (rouges attendus : O-105 seul).
`golden:verify` 1016 · 0 écart — l'étape retirée ne photographie rien de nouveau.
