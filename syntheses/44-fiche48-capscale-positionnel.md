# Fiche 48 — `_capScale` s'ancre sur la POSITION : O-77 est fermée

**Date : 01/09/2026.** Décision du fondateur : ancrer sur la position, patron
`swimSessionCapAtWeek`. Livré, mesuré — **et la valeur évidente du seul paramètre libre était
fausse, avec des conséquences dures.**

---

## 1. Deux prémisses de la fiche rectifiées avant d'écrire

- **« Remplace les usages de `_capScale` dans les 7 modules de sport (via le kit) »** — aucun
  module ne la lit. `_capScale` est une variable LOCALE de `planGenerator`, lue en **un seul
  point** (`blockBounds`) et posée en trois (la boucle de semaines + les deux sondes de
  capacité). Le changement est donc bien plus contenu que la fiche ne le suppose.
- **« `_capScale` retirée, pas laissée en code mort »** — elle est le TRANSPORT (la boucle la
  pose, `blockBounds` la lit) ; ce qui change est sa DÉRIVATION. La retirer demanderait de
  threader la position dans une demi-douzaine de signatures, ce que le commentaire d'origine dit
  déjà avoir refusé.

## 2. La trajectoire n'est pas inventée : elle est mesurée

Balayage de l'ANCIEN facteur par position sur les 1 060 profils (0 = première semaine de charge,
1 = première semaine de pic) :

```
p       0,0   0,1   0,2   0,3   0,4   0,5   0,6   0,7   0,8   0,9   1,0
ancien  0,40  0,46  0,51  0,58  0,62  0,75  0,80  0,90  0,95  0,98  1,00
```

La médiane en semaine 1 vaut **0,400 — le plancher du clamp**. La trajectoire 0,40 → 1,00 existait
donc déjà ; ce qui variait avec l'ambition, c'était *où* chaque athlète tombait dedans.
`capScaleAtWeek(phases, weeks, wk)` la rend explicite et positionnelle : interpolation linéaire du
DÉPART au plafond plein, atteint à la **première semaine de PIC** (toutes les semaines de pic la
gardent), avec repli sur la dernière semaine avant l'affûtage quand il n'y a pas de phase de pic.

**L'affûtage garde sa branche, délibérément** (limite déclarée) : `Lw` y est la DESCENTE elle-même
(R3.13/Bosquet), donc déjà positionnelle ; R13.6 existe précisément parce que la formule des phases
de charge y était fausse, et le gate de monotonie ne regarde pas l'affûtage.

## 3. Le départ : la valeur évidente était fausse, et la mesure l'a dit brutalement

Reprendre le plancher de clamp de l'ancienne formule (0,40) semblait le choix sans risque — « aucun
nombre nouveau ». **Mesuré, il casse trois profils et met `audit:v1` à 3 violations DURES.**

```
départ    audit:v1        ancre O-69      volume corpus     longue de S1 (9 h · 13 h)
0,40      3 DURES          19 / 47          116 310 h              40 · 40
0,60      (non retestée)   15 / 47          117 212 h              60 · 60
0,80      0                15 / 47          117 735 h              80 · 80      ← RETENU
avant le lot   0           15 / 47          116 669 h              82 · 51      ← l'inversion
```

**Le mécanisme, mesuré** : des plafonds bas en début de plan font des semaines petites, et C22
(+10 %/semaine) propage la famine jusqu'au pic. Sur la fixture d'audit `tri/70.3/reprise/inter`,
le pic tombait de **499 à 266 min**. C'est exactement le risque que le diagnostic (fiche 46 §6)
avait prédit — et il se réalise plus violemment que prévu, parce qu'il ne s'arrête pas à la
semaine 1 : il se propage.

**0,80 est la plus petite valeur balayée qui rende `audit:v1` vert ET l'ancre O-69 à son compte
d'avant le lot.**

