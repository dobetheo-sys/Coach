# 19 — Plan de chantier : l'unité de volume devient le CYCLE

**Date** : 24/08/2026 · **Aucune ligne écrite** — feuille de route seule, `src/` byte-identique.

---

## 0. Le fait qui commande tout le chantier

**L'index de semaine n'est pas seulement une position : c'est l'unité dans laquelle TOUTES les
grandeurs déclarées et sourcées du moteur sont calibrées.**

```
vol_max, vol_recent            l'ATHLÈTE déclare des h / SEMAINE
HISTORY_CAPS, UTIL             tables en h / SEMAINE (tri/confirme/70.3 = 13 ; util = 14)
AVG_SESSION_H                  h / séance, sert à dériver un budget de séances / SEMAINE
BANDS, RECUP_WEEK_FACTOR       une cible par SEMAINE
C22_MAX_WEEKLY_GROWTH          +10 % d'une SEMAINE de charge à la suivante (manifeste)
RECUP_EVERY                    3 ou 4 SEMAINES
R13.6                          affûtage ≤ 3 SEMAINES, peak ≤ 5 (Bosquet 2007)
```

Renuméroter « en cycles » sans y toucher **change silencieusement la valeur de chacune** : une
récup toutes les 4 semaines deviendrait toutes les 4 × 10 = **40 jours au lieu de 28** (+43 % de
charge entre deux décharges — priorité n°2 du manifeste), et un affûtage de 3 « unités »
passerait de 21 à 30 jours.

**D'où le principe directeur du chantier, qui est la règle 14 du dépôt appliquée au temps :**

> **Ce qui est PHYSIOLOGIQUE se compte en JOURS. Ce qui est STRUCTUREL se compte en CYCLES.
> L'athlète déclare et lit des SEMAINES.**

---

## 1. Cartographie des consommateurs de `w = Math.floor(i / 7)`

Le producteur est unique — `weekBuilder.ts:173`, puis `days.push({ week: w + 1, … })` ligne 265.
Surface mesurée : **48 lectures de `.week` · 105 lectures de `.num` · 38 mentions de `phases`
dans `src/` · 14 fichiers de la PWA · 11 bancs.**

### a) Ce qui raisonne en POSITION (semaine N) — renumérotable

| consommateur | site | note |
|---|---|---|
| phases `p.start` / `p.end` / `p.weeks` | `reasoningEngine.ts:405-455` | bornes en numéros de semaine |
| `phaseOfWeek(wk)` | `weekBuilder.ts:170` | résolution phase ← semaine |
| cadence de décharge (`sinceR`, `recupEvery`) | `weekBuilder.ts:143-215` | **compte déjà en CYCLES** (`isR` posé à l'ouverture d'un cycle) |
| C27a/b/c (placement des récups) | `weekBuilder.ts:175-215` | raisonne en cycles, lit les phases en semaines — **le point de friction** |
| `weekNum` passé aux modules de sport | `sessionLibrary.ts` → `sports/*/index.ts` | parité (B1/B2), `dernierDuSlot`, B-17 |
| numérotation affichée `w.num` | tout `endurabuild/js/ui/` | l'athlète lit « Semaine 12 » |

### b) Ce qui raisonne en DURÉE / VOLUME — à convertir

| consommateur | site | unité actuelle |
|---|---|---|
| courbe de charge (BANDS × `peakH`) | `planGenerator.ts:2828+` | h / semaine |
| **C22** (+10 % entre semaines de charge) | `planGenerator.ts` (point fixe) + `coherenceScorer.ts:337` | par semaine |
| `peakH`, `volPeak`, `volBase` | `reasoningEngine.ts:505` | h / semaine |
| chaîne R20.2 (`caps` · `util` · `structurel` · facteurs) | `planGenerator.ts:4500-4660` | h / semaine |
| **`structurel`** (clone saturé) | `planGenerator.ts:4583-4634` | clone de `wPic.days` = 7 jours |
| `nSem` (nombre de semaines) | `planGenerator.ts:2373` | **déjà conscient** : `days.length / (use10 ? 10 : 7)` |
| budget de séances | `reasoningEngine.ts:381` | séances / semaine |
| D4 « récup ≤ charge », I14b, dominance dev ≤ pic | `planGenerator.ts` | comparaisons entre semaines |
| auditeur : bande [0,5 ; 1,4], sauts C22, I13/I14 | `coherenceScorer.ts`, `banc_invariants.cjs` | par semaine |

