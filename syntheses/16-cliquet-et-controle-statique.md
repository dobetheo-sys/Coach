# 16 — Un cliquet plutôt qu'une règle · le contrôle statique · et O-104 ne touche PAS la semaine d'avant course

**Date** : 24/08/2026 · **Gates** : `npm run batterie` **12/12 verts** (nouveau : `check:dates`)

---

## 1. §1 — le cliquet est écrit : **T-62**

Ta distinction est retenue telle quelle : *« vrai pour une règle, pas pour un témoin »*.

`T-62` (banc `lotPhysio`) épingle la propriété que tu désignes comme la dernière que ce lot peut
casser sans surveillance :

```
ZÉRO VO2max en base           (strict : une seule semaine suffit à rougir)
part de dur en base ≤ 4,0 %   (mesuré 3,9 % — cliquet au dixième au-dessus)
population ≥ 4 000 semaines   (un zéro a besoin de sa population : la sonde REFUSE un corpus tronqué)
```

Il publie aussi la progression qu'il surveille : `base 3,9 % → dev 6,6 % → spec 7,9 %`. Le
VO2max se lit sur la **zone des steps**, jamais sur le nom (leçon O-79).

**Contre-prouvé** : `npm run casser` remplace `bk.ss` par `bk.vo2` dans la branche `base` du
module tri → **T-62 ROUGE**. Et ta raison est la bonne : `j5 → dur1` ajoutera une position
`dur1` **à toutes les phases, base comprise** — c'est exactement là que le témoin sert.

---

## 2. §2 — la crainte est LEVÉE par la mesure

Tu écrivais : *« si l'écart est du même ordre sur la dernière semaine de charge et l'affûtage,
c'est la pièce la plus urgente des deux »*. Balayage des sept jours de course, **avec le témoin
`use10 = false`** :

| | cycle de 10 | semaine de 7 (témoin) |
|---|---|---|
| pic | **×1,0** | ×1,0 |
| **DERNIÈRE semaine de charge** | **×1,0** | ×1,0 |
| affûtage (moyenne/sem) | ×1,7 à ×2,7 | **×1,8 à ×3,2** |
| dernière semaine | ×7,2 à ×17,7 | ×2,5 à ×3,7 |

**Le pic et la dernière semaine de charge sont identiques sur les sept jours.** L'approche de
l'objectif ne bouge pas d'une minute.

La dispersion de l'affûtage **n'est pas le cycle** — le témoin la présente autant, voire plus :
c'est N2 (le plan s'arrête au soir du jour J). Et la « dernière semaine » varie parce qu'elle
fait **1 à 7 jours** : vérifié, son volume suit sa longueur dans les deux états
(0 · 17 · 55 · 105 · 147 · 196 · 241 min pour 1 à 7 jours). N2 par conception, pas un défaut.

**Le facteur six du banc v6 portait sur une semaine bordant une course INTERMÉDIAIRE** (l'A− à
39 jours), en milieu de plan — pas avant l'objectif. **O-103 est la pièce ; O-104 en est une
manifestation.** Ordre confirmé, gravité revue à la baisse.

---

## 3. §3 — le contrôle statique existe : `npm run check:dates`, **12ᵉ gate**

Ton diagnostic était juste jusqu'au bout, y compris sur la raison pour laquelle la septième a
échappé à `bench-dates.cjs` : *elle ressemblait à une fixture déjà ancrée.*

Le contrôle refuse **le motif**, pas l'instance : une date de calendrier
(`toISOString().slice(0,10)` ou un gabarit `getFullYear/getMonth/getDate`) dérivée de
`Date.now()` / `new Date()` **sans normalisation du jour de semaine**, dans les 12 bancs gardés.
Les chronomètres et les comparaisons d'échéance passent ; les exemptions sont **nommées avec
leur raison** et s'appuient sur le CONTENU de la ligne, jamais sur son numéro (règle 17).

### Il a eu de la prise immédiatement — **5 violations**

| | |
|---|---|
| `audit_v6.mjs:747` (U9) | une course à 14 jours, non ancrée — **le jour de semaine changeait chaque jour** |
| `bench_r14.cjs` ×3 | « aujourd'hui » pris sur l'horloge, sur un plan dont **toutes** les autres dates sont calées sur le lundi : le bord de la fenêtre d'adhérence glissait d'un jour par jour |
| `bench_r13.cjs:224` | en-tête de rapport — **exempté, avec sa raison** : la date est imprimée, elle n'entre dans aucune fixture |

Les quatre premières sont corrigées ; les bancs restent verts (`audit:v6` 74 verts · 0
régression, `audit:r14` tout passe). **La huitième occurrence n'arrivera pas par ce chemin.**

---

## 4. §4 — la forme sœur, sur l'axe du temps

```
une garde posée sur une branche      →  la branche sœur ne l'a pas
un correctif appliqué aux fixtures   →  la fixture SUIVANTE ne l'a pas
```

C'est exactement ce qu'a fait `REEL` : ajoutée après la passe « course datée », elle n'en a pas
hérité. Le contrôle du §3 couvre la première forme ; la seconde reste ouverte tant qu'aucun
contrôle ne balaie les **fixtures du golden** comme celui-ci balaie les bancs. Noté, pas écrit :
`goldenMaster.mjs` construit ses profils par générateurs imbriqués, et un contrôle statique y
serait fragile — la forme juste est probablement un contrôle **dynamique** (rejouer le corpus à
J+1 et exiger 0 écart), qui coûte une passe complète. À arbitrer.

---

## 5. §6 — la règle est écrite dans `CLAUDE.md`

> **Toute affirmation de DENSITÉ déclare son unité — créneaux ou minutes, jamais implicite.**

Avec ses trois occurrences et le critère qui tranche : *combien de séances demandent de la
récupération autour ?* se compte en **créneaux** ; *le plan est-il trop intense ?* se compte en
**minutes**. Le quatuor est désormais complet dans le manifeste : **un ratio a besoin de sa
base, un compte a besoin de son moment, un zéro a besoin de sa population, une densité a besoin
de son unité.**

Et ta formulation du §5 y entre aussi, en règle : **on n'écrit pas la promesse avant que le
mécanisme la tienne.**

---

## 6. Où en est le lot

| # | pièce | état |
|---|---|---|
| 1 | permanent + contenu par phase | tranché, vérifié, **et gardé par T-62** |
| 6 | la séquence et son intention au dépôt | livré |
| — | le contrôle statique des dates | **livré, 12ᵉ gate** |
| — | la règle d'unité de densité | **écrite** |
| **2** | **O-103** — le cycle livre ce qu'il déclare | **prochaine pièce** |
| 3 | `j5` → `dur1` | après O-103 |
| 4 | l'OFF du schéma de 10 | après |
| 5 | la condition d'activation lit le niveau | après |

---

## Vérifications

```
npm run batterie      12/12 verts (11 + check:dates)
T-62                  vert · contre-prouvé ROUGE (bk.ss → bk.vo2 en base)
check:dates           12 bancs gardés · 3 expressions examinées · 1 exemptée · 0 violation
audit:v6              74 verts · 0 régression        audit:r14  tout passe
golden                990/990 · 0 écart
```
