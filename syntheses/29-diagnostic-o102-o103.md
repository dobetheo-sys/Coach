# 29 — Diagnostic O-102/O-103 : **deux mécanismes, pas un — et l'un des deux est un dépassement de tableau**

**Brief 30** · 25/08/2026 · **aucune ligne écrite** — `src/` byte-identique, aucun correctif.
Toutes les attributions sont faites par **expérience à facteur unique** via `npm run casser`,
avec témoin positif validant l'instrument.

---

## 0. La réponse courte

Il n'y a pas UN schéma de 10 jours, il y en a **deux régimes**, et ils ne produisent pas le même
effet :

| régime | qui | mécanisme | effet |
|---|---|---|---|
| **(A) sports à schéma PROPRE** — trail, swimrun | 7 des 31 profils | leur `weekSchema` rend **7 entrées** et **ne reçoit jamais `use10`** ; `sch[7]`, `sch[8]`, `sch[9]` valent `undefined` → repli `{facile, facileR}` | **3 jours faciles gratuits par cycle** → ils GAGNENT |
| **(B) schéma GÉNÉRIQUE** — tri, run, bike, swim, duathlon | 24 des 31 | liste littérale de 10 entrées, composition différente du 7 jours | `dur1` −30 %/jour, `durLong` −30 %/jour, `dur2` +40 %, `facile2` +40 % → **perd qui concentre son volume dans `dur1`/`durLong`** |

Et **aucune passe aval n'y est pour rien** : neuf passes neutralisées une par une, **neuf fois
zéro écart**. C'est le SCHÉMA, mesuré, pas une correction en aval.

---

## 1. Où vit le schéma, et ce qu'il décide (tâche 1)

`src/generator/weekBuilder.ts:39-104`, fonction `schema(use10, phase, isRecup, r)` :

```js
const own = r ? sportModule(r.profile.sport).weekSchema : null;
if (own) return own(phase, isRecup, r);          // ← trail et swimrun sortent ICI
if (isRecup) { … use10 ? d : d.slice(0, 7) … }   // ← la récup, elle, a bien ses 10 entrées
if (use10)  return [dur1, facileR, dur2, facile2, facileR(dur), facileR, dur2, facile2, durLong, recup];
            return [recup, dur1, facileR, dur2, facile2, durLong, facileR];
```

et le jour est tiré par `sch[dic]`, `dic` allant de 0 à `cycleLen − 1`.

### (A) Le dépassement de tableau

`swimrunWeekSchema(_phase, isRecup)` et `trailWeekSchema(phase, isRecup, cat)` rendent **7
entrées** et **ne prennent pas `use10` en paramètre**. Sous `use10`, `dic` monte à 9 : `sch[7]`,
`sch[8]`, `sch[9]` sont `undefined`, et la ligne suivante applique son repli —

```js
const s = sch[dic] || { charge: "facile", slot: "facileR" };
```

**Trois jours `facileR` de plus par cycle, produits par un `||` de sécurité.** Mesuré, sur le
plan entier :

```
swimrun/series/inter   facileR  12 → 33 jours (+175 %)   dur1 10→8 · dur2 10→8 · durLong 10→7 · off 14→9
trail/-/inter          facileR  34 → 70 jours (+106 %)   dur1 22→16 · dur2 22→15 · durLong 22→17 · off 34→41
```

Tous les autres créneaux baissent d'environ 30 % — la dilution normale d'un cycle de 10 —, mais
le gain de `facileR` la dépasse largement. **C'est un accident, et il est aujourd'hui
BÉNÉFIQUE.**

### (B) La composition générique

Densité par JOUR, calculée sur les deux listes littérales :

| créneau | 7 jours | 10 jours | Δ |
|---|---|---|---|
| `dur1` | 0,143 | 0,100 | **−30 %** |
| `durLong` | 0,143 | 0,100 | **−30 %** |
| `dur2` | 0,143 | 0,200 | **+40 %** |
| `facile2` | 0,143 | 0,200 | **+40 %** |
| `facileR` | 0,286 | 0,300 | +5 % |
| `recup` | 0,143 | 0,100 | −30 % (donc un peu plus de jours actifs) |

Le 5ᵉ jour du cycle porte `["dur", "facileR"]` — **une charge `dur` sur un créneau facile**.
C'est O-102 : la CHARGE (qui alimente la courbe) promet du dur, le CRÉNEAU (qui décide du
contenu) livre du facile.

**La composition ne porte aucun commentaire qui la justifie** — elle est antérieure à la
scission du fichier (`edb1826`). En revanche `applyWeeklyVariety` (R5.5), 470 lignes plus bas,
documente explicitement l'une de ses conséquences : *« Le cycle de 10 jours place deux créneaux
`dur2` dans la même fenêtre calendaire… »*. Le doublon de `dur2` a donc été **constaté et
rattrapé en aval**, jamais remis en cause à la source. **Verdict : composition délibérée,
conséquences de densité jamais mesurées.**

---

## 2. Pourquoi la VO2max disparaît sur `REEL` (tâche 2)

