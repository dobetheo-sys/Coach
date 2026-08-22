# Le placement du test — (b) réfuté, (c) livré · et la franchissabilité ne consulte aucun plafond

**Commit** `c50de88` · 21/08/2026 · **arbitrage** `PLACEMENT_TEST_ET_O54.md`
**Livré** : le point 1 (placement) et le point 2 (mesure de la franchissabilité)
**Non fait** : le point 3 — le cliquet sur les 23 comptes

---

## 1. (b) est réfuté par C22, une règle DURE

Ton argument était plausible et méritait la mesure : *« la base est la phase à bas volume, donc y
ajouter une séance est une perturbation relative plus grande ; en développement, la même séance
pèse moins »*.

```
test posé en phase de BASE            tri/S  S4→S5  +22 %   ✗ C22
test posé en 1re semaine de DEV       tri/S  S4→S5  +22 %   ✗ C22   ← le MÊME chiffre
```

**Le même chiffre aux deux positions : ce n'est donc pas la phase qui est en cause.** Ce qui bouge
est plus profond — la **courbe DÉCLARÉE** elle-même se déforme (`S3` 3,80 → 2,43 h) et la
périodisation se déplace (`S7` passe de footings à des bricks, avec une journée « semaine de
récupération »). Avancer le test dans le plan reshape le volume bien au-delà de la natation.

Une seule mesure devait décider, comme tu l'avais écrit. Elle a décidé : **(c)**.

---

## 2. (c) livré — la position est un créneau, plus un ordinal

O-95 avait raison sur la **PHASE** (fin de développement) et faux sur sa **RÉSOLUTION** :
`weekNum === dev.end` est un ordinal, et sur un plan dont la fin de développement est une semaine
de **RÉCUP**, cette semaine ne porte aucun créneau de nage — le test n'était **jamais posé**.

> *« Une position calendaire dans un plan dont la composition varie est un ordinal dans une
> collection dérivée. »* — la famille d'O-59, O-71 et O-58, sur un quatrième objet. C'est écrit
> comme telle dans le code, à la branche.

La position devient une **propriété du créneau** : `dernierDuSlot`, calculé par `weekBuilder` —
le seul à voir le plan entier, là où un module de sport ne voit qu'un jour.

### Deux bornes, écrites dans le calcul et mesurées

```
rang 0 seulement          c'est la condition que le bloc B-17 impose déjà ; marquer un jour
                          doublé produirait un fait vrai que personne ne peut lire

jamais une DÉCHARGE       un test maximal n'a pas sa place dans une semaine qui assimile —
                          et la branche décharge du plancher piscine RETIRE les séances sous
                          le plancher au lieu de les remonter : un test posé là est effacé
```

Sans la seconde, **le défaut se déplaçait d'un cran au lieu d'être fermé** : mesuré, le test
tombait en S4 (la récup) et disparaissait.

### Le résultat

```
annonce == livré     26/28  →  28/28 plans tri        (manquants : B17/tri/S/debutant/{inconnue,absente})
en BASSIN            28/28
contre-preuve        l'ordinal remis  →  2/28 rouges
rayon golden         8 profils = exactement {S,M} × {debutant,inter} × {absente,inconnue}
```

Sur le profil qui a motivé tout le chantier :

```
S1 éducatifs · S2 éducatifs · S3 éducatifs + TEST DE CONTINUITÉ (bassin)
S5 continue eau libre 500 · S6 continue 500 · S7 éducatifs · S8 rappel
```

Garde : `T-06` branche (c) — **annonce == livré sur toute la population tri, et en bassin**.

---

## 3. Ta question du §2 : la liste n'est ni incomplète ni sautée — **elle est vide**

> *« Elle consulte C15 mais pas swimSessionCapAtWeek ? → la liste est incomplète.
>    Elle ne tourne pas sur ces profils ? → une condition la saute. »*

**Ni l'un ni l'autre.** `continuityGate` calcule :

```
atteignableM  = departM × C22^spanSem
franchissable = atteignableM >= courseM
```

Elle ne modélise que la **rampe de croissance**. Elle ne lit ni `swimSessionCapAtWeek`, ni
`swimSessionCapM`, ni `CAP_SWIM`, ni C15. **Il n'y a pas de liste de plafonds.** La question à
laquelle `franchissable` répond est *« la croissance à +10 %/semaine suffit-elle à atteindre la
distance de course ? »*, pas *« un palier de cette taille peut-il être LIVRÉ ? »*.

Deux conséquences mesurées, et elles vont dans des sens opposés :

```
plan LONG           atteignable 26 220 m pour une course de 3 800  →  franchissable = true
                    par construction : la rampe C22^40 vaut ×45, elle ne borne plus rien

source NON mesurée  franchissable = null  →  la branche rabattement n'est JAMAIS évaluée
                    pour la population qui en aurait le plus besoin
```

---

## 4. Sur le livré : 23 plans sur 99, et QUATRE causes distinctes

Balayage des plans tri portant au moins deux continues, dernière continue comparée à la distance
de course :

| profil | course | suite LIVRÉE | `franchissable` | cause |
|---|---|---|---|---|
| `B17/tri/S/debutant/basse-100m` | 750 | 400 → 500 | **false** | l'écart EST déclaré infranchissable, et le rabattement ne s'applique pas |
| `B17/tri/S/debutant/inconnue` | 750 | 500 → 500 | **null** | source non mesurée : `franchissable` n'est jamais calculé |
| `PW/tri/M/plat` | 1500 | 550 → 900 → **1225** | null | progression **TRONQUÉE** — le dernier palier devrait valoir `courseM` (D2) |
| `G/tri/Full/vol-min` | 3800 | 2275 → 3050 → **2150** | true | **NON MONOTONE** — la progression redescend (ton addendum O-54) |

**Correctif non écrit**, et la raison est dite : c'est bien une mesure et non un arbitrage, mais le
correctif touche `franchissable`, **dont dépend le rabattement de format** — ce rayon se mesure
pour lui-même. Et il y a quatre causes à traiter, pas une.

---

## 5. ⚠ Une formulation d'hier corrigée

J'avais écrit : *« les paliers annoncés à 800/1350/2250 m sont livrés à 500 »*. Ces valeurs sont le
`bnd.floor` **interne**. Le **titre** de la séance, lui, suit le livré — `T-40` est vert, aucun
titre n'annonce une distance que la séance ne contient pas.

**Le plan n'annonce donc rien de faux à l'athlète. Il est PLAT** : la décision `B17-paliers` promet
« 3 paliers » et le plan livre trois séances de la même distance. C'est un défaut différent, et
moins grave, que celui que j'avais décrit.

---

## Gates

`batterie` 11/11 · `lotPhysio` 31 verts · 25 rouges attendus · 0 régression · `audit:v1` 459 à 0 ·
golden **990 recapturé** (8 profils) · `sw.js` `eb-pwa-0917866d525c` · E2E 25/25.
