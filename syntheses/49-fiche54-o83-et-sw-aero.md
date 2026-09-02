# 49 — Fiche 54 : diagnostic O-83, et résumé de l'arbitrage V-08 / B-02a

**Date** : 02/09/2026 · **Fiche** : `54briefdiagnostico83resumev08.md` · **Aucune ligne de moteur
écrite** — diagnostic et résumé.

---

# TÂCHE A — O-83 : les séances de nage à 15 minutes

## A.0 — Ce que la mesure change au ticket, avant toute analyse

Le ticket (écrit sur 985 profils) annonce **92 profils, TOUS `debutant`**. Re-mesuré aujourd'hui
sur les **1 060 profils** du corpus courant :

| population | n | séance moyenne (méd) | semaine (méd) | sous le critère O-83 |
|---|---|---|---|---|
| **swim / debutant** | 38 | **15,5 min** | 79 min | **38 (100 %)** |
| **swim / inter** | 65 | 27,3 min | 160 min | **22 (34 %)** |
| **swim / avance** | 37 | 25,3 min | 140 min | **18 (49 %)** |
| tous les autres sports | 885 | 53 à 96 min | 224 à 438 min | **0 (0 %)** |

**Deux rectifications :**

1. **Le total est 78, pas 92** — le moteur a bougé depuis l'écriture du ticket (les lots O-44,
   O-56, B-17 et le plancher de fréquence ont tous touché la natation).
2. **Ce n'est PAS limité aux débutants.** **40 profils non-débutants sur 102** sont sous le
   critère. Le ticket dit « TOUS `debutant` » ; c'était vrai de la population la plus extrême,
   pas de l'ampleur. La frange intermédiaire existe, et elle représente **la moitié** des cas.

**Ce qui est confirmé** : le phénomène est **strictement confiné à la natation**. Zéro profil dans
les six autres sports.

## A.1 — La chaîne, tracée sur `swim/demifond/ancien/debutant/competition`

Profil : **10 h déclarées · 6 séances · CSS 1:55 · niveau débutant · demi-fond**.
Plan livré : 10 semaines de **64 · 68 · 39 · 73 · 81 · 39 · 87 · 95 · 101 · 55 min**, en séances
de **12 à 22 min**.

Les décisions que le moteur émet, dans l'ordre :

| règle | fichier:ligne | valeur | justification déclarée |
|---|---|---|---|
| `C15` (pic) | `constraintMatrix.ts:146` | pic ≤ **4 h** | « la technique borne le volume, pas l'historique (risque épaule) » |
| `C15` (séance) | `constraintMatrix.ts:144` | **850 m/séance** | « technique avant volume, risque épaule » |
| `C24b` | `constraintMatrix.ts:218` | **600 m** plancher | « une séance piscine débutant <600 m ne vaut pas le déplacement » |
| `C20` | `constraintMatrix.ts:145` · `reasoningEngine.ts:517-524` | `sessions_max × 0,42 h` = **2,5 h** | « une séance C15 ≈ 25 min : promettre plus serait mentir » |
| `V2.1` | `reasoningEngine.ts:526` | abaisse à **2,2 h** | « les plafonds de séance ne permettent pas plus » |
| `O-44` (plancher de durée) | `constraintMatrix.ts:186` | **20 min** | « sous ~20 min d'eau, le déplacement coûte plus que la séance ne rapporte » (déclaré PANSEMENT) |
| détente `swimCapDebutantM` | `planGenerator.ts:2174-2181` | relève le plafond en TEMPS **si** 850 m coûte déjà ≥ 20 min | « le plafond suit le TEMPS quand la fenêtre est dégénérée » |

### L'arithmétique de la bande, pour CE nageur (CSS 1:55)

```
  C24b plancher  600 m  →  12,9 min
  C15  plafond   850 m  →  18,2 min
  C20  promet    25 min/séance  →  38 % de plus que C15 n'autorise
  O-44 plancher  20 min →  932 m,  AU-DESSUS du plafond C15
```

**Deux contradictions arithmétiques, toutes deux entre une borne en TEMPS et une borne en
MÈTRES :**

- **C20 promet 25 min par séance quand C15 en rend 18 au maximum.** La justification écrite de
  C20 — *« une séance C15 ≈ 25 min »* — n'est vraie que pour un nageur à **2:56/100 m**. Le corpus
  déclare 1:55 à 2:25.
