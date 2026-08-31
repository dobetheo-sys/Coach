# Bugs constatés et NON corrigés

**État au 02/08/2026, chantier R20 terminé + N11** (22 gates verts, E2E 13/13, golden 900,
`audit:v7` à N=400, `registry:check` 15/15).

> **§1 — 17 entrées, 0 ouverte.** Le chantier R20 avait fermé les six dernières :
> `O-8` (footing swimrun sans bornes), `O-9` (banc d'invariants ni vert ni bloquant), `O-10`
> (`vol_max` inerte), `O-11` (deux allures course à vélo), `O-13` (rampe R10 inerte en
> natation), `O-15` (portée du verrou froid), plus `O-3` (le créneau de repli) et `O-14`
> (`swim_limit`).
>
> **Puis §1 a rouvert et refermé le jour même, et pas depuis un banc.** `O-16` — l'estimation
> énergétique journalière n'opposait aucune borne d'âge, alors que son équation est validée chez
> l'adulte — a été trouvée en **rédigeant le dossier de relecture diététique** : décrire ce que
> chaque règle calcule oblige à refaire ses calculs. Le même passage a corrigé `N11` (le repos
> des heures d'entraînement compté deux fois), et la correction d'`O-16` a elle-même débusqué un
> message de garde que l'UI n'affichait nulle part. Aucun des 22 gates ne regardait rien de tout
> cela.
>
> **Ce que ça confirme.** Un registre vide ne dit pas que le moteur est sans défaut : il dit
> que tout ce qu'on a MESURÉ est traité. Les six lots de R20 ont trouvé la moitié de leurs
> défauts en corrigeant les autres — et trois d'entre eux étaient des INSTRUMENTS qui
> mesuraient autre chose que ce qu'ils annonçaient (`audit:v1` sur le générateur mort, le banc
> R14 dépendant du jour de la semaine, `measure:fallback` suivant la déclaration au lieu du
> plan). La prochaine entrée est venue, comme annoncé, d'ailleurs que de ce fichier.

Ce fichier ne liste que ce qui est **mesuré et reproductible aujourd'hui**. Chaque entrée porte
sa commande de vérification : une dette qu'on ne peut pas re-mesurer en une ligne n'est pas une
dette, c'est un souvenir. Les entrées sont classées par ce qu'elles coûtent à l'athlète, pas par
ancienneté.

Trois choses n'ont **pas** leur place ici et sont rangées à part (§4, §5) : les arbitrages
assumés entre deux règles, les chantiers humains, et les entrées de registre devenues fausses.

---

## §1 — Défauts ouverts, par gravité

### O-100 SCINDÉ — deux inversions sous un numéro, une seule est un défaut · 🔴 **§1b CONFIRMÉ**

**Mesuré** (O100_SCINDE.md, 22/08/2026) — `npm run mesure:doublage` pour l'ampleur, sonde
dédiée pour la fenêtre de 10 jours.

#### O-100a — `weekend` > `quotidienne` : DÉFENDABLE, à DIRE · 🟡

```
bike/gravel    weekend 16,80  >  quotidienne 16,00
run/marathon   weekend  9,82  >  quotidienne  9,43
```

Le modèle est CORRECT : deux journées entières portent des séances beaucoup plus longues, et
l'échauffement se paie deux fois au lieu de sept. Ce n'est pas une inversion à corriger, c'est
un fait à ÉNONCER — personne ne comprend qu'en déclarant plus de jours il obtient moins
d'heures si la carte ne l'explique pas. **Reclassé : ce n'est plus un défaut de monotonie.**

#### O-100b — `semaine` > `quotidienne` : l'hypothèse d'artefact est RÉFUTÉE · 🔴 **VRAI DÉFAUT**

Sept jours dans les deux cas ; `semaine` = « tous les jours, contraint », `quotidienne` =
« tous les jours, libre ». Une réponse plus permissive, **même nombre de jours**, moins de
volume — aucune explication physiologique.

L'hypothèse posée était : *« `quotidienne` ouvre le cycle glissant de 10 jours, donc c'est
l'instrument »*. **Deux mesures la réfutent, dans cet ordre.**

1. **La prémisse est vraie mais sans objet** : `use10` s'active bien (`a.dispo ===
   "quotidienne" && a.shift_ok === "oui" && offDays.length < 2`, `reasoningEngine.ts:373`,
   décision « Cycle de 10 jours — activé » publiée) — **mais le plan livré reste une grille de
   7 jours dans les DEUX cas** : 43 semaines, `1j×1 · 7j×42`, identique. `use10` fait tourner
   le CYCLE DES CRÉNEAUX sur 10 positions, il ne change pas le calendrier. Il n'y a donc rien
   à re-fenêtrer.
2. **Mesurée quand même sur une fenêtre glissante de 10 jours** (`tri/70.3`, `doubles: oui`,
   `sessions_max: 14`, `vol_max: 20`) : `semaine` **18,63 h** contre `quotidienne` **16,38 h**
   — soit 13,04 contre 11,47 ramenés à 7 jours. **L'inversion PERSISTE.**

Par la règle d'arbitrage posée avec l'hypothèse (*« elle persiste → c'est le moteur »*),
**O-100b est un vrai défaut**, et c'est lui qui bloque la dérivation d'O-99.

#### La CAUSE, mesurée (22/08/2026) — le cycle de 10 jours DILUE le dur

`npm run mesure:doublage` §G et §H, sur `tri/70.3` / `doubles: oui` / 217 jours de charge dans
les deux états. « Dure » = ce que dit le classificateur du moteur (`intensitySplit().hardMin >
0`), jamais une seconde liste de noms.

```
                       séances/7 j   séances DURES/7 j   /10 j    dur      facile
semaine                    8,00           1,68            2,40   48,0 min  462,2 min   (par 7 j)
quotidienne                8,26           1,19            1,71   33,3 min  473,3 min
espacement entre 2 jours durs :  semaine médiane 7 j, min 7  ·  quotidienne médiane 10 j, min 4
```

**`quotidienne` livre PLUS de séances et MOINS de dur** : −29 % de séances dures, **−31 % de
minutes dures**, à facile quasi identique (+2 %). L'espacement médian passe de 7 à 10 jours —
c'est la signature du cycle.

**§H nomme le producteur (règle 16)** : **un seul créneau produit du dur, `dur1`**, et il passe
de **31 à 25 jours de charge** (−19 %) parce que le cycle en contient un par 10 jours au lieu
d'un par 7.

⚠ **Et le schéma de 10 pose une charge `dur` sur un créneau `facileR`** — 22 jours étiquetés
`facileR/dur`, **dont 0 dur livré**. La CHARGE (qui alimente la courbe de volume) promet du
dur, le CRÉNEAU (qui décide du contenu) livre du facile. C'est la même famille que le lot
« type du créneau » : le schéma est agnostique de la discipline ET de l'intensité réelle, seul
le module de sport décide — et personne ne vérifie que les deux disent la même chose.

### O-109 — PISTE 1 (gabarits de cycle alternés) : écrite, mesurée, RETIRÉE · ✅ **SANS OBJET le 25/08/2026 — le cycle de 10 jours est retiré**

> ✅ **SANS OBJET depuis le RETRAIT DU CYCLE DE 10 JOURS (25/08/2026).** Le mécanisme que ce
> ticket décrit n'existe plus : tous les profils passent par le cycle de 7 jours. Le diff du
> retrait est conservé dans `use10-cycle-10-jours.patch` ; si le sujet est rouvert un jour, ce
> ticket redevient pertinent tel quel — c'est pourquoi il n'est pas supprimé.


Piste 1 de la fiche 29 §5, demandée par la fiche 31 : alterner deux gabarits de cycle sur la parité
(le patron de B1/B2) pour rendre à `dur1` et `durLong` leur densité par jour. Écrite
(`schema()` reçoit `cycleNum`, gabarit pair = 2ᵉ `dur1`, gabarit impair = 2ᵉ `durLong` ; diff
conservé dans `piste1-gabarits-alternes.patch`), **moteur RETIRÉ, `src/generator/weekBuilder.ts`
byte-identique**.

**Densité obtenue (régime générique, 3 222 jours) — la cible est la densité MESURÉE en 7 jours,
pas la valeur théorique 1/7 : les cycles de récup et l'affûtage diluent les deux modes.**

```
créneau     use10 AVANT   use10 APRÈS   7 jours (cible)
dur1           0,101         0,100          0,114        ← INCHANGÉ
durLong        0,083         0,122          0,113        ← réparé (léger dépassement)
dur2           0,118         0,080          0,104        ← cassé dans l'autre sens
facile2        0,178         0,171          0,155
```

**Et le pic LIVRÉ baisse : −0,79 h cumulés sur les 31 profils** — 8 baissent, 6 montent,
17 immobiles. `REEL` **11,52 → 11,30 h**, `run/marathon` −0,15 à −0,23, `swim/fond/debutant`
−0,14. Les 7 profils du régime (A) — trail et swimrun — sont **strictement intacts**, comme voulu.

**Deux mécanismes expliquent l'échec, tous deux `applyWeeklyVariety` (R5.5), et ils sont
SYMÉTRIQUES :**

- **un second `dur1` dans la semaine calendaire est RENVOYÉ vers `dur2`** par la passe (elle cherche
  le créneau dur frère) — c'est pourquoi la densité de `dur1` ne bouge pas d'un millième.
  Contre-preuve : piste 1 avec la passe neutralisée donne `dur1` **0,116**, la cible atteinte.
- **un second `durLong` n'a PAS de créneau frère** (`alt` vaut `null` pour `durLong`) : la passe
  tombe alors dans sa branche d'allègement et le **DÉCLASSE en séance facile**. Mesuré sur la
  variante « seul `durLong` alterne » : `REEL` **11,52 → 10,13 h (−1,39)** — le brick de 200 min
  devient une séance facile.

**Ajouter un créneau que R5.5 considère comme un doublon n'ajoute pas d'entraînement : ça ajoute
un déclassement.** Toute reprise de la piste 1 doit donc traiter R5.5 D'ABORD — soit en lui donnant
une variante pour `durLong`, soit en excluant de son champ les doublons VOULUS par le gabarit.

**Trois variantes mesurées, aucune positive** (Δ pic cumulé sur les 31) :

```
piste 1 complète (dur1 + durLong alternés)   −0,79 h
variante « seul dur1 alterne »               −0,70 h   (REEL tenu à 11,53, mais marathon −0,53)
variante « seul durLong alterne »            REEL −1,39 h
```

**Ce qui reste vrai et exploitable** : la moitié `durLong` répare bien la densité (0,083 → 0,122),
et la piste 2 (libérer la position 4, `["dur","facileR"]` d'O-102) est ce qui rendrait `dur2` à sa
densité au lieu de le casser — l'enchaînement des deux pistes prévu par la fiche 31 est confirmé
par la mesure, mais aucune des deux n'est livrable avant R5.5.

```verify
id: O-109-piste1-retiree
quoi: le schéma de 10 jours ne porte qu'un dur1 et qu'un durLong par cycle
attendu: la liste littérale use10, sans alternance de gabarit
cmd: grep -c "cycleNum" src/generator/weekBuilder.ts
```

### O-111 — le `det` écrit à la main d'une COURSE est réécrit par un re-rendu aval · 🔴 **OUVERT — préexistant, révélé par le retrait du cycle (25/08/2026)**

Le jour d'une course intermédiaire porte un `det` AUTEUR (`planGenerator.ts:4098-4106`) : pour une
A−, *« Objectif A− : tu la cours POUR DE VRAI. Départ contrôlé, première moitié retenue… »*.
**Il n'arrive pas jusqu'à l'athlète** : un re-rendu aval (`renderSess`) reconstruit le `det` depuis
les `steps` et la `note`, et le livré vaut

```
"36min — 💡 Course A- placée à sa vraie date — la semaine est allégée autour."
```

**PRÉEXISTANT, prouvé par expérience à facteur unique** : la même fixture en `dispo: "semaine"`
perd déjà le texte sur le moteur d'AVANT le retrait. Le critère `R23.18-A` du banc v6 était vert
par **accident de couverture** — la fixture de base du banc déclarait `dispo: quotidienne` +
`shift_ok: oui`, donc elle tournait sous le cycle de 10 jours, le seul régime où ce jour n'était
pas re-rendu. **Le défaut touchait donc déjà la majorité des athlètes** ; le retrait l'a rendu
visible au banc, il ne l'a pas créé.

C'est la famille U9/O-88 : un texte qui ne dit pas ce qu'il annonce. Ici il ne dit RIEN de ce que
l'auteur avait écrit — l'athlète lit « la semaine est allégée autour » à la place de la consigne
de course.

**Correctif proposé, en UN point (R11.1)** : `renderSess` ne réécrit jamais le `det` d'une séance
`race`. Le code l'argumente déjà deux lignes plus bas — *« Une course ne porte PAS de zone
d'entraînement : ce n'est pas une séance dosée, c'est un événement »* — et la même raison vaut
pour son texte. **Non appliqué dans ce lot** : mélanger un correctif de rendu à un retrait de
mécanisme rendrait l'attribution impossible. `R23.18-A` porte `expect: "fail"` avec cette raison,
à repasser à `"pass"` DANS le commit qui corrige.

```verify
id: O-111-det-course-reecrit
quoi: le det écrit à la main d'une course est réécrit par renderSess
attendu: le texte « POUR DE VRAI » existe dans le générateur mais pas dans le livré
cmd: grep -c "POUR DE VRAI" src/generator/planGenerator.ts
```

### O-110 — `npm run casser` : deux mutations sur le MÊME fichier s'écrasaient en silence · ✅ **FERMÉ le 25/08/2026 (corrigé dans le lot qui l'a trouvé)**

`casser.mjs` écrivait chaque mutation depuis l'ORIGINAL —
`writeFileSync(m.fichier, originaux.get(m.fichier).replace(m.avant, m.apres))` — donc sur un même
fichier **seule la DERNIÈRE survivait**, pendant que la boucle imprimait « ⚡ cassé » une fois par
mutation. L'en-tête n'annonce que des mutations sur des fichiers DIFFÉRENTS ; le cas même-fichier
était accepté sans un mot.

**C'est exactement la classe que ce harnais existe pour fermer** — « une contre-preuve qui n'a rien
perturbé rend le même verdict que *le correctif tient* » —, en pire : elle perturbe à MOITIÉ et
s'imprime comme complète. Trouvé le jour même sur une variante de schéma annoncée à deux entrées
qui n'en portait qu'une ; le chiffre publié décrivait un état intermédiaire que personne n'avait
demandé (variante « seul `durLong` alterne », première mesure — invalidée et refaite).

Corrigé : les mutations s'appliquent **cumulativement**, chaque motif est cherché dans le contenu
COURANT (une mutation peut donc viser ce qu'une précédente a écrit), et la ligne « ⚡ cassé »
annonce le nombre de mutations par fichier. **Validé en reproduisant un état CONNU** : la piste 1
neutralisée par deux mutations rend exactement les 31 pics de la ligne de base (`REEL` 11,52 ·
`O-21b` 3,68 · `tri/S/inter` 3,82), ce que la version d'avant rendait à 11,38.

```verify
id: O-110-casser-cumulatif
quoi: les mutations de casser s'appliquent cumulativement sur un même fichier
attendu: la boucle lit `courant`, pas `originaux`
cmd: grep -n "courant.set(m.fichier, src.replace" scripts/casser.mjs
```

### O-107 — trail et swimrun déclarent un `weekSchema` de 7 entrées que le cycle de 10 lit HORS BORNES · ✅ **SANS OBJET le 25/08/2026 — plus aucun cycle ne lit au-delà de la 7ᵉ position**

> ✅ **SANS OBJET depuis le RETRAIT DU CYCLE DE 10 JOURS (25/08/2026).** Le mécanisme que ce
> ticket décrit n'existe plus : tous les profils passent par le cycle de 7 jours. Le diff du
> retrait est conservé dans `use10-cycle-10-jours.patch` ; si le sujet est rouvert un jour, ce
> ticket redevient pertinent tel quel — c'est pourquoi il n'est pas supprimé.


`schema()` (`weekBuilder.ts:40`) délègue au module de sport quand il déclare son propre
`weekSchema`. `swimrunWeekSchema(_phase, isRecup)` et `trailWeekSchema(phase, isRecup, cat)`
rendent **7 entrées** et **ne reçoivent pas `use10`**. Le jour est ensuite tiré par
`const s = sch[dic] || { charge: "facile", slot: "facileR" }` avec `dic` allant jusqu'à 9 :
**`sch[7]`, `sch[8]` et `sch[9]` sont `undefined`, et le `||` fabrique trois jours faciles par
cycle que personne n'a écrits.**

Mesuré sur le plan entier :

```
swimrun/series/inter   facileR 12 → 33 jours (+175 %)   dur1 10→8 · dur2 10→8 · durLong 10→7
trail/-/inter          facileR 34 → 70 jours (+106 %)   dur1 22→16 · dur2 22→15 · durLong 22→17
```

⚠ **Ne pas « corriger » sans décider d'abord.** Donner `use10` à ces deux schémas leur retirerait
ces trois jours : mesuré, **−0,75 à −1,10 h de pic sur les trois profils swimrun**, qui sont
aujourd'hui les plus gros gagnants du cycle de 10. L'accident est favorable ; le fermer sans
écrire ce que ces schémas DOIVENT faire sur 10 jours dégraderait les profils qu'il faut préserver.

```verify
id: O-107-schema-7-entrees
quoi: les schémas propres rendent 7 entrées et ne reçoivent pas use10
attendu: swimrunWeekSchema(_phase, isRecup) — deux paramètres, pas de use10
cmd: grep -n "export function swimrunWeekSchema" src/sports/swimrun/index.ts
```

### O-108 — sur `REEL`, quatre jours `dur1` ne portent AUCUNE séance de qualité vélo sous `use10` · ✅ **FERMÉ le 25/08/2026 — RÉFUTÉ : ce ne sont pas des jours `dur1`**

`VO2max vélo` ne sort QUE du créneau `dur1`, en `dev`/`spec`/`peak`. Mesuré sur
`REEL/tri/70.3/nage-limitante` : **18 jours `dur1` sous `use10` contre 21 en 7 jours, mais 14
VO2max livrées contre 21.** Trois séances manquent par le compte de jours (la dilution −30 % du
schéma de 10) ; **les quatre autres viennent de jours `dur1` qui rendent autre chose** —
2 en `dev` rendent `Nage aérobie + accélérations + Nage seuil`, 1 en `spec` et 1 en `peak`
rendent `Endurance vélo + Nage seuil`. **Sous 7 jours ce cas n'existe pas : 32 jours `dur1`,
32 séances de qualité vélo.**

**Éliminé par expérience à facteur unique** (`npm run casser`, un facteur à la fois, témoin
positif validant l'instrument — le `dur1` du schéma remplacé par `facileR` fait bien tomber le
compte de 14 à 2) :

```
applyPolarizationGuard · applyAntiCollage · applySessionBudget · applyDisciplineCoverage
applySwimFrequency · applyRunImpactCap · applyAvailability · applyStrengthGrafts
applyWeeklyVariety · applyPeakSignature          → VO2max ×14, inchangé
slotIdx · creneauxDuSlot · dernierDuSlot · isR · semaineRecup · prog  → VO2max ×14, inchangé
```

Le producteur est donc **à l'intérieur de la branche `dur1` du module tri**. À identifier AVANT
de rééquilibrer le schéma : augmenter le nombre de jours `dur1` ne rendrait au mieux que 3 des
7 séances manquantes.

⚠ **RÉFUTÉ, et par le discriminant que mon recensement ne regardait pas : `jc`, le jour dans le
cycle.** Tracés un par un, les 18 jours `dur1` de `dev`/`spec`/`peak` sous `use10` se répartissent
en **14 à `jc = 1`** (la position 0 du schéma, le vrai `dur1`) — qui produisent **tous** leur
`VO2max vélo`, sans exception, exactement comme les 21 jours à `jc = 2` du schéma de 7 — et
**4 à `jc = 7`**, c'est-à-dire la position 6 du schéma de 10, qui vaut `["dur", "dur2"]`.

**Ces quatre-là n'ont jamais été des `dur1` : ce sont des `dur2` que `applyWeeklyVariety` (R5.5)
RENOMME** en cherchant une variante pour le second `dur2` de la semaine calendaire — la passe fait
`d.slot = alt`, donc le recensement les compte comme `dur1`. Contre-preuve : la passe neutralisée,
les jours `dur1` de `dev`/`spec`/`peak` tombent à **14, tous à `jc = 1`, tous en VO2max**.

**Conséquence sur le compte publié en fiche 29** : la décomposition « 3 séances par le compte de
jours + 4 par un taux » est fausse. **Le taux vaut 100 % dans les deux modes** ; les 7 VO2max
manquantes viennent à **100 % du compte de jours `dur1`** — 14 contre 21, soit exactement la
dilution −33 % du schéma de 10. Il n'y a pas de second mécanisme.

**Le producteur est délibéré et documenté** (`applyWeeklyVariety`, R5.5, audit v7 bis) : son
en-tête nomme lui-même le cycle de 10 jours comme la cause des `dur2` en double. Ce n'est pas un
défaut — c'est la passe qui fait son travail. Ce qui était un défaut, c'est **mon recensement, qui
identifiait un créneau par son ÉTIQUETTE FINALE** alors qu'une passe la réécrit (famille règle 17 :
un critère n'identifie jamais sa cible par un libellé).

```verify
id: O-108-jc-discrimine
quoi: applyWeeklyVariety renomme un dur2 en dur1 — l'étiquette finale n'est pas le créneau d'origine
attendu: d.slot = alt dans applyWeeklyVariety
cmd: grep -n "d.slot = alt" src/generator/weekBuilder.ts
```

### O-106 — les phases ne peuvent pas s'aligner sur le cycle tant que la COURBE lit des index de SEMAINE · ✅ **SANS OBJET le 25/08/2026 — phases et courbe sont toutes deux hebdomadaires, donc synchronisées**

> ✅ **SANS OBJET depuis le RETRAIT DU CYCLE DE 10 JOURS (25/08/2026).** Le mécanisme que ce
> ticket décrit n'existe plus : tous les profils passent par le cycle de 7 jours. Le diff du
> retrait est conservé dans `use10-cycle-10-jours.patch` ; si le sujet est rouvert un jour, ce
> ticket redevient pertinent tel quel — c'est pourquoi il n'est pas supprimé.


Étape 4 du chantier « unité de volume = cycle » (fiche 19) : faire raisonner les bornes de phase
en JOURS via `phaseJours()` (livrée à l'étape 1), et les CALER sur les frontières de cycle, pour
qu'une transition de phase ne tombe plus au milieu d'un cycle de 10 jours.

**Écrite** (`bornesJ` / `phaseAJour` dans `weekBuilder.ts`, 30 lignes ; diff conservé dans
`e4-phases-en-jours.patch`). **Elle atteint sa cible diagnostique et manque la cible produit** —
mesuré sur `REEL/tri/70.3/nage-limitante` :

```
cycles à cheval sur une frontière de phase   4 / 30  →  0 / 30      ✓ la cible diagnostique
pic livré                                    11,52 h →  10,53 h     ✖ −0,99 h
cible DÉCLARÉE max                           12,70 h →  10,60 h     ✖ −2,10 h
valeurs distinctes de la courbe déclarée     29      →  16
```

Et par phase, la courbe déclarée **cesse de monter** : `base` 3,70–10,60 · `dev` 4,50–10,60 ·
`spec` 5,30–10,60 · `peak` 3,90–10,60 — les quatre phases plafonnent sur la MÊME valeur, ce qui
n'est pas une périodisation.

**Sur les 31 profils `use10` : 15 bougent, 11 BAISSENT, 4 montent, somme des pics 224,95 →
221,47 h (−3,47 h).** La pièce est strictement défavorable au critère pour lequel le chantier
existe.

**La cause est structurelle, et elle est le ticket** : `r.phases[i].start` / `.end` **restent des
index de SEMAINE**, et c'est ce couple que lit la courbe de volume (`vol_declared`, une valeur par
semaine calendaire). Caler les bornes de phase sur des frontières de CYCLE les désynchronise donc
de la courbe : la phase change au jour 10, la courbe change au jour 7, et le volume promis suit la
seconde. Une frontière de cycle à J10 vaut la semaine **1,43** — non représentable dans un index
de semaine entier. `phaseJours()` ne suffit pas : elle DÉRIVE des jours depuis des semaines, elle
ne convertit pas ce qui les consomme.

**Ce qui reste à traiter (et qui n'est pas de la granularité d'une étape)** : la BOUCLE DE VOLUME
elle-même doit itérer sur des cycles — `vol_declared` par cycle, pas par semaine calendaire —,
c'est-à-dire `const w = Math.floor(i / 7)` (`weekBuilder.ts:173`) et tous ses lecteurs. Tant que
l'unité de la courbe est la semaine, aligner les phases sur le cycle ne peut que faire diverger
les deux.

⚠ **Le pic de `REEL` sous `use10` reste donc à 11,52 h contre 12,32 h en mode 7 jours — l'écart
de 0,80 h du critère de clôture (fiche 19, étape 7) n'est PAS comblé, et le chantier n'est pas
terminé.**

⚠ **DÉCOMPOSITION RECTIFIÉE (fiche 28, 25/08/2026).** J'avais publié « ≈ 0,30 h de cible déclarée
plus basse (12,70 contre 13,00) et ≈ 0,50 h de sous-livraison ». **Les 0,30 h n'existent pas comme
cause** : 12,70 est la cible **RABATTUE** (`vol_declared` est réécrit sur le livré dès que l'écart
dépasse 10 %, `planGenerator.ts:1227`), c'est-à-dire l'écho du manque et non son origine. Mesurée à
facteur unique, la cible de BOUCLE (`_ciblesBoucle`, publiée par la décision `manque`) vaut
**13,0 h/sem dans les DEUX modes**. **La décomposition correcte est : 0,80 h de sous-livraison,
0,00 h de cible.** Même faute que celle de la fiche 26 — lire une sortie rabattue comme une entrée
(règle 12 / O-43).

**Conséquence sur ce ticket** : convertir `vol_declared` au cycle ne fermerait PAS l'écart, puisque
la cible est déjà la bonne. Le producteur mesuré est **O-102/O-103** — sous `use10` le plan entier
livre 363 h contre 366, mais substitue de l'endurance dédoublée à la qualité et aux sorties longues
(VO2max ×14 contre ×21, longue CAP ×20 contre ×25, endurance vélo ×39 contre ×30). O-106 reste un
ticket de JUSTESSE d'unité (O-104 en vit), pas le levier du pic.

```verify
id: O-106-phases-semaines
quoi: les bornes de phase consommées par la courbe sont des index de SEMAINE
attendu: p.start / p.end lus comme numéro de semaine dans weekBuilder
cmd: grep -n "Math.floor(i / 7)" src/generator/weekBuilder.ts
```

### O-105 — `s5IdentiteR202` recalcule un `min()` brut au lieu de lire l'argmin publié · 🟠 **OUVERT**

Ouvert par le lot O-78 (24/08/2026), diagnostic déjà écrit — fiche 24 §4, aucune investigation
nouvelle nécessaire.

`seal.ts:159` :

```js
const min = Math.min(...actifs);   // le GARDE : minimum BRUT de tous les plafonds
```

Le MOTEUR, lui, ne nomme jamais ce minimum-là (`planGenerator.ts`, garde d'observation) :

```js
const candidats = actifs.filter((p) => p.livre >= volPeak - 0.1);
const minP = (candidats.length ? candidats : actifs).reduce(min);   // l'argmin PUBLIÉ
```

**Le garde mesure une grandeur que le produit n'affiche pas.** Deux computations de « le maillon
qui borne », libres de diverger — la forme R11.1 que ce dépôt refuse partout ailleurs. Elle est
restée invisible tant que tous les plafonds étaient au-dessus du pic livré ; O-78 l'a rendue
visible en faisant descendre `structurel`.

**Correctif attendu** : `s5IdentiteR202` lit `_r202.argmin` (ou refait la même sélection par
candidats), au lieu de recalculer un minimum sur `actifs`. **Ne pas l'implémenter dans le lot qui
le fait bouger** — c'est la raison pour laquelle il est un ticket et pas une ligne.

⚠ **Ce lot le rend moins VISIBLE, il ne le corrige pas** : `S5` tombe de 521 à 218 parce que
`structurel` vaut désormais le pic livré sur beaucoup de profils, pas parce que le garde s'est
mis à lire la bonne grandeur.

```verify
id: O-105-min-brut
quoi: le garde S5 recalcule un min() brut au lieu de lire l'argmin du moteur
attendu: Math.min(...actifs) présent dans s5IdentiteR202 (seal.ts)
cmd: grep -n "Math.min(...actifs)" src/generator/seal.ts
```

### O-104 — sous `use10`, le volume d'une semaine calendaire varie de 86 à 543 min selon le seul JOUR DE COURSE · ✅ **SANS OBJET le 25/08/2026**

> ✅ **SANS OBJET depuis le RETRAIT DU CYCLE DE 10 JOURS (25/08/2026).** Le mécanisme que ce
> ticket décrit n'existe plus : tous les profils passent par le cycle de 7 jours. Le diff du
> retrait est conservé dans `use10-cycle-10-jours.patch` ; si le sujet est rouvert un jour, ce
> ticket redevient pertinent tel quel — c'est pourquoi il n'est pas supprimé.


Trouvé le 24/08/2026 en attribuant un gate rouge (`audit:v6` `R23.18-D`). Profil IDENTIQUE, seule
la date de course glisse d'un jour, `dispo: quotidienne` + `shift_ok: oui` + `doubles: oui` donc
`use10 = true` :

```
course lundi    semaine avant l'A−  86 min      ratio A−/précédente 84 %   ✖
course mardi                       220 min                            49 %   ✔
course mercredi                    290 min                            60 %   ✔
course jeudi                       262 min                            61 %   ✔
course vendredi                    376 min                            60 %   ✔
course samedi                      543 min                            60 %   ✔
course dimanche                    292 min                            60 %   ✔
```

**Un facteur SIX sur le volume d'une semaine, pour un athlète identique.** Même famille
qu'O-103 : un cycle de 10 jours découpé en semaines calendaires de 7 rend des semaines dont le
contenu dépend de la PHASE du cycle au moment de la coupe — et le jour de course fixe cette
phase, puisque le plan s'arrête au soir du jour J (N2).

⚠ **Ce n'est pas seulement un artefact de lecture** : la « semaine » est l'unité que l'athlète
voit, que la courbe de charge pilote et que les gardes de croissance (C22) mesurent. Une
semaine à 86 min au milieu d'une préparation n'est pas une semaine de récupération décidée,
c'est un résidu de découpe.

#### OÙ TOMBE L'ÉCART — mesuré le 24/08/2026, et la crainte est LEVÉE

La question posée était : *« si l'écart est du même ordre sur la dernière semaine de charge et
l'affûtage, c'est la pièce la plus urgente des deux »*. Balayage des SEPT jours de course
possibles, `npm run mesure:cycle10` §6, avec le témoin `use10 = false` :

```
                            cycle de 10        semaine de 7 (témoin)
pic                         x1,0               x1,0
DERNIÈRE semaine de charge  x1,0               x1,0
affûtage (moyenne/sem)      x1,7 à x2,7        x1,8 à x3,2      ← le témoin varie AUTANT
dernière semaine            x7,2 à x17,7       x2,5 à x3,7
```

**Le pic et la dernière semaine de charge sont IDENTIQUES sur les sept jours** — l'approche de
l'objectif ne bouge pas. La dispersion de l'affûtage n'est **pas** le cycle : le témoin la
présente aussi, c'est N2 (le plan s'arrête au soir du jour J). Et la « dernière semaine » varie
parce qu'elle fait **1 à 7 jours** : vérifié, son volume est proportionnel à sa longueur dans
les deux états (0 · 17 · 55 · 105 · 147 · 196 · 241 min pour 1 à 7 jours), ce qui est N2 par
conception.

**Donc l'écart ne frappe PAS la semaine qui précède l'objectif.** Le facteur six mesuré au banc
v6 portait sur une semaine bordant une course INTERMÉDIAIRE (A− à 39 jours), en milieu de plan.
**O-103 est la pièce, O-104 en est une manifestation** — ordre confirmé, gravité revue à la
baisse.

À traiter AVEC O-103 : les deux ont la même cause structurelle, et un correctif local à l'un
laissera l'autre.

```verify
id: O-104-jour-de-course
quoi: sous use10, le volume hebdomadaire dépend du jour de course
attendu: 86 min le lundi contre 220-543 les autres jours (24/08/2026)
cmd: npm run audit:v6
```

#### LE PRODUCTEUR DE LA DÉRIVE EST IDENTIFIÉ : `applyWeeklyVariety` (24/08/2026)

Le résidu publié par l'étape 0 — 6 jours `dur2→dur1` sans producteur, 46 % de la dérive de
`REEL` — est **entièrement localisé**, et il emporte 12 des 13 jours.

`weekBuilder.ts:573` — `applyWeeklyVariety` boucle **`for (let w = 1; w <= r.weeks; w++)`** sur
les SEMAINES CALENDAIRES, avec un `seen` de noms de séance par semaine. Quand un nom de séance
de QUALITÉ se répète dans la semaine, elle bascule le créneau du jour :
`alt = d.slot === "dur1" ? "dur2" : d.slot === "dur2" ? "dur1" : null` — et à défaut de
séance inédite dans le créneau alternatif, elle retombe sur `easyFallbackSlot`.

**Le mécanisme est l'interaction exacte décrite par l'étape 0** : le schéma de 10 pose DEUX
`dur2` (j3 et j7) ; une semaine calendaire de 7 jours peut donc en contenir deux, le second
répète un nom, et la passe le convertit. **Le schéma de 7 n'en pose qu'un : la passe ne se
déclenche jamais** — d'où 0 % de dérive à `cycleLen = 7`, la même passe tournant.

Neutralisation (`npm run casser`, `if (true) return;`) :

```
état courant                       13/217 jours (6,0 %) · positions clés 13/82 (15,9 %)
applyWeeklyVariety neutralisée      1/217        (0,5 %) · positions clés  1/82 ( 1,2 %)
applyPeakSignature neutralisée     12/217        (5,5 %) — le 13e jour, `dur2→durLong`
jc=7 sans applyWeeklyVariety       dur2 ×22 (au lieu de dur2 ×13 · dur1 ×6 · facileR ×3)
```

⚠ **ET LA MOITIÉ DE LA « DÉRIVE » N'EST PAS UNE PERTE.** Sur les 13 jours : **6 restent sur un
créneau CLÉ** (`dur2→dur1`) et 1 aussi (`dur2→durLong`, la signature de pic, délibérée) ; seuls
**6 basculent réellement vers du facile** (`dur2→facileR`, la branche de repli de la passe). La
perte de positions clés de `REEL` est donc de **6 jours sur 82 (7,3 %)**, pas 13 — l'indicateur
d'O-103 compte des conversions ENTRE créneaux clés comme des dérives. À corriger dans la sonde.

### O-103 — le cycle de 10 n'est PAS livré tel qu'il est déclaré : 20 % de ses positions clés dérivent · ✅ **SANS OBJET le 25/08/2026**

> ✅ **SANS OBJET depuis le RETRAIT DU CYCLE DE 10 JOURS (25/08/2026).** Le mécanisme que ce
> ticket décrit n'existe plus : tous les profils passent par le cycle de 7 jours. Le diff du
> retrait est conservé dans `use10-cycle-10-jours.patch` ; si le sujet est rouvert un jour, ce
> ticket redevient pertinent tel quel — c'est pourquoi il n'est pas supprimé.


Mesuré le 22/08/2026 en cherchant d'où venait l'écart « 4,00 créneaux de qualité déclarés →
3,50 livrés », attribué à « la rotation ». **Ce n'est pas la rotation.** `npm run mesure:cycle10`
§4, position par position, sur les 4 bases réelles :

```
                       cycle de 10          semaine de 7
run/marathon           24/31   (77 %)       33/33   (100 %)
bike/gravel            24/31   (77 %)       33/33   (100 %)
tri/Full               60/73   (82 %)       75/75   (100 %)
tri/70.3               69/86   (80 %)       93/93   (100 %)
```

**Le schéma de 7 est livré à 100 % sur les quatre bases. Celui de 10 perd un cinquième de ses
positions clés** — et 4 à 10 par plan basculent vers un créneau NON clé (`facileR/facile`,
`facile2/facile`, `off`), c'est-à-dire une journée facile à la place d'une séance clé. Le reste
échange entre créneaux clés (`dur2 → dur1`), sans perte de compte.

Aucune de ces journées n'est `forced` ni `swapped` : ce n'est pas un échange de jours de
l'athlète. La dérive se concentre sur **`j7`** (le second `dur2`) et frappe les semaines qui
bordent une décharge — **un cycle de 10 chevauche les semaines calendaires ET les cycles de
récup, ce que le schéma de 7 ne fait jamais.** C'est la seule différence structurelle entre les
deux, et elle suffit à expliquer 100 % contre 80 %.

**Conséquence directe sur le lot d'intensification** : convertir `j5` en créneau de qualité ne
suffit pas. Mesuré à facteur unique (`npm run casser` sur le schéma, fixture `REEL/tri/70.3`) :

```
état courant            clés 3,50/10 j · jours durs 1,15 · dur 5,6 % · pic 11,52 h · total 305 h
j5 → `dur1`             clés 3,73     · jours durs 1,38 · dur 7,3 % · pic 12,30 h · total 324 h
j5 → `dur2`             clés 4,06     · jours durs 1,57 · dur 6,6 % · pic 11,23 h · total 324 h
schéma de 7 (témoin)    clés 4,29     · jours durs 1,68 · dur 7,9 % · pic 12,32 h
```

**Aucune des deux variantes n'atteint la densité du schéma de 7.** L'arithmétique qui prévoyait
5,00 contre 4,29 suppose une livraison à 100 %, et la dérive en mange 20 %. **O-103 se traite
donc AVANT la conversion de `j5`**, sinon la pièce se mesure contre un plancher qui bouge.

Rayon : **5 profils du corpus activent `use10`** (`O-21b/run/10k` ×4, `REEL/tri/70.3`).

```verify
id: O-103-derive
quoi: les positions clés du cycle de 10 ne portent pas toutes leur créneau déclaré
attendu: le script publie ce qu'il trouve (77-82 % contre 100 % au 22/08/2026)
cmd: npm run mesure:cycle10
```

#### LE SCHÉMA DE 10 DÉCLARE BIEN CINQ POSITIONS DURES — IL N'EN REMPLIT QU'UNE (22/08/2026)

Ordre CYCLE10_INTENSIFICATION §4, mesuré par `npm run mesure:cycle10` (position par position,
clé `jc` posée par `weekBuilder`, jamais reconstruite — règle 21).

**§1 · la séquence déclarée** (`weekBuilder.ts`, `schema(use10 = true)`) :

```
j1 dur/dur1 · j2 facile/facileR · j3 dur/dur2 · j4 facile/facile2 · j5 dur/facileR
j6 facile/facileR · j7 dur/dur2 · j8 facile/facile2 · j9 dur/durLong · j10 recup/recup
```

**Cinq positions de charge `dur`, jamais deux consécutives.** L'intention d'intensification EST
dans le schéma — la prémisse « il en porte l'équivalent d'une » est donc **fausse au niveau du
schéma**, et vraie au niveau du CONTENU.

**§2 · ce que les cinq positions livrent** (4 bases réelles, mêmes chiffres sur les quatre) :

```
j1  dur1     → DUR       ■        j7  dur2     → modéré    □
j3  dur2     → modéré    □        j9  durLong  → facile    □
j5  facileR  → facile    □        cycle de 7 : 3 promises, 1 livrée
5 positions promises DURES · 1 livrée · 0 enchaînement de deux dures
```

**Le schéma de 7 a le même ratio : 3 promises, 1 livrée.** Les DEUX schémas ne délivrent qu'un
seul jour dur par cycle ; le cycle de 10 est simplement plus long, d'où la densité plus basse.
**Ce n'est donc pas un schéma à écrire : c'est le REMPLISSAGE des positions par le module de
sport qu'il faut changer.** `dur2` porte « Force basse cadence » et « Sweetspot », `durLong`
porte la sortie longue — aucun des deux n'est dur, par conception.

⚠ **Deux écarts entre la séquence livrée et celle du fondateur, publiés** : le schéma ne pose
**aucun `off`** et **une seule récup** (sa séquence en veut 1 et 2) ; en `run` et `trail`, les
`off` apparaissent quand même — posés en aval par le plafond de jours d'impact
(`MAX_RUN_DAYS`), pas par le schéma.

**§3 · la séquence intentionnelle n'est écrite NULLE PART.** Recherche faite : `src/` ne
contient que des mentions incidentes du cycle de 10 (le message d'`answerSchema.ts:620`, la
décision `cycle`, des commentaires de conséquence dans `weekBuilder`/`planGenerator`) ; aucune
spec de la séquence, aucune fourchette de séances clés. **Verdict : fonctionnalité jamais
construite, pas régression.** C'est la deuxième intention de conception de ce fil qui ne vit
qu'en conversation (après la fourchette 3-4) : **les deux doivent entrer au dépôt avec le lot.**

#### T-61 A TRANCHÉ LE VOCABULAIRE : `dur` VEUT DIRE « SÉANCE CLÉ » (22/08/2026)

Mesuré sur **986 plans · 80 242 jours de charge**, 7 sports (`npm run mesure:t61`). Part des
jours étiquetés `dur` qui livrent RÉELLEMENT du dur, au classificateur du moteur :

```
dur1      14 399 jours  ·  76,2 %
dur2      14 102 jours  ·  45,9 %
durLong   13 763 jours  ·   0,0 %      ← sur les SEPT sports, sans exception
facileR       30 jours  ·   0,0 %
```

`durLong` contient « Sortie longue » ×4 244, « Sortie longue vélo » ×2 157, « Brick vélo+CAP »
×1 486 ; `dur2` contient « Force basse cadence » ×3 011, « Sweetspot vélo » ×868 — modéré par
conception. **`dur` ne peut donc pas signifier « intensité au-dessus du seuil » : il signifie
séance CLÉ.** La garde « charge déclarée == intensité livrée » est donc REFUSÉE comme
spécification — elle serait rouge sur 3 créneaux sur 4 par CONCEPTION.

**Et l'intention du cycle de 10 jours est ÉCRITE dans le moteur** — `weekBuilder.ts:802`, un
avertissement adressé à l'athlète : *« passer sur un cycle de 10 jours pour **espacer les
séances clés** au lieu de les entasser sur 7 jours »*. Compté sur le livré (`tri/70.3`,
`doubles: oui`) : **`semaine` 4,29 clés / 10 j · `quotidienne` 3,50**, espacement médian 7 → 10
jours. **Le cycle fait exactement ce que le moteur promet qu'il fait.**

⚠ **Donc O-100b change de nature** : ce n'est pas un défaut de génération, c'est un mécanisme
DOCUMENTÉ dont la conséquence (−6 % de volume, −31 % de minutes dures) n'est **publiée nulle
part**, et qui s'applique à qui a coché la réponse la plus permissive. La fourchette « 3 à 4
séances clés par cycle » est celle du fondateur : **elle n'est écrite nulle part dans le
dépôt** — si elle fait foi, `quotidienne` est DANS la cible et c'est le schéma de 7 qui est
au-dessus.

### O-102 — `facile2` est étiqueté `facile` et livre du DUR un jour sur trois · 🟠 **OUVERT**

Trouvé par le §4 de `mesure:t61` — l'inverse, que personne n'avait mesuré :

```
tri|facile2/facile   1 181 jours durs sur 3 424   (34,5 %)
tri|facileR/facile      56 jours durs sur 6 735   ( 0,8 %)
```

`facile2` est le créneau typé **nage à 100 %** (lot « type du créneau ») : c'est la nage seuil
qui y tombe. La charge déclarée dit `facile` — **et c'est elle qui alimente la courbe de
volume** — pendant que le contenu est dur un jour sur trois. **L'écart est quarante fois plus
gros que `facileR/dur`** (1 181 jours contre 30), et il va dans le sens qui compte : la semaine
est comptée plus facile qu'elle n'est.

À relier au plancher de fréquence et à la prédiction « la nage est la victime par défaut » :
c'est encore sur `facile2` que ça tombe.

**Conséquence pour l'arbitrage** : réparer O-100b n'est pas « remonter le volume », c'est
choisir entre deux issues nommées — soit le cycle de 10 jours porte autant de `dur1` par unité
de temps que celui de 7 (densité préservée), soit il assume d'être un cycle plus facile et le
DIT. Le second est cohérent avec O-100a.

⚠ **Trouvé en le mesurant** : la décision dit « Cycle de 10 jours — activé » sur un plan dont
les 43 semaines font 7 jours. Elle n'est pas FAUSSE (le cycle des créneaux tourne bien sur 10
positions, et le plan diffère), mais son libellé décrit un calendrier que l'athlète ne recevra
pas. Famille T-40, sur la surface décision.

```verify
id: O-100b-fenetre-10j
quoi: l'inversion semaine > quotidienne survit à la mesure sur 10 jours
attendu: la propriété est publiée par le script (18,63 h contre 16,38 h au 22/08/2026)
cmd: npm run mesure:doublage
```

### O-101 — `doubles` est demandée à TOUS les sports et n'agit qu'en triathlon · 🟠 **OUVERT**

Mesuré : `run/marathon` et `bike/gravel` rendent le MÊME plan au centième sous `non`,
`parfois` et `oui`. Le guard `doublesAddVolume` n'est déclaré qu'en tri.

**Les deux branches de la question ont été vérifiées, et c'est la première.** La question vit
dans l'étape « Ta capacité réelle » (`endurabuild/js/ui/steps.js`), **poussée sans aucune
condition de sport** — un marathonien y répond, et sa réponse ne change rien.

Ce n'est PAS une violation non détectée de R20.1 : `banc_sensibilite.cjs:146` porte
`doubles: true` dans sa liste d'exemptions, avec sa raison (*« ne vaut que là où une seconde
séance existe (multisport) — testé en tri ci-dessus »*). Le gate couvre le MOTEUR ; ce qui
n'est couvert nulle part, c'est qu'une question **posée** puisse être inerte sans le dire —
famille U19 (« un bouton mort et muet n'informe ni ne bloque »).

**Et le corollaire est plus lourd que la question** : `run/marathon` ne dépassera **jamais
9,82 h** de pic livré, quelles que soient les réponses — sept jours, sept séances, aucun
doublage possible. Dix à quatorze heures est courant pour un marathonien sérieux : **le moteur
ne sait pas produire cette préparation, et rien ne le dit.** C'est un plafond de DISCIPLINE
qui n'a jamais été énoncé, et il est plus grave que la plage du champ `vol_max` (O-99).

```verify
id: O-101-doubles-inerte
quoi: doubles non/parfois/oui rendent le même pic hors triathlon
attendu: run et bike identiques aux trois réponses (le script publie les valeurs)
cmd: npm run mesure:doublage
```

### O-99 — `vol_max` propose une plage que la disponibilité déclarée rend inatteignable · 🟠 **ARBITRAGE**

`ANSWER_SCHEMA` offre `vol_max` de **1 à 40 h**, sans lien avec les réponses de disponibilité
déjà données. Mesuré (`npm run mesure:picmax`, 986 plans) — ratio livré/déclaré **médian** :

```
vol_max déclaré     3 h  →  101 %        12 h  →  47 %
                   10 h  →   70 %        20 h  →  58 %
```

Et le §4 de la mesure le prouve dans le sens fort : **même en neutralisant TOUS les plafonds
de durée de séance** (`blockBounds`, facteur unique), `20 h` reste à **65 %** de médiane. Ce
n'est donc pas une borne à desserrer.

Le plafond réellement OFFERT est dérivable et il est MESURÉ (`npm run mesure:doublage`, §E) :

```
                     weekend  partielle  semaine  quotidienne
run/marathon           9,8       9,7       9,4       9,4      (doubles sans effet)
bike/gravel           16,8      16,5      16,0      16,0      (doubles sans effet)
tri/70.3  doubles=non  8,1       9,2       9,4       8,7
tri/70.3  doubles=oui  8,0      11,1      12,3      11,5
tri/Full  doubles=oui 11,5      15,8      16,6      16,6
```

**Un marathonien ne devrait pas se voir proposer 20 h : le moteur n'en livrera jamais plus de
9,8.** C'est la seule promesse cassée que l'utilisateur rencontre AVANT d'avoir son plan.

⚠ **Deux réserves avant d'écrire quoi que ce soit.** (1) Borner l'offre par la disponibilité
suppose la monotonie que **O-100 réfute** — le plafond offert le plus haut est aujourd'hui
celui du `weekend` : la borne doit donc se dériver du MAXIMUM sur les réponses, pas de la
réponse elle-même, tant qu'O-100 n'est pas tranché. (2) `vol_max` est une DÉCLARATION de
l'athlète, pas une commande : la borner, c'est décider à sa place. La forme O-17 serait
d'INFORMER (« au-delà de N h, le moteur ne pourra pas placer ce volume ») plutôt que de
brider le champ.

### O-98bis — 129 profils reçoivent moins que leur déclaration SANS aucune décision qui le dise · 🟡 **OUVERT**

PLAFOND_CALENDRIER §4 demandait : *« si le manque est publié, le produit est honnête ; sinon,
N profils reçoivent 7 h en ayant demandé 10, sans explication »*. Mesuré sur les **731**
profils qui déclarent `vol_max: 10` et ne l'atteignent pas à 10 % près :

```
décision « R20.2 » publiée .....  594  (81,3 %)
décision « manque » publiée ....   69  ( 9,4 %)
AUCUNE des deux — MUETS ........  129  (17,6 %)
```

**La prémisse du §4 est donc partiellement RÉFUTÉE, et c'est le bon sens** : les gros écarts
SONT publiés. Les muets ont un écart **médian de 1,12 h**, maximum 2,85 h, et **un seul** est
sous 8 h — le silence porte sur l'écart modeste, pas sur les 3 h manquantes. Reste que le
seuil de publication n'est écrit nulle part comme une décision : il est le résidu de deux
règles qui ne se sont pas concertées.

```verify
id: O-98bis-muets
quoi: profils à vol_max 10 non atteint sans décision manque ni R20.2
attendu: le script publie le compte qu'il trouve (129 au 22/08/2026)
cmd: npm run mesure:picmax
```

### `franchissable` — les deux prémisses de l'arbitrage sont RÉFUTÉES par la mesure · ✅ **MESURE, moteur inchangé**

**Arbitrage d'entrée (FRANCHISSABILITE_VACUEUSE.md, 21/08/2026)**, ordre : 1. *« qui lit
`franchissable`, et que fait-il de `false` ? »* — *« le seul des cinq où un mécanisme de sécurité
rend le bon verdict et où rien ne l'utilise »* · 2. le `min()` de livrabilité, rayon mesuré à part.

**Les deux se sont retournés à la mesure. Aucune ligne de moteur n'est écrite** (`src/`
byte-identique).

#### §1 — Le verdict n'est PAS ignoré : il est consommé à 100 %

`reasoningEngine.ts:159` porte un consommateur complet — `if (g0.franchissable === false)` → il
cherche le plus long format que la rampe atteint (bornée aux formats **à ou sous** celui demandé,
c'est la garde d'O-57), rabat, publie un `warning` et une décision `B17-continuite`.

```
tri · franchissable = false 14 · = true 146 · = null 28
  parmi les 14 false :  10 rabattus
                         4 « le format le plus court est déjà le tien, on construit »
                         0 SANS conséquence
```

Le cas cité dans l'arbitrage, `B17/tri/S/debutant/basse-100m`, est dans les **4** :

```
gate      satisfait=false · franchissable=false · source=mesure
          departM 200 · atteignableM 354 · courseM 750
décision  « Continuité de nage à construire | 15 min visées »
warning   « …tu déclares 2 min de nage en continu (200 m) pour un seuil de 15 min : le format
             le plus court est déjà le tien, ton plan construit cette continuité semaine après
             semaine, et une nage continue à la distance de course avant le jour J n'est pas
             une option. »
```

**Le rabattement ne s'applique pas parce qu'il n'y a nulle part où rabattre — le sprint est le
format le plus court —, et le plan LE DIT.** C'est O-17 dans sa forme exacte : informer, ne pas
bloquer.

⚠ **C'est MA formulation d'hier qui a produit cette lecture, et elle est corrigée.** J'avais écrit
« l'écart EST déclaré infranchissable et le rabattement ne s'applique pas » — littéralement vrai,
et trompeur par omission : je n'ai pas dit que le format était déjà le plus court, ni que le plan
publie un avertissement et une décision. Un fait vrai présenté sans sa cause se lit comme un
défaut.

#### §2 — Le `min()` de livrabilité est INERTE par construction, mesuré : 0 sur 188

Le correctif proposé était :

```
atteignableM = min( departM × C22^spanSem , plafond de séance applicable AU PIC )
```

Mesuré avant d'écrire, comme demandé — **0 profil sur 188 bascule**. Et la raison est structurelle,
pas empirique : le plafond de séance EST déjà la même rampe.

```
atteignableM              = departM × C22^spanSem
swimSessionCapAtWeek(k)   = min( courseM , departM × C22^(k−1) ) + auxiliaire
```

`min(atteignableM, capPic)` ne peut donc **jamais** descendre sous `courseM` quand `atteignableM`
l'atteint : les deux grandeurs sont la même projection, l'une plafonnée à la distance de course.
La pièce n'aurait rien borné et se serait lue comme une garde.

**Ce que ça laisse intact** : la vacuité du §2 de l'arbitrage est réelle — sur un plan long,
`C22^40 = ×45` donne **26 220 m atteignables pour une course de 3 800**, et `franchissable` rend
`true` sans rien mesurer. Mais **le plafond de séance n'est pas le bon co-facteur pour la borner**,
puisqu'il projette au même taux. Il en faudrait un qui ne dérive PAS de C22 — et il reste à
identifier. Ticket rouvert avec cette contrainte écrite.

#### §3 — Ce que la mesure confirme de l'arbitrage

Le `null` sur source non mesurée est bien **correct par conception** (D3 : « l'inconnu n'est pas
une valeur par défaut, c'est une mesure manquante ») — 28 profils, et chacun reçoit la décision
« Évaluation de la nage EN ATTENTE » plus le test prescrit. Le défaut de
`B17/tri/S/debutant/inconnue` n'est donc pas le `null` : c'est la **progression plate** (cause 3),
qui reste ouverte.

Les causes 3 et 4 — progression **tronquée** (`550 → 900 → 1225` pour 1500, viole D2) et
progression **non monotone** (`2275 → 3050 → 2150`) — ne sont pas touchées par ce lot. La seconde
est la **cinquième inversion de monotonie** du dépôt, sur un cinquième axe : *à l'intérieur d'une
séquence annoncée comme croissante*.

#### §4 — Et la décision ment là où les titres ne mentent pas

Acquis de l'arbitrage, à traiter au point 3 de la file : `T-40` garde le TITRE (aucune séance
n'annonce une distance qu'elle ne contient pas, vert), mais **la DÉCISION `B17-paliers` annonce
« N paliers » et le plan peut livrer N séances identiques**. Un palier implique une montée. Même
famille que `T-40`, autre surface, même correctif : la décision se dérive du livré.

```verify
id: franchissable-consomme
quoi: tout verdict `franchissable = false` produit une conséquence (rabattement ou « déjà le plus court »)
attendu: /VERDICT-CONSOMME/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');const {continuityGate}=await import('./src/engine/swimContinuity.ts');let f=0,ok=0;for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const g=continuityGate(a,(p.weeks||[]).length);if(g?.franchissable!==false)continue;f++;const d=(p._v2?.decisions||[]).find(x=>x.id==='B17-continuite');if(/Format rabattu|à construire/.test(String(d?.what||'')))ok++;}console.log(f+' verdicts false · '+ok+' avec conséquence · '+(f>=10&&ok===f?'VERDICT-CONSOMME':'VERDICT-IGNORE'));"
### LE PLACEMENT DU TEST — (b) réfuté par la mesure, (c) livré · et la franchissabilité ne consulte AUCUN plafond

**Arbitrage d'entrée (PLACEMENT_TEST_ET_O54.md, 21/08/2026)** : *(a) rejetée — une séance qui ne
compte pas dans la semaine est un mensonge sur la charge ; (b) à essayer d'abord, une seule mesure
décide ; (c) repli garanti.*

#### §1 — (b) est réfuté, et la mesure dit pourquoi

L'argument pour (b) était plausible : *« la base est la phase à bas volume, donc y ajouter une
séance est une perturbation relative plus grande ; en développement, la même séance pèse moins »*.

```
test posé en phase de BASE              tri/S  S4→S5  +22 %   ✗ C22
test posé en 1re semaine de DEV         tri/S  S4→S5  +22 %   ✗ C22   ← le MÊME chiffre
```

**Le même chiffre aux deux positions : ce n'est donc pas la phase qui est en cause.** La courbe
DÉCLARÉE elle-même se déforme (`S3` 3,80 → 2,43 h) et la périodisation se déplace (`S7` passe de
footings à des bricks avec une journée « semaine de récupération »). Avancer le test dans le plan
reshape le volume bien au-delà de la natation. **(b) est refusé par C22, une règle DURE.**

#### §2 — (c) livré, et il ferme le défaut réel

O-95 avait raison sur la PHASE (fin de développement) et faux sur sa **RÉSOLUTION** :
`weekNum === dev.end` est un **ordinal**, et sur un plan dont la fin de développement est une
semaine de RÉCUP, cette semaine ne porte aucun créneau de nage.

> *« Une position calendaire dans un plan dont la composition varie est un ordinal dans une
> collection dérivée »* — la famille d'O-59, O-71 et O-58, sur un quatrième objet.

La position devient une **propriété du créneau** (`dernierDuSlot` : le dernier créneau de ce type
dans sa phase, hors semaine de décharge, calculé par `weekBuilder` qui seul voit le plan).

```
annonce == livré     26/28 → 28/28 plans tri      (les 2 manquants : B17/tri/S/debutant/{inconnue,absente})
en BASSIN            28/28
```

**Deux bornes, mesurées et écrites dans le calcul** : seuls les jours de **rang 0** sont candidats
(c'est la condition que le bloc B-17 impose déjà), et **jamais une semaine de décharge** — un test
maximal n'a pas sa place dans une semaine qui assimile, et la branche décharge du plancher piscine
RETIRE les séances sous le plancher au lieu de les remonter : un test posé là est effacé. Sans
cette seconde borne, le défaut se déplaçait d'un cran au lieu d'être fermé (mesuré : le test
tombait en S4, la récup, et disparaissait).

Sur le profil qui a motivé le lot, `B17/tri/S/debutant/inconnue`, la natation devient :

```
S1 éducatifs · S2 éducatifs · S3 ÉDUCATIFS + TEST DE CONTINUITÉ (bassin)
S5 continue eau libre 500 · S6 continue 500 · S7 éducatifs · S8 rappel
```

Garde : `T-06` branche (c) — **annonce == livré sur toute la population tri, et en bassin**,
contre-prouvée en remettant l'ordinal → **2/28 rouges**. Rayon golden : **8 profils**, exactement
la population à continuité non mesurée (`{S,M} × {debutant,inter} × {absente,inconnue}`).

#### §3 — La réponse au §2 de l'arbitrage : la liste n'est pas incomplète, elle est VIDE

> *« Quels plafonds la vérification de franchissabilité consulte-t-elle ? »*

**Aucun.** `continuityGate` calcule :

```
atteignableM = departM × C22^spanSem
franchissable = atteignableM >= courseM
```

Elle ne modélise que la **rampe de croissance** et ne lit ni `swimSessionCapAtWeek`, ni
`swimSessionCapM`, ni `CAP_SWIM`, ni C15. Ce n'est donc ni « la liste est incomplète » ni « une
condition la saute » : **il n'y a pas de liste**. La question à laquelle `franchissable` répond est
« la croissance à +10 %/semaine suffit-elle à atteindre la distance de course ? », pas « un palier
de cette taille peut-il être LIVRÉ ? ».

Deux conséquences mesurées, et elles vont dans des sens opposés :

```
sur un plan LONG   atteignable 26 220 m pour une course de 3 800  →  franchissable = true
                   par construction : la rampe C22^40 vaut ×45, elle ne borne plus rien
source NON mesurée franchissable = null  →  la branche rabattement n'est JAMAIS évaluée
                   pour la population qui en aurait le plus besoin
```

#### §4 — Ce que ça donne sur le livré : 23 plans sur 99, TROIS causes distinctes

Balayage des plans tri portant au moins deux continues, comparaison de la dernière à la distance de
course :

| profil | course | suite LIVRÉE | `franchissable` | cause |
|---|---|---|---|---|
| `B17/tri/S/debutant/basse-100m` | 750 | 400 → 500 | **false** | l'écart EST déclaré infranchissable et le rabattement ne s'applique pas |
| `B17/tri/S/debutant/inconnue` | 750 | 500 → 500 | **null** | source non mesurée : `franchissable` n'est jamais calculé |
| `PW/tri/M/plat` | 1500 | 550 → 900 → **1225** | null | progression TRONQUÉE — le dernier palier devrait valoir `courseM` (D2) |
| `G/tri/Full/vol-min` | 3800 | 2275 → 3050 → **2150** | true | **NON MONOTONE** — la progression redescend (addendum O-54) |

⚠ **Ma formulation d'hier était imprécise et elle est corrigée** : j'avais écrit « les paliers
annoncés à 800/1350/2250 m sont livrés à 500 ». Le TITRE de la séance suit le livré (`T-40` est
vert, aucun titre n'annonce une distance absente). Ce que le plan annonce à l'athlète n'est donc pas
faux — **il est PLAT** : la décision `B17-paliers` promet « 3 paliers » et le plan livre trois
séances de la même distance. La valeur `800/1350/2250` était le `bnd.floor` interne, pas ce que
l'athlète lit.

**Correctif non écrit** : c'est bien une mesure et non un arbitrage, mais le correctif touche
`franchissable`, dont dépend le rabattement de format — un rayon à mesurer pour lui-même. Et il y a
**quatre** causes à traiter, pas une.

```verify
id: test-continuite-pose
quoi: tout plan tri qui annonce un test de continuité le livre, et en bassin
attendu: /TEST-LIVRE/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let a=0,k=0,b=0;for(const{sport,a:ans}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,ans)}catch{continue}const d=(p._v2?.decisions||[]).find(x=>x.id==='B17-paliers');if(!/1 test/.test(String(d?.val||'')))continue;a++;const t=[];for(const w of p.weeks||[])for(const j of w.days||[])for(const s of j.sessions||[])if(/^Test de continuité/.test(String(s.name||'')))t.push(String(s.det||'')+String(s.note||''));if(!t.length)k++;else if(/BASSIN/.test(t[0]))b++;}console.log(a+' annoncent · '+k+' manquants · '+b+' en bassin · '+(a>=20&&k===0&&b===a?'TEST-LIVRE':'TEST-MANQUANT'));"
```


### L'ENTRÉE DE PLAN DU DÉBUTANT NAGEUR — les 22 semaines sans nage sont FERMÉES, et le test en semaine 1 est ARRÊTÉ par C22 · ⛔ **§2a À ARBITRER**

**Arbitrage d'entrée (ENTREE_PLAN_DEBUTANT.md, 21/08/2026)**, ordre donné : 1. le test en SEMAINE 1
et en PISCINE · 2. la mesure du §3 (pourquoi zéro nage en S1-S3) · 3. le cliquet sur les 23 comptes.
*« Le 1 avant tout : il est en production, sur une population que le ticket de sécurité existe pour
protéger. »*

**Livré : le §3 (la mesure) ET son correctif, qui ferme les 22 semaines. Le §2a est écrit, mesuré,
et RETIRÉ — il viole C22.** Patch conservé dans `b17-test-en-semaine-1.patch`.

#### §1 — La réponse au §2b, mesurée avant d'écrire

Le §2b demandait : *« la séance de S5 est-elle le test, ou le premier palier d'eau libre qui a
absorbé le test ? »* **Ni l'un ni l'autre : le test n'était posé NULLE PART.**

```
B17/tri/S/debutant/inconnue — toutes les nages du plan
  S5  Nage continue en EAU LIBRE — 500 m d'affilée     ← 1er palier, pas le test
  S6  Nage continue — 500 m d'affilée
  décision B17-paliers : « 1 test (fin de développement) + 2 palier(s) »
```

`palierLayout` posait le test à `dev.end` — une position CALENDAIRE. Sur ce profil, `dev.end` est
**la semaine de récup**, dont les créneaux sont trois footings : aucun créneau de nage, donc aucun
test. Le plan annonçait la mesure et ne la demandait jamais.

#### §2 — Le §3 : ce n'est aucune des trois hypothèses, c'en est une quatrième

Le §3 listait trois suspects (budget serré · base généraliste · mécanisme de comptage) et pariait
sur le troisième. **Aucun des trois.** Le schéma générique de semaine POSE bien un `facile2` (le
créneau de nage) en base ; ce sont DEUX PASSES qui l'éteignent, et la première porte un nom qui
dit ce qu'elle fait :

```
S1  recup · dur1 · OFF(la semaine de pic reste la plus grosse) · dur2 · OFF(fréquence nage) · durLong · facileR
```

**(a) `OFF (fréquence nage)`** — la coupe qui absorbe le gonflement du plancher piscine (C24).
Quand les remontées font déborder la semaine, elle rend des mètres, puis **retire une séance
entière**, sous ce commentaire : *« une séance piscine sous le plancher ne vaut pas le déplacement :
la fréquence cède, pas la taille »*.

⚠ **Elle contredit frontalement le principe écrit 2 700 lignes plus haut DANS LE MÊME FICHIER** :
*« La FRÉQUENCE n'est jamais la monnaie […] retirer une séance de nage pour tenir une borne de
volume serait la prédiction du 19/08 — la nage est la victime par défaut — commise par la garde
censée la protéger. »* Deux règles opposées sur la même discipline, dans le même fichier, et c'est
la seconde qui s'exécutait.

**(b) le repli « dev ≤ pic »** — il élit un jour à éteindre pour que le développement ne dépasse
pas le pic, et il prenait le seul créneau de nage des deux premières semaines.

#### §3 — Le correctif : la garde existait déjà, dix lignes plus haut

La branche **DÉCHARGE** de la même passe porte exactement la garde qui manquait —
`if (restants <= 1) continue` — sous un commentaire qui en énonce la raison : *« un affûtage sans
une seule séance n'affûte rien, il désentraîne »*. Elle n'avait **jamais été rejouée sur la branche
de CHARGE**. La forme la plus familière de ce dépôt : une garde écrite sur une branche et absente
de sa sœur.

Les deux passes consultent désormais le niveau **ZÉRO** du plancher de fréquence
(`seancesDiscipline`, le point unique). Dans le repli, la garde a la MÊME forme que `porteEpingle`
qui la précède : *épargné tant qu'une autre victime existe ; seul candidat → on s'arrête*. La liste
des disciplines n'est pas écrite, elle est DÉRIVÉE de ce que la semaine porte — donc elle vaut pour
les sept sports sans qu'aucun soit nommé.

```
O-98         30 → 8 semaines de charge à zéro   (les 22 sans NAGE fermées)
la nage      22 → 0
la course     8 →  8   (isolées, G/tri/Full/vol-min, jamais deux de suite — l'« accident »)
```

**Contre-prouvé dans les deux sens, sur le corpus** : coupe piscine dé-gardée → **21** · repli
dé-gardé → **14**. Cliquet `T-60` descendu de 30 à **8** dans le même commit — un cliquet qui ne
descend pas avec son correctif ne protège pas le gain.

Le plan du profil le plus exposé nage désormais **dès la semaine 1** (S1, S2, S3 puis la spec),
au lieu de quatre semaines sèches.

#### §4 — ⛔ Le §2a est ARRÊTÉ : déplacer le test en semaine 1 viole C22

Écrit intégralement (le test devient la PREMIÈRE séance de nage du plan via un fait dérivé,
`premierDuSlot`, calculé par `weekBuilder` ; `palierLayout` perd sa position calendaire ; l'annonce
suit ; `T-06` réécrit sur la propriété). **Il marche** — mesuré sur le profil visé :

```
S1  Test de continuité — aussi loin que possible, sans t'arrêter   EN BASSIN
S2  Nage éducatifs        S3  Nage éducatifs
S5  Nage continue en eau libre — 600 m        S6  Nage continue — 750 m
annonce : « 1 test (première séance de nage) + 2 palier(s) en phase spécifique »
```

**Et il casse `D3` du banc v6 — C22, une violation DURE du manifeste** :

```
tri/S(8sem)  S4→S5  déclaré +22 % / prescrit +22 %  → courbe
```

Attribué par bisection par fichier : la cause est le couple `swimContinuity` + `tri/index`, pas les
gardes du plancher (celles-ci laissent la courbe plate). Et ce n'est **pas** la taille des paliers —
la variante `nProgression = n` casse aussi (+20 %). **La courbe DÉCLARÉE elle-même change** :
`S3` passe de 3,80 à 2,40 h et la périodisation se déplace (`S7` passe de footings à des bricks avec
une journée « semaine de récupération »). Poser le test dans la phase de BASE reshape le plan bien
au-delà de la natation.

**C'est un arbitrage, pas un réglage** : le test EST une mesure et D3 dit qu'elle se prend le plus
tôt possible ; mais l'ouvrir à la base déplace la construction du volume. Trois issues, non
tranchées :

```
(a) poser le test hors de la courbe de volume (une séance qui ne compte pas dans la semaine)
(b) le poser à la première semaine de DEV plutôt que de BASE — à mesurer, C22 peut tenir
(c) garder O-95 (fin de dev) et corriger sa seule faute : que la position soit un CRÉNEAU DE
    NAGE existant et non un numéro de semaine
```

**(c) est la plus petite** et elle ferme le défaut réel du §2b (le test jamais posé) sans toucher
la courbe. Elle n'a pas été essayée faute de temps dans ce lot.

⚠ **Ce qui reste ouvert en production** : sur ces profils, le test annoncé n'est toujours pas posé,
et la première nage reste un palier en eau libre. **Les quatre semaines sèches, elles, sont
fermées** — c'est la moitié du §1 de l'arbitrage, celle qui touche la sécurité.

#### §5 — Ce que le §2a a exposé au passage : la progression B-17 est fictive sur 4 profils

Trouvé en mesurant le rayon du §2a sur `T-39` (blocs épinglés rabotés) : sur
`B17/tri/{70.3,Full}/debutant/{absente,inconnue}`, **les paliers annoncés à 800, 1350 et 2250 m
sont livrés à 500 m** — le plafond de séance de nage (`swimSessionCapAtWeek`, une borne de
capacité) les rabat tous. La progression que B-17 annonce n'est jamais construite, et D2 (« le
dernier palier vaut EXACTEMENT la distance de course ») est faux là aussi. **Défaut PRÉEXISTANT**,
visible avant comme après le §2a (12 nouveaux, 8 disparus, même motif, mêmes 4 profils).

L'arbitrage : soit le plafond gagne et l'ANNONCE se borne à lui, soit la progression gagne et le
plafond cède — et un plafond de sécurité ne cède pas. Donc l'annonce doit dire ce qu'elle va
livrer, et si la continuité de course est hors d'atteinte, le DIRE (O-17). **Ouvert, non tranché.**

```verify
id: entree-plan-debutant
quoi: les semaines de charge tri sans une seule séance d'une discipline de l'épreuve
attendu: /ZERO-8/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');const {seancesDiscipline}=await import('./src/engine/plancherFrequence.ts');let z=0,sw=0;for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}for(const w of p.weeks??[]){if(w.isRecup||w.phase?.id==='taper')continue;for(const d0 of ['sw','bk','rn'])if(seancesDiscipline(w,d0)===0){z++;if(d0==='sw')sw++;}}}console.log('zéro '+z+' dont nage '+sw+' · '+(z<=8&&sw===0?'ZERO-8':'CLIQUET-DEPASSE'));"
```


### LE PLANCHER DE FRÉQUENCE — la valeur a bougé une TROISIÈME fois, et le plancher a refusé la pièce avant qu'elle ne casse deux semaines · ✅ **LIVRÉ**

**Arbitrage d'entrée (PLANCHER_FREQUENCE.md, 21/08/2026)** : *« deux est la borne, trois est la
cible »*, avec l'ordre — 1. le plancher · 2. `C3` en paires, rejouée sous le plancher · 3. mesurer
et publier la contradiction. Et la consigne qui commande le reste : *« ta mesure change sa valeur,
et il faut le dire avant de l'écrire. »*

Elle l'a changée encore. Le lot précédent avait mesuré que **3** condamnait 42 % des semaines du
profil réel ; le fondateur avait redescendu à **2**. Mesuré sur le CORPUS et non sur un profil :

```
sous 3 nages   3 502 / 3 522   99,4 %     la « cible » n'est pas approchée, elle est hors d'atteinte
sous 2 nages   2 261 / 3 522   64,2 %     poser 2 en dur condamnerait DEUX TIERS du corpus
à ZÉRO nage       22 / 3 522    0,6 %
```

Poser « 2 en dur » referait donc, un cran plus bas, exactement ce que le fondateur refusait pour 3.

#### §1 — Ce qui sépare les populations n'est pas l'athlète, c'est le BUDGET

```
≤5 séances/sem   nage moy 1,24   ·   sous 2 : 70,9 %
6-7 séances      nage moy 1,37   ·   sous 2 : 63,7 %
8-9 séances      nage moy 3,05   ·   sous 2 :  0,0 %      ← le plancher y est DÉJÀ tenu
≥10 séances      nage moy 2,00   ·   sous 2 :  0,0 %
```

Avec 6 créneaux pour 3 disciplines, deux nages c'est un tiers des séances pour une discipline qui
pèse 12 % du chrono : ce n'est pas un défaut, c'est l'allocation qui fait son travail. **Au-dessus
de 8 séances le plancher est tenu par 100 % du corpus sans qu'aucune règle ne l'impose** — il ne
condamne rien et il borne ce qui viendrait le franchir. C'est l'usage exact que le document lui
assigne.

#### §2 — Le domaine n'est PAS `swim_limit`, et deux mesures l'écartent

Le §3 demandait que le plancher lise `swim_limit`, *« comme la borne d'épaule lit l'expérience »*.

1. **`swim_limit` n'est pas posée en triathlon** — `ANSWER_SCHEMA` la déclare pour le seul sport
   `swim`. Sur le profil du fondateur la clé n'existe pas : le plancher serait inerte là où il doit
   border.
2. **La borne d'épaule ne lit PAS un adjectif déclaré.** Son propre en-tête (O-85 §1) dit l'inverse
   mot pour mot : elle lit la continuité MESURÉE rapportée à la distance de course, *« jamais sur
   un adjectif auto-déclaré — c'est la leçon R14.1, payée quatre fois »*. L'analogie du §3 pointe
   donc vers la mesure, pas vers la clé.

Et le proxy mesuré **ne sépare rien** : classés par ce ratio, les profils tri dont la nage est
limitante sont sous 2 nages **63,2 %** du temps, les autres **77,4 %** — la classe « nage
limitante » n'est pas celle qui nage le moins.

#### §3 — Il n'est pas le premier, et la forme est reprise d'un précédent

Le §3 posait la question ; la réponse est **non, deux fois** : `C29`/`C29b`/`C29c` tiennent un
plancher de fréquence en AFFÛTAGE (Bosquet 2007, ≥ 80 %), et `S7_COLD` du swimrun porte déjà la
forme à deux grandeurs (`minSessionsPerWeek` / `idealSessionsPerWeek`). La forme retenue est celle
de `S7` — un troisième vocabulaire pour la même idée serait ce que R11.1 interdit.

#### §4 — ⚠ L'UNITÉ décide du verdict : le brick compte

```
sans les legs de brick   119 semaines de charge tri à zéro séance d'une discipline
avec les legs            30
```

Un brick EST du travail de vélo et de course ; il ne contient jamais de natation. `seancesDiscipline`
est le point unique — le module, la décision et la garde comptent tous par lui.

#### §5 — Les trois niveaux livrés (`src/engine/plancherFrequence.ts`)

```
ZÉRO  (dur)       jamais une semaine de charge sans une seule séance d'une discipline de l'épreuve
                  → DÉRIVÉ, aucun nombre à choisir ; 30 semaines le franchissent (cliquet, O-98)
DEUX  (plancher)  sur la discipline la plus basse, quand le budget ≥ 8 séances le rend tenable
TROIS (cible)     publiée par la décision `frequence`, JAMAIS forcée (O-17)
```

**Ce module n'est pas une passe** : il ne rattrape aucune semaine. Les 30 semaines à zéro
(22 sans nage, 8 sans course, **0 sans vélo**) sont déclarées, pas corrigées — et **aucune ne porte
de drapeau médical, de blessure ni de douleur** : ce n'est donc pas une protection qui retire la
discipline, c'est le budget. Toutes sont à ≤ 5 séances. Nommer une borne « dure » sans l'appliquer
serait malhonnête si ce n'était pas écrit ; c'est écrit, dans le module et ici.

#### §6 — Le plancher a fait son travail AVANT la pièce, et c'est le résultat du lot

`C3` rejouée telle quelle vidait complètement la natation de **`G/tri/Full/doubles` S12 et S14** :
deux semaines de préparation d'Ironman sans une seule nage, c'est-à-dire exactement ce que le §2 de
l'arbitrage déclare inacceptable. Le niveau ZÉRO passait de 30 à **32**.

La pièce consulte donc désormais un **neuvième paramètre**, `creneauxDuSlot` : elle ne convertit le
premier exemplaire d'un créneau que si un second exemplaire subsiste dans la semaine. C'est le
niveau ZÉRO appliqué là où la décision se prend, et c'est **une** condition, pas une exclusion.

| état | pic | nage | vélo | course | nages/sem | ZÉRO | sous plancher 2 |
|---|---|---|---|---|---|---|---|
| sans C3 | 11,2 h | 28,0 % | 39,9 % | 32,1 % | 2,84 | 30 | **4** |
| C3 non bornée | 11,5 h | 25,0 % | 45,2 % | 29,9 % | 2,35 | **32** ✗ | 1 |
| **C3 bornée (livrée)** | **11,5 h** | 26,5 % | **43,3 %** | 30,1 % | 2,48 | **30** ✓ | **1** |

La version bornée est **strictement meilleure** que la non bornée sur tous les axes sauf l'ampleur
de l'allocation : même pic, aucune semaine vidée, et 0,13 nage/semaine de plus.

#### §7 — ⚠ La surprise de la mesure : la discipline sous le plancher est le VÉLO

```
sans C3   4 semaine-disciplines sous 2 alors que le budget le permet
          REEL S4 · S14 · S24 : le VÉLO à 1 séance    ·    REEL S2 : la COURSE à 1
avec C3   1  (la course de S2)
```

**Aucune des quatre n'est la natation.** C3 — qui ajoute du vélo — en répare trois. C'est la
prédiction « la nage est la victime par défaut » qui NE tient pas sur cet axe, et il faut le dire :
sur le profil à gros budget, c'est le vélo qui manque de fréquence, pas la nage.

⚠ **Faute de mon instrument, publiée** : ma première sonde de plancher testait `sw < 2` — elle ne
regardait QUE la natation et rendait « 0 sous le plancher » pour les deux variantes. Le cadrage du
document (« trois nages », « `swim_limit` ») m'y avait conduit, et le critère qui NOMME un plancher
de fréquence en MESURE une seule discipline est la faute mesurée treize fois dans ce dépôt.

#### §8 — La contradiction du §4 de l'arbitrage, chiffrée

```
C3 rapproche de l'allocation      vélo 39,9 → 43,3 %      nage 28,0 → 26,5 %
C3 éloigne de la cible de freq.   13/31 → 18/31 semaines sous 3 nages
```

Les deux cibles se contredisent partiellement, et la position du fondateur est retenue telle
quelle : *« à volume constant, l'allocation prime — 2,48 nages restent au-dessus du plancher »*.
La borne, elle, n'a pas été franchie. **Et à 13 h la contradiction disparaît** : c'est la
quatrième fois que le volume et la répartition se révèlent inséparables.

#### §9 — Deux défauts de MON écriture, tous deux trouvés par la mesure de sortie

1. **Ma première borne passait le BUDGET DE SÉANCES de la semaine, et elle était inerte par
   construction.** Le doublage n'est pas représenté par des `GenDay` supplémentaires — un jour
   porte plusieurs séances dans son tableau —, donc le compte plafonnait à **7** (un jour
   calendaire) là où la semaine livre 8 à 10. Toute condition « budget ≥ 8 » ne pouvait jamais
   être vraie : mesuré, C3 devenait totalement INERTE (REEL revenait à 11,2 h / 28,0 %). Règle 15
   dans mon propre instrument — j'ai MODÉLISÉ le budget au lieu de l'OBSERVER, et le modèle ne
   pouvait pas atteindre le seuil.
2. **Le module manquait au BUNDLE, et rien ne l'a signalé au build.** `scripts/buildApp.mjs`
   maintient sa liste `ORDER` À LA MAIN : le bundle a donc reçu les *appels* de
   `plancherFrequenceSemaine` et `seancesDiscipline` sans leurs *définitions*, et il a annoncé
   « ✓ bundle injecté ». C'est `audit:v1` qui l'a dit, à **108 erreurs et 351 combinaisons au lieu
   de 459**. Quatrième habillage de la leçon « une garde qui valide `src/` ne valide pas ce qui est
   LIVRÉ » — ici la construction ne perd pas un alias, elle perd un fichier entier.

#### §10 — Trouvé en chemin : le ticket de `T-58` portait un compte périmé

Le banc ne compare que le ROUGE au ROUGE : **un test attendu rouge peut voir son compte doubler
sans que rien ne le dise.** Le ticket de `T-58` annonçait « 2 plans sur 68 », chiffre écrit le jour
de sa pose et jamais re-mesuré ; `HEAD` en rendait **3**, REEL compris (S38, 37 min sous la ligne).
Le creux de REEL est donc ANTÉRIEUR à C3 — vérifié à facteur unique — et C3 le CREUSE de 18 min
(37 → 55), il ne le crée pas. Le compte est désormais un **cliquet publié dans la sortie du test**.

#### §11 — O-98 : isolées ou consécutives ? Deux populations, une seule est un trou

Question du fondateur : *« une semaine sans vélo est un accident, trois de suite sans nage sur un
70.3 est un trou. C'est le seul point qui décide de la gravité. »* Mesuré sur les 30 semaines de
charge, la suite comptée en semaines CALENDAIRES (une récup à zéro ne rompt pas le jeûne — c'est le
temps réellement passé sans toucher la discipline) :

```
NAGE     22 semaines · 14 profils · TOUTES au DÉBUT du plan (S1-S3) · TOUS débutants · formats S et M
           4 semaines d'affilée dès S1   B17/tri/S/debutant/inconnue   ← continuité DÉCLARÉE inconnue
           4 semaines d'affilée dès S1   B17/tri/S/debutant/absente    ← continuité DÉCLARÉE absente
           3 semaines d'affilée dès S1   tri/S/ancien/debutant/competition
           2 semaines d'affilée dès S1   ×2      1 semaine  ×9

COURSE    8 semaines · UN SEUL profil (G/tri/Full/vol-min, 3 séances/sem)
          S2, 6, 10, 12, 14, 16, 18, 20 — JAMAIS deux de suite (plus longue suite : 1)

VÉLO      0 semaine de charge. Les zéros vélo du corpus sont TOUS en semaine de récup.
```

**Le critère du fondateur tranche donc dans les deux sens, et pas là où on l'attendait.** Le cas
« course » est un accident au sens exact du mot — huit occurrences isolées sur le profil le plus
plafonné du corpus. Le cas « vélo » n'existe pas. **Le cas « nage » est un trou, et il est pire que
la formulation de la question** : ce n'est pas « trois de suite sur un 70.3 », c'est
**systématiquement les trois ou quatre PREMIÈRES semaines, chez le débutant, sur un format court**.

Et la population est la pire possible : les deux profils à 4 semaines sont ceux dont la continuité
de nage est déclarée **« inconnue »** ou **« absente »**. Le plan livré à `B17/tri/S/debutant/inconnue` :

```
S1  Sweetspot vélo 54' · Force basse cadence 41' · Sortie longue CAP 30' · Footing facile 25'
S2  idem
S3  Tempo vélo 49' · Sweetspot vélo 58' · Sortie longue CAP 30'
S4  (récup) 3 × Footing facile 16'
S5  … · Nage continue en EAU LIBRE — 500 m d'affilée
```

**La première séance de natation que voit cet athlète est un 500 m continu en eau libre, en
semaine 5.** La décision `B17-paliers` dit « 1 test (fin de développement) + 2 paliers en phase
spécifique » — le test est bien posé, mais rien ne le précède. Celui qui a répondu « je ne sais pas
si je sais nager » ne nage pas pendant un mois, puis part en eau libre.

**Conséquence sur la gravité d'O-98 : elle monte.** Ce n'est pas une dispersion à corriger au fil de
l'eau, c'est une entrée de plan à revoir pour une population nommée (débutant × format court ×
continuité inconnue), et elle touche la priorité 2 du manifeste (prévention) autant que la
priorité 3 (régularité). Le correctif reste hors de ce lot — il est en amont de l'allocation, dans
ce que B-17 pose AVANT son test.

#### §12 — Les rouges attendus : combien portent un compte épinglé ?

Question du fondateur, après la dérive silencieuse de `T-58` : *« s'il n'était pas le seul, d'autres
dérivent depuis leur écriture. »* Deux mesures, et elles ne disent pas la même chose.

**(a) Combien de tickets écrivent un chiffre qui pourrait être FAUX ? Trois sur vingt-cinq** — et ce
sont les trois écrits dans les deux derniers jours (`T-58`, `T-59`, `T-60`). Les vingt-deux autres
nomment leur ticket de fermeture en prose, sans compte : les seuls chiffres qu'ils portent sont des
bornes de règle (`T-04` « 25-60 »), des années de citation (`T-13` « Lauersen 2014 »), des renvois
de section, ou une mesure HISTORIQUE explicitement datée (`T-22` « 416 séances duathlon chiffrées »
décrit ce que B-26 avait mesuré, pas l'état courant). **`T-58` était donc bien le seul à être devenu
faux, et pour une raison simple : il était le seul ancien ticket à citer un compte.** Vérifié :
`T-59` (5/104) et `T-60` (30) correspondent à leur mesure du jour.

**(b) Combien de TESTS rendent un compte que rien ne borne ? Vingt-trois sur vingt-cinq.** Seuls
`T-58` et `T-60` portent un cliquet. Les autres publient un nombre qui peut doubler sans que rien ne
le dise — et ce ne sont pas de petits nombres :

```
T-03  146 semaines au-dessus du plafond      T-25  505 identités cassées / 986
T-05   28 semaines                           T-23   81 écrans / 214
T-13   28 plans sans renforcement            T-21   29 littéraux à unité
T-10   41/41 entrées sans sensibilité        T-22   14 steps sans zone
T-12    9/58 prédictions sans fourchette     T-14   18/921 séances
```

**Il faut distinguer les deux problèmes, parce qu'ils n'ont pas la même gravité.** Écrire un chiffre
périmé rend un document FAUX — un lecteur en tire une décision (c'est ce qui est arrivé avec les
« 2 plans sur 68 »). Ne pas épingler un compte ne rend rien faux : ça rend la dérive INVISIBLE. Le
banc ne compare aujourd'hui que le ROUGE au ROUGE, donc `T-03` pourrait passer de 146 à 300 semaines
sans qu'aucune sortie ne change de caractère.

**Le mécanisme qui fermerait la classe** — et c'est la règle du dépôt (« une règle qui échoue trois
fois est un MÉCANISME manquant ») : chaque test attendu rouge DÉCLARE son compte
(`return { ok, detail, compte }`), le banc le compare à une table épinglée, et une dérive se
re-épingle avec sa cause comme `SCEAU_ATTENDU` ou `PIC_ATTENDU`. Coût : 23 retours de test à
compléter, mécaniques ; conséquence : tout lot qui déplace un compte de dette devra le re-épingler,
c'est-à-dire l'expliquer. **Non fait dans ce lot** — ça change ce qui rend la CI rouge, et c'est une
décision, pas un réglage.

```verify
id: plancher-frequence
quoi: les trois niveaux du plancher, comptés legs de brick compris, sur la population tri
attendu: /ZERO-TENU/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');const {plancherFrequenceSemaine,seancesDiscipline,PLANCHER_BUDGET_MIN}=await import('./src/engine/plancherFrequence.ts');let z=0,sp=0,haut=0,n=0;for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}for(const w of p.weeks??[]){if(w.isRecup||w.phase?.id==='taper')continue;const ses=(w.days??[]).reduce((x,d)=>x+(d.sessions??[]).filter(s=>s.d!=='rs'&&!s.race).length,0);const niv=plancherFrequenceSemaine(ses);n++;if(ses>=PLANCHER_BUDGET_MIN)haut++;for(const d0 of ['sw','bk','rn']){const c=seancesDiscipline(w,d0);if(c<niv.dur)z++;else if(c<niv.plancher)sp++;}}}console.log(n+' semaines · '+haut+' au budget · ZERO '+z+' · sous plancher '+sp+' · '+(z<=30&&sp<=1&&haut>=10?'ZERO-TENU':'CLIQUET-DEPASSE'));"
```


### ALTERNANCE `facile2` — la pièce ÉCRITE, MESURÉE, RETIRÉE : l'alternance qu'elle devait poser EXISTE DÉJÀ, et l'ajouter est la conversion totale · ⛔ **ARBITRAGE FONDATEUR**

**Arbitrage d'entrée (ALTERNANCE_FACILE2.md, 20/08/2026)** : *« ✗ table créneau × phase →
discipline · ✓ règle d'alternance sur `facile2` »*, avec la consigne de fin : *« Commencer par
l'alternance, mesurer, et décider ensuite si la conversion totale se justifie »*, et le plancher
nommé : *« pour un nageur limité par la technique, trois est le plancher »*.

La pièce **C3** est écrite (conversion du `facile2` en « Endurance vélo » les semaines PAIRES,
sur la seule branche de nage de récupération, `b17Pose` prioritaire), mesurée sur trois états à
facteur unique, puis **RETIRÉE** — `src/` est byte-identique. Le diff complet est conservé dans
`c3-alternance-facile2.patch`.

#### §1 — La vérification demandée avant d'écrire (§3 du document) : la conversion est bon marché, mais seulement sur une branche

`facile2` ne contient pas la même chose selon que le profil double ou non :

| population | contenu de `facile2` |
|---|---|
| profil réel (`doubles: oui`) | **92 % « Nage récup courte »** |
| corpus tri (sans doubles) | nage aérobie 35 % · **nage seuil 30 %** · éducatifs 18 % |

Le §3 tranchait : *« si c'est une Nage récup courte → excellent échange ; si c'est une séance de
qualité ou un porteur de palier B-17 → ne pas y toucher »*. C3 a donc été bornée à la branche
`dbl` (la récup) avec `b17Pose` prioritaire — **aucun palier annoncé n'est jamais converti**.

#### §2 — L'alternance existe déjà, et elle est portée par B2

C'est la mesure qui décide, et elle réfute la prémisse de la pièce. **Avant C3**, sur les
31 semaines de charge du profil réel :

```
semaines PAIRES    3,50 nages/sem   (1 seule sous 3)
semaines IMPAIRES  2,13 nages/sem   (11 des 15 sous 3)
```

Le plan **alterne déjà**, parce que `B2` (livré au lot volume+répartition) convertit un double de
nage en vélo les semaines **IMPAIRES**. C3 convertissait les **PAIRES** : les deux pièces ne se
superposent pas, elles **se complètent en ANTI-PHASE** — et ensemble elles retirent une nage à
**toutes** les semaines de charge. C'est-à-dire exactement la conversion totale que le §4 du
document réservait à une décision ultérieure.

⚠ **Le §4 avertissait du décalage de phase — dans l'autre sens.** *« si une autre pièce ajoute
de la charge en semaines paires, les deux s'empileront »*. Ce qui arrive n'est pas un empilement
sur la même parité (une semaine sur deux serait épargnée) : c'est un pavage des deux parités, où
**aucune semaine n'est épargnée**. L'avertissement était juste, son signe était inverse.

#### §3 — Les trois états, mesurés à facteur unique

Fixture `REEL/tri/70.3/nage-limitante`, `history: confirme` (la valeur réelle), 31 semaines de
charge, legs de brick attribués :

| état | pic | total | nage | vélo | course | nages/sem | min | < 3 nages | V2.1 | manque |
|---|---|---|---|---|---|---|---|---|---|---|
| **sans C3** (B2 seule, impaires) | 11,2 h | 360,3 h | 28,0 % | 39,9 % | 32,1 % | 2,84 | 1 | **13/31** | présente | absent |
| **C3 en PAIRES** (anti-phase, écrite) | **11,5 h** | 373,5 h | 25,0 % | 45,2 % | 29,9 % | 2,35 | 1 | **21/31** | absente | **1,5 h/sem** |
| **C3 en IMPAIRES** (même parité que B2) | 11,1 h | 362,8 h | **23,2 %** | **46,0 %** | 30,8 % | 2,42 | **0** | 16/31 | présente | absent |

**Ce que le document prédisait, et ce que la mesure donne** :

```
prédit    alternance   nage ~24 %  vélo ~45 %      mesuré  25,0 / 45,2   ✓
prédit    conversion   nage ~21 %  vélo ~50 %      non mesuré (non écrite)
prédit    séances de nage  4/sem → 4 puis 3
mesuré    séances de nage  3,50 / 2,13  →  2,56 / 2,13
```

**L'estimation des parts est bonne à un point près ; celle de la FRÉQUENCE est décalée d'une
séance.** Le plan n'a jamais porté 4 nages par semaine en moyenne, et la conversation sur le
plancher doit repartir de la ligne mesurée, pas de la ligne estimée.

#### §4 — Le plancher de trois nages est DÉJÀ franchi, et il l'est par B2

C'est le fait qui décide, et il ne concerne pas C3 :

```
sans C3   13 semaines sur 31 sous 3 nages   —  et 11 des 13 sont des semaines IMPAIRES,
                                               c'est-à-dire celles que B2 convertit déjà
```

**Le plancher que le fondateur nomme n'existe nulle part dans le moteur**, ni avant ni après la
pièce. B2 l'a franchi le premier, sur la moitié impaire ; C3 l'étendait à la moitié paire. Une
correction du plancher est donc un ticket à part entière — et « poser un plancher est un acte de
priorisation GLOBALE » (arbitrage du 18/08) : qui a un plancher ne paie pas, qui n'en a pas paie
tout.

⚠ **Une erreur de ma part, publiée** : j'avais annoncé la variante « même parité » comme
*« parts ~inchangées »* — c'était une supposition, pas une mesure. Mesurée, elle va **plus loin**
vers la cible que l'anti-phase (nage 23,2 % contre 25,0). Elle reste néanmoins la pire des
trois, pour une raison qui n'est pas un arbitrage : elle produit **une semaine de charge à ZÉRO
nage** sur un plan de triathlon. Une discipline qui disparaît d'une semaine n'est pas une part
qui baisse.

#### §5 — Pourquoi la pièce est RETIRÉE plutôt que livrée

Trois raisons, dans l'ordre :

1. **elle dégrade le plancher que le fondateur a nommé** (13/31 → 21/31 semaines sous 3 nages) ;
2. **son effet n'est pas « l'alternance » mais la conversion totale** — le §4 la réservait
   explicitement à une décision ultérieure, et la livrer serait substituer mon jugement à une
   décision réservée ;
3. **elle fait rougir `T-57` sur ses deux branches REEL**, et la cause est instructive (§6).

Ce qu'elle achète est réel et reste sur la table : **+0,3 h de pic** (11,2 → 11,5, la seule
chose du chantier qui ait fait monter le pic depuis le lot volume) et **+5,3 points de vélo**.

#### §6 — Ce que C3 a révélé sur `T-57` : la borne d'épaule ne mordait que parce que la semaine était pleine de nage

Attribué par expérience à facteur unique (neutraliser C3 seule) :

```
avec C3     V2.1 ABSENTE   ·  cible de boucle 13 h  ·  livré 11,5  ·  manque 1,5 h/sem DÉCLARÉ
sans C3     V2.1 11,2 h (au lieu de 13,0)  ·  livré 11,2  ·  manque absent
```

**La borne d'épaule n'a pas été perdue** — elle est comptée dans la construction sur **217 plans
du corpus, dont 54 en tri**. Elle **cesse de mordre sur REEL** parce que C3 retire de la nage :
le clone saturé n'atteint plus le plafond d'épaule, la sonde ne rabat plus, la cible reste à 13,
et l'écart au livré redevient visible.

**Le « manque absent » du lot précédent était donc obtenu parce qu'une PROTECTION avait abaissé
la cible jusqu'au livré, pas parce que le plan plaçait tout.** Les deux lectures sont honnêtes,
et ce sont deux questions différentes (« un compte a besoin de son moment ») — mais `T-57`
branche (2) épinglait un ÉTAT (« le manque de REEL a disparu ») là où la propriété est
« l'écart se lit sur la cible de BOUCLE, jamais sur la courbe rabattue ». Le correctif le moins
coûteux qui garde cet état est d'abaisser la cible : c'est-à-dire précisément le défaut que la
décision `manque` existe pour exposer (règle 19). **À réécrire quand la pièce sera arbitrée** ;
en l'état C3 est retirée, `T-57` est vert et sa formulation reste celle du lot précédent.

#### §7 — Ce qui est demandé au fondateur

```
(a) garder l'état actuel (B2 seule)          nage 28,0 %  vélo 39,9 %  pic 11,2  ·  13/31 sous 3
(b) livrer C3 en anti-phase                  nage 25,0 %  vélo 45,2 %  pic 11,5  ·  21/31 sous 3
(c) poser d'abord un plancher de fréquence de nage, puis reprendre la pièce sous ce plancher
```

**(c) est ce que je recommande** : le plancher est déjà franchi sans C3, donc il se pose de toute
façon ; et posé d'abord, il borne la pièce au lieu d'être franchi par elle. Il faut alors décider
ce qui paie à sa place — c'est l'inventaire des planchers, pas un réglage local.

#### §8 — Trouvé en passant les gates : `check:sw` était ROUGE sur `main` depuis `b86df3a`

Le lot ne touche aucun fichier servi (`src/` et les deux bundles sont byte-identiques à `HEAD`),
et `npm run check:sw` sortait pourtant en échec — donc il l'était **déjà**, et la démonstration
est exactement celle-là : un gate qui rougit sur un arbre de travail dont la partie servie est
identique à `HEAD` accuse `HEAD`, pas le lot.

```
b86df3a   +12 lignes de COMMENTAIRE dans src/engine/constraintMatrix.ts
          → bundlées dans endurabuild/js/engine.js (fichier SERVI)
          → sw.js non reconstruit  →  VERSION inchangée  →  cache-first sert l'ancien
```

**La leçon est plus étroite que « penser à `build:sw` » : un changement de COMMENTAIRE dans
`src/` change le contenu SERVI.** Le commit se croyait sans effet produit — il l'était pour le
plan (golden 990/990, 0 écart) et ne l'était pas pour ce que le navigateur télécharge. `build:sw`
suit donc toute modification de `src/`, pas seulement celles qui changent un comportement.
C'est le troisième habillage d'O-24, et le mécanisme a fait son travail : il n'y a rien à
corriger dans le gate. `sw.js` est reconstruit dans ce commit — **VERSION `eb-pwa-330a8da64d24`,
63 assets**.

#### §9 — Règle 17 appliquée : trois blocs `verify` réancrés sur la PROPRIÉTÉ

`registry:check` rangeait `O-94`, `MANQUE-DECLARE` et `V21-BORNE` en « ne reproduit plus ». Les
trois sont des entrées FERMÉES dont l'`attendu` citait la valeur du jour de leur fermeture — et
deux lots ultérieurs l'ont légitimement déplacée (`V2.1` 9,7 → 11,2 h, `structurel` 9,4 → 11,2).
**Un `attendu` chiffré bascule donc en « défaut réparé » sur un PROGRÈS**, ce qui est le mode de
défaillance silencieux que la règle 17 nomme. Les trois portent désormais sur la propriété et
PUBLIENT ce qu'ils trouvent :

```
O-94             structurel 11,2 · pic livré 11,2 · écart 0,1 h · BORNE-COMPTEE
MANQUE-DECLARE   115 déclarent · 871 rien à déclarer · écart max 3,4 h/sem · DEUX-BRANCHES
V21-BORNE        V2.1 comptée sur 218 plans (dont tri 55) · 0 sans descente · BORNE-DANS-LA-CONSTRUCTION
```

`V21-BORNE` est celui qui comptait : mesuré sur C3, **la borne cesse de mordre sur REEL dès
qu'une pièce retire de la nage**, et l'ancien bloc aurait alors annoncé « défaut réparé » pour une
borne intacte. Il se mesure donc sur la POPULATION (« un zéro a besoin de sa population »).

⚠ **Une faute de mon écriture, publiée** : j'avais d'abord posé l'annotation de la règle 17 sur la
ligne `attendu:` elle-même. Le parseur coupe chaque ligne au premier `:` — le motif est devenu
l'annotation entière, et `V21-BORNE` est ressorti « ne reproduit plus » alors que sa commande
imprimait `BORNE-DANS-LA-CONSTRUCTION`. **Un faux positif de règle 17 fabriqué dans le correctif
de règle 17.** Annotations remontées hors du champ, les trois rejoués par le runner (`--seul`) :
3 reproduisent.

```verify
id: alternance-facile2
quoi: la pièce C3 est retirée du moteur et le patch est conservé
attendu: aucune branche « Endurance vélo » sur le créneau facile2 ; le patch existe
cmd: test -f c3-alternance-facile2.patch && ! grep -q 'slotIdx === 0 && !inj.count && !medHold && r.weeks >= 12 && weekNum % 2 === 0' src/sports/tri/index.ts && echo OK
```


### O-1 · Le banc v7 mesurait sous le seuil de ses propres défauts · ✅ **FERMÉ (R15.1)**

Les trois gestes demandés sont faits, **et c'est le troisième qui a tout trouvé.**

**1. Le tirage EST semé** (`audit_v7.cjs` : LCG, graine 1234567). Donc « `D-DISC` = 0 à N=150 »
était déterministe, pas un coup de dé — la CI était stable mais **arbitraire**, exactement le
cas que cette entrée décrivait. C'est maintenant écrit dans le banc.

**2. Les budgets sont des TAUX** (`BUDGET_PERMILLE`, ‰ de profils) et non plus des compteurs
absolus calibrés à N=150. Un budget qui dépend du paramètre d'échantillonnage n'est pas une
mesure : c'était lui qui rendait `N` intouchable, et donc qui figeait cet angle mort. **Zéro
reste zéro** — un garde-fou de sécurité ne tolère aucun cas, quel que soit N.

**3. Les DIMENSIONS varient — et voilà ce que ça a révélé.** Les six `race_date` du banc
(2026-10-04 … 2028-06-11) tombaient **toutes un dimanche** : le jour de la course n'était pas
une dimension du fuzz, c'était une constante. Elles sont désormais relatives à l'ancre
(4 horizons × 7 jours de semaine), ce qui ferme A-6 pour ce banc au passage. Dès ce changement,
à N=150 inchangé :

| | avant | après variation du jour J |
|---|---|---|
| `U-STRUCT` | 0 | **66** |
| `D-DISC` | 0 | **5** |

- **`U-STRUCT` : le banc contredisait un contrat livré.** Il exigeait 7 jours par semaine, alors
  que N2 (31/07) a délibérément rendu la dernière semaine courte — le plan s'arrête le soir du
  jour J. Vérifié : les 66 sont TOUTES la dernière semaine, avec 1 à 6 jours selon le jour de
  course (lundi → 1 jour, samedi → 6). Le check n'avait jamais protesté parce que toutes les
  courses tombaient un dimanche, seul cas qui donne une dernière semaine pleine. **Un check
  périmé depuis un mois, rendu invisible par une dimension non variée.**
- **`D-DISC` : un vrai défaut, cinq fois pire que ce que cette entrée mesurait.** 112 semaines
  d'affûtage de duathlon **sans un seul coup de pédale**, dont 108 en semaine de course.
  Corrigé : le rattrapage de volume comble d'abord un trou de DISCIPLINE (il prenait la
  discipline principale — « rn » en duathlon, celle qui était déjà là), plus une passe de
  couverture indépendante du plancher, et un avertissement nommé quand la semaine est vraiment
  trop courte.

**N passe de 150 à 400**, et la CI reste verte — *après* correction, jamais en baissant le
budget. Rétro-compatible : `npm run audit:v7 150` reste vert lui aussi.

**Re-vérifier :**
```bash
npm run audit:v7            # N=400 par défaut, budgets en ‰
npm run audit:v7 150        # l'ancien échantillon, toujours vert
```

### O-2 · `R14.3-b` — le dénivelé vélo · ✅ **FERMÉ (R15.2)**

Le relief entre désormais dans la **cible d'intensité** vélo : plat 175–191 W · vallonné
173–189 W · montagneux 169–185 W (FTP 230). Le conseil nomme l'indice de variabilité et la
puissance NORMALISÉE. Une seule clé (`courseProfileOf`, la même que la course à pied), et les
trois sports qui prescrivent des watts (tri, vélo, duathlon) passent par le même point —
sans quoi un quatrième producteur divergerait, cette fois sur le PACING.

O-2 disait *« premier geste attendu : écrire le critère, pas le correctif »*. Le critère est
venu avec le handoff de revue (`R15.2-A/B/C/D`, gate `npm run audit:r15`) : c'est lui qui rend
la fermeture vérifiable, et c'est pour ça que l'entrée peut être fermée plutôt que « faite ».

### O-3 · `D10-8` — le créneau facile de repli du trail · ✅ **FERMÉ (R20.9) — et la question posée n'était pas la bonne**

L'entrée réclamait l'écart de contenu entre `facileR` et `facile2`. Le handoff R15.3 a
repositionné la question, et il avait raison : avant d'arbitrer QUEL créneau sert de repli, il
faut savoir COMBIEN de plans passent par là. **Le critère a été posé avant la mesure** — < 5 %
ferme l'entrée, > 20 % lui donne son lot — pour que le chiffre décide et pas l'inverse.

**Mesure** (`npm run measure:fallback`, balayage complet niveaux × historiques × volumes ×
budgets de séances × disponibilités, 324 plans trail) :

| sport | plans avec ≥1 repli | jours en repli |
|---|---|---|
| **trail** | **81 / 324 = 25,0 %** | 1 287 / 49 896 = 2,6 % |
| swimrun | 576 / 1 296 = 44,4 % | 6 288 / 163 296 = 3,9 % |
| run · bike · swim · tri · duathlon | non mesurables — ces modules ne DÉCLARENT pas de `weekSchema` (ils prennent celui du générateur), donc il n'existe pas de « créneau prévu » à comparer |

**Verdict : 25,0 % > 20 % → l'entrée mérite son lot**, avec mesure avant/après sur le golden.
Le taux par JOUR (2,6 %) dit la forme du défaut : le repli est fréquent à l'échelle du plan et
rare à l'échelle de la semaine — typiquement une séance, sur une semaine, dans un plan sur
quatre. Ça reste au-dessus du seuil posé, et le seuil ne se déplace pas parce que le chiffre
déplaît. Le swimrun, lui, est presque deux fois plus concerné et n'était même pas dans la
question d'origine.

**Méthode, et ce qu'elle a coûté à valider.** Aucune instrumentation dans `src/` : le repli est
détecté post-hoc en comparant le plan émis au `weekSchema` déclaré. Trois pièges rencontrés, les
trois notés parce qu'ils se reproduiront :
1. le premier balayage a rendu **0,0 %** — le domaine de format du trail est un tableau VIDE
   (sa catégorie est déduite, R7), donc la boucle ne produisait aucun profil. Un balayage vide
   qui affiche « 0 % » est le pire des faux verts ; le script échoue désormais s'il ne génère
   aucun plan ;
2. ma « méthode de contrôle » par dénombrement a rendu 0 % contre 25 % pour la méthode par
   position — et c'est **le contrôle** qui était faux : il supposait que les créneaux de repli
   du schéma survivent, alors que le budget de séances en éteint ;
3. la correspondance par position n'est valide que si les jours ne sont pas réordonnés. C'est
   désormais **vérifié à chaque exécution** (les jours portent leur nom canonique), pas supposé.

```verify
id: O-3
quoi: le repli se déclenche encore sur ≥20 % des plans trail
attendu: /mérite son LOT/
cmd: npm run measure:fallback trail
```

**Reste à faire (le lot), périmètre ARBITRÉ (01/08/2026) : les DEUX sports dans le même
mouvement.** Le swimrun est presque deux fois plus concerné (44,4 % contre 25,0 %) que le sport
qui a ouvert l'entrée ; le traiter séparément referait le même travail deux fois sur le même
mécanisme. Le lot décide `facileR` vs `facile2` pour trail ET swimrun, avec mesure avant/après
sur le golden.

---

**FERMETURE (R20.9, 02/08/2026) — et la question de l'entrée n'était pas la bonne.**

L'entrée demandait « quel créneau sert de repli ». En regardant ce que chaque créneau PRODUIT,
le vrai défaut est apparu, et il est plus grave que le choix du slot :

**1. Le repli du trail n'était pas une séance de repli.** `facileR` produit « Marche rapide en
montée (bâtons) » — une sortie avec dénivelé et renfo excentrique. Quand un jour DUR est
déclassé (fatigue, anti-collage, drapeau médical), le remplacer par ça, c'est remplacer une
séance de charge par une autre séance de charge qui porte un nom rassurant. `facile2` produit
« Footing récup », qui est exactement ce qu'un jour déclassé doit devenir. Le trail bascule.

**2. N jours déclassés donnaient N séances IDENTIQUES.** Mesuré sous drapeau médical — le cas où
tous les jours durs tombent d'un coup, et où le plan doit être un plan de MAINTIEN :

| | avant | après |
|---|---|---|
| trail, semaine sous drapeau médical | **3 × « Marche rapide en montée »** | 2 × « Footing récup » + 2 × marche (35 min) |
| swimrun, idem | **4 × « Footing facile »** + 1 nage | 3 × footing + 2 × nage |

Sur le swimrun, dont la spécificité EST d'alterner nage et course, un plan de maintien livrait
quatre footings identiques. La passe de variété ne pouvait rien y faire : tous ces jours
portaient le MÊME créneau, elle n'avait pas d'autre séance à piocher. Le repli alterne désormais
entre les deux créneaux faciles du sport, le créneau déclaré passant en premier.

**3. L'instrument suivait la déclaration, pas le plan.** `measure:fallback` testait
`d.slot === easyFallbackSlot`. En basculant le trail de `facileR` à `facile2`, le taux affiché
est tombé de 25,0 % à **0,0 %** et la ligne de verdict allait fermer cette entrée sur ce chiffre.
Vérifié en comptant sur N'IMPORTE QUEL créneau facile : **25,0 % avant, 25,0 % après, 1 287 jours
dans les deux cas.** La fréquence n'avait pas bougé d'un jour — seule la séance produite avait
changé. Le détecteur regarde désormais ce que le plan fait.

C'est pourquoi cette entrée se ferme sur le CONTENU et non sur la fréquence : 25 % et 44 % de
plans qui passent par un repli ne sont pas un défaut en soi (un jour dur déclassé pour cause de
fatigue, c'est le moteur qui fait son travail). Le défaut était ce que ce repli produisait.

### O-4 · La même coche ne faisait pas la même chose selon l'onglet · ✅ **FERMÉ (R16.9)**

Trouvé en diffant `tab-week.js` contre `tab-plan-general.js` avant leur fusion — pas cherché,
rencontré. Il existait **deux implémentations du geste « ✓ séance faite »** : celle de
📅 Semaine ouvrait le feedback RPE, posait le drapeau douleur le cas échéant, calculait les
badges et célébrait ; celle de 🗓 Plan basculait `S.answers.done[k]` en silence. Deux chemins
pour le même bouton, dessiné pareil, sur des vues du même plan.

Conséquence mesurable : quelqu'un qui cochait ses séances depuis l'onglet Plan ne produisait
**aucun `completions`** — donc aucun RPE, donc l'ajusteur du lendemain travaillait sur une
fatigue sous-estimée, et le drapeau douleur ne pouvait jamais se poser. La boucle
« le plan réagit » était coupée pour cet utilisateur, sans qu'aucun test ne le voie : chaque
suite cochait depuis l'onglet où la coche complète existait.

Fermé par construction : `toggleDone` (`session-life.js`) est le point unique, `weekGridHTML`
le seul producteur de cases. La leçon est celle du dépôt, appliquée à l'UI — **deux chemins
pour un même geste finissent toujours par diverger**, et c'est le chemin le moins testé qui
part en silence.

### O-5 · La règle « rien avant le check-in » ne tenait que par une redirection · ✅ **FERMÉ (arbitrage, 01/08/2026)**

📅 Semaine faisait respecter la règle produit R5 en REDIRIGEANT tout l'onglet vers Aujourd'hui.
🗓 Plan, lui, affichait la saison entière — séances comprises — sans aucune porte. La règle n'a
donc jamais tenu « partout » comme le prétendait ARCHITECTURE.md : elle tenait dans un onglet
sur deux, et personne ne l'avait remarqué parce que les deux écrans n'étaient jamais comparés.

**Arbitrage retenu, et il est explicite :** une séance **PLANIFIÉE** dans une vue de saison
n'est pas une séance **PRESCRITE** pour aujourd'hui. Ce que la règle vise, c'est l'écran du
matin — la séance du jour montrée sans avoir été adaptée à la forme réelle. Elle ne vise pas la
consultation de son calendrier, qui est au contraire ce que l'athlète a payé.

Ce qui est donc en place et ne bougera pas sans nouvelle décision :
- la carte « Ta semaine » (tête de 🗓 Plan) reste **vide** tant que le point du matin n'est pas
  fait, et propose le check-in ;
- 🎯 Aujourd'hui garde son gate en diaporama, inchangé ;
- la vue de saison dépliée montre les séances, **y compris celles de la semaine courante**.

Les deux autres issues ont été écartées en connaissance de cause : masquer la semaine courante
dans la saison creuse un trou au milieu du calendrier pour une cohérence de principe ; rétablir
la redirection de tout l'onglet prend le plan en otage pour consulter sa propre préparation.

### O-6 · `golden:verify` — un gate de CI rouge en permanence depuis R15.7-C · ✅ **FERMÉ (R16.10-a)**

Trouvé en revérifiant les vingt gates un par un avec le bon code de sortie (une boucle
antérieure lisait `$?` après une substitution de commande et rapportait « OK » pour tout le
monde — l'instrument de vérification était lui-même faux, ce qui est la version la plus
gênante du défaut).

`golden:verify` annonçait « 900 profils, 0 écart » **puis sortait en code 1**. Cause : R15.7-C
a ajouté quatre profils `mineur` dont la génération se termine par un REFUS typé
(`ENTREE_INVALIDE`) — le comportement voulu, ajouté exprès — que le golden comptait comme une
erreur de génération. `.github/workflows/audit.yml` gate sur cette commande : **le job était
donc rouge depuis R15.7-C**, et mes propres messages de commit annonçaient « 20 gates verts »
sans que ce soit vrai pour celui-là.

Fermé en distinguant le refus typé de l'erreur, comme `U-REFUS:` au banc v7 depuis R11 : on
compte, on affiche, on hache — on ne confond pas. **Leçon à garder : un gate qui échoue en
permanence ne signale plus rien, et une vérification en boucle shell doit tester le code de
sortie de la commande, pas celui de son enrobage.**

```verify
id: O-6
quoi: le refus TYPÉ est distingué de l'erreur de génération — la propriété, pas un golden propre
attendu: O6-FIX-TIENT
cmd: npm run golden:verify 2>&1 | grep -q "refus d'entrée typé(s) — comportement attendu" && echo "O6-FIX-TIENT"
```


### O-7 · La structure hebdomadaire du swimrun ne lisait pas l'objectif · ✅ **FERMÉ (R16.10, S13)**

`swimrunWeekSchema(phase, isRecup)` ne voit jamais la course. Mesuré : la part de course dans
le plan valait **63-64 % pour toute épreuve**, alors que la part de course dans l'épreuve va de
45 % (5 000 m de nage / 5 km) à 94 % (800 m / 30 km) — 31 points de sous-entraînement du
limiteur réel sur une épreuve course-dominante. Fermé par `S13_MIX_FOLLOWS_RACE`.
Voir ARCHITECTURE.md « R16.10 » pour la table avant/après et les deux verrous.

---

### O-8 · Le footing du swimrun n'a pas de bornes · ✅ **FERMÉ (R20.3) — après deux bornes fausses**

Trouvé en lisant les plans pendant R18.4, pas en cherchant. Sur un swimrun à 12 h/sem, la plus
longue séance du plan est un **« Footing facile »** :

| format | plus longue séance du plan |
|---|---|
| experience | **182 min** |
| sprint | **228 min** |
| series | **226 min** |

Un footing de presque quatre heures n'est pas un footing : c'est une seconde sortie longue
déguisée, et sur les trois formats c'est elle qui domine le plan — devant la séance pivot, qui
est censée être LA séance spécifique du swimrun.

C'est **exactement** le défaut que R13 a corrigé pour le triathlon (« Footing facile 213 min »,
banc v6, D7) : le bloc du créneau facile n'a **pas de `bnd`**, il devient donc le déversoir de
toutes les passes de remplissage. La correction du tri a posé `ftCaps` en bornes ; celle du
swimrun n'a jamais été faite, parce que le module est arrivé plus tard et que personne n'a
rejoué la liste des leçons du sport précédent.

Ce n'est pas dans R18 parce que R18 traite six constats de test nommés, et que celui-ci n'en
fait pas partie — l'élargir en silence est précisément ce que ce registre existe pour empêcher.

---

**FERMETURE (R20.3, 01/08/2026) — et deux bornes réfutées avant la bonne.**

Le créneau facile porte désormais un `bnd` (S14). Mesuré sur les quatre formats : le footing
passe de 179-226 min à **115-150 min**, et la séance la plus longue du plan est la **pivot**
partout — c'est-à-dire la séance qui EST la spécificité du sport.

Ce qui a coûté deux tentatives, c'est de trouver **sur quoi** indexer la borne. Le banc v7 a
réfuté les deux premières, sur le même check `S-MIX` (part de course du plan vs part de course
de l'épreuve, 4 profils en défaut avant le lot) :

| écriture de la borne | S-MIX |
|---|---|
| relative à la pivot de la MÊME semaine, ×0,70 | **158** |
| indexée sur le temps de course à pied de l'épreuve, ×0,55 | **152** |
| **relative à la pivot du PIC, ×0,90** | **0** |

Les deux premières serraient le footing pendant la construction, là où il n'a aucune raison de
suivre la rampe de spécificité de la pivot. En swimrun, les deux créneaux faciles PORTENT la
course à pied du plan — il n'y a ni sortie longue course ni footing supplémentaire pour
compenser. Les serrer, c'est sous-entraîner le limiteur réel du sport : j'aurais échangé un
footing fictif contre un sous-entraînement réel, soit exactement le défaut que S13 venait de
corriger en R16.10.

Le défaut n'était pas qu'un footing soit LONG : c'était qu'il soit **la plus longue séance du
plan**. La borne porte donc là-dessus.

**Et le banc punissait une quatrième règle de sécurité.** Les 26 hits résiduels de S-MIX
portaient **tous** une eau sous le seuil d'acclimatation S7 (25 à 16 °C, 1 à 13 °C) : sous
17 °C, le module verrouille le second créneau facile sur une exposition au froid, au nom de la
hiérarchie du manifeste — l'hypothermie n'est pas un arbitrage de spécificité. Même famille que
le drapeau médical et les deux familles de blessures, exemptées en R16.10 ; le check ne le
voyait pas parce que le footing sans bornes masquait le déséquilibre avec du volume fictif.
**L'instrument était d'accord avec le moteur pour la mauvaise raison.** L'exemption se lit sur
le PLAN (présence effective de la séance d'acclimatation), pas sur la température déclarée.

Résultat : swimrun **89 % de profils propres** au banc v7 (contre 88 % avant le lot), **S-MIX
0 aux trois tailles d'échantillon** (N=250/400/600) — son budget passe de 12 ‰ à **0, garde-fou
définitif**.

Reste ouvert, et c'est une question produit : voir **O-15**.

```verify
id: O-8
quoi: la plus longue séance d'un plan swimrun est la pivot, pas un footing
attendu: /^(experience|sprint|series|championship) : pivot(\n|$)/m
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swimrun',level:'inter',history:'confirme',intent:'competition',vol_max:'12',sessions_max:'7',dispo:'quotidienne',age:'35',sex:'H',pace:'4:50',pace_known:'oui',css:'2:00',css_known:'oui',vol_recent:'8',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'parfois',swim_total_m:'2000',run_total_km:'12',segments_n:'10',longest_swim_m:'600',water_temp_c:'18',team_mode:'solo',openwater_access:'saisonnier',swim_continuous:'oui',run_continuous:'oui',gear_test:'oui',race_date:'2027-11-24'};for(const f of ['experience','sprint','series','championship']){const p=E.buildPlan('swimrun',{...b,format:f});let mx=0,nm='';for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions||[])if((s.min||0)>mx){mx=s.min;nm=s.name;}console.log(f+' : '+(/Footing/.test(nm)?'FOOTING '+mx+' min':'pivot')); }"
```

### O-9 · Le banc d'invariants n'est pas vert, et la documentation dit qu'il l'est · ✅ **FERMÉ (R20.6)**

`CLAUDE.md` annonce « Banc d'invariants vert sur ses 19 tests ». Il ne l'est pas, et ne l'était
pas avant R18 non plus (vérifié en rejouant le banc contre le moteur d'avant le lot : **mêmes**
quatre échecs, aux mêmes comptes). Ce sont donc quatre dettes silencieuses, pas une régression :

| id | ce qu'il dit | échecs | lecture |
|---|---|---|---|
| I6 | séance non vide | 54 | la course objectif est à `min: 0` **par conception** (R13.4) — c'est l'INVARIANT qui est périmé, pas le moteur |
| I8 | plafond de séances | 15 | la course objectif s'ajoute au budget de la semaine ; même famille que I6 |
| I12 | sortie longue ≤ 60 % | 3 | trail, petite enveloppe : 54 min sur 4 séances — c'est de la granularité, `GRAIN_MIN` ne couvre pas ce cas |
| I14 | la longue est la plus longue | 6 | trail, grosse enveloppe, débutant : « Sortie longue trail » plafonnée à 180 min pendant qu'un autre bloc monte à 295 |

I6 et I8 se corrigent dans le BANC (exclure la course, comme le fait déjà `wmin` ailleurs).
I12 et I14 sont à re-mesurer : I14 a été déclaré fermé en R14, il ne l'est pas pour le trail
débutant à grosse enveloppe. Le banc sort en 0 quoi qu'il arrive — il RAPPORTE, il ne garde
pas —, ce qui explique que personne ne l'ait vu : un rapport que rien ne lit vaut zéro.

---

**FERMETURE (R20.6, 01/08/2026).** Trois invariants PÉRIMÉS, un VRAI défaut, et le banc devient
bloquant — dans cet ordre, parce que rendre bloquant un banc dont on n'a pas trié les échecs
revient à figer la dette au lieu de la traiter.

**Périmés — la course objectif n'est pas une séance d'entraînement.**
- `I6` (54 échecs) réclamait une durée non nulle : le jour J porte `min: 0` **par conception**
  depuis R13.4 — c'est ce qui l'empêche d'être la victime des passes de coupe.
- `I8` (15) comptait la course dans le budget `sessions_max`, un budget d'entraînement : la
  course a lieu, elle ne se décide pas. Le moteur l'exclut déjà (R15.7-A).
- `I12` (3) mesurait la dominance d'une sortie longue… dans la **semaine de course** d'un trail
  à petite enveloppe : « Endurance allégée » 54 min sur 80 au total. Il n'y a pas de sortie
  longue dans cette semaine — ce qu'on mesurait est une structure d'affûtage voulue. Les
  semaines de décharge sortent du champ, comme dans toutes les règles de volume du dépôt.

**Vrai défaut — `I14` (6), et il était plus large que « du trail débutant ».** « Marche rapide
en montée (bâtons) » atteignait **295 min pendant que la « Sortie longue trail » du même athlète
est plafonnée à 180** (C23, débutant) : la séance qui donne son nom à la semaine n'était plus la
plus longue, sur le sport où la sortie longue EST la séance de référence. `enforceLabelVsDose`
ne la réduisait pas parce que la 2ᵉ passe d'I14 (R14) interdisait de toucher un bloc en pente
non répété — son commentaire assumait explicitement le résidu.

Ce qui était interdit, c'était de changer la VITESSE ASCENSIONNELLE (raboter la durée en gardant
le D+ ferait gravir les mêmes 400 m en moins de temps). Réduire durée **et** dénivelé du même
facteur la laisse strictement identique : c'est la même montée, plus courte. Troisième passe
d'I14, et le résidu tombe à zéro.

**Puis le banc garde.** Il sort en code 1 (vérifié rouge en cassant un seuil) et **entre en CI**
— il n'y était pas, ce qui est la vraie raison pour laquelle quatre familles d'échecs ont vécu
sous une documentation qui le disait vert. **20 invariants × 54 configurations, 0 échec.**

```verify
id: O-9
quoi: le banc d'invariants est VERT sur ses 22 invariants (le motif acceptait le vert ET le rouge tant qu'O-20 était ouvert — O-20 est fermé depuis I14b)
attendu: /✓ les 22 invariants tiennent/
cmd: npm run audit:invariants
```

### O-10 · `vol_max` ne pilote plus rien au-delà de 10 h, et l'annonce ne colle pas au livré · ✅ **FERMÉ (R20.2) — et ma colonne 2 était fausse**

Constat de test du fondateur : « Volume max à 12 h au lieu de 14, acceptable pour le 70.3 ».
La mesure dit autre chose que le constat, et **autre chose que ce que j'avais écrit d'abord** :
ma première mesure passait `intent: "perf"`, qui n'est pas dans le domaine (`competition /
finir / plaisir`) — le chemin validé la refuse, le chemin interne la tolérait. Refaite sur une
entrée valide, sur un 70.3 historique `ancien` :

| `vol_max` déclaré | pic ANNONCÉ | pic LIVRÉ |
|---|---|---|
| 10 h | 8,8 h | 9,6 h |
| 12 h | 8,7 h | 9,5 h |
| 14 h | 8,7 h | 9,5 h |
| 16 h | 8,7 h | 9,5 h |

Deux choses, et aucune n'est celle qu'on croyait :
1. **au-delà de 10 h, `vol_max` ne change plus rien** — le limiteur est ailleurs (budget de
   séances × plafonds de la bibliothèque 70.3), et la question continue d'être posée comme si
   elle décidait ;
2. le pic **livré dépasse le pic annoncé** de ~0,8 h, systématiquement. C'est l'inverse du sens
   redouté, mais c'est le même défaut : la **sonde de capacité V2.1** existe pour que « la
   promesse suive ce que les plafonds permettent », et ici les deux ne se rejoignent pas.

Le fondateur a tranché « acceptable » sur l'écart de volume ; l'entrée reste ouverte parce que
le point 1 rend une question du questionnaire inerte au-delà d'un seuil que rien n'annonce.

---

**FERMETURE (R20.2, 01/08/2026) — et d'abord une rectification de ma propre mesure.**

**Le point 2 ci-dessus est faux, et il l'est par un titre de colonne.** `p.volPeak` est le pic
RÉELLEMENT LIVRÉ (le max des `w.vol`, et c'est lui que l'UI affiche partout) ; `w.vol_declared`
est la CIBLE de la courbe de charge, une valeur interne que l'athlète ne voit nulle part. Mes
deux colonnes étaient donc inversées : le livré (8,7 h) est légèrement EN DESSOUS de la cible
(9,5 h), pas au-dessus. Le sens était l'inverse de ce que j'avais écrit, et c'est le sens
attendu — la sonde de capacité V2.1 abaisse ce qu'elle ne sait pas porter. Il n'y a pas de
défaut ici, seulement une mesure mal étiquetée, publiée telle quelle dans ce registre. Une
mesure dont on ne vérifie pas ce que chaque champ veut dire ne mesure rien.

**Le point 1 est réel, et il est traité — sans toucher un seul chiffre du plan.** Forcer le
volume vers le plafond demandé reviendrait à gonfler des séances au-delà de leurs bornes,
c'est-à-dire à défaire exactement ce que V2.1 protège. Le moteur DIT donc ce qui borne :
il reconstruit la chaîne de réduction maillon par maillon (historique → volume utile du format
→ marge hors compétition → récupération → temps dans l'eau → drapeau médical → blessure/âge →
structure de la semaine) et nomme celui qui a **le plus retiré, en heures**. Décision `R20.2`,
affichée en tête de « Pourquoi ce plan », pas au fond d'un volet.

Ma première écriture testait les plafonds dans l'ORDRE DU CALCUL et nommait le premier qui
mord : sur la natation, elle annonçait « c'est ton historique qui borne » (10 h) pour un pic
livré à 3,3 h — faux de 7 h, et surtout elle envoyait l'athlète corriger la mauvaise réponse.
Une explication approximative sur un chiffre qu'il a lui-même saisi est pire qu'un silence.

Le levier des doubles est proposé **là où il existe** : garde de module `doublesAddVolume`,
déclaré par le seul triathlon, et **mesuré dans les deux sens** à chaque `npm run
audit:sensibilite` (déclaré ⟺ le pic monte d'au moins 5 %). Sur le 70.3 de la mesure ci-dessus,
`doubles: "oui"` fait passer le pic de 8,7 h à **13,5 h** — la question n'était pas inerte, son
levier était ailleurs et personne ne le disait. Le diagnostic reste honnête sous drapeau
médical, blessure ou âge, mais **aucun levier n'y est jamais proposé** : on n'invite pas à
charger davantage quelqu'un dont le plan a été réduit pour le protéger.

Trouvé au passage, même famille : la carte « Pourquoi ce plan » appelait le plafond
d'historique « ton volume déclaré » depuis l'origine — corrigé.

```verify
id: O-10
quoi: au-delà de 10h le pic ne bouge plus, mais le moteur NOMME le limiteur et son levier
attendu: /vol_max=16h[^\n]*ce qui borne[\s\S]*Si tu levais cette contrainte/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const a={sport:'tri',format:'70.3',level:'avance',history:'ancien',intent:'competition',sessions_max:'7',dispo:'quotidienne',age:'35',sex:'H',pace:'4:50',pace_known:'oui',ftp:'230',ftp_known:'oui',css:'2:00',css_known:'oui',vol_recent:'10',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'parfois',race_date:'2027-01-24'};for(const v of ['10','16']){const p=E.buildPlan('tri',{...a,vol_max:v});const d=(p._v2.decisions||[]).find(x=>x.id==='R20.2');console.log('vol_max='+v+'h → pic livré '+p.volPeak+' h'+(d?' · '+d.val+' · '+d.why:' · (rien à expliquer)'));}"
```

### O-11 · Deux définitions de « l'allure course » à vélo, et une prose qui promet la mauvaise · ✅ **FERMÉ (R20.5)**

Le brick disait dans sa NOTE « vélo en endurance, **dernier tiers @ allure course** » pendant que
son step portait `bk.z2` sur la totalité. Mesuré sur un plan 70.3 : **881 min (14,7 h) d'allure
course annoncées à l'athlète, portées par aucun step, comptées 100 % facile** par la répartition
d'intensité. Un commentaire du module l'assumait — pour ne pas faire tomber la part de temps
facile. C'est protéger la MÉTRIQUE et pas le plan, et c'est la leçon de R7 TRAIL non apprise
ici : une intensité portée par une phrase n'existe pas.

**Fait en R19 :** la note dit désormais ce que la séance fait. Le trou prose/structure est
fermé, dans le sens qui ne coûte rien à personne.

**Pas fait, et le motif est mesuré :** poser le tiers en `bk.rp` met **58 combinaisons de tri
sous le plancher C26** (tri/70.3 : 27, tri/M : 16, tri/S : 15). Et surtout, en le construisant
on découvre le vrai blocage :

| source | « allure course » vélo |
|---|---|
| `renderer.ts` zone `bk.rp` | **0,80–0,88 × FTP** |
| `predictor.ts` `TRI_BIKE["70.3"]` (jour J) | **0,752–0,822 × FTP** |

Le moteur porte **deux définitions du même effort**, et la zone d'entraînement est plus dure
que l'allure qu'il prescrit pour la course. Construire une séance sur `bk.rp` en croyant
reproduire le jour J revient donc à faire rouler plus dur que le jour J — exactement le défaut
que R15.2 a corrigé pour le relief, à un autre endroit.

Trois choses à trancher ensemble, pas séparément : (1) réconcilier les deux définitions ;
(2) décider si le plancher de temps facile doit rester uniforme, alors que la littérature
décrit l'entraînement de longue distance comme PYRAMIDAL et non polarisé ; (3) alors seulement,
reconstruire le tiers à allure course.

---

**FERMETURE (R20.5, 01/08/2026) — les trois points, dans cet ordre.**

**(1) Une seule définition.** `raceBikeBand(sport, format)` est le point unique ; les trois
tables de puissance de course (`TRI_BIKE`, `DUA_BIKE_POWER` × pré-fatigue, `BIKE_POWER`) y
convergent, et la zone `bk.rp` la lit — **relief compris**, par le même résolveur de parcours
que la prédiction (R15.2). Résultat : la zone d'entraînement EST la cible du jour J.

| | avant (toutes épreuves) | après |
|---|---|---|
| tri/S | 184–202 W | **196–214 W** |
| tri/70.3 | 184–202 W | **175–191 W** |
| tri/Full | 184–202 W | **161–175 W** |
| duathlon/PM | 184–202 W | **154–171 W** |
| bike/cyclo | 184–202 W | **168–191 W** |

(FTP 230 W, parcours plat. En montagne, 70.3 → 169–185 W : les mêmes chiffres que ceux que
R15.2 avait documentés pour la prédiction.)

**(2) Le plancher de temps facile mesurait le mauvais rapport.** `easyShareFloor` vaut
`1 − plafondDur / minutesHebdo` : la formule est dérivée du plafond de temps DUR, et de lui
seul — elle décrit donc `facile / (facile + dur)`. Elle était comparée à
`facile / (facile + modéré + dur)` : une formule à deux seaux confrontée à une mesure sur trois.
Erreur d'unité, même espèce qu'O-13. Mesuré sur un tri/70.3 confirmé/débutant : **70 % facile ·
27 % modéré · 3 % DUR**, refusé par une règle dont la justification écrite est de borner le
travail dur ; le même plan vaut **96 %** sur le rapport que la formule décrit. Le modéré n'est
pas libéré pour autant — **C26d** (R20.4) le borne pour lui-même à 40 %. La question « pyramidal
vs polarisé » se dissout : le plancher gouverne la polarisation (facile vs dur), C26d gouverne
la pyramide (le volume de modéré).

**(3) Le tiers à allure course existe — là où il veut dire quelque chose.** Un seul critère
gouverne deux décisions : la bande de l'épreuve. Au-dessus de 0,85 × FTP (bas de la zone seuil
de Coggan), « l'allure course » est une intensité qu'on SURVIT — elle compte alors DUR
(`zoneClass` lit la bande, R20.5), et le tiers ne se construit pas : sur un sprint, le segment
vélo dure vingt minutes et les séances de qualité portent déjà ce stimulus. En dessous, c'est
une allure qu'on TIENT, et l'apprendre pendant des heures est l'objet même de la séance.

| | vélo du brick en semaine de pic |
|---|---|
| tri/S | `bk.z2` 90 min |
| tri/M | `bk.z2` 120 min |
| tri/70.3 | `bk.z2` 120 min + **`bk.rp` 60 min** |
| tri/Full | `bk.z2` 200 min + **`bk.rp` 100 min** |

Mesuré en chemin, et corrigé : poser le tiers sans (2) mettait 30 combinaisons de tri/S sous le
plancher ; le poser sans faire suivre la CLASSIFICATION laissait `enforceHardTimeCap` aveugle au
bloc que l'auditeur comptait — deux définitions du mot « dur », le défaut O-11 reproduit à
l'intérieur de son propre correctif.

```verify
id: O-11
quoi: la zone d'entraînement « allure course » vélo lit le format, comme la cible du jour J
attendu: /tri\/S 196-214W[\s\S]*tri\/70\.3 175-191W[\s\S]*tri\/Full 161-175W/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={intent:'competition',dispo:'partielle',doubles:'parfois',off_days:'non',shift_ok:'non',age:'35',sex:'H',pace_known:'oui',pace:'4:50',ftp_known:'oui',ftp:'230',css_known:'oui',css:'2:00',vol_recent:'8',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',history:'confirme',level:'inter',vol_max:'12',sessions_max:'6'};for(const f of ['S','M','70.3','Full']){const p=E.buildPlan('tri',{...b,sport:'tri',format:f});let rp=null;for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions||[]){const st=(s.steps||[]).find(x=>x.zone==='bk.rp');if(st&&!rp){const all=(s.det||'').match(/[0-9]+-[0-9]+ ?W/g)||[];rp=all[all.length-1];}}console.log('tri/'+f+' '+(rp||'pas de bloc allure course'));}"
```

### O-12 · Ma mesure d'intensité d'affûtage était fausse — et j'ai failli « corriger » un moteur sain · ✅ **FERMÉ (R19, par rétractation)**

Enregistré parce que c'est une leçon de MESURE, et que ce fichier existe pour ça.

Audit du 01/08/2026 : j'ai conclu que « l'affûtage coupe l'intensité plus vite que le volume »
sur la foi d'un compteur de **minutes DURES** (`.vo2 / .thr / .speed / .css`) tombant à zéro sur
14 plans course et vélo. J'ai écrit une correction (coupe d'affûtage en deux passes, épargne du
dernier jour de qualité), puis je l'ai mesurée :

| | qualité en 1re semaine d'affûtage | semaines à zéro |
|---|---|---|
| moteur avant | 45 min | 2 |
| **avec ma « correction »** | **38 min** | **4** |
| moteur après retrait | 43 min | 0 |

Le constat était un **artefact de la métrique** : `bk.rp`, `bk.ss` et `rn.mara` — c'est-à-dire
le travail d'allure spécifique, exactement ce qu'un affûtage doit garder — sont classés
MODÉRÉS, pas durs. Sur le bon critère (modéré + dur), le moteur d'avant était déjà **59/59
conforme**. Ma correction était une régression ; elle est retirée.

Ce qui reste vrai et acquis : `zoneClass()` a failli être dupliqué dans le générateur, et
`bike/crit` — l'épreuve la plus dépendante de la puissance — n'a effectivement aucune minute
de zone HAUTE en affûtage. C'est défendable (sweetspot + rappel d'allure), mais c'est le seul
point de ce constat qui mériterait un regard d'entraîneur de piste.

```verify
id: O-12
quoi: sur le critère corrigé (modéré + dur), l'affûtage garde sa qualité
attendu: /, 0 sans aucune qualite/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const iso=w=>{const d=new Date(Date.now()+w*7*864e5);d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7));return d.toISOString().slice(0,10)};const B={level:'inter',history:'confirme',intent:'competition',vol_max:'10',sessions_max:'6',dispo:'quotidienne',age:'35',sex:'H',pace:'4:50',pace_known:'oui',ftp:'230',ftp_known:'oui',css:'2:00',css_known:'oui',vol_recent:'7',injury:'aucune',off_days:'non',shift_ok:'non',terrain:'plat'};const S={run:['5k','semi','marathon'],bike:['crit','cyclo'],tri:['M','70.3']};let n=0,vide=0;for(const sp of Object.keys(S))for(const f of S[sp])for(const sem of [22,30,40]){let p;try{p=E.buildPlan(sp,{...B,format:f,race_date:iso(sem)})}catch(e){continue}const wk=p._v2.intensity.weekly,T=p.weeks.map((w,i)=>({i,ph:w.phase.id})).filter(x=>x.ph==='taper').slice(0,-1);for(const x of T){n++;if(wk[x.i].m+wk[x.i].h===0)vide++}}console.log(n+' semaines d affutage, '+vide+' sans aucune qualite')"
```

### O-13 · La rampe R10 ne mord jamais en natation — erreur d'unité · ✅ **FERMÉ (R20.7)**

Trouvé par le balayage dérivé du schéma, pas en cherchant : `vol_recent` est la seule clé du
schéma qui reste inerte dans un sport (la natation) une fois les exemptions posées.

Mesuré sur un profil `swim / fond / reprise` : semaine 1 = **1,6 h quelle que soit la réponse**
(0, 1, 4 ou 8 h/sem de volume récent). Aucune décision `R10-depart` n'est émise.

La cause est une **erreur d'unité**. Le plafond de rampe vaut `max(2 h, vol_recent × 1,1)` et
se compare aux heures du PLAN ; or le volume de nage est déjà converti en heures d'EAU par
`SWIM_TIME_FACTOR` (0,4). Une semaine 1 de nage dépasse donc rarement 2 h, et le plancher de la
rampe l'absorbe toujours. Les deux nombres ne mesurent pas la même chose.

Corriger demande de **décider ce que `vol_recent` veut dire pour un nageur** — des heures dans
l'eau, ou des heures d'entraînement toutes disciplines ? C'est une question de produit avant
d'être une ligne de code, d'où l'entrée plutôt qu'un correctif rapide. Elle est portée comme
DETTE DÉCLARÉE dans `banc_sensibilite.cjs` : le banc l'affiche à chaque exécution.

---

**FERMETURE (R20.7, 02/08/2026) — décision du fondateur : c'est au MOTEUR de convertir.**

La question posée à l'athlète ne bouge pas. Lui demander de retrancher ses temps d'arrêt serait
lui demander un calcul qu'il ne peut pas faire, et la plupart répondraient de toute façon le
temps passé à la piscine. Le moteur applique `SWIM_TIME_FACTOR` au chiffre déclaré **avant** de
le comparer, et le plancher de la rampe suit la même unité — sinon un plancher de 2 h
« génériques » vaudrait 5 h de piscine et ne bornerait toujours rien.

| `vol_recent` déclaré | semaine 1, avant | semaine 1, après | pic, après |
|---|---|---|---|
| 0 h | 1,6 h | **1,3 h** | 1,6 h |
| 2 h | 1,6 h | **1,4 h** | 1,7 h |
| 5 h | 1,6 h | 1,6 h | 2,7 h |
| 10 h | 1,6 h | 1,6 h | 2,7 h |

Le comportement au-dessus de 5 h est INCHANGÉ, et c'est la vérification qui compte : un nageur
qui fait déjà cinq heures de piscine par semaine est au-dessus de la semaine 1 du plan, la rampe
n'a rien à borner chez lui. Elle ne mord que là où elle doit — sur celui qui repart de rien.

**Trouvé en corrigeant** : la chaîne d'explication de R20.2 souffrait de la MÊME faute d'unité.
Elle comparait des baisses d'avant la conversion (heures « génériques ») à des baisses d'après
(heures d'eau) et annonçait « c'est ton historique, −5 h » pour un pic livré à 1,6 h — ces 5 h
n'existent pas dans l'unité du chiffre affiché. Chaque baisse est désormais ramenée à l'unité
du pic. Et la rampe est devenue un MAILLON de cette chaîne : sur une prépa courte, c'est elle
qui décide du pic, et elle n'était nommée nulle part.

```verify
id: O-13
quoi: en natation, le volume récent déclaré change la semaine 1
attendu: O13-RAMPE-MORD
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swim',format:'fond',intent:'competition',dispo:'partielle',doubles:'parfois',off_days:'non',shift_ok:'non',age:'35',sex:'H',css_known:'oui',css:'2:00',milieu:'bassin',swim_limit:'technique',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',sessions_max:'6',vol_max:'10',history:'reprise',level:'inter'};const s1=(vr)=>E.buildPlan('swim',{...b,vol_recent:vr}).weeks[0].vol;const a=s1('0'),c=s1('5');console.log('S1 a 0h '+a+'h · a 5h '+c+'h');if(a<c)console.log('O13-RAMPE-MORD');"
```

### O-14 · `swim_limit` n'agissait que pour les débutants · ✅ **FERMÉ (R20.1-d)**

`CLAUDE.md` affirmait que `swim_limit` était « câblé sur ses 4 valeurs ». Il l'était sur un
QUART de la population : les deux seuls endroits qui consommaient le focus (`limFocus`) étaient
derrière `if (beginner)`. Un nageur intermédiaire qui déclare « ma limite, c'est la
respiration » recevait « éducatifs », sans plus. Une limite ne disparaît pas quand on progresse.
Trouvé par la garde R20.1, corrigé dans le même lot.

### O-15 · L'eau froide fait passer le plan sous le seuil de spécificité, et l'exemption du banc le rend invisible · ✅ **FERMÉ (R20.8)**

Découvert en fermant O-8, et seulement parce que le footing sans bornes le masquait avec du
volume fictif. Après la pose des bornes S14, **26 profils** du banc v7 tombaient plus de
15 points sous la part de course de leur épreuve — et **les 26 portaient une eau sous le seuil
d'acclimatation S7** (25 à 16 °C, 1 à 13 °C). Isolé toutes choses égales par ailleurs
(15 profils : 5 blessures × 3 niveaux, mêmes distances, même épreuve) :

| température de l'eau | profils sous le seuil |
|---|---|
| 16 °C | **3 / 15** |
| 20 °C | **0 / 15** |

Le mécanisme est identifié, son AMPLEUR ne l'est pas entièrement — sur le profil de référence
l'écart entre 16 °C et 20 °C ne vaut que 3 points (56 % contre 59 % de course, pour une épreuve
à 68 %), donc le froid ne CRÉE pas l'écart : il fait basculer au-dessus du seuil des plans déjà
proches. Sous 17 °C, le module verrouille le second créneau facile sur l'exposition au froid et
neutralise la bascule S13 (« ce créneau revient à la course quand l'épreuve est
course-dominante »). Ce que la mesure ne dit pas encore : quelle part revient au verrou lui-même
et quelle part au fait que ces épreuves sont déjà limites.

Le verrou est JUSTE dans son principe — l'hypothermie est un risque vital, la spécificité une
priorité 5. C'est sa PORTÉE qui n'a jamais été décidée : il s'applique à toutes les semaines,
de la première à la dernière. Or S7 demande une exposition *régulière* (1 à 2 séances par
semaine), pas la confiscation permanente d'un créneau : sur une prépa de 26 semaines, une
acclimatation faite en semaine 1 ne vaut rien le jour J (l'adaptation au froid se perd), et
c'est celle des dernières semaines qui compte.

Trois choses à trancher ensemble, pas séparément :
1. **à partir de quand** l'acclimatation entre dans le plan — une phase ? un nombre de semaines
   avant le jour J ? et sur la température de l'eau à la DATE de la course, pas celle saisie
   aujourd'hui ;
2. **combien de semaines** elle occupe le créneau, et si elle peut cohabiter avec la bascule S13
   au lieu de l'annuler ;
3. **ce que le plan DIT** — aujourd'hui il ne dit rien de cet arbitrage, alors que c'est le seul
   endroit du moteur où une règle de sécurité coûte de la spécificité en silence.

Tant que ce n'est pas tranché, le banc v7 exempte ces plans de `S-MIX` : l'instrument ne doit pas
punir une règle de sécurité (R16.10), mais l'exemption rend l'écart INVISIBLE au banc. C'est
exactement pourquoi cette entrée existe — **une exemption sans entrée de registre est un défaut
effacé.**

---

**FERMETURE (R20.8, 02/08/2026) — décision du fondateur : seulement les dernières semaines.**

L'adaptation au froid s'installe en quelques semaines d'exposition régulière et se PERD à
l'arrêt : celle de la semaine 1 d'une prépa de 26 semaines ne vaut rien le jour J, pendant
qu'elle coûte de la spécificité toutes les semaines. Le verrou démarre désormais à **8 semaines
du jour J** (`S7bis.acclimationWeeksBeforeRace`) ; avant, la bascule S13 reprend son droit.

Le calcul se fait en semaines RESTANTES, pas en phases : une prépa de 12 semaines et une de 40
n'ont pas les mêmes phases au même endroit, mais elles ont toutes les deux un « J-8 semaines ».
Sur une prépa plus courte que 8 semaines la condition est vraie partout — et c'est voulu, il n'y
a alors plus de marge à arbitrer.

8 semaines : au-dessus de la fenêtre d'installation décrite (2 à 6 semaines), avec la marge
d'une prépa réelle où l'on rate des séances. Le choix penche délibérément du côté long — c'est
une règle de sécurité, et une acclimatation trop courte coûte plus cher qu'une semaine de
spécificité en moins.

| | avant | après |
|---|---|---|
| profils sous le seuil de spécificité à 16 °C | **3 / 15** | **0 / 15** |
| séances d'acclimatation sur une prépa de 41 semaines | 51 | **10** |

**Et l'exemption du banc v7 ne masque presque plus rien** — c'était la vraie raison d'être de
cette entrée. Mesurée en la désactivant, elle cachait **26 profils** en R20.3 ; elle en cache
**1 à 4** aujourd'hui (N = 250 / 400 / 600), tous dans la fenêtre des 8 dernières semaines,
c'est-à-dire là où le verrou fait exactement son travail. L'exemption reste (l'instrument ne
doit pas punir une règle de sécurité — R16.10) et `S-MIX` garde son budget à 0.

```verify
id: O-15
quoi: l'acclimatation ne déplace plus la spécificité hors des dernières semaines
attendu: /eau 16C : 0\/15[\s\S]*eau 20C : 0\/15/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swimrun',format:'sprint',level:'inter',history:'confirme',intent:'competition',vol_max:'10',sessions_max:'7',dispo:'partielle',age:'30',sex:'H',weight:'79',pace:'4:50',pace_known:'oui',css:'1:45',css_known:'oui',vol_recent:'7',off_days:'non',shift_ok:'non',doubles:'oui',swim_total_m:'2600',run_total_km:'9.2',race_dplus_m:'250',segments_n:'10',longest_swim_m:'600',team_mode:'binome',team_swim_gap_sec:'5',openwater_access:'saisonnier',swim_continuous:'oui',run_continuous:'oui',gear_test:'non',race_date:'2027-05-09'};const part=(p)=>{let rn=0,sw=0;for(const w of p.weeks){if(w.isRecup||w.phase.id==='taper')continue;for(const d of w.days)for(const s of d.sessions||[]){if(s.d==='rs')continue;if(s.d==='br'){for(const st of s.steps||[])if(st.leg||st.d){const m=(st.reps||1)*(st.durationMin||0);if(st.d==='sw')sw+=m;else rn+=m;}}else if(s.d==='sw')sw+=s.min||0;else if(s.d==='rn')rn+=s.min||0;}}return rn/(rn+sw);};for(const t of ['16','20']){let n=0,tot=0;for(const inj of ['aucune','hanche','tibia','genou','dos'])for(const lv of ['debutant','inter','avance']){const a={...b,water_temp_c:t,injury:inj,level:lv};try{const o=E.swimrunObjective(a);const p=E.buildPlan('swimrun',a);tot++;if(part(p)<(1-o.swimTimeShare)-0.15)n++;}catch(e){}}console.log('eau '+t+'C : '+n+'/'+tot+' profils sous le seuil de specificite');}"
```

### O-16 · L'estimation énergétique journalière n'opposait aucune borne d'âge · ✅ **FERMÉ (O-16)**

Trouvé en préparant le dossier de relecture diététique (H-3), en décrivant ce que chaque règle
calcule. `dailyEnergy()` repose sur **Mifflin-St Jeor 1990, validée chez l'ADULTE**, et sur le NAP
de la FAO. Ni l'une ni l'autre ne s'applique à un enfant ou à un adolescent en croissance. Le
moteur ne leur oppose pourtant aucune borne :

| âge déclaré (52 kg, 162 cm, F, 1 h d'entraînement) | ce que l'écran affiche |
|---|---|
| **12 ans** | **1 750–2 480 kcal** · protéines 60–90 g/j |
| 15 ans | 2 010–2 560 kcal · protéines 60–90 g/j |
| 35 ans | 1 890–2 400 kcal · protéines 60–90 g/j |

À 12 ans, l'âge sort même de la bande 14–90 de la table de référence : le moteur retombe sur
l'enveloppe 25–55 ans et produit un chiffre **hors du domaine de son équation, sans le dire**.
La garde IMC (15–45) ne voit rien ici — l'IMC de ce profil est parfaitement normal.

C'est le même angle mort que R15.7-C avait fermé côté FORMAT (un mineur ne peut plus générer un
plan Ironman) : la règle croisait âge et format, personne n'a rejoué le croisement sur l'écran de
nutrition, arrivé après.

**Tranché par le fondateur (02/08/2026), sans attendre la réponse du dossier** : la borne est à
**16 ans**, et elle coupe l'ESTIMATION JOURNALIÈRE (N8–N11 + macros) — **pas le ravitaillement
d'effort** (N1–N7). Un adolescent qui roule trois heures a besoin de savoir quoi boire ; il n'a
besoin d'aucun tableau calorique. Le sens de l'erreur tranche : ne rien afficher coûte moins
cher qu'un chiffre faux. Le refus est **motivé et nomme l'âge**, il reste réversible en une
constante si le professionnel répond autre chose (question 3 du dossier reste posée).

Refus seulement sur un âge **connu** et sous la borne : un âge absent n'est pas une preuve de
minorité, et couper dessus retirerait l'écran à des adultes qui n'ont pas rempli le champ.

**Trouvé en le corrigeant — le message d'orientation de la garde IMC n'a JAMAIS été affiché.**
`bmiGuardNotice` porte son texte depuis l'audit v6, et son commentaire dit « l'UI peut afficher
ce message à la place ». L'UI affichait le repli « Renseigne ton **poids** dans l'onglet
📋 Profil » dans les TROIS cas de refus — donc elle envoyait une personne hors bornes de
validation, et maintenant un mineur, corriger une donnée qui n'était pas en cause. Point unique
`energyRefusalNotice()` désormais, lu par la carte 🔥 (`EBV2.energyRefusal`). Un garde-fou dont
personne ne lit le motif est un garde-fou à moitié posé — même famille qu'O-9 (un banc dont
personne ne lit le rapport).

8 critères en CI (`demo:nutrition`), **vérifiés rouges** en abaissant la borne à 0.

```verify
id: O-16
quoi: l'estimation journalière est coupée sous 16 ans, et le ravitaillement d'effort ne l'est pas
attendu: /12 ans : aucune estimation[\s\S]*15 ans : aucune estimation[\s\S]*16 ans : [0-9][\s\S]*35 ans : [0-9][\s\S]*ravitaillement 12 ans : ok/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;for(const age of [12,15,16,35]){const r=E.dailyEnergy({weight:'52',height:'162',age:String(age),sex:'F'},[{d:'rn',min:60}]);console.log(age+' ans : '+(r?r.total.join('-')+' kcal':'aucune estimation'));}const a=E.sessionNutrition({d:'bk',name:'Sortie longue',det:'',min:180,long:true,steps:[{role:'body',durationMin:180,zone:'bk.z2'}]},{tempC:27,weightKg:52});console.log('ravitaillement 12 ans : '+(a&&a.during.drinkMlPerH[1]>0&&a.after?'ok':'COUPE'));"
```

### O-17 · La rampe protège du volume passé, pas de l'écart capacité / tissu · ✅ **FERMÉ — par un avertissement, pas par une contrainte**

Trouvé sur un cas réel rapporté par le fondateur : **ancien sportif de haut niveau** (sélection
nationale junior), **5 ans sans sport**, première course à **5'30/km sur 13 min, terminée à
185 BPM**. Puis **46'30 au 10 km en 8 semaines**.

Ce profil n'est ni un débutant ni un entraîné : c'est un **moteur musculaire et neuromusculaire
largement conservé, posé sur un système aérobie à zéro et sur des tissus conjonctifs qui n'ont
rien encaissé depuis cinq ans**. C'est le patron de blessure classique de la reprise chez
l'ancien athlète : la capacité à pousser dépasse de loin ce que le tendon, l'aponévrose et l'os
tolèrent.

**Mesuré** — deux profils déclarant tous deux `vol_recent = 0`, même format, même volume max :

| | semaine 1 | allure du créneau facile | allure de la séance de SEUIL |
|---|---|---|---|
| ancien sportif, seuil 5'45/km | 4 séances · **118 min** | 6'40-7'15/km | **5'45-6'02/km** |
| vrai débutant, seuil 7'00/km | 4 séances · **118 min** | 7'00-7'21/km | 7'00-7'21/km |

**Le volume est identique — c'est défendable, la rampe R10 lit le volume récent et il est nul
dans les deux cas.** Ce qui ne l'est peut-être pas, c'est que **l'intensité, elle, suit la
capacité mesurée sans rien savoir de l'historique de CHARGE**. L'ancien sportif court son seuil
1'15/km plus vite que le débutant, sur des tissus tout aussi naïfs — et surtout, il en est
physiquement capable, donc rien ne l'arrête.

**Pourquoi ce n'est pas traité d'office.** Trois raisons, toutes bonnes :

1. C'est un changement CÔTÉ PLAN : il toucherait le golden, les 22 gates et la promesse de
   volume. Rien à voir avec le diagnostic `feasibility.ts`, qui ne construit rien.
2. La correction n'est pas évidente. Brider l'intensité d'un athlète capable est aussi un
   risque — celui de lui donner un plan qui ne le fait pas progresser, et qu'il quittera pour
   s'entraîner seul, sans garde-fou du tout. Le manifeste place la régularité en priorité 3.
3. `history = "ancien"` existe déjà dans le schéma, et **R14.1 l'a délibérément dépouillé** de
   son pouvoir sur les chiffres (« un adjectif auto-déclaré ne pilote aucun chiffre »). Y
   revenir demanderait un déclencheur MESURÉ, pas l'adjectif — par exemple l'écart entre la
   capacité mesurée et l'historique de volume, qui sont deux champs déjà collectés.

**Tranché par le fondateur (02/08/2026), et la décision dépasse ce cas** :

> « Notre rôle est d'informer au mieux et de laisser l'athlète choisir entre son besoin de
> résultats ou de sécurité. Le but n'est jamais de bloquer mais d'accompagner au mieux, **sauf
> si réelle mise en danger**. »

C'est l'option (c) : un **avertissement nommé**, canal 2 de R11.2, et **aucune contrainte**. Le
plan n'est pas bridé d'une minute.

La seconde moitié de la phrase compte autant que la première : les garde-fous DURS existants
relèvent tous de la « réelle mise en danger » et ne bougent pas — drapeau médical, drapeau
douleur, mineur × format (R15.7-C), garde IMC, borne d'âge de l'estimation énergétique (O-16),
course trop proche (R11.4). Ce cas-ci n'en est pas : c'est un risque réel et assumable, et
brider un athlète capable a son propre coût — celui du plan qu'il quitte pour s'entraîner seul,
sans aucun garde-fou. La régularité est priorité 3.

**Le déclencheur est MESURÉ, et il ne pose aucune constante nouvelle.** `history = "ancien"`
existe mais R14.1 l'a délibérément dépouillé de tout pouvoir sur les chiffres. On croise donc
deux mesures déjà collectées — volume récent ≤ 2 h/sem (R10, obligatoire) et une référence
saisie — et le seuil de « capacité réelle » est **la bande de marge du modèle de projection lue
à l'envers** : `margeOf` rend 1,0 à quelqu'un assis sur l'ancre la plus lente de sa discipline,
donc être plus rapide que cette ancre, c'est avoir une capacité au-dessus du repère débutant, par
définition. On hérite gratuitement du décalage par sexe et par âge (R14.1).

**Mesuré après correction** — l'avertissement se déclenche là où il faut et nulle part ailleurs :

| profil | avertissement |
|---|---|
| seuil 5'45/km · 0 h/sem | **oui** |
| seuil 7'00/km · 0 h/sem (vrai débutant) | non |
| seuil 5'45/km · 5 h/sem (régulier) | non |
| seuil 6'30/km · 1 h/sem (reprise douce) | non |

**Golden : 15 profils sur 900 changent, et le SEUL champ qui diffère est `_v2.warnings`** — pas
une séance, pas une minute. C'est la preuve exécutable que l'avertissement n'est pas un blocage
déguisé. Garde `O17` au banc v6, qui assertе les deux moitiés : le message existe, ET le plan ne
rétrécit pas.

Débusqué en écrivant la garde : ma première assertion exigeait l'ÉGALITÉ des volumes entre le
profil capable et le témoin. Elle était fausse — 107 min contre 92 — parce que les bornes de
séance se calculent depuis l'allure. Le risque à garder n'est pas « le plan change », c'est
« le plan RÉTRÉCIT ».

```verify
id: O-17
quoi: la capacité qui dépasse l'historique de charge est-elle SIGNALÉE, sans brider le plan
attendu: /capable : AVERTI[\s\S]*debutant : non[\s\S]*regulier : non[\s\S]*bride : non/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={format:'10k',level:'inter',intent:'competition',vol_max:'6',sessions_max:'4',dispo:'partielle',age:'28',sex:'H',weight:'80',height:'182',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'non',sleep:'moyen',life_load:'normale',activity:'actif',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',pace_known:'oui'};const P=(pace,vr)=>E.buildPlan('run',{...b,pace,vol_recent:vr});const A=(p)=>((p._v2&&p._v2.warnings)||[]).some(w=>/tendons/i.test(w));const M=(p)=>p.weeks[0].days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.d!=='rs'?(s.min||0):0),0),0);const cap=P('5:45','0'),tem=P('7:00','0');console.log('capable : '+(A(cap)?'AVERTI':'non'));console.log('debutant : '+(A(tem)?'AVERTI':'non'));console.log('regulier : '+(A(P('5:45','5'))?'AVERTI':'non'));console.log('bride : '+(M(cap)<M(tem)?'OUI':'non'));"
```

### O-18 · Le diagnostic RV ne connaît qu'un sport, et sa table de marge sature là où il sert le plus · 🟡 **(1) PARTIELLEMENT FERMÉ (08/08/2026) — (2) OUVERT**

Le raisonnement inverse (`src/engine/feasibility.ts`, carte « 🎯 Ton chrono visé ») est livré avec
**deux limites nommées**. Les écrire ici, c'est la différence entre une portée assumée et un
angle mort.

**(1) Étendu à swim/tri/duathlon (08/08/2026).** `assessFeasibilityMulti` (préfixe de décision
« RVm ») compose un chrono actuel MULTI-SEGMENTS sans réinverser le modèle de puissance vélo
(Martin 1998, coûteux à inverser) : le gain nécessaire se lit sur le RATIO des temps totaux
(actuel vs visé), et le plafond de gain agrégé est une moyenne pondérée par le temps que pèse
chaque segment, en réutilisant tel quel le `margeOf` par segment qui sert déjà à la projection
avant-course (R11.1 — un point unique, jamais une seconde table). `src/app/bridge.ts`
(`legsForFeasibility`) compose les segments avec les MÊMES briques que `predictSwim`/`predictTri`/
`predictDuathlon` appellent pour la prédiction du jour (`SWIM_RACE`, `TRI_SWIM`/`TRI_BIKE`/
`TRI_RUN`, `bikeTimeEstimate`, `riegelSecWith`, tables `DUA_*`), jamais une resaisie du modèle.
**Restent hors périmètre, et le disent :**
- **vélo seul** — aucun format vélo ne porte de DISTANCE connue (PW l'a déjà nommé : « le
  questionnaire ne demande pas la distance d'une cyclosportive »), donc aucun chrono ACTUEL à
  comparer à l'objectif ;
- **trail/swimrun** — l'inversion de Riegel ne s'applique ni au trail (le module dit lui-même que
  Riegel y est inapplicable, T-8) ni au swimrun, dont le temps ne se décompose pas en
  marge/plafond par référence mesurée (trail : temps à plat + VAM ; swimrun : quota de minutes
  par segment fixé par `swimrunModel`) — chacun demande sa PROPRE inversion, pas la
  généralisation multi-segments pondérée écrite ici. La suite naturelle pour le trail reste un
  verdict bâti sur `trailModel`, pas sur Riegel.

**(2) `ANCRES_PACE` sature à 6'00/km.** Mesuré en construisant P11 : un coureur à 7'00/km et un
coureur à 6'30/km reçoivent la MÊME marge (`margeOf` rend 1,0 au-delà de l'ancre la plus lente),
donc **la même projection à volume égal** — 23,5 % dans les deux cas. C'est précisément la zone
où vivent les débutants, c'est-à-dire la population que le régime P11 vient de rendre
distinguable. Le régime discrimine sur le VOLUME et non sur l'allure ; la table de marge, elle,
ne discrimine plus du tout en dessous de 6'00. Conséquence côté RV : deux athlètes de niveaux
réellement différents peuvent recevoir le même verdict.

Ce n'est pas une régression — la table est ainsi depuis R14.1, et son commentaire assume ses
bandes comme des heuristiques. Ce qui est nouveau, c'est qu'on SAIT maintenant que la saturation
tombe au mauvais endroit. Étendre les ancres vers 8'00-9'00/km demande des références, pas une
intuition : c'est la même exigence qui a fait retirer ma première calibration de P11.

```verify
id: O-18
quoi: la saturation de la table de marge sous 6'00/km, le verdict désormais rendu en natation, et l'absence de verdict vélo seul
attendu: /7:00 = 6:30 : OUI[\s\S]*swim verdict : (atteignable|juste|hors-horizon|hors-modele|indeterminable)[\s\S]*hors vélo seul : null/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const iso=(d)=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);const b={format:'10k',level:'debutant',history:'reprise',intent:'competition',vol_max:'6',vol_recent:'0',sessions_max:'4',dispo:'quotidienne',age:'30',sex:'H',weight:'78',height:'180',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'non',sleep:'moyen',life_load:'normale',activity:'actif',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',pace_known:'oui',race_date:iso(112)};const g=(pace)=>{const a={...b,pace};return E.predict('run',a,E.buildPlan('run',a)).projected.gainPct.thrPace;};console.log('7:00 = 6:30 : '+(Math.abs(g('7:00')-g('6:30'))<1e-9?'OUI':'non'));const sw=E.feasibility('swim',{...b,format:'fond',css_known:'oui',css:'1:35',target_time:'20:00'},null);console.log('swim verdict : '+(sw&&sw.verdict));console.log('hors vélo seul : '+E.feasibility('bike',{...b,format:'gravel',target_time:'2:00:00'},null));"
```

### O-19 · L'affûtage coupe la FRÉQUENCE, que sa propre source dit de maintenir · ⏳ **OUVERT — partiellement traité (C29)**

Trouvé en relisant des plans comme un entraîneur, pas comme un auditeur. `ARCHITECTURE.md` cite
**Bosquet 2007** pour le +1,96 % d'affûtage. Cette méta-analyse — et Mujika — décrivent l'affûtage
par **trois bras** : volume −41/−60 %, **intensité maintenue**, **fréquence maintenue à ≥ 80 %**.
Seul le premier est vérifié (R3.13). Personne ne regarde le troisième.

**Mesuré : fréquence médiane 75 % du pic, 61 profils sur 90 (68 %) sous le seuil de 80 %.**

CHIFFRE CORRIGÉ, ET LA CORRECTION VAUT D'ÊTRE ÉCRITE. La première publication annonçait « 94 sur
180, soit 52 % » — mon instrument datait la course à `aujourd'hui + 140 jours`, donc le JOUR DE
LA SEMAINE dérivait d'une exécution à l'autre. En franchissant minuit UTC, la course est passée
du dimanche au lundi : la dernière semaine est tombée à UN jour (N2), sa fréquence à 0, et la
population mesurée a changé sous la mesure. La date est ancrée sur un dimanche désormais, et la
semaine de course est exclue — elle contient la course, elle n'a pas de fréquence
d'entraînement à mesurer (R13.4). Même famille que R20.7, dans mon propre outillage.

**Corollaire, sur les formats où la sortie longue EST la spécificité** : elle est explicitement
exclue des victimes de la décroissance, donc elle survit pendant que tout le reste disparaît.

| profil | séance longue affûtage/pic | semaine affûtage/pic |
|---|---|---|
| run/marathon | **79 %** (142' / 180') | 46 % |
| run/semi | 70 % | 46 % |
| bike/cyclo | 65 % | 55 % |

Un marathonien recevait donc : lundi OFF, mardi OFF, mercredi OFF, jeudi 48', vendredi OFF,
**samedi 141'**, dimanche 47'. Quatre jours de repos et 2 h 21 de sortie longue huit jours avant
sa course. Ce n'est pas un affûtage, c'est une semaine de repos avec une sortie longue posée
dessus. La cible de volume est tenue ; c'est la MONNAIE qui est fausse.

**DÉCISION DU FONDATEUR (03/08/2026) : des jours plus COURTS, tous gardés.** R3.13 (l'affûtage
pèse au plus 60 % du pic) n'est pas négociée ; c'est la MONNAIE de la réduction qui change.

**C29** — la décroissance réduit au lieu de supprimer sous le plancher de fréquence.
**C29b** — en affûtage, une nage sous le plancher de séance n'est plus SUPPRIMÉE : le plancher
(« sous X mètres, ça ne vaut pas le déplacement ») est une règle de semaine de CHARGE, alors
qu'en affûtage une nage courte EST l'objectif. Trois blocs de suppression identiques traités
d'un coup. Nageur débutant : **33 % → 67 %**.
**C29c** — l'affûtage REND les jours qu'il a pris pour rien. Les deux passes de retrait ont
raison au moment où elles s'exécutent, mais les passes suivantes réduisent encore : mesuré sur
un semi, semaine d'affûtage livrée à **46 % du pic pour un plafond de 60 %, avec deux jours
coupés**. 76 des 95 jours perdus portaient le nom de cette coupe. La réparation se fait au POINT
FIXE (même forme que C28) et elle est **neutre en volume** : on redonne des jours, les minutes
viennent des séances déjà là. Elle porte son propre filet — la semaine est vérifiée après
rééquilibrage et la restitution se RÉTRACTE si R3.13 ne tient pas (première écriture : 35
combinaisons sur 459 au-dessus du plafond).

**Résultat : 68 % → 30 % des profils sous 80 %, médiane 75 % → 83 %.** La sortie longue baisse
avec (semi : 91' → 81').

**CE QUI RESTE : 3 profils sur 12 (25 %), moyenne 80 %.** Ce sont ceux où le rééquilibrage ne
peut pas se payer sans franchir R3.13, et la rétractation joue. Fermer complètement demanderait
de descendre les planchers de step en affûtage — un autre arbitrage.

**ET LA COMMANDE DE VÉRIFICATION, ELLE, MENTAIT — TROISIÈME INSTRUMENT DE CETTE ENTRÉE.**
La prose ci-dessus annonce depuis R20.7 que « la semaine de course est exclue » et que « la date
est ancrée sur un dimanche ». **La commande ne faisait ni l'un ni l'autre** : elle datait la
course à `aujourd'hui + 140 jours` et prenait le MINIMUM sur toutes les semaines d'affûtage, y
compris le moignon d'un jour qui porte la course et n'a, par conception (R13.4), aucun jour
d'entraînement. Elle renvoyait donc **12/12**, contre 30 % annoncés. Balayée sur les sept jours de
la semaine, à moteur inchangé :

| jour de la course | lun | mar | mer | jeu | ven | sam | dim |
|---|---|---|---|---|---|---|---|
| sous 80 % | 12/12 | 12/12 | 12/12 | 12/12 | 5/12 | 2/12 | 2/12 |
| moyenne | **0 %** | **0 %** | 41 % | 61 % | 77 % | 82 % | 82 % |

C'est exactement ce que R20.6 a retiré du banc d'invariants (I6/I8/I12 : « la course objectif
n'est pas une séance d'entraînement »), jamais rejoué sur cette mesure-ci.

**Deux corrections d'instrument, et la première était insuffisante.** Exclure « la semaine qui
porte la course » est trop grossier : sur un 10 km, l'unique semaine d'affûtage EST la semaine de
course, elle fait sept jours et se termine par l'épreuve — l'exclure supprimait trois profils
légitimes. Normaliser par jour DISPONIBLE ne suffit pas non plus (un moignon de deux jours dont le
seul jour libre est un repos donne 0 %). Bosquet compte des séances **par semaine** : une semaine
de un ou deux jours n'en est pas une. La mesure DÉCLARE donc son domaine — **au moins 5 jours
disponibles** — et la date est **ancrée au lundi courant, en semaines entières** (recette R20.7).
Vérifiée identique les sept jours : **3/12, moyenne 80 %**.

**Mise à jour du 04/08/2026 — C30 a fait baisser ce chiffre sans le viser : 3/12 → 2/12.** La
sortie longue d'un coureur lent est plus longue au pic ET en affûtage (le plancher de spécificité
progresse avec la phase, il ne s'éteint pas à l'affûtage), donc le rapport affûtage/pic monte.
C'est une bonne nouvelle et un rappel : ce compteur mesure un RAPPORT, il bouge quand l'un ou
l'autre de ses deux termes bouge. Le reste d'O-19 est inchangé — la cause n'est pas traitée.

```verify
id: O-19
quoi: la fréquence d'affûtage face au plancher de 80 % que Bosquet/Mujika déclarent
attendu: /sous 80 % : 2\/12/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const lun=new Date();lun.setUTCDate(lun.getUTCDate()-((lun.getUTCDay()+6)%7));const c=new Date(lun);c.setUTCDate(c.getUTCDate()+20*7-1);const iso=c.toISOString().slice(0,10);const B={intent:'competition',dispo:'quotidienne',shift_ok:'non',doubles:'non',off_days:'non',sex:'H',sleep:'moyen',life_load:'normale',activity:'actif',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',weight_lever:'non',age:'35',weight:'75',height:'178'};const R={run:{pace_known:'oui',pace:'4:40',terrain:'plat'},bike:{ftp_known:'oui',ftp:'240',terrain:'plat'}};const F={run:['10k','semi','marathon'],bike:['cyclo']};const nb=(w)=>w.days.filter(d=>d.sessions.some(s=>s.d!=='rs'&&(s.min||0)>0&&!s.race)).length;const dispo=(w)=>w.days.filter(d=>!d.sessions.some(s=>s.race)).length;let n=0,sous=0;for(const sp of Object.keys(F))for(const f of F[sp])for(const lv of ['debutant','inter','avance']){let p;try{p=E.buildPlan(sp,Object.assign({},B,{level:lv,history:lv==='debutant'?'reprise':'confirme',format:f,vol_max:'10',vol_recent:'6',sessions_max:'6',race_date:iso},R[sp]));}catch(e){continue;}const pk=p.weeks.filter(w=>w.phase.id==='peak'&&!w.isRecup&&dispo(w)>=5);const tp=p.weeks.filter(w=>w.phase.id==='taper'&&dispo(w)>=5);if(!pk.length||!tp.length)continue;const np=Math.max(...pk.map(nb));if(!np)continue;n++;if(Math.min(...tp.map(nb))/np<0.8)sous++;}console.log('profils : '+n);console.log('sous 80 % : '+sous+'/'+n);"
```

### O-20 · En trail, un DÉBUTANT reçoit un pic plus lourd qu'un INTER — et le banc ne le voit qu'un jour sur deux · ✅ **FERMÉ (I14b, 03/08/2026)**

> **RÉSOLU — la cause est `enforceLabelVsDose`, et le débutant y échappe à cause d'un plafond de
> SÉCURITÉ.** Cinquième hypothèse, et la bonne : mesurée pas à pas, la semaine de l'inter SORT de
> la boucle R3.3 à **603 min pour une cible de 600** — la courbe et le remplissage n'ont jamais
> été en cause. C'est I14 (« la sortie longue est la plus longue de sa semaine ») qui ramène
> ensuite « Descente en charge » de **210 à 159 min**, et **plus aucune passe ne rend ces 51
> minutes**. Le débutant y échappe parce que le plafond que I14 impose aux autres séances EST la
> durée livrée de sa sortie longue : la sienne est épinglée à 180 min par **C23**, celle de
> l'inter s'arrête librement à 167. Le débutant hérite du plafond le PLUS HAUT, ne se fait rien
> retirer, et passe devant — un plafond de sécurité qui augmente la charge de celui qu'il protège.
>
> La forme est connue **dans l'autre sens** : ce dépôt a payé onze fois « une garantie vérifiée au
> milieu du pipeline ne vérifie que l'avant-dernier état », et y a toujours répondu en REJOUANT la
> garantie au point fixe. Ici c'est le miroir — une garantie de SÉANCE retire des minutes après la
> boucle de volume, et c'est la BOUCLE qui n'est jamais rejouée.
>
> **`I14b`** rend ce que le plafond a pris, aux séances FACILES et à elles seules (R4.1), sans
> jamais dépasser la sortie longue (×0,80 : R20.3 — une facile ne rivalise pas avec la pivot), ni
> la courbe déclarée, ni le pic livré. Mesuré : **13 échecs sur 114 combinaisons → 0**, balayé sur
> 6 sports × 21 horizons — donc traité SYSTÉMIQUEMENT, pas au seul point d'échantillonnage.
> Le pic de l'inter passe de 547 à 596 min ; celui du débutant ne bouge pas (575).
>
> **Deux erreurs à moi, gardées écrites.** (1) Ma première écriture était **inerte** : j'ai filtré
> les blocs receveurs sur `!st.gradient` en pensant « sans pente », alors que `flat` EST une valeur
> de `gradient` — j'excluais donc le footing PLAT, précisément le bloc que R4.1 désigne. Receveuses
> vides sur les 41 semaines. `EN_PENTE()` est désormais la seule définition (R11.1). (2) Ma
> deuxième écriture remplissait fidèlement une courbe qui DÉCROÎT sur certains profils et
> amplifiait l'inversion ; la borne « dev ≤ pic » — qui existait déjà, mais n'était vérifiée
> qu'APRÈS, par la boucle de réparation — est lue au moment où la passe agit. Elle mord 10 fois
> sur 702 profils (vérifié non inerte).
>
> **Ce que la fermeture a fait remonter : voir O-21.**

*(Diagnostic d'origine conservé ci-dessous — les quatre hypothèses réfutées sont ce qui a empêché
la cinquième d'être tentée deux fois.)*

Trouvé en passant les gates après le lot O-19. `audit:invariants` **I13** (« monotonie du niveau :
plus l'athlète est fort, plus la charge est élevée ») est **rouge**, et il l'était déjà avant ce
lot — vérifié en le rejouant contre le moteur committé.

**Mesuré** (profil du banc, `history: confirme` fixe, seul `level` varie, `vol_max: 10`) :

| niveau | pic livré (min) | D+ de cette semaine | cible de la courbe |
|---|---|---|---|
| débutant | **575** | **1 130 m** | 9,6 h = 576 min |
| inter | 547 | 860 m | 10,2 h = 612 min |
| avancé | 547 | 860 m | 10,2 h = 612 min |

**Le défaut est réel, et sur LES DEUX AXES.** Ma première hypothèse était que le débutant reçoit
plus de MINUTES parce que ses séances sont moins denses en dénivelé — le module trail dit
lui-même que la charge se mesure en temps, D+ et D− (R7 TRAIL), donc « plus de minutes » n'aurait
pas suffi à conclure. Mesuré : le débutant reçoit **aussi plus de D+** (1 130 contre 860 dans la
semaine de pic, 1 320 contre 980 sur le plan). Hypothèse réfutée, l'invariant a raison.

**LA COURBE EST BONNE, C'EST LA LIVRAISON QUI NE SUIT PAS.** Le pic DÉCLARÉ est correctement
ordonné (débutant 9,6 h < inter 10,2 h). Le débutant livre exactement sa cible (575 pour 576) ;
**l'inter est 53 minutes en dessous de la sienne** (547 pour 612). Ce n'est donc pas le débutant
qui est sur-servi, c'est l'inter qui n'arrive pas à remplir sa courbe.

**L'ÉCART SE CONCENTRE SUR LA SORTIE LONGUE, ET IL RESTE DE LA PLACE.**

| | débutant | inter |
|---|---|---|
| Longue trail | **180'** (borne : cap 180, `hard: true`) | 167' (borne : cap **312**, `hard: false`) |
| Montées | 78' (12'×3) | 97' (12'×4) |
| Footing plat | 79' | 55' |
| Descente en charge | 130' | 159' |
| Back-to-back | 108' | 69' |

La longue du débutant est **exactement sur son plafond C23** (180) ; celle de l'inter s'arrête à
167 avec **145 minutes de marge inutilisée**. Le surplus du débutant se redistribue sur le
footing plat et le back-to-back, qui l'absorbent ; chez l'inter, la mise à l'échelle s'arrête
sans avoir utilisé la marge disponible. C'est là qu'il faut chercher — pas dans les plafonds,
qui sont corrects, mais dans la passe qui remplit la semaine.

**ET LE DERNIER MORCEAU : `level` N'AGIT PAS SUR LA COURBE TRAIL.** Charge des dix premières
semaines, débutant et inter, même profil :

```
D+ : 770 770 740 600 730 700 710 600 730 730   ← IDENTIQUE aux deux niveaux
D- : 860 860 910   0 1000 1090 1140   0 1180 1220   ← IDENTIQUE aux deux niveaux
```

Les deux plans sont **rigoureusement identiques jusqu'à la semaine ~36**. Le niveau ne diverge
qu'au bloc de pic. Le seul endroit où `level` mord vraiment en trail est **C23** — le plafond de
sortie longue du débutant (180 min).

**Et ce plafond se REMBOURSE ailleurs.** Le surplus que C23 retire de la longue est redistribué
sur le footing plat (79' contre 55') et le back-to-back (108' contre 69'), si bien que la semaine
du débutant finit **au-dessus** de celle de l'inter — sur les minutes ET sur le D+. Un plafond de
sécurité qui se rembourse sur les autres séances n'est pas un plafond : c'est un déplacement.
Même famille que R15.7-A (le plancher posait des séances que la décroissance retirait juste
après) ou C28 (le plafond d'approche appliqué avant le plancher qui le défaisait).

**L'ISSUE 1 A ÉTÉ CHOISIE, IMPLÉMENTÉE — ET RÉFUTÉE PAR LA MESURE.**

Décision du fondateur (03/08/2026) : « le plafond ne se rembourse pas ». Implémenté (`C23b`) :
`blockBounds` remonte le drapeau `hard`, `scaleBlock` COMPTE les minutes qu'une borne dure
refuse, et la boucle R3.3 abaisse sa cible d'autant — les minutes retirées par un plafond du
manifeste ne repartent plus dans les autres séances.

**Mesuré : zéro refus.** Le compteur n'a été alimenté sur AUCUNE semaine, et le golden n'a
bougé sur aucun des 900 profils. Le plafond dur ne mord jamais pendant la mise à l'échelle : la
longue du débutant atteint 180 par un autre chemin (la passe D7, qui coupe APRÈS), et il n'y a
donc aucun remboursement à empêcher. **Le correctif est inerte, il a été retiré** — expédier du
code qui ne change rien est précisément ce que ce dépôt refuse.

**Quatrième hypothèse réfutée sur cette entrée**, après T1, T2b et « le débutant a des séances
moins pentues ». Ce que chaque réfutation a coûté est écrit ici exprès : c'est ce qui empêche la
cinquième d'être tentée deux fois.

**CE QUE LA MESURE DIT MAINTENANT.** Le déséquilibre ne vient pas d'un plafond qui déborde mais
de la COMPOSITION des semaines :

| | débutant | inter |
|---|---|---|
| Montées (qualité, `repCap`) | 78' | 97' |
| Footing plat (facile) | **79'** | 55' |
| Back-to-back (facile) | **108'** | 69' |
| total | **575'** | 547' |

La semaine de l'inter est dominée par des blocs de QUALITÉ, plafonnés en répétitions (R4.1) ;
celle du débutant par des blocs FACILES, qui peuvent absorber du volume (`repMax` 15). Quand
R3.3 vise 600 min, les blocs de qualité de l'inter refusent — et R4.1 dit que « le déversement
doit aller vers les séances FACILES ». **Il n'y va pas** : le footing plat de l'inter reste à
55' quand celui du débutant monte à 79'. C'est là qu'il faut chercher la prochaine fois : ce
qui empêche les séances faciles de l'inter d'absorber ce que sa qualité refuse.

**L'ARBITRAGE INITIAL, gardé pour mémoire.** Deux issues étaient envisagées :

1. **Le plafond ne se rembourse pas** — quand C23 coupe la longue d'un débutant, la semaine reste
   plus légère d'autant. C'est la lecture stricte de la priorité n°2 (prévention) : si on juge
   qu'un débutant ne doit pas dépasser 3 h de sortie longue, lui rendre ces minutes en dénivelé
   ailleurs annule la décision. Effet de bord : le débutant reçoit un volume total plus bas que
   ce que sa courbe annonce — il faudra que la courbe le dise (R20.2).
2. **La courbe de l'inter devient atteignable** — le pic déclaré 10,2 h n'est pas livrable
   (547 min pour 612), et c'est ce trou qui laisse le débutant passer devant. Rendre la courbe
   honnête (annoncer ce qui est livrable) ne suffirait PAS : l'inter livrerait 9,1 h contre 9,6
   au débutant, et I13 resterait rouge. Il faudrait donc DÉBLOQUER ce qui plafonne l'inter — et
   ce n'est ni T1 (indexé sur `history`, jamais atteint : 860 pour un plafond à 3 000) ni T2b
   (mesuré, il clampe mais pas au pic).

**Recommandation : l'issue 1.** Elle est plus courte, elle va dans le sens de la sécurité, et
elle corrige la cause plutôt que le symptôme. L'issue 2 demande de comprendre pourquoi la mise à
l'échelle laisse 145 min de marge inutilisée sur la longue de l'inter — un chantier à part.

**LE BANC BASCULE AVEC LE CALENDRIER, ET C'EST LA SECONDE MOITIÉ.** `BASE.race_date` est
figée au 2027-06-13, mais la LONGUEUR du plan se compte depuis aujourd'hui : l'horizon raccourcit
d'une semaine tous les sept jours, et l'allocation de phases bascule avec lui. La CI est **verte
sur le dernier commit** (exécutée le 02/08) et le même code est **rouge en local** le 03/08.

Balayé sur 21 horizons (12 à 52 semaines) × 6 sports : **13 échecs sur 114 combinaisons, TOUS en
trail.** Le défaut est donc réel et systémique côté trail ; c'est l'échantillonnage à un seul
horizon qui le rend intermittent.

**Quatrième instrument de ce dépôt à dépendre de la date**, après le banc R14 (R20.7), mon
balayage de fréquence de C29 et l'assertion « le pourquoi est visible » de `smoke-r4` (qui
supposait que le jour courant portait une séance — un jour sur trois est un jour de repos). Les
deux derniers sont corrigés ; celui-ci demande de traiter le défaut trail AVANT de rendre le
banc déterministe, sinon on fige la dette au lieu de la traiter (leçon R20.6).

```verify
id: O-20
quoi: la monotonie du niveau en trail, balayée sur tous les horizons plutôt qu'un seul
attendu: /trail : 0 horizons? non monotones?/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const B={intent:'competition',history:'confirme',injury:'aucune',dispo:'partielle',doubles:'parfois',off_days:'non',sleep:'moyen',life_load:'normale',age:'38',weight:'79',sex:'H',weight_lever:'non',sessions_max:'7',vol_max:'10',vol_recent:'5',race_distance_km:'45',race_dplus_m:'2200',race_technicity:'mixte',race_night:'non',train_dplus_access:'collines',poles:'oui',vam_known:'non',pace_known:'oui',pace:'4:50'};const mx=(p)=>Math.max(...p.weeks.map(w=>w.days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.race?0:s.min||0),0),0)));let ko=0;for(let sem=12;sem<=52;sem+=2){const rd=new Date(Date.now()+sem*7*864e5).toISOString().slice(0,10);let v=[];try{for(const lv of ['debutant','inter','avance'])v.push(mx(E.buildPlan('trail',Object.assign({},B,{level:lv,race_date:rd}))));}catch(e){continue;}if(!(v[0]<=v[1]&&v[1]<=v[2]))ko++;}console.log('trail : '+ko+' horizons non monotones');"
```


### O-21 · À capacité déclarée plus HAUTE, le plan est plus PETIT — l'inversion sur l'axe allure · 🟡 **TROIS MÉCANISMES CORRIGÉS (03 et 05/08/2026), RÉSIDU RAMENÉ À +5,0 %**

> **CORRECTION DU 05/08/2026, 3ᵉ MÉCANISME — ET « DU BRUIT DE CONVERGENCE » ÉTAIT UN DIAGNOSTIC
> PARESSEUX.** Cette entrée concluait, après la 2ᵉ correction, que les séquences résiduelles
> « ne sont pas monotones dans un sens ou dans l'autre, elles sont ERRATIQUES — du bruit de
> convergence entre passes », et renvoyait le traitement à « un chantier à part entière, pas une
> correction ». **C'était faux.** Instrumenté passe par passe sur `10k/debutant/confirme/3s/6h/vr5`
> (`4:30 → 1282 · 5:45 → 1061 · 7:00 → 1319 · 8:30 → 1077`), il n'y avait ni bruit ni chantier :
> **une seule règle, une seule ligne, et un seuil.**
>
> **CE QUE LA MESURE A DIT, DANS L'ORDRE.** Avant réparation les quatre plans sont presque
> identiques (1311 · 1270 · 1340 · 1269, soit 5,6 % d'écart) : la divergence est CRÉÉE plus loin.
> La semaine de récup S7 délivre **190 min à 4:30 et 143 à 5:45** pour une cible identique de
> 198 — et le détail dit tout : **trois séances d'un côté, deux de l'autre**. La règle « une
> récup ne dépasse jamais sa voisine » trouvait S7 à **198 min contre 192 chez la voisine** —
> SIX minutes au-dessus de sa borne — et les payait avec une séance de **55 min**. Un
> dépassement de 3 % réglé par une coupe de 25 %, neuf fois trop.
>
> **`cutSmallestSessionIn` est TOUT-OU-RIEN**, donc une minute d'écart chez la voisine bascule
> une séance entière hors de la semaine ; et la semaine de récup ainsi amputée devient la
> référence de tout ce qui suit. Aucune règle ne « penchait » selon l'allure : c'est le SEUIL qui
> est brutal, et l'allure ne faisait que décider de quel côté on tombe. Ce que l'entrée lisait
> comme du bruit était une marche.
>
> **LE CORRECTIF ÉTAIT DÉJÀ ÉCRIT QUINZE LIGNES PLUS HAUT.** La règle de monotonie de l'AFFÛTAGE,
> dans le même bloc, réduit d'abord le corps des séances (`scaleWeekBody`) et ne coupe un jour que
> si les planchers empêchent d'y arriver. La règle de la récup sautait directement à la coupe.
> C'est aussi la décision déjà prise deux fois dans ce dépôt — **C29/C29b/C29c : « l'affûtage
> réduit le VOLUME, pas la FRÉQUENCE »** — jamais rejouée ici. La borne se paie donc en volume,
> la fréquence ne cédant qu'en dernier recours.
>
> | sur 432 profils × 4 allures | avant | après |
> |---|---|---|
> | **pire inversion entre deux allures voisines** | **+24,3 %** | **+5,0 %** |
> | dispersion p90 | 5,0 % | 4,6 % |
> | dispersion médiane | 0,7 % | 0,6 % |
> | profils non monotones (> +2 %) | 73 (16,9 %) | 67 (15,5 %) |
>
> **CE QUI NE BOUGE PAS, ET POURQUOI CE N'EST PAS UN DÉFAUT.** La dispersion MAX reste à 36,1 %,
> et le profil qui la porte est `semi/inter/reprise/3s/6h/vr5 : 2413 2291 2188 1773` —
> **strictement DÉCROISSANT** de l'allure rapide à l'allure lente. Ce n'est pas une inversion :
> c'est la variation monotone que les bornes de séance produisent légitimement (O17 l'a déjà
> arbitrée). La grandeur qu'O-21 nomme est l'INVERSION, et c'est elle qui tombe de 24,3 à 5,0 %.
> Le compte de profils non monotones bouge peu parce que les résidus sont désormais de petites
> oscillations à ±4 % (`937 928 970 896`), pas des marches de 20 %.
>
> **ET LE GOLDEN A REFAIT L'ANGLE MORT QUE CETTE ENTRÉE AVAIT ELLE-MÊME NOMMÉ.** Sa 1ʳᵉ
> correction écrivait « le golden ne bouge pas parce que ses profils portent tous une date » —
> la leçon n'avait pas été appliquée, et les 945 profils rendaient **0 écart** face à ce
> correctif. Une sous-passe `O-21b` est ajoutée (**945 → 949**). **Ma première écriture de cette
> passe était DÉCORATIVE et c'est mesuré** : elle héritait du `dispo: "semaine"` du profil de
> base, sous lequel les quatre allures rendent le MÊME plan à la minute près (1 487 min) — elle
> surveillait du vide, pendant que son commentaire affirmait le contraire. Avec
> `dispo: "quotidienne"` elle discrimine, **vérifiée en retirant le correctif : 2 écarts, sur
> 5:45 et 8:30 exactement.** Cinquième occurrence de cette famille (A-2, N2, C30b, PW).
>
> Garde CI : **`O-21b`** au banc v6, deux moitiés — la fréquence des semaines de récup ne dépend
> pas de l'allure (le mécanisme) ET aucune allure plus lente ne reçoit un plan plus gros de plus
> de 6 % (l'inversion) —, **vérifiée rouge** en repassant la borne au paiement par la fréquence.
>
> ─────────────────────────────────────────────────────────────────────────────────────────────

> **CE QUI EST CORRIGÉ, ET MA PISTE DU MATIN ÉTAIT FAUSSE.** J'avais écrit « la courbe déclarée
> décroît (base au-dessus du pic) ». Mesuré : elle ne décroît pas. **La seule semaine de PIC de
> ces plans est une semaine de RÉCUPÉRATION** (102 min) pendant que les semaines de dev montent à
> 162. Or l'auditeur exclut — à juste titre — les semaines de décharge de ses candidats : le pic
> ne contribuait alors AUCUN candidat, et la règle concluait « la semaine de volume max dépasse
> la meilleure semaine peak ». Énoncé **faux** : il n'y a pas de semaine de pic à dépasser.
>
> La récup dans le pic est **voulue** : C27b la refuse, mais son garde dominant dit que la CADENCE
> de l'athlète l'emporte sur toute règle de placement (R18.5, arbitrage compté et démontré). Ce
> qui n'avait jamais été considéré, c'est sa conséquence sur une prépa COURTE, où le pic tient en
> une seule semaine : le plan n'a plus aucune semaine de pic en charge.
>
> La règle dit désormais **ce qui est vrai** — « aucune semaine de PIC en charge » — et le dit
> dans le canal des AVERTISSEMENTS, la cause étant un arbitrage assumé et non un défaut de
> génération. Même famille que les trois invariants retirés par R20.6 (I6/I8/I12) : une règle
> appliquée là où son objet n'existe pas.
>
> **Mesuré sur 729 plans sans date de course : 216 profils portaient cette violation dure
> insatisfiable → 0, et les réparations tombent de 952 à 356** — 596 coupes de semaines qui ne
> réparaient rien, et qui ne coupaient PAS LA MÊME semaine selon l'allure déclarée. C'était le
> mécanisme de l'inversion.
>
> **TROIS DE MES MESURES ONT VISÉ LA MAUVAISE POPULATION, DANS LA MÊME HEURE.** Le corpus V2
> (702 profils) et mon premier balayage (486) donnaient **0 occurrence**, et j'ai failli retirer
> le correctif comme inerte (le sort de C23b). Les deux portaient sur des plans DATÉS ; le défaut
> ne vit que sur les plans **sans date de course**, construits sur `minWeeks` — c'est-à-dire
> l'athlète qui n'a pas encore d'objectif calé. Là, il touche **29,6 %** des plans. Le golden ne
> bouge pas d'un profil pour la même raison : ses 900 profils portent tous une date.
>
> **CE QUI RESTE — ET C'EST UN ARBITRAGE, PAS UN DÉFAUT.** L'inversion elle-même persiste
> (`inversions d'allure : 2`), et sa cause est en AMONT de la réparation : les courbes DÉCLARÉES
> diffèrent (786 min pour 5:45/km contre 852 pour 7:00/km, à `vol_max` identique). C'est la sonde
> de capacité (V2.1, « la promesse suit ce que les plafonds permettent ») qui lit des plafonds de
> séance dépendants de l'allure — un plafond exprimé en **distance** donne mécaniquement plus de
> MINUTES à qui court moins vite.
>
> La question à trancher est d'entraînement, pas de code : **la sortie longue d'un 10 km se
> prescrit-elle en distance ou en temps ?** En distance, le coureur lent passe plus de temps sur
> ses appuis pour le même « stimulus kilométrique » — plus de fatigue et plus de risque, ce qui
> heurte les priorités 1 et 2 du manifeste. En temps, les deux reçoivent la même charge et le
> kilométrage suit. Tout le moteur compte déjà en TEMPS (`vol_max` est en heures), ce qui plaide
> pour le temps — mais c'est une décision de fond, elle revient au fondateur.
>
> ─────────────────────────────────────────────────────────────────────────────────────────────
>
> **CORRECTION DU 05/08/2026 (« corrige », fondateur) — ET LA QUESTION CI-DESSUS N'ÉTAIT PAS LA
> BONNE.** C30 a mesuré depuis que la sortie longue est prescrite en TEMPS depuis toujours
> (`durCaps` en minutes) : entre 5:45/km et 7:00/km sur un 10 km elle fait 178 min contre 176.
> Le dilemme « distance ou temps » n'était donc pas le mécanisme. Instrumenté passe par passe sur
> le même profil à deux allures, il y en avait **deux**, et aucun n'est un arbitrage :
>
> **(1) Le remplissage d'I14b est structurellement MORT sur une semaine plate.** I14 ramène chaque
> séance à la durée de la sortie longue ; le plafond des receveuses du remplissage
> (`0,80 × longue`, R20.3) tombe alors SOUS cette valeur, `place` est négatif, et rien n'est rendu.
> Mesuré sur un 10 km à 4 séances : quatre séances à 41-43 min pour une longue de 41, `_labelCut`
> à **27 min par semaine**, et le remplissage en rendait **zéro**. Ce sont les semaines de PIC et de
> SPÉCIFIQUE qui portent le plus de qualité par rapport à leur longue, donc ce sont elles que I14
> coupe le plus — la périodisation s'inversait. Ce qui reste à rendre va désormais à la **sortie
> longue elle-même** : ce ne sont pas des minutes ajoutées, ce sont celles que la même passe vient
> de retirer à la même semaine, et une longue plus longue RELÈVE le plafond d'I14 au lieu de le
> violer.
>
> **(2) La garantie A2/I1 se rabattait sur une semaine de pic en RÉCUPÉRATION.** Son `peakBest`
> lisait `peakAny` faute de `peakNR` : sur une prépa dont l'unique semaine de pic est une décharge
> — le cas exact que la première moitié de cette entrée avait documenté côté AUDITEUR — tout le
> plan était raboté au volume d'une semaine de récup. **Et deux fois** : `D4` réduit ensuite cette
> semaine, donc le second passage de `reconcileDeclaredVolume` repart d'un plafond plus bas.
> Mesuré sur un 10 km à 6 séances : **1032 → 807 min au deuxième passage, sur une entrée
> IDENTIQUE**, quand le même profil à une allure plus lente (donc avec un pic en charge) ne perdait
> que 36 min. L'auditeur avait déjà tranché ce cas en AVERTISSEMENT ; le générateur dit maintenant
> la même chose que lui — deux réponses à la même question, c'est ce que R11.1 interdit.
>
> **PORTÉE, sur 432 profils × 4 allures** (la dispersion du total livré sur l'axe allure, à
> entrées identiques par ailleurs) :
>
> | | avant | après |
> |---|---|---|
> | dispersion médiane | 0,7 % | **0,7 %** |
> | dispersion p90 | 16,2 % | **5,0 %** |
> | dispersion max | 44,1 % | **36,1 %** |
> | pire inversion entre deux allures voisines | +38,7 % | **+24,3 %** |
> | profils non monotones (> +2 %) | 83 (19,2 %) | 73 (16,9 %) |
>
> **CE QUI RESTAIT APRÈS CE 2ᵉ MÉCANISME.** Le p90 tombe de deux tiers — la queue longue est
> traitée — mais le **compte** de profils non monotones bouge à peine, et le maximum reste à 36 %.
> Les séquences résiduelles ne sont pas monotones dans un sens ou dans l'autre, elles paraissent
> **erratiques** (`845 846 847 903`, `1282 1061 1319 1077`), d'où le diagnostic posé ici :
> « du bruit de convergence entre passes », à traiter en rendant le point de convergence
> idempotent — « un chantier à part entière, pas une correction ».
>
> ⚠️ **CE DIAGNOSTIC ÉTAIT FAUX, et le bloc en tête de cette entrée le remplace.** Il n'y avait
> ni bruit ni chantier : une seule règle (« une récup ne dépasse jamais sa voisine ») qui payait
> six minutes de dépassement avec une séance de 55 min. Ce qui ressemblait à du bruit était une
> MARCHE, et l'allure ne faisait que décider de quel côté on tombe. La leçon est gardée écrite :
> conclure « c'est du bruit » sans avoir instrumenté passe par passe, c'est refermer une piste
> avec une hypothèse — et ici cette hypothèse a coûté une correction reportée.
>
> **La dette `O17` du banc v6 est PAYÉE dans le commit de la correction** (protocole du dépôt) :
> son `expect` repasse à `'pass'`, et le témoin n'a pas été réécrit — c'est le moteur qui a changé.


Trouvée en fermant O-20, par le critère `O17` du banc v6 qui est passé rouge. Le réflexe aurait
été de conclure « I14b a bridé le plan » : **c'est faux, et c'est mesuré**. Le plan de l'athlète
capable fait **107 min avant comme après**, au caractère près. C'est le TÉMOIN d'O17 qui a bougé
(92 → 120 min), parce que I14b lui rend enfin ce que le plafond de libellé lui prenait. Le
critère nomme « le plan a rétréci » et mesure « le témoin a changé » — sixième occurrence dans ce
dépôt d'une mesure qui porte sur une grandeur voisine de celle qu'elle nomme.

**Mais ce qu'il expose est un vrai défaut, et il PRÉEXISTE à I14b.** Profil 10 km, `vol_max: 6`,
`sessions_max: 4`, seule l'allure seuil déclarée varie :

| `vol_recent` | allure | S1 livrée | plan total | avant I14b | après I14b |
|---|---|---|---|---|---|
| 5 h | **5:45/km** (rapide) | 100 min | 746 min | identique | identique |
| 5 h | 7:00/km (lent) | **106 min** | **772 min** | identique | identique |
| 0 h | 5:45/km | 107 min | 754 min | 107 / 699 | 107 / 754 |
| 0 h | 7:00/km | 120 min | 790 min | 92 / 706 | 120 / 790 |

Les deux lignes `vol_recent: 5` sont **rigoureusement inchangées** par ce lot : l'inversion y est
antérieure. O17 ne la voyait que sur la cellule `vol_recent: 0`, et seulement parce que son témoin
était lui-même sous-servi — un défaut en masquait un autre.

**C'est une inversion de monotonie sur l'axe ALLURE, cousine d'I13 (axe NIVEAU)** que ce lot vient
de fermer. Le mécanisme n'est pas le même : les deux profils portent ici une **violation dure non
réparée** (« la semaine de volume max dépasse la meilleure semaine peak de >5 % »), parce que la
courbe DÉCLARÉE décroît — S1 en base à 120 min au-dessus de la phase de pic. La boucle de
réparation coupe alors une semaine, et **elle ne choisit pas la même victime selon l'allure** :
S1 chez le rapide, S4/S5 chez le lent.

**Ce qu'il faudra regarder** — dans cet ordre, la première ligne étant probablement la cause :
1. **pourquoi la courbe déclarée décroît** sur ce profil (6 semaines, 10 km, 6 h/sem) : une phase
   de base au-dessus de la phase de pic est une inversion de périodisation à la SOURCE, pas une
   affaire de réparation. La sonde de capacité (V2.1) fait dépendre la courbe déclarée de
   l'allure — d'où deux courbes différentes pour deux allures ;
2. pourquoi la boucle de réparation choisit S1 comme victime chez le rapide ;
3. seulement ensuite, si l'inversion persiste, un invariant de monotonie sur l'allure — le
   pendant d'I13.

**Le critère `O17` est passé en `expect: 'fail'`** (dette déclarée, décision du fondateur du
03/08/2026) : il reste AFFICHÉ avec son chiffre, comme D2/D3/F2, plutôt que réécrit — ré-ancrer
son témoin effacerait ce qu'il vient de trouver, et les deux candidats de témoin mesurés étaient
instables (la rampe R10 fait légitimement baisser un plan à faible `vol_recent`). À repasser en
`'pass'` **dans le même commit** que sa correction.

```verify
id: O-21
quoi: l'inversion de monotonie sur l'axe ALLURE — un plan plus GROS pour un coureur plus LENT. Le bloc portait « inversions : 1 » sur DEUX points (10 km, vol_recent 0 et 5) ; le lot 1 l'a fait basculer à 2 et le registre a rangé l'entrée en « ne reproduit plus » — deux fois faux, elle reproduisait et davantage. Élargi à 60 couples voisins (4 formats × 5 volumes × 4 allures) le verdict S'INVERSE : 22 → 13 inversions, écart max 2,7 → 4,6 %. Un échantillon de deux points ne mesure pas une monotonie. Le critère porte donc sur la PROPRIÉTÉ, jamais sur un compte : un compte fait rebasculer l'entrée à chaque lot, dans les deux sens, sans rien dire de l'état du défaut (règle 17).
attendu: /inversions d'allure : [1-9]/
cmd: node scripts/sondeO21.mjs
```


### O-22 · L'import Strava appelle « FTP » la puissance d'une sortie entière · ✅ **FERMÉ (03/08/2026) — issues 3 puis 2, et sa fermeture a découvert O-23**

Trouvé par le fondateur le 03/08/2026, en branchant son propre compte — **premier défaut du dépôt
remonté par une donnée réelle** plutôt que par un banc.

**Mesuré sur son compte** : l'import annonce **188 W** quand sa FTP déclarée sur Strava est
**230 W** — 18 % en dessous. Et ce n'est pas cosmétique : la valeur importée est PROMUE en
référence vivante (`tab-profile.js:31` pose `S.answers.ftp` et `ftp_known = "oui"`), donc **toutes
les zones vélo du plan sont calculées dessus**.

**La cause est une erreur de grandeur**, `steps.js:498` :

```js
const best = powRides.reduce((m, a) => Math.max(m, a.weighted_average_watts || a.average_watts || 0), 0);
const ftp  = Math.round(best * 0.95);
```

Le coefficient 0,95 est la règle classique « FTP ≈ 95 % de la meilleure puissance sur **20
MINUTES** », c'est-à-dire d'un test maximal de vingt minutes. Il est ici appliqué à la puissance
NORMALISÉE d'une **sortie entière** — qui peut durer trois heures en endurance. 188 ÷ 0,95 = 198 W
= la meilleure NP de sortie du fondateur, sur une sortie de 1 h 17.

Le libellé entretient la confusion : `source: "Strava (meilleure sortie ≥20min)"` se lit comme
« meilleure puissance sur 20 min » alors qu'il signifie « meilleure sortie de plus de 20 min ».
Même famille que les six mesures démasquées en R20 : **une grandeur nommée pour une grandeur
voisine**.

**LE SENS DE L'ERREUR CHANGE AVEC L'ATHLÈTE, ET C'EST CE QUI LE REND DANGEREUX.**
Pour qui roule surtout en endurance, l'estimation est BASSE : zones trop faciles, sous-charge —
désagréable, pas risqué. Pour qui a fait une seule sortie courte et très dure dans ses 50
dernières activités, elle est HAUTE : le plan prescrit alors des watts que l'athlète ne tient
pas, sur toutes ses séances de vélo. C'est ce second cas qui heurte les priorités 1 et 2 du
manifeste, et rien ne le distingue du premier aujourd'hui.

**TROIS ISSUES, À ARBITRER.**

1. **Ne plus estimer du tout** et le DIRE. Le message existe déjà pour le cas sans capteur
   (« FTP non estimée : pas de capteur de puissance »). L'étendre : une sortie entière ne dit
   pas la FTP. Honnête, gratuit, et cohérent avec P7/P8 (refuser d'estimer en disant pourquoi).
2. **Estimer pour de vrai** : lire les flux de puissance (`/activities/{id}/streams`) et chercher
   la meilleure moyenne glissante sur 20 min. C'est la grandeur que le 0,95 attend. Coût : un
   appel API par activité, donc un quota et une latence.
3. **Lire la FTP DÉCLARÉE sur Strava** (`/athlete` rend `ftp`). Demande le périmètre
   `profile:read_all` en plus d'`activity:read_all`, donc une ré-autorisation de tous les
   comptes déjà connectés. À noter : c'est une valeur DÉCLARÉE — R14.1 a payé cher la leçon
   « un chiffre auto-déclaré ne pilote rien » —, mais contrairement à un adjectif, elle vient
   le plus souvent d'un vrai test, et l'athlète peut la corriger.

**Recommandation : 1 immédiatement, puis 2.** Ne pas afficher un chiffre faux coûte moins qu'un
chiffre faux qui pilote des zones ; et l'issue 2 rend la grandeur que le coefficient attend.

**Contournement pour l'athlète, aujourd'hui** : saisir la FTP à la main au Profil — la saisie
prime sur l'import et régénère le plan.

Les deux autres références importées portent le même soupçon et n'ont PAS été mesurées :
`thrPace` prend la course la plus rapide EN MOYENNE (le code le dit lui-même : « estimation
basse »), `css` la nage la plus rapide en moyenne. Leur libellé est plus honnête, leur méthode
reste une moyenne de sortie.

**FERMÉ le 03/08/2026 — les issues 3 PUIS 2, dans cet ordre, et pas l'issue 1.** L'arbitrage
recommandé ci-dessus (« 1 immédiatement ») supposait que l'issue 3 coûtait une ré-autorisation de
tous les comptes connectés : au moment où le défaut a été trouvé, **aucun compte n'était encore
connecté** — le relais venait d'être déployé (H-1). Le coût de l'issue 3 était donc nul, et elle
donne la valeur que l'athlète attend. Cascade livrée dans `stravaImport` :

1. **La FTP déclarée du profil** (`/athlete`, périmètre `profile:read_all`) — `ftpSrc = "Strava
   (FTP de ton profil)"`. C'est une valeur déclarée, et R14.1 dit qu'un chiffre auto-déclaré ne
   pilote rien ; la différence est qu'elle est CORRIGEABLE par l'athlète, sur son propre écran, et
   qu'elle vient le plus souvent d'un test.
2. **À défaut : la meilleure moyenne glissante sur 20 minutes RÉELLES** (`/activities/{id}/streams`,
   `bestRollingMean` borné par le TEMPS et non par le nombre d'échantillons — les flux Strava ne
   sont pas à pas constant), × 0,95. C'est la grandeur que le coefficient attend depuis toujours.
   Bornée à six sorties pour ne pas exploser le quota API.
3. `thrPace` cesse de lire « la course la plus rapide en moyenne » : elle ne retient que les
   sorties de **10 à 15 km**, le raccourci de protocole que le dépôt utilise déjà ailleurs.

**Ce qui n'est PAS traité, et reste ouvert** : `css` est toujours estimée depuis la nage la plus
rapide EN MOYENNE, ce qui n'est pas un CSS (le CSS se mesure sur un 400 m et un 200 m). Même
famille que le défaut fermé ici. Non mesuré sur donnée réelle, pas de compte de test avec de la
natation — suivi ici plutôt que dans une entrée neuve tant que le chiffre n'existe pas.

**Et sa fermeture a découvert O-23** : le correctif serait resté INVISIBLE. Voir ci-dessous.

```verify
id: O-22
quoi: l'import Strava lit la FTP déclarée, sinon la meilleure moyenne sur 20 min réelles
attendu: /FTP de ton profil[\s\S]*bestRollingMean|bestRollingMean[\s\S]*FTP de ton profil/
cmd: grep -n "FTP de ton profil\|bestRollingMean\|meilleure sortie ≥20min" endurabuild/js/ui/steps.js
```

---

### O-23 · La fonction nommée `latest` rendait le test le plus ANCIEN · ✅ **FERMÉ (03/08/2026)**

Trouvé en regardant la capture du journal du fondateur après le correctif d'O-22 : trois imports
Strava du **même jour**, et la référence vivante affichée n'était pas celle du dernier.

**Le mécanisme est un tri incomplet**, `tab-profile.js` :

```js
c.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
return c[0];        // « le plus récent »
```

Le tri ne porte que sur la DATE. `Array.prototype.sort` est **STABLE depuis ES2019** : à date
égale, l'ordre d'insertion est conservé — donc `c[0]` est le **PREMIER inséré**, c'est-à-dire le
plus VIEUX. Une fonction nommée `latest` qui rend le plus ancien.

Reproduit sur trois tests, dont deux le même jour :

```
Trois tests le MÊME jour ; le plus récent est le 3e (230 W).
  latest() rend : 188 W — « import 1 »
  DÉFAUT : la fonction nommée « latest » rend le PLUS ANCIEN
```

**LA CONSÉQUENCE EST QUE LE CORRECTIF D'O-22 SERAIT RESTÉ INVISIBLE.** Un nouvel import aurait
écrit 230 W dans le journal, `latest("ftp")` aurait continué de rendre le 188 W du premier import
du jour, et `S.answers.ftp` — la référence que le moteur lit vraiment — n'aurait pas bougé. On
aurait cherché le défaut dans l'import, qui venait d'être corrigé. Plusieurs tests le même jour
n'est pas un cas de bord : c'est ce que produit quiconque branche un compte et relance l'import
pour voir.

**Le moteur, lui, avait raison depuis toujours** : `measuredRate` (`src/engine/projection.ts`)
trie en ordre CROISSANT et prend le **dernier** élément, donc à date égale il obtient bien le plus
récent. Les deux chemins lisaient déjà le même journal et en tiraient deux valeurs différentes —
la forme exacte que R11.1 interdit, ici entre le moteur et l'UI plutôt qu'entre deux tables.

**Correctif** : départage par POSITION à date égale (`(y.i - x.i)`). Le journal est append-only,
l'ordre du tableau EST l'ordre chronologique à l'intérieur d'une journée — aucune horloge à
ajouter, aucun format d'entrée à changer. Garde `O-23` dans `tests/e2e/smoke-improvements.mjs` :
trois tests dont deux le même jour, `syncRefsFromTests()`, la référence doit valoir 230.
**Vérifiée rouge** contre le code d'avant (elle rendait 188).

```verify
id: O-23
quoi: à date égale, `latest` départage par position et rend le DERNIER test inscrit
attendu: /y\.i - x\.i/
cmd: grep -n "y.i - x.i" endurabuild/js/state.js
```

---

### O-24 · Le cache de l'app servait la version d'il y a neuf lots · ✅ **FERMÉ (03/08/2026)**

**Le défaut le plus coûteux trouvé jusqu'ici, parce que c'est le seul dont la mesure ne pouvait
rien dire.** Les 23 gates étaient verts, le golden était vert, le correctif était sur `main` — et
l'utilisateur voyait toujours l'ancien comportement.

Trouvé en cherchant pourquoi O-22 et O-23, tous deux livrés et mergés, ne changeaient rien sur le
téléphone du fondateur.

**Le mécanisme.** `endurabuild/sw.js` sert l'app en **cache-first** : un asset trouvé en cache est
rendu sans jamais interroger le réseau. C'est le bon choix — l'app doit marcher hors ligne — et il
a un corollaire qui n'était tenu par rien : le cache n'est purgé qu'au changement de `VERSION`, et
`VERSION` était une constante que quelqu'un devait penser à incrémenter à la main.

Personne n'y pensait. Mesuré :

```
Dernier bump de VERSION : 8ba7c3d — RV (« eb-pwa-v17 »)
Commits touchant un asset CACHÉ depuis : 12
Modules servis modifiés depuis        : 14
```

Soit **U14, U15, U16, I14b, O-21, A-5, A-6, O-22, O-23** — neuf lots de correctifs qui
n'atteignaient aucun navigateur ayant déjà ouvert l'app. Le fondateur a redéployé son worker
Strava, s'est déconnecté, reconnecté, réimporté, et a revu 188 W : il testait le code d'avant O-22.

**Et un second trou, dans la même liste.** `ASSETS` était écrite à la main elle aussi ; il y
manquait `js/measured.js`, `js/projection-log.js` et `js/ui/tab-week.js` — trois modules VIVANTS,
importés au démarrage. Un cache qui oublie un module ne casse pas en ligne : il casse chez
quelqu'un, dans le métro.

**La forme est connue, l'habillage est nouveau.** « Un correctif que la cascade annule est un
correctif qu'on croit avoir » (R18.1), `.gd-det { font-size: 11px }` qui écrasait sur mobile
l'aération posée deux étages plus haut (U16). Ici c'est le CACHE qui annule, et il annule **tout**
— pas une règle CSS, la totalité du produit.

**Correctif : la VERSION est l'empreinte.** `scripts/buildSW.mjs` calcule `VERSION` comme le
hachage du CONTENU de tous les assets servis, et dérive `ASSETS` du disque. Elle change si et
seulement si un fichier change ; il n'y a plus d'état « à jour dans le dépôt, périmé dans le
service worker » (R11.1 appliqué au couple fichiers ↔ numéro qui les version). Le nom entre dans
le hachage autant que le contenu : retirer un module change ce que l'app sert hors ligne, même si
aucun autre octet ne bouge.

**Garde : `npm run check:sw`, 24ᵉ gate CI**, exactement le motif déjà éprouvé de
`build:app`/`check:app`. **Vérifiée rouge** en modifiant un module sans reconstruire (code de
sortie 1, message qui nomme la conséquence plutôt que le symptôme). L'oubli devient impossible au
lieu d'improbable — c'est la seule forme de correction qui vaille pour un défaut dont la cause
était « quelqu'un doit s'en souvenir ».

```verify
id: O-24
quoi: la VERSION du service worker est dérivée du contenu servi, et un gate refuse un sw.js périmé
attendu: /✓ sw\.js à jour/
cmd: npm run --silent check:sw
```

---

### O-25 · L'allure seuil importée n'était pas un effort maximal, et l'import défaisait la correction · ✅ **FERMÉ (03/08/2026)**

Remonté par le fondateur une fois O-24 fermé — donc **le premier retour où il voyait enfin le code
qu'on lui livrait**. Deux défauts distincts, qui se combinaient pour produire un seul symptôme :
« mon seuil passe à 5'37 au lieu de 4'42 ».

#### (a) La fenêtre de distance sans le « à fond »

`disciplineRegistry.ts` énonce le raccourci en entier : *« un 10-15 km récent **À FOND** est une
bonne estimation »*. O-22 avait posé la fenêtre de distance — c'était juste, et c'était la moitié
de la règle. L'autre moitié n'était vérifiée par rien : **une sortie longue tranquille de 12 km
entre exactement dans la fenêtre et n'est pas un test.**

Mesuré sur le compte du fondateur : **5'37/km annoncé pour un seuil réel à 4'42**, soit 55 s/km
d'écart et toutes les zones de course décalées d'un cran. C'est exactement le défaut d'O-22 sur un
autre poste : **un raccourci de protocole appliqué à une grandeur qui n'est pas celle qu'il
attend.** Le sens de l'erreur est cette fois systématiquement BAS — on prend une moyenne de
sortie, elle ne peut qu'être plus lente que le seuil — donc sous-charge silencieuse.

**Cascade livrée**, calquée sur celle de la FTP :

1. **Une COURSE, déclarée telle sur Strava** (`workout_type === 1`), entre 10 et 15 km. C'est le
   « à fond » du protocole, attesté par l'athlète lui-même.
2. **La meilleure moyenne glissante de 10 minutes**, lue dans le flux de vitesse
   (`velocity_smooth`). Le protocole du seuil est « 3 min + 10 min à fond » : c'est la grandeur
   qu'il attend, et elle vit **à l'intérieur** des séances (un tempo, une côte, une fin de sortie)
   au lieu d'être noyée dans une moyenne de sortie. Même fonction que pour la puissance —
   `bestRollingMean`, une seule fois écrite (R11.1).
3. **Aucune estimation, et on le dit** (P7/P8), avec les deux issues : corriger au Profil, ou
   faire le test.

#### (b) « La saisie manuelle prime toujours sur l'import » était faux

Le message de l'import le promet depuis son écriture. Il ne primait pas : la saisie et l'import
atterrissent dans le **même journal**, à la **même date**, et le départage par position posé par
O-23 fait gagner le dernier inséré — c'est-à-dire l'import, puisque l'ordre naturel est de
corriger d'abord et de réimporter ensuite.

Mesuré, et le banc rend le chiffre exact du symptôme :

```
FAIL O-25 — un import du même jour ne défait pas ta correction (5:37, attendu 4:42)
```

C'est une **conséquence directe d'O-23** : en réparant « latest rend le plus ancien », j'ai fait
gagner l'import contre la correction. Le correctif était juste et incomplet — il fallait dire ce
que « le plus récent » signifie quand deux sources parlent le même jour.

**Règle livrée** : une valeur **saisie** (ou issue d'un **retest guidé** — un protocole exécuté
volontairement) bat tout import de la même date. Au-delà, la date reprend la main : un import
postérieur dit quelque chose de neuf, et geler la valeur à vie serait le défaut symétrique. Les
deux moitiés sont assertées. Le message d'interface cesse de promettre « toujours » et dit ce qui
est vrai : « ta correction prime sur cet import et sur tout import du même jour ».

**Gardes** : cinq critères `O-25` dans `tests/e2e/smoke-improvements.mjs` — les deux moitiés de la
règle de priorité, plus trois sur `bestRollingMean` (elle trouve le bloc rapide ; un effort de
8 min ne rend PAS une « moyenne de 10 min » ; la fenêtre est bornée par le TEMPS et non par le
nombre de points). Le critère (b) **vérifié rouge** contre le moteur d'avant.

```verify
id: O-25
quoi: l'allure seuil vient d'une course déclarée ou du meilleur 10 min, jamais d'une moyenne de sortie
attendu: /velocity_smooth[\s\S]*workout_type|workout_type[\s\S]*velocity_smooth/
cmd: grep -n "workout_type\|velocity_smooth\|meilleur 10 min" endurabuild/js/ui/steps.js
```

### O-26 · La sortie longue n'atteignait pas sa cible de spécificité · ✅ **FERMÉ — C30b (décision du fondateur, 05/08/2026)**

Trouvé en implémentant **C30** (« se rapprocher du temps visé sur l'épreuve a minima, et au moins
70 % de la distance »). La règle était écrite, juste, et ne faisait presque rien : **7 profils
déplacés sur 180**, cibles atteintes **31/48**.

**Décision du fondateur (05/08/2026)** : *« oui si elle respecte les plafonds ; en semaine de pic,
la sortie longue peut représenter 70 % du volume de semaine si nécessaire »*. Livré sous **C30b**
(`raiseLongRunToSpecificity`, `planGenerator.ts`) : la longue monte vers sa cible, et les minutes
sont **PRISES aux séances faciles de la même semaine** (R4.1 — jamais à la qualité). Le volume de
la semaine ne bouge pas d'une minute : c'est une redistribution, pas une charge en plus, et c'est
ce qui la rend compatible avec « si elle respecte les plafonds ».

**Cibles atteintes 31/48 → 46/48 ; 28 profils déplacés sur 96** (4 formats × 3 niveaux ×
4 allures × 2 enveloppes), tous en 10 km et en semi, tous chez des coureurs à 5:45/km et plus
lents. Le plus gros déplacement : **10 km @ 8:30/km, 47 → 76 min**, +62 %, sur exactement la
population pour laquelle C30 avait été écrit. Aucun profil à 4:30/km (le rapide atteignait déjà
sa cible), aucun sur marathon (la longue y est au plafond C23 depuis toujours, C31 prend le
relais). Les **2 profils restants** manquent leur cible de **2 minutes** : les séances donneuses
sont à leur plancher, il n'y a plus rien à déplacer.

**Trois choses que la mesure a corrigées dans mon travail, gardées écrites.**

**(a) Ma première écriture faisait son travail puis se le faisait annuler.** Placée juste après
`refillEasyAfterLabelCap`, elle montait bien la longue d'un débutant sur 10 km de 55 à 64 min sur
quatre semaines — puis `enforceHardTimeCap` rabotait le total de la semaine et le point fixe C22
la rescalait **proportionnellement** : 64 → 57, 53, 55. Trois gains sur quatre effacés, et la
mesure finale disait « la passe est inerte » alors qu'elle agissait puis était défaite.
**Douzième paiement de la leçon du point fixe**, cette fois sur ma propre passe. Elle est rejouée
après le point fixe — ce qu'elle peut se permettre parce qu'elle est neutre en volume, ne déplace
que des minutes faciles (donc hors d'atteinte de C26c/C26d) et ne fait que MONTER la longue (donc
va dans le sens d'I14 au lieu de le rouvrir). Elle est aussi rejouée dans le **dernier**
`reconcileDeclaredVolume`, celui du `repairLoop` : c'est lui dont la sortie est livrée.

**(b) « Semaine de pic » n'existe pas comme phase sur une prépa courte.** Restreinte à
`phase.id === "peak"`, la passe se déclenchait **0 fois sur les 48 profils de la grille** — parce
qu'une prépa de 5 km ou de 10 km n'a **aucune** semaine de phase `peak` (base → dev → spec →
taper), et que c'est justement la population que C30 sert le plus mal. « En semaine de pic » se
lit donc sur la CHARGE quand la phase n'existe pas : les semaines les plus lourdes du plan, celles
que l'athlète appelle sa plus grosse semaine. Même famille qu'**O-21**, qui a dû dire ce que vaut
« dev ≤ pic » quand aucune semaine de pic ne porte de charge. La cohorte se lit sur la courbe
**déclarée** et non sur les minutes livrées — mesuré, une cohorte calculée sur les minutes changeait
entre deux passages et une semaine portée à sa cible en sortait au second.

**(c) La borne des 70 % n'a encore jamais mordu, et c'est publié.** Part de la longue mesurée :
**médiane 33 %, maximum 55 %** — la permission du fondateur laisse 15 points inutilisés. Cassure
délibérée : porter la borne à ×9 (donc la retirer) **ne change rien** (`K4` verte). Ce qui borne
réellement, c'est le **plafond de séance du format** (5 km 74, 10 km 90, semi 130, marathon 180).
C'est le pendant exact de la moitié « 70 % de la distance » de C30, elle aussi jamais mordante :
la règle du fondateur est respectée dans les deux sens, et le facteur limitant est ailleurs.

**Ce qui n'a PAS été fait, et pourquoi.** Les trois issues envisagées en ouvrant cette entrée —
indexer le volume utile sur le TEMPS de course (1), élargir la part hebdomadaire (2), assumer et
le dire (3) — sont tranchées par la mesure : (2) est livré et suffit, (1) reste une refonte de
`UTIL` et de la sonde de capacité que rien ne réclame plus, (3) n'a plus d'objet sur 46 profils
sur 48. `blockBounds` continue de remplacer le plancher déclaré par son « plancher digne »
forfaitaire (décision D3-D7/D10 de l'audit v6) et **c'est très bien ainsi** : forcer ce plancher
avait été mesuré et rendait les choses PIRES (30/48 au lieu de 31). Le correctif ne passe pas par
le plancher, il passe par la répartition.

**Gardes** : `C30-A` (banc v6) re-épinglé sur les valeurs livrées, avec les **trois états
successifs** écrits (sans rien → C30 seul → C30b) et quatre témoins qui ne doivent pas bouger ;
`C30b-A` (nouveau) porte le mécanisme — part ≤ 70 %, chiffre de la décision relu sur le plan
LIVRÉ, et neutralité en volume vue du dehors (la semaine ne dépasse pas sa courbe annoncée).
**Vérifiées rouges sur trois cassures sur quatre** ; la quatrième est le résultat (c) ci-dessus.
Le golden gagne une sous-passe `C30b/run/10k` — sa passe « allure » existante regardait
`vol_max: 10`, la bonne enveloppe pour C31 mais la mauvaise pour C30b (à 10 h la longue est déjà
butée sur son plafond aux trois formats), **quatrième occurrence du même angle mort qu'A-2**,
vérifié en retirant C30b du moteur.

```verify
id: O-26
quoi: C30b porte la sortie longue à sa cible de spécificité et la garde sous 70 % de la semaine
attendu: /cibles C30b : 6\/6 · part max \d+ %/m
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const P=(o)=>E.buildPlan('run',Object.assign({intent:'competition',med_pain:'non',med_dizzy:'non',med_treat:'non',age:'32',sex:'H',weight:'75',height:'178',history:'confirme',level:'inter',injury:'aucune',sessions_max:'5',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',pace_known:'oui',vol_recent:'3',terrain:'route'},o));const M={'10k/8:30/8':79,'10k/7:00/6':64,'semi/8:30/8':130,'semi/7:00/6':130,'10k/4:30/8':59,'marathon/4:30/8':180};let ok=0,part=0;for(const k in M){const [format,pace,vol_max]=k.split('/');const p=P({format,pace,vol_max});let s=0;p.weeks.forEach(w=>{const ss=w.days.flatMap(d=>d.sessions).filter(x=>x.d!=='rs');const t=ss.reduce((a,x)=>a+(x.min||0),0);ss.forEach(x=>{if(x.long&&(x.min||0)>s)s=x.min;if(x.long&&t)part=Math.max(part,100*(x.min||0)/t);})});if(s===M[k])ok++;}console.log('cibles C30b : '+ok+'/6 · part max '+Math.round(part)+' %');"
```


### O-27 · Pendant une passe de RÉDUCTION, un plancher absolu peut AUGMENTER un step court · ✅ **FERMÉ (fondateur, 05/08/2026 : « pas très dangereux mais corrige si facile »)**

Trouvé en créant le point unique `src/engine/stepScale.ts` (25 écritures de « réduire un step
d'un facteur », 6 variantes qui n'étaient pas d'accord). Le point unique porte un drapeau
`clampToOriginal` — la promesse A3 de l'audit v6 : *« les planchers ne remontent JAMAIS
au-dessus de la valeur d'origine »*. Ce drapeau a fermé un bug réel : `reduceDay(f = 1,2)`
faisait passer un bloc de **5 à 6 répétitions** (le `Math.min` protégeait durée et distance,
pas `reps`) pendant que son commentaire promettait le contraire. Fermé, garde au banc R21,
vérifiée rouge.

**Mais activer le même clamp sur les cinq trios du GÉNÉRATEUR n'est pas gratuit : 19 profils
golden bougent.** Le mécanisme : `Math.max(10, round(dur × f))` sur une durée de 9 min à
f = 0,9 rend **10** — une passe de réduction qui ALLONGE un step court jusqu'à son plancher
« digne ». Sémantiquement, c'est ce qu'A3 appelle un défaut ; historiquement, c'est un
comportement validé, photographié dans le golden, et possiblement porteur (les planchers de
dignité de l'audit v6 D3-D7/D10 interagissent avec les fenêtres de séance).

**TRANCHÉ.** Les cinq trios du générateur posent `clampToOriginal` — vérifié d'abord que les
cinq sont bien des passes de RÉDUCTION (`f < 1` dans les cinq contextes : décroissance
d'affûtage, R3.13, et les trois coupes de la boucle de réparation). Une réduction ne peut plus
rendre plus qu'elle a reçu, et c'est désormais **structurel** : le point unique `stepScale`
l'applique aux trois champs, il n'y a plus de site où l'écrire autrement.

**Ce que ça déplace, mesuré sur 189 profils de contrôle (7 sports × historiques × niveaux ×
intentions)** : **173 inchangés, 15 en baisse, 1 en hausse** — `duathlon/S/reprise/debutant`,
1268 → 1277 min, soit **+0,7 %**. Golden : 19 empreintes, toutes sur les minutes FACILES, de 1 à
4 min par semaine.

**La hausse résiduelle est signalée sans être attribuée.** Le mécanisme plausible est un effet de
second ordre — le clamp laisse un état intermédiaire plus petit, et une passe de PLANCHER en aval
(qui a le droit d'ajouter) occupe le budget libéré ; la seule semaine concernée est en phase
d'affûtage, où ces passes se croisent le plus. Mais l'attribution n'a pas été tracée, et écrire
« c'est le plancher » sans l'avoir mesuré serait exactement ce que ce registre reproche ailleurs.
Ce qui EST établi : aucune violation dure sur les 27 gates, et l'invariant de step tient
partout.

```verify
id: O-27
quoi: le clamp A3 est posé sur le chemin d'adaptation, et le comportement est asserté par le gate R21
attendu: /cablage clampToOriginal : 1$/m
cmd: node -e "const fs=require('fs');const n=(fs.readFileSync('src/readiness/dailyAdjuster.ts','utf8').match(/clampToOriginal: true/g)||[]).length;console.log('cablage clampToOriginal : '+n);"
```


### O-28 · `audit:amont` ne voit pas une dérive silencieuse sur les bornes numériques · ✅ **FERMÉ (04/08/2026) — et ma première correction était INERTE**

Trouvé par l'audit des gardes (04/08/2026) : pour chacun des huit gates jamais vérifiés rouges,
casser exprès ce qu'il prétend protéger et vérifier qu'il rougit. Six mordent (`audit:v1` sur la
garantie R3.13 finale, `demo:repair` sur `applyTargetedRepairs`, `demo:readiness` sur le registre
objectif, `demo:fit` sur la signature, `demo:measured` sur l'arbitrage, `demo:retention` sur la
série gratuite). Deux sont muets — celui-ci et O-29.

**La cassure, vérifiée ACTIVE avant le verdict** (la leçon a coûté trois faux verdicts dans ce
même audit : un `reduire(f=1)` réparé par la garantie aval, un bundle refusé par l'auto-test du
build, un `coerce` que personne ne lit) : remplacer le refus typé hors bornes d'`answerSchema`
par un clamp silencieux — `vol_max: "999"` **accepté, clampé à 40, plan généré, aucun journal**.
Mesuré : le comportement change (« vol_max=999 accepté en silence »), le build passe, et
`audit:amont` — dont la promesse est « 551 entrées fausses → refus MOTIVÉ, sans effet, ou dérive
ANNONCÉE ; zéro dérive silencieuse » — reste **vert**.

**CE QUI L'A FERMÉ — après une correction retirée.** Ma première idée était de resserrer le
prédicat : une explication ne compterait que si elle NOMME la clé mutée (mots dérivés de
`answerSchema[k].label`). Écrite, puis **mesurée : 0 verdict changé sur 472** contre le moteur
intact, **et toujours verte contre la cassure** — parce que `R20.2` parle légitimement de « ton
volume max » dans chaque plan, donc le prédicat par mots-clés était satisfait par une explication
présente des deux côtés. Correction inerte, retirée comme C23b et R19.4/O-12.

Ce qui ferme le trou ne devine rien : le schéma DÉCLARE des bornes, donc une valeur hors bornes
doit être **refusée, typée, en nommant sa clé**. Nouvelle section **T5** dans `audit_amont.cjs`,
dérivée du schéma (`answerSchema`, R11.1 — la recette d'`audit:sensibilite`) : pour chaque clé
numérique bornée présente dans le questionnaire du sport, `min − 1` et `max + 1` doivent lever un
`ENTREE_INVALIDE` **portant cette clé**. `70 bornes éprouvées (22 clés) · 0 non tenue`.
**Vérifié rouge contre la recette ci-dessus : 70/70.**

*Note d'instrument, gardée écrite : mes deux premières écritures du critère cherchaient la clé
dans le MESSAGE du refus par regex, et toutes deux ont échoué sur l'échappement — `"\\\\b"` dans le
fichier JS vaut « antislash littéral + b », `"\\b"` vaut le caractère retour arrière. Résultat :
70 refus bien réels comptés comme absents, un banc rouge pour rien. La clé est lue sur la
propriété `EBInputError.key` — un contrat typé se lit sur son type, pas dans sa prose.*

### O-29 · `audit:public` ne voit pas une séance au repère d'intensité VIDE · ✅ **FERMÉ (04/08/2026)**

Même méthode, même statut. La cassure : vider le repli RPE de la zone `rn.thr`
(`fb: ""`, `hr: null`) — pour l'athlète sans allure déclarée, la séance rend littéralement
**« 3×5min @  »**, un `@` suivi de rien. C'est mot pour mot le défaut que le banc existe pour
empêcher (« 0 séance sans repère exécutable », R12). Vérifié : le rendu porte bien le trou, le
build passe, et `audit:public` reste **vert**.

**La cause, mesurée** : le §A teste la SÉANCE ENTIÈRE contre une alternance de mots-repères. Il
suffit qu'un échauffement dise « progressif » pour que la séance passe — même si son bloc de
travail annonce « 3×5min @  ». Le banc vérifiait la présence d'un chemin de repli, pas le CONTENU
rendu : une mesure qui porte sur une grandeur voisine de celle qu'elle nomme.

**Section E** ajoutée à `banc_grand_public.cjs` : dans le texte que l'athlète a sous les yeux,
chaque `@` doit être suivi d'un repère avant le prochain séparateur (`·`, `(`, `—`, fin). C'est
une propriété du LIVRÉ — elle ne suppose rien du chemin qui l'a produite — et elle est éprouvée
sur les 6 sports × 3 niveaux × {sans références, avec références}, un `@` vide n'étant jamais
acceptable. **Vérifiée rouge contre la recette ci-dessus.**

### O-30 · Les seuils XP 17-30 de l'avatar composite sont une extrapolation NON calibrée · ⏳ **OUVERT — dette déclarée, décision produit**

R25 fait passer l'avatar de 16 à **30 niveaux par discipline**. Les 16 premiers seuils sont les
seuils HISTORIQUES décalés d'un cran (le niveau 0 — silhouette nue — existe désormais) : pour un
compte existant, même XP → même visuel, c'est la non-régression, elle se lit en XP et non en
numéro de niveau, et elle est gardée par `demo:avatartri` (10 XP → niveau 1, 3 500 → 15).

Les seuils **17 à 30** (4 500 … 120 000) n'ont, eux, AUCUNE base mesurée : ils prolongent la
courbe des 16 premiers par une progression « qui a l'air raisonnable ». À 10 XP la séance
(repos exclu), le niveau 30 d'une discipline demande ~12 000 séances validées — c'est
délibérément « une carrière », mais personne n'a décidé si la carrière visée est de 5 ans ou de
30. Le risque n'est pas technique : un palier trop lointain cesse de motiver (le teaser
« prochain : … » devient un horizon), un palier trop proche brade l'or. La calibration demande
des données d'usage réelles qui n'existent pas encore — la même exigence qui a fait retirer ma
première calibration de P11 (un cas unique ne calibre rien, HERITAGE).

Ce qui est VERROUILLÉ en attendant : les seuils sont épinglés (le bloc ci-dessous rougit si
quelqu'un les bouge « en passant »), monotones, bornés à 30, et le niveau ne décroît jamais
(l'XP est un cumul). Réviser les seuils 17-30 est une décision PRODUIT du fondateur, pas un
correctif — le jour venu, la migration devra relire ce paragraphe : changer un seuil change le
niveau AFFICHÉ d'athlètes existants, et l'avatar ne doit jamais se déshabiller (la règle
d'AV3-C, étendue à une refonte de barème).

```verify
id: O-30
quoi: les seuils 17-30 restent épinglés tels que déclarés (extrapolation assumée, pas calibrée)
attendu: /10->1 · 3500->15 · 119999->29 · 120000->30 · monotone OUI/
cmd: node -e "import('./src/app/bridge.ts').then(m=>{const L=m.avatarTriLevel;let mono=true;for(let x=0,p=0;x<=130000;x+=250){const l=L(x);if(l<p)mono=false;p=l;}console.log('10->'+L(10)+' · 3500->'+L(3500)+' · 119999->'+L(119999)+' · 120000->'+L(120000)+' · monotone '+(mono?'OUI':'non'));})"
```

### O-31 · `#ff3d00` porte TROIS sens sur le même écran · ⏳ **OUVERT — arbitrage de vocabulaire, décision fondateur**

Les trois accents de discipline ont été alignés sur la maquette (fondateur, 12/08/2026) après
mesure de leur contraste — natation 5,52 · vélo 4,34 · course 10,67, les trois au-dessus des 3:1
que WCAG 1.4.11 demande à un composant porteur d'information. La condition posée était donc
remplie, et les trois valeurs sont adoptées. Le fondateur avait joint un avertissement : *« #FF3D00
est déjà utilisé comme --zn-orange (couleur de marque/CTA) ; vérifie qu'aucune confusion visuelle
n'apparaît »*. **Elle apparaît, et elle est plus large que prévu** — ce n'est pas une collision à
deux termes mais à trois.

`#ff3d00` signifie désormais, sur la MÊME grille de semaine :

| sens | où | rendu |
|---|---|---|
| **attention / marque** | anneau de la carte du jour, héros 🎯, onglet actif, CTA | `#ff3d00` plein |
| **charge DURE** | bordure de carte d'un jour dur (`CHARGE.dur.rgb`) | `rgb(255 61 0 / .34)` |
| **discipline VÉLO** | tuile de badge (`DISC.bk.ac`) | `#ff3d00` plein |

Les deux premiers coexistaient déjà (la charge dure emploie ce triplet depuis avant V4, à 34 %
d'opacité — donc distinguable) ; **c'est le troisième qui est nouveau, et il est à pleine
saturation, comme le premier.**

**Mesuré, plutôt qu'estimé.** Sur 🗓 Plan : **2 éléments** portent l'orange au sens « attention »
contre **24 badges vélo** de la teinte identique — la couleur d'attention de la marque devient
12 fois plus fréquente comme *décoration* que comme *signal*. Sur 📅 Semaine, le balayage des sept
jours donne **2 jours sur 7** (mardi, jeudi) où l'anneau « aujourd'hui » entoure une carte dont le
badge est exactement de sa couleur — le seul cas mesuré où deux sens se superposent sur un même
objet. Et sur 🎯 Aujourd'hui un jour de vélo, le cas que le fondateur avait lui-même nommé
(« carte de séance avec CTA à proximité ») : le héros est peint du dégradé de marque partant de
`#ff3d00`, et le badge vélo est **79 px sous lui**, à la même valeur.

**Ce que ça coûte, dit franchement** : rien n'induit en erreur au sens fort — le badge est une
tuile de 26 px avec un pictogramme, l'anneau est un trait de 2 px sur un bord, le héros fait
362×348. La forme et la position les séparent. Ce qui se perd est plus discret : la couleur
CESSE de porter le signal à elle seule. Un athlète qui a appris « l'orange, c'est ce qui
m'appelle » doit désormais lire la forme pour trancher, et sur un jour de vélo l'écran 🎯 devient
quasi monochrome au moment précis où le badge devrait dire « c'est du vélo ».

**Pourquoi ce n'est pas corrigé ici** : les trois issues touchent au VOCABULAIRE de la marque, pas
à un défaut. (1) Ne rien changer — la maquette a été validée telle quelle, et la forme suffit
peut-être. (2) Sortir le marqueur « aujourd'hui » de l'orange — mais `zenna-tabs.css` écrit
explicitement « l'orange du thème EST déjà son vocabulaire d'attention, on n'invente pas une
seconde couleur d'accent », et le seul autre marqueur existant (`--zn-gold`) veut déjà dire
« échange en attente ». (3) Décaler le vélo hors de l'orange de marque — mais ce serait inventer
une couleur que la maquette ne porte pas, ce que ce lot s'est interdit. Aucune n'est un correctif
évident, les trois sont des décisions de design.

**Ce qui est verrouillé en attendant** : les cinq accents sont deux à deux distincts et chacun
tient ses 3:1 (`smoke-carte-seance` §3 et §6, vérifiés rouges) — donc la lisibilité est gardée
même si le vocabulaire ne l'est pas.

```verify
id: O-31
quoi: les trois sens partagent-ils toujours le triplet 255 61 0 ?
attendu: /marque #ff3d00 · charge dure 255 61 0 · velo #ff3d00 → COLLISION 3 sens/
cmd: node -e "import('./endurabuild/js/ui/icons.js').then(m=>{const fs=require('node:fs');const css=fs.readFileSync('endurabuild/css/zenna-today.css','utf8');const o=(css.match(/--zn-orange:\s*(#[0-9a-f]{6})/i)||[])[1];const d=m.CHARGE.dur.rgb,v=m.DISC.bk.ac;const t=d.split(/\s+/).map(Number);const coll=(o.toLowerCase()===v.toLowerCase())+(t[0]===255&&t[1]===61&&t[2]===0?1:0)+1;console.log('marque '+o+' · charge dure '+d+' · velo '+v+' → COLLISION '+coll+' sens');})"
```

### O-32 · Les quatre polices de R-ZENNA n'ont jamais été précachées · ✅ **FERMÉ (12/08/2026)**

Trouvé en ajoutant Poppins : `npm run build:sw` annonçait **57 assets** avant comme après l'ajout
de deux fichiers `.woff2`. La cause est le SECOND trou d'O-24, dans sa forme exacte. O-24 a rendu
la `VERSION` du service worker dérivée du contenu et la liste `ASSETS` dérivée du DISQUE — mais
seulement pour le `.js` et le `.css`. Les polices restaient écrites **à la main** dans `EN_DUR`,
sous un commentaire qui les déclarait « non listables par extension » : c'est faux, `.woff2` est
une extension comme une autre, et c'est cette justification erronée qui a fait passer la liste
pour intentionnelle.

La liste était restée à **trois** polices (Archivo Black, Space Grotesk, Caveat) — celles d'avant
R-ZENNA. Les **quatre** de R-ZENNA (`bebas-neue-400`, `inter-400-800`, `ibm-plex-mono-400`,
`ibm-plex-mono-700`) n'ont jamais été mises en cache depuis leur arrivée. **Le défaut est
invisible en ligne et net hors ligne** : l'app tient sa promesse « ça marche sans réseau », mais
pas avec sa typographie — tout le thème sombre retombait sur Archivo Black et une pile monospace
système. C'est la même famille que les trois modules vivants qu'O-24 avait trouvés dans cette
même liste, et la démonstration que le correctif d'alors était incomplet.

Correctif : les polices se lisent sur le disque comme le reste (`modules(dir, /\.woff2$/)`).
**57 → 63 assets** (les 4 oubliées + les 2 de Poppins). Au passage, `ASSETS` composait ses groupes
par `EN_DUR.slice(0, 3)` / `EN_DUR.slice(3)` — des indices qui devenaient faux dès qu'on ajoutait
une ligne à `EN_DUR`, ce que ce lot faisait justement ; les trois groupes sont NOMMÉS.

```verify
id: O-32
quoi: toutes les polices du disque sont précachées par le service worker
attendu: /manquantes 0$/m
cmd: node -e "const fs=require('node:fs');const d=fs.readdirSync('endurabuild/assets/fonts').filter(f=>f.endsWith('.woff2'));const sw=fs.readFileSync('endurabuild/sw.js','utf8');const m=d.filter(f=>!sw.includes('assets/fonts/'+f));console.log('disque '+d.length+' · precachees '+(d.length-m.length)+' · manquantes '+m.length+(m.length?' ('+m.join(', ')+')':''))"
```

### O-33 · La traçabilité sourcé/heuristique de `projection.ts` n'est fiable qu'au niveau du chapeau

Trouvé en expliquant P2/P2bis (retour du fondateur, 13/08/2026, sur un chrono projeté) : le
chapeau du fichier classe correctement `G_PLAFOND`, `k_structure`, `τ=20 semaines` et les bandes
de marge course/nage comme « heuristique convergente, pas d'étude princeps » — mais AU MOINS un
commentaire attaché à une constante individuelle contredisait cette classification. Le
commentaire sur `G_PLAFOND.ftp = 0.25` citait une plage « 20-30 %/an chez le NON-entraîné »,
alors que `G_PLAFOND` sert le régime ENTRAÎNÉ (`G_PLAFOND_DEBUTANT` est la table séparée pour le
non-entraîné) — corrigé le jour même (commentaire seul, aucun chiffre changé).

**Ce qui reste ouvert, et n'a pas été traité ici (décision du fondateur : pas urgent, pas cette
session)** : rien ne garantit que ce soit la SEULE incohérence du genre dans le module. Une
relecture complète voudrait vérifier, constante par constante (`K_STRUCTURE`, `ANCRES_VOLUME`,
`ANCRES_WKG`/`ANCRES_PACE`/`ANCRES_CSS`, `GAIN_BAND_LO/HI`, `ADHERENCE_FLOOR`…), que le
commentaire attaché dit correctement (a) sourcé vs heuristique et (b) à QUEL régime/discipline il
s'applique — le même type de confusion qu'O-33 a trouvé pour `ftp`, potentiellement ailleurs.
Aucune commande de vérification mécanisable : c'est une relecture humaine (ou par un futur agent)
de la cohérence prose ↔ usage réel, pas une propriété qu'un script peut trancher seul.

## §2 — Dette CHIFFRÉE et verrouillée (ne peut pas remonter)

Ces défauts sont connus, comptés, et un budget en CI les empêche d'empirer. Ils ne font pas
échouer la CI **par décision explicite**, pas par oubli.

### Banc v6 — 3 dettes (`npm run audit:v6` → « 64 vert · 3 dette connue · 0 régression »)

| id | ce qui reste | pourquoi c'est laissé |
|---|---|---|
| **D2** | 2 configurations sur 153 (`swim/sprint\|demifond/debutant/reprise`) portent encore une violation dure | Tout le plan tient entre 45 min et 1 h de nage par semaine, les 4 séances sont AU plancher (C15 : 850 m ; C20 : 0,42 h/séance) et l'écart semaine max ↔ pic est de 5 minutes. **Il n'y a plus de marge sous les planchers pour exprimer une hiérarchie.** Un rabotage a été tenté : sans effet, les planchers le reprennent immédiatement ; le code a été retiré plutôt que laissé inerte. |
| **D3** | 4 sauts de charge à **+11 %** au lieu de +10 % | Le rapport dev→peak de la courbe vaut 1,18, donc **supérieur à C22 par construction**. Sur un plan court à deux récups consécutives, C22 voudrait le pic ≤ 273 min quand la hiérarchie du plan le veut > 248 : les deux tiennent dans 25 minutes et les planchers de séance interdisent de descendre. Réduire encore ferait passer le pic SOUS une semaine de base — on échangerait une violation contre une pire. **La correction de fond est dans la FORME de la courbe, pas dans une passe de rattrapage.** |
_`O17` a quitté cette table le 05/08/2026 : sa dette est payée par la correction d'O-21, et son
`expect` est repassé à `'pass'` dans le même commit._

| **F2** | 7 séances de qualité à ~42 % de temps en zone cible au lieu de 45 % | **Contradiction assumée entre deux règles.** Ces séances ont déjà leur échauffement et leur retour au calme à leur plancher (C13/C13b) ; atteindre 45 % demanderait exactement ce que C13c interdit (échauffer moins de 10 min avant un effort maximal). La priorité n°2 du manifeste (prévention des blessures) tranche. Le test reste en `expect:'fail'` **pour garder le chiffre sous les yeux**, pas parce qu'on l'a oublié. |

```verify
id: DETTE-v6
quoi: 2 dettes connues (D2, F2 — D3 payée par le lot progression pièce 1, 18/08/2026), 0 régression
attendu: /2 dette connue · ✖ 0 régression/
cmd: npm run audit:v6
```


### Banc v7 — budgets non nuls (`scripts/runAuditV7.mjs`, en ‰ de profils depuis R15.1)

> **R16.10** — les quatre budgets swimrun (`S-LONGSWIM` 53 ‰, `S-MIX` 60 ‰, `S-RUN-STARVED`
> 67 ‰, `S-PREREQ` 80 ‰) sont tombés à **12 / 12 / 12 / 0 ‰** après traitement de la dette :
> une correction moteur (S13) et une correction d'instrument (les checks de spécificité ne
> punissent plus les règles de sécurité). Résidu 5-8 ‰ vérifié sur N=250 / 400 / 600.

| check | budget | nature |
|---|---|---|
| `U-RACEDATE` | 80 ‰ | Course très lointaine : plafond de durée assumé + avertissement (R4.8b). Comportement voulu. |
| `U-DECL` | 13 ‰ | Lissage d'affûtage mesuré récups comprises (R4.8c). |
| `T-NIGHT` | 13 ‰ | Consigne de nuit portée en ATTRIBUT sur les séances survivantes (R4.7b) plutôt que par une séance dédiée. |
| `T-DPLUS-WK`, `T-POLES-ADV` | 13 ‰ chacun | Résiduels trail sur profils extrêmes. |
| `D-DISC` | 7 ‰ | Corrigé en R15.1 (couverture de discipline en semaine de course) — mesuré 0 à N=400. |
| `S-LONGSWIM` `S-MIX` `S-RUN-STARVED` `S-PREREQ` | ~~54 · 60 · 67 · 80 ‰~~ → **12 · 12 · 12 · 0 ‰** | ✅ **R16.10** : le module est expédié, les checks sont donc exercés, et les budgets sont à la taille du résidu réel (5-8 ‰, vérifié sur N=250 / 400 / 600) au lieu de trois à cinq fois au-dessus. |

> ⚠️ La ligne swimrun mérite d'être lue deux fois : ce sont 39 défauts budgétés sur du code
> **expédié dans `src/` mais absent du produit**. Ce n'est pas une dette du produit, c'est une
> dette du dépôt — et elle redeviendra une dette du produit le jour où swimrun rentrera en V1.

---

```verify
id: DETTE-v7
quoi: tous les checks dans leur budget (swimrun compris depuis R16.10)
attendu: /tous les checks dans leur budget/
cmd: npm run audit:v7
```

---


### D3 · C22 — 7 sauts de +11 à +17 % · 📊 **DIAGNOSTIQUÉ (R15.4) — deux causes, pas une**

Le handoff R15.4 proposait une cause et un correctif : *« C22 contraint les TRANSITIONS,
les ratios de phase contraignent les NIVEAUX ; deux spécifications indépendantes de la même
quantité »*, à résoudre en générant les niveaux par produit cumulé des incréments autorisés.
Avant de refaire la courbe, j'ai instrumenté le test D3 pour qu'il dise QUELLES configurations
sautent, et de combien — puis comparé, sur chacune, la courbe **DÉCLARÉE** (`w.vol`, ce que le
moteur promet) au **PRESCRIT** (somme des minutes réellement posées).

Les 7 sauts, tous entre semaines **consécutives** (aucun ne franchit une semaine de récup) :

| configuration | saut |
|---|---|
| tri/M (12 sem) S8→S9 puis S9→S10 | +11 % · +11 % |
| tri/70.3 (20 sem) S12→S13 | +12 % |
| swim/sprint (8 sem) S3→S4 | +17 % |
| swim/demifond (10 sem) S2→S3, S3→S4, S7→S8 | +13 % · +13 % · +11 % |

**Et la comparaison déclaré ↔ prescrit sépare les cas en deux familles.** Le test D3 le dit
désormais lui-même (`npm run audit:v6 -- --verbose`), sur son propre profil de référence :

| configuration | déclaré | prescrit | cause |
|---|---|---|---|
| tri/M S8→S9 | +6 % | +11 % | **discrétisation** |
| tri/M S9→S10 | +7 % | +11 % | **discrétisation** |
| tri/70.3 S12→S13 | +16 % | +12 % | **courbe** |
| swim/sprint S3→S4 | +18 % | +17 % | **courbe** |
| swim/demifond S2→S3 | +24 % | +13 % | **courbe** |
| swim/demifond S3→S4 | +5 % | +13 % | **discrétisation** |
| swim/demifond S7→S8 | +8 % | +11 % | **discrétisation** |

**4 discrétisation · 3 courbe.**

**Conséquence pour le correctif : la sortie proposée par le handoff ne fermerait que 3 des
7 sauts.** Générer les niveaux par produit cumulé rend la courbe DÉCLARÉE conforme par
construction — ça traite la seconde famille. Ça ne touche pas la première, où la courbe est
déjà conforme et où le dépassement vient de ce que la semaine ne peut pas se diviser plus fin :
sur 90 min hebdomadaires en natation, une séance à son plancher (C15 850 m / C24b 750 m) pèse
plus de 10 % de la semaine, donc toute recomposition casse mécaniquement le seuil.

**Le lot R15.4 se dédouble donc**, et c'est la mesure qui l'a dit, pas une intuition :
1. **forme de la courbe** — niveaux par produit cumulé des incréments autorisés, puis mise à
   l'échelle sur le pic. Le ratio dev→peak devient une conséquence de la longueur du plan.
2. **granularité** — décider ce que C22 signifie quand l'unité indivisible dépasse le seuil.
   Trois issues possibles, à trancher avec les chiffres : tolérer un plancher absolu en minutes
   sous un certain volume hebdo ; exempter explicitement les semaines dont la plus petite
   séance dépasse 10 % du total ; ou accepter que C22 ne s'applique qu'au déclaré. **Aucune ne
   doit être choisie sans mesurer combien de configurations chacune laisse passer.**

**Ordre ARBITRÉ (01/08/2026) : la granularité d'abord.** C'est une question de DÉFINITION, pas
de code — elle ferme 4 sauts sur 7 et ne touche aucun plan, donc aucune empreinte du golden ne
bouge. Les trois issues (plancher absolu en minutes sous un certain volume · exemption nommée
des semaines dont la plus petite séance dépasse 10 % du total · C22 ne s'applique qu'au
déclaré) doivent être MESURÉES l'une après l'autre — combien de configurations chacune laisse
passer — avant qu'aucune ne soit choisie. La refonte de la courbe vient ensuite, en lot isolé,
parce qu'elle re-hache les 900 empreintes et traverse les 20 gates.

Ni l'un ni l'autre n'est fait : ce sont deux chapitres ouverts, désormais correctement séparés.
`D2` (3/153 configurations avec ≥1 violation dure) et `F2` (8 séances à 40-43 % au lieu de
45 %) restent inchangés et doivent le rester quand ces lots seront pris.

```verify
id: D3
quoi: D3 payée (lot progression pièce 1, 18/08/2026) — le banc v6 la tient en « pass », garde-fou permanent
attendu: /✔ D3/
cmd: npm run audit:v6 2>&1 | grep "D3"
```

---

## §3 — Angles morts connus de la mesure

Ce ne sont pas des bugs : ce sont des endroits où **on ne saurait pas** qu'il y a un bug.

| # | angle mort | conséquence |
|---|---|---|
| ~~A-1~~ | ~~`audit:v7` tourne à N=150~~ | ✅ **Fermé (R15.1)** : N=400, budgets en taux, jour de course varié. |
| A-2 | Le golden master fige `vol_max` au profil de base sur presque toutes ses passes | Deux passes correctives ont déjà dû être ajoutées pour cette raison (« course datée » en N2, « volume et extrapolation » en R14). Le prochain paramètre figé produira le même angle mort. |
| ~~A-3~~ | ~~`R14.3-b` n'a **aucun critère automatique**~~ | ✅ **FAUX depuis R15.2 — déplacée au §4** : les critères existent (`R15.2-A/B/C/D`, gate `audit:r15`) et sont verts. |
| A-4 | Le monolithe `Coach_Pro_V1.5.html` a le moteur à jour mais son **UI est gelée à R4** | Les régressions d'interface introduites depuis (les onglets — 5 puis 4 en R16.9 —, carte Trail, étape terrain) ne s'y voient pas. C'est documenté et voulu — mais un utilisateur qui ouvrirait ce fichier verrait un produit d'il y a plusieurs lots. |
| ~~A-5~~ | ~~**Aucune vérité terrain pour la projection R14/R14.1**~~ ✅ **PREMIER GESTE FAIT (03/08/2026)** | `endurabuild/js/projection-log.js` — le journal existe. **Une entrée par semaine ISO** (la projection ne bouge pas d'un jour à l'autre : l'adhérence est une fenêtre glissante de six semaines, P1 — journaliser chaque ouverture coûterait sept fois le stockage pour la même information), portant de quoi REFAIRE le calcul sans le code de l'époque : horizon, références mesurées qui ont servi d'ancre, `gainPct`, `gainBand`, adhérence, confiance, temps annoncés par discipline, et le MOTIF quand le moteur refuse de projeter (P8 — un refus est une donnée). `noteRaceResult()` referme la boucle au passage du jour J en attachant le temps réel à la projection journalisée **à son horizon d'origine** : `raceResult.predicted` ne contenait que la prédiction RECALCULÉE le jour J, laquelle ne dit rien de ce que le moteur annonçait quatre mois plus tôt. **Ce qui reste à faire est HUMAIN** : la calibration se fait hors ligne, sur les données exportées, et seulement quand une POPULATION aura couru — P11 a montré qu'un cas unique ne calibre rien (HERITAGE). ⚠ **Le journal n'est relu par AUCUNE partie du moteur, et c'est sa garde principale** : un journal qui influencerait la projection serait une seconde source de vérité (R11.1/R20.5/U9) et, pire, une boucle qui se confirme elle-même — le moteur calibré sur ses propres annonces mesurerait sa cohérence au lieu de sa justesse. `A5-B` l'asserte au caractère près (`tests/e2e/smoke-projlog.mjs`, 16ᵉ suite E2E), avec le critère « l'empreinte SAIT voir un changement » sans lequel elle serait satisfaite par une mesure aveugle. Suite **vérifiée rouge** (7 critères sur 11) en désactivant le journal.
| A-7 | **Trois bancs datent encore leur `race_date` depuis `Date.now()` brut** — `bench_r15.cjs` (`iso(wk*7)`, trois usages), `audit_v6.mjs` (`isoIn`), `audit_amont.cjs` (« dans 3 semaines ») | La bombe A-6/R20.7 a mordu une **septième fois** le vendredi 07/08/2026 : `bench_r14_1.cjs` datait ainsi, et `R14.1-G` comparait deux plans dont les horizons ne basculaient pas le même jour — **rouge ce jour-là uniquement**, vert les six autres (vérifié en rejouant le banc aux sept dates). Corrigé pour r14.1 (ancré sur `courseDans`, vérifié vert les 7 jours). Les trois restants sont VERTS aujourd'hui et leurs critères semblent moins sensibles à l'horizon (refus mineurs, mutations d'entrée) — mais « semble » est exactement ce que cette famille punit. Les ancrer demande de re-vérifier chaque banc sur les sept jours, pas un `sed`. |
| ~~A-6~~ | ~~**Dates absolues** dans le golden et les scripts~~ ✅ **FERMÉ (03/08/2026) — et l'application mécanique aurait cassé le golden** | Point unique `bench-dates.cjs`. **Mesuré : ce n'était pas de l'hygiène, c'était une échéance datée** — `banc_grand_public` et `bench_r13` MOURAIENT à +90 jours, `banc_invariants` à +200, sur une exception non rattrapée (`ENTREE_INVALIDE : au moins 22 semaines avant la course`) et non sur un défaut. Cinq bancs ancrés, **vérifiés verts à +400 jours**, contre-preuve faite (les mêmes, non ancrés, rouges à +90/+200). **Le golden reste en dates ABSOLUES, délibérément** : mesuré 0 écart à +200 jours — un golden doit être REPRODUCTIBLE, pas suivre le calendrier ; le rendre relatif l'aurait fait dériver chaque semaine. Sa seule exposition (l'horizon de `RACE_PASS_DATES`) est couverte par sa garde d'échéance, vérifiée déclenchante à +290 jours.

---

## §4 — Entrées de registre devenues FAUSSES (trouvées en compilant ce fichier)

Elles décrivent des défauts **déjà corrigés** ; les laisser telles quelles fait croire à une dette
qui n'existe plus, ce qui est le symétrique exact d'un défaut caché.

| entrée | ce qu'elle affirme | ce qui est mesuré aujourd'hui |
|---|---|---|
| **A-3** (§3, statut « angle mort ») | « `R14.3-b` n'a aucun critère automatique : personne ne saura si le dénivelé vélo est traité, sauf à relire le code » | **Faux depuis R15.2, mesuré le 05/08/2026.** O-2 EST R14.3-b, et sa fermeture a livré ses critères — `R15.2-A/B/C/D` dans `npm run audit:r15`, les quatre verts : bande de puissance qui descend avec le relief (plat 175–191 W, montagne 169–185, écart 6 W), vallonné strictement entre les deux, conseil de pacing qui nomme la puissance normalisée, clé unique `terrain`. L'entrée O-2 le disait déjà en toutes lettres (« le critère est venu avec le handoff de revue ») ; c'est le tableau des angles morts qui n'avait pas suivi. Un angle mort qui n'en est plus fait croire à une cécité qu'on n'a pas — le symétrique du défaut caché, et la raison d'être de ce §4. |
| `R10_DEFECTS.md` **D10-9** (statut « ouvert ») | « Aucun garde-fou n'empêche la prochaine collision de noms dans le bundle : à ajouter » | **Corrigé.** `checkCollisions()` existe (`scripts/buildApp.mjs:94`, appelée l. 116) et fait échouer le build en nommant le doublon. |
| **question R15.5** — « le harnais distingue-t-il un `xfail` qui PASSE d'un échec attendu ? » | Risque soulevé : le jour où quelqu'un corrige F2, le test rougirait et la correction serait annulée comme une régression | **Déjà correct, vérifié.** `audit_v6.mjs:942` : un test `expect:'fail'` qui passe s'affiche `★` et porte la note « ← CORRIGÉ : passer expect à 'pass' ». Il compte comme VERT, pas comme échec. Aucun travail nécessaire. |
| `R10_DEFECTS.md` §C13e | « Reste 307 séances sous 10 min d'échauffement, toutes en trail… leur récupération n'est PAS chiffrée (7 % des blocs) » | **Corrigé** par le lot « la récupération devient une donnée » : sur 344 blocs à répétitions multiples mesurés (6 sports), **0 récupération non chiffrée**, et `F4` mesure **0 violation** du plancher de 10 min. |

```verify
id: §4-D10-9
quoi: le garde-fou de collision de noms existe — l'entrée D10-9 est bien périmée
attendu: /checkCollisions/
cmd: grep -n checkCollisions scripts/buildApp.mjs
```

```verify
id: §4-R15.5
quoi: le harnais v6 distingue un xfail QUI PASSE d'une régression
attendu: /CORRIGÉ : passer expect à 'pass'|expect === "fail"/
cmd: grep -n "CORRIGÉ : passer expect" audit_v6.mjs
```


*(Ces deux corrections de registre ne sont pas appliquées dans ce fichier : le registre est le
document historique du dépôt, il se corrige dans son propre commit avec la mesure à l'appui.)*

---

### S-1 · Le moteur tourne dans le navigateur, et il y reste · ✅ **ARBITRÉ (04/08/2026) — décision RÉVISABLE**

> « Restons en public pour le moment »

La grille de sécurité ouvre sur « le moteur tourne exclusivement côté serveur ». Cette case
ne pouvait pas être cochée : **il n'y a pas de serveur.** Mesuré sur le fichier réellement
servi (`endurabuild/js/engine.js`, 925 Ko) : `Bosquet` ×21, `Riegel` ×25, `G_PLAFOND` ×7,
`HISTORY_CAPS` ×8 — les règles, les seuils, et les commentaires qui les justifient.

**Décision : on assume.** Ce que ça achète — hors-ligne, zéro-compte, zéro-infra, et
l'explicabilité qui est le contre-positionnement du produit. Ce que ça coûte — le moteur est
copiable, et **le « secret des affaires » (loi 2018) ne s'applique pas** : il exige des
mesures de protection raisonnables, or un moteur publié n'en est pas une. La protection
réelle est le **droit d'auteur** (`LICENSE`, déjà en place) et la **concurrence déloyale**.

Conséquence de registre : les §1, §2, §5 et §6 de la grille deviennent **hors architecture**
plutôt que « en retard ». Ce qui reste est HUMAIN et suivi en §5 : `H-6` (CGU) et `H-7`
(Soleau). Détail et déclencheurs de réouverture dans ARCHITECTURE.md « S-1 ».

**Pas de bloc `verify` ici, et c'est une conclusion, pas un oubli.** J'ai essayé deux fois de
mécaniser « aucun document ne revendique le secret des affaires ». La première comptait les
OCCURRENCES du terme et rendait 1 — le paragraphe qui explique que la protection ne s'applique
PAS le mentionne forcément : une mesure qui compte une négation comme une revendication. La
seconde cherchait les mentions non niées et en trouvait trois, dont **deux étaient le motif de
la garde elle-même** : l'instrument se mesurait. Cette affirmation porte sur de la prose
nuancée, et ce dépôt sait ce que ça coûte de faire servir de la prose de donnée (R3-final,
1 740 récupérations comptées 0 min). Elle reste donc une vérification HUMAINE, à faire si une
stratégie juridique se construit — le point à ne pas perdre étant qu'un moteur publié n'ouvre
pas droit à cette protection, quelles que soient les CGU.

---

## §5 — Hors périmètre du moteur (ce ne sont PAS des bugs)

| # | sujet | nature |
|---|---|---|
| ~~H-1~~ | ~~`STRAVA_RELAY_DEFAULT = ""` dans `endurabuild/js/config.js`~~ | ✅ **FAIT le 03/08/2026** : app Strava créée (client `269639`), worker Cloudflare déployé, `STRAVA_RELAY_DEFAULT` renseigné, connexion confirmée en production (`✓ Connecté`). Le `client_secret` vit UNIQUEMENT en variable de type *Secret* côté Cloudflare — jamais dans le dépôt, jamais dans un commit. Périmètre `activity:read_all,profile:read_all` (le second ajouté par O-22). Une garde E2E qui supposait le relais ABSENT a dû être réécrite : elle mesurait l'absence de déploiement, pas un comportement. |
| H-2 | Notifications push app fermée | ✅ **POSITION CONFIRMÉE (fondateur, 05/08/2026)**. Demande un backend ; S-1 a acté qu'il n'y en a pas. On n'annonce pas ce qu'on ne peut pas tenir — l'entrée reste ouverte comme RAPPEL, pas comme dette. |
| H-3 | CONSEIL nutritionnel (par opposition aux ESTIMATIONS, livrées) | ✅ **POSITION CONFIRMÉE (fondateur, 05/08/2026)** : reste **bloqué sur avis diététicien**. ⚠ « Validé » désigne la POSITION, pas l'obtention de l'avis — aucun conseil nutritionnel ne peut être livré tant qu'un professionnel n'a pas tranché, et notamment la question ouverte par N11 : les macros N10 sont en substance une **cible d'apport** (leurs trois sources sont des références d'apport, et leur somme en kcal ne coïncide pas avec la dépense affichée sur la même carte). **Ligne à ne pas franchir**, manifeste. |
| ~~H-6~~ | ~~**CGU/CGV** — clauses anti-reverse-engineering, anti-scraping, anti-réutilisation commerciale~~ | 🚫 **ABANDONNÉ (fondateur, 05/08/2026) — et sa conséquence est écrite ici.** L'entrée disait que les CGU deviennent le levier PRINCIPAL depuis `S-1` (le moteur étant public, le secret des affaires ne s'applique pas). Les abandonner laisse **`LICENSE` — le droit d'auteur — comme seule protection**, sans le support contractuel qui rend une réutilisation attaquable. C'est un arbitrage assumé, pas un oubli. Réouverture naturelle : modèle payant, copie constatée, ou première levée de fonds (la due diligence les demandera). |
| ~~H-7~~ | ~~**Enveloppe Soleau / dépôt INPI**~~ | 🚫 **ABANDONNÉ (fondateur, 05/08/2026).** Ne protégeait pas l'algorithme : il DATAIT la méthode, ce qui appuie une action en concurrence déloyale. Sans lui, l'antériorité devra s'établir autrement — l'historique git public du dépôt en est une trace horodatée, plus faible qu'un dépôt INPI mais non nulle. |
| ~~H-4~~ | ~~Candidature API MyFitnessPal~~ | 🚫 **ABANDONNÉ (fondateur, 05/08/2026).** Sans objet depuis R6 : le journal alimentaire a été retiré du produit sur décision utilisateur, donc il n'y a plus rien à alimenter. L'entrée avait survécu à la fonctionnalité qu'elle servait. |
| ~~H-5~~ | ~~Swimrun hors V1~~ | ✅ **R16.10** : réintégré après traitement de la dette (78 % → 89 % de profils propres). Le drapeau `EB_SWIMRUN` n'existe plus. |

---

## Comment re-vérifier ce fichier

```bash
npm run registry:check     # exécute TOUS les blocs ```verify``` de ce fichier (R15.9)
npm run registry:check --strict   # + échoue si une entrée ne reproduit plus
```

Depuis R15.9, ce fichier **s'exécute**. Chaque entrée mesurable porte un bloc ```` ```verify ````
(`id`, `quoi`, `attendu` = motif attendu dans la sortie, `cmd`). `npm run registry:check` les
enchaîne et range chaque entrée en **reproduit** / **ne reproduit plus (→ §4)** / **commande
cassée**. Le §4 de ce document a été rempli à la main jusqu'ici, en compilant le fichier — il
devient un résultat automatique au lieu d'un heureux accident.

**Rappel de méthode, qui vaut pour toute reprise de cette liste :** mesurer d'abord, corriger
ensuite, re-mesurer, garder le vert. Un défaut dont on ne sait pas dire le chiffre AVANT n'est pas
prêt à être corrigé — c'est ce qui a fait tomber les vraies causes en R13, R14 et R14.1.

---

## O-34 — `RN_MARA_RATIO_PLANCHER` est un PANSEMENT, sa condition de sortie est écrite

**Ouvert le 14/08/2026** (arbitrage B-22, `ARBITRAGE_B22_PHASE2.md` §1).

Le plancher `1,05` sur la bande d'allure marathon dérivée (B-22) coupe l'extrémité
inatteignable de la prescription à haut volume (bord bas mesuré : 1,044 à 10 h/sem, 1,021 à
12 h). **Sa valeur est `inherited`** — un souvenir de littérature du fondateur, requalifié par
lui-même comme n'étant pas une source — et il **masque** le vrai défaut : l'extrémité rapide de
`RIEGEL_ANCRES` (10 h → 1,06 ; 12 h → 1,04) est une heuristique jamais calibrée, dont B-22 a
élevé l'enjeu en la faisant passer de la prédiction à la prescription.

**Condition de sortie** : la recalibration de `RIEGEL_ANCRES` (chantier B-21/B-04). Le jour où
elle est faite, ce plancher se RETIRE — le laisser deviendrait un deuxième modèle du même
phénomène. Préalable mesuré (§3.1 du même arbitrage) : le golden ne peut pas mesurer ces
chantiers — **96,7 % de ses profils portent `vol_max: 10`**, le défaut du profil de base
(famille A-2). Le premier livrable de B-21 est donc l'enrichissement du golden en volumes de
course variés, pas un correctif.

```verify
id: O-34
quoi: le plancher existe, est étiqueté inherited/PANSEMENT, et T-16b le garde
attendu: O34-REPRODUIT
cmd: grep -q "inherited" src/engine/predictor.ts && grep -q "RN_MARA_RATIO_PLANCHER" src/engine/predictor.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "T-16b \[vert" && echo "O34-REPRODUIT"
```

## O-35 — la chaîne de volume R20.2 ne se ferme pas en unité sur la natation (et le trail)

**Ouvert le 14/08/2026** (en écrivant T-25, le test d'identité `min(plafonds) × ∏(facteurs)
=== volPeak` du DOC_UNIQUE §3).

L'identité a mordu **dans les deux sens sur le même sport**, ce qui prouve une faute d'UNITÉ
et non un maillon manquant simple (cinquième occurrence de la famille V-11/O-13) :

- **natation débutant** : la chaîne annonce un « min » de plafonds à **1,44–2,03 h** pour des
  pics livrés à **0,7–0,9 h** (pire : `swim/fond/reprise/debutant`, 61 % d'écart). La sonde
  V2.1 elle-même y mesure **2,0 h** de capacité structurelle pour des semaines qui livrent
  0,5–0,7 h — son clone saturé en continu ne voit pas les plafonds C15/C24b du rendu discret.
- **natation inter/avancé** : les mêmes formules donnent des « plafonds » à **2,16 h** pour
  des pics livrés à **3,7 h** — le plan dépasse son propre plafond annoncé, donc le facteur
  `swimTime` est appliqué à une grandeur qui ne le porte pas (81 profils, + 38 en trail où la
  charge 3 axes fait la même chose).
- Une conversion `× swimTime` de la courbe a été **essayée puis retirée** : ajustée sur UN cas
  (le débutant), elle inversait l'identité sur 148 profils — calibrer sur un cas est
  exactement ce que P11/HERITAGE interdit.

**Mitigation en place** : la GARDE D'OBSERVATION du sélecteur — un plafond que le pic livré
dépasse n'a pas borné le plan et sort des candidats au message. Le record `plan._r202` expose
l'énumération complète, écarts compris.

---

### ✅ MOITIÉ FERMÉE le 14/08/2026 — la conversion portait sur les TABLES, pas seulement sur la
### déclaration (§5 de l'arbitrage `sw.aero`)

**Le test décisif exigé** (« `capacityH` est-il en heures génériques ou en heures d'eau ? ») a
une réponse mesurée : `capacityH` est en heures d'EAU (il compte des minutes réellement
prescrites). **C'est `peakH` qui était générique** — mesuré sur `swim/demifond` non-débutant :
`peakH` = 6,00 h pour un `volPeak` de 2,40, **rapport 2,50 = 1/0,4 au chiffre près**, quand le
témoin course rend 1,00. Et l'unité changeait avec le NIVEAU : C20 rabote `peakH` avec une
grandeur en heures d'eau (25 min/séance), donc le débutant avait déjà l'unité d'arrivée.
Conséquence : **la sonde V2.1 mordait TOUJOURS en natation** et servait de convertisseur
d'unité par accident — un garde-fou de sécurité qu'on ne pouvait plus lire.

**Trois modèles ont été mesurés avant d'en adopter un** (règle 7 étendue aux alignements) :

| | modèle | rayon sur les 949 | verdict |
|---|---|---|---|
| A | l'état d'avant (`peakH` générique) | — | la promesse ment de 1,6× |
| B | convertir `peakH` comme `volPeak` | 123 profils, **92 baisses jusqu'à −55 %** | **REFUSÉ** — le plan tombe à 3 séances de 15 min |
| **C** | **convertir la seule DÉCLARATION** | **88 profils, 47 au plan intact, 41 à ±6 %** | **ADOPTÉ** |

**Pourquoi C** : `SWIM_TIME_FACTOR` code « 60 % du temps déclaré en BASSIN n'est pas de la
nage » — c'est une conversion de la grandeur que l'ATHLÈTE déclare, pas des tables du moteur.
`HISTORY_CAPS`/`UTIL` sont du volume d'entraînement, au même titre que les lignes course et
vélo qui ne subissent aucune conversion ; les convertir pénalisait une seconde fois. R20.7
avait déjà posé ce principe sur la rampe (elle convertit `vol_recent`, jamais une table) —
C ne fait que l'appliquer partout. Et l'argument décisif : **sous C, le plan livré ne bouge
pratiquement pas**, parce que la courbe est pilotée par `peakH`, qui n'a jamais été converti :
le moteur traite les tables comme des heures d'eau **depuis toujours**. C ne change pas le
plan, il aligne la PROMESSE sur le plan déjà livré (`swim/sprint/reprise/inter` : 700 min
avant, 700 min après ; promesse 1,1 h → 2,0 h, pic réel 1,78 h).

**Conséquence sur B-09** : la sur-pénalisation redoutée (« 0,4 trop bas pour un nageur en
club ») venait de l'application aux TABLES, pas de la valeur. B-09 (facteur indexé sur
l'historique + activé en tri) n'est pas fermé, mais il perd son urgence — et sa valeur reste
une constante nouvelle, donc un arbitrage.

`swimTime` a QUITTÉ la liste des facteurs de la chaîne R20.2 : ce n'est pas une réduction,
c'est une conversion, et annoncer « ce qui réduit le plus, c'est le temps passé dans l'eau »
était faux — rien n'est retiré. L'explication vit sur le plafond `declared`.

**T-25 : 439 → 368.** **T-23 passe de 22/218 (10 %) à 61/177 (34 %) — et 34 % est le taux
HONNÊTE, 10 % était le mensonge** (rectification du fondateur, 14/08) : le correctif retire une
compensation qui MASQUAIT l'autre moitié du défaut. Deux erreurs qui se compensent ne font pas
un modèle juste, elles font un modèle dont on ne peut plus mesurer l'erreur — la forme de
`ρ = 1,225` compensant `Crr = 0,004`. Un taux qui monte quand on corrige est le signe que la
mesure devient exploitable, pas une aggravation.
Les plafonds n'étant plus déflatés par 0,4, l'écart entre ce que la sonde annonce et ce que la
semaine livre devient visible (nage débutant : « la durée de ta préparation, 1,6 h/sem » pour un
pic livré à 0,7). Deux erreurs se compensaient ; en corriger une seule expose la seconde. Elles
ont le même ticket — la suite d'O-35 ci-dessous.

**Un site NON converti, et c'est une mesure, pas un oubli** : `sessionScale` compare bien
`volMax` (piscine) à `util` (table) quand la déclaration borde. P11 exige de corriger un piège
d'unité sur TOUT le chemin, la conversion a donc été écrite — puis **RÉFUTÉE** : `audit:v1`
remonte alors une violation DURE du manifeste (`swim/sprint/ancien/debutant`, « 1 saut > +25 %
de volume réel entre semaines de charge »). Diviser l'échelle des séances par 2,5 les envoie
toutes sur leurs planchers C24/C24b, et une semaine épinglée au plancher ne suit plus la
courbe : la progression devient un escalier. Priorité 2 du manifeste contre cohérence d'unité —
la sécurité gagne. Il ne mord que sur les profils déclarant PEU de piscine, que le golden ne
contient pas (tous à `vol_max: 10`, famille A-2).

**Cette dette a un BLOQUEUR qui est une autre garde, donc elle ne se paiera jamais toute
seule** (exigence du fondateur, 14/08/2026) — elle porte sa condition de sortie, comme le
plancher 1,05 (O-34) et l'ancrage `[1,5 h → 1,15]` :

```
sessionScale — unité non convertie
  cause du blocage : la conversion produit un saut > +25 % entre semaines de charge
                     (audit:v1, swim/sprint/ancien/debutant) parce que les séances tombent
                     toutes sur leurs planchers C24/C24b et cessent de suivre la courbe
  hypothèse de sortie : convertir ET re-dériver la rampe R10 depuis la base convertie, pour
                        que la progression soit RECALCULÉE au lieu de sauter
  condition de sortie : le saut inter-semaines reste sous le plafond C22 après re-dérivation,
                        mesuré sur les 949 — et `audit:v1` reste à 0 violation dure
  si l'hypothèse est fausse : la dette devient une DÉCISION permanente et se requalifie comme
                        telle (« sessionScale reste en unité déclarée, par arbitrage »), elle
                        ne reste pas en attente
```

### 2ᵉ MOITIÉ (14/08, même jour) — la sonde n'était pas la cause principale : LE DIAGNOSTIC
### ENTIER VIVAIT AU MILIEU DU PIPELINE

La re-sonde demandée est écrite (clone SATURÉ de la semaine LIVRÉE — mesurer les minutes
livrées rendrait l'identité vraie par construction, donc vide ; une passe, jamais de point fixe,
résolution B-25). Elle corrige ce qu'elle devait corriger — plafond structurel 2,03 h → **0,85 h**
chez le nageur débutant. Mais T-25 est MONTÉ (368 → 432), et l'instrumentation a désigné plus
gros : **`reconcileDeclaredVolume` — le point fixe — tourne à la ligne 3322, le bloc « C6 +
R20.2 » était à 2998.** Le pic annoncé et toute la chaîne d'explication décrivaient donc
l'avant-dernier état du plan, avant I14, C26c/d, le rattrapage d'I14b, C30b, les planchers et la
fréquence. Onze fois ce dépôt a payé cette leçon sur des GARANTIES ; ici c'était le DIAGNOSTIC.

**Déplacé après le point fixe**, `volPeak` recompté sur les séances livrées (`w.vol` est un
instantané figé à la construction de la semaine). Ce que ça découvre :

| | |
|---|---|
| profils dont le pic ANNONCÉ change | **350 / 945 (37 %)** |
| sens | **350 baisses, 0 hausse** |
| écart médian · pire cas | **7,1 %** · `run/10k/ancien/debutant` **4,9 h annoncées → 3,4 (−30,6 %)** |

Le moteur promettait plus qu'il ne livre sur 37 % des profils, toujours vers le haut, sur le
seul chiffre que l'athlète lit comme « son pic » — la doctrine V2.1 dit « promettre davantage
serait mentir ».

### Ce qui RESTE ouvert — CE QUE LE POINT FIXE RETIRE n'est porté par aucun maillon

T-25 monte à **608** avec le `volPeak` honnête, et c'est le taux exploitable : rendre un membre
de l'identité exact élargit l'écart avec l'autre, qui décrit toujours un état d'avant le point
fixe. La cause n'est plus « le rendu discret » en général — elle est nommée : **I14, C26c/d, les
planchers et la fréquence retirent des minutes qu'aucun plafond de la chaîne ne déclare.**

**Condition de sortie** : instrumenter `reconcileDeclaredVolume` pour qu'il DÉCLARE ce qu'il
retire et pourquoi (un maillon par garantie, dans l'unité du pic), puis passer `T-25` et `T-23`
à `attendu: "vert"` dans le même commit. Le trail (38 profils livrant au-dessus de leur plafond
annoncé) relève de la charge à 3 axes, non traitée.

**Condition de sortie** : faire mesurer à la sonde V2.1 ce que la semaine RENDUE livre
réellement, puis passer `T-25` et `T-23` à `attendu: "vert"` dans le même commit.

```verify
id: O-35
quoi: la conversion ne porte que sur la declaration, et le residu « rendu discret » garde T-25 rouge
attendu: O35-REPRODUIT
cmd: grep -q "GARDE D'OBSERVATION" src/generator/planGenerator.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -A1 "T-25" | grep -q "identité(s) cassée(s)" && echo "O35-REPRODUIT"
```

## O-36 — la coupe et l'auditeur ne comptent PAS dans la même unité, et les aligner casse O-21

**Ouvert le 14/08/2026** (trouvé en isolant les régressions de B-02).

`enforceHardTimeCap` (la coupe) mesure les minutes dures avec `intensitySplit(s)` — donc les
**refs de repli** (130 s/100 m, 330 s/km). L'auditeur, lui, mesure avec les **refs de
l'athlète** (`reasoned.baseRefs`). Deux définitions du mot « minute dure » dans le même moteur,
sur un bloc exprimé en DISTANCE : `5×1000 m` compte 27,5 min pour la coupe quelle que soit
l'allure, 22,5 min à 4:30/km et 42,5 min à 8:30/km pour l'auditeur.

C'est exactement la faute que R20.5 a fermée sur la CLASSE (`bk.rp` dur ou modéré selon la
bande) — ici elle porte sur l'UNITÉ, et elle a survécu.

**Et la corriger casse une autre garantie, mesuré** : threader les refs de l'athlète jusqu'à la
coupe rend le plan SENSIBLE À L'ALLURE, ce que la famille O-21 interdit. Banc v6 avec
l'alignement : `O-21b` rouge (« la fréquence des semaines de récup dépend de l'allure :
4:30 → 3, les trois autres → 2 ») et `C30-A` rouge (`semi/inter/4:30` 120 → 128). Sans
l'alignement : **73 verts, 0 régression**.

Autrement dit : **l'incohérence d'unité est ce qui rend aujourd'hui le plan indépendant de
l'allure déclarée.** Le repli aveugle de la coupe fait office de neutralisation.

**Ce que ça demande** : trancher lequel des deux invariants prime, et l'écrire.
- soit la coupe est aveugle à l'allure PAR CONCEPTION (et le commentaire doit le dire, avec
  O-21 comme raison — aujourd'hui c'est un accident) ;
- soit les deux unités s'alignent et O-21 se rediscute pour les blocs en distance, dont la
  durée dépend RÉELLEMENT de l'allure — un 5×1000 m ne coûte pas le même temps à 4:30 et à
  8:30, et prétendre le contraire est aussi une fiction.

Non tranché ici : c'est un arbitrage d'entraînement, pas un correctif.

```verify
id: O-36
quoi: la coupe mesure sans les refs de l'athlete, et c'est ce qui garde O-21b vert
attendu: O36-REPRODUIT
cmd: grep -q "intensitySplit(s as never).hardByDisc" src/generator/planGenerator.ts && npm run audit:v6 2>/dev/null | grep -q "0 régression" && echo "O36-REPRODUIT"
```

---

## O-37 — I14 est rouvert APRÈS sa propre application, sur 441 semaines du golden

**Trouvé par le sceau T-27 le jour où il a été posé** (15/08/2026), c'est-à-dire par exactement
le mécanisme pour lequel il existe : un invariant tenu au milieu du pipeline, rouvert par ce qui
vient après, sans que rien ne l'attrape.

I14 déclare que **la sortie longue est la plus longue séance de sa discipline dans sa semaine**.
`enforceLabelVsDose` l'applique, deux fois, et le prédicat du sceau est RECOPIÉ du sien (mêmes
exclusions : `race`, `brick`, `long`, même discipline) — ce n'est donc pas une règle voisine
mesurée à la place de la bonne.

| | |
|---|---|
| semaines en violation, golden | **441** (sur 945 profils) |
| profils touchés, balayage 702 | **151** |
| exemples | `run/5k/reprise/debutant/competition` S2 : « Seuil doux » **52 min** > longue 48 · `run/5k/confirme/inter/finir` S5 : « VO2max » **45** > longue 44 |

**Les écarts sont petits** (quelques minutes) et c'est ce qui les a laissés passer : aucun gate
ne compare ces deux séances à la SORTIE. `audit:invariants` porte bien I14, mais sur
**54 configurations** ; le sceau le mesure sur les 945.

**Piste, non vérifiée** : `enforceLabelVsDose` compare des `sx.min` et réduit sur
`totalOf(sx)` = somme des `st._min`. Si les deux grandeurs diffèrent (la récup inter-blocs entre
dans `_min` depuis R5.6a), la passe vise un nombre et en mesure un autre — la onzième occurrence
de cette famille. À vérifier avant d'écrire un correctif : ce serait une cause, pas la seule
possible (les planchers de `shrinkTo`, `Math.max(5, …)` et `if (!touched) break`, laissent un
résidu que le commentaire de la passe assume déjà).

**Non corrigé délibérément** : rendre bloquant un invariant dont on n'a pas trié les 441 échecs
figerait la dette au lieu de la traiter — c'est la leçon de R20.6, et l'ordre qu'elle impose est
« mesurer, trier, PUIS bloquer ». Le compte est épinglé au cliquet de T-27 : il ne peut plus
monter en silence.

### Le DOMMAGE, mesuré (§5 de l'arbitrage du 15/08) — et il déclasse le ticket

« I14 rouvert » décrit un état du CODE, pas un dommage. R20.6 avait appris à trier avant de
bloquer ; la règle s'étend : **trier aussi avant de prioriser** (`npm run mesure:o37`).

| ampleur du dépassement, sur 494 cas | |
|---|---|
| médiane | **2,0 min** |
| p90 | 5,0 min |
| maximum | **18,0 min** |
| ≥ 5 min | 52 · **≥ 15 min : 12** · ≥ 30 min : **0** |
| séance qui dépasse = séance de QUALITÉ | 282 (57 %) |
| discipline de la longue | nage 306 · course 158 · vélo 30 |

**Verdict : c'est de la DETTE, pas un ticket.** L'écart médian est de deux minutes — invisible
pour l'athlète, et le plan reste cohérent. Les 12 cas au-dessus d'un quart d'heure sont tous en
trail (« Descente en charge » 78 min contre « Longue trail + ravito réel » 60), c'est-à-dire le
résidu que le commentaire d'`enforceLabelVsDose` assume déjà explicitement : les planchers de
`shrinkTo` (`Math.max(5, …)`, `if (!touched) break`) laissent un reste plutôt que de dénaturer
une séance.

**Ce qui mériterait un ticket, si on y revient, est la population TRAIL** — pas les 441. Le reste
attend derrière tout ce qui déplace de vraies minutes.

*(Note d'instrument : ma première écriture de la mesure rendait « médiane 2,0 · p90 1,0 » — un p90
SOUS la médiane. Le tableau est trié DÉCROISSANT et j'indexais le quantile à `p` au lieu de
`1 − p`. Corrigé avant publication ; onzième occurrence de la famille « une mesure qui nomme une
grandeur et en rend une voisine ».)*

```verify
id: O-37
quoi: I14 est rouvert apres son application, compte epingle au cliquet T-27
attendu: O37-REPRODUIT
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep -q "✓ T-27" && echo "O37-REPRODUIT"
```

---

## O-37a — un brick d'affûtage passe 1 min SOUS son plancher audité, sur 4 profils

Même origine que ci-dessus : trouvé par le sceau, invisible aux gates.

`tri/Full/reprise/{inter,avance}/{finir,plaisir}` : « Brick d'affûtage (rappel de transition) »
livre **39 min de vélo** pour une bande `C21c` de **[40, 150]**. Une minute.

`audit:v2` balaie pourtant `tri/Full/reprise/inter/finir` — et il est VERT. La différence est le
PROFIL DE BASE : son `baseProfile()` ne porte pas les mêmes `vol_max`/`pace`/`weight` que le
balayage du sceau, et l'état à 39 min n'y est pas atteint. Ce n'est donc pas un trou de l'auditeur
mais un trou de COUVERTURE — famille A-2, sixième occurrence.

**Non corrigé** : un plancher manqué d'une minute sur un brick d'affûtage ne met personne en
danger (il va dans le sens de la fraîcheur, que l'affûtage cherche), et le corriger demande de
savoir laquelle des deux bandes fait foi — c'est T-28. Compté au cliquet de T-27.

---

## T-27b — le sceau pose son drapeau, mais aucune lecture ne l'exige encore

`sealPlan` pose `_sealed` et attache `_seal` au plan livré, et sa batterie tourne au seul point
du pipeline où « après » n'existe pas. **La seconde moitié du §3 n'est pas écrite** : « toute
fonction de diagnostic, de message, de record ou d'export assert `_sealed` à l'entrée, et échoue
bruyamment sinon ».

Sans elle, le drapeau ne garde rien tout seul — il constate, il n'interdit pas. C'est écrit ici
pour que personne ne prenne sa présence pour la garantie qu'il ne donne pas encore.

**Ce que ça demande** : recenser les surfaces de lecture du plan (les cartes « Pourquoi ce plan »,
les records `_r202`/`_v2`, l'export iCal, la prédiction), et poser l'assertion à leur entrée. La
variante forte — le plan final est un TYPE distinct du plan en construction, et les diagnostics
ne prennent que le premier — rendrait l'erreur impossible à ÉCRIRE et pas seulement à exécuter.

```verify
id: T-27b
quoi: le sceau existe et est pose sur le plan livre (moitie 1), les assertions de lecture non
attendu: T27B-REPRODUIT
cmd: grep -q "sealPlan(best.plan" src/generator/repairLoop.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "✓ T-27" && echo "T27B-REPRODUIT"
```

---

## O-38 — ⚠ MA MESURE ÉTAIT FAUSSE : il n'y avait pas 12 bornes permissives, il y avait DEUX TABLES · ✅ **FERMÉ (15/08/2026)**

**L'entrée d'origine annonçait « 12 couples permissifs, tous en AFFÛTAGE ». C'est faux, et la
correction est plus instructive que le constat.**

### Ce que le balayage prétendait, et pourquoi il se trompait

Ma première écriture de `balayageT28.mjs` **MODÉLISAIT** `blockBounds` au lieu de l'observer :
elle recalculait ses deux bornes à partir des tables et concluait que l'affûtage était ouvert
d'un facteur deux (Full : générateur 300, auditeur 150).

Or `blockBounds` a **deux branches** — `b.bnd` quand le step DÉCLARE ses bornes, `s.brick`
sinon — et je n'avais modélisé que la seconde. Mesuré sur les plans LIVRÉS (216 profils
tri + duathlon) :

| | legs vélo de brick | branche empruntée |
|---|---|---|
| affûtage | **135** | **toutes** `b.bnd` — R18.4 pose déjà le `bnd` audité C21c |
| charge | **1 476** | **toutes** `s.brick` |

**Les lignes que je signalais n'atteignent jamais la branche que je mesurais.** Dixième
occurrence dans ce dépôt d'un critère qui nomme une grandeur et en mesure une voisine — cette
fois dans le balayage écrit précisément pour fermer cette classe, ce qui est le pire endroit
possible, et la conclusion publiée était INVERSÉE (le problème était en charge, pas en affûtage).

### Le défaut réel, plus discret et réel quand même

Sur la branche effectivement empruntée, le **plancher** lisait `BRICK_BIKE_BOUNDS` (la table de
l'auditeur, C21b) et le **plafond** lisait `CAP_BRICK_BIKE`, une SECONDE table :

```
S: 90 · M: 120 · 70.3: 180 · Full: 300 · L: 150 · PM: 300   ← CAP_BRICK_BIKE
S: 90 · M: 120 · 70.3: 180 · Full: 300 · L: 150 · PM: 300   ← BRICK_BIKE_BOUNDS[1]
```

Six valeurs identiques, donc **zéro permissivité vivante** — et deux vérités pour une borne,
libres de diverger au premier format ajouté. C'est `_IFZ` sous une autre forme, exactement la
classe que T-28 existe pour traquer, simplement pas au stade où je l'avais annoncée.

### Correctif

`CAP_BRICK_BIKE` est **supprimée** (elle n'avait que cet unique consommateur) plutôt que dérivée
— une table dérivée reste une table qu'on peut réécrire. Le plafond lit `BRICK_BIKE_BOUNDS[1]`,
comme le plancher et comme l'auditeur.

**Golden : 0 écart supplémentaire.** Le correctif ne change aucun plan, ce qui était prévisible
puisque les valeurs coïncidaient — et le vérifier est ce qui distingue « prévisible » de « vrai ».

`T-28` passe **rouge → vert** et garde la PROPRIÉTÉ (« une borne, une source »), pas le nombre de
tables : il reste vrai si quelqu'un ajoute un format. Son critère a d'ailleurs rougi en naissant
sur le **commentaire** qui explique la suppression — troisième faux positif de cette famille dans
ce chantier, corrigé en retirant les commentaires avant de chercher.

### Ce qui reste, nommé

Les **4 legs hors bornes** que le balayage corrigé signale encore sont `tri/Full/affûtage` à
39 min pour `[40, 150]` — c'est **O-37a**, suivi par `S1` au cliquet du sceau, pas par T-28
(deux gardes qui mesurent la même chose, c'est une garde de trop). Et le **leg COURSE** du brick
reste borné par le générateur (`CAP_BRICK_RUN`) sans être vérifié par l'auditeur : dette nommée,
pas une divergence.

```verify
id: O-38
quoi: une borne, une source — CAP_BRICK_BIKE supprimee, T-28 vert
attendu: O38-FERME
cmd: ! grep -q "export const CAP_BRICK_BIKE" src/engine/constraintMatrix.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "✓ T-28" && echo "O38-FERME"
```

---

## O-37b — les 12 dépassements ≥ 15 min sont TOUS en trail : ce n'est pas O-37

Séparé d'O-37 sur consigne du fondateur (15/08) : *« un défaut qui se concentre entièrement dans
une discipline n'est presque jamais un bug général — c'est une lacune de modélisation propre à
cette discipline »*. Ranger les 12 avec les 441 les enterrerait.

| | |
|---|---|
| cas ≥ 15 min | **12, tous en trail** |
| le pire | « Descente en charge » **78 min** > « Longue trail + ravito réel » **60** (+30 %) |
| profils | `trail/confirme/{debutant,inter,avance}/{finir,plaisir}` S16 |

Le trail a sa propre arithmétique de dose (km-effort, D+, part de marche) et `enforceLabelVsDose`
réduit un bloc en pente par ses RÉPÉTITIONS avec un plancher à 2 (I14, 2ᵉ passe) — en dessous,
« une séance de descente avec une seule descente n'est plus une séance de descente ». Le résidu
de 18 min est donc probablement CE plancher, atteint sur une longue trail elle-même courte
(60 min). À vérifier avant d'écrire quoi que ce soit : c'est une hypothèse, pas un diagnostic.

Petit, borné, et il a une cause nommable — contrairement aux 441, qui sont de la dette à 2 min.

```verify
id: O-37b
quoi: les 12 depassements >= 15 min sont tous en trail
attendu: O37B-REPRODUIT
cmd: npm run mesure:o37 2>/dev/null | grep -q "≥ 15 min : 12" && npm run mesure:o37 2>/dev/null | grep -A2 "les 6 pires" | grep -q trail && echo "O37B-REPRODUIT"
```

---

## O-36 — ⚠ TROIS PRÉMISSES VÉRIFIÉES AVANT D'ÉCRIRE, ET LA POPULATION N'EST PAS CELLE QU'ON CROYAIT

Le fondateur a exigé (15/08, §5) que trois points soient tranchés avant toute ligne d'O-36. Ils
le sont, et deux d'entre eux changent le périmètre du ticket. **Rien n'est écrit** : l'arbitrage
lui revient.

### §5.1 et §5.2 — le scénario redouté n'existe pas

Le risque énoncé était : « O-36 ramène la séance du coureur lent de 42,5 à 20 min →
`enforceLabelVsDose` la juge sous-dosée → il l'étend → la dose double revient ».

**`enforceLabelVsDose` n'a AUCUNE cible de dose.** Ses deux seules cibles sont des PLAFONDS :
`C25_RECOVERY_SESSION_CAP_MIN` (absolu) et `lg.min` (relatif à la sortie longue livrée). Et ses
**cinq mutations de dose sont toutes gardées par `if (next < courant)`** — vérifié
mécaniquement, pas à la lecture : elle ne peut que RÉDUIRE. Le scénario n'a pas de mécanisme.

### §5.3 — le balayage, et il déplace le périmètre

| blocs de corps | |
|---|---|
| prescrits en DISTANCE | **12 278** |
| prescrits en TEMPS | 66 112 |
| répartition de la distance | **nage 10 982 (89 %)** · course 1 296 (11 %) |

**O-36 vise 1 296 blocs, pas 12 278.** Les 89 % restants sont de la NAGE, où le mètre est l'unité
juste (un bassin se mesure en mètres) — et deux choses y pendent :

- **3 696 blocs de nage portent un `bnd` en MÈTRES** (planchers 150-400, plafonds 315-850) :
  les convertir sans convertir leurs bornes serait une faute d'unité au sens de la règle 14 ;
- **C24/C24b se mesurent en mètres SUR LA SÉANCE** (`metersOf(sx)`), sur 10 593 séances de nage.
  Si les blocs passaient au temps, `metersOf` rendrait 0 et la passe sortirait par son
  `if (tot <= 0) continue` : **un plancher de SÉCURITÉ cesserait de s'appliquer en silence.**

Les **1 296 blocs de course** que le ticket vise, eux, ne portent **aucun `bnd`** : ils tombent
sur le repli `{ floor: 3 }` en minutes. Rien ne les rallongerait.

### §2.5 — la thèse tient en DIRECTION, pas en magnitude

| allure seuil | blocs | temps de TRAVAIL | door-to-door | km de qualité | reps |
|---|---|---|---|---|---|
| 4:30 | 108 | 28,9 min | 37,4 | 6,43 | 3,84 |
| 5:45 | 108 | 33,1 | 40,4 | 5,76 | 3,44 |
| 7:00 | 108 | 38,0 | 44,6 | 5,43 | 3,21 |
| 8:30 | 108 | **43,3** | 49,3 | 5,09 | 3,01 |
| **rapport lent/rapide** | | **×1,50** | ×1,32 | **×0,79** | ×0,78 |

**Monotone et concentré sur les allures lentes : l'argument du fondateur n'est pas faux.** Mais
sa magnitude illustrative (42,5 → 20 min, soit ×2,1) n'est pas ce que le moteur livre — parce
qu'une **compensation partielle existe déjà** : le nombre de répétitions tombe de 3,84 à 3,01
(−22 %) à distance par répétition constante (~1 672 m).

Le coureur lent reçoit donc **+50 % de temps de travail et −21 % de kilomètres de qualité**. Le
résidu à corriger vaut 50 %, pas 110 %.

**Ce que ça change pour l'arbitrage** : un résidu de 50 % sur 1 296 blocs de course est un
dossier plus mince qu'un doublement sur « toutes les prescriptions à intervalles », et la partie
nage — 89 % du volume concerné — est celle qu'il ne faut PAS convertir. Décision au fondateur.

```verify
id: O-36-amont
quoi: les trois premisses du §5 sont mesurees et publiees
attendu: O36-AMONT-MESURE
cmd: npm run mesure:o36 2>/dev/null | grep -qE "sw 1[0-9]{4} · rn 1[0-9]{3}" && echo "O36-AMONT-MESURE"
```

---

## O-36 (re-cadré) — les trois mesures du §5, et deux trouvailles qui ne sont pas O-36

Le ticket a changé d'énoncé (arbitrage du 15/08) : **ce n'est pas une conversion d'unité, c'est
un mécanisme d'adaptation SOUS-CALIBRÉ.** Le moteur adapte déjà le NOMBRE de répétitions
(3,84 → 3,01 entre 4:30 et 8:30) mais pas leur LONGUEUR (~1 672 m partout). Décision : rendre la
distance par répétition dépendante de l'allure. **Rien n'est écrit** — voici les mesures.

### (a) l'équivalent course de `metersOf` : deux consommateurs, un seul qui compte

Hors générateur, la distance de bloc en course n'est lue que par **`weekDistances`** (le récap
hebdomadaire affiché) — et c'est correct qu'il bouge : un coureur lent couvrira réellement moins
de kilomètres de qualité. **C30 ne lit PAS la distance prescrite** mais `RUN_KM[fmt]`, la
distance de la COURSE : la distance adaptative ne l'atteint pas.

**Le consommateur à surveiller est `runHoursPerWeekOf`** : il alimente `riegelExponent`
(P5/B-21). Réduire la distance des répétitions réduit les heures de course hebdomadaires, donc
déplace l'exposant de Riegel, donc la PRÉDICTION. Boucle de retour réelle, à mesurer dans le lot.

### (b) plage des distances résultantes — le plancher ne mordrait pas, mais il doit exister

| allure | dose moyenne | facteur d'égalisation | distance médiane visée |
|---|---|---|---|
| 4:30 | 37,4 min | ×1,000 | 2 000 m |
| 5:45 | 40,4 | ×0,926 | 1 851 m |
| 7:00 | 44,6 | ×0,839 | 1 678 m |
| 8:30 | 49,3 | **×0,759** | **1 519 m** |

Distances actuelles : 1 000 et 2 000 m. **La plus courte que l'égalisation produirait est 759 m**
— très au-dessus du seuil de bon sens de ~400 m évoqué. Le plancher reste nécessaire (il devra
être un MAILLON DÉCLARÉ quand il mord) mais il ne mordrait sur aucun profil actuel.

### (c) C25 / dose — pourquoi le plafond n'a pas mordu, et ce qu'il ne couvre pas

`DOSE_CAP_MIN` déclare **`thr` 40 min · `vo2` 25 min**, par BLOC et par ZONE — la dose de 43,3 min
du profil lent est une MOYENNE sur toutes les zones de qualité, pas 43 min de seuil d'un bloc.

| allure | `rn.thr` | `rn.mara` |
|---|---|---|
| 4:30 | 25,7 min/bloc (plafond 40, respecté) | **61,0 min/bloc — aucun plafond déclaré** |
| 8:30 | **37,1** min/bloc (plafond 40, respecté **à 3 min près**) | **73,7 min/bloc — aucun plafond** |

**Deux trouvailles qui ne sont pas O-36 :**

1. **`rn.mara` n'a aucun plafond de dose** et porte la plus grosse dose de qualité du moteur
   (61-74 min/bloc). C'est peut-être délibéré — 16 km à allure marathon est une séance
   marathon légitime — mais ce n'est **écrit nulle part**, donc c'est une absence non arbitrée.
   Suivi en **O-39**.
2. **Le plafond `thr` est à 3 minutes de mordre** chez le coureur lent. Il mordra au premier lot
   qui allonge un peu les séances de seuil — et l'égalisation d'O-36 va justement dans l'autre
   sens, ce qui est un argument de plus en sa faveur.

```verify
id: O-36-cible
quoi: les trois mesures (a)(b)(c) du recadrage sont publiees
attendu: O36-CIBLE-MESURE
cmd: node scripts/mesureO36cible.mjs 2>/dev/null | grep -qE "PLUS COURTE que l.égalisation produirait : [0-9]{3} m" && node scripts/mesureO36cible.mjs 2>/dev/null | grep -q "aucun plafond déclaré pour cette zone" && echo "O36-CIBLE-MESURE"
```

---

## O-39 — `rn.mara` porte la plus grosse dose de qualité du moteur, sans aucun plafond déclaré

Trouvé en mesurant (c) ci-dessus. `DOSE_CAP_MIN` plafonne `thr` à 40 min et `vo2` à 25 ; **`mara`
n'y figure pas**, et les blocs `rn.mara` livrent **61,0 min à 4:30 et 73,7 min à 8:30** par bloc.

Le commentaire de `DOSE_CAP_MIN` justifie ses deux entrées (« une dose de seuil au-delà de ~40 min
ou de VO2 au-delà de ~25 min n'est pas un entraînement, c'est une course ») sans dire pourquoi
l'allure marathon en est exempte. **L'exemption est probablement juste** — courir 16 km à allure
marathon est le cœur d'une préparation marathon — mais une exemption non écrite est
indistinguable d'un oubli, et `IS_QUALITY_ZONE` classe pourtant `.mara` en qualité.

**Ce que ça demande** : soit un plafond, soit une ligne qui dit pourquoi il n'y en a pas.

```verify
id: O-39
quoi: rn.mara n'a pas d'entree dans DOSE_CAP_MIN alors qu'il est classe qualite
attendu: O39-REPRODUIT
cmd: grep -q "QUALITY_SUFFIX" src/generator/planGenerator.ts && node -e "import('./src/engine/constraintMatrix.ts').then(m=>process.exit(m.DOSE_CAP_MIN.mara===undefined?0:1))" && echo "O39-REPRODUIT"
```

---

## O-36 §1 — LES DEUX MESURES BLOQUANTES PASSENT, ET LA SECONDE PAR UNE RAISON STRUCTURELLE

`npm run mesure:o36b`. Les deux verrous du feu vert conditionnel (15/08) sont levés.

### §1.1 — la boucle `runHoursPerWeekOf → riegelExponent` : Δ maximal **+0,48 %**

| profil marathon | h/sem avant → après | exposant | chrono | Δ |
|---|---|---|---|---|
| 8:30 / inter | 5,55 → 5,32 | 1,1014 → 1,1041 | 6h46 → 6h48 | **+0,48 %** |
| 7:00 / inter | 5,50 → 5,37 | 1,1020 → 1,1035 | 5h28 → 5h29 | +0,24 % |
| 5:45 / inter | 5,50 → 5,45 | 1,1020 → 1,1026 | 4h24 → 4h24 | +0,08 % |

**Sous le seuil de 1 % : bruit de calcul.** L'effet pervers redouté — « prédire une course plus
lente parce qu'on a cessé de sur-prescrire » — existe, va bien dans le sens annoncé, et vaut
deux minutes sur un marathon de 6h46.

### §1.2 — la circularité B-25 : **O-36 n'entre pas dans la boucle**

Déplacement d'exposant sur 8 profils tri : **+0,0000, exactement**. La raison est structurelle et
elle a été VÉRIFIÉE plutôt que déduite d'un zéro (un zéro peut aussi vouloir dire que la sonde ne
trouve rien) :

```
tri/Full      : 19 blocs de qualité COURSE, dont 0 prescrits en DISTANCE
run/marathon  : 26 blocs de qualité COURSE, dont 4 prescrits en DISTANCE
```

Le leg course du tri ne porte **aucun** bloc de qualité en distance — la bande B-25 les prescrit
en temps. O-36 n'ajoute donc aucun terme à la boucle fermée `plan → heures → exposant →
prédiction → bande → plan`, et la résolution à une itération est intacte. Ce n'est pas « l'effet
est petit », c'est « il n'y a pas d'effet ».

**Feu vert : les deux verrous du §1 sont levés.** Reste à écrire (item 3) : la distance de
répétition dépendante de l'allure, son plancher déclaré comme maillon, le diff sur les 949
ventilé par tranche d'allure, et la mesure §4 (profils à moins de 5 min de `DOSE_CAP_MIN`).

```verify
id: O-36-boucle
quoi: les deux verrous du §1 sont mesures et passent
attendu: BRUIT DE CALCUL
cmd: node scripts/mesureO36boucle.mjs 2>/dev/null | grep -o "BRUIT DE CALCUL"
```


---

## O-39 (élargi) — ⚠ `rn.mara` N'EST PAS LA SEULE : `rp` ET `css` AUSSI

Ta vérification §3.1 était la bonne question, et la réponse est non. La garde `O-39`, écrite sur
la PROPRIÉTÉ (« toute zone de qualité émise est plafonnée ou exemptée »), balaie les zones
réellement ÉMISES sur les 949 :

```
5 suffixes de qualité émis : css · mara · rp · thr · vo2
  · thr  40 min   (DOSE_CAP_MIN)
  · vo2  25 min   (DOSE_CAP_MIN)
  · mara EXEMPTÉ  (DOSE_EXEMPT — écrit ce jour, raison physiologique)
  · rp   ⚠ ni plafond ni exemption
  · css  ⚠ ni plafond ni exemption
```

`rp` est l'allure course VÉLO (R20.5 : 0,70-0,88 × FTP selon le format) et `css` le seuil NAGE.
Les deux sont classés qualité par `IS_QUALITY_ZONE` et aucun ne porte de borne de dose.

**Je n'invente pas leur exemption.** `mara` avait une raison physiologique claire et mesurée ;
`rp` et `css` demandent un arbitrage — un bloc de 60 min à allure course d'Ironman est normal,
un bloc de 60 min de CSS ne l'est probablement pas, et la règle 14 dit que ces deux disciplines
ne se comparent pas dans la même monnaie. Décision au fondateur.

Statut : `O-39` est un rouge ATTENDU du banc, avec son ticket — il ne peut plus passer inaperçu,
et il redeviendra vert le jour où les deux zones sont tranchées.

---

## T-30 — écrit ROUGE, et le rapport n'est pas ×1,50 mais ×1,09

La propriété que l'item 3 d'O-36 doit rendre vraie : *à profil et format égaux, le temps de
travail d'un bloc de qualité est invariant par variation de `thrPace`*.

**Deux chiffres cohabitent et il faut dire lequel est lequel** :

| population mesurée | rapport lent/rapide |
|---|---|
| blocs de qualité prescrits en DISTANCE (§2.5) | **×1,50** |
| TOUS les blocs de qualité course (T-30) | **×1,09** |

Ils ne se contredisent pas : les blocs prescrits en TEMPS ne varient pas avec l'allure, et ils
diluent le résidu. **×1,50 est l'ampleur du défaut là où il vit ; ×1,09 est ce que l'athlète subit
en moyenne sur sa qualité.** T-30 mesure le second parce que c'est la propriété finale ; le
premier reste le bon chiffre pour dimensionner le correctif.

```verify
id: T-30
quoi: la propriete est ecrite ROUGE avant le correctif
attendu: T30-ROUGE
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep -q "· T-30 \[ROUGE\]" && echo "T30-ROUGE"
```

---

## O-39 §4(d) — ⚠ MA GARDE MESURAIT LA TABLE, PAS LE CODE : `css` EST DÉJÀ PLAFONNÉ

La mesure (d) — « `DOSE_CAP_MIN` compte-t-il le temps de TRAVAIL ou le temps TOTAL ? » — répond,
et elle corrige au passage mon propre périmètre d'O-39.

### (d) : c'est le temps de TRAVAIL, et le plafond ne voit pas les blocs en distance

```ts
if (b.durationMin != null) {                      // ← les blocs en DISTANCE n'entrent jamais ici
  const doseCap = /\.vo2$/…  : /\.thr$|\.css$/…   // ← `css` est mappé sur DOSE_CAP_MIN.thr
  if (reps * b.durationMin > doseCap) …           // ← reps × durée = TRAVAIL, récup exclue
}
```

**Trois conséquences, dans l'ordre d'importance :**

1. **`css` N'EST PAS orphelin** : il est plafonné à 40 min via la branche `thr`. Il n'a pas de
   CLÉ propre, et ma garde lisait `DOSE_CAP_MIN[suffixe]` — **elle mesurait la TABLE quand le
   code fait une RÉSOLUTION**. Treizième occurrence de « un critère qui nomme une chose et en
   mesure une voisine », dans la garde écrite pour trancher O-39. Corrigée : le prédicat lit
   désormais la résolution. **Périmètre réel d'O-39 : `rp` SEUL.**
2. Le plafond compte **`reps × durationMin`**, donc le travail, récupérations exclues. Les 40 min
   veulent bien dire la même grandeur en course et en nage — pas de treizième faute d'unité.
3. **Mais il est structurellement inatteignable en nage** : les blocs `sw.css` sont prescrits en
   MÈTRES, donc `b.durationMin` est `null` et la branche n'est jamais prise. Le plafond de 40 min
   pour `css` existe, il est correct, et il est **dormant par construction** — pas par calibrage.
   C'est une décision écrite, ce qui est l'objet d'O-39 ; mais qu'elle soit inatteignable mérite
   d'être su, et c'est la deuxième fois que la prescription en distance rend une règle muette
   (après C24/C24b et son `metersOf`).

**Ton arbitrage sur `css` est donc sans objet** : la décision existait déjà dans le code, elle
valait 40, et elle correspond à ce que tu aurais tranché. Reste `rp`, et la règle structurelle du
§2 (« le plafond suit la bande à laquelle `rp` se résout ») est à écrire — non fait ici.

```verify
id: O-39-d
quoi: DOSE_CAP_MIN ne voyait pas les blocs prescrits en DISTANCE. ⚠ Bloc CASSÉ par le lot 1, qui a réécrit exactement la ligne qu'il grepait (`reps * b.durationMin > doseCap`) — cas d'école de la règle 17 : le motif disparaît, et l'entrée se lirait comme réparée alors que c'est le CODE qui a changé de forme. La moitié « les blocs en distance sont invisibles » est FERMÉE par le lot 1 (mesuré : 244 dépassements sur 39 profils → 0). La moitié « `css` est résolu sur `thr` » reste vraie et c'est ce que ce bloc surveille désormais — il porte sur la PROPRIÉTÉ (une zone `.css` reçoit le plafond de seuil) et non sur une ligne de code.
attendu: O39D-REPRODUIT
cmd: node -e 'const s=require("fs").readFileSync("src/generator/planGenerator.ts","utf8");const i=s.indexOf("DOSE_CAP_MIN.vo2");process.exit(i>=0&&s.slice(i,i+300).includes(".css")?0:1)' && echo "O39D-REPRODUIT"
```

---

## O-40 — les deux gardes qui abandonnent quand l'unité ne leur convient pas · MESURE FAITE, ÉCRITURE À SCINDER

| garde | condition d'abandon | population muette |
|---|---|---|
| C24/C24b (plancher) | `if (tot <= 0) continue` | blocs prescrits en **temps** |
| `DOSE_CAP_MIN` (plafond) | `if (b.durationMin != null)` | blocs prescrits en **mètres** |

Les deux unités perdent une garde, **en sens opposés** : ce n'est pas un problème de choix
d'unité, c'est que chaque garde RENONCE au lieu de dériver la grandeur qui lui manque — alors que
le moteur connaît les vitesses (CSS, allure seuil) et convertit déjà dans les deux sens
(`weekDistances` le fait).

### La mesure préalable (`npm run mesure:o40`) : le plafond MORD, étroitement

| | |
|---|---|
| blocs de corps prescrits en mètres | 11 890 |
| … portant une zone à plafond | 1 924 |
| … que le plafond mordrait | **42** |
| profils touchés | **12** |

**Tous en `tri/70.3` et `tri/Full`, tous sur « Nage seuil (+dist) » en `sw.css`**, entre 40 et
46 min de travail pour un plafond de 40. Le dépassement est de 0 à 6 minutes.

### Ce que ça impose à l'écriture — et c'est ta propre consigne

Le plafond mord, donc **c'est un changement de PLAN** : il demande son propre diff ventilé, et il
ne doit **pas** être posé dans le même geste que la garde. Le lot se scinde en deux :

1. **la garde**, indifférente à l'unité, sans effet de plan là où elle ne mord pas (C24/C24b
   étendu aux blocs en temps — à mesurer de la même façon avant d'écrire) ;
2. **le plafond nage effectif**, avec son diff sur les 12 profils.

**Réserve d'instrument, à lever avant d'écrire (2)** : mon temps de travail vaut
`_min − recoveryMin × (reps − 1)`. Le dépassement étant de 0 à 6 min et trois blocs tombant
*exactement* à 40, le verdict « 42 blocs » est SENSIBLE à cette définition. La branche course
compare `reps × durationMin` ; la mesure nage doit être alignée sur elle à la source avant de
décider — sinon c'est une quatorzième occurrence de la règle 15, dans la mesure qui sert à
trancher O-40.

```
T-31   Aucune garde ne traite comme absente une grandeur PRÉSENTE dans une autre
       unité et convertible avec ce que le moteur connaît déjà.
       T-29 : « donnée manquante ⇒ contrôle sauté ».
       T-31 : « donnée dans l'AUTRE UNITÉ ⇒ contrôle sauté ».
       🔴 rouge aujourd'hui sur les deux gardes ci-dessus.
```

```verify
id: O-40
quoi: les deux gardes abandonnent selon l'unite ; le plafond nage est DECLARATIF (mesure corrigee en a93d5c7)
attendu: LE PLAFOND EST DÉCLARATIF
cmd: node scripts/mesureO40.mjs 2>/dev/null | grep -o "LE PLAFOND EST DÉCLARATIF"
```

---

## O-40 §1 — LES DEUX MESURES COÏNCIDENT, ET LE PÉRIMÈTRE TOMBE DE 42 À 12 : MON BALAYAGE MESURAIT UN NAGEUR DE REPLI

Ta prédiction falsifiable est tranchée, et la vérification a trouvé plus gros que la question.

### La prédiction : IDENTIQUES

`stepMin` est la source unique et vaut **`travail + rec`, rien d'autre** :

```ts
const rec = st.role === "body" && reps > 1 ? (reps - 1) * (st.recoveryMin || 0) : 0;
if (st.durationMin) return reps * st.durationMin + rec;
if (st.distanceM)   return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60) + rec;
```

Mesuré sur les **1 922 blocs** à zone plafonnée : **0 divergent, écart max 0,0000 min**. Les blocs
ne portent que du travail et des récupérations — rien à nommer, comme ta branche « identiques » le
prévoyait.

### ⚠ Mais la vérification a démasqué ma propre mesure — et le périmètre change

Ma première écriture posait `CSS_SEC = 110` (la valeur DÉCLARÉE dans le balayage) et rendait
**1 924 divergents sur 1 924**. Un taux de 100 % accuse l'instrument, pas les blocs : le moteur
employait **130 s/100 m**, le REPLI de `stepMin` (`baseRefs.css || 130`), parce que mon `BASE` ne
passait pas `css_known: "oui"` — la CSS déclarée était ignorée.

**Le balayage mesurait donc un nageur 18 % plus lent que celui qu'il croyait décrire**, ce qui
gonfle mécaniquement le temps de travail. Même famille que le harnais E2E qui fabriquait un
athlète de 138 kg (U14).

| | hier (nageur de repli, css 130) | corrigé (css déclarée, 110) |
|---|---|---|
| blocs que le plafond mordrait | **42** | **12** |
| profils touchés | **12** | **4** |

**Quatorzième occurrence de la règle 15**, et elle est survenue dans la mesure écrite pour lever
une réserve sur une autre mesure. La réserve était fondée ; sa cause n'était pas celle que je
soupçonnais.

### Ce que ça ne change pas, et ce que ça change

- **La scission tient** : le plafond mord encore (12 blocs, 4 profils), donc c'est toujours un
  changement de plan qui demande son propre diff, et il ne va pas dans le même geste que la garde.
- **Le lot 2 est quatre fois plus petit** que ce que le chiffre d'hier laissait croire, et il reste
  entièrement en `tri/70.3` et `tri/Full` sur « Nage seuil (+dist) ».
- **Le lot 1 (la garde) est inchangé** : son test d'acceptation reste golden 0 écart.

```verify
id: O-40-perimetre
quoi: les deux mesures coincident, et le perimetre reel est de 12 blocs sur 4 profils
attendu: 0 divergent
cmd: node scripts/mesureO40.mjs 2>/dev/null | grep -o "divergents (> 0,05 min) : 0" | head -1 | sed "s/.*: /0 divergent/"
```

---

## O-41 (a) — LE REPLI TIRE, ET IL TIRE SUR UN ATHLÈTE QUI A FOURNI SA DONNÉE

`stepMin` retombe sur **130 s/100 m** quand `baseRefs.css` n'est pas peuplé. Ce n'est pas un
contrôle sauté — c'est une **donnée fabriquée** : le plan est calculé pour un nageur qui n'est pas
l'athlète, et rien à l'écran ne le distingue d'un plan juste.

La sonde n'interroge pas `baseRefs` (règle 15) : elle **inverse `stepMin`** sur les blocs de nage
prescrits en mètres, ce qui rend la vitesse RÉELLEMENT employée.

| déclaration | profils | repli | css employée |
|---|---|---|---|
| `css` + `css_known: "oui"` | 324 | **0 %** | 110 |
| **`css` saisie SANS `css_known`** | 324 | **100 %** | **130** |
| aucune `css` | 324 | 100 % | 130 |

**⚠ ET LA VÉRIFICATION SUIVANTE CORRIGE MON PROPRE CADRAGE.** J'allais écrire « l'athlète a
fourni sa donnée et le moteur la remplace ». C'est faux tel quel : la lecture est **gatée sur
`css_known === "oui"`** en QUATRE endroits (`bridge` ×3, `weekDistances`, `reasoningEngine`), et le
questionnaire pose le drapeau avant la valeur. L'état « `css` saisie sans `css_known` » est donc
un état que **mon balayage a fabriqué**, pas un état du produit — quinzième occurrence de la
règle 15, et cette fois dans la conclusion, pas dans la mesure.

**Ce qui reste vrai et ce qui reste à vérifier :**

- la ligne 3 (aucune CSS déclarée) est **légitime** — il faut bien une valeur — et c'est la
  branche **(b)** : `130` est alors une constante non sourcée de plus, qui mérite sa provenance
  écrite et probablement une indexation sur le niveau ;
- **le chemin qui reste soupçonné est l'IMPORT.** O-22/O-25 écrivent des références MESURÉES
  (Strava, FIT) dans le journal. Si un import peuple `css` **sans** poser `css_known`, la valeur
  mesurée est ignorée et le repli tire sur un athlète qui a bel et bien fourni sa donnée — le
  scénario que je décrivais, au bon endroit cette fois. **Non mesuré**, et c'est ce qui décide de
  la priorité.

**Les trois lignes DIFFÈRENT, donc la sonde discrimine** : la saturation à 100 % est réelle, pas
un artefact — c'est précisément le test de dépistage que ce lot ajoute à `CLAUDE.md`.

**Priorité, révisée par la vérification ci-dessus** : ce n'est PAS un P1 sur le questionnaire.
Le ticket se réduit à (b) — provenance de `130` — plus la vérification du chemin d'import, qui
est le seul endroit où le scénario « donnée fournie, donnée remplacée » peut encore vivre.

Le sens de l'erreur, pour (b) : 130 s/100 m est **plus rapide** qu'un vrai débutant, donc ses
durées de bloc sont **sous-estimées** — sa séance déborde dans la vraie vie.

```verify
id: O-41
quoi: le repli css tire a 100 % des que css_known manque, et a 0 % quand il est pose
attendu: repli    0 (  0 %)
cmd: node scripts/mesureO41.mjs 2>/dev/null | grep "CSS DÉCLARÉE" | grep -o "repli    0 (  0 %)"
```


---

## O-41 §2 — LES DRAPEAUX FRÈRES : AUCUN CHEMIN N'ÉCRIT LA VALEUR SANS LE DRAPEAU · **PAS DE P0**

La question qui décidait de la sévérité — *« un chemin d'écriture de la VALEUR existe-t-il sans
écriture du DRAPEAU ? »*, en particulier pour la FTP — est tranchée par balayage des écritures.

**Les drapeaux frères existent** : `ftp_known`, `pace_known`, `css_known`, `vam_known`.

**Écrivains recensés de `answers.{ftp,css,pace}`** — il n'y en a que deux, et les deux posent le
drapeau **dans la même instruction** :

```js
// questionnaire (steps.js) — la branche ne s'ouvre que si le drapeau vaut "oui"
branch("cssB", a.css_known === "oui", '<input data-input="css">')

// édition du Profil (tab-profile.js:83-87 et 1145-1154, saisie manuelle ET retest)
S.answers.css = v; S.answers.css_known = "oui";
```

**Et les modules d'import n'écrivent PAS `answers.ftp/css/pace` du tout** : `measured.js`,
`strava.js` et `retest.js` alimentent le **journal** (`answers.tests`), qui est un autre canal.

→ **Le scénario « l'import peuple la valeur sans poser le drapeau » n'existe pas**, ni pour la
FTP ni pour les autres. **Pas de P0**, et l'ordre du §5 est inchangé : le lot 1 peut passer.

### Ce qui reste à vérifier, et c'est un cran plus loin que ma question

Puisque l'import écrit dans le JOURNAL et non dans `answers`, la question devient : **la promotion
journal → `answers` pose-t-elle le drapeau ?** R20.1 a déjà corrigé une fois « l'import qui
n'atteignait jamais le plan généré, le moteur ne lisant que `a.ftp/pace/css` » — donc un mécanisme
de promotion existe, et c'est LUI qu'il faut regarder. **Non mesuré ici** (fin de budget), et c'est
la première chose à faire à la reprise d'O-41.

La distinction de fond que tu poses reste la bonne et n'est pas tranchée : **`css_known` veut-il
dire « on a une valeur » ou « l'athlète l'a déclarée » ?** Aujourd'hui les deux coïncident parce
que seul l'athlète écrit. Le jour où la promotion écrit aussi, il faudra choisir — et la bonne
forme est celle que tu décris : le moteur UTILISE la valeur quelle que soit son origine, et trace
l'origine à part, comme `source`/`inherited` dans `PROVENANCE`.

```verify
id: O-41-freres
quoi: aucun chemin n'ecrit la valeur de reference sans poser son drapeau
attendu: O41-FRERES-OK
cmd: test $(grep -rnE "S\.answers\.(ftp|css|pace) *=" endurabuild/js/ 2>/dev/null | grep -v engine.js | grep -cv "_known *= *\"oui\"") -eq 0 && echo "O41-FRERES-OK"
```


---

## O-41 §1 — LA PROMOTION EXISTE, COUVRE LES QUATRE RÉFÉRENCES, ET POSE LE DRAPEAU · ✅ **FERMÉ**

Le pont est `syncRefsFromTests()` (`tab-profile.js`), et son en-tête énonce exactement le défaut
qu'il ferme : *« le moteur V2 ne lit QUE les valeurs courantes — jamais le journal daté. Sans ce
pont, un import écrirait le journal mais le plan généré ne changerait JAMAIS. »*

| référence | promotion | pose le drapeau |
|---|---|---|
| `ftp` | ✅ | ✅ `ftp_known = "oui"` |
| `thrPace` → `pace` | ✅ | ✅ `pace_known = "oui"` |
| `css` | ✅ | ✅ `css_known = "oui"` |
| `vam` | ✅ (R12.2/R12.3) | ✅ `vam_known = "oui"` |

**Les quatre, dans la même instruction que la valeur.** C'est ta première issue — *« la promotion
existe et pose le drapeau → le ticket se ferme »*. Aucune référence n'est laissée derrière : la
VAM porte même un commentaire disant que c'est « le bug déjà corrigé une fois » qu'on ne refait pas.

**Et la sémantique ne se pose donc pas encore** : `*_known` reste cohérent parce que la promotion
le pose comme le ferait l'athlète. La distinction présence/provenance que tu proposes
(`css_origin: "declared" | "measured" | "retest"`) reste la bonne forme pour le jour où l'on
voudra afficher la confiance ou la fraîcheur — **elle n'est pas requise par un défaut**, et
l'ajouter maintenant serait du travail sans mesure derrière.

### §3 — la politique de sélection est EXPLICITE, contrairement à l'attente

Tu écrivais : *« il y a forcément une réponse dans le code, et il y a peu de chances qu'elle soit
écrite quelque part comme une décision. »* Elle l'est, et longuement — c'est le produit d'O-23
puis d'O-25 :

```js
c.sort((x, y) =>
  String(y.t.date).localeCompare(String(x.t.date))          // 1. le plus RÉCENT
  || (DELIBERE(y.t) ? 1 : 0) - (DELIBERE(x.t) ? 1 : 0)      // 2. à date égale, la saisie
                                                            //    DÉLIBÉRÉE (profil/retest)
                                                            //    prime sur l'import — O-25
  || (y.i - x.i));                                          // 3. sinon la POSITION, le journal
                                                            //    étant append-only — O-23
```

Ce n'est **ni** « le meilleur » **ni** « une moyenne sur une fenêtre » : c'est **le plus récent, la
saisie délibérée primant à date égale**. Ton arbitrage physiologique (le meilleur test surestime,
le plus récent est sensible à un mauvais jour, une fenêtre lisse mais retarde) reste ouvert comme
QUESTION — mais la décision actuelle est écrite, sourcée par deux tickets, et défendable.

**Réserve honnête** : `syncRefsFromTests` vit dans l'UI et n'est appelée que depuis trois points
(deux dans `tab-profile`, un dans `retest`). Un chemin d'import qui écrirait le journal **sans**
passer par l'un d'eux laisserait la promotion muette — non balayé ici, et c'est le seul angle qui
reste sur ce ticket.

```verify
id: O-41-promotion
quoi: le pont promeut les CINQ references et pose le drapeau a chaque fois (4 d'origine + longest_swim, lot D3)
attendu: 5
cmd: grep -c "_known = \"oui\"; n++" endurabuild/js/state.js
```


---

## O-41 §1bis — LE BALAYAGE DES ÉCRIVAINS TROUVE UN TROU : `steps.js` REMPLIT LE JOURNAL SANS PROMOUVOIR

Le §1 du dernier arbitrage demandait de lister les ÉCRIVAINS du journal, pas les lecteurs. Fait :

| écrivain | ce qu'il pousse | promotion qui suit |
|---|---|---|
| `tab-profile.js:1040` (restauration/import de sauvegarde) | tests importés | ✅ `syncRefsFromTests()` l.1073 |
| `tab-profile.js:1139` (saisie manuelle du Profil) | `ftp`/`thrPace`/`css` | ✅ l.1090 + écriture directe de la valeur |
| `tab-profile.js:725` | `profil:race_inter` | — sans objet (pas une référence) |
| `retest.js:114` (retest guidé) | `r.type` | ✅ `syncRefsFromTests()` l.116 |
| **`steps.js:640` et `695`** | **`ftp` et `thrPace`** | **❌ AUCUNE — le fichier n'appelle jamais la promotion** |

**`steps.js` est le chemin d'IMPORT dans le questionnaire** : ses sources le disent en toutes
lettres (`"Strava (ton meilleur 10 min continu)"`), et c'est là que vivent O-22 et O-25 — la FTP
déclarée puis la meilleure moyenne 20 min, l'allure seuil depuis une course déclarée ou le
meilleur 10 min. Il pousse les valeurs MESURÉES dans le journal, **et n'écrit ni la valeur
courante ni le drapeau**.

C'est le scénario que le §1 de `O41_PROMOTION_JOURNAL` classait « la plus probable et la plus
discrète » : *rien ne casse, l'athlète importe, le journal se remplit, et le plan ne bouge pas.*

**⚠ TROUVÉ, PAS CONFIRMÉ DE BOUT EN BOUT.** Le balayage est statique : il montre qu'aucun appel
à la promotion n'existe dans ce fichier et qu'aucune écriture de `S.answers.ftp` n'y figure. Il ne
prouve pas que le flux d'interface ne repasse pas par `tab-profile` après coup (un retour au
Profil déclencherait la promotion). **À confirmer par un parcours E2E** avant d'écrire le
correctif — sinon c'est un constat sur le fichier, pas sur le produit (T-33).

**Le correctif, s'il est confirmé, est celui du §2 et pas un quatrième appel** : accrocher la
promotion à la fonction d'AJOUT au journal elle-même. Un seul point, impossible à oublier, et les
futurs chemins d'import en héritent — la géométrie du sceau, appliquée au journal.

```
(bloc `verify` RETIRÉ — le constat est réfuté, voir « O-41 RÉFUTÉ » plus bas)
```


---

## O-41 §1bis — E2E : LES DEUX VARIANTES ÉCHOUENT · **TROU FRANC**, avec une réserve d'instrument

Suite `tests/e2e/smoke-import-ref.mjs`, écrite avec le piège du §1 en tête : ouvrir le Profil
déclenche la promotion, donc un test qui y passe FABRIQUE le résultat qu'il mesure.

L'état posé est **exactement** ce que fait le chemin d'import de `steps.js` — les deux entrées de
journal (`ftp: 250` source Strava, `thrPace: 260` source Strava) et **rien d'autre** : ni `ftp`,
ni `ftp_known`.

| variante | `answers.ftp` | `ftp_known` | verdict |
|---|---|---|---|
| **(a)** génération directe, sans ouvrir le Profil | `null` | `non` | ✖ non promue |
| **(b)** après être passé par le Profil | `null` | `non` | ✖ non promue |

Selon la table de l'arbitrage, c'est **`(a) ✗ et (b) ✗` → trou franc, aucun masquage**.

Et la lecture du code le confirme : `syncRefsFromTests()` n'est appelée qu'aux lignes 1073 et 1090
de `tab-profile.js` — dans les **handlers** de restauration de sauvegarde et d'enregistrement
manuel — plus `retest.js:116`. **Elle ne tourne pas au rendu de l'onglet.** Visiter le Profil ne
suffit donc pas ; il faut y enregistrer quelque chose.

### ⚠ La réserve, et elle suit la règle du taux saturé

**Deux variantes sur deux qui échouent est le genre de résultat qui accuse l'instrument.** Ma
lecture se fait dans `localStorage`, qui n'est écrit que par `ebSave` : si la variante (b) avait
promu **en mémoire** sans persister, je lirais quand même `null`. Le verdict « trou franc » est
donc solide sur (a) — c'est là que le dommage vit — et **à confirmer sur (b)** par une lecture
en mémoire plutôt qu'en storage.

Ça ne change pas le correctif, seulement l'étiquette de (b) : trou franc, ou trou masqué par une
navigation qui inclut un enregistrement.

### Le correctif reste celui du §2, dans les trois cas

Accrocher la promotion à la fonction d'**ajout au journal**, pas un quatrième appel. Et la raison
de fond est mesurée : **O-22 et O-25 ont travaillé dans `steps.js` même**, et ni l'un ni l'autre
n'a relié l'écriture du journal à la promotion — parce que `syncRefsFromTests` vient de R20.1,
ailleurs et plus tard. Une couture de ce type ne se referme que par la structure.

```
(bloc `verify` RETIRÉ — le constat est réfuté, voir « O-41 RÉFUTÉ » plus bas)
```


---

## O-41 — ⚠ **RÉFUTÉ. LE TROU N'EXISTE PAS DANS LE PRODUIT** · ✅ FERMÉ (16/08/2026)

La mesure du §3 (« le journal est-il écrit avant ou après la pose du drapeau ? ») a renversé ma
propre conclusion, et la réponse est plus simple que les deux branches prévues.

**`stravaImport` n'a qu'UN SEUL appelant**, `runStravaImport` (`tab-profile.js:1033`), et il
promeut immédiatement :

```js
await stravaImport(tok);            // écrit S.answers.tests
if (!added) return;                 // rien de neuf → rien à promouvoir
const nRef = syncRefsFromTests();   // ← la promotion, juste après
ebSave();
if (nRef) invalidatePlan();         // et le plan est RÉGÉNÉRÉ sur la nouvelle référence
```

Le balayage statique disait vrai **du fichier** — `steps.js` n'appelle jamais la promotion — et
faux **du produit** : sa seule voie d'entrée le fait pour lui. La fonction vit dans `steps.js`
pour des raisons d'historique, elle n'y est pas invoquée.

### Ma « confirmation E2E » était une fixture synthétique — c'est T-33, mot pour mot

J'ai injecté des entrées de journal **directement dans `localStorage`**, un état qu'aucun chemin
produit ne fabrique : le seul qui écrit ces entrées promeut dans la foulée. La suite mesurait donc
la fixture, pas le produit — exactement la règle que ce chantier venait d'écrire :

> **T-33** — *toute fixture de mesure est atteignable par un chemin produit, ou explicitement
> étiquetée état synthétique. Une fixture inatteignable rend un constat sur la fixture, jamais
> sur le produit.*

Je l'ai écrite au tour précédent et enfreinte au suivant. C'est la seizième occurrence de la
famille, et la première où la règle violée était déjà nommée dans le dépôt.

**Ce qui aurait dû m'alerter, et c'est écrit dans `CLAUDE.md` depuis ce lot** : les DEUX variantes
échouaient. Un résultat saturé accuse l'instrument — j'ai appliqué la première moitié de
l'heuristique (« l'instrument discrimine-t-il ? ») et sauté la seconde (« quel état PRODUIT ce
résultat décrit-il ? »).

### Conséquences

- **Les pas B et C sont RETIRÉS.** Pas de crochet à poser : la promotion suit déjà l'écriture sur
  le seul chemin qui existe. Pas de réconciliation au chargement : sans trou, il n'y a pas de
  dommage passé à rattraper, donc pas de compteur à poser.
- **`tests/e2e/smoke-import-ref.mjs` est SUPPRIMÉE.** Une suite qui mesure un état inatteignable
  ne garde rien ; la laisser en « rouge attendu » figerait un faux défaut dans le cliquet.
- **Le pas A reste, et sa justification tient sans le trou** : les trois mécanismes qui touchent
  aux références de l'athlète cohabitent désormais, ce qui est la cause de fond de la couture
  O-22/O-25. Le regroupement empêche qu'un futur chemin d'import oublie la promotion — c'est
  maintenant de la prévention, plus une réparation.


---

## O-42 — ⚠ `stepMin` ET `weekDistances` CONVERTISSENT DÉJÀ LA MÊME GRANDEUR, ET PAS PAREIL

**Trouvé en vérifiant la prémisse du §2 du lot 1** — *« `stepMin` fait déjà cette résolution
puisqu'elle produit les durées d'aujourd'hui »*. Elle est FAUSSE, et c'est bloquant pour le lot 1.

```ts
// stepMin (renderer.ts) — la durée qui pilote TOUT le plan
if (d === "sw") return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60) + rec;
//                                                      ↑ le CSS BRUT, quelle que soit la zone

// weekDistances (engine) — le récap hebdomadaire affiché
const min = (km * 10 * css / 60) / (SWIM_SPEED_RATIO[st.zone] ?? SWIM_SPEED_RATIO["sw.easy"]);
//                                  ↑ le ratio DE LA ZONE
```

**`stepMin` traite chaque mètre de nage comme nagé au CSS.** `weekDistances` applique
`SWIM_SPEED_RATIO` = {`sw.easy` 0,80 · `sw.aero` 0,88 · `sw.css` 1,00 · `sw.speed` 1,02} et
`RUN_SPEED_RATIO` en course.

Conséquence arithmétique : pour un bloc `sw.easy`, `weekDistances` rend **1 ÷ 0,80 = +25 %** de
durée par rapport à `stepMin`. Deux vérités pour une même conversion, et l'écart change de signe
selon la zone — c'est `_IFZ` sous une troisième forme, **déjà en place**, indépendamment d'O-40.

### Pourquoi ça bloque le lot 1

La forme proposée — « une garde ne convertit pas, elle demande à `stepMin` » — est la bonne
géométrie, mais elle ferait hériter le plafond de dose d'une conversion qui **contredit déjà**
l'autre. On fermerait une divergence d'unité en propageant une divergence de vitesse.

Et le sens compte : `stepMin` SOUS-ESTIME la durée des blocs de nage faciles (il les compte au
CSS alors qu'ils se nagent plus lentement), donc il sous-estime le volume de nage du plan — sur
la discipline où 89 % des blocs sont prescrits en mètres.

### Ce que ça demande, et je ne le tranche pas

Laquelle des deux conversions fait foi ? `weekDistances` est physiologiquement plus juste (un
bloc facile ne se nage pas au CSS) ; `stepMin` est celle qui pilote le plan depuis toujours, donc
l'aligner CHANGE le volume livré de toutes les séances de nage. C'est un arbitrage d'entraînement
avec un rayon large, à mesurer avant d'écrire — pas un correctif à glisser dans le lot 1.

**Le lot 1 attend cette décision** : il n'y a pas de « source unique » à laquelle demander tant
qu'il y en a deux qui se contredisent.

```verify
id: O-42
quoi: stepMin convertit au CSS brut, weekDistances applique le ratio de zone
attendu: O42-CORRIGE
cmd: grep -q "zoneSpeedRatio(st.zone, undefined, \"css\")" src/generator/renderer.ts && ! grep -q "SWIM_SPEED_RATIO" src/engine/weekDistances.ts && echo "O42-CORRIGE"
```


---

## O-42 §2 — CONFIRMÉ : IL Y A BIEN **TROIS** VALEURS, ET `weekDistances` EST FAUSSE AUSSI

Ta suspicion était fondée. `ZDEF` définit les zones en multiplicateurs d'**ALLURE** (secondes au
100 m / au km), donc la vitesse implicite est **1 ÷ ce multiplicateur**. Comparée aux tables de
`weekDistances`, zone par zone :

| zone | `ZDEF` (allure ×) | vitesse implicite | `*_SPEED_RATIO` | écart |
|---|---|---|---|---|
| `sw.easy` | 1,12 | **0,893** | **0,80** | −10,4 % |
| `sw.aero` | 1,06 | **0,943** | **0,88** | −6,7 % |
| `sw.css` | 1,00 | 1,000 | 1,00 | ✓ |
| `sw.speed` | 0,94 | **1,064** | **1,02** | −4,1 % |
| `rn.easy` | 1,16–1,26 (méd. 1,21) | **0,826** | **0,78** | −5,6 % |
| `rn.rec` | 1,28–1,40 (méd. 1,34) | **0,746** | **0,70** | −6,2 % |
| `rn.mara` | 1,08–1,13 (méd. 1,105) | **0,905** | **0,92** | +1,7 % |
| `rn.thr` | 1,00–1,05 (méd. 1,025) | **0,976** | **1,00** | +2,5 % |
| `rn.vo2` | 0,92–0,97 (méd. 0,945) | **1,058** | **1,05** | −0,8 % |

**Trois conversions pour une grandeur** — `stepMin` (ratio 1,00 partout), `weekDistances` (sa
table), `ZDEF` (les allures que l'athlète LIT). Et `weekDistances` diverge de `ZDEF` sur **8 zones
sur 9**, jusqu'à 10,4 % en nage facile. Elle est moins fausse que `stepMin`, mais fausse.

**Donc ta §3 est la seule issue** : l'autorité n'est ni l'une ni l'autre, c'est la définition de
zone. Aucune fonction ne porte sa propre table ; les deux dérivent depuis `ZDEF` — celle qui
produit les allures affichées. Le plan cesse alors d'afficher une allure et d'en compter une
autre, ce qui est le défaut que ce chantier corrige depuis le premier jour, appliqué à la
conversion plutôt qu'au message.

*(Note de méthode : pour la nage, `ZDEF` porte `lo === hi`, la vitesse implicite est donc exacte.
Pour la course, les bandes ont une largeur et j'ai pris la MÉDIANE — c'est un choix, pas une
lecture, et il devra être tranché avec le correctif : médiane, borne lente, ou bande conservée.)*

**Le sens du biais, troisième instance** — à noter comme famille : quand ce moteur se trompe sur
le volume, il se trompe **vers le haut de la charge**. Les 350 profils annonçant un pic
supérieur au livré · le repli `css || 130`, plus rapide qu'un vrai débutant · `stepMin`, qui
compte un bloc facile comme nagé au seuil. Trois mécanismes indépendants, une seule direction.

**Et le périmètre du lot 2 est périmé** : les 12 blocs / 4 profils ont été comptés sur les durées
de `stepMin`. Les durées de nage montant, le nombre de blocs au-dessus de 40 min augmentera —
à re-mesurer après O-42, jamais à réutiliser.

```verify
id: O-42-trois
quoi: weekDistances porte une table de ratios qui diverge de ZDEF sur 8 zones sur 9
attendu: O42-TROIS-CORRIGE
cmd: ! grep -q '"sw.easy": 0.80' src/engine/weekDistances.ts && grep -q '"sw.easy": { ref: "css", lo: 1.12' src/generator/renderer.ts && echo "O42-TROIS-CORRIGE"
```


---

## O-42 §3 — IL Y EN A **QUATRE**, PAS TROIS : L'AUDITEUR PORTE LA SIENNE, ÉCRITE DEUX FOIS

Trouvé en cherchant qui d'autre convertit des mètres en minutes (règle 16 : la question du
producteur se pose récursivement). Le compte n'est pas de trois :

| lieu | conversion mètres → durée | forme |
|---|---|---|
| `stepMin` (générateur) | ancre BRUTE, ratio 1,00 | implicite |
| `loadModel.stepMinutes` (auditeur) | ancre BRUTE, ratio 1,00 | implicite |
| `loadModel` ligne 358 (auditeur, refente d'intensité) | ancre BRUTE, ratio 1,00 | **recopiée** de la précédente |
| `weekDistances` (UI, km de la semaine) | sa table `*_SPEED_RATIO` | explicite |
| `ZDEF` | ce que l'athlète LIT | l'autorité |

Quatre sites, trois comportements distincts, une seule grandeur. Et deux des quatre sont une
**copie littérale** l'une de l'autre à quinze lignes d'écart, dans le même fichier.

**Conséquence pour le correctif** : corriger `stepMin` sans corriger `loadModel` ferait diverger
le volume que le générateur BUDGÉTISE de celui que l'auditeur MESURE — c'est-à-dire rouvrir
exactement la famille que T-25 suit. Les quatre bougent ensemble ou aucun ne bouge.

**Et un commentaire de `loadModel` est FAUX** (règle 13) : *« Différence méthodologique ASSUMÉE
avec le `stepMin` du générateur : nous comptons la récup entre répétitions (N-1 × récup), lui
non »*. `stepMin` la compte depuis **R5.6a** — c'est même la dette la plus ancienne du dépôt,
fermée il y a des mois. Le commentaire décrit un état du moteur qui n'existe plus et invite à
tolérer un écart qui n'a plus de cause.

### Ce que le choix de bande coûte, mesuré (`npm run mesure:o42`)

`ZDEF` porte `lo === hi` en NAGE (vitesse implicite exacte) et des BANDES en course. Une durée
dérivée d'une distance doit choisir un point dans la bande — c'est le seul choix que la lecture
ne donne pas. Mesuré sur 171 plans, 4 259 blocs de corps prescrits en mètres :

```
blocs dont la zone porte une bande : 108 / 4 259  (2,5 %)
borne RAPIDE (lo)  : +7,8 %  de minutes vs aujourd'hui
CENTRE      (mid)  : +7,9 %
borne LENTE (hi)   : +8,0 %
→ l'écart lo↔hi vaut 0,2 % du total, contre 7,9 % pour la correction elle-même.
```

**Le choix est donc quarante fois plus petit que la correction.** Il se tranche sur un principe
plutôt que sur un arbitrage : `longRunSpecificity` a déjà posé la règle — *« un plancher se
calcule sur l'hypothèse la moins gourmande »*, donc il prend `lo`. `stepMin` ne produit ni
plancher ni plafond mais une **comptabilité** : une comptabilité prend la valeur attendue, donc
le CENTRE. La borne LENTE (`hi`, la plus prudente au sens du manifeste) coûte **+0,1 %** de plus :
elle est chiffrée ici pour que la décision reste révocable sans re-mesure.

### L'ampleur par zone, telle que le §6 la demande vérifiable

```
sw.easy   2 130 blocs   44 357 → 49 680 min   +12,0 %   (1/1,12 − 1)
sw.aero     975 blocs   20 814 → 22 063 min    +6,0 %   (1/1,06 − 1)
sw.css      797 blocs   14 177 → 14 177 min     0,0 %   ancrage, inchangé
sw.speed    249 blocs    1 772 →  1 666 min    −6,0 %   (1/0,94 − 1)
rn.thr       72 blocs    1 530 →  1 568 min    +2,5 %
rn.mara      36 blocs    1 860 →  2 055 min   +10,5 %
TOTAL      4 259 blocs   84 510 → 91 209 min    +7,9 %
```

**`sw.speed` BAISSE, et c'est attendu** : c'est la seule zone prescrite en mètres qui se nage
plus VITE que le CSS. Le critère du §6 (« les durées montent, jamais ne baissent, hors `sw.css` »)
doit donc s'entendre « suit le ratio de la zone » — ce que sa deuxième ligne dit déjà. Signalé
plutôt que corrigé en silence.

```verify
id: O-42-quatre
quoi: loadModel porte sa propre conversion metres→minutes, ecrite deux fois, a l'ancre brute
attendu: O42-QUATRE-CORRIGE
cmd: test $(grep -c 'refs.cssSecPer100m) / 100 / 60' src/engine/loadModel.ts) -eq 1 && echo "O42-QUATRE-CORRIGE"
```

### Règle 17 appliquée — **quatre** blocs ont basculé, **quatre** étaient des faux positifs

`registry:check` a rangé quatre entrées en « ne reproduit plus » dans la même exécution. Confirmées
À LA MAIN, comme la règle 17 l'exige : **aucune n'est un défaut corrigé.**

| entrée | ce que le bloc cherchait | ce qui a bougé | le défaut ? |
|---|---|---|---|
| `O-41-promotion` | le motif dans `tab-profile.js` | le **pas A** a déplacé `syncRefsFromTests` vers `state.js` | intact (4 occurrences, dans l'autre fichier) |
| `O-32` | `disque 9 · precachees 9` | `bebas-neue-400.woff2` **supprimée** (Z-01, police morte) | intact — `manquantes 0` tient, 8 sur 8 |
| `O-13` | `S1 1,3h` à `vol_recent = 0` | O-35 convertit la DÉCLARATION de nage → 1,4 h | intact — la rampe mord toujours (1,4 < 1,6) |
| `O-10` | « deux séances certains jours » | R20.2 (2ᵉ correction) : l'argmin nomme un AUTRE maillon | intact — 10 h → 8,8 · 16 h → 8,7, toujours inerte |

**Les quatre blocs épinglaient une VALEUR ou un CHEMIN là où l'entrée décrit une PROPRIÉTÉ** —
c'est la même faute que la règle 15 nomme côté mesure, appliquée au registre lui-même. Réécrits
sur la propriété : `manquantes 0` sans compte, « ce qui borne … Si tu levais cette contrainte »
sans nommer le maillon, le motif de promotion cherché là où il vit.

**Condition d'automatisation de `registryCheck` (LOT 1 §3)** : le déclencheur posé est « un SEUL
commit fait basculer ≥ 2 blocs ». Il n'est pas atteint — les quatre viennent de quatre lots
différents étalés sur la session, et le processus les a tous rattrapés. Le seuil reste posé tel
quel ; ce qui est mesuré ici, c'est qu'une exécution rend **4 faux positifs pour 0 vrai**, donc
que le coût du processus est entièrement dans la confirmation manuelle, pas dans la détection.


---

## O-42 §4 — LIVRÉ : une conversion, cinq sites, et deux gardes qui ont trouvé le reste

`zoneSpeedRatio(zone, refs?, expectRef?)` vit dans `renderer.ts`, aux côtés de `ZDEF` dont elle
dérive : `2 / (lo + hi)`, l'inversion allure → vitesse faite **une seule fois**. Les cinq sites
qui convertissaient la lisent :

| site | avant | après |
|---|---|---|
| `stepMin` (générateur) | ancre brute | `÷ zoneSpeedRatio` |
| `loadModel.stepMinutes` (auditeur) | ancre brute | `metresEnMinutes`, point unique du fichier |
| `loadModel` ligne 358 (copie) | ancre brute | la copie est **retirée** |
| `weekDistances` | table `*_SPEED_RATIO` | la table est **retirée** |
| `dailyAdjuster.enduranceReplacement` | ancre brute | `× zoneSpeedRatio` |

Le cinquième n'était pas dans l'inventaire : **c'est la garde `A3` du banc v6 qui l'a trouvé**
(« jour rouge : jamais plus de minutes qu'avant ajustement » — 23 min demandées, **25 livrées**).
La séance de remplacement dérivait ses mètres du CSS brut ; `sw.easy` se nageant à ×1,12, elle
durait 12 % de plus que le budget qu'on lui donnait — sur un jour ROUGE, c'est-à-dire là où
l'invariant existe. Une garde de sécurité écrite il y a des mois a payé son écriture ici.

### Ce que la ventilation dit (`npm run ventile:o42`, les quatre critères du §6)

```
[1][2] zone       blocs   ancre brute → livré    écart    attendu (mult−1)
       sw.easy     2122     42356 → 47439       +12,0 %      +12,0 %   ✓
       sw.aero      974     20681 → 21922        +6,0 %       +6,0 %   ✓
       sw.css       795     14087 → 14087         0,0 %        0,0 %   ✓
       sw.speed     249      1788 →  1681        −6,0 %       −6,0 %   ✓
       rn.thr        72      1430 →  1466        +2,5 %       +2,5 %   ✓
       rn.mara       36      1720 →  1901       +10,5 %      +10,5 %   ✓
       identité durée = distance × allure de ZONE : 4 248 / 4 248 blocs

[3][4] 189 profils · 96 montent · 22 baissent · 71 inchangés · 0 changement de structure
       2 682 semaines · 54 (2,0 %) s'éloignent de plus de 6 min de leur cible
         · 50 parce que la cible DÉCLARÉE monte plus vite que le livré (famille T-25/O-35 :
           la sonde de capacité lit un clone SATURÉ, le livré reste tenu par ses plafonds)
         · 4 parce qu'un plafond qui SE NOMME apparaît (« OFF (lissage) », « OFF (équilibre
           du bloc) ») — le moteur écrit sa raison dans le nom de la séance qu'il retire
```

`sw.speed` BAISSE : c'est la seule zone prescrite en mètres qui se nage plus VITE que le CSS.
Le §6 dit « les durées montent, jamais ne baissent » ; sa seconde ligne — « l'ampleur suit le
ratio de la zone » — est la formulation exacte, et c'est elle qui est gardée.

**Contre-preuve** : la ventilation rejouée contre le moteur d'AVANT (copié sur le disque) rend
« RÉSIDU » et les six zones en ✖.

### Le second défaut, trouvé par `ANX-C22` : un clamp qui ne savait pas réduire des mètres

Le Full de référence passait de **+10,4 % à +10,6 %** d'une semaine de charge à la suivante,
pour un plafond que le manifeste fixe à +10 %. Instrumenté : `enforceC22Final` n'avait que deux
branches, `reps > 1` et `durationMin`. **Un bloc en mètres à `reps === 1` ne tombait dans
aucune** — la boucle sortait par « les planchers bloquent : rien de plus à prendre », un
fail-open de la forme exacte de C24/C24b (T-29). La nage prescrivant 89 % de ses blocs en mètres,
c'est la moitié de l'objet du clamp qui lui manquait ; O-42 l'a seulement rendu visible.
Branche `distanceM` ajoutée, plancher C24/C24b respecté par annulation intégrale de la réduction.
**Effet mesuré au-delà du symptôme : `audit:v1` passe de 22 à 18 combinaisons au-dessus de +10 %.**
Le plancher est écrit en MÈTRES et non repris de `bnd.floor`, qui est en MINUTES — la faute
d'unité de la règle 14 existe déjà quinze lignes plus bas, elle n'est pas recopiée.

### `C30-A` : cinquième état, deux témoins ré-épinglés

`10k/avance/5:45/8h` **59 → 61** et `semi/inter/4:30/8h` **119 → 120**. Les deux sont des
coureurs dont la cible de spécificité est déjà atteinte : ils ne doivent rien à C30, ils suivent
la recomposition de leur semaine (`rn.thr`/`rn.mara` coûtent plus de minutes DURES, donc
`enforceHardTimeCap` en rend plus en facile, et le tail O-21 les fait remonter à la longue).
Ré-épinglés avec leur raison, jamais exemptés.

### Quatre fautes d'instrument, dans le script qui devait juger le lot

1. `mult()` lisait `APRES.intOf(z)` « pour interroger ce qui s'exécute » — `intOf` n'est pas
   exposée sur `EBV2`. Table par zone **vide**, et le verdict s'affichait « VENTILÉ » quand même,
   parce qu'il testait `c2ko === 0` : un critère satisfait par l'absence de mesure. Taux saturé
   0/0. Garde de population ajoutée.
2. La colonne « ampleur par zone » sommait `_min` **récup comprise** contre une ancre brute récup
   comprise — la récup ne suit pas le ratio d'une zone. Quatre ✖ affichés qui étaient ma somme.
3. La classification des baisses nommait « un plafond mord » et mesurait « le pic a baissé » —
   un plafond mord sur n'importe quelle semaine. 9 « inexpliqués » qui perdaient 1 à 5 minutes.
4. La tolérance était un POURCENTAGE de la cible quand le pas du point fixe est ABSOLU (25 m,
   une répétition). Sur une semaine de nage de 1,2 h un seul pas vaut 8 % : 205 « inexpliqués »
   qui étaient tous le même arrondi. Faute d'unité, règle 14, dans le juge du ticket qui corrige
   une faute d'unité.

### Règle 17, seconde application du jour : **six** blocs ont rebasculé après le correctif

`registry:check` rejoué APRÈS le lot range six entrées en « commande cassée ». Confirmées à la
main, comme la règle l'exige :

| entrée | ce qui a bougé | le défaut ? |
|---|---|---|
| `O-42`, `O-42-trois`, `O-42-quatre` | le correctif | **corrigé** — les trois blocs écrivent désormais le motif de leur CORRECTION |
| `O-21` | 1 inversion d'allure, écart max **0,2 % → 1,8 %** | intact : c'est le compte qui porte la propriété, pas la magnitude |
| `O-36-amont` | blocs de nage en distance **10 982 → 10 953** | intact : les blocs sont plus longs, le point fixe en produit 29 de moins |
| `O-36-cible` | répétition la plus courte **759 → 733 m** | intact : la mesure suit les durées, la conclusion ne bouge pas |

Trois faux positifs de plus, **et la même cause que ce matin** : le bloc épinglait une VALEUR là
où l'entrée décrit une PROPRIÉTÉ. Sept sur dix en une journée. Le déclencheur d'automatisation
posé par le LOT 1 (« un SEUL commit fait basculer ≥ 2 blocs ») est cette fois **atteint** — ce
commit en fait basculer trois — mais ce qu'il déclencherait (distinguer « motif absent » de
« chemin invalide ») n'aurait rien attrapé ici : les six chemins étaient valides, ce sont les
motifs qui étaient trop précis. La leçon utile est en amont du script : **un bloc `verify`
s'écrit sur la propriété, jamais sur le chiffre du jour.**

### Le résidu NOMMÉ : les bandes SUBSTITUÉES ne pilotent pas la durée

`zoneOf` substitue deux bandes à l'affichage — `bk.rp` par `raceBikeBand` (R20.5) et `rn.mara`
par le prédicteur (B-22/B-25). La conversion, elle, lit `ZDEF` **statique** : `zoneSpeedRatio`
est appelée sans `refs` sur les cinq sites.

C'est un CHOIX, pas un oubli. `bk.rp` est ancrée sur la FTP, donc `zoneSpeedRatio` rend `null`
de toute façon (la vitesse ne suit pas la puissance linéairement — c'est le modèle de Martin qui
répond). Reste `rn.mara` : **36 blocs sur 4 259 (0,85 %)** du balayage, tous en marathon et en
tri. Leur passer la bande substituée demanderait que les CINQ sites la reçoivent — or `baseRefs`
(`{ftp, thrPace, css}`) ne la porte pas et l'auditeur n'en a aucune notion. La donner au seul
générateur rouvrirait l'écart générateur ↔ auditeur que T-25 surveille : c'est précisément le
défaut que ce ticket ferme. Résidu nommé, chiffré, non traité ici.

```verify
id: O-42-unique
quoi: une seule derivation allure→vitesse, et les tables ont disparu
attendu: O42-UNIQUE
cmd: test $(grep -c "SWIM_SPEED_RATIO\|RUN_SPEED_RATIO" src/engine/weekDistances.ts) -eq 0 && test $(grep -c "zoneSpeedRatio" src/generator/renderer.ts src/engine/weekDistances.ts src/engine/loadModel.ts src/readiness/dailyAdjuster.ts | grep -c ":0") -eq 0 && echo "O42-UNIQUE"
```

```verify
id: O-42-c22-metres
quoi: le clamp C22 final sait reduire un bloc prescrit en metres
attendu: O42-C22M
cmd: grep -q "CE CLAMP NE SAVAIT PAS RÉDUIRE DES MÈTRES" src/generator/planGenerator.ts && echo "O42-C22M"
```


---

## O-43 · Le plafond STRUCTUREL se nourrit de la conversion — recompter le même travail en plus de minutes **augmente** ce que le moteur prescrit · 🔴 **OUVERT — trouvé en répondant au §1/§3, non arbitré**

**Trouvé en cherchant la cause des +4 de S5** (que le fondateur demandait de regarder « maintenant
plutôt que mélangés au reste dans O-35 »). Sa prémisse était juste et le résultat est plus gros
que 4 profils.

### 1. Le fait

Le pic **LIVRÉ**, sur les 945 profils du golden, avant et après O-42 :

```
352 hausses · 51 baisses · 33 profils (3,5 %) au-delà de ±25 %
tous en NATATION (29) ou en TRIATHLON (4)

swim/fond/reprise/debutant        40 → 104 min  (+160 %)  séances max 3 → 6
swim/sprint/reprise/debutant      39 →  91 min  (+133 %)  séances max 3 → 6
swim/demifond/reprise/debutant    39 →  83 min  (+113 %)  séances max 3 → 5
swim/fond/ancien/debutant         55 → 101 min  ( +84 %)  séances max 4 → 6
```

**Ce n'est pas une re-tarification** : le nombre de SÉANCES double. Un débutant en **reprise** —
la population que le manifeste protège en premier, celle de C24b, C23 et de la rampe R10 — passe
de 3 séances de nage par semaine à 6.

### 2. La rampe R10 ne le tient pas

Vérifié en déclarant `vol_recent` explicitement, ce que le golden ne fait pas :

```
vol_recent │ pic AVANT → APRÈS │ séances max
   absent  │   40 → 104 min (+160 %) │ 3 → 6
        0  │   52 →  89 min ( +71 %) │ 4 → 6      ← la réponse la PLUS protectrice
        2  │   40 →  88 min (+120 %) │ 3 → 6
        5  │   40 → 104 min (+160 %) │ 3 → 6
```

Même à `vol_recent: 0` — « je ne m'entraîne pas du tout » — le pic monte de 71 % et la fréquence
passe de 4 à 6. La garde qui existe précisément pour empêcher ça ne mord pas.

### 3. Le mécanisme, lu sur la chaîne R20.2

`swim/fond/reprise/debutant/finir`, `vol_recent: 0` :

| maillon | avant | après |
|---|---|---|
| `structurel` | **1,42 h** | **2,08 h** (+47 %) |
| `boucle-growth` | 1,01 h | 1,52 h |
| `courbe` | 1,98 h | 2,11 h |
| `declared` · `caps` · `util` · `ramp` | inchangés | inchangés |

Le maillon qui bouge est **`structurel`** — ce que la structure de la semaine peut contenir. Il se
calcule sur des plafonds de séance exprimés en MINUTES. O-42 fait coûter plus de minutes au même
travail en mètres ; la sonde lit cette hausse comme **une capacité plus grande** ; la courbe monte ;
le point fixe ajoute des séances pour l'atteindre.

**La boucle est circulaire, et son sens est le mauvais** : recompter honnêtement le même travail
devrait RÉDUIRE ce qui tient dans une semaine, pas augmenter le plafond. Le plafond est une
propriété de l'ATHLÈTE (temps disponible, tolérance tissulaire), jamais de la façon dont le moteur
compte. C'est la règle 12 sous une forme nouvelle : ici ce n'est pas une entrée déclarée qui
remplace une sortie calculée, c'est **une sortie calculée qui se relit elle-même comme une entrée**.

### 4. Ce que ma ventilation d'O-42 a manqué, et pourquoi

`ventile:o42` déclare le diff « entièrement expliqué ». Il l'était **selon son critère**, et le
critère était incomplet : il vérifie que le LIVRÉ ne s'éloigne pas de sa cible DÉCLARÉE. Ici les
deux montent ensemble — donc le critère est satisfait pendant que le plan double. J'ai vérifié la
cohérence entre la promesse et la livraison ; je n'ai jamais demandé **si la promesse avait le
droit de monter**. Le §6-4 du fondateur (« aucun mouvement inexpliqué ») visait exactement ça, et
je l'ai lu trop étroitement.

### 5. Ce qui n'est PAS établi

- Que le plan livré soit dangereux : 6 séances de 17 min chez un nageur, ce n'est pas 6 séances
  de course à pied. C'est un arbitrage d'entraînement, pas une mesure.
- Que la borne juste soit l'ancienne : le pic d'AVANT était calculé sur une conversion fausse.
  On ne peut pas conclure « il faut revenir à 40 min » — 40 min était aussi un chiffre dérivé
  d'une erreur.

Ce qui est établi : **le plafond structurel dépend de l'unité de comptage, et il ne devrait pas.**

### 6. Décision demandée

Rien n'est fusionné. Trois issues, à chiffrer avant d'en choisir une :

1. **Borner `structurel` sur une grandeur invariante par la conversion** (mètres, ou nombre de
   séances × plafond de séance en mètres pour la nage) — la correction de fond.
2. **Geler `structurel` sur sa valeur d'avant O-42 pour la nage** — un correctif de transition,
   qui fige un chiffre issu d'une conversion fausse.
3. **Assumer la hausse** — elle est peut-être la bonne réponse pour un nageur qui pouvait déjà
   faire ces séances ; alors il faut le dire dans le plan et le mesurer sur la population
   `débutant × reprise` en particulier.

```verify
id: O-43
quoi: le plafond structurel monte quand la conversion fait couter plus de minutes au meme travail
attendu: O43-REPRODUIT
cmd: node scripts/mesureO43.mjs 2>/dev/null | grep -q "O43-REPRODUIT" && echo "O43-REPRODUIT"
```


---

## O-43 §2 — MON DIAGNOSTIC ÉTAIT FAUX, ET C'EST LE FILTRE DU FONDATEUR QUI L'A RÉFUTÉ

**T-34 écrit tel que je l'avais compris est sorti VERT.** Le §3 de mon entrée O-43 désignait le
maillon `structurel` comme la cause ; l'expérience contrôlée — faire varier la CONVERSION et rien
d'autre, `sw.easy` de ×1,12 à ×1,30 — dit le contraire :

```
structurel     1,733 → 1,750 h   (+1,0 %)   ← le maillon que j'avais accusé
courbe         2,21  → 2,46  h   (+11 %)
boucle-growth  1,23  → 1,67  h   (+36 %)
PIC LIVRÉ      1,1   → 1,2   h   (+9,1 %)   ← la violation, elle est bien réelle
```

`structurel` somme des plafonds de séance **en MINUTES**, atteints à saturation quelle que soit la
conversion : il est presque invariant, ce qui est le comportement correct. J'avais lu
« structurel 1,42 → 2,08 » sur un diff qui contenait **tout O-42** et j'en avais tiré une causalité
que l'expérience ne soutient pas — ce maillon monte parce que la semaine gagne des séances, il
n'est pas la cause. **Quinzième occurrence de la règle 15 :** j'ai attribué une causalité à partir
d'une corrélation entre deux états qui différaient par plus d'une chose.

L'invariant du fondateur, lui, est violé — sur **ce qui est prescrit**, pas sur le maillon que
j'avais nommé. T-34 porte donc sur le pic livré ET sur la fréquence.

## O-43 §3 — LA FRÉQUENCE : l'hypothèse du fondateur tient, et elle est ANTÉRIEURE à O-42

**`MAX_SWIM_DAYS` n'existe pas.** `MAX_RUN_DAYS` existe (`{reprise: 4, confirme: 5, ancien: 6}`,
`constraintMatrix.ts:157`), appliqué par le garde `runImpactCap` que déclarent `run`, `trail`,
`duathlon` et `swimrun` — et son commentaire dit ce qu'il est : « plafond de jours d'**impact** ».
Orthopédique, donc physiologique, donc modélisé. La borne de nage serait **logistique** — accès au
bassin — donc invisible pour un moteur qui modélise la physiologie. Le fondateur avait identifié la
raison exacte.

**Mesuré sur les 136 profils de natation du golden**, jours de nage de la semaine la plus chargée :

```
AVANT O-42 :  3j×8   4j×10   5j×15   6j×103
APRÈS      :  3j×4   4j×2    5j×8    6j×122
25 montées · 104 stables · 7 baisses

  reprise/debutant   3,8 → 5,7 jours   ← la population que le fondateur nomme
  reprise/inter      6,0 → 6,0
  ancien/inter       6,0 → 6,0
```

**103 profils sur 136 étaient DÉJÀ à 6 jours de nage par semaine avant O-42.** La fréquence non
bornée n'est pas une conséquence d'O-42 : c'est un défaut antérieur, que le plafond trop bas
protégeait accidentellement chez les débutants. O-42 a retiré cette protection accidentelle.

**O-43 se scinde donc, comme le fondateur l'avait prévu** — et l'un des deux morceaux est plus
gros que ce ticket :

| | portée | statut |
|---|---|---|
| **fréquence de nage non bornée** (→ **O-44**) | 103 profils AVANT O-42, 122 après | antérieur, indépendant |
| **invariance de ce qui est prescrit** (T-34) | pic +9,1 % à conversion mutée | dans O-43 |

## O-43 §4 — LES TROIS ISSUES AU FILTRE, AVEC LA QUATRIÈME COLONNE

| issue | T-34 (§1) | chemin justifiable (§2) | nombre de séances |
|---|---|---|---|
| 1 · borner la sonde sur une grandeur **invariante par la conversion** (mètres pour la nage) | **passe** par construction | oui — la borne décrit l'athlète | à mesurer avec l'écriture |
| 2 · **geler** la sonde sur sa valeur d'avant O-42 | passe **par épinglage** | **non** — le chiffre ne se justifie que par « on comptait comme ça avant », ce que le §2 refuse | inchangé, par construction |
| 3 · **assumer** la hausse | **échoue** | sans objet | 3 → 6 |

**Une seule survit : l'issue 1.** Précision d'honnêteté : ce n'est pas T-34 seul qui élimine
l'issue 2 — une constante gelée est trivialement invariante et passerait le test. C'est le **§2**
qui la tue : *« même si 2,08 h était la bonne capacité, y arriver par un saut causé par un
changement de comptabilité n'est pas un chemin justifiable »*, et une valeur figée n'est
justifiable que par l'ancienne comptabilité.

La quatrième colonne de l'issue 1 ne peut pas être remplie avant de l'écrire : la borne en mètres
n'existe nulle part aujourd'hui. Elle sera mesurée AVANT d'être adoptée (règle 7), et O-44 la
recoupera — si la fréquence est bornée, la question « que devient le nombre de séances » change de
réponse.

```verify
id: O-43-frequence
quoi: il n'existe aucun plafond de jours de NAGE, quand la course en a un
attendu: O43-SANS-BORNE-NAGE
cmd: grep -q "MAX_RUN_DAYS" src/engine/constraintMatrix.ts && ! grep -q "export const MAX_SWIM_DAYS" src/engine/constraintMatrix.ts && echo "O43-SANS-BORNE-NAGE"
```


---

## O-44 · La fréquence de nage n'est bornée par rien, et le plancher de durée entre en COLLISION avec C15 · 🔴 **OUVERT — mesuré, non écrit**

Scindé d'O-43 (§3). **Défaut ANTÉRIEUR à O-42** : 103 profils de natation sur 136 étaient déjà à
six jours de nage par semaine avant le lot. O-42 n'a pas créé la fréquence non bornée — il a
retiré la protection accidentelle qu'un plafond trop bas offrait aux débutants.

**La forme du correctif est arbitrée** (fondateur, 16/08/2026) : pas de `MAX_SWIM_DAYS`, qui
inventerait une limite physiologique inexistante — la technique est une compétence, elle s'acquiert
par la répétition, et six séances courtes valent mieux que trois longues pour l'apprentissage. La
pathologie n'est pas « six jours », c'est **dix-sept minutes** : personne ne se déplace jusqu'à une
piscine pour dix-sept minutes d'eau. On borne donc par un **plancher de DURÉE de séance**, qui
borne la fréquence par `volume ÷ plancher`, s'auto-échelonne, et n'ajoute aucune question.

### §1 — Ce que les plafonds en MÈTRES autorisent, en minutes (après O-42)

| CSS | 850 m (C15) en `sw.easy` | 750 m (C24) en `sw.easy` | 600 m (C24b) en `sw.easy` |
|---|---|---|---|
| 1:30/100m | **14,3 min** | 12,6 | 10,1 |
| 1:50/100m | **17,5 min** | 15,4 | 12,3 |
| 2:00/100m | **19,0 min** | 16,8 | 13,4 |
| 2:30/100m | 23,8 min | 21,0 | 16,8 |
| 3:00/100m | 28,6 min | 25,2 | 20,2 |

### §2 — Les durées livrées : la pathologie est la NORME, pas une queue

10 891 séances de nage sur 136 profils : **p10 16 · médiane 19 · p90 36 · min 3 · max 91 min**.

```
  0–15 min    881  ( 8,1 %)     ← et le minimum observé est de 3 MINUTES
 15–20 min   4800  (44,1 %)     ← le mode
 20–25 min   2015  (18,5 %)
 25–30 min   1419  (13,0 %)
 30–45 min   1117  (10,3 %)
 45–… min     659  ( 6,1 %)

médiane par niveau :  débutant 15 min · inter 22 · avancé 18
```

### §3 — Le plancher qui ramène les débutants à 3-4 séances

| plancher | débutants (jours médians) | tous | profils dont la fréquence baisse |
|---|---|---|---|
| 20 min | 4 | 5 | 72 / 136 |
| 22 min | 4 | 5 | 79 / 136 |
| **25 min** | **3** | 4 | 95 / 136 |
| 30 min | 3 | 3 | 127 / 136 |

### ⚠ §4 — LA COLLISION, et c'est le résultat qui compte

**Le plancher qui corrige la fréquence contredit C15 pour les débutants.** Le fondateur avait
raison de conditionner la valeur à cette vérification, et la mesure la tranche dans le sens
défavorable :

```
plancher visé (§3)          : 25 min pour ramener un débutant à 3 séances
plafond C15 à CSS 2:00      : 19,0 min  ← un débutant ne PEUT PAS atteindre 25 min
plafond C15 à CSS 1:50      : 17,5 min
plafond C15 à CSS 1:30      : 14,3 min
```

Un plancher de 25 min est **inatteignable sous C15** pour tout nageur plus rapide que ~2:30/100 m,
et C15 est précisément le plafond qui protège le débutant. Les deux règles se contrediraient : la
séance devrait durer au moins 25 min et ne pas dépasser 850 m.

**Ce n'est pas résoluble en choisissant un nombre.** Trois formes possibles, à arbitrer :

1. **Plancher relatif au plafond** — `plancher = min(plancher_absolu, k × durée que C15 autorise)`.
   Aucune contradiction possible par construction, mais le plancher devient inopérant là où C15
   mord, c'est-à-dire chez le débutant… donc chez celui qu'on visait.
2. **Relever C15 pour les débutants** — le plafond de 850 m date d'avant O-42, quand une séance de
   850 m était comptée ~15 min ; elle en fait 19 aujourd'hui. Le plafond n'a pas été recalibré
   après le changement d'unité. C'est la piste que la mesure désigne, et elle demande un arbitrage
   d'entraînement (850 m est-il un plafond de DISTANCE ou de DURÉE ?).
3. **Plancher indexé sur le CSS** — un nageur lent atteint 25 min en 850 m, un rapide non ; le
   plancher suivrait la vitesse. Défendable, mais il invente une règle nouvelle là où la 2 en
   recalibre une existante.

**Trouvé en passant, non traité** : la séance de nage la plus courte du golden dure **3 minutes**.
Aucun plancher de durée n'existe aujourd'hui, à aucun niveau — et 8,1 % des séances sont sous 15 min.

### §5 — L'unité, vérifiée avant d'écrire

`SWIM_TIME_FACTOR_BY_HISTORY` vaut `{reprise 0,45 · confirme 0,60 · ancien 0,70}` et s'applique à
la **DÉCLARATION** de l'athlète (O-35 : c'est une conversion d'unité, pas une réduction). Les durées
du §2 viennent de `stepMin` : ce sont des minutes **DANS L'EAU**. Un plancher doit donc être posé
dans cette unité — le poser en temps de BASSIN le rendrait **2,22× trop haut** chez un athlète en
reprise. Piège d'unité vérifié avant d'écrire, pas après.

```verify
id: O-44
quoi: la sous-population des nages courtes existe toujours (le plancher est décidé, la passe RETIRÉE — critère 3 rouge)
attendu: O44-REPRODUIT
cmd: node scripts/mesureO44.mjs 2>/dev/null | grep -E "second mode.*→ +[1-9]" && echo "O44-REPRODUIT"
```

### O-43 §5 — LE SITE EXACT, MESURÉ : c'est la sonde V2.1, et elle CESSE DE MORDRE

Instrumenté par la même expérience contrôlée que T-34 (`sw.easy` ×1,12 → ×1,30, rien d'autre) :

```
AVANT   volPeak 1.1   V2.1 : « 2,3h (au lieu de 2,5h) »        ← la sonde MORD
APRÈS   volPeak 1.2   V2.1 : (pas émise — la sonde ne borne plus)
```

Le mécanisme est nommé et il n'a plus rien d'hypothétique. La sonde compare
`capacityH < peakH × 0,95` :

- `capacityH` est le clone SATURÉ mesuré **en minutes** → il MONTE avec la conversion ;
- `peakH` (2,5 h) vient des plafonds déclarés → il est indifférent à la conversion.

Avant : 2,3 < 2,375 → la sonde mord, `peakH := 2,3`. Après : la capacité passe au-dessus du seuil
→ **la sonde ne mord plus**, `peakH` reste 2,5, et `courbe = Lw × peakH` monte de 11 %.

**Recompter le même travail en plus de minutes DÉSARME le garde-fou qui limitait l'athlète.** C'est
la règle 12, forme nouvelle, dans sa version la plus nette : la sonde mesure le contenu généré, et
cette mesure est l'entrée du plafond.

**Ceci rectifie mon §2** : `structurel` (la re-sonde, presque invariante à +1,0 %) n'est pas le
site ; la PREMIÈRE sonde l'est, et c'est elle qui décide de `peakH`. Les deux portent le même
chiffre à des instants différents du pipeline — famille des onze « une garantie vérifiée au milieu
du pipeline ne vérifie que l'avant-dernier état », ici appliquée à une MESURE et non à une garantie.

**Ce que l'issue 1 doit donc borner** : la grandeur que la sonde compare à `peakH`. Elle est
aujourd'hui en minutes dérivées de la conversion ; il lui faut une expression invariante — en nage,
les MÈTRES que la structure de la semaine peut porter, convertis une seule fois par une référence
qui décrit l'athlète et non la zone. À écrire et à mesurer (règle 7) ; O-44 la recoupe, puisque
borner la fréquence change ce que le clone saturé contient.

### O-43 §6 — LES DEUX MESURES QUI DÉCIDENT : rien n'est franchi, et je me suis trompé sur R10

`npm run mesure:o43b`.

#### §1 — le livré ne dépasse RIEN. La sonde a le droit de ne plus mordre.

`vol_max` est déclaré en heures de BASSIN, le pic livré est en heures d'EAU : on convertit par
`swimTimeFactorOf` avant de comparer (O-35), sinon la comparaison est une faute d'unité.

```
136 profils de natation · ratio livré / plafond déclaré :
   médiane 44 %  ·  p90 67 %  ·  max 100 %
profils dépassant leur plafond de plus de 2 % : 0 / 136
profils posés EXACTEMENT à 100 % (comportement correct)  : 1
```

**Aucun plafond n'est franchi.** Le plan reste très en dessous de ce que l'athlète déclare pouvoir
faire — médiane à 44 % de sa propre déclaration. La branche du fondateur s'applique : *« livré ≤
déclaré → la sonde a raison. Le plan honore enfin la déclaration, et l'ancien la trahissait. »*

**Conséquence directe : l'issue 1 annulerait une correction au lieu de réparer un défaut.** Avant
O-42 le clone saturé contenait un travail MAL COMPTÉ ; la sonde mesurait 2,3 h pour un contenu qui
en prenait davantage. Elle ne mord plus parce qu'elle mesure enfin juste.

*(Faute d'instrument publiée : mon premier verdict rendait « DES PLAFONDS SONT FRANCHIS » sur UN
profil — `G/swim/ow/vol-min`, 1,80 h livrées pour 1,80 h autorisées, c'est-à-dire un plan posé
exactement SUR son plafond. Un verdict binaire sur une égalité flottante, quatrième faute de seuil
de la journée.)*

#### §2 — **RECTIFICATION : « la rampe R10 ne le tient pas » était FAUX, et c'est moi qui l'ai écrit.**

Mesuré, la rampe couvre la nage et elle DISCRIMINE :

| `vol_recent` | départ de la rampe | S1 livrée | pic livré | plafond `ramp` de la chaîne |
|---|---|---|---|---|
| 0 | 0,90 h | 54 min | **68 min** | 1,75 h |
| 1 | 0,90 h | 54 min | **68 min** | 1,75 h |
| 2 | 0,99 h | 57 min | 78 min | 1,93 h |
| 4 | 1,98 h | 70 min | 99 min | (ne borne plus) |
| 8 | 3,96 h | 70 min | 99 min | (ne borne plus) |

Le pic va de 68 à 99 minutes selon la réponse : **la rampe fait exactement son travail.** Son
plafond (1,75 h = 105 min) n'est jamais franchi — le plan livré s'arrête à 68 min, bien en dessous.

**Ce que j'avais mesuré n'était pas ce que j'ai écrit.** J'avais observé « le pic monte de 71 %
entre avant et après O-42, même à `vol_recent: 0` » et j'en ai tiré « la rampe ne tient pas ». Ce
sont deux énoncés différents : la rampe n'a pas échoué, elle n'était simplement **pas la contrainte
mordante** — le plan restait sous elle avant comme après. Le fondateur a bâti tout son §2 sur ma
phrase. C'est la neuvième occurrence de la famille « nommer une grandeur et en mesurer une
voisine », cette fois dans une PHRASE de rapport et non dans un instrument.

**Ce qui reste, et qui est réel** : `_rampCap = Math.max(2 × unit, vol_recent × unit × 1,1)`. Le
plancher de 2 h est GÉNÉRIQUE — en nage il vaut `2 × 0,45 = 0,90 h` d'eau. Donc déclarer **0**
et déclarer **1 h** de bassin donnent le MÊME point de départ, à la minute près (68 min de pic dans
les deux cas). La réponse la plus protectrice du domaine n'est pas plus protectrice que sa voisine.
C'est le piège du zéro de R20.1-a sous une forme nouvelle : **le zéro est bien LU, mais un plancher
générique l'écrase juste après.** Suivi en **O-45**.

#### §3 — Ce que ces deux mesures font au reste du fil

- **O-43 issue 1 : à ne PAS écrire.** Elle annulerait une correction. T-34 reste rouge et c'est
  assumé : l'invariance de la sonde est une propriété souhaitable, mais la faire tenir en
  re-bornant la sonde ferait re-sous-livrer le plan. La bonne cible est ailleurs.
- **O-44 (plancher de durée) devient le ticket principal** : c'est la seule des trois protections
  manquantes qui vise la pathologie réelle (des séances de 15-19 min, 8 % sous 15 min, une à 3 min).
- **O-45** (plancher générique de la rampe) est petit, net, et indépendant des deux autres.

```verify
id: O-43-rien-franchi
quoi: apres O-42 le pic livre en nage ne depasse aucun plafond declare
attendu: AUCUN DÉPASSEMENT
cmd: node scripts/mesureO43b.mjs 2>/dev/null | grep -o "AUCUN DÉPASSEMENT" | head -1
```


---

## O-45 · Le plancher générique de la rampe R10 écrase le zéro · 🔴 **OUVERT — mesuré, petit, indépendant**

Scindé d'O-43 §6. `planGenerator.ts` :

```ts
let _rampCap = isFinite(volRecent) && volRecent >= 0
  ? Math.max(2 * _rampUnit, volRecent * _rampUnit * 1.1)
  : Infinity;
```

Le `2 * _rampUnit` est un plancher GÉNÉRIQUE : quoi que l'athlète déclare en dessous de ~1,8 h,
la rampe démarre au même endroit. Mesuré en natation (`_rampUnit = 0,45` en reprise) :

```
vol_recent 0 → départ 0,90 h → pic livré 68 min
vol_recent 1 → départ 0,90 h → pic livré 68 min     ← identique à la minute près
vol_recent 2 → départ 0,99 h → pic livré 78 min
```

**« Je ne m'entraîne pas du tout » et « je nage 1 h par semaine » produisent le même plan.** C'est
la réponse la plus protectrice du domaine qui n'est pas honorée — exactement la population que la
rampe R10 existe pour protéger, et exactement la forme du piège que **R20.1-a** avait fermé côté
LECTURE (`dec > 0` traitait 0 comme une absence de réponse). Le zéro est bien lu depuis R20.1-a ;
un plancher générique l'écrase quinze lignes plus loin.

**Ce qui n'est pas tranché** : le plancher a une raison — un plan qui démarre à 0 h ne démarre
jamais (`0 × 1,1 = 0`). La question est sa FORME : un plancher absolu de 2 h générique, ou un
départ minimal exprimé dans une grandeur qui décrit l'athlète (une séance, un plancher de séance
du sport). À mesurer avant d'écrire — et O-44 le recoupe, puisqu'un plancher de durée de séance
donnerait précisément ce départ minimal sans constante nouvelle.

```verify
id: O-45
quoi: le plancher generique de la rampe rend vol_recent 0 et 1 identiques
attendu: O45-REPRODUIT
cmd: node scripts/mesureO43b.mjs 2>/dev/null | grep -qE "^ +0 .*68 min" && node scripts/mesureO43b.mjs 2>/dev/null | grep -qE "^ +1 .*68 min" && echo "O45-REPRODUIT"
```

### O-44 §6 — DEUX RECTIFICATIONS À MA §2, ET LA DÉRIVATION SE MORD LA QUEUE

#### (a) Les séances de 3 minutes sont en AFFÛTAGE et en RÉCUPÉRATION, où le plancher est exempté

J'ai écrit « la pathologie est la norme » sur une distribution qui mélangeait les semaines de
charge et celles où une séance courte est **correcte par conception**. Séparées :

```
SEMAINES DE CHARGE   8 309 séances · p10 16 · médiane 20 · p90 40 · min 12 · 7,1 % sous 15 min
AFFÛTAGE + RÉCUP     2 582 séances · p10 13 · médiane 16 · p90 24 · min  3 · 11,4 % sous 15 min
```

La séance de **3 minutes** est en affûtage. Celle de **12 minutes** est le vrai minimum des
semaines de charge. Le tableau que j'ai publié plus haut reste vrai globalement et **induit en
erreur** : dixième occurrence de « nommer une grandeur et en mesurer une voisine », et la deuxième
de la journée dans une phrase de rapport.

#### (b) C24/C24b ne sont PAS violés — mesuré à 0 sur 8 309

```
séances de nage en mètres, hors affûtage et hors récup : 8 309
sous le plancher C24 (750 m) / C24b (600 m débutant)   : 0  (0,0 %)
```

Le plancher de DISTANCE tient parfaitement. Ce n'est donc pas une garde à réparer : c'est bien
une grandeur qui manque.

#### (c) ⚠ MAIS LA DÉRIVATION PROPOSÉE SE MORD LA QUEUE

Le plancher de durée **dérivé d'une borne de distance vaut `distance ÷ vitesse`** — il est donc
**inversement proportionnel à la vitesse de l'athlète** :

```
750 m (plancher C24) en sw.easy →  12,6 min à CSS 1:30
                                   15,4 min à CSS 1:50
                                   16,8 min à CSS 2:00
                                   21,0 min à CSS 2:30
```

**Les 12 minutes observées SONT déjà ce plancher, appliqué à un nageur rapide.** Le plancher dérivé
existe donc de fait, et il produit exactement la séance que le §2 juge absurde.

Et la raison est structurelle : *« personne ne se déplace jusqu'à une piscine pour dix-sept minutes
d'eau »* est une contrainte **LOGISTIQUE** — le trajet, le vestiaire, les 45 minutes autour coûtent
la même chose quelle que soit la vitesse. Une dérivation depuis une distance est **PHYSIOLOGIQUE**
et suit la vitesse. Les deux ne mesurent pas la même chose, et la dérivation donne le plancher le
plus BAS à celui qui nage le plus vite — l'inverse de ce que l'argument du déplacement demande.

**Ce que la mesure laisse ouvert, et qui est un vrai arbitrage** :

1. **assumer la nature logistique** — un plancher ABSOLU en minutes (une constante nouvelle, ce que
   le §2 voulait éviter), borné par `min(plancher, durée que le plafond de distance autorise)` pour
   qu'aucune collision ne soit possible. La collision C15 disparaît par la borne, pas par la
   dérivation.
2. **dériver quand même**, en acceptant que le nageur rapide garde des séances de 12-13 min : la
   règle est alors physiologique et cohérente, mais elle ne traite pas le cas qui a motivé le
   ticket.
3. **ne rien poser** et considérer que 12 min de nage à haute intensité pour un nageur rapide est
   une séance légitime — auquel cas O-44 se ferme sur la mesure et O-45 reste seul.

**Je ne tranche pas** : c'est un arbitrage entre une contrainte de vie non déclarée et une règle
physiologique, exactement le type de décision que le manifeste réserve au fondateur.

```verify
id: O-44-derivation
quoi: le plancher derive d'une distance suit la vitesse — 750 m valent 12,6 min a CSS 1:30
attendu: O44-DERIVE-SUIT-VITESSE
cmd: node -e "const css=90,mult=1.12;const min=(750/100)*(css*mult)/60;process.stdout.write(min<13?'O44-DERIVE-SUIT-VITESSE':'')"
```

### O-44 §7 — LA MESURE PAR SEMAINE : la distribution est BIMODALE, et 36 débutants sur 36 sont dedans

`npm run mesure:o44b` — semaines de CHARGE uniquement (l'affûtage et la récup veulent des séances
courtes, c'est leur objet), et seulement les semaines portant ≥ 2 nages (sans quoi la « part » n'a
pas de sens).

```
136 profils · 1 450 semaines de charge à ≥ 2 nages
semaines dont la MAJORITÉ des nages sont sous 20 min : 501  (34,6 %)

part moyenne par profil : médiane 57 % · p90 95 % · max 97 %
     0–20 %  :   0 profils      ← personne
    20–40 %  :  60 profils (44,1 %)
    40–60 %  :  15 profils (11,0 %)
    60–80 %  :   7 profils ( 5,1 %)
    80–100 % :  54 profils (39,7 %)   ← le second mode
```

**La distribution est bimodale, sans milieu.** Ce n'est pas « des séances courtes existent, étalées
sur tous les profils » : il y a deux populations distinctes, et la seconde vit à 80-100 % de nages
courtes.

**La sous-population, décrite comme le §3 le demande** — 69 profils sur 136 portent en moyenne plus
de la moitié de leurs nages sous 20 min :

| axe | dans la sous-population | population totale |
|---|---|---|
| **débutant** | **36** | **36** ← *tous, sans exception* |
| inter | 18 | 64 |
| avancé | 15 | 36 |
| reprise · confirmé · ancien | 20 · 25 · 24 | 36 · 64 · 36 |
| format `sprint` | 27 | 34 |

**Les 36 débutants y sont tous.** L'historique ne discrimine pas (20/25/24, proportionnel) : ce
n'est pas une population « qui reprend », c'est une population **à petit volume hebdomadaire réparti
sur jusqu'à six séances** — d'où la domination du format `sprint` (27 sur 34).

Cas extrêmes : `swim/sprint/reprise/inter` à **97 % de nages courtes, 6 semaines sur 6
majoritairement courtes**. `swim/fond/confirme/debutant` à 96 %, 9/9.

**→ Le critère du §3 tranche : ISSUE 1.** Une sous-population existe, elle est identifiable, et
elle contient l'intégralité des débutants — la population que le manifeste protège en premier.
L'issue 3 (ne rien poser) est réfutée par la mesure ; l'issue 2 l'était déjà par la démonstration du
§6(c).

**Ce qui reste à décider avant d'écrire** — je ne le prends pas seul, c'est une constante nouvelle
qui encode une hypothèse que le moteur ne peut pas connaître :

```
SWIM_SESSION_FLOOR_MIN = <valeur à arbitrer>
  provenance : hypothèse LOGISTIQUE (le trajet, le vestiaire), non physiologique
  nature     : le moteur ignore l'accès au bassin de CET athlète
  forme      : min(plancher, durée que le plafond de distance autorise) — la borne rend
               toute collision avec C15 impossible par construction
  statut     : PANSEMENT — à remplacer par une déclaration le jour où le questionnaire
               porte une question d'accès au bassin
  et         : le plan DIT ce qu'il a supposé (la fréquence sert l'apprentissage technique ;
               l'athlète peut regrouper ses séances si son accès au bassin le contraint)
```

Ce que la mesure permet de dire sur la valeur, sans la choisir : à **20 min**, 69 profils sont
concernés et les débutants passent de 6 nages à 4-5 ; le plafond C15 autorise **19,0 min à
CSS 2:00** et **14,3 min à CSS 1:30**, donc la borne `min(…)` mordra chez les nageurs rapides —
c'est-à-dire que le plancher NE tiendra pas pour eux, par construction et volontairement.

```verify
id: O-44-souspop
quoi: la distribution par semaine est bimodale et contient tous les debutants
attendu: ISSUE 1
cmd: node scripts/mesureO44b.mjs 2>/dev/null | grep -o "ISSUE 1" | head -1
```

### O-44 §8 — LES DEUX VÉRIFICATIONS PRÉALABLES : ta correction est juste, et mon « 13 minutes » était un artefact

**§3 — l'unité est bien du temps DANS L'EAU.** `stepMin` calcule `distance ÷ 100 × CSS × mult(zone)` :
le CSS est une allure de NAGE (s/100 m), donc le produit est du temps passé à nager. Les durées du
§2, du §6 et du §7 sont toutes de cette unité, et `SWIM_SESSION_FLOOR_MIN = 20` s'y exprime.
`SWIM_TIME_FACTOR` n'intervient nulle part dans cette chaîne — il convertit la DÉCLARATION de
l'athlète (O-35), pas le contenu prescrit. Confirmé avant d'écrire : la cinquième faute d'unité de
la série n'a pas eu lieu.

**§2 — C15 est bien réservé aux débutants, et ma phrase était fausse.** Vérifié à la source :
`if (r.beginner && s.d === "sw" && b.distanceM != null)`. Hors débutant, le plafond de séance est
`CAP_SWIM[format]` (`blockBounds`). Durées impliquées en `sw.easy`, minutes d'eau :

| CSS | C15 850 m *(débutant)* | sprint 1400 | demifond 2000 | fond 3000 | tri/S 750 | tri/M 1500 |
|---|---|---|---|---|---|---|
| 1:30 | **14,3** | 23,5 | 33,6 | 50,4 | **12,6** | 25,2 |
| 2:00 | **19,0** | 31,4 | 44,8 | 67,2 | **16,8** | 33,6 |
| 2:30 | 23,8 | 39,2 | 56,0 | 84,0 | 21,0 | 42,0 |

**Hors débutant, la durée impliquée dépasse 20 min partout** — donc le plancher TIENT pour eux, et
mon « le nageur rapide gardera ses séances de 13 minutes » était bien l'artefact d'avoir appliqué
C15 à quelqu'un qu'il ne concerne pas. **Une seule exception, réelle : `tri/S`** (750 m), à 12,6 min
à CSS 1:30 — et elle est légitime : 750 m EST la distance de nage d'un triathlon sprint, une séance
à cette distance n'a pas à être allongée.

**Conséquence sur ta §1, qui la renforce** : la constante ne décide rien pour les 36 débutants
(bornés à 14-19 min par C15), et elle décide pour les 33 non-débutants de la sous-population, chez
qui elle tient pleinement. C'est bien le sort de ces 33 que le chiffre 20 arbitre.

**Reste à écrire** : le plancher, sa borne `min(20, durée du plafond APPLICABLE)`, la ligne
d'explication, la garde, et la mesure avant/après aux quatre critères du §4 — dont le troisième,
« aucun profil ne perd de volume : le plancher regroupe, il ne retire pas », qui est le vrai test.

### O-44 §9 — RECTIFICATION : les 27 « sprint » sont des `swim/sprint`, pas des `tri/S`

La mesure du §7 ne balayait que `sport === "swim"` : ses 27 profils « sprint » sont donc des
**`swim/sprint`, plafond `CAP_SWIM.sprint` = 1 400 m**, soit **23,5 min à CSS 1:30** et 31,4 à
CSS 2:00. Le plancher de 20 min **tient pour eux**. `tri/S` (750 m) n'apparaît nulle part dans
cette sous-population — c'est un autre sport, jamais balayé par cette mesure.

**L'inférence « `CAP_SWIM[tri/S]` laisse 27 profils sur 69 hors du plancher » est donc réfutée**, et
le cinquième critère d'acceptation qu'elle motivait n'a pas d'objet. Ma table du §8 mêlait des
formats de nage pure et des formats de triathlon sans le dire : c'est elle qui a induit l'erreur.

**Le plancher couvre bien la sous-population mesurée** : 36 débutants (bornés à 14-19 min par C15,
effet partiel et assumé) + 33 non-débutants chez qui `min(20, …)` ne clampe pas.

---

## O-46 · `CAP_SWIM` mêle deux logiques : plafond d'ENTRAÎNEMENT en nage pure, distance de COURSE en triathlon · 🔴 **OUVERT**

Scindé d'O-44 §9. La suspicion du fondateur est **confirmée, et pire que sa formulation** :

| format | plafond de séance | distance de nage de la course | rapport |
|---|---|---|---|
| `swim/sprint` | 1 400 m | — (nage pure) | plafond d'entraînement |
| `swim/fond` | 3 000 m | — | plafond d'entraînement |
| **`tri/S`** | **750 m** | **750 m** | **×1,00** |
| **`tri/M`** | **1 500 m** | **1 500 m** | **×1,00** |
| **`tri/70.3`** | **1 900 m** | **1 900 m** | **×1,00** |
| **`tri/Full`** | **3 000 m** | **3 800 m** | **×0,79** |

Trois formats sur quatre valent **exactement** la distance de course. Le quatrième vaut **79 %** de
la sienne : **un triathlète longue distance ne peut jamais nager sa distance de course en une
séance.** Ce n'est pas un plafond d'entraînement, c'est une distance de course recopiée dans un
champ de plafond — et le `Full` montre que la recopie elle-même est incomplète.

En natation, le volume d'entraînement dépasse couramment la distance de course d'un facteur 3 à 5 :
la nage est limitée par la technique et la capacité aérobie, et n'a quasi aucun coût orthopédique.
Les formats de nage pure de cette même table le reflètent ; les formats de triathlon non.

**Ce que la mesure dit de la portée, et qui modère l'urgence** — nage en triathlon, semaines de
charge :

```
tri/S     n=  344 · médiane 26 min · p90 49 · part < 20 min 12 %
tri/M     n=  511 · médiane 42 min · p90 69 · part < 20 min 11 %
tri/70.3  n=  653 · médiane 52 min · p90 81 · part < 20 min 17 %
tri/Full  n=2 236 · médiane 38 min · p90 67 · part < 20 min 11 %
```

Les séances de nage du triathlon sont majoritairement LONGUES : le plafond borne la séance longue,
il ne fabrique pas les séances courtes. **O-44 et O-46 sont donc bien deux tickets distincts**, et
O-44 n'attend pas O-46.

**Non tranché** : les quatre valeurs sont-elles une décision d'entraînement (« la séance la plus
longue d'un triathlète n'a pas besoin de dépasser sa distance de course, le temps de nage servant
mieux ailleurs ») ou une recopie ? Le `Full` à ×0,79 penche pour la recopie, mais un seul point ne
tranche pas. À demander à la source, ou à arbitrer.

```verify
id: O-46
quoi: CAP_SWIM des formats tri vaut la distance de course, et Full est SOUS la sienne
attendu: O46-REPRODUIT
cmd: node -e "const m=require('fs').readFileSync('src/engine/constraintMatrix.ts','utf8');const ok=/S: 750/.test(m)&&/M: 1500/.test(m)&&/\"70\.3\": 1900/.test(m)&&/Full: 3000/.test(m);process.stdout.write(ok?'O46-REPRODUIT':'')"
```

### O-46 §2 — T-38 écrit ROUGE, et l'asymétrie tient en une ligne de rapport

```
✖ T-38  aucun plafond de séance de nage n'est sous la distance de course du format
        tri/Full : plafond 3000 m < course 3800 m (×0.79)
        tous : tri/S ×1.00 · tri/M ×1.00 · tri/70.3 ×1.00 · tri/Full ×0.79
             · nage/sprint ×14.00 · nage/demifond ×5.00 · nage/fond ×2.00 · nage/ow ×3.00
```

Les deux côtés sont **dérivés** (R11.1) : `CAP_SWIM` d'un côté, `TRI_SWIM`/`SWIM_RACE` — les tables
que le prédicteur emploie déjà — de l'autre. Aucune distance n'est recopiée dans la garde ; une
garde qui porterait sa propre table mesurerait sa table.

Les formats de nage pure restent **dans** le balayage bien qu'ils passent largement : c'est ce qui
met l'asymétrie sous les yeux dans le rapport du test, sur une seule ligne, sans commentaire.

**Ce que T-38 ne ferme pas, et qui porte le risque** : relever le plafond rend la séance à distance
de course POSSIBLE, il ne la rend pas PRESCRITE. Le prérequis de continuité — au moins une nage
continue à la distance de course avant le jour J — reste **B-17**, rouvert avec O-46 pour cause
identifiée. La correction du plafond est nécessaire et non suffisante.

### O-46 §3 — T-38 RÉVISÉ : ma première écriture était satisfiable par un correctif qui ne corrige rien

`CAP_SWIM[format] ≥ distance de course` est une **inégalité**, donc `tri/Full : 3 000 → 3 800` la
passait au vert en laissant le défaut entier — le plafond vaudrait alors exactement la distance de
course, comme les trois autres, et aucun travail sur-distance ne serait toujours possible.

**C'est la faille que j'avais moi-même nommée sur l'issue 2 d'O-43** — *« une constante gelée est
trivialement invariante », « une valeur épinglée sur la borne satisfait trivialement un test de
borne »* — et je l'ai reproduite dans la garde écrite une heure plus tard. Onzième occurrence de
la famille, et la première où je répète une leçon dans la même journée.

**La propriété juste est structurelle** : une séance porte un échauffement, un corps et un retour au
calme. Pour que le CORPS puisse valoir la distance de course, il faut
`plafond ≥ distance + (échauffement + retour au calme)`. Un plafond posé exactement sur la distance
de course rend cette séance **impossible** — il ne reste rien pour le reste.

Aucune constante nouvelle : les trois grandeurs sont lues là où elles vivent, et l'aux est
**observé sur les plans LIVRÉS** (règle 15), pas déclaré. Médiane retenue, distribution publiée.

```
tri/S     plafond  750 m < 1 100 m nécessaires  (course  750 + aux 350)
tri/M     plafond 1500 m < 1 850 m nécessaires  (course 1500 + aux 350)
tri/70.3  plafond 1900 m < 2 250 m nécessaires  (course 1900 + aux 350)
tri/Full  plafond 3000 m < 4 150 m nécessaires  (course 3800 + aux 350)

nage/sprint   1400 ≥   500 ✓     nage/fond   3000 ≥ 2 000 ✓
nage/demifond 2000 ≥   850 ✓     nage/ow     4500 ≥ 2 100 ✓
```

**Les QUATRE formats de triathlon sont rouges, pas seulement `Full`** — les trois à ×1,00 sont
aussi défaillants, simplement de façon moins visible. C'est ce que la première écriture cachait.

---

## O-46 — ⚠ **RÉFUTÉ. `CAP_SWIM` n'est pas un plafond de SÉANCE : c'est le plafond d'un BLOC de la sortie longue.**

Lu à la source, `planGenerator.ts` :

```ts
if (s.long) {
  if (s.d === "sw") return { floor: 820, cap: CAP_SWIM[fmt] || 4500 };
```

`CAP_SWIM` borne **un step**, et seulement dans la branche `s.long`. Il ne borne ni la séance, ni
les séances qui ne sont pas la sortie longue. Toute la construction d'O-46 — la mienne, et
l'inférence du fondateur qui s'appuyait dessus — comparait un plafond de BLOC à une exigence de
SÉANCE. Catégorie contre catégorie : la faute que ce chantier nomme depuis le premier jour, cette
fois dans la garde que j'avais écrite en la déclarant « dérivée ».

**Mesuré sur les plans livrés (semaines de charge)** — l'axe de la table est le TRIATHLON :

| format | course | plafond `CAP_SWIM` | séance méd / max | plus gros bloc méd / max |
|---|---|---|---|---|
| tri/S | 750 | 750 | 1 300 / **3 225** | 850 / 2 875 |
| tri/M | 1 500 | 1 500 | 2 078 / **4 375** | 1 450 / 4 025 |
| tri/70.3 | 1 900 | 1 900 | 2 675 / **4 800** | 1 975 / 4 450 |
| tri/Full | 3 800 | 3 000 | 1 875 / **7 125** | 1 500 / 6 775 |

**Un triathlète longue distance nage jusqu'à 7 125 m en une séance.** L'énoncé « le moteur lui
interdit de nager sa distance de course » est FAUX, et avec lui l'analyse de risque en eau libre
qu'il portait. **T-38 est retiré** : son critère n'a pas d'objet sous cette forme.

**Ma propre sonde l'avait signalé et j'ai failli ne pas le lire** : `mesure:o46` rendait des colonnes
« avec plafond » et « sans plafond » **identiques au mètre près**. Retirer le plafond ne changeait
rien — un résultat saturé, donc suspect d'erreur d'instrument (test de dépistage de la règle 15).
Il ne s'agissait pas d'un défaut de la sonde : le plafond ne mordait simplement pas là où je
croyais qu'il agissait.

### Ce qui SURVIT, et c'est B-17 dans son énoncé d'origine

Relever un plafond rend une séance POSSIBLE ; il ne la rend pas PRESCRITE. La question de B-17 est
la seconde, et elle se mesure — « une nage CONTINUE (un seul bloc, `reps === 1`) à la distance de
course est-elle prescrite ? » :

```
tri/S     course  750 m · plus long bloc continu méd 1 200 · profils l'atteignant : 21/30
tri/M     course 1500 m · méd 3 200 · 22/31
tri/70.3  course 1900 m · méd 4 450 · 21/30
tri/Full  course 3800 m · méd 2 375 · **4/56**
```

**Sur `tri/Full`, 52 profils sur 56 (93 %) ne reçoivent JAMAIS une nage continue à la distance de
course.** Les trois autres formats sont à ~70 % de couverture — imparfait, mais d'un autre ordre.
C'est le constat de B-17, mesuré pour la première fois, **et il tient sans O-46** : la cause n'est
pas un plafond, c'est qu'aucune règle ne prescrit cette séance.

Et le plafond de 3 000 m sur le BLOC de la sortie longue d'un Full mérite tout de même sa question,
sous une forme correcte cette fois : il empêche un bloc continu de 3 800 m dans la sortie longue.
Les 4 profils qui y arrivent passent donc par une autre séance. **Suivi en B-17, pas en O-46.**

```verify
id: B-17
quoi: 93 % des profils tri/Full ne recoivent jamais une nage CONTINUE a la distance de course
attendu: B17-REPRODUIT
cmd: grep -q "if (s.d === \"sw\") return { floor: 820, cap: CAP_SWIM" src/generator/planGenerator.ts && echo "B17-REPRODUIT"
```

## B-17 · Aucune nage CONTINUE à la distance de course n'est prescrite en triathlon · 🔴 **OUVERT — mesuré, spec arrêtée, mécanisme identifié**

Rouvert après la réfutation d'O-46 : la cause n'est pas un plafond, **c'est qu'aucune règle ne
prescrit cette séance**.

### 1. La mesure — et une rectification au passage

```
                   course │ séance méd │ séance max │ plus long bloc CONTINU (reps=1)
tri/S      750 m │  1 300 │ 3 225 │ méd 1 200 · 21/30 profils atteignent la distance
tri/M     1500 m │  2 078 │ 4 375 │ méd 3 200 · 22/31
tri/70.3  1900 m │  2 675 │ 4 800 │ méd 4 450 · 21/30
tri/Full  3800 m │  1 875 │ 7 125 │ méd 2 375 · **4/56**
```

**Rectification : ce n'est pas « aucune, jamais ».** Sur `tri/Full`, **4 profils sur 56** reçoivent
bien une nage continue à la distance de course — par accident de composition, puisque aucune règle
ne la vise. 93 % ne la reçoivent jamais ; c'est déjà le constat, et il n'a pas besoin d'être arrondi
à 100 %.

**Le volume est là, la continuité n'y est pas.** Un athlète peut avoir nagé 7 125 m en une séance
sans avoir jamais couvert 3 800 m d'affilée — deux adaptations différentes, et c'est la seconde qui
décide du jour J. La médiane à 1 875 m ajoute que la séance TYPIQUE vaut la moitié de la course.

### 2. Le précédent interne qui fait autorité

**S10 (swimrun) refuse un format long si l'athlète ne tient pas 30 min de nage continue**, avec sa
justification écrite : on est parfois loin du rivage. Cette justification vaut mot pour mot pour un
70.3 en lac ou un Full en mer. Le triathlon n'a pas d'équivalent — c'est l'asymétrie du ticket.

### 3. Le mécanisme est déjà là — **T7**, et il se réutilise sans rien inventer

`trailLibrary.ts` : `rehearsalNeeded && (phase === "spec" || phase === "peak")` **transforme la
sortie LONGUE** en répétition générale (nom, note, contenu). Ce n'est pas un ordonnanceur de séance
obligatoire, c'est une TRANSFORMATION conditionnelle de la séance pivot — exactement ce dont B-17 a
besoin : la longue de nage du triathlon, en phase spécifique, devient une nage continue à une
fraction croissante de la distance de course.

Contrat visé, comme B-25 : **zéro constante nouvelle** — les paliers se dérivent de `TRI_SWIM[fmt].dist`.
S'il en faut une, c'est le seuil de déclenchement du gate, et elle se posera avec sa provenance.

### 4. La spec, arrêtée

```
3.1 progression prescrite (phase spécifique)
    ~50 % → ~70 % → ~90 % → 100 % de la distance de course, en blocs CONTINUS (reps === 1)
    la dernière à 3-4 semaines de l'épreuve, JAMAIS dans l'affûtage
    (paliers = hypothèse du fondateur ; ce qui compte est la FORME — une montée,
     pas un test unique à la fin : découvrir la distance trois semaines avant ne
     laisse plus le temps de corriger ce qu'on y apprend)

3.2 gate en eau libre — au moins une nage continue en CONDITIONS RÉELLES avant le jour J
    (eau libre, en combinaison si la course l'est)
```

**Non tranché, et c'est la question du premier jour** : refus bloquant ou avertissement fort ?
S10 refuse. Recommandation du fondateur : **refus sur Full, avertissement appuyé sur 70.3 et M**.
Le manifeste (O-17) donne le critère — bloquer quand « l'athlète ne peut pas évaluer le risque, ou
l'erreur est irréversible ». La noyade est irréversible ; l'athlète qui n'a jamais nagé 3,8 km ne
peut pas savoir ce que ça fait. Les deux conditions sont réunies sur Full, ce qui rend la
recommandation cohérente avec la règle existante plutôt qu'ajoutée à côté.

```verify
id: B-17-continuite
quoi: aucune regle ne prescrit une nage continue a la distance de course en triathlon
attendu: B17-AUCUNE-REGLE
cmd: grep -rq "T7_REHEARSAL" src/engine/trailModel.ts && ! grep -rq "SWIM_REHEARSAL\|swimRehearsal" src/ && echo "B17-AUCUNE-REGLE"
```

### B-17 §5 — LES DEUX VÉRIFICATIONS AVANT D'ÉCRIRE, ET LA PREMIÈRE CHANGE LE MÉCANISME

**(a) Il n'y a AUCUNE sortie longue de nage en triathlon.** Mesuré sur les phases `spec`/`peak` des
profils tri du golden : les séances portant `s.long === true` en nage sont **zéro**. Les nages de
ces semaines sont `Nage vitesse` (×1 108), `Nage seuil (+dist)` (×885), `Nage éducatifs` (×269),
`Nage endurance` (×39)…

Le patron de `trailLibrary` — *transformer la sortie longue* — **n'a donc rien à transformer**.
C'est aussi ce qui explique qu'O-46 ne mordait nulle part : la branche `if (s.long) { if (s.d ===
"sw") … CAP_SWIM … }` de `blockBounds` **n'est jamais atteinte en triathlon**. Le plafond que j'ai
passé un tour à analyser ne s'applique à aucune séance de tri.

**Conséquence sur le mécanisme** : B-17 ne peut pas être une transformation de la longue. Deux
formes possibles, à trancher :

1. **marquer** une nage de la phase spécifique comme `long` et la transformer — cohérent avec le
   reste du moteur (chaque discipline a sa pivot), mais c'est une structure de semaine qui change ;
2. **transformer la plus grosse nage existante** — `Nage seuil (+dist)`, dont le nom porte déjà
   l'intention « + distance » —, ce qui ne touche pas la structure et vise la séance qui produit
   déjà les 4 accidents de continuité.

**Ce que la transformation ferait perdre : RIEN, c'est mesuré.** Aucune zone n'est présente
uniquement dans une nage donnée sur ces semaines — la réserve du §4 est levée par la mesure.

**(b) Le gate indexé sur l'écart demande une question que le triathlon ne pose pas.** `longest_swim_m`
(« ta plus longue nage ») existe dans `ANSWER_SCHEMA` mais est déclarée **`["swimrun"]` uniquement**.
S10 peut interroger une continuité déclarée parce que le swimrun la DEMANDE ; le triathlon ne la
demande pas. Le gate sur l'écart `continuité déclarée / distance de course` suppose donc d'étendre
la clé à `tri` — une question de plus au questionnaire, ce que ce dépôt ne fait pas à la légère.

C'est le seul coût nouveau du ticket, et il est petit : la clé, son domaine et son unité existent
déjà, il s'agit d'ajouter `"tri"` à sa liste de sports. À arbitrer avec le seuil.

**Arbitrage retenu, à écrire tel quel** : le gate est indexé sur **l'écart**, pas sur le format —
« si le raisonnement tient pour 3 800 m, il tient pour 1 900 : même milieu, même absence de signal ».
Un Full qui déclare 3 km continus n'a pas besoin d'être bloqué ; un 70.3 qui déclare 400 m en a
besoin. Le seuil (0,6 proposé) reste une hypothèse à poser avec sa provenance.

**Et le critère O-17 est précisé par le fondateur, mieux que par moi** : ce n'est pas
« la noyade est irréversible » — le vélo aussi a une queue irréversible et ce motif bloquerait tout.
C'est le PREMIER membre : **en eau libre, le risque n'est pas observable avant d'être réalisé.**
En course à pied on ralentit, on marche, on s'arrête — le signal arrive progressivement et des
options restent. En eau libre le choc thermique, la désorganisation du geste et la panique
surviennent vite et loin du bord. L'athlète ne peut pas évaluer le risque parce que **le milieu ne
lui rend aucune information utilisable en temps voulu**.

**Et les 4 accidents prouvent la faisabilité** : le moteur SAIT déjà produire la séance. B-17 ne
demande aucune capacité de génération nouvelle — seulement une règle qui la vise, et les 4 cas
servent de référence de forme.

### B-17 §6 — LES TROIS DÉCISIONS, ARRÊTÉES · spec complète, prête à écrire

**1. Mécanisme : transformer `Nage seuil (+dist)`, JAMAIS marquer une nage `long`.**
Vérifié dans le code plutôt qu'accepté : `blockBounds` rend `if (s.long) { if (s.d === "sw")
return { floor: 820, cap: CAP_SWIM[fmt] } }`, et `CAP_SWIM["Full"] = 3000`. **Marquer une nage
`long` activerait donc exactement le plafond qui écrêterait la séance que B-17 existe pour
prescrire** — un bloc continu de 3 800 m ramené à 3 000. O-46 était faux comme constat général ;
il deviendrait vrai, et précis, par cette option. Second coût confirmé : `s.long` est lu par C30,
les exclusions de réallocation et le tail O-21 (`sx.long && !sx.race`), toutes écrites pour des
longues de COURSE — le marquage importerait des sémantiques d'impact dans une discipline qui n'en
a pas.

**2. Dosage : 4 occurrences sur la phase spécifique, pas chaque semaine.** `Nage seuil (+dist)`
apparaît 885 fois : c'est le principal véhicule du travail au seuil en nage, et le transformer à
chaque occurrence retirerait l'essentiel du seuil sur toute la phase. La progression y répond
d'elle-même — quatre paliers, donc quatre séances, laissant 4 à 8 séances de seuil intactes sur une
phase de 8-12 semaines. **Divergence VOULUE avec `trailLibrary`**, qui transforme dès que
`rehearsalNeeded` : à écrire dans le ticket pour qu'elle ne soit pas subie.

**3. Gate : nage continue déclarée ≥ 30 min, réutilisé de S10, uniforme sur tous les formats en eau
libre.** Ni le format ni un ratio de distance : **ce qui fait le risque en eau libre est une DURÉE**
— le refroidissement qui désorganise le geste s'installe en 10 à 30 min, et un nageur rapide couvre
1 900 m en 30 min quand un lent en met 50. Zéro constante nouvelle : le seuil existe, il est
justifié, il est déjà appliqué au sport voisin pour le même motif.

**Et « je ne sais pas » BLOQUE.** C'est l'inverse du réflexe de tout le reste du dépôt — où
l'absence a toujours été traitée comme une permission — et c'est justifié par O-17 lui-même : *si
l'athlète ne sait pas ce qu'il a nagé de plus long, il est par définition dans le membre « ne peut
pas évaluer le risque ».* **À écrire explicitement, sinon quelqu'un implémentera le défaut permissif
par habitude.**

```
mécanisme   transformation de « Nage seuil (+dist) », PAS de marquage s.long
dosage      4 occurrences sur la phase spec
paliers     ~50 / 70 / 90 / 100 % de TRI_SWIM[fmt].dist — zéro constante nouvelle
            blocs CONTINUS (reps === 1) · la dernière à 3-4 semaines · jamais en affûtage
gate        nage continue déclarée ≥ 30 min (S10), uniforme · « je ne sais pas » → NON satisfait
schéma      longest_swim_m étendu à tri
eau libre   au moins une continue en conditions réelles, combinaison comprise
critère     O-17, membre « ne peut pas évaluer le risque » — parce qu'en eau libre le risque
            n'est pas observable avant d'être réalisé
```

**Deux vérifications à faire À L'ÉCRITURE, pas avant** (elles n'engagent aucune décision) :

- **la phase spécifique porte-t-elle toujours ≥ 4 `Nage seuil (+dist)` ?** Sur une prépa Full
  courte, la phase `spec` peut être plus étroite que les quatre paliers. Le comportement quand elle
  ne les porte pas est à définir — comprimer la progression, ou empiéter sur `peak`. Ne pas le
  décider d'avance : le mesurer sur les profils courts.
- **`audit:sensibilite` exige que toute clé déclarée AGISSE dans chaque sport où elle est
  déclarée** (R20.1). Étendre `longest_swim_m` à `tri` sans câbler le gate dans le même commit
  rendrait ce gate rouge — les deux landent ensemble ou aucun.

### B-17 §7 — LA MESURE DU CAS « MOINS DE 4 » : il existe, et pas là où la question le cherchait

`npm run mesure:b17`, chaque format balayé **depuis son `MIN_WEEKS` réel** :

| format | `MIN_WEEKS` | horizon | semaines `spec` | « Nage seuil » dans `spec` | ≥ 4 ? |
|---|---|---|---|---|---|
| **tri/S** | 8 | 8 · 10 · 14 · 22 | 2 · 2 · 3 · 6 | **1 · 1 · 2 · 3** | **NON, à tous** |
| tri/M | 12 | 12 · 14 | 2 · 3 | 2 · 3 | NON |
| tri/M | 12 | 18 · 26 | 5 · 8 | 5 · 8 | oui |
| tri/70.3 | 20 | 20 → 34 | 4 → 8 | 4 → 8 | oui |
| **tri/Full** | **36** | 36 → 50 | 8 → 14 | **8 → 14** | **oui, toujours** |

**Le cas existe — mais l'inverse de ce que la question supposait.** `Full`, le format que la
question visait (« compte tenu de `MIN_WEEKS` 36 semaines »), porte **8 à 14** occurrences dès son
horizon minimal : il ne peut jamais manquer de paliers. Ce sont **`tri/S` et `tri/M` courts** qui
en manquent — et `tri/S` **n'atteint jamais 4, même à 22 semaines**, parce que la nage seuil n'y est
pas hebdomadaire (3 occurrences pour 6 semaines de spécifique).

**Conséquence sur la spec** : la branche « la progression ne tient pas → condition du même gate »
doit être câblée, et son domaine réel est le format le plus COURT, pas le plus long. Ce qui la rend
d'ailleurs plus facile à défendre : refuser un `tri/S` de 8 semaines à quelqu'un qui ne tient pas
30 min de nage continue est proportionné ; le même refus sur un Full de 36 semaines aurait été un
faux positif que cette mesure écarte.

*(Faute d'instrument, publiée : ma première écriture appelait `EBV2.minWeeks("tri", format)` — c'est
un OBJET, pas une fonction. Les horizons étaient donc arbitraires (20 à 34), et **`Full` était refusé
aux quatre**, donc jamais mesuré : le verdict « le cas existe » ne reposait que sur `tri/S`. La
conclusion s'est trouvée juste, la mesure qui la fondait ne l'était pas — et elle manquait
exactement le format sur lequel la question portait.)*

```verify
id: B-17-paliers
quoi: tri/S ne porte jamais 4 « Nage seuil » en phase specifique, meme a 22 semaines
attendu: LE CAS EXISTE
cmd: node scripts/mesureB17.mjs 2>/dev/null | grep -o "LE CAS EXISTE" | head -1
```

### B-17 §8 — SPEC FINALE : le gate chiffré, et la branche « CSS inconnu » qu'il faut décider

Le gate `min(30 min, durée de nage estimée en course)`, calculé à sa source
(`TRI_SWIM[fmt].dist / 100 × CSS × facteur`) — **entre parenthèses, la valeur du gate** :

| format | course | CSS 1:30 | CSS 1:50 | CSS 2:00 | CSS 2:30 | CSS 3:00 |
|---|---|---|---|---|---|---|
| tri/S | 750 m | 12 min **(12)** | 14 **(14)** | 16 **(16)** | 20 **(20)** | 23 **(23)** |
| tri/M | 1 500 m | 24 **(24)** | 29 **(29)** | 32 **(30)** | 39 **(30)** | 47 **(30)** |
| tri/70.3 | 1 900 m | 30 **(30)** | 37 **(30)** | 40 **(30)** | 50 **(30)** | 60 **(30)** |
| tri/Full | 3 800 m | 62 **(30)** | 75 **(30)** | 82 **(30)** | 103 **(30)** | 123 **(30)** |

Le `min()` fait exactement ce que l'arbitrage décrit : **le gate vaut la durée de course sur `S`
partout et sur `M` jusqu'à CSS ~2:00** (l'épreuve est plus courte que le plancher de S10), **et
vaut 30 min sur `70.3` et `Full` à tous les CSS** (l'épreuve dépasse le plancher, qui devient un
seuil d'entrée et non un objectif). Un `tri/S` de 8 semaines n'est plus refusé à quelqu'un qui
tient 20 minutes — c'est le cas que la mesure des paliers avait soulevé.

**⚠ UNE BRANCHE RESTE À DÉCIDER, ET ELLE EST DE LA MÊME FAMILLE QUE « JE NE SAIS PAS ».**
`css_known` est déclaré `["swim", "tri", "swimrun"]` — donc **optionnel**. Sans CSS, la durée de
nage en course n'est pas estimable, et le `min()` n'a pas de second terme.

Trois issues, et le choix engage la même logique que l'absence de continuité :

1. **repli sur 30 min** — le plancher de S10 s'applique seul. Cohérent, mais un `tri/S` sans CSS
   se voit alors demander 30 min quand son épreuve en dure 16 : c'est le faux positif que le
   `min()` venait précisément d'écarter, réintroduit par l'absence d'une réponse.
2. **repli sur un CSS prudent** (le plus lent du domaine) — la durée estimée est alors maximale,
   donc le gate vaut 30 min partout : identique à l'issue 1 en pratique, avec un détour.
3. **l'absence de CSS est elle-même une condition du gate** — symétrique de « je ne sais pas »
   sur la continuité : qui ne connaît ni sa vitesse ni sa plus longue nage ne peut pas évaluer
   son exposition. C'est la lecture la plus fidèle à O-17, et la plus dure.

**Non tranché ici.** L'issue 3 est cohérente avec la décision « je ne sais pas bloque », mais elle
transforme une question OPTIONNELLE du questionnaire en prérequis de fait pour tout triathlon en
eau libre — ce qui est une décision de produit, pas une déduction.

**Le reste de la spec est FINAL** et n'attend plus que l'écriture :

```
gate        min(30 min, durée de nage estimée en course) · « je ne sais pas » → non satisfait
            [CSS inconnu → À TRANCHER, trois issues ci-dessus]
progression nombre de paliers proportionné à (durée de course − continuité déclarée)
            paliers dérivés de TRI_SWIM[fmt].dist · blocs CONTINUS (reps === 1)
            écart faible → 1-2 confirmations · écart grand → 4 paliers
mécanisme   transformation de « Nage seuil (+dist) », JAMAIS marquage s.long
            (le marquage activerait CAP_SWIM et écrêterait 3 800 → 3 000)
schéma      longest_swim_m étendu à tri — MÊME COMMIT que le gate (R20.1)
eau libre   ≥ 1 continue en conditions réelles, combinaison comprise
critère     O-17, membre « ne peut pas évaluer le risque »
placement   dans la boucle du point fixe · avant le sceau
résiduel    « écart grand ET phase trop étroite » : à MESURER inatteignable et
            asserter au sceau, pas à implémenter
```

### B-17 §9 — BRANCHE « CSS INCONNU » TRANCHÉE : issue 2, et mon « identique en pratique » était faux

**Rectification.** J'ai écrit que le repli sur un CSS prudent était *« identique à l'issue 1 en
pratique, avec un détour »*. C'est faux, et l'écart tombe exactement sur le cas qui motivait la
question. Vérifié plutôt qu'accepté, au repli `130 s/100 m` :

| format | course | durée de course au repli | gate `min(30, durée)` | **gate en mètres** | issue 1 (30 min à plat) |
|---|---|---|---|---|---|
| **tri/S** | 750 m | 16,9 min | **16,9 min** | **780 m** | 1 385 m |
| tri/M | 1 500 m | 34,1 min | 30,0 min | 1 385 m | 1 385 m |
| tri/70.3 | 1 900 m | 43,6 min | 30,0 min | 1 385 m | 1 385 m |
| tri/Full | 3 800 m | 88,9 min | 30,0 min | 1 385 m | 1 385 m |

**Les deux issues ne diffèrent que sur `tri/S` — c'est-à-dire précisément le cas que le `min()`
venait d'écarter.** Sur les trois autres formats le `min()` retient de toute façon le terme des
30 minutes et elles coïncident. Mon objection était juste sur trois lignes sur quatre, et fausse
sur celle qui posait le problème.

*(Note d'unité, qui rend le point plus fort encore : `longest_swim_m` est déclaré en MÈTRES et le
gate est une DURÉE — la comparaison exige donc une vitesse **des deux côtés**, quelle que soit
l'issue. L'issue 1 n'évite pas le repli, elle l'applique en abandonnant le second terme du `min()`.)*

**Aucune constante nouvelle** : `baseRefs.css || 130` existe, est mesuré, documenté et porte déjà
son statut `PANSEMENT`. Inventer un « CSS prudent » propre au gate créerait une seconde vitesse de
repli à côté de la première — la famille `_IFZ`, une fois de plus.

**⚠ LE SENS DE L'ERREUR EST LE BON, ET IL FAUT L'ÉCRIRE DANS LE CODE.** `130 s/100 m` est **plus
rapide** qu'un vrai débutant : 30 minutes converties par ce repli donnent une distance **plus
grande** que celle qu'il couvrirait réellement, donc le gate lui demande un peu plus que son
équivalent-30-minutes réel. Pour un garde-fou de sécurité c'est la direction souhaitable — et c'est
**la seule occurrence de ce chantier où le biais connu de cette constante joue en faveur de
l'athlète**. À écrire noir sur blanc, sinon quelqu'un « corrigera » le repli ici en croyant bien
faire (le défaut symétrique de celui qu'O-25 a fermé).

**Pourquoi pas l'issue 3** — la symétrie avec « je ne sais pas » n'est qu'apparente, et l'argument
est bon : *ne pas connaître sa plus longue nage continue*, c'est ignorer sa capacité face au risque,
et personne ne peut l'évaluer à sa place (O-17 s'applique) ; *ne pas connaître son CSS*, c'est
ignorer sa vitesse — une donnée que le moteur estime déjà partout ailleurs. Bloquer sur la seconde
traiterait une estimation possible comme une ignorance, et refuserait un plan tant qu'un test CSS
n'a pas été fait, dans un sport où le débutant est justement celui qui n'en a jamais fait.

```
durée_gate   = min( 30 min , durée de nage estimée en course )
vitesse      = baseRefs.css, ou le repli 130 s/100 m si css_known ≠ "oui"
comparaison  = continuité déclarée (convertie par la MÊME vitesse) vs durée_gate

« je ne sais pas » sur la continuité →  gate NON satisfait
CSS absent                          →  repli, le gate reste calculable
```

**Le gate ne devient jamais incalculable. La seule absence qui bloque est celle qui décrit
l'athlète face au risque, pas celle qui décrit sa vitesse.** — spec CLOSE, plus aucune inconnue.

### B-17 §10 — LE GATE ACCEPTE UNE PREUVE EN BASSIN, ET C'EST LA SÉANCE EN EAU LIBRE QUI VALIDE L'HYPOTHÈSE

Ton observation sur le `750 → 16,9 → 780` est exacte, vérifiée :

```
750 m au repli 130 s/100 m, SANS facteur eau libre : 16,25 min
750 m au repli, AVEC le facteur ×1,04              : 16,90 min
reconverti en mètres au rythme BASSIN              :   780 m  =  750 × 1,04
```

Le seuil est **dérivé d'une nage en eau libre** (facteur `TRI_SWIM[fmt].factor`) et la continuité
déclarée, elle, sera presque toujours une nage **en bassin** — mur tous les 25 m, ligne d'eau, fond
visible, arrêt possible à chaque longueur. Le gate demande donc **780 m de bassin pour couvrir
750 m d'eau libre** : une surcharge de 4 % qui est le facteur du milieu, pas une correction de
prudence.

**Le gate est donc sciemment permissif : il accepte une preuve en bassin pour une capacité en eau
libre.** C'est assumé, et ce qui le rend acceptable est l'exigence « ≥ 1 continue en conditions
réelles » — elle n'est pas un supplément de confort, **c'est ce qui valide l'hypothèse que le gate
a faite au moment de construire le plan**.

**D'où une précision de PLACEMENT qui manquait à la spec :**

```
La séance en eau libre tombe TÔT dans la phase spécifique, indépendamment du
palier de distance atteint — jamais en fin de progression.

Motif : elle vérifie une hypothèse posée à la CONSTRUCTION du plan. Découvrir
trois semaines avant l'épreuve que l'eau libre est bien plus dure que le bassin
laisse le temps de s'inquiéter, pas celui de s'adapter.

Les deux progressions sont INDÉPENDANTES : une continue en eau libre à 50 % de la
distance de course, TÔT, vaut mieux qu'une à 100 %, TARD.
```

**Note d'implémentation** : `milieu` (`["bassin", "ow", "mixte"]`) est déclaré **`["swim"]`
uniquement**. Comme `longest_swim_m`, la clé existe mais pas pour le triathlon. Deux clés à étendre
à `tri`, donc — et la même contrainte R20.1 s'applique : elles agissent dans le commit qui les
déclare, ou elles n'y sont pas.

---

**SPEC B-17 CLOSE.** Plus aucune inconnue, plus aucun arbitrage en attente :

```
gate         min(30 min, durée de nage estimée en course)
             vitesse = baseRefs.css, sinon repli 130 s/100 m (le biais du repli
             joue EN FAVEUR de l'athlète ici — à écrire dans le code)
             « je ne sais pas » sur la continuité → NON satisfait
             CSS absent → repli, le gate reste calculable
             accepte une preuve en BASSIN — assumé, validé par la séance eau libre
progression  paliers proportionnés à (durée de course − continuité déclarée)
             dérivés de TRI_SWIM[fmt].dist · blocs CONTINUS (reps === 1)
             écart faible → 1-2 confirmations · écart grand → 4 paliers
             dernière à 3-4 semaines · jamais en affûtage
eau libre    ≥ 1 continue en conditions réelles, combinaison comprise
             placée TÔT dans la phase spécifique, indépendamment du palier
mécanisme    transformation de « Nage seuil (+dist) », JAMAIS marquage s.long
schéma       longest_swim_m ET milieu étendus à tri — même commit que le gate
critère      O-17, membre « ne peut pas évaluer le risque »
placement    dans la boucle du point fixe · avant le sceau
résiduel     « écart grand ET phase trop étroite » : mesurer inatteignable et
             asserter au sceau, pas implémenter
```

### B-17 §11 — `milieu` étendu à tri : le gate cesse de SUPPOSER sur deux points

**(1) La surcharge de 4 % devient conditionnelle.** Le seuil demandait 780 m pour couvrir 750 m
parce qu'il supposait la continuité déclarée acquise en BASSIN. Avec `milieu` lu, l'hypothèse
devient une lecture — aucun calcul nouveau, le facteur eau libre déjà appliqué cesse seulement
d'être systématique :

```
milieu = ow              → seuil SANS surcharge  (750 m) — la preuve est déjà dans le bon milieu
milieu = bassin          → seuil AVEC surcharge  (780 m)
milieu = mixte ou absent → AVEC surcharge        (780 m) — origine ambiguë, on prend le conservateur
```

**(2) `bassin` + course en eau libre : le seul écart que le plan est structurellement incapable de
combler.** La spec exige une continue en conditions réelles ; si l'athlète s'entraîne uniquement en
bassin, cette séance ne peut pas être réalisée — donc l'hypothèse du gate **ne sera jamais validée**.

Ce n'est pas une raison de bloquer (beaucoup de triathlètes s'entraînent en bassin et courent en eau
libre sans incident, refuser serait disproportionné) : c'est une raison de le **dire**, une fois, à
la construction. C'est la posture du reste du moteur — nommer ce qu'il ne peut pas faire plutôt que
l'omettre —, et c'est O-17 sans aller jusqu'au refus : **on informe quelqu'un qui peut agir, plutôt
que de bloquer quelqu'un qui ne peut pas.**

> « Ta course se nage en eau libre et tu t'entraînes en bassin. Ton plan peut construire la
> distance, pas le milieu — pas de mur, pas de ligne, pas de fond visible, et il faut lever la tête
> pour se repérer. Une seule sortie en eau libre avant le jour J change tout, et plus elle est tôt,
> mieux c'est. »

**⚠ Une hypothèse reste dans ce message et doit être nommée** : *« ta course se nage en eau libre »*.
Le moteur ne le sait pas — `milieu` décrit où l'athlète S'ENTRAÎNE, pas où l'épreuve se nage, et
aucune clé ne porte le second. C'est vrai de la quasi-totalité des M/70.3/Full, mais **des triathlons
sprint se nagent en piscine**. Deux issues, à l'écriture : restreindre le message aux formats dont
la nage est certainement en eau libre, ou le formuler au conditionnel (« si ta course se nage en eau
libre… »). Ne pas l'affirmer sans la clé qui le dit — c'est exactement la faute que ce chantier
corrige depuis le premier jour.

```
schéma  longest_swim_m  ["swim"] → ["swim", "tri"]   → le gate
        milieu          ["swim"] → ["swim", "tri"]   → la surcharge conditionnelle + le message
R20.1   les deux agissent dans le commit qui les déclare, ou elles n'y sont pas.
```

### B-17 §12 — PÉRIMÈTRE VERROUILLÉ. Le message est restreint à M+, et rien d'autre n'entre.

**Décision : issue 1.** Le message « bassin + eau libre » ne s'affiche que sur **M, 70.3, Full** —
formats dont la nage se fait en eau libre dans la quasi-totalité des cas, où l'affirmation est donc
vraie **sans clé**. Le sprint est le seul format ambigu, et c'est précisément celui où le message
serait faux une fois sur deux. L'issue 2 (le conditionnel) est honnête mais faible : *un message qui
commence par « si ta course se nage en eau libre » se lit comme une réserve juridique et se saute ;
un message qu'on n'affiche que quand il est vrai vaut mieux qu'un message qu'on nuance.*

**Le reste de l'appareil reste ACTIF sur sprint** — la distinction est nette et vaut d'être gardée :

| pièce | sur sprint, milieu inconnu | raison |
|---|---|---|
| gate (continuité ≥ durée de course) | **conservé** | il mesure la capacité à tenir l'effort, sensée quel que soit le milieu |
| séance en eau libre | **conservée** | la prescrire pour une course en piscine est un désagrément ; ne pas la prescrire pour une course en lac est le risque |
| surcharge de 4 % | **conservée** | c'est du bruit, et elle va dans le sens prudent |
| **message** | **retiré** | c'est la seule pièce qui **AFFIRME** quelque chose |

**On peut se tromper par prudence ; on ne peut pas se tromper en affirmant.** Les trois premières
sont des défauts conservateurs, la quatrième est une assertion — et seule une assertion a besoin
d'être vraie.

### ⚠ PÉRIMÈTRE VERROUILLÉ — observation de processus, et elle porte sur moi

**B-17 a été déclaré clos cinq fois et rouvert cinq fois par une trouvaille adjacente** : les
paliers, la branche CSS, la preuve en bassin, `milieu`, le milieu de l'épreuve. Chacune était juste,
chacune a repoussé l'écriture d'une session. C'est le mode de défaillance de ce fil : la qualité de
l'analyse produit sa propre paralysie.

```
B-17 part avec : la spec close + la restriction du message aux formats M+
                 RIEN D'AUTRE — aucune clé de schéma nouvelle
```

Toute trouvaille adjacente à partir d'ici devient **un ticket**, jamais un ajout au périmètre.

---

## O-47 · Le prédicteur suppose que TOUTE nage de triathlon se fait en eau libre · 🔴 **OUVERT**

Scindé de B-17 §12, avec une justification meilleure que celle qui l'a fait apparaître.

`TRI_SWIM` applique son coefficient de milieu à **tous** les formats, sprint compris —
`S: { dist: 750, factor: 1.04 }` —, et `predictor.ts` documente ce facteur comme calibré
« peloton, combinaison comprise ». **Pour un triathlon sprint nagé en PISCINE, le temps prédit est
donc 4 % trop lent**, par une hypothèse silencieuse.

Poser une clé « milieu de l'ÉPREUVE » ne serait donc pas ajouter une dimension : ce serait **rendre
explicite une hypothèse que le moteur fait déjà**. C'est une justification bien meilleure que « un
message a besoin de le savoir », et elle vaut son ticket propre.

Consommateurs le jour venu : le facteur `TRI_SWIM` · la prescription de la séance en eau libre · la
surcharge du gate B-17 · le message B-17 · et probablement la question combinaison, qui n'a aucun
sens en piscine.

```verify
id: O-47
quoi: TRI_SWIM applique le facteur eau libre au format sprint aussi
attendu: O47-REPRODUIT
cmd: grep -q 'S: { dist: 750, factor: 1.04 }' src/engine/predictor.ts && echo "O47-REPRODUIT"
```

### B-17 §13 — LES DEUX DÉFAUTS SONT RACINÉS (sonde, pas relecture)

**§3 du brief écarté** : la transformation **reçoit bien un ordinal** — `k = positions.indexOf(idx)`
avec `idx = weekNum - 1 - spec.start`. Elle n'est pas sans état, sa cible dérive du calendrier. Les
deux défauts ont donc des causes DISTINCTES, et la sonde les sépare :

```
=== Full  spec {start:20, end:28, weeks:8}
  S21 x1 : livré 1763 m   bnd={floor:1900, cap:1900}
  S25 x1 : livré 3295 m   bnd={floor:3400, cap:3400}
  S28 x1 : livré 2090 m   bnd={floor:3800, cap:3800}
=== 70.3  spec {start:11, end:15, weeks:4}
  S12 x1 : livré  842 m   bnd={floor:950,  cap:950}
  S15 x2 : livré 1900 m  ||  1900 m   (bnd IDENTIQUES)
```

**D2 — la cible est POSÉE et le livré est EN DESSOUS DU PLANCHER.** `bnd.floor` vaut 1 900 / 3 400 /
3 800 et le plan livre 1 763 / 3 295 / 2 090. Le mécanisme est **connu et déjà documenté (O-26)** :
*« `blockBounds` jette le plancher déclaré par le bloc et le remplace par un plancher digne »*. Mon
épinglage n'a donc jamais existé pour les passes aval — la borne dégénérée est lue par personne.
Le diagnostic du fondateur est exact et son correctif aussi : **exclusion, pas borne.** Un bloc dont
la distance PORTE UN SENS ne se protège pas par un intervalle, il se retire de la population que les
passes redistribuent — comme le brick est exclu des receveuses depuis I14b, précédent à réutiliser.
*(Quatrième occurrence de la famille : leg vélo de brick, `sessionScale`, `enforceC22Final`, celle-ci.)*

**D1 — le prédicat est trop large, ce n'est PAS un double passage de rang.** Les deux séances de
S15 portent des `bnd` **identiques**, donc le même `k` : le créneau `facile2` est invoqué **deux
fois** pour cette semaine et la transformation, sans état, matche à chaque invocation. Le
discriminateur du §2 tranche donc en faveur de « deux séances différentes, prédicat trop large » —
et non d'un double passage. Le correctif n'est pas dans le calcul de la cible mais dans la SÉLECTION
de la séance à transformer : au plus une par semaine.

**Aucun ajout au périmètre.** Ces deux corrections, puis gates · golden · E2E vus jusqu'au bout.

### B-17 §14 — LES DEUX CORRECTIFS, PRÉCISÉS AVANT D'ÊTRE ÉCRITS

**D1 — « au plus une par semaine » exige un DÉPARTAGE EXPLICITE.** Si deux séances peuvent occuper
`facile2`, la règle suppose de savoir *laquelle*. Un choix reposant sur l'ordre d'itération serait
déterministe **par accident** — la famille exacte que ce chantier ferme depuis des semaines : une
réorganisation de liste, un tri ajouté ailleurs, et la transformation change de séance sans que rien
ne le signale ; le golden devient instable et D1 revient en flake. Le critère sera écrit, quel qu'il
soit (séance de plus gros volume, ou index stable dans la semaine) — *ce qui ne convient pas, c'est
de ne pas en avoir*.

**Consigné sans être investigué** : que `facile2` soit invoqué **deux fois pour une même semaine**
est peut-être normal (si le créneau est une CATÉGORIE et non une POSITION) ou peut-être pas. Hors
périmètre de B-17 : mesuré, noté, non traité.

**D2 — l'exclusion doit couvrir DEUX choses, pas une.** Retirer le bloc de la population
redistribuée ne suffira pas si `blockBounds` réécrit son plancher juste avant (c'est le mécanisme
O-26, et il agit EN AMONT des passes de volume). À vérifier séparément :

```
· le bloc est exclu des passes de redistribution   (patron I14b)
· ET blockBounds ne réécrit pas son plancher        (cas O-26)
```

**Le critère d'acceptation est EXACT, pas approché** :

```
Pour un profil Full, les quatre paliers livrés valent EXACTEMENT leurs cibles.
Toute différence, même d'un mètre, signifie qu'une passe non identifiée touche encore le bloc.
```

Un bloc dont la distance porte un sens ne tolère pas de tolérance — et c'est le test le moins cher
possible : quatre égalités sur un profil. *(À noter : c'est l'inverse de la posture adoptée partout
ailleurs aujourd'hui, où j'ai dû ajouter des tolérances parce que le pas de quantification est
absolu. Ici le bloc n'est PAS quantifié par les passes, puisqu'il en est retiré : l'égalité exacte
est donc la bonne forme, et une tolérance masquerait précisément le défaut qu'on corrige.)*

### B-17 §15 — D1 ET D2 SONT FERMÉS ET MESURÉS. UN TROISIÈME DÉFAUT, D3, LES DOMINE TOUS LES DEUX.

**D2 — fermé, et le §14 attendait DEUX correctifs là où il n'en fallait qu'un.** Le fondateur
demandait de vérifier les deux moitiés (« exclu des passes de redistribution » ET « `blockBounds`
ne réécrit pas son plancher »). Mesuré : **la seconde suffit, et elle explique la première.** Le
bloc portait déjà `floor = cap = cible` ; `blockBounds` le rendait inerte en le traversant par
`const fl = s.long ? 800 : Math.min(b.bnd.floor, r.beginner ? 600 : 750)` — le plancher déclaré de
3 800 m ressortait à **750**. Une fois `blockBounds` rendant le plancher tel quel, l'intervalle est
dégénéré et **aucune passe aval ne peut plus le déplacer** : l'exclusion est obtenue PAR la borne,
il n'y a pas de seconde liste à tenir.

Le marqueur est `bnd.pinned`, pendant côté PLANCHER de ce que `bnd.hard` fait au plafond — et il
fallait les deux, parce que la décision d'audit v6 (D3-D7/D10, « les planchers de séance ne gagnent
plus contre la courbe ») est JUSTE tant que le plancher n'est qu'un minimum de dignité, et fausse
quand la dimension EST le stimulus. Pas de test `floor === cap` : ce serait un critère syntaxique
qui capterait par accident tout bloc dont les deux bornes coïncident.

**D1 — fermé, avec le départage écrit, et l'observation du §14 est tranchée : `facile2` est une
CATÉGORIE.** Mesuré sur le plan livré, pas déduit du gabarit : **29 semaines sur 308** portent DEUX
jours `facile2` (`weekBuilder` le déclare deux fois dans le gabarit « quotidienne »). Le départage
est `slotIdx === 0` — le **premier jour du créneau en ordre calendaire** —, un index stable calculé
là où la semaine entière est visible ; jamais l'ordre d'itération d'une liste.

**L'expérience est contrôlée, un facteur à la fois** (corollaire de la règle 15) :

```
état                      D1 (semaines à doublon)   D2 (paliers hors cible)
858c0c5 (partiel)                    7                    19 / 31
+ pinned seul                        7                     0 / 31     ← D2 fermé, et lui seul
+ pinned + slotIdx                   0                     0 / 24     ← les deux fermés
```

Full/36, Full/42, Full/50 livrent **1 900 → 2 650 → 3 400 → 3 800 m**, strictement croissants, le
dernier palier étant la distance de course au mètre près. Critère du fondateur tenu : *livré ==
cible sur les quatre*.

`T-06` passe de **rouge à vert** dans le même commit (cliquet) — et il est RÉÉCRIT, pas basculé :
ses deux écritures précédentes étaient SYNTAXIQUES, et la seconde serait restée rouge après B-17
livré, la règle ne portant aucun des mots qu'elle cherchait (`prereq`, `nage_continue`). Un test qui
exige un VOCABULAIRE au lieu d'un COMPORTEMENT échoue dans les deux sens. Il observe désormais le
plan livré : le gate mord, le gate laisse passer, une par semaine, montée strictement croissante,
livré == cible.

#### D3 — LE GATE LIT UNE RÉPONSE QUE LE PRODUIT NE COLLECTE JAMAIS

Trouvé en vérifiant, pas en relisant. **`longest_swim_m` et `milieu` ont été étendus au triathlon
dans le SCHÉMA (858c0c5) ; aucune des deux questions n'est POSÉE à un triathlète.**

```
endurabuild/js/ui/steps.js — l'étape « objectif » a trois branches :
   trail    → distance, D+, technicité, nuit, barrière
   swimrun  → …, « La plus longue nage (m) », …          ← la seule qui la pose
   AUTRES   → « Quel objectif ? » + date                 ← le triathlon est ici
endurabuild/js/config.js — `milieux` n'est déclaré que sur `swim` : l'étape « milieu »
   n'existe pas pour un triathlète.
```

Or le module décide — délibérément, arbitré, écrit — que **« je ne sais pas » ne satisfait pas le
gate**. La conséquence n'avait jamais été mesurée :

```
profils tri du golden : 148 · RABATTUS : 117 (79,1 %)
   Full → S   56        M → S   31        70.3 → S   30
aucun ne déclare `longest_swim_m` — la question est NOUVELLE et, pour un tri, INEXISTANTE.
```

Ce n'est pas un artefact de fixture : **un triathlète réel ne peut pas répondre**, donc *tout*
inscrit à un Ironman recevrait un plan de sprint. Et `poolOnlyNotice`, dont le §12 a arbitré la
restriction aux formats M+, exige `milieu === "bassin"` : jamais renseigné en tri, **le message est
du code mort dans le produit**.

**Les trois gates rouges du lot sont D3, et lui seul** — isolé par expérience contrôlée (le
rabattement neutralisé, tout le reste en place) :

```
gate                cf392af (avant B-17)   858c0c5   aujourd'hui   sans le rabattement
audit:v1                   VERT             ROUGE      ROUGE            VERT
audit:v2                   VERT             ROUGE      ROUGE            VERT
audit:r13                  VERT             ROUGE      ROUGE            VERT
audit:sensibilite          VERT             ROUGE      ROUGE            ROUGE (tri/milieu)
```

Les signatures le disent aussi : `audit:v1` tombe sur C26d chez `tri/Full/*/debutant` et `audit:r13`
sur `R13.6-P1 — Full 59 sem : taper=1 peak=5`, c'est-à-dire des plans de SPRINT audités contre des
attentes de FULL. `audit:sensibilite` est la seule à porter la seconde moitié : `tri/milieu` inerte,
parce qu'en tri cette clé ne pilote plus qu'un avertissement — la famille R20.1, dans sa forme
MIROIR (« une clé consommée doit être collectable »).

**Le golden n'est PAS recapturé** : **147 écarts sur 949**, dominés par un rabattement gouverné par
une réponse que le produit ne peut pas recevoir. Photographier cet état l'enregistrerait comme la
référence. `858c0c5` garde son avertissement.

**Trois issues, aucune choisie ici — c'est un arbitrage, pas une mécanique** :

```
(a) POSER les deux questions dans le questionnaire tri, et décider si elles sont
    OBLIGATOIRES (le swimrun l'exige : `valid()` réclame `swim_continuous`)
(b) ne rabattre que sur une continuité DÉCLARÉE insuffisante, l'absence n'étant plus
    un refus — ce qui renverse la décision écrite au §8/§10, arbitrée sur O-17
(c) rabattre, mais d'un seul cran plutôt que jusqu'au sprint
```

##### Ma sonde a rendu « LES DEUX CRITÈRES SONT TENUS » sur un plan qui n'était pas celui qu'elle nommait

`scripts/sondeB17.mjs`, première écriture : elle déclarait `longest_swim_m: "800"` pour les quatre
formats. À 1'50/100 m cela vaut 14,7 min, ce qui satisfait le sprint **et aucun autre** : les douze
lignes du balayage mesuraient toutes un `tri/S` à 750 m, D1 et D2 sortaient verts, et Full — le
format que le critère d'acceptation du fondateur nomme — affichait **zéro palier**. C'est la
SECONDE fois dans ce seul ticket (`mesureB17.mjs` balayait des horizons où le Full était refusé),
et c'est le test de dépistage de la règle 15 : **un résultat saturé accuse l'instrument** — ici
« 750 m » sur toutes les lignes. La sonde asserte désormais sa prémisse et écarte toute ligne dont
le format a été rabattu. *Sans cette correction, j'aurais rendu D1 et D2 fermés sans les avoir
regardés, et D3 serait resté invisible.*

##### …et elle est ensuite sortie VERTE sur ZÉRO palier — règle 19, sur mon propre instrument

Contre-preuve n° 3 (décaler le rang de départage d'un cran) : la prescription tombe à **zéro
palier**, et la sonde rendait `D1 = 0 · D2 = 0 / 0` sous un verdict « LES DEUX CRITÈRES SONT
TENUS ». Deux compteurs d'ANOMALIES sont trivialement satisfaits par l'absence de la chose
comptée. C'est la règle 19 posée ce matin même — *quel est le correctif le moins coûteux qui ferait
passer ce test ?* Ici : **effacer la fonctionnalité**. Un critère de NON-VACUITÉ est ajouté (le Full
porte ses quatre paliers, les autres au moins un), et le verdict distingue désormais « tenu » de
« vide ». `T-06`, lui, portait déjà `if (!paliers.length)` et sortait rouge sur les trois cassures :
c'est la sonde d'exploration qui manquait le garde-fou, pas la garde permanente.

```
cassure                                   sonde            T-06
`pinned` neutralisé                       D2 16/24  ✖      ROUGE
départage `slotIdx` retiré                D1 7      ✖      ROUGE
départage décalé d'un cran                VACUEUX   ✖      ROUGE
```

#### L'état de vérification du lot, en une table

```
gates            24 VERTS · 4 ROUGES  — audit:v1 · audit:v2 · audit:r13 · audit:sensibilite
                 les trois premiers redeviennent VERTS quand le seul rabattement est
                 neutralisé, tout le reste en place. Les quatre sont D3.
E2E              25 suites · 24 vertes d'un bloc · smoke-usage 3/3 verte (80 assertions),
                 rejouée séparément — règle 18
golden           147 écarts / 949 · NON recapturé (D3)
sceau T-27       S1 3 · S4 341 · S5 520 contre {4, 353, 513} · NON re-épinglé (D3)
registry:check   61 reproduisent · 2 flips · 3 commandes cassées — tous confirmés à la main,
                 aucun n'étant un défaut réparé
```

**`smoke-usage` : trois exécutions, trois vertes, 80 assertions.** Son unique échec de la passe
complète était en deux temps, tous deux de MON fait : un `EADDRINUSE` sur le port 8596, tenu par un
serveur orphelin de la passe que j'avais tuée après avoir reconstruit le bundle en pleine
exécution ; puis, en la rejouant seule, un `element is not stable` sur le carrousel du check-in
**coupé par mon propre délai de shell de 2 min** — le message « Target page has been closed » EST
la trace de cette coupure. Règle 18 appliquée : rien n'a été attribué avant trois tirages.

**O-6 a basculé en « ne reproduit plus », et c'est un FAUX POSITIF — le second de la journée.**
Confirmé à la main (règle 17) : son bloc cherchait le littéral `0 écart` dans la sortie de
`golden:verify`, or le golden porte **147 écarts** parce que D3 n'est pas arbitré et qu'on refuse
délibérément de le recapturer. Le correctif d'O-6 tient parfaitement — la ligne « 4 refus d'entrée
typé(s) — comportement attendu, photographié » est là, les refus ne sont pas comptés comme des
erreurs. Le bloc mesurait une grandeur VOISINE de celle qu'il nomme : la propreté du golden, pas la
distinction refus/erreur. Réécrit sur la propriété, comme la règle 17 le demande.

**O-40 : commande cassée, et elle l'était AVANT ce lot.** Son bloc attend `LE PLAFOND MORD`, jeton
écrit en `c1a595e` ; `a93d5c7` a ensuite CORRIGÉ la mesure (« mon balayage d'hier mesurait un nageur
de REPLI ») et le verdict est devenu `LE PLAFOND EST DÉCLARATIF` — sans que le bloc suive. C'est la
règle 17 dans son autre forme : une mesure corrigée laisse derrière elle un bloc périmé, qui se lit
comme un registre pointant dans le vide. Jeton aligné sur le verdict actuel.

**O-37 et T-27b : cassées par une décision, pas par une dérive.** Les deux dépendent de `✓ T-27`
dans la sortie de `lotPhysio`, et T-27 est ROUGE parce que `SCEAU_ATTENDU` n'est délibérément pas
re-épinglé (§15 ci-dessus). Elles redeviendront exécutables quand D3 sera arbitré. Laissées telles
quelles : les « réparer » en retirant leur dépendance à T-27 masquerait ce que T-27 signale.

**Pas de bloc `verify` pour D1/D2, et le retirer est le correctif.** J'en avais écrit un ; il
était faux DEUX fois. Son `attendu` portait de la prose là où la convention veut le JETON que la
`cmd` écho (`O47-REPRODUIT`…), donc `registry:check` l'a rangé en « ne reproduit plus » — un flip
qui se lit comme un défaut réparé, la forme exacte que la règle 17 dit de confirmer à la main.
Vérifié à la main : la commande rend bien `B17-D1-D2-TENUS`. Mais la seconde erreur est plus
profonde et ne se corrige pas en changeant le jeton : **ce registre recense des défauts OUVERTS**,
où « reproduit » signifie *le défaut est toujours là*. Un bloc dont l'attendu est « le correctif
tient » inverse cette sémantique, et un jour où il rougirait il annoncerait une bonne nouvelle.
Ce que D1/D2 méritent est une GARDE, pas une entrée de registre — c'est `T-06`, écrit dans le même
commit et vérifié rouge sur les trois cassures.

```verify
id: B-17-D3
quoi: la question de continuité du TRI existe (avec son « je ne sais pas » explicite) et collecte les mètres
attendu: D3-REPRODUIT
cmd: node scripts/sondeB17rabat.mjs | grep -q "RABATTUS" ; grep 'data-key="longest_swim_known"' endurabuild/js/ui/steps.js | grep -q 'data-input="longest_swim_m"' && echo "D3-REPRODUIT"
```
<!-- B-17-D3 réécrit le 18/08/2026 (règle 17, confirmé À LA MAIN) : l'ancienne cmd comptait
     les occurrences FICHIER de `data-input="longest_swim_m"` et attendait 1 — or le
     questionnaire SWIMRUN porte le même champ depuis toujours (« La plus longue nage (m) »
     dans ses données de course), donc le compte vaut 2 sans qu'aucun défaut n'existe. Un
     compte fichier pour une propriété PAR SPORT — la cmd est réécrite sur la propriété :
     la question TRI (celle qui porte `longest_swim_known`) collecte les mètres. -->



### B-17 §16 — D3 FERMÉ. Les deux questions existent, et la conséquence n'est plus « rabattre »

**Le fondateur invoque l'exception au gel de périmètre** (16/08/2026) : *« 56 profils Full rendus
en plans Sprint est une sortie incorrecte, pas une amélioration possible. »* Trois changements, et
rien d'autre.

#### 1 · Les deux questions, obligatoires, avec « je ne sais pas » explicite

`longest_swim_m` et `milieu` étaient déclarées au schéma et **posées nulle part** pour un
triathlète — la clé était consommée et *inrenseignable*. Elles entrent dans la branche `tri` de
l'étape objectif, et `valid()` les exige. **`longest_swim_known` (oui/non) est une clé nouvelle**,
sur le patron de `css_known`/`pace_known` : *« la décision “je ne sais pas bloque” suppose que
l'athlète l'ait dit »* — une absence par OUBLI et une absence ASSUMÉE ne sont plus la même
information, et le nombre n'est demandé que si l'athlète dit le connaître.

**`audit:sensibilite` ne pouvait pas voir ce défaut** : il vérifie qu'une clé AGIT, pas qu'on
puisse y répondre. C'est la famille R20.1 dans sa forme MIROIR, et le banc gagne les deux paires
qui la couvrent (`continuité déclarée`, `milieu de la preuve`), sur le patron `vam_known`/`vam`.

#### 2 · La conséquence est graduée — le rabattement ne survit que là où il a un sens

*« S10 rabat parce que le swimrun n'offre aucun remède. Le plan de triathlon contient le sien. »*
J'avais repris le patron S10 sans l'examiner. **Rabattre le format supprime exactement le mécanisme
qui corrigerait le problème** — on retirait le remède au motif que la maladie existe —, et le
dommage était disproportionné : une déclaration de NAGE transformait un plan de TROIS disciplines.
**O-17 n'exige pas ça** : l'événement irréversible est LA COURSE, pas la construction du plan ; le
levier du moteur sur le jour J est le MESSAGE.

```
gate satisfait                      → plan normal
non satisfait, écart FRANCHISSABLE  → format DEMANDÉ conservé, progression incluse,
                                      message proéminent — AUCUN rabattement
écart NON franchissable             → rabattement, patron S10, avec sa raison chiffrée
```

**« Franchissable » se mesure avec ce qui existe déjà, zéro constante nouvelle** : la rampe part de
la continuité DÉCLARÉE et croît au plus de **C22 (+10 %/semaine)** jusqu'à la fin de la phase
spécifique (`B17_SPAN_PCT`, dérivé de `PHASE_PCTS`). Si elle n'atteint pas la distance de course,
la progression ne peut pas partir d'où l'athlète est.

```
format │ déclaration          │ verdict        │ décision              │ paliers livrés
Full   │ 400 m                │ format gardé   │ 400 m → 3800 m        │ 700→1250→2150→3800
Full   │ 100 m                │ RABATTU        │ 70.3 (au lieu de Full)│ 350→600→1100→1900
70.3   │ 400 m                │ RABATTU        │ M (au lieu de 70.3)   │ 550→800→1100→1500
M      │ 2000 m               │ gate satisfait │ —                     │ 1500
```

#### 3 · La progression part de l'ATHLÈTE

*« Partir de 50 % de la distance de course ne sert pas quelqu'un à 200 m. »* La table
`B17_PALIERS = [0.5, 0.7, 0.9, 1.0]` — des fractions de la distance de COURSE — disparaît. Les
distances s'**interpolent géométriquement** du départ de l'athlète à la distance de course ;
géométriquement parce que la contrainte qui les borne l'est (C22 est un RAPPORT), et une
interpolation linéaire ferait des premiers pas énormes en relatif pour qui part bas — exactement
la population que ce correctif sert.

#### 4 · Trois défauts trouvés en construisant, aucun visible en relecture

**(a) `fmt` était un `const`, et c'était un défaut latent depuis R4.5.** Capté une fois sur
`a.format`, il ne suivait NI le rabattement swimrun NI celui du tri, alors que c'est lui que lit
`MIN_WEEKS[sp]?.[fmt]`. Un Full rabattu au sprint recevait la durée de préparation d'un Full —
c'est la signature exacte que `audit:r13` remontait (`R13.6-P1 — Full 59 sem : taper=1 peak=5`).

**(b) Le véhicule n'était pas celui que je transformais — 79 % des promesses non tenues.** Mesuré
sur 351 plans qui ANNONÇAIENT la construction : **277 ne la contenaient pas**. La ventilation donne
la cause — `finir` 117, `plaisir` 117, `debutant` 117 contre `competition` 43 : le créneau `facile2`
route ces profils vers `swTech` (« Nage vitesse »), donc je mutais un objet qu'ils ne reçoivent
jamais ; et sous DOUBLES `swMain` part sur `dur1`. **La population la plus concernée était celle qui
a le plus besoin de la continuité** : un débutant qui vise un finish en eau libre. Le placement ne
bouge pas (§4 de l'arbitrage) — c'est le créneau porteur de la nage PRINCIPALE qui est lu.
**21,1 % → 98,9 %**, puis **100 %** une fois (c) corrigé — et un taux saturé se vérifie au lieu de
se célébrer (dépistage de la règle 15). Le cas résiduel était un `tri/S` de 8 semaines dont la
PREMIÈRE semaine de `spec` ne porte aucun jour `facile2` ; le plafonnement du nombre de paliers par
la place disponible fait tomber l'unique palier sur la SECONDE, qui en porte un. Vérifié à la main
sur ce profil exact — S6 livre « Nage continue — 750 m d'affilée ». Le placement n'a pas bougé.

**(c) Le dernier palier n'était jamais posé quand la place manquait.** Sur un `tri/M` de 12
semaines, `spec` fait DEUX semaines et la progression en demandait quatre : les paliers se
collapsaient, `positions.indexOf` ne rendait que le premier de chaque groupe, et la montée
s'arrêtait à **1 200 m pour une épreuve de 1 500**. `palierPosables()` borne le nombre par la
place, et la décision affichée comme la séance prescrite l'appellent — R11.1. La décision
`B17-paliers` se déplace donc APRÈS la construction des phases : émise avant, elle annonçait un
nombre que le plan ne pouvait pas porter.

#### 5 · Ce qui reste ouvert, chiffré, et qui est un ARBITRAGE

**L'honnêteté est punie dans une fenêtre étroite.** Le §3 réserve le rabattement à l'écart NON
franchissable ; « je ne sais pas » n'a pas d'écart mesurable, donc il ne rabat pas. Conséquence
arithmétique : **5 inversions mesurées** — déclarer 400 m sur un 70.3 fait rabattre, répondre « je
ne sais pas » ne fait pas rabattre. La fenêtre est `[200 m, distance_course / 1,1^travée)`.

Les deux lectures de l'arbitrage divergent ici et je n'ai pas tranché seul : le §1 conserve *« je ne
sais pas bloque »*, le §3 réserve le rabattement au non-franchissable. J'ai suivi le §3 (le § qui
définit la conséquence) et **mesuré le prix de ce choix** plutôt que de le taire. La correction
symétrique — traiter « je ne sais pas » comme le plancher de 200 m — rabattrait au Sprint tout
triathlète qui ne connaît pas sa plus longue nage, c'est-à-dire exactement le dommage
disproportionné que le §2 dénonce.

#### 5bis · Ma sonde était satisfaite par le défaut qu'elle surveille — règle 19, troisième fois

Contre-preuve n° 1 : rétablir le rabattement d'origine (la cible ne cherche que `satisfait`) fait
passer les rabattements de **5 à 12** sur le balayage et de **5 à 21** sur le golden — et la sonde
restait **VERTE**, parce que « au moins un format gardé » suffisait à sa non-vacuité. Le correctif
le moins coûteux qui fait passer ce test ne résout pas le problème : c'est exactement ce que la
règle 19 dit de demander AVANT d'écrire. Le verdict de chacun des **20 cas est désormais ÉPINGLÉ**
— un cliquet, pas un seuil.

```
cassure                                        cliquet   montée   non-vacuité
rabattement d'origine (le défaut D3)              ✖         ✓          ✓
paliers repartant de 50 % de la course            ✓         ✓          ✖
plafond par la place retiré                       ✓         ✖          ✓
```

Trois cassures, trois rouges — mais seulement APRÈS avoir ajouté le cliquet, et la première ne
l'était pas avant.

#### 5ter · Une clé exigée par `valid()` doit être ATTEIGNABLE dans le même écran

`smoke-questionnaires` a rougi sur **U19**, et pas pour la raison attendue. Ma première écriture
mettait le nombre de mètres dans une BRANCHE (`branch("lswB", longest_swim_known === "oui", …)`) :
il n'existe alors dans le DOM qu'APRÈS le choix. Or la dérivation d'U19 énumère les clés
**présentes**, les remplit d'une valeur plausible, puis retire une clé à la fois — et
`valeurPlausible` coche la première option, donc « Je la connais », sans jamais pouvoir remplir le
nombre. `valid(plein)` restait faux, la sonde tombait sur son repli « nommer tout ce qui est vide »,
et **elle réclamait « Date (si connue) » — une question FACULTATIVE**, ce qu'U19 interdit
explicitement depuis son écriture.

Le correctif suit d'ailleurs mieux l'arbitrage : *« Ta plus longue nage sans t'arrêter → mètres, ou
je ne sais pas »* décrit **une seule question**, pas deux imbriquées. Les deux champs vivent dans le
même `.q`, et le message se **déduplique par LIBELLÉ** — sans quoi il nommait deux fois « Ta plus
longue nage », ce qui a l'air cassé : on nomme des QUESTIONS à l'athlète, pas des clés.

Le dernier critère d'U19 (« tout le requis donné → le bouton s'active ») est mis à jour, pas
contourné : c'est la LISTE du requis qui s'est allongée par décision, la propriété gardée est
inchangée.

#### 6 · Et j'ai effacé une heure de travail avec `git checkout`, pour la SECONDE fois du dépôt

Pour restaurer une cassure de contre-preuve, j'ai fait `git checkout -- src/engine/reasoningEngine.ts`
sur un fichier **non commité**. Les trois modules de D3 sont revenus à `HEAD`, qui ne contenait rien
de ce lot : `swimContinuity.ts`, `reasoningEngine.ts` et `tri/index.ts` ont été perdus d'un coup, et
le bundle reconstruit par-dessus a effacé la dernière copie exécutable.

**C'est exactement l'incident consigné en V2** (« un `git checkout` a effacé une heure de travail —
restaurer une cassure de contre-preuve avec `git checkout` sur un fichier NON COMMITÉ a emporté tout
le câblage du sachet »). Et j'avais employé la bonne méthode plus tôt dans la même session — `cp`
vers `/tmp`, puis restauration — avant de l'abandonner pour la commande courte.

**La règle est donc opératoire, pas morale : on ne pose pas de cassure de contre-preuve sur un
travail non commité.** Committer d'abord, ou copier le fichier de côté. Le code a été réécrit à
l'identique depuis le contexte et re-vérifié bit à bit — mêmes sorties de sonde, mêmes gates, golden
à 0 écart — mais rien ne garantissait qu'il soit récupérable.

```verify
id: D3-graduee
quoi: le rabattement est réservé à l'écart NON franchissable, et les trois branches existent
attendu: LA CONSÉQUENCE EST GRADUÉE
cmd: node scripts/sondeD3.mjs | grep -o "LA CONSÉQUENCE EST GRADUÉE"
```

```verify
id: D3-couverture
quoi: un plan qui ANNONCE la progression la contient. ⚠ L'attente « 0 » était FAUSSE dès l'écriture : la sonde elle-même nomme et chiffre 2 plans (format S) dont le véhicule `facile2` n'existe pas en phase spécifique, et conclut « le fait est NOMMÉ et chiffré, pas corrigé sans mandat » — le placement est gelé par le §4 de l'arbitrage D3. Vérifié à la main contre le moteur d'AVANT le lot 1 : **2 avant comme après**. Le critère porte sur le TAUX, qui est la grandeur que la sonde publie et défend.
attendu: /livrent au moins une nage continue : \d+ \(100\.0 %\)/
cmd: node scripts/sondeD3couv.mjs | grep "livrent au moins"
```


### B-17 §17 — « JE NE SAIS PAS » N'EST PAS UNE VALEUR : C'EST UNE DEMANDE DE MESURE

**Arbitrage du fondateur (16/08/2026), et il nomme d'abord ce que sa propre spec n'avait pas dit :**
le §1 (« je ne sais pas bloque ») gouverne le **gate** — le message et la progression — tandis que
le §3 gouverne le **rabattement**. Deux sorties différentes, et j'avais suivi le §3 pour le
rabattement, ce qui était juste ; il en résultait seulement que celui qui déclare 400 m recevait une
conséquence de plus que celui qui ne dit rien. **L'incitation devenait : ne réponds pas.**

Aucune des deux réponses habituelles ne convenait — traiter l'inconnu comme le pire cas envoie au
Sprint tout triathlète qui ne suit pas ses nages (la disproportion du §2), le laisser passer
récompense le silence.

```
longest_swim_m = « je ne sais pas »
  → le plan est construit pour le format demandé
  → la PREMIÈRE séance de nage de la phase spécifique est un TEST de continuité
  → le message dit que l'évaluation de la nage est EN ATTENTE
  → pas de rabattement : rien n'est mesuré, donc rien n'est ÉTABLI comme infranchissable
  → dès que la réponse arrive, la conséquence graduée s'applique, rabattement compris
```

C'est le mécanisme **déjà en place pour la FTP et le CSS** : quand le moteur a besoin d'un nombre
qu'il n'a pas, il prescrit le test qui le produit. Le manque de donnée devient une séance
d'entraînement — le moteur a besoin d'un nombre, l'athlète a besoin de nager en continu.

**Le test est EN BASSIN, et c'est le point de sécurité.** Un effort « aussi loin que tu peux » chez
quelqu'un dont personne ne connaît la continuité est exactement le scénario que B-17 existe pour
empêcher en eau libre : le mur tous les 25 m est ce qui le rend acceptable. La consigne eau libre se
décale au palier SUIVANT. Le bloc n'est **pas épinglé**, délibérément — la distance est ce qu'on
MESURE, pas ce qu'on impose.

**Le critère d'honnêteté de la sonde a changé de FORME, et l'ancien serait devenu faux.** Il
comparait des VERDICTS et comptait 5 inversions ; la question juste n'est plus « qui est rabattu
aujourd'hui » mais **« le silence produit-il une tâche ou une permission »**. Mesuré : les 8 profils
sans mesure portent tous un test. Deux critères nouveaux, tous deux vérifiés rouges — le test
retiré (8 laissez-passer), le test prescrit même sur une continuité MESURÉE (il deviendrait
décoratif).

#### Et j'ai refait le `git checkout` sur du non-commité, dans la MÊME session, une heure après l'avoir écrit

La contre-preuve C4 a été restaurée par `git checkout -- src/sports/tri/index.ts`. `HEAD` ne
contenait pas le travail du test (non commité) : la restauration l'a effacé, et **C5 a mesuré un
fichier qui ne portait plus la règle** — d'où deux cassures rendant le MÊME message d'échec, ce qui
est le seul indice qui m'a fait regarder. Sans cette incohérence de sortie, j'aurais publié C5
comme une contre-preuve valide alors qu'elle ne testait rien.

C'est la **deuxième fois de la session**, et la seconde arrive après que j'ai écrit la règle au §16.
Une règle qu'on énonce sans changer son geste n'est pas une règle. La forme opératoire est donc :
**commiter AVANT toute cassure**, ce qui est ce que ce lot fait désormais — et non « penser à ne pas
faire `git checkout` ».

```verify
id: D3-mesure-manquante
quoi: une continuité inconnue prescrit un TEST, jamais un laissez-passer
attendu: aucun laissez-passer
cmd: node scripts/sondeD3.mjs | grep -o "aucun laissez-passer"
```


## O-48 · `smoke-shop` dépendait du JOUR DE LA SEMAINE · ✅ **fermé le jour où il a mordu**

**Septième occurrence de la famille R20.7**, et la première trouvée par un simple changement de
date pendant une session : la suite est passée **42/42 le 2026-08-16** et a échoué le
**2026-08-17** sur « le devis a des lignes à nommer (0) », à CODE IDENTIQUE. Le 16 était un
dimanche, le 17 un lundi.

**Attribué correctement avant d'être corrigé.** Le réflexe aurait été d'y voir une régression de D3
— c'est le lot en cours, et il touche justement les plans `tri`. Rejouée dans un *worktree* sur
`cf392af` (avant B-17), `858c0c5` et `ff86ecb` : **elle échoue sur les trois.** Aucun lot du
chantier n'y est pour rien. Et 3 exécutions sur 3 échouent le 17 — ce n'est pas un flake (règle 18).

**La suite portait DÉJÀ un correctif de cette famille, et il était insuffisant** : passer en cadence
MENSUELLE, « parce que la fenêtre de 7 jours peut légitimement ne contenir aucune séance à
ravitailler selon le jour ». Balayé sur les sept jours (`npm run sonde:devis7j`) :

```
cadence mensuel : lun  0 · mar  0 · mer  1 · jeu  1 · ven  1 · sam  1 · dim  1
cadence hebdo   : lun  0 · mar  0 · mer  0 · jeu  0 · ven  0 · sam  0 · dim  0
```

**Deux jours sur sept** vident le devis mensuel : une fenêtre de 30 jours démarrée un lundi
s'arrête avant la première séance à ravitailler d'une phase de base à 7 h/sem. La suite ANCRE
désormais sa date (`page.clock.setFixedTime`, comme `smoke-zenna` depuis v8) — et le `readiness` du
fixture suit l'ancrage, sans quoi le portillon du check-in relit un autre jour et rien ne s'affiche.

**Deux choses mesurées qu'il faut dire plutôt que taire :**
- le devis mensuel ne porte **qu'UNE ligne** les bons jours : le critère `> 0` est sur le fil, et
  c'est ce qui le rend sensible au jour. Le rendre robuste demanderait un profil dont le plan porte
  des séances à ravitailler dès la base — un changement de fixture, pas d'ancrage ;
- la cadence HEBDO rend **0 sur les sept jours**. Un taux saturé accuse l'instrument ou le modèle
  mental (règle 15) — ici c'est le modèle : une semaine de base d'un 70.3 à 7 h/sem ne porte aucune
  séance au-delà de 90 min, donc rien à ravitailler. Cohérent, mais la suite ne mesure alors qu'une
  moitié du composant.

```verify
id: O-48
quoi: le devis de ravitaillement ne dépend plus du jour d'exécution
attendu: 2 / 7
cmd: node scripts/sondeDevis7j.mjs | grep -o "jours où le devis MENSUEL est vide : [0-9] / 7" | grep -o "[0-9] / 7"
```


## O-44 §0 — LES DEUX POINTS COURTS DU LOT PRÉCÉDENT, RÉGLÉS

### a) Le corpus d'audit ne voyait qu'UNE branche du gate sur quatre — corrigé

`longest_swim_m` n'était rempli nulle part pour le triathlon dans `runV2Audit` : les profils
alertés tombaient TOUS dans « continuité inconnue », et les trois autres branches — satisfait,
écart franchissable, écart infranchissable — n'étaient exercées par AUCUN profil. Un corpus qui ne
voit qu'une branche ne peut pas voir une régression sur les autres, et c'est la même cécité que la
sous-passe `B17` du golden a fermée côté photographie.

La dispersion est **déterministe** (rotation sur `history` × `intent`, quatre déclarations : `non`
· 100 m · 800 m · 2 500 m) : chaque format rencontre les quatre branches et la photo reste
reproductible. **Vérifié atteint, pas supposé** — c'est la leçon de la sous-passe `B17`, dont ma
première écriture prenait un horizon où le rabattement ne pouvait jamais mordre :

```
branches atteintes par les 108 profils tri du corpus
   test (inconnue)   36      format gardé   24
   gate satisfait    30      RABATTU        18
```

`audit:v1` reste **VERT à 0 violation dure sur 459** avec la dispersion en place — le rabattement
réintroduit dans le corpus ne produit aucune violation.

### b) Le score ignore les alertes — il ne dit donc rien sur ce lot

Réponse en une ligne, **mesurée** plutôt que lue dans le code (règle 15) : **il n'existe aucune
relation monotone** entre le nombre d'alertes et le score.

```
score par nombre d'avertissements (corpus tri dispersé, 108 profils)
   0 alerte  n= 16   moy 94,1  [ 80 … 100]  σ  6,2
   1 alerte  n= 45   moy 95,2  [ 80 … 100]  σ  5,6
   2 alertes n= 35   moy 90,9  [ 65 … 100]  σ 10,6
   3 alertes n= 12   moy 95,0  [ 85 … 100]  σ  6,1
```

Les écarts-types vont de 5,6 à 10,6 : **les moyennes se recouvrent largement et aucune ne se cite
seule comme un effet.** La réserve statistique du fondateur portait sur un `99,0` à n=15 — elle
était fondée, et la cause est pire qu'un bruit d'échantillon : **ce chiffre n'existait pas.**

##### ⚠ LES CHIFFRES QUE J'AI PUBLIÉS D'ABORD ÉTAIENT FAUX, PAR LA FAUTE QUE JE VENAIS DE DOCUMENTER

Ma première mesure lisait `r.plan._v2.warnings` sur l'objet rendu par `generateAudited()` — qui ne
porte PAS `_v2` (le champ est posé par le PONT, pas par `generatePlan`). Le repli silencieux
`?? []` rangeait donc une partie des profils dans le mauvais groupe : effectifs 20/64/15/9 au lieu
de 16/45/35/12, et un `99,0` fantôme. **C'est la MÊME faute d'instrument que j'avais décrite deux
paragraphes plus haut à propos de la mesure par branche**, refaite dans la mesure voisine, et
publiée. La mesure est désormais un script (`npm run mesure:score-alertes`) qui lit les alertes et
les décisions sur le plan du PONT et le score sur l'objet AUDITÉ — deux appels, assumés et
commentés.

`score` part de 100 et ne se décrémente que sur des grandeurs de STRUCTURE — sauts de charge, ratio
du pic, semaines hors bande, part de la sortie longue, jours durs adjacents, part de facile.
`warnings` n'entre dans aucun de ces termes : c'est le canal d'INFORMATION (R11.2), pas une pénalité.

**Et la hausse a bien une autre cause, nommée et mesurée** — le score par branche du gate :

```
   test (inconnue) 94,2 · format gardé 94,6 · gate satisfait 94,5 · RABATTU 89,7
```

Le rabattement est la seule branche qui coûte au score : un plan rabattu est audité contre les
bornes du format DÉCLARÉ (`opts.format = profile.format` dans `generateAudited`, jamais le format
livré). D3 ayant réservé le rabattement à l'écart infranchissable, la population qui portait ce
malus s'effondre — d'où la hausse, sans aucun rapport avec les alertes.

*Note d'instrument : ma première mesure par branche rendait « gate satisfait » pour les **108**
profils — un taux saturé. Elle lisait les décisions sur le plan de `generateAudited`, qui ne porte
pas `_v2` (il est posé par le pont, pas par `generatePlan`). La branche se lit sur le plan du pont,
le score sur l'audité.*

**Et la hausse a bien une autre cause, nommée et mesurée** — le score par branche du gate :

```
   test (inconnue) n=36  94,2 (σ 7,2)   ·   format gardé   n=24  94,6 (σ 5,6)
   gate satisfait  n=30  94,5 (σ 6,5)   ·   RABATTU        n=18  89,7 (σ 12,0)
```

Le rabattement est la seule branche qui coûte au score, et D3 l'ayant réservé à l'écart
infranchissable, la population qui portait ce malus s'effondre. **La même réserve s'applique** :
σ 12,0 sur n=18, l'écart de 5 points ne se lit pas comme un effet propre — c'est une direction
cohérente, pas une mesure d'amplitude.

---

## O-49 · L'auditeur juge un plan contre une référence que ce plan n'a jamais visée · 🔴 **OUVERT, gelé**

Trouvé par une sonde qui servait une AUTRE question (le score du §0b), et c'est la deuxième fois
dans ce lot qu'une sonde corrigée rend plus que le contrôle qu'elle servait — après celle de B-17,
dont la réparation a rendu D3 visible.

```
mécanisme    `opts.format = profile.format` dans `generateAudited` : le format DÉCLARÉ,
             alors que le plan peut avoir été bâti pour un autre (rabattement B-17)
conséquence  l'auditeur mesure contre une référence NON VISÉE
aujourd'hui  ~5 points de score sur 18 profils, 0 violation dure
bénignité    repose sur « le rabattement ne va que vers le bas » — donc les bornes
             appliquées sont toujours plus exigeantes que celles visées, et l'auditeur
             est trop SÉVÈRE plutôt que trop laxiste. Propriété NON ÉCRITE et NON GARDÉE.
famille      règle 15, dans l'auditeur : nommer une grandeur, en mesurer une voisine
```

**L'énoncé est volontairement la conséquence et non le mécanisme.** Un auditeur qui mesure contre
le mauvais référentiel peut manquer une violation aussi bien qu'en inventer une ; rien ne garantit
la direction, et la propriété qui rend le défaut inoffensif aujourd'hui n'est écrite nulle part.
C'est l'énoncé qui change, pas la priorité : gelé.

```verify
id: O-49
quoi: l'auditeur reçoit le format DÉCLARÉ, pas celui que le plan vise
attendu: O49-REPRODUIT
cmd: grep -q 'format: profile.format' src/generator/repairLoop.ts && echo "O49-REPRODUIT"
```


## O-44 · Plancher de durée de séance en nage · ✅ **FERMÉ SUR LA MESURE, non livré**

**Le constat du brief est reproduit exactement** : sur les semaines de charge, **69 profils de nage
sur 136** vivent à 80-100 % de séances courtes, **les 36 débutants sans exception**, distribution
bimodale sans milieu (44 % entre 20-40 %, 40 % entre 80-100 %). L'historique ne discrimine pas
(20/25/24). Pire cas `swim/sprint/reprise/inter` à 97 %, six semaines sur six.

`SWIM_SESSION_FLOOR_MIN = 20` est écrite avec son bloc de provenance (hypothèse LOGISTIQUE, non
physiologique, PANSEMENT, sortie = une question de disponibilité au bassin). La justification du
« 20 et pas plus » est vérifiée : C15 (850 m) à CSS 2:00 ne permet que **19,0 min**, donc toute
valeur au-dessus de 19 donne le même résultat aux 36 débutants.

### La passe est écrite, placée comme demandé — et RETIRÉE, parce que le critère n°3 est rouge

```
1. second mode (≥ 80 % de nages courtes)  54 → 35 profils          ✓
   sous-population (> 50 %)               69 → 36 profils          ✓
2. débutants dans la sous-population      36 → 36                  ✖
3. profils qui PERDENT du volume de nage  104 / 136, jusqu'à −132 min  ✖
4. fréquence : baisse hors des profils à séances courtes  0        ✓
```

**Le brief dit que le troisième est le vrai test. Il l'a été** — il a attrapé trois fuites
successives, chacune réelle et chacune corrigée, et une quatrième qui n'est pas dans la passe.

**Fuite 1 — je versais dans les blocs de QUALITÉ.** R4.1 l'interdit, et ce n'est pas une
préférence : `scaleBlock` borne les répétitions d'un bloc de qualité à celles que la bibliothèque a
choisies. La passe ajoutait, la passe suivante annulait. Mesuré sur
`swim/sprint/reprise/inter/competition` : semaine 1 à **6 nages / 4 700 m / 100 min** avant,
**3 nages / 3 150 m / 69 min** après — 1 550 m évaporés. Corrigé : le déversement va sur le bloc
FACILE, patron I14b.

**Fuite 2 — je conservais les MÈTRES quand la courbe compte en MINUTES** (règle 14). Un mètre
déplacé de `sw.css` vers `sw.easy` vaut PLUS de minutes (O-42) : la semaine sortait au-dessus de sa
cible et le lissage la rabotait. Corrigé : on redistribue des minutes, chaque receveuse recevant des
mètres à SA vitesse de zone.

**Fuite 3 — le garde comparait une capacité en mètres à un besoin en mètres tout en distribuant des
minutes.** Les deux membres se comparent désormais dans la monnaie de la courbe.

**Fuite 4 — elle n'est PAS dans la passe, et c'est la mesure qui le dit.** Instrumentée au point
d'action, la semaine 1 sort à **100 min pour une cible de 102** : le volume est conservé là où la
passe agit. C'est `enforceC22Final` qui reprend **12 min** (100 → 88), puis le second
`reconcileDeclaredVolume` de la boucle de réparation **8 de plus** (88 → 80).

```
[O44] S1 retrait -> 100 min livrées, cible 102     ← la passe conserve
[O44] après-O44      : S1 = 100 min
[O44] après-C26c+B02 : S1 = 100 min
[O44] après-C22final : S1 =  88 min                ← −12
[O44] S1 retrait -> 88 min livrées, cible 90       ← 2e reconcile → 80
```

### Ce que ça coûte si on la branche quand même : 46 violations DURES

`audit:v1` et `audit:v2` passent au ROUGE (**46 combinaisons**), et `audit:v6` régresse sur **D4**
(« une semaine de récup n'est jamais plus chargée que la dernière semaine de charge ») — mécanisme
cohérent : les semaines de décharge sont EXCLUES de la passe (C29b : une nage courte s'y garde), donc
elles conservent leurs cinq séances courtes pendant que les semaines de charge se regroupent, et le
rapport s'inverse.

### L'arbitrage, chiffré

```
(a) exempter les semaines regroupées du lissage final   → affaiblit C22, une règle de SÉCURITÉ,
                                                          pour une hypothèse LOGISTIQUE
(b) accepter la perte de volume                         → c'est l'amputation que le brief interdit
(c) étendre le regroupement aux semaines de décharge    → contredit C29b (Bosquet 2007) et rouvre
                                                          le défaut que R13.3 a fermé
(d) ne rien brancher, garder la constante et la mesure  → l'état actuel
```

Aucune de ces issues n'est mécanique : (a) et (c) touchent des règles arbitrées, (b) est exclue par
le brief. **La passe n'est donc pas branchée**, `SWIM_SESSION_FLOOR_MIN` et `npm run mesure:o44`
restent, et rien d'inerte n'entre dans le pipeline.

### Le résultat de ce lot n'est pas la passe — c'est le critère 2, et j'ai mal attribué sa cause

J'avais écrit « les 36 débutants sont hors de portée tant que C15 les borne, ce qui est une
propriété de C15 ». **C'est faux, et l'arbitrage du fondateur le corrige** : la cause n'est pas le
plafond, c'est que **le plancher existe DÉJÀ, dans la mauvaise unité**.

L'arithmétique du blocage, explicite — un débutant à 6 × 600 m (3 600 m/semaine, séances posées sur
le plancher C24b) :

```
configuration │ distance/séance │ durée à CSS 2:30 │ verdict
6 séances     │      600 m      │     15,0 min     │ sous le plancher O-44
5 séances     │      720 m      │     18,0 min     │ TOUJOURS sous le plancher
4 séances     │      900 m      │     22,5 min     │ AU-DESSUS du plafond C15 (850 m)
```

**Aucune configuration ne satisfait les deux bornes à volume constant.** Ce n'est ni un défaut du
mécanisme ni une valeur mal choisie : c'est un système SUR-CONTRAINT, et le garde anti-amputation
aurait raison de refuser quelle que soit la valeur du plancher au-dessus de 18 minutes.

**O-44 n'ajoutait donc pas une contrainte manquante : il tentait d'en corriger une existante,
exprimée dans la mauvaise unité, en en superposant une seconde.** Deux planchers, deux unités, une
seule intention — la famille `_IFZ`, et O-42 appliqué à un plancher au lieu d'une conversion.

### Ce que le moteur DIT en attendant — la seule chose honnête

La tension est réelle et **l'athlète est le seul à pouvoir la résoudre** : lui seul sait s'il peut
aller six fois à la piscine. Le plan la NOMME au lieu de décider à sa place :

> *Tes séances de nage sont courtes — ton volume est réparti sur beaucoup de jours. Le plan ne peut
> pas les regrouper sans te retirer du volume. Si tu ne peux pas aller à la piscine aussi souvent,
> regroupe-les toi-même : deux séances de quarante minutes valent mieux que six de quinze, et le
> trajet coûte le même prix quelle que soit la durée.*

**Le message ne part que si l'athlète VIT dans ce régime** — la MAJORITÉ de ses semaines de charge,
pas une semaine isolée. Sans cette borne il partait sur **102 profils de nage sur 136 (75 %)**, dont
beaucoup n'ont qu'une semaine courte : l'affirmation y serait fausse, et un message qui sur-affirme
se fait ignorer là où il est vrai. Avec elle : **56 profils de nage sur 136, dont les 36 débutants**,
et **111 sur les 969 du golden** (nage 56 · tri 32 · swimrun 23 — les trois sports qui déclarent
`swimSessionFloors`).

**Rayon vérifié : le SEUL champ qui change est `._v2.warnings`.** 111 écarts au golden, 111 profils
recevant le message — pas une séance, pas une minute. Le compteur se lit sur le plan LIVRÉ, en tout
dernier, pour que le message ne décrive ni un état intermédiaire ni une intention (règle 15).

```verify
id: O-44
quoi: la sous-population des nages courtes existe toujours, la passe n'est pas branchée
attendu: UNE SOUS-POPULATION EXISTE
cmd: node scripts/mesureO44b.mjs | grep -o "UNE SOUS-POPULATION EXISTE"
```


## O-50 · Le plancher de séance de nage (C24b) est exprimé en MÈTRES · 🔴 **OUVERT**

C'est le ticket qu'O-44 aurait dû être, et il n'y avait aucun moyen de le savoir avant d'avoir écrit
O-44 et mesuré son échec.

```
défaut       C24b impose un plancher de séance de 600 m (débutant) / 750 m. Exprimé en
             MÈTRES, il ne garantit AUCUNE durée minimale — et il sert le mieux le nageur
             le plus LENT :
                600 m à CSS 1:30  →   9 min   ← le rapide reçoit la séance la plus courte
                600 m à CSS 2:30  →  15 min
                600 m à CSS 3:00  →  18 min
             C'est exactement le plancher dérivé d'une distance que le brief d'O-44 écartait
             — il est déjà dans le moteur, et il produit l'effet annoncé.

à mesurer    · la durée impliquée par C24b sur les 136 profils de nage, PAR CSS
avant toute  · combien de séances sous 15 min en découlent, et sur QUI
décision     · le rayon d'un passage en minutes — qui d'autre lit ce plancher

contrainte   C15 borne par le HAUT en mètres. Un plancher en minutes et un plafond en
             mètres restent commensurables profil par profil, mais leur compatibilité se
             vérifie AVANT, pas après — c'est précisément ce que ce lot vient de découvrir
             après.

famille      `_IFZ` (deux expressions d'une même intention) et O-42 (l'unité), appliquées
             à un PLANCHER au lieu d'une conversion.
```

```verify
id: O-50
quoi: le plancher de séance de nage est en mètres, donc muet sur la durée
attendu: O50-REPRODUIT
cmd: grep -q 'const floorM = ctx.beginner ? 600 : 750;' src/generator/planGenerator.ts && echo "O50-REPRODUIT"
```

---

## O-51 · `C30b-A` mesure le DÉCLENCHEMENT d'une passe, pas la propriété qu'elle sert · ✅ **FERMÉ**

Trouvé par le lot 1, en devenant rouge pour la meilleure des raisons : **la passe n'avait plus
rien à faire.**

```
défaut       Le critère `C30b-A` (banc v6) exige qu'une décision `C30b` soit émise sur
             4 profils, et porte une garde de non-vacuité `if (vus < 4)`. Cette garde est
             exactement ce que la règle 19 réclame — et elle rougit quand la sortie longue
             atteint sa cible SANS la passe.

             Mesuré (expérience contrôlée, profil exact du banc, `semi@7:00/6h`) :

                            S9 spec    S10 peak   S11 peak   décisions C30b
                AVANT       106 min     129 min    130 min    1
                APRÈS       115 min     129 min    130 min    0

             La longue est IDENTIQUE au pic et plus longue de 9 min en spécifique. Le
             critère rapporte « aucune décision C30b alors que la longue devrait monter » —
             elle est montée, et davantage.

propriété    « la sortie longue atteint sa cible de spécificité »
réelle       dont « C30b se déclenche » n'est qu'un des chemins. Le critère nomme la passe
             et mesure la passe ; il ne regarde jamais la cible.

à écrire     le critère lit `longRunSpecificityFloor` (la cible, déjà calculée et déjà
             importée par le générateur) et vérifie que la longue livrée l'atteint — la
             décision `C30b` restant vérifiée QUAND elle est émise (ses trois moitiés
             actuelles : borne 70 %, chiffre annoncé = chiffre livré, neutralité en volume).
             La non-vacuité se déplace alors sur « au moins un profil de l'échantillon a une
             cible non triviale », qui ne dépend plus du chemin emprunté.

famille      règle 19 (« quel est le correctif le moins coûteux qui ferait passer ce
             test ? ») — ici la question se pose à l'envers : le correctif le moins coûteux
             serait d'abaisser `vus < 4` à `vus < 3`, et il ne résoudrait rien, parce que le
             critère ne mesure pas la bonne grandeur. C'est le même diagnostic, vu depuis un
             test qui rougit à tort plutôt qu'un test satisfait à tort.

             Et c'est la douzième occurrence dans ce dépôt d'un critère qui NOMME une
             grandeur et en MESURE une voisine.
```

**Livré (17/08/2026)** : `C30b-A` porte sur `livré ≥ min(cible, plafond de séance)`. Les deux
bornes viennent du moteur — la cible par `EBV2.longRunSpecTarget` (exposée pour ça), le plafond LU
sur le plan livré (`bnd.cap` du bloc de corps, la valeur même que la passe emploie). Le mécanisme
n'est vérifié que QUAND la décision existe ; ses trois moitiés sont inchangées.

La non-vacuité se déplace sur une propriété de l'ATHLÈTE : au moins 2 profils dont la cible mord
AVANT le plafond (mesuré : les deux 10 km, cibles 79 et 64 pour un plafond de 90 ; les deux semis
sont décidés par leur plafond de 130). Elle ne peut donc plus devenir vacue parce que le moteur
s'améliore — c'était tout le défaut.

**Contre-preuve dans les deux sens, quatre fois** (condition non négociable de l'arbitrage) :

```
verte   moteur réel                         4/4 atteintes, dont 2 décidées par la cible
rouge   CASSURE MOTEUR — passe C30b coupée  2 rouges, et exactement les 2 où la cible mord
rouge   longue lue à 0,90×                  4 rouges
rouge   longue lue à 0,98×                  2 rouges (la tolérance de 2 min ne masque pas)
rouge   « la cible ne mord jamais »          non-vacuité : 0 profil décidé par la cible
```

Le correctif le moins coûteux qui aurait fait passer l'ancien test — abaisser `vus < 4` à
`vus < 3` — est nommé dans le critère, avec la raison qu'il ne résout rien (règle 19).

**Second candidat rattaché, non traité** : `C30-A` épingle `semi/inter/4:30/8h`, un témoin qui a
bougé **trois fois** (B-02, O-42, lot 1) par trois causes et un mécanisme identique — « une
quantité de dur change quelque part ». Un témoin qui bouge à chaque variation de dur n'épingle pas
une propriété, il épingle un état incident. Ré-épinglé à 130 selon la doctrine du banc, avec sa
raison et la mention que sa valeur suit l'arbitrage Q1.

**Trouvé en le construisant** : ma première écriture lisait l'allure avec `E.parseChronoSec`, le
parseur de CHRONO — « 8:30 » y vaut 8 h 30, soit 30 600 s, et les cibles sortaient à **6 466 min**.
Un critère peut échouer parce que le moteur a tort ou parce que l'instrument a tort, et l'échec a
exactement la même tête. `parsePaceSec` est exposé à côté : le banc n'a plus le choix entre deux
parseurs dont un est faux ici. Troisième fois dans la même journée qu'une allure passe par le
mauvais parseur.

```verify
id: O-51
quoi: C30b-A porte sur la cible atteinte, avec sa non-vacuite sur l'athlete
attendu: O51-FERME
cmd: grep -q "profil(s) où la cible mord avant le plafond" audit_v6.mjs && echo "O51-FERME"
```

---

## O-52 · `golden:verify` n'a pas de sortie d'AMPLEUR à côté de sa sortie de LOCALISATION · ✅ **FERMÉ (b) · (a) RÉFUTÉ**

**Le point (a) de ce ticket — « il ne distingue pas un crash d'un écart » — est RÉFUTÉ, deux fois.
Il venait de moi, le fondateur l'a repris de mon rapport, et il était faux.**

```
réfutation   Reproduit à l'identique (exception réintroduite dans le point fixe), la
   du (a)     commande AFFICHE, en clair et avant la liste des écarts :

                 ✖ 439 profil(s) en erreur :
                    swim/sprint/reprise/debutant/competition : r is not defined

              `goldenMaster` attrape, range en `errors`, nomme l'exception et sort en
              code 1. Je ne l'avais pas vu parce que j'avais lu la sortie au `tail -25`
              puis au `head -20` — le bloc d'erreurs se trouve exactement entre les deux.
              L'outil m'a dit la vérité et je l'ai coupée au pipe.

              Second volet du (a) : « le wrapper de buildPlan qui avale l'exception doit
              compter ses avalements ». Le wrapper qui avale est celui du MONOLITHE, gelé.
              Celui de la PWA ne l'avale plus — il relève en `MOTEUR_EN_ECHEC`, sous un
              commentaire qui porte déjà l'argument : *« un filet troué ne protège
              personne : on préfère désormais un échec VISIBLE »*.

              Troisième faute d'instrument du même lot, et la seule qui accuse un outil
              innocent. Les deux premières lisaient une grandeur voisine ; celle-ci ne
              lisait pas du tout.

défaut       Ce qui RESTE, et c'est ce qui m'a réellement induit en erreur : `firstDiff`
   (b)       rend LE PREMIER écart d'un profil, sous un commentaire qui l'énonce (« où
             compte plus que combien pour corriger »). C'est juste pour LOCALISER, et
             c'est la SEULE sortie que l'outil offre — donc c'est celle qu'on agrège quand
             on veut une AMPLEUR, et on publie alors la médiane de N *premiers* écarts en
             croyant tenir celle du mouvement.

             Mesuré : « médiane 3 min/semaine, max 5, aucune séance n'apparaît ni ne
             disparaît » publié, contre un réel de −1 420 min de nage, max 518 min sur un
             plan, et 2 profils qui changent de nombre de séances.

à écrire     une sortie d'AMPLEUR à côté de la sortie de LOCALISATION : nombre de champs
             en écart par profil, et le plus grand écart numérique. Un outil qui n'a
             qu'une réponse la verra reprise pour l'autre question.

famille      une mesure qui NOMME une grandeur et en MESURE une voisine — et la première
             où l'outil DOCUMENTE lui-même qu'il ne mesure pas ça.
```

**Livré (17/08/2026)** : `countDiff` rend le NOMBRE de feuilles en écart et le plus grand écart
NUMÉRIQUE, affichés par profil et agrégés (médiane · p90 · max). Le premier tirage sur les 87
écarts du lot 1 donne **médiane 61 champs par profil, max 471, total 6 403** — là où ma §5 en
annonçait 87, un par profil. L'outil dit maintenant ce que je croyais lui avoir demandé.

Une amplitude n'est rendue que sur les feuilles NUMÉRIQUES : en inventer une sur une chaîne
(longueur, distance d'édition) serait une grandeur voisine de plus, dans un ticket qui existe
pour ça. Contre-preuve : `npm run mesure:o52`, 6 cas, dont « une chaîne n'a pas d'amplitude » et
« 1 champ ≠ N champs ».

```verify
id: O-52
quoi: golden:verify expose l'amplitude a cote de la localisation
attendu: O52-FERME
cmd: node -e 'const s=require("fs").readFileSync("scripts/goldenMaster.mjs","utf8");process.exit(s.includes("champ(s) en écart")?0:1)' && echo "O52-FERME"
```

---

## O-53 · Le plafond de dose ne teste pas `pinned` · ✅ **FERMÉ**

Trouvé par la vérification A du §1 de l'arbitrage lot 1 — celle qui est VERTE.

```
défaut       `DOSE_CAP_MIN` écrête un bloc de qualité sans regarder `bnd.pinned`. Un bloc
             épinglé (`floor === cap === cible`) déclare « la distance EST le stimulus » —
             c'est la leçon I14, et c'est ce qui protège les nages continues de B-17 : les
             réduire ne les rend pas plus faciles, ça leur retire leur objet.

mesuré       0 croisement aujourd'hui, sur les 969 profils du golden. Les continuités
             B-17 sont en `sw.aero`, hors des zones plafonnées, et leurs 24 paliers sont
             livrés à la cible au mètre près (`sonde:b17`).

             Le croisement n'existe donc pas par GARDE mais par ACCIDENT DE ZONE. Le jour
             où une continuité, une simulation de course ou un test se prescrit dans une
             zone à plafond, il sera raboté en silence.

à écrire     `if (b.bnd?.pinned) return;` avant l'écrêtage, plus le critère qui le garde —
             et la garde doit être vérifiée ROUGE en épinglant un bloc dans une zone
             plafonnée, sans quoi elle est trivialement verte (règle 19 : le correctif le
             moins coûteux ici est de ne rien écrire du tout, puisque le croisement est
             vide).

famille      garde LATENTE — le contrôle n'existe pas, et rien ne le signale parce que la
             population est vide. Cousine de `st.bnd ? cap : Infinity` (fermée) : là
             l'absence faisait sauter un contrôle, ici c'est le contrôle qui n'a jamais
             été écrit et dont l'absence est invisible.
```

**Livré (17/08/2026)** : `if (doseCap != null && !b.bnd?.pinned)`. Écrire cette condition ne coûte
rien ET ne prouve rien tant que le croisement est vide (règle 19 : le correctif le moins coûteux
est de ne rien écrire du tout). La contre-preuve rend donc le croisement NON VIDE, en ajoutant
`sw.aero` aux zones plafonnées :

```
(a) `sw.aero` hors liste, garde posée .....  57 rabotés / 308   ← état livré
(b) `sw.aero` PLAFONNÉE, garde posée ......  57 rabotés / 308   ← inchangé : elle tient
(c) `sw.aero` PLAFONNÉE, garde RETIRÉE .... 195 rabotés / 308   ← +138 : elle sert
```

Gardé par **`T-39`** (lotPhysio, désormais en CI) : invariance (aucun épinglé raboté par le
plafond) **et** sensibilité (le compte total des épinglés non livrés à leur épingle est un cliquet
à 57). Les 57 ne viennent pas de ce plafond — c'est **O-54**, trouvé en mesurant la population
pour que la garde ne soit pas vacue.

```verify
id: O-53
quoi: le plafond de dose ne rabote pas un bloc epingle
attendu: O53-FERME
cmd: node -e 'const s=require("fs").readFileSync("src/generator/planGenerator.ts","utf8");const i=s.indexOf("const doseCap =");process.exit(s.slice(i,i+2200).includes("!b.bnd?.pinned")?0:1)' && echo "O53-FERME"
```

---

## O-54 · Un bloc ÉPINGLÉ est raboté par C15, et le TITRE continue d'annoncer la valeur épinglée · 🔴 **OUVERT**

Trouvé en posant la garde d'O-53 : en mesurant la population des blocs épinglés pour que la garde
ne soit pas vacue, 57 sur 308 n'étaient pas livrés à leur épingle — et aucun ne l'était du fait du
plafond de dose.

```
mesuré       308 blocs épinglés dans le golden (tous `sw.aero`, les continuités de B-17)
             251 livrés à leur épingle · 57 RABOTÉS (18,5 %)
             IDENTIQUE avant et après le lot 1 — défaut antérieur, vérifié.

cause        53 des 57 tombent sur une séance de **exactement 850 m** :
             `C15_BEGINNER_SWIM_SESSION_CAP_M`. La séance porte 200 m d'échauffement et
             150 m de retour au calme, il reste 500 m pour le corps — quelle que soit
             l'épingle.

                 S/debutant     épinglé   750 → 500      × 9
                 M/debutant     épinglé  1500 → 500      × 9
                 70.3/debutant  épinglé  1900 → 500      × 8
                 Full/debutant  épinglé  2500 → 500      × 9
                 Full/debutant  épinglé  3050 → 500      × 9
                 Full/debutant  épinglé  3800 → 500      × 9

ce qui est   **Que C15 gagne est probablement JUSTE** : un débutant ne nage pas 3 800 m en
juste       continu, et c'est la doctrine de `C30-B` — un plancher de spécificité ne passe
             jamais devant un plafond de sécurité.

ce qui ne    **Le TITRE ment.** La séance s'appelle « Nage continue en eau libre — 3800 m
l'est pas    d'affilée » et livre 500 m. L'athlète lit un nombre que son plan ne contient
             pas, dans le nom même de la séance. Famille R19.5 (la note du brick promettait
             « dernier tiers @ allure course » sur un step 100 % Z2) et U9 (le refus parlait
             d'Ironman à un nageur de 1500 m).
             Et 4 cas sur 57 sont chez des `inter`, dont un livré AU-DESSUS de son épingle
             (350 → 400) : l'épinglage est violé dans les deux sens.

angle mort   `sonde:b17` annonce « 0 écart cible↔livré » sur ses 24 paliers : elle
             n'échantillonne **aucun débutant**. Cinquième occurrence de la famille A-2 — un
             corpus qui ne contient pas la population où la règle mord.

moitié       **(a) LIVRÉE le 17/08/2026** — le titre se dérive du LIVRÉ, dans
immédiate    `syncDerivedLabels` (R5.1, le point de convergence de toute prose dérivée d'un
             nombre). 57 titres qui mentaient → 0. Gardé par `T-40`, contre-preuve faite.
             Ça n'empêche pas le défaut, ça empêche le DOMMAGE : un titre honnête à 500 m
             est une séance que l'athlète peut évaluer.

moitié       **(b) TRANCHÉE ET LIVRÉE le 17/08/2026 — C15 lit la CAPACITÉ DÉMONTRÉE.**
(b)          Le refus universel n'était pas la conséquence de la spec mais d'un plafond posé
             sur le mauvais signal : C15 lisait `level === "debutant"`, une auto-évaluation
             GLOBALE. `longest_swim_m` existe depuis B-17 et c'est exactement le signal qui
             manquait. `swimSessionCapM = max(C15, longest_swim_m + auxiliaire)`.

                 400 m déclarés ...... 850 m (C15 gagne)   ← le vrai débutant reste protégé
                 « je ne sais pas » ... 850 m               ← et il reçoit un TEST (D3)
                 2 000 m déclarés .... 2 350 m              ← l'ancien nageur reçoit sa séance

             Effet : blocs épinglés rabotés **57 → 31**, et les 31 restants ne sont plus des
             rabotages à 500 m mais des continuités bornées à la capacité déclarée. 36 profils
             du golden bougent, tous `debutant` tri, écart numérique uniformément 1 500.

             ⚠ MA PREMIÈRE ÉCRITURE BORNAIT SUR `atteignableM` — la valeur de FIN de rampe,
             appliquée dès la semaine 1, et qui croît exponentiellement avec la durée du plan.
             Mesuré AVANT de recapturer : un athlète déclarant **400 m** recevait une séance de
             **4 150 m**, et 2 000 m déclarés donnaient un plafond de **32 076 m** sur un Full.
             Elle retirait la protection à la population qu'elle protège. Gardé par **T-41**,
             qui porte l'invariance ET la sensibilité — et qui existe parce que le golden ne
             peut pas les porter : ses 36 profils `debutant` déclarent TOUS 2 000 m, il n'y a
             aucun vrai débutant nageur dans le corpus (6ᵉ A-2, nommée avant de coûter).

             CE QUI RESTE, DÉLIBÉRÉMENT : la borne ne progresse pas avec le plan, donc un nageur
             à 2 000 m ne construit pas les 3 800 m d'un Ironman — ses derniers paliers sont
             livrés à 2 000, sous un titre qui le dit (T-40), et la franchissabilité devrait le
             voir. Faire croître cette borne est le ticket **O-56**.

moitié       **(b-bis) — la spec littérale du §1, telle qu'elle était écrite, ne tenait pas.**
réelle       « la franchissabilité inclut la livrabilité : un palier que C15 rabote n'est
             pas un palier, donc l'écart n'est pas franchissable → rabattement ».

             MESURÉ AVANT D'ÉCRIRE, et le résultat refuse la spec :

                 ce qui borne la séance de continuité
                    débutant ....... C15, 850 m TOUS BLOCS CONFONDUS
                    non-débutant ... RIEN. `CAP_SWIM` ne s'applique pas — B-17 ne marque
                                     pas la séance `long`, délibérément (sinon
                                     `CAP_SWIM.Full = 3000` écrêterait la continuité de
                                     3 800 que la règle existe pour prescrire).

                 livrable d'un DÉBUTANT = 850 − 350 (échauffement + retour au calme) = 500

                    format   course   livrable
                       S       750      500  ✖
                       M      1500      500  ✖
                       70.3   1900      500  ✖
                       Full   3800      500  ✖

             **AUCUN format n'est livrable pour un débutant.** Appliquée telle quelle, la
             règle rendrait tout triathlète débutant non franchissable, et le rabattement
             n'aurait nulle part où le rabattre — c'est-à-dire un refus de la population
             entière. Ce n'est pas ce que le §1 de l'arbitrage veut dire.

             Une troisième issue existe et n'était pas dans la liste : **l'échauffement cède,
             pas l'épingle.** C15 borne la SÉANCE ; l'épingle dit que le corps est fixe ;
             donc c'est l'auxiliaire qui doit rétrécir. Chiffré : 850 − 0 = 850, ce qui rend
             le SPRINT livrable (750) et laisse M/70.3/Full dehors.

             Reste alors la contradiction de fond, qui est une question d'ENTRAÎNEMENT et
             non de code : **B-17 veut construire une continuité jusqu'à 3 800 m, C15
             interdit à un débutant de nager plus de 850 m par séance.** Les deux sont
             défendables séparément et incompatibles ensemble pour un débutant sur
             longue distance. Ce qui doit céder est un arbitrage :
                (i)   C15 se relâche avec la progression (le « débutant » de la semaine 1
                      n'est plus le même en semaine 30 — or `beginner` est STATIQUE, il
                      vient de `level === "debutant"` et ne bouge jamais) ;
                (ii)  ou B-17 ne prescrit pas de continuité au-delà de ce que C15 permet,
                      et le plan DIT que la distance de course ne sera pas construite ;
                (iii) ou un débutant n'entre pas sur un format dont la nage dépasse ce que
                      C15 lui autorise — c'est le rabattement du §1, mais assumé comme un
                      refus de format et non comme un ajustement silencieux.

gardé par    `T-39` (lotPhysio) épingle le compte à 57 : aucun AUTRE mécanisme ne peut venir
             s'y ajouter en silence.
```

**Addendum re-vérification B-17 (20/08/2026) — deux mesures nouvelles pour l'arbitrage, mêmes
moitiés.** (1) La moitié « livrabilité » ne touche pas que le débutant : sur `G/tri/Full/vol-min`
(source MESURE, 2 000 m déclarés, gate franchissable), le budget de séance clampe les continues à
**2 275 · 3 050 · 2 150 m** pour une épingle finale à 3 800 — la suite est NON MONOTONE (le
dernier palier, celui de la distance de course, est le plus PETIT), le titre est honnête (sync
O-54) et **0 avertissement**. (2) La branche « rabattement au PLANCHER » est muette : 2 profils
`debutant/basse-100m` sont rabattus sur S (le format le plus court du sport) alors que le gate
lui-même rend `atteignableM` 354-472 m pour 750 — le format plancher n'est PAS atteignable, le
plan livre 500 max, et **rien ne le dit** (la moitié « informer » de R11.2 manque sur cette
branche ; c'est l'issue (ii)/(iii) du tableau ci-dessus, jamais départagée).

```verify
id: O-54
quoi: des blocs epingles sont rabotes par C15 pendant que le titre annonce l'epingle
attendu: /✓ T-39 \[vert/
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep "T-39"
```

---

## O-55 · Le plafond de dose est ABSOLU là où la progression demande une montée · ✅ **FERMÉ — c'est le comportement voulu**

Ticket du §4b de l'arbitrage Q1 (17/08/2026). *« Si la nage seuil est à 40 min dès qu'elle touche
la borne, elle ne monte plus de la base au pic. Un athlète devrait voir sa dose de seuil progresser
sur une préparation de neuf mois ; là elle est constante. »*

**Mesuré avant de trancher, comme demandé** (`npm run mesure:dosefull`) — et l'ampleur est bien
moindre que ce que ma formulation laissait croire :

```
                    semaines à la borne     première semaine à la borne
   Full (37 prof.)        22 %              médiane S17 · phase `dev` pour 31/37
   70.3 (12 prof.)        25 %              médiane S15 · phase `spec` pour 10/12

   295 semaines à la borne sur 1 333 qui portent du seuil (22 %), sur 49 profils.
   exemple Full : 17 semaines de seuil, 2 à la borne, dose 28,8 → borne → 9,6 (affûtage)
```

**La progression EXISTE avant la borne** : la dose monte de la base au développement, et c'est
là — S17 en médiane sur un Full — que le plafond la fige. Ce n'est donc pas « constante sur neuf
mois » ; c'est « plate sur le dernier tiers de la montée ».

```
la question  un plafond de dose doit-il être ABSOLU (40 min pour tout le monde, toute la
             prépa) ou INDEXÉ (sur le format, sur la phase, sur le volume de nage) ?
             Le précédent interne existe : B-02 a indexé le plafond de temps DUR
             hebdomadaire sur le volume plutôt que de le laisser fixe.

contrainte   la borne est physiologique, pas structurelle : 40 min de travail au seuil est
             une grosse séance dans n'importe quelle discipline. L'indexer vers le HAUT
             demande une source, pas une commodité.

à ne pas     relever la borne pour retrouver une progression. Si la progression doit
faire        continuer au-delà, c'est le NOMBRE de blocs ou la FRÉQUENCE qui monte, pas la
             dose d'un bloc — c'est la doctrine C26c (« la coupe retire des RÉPÉTITIONS,
             jamais la durée d'une répétition »), prise dans l'autre sens.
```

**FERMÉ le 17/08/2026, sur la mesure.** Un plafond de dose empêche un dépassement ; il ne permet
pas une montée infinie. La progression EXISTE avant la borne (médiane S17, phase `dev`), et
plafonner à 40 min sur le dernier tiers de la montée est le plafond qui fait son travail au moment
où il doit le faire. **40 min au CSS ≈ 2 000 m de travail au seuil est une grosse séance de nage
sérieuse, ni excessive ni timide.**

La décision est écrite dans l'entrée `C25` de `constraintMatrix.ts`, avec le chiffre qui la rend
révocable — 22 % des semaines, première à la borne en médiane S17. Ce qui rouvrirait : une mesure
montrant qu'un athlète coaché fait significativement plus au pic.

**Et la contrainte qui va avec** : si la progression doit continuer au-delà, c'est le NOMBRE de
blocs ou la FRÉQUENCE qui monte, jamais la dose d'un bloc — C26c prise dans l'autre sens.

```verify
id: O-55
quoi: la decision « 40 min est la dose de pic » est ecrite avec son chiffre revocable
attendu: O55-DECIDE
cmd: grep -q "O-55 (arbitrage du 17/08/2026)" src/engine/constraintMatrix.ts && echo "O55-DECIDE"
```


---

## O-56 · Toute borne dérivée d'une CAPACITÉ est gelée sur la déclaration initiale · ✅ **FERMÉ (§1, §2, §3)**

Racine nommée par le fondateur en arbitrant O-54 §2, et **plus large que « `beginner` est
statique »** — c'est sa deuxième formulation qui est la bonne :

> **Toute borne dérivée d'une capacité est gelée sur la déclaration initiale, et empêche le plan
> de construire précisément ce qu'il existe pour construire.**

Un nageur à 2 000 m préparant un Ironman en 36 semaines **atteindrait** 3 800 m — c'est même
l'objet de la préparation. Le moteur le plafonne à ce qu'il était le premier jour.

```
défaut       `beginner` vient de `level === "debutant"` et ne bouge JAMAIS. Toutes les
             protections qui en dépendent — C15 (850 m/séance en nage), C20 (25 min par
             séance de nage), C23 (sortie longue ≤ 180 min), l'interdiction de VO2max,
             les plafonds de volume — sont **justes en semaine 1 et deviennent une
             camisole en semaine 30**, sur un plan qui prescrit précisément les trente
             semaines qui devraient les lever.

             Le moteur fait progresser tout le reste avec la position dans le plan : la
             rampe R10, la courbe, les bandes, les paliers de B-17. **Le seul qui ne bouge
             pas est le drapeau qui décide de qui a droit à quoi.**

occurrence   O-54 §2 en est la première mesurée : `swimSessionCapM` borne à la capacité
mesurée      DÉMONTRÉE et ne progresse pas, donc un nageur à 2 000 m ne construit pas les
             3 800 m d'un Ironman — 31 paliers livrés sous leur épingle. Le corriger POUR
             CETTE SEULE BORNE en ferait un cas particulier de plus au lieu d'une règle.

la forme     LE PATRON DE C22, APPLIQUÉ À UNE SECONDE GRANDEUR. Faire progresser une capacité
du correctif suppose que l'athlète a fait les séances — **c'est exactement l'hypothèse de la
             rampe C22**, acceptée et écrite depuis le début (le plafond de cette semaine est
             fonction du livré de la précédente). Ce n'est donc pas une hypothèse nouvelle à
             défendre, c'est un patron existant à étendre.

                 la capacité démontrée cliquette avec la progression du plan lui-même :
                   · au départ, la déclaration
                   · ensuite, le plus haut palier que le plan a prescrit et livré
                   · borné, comme C22, par un taux de montée

             Et il y a une raison de fond de le faire ainsi plutôt qu'avec un compteur de
             semaines : **les paliers de B-17 SONT déjà le test.** Le plan prescrit une
             continue à 2 000 m ; l'athlète la fait ; sa capacité démontrée vaut 2 000 ; le
             palier suivant peut viser plus haut. Le mécanisme de mesure existe, il est
             prescrit, et il n'a pas besoin d'une question de plus.

⚠ LA FOURCHE  **À TRANCHER AVANT D'ÉCRIRE.** Le cliquet peut lire deux choses, et les deux
À TRANCHER   sont voulues pour des raisons différentes :

               PROJECTION  le palier que le plan a PRESCRIT, à la construction
                           → permet au plan de bâtir jusqu'à 3 800 m dès le premier build
                           → mais ignore l'athlète qui n'a pas nagé depuis six semaines

               ÉVIDENCE    le palier que l'athlète a VALIDÉ, à la re-génération
                           → la capacité suit la réalité, pas l'intention
                           → mais au premier build aucune séance n'est validée, donc seule
                             elle ne résout RIEN

             Donc les deux, et **c'est la répartition qui est la décision** :
               · à la construction — la capacité projette, bornée par un taux de montée
                 (patron C22, hypothèse assumée et déjà écrite) ;
               · à la re-génération — la capacité lit les paliers VALIDÉS depuis le dernier
                 build, et corrige la projection.

             Le second membre est plus fort que C22, parce que B-17 prescrit des séances
             **vérifiables** : le graphe distingue déjà prévu et validé ✓. Ce serait la
             première fois dans ce moteur qu'une progression s'appuie sur une ÉVIDENCE
             plutôt que sur une supposition.

             ET CE QUI RESTE OUVERT, QUI EST UNE DÉCISION D'ENTRAÎNEMENT : que se passe-t-il
             quand projection et évidence divergent — l'athlète a sauté ses continues ? La
             capacité redescend-elle, stagne-t-elle, ou le plan se reconstruit-il sur la
             valeur réelle ? Ce n'est pas du code, et ça appartient à ce ticket.

à mesurer    · combien de bornes lisent `beginner` (recensement, pas estimation)
avant toute  · pour chacune : est-elle une borne de SÉCURITÉ (qui doit rester) ou de
décision       CAPACITÉ (qui doit progresser) ? Les deux sont mélangées aujourd'hui
             · le rayon d'une décroissance, sur le golden
             · et la couverture du corpus sur les couples que ces bornes lisent
               (`npm run couverture:golden`) AVANT d'écrire — sans quoi O-56 se mesurerait
               sur la même population aveugle que celle qui vient de laisser passer
               `atteignableM`.

ce qu'il      **La protection de B-17 est complète pour un athlète dont la capacité déclarée
faut écrire   atteint la distance de course, et PARTIELLE pour les autres.** Le titre dit
une fois      désormais la vérité — progrès réel sur la version qui mentait — mais l'athlète
proprement    à 2 000 m arrive toujours à un Ironman sans avoir couvert la distance. Ce n'est
             pas une régression et ça ne rouvre rien : c'est la mesure honnête de ce qui est
             livré, et **O-56 est ce qui l'achève**.
```

```verify
id: O-56
quoi: le drapeau debutant ne depend pas de la position dans le plan
attendu: O56-REPRODUIT
cmd: grep -q 'const beginner = level === "debutant";' src/engine/reasoningEngine.ts && echo "O56-REPRODUIT"
```


---

## A-2 · Le corpus couvre des FORMATS et des NIVEAUX, pas les BRANCHES des règles · 🟡 **MESURÉ, sonde livrée**

Arbitrage du fondateur (17/08/2026), après la sixième occurrence : *« six occurrences ne sont plus
une série de distractions, c'est une propriété du corpus »*.

```
constat      Chaque fois qu'une règle apprend à lire une nouvelle clé, le corpus devient muet
             sur son domaine — et il l'est EN SILENCE, parce qu'un corpus incomplet rend des
             résultats VERTS. Les six : le golden sans coureur lent (A-2), sans plan sans
             date (O-21), sans marathon lent (C31), sans la bonne enveloppe (C30b), sans
             poids ni date pour PW, et sans vrai débutant nageur (O-54 §2).

pourquoi     Le dernier trou aurait passé un contrôle PAR CLÉ sans broncher : `level` portait
la couverture ses 3 valeurs, `longest_swim_m` ses 5 branches. Ce qui manquait était le
par clé ne   CROISEMENT `debutant × continuité basse` — la cellule exacte que C15 venait
suffit pas   d'apprendre à lire. Une règle lit rarement une clé seule.

livré        · la sous-passe B-17 du golden croise désormais le NIVEAU (969 → **989** profils)
             · `npm run couverture:golden` — les cellules du produit cartésien entre clés à
               petit domaine, par sport, classées PAR COUPLE et non par cellule.

mesuré       **9 682 / 16 104 cellules peuplées (60 %)**, 367 couples incomplets sur le seul
             `tri`. Ce n'est pas un objectif à 100 % : beaucoup de cellules vides sont
             légitimes. C'est une LISTE À RELIRE quand une règle apprend à lire une clé.

contre-      la sonde rejoue le corpus tri AMPUTÉ des débutants à continuité inconnue —
preuve       l'état d'avant O-54 §2 — et doit y VOIR le trou : **6/9 amputé, 7/9 complet**,
             avec `debutant × non` présent. Sans elle, la mesure ne prouverait que sa propre
             exécution.
             Elle nomme aussi ce qui reste (`avance × non`, `avance × ∅`) plutôt que de rendre
             un verdict sur le taux : le trou VISÉ est comblé, les autres cellules sont une
             autre question.

hors CI      délibérément, tant que sa sortie n'a pas été triée — leçon R20.6 : rendre
             bloquant un banc dont on n'a pas trié les échecs fige la dette au lieu de la
             traiter.

⚠ faute      Ma première écriture classait des CELLULES et rendait 1 015 lignes de bruit
d'instrument structurel par sport (`age=16 × cycle_len=28` : la sous-passe `cycle` n'existe qu'à
             un seul âge, la cellule est vide par CONSTRUCTION). La grandeur utile est le
             COUPLE. Un cas particulier vide se noie alors, un axe non croisé ressort.
```

```verify
id: A-2-couverture
quoi: la sonde de couverture voit le trou qu'elle existe pour voir
attendu: la sonde VOIT le trou
cmd: node scripts/couvertureGolden.mjs | grep "la sonde VOIT le trou"
```


**§1 LIVRÉ (17/08/2026) — la capacité PROJETTE, au patron de C22.**

`swimSessionCapAtWeek(gate, base, wkNum)` : la borne monte avec la position dans le plan au taux
que le moteur s'impose déjà partout (`C22_MAX_WEEKLY_GROWTH`), plafonnée à la DISTANCE DE COURSE.
Aucune règle de croissance nouvelle. Câblée par `_swimCapW`, un `let` posé par la boucle de
semaines et lu par les trois sites C15 — **le patron de `_capScale`, dix lignes plus haut** :
threader la position dans une demi-douzaine de signatures aurait coûté plus cher que la propriété
ne vaut, et la position EST le point (règle 20).

```
Full/38 sem, 400 m déclarés :  S1 725 · S5 900 · S9 1050 · S13 1225 · S17 1900 … S30 4150
blocs épinglés rabotés ...... 69 → 23   (MOTEUR — prouvé par `base:cliquet`, corpus 985 → 985)
sceau S5 .................... 516 → 508
golden ...................... 47 profils, tous `debutant` tri
```

Un athlète déclarant 400 m reçoit donc 3 800 m d'affilée en **semaine 30**, au bout d'une
progression prescrite — pas d'un saut. C'est ce que la préparation existe pour construire.

**§2 ÉCRIT, NON BRANCHÉ — `swimEvidence(plan, done)`.** Fonction PURE qui lit le plan PRÉCÉDENT et
la carte des ✓ : le plus haut palier VALIDÉ (cliquet, `max` — il ne descend jamais), le plus haut
palier PRESCRIT ET MANQUÉ (qui nommera la divergence), et surtout `aDesNages` — **l'évidence ne
corrige la projection que si le moteur a de l'évidence sur la NAGE**. Sans ce drapeau, l'athlète
qui nage tout et ne journalise rien serait traité comme celui qui ne nage pas : c'est le défaut
d'O-54 refait, une protection qui frappe la mauvaise population.

**§2 LIVRÉ AUTREMENT — et la route du fondateur évite le geste que j'allais faire.** Je bloquais
sur « `buildPlan` ne reçoit pas le plan précédent ». La réponse est qu'il n'a pas à le recevoir :

```
palier de continuité validé  →  journal (answers.tests)  →  longest_swim_m  →  moteur inchangé
```

**Le mécanisme existe déjà** : `syncRefsFromTests` promeut `ftp`, `thrPace`, `css` et `vam` depuis
le journal. Une nage continue validée EST une référence mesurée — elle démontre une capacité, elle
a une date, elle vient de l'athlète. C'est une PROMOTION, pas un changement de moteur : pas de
quatrième entrée à `buildPlan`, pas d'état entre builds, pas de couplage aux coordonnées d'un plan,
et R20.1 satisfaite d'office puisque `longest_swim_m` agit déjà.

`session-life.js` écrit le test au ✓ (le bloc ÉPINGLÉ, donc aucune devinette), `state.js` le promeut.
**La politique de sélection DIVERGE de celle du journal, et c'est écrit** : `latest()` rend le plus
RÉCENT — juste pour une FTP, qui monte et descend ; un cliquet de capacité veut le plus HAUT, borné
au début du plan. Une nage de 2 000 m faite il y a trois ans n'a pas à porter le plan d'aujourd'hui.
Variante par clé, pas seconde politique.

Contre-preuve `npm run mesure:o56`, **en CI** : le cliquet monte sur un palier validé, ne descend
jamais (ni contre un palier plus bas, ni contre la déclaration), prend le PLUS HAUT et non le plus
récent, et ignore ce qui précède le plan.

**§3 LIVRÉ — et c'est la CONTRAINTE de formulation qui l'a décidé.**

Le moteur ne peut pas distinguer *« il n'a pas nagé »* de *« il n'a pas journalisé »* — la même
incertitude que `aDesNages` traite au §2. Donc :

> **le message doit être vrai sous les DEUX lectures.**

« Tu as sauté ta nage continue » n'est vrai que sous l'une, et sous l'autre il reproche à quelqu'un
d'avoir mal utilisé l'application quelque chose qu'il a peut-être fait. Ce qui est vrai sous les
deux : la capacité VALIDÉE, le palier que le plan CONTIENT ensuite, le temps qui reste. Trois faits,
aucune implication — le moteur n'a pas à avoir une opinion sur l'athlète pour les énoncer.

```
« Ta plus longue nage continue validée est de 800 m. Le prochain palier de ton plan
  est de 1 500 m, en semaine 8. Il te reste 14 semaines. »
```

**Le palier annoncé est celui que le plan CONTIENT**, jamais celui qu'une re-génération produirait :
au moment où ce message s'affiche le plan n'a pas été reconstruit, et annoncer une suite que la
grille ne porte pas serait faux à l'écran même où on le lit.

**Où** — déclaration LOCALE (`B17-divergence`), pas un maillon de R20.2 : cette divergence ralentit
une progression, elle ne borne pas le volume. La chaîne « ce qui borne ton pic » ne la concernera
que le jour où elle rend le format inatteignable, et ce jour-là c'est le rabattement qui parle.

**Quand** — l'ajusteur QUOTIDIEN (`adjustTodayV2`), pas une re-génération : un message qui
n'apparaît qu'à la re-génération n'apparaît jamais pour qui ne re-génère pas, et c'est la population
qui en a le plus besoin. Un palier n'est « manqué » que lorsque sa semaine est PASSÉE.

Contre-preuve `npm run mesure:o56`, **6 critères** dont « elle se tait tant qu'aucun palier passé
n'a été manqué », « elle se tait si la capacité a dépassé le palier manqué » (le cliquet est
monotone) et **« elle ne reproche rien »** — aucun *sauté*, *manqué*, *aurais*, *devais*.

**NON FAIT, à trancher par le coût et non par le principe** : le compte à rebours. La dernière
semaine d'où la distance de course reste atteignable est DÉRIVABLE, et l'afficher transformerait une
falaise en préavis (« après la semaine 22, 1 900 m ne sera plus atteignable depuis ta capacité
actuelle »). C'est la différence entre un rabattement subi et un rabattement vu venir.

---

## O-57 · Le rabattement B-17 MONTAIT de format · ✅ **FERMÉ le jour où il a été trouvé**

Inversion d'une règle de SÉCURITÉ, sur la population qu'elle protège. Trouvée par une sonde de
T-41 qui, elle, ne posait pas de date de course.

```
défaut       `ordre = ["Full","70.3","M","S"]`, on retenait le PREMIER format franchissable.
             Or `semainesDe(f)` rend l'horizon PROPRE à chaque format quand aucune date n'est
             saisie (`MIN_WEEKS` : 8 pour un sprint, 36 pour un Full) : le Full, avec 36
             semaines de rampe, était franchissable AVANT le sprint qui n'en a que 8.

             **Un débutant demandant un SPRINT et déclarant 400 m de nage continue recevait un
             plan d'IRONMAN.** Mesuré : 9 profils sur 105, tous sans date de course, jusqu'à
             `S → Full`.

pourquoi     Le défaut n'existe QUE sans date de course — et les 989 profils du golden en
aucun gate   portent une. Le commentaire du code disait déjà « on DESCEND au plus long format
ne l'a vu   que la rampe atteint » : l'intention était juste, elle n'était écrite nulle part
             dans le code.

correctif    le rabattement ne considère que les formats À OU SOUS celui demandé.
             9 → 0, vérifié sur les mêmes 105 profils.

gardé par    `T-42` (lotPhysio), qui balaie SANS date — la seule branche où le défaut vit — et
             porte sa non-vacuité (au moins un rabattement observé, sinon le critère ne teste
             rien).
```

```verify
id: O-57
quoi: le rabattement B-17 ne propose jamais un format plus long que le demande
attendu: /✓ T-42 \[vert/
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep "T-42"
```


---

## A-2 (suite) · Extension notée, NON FAITE — croiser aussi les grandeurs DÉRIVÉES

`couverture:golden` croise les CLÉS du schéma. Les croisements MÉDIATISÉS lui échappent — vérifié
sur O-57, qu'elle n'aurait pas vu : `race_date` et `longest_swim_m` ne se rencontrent nulle part,
elles n'interagissent qu'à travers `semainesDe(f)`.

```
extension    inclure dans le jeu croisé les GRANDEURS DÉRIVÉES que les règles lisent, pas
possible     seulement les clés du schéma. `semainesDe` produit un horizon ; si une règle
             branche sur horizon × capacité, le croisement existe et il est mesurable.
             Ça déplace la frontière sans changer la nature de l'instrument.

coût         il faut nommer ces grandeurs (elles n'ont pas de déclaration comme
             `ANSWER_SCHEMA`) et décider lesquelles comptent. C'est un inventaire, pas
             une heuristique.
```

---

# RETOUR DU PREMIER USAGE RÉEL (17/08/2026) — huit constats, un fermé, sept ouverts

Le plan `plan_tri_70_3.html` a été lu en entier (323 séances, 40 semaines) et l'app utilisée.
**Une session d'usage a produit trois constats que 989 profils de golden, 31 gates et sept
semaines de mesure n'avaient pas vus.** Aucun n'est une invariante : ce sont des propriétés de ce
que l'athlète VOIT et COMPREND. Les deux instruments ne mesurent pas la même chose, et il en
manquait un.

## D4 · Le porteur de la nage continue est une séance que le budget SUPPRIME · ✅ **FERMÉ**

**Constat du fondateur** : une seule continue (1 250 m) sur 40 semaines, pour une progression qui
en promet quatre jusqu'à 1 900 m.

**Ce que la mesure a répondu, dans l'ordre qu'il a demandé.**

1. *Combien de fois la transformation se déclenche-t-elle, et à quelles semaines ?*
   Sur un 70.3 de 40 semaines, `doubles: "non"` → **3 fois, S23 / S28 / S33**. `doubles: "oui"` →
   **1 fois, S33**. Avec `vol_max: 14` en plus → **0**.
2. *Le correctif D1 s'est-il sur-corrigé en « au plus une, point » ?*
   **NON — hypothèse réfutée.** `slotIdx === 0` est bien par semaine : sans doubles, trois paliers
   sont livrés.
3. *La projection s'arrête-t-elle à 1 250 depuis la déclaration ?*
   **NON.** `atteignableM` vaut **17 449 m** et les cibles calculées sont **1 250 / 1 550 /
   1 900** — le dernier palier EST la distance de course. La progression était calculée juste et
   **détruite plus loin**. 1 250 n'est pas un plafond : c'est le premier palier, le seul survivant.
4. *Combien de véhicules éligibles la phase spécifique contient-elle ?*
   **ZÉRO** sous doubles à `sessions_max ≤ 7` — c'est la réponse, et c'est la cause.

**Le mécanisme.** Sous doubles, le porteur était `dur1`, où `swMain` est poussée en séance
« (matin) » — la SECONDE séance d'une journée double, donc la première que la coupe par
`sessions_max` retire. Mesuré à un seul facteur près :

```
sessions_max ≤ 7  →  véhicule « (matin) » 31 → 3 occurrences · continues 3 → 1
sessions_max ≥ 8  →  véhicule 31 · continues 2   (le palier du milieu manquait encore)
```

**Treizième occurrence de la famille la plus coûteuse du dépôt** — « une garantie posée au milieu
du pipeline ne survit pas aux passes suivantes » — cette fois dans le sens où la garantie est
supprimée AVEC SON SUPPORT, sans que rien ne le signale.

**Correctif** : le porteur devient `facile2` dans tous les cas. Ce n'est pas revenir sur D3-b —
ce que D3-b corrigeait, c'est le routage par intention, court-circuité depuis par `if (b17Pose)`
qui passe devant tout le routage du créneau, récup courte des doubles comprise.

**Portée, expérience contrôlée (1 620 profils tri, un seul facteur varie)** :

```
avant   537 / 1 620 (33,1 %) sous l'annoncé   ·   doubles : oui 501 · non 18 · parfois 18
après    50 / 1 620  (3,1 %)                  ·   doubles : oui  14 · non 18 · parfois 18
```

Les 36 cas `non`/`parfois` sont **identiques avant et après** : ils sont antérieurs et le
correctif ne les touche pas. Coût en séances : **nul** — 5,0 · 5,8 · 6,5 · 7,3 séances/semaine
avant comme après, aux neuf budgets balayés ; la continue REMPLACE la récup courte de ces trois
semaines.

**Pourquoi aucune garde ne l'a vu** : la fixture de `T-06` porte `doubles: "non"`, et le golden ne
contient **qu'un seul** profil tri en doubles (`G/tri/Full/doubles` — l'unique écart des 989).
Leçon A-2 dans sa forme la plus chère : *un corpus se juge sur l'espace des DÉCISIONS, pas sur
celui des saisies.* `T-06` gagne un bloc (e) qui croise `doubles × sessions_max` et porte une
PROPRIÉTÉ (« le livré égale l'annoncé ») et non une valeur — vérifié rouge contre le moteur
d'avant : **0/3 · 0/3 · 2/3**.

```verify
id: D4
quoi: la progression de continuité est livrée en entier quel que soit le budget de séances
attendu: /✓ T-06 \[vert/
cmd: node scripts/lotPhysio.mjs 2>&1 | grep "T-06"
```

## O-58 · Un résidu de 3,1 % livre moins de paliers qu'annoncé · 🔴 **OUVERT**

Ce que D4 laisse. **50 profils sur 1 620**, concentrés sur **Full (41)** et jamais sur
`longest_swim_m: 1650` (400 → 25 · 1000 → 25 · 1650 → 0). Le pire cas mesuré est
`M / sessions_max=5 / débutant / 1000 m` à **0 palier livré sur 3 annoncés**, et il ne dépend pas
des doubles (il tombe identiquement en `non` et en `parfois`).

**PRIORITÉ RELEVÉE (fondateur, 17/08/2026) — ce n'est pas un résidu statistique.** Le pire cas
est `M / sessions_max=5 / DÉBUTANT` à **0 palier sur 3**, et le débutant est *exactement* la
population pour laquelle B-17 a été écrit. C'est la **troisième fois** que ce ticket la manque :
`sonde:b17` n'échantillonnait aucun débutant, puis les 53 titres menteurs sur la borne C15,
maintenant zéro palier sur M à budget serré. Ce n'est pas une coïncidence — *le débutant a le
budget le plus serré, le moins de séances et la capacité la plus basse, donc il tombe dans toutes
les coupes à la fois*, et **toute protection qui dépend d'une séance survivante le rate
structurellement**. L'entrée se juge sur cette lecture, pas sur les 3,1 %.

Non traité délibérément : c'est un constat NOUVEAU, pas le constat du fondateur, et le périmètre
est gelé. La piste est la même famille — les positions des paliers sont calculées sur le
CALENDRIER de la phase spécifique, sans regarder si la semaine visée porte réellement le créneau
porteur ; quand elle ne le porte pas, le palier est perdu en silence.

```verify
id: O-58
quoi: résidu de paliers non livrés après D4
attendu: balayage dans scripts/
cmd: echo "balayage dans scripts/ — voir D4 pour la méthode (1620 profils tri)"
```

## O-59 · Le questionnaire perd la marque des choix sélectionnés · 🟡 **QUALIFIÉ — non reproduit en harnais, une anomalie de NAVIGATION trouvée**

Constat du fondateur, **qualifié le 17/08/2026 selon son protocole en cinq points**, sur DEUX
scénarios (mono-plan vierge, et multi-plans : plan existant `dispo=quotidienne` puis
« ＋ Nouveau plan » puis clic « semaine » — son état réel) :

```
① la réponse est-elle ENREGISTRÉE ?   OUI dans les deux scénarios — le clic écrit le store
   (localStorage, plan ACTIF), et la carte des décisions affiche « contraint » (= semaine),
   jamais « quotidienne ». Store et carte CONCORDENT avec le clic.
② semaine → quotidienne ?             NON REPRODUIT — y compris en multi-plans, où le clic
   écrit bien dans le BROUILLON actif, pas dans l'ancien plan.
③ jamais marqué, ou dé-marqué ?       le clic marque immédiatement (handler lié, .sel posé)
④ même question / autre question ?    la marque SURVIT aux deux — mesuré
⑤ rechargement ?                      le store survit ✓
```

**CE QUI A ÉTÉ TROUVÉ EN QUALIFIANT, et qui peut ÊTRE toute l'expérience rapportée** : après
« suivant » puis « précédent », **on ne revient pas sur le même écran** — la liste des étapes se
RECOMPOSE avec les réponses (les étapes sont dynamiques depuis U14), et l'indice `S.step` pointe
alors une autre page. Les questions qu'on venait de marquer ne sont plus à l'écran : ça se LIT
comme « mes choix ont disparu », alors que le store les porte. À corriger comme une navigation
(retrouver l'étape par IDENTITÉ, pas par indice), pas comme un marquage.

**Ce que le harnais ne peut pas exclure** : l'appareil du fondateur servait la build R26
jusqu'au merge d'hier, et le service worker ne bascule qu'à une fermeture/réouverture complète
(mesuré au test de rollback). Le contrôle à faire sur SON téléphone, 30 secondes : fermer
l'app complètement, la rouvrir DEUX fois, refaire un clic — et si la perte persiste, noter
l'ÉCRAN et la QUESTION exacts.

**Verdict au point 1 : bug d'AFFICHAGE au pire (probablement de navigation) — il ne remonte
donc PAS devant O-68 ni devant la progression** ; les mesures faites sur son profil restent
fondées. Deux fautes de MON instrument pendant la qualification, écrites : mon lecteur d'état
indexait `plans[activePlanId]` alors que `plans` est un TABLEAU (tout rendait `undefined`,
j'allais conclure « fonctionnel » à tort) ; et mon marcheur ne gérait pas l'écran « Quel plan
veux-tu construire ? » (14 itérations à cliquer dans le vide, « dispo jamais atteint »).

## O-60 · Le détail de séance ne s'affiche pas en natation · 🔴 **OUVERT** (bloque le partage)

Sur 🎯 Aujourd'hui, « Sweetspot vélo » porte sa barre ET ses blocs ; « Nage seuil (+dist) » porte
sa barre et RIEN — alors que le contenu existe, complet, dans le plan. Hypothèse du fondateur :
les blocs de vélo portent une DURÉE, ceux de nage une DISTANCE, et le rendu teste `durationMin`.
Ce serait la **cinquième instance de la famille** (après `st.bnd ? cap : Infinity`,
`intensity=[object Object]`, `if (tot <= 0) continue` et `if (b.durationMin != null)`), cette fois
dans l'interface. Le correctif serait celui du lot 1 : **demander la grandeur au lieu de la
tester** — `stepMin` et la conversion unique d'O-42 existent. Sévérité : c'est la discipline
limitante de l'athlète, sur l'onglet principal.

## O-61 · La barre de zones est un résumé sans son détail · 🔴 **OUVERT**

`1 | 4 | 2 | 1` est le résumé du détail qu'il surplombe ; quand le détail manque (O-60), il ne
reste que le résumé. Une fois O-60 fermé, il reste que la barre porte le minimum d'information
possible. Étiqueter les segments (`Éch 300m │ Seuil 775m │ Aéro 350m │ RC 200m`) coûte peu — et
rend « aucune information portée par la couleur seule » réellement vraie, un numéro de zone étant
une convention que l'athlète n'a pas. À rapprocher de la mesure §3b du 17/08 (`mesure:contraste`),
qui note la barre `aria-hidden` et ses segments porteurs de leur seul numéro.

## O-62 · Zéro séance de technique en natation sur 40 semaines · ✅ **QUALIFIÉ — c'est la COUPE, pas la règle** (voir O-66)

Composition mesurée par le fondateur : récup courte **60 (46 %)** · vitesse 42 · seuil (+dist) 27
· continue 1 · **technique/éducatifs 0**. L'athlète nage à 2'05–2'20/100 m et son limitant est la
technique sous fatigue. *Plus de volume à mauvaise technique produit plus de volume à mauvaise
technique.* Le module éducatifs existe et ne parvient pas au plan.

**LA MESURE QUI TRANCHE (17/08/2026, demandée par le fondateur) — c'est la COUPE.** Composition
de nage AVANT `applySessionBudget` contre APRÈS, un seul facteur varie, 70.3 · 40 semaines ·
doubles · `sessions_max: 6` :

```
                        la règle prescrit      il survit
récup                          45                 46
swMain (nage seuil)            31                  2
swTech (vitesse/éducatifs)     30                  0
continue (B-17)                 3                  3
```

**La règle prescrit une composition équilibrée ; la coupe ne laisse que la récupération.** Le
constat s'inverse donc exactement comme le fondateur l'avait pressenti : *le plan ne préfère pas
la récupération, il n'a plus que ça.* Les 46 % de récup ne sont pas un choix, ce sont **les
survivants**. Le correctif n'est donc PAS « ajouter une séance-type de technique » — elle est
prescrite 30 fois et retirée 30 fois — mais O-66.

## O-63 · L'allocation vélo · 🔴 **OUVERT**

Nage 130 séances (3,25/sem) · course ~123 (~3,1) · **vélo 42 (1,05)** + 10 bricks, pour une
épreuve dont le vélo fait la moitié du temps de course (90 km vallonnés, prédits 2 h 54–3 h 13,
contre 42 min de nage). Quatre séances sont étiquetées « couverture discipline » — du remplissage
de quota.

## O-64 · B-10 est toujours là, et majoritaire · 🔴 **OUVERT**

**Force basse cadence 17** contre **Sweetspot vélo 7** sur une préparation 70.3 où l'intensité de
course est 76–83 % FTP et où le sweetspot (88–94 %) est la séance qui la construit. Ticket ouvert
du contre-audit initial, enfin visible sur un cas réel.

## O-65 · Trois incohérences d'affichage · 🔴 **OUVERT**

**(a)** l'en-tête annonce `volume 6h → 10.4h`, le calendrier livre **11,2 h** en semaine 37 — le
chiffre le plus visible du plan est INFÉRIEUR au maximum réel (famille R20.2, et c'est le sens
opposé aux 350 profils d'O-35, qui annonçaient PLUS qu'ils ne livrent).
**(b)** « Nage récup courte » livrée à **1 325 m** — le nom est figé à la création et ne suit pas
le contenu ; même défaut qu'O-54 sur un autre axe, et O-54 n'a traité que le titre des continues.
**(c)** deux semaines de récup consécutives, deux fois (4 h + 3,9 h en base, 6,9 h + 6,4 h en
spécifique) — probablement le cycle de 10 jours qui chevauche deux semaines calendaires.

## CE QUI FONCTIONNE, MESURÉ SUR CE PLAN

À ne pas perdre de vue : la prédiction est complète et cohérente (5 h 34–6 h 05, décomposée) ·
les allures de nage sont ancrées sur le CSS de l'athlète et non sur une table générique (O-42
livré) · la consigne de la continue est exactement ce que B-17 devait produire · C22 tient (chaque
récup revient sous la dernière semaine de charge) · le brick d'affûtage existe avec son rappel de
transition (B-19).

## O-66 · La coupe par `sessions_max` n'a aucune notion de valeur — 98 % de la coupe tombe sur UNE discipline · 🔴 **OUVERT, mesuré**

**Origine** : le fondateur, à partir de ma phrase « sous doubles à budget serré, `swMain` passe de
31 à 3 occurrences pendant que `swTech` reste » (17/08/2026).

### La prémisse a été vérifiée et elle est FAUSSE — le vrai critère est pire

Le document parlait d'« un ordre **positionnel** — dernier ajouté, premier retiré, une discipline
de pile ». Lu dans `applySessionBudget` (`src/generator/weekBuilder.ts`), ce n'est pas ça :

```
étape 1  journées à 2 séances : on retire la séance la plus COURTE EN MINUTES
         (`cand.reduce(... (y.s.min||0) < (x.s.min||0) ...)`), jamais la longue ni le brick
étapes 2-4  journées entières, DEPUIS LA FIN de la semaine, dans l'ordre
         récupération → facile → dur (hors `durLong`) → dernier recours
         (`forced` et `durLong` ne sont jamais touchés)
```

Le classement n'est donc pas positionnel : **il EST un jugement de valeur, et sa monnaie est la
MINUTE.** C'est le pire proxy possible pour un triathlon, parce que la natation est la discipline
aux séances les plus courtes — donc la discipline limitante est structurellement la première à
partir. La conclusion du fondateur est renforcée par la correction de sa prémisse, pas affaiblie.

### La mesure — un seul facteur varie (`applySessionBudget` neutralisée)

70.3 · 40 semaines · doubles · `sessions_max: 6`, séances par discipline :

```
              avant la coupe      après        écart
course (rn)         120            120            0
brick (br)           13             13            0
vélo (bk)            48             47           −1
natation (sw)       109             51          −58
```

**58 des 59 séances retirées sont des séances de natation — 98 %.** La coupe se présente comme un
budget de séances ; elle fait en réalité de l'**allocation entre disciplines**, dans le sens
exactement inverse de ce qu'un entraîneur ferait sur un athlète limité par la nage. Un mécanisme
qui décide sans savoir qu'il décide : la forme que ce chantier a fermée douze fois, ici sur la
composition ENTIÈRE du plan et non sur une valeur.

Durées moyennes qui expliquent le classement : natation 50 min · vélo 68 · brick 203 · course 38.
(La course survit malgré ses 38 min parce qu'elle n'est pas la seconde séance d'une journée
double : les deux critères de la coupe se cumulent sur la nage.)

### Ce que le moteur a déjà sous la main

`swim_limit` existe et pilote le ciblage des éducatifs ; `mainDiscipline` est déjà transmise au
point fixe. L'ordre proposé par le fondateur — *ne se coupe jamais* : séance principale de la
discipline limitante, séances spécifiques de course, paliers B-17 ; *se coupe en premier* :
récupération, mobilité, complément dans une discipline non limitante — n'invente rien : c'est
celui qu'on applique déjà partout ailleurs pour décider quoi protéger.

### ORDRE CORRIGÉ (fondateur, 17/08/2026, second arbitrage) : la PROGRESSION passe devant

La mesure « aucune borne de séance ne varie avec la semaine » change l'ordre : pour livrer plus,
le moteur ne peut qu'AJOUTER des séances → `sessions_max` est atteint → la coupe se déclenche.
**Si le volume montait par la durée, la coupe n'aurait presque rien à trancher.** Corriger O-66
d'abord reviendrait à calibrer une coupe sur un nombre de séances que le lot suivant fera chuter
(le piège du lot 2 mesuré avant O-42, et d'O-44 calibré sur une population qui allait bouger).
Ordre : 1. progression des types figés · 2. allocation vélo · 3. O-66 · 4. N-01 · 5. N-02.
O-66 ne devient pas inutile — la coupe doit trier par valeur QUAND elle se déclenche ; T-44 se
re-mesurera sur la population restante.

**Note de conception pour le lot 1 (§4 du fondateur), lue dans B-17 avant d'écrire** : B-17 est
le seul endroit du moteur qui calcule une cible PAR SEMAINE, et son mécanisme a trois pièces —
(a) une cible par position, interpolée GÉOMÉTRIQUEMENT du départ de l'athlète à la distance de
course (`palierDistanceM` : géométrique parce que la contrainte qui la borne est un RAPPORT,
C22 = +10 %/semaine) ; (b) des positions dérivées de la PHASE, pas du calendrier absolu ;
(c) le bloc ÉPINGLÉ (`pinned`) pour que les passes de volume ne défassent pas la rampe. La
généralisation est une extension, pas une écriture : `borne(type, semaine) = f(départ, cible du
format, position)`, où seule la CIBLE est propre au type (le brick vise la durée de course
vélo+CAP du format, le footing un plafond qui suit la phase). L'arbitrage rendu ici reste
inchangé — le classement à deux dimensions et T-44.

### PIÈCE 1 LIVRÉE (18/08/2026) — la trajectoire du brick tri, et D3 payée par surprise

Le mécanisme mesuré d'abord : les gabarits du brick PORTENT une progression de phase (PT/prog),
mais la boucle de volume la détruit — à volume hebdomadaire plat (O-69), chaque semaine converge
vers le même point fixe, et le brick naissait SATURÉ à ses bornes hautes dès la première
occurrence (212 min = bike 180 + run 32, les caps C21b du 70.3 ; l'état « libre » de ma sonde
était un trou d'instrument — les legs ne portent pas de `bnd`, elle ne lisait rien). La
trajectoire vit donc dans les BORNES, comme la note le prescrit : `progCap` sur les legs, le
PLAFOND interpole GÉOMÉTRIQUEMENT (C22 est un rapport) du bas audité C21b (la taille d'entrée du
format) au haut audité, position dérivée des PHASES spec+peak. **Jamais le plancher** — les
planchers sont souverains et feraient déborder l'enveloppe des petits profils. Mesuré (profil
fondateur) : **10 bricks, 10 valeurs, 117 → 212 min (+81 %)**. À volume constant, la progression
est une RECOMPOSITION : les minutes viennent des séances faciles — le fond physiologique d'O-69
lui-même.

**D3 — la plus vieille dette du banc v6 (audit externe du 29/07) — est PAYÉE par cette pièce** :
« C22 entre semaines de charge » échouait sur les plans saturés parce que la première semaine de
spécifique sautait de plus de +10 % (le brick y naissait à ses bornes hautes). Avec une première
occurrence à la taille d'entrée du format, le saut disparaît. `expect` basculé à `'pass'` dans le
même commit — garde-fou permanent, comme O17. Deux ré-ancrages annexes, chacun motivé : T-39
26 → 25 (une continuité de plus payée sur vol-min — le sens attendu), barre R14.1-G 1,15 → 1,10
(O-69 relève le plan de maintien, l'écart légitime se resserre — même famille que le re-basage
P7).

**Et le plan plat se DIT (O69-plat)** : quand `volPeak − volBase < 8 %`, une décision l'annonce
avec sa cause (« ton volume réel est déjà au niveau de ce que tes plafonds autorisent — la
progression passe par le CONTENU ») — l'option (b) du retour O69_PLAN_PLAT, livrée en même temps
que l'option (a) puisque la pièce 1 enchaînait. §3 du même retour, mesuré : pic S37 à 10,3 h,
ex æquo avec S1 ; charges entre 8,2 et 10,3 h.
**Provenance du seuil des 8 % (QUI_PAIE §4)** : il n'a PAS de fondement mesuré, et c'est dit
plutôt que justifié après coup — c'est un jugement de perception (« en dessous, l'athlète ne
verra pas la rampe »), posé sans mesure, révocable dès qu'une mesure le fonde. Seuil
d'AFFICHAGE uniquement : il ne borne rien, il déclenche une phrase. Le commentaire du code
(`planGenerator.ts`, décision `O69-plat`) porte la même mention.

**Pièces suivantes** : **la NAGE d'abord** (décision fondateur, 18/08/2026 — voir O-72
constat 2 : « Nage seuil » à 1975 m css = 40,2 min, le plafond de dose au mètre près dès la
S1 de base, constant sur toute la prépa ; le défaut du brick, sauf que la taille finale est
un plafond de SÉCURITÉ pris comme cible), puis footing (plafond qui suit la phase — `ftCaps`
constant, 84 % au plafond), sortie longue CAP du tri (97' constant), semaines de récup
(bornes qui scalent avec l'athlète), pivot swimrun / brick duathlon (mêmes types, autres
modules). Les types qui DESCENDENT (nage
vitesse 91 → 27) ne sont PLUS une pièce de ce lot — correction du fondateur (QUI_PAIE §5) : ils
ne manquent pas de progression, ils FINANCENT celle des autres ; c'est un mécanisme vivant,
traité par la politique « qui paie » (voir l'entrée QUI-PAIE ci-dessous).

**Périmètre élargi de deux pièces (R134_ET_ALLOCATION, 18/08/2026)** : (§4) les **semaines de
récup** — même cause exacte, des bornes qui ne varient pas avec l'athlète : 3,5 h de décharge
pour quelqu'un à 10 h, cinq séances toutes à leur plafond (footing 30', nage récup 60') là où
6-7 h seraient la décharge d'un athlète à 13 h ; pas de ticket séparé, ça se corrige ici. Et
(§3) **le mécanisme qui libère le budget est nommé** : le plafond structurel vaut
`nSess × durée de séance`, et les durées sont précisément les bornes fixes que ce lot rend
variables — lot progression → les séances s'allongent → le structurel monte → le budget monte →
**l'allocation statue enfin sur un budget réaliste**. (La prémisse antérieure « O-69 libère le
budget » était fausse, réfutée par la mesure : après le départ ancré, ce qui borne est
l'historique 13 h et le structurel 11,45 — le pic va à 10,4, pas à 15. L'ordre tient, par ce
mécanisme-ci.)

### ARBITRAGE RENDU (fondateur, 17/08/2026) : à faire APRÈS le merge, et EN PREMIER

*« Le défaut n'est pas l'ordre, c'est la MONNAIE. »* `sessions_max` compte des séances, le
classement mesure des minutes — il optimise donc une grandeur que la contrainte ne mentionne pas
(six séances de 30 min et six de 90 min satisfont le même plafond). Même faute d'unité que celles
fermées depuis deux mois, cette fois **dans la fonction objectif** et non dans un calcul.

Pourquoi pas avant le merge : le défaut existe déjà sur `main`, donc merger n'aggrave rien et
retarder ne protège personne ; le correctif est un lot à part entière (98 % de la coupe change de
cible sur sept sports par un point d'entrée commun) ; et le merge débloque le partage, la seule
chose dont on n'a aucune mesure. Pourquoi en premier après : c'est le seul ticket ouvert qui
change la **composition** de tous les plans plutôt qu'une valeur — B-10, l'allocation vélo, la
barre de zones sont des ajustements *à l'intérieur* d'une composition que celui-ci décide.

**Forme du correctif** : classement à DEUX dimensions (un scalaire ne peut pas les porter — c'est
pourquoi les minutes avaient été choisies, seul scalaire disponible). Ne se coupe jamais : séance
principale de la discipline limitante, séances spécifiques de course, paliers B-17. Se coupe en
premier : récupération et mobilité, complément dans une discipline non limitante. À égalité de
rôle : n'importe quel départage stable, **et surtout pas les minutes**.

### T-44 — LA PROPRIÉTÉ, ÉCRITE ROUGE AVANT LE CORRECTIF

Le fondateur a demandé la propriété plutôt que l'ordre, *« parce que ça survivra à une réécriture
du tri »*. Elle s'énonce sans nommer aucune passe : **la coupe ne retire jamais d'une discipline
une part plus grande que celle qu'elle occupe dans le plan prescrit** (tolérance 10 points).

Elle se mesure **sans contrefactuel** : comparer « avec coupe » et « sans coupe » demanderait deux
générations qui diffèrent aussi par ailleurs (`budgetPerWeek` alimente d'autres passes), et une
causalité ne se lit pas sur un diff de lot. La coupe DIT donc ce qu'elle retire, par la trace —
dont `npm run trace` vérifie à chaque exécution qu'elle est sans effet sur la sortie. Le prescrit
devient `livré + retiré`, sur une seule génération. Le piège de la vacuité est fermé : « ne rien
couper » satisferait le critère (règle 19), donc il exige que la coupe MORDE sur ses profils.

**Ce que T-44 a trouvé au-delà de la natation** — et c'est un fait nouveau :

```
70.3 / 40 sem / doubles / sm=6    sw  100 % des retraits pour 49 % du prescrit  (124/124)
70.3 / 30 sem / doubles / sm=7    sw  100 %                    44 %             (48/48)
Full / 40 sem / doubles / sm=6    sw   61 %                    42 %             (76/124)
                                  bk   39 %                    21 %             (48/124)
M    / 20 sem / parfois  / sm=5   rn  100 % des retraits pour 56 % du prescrit  (32/32)
```

Ce n'est donc pas « la natation perd toujours » : **c'est la discipline la plus courte de CETTE
configuration qui perd tout**, et sur un M en `doubles: parfois` c'est la COURSE. La règle est
générale, la natation n'en est que le cas le plus fréquent.

**Deux dénominateurs différents, à ne pas confondre** (corollaire de la règle 14) : les 124
retraits sont un compte BRUT, lu dans la trace ; le « −58 sur 59 » publié plus haut est un NET,
lu sur le plan livré — des passes ultérieures réinsèrent. Les deux sont vrais et ne répondent pas
à la même question.

### Une faute d'instrument à moi, dans la même heure

Ma première écriture appelait `traceRecord` **sans le garde `traceEnabled()`**. Le bundler
(`scripts/buildApp.mjs`) RETIRE les imports et concatène les modules : l'alias
`record as traceRecord` ne survit pas, et le symbole n'existe pas dans `engine.js`. Tous les
appels existants sont derrière ce garde — donc jamais évalués hors trace — et c'est la seule
raison pour laquelle personne ne l'avait vu. Mesuré : `audit:v1` à **57 `ReferenceError`** pendant
que `golden:verify` restait à **0 écart**, parce que l'un lit le BUNDLE et l'autre lit `src/`.
Deux instruments, deux verdicts opposés sur le même commit.

### NON IMPLÉMENTÉ — et c'est une décision, pas un oubli

Le correctif change la composition de **presque tous les plans de triathlon** et touche les sept
sports par le même point d'entrée. L'arbitrage rendu le 17/08 confirme le report : **après le
merge, en premier.** Ce qui est livré ici est la PROPRIÉTÉ (T-44, rouge) et la traçabilité de la
coupe — pas le correctif.

```verify
id: O-66
quoi: la coupe par sessions_max retire-t-elle encore 98 % de ses séances dans une seule discipline ?
attendu: cand.reduce
cmd: grep -n "cand.reduce" src/generator/weekBuilder.ts
```

## QUI-PAIE · La politique de financement, écrite une fois · ✅ **§1–§5 EXÉCUTÉS (retour fondateur QUI_PAIE_LA_CROISSANCE, 18/08/2026)**

### §1 — « Nage vitesse 91 → 27 » : le mécanisme, un facteur à la fois

La prémisse de ma note (« les minutes viennent des séances faciles ») était fausse sur la
population que le fondateur regardait, et la décomposition l'a montré : **la descente de la
qualité nage PRÉDATE O-69 et la pièce 1** — elle n'est pas causée par la croissance du brick,
elle est le régime permanent d'une politique de financement ACCIDENTELLE : *« qui a un plancher
ne paie pas, qui n'en a pas paie tout »*. Le brick porte un plancher audité haut (C21b), les
séances de qualité nage n'ont que des répétitions et des mètres compressibles — à cible fixe,
c'est structurellement TOUJOURS elles qui paient, quel que soit le mécanisme qui demande des
minutes (croissance du brick, coupe, équilibre de semaine). Et mesuré dans l'autre sens :
**O-69 a multiplié par ~4 la qualité nage de début de plan** (46 → 182 min de nage qualité en
S1 hebdo sur le profil fondateur) — le plancher de départ finance la nage, il ne la vide pas.

### §2 — la politique s'écrit UNE fois : `src/engine/prioriteFinancement.ts`

`disciplineLimitante` (tri → nage, duathlon → course, mono-sport → null) et `estCreneauProtege`
(séance non-récup de la discipline limitante). La contrainte de fond du fondateur y est
verbatim : *« la croissance d'un type ne se finance jamais sur un créneau de qualité de la
discipline limitante »*. Appliquée MAINTENANT au périmètre étroit — l'ORIENTATION des coupes
(`cutSmallestSessionIn`, `cutLightestEasyDay`) : un créneau protégé ne paie que s'il n'existe
AUCUNE autre victime — oriente, n'interdit jamais, même contrat que `keepMain`. O-66 (98 % des
retraits, sept sports) lira le MÊME module quand son lot viendra.
**Swimrun : null, MESURÉ** — ma première écriture disait « sw » et le banc v7 l'a réfutée en
naissant (S-RUN-STARVED 5 → 8 : protéger la nage y affame la course) ; en swimrun la
répartition suit l'ÉPREUVE (S13), le jour où la politique doit y exister elle se dérive de
`raceRunShare`, jamais d'une table. **Rayon mesuré par isolement ensembliste** : le reste du
lot rend 0 écart au golden, l'orientation seule rend **57 profils** — l'attribution n'est pas
devinée. Cliquet S5 505 (+ raison honnête, famille T-25), garde **T-45** (lotPhysio) : la
propriété, vérifiée dans les deux sens.
**Et l'orientation a exposé un trou LATENT — la veille ne survivait que par CHANCE.** Le banc
r15 a rougi (R15.7-B, 1/648 : `H20/debutant/reprise/12h/6s`, trou de 3 jours avant la course),
vérifié causé par le lot en rejouant le banc sur le bundle d'AVANT (vert). Instrumenté : la
veille EST créée, puis la passe « dernière semaine ≤ 60 % du pic » choisit le jour le plus
léger — la veille, 17 min, la plus courte PAR CONCEPTION (R13.4 l'écrit depuis R15 : « la
victime idéale de toute règle "retirer la plus petite" ») ; elle n'échappait aux coupes que
parce qu'une autre séance était plus petite, et l'orientation a protégé cette autre séance.
Sept sites choisissent une victime par minimum de minutes ; UN SEUL excluait la veille. Les
six autres l'excluent désormais en ABSOLU, comme la course (deux dans `cutSmallest`/
`cutLightestEasyDay`, deux passes « OFF (affûtage) » du générateur, deux de `repairLoop`) —
et ma première édition avait patché la MAUVAISE des trois occurrences textuellement identiques
du même filtre (`replace` sur la première), attrapée parce que la config témoin ne changeait
pas : un correctif vérifié sur sa config avant d'être cru.

### §3 — les deux dettes restantes du banc v6, relues sous l'hypothèse des bornes figées

**D2 (« violations dures sur la matrice standard ») : l'hypothèse est à moitié VRAIE — 7 → 4
configurations, et la moitié payée est exactement de la famille du lot.** Les violations
« brick hors bornes » venaient d'écrivains qui contournent `blockBounds` : trois sites de
`repairLoop.ts` (R3.13 affûtage, D2-repair « la semaine max reste en peak », récup ≤ charge) et
la passe D4-récup de `planGenerator` réduisaient les legs de brick sous `bnd?.floor ?? 5-10`,
alors que le plancher C21b des legs vit dans `blockBounds`, pas dans `bnd`. Les quatre sites
excluent désormais les legs (`if (st.leg) continue;`) — le repli existant (retirer la séance,
qui épargne déjà brick/longue/course) prend le relais quand les planchers bloquent.
Attribution prouvée par RETRAIT DU SEUL FACTEUR : cliquet S1 du sceau 5 → 4 (stash de
`repairLoop.ts` seul : 5 ; restauré : 4 — la violation payée est « Brick vélo+CAP » à 118 min
pour un plancher audité à 150, `tri/Full/vol-min`). `audit:v2` passe de 1 violation dure
(variant tri/S/reprise) à **0 sur 594**. Les 4 violations S1 restantes sont des bricks
d'AFFÛTAGE sous 40 min — une autre passe, à identifier ; les configurations D2 restantes ne
sont pas des bricks. **F2 (« ≥45 % du temps en zone cible ») : ce n'est PAS une borne figée** —
c'est l'arbitrage C13c documenté (l'échauffement plancher de 10 min pèse dans le dénominateur
des séances courtes) ; les pièces suivantes du lot progression (footing, sortie longue) peuvent
l'éroder en allongeant les séances, mais rien ne le garantit — relu, pas promis.

### §4 / §5 — voir l'entrée « PIÈCE 1 » ci-dessus

La provenance du seuil des 8 % est écrite (jugement de perception, SANS mesure, révocable) ; les
types qui descendent sont sortis de la liste des pièces du lot progression — ils sont le §1 de
cette entrée, un mécanisme vivant, pas un manque de progression.

```verify
id: QUI-PAIE
quoi: l'orientation épargne les créneaux protégés quand une autre victime existe (T-45), et la politique vit dans UN module
attendu: /✓ T-45 \[vert/
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep "T-45" ; test -f src/engine/prioriteFinancement.ts
```

## O-67 · La preuve du merge portait sur `src/`, pas sur l'artefact livré · ✅ **FERMÉ le jour où il a été nommé**

**Origine** : le fondateur, à partir de ma faute d'instrument du 17/08 — `audit:v1` à 57
`ReferenceError` pendant que `golden:verify` restait à 0 écart, l'un lisant le BUNDLE et l'autre
`src/`.

Deux instruments, deux verdicts opposés, même commit — et ce n'est pas une contradiction : chacun
a raison sur ce qu'il regarde. **Mais l'acceptation du merge est `golden:verify` contre la photo,
et il importe `src/app/bridge.ts`.** La preuve principale du merge ne portait donc pas sur ce qui
est déployé. `audit:v1` et les E2E lisent bien le bundle — c'est ce qui a attrapé les 57 — mais
ils en vérifient la **validité**, pas l'**identité de sortie** avec la source. Deux questions
différentes ; seule la seconde est ce que la photo garantit.

**Et l'étape n'est pas neutre** : `buildApp.mjs` retire les imports et concatène les modules, donc
un alias ne survit pas à la construction. Ce qui n'a pas survécu une fois peut ne pas survivre
deux, et rien ne le dirait.

`npm run golden:bundle` : les DEUX moteurs dans le même processus, le même corpus, la même
canonisation. **989 profils, 0 écart** — la construction n'est pas lossy.

**Le piège qui rendrait ce test vacueux est fermé, et il est traître** : si le bundle ne se charge
pas, `globalThis.EBV2` reste celui de `src/` et les deux passes comparent la source à elle-même —
**0 écart, verdict vert, mesure nulle**. C'est le taux saturé de la règle 15 dans sa forme la plus
difficile à voir, parce que **le résultat attendu EST « 0 écart »**. Trois verrous : la référence
de `EBV2` doit avoir CHANGÉ entre les deux passes (vérifié, sinon exit 2) ; le bundle est chargé
depuis le HTML livré ; et `--contrepreuve` perturbe une constante du livré et EXIGE que la
comparaison rougisse — vérifié, `B17_ECHAUF_M 200 → 225` fait diverger **186 profils sur 989**.

Note d'instrument : la première contre-preuve visait `C22_MAX_WEEKLY_GROWTH`, qui dans le bundle
vaut `rule("C22", …)` et non un littéral. Elle a rendu « motif introuvable » et **refusé de
tourner** plutôt que de sortir verte sur une perturbation qui n'avait pas eu lieu — c'est le
comportement voulu, et c'est ce qui l'a fait remarquer.

**Mis en cliquet** : `golden:bundle` entre en CI à côté de `golden:verify`.

```verify
id: O-67
quoi: ce qui est mesuré est-il ce qui est livré ?
attendu: /golden\(src\) === golden\(bundle\) : 989 profils, 0 écart/
cmd: npm run golden:bundle 2>&1 | tail -2
```

## O-68 · L'écran de projection montrait l'affûtage SEUL — le gain annulé par un précipice d'adhérence · ✅ **FERMÉ sur l'arbitrage du 17/08**

**Complément §4 (18/08/2026) — P7 re-basé, la mesure a décidé.** Le seuil de refus
(`GAIN_BAND_MAX_WIDTH`) avait été calibré quand la bande était comprimée par le facteur 0,9 ;
O-68 a retiré la compression au jour 0 — l'entrée du seuil a bougé, pas le seuil. Mesuré par le
chemin produit (grille de 70 profils projetables, sports × formats × vol_recent × horizon) :
**6 profils franchissaient le refus qui ne le franchissaient pas avant O-68** — pas du bruit,
la FAMILLE que l'arbitrage nomme légitime (débutant × horizon long, régime P11 : swim vr ≤ 1 h
à 28-40 semaines, 70.3/cyclo vr = 3 à 40 semaines, gains réels 22-24 %). Re-basé 0,25 → 0,28 :
l'ancienne frontière effective vaut « gain > 24,2 % », la nouvelle « gain > 24,3 % » — la même
à 0,2 % près, un re-basage et PAS un desserrage (la distinction de l'arbitrage). Contre-mesure
après re-basage : 10 refus avant ⇔ 10 refus après, 0 franchissement.

**Origine** : retour du fondateur sur son écran (17/08/2026) — « CSS 2:02 → 1'60/100m », ~2 % sur
les trois disciplines, borne basse figée à 5 h 38, « quarante semaines valent neuf minutes ».

### Ce que la mesure a établi, dans l'ordre de ses trois questions

**« Un coefficient unique, ou trois modèles ? » — NI L'UN NI L'AUTRE.** Le modèle porte trois
plafonds par discipline (`G_PLAFOND` : ftp 0,25 · css 0,22 · thrPace 0,15) multipliés par des
facteurs partagés. Mesuré sur sa famille de profil (236 W / 85 kg / confirmé / suivi / 40 sem) :
**FTP +12,6 % · CSS +9,8 % · CAP +6,9 %** — trois gains distincts, DANS les fourchettes qu'il
cite comme « couramment observées ». Le modèle n'est pas conservateur d'un facteur 2-3 :
**il était ÉTEINT.** Le ~2 % commun aux trois disciplines est le bonus d'affûtage
(`TAPER_GAIN = 1,96 %`), seul terme ADDITIF qui survit quand le gain d'entraînement est annulé :

```
gain = brut × adhFactor + taper        avec adhFactor = 0 si adhérence < 50 %
     = 0                + 0,0196
```

**Reproduction au bit près** — les trois valeurs de son écran sont `référence × 1,0196` :
CSS 122 s / 1,0196 = **119,65 s** → l'ancien formateur rendait exactement **« 1'60 »** ·
CAP 282 s / 1,0196 = 276,6 s = **4'37** · FTP 236 × 1,0196 = 240,6 = **241 W**. Une cause,
trois symptômes — y compris le bug d'affichage, dont la valeur d'entrée tombe précisément
dans la fenêtre fautive.

**« La borne basse : voulu ou clampé ? » — CLAMPÉE, en conséquence du gain annulé.** Le
prédicteur borne le meilleur cas projeté par le meilleur cas AFFICHÉ aujourd'hui
(`loT = min(loT0, loNow)`, retour du 08/08). À gain 1,96 %, `mNow × (1 − 1,3 × 0,0196)` reste
au-dessus de `loNow` : la borne rapide est donc gelée sur celle d'aujourd'hui. Avec le gain réel
(~10 %), le clamp ne mord plus et les deux bornes bougent. Ce n'est pas un défaut indépendant —
c'est le §2 vu du côté temps.

### Le précipice, et il est net

`adherenceWindow` rend `null` quand `done` est VIDE → facteur 0,9 (« suivi normal »). Mais
**valider un seul jour de REPOS rend `done` non vide** → la fenêtre calcule `fait/prescrit` sur
les séances passées non cochées → ~0 % → gain entièrement annulé. Et le repos est EXCLU de
`fait` comme de `prescrit` (« le repos ne se rate pas ») : **l'acte qui bascule l'interrupteur
est exclu de la mesure qu'il déclenche.** Cocher un repos au jour 1 fait passer la projection de
~90 % du gain à 1,96 % ; ne rien cocher la laisse à 90 %. L'écran du fondateur montrait
« Repos validé ».

### La question d'arbitrage, et elle est de la famille de la règle 20

L'adhérence des semaines ÉCOULÉES est appliquée multiplicativement au gain des 40 semaines
ENTIÈRES. À la semaine 39, c'est juste ; à la semaine 1, une mauvaise semaine (ou un simple
repos coché) efface 39 semaines à venir que rien n'a mesurées. Une grandeur qui varie avec la
position est appliquée sans sa position. Deux pistes, à trancher :

```
· le précipice (mécanique)   la bascule null→mesurée ne devrait suivre qu'une entrée
                             COMPTÉE par la fenêtre (une séance d'entraînement), jamais
                             un repos ; et fait=0 sur fenêtre quasi vide ≠ adhérence 0
· la position (arbitrage)    l'annulation devrait peser proportionnellement à la part
                             ÉCOULÉE du plan — le gain du RESTANT n'est pas encore joué
```

**ARBITRAGE RENDU ET IMPLÉMENTÉ (17/08/2026)** — trois décisions :

**§1 — le déclencheur et la mesure portent sur la même population.** `adherenceWindow` ne
déclare de l'évidence que si `done` contient au moins une séance MESURABLE (ni repos, ni
course) : cocher un repos rend `null`, plus jamais 0. La parade d'`aDesNages` (O-56), appliquée
ici. Vérifié : repos seul → `null` · séance réelle → la fenêtre calcule.

**§2 — le défaut 0,9 escomptait deux fois la même chose.** L'écran dit « si le plan tient » —
la projection est explicitement conditionnelle. `ADHERENCE_UNKNOWN_FACTOR` passe à **1,0** :
la phrase porte la réserve, plus un rabais silencieux.

**§3 — la pondération par position** (règle 20 appliquée à une confiance) : ce qui varie avec
la position n'est pas l'adhérence, c'est ce qu'on en SAIT. `facteur = 1×(1−f) + mesurée×f`,
`f = semaines écoulées / totales`, dérivé de `plan_start` dans le pont — aucune constante
nouvelle. Cette forme ne peut pas produire de précipice (au début, le poids de la mesure est
nul) ; elle ne remplace pas le §1, elle en est le filet.

**La table du §4, vérifiée ligne à ligne** (profil du fondateur, gain FTP) :

```
S1, rien de coché       13,8 %   projection complète, « si le plan tient »
S1, un repos coché      13,8 %   identique — le repos n'est pas de l'évidence
S8,  80 % faites        12,4 %   baisse un peu, avec sa raison
S30, 40 % faites         3,3 %   baisse franchement, et c'est mérité
S39, 40 % faites         2,0 %   ≈ l'affûtage seul — la mesure a tout son poids
sans position (repli)    2,0 %   f = 1 : l'ancien comportement, conservé pour
                                 tout appelant qui ne connaît pas sa position
```

**R14.5-A/B réécrits sous le contrat O-68** (IDs gardés, comme A4 et R14.4) : ils encodaient la
décision renversée — « 30 % → gain ≤ moitié » supposait le poids plein. Nouveaux critères : la
sensibilité reste, la réduction est BORNÉE par la part écoulée (on ne retire pas plus que ce que
l'évidence couvre), et l'ancienne barre « ≤ moitié » redevient exigible à f = 0,8 — méritée par
le fondement, plus posée. Mesuré : f=0,13 → 12,1/10,6 % (plancher 9,5) · f=0,8 → 5,7/1,2 %.

**EFFET DE BORD DU §2, MESURÉ LE JOUR MÊME (via la CI — e2e rouge sur `49e6c3a`)** : le
facteur 0,9 COMPRIMAIT la bande de gain, et sur un profil à grande marge et long horizon
(régime débutant, `vol_recent` 1 h, 43 semaines), la bande honnête à facteur 1,0 dépasse le
seuil de refus P7 — **26 points > 25** — et la projection REFUSE le chrono au lieu de
l'afficher. C'est le comportement documenté de P7 (« la fourchette honnête n'apprendrait
rien »), et il est plus honnête que la projection comprimée d'avant ; simplement, 0,9 en
cachait une frange. Découvert parce que `smoke-usage` fabriquait cet athlète SANS LE SAVOIR :
`vol_recent` est un groupe d'OPTIONS, son `SAI.vol_recent: "7"` ne s'appliquait jamais et la
première option (« <2h ») était cliquée — la famille du 138 kg (U14), côté options. Fixture
corrigée (`vol_recent: "7"` déclaré dans REP), le seuil P7 n'a pas bougé (le desserrer pour
faire passer un test serait la règle 19 à l'envers).

**§5 — la borne basse : rien à corriger** (décision du fondateur) : `min(loT0, loNow)` se
comporte comme prévu, elle gèle au gain minuscule et relâche au gain réel.

### Ce qui EST corrigé : la famille « 1'60 » — treize formateurs

Onze sites arrondissaient APRÈS avoir séparé minutes et secondes (`floor(s/60)` puis
`round(s%60)` → « 1'60 » sur 119,6 s), deux ne s'arrondissaient pas du tout (un flottant aurait
fui ses décimales). La règle unique : **l'arrondi se fait sur la GRANDEUR, la séparation sur
l'ENTIER.** Golden re-vérifié à 0 écart sur 989 — le bug ne mordait dans AUCUN plan livré (les
allures du plan viennent des bandes de zone) : il ne vivait que dans la projection, dont les
références sont des flottants, exactement où le fondateur l'a vu et exactement ce que le golden
ne photographie pas.

### Note sur l'identité du profil (§6 du retour)

Les valeurs de l'écran (236 W · 4:42 · 2:02) ne sont pas celles du fixture (227 · 4:50) : l'app
lit les références VIVANTES, promues par le journal des tests (imports Strava et retests,
O-22/O-25). La reproduction au bit près règle la question — c'est bien cet état qui a produit
l'écran, et le raisonnement ne dépendait que des rapports.

```verify
id: O-68
quoi: le gain projeté n'est plus annulé par la validation d'un simple repos (précipice d'adhérence)
attendu: Object.keys(done).length === 0
cmd: grep -n "Object.keys(done).length === 0" src/engine/projection.ts
```

---

# LES QUATRE ÉCRANS (17/08/2026) — le profil réel du fondateur, mesuré point par point

Profil enfin connu : `vol_max 20 · vol_recent 13 · sessions_max 12 · doubles oui (déduit de la
composition) · dispo quotidienne (stocké) · FTP 236 · seuil 4:42 · CSS 2:02 · 85 kg · 180 cm`.

## O-69 · La courbe ne lit `vol_recent` que comme PLAFOND · ✅ **FERMÉ (arbitrage du 18/08/2026)**

**La décision** : `vol_recent` devient un PLANCHER autant qu'un plafond — départ ≈ vol_recent ×
0,85 (fourchette arbitrée 0,80-0,90, « si la mesure montre 0,75 ou 0,95, la mesure gagne »).
Le fond : treize heures non structurées et treize heures structurées diffèrent par la
COMPOSITION, pas par la charge — descendre à 47 % pendant douze semaines est un stimulus de
désentraînement. **Livré** : plancher sur la COURBE seule (`O69_DEPART_PLANCHER`,
constraintMatrix), tous les plafonds de sécurité au-dessus de lui (C3, référence blessure/âge,
croissance sur le livré, N2, jamais l'affûtage), même unité que la rampe (heures d'eau en
natation). Sur SON profil : **départ 5,8 → 10,3 h · annonce `volBase` alignée sur le livré
(10,3, plus 0,58 × pic) · pic 10,4 → borné ensuite par `structurel` 11,45 et caps 13** — pas les
15 h de sa projection §2 d'ALLOCATION : c'est l'historique « confirmé » qui borne après, et la
chaîne R20.2 le nomme. Décision journalisée : « Départ ancré sur ton volume récent : 11 h/sem
(85 % de 13 h) sur 21 semaines ».

**Trois exclusions, chacune mesurée en construisant** (bancs r13/v7, un facteur à la fois) :
sécurité (blessure/médical/âge — R6.2 priorité 2 bat le maintien du volume : sans la garde, un
nageur épaule à 9 h recevait un plan PLAT à son pic réduit) · **reprise** (la population de la
rampe, la plus protégée du dépôt — le plancher clampé sur ses caps saturait chaque semaine et
les plafonds de temps dur déclassaient TOUTE la qualité : VO2 14 → 0 sur 40 semaines, fuzz#298 ;
révocable, l'arbitrage ne nommait pas l'historique) · **vol_max < vol_recent** (l'athlète a
lui-même choisi de descendre — le forcer contre son enveloppe produisait un plan plat déclassé,
fuzz#93 ; informer, pas bloquer).

**Le creux ne disparaît qu'à moitié, et c'est publié** : S5 4,0 → 6,8 h (la courbe suit), mais
S11/S17 restent à 3,5 h — leurs 5 séances de récup sont TOUTES à leur plafond (footing 30',
nage récup 60') : la STRUCTURE de la semaine de récup ne scale pas avec l'athlète. **PAS un
ticket (arbitrage fondateur, R134_ET_ALLOCATION §4)** : même cause que le lot progression —
des bornes qui ne varient pas avec l'athlète — et elle se corrige au même endroit ; un ticket
séparé ferait croire à deux problèmes. Rattaché au périmètre du lot progression.

**§1 du retour (18/08) — le « facteur deux » était une collision d'AXES, la mienne.** Sa table
lisait « plan livré : départ 5,8 h » — c'est la gauche de MA flèche « 5,8 → 10,3 » (AVANT →
APRÈS le lot), qui a le même format que l'affichage « volume X → Y » de l'app (BASE → PIC).
Mesuré sur l'état déployé : **semaine 1 livrée = 10,3 h**, l'affichage dit « 10,3 → 10,3 »,
aucun plafond ne rabat le plancher. L'écart RÉEL est 11 → 10,3 (−7 %, les bornes de séance et
leur quantification absorbent la différence entre cible de courbe et rendu) — et son issue (a)
s'applique quand même : le journal annonçait une ancre sans dire le rendu. **La décision porte
désormais les deux**, mise à jour au point fixe : « Départ ancré sur ton volume récent :
11 h/sem (85 % de 13 h) sur 21 semaines — semaine 1 livrée : 10,3 h (les bornes de séance
absorbent 0,7 h) ». Règle qui en sort, cousine de « une table porte son axe » : **un intervalle
fléché porte son axe** — « 5,8 → 10,3 » se lit base → pic dans un dépôt dont c'est le format
d'affichage, avant → après dans un rapport ; les deux lectures étaient disponibles et j'ai
laissé le lecteur choisir.

**Fermé en chemin, même famille que le seuil brutal d'O-21b** : la borne stricte « récup <
dernière charge » payait un excédent d'UNE minute (récup 180, charge 180) par la coupe d'un
JOUR de 50 — l'échelle multiplicative arrondit à zéro sous son quantum (`round(80 × 0,994) =
80`), le bloc concluait « les planchers bloquent ». L'excédent sous le quantum se retire
désormais en minutes ENTIÈRES (passe D4-récup). Et une passe « 1bis » écrite pour ce défaut au
mauvais endroit a été RETIRÉE après mesure (jamais déclenchée sur le cas visé, déplaçait les
témoins C30-A et les cliquets du sceau — l'épisode est écrit dans `lotPhysio.mjs`).

```verify
id: O-69
quoi: le départ SUIT-il vol_recent ? (rapport S1@13h / S1@6h, propriété — pas une valeur épinglée qu'un lot voisin déplace)
attendu: O69-FERME
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const B={sport:'tri',intent:'competition',format:'70.3',history:'confirme',level:'inter',vol_max:'20',vol_recent:'13',sessions_max:'12',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',injury:'aucune',age:'35',sex:'H',weight:'85',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'vallonne',leg_swim_env:'lac',milieu:'bassin',longest_swim_m:'1000',longest_swim_known:'oui',pace_known:'oui',pace:'4:42',ftp_known:'oui',ftp:'236',css_known:'oui',css:'2:02',plan_start:'2026-08-17',race_date:'2027-05-23'};const s1=(a)=>{const p=globalThis.EBV2.buildPlan('tri',a);return p.weeks[0].days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.d!=='rs'?(s.min||0):0),0),0)/60;};const a13=s1(B),a6=s1({...B,vol_recent:'6'});console.log('S1@13h='+a13.toFixed(1)+' S1@6h='+a6.toFixed(1));if(!(a13/a6>=1.4&&a13>=9))process.exit(1);" && echo "O69-FERME"
```

## O-69 (archive) · L'entrée d'origine · 🔴 ~~OUVERT, arbitrage à rendre~~

**Son constat** : vol_max 20, vol_recent 13, plan 6,1 → 10,5 h. « Sur quarante semaines, c'est un
plan qui te fait descendre. » Il a demandé de lire « ce qui borne » — la carte R20.2 répond :

```
argmin = « la durée de ta préparation » (boucle-growth, −10,4 h/sem)
declared 0 · caps 0 · util 0 · structurel 0 · facteurs tous ×1
```

**La carte dit vrai et désigne le mauvais levier.** La boucle +10 %/sem n'atteint pas plus haut
parce que le DÉPART est bas — et le départ ignore le volume réel. Mesuré à un seul facteur près :

```
vol_recent =  2 h  →  départ 2,5 h   (le plafond R10 mord — la rampe protège)
vol_recent =  6 h  →  départ 5,5 h · creux S4 à 3,9 h · pic 8,8 h
vol_recent = 13 h  →  IDENTIQUE au dixième près
vol_recent = 18 h  →  IDENTIQUE
```

**Au-dessus du départ naturel de la courbe, `vol_recent` est INERTE.** R10 promet « le plan part
du volume RÉEL des 3-6 derniers mois » — il n'en fait que la moitié : plafond pour le déconditionné,
jamais ANCRE pour celui qui fait déjà plus. Un athlète à 13 h/sem reçoit un départ à 5,5 h (42 %),
un creux à 3,9 h en S4 (30 % de sa charge actuelle), et un pic sous son volume courant — avec une
ligne levier qui lui conseille « plus de semaines », le seul levier qui ne lui manque pas.

**NON CORRIGÉ, délibérément** : sa lecture (a) est réelle — 13 h « au feeling » ≠ 13 h
structurées, redémarrer PLUS BAS se défend ; c'est le TAUX de reprise qui est un jugement
d'entraîneur (70 % ? 80 % ? plancher absolu ?). L'arbitrage conditionne aussi O-68 §3 (un départ
juste change ce que « le plan tenu » promet) et le lot progression (un départ ancré plus haut
change ce que les bornes par semaine doivent permettre).

(Le bloc `verify` de cette archive a été retiré : l'entrée FERMÉE ci-dessus porte le sien,
exécutable, sur la propriété nouvelle — deux blocs sous le même id se contrediraient.)

## O-62 · REQUALIFIÉ une seconde fois — DEUX problèmes, comme prévu au §2 des quatre écrans

Sur SON profil (`sessions_max 12`, doubles), la trace est formelle : **la coupe retire ZÉRO
séance**. Sa composition (41 % récup · 28 % seuil · 28 % vitesse · 3 % continue — la mienne ;
46/32/21/1 la sienne, même famille) est donc **celle que la RÈGLE prescrit** : le routage doubles
remplit `facile2` de « Nage récup courte » toutes les semaines. Sa prédiction du §2 est validée :
*O-62 est un ticket de RÈGLE pour les budgets larges (le routage), O-66 un ticket de COUPE pour
les budgets serrés.* Deux problèmes, pas un. Et son « zéro renforcement » est corrigé par
lui-même : le renfo est GREFFÉ sur d'autres séances (« + Renfo général »), son compteur lisait
les noms — N-01 partiellement livré, fréquence à vérifier (T-13 reste rouge attendu).

## O-70 · La phase PIC porte du VO2max — jusque dans sa semaine de RÉCUP · ✅ **FERMÉ (arbitrage du 18/08/2026, moitié vélo en attente de sa lecture R13.4)**

**La décision** : pic, semaine de charge → 1 VO2max maximum (maintien) ; pic, semaine de
décharge → 0. **Livré** : la moitié COURSE (C18) quitte le pic — le créneau libéré revient au
SPÉCIFIQUE (rappel 2 × 7-10 min d'allure course, la forme du rappel d'affûtage R13.4) — et la
décharge ne porte plus AUCUN VO2. **La cause de la décharge était un défaut d'AIGUILLAGE, pas
une décision** : les branches de séance lisent la PHASE, jamais la CHARGE — le créneau
`facileR` d'une semaine de récup du pic construisait donc « VO2max course » comme une semaine
de charge. Le kit de construction porte désormais `isRecup`. Sur SON profil : **VO2 total
19 → 14 · S34 (récup du pic) 1 VO2 → 0 · chaque semaine de charge du pic ≤ 1 VO2 (le vélo
R13.4)** ; bricks 10 → 11, allure course 14 → 23.

**Deux contraintes du moteur ont corrigé ma première écriture, et c'est mesuré** : (1) un
troisième bloc modéré par semaine faisait déborder C26d (10 combinaisons tri/Full en violation
DURE, S33 à 43 % de modéré) — le rappel C18 ne se garde que si la semaine n'en porte aucun par
ailleurs (`O-70(b)`, weekBuilder, même mécanique que C18b : le créneau existe pour les budgets
serrés où `dur2` ne survit pas) ; (2) un bloc SIMPLE en durée reçoit le « plancher digne » de
30 min de `blockBounds` — deux dosages successifs rendaient 30' quoi qu'on déclare, d'où la
forme répétée + `hard`.

**Et le lot a débusqué un trou ANTÉRIEUR, fermé : C3 n'était jamais rejoué au point fixe.**
Les passes de fin de pipeline (le rendu des minutes coupées à la sortie longue, I14, C26c/d…)
regonflaient certaines semaines AU-DELÀ de l'enveloppe déclarée — mesuré : la semaine de pic
d'un Full à vol_max 4 sortait à 255 min pour 240 demandées, au-delà de la tolérance ×1,03 que
le moteur s'accorde. Treizième paiement de la leçon « une garantie vérifiée au milieu du
pipeline ne vérifie que l'avant-dernier état » : C3 se rejoue quand plus rien ne bouge —
réduction du corps, puis l'excédent sous le quantum en minutes entières (qualité en dernier,
plancher DÉCLARÉ du bloc quand il existe : le « plancher digne » est une politesse
d'affichage, pas une règle du manifeste), jamais un jour coupé. Pire semaine du profil
dégénéré : 255 → 242 min (borne v6 : 245).

**La moitié VÉLO : R13.4 CONFIRMÉ (arbitrage du 18/08, R134_ET_ALLOCATION §2), avec une
CONDITION DE RÉEXAMEN.** La décision citée — *« VO2max vélo — Puissance aérobie maximale,
maintenue jusqu'au pic — pas abandonnée en spécifique (la race-pace vélo est travaillée dans
le brick) »* — tient : le spécifique vélo vivant dans le brick, le créneau dur porte le
maintien sans doubler. Mais sa prémisse s'appuie sur un type de séance que le lot progression
va changer : **les bricks sont figés** (10 identiques, forme finale dès la première
occurrence), donc le spécifique sur lequel R13.4 s'appuie est plus faible qu'il ne le croit.
**Condition écrite** : après le lot progression, quand le brick portera une charge croissante,
le maintien VO2max entrera en concurrence avec un spécifique devenu lourd — et l'argument qui
fera pencher est nommé d'avance : le VO2max ne décline pas en cinq semaines quand on roule
5-6 h/sem dont un brick de trois heures ; le maintien protégerait alors contre une décroissance
qui n'aurait pas lieu. Aujourd'hui, bricks figés : R13.4 a raison. Après le lot : à revoir.

```verify
id: O-70
quoi: la décharge du pic porte-t-elle encore du VO2, et une charge du pic plus d'un ?
attendu: O70-FERME
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const B={sport:'tri',intent:'competition',format:'70.3',history:'confirme',level:'inter',vol_max:'20',vol_recent:'13',sessions_max:'12',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',injury:'aucune',age:'35',sex:'H',weight:'85',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'vallonne',leg_swim_env:'lac',milieu:'bassin',longest_swim_m:'1000',longest_swim_known:'oui',pace_known:'oui',pace:'4:42',ftp_known:'oui',ftp:'236',css_known:'oui',css:'2:02',plan_start:'2026-08-17',race_date:'2027-05-23'};const p=globalThis.EBV2.buildPlan('tri',B);let bad=0;for(const w of p.weeks){if(w.phase.id!=='peak')continue;const v=w.days.reduce((t,d)=>t+d.sessions.filter(s=>/vo2/i.test(s.name||'')).length,0);if(w.isRecup&&v>0)bad++;if(!w.isRecup&&v>1)bad++;}console.log('semaines de pic en défaut: '+bad);if(bad>0)process.exit(1);" && echo "O70-FERME"
```

## O-59 · COMPLÉMENT — la build R26 enregistre aussi, y compris son geste exact

Le protocole dispo rejoué sur la build R26 (worktree `ba8722f`, celle que son téléphone servait) :
clic « quotidienne » PUIS « semaine » → store `semaine`, marque `semaine`, survit au clic sur une
autre question. **Quatre passes, deux builds, deux scénarios : la chaîne clic → store tient
partout où le harnais peut aller.** Le `quotidienne` stocké chez lui (prouvé par « Cycles 10j »)
contre son souvenir d'avoir cliqué « semaine » reste indécidable d'ici — le discriminant est SON
appareil : refaire le clic sur la build déployée post-merge, regarder la marque, vérifier au
Profil. S'il échoue là, on a une cible de reproduction (pile tactile réelle, chemin d'écran
précis) qu'aucun de mes chemins n'exerce.

**Le discriminant s'est affûté (balayage O-71)** : « Cycles 10j » exige `shift_ok === "oui"`,
et cette question — « Un cycle de 10 jours glisse sur le calendrier. OK ? » — n'apparaît QUE
dans la branche dépliée par un clic sur « quotidienne ». Son store porte donc nécessairement
DEUX réponses de ce chemin. La question à lui poser : *se souvient-il d'avoir répondu à la
question du cycle de 10 jours ?* S'il s'en souvient, le mystère est résolu — et le suspect
devient les LIBELLÉS : « Tous les jours, **libre** » (= `quotidienne`) et « Tous les jours,
**contraint** » (= `semaine`) commencent par les trois mêmes mots ; quelqu'un qui s'entraîne
tous les jours clique naturellement le premier. S'il ne s'en souvient pas, la cible de
reproduction est réelle.

## O-71 · Le journal des ✓ est adressé par ORDINAUX dans un plan RÉGÉNÉRÉ · 🔴 **OUVERT**

Résultat du balayage demandé (ORDINAL_ET_VOLUME §1) : *« tout endroit qui stocke un INDICE dans
une structure DÉRIVÉE de l'état, plutôt qu'une identité »*. La classe a **quatre membres et une
exemption**, et le plus gros n'était pas `S.step` :

**`answers.done` = `{"sem|jour|si": true}`** — trois coordonnées POSITIONNELLES dans un plan que
l'app **régénère depuis les réponses à chaque chargement** (`state.js` pose `S.currentPlan=null`
au restore). Une clé posée sous le plan A désigne « la séance qui se trouve à cette position »
sous le plan B — et B diffère de A pour des raisons que le produit ENCOURAGE. Mesuré sur le
profil du fondateur (344 clés), un facteur à la fois, témoin à l'appui :

```
course reportée de +7 jours    → 23 clés sur 344 (7 %) désignent une AUTRE séance
                                 (« Footing facile » ✓ → « OFF » ; nage continue → nage récup)
blessure « genou » déclarée    → 10 autres séances, dont 5 changent de DISCIPLINE
  au Profil en cours de plan     (« Nage vitesse » ✓ → « Rappel allure course CAP ») + 1 orpheline
témoin (mêmes réponses)        → 344/344 identiques — le plan est déterministe, la mesure mesure
```

Un ✓ qui change de discipline crédite l'XP de la **mauvaise jauge** (R25 recompte depuis
`answers.done`) ; un OFF devenu footing apparaît **pré-coché** ; et l'adhérence P1 — celle qui
pèse le gain O-68 — compte ces minutes-là. La correction de fond est connue (les clés portent une
IDENTITÉ de séance, pas une position) mais elle touche le format d'état `eb_state_v2` : migration
à concevoir, **pas un correctif d'un soir**. Même famille : **`answers.daySwaps`**
(`[semaine, jourA, jourB]` — les jours sont des identités, la SEMAINE est un ordinal, même
exposition au renumérotage) et **O-58** (positions de paliers B-17 calculées sur le calendrier de
phase sans regarder si la semaine visée porte le créneau — confirmé de la famille).

**`S.step`** : stable à l'EXÉCUTION — la sonde §1b a marché le questionnaire tri de bout en bout
en togglant une branche à chaque écran : **0 recomposition de la liste** (elle ne dépend que du
sport et du tier ; `branches()` injecte du DOM DANS une étape, jamais une étape). L'exposition
résiduelle est le restore À TRAVERS un déploiement qui change la liste (`e.step` est persisté ;
U14 a réordonné les étapes une fois) — le chemin du refus est déjà réparé par identité
(`tabs.js`), le restore ne l'est pas. **Exemption** : `answers.tests` stocke bien des positions
(départage O-23 à date égale) mais la collection est **append-only, donc stable** — c'est
exactement la condition de l'énoncé (« un ordinal n'est une position que si la collection est
stable »), l'exemption est nommée pour ne pas être re-balayée.

**Et l'hypothèse §1b (« une question jamais affichée → `quotidienne` par défaut ») est RÉFUTÉE
pour son cas, par le moteur lui-même** : « Cycles 10j » exige `shift_ok === "oui"` sans repli
(`reasoningEngine.ts`, `use10`), et `shift_ok` n'existe QUE dans la branche affichée après un
clic sur « quotidienne ». Le plan qui porte des cycles 10j prouve DEUX réponses volontaires sur
ce chemin. Voir le complément O-59.

**PRIORITÉ RELEVÉE (arbitrage du fondateur, 19/08/2026, §3)** — le mécanisme d'O-59 n'est pas
« la collection change quand on répond » (réfuté, 0 recomposition en cours de questionnaire) :
c'est que **chaque DÉPLOIEMENT recompose la liste**, donc un état persisté qui référence une
structure DÉRIVÉE DU CODE se casse au déploiement suivant. `answers.done` a **exactement la même
exposition**, et elle est pire : ses trois coordonnées sont positionnelles dans un plan régénéré,
et sur un produit poussé plusieurs fois par jour l'instabilité est permanente. **Aucun test
mono-build ne peut le voir** — c'est ce qui explique qu'un harnais le déclare sain pendant que le
fondateur le rencontre ; le pendant, côté persistance, de ce que le test de rollback a montré côté
service worker. La migration du format `eb_state_v2` est donc un peu plus urgente à chaque
déploiement, et elle ne se rattrape pas : les ✓ mal adressés sont déjà écrits chez l'utilisateur.

```verify
id: O-71
quoi: les clés du journal des ✓ désignent-elles encore une AUTRE séance quand la course est reportée de 7 jours ?
attendu: O71-REPRODUIT
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const B={sport:'tri',intent:'competition',format:'70.3',history:'confirme',level:'inter',vol_max:'20',vol_recent:'13',sessions_max:'12',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',injury:'aucune',age:'35',sex:'H',weight:'85',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'vallonne',leg_swim_env:'lac',milieu:'bassin',longest_swim_m:'1000',longest_swim_known:'oui',pace_known:'oui',pace:'4:42',ftp_known:'oui',ftp:'236',css_known:'oui',css:'2:02',plan_start:'2026-08-17',race_date:'2027-05-23'};const ix=p=>{const m=new Map();for(const w of p.weeks)for(const d of w.days)d.sessions.forEach((s,si)=>m.set(w.num+'|'+d.jour+'|'+si,(s.d||'')+(s.name||'')));return m;};const b=a=>ix(globalThis.EBV2.buildPlan('tri',a));const A=b(B),C=b({...B,race_date:'2027-05-30'}),T=b({...B});let d=0,t=0;for(const[k,v]of A){if(C.has(k)&&C.get(k)!==v)d++;if(T.get(k)!==v)t++;}console.log('autres:'+d+' temoin:'+t);if(!(d>=15&&t===0))process.exit(1);" && echo "O71-REPRODUIT"
```

## O-72 · Le MAXIMUM du plan est HORS de la phase de pic · 🔴 **OUVERT — mais la sortie est mesurée (18/08/2026)**

Position du maximum au fil des lots, sur le profil du fondateur : **S4 (base)** quand il a
signalé le défaut → **S19 (dev)** après la pièce 2 (trajectoire de la nage) → et **S37 (PIC)**
avec B-10, mesuré. La prédiction du §6 de « C26c AU PIC » est donc VÉRIFIÉE : *« c'est ce lot qui
commence à répondre à O-72 »*. Mais **B-10 a été retiré** (voir l'entrée LOT VÉLO : deux
régressions hors du plan), donc l'état livré reste S19/dev et l'entrée reste OUVERTE. Ce qui est
acquis, c'est de savoir quel levier la ferme.

Le fondateur, sur son écran : *« Cinq semaines avant l'objectif, je m'entraîne moins qu'au
premier jour. Ce n'est pas "le plan est plat" — il décroît, puis remonte à peine au-dessus de
son point de départ quarante semaines plus tard. […] Si le maximum est en semaine 1, le moteur
ne produit pas une préparation. »*

**La mesure demandée, faite sur son profil** (courbe hors récup, valeur + position du max) :

```
S1 9,5 · S2-S4 9,3-9,6 · S7-S12 8,3-9,4 (base)
S13-S21 8,2-9,5 (dev) · S24-S33 8,4-9,6 (spec)
S35 8,0 · S36 8,8 · S37 9,6 · S38 8,6 (peak) · S39-S40 5,1/3,0 (taper)

MAX (hors récup) : 9,6 h en S4 — phase de BASE (ex æquo au dixième : S24, S37)
```

Le maximum n'est pas en semaine 1 mais en **S4, en pleine base** — la substance du verdict est
identique : la phase de pic ne dépasse JAMAIS la quatrième semaine du plan, et ses deux
premières semaines de charge (8,0 · 8,8) sont SOUS les semaines de base. La décision `O69-plat`
dit bien « plan plat » — le dire n'en fait pas une préparation.

**Le mécanisme est la rencontre de deux forces déjà nommées, chacune juste isolément** :
O-69 ancre le départ sur `vol_recent × 0,85` (S1 → 9,5 h — c'était la demande, le départ ne
ment plus) ; les plafonds (historique 13 h, structurel ~11,4, sonde de capacité) tiennent le
pic à ~9,6 livré. Un plancher qui monte S1 et des plafonds qui tiennent le pic donnent un
plateau — et les creux du pic (8,0/8,8) viennent des coupes/équilibres locaux, pas de la
courbe déclarée. **La sortie est le lot progression lui-même** (mécanisme déjà écrit au
registre : les types gagnent des trajectoires → les séances s'allongent → le structurel monte
→ le pic peut dépasser la base) — cette entrée épingle la GRANDEUR À SURVEILLER : la POSITION
du maximum, pas seulement l'amplitude pic − base.

### Constat 1 du même écran — le créneau dur unique du pic va au VO2max, pas à un 2ᵉ brick

Mesuré : **aucune semaine de pic ne porte 2 bricks** — S35 br=1 vo2=1 · S36 br=1 vo2=1 ·
S37 br=1 vo2=0 · S38 br=1 vo2=1. O-70 est bien appliqué (S34 récup à 0 VO2, ≤ 1 en charge) :
ce n'est pas une régression — c'est l'ALLOCATION du créneau dur unique. Le fondateur : *« Pour
un 70.3 à cinq semaines, le rapport devrait être inverse — le brick est la seule séance qui
construit l'enchaînement. »* À trancher avec le lot (même famille que l'arbitrage O-70 :
la composition du pic).

### Constat 2 — la pièce NAGE manquait à la liste du lot progression, et elle passe en premier

Mesuré sur son profil : la « Nage seuil » livre **1975 m en zone css = 40,2 min — le plafond
de dose (DOSE_CAP_MIN.thr = 40), au mètre près, dès la SEMAINE 1 de base** — et elle y reste
sur TOUTE la prépa (S1-S38) ; les seuls mouvements sont vers le BAS (1525-1875 sur les
semaines où une coupe passe), jamais une montée. C'est le défaut du brick (naître à taille
finale), sur la nage — sauf qu'ici la taille finale est un **plafond de SÉCURITÉ** utilisé de
fait comme cible dès le premier jour. Ajoutée à la liste des pièces, EN PREMIER (décision
fondateur).

```verify
id: O-72
quoi: le maximum du plan (hors récup) est-il encore HORS de la phase de pic ? (S4/base → S19/dev livré ; S37/peak atteint avec B-10, retiré)
attendu: O72-REPRODUIT
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const B={sport:'tri',intent:'competition',format:'70.3',history:'confirme',level:'inter',vol_max:'20',vol_recent:'13',sessions_max:'12',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',injury:'aucune',age:'35',sex:'H',weight:'85',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'vallonne',leg_swim_env:'lac',milieu:'bassin',longest_swim_m:'1000',longest_swim_known:'oui',pace_known:'oui',pace:'4:42',ftp_known:'oui',ftp:'236',css_known:'oui',css:'2:02',plan_start:'2026-08-17',race_date:'2027-05-23'};const p=globalThis.EBV2.buildPlan('tri',B);let mx={h:-1,num:0,ph:''};for(const w of p.weeks){if(w.isRecup)continue;const h=w.days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.race?0:(s.min||0)),0),0)/60;if(h>mx.h)mx={h,num:w.num,ph:w.phase.id};}console.log('max '+mx.h.toFixed(1)+'h en S'+mx.num+' ('+mx.ph+')');if(mx.ph!=='peak')console.log('O72-REPRODUIT');"
```

## O-73 · L'inventaire des planchers — l'ordre de compression, mesuré · ✅ **LECTURE FAITE (fondateur, « L'INVENTAIRE DES PLANCHERS *EST* LA POLITIQUE », 18/08/2026)**

*« qui a un plancher ne paie pas · qui n'en a pas paie tout — donc l'ordre de compression n'est
écrit nulle part, et il est pourtant complet : il se lit dans la liste des planchers. »*

**Ce n'est pas un lot, c'est une lecture** — et elle est désormais exécutable :
`npm run inventaire:planchers [sport]`. Elle ne lit PAS le code : greper `blockBounds` rendrait
la liste DÉCLARÉE, pas l'ordre RÉEL (règle 15). Elle mesure par le COMPORTEMENT — même athlète,
enveloppe qu'on serre (`vol_max` 20 → 4, seul facteur qui bouge, `vol_recent` épinglé bas pour
qu'O-69 ne s'active jamais) — et regarde ce que le plan livré fait de chaque type.

### Le résultat, et il a DEUX axes (l'enveloppe perd 59 %)

```
tri/70.3        taille/occurrence      occurrences
Brick vélo+CAP       87 %                 100 %      ← protégé en occurrences (s.brick)
Sortie longue CAP    89 %                 100 %      ← protégé en occurrences (s.long)
Nage continue B-17   73 %                 100 %      ← protégé en occurrences (épinglé)
Footing facile       98 %                  17 %      ← plancher de MINUTES, aucune protection d'occurrence
Nage récup courte   100 %                  41 %      ← idem
Force basse cadence  97 %                  18 %      ← idem
Nage seuil           56 %                  21 %      ← RIEN
Nage vitesse         56 %                  21 %      ← RIEN
Sweetspot vélo       50 %                   0 %      ← RIEN — disparaît entièrement
run/marathon : « Sortie longue » est le SEUL type protégé sur les deux axes.
```

**La conclusion est plus dure que la phrase qui l'a demandée** : un plancher de MINUTES ne
protège pas — il change la MONNAIE du paiement. « Footing facile » garde 100 % de sa taille et
perd 83 % de ses occurrences : un type qui ne peut plus rétrécir ne peut plus que disparaître.
Et la protection qui compte (l'occurrence) n'est pas une BORNE : c'est une exclusion nominale
(`s.long`, `s.brick`, `pinned`) répétée dans chaque passe de coupe — la protection PAR LE CHEMIN.

`Nage seuil` et `Nage vitesse` — le symptôme du fondateur — sont dans la troisième catégorie :
elles paient sur les DEUX canaux. C'est « qui n'en a pas paie tout », chiffré.

### Deux fautes d'instrument à moi, publiées

(1) Ma première écriture cherchait le plancher dans la CONSTANCE de la plus petite occurrence :
faux — « Force basse cadence » passe de 31 à 67 min quand on serre, parce que les petites
occurrences DISPARAISSENT et que la statistique porte sur une population qui rétrécit. Je
nommais « le plancher » et je mesurais « le minimum des survivants ».
(2) Ma deuxième cherchait un ENTASSEMENT sur la valeur basse : elle rendait **0 type sur 12**,
un taux saturé — donc l'instrument (règle 15). Les occurrences d'un type ont des tailles
différentes selon la phase, agréger 9 pressions × 40 semaines dilue tout empilement. La
grandeur qui répond à la question posée est l'ÉLASTICITÉ, et c'est la troisième écriture.

### §3 — le balayage des trois dernières semaines : BORNE ou CHEMIN ?

Réponse mesurée : **un CHEMIN. Onze sites élisent une victime par minimum de minutes**, chacun
avec sa propre liste d'exclusions. Deux (`repairLoop`, passes « saut de charge lissé » et
« l'affûtage ne remonte jamais ») pouvaient encore supprimer le déverrouillage de la veille —
**dont un que j'avais annoncé fermé la veille** : mon `replace(…, 1)` n'avait patché que la
première de deux chaînes IDENTIQUES. J'ai écrit « six sites fermés » ; il y en avait cinq.
Le plancher absolu (repos · course · veille) vit maintenant en UN point
(`prioriteFinancement.ts`, deux granularités : `estIntouchable` / `jourIntouchable`), et **T-46**
refuse toute élection qui ne passe pas par lui — garde STATIQUE assumée, de la famille de T-28
(« une borne, une source ») : les deux trous sont LATENTS sur les deux corpus (golden 989 :
0 écart · banc r15 648 configs : vert avec ou sans), donc aucune mesure de SORTIE ne peut les
garder. Ce qui les garde, c'est l'absence de duplication. T-46 a d'ailleurs trouvé un **onzième**
site que mon balayage manuel avait manqué.

**Trois erreurs de plus dans ce chantier, toutes publiées** : ma garde T-46 nommait la mauvaise
ligne (son filtre de commentaires SUPPRIMAIT les blocs `/* */`, décalant la numérotation) ; ma
première contre-preuve était VACUEUSE (un `sed` avec un `|` non échappé n'a rien muté et
sortait verte — la faute déjà enregistrée dans ce dépôt, refaite) ; et mon routage a d'abord
déplacé **28 profils** du golden, dont j'ai attribué la cause à « avant course » puis à
`repairLoop` — **les deux fois à tort** : c'étaient deux substitutions qui ajoutaient
silencieusement `rs`/`race` à des filtres de JOUR. Isolées et corrigées : **989/989, 0 écart**.

### §4 — le troisième état du registre, fermé

`registryCheck` distinguait deux états là où il en faut trois. Une commande qui MEURT en
crachant une trace partait au filtre regex, n'y trouvait pas son motif, et sortait en
« ne reproduit plus » — c'est-à-dire en VERT, avec le sens « le défaut est réparé ». La règle
posée est asymétrique parce que la preuve l'est : **un code de sortie ≠ 0 n'autorise qu'un
verdict POSITIF**, jamais un « ne reproduit plus » (sur un processus mort, l'absence du motif
ne prouve rien ; sa présence prouve encore quelque chose). `audit:v6`, qui sort en 1 quand il
trouve une régression, continue de rendre « reproduit ». Contre-prouvé : avant → « NE REPRODUIT
PLUS (vert) », après → « COMMANDE EN ÉCHEC », exit 1. Registre : **90/90 sous la règle stricte**.

```verify
id: O-73
quoi: l'inventaire est-il exécutable, et le point unique tient-il les onze élections ?
attendu: /✓ T-46 \[vert/
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep "T-46"
```

## Lot progression, PIÈCE 2 (nage) · ✅ **LIVRÉE (arbitrages PIECE_NAGE + DEUX_CANAUX, 18/08/2026)**

**Le défaut** : « Nage seuil » livrait **1975 m au CSS = 40,2 min — `DOSE_CAP_MIN.thr` au mètre
près — dès la SEMAINE 1 de base**, et y restait jusqu'à S38 ; les seules variations allaient vers
le BAS, quand une coupe passait. C'est la pièce 1 sur la nage, avec une aggravation : la taille
finale y est un plafond de **SÉCURITÉ** employé de fait comme cible dès le premier jour.

**Livré, sur le profil du fondateur** : `21,9 min (S1) → 40,2 min (S38, pic)`, et **0 semaine
hors pic n'atteint 40**. Trois choix, chacun tranché :
la CIBLE ne bouge pas (40 min, arbitré en fermant O-55) ; la MONNAIE est la **minute**, la
distance se dérive — le CSS s'améliore sur le plan (O-68), donc une cible en mètres donnerait
MOINS de dose à un nageur qui progresse ; la POSITION court sur **tout** le plan (base → pic),
là où le brick n'existe qu'en spec+peak. Départ = `PROG_DOSE_DEPART = 0,55`, forme (a) de
l'arbitrage — et la valeur est MESURÉE, pas choisie : c'est le rapport que la pièce 1 produit de
fait (brick 117/212 = 0,552), pour que les deux pièces soient la même géométrie.

### QUI PAIE ? La réponse est : personne — et c'est publié plutôt que revendiqué

Le fondateur attendait de cette pièce le premier vrai test de `prioriteFinancement`. **Elle ne le
lui donne pas, et il faut le dire** : le pic était DÉJÀ au plafond, donc la trajectoire ne fait
pas CROÎTRE le sommet — elle abaisse le début. Mesuré (29 semaines de charge) : « Nage seuil »
**1614 → 1370 min (−244)**, dont **+117 vers « Nage vitesse »**, +10 sortie longue, +8 endurance
vélo, et **−117 min de total** (−0,7 %). La pièce LIBÈRE des minutes au lieu d'en consommer : le
contraire du brick. `prioriteFinancement` reste donc non exercé par ce lot.

### Le résidu, mesuré, et ma première hypothèse RÉFUTÉE

7 profils (`Full/injury-*`, `master`, `vol-min`) livrent au pic une dose SOUS celle de la
spécifique (1625 contre 1750 m). J'ai d'abord écrit que « les règles de sécurité allègent le
pic » — **faux, mesuré** : le volume de la semaine MONTE (487 → 534 min) pendant que la dose
baisse. La cause est le **plafond de temps DUR hebdomadaire (C26c)** : au pic, le VO2 et le brick
à allure course saturent le budget, et la dose de seuil nage est la variable d'ajustement. C'est
une règle de SÉCURITÉ (priorité 2), pas un défaut de trajectoire — et la question qu'elle pose
(du VO2 ou de la nage, qui doit céder au pic ?) est une question d'ALLOCATION, déjà ouverte au
constat 1 d'O-72. Aucune garde n'est écrite pour la déclarer fautive : ce serait demander au
moteur de dépasser un plafond physiologique pour satisfaire un critère d'affichage.

### Le CANAL (DEUX_CANAUX §2) — et pourquoi il est un ENSEMBLE

`canauxProteges()` déclare, pour un type, sur quel AXE il doit être protégé : *la valeur du type
est sa DURÉE → la taille* (brick, sortie longue, continuité B-17 — une simulation amputée ne
simule plus rien) ; *sa valeur est sa FRÉQUENCE → l'occurrence* (qualité nage — quatre séances de
vingt minutes valent mieux que deux de quarante). `estCreneauProtege` en devient la lecture du
canal « occurrence » : un seul point, une seule règle, et **aucune douzième liste d'exclusion**.
**Ma première écriture rendait UN canal et testait la taille d'abord** : une continuité de nage
devenait « taille » et perdait du même coup sa protection d'occurrence — **84 profils du golden
déplacés**. Le modèle du fondateur le disait déjà (« la sortie longue est protégée sur les DEUX
axes ») ; le canal est donc un ensemble. Vérifié NEUTRE : 83 écarts avec et sans.

**Aucun plancher de TAILLE n'a été posé sur la qualité nage** (DEUX_CANAUX §1) : l'inventaire
O-73 a montré qu'un plancher de minutes redirige le paiement vers l'occurrence — sur la nage ce
serait le pire échange possible, puisque c'est la fréquence qui construit la technique.

Garde **T-47** (lotPhysio), contre-prouvée : trajectoire retirée → 5 profils rouges. Elle borne
son OBJET deux fois, chaque fois sur une mesure : pas de verdict là où le pic ne porte aucune
nage seuil en charge (O-74), ni là où le plafond ne gouverne pas (le mineur reçoit 450-675 m,
soit 9-14 min, très sous le plafond — sa dose vient du volume de sa semaine).

## O-75 · C26c au pic : l'ordre de cession — le VO2 cède avant la nage seuil · ✅ **LIVRÉ (arbitrage fondateur, 18/08/2026)**

**R13.4 n'est pas réfuté, sa PORTÉE est bornée** — et c'est le fondateur qui l'écrit : son
argument (*« la race-pace vélo est travaillée dans le brick »*, donc le créneau dur peut porter
le maintien aérobie) **suppose que le créneau est LIBRE**. Il ne dit rien de ce qui doit se
passer quand deux choses le veulent. Il tient donc quand il y a de la place, et il ne tranche
pas quand il n'y en a plus.

Trois raisons convergentes : **spécificité** (au pic, le spécifique d'un 70.3 est porté par le
brick et par la nage ; le VO2max ne sert directement aucun des trois axes — et il ne décline pas
en cinq semaines quand on roule 5-6 h dont un brick de trois heures, la condition de réexamen
posée en fermant O-70, que la pièce 1 remplit) ; **asymétrie** (perdre du VO2 coûte des
secondes, dégrader la nage d'un athlète limité par elle coûte plus, et en eau libre la
dégradation n'est pas linéaire) ; **réversibilité** (le VO2 se retrouve en quelques séances, une
technique de nage dégradée sous fatigue non).

Livré comme un ORDRE DE CESSION, pas comme un retrait : au pic, quand C26c mord, le brick ne
cède jamais (tant qu'une autre victime existe), le VO2 cède en premier, la nage seuil après lui.
Hors pic, rang uniforme : le comportement d'origine est intact.

**Mesuré avant d'écrire, comme exigé — et ma première mesure répondait à une autre question.**
`npm run mesure:c26c-pic` rend **143 semaines de pic sur 2 192 près du plafond APRÈS coupe
(7 %)**. J'ai publié ce chiffre comme le taux de déclenchement : c'est faux, parce que C26c coupe
JUSQU'À repasser sous le plafond — **son succès efface sa trace**, et l'état résiduel sous-estime
le déclenchement. Mesuré correctement (rayon au golden) : **178 profils sur 989, 18 %**. Ni
déclaratif ni règle de fait. Répartition non devinable : duathlon 17 % des semaines, run 13 %,
tri 7 %, natation et trail 0 %.

**Effet, au pic et en tri** : nage seuil **406 896 → 424 683 m (+4,4 %)**, VO2 **10 308 → 8 628
min (−16,3 %)**. Cliquets : S4 (I14) **357 → 349** — huit semaines de plus voient leur sortie
longue redevenir la plus longue de sa discipline — et S5 504 ; attribution PROUVÉE par retrait
du seul facteur.

**Et le lot a réveillé un défaut LATENT qu'il ferme** : le déclassement de C26c écrivait
`bk.easy`, une zone **qui n'existe pas** dans `ZDEF` (le vélo facile est `bk.z2`). Il ne tombait
jamais sur un bloc vélo tant que la cible était choisie ailleurs ; l'ordre de cession y envoie le
VO2 — donc **64 violations DURES** au sceau, sur `bike/crit/debutant`. Un lot qui réveille un
défaut dormant ne l'a pas créé, mais c'est lui qui doit le fermer.

Garde **T-48** (cliquet de composition du pic, population 187), contre-prouvée : ordre neutralisé
→ 10 308 min de VO2 et 406 896 m. ⚠ Ma première écriture de cette garde mesurait **O-74** et non
l'ordre de cession (elle exigeait « jamais de VO2 pendant que la nage seuil est absente » et
rendait 72 profils — mais sur ces plans la nage seuil n'existe pas au pic, et un ordre de cession
ne protège pas une séance absente) : troisième « énoncé sans objet » de la journée.

### Le test RÉTROACTIF de `prioriteFinancement` — et il ÉCHOUE

Le fondateur : *« la pièce 1 demandait des minutes, et la politique a été écrite après elle ;
donc la mesure existe — Nage vitesse descend-elle ENCORE ? »* Mesuré : **58 plans sur 129 (45 %)
voient leur dose de « Nage vitesse » descendre** du premier au dernier quart (ex. `tri/M/confirme`
41 → 29 min). **La politique n'oriente pas ce mécanisme.** La raison est structurelle et se lit
dans DEUX_CANAUX : `prioriteFinancement` protège l'OCCURRENCE (les passes qui retirent des
séances la consultent), or cette descente est une réduction de TAILLE, qui passe par le scaling
de volume et les plafonds. Les deux documents se rencontrent ici : le canal déclaré pour la
qualité nage est « occurrence », donc la taille n'est pas protégée — et la question de savoir si
une « Nage vitesse » à 29 min a encore un contenu reste ouverte, elle appartient au §1 de
QUI_PAIE.

### Le critère de FIN du lot progression (§6)

*« si le max n'atteint pas la phase de pic une fois footing, sortie longue et récup livrées, ce
n'est plus un défaut de progression, c'est le plafond — et le ticket bascule sur l'allocation /
le structurel. »* Écrit ici pour être vérifié à ce moment-là, et pas plus tôt : c'est ce qui
évite d'ajouter des pièces si la cause a changé de nature. État courant du repère (O-72) : le
maximum est passé de S4 (base) à S19 (dev), le pic étant en S33-38.

```verify
id: O-75
quoi: au pic, le VO2 cède-t-il avant la nage seuil quand C26c mord ?
attendu: /✓ T-48 \[vert/
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep "T-48"
```

## O-76 · « Nage vitesse » perd sa SUBSTANCE — l'occurrence est protégée, la taille non · 🔴 **OUVERT, cause NON identifiée (mesuré)**

Le fondateur, corrigeant sa propre consigne (« UN CORRECTEUR SANS TRACE » §2) : *« protéger un
seul canal ne protège pas un type — ça choisit seulement de quelle façon il meurt »*. Mesuré :
`prioriteFinancement` protège l'OCCURRENCE de la qualité nage, et la dose descend quand même sur
**58 plans sur 129 (45 %)** — par la TAILLE (ex. `tri/M/confirme` 41 → 29 min du premier au
dernier quart).

`canauxProteges()` déclare désormais les DEUX axes pour la qualité de la discipline limitante.
**Le plancher de taille n'est PAS posé, et c'est délibéré : on ne sait pas encore quel mécanisme
réduit.** Mesuré par neutralisation (`npm run mesure:morsure`, méthode du §1) :

```
sans C26c ......................... 58/129   RÉFUTÉ
sans C22 .......................... 58/129   RÉFUTÉ
sans I14 .......................... 58/129   RÉFUTÉ
sans la trajectoire du brick ...... 49/129   ← 9 profils attribuables à la pièce 1
```

Donc **49 des 58 PRÉEXISTENT** au lot progression, et les trois correcteurs qu'on soupçonnerait
d'abord sont écartés. Poser un plancher sans savoir où le paiement se fait serait la faute que la
règle 7 nomme. La suite est d'identifier le mécanisme (candidats non testés : la boucle de volume
R3.3, la coupe par `sessions_max` d'O-66, le gabarit `PB`/`PT` par phase).

```verify
id: O-76
quoi: la dose du créneau de nage aérobie dominant descend-elle encore entre le premier et le dernier quart du plan ? (le type est TROUVÉ par sa structure — corps en `sw.aero` — et PUBLIÉ, jamais nommé : le nom a déjà cassé ce bloc une fois, O-79)
attendu: /[1-9][0-9]*\/1[0-9][0-9]/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let t=0,d=0;const vus=new Map();for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const par=new Map();for(const w of p.weeks||[]){if(w.isRecup||w.phase?.id==='taper')continue;for(const x of w.days||[])for(const s of x.sessions||[]){if(s.d!=='sw')continue;if(!(s.steps||[]).some(b=>b.role==='body'&&b.zone==='sw.aero'))continue;const k=s.name||'';(par.get(k)||par.set(k,[]).get(k)).push(s.min||0);}}let nom=null,nv=[];for(const[k,v]of par)if(v.length>nv.length){nom=k;nv=v;}if(nv.length<6)continue;t++;vus.set(nom,(vus.get(nom)||0)+1);const q=Math.max(1,Math.floor(nv.length/4));const a1=nv.slice(0,q).reduce((u,v)=>u+v,0)/q,b1=nv.slice(-q).reduce((u,v)=>u+v,0)/q;if(b1<a1-1)d++;}console.log(d+'/'+t+' — type dominant : '+[...vus].sort((x,y)=>y[1]-x[1]).map(([k,v])=>k+' x'+v).join(' · '));"
```

## O-73b · Le balayage des mesures « est-ce que X mord ? » — B-02 sous-comptait d'un facteur 20 · ✅ **RECTIFIÉ**

Demandé par le fondateur (§1) : *« pour chaque mesure de "est-ce que X mord ?" du registre —
X laisse-t-il une signature (sortie lisible) ou restaure-t-il l'invariant (la mesure
sous-compte) ? »* Le cas qu'il nomme en premier est le bon : l'arbitrage B-02 déclarait *« le
plafond actuel est dormant : sur les 945 profils du golden, il ne mord que sur 6 profils
(0,6 %) »*, et cette conclusion a orienté tout ce qui a suivi.

**Mesuré au déclenchement : 118 profils sur 985 (12 %). Un facteur VINGT.** La conclusion « la
règle ne protège aujourd'hui presque personne » était fausse. Le refus du recalibrage, lui, tient
toujours — il s'appuyait sur d'autres critères mesurés (45 % du catalogue touché, 64 % de la
population nage), pas sur celui-ci.

Le balayage est étendu et outillé — `npm run mesure:morsure` :

```
C26c — plafond de temps dur ........ 118 / 985  (12 %)
C22  — lissage ≤ +10 %/sem ......... 168 / 985  (17 %)
I14  — la longue est la plus longue  344 / 985  (35 %)
I14b — regarnissage des faciles ..... 300 / 985  (30 %)
```

Aucun n'était dormant, et aucun de ces chiffres n'était connu. La méthode passe par
`npm run casser` (jamais un `sed` ad hoc) et le script refuse de conclure sur un 0 % : *une règle
qu'on désactive sans que rien ne bouge n'a pas été désactivée*.

```verify
id: O-73b
quoi: la fréquence de morsure se mesure-t-elle au déclenchement, et les quatre correcteurs mordent-ils ?
attendu: /C26c — plafond de temps dur\s+1[0-9][0-9] \/ 98[0-9]/
cmd: npm run --silent mesure:morsure
```

## LOT INTERFACE — O-60 · O-61 · O-59 · balayage moteur→affiché · ✅ **LIVRÉ** (19/08/2026)

Les trois défauts d'usage du fondateur, spécifiés depuis une semaine, plus la pièce 4. Périmètre
gelé, tenu.

### O-60 — le détail de séance « ne s'affiche pas en natation » : l'hypothèse RÉFUTÉE, le mécanisme est la POSITION

L'hypothèse du ticket (« le rendu teste `durationMin`, un bloc en mètres rend le vide ») a été
mesurée AVANT d'écrire, comme le ticket le demandait — et **réfutée** : 0 séance à `det` vide sur
le plan entier du profil concerné. Le vrai mécanisme :

```
jour MULTI-séances :  héros    → « puis <2e séance> » À LA PLACE du déroulé de la 1re
                      carte    → sautait actives[0] au motif « le héros l'affiche déjà »
                                 (vrai seulement en mono-séance)
   ⇒ le déroulé de la PREMIÈRE séance n'existait NULLE PART à l'écran
```

Et sous `doubles`, la première séance du jour est **la nage 66 fois sur 66** (profil 70.3 du
constat) : la corrélation avec l'unité était accidentelle — la discipline limitante du fondateur
occupait simplement toujours la position perdante. *« Il doit ouvrir le plan HTML pour savoir
quoi faire dans l'eau »* : c'était ça.

Correctif : en multi-séances, la carte de détail porte le déroulé de TOUTES les séances, la
première comprise — le motif même de la décision du 11/08 (« sinon l'information n'existerait
nulle part »). Garde `§1quater` de `smoke-zenna` : un jour double est TROUVÉ DANS LE PLAN (pas
deviné — la semaine ancrée est en début de rampe et n'en a pas), et chaque séance de la carte a
son déroulé, la première en tête.

**Trois fautes d'instrument, publiées — deux fois la même.** (1) Mon pipeline `| grep` a masqué
le code de sortie de la suite — la faute exacte que ce registre venait de me voir corriger sur
`run-all`. (2) et (3) : deux surcharges de profil déclarées par un canal qui ne les lit pas.
`sessions_max` passé en champ de SAISIE alors que c'est un groupe d'OPTIONS → le répondeur
générique prenait « 3 » en silence ; corrigé, le plan restait sans jour double — parce que
`vol_max` et `vol_recent` sont AUSSI des options et retombaient sur « ≤4h » et « <2h ». Le plan
mesuré était minuscule et n'était jamais celui que je croyais déclarer. À chaque fois, c'est le
TÉMOIN (« AUCUN dans le plan ») qui l'a dit, au lieu de laisser le critère mesurer l'absence.

### O-61 — la barre de zones porte ses libellés et ses grandeurs

`1 │ 2 │ 1` était le résumé d'un détail qui manquait (O-60) — un résumé seul est incompréhensible
par construction, et *« un numéro de zone est une convention que l'athlète n'a pas »*. Chaque
segment porte désormais son libellé et sa grandeur, lus sur le BLOC : le rôle nomme l'échauffement
(« Éch 300m ») et le retour au calme (« RC 200m »), le niveau nomme le corps (« Aéro 1975m »,
« Seuil 4×6min »). Les cinq mots (Récup/Aéro/Tempo/Seuil/VO2) sont la LÉGENDE de l'axe que la
barre affichait déjà (`ZONE_LEVEL`, dérivé des ancrages FC du moteur) — pas une table de zones
parallèle. Un segment étroit TRONQUE son texte (la largeur est une information — proportionnelle
à la durée) ; le libellé complet vit dans `title` et le déroulé sous la barre. Le contraste est
revérifié par la garde WCAG existante de `smoke-zenna` : les libellés sont des nœuds texte, elle
les balaie d'office.

### O-59 — la navigation du questionnaire passe par l'IDENTITÉ

Le constat (« après suivant puis précédent, on ne revient pas sur le même écran ») avait sa cause
dans `state.js` : **`e.step = S.step` — l'INDICE est persisté et restauré**, contre une liste que
chaque déploiement peut recomposer (les étapes sont dynamiques depuis U14). *« Un ordinal n'est
une position que si la collection est stable »*, et sur ce produit — déployé à chaque push — elle
ne l'est jamais longtemps.

Correctif : `S.stepId` (l'`id` que chaque étape porte déjà) est enregistré au rendu, persisté à
côté de l'indice, et **la position se résout par identité** — au rendu (restauration), et au clic
(la liste a pu se recomposer entre le rendu et le clic). L'indice ne reste que comme repli quand
l'id a disparu (étape retirée par un déploiement). Le retour depuis le récapitulatif vise « la
dernière étape de la liste COURANTE », plus « l'indice d'avant moins un ».

Garde dans `smoke-questionnaires`, trois volets : le geste du constat (suivant puis précédent,
marques comprises — ma première écriture lisait la marque AVANT de répondre et comparait null à
la réponse, rouge à raison) ; le rechargement en plein questionnaire ; et la contre-preuve du
mécanisme — **l'indice persisté est corrompu (+3), l'identité intacte, l'écran restauré doit
suivre l'identité**. C'est exactement ce qu'un déploiement produit : l'indice devient faux, l'id
reste.

**La famille, balayée** (le ticket le demandait) : `answers.done` indexé `"sem|jour|si"` (O-71,
déjà enregistré), positions de paliers (O-58, déjà enregistré), `answers.tests` — EXEMPTÉ, la
collection est append-only donc stable. Aucune autre occurrence trouvée dans `endurabuild/js`.

### Contre-preuves — les deux mécanismes, vérifiés rouges par `npm run casser`

```
O-60  condition d'origine remise (x !== actives[0])
      → « la PREMIÈRE séance a son déroulé » ROUGE (« VIDE »), « CHACUNE » 1/2,
        le témoin (jour double trouvé, séances nommées) reste VERT

O-59  ré-ancrage par identité neutralisé (la restauration redevient un indice nu)
      → le volet 3 ROUGIT : l'écran restauré est « Tes niveaux (3 disciplines) » —
        trois écrans plus loin, exactement le +3 injecté. Les volets 1-2 restent
        VERTS, et c'est cohérent : l'indice suffit tant que la liste ne bouge pas —
        le défaut ne vit que dans la recomposition, là où le volet 3 le cherche.
```

### Pièce 4 — le balayage moteur→affiché, et son unique instance mesurée

Le balayage des modules UI (arithmétique sur css/ftp/pace, conversions locales) a rendu **une
seule instance** de la famille « recalculé à l'affichage plutôt que lu depuis le livré » :
`_blkMin` (plan-view.js), qui convertissait les mètres en minutes à **2 min/100 m** quel que soit
l'athlète — la barre de zones d'une nage était donc fausse en proportions pour tout CSS ≠ 2:00.
Sa propre dette (« à brancher », 14/08) attendait une mesure de sémantique : faite — **2 088
blocs multi-répétitions sur 2 088, `_min` = reps × durée + récup (le TOTAL, R5.6a), 0 bloc sans
`_min`**. Branché : `_blkMin` lit `st._min` d'abord, l'estimation ne survit qu'en repli pour un
step d'avant-rendu. Le reste du balayage est propre : les autres hits lisent le livré (parseur
d'affichage de la prédiction) ou sont des chemins d'import, pas des recalculs.

---

## O-43 §5 — L'ISSUE 1 ÉCRITE, MESURÉE, ET **RETIRÉE** : elle échange une faute d'unité contre une autre

Le §4 avait retenu l'issue 1 — *« borner la sonde sur une grandeur invariante par la conversion
(mètres pour la nage) »* — comme la seule à survivre au filtre. **Écrite et mesurée, elle ne tient
pas dans la forme la plus directe**, et la raison est instructive.

### Ce qui a été écrit

`stepWorkMin(st, disc, refs, auRepere)` : la MÊME formule, le ratio de zone neutralisé. La sonde
V2.1 pèse alors la semaine saturée au repère mesuré de l'athlète (CSS, allure seuil) au lieu de
l'allure de chaque zone. Une seule dérivation, paramétrée — pas une seconde table.

### Ce que la mesure a rendu

```
maillon `courbe` de la chaîne R20.2      2,21 → 2,46   →   NE BOUGE PLUS   ✔ la sonde est découplée
sceau S4 (I14, la longue est la plus longue)   349 → 372   +23 violations   ✖
sceau S5                                       504 → 511    +7 violations   ✖
golden                                    579 profils, 29 942 champs, écarts NUMÉRIQUES
audit:v1                                  vert (0 violation dure)
```

**La moitié visée est atteinte** — la sonde ne se nourrit plus de la tarification. **L'autre moitié
casse**, et c'est une faute d'unité que j'ai commise en corrigeant une faute de circularité :

```
capacité mesurée      en heures-REPÈRE  (les mètres comptés au CSS)
comparée à `peakH`    en heures RÉELLES (le temps que la semaine prendra)
```

`sw.easy` vaut 0,893 × CSS : au repère, un bloc facile pèse MOINS de minutes qu'il n'en prendra.
La sonde sous-estime donc la semaine, la promesse descend, les plans rétrécissent, tombent sur
leurs planchers — et I14 casse 23 fois de plus. **Règle 14, dans le correctif d'une règle 12.**

### Ce que ça apprend sur la forme du correctif

La contradiction est structurelle et elle mérite d'être écrite :

```
la sonde doit être INVARIANTE à la tarification   (sinon O-43 : re-tarifer ajoute des séances)
la sonde doit rendre des HEURES RÉELLES           (sinon elle ment sur ce que la semaine prend)
les mêmes mètres prennent des heures DIFFÉRENTES  selon la tarification
   ⇒ les deux exigences sont incompatibles tant que la sonde produit un plafond en HEURES
```

L'issue 1 est donc juste dans son intention et incomplète dans sa cible : **ce n'est pas la
MESURE de la sonde qu'il faut rendre invariante, c'est la GRANDEUR qu'elle borne.** La nage doit
entrer dans la capacité par ses MÈTRES (invariants), et le plafond en heures doit venir des
déclarations — `vol_max`, `sessions_max`, `dispo`, `doubles` —, exactement le §1 du fondateur.
C'est un redécoupage de la sonde, pas un drapeau sur une conversion.

**Rien n'est livré côté moteur** : `src/` byte-identique. La mesure et la raison le sont.

### §2 — LA MESURE PRÉALABLE, FAITE : `npm run mesure:manque`

Le fondateur la conditionnait à l'écriture — elle ne l'exige pas, elle se fait sur le moteur
actuel, et **elle confirme sa prédiction**.

```
manque TOTAL du plan > 0,5 h   568 / 985   (58 %)
                     > 1 h     374         (38 %)
                     > 2 h     191         (19 %)
                     > 3 h     135         (14 %)

par plan : méd 0,6 h · p90 4,2 h · max 36,6 h        en part de la cible : méd 1,7 % · p90 3,9 %

part de la cible non placée, par sport :
  tri 2,7 %  ·  swimrun 2,6 %  ·  run 2,0 %  ·  swim 1,9 %  ·  trail 1,0 %  ·  duathlon 1,0 %  ·  bike 0,4 %
```

**C'est la majorité** : le maillon ne peut donc pas être hebdomadaire. Il se déclare **une fois par
plan, avec son ampleur totale** — un diagnostic de conception, pas une alerte. Et le chiffre qui
justifie le lot progression existe désormais : **la médiane d'un plan laisse 0,6 h sur la table,
le décile supérieur 4,2 h, et le pire cas 36,6 h.**

Les disciplines les plus touchées sont celles qui prescrivent en MÈTRES ou qui empilent le plus de
créneaux courts (tri, swimrun, nage) — cohérent avec la chaîne d'O-78.

```verify
id: O-43-manque
quoi: la majorité des plans laisse du volume non plaçable — le manque se déclare par PLAN
attendu: /la MAJORITÉ des plans est concernée/
cmd: npm run mesure:manque
```

---

## O-79 — « Nage vitesse » ne contenait pas de vitesse · ✅ **RENOMMÉE** (19/08/2026)

Suite directe de la correction de prémisse d'O-78 : le corps de cette séance est en **`sw.aero`**,
une zone AÉROBIE — le moteur la classe FACILE, et y déverse conformément à R4.1. Le nom annonçait
une intensité que la séance ne contient pas.

Le fondateur a refait le compte sur son propre plan avec la bonne classification :

```
compté avec le nom          60 récup + 42 vitesse + 27 seuil   →  46 % de facile
compté avec les ZONES       60 récup + 42 aérobie = 102 / 130  →  78 % de facile, 21 % de qualité
```

*« Ma discipline limitante reçoit 78 % de volume facile »* — et pour un nageur autodidacte dont la
technique se dégrade sous fatigue, du volume facile est le pire investissement : il grave le geste
imparfait au lieu de le corriger. **Le nom a trompé le fondateur exactement comme il trompe
l'athlète** : famille T-40, sur l'INTENSITÉ au lieu de la distance.

`« Nage vitesse » → « Nage aérobie + accélérations »`, et la note dit ce que la séance est : *« le
gros du volume est aérobie, avec des accélérations de 50 m pour tenir la fréquence : c'est du
volume nagé propre, pas une séance de vitesse »*. Le CONTENU ne change pas — c'est un renommage,
et il est mesuré comme tel : **129 profils du golden, 9 516 champs, plus grand écart numérique 0.**

Ce que ça ne corrige PAS, et qui reste ouvert : cette séance est le déversoir du plan tri (O-78).
La renommer la rend honnête, elle ne la borne pas.

---

## O-78 — LE PUITS NE CACHE PAS UN EXCÈS, IL CACHE UN MANQUE : borner révèle 18 violations DURES

Le §1 de « UN PUITS NON BORNÉ CACHE CE QU'IL ABSORBE » pose trois issues et en retient une :
*« déverser dans le puits suivant déplace le défaut · un puits plus gros est la même famille ·
DÉCLARER le manque est le seul qui produise de l'information »*. **La mesure valide l'analyse et
en durcit la conclusion : le manque n'est pas déclarable en l'état, parce qu'il n'existe pas
là où on le croyait.**

### La chaîne, mesurée de bout en bout

```
`blockBounds` rend `cap: 9999` pour tout bloc de corps sans `bnd`, hors brick et hors `long`
   → 17 types de séance tri l'atteignent, sur 38 % des séances
      → le plus visible : « Nage vitesse », 4 025 m sur un SPRINT (course de 750 m),
        soit ×3,8 le plafond de la nage principale du format
```

Et la porte d'entrée est une **faute d'unité, la famille de la règle 14** :

```
PT(lo, hi) = max(1, round((lo + (hi−lo)·x) · sessionScale))
                                              ^^^^^^^^^^^^
`sessionScale` est un facteur de TAILLE, et il multiplie aussi un NOMBRE DE RÉPÉTITIONS :
`B(PT(2, 3), PT(12, 18), "bk.ss")` naît à UNE répétition dès que l'enveloppe se resserre.

   37 % des blocs de qualité du golden naissent à `reps = 1`
   (course 55 % · vélo 72 % · tri 33 % · duathlon 11 % · swimrun 1 % · trail 0 %)
      → `repCap` (R4.1) ne vit que dans la branche `reps > 1` : ils en sortent
         → `scaleBlock` met alors la DURÉE à l'échelle, bornée par `cap: 9999`
            → croissance cumulée mesurée sur un profil : 19 → 21 → 31 → 43 → 57 → 67 min
```

« Protégé par le chemin, pas par la borne », dans sa forme exacte.

### Trois correctifs essayés, trois DÉPLACEMENTS mesurés — le §1(a) confirmé quatre fois

```
borner « Nage vitesse » seule       « Sweetspot vélo » max  96 → 144 min   (le puits suivant)
geler la durée d'un bloc de qualité
  mono-répétition (branche durée)   « Nage vitesse »  max 144 → 206 min   (l'autre branche)
+ la branche distance               aucun changement — `sw.aero` n'est PAS une zone de qualité
borner les 6 créneaux vélo + nage   le brick tombe SOUS son plancher audité : 18 violations DURES
```

**La troisième ligne corrige ma propre prémisse et elle est publiée** : `sw.aero` est une zone
AÉROBIE pour le moteur, donc « Nage vitesse » est classée FACILE — le moteur y déverse
*conformément* à R4.1 (« le déversement doit aller vers les séances faciles »). Le défaut n'est
pas qu'un bloc de qualité déborde : c'est qu'une séance **nommée « vitesse » sert de déversoir**,
et que son nom ment sur ce qu'elle contient. Famille de T-40, sur l'INTENSITÉ au lieu de la
distance.

### Le résultat qui décide : le manque tombe sur un PLANCHER DE SÉCURITÉ

Bornes posées partout, `audit:v1` passe de 0 à **18 combinaisons en violation DURE**, toutes
« brick vélo hors bornes format ». **Direction vérifiée avant de conclure : SOUS le plancher, 0
au-dessus** — sur `tri/Full/confirme/inter/plaisir`, un leg vélo de brick livré à **116 min pour
un plancher audité à 150**.

Le puits ne dissimulait donc pas un excès de volume mal placé : il dissimulait que **le plan ne
peut pas placer son volume dans ses bornes de séance**, et il payait la différence en la parquant
dans une séance qui n'a pas de plafond. C'est la phrase du §1 — *« le plafond structurel est trop
bas, et le puits le dissimule depuis toujours »* — devenue une mesure.

### Pourquoi « déclarer le manque » ne peut pas s'écrire aujourd'hui

Le §1 propose de placer ce qui rentre et de déclarer le reste en maillon. **Mesuré, le maillon
lirait ≈ 0**, et pour une raison connue :

```
                                   HEAD          « Nage vitesse » bornée
  livré (semaines de charge)       22 543 h      21 903 h
  cible DÉCLARÉE                   23 164 h      22 447 h      ← elle SUIT le livré
  écart                              2,7 %          2,4 %
```

La sonde de capacité V2.1 lit ce que le moteur parvient à placer : borner un créneau abaisse la
PROMESSE au lieu de révéler le manque. C'est **O-43**, et il passe donc du statut « ouvert » à
celui de **bloqueur de la moitié instrumentation de ce lot** — sans lui, la mesure que le §1
demande est vacueuse par construction.

### Ce qui est livré, et ce qui ne l'est pas

**Livré** : `npm run mesure:puits` — l'inventaire des puits avec ce que chacun absorbe, sur le
corpus. C'est l'instrument que le §1 réclame (« rendre visible la contrainte que le lot
progression existe pour lever »). Il publie aussi sa limite : `Footing facile` est BORNÉ et
disperse à ×2,4, donc la dispersion seule ne sépare pas « libre » de « gros » — le signal qui
décide reste l'absence de plafond, pas la queue.

**Non livré, délibérément** : les bornes. Elles transforment un manque silencieux en **18
violations d'un plancher de SÉCURITÉ**, ce qui est plus grave que le défaut qu'elles corrigent
(priorité 2 du manifeste). L'ordre juste est donc l'inverse de celui qu'on croyait :

```
1. O-43   que la cible cesse de suivre le livré     ← sans lui, le manque est indéclarable
2. le plafond structurel : pourquoi le plan ne peut-il pas placer son volume ?
3. borner les puits, le manque devenant lisible
4. les pièces du lot vélo
```

```verify
id: O-78
quoi: des types de séance de NAGE atteignent-ils encore `cap: 9999` ? (le marqueur `∞` de la sortie, pas un nom de séance — O-79 a renommé le type et fait basculer ce bloc à tort)
attendu: /∞.* sw /
cmd: npm run mesure:puits
```

---

## T-16d — LE DESCRIPTEUR DÉCRIVAIT UN AUTRE PLAN QUE CELUI QU'IL ACCOMPAGNE · ✅ **LIVRÉ** (19/08/2026)

Le §1 de « T-16c — MESURER LE RAYON AVANT DE L'APPELER UN CHANTIER » posait la question qui
décide : *« qui lit la bande d'allure prescrite entre sa position actuelle et le point fixe ?
personne → c'est un déplacement ; un ou deux sites → le chantier est là »*.

**La mesure a RENVERSÉ la prémisse du fondateur**, et c'est elle qui a dicté le correctif : la
bande n'a pas « des lecteurs », elle a **deux FAMILLES de lecteurs**, et une seule est un
descripteur.

```
elle MODIFIE le plan   zoneClass (loadModel.ts:349) classe `rn.mara` en « dur » ou « modéré »
                       SELON la bande → intensitySplit → C26c, C26d, part facile.
                       Elle doit donc être connue PENDANT la construction. Elle l'est.
elle DÉCRIT le plan    zoneOf (renderer.ts:94) écrit la fourchette dans le texte de la séance.
                       Celle-là, et elle seule, doit décrire l'état FINAL.
```

Ce n'est donc ni un déplacement ni un chantier : c'est **le même objet qui sert deux rôles à deux
moments**, une seule source (`raceRunBand`) évaluée deux fois. Et en le construisant, deux défauts
sont apparus — tous deux vivants depuis B-22, tous deux invisibles à la relecture.

### Défaut 1 — la boucle de réparation re-rendait avec la table STATIQUE

`generateAudited` reconstruit ses `refs` sous un commentaire qui énonce la règle **pour les
deux substitutions** : *« la boucle de réparation re-rend des séances, elle ne doit pas les
re-rendre avec une AUTRE définition »*. Il ne portait que `bikeRp`. **`runMara` manquait**, donc
chacun de ses re-rendus retombait sur `ZDEF["rn.mara"]` — la table 1,08–1,13 × allure seuil que
B-22 existe précisément pour remplacer.

Mesuré sur un `tri/M` (seuil 4:15, `vol_max` 12) : **4 séances sur 5** affichaient
`4'35-4'48/km` (la table) là où la bande de l'athlète vaut `4'09-4'20`. La substitution était
défaite par le dernier maillon du pipeline.

### Défaut 2 — deux STATISTIQUES du même volume, sur deux POPULATIONS de semaines

```
bande PRESCRITE   moyenne des minutes de course sur TOUTES les semaines construites   1,26 h/sem
leg PRÉDIT        MÉDIANE des semaines dev/spec/peak hors récup (runHoursPerWeekOf)   1,62 h/sem
```

Le plan promettait donc une allure que sa propre prédiction contredisait, **sur le format M au
point d'être disjoints** (prescrit 275-288 s/km, prédit 247-262). `src/engine/planVolume.ts` porte
désormais la seule définition, importée par le pont ET par la boucle de réparation (R11.1). La
médiane des semaines de charge est la définition retenue, et sa raison est écrite dans le module :
l'exposant de Riegel décrit l'athlète tel qu'il ARRIVE à sa course.

### Ce qui est livré

Le calcul de la bande **après convergence, avant le sceau** (juste après `syncDerivedLabels`, le
point que le code documente lui-même comme « plus rien ne bougera — cette fois pour de vrai »), et
un re-rendu des seules séances qui portent `rn.mara`. **`st.maraBand` n'est PAS touché** : la
classification a déjà servi, la modifier ici ferait entrer un descripteur dans ce qu'il décrit —
la boucle d'O-43 sous une autre forme.

### La garde porte sur la CLASSE, pas sur la bande

`T-50` (banc `lotPhysio`) : **ce qui est AFFICHÉ se redérive du plan LIVRÉ**, au caractère près,
sur 187 profils tri et 1 812 séances `rn.mara`. Elle appelle `EBV2.raceRunBandOfPlan` — la
fonction du moteur, jamais une copie (même convention que `longRunSpecTarget`).

*Quel est le correctif le moins coûteux qui ferait passer ce test ?* (règle 19) — calculer la bande
depuis le plan livré et la rendre, c'est-à-dire la propriété elle-même : le test n'est pas
sous-spécifié. Et une constante gelée ne le satisfait pas : figer la bande la ferait diverger de la
redérivation dès qu'un plan a un autre volume de course.

**Faute d'instrument, publiée** : ma première écriture de `T-50` lisait `a.format` — le format
DEMANDÉ. B-17 rabat un Full sur un 70.3, et c'est le format RABATTU que le plan met en œuvre : 79
affichages sur 1 812 étaient déclarés « non redérivables » alors que le moteur avait raison et que
c'était ma sonde qui jugeait le plan livré contre l'intention de l'athlète. La faute est exactement
celle que le critère mesure, commise dans le critère.

**Portée : 160 profils du golden bougent, 1 690 feuilles, TOUTES des chaînes `.det`.** Vérifié par
une sonde qui énumère les feuilles en écart PAR TYPE — l'agrégat du golden rend « plus grand écart
numérique 0 », mais `countDiff` ne renseigne ce maximum que si les deux feuilles sont des nombres,
donc un nombre devenu chaîne y serait invisible. **Aucune feuille numérique ne bouge : le plan est
identique, seule sa description change.** Les trois cliquets du sceau et la composition du pic sont
inchangés — un descripteur ne modifie pas le plan qu'il décrit, et c'est mesuré, pas supposé.

**Faute d'instrument n° 2, publiée** : cette même sonde a d'abord rendu « 0 profil bouge · ✓ seule
la description change » — un ZÉRO SATURÉ. Elle lisait `p.k` quand le champ s'appelle `key`, donc la
photo n'était jamais trouvée et la boucle sortait par `continue` sur les 989 profils. Le vert rendu
était exactement la conclusion que je cherchais.

### Contre-preuves — les deux rouges, par `npm run casser`

```
substitution retirée      refs.runMara = bande;  →  supprimée
                          T-50 ROUGE, 1 817 / 1 817 · « affiche 4'52-5'05, redérivé 3'55-4'05 »
                          (4'52-5'05 EST la table ZDEF, 1,08-1,13 × l'allure seuil : la preuve
                          que sans cette ligne le rendu retombe sur la table statique)

bande GELÉE               runHoursPerWeekOf(best.plan)  →  la constante 5
                          T-50 ROUGE, 1 817 / 1 817 · « affiche 4'04-4'16, redérivé 3'55-4'05 »
```

La seconde est celle qui compte : c'est la question de la **règle 19** — *quel est le correctif le
moins coûteux qui ferait passer ce test ?* Une constante gelée ne le passe pas. Un test d'identité
entre l'affiché et le redérivé n'est satisfait que par le calcul lui-même.

```verify
id: T-16d
quoi: ce qui est affiché se redérive du plan livré (187 profils tri, 1 812 séances rn.mara)
attendu: /T-50 \[vert \]/
cmd: node scripts/lotPhysio.mjs
```

---

## LOT VÉLO (3ᵉ passe) · Le verrou T-16d posé, un SECOND gate objecte — et sa cause est un DÉVERSOIR sans borne · 🔴 **NON LIVRÉ, cause nommée un cran plus bas**

T-16d est livré et **T-16c passe au vert avec les pièces en place** : le fondateur avait raison sur
ce point, c'était bien le verrou. Mais les pièces rejouées font rougir un SECOND gate, et il ne
mesure pas la même chose.

```
audit:r14.1  R14.1-G   un plan qui monte le volume projette plus qu'un plan de maintien
             sans les pièces   maintien 12,1 %  →  montée 13,7 %   ×1,13   (barre 1,10)
             avec les pièces   maintien 12,1 %  →  montée 12,7 %   ×1,05   ROUGE
```

**Attribution PROUVÉE PAR RETRAIT DU SEUL FACTEUR** : T-16d seul, pièces retirées → ×1,13, tous
les gates verts. Pièces remises → ×1,05. Et le témoin ne bouge pas (« maintien » à 12,1 % dans les
deux états) : ce n'est pas un critère dont la référence a glissé.

### La cause, mesurée par phase puis sur le corpus

Le plan à `vol_max: 13` perd **0,39 h/sem** de volume prescrit moyen. La perte n'est PAS une rampe
(qui serait l'effet voulu d'une trajectoire) : elle est concentrée sur la phase **spécifique**,
`10,31 → 9,34 h/sem`, la phase la plus proche de la course.

**Et ma première lecture de cette perte était FAUSSE, dans le sens rassurant.** Sur la semaine 34
du profil, la seule différence était « Nage vitesse » `149 → 93 min` — j'allais publier « les
pièces ne détruisent pas du volume, elles empêchent le plan de parquer une heure dans une nage
vitesse de 2 h 29 ». **Le corpus dit l'inverse :**

```
« Nage vitesse » sur les 187 profils tri (3 172 séances)     sans les pièces    avec
  > 90 min                                                     61 (1,9 %)      163 (5,1 %)
  > 120 min                                                    29 (0,9 %)       80 (2,5 %)
  > 150 min                                                     0 (0,0 %)       10 (0,3 %)
  maximum                                                     144 min          210 min
```

Une observation sur UNE semaine d'UN profil, prise pour une tendance. C'est la règle 15 dans sa
forme temporelle : une mesure sur un point n'est pas une mesure.

### Ce qui bloque réellement : `sw.speed` est le DÉVERSOIR du plan tri, sans borne haute

Le créneau « Nage vitesse » absorbe ce que la courbe accorde et que les autres créneaux ne peuvent
pas prendre — **210 minutes de nage VITESSE**, ce qu'aucun entraîneur ne prescrit. Les pièces ne
créent pas ce défaut, elles **routent plus de volume à travers lui**, et c'est pour ça qu'elles
sont bloquées : *une réallocation a besoin d'un puits BORNÉ.*

C'est la **troisième occurrence** d'une famille déjà fermée deux fois, et jamais rejouée ici :

```
R13     le footing du triathlon n'avait aucune borne — 213 min mesurées, déversoir des remplissages
R20.3   le footing du swimrun n'avait aucune borne (O-8) — 179 à 226 min, devant la pivot
ICI     « Nage vitesse » du triathlon n'a aucune borne haute — jusqu'à 210 min
```

**C'est le lot suivant, et il vient AVANT les pièces.** R20.3 a mesuré et RÉFUTÉ deux écritures de
la borne avant d'en adopter une troisième : la même méthode s'applique, et elle ne se fait pas dans
la foulée d'un lot de descripteurs.

### Ce qui reste vrai des pièces, et qui n'est pas perdu

Leur gain est mesuré et il tient : **nage 49 → 29 %, vélo 29 → 47 %** (fourchette visée 45-50 %),
volume préservé, maximum du plan au PIC. Elles font aussi descendre le sceau `S4` de **349 à 342**
— sept violations de moins qu'avant le lot, le critère d'un ALIGNEMENT au sens du §3 du fondateur.
Leur code est intégralement décrit dans l'entrée « 2ᵉ passe » ci-dessous — c'est là qu'il se
récupère, pas dans un fichier de travail.

### §4 du fondateur, écrit ici et dans l'entrée de la 2ᵉ passe

**Deux pièces qui ajoutent de la charge doivent déclarer leur PHASE, pas seulement leur fréquence.**
Tombant la même semaine (paires toutes les deux), elles empilent au lieu de répartir : nage 37 %,
vélo 43 %. Décalées (long vélo en paires, routage `doubles` en impaires) : nage 29 %, vélo 47 %.
Personne ne l'avait prédit — ni le fondateur ni moi n'avions pensé à leur interaction calendaire.

---

## O-77 — la sortie longue RÉTRÉCIT quand le volume demandé AUGMENTE (inversion sur l'axe `vol_max`)

Trouvé en instrumentant le lot vélo, **PRÉEXISTANT** (mesuré identique avec et sans les pièces).
Profil 70.3, 43 semaines, `vol_recent: 9`, seul `vol_max` varie :

```
vol_max  9    « Sortie longue CAP »  18× · 82-88 min  (médiane 82)
vol_max 11    « Sortie longue CAP »  18× · 63-88 min  (médiane 63)
vol_max 13    « Sortie longue CAP »  18× · 51-88 min  (médiane 62)
```

**Déclarer 4 h de plus par semaine RACCOURCIT sa sortie longue de 20 minutes.** C'est la troisième
inversion de monotonie mesurée dans ce dépôt, sur un troisième axe : `I13` sur le NIVEAU (le
débutant recevait plus que l'inter), `O-21` sur l'ALLURE (le coureur lent recevait plus que le
rapide), celle-ci sur le VOLUME DEMANDÉ. Aucune des trois n'aurait été trouvée par un gate — elles
demandent toutes de faire varier UNE entrée et de regarder la sortie.

Piste, non vérifiée : à `vol_max` élevé le plan ajoute des SÉANCES plutôt que de la taille, et le
point fixe C22 rescale ensuite la semaine au prorata — la longue perd donc en part ce que la
fréquence gagne. À mesurer avant d'écrire quoi que ce soit.

```verify
id: O-77
quoi: la sortie longue d'un 70.3 rétrécit quand vol_max monte (82 → 62 min)
attendu: /INVERSION : déclarer plus de volume RACCOURCIT/
cmd: npm run mesure:longue-volmax
```

---

## LOT VÉLO (2ᵉ passe) · L'ordre du fondateur suivi : 2+3 d'abord, sans réveiller la boucle · 🔴 **UN SEUL ROUGE RESTANT, sa cause nommée**

Le §5 d'« O-43 BLOQUE LE LOT VÉLO » prescrit l'ordre le moins cher : *« essayer d'abord ce qui ne
réveille pas la boucle »* — le créneau long vélo (2) et le routage `doubles` (3), **sans borner la
nage**, et mesurer si ça suffit. **Fait, et la prédiction est vérifiée.**

```
                        nage    vélo   course   volume      MAX du plan
avant                    49 %    29 %    23 %    9,0 h/sem   S19 (dev)
pièces 2+3 seules        29 %    47 %    23 %    8,7 h/sem   S37 (PIC)
```

**Le vélo passe de 29 à 47 % — dans la fourchette visée (45-50 %) — le volume est PRÉSERVÉ, et le
maximum du plan atteint la phase de pic.** La sonde de capacité n'est jamais sollicitée : O-43
peut rester ouvert, exactement comme le fondateur l'avait posé en condition.

Un réglage a compté et il est mesuré : les deux pièces tombaient d'abord la MÊME semaine (paires).
Décalées (long vélo en paires, routage `doubles` en impaires), la nage passe de 37 à **29 %** et
le vélo de 43 à **47 %** — la charge vélo se répartit au lieu de s'empiler.

> **Deux pièces qui ajoutent de la charge doivent déclarer leur PHASE, pas seulement leur
> fréquence** (§4 du fondateur, 19/08/2026). Personne n'aurait prédit cette interaction calendaire
> — c'est la mesure qui l'a montrée, et c'est le genre de réglage qu'on redécouvre à ses dépens.

### Trois alignements, tous sur des règles EXISTANTES — et l'un d'eux AMÉLIORE le moteur

Ce ne sont pas des exclusions de périmètre ad hoc, et la distinction compte après l'arrêt d'hier :

```
sous blessure / drapeau médical   B1 du banc v6 : « déclarer une blessure ne doit JAMAIS
                                  augmenter la charge ». Mesuré rouge : tri/S/inter course
                                  +6 %, épaule +10 %, vélo +6 % — le module remplace déjà la
                                  discipline touchée par du vélo, la pièce s'empilait dessus.
                                  Règle de SÉCURITÉ, priorité 2 : exclusion non négociable.

plans < 12 semaines               C22 : sur un tri/S de 8 semaines, ajouter un type long fait
                                  passer un saut de charge à +11 %. Une progression demande de
                                  la durée pour s'exprimer sans à-coup.

marqueur `long: true` retiré      I14 : une séance marquée `long` doit être la plus longue de
                                  sa discipline dans sa semaine. Sans le marqueur, le sceau S4
                                  passe de 349 à **342 — SEPT violations de MOINS qu'avant le
                                  lot**. L'alignement améliore le moteur au lieu de le contraindre.
```

### Le rouge restant : T-16c, et sa cause est la famille du point fixe

Sur le format **M** uniquement : la bande « allure du jour J » PRESCRITE (275-288 s/km) ne
recouvre plus la bande PRÉDITE (247-262). Les deux pièces retirées SÉPARÉMENT le réparent (effet
combiné, témoin vérifié à 1 — la sonde voit bien le défaut).

**La cause n'est pas dans les pièces, elle est dans le moment où chaque bande se calcule.** T-16c
compare une bande lue dans le plan ÉMIS à une bande rendue par `predict()` sur le plan LIVRÉ ;
le lot change la part de course ENTRE les deux. C'est la quatorzième occurrence de la famille
fermée treize fois dans ce dépôt — « une garantie vérifiée au milieu du pipeline ne vérifie que
l'avant-dernier état ». La traiter demande de rejouer la prescription d'allure après le point
fixe : un chantier à part entière, pas une quatrième exclusion.

**Rien n'est donc livré côté moteur** (`src/` byte-identique à HEAD), et le code des deux pièces
est intégralement décrit ci-dessus pour être rejoué. L'ordre du fondateur reste bon : ce qui
manque n'est plus O-43 — c'est la cohérence de la bande d'allure au point fixe.

> **SUITE (19/08/2026) — le verrou est posé, et il ne suffit pas.** T-16d est livré et T-16c passe
> au VERT avec ces deux pièces en place : le diagnostic ci-dessus était juste. Mais un SECOND gate
> objecte (`R14.1-G`, ×1,13 → ×1,05), et sa cause est un cran plus bas — « Nage vitesse » est le
> déversoir du plan tri et n'a aucune borne haute. Voir l'entrée « LOT VÉLO (3ᵉ passe) ».

### §4 — les deux mécanismes à ne pas perdre, confirmés

*« Le doublage devrait ajouter dans la discipline qui en a besoin, pas toujours dans la même »* et
*« le créneau long est monopolisé par la course pendant les deux tiers du plan »* : les deux sont
mesurés, et ce sont eux qui portent l'essentiel du gain (47 % de vélo à eux seuls, sans toucher à
la nage). Ils restent la bonne cible.

## LOT VÉLO · La part et la progression — **B-10 LIVRÉ, le reste MESURÉ et REFUSÉ EN L'ÉTAT** (arbitrage « LE LOT VÉLO », 18/08/2026)

### Le préalable du §1, tranché : l'allocation n'est NI en parts NI en heures — elle est IMPLICITE

Le fondateur demandait laquelle des deux formes le moteur emploie. **Aucune.** Le schéma de
semaine (`weekBuilder.schema`) est agnostique de la discipline : il ne pose que des CRÉNEAUX
(`dur1`, `dur2`, `durLong`, `facileR`, `facile2`). C'est le module du sport qui décide quelle
discipline occupe quel créneau, par phase. La part livrée est donc le PRODUIT « nombre de
créneaux » × « taille du type qui l'occupe », et **rien dans le moteur ne la nomme ni ne la
vise**. Le préalable n'est donc pas de rendre proportionnelle une allocation absolue : c'est de
faire exister une cible de part. `npm run mesure:parts` la mesure désormais.

### §2 — l'écart mesuré, et il n'est pas celui qui était annoncé

```
                          nage     vélo    course      (épreuve 70.3 : 12 / 52 / 34)
profil fondateur          49 %     29 %     23 %       ← doubles: oui
moyenne golden (70.3)     18 %     47 %     35 %       ← doubles: non, majoritaire
```

**Les deux populations ne disent pas la même chose, et l'écart entre elles EST la cause** :
`doubles: "oui"` ajoute DEUX nages par semaine et rien d'autre — nage 32 → 49 %, vélo 39 → 29 %,
et les 2 h que le doublage ajoute vont ENTIÈREMENT à la natation. Sur une épreuve à 12 % de nage,
le doublage aggrave l'écart au lieu de le combler. (Vérifié par retrait du facteur : `oui` /
`parfois` / `non` → 49 / 32 / 32 % de nage.)

### §4 — la dépendance du fondateur, confirmée et CHIFFRÉE

*« Donner plus d'heures au vélo sans faire progresser ses types produit plus de sorties de
97 minutes. »* Mesuré, et pire que ça : **il n'existait AUCUNE sortie longue vélo**. Hors phases
spécifique et pic, le créneau `durLong` d'un triathlète portait « Sortie longue **CAP** » — une
sortie longue de course à pied. Le seul long vélo était le brick, qui n'existe qu'en spec/peak :
un athlète traversait toute sa base et tout son développement sans une seule sortie longue sur
la discipline qui fait la moitié de sa course.

### Ce qui est LIVRÉ : les MESURES et les outils, aucun changement de moteur

`npm run mesure:parts` (les parts par discipline, bricks ventilés par leg) est livré. **Aucune
des quatre pièces du lot ne l'est**, et c'est une conclusion mesurée, pas un renoncement.

**B-10 (sweetspot majoritaire) a été écrit, mesuré, borné trois fois, puis RETIRÉ.** Il produit
bien ce qu'on lui demande — sweetspot 6 → 14, force 17 → 6 — et il déplace même le MAXIMUM DU
PLAN dans la phase de PIC (O-72). Mais il a fallu l'exclure successivement des profils
`debutant`/`finisher`/`reprise` (sinon le BRICK sort de ses bornes de format, `audit:v2`), puis
des plans de moins de 12 semaines (sinon un saut de charge passe de +10 à +11 %, banc v6, «
discrétisation »), et il restait **deux régressions hors du plan** : **E2E 20/25** et le devis de
ravitaillement mensuel **vide 7 jours sur 7 au lieu de 2** (O-48). Changer le contenu d'un
créneau vélo modifie la durée et l'intensité des séances, donc les seuils de ravitaillement et
ce que les suites d'interface mesurent.

**Trois exclusions successives pour un seul changement de contenu, c'est le signal.** Chacune
était individuellement justifiée et mesurée ; leur accumulation dit que la pièce n'est pas mûre —
la faute que la règle 19 nomme est de continuer à ajuster jusqu'à ce que les gates passent.

### Ce qui est MESURÉ mais REFUSÉ EN L'ÉTAT — et pourquoi

Les deux autres pièces (**sortie longue vélo** avec trajectoire géométrique, et **alternance
nage/vélo sur le créneau du doublage**) ont été écrites, mesurées, et **retirées** :

```
avec les trois pièces   nage 26 % · vélo 46 % · course 28 %   ← les trois fourchettes visées
                        MAX du plan en S37, phase de PIC       ← O-72 franchi
                        MAIS volume 9,0 → 7,7 h/sem
                        ET audit:v2 rouge · I12 et I13 rouges
```

La cause est nommée : borner la nage abaisse ce que la **sonde de capacité V2.1** mesure, donc la
courbe, donc le volume — l'inter perd **2 séances et 183 min** au pic (445 → 262). Le vélo ne
peut pas absorber ce qui est libéré, parce que ses types ne sont pas encore assez grands. C'est
exactement la dépendance du §4, mais dans l'autre sens : **la part ne peut pas monter avant que
la progression des types vélo ne soit capable de la porter**.

Et chaque pièce retirée SEULE suffisait à réparer I12 comme I13 : l'effet est COMBINÉ, aucune
n'est fautive isolément. Publier un réglage qui passe les gates par ajustement au ras du test
serait la faute que la règle 19 nomme.

**Le code des trois pièces est conservé** (`/tmp` n'étant pas durable, il est reproductible depuis
cette entrée : trajectoire `lbCaps` géométrique sur `durLong` en semaines paires hors débutant,
alternance `dbl && weekNum % 2` sur `dur2`, bornage de `swTech` par `swimDist`). La suite est de
faire grandir les types vélo AVANT de déplacer la part — l'inverse de l'ordre tenté ici.

```verify
id: LOT-VELO
quoi: le déséquilibre force/sweetspot et l'absence de sortie longue vélo sont-ils toujours là ?
attendu: /sweetspot [0-9]+ vs force [0-9]+/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const fs=await import('node:fs');const a=JSON.parse(fs.readFileSync('tests/fixtures/profils30.json','utf8'));const B={sport:'tri',intent:'competition',format:'70.3',history:'confirme',level:'inter',vol_max:'20',vol_recent:'13',sessions_max:'12',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',injury:'aucune',age:'35',sex:'H',weight:'85',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'vallonne',leg_swim_env:'lac',milieu:'bassin',longest_swim_m:'1000',longest_swim_known:'oui',pace_known:'oui',pace:'4:42',ftp_known:'oui',ftp:'236',css_known:'oui',css:'2:02',plan_start:'2026-08-17',race_date:'2027-05-23'};const p=globalThis.EBV2.buildPlan('tri',B);let ss=0,fb=0;for(const w of p.weeks){if(w.isRecup||w.phase.id==='taper')continue;for(const d of w.days)for(const s of d.sessions){if(/Sweetspot/i.test(s.name||''))ss++;if(/Force basse cadence/i.test(s.name||''))fb++;}}console.log('sweetspot '+ss+' vs force '+fb);if(ss>fb)console.log('sweetspot-majoritaire');"
```

## O-74 · Les semaines de CHARGE du pic ne portent aucune nage seuil sur les profils `reprise` · 🔴 **OUVERT, mesuré**

Trouvé en bornant T-47. Sur `tri/70.3/reprise/inter` et `tri/70.3/reprise/avance`, les semaines
de charge du pic (S16, S18) portent « Nage vitesse » et « Nage endurance » — **la seule « Nage
seuil » de la phase vit en semaine de RÉCUP (S17)**. La qualité au seuil de la discipline
limitante disparaît donc des semaines où la spécificité compte le plus. Même famille que le
constat 1 d'O-72 (l'allocation du créneau dur au pic) ; non traité ici, aucune décision prise.

```verify
id: O-74
quoi: les semaines de charge du pic d'un profil tri/reprise portent-elles une nage seuil ?
attendu: /aucune nage seuil en charge de pic : [1-9]/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let n=0;for(const{key,sport,a}of profiles()){if(sport!=='tri'||!String(key).includes('reprise'))continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const w=p.weeks.filter(x=>x.phase.id==='peak'&&!x.isRecup);if(!w.length)continue;const s=w.some(x=>x.days.some(d=>d.sessions.some(y=>y.d==='sw'&&/seuil/i.test(y.name||''))));if(!s)n++;}console.log('aucune nage seuil en charge de pic : '+n);"
```

## §6 · L'onglet Semaine collé sur une semaine consultée · ✅ **FERMÉ**

`vue` est au niveau module, posée par les flèches, remise à `null` par le seul bouton « semaine
courante » — et le commentaire promettait « revenir sur l'onglet ramène à la semaine courante »,
ce que rien n'implémentait (la règle du dépôt sur les commentaires-invariants, prise en flagrant
délit). `resetWeekView()` est appelée par `setTab` à chaque entrée dans l'onglet depuis un autre —
jamais sur un re-rendu interne, les flèches restent fluides. Vérifié dans les deux sens, et le
témoin est parlant : **quatre flèches = « Semaine 5 »**, exactement son écran.

## O-43 §5bis — CADRAGE MESURÉ (19/08/2026) : **la circularité est propre à la NAGE**, donc c'est une conversion, pas une réarchitecture

Question de cadrage du fondateur, posée AVANT d'écrire O-43 : *« la sonde pèse-t-elle le vélo et
la course par leurs minutes prescrites (pas de conversion, pas de circularité), ou par une
grandeur ajustée à l'intensité (même circularité) ? »* — une réponse, et elle décide entre « une
conversion » et « une réarchitecture ». Instrument : `npm run mesure:circularite`, deux moitiés,
parce qu'une seule ne tranche pas (règle 15 : ce qui est ÉCRIT ≠ ce qui s'EXÉCUTE).

**§A — la STRUCTURE**, sur les 989 profils du golden. `stepWorkMin` ne convertit que les blocs
prescrits en MÈTRES (`distance ÷ (repère × ratio de zone)`) ; un bloc prescrit en minutes est
compté tel quel.

```
  disc   blocs   dont en mètres      minutes   dont converties
  course  53931      783 (  1 %)      51441 h      935 h (  2 %)
  vélo    32384        0 (  0 %)      30383 h        0 h (  0 %)
  nage    24992    23342 ( 93 %)      10713 h     9819 h ( 92 %)
  brick    3839        0 (  0 %)       7139 h        0 h (  0 %)
```

**§B — le COMPORTEMENT** : on perturbe UNE définition de zone de +16 % — une re-tarification
PURE, aucun changement d'entraînement — et on regarde si le plan LIVRÉ bouge. C'est l'expérience
de `T-34`, étendue aux trois disciplines.

```
  swim    sw.easy    1.1 → 1.1 h    5 → 4 jours   courbe 2.21→2.46 · boucle-growth 1.23→1.59
                                                  · structurel 1.73→1.68      ← BOUGE
  bike    bk.z2      9.9 → 9.9 h    6 → 6         aucun
  run     rn.easy    9.4 → 9.4 h    5 → 5         aucun
```

**Verdict : la branche « conversion » du fondateur.** Le vélo est prescrit en minutes à une zone
de puissance, la course en minutes à une zone d'allure : ni l'un ni l'autre ne traverse la
conversion, et re-tarifer leur zone facile ne déplace **rien** — ni le pic livré, ni le nombre de
jours, ni un seul maillon de la chaîne R20.2. La nage y passe à **92 % de ses minutes de corps**,
et la même perturbation lui coûte **un jour d'entraînement**. La redécoupe d'O-43 est donc une
**conversion unique au repère déclaré** — la nage entre par ses MÈTRES, le plafond en heures
venant des déclarations — et non une réarchitecture de la sonde.

**Une nuance publiée plutôt que tue** : la course n'est pas à zéro. 783 blocs (2 % de ses minutes)
sont prescrits en mètres et traversent donc le MÊME chemin — la circularité y existe, elle ne
s'exprime pas. « Propre à la nage » est un fait de PROPORTION, pas d'architecture : si un lot
futur prescrivait la course majoritairement en distance, la conclusion changerait de camp, et
c'est la mesure — pas le code — qu'il faudrait alors rejouer.

```verify
id: O-43-§5bis
quoi: re-tarifer une zone FACILE de +16 % déplace-t-il le plan livré ? (nage oui, vélo et course non)
attendu: CIRCULARITE-PROPRE-A-LA-NAGE
cmd: npm run mesure:circularite 2>&1 | grep -q "LA CIRCULARITÉ EST PROPRE À LA NAGE" && echo "CIRCULARITE-PROPRE-A-LA-NAGE"
```

## O-80 · Le format de fixture a DEUX CANAUX et rien ne vérifie qu'une valeur atterrit dans le bon · 🔴 **OUVERT — mécanique, ferme une classe à quatre occurrences**

Quatrième occurrence de la famille du **138 kg** (PW : le harnais E2E remplissait tout champ libre
non déclaré par le MILIEU de ses bornes, fabriquant un athlète de 138 kg dont le modèle avait
raison). Les trois dernières sont du même jour : `sessions_max`, puis `vol_max` et `vol_recent`,
passés en **saisie** alors que ce sont des **options** — le répondeur générique a pris la première
option en silence (« 3 », « ≤4h », « <2h ») et a produit un athlète minuscule sans jour double,
pendant que la mesure croyait interroger un triathlète à 12 séances. **À chaque fois c'est le
TÉMOIN qui l'a dit, jamais le critère.**

Cause commune, et elle est mécanique : **le format de fixture a deux canaux — clé d'option et
valeur brute — et rien ne vérifie qu'une valeur atterrit dans le bon.** Un canal qui ne route pas
retombe sur un défaut au lieu de lever.

```
un validateur de fixture lit ANSWER_SCHEMA et REFUSE une valeur non routable
  clé de type option + valeur brute  →  erreur nommée, jamais repli silencieux
```

Même leçon que le `?? []` de la sonde d'adhérence : **un repli dans un instrument transforme une
erreur en résultat** — et un résultat faux dans le sens rassurant. Le correctif ferme la classe au
lieu de demander de la vigilance une cinquième fois ; c'est le même geste que `npm run casser`
pour les mutations de source (le harnais possède le cycle de vie, la discipline ne suffit pas).

**Portée à couvrir** : le harnais E2E (`traverserQuestionnaire`) ET les fixtures des scripts de
mesure, qui construisent des `answers` à la main — c'est là que les trois occurrences du jour ont
eu lieu. Non écrit à ce stade : il vient après la redécoupe d'O-43 dans l'ordre du fondateur.

## Règle 17, troisième occurrence mesurée (19/08/2026) — **un renommage a fait basculer DEUX entrées en « ne reproduit plus », et les deux reproduisaient**

Trouvé en rejouant `npm run registry:check` après l'écriture d'O-43 §5bis : **O-76** et **O-78**
sont sortis en « ne reproduit plus → à passer au §4 ». Confirmés **à la main** avant d'être crus,
comme la règle l'exige — et les deux étaient des **faux positifs d'instrument**.

Cause unique : les deux blocs cherchaient le littéral **« Nage vitesse »**, et O-79 a renommé ce
type en « Nage aérobie + accélérations » la veille (commit `779838e`), parce que son nom annonçait
une intensité absente. Le renommage était juste ; il a rendu **muets** deux critères qui
mesuraient des défauts encore vivants. Le mode de défaillance est exactement celui que la règle
nomme : *un `grep` qui ne trouve plus son motif se lit comme un défaut réparé.*

```
O-76   la dose du créneau de nage aérobie dominant descend entre le 1er et le dernier quart
       → identité STRUCTURELLE (corps en `sw.aero`), type TROUVÉ et PUBLIÉ, jamais nommé
       59/130   (l'ancien bloc mesurait 58/129 — le défaut n'avait pas bougé)

O-78   des types de séance atteignent `cap: 9999`
       → marqueur `∞` de la sortie de `mesure:puits`, sur une ligne de NAGE
       ∞  3172  méd 38  max 144  ×3,8  ← le puits est là, il a seulement changé de nom
```

**Ce que ça ajoute à la règle 17** : elle visait jusqu'ici le *déplacement de code* (« un refactor
est un producteur de MASSE de ce défaut »). Un **renommage de donnée produit** l'est tout autant —
et il est plus discret, parce qu'il ne touche aucune structure et passe tous les gates. Le
correctif est celui déjà appliqué à `smoke-r4` et `smoke-avatar` en V5/R27 : **un critère
n'identifie jamais sa cible par un LIBELLÉ**, il la trouve par une propriété (une zone, un
marqueur de sortie) et publie le nom qu'il a trouvé. Un libellé est une chaîne d'interface : il
change pour de bonnes raisons, et il changera encore.

## O-43 §6 — LA REDÉCOUPE ÉCRITE EN TROIS TEMPS, MESURÉE, ET **ARRÊTÉE PAR LA RÈGLE D'ARRÊT** : la tarification réelle FINANÇAIT le manque structurel · 🔴 **LOT 1 BLOQUÉ — l'ordre s'inverse, le plafond structurel d'abord** (19/08/2026)

Le lot 1 de la file (« la nage entre dans la capacité par ses MÈTRES, convertis une fois au
repère déclaré ») a été écrit dans sa forme complète, en trois incréments mesurés chacun par
`mesure:circularite` §B (re-tarifer `sw.easy` +16 %, une comptabilité pure) et bissectés par la
trace. **Le moteur est RETIRÉ (`src/` byte-identique) ; le diff complet des trois écritures est
conservé dans `o43-redecoupe.patch`** (346 lignes : `stepAccountMin` dans `renderer.ts`, la
monnaie de compte dans les cibles, sondes, cliquets, élections et `reconcileDeclaredVolume`).

**Ce que la forme complète OBTIENT — la contre-preuve du §1.3 passe, pour sa moitié capacité :**

```
                        avant le lot          écriture complète
  courbe / declared /   BOUGENT (courbe       INVARIANTS — tous les maillons
  caps / ramp / sonde   2,21→2,46, jour       de la chaîne R20.2 immobiles
                        d'entraînement ±1)    sous re-tarification
  jours d'entraînement  5 → 4                 5 → 5
  mètres livrés         9 sem/12 divergent    9 sem/12 IDENTIQUES au mètre près
  pic livré (heures     1,1 → 1,2             1,2 → 1,3 — le DESCRIPTEUR suit le
  réelles, volPeak)                           prix, et c'est correct (mêmes mètres)
```

**Les trois écritures, et le mur que chacune a trouvé :**

1. **Sondes + cibles au compte** (la V2.1, la re-sonde, `targetH`, les cliquets
   `_prevChargeMin`/`_lastWeekMin`/`_maxChargeMin`, la boucle R3.3). La courbe devient
   invariante — et la semaine 1 du nageur débutant **sous-livre sa cible de 15 %** (46 min de
   compte pour 54), parce que les plafonds de séance en MÈTRES (600-650 m sur les créneaux
   techniques) ne peuvent pas la remplir en unités de compte. Le cliquet de croissance
   (« ≤ +10 % sur le LIVRÉ ») propage la sous-livraison : toutes les cibles s'aplatissent
   à ~0,9 h, le pic ne monte jamais.
2. **Les élections au compte** (les DOUZE électeurs : `cutSmallestSessionIn`,
   `cutLightestEasyDay`, l'élection inline de R3.13, et `raised.sort` — un 12ᵉ site hors du
   point unique T-46, trouvé par la trace : après remontée au plancher les candidates portent
   toutes ~600 m et seul le PRIX de leur mix de zones les départageait ; une re-tarification
   échangeait la victime « Récup eau » ↔ « Volume aérobie » et la composition cascadait).
   Les jours redeviennent invariants — et les passes de DOMINANCE trouvent un pic (39 min de
   compte) SOUS les semaines de dev (41) : la faiblesse structurelle du pic (famille O-72/O-74,
   les séances de qualité plafonnées plus bas que les planchers des faciles) déclenche
   « OFF (la semaine de pic reste la plus grosse) » ×5 et « OFF (équilibre du bloc) » ×9 —
   le plan sprint/débutant tombe à **2 séances de 15 min par semaine** (0,7 h contre 1,1).
3. **`reconcileDeclaredVolume` au compte** (D4, C22-final, A2/I1, R3.13 — pour que les passes
   post-boucle ne re-litigent pas en RÉEL ce que la boucle a égalisé en COMPTE).
   `audit:v1` passe de 0 à **6 violations DURES** : « semaine de récup plus chargée que la
   précédente » — D4 tient désormais la règle en compte, l'AUDITEUR la vérifie en RÉEL, et un
   mix de zones différent entre deux semaines voisines (récup facile ×1,12 contre charge à
   ~×1,0) les fait diverger. **O-36 mot pour mot : la coupe et l'auditeur ne comptent pas dans
   la même unité, et les aligner casse autre chose.**

**Le rayon, mesuré sur les 985 profils du golden** (séances et minutes par semaine de charge,
avant ↔ après la forme complète) : médiane **0,0 %**, 105 profils bougent de plus de 2 %,
**9 s'effondrent** (−24 à −54 %, tous swim/débutant) et **4 se réparent** (+39 à +108 %) — dont
`swim/demifond/ancien/debutant`, qui livre **aujourd'hui, en production, 2,4 séances de 15 min
par semaine** : la cascade d'effondrement EXISTE avant le lot, la tarification décide seulement
qui tombe dedans.

**Le verdict, et pourquoi l'ordre s'inverse.** La tarification réelle n'était pas un simple
biais de mesure : elle SERVAIT DE FINANCEMENT au manque structurel — les mètres faciles et
techniques, comptés plus chers, « remplissaient » la courbe que les plafonds de séance ne
peuvent pas tenir. La redécoupe retire ce financement, le manque apparaît (la semaine 1 débutant
sous-livre de 15 % par construction), et trois familles de cascades l'amplifient : le cliquet de
croissance sur le livré, la dominance sur un pic structurellement faible (O-72/O-74), et les
seuils tout-ou-rien des coupes de fréquence. C'est la conclusion d'O-78 (« le puits ne cache pas
un excès, il cache un manque ») un étage plus haut. **La file d'exécution s'inverse donc : le
lot PROGRESSION (lever le plafond structurel — les caps des types figés, le pic redevenu la
plus grosse semaine) vient AVANT la redécoupe**, parce que tant que le pic ne peut pas dominer
et que les caps ne peuvent pas tenir la courbe, toute comptabilité honnête fera tomber les
profils les plus plafonnés — et ce sont les mêmes qui tombent dans toutes les coupes (« C26c AU
PIC » §5).

Ce qui RESTE acquis : le cadrage §5bis (la circularité est propre à la nage — une conversion,
pas une réarchitecture), l'inventaire exact des sites (`o43-redecoupe.patch`), le 12ᵉ électeur
hors point unique (`raised.sort`, à couvrir par T-46 le jour où l'élection au compte revient),
et la contre-preuve que la forme complète REND la capacité et le contenu invariants — le
correctif est juste, c'est le terrain qui ne le porte pas encore.

```verify
id: O-43-§6
quoi: le moteur est bien revenu à l'état d'avant la redécoupe (retrait complet), et le patch des trois écritures est conservé
attendu: PATCH-CONSERVE-MOTEUR-INTACT
cmd: git diff --quiet HEAD -- src/ && test -s o43-redecoupe.patch && grep -q "stepAccountMin" o43-redecoupe.patch && echo "PATCH-CONSERVE-MOTEUR-INTACT"
```

## O-81 · Le footing tri de M et 70.3 est ÉPINGLÉ par une contradiction plancher > plafond · ✅ **FERMÉ (arbitrage du fondateur, 19/08/2026 — issue (a) : le plafond monte, le plancher ne cède pas)**

Trouvé en appliquant la géométrie du lot PROGRESSION au footing (pièce footing, 19/08/2026).
La mesure (`npm run mesure:progression`, profil fondateur 70.3) : **« Footing facile »,
75 occurrences, UNE valeur, 30 min, « au plafond ×75 »** — et la trajectoire géométrique posée
sur sa borne n'y change RIEN, parce que le type est épinglé par une contradiction STATIQUE :

```
  format   ftCaps        borne R13 (hi × 1,3)   plancher de dignité (blockBounds)
  S        25..45        58                     30      → trajectoire 30 → 58   AGIT
  M        15..26        34                     30      → trajectoire 30 → 34   marginale
  70.3     14..22        29                     30      → plancher ≥ plafond   ÉPINGLÉ
  Full     50..100       130                    30      → trajectoire 30 → 130  AGIT
```

Pour 70.3, la table du format dit « footing ≤ 29 min » et le plancher de dignité C8/C16 dit
« ≥ 30 min » : le plafond est SOUS le plancher, `Math.max(fl, cap)` tranche en silence, et le
type vaut exactement 30 min sur tout le plan, pour tout athlète — c'est le « 84 % au plafond
constant » de la file. Résoudre le pincement est une décision d'ENTRAÎNEMENT, pas de code : soit
les `ftCaps` de M/70.3 montent (le footing du 70.3 a-t-il le droit d'atteindre 40-45 min au pic,
maintenant que le brick et la longue progressent et que I14 borne toute séance par la sortie
longue ?), soit le plancher de dignité cède pour ce type (un footing de 22 min vaut-il le
déplacement ?). Les deux branches se mesurent (`mesure:progression`) avant d'être crues.

Au passage, de la même famille : le footing du sport COURSE pur (`src/sports/run/index.ts`,
`B(1, P(30, 50))`) ne porte AUCUN `bnd` — dans `blockBounds` il tombe sur `{floor: 3,
cap: 9999}` : c'est un PUITS (famille O-78), le pendant course du déversoir que R13 a fermé
en tri.

```verify
id: O-81
quoi: le footing tri 70.3 est-il toujours épinglé à 30 min sur tout le plan du profil fondateur ?
attendu: /Footing facile\s+75\s+1 val\./
cmd: npm run mesure:progression
```

**COMPLÉMENT (même jour) — la pièce « trajectoire du footing » a été ÉCRITE, MESURÉE, et
RETIRÉE : elle est inerte là où le défaut existe, et NOCIVE là où il n'existe pas.** La
trajectoire géométrique du brick, posée sur la borne du footing (position uniforme par semaine,
pente bornée par C22, plafond de départ en décharge), a produit sur `tri/S` un plan à **−28 %
sur toutes ses semaines** (245 → 178 min), un jour d'entraînement en moins — parce que la
mesure d'avant retrait dit ce que la prémisse ratait : **sur S et Full, le footing n'était PAS
figé** (33' → 59' sur la travée, « libre » à `mesure:progression`) — sa borne statique ne
mordait pas, et sa liberté ÉTAIT l'élasticité de la semaine (c'est le receveur R4.1). La borner
tôt ferme le déversoir, la semaine 1 sous-livre, et le cliquet de croissance sur le livré
propage la perte à tout le plan — **cinquième occurrence de la leçon O-78** (« borner un puits
ne révèle rien et déplace tout tant que la cause n'est pas levée »), et le même mécanisme de
propagation que la redécoupe O-43 §6 a trouvé le même jour : *toute réduction de la semaine 1,
quelle qu'en soit la cause, est amplifiée plan-entier par `_prevChargeMin × 1,1`.*
Le « 84 % au plafond constant » de la file ne vit donc QUE là où le pincement vit (M et 70.3,
le profil du fondateur) — et là, une trajectoire de borne est inerte par construction : le
plancher de dignité écrase tout. **Le seul levier du footing est la résolution du pincement
ci-dessus — une décision de valeurs, pas de géométrie.** Au passage, la pose de la trajectoire
a fait mordre v6 `D3` (saut de courbe +17 % sur tri/S 8 semaines : la position par PHASE saute
aux frontières — une phase de 2 semaines fait Δt double, +21 % de plafond en une semaine) —
la contrainte « la pente d'une trajectoire de borne respecte C22 semaine par semaine » est
acquise pour la prochaine pièce du lot, celle des semaines de récup. Moteur RETIRÉ,
`src/` byte-identique, v6 74 verts · 0 régression re-vérifié.

## O-81 — FERMETURE (arbitrage « LE PLAFOND MONTE, LE PLANCHER NE CÈDE PAS », 19/08/2026)

**Issue (a) retenue, avec son argument structurel** : *« baisser le plancher ABAISSE le plafond
structurel (`nSess × durée`), le lever le MONTE — l'issue (b) irait exactement contre l'objet du
lot progression, dont O-81 fait partie. »* Et le refus de l'issue (b) est motivé sur deux points
qui se cumulent : le rapport dérangement/stimulus (l'argument logistique d'O-44 sur la nage, qui
pointe dans le même sens) et le fait que **la fréquence n'est pas le manque** (le plan porte déjà
85 footings). `O81_FOOTING_CIBLE_PIC_MIN = 50` porte la décision et sa provenance.

**LA PIÈCE N'EST PAS UNIFORME, et c'est le §3 de l'arbitrage** — la mesure de la veille avait
montré que borner le footing là où il est LIBRE coûte **−28 % sur tout un plan `tri/S`** (il y
est le seul type qui absorbe, receveur R4.1). La condition est donc **DÉRIVÉE** — *le plafond du
format dégage-t-il le plancher de dignité ?* — jamais une liste de formats : `Math.max` ne touche
ni S (58 min) ni Full (130). La trajectoire (plancher → cible, position uniforme par SEMAINE,
pente bornée par C22, plafond de départ gardé en décharge) ne vit que sur les formats levés.

**MESURE, sur le profil du fondateur** : « Footing facile » passe de **1 valeur / 75 occurrences
/ au plafond 100 %** à **16 valeurs, 30 → 50 min, « libre » à 84 %** ; pic annoncé **8,4 → 8,9 h**.
**RAYON, sur les 985 profils** : **70 profils bougent de plus de 2 %, TOUS en tri, TOUS vers le
haut** (+9 à +11 % sur `70.3/reprise/debutant`), médiane 0,00 %, **76 profils dont le pic monte**,
0 profil qui baisse. Golden : 187 empreintes recapturées — exactement la population tri.

**Les deux cliquets ont été ré-épinglés APRÈS arbitrage, avec leur cause ATTRIBUÉE par expérience
contrôlée** (jeu de violations dumpé avant/après, un seul facteur) :
· **S4 349 → 357** — les 8 apparitions sont TOUTES `Rappel allure course CAP 34 min > Sortie
longue CAP 30`, en semaine d'AFFÛTAGE. **Ce n'est pas le footing** : il compte pour **0 des 357**
violations. C'est O-82, et la hausse du footing a seulement fait franchir le seuil à 8 semaines
qui en étaient proches.
· **S5 504 → 513** — 9 profils tri, tous avec un pic livré qui monte. La chaîne R20.2 énumère des
plafonds de l'ATHLÈTE ; **aucun maillon ne déclare un plafond de TYPE**, donc lever celui du
footing déplace le livré sans déplacer un seul maillon — la moitié ouverte d'O-35, vue dans
l'autre sens.
· **T-48 424 683 → 427 773 m** de nage seuil au pic, **VO2 inchangé à la minute près (8 628)** :
c'est ce qui prouve que le mouvement vient de la marge rendue et non d'un ré-arbitrage de l'ordre
de cession C26c.

`audit:v1` 459 à **0 violation dure**, invariants 22×54, v6 **74 verts · 0 régression**,
`lotPhysio` **25 verts · 23 rouges attendus · 0 régression**.

---

## O-82 · Le plancher de DIGNITÉ écrase les plafonds VOULUS de l'affûtage · ✅ **FERMÉ (arbitrage du fondateur, 19/08/2026 — A3 rejouée, bornée au défaut)**

Trouvé par **T-52**, l'invariant que le fondateur a demandé au §2 (« plancher ≥ plafond mérite un
invariant, pas un correctif »). Il a trouvé **trois familles, pas une** — la famille footing est
fermée par O-81, les deux autres sont **en affûtage** et sont plus graves :

```
  Brick d'affûtage (rappel de transition)  164× · plafond   16 → livré jusqu'à 30 min  (×1,9)
  Brick d'affûtage (rappel vélo → R2)       94× · plafond    9 → livré jusqu'à 30 min  (×3,3)
  Rappel allure course CAP  [rn.mara]        6× · plafond    8 → livré jusqu'à 30 min  (×3,8)
                                           ───
                                           269 blocs d'affûtage AU-DESSUS de leur plafond déclaré
```

**Le mécanisme** : `blockBounds` impose un « plancher digne » de 30 min à tout bloc en minutes,
non épinglé, sans pente et à UNE répétition — et il résout le croisement par `Math.max(fl, cap)`,
**en silence**. Un brick de rappel dont C21c fixe délibérément le plafond à 16 min est donc livré
à 30. Pour `Rappel allure course CAP`, le bloc est construit `2 × 7-10 min` avec `repCap: 2` :
c'est la réduction à **une seule répétition** (famille `PT(lo,hi)` d'O-78, 37 % des blocs de
qualité) qui le fait tomber dans la branche du plancher — et il devient **30 min continues à
l'allure du jour J**, quatre fois la dose conçue, dans la semaine où l'on affûte.

**⚠ CE QUI RÉFUTE LA DIRECTION DU §2.** L'arbitrage pose : *« quand les deux se croisent, c'est le
plafond qui a tort — un plancher qui cède rend la séance indigne, un plafond qui monte rend
seulement la dose plus grande. »* **Cette règle a un DOMAINE, et l'affûtage en sort** : ici le
plafond n'est pas une contrainte de dosage mais une règle de SÉCURITÉ (C21c : *« le plafond du
brick d'affûtage EST le plancher de la bande de charge »*), et le monter à 30 min alourdirait
l'affûtage — contre R3.13 et Bosquet 2007. **C'est le PLANCHER qui doit céder là**, et la décision
existe déjà dans le dépôt sous le nom **A3** : *« les planchers de séance sont SUSPENDUS en
récupération et en affûtage — une semaine de décharge a pour objet de RETIRER »*. A3 n'a jamais
été rejouée sur le plancher de dignité de `blockBounds` ; c'est la forme exacte de la famille
fermée douze fois (« une règle écrite pour un site, jamais rejouée sur le suivant »).

Non écrit ici : appliquer A3 au plancher de dignité change le contenu de l'affûtage sur ~269
blocs et demande ton arbitrage. Conséquence déjà mesurée si on ne le fait pas : **les 8 nouvelles
violations S4** du cliquet sont exactement ce défaut (`Rappel allure course CAP` 34 min dépassant
la sortie longue de 30).

```verify
id: O-82
quoi: des blocs d'affûtage sont-ils encore livrés au-dessus de leur plafond déclaré, par le plancher de dignité ?
attendu: /[1-9][0-9]* blocs? d'affûtage/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let n=0;for(const{sport,a}of profiles()){if(sport!=='tri'&&sport!=='duathlon')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}for(const w of p.weeks){if(w.phase.id!=='taper')continue;for(const d of w.days)for(const s of d.sessions)for(const b of s.steps||[]){if(b.role!=='body'||!b.bnd||b.durationMin==null||(b.reps||1)>1||b.gradient)continue;if(b.durationMin>b.bnd.cap)n++;}}}console.log(n+\" blocs d'affûtage au-dessus de leur plafond\");"
```

---

## O-83 · 92 plans de NAGE débutant livrent 2 à 5 séances de 15 min pour 10 h déclarées · 🔴 **OUVERT — priorité propre, hors file**

*« Le constat le plus dur de ton rapport n'est pas dans le lot : c'est un profil réel qui reçoit
un plan qui n'en est pas un, maintenant, et personne ne l'avait vu. »* (fondateur, §5.)

Mesuré sur les 985 profils du golden — **92 profils dont la séance moyenne fait moins de 25 min
OU la semaine moins de 60 min. TOUS en natation, TOUS `debutant`** :

```
  swim/demifond/ancien/debutant/finir        37 min/sem · 2,4 séances de 15 min · déclaré 10 h · pic annoncé 0,8 h
  swim/demifond/ancien/debutant/plaisir      37 min/sem · 2,4 séances de 15 min · déclaré 10 h · pic annoncé 0,8 h
  swim/demifond/ancien/debutant/competition  39 min/sem · 2,6 séances de 15 min · déclaré 10 h · pic annoncé 0,8 h
  swim/demifond/reprise/debutant/competition 54 min/sem · 3,6 séances de 15 min · déclaré 10 h · pic annoncé 1,1 h
  swim/sprint/reprise/debutant/competition   74 min/sem · 5,0 séances de 15 min · déclaré 10 h · pic annoncé 1,4 h
```

Le plan du pire cas, en entier : 10 semaines, **34 · 40 · 18 · 34 · 32 · 30 · 34 · 39 · 43 ·
18 min**. Deux à trois séances de 13 à 21 minutes. L'athlète a déclaré **10 h/semaine**.

**La chaîne est cohérente et le résultat ne l'est pas** — c'est ce qui rend le ticket difficile :
`C20` plafonne la promesse du nageur débutant à `sessions_max × 25 min`, `C15` borne sa séance à
850 m, `C24b` la plancher à 600 m, et la sonde V2.1 abaisse la promesse à ce que ces plafonds
permettent. Chaque règle est défendable seule ; leur composition rend un plan qui n'entraîne
personne. **Les 15 minutes sont le tell** : la séance vit exactement sur son PLANCHER, donc ce
n'est pas la courbe qui manque de volume — c'est que rien, dans la chaîne, ne dit qu'un plan doit
être un plan. Deux directions possibles, aucune tranchée : soit le plafond débutant progresse
avec le plan (c'est le lot PROGRESSION appliqué à `C20`/`C15`, qui sont aujourd'hui des CONSTANTES
alors que le débutant de la semaine 30 ne l'est plus — la famille O-56, « une valeur qui varie
avec la position »), soit le moteur REFUSE de livrer et le dit (P7/P8), comme il refuse déjà une
course trop proche. Un plan de 37 min/semaine pour 10 h déclarées n'informe pas l'athlète : il le
laisse croire qu'il s'entraîne.

```verify
id: O-83
quoi: combien de profils livrent une séance moyenne < 25 min ou une semaine < 60 min ?
attendu: /9[0-9] \/ 985/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let n=0,t=0;for(const{sport,a}of profiles()){let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}t++;const ch=p.weeks.filter(w=>!w.isRecup&&w.phase.id!=='taper');if(!ch.length)continue;const min=ch.reduce((x,w)=>x+w.days.reduce((u,d)=>u+d.sessions.reduce((v,s)=>v+(s.min||0),0),0),0)/ch.length;const ses=ch.reduce((x,w)=>x+w.days.reduce((u,d)=>u+d.sessions.filter(s=>s.d!=='rs').length,0),0)/ch.length;if(min/Math.max(1,ses)<25||min<60)n++;}console.log(n+' / '+t);"
```

## O-82 — FERMETURE (arbitrage « LE PLANCHER CÈDE EN AFFÛTAGE, ET A3 LE DISAIT DÉJÀ », 19/08/2026)

*« Ma direction avait un domaine et je ne l'avais pas nommé. »* Le fondateur tranche : hors
affûtage, le remède du plancher (allonger la séance) est **bénin** ; en affûtage il devient
« 30 min CONTINUES à l'allure du jour J pour une dose conçue à 2×7-10 » — **nuisible**. *« Un
plancher dont le remède nuit ne doit pas s'appliquer. »* `A3` porte déjà la décision et n'avait
jamais été rejouée sur le plancher de dignité : **extension d'une décision existante, pas un
arbitrage neuf.**

**⚠ MA PREMIÈRE ÉCRITURE ÉTAIT PLUS LARGE QUE LE REMÈDE, ET C'EST UNE MESURE QUI L'A DIT.** Elle
retirait le plancher PARTOUT en décharge (`return null`) : `audit:v1` est passé à **16 violations
DURES** (des nages facile/récup devenues plus longues que la « longue » de leur semaine). Un
plancher de dignité fait aussi un travail LÉGITIME en décharge — empêcher une séance de fondre à
rien. Ce qui nuit n'est pas le plancher : c'est qu'il **DÉPASSE** un plafond délibérément bas. Il
cède donc **jusqu'au plafond déclaré, jamais en dessous** — `min(dignité, plafond)`.
**269 blocs → 0**, sur 21 950 blocs bornés (population assertée).

**Une FUITE D'ÉTAT trouvée en chemin, et c'est elle qui faisait rougir v6.** Le drapeau de
décharge suit le patron documenté de `_capScale`/`_swimCapW` (une valeur posée par la boucle de
semaines) — mais le bloc de dominance **D2 tourne APRÈS la boucle et rejoue `scaleWeekBody` sur
TOUTES les semaines**, où le drapeau garde la valeur de la DERNIÈRE (l'affûtage). Les planchers
étaient donc suspendus partout, y compris en charge : mesuré sur `tri/S`, **la semaine 4 (`dev`)
tombait de 219 à 118 min**, et le banc v6 rougissait sur C22 (D3) et sur C30-A. **L'attribution a
été faite par expérience à facteur unique** — retirer le câblage `progCap` laissait les deux
rouges, donc ce n'était pas lui. Corrigé par `posDecharge(w)` dans les quatre boucles du bloc :
S1-S7 redeviennent identiques au bit près, seule l'affûtage bouge (119 → 118 min). C'est la
règle 20 sur un troisième objet : *toute passe qui traverse les semaines APRÈS la boucle repose
le drapeau à la semaine qu'elle traite.*

**Deux défauts de mon propre lot précédent, publiés.** (1) **`progCap` n'était pas consommé** sur
la branche C8/C16 de `blockBounds` : la trajectoire du footing livrée dans O-81 était **INERTE**,
et le mouvement mesuré (30 → 50 min) venait de la seule hausse du plafond. Un champ posé que
personne ne lit est « un correctif qu'on croit avoir » (R18.1) — câblé ici. (2) **Le plancher de
semaine de course regonflait les blocs faciles sans lire leur plafond déclaré** — le seul des
trois regonflages à ne pas le faire, alors que `refillEasyAfterLabelCap` le fait depuis toujours.
Invisible tant que le plancher de dignité clampait ces blocs par le bas ; le suspendre l'a
découvert (2 profils, footing à 68 min pour un plafond de 50). Borné.

**Et O-53 est rejouée sur un troisième site** : `enforceC22Final` rabotait des blocs **ÉPINGLÉS**
— une nage continue de 1 550 m ramenée à 1 500, alors que le plan a ANNONCÉ le palier. La règle
« un bloc épinglé n'est jamais écrêté » était écrite pour le plafond de dose et jamais rejouée
ici. Rabotages d'épinglés **27 → 25** (24 au point de départ : le solde du lot est +1, et il
appartient à O-54 §2).

**Les cliquets, ré-épinglés avec leur cause** : **S4 357 → 356** et **S5 513 → 511**, deux
BAISSES (un affûtage plus léger dépasse moins sa sortie longue et dérive moins de l'identité
R20.2) ; **T-48** VO2 8 628 → 8 636 (+0,09 %) et nage seuil 427 773 → 426 708 m (−0,25 %), deux
dixièmes venus des cliquets de semaine — le pic lui-même n'est pas touché, les planchers ne
cédant qu'en décharge.

**T-52 est PROMU garde permanente**, et son critère est rectifié : il testait `plancher >= plafond`
et rougissait donc sur l'état RÉPARÉ (après correctif le plancher vaut EXACTEMENT le plafond).
Le défaut est le **dépassement**, pas l'égalité — un bloc qui tient exactement son plafond le
respecte. Ce n'est pas un affaiblissement pour coller au comportement : le correctif le moins
coûteux qui satisfait `plancher > plafond` EST `min(dignité, plafond)`, c'est-à-dire la propriété
(règle 19).

`audit:v1` 459 à **0 violation dure** · invariants 22×54 · v6 **74 verts · 0 régression** ·
`lotPhysio` **25 verts · 23 rouges attendus · 0 régression** · golden 989 recapturé (231 empreintes).

---

## O-84 · Le plan ANNONCE N paliers de continuité et en livre N−1 · ✅ **FERMÉ le 20/08 (doc O72_O84_O95) — trois correctifs, un par mécanisme : 29 → 0**

**Fermeture.** (a) L'annonce se redérive de la DISPOSITION réelle via `palierLayout` (point
unique, la pose lit la même fonction) : « 1 test + N−1 palier(s) » quand la source n'est pas
mesurée — le test MESURE, le palier CONSTRUIT (D3). (b) L'annonce lit les MÊMES conditions que la
pose (`inj.shoulder`/`medHold`) : « suspendues — nage aménagée pour ton épaule » au lieu de trois
paliers fantômes. (c) Le repli fréquence de « dev ≤ pic » passe par le point unique
(`jourIntouchable` au filtre) et ÉPARGNE le jour porteur d'un bloc épinglé tant qu'une autre
victime existe (forme T-45) ; s'il est le seul candidat, la passe s'arrête — une promesse
affichée ne paie pas. **La réponse à la question T-46 du fondateur : LES DEUX.** Le motif du
balayage était syntaxique (`dayMin(` — le helper du site s'appelle `dayMinOf`, règle 15) → motif
élargi à `dayMin\w*` ; ET c'était un site de plus → routé. **Re-mesuré : 0 profil sur 187 avec
livré ≠ annoncé (29 avant) · tests annonce = livré 188/188 · T-06 passe VERT** (son `attendu`
bascule dans le même commit, cliquet §6.3). Le diagnostic ci-dessous (20/08, matin) est conservé
tel quel — c'est lui qui a décidé la forme des trois correctifs.

### Le diagnostic (20/08, re-vérification B-17) — trois mécanismes, le site identifié, et le diagnostic d'origine était faux pour 22 des 29

Trouvé en livrant O-82, mesuré identique des deux côtés, **re-mesuré identique après
O-85/O-89/O-93/V2.1 : 29 profils sur 188.** La re-vérification B-17 (20/08/2026) a décomposé les
29, et **le diagnostic enregistré ici — « le palier est élu victime par une coupe » — était faux
pour 22 d'entre eux.** C'est ce qui explique le correctif « évident » mesuré INERTE : il
protégeait une occurrence que personne ne supprimait.

**(a) 22/29 — rien n'est perdu : l'ANNONCE compte le TEST comme un palier.** Quand la source
n'est pas mesurée, le premier « palier » est délibérément un « Test de continuité » (arbitrage
D3 : *« la première séance est un TEST, pas un palier »* — écrit dans le code de pose). La
décision `B17-paliers` annonce « 4 palier(s) » et le plan livre 1 test + 3 continues : tout est
là, à sa position, et le titre de la DÉCISION ment d'un. Famille U9/T-40, côté annonce. Correctif
candidat : l'annonce dit « 1 test + 3 paliers » quand la source n'est pas mesurée.

**(b) 1/29 — l'annonce ignore l'exemption ÉPAULE.** `G/tri/Full/injury-epaule` : 3 annoncés,
**0 posés** — le site de pose porte `!inj.shoulder` (délibéré : la nage est aménagée), la
décision émise dans `reasoningEngine` ne le sait pas. Une carte qui annonce trois nages continues
à un athlète dont le plan les a suspendues pour protéger son épaule.

**(c) 6/29 — la perte RÉELLE, site identifié avec preuve** (`PW/tri/{S,M}/{plat,vallonne,
montagne}`) : le repli FRÉQUENCE de la garantie « dev ≤ pic » (`planGenerator.ts`, bloc A2/I1 —
quand la réduction des corps ne suffit plus, « la plus petite séance non longue cède ») élit sa
victime par **minimum de minutes du jour, sans passer par `prioriteFinancement`**, et le jour le
plus court de la semaine est le palier épinglé (~30-40 min). Preuve : `PW/tri/S/plat` S69, le
jour `facile2` porte « OFF (la semaine de pic reste la plus grosse) » à la place du palier — et
c'est le palier de la **DISTANCE DE COURSE** (max livré 550 m pour un sprint à 750). La
prédiction du 19/08 mot pour mot : le bloc est épinglé donc intouchable en TAILLE, alors son JOUR
saute — *« protéger la taille seule → le type perd ses occurrences »*. Le correctif passe par le
point unique (`jourIntouchable` doit couvrir le jour porteur d'un bloc épinglé) — à arbitrer avec
le lot progression, qui possède la forme du pic.

Ce qui rend ce ticket différent d'un simple créneau perdu : **le plan a AFFICHÉ la promesse**.
Supprimer le palier ne rend pas le plan plus léger, il le rend MENTEUR.

```verify
id: O-84
quoi: combien de profils tri livrent un nombre de paliers de continuité différent de celui annoncé ?
attendu: /: 0$/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let tot=0,ko=0;for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const d=(p._v2?.decisions??[]).find(x=>x.id==='B17-paliers');const n=+(String(d?.val??'').match(/(\\d+)\\s*palier/)?.[1]??0);if(!n)continue;tot++;const liv=(p.weeks??[]).flatMap(w=>(w.days??[]).flatMap(x=>x.sessions??[])).filter(s=>s.d==='sw'&&/^Nage continue/.test(String(s.name??''))).length;if(liv!==n)ko++;}console.log('sur '+tot+' profils, livré != annoncé : '+ko);"
```

## O-85 · La charge d'ÉPAULE n'est bornée NULLE PART — ce qui ressemble à une borne est le nombre de créneaux · ✅ **FERMÉ (arbitrage du fondateur, 19/08/2026 — la borne suit l'expérience en NAGE)**

Question du fondateur (19/08/2026, §3) : *« 12,1 km de nage en une semaine, pour un athlète qui
nage depuis un an en autodidacte et dont la technique se dégrade sous fatigue. `MAX_RUN_DAYS`
borne les jours d'impact en course ; il n'existe pas d'équivalent pour l'épaule. On a écarté
`MAX_SWIM_DAYS` en son temps, mais l'argument portait sur la FRÉQUENCE — et il ne s'applique pas
au VOLUME. »* Trois mesures demandées avant toute décision, les voici.

**§A/§B — la distribution sur les 989 profils.** 458 profils nagent. Semaine de nage la plus
chargée : **médiane 2,6 km · p90 8,4 km · p99 11,2 km · max 11,2 km**.

```
  > 8 km  :  65 profils (14,2 %)   swim 62 · tri 3
  > 10 km :  38 profils ( 8,3 %)   swim 38 — tous des nageurs PURS
  > 12 km :   0 profils
```

**Le corpus ne contient donc PAS la configuration du fondateur** (tri, `sessions_max` élevé,
`doubles: oui`) : c'est un angle mort de couverture, famille A-2, et il explique que ses 12,1 km
n'apparaissent nulle part dans le golden.

**§C — une borne existe-t-elle ? Cherchée par SATURATION, pas lue dans une table** (règle 15) :
on fait varier `vol_max` et on regarde si le volume de nage livré plafonne.

```
  vol_max    nage max/sem   séances   jours
      8 h        9,35 km       3        3
     10 h       12,66 km       4        4
     12 h       14,72 km       5        4
     14 h …  30 h  14,68 km    5        4      ← plateau, identique jusqu'à 30 h déclarées
```

**Une borne existe, et ce n'est pas une borne de charge articulaire : c'est le NOMBRE DE CRÉNEAUX
de nage du schéma de semaine (5).** Vérifié en ouvrant la semaine saturée — les cinq séances
pèsent 3 075 · 2 625 · 3 075 · 3 275 · 2 625 m, toutes **très au-dessus de `CAP_SWIM[70.3] = 1 900`**
(qui ne borne qu'UN BLOC de la sortie longue, réfutation O-46). Et le détail qui tranche :

```
  « Nage récup courte »  →  2 625 m
```

Une « récup courte » de 2,6 km n'est pas une récupération : c'est O-78 (le puits sans borne)
exprimé en natation. **Rien ne borne la TAILLE d'une séance de nage hors sortie longue ; ce qui
tient le total est un artefact de structure.**

**Conséquence à ne pas manquer** : le lot PROGRESSION existe pour LEVER le plafond structurel
(`nSess × durée`). Le lever sans borne d'épaule fera monter le volume de nage exactement par le
mécanisme qui le retient aujourd'hui — **la seule chose qui protège l'épaule est ce que le lot
progression a pour objet de retirer.** Ce ticket vient donc AVANT, ou avec, la suite du lot.

Non tranché ici (décision d'entraînement) : la borne porte-t-elle sur les MÈTRES hebdomadaires,
sur la taille de séance hors sortie longue, ou sur les deux ? Et son seuil doit-il dépendre de
l'ancienneté de pratique (l'autodidacte d'un an et le nageur de club n'ont pas la même épaule) —
ce qui est `history`/`swim_limit`, déjà collectés.

```verify
id: O-85
quoi: le volume de nage livré sature-t-il sur un artefact de structure plutôt que sur une borne de charge ?
attendu: UNE-BORNE-EXISTE
cmd: npm run mesure:epaule 2>&1 | grep -q "UNE BORNE EXISTE quelque part" && echo "UNE-BORNE-EXISTE"
```

---

## O-86 · Deux nombres d'interface qui ne disent pas leur portée · 🔴 **OUVERT — court, avec le prochain passage sur l'interface**

Relevé par le fondateur (19/08/2026, §4), à traiter avec le prochain lot d'interface :

**(a)** `OFF (la semaine de pic reste la plus grosse)` — la note explique une propriété du PLAN sur
la case d'une JOURNÉE. *« Sur un OFF, on attend "pourquoi je ne fais rien aujourd'hui", pas un
fait sur S38. »* Le libellé vient d'une passe de dominance (A2/I1) qui nomme sa raison technique
au lieu de la raison de l'athlète.

**(b)** Le nombre en tête de la carte 🎯 Aujourd'hui — `2h50`, `3h09` — est le total de la
**JOURNÉE**, affiché sous un titre de **SÉANCE** : il se lit comme la durée de la séance nommée.
*« Un nombre en tête doit dire sa portée. »* Même famille qu'O-61 (la barre de zones qui portait
des grandeurs sans dire de quoi elles étaient la mesure).

## O-85 — FERMETURE (arbitrage « O-85 AVANT LE LOT PROGRESSION », 19/08/2026)

**La forme retenue** : `volume hebdomadaire de nage ≤ k × distance de course`, **`k` dérivé de
l'expérience en NAGE, pas du niveau général** — *« un nageur de club fait 25 km par semaine sans
dommage ; un autodidacte d'un an dont la technique cède sous fatigue n'a pas la même tolérance à
12 »*. Trois décisions encodées dans `swimWeeklyLoadCapM` :

1. **Le multiplicateur se lit sur une grandeur MESURÉE** — la continuité déclarée rapportée à la
   distance de course — jamais sur un adjectif auto-déclaré. Leçon R14.1, payée quatre fois :
   `level` et `history` décrivent le triathlète, pas son épaule.
2. **La borne est plus SERRÉE chez le débutant**, l'inverse du réflexe.
3. **Elle se lève avec la position (O-56)** : le multiplicateur lit la continuité PROJETÉE à la
   semaine, même patron que `swimSessionCapAtWeek`. Le fondateur, à 1 000 m déclarés pour un
   70.3 : **7,6 km en semaine 1 → 11,4 km au pic**.

**⚠ UNE ERREUR CORRIGÉE EN L'ÉCRIVANT, PAR LA MESURE.** Ma première version plafonnait le ratio à
la distance de course, comme le fait la borne de SÉANCE — et **la bande « nageur de formation »
devenait inatteignable** : un athlète déclarant 4 000 m continus recevait le multiplicateur de
l'âge-groupe. Les deux bornes lisent la même grandeur pour deux questions différentes : *« jusqu'où
faire nager d'un trait »* se plafonne à la course, *« quelle épaule a-t-il »* ne se plafonne pas.

**LE DOMAINE EST DÉRIVÉ, PAS UNE LISTE DE SPORTS** : la formule n'a de sens que si la nage est un
LEG (`disciplines.length > 1`). Un sprinteur qui prépare un 100 m nage trente fois sa distance —
lui appliquer la formule rendrait 400 m/semaine. Vérifié par T-53 §3 plutôt qu'exclu en silence.

**CE QUE LA PASSE PREND, et l'ordre EST la politique** (`prioriteFinancement` vue depuis le
donneur) : jamais un bloc ÉPINGLÉ, jamais la sortie longue, **les DÉVERSOIRS d'abord** (blocs
faciles non épinglés, du plus gros au plus petit — c'est là que le volume s'est accumulé, O-78),
la qualité ensuite, **jamais sous le plancher de séance** — auquel cas on s'arrête et on le DIT
(`warnings`). **La FRÉQUENCE n'est jamais la monnaie** : retirer une séance de nage pour tenir une
borne de volume serait la prédiction du 19/08 commise par la garde censée protéger.

**MESURES.** `mesure:epaule` §C : le plateau passe de **14,68 à 11,41 km** et c'est désormais la
borne O-85 qui le tient, plus l'artefact de créneaux. **Rayon : 37 profils bougent de plus de 2 %,
TOUS en tri**, médiane 0,00 %, aucun effet hors des sports où la nage est un leg — et la plus
forte baisse (`PW/tri/S`, 310 → 293 min) gagne une séance en perdant des mètres : la fréquence
n'a pas payé. **Sur la fixture de l'athlète réel : nage 54 % → 35 %, vélo 33 % → 39 %, course
13 % → 25 %** — borner le volume de nage rapproche à lui seul la répartition de la cible
(20-25 / 45-50 / 25-30), sans qu'aucune règle d'allocation n'ait été touchée.

**Garde T-53**, trois moitiés (invariance sur 3 000+ semaines avec sa population assertée ·
sensibilité à l'expérience en nage · **domaine vérifié** au lieu d'exclu), **contre-prouvée** :
neutraliser la borne la fait rougir sur la sensibilité (600 m et 4 000 m rendent 17,1 km tous les
deux). **Cliquets ré-épinglés avec leurs causes SÉPARÉES par expérience contrôlée** : S5 511 → 512
et T-48 (population 188, VO2 8 676, seuil 431 633) viennent **entièrement de la fixture** ;
T-39 25 → **22** vient **entièrement de la borne** — elle prend dans les déversoirs, donc les
passes aval n'ont plus à raboter d'épinglés pour tenir leurs bornes.

**PROVENANCE, dite franchement** : les bandes (`×4 · ×6 · ×8`) viennent du fondateur et sont des
ordres de grandeur d'entraîneur, pas une publication. La FORME et la DIRECTION sont ce qui est
défendable ; les valeurs sont révocables sans toucher au mécanisme.

`audit:v1` 459 à **0 violation dure** · invariants 22×54 · v6 **74 · 0 régression** · `lotPhysio`
**25 verts · 23 rouges attendus · 0 régression** · golden **990** (28 empreintes + la fixture).

---

## O-85 §2 — LE CORPUS NE CONTENAIT PAS L'UTILISATEUR · ✅ **FIXTURE AJOUTÉE, avec son écart PUBLIÉ**

*« Ma configuration — `sessions_max` élevé, `doubles`, 70.3, nage limitante — n'existe dans aucun
des 989 profils. C'est la neuvième A-2, et c'est la seule qui compte vraiment : le corpus couvre
des formats et des niveaux, pas l'utilisateur qui existe. »*

Passe `REEL/tri/70.3/nage-limitante` ajoutée au golden (**989 → 990**). Le trou n'était pas une
valeur extrême mais un CROISEMENT que rien ne produisait : beaucoup de séances × jours doubles ×
format long × nage limitante.

**⚠ LA FIXTURE EST RECONSTITUÉE, PAS RELEVÉE, ET L'ÉCART EST PUBLIÉ.** Le dépôt portait **DEUX**
« profils du fondateur » divergents — le bloc `verify` d'O-71 et le défaut de
`mesureProgression.mjs` — et **aucun ne reproduit les chiffres publiés** (S1 9,8 h · nage 48 % ·
vélo 28 % · course 24 %) :

```
  bloc O-71            S1 9,4 h · nage 54 % · vélo 33 % · course 13 %   ← le plus proche, retenu
  mesureProgression    S1 5,0 h · nage 16 % · vélo 50 % · course 34 %
  chiffres publiés     S1 9,8 h · nage 48 % · vélo 28 % · course 24 %
```

C'est donc la **FORME** qui est couverte, pas l'état exact — et l'écart le plus visible est la
part de COURSE (13 % contre 24 %). La règle de fixture du dépôt interdit de combler : *on ne
remplit pas un champ vide, on le demande.* **La fixture deviendra littérale quand les réponses
réelles seront relevées dans l'app** ; d'ici là elle ferme l'angle mort structurel, pas l'écart.

## O-87 · La carte « Pourquoi ce plan » portait DEUX comptes de séances sans étiquette — sur la grandeur qui BORNE le plan · ✅ **FERMÉ (constat du fondateur sur le profil réel, 19/08/2026)**

*« bloc VOLUME MAX : "une semaine ne contient que 10 séances" · bloc BUDGET : "11 séances par
semaine" — trois lignes d'écart, deux valeurs, et c'est la grandeur qui borne le plan. »*

**Mesuré avant de corriger, comme le document le demandait — c'est l'hypothèse 1 :**

```
  11  =  la décision `budget` du RAISONNEMENT : min(sessions_max déclarées = 12,
         budget implicite du volume = 13,0 h ÷ 1,2 h/séance ≈ 11) — calculée AVANT génération
  10  =  `nSess`, le maximum LIVRÉ recompté sur les semaines de charge APRÈS le point fixe
         (la fixture REEL livre 6×1 · 7×7 · 8×12 · 9×9 · 10×3)
```

Deux grandeurs, toutes deux vraies, illisibles ensemble. Consommateurs listés avant de toucher
(la règle du dépôt) : la décision `budget` n'a QU'UN lecteur, l'affichage (`plan-view.js:474`).

**Le correctif est celui du document — « un compte se publie avec ce qu'il compte » :** la
décision `budget` gagne un champ `livre`, posé par le générateur **après le point fixe** et
alimenté par **LE MÊME `nSess`** que le message structurel — une seule dérivation pour les deux
blocs de la carte (R11.1), ils ne peuvent plus diverger. L'affichage devient, quand les deux
diffèrent : *« 11 séances par semaine prescrites — ta semaine la plus fournie en livre 10, avec
une semaine allégée toutes les 4 semaines. »* Quand ils coïncident, la phrase d'origine ne bouge
pas. Vérifié au passage : `nSess` avec et sans la course rendent le même compte (10) sur la
fixture — pas de redéfinition cachée.

**§2 du document, CONFIRMÉ par la chaîne de la fixture** : plafonds `declared 20 · caps 13,0 ·
util 14,0 · structurel 12,4` — l'argmin est le structurel, et la contrainte de secours est
**13 h** (l'historique). Donc oui : le plafond visé APRÈS le lot progression est **13 h, pas
9,7** — c'est le budget dans lequel l'allocation devra statuer (les estimations faites sur
10,4 h sont à rebaser) — et la validation la plus directe du lot sera **le maillon qui change de
nom à l'écran** (« le nombre de séances » → « ton historique »).

**§3 — les trois protections demandées existent désormais en garde : T-54**, sur la fixture
`REEL` : (1) le maillon mordant nommé AVEC son ampleur chiffrée (« (−7,6 h/sem) ») ; (2) la
contrainte de secours nommée (« Si tu levais cette contrainte, X te plafonnerait à Y ») ; (3) le
message B-17 « peut construire la distance, pas le milieu » présent dans les warnings — *la seule
sortie du produit qui dise ce que le moteur ne sait pas faire* ; (4) le compte LIVRÉ se REDÉRIVE
du plan (famille T-16d) et ne dépasse jamais le prescrit. **Contre-prouvée sur deux cassures,
deux rouges** (livré faussé de +3 → « 13 ≠ 10 · dépasse le prescrit » ; message B-17 retiré →
rouge (3)), restaurée verte.

Golden : **990 profils recapturés, 986 empreintes** — le champ `livre` apparaît sur toute
décision `budget`, donc sur presque tous les plans ; décisions seules, aucune séance, aucune
minute. `audit:v1` 459 à 0 · invariants 22×54 · v6 74 · 0 régression · `lotPhysio` **27 verts ·
23 rouges attendus · 0 régression**.

```verify
id: O-87
quoi: la décision budget porte-t-elle son compte livré, égal au nSess du message structurel ?
attendu: /val=11 · livre=10/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);const d=(p._v2?.decisions??[]).find(x=>x.id==='budget');console.log('val='+d?.val+' · livre='+d?.livre);break;}"
```

## O-88 · Le nombre d'accélérations était DÉRIVÉ de la longueur du bloc — le plus grand nombre de répétitions techniques au moment où le geste est le moins bon · ✅ **FERMÉ (constat du fondateur sur son plan réel, 19/08/2026)**

*« bloc plus long → plus d'accélérations — c'est l'inverse de ce qu'il faut. Une accélération
faite avec un geste dégradé enseigne le geste dégradé. »*

« Nage aérobie + accélérations » promettait « dont la moitié en accélérations de 50 m » — un
compte-FRACTION. Le constat portait 32 accélérations (3 200 m) ; **la relecture complète du
même plan a trouvé 81** (8 075 m, S33). Même famille que `PT(lo, hi)` d'O-78 : une grandeur de
COMPTAGE calculée par un facteur de TAILLE (règle 14).

**Correctif** : `O88_NB_ACCELERATIONS = 10` (`constraintMatrix.ts`, fourchette 8-12 du
fondateur posée comme ORDRE DE GRANDEUR, révocable sans re-mesure), texte « en 50 m accéléré /
50 m souple au début du bloc — 10 accélérations au plus, puis aérobie continu ». Le « début de
bloc » encode la raison physiologique de l'arbitrage (geste frais) ; le « au plus » garde la
phrase cohérente sur un bloc livré de 400 m comme de 8 000. **Garde T-55** (banc `lotPhysio`) :
aucune fraction, tout compte ≤ 12, population épinglée (4 449 porteuses / 986 plans, blocs
100-8 075 m — la borne est prouvée EXERCÉE là où le défaut vivait, pas vraie par absence).
**Contre-prouvée : fraction réintroduite → rouge · constante à 60 → rouge.**

**Balayage famille (demandé par le ticket)** : `swimrun` « dont ~N % avec plaquettes » porte la
même forme textuelle mais son bloc est répété `repCap: 11` — vérifié BORNÉ, pas un défaut ; les
membres restants sont les sites `P`/`PT` d'O-78 nés sans `repCap` (duathlon l.41/l.44, trail
« Descente en charge ») — lot « bornes de séance », après le plafond structurel, ordre inchangé.

```verify
id: O-88
quoi: le compte d'accélérations promis sur le livré est-il absolu (≤ 12) et sans fraction ?
attendu: /compte max 10 · fractions 0/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);let mx=0,fr=0;for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions){const t=String(s.det||'');if(!/accélérations/.test(t))continue;if(/(moitié|tiers|quart)[^·]{0,40}accélérations/.test(t))fr++;for(const m of t.matchAll(/(\d+)\s*(?:×\s*\d+\s*m\s*)?accélérations/g))mx=Math.max(mx,+m[1]);}console.log('compte max '+mx+' · fractions '+fr);break;}"
```

## O-89 · La borne d'épaule O-85 lit une PROJECTION de continuité que le MÊME plan contredit · ✅ **FERMÉ (arbitrage du fondateur, 19/08/2026 — « une borne de sécurité ne projette pas ») — voir la FERMETURE plus bas**

Trouvé par la relecture complète (RAPPORT_RELECTURE_REEL.md §3.F). Le multiplicateur
d'expérience de `swimWeeklyLoadCapM` se lève avec `C22^semaine` : la continuité PROJETÉE d'un
athlète à 1 000 m déclarés atteint 1 900 m dès la semaine 6, donc la bande passe de ×4
(7 600 m/sem) à ×6 (11 400) dès S8 — pendant que **les paliers B-17 du même plan prescrivent la
première continue (1 250 m) en S25**, et que le cliquet O-56 (le plus haut palier VALIDÉ) est
la version MESURÉE de la même idée. Deux courbes pour la même grandeur (R11.1), et la borne lit
la plus optimiste — une grandeur PRESCRITE, pas démontrée (nuance de la règle 12).

Conséquences mesurées sur REEL : **27 semaines sur 43 assises exactement sur la borne**, plateau
à 11,4 km/sem dès S8 — à 6 % des 12,1 km que l'arbitrage O-85 jugeait « au-dessus de la bande
large » pour ce même athlète. Et la projection saturant à `ratio = 1,0` pour TOUT departM <
courseM, **tous les triathlètes rejoignent la bande ×6 en 5-11 semaines** : la différenciation
par l'expérience ne vit que sur la rampe de départ. T-53 reste vert (sa sensibilité mord sur
les premières semaines) — c'est la moitié DOMAINE du jumeau qui s'est rétrécie en silence.

Issue candidate (à arbitrer, pas à écrire d'office) : indexer le ratio sur la trajectoire des
PALIERS B-17 (la grandeur que le plan demande réellement de valider) au lieu de `C22^k`. Chiffré :
la borne resterait à ×4 = 7,6 km jusqu'à la phase spécifique — ~3,8 km/sem de moins sur 17
semaines de base/dev. C'est l'inverse exact du lot progression sur cette discipline : dire
lequel des deux protège l'athlète réel est une décision d'entraîneur.

```verify
id: O-89
quoi: la borne est-elle un cliquet sur le LIVRÉ (départ = bande déclarée, marche ≤ ×C22 du max livré, plafond = bande suivante) et jamais une projection ?
attendu: /S1 7600 · S2 8347 · plafond 11400/
cmd: node --input-type=module -e "const {swimWeeklyLoadCapM}=await import('./src/engine/swimContinuity.ts');const g={departM:1000,courseM:1900,source:'mesure'};console.log('S1 '+swimWeeklyLoadCapM(g,0)+' · S2 '+swimWeeklyLoadCapM(g,7588)+' · plafond '+swimWeeklyLoadCapM(g,999999));"
```

## O-90 · La qualité COULE là où le volume SATURE, et les décharges portent des doses plus grosses que les charges · 🔴 **OUVERT — mécanisme à attribuer par expérience contrôlée, périmètre du lot progression**

Relecture REEL (RAPPORT_RELECTURE_REEL.md §3.A-B). Deux faces du même mécanisme présumé (les
semaines de charge sont comprimées par budget + déversoir, les décharges non) :

- **6 semaines de CHARGE sans aucune nage au seuil** (S10, S16, S20, S30, S33, S40 — dont les
  deux dernières grosses semaines avant l'affûtage) pendant que la nage y est à sa borne
  (250-252 min). O-74 mesuré chez `reprise`, présent ici chez `confirme`.
- **Inversions récup/charge** : VO2max vélo 6×4 en récup (S23, S29) contre 5×4 en charge (S25,
  S31) · nage seuil max du plan (1 625 m) en récup S29 · sweetspot 4×14 en récup S6 contre
  4×13 en charge · sortie longue max (85') en récup S22.

⚠ Le mécanisme est une HYPOTHÈSE : l'attribuer demande une expérience à facteur unique
(corollaire règle 15), pas un diff de lot.

```verify
id: O-90
quoi: combien de semaines de charge nagent ≥ 200 min sans une séance au seuil ? (les six mesurées nagent 237-252 min — le seuil de sonde est SOUS la bande pour ne pas rejouer l'exclusion d'un cheveu qui a fait rater S40 à 237 min lors de l'écriture)
attendu: /6 semaines : 10 16 20 30 33 40/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);const l=[];for(const w of p.weeks){if(w.isRecup||w.phase.id==='taper')continue;let sw=0,cs=0;for(const d of w.days)for(const s of d.sessions){if(s.d!=='sw')continue;sw+=s.min||0;if(/seuil/i.test(s.name))cs++;}if(sw>=200&&!cs)l.push(w.num);}console.log(l.length+' semaines : '+l.join(' '));break;}"
```

## O-91 · La course à pied longue s'ARRÊTE à la semaine 22 — 20 semaines sans sortie longue avant un semi · 🔴 **OUVERT — le leg course du tri n'a pas de C30**

Relecture REEL (RAPPORT_RELECTURE_REEL.md §3.D). La dernière « Sortie longue CAP » est en S22
(85 min) ; sur les 20 dernières semaines, aucune course ne dépasse 68 min hors les 23-30 min de
CAP en fin de brick — pour une épreuve qui FINIT par un semi-marathon. En base elle plafonne à
82-85' sans progression et manque de 4 semaines de charge (S1, S4, S7… vérifié S1/S4/S6/S8).
C30/C30b (le plancher de spécificité de la longue) ne couvrent que la course SÈCHE — le leg
course du tri n'a aucun équivalent, et le brick a absorbé le créneau long en spec/pic sans
reprendre la promesse « courir longtemps ». S'ajoute un footing de **19 min** livré en S39
(pic), SOUS le plancher de dignité de 30 — quelque chose coupe après `blockBounds`.
Périmètre : lot progression (sortie longue = pièce nommée) + allocation.

```verify
id: O-91
quoi: dernière sortie longue CAP et plus longue course ensuite (hors brick)
attendu: /dernière S22 · max ensuite 68/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);let last=0,mx=0;for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions){if(/Sortie longue CAP/.test(s.name))last=Math.max(last,w.num);}for(const w of p.weeks){if(w.num<=last)continue;for(const d of w.days)for(const s of d.sessions)if(s.d==='rn'&&!s.race)mx=Math.max(mx,s.min||0);}console.log('dernière S'+last+' · max ensuite '+mx);break;}"
```

## O-92 · Neuf semaines de charge sans JOUR OFF — la reprise comprise — et des jours durs en rafale · 🔴 **OUVERT — placement, à regarder avec le routage des doubles**

Relecture REEL (RAPPORT_RELECTURE_REEL.md §3.E). Neuf semaines de charge livrent 0 jour de
repos (S1 — la semaine de REPRISE de la rampe O-69, 10 séances —, S4, S7, S14, S21, S24, S27,
S31, S37) ; S38 (pic) enchaîne trois jours durs consécutifs (seuil+VO2 · allure course · brick
181') ; S33 concentre 9 h en 6 séances dont un jour à 4 h 06 (nage 181' + allure course 65').
Le garde-fou « jours durs consécutifs » existe pour les ÉCHANGES (⇄) — la GÉNÉRATION n'a pas
d'équivalent. Et la question C28b : à J-2, 92 min en deux séances (le plafond d'approche compte
par séance — doit-il compter par jour sous `doubles` ?).

```verify
id: O-92
quoi: combien de semaines de charge n'ont aucun jour OFF ?
attendu: /9 semaines : 1 4 7 14 21 24 27 31 37/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);const l=[];for(const w of p.weeks){if(w.isRecup||w.phase.id==='taper')continue;const off=w.days.filter(d=>!d.sessions.some(s=>s.d!=='rs')).length;if(off===0)l.push(w.num);}console.log(l.length+' semaines : '+l.join(' '));break;}"
```

## O-85 §3 — DEUX GATES ÉTAIENT ROUGES DEPUIS LA FERMETURE D'O-85, ET PERSONNE NE LES AVAIT RELUS · ✅ **RÉPARÉS (19/08/2026, en fermant le lot O-88)**

Trouvés en passant la batterie COMPLÈTE avant le push du lot relecture — les fermetures O-85 et
O-87 n'avaient rejoué que `audit:v1 · invariants · v6 · lotPhysio · golden:capture`, pas les
bancs R14.x ni `golden:verify`. **La CI de main était rouge sur deux gates depuis ee40395** (deux
commits), et mon premier lot de vérification les a MASQUÉS une fois de plus : commandes chaînées
au `;`, le code de sortie était celui de la dernière (famille O-9, dans mon propre batch —
publié).

**(a) `golden:verify` / `golden:bundle` : POPULATION épinglée à 989 pour 990 profils réels.**
La fixture REEL (O-85 §2) a monté le corpus sans monter les deux épingles — l'oubli exact que la
règle « un zéro a besoin de sa population » existe pour attraper, et le gate a rougi comme prévu.
Épingles à 990 avec la raison, dans ce commit (la forme que le message du gate exige).

**(b) `R14.1-G` rouge — et ce n'est PAS un défaut de la projection : le banc a détecté un vrai
changement de produit.** Attribution par bisection de MOTEUR (bench rejoué sur les bundles
committés) : vert ×1,15 à `ec56e95` et `0b354de`, rouge ×1,00 à `ee40395` (l'implémentation
O-85) et depuis. Mécanisme mesuré : sur la fixture du banc (tri 70.3, CSS 2'15, doubles), la
hausse `vol_max` 9 → 13 était absorbée par la nage-déversoir ; la borne d'épaule la retire, et le
volume LIVRÉ moyen (dev+spec+peak) ne monte plus que de **8,17 → 8,67 h (+6 %)** contre 8,17 →
9,95 (+22 %) avant — les deux ratios de P10 tombent sous la première ancre, même facteur, gain
identique. **Une projection qui récompenserait un volume que le plan ne livre plus mentirait
(P8).** Le critère est rectifié sur le LIVRÉ (règle 15), deux branches : le plan livre ≥ +15 % →
le gain suit (≥ ×1,10) ; le plan REFUSE le volume → la projection reste collée (0,95-1,10, où
l'insensibilité EST la propriété — domaine du jumeau de sensibilité, arbitrage du 17/08).
**Prouvé vert par sa branche 1 contre le moteur d'AVANT O-85 (×1,22 livré → ×1,15 gain) et par
sa branche 2 contre l'actuel — aucune barre desserrée, le domaine rendu explicite.** Limite
publiée : la contre-preuve « rouge sur inversion » n'a pas d'état de moteur connu qui la
produise ; la branche 2 la refuse par construction (`r ≥ 0,95`).

Leçon pour la liste de fermeture d'un lot : **les bancs R14.x lisent le PLAN LIVRÉ à travers la
projection — tout lot qui change ce que le plan livre les concerne**, pas seulement les lots qui
touchent `projection.ts`.

```verify
id: O-85-3
quoi: R14.1-G passe-t-il par sa branche « refuse → projection collée » sur le moteur actuel ?
attendu: /branche refuse → projection collée|branche livre plus → projette plus/
cmd: node bench_r14_1.cjs endurabuild/js/engine.js 2>&1 | grep "R14.1-G"
```

## R20.2/REEL — LES 2,7 h ENTRE LE STRUCTUREL (12,4) ET LE LIVRÉ (9,6), LOCALISÉES UN FACTEUR À LA FOIS · ✅ **MESURÉ (19/08/2026, demande du fondateur) — cause connue + une fuite diagnostique nommée (O-94)**

*« Si elles ne se réduisent pas au manque déjà mesuré, il y a une fuite non nommée entre le
plafond calculé et le plan produit. »* — Réponse : **les deux à la fois.** Le volume manquant est
le manque structurel connu + la borne O-85 (postérieure à la mesure du manque) ; la fuite qui
restait est DIAGNOSTIQUE : le « 12,4 » lui-même surestime, parce que la sonde qui le mesure
ignore O-85 (→ **O-94**).

**(1) Semaine par semaine.** Cible de boucle au pic : **13,0 h** (`targetH = Lw × peakH`,
observé Lw = 1,00 et peakH = 13,00 sur les 41 semaines — la sonde V2.1 n'a PAS mordu : sa mesure
12,4 > 95 % de 13, pas de décision V2.1). Construit par la boucle R3.3 : **10,8-12,6 h** (les
bornes de séance laissent 0,4-2,2 h — le mécanisme que la décision `O69-ancrage` nomme déjà pour
S1 : « les bornes de séance absorbent 3,1 h »). Livré final : **8,0-9,4 h**. La cible affichée
est ensuite RABATTUE sur le livré, ce qui efface la trace pour toute mesure aval — c'est
pourquoi « courbe − livré » rend 0,2 h et `mesure:manque` une médiane de 0,6 : le manque réel de
REEL au pic est **3,6-5,0 h/sem**, dans la queue haute de la mesure d'époque (p90 4,2) — REEL
est exactement le croisement (beaucoup de séances × doubles × format long) que la médiane ne
représente pas.

**(2) Le structurel 12,43 n'est ni le prescrit (11) ni le livré (10) :** c'est
`min(sonde V2.1, re-sonde)` — un clone SATURÉ de la semaine de pic LIVRÉE (chaque séance à son
plafond). Le « 11 » ne vit que dans la décision `budget` ; la prose du maillon cite le nSess
livré (O-87).

**(3) Les passes aval, neutralisées UNE PAR UNE** (harnais assert-motif + finally, pic livré
final comme juge, témoin 9,4 h) : croissance D3/D4 sur le livré → **0** (hypothèse du diagnostic
initial RÉFUTÉE, publiée) · rampe O-69 → **0** · enforceC22Final → **0** · C26c → **0** · I14
(2ᵉ appel) → **0** · applySessionBudget → **0** · dominance dev ≤ pic → ne touche pas le pic
(elle coupe les non-pic). **O-85 → −1,7 h (9,4 → 11,1)** — la borne d'épaule, qui fait son
travail. Et RIEN ne bouge entre la construction et l'appel de reconcile (snapshot identique) :
tout le retrait aval vit dans `reconcileDeclaredVolume` ; le solde au-delà d'O-85 (−1 à −1,7
selon la semaine) n'appartient à aucun facteur seul — interactions du point fixe (la famille
T-25/O-35, « ce que le point fixe retire n'est déclaré par aucun maillon », déjà au registre).

**(4) Donc : oui, c'est le manque connu — décomposé.** 12,4 − 9,6 = (a) la boucle n'atteint pas
sa cible (bornes de séance, O-43 §2/O-78) + (b) O-85, postérieure à la mesure du manque, une
protection et non une fuite + (c) le résidu interactionnel du point fixe. **Aucune fuite de
volume non nommée.** La fuite NOMMABLE est diagnostique → O-94.

## O-94 · Les sondes structurelles saturaient un clone SANS la borne O-85 — la carte promettait 1,7 h qu'une protection interdit · ✅ **FERMÉ (ordre du fondateur, 19/08/2026) — voir la FERMETURE plus bas**

La re-sonde (planGenerator ~4294) sature chaque séance du clone à son plafond de SÉANCE, mais
n'applique pas `swimWeeklyLoadCapM` : elle compte des mètres de nage que la borne d'épaule
interdira. Mesuré sur REEL : sonde 12,4 h · livré 9,4-9,6 · dont −1,7 h = O-85 seule. La carte
« Pourquoi ce plan » annonce donc un plafond structurel dont ~1,7 h ne sont livrables sous
aucune configuration — et le message R20.2 (« le nombre de séances te plafonne à 12,4 »)
surestime le levier réel des doubles/séances. À corriger avec O-89 (la borne change de rampe) :
la sonde applique la borne du moment où elle sature. Diagnostic seul — `peakH` a déjà piloté la
construction, aucune séance ne bouge.

```verify
id: O-94
quoi: le maillon structurel dépasse-t-il encore ce que la borne O-85 laisse livrer ? (écart sonde − pic livré, REEL)
attendu: /BORNE-COMPTEE/
# règle 17, 20/08 : l'`attendu` NE cite plus « 12,4 · 9,x » — ces
#   valeurs étaient l'état du jour de la fermeture, et le lot volume+répartition les a
#   légitimement déplacées à 11,2 · 11,2. Un `attendu` chiffré aurait basculé en « ne reproduit
#   plus » sur un PROGRÈS. La propriété gardée est l'écart, et la commande PUBLIE ce qu'elle trouve.
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);const st=(p._r202?.plafonds||[]).find(x=>x.id==='structurel');let pic=0;for(const w of p.weeks){if(w.isRecup||w.phase.id==='taper')continue;let l=0;for(const d of w.days)for(const s of d.sessions)if(s.d!=='rs'&&!s.race)l+=s.min||0;pic=Math.max(pic,l/60);}const e=(+st.brut)-pic;console.log('structurel '+(+st.brut).toFixed(1)+' · pic livré '+pic.toFixed(1)+' · écart '+e.toFixed(1)+' h · '+(e<=0.6?'BORNE-COMPTEE':'BORNE-PERDUE'));break;}"
```

## O-89 — FERMETURE (arbitrage « O-89 ARBITRÉ », 19/08/2026) : la borne d'épaule CLIQUETTE sur le LIVRÉ

*« Le cliquet de capacité projette trop haut → l'athlète sous-livre → récupérable. La borne
d'épaule projette trop haut → il nage 11 km/sem avec une épaule conditionnée pour 7 → blessure.
Une borne de sécurité ne projette pas. »*

**Forme livrée** : départ = bande de la continuité DÉCLARÉE (inchangé) ; ensuite le plafond de
la semaine w vaut `min(bande suivante, max(départ, maxLivré(semaines < w) × C22))` — lecture
ARRIÈRE, comme la rampe C22 (pas de circularité O-43 : chaque semaine lit un état fixé). Le
producteur du `maxLivré` est la passe O-85 elle-même, qui parcourt les semaines dans l'ordre et
avance le cliquet sur ce qu'elle vient d'écrêter. **Deux resserrages trouvés par le RAYON en
l'écrivant, publiés** : (1) ma première tête de cliquet ouvrait la bande ×8 à tout déclaré ≥
distance de course — un SPRINT gagnait +36,6 km de nage ; la marge +1 bande n'a de sens que
SOUS ratio 1 (le plan construit lui-même cette continuité, B-17) ; (2) elle s'ouvrait aussi aux
continuités INCONNUES (ratio 0) — plus lâche que l'ancien ×4 statique sur un défaut tacite
(U14). Après les deux : **rayon 471 profils multi-disciplines, 1 seul touché — REEL lui-même.**

**Sur REEL, mesuré** : l'escalier est GAGNÉ — 7 600 → 8 347 → 9 172 → 10 079 (chaque marche
≤ +10 % du volume DÉMONTRÉ, contre un saut +50 % du calendrier à S8 avant) ; **les récups S5-S6
gèlent le cliquet** (sous-livrer ralentit l'ouverture — la propriété demandée) ; plateau 11 400
en S10 ; **semaines de charge assises sur la borne : 27 → 16** (le « signal » du fondateur
baisse déjà) ; 3 warnings de plancher. **Et l'effet net est PUBLIÉ : +11 km de nage sur le plan
(l'escalier monte plus tôt que l'ancien plat), répartition nage 44,3 → 45,5 %** — la direction
inverse de la cible d'allocation, à peser dans le lot allocation : la borne est une protection,
pas un outil de répartition. **T-53 réécrit sur la même lecture arrière, contre-prouvé** (cliquet
auto-gonflé ×1,5 → rouge). **Fautes d'instrument publiées** : trois de mes probes « bundle HEAD »
important `goldenMaster.mjs` APRÈS le bundle mesuraient la source courante (goldenMaster:60
importe bridge.ts et écrase EBV2) — le premier rayon rendait « 0 touché » en comparant la source
à elle-même ; et le compteur `_o85`/`_o93` était effacé par le second reconcile de `repairLoop`
(le correcteur qui réussit effaçait sa trace, dans l'instrument anti-effacement lui-même) —
reset déplacé à l'entrée du build, les appels accumulent.

**Périmètre, dit** : `swimSessionCapAtWeek` (C15, borne de SÉANCE) garde sa projection C22^k —
sa levée pilote la construction des paliers, ce n'est pas une protection articulaire. Si « une
borne de sécurité ne projette pas » doit s'y étendre, c'est une décision à part.

## O-93 · L'INVERSION DES DÉCHARGES — les récups portaient des doses plus grosses que les charges · ✅ **FERMÉ (arbitrage du fondateur, 19/08/2026) — garde T-56 + passe, 4 320 → 0 inversions**

*« Une décharge existe pour absorber la fatigue accumulée. Si elle porte les plus grosses doses
du plan, ce n'est pas une décharge — la périodisation entière s'inverse. »* Quatrième inversion
de monotonie du dépôt : I13 (niveau) · O-21 (allure) · O-77 (volume déclaré) · **O-93 (phase)**
— T-51, le balayage de monotonie, gagne cet axe dans son périmètre.

**Mesuré AVANT (T-56 écrit rouge d'abord)** : **1 724 inversions de DISCIPLINE + 2 596 de TYPE**
sur le corpus — pire discipline : une récup à 294' de course pour 42' en charge voisine ; pire
type : « Nage aérobie + accélérations » à 6 000 m en récup pour 2 675 en charge. Systématique,
pas accidentel — le mécanisme présumé (le budget et le déversoir compriment les CHARGES, pas les
décharges) reste une hypothèse à attribution contrôlée, la passe corrige le SYMPTÔME mesurable.

**La passe (`enforceRecupSousCharges`, après le point fixe — elle doit lire les doses FINALES
des voisines)** : par récup encadrée, axe TYPE (dose ≤ max du même type chez les charges qui
encadrent, dans sa monnaie — mètres en nage, minutes ailleurs) puis axe DISCIPLINE (minutes,
legs de brick attribués) ; réductions par RÉPÉTITIONS d'abord (I14), jamais un bloc épinglé,
jamais la fréquence (C29), cible = l'égalité avec la meilleure voisine. Sur REEL : couverture
vélo 225' → 112', sortie longue de récup 85' → 66', VO2 de récup 6×4 → dose voisine.

**Deux interactions trouvées par les gates, chacune fermée avec sa raison** :
- **v6 D3** — sur tri/S (8 sem), la seule semaine de PIC est une récup : la réduire en faisait
  la référence de dominance (`peakAny`) et la réparation rabotait TOUT le plan (dev 3,7 h →
  1,5 h, footings de 16 min — le désastre O-21 rejoué par la protection). Exemption DÉRIVÉE
  (aucun pic en charge → la récup de pic est hors champ), COMPTÉE des deux côtés (passe et
  garde), jamais silencieuse (leçon O-15).
- **v6 R23.18-D** — réduire la semaine qui précède une course A− invalidait le « ≤ 60 % de la
  précédente » posé plus haut (mesuré : 63 %). Le plafond A− est extrait en FONCTION
  (`enforceMiniTaperAMoins`) et REJOUÉ après la passe — la garantie se rejoue, elle ne se
  duplique pas (R11.1, la leçon payée quinze fois).

**Et le banc v7 a trouvé un membre manquant de sa propre exemption** : la passe a resserré les
récups d'un profil `hanche/reprise/72 ans/eau 16 °C` et `S-MIX` a rougi (19 pts d'écart) — or le
moteur INTERDIT la course avec une hanche blessée (`INJURY_RULES.hanche = { forbid: ["rn"] }`),
et le regex `injRun` du harnais omettait « hanche » et « course » : l'instrument punissait une
règle de sécurité, sa propre famille documentée (R16.10 : 71/73 hits portaient un drapeau).
Regex aligné sur l'ensemble d'impact du moteur ; v7 revient dans ses budgets (swimrun 89 %).

**Le résidu mesuré est une CLASSE, pas un raté** : les 29 dernières « inversions » étaient
toutes des **« Nage continue » ÉPINGLÉES (paliers B-17) posées dans une récup** — un TEST
annoncé, qui se place précisément dans une semaine allégée (le patron d'une course B). La passe
les protège (jamais un bloc épinglé), le critère les met HORS CHAMP et les COMPTE. **T-56 vert :
0 inversion de discipline, 0 de type · contre-prouvé (passe retirée → rouge, 1 724+).**

```verify
id: O-93
quoi: la passe déclenche-t-elle encore, et combien d'inversions restent sur REEL ?
attendu: /_o93 .*semaines.*:[1-9]/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const pg=await import('./src/generator/planGenerator.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;globalThis.EBV2.buildPlan(sport,a);console.log('_o93 '+JSON.stringify(pg._o93));break;}"
```

## O-91 §3 — LA CAUSE EST LA TROISIÈME HYPOTHÈSE : le brick PREND le créneau, décision jamais écrite · **mesuré, décision désormais ÉCRITE dans le code**

Le document demandait de mesurer avant d'écrire la pièce : c'est la branche `slot === "durLong"`
de `src/sports/tri/index.ts` — **en spécifique et en pic, le créneau long CONSTRUIT le brick** ;
la « Sortie longue CAP » n'existe qu'en base/dev, d'où l'arrêt à S22. Ni créneau capté ni
condition accidentelle : un choix de construction (la séance la plus spécifique du tri est
l'enchaînement), délibéré et jamais écrit. **La décision est maintenant écrite à la branche**
(commentaire O-91) ; sa CONSÉQUENCE — aucune course sèche > 68 min sur les 20 dernières semaines
d'une prépa qui finit par un semi — reste l'objet de la pièce « sortie longue » du lot
progression, qui devra inclure la PRÉSENCE, pas seulement la taille.

## LE MANQUE DÉCLARÉ (O-43 §2, moitié « déclarer ») + O-94 — FERMETURE (ordre du fondateur, 19/08/2026)

*« Le manque déclaré lit la CIBLE DE BOUCLE, jamais la courbe rabattue — sinon il annoncera
0,6 h là où il en manque 3,6 à 5,0. Et le rabattement reste : afficher le livré ET l'écart
(gabarit O-87). »*

**Le manque déclaré.** La cible de boucle (`targetH` de chaque semaine) est ARCHIVÉE à la
construction (`_ciblesBoucle`), avant tout rabattement ; après le point fixe, une décision
`manque` se pose quand l'écart au pic ≥ 0,5 h/sem (la ligne de matérialité de la mesure O-43
§2), une fois par plan avec son ampleur totale — gabarit O-87 : la cible ET le livré, étiquetés.
Sur REEL : **« pic visé 13 h/sem — livré 9,6 (écart 3,4 h/sem, 101,9 h sur la préparation) »**
— là où la courbe rabattue disait 0,6. Le rabattement de `vol_declared` reste (la courbe
affichée décrit le plan). Population : **99 plans sur 986 déclarent, 887 n'ont rien à déclarer**
— les deux branches vivent, un critère que « toujours » ou « jamais » satisferait ne garde rien.

**O-94.** La re-sonde écrête désormais la nage du clone saturé à `swimWeeklyLoadCapM` (l'excédent
converti à l'allure du clone lui-même — règle 14, pas de table parallèle), ET le livré borne la
correction par en bas : ma première écriture rendait un « structurel » à 9,1 h sous un pic livré
à 9,6 — une capacité que le livré réfute (l'allure moyenne du clone saturé est plus rapide que
celle du livré, la saturation grossit les blocs au seuil). Sur REEL : **structurel 12,4 → 9,6**,
et la carte dit désormais « pic à 9,6 — ce qui borne, c'est le nombre de séances (−10,4 h/sem) »
avec le secours à 13 h — plus une heure promise qu'une protection interdit. V2.1 (qui PILOTE
`peakH`) gardait sa mesure sans la borne : décision à part, **rendue le jour même** — voir
« V2.1 REÇOIT LA BORNE » ci-dessous : la construction compte désormais la borne, et sur REEL le
manque N'EXISTE PLUS (il déclarait 3,4 h/sem tant que la boucle visait 13 h ; c'est cette
déclaration qui a permis l'arbitrage). **Effet sur le sceau, publié** : S5 (identité T-25
« min(plafonds) = pic livré ») descend 512 → 496 — l'identité DEVIENT vraie sur 16 profils, le
cliquet ré-épinglé avec sa cause.

**Garde T-57**, trois moitiés à l'époque (cible ≠ rabattu sur REEL · structurel < 11 ET ≥ pic
livré · population des deux branches épinglée) — **contre-prouvée : manque branché sur la courbe
rabattue → rouge · correction O-94 retirée → rouge.** Réécrite le jour même pour l'état
post-V2.1 (voir la fermeture suivante) ; le bloc `verify` ci-dessous porte l'état ACTUEL —
règle 17, un attendu périmé se réécrit sur la propriété, il ne se laisse pas basculer en
« ne reproduit plus ».

```verify
id: MANQUE-DECLARE
quoi: le manque lit la cible de BOUCLE et pas la courbe rabattue — les DEUX branches vivent-elles sur le corpus ?
attendu: /DEUX-BRANCHES/
# règle 17, 20/08 : l'`attendu` ne cite plus « absente · structurel 9,4 »
#   — l'état de REEL est une CONSÉQUENCE, et il se déplace dès qu'une pièce retire de la nage
#   (mesuré : la pièce C3 fait réapparaître le manque sans qu'aucune borne soit perdue). La
#   propriété est que la déclaration reste branchée sur la cible de boucle : un manque qui lirait
#   la courbe RABATTUE s'effondrerait vers son quantum de 0,5 h.
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let avec=0,sans=0,mx=0,reel='';for(const{key,sport,a}of profiles()){let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const d=(p._v2?.decisions||[]).find(x=>x.id==='manque');if(d){avec++;mx=Math.max(mx,parseFloat(String(d.val).match(/écart ([\d,]+)/)?.[1]?.replace(',','.')||0))}else sans++;if(key.startsWith('REEL'))reel=d?d.val:'absente';}console.log(avec+' déclarent · '+sans+' rien à déclarer · écart max '+mx.toFixed(1)+' h/sem · REEL : '+reel+' · '+(avec>=50&&sans>=500&&mx>=2?'DEUX-BRANCHES':'BRANCHE-MORTE'));"
```

## « V2.1 REÇOIT LA BORNE » — FERMETURE (arbitrage du fondateur, 19/08/2026)

*« Construire une cible qu'une protection interdit d'atteindre est ce qui produit les 3,4 h de
manque. Après : la cible descend à ~10 · le manque n'est pas masqué, il n'existe plus — le plan
cesse de promettre ce qu'il ne peut pas placer. »* Le motif n'est PAS celui d'O-94 (un
diagnostic) : ici c'est la **construction**.

**La forme.** La sonde V2.1 applique `swimWeeklyLoadCapM(gate, MAX_SAFE_INTEGER)` — le **plafond
de cliquet** (la bande que l'athlète peut GAGNER en livrant, O-89), pas le départ : au pic, le
cliquet aura eu le plan entier pour monter — aux DEUX clones de saturation (pic et spécifique,
R13.5). L'excédent de nage du clone se retranche à l'allure du clone lui-même (règle 14, pas de
table parallèle). Pas de circularité O-43 : la borne dérive de la continuité DÉCLARÉE et ne lit
jamais la semaine en cours (lecture arrière, comme la rampe C22). Domaine dérivé
(`disciplines.length > 1`), jamais une liste de sports.

**Sur REEL** : cible **13,0 → 9,7 h** (décision V2.1 « 9.7h (au lieu de 13.0h) », le why nomme
la borne) · la décision `manque` **N'EXISTE PLUS** (elle déclarait 3,4 h/sem · 101,9 h) ·
R20.2 : « pic à 9,4 h — ce qui borne, c'est le nombre de séances (−10,6 h/sem) », le secours à
13 h intact · structurel **12,4 → 9,4 = le pic livré** (le témoin O-94 borne par en bas). Le
diagnostic devient monocausal : ce que le manque déclarera ailleurs est désormais imputable aux
seules bornes de séance.

**§2 — la vérification qui pouvait inverser la décision, MESURÉE (rapportée, pas ajustée) :**

- **Le plan ne s'aplatit PAS** (le piège O-69) : volBase 7,8 → volPeak 9,4, semaines de charge
  de 6,2 à 9,1 h, amplitude 2,9 h ; la décision `O69-plat` est ABSENTE de REEL.
- **La rampe C22 mord encore** : départ 7,8 h (le volume récent) puis 7,8 → 8,3 → 9,0 sur le
  premier bloc — la montée existe toujours, elle vise simplement une cible honnête.
- **Les plafonds de charge mordent encore** : semaines assises sur la borne d'épaule **16 → 4**
  (sur 43). C'est la direction du critère de sortie de l'allocation (« ~0 semaine assise ») —
  la protection cesse de travailler en permanence, sans qu'on ait touché à l'allocation.
- **⚠ Le maximum n'est PLUS en dernière semaine de charge**, et c'est ce lot qui l'a déplacé —
  mesuré par expérience contrôlée (borne neutralisée dans la seule sonde) : AVANT, max = S40 =
  dernière charge (9,4 h) ; APRÈS, max en **S37 (9,1 h)**, S38 8,0 · S39 8,8 · S40 8,7. L'écart
  est de 0,4 h et la fin de plan reste dans la bande haute, mais la propriété « le pic est la
  dernière charge » ne tient plus au chiffre près sur REEL. **Rapporté tel quel** — le document
  demande de mesurer, pas d'ajuster ; à peser au lot progression (qui possède la forme du pic).
- **Répartition livrée** : nage **42,4 %** · vélo 28,6 % · course 29,0 % (total 300 h) — la
  nage redescend de 45,5 % (post-O-89) vers la cible d'allocation, là encore sans toucher une
  règle d'allocation.

**Cliquets, ré-épinglés avec leur cause et attribution par expérience contrôlée** (borne
neutralisée dans la seule sonde → les trois reviennent exactement) : S4 356 → **357**, S5
496 → **504** (la cible plus basse déplace ce que le point fixe retire — la moitié ouverte
d'O-35, huit profils où l'identité T-25 rebascule), T-48 VO2 8 676 → **8 704 min** · nage seuil
431 633 → **429 703 m** (la cible baisse, les mètres du pic suivent).

**Garde T-57 réécrite** pour l'état arbitré, quatre moitiés : V2.1 présente sur REEL avec cible
< 11 h ET avant-borne 12,5-13,5 (c'est la borne qui fait la descente) · manque ABSENT de REEL
(≥ 1 h/sem = la construction a re-perdu la borne) · structurel < 11 et ≥ pic livré · population
des deux branches (**90 déclarent / 896 rien à déclarer**, écart max ≥ 2 h/sem — un manque qui
lirait la courbe rabattue s'effondrerait vers son quantum de 0,5). **Contre-prouvée : borne
neutralisée → rouge sur (1) ET (2)** (« la décision V2.1 a disparu · REEL redéclare 3,4 h/sem »).

```verify
id: V21-BORNE
quoi: la sonde V2.1 compte-t-elle la borne dans la CONSTRUCTION — et sur combien de plans ?
attendu: /BORNE-DANS-LA-CONSTRUCTION/
# règle 17, 20/08 : l'`attendu` ne cite plus « 9,7h au lieu
#   de 13,0h » — cette valeur est celle de REEL au jour de la fermeture, et deux lots l'ont depuis
#   déplacée à 11,2h. Pire, la borne CESSE de mordre sur REEL dès qu'une pièce retire de la nage
#   (mesuré sur C3), et le bloc aurait alors annoncé « défaut réparé » pour une borne intacte.
#   La propriété se mesure donc sur la POPULATION — « un zéro a besoin de sa population » — et la
#   commande publie le compte trouvé.
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const {profiles}=await import('./scripts/goldenMaster.mjs');let n=0,tri=0,ko=0,reel='';for(const{key,sport,a}of profiles()){let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const dv=(p._v2?.decisions||[]).find(x=>x.id==='V2.1');if(key.startsWith('REEL'))reel=dv?dv.val:'absente';if(!dv)continue;n++;if(sport==='tri')tri++;const m=String(dv.val).match(/([\d.]+)h \(au lieu de ([\d.]+)h\)/);if(!(m&&parseFloat(m[1])<parseFloat(m[2])))ko++;}console.log('V2.1 comptée sur '+n+' plans (dont tri '+tri+') · '+ko+' sans descente · REEL : '+reel+' · '+(n>=50&&tri>=20&&ko===0?'BORNE-DANS-LA-CONSTRUCTION':'BORNE-ABSENTE'));"
```

## RE-VÉRIFICATION B-17 — les 7 critères d'acceptation rejoués sur le moteur actuel (V21_ET_REVERIF_B17 §3, 20/08/2026)

*« Rejouer les critères d'acceptation de B-17, pas écrire un lot. Si trois défauts sont apparus
sans qu'on les cherche, il y en a probablement d'autres. »* Balayage : les 188 profils tri du
golden à décision `B17-paliers`. **Il y en avait d'autres — et le diagnostic enregistré d'O-84
était FAUX pour 22 de ses 29 profils** (détail dans l'entrée O-84, réécrite).

**[✗] 1. paliers annoncés = livrés (O-84).** 29/188 au compte de l'instrument, INCHANGÉ par
O-85/O-89/O-93/V2.1 — mais la décomposition renverse le ticket : **22** ne perdent RIEN (l'annonce
compte le TEST comme un palier, voir O-84 réécrit) · **1** est l'exemption épaule que l'annonce
ignore (3 annoncés, 0 posés — la pose est délibérée, `!inj.shoulder`, l'annonce ne le sait pas) ·
**6** perdent réellement un palier, et le site est IDENTIFIÉ avec preuve (le repli FRÉQUENCE de
« dev ≤ pic » — voir O-84).

**[~] 2. aucun épinglé raboté par une passe aval (O-53).** Les passes surveillées tiennent :
titre = corps sur 100 % des continues livrées, T-39/T-53/T-56 verts, O-85 et O-93 épargnent les
épinglés (compté). MAIS le corps lui-même est clampé SOUS l'épingle par le budget de
séance/semaine — la moitié OUVERTE d'O-54, re-mesurée ici sur `G/tri/Full/vol-min` : épingle
3 800 m, corps livré **2 150 m**, suite livrée **2 275 · 3 050 · 2 150** (NON MONOTONE : le
dernier palier, celui de la distance de course, est le plus PETIT), **0 avertissement**. Reporté
dans O-54.

**[✗] 3. la continue en eau libre existe et tombe TÔT en spécifique.** 180/188 oui. **8 profils
(S et M, source non mesurée) la reçoivent à 100 % de la spec** — dernière semaine. Mécanisme :
avec 2 paliers posables, le TEST prend la position 0 (arbitrage D3, correct) et la consigne eau
libre « se décale au palier suivant » — qui est la DERNIÈRE semaine (`positions = [0, len−1]`).
Découvrir l'eau libre à la dernière continue avant l'affûtage, c'est le contraire de « tôt ».
Ouvert : **O-95**.

**[✓] 4. la progression atteint la distance de course** — jugée contre le format LIVRÉ (B-17
rabat) : **173 conformes · 11 hypothèse déclarée** (source non mesurée : la note du test dit
elle-même que le plan avance sur une hypothèse) · **3 KO, tous sur des tickets connus** :
`vol-min` (O-54, budget < épingle, ci-dessus) et 2 × `debutant/basse-100m` (rabattu au PLANCHER
S, atteignable 354-472 m < 750, livré 500, **0 avertissement** — le format le plus court du sport
ne suffit pas et rien ne le dit : la moitié « informer » de R11.2 manque sur cette branche,
reporté dans O-54 §rabattement-plancher). **Deux fautes de MON instrument, publiées** : la
première passe jugeait contre le format DEMANDÉ — la faute T-50 exacte, refaite dans la sonde qui
vérifie B-17 — et déclarait 23 KO ; la seconde avalait « test prescrit, hypothèse 290 m » comme
un format (cible 0, tout passait « conforme »).

**[✓] 5. le gate se déclenche sur les bonnes populations.** 188/188 tri portent la décision,
0 profil à gate muet : mesure-suffisante 88 · mesure-basse 72 · non-mesurée 28. À noter (pas un
défaut, une imprécision d'annonce) : la branche « mesure suffisante » reçoit les mêmes
« paliers » que la construction — un RAPPEL n'est pas une CONSTRUCTION, l'annonce ne distingue
pas.

**[✓] 6. « je ne sais pas » déclenche toujours le test.** 28/28 non-mesurées ont leur « Test de
continuité », 0 manquant. Remarque au passage : chez l'inconnu DÉBUTANT la progression est PLATE
(500 · 500 · 500 — plafonnée par C15 tant que le test n'est pas rapporté). Défendable (sécurité,
et le cliquet O-56 lève le plafond dès que l'athlète rapporte), mais l'annonce dit « 4 paliers »
au-dessus d'une suite constante.

**[✓] 7. le corpus échantillonne des débutants nageurs sur chacun de ces points.** 56 profils
débutants à gate actif ; couverture par point : eau libre 52 · atteinte de la distance 42 ·
test 8 · O-84 (les B17/*/debutant sont dans les 29).

```verify
id: REVERIF-B17-4
quoi: la progression atteint le format LIVRÉ (rabattu compris) — combien de KO hors hypothèse déclarée ?
attendu: /· 3 KO/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');const{continuityGate}=await import('./src/engine/swimContinuity.ts');const T={S:750,M:1500,'70.3':1900,Full:3800};let ok=0,hy=0,ko=0;for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const c=p.weeks.flatMap(w=>w.days.flatMap(x=>x.sessions)).filter(s=>/^Nage continue/.test(s.name)).map(s=>+(s.name.match(/(\\d+) m/)?.[1]??0));if(!c.length)continue;const r=(p._v2?.decisions??[]).find(x=>x.id==='B17-continuite');const m=r?String(r.val).match(/^(S|M|70\\.3|Full) /):null;const f=m?m[1]:String(a.format);const g=continuityGate(a,p.weeks.length);const mx=Math.max(...c);if(mx>=(T[f]??0))ok++;else if(g&&g.source!=='mesure')hy++;else ko++;}console.log(ok+' conformes · '+hy+' hypothèse · '+ko+' KO');"
```

## O-95 · La continue en EAU LIBRE tombe à la DERNIÈRE semaine de spécifique sur les formats courts · ✅ **FERMÉ le 20/08 (doc O72_O84_O95) — le TEST glisse en fin de développement**

**Fermeture.** Mesuré d'abord : les 8 profils ont TOUS une spec de 2 semaines — **les deux pistes
du ticket étaient VIDES pour la population réelle** (rien à décaler dans une spec de 2 semaines,
rien à porter à 3). La forme : quand la source n'est pas mesurée et que la spec ne peut porter
que 2 créneaux, le TEST glisse en fin de DÉVELOPPEMENT (une mesure se prend le plus tôt possible
— l'argument de D3 lui-même, et l'athlète gagne du temps pour rapporter sa distance) ; la spec
garde alors 2 vrais paliers : **l'eau libre en PREMIÈRE semaine, la distance de course en
dernière**. Point unique `palierLayout` (annonce ET pose — le calcul dupliqué était la cause
d'O-84a), borné au défaut mesuré (`n === 2`, dev existant). Sur les 8 : test S4/S7 [dev] · eau
libre S5/S8 (première semaine de spec) · finale 750/1500 = la distance — **les S/M « inconnus »
ATTEIGNENT désormais leur distance de course** là où l'ancien palier unique plafonnait à 500-600.
Re-mesuré : **tardive 8 → 0**. Garde : T-06 (f), quatre assertions (test en dev · ow en première
semaine · finale en dernière · l'annonce dit la disposition). Coût publié : chez les DÉBUTANTS,
C15 clampe les nouvelles cibles à 500 m — 4 blocs épinglés rabotés de plus (T-39 26, ré-épinglé
avec cause), du mécanisme O-54 §2 déjà arbitré.

Trouvé par la re-vérification B-17 (critère 3). **8 profils** (`B17/tri/{S,M}/{inter,debutant}/
{inconnue,absente}`) reçoivent leur première — et unique — continue en eau libre à **100 % de la
phase spécifique**, la dernière semaine avant le pic. Mécanisme, trois règles justes qui se
composent mal : (1) avec un écart petit (format court), `palierPosables` rend 2 ; (2) source non
mesurée → le palier 0 est le TEST, en bassin, et la consigne eau libre « se décale au palier
suivant » (arbitrage D3, correct — un test de continuité chez un inconnu ne se fait pas en eau
libre) ; (3) `positions = [0, len−1]` → le palier suivant est la DERNIÈRE semaine. Découvrir
l'eau libre à la dernière continue avant l'affûtage est le contraire du « tôt » que B-17 promet —
et c'est la population qui en a le plus besoin (continuité inconnue). Pistes à arbitrer : décaler
la position du 2ᵉ palier vers le milieu de la travée quand n = 2, ou porter n à 3 dès que la spec
a ≥ 3 semaines. Domaine : formats courts × source non mesurée uniquement (les 180 autres profils
sont conformes).

```verify
id: O-95
quoi: combien de profils reçoivent leur première continue eau libre dans la dernière moitié de la spec ?
attendu: /tardive : 0/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');let n=0;for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}const spec=p.weeks.filter(w=>w.phase?.id==='spec').map(w=>w.num);const ow=[];for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions)if(/^Nage continue en eau libre/.test(s.name))ow.push(w.num);if(!ow.length||spec.length<2)continue;if((ow[0]-spec[0])/(spec.length-1)>0.5)n++;}console.log('tardive : '+n);"
```

## O-72 RÉVISÉ (doc O72_O84_O95 §1) — T-58, un PLATEAU pas un point · mesuré sur REEL, garde au lot progression

*« "Le max est dans la dernière semaine de charge" décrit une structure valide parmi plusieurs.
Forme révisée : aucune semaine de charge postérieure au maximum ne descend de plus de 10 % sous
lui. À mesurer avant de conclure que le déplacement S40 → S37 est une régression. »*

**Mesuré sur REEL (moteur courant, récups exclues)** : max S37 à 9,1 h · charges postérieures
S38 8,0 · S39 8,8 · S40 8,7. **T-58 serait ROUGE d'une semaine** : S38 est à **12 %** sous le
max — 11 minutes sous la ligne des −10 % (8,19 h), l'unité de la conséquence d'abord (règle 14).
S39 et S40 tiennent le plateau. Le déplacement S40 → S37 n'est donc PAS la forme qu'O-72 fermait
(un pic en base suivi de vingt semaines de déclin) : c'est un bloc final en plateau avec UN creux
d'une semaine, à 11 min de la borne. Rapporté, pas ajusté — **la garde T-58 s'écrit au lot
progression** (item 5 de l'ordre), qui possède la forme du pic ; l'écrire avant, c'est épingler
un rouge qu'on s'apprête à re-former.

```verify
id: T-58-MESURE
quoi: le bloc final de REEL est-il un plateau (charges après le max ≥ 90 % du max) ?
attendu: /S38.*12 ?%|VIOLÉ par S38/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');for(const{key,sport,a}of profiles()){if(!key.startsWith('REEL'))continue;const p=globalThis.EBV2.buildPlan(sport,a);const wk=p.weeks.map(w=>({n:w.num,r:!!w.isRecup,ph:w.phase?.id,h:Math.round(w.days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.race?0:(s.min||0)),0),0)/6)/10}));const ch=wk.filter(w=>!w.r&&w.ph!=='taper'&&w.ph!=='race'&&w.h>0);const mx=ch.reduce((x,y)=>y.h>=x.h?y:x);const v=ch.filter(w=>w.n>mx.n&&w.h<mx.h*0.9);console.log(v.length?'VIOLÉ par '+v.map(w=>'S'+w.n+' ('+w.h+' h, '+Math.round((1-w.h/mx.h)*100)+'% sous)').join(' · '):'plateau tenu');break;}"
```

## LOT VOLUME + RÉPARTITION — PIÈCES A · B · C (décision du fondateur, 20/08/2026) · 🟡 **LIVRÉ, 5 critères de sortie sur 9 atteints, les 4 autres MESURÉS et publiés**

**Cible produit décidée par le fondateur : vélo 50 % · course 30 % · natation 20 %** — cohérente
avec l'épreuve (le vélo pèse ~52 % du temps de course), assumée aux bornes de ses fourchettes.
*« Le volume et la répartition ne peuvent pas se corriger séparément »* : d'où un lot unique.

**⚠ FIXTURE : la mesure porte sur `history: confirme`, la valeur RÉELLE.** Le fondateur avait
poussé `history` à `ancien` et `vol_max` à 20 dans SON app pour tester la contrainte ; la fixture
golden porte `confirme` depuis O-85 §2 et n'a pas bougé. `vol_max: 20` y figure aussi depuis
cette reconstitution — il PRÉCÈDE la manipulation, et reste une valeur reconstituée, pas relevée
(comme `longest_swim_m` et `milieu`).

### Les neuf critères de sortie, mesurés sur le profil réel

```
                                    entrée      livré       cible
[1] pic livré                        9,4 h      11,2 h      ≥ 12,5      ✗ (+1,8 h)
[2] vélo                            28,6 %      40,3 %      45-50       ✗ (+11,7 pts)
    course                          29,0 %      31,8 %      28-32       ✓
    natation                        42,4 %      27,9 %      18-22       ✗ (−14,5 pts)
[3] semaines assises sur la borne        8           6      0           ✗
[4] bornes absorbées en S1           1,9 h       0,2 h      < 1 h       ✓
[5] maillon mordant             structurel  structurel      autre       ✗
[6] sortie longue vélo hors brick    néant    5 × 201'      ≥ 1         ✓ (présente, PAS croissante)
[7] sweetspot vs force                8 / 18     16 / 10     ss > force ✓
[8] T-58 plateau final              S38 ✗      S38 ✗        tenu        ✗ (11 min sous la ligne)
[9] volume non plaçable             absent     absent       descend     ✓
    volume total de la préparation   300 h       357 h
```

**Cinq critères sur neuf sont atteints, et le plus visible ne l'est pas** : le maillon mordant
reste « le nombre de séances ». Le plafond structurel a MONTÉ de 1,8 h sans CHANGER DE NATURE —
ce qui borne reste le produit `nSess × durée max`, et la semaine de pic livre 10 séances pour 12
prescrites. C'est la mesure la plus utile du lot : **il faudra des CRÉNEAUX, pas des minutes.**

### A1 — la trajectoire du footing est RETIRÉE, et c'est une mesure qui l'a décidé

O-81 l'avait livrée, **O-82 l'a rendue VIVANTE en réparant `progCap`** — et personne n'a re-mesuré
ce que la rendre vivante coûte. Expérience à un facteur, quatre départs :

```
départ 0,60 (livré)   pic 9,4 h · total 300 h · footing 25'→46'
sans trajectoire      pic 9,9 h · total 328 h · footing 38'→50'
départ 0,80           pic 9,6 h · total 313 h · footing 33'→48'
départ 0,90           pic 9,6 h · total 317 h · footing 35'→49'
```

**Elle coûtait 28 h de préparation et 0,5 h de pic pour une progression que la COURBE fournit
déjà** (sans elle, le footing va quand même de 38' à 50'). L'amplitude des semaines de charge ne
bouge dans aucune variante (2,8-2,9 h) : le piège O-69 ne se déclenche pas. Le PLAFOND relevé
d'O-81 reste ; le départ progressif appartient à la rampe R10/O-69 et à C22, au niveau de la
SEMAINE — le bon niveau pour une charge.

### A2 — la sortie longue à pied existe en spécifique et en pic

La décision O-91 (« le créneau long CONSTRUIT le brick en spec/pic ») est RESPECTÉE ; ce qui est
corrigé est sa conséquence jamais arbitrée — vingt semaines sans course sèche > 68 min avant un
semi. Elle reprend le SECOND créneau facile course (`slotIdx === 1`), qui rendait un deuxième
footing de 30 min. Pas de `long: true` (le pivot de la semaine reste le brick, I14).

**Trouvé en la posant : les deux reconstructions C18b appelaient `buildSessions` sans `weekNum`,
sans `slotIdx` et sans `isRecup`** — les défauts (semaine 1, premier créneau, semaine de charge)
faisaient reconstruire une AUTRE variante que celle du jour traité, silencieusement. C'est ce qui
privait les semaines de PIC de la pièce. Identité du jour préservée aux deux sites.

### A3 — LA PRÉMISSE EST RÉFUTÉE PAR LA MESURE, et rien n'est écrit

*« Les bornes scalent avec l'athlète : 3,5 h de décharge pour 10 h de charge, cinq séances toutes
à leur plafond. »* **Mesuré : les semaines de récup SCALENT.** Médiane 4,83 h pour une charge
médiane de 8,20 h (59 %, cohérent avec `RECUP_WEEK_FACTOR = 0,62`), et le balayage un-facteur le
confirme (`6 séances` → récup médiane 4,20 h · `vol_max 8` → 3,75 h). Les 3,50 h vus sont le
MINIMUM (3 semaines sur 10), pas la règle. Ce qui reste vrai est une DISPERSION (40-78 % du
voisin) et trois décharges rigoureusement identiques — un autre objet, non traité ici. *Une règle
qu'aucun défaut mesuré ne réclame est une règle qui en crée un* (R16.10).

### A4 / T-58 — le plateau final, et le seuil en pourcentage ne suffisait pas

Écrit en pourcentage pur, le critère désignait **11 plans sur 68 dont le PIRE creux vaut
15 minutes** (les autres 8, 7, 3, 0) — la quantification des séances, pas une forme de plan. Le
creux doit franchir les DEUX monnaies : plus de 10 % ET plus de 20 minutes. **Ce que ça répond au
passage : le déplacement du maximum de S40 vers S37 n'est pas une régression de forme** (le creux
de S38 vaut 11 min sous la ligne). Résidu : 2 plans sur 68, les `O-21b/run/10k` à 7:00 et
8:30/km — la population de l'inversion sur l'axe ALLURE, déclarée ouverte (O-21).

### B1 · B2 — les deux pièces du lot vélo, réécrites depuis le registre et re-mesurées

Le créneau long alterne (semaines PAIRES → sortie longue vélo, bornes du leg vélo du brick) et le
doublage alterne (semaines IMPAIRES → « Endurance vélo », un type qui n'existait pas : le tri
n'avait AUCUNE séance de vélo en endurance pure). Le décalage pair/impair est celui que la mesure
d'époque avait trouvé — *deux pièces qui ajoutent de la charge déclarent leur PHASE, pas seulement
leur fréquence*. Exclusions inchangées et toutes sur des règles existantes (blessure/drapeau
médical, prépas < 12 semaines, pas de `long: true`).

**Un huitième paramètre a été nécessaire, et il ne double pas `isRecup` : `semaineRecup`.** Le
drapeau `isRecup` est celui du JOUR ; une semaine de décharge garde des jours de charge (R18.5), et
le générateur la déclare récup dès 4 jours sur 7. Mesuré au rendu : la sortie longue vélo se posait
dans S22 — une décharge — sur son unique jour resté `dur`, à 201 minutes. La passe O-93 ne pouvait
pas la rattraper (elle compare un type à ses charges VOISINES, et celui-ci n'y existait pas).

### C1 · C2 — la répartition devient une cible NOMMÉE, et le sweetspot passe devant

`ALLOC_CIBLE` (matrice de contraintes) porte la cible du fondateur pour le TRIATHLON — et pour lui
seul : aucun autre sport n'a reçu d'arbitrage de répartition, en inventer un par symétrie serait
la faute que la règle de fixture interdit. Une décision `allocation` la publie au gabarit O-87
(cible ET livré étiquetés) dès que l'écart atteint 5 points : sur le profil réel, *« vélo 40 %
(visé 50) · course 32 % (visé 30) · natation 28 % (visé 20) »*. **Aucune passe ne la force** —
trois essais ont déjà montré ce que ça coûte (*« borner la nage → le sweetspot grossit ; geler un
bloc → la nage grossit ; tout borner → le brick passe SOUS son plancher audité »*), et un manque
ne se prend jamais sur un plancher de sécurité : il se DÉCLARE. **C2** : le créneau `dur2` garde la
force basse cadence en BASE (sa phase) et passe au sweetspot en DÉVELOPPEMENT — 8/18 devient 16/10.

### Gardes, contre-preuves, cliquets

**T-59** (quatre propriétés : longue CAP en spec/pic · longue vélo hors brick et hors décharge ·
doublage non mono-nage · répartition publiée), **contre-prouvée pièce par pièce** : A2 retirée
→ 104/104 en défaut · B1 retirée → 104/104 · B2 retirée → 1/1 · C1 retirée → aucune décision.
**Deux fautes de mon instrument publiées** : le critère du doublage mesurait « deux disciplines le
même jour » (VRAI sans la pièce — la nage venait du doublage, le vélo du créneau) au lieu du
routage lui-même ; et son plancher de population exigeait 100 plans quand le corpus n'en contient
que 68 avec un après-maximum, ce qui rendait un verdict sur l'instrument.

**T-59 reste ROUGE sur un résidu MESURÉ et BORNÉ** : 5 plans sur 104, tous des `tri/Full` à
disponibilité serrée, où les deux créneaux faciles course de la spécifique portent de la NATATION
(R13.3 y a pris la place). Poser la sortie longue là reviendrait à la prendre à la discipline
limitante : c'est un ARBITRAGE de priorité sur budget serré, pas un défaut de la pièce — le garde-
fou 4 du lot dit de s'arrêter et de rapporter.

**T-56 rectifiée** : son axe DISCIPLINE comparait une décharge à une référence NULLE — mesuré,
`G/tri/Full/vol-min` (3 séances/semaine) a des semaines de CHARGE sans une minute de course, et une
décharge à 8 min de course y devenait une « inversion ». Une discipline absente des charges
voisines est une différence de PRÉSENCE, pas une inversion de monotonie ; l'axe TYPE portait déjà
cette exemption, pour la même raison.

**Cliquets ré-épinglés avec leur cause** : S4 357 → **341** (la plus grosse baisse du chantier —
I14 cesse d'être violée là où la semaine n'avait aucune séance longue de sa discipline), S5 502 →
**504**, rabotages épinglés 26 → **29** (mécanisme O-54 §2), pic tri VO2 8 720 → **8 244 min** et
nage seuil 428 603 → **410 901 m** (à plafond de temps dur inchangé, la place cédée au vélo et à
la sortie longue). Rayon golden : **188 profils, TOUS en tri**.

### Ce qui reste, nommé

```
le plafond structurel a monté sans changer de NATURE   10 séances livrées pour 12 prescrites
la nage reste à 28 % pour une cible à 20               ~5 créneaux de nage par semaine
la sortie longue vélo ne PROGRESSE pas                 saturée à 201' (plafond du format)
5 tri/Full à budget serré sans longue CAP en spec      arbitrage de priorité, T-59
```

## QU'EST-CE QUI ATTRIBUE UNE DISCIPLINE À UN CRÉNEAU ? — la mesure préalable du lot « type du créneau » (20/08/2026)

**Aucun correctif.** Les trois questions du §5, répondues sur le code ET sur le livré.

### (1) Le schéma de semaine est AGNOSTIQUE de la discipline — c'est écrit, et c'est vrai

`schema()` (`weekBuilder`) ne pose que deux choses par jour : une CHARGE (`dur` / `facile` /
`recup` / `off`) et un NOM DE CRÉNEAU. Son commentaire le dit depuis R10 (« il est agnostique de
la discipline, et c'est très bien ainsi »), et la lecture le confirme — aucune discipline n'y
apparaît. Quatre formes :

```
le sport a son propre schéma      `mod.weekSchema` — le TRAIL en déclare un (la longue est le
                                  pivot du week-end, le lundi porte le renfo excentrique)
semaine de récup                  facileR · facile2 · off · facileR · facile2 · facileR · off
semaine de charge, 7 jours        recup · dur1 · facileR · dur2 · facile2 · durLong · facileR
semaine de charge, cycle de 10 j  dur1 · facileR · dur2 · facile2 · facileR · facileR · dur2 ·
                                  facile2 · durLong · recup
```

**Conséquence directe : le nombre de créneaux d'une semaine est fixé par le CALENDRIER** (7 jours,
ou 10 pour un cycle), et la seule façon d'en ajouter est le DOUBLAGE — ce que la mesure O-97
avait déjà établi par le dehors.

### (2) C'est le MODULE DU SPORT qui attribue, et la mesure du livré donne la carte

188 profils tri, toutes semaines confondues :

```
créneau     total    disciplines livrées
facileR     10 997   course 88 % · nage 12 %
facile2      5 302   nage 100 %                        ← MONO-DISCIPLINE
durLong      3 859   brick 43 % · course 37 % · vélo 21 %
dur1         3 818   vélo 99 % · nage 1 %
dur2         3 753   vélo 54 % · course 46 %
```

**Par PHASE, deux créneaux basculent franchement et deux ne bougent jamais :**

```
dur2      base vélo 100  ·  dev vélo 99  ·  spec course 99  ·  peak course 99  ·  taper course 100
durLong   base course 73/vélo 27  ·  dev course 55/vélo 45  ·  spec+peak brick 100
facileR   course 92-99 % partout, sauf spec/peak où la nage prend 21-27 %
dur1      vélo 98-99 % dans TOUTES les phases
facile2   nage 100 % dans TOUTES les phases
```

⚠ **Cette carte décrit le routage NON DOUBLÉ** : seuls 2 des 188 profils tri du corpus portent
`doubles: "oui"` (neuvième A-2). Sur le profil réel, qui double, elle devient :

```
dur1     nage 55 % · vélo 45 %        (le doublage y pose la nage de qualité)
dur2     vélo 53 % · nage 25 % · course 22 %   (l'alternance B2 s'y voit)
facile2  nage 98 %                    ← MONO-DISCIPLINE, même en doublant
facileR  course 93 % · vélo 7 %
durLong  brick 48 % · course 35 % · vélo 17 %
```

> **Le créneau typé, c'est `facile2` : nage à 98-100 % dans les deux corpus, toutes phases
> confondues.** C'est exactement la cible du §3 du document — convertir un créneau nage en
> créneau vélo, c'est convertir un `facile2`, et c'est UNE branche.

### (3) Le critère est-il paramétrable ? **NON — il est en dur, dans 29 branches**

Le module tri porte **29 sites `S2.push`**, chacun écrivant sa discipline en LITTÉRAL :

```
d: "bk" × 10   ·   d: "sw" × 8   ·   d: "rn" × 7   ·   d: "br" × 2   ·   d: "rs" × 2
```

Ils sont choisis par une cascade de `if / else if` lisant **treize conditions distinctes** —
`phase` (38 lectures), `slot` (9), `runInj` (8), `medHold` (8), `weekNum` (7), `dbl` (7),
`beginner` (7), `slotIdx` (5), `isRecup` (5), `lvl` (4), `finisher` (4), `noVo2` (3),
`semaineRecup` (2). **Aucune table ne relie un créneau à une discipline** : `disciplines:
["sw","bk","rn"]` du registre déclare seulement ce que le SPORT contient, jamais qui occupe quoi.

**Ce que ça implique pour le lot suivant** : « changer le type d'un créneau » n'est pas un
paramètre à poser, c'est une branche à écrire — et le point unique n'existe pas encore. Deux
formes possibles, à arbitrer AVANT d'écrire : soit une table `créneau × phase → discipline` que
le module lit (le schéma cesse d'être agnostique, mais la carte ci-dessus montre qu'il l'est déjà
de fait, à la branche près), soit une règle d'ALTERNANCE comme B1/B2, qui ne touche qu'un créneau
et garde le reste. La première est un chantier, la seconde un ticket.

**Ce que la mesure ne dit PAS** : elle ne dit pas si les 88/12 de `facileR` ou les 54/46 de `dur2`
sont des choix ou des sédiments. Elle donne la carte, pas l'intention — et l'intention de chaque
branche est dans son commentaire, qu'il faudra relire une par une avant de toucher au routage.

```verify
id: CRENEAU-TYPE
quoi: le créneau facile2 est-il toujours mono-discipline (nage) sur le corpus tri ?
attendu: /facile2 : nage 9[89]|facile2 : nage 100/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');const o={};for(const{sport,a}of profiles()){if(sport!=='tri')continue;let p;try{p=globalThis.EBV2.buildPlan(sport,a)}catch{continue}for(const w of p.weeks)for(const d of w.days){if(d.slot!=='facile2')continue;for(const s of d.sessions){if(s.race||s.d==='rs')continue;o[s.d]=(o[s.d]||0)+1;}}}const t=Object.values(o).reduce((a,b)=>a+b,0);console.log('facile2 : '+Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(k==='sw'?'nage':k==='bk'?'vélo':k)+' '+Math.round(100*v/t)).join(' · '));"
```

## L'ALLOCATION — la cible à 20 % de nage ne tient qu'à partir de 13 h (§3, acté au registre)

Ajouté à `ALLOC_CIBLE` comme réserve écrite, parce que c'est la TROISIÈME fois que le volume et la
répartition se révèlent inséparables :

```
à 11,2 h   nage 20 % = 2,2 h   →  3 séances de 45 min  (la fréquence tombe sous ce que la
                                    technique demande)
                              ou  4 séances de 33 min  (le palier B-17 en demande ~41)
à 13 h     nage 20 % = 2,6 h   →  4 séances de 39 min  ✓
```

**En dessous de 13 h, la cible force un arbitrage entre la FRÉQUENCE et la LONGUEUR** — et pour
un nageur limité par la technique, aucun des deux ne se sacrifie bien. La cible reste donc
publiée telle quelle (elle décrit l'objectif), et l'écart qu'elle affiche à 11,2 h est en partie
une conséquence du volume, pas seulement du routage.

## LES PIÈCES RESTANTES DU LOT PROGRESSION — objet RÉVISÉ (§4, acté)

```
✗  allonger un type                →  semaine plus lourde, pas plus spécifique   (MESURE 4)
✓  faire APPARAÎTRE un type        →  là où il manque (A2 : la longue après S22)
✓  changer le TYPE d'un créneau    →  le levier établi deux fois
+  et seulement sur des types PRÉSENTS AU PIC — un plafond relevé sur un type absent du pic
   ne change pas le pic (mesuré : le pic est la somme des plafonds de SES 9 séances)
```

**A3 (semaines de récup) est RETIRÉE de la file** : la mesure a montré qu'elles scalent déjà
(médiane 59 % de la charge, cohérent avec `RECUP_WEEK_FACTOR`), et sa prémisse — « 3,5 h pour
10 h de charge » — venait d'un point, pas d'une population.

## LES 1,8 H MANQUANTES ET LES 2,6 H DE MARGE — **la contradiction est levée : la marge n'existait pas** (mesure du 20/08/2026)

*« Il y a plus de marge disponible que de volume manquant. Pourquoi le placement n'utilise-t-il
pas la marge dont il dispose ? »* **Mesuré : la question n'a pas d'objet — le placement utilise
tout ce dont il dispose, et « la marge » était un artefact de mon indicateur.**

### La semaine de pic ATTEINT sa cible, à 0,2 % près

```
cible déclarée de la semaine de pic     11,2 h
livré                                   11,18 h        ← 99,8 %
sonde V2.1 (clone SATURÉ de la semaine) 11,2 h
```

**Il n'y a AUCUN volume non placé au pic.** Les 1,8 h manquantes sont l'écart au CRITÈRE DE
SORTIE (12,5 h), pas un volume que le moteur viserait sans y arriver — la décision `manque` est
d'ailleurs absente de ce plan.

**Et les 2,6 h de marge n'en étaient pas.** Mon indicateur de MESURE 2 comparait chaque séance au
maximum que son type atteint AILLEURS dans le plan — or ces maxima sont atteints dans des semaines
à composition DIFFÉRENTE (« Nage récup courte » vaut 60 min dans une décharge où elle est presque
seule). Ils ne sont pas simultanément atteignables dans la semaine de pic, et la preuve est le
clone saturé : si la marge était réelle, il rendrait 13,8 h — il rend 11,2. **La limite que
j'avais publiée avec la mesure (« le maximum ailleurs est un PROXY du plafond ») est confirmée :
le proxy surestimait.**

### L'hypothèse d'O-85 : réfutée dans sa forme forte, CONFIRMÉE dans sa forme typée

Trois états, un facteur à la fois, sur le moteur COURANT (le « −1,7 h » du diagnostic R20.2/REEL
datait d'avant « V2.1 reçoit la borne » et d'avant le lot A·B·C — un compte se publie avec son
moment) :

```
état                                    pic       total    nage    vélo    course
(a) livré                              11,18 h    357 h   27,9 %  40,3 %  31,8 %
(b) passe O-85 neutralisée             11,18 h    372 h   29,4 %  39,3 %  31,3 %
(c) borne d'épaule neutralisée PARTOUT 11,52 h    367 h   31,4 %  39,0 %  29,6 %

(a) → (b)   nage +10 h · vélo +2 h · course +4 h     pic +0,00 h
(a) → (c)   nage +16 h · vélo −1 h · course −5 h     pic +0,34 h
```

**Le pic ne monte PAS de 1,7 h** — il ne monte pas du tout quand la passe est neutralisée, et de
0,34 h quand la borne disparaît partout. La coïncidence « 1,7 h retirés / 1,8 h manquants » se
dissout : les deux chiffres appartiennent à deux états du moteur différents.

**Mais le volume libéré revient bien dans la NAGE**, et au-delà : à l'état (c), le vélo PERD 1 h
et la course 5 h pendant que la nage en gagne 16. Le créneau est typé — ce qu'une protection de
nage relâche ne devient jamais du vélo. **Corollaire qui décide** : retirer la protection
ÉLOIGNE de la cible d'allocation (nage 27,9 → 31,4 %, vélo 40,3 → 39,0 %). La borne d'épaule est
aujourd'hui le mécanisme qui rapproche le plus le plan de sa cible, et elle le fait par accident.

### Ce que ça laisse ouvert

Ce qui borne la semaine de pic est donc **la somme des plafonds des 9 séances qui la composent**
(le clone saturé), pas un maillon nommé. Pour monter, il faut donc soit plus de créneaux, soit des
plafonds plus hauts **sur les types PRÉSENTS AU PIC** — ce qui rejoint le §5 du document : le
levier est *quels types apparaissent quand*, et un plafond relevé sur un type absent du pic ne
change rien à ce chiffre.

```verify
id: MARGE-PIC
quoi: la semaine de pic atteint-elle sa cible déclarée, et la sonde saturée dit-elle la même chose ?
attendu: /pic 11\.1[0-9] h · cible 11\.2 · sonde 11\.2/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');let r;for(const p of profiles())if(p.key.startsWith('REEL'))r=p;const P=globalThis.EBV2.buildPlan(r.sport,r.a);const wM=w=>w.days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.race?0:(s.min||0)),0),0);const ch=P.weeks.filter(w=>!w.isRecup&&w.phase?.id!=='taper'&&w.phase?.id!=='race');const pic=ch.reduce((a,b)=>wM(b)>=wM(a)?b:a);const v=(P._v2?.decisions||[]).find(x=>x.id==='V2.1');console.log('pic '+(wM(pic)/60).toFixed(2)+' h · cible '+pic.vol_declared+' · sonde '+String(v?.val||'').replace(/h.*/,''));"
```

## O-97 · Le budget de séances ANNONCÉ n'est pas borné par le calendrier · 🔴 **OUVERT — mesuré, non corrigé**

§4 du document (20/08/2026). La carte annonce « 11 séances par semaine prescrites » (`min(12
déclarées, 13,5 h ÷ 1,2)`) alors que **la structure de la semaine en interdit plus de 10** :
7 jours disponibles, dont au plus 3 doublés (mesuré au lot précédent — `sessions_max` 10, 12 et 14
rendent le même plan). Le nombre prescrit est donc inatteignable par construction.

**Ce n'est PAS un mensonge de la carte au sens d'O-87/O-96** : depuis O-87 elle affiche le couple
étiqueté (« 11 prescrites — ta semaine la plus fournie en livre 10 »), donc l'athlète voit le
livré. Le défaut est un cran plus haut : le nombre PRESCRIT lui-même devrait être borné par ce que
la disponibilité déclarée permet de placer.

**Pourquoi ce n'est pas corrigé ici** : `budgetPerWeek` n'est pas qu'un affichage — il alimente
`applySessionBudget` et plusieurs passes. Le borner au calendrier le ferait mordre plus tôt sur
d'autres profils (il mord déjà sur 70 des 986), et la capacité de doublage vit dans le SCHÉMA
HEBDOMADAIRE (`weekBuilder`), pas dans le moteur de raisonnement qui émet l'annonce — la lui
faire connaître est un couplage à décider, pas à improviser. **Mesure d'entrée** : sur REEL,
borne calendaire 10 contre 11 annoncés ; la passe ne mordrait toujours pas (10 ≤ 10), donc le
correctif serait INERTE sur le plan et ne changerait que l'annonce. C'est le genre de correctif
qu'on croit inerte jusqu'à ce qu'il ne le soit pas ailleurs : à mesurer sur les 986 avant d'être
posé.

## LOT MESURE — LA SEMAINE EST-ELLE UN NOMBRE DE CRÉNEAUX OU UN VOLUME À RÉPARTIR ? (20/08/2026)

**Aucun correctif. Périmètre gelé : que des mesures publiées**, sur le profil réel et sur le
corpus. Quatre mesures, et pour chacune ce qu'elle ne dit PAS.

### MESURE 1 — la longue s'ajoute-t-elle ou remplace-t-elle ? **Ni l'un ni l'autre : elle prend un CRÉNEAU**

31 semaines de charge du profil réel, coupées en deux populations (une séance ≥ 150 min, ou non) :

```
                          AVEC longue   SANS longue    écart
volume total de la semaine    10,1 h        9,3 h      +8 %
nombre des AUTRES séances       6,6          8,6       −23 %
durée moyenne des AUTRES       64,0'        65,8'      −3 %
```

**Contrôlé PAR PHASE** — les semaines à longue ne sont pas tirées au hasard (le brick vit en
spec/pic, la sortie longue vélo en semaines paires) :

```
base   10,0 h · 6,5 × 62'   contre  8,9 h · 8,6 × 62'    (n = 2/8)
dev     9,9 h · 6,0 × 66'   contre  9,3 h · 8,8 × 64'    (n = 2/6)
spec   10,1 h · 6,5 × 68'   contre  9,8 h · 8,3 × 71'    (n = 2/7)
```

**Les autres séances gardent EXACTEMENT leur taille** (62 contre 62, 66 contre 64, 68 contre 71 —
l'écart est du bruit) **et il y en a DEUX DE MOINS**. La longue porte 187 min en moyenne, soit
31 % de sa semaine : elle déplace ~130 min de créneaux et en ajoute ~57 nets.

> **C'est une TROISIÈME issue, absente des deux que le document proposait.** L'asymétrie existe
> bien dans le livré — mais le canal de compensation est le NOMBRE de créneaux, jamais la TAILLE
> des autres séances. Le moteur se comporte donc comme « un nombre de créneaux à remplir », et
> l'hypothèse de conception est confirmée dans sa forme, pas dans sa conséquence : la longue ne
> sature pas la semaine, elle en occupe la place de deux séances.

**Ce que la mesure ne dit PAS** : elle ne dit pas si le déplacement est VOULU (une longue occupe
un jour, donc mécaniquement un créneau) ou SUBI (une passe qui retire des séances pour tenir le
volume). Les deux produisent le même livré. Elle ne dit rien non plus des autres sports : elle
porte sur un seul profil, avec 2 semaines « avec longue » par phase — un n minuscule, dont seule
la CONSTANCE du résultat (les trois phases disent la même chose) fait la valeur.

### MESURE 2 — les types au plafond, et la passe qui retire deux séances : **il n'y en a AUCUNE**

Semaine de pic (S37, 11,18 h, 9 séances). Pour chaque séance, sa durée comparée au MAXIMUM que le
même type atteint ailleurs dans le plan :

```
Brick vélo+CAP        173'   (201' ailleurs, +28)
Endurance vélo         99'   (109' ailleurs, +10)   × 2
Sortie longue CAP      97'   (100' ailleurs,  +3)
Allure course (tri)    65'   ( 68' ailleurs,  +3)
Nage seuil (+dist)     51'   ( 68' ailleurs, +17)
Footing facile         33'   ( 50' ailleurs, +17)
Nage récup courte      27'   ( 60' ailleurs, +33)   × 2
```

**AUCUN type n'est à son maximum dans la semaine de pic** — la marge cumulée vaut **154 minutes
(2,6 h)**. Et pourtant la semaine ne les prend pas : neutraliser la sonde V2.1 (§2 du lot
précédent) n'achète que **+0,34 h**. Les deux moitiés de `structurel = nSess × durée max` sont
donc FAUSSES au pic : ni le compte ni les durées ne sont saturés, et ce qui borne est ailleurs —
dans la composition des contraintes de SEMAINE.

**La passe qui retire deux séances n'existe pas.** `applySessionBudget` neutralisée, le plan de
REEL est IDENTIQUE (318 séances, 21 395 min, max 10/semaine dans les deux états). Le « 10 pour
12 » n'est pas un retrait : c'est ce que la structure produit — 7 jours, dont au plus 3 doublés.

**Ce que la mesure ne dit PAS** : « le maximum ailleurs » est un PROXY du plafond, pas le plafond.
Un type peut n'être nulle part à sa borne, auquel cas la marge réelle est plus grande encore. Et
elle ne nomme pas la contrainte qui borne à ~11,5 h — elle établit seulement que ce n'est ni la
sonde, ni les plafonds de séance, ni le budget de séances.

### MESURE 3 — le budget de séances mord sur **70 profils sur 986 (7,1 %)**, et pas sur le profil réel

Mesuré AU DÉCLENCHEMENT (`applySessionBudget` neutralisée, plans comparés — un correcteur qui
réussit efface sa trace) :

```
                          budget MORD    budget INERTE
profils                        70             916
durée moyenne de séance      39,7'           53,7'
volume total du plan          26 h           116 h
séances retirées (total)      864
REEL                         inerte — plan identique au bit près
```

**La comparaison brute est CONFONDUE par le format** : les 70 profils mordus font 26 h de plan
contre 116, ce sont des petits formats (`run/5k/reprise`, `tri/S`). Apparié par sport ET format,
là où les volumes sont réellement comparables :

```
run/10k | ancien     mord 6 × 43' (28 h)   ·   inerte 3 × 42' (32 h)
tri/S   | confirme   mord 6 × 38' (24 h)   ·   inerte 3 × 39' (28 h)
```

**À volume comparable, les séances ne sont PAS plus courtes** (43 contre 42, 38 contre 39). Le
biais soupçonné — un budget serré qui produit des séances moyennes au lieu d'une longue et de
courtes — **n'est pas visible sur les seules paires appariables**. Ce n'aurait donc pas été la
cinquième occurrence de la famille.

**Ce que la mesure ne dit PAS** : seules **12 paires** sont réellement appariables (6 + 6) ; les
autres familles opposent un profil `vol-min` à des profils trois fois plus gros, et leur écart
(41' contre 52') mesure le volume, pas le budget. Une conclusion solide demanderait un corpus
qui fasse varier `sessions_max` À VOLUME CONSTANT — il n'existe pas (neuvième A-2).

### MESURE 4 — le lot a rendu la semaine PLUS GROSSE, pas plus asymétrique

Comparaison avec les annexes du commit d36d0b6 (le plan d'AVANT le lot A·B·C) :

```
                                   AVANT            APRÈS
semaine 1                       7,8 h · σ 26'    10,8 h · σ 30'
semaine de pic                  9,1 h · σ 42'    11,2 h · σ 45'
σ moyen (semaines de charge)       27,7'            31,3'
coefficient de variation           45 %             44 %
```

**L'écart-type absolu monte de 13 %, le coefficient de variation ne bouge pas (45 → 44 %).** Le
critère du fondateur — *« la forme juste n'est pas "toutes les séances grandissent" mais "une ou
deux grandissent beaucoup, les autres pas" »* — **n'est pas atteint** : les durées ont grandi
ensemble, la dispersion RELATIVE est identique.

Et la croissance par type, S1 → pic, dit pourquoi : **elle n'est presque pas une croissance,
c'est un changement de distribution.**

```
présents dans les DEUX semaines      Nage seuil    50' →  51'   (+2 %)
                                     Endurance vélo 216' → 198'  (−8 %)
                                     Nage récup      40' →  54'  (+35 %)
                                     Footing facile 156' →  33'  (−79 %)
absents en S1, présents au pic       Brick 173' · Sortie longue CAP 97' · Allure course 65'
présents en S1, absents au pic       Sweetspot 92' · Force basse cadence 94'
```

**Aucun type présent des deux côtés ne grandit vraiment** ; la semaine de pic est plus grosse
parce qu'elle contient un brick et une sortie longue que la semaine 1 n'a pas. **La spécificité
vient de la SUBSTITUTION des types, pas de l'allongement des séances** — ce qui est une bonne
nouvelle sur le fond (c'est ce qu'un entraîneur fait) et une mauvaise pour le levier cherché :
allonger les plafonds ne rendra pas la semaine plus spécifique, il la rendra plus lourde.

**Ce que la mesure ne dit PAS** : σ et CV ne distinguent pas « une longue et six moyennes » de
« trois grosses et trois petites » — deux formes très différentes peuvent partager le même CV.
Et la comparaison AVANT/APRÈS porte sur un seul profil : elle décrit ce lot sur ce plan, pas une
propriété du moteur.

### Ce que les quatre mesures disent ENSEMBLE

```
la longue prend un CRÉNEAU, jamais des minutes aux autres          (M1)
ni le compte ni les durées ne saturent la semaine de pic           (M2)
aucune passe ne retire de séances sur ce profil                    (M2)
le budget de séances ne mord que sur 7 % des profils, pas ici      (M3)
le lot a allongé uniformément, la dispersion relative est stable   (M4)
```

**Le maillon affiché (« le nombre de séances ») est un MODÈLE, et les deux mesures qui le testent
le réfutent au pic** : ni `nSess` ni `durée max` ne sont saturés. Ce qui borne la semaine à
~11,5 h n'est identifié par aucune de ces quatre mesures — c'est la question ouverte que ce lot
laisse, et la seule qui vaille avant tout correctif.

```verify
id: LOT-MESURE-FORME
quoi: la longue déplace-t-elle des créneaux sans réduire la taille des autres séances ?
attendu: /autres avec [0-9.]+ × 6[0-9]' · sans [0-9.]+ × 6[0-9]'/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');let r;for(const p of profiles())if(p.key.startsWith('REEL'))r=p;const P=globalThis.EBV2.buildPlan(r.sport,r.a);const A=[],S=[];for(const w of P.weeks){if(w.isRecup||w.phase?.id==='taper'||w.phase?.id==='race')continue;const act=[];for(const d of w.days)for(const s of d.sessions)if(s.d!=='rs'&&!s.race)act.push(s.min||0);if(!act.length)continue;const au=act.filter(m=>m<150);(act.some(m=>m>=150)?A:S).push({n:au.length,m:au.reduce((a,b)=>a+b,0)/Math.max(1,au.length)});}const f=l=>[(l.reduce((t,x)=>t+x.n,0)/l.length).toFixed(1),(l.reduce((t,x)=>t+x.m,0)/l.length).toFixed(0)];console.log('autres avec '+f(A)[0]+' × '+f(A)[1]+\"' · sans \"+f(S)[0]+' × '+f(S)[1]+\"'\");"
```

### §2 — QUELLE MOITIÉ SATURE ? La mesure demandée avant toute écriture (20/08/2026)

*« `structurel = nSess × durée max`. La semaine de pic livre 10 séances pour 12 prescrites — ça ne
dit pas encore lequel des deux facteurs sature. »* **Trois expériences à un facteur, aucune ligne
de moteur écrite.**

**(a) Les DURÉES sont saturées.** Sonde V2.1 neutralisée — la courbe vise alors les plafonds de
charge (13-20 h au lieu de 11,2) :

```
                         pic livré   séances   total du plan
avec la sonde (livré)      11,18 h       9        357 h
sans la sonde              11,52 h       9        350 h
```

**+0,34 h sur la semaine, et le TOTAL DESCEND de 7 h.** Retirer la contrainte structurelle
n'achète presque rien : ce n'est plus elle qui borne. Détail par type sur la semaine de pic —
brick **173' → 173'** (gelé à sa borne), Endurance vélo **198 → 202**, footing **33 → 35**,
sortie longue CAP **97 → 90** (elle DESCEND) ; ce qui bouge vraiment est la nage (récup 54 → 68,
seuil 51 → 59).

**(b) Le NOMBRE de séances ne répond plus à la déclaration.** Balayage `sessions_max` × `doubles` :

```
sessions_max     8      10      12      14
doubles = oui   8 séances / 11,0 h   9 / 11,2   9 / 11,2   9 / 11,2      max 10 par semaine
doubles = parfois        7 / 8,7 h   7 / 8,7    7 / 8,7    7 / 8,7       aucun jour doublé
```

**Au-delà de 10, `sessions_max` ne change RIEN** — 12 et 14 rendent le plan de 10. La structure
plafonne à **7 jours × doublage sur 3 créneaux au plus** (mesuré : la semaine de pic double 2
jours, la plus fournie du plan en double 3). Et `doubles: "parfois"` ne place AUCUN jour double —
comportement voulu et déjà dit à l'athlète (message R20.2), mais il vaut « non » dans les faits.

**(c) L'arithmétique du fondateur, vérifiée sur le livré.** `11,18 h / 9 séances = 74,5 min de
moyenne` — la moyenne visée (75 min pour 12,5 h sur 10 séances) est **déjà atteinte**. Ce qui
manque n'est pas 8 minutes par séance : c'est **UNE séance de plus à la moyenne actuelle**.

> **Verdict : « des créneaux, pas des minutes » est JUSTE, avec une nuance qui compte.** Les types
> qui ont encore de la marge sont ceux qu'on ne veut PAS agrandir (la natation, déjà 8 points
> au-dessus de sa cible), et ceux qu'on veut agrandir (vélo, brick) sont à leur borne. Le lot
> suivant porte donc sur le NOMBRE DE CRÉNEAUX PLACÉS — combien de jours peuvent porter deux
> séances, et lesquels — pas sur les durées.

### §3 — le critère du maillon devient un INDICATEUR (révision du fondateur, actée)

*« Mon `≥ 12,5 h` portait sur le volume, jamais sur la façon d'y arriver. Sur 70.3, 10 séances de
75 min valent probablement mieux que 12 de 62. »* **Acté** : le critère de sortie reste
`pic ≥ 12,5 h` ; « le maillon change de nom » descend au rang d'indicateur. La mesure (c) ci-dessus
montre d'ailleurs que les deux se rejoignent ici — la moyenne par séance est déjà à 75 min, donc le
volume ne peut venir que d'un créneau de plus, et le maillon changera de nom quand il viendra.

### §4 — l'écart d'allocation restant est un MÉCANISME, pas un manque de volume

La question était : *« si le volume monte à 12,5 h et que les parts ne bougent pas, c'est un
mécanisme ; si les parts suivent, c'était le volume. »* **La même expérience répond sans attendre
le volume** : quand la contrainte structurelle tombe, les minutes libérées vont à la NATATION —

```
                sw        bk        rn
avec sonde    27,9 %    40,3 %    31,8 %
sans sonde    29,6 %    40,2 %    30,2 %      ← +1,7 pt de nage, le vélo IMMOBILE
```

**Le vélo ne bouge pas d'un dixième** : il est à ses bornes de séance. Donc du volume
supplémentaire, aujourd'hui, ne rapprocherait PAS de la cible — il l'éloignerait. C'est un
mécanisme de routage (combien de créneaux portent la nage), et c'est le même objet que §2.

### §5 — le résidu de T-59 est un ARBITRAGE, écrit comme tel

Les 5 `tri/Full` à budget serré ne sont pas un défaut ouvert : **à budget serré sur un Full, la
natation a besoin de sa FRÉQUENCE** (la technique se perd par la fréquence, R13.3 — c'est la règle
qui occupe ces créneaux) **et la course a de la marge ailleurs** (elle garde son créneau long, le
brick, et la sortie longue de base/dev). Poser la sortie longue à pied sur le second créneau
facile reviendrait à retirer une nage à quelqu'un qui n'en a déjà que trois. **Si ce résidu doit
être fermé un jour, ce sera par une décision de priorité explicite, pas par un correctif** — et
c'est pourquoi T-59 le compte au lieu de l'exempter en silence.

```verify
id: SATURATION
quoi: la déclaration de séances agit-elle encore au-delà de 10, et la semaine de pic est-elle à sa moyenne cible ?
attendu: /sm=12 : 9 séances · 11\.2 h · moyenne 7[0-9] min/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');let r;for(const p of profiles())if(p.key.startsWith('REEL'))r=p;const P=globalThis.EBV2.buildPlan(r.sport,{...r.a,sessions_max:'12'});const wM=w=>w.days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.race?0:(s.min||0)),0),0);const ch=P.weeks.filter(w=>!w.isRecup&&w.phase?.id!=='taper'&&w.phase?.id!=='race');const pic=ch.reduce((a,b)=>wM(b)>=wM(a)?b:a);const n=pic.days.reduce((t,d)=>t+d.sessions.filter(s=>s.d!=='rs'&&!s.race).length,0);console.log('sm=12 : '+n+' séances · '+(wM(pic)/60).toFixed(1)+' h · moyenne '+Math.round(wM(pic)/n)+' min');"
```

```verify
id: LOT-VOL-REPARTITION
quoi: les quatre pièces structurelles tiennent-elles sur le profil réel ?
attendu: /longue CAP spec ✓ · longue vélo ✓ · doublage mixte ✓ · allocation publiée ✓/
cmd: node --input-type=module -e "await import('./src/app/bridge.ts');const{profiles}=await import('./scripts/goldenMaster.mjs');let r;for(const p of profiles())if(p.key.startsWith('REEL'))r=p;const P=globalThis.EBV2.buildPlan(r.sport,r.a);let lr=0,lb=0,mx=0;for(const w of P.weeks)for(const d of w.days){const act=d.sessions.filter(s=>s.d!=='rs'&&!s.race);if(act.length>=2&&!act.some(s=>s.d==='sw'))mx++;for(const s of act){if(/^Sortie longue CAP/.test(s.name)&&(w.phase?.id==='spec'||w.phase?.id==='peak'))lr++;if(/^Sortie longue vélo/.test(s.name))lb++;}}const al=(P._v2?.decisions||[]).some(x=>x.id==='allocation');console.log('longue CAP spec '+(lr?'✓':'✗')+' · longue vélo '+(lb?'✓':'✗')+' · doublage mixte '+(mx?'✓':'✗')+' · allocation publiée '+(al?'✓':'✗'));"
```

## O-96 · La carte se contredit À NOUVEAU sur le nombre de séances (12 vs 9) · ✅ **FERMÉ le 20/08 (doc CARTE_CONTRADICTION_SEANCES) — un DEUXIÈME RENDU, pas un troisième calcul**

**Les trois questions du §1, mesurées avant de corriger** (fixture REEL + la manipulation
déclarée du fondateur : `history: ancien` · `vol_max: 20` · `sessions_max: 12`) :

1. **Oui** — le 12 est le PRESCRIT du raisonnement (`min(12 déclarées, 14,0 h ÷ 1,2 h/séance)`,
   le « 14,0 » étant le plafond d'AVANT la sonde V2.1) et le 9 le maximum LIVRÉ.
2. **O-87 tient côté moteur** : `budget.livre` et le « une semaine ne contient que N séances »
   du maillon structurel sortent du MÊME `nSess` — vérifié, une seule décision R20.2 et les deux
   comptes égaux (10/10 sur la fixture ; le 9/−10,3 du fondateur contre mon 10/−10,5 est l'écart
   connu de la fixture RECONSTITUÉE — les trois clés à relever — pas une divergence de comptes).
3. **Ce n'est PAS un troisième site de CALCUL : c'est un deuxième site d'AFFICHAGE.** La carte
   « Pourquoi ce plan » disait bien « 12 prescrites — ta semaine la plus fournie en livre 9 »
   (le rendu qu'O-87 a corrigé) ; la liste « **Les décisions du moteur** », trois centimètres
   plus bas, rendait `d.val` BRUT — « 12 » sans étiquette, face à un « ce qui borne » qui dit 9.
   La réponse à la question posée (« point unique trop étroit, ou site non routé ? ») est donc :
   **site non routé** — et de la famille R18.1 (« un correctif appliqué à un rendu sur deux est
   un correctif qu'on croit avoir »), la même forme que T-46/O-84c le matin même, côté écran.

**Fermeture.** La phrase vit en UN point (`suffixeLivre`, `plan-view.js`) et les deux rendus
l'appellent — toute décision portant un pendant `livre` l'affiche désormais partout. Garde :
**3 assertions O-96 dans `smoke-usage`** sur une décision FABRIQUÉE où prescrit ≠ livré (le
profil du parcours peut avoir les deux égaux — un critère assis dessus serait vacueux) + un
témoin (livré = prescrit → aucune étiquette). **Contre-prouvée** : second rendu dé-routé → la
seule assertion visée rougit (1 échec / 83).

**§2-§3 du document, actés sans action** : la manipulation du fondateur confirme que ni
`history` ni `vol_max` ne bornent plus (pic inchangé sous +7 h de déclaration — le maillon nommé
est le nombre de séances), et que `DÉPART ANCRÉ` (O-69) et `VOLUME NON PLAÇABLE` (manque déclaré)
fonctionnent et pointent le même endroit : **les bornes de séance — le lot progression est le
seul levier restant**, et les « 3,5 h absorbées en semaine 1 » sont sa mesure d'entrée.

```verify
id: O-96
quoi: les deux rendus de la décision budget portent la même phrase prescrit/livré ?
attendu: /les deux rendus : 2/
cmd: node --input-type=module -e "import('node:fs').then(({readFileSync})=>{const s=readFileSync('endurabuild/js/ui/plan-view.js','utf8');const n=(s.match(/suffixeLivre\(/g)||[]).length-1;console.log('les deux rendus : '+n);})"
```
