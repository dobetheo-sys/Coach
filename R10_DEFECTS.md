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
