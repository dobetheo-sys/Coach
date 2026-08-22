# 11 — Dur / facile sur `tri/70.3` × `doubles: oui` : le cycle de 10 jours DILUE le dur

**Date** : 22/08/2026 · **Instrument** : `npm run mesure:doublage` (§G et §H, nouveaux)
**Moteur** : INTACT — `src/` byte-identique.

**Population** : 217 jours de charge dans **les deux** états (identique — c'est ce qui rend la
comparaison licite). Fixture : `REEL/tri/70.3`, `doubles: oui`, `sessions_max: 14`,
`vol_max: 20`, seul `dispo` varie. **« Dure » = ce que dit le classificateur DU MOTEUR**
(`intensitySplit(s).hardMin > 0`), jamais une seconde liste de noms de séances (leçon T-01).

---

## 1. Séances dures par unité de temps

| | séances / 7 j | **séances DURES / 7 j** | **/ 10 j** |
|---|---|---|---|
| `semaine` | 8,00 | **1,68** | **2,40** |
| `quotidienne` | **8,26** | **1,19** | **1,71** |

**`quotidienne` livre PLUS de séances et MOINS de dur** : +3 % de séances, **−29 % de séances
dures**. Les deux unités disent la même chose, puisque les deux plans livrent des semaines de
7 jours (§F du lot précédent) — le « cycle de 10 jours » ne change pas le calendrier, il change
la rotation des créneaux.

---

## 2. Espacement entre deux jours durs

| | médiane | minimum | enchaînements à 1 j |
|---|---|---|---|
| `semaine` | **7 j** | 7 j | 0 |
| `quotidienne` | **10 j** | 4 j | 0 |

La signature est nette : sous `semaine`, le dur revient **exactement toutes les semaines** —
médiane et minimum confondus à 7, c'est-à-dire une horloge. Sous `quotidienne`, la médiane
passe à **10 jours**, avec un minimum à 4 : le dur est à la fois **plus rare et plus
irrégulier**. Aucun enchaînement de deux jours durs dans les deux cas — la garde tient.

---

## 3. Répartition dur / modéré / facile

| | dur | modéré | facile |
|---|---|---|---|
| `semaine` | 1 488 min (**7,9 %**) | 2 952 (15,7 %) | 14 329 (76,3 %) |
| `quotidienne` | 1 031 min (**5,6 %**) | 2 605 (14,2 %) | 14 673 (80,1 %) |

Ramené à 7 jours : **dur 48,0 → 33,3 min (−31 %)**, **facile 462,2 → 473,3 min (+2 %)**.

**Le facile ne bouge pas. C'est le dur qui disparaît.** L'athlète qui déclare la
disponibilité la plus large reçoit un plan qui s'est **adouci**, pas raccourci.

---

## 4. §H — la cause, jusqu'au producteur (règle 16)

| créneau / charge | `semaine` | dont durs | `quotidienne` | dont durs |
|---|---|---|---|---|
| `dur1/dur` | 31 j | **31** | **25 j** | **25** |
| `dur2/dur` | 31 j | 0 | 30 j | 0 |
| `durLong/dur` | 31 j | 0 | 21 j | 0 |
| `facileR/dur` | — | — | **22 j** | **0** |
| `facile2/facile` | 31 j | 0 | 45 j | 0 |
| `facileR/facile` | 62 j | 0 | 52 j | 0 |

**Un seul créneau produit du dur : `dur1`** — et il passe de **31 à 25 jours de charge
(−19 %)**, parce que le cycle en contient un par **10** jours au lieu d'un par **7**. Tout le
reste suit.

### ⚠ Ce que §H a trouvé en passant

Le schéma de 10 pose une charge **`dur`** sur un créneau **`facileR`** : **22 jours étiquetés
`facileR/dur`, dont 0 dur livré.** La CHARGE — qui alimente la courbe de volume — promet du
dur ; le CRÉNEAU — qui décide du contenu — livre du facile. Personne ne vérifie que les deux
disent la même chose.

C'est la même famille que le lot « type du créneau » : le schéma de semaine est agnostique de
la discipline **et de l'intensité réelle**, seul le module de sport décide.

---

## 5. Ce que ça change pour l'arbitrage O-100b

Réparer O-100b n'est **pas** « remonter le volume ». La question est plus étroite et elle se
pose maintenant en une phrase :

> **Le cycle de 10 jours doit-il porter autant de `dur1` par unité de temps que celui de 7 ?**

Deux issues, et elles ne coûtent pas pareil :

| issue | ce que ça veut dire | rayon |
|---|---|---|
| **(a) densité préservée** | le cycle de 10 porte ~1,4 `dur1` (au lieu de 1) pour retrouver 1,68/7 j | correctif de schéma, rayon à mesurer — et il touche la périodisation de tout ce qui utilise `use10` |
| **(b) assumé et DIT** | le cycle de 10 EST un cycle plus facile et mieux espacé, la carte l'annonce | un message, rayon nul — et c'est cohérent avec O-100a |

**(b) est défendable physiologiquement** : 10 jours d'espacement entre deux séances dures est
un choix d'entraînement légitime, pas une erreur. Ce qui n'est pas défendable, c'est qu'il
s'applique **en silence** à qui a coché la réponse la plus permissive.

Et il reste un troisième objet, indépendant des deux : **le libellé `facileR/dur`**, qui est
un défaut de cohérence interne quelle que soit l'issue retenue.

---

## Reproduire

```bash
npm run mesure:doublage   # §G densité · espacement · répartition   §H le producteur
```
