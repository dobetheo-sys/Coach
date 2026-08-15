# §3 — LA RÉALLOCATION N'EXISTE PAS, ET LA COUPE COÛTE PLUS QUE CE QU'ELLE RETIRE

**Le vrai livrable du lot**, comme tu l'avais prévu. Ton hypothèse est confirmée, et le chiffre
est pire que l'énoncé.

## La mesure

**Isolation stricte** : le MÊME profil, sous deux plafonds de temps dur — 60 min (le plafond
réel) et 600 min (inatteignable, donc « sans plafond »). Rien d'autre ne change : ni
l'historique, ni la cadence de récup, ni le volume déclaré. La sonde était un override
temporaire de `hardTimeCapMin`, **retiré après mesure** (`src/` est vérifié identique, audit
459 vert).

*(Ma première tentative comparait `reprise` et `confirme` pour obtenir deux plafonds : elle
change AUSSI `HISTORY_CAPS` et `RECUP_EVERY`. Elle rendait « partielle » partout, ce qui ne
voulait rien dire — trois grandeurs bougeaient ensemble.)*

### Le témoin du §3 — `semi/inter/4:30`

| plafond de dur | pic livré | facile | dur (pondéré) | sortie longue |
|---|---|---|---|---|
| 600 (sans plafond) | **386 min** | 310 | 76 | 130 min |
| 60 (le vrai) | **365 min** | 300 | 65 | 126 min |
| **effet du plafond** | **−21 min** | **−10** | **−11** | **−4** |

Le plafond retire **11 minutes de qualité, et la semaine en perd 21**. Non seulement rien ne
remplace ce qui est retiré — **la coupe emporte 10 minutes de facile avec elle**.

### Sur les 949 profils

| | |
|---|---|
| profils où le plafond retire du dur | **44** |
| dur retiré, total | 8 097 min |
| volume perdu, total | **13 009 min** |
| ratio volume perdu / dur retiré | **médiane 1,27 · moyenne 1,61 · max 2,43** |
| profils où le volume perdu dépasse le dur retiré | **28 / 44** |
| pire cas | `PW/tri/S/plat` : dur −440 min → **volume −1 068 min** |

## Le verdict

**Il manque une règle de réallocation, et c'est un défaut à part entière** — exactement la
branche que ton §3 désignait. Mais le chiffre dit plus : le mécanisme ne se contente pas
d'oublier de remplacer, il **amplifie**. Retirer une minute de qualité coûte en moyenne 1,6
minute de semaine.

La cause est mécanique et se lit dans l'ordre des passes : `enforceHardTimeCap` retire des
répétitions, le total de la semaine baisse, puis le point fixe (C22, « dev ≤ pic », le lissage
sur le LIVRÉ) recale les semaines voisines sur ce total plus bas, et la sortie longue — bornée
en part de semaine — suit. Une seule coupe se propage.

**Physiologiquement, c'est à l'envers**, et ta formulation est la bonne : un entraîneur qui
retire une séance de qualité la remplace par de l'endurance de durée au moins égale. Ici, la
séance tombe et la semaine tombe avec elle.

## Ce que ça implique pour la suite

1. **B-02c (plafond proportionnel) reste gaté**, et cette mesure en est la deuxième raison :
   tout resserrement de C26, par quelque chemin que ce soit, produira les mêmes régressions
   tant que la coupe amplifie. Ce n'est pas propre à 12 % — c'est propre au mécanisme.
2. **Le ticket de réallocation est plus important que le calibrage** : `enforceHardTimeCap`
   doit RENDRE en facile ce qu'il retire en dur (le patron existe déjà dans le dépôt —
   `refillEasyAfterLabelCap` fait exactement ça pour I14b, et C30b redistribue en restant
   neutre en volume).
3. **Il touche 44 profils sur 949 aujourd'hui**, mais il gouverne tout resserrement futur.

**Non écrit** : la règle de réallocation elle-même. Elle change le volume livré de 44 profils
et son plancher (« au moins égale » ? « exactement égale » ?) est un arbitrage d'entraînement,
pas une évidence — et c'est le genre de décision que ce chantier a appris à ne pas prendre à ta
place.

---

# La règle « exactement égale » — ÉCRITE, MESURÉE, PUIS RETIRÉE (14/08, soir)

## Ce qui a été écrit, exactement comme spécifié

- `enforceHardTimeCap` retourne ce qu'il a retiré, **par semaine** ;
- l'appelant nourrit `_labelCut` et rappelle **`refillEasyAfterLabelCap`** — le patron existant,
  aucun second mécanisme (§4) ;
- la restitution passe **AVANT le point fixe** (§1.3a) ;
- sa borne est paramétrée : le plancher devient `total(avant) + coupé`, une **ÉGALITÉ**, là où
  I14b bornait à la courbe déclarée — bonne borne pour I14b, fausse ici, la semaine ayant EXISTÉ
  à ce volume une milliseconde plus tôt (§1.2) ;
