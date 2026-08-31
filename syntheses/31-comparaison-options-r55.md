# 31 — Comparer les deux options pour lever `R5.5` : **l'option 1 n'a pas de contenu, l'option 2 l'a mais paie en variété**

**Brief 32** · 25/08/2026 · **aucune implémentation** — `src/` byte-identique à `d3ffe6c`.
Les deux options sont mesurées par mutation temporaire (`npm run casser`, restauration dans un
`finally`), sur la piste 1 réappliquée depuis `piste1-gabarits-alternes.patch`.

---

## 0. Les deux réponses, en une ligne chacune

- **Option 1** — *donner une variante à `durLong`* : **le module n'en a AUCUNE**, mesuré
  66 semaines sur 66. Et même dans son MEILLEUR CAS simulé, elle rapporte **+0,04 h** sur les
  31 profils et ne répare pas `dur1`. Ce n'est pas un changement de passe, c'est un chantier de
  CONTENU dans 5 modules de sport.
- **Option 2** — *exempter les doublons voulus* : **elle répare la densité** (`dur1` 0,100 →
  **0,116** pour une cible de 0,114) et ramène la perte de pic de **−0,79 à −0,12 h**. Elle
  coûte la VARIÉTÉ : 66 semaines porteraient deux fois la même séance longue.

**Ni l'une ni l'autre ne ramène `REEL` à sa ligne de base (11,52 h), et encore moins aux 12,32 h
du mode 7 jours.**

---

## 1. Une mesure préalable qui décide de l'option 1 (et que le brief demandait)

*« Vérifie si un doublon accidentel de `durLong` existe déjà dans le corpus. »* Mesuré sur les
**1 012 profils**, en amont ET en aval de la passe (`R5.5` neutralisée pour voir ce que le
schéma PRODUIT, sans quoi on mesurerait le rattrapage et non le cas) :

| semaines à 2 exemplaires du même créneau dur | en amont de R5.5 | dans le plan LIVRÉ |
|---|---|---|
| `dur2` | **110** (toutes en `use10`) | 25 |
| `dur1` | **0** | 10 (ce sont des `dur2` RENOMMÉS — O-108) |
| `durLong` | **0** | **0** |

> **Le doublon accidentel de `durLong` n'existe nulle part.** Donner une variante à `durLong` ne
> changerait donc **rien** au corpus actuel : elle ne s'appliquerait qu'aux doublons que la
> piste 1 crée. Le risque de généralisation soulevé par le brief est **nul, et c'est mesuré**.

Au passage, ça chiffre le vrai travail de `R5.5` aujourd'hui : **85 semaines** de double-`dur2`
rattrapées sur 110, dont 10 par renommage en `dur1`.

## 2. Option 1 — la variante n'existe pas

Piste 1 réappliquée, `R5.5` neutralisée, on regarde les deux `durLong` d'une même semaine :

```
66 semaines à 2 durLong · noms IDENTIQUES 66 · noms DIFFÉRENTS 0
  CYCLE10/run/marathon/… S7, S12, S15 : « Sortie longue » deux fois
```

`R5.5` cherche `built.find(x => !seen.has(x.name))` : le module ne lui rend **jamais** un second
nom, donc `pick` est `undefined` et la passe déclasse. **Il n'y a rien à brancher : il faudrait
ÉCRIRE une seconde longue** — brick allégé, longue en côtes, longue à négative split — **dans
`tri`, `run`, `bike`, `swim` et `duathlon`**, avec sa justification physiologique, ses bornes et
sa note. C'est un lot de contenu, pas une ligne de passe.

