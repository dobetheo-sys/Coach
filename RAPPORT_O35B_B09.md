# O-35 (2ᵉ moitié) + B-09 — un même lot, une seule recapture (14/08/2026)

**Réponse à `B02_DEBLOQUE_APRES_B02A.md` §7.2/§7.3.** Le §7.1 (B-02) est traité à part dans
`RAPPORT_B02_PONDERATION.md`.

---

## Ce que la seconde sonde a trouvé, et ce n'était pas la sonde

Ta consigne : « faire mesurer à V2.1 ce que la semaine RENDUE livre » avec la résolution B-25
(une passe, jamais de point fixe). Je l'ai écrite ainsi — re-sonde sur un CLONE SATURÉ de la
semaine livrée, ce que cette semaine POURRAIT porter si chaque séance allait à son plafond
(mesurer les minutes livrées elles-mêmes rendrait l'identité vraie par construction, donc vide).

Sur le nageur débutant, le plafond structurel passe de **2,03 h à 0,85 h** : la sonde disait
bien n'importe quoi. Mais T-25 est monté de 368 à **432**. En instrumentant, la cause est
ailleurs et elle est plus grosse.

### `reconcileDeclaredVolume` — le point fixe — tourne à la ligne 3322. Le diagnostic était à 2998.

Tout le bloc « C6 + R20.2 » s'exécutait **avant** le point fixe, c'est-à-dire avant I14, C26c/d,
le rattrapage d'I14b, C30b, les planchers et la fréquence. Le pic annoncé et toute la chaîne
d'explication décrivaient donc **l'avant-dernier état du plan**. C'est la leçon que ce dépôt a
payée onze fois sur des GARANTIES ; cette fois c'est le DIAGNOSTIC qui était au milieu du
pipeline.

Le diagnostic est déplacé après le point fixe, et `volPeak` est recompté sur les séances
telles qu'elles sont livrées (`w.vol` est un instantané figé à la construction de la semaine).

### Ce que ça découvre : 350 profils sur 945 annonçaient un pic qu'ils ne livrent pas

| | |
|---|---|
| profils dont le pic annoncé change | **350 / 945 (37 %)** |
| sens | **350 baisses, 0 hausse** — l'erreur allait toujours dans le même sens |
| écart relatif médian | **7,1 %** |
| pire cas | `run/10k/ancien/debutant` : **4,9 h/sem annoncées, 3,4 livrées (−30,6 %)** |
| répartition | run 83 · duathlon 85 · bike 69 · tri 60 · swim 20 · swimrun 19 · trail 14 |

Ce n'est pas un rangement de diagnostic : c'est le chiffre que l'athlète lit comme « son pic »,
faux d'un tiers dans le pire cas, et **toujours vers le haut**. La doctrine V2.1 dit
« promettre davantage serait mentir » ; le moteur le faisait sur 37 % des profils sans le savoir.

### T-25 monte à 608, et c'est le même mécanisme que tu as nommé au §5

Rendre `volPeak` honnête ÉLARGIT l'écart avec les plafonds énumérés — parce que ceux-ci
décrivent eux aussi un état d'avant le point fixe. La compensation qui tenait l'identité
« presque vraie » était que les deux membres étaient périmés ensemble. **608 est le taux
honnête.** Ce qui manque à l'énumération est désormais nommé sans ambiguïté : **ce que le
point fixe retire** (I14, C26c/d, planchers, fréquence) n'est porté par aucun maillon.

C'est la condition de sortie d'O-35, réécrite au registre. Je ne l'ai pas traitée dans ce lot :
elle demande d'instrumenter `reconcileDeclaredVolume` pour qu'il DÉCLARE ce qu'il retire et
pourquoi — un chantier à part entière, pas une ligne.

---

## B-09 — la moitié qui tient, et la moitié qui ne peut pas être écrite telle quelle

### ✅ Facteur indexé sur l'historique

`SWIM_TIME_FACTOR_BY_HISTORY = { reprise 0,45 · confirme 0,60 · ancien 0,70 }`, avec
`swimTimeFactorOf(history)` comme point unique et le repli sur la valeur la plus PRUDENTE
(0,45) quand l'historique est inconnu.

**Rayon mesuré sur le golden : 42 profils de nage, ±6 %.** Presque inerte — et la raison est
connue : les 945 profils déclarent tous `vol_max: 10`, donc ce sont les TABLES qui bordent, pas
la déclaration (famille A-2, septième occurrence). Mesuré là où le facteur mord réellement,
c'est-à-dire quand l'athlète déclare peu :

| `vol_max` déclaré | reprise | confirme | ancien |
|---|---|---|---|
| 3 h de piscine | pic **1,2 h** | **1,6 h** | **1,7 h** |
| 5 h | 1,8 h | 1,8 h | 1,8 h |
| 8 h | 1,8 h | 1,8 h | 1,9 h |

À 3 h déclarées, l'écart entre un nageur en reprise et un ancien compétiteur est de **+42 %** —
c'est exactement la population que le ticket visait, et le golden ne la contient pas.

### ❌ « Activation pour `tri` » — la prémisse ne tient pas, chiffrée

En natation pure, `vol_max` EST du temps de piscine. **En triathlon, `vol_max` est le volume
total des trois disciplines.** Le guard s'applique à la déclaration entière : activé pour le
tri, il multiplie par 0,45-0,70 le vélo et la course avec la nage.

Mesuré (tri, `vol_max: 12`, `confirme`) :

| format | plan actuel | avec le guard activé | écart |
|---|---|---|---|
| S | 1 785 min | 1 383 min | −23 % |
| M | 3 552 min | 2 224 min | −37 % |
| 70.3 | 6 858 min | 4 054 min | −41 % |
| **Full** | **17 266 min** | **7 881 min** | **−54 %** |

Un Ironman amputé de plus de la moitié, vélo et course compris. **Non écrit.** L'intention est
juste — le biais déclaratif existe aussi chez le triathlète — mais elle demande d'appliquer la
conversion à la PART NAGE du volume déclaré, ce que le moteur ne sépare pas à cet endroit.
C'est un ticket distinct, et c'est une décision de structure, pas un calibrage.

---

## §4 — `sessionScale` : la condition de sortie est écrite

Tu as raison sur le fond : une dette dont le bloqueur est une autre garde ne se paie jamais.
Elle porte désormais son bloc au registre, au format du plancher 1,05 — cause du blocage,
hypothèse de sortie (convertir ET re-dériver la rampe R10 depuis la base convertie, pour que la
progression soit recalculée au lieu de sauter), condition de sortie mesurable (le saut
inter-semaines sous C22 sur les 949, `audit:v1` à 0 violation dure), et la clause qui compte :
**si l'hypothèse est fausse, la dette devient une décision permanente et se requalifie comme
telle** — elle ne reste pas en attente.

## §5 — T-23 : tu as raison, je le présentais à l'envers

34 % est le taux HONNÊTE ; 10 % était le mensonge. Rectifié dans les deux documents, avec ta
formulation : deux erreurs qui se compensent ne font pas un modèle juste, elles font un modèle
dont on ne peut plus mesurer l'erreur.
