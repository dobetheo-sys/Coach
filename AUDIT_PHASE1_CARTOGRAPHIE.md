# Audit du moteur — Phase 1 : cartographie réponse → paramètre → contrainte → séance

**Document de référence · 25/08/2026 · aucune ligne de code modifiée.**

Il répond à une seule question, sport par sport et question par question : **quand un athlète
répond X, qu'est-ce que ça change dans son plan, par quelle règle, et qu'est-ce qui borne le
résultat.** Il décrit ce qui EST, jamais ce qui devrait être — le jugement physiologique est
l'objet de la Phase 2.

Tout ce qui est affirmé ici est **mesuré ou tracé à une ligne** : les tableaux de questions, de
vocabulaire de séances et de couverture sont produits par exécution du moteur sur les
**1 016 profils** du corpus, pas par lecture. Les références `fichier:ligne` permettent de
vérifier chaque point sans lire le reste.

---

## 0. Comment le moteur fabrique un plan — les six étages

Un lecteur non-développeur n'a besoin que de cette page pour lire tout le reste.

| étage | ce qu'il fait | où |
|---|---|---|
| **1. Contrat d'entrée** | valide chaque réponse contre son domaine. Trois sorties possibles et jamais une quatrième : un **refus motivé**, un **avertissement** porté par le plan, ou un **défaut journalisé** — un défaut appliqué est visible, jamais tacite (R11.2) | `src/engine/answerSchema.ts` |
| **2. Raisonnement** | transforme les réponses en **paramètres** : nombre de semaines, phases, cadence de récupération, plafonds de volume, facteurs de charge, drapeaux de sécurité | `src/engine/reasoningEngine.ts` |
| **3. Calendrier** | pose les **jours** et leur **créneau** (`dur1`, `dur2`, `durLong`, `facileR`, `facile2`, `recup`, `off`), place les décharges, applique les jours bloqués | `src/generator/weekBuilder.ts` |
| **4. Contenu** | chaque sport décide **quelle séance** remplit un créneau, selon la phase et l'avancement | `src/sports/<sport>/`, `src/generator/sessionLibrary.ts` |
| **5. Volume** | une **boucle** met la semaine à l'échelle de sa cible, sous plafonds de séance, jusqu'à un point fixe | `src/generator/planGenerator.ts` |
| **6. Audit et réparation** | le plan est noté contre les invariants ; ce qui viole est réparé, puis re-vérifié | `src/audit/coherenceScorer.ts`, `src/generator/repairLoop.ts` |

**Le vocabulaire des créneaux est le même pour tous les sports ; ce que chaque créneau CONTIENT
est propre au sport.** C'est la clé de lecture de tout le document : le calendrier est agnostique
de la discipline (`weekBuilder.ts:36`), le module de sport décide du contenu.

---

## 1. Les questions, une par une

64 clés sont déclarées au contrat d'entrée. Colonnes :

- **nature** — `vecue` (répondable de mémoire), `mesuree` (demande un test ou une montre),
  `estimee` (auto-déclarée, invérifiable). Une `estimee` a le droit de moduler le **contenu**
  d'une séance ; elle n'a pas le droit de piloter une **grandeur numérique** (`answerSchema.ts:44-60`).
- **défaut si absente** — ce que le moteur applique, et qu'il journalise comme décision.
- **lue par** — les modules qui la consultent réellement, et le nombre de points de lecture.
- **corpus** — combien de valeurs distinctes les 1 016 profils du golden lui donnent.

### Objectif et cadre

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `intent` | ton intention | vecue | competition · finir · plaisir | plaisir/finir (marge de 0,9 sur le volume) | app/bridge,engine/reasoningEngine,generator/planGenerator,sports/tri/index (5) | 3 valeur(s) |
| `level` | ton niveau | estimee | debutant · inter · avance | inter | app/bridge,engine/trailModel,engine/reasoningEngine,generator/sessionLibrary,generator/planGenerator,generator/repairLoop,sports/swimrun/objective (9) | 3 valeur(s) |
| `history` | ton historique d'entraînement | vecue | reprise · confirme · ancien | confirme | app/bridge,engine/trailModel,engine/reasoningEngine,generator/planGenerator,generator/weekBuilder,generator/repairLoop,sports/tri/index,sports/duathlon/index (19) | 3 valeur(s) |
| `race_date` | la date de ta course | vecue | date | — | app/bridge,engine/reasoningEngine,generator/planGenerator,generator/weekBuilder (19) | 11 valeur(s) |
| `plan_start` | le départ de ton plan | vecue | date | — | app/bridge,engine/reasoningEngine,generator/weekBuilder (5) | 3 valeur(s) |

### Enveloppe de temps

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `vol_max` ⚑requis | ton volume max | vecue | 1 à 40 | — | app/bridge,engine/reasoningEngine,generator/planGenerator,generator/repairLoop,sports/run/index (11) | 5 valeur(s) |
| `vol_recent` | ton volume récent | vecue | 0 à 40 | — | app/bridge,generator/planGenerator (4) | 8 valeur(s) |
| `sessions_max` | ton nombre de séances | vecue | 1 à 14 | 7 | engine/reasoningEngine,generator/planGenerator,generator/repairLoop (5) | 4 valeur(s) |
| `dispo` | ta disponibilité | vecue | quotidienne · semaine · partielle · weekend | partielle (le défaut se choisit dans le sens de la sécurité, pas de la commodité) | generator/weekBuilder,sports/swimrun/index (3) | 4 valeur(s) |
| `doubles` | les doubles séances | vecue | oui · parfois · non | non (aucune seconde séance dans la journée) | engine/reasoningEngine,generator/planGenerator (2) | 1 valeur(s) |
| `off_days` | les jours bloqués | vecue | oui · non | — | **personne** (0) | 2 valeur(s) |
| `off_which` | tes jours bloqués | vecue | Lun · Mar · Mer · Jeu · Ven · Sam · Dim | — | engine/reasoningEngine (1) | 1 valeur(s) |

