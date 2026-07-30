# R10 — défauts découverts pendant l'extraction

Registre imposé par la spec R10 (§ non-objectifs) : tout défaut trouvé pendant une phase est
**noté ici et corrigé après**, dans un commit séparé, jamais mélangé à une extraction
mécanique. Un écart au golden master doit toujours pouvoir s'expliquer par un changement
VOULU.

| id | phase | défaut | statut |
|---|---|---|---|
| D10-1 | 0 (corrigé) | Le harnais d'audit (`src/audit/runV2Audit.ts`) déclare encore `run: [… "trail"]` et **aucun** `sport: "trail"`. Depuis R7 le trail est un sport : les 486 combinaisons auditent donc un format `run/trail` qui n'existe plus dans l'UI, et n'auditent jamais le vrai module trail (couvert seulement par le banc v6 et l'E2E). **Corrigé** : le format `run/trail` disparaît, le sport `trail` prend sa place avec de vraies données de course (62 km / 3 200 m D+) — 486 combinaisons inchangées, trail à 0 violation dure, score 100. | corrigé |
| D10-2 | 0 | La spec annonce « le harnais `audit:v2` couvre déjà 10 800 configurations » : il en couvre **486** (4 sports × formats × 3 historiques × 3 niveaux × 3 intentions). Le golden master balaye donc un espace explicitement élargi (voir `scripts/goldenMaster.mjs`), sans prétendre à 10 800. | résolu par construction |
| D10-3 | 0 | `applyRunImpactCap()` sort si `sport !== "run"` : le **trail** (impact + charge excentrique) n'est donc pas plafonné en jours d'impact depuis R7. Le drapeau `guards.runImpactCap` de la phase 1 corrige la cause ; le comportement change alors pour le trail — écart au golden master **voulu**, validé séparément. | corrigé |
| D10-4 | 0 | **Les deux tables de plafonds avaient déjà divergé** : `steps.js` annonçait `bike/reprise/route = 8h`, `cyclo 9h`, `clm 7h`, `gravel 11h` là où le moteur applique `9 / 11 / 8 / 13`. Les règles pédagogiques mentaient donc sur les plafonds réellement appliqués, dans le sens le plus trompeur (sous-annoncer ce que le plan prescrit). Réconcilié en phase 0 : `EBV2.volumeCaps` est la source unique. Les chiffres AFFICHÉS changent (ils deviennent vrais) ; les plans, eux, sont inchangés — golden master à 0 écart. | corrigé (phase 0) |
| D10-5 | 0 | `plan-view.js:downloadPlan()` appelait `buildPlan()` une SECONDE fois : l'export HTML pouvait donc différer du plan affiché, et un échec de génération y passait inaperçu. Bascule sur `ensurePlan()` (le plan affiché). | corrigé (phase 0) |
| D10-6 | 0 (corrigé) | **Le modèle de charge ne connaissait pas les zones trail.** `tr.vam` / `tr.asc` / `tr.flatthr` ne portent aucun des suffixes de `HARD_SUFFIX` (`.vo2`, `.thr`, …) : tout le travail trail tombait en « facile ». Mesure avant correction : **100 % de facile** sur les 27 profils trail — la répartition 80/20 affichée à l'athlète et le garde-fou de polarisation étaient donc AVEUGLES sur tout un sport depuis R7. Classement ajouté par ce que l'effort coûte (VAM/seuils = dur, allure de course en montée = modéré, marche et footing = facile) ; la descente reste hors intensité, sa charge est portée par l'axe D− (T2b) — la compter deux fois serait faux. | corrigé |
| D10-7 | 1 (corrigé) | **22 jours de plan trail étaient COMPLÈTEMENT VIDES.** Plusieurs passes (anti-collage, garde de polarisation, C18b) reconstruisent les séances d'un jour via `buildSessions(...)` — qui, pour un plan trail, ne matchait AUCUNE branche (`sp === "trail"` n'existait pas dans `sessionLibrary`) et retournait un tableau VIDE. Résultat mesuré sur un profil trail à petit volume : 22 jours (tous les jeudis, le jour de descente) sans aucune séance. Le registre corrige la cause : le dispatch connaît tous les sports par construction. Seul écart au golden master de la phase 1, et c'est une CORRECTION. | corrigé |
| D10-8 | 1 (noté) | Le créneau facile de repli du trail est `facileR` (héritage de `sport === "run" ? "facile2" : "facileR"`, qui ne connaissait que la course). Pour un traileur, `facile2` (footing court de récup) serait sans doute plus juste qu'une séance facile pleine. Non touché : l'extraction devait rester mécanique — c'est une décision d'entraînement, à trancher pour elle-même. | ouvert |
| D10-9 | 1 (noté) | Le bundle (`npm run build:app`) concatène tous les modules dans UNE portée : un nom de fonction dupliqué au niveau racine écrase silencieusement l'autre. Rencontré pendant la phase 1 (un `buildSessions` local dans le module trail a remplacé le dispatch — l'auto-test du bundle l'a attrapé). Aucun garde-fou n'empêche la prochaine collision : à ajouter (détection de doublons dans `buildApp.mjs`). | ouvert |
| D10-10 | 2 (corrigé) | **Le générateur pouvait produire ce que l'auditeur interdit.** Les bornes de brick vélo (spec audit 2, « jamais dépassées, même de peu ») existaient en DEUX exemplaires : une table dans l'auditeur, et un plancher en dur de 32 min dans `blockBounds`. Le scaling R3.3 pouvait donc descendre un brick sous la borne auditée. Découvert en ajoutant le duathlon (12 violations dures sur les profils S/reprise), mais le défaut n'était pas duathlon : la correction (source unique `BRICK_BIKE_BOUNDS`, plancher = borne basse du format) **supprime aussi une violation dure préexistante sur un plan tri Full à petit volume**. Un vélo de duathlon S faisant 20 km comme un tri S, il hérite des mêmes bornes auditées — c'est le générateur qui s'aligne sur la spec, jamais l'inverse. | corrigé |
| D10-11 | 3 (corrigé) | **Le classifieur d'intensité forçait « modéré » sur TOUT leg de course**, y compris quand une zone `easy` était explicitement déclarée. La règle venait du brick tri (dont le leg course n'a pas de zone : « allure cible » implicite). Conséquence sur le swimrun, dont les segments de course sont en endurance déclarée : 61 % de temps facile mesuré, soit une VIOLATION DURE (<70 %) sur un plan en réalité polarisé. Corrigé : la zone déclarée prime toujours sur l'indice. Aucun changement pour le tri ni le duathlon (leurs legs sans zone restent modérés) — golden master à 0 écart hors swimrun. | corrigé |
| D10-12 | 3 (corrigé) | **`blockBounds` ne connaissait que `rn`/`bk`/`sw` pour les séances longues** : une longue portant `d:"br"` (enchaînement multi-disciplines) tombait dans le cas par défaut `cap: 9999` — sans aucune borne. La courbe de charge pouvait donc gonfler la séance pivot swimrun sans limite : 89 profils sur 108 avec une longue > 55 % du volume hebdo. Corrigé par des bornes portées par les steps (+ un plafond relatif à la semaine en cours) et par un cas « bornes PAR RÉPÉTITION » : le plancher « séance digne » de 30 min n'a aucun sens sur un segment de 8 min répété 10 fois. Score swimrun 87 → 99, alertes 89 → 0. | corrigé |
| D10-13 | 3 (corrigé) | Le rendu « brick » supposait un leg VÉLO **et** un leg COURSE : un enchaînement d'une autre forme (swimrun : nage ↔ course, N fois) levait un TypeError. Le rendu générique prend le relais quand les deux legs attendus ne sont pas là — et la séance pivot n'est de toute façon PAS un brick, la spec le dit explicitement. | corrigé |

