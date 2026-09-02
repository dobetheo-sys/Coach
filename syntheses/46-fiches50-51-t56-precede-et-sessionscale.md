# 46 — Fiches 50 et 51 : O-114 et O-115 fermés, O-113 reste ouvert sur une calibration
discontinue

**Date** : 01/09/2026 · **Fiches** : `50briefidempotencet56precede.md`, `51briefsessionscalepositionnel.md`

**Résultat en une ligne** : la fiche 50 est livrée intégralement (idempotence, puis bascule
« précède ») — **O-114 et O-115 sont fermés**. La fiche 51 est écrite, mesurée et **retirée** :
elle fonctionne, mais sa calibration est un tirage et la monnaie payée est la fréquence.

---

# FICHE 50 — T-56

## Tâche 1 — pourquoi T-56 n'était pas idempotente

### La contre-preuve d'entrée

Dupliquer l'appel de la garde par le harnais `casser` et comparer les empreintes du corpus :
**22 plans sur 1 074 changent à la seconde passe, tous en `tri/Full`**. Le chiffre de 23 relevé
au lot du plancher de décharge est confirmé.

### La cause, tracée sur `tri/Full/reprise/inter` S25 et S28

L'axe DISCIPLINE répartit la réduction **proportionnellement** : chaque séance de la discipline
se voit demander le même facteur `f = ref / total`. **Cette répartition suppose que chaque séance
peut payer.** Or la semaine porte une « Nage continue — 3 050 m d'affilée », **palier B-17
épinglé** : la distance EST le stimulus, le plan l'a ANNONCÉE, la passe refuse (à raison) d'y
toucher.

| | S25 |
|---|---|
| natation de la décharge | **116 min** |
| référence (charge voisine) | 112 min |
| dont « Nage continue » ÉPINGLÉE | **69 min, immobile** |
| seule séance qui peut payer | « Nage seuil (+dist) » |

La passe sous-livre exactement la part du protégé, et ne converge plus que **géométriquement** :
1 225 → 1 100 m au deuxième passage, 575 → 225 m en S28.

**Bornes croissantes, plans changés d'un cran au suivant :**

| borne | 1→2 | 2→3 | 3→4 | 4→5 | 5→6 | 6→8 | 8→40 |
|---|---|---|---|---|---|---|---|
| plans | **22** | 15 | 14 | 13 | 3 | 0 | **4** |

La queue ne se termine jamais proprement : **le mécanisme est faux, pas lent.**

### La famille

C'est **« protégé par le chemin, pas par la borne » dans l'autre sens.** D'habitude une protection
manque et une victime paie deux fois. Ici la protection est correcte, et c'est la **répartition**
qui suppose un payeur là où il y a un protégé.

## Tâche 2 — l'idempotence

**Correctif** : le facteur se calcule **sur les payeurs** (`discMin(w, true)`), c'est-à-dire
exactement la définition que le banc `lotPhysio` mesure déjà — le palier annoncé est hors champ
côté récup, référence normale côté charge (R11.1 : une seule définition).

**Mesuré après** : `1→2 · 2→3 · 3→4 · 4→8 · 8→40 = **0 plan**` — **un tour suffit.**

**Contre-preuve dans les deux sens** : sans le correctif payeur, un appel de plus change
**16 plans** ; avec lui, **2**.

La boucle de tours est CONSERVÉE avec une marge (`T56_TOURS_MAX = 4`, trois tours mesurés inertes)
parce que la réduction agit sur la dose du CORPS pendant que la référence se compte en minutes de
SÉANCE — l'échauffement ne rétrécit pas, une configuration future peut demander un second tour.
Elle sort dès qu'un tour ne bouge plus : quand plus personne ne peut payer, le résidu est
**structurel**, pas un défaut d'arbitrage.

## Tâche 3 — la référence bascule sur « précède »

L'auditeur (`recupHeavier`) et le gate de monotonie lisaient déjà la charge **précédente**. T-56
était la **seule** à prendre `max(av, ap)` : le générateur et l'auditeur ne disaient donc pas la
même chose. Les deux axes lisent désormais **une seule fonction** — les avoir écrits deux fois est
précisément ce qui a laissé la définition diverger sans que rien ne le signale.

### Résultat

