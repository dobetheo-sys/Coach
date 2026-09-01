# Fiche 46 — Chantier « progression » : diagnostic du dimensionnement des séances

**Date : 01/09/2026 · Aucune ligne de moteur écrite** (`src/` byte-identique — vérifié). Toutes
les mutations de mesure sont passées par `npm run casser`, qui restaure dans un `finally`.

**Ce que ce diagnostic renverse d'abord : ma propre conclusion de la fiche 44.** J'y avais
attribué O-77 à `sessionScale` sans test à facteur unique — je l'avais INFÉRÉ d'un tableau de
composition. Mesuré ici en neutralisant `sessionScale` (forcé à 1), **l'inversion est intacte,
au chiffre près** : 10 semaines sur 25, S1 82 → 51 min. `sessionScale` n'est pas la cause d'O-77.
La correction est publiée avant tout le reste, parce que c'est elle qui aurait mal orienté le
chantier.

---

## 1. Cartographie du dimensionnement d'une séance

La taille d'un bloc naît d'**une seule formule**, présente dans les sept modules de sport sous
deux noms (`P` et `PT`) :

```
taille = ( lo + (hi − lo) × interp(phase, prog) ) × sessionScale
```

Trois termes, de natures très différentes :

| terme | nature | varie avec | où |
|---|---|---|---|
| `(lo, hi)` | table | le FORMAT et la PHASE | module de sport (13 à 22 sites par sport) |
| `prog` | positionnel | la position DANS LA PHASE | `weekBuilder.ts:408` |
| `sessionScale` | **constante de PLAN** | l'enveloppe déclarée `vol_max` | `reasoningEngine.ts:355` |

**Mesuré — `sessionScale` est linéaire en `vol_max` et sature à 16 h** (tri/70.3, tout le reste
fixe) :

```
vol_max   6  →  0,429      vol_max  13  →  0,929
vol_max   9  →  0,643      vol_max  16  →  1,000
vol_max  11  →  0,786      vol_max  20  →  1,000
```

Elle s'applique **uniformément de la semaine 1 à la dernière**. C'est bien la forme de la
règle 20 (une valeur de FIN appliquée au DÉBUT) — mais la mesure ci-dessus montre que ce n'est
pas ce qui produit O-77.

**`prog` est une DENT DE SCIE, pas une rampe** — c'est la trouvaille structurante de ce
diagnostic. `prog = (semaine − 1 − phase.start) / (phase.weeks − 1)`, **remis à zéro à chaque
frontière de phase**. Sur un 70.3 de 43 semaines :

```
S1..S13 base 0,00 → 1,00 · S14..S24 dev 0,00 → 1,00 · S25..S36 spec 0,00 → 1,00
S37..S41 peak 0,00 → 1,00 · S42..S43 taper 0,00 → 1,00        (4 remises à zéro)
```

**`weekNum` EXISTE dans le kit de dimensionnement et n'est JAMAIS lu pour dimensionner** :
ses 8 occurrences du module tri servent la parité (alternance B1/B2), l'index de palier B-17 et
la détection d'affûtage. Il n'y a donc, aujourd'hui, **aucune grandeur de taille qui connaisse
sa position dans le PLAN** — seulement sa position dans sa PHASE.

**Ce qui doit légitimement rester une constante de plan**, et ce qui ne devrait pas :

| constante du kit | verdict |
|---|---|
| `medHold`, `inj`, `noVo2`, `loadFactor` | **légitime** — une protection ne progresse pas |
| `recupEvery`, `maxRunDays`, `budgetPerWeek` | **légitime** — cadence et fréquence, pas taille |
| `finisher`, `comp`, `dbl`, `lvl` | **légitime** — intentions et contraintes déclarées |
| `sessionScale` | **discutable** — c'est un facteur de TAILLE, il devrait dépendre de la position |
| `beginner` | **déjà nommé défaut** (règle 20, CLAUDE.md) — le débutant de S1 l'est encore en S30 |
| `swimSessionCapM` | **DÉJÀ CORRIGÉ** — c'est le précédent, voir §4 |

## 2. Les quatre inversions partagent-elles une racine ?

**Non — quatre causes distinctes, et la mesure le montre plutôt que l'histoire.**

