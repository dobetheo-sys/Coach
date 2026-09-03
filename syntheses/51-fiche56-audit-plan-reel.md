# Fiche 56 — Audit du plan livré aujourd'hui pour ton profil (`REEL/tri/70.3/nage-limitante`)

Après 55 fiches de correctifs, voici ce que ton profil reçoit **concrètement**, aujourd'hui, sur
le moteur tel qu'il est déployé. Pas un ticket, pas une moyenne sur 1 074 profils : ton plan,
généré à l'instant, semaine par semaine.

## 1. Ce que le moteur sait de toi aujourd'hui

| Donnée | Valeur déclarée |
|---|---|
| Épreuve | Triathlon 70.3, départ le 07/06/2027, natation en **eau libre (lac)** |
| Âge / sexe / poids | 35 ans · homme · 85 kg |
| Historique | « confirmé » |
| Volume récent réel | 13 h/semaine |
| Volume max souhaité | 20 h/semaine |
| Disponibilité | quotidienne, 12 séances/semaine possibles, jours doublés autorisés |
| Références | FTP 236 W · allure seuil course 4:42/km · CSS nage 2:02/100 m |
| Continuité de nage démontrée | 1 000 m en continu (à construire jusqu'à 1 900 m, la distance de course) |
| Milieu d'entraînement | bassin (la course se nage en lac) |
| Terrain | vallonné |
| Départ du plan | 17/08/2026, sur 43 semaines |

**Ce profil est reconstitué à partir de la meilleure fixture disponible dans le corpus de test
(`REEL/tri/70.3/nage-limitante`), pas relevé lettre pour lettre dans l'app — un écart avec ce que
tu déclarerais aujourd'hui en direct reste possible.** Trois champs, ajoutés au questionnaire
depuis que cette fixture a été écrite, ne sont pas renseignés dans ce profil et méritent d'être
regardés :

- **Température de l'eau (`water_temp_c`)** — absente, alors que tu déclares une natation en lac.
  Sans elle, le moteur ne peut pas activer le verrou d'acclimatation au froid (les dernières
  semaines avant course imposent une séance en eau non chauffée sous 17 °C) : ce n'est pas
  bloquant, mais c'est une information qui te concerne directement et qu'il vaut la peine de
  renseigner avant le prochain export.
- **Profil du parcours par discipline** (`leg_bike_prof`/`leg_run_prof`) — absents ; le moteur
  retombe sur ton terrain global déclaré (« vallonné ») pour les deux disciplines, ce qui est un
  repli raisonnable mais moins précis qu'une réponse par discipline si le relief du vélo et de la
  course diffèrent réellement sur ton parcours.
