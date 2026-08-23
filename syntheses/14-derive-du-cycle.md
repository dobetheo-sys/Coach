# 14 — L'écart n'est pas d'une position : le cycle de 10 perd un cinquième de ce qu'il déclare

**Date** : 22/08/2026 · **Instrument** : `npm run mesure:cycle10` (§4, nouveau) + `npm run casser`
**Moteur** : INTACT — `src/` byte-identique.

---

## 1. Ton §1 est juste, et je reprends ton unité

```
j1 dur1 ■ · j3 dur2 ■ · j5 facileR □ · j7 dur2 ■ · j9 durLong ■
→ 4 créneaux de qualité / 10 j = 4,00     contre  3 / 7 j = 4,29
```

**Quatre, pas cinq et pas un.** Le compte au classificateur (1) répondait à la question
« combien de jours au-dessus du seuil » ; le compte de créneaux de qualité (4) répond à
« combien de séances demandent de la récupération autour ». **C'est le bon pour la question de
conception**, et il dit que le cycle de 10 est **très légèrement moins dense**, pas plus.

**Et je suis d'accord avec ton §3, sans réserve** : `dur2` (sweetspot, force) et `durLong`
(longue, brick) ne doivent PAS livrer du VO2max. Cinq séances au-dessus du seuil en dix jours
n'est pas un plan. Le mot collisionne, les contenus sont bons.

---

## 2. ⚠ Mais « la rotation en perd 0,5 » — ce n'est pas la rotation

J'ai cherché d'où venait `4,00 déclarés → 3,50 livrés`. Position par position, créneau déclaré
contre créneau réellement porté :

| base | cycle de 10 | semaine de 7 |
|---|---|---|
| `run/marathon` | **24/31 (77 %)** | 33/33 (**100 %**) |
| `bike/gravel` | **24/31 (77 %)** | 33/33 (**100 %**) |
| `tri/Full` | **60/73 (82 %)** | 75/75 (**100 %**) |
| `tri/70.3` | **69/86 (80 %)** | 93/93 (**100 %**) |

**Le schéma de 7 est livré à 100 % sur les quatre bases. Celui de 10 perd un cinquième de ses
positions clés.** Sur `tri/70.3` : 17 positions dérivent, dont **10 deviennent une journée
facile** (`facileR/facile`) ; les 7 autres échangent entre créneaux clés (`dur2 → dur1` ×6),
sans perte de compte.

Aucune n'est `forced` ni `swapped` — ce n'est pas un échange de jours de l'athlète. La dérive se
concentre sur **`j7`** (le second `dur2`) et frappe les semaines qui **bordent une décharge**.
La cause structurelle est la seule différence entre les deux schémas : **un cycle de 10
chevauche les semaines calendaires ET les cycles de récup ; celui de 7 ne le fait jamais.**

Ouvert en **O-103**.

---

## 3. Et ça change ton §2 : convertir `j5` ne suffit pas

Mesuré à facteur unique (`npm run casser` sur le schéma, `REEL/tri/70.3`, `doubles: oui`) :

| | créneaux clés /10 j | jours durs /10 j | part de dur | pic | total |
|---|---|---|---|---|---|
| **état courant** | 3,50 | 1,15 | 5,6 % | 11,52 h | 305 h |
| **`j5` → `dur1`** | 3,73 | 1,38 | **7,3 %** | **12,30 h** | 324 h |
| **`j5` → `dur2`** | **4,06** | **1,57** | 6,6 % | 11,23 h | 324 h |
| *schéma de 7 (témoin)* | *4,29* | *1,68* | *7,9 %* | *12,32 h* | — |

**Aucune des deux variantes n'atteint la densité du schéma de 7.** Ton arithmétique —
5,00 contre 4,29, +17 % — suppose une livraison à 100 %, et la dérive en mange 20 %.

**Donc l'ordre s'inverse : O-103 avant `j5`.** Sinon la pièce se mesure contre un plancher qui
bouge, et son résultat sera attribué à la conversion alors qu'il dépendra de la dérive.

À noter pour l'arbitrage : les deux variantes ne font pas la même chose. **`dur1`** ajoute du
**vrai dur** (part 5,6 → 7,3 %) et monte le pic à 12,30 h ; **`dur2`** ajoute du **créneau clé**
(4,06) mais moins de dur, et fait *baisser* le pic. Si l'intention est l'intensification,
c'est `dur1`.

---

## 4. Ce que je retiens de tes §4 et §5, sans mesure à opposer

- **La condition d'activation doit lire l'expérience** : 3,5 clés/semaine est tenable pour un
  athlète expérimenté et excessif pour un débutant, et `use10` ne lit aujourd'hui que
  `dispo · shift_ok · offDays`. Ta conclusion d'hier tenait, avec le sens inversé.
- **L'`off` du schéma** : mesuré, il n'y en a **aucun** dans le schéma de 10 ; ceux qui
  apparaissent en `run`/`trail` sont posés **en aval** par `MAX_RUN_DAYS`. En tri et en vélo,
  aucun. Si le cycle densifie, il cesse d'être un détail.
- **La spec entre au dépôt avec le lot.** Les motifs écrits dans le code disent tous
  *« répartir »* et *« espacer »* — l'inverse de l'intention. Tant que ce n'est pas corrigé, le
  prochain lecteur « réparera » le cycle dans le mauvais sens. C'est le point que je tiens pour
  le plus important de ton document.

---

## 5. Le lot, tel que la mesure le réordonne

| ordre | pièce | pourquoi ici |
|---|---|---|
| **1** | la question **permanent / bloc**, tranchée et écrite | elle décide de tout le reste, et rien dans le dépôt n'en dit un mot |
| **2** | **O-103** — le cycle livre ce qu'il déclare | sans ça, la densité mesurée après `j5` sera fausse |
| 3 | `j5` : `facileR` → créneau de qualité (ferme `facileR/dur`) | et **`dur1`** si l'intention est l'intensification |
| 4 | l'`off` du schéma de 10, en dur | il rend la densité tenable |
| 5 | la condition d'activation lit le niveau | 3,5 clés/sem n'est pas pour tout le monde |
| 6 | la séquence, son intention et son unité entrent au dépôt | sinon le prochain lecteur inverse le sens |

**Il me manque le 1 pour commencer.** Permanent ou bloc — et si bloc, sur quelles phases.

---

## Reproduire

```bash
npm run mesure:cycle10   # §1 la séquence · §2 promis vs livré · §4 la dérive (O-103)
```