- **Le plancher de durée O-44 (20 min) exige 932 m, que C15 interdit.** C'est un plancher
  strictement supérieur à son plafond — la contradiction exacte qu'O-81 a fermée pour le footing
  et que **T-52 garde**… mais T-52 compare des minutes à des minutes : ici les deux bornes sont
  dans des unités différentes, et **la garde ne les voit pas**.

## A.2 — Ce qui se passe si chaque règle cède SEULE

Expériences à facteur unique (harnais `casser`), mesurées sur les 38 profils débutants :

| mutation | séance méd | semaine méd | verdict |
|---|---|---|---|
| **état actuel** | **15,5 min** | **79 min** | — |
| C15 : 850 → 1 400 m | **17,9** (+2,4) | **103** (+30 %) | le défaut **se déplace**, il ne disparaît pas |
| C24b : 600 → 400 m | 15,0 (−0,5) | 89 (+13 %) | **aggrave la séance** : plus de séances, plus courtes |
| C20 : 0,42 → 0,70 h | 15,5 | 79 | **INERTE** |
| O-44 : plancher 20 → 12 min | 15,5 | 79 | **INERTE** |
| pic débutant : 4 → 8 h | 15,5 | 79 | **INERTE** |
| la détente `swimCapDebutantM` s'applique toujours | **17,5** (+2,0) | **101** (+28 %) | `audit:v1` reste vert ; le défaut se déplace |

**Trois règles sur six sont mesurées INERTES**, et cela réfute une partie du récit du ticket :

- **C20 n'est pas une contrainte du plan livré, c'est une ANNONCE.** Elle fixe la promesse à
  2,5 h, puis V2.1 la redescend à 2,2 h en mesurant les plafonds de séance. Relever C20 ne change
  rien parce que V2.1 la redescend au même endroit.
- **Le plancher de durée O-44 ne s'applique nulle part** (le ticket O-44 est « fermé sur la
  mesure, non livré ») : la constante n'alimente que la détente `swimCapDebutantM` et un
  compteur d'affichage.
- **Le pic débutant (4 h) ne mord pas** : le plan livré vaut 1,3 h, très en dessous.

## A.3 — La cause dominante, et elle est unique

**C15 (850 m) est la seule borne qui agisse.** Deux mesures le prouvent :

**(1) La taille de séance ne dépend pas du nombre de créneaux.** À volume déclaré identique :

| `sessions_max` | séances livrées | **séance moyenne** | semaine |
|---|---|---|---|
| 2 | 2,0 | **16,8 min** | 34 min |
| 3 | 3,0 | **16,9 min** | 51 min |
| 4 | 3,2 | **17,8 min** | 57 min |
| 6 | 5,2 | **17,9 min** | 93 min |
| 8 | 5,2 | **17,9 min** | 93 min |

Réduire la fréquence **n'allonge pas les séances** : la semaine rétrécit proportionnellement.
La séance est une **constante de l'athlète** (850 m ÷ son allure), et la semaine est cette
constante × le nombre de créneaux. **Le volume n'est pas réparti : il est le produit.**

**(2) Le volume déclaré n'entre pas dans le calcul.** Même profil, `sessions_max` fixé à 6 :

| `vol_max` déclaré | séance moyenne | semaine livrée |
|---|---|---|
| 3 h | 15,8 min | 92 min |
| **5 h** | 17,3 min | **104 min** |
| 8 h | 17,9 min | 93 min |
| 10 h | 17,9 min | 93 min |
| 15 h | 17,9 min | 93 min |
| **25 h** | 17,9 min | **93 min** |

Au-delà de 8 h, **le plan est identique au bit près**. Et **déclarer 5 h donne un plan PLUS GROS
que déclarer 25 h** (104 contre 93 min) — une inversion de monotonie sur l'axe `vol_max`.

## A.4 — La découverte qui explique pourquoi personne ne l'avait vu

### (a) Une discontinuité sur l'allure déclarée

Balayage du CSS, à profil débutant constant (hors corpus — le golden ne disperse pas le CSS des
débutants, voir (c)) :

| CSS déclaré | 850 m coûte | plafond effectif | **séance livrée** | semaine |
|---|---|---|---|---|
| 1:30 | 14,3 min | 850 m | **14,0 min** | 84 min |
| 1:45 | 16,7 min | 850 m | 16,6 min | 100 min |
| 1:55 | 18,2 min | 850 m | 17,9 min | 93 min |
| 2:00 | 19,0 min | 850 m | 18,8 min | 98 min |
| **2:10** | 20,6 min | **1 175 m (détendu)** | **25,0 min** | **135 min** |
| 2:20 | 22,2 min | 1 075 m | 24,8 min | 134 min |
| 2:30 | 23,8 min | 1 000 m | 23,9 min | 144 min |

