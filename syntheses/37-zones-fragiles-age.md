# 37 — Fiche 39 : la contre-indication AGIT, quatre zones câblées, l'âge gradué

*Livré le 01/09/2026 · commit `bc450b9` (+ ré-épinglage des cliquets) · batterie **12/12** ·
`audit:v1` 459 à 0 · golden 1069, **25 profils changent** · `audit:sensibilite`, `check:app`,
`check:sw` verts.*

---

## Ce que la fiche demandait, et ce qui a été trouvé en le faisant

Trois défauts de sécurité repérés en Phase 1. Les trois sont corrigés. **Deux d'entre eux ont
révélé un défaut dans MA propre correction avant d'être livrés** — les deux ont été trouvés par
des gardes à budget ZÉRO du banc v7, et les deux sont publiés ici avec leur mesure.

---

## Tâche 1 — la contre-indication de discipline était inerte en multisport

### Le constat, reproduit

Mesuré sur `tri/70.3` (35 ans, inter, 12 h/sem, 8 séances), **avant le lot** :

| zone déclarée | nage % | vélo % | course % | heures |
|---|---|---|---|---|
| aucune | 21,40 | 42,38 | **36,22** | 249,2 |
| course *(interdit `rn`)* | 15,35 | 40,51 | **44,14** | 212,3 |
| tibia · pied · hanche · genou · dos · cou · velo · cheville · fascia · quadriceps | 15,62 | 40,48 | **43,90** | 207,3 |
| epaule *(interdit `sw`)* | 9,09 | 41,74 | 49,17 | 173,2 |

**Onze zones sur treize rendaient le MÊME plan au centième près**, et la part de course
**montait** de 36,22 à 43,90 % chez quelqu'un qui vient de déclarer une douleur qui l'interdit.
Seule `epaule` bougeait — par O-85, qui n'est pas cette table.

### Le correctif : `R6.1b`, une passe qui SUBSTITUE

`applyContraindicationCap`, dans `src/generator/weekBuilder.ts`. Un jour par semaine au plus,
toutes zones confondues. Jamais le dernier jour d'une discipline que l'épreuve demande, jamais
un brick (il porte deux disciplines), jamais une course.

**Sa position dans le pipeline est la moitié du travail** : elle tourne APRÈS
`applyDisciplineCoverage` et `applySwimFrequency`, qui remettent précisément la discipline qu'on
vient de retirer. Onzième fois que l'ordre décide dans ce dépôt.

### Après

| zone | nage % | vélo % | course % | décision `R6.1b` |
|---|---|---|---|---|
| aucune | 21,40 | 42,38 | 36,22 | — |
| course | 18,22 | 54,67 | **27,10** | 40 j de `rn` → `sw`/`bk` |
| tibia · pied · hanche · cheville · fascia · quadriceps | 19,27 | 55,31 | **25,42** | 40 j de `rn` → `sw`/`bk` |
| genou *(`rn`+`bk`)* | 18,73 | 40,76 | 40,51 | 14 j → `sw` |
| dos *(`bk`)* | 21,78 | **34,62** | 43,59 | 11 j → `sw` |
| velo *(`bk`)* | 23,02 | **27,87** | 49,11 | 26 j → `sw`/`rn` |
| cou *(`sw`+`bk`)* | **12,95** | **34,20** | 52,85 | 35 j → `rn` |
| epaule | 9,09 | 41,74 | 49,17 | — *(hors passe, voir plus bas)* |

Duathlon `M` : `course` et les six zones d'appui font passer la course de **45,02 à 29,83 %** ;
`velo` fait passer le vélo de 54,98 à **42,13 %**. Swimrun `sprint` : les zones d'appui font
passer la course de 55,23 à **25,33 %**, `cou`/`epaule` font passer la nage de 44,68 à 23,66 /
21,54 %.

**Chaque zone déplace maintenant le mix dans le sens qu'elle déclare.** C'est le critère
d'acceptation de la fiche.

### Ce qui ne bouge pas, et c'est dit

`duathlon` × `genou` / `dos` / `epaule` : **aucune conversion, délibérément**. `genou` interdit
les DEUX disciplines du duathlon, `dos` et `epaule` préfèrent la nage, qui n'y existe pas. Il
n'y a rien vers quoi basculer : la passe se tait plutôt que d'inventer une discipline. Idem
`swimrun` × `velo`/`dos`.