| | avant | après |
|---|---|---|
| `audit:monotonie` | 24 verts · 4 dettes | **33 verts · 1 dette · 0 régression** |
| critères `MONO-*-phase` | 3 rouges (bike, tri, trail) | **les SEPT verts** |

**O-114** (trail, 145 inversions sur 60 profils sur 67) et **O-115** (vélo et tri, fiche 48)
avaient la MÊME cause et se ferment ensemble. Les trois causes qu'avait éliminées la fiche 48 à
facteur unique — C29d, le plafond de la semaine de récup, l'échauffement — l'étaient à raison :
ce qui restait était la DÉFINITION.

**Contre-preuve** : remettre `max(av, ap)` rougit exactement ces trois critères.

### Le banc encodait l'ancienne définition, et il l'a dit

T-56 est passé **rouge sur 16 « inversions »**. Ce n'était pas une différence de SÉVÉRITÉ mais de
**PORTÉE** : un type présent uniquement dans la charge **suivante** gardait un référent au banc et
n'en avait plus pour la passe (`REEL/tri/70.3` S32 « Nage récup courte » 2 625 pour 2 225 — la
référence venait d'une semaine pas encore faite). Aligné sur la définition décidée : **16 → 2**.

### Les 2 derniers sont structurels, et ils sont publiés

`B17/tri/M/inter` S6 (charge) porte **UN** footing de 34′ ; S7 (décharge) en porte **QUATRE** de
34′ — 136′ contre 34′. **Par TYPE les doses sont égales** : l'écart ne vient pas des doses mais du
NOMBRE de séances. Descendre à 34′ au total demanderait quatre footings de 8 minutes (sous le
plancher de dignité) ou d'en supprimer trois : la **FRÉQUENCE** serait la seule monnaie, et c'est
celle que ce dépôt s'interdit de dépenser (C29/C29b/C29c). Le défaut, s'il y en a un, est la
semaine de CHARGE qui ne court qu'une fois — même raisonnement que la branche « discipline absente
des charges voisines » écrite juste au-dessus. La classe est **comptée** dans la ligne « hors
champ », jamais tue.

**Contre-preuve de non-vacuité** : T-56 neutralisée, le banc rend **948 inversions de DISCIPLINE +
4 214 de TYPE** — la classe « fréquence » (1 245) n'est pas un fourre-tout.

### Mesure d'impact

| grandeur | résultat |
|---|---|
| volume total livré | méd **−0,5 %** · p10 −1,4 % · pire **−4,1 %** · **aucun profil au-delà de −10 %** |
| séances | 89 profils en perdent · 41 en gagnent · pire **−4 sur 204 (−2,0 %)** |
| rayon golden | **943 profils sur 1 074** (tri 195 · bike 156 · duathlon 151 · swimrun 137 · run 131 · swim 105 · trail 65) |

---

# FICHE 51 — `sessionScale` positionnelle : écrite, mesurée, RETIRÉE

Patch conservé dans **`sessionscale-positionnel.patch`**.

## Ce qui a été livré, et qui marche

