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

---

## Audit externe v7 — deuxième passe (MESSAGE_CLAUDE_CODE_R5, 30/07/2026)

Le même auditeur a rejoué son harnais sur la version corrigée en R4 (4 580 profils, même graine)
et a rendu six résiduels. Traités dans l'ordre qu'il suggérait, chacun mesuré avant/après avec
son propre banc — ce que l'auditeur interne ne voit toujours pas, `audit_v7` continue de le voir.

| sport | R4 (audité) | après R5 (`audit_v7.cjs`, N=400) |
|---|---|---|
| trail | 87 % de profils sans défaut | **99 %** |
| swimrun | 78 % | **92 %** |
| duathlon | 97 % | **99 %** |

**R5.1 — le renommage de la pivot tournait trop tôt.** `syncDerivedLabels(plan)` est extrait et
appelé EN DERNIER, dans `generateAudited` après les réparations ciblées — pas dans `generatePlan`,
où `applyTargetedRepairs` et `reduceDay` modifiaient encore les répétitions APRÈS lui. Toute prose
dérivée d'un nombre passe désormais par ce point de convergence. `S-TRANSITIONS` 9 → 0.

**R5.2 — l'affûtage échappait à la couverture des disciplines.** Deux fautes en une : la
« semaine de récup » était DEVINÉE par comptage de jours de repos (une semaine d'affûtage en a
autant, elle était donc sautée), et la couverture tournait AVANT le budget de séances et
l'anti-collage, qui pouvaient retirer la séance qu'elle venait de poser. `isRecup`/`phase.id` sont
lus explicitement, la couverture passe en dernier, et l'affûtage exige au moins la discipline
PRINCIPALE. Restait un troisième chemin : les coupes de volume de `planGenerator` tournent après
`buildDays` et pouvaient orpheliner la course d'une semaine d'affûtage de duathlon —
`keepsMainDiscipline` oriente désormais le choix de la victime (sans jamais l'interdire : la
sécurité du volume passe avant la complétude). `D-DISC` 22 → 1.

**R5.3 — la dernière semaine sortait de la bande, et personne ne regardait.** La bande
[0,5–1,4] exclut l'affûtage, dont la règle propre porte sur le pic et non sur sa propre courbe :
une semaine pouvait prescrire +71 % de ce qu'elle annonçait sans qu'aucune règle ne la voie.
`reconcileDeclaredVolume(plan, warnings)` ferme le trou et s'applique à TOUTES les semaines, en
dernier (même leçon que R5.1, il est appelé aussi après les réparations) :
1. la FRÉQUENCE cède avant la TAILLE — une séance sous le quart d'heure ne vaut pas le
   déplacement (le cas mesuré : quatre séances de 3 minutes autour d'une longue au plancher) ;
2. si la structure minimale dépasse encore l'enveloppe déclarée, le chiffre annoncé s'aligne sur
   le prescrit **et un avertissement le dit**, avec ses deux remèdes (relever le volume, ou viser
   plus court). Le silence était le défaut.
Au passage, la décroissance de l'affûtage devient une RÈGLE au lieu d'un effet de bord : elle
était émergente (courbe + coupe R3.13) et la dérive des créneaux d'un cycle de 10 jours pouvait
rendre la 3ᵉ semaine plus lourde que la 2ᵉ (147→98→123→88, attrapé par le banc v6 D10).
`U-DECL` 187+43+5 → 1+1+0.

**R5.4 — la VO2 swimrun s'éteignait sur blessure d'impact.** La branche existait mais était
placée APRÈS `if (inj.impact)` : elle était inatteignable. Réordonnée, le stimulus change de
SUPPORT au lieu de disparaître (8×50 m en `sw.vo2`, départs 1'30 — le swimrun n'a pas de vélo,
mais il a l'eau, et c'est même le support le plus spécifique).

**R5.5 — deux fois la même séance dans la semaine.** Trois producteurs de doublons, trois
correctifs :
- `applyRunImpactCap` produisait deux substitutions identiques → `crossTrainingSession` reçoit un
  rang (`nth`) et fait varier le CONTENU, jamais la CHARGE (une variante plus longue rendait le
  plan d'une blessure multiple plus lourd que celui d'une blessure unique — banc v6 B3) ;
- la montée du pic CLONAIT une séance de nage à l'identique (« Seuil CSS + plaquettes » deux
  fois) → le donneur doit être une séance FACILE (le pic n'a pas à gagner de l'intensité par une
  passe de volume) et le clone porte un nom propre ;
- le cycle de 10 jours place deux créneaux `dur2` dans la même fenêtre calendaire →
  `applyWeeklyVariety` cherche la variante du créneau frère, et à défaut allège. Les doublons
  FACILES sont laissés : deux footings dans une semaine, c'est un plan normal.
`U-DUP` 76 → 0.

**Effet de bord assumé** : sur une petite enveloppe (3 séances/semaine, ou 3 jours bloqués), le
créneau `dur2` ne survit pas au budget — le plan swimrun traversait 40 semaines sans une seule
sollicitation de la puissance aérobie maximale. Le créneau de qualité alterne désormais, une
semaine sur deux en phase de développement, avec le support adapté aux zones fragiles (impact →
nage, épaule → course, les deux → on laisse la main aux branches prudentes). `S-NOVO2` 181 → 0.

**R5.6b — `VLAB` collisionnait.** Son namespace est plat : `partielle` (dispo « 4-5j/sem ») était
écrasé par `partielle` (course de nuit), `montagne` (terrain « Montagneux ») par `montagne`
(dénivelé accessible). L'affichage de la dispo et du terrain était donc FAUX. Les libellés
ambigus vivent maintenant dans `VLAB_Q`, une table PAR QUESTION consultée avant la table plate —
plutôt que de préfixer les valeurs, ce qui aurait demandé une migration des réponses stockées.

