# B-17 §15 — D1 et D2 fermés et mesurés · un TROISIÈME défaut, D3, les domine tous les deux

**Branche** `fix/moteur-physio` · **commits** `ff86ecb` → `727c3ed` · aucun PR, rien de fusionné
**Date** 16/08/2026 · **Périmètre** celui que tu as verrouillé au §14 : les deux correctifs, les
gates, le golden, les E2E. Aucun ajout.

---

## 0. En une page

| | |
|---|---|
| **D1** — au plus une nage continue par semaine | ✅ **fermé**, départage explicite écrit |
| **D2** — livré == cible au mètre près | ✅ **fermé**, 0 écart sur 24 paliers |
| **D3** — le gate lit une réponse que le produit ne collecte jamais | 🔴 **ouvert — ton arbitrage** |

```
gates            24 VERTS · 4 ROUGES  — audit:v1 · audit:v2 · audit:r13 · audit:sensibilite
                 les trois premiers redeviennent VERTS quand le seul rabattement est
                 neutralisé, tout le reste en place. Les quatre sont D3.
E2E              25 suites · 24 vertes d'un bloc · smoke-usage 3/3 verte (80 assertions)
golden           147 écarts / 949 · NON recapturé          (D3)
sceau T-27       S1 3 · S4 341 · S5 520 contre {4,353,513} · NON re-épinglé  (D3)
registry:check   61 reproduisent · 2 flips · 3 commandes cassées — tous confirmés
                 à la main, aucun n'étant un défaut réparé
```

`858c0c5` **garde son avertissement** : le lot n'est pas fusionnable en l'état, et la raison n'est
pas les deux correctifs.

---

## 1. D2 — le §14 attendait deux correctifs, il n'en fallait qu'un, et c'est mesuré

Tu demandais de vérifier les deux moitiés :

```
· le bloc est exclu des passes de redistribution   (patron I14b)
· ET blockBounds ne réécrit pas son plancher       (cas O-26)
```

**La seconde suffit, et elle explique la première.** Le bloc portait déjà `floor = cap = cible` ;
`blockBounds` le rendait inerte en le traversant :

```ts
const fl = s.long ? 800 : Math.min(b.bnd.floor, r.beginner ? 600 : 750);  // C24
```

Un plancher déclaré de **3 800 m ressortait à 750**. Une fois `blockBounds` rendant le plancher tel
quel, l'intervalle est dégénéré et **aucune passe aval ne peut plus déplacer le bloc** : l'exclusion
est obtenue PAR la borne, il n'y a pas de seconde liste à tenir.

Le marqueur est **`bnd.pinned`**, pendant côté PLANCHER de ce que `bnd.hard` fait au plafond. Il
fallait les deux : la décision d'audit v6 (D3-D7/D10, « les planchers de séance ne gagnent plus
contre la courbe ») est **juste** tant que le plancher n'est qu'un minimum de dignité, et **fausse**
quand la dimension EST le stimulus — même raisonnement qu'I14 sur la durée d'une répétition
d'intervalle. Une nage continue de 3 800 m ramenée à 1 870 n'est pas une séance plus facile, c'est
une autre séance.

*Pas de test `floor === cap`* : ce serait un critère syntaxique qui capterait par accident tout bloc
dont les deux bornes coïncident.

---

## 2. D1 — le départage est écrit, et ton observation du §14 est tranchée

Tu notais, sans demander de l'investiguer : *« que `facile2` soit invoqué deux fois pour une même
semaine est peut-être normal — si le créneau est une catégorie et non une position »*.

**Mesuré sur le plan livré, pas déduit du gabarit : `facile2` est une CATÉGORIE.**

```
29 semaines sur 308 portent DEUX jours `facile2`
(le gabarit « quotidienne » de weekBuilder le déclare deux fois)
```

Le départage est **`slotIdx === 0`** — le premier jour du créneau **en ordre calendaire** —, calculé
là où la semaine entière est visible. Les jours sont datés par construction (`d.date = start + i × 1 j`),
donc l'ordre ne dépend d'aucune liste intermédiaire : c'est l'index stable que tu demandais, jamais
l'ordre d'itération, qui serait déterministe par accident.

