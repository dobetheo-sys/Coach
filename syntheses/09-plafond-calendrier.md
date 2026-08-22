# 09 — Le plafond est le calendrier : les quatre points de l'ordre, mesurés

**Date** : 22/08/2026 · **Instruments** : `npm run mesure:doublage` (NOUVEAU) · `npm run mesure:picmax`
**Moteur** : INTACT — `src/` byte-identique, aucune ligne écrite.

---

## 1. D'où vient « ≤ 3 jours doublés » ? — **ni une constante, ni dérivée de `dispo`**

Ta question posait deux issues. **C'en est une troisième**, et elle change la nature du levier.

Aucun nombre « 3 » n'existe dans le moteur. Le nombre de jours doublés est **ÉMERGENT** : c'est
le nombre de créneaux dont la branche `dbl` du module de sport **AJOUTE** une séance au lieu
d'en **SUBSTITUER** une. Lu dans `src/sports/tri/index.ts`, vérifié sur le livré :

| créneau | branche sous `dbl` | double ? |
|---|---|---|
| `dur1` | `if (dbl) S2.push(nage matin)` puis le vélo — **additive, inconditionnelle** | **toujours** |
| `dur2` | `if (dbl…) push(bk\|sw)` puis `if (spec\|peak) push(rn)` — **additive, conditionnelle** | phase + parité |
| `facileR` | alternance B1 — **additive, conditionnelle** | parité |
| `facile2` | toutes les branches sont `else if` — **SUBSTITUTIVES** | **jamais** |

Mesuré sur `REEL` : les semaines de charge à 3 jours doublés portent exactement
`dur1:sw+bk | dur2:bk+rn | facileR:bk+rn`. **Trois sites additifs, donc au plus trois jours.**

⚠ **Rectification d'une formulation à moi** : j'avais écrit « 7 jours, ≤ 3 doublés » comme si
c'était une borne du moteur. Le 3 est ce que trois branches produisent ; et dans la semaine de
**PIC** de la grille, le maximum mesuré est **2**.

**Conséquence sur le levier** : il n'y a pas de constante à régler. Ajouter un créneau doublé,
c'est **ajouter une branche additive** — exactement la forme de la pièce C3. Et le candidat
naturel, `facile2` (le créneau typé nage à 100 %), est précisément celui qui ne peut pas
doubler par construction.

---

## 2. Le corpus ne double pas — **enrichi, et le verdict tient**

Grille **288 plans** hors golden (le golden reste la photo) : **4 bases RÉELLES du corpus** ×
`doubles` (3) × `dispo` (4) × `sessions_max` (3) × `vol_max` (2). Aucune valeur inventée, tous
les domaines viennent d'`ANSWER_SCHEMA`.

### §A — pic livré maximum, par sport × `doubles`

| base | `non` | `parfois` | `oui` |
|---|---|---|---|
| `run/marathon` | 9,82 h | 9,82 h | **9,82 h** |
| `bike/gravel` | 16,80 h | 16,80 h | **16,80 h** |
| `tri/Full` | 12,95 h | 12,95 h | **16,57 h** (8 créneaux, 2 j doublés) |
| `tri/70.3` | 9,43 h | 9,43 h | **12,32 h** (8 créneaux, 2 j doublés) |

**`doubles` est un levier de TRIATHLON et de lui seul** — le guard `doublesAddVolume` n'est
déclaré que là. En mono-sport, les trois réponses rendent le même plan au centième.

### §D — `sessions_max` sature à 10

`tri/Full` : 6 → 14,02 h · **10 → 16,57 h · 14 → 16,57 h**. En mono-sport : totalement inerte
(9,43 h aux trois valeurs). C'est O-97 vu par l'autre bout.

### Le verdict du §2 de ton document

**« Le plafond est structurel » reste vrai, et il devient vrai DU MOTEUR** : avec le doublage
exercé, le tri monte de 12,95 à **16,57 h** — donc le mécanisme paie —, mais il paie **une
fois** et s'arrête là, parce qu'il n'y a que trois branches additives. Ton arithmétique
« 10 créneaux × 90 min = 15 h » décrivait un bord que le moteur **n'atteint pas** : le maximum
mesuré est **8 créneaux**, jamais 10.

---

## 3. Le champ `vol_max` — la table du plafond OFFERT est mesurée

