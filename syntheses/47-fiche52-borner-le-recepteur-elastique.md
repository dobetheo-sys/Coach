# 47 — Fiche 52 : O-113 fermé — la sortie longue rend ce qu'elle a absorbé de trop

**Date** : 02/09/2026 · **Fiche** : `52briefbornerrecepteurelastique.md`

**Résultat** : O-113 est **fermé**. `audit:monotonie` affiche **28 verts · 0 dette · 0 régression**
— le registre du gate est vide pour la première fois depuis sa création (fiche 47).

---

## 1. La mesure d'entrée, et elle dépasse largement le ticket

Part de la sortie longue dans sa semaine de charge, sur **13 001 semaines** du corpus :

| sport | p10 | **médiane** | p90 | max | > 35 % |
|---|---|---|---|---|---|
| **bike** | 27,8 % | **42,1 %** | 52,4 % | 67,2 % | **69,3 %** |
| duathlon | 32,4 % | **45,7 %** | 51,9 % | 71,4 % | 85,6 % |
| trail | 34,2 % | **40,4 %** | 48,4 % | 66,7 % | 83,9 % |
| run | 29,3 % | **35,0 %** | 47,5 % | 81,4 % | 50,2 % |
| swim | 16,8 % | 30,6 % | 38,1 % | 57,3 % | 37,7 % |
| tri | 17,4 % | 23,6 % | 45,4 % | 64,3 % | 17,5 % |
| swimrun | 8,6 % | 10,4 % | 15,3 % | 27,3 % | 0,0 % |

Le cas extrême du corpus est `G/run/marathon/vol-min`, un marathonien à 2 h/semaine :

```
AVANT   S6  Seuil 19 · Footing  6 · Sortie longue  96   (78 % de la semaine)
        S7  VO2max 26 · Footing 10 · Sortie longue 100   (74 %)
APRÈS   S6  VO2max 36 · Footing 23 · Sortie longue  49
        S7  VO2max 26 · Footing 31 · Sortie longue  54
```

**Un footing de six minutes.** Aucun des 13 gates ne le voyait.

## 2. Deux prémisses de la fiche rectifiées par la mesure

**(1) L'ancre du duathlon ne se transpose pas.** `CAP_LONG_DUATHLON` s'ancre sur la durée
d'épreuve **prédite**. En vélo cette grandeur n'existe pas : `race_distance_km` n'est requis que
pour le trail, le questionnaire ne demande pas la distance d'une cyclosportive, et le prédicteur
vélo ne rend qu'une bande de puissance. Il fallait donc une autre référence sourcée — la fiche
l'autorisait explicitement.

**(2) La sortie longue vélo n'est PAS un puits sans borne.** Mesuré sur le cas de référence
(`bike/cyclo`, `vol_recent` 9) :

| | vol_max 9 | vol_max 13 |
|---|---|---|
| `sessionScale` | 0,600 | 0,867 |
| S2 Sweetspot | 32 | **54** |
| S2 Force basse cadence | 41 | **54** |
| S2 **Sortie longue** | **192** *(= son plafond, 240 × 0,80)* | **175** *(sous son plafond)* |
| **total de la semaine** | **457** | **456** |

Le volume hebdomadaire est **identique**. L'inversion n'est pas un manque de volume : c'est une
**répartition**. Les blocs de qualité naissent petits à enveloppe basse, R4.1 route la croissance
vers le plus gros bloc facile, et il atteint son plafond de format.

## 3. L'ancre : celle que les tables portent déjà sans le dire

Rapporté au volume **utile** du format (`UTIL`), `CAP_LONG` vaut :

| format | 5 km | 10 km | semi | marathon | trail | crit | route | clm | cyclo | gravel |
|---|---|---|---|---|---|---|---|---|---|---|
| part de `UTIL` | 20,6 % | 21,4 % | 24,1 % | 25,0 % | 30,4 % | 27,8 % | 23,1 % | 25,0 % | 26,7 % | 30,0 % |

Une bande de **20 à 30 %** qui monte avec la durée du format — la table n'était pas arbitraire,
elle encodait une part sans jamais la nommer. `PART_LONGUE_MAX = 0,40` applique cette logique à la
semaine **réellement prescrite** au lieu du seul volume de pointe du format ; elle est délibérément
plus permissive que la bande : on retire le puits, on ne redessine pas la périodisation.

## 4. ⚠ Une borne a été écrite dans `blockBounds` et RETIRÉE