- **le manque est DIT** (§1.3b) : décision `B-02` nommant les minutes non restituées, avec le
  bloqueur mesuré — `st.bnd.cap`, le plafond de bloc déclaré (R20.3/O-8). Sur `PW/tri/S/plat`,
  la receveuse est à 55 min pour un plafond de séance à 88, mais son BLOC est déjà à sa borne.

## Ce que ça donnait

| | avant la règle | après |
|---|---|---|
| restitution, par semaine | 0 | **~50 %** (ex. coupé 8 min → rendu 4) |
| `C30-A` — sortie longue | référence | **3 hausses, 1 baisse (−1 min), 13 inchangées** ; `10k/debutant/7:00` **64 → 81 min** |
| `audit:v1` · invariants · v6 | vert | vert (73/0 après ré-épinglage de C30-A) |

`10k/debutant/7:00` gagnant 17 minutes de sortie longue est exactement la population que C30
existe pour servir : la règle produit l'effet que ton §3 décrivait.

## ⚠ Pourquoi elle est retirée : elle pousse un leg de brick au-dessus de sa borne auditée

`audit:v2` passe au rouge sur **2 combinaisons duathlon** (`duathlon/S/ancien/debutant`,
intentions `finir` et `plaisir`) : « brick vélo hors bornes format ».

**Mesure décisive**, même profil, un seul facteur :

| | pire leg vélo de brick |
|---|---|
| avec la réallocation | **95 min** |
| sans | **79 min** |
| borne auditée C21b (`S`) | **90 min** |

Et je ne sais pas encore par quel chemin. Le brick est explicitement EXCLU des receveuses
(`!sx.brick`), les deux tables concordent (`DUA_BIKE.S = {45, 90}` = `BRICK_BIKE_BOUNDS.S`),
`blockBounds` plafonne bien à 90 pour ce cas, et `brickRF` vaut 1 pour un `ancien`. Quelque
chose fait grandir ce bloc après le dernier clamp, et je n'ai pas identifié quoi.

**Deux corrections écrites en cherchant, gardées pour la reprise** : le plafond de bloc du leg
vélo de brick lisait `CAP_BRICK_BIKE` seul et ignorait la borne HAUTE auditée (le plancher, lui,
lit déjà la borne basse depuis C21b) — le générateur pouvait donc produire ce que l'auditeur
refuse, la moitié manquante de C21b. Elle ne suffit pas ici, le bloc n'étant pas clampé du tout.

**Décision** : je ne livre pas un lot qui rend `audit:v2` rouge. `src/` garde **la pondération
seule** (73 verts, 0 régression, tous les gates verts) ; la réallocation attend d'avoir sa
cause. C'est le même arbitrage que ce matin sur `sw.aero` et cet après-midi sur le plafond
proportionnel : la mesure prime sur l'envie de finir.

**Reprise proposée** : instrumenter la croissance de ce bloc (quelle passe l'augmente, entre le
dernier clamp et la sortie) avant de reposer la règle. C'est un travail de trace, pas de
conception — la règle, elle, est écrite et mesurée bonne.

---

# LA CAUSE — §1 A SUFFI, ET CE N'ÉTAIT PAS UNE PASSE POSTÉRIEURE (15/08)

## §1 : le raccourci a répondu NON, et c'est ce « non » qui a désigné la bonne piste

Ton §1 demandait une ligne : `95 / 79 = 1,2025` — le total de la semaine grandit-il d'autant ?

| `duathlon/S/ancien/debutant/finir`, semaine 6 | sans réallocation | avec | ratio |
|---|---|---|---|
| total de la semaine | 208 min | 222 min | **×1,067** |
| leg vélo du brick | 81 min | 144 min | **×1,778** |

**Non proportionnel, et de très loin** : le total prend 6,7 % pendant que le bloc prend 78 %. Ce
n'est donc pas un rééchelonnement — `sessionScale` est innocenté, et aucune passe postérieure
n'était en cause. **Quelque chose VERSE dans ce bloc**, directement.

*(Le chiffre du bloc est plus gros que les 95 min du rapport ci-dessus : ma sonde d'aujourd'hui
fixe `pace` et `doubles`, que le balayage v2 laisse à leurs valeurs de base. Le mécanisme est le
même, il mord plus fort.)*

## La bisection du §2 n'a pas eu lieu : une seule sonde a suffi

Le §1 disant « quelque chose verse », il n'y avait plus qu'à regarder QUI verse dans une sortie
longue. Une impression de la semaine 6 a rendu le verdict :

```
S6 Brick R1 → vélo (pré-fatigue)   min=91  long=true  brick=true
      role=body leg=run   zone=rn.mara  dur=10  bnd=-
      role=body leg=bike  zone=bk.z2    dur=81  bnd=-
```