### c) Ce qui doit rester en JOURS — ne jamais convertir

`RECUP_EVERY` (3-4 semaines = 21-28 j) · `R13.6` (affûtage ≤ 3 sem = 21 j, peak ≤ 5 sem = 35 j,
Bosquet 2007) · `MAX_RUN_DAYS` · la récup excentrique 48 h du trail (T3) · les plafonds
d'approche J-1/J-2/J-3 · N2 (le plan s'arrête au soir du jour J).

---

## 2. Le modèle proposé

**Une conversion, en un point, et trois repères qui ne se mélangent plus.**

```
ATHLÈTE  déclare  h / 7 j          (inchangé — c'est ce qu'il sait dire)
TABLES   calibrées h / 7 j         (inchangées — c'est ainsi qu'elles sont sourcées)
MOTEUR   construit par CYCLE :     cibleCycle = cibleHebdo × cycleLen / 7
ÉCRAN    affiche des semaines de 7 j (inchangé)
```

### 2a. Phases — en JOURS, pas en cycles ni en semaines

`p.start`/`p.end` deviennent des **bornes en jours** (`startJ`, `endJ`), dérivées comme
aujourd'hui de `PHASE_PCTS × totalJours`, puis **alignées sur une frontière de cycle**
(arrondi au cycle le plus proche — une phase ne s'ouvre pas au milieu d'un microcycle, c'est
déjà l'intention de C27a). Les plafonds R13.6 restent en jours (21 / 35).
`phaseOfWeek(w)` devient `phaseOfDay(i)` ; les modules de sport continuent de recevoir un
`weekNum` — **dérivé**, pour ne pas casser la parité B1/B2 et `dernierDuSlot`.

### 2b. C22 — **la décision la plus lourde du chantier, et elle a un chiffre**

C22 est « +10 % d'une semaine de charge à la suivante ». Trois lectures possibles, et elles ne
donnent pas le même plan :

| lecture | pente par 10 j | pente par 7 j | effet |
|---|---|---|---|
| **(i)** garder la pente QUOTIDIENNE : `1,1^(cycleLen/7)` | **+14,6 %** | +10 % | rampe identique dans le temps ✔ |
| (ii) appliquer 1,1 par CYCLE | +10 % | **+6,9 %** | rampe **ralentie** de 30 % |
| (iii) laisser 1,1 par semaine calendaire | — | +10 % | l'état actuel, incohérent |

Sur 300 jours : `(i)` autorise `1,1^43 ≈ ×60` de marge de rampe, `(ii)` `1,1^30 ≈ ×17`.
**(ii) irait contre l'objectif du chantier** — elle réduirait encore le volume sous `use10`.
**Recommandation : (i)**, avec la constante inchangée et l'exposant dérivé de `cycleLen`. Le
manifeste dit « +10 % par semaine » : le formuler « +10 % par 7 jours » ne change ni sa valeur
ni sa source, il en fixe l'unité. **À valider explicitement par le fondateur** — c'est une règle
du manifeste.

### 2c. `structurel` — cloner un CYCLE

Aujourd'hui : clone de `wPic.days` (7 jours). Demain : clone du **cycle de charge le plus
fourni** (`cyc` est déjà posé sur chaque jour — aucune structure nouvelle), saturé de la même
façon, puis **ramené à l'unité d'affichage** : `structurelHebdo = structurelCycle × 7 / cycleLen`.
Ça supprime mécaniquement l'artefact mesuré au 18 (créneaux 7 · 8 · 10 selon la découpe) :
un cycle contient toujours le même nombre de positions.

### 2d. Écran — découplé, et il n'y a rien à faire

Le rendu lit `plan.weeks[].days[]`. Le **regroupement en semaines de 7 jours pour l'affichage
reste**, comme aujourd'hui ; seule la construction change d'unité. La seule conséquence visible
est que la ligne « volume de la semaine » d'un athlète en cycle de 10 variera d'une semaine à
l'autre — **ce qui est déjà le cas** (mesuré : 7 à 10 créneaux). À traiter comme un choix
d'affichage séparé (« ce cycle » plutôt que « cette semaine »), **pas comme une contrainte sur
le calcul**.

---

## 3. Portée : uniforme, et c'est ce qui rend le chantier testable

**Recommandation : un seul chemin, `cycleLen` partout, y compris en mode 7 jours.**

La raison n'est pas l'élégance, c'est la **preuve** : en mode 7 jours, `cycleLen / 7 = 1`, donc
toutes les conversions sont l'identité. **Le golden doit rendre 0 écart sur 985 des 990
profils** — mesuré ce jour, **seuls 5 profils du corpus activent `use10`**
(`O-21b/run/10k` ×4, `REEL/tri/70.3`). Un chantier dont le rayon est **5 profils** et dont
985 doivent rester au bit près est un chantier qu'on peut valider à chaque étape.

Un chemin conditionnel (`if (use10)`) offrirait la même sécurité et coûterait deux chemins à
maintenir — la forme que `_IFZ`, `CAP_BRICK_BIKE` et les tables parallèles ont fait payer
quatre fois dans ce dépôt.

---

## 4. Risque et surface de régression

| surface | ampleur | risque |
|---|---|---|
| `weekBuilder.ts` (producteur + schéma + C27a/b/c) | ~200 lignes | **élevé** — C27a/b/c sont trois règles de placement qui se dominent |
| `reasoningEngine.ts` (phases, R13.6, budget, `peakH`) | ~80 lignes | **élevé** — R13.6 est sourcé (Bosquet) |
| `planGenerator.ts` (courbe, C22, R20.2, `structurel`, D4, I14b) | ~150 lignes | **élevé** — c'est le point fixe |
| `coherenceScorer.ts` (bande, sauts, I13/I14) | ~30 lignes | moyen — l'auditeur doit changer d'unité EN MÊME TEMPS (leçon O-36 : générateur et auditeur en unités différentes = 6 violations dures) |
| PWA (14 fichiers) | affichage seul | **faible** si le regroupement 7 j est conservé |
| bancs (11 fichiers) | fixtures + critères | moyen |

**Gates concernés** : `golden:verify` / `golden:bundle` (**recapture attendue sur 5 profils, 0
écart sur 985 — c'est le critère d'acceptation de chaque étape**) · `audit:v1` (459 combinaisons,
0 violation dure) · `audit:invariants` (I13/I14/I18 lisent la semaine) · `audit:v6` (**D3 = C22,
violation DURE du manifeste**) · `audit:v7` · `audit:r13` (R13.6-P1 : plafonds de phase) ·
`audit:r14`/`r14.1` (adhérence en fenêtre de 6 semaines écoulées — **P1 compte des semaines**) ·
`audit:r18` (R18.5, cadence de récup) · `lotPhysio` (T-25/T-56/T-57/T-58/T-60/T-62 + les
cliquets `SCEAU_ATTENDU` / `PIC_ATTENDU`) · `demo:troncature` (R22 raisonne en semaines) ·
`demo:proactif` (fenêtre de 14 jours — déjà en jours ✔).

**Le piège le plus probable, nommé d'avance** : douze fois ce dépôt a payé « une garantie
vérifiée au milieu du pipeline ne vérifie que l'avant-dernier état ». Ici la forme sera
« une garantie exprimée dans l'ANCIENNE unité, vérifiée après une passe qui a changé d'unité ».
**Parade : aucune étape ne livre sans que l'auditeur ait changé d'unité dans le même commit.**

---

## 5. Est-ce que ça couvre O-103 et O-104 ?

| | couvert ? | résidu |
|---|---|---|
| **O-104** (le volume d'une semaine dépend du jour de course) | **oui, par construction** | la dernière unité reste tronquée par N2 (le plan s'arrête au jour J) — c'est voulu, et le volume y sera proportionnel à sa longueur, comme aujourd'hui |
| **O-103** (77-82 % des positions clés portent leur créneau) | **partiellement** | ⚠ **la dérive est produite par le chevauchement cycle ↔ semaine, mais aussi par les passes qui RÉORDONNENT les jours** (échanges ⇄, `runImpactCap`, repli « dev ≤ pic », variété hebdomadaire). Ces passes travaillent sur `wd` — les jours d'une semaine — et devront travailler sur le cycle, sinon elles continueront de déplacer un créneau clé hors de sa position |
| **plafond 11,5 h** (diagnostic 17) | **oui pour la part cycle** | le reste est le nombre de branches additives du module de sport (`j5`, fiche 13) — un lot distinct |

**À mesurer AVANT l'étape 4** : la part de la dérive imputable au chevauchement contre celle
imputable aux passes de réordonnancement. Sans ce partage, l'étape sera créditée d'un gain qui
appartient à l'autre moitié — la faute que le §4 du diagnostic 18 a précisément évitée.

---

## 6. Plan de chantier séquencé

Chaque étape est **livrable seule**, avec son critère d'acceptation. `cycleLen = 7` doit rendre
le golden **inchangé au bit près** à toutes les étapes sauf la dernière.

| # | étape | ce qui change | critère d'acceptation |
|---|---|---|---|
| **0** | **Mesure du partage O-103** | rien | on sait quelle fraction de la dérive vient du chevauchement et quelle fraction des passes de réordonnancement |
| **1** | **Rendre l'unité EXPLICITE, sans la changer** — chaque grandeur de volume porte son unité dans son nom ou son type (`hParSemaine`, `minParCycle`) ; les phases exposent `startJ`/`endJ` **dérivés**, les anciens champs restent | aucune valeur | **golden 990/990, 0 écart** · batterie 12/12. Étape de pure lisibilité : elle rend les trois suivantes relisibles |
| **2** | **`structurel` cloné sur le CYCLE**, ramené en h/7 j | `structurel` et la carte R20.2 | golden : **0 écart sur 985**, 5 profils recapturés avec leur diff publié · T-25 (identité min(plafonds) = volPeak) vert |
| **3** | **La courbe et C22 passent par cycle**, exposant dérivé de `cycleLen` (choix (i) du §2b) | la construction du volume | **`audit:v6` D3 vert** (C22 = violation dure) · `audit:v1` 459 à 0 · golden 0 écart sur 985 · **auditeur converti DANS LE MÊME COMMIT** |
| **4** | **Les phases en jours, alignées sur les frontières de cycle** ; C27a/b/c raisonnent en cycles de bout en bout | placement des récups, R13.6 | `audit:r13` R13.6-P1 vert · `audit:r18` (cadence) vert · **la cadence de récup reste en JOURS** (contre-preuve : la porter en cycles doit faire rougir un test dédié) |
| **5** | **Les passes de réordonnancement travaillent sur le cycle** (échanges, `runImpactCap`, repli dev ≤ pic, variété) | O-103 | `mesure:cycle10` §4 : positions clés à **100 %**, comme le schéma de 7 |
| **6** | **Affichage** : la carte de volume dit « ce cycle » quand `cycleLen ≠ 7` | écran seul | E2E · aucune ligne de moteur |
| **7** | **Re-mesure et clôture** | rien | `mesure:cycle10` · `mesure:doublage` · le pic de `REEL` sous `use10` doit être **≥ celui du mode 7 jours** (aujourd'hui 11,52 contre 12,32) — c'est le critère de sortie du chantier |

### Ce que je recommande sur l'exécution

**Par étapes livrables séparément, pas en une fois.** Trois raisons mesurées : l'étape 3 touche
une règle DURE du manifeste (C22/D3) et doit pouvoir être révoquée seule ; l'étape 4 touche une
règle sourcée (Bosquet) ; et le rayon est si petit (5 profils) qu'un diff par étape reste
lisible — alors qu'un diff unique sur 5 profils × 7 passes serait indéboguable.

**Étape 0 d'abord, toujours** : sans le partage de la dérive, l'étape 5 sera jugée sur un gain
qui ne lui appartient pas.

---

## Reproduire les chiffres de ce plan

```bash
npm run mesure:cycle10    # la séquence, la dérive (O-103), où tombe l'écart
npm run mesure:doublage   # l'effet de dispo/doubles, la fenêtre de 10 jours
grep -rn "Math.floor(i / 7)" src/generator/weekBuilder.ts   # le producteur unique
```