**Le nageur débutant RAPIDE reçoit des séances de 14 minutes ; le LENT en reçoit 25** — et **40 %
de semaine en plus**, à déclaration identique. La marche est à **CSS ≈ 2:06**, exactement le point
où 850 m coûte 20 minutes et où la détente `swimCapDebutantM` s'enclenche.

La détente est écrite pour le cas dégénéré et elle fait son travail ; **c'est en dessous de son
seuil que le plan n'a plus de sens**, et rien ne l'y couvre.

### (b) L'axe qui aurait dû l'attraper n'existe pas

`scripts/monotonie.mjs:60-61` déclare deux axes de famille **`invariant`** — `pace` et `css` :
« changer la valeur ne doit presque rien changer au VOLUME livré ». Or la boucle qui construit les
critères fait `const spec = ANSWER_SCHEMA[axe.cle]; if (!spec) continue;` (`monotonie.mjs:151-152`),
et **`css` comme `pace` sont ABSENTS d'`ANSWER_SCHEMA`** (ils vivent hors schéma, comme
`target_time`).

**Conséquence : depuis la fiche 47, ces deux axes n'ont jamais émis un seul critère.** Le gate
publie « 28 verts · 1 628 comparaisons » — c'est exactement 7 sports × 3 axes vivants + 7 critères
de phase. `css` et `pace` contribuent **zéro**.

C'est ma faute, de la fiche 47, et c'est la famille que ce dépôt nomme depuis O-9 : **un gate dont
le succès est indiscernable de sa vacuité**. L'assertion de population (1 628 comparaisons) ne
protège pas contre ce cas, puisqu'elle compte les critères qui ONT tourné.

### (c) Et le profil du gate n'est pas un débutant

En rejouant le profil EXACT du gate (`level: inter`) puis le même en `debutant`, avec son propre
critère (`franchi = écart > 5 min ET > 8 %`) :

| | CSS 1:35 | CSS 2:00 | CSS 2:25 | inversions |
|---|---|---|---|---|
| `level: inter` | 151 min | 189 min | 225 min | **36** |
| `level: debutant` | 78 min | 100 min | 156 min | **36** |

Les deux seraient rouges. Le critère n'existe simplement pas.

## A.5 — Trois options, avec leur effet mesuré

### Option 1 — C15 devient une borne de TEMPS (la détente s'applique toujours)

`swimCapDebutantM` relève déjà le plafond en minutes lorsque la fenêtre est dégénérée ; il s'agit
de retirer la condition de seuil.

- **Mesuré** : séance 15,5 → **17,5 min**, semaine 79 → **101 min** (+28 %), `audit:v1` **vert**.
- **Ce qu'elle règle** : la discontinuité à CSS 2:06 disparaît ; l'inversion sur l'allure aussi.
- **Ce qu'elle ne règle pas** : les séances restent sous 25 min. **Le défaut se déplace.**
- **Le risque nommé** : le commentaire de `swimCapDebutantM` dit que sa première écriture SANS
  condition portait la séance de 86 débutants rapides de 850 à 1 325 m — « un contournement de C15
  chez qui n'avait aucun défaut ». Retirer la condition rouvre ce débat : **C15 protège l'épaule,
  et 1 325 m est un autre stimulus que 850**.

### Option 2 — C15 progresse avec le plan (la famille O-56)

C15 est une **constante** ; le débutant de la semaine 30 ne l'est plus. Le dépôt a déjà le patron
exact (`swimSessionCapAtWeek`, appliqué à B-17) et vient de le rejouer deux fois (`capScaleAtWeek`
en fiche 48, la part de longue en fiche 52).

- **Non mesurée** — elle demande une trajectoire à calibrer, comme les fiches 48 et 52.
- **Ce qu'elle règle** : la semaine 1 reste prudente et la semaine 30 devient un plan.
- **Ce qu'elle ne règle pas** : la discontinuité sur l'allure reste (le plafond resterait en
  mètres). **Elle se combine avec l'option 1 plutôt qu'elle ne la remplace.**
- **Le risque** : C15 est une borne de SÉCURITÉ (épaule). La faire progresser demande de dire
  **sur quoi** elle progresse — la position, ou la continuité DÉMONTRÉE (la leçon d'O-89 : « une
  borne de sécurité ne projette pas »).