---

## 3. L'expérience est contrôlée — un facteur à la fois

```
état                      D1 (semaines à doublon)   D2 (paliers hors cible)
858c0c5 (partiel)                    7                    19 / 31
+ pinned seul                        7                     0 / 31   ← D2 fermé, et lui seul
+ pinned + slotIdx                   0                     0 / 24
```

**Ton critère d'acceptation, tenu exactement.** Full/36, Full/42, Full/50 :

```
S21/S24/S29 · cible 1900 m · livré 1900 m  ✓
S23/S27/S33 · cible 2650 m · livré 2650 m  ✓
S26/S31/S38 · cible 3400 m · livré 3400 m  ✓
S28/S34/S42 · cible 3800 m · livré 3800 m  ✓
```

Strictement croissants, dernier palier = distance de course au mètre près.

**Trois cassures, trois rouges**, sur la sonde comme sur `T-06` :

```
cassure                                   sonde            T-06
`pinned` neutralisé                       D2 16/24  ✖      ROUGE
départage `slotIdx` retiré                D1 7      ✖      ROUGE
départage décalé d'un cran                VACUEUX   ✖      ROUGE
```

`T-06` passe **rouge → vert** dans le même commit (cliquet), et il est **RÉÉCRIT, pas basculé** :
ses deux écritures précédentes étaient SYNTAXIQUES, et la seconde serait restée rouge après B-17
livré, la règle ne portant aucun des mots qu'elle cherchait (`prereq`, `nage_continue`). Un test qui
exige un VOCABULAIRE au lieu d'un COMPORTEMENT échoue dans les deux sens. Il observe désormais le
plan livré.

---

## 4. D3 — le gate lit une réponse que le produit ne collecte jamais

**Trouvé en vérifiant, pas en relisant.** `longest_swim_m` et `milieu` ont été étendus au triathlon
dans le SCHÉMA (`858c0c5`) ; **aucune des deux questions n'est POSÉE à un triathlète**.

```
endurabuild/js/ui/steps.js — l'étape « objectif » a trois branches :
   trail    → distance, D+, technicité, nuit, barrière
   swimrun  → …, « La plus longue nage (m) », …          ← la seule qui la pose
   AUTRES   → « Quel objectif ? » + date                 ← le triathlon est ici

endurabuild/js/config.js — `milieux` n'est déclaré que sur `swim` :
   l'étape « milieu » n'existe pas pour un triathlète.
```

Or le module décide — délibérément, arbitré, écrit — que **« je ne sais pas » ne satisfait pas le
gate** (§8/§10, justifié par O-17 : qui ne sait pas ce qu'il a nagé de plus long est dans le membre
« ne peut pas évaluer le risque »). La CONSÉQUENCE n'avait jamais été mesurée :

```
profils tri du golden : 148 · RABATTUS : 117 (79,1 %)
   Full → S   56        M → S   31        70.3 → S   30
aucun ne déclare `longest_swim_m` — la question est NOUVELLE et, pour un tri, INEXISTANTE.
```

**Ce n'est pas un artefact de fixture.** Un triathlète réel ne peut pas répondre : *tout* inscrit à
un Ironman recevrait un plan de sprint. Et `poolOnlyNotice`, dont ton §12 a arbitré la restriction
aux formats M+, exige `milieu === "bassin"` — jamais renseigné en tri : **le message est du code
mort dans le produit**.

### Les quatre gates rouges sont D3, et lui seul

Isolé par expérience contrôlée (le rabattement neutralisé, tout le reste en place) :

```
gate                cf392af (avant B-17)   858c0c5   aujourd'hui   sans le rabattement
audit:v1                   VERT             ROUGE      ROUGE            VERT
audit:v2                   VERT             ROUGE      ROUGE            VERT
audit:r13                  VERT             ROUGE      ROUGE            VERT
audit:sensibilite          VERT             ROUGE      ROUGE            ROUGE (tri/milieu)
```