### Santé et sécurité

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `med_pain` | la douleur à l'effort | vecue | oui · non | — | app/bridge,engine/reasoningEngine (3) | **absente** |
| `med_dizzy` | les vertiges à l'effort | vecue | oui · non | — | app/bridge,engine/reasoningEngine (3) | **absente** |
| `med_treat` | ton suivi médical | vecue | oui · non | — | app/bridge,engine/reasoningEngine (3) | **absente** |
| `injury` | tes zones fragiles | vecue | aucune · tibia · genou · pied · hanche · dos · epaule · cou · course · velo · quadriceps · cheville · fascia | — | engine/reasoningEngine,generator/repairLoop (2) | 5 valeur(s) |
| `age` | ton âge | vecue | 10 à 100 | — | app/bridge,engine/reasoningEngine (8) | 3 valeur(s) |
| `sex` | ton sexe | vecue | F · H · np | — | app/bridge,engine/cycleModel (6) | 2 valeur(s) |
| `weight` | ton poids | vecue | 25 à 250 | — | app/bridge,engine/weekDistances,generator/planGenerator (10) | 3 valeur(s) |
| `height` | ta taille | vecue | 100 à 250 | — | app/bridge (3) | 1 valeur(s) |

### Récupération et vie

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `sleep` | ton sommeil | vecue | court · moyen · bon | — | engine/reasoningEngine (1) | **absente** |
| `life_load` | ta charge de vie | vecue | legere · normale · lourde | — | engine/reasoningEngine (1) | **absente** |
| `activity` | ton activité quotidienne | vecue | sedentaire · modere · actif | — | **personne** (0) | **absente** |
| `cycle_sync` | la synchronisation avec ton cycle | vecue | oui · non | — | engine/cycleModel (1) | 1 valeur(s) |
| `cycle_start` | le 1er jour de tes dernières règles | vecue | date | — | engine/cycleModel (1) | 1 valeur(s) |
| `cycle_len` | la longueur de ton cycle | vecue | 21 à 40 | — | engine/cycleModel (1) | 1 valeur(s) |
| `weight_lever` | le levier du poids | vecue | oui · non · coach | — | app/bridge,generator/weekBuilder (2) | 1 valeur(s) |
| `weight_target` | ton poids cible | vecue | 35 à 200 | — | app/bridge (1) | **absente** |
| `training_structure` | la structure de ton entraînement récent | vecue | feeling · intermittent · suivi | — | app/bridge (3) | **absente** |

### Références mesurées

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `ftp_known` | « connais-tu ta FTP » | vecue | oui · non | — | app/bridge,engine/weekDistances,engine/reasoningEngine (5) | 1 valeur(s) |
| `ftp` | ta FTP | mesuree | 50 à 600 | — | app/bridge,engine/weekDistances,engine/reasoningEngine (7) | 2 valeur(s) |
| `pace_known` | « connais-tu ton allure seuil » | vecue | oui · non | — | app/bridge,engine/weekDistances,engine/trailModel,engine/reasoningEngine (7) | 1 valeur(s) |
| `css_known` | « connais-tu ton CSS » | vecue | oui · non | — | app/bridge,engine/weekDistances,engine/swimContinuity,engine/reasoningEngine (6) | 1 valeur(s) |
| `vam_known` | « connais-tu ta VAM » | vecue | oui · non | — | engine/trailModel (1) | 1 valeur(s) |
| `vam` | ta VAM | mesuree | 200 à 2500 | — | engine/trailModel (1) | 1 valeur(s) |
| `hr_max` | ta FC max | mesuree | 120 à 230 | — | engine/reasoningEngine (1) | **absente** |
| `gear_test` | le test en tenue | vecue | oui · non | — | sports/swimrun/objective (1) | **absente** |

### Terrain et milieu

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `terrain` | ton terrain | vecue | plat · vallonne · montagne · route · trail · piste · mixte | — | engine/predictor,sports/bike/index (3) | 4 valeur(s) |
| `milieu` | ton milieu | vecue | bassin · ow · mixte | — | engine/swimContinuity,sports/swim/index (3) | 2 valeur(s) |
| `leg_swim_env` | le milieu de nage de ta course | vecue | bassin · lac · mer_calme · mer_agitee · eau_vive | — | engine/predictor (1) | 1 valeur(s) |
| `leg_bike_prof` | le profil du parcours vélo | vecue | plat · vallonne · montagne | — | engine/predictor (1) | **absente** |
| `leg_run_prof` | le profil du parcours à pied | vecue | plat · vallonne · montagne | — | engine/predictor (1) | **absente** |
| `treadmill` | l'accès au tapis | vecue | oui · non | — | engine/reasoningEngine,generator/planGenerator,generator/trailLibrary (3) | 2 valeur(s) |
| `openwater_access` | ton accès à l'eau libre | vecue | aucun · saisonnier · toute_annee | — | sports/swimrun/index (1) | 1 valeur(s) |
| `water_temp_c` | la température de l'eau | vecue | -2 à 35 | — | app/bridge,generator/planGenerator,sports/swimrun/objective (3) | 1 valeur(s) |

### Trail

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `race_distance_km` | la distance de ta course | vecue | 1 à 500 | — | engine/trailModel (1) | 2 valeur(s) |
| `race_dplus_m` ⚑requis | le D+ de ta course | vecue | 0 à 30000 | — | engine/trailModel,sports/swimrun/objective (2) | 2 valeur(s) |
| `race_technicity` | la technicité de ta course | vecue | roulant · mixte · technique · alpin | — | engine/trailModel (2) | 1 valeur(s) |
| `race_night` | la part de nuit | vecue | non · partielle · majoritaire | — | engine/trailModel,generator/trailLibrary (4) | 1 valeur(s) |
| `race_cutoff_h` | la barrière horaire | vecue | 1 à 200 | — | engine/trailModel (1) | **absente** |
| `train_dplus_access` | le dénivelé accessible | vecue | plat · collines · montagne | — | engine/trailModel,engine/reasoningEngine,generator/planGenerator,generator/trailLibrary (5) | 2 valeur(s) |
| `poles` | les bâtons | vecue | oui · non · a_decider | — | generator/trailLibrary (1) | 1 valeur(s) |
| `climb_dplus_m` | le D+ de ta dernière grosse montée | vecue | 50 à 3000 | — | engine/trailModel (1) | **absente** |
| `climb_min` | la durée de ta dernière grosse montée | vecue | 5 à 300 | — | engine/trailModel (1) | **absente** |

### Natation et swimrun