| base | weekend | partielle | semaine | quotidienne |
|---|---|---|---|---|
| `run/marathon` | 9,8 | 9,7 | 9,4 | 9,4 |
| `bike/gravel` | 16,8 | 16,5 | 16,0 | 16,0 |
| `tri/70.3` `doubles=non` | 8,1 | 9,2 | 9,4 | 8,7 |
| `tri/70.3` `doubles=oui` | 8,0 | 11,1 | 12,3 | 11,5 |
| `tri/Full` `doubles=oui` | 11,5 | 15,8 | 16,6 | 16,6 |

**Un marathonien ne devrait pas se voir proposer 20 h : le moteur n'en livrera jamais plus de
9,8.** Ta conclusion tient. Enregistrée en **O-99**, avec deux réserves qui doivent être
tranchées avant d'écrire :

1. **La borne ne peut pas se dériver de la réponse `dispo` — voir le point suivant.**
2. `vol_max` est une DÉCLARATION, pas une commande. Le borner, c'est décider à la place de
   l'athlète ; la forme O-17 serait d'**informer** (« au-delà de N h, le moteur ne pourra pas
   placer ce volume ») plutôt que de brider le champ.

### ⚠ Ce que la mesure a trouvé en chemin, et qui bloque le point 3 : **O-100**

**Déclarer PLUS de disponibilité livre MOINS de volume.**

```
bike/gravel    weekend 16,80 h  >  partielle 16,53  >  semaine 16,00  =  quotidienne 16,00
run/marathon   weekend  9,82 h  >  partielle  9,70  >  semaine  9,43  =  quotidienne  9,43
tri/70.3       semaine 12,32 h  >  quotidienne 11,52                    (doubles = oui)
```

Sens constant sur les quatre bases et les deux `vol_max`. **Quatrième inversion de monotonie
du dépôt** — après `I13` (niveau), `O-21` (allure), `O-77` (`vol_max`) —, sur un cinquième axe.

Une raison défendable existe : moins de jours ⇒ des séances plus longues ⇒ moins de temps
perdu en échauffements et retours au calme. Ce qui n'est pas défendable est qu'une réponse
plus permissive **réduise** la promesse sans qu'aucune décision ne le dise.

**Et ça décide de l'ordre** : borner `vol_max` par la disponibilité déclarée suppose une
monotonie que le moteur n'a pas. Tant qu'O-100 n'est pas tranché, la borne devrait se dériver
du **maximum sur les réponses**, jamais de la réponse elle-même.

---

## 4. Les 731 profils à 10 h — **le manque leur est publié à 81 %**

| | profils | part |
|---|---|---|
| décision **`R20.2`** publiée | 594 | **81,3 %** |
| décision **`manque`** publiée | 69 | 9,4 % |
| **aucune des deux — MUETS** | **129** | **17,6 %** |

Ce que dit leur carte « ce qui borne » : *la durée de ta préparation* ×435 · *le nombre de
séances* ×45 · *ton historique* ×41 · *ton volume demandé* ×26 · *tes zones fragiles* ×6.

**Ta prémisse est partiellement RÉFUTÉE, et dans le bon sens** : les gros écarts SONT publiés.
Les 129 muets ont un écart **médian de 1,12 h** (max 2,85), et **un seul** est sous 8 h — le
silence porte sur l'écart modeste, jamais sur les 3 h manquantes. Personne ne reçoit 7 h pour
10 demandées sans explication.

Reste que le seuil de publication n'est écrit nulle part comme une décision : c'est le résidu
de deux règles qui ne se sont pas concertées (**O-98bis**).

---

## Ce que le lot laisse au fondateur

| # | question | état |
|---|---|---|
| 1 | d'où vient « ≤ 3 doublés » | **répondu** — émergent, trois branches additives, `facile2` exclu par construction |
| 2 | enrichir le corpus `doubles × dispo` | **fait** (288 plans) — le verdict tient, et le plafond du tri monte à 16,57 h |
| 3 | borner `vol_max` par la disponibilité | **ARBITRAGE (O-99)** — bloqué par O-100 : dériver du max, pas de la réponse |
| 4 | les 731 à 10 h | **répondu** — 81 % publiés, 129 muets à 1,12 h médian (O-98bis) |
| — | **O-100 — l'inversion sur `dispo`** | **NOUVEAU, à trancher** : le moteur monte-t-il l'offre avec les jours, ou publie-t-il que concentrer rend plus ? |

---

## Reproduire

```bash
npm run mesure:doublage    # §1 · §2 · §3 · O-100
npm run mesure:picmax      # §4 (§5 du script)
```
