# 30 — Tâche A : le producteur EST identifié et il RÉFUTE O-108 · Tâche B : piste 1 écrite, mesurée, RETIRÉE

**Brief 31** · 25/08/2026 · moteur `src/` **byte-identique** · une seule ligne livrée, dans le
HARNAIS (`scripts/casser.mjs`) · diff de la piste 1 conservé dans `piste1-gabarits-alternes.patch`

**Les deux tâches ne pouvaient pas tourner en parallèle sur le même dépôt** : la tâche A mesure
par `npm run casser`, qui **refuse de muter un fichier déjà modifié** — et la tâche B modifie
exactement ce fichier. Elles ont donc été menées dans cet ordre, A d'abord ; c'est aussi l'ordre
utile, puisque A explique la moitié de l'échec de B.

---

## TÂCHE A — le producteur est `applyWeeklyVariety`, et **O-108 est réfuté**

### Le discriminant est `jc`, le jour dans le cycle — que mon recensement ne regardait pas

Tracés un par un, les **18 jours `dur1`** de `dev`/`spec`/`peak` sous `use10` :

```
14 jours à jc = 1   → position 0 du schéma de 10 = ["dur","dur1"]   → 14 VO2max vélo, 14/14
 4 jours à jc = 7   → position 6 du schéma de 10 = ["dur","dur2"]   → 0 VO2max
```

et en 7 jours, **21 jours, tous à `jc = 2`** (position 1 du schéma de 7 = `["dur","dur1"]`),
**21 VO2max sur 21**.

**Les quatre déviants n'ont jamais été des `dur1`.** Ce sont des `dur2` que
`applyWeeklyVariety` (R5.5) **RENOMME** : quand le cycle de 10 place deux `dur2` dans la même
semaine calendaire, la passe cherche le créneau dur frère et fait `d.slot = alt`. Le recensement
les compte alors comme `dur1`.

**Contre-preuve** : la passe neutralisée, les jours `dur1` de `dev`/`spec`/`peak` tombent à
**14, tous à `jc = 1`, tous en VO2max**. Les quatre disparaissent.

### Ce que ça corrige dans la fiche 29

> **La décomposition « 3 séances par le compte de jours + 4 par un taux » est fausse.** Le taux
> vaut **100 % dans les deux modes**. Les 7 VO2max manquantes viennent à **100 % du compte de
> jours `dur1`** — 14 contre 21, soit exactement la dilution −33 % du schéma de 10. **Il n'y a
> pas de second mécanisme.**

Ma faute est de règle 17 : **un critère n'identifie jamais sa cible par une étiquette qu'une
passe réécrit.** Je recensais `d.slot` APRÈS le pipeline.

### Délibéré ou accidentel ?

**Délibéré, documenté, et ce n'est pas un défaut.** L'en-tête de `applyWeeklyVariety` (R5.5,
audit v7 bis) nomme lui-même le cycle de 10 jours comme la cause des `dur2` en double, et
explique le remède : chercher une variante, à défaut alléger. La passe fait son travail.

### Interaction avec la tâche B — **directe, et c'est elle qui la fait échouer** (§B ci-dessous)

---

## TÂCHE B — piste 1 : la densité se répare à moitié, le pic BAISSE

Écrite comme demandée : `schema()` reçoit `cycleNum`, gabarit **pair** = un second `dur1`
(position 6), gabarit **impair** = un second `durLong` (position 2). `["dur","facileR"]`
(position 4, O-102) **non touché**. Régime (A) — trail et swimrun — **hors périmètre, et vérifié
strictement intact**.

### Densité obtenue (régime générique, 3 222 jours)

⚠ **La cible n'est pas 0,143.** C'est la densité **MESURÉE** en 7 jours : les cycles de récup et
l'affûtage diluent les deux modes de la même façon, et comparer un livré à une valeur théorique
serait la faute que ce dépôt paie depuis O-43.

| créneau | use10 AVANT | use10 APRÈS | 7 jours (cible) | |
|---|---|---|---|---|
| `dur1` | 0,101 | **0,100** | 0,114 | ✖ **inchangé** |
| `durLong` | 0,083 | **0,122** | 0,113 | ✓ réparé |
| `dur2` | 0,118 | **0,080** | 0,104 | ✖ cassé dans l'autre sens |
| `facile2` | 0,178 | 0,171 | 0,155 | |