**Producteur unique, mesuré** : `VO2max vélo` ne sort QUE du créneau `dur1`, et seulement en
`dev`/`spec`/`peak`. En `base`, le même `dur1` produit `Sweetspot vélo`.

```
                                use10    7 jours
jours dur1 en dev/spec/peak       18       21
VO2max vélo livrées               14       21
```

L'écart de 7 séances se décompose en :

- **3 par le compte de jours `dur1`** (18 contre 21) — la dilution −30 % du schéma, amortie par
  les cycles de récup qui gardent 10 entrées dans les deux modes ;
- **4 par des jours `dur1` qui ne portent PAS de séance de qualité vélo** : 2 en `dev` rendent
  `Nage aérobie + accélérations + Nage seuil`, 1 en `spec` et 1 en `peak` rendent
  `Endurance vélo + Nage seuil`. Sous 7 jours ce cas **n'existe pas** : 32 jours `dur1`, 32
  séances de qualité vélo, sans exception.

### Ce que j'ai éliminé, et comment

Neuf passes neutralisées **une par une** (`npm run casser`, moteur restauré dans un `finally`) :

```
applyPolarizationGuard · applyAntiCollage · applySessionBudget · applyDisciplineCoverage
applySwimFrequency · applyRunImpactCap · applyAvailability · applyStrengthGrafts
applyWeeklyVariety
→ pic 11,52 h · VO2max ×14 · longue CAP ×20  — IDENTIQUE aux neuf, à l'unité près
   (seule applyPeakSignature bouge : brick 11 → 10)
```

Puis les paramètres contextuels de `buildSessions` (`sessionLibrary.ts:56` en prend huit) :

```
slotIdx + creneauxDuSlot + dernierDuSlot neutralisés → VO2max ×14 (inchangé) — mais longue CAP
                                                       20→11 et 25→16 : ils agissent, ailleurs
isR (posé par CYCLE) neutralisé                     → VO2max ×14 (inchangé)
semaineRecup neutralisé                             → VO2max ×14 (inchangé)
prog (position dans la phase) neutralisé            → VO2max ×14 (inchangé)
```

**Témoin positif de l'instrument** — je ne publie pas huit « inertes » sans prouver que la sonde
sait bouger : remplacer le `["dur","dur1"]` du schéma 10 jours par `["facile","facileR"]` donne
**pic 11,52 → 9,82 h, VO2max ×14 → ×2**, le témoin 7 jours restant immobile à 12,32 h / ×21.
La sonde mesure bien ce qu'elle nomme.

⚠ **Ce que je NE sais PAS encore** : le producteur des 4 jours `dur1` sans qualité vélo. Il
n'est aucune des neuf passes ni aucun des quatre paramètres testés ; il est donc **à
l'intérieur de la branche `dur1` du module tri**. Je le dis plutôt que de le deviner — c'est le
premier pas du lot suivant.

⚠ **Une faute d'instrument, publiée** : le conteneur a restauré un état de disque ANTÉRIEUR
(`e3c44a0`) en cours de lot. Mes trois premières mesures de recensement portaient donc sur le
moteur d'avant les fiches 27-28. Détecté parce que la semaine de pic rendue (S39 / 613 min) ne
concordait pas avec celle de la fiche 28 (S37 / 691 min). Toutes les mesures publiées ici ont
été REJOUÉES sur `2b24ef0`.

---

## 3. Le profil qui GAGNE : ce qui le distingue (tâche 3)

`swimrun/series/inter` gagne **+1,10 h** de pic. Recensement, plan entier, 84 jours :

```
              use10   7 jours
facileR         33      12      ← +175 %, les 3 jours de repli par cycle
dur1             8      10
dur2             8      10
durLong          7      10
facile2          9      14
off              9      14
jours actifs/j  77 %    67 %
```

**Il perd exactement la même qualité que `REEL` (−30 % de `dur1`, `dur2`, `durLong`) — et il
gagne trois footings par cycle.** Chez lui `facileR` est une VRAIE séance (footing), chez `REEL`
un jour `facileR` du schéma générique est déjà utilisé. La différence n'est donc pas dans la
façon dont le cycle traite le profil : **c'est que le régime (A) ajoute du volume que le régime
(B) n'ajoute pas.**

Trail : même mécanisme, plus faible (facileR 34 → 70 mais `off` 34 → 41, donc le gain net n'est
que de +0,03 à +0,38 h).

---

## 4. L'hypothèse « budget élevé » — testée, et elle ne tient pas seule (tâche 4)

Hypothèse du brief : les perdants seraient ceux dont le nombre de créneaux est déjà proche du
maximum. **Mesurée, elle ne sépare pas les deux populations.**

Part du pic 7 jours portée par `durLong` + `dur1` :

```
perdants (9)   part moyenne 55 %
gagnants (14)  part moyenne 49 %
```

6 points d'écart, et **un contre-exemple net** : `CYCLE10/tri/S/debutant` porte **70 %** de son
pic dans `durLong`+`dur1` — la valeur la plus élevée des 31 — et il **GAGNE +0,23 h**. Une
hypothèse qu'un seul contre-exemple aussi extrême traverse n'est pas une explication.