**Et son meilleur cas ne paie pas.** Simulé (le `durLong` en double n'est jamais déclassé, ce qui
est la borne SUPÉRIEURE de ce qu'une variante peut rapporter en volume) : **Δ +0,04 h** sur les
31 profils par rapport à la piste 1 brute, `REEL` 11,30 → **11,32**. La valeur d'une variante
serait **pédagogique** (ne pas afficher deux fois la même carte), **pas physiologique**.

## 3. Option 2 — mécanisme concret

Le marquage doit venir de celui qui SAIT (le gabarit), jamais d'une devinette de position :

```
1. `DaySlot` gagne `voulu?: boolean`                              (interface, weekBuilder.ts)
2. `schema()` pose `voulu: true` sur la SEULE entrée que le gabarit ajoute       (2 lignes)
3. `buildDays` recopie le drapeau sur le `GenDay`                                (1 ligne)
4. `applyWeeklyVariety` passe son tour sur un jour marqué                        (1 condition)
```

Quatre points de contact, **un seul fichier**, aucun contenu de module.

**Le proxy de mesure est EXACT, et c'est le §1 qui le prouve** : sous `use10`, en l'absence de
piste 1, il y a **0 doublon de `dur1` et 0 de `durLong`**. Donc « exempter tous les doublons de
`dur1`/`durLong` sous `use10` » et « exempter les doublons marqués par le gabarit » désignent
**le même ensemble**, et la mesure ci-dessous vaut pour le mécanisme réel.

**La protection est-elle affaiblie ?** Non pour les cas d'aujourd'hui : les 110 semaines de
double-`dur2` restent intégralement traitées, l'exemption ne portant que sur le jour marqué. Elle
pourrait masquer un doublon accidentel FUTUR de `dur1`/`durLong` ; un garde (le jumeau d'un jour
marqué doit être la position d'origine du gabarit) referme ce trou et coûte une assertion.

## 4. Le tableau — pic livré des 31 profils

Ligne de base = `use10` avant tout ce chantier. **Option 1 = meilleur cas simulé.**

| profil | base | piste 1 | **option 1** | **option 2** |
|---|---|---|---|---|
| `O-21b/run/10k` ×4 | 3,68 | 3,70 | 3,70 | 3,70 |
| `run/marathon` deb · inter · avancé | 8,88 · 9,78 · 8,88 | 8,73 · 9,55 · 8,73 | 8,73 · 9,55 · 8,73 | 8,73 · 9,55 · 8,73 |
| `bike/gravel` ×3 | 9,00 · 10,00 · 9,00 | = | = | = |
| `swim/fond` deb · inter · avancé | 1,62 · 3,32 · 3,37 | 1,48 · 3,32 · 3,37 | 1,48 · 3,32 · 3,37 | **1,75 · 3,40 · 3,42** |
| `tri/S` deb · inter · avancé | 3,30 · 3,82 · 3,48 | 3,20 · 3,95 · 3,48 | 3,20 · 3,95 · 3,48 | **3,42** · 3,95 · 3,48 |
| `tri/Full` ×3 + datée | 9,00 · 10,00 · 9,00 · 9,98 | = | 9,02 (avancé) | 9,03 (avancé) |
| `trail` ×4 · `swimrun` ×3 (régime A) | — | **intacts** | **intacts** | **intacts** |
| `duathlon/L` deb · inter · avancé | 8,75 · 9,45 · 8,75 | 8,73 · 9,48 · 8,73 | = | = |
| **`REEL/tri/70.3`** | **11,52** | 11,30 | 11,32 | **11,32** |

```
                 somme des 31    Δ vs base    régressent   progressent
base                224,94             —           —            —
piste 1             224,15         −0,79 h         8            6
option 1            224,19         −0,75 h         8            7
option 2            224,82         −0,12 h         6           11
```

### Densité obtenue (régime générique, 3 222 jours ; cible = densité MESURÉE en 7 jours)

| | `dur1` | `durLong` | `dur2` | `facile2` |
|---|---|---|---|---|
| base `use10` | 0,101 | 0,083 | 0,118 | 0,178 |
| piste 1 | 0,100 | 0,122 | 0,080 | 0,171 |
| **option 1** | 0,100 | 0,127 | 0,080 | 0,170 |
| **option 2** | **0,116** | **0,128** | **0,067** | 0,170 |
| **cible (7 jours)** | **0,114** | **0,113** | **0,104** | 0,155 |

**Option 2 est la seule qui répare `dur1`** (0,116 pour 0,114). Elle dépasse un peu sur `durLong`
(+13 %) et **écrase `dur2`** (0,067 pour 0,104, −36 %) — c'est la position que le gabarit
convertit, et c'est ce que la **piste 2** (libérer `["dur","facileR"]`, O-102) rendrait.

## 5. Complexité, surface, risque

| | **option 1** | **option 2** |
|---|---|---|
| passe | 1 ligne (`alt`) + 1 appel | 1 condition |
| structure | — | `DaySlot.voulu`, `GenDay`, `schema()`, `buildDays` — 4 points, 1 fichier |
| **contenu** | **une seconde longue à écrire dans 5 modules** (tri, run, bike, swim, duathlon), avec justification, bornes et note — l'auditeur refuse une séance muette | aucun |
| corpus non-`use10` (981 profils) | intact **par construction** (garde `use10`) | intact **par construction** (drapeau posé par le seul gabarit `use10`) |
| risque sur l'existant | **nul, mesuré** : 0 doublon `durLong` sur 1 012 profils | l'exemption pourrait masquer un doublon accidentel FUTUR — refermable par une assertion |
| ce qu'elle coûte | rien de mesurable en volume (+0,04 h) | **la variété : 66 semaines à deux séances longues identiques** |

## 6. Recommandation — motivée, et la décision reste ouverte

**Ce que la mesure dit sans ambiguïté**, et qui vaut quel que soit le choix :

1. **L'option 1 ne peut pas être « levée » : elle doit être ÉCRITE.** Son verrou n'est pas
   `R5.5`, c'est l'absence de seconde longue dans les modules. Et le volume qu'elle rapporterait
   est de l'ordre du bruit.
2. **L'option 2 est la seule qui rende la densité visée**, pour quatre points de contact dans un
   seul fichier — et elle échange une propriété PÉDAGOGIQUE (ne pas répéter une carte) contre une
   propriété PHYSIOLOGIQUE (la densité de la qualité et de la longue). Ce troc-là n'est pas
   technique : `R5.5` dit elle-même que *« répéter une séance n'est pas une faute
   physiologiquement ; pédagogiquement, une carte affichée deux fois dit à l'athlète que le plan
   ne le regarde pas »*. **C'est exactement l'arbitrage à rendre, et il appartient au fondateur.**
3. **Les deux ensemble ont un sens et un ordre** : l'option 2 d'abord (elle rend la densité, tout
   de suite, sans contenu), l'option 1 ensuite comme lot de contenu qui rachète la variété que
   l'option 2 aura cédée. Dans cet ordre, l'option 1 cesse d'être un préalable coûteux pour
   devenir une amélioration facultative.

**Ce qu'aucune des deux ne fait, et qu'il faut dire** : `REEL` reste à **11,32 h**, sous sa ligne
de base de 11,52 et loin des **12,32 h** du mode 7 jours. **Le résidu est le même dans les trois
colonnes — `run/marathon` −0,15 à −0,23 h et `REEL` −0,20 h — et il vient du gabarit `dur1`
lui-même, pas de `R5.5`** : la variante « seul `dur1` alterne » (fiche 30) le montrait déjà.
Lever `R5.5` est nécessaire pour que la piste 1 agisse ; ce n'est pas suffisant pour fermer le
chantier.

---

## Vérifications

```
src/                 0 ligne modifiée · aucune implémentation livrée
mutations            5, toutes par `npm run casser` (dont 2 sur le même fichier — le correctif
                     O-110 de la fiche 30 était nécessaire pour que la ligne de base soit juste)
mesures              1 012 profils pour la question d'existence · 31 profils use10 × 4 états
                     (base · piste 1 · option 1 · option 2) · 66 semaines à 2 durLong inspectées
```