| clé | question | nature | domaine | défaut si absente | lue par | corpus |
|---|---|---|---|---|---|---|
| `swim_limit` | ta limite en natation | vecue | technique · respiration · endurance · peur | — | sports/swim/index (4) | **absente** |
| `longest_swim_known` | « connais-tu ta plus longue nage en continu » | vecue | oui · non | — | engine/swimContinuity (2) | 2 valeur(s) |
| `longest_swim_m` | ta plus longue nage | vecue | 50 à 10000 | — | engine/swimContinuity,sports/swimrun/objective (2) | 5 valeur(s) |
| `swim_continuous` | la nage en continu | vecue | oui · non | — | sports/swimrun/index (1) | **absente** |
| `run_continuous` | la course en continu | vecue | oui · non | — | sports/swimrun/index (1) | **absente** |
| `swim_total_m` | la nage totale de ta course | vecue | 100 à 30000 | — | sports/swimrun/objective (1) | 1 valeur(s) |
| `run_total_km` | la course totale de ton épreuve | vecue | 1 à 200 | — | sports/swimrun/objective (1) | 1 valeur(s) |
| `segments_n` | le nombre de segments | vecue | 2 à 60 | — | sports/swimrun/objective (1) | 1 valeur(s) |
| `team_mode` | solo ou binôme | vecue | solo · binome | solo | sports/swimrun/objective (1) | 1 valeur(s) |
| `team_swim_gap_sec` | l'écart de nage du binôme | mesuree | 0 à 120 | — | sports/swimrun/objective (1) | **absente** |

---

## 2. Les chaînes de décision — les six qui décident vraiment du plan

Les 64 questions ne pèsent pas le même poids. Six chaînes portent l'essentiel ; le reste
ajuste. Chacune est donnée de bout en bout : réponse → paramètre → borne → effet visible.

### 2.1 Combien de semaines — et le refus de générer

`race_date` fixe l'horizon. Chaque couple (sport, format) déclare un **minimum de semaines de
préparation** (`MIN_WEEKS`, `constraintMatrix.ts`) : tri 8 / 12 / 20 / 36 pour S / M / 70.3 /
Full ; course 6 / 8 / 12 / 16 pour 5 km / 10 km / semi / marathon ; trail 18.

Sous ce minimum, **le moteur refuse** et dit pourquoi (`answerSchema.ts`). Depuis R22 le refus
est **franchissable au-dessus d'un plancher dérivé** : on ne retire que des semaines de mise en
route, donc au plus la phase `base` (30 % du plan). Sous ce plancher, le refus est dur.

Sans date de course, la durée est celle de la borne minimale du format.

### 2.2 Les phases — et donc la forme de la courbe

Le plan est découpé en cinq phases à pourcentages fixes (`PHASE_PCTS`) : **base 30 %,
développement 25 %, spécifique 20 %, pic 15 %, affûtage 10 %**, avec deux plafonds absolus —
**pic ≤ 5 semaines, affûtage ≤ 3** (R13.6) — et une garantie d'au moins une semaine de pic
(`C19_PEAK_MIN_WEEKS`).

La durée d'affûtage dépend en outre du **format** (`TAPER_WEEKS_BY_FORMAT`) : 1 semaine sur un
5 km, 3 sur un marathon, 3 sur un ultra (`TAPER_WEEKS_BY_TRAIL_CAT`).

À chaque phase correspond une **bande de charge** (`BANDS`), en fraction du pic :

| phase | base | développement | spécifique | pic | affûtage |
|---|---|---|---|---|---|
| bande | 0,50 → 0,68 | 0,68 → 0,92 | 0,94 → 1,00 | 1,00 | 0,55 → 0,30 |

La descente d'affûtage est bornée par `R313_TAPER_MAX_VS_PEAK = 0,55` — **la réduction de
volume de Bosquet 2007**, la source la plus citée du moteur (11 occurrences dans `src/`).

### 2.3 Le volume — et ce qui le borne réellement

C'est la chaîne la plus longue, et celle que le produit AFFICHE (décision `R20.2`, « ce qui
borne ton volume »). Elle est un **minimum de plafonds parallèles**, puis un **produit de
facteurs** :

```
pic = min( volume demandé · historique · volume utile du format · capacité structurelle )
      × marge hors compétition × récupération × drapeau médical × blessure/âge
```

| maillon | d'où il vient | comment il agit |
|---|---|---|
| volume demandé | `vol_max` (1 à 40 h) | plafond direct |
| historique | `HISTORY_CAPS` croisé (sport, `history`, format) | ex. course/marathon : 8 h en reprise, 10 h confirmé, 12 h ancien |
| volume utile du format | table par format | au-delà, le format ne consomme plus le volume |
| **capacité structurelle** | **sonde V2.1** : le moteur SATURE une semaine clonée contre tous les plafonds de séance et regarde ce qu'elle peut contenir | c'est le maillon qui borne le plus souvent |
| marge | `MARGIN` : 1,0 en compétition, **0,9 sinon** | `intent` |
| récupération | `RECUP_FACTORS` : sommeil court ×0,85, charge de vie lourde ×0,9 | `sleep`, `life_load` |
| blessure / âge | `R6_INJURY_LOAD_FACTORS` (une zone ×0,9, plusieurs ×0,8) · `R6_AGE_LOAD` (mineur ×0,7 **et pas de VO2max**, master 60+ ×0,85 et récup toutes les 3 semaines) | `injury`, `age` |

Deux mécanismes s'ajoutent au-dessus :

- **la rampe de départ (R10)** — `vol_recent` fixe le point de départ : semaine 1 ≤ ×1,1 du
  volume récent, puis ≤ +10 %/semaine jusqu'à rejoindre la courbe ;
- **le plancher de départ (O-69)** — `O69_DEPART_PLANCHER = 0,85` : le plan ne démarre jamais
  sous 85 % du volume récent déclaré.

Et la progression est bornée semaine à semaine : **`C22_MAX_WEEKLY_GROWTH = 1,1`** — jamais
plus de +10 % d'une semaine de charge à la suivante, avec un seuil d'audit à +25 %
(`C22_AUDIT_HARD_JUMP`). Une semaine de décharge vaut **`RECUP_WEEK_FACTOR = 0,62`** de sa
voisine.

### 2.4 Le calendrier de la semaine

