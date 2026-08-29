# 26 — Étape 3 : mesurée, et elle est SANS OBJET — C22 était déjà dans la bonne unité

**Date** : 24/08/2026 · **Aucune ligne écrite** — `src/` byte-identique, batterie 12/12.
**Ce lot réfute une pièce de mon propre plan** (fiche 19, §2b et §6, étape 3).

---

## 1. C22 est déjà la pente quotidienne — l'exposant n'a rien à convertir

La décision actée est la lecture (i) : *garder la pente QUOTIDIENNE*. Or c'est exactement ce que
le code fait déjà, et l'arithmétique le dit en une ligne :

```
C22 aujourd'hui : ×1,10 entre deux SEMAINES de charge consécutives, soit 1,10^(1/7) par JOUR
sur 10 jours       : 1,10^(10/7) = ×1,146
```

**La constante est déjà « +10 % par 7 jours », et la vérification est déjà appliquée tous les
7 jours.** Le facteur `cycleLen/7` de la fiche 19 devait servir à comparer deux unités **de
10 jours** ; tant que la comparaison porte sur des semaines calendaires — 7 jours d'écart,
quelle que soit la longueur du cycle — **l'appliquer serait une faute d'unité**, et précisément
celle que ce chantier existe pour corriger : autoriser +14,6 % entre deux semaines de 7 jours,
c'est accélérer la pente quotidienne de 46 %.

### Et la conversion, si on la faisait quand même, RESTREINDRAIT

Mesuré sur les **31 profils `use10`** :

| unité de comparaison | paires | collées à la borne | **au-dessus de la borne visée** |
|---|---|---|---|
| **semaines** de charge (aujourd'hui) | 368 | **117 (32 %)** à ×1,10 | **1** au-dessus de ×1,12 |
| **cycles** de charge (l'unité visée) | 325 | 22 | **93 (28,6 %)** au-dessus de ×1,146 |

**C22 mord déjà, fort** : un tiers des transitions hebdomadaires sont épinglées à sa borne.
Et 28,6 % des transitions de CYCLE dépassent ×1,146 — non pas parce que la rampe est plus
rapide, mais parce que **deux cycles consécutifs n'ont pas la même composition** (7 à 10
créneaux, O-103/O-104). Porter la vérification au cycle **clamperait ces 93 transitions** :
moins de volume sous `use10`, l'inverse exact de l'objet du chantier.

---

## 2. L'autre moitié de l'étape 3 n'a pas d'objet non plus

L'étape prévoyait aussi que « la courbe de charge (BANDS × `peakH`) passe par cycle », sur la
crainte qu'une semaine à 7 créneaux ne puisse pas tenir une cible posée pour 10.

**Mesuré — le ratio livré / cible déclarée, par nombre de créneaux de la semaine :**

| créneaux | semaines | ratio moyen |
|---|---|---|
| 3 | 24 | 0,983 |
| 5 | 190 | 0,982 |
| 6 | 234 | 0,985 |
| 8 | 12 | 0,990 |
| 9 | 9 | 0,974 |
| 10 | 3 | 0,947 |

**Le ratio est plat entre 3 et 10 créneaux** (0,947 à 0,990, sans tendance). La courbe est
honorée quelle que soit la composition de la semaine : **il n'y a rien à convertir.**

---

## 3. Ce que ça corrige dans mon plan de chantier

La fiche 19 chiffrait la décision C22 ainsi :

> *« (i) `1,1^(cycleLen/7)` — rampe identique dans le temps · (ii) 1,1 par cycle — rampe
> ralentie de 30 %. Sur 300 jours : (i) autorise `1,1^43 ≈ ×60`, (ii) `1,1^30 ≈ ×17`. »*

**Le tableau était juste et sa conclusion opérationnelle était fausse** : `1,1^43` est ce que le
code fait **déjà**, puisqu'il applique la borne 43 fois — une fois par semaine. La lecture (i)
n'était pas une chose à écrire, c'était le nom de l'existant. Ce que j'ai raté en écrivant le
plan : **j'ai traité l'unité de la CONSTANTE et l'unité de la COMPARAISON comme une seule
question.** Elles sont deux, et seule la seconde change avec `cycleLen`.

---

## 4. Ce qui reste du chantier

| étape | état |
|---|---|
| 0 · partage de la dérive | fait (fiche 20 + 21) |
| 1 · unité explicite | **livré** (fiche 21) |
| 2 · `structurel` sur le cycle | **livré** (fiche 22) |
| — · O-78, la sonde sans borne | **livré** (fiche 25) |
| **3 · courbe et C22 par cycle** | **SANS OBJET — mesuré, rien à écrire** |
| 4 · phases en jours | **la prochaine, et la dernière qui porte du volume** |
| 5 · passes sur le cycle | démontrée inutile en l'état (fiche 21) |
| 6 · affichage | inchangé |
| 7 · clôture | critère : pic de `REEL` sous `use10` ≥ mode 7 jours |

**Le chantier se réduit donc à l'étape 4**, plus la question O-103 dont l'étape 0 a montré
qu'elle est conditionnée par le chevauchement. Et il faut le dire franchement : **après trois
étapes livrées, le pic livré de `REEL` sous `use10` n'a pas bougé** (11,52 h contre 12,32 en
mode 7 jours). Les étapes 1-2 et O-78 ont corrigé ce que le moteur **DIT** ; aucune n'a encore
changé ce qu'il **FAIT**.

C'est cohérent avec leur définition — l'étape 2 est une sonde, O-78 une sonde, l'étape 1 des
noms — mais le critère de sortie du chantier reste entier, et l'étape 4 est désormais la seule
pièce qui puisse l'atteindre.

---

## Vérifications

```
src/                0 ligne modifiée
npm run batterie    12/12 verts
mesures             31 profils use10 · 368 paires de semaines · 325 paires de cycles
                    463 semaines de charge pour le ratio courbe
```