**⚠ Le compromis, déclaré** : à 0,80 la trajectoire est PLATE (0,80 → 1,00). Le plafond de séance
devient un GARDE-FOU plus qu'un moteur de progression — celle-ci vient de la courbe C22 et des
trajectoires propres des modules (`prog`, `progCap`). Rendre de l'amplitude au début du plan
demanderait de redescendre le départ, donc de relâcher l'ancre O-69 : c'est un arbitrage, pas un
réglage.

**Une faute de méthode à moi, publiée** : j'ai d'abord calibré le départ sur l'ancre R10 **sans
avoir mesuré le volume de RÉFÉRENCE du corpus**. C'est ce chiffre manquant qui aurait montré tout
de suite que 0,40 ne coûtait « que » 0,3 % en agrégat — et l'agrégat cachait la vérité : seuls
**3 profils sur 1 060** perdaient plus de 20 % de leur pic, mais c'étaient exactement les trois
qui violaient l'auditeur. Un agrégat qui bouge peu peut cacher une régression dure (règle 21).

## 4. Résultats mesurés

**Cas de référence (`tri/70.3`, `vol_recent` 9, S1)** — la cible de la fiche :

```
                    vol_max 9    vol_max 13    écart
avant le lot          82 min        51 min      −31     ← O-77
après                 80 min        80 min        0     ✓ FERMÉE
```

**Axe `history` en swimrun** (fiche 47) : `MONO-swimrun-history` passe de dette déclarée à
**VERT** — l'inversion est fermée, comme prévu par l'attribution de la fiche 47.

**Gate de monotonie** : `MONO-tri-vol_max` **VERT** · `MONO-swimrun-history` **VERT** ·
24 verts · 4 dettes déclarées · 0 régression · 1 628 comparaisons.

**Rampe R10** : 15 profils sous l'ancre sur 47 — **identique à l'état d'avant le lot**. Volume
total du corpus 116 669 → 117 735 h (+0,9 %).

**Rayon golden : 877 profils sur 1 074**, tous sports (tri 206 · run 158 · swimrun 140 · swim 139 ·
duathlon 127 · bike 107) — rayon large, comme le diagnostic l'annonçait : la trajectoire touche
tout profil dont l'enveloppe ne sature pas `sessionScale`. Pics : **4 profils perdent > 20 %,
12 en gagnent > 20 %** (jusqu'à +124 % sur `swim/demifond/ancien/debutant`).

## 5. Trouvé en chemin, corrigé : une borne `hard` cédait par le bas

Le brick d'affûtage du tri sortait à **19 min pour un plancher AUDITÉ C21c de 30** — violation
dure. Mécanisme : `bnd.hard` protégeait le PLAFOND de la mise à l'échelle (« une règle du
manifeste »), mais le PLANCHER passait par `plancherDeDignite`, qui le fait céder au plafond en
décharge (O-82). **La borne tenait donc par la VALEUR du facteur d'échelle, pas par elle-même** —
« protégé par le chemin, pas par la borne », la famille déjà fermée onze fois ici. `bnd.hard`
protège désormais les deux côtés, et la borne du brick d'affûtage est déclarée `hard`.

## 6. Signalé, non corrigé — O-115

La trajectoire introduit **deux inversions de position** : en décharge, une séance dépasse la même
séance de la charge voisine (« Endurance facile » 76 contre 66 en vélo ; « Footing facile » 38
contre 32 et « Nage récup courte » 33 contre 26 en tri). T-56 ne les rattrape pas.

**Trois causes éliminées par neutralisation à facteur unique** : ce n'est pas C29d (neutralisée :
les régressions restent identiques), pas le plafond de la semaine de récup (la pièce a été écrite,
mesurée sans effet, puis RETIRÉE — pas de changement non mesuré laissé dans le moteur), pas un
artefact d'échauffement.

