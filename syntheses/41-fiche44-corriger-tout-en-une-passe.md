# Fiche 44 — « Corriger tout en une passe » : dix tâches, chacune mesurée avant/après

**Date : 01/09/2026 · Autonomie accordée (modèle Fable), exigence de rigueur inchangée : chaque
tâche a sa section, sa mesure avant/après, son rayon golden publié, et aucune correction
silencieuse.** Commits (ordre) : `9559b19` (T1) · `6a6a484` (T2) · `0d43c65` (T3) · `a5bbab6`
(T4) · `336b7b4` (T5) · `298eadb` (T6/O-102) · `b95aabb` (T7) · `dd8b4a9` (T9 + mesure T8) ·
le commit de clôture (T10, registre, ce rapport).

---

## Tâche 1 — Le nageur débutant sans CSS (−56 %) · LIVRÉE (`9559b19`)

**Hypothèse du conseil CONFIRMÉE** : les bornes de séance du nageur débutant vivaient en MÈTRES
dans un moteur qui raisonne en temps (règle 14). Chez un nageur lent ou sans CSS (repli
130 s/100 m), le plafond C15 de 850 m vaut ~20,6 min d'eau, au ras du plancher de 20 min : la
fenêtre de séance était DÉGÉNÉRÉE en temps, le point fixe n'avait plus de jeu, et le pic
s'effondrait (5,5 h contre 12,6 h avec CSS connu — la seule cellule sur 12 qui perdait du volume
en mode « référence inconnue »).

**Correctif** : `swimCapDebutantM` — le plafond se convertit en TEMPS (~34 min d'eau) quand la
fenêtre en mètres est dégénérée, et SEULEMENT là. Ma première écriture sans cette condition
portait 86 débutants RAPIDES de 850 à 1 325 m — un contournement de C15 chez qui n'avait aucun
défaut — retirée le jour même et publiée dans le commit.

**Mesure** : la cellule cible remonte, rayon golden 7 profils. **Vu par la batterie en fin de
lot** : le critère `D5` du banc v6 (« nage débutant ≤ 850 m ») encodait la faute d'unité que la
fiche a corrigée — réécrit sur la propriété avec son jumeau de sensibilité (CSS inconnu
≤ 1 400 m équivalent-temps, livré 1 150-1 175 · CSS rapide déclaré → 850 m EXACTS), et
**contre-prouvé** : garde T1 cassée par `npm run casser` → D5 rouge. Idem `T-41` (lotPhysio) :
son seuil « l'inconnu ne projette pas » était en mètres — porté au plafond statique dérivé
(1 400), la propriété intacte (l'inconnu reste au plafond STATIQUE, seule la déclaration mesurée
fait progresser la borne).

## Tâche 2 — `activity` retirée · LIVRÉE (`6a6a484`)

Question, schéma, libellés et fixtures retirés ; aucun lecteur trouvé en dernière vérification
(confirmation de la Phase 1). Mesuré INERTE sur le sceau (S4/S5 immobiles au recomptage par
worktree).

## Tâche 3 — L'affûtage se borne contre le pic LIVRÉ · LIVRÉE (`0d43c65`)

La garantie R3.13 se rejoue APRÈS `enforceC22Final` (13ᵉ occurrence de la leçon « une garantie
vérifiée avant la passe qui l'invalide ne vérifie que l'avant-dernier état »). **Attribution
a posteriori** : ce rejeu déplace 3 semaines au sceau S4 (I14, rang déclaré — une séance dépasse
la sortie longue de sa discipline sur 3 semaines de plus), ré-épinglé 345 → 348 avec cette cause.

## Tâche 4 — La sortie longue du duathlon reçoit sa borne · LIVRÉE (`a5bbab6`)

**La prémisse de la fiche est RÉFUTÉE avant d'écrire les valeurs** : « 443 min = ×1,8 l'épreuve »
reposait sur mon propre ancrage faux de la fiche 39 (PM ≈ 4 h). Le PM du moteur est un Powerman
10/150/30 que son propre prédicteur donne à 7 h 41 – 8 h 23 : 443 min = **0,94× l'épreuve**.
`CAP_LONG_DUATHLON { S: 135, M: 200, PM: 265, L: 250 }` — ancres = durée d'épreuve PRÉDITE ×
facteur décroissant avec la durée (S ×1,9 · M ×1,4 · L ×1,25 · PM ×0,55, le régime ultra de T4),
réfutation publiée dans le commentaire de la table. **Première écriture INERTE et publiée** : le
`bnd` déclaré du module gagne sur la branche `s.long` de `blockBounds` — la borne vit donc à la
déclaration du module (min avec la table).

**Mesure** : sortie longue vélo max S 122 · M 181 · L 226 · **PM 443 → 240**. Les bricks PM à
370 min restent : legs vélo de course 4 h 20 – 4 h 50, C21b PM [150, 300] — proportionné, pas un
défaut. Rayon golden : **153/1074, tous duathlon** (médiane 203 champs — le sport entier se
recompose au point fixe). v7 : tous budgets tenus, U-DOSE à zéro — le déplacement de puits vers
le brick ne s'est pas produit. **Attribution sceau** : S5 224 → 226 (la borne retire du pic ce
qu'aucun maillon R20.2 ne déclare — la moitié ouverte d'O-35, 2 profils).