Expérience contrôlée : `prog` rendu GLOBAL au plan (`(semaine−1)/(semaines−1)`), un seul facteur
varié, corpus complet.

```
audit:invariants   22 × 54   VERT   (I13, l'inversion de NIVEAU, y vit)
audit:v6  O17 / O-21b        VERTS  (l'inversion d'ALLURE)
audit:v1                     ✖ ROUGE — 3 violations DURES du manifeste
```

Le changement positionnel **ne répare ni ne casse** les trois inversions déjà fermées : il leur
est ORTHOGONAL. Leurs racines sont écrites et différentes — I13 (niveau) était une garantie de
SÉANCE retirant des minutes après la boucle de volume ; O-21 (allure) était un seuil TOUT-OU-RIEN
sur un axe continu ; O-93 (phase) était une contrainte de monotonie ABSENTE entre semaines
voisines ; O-77 (volume) est encore ouverte et sa cause n'est pas celle que la fiche 44 a écrite.

**Ce qu'elles partagent n'est pas un mécanisme, c'est une ABSENCE** : le moteur n'a aucun
invariant global de monotonie. Chaque axe (niveau, allure, phase, volume, position) a dû être
gardé séparément, après coup, quand quelqu'un a pensé à faire varier cette entrée-là. Un seul
chantier ne peut donc pas les fermer toutes ; ce qui les fermerait toutes est d'une autre
nature — un **gate de monotonie par axe**, dérivé du schéma comme `audit:sensibilite` l'est
déjà (R20.1).

## 3. Le lien avec la fenêtre de nage plate (O-56) : partiel, et le libellé était faux

Les 30 profils se décomposent en **trois causes, dont une seule touche à ce chantier** :

```
 8 / 30   continuité de nage NON déclarée → « l'inconnu ne projette pas » (T-41)
          ⇒ PAR CONCEPTION, pas un défaut (et 8 sur 8 des non-déclarés sont plats : cohérent)
11 / 30   format SPRINT → la projection converge vers la distance de course (750 m)
          ⇒ documenté par T-41, correct : 400 m et 2 000 m déclarés arrivent au même plafond
11 / 30   format FULL → ni plat ni voulu : c'est un PIC CENTRAL SUIVI D'UN EFFONDREMENT
```

**Mon instrument nommait « plate » une trajectoire qui ne l'est pas.** Comparer les 4 premières
semaines de charge aux 4 dernières donne « 22 → 22 min », mais la série complète d'un Full
débutant est :

```
1600 1650 1375 1575 1475 1550 1600 1600 | 2725 2825 3000 2950 1850 2025 2850 | 1700 1700 1675 1700 1600 1525 1425 1525
                                          ↑ le maximum est ici (S9-S15)              ↑ les 8 dernières semaines de charge
```

La nage monte à **3 000 m au milieu du plan puis redescend à 1 400-1 700** pour les huit
dernières semaines de charge. « Fenêtre plate » cachait un défaut plus grave que lui.

**Part attribuable au mécanisme d'O-77** : neutraliser `sessionScale` ouvre **10 des 30**
fenêtres. Un tiers partage donc son mécanisme, deux tiers non.

**Et une garde de sécurité a été innocentée en chemin** : j'ai d'abord classé les 30 comme
« épinglées au plafond C15 (850 m) ». C'était faux — les valeurs livrées sont à 1 100 m, donc
AU-DESSUS de C15, qui ne mordait pas. Desserrer C15 à 99 999 **aggrave** (30 → 34 plates) :
la borne qui mord est ailleurs. Publié comme faute d'instrument.

## 4. Autres symptômes du même défaut, recensés sans être corrigés

**(a) La dent de scie se voit sur le livré — et l'expérience contrôlée la chiffre.** Pour chaque
type de séance présent des deux côtés d'une frontière de phase, la taille chute-t-elle en
franchissant la frontière ?

```
moteur actuel        1 597 creux (> 5 min) sur 3 153 frontières · 725 profils sur 1 060
prog rendu GLOBAL      873 creux                                 · 523 profils
```

**724 creux (45 %) sont produits par la remise à zéro de `prog`.** Les 873 restants viennent des
tables `(lo, hi)` qui changent de valeur d'une phase à l'autre — certains voulus (un type qui
cède la place au brick), d'autres non ; les séparer demande un balayage par type, non fait ici.

