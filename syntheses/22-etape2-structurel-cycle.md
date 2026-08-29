# 22 — Étape 2 : `structurel` cloné sur le CYCLE

**Date** : 24/08/2026 · **Gates** : `npm run batterie` **12/12** · golden recapturé, **rayon 5 profils**

---

## Ce qui change

`planGenerator.ts` — la sonde structurelle clonait `wPic.days`, une **semaine calendaire de
7 jours**. Elle clone désormais le **cycle de charge le plus fourni** (`cyc`, déjà posé sur
chaque jour par `weekBuilder` — aucune structure nouvelle), sature de la même façon, et **ramène
le résultat à l'unité d'affichage** en un seul point : `structurelHebdo = structurelCycle × 7 /
cycleLen`.

Deux conversions de plus, imposées par la règle 14 et sans lesquelles la mesure serait fausse :

- la **cible de saturation** passe en heures par cycle (`peakH × cycleLen / 7`) ;
- la **borne d'épaule** (O-94) est HEBDOMADAIRE : la comparer aux mètres d'un clone de 10 jours
  demande `cap × cycleLen / 7`, sans quoi elle mordrait **10/7 fois trop fort**. Le plancher
  « une capacité ne descend jamais sous ce qui a été fait » suit la même échelle.

**En mode 7 jours, `cycleLen / 7 = 1` et le cycle EST la semaine** : toutes les conversions
valent l'identité.

---

## Critère d'acceptation

### `golden:verify` → **5 écarts sur 990, et ce sont EXACTEMENT les 5 profils `use10`**

```
O-21b/run/10k/4:30 · 5:45 · 7:00 · 8:30
REEL/tri/70.3/nage-limitante
```

**985 profils au bit près.** C'est la propriété que l'étape 3 du plan pourra réutiliser telle
quelle. Golden recapturé : `golden/hashes.json`, 5 lignes changées.

### Le diff des 5 profils, avant → après

| profil | `structurel` | pic livré | argmin |
|---|---|---|---|
| `REEL/tri/70.3` | **11,81 → 11,50 h** | 11,52 h → **11,52 h** | `structurel` (inchangé) |
| `O-21b/run/10k` ×4 | **75,72 → 60,81 h** | 3,68 h → **3,68 h** | `boucle-growth` (inchangé) |

**Aucune séance ne bouge** : l'empreinte du plan livré de `REEL` reste `423cccffcebb8c62`, pic
11,517 h, total 363 h. L'étape 2 ne touche que le DIAGNOSTIC — ce qui était son objet.

### T-25 / le sceau : **un profil de MOINS en violation, et c'est `REEL`**

`S5` compte les plans où `min(plafonds)` ne vaut pas le pic livré (tolérance 0,1 h) :

```
avant   structurel 11,81  ·  pic livré 11,52  →  écart 0,29 h  →  VIOLATION
après   structurel 11,50  ·  pic livré 11,52  →  écart 0,02 h  →  conforme
```

**Cliquet `S5` ré-épinglé 505 → 504, avec sa cause écrite dans le banc.** C'est la direction
voulue : le plafond annoncé cesse de décrire une unité que le plan ne livre pas.

---

## ⚠ Deux observations qui corrigent le brief

### 1. « Un cycle contient toujours le même nombre de positions » — pas dans le LIVRÉ

Mesuré, créneaux par unité sur les 5 profils :

| profil | par SEMAINE | par CYCLE |
|---|---|---|
| `REEL/tri/70.3` | **7 / 8 / 10** (min/méd/max) | **11 / 12 / 12** |
| `O-21b/run/10k` ×4 | **3 / 3 / 3** | **4 / 5 / 5** |

Sur `REEL`, l'amplitude tombe de **×1,43 à ×1,09** — l'artefact est très largement réduit, **pas
supprimé** : les passes retirent et ajoutent des séances, donc deux cycles n'en portent pas
exactement autant. Sur les profils `run`, c'est l'inverse : la SEMAINE était déjà constante
(3/3/3) et le CYCLE varie (4/5/5). **Le cycle est une unité plus stable en moyenne, pas une
unité invariante** — et le dire compte pour juger les étapes suivantes.

### 2. Les `structurel` à 60-75 h des profils `run` sont PRÉEXISTANTS

75,72 h annoncées pour un pic livré de 3,68 h : mesuré **avant** le changement, sur `main`.
Ce n'est pas une régression de l'étape 2 (qui les fait d'ailleurs descendre à 60,81). La cause
est **O-78** — `blockBounds` rend `cap: 9999` pour les blocs de corps sans borne, donc la
saturation du clone n'a pas de plafond à rencontrer. Invisible à l'athlète sur ces profils
(`argmin = boucle-growth`), mais c'est une valeur fausse dans un record que T-25 lit.
**Enregistré, non corrigé ici** : le corriger, c'est borner le puits, et c'est un autre lot.

---

## Ce qui n'a PAS été fait, délibérément

L'étape 3 (courbe et C22 par cycle, avec la lecture (i) actée : `1,1^(cycleLen/7)` ≈ +14,6 %
par cycle de 10 jours) **n'est pas anticipée dans ce commit** — le plan 19 demande des étapes
livrables séparément, et l'étape 3 touche une règle DURE du manifeste qui doit pouvoir être
révoquée seule.

---

## Vérifications

```
golden:verify      5 écarts / 990 = les 5 profils use10 · 985 au bit près · recapturé
npm run batterie   12/12 verts
lotPhysio          32 verts · 25 rouges attendus · 0 régression · S5 ré-épinglé 505 → 504
empreinte du plan livré de REEL   423cccffcebb8c62, inchangée
build:app + build:sw refaits — sw.js eb-pwa-94183811dae0
```