### §1.4 — `epaule` vérifiée non affectée

La fiche demandait de vérifier qu'`epaule` n'est pas touchée. Ma première écriture la touchait,
et **fort** : nage d'un 70.3 de 21,4 % à **5,61 %** pour quelqu'un qui doit nager 1,9 km le
jour J. La cause est nommable — la charge d'épaule a DÉJÀ son mécanisme, **O-85**, un plafond
hebdomadaire de mètres qui cliquette sur le livré ; empiler un retrait de JOURS sur un plafond
de VOLUME, ce sont deux règles qui paient la même zone sans se voir (R11.1, deuxième chemin
interdit). `epaule` est donc exclue de `R6.1b`, avec sa raison écrite dans le code.
**Vérifié : 9,09 % avant, 9,09 % après.**

### Deux défauts de MA correction, trouvés par des gardes à budget ZÉRO

**(a) La suppression déplaçait le puits — `S-NOVO2` et `S-LONGSWIM` (banc v7, swimrun).**
Ma première écriture posait un `OFF (zone fragile)` quand le créneau ne produisait pas la
discipline visée. Mesuré sur un swimrun sprint à `pied` :

| | plus longue nage continue | blocs VO2 du plan | semaine 1 |
|---|---|---|---|
| avant le lot | 750 m | 0 | `sw:Seuil CSS` · `rn:Footing` · `br:Swimrun` |
| ma 1re écriture | **0 m** | 0 | `rn:Footing` · **`OFF (zone fragile)`** · `br:Swimrun` |
| livré | **3 100 m** | 0 | `sw:Seuil CSS` · `rn:Footing` · `br:Swimrun` |

La chaîne : la semaine perd du volume → le garde de polarisation reconvertit la séance de NAGE
de qualité en footing facile → le plan finit avec **plus de course et zéro nage continue**,
l'inverse exact de l'intention. `S-NOVO2` passait à **11 pour un budget de ZÉRO**, `S-LONGSWIM`
à 10 pour 5. *Une passe qui retire de la charge laisse les passes d'aval en arbitrer les
conséquences.* Elle rend donc un jour ÉQUIVALENT, jamais un trou — et si aucune substitution
n'est constructible, elle ne touche pas le jour.

Deux corollaires mesurés en l'écrivant : le vélo passe par `crossTrainingSession` (le créneau
facile de course ne produit JAMAIS de séance vélo — sans ça la passe restait **muette sur les
huit zones qui interdisent la course**), et la règle anti-doublon R5.5 ne vise que la QUALITÉ
(l'appliquer à tout rendait la passe muette en swimrun, où le créneau facile ne produit qu'un
nom : zéro conversion sur les treize zones).

**(b) La passe ne doit pas tourner dans l'affûtage — `U-DOSE` (budget ZÉRO, duathlon).**
Mesuré sur un duathlon PM à 3 séances/semaine, semaine 38 :

| | jour 2 | jour 3 | jour 4 |
|---|---|---|---|
| avant | `rn:Seuil course` 23′ | `rn:Footing facile` **217′** | `bk:Rappel race-pace` **39′** |
| avec R6.1b en affûtage | `rn:Entretien` 23′ | `rn:Entretien` 21′ | `bk:Rappel race-pace` **225′** |
| livré | *(identique à « avant »)* | | |

La décroissance d'affûtage (R3.13) **reconstruit** le jour converti en course — la protection a
disparu — mais la semaine garde la nouvelle répartition, et un rappel à allure course passe de
26 à **212 min en `bk.rp`**. *Une passe dont l'effet est annulé et dont l'effet de bord persiste
ne doit pas tourner là.* La contre-indication tient sur toute la construction ; les une à trois
dernières semaines gardent la forme que l'affûtage leur donne.

**Une piste écrite, mesurée INERTE et retirée** : « ne jamais convertir le réceptacle de la
semaine » (la séance facile la plus longue, celle où le point fixe déverse). Elle ne changeait
rien sur le cas mesuré — un critère qui ne bouge pas n'est pas une règle, il est retiré.

---

## Tâche 2 — quatre zones proposées sans entrée dans la table

`velo`, `quadriceps`, `cheville`, `fascia` étaient offertes à l'athlète et ne retiraient
**aucune** discipline. Une aponévrosite plantaire laissait 100 % de course à pied.