**En duathlon, le brick EST la sortie longue de la semaine.** Et le tail O-21 de
`refillEasyAfterLabelCap` — « s'il reste à rendre, c'est la sortie longue qui le prend » — la
cherche par `all.find(sx => sx.long && !sx.race)`. Il n'excluait pas le brick, alors que la liste
des receveuses juste au-dessus l'exclut depuis I14b (`!sx.brick`). Le leg course étant en zone de
qualité (`rn.mara`), le leg VÉLO restait le seul bloc de corps éligible : tout le reliquat y est
allé.

**Second maillon, plus général** : ce tail borne par `st.bnd ? st.bnd.cap : Infinity`. Or les
steps d'un brick ne PORTENT pas de `bnd` — leurs bornes sont calculées à la demande par
`blockBounds()` (branche `s.brick`), qui n'est pas atteignable depuis ce point de convergence.
« Borne inconnue » était donc traité comme « borne absente », c'est-à-dire **aucun plafond**.

## Ce que la mesure a tranché, et ce qu'elle a interdit de corriger

Sur 378 combinaisons, compteurs posés dans le tail :

| | sans réallocation | avec |
|---|---|---|
| tail O-21 déclenché | 242 | 346 |
| … dont la longue est un BRICK | **0** | **10** |
| … dont le plafond est INFINI | **0** | **10** |

**Le trou existe dans le code livré ; il était seulement hors de portée.** La réallocation ne le
crée pas, elle lui donne assez de minutes à placer pour l'atteindre — et les deux conditions sont
parfaitement corrélées sur ces 10 cas.

**Et la même mesure a interdit le correctif symétrique.** Le réflexe était d'appliquer « pas de
`bnd`, pas de remplissage » aux DEUX boucles. Mesuré sur la boucle des receveuses : **66 des 66
steps remplis aujourd'hui n'ont pas de `bnd`** — la règle y supprimerait la restitution d'I14b en
entier. L'asymétrie est réelle et c'est elle qui décide : la boucle des receveuses est dominée par
`plafondFacile` (R20.3, au niveau de la SÉANCE), le tail n'a **rien** au-dessus de lui. Un même
`Infinity` est inoffensif à un endroit et porteur à l'autre.

## Le correctif, et ses deux barrières sont indépendamment suffisantes

1. le tail exclut le brick, pour la raison qui l'exclut déjà des receveuses — une séance
   structurée dont les deux legs portent des bornes de format n'est pas un réservoir de volume ;
2. le tail s'abstient sur un bloc qui ne DÉCLARE pas de plafond — une passe qui remplit n'invente
   pas de borne. Mesuré : les 242 déclenchements actuels portent tous un `bnd`, donc l'abstention
   ne retire rien à l'existant.

**Contre-preuve dans les trois combinaisons** (§11) : retirer (1) seul → `audit:v2` **vert** ;
restaurer `Infinity` seul → **vert** ; retirer les deux → **3 combinaisons `duathlon/S` rouges**.
C'est donc de la défense en profondeur, et c'est écrit dans le code : sans cette phrase, quelqu'un
retirera « la redondante » en croyant simplifier.

## Ce que la règle livre

| | |
|---|---|
| `audit:v2` | **vert, 594** (le blocage est levé) |
| golden | **189 profils sur 949** — dont **150 `volPeak` en HAUSSE, 0 en baisse** (+0,50 h/sem en moyenne, +1,40 h au pire) |
| part facile | 24 semaines en hausse, 3 en baisse ; `easyPct` 83 → 84, 77 → 78 |
| `C30-A` | quatrième état épinglé : `10k/debutant/7:00` **64 → 81 min** de sortie longue |
| effet de bord non visé | **T-25 : 608 → 509 identités cassées** — rendre à la semaine ce qu'on lui prend rapproche `volPeak` de `min(plafonds)` |

La direction est celle qu'annonçait ton §3 : le plan devient **plus facile et plus long**, jamais
plus dur. Aucun plan ne dépasse sa courbe déclarée — la cible de restitution est le total d'AVANT
la coupe, qui était déjà sous la courbe.

## Ce que ça laisse ouvert

`corps[0].bnd ? … : Infinity` et son jumeau `capSeance` (ligne 1246, `Number.MAX_SAFE_INTEGER`)
sont deux occurrences d'une même classe : **le générateur possède un résolveur de bornes
(`blockBounds`) que ses passes tardives ne peuvent pas appeler, faute de fermeture commune.** Le
correctif d'aujourd'hui contourne le symptôme (s'abstenir) sans traiter la cause (rendre la borne
lisible d'un seul endroit). C'est **T-28**, et le §4 de ton document a raison de le vouloir en
balayage plutôt qu'en correctif ponctuel.