## Tâche 5 — ALLOC_CIBLE par palier d'enveloppe DÉCLARÉE · LIVRÉE (`336b7b4`)

**La mesure qui a dimensionné les paliers** : pic livré des 206 profils tri — méd 8,0 h, p90
9,9, max 12,9. **Aucun profil n'atteint 13 h : le palier où 50/30/20 tient était VIDE**, la
décision commentait presque tous les plans avec une cible d'un autre monde.

**L'axe de sélection est l'enveloppe DÉCLARÉE (`vol_max`), jamais le pic livré** — sélectionner
sur le livré a été refusé explicitement : forme O-43, la cible basculerait de palier quand le
moteur sous-livre et l'écart publié rétrécirait au moment où il devrait crier. L'objection du
physiologiste (§2.4 : « montrer qu'on n'y est pas ») reste servie.

**Cibles posées À L'AVANCE par arithmétique de fréquence** (la nage est un coût fixe de 2-4 ×
~40 min, le vélo est élastique, la course bornée par l'impact) — vérifiable règle 12 : le corpus
livre 15/42/45, aucune cible n'y ressemble.

```
< 9 h    : vélo 40 · course 35 · nage 25
9-13 h   : vélo 45 · course 32 · nage 23   (à 11,2 h : 23 % = 2,6 h = 4 × 39 min ✓ —
                                            le cas que la réserve déclarait intenable à 20 %)
≥ 13 h   : vélo 50 · course 30 · nage 20   (la cible du fondateur, inchangée)
```

**Mesure avant/après** (206 tri, paliers déclarés 1/203/2) : écart méd |livré−cible| vélo
8,1 → **3,9 pts** · course 14,7 → 12,7 · **nage 5,3 → 8,3 pts — la nage S'ÉLOIGNE et c'est la
lecture honnête** : au palier 10 h la cible demande PLUS de nage (fréquence) et le routage
structurel n'en livre que 15 %. Décision émise : 188 → 187 profils. **Propriété descripteur
PROUVÉE** : semaines livrées identiques sur 206/206 (via le canon du golden — mon premier
instrument comparait deux ordres de sérialisation, « 206/206 différents », taux saturé →
instrument, publié). Rayon : 194/1074, tous tri, décisions seules.