Les signatures le disent aussi : `audit:v1` tombe sur **C26d chez `tri/Full/*/debutant`** et
`audit:r13` sur **`R13.6-P1 — Full 59 sem : taper=1 peak=5`**, c'est-à-dire des plans de **SPRINT**
audités contre des attentes de **FULL**. `audit:sensibilite` porte la seconde moitié : `tri/milieu`
inerte — famille **R20.1 dans sa forme MIROIR** (« une clé consommée doit être collectable »).

### Ce que je n'ai délibérément PAS fait

- **Golden NON recapturé** (147 écarts / 949) : la dérive est gouvernée par une réponse que le
  produit ne peut pas recevoir. Photographier cet état l'enregistrerait comme la référence.
- **`SCEAU_ATTENDU` NON re-épinglé** : même raison. Les trois valeurs sont celles de `cf392af` ;
  T-27 redeviendra vert de lui-même quand D3 sera arbitré, et reste d'ici là le détecteur le moins
  cher de sa présence.
- **Les questions NON ajoutées** : tu as verrouillé le périmètre deux fois. Et le choix ci-dessous
  n'est pas mécanique — l'issue (b) renverse ce que tu as arbitré sur O-17.

### Les trois issues — c'est ton arbitrage

```
(a) POSER les deux questions dans le questionnaire tri, et décider si elles sont
    OBLIGATOIRES (le swimrun l'exige : `valid()` réclame `swim_continuous`)
      → mécanique, une entrée de formulaire ; ne renverse aucune décision
      → reste à trancher : obligatoire ou optionnelle, et que vaut l'absence

(b) ne rabattre que sur une continuité DÉCLARÉE insuffisante, l'absence n'étant
    plus un refus
      → RENVERSE la décision écrite au §8/§10, arbitrée sur O-17

(c) rabattre, mais d'un seul cran plutôt que jusqu'au sprint
      → adoucit sans résoudre : un Full non renseigné devient un 70.3, toujours
        gouverné par une réponse impossible à donner
```

---

## 5. Mes fautes d'instrument — cinq, dont quatre à moi

### 5.1 · La sonde a rendu « LES DEUX CRITÈRES SONT TENUS » sur un plan qui n'était pas le sien

`scripts/sondeB17.mjs`, première écriture : `longest_swim_m: "800"` pour les quatre formats. À
1'50/100 m cela vaut 14,7 min, ce qui satisfait le **sprint et aucun autre** : les douze lignes du
balayage mesuraient toutes un `tri/S` à 750 m, D1 et D2 sortaient verts, et **Full — le format que
ton critère d'acceptation nomme — affichait ZÉRO palier**.

C'est la **SECONDE fois dans ce seul ticket** (`mesureB17.mjs` balayait des horizons où le Full
était refusé), et c'est le test de dépistage de la **règle 15** : *un résultat saturé accuse
l'instrument* — ici « 750 m » sur toutes les lignes. La sonde asserte désormais sa prémisse et
écarte toute ligne dont le format a été rabattu.

> Sans cette correction, j'aurais rendu D1 et D2 fermés sans les avoir regardés, et **D3 serait
> resté invisible**.

### 5.2 · …puis elle est sortie VERTE sur ZÉRO palier