`dispo` et `off_days`/`off_which` décident des jours disponibles. Le schéma de semaine est une
liste de sept positions, chacune portant une **charge** et un **créneau** :

```
recup · dur1 · facileR · dur2 · facile2 · durLong · facileR
```

**Jamais deux jours durs adjacents** — c'est une des interdictions nommées de `FORBIDDEN`, avec
« deux longues sorties consécutives », « une récup plus chargée que la précédente » et « une
progression supérieure à la borne ».

La **cadence de récupération** vient de `history` (`RECUP_EVERY` : toutes les 3 semaines en
reprise, 4 sinon) et l'âge master la ramène à 3. Trois règles déplacent — **jamais ne
suppriment** — la décharge : une phase ne s'ouvre pas sur une décharge (C27a), pas de décharge
dans le pic tant que l'affûtage peut en tenir lieu (C27b), et un garde domine les trois : **aucune
règle de placement ne fait dépasser à l'athlète sa propre cadence** (R18.5).

`doubles` autorise deux séances le même jour ; `sessions_max` plafonne le nombre de séances,
croisé avec une durée moyenne par sport (`AVG_SESSION_H` : course 1,15 h, vélo 1,3 h, tri 1,2 h).

### 2.5 L'intensité — le plafond est un TEMPS, pas une part

C26 déclare que la grandeur physiologique est le **plafond de temps DUR hebdomadaire**, et que
la part de facile n'en est que la conséquence.

| borne | valeur | pilotée par |
|---|---|---|
| temps dur / semaine | **60 min**, tolérance ×1,1 | `C26_HARD_TIME_CAP_MIN`, `C26c_HARD_TIME_TOLERANCE` |
| … chez le débutant | **25 min** | `C26b_HARD_TIME_BEGINNER_MIN` |
| … selon l'historique | reprise **35**, confirmé/ancien 60 | `C26b_HARD_TIME_BY_HISTORY` |
| … sous blessure | ×0,6 | `C26b_INJURY_FACTOR` |
| temps MODÉRÉ / semaine | ≤ 40 % | `C26d_MOD_SHARE_MAX` |
| part de facile | 60 à 70 % | `C26_EASY_SHARE_MIN/MAX` |

Le temps dur est pondéré par discipline (`HARD_DISC_WEIGHT` : course 1, vélo 0,75, natation
0,5) — l'impact n'est pas le même pour la même minute.

Quand la coupe mord, elle retire des **répétitions, jamais la durée d'une répétition** — dans un
intervalle, la durée EST le stimulus. Sous le plancher, la séance est **déclassée en endurance
et change de nom**, jamais rabotée en gardant son titre.

Deux plafonds de dose bornent la séance elle-même : **seuil 40 min, VO2max 25 min**
(`DOSE_CAP_MIN`), avec une exemption nommée pour l'allure marathon (`DOSE_EXEMPT`), qui est
sous le seuil.

### 2.6 La sécurité — ce qui bloque, et ce qui informe

Le manifeste range **santé › prévention › régularité › progression › performance**, et la
décision O-17 sépare deux régimes : **informer plutôt que bloquer, sauf mise en danger réelle**.

**Ce qui BLOQUE, sans négociation** — le point commun est que l'athlète ne peut pas évaluer le
risque, ou que l'erreur est irréversible :

| blocage | déclencheur |
|---|---|
| drapeau médical | `med_pain`, `med_dizzy`, `med_treat` — l'intensité est retirée, et un **filet** au point de convergence énumère ce qui est PERMIS plutôt que ce qui est interdit |
| drapeau douleur | signalé en cours de plan — verdict rouge forcé, qualité verrouillée, levée sur confirmation |
| mineur × format | `age` < 18 croisé au format (R15.7-C) : refus typé qui nomme la règle d'inscription et propose le format accessible |
| garde IMC | poids/taille hors bornes |
| âge de l'estimation énergétique | < 16 ans : l'estimation journalière se retire, **le ravitaillement d'effort reste servi** (O-16) |
| course sous le plancher de préparation | R11.4 borné par R22 |
| bornes physiologiques | `PHYSIO_BOUNDS` : FTP 50-600 W, FC max 120-230, poids 25-250 kg… |

**Tout le reste informe** — canal `warnings`, R11.2.

Les **contre-indications par zone** (`R6_PAIN_CONTRAINDICATION`) changent la DISCIPLINE, pas
seulement la charge : tibia interdit la course et préfère nage/vélo ; genou interdit course ET
vélo et préfère la nage ; épaule agit sur la natation.


---

## 3. Sport par sport — le vocabulaire réellement livré

Ce qui suit n'est pas lu dans le code : c'est **mesuré sur les plans produits** pour les
1 016 profils. Pour chaque sport : la répartition des disciplines livrées, ce que chaque créneau
contient réellement, et les durées observées (minimum · médiane · maximum) des types les plus
fréquents.

**Comment lire un créneau** : `dur1` est la qualité principale du sport · `dur2` la seconde
qualité · `durLong` la séance signature (longue ou enchaînement) · `facileR` et `facile2` les
deux créneaux faciles · `recup` la décharge.

### bike — 175 profils
disciplines : bk 100%
- `dur1`        2530 séances : VO2max 60% · Sweetspot 36% · Tempo progressif 4% · Sweetspot contrôlé (genou épargné) 1% · Vélo endurance 0% · Endurance facile 0% · +1 autres
- `dur2`        2503 séances : Force basse cadence 45% · Seuil / race-pace 32% · Rappel race-pace 9% · Force en côte 7% · Spécifique CLM (position) 6% · Seuil position détendue (genou épargné) 1% · +2 autres
- `durLong`     2532 séances : Sortie longue 100% · Déverrouillage (veille de course) 0% · Endurance allégée (avant course) 0%
- `facile2`     3725 séances : Récup active 100%
- `facileR`     6965 séances : Endurance facile 100% · Entretien (affûtage) 0% · Endurance allégée (semaine de course) 0% · Déverrouillage (veille de course) 0%

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Endurance facile                   n= 6956  min 5 · méd 62 · max 207
    Récup active                       n= 3725  min 7 · méd 35 · max 60
    Sortie longue                      n= 2520  min 35 · méd 159 · max 360
    VO2max                             n= 1509  min 19 · méd 36 · max 62
    Force basse cadence                n= 1118  min 20 · méd 41 · max 62
    Sweetspot                          n=  900  min 19 · méd 26 · max 86
    Seuil / race-pace                  n=  796  min 19 · méd 42 · max 74
    Rappel race-pace                   n=  225  min 19 · méd 20 · max 44