### Le pic livré : **−0,79 h cumulés sur les 31 profils**

```
8 profils baissent · 6 montent · 17 immobiles
REEL              11,52 → 11,30 h   (−0,22)
run/marathon      8,88 → 8,73 · 9,78 → 9,55 · 8,88 → 8,73
swim/fond/deb     1,62 → 1,48
tri/S             3,30 → 3,20 · 3,82 → 3,95 · 3,48 → 3,48
duathlon/L        8,75 → 8,73 · 9,45 → 9,48 · 8,75 → 8,73
O-21b/run/10k ×4  3,68 → 3,70
trail ×4, swimrun ×3, bike ×3, tri/Full ×4   INCHANGÉS  ✓
```

### Pourquoi — `applyWeeklyVariety`, deux fois, **symétriquement**

- **Un second `dur1` dans la semaine est RENVOYÉ vers `dur2`** (la passe cherche le créneau dur
  frère). C'est pourquoi la densité de `dur1` ne bouge pas d'un millième.
  **Contre-preuve** : piste 1 avec la passe neutralisée → `dur1` **0,116**, la cible atteinte.
- **Un second `durLong` n'a PAS de créneau frère** (`alt` vaut `null` pour `durLong`) : la passe
  tombe dans sa branche d'allègement et le **DÉCLASSE en séance facile**. Mesuré isolément sur la
  variante « seul `durLong` alterne » : `REEL` **11,52 → 10,13 h (−1,39)** — le brick de 200 min
  devient une séance facile.

> **Ajouter un créneau que R5.5 tient pour un doublon n'ajoute pas d'entraînement : ça ajoute un
> déclassement.**

### Trois variantes mesurées, aucune positive

```
piste 1 complète (dur1 + durLong)   Δ pic cumulé  −0,79 h
seul dur1 alterne                   Δ pic cumulé  −0,70 h  (REEL tenu à 11,53 · marathon −0,53)
seul durLong alterne                REEL −1,39 h
```

**Piste 1 est donc RETIRÉE** (`src/generator/weekBuilder.ts` byte-identique à `823f542`, diff
conservé). Ce qui reste vrai : la moitié `durLong` répare bien la densité, et la **piste 2**
(libérer la position 4, `["dur","facileR"]`) est exactement ce qui rendrait `dur2` à sa densité
au lieu de le casser. L'enchaînement prévu par le brief est confirmé par la mesure — mais
**aucune des deux pistes n'est livrable avant d'avoir traité R5.5**, soit en lui donnant une
variante pour `durLong`, soit en excluant de son champ les doublons VOULUS par le gabarit.

---

## Ce qui EST livré : un défaut du harnais de contre-preuve (O-110)

`npm run casser` écrivait chaque mutation **depuis l'original** :

```js
writeFileSync(m.fichier, originaux.get(m.fichier).replace(m.avant, m.apres));
```

Sur un même fichier, **seule la DERNIÈRE mutation survivait** — pendant que la boucle imprimait
« ⚡ cassé » une fois par mutation. C'est la classe que ce harnais existe pour fermer, en pire :
il **perturbe à moitié et s'imprime comme complet**. Trouvé le jour même — ma première mesure de
la variante « seul `durLong` alterne » décrivait un état intermédiaire que personne n'avait
demandé ; elle est invalidée et refaite dans ce rapport.

Corrigé : mutations **cumulatives**, motif cherché dans le contenu COURANT, compte annoncé par
fichier. **Validé en reproduisant un état CONNU** — la piste 1 neutralisée par deux mutations
rend exactement les 31 pics de la ligne de base (`REEL` 11,52 · `O-21b` 3,68 · `tri/S/inter`
3,82), là où la version d'avant rendait 11,38.

---

## Vérifications

```
src/                     0 ligne modifiée (piste 1 retirée, patch conservé)
scripts/casser.mjs       correctif O-110, validé par reproduction d'un état connu
npm run batterie         12/12 verts · 0 rouge
mesures                  31 profils use10 · 3 variantes de gabarit · 18 jours dur1 tracés un par un
fautes d'instrument      3, publiées : recensement par étiquette finale (règle 17) ·
                         casser multi-mutation (O-110) · un `git stash` sur arbre propre qui a
                         dépilé un stash VIEUX d'une autre branche (conflit, annulé sans perte)
```