## Note de mesure (pas un défaut)

Une fois les zones trail reconnues, un plan d'ultra mesure **97 % facile / 1 % modéré / 2 % dur**.
Ce n'est pas une anomalie : sur un plan à 11 h/semaine, « une séance de qualité par semaine »
FAIT arithmétiquement 3-4 % du temps. La part facile élevée est le propre de la préparation
d'ultra (le volume est le stimulus). L'auditeur exige une part facile ≥ 70 % : le trail la
respecte largement, et le chiffre est désormais MESURÉ au lieu d'être supposé.

## Audit externe v7 (multi-sport trail / swimrun / duathlon)

Harnais indépendant fourni avec l'audit (`audit_v7.cjs`, 4 580 profils : balayage OFAT + fuzz
seedé). Il ne connaît pas `auditPlan()` et ne lui fait pas confiance : il compare le plan ÉMIS
aux PROMESSES (règles déclarées, réponses de l'athlète, chiffres que le moteur calcule lui-même).
C'est ce qui lui a permis de trouver ce que l'auditeur interne ne voit pas — celui-ci rendait
`score: 100, hardViolations: []` sur des plans contenant 90 min de seuil ou aucun vélo.
Verrouillé en CI par `npm run audit:v7`, avec un BUDGET par check (0 = garde-fou définitif).

| id | défaut | statut |
|---|---|---|
| R4.0 | **SANTÉ, bloquant.** Le drapeau médical était contourné par la passe de réparation : `applyRunImpactCap` écrivait ses séances de substitution EN DUR, sans lire `medHold` ni `noVo2`. Avec « douleur thoracique à l'effort » déclarée, le plan reprenait 32 à 97 blocs au seuil APRÈS que les générateurs les aient correctement retirés, et `warnings` restait VIDE. Correctif structurel : `crossTrainingSession(r, …)` est le SEUL constructeur de séance des passes de réparation — il reçoit le plan raisonné, donc les drapeaux. Tant qu'une passe peut fabriquer une séance sans eux, le garde-fou reste contournable par la prochaine passe ajoutée. + avertissement explicite dès qu'un drapeau médical est actif. | corrigé |
| R4.1 | `repCap` de 15 = déversoir de volume. Le `15` n'était pas un plafond de sécurité, c'était le DÉFAUT : tout step non annoté pouvait tripler ses répétitions pour absorber le volume (15×6min = 90 min de seuil, 5×14min = 70 min, 12×3min de descente). Défaut désormais différencié : un bloc FACILE peut absorber (c'est sa fonction, et la courbe s'en sert), un bloc de QUALITÉ reste au gabarit choisi par la bibliothèque. + plafond de DOSE (C25 : 40 min de seuil, 25 min de VO2) car c'est parfois la DURÉE qui avait grandi, pas les reps. Blocs de qualité nage et descente trail annotés explicitement. | corrigé |
| R4.2 | SWIMRUN : le plan inversait la répartition de la course. L'acclimatation au froid remplaçait l'endurance COURSE dès que l'eau passait sous 17 °C — la majorité des courses européennes, donc le comportement par défaut, pas un cas limite. Le froid consomme désormais un créneau NAGE. Le créneau `facileR` apparaissait aussi deux fois (deux séances identiques) : la semaine passe à 5 séances distinctes, conforme à la structure de référence des coachs. | corrigé |
| R4.3 | SWIMRUN : `maxSessionsPerWeek` (3/1/0) n'était lu que comme `=== 0` — un plafond traité en booléen. Quota désormais alloué par PRIORITÉ déterministe : swimrun spécifique > plus longue nage > acclimatation (la plus substituable, qui ne réclame jamais le quota). Corollaire : une séance en bassin ne parle plus d'« eau libre » — c'était trompeur pour qui lit la carte. | corrigé |
| R4.4 | SWIMRUN : le nom de la pivot contredisait sa prescription (« 6 transitions » pour 30 réellement prescrites). Le nom était de la prose figée, les reps un champ numérique. `repCap = segs` (le nombre de transitions EST la spec, il n'absorbe pas de volume) + libellé DÉRIVÉ après toutes les passes de mise à l'échelle. | corrigé |
| R4.5 | SWIMRUN : prérequis d'entrée ignorés par le moteur (la porte ne vivait que dans le questionnaire). Le moteur les rejoue et RABAT le format à Sprint + avertissement. **Divergence assumée avec le check** `S-PREREQ`, qui attend un refus total : refuser laisserait l'athlète sans rien, alors qu'un plan Sprint n'est pas dangereux — c'est le format LONG qui l'était. L'audit autorise explicitement cette lecture (« refuse ou dégrade explicitement »). | corrigé (dégradation) |
| R4.6 | DUATHLON : des plans sans vélo, silencieusement (46 semaines sur 59 avec 3 jours OFF). Invariant de couverture : chaque discipline déclarée par le sport apparaît dans une semaine de charge ; si l'enveloppe ne le permet pas, un avertissement le dit avec le remède (format plus court ou cycle de 10 jours). Les sports déclarent désormais leurs `disciplines` dans le registre. | corrigé |
| R4.8a | `min` absent (au lieu de `0`) sur les séances de repos créées tardivement : contrat V1Plan rompu, rattrapé partout par `s.min \|\| 0` — un contrat qui ne tient que par les rattrapages de ses consommateurs n'est pas un contrat. Normalisé aux DEUX points de sortie (générateur et boucle de réparation). | corrigé |
| R4.8d | La pivot parlait de longe et de binôme en `team_mode=solo`. | corrigé |
| R4.8e | `injury=epaule` : la séance de nage affichait « SANS plaquettes » pendant que la pivot en gardait ~6 %. Deux séances du même plan se contredisaient sur le même drapeau. Tranché : ZÉRO plaquette sous drapeau épaule. | corrigé |
| — | **Effet de bord découvert** : la sonde de capacité multipliait les plafonds de séance, C23 compris (3 h de sortie longue pour un débutant → 193 min). Un plafond du MANIFESTE ne doit jamais être mis à l'échelle : `bnd.hard` le marque comme intouchable. Trouvé parce que le banc v6 a régressé en corrigeant R4.1 — les deux bancs se surveillent. | corrigé |

### Dette restante, chiffrée (budgets dans `scripts/runAuditV7.mjs`)

Profils sans aucun défaut : trail **56 → 84 %**, duathlon **45 → 91 %**, swimrun **23 → 69 %**.

**R4.7a corrigé** (`T-DPLUS` = 0) : le D+ d'un BLOC suit désormais le terrain accessible
(`TRAIL_ACCESS.perBlock`), avant ET après la mise à l'échelle verticale — la courbe regonflait
sinon le bloc au-dessus de ce que le relief permet. Sur du plat on ne trouve qu'une butte : le
bloc est court et il se RÉPÈTE.

**R4.7b corrigé** (`T-NIGHT` 15 → 1) : la consigne de nuit était portée par UNE séance dédiée,
elle-même éliminée par la substitution d'impact dès qu'une blessure était déclarée. Une
compétence ne doit dépendre de la survie d'AUCUNE séance : la consigne est devenue un ATTRIBUT
greffé sur la sortie longue ET sur les footings, les séances les plus nombreuses.

**Effet de bord, encore trouvé par le banc v6** : la règle T3 (48 h après une grosse descente)
était évaluée AVANT la mise à l'échelle verticale, donc sur des valeurs qui n'étaient pas celles
du plan livré. La rejouer après cassait la progression D−/semaine (+32 % mesuré) : deux règles
se contredisaient parce que l'une lisait un chiffre que l'autre modifierait après elle. Résolu
en ramenant la DESCENTE DU JOUR juste sous le seuil, **dans** la boucle de courbe — la
progression mesure alors les valeurs finales.
Ce qui reste est budgété et ne peut plus remonter : `U-DECL` (lissage d'affûtage sur la mesure
incluant les récups, R4.8c), `U-RACEDATE` (course lointaine : plafond + avertissement, R4.8b),
`U-DUP` (variantes d'un même créneau), `T-DPLUS`/`T-NIGHT` (R4.7a/b), `S-NOVO2` et `S-LONGSWIM`
sur les profils blessés ou extrêmes, `S-MIX`, `D-DISC` quand l'enveloppe est trop étroite.
### R4.7c — récupération non comptée : diagnostic complet, correction reportée

**Le défaut** : `stepMin()` (générateur) ne compte PAS la récupération entre répétitions, alors
que `sessionLoad()` (auditeur) la compte quand le texte porte un chiffre. C'est la racine de
l'« écart de métrique récup » traîné depuis des mois ET de `U-DECL`. Côté trail, 100 % des
récupérations sont non chiffrées (« redescente MARCHÉE », « récupération complète ») : une
séance de côtes annonce 12 min pour ~22 min réelles. Sur le total du plan l'écart se compense ;
par SÉANCE et par SEMAINE il ne se compense pas — et c'est à cette échelle que les plafonds de
volume et les jours durs adjacents sont évalués.

**Tentative faite, puis annulée** (elle est instructive) : ajouter un champ numérique
`recoveryMin` et compter la récup dans `stepMin`. Résultat immédiat : 9 violations dures
(6 sauts >+25 % entre semaines de charge, 3 dominances de pic) et 1 régression au banc v6.

**Ce que ça a appris — et c'est le vrai obstacle** : la récupération est une fraction NON
PILOTABLE de la séance. La courbe de charge (R3.3) met à l'échelle la durée des blocs, pas la
récup, qui suit le nombre de répétitions. Quand une semaine est mise à l'échelle par un facteur
`f`, le livré vaut `corps × f + récup`, alors que le facteur est calculé sur le total : il
SOUS-CORRIGE, d'autant plus que la part de récup est grande. La correction n'est donc pas
« compter la récup » — c'est **calculer le facteur d'échelle sur la seule part pilotable** :
`f = (cible − récup_fixe) / corps_scalable`, dans toutes les passes de lissage. C'est un
chantier à part entière sur la boucle de volume, pas un ajout de champ.

En attendant, `U-DECL` reste budgété et l'écart est documenté ici plutôt que masqué.