### duathlon — 150 profils
disciplines : rn 42% · bk 41% · br 17%
- `dur1`        2784 séances : VO2max course 59% · Seuil progressif 26% · Seuil doux 11% · Seuil course (surface souple) 2% · Footing endurance 1% · Endurance facile 0% · +1 autres
- `dur2`        2730 séances : Seuil vélo (jambes entamées) 39% · Force basse cadence 29% · VO2max vélo 24% · Rappel race-pace 8%
- `durLong`     2781 séances : Sortie longue vélo 58% · Brick R1 → vélo (pré-fatigue) 23% · Brick vélo → R2 (transition) 15% · Brick d'affûtage (rappel vélo → R2) 3% · Déverrouillage (veille de course) 0% · Endurance allégée (avant course) 0%
- `facile2`     4141 séances : Vélo récup 100%
- `facileR`     7804 séances : Footing facile 100% · Entretien (affûtage) 0% · Cross-training vélo 0% · Endurance allégée (semaine de course) 0% · Déverrouillage (veille de course) 0%

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Footing facile                     n= 7776  min 5 · méd 50 · max 175
    Vélo récup                         n= 4141  min 7 · méd 34 · max 60
    VO2max course                      n= 1647  min 18 · méd 47 · max 71
    Sortie longue vélo                 n= 1601  min 35 · méd 154 · max 443
    Seuil vélo (jambes entamées)       n= 1052  min 27 · méd 53 · max 75
    Force basse cadence                n=  803  min 20 · méd 41 · max 62
    Seuil progressif                   n=  729  min 19 · méd 27 · max 67
    Brick R1 → vélo (pré-fatigue)      n=  646  min 59 · méd 215 · max 332

### run — 156 profils
disciplines : rn 99% · bk 1%
- `dur1`        2194 séances : VO2max 58% · Seuil progressif 29% · Seuil doux 11% · Footing endurance 1% · Endurance facile 1% · Seuil contrôlé (genou épargné) 1% · +1 autres
- `dur2`        2091 séances : Allure course spécifique 38% · Allure spécifique 31% · Endurance soutenue 31% · Déverrouillage (veille de course) 0%
- `durLong`     2248 séances : Sortie longue 99% · Déverrouillage (veille de course) 0% · Endurance allégée (avant course) 0%
- `facile2`     2779 séances : Footing récup 98% · Endurance vélo — travail de cadence (sans impact) 2%
- `facileR`     3772 séances : Footing facile 94% · Entretien (affûtage) 3% · Cross-training vélo 1% · Endurance vélo — travail de cadence (sans impact) 1% · Endurance allégée (semaine de course) 0% · Back-to-back (jour 2, jambes fatiguées) 0% · +1 autres

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Footing facile                     n= 3557  min 5 · méd 76 · max 180
    Footing récup                      n= 2731  min 7 · méd 51 · max 60
    Sortie longue                      n= 2235  min 21 · méd 111 · max 180
    VO2max                             n= 1264  min 19 · méd 45 · max 71
    Allure course spécifique           n=  791  min 23 · méd 114 · max 177
    Allure spécifique                  n=  658  min 25 · méd 63 · max 140
    Endurance soutenue                 n=  641  min 27 · méd 63 · max 143
    Seuil progressif                   n=  627  min 19 · méd 45 · max 56

### swim — 139 profils
disciplines : sw 100%
- `dur1`        1607 séances : Seuil CSS 79% · Technique + éducatifs 13% · Seuil technique CSS 7% · Seuil contrôlé (épaule) 1%
- `dur2`        1558 séances : Vitesse 80% · Endurance technique 12% · Endurance + touches de vitesse 8% · Jambes vitesse (épaule épargnée) 0% · Jambes + technique 0%
- `durLong`     1435 séances : Longue continue 90% · Volume aérobie 10% · Déverrouillage (veille de course) 0%
- `facile2`     2174 séances : Récup eau 100%
- `facileR`     4313 séances : Technique souple 99% · Entretien (affûtage) 1% · Endurance allégée (semaine de course) 0%

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Technique souple                   n= 4265  min 4 · méd 16 · max 26
    Récup eau                          n= 2174  min 3 · méd 16 · max 24
    Longue continue                    n= 1285  min 8 · méd 47 · max 91
    Seuil CSS                          n= 1274  min 8 · méd 27 · max 43
    Vitesse                            n= 1242  min 8 · méd 24 · max 36
    Technique + éducatifs              n=  204  min 9 · méd 18 · max 21
    Endurance technique                n=  183  min 11 · méd 13 · max 18
    Volume aérobie                     n=  149  min 5 · méd 13 · max 17

### swimrun — 139 profils
disciplines : rn 42% · br 33% · sw 25%
- `dur1`        1619 séances : Seuil CSS + plaquettes 50% · Nage continue longue (répétition de la plus longue nage) 28% · Technique + aisance en tenue 21% · Nage seuil contrôlé (épaule épargnée) 1% · VO2max sur sentier 0% · Déverrouillage (veille de course) 0%
- `dur2`        1620 séances : Seuil course sur sentier 62% · VO2max sur sentier 36% · Seuil course (surface souple) 1% · VO2max en nage (zone fragile épargnée) 1% · Déverrouillage (veille de course) 0%
- `durLong`     1631 séances : Swimrun spécifique (20 transitions) 52% · Swimrun spécifique (18 transitions) 12% · Swimrun spécifique (16 transitions) 11% · Swimrun spécifique (14 transitions) 11% · Swimrun spécifique (10 transitions) 9% · Swimrun spécifique (12 transitions) 3% · +3 autres
- `facile2`     2315 séances : Acclimatation au froid (bassin / douche) 51% · Nage récup + technique 49% · Endurance allégée (avant course) 0%
- `facileR`     2065 séances : Footing facile 98% · Entretien (affûtage) 1% · Endurance allégée (semaine de course) 0% · Déverrouillage (veille de course) 0%

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Footing facile                     n= 2030  min 27 · méd 69 · max 150
    Acclimatation au froid (bassin / douche) n= 1177  min 6 · méd 28 · max 82
    Nage récup + technique             n= 1137  min 13 · méd 39 · max 60
    Seuil course sur sentier           n= 1009  min 20 · méd 39 · max 73
    Swimrun spécifique (20 transitions) n=  849  min 70 · méd 130 · max 260
    Seuil CSS + plaquettes             n=  810  min 12 · méd 34 · max 34
    VO2max sur sentier                 n=  582  min 19 · méd 36 · max 45
    Nage continue longue (répétition de la plus longue nage) n=  458  min 26 · méd 37 · max 39