| zone ajoutée | interdit | préfère | motivée par |
|---|---|---|---|
| `cheville` | `rn` | `sw`, `bk` | calquée sur `pied` — les deux structures qui encaissent la réception |
| `fascia` | `rn` | `sw`, `bk` | idem : l'aponévrose plantaire est chargée à chaque appui |
| `quadriceps` | `rn` | `sw`, `bk` | frein EXCENTRIQUE de la course et de la descente (le module trail le dit déjà) ; le vélo le sollicite en concentrique |
| `velo` | `bk` | `sw`, `rn` | la SYMÉTRIQUE de `course`, qui existait seule |

Aucune inventée : chacune reprend le `forbid`/`prefer` d'une zone déjà arbitrée.

### §2.3 — l'asymétrie signalée, et une seconde trouvée

L'asymétrie `course`/`velo` de la fiche 36 est **fermée** (elles sont désormais construites
pareil). En la fermant, **une seconde a été trouvée dans la même famille** : `readInjuries`
recopiait `["tibia","genou","pied","hanche","course"]` en dur — c'est-à-dire exactement
l'ensemble des zones dont la table interdit `rn`. Deux sources pour le même fait, **et elles
avaient divergé** : toute zone ajoutée au domaine d'`injury` sans être ajoutée ici était
invisible au plafond de jours d'appui. `impact` et `impactAny` se DÉRIVENT désormais de la
table (R11.1). Mesure : `INJ/run/semi/fascia`, `INJ/trail/-/cheville`, `INJ/trail/-/quadriceps`
changent de plan — les trois sont monodiscipline, `R6.1b` n'y tourne pas, c'est bien cette
dérivation seule qui agit.

---

## Tâche 3 — l'âge

### La borne de format : le semi était ouvert à 10 ans

`AGE_MINI_FORMAT` ne fermait que `tri/Full`, `tri/70.3`, `run/marathon`, `duathlon/PM`. Balayé
sur **les 23 formats du moteur**, après extension :

| fermé à 18 ans | ouvert |
|---|---|
| `run/semi` · `run/marathon` · `tri/70.3` · `tri/Full` · `duathlon/PM` · `duathlon/L` · `bike/gravel` · `swimrun/series` · `swimrun/championship` · `trail ≥ 50 km` | `run/5k` `run/10k` · `tri/S` `tri/M` · `duathlon/S` `duathlon/M` · `bike/route` `bike/cyclo` · `swim/sprint` `swim/demifond` `swim/ow` · `swimrun/experience` `swimrun/sprint` · `trail < 50 km` |

Vérifié format par format à 16, 17 et 18 ans : refus typé aux deux premiers, plan aux 18.

**⚠ Un format à risque reste ouvert, et je ne le ferme pas sans arbitrage — ticket O-112** :
`AGE_MINI_TRAIL_KM = 50` laisse un **trail de 42 km générable à 16 ans**, alors que
`run/marathon` — même distance, moins de dénivelé, moins de temps d'effort — est fermé à 18.
Même famille que l'asymétrie `course`/`velo` : deux grandeurs construites sur le même modèle,
une seule bornée. Proposition : aligner le seuil trail sur le marathon (42 km). C'est une
décision de VALEUR (le 50 km a été arbitré une fois), donc elle revient au fondateur.

### Le facteur d'âge : deux marches, plates sur tout leur domaine

**⚠ Aucune référence externe n'existe dans ce dépôt pour l'âge et la charge d'entraînement** —
vérifié : `R6.3` porte sa justification interne et aucune citation, contrairement à Bosquet,
Riegel, Coggan, Martin, Nielsen ou Plews ailleurs dans le même fichier. **On n'invente donc pas
de formule continue.** On répète le pas DÉJÀ arbitré : ×0,85 une seconde fois (0,85² ≈ 0,72),
×0,70 une seconde fois (0,70² ≈ 0,49, arrondi à 0,50). Aucun nombre neuf. Les deux seuils
(13 et 75 ans) sont posés au milieu de l'intervalle laissé plat, et sont **révocables** au même
titre que `O88_NB_ACCELERATIONS`.

Pic hebdomadaire livré, à profil identique (`vol_max` 8 h, inter, 5 séances) :