**R5.6a (= R4.7c) — non traité, et c'est délibéré** : la correction demande de calculer le
facteur d'échelle sur la seule part pilotable de la séance (`f = (cible − récup_fixe) /
corps_scalable`) dans toutes les passes de lissage. Le diagnostic complet est ci-dessus ; c'est un
chantier sur la boucle de volume, pas un ajout de champ.

**Dette restante, budgétée dans `scripts/runAuditV7.mjs`** : `S-RUN-STARVED`, `S-MIX` et
`S-LONGSWIM` (swimrun) — l'auditeur note lui-même que le fuzz accepte des saisies invraisemblables
(format sprint avec 3 000 m de plus longue nage, `vol_recent` > `vol_max`). Sa piste « passe de
plausibilité en entrée, avec avertissement et jamais de blocage » est la bonne, et c'est le
prochain gisement — elle n'est pas faite ici.

---

## R11 — Le contrat d'entrée (audit amont, 30/07/2026)

Un troisième banc externe est arrivé, cette fois sur la SURFACE D'ENTRÉE du moteur. Son constat
tenait en une phrase : sur 551 entrées fausses, le moteur a produit un plan crédible 544 fois et
planté 7 fois avec une `TypeError` nue. **Il n'a jamais refusé de générer.** C'était la
contradiction directe de la règle du projet — « un plan faux est plus dangereux que pas de
plan » : le garde-fou existait côté app, rien ne le déclenchait.

| | avant | après |
|---|---|---|
| refus explicite et motivé | **0** | **203** |
| dérive silencieuse | 130 | **0** |
| crash `TypeError` non typé | 7 | **0** |
| dérive ANNONCÉE (plan différent, cause dite) | — | 35 |
| sans effet | 414 | 310 |

`npm run audit:amont` — 13ᵉ gate CI, exit 1 à la moindre dérive silencieuse.

**Ce qui a été construit** : `src/engine/answerSchema.ts`, source de vérité UNIQUE des domaines
(`ANSWER_SCHEMA`, `FORMATS_BY_SPORT`), et trois sorties, jamais une quatrième :
1. `EBInputError` — valeur hors domaine, type faux, requis manquant. Le refus porte la clé, la
   valeur reçue, l'attendu, et une phrase adressée à l'ATHLÈTE : c'est lui qui répare.
2. `warnings[]` — contradictions entre valeurs individuellement valides (B8).
3. `defaults[]` journalisés dans `decisions` — un défaut appliqué est visible, jamais tacite.

**Les défauts éteints** : `vol_max: "abc"` ne donne plus un Ironman à 30 min hebdo de pic (B1) ;
`minWeeks` est enfin LU, et refuse un marathon en 3 semaines avec ses deux issues concrètes
(B2) ; une course passée ne produit plus un plan d'une semaine — elle est purgée à la reprise
d'état, avec une fenêtre de grâce de 3 jours (B3) ; un format hors domaine est refusé, une
casse fautive corrigée ET dite (B4) ; une énumération renommée ne peut plus faire perdre 91 %
du volume en silence (B5) ; sept jours bloqués sur sept sont refusés avant génération, et un
plan à 0 séance après génération (B6) ; une date au format FR est un refus motivé, plus une
`TypeError` (B7) ; la virgule française est normalisée AVANT parsing — « 2,200 » ne fait plus
basculer une catégorie trail (B9).

**Deux arbitrages assumés, notés parce qu'ils coûtent quelque chose** :

- *Le banc v6 disait l'inverse.* Son test E5 assertait « `buildPlan` ne lève JAMAIS sur une
  entrée dégradée ». C'est exactement ce qu'il ne faut pas. Il a été réécrit sous le contrat
  inverse — un refus TYPÉ et réparable — en gardant son ID. Même chose pour C2 (préparation
  trop courte : avertissement → refus) et E3 (FTP hors bornes : rattrapée → refusée).
- *Un athlète déjà inscrit à une course trop proche reçoit un refus, pas un plan dégradé.*
  C'est la lettre de R11.4, et c'est défendable (le plan serait une fiction), mais ça se paie :
  il n'aura rien plutôt qu'une préparation imparfaite. Le refus lui propose les deux issues.
  Le seuil se mesure depuis le DÉPART DU PLAN, pas depuis aujourd'hui : un plan créé il y a
  vingt semaines pour une course demain reste valide — refuser à trois jours de l'échéance
  serait absurde.

**Le banc a aussi révélé son propre défaut** : son profil de référence swim portait
`format: "1500"`, une valeur qui n'existe pas dans le domaine du sport. Le moteur l'acceptait —
c'est B4, démontré par le banc sur lui-même. Corrigé en `fond`.

**Classement étendu, en le documentant** : le banc ne connaissait que « échec explicite » ou
« sans effet ». La spec R11.2 prévoit trois canaux : un plan qui change ET qui dit pourquoi est
conforme. Le banc lit donc maintenant `_v2.warnings` et `_v2.decisions`. Ce n'est pas un
assouplissement : la dérive silencieuse reste à zéro, et c'est elle le critère de sortie.

### R11.7 — les réponses inertes agissent (décision produit)

L'audit amont a mis le doigt sur la famille la plus grave au regard du contrat du produit :
**des questions posées à l'athlète, des cartes de règle affichées, et aucun effet sur le plan.**
`cycle_sync` : `grep` dans le moteur → 0 occurrence, plan identique au bit près. `dispo` :
quatre valeurs, quatre plans strictement identiques, placement des jours compris.
`weight_lever` : déclaré, inerte.

La spec laissait deux issues — câbler ou retirer. **Décision : câbler les trois.**

**`dispo`** — deux effets, ceux qu'un entraîneur applique vraiment : le NOMBRE de jours
(`weekend` 4, `partielle` 5, sinon 7) et la sortie longue au week-end dès que la semaine est
contrainte. `weekend` était d'abord à 3 jours : le banc v7 a montré qu'on y perdait un stimulus
entier (la VO2 en swimrun, le travail de côte en duathlon montagneux) — « week-end surtout » ne
veut pas dire « uniquement le week-end ». La passe raisonne en « quoi GARDER » et non en « quoi
couper », sans quoi on obtenait trois jours durs et aucun jour facile.

**`cycle_sync`** — `src/engine/cycleModel.ts`, avec sa littérature en tête de fichier. La revue
de référence (McNulty et al., 2020, 78 études) conclut à un effet **trivial** de la phase du
cycle sur la performance, avec une variabilité entre personnes bien plus grande que l'effet
moyen. La seule conclusion défendable : **on ne change pas le VOLUME, on change le PLACEMENT.**
Sur une semaine majoritairement prémenstruelle, la SECONDE séance de qualité devient facile —
une seule, jamais les deux, et l'athlète peut passer outre. La question demande désormais les
deux données sans lesquelles elle n'est qu'une case à cocher (1er jour du dernier cycle,
longueur). Cas fréquent et dit explicitement : avec un cycle proche de 28 jours, la fenêtre
prémenstruelle tombe souvent pile sur la semaine de décharge — il n'y a alors rien à déplacer,
et c'est une bonne nouvelle, pas un raté.

**`weight_lever`** — la frontière du manifeste ne bouge pas : jamais de cible d'apport, jamais
de régime, jamais de poids visé. Ce qui reste, et qui est de l'ENTRAÎNEMENT : le renforcement
garanti chaque semaine de charge (la masse musculaire est ce qu'un déficit attaque en premier),
et une séance facile de plus en phase de base à volume hebdomadaire égal. Rien qui ressemble à
une séance « brûle-graisses » — cette notion n'a pas de sens et sert surtout à vendre des plans.

**Garde-fou permanent** : `npm run audit:sensibilite` (14ᵉ gate) — toute clé du questionnaire
doit avoir au moins une valeur qui modifie l'empreinte du plan. Une clé inerte fait échouer la
CI. Les saturations assumées (`sleep=bon`, `life_load=legere` : les valeurs hautes n'ajoutent
rien à la valeur normale) ne sont pas comptées comme des défauts. 4 profils golden ajoutés.

**Effet sur l'existant : nul.** Les 814 profils du golden master sont inchangés — le câblage
n'agit que sur les réponses qui étaient jusqu'ici sans effet.

**Aussi corrigé** (§8, textes périmés visibles par l'athlète) : deux écrans affirmaient
qu'« aucun contenu nutritionnel n'est généré » — faux depuis l'onglet Nutrition ; et
`readinessSource` annonçait l'import FIT « à venir » alors qu'il est livré.

---

## R12 — Le chemin sans références (audit grand public, 30/07/2026)

Quatrième banc externe, sur une question que les précédents n'avaient pas posée : **que produit
l'outil pour quelqu'un qui ne connaît AUCUNE de ses références ?** C'est le cas majoritaire
d'une V1.

**Ce qui était déjà bon, et qui est maintenant verrouillé** : sur 18 configurations et ~2 700
séances générées avec toutes les références à « non », **0 séance sans repère exécutable**.
Le repli est propre — zones FC en course et à vélo, effort relatif en natation (la FC n'est pas
fiable en bassin, on n'en invente pas), RPE sur les intervalles courts avec la raison affichée.
C'est la ligne de base anti-régression du banc.

**Le défaut** : le trail ne dégradait pas, il DEVINAIT. Là où les trois autres disciplines se
replient sur une grandeur observable, le trail substituait un nombre déduit d'un adjectif
auto-déclaré (`VAM_BY_LEVEL[level]`) et construisait tout le plan et la prédiction dessus. Sur
un 45 km / 2 200 m, le seul changement de « niveau » faisait varier l'estimation de course de
**trois heures**. Et « intermédiaire » est la case que tout le monde coche.

| | avant | après |
|---|---|---|
| estimation de course pilotée par le seul « niveau » | 3 h d'écart (32 %) | **0 %** |
| sortie longue, progression selon le niveau | non monotone, inexpliquée | monotone, et le plafond T4 s'explique |
| chaîne d'acquisition de la VAM | aucune (ni test, ni montre) | **retest + import montre + question vécue** |

**R12.1 — la bonne question n'est pas « connais-tu ton X ? », c'est « qu'as-tu fait ? ».**
La VAM se déduit désormais d'une **montée vécue** : deux chiffres que n'importe qui donne de
mémoire (D+ et durée). Abattement documenté (T18) — 90 %, et 85 % sous 15 minutes, parce qu'une
montée d'entraînement n'est pas un effort seuil et qu'une montée courte flatte la moyenne.

**R12.4/R12.6 — un adjectif ne pilote plus aucun chiffre.** Le repli s'appuie sur deux réponses
FACTUELLES : l'ancienneté de pratique et le dénivelé réellement accessible depuis chez soi.
Même correction sur l'allure seuil de repli, par où `level` continuait de passer. `level` garde
ce qui lui revient — le CONTENU des séances — et rien d'autre. Les valeurs de repli sont
descendues vers la borne basse : un plan calibré trop haut se paie en blessure, un plan calibré
trop bas se corrige à la première montée déclarée.

**R12.2/R12.3 — la VAM devient mesurable ET automatique.** Protocole de retest écrit (montée
continue de 20 à 30 min, sur la MÊME montée à chaque fois, sinon on compare deux choses
différentes), et le parseur FIT lit enfin `total_ascent` : qui connecte sa montre obtient une
VAM sans faire de test. Deux garde-fous — une sortie plate ne produit rien, et la moyenne d'une
sortie entière est annoncée comme une estimation BASSE plutôt que gonflée.

**R12.5 est satisfait plus strictement que demandé** : l'audit voulait un avertissement pour une
VAM hors bornes, aligné sur la FTP. Depuis R11, les deux sont un REFUS typé — le contrat s'est
durci entre les deux audits.

**§0 — swimrun hors V1.** Sorti par **drapeau de build** (`EB_SWIMRUN=1` le réintègre) qui
exclut le module ET ses cas de bancs : golden master, audit v2, audit v7, suite E2E. Du code
expédié mais non exercé est exactement ce que ce projet refuse depuis la suppression du
générateur legacy. Le code reste dans `src/`, intact. Un sport absent du bundle donne un refus
lisible (`ENTREE_INVALIDE`, R11) et ne s'affiche plus dans le sélecteur — qui lit maintenant le
registre du moteur au lieu de sa propre liste.

**Garde-fou** : `npm run audit:public` (15ᵉ gate). Le tableau de la chaîne d'acquisition n'est
plus écrit à la main — il est DÉRIVÉ du registre de disciplines et de `FIT_DERIVED_TESTS`, sinon
c'est un commentaire, pas un garde-fou. Section D ajoutée : chaque question du schéma porte sa
NATURE (vécue / mesurée / estimée), et une question non classée fait échouer la CI.

**Le banc s'est trompé sur un point, et c'est noté** : son profil de référence swim portait
`format: "1500"`, inexistant dans le domaine — même erreur que le banc amont, et R11 l'attrape.
Corrigé en `fond`. Deuxième nuance : l'amplitude résiduelle de la sortie longue (débutant 180 min
vs 245) n'est pas un défaut mais le plafond de sécurité C23 ; le banc compare désormais
`inter ↔ avancé` pour ne pas pousser à supprimer une règle de sécurité.

---

## Dette du banc v6 : reprise de D2, D3, D10 (30/07/2026)

Reprise des trois tests laissés en `expect:'fail'` depuis l'audit v6 — la dette la plus ancienne
du dépôt. Mesures avant/après, et ce qui reste avec sa raison.

**D2 — violations dures sur la matrice standard : 11/153 → 2/153.**

*La semaine de pic sans brick (8 configurations de triathlon).* Le cycle de 10 jours glisse sur
le calendrier : une semaine de 7 jours peut ne contenir AUCUN créneau `durLong`. C'est le même
mécanisme que les doublons de R5.5, vu par l'autre bout. L'auditeur avait raison de le refuser —
le brick EST le triathlon, la sortie longue EST le plan d'endurance ; une semaine de pic sans
elle n'est pas une semaine de pic, c'est une semaine chargée. `applyPeakSignature` requalifie le
second créneau de qualité en longue, en amont, pour que la boucle de volume voie une semaine
cohérente dès le départ.

*Au passage, la troisième famille (une semaine de récup plus chargée que la précédente) a disparu
avec.* Elle avait la même cause.

*Piège rencontré, et c'est une leçon déjà vue :* `isR` est posé par CYCLE, pas par semaine
calendaire. Sur un cycle de 10 jours, le premier jour d'une semaine de charge peut être marqué
récup — tester `wd[0].isR` sautait précisément les semaines à corriger. On lit la semaine
entière, comme le fait la couverture des disciplines depuis R5.2.

**D10 — régression introduite par ce lot, puis corrigée, avec un gain.** Changer la structure du
pic a déplacé les seuils de l'affûtage, et la garantie de décroissance s'est révélée incomplète :
elle savait RETIRER une séance, pas RÉDUIRE la dernière. Dès qu'une semaine d'affûtage tombait à
une séance, la décroissance s'arrêtait net (48 → 56 min mesuré). Elle sait maintenant réduire —
et en affûtage, réduire est précisément l'objectif.

**D3 — sauts de charge : de +18 % à +11 %, mais toujours 4 cas au-dessus du seuil.**

La borne C22 (+10 % d'une semaine de charge à la suivante) existait DANS la boucle de volume,
mais des passes ultérieures pouvaient regonfler une semaine après coup. Elle est désormais
vérifiée EN DERNIER, avec les deux autres réconciliations — même leçon que R5.1 et R5.3 : une
règle de sécurité vérifiée au milieu du pipeline ne vérifie que l'avant-dernier état.

**Ce qui reste, et pourquoi ce n'est pas corrigeable en l'état** : sur un plan court avec deux
semaines de récupération consécutives, la dernière semaine de charge (S4) est à 248 min et le
pic à 276. C22 voudrait le pic ≤ 273 ; la hiérarchie du plan veut le pic > 248. Les deux tiennent
dans 25 minutes, et les planchers de séance interdisent de descendre plus bas. **Réduire encore
ferait passer le pic SOUS une semaine de base — on échangerait une violation contre une autre,
plus grave.** La correction de fond est ailleurs : dans la forme de la courbe (le rapport
dev→peak vaut 1,18, donc supérieur à C22 par construction), pas dans une passe de rattrapage.

**Les 2 configurations D2 restantes** (`swim/sprint|demifond/debutant/reprise`) relèvent de la
même impasse, en plus net : tout le plan tient entre 45 min et 1 h de nage par semaine, les
quatre séances sont AU plancher (C15 : 850 m ; C20 : 0,42 h/séance), et l'écart entre la semaine
max et le pic est de 5 minutes. Il n'y a plus de marge sous les planchers pour exprimer une
hiérarchie. J'ai tenté un rabotage : sans effet, les planchers le reprennent immédiatement — le
code a été retiré plutôt que laissé en place sans effet.

### F2 mesure un symptôme, pas sa cause — et la récupération non comptée est enfin chiffrée

Dernier test en dette du banc v6 : « une séance de qualité passe ≥45 % de son temps dans la
zone cible », 98 séances entre 43 % et 44 %. Le motif était trop régulier pour être un dosage.

**Il ne l'était pas.** `_min` ne compte pas la récupération ENTRE répétitions. Une VO2
« 10 min d'échauffement + 4×3 min (récup 2 min 30) + 6 min de retour au calme » est comptée
**28 min** alors qu'elle en dure **35,5**. Le ratio mesuré (12/28 = 43 %) est faux : le corps
réel vaut 19,5 min sur 35,5, soit **55 %** — largement au-dessus du seuil. « Corriger » les
séances pour atteindre 45 % (blocs plus longs, échauffement plus court) aurait dégradé de vraies
séances pour satisfaire une mesure incomplète. Le test reste donc en dette, requalifié en
**témoin de R5.6a** : il passera au vert le jour où la récupération entrera dans la métrique.

**L'ampleur, enfin chiffrée** (6 sports, 21 formats, 381 blocs multi-répétitions) :

| | déclaré | réel |
|---|---|---|
| plan entier | 1 650 h | 1 704 h (**+3 %**) |
| les 356 séances à récupération chiffrée | 14 810 min | 18 001 min (**+22 %**, jusqu'à **+50 %**) |

C'est exactement ce que le diagnostic R4.7c annonçait : *sur le total du plan l'écart se
compense, par séance il ne se compense pas.* Et c'est la séance que l'athlète vit le mardi soir :
une séance annoncée 30 min lui en prend 45.

**Ce qui est livré maintenant, sans toucher au moteur** : la durée PORTE-À-PORTE est dite dans
le texte de la séance — « ⏱ prévois ~39 min en tout (récupérations comprises) ». `min` ne bouge
pas : c'est la métrique qui pilote la courbe, les plafonds et l'auditeur, et la changer reste le
chantier R5.6a. Mais l'athlète n'a plus à découvrir l'écart sur le terrain. 7 % des blocs ont une
récupération non chiffrée (« récupération complète », « descente marchée », surtout en trail) :
on ne devine pas une durée qu'on n'a pas, ces séances n'affichent pas la mention.

### R11 §8 — l'audit se trompait sur la PWA, et rien ne le vérifiait

L'audit R11 rangeait en dette : *« `app.js` enregistre `./sw.js` et `notifications.js`
référence `assets/icon-192.png` ; ni l'un ni l'autre n'est dans le bundle. PWA non installable,
échecs silencieux. »*

**Mesuré dans un vrai Chromium, c'est faux pour le produit.** Sur la PWA SERVIE — celle qui est
déployée — le service worker s'enregistre et s'active, le manifeste est lié et valide, ses trois
icônes existent, et il n'y a **aucune requête en échec ni erreur console**. L'auditeur avait
raisonné sur le contenu du bundle standalone sans ouvrir ni l'un ni l'autre.

**Ce qui était vrai, et qui est corrigé** : le fichier autonome tentait quand même d'enregistrer
un service worker qui n'a rien à mettre en cache, et de charger une icône absente. Deux échecs
avalés par un `catch(() => {})`. Ce n'est pas grave en soi — mais un échec masqué rend plus
difficile le diagnostic du prochain, pour zéro bénéfice. Le build injecte désormais
`EB_STANDALONE`, le code n'entreprend plus ce qui n'a pas de sens dans ce contexte, et le dit
en une ligne de console.

**Ce qui manquait vraiment : le garde-fou.** Rien ne vérifiait que la PWA reste installable.
`smoke-nofallback` l'assure maintenant en cinq assertions — service worker actif, manifeste
nommé, mode d'affichage installable, icônes réellement servies, zéro requête en échec. C'est le
contrat qui compte, et il est désormais protégé.

---

## R5.6a — la récupération entre dans la métrique (30/07/2026)

La plus vieille dette du dépôt, ouverte sous le nom `R4.7c` puis rappelée à chaque audit
externe. Elle est fermée. Le diagnostic posé plus haut était juste sur le fond et faux sur
le remède : ce n'est pas le FACTEUR d'échelle qu'il fallait corriger, c'est l'ENDROIT où la
récupération est comptée.

**Ce qui bloquait.** La première tentative ajoutait un champ `recoveryMin` à la SÉANCE, à côté
des blocs. La récup devenait alors une constante que la courbe ne pouvait pas atteindre : le
livré valait `corps × f + récup` pour un facteur calculé sur le total, donc sous-correction
systématique — 9 violations dures. D'où la conclusion, à l'époque, qu'il fallait réécrire
toutes les passes de lissage en `f = (cible − récup_fixe) / corps_scalable`.

**Ce qui débloque.** La récupération n'est pas à côté du bloc : **elle est dedans**.
« 4×3min récup 2min30 » n'est pas un bloc de 12 min accompagné de 7,5 min de rab — c'est un
bloc qui occupe 19,5 min. En l'écrivant dans `_min` du bloc (`reps × durée + (reps−1) × récup`),
elle devient PILOTABLE : `scaleBlock` agit sur les répétitions, donc la récup se met à l'échelle
avec le reste. Aucune passe de lissage n'a eu à changer. La correction tenait en cinq lignes,
là où la note précédente annonçait « un chantier à part entière ».

Il aura fallu se tromper d'endroit une fois pour trouver le bon. La leçon générale du dépôt
s'applique aussi ici : *un nombre dérivé se calcule là où vit la chose qu'il décrit.*

**Mesuré, avant → après :**

| | avant | après |
|---|---|---|
| écart médian estimateur auditeur ↔ générateur | ~3 % (jusqu'à +50 % par séance) | **0,0 min** |
| `audit:v1` (486 combos) | 0 violation dure | **0 violation dure** |
| `audit:v2` (594 combos) | 0 violation dure | **0 violation dure** |
| F2 (banc v6) — séances de qualité sous 45 % | 28 | **7** |
| D4 (banc v6) — semaine de récup plus lourde | 0 | **0** (devenue une règle, voir ci-dessous) |

**Deux défauts trouvés en chemin, corrigés dans le même lot :**

1. **D4 était émergente.** La règle « une semaine de récup n'est jamais plus lourde que celle
   qu'elle assimile » vivait dans le CALCUL DE LA CIBLE. Quand les planchers de séance saturent
   la semaine — deux récups consécutives issues d'un cycle de 10 jours, chacune réduite à ses
   deux séances minimales — la cible n'a plus prise et la composition décide seule : 33 min puis
   36 min. Elle est désormais garantie dans `reconcileDeclaredVolume`, en dernier, comme C22 et
   la décroissance d'affûtage avant elle. Les répétitions cèdent avant la taille ; le plancher
   de séance piscine (C24, 750 m) annule une réduction plutôt que d'être enfreint, et c'est
   alors la fréquence qui cède. Quatrième fois que la même leçon est appliquée.

2. **Une prose qui mentait.** Un bloc ramené à UNE répétition par la courbe gardait sa mention
   « (récup 3min souple entre les blocs) » — une pause entre deux blocs dont il ne reste qu'un.
   Même famille que `syncDerivedLabels` : la mention se relit sur `reps`.

**La dette F2 qui reste, et pourquoi elle reste.** Sept séances de qualité minuscules
(1×4min de VO2, 1×5min de force) sur les semaines les plus légères. Leur échauffement et leur
retour au calme sont déjà à leur plancher de 3 minutes (C13/C13b) ; atteindre 45 % de zone
cible demanderait d'échauffer moins de 3 minutes avant un effort maximal. 42 % vaut mieux
qu'une VO2max échauffée deux minutes. Le test reste en `expect:'fail'` pour garder le chiffre
sous les yeux.

**Effet secondaire assumé** : toutes les durées affichées montent (celles des séances à
intervalles surtout). Ce n'est pas le plan qui s'alourdit — c'est celui qu'on annonçait qui
était faux. Le détail de séance dit maintenant « ⏱ dont ~8min de récup entre les blocs » :
45 minutes dont 8 de récup et 45 minutes pleines ne se préparent pas de la même façon.

## R12.4b — la source de chaque référence est dite

Trouvé par le banc amont dans le même lot : effacer `pace_known` déplaçait la promesse de
volume (9,7 → 9,8 h) **sans que rien ne le dise**. Le mécanisme est légitime — sans allure
déclarée, les blocs exprimés en DISTANCE sont convertis avec une allure de repli, donc la sonde
de capacité ne trouve pas le même plafond. Le silence, lui, ne l'était pas : le trail annonçait
déjà sa VAM estimée (R12.4), les trois autres références ne disaient rien.

La décision `R12-ref` est désormais émise pour tout plan, et nomme ce qui est déclaré et ce qui
est estimé, discipline par discipline, avec le protocole d'acquisition en clair. Une référence
estimée n'est pas un détail d'affichage : elle change les zones affichées ET le volume promis.

## C13c / C13d — le plancher d'échauffement (30/07/2026, demande du fondateur)

« Je pense qu'il faut mettre un plancher de 10 min d'échauffement pour n'importe quelle séance. »
Mesure d'abord, comme toujours. Sur 9 795 séances de 6 sports :

| | avant | après |
|---|---|---|
| séances portant un échauffement chiffré | 3 073 | 3 073 |
| dont **moins de 10 min** | 1 559 (dont **1 213 de QUALITÉ**) | **0** |
| dont **moins de 5 min** | 663 | **0** |
| séances de qualité SANS étape d'échauffement | 0 | 0 |

L'intuition était juste et la mécanique fautive identifiée : le plancher était bien à 3 min, mais
c'est la clause de PROPORTION (`échauffement ≤ 0,8 × corps`) qui l'y ramenait dès que la courbe
de volume réduisait la séance. Un 3×1000 m au seuil précédé de trois minutes de footing, ce n'est
pas un compromis d'enveloppe : c'est le premier intervalle qui sert d'échauffement, et il se paie
en risque tendineux. C13c fait gagner le plancher contre la proportion ; la proportion reste en
vigueur AU-DESSUS de 10 min (pas 25 min d'échauffement devant 20 min de travail).

**Le corollaire, C13d — et c'est lui qui rend la règle tenable.** Avec 10 min d'échauffement et
3 min de retour au calme incompressibles, une séance de 17 min ne contient plus que 4 minutes de
travail : 128 séances (4,6 % des séances de qualité) sont tombées dans ce cas sur les enveloppes
les plus basses. Raboter l'échauffement pour sauver l'étiquette aurait annulé C13c. Ces séances
sont donc DÉCLASSÉES en endurance — même durée, même place dans la semaine, intention corrigée.
Mieux vaut un footing assumé qu'une VO2max de cinq minutes mal échauffée.

Deux exclusions, chacune mesurée avant d'être écrite :
- **le trail** : sa charge est verticale (D+/D−) ; déclasser un bloc de côtes viderait la cible
  de dénivelé que le reste du moteur vient d'atteindre ;
- **la natation et tout bloc en DISTANCE** : C13d est le corollaire d'un plancher en MINUTES.
  Un 8×50 m VO2 pèse 7,7 min de « corps » à 1'55/100 m sans être sous-dosé — la première version
  le déclassait et supprimait le seul stimulus de puissance aérobie de trois plans swimrun
  (`S-NOVO2`, attrapé par le banc v7). En bassin, la dose minimale est déjà tenue par C24 et C15.

**Trois effets de bord, tous traités :**

1. **L'affûtage sortait de R3.13.** Les séances d'affûtage sont courtes (rappels d'allure, lignes
   droites) : le plancher les alourdit mécaniquement. Neuf combinaisons 5k/reprise sont passées à
   62 % du pic (limite : 60 %), et un swimrun saturé à 71 %. La règle R3.13 était, elle aussi,
   tenue par des coupes réparties dans la boucle — **cinquième** rapatriement dans
   `reconcileDeclaredVolume`. Le point aveugle : les planchers de séance y étaient traités comme
   intouchables. Un plancher dit « en dessous, la séance ne vaut pas le déplacement » — c'est une
   règle de semaine de CHARGE. L'affûtage a pour objet même de raccourcir : une sortie longue
   d'affûtage EST une sortie longue réduite. Les corps se réduisent donc jusqu'à un plancher
   d'affûtage explicite (10 min), et la fréquence ne cède qu'après.

2. **L'auditeur rejouait le clamp d'échauffement.** `sessionLoadFromSteps` recalculait
   `min(durationMin, 25, max(3, corps))` pour « comparer à périmètre égal ». C'était vrai quand
   le clamp ne vivait que dans `_min` ; depuis F1 il est écrit dans `durationMin`, et le rejeu en
   faisait une seconde définition — qui a divergé dès que le plancher est passé à 10 (un
   échauffement prescrit 10 min était compté 8 quand le corps en faisait 8). L'auditeur lit
   désormais `_min`, la valeur RENDUE, celle que l'athlète voit et que l'export publie ; le rejeu
   ne subsiste qu'en repli pour un plan non rendu (le générateur legacy gelé du monolithe).

3. **Une course intermédiaire s'est fait déclasser.** La séance « 🏁 Course B/C » porte une zone
   de qualité et une durée courte : C13d l'a transformée en footing. Une course n'est pas une
   séance — elle a lieu, dosée ou non. Elle porte maintenant un drapeau `race` qu'aucune passe de
   dosage ne franchit.

**Gardes CI ajoutées** : `F4` (aucun échauffement chiffré sous 10 min) et `F5` (aucune séance de
qualité EN TEMPS sous 8 min de dose) au banc v6 — 54 verts, 3 dettes, 0 régression.

**La dette F2 devient une contradiction assumée entre deux règles.** Il reste sept séances de
sweetspot à 10-14 min de travail derrière les 10 minutes d'échauffement qu'on vient d'ériger en
règle. Atteindre 45 % de zone cible y demanderait exactement ce que C13c interdit. Les deux
règles se contredisent sur ces sept séances ; la priorité n°2 du manifeste (prévention des
blessures) tranche, et le test garde le chiffre sous les yeux.


## C13e — l'échauffement n'est jamais plus long que le corps (30/07/2026, demande du fondateur)

« Qu'aucune séance du plan ne sorte avec échauffement > corps, sur les 6 sports. » Mesure
d'abord, sur **40 550 séances** : 11 243 portent un échauffement, dont **840 (7,5 %) plus longs
que leur corps de séance** — 702 en temps, 138 en distance (bassin), et 339 sur le seul trail.
C'était l'effet de bord direct de C13c livré une heure plus tôt : un plancher de 10 min posé sans
plafond correspondant déséquilibre les petites séances au lieu de les protéger.

**Après : 0 sur 40 523 séances**, garde-fou `F6` au banc v6 (les six sports, les deux unités).

**Ce que la règle dit maintenant, dans l'ordre de priorité :**
- **C13e** — échauffement ≤ corps. Invariant DUR. En bassin, l'invariant s'exprime en mètres :
  comparer les mètres suffit à le garantir en minutes (même conversion, et la récupération ne
  compte que du côté du corps).
- **C13** — ni plus de 25 min, ni plus de 80 % du corps quand celui-ci est confortable.
- **C13c** — plancher de 10 min, qui **cède** à C13e. Le plancher est un objectif physiologique,
  pas une autorisation à déséquilibrer la séance.

Le « corps » de C13e est le corps **tel qu'il est écrit**, récupération comprise (R5.6a : elle
appartient au bloc). Un 4×2min récup 2min, c'est 14 min de corps ; le comparer à ses seules 8 min
de travail interdirait un échauffement de 10 min là où il est parfaitement à sa place — 711
séances perdaient leur plancher pour rien. La clause de PROPORTION, elle, reste adossée au
travail : son objet est que le stimulus reste majoritaire.

**Reste 307 séances sous 10 min d'échauffement, toutes en trail**, et la cause est identifiée :
ce sont des séances de côtes courtes dont la récupération (« redescente MARCHÉE, récupération
complète ») n'est PAS chiffrée — 7 % des blocs du moteur, presque tous en trail. Leur corps est
donc mesuré à 4 min quand la séance en dure ~20. Chiffrer les récupérations de descente est le
prochain gisement : il rendrait ces séances honnêtes ET ferait rentrer le plancher de 10 min.

### Ce que la chasse a fait remonter — quatre défauts, tous antérieurs

Aucun n'était visible avant que C13c ne resserre les enveloppes d'un cran. Tous étaient des
**priorités inversées** : quelque chose de facile survivait au détriment du stimulus.

1. **Le plancher piscine coupait la VO2.** La passe « fréquence nage » absorbe le gonflement dû à
   C24 en retirant la plus COURTE des séances remontées au plancher — qui se trouve être la
   VO2max en nage (8×50 m, la seule assez petite pour avoir eu besoin d'être remontée). Sur un
   swimrun à 4 h/sem, ses six créneaux VO2 disparaissaient un par un. Elle ne touche plus jamais
   une séance de qualité ; si la seule candidate en est une, on ne coupe pas — la semaine reste
   un peu au-dessus de sa cible et `reconcileDeclaredVolume` aligne le chiffre annoncé. *Une
   promesse d'heures se corrige ; un stimulus supprimé pendant 20 semaines ne se rattrape pas.*

2. **Le budget de séances comptait les jours de récup sans pouvoir les couper.** `totalSessions()`
   les incluait, `activeNow()` les excluait : un jour de récupération survivait donc au détriment
   du seul créneau de qualité de la semaine. Ils cèdent maintenant les PREMIERS — ce qu'apporte
   une séance de récupération, un jour de repos l'apporte aussi.

3. **Un cliquet sur les répétitions.** `repMax` vaut, à défaut de `repCap`, le nombre de
   répétitions COURANT — donc 1 dès qu'une passe a réduit le bloc à une seule. Un 5×3min de VO2
   tombé à 1×3min ne pouvait plus jamais remonter. Le nouveau plancher de dose lit `repCap`.

4. **La dose de qualité n'avait pas de plancher.** R4.1 disait « le déversement de volume va vers
   les séances FACILES, jamais vers un bloc de qualité » ; la règle symétrique manquait. Le
   RETRAIT vient des séances faciles lui aussi : un bloc de qualité ne descend plus sous 8 min.

### Et une leçon sur C13d

Aligner le seuil de déclassement de C13d sur le plancher d'échauffement (8 → 10 min) semblait
plus propre : un échauffement de 10 min tient alors toujours. Mesuré : sur une petite enveloppe,
TOUTES les séances de qualité passaient sous le seuil et le plan perdait son unique stimulus VO2
sur 41 semaines. Élargir C13d à « toute séance portant un échauffement » (au lieu des seules
séances de qualité) donnait le même résultat en pire. **Un plan petit reste un plan : il garde sa
qualité.** Le seuil reste à 8 min, l'écart de deux minutes est le résultat d'une mesure, et entre
8 et 10 min de corps c'est C13e qui arbitre.

---

## C26b — les 60 minutes de qualité ne sont pas les mêmes pour tout le monde (31/07/2026)

C26 avait retourné la règle du bon côté : le plafond de temps DUR est la grandeur
physiologique, la part de facile en est la dérivée. La constante, elle, restait unique.

Or 60 min/semaine décrit une capacité de récupération CENTRALE — cardiaque, métabolique,
nerveuse. Ce n'est pas ce qui limite tout le monde. Chez quelqu'un qui reprend ou qui débute, le
facteur limitant est le TISSU CONJONCTIF : tendons, aponévroses, os. Il se remodèle sur des
semaines à des mois, bien plus lentement que la filière aérobie, et il ne prévient pas — la
tendinopathie arrive après la séance qui s'est bien passée. C'est exactement le profil de la V1
grand public, et c'est là que la borne basse de 60 % autorisait 48 minutes de qualité sur une
enveloppe de 2 h.

| profil | plafond de temps dur | plancher de facile à 2 h/sem |
|---|---|---|
| confirmé / ancien, sain | 60 min | 60 % |
| reprise | 35 min | 70 % |
| débutant | 25 min | 70 % |
| blessure déclarée | ×0,6 | 70 % |

Le raisonnement ne bouge pas, seule la constante — c'est ce que l'audit demandait. Et l'auditeur
reçoit désormais `history` et `injured` : sans eux, il jugeait un débutant qui reprend avec le
plafond d'un compétiteur.

## O11 — la dette de finition, mesurée avant d'être traitée

- **Build standalone** : `sw.js` et les icônes ne sont plus référencés du tout (0 occurrence).
  Le drapeau `EB_STANDALONE` posé plus tôt dans la série avait déjà fermé les échecs silencieux ;
  l'audit mesurait `standalone-3`, antérieur.
- **Deux textes qui NIAIENT une fonctionnalité livrée** — même famille que tout le reste de la
  série, dans l'autre sens : « Levier poids : signalé, pas encore dans les séances » alors que
  `applyWeightLever` agit depuis R11.7, et « Périodisation menstruelle : bientôt » alors que
  `applyCyclePeriodisation` déplace la seconde séance de qualité des semaines prémenstruelles.
  Un outil qui sous-annonce ce qu'il fait est aussi peu fiable qu'un outil qui sur-annonce.
- **`STRAVA_RELAY_DEFAULT`** reste vide : c'est un déploiement humain (15 min, `server/README.md`),
  pas une dette de code.

## N2 — le plan continuait après son objectif (31/07/2026)

Le registre annonçait « quatre jours de repos après la course ». La mesure en a trouvé jusqu'à
**six**, et 126 jours morts au total sur 42 plans (6 sports × les 7 jours possibles du jour J),
soit trois par plan en moyenne.

La cause : la dernière semaine était la semaine **calendaire** de la course. Elle courait
jusqu'au dimanche quel que soit le jour J, et le générateur remplissait le reliquat de « Repos
post-course ». C'est ce remplissage qui a fait vivre le défaut si longtemps : le plan n'avait
pas l'air cassé, il avait l'air de finir en roue libre. Or un plan qui continue après son
objectif n'a plus d'objectif — la suite, c'est la préparation SUIVANTE, et elle ne se décide
pas ici.

| jour de la course | jours de repos après l'objectif — avant | après |
|---|---|---|
| lundi | 6 | 0 |
| mercredi | 4 | 0 |
| samedi | 1 | 0 |
| dimanche | 0 | 0 |

**Correctif.** La grille ne bouge PAS (l'ancrage au lundi tient les libellés de jours et le
départ « cette semaine » de R8/R9) : elle s'arrête au soir du jour J (`raceTailDays`,
`buildDays`). La dernière semaine devient une semaine courte de 1 à 7 jours — c'est la vérité
de l'affûtage, pas un défaut. Le filet de `planGenerator` reste : une garantie vérifiée au
milieu du pipeline ne vérifie que l'avant-dernier état, la leçon a été payée sept fois dans
cette série.

**Ce que la coupe a révélé.** Le tail de repos masquait un second mensonge : la dernière semaine
annonçait un volume de semaine ENTIÈRE. Trois jours de plan promettaient 3,0 h — et la boucle
R3.3 gonflait les deux derniers jours avant le jour J pour « remplir ». La cible de la courbe
est une dose hebdomadaire : elle est désormais proratisée à la longueur réelle de la semaine
(0,9 h à deux jours · 1,3 h à trois · 2,1 h à cinq · 3,0 h à sept).

**Et l'angle mort qui l'avait laissé passer.** Aucun des 714 profils du golden master ne portait
de `race_date` : toute la branche ancrée sur une course — durée déduite de l'échéance, grille
alignée sur le jour J, insertion de la course, fenêtre de la veille, affûtage — était hors
couverture. La photo ne bougeait pas parce qu'elle ne regardait pas. Passe « course datée »
ajoutée (6 sports × 7 jours de semaine, ancre et échéance figées pour rester déterministe) :
**714 → 756 profils**. Garde permanent `I18` au banc d'invariants, sur les sept jours de la
semaine parce que le jour de la semaine EST la variable du défaut : **72 échecs → 0**.

## I14 — la sortie longue n'était pas la plus longue, et la prudence coûtait cher (31/07/2026)

Le banc d'invariants signalait 18 échecs, tous en trail, tous laissés ouverts par une exclusion
explicite : le plafond « aucune séance ne dépasse la sortie longue » ne touchait aucun bloc
portant du dénivelé, au motif qu'un axe de charge a ses propres passes. Le coût de cette
prudence, mesuré : **« Descente en charge » jusqu'à 5 h 16 contre 4 h 04 pour la sortie longue**
— sur l'axe dont le module trail dit lui-même qu'il casse en premier (T2b, +8 %/semaine).

Ce n'était donc pas un défaut d'étiquette mais de dosage, et il touchait la priorité n°2 du
manifeste. La cause : la sortie longue est plafonnée par T4 (% du temps de course), la séance de
descente ne l'était par rien — l'excédent de la courbe hebdomadaire allait mécaniquement là.

**Deux distinctions que la prudence confondait.** Une contrainte de croissance ne se viole pas en
descendant ; et `dplusM`/`dmoinsM` sont déclarés PAR répétition, donc retirer des répétitions
réduit le total au prorata sans toucher à la vitesse ascensionnelle de chacune. Ce qui reste
interdit, et qui motivait l'exclusion, c'est de raboter la DURÉE d'un bloc en pente : l'athlète
descendrait les mêmes 400 m en moins de temps, une vitesse impossible. Un bloc en pente se
réduit donc par ses répétitions, plancher à 2 (une séance de descente avec une seule descente
n'est plus une séance de descente), arrondi à l'inférieur.

**Et deux fois la même leçon, payée dans le même tour.**

1. *« Une contrainte de croissance se viole en montant, jamais en descendant » est faux dès qu'on
   regarde DEUX semaines.* Réduire la semaine N creuse l'écart avec N+1 : le banc trail a répondu
   S5 D− +22 %, S10 +17 %, S15 +34 %. La courbe verticale vit dans `generatePlan`, donc avant la
   coupe — elle ne vérifiait que l'avant-dernier état. T2/T2b sont désormais re-clampées au point
   de convergence, avec le levier de l'axe vertical lui-même (les mètres, jamais les minutes).
2. *Une garantie de SÉANCE doit précéder les garanties de SEMAINE.* Le plafond de libellé tournait
   en dernier : il abaissait des semaines de pic déjà validées et rouvrait « dev ≤ pic » sur
   4 combinaisons de trail. Il est rappelé une seconde fois en fin de course — et ce second appel
   n'est pas décoratif : il modifie encore 44 des 594 combinaisons de `audit:v2`, là où une passe
   hebdomadaire avait raboté la sortie longue après coup.

**Résultat.** 18 → 0, et le banc d'invariants est vert sur ses 19 tests pour la première fois.
La préparation en descente n'est pas sacrifiée : pic hebdomadaire de D− à 1 250–1 280 m (contre
1 250–1 290 avant), médiane en baisse de 6 % au plus. Effet hors trail du réordonnancement,
mesuré sur les 567 profils non-trail : **539 inchangés**, 24 en baisse (au plus −60 min sur un
plan entier), 4 en hausse (au plus +5 min).

## R13 — le handoff standalone-4, et ce que le banc a débusqué derrière (31/07/2026)

Un audit externe est arrivé avec son banc exécutable (`bench_r13.cjs`, désormais **gate CI
`npm run audit:r13`**) : 19 échecs mesurés sur le build courant, zéro sur les non-régressions.
Tout est vert à la fin — et le chemin a débusqué plus que la liste.

**R13.1 — l'âge avait deux domaines.** Le schéma acceptait 10-100, la table physio locale
14-95 : un enfant de 10 ans recevait le plan adulte complet, VO2max comprises, sans un mot ;
un athlète de 98 ans aussi, avec la FCmax d'un homme de 35 ans (le repli d'âge). Cinq clés
divergeaient. `PHYSIO_BOUNDS` DÉRIVE désormais du schéma (accesseurs paresseux — le cycle
d'imports a un sens), le filet E3 avertit sur les chemins non validés, et `build:app` échoue
si une clé commune diverge — la règle est exécutable, plus un commentaire.

**R13.2 — la CSS d'impression avait fuité.** Le diagnostic du handoff visait l'empaqueteur ;
la mesure a montré la fuite DANS `css/styles.css` lui-même (la chaîne JS print de
`plan-view.js`, apostrophes de concaténation comprises, collée en queue de fichier) : Space
Grotesk mourait comme police de base, un `h2` global soulignait le check-in. Bloc retiré,
garde de build qui échoue sur la signature.

**R13.3 — en mono-séance, le tri ne nageait pas.** L'unique nage hebdo était « Nage récup
courte » (sw.easy), zéro CSS en 59 semaines, zéro nage sur tout l'affûtage d'un Ironman.
`facile2` route par phase, une 2e nage vit en spécifique/pic (alternance en dev), l'affûtage
garde un « Rappel nage course » chaque semaine — y compris la semaine de course, via un filet
posé APRÈS l'insertion du jour J (le donneur « au plus près de la course » ÉTAIT le jour J).
Et l'intensité suit l'intention : plaisir/finir/débutant gardent la technique.

**R13.4 — la semaine de course était cassée par un fall-through.** L'`else` attrape-tout
envoyait la force basse cadence (48-72 h de fatigue résiduelle) en plein affûtage — à J-3 de
l'Ironman. La règle est devenue une violation DURE de l'auditeur (« `*.frc` en taper ») et
elle a débusqué le même accident dans **trois sports** (tri, vélo, duathlon). La veille passe
à ≤ 25 min (un déverrouillage réveille, une séance entame), et le jour J sort de la charge
(`min: 0`, temps PRÉDITS affichés — l'Ironman n'est plus compté comme un footing).

**R13.5 — épaule + natation : 20 semaines plates à 0,8 h/sem sous une promesse à 2,9 h.**
Le diagnostic tracé a remonté TROIS causes empilées : (1) la sonde de capacité ne mesurait
que le SOMMET — elle sonde désormais aussi le chemin (la spécifique × 1,15 borne la
promesse) ; (2) la substitution épaule du pic était plus petite que celle du dev — le pic ne
pouvait structurellement pas dominer ; (3) surtout, LE QUANTUM DES COUPES : retirer un jour
entier pour tenir une cible faisait passer la semaine SOUS la cible, et le ratchet C22
« livré ×1,1 » repartait de la valeur sous-livrée — +10 % de cible et −10 % de coupe
s'annulaient chaque semaine. La coupe REND désormais ce qu'elle a pris en trop (re-remplissage
vers la cible, bornes de bloc respectées). Résultat : confirme 1,4 → 2,9 h, ratio 2,17,
0 violation, 0 réparation. Plus deux filets permanents : promesse vs pic livré (< 75 % → le
limiteur est nommé), et courbe plate (max/min < 1,35 → l'athlète le sait).

**R13.6 — les phases en pourcentage explosaient sur les plans longs.** 6 semaines d'affûtage
et 9 de peak sur 59 semaines : un désentraînement organisé (Bosquet 2007 : 8-14 jours,
~3 semaines max). Plafonds absolus (taper ≤ 3, peak ≤ 5, excédent → spécifique), plafond de
séance d'affûtage calé sur la courbe d'affûtage elle-même (la falaise −63 % devient une
descente), et la semaine de course a un PLANCHER : 30 % du pic hors jour J — les jours OFF
redeviennent de l'endurance allégée dans la limite du budget déclaré.

**Annexes.** C22 au point fixe, EN TOUT DERNIER, avec 3 min de marge sous le plafond (les
minutes entières et les pas de 25 m arrondissaient une réduction de 0,5 min à zéro : le saut
restait à +10,6 % pour un plafond à +10,5). Et le mono-sport dont la discipline principale
touche la zone fragile déclarée le DIT (genou + plan vélo pur → avertissement nommé).

**Ce que la vague de vert a débusqué en aval** — chaque correctif a fait parler un banc :
- la course à `min: 0` devenait LA PLUS PETITE séance de sa semaine, donc la victime idéale
  de toutes les coupes « retirer la plus petite » : une coupe d'affûtage a supprimé l'Ironman
  du plan. Une course n'est jamais une victime (garde sur tous les sélecteurs) ;
- la protection anti-orphelin ne couvrait que la discipline PRINCIPALE : généralisée à toutes
  (un duathlon d'affûtage sans un coup de pédale n'est pas un duathlon), et quand toute
  victime orphelinerait, on RÉDUIT au lieu de retirer ;
- le footing du tri n'avait pas de bornes (`ftCaps` existait, jamais posé) : c'était le
  déversoir de toutes les passes de remplissage — « Footing facile 213 min » en semaine de
  peak. Le plafond C23 débutant manquait aussi à la longue TRAIL ;
- une séance de seuil nage n'est pas 100 % seuil : le corps se répartit 70 % CSS / 30 %
  aérobie — compter tout en dur faisait passer 10 combinaisons tri sous le plancher de temps
  facile ;
- et le garde de polarisation repassait AVANT les passes qui ajoutent des séances — huitième
  paiement de la leçon du point de convergence.

**16 gates verts + `audit:r13` (17e), E2E 8/8, golden recapturé (756), swimrun vert.**

## R14 — la prédiction ignorait le plan qu'elle accompagne (01/08/2026)

Cinquième banc externe, sur le seul module que les précédents n'avaient pas ouvert.
`bench_r14.cjs` — **14 échecs sur 16** contre le build post-R13, les 2 verts étant les
non-régressions à protéger. Tout est vert à la fin, et le chemin a débusqué deux angles morts
de plus.

**Le constat, mesuré.** `predictRace` ne lisait que `refs = {ftp, thrPace, css}` : les valeurs
saisies AUJOURD'HUI. Rien dans la chaîne ne connaissait le temps qui reste, le volume qui sera
fait, ni ce qui a déjà été accompli. Sur un Ironman à 59 semaines, en simulant 30 semaines
intégralement cochées, `JSON.stringify(items)` était **identique au caractère près** entre la
semaine 1 et la semaine 31. L'athlète le plus assidu du monde voyait le même chrono après sept
mois. C'était le seul module du moteur qui ignorait le plan qu'il accompagne — et c'est aussi
celui qui décide du pacing du jour J.

**R14.3-a — deux champs pour la même idée, et des clés qui ne se recouvraient pas.** Le jour J
lisait `a.terrain` (domaine du schéma : `montagne`), la carte Prédiction lisait
`answers.course_profile` (vocabulaire de l'UI : `montagneux`). `vallonne` tombait juste par
coïncidence orthographique ; `montagne` ne tombait sur rien — **plat 240 min, montagne 240 min**,
les +8 à +15 % de relief disparaissaient en silence. Un résolveur unique (`courseProfileOf`)
sert désormais les deux écrans, la table de relief couvre TOUT le domaine `terrain`, et
`assertTerrainCovered()` fait échouer `build:app` sur une valeur non classée : une valeur
oubliée ne peut plus retomber silencieusement sur « pas de correction ».

**R14.1/R14.2 — le contrat.** `predict()` garde sa sortie intacte (la forme actuelle est la
vérité mesurée, c'est l'ancre) et gagne `projected` : `{applicable, horizonWeeks, adherence,
gainPct, gainSource, spreadPct, confidence, refs, items, decisions}`. Le prédicteur est REJOUÉ
sur des références projetées — aucune seconde méthode d'extrapolation n'a été écrite, ce qui
aurait été le vrai risque. L'UI affiche les deux, étiquetées, avec la date de référence.

**Les huit règles, et celle qui compte pour la sécurité.**
- **P1** — l'adhérence est une fenêtre glissante de 6 semaines ÉCOULÉES. `pctLoad` valait
  `doneMin / totalMin` sur le plan ENTIER, futur compris : 30 semaines parfaites sur 59
  donnaient 43 %, sous le seuil de 60 % qui resserrait la fourchette. La condition était
  mécaniquement inatteignable en début de préparation et devenait vraie en fin de plan pour une
  raison étrangère à la régularité. Nuance ajoutée après mesure : **aucun ✓ dans tout le plan
  n'est pas « 0 % d'adhérence »** mais « non jugeable » — quelqu'un qui n'utilise pas les coches
  n'est pas quelqu'un qui ne s'entraîne pas, et le manifeste interdit le reproche.
- **P2** — gain plafonné et SATURANT : `G∞ × (1 − exp(−w/20))`. Le plafond retenu est le plus
  BAS des deux que suggèrent `level` et `history` (liste noire du handoff : jamais un gain de
  débutant à un athlète expérimenté ; et doctrine R12 : un adjectif auto-déclaré ne pilote pas
  un nombre au-dessus de ce que la réponse factuelle autorise).
- **P3** — deux tests datés espacés de ≥6 semaines donnent le taux RÉEL, rétréci vers le prior
  (`n/(n+2)`) et borné par P2. L'athlète devient sa propre référence, et c'est la seule sortie
  prévue hors de l'heuristique.
- **P4** — les +1,96 % de Bosquet 2007 ne s'ajoutent que si l'affûtage est CONFORME (2-3
  semaines, −41 à −60 % vs pic), vérifié sur le plan livré et non sur la présence d'une phase
  nommée `taper`.
- **P5** — l'exposant de Riegel suit le volume (1,04 à ≥12 h/sem → 1,12 sous 5 h). Il était figé
  à 1,06 : **même marathon prédit à 4 h et à 14 h de course par semaine**. Seul point de R14 qui
  touche l'existant, et il ne touche QUE la course sèche — les legs course du tri et du duathlon
  gardent 1,06, leurs facteurs de fatigue ayant été calibrés contre lui (bouger l'exposant sous
  eux recalibrerait en silence une table validée, et compterait deux fois la même difficulté).
- **P6 — LA RÈGLE DE SÉCURITÉ : le pacing ne se projette JAMAIS.** Toute cible d'intensité
  (puissance, allure) est reprise à l'identique de la forme actuelle, avec la mention. Une
  projection optimiste qui remonte l'IF de 0,73 à 0,78 fait partir trop vite, et le coût se paie
  au marathon — voire à l'abandon. **Le temps se projette, l'intensité s'ancre.**
- **P7** — l'incertitude se calcule et s'affiche ; au-delà de ±12 % (repère : SEE de 57 min de
  Rüst 2011 sur un Ironman ≈ ±8 %), on REFUSE d'afficher un chrono et on dit pourquoi.
- **P8** — aucune projection sans matière, et adhérence < 50 % → gain ramené au seul bénéfice
  d'affûtage, motif affiché, jamais de reproche.

**Rejeté explicitement, et écrit dans le code** : dériver un chrono de la CTL/ATL/TSB (Coggan,
concepteur du modèle, la qualifie d'indicateur RELATIF de forme) et le modèle de Banister
(ajustement rétrospectif excellent, validité prédictive prospective non démontrée). Les plafonds
de gain sont annotés « heuristique convergente, pas de source primaire » — parce qu'ils le sont.

### Le banc avait un défaut d'instrument, et il rendait deux critères insatisfiables

`markDone(p, today, weeksBack, rate)` marquait la séance `i` quand `(i % 100) / 100 < rate` : un
échantillonneur qui ne discrimine qu'à partir d'une vingtaine de séances. Or le plan démarre la
semaine COURANTE (R8/R9) — au moment où le banc tourne, la fenêtre des 6 semaines écoulées ne
contient que les quelques jours déjà passés. **Mesuré : 6 séances, indices 0,00 à 0,05, tous
inférieurs à 0,20 comme à 0,95.**

| taux demandé | séances réellement cochées |
|---|---|
| 0,20 | 6/6 |
| 0,30 | 6/6 |
| 0,95 | 6/6 |
| 1,00 | 6/6 |

`markDone(0.30)` et `markDone(0.95)` étaient donc **identiques au caractère près**. R14.5-A
exigeait `gain(30 %) ≤ gain(95 %) / 2` à partir de deux entrées identiques : aucun moteur
déterministe ne peut y satisfaire sauf en rendant un gain nul, ce que R14.3-A et R14.4
interdisent par ailleurs. Et R14.5-B mesurait une adhérence de 100 % en croyant en mesurer une
de 20 %. L'INTENTION des deux tests est juste et vaut d'être protégée en permanence ; c'est
l'instrument qui était faux. L'échantillonnage devient proportionnel et exact à petit effectif
(Bresenham) — 1/6 à 20 %, 2/6 à 30 %, 6/6 à 95 % — **les identifiants et les assertions ne
bougent pas**. Même geste que R11 sur les tests E5/C2/E3 du banc v6.

### Et le golden regardait P5 au seul point où il ne bouge pas

Après correction, `golden:verify` rendait **0 écart** — pas parce que P5 est sans effet, mais
parce que la passe « course datée » fige `vol_max` au profil de base : 10 h/sem, très exactement
l'ancrage où l'exposant vaut 1,06, sa valeur historique. Même famille que l'angle mort que N2
avait trouvé un cran plus haut (aucun profil ne portait de `race_date`). Mesuré sur le texte du
jour J d'un marathon daté : **3 h 31 à 3 h/sem contre 3 h 12 à 20 h/sem**, là où les deux
annonçaient 3 h 17 avant. Passe « volume et extrapolation » ajoutée sur les deux bornes du
domaine (**756 → 758 profils**), et aucune empreinte existante n'a changé.

**Troisième rappel de la leçon du chemin unique, dans le même lot** : `planGenerator` appelait
`predictRace` sans lui passer le volume. Le det du jour J aurait extrapolé à 1,06 pendant que la
carte Prédiction extrapolait au volume réel — la divergence que R14.3-a venait de fermer, rouverte
un cran plus bas par omission. Les deux appelants passent désormais les mêmes entrées.

**18 gates verts (`audit:r14` en 18e), E2E 8/8 (52 assertions dans `smoke-improvements`, dont
l'affichage des DEUX prédictions), golden 758.**

## R14.1 — le plafond de gain s'indexait sur l'ancienneté, pas sur la marge (01/08/2026)

Addendum correctif au handoff R14, arrivé avec son banc (`bench_r14_1.cjs`, **19e gate CI**) :
**8 échecs sur 14**. Il remplace la table P2, la règle d'incertitude P7 et l'affichage vélo de
P6 ; le reste de R14 (contrat `projected`, P1, P3, P4, P5, P8) est inchangé et validé.

**Le constat, mesuré sur un écran de production.** 70.3 à 43 semaines, athlète réel :
FTP 230 W pour 85 kg (**2,71 W/kg**), CSS 2'15/100 m, allure seuil 4:41/km. Le moteur projetait
+4,6 % sur la CAP, +4,5 % sur la nage, et **0 % sur le vélo** — qui fait pourtant la moitié du
temps de course d'un 70.3.

Le code appliquait fidèlement la ligne « avancé / longue date » de la table R14. **Le code était
juste, la table était fausse** : elle indexait le plafond de gain sur `history`, et lisait
`ancien` (pratique de longue date) comme « proche du plafond physiologique ». C'est une
confusion — des années de pratique auto-encadrée ne donnent pas la trainabilité résiduelle d'un
athlète structuré depuis dix ans. 2,71 W/kg est en bas de la bande « fair » de Coggan et un CSS
à 2'15 est un profil limité par la technique : **la marge est grande, la table disait l'inverse.**

C'est exactement la leçon R12 (« un adjectif auto-déclaré ne pilote plus aucun chiffre »), qui
n'avait été appliquée qu'à `level` : `history` faisait passer la même erreur par la porte d'à
côté. Troisième fois que ce dépôt paie la même leçon.

**P2bis — la marge se lit sur ce qui est MESURÉ.**
`G∞ = G_plafond(discipline) × h(marge) × k_structure × f_volume`, puis saturation et plafond
absolu de 30 %. `h` s'interpole sur des bandes de référence — vélo d'après le profil de puissance
de Coggan (publié), course et nage **heuristiques convergentes de praticiens, écrites comme
telles** — décalées par le sexe (−0,45 W/kg, +10 % sur les allures) et par l'âge (−5 %/décennie
après 35 ans, sur LA RÉFÉRENCE et jamais sur la marge de l'athlète). `G_plafond` : 0,25 vélo,
0,22 nage (forte composante technique : la marge d'un nageur lent est dans le geste), 0,15 course
(l'économie de course ne gagne que 2-4 %, Barnes & Kilding 2015).
`k_structure` mesure le STIMULUS DE LA STRUCTURE et non les années — nouvelle question au Profil
(« tes 12 derniers mois »), `history` ne sert plus qu'à son repli, et sans réponse la confiance
ne peut pas monter à « bonne ».

**P7bis — la fourchette devient asymétrique, et porte sur le gain.** La règle symétrique
produisait une borne haute absurde (−42 s de natation sur 43 semaines) : l'élargissement de
l'incertitude annulait le gain du côté pessimiste. HERITAGE dit précisément l'inverse — le pire
cas d'un plan suivi n'est pas de régresser, c'est de ne presque rien gagner. **La borne haute est
donc ta forme d'aujourd'hui**, et le texte le dit. `gainBand` remplace `spreadPct` dans le
contrat ; le refus se déclenche désormais sur la LARGEUR de la fourchette (> 25 points).

**P6bis — le vélo affiche deux lignes.** P6 (le pacing ne se projette jamais) reste la règle de
sécurité ; ce qui change, c'est qu'on cesse de la faire passer pour une projection. « Vélo —
cible jour J » (ancrée, identique) et « Vélo — FTP projetée » (234–265 W) sont deux entrées
distinctes. Sans ça, la moitié du temps de course était invisible dans la projection, et
l'athlète en concluait — à raison — que l'outil ne prévoit aucun progrès.

**P10 — facteur volume.** Le plan lui-même n'entrait pas dans le modèle : deux athlètes à 6 h et
14 h/semaine recevaient la même projection. `f_volume` = prescrit(dev+spéc+pic) ÷ volume récent,
borné [0,75 ; 1,15]. **Le plafond est délibéré** : au-delà, le volume supplémentaire ne se
convertit plus proportionnellement en performance et fait monter le risque de blessure — le
moteur ne récompense pas la surcharge, et c'est la priorité n°2 du manifeste dans un endroit où
on ne l'attendait pas.

**P9 — le levier poids, sous gardes dures.** N'existe que si l'athlète l'a demandé ET a saisi sa
cible lui-même. Présentation en SENSIBILITÉ (« à FTP identique, ton rapport passerait de X à Y »),
jamais en objectif ; **ni calendrier, ni rythme de perte, ni apport** — la frontière nutrition du
manifeste s'applique telle quelle. Gardes qui neutralisent le levier en silence : IMC cible
< 18,5, perte impliquée > 0,5 kg/semaine, athlète mineur, drapeau médical actif.

| l'écran de production | avant | après |
|---|---|---|
| Natation 1900 m | 45'18 → 43'16 (−4,5 %) | 43'57 → **39'34–44'39** |
| CAP semi | 1h50 → 1h45 (−4,6 %) | 1h49 → **1h45–1h53** |
| Vélo | 175–191 W → 175–191 W (**0 %**) | cible ancrée + **FTP projetée 234–265 W** |
| Confiance sur un plan jamais commencé | « moyenne » | **« faible »** |

### Le banc R14 gardait un critère que l'addendum périme sans le dire

Le §6 du handoff liste `R14.2` et `R14.6-A/B` comme périmés. **`R14.4` l'est aussi, et il ne
figure pas dans la liste.** Ses plafonds (intermédiaire ≤ 12 %, avancé ≤ 6 %) SONT la table que
le §0 déclare fausse — ceux-là mêmes qui donnaient 5 % à 2,71 W/kg. Et il est arithmétiquement
incompatible avec le nouveau `R14.1-B` :

> à références identiques, exiger `avancé ≤ 6 %` et `intermédiaire ≤ 12 %` impose un écart
> ancien/confirmé d'au moins **(0,12 − 0,06)/0,12 = 50 %**, quand `R14.1-B` le plafonne à **45 %**.

Les satisfaire tous les deux exigerait que `level` — l'adjectif le plus auto-déclaré du
questionnaire, et celui que R12 a précisément démis — pilote un facteur ~2 sur le gain. Les trois
critères périmés restent **affichés avec leur raison** dans `bench_r14.cjs` (statut `----`, jamais
supprimés) : un banc dont les tests disparaissent sans laisser de trace est un banc qu'on ne peut
plus relire.

**Effet sur les plans : nul.** `golden:verify` reste à 758 profils, 0 écart — la projection ne
touche aucune séance. **19 gates verts, E2E 8/8 (55 assertions).**

## R15 — la revue du registre, et les deux défauts qu'il ne voyait pas (01/08/2026)

Un handoff est arrivé pour auditer `BUGS_OUVERTS.md` lui-même, avec son banc
(`bench_r15.cjs`, **20e gate CI**) : **6 échecs sur 10**, 4 non-régressions vertes. Les
chapitres MOTEUR sont traités ici ; les chapitres d'infrastructure (budgets en taux, forme de
la courbe, job swimrun, registre exécutable) restent ouverts et sont listés dans le registre.

**Le handoff a commis O-1 avant de le dénoncer, et l'a écrit.** En construisant son banc, il a
d'abord balayé 72 profils à un seul horizon avec des dates quelconques : **0 défaut**. En calant
la course un DIMANCHE (le cas de la quasi-totalité des épreuves) et en balayant 9 horizons :
**291 sur 648, soit 45 %**. Une dimension non variée masquait 100 % du défaut. La leçon n'est
donc pas « monter N » mais **« varier les bonnes dimensions »** — un échantillon dix fois plus
grand sur les mêmes axes n'aurait rien trouvé. C'est la formulation la plus utile qu'on ait eue
de cet angle mort, et elle remplace celle du registre.

**R15.7-C — un mineur pouvait préparer un Ironman.** `age: 15` + `tri/Full` était ACCEPTÉ :
59 semaines, pic 7,7 h. R6.3 modulait correctement la charge (×0,70, zéro VO2max) mais **rien
ne croisait l'âge et le format**. Or l'inscription à un IRONMAN, un 70.3 ou la plupart des
marathons est refusée avant 18 ans. L'argument est celui qui existait déjà dans R11.4 — *« te
vendre une préparation d'Ironman en un mois serait te mentir »* : préparer douze mois une
épreuve où l'on ne pourra pas prendre le départ relève du même mensonge, en plus long. Refus
typé (`ENTREE_INVALIDE`) qui nomme la règle d'inscription, propose le format accessible
immédiatement, et dit que le plan long redeviendra possible à 18 ans. Les formats courts sont
**inchangés** : R6.3 y fait déjà le travail.

**R15.2 — le relief entre dans la cible d'intensité vélo** (ferme O-2 du registre). Un 70.3 à
plat et un 70.3 de montagne prescrivaient **175–191 W dans les deux cas**. Décalage d'IF
(vallonné −0,01, montagneux −0,025), conseil qui nomme l'indice de variabilité et la puissance
NORMALISÉE. Les trois sports qui prescrivent des watts passent par un point unique (`bikeIF`
dans le kit) : sans lui, le quatrième producteur divergerait — et cette fois sur le PACING, pas
sur un affichage.

**R15.7-A/B — la semaine de course.** Quatre causes empilées, trouvées l'une après l'autre :

1. *Les rappels étaient intouchables.* La semaine de course ne contient QUE des rappels
   (race-pace, nage CSS, allure course), tous porteurs d'une zone de qualité, donc tous sautés
   par la règle U-DOSE. Aucun bloc n'était éligible et le plancher n'était jamais atteint. Ce
   qui s'allonge désormais, c'est l'ÉCHAUFFEMENT et le RETOUR AU CALME — la dose de qualité
   reste intouchable, et C13e continue de borner (une correction intermédiaire a produit un
   « Rappel nage course » de 64 min : un rappel plus long que la séance qu'il rappelle).
2. *La convergence était coupée à 3 tours*, alors que chaque pas est borné par C13/C13e : la
   boucle s'arrête maintenant sur l'absence de PROGRÈS, pas sur un compteur.
3. *La course comptait comme une séance* dans le budget de la semaine, qui saturait donc à elle
   seule et interdisait le seul rattrapage disponible. Depuis R13.4 la course vaut `min: 0` et
   sort de la charge — troisième fois que la confusion « la course est une séance » coûte
   quelque chose.
4. *Et surtout : le plancher tournait AVANT la décroissance d'affûtage.* Il posait ses séances,
   la décroissance les retirait vingt lignes plus bas. Le plancher était écrit, exécuté, et sans
   effet. **Dixième fois que ce dépôt paie la leçon du point de convergence.** Il passe après, et
   la décroissance reçoit le plancher comme borne BASSE — les deux règles cessent de se
   contredire en silence au lieu de se départager au hasard de l'ordre des passes.

**R15.7-B** relève de la même famille que R13.4 : le déverrouillage de la veille est la séance
la plus COURTE de la semaine, donc la victime idéale de toute règle « retirer la plus petite ».
12 configurations sur 648 arrivaient au départ après **trois à cinq jours sans rien**. R13.4-C2
plafonnait la veille à 25 min sans jamais exiger qu'elle existe : **un plafond sans plancher.**

| | avant | après |
|---|---|---|
| semaine de course < 30 % du pic | **291/648 (45 %)** | **0/648** |
| aucune séance dans les 3 derniers jours | 12/648 | **0/648** |
| mineur + Ironman/70.3/marathon | accepté | **refus motivé** |
| cible vélo plat ↔ montagne | 175–191 W dans les deux cas | 175–191 ↔ **169–185 W** |

**Trois bancs ont dû suivre le changement de contrat**, ID conservés et raison écrite :
`bench_r13` (R13.1-A10/A12/A13/NR1 testaient la protection R6.3 d'un mineur **sur un format
70.3** — désormais refusé ; ils passent au format M, ouvert aux mineurs, où R6.3 fait exactement
le travail qu'ils vérifient) et `bench_r14_1` (R14.1-I3 même raison ; R14.1-NR1 : la bande vélo
de son profil de BASE passe de 175–191 à 173–189 parce qu'il porte `terrain: "vallonne"` —
c'est R15.2, pas une régression, et à plat la bande ne bouge pas).

**Un défaut introduit puis corrigé dans le même lot**, attrapé par le banc v7 (`U-OFF = 5`) : la
conversion d'un jour OFF en endurance allégée ne vérifiait pas `forced` et fabriquait donc une
séance un jour où l'athlète a déclaré ne pas pouvoir. La contrainte de vie passe avant la
contrainte d'entraînement.

**Et le golden allait perdre une couverture en gagnant une règle.** Sa passe garde-fous prend le
format le plus LONG de chaque sport : le cas `mineur` y devenait un refus, et la protection de
charge R6.3 sortait du champ de la photo. Le cas se dédouble — `mineur` (refus photographié) et
`mineur-format-ouvert` (protection photographiée). **758 → 764 profils.** Une règle nouvelle ne
doit pas effacer la surveillance d'une règle ancienne.

**20 gates verts, E2E 8/8, golden 764.**