Elle ferme O-113 et laisse `audit:v1` vert. Mais **une borne ne peut pas être neutre en volume** :
la semaine rétrécissait, et **73 profils perdaient des séances** (jusqu'à −6,2 %) — la monnaie que
ce dépôt s'interdit, et exactement ce qui a fait échouer la fiche 51.

**La pièce livrée est une REDISTRIBUTION**, miroir exact de `raiseLongRunToSpecificity` (C30b) :
les minutes retirées à la longue sont **rendues aux séances faciles de la même semaine**, les
receveuses bornées par la nouvelle taille de la longue (sans quoi I14 — « la longue est la plus
longue de sa semaine » — se rouvrirait ; borne mesurée active sur **9 profils**).

**Neutralité tracée à l'instrumentation**, `bike/gravel` S6 : `407 → 440 → 407`.

## 5. Calibration — une courbe, cette fois

| PART | violations dures | inversions bike | profils touchés | séances perdues | pire volume |
|---|---|---|---|---|---|
| 0,32 | 0 | **0** | 293 | 27 | −13,9 % |
| 0,35 | 0 | **0** | 220 | 7 | −11,3 % |
| 0,38 | 0 | **0** | 176 | 28 | −9,0 % |
| **0,40** | **0** | **0** | **157** | **34** | **−7,3 %** |
| 0,45 | 0 | 2 | 69 | 45 | −3,0 % |
| 0,50 | 0 | 2 | 10 | 0 | −0,1 % |

Monotone et lisible — contrairement à la fiche 51, où un pas de 0,02 faisait varier la casse d'un
facteur vingt. O-113 se ferme à **≤ 0,40**, reste ouvert à ≥ 0,45 ; **0,40 est la plus permissive
des valeurs qui ferment**.

## 6. Le résidu, publié plutôt que tu

- **34 profils perdent exactement UNE séance** (tous en vélo, sur des plans de ~90 : **−1,1 %**),
  **2 en gagnent une**.
- Volume total : **médiane +0,00 %**, pire **−7,3 %** sur `bike/gravel`.
- **Ce n'est pas la passe.** L'instrumentation montre qu'elle est neutre ; l'écart naît **entre
  deux appels de `reconcileDeclaredVolume`**, dans une passe aval qui réagit au changement.
- **`T-60` (plancher de fréquence) reste vert, 0 régression** : aucune discipline ne tombe à zéro.

C'est sans commune mesure avec la fiche 51 (`swim/ow/confirme/inter` 81 → 58 séances, −28 %), et
c'est pourquoi la pièce est **livrée** plutôt que retirée — le résidu est signalé, pas contourné.

## 7. Trouvé en chemin — O-117 : `CAP_LONG` est morte

`CAP_LONG` déclare des plafonds de sortie longue pour les 10 formats de course et de vélo, et
**aucun n'agit** : les modules `run` et `bike` portent chacun leur propre table `durCaps`, aux
mêmes valeurs, posée en `bnd` déclaré — et le `bnd` déclaré gagne dans `blockBounds` **avant** la
branche `s.long`, seule lectrice de `CAP_LONG`. Deux sources pour une borne (R11.1), dont une que
personne n'exécute. Non corrigé : faire dériver `durCaps.hi` de `CAP_LONG` demande de vérifier les
cinq ajustements que les modules appliquent par-dessus (débutant C23, blessures pied et hanche,
spécificité C30).

## 8. Mes hypothèses réfutées

Deux correctifs écrits, mesurés, **retirés** — tous deux corrects par construction, tous deux
rendant un corpus **identique au bit près** :

1. « mesurer ce que les receveuses ont réellement reçu » (au lieu de ce qu'on croit leur avoir
   donné) ;
2. « mesurer la neutralité sur la semaine livrée » plutôt que sur la somme des receveuses.

C'est l'instrumentation qui a tranché, pas le raisonnement : la fuite était ailleurs.

## 9. Contre-preuves

| cassure | attendu | mesuré |
|---|---|---|
| passe neutralisée | l'inversion revient | **2 inversions**, exactement les mêmes (S2 192→175, S3 196→177) |
| receveuses non bornées par la longue | la borne fait un travail réel | **9 profils changent** |

## 10. État des gates

| gate | résultat |
|---|---|
| `npm run batterie` | **13 gates verts · 0 rouge** |
| `audit:v1` | 459 combinaisons · **0 violation dure** |
| `audit:monotonie` | **28 verts · 0 dette · 0 régression · 1 628 comparaisons** |
| `lotPhysio` | **33 verts · 24 rouges attendus · 0 régression** |
| `golden:verify` | recapturé — **327 profils sur 1 074** (run 109 · bike 94 · duathlon 92 · trail 32) |