**Et cette dernière élimination a corrigé mon propre banc** : le critère de phase comparait
`s.min` (échauffement compris) quand T-56, qui DÉTIENT la propriété, compare la DOSE DU CORPS —
deux grandeurs pour une propriété, R11.1 commis dans le banc qui surveille R11.1. Aligné ; le
verdict n'a pas changé, ce qui rend l'inversion d'autant plus réelle.

Porté en dette déclarée avec son attribution. Aucune violation dure. **O-113** (résidu vélo) et
**O-114** (récup trail) restent hors périmètre, comme la fiche le demande.

## 6bis. Ce que la batterie a trouvé — dont une régression de SÉCURITÉ

Cinq gates rouges au premier passage complet. Une seule était grave, et elle a produit un
correctif de fond.

**`B1` (banc v6) — « déclarer une blessure ne doit JAMAIS augmenter la charge » : ROUGE.** Sur
`swim/ow`, déclarer une ÉPAULE donnait **+2,4 % de volume** (2 151 → 2 320 min) alors que le sain
en perdait 10 (2 514 → 2 265) : le signe s'était inversé.

**Cause, et elle est structurelle** : `loadFactor` (blessure/âge) multiplie `peakH` depuis
R6.2/R6.3, donc les cibles de semaine. L'ancienne dérivation par `Lw = cible/peakH` était un
RAPPORT — aveugle à lui, mais le plancher O-69 (qui ne se réduit PAS avec la blessure) relevait
`Lw` et donnait déjà au blessé des plafonds plus hauts. Une trajectoire purement positionnelle est
aveugle autrement : elle donne au blessé exactement les mêmes plafonds qu'au sain. **Le facteur
s'applique donc aussi au plafond de séance, par la MÊME constante** — ce qui est la lecture
juste : un athlète dont on réduit le volume doit voir ses plafonds de séance descendre avec.

⚠ **La marge reste à publier plutôt qu'à taire** : après correctif, `swim/ow` blessé est à
**+1,3 %** du sain (le seuil du critère est 2 %). Avant le lot il était à **−14,4 %**. La garde
passe, la marge s'est amincie — à surveiller.

**Les quatre autres sont des CLIQUETS, ré-épinglés avec leur cause**, jamais exemptés :

```
C30-A (v6)    69 → 83 · 69 → 85 · 69 → 90 min   trois profils 10 km : la sortie longue atteint
                                                enfin la durée de la course — la direction que
                                                C30 existe pour servir ; les trois convergent
                                                vers 90, le plafond de FORMAT (ce n'est plus la
                                                règle qui borne, c'est la table)
T-27 (sceau)  S1 4→2 · S4 348→323 · S5 191→169  ils DESCENDENT : moins de semaines livrent une
                                                séance au-dessus de leur sortie longue, moins de
                                                plans culminent hors chaîne R20.2. Un cliquet qui
                                                baisse se ré-épingle comme un cliquet qui monte
T-35          pic 1,1 → 1,7 h · 5 → 6 jours     le nageur débutant en reprise cesse d'avoir des
                                                séances écrasées dès la semaine 1 — exactement la
                                                population que la fiche 46 signalait
T-48          VO2 8 876 → 8 896 min             la nage seuil récupère 7 579 m ; la composition ne
              nage seuil 444 401 → 451 980 m    s'INVERSE pas, c'est l'ampleur qui bouge
```

## 7. Acceptation

- `capScaleAtWeek` livrée, point unique, pure ; `_capScale` reste le transport (prémisse de la
  fiche rectifiée, §1).
- Mesures avant/après publiées : cas de référence, axe swimrun/history, corpus, rampe R10.
- `npm run audit:monotonie` : les deux critères visés **verts**.
- Rampe R10 **non cassée** (15/47, identique à la référence).
- `golden:verify` : rayon **877/1074** publié, tous sports.
- `audit:v1` **459 à 0**, **batterie 13/13 verte** en fin de passe (dont le gate de monotonie).