**Signal au fondateur (patron O-56, mesuré, rien d'écrit)** : sur 66 tri débutants avec nage,
**30 ont une fenêtre PLATE** — la plus grosse séance de nage identique de la semaine 1 à la fin
(ex. 22 min sur tout le plan). Si la fenêtre débutant doit s'ouvrir avec la position, c'est une
décision à prendre avec le lot progression.

## Tâche 6 — La chaîne O-102 → O-100b → O-101 · TRAITÉE (`298eadb` + registre)

### O-102 — le sens tranché : l'étiquette suit le contenu, sur la seule surface où l'athlète la lit

Trois mesures ont décidé de la forme AVANT d'écrire :

1. **La prémisse du ticket est RÉFUTÉE** : la courbe de volume est en minutes, AVEUGLE à
   l'étiquette. Ses vrais lecteurs : l'élection de victimes de coupe (un jour de nage seuil est
   coupable comme du remplissage), l'espacement des jours durs, l'auditeur, et l'AFFICHAGE.
2. **Ré-étiqueter PENDANT la construction** livre les jours de nage seuil à `applyAntiCollage`
   (« deux durs adjacents → le second redevient facile ») : **~1 500 nages seuil converties en
   repli** — la prédiction « la nage est la victime par défaut » exécutée par le correctif.
3. **Ré-étiqueter APRÈS le point fixe** fait naître **2 939 paires « jours durs adjacents »**,
   violation DURE de l'auditeur, sur 175 profils.

**Livré** : `chargeLivree` — descripteur post-convergence (T-16c), posé sur tout jour `facile`
portant ≥ C13d (8 min) de travail dur (le seuil du moteur lui-même, celui du déclassement),
jamais l'inverse (« dur » du schéma = séance CLÉ, spec tranchée par mesure:t61). Lu par la
grille Plan/Semaine, le document exporté, et le **bilan de semaine** — la part de FACILE y
comptait la nage seuil (médiane **30 min de dur** sous l'étiquette « facile », 1 205 jours sur
3 827). Rayon : 204 profils, 2 020 jours, plans byte-identiques hors le champ (0/1 060).
Contre-preuve : passe neutralisée par `casser` → golden 204 écarts. Le résidu de FOND (la
machinerie d'élection reste aveugle au dur de `facile2`) est un chantier de construction, à
arbitrer avec le lot progression — au registre.

### O-100b — FERMÉ : le mécanisme a été retiré, confirmé à la main (règle 17)

`semaine` et `quotidienne` rendent aujourd'hui le MÊME plan (12,32 h, densités §G identiques,
1,68 dures/7 j des deux côtés) : le retrait du cycle de 10 jours (25/08) a retiré le mécanisme.
Confirmé sur §F/§G/§H de `mesure:doublage`, pas sur un grep muet.

### O-101 — RÉÉVALUÉ : la condition du conseil est levée, l'ouverture reste au fondateur

Le défaut de densité qui fermait le doublage course est résolu (par retrait). **Mais l'objection
du médecin — l'impact ×2 le même jour est le levier le plus blessogène — est INDÉPENDANTE de ce
défaut et demeure** : priorité 2 contre priorité 5, l'ouverture est une décision produit, pas un
correctif, et je ne l'ai pas prise. La moitié « rien ne le dit » est livrée en T7.

## Tâche 7 — Informer sur les plafonds structurels · LIVRÉE (`b95aabb`)

La carte R20.2 disait déjà le plafond structurel quand il est l'ARGMIN. Le trou : quand la
courbe ou l'historique borne AUJOURD'HUI mais que l'enveloppe déclarée dépasse quand même le
plafond structurel, l'athlète ne l'apprenait nulle part. Une ligne s'ajoute au `why` — jamais
sous protection santé (le plafond y vient de la protection, la dire « structurelle » serait
faux). **Mesure : 237 profils sur 1 060 l'affichent** (run 59 · swim 52 · duathlon 47 · bike
40 · swimrun 22 · tri 17).

**Trouvé en mesurant (famille O-101)** : le marathonien qui répond `doubles: oui` lisait
« **Tu doubles déjà** » — FAUX sur un sport où le doublage est inerte. La branche exige
désormais le guard `doublesAddVolume` ; il lit « Sur ce sport, doubler ne changerait rien ».
11 profils de plus changent (rayon total 248, décisions seules).

**Et la batterie a trouvé TROIS régressions lotPhysio, chacune attribuée par worktree-par-commit
(1 060 scellés à chaque point — le zéro a sa population)** : T-27 (cliquets S4/S5 — T1 : S5 −1 ·
T2 inerte · T3 : S4 +3 · T4 : S5 +2 · T5/T6/T7 immobiles, ré-épinglés avec cause) · T-29 (le
catch muet était le MIEN, passe O-102 — remplacé par l'appel direct) · T-41 (seuil en ancienne
unité, voir T1).