### trail — 58 profils
disciplines : rn 99% · bk 1%
- `dur1`        1518 séances : Côtes courtes (initiation) 28% · Seuil ascensionnel 26% · Côtes courtes (VAM) 23% · Montées à l'allure de course 14% · Rappels de côte (affûtage) 7% · Tapis incliné (substitut de dénivelé) 1% · +1 autres
- `dur2`        1482 séances : Descente technique 58% · Descente en charge 39% · Renfo excentrique (protection) 3% · Déverrouillage (veille de course) 0%
- `durLong`     1528 séances : Sortie longue trail 59% · Longue trail + ravito réel 40% · Endurance allégée (avant course) 0% · Déverrouillage (veille de course) 0%
- `facile2`     1933 séances : Footing récup 58% · Back-to-back (sur jambes fatiguées) 38% · Endurance vélo — travail de cadence (sans impact) 2% · Cross-training vélo en côte (sans impact) 1% · Footing plat de récupération (post-descente) 0%
- `facileR`     2267 séances : Marche rapide en montée (bâtons) 67% · Sortie de nuit (frontale) 19% · Footing plat + renfo excentrique 9% · Cross-training vélo en côte (sans impact) 3% · Entretien (affûtage) 1% · Marche rapide en montée 1% · +2 autres

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Marche rapide en montée (bâtons)   n= 1514  min 15 · méd 58 · max 171
    Footing récup                      n= 1126  min 6 · méd 26 · max 60
    Sortie longue trail                n=  909  min 32 · méd 144 · max 317
    Descente technique                 n=  858  min 18 · méd 129 · max 281
    Back-to-back (sur jambes fatiguées) n=  744  min 28 · méd 62 · max 134
    Longue trail + ravito réel         n=  615  min 60 · méd 205 · max 317
    Descente en charge                 n=  580  min 44 · méd 112 · max 274
    Sortie de nuit (frontale)          n=  437  min 19 · méd 112 · max 176

### tri — 195 profils
disciplines : rn 42% · bk 25% · br 17% · sw 15%
- `dur1`        3989 séances : VO2max vélo 50% · Sweetspot vélo 29% · Rappel race-pace 9% · Tempo vélo 7% · Nage seuil (+dist) (matin) 4% · Vélo endurance 1% · +3 autres
- `dur2`        3908 séances : Allure course (tri) 37% · Force basse cadence 30% · Sweetspot vélo 23% · Rappel allure course CAP 8% · Endurance vélo 2% · Nage aérobie + accélérations 0% · +1 autres
- `durLong`     4029 séances : Brick vélo+CAP 38% · Sortie longue CAP 36% · Sortie longue vélo 20% · Brick d'affûtage (rappel de transition) 4% · Déverrouillage (veille de course) 1% · Endurance allégée (avant course) 0%
- `facile2`     5544 séances : Nage aérobie + accélérations 34% · Nage seuil (+dist) 29% · Nage éducatifs 18% · Rappel nage course 6% · Nage récup courte 5% · Nage continue — 3800 m d'affilée 1% · +40 autres
- `facileR`    11425 séances : Footing facile 75% · Sortie longue CAP 13% · Nage aérobie + accélérations 10% · Nage éducatifs 1% · Nage seuil (+dist) 0% · Endurance facile 0% · +12 autres

**Durées observées (min · médiane · max), les 8 types les plus fréquents :**

    Footing facile                     n= 8552  min 4 · méd 45 · max 122
    Nage aérobie + accélérations       n= 3038  min 15 · méd 31 · max 210
    Sortie longue CAP                  n= 2868  min 26 · méd 80 · max 140
    Sweetspot vélo                     n= 2036  min 19 · méd 54 · max 108
    VO2max vélo                        n= 2003  min 19 · méd 52 · max 73
    Nage seuil (+dist)                 n= 1652  min 18 · méd 53 · max 77
    Brick vélo+CAP                     n= 1550  min 53 · méd 191 · max 370
    Allure course (tri)                n= 1469  min 23 · méd 58 · max 68


### Ce que la mesure par sport fait apparaître

- **Le trail et le swimrun déclarent leur PROPRE schéma de semaine** (`sports/trail/index.ts:38`,
  `sports/swimrun/index.ts:374`) ; les cinq autres partagent le schéma générique. C'est la seule
  différence STRUCTURELLE entre sports : tout le reste est du contenu.
- **Le trail raisonne à trois axes** — temps, D+ et D− — et non un seul : c'est le seul sport où
  l'intensité dépend de la PENTE (VAM en montée, consigne technique sans chiffre en descente),
  et sa catégorie d'effort est **déduite** des données de course, jamais déclarée.
- **En triathlon, `facileR` porte trois disciplines** (footing 75 %, longue CAP 13 %, nage
  10 %) et `facile2` en porte une seule (nage). C'est le créneau « typé » du sport.
- **Le `durLong` du triathlon bascule par phase** : sortie longue en base/développement, brick
  en spécifique/pic.

---

## 4. Table de correspondance — « si un profil répond X, quoi ? »

Vue d'ensemble : la réponse, le paramètre qu'elle déplace, la règle qui la borne, et l'effet
visible dans le plan.