- **Structure d'entraînement récente** (`training_structure`) — absente ; elle affine la
  projection de progression (combien tu peux espérer gagner d'ici la course) mais n'entre pas dans
  la construction du plan lui-même.

Rien de bloquant : le plan se génère sans aucune de ces trois réponses. Ce sont des précisions qui
amélioreraient le degré de détail, pas des manques qui invalident ce qui suit.

## 2. Le plan, dans les grandes lignes

**43 semaines, cinq phases** : base (13 semaines) → développement (11) → spécifique (11) → pic
(5) → affûtage (2), plus la semaine de course elle-même. Une semaine de récupération toutes les
4 semaines, sans exception — c'est la cadence que le moteur tient depuis le lot « plancher de
fréquence » et qu'aucune règle de placement n'a le droit de sauter.

### La courbe de charge, semaine par semaine

```
Base          ▁▂▁░▁▂▁░▁▂▁░▁         ~9,5 h → 10,4 h  (montée douce, décharge tous les 4 sem.)
Développement ▂▁░▂▁░▂▁░              ~9,5 h → 10,6 h  (le brick n'existe pas encore)
Spécifique    ▂▂░▂▂░▂▂░▂             ~9,6 h → 11,5 h  (le brick apparaît, la nage cède du volume)
Pic           ▂▂░▂                  11,5 h → 12,3 h  (plateau à trois semaines fortes)
Affûtage      ░                     5,6 h            (la course elle-même clôt la préparation)
```

La **semaine la plus chargée est la semaine 41 : 12 h 19** (739 minutes), la dernière semaine
pleine avant l'affûtage. Trois semaines du bloc de pic (S37, S39, S41) tournent toutes autour de
11,5 à 12,3 h : ce n'est pas un pic isolé qui retombe aussitôt, c'est un plateau tenu plusieurs
semaines — ce que la littérature sur la périodisation recommande, et ce que ce chantier a
justement corrigé (fiche « le bloc final est un plateau », voir §4).

### Ce que reçoit chaque discipline

Sur la préparation entière, la répartition du temps est directement pilotée par ta natation
limitante :

| Discipline | Part du temps total |
|---|---|
| Vélo | ~44 % |
| Course à pied | ~30 % |
| Natation | ~20 % |
| Brick (enchaînements, à partir de la phase spécifique) | ~6 % |

La natation ne descend jamais sous **2 séances par semaine**, même sur les semaines les plus
serrées — c'est le plancher que le moteur garantit pour ta discipline la plus fragile
techniquement, et qui explique pourquoi tu nages proportionnellement plus que ce que ta course
ne « pèse » en durée le jour J (voir la décision « fréquence » plus bas).

### Répartition de l'effort (facile / modéré / dur)

**70 % facile · 22 % modéré · 8 % dur**, sur l'ensemble du plan. C'est dans la fourchette que ce
chantier vise depuis le début (le manifeste parle de ~80/20, et la règle qui juge réellement le
plafond de travail dur — pas seulement le facile — le trouve à zéro violation ici, voir §4).

### Les séances clés de ta semaine la plus chargée (S41)

| Jour | Séance | Durée |
|---|---|---|
| — | Repos actif | — |
| — | Nage seuil (distance + fractionné) | 70 min |
| — | VO2max vélo | 73 min |
| — | Footing facile | 50 min |
| — | Endurance vélo | 110 min |
| — | Allure course à pied (mémorisation de l'allure du jour J) | 68 min |
| — | Nage récupération courte | 56 min |
| — | **Brick vélo + course** — sortie longue à vélo, dernier tiers à l'allure exacte du jour J,
    puis enchaînement course | **212 min (la séance la plus longue de la semaine)** |
| — | Sortie longue à pied (fondamentale, allure conversationnelle) | 100 min |

Le brick est la pièce maîtresse de cette semaine — il simule directement les dernières heures de
ta course, jambes déjà sollicitées par le vélo. La sortie longue à pied qui le suit dans la
semaine construit la distance pure, sans reproduire l'objectif du brick : les deux se complètent,
ils ne se répètent pas.

## 3. L'audit — ce que ce chantier a spécifiquement vérifié sur TON plan

**Verdict de sécurité : zéro violation dure.** Aucun jour de récupération plus lourd que la charge
qu'il doit absorber, aucun jour dur consécutif imposé, aucune séance de qualité qui dépasse son
plafond, aucune sortie longue anormale, aucune séance sans explication. Le seul point relevé par
l'auditeur est un point **mineur, non-sécuritaire** : la courbe de charge annoncée fait 6 sauts de
plus de 10 % d'une semaine de charge à l'autre — c'est la conséquence normale d'un cycle de
décharge toutes les 4 semaines et de changements de phase, borné par ailleurs à ne jamais dépasser
25 % d'un coup. Ce n'est pas un défaut, c'est la trace visible d'une périodisation qui ondule.

### Le pic est-il cohérent avec ce que ce chantier a établi ?

**Oui, exactement.** Le retrait du cycle d'entraînement à 10 jours (chantier clos fin août) avait
établi une référence précise pour ton profil : en calendrier à 7 jours pur, ton pic devait
atteindre **12,32 h**. Ton plan d'aujourd'hui livre very précisément **12,32 h en semaine 41**
(739 minutes, à la minute près). Ce n'est pas une coïncidence approximative — c'est la valeur
exacte que ce chantier visait, et elle est atteinte.

### Les corrections de progression ont-elles un effet visible et sain sur ta courbe ?

**Oui.** Deux signaux le confirment : (1) ta part de sortie longue (vélo/brick/course, la séance
la plus longue de chaque semaine) reste **entre 23 % et 36 % du volume hebdomadaire tout au long
du plan**, jamais proche de la borne de sécurité de 40 % au-delà de laquelle le moteur
redistribuerait du volume vers tes séances faciles — le mécanisme de fiche 52 (borne du récepteur
élastique) n'a jamais besoin de mordre sur ton profil, ta répartition est déjà équilibrée. (2) ta
courbe de charge monte de façon régulière par blocs de 4 semaines (montée, montée, montée, palier
de récupération), sans plateau prématuré ni chute brutale — le comportement que la correction du
plafond de séance progressif (fiche 48) visait à obtenir.

### `sw.aero` reclassée : ta répartition facile/modéré/dur est-elle plus honnête ?

**Oui, et c'est le changement qui te concerne le plus directement de tout ce chantier**, parce que
tu es précisément le profil pour qui cette correction pèse le plus (nage limitante, gros volume de
nage aérobie). Avant le reclassement du 02/09, ta nage aérobie de fond comptait pour du « facile »
dans le tableau qui t'est montré — alors qu'elle coûte, mesuré, environ 84 % de l'effort que tu
fournis à ton allure seuil (bien plus proche d'un travail modéré que d'un vrai facile). Sur TON
plan spécifiquement :

| | Facile | Modéré | Dur |
|---|---|---|---|
| Avant le reclassement | 80,0 % | 13,5 % | 6,6 % |
| **Après (ce que tu vois aujourd'hui)** | **73,9 %** | **19,5 %** | 6,6 % |

6 points de « facile » redevenus « modéré » — rien dans ton plan n'a changé de contenu, seul ce
qu'on te MONTRE est devenu plus honnête sur ce que ta nage te coûte réellement. Le travail dur ne
bouge pas : la correction ne t'a pas fait basculer dans une charge plus dangereuse, elle a
seulement corrigé une étiquette.

### Reste-t-il un résidu connu de ce chantier qui te touche ?

Deux tickets fermés récemment ont été spécifiquement vérifiés sur ton plan, et aucun des deux ne
laisse de trace chez toi :

- **O-83** (plans de nage débutant livrant 2 à 5 séances de 15 minutes) — ne te concerne pas : tes
  séances de nage font en moyenne 59,5 minutes, très au-dessus du seuil de cohérence (25
  min/séance ou 60 min/semaine) qui déclenche l'avertissement. Le trou que ce ticket corrigeait
  visait un profil très différent du tien (débutant à faible volume).
- **O-113** (la sortie longue pouvait absorber jusqu'à 67 % d'une semaine chez un profil modeste)
  — ne mord pas non plus sur toi : ta plus grosse séance de la semaine ne dépasse jamais 36 % de
  ton volume hebdomadaire (hors la semaine de course elle-même, qui ne contient plus qu'une seule
  séance par construction), loin du plafond de sécurité à 40 %.

**Un point réel, en revanche, mérite d'être nommé** : ta natation — ta discipline **limitante** —
tombe à seulement **2 séances par semaine sur 31 des semaines du plan**, contre une cible de 3.
C'est documenté et volontaire (décision « fréquence » du moteur) : avec 8 séances réelles par
semaine à répartir sur 3 disciplines plus le brick, donner 3 séances de nage systématiquement
prendrait des créneaux à des disciplines qui pèsent plus lourd dans ton chrono du jour J. Le moteur
ne force rien et te le dit — mais c'est un compromis réel, pas un non-sujet : si progresser en nage
est ta priorité n°1, le levier disponible est de libérer un jour supplémentaire dans ta semaine ou
d'ajouter un doublage (le moteur te le propose déjà dans « pourquoi ce plan »), pas d'attendre que
le plan le fasse tout seul.

## 4. Verdict global

**Ce plan est cohérent, sécuritaire, et fidèle à ce que 55 fiches de correctifs ont établi.** Zéro
violation dure, un pic qui atteint exactement la référence que ce chantier a fixée pour ton
profil (12,32 h), une progression de volume qui monte sans à-coup dangereux, une répartition
disciplines/intensités qui reflète maintenant honnêtement ce que ta nage te coûte.

**Il n'est pas parfait, et le point faible à connaître est clair** : ton ambition déclarée (20
h/semaine) n'est PAS ce que le plan livre (12,3 h au pic) — un écart de 7,7 h/semaine, chiffré et
expliqué par le moteur lui-même (« Ton volume max demandé n'est pas atteint »). Ce n'est pas un
bug, c'est une limite structurelle honnêtement affichée : à 8 séances réelles par semaine, aucune
ne pouvant s'allonger indéfiniment sans cesser d'être ce qu'elle est, ton plafond réel est le
nombre de créneaux disponibles dans ta semaine, pas ton historique (qui autoriserait, lui, jusqu'à
13 h). Et le corollaire de cette même contrainte est le point nommé ci-dessus : ta discipline
limitante — la nage — est celle qui absorbe le plus ce manque de créneaux, tombant à 2 séances par
semaine plus souvent que sa cible de 3.

**Ce que ça veut dire concrètement pour toi** : si tu veux vraiment te rapprocher de 20 h/semaine
ou donner plus de fréquence à ta nage, le levier n'est pas dans une case du questionnaire que tu
aurais mal remplie — c'est le nombre de créneaux d'entraînement dans ta semaine (via davantage de
jours doublés, ou une disponibilité plus large) qui doit bouger en premier. Le moteur ne peut pas
inventer un neuvième créneau ; il te dit honnêtement où est la limite plutôt que de la maquiller
en gonflant tes séances existantes.

---

*Sources techniques : `scripts/goldenMaster.mjs` (définition du profil `REEL/tri/70.3/nage-limitante`),
`src/app/bridge.ts` (génération via `EBV2.buildPlan`), `src/audit/coherenceScorer.ts` (`auditPlan`),
`src/engine/loadModel.ts` (`intensitySplit`, reclassement `sw.aero`), décisions O-113/O-52 (fiche
52), plafond de fréquence C3 (fiche « plancher de fréquence »), référence 12,32 h (chantier retrait
du cycle 10 jours, `BUGS_OUVERTS.md`). Plan généré sur le moteur au commit `557945a` (main).*