**(b) Le pic précoce — 283 profils sur 1 060 (27 %)** portent, pour au moins une discipline, leur
plus grosse séance AVANT le dernier tiers des semaines de charge, avec une fin > 20 % plus basse.
Par sport : tri 143 · duathlon 117 · swimrun 21 · trail 2. Par discipline : vélo 250 · nage 81 ·
course 15. ⚠ **Ce chiffre mélange deux choses et je le dis** : en tri/duathlon, la sortie longue
vélo cède DÉLIBÉRÉMENT sa place au brick en spec/pic (décision O-91, écrite) — l'essentiel des
250 cas vélo est donc attendu. Les 81 cas de NAGE et 15 de COURSE sont ceux qui méritent le
balayage par type, et c'est le même balayage qu'en (a).

**(c) `beginner` comme constante de plan** — déjà nommé dans CLAUDE.md au titre de la règle 20,
non re-mesuré ici.

## 5. Ce qui produit O-77 : mesuré par élimination, PAS ENCORE NOMMÉ

Quatre neutralisations à facteur unique, toutes sur `tri/70.3`, `vol_recent 9`, S1 :

```
état                                    vol_max 9   vol_max 13   écart
moteur intact                             82 min       51 min      −31
sessionScale forcé à 1                    82 min       51 min      −31   ⇒ ce n'est PAS lui
I14 (enforceLabelVsDose) neutralisé       82 min       51 min      −31   ⇒ ni lui
I14b (refillEasyAfterLabelCap) neutr.     82 min       51 min      −31   ⇒ ni lui
boucle de volume R3.3 neutralisée         75 min       51 min      −24   ⇒ elle n'en porte qu'un quart
```

Ce qui est ÉTABLI : la longue livrée à 51 min est **à son plancher de format** (`longRunCaps`
70.3 = `{lo: 50, hi: 100}`), et sous `sessionScale = 1` les blocs naissent identiques (sweetspot
77 = 77 mesuré) — donc la différence naît d'une passe qui redistribue **en amont de la boucle**,
pas de la construction ni du facteur d'échelle. Ce qui n'est PAS établi : laquelle. Le nommer
demande la bisection systématique des passes de redistribution, qui est le premier travail du
chantier — **et pas une hypothèse à écrire dans un rapport.**

## 6. Proposition de design — trois approches, avec leurs coûts mesurés

### Approche A — le patron existe déjà dans le dépôt : la borne positionnelle

Le moteur SAIT déjà faire progresser une borne avec la position. `swimSessionCapAtWeek(gate,
base, wkNum)` (O-56, `swimContinuity.ts:144`) est une fonction PURE qui prend un gate de plan,
une base et **la semaine**, et rend `base` quand il n'y a rien de mesuré à projeter. C'est le
patron : `sessionScale` devient `sessionScaleAtWeek(r, wkNum)`, et le module de sport reçoit la
valeur de SA semaine au lieu de celle du plan.

- **Coût** : les 7 modules de sport reçoivent la valeur par le kit (aucun ne la recalcule) — la
  signature ne change pas, c'est `buildSessions` qui résout. 1 fonction nouvelle, 1 champ de kit.
- **Risque** : la trajectoire choisie décide de tout. Une trajectoire naïve (linéaire de 0 à la
  valeur de plan) fait naître les semaines 1 minuscules et **la rampe R10 ne peut plus mordre**.
- **Ce qu'elle ferme** : la moitié « valeur de fin appliquée au début » — donc les 10/30 fenêtres
  de nage, et la sensibilité de la composition à `vol_max`. **Pas O-77 lui-même** (mesuré §5).

### Approche B — `prog` devient global au plan, la table `(lo, hi)` devient continue

Supprimer la dent de scie : `prog = (semaine − 1) / (semaines − 1)`, et les tables par phase
deviennent une trajectoire unique lo(début du plan) → hi(pic).

- **Coût mesuré, et il est rédhibitoire en l'état** : `audit:v1` passe à **3 violations DURES**
  (« saut > +25 % de volume réel entre semaines de charge », `tri/S/…/debutant`). C'est exactement
  le mode d'échec qui avait fait REFUSER la conversion d'unité d'O-35 : quand les blocs naissent
  petits, ils tombent sur leurs planchers et la progression devient un escalier.