| réponse | paramètre déplacé | borné par | effet visible |
|---|---|---|---|
| `intent = competition` | marge de volume 0,9 → **1,0** | `MARGIN` | +11 % de volume sur tout le plan |
| `level = debutant` | plafond de temps dur **25 min** (au lieu de 60) · plafond de séance nage **850 m** · longue plafonnée **180 min** | `C26b`, `C15`, `C23` | moins de qualité, séances de nage courtes, longue bornée |
| `history = reprise` | plafonds d'historique les plus bas · récup **toutes les 3 semaines** · au plus **4 jours de course** · temps dur **35 min** | `HISTORY_CAPS`, `RECUP_EVERY`, `MAX_RUN_DAYS`, `C26b` | plan plus court, plus de décharges |
| `history = ancien` | plafonds les plus hauts · **6 jours de course** · facteur temps d'eau **0,70** | idem, `SWIM_TIME_FACTOR_BY_HISTORY` | plan plus dense |
| `vol_max` élevé | plafond direct — **mais** la capacité structurelle domine souvent | chaîne R20.2 | au-delà d'un seuil, augmenter ne change plus rien ; le produit le DIT (décision `R20.2`) |
| `vol_recent = 0` | rampe de départ depuis zéro | R10, `O69_DEPART_PLANCHER` | semaine 1 très basse, montée ≤ +10 %/sem |
| `sessions_max` bas | nombre de séances plafonné | `AVG_SESSION_H` | moins de créneaux, séances plus longues |
| `dispo = quotidienne` | plus de jours utilisables | schéma de semaine | plus de créneaux faciles |
| `doubles = oui` | deux séances possibles le même jour | schéma | c'est le seul levier qui AJOUTE des créneaux |
| `off_days = oui` + 2 jours bloqués | jours retirés + **avertissement** | `answerSchema.ts:612` | plan sous l'objectif, et le produit le dit |
| `injury` (1 zone) | charge ×0,9 · discipline changée selon la zone | `R6_INJURY_LOAD_FACTORS`, `R6_PAIN_CONTRAINDICATION` | ex. genou : course ET vélo retirés, nage privilégiée |
| `age` < 18 | charge ×0,7 · **aucune VO2max** · format refusé si trop long | `R6_AGE_LOAD`, R15.7-C | plan sans intensité maximale |
| `age` ≥ 60 | charge ×0,85 · récup toutes les 3 semaines | `R6_AGE_LOAD` | plus de décharges |
| drapeau médical | intensité retirée partout, filet au point de convergence | `enforceMedicalHold` | plan d'entretien, motif affiché |
| `sleep = court` / `life_load = lourde` | ×0,85 / ×0,9 sur le volume | `RECUP_FACTORS` | plan allégé, cause nommée |
| `terrain = montagne` | prédiction de course ajustée (+27 % mesuré sur 90 km) | `cyclingSpeed.ts` (Martin 1998) | chrono annoncé, pas la charge |
| `swim_limit` | contenu des séances de nage | `sports/swim/index.ts` | technique vs volume |
| `longest_swim_m` | paliers de progression B-17 · plafond hebdo d'épaule (O-85) | `swimContinuity.ts` | progression annoncée en mètres |
| `treadmill = oui` | substitut de dénivelé accepté | `trailLibrary.ts` | tapis incliné au lieu de côtes |
| `race_date` proche | refus, ou **préparation tronquée** au-dessus du plancher | R11.4 + R22 | refus motivé avec deux issues |

---

## 5. Points d'attention pour la Phase 2 — signalés, pas jugés

Ce sont des observations **mesurées**, formulées comme des questions à poser à un expert. Aucune
n'est présentée comme un défaut établi.

### 5.1 Une question posée dont aucune ligne ne lit la réponse

**`activity`** (« ton activité quotidienne » : `sedentaire` · `modere` · `actif`) n'a **zéro
lecteur** dans tout `src/` — vérifié : 0 occurrence dans `src/nutrition/energyEstimator.ts` comme
dans `nutritionCalculator.ts`. Le banc de sensibilité l'exempte avec la raison « N8/N9 —
estimation de dépense » ; or l'estimateur applique une bande d'activité **constante** de
1,35 à 1,55 (`energyEstimator.ts:149`), identique pour un sédentaire et pour un actif.
**L'exemption dit ce que la clé devrait faire, pas ce que le code fait.**

### 5.2 Une exemption devenue périmée

`banc_sensibilite.cjs:139` exempte encore **`shift_ok`**, clé retirée du schéma le 25/08/2026.
L'entrée est inerte, mais une liste d'exemptions qui garde des clés mortes perd sa valeur de
relecture.

### 5.3 Une question qui n'atteint jamais le générateur

**`off_days`** n'est lue qu'au contrat d'entrée (`answerSchema.ts:612`) : elle sert de **porte**
à `off_which` et déclenche un avertissement. Le plan n'est modifié que par `off_which`. Ce n'est
pas un défaut — c'est une question de structure de questionnaire — mais un lecteur qui cherche
« où `off_days` agit sur le plan » ne trouvera rien.

### 5.4 Trois grandeurs auto-déclarées qui pilotent des nombres

Le contrat sépare `vecue` / `mesuree` / `estimee` et pose que l'`estimee` **ne pilote pas une
grandeur numérique**. Mesuré : **`level`** est déclarée `estimee` et pilote pourtant des
constantes chiffrées — plafond de temps dur (25 min), plafond de séance nage (850 m), plafond
de longue (180 min). La règle et l'usage divergent ; le code l'assume peut-être (un plafond de
sécurité vers le BAS n'est pas la même chose qu'une promesse de performance), mais **ce n'est
écrit nulle part**, et c'est exactement la distinction qu'un expert doit trancher.

### 5.5 Des plafonds dont la source n'est pas citée

Les constantes SOURCÉES le sont bien : `R313_TAPER_MAX_VS_PEAK` (Bosquet 2007),
`cyclingSpeed` (Martin 1998), la nutrition (ACSM, ISSN, Jeukendrup, FAO/WHO), la projection
(Barnes & Kilding 2015), le back-to-back (Nielsen 2014), la VFC (Plews 2013). En revanche, ces
valeurs-ci **portent leur justification mais pas de référence externe** :

`C22_MAX_WEEKLY_GROWTH = 1,1` · `RECUP_WEEK_FACTOR = 0,62` · `C26_HARD_TIME_CAP_MIN = 60` ·
`C26b_HARD_TIME_BEGINNER_MIN = 25` · `DOSE_CAP_MIN` (seuil 40, VO2 25) ·
`HARD_DISC_WEIGHT` (1 / 0,75 / 0,5) · `SWIM_TIME_FACTOR` (0,45-0,70) · `C24_MIN_SWIM_SESSION_M`
(750) · `O81_FOOTING_CIBLE_PIC_MIN` (50) · `O88_NB_ACCELERATIONS` (10) · `ALLOC_CIBLE`
(vélo 50 / course 30 / nage 20).