### Option 3 — le moteur refuse de livrer, et le dit (P7/P8)

Un plan de 79 min/semaine pour 10 h déclarées n'informe pas l'athlète : il le laisse croire qu'il
s'entraîne. Le moteur sait déjà refuser et expliquer (course trop proche, R11.4/R22).

- **Coût nul en calibration**, effet immédiat sur les 78 profils.
- **Ce qu'elle règle** : l'honnêteté. **Ce qu'elle ne règle pas** : rien du plan lui-même.
- **Le conflit** : O-17 range « informer » avant « bloquer ». Un refus ici serait un blocage
  dur pour un athlète qui **peut** nager — ce n'est pas un risque qu'il ne sait pas évaluer.
  La forme O-17-compatible serait une **décision affichée** (« ton plan de nage est borné à
  ~18 min par séance : ta technique passe avant le volume »), pas un refus.

**Ce que je ne recommande pas** : toucher C24b. Mesuré, l'abaisser **aggrave** la séance moyenne.

## A.6 — Un prérequis qui ne dépend d'aucune de ces options

**Rendre vivants les axes `pace` et `css` du gate de monotonie**, et **ajouter un croisement
`level: debutant`** au balayage. Sans cela, aucune des trois options ne pourra être vérifiée par un
gate, et la prochaine régression sur cet axe sera aussi invisible que celle-ci.

---

# TÂCHE B — `sw.aero` : l'arbitrage V-08 / B-02a

*(section rédigée sans code, pour lecture directe)*

## B.1 — De quoi parle-t-on ?

Le moteur range chaque bloc de séance dans une **zone d'intensité**. En natation il en existe
trois principales, définies par rapport au **CSS** (la vitesse critique : l'allure qu'un nageur
peut tenir longtemps, mesurée par un test) :

| zone | nom affiché | allure | ce que c'est |
|---|---|---|---|
| `sw.easy` | « souple, technique » | **12 % plus lent** que le CSS | récupération, technique |
| **`sw.aero`** | **« endurance régulière »** | **6 % plus lent** que le CSS | le gros du volume aérobie |
| `sw.css` | « allure seuil » | au CSS | le seuil |

L'auditeur classe ensuite chaque zone en **facile / modéré / dur** pour vérifier la répartition
des intensités (~80/20) et deux plafonds : **C26c** (temps DUR par semaine) et **C26d** (part de
MODÉRÉ, plafonnée à 40 %).

Aujourd'hui **`sw.aero` est classé FACILE**.

## B.2 — La prémisse d'origine, et pourquoi elle a été réfutée

**L'argument V-08** : « `sw.aero` n'est que 6 % plus lent que le seuil — c'est presque du seuil,
donc ce n'est pas facile, ça devrait être modéré. »

**La réfutation** : cet argument compare un **écart d'ALLURE** à des seuils exprimés en
**PUISSANCE**. À vélo, « 85 % du seuil » veut dire 85 % des **watts**. En natation, « 6 % plus
lent » veut dire 94 % de la **vitesse** — et l'effort ne varie pas comme la vitesse.

Dans l'eau, la traînée croît comme le carré de la vitesse, donc la puissance comme son **cube**.
Le calcul :

| zone | allure | vitesse | **effort réel (eau, P ∝ v³)** | ce que vaudrait le même écart EN COURSE (P ∝ v) |
|---|---|---|---|---|
| `sw.easy` | 112 % | 89,3 % | **71,2 %** | 89,3 % |
| **`sw.aero`** | **106 %** | **94,3 %** | **84,0 %** | **94,3 %** |
| `sw.css` | 100 % | 100 % | 100 % | 100 % |

**Le même écart d'allure de 6 % vaut 94 % d'effort en course et 84 % en natation.** L'intuition
« 6 %, c'est presque le seuil » est vraie sur la piste et fausse dans l'eau.

C'est de là qu'est née la **règle 14** du dépôt : *deux grandeurs ne se comparent qu'après
conversion dans une monnaie commune, et l'exposant appartient à la DISCIPLINE.*

## B.3 — ⚠ Ce qui rend l'arbitrage encore vivant