- **Ce qu'elle ferme** : 724 des 1 597 creux de frontière (45 %).
- **Condition de faisabilité** : elle ne peut PAS être livrée seule. Il faudrait d'abord que les
  planchers de séance cessent d'être atteints en semaine 1 — c'est-à-dire l'approche A d'abord.

### Approche C — un GATE de monotonie, aucune ligne de moteur

Ne rien changer au dimensionnement ; ajouter un banc qui, pour chaque axe déclaré du schéma
(niveau, allure, volume, phase, position), vérifie que la sortie est monotone quand l'entrée
l'est. C'est la généralisation d'`audit:sensibilite` (R20.1) : **dérivé du SCHÉMA, aucune liste à
maintenir.**

- **Coût** : un banc, zéro risque de régression produit.
- **Ce qu'elle ferme** : aucune inversion — **mais elle rend impossible d'en introduire une
  cinquième sans le savoir**, et elle chiffre les quatre existantes en continu. C'est la seule
  approche qui adresse l'ABSENCE identifiée au §2.

### Recommandation

**C d'abord (il ne coûte rien et il mesure), puis A, puis B — et O-77 traité à part.** L'ordre
n'est pas de confort : B est mesurée infaisable sans A, et O-77 n'est réparé par aucune des
trois, puisque sa cause n'est pas encore nommée (§5). Le premier travail du chantier est donc la
bisection qui la nomme — un jour de mesure, avant toute conception.

## 7. Surface et découpage

```
sessionScale lu par        7 modules de sport + sessionLibrary + trailLibrary + registry + types
sites d'interpolation      tri 22 · duathlon 17 · bike 13 · swimrun 11 · run 11 · swim 10 · trail 12
prog calculé en            1 point (weekBuilder.ts:408) — et c'est une bonne nouvelle
corpus de non-régression   1 074 profils (golden), 12 gates
```

**Le chantier SE DÉCOUPE**, et mieux que celui du cycle de 10 jours : `prog` a un point unique de
calcul, `sessionScale` un point unique de dérivation, et les modules de sport ne font que les
CONSOMMER via une formule identique. Étapes livrables séparément :

1. **Le gate de monotonie** (approche C) — indépendant, aucun risque.
2. **La bisection qui nomme la cause d'O-77** — mesure seule, aucun code.
3. **`sessionScaleAtWeek`** (approche A) — rayon attendu large (tous les sports, tous les
   profils dont `vol_max` ne sature pas), donc à livrer seule, avec sa photo golden.
4. **La continuité de `prog`** (approche B) — seulement si 3 a effectivement décollé les
   semaines 1 de leurs planchers ; à re-mesurer avant, la mesure d'aujourd'hui la refuse.

## 8. Jugement honnête

- **Ce chantier ne fermera PAS les quatre inversions.** Trois sont déjà fermées par des correctifs
  sans rapport, et la mesure du §2 montre que le changement positionnel leur est orthogonal.
  Promettre l'inverse serait une inférence, pas un résultat.
- **Il ne fermera pas O-77 non plus, en l'état** — parce que la cause d'O-77 n'est pas celle que
  j'avais écrite, et qu'elle n'est pas encore nommée. Ce que le diagnostic apporte sur O-77 est
  une élimination (ni `sessionScale`, ni I14, ni I14b, ni les trois quarts de la boucle) et un
  fait dur : la longue est livrée à son PLANCHER de format.
- **Il fermera** : les 10/30 fenêtres de nage attribuables à `sessionScale`, et — si l'étape 4
  devient faisable — 45 % des creux de frontière de phase.
- **Il ne touchera pas** : les 8/30 fenêtres plates par conception (T-41) ni les 11 sprints
  (convergence documentée) — ce ne sont pas des défauts.
- **Le résultat le plus utile de cette fiche n'est aucun des quatre** : c'est que `prog` se remet
  à zéro à chaque phase, sur 1 060 profils, depuis l'origine du moteur V2, et que personne ne
  l'avait mesuré.

**Limites déclarées** : la mesure §4(b) mélange une substitution voulue (le brick prend le créneau
long) et un possible défaut, et je n'ai pas fait le balayage par type qui les sépare. La mesure
§4(a) ne dit pas lesquels des 873 creux résiduels sont voulus. Et le §5 est une élimination, pas
une identification.