## Tâche 8 — O-97 : la mesure d'entrée dit qu'informer suffit (aucun code)

Sur 1 060 profils : **5 seulement** annoncent un budget prescrit au-dessus du maximum calendaire
(tous des fixtures `vol-max` extrêmes — prescrit 9-12 pour un calendrier à 7), et borner le
prescrit serait **INERTE sur le plan dans 5 cas sur 5** (le livré est partout sous le max
calendaire — `applySessionBudget` ne mordrait pas différemment, prouvé par l'inégalité
livré ≤ calendrier < prescrit). Le couplage schéma → raisonneur que le ticket redoutait n'est
pas payé pour 5 fixtures : le couple O-87 et la ligne T7 couvrent la surface athlète.

## Tâche 9 — O-105 : le garde S5 lit l'argmin publié · LIVRÉE (`dd8b4a9`)

`s5IdentiteR202` recalculait un `min()` brut sur tous les plafonds — une grandeur qu'aucun écran
n'affiche (le moteur écarte les plafonds que le livré réfute avant de nommer son argmin). Le
garde lit désormais `_r202.argmin`, et signale un argmin absent du record comme violation à
part. **S5 226 → 191, ré-épinglé avec sa cause** : changement d'INSTRUMENT, plans intacts au bit
près — les 35 profils sortis du compte étaient des cas où un plafond non publié passait sous le
pic. **Lot calme vérifié** comme la fiche l'exigeait : golden 0 écart, v1/v6/lotPhysio immobiles.

## Tâche 10 — O-77 : l'inversion est VIVANTE, la médiane la cachait (règle 21) · MESURÉE, non corrigée

Sur le moteur courant, la médiane rend 82 → 93 → 93 (« pas d'inversion ») — **un faux vert de
règle 21** : PAR SEMAINE, S1-S7 tombent de **82 à 51 min (−31)** quand `vol_max` passe de 9 à
13 h, pendant que la fin de plan monte — 10 semaines sur 25 en baisse, l'agrégat additionnait
les deux. **La piste du ticket (« plus de séances ») est RÉFUTÉE** : 8 séances des deux côtés,
total S1 quasi égal (455 vs 440 min). **La cause est la COMPOSITION** : `sessionScale`
(`reasoningEngine.ts:355`) est une **constante de PLAN** dérivée de l'enveloppe déclarée — une
valeur de fin de rampe appliquée à la semaine 1 (règle 20, quatrième inversion de monotonie du
dépôt après I13/niveau, O-21/allure, O-93/phase). À 13 h les blocs de qualité naissent gros
(sweetspot 74 → 92, force 65 → 85), la rampe `vol_recent` épingle le total, et la longue — le
seul gros bloc élastique de sa discipline — absorbe. **Le correctif est un dimensionnement
POSITIONNEL des séances (le chantier du lot progression), pas un réglage local — non forcé ici,
conformément à la fiche.** L'instrument (`mesure:longue-volmax`) mesure désormais par position
et publie l'inversion au lieu du faux vert.

---

## Fin de lot

- **Registre** : O-100b et O-105 FERMÉS · O-102 TRAITÉ (résidu de fond nommé) · O-101 RÉÉVALUÉ
  (décision fondateur) · O-97 MESURÉ (informer suffit) · O-77 cause nommée, correctif au lot
  progression · O-50 à moitié fermé par T1 (l'autre moitié — le creux CSS 2:08-2:09, −40 % —
  reste documentée au registre, préexistante et non touchée par ce lot).
- **Cliquets ré-épinglés avec cause attribuée à facteur unique** : S4 348 (T3) · S5 191 (T1 −1,
  T4 +2, instrument T9 −35).
- **Critères réécrits dans l'unité de T1, avec leur raison affichée** : D5 (banc v6), T-41
  (lotPhysio) — jamais supprimés.
- **Batterie complète en fin de passe** : voir le commit de clôture (12/12 exigé par la fiche).