Contre-preuve n° 3 (décaler le rang de départage d'un cran) : la prescription tombe à zéro palier,
et la sonde rendait `D1 = 0 · D2 = 0 / 0` sous un verdict « LES DEUX CRITÈRES SONT TENUS ». Deux
compteurs d'ANOMALIES sont trivialement satisfaits par l'absence de la chose comptée.

C'est la **règle 19** posée le matin même — *quel est le correctif le moins coûteux qui ferait
passer ce test ?* Ici : **effacer la fonctionnalité**. Un critère de non-vacuité est ajouté. `T-06`,
lui, portait déjà `if (!paliers.length)` et sortait rouge sur les trois cassures : c'est la sonde
d'exploration qui manquait le garde-fou, pas la garde permanente.

### 5.3 · Mon bloc de registre a basculé en « ne reproduit plus » — faux, deux fois

Son `attendu` portait de la **prose** là où la convention veut le **jeton** que la `cmd` écho. D'où
le flip — *un flip qui se lit comme un défaut réparé*, la forme exacte que la **règle 17** dit de
confirmer à la main. Vérifié à la main : la commande rend bien `B17-D1-D2-TENUS`.

La seconde erreur ne se corrige pas en changeant le jeton : **ce registre recense des défauts
OUVERTS**, où « reproduit » signifie *le défaut est toujours là*. Un bloc dont l'attendu est « le
correctif tient » inverse cette sémantique — le jour où il rougirait, il annoncerait une bonne
nouvelle. **Bloc retiré** ; la garde de D1/D2 est `T-06`.

### 5.4 · J'ai tué une passe E2E et attribué son échec au produit

J'ai reconstruit le bundle **en pleine exécution** des E2E (pendant les contre-preuves), ce qui
rendait la passe non interprétable. Je l'ai tuée et relancée — mais le `pkill` a laissé un serveur
orphelin, d'où un `EADDRINUSE` sur le port 8596 dans `smoke-usage`. Rejouée seule, elle a échoué sur
`element is not stable`… **coupé par mon propre délai de shell de 2 min** ; le message « Target page
has been closed » EST la trace de cette coupure.

**Règle 18 appliquée** : rien attribué avant trois tirages. `smoke-usage` : **3/3 verte, 80
assertions**.

### 5.5 · Deux flips du registre qui ne sont pas les miens, et qui ne sont pas des défauts réparés

- **O-6 — faux positif.** Son bloc cherchait le littéral `0 écart` dans `golden:verify`, or le
  golden porte 147 écarts *parce que D3 n'est pas arbitré*. Le correctif d'O-6 tient : la ligne
  « 4 refus d'entrée typé(s) — comportement attendu » est là. Le bloc mesurait une grandeur
  **voisine** de celle qu'il nomme — la propreté du golden, pas la distinction refus/erreur.
  Réécrit sur la propriété.
- **O-40 — commande cassée AVANT ce lot.** Jeton `LE PLAFOND MORD` écrit en `c1a595e` ; `a93d5c7` a
  ensuite **corrigé** la mesure et le verdict est devenu `LE PLAFOND EST DÉCLARATIF`, sans que le
  bloc suive. **Règle 17 dans son autre forme** : une mesure corrigée laisse derrière elle un bloc
  périmé, qui se lit comme un registre pointant dans le vide.
- **O-37 et T-27b — cassées par une DÉCISION**, pas par une dérive : elles dépendent de `✓ T-27`,
  rouge parce que `SCEAU_ATTENDU` n'est délibérément pas re-épinglé. Laissées telles quelles — les
  « réparer » masquerait ce que T-27 signale.

---

## 6. Où regarder

| Fichier | Ce qu'il porte |
|---|---|
| `src/generator/planGenerator.ts` | `blockBounds` — la branche `bnd.pinned`, avec sa justification |
| `src/harness/v1Harness.ts` | le champ `pinned` sur `bnd`, et pourquoi il fallait le pendant de `hard` |
| `src/sports/tri/index.ts` | la transformation B-17, prédicat `slotIdx === 0`, les deux défauts commentés |
| `src/generator/weekBuilder.ts` | le calcul du rang dans le créneau — le seul endroit où la semaine est visible |
| `src/generator/sessionLibrary.ts` · `src/sports/registry.ts` | `slotIdx` transporté jusqu'au module de sport |
| `scripts/lotPhysio.mjs` | `T-06` réécrit sur le plan livré · `SCEAU_ATTENDU` non re-épinglé, avec sa raison |
| `scripts/sondeB17.mjs` | la sonde D1/D2 — `npm run sonde:b17` |
| `scripts/sondeB17rabat.mjs` | le rayon de D3 — `npm run sonde:b17rabat` |
| `BUGS_OUVERTS.md` « B-17 §15 » | tout ce qui précède, avec les blocs `verify` |

---

## 7. La seule chose qui attend

**D3 — issue (a), (b) ou (c).** Le reste du lot est vérifié et poussé.