`sessionScaleAtWeek(phases, weeks, wk, plein)` sur le patron de `capScaleAtWeek`, **point unique**
(le kit porte la valeur, aucun module de sport ne la recalcule ; le trail passe par la même
fonction), `plein` ne portant que ce qui reste légitimement multiplicatif — récupération dégradée
et facteur de charge blessure/âge (l'exigence §4 de la fiche), **jamais l'enveloppe déclarée**.

**Ça fonctionne** : `MONO-bike-vol_max` passe au vert, `audit:v1` reste à 0 sur 459.

## Ce qui l'arrête : la calibration est DISCONTINUE

Balayage du départ — profils perdant plus de **20 % de leur pic** :

| départ | 0,40 | 0,50 | 0,60 | 0,65 | 0,68 | **0,70** | **0,72** | 0,75 | 0,80 | 0,90 | 1,00 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| violations dures | **2** | **11** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| perte > 20 % | **0** | 14 | 20 | 19 | 14 | **2** | **40** | 28 | 21 | 17 | 17 |

**Un pas de 0,02 fait varier la casse d'un facteur vingt.** Ce n'est pas une courbe de
calibration, c'est un tirage — retenir 0,70 serait choisir un numéro de loterie, exactement la
faute que la règle 19 nomme (« quel est le correctif le moins coûteux qui ferait passer le
test ? »).

## La cause de la discontinuité, nommée

**La grandeur qui bouge n'est pas la TAILLE des séances mais leur NOMBRE.** À 0,72, **33 des 40
perdants perdent des séances** :

- `swim/ow/confirme/inter` : pic 240 → 170, séances **81 → 58** (−28 %)
- `G/tri/Full/vol-recent-bas` : pic 716 → 459, séances 180 → 154

La monnaie payée est la **FRÉQUENCE** — la seule que ce dépôt s'interdit de dépenser.

**Et l'agrégat ne le montre pas** : la médiane du pic est à **+0,0 %** à tous les départs. C'est
la faute de méthode publiée en fiche 48 (« l'agrégat cachait que 3 profils sur 1 060 perdaient
plus de 20 % de pic »), reproduite à l'identique si on s'y fie.

## Ce que la mesure d'entrée disait, et que la fiche n'anticipait pas

Distribution de `sessionScale` sur les 1 074 profils : **min 0,150 · p10 0,500 · médiane 0,700 ·
p90 0,900 · seulement 3,9 % à 1,000** (trail : médiane 0,526, max 0,769 — aucun à 1).

`capScaleAtWeek` remplaçait un **plafond** variant de 0,80 à 1,00. Ici on remplacerait un facteur
de **taille de naissance** valant 0,15 chez les plus contraints. **`sessionScale` n'est pas un
artefact positionnel comme `_capScale` : c'est un terme de CAPACITÉ.** Le supprimer donne à un
nageur débutant des blocs nés à pleine taille pour une semaine minuscule ; le point fixe ne peut
plus les placer et paie en séances.

## Ce qui reste à trancher — votre décision

Deux issues, toutes deux hors du périmètre de cette fiche :

1. **Borner la trajectoire positionnelle par ce que la semaine peut CONTENIR** — mais lire le
   contenu livré pour borner la naissance est exactement la forme qu'**O-43** interdit (« une
   sortie calculée ne se relit jamais comme une entrée »).
2. **Borner le RECEVEUR élastique** — la sortie longue (R4.1), qui est l'endroit où la croissance
   atterrit et donc où l'inversion se matérialise. Ça déplace le chantier vers la progression.

**O-113 reste OUVERT**, cause nommée, correctif écrit-mesuré-retiré avec ses chiffres.

---

# Mes fautes d'instrument, publiées

1. **La pièce a atterri sur le mauvais `discMin`.** Il en existe deux dans `planGenerator.ts` ;
   mon remplacement a pris le premier — celui de `enforceDechargePlancher` — laissant T-56
   intacte et produisant un `ReferenceError` sur tous les profils tri.
2. **Ma sonde avalait les erreurs moteur en « REFUS ».** Résultat : « 0 plan changé » entre toutes
   les variantes — un zéro qui était de la **vacuité**, pas de la convergence (323 profils
   sortaient en erreur). La sonde lève désormais et distingue un refus TYPÉ d'une erreur.
3. **Ma première contre-preuve d'idempotence mesurait la COMPOSITION, pas la passe** : le second
   appel changeait l'état AVANT C29d, dont la sortie changeait à son tour ce que le troisième
   appel voyait. Le test propre est de dupliquer le DERNIER appel.
4. **Ma calibration annonçait « le pire cas converge en 4 tours »** — une supposition. Le balayage
   l'a réfutée (6), et le commentaire porte désormais les chiffres.
5. **Deux versions d'une borne « ne pas tenter une coupe qu'un plancher restaurera »**, écrites et
   retirées : l'abstention (25 inversions) puis le plancher sur la cible (23) — **les deux pires
   que l'état de référence** (2). Le plancher sommé surestime le minimum atteignable.

---

# État des gates

| gate | résultat |
|---|---|
| `npm run batterie` | **13 gates verts · 0 rouge** |
| `audit:v1` | 459 combinaisons · **0 violation dure** |
| `audit:monotonie` | **33 verts · 1 dette déclarée · 0 régression · 1 628 comparaisons** |
| `lotPhysio` | **33 verts · 24 rouges attendus · 0 régression** |
| `golden:verify` | recapturé — **943 profils sur 1 074** |

La dette restante du gate de monotonie est `MONO-bike-vol_max` (**O-113**), déclarée avec sa cause
et le résultat du correctif retiré.