**84 %, c'est un point sous la frontière que le dépôt utilise lui-même.** Le moteur classe
`bk.rp` (l'allure course à vélo) en **dur au-dessus de 0,85 × FTP** — « le bas de la zone
sweetspot/seuil de Coggan ». `sw.aero` tombe à **0,840**.

La réfutation de V-08 est donc **correcte et étroite** : elle place `sw.aero` juste sous la ligne,
pas loin d'elle. C'est ce qui justifie que l'arbitrage soit rouvert plutôt que classé.

## B.4 — Ce que « déborder sur C26d » veut dire concrètement

**C26d** dit : *une semaine ne peut pas être majoritairement en zone modérée* — la « zone grise »
que le manifeste refuse (trop dur pour récupérer, trop facile pour progresser). Le plafond est à
**40 % de la semaine**, et il a été posé **au-dessus** de ce que le moteur produit, délibérément :
« une borne calibrée au ras du comportement actuel se contente de photographier ce qu'elle est
censée juger ».

Re-mesuré aujourd'hui sur les **15 627 semaines de charge** du corpus :

| | part de modéré médiane | p90 | **semaines au-dessus de 40 %** |
|---|---|---|---|
| aujourd'hui (`sw.aero` = facile) | 2,8 % | 18,7 % | **1** |
| si `sw.aero` devient modéré | 11,0 % | 29,2 % | **151** |

*(Le chiffre de 411 cité au registre datait du 14/08 ; le corpus et le moteur ont tous deux bougé
depuis. L'ordre de grandeur tient : de 1 semaine à ~150.)*

`sw.aero` porte **4,3 % du volume total** et apparaît dans **38 % des semaines de charge**.

**Concrètement, si on reclasse sans rien d'autre** : sur ces ~151 semaines, la passe qui fait
respecter C26d **coupe** du volume modéré — c'est-à-dire de l'endurance de nage, la chose dont les
nageurs manquent le plus. C'est exactement ce que le dépôt a mesuré au moment de la réfutation.

**Si on ne reclasse pas** : le plan continue de compter comme « facile » un travail à 84 % de
l'effort seuil. La conséquence n'est pas cosmétique : la part de facile (~80/20) et le budget de
temps dur sont calculés là-dessus.

## B.5 — Les options d'arbitrage

| option | ce qu'elle fait | ce qu'elle coûte |
|---|---|---|
| **1. Ne pas reclasser** (statu quo) | `sw.aero` reste facile | l'écart est nommé mais pas corrigé ; la part de facile affichée reste optimiste |
| **2. Reclasser et vivre avec** | `sw.aero` devient modéré | ~151 semaines passent au-dessus de C26d et se font couper — **le volume aérobie de nage paie**, la discipline la moins bien servie du moteur |
| **3. Reclasser ET relever C26d** | modéré ≤ 50-55 % au lieu de 40 % | cohérent en classification, mais **affaiblit la garde anti-zone-grise** pour tous les sports, alors qu'elle a été posée haut exprès |
| **4. Reclasser ET sortir la nage de C26d** | C26d indexé par discipline | le plus précis : la « zone grise » est un concept d'impact (course, vélo) ; en nage, l'endurance à 84 % est du volume normal. Coût : une table de plus, et il faut justifier chaque valeur |
| **5. Faire de `sw.aero` une bande, comme `bk.rp` et `rn.mara`** | la classe dépend du CONTEXTE (format, phase) | c'est le geste qu'O-11/R20.5 et B-25 ont déjà fait deux fois pour les mêmes raisons — mais `sw.aero` a une allure FIXE (1,06 × CSS), donc il n'y a rien à faire varier : **cette option n'a pas d'objet** |

**Ce qui n'est pas tranché et qui décide** : est-ce que « 84 % de l'effort seuil » est de
l'endurance ou de la zone grise **en natation** ? Le dépôt a une frontière à 85 % **pour le vélo**,
importée de Coggan. Rien n'établit qu'elle vaille dans l'eau — et la règle 14 dit précisément que
l'exposant appartient à la discipline. **La frontière aussi, peut-être.** C'est la question de
fond, et elle est d'entraînement, pas de code.

---

# Ce qui vous revient

**Sur O-83** : quelle règle cède (option 1, 2, 3 de A.5 — elles se combinent), sachant que
**seule C15 agit** et que les trois autres règles du ticket sont mesurées inertes.

**Sur `sw.aero`** : les options 1 à 4 de B.5, sachant que la question réelle est *où passe la
frontière endurance / zone grise en natation*, et que la valeur de 85 % qui sert de référence est
importée du vélo.

**Sans attendre l'un ni l'autre** : les axes `pace` et `css` du gate de monotonie sont morts
depuis leur création (A.4b). C'est un défaut d'instrument, pas un arbitrage.