**Ce qui sépare réellement, mesuré :**

1. **Le régime de schéma** — les 7 profils à schéma propre gagnent tous (+0,03 à +1,10 h) ; ils
   sont 7 des 14 gagnants. C'est le facteur le plus net du tableau.
2. **Parmi le régime générique**, les perdants sont les **triathlons** (`tri/S/inter` −1,18,
   `REEL` −0,80, `tri/S/avance` −0,70) et les **`run/10k`** (−0,22 ×4) ; les gagnants sont
   `run/marathon` (+0,13 à +0,35), `duathlon/L` (+0,08 à +0,20) et `tri/S/debutant` (+0,23).
   Les `tri/Full` et `bike/gravel` sont **exactement à 0,00** — ils sont collés à un autre
   plafond (leur pic vaut 9,00 / 10,00 h rond, la signature d'un plafond déclaré), donc le
   schéma ne peut rien y changer dans un sens ni dans l'autre.
3. **Le tri est le sport où `dur1` et `durLong` sont le moins substituables** : `dur1` y porte
   la qualité VÉLO (la discipline qui pèse 50 % de l'épreuve) et `durLong` le BRICK, qui est
   la séance signature. Les remplaçants que le cycle offre en échange — `dur2` +40 % et
   `facile2` +40 % — produisent chez lui `Endurance vélo` et `Nage récup courte`, deux séances
   dont les plafonds de séance sont bien plus bas que ceux du brick (34-101 min contre 173-212).
   **L'échange se fait à volume perdu parce qu'il se fait vers des types plus petits.**

Formulée proprement : **le cycle de 10 jours échange 30 % de `dur1` et de `durLong` contre 40 %
de `dur2` et de `facile2`. Perd celui chez qui les créneaux cédés portent des séances plus
GROSSES que celles des créneaux reçus** — c'est le triathlon long et le 10 km, où la longue et
la qualité principale sont les deux plus grosses séances du plan.

---

## 5. Verdict et première estimation (tâche 5)

### Le mécanisme

Deux, distincts, avec deux verdicts différents :

- **(A) `sch[dic]` déborde d'un tableau de 7 entrées** pour trail et swimrun. **Accidentel**, au
  sens propre : personne n'a écrit ces trois jours, c'est un `|| { facile, facileR }` qui les
  fabrique. Il est aujourd'hui **favorable**, ce qui explique qu'il n'ait jamais été vu.
- **(B) La liste générique de 10 entrées** change la densité des créneaux. **Délibérée dans son
  écriture, non mesurée dans ses conséquences** — et l'une d'elles (le double `dur2`) a été
  rattrapée en aval par R5.5 au lieu d'être corrigée à la source.

### Ce qu'il faudrait changer — première estimation, non implémentée

Le but est de rendre à `dur1` et `durLong` leur densité par JOUR (0,143) **sans toucher au
régime (A)**, donc sans dégrader les 7 profils qui gagnent par le repli.

- **Piste 1 — alterner deux gabarits de cycle** (pair / impair), l'un portant 1 `dur1` + 1
  `durLong`, l'autre 2 `dur1` + 2 `durLong`. Moyenne : 1,5 par 10 jours = 0,150/jour, soit la
  densité du 7 jours au centième près. **C'est la forme que le dépôt emploie déjà** — B1/B2
  alternent sur la parité de semaine pour les doubles de nage. Surface : la fonction `schema()`,
  qui reçoit déjà `r` et pourrait recevoir le numéro de cycle.
- **Piste 2 — supprimer le `["dur","facileR"]`** (O-102) et le remplacer par un vrai `dur1`.
  Densité de `dur1` : 0,100 → 0,200, trop haut ; à combiner avec la piste 1, pas seule.
- **Ce qu'il ne faut PAS faire** : donner `use10` aux schémas de trail et swimrun pour « fermer
  le débordement ». Mesuré, ça leur retirerait les 3 jours faciles par cycle, c'est-à-dire
  **0,75 à 1,10 h de pic sur les trois profils swimrun** — corriger l'accident dégraderait
  exactement les profils que le brief demande de ne pas dégrader. Si on veut le fermer, il faut
  d'abord DÉCIDER ce que ces schémas doivent faire sur 10 jours, et l'écrire.

### Ce qui reste à identifier avant d'écrire

Les **4 jours `dur1` sans qualité vélo** (§2). Tant qu'on ne sait pas ce qui les produit,
augmenter le nombre de jours `dur1` rendrait au mieux 3 des 7 VO2max manquantes.

---

## Vérifications

```
src/                  0 ligne modifiée · aucun correctif
mutations             12, toutes par `npm run casser` (restauration dans un `finally`)
témoin positif        1, validant que la sonde bouge (pic 11,52 → 9,82 h)
mesures               31 profils use10 · recensement de créneaux sur 3 profils (295, 84, 196 jours)
faute d'instrument    le conteneur a restauré e3c44a0 en cours de lot ; 3 mesures rejouées
```