| âge | `run/10k` | `bike/route` | décision R6.3 |
|---|---|---|---|
| 10 · 12 · 13 | **2,68 h** | **3,60 h** | volume ×0.5, aucune VO2max |
| 14 · 16 · 17 | 3,75 h | 4,95 h | volume ×0.7, aucune VO2max |
| 18 · 35 · 59 | 5,32 h | 7,10 h | — |
| 60 · 62 · 70 · 74 | 4,48 h | 6,00 h | volume ×0.85, récup /3 semaines |
| 75 · 80 · 90 · 100 | **3,85 h** | **5,08 h** | volume ×0.72, récup /3 semaines |

Avant le lot, les lignes 10-13 étaient identiques aux lignes 14-17, et les lignes 75-100
identiques aux lignes 60-74. **Les âges adultes standards du corpus (35, 62) sont inchangés au
centième** — vérifié dans le tableau ci-dessus et par le golden (ni `AGE/*/35` ni `AGE/*/62` ne
bougent).

---

## Le rayon, et pourquoi les cliquets ont bougé

**Golden : 25 profils sur 1069**, tous dans les familles `injury` / `age` / `mineur`. Aucun
profil hors de ces familles ne bouge d'un bit.

```
AGE/bike/route/100 · AGE/bike/route/12 · AGE/run/semi/{100,12,16,17,80}
G/bike/gravel/{mineur,mineur-format-ouvert} · G/swimrun/championship/{mineur,mineur-format-ouvert}
G/duathlon/PM/injury-tibia · G/swimrun/championship/injury-{genou,multi,tibia}
G/tri/Full/injury-{dos,genou,multi,tibia}
INJ/run/semi/fascia · INJ/trail/-/{cheville,quadriceps} · INJ/tri/70.3/{cou,course,velo}
```

**Les deux cliquets de `lotPhysio` ont été ré-épinglés, et leur cause est attribuée à facteur
unique** (`npm run casser`). Contrairement aux fiches 37 et 38, `src/` n'est **pas**
byte-identique dans ce lot : un mouvement de cliquet y est donc a priori le moteur, et il fallait
le prouver.

**T-27 (le sceau) : S4 346 → 345, S5 231 → 225. La cause principale est la POPULATION.**
Le corpus n'a pas bougé (1069), mais `AGE_MINI_FORMAT` ferme sept profils qui passent de « plan
livré » à « refus typé » : **1063 → 1056 plans scellés**. Mesuré à moteur d'AVANT sur la
population d'APRÈS : **S4 346 · S5 224** — les sept mineurs emportaient donc sept violations S5
et aucune S4. Ce qui reste est minuscule et attribué : `S4 −1` vient de la dérivation d'`impact`
(les zones `cheville`/`fascia`/`quadriceps` comptent enfin comme blessure d'appui), `S5 +1`
vient de `R6.1b`.

**T-48 (composition du pic tri) : VO2 8 868 → 8 876 min, nage seuil 444 251 → 444 401 m.**
Cause attribuée à `R6.1b` **et elle seule** : neutraliser l'appel rend exactement les anciennes
valeurs ; retirer les quatre zones ou neutraliser la graduation d'âge ne les déplace ni l'une
ni l'autre. Population inchangée (206 profils tri).

*Trois expériences de neutralisation ont été faites une par une, plus deux croisées — c'est ce
qui a montré que la piste « c'est le moteur » était fausse pour l'essentiel du mouvement.*

---

## Gates

`audit:v1` **459 à 0 violation dure** · `npm run batterie` **12/12** ·
`audit:sensibilite` vert · `check:app` vert · `check:sw` vert (`eb-pwa-06347a20ad86`, 63 assets) ·
`couverture:golden` **3 267/5 750 cellules (57 %)**.

Banc v7 après correctifs : trail 426/552 (77 %) · swimrun 500/569 (88 %) · duathlon 464/525
(88 %) — tous les checks dans leur budget, dont les deux garde-fous à ZÉRO que ma première
écriture franchissait.

---

## Ce qui reste ouvert

- **O-112 (nouveau)** — `AGE_MINI_TRAIL_KM = 50` laisse un trail de 42 km ouvert à 16 ans quand
  le marathon est fermé à 18. Décision de valeur, proposition : 42 km.
- Registre inchangé par ailleurs : O-77, O-97, O-99, O-100a/b, O-101, O-102, O-105, O-111.