Ce sont les nombres à faire relire en priorité en Phase 2 : ils sont défendables, ils ne sont
pas référencés.

### 5.6 Une cible d'allocation qui n'existe que pour un sport

`ALLOC_CIBLE` ne contient que `tri`. Les six autres sports n'ont **aucune cible de répartition
entre disciplines** — pour le duathlon et le swimrun, qui sont multi-disciplines, la répartition
livrée est donc une conséquence du schéma, pas une intention. Mesuré : duathlon
course 42 / vélo 41 / brick 17 ; swimrun course 42 / brick 33 / nage 25.

### 5.7 Une fenêtre de séance de nage très étroite chez le débutant

Le plancher de séance piscine vaut **600 m** chez le débutant (`C24b`) et **750 m** ailleurs
(`C24`), contre un plafond débutant de **850 m** (`C15`). La fenêtre du débutant est donc
**[600 ; 850] m — 250 m de latitude**, et le code la nomme lui-même
(`constraintMatrix.ts:216-217`). Ce n'est pas une incohérence ; c'est une marge de manœuvre
étroite dont un expert peut dire si elle est la bonne.

⚠ **Une affirmation que j'ai écrite puis retirée avant de la publier** : j'avais noté que
`C26_EASY_SHARE_MIN` (60 %) et `C26d_MOD_SHARE_MAX` (40 %) « sommaient à 100 % et ne laissaient
rien au dur ». **C'est faux** — le premier est un PLANCHER sur le facile, le second un PLAFOND
sur le modéré : « facile ≥ 60 % » et « modéré ≤ 40 % » autorisent parfaitement 60 / 0 / 40. La
contrainte réelle sur le dur est le plafond de TEMPS (`C26`), pas une part. Je la laisse écrite
parce que c'est le genre de faux positif qu'une relecture d'expert produira aussi, et qu'il vaut
mieux qu'il soit déjà réfuté.


---

## 6. Couverture du corpus — ce que les 1 016 profils exercent, et ce qu'ils n'exercent pas

Le dépôt pose qu'**un corpus se juge sur l'espace des DÉCISIONS, pas sur celui des saisies**
(A-2). L'outil qui le mesure existe (`npm run couverture:golden`) : il ne croise que les couples
de clés que le CODE lit ensemble, dérivés par co-occurrence.

**Résultat global : 2 297 cellules décisionnelles peuplées sur 4 192 — 55 %.**

| sport | profils | couples décisionnels | cellules peuplées |
|---|---|---|---|
| tri | 196 | 87 | 424 / 805 — **53 %** |
| trail | 59 | 73 | 313 / 550 — **57 %** |
| … (les cinq autres sont dans la sortie de l'outil) | | | |

### 6.1 Dix-neuf clés déclarées n'apparaissent dans AUCUN profil

`activity` · `climb_dplus_m` · `climb_min` · `gear_test` · `hr_max` · `leg_bike_prof` ·
`leg_run_prof` · `life_load` · `med_dizzy` · `med_pain` · `med_treat` · `race_cutoff_h` ·
`run_continuous` · `sleep` · `swim_continuous` · `swim_limit` · `team_swim_gap_sec` ·
`training_structure` · `weight_target`

Le moteur applique donc son **défaut** pour toutes — ce qui est un comportement testé en soi,
mais signifie que **les branches non-défaut de ces dix-neuf clés ne sont photographiées par
aucun profil du golden**. Trois d'entre elles portent des garde-fous de sécurité (`med_pain`,
`med_dizzy`, `med_treat`) ; elles sont couvertes ailleurs — par le banc externe multi-sport
`audit:v7`, qui balaie 4 580 profils en fuzz seedé et qui est précisément l'outil qui a trouvé
un contournement du drapeau médical. **Mais aucune photo du golden ne les fige.**

### 6.2 Vingt-quatre clés n'ont qu'UNE seule valeur dans tout le corpus

`css_known` · `cycle_len` · `cycle_start` · `cycle_sync` · `doubles` · `ftp_known` · `height` ·
`leg_swim_env` · `off_which` · `openwater_access` · `pace_known` · `poles` · `race_night` ·
`race_technicity` · `races` · `run_total_km` · `segments_n` · `swim_total_m` · `team_mode` ·
`vam` · `vam_known` · `water_temp_c` · `weight_lever`

Trois méritent d'être nommées :

- **`ftp_known`, `pace_known`, `css_known` valent « oui » pour les 1 016 profils.** Le chemin
  « je ne connais pas ma référence » — celui qui fait basculer tout le moteur sur les zones de
  fréquence cardiaque et le ressenti — **n'est photographié par aucun plan du golden.**
- **`races` vaut « non » partout** : la branche « courses intermédiaires » (R10) n'est
  photographiée que par les deux profils datés de la passe dédiée.
- **`doubles` vaut « oui » sur les 38 profils qui le déclarent, jamais « non » ni « parfois »**
  parmi ceux-là.

### 6.3 Ce que ça veut dire pour la Phase 2

Le corpus couvre très bien ce pour quoi il a été construit — les **formats**, les **niveaux**,
les **historiques**, les **intentions**, les **allures** — et il couvre mal les branches qu'une
règle apprend à lire APRÈS coup. C'est exactement le mode de défaillance qu'A-2 a nommé : *« un
corpus incomplet rend des résultats verts »*. Un expert qui veut vérifier une règle doit d'abord
demander si le couple qu'elle lit est peuplé.

---

## 7. Ce que ce document ne contient pas

- **Aucun jugement physiologique.** « 60 min de dur par semaine » est décrit, jamais évalué.
- **Aucune correction.** `src/` est byte-identique.
- **Les cinq autres sports du §6** : la sortie complète de `couverture:golden` les liste, elle
  est reproductible en une commande.
- **Le détail bloc par bloc d'une séance** (échauffement, corps, retour au calme, récupération
  inter-blocs) : il vit dans les modules de sport et mériterait sa propre carte si la Phase 2 le
  demande.
