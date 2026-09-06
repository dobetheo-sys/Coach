# Analyse des 10 priorités moteur proposées par un conseiller externe

**06/09/2026 — document à destination de l'auteur du conseil (« l'audit »), pas un rapport de
chantier.** Aucune ligne de `src/` n'a été modifiée pour produire ce document : la consigne du
fondateur était explicite (« Aucune modification pour le moment, juste de la réflexion ») et elle
est tenue. Ce qui suit est une **vérification**, idée par idée, de ce que le moteur fait
réellement aujourd'hui face à chaque proposition — pas une opinion, une lecture du code avec
citations `fichier:ligne`, faite pour que l'auteur du conseil puisse re-vérifier chaque
affirmation lui-même. Trois idées sur dix étaient déjà couvertes par un mécanisme existant que le
conseil ne pouvait pas voir sans accès au code ; ça ne les rend pas fausses, ça change la question
qu'il faut se poser (« est-ce assez visible / assez automatique ? » plutôt que « ça n'existe
pas »).

**Méthode.** Pour chaque idée : (1) ce que le conseil demande, dans mes mots — je n'ai pas le
texte original sous la main au moment d'écrire ce fichier, donc je reformule fidèlement plutôt que
de citer verbatim ; (2) ce que le code fait AUJOURD'HUI, avec les lignes exactes ; (3) verdict de
justesse (le besoin est-il réel ? déjà couvert ? mal posé ?) ; (4) si retenue, comment l'intégrer
— et à quel coût de mesure PRÉALABLE, parce que ce dépôt a payé onze fois la leçon qu'écrire une
règle avant de l'avoir mesurée contre le corpus réel produit une correction pire que le défaut
(règle 7 de CLAUDE.md).

---

## Règle transversale — un budget de séances qualitatives, pas seulement un plafond de minutes

**La proposition.** Le conseil pose une règle générale plutôt qu'un ticket isolé : le nombre de
séances *qualitatives* (dur/modéré) par semaine devrait être budgété pour lui-même, pas seulement
dérivé d'un plafond de minutes — parce que 3 séances de 20 min de qualité et 1 séance de 60 min
"coûtent" la même chose en minutes mais pas la même chose en récupération exigée (chaque séance de
qualité entraîne son propre coût de récupération, indépendamment de sa durée).

**Ce qui existe déjà.** Le moteur a exactement cette distinction, mais elle est venue d'un autre
chantier (fiche 55, 24/08/2026) qui a nommé le même problème sous un angle légèrement différent —
« un COMPTE a besoin de son MOMENT, une DENSITÉ a besoin de son UNITÉ » (CLAUDE.md, arbitrage du
24/08/2026) :

> « le schéma de 10 ne livre qu'UN jour dur » (classificateur) contre « il porte QUATRE créneaux
> de qualité » — deux comptes justes, deux conclusions opposées sur le même schéma.

C26/C26b/C26c bornent le **temps** dur hebdomadaire (`src/engine/constraintMatrix.ts:687-736`,
`C26_HARD_TIME_CAP_MIN`, modulé par historique/niveau/blessure/âge via `C26b_HARD_TIME_BY_HISTORY`
et `hardTimeCapMin()`), C26d borne le temps **modéré**, par discipline
(`src/engine/constraintMatrix.ts:803-807`, `C26D_MOD_SHARE_MAX_PAR_DISCIPLINE`). Les deux sont
vérifiés **par semaine, jamais en moyenne de plan** (`src/audit/coherenceScorer.ts:394-459`, le
commentaire dit explicitement « deux semaines à 20 et 100 min ont la même moyenne qu'un plan sage
à 60, et ce n'est pas le même plan »). Mais c'est une borne en **minutes pondérées**
(`weightedHardMin`), pas un compte de séances. Rien dans le dépôt ne borne aujourd'hui le NOMBRE de
créneaux qualitatifs par semaine indépendamment de leur durée — trois séances de VO2max de 20 min
et une seule de 60 min passent la même borne C26c si le total pondéré est identique, alors que
l'exigence de récupération centrale/nerveuse (justification même de C26/C26b) est probablement plus
proche d'un compte de séances que d'une somme de minutes.

**Verdict : idée juste, angle mort réel et non couvert.** Ce n'est pas une reformulation de C26c —
c'est une dimension orthogonale (fréquence des sollicitations dures, pas leur durée cumulée), et
rien dans le registre `BUGS_OUVERTS.md` actuel ne la porte.

**Comment l'intégrer.** Mesurer D'ABORD sur le corpus existant (comme pour C26c/C26d, fiche
correspondante) : combien de semaines du golden portent ≥3 créneaux qualitatifs quel que soit
leur plafond en minutes, et sur quels sports/niveaux ça se concentre. Si la population est
significative, poser un plafond de COMPTE analogue à C26c (`enforceHardTimeCap`), vérifié par la
même famille de check que `overHard`/`overModSw` dans `coherenceScorer.ts`. Risque à surveiller,
nommé par avance : un plafond de compte peut entrer en collision avec B-17 (qui, en spec/dev, pose
une nage continue non qualifiée mais exigeante) et avec le brick (`durLong`, qui combine deux
disciplines dans un seul créneau) — la définition de « créneau qualitatif » devra être clarifiée
avant d'écrire une seule ligne, sous peine de refaire l'erreur B-02 (classer par SPORT au lieu de
classer par SÉANCE).

---

## P0.1 — Retest périodique des zones

**La proposition.** Les zones d'entraînement (FTP, allure seuil, CSS) se dégradent en pertinence
avec le temps si l'athlète progresse sans jamais les remesurer ; le moteur devrait rappeler
périodiquement de retester, pas seulement laisser l'athlète y penser lui-même.

**Ce qui existe déjà.** Le mécanisme R4.4 (« retests en boss fight ») existe et est complet :
`endurabuild/js/ui/retest.js:1-14` déclare le cycle entier — annonce J-7, préparation, protocole
guidé le jour J, révélation avec delta vs test précédent, zones recalées EN DIRECT
(`syncRefsFromTests()` puis `invalidatePlan()`, `retest.js:117-119`), partage. `tab-profile.js`
affiche la suggestion de retest (`retestSuggestionHTML`, autour de `tab-profile.js:386-395`
pour l'affichage des niveaux par discipline dans le même fichier). Le mécanisme est **déclenché
par une suggestion affichée**, pas par une notification poussée ou un blocage — cohérent avec
O-17 (« informer plutôt que bloquer »).

**Ce qui manque probablement, et c'est la bonne lecture de la proposition** : la suggestion
existe-t-elle sur un **critère temporel automatique** (X semaines depuis le dernier test, ou X %
d'avancement dans le plan) ou seulement à la discrétion de l'athlète qui ouvre l'onglet Profil ?
Il faudrait vérifier précisément où `retestSuggestionHTML` (ou son équivalent) décide de
s'afficher — si le déclencheur est purement manuel (l'athlète doit penser à consulter son
Profil), la proposition du conseil est fondée : un athlète qui ne consulte jamais son Profil
n'est jamais rappelé, alors que le retest existe justement pour corriger une dérive de zone que
personne ne perçoit tant qu'elle n'est pas mesurée (c'est la leçon H-1, appliquée à la VFC, pas
encore appliquée aux zones de puissance/allure/CSS).

**Verdict : idée juste, et probablement partiellement couverte.** Le MÉCANISME de retest est
complet et de bonne qualité (protocole scénarisé, mise à jour en direct, jamais de langage
d'échec). Ce qui reste à vérifier avant d'écrire quoi que ce soit : le déclencheur est-il
proactif (poussé à l'athlète à un moment donné) ou seulement passif (visible s'il va chercher) ?
Si passif, la proposition consiste à ajouter un déclencheur temporel — pas à réinventer le
retest.

**Comment l'intégrer, si le déclencheur est bien passif.** Coupler à R21 (le coach proactif,
`src/coach/proactiveCoach.ts`), qui a déjà l'infrastructure de notification en deux lignes après
ingestion de séance (`src/app/bridge.ts:1149` `coachOnIngestV2`) : ajouter un signal
`DeviationSignal` de type "zone à re-tester" quand N semaines se sont écoulées depuis le dernier
test de ce type ET que le plan est entré dans une nouvelle phase (le retest a le plus de sens en
fin de base/dev, avant que les blocs de spec s'appuient sur une référence obsolète). Attention à
ne pas transformer ça en blocage — reste dans le registre "notification", jamais un refus de
génération.

---

## P0.2 — Plafonner le rebond de charge après une semaine de récupération

**La proposition.** Après une semaine de décharge (récup à 62 % du pic, `RECUP_WEEK_FACTOR = 0.62`
dans `src/engine/constraintMatrix.ts:120`), la semaine suivante peut remonter d'un coup vers le
niveau d'avant la récup — un rebond potentiellement plus violent qu'une progression C22 normale,
parce que la base de comparaison de C22 (+10% max) est la DERNIÈRE semaine, pas la dernière semaine
de CHARGE.

**Ce qui existe déjà.** `C22_MAX_WEEKLY_GROWTH = 1.1` (`constraintMatrix.ts:113`) borne la
croissance semaine-à-semaine partout, y compris à la sortie d'une récup — mais c'est précisément
là que la question se pose : si la récup vaut 62 % du pic, et que la semaine suivante peut monter
de +10% par rapport à CETTE semaine réduite, le rebond ne pose pas de problème arithmétique
immédiat (62% × 1.1 = 68%, toujours loin du pic). Le risque réel n'est pas un saut C22 — c'est
qu'une semaine de récup peut suivre une semaine de charge ÉLEVÉE (juste avant le pic), et la
semaine d'APRÈS la récup peut viser à rattraper la trajectoire de charge comme si la récup
n'avait jamais eu lieu, ce qui la rendrait plus dure QUE la semaine pré-récup — recréant
exactement la dynamique qu'O-21/O-114/O-115 ont déjà nommée sous une autre focale (« la décharge
se compare à la charge qui PRÉCÈDE », CLAUDE.md, fiches 50-51) : le moteur a déjà dû batailler sur
« à quoi une décharge doit-elle se comparer » (T-56, `discMin(w, true)`), mais toujours dans le
sens décharge ≤ charge — jamais dans le sens *charge-après-décharge ≤ charge-avant-décharge ×
progression normale*.

**Verdict : idée plausible, mais à vérifier avant de la croire réelle.** C22 protège déjà contre
un saut BRUTAL semaine-à-semaine ; ce que le conseil pointe (si je le comprends bien) est plus
subtil — un rebond qui *rattrape* la pente perdue par la récup en une seule semaine, ce que C22
seul ne peut pas voir puisqu'il ne regarde que la paire de semaines consécutives, jamais la
tendance sur 3 semaines. C'est exactement la même famille de bug qu'O-114/O-115 (une garantie de
paire ne voit pas ce qui se passe sur trois semaines).

**Comment l'intégrer.** Mesurer d'abord, sur le golden actuel : y a-t-il des cas où
`semaine(N+1 après récup) > semaine(N-1 avant récup)` d'un facteur supérieur à ce que la
progression C22 aurait produit SANS la récup intercalée ? Si oui, la borne à écrire n'est pas sur
C22 lui-même (qui fait déjà son travail sur la paire adjacente) mais un contrôle à trois termes,
sur le modèle de `enforceRecupSousCharges` (T-56, O-93 : « la récup ne pèse jamais plus que sa
charge voisine ») — son symétrique : « la semaine qui SUIT une récup ne pèse jamais plus que
`chargeAvant × C22` ». Risque connu par avance (les fiches 50-51 l'ont déjà payé une fois pour
T-56) : ne PAS compter, dans la référence "charge avant", une séance protégée/épinglée qui
gonflerait artificiellement le plafond autorisé.

---

## P0.3 — Éviter que la semaine de pic tombe juste avant l'affûtage

**La proposition.** Si la semaine de charge maximale (peak) est immédiatement suivie par le début
de l'affûtage, l'athlète encaisse le plus gros stimulus du plan sans aucune semaine de transition
pour l'absorber avant de commencer à réduire — ce qui contredit l'esprit même de la périodisation
(le pic devrait être suivi d'une redescente progressive, pas d'un mur puis d'une chute).

**Ce qui existe déjà.** C'est très exactement la structure du moteur : les phases sont
`base → dev → spec → peak → taper` (`constraintMatrix.ts:1-8`, `PHASE_PCTS`), et **peak précède
directement taper par construction** — il n'y a pas de phase intermédiaire entre les deux. `BANDS`
(`constraintMatrix.ts:15`) donne `peak: [1.0, 1.0]` (plateau plein, pas de dégressif interne) suivi
de `taper: [0.55, 0.3]` (décroissant). R13.6 (`reasoningEngine.ts:427-460`) plafonne peak à
5 semaines et taper à un maximum dérivé du format de course (`TAPER_WEEKS_BY_FORMAT`,
Bosquet 2007), mais ne touche pas à l'ADJACENCE — le pic est TOUJOURS la dernière semaine de charge
avant l'affûtage, par la structure même du tableau `PHASE_PCTS`. C19 garantit peak ≥ 1 semaine,
jamais 0 semaines de transition entre peak et taper.

**Verdict : la proposition décrit exactement ce que fait le moteur aujourd'hui, ce qui est en
réalité une conformité à la littérature de périodisation classique (le "peak" EST la dernière
charge avant la réduction, c'est sa définition), mais la question sous-jacente reste légitime :
est-ce que le DERNIER jour de la dernière semaine de peak porte encore une charge élevée juste
avant que taper commence à réduire dès le lundi suivant ?** Autrement dit, la transition
`peak → taper` se fait-elle d'une semaine à l'autre, brutalement au niveau du plan (fin S(n) à
100%, début S(n+1) à 55%, ce qui EST déjà une réduction de 45% d'un coup — plus dur que le
+10%/-10% que C22 impose ailleurs), ou est-elle amortie au niveau de la structure interne des
jours de cette dernière semaine de peak ?

**Ce que révèle la lecture du code** : `BANDS.taper = [0.55, 0.3]` — la PREMIÈRE semaine
d'affûtage démarre à 55% du pic, ce qui est un saut de -45% en une semaine, largement au-delà
de ce que C22 tolère dans le sens de la MONTÉE (+10%). Ce n'est pas un défaut symétrique — réduire
brutalement après un pic est le principe même de l'affûtage (Bosquet : réduction 40-60% sur
8-14 jours), donc le "mur" que le conseil décrit est probablement voulu, pas accidentel. Ce qui
serait un vrai défaut, et que je n'ai pas vérifié faute d'accès direct au code de construction
semaine-par-semaine à ce niveau de détail : est-ce que le DERNIER jour de la semaine de peak
(juste avant le taper) porte lui-même une charge maximale, sans aucun jour de transition/repos
placé en fin de peak pour amortir le passage ?

**Verdict global : idée à mesurer avant de juger, pas à rejeter ni à adopter.** Le principe
"peak juste avant taper" est intentionnel et sourcé (Bosquet 2007). Ce qui mérite une vérification
factuelle (et que je n'ai pas faite ici, faute de l'avoir eue dans le rapport d'exploration) :
la composition JOUR PAR JOUR de la toute dernière semaine de peak — y a-t-il un jour de repos ou
un jour facile placé juste avant le premier jour d'affûtage, ou le plan peut-il enchaîner une
séance dure le vendredi de peak avec une séance réduite le lundi suivant sans aucun jour de
récupération entre les deux ?

**Comment l'intégrer, si la mesure confirme un vrai trou.** Ce ne serait pas une nouvelle règle
de volume (C22/BANDS suffisent) mais une règle de PLACEMENT — un garde analogue à
`jourIntouchable`/`prioriteFinancement` qui s'assure qu'un jour de repos ou facile termine
la dernière semaine de peak avant le premier jour de taper, sur le modèle de ce qui existe déjà
pour la veille de course (R13.4, "la veille est la plus courte par conception").

---

## P0.5 — Ajouter du seuil / de l'économie de course en phase de CAP (affûtage/pic) par redistribution

**La proposition.** Pendant l'affûtage et la fin du plan, le moteur réduit surtout le VOLUME et
garde peu de séances de seuil/qualité — le conseil suggère de conserver un peu de travail de seuil
ou d'économie de course en redistribuant des minutes ailleurs, plutôt que de simplement couper.

**Ce qui existe déjà, et c'est déjà exactement la règle appliquée, sous un autre nom.** C29/C29b/
C29c (`src/generator/planGenerator.ts:793-901`) codent précisément cette décision, déjà arbitrée
par le fondateur le 03/08/2026 : *« l'affûtage réduit le VOLUME, pas la FRÉQUENCE ni l'INTENSITÉ —
c'est la MONNAIE de la réduction qui change »*, avec la source citée dans le code, Bosquet 2007,
qui décrit trois bras (volume −41/−60%, **intensité maintenue**, fréquence ≥80%). Le mécanisme
rend les jours au point fixe de façon neutre en volume (les minutes viennent des séances déjà
présentes, pas ajoutées), avec un filet qui se rétracte si le plafond de sécurité de l'affûtage
est dépassé. `bk.rp`/`rn.mara` (allure/puissance de course) restent prescrits en affûtage — la
"Rappel race-pace" du vélo (`src/sports/bike/index.ts` slot `dur2`, branche `phase === "taper"`)
en est un exemple direct, tout comme le rappel de nage à allure spécifique du triathlon (R13.4,
CLAUDE.md).

**Ce que le conseil pointe peut-être en réalité, plus précisément** : pas l'ABSENCE de seuil en
affûtage (qui existe), mais son insuffisance en phase de PIC — la dernière semaine avant le taper,
où le volume est maximal mais où la proportion de travail au seuil/économie pourrait être trop
faible comparée au volume total (repris de la règle C26/C26d qui borne le dur et le modéré en
% — mais borne un MAXIMUM, jamais un minimum).

**Verdict : mitigé.** La partie "affûtage garde de la qualité, pas seulement du volume réduit"
est déjà un principe fondateur, mesuré et gardé (C29c, banc `demo:proactif`-like). La partie
"redistribution de seuil en phase CAP/pic" mérite une vérification factuelle précise que je n'ai
pas: existe-t-il un PLANCHER de travail au seuil en phase spec/peak (pas seulement un plafond via
C26/C26d) ? À ma connaissance du code exploré, C26/C26b/C26c/C26d sont tous des PLAFONDS — rien
ne garantit un MINIMUM de travail au seuil en phase de pic.

**Comment l'intégrer, si un plancher manque réellement.** Mesurer d'abord la part de seuil sur les
semaines de spec/peak du golden actuel — si elle est structurellement basse sur une sous-population
identifiable (ex. triathlon longue distance, où le brick prend toute la place qualitative), poser
un plancher analogue à ceux qui existent déjà ailleurs (`swimSessionCapCoherenceAtWeek`,
`longRunSpecificity`) plutôt qu'inventer un mécanisme neuf — c'est le pattern répété dans ce dépôt
("le correctif le moins coûteux qui ferait passer le test", règle 19) : un plancher DÉRIVÉ (du
format de course, comme `CAP_LONG`) plutôt qu'une constante inventée.

---

## P0.8 — La nutrition d'effort comme fonction native du plan (pas seulement une estimation à côté)

**La proposition.** La nutrition devrait être directement attachée aux séances générées (quoi
manger/boire pour CETTE séance précise), pas seulement affichée comme un calcul générique à côté
du plan.

**Ce qui existe déjà, et c'est plus avancé que ce que le conseil semble supposer.**
`src/nutrition/nutritionCalculator.ts:90-155` calcule déjà, PAR SÉANCE (durée, intensité,
température, poids), les glucides pendant l'effort (N1/N2/N3), l'hydratation avec sodium si
chaleur (N4), la consigne "jamais à jeun" sur dur/long (N6), la fenêtre de récupération (N5), et la
dépense estimée (N7) — chaque règle porte son ID, sa justification sourcée (ACSM/Jeukendrup/ISSN)
et sa valeur, exactement le format `{id, what, val, why}` que CLAUDE.md impose pour toute règle du
moteur. C'est une fonction du moteur, appelée avec les paramètres de la séance réelle — ce n'est
PAS un calcul générique déconnecté.

**Ce qui n'existe PAS, et c'est probablement le vrai sens de la proposition** : cette fonction
alimente une carte séparée (« 🥤 Ravitaillement », onglet Semaine/Nutrition) — elle n'est **pas
attachée au texte de la séance elle-même** (le champ `note`/`det` que `renderSess` produit). Un
athlète qui ouvre le détail d'une sortie longue ne voit pas "bois 400-800ml/h" DANS la description
de la sortie longue ; il doit aller consulter un autre onglet. Le seul point d'intégration
directe trouvé dans le code exploré est T7 (`src/engine/reasoningEngine.ts:612`) : la répétition
de ravitaillement en conditions réelles, mais **seulement pour le trail au-delà de 6h d'effort**
— aucun sport hors trail-ultra ne reçoit de consigne nutritionnelle directement dans le texte
d'une séance.

**Verdict : idée juste, et l'écart est précisément localisé.** Le calcul existe, est sourcé, est
par-séance — ce qui manque est le RACCORDEMENT entre ce calcul et le champ `note` de la séance qui
en aurait besoin (sorties longues, brick, toute séance >90min ou classée "dure"). C'est un travail
de câblage, pas un nouveau modèle.

**Comment l'intégrer.** Vérifier d'abord où `nutritionCalculator` est actuellement appelé
(probablement uniquement depuis la carte Nutrition/Semaine, jamais depuis `sess()`/`renderSess()`
qui construit le texte de séance) — si confirmé, la règle du dépôt (« `renderSess()` est le SEUL
producteur de texte », CLAUDE.md) impose que l'ajout se fasse EN AMONT du texte, pas en dupliquant
un second producteur : soit un post-traitement qui insère une ligne de consigne nutrition dans
`det` pour les séances qui dépassent un seuil de durée/intensité (repris du seuil `longish`/`hard`
déjà défini dans `nutritionCalculator.ts:94`), soit un champ structuré séparé lu par le rendu.
Attention à ne pas surcharger visuellement chaque séance courte et facile — la règle N1 du
calculateur dit déjà "pas besoin de glucides sur une séance courte", donc le raccordement devrait
être silencieux (aucune ligne ajoutée) sur la majorité des séances et ne parler que sur celles où
`carbs !== null` ou `before !== "pars comme tu le sens"`.

---

## P1.6 — Compétences de nage en eau libre (pas seulement de la technique en bassin)

**La proposition.** Les triathlètes/nageurs en eau libre ont besoin de compétences spécifiques
(sighting, groupe/contact, départ en peloton, gestion du courant/vagues) que la technique de
bassin ne couvre pas.

**Ce qui existe déjà.** Le mécanisme B-17 (`src/sports/tri/index.ts:75-244`) construit une
progression de nage continue qui inclut EXPLICITEMENT une composante eau libre : le premier
palier de la phase spécifique "porte la consigne eau libre" par construction délibérée
(`tri/index.ts:88-92`, commentaire : *"la séance en conditions réelles VALIDE l'hypothèse que le
gate a faite à la construction... découvrir trois semaines avant l'épreuve que l'eau libre est
bien plus dure laisse le temps de s'inquiéter, pas celui de s'adapter — elle tombe donc TÔT"*).
Le texte de la séance continue dit explicitement : *"En conditions RÉELLES si tu le peux : eau
libre, et en combinaison si ta course l'est"* (`tri/index.ts:~232`). `leg_swim_env` (réponse au
questionnaire, `lac`/`mer`/etc.) module déjà le profil de relief nage (R18.2,
`legProfileOf()`).

**Ce qui manque réellement** : la consigne est une PHRASE dans une note de séance ("en conditions
réelles si tu le peux"), pas une compétence STRUCTURÉE et testée — pas de séance dédiée au
sighting, pas de simulation de départ groupé/contact, pas de protocole progressif pour la peur de
l'eau libre / la gestion de vagues, contrairement au trail qui a des séances DÉDIÉES et nommées
pour chaque compétence (côtes VAM, descente technique, marche rapide bâtons — R7 TRAIL,
`src/generator/trailLibrary.ts`, 14 séances spécifiques). La nage n'a pas son équivalent d'un
"trailLibrary" pour les compétences eau libre — elle a une recommandation de contexte, pas un
curriculum.

**Verdict : idée juste, avec un référent interne déjà construit (trailLibrary) qui montre
COMMENT le faire proprement dans ce dépôt.** C'est un vrai manque, pas une reformulation d'un
existant.

**Comment l'intégrer.** Suivre le patron déjà validé par R7 TRAIL : un petit registre de séances
"compétences eau libre" (sighting en solo, virage de bouée, départ groupé simulé si l'athlète
s'entraîne en club/groupe — sinon substitut nommé comme R7 TRAIL le fait pour le terrain plat, T11)
déclenché par `leg_swim_env !== "bassin"` ou par la déclaration de milieu de course
(`milieu`). Mesurer d'abord combien de profils du corpus déclarent une course en eau libre
(`leg_swim_env`) pour ne pas construire un curriculum entier pour une population marginale du
corpus actuel — dans le même esprit que la mesure d'entrée de C31 (marathon/allure lente) ou de
A-2 (angles morts de couverture).

---

## P1.7 — Répétitions générales à objectifs différenciés

**La proposition.** Une seule "répétition générale" générique avant la course ne suffit pas — il
faudrait plusieurs répétitions ciblant chacune un objectif distinct (pacing, nutrition/matériel,
logistique de transition, gestion mentale de la distance).

**Ce qui existe déjà.** Deux mécanismes distincts, chacun ciblant UN objectif spécifique, mais pas
présentés comme un ensemble coordonné : (1) T7 (`reasoningEngine.ts:612`) — répétitions
ravitaillement/matériel, 3 sorties en conditions réelles, phase spécifique, mais **seulement en
trail au-delà de 6h** ; (2) B-17 (nage) — la nage continue à la distance de course, avec le
premier palier en conditions réelles, qui est une répétition de PACING/ENDURANCE nage, pas de
matériel ; (3) le brick (`durLong` en tri/duathlon) est la répétition de TRANSITION/enchaînement,
mais n'est pas présenté explicitement comme une "répétition générale" à l'athlète — c'est une
séance nommée "Sortie longue" ou équivalent, sans le cadrage "ceci est ta répétition de
transition".

**Verdict : idée juste, et le constat le plus utile est que les pièces existent déjà séparément,
sans être nommées comme un ENSEMBLE cohérent de répétitions à objectifs différenciés.** Ce n'est
pas un manque de mécanisme (le contenu existe : pacing via B-17/CAP, matériel via T7, transition
via le brick) — c'est un manque de PRÉSENTATION et de GÉNÉRALISATION (T7 est trail-only ; aucune
répétition matériel/logistique n'existe en triathlon route/70.3/Full, où pourtant les transitions
et la nutrition en compétition posent exactement les mêmes questions qu'en trail).

**Comment l'intégrer.** Ne pas créer un nouveau mécanisme générique — généraliser T7 (actuellement
gaté sur `tObj.raceMinMid / 60 >= 6`, trail seulement) aux formats longue distance des autres
sports (70.3, Full, marathon), avec le même seuil de durée d'effort plutôt qu'un seuil de
discipline. Mesurer d'abord : sur le corpus golden, combien de profils tri/Full ou tri/70.3
dépassent le seuil de durée qui déclenche T7 en trail, pour calibrer si le seuil de 6h doit être
ajusté par sport (un Ironman à 10-12h a plus besoin d'une répétition ravito qu'un 70.3 à 5-6h,
lui-même à la limite du seuil trail actuel).

---

## P2.4 — Stimulus de force vélo (spécifique, pas seulement du sweetspot/seuil)

**La proposition.** Le vélo manquerait d'un travail de force dédié (basse cadence, gros braquet,
utile pour la puissance neuromusculaire et les côtes), au-delà du sweetspot/seuil qui domine les
séances de qualité.

**Ce qui existe déjà, et c'est plus développé que la proposition ne le suppose.**
`src/sports/bike/index.ts:19-25` construit précisément une séance de force vélo : le slot `dur2`
en dehors de l'affûtage/spec/peak/blessure route vers *"Force en côte"* ou *"Force basse cadence"*
(`bk.frc`, "Gros braquet, cadence basse... c'est musculaire, pas cardio", 50-60 rpm) — avec une
variante contre-indiquée genou/dos ("Seuil position détendue", cadence normale) quand la force
basse cadence est dangereuse pour ces zones. Le zonage `bk.frc` existe comme catégorie
d'intensité à part entière.

**Ce qui pourrait manquer, sans que je puisse le confirmer sans lire davantage** : la fréquence
et la progression de ce stimulus — est-ce qu'il apparaît systématiquement en phase base/dev (où
la littérature situe le travail de force neuromusculaire, avant la spécificité), ou seulement de
façon opportuniste selon la branche `else` du routage ? La lecture du code montre qu'il est
placé dans le "else" final (dernier recours) de la cascade `dur2`, après CLM/seuil/taper/
blessures — donc probablement présent par défaut en base/dev pour un athlète sans contrainte,
mais pas explicitement PROGRAMMÉ (pas de montée en charge dédiée du travail de force comme il en
existe pour la sortie longue via `longRunSpecificity`).

**Verdict : le mécanisme de base existe déjà et est correctement sourcé/contre-indiqué —
l'idée du conseil est probablement satisfaite pour l'essentiel.** Ce qui vaudrait la peine
d'être vérifié avant de conclure définitivement : la fréquence RÉELLE de `bk.frc` dans le golden
par phase, pour s'assurer qu'elle n'est pas noyée par les branches prioritaires (CLM, seuil en
spec/peak) au point de disparaître presque totalement du plan une fois la phase spécifique
entamée — ce qui reproduirait, pour le vélo, exactement ce qu'O-83 a trouvé pour la natation
(un mécanisme réel qui ne mord quasiment jamais sur le corpus actuel).

**Comment l'intégrer, si la mesure confirme une rareté excessive.** Pas un nouveau type de
séance — vérifier/renforcer la fréquence de la branche existante en base/dev, sur le modèle de
la mesure faite pour O-83 (« le mécanisme est réel et testé mais ferme 0 des 78 profils actuels »)
avant d'écrire quoi que ce soit.

---

## P2.9 — Le jour de repos complet comme sortie explicite du moteur

**La proposition.** Le repos complet devrait être un OUTPUT explicite et intentionnel du moteur
(un jour désigné "repos, et voici pourquoi"), pas seulement un sous-produit résiduel d'un
calendrier qui place les séances ailleurs.

**Ce qui existe déjà, à deux niveaux différents.** (1) Structurellement, le calendrier hebdomadaire
pose déjà des jours `off` explicites par sport (voir `src/sports/bike/index.ts` dernière ligne,
`slot === "off"` → `{d:"rs", name:"OFF", det:"repos total"}`) — le repos EST un slot nommé du
schéma de semaine, pas un manque. (2) Dynamiquement, le système de readiness quotidien
(`src/readiness/dailyAdjuster.ts:206-238`) peut transformer un jour PRÉVU comme actif en repos —
"OFF (readiness)" en cas de rouge en affûtage (`dailyAdjuster.ts:207-209`), "Repos complet
(douleur)" si aucune discipline n'épargne la zone douloureuse (`dailyAdjuster.ts:218-222`), "OFF"
ou "Repos actif" selon la sévérité en cas de rouge hors affûtage (`dailyAdjuster.ts:231-238`,
"deepRed"). Chaque transformation est motivée explicitement dans le champ `det` (« 💡 » suivi
des drivers).

**Ce que la proposition semble réellement viser** : est-ce que le PLAN DE BASE (avant toute
adaptation readiness) prévoit un vrai jour de repos COMPLET par semaine à un moment structurel
(analogue au principe C29 "l'affûtage garde ses jours"), ou est-ce que le seul "repos" du plan de
base est simplement l'absence de séance un jour donné, sans qu'aucune règle ne GARANTISSE au
moins un jour à zéro sollicitation par semaine sur toute la préparation (hors readiness) ? C'est
la question qui reste ouverte sans une lecture plus approfondie du `weekBuilder`/schéma
hebdomadaire par sport.

**Verdict : le mécanisme "repos" existe à deux niveaux (structurel ET adaptatif) et est déjà
motivé/expliqué comme le manifeste l'exige — la proposition est vraisemblablement déjà couverte
pour l'essentiel, la nuance à vérifier étant la GARANTIE d'un minimum hebdomadaire dans le plan
de base, indépendamment de toute adaptation de readiness.**

**Comment l'intégrer, si la garantie manque.** Mesurer d'abord : sur le golden, combien de
semaines de charge (hors readiness, hors affûtage) ne comportent AUCUN jour `off` explicite dans
le schéma déclaré par sport (`weekSchema`) ? Si le chiffre est significatif, poser un plancher
structurel analogue au plancher de fréquence de nage (`src/engine/plancherFrequence.ts`) — mais
en successeur, pas en doublon, du mécanisme de repos déjà existant.

---

## P2.10 — Consignes mentales attachées aux séances

**La proposition.** Les séances devraient porter, en plus du contenu physique (durée, allure,
zone), une consigne d'ordre mental/psychologique adaptée au contexte (gestion de la douleur en
fin de course, concentration sur un intervalle difficile, visualisation avant une compétition).

**Ce qui existe déjà.** Chaque séance porte un champ `note` (Pourquoi/Comment/quel bénéfice,
CLAUDE.md : *"Chaque séance générée explique son objectif... L'auditeur refuse une séance
muette"*), et certaines notes contiennent déjà un ELEMENT de cadrage mental sans le nommer comme
tel — par exemple la note de la sortie longue vélo (*"Endurance longue : le moteur aérobie se
construit sur la durée. Allure régulière, mange et bois régulièrement"*,
`src/sports/bike/index.ts`), ou celle du VO2max (*"Intensité maximale tenable 4min, récup
longue"*) qui prépare mentalement à l'intensité de l'effort. Le refus (R11.4/R22) porte lui-même
un ton et un cadrage psychologique explicite ("un mauvais plan vaut mieux qu'un plan dangereux").
Mais il n'existe **aucun champ ni aucune règle dédiée à une consigne MENTALE distincte du
contenu physique** — pas de bibliothèque de cues mentaux rattachés à un TYPE d'effort (comment
gérer la douleur au 30e km, comment fractionner mentalement un contre-la-montre, comment gérer
l'ennui d'une sortie longue).

**Verdict : idée juste et non couverte, mais la plus difficile à intégrer sans tomber dans le
générique/redondant.** Le risque principal, nommé par avance : une bibliothèque de "conseils
mentaux" écrite sans mesure préalable risque de produire du texte creux qui dilue la densité déjà
mesurée et corrigée du produit (U16, "le déroulement d'une séance se déroule, il ne s'entasse
pas" — CLAUDE.md documente un travail explicite de RÉDUCTION de densité de texte par séance,
06/08/2026). Ajouter une couche de conseil mental à CHAQUE séance irait dans le sens inverse de
ce travail, sauf à le faire de façon très ciblée.

**Comment l'intégrer, si retenue.** Ne pas ajouter un champ générique à toutes les séances —
cibler les moments où un cadrage mental a une vraie valeur ajoutée mesurable : la dernière
répétition d'un intervalle dur (VO2max), le dernier tiers d'une sortie longue, la semaine de
course elle-même (le refus R11.4 et le bandeau de fin de plan montrent déjà que ce dépôt sait
faire ce genre de cadrage avec parcimonie). Suivre le même principe que N1 en nutrition ("pas
besoin de glucides sur une séance courte") — silence par défaut, consigne uniquement quand elle
a une vraie valeur.

---

## Chantier séparé — système de décision automatique Go / Adapt / Recover

**La proposition.** Un système à trois états qui déciderait automatiquement, chaque jour, si
l'athlète doit suivre le plan tel quel (Go), l'adapter (Adapt), ou se reposer/récupérer
(Recover) — présenté par le conseil comme un chantier à part, plus ambitieux que les dix
propositions précédentes.

**Ce qui existe déjà, et c'est presque exactement ce système, déjà en production.**
`src/readiness/readinessSource.ts:82-160` (`assessReadiness`) calcule un verdict à trois niveaux
— `verte`/`orange`/`rouge` — à partir de signaux objectifs (VFC vs base mesurée, FC repos vs
baseline, heures de sommeil) et subjectifs (énergie, ressenti), avec la règle A4 explicite : *"un
ressenti déclaratif ne peut pas effacer une mesure"* (le score composite ne laisse jamais le
subjectif compenser un objectif négatif, `readinessSource.ts:141` : *"quand la mesure est
négative, le déclaratif ne peut qu'AGGRAVER, jamais compenser"*). `src/readiness/dailyAdjuster.ts`
traduit ce verdict en action concrète sur le jour : vert → rien ; orange → réduire (`reduceDay`,
×0.7) ; rouge → remplacer par de l'endurance, reposer, ou OFF selon le contexte (taper, douleur,
gravité). C'est très précisément un système **Go (verte) / Adapt (orange → reduce, ou rouge →
replace) / Recover (rouge → rest/off)**, développé au Sprint 2 et déjà en production.

En complément, R21 (`src/coach/proactiveCoach.ts`, `src/app/bridge.ts:1149` `coachOnIngestV2`)
étend cette logique à un horizon de 14 jours APRÈS ingestion d'une séance réelle (FIT/GPX/TCX/
Strava) : détection de déviation (intensité >10% hors bande, séance manquée >24h, charge 7j
>15%), recalcul borné à 14 jours, **jamais à la hausse** — garantie testée explicitement
(`src/audit/proactiveDemo.ts:11-18` : *"IL NE REMONTE JAMAIS LA CHARGE... un test qui vérifierait
seulement 'ça réagit' serait satisfait par un module dangereux"*).

**Verdict : le chantier proposé est, dans sa substance, déjà construit et en production.** Ce que
le conseil demande PEUT-ÊTRE en plus, et qui distinguerait vraiment sa proposition de l'existant :
(1) un vocabulaire "Go/Adapt/Recover" plus lisible pour l'athlète que "vert/orange/rouge" (question
d'UX, pas de mécanique) ; (2) une fusion plus explicite entre le verdict quotidien
(`assessReadiness`) et le recalcul post-ingestion (`onSessionIngested`), qui sont aujourd'hui deux
chemins d'entrée distincts (le matin via check-in, après-coup via import) plutôt qu'un seul
système perçu comme unifié par l'athlète.

**Comment y répondre au conseiller.** Le chantier n'est pas à ouvrir de zéro — il existe déjà sous
les noms `assessReadiness`/`dailyAdjuster` (le "chaque jour") et `proactiveCoach`/`onSessionIngested`
(le "après ingestion", fenêtre 14 jours). La vraie question à renvoyer au conseil : quel comportement
précis attend-il de "Go/Adapt/Recover" que `verte/orange/rouge` + `reduceDay`/`enduranceReplacement`/
`OFF` ne couvre pas déjà ? Sans exemple concret de lacune, il est probable que la proposition
décrive, avec un vocabulaire différent, un système déjà construit, testé (`demo:readiness`,
`demo:proactif`, 2 gates CI dédiées) et documenté.

---

## Synthèse priorisée

| # | Idée | Verdict | Ce qu'il reste à faire, dans l'ordre |
|---|---|---|---|
| Transversale | Budget de séances qualitatives (compte, pas minutes) | Angle mort réel | Mesurer la fréquence de créneaux qualitatifs/semaine sur le golden avant d'écrire un plafond |
| P0.1 | Retest périodique | Mécanisme complet, déclencheur à vérifier | Confirmer si `retestSuggestionHTML` a un critère temporel automatique ; sinon le coupler à R21 |
| P0.2 | Plafonner le rebond post-récup | Plausible, à mesurer | Chercher des cas `charge(N+1) > charge(N-1)×C22` sur le golden autour des semaines de récup |
| P0.3 | Pic pas juste avant taper | Intentionnel dans sa forme actuelle (Bosquet) | Vérifier la composition jour-par-jour de la dernière semaine de peak (jour de transition avant taper ?) |
| P0.5 | Seuil/économie en CAP par redistribution | L'affûtage garde déjà l'intensité (C29c) ; la question du plancher en phase peak reste ouverte | Mesurer la part de seuil en spec/peak, chercher un plancher DÉRIVÉ si elle est structurellement basse |
| P0.8 | Nutrition native aux séances | Calcul déjà par-séance, raccordement au texte manquant | Câbler `nutritionCalculator` au champ `note`/`det` de `renderSess`, sur seuil déjà défini (`longish`/`hard`) |
| P1.6 | Compétences eau libre | Vrai manque (curriculum absent, contrairement au trail) | Registre de séances dédiées, calqué sur `trailLibrary.ts`, gaté sur `leg_swim_env` |
| P1.7 | Répétitions générales différenciées | Pièces déjà là séparément (T7, B-17, brick), non généralisées ni présentées comme un ensemble | Généraliser T7 (aujourd'hui trail>6h seulement) aux formats longs des autres sports |
| P2.4 | Stimulus force vélo | Déjà construit (`bk.frc`) | Mesurer sa fréquence réelle en phase spec/peak avant de conclure à un manque |
| P2.9 | Repos complet, sortie explicite | Existe à deux niveaux (structurel + adaptatif), garantie hebdomadaire à vérifier | Mesurer le nombre de semaines de charge sans jour `off` dans le schéma déclaré |
| P2.10 | Consignes mentales attachées | Vrai manque, risque de dilution de densité (U16) | Cibler 2-3 moments à haute valeur plutôt qu'un champ générique partout |
| Chantier | Go/Adapt/Recover | Déjà construit sous un autre nom (`assessReadiness`+`dailyAdjuster`+R21) | Clarifier avec le conseiller ce qui manquerait à l'existant plutôt que rouvrir le chantier |

**Lecture d'ensemble.** Sur douze points examinés, quatre sont déjà couverts pour l'essentiel par
un mécanisme existant (P0.1 retest, P0.5 intensité en affûtage, P2.4 force vélo, chantier
Go/Adapt/Recover) — ce qui ne les rend pas inutiles à discuter : ça veut dire que le vrai travail
est de vérifier si le déclencheur/la fréquence/la visibilité de ce qui existe est suffisant, pas
d'écrire un nouveau mécanisme. Trois sont des angles morts réels et non triviaux à corriger sans
mesure préalable (le budget de séances qualitatives, les compétences eau libre, le raccordement
nutrition-séance). Le reste demande une mesure factuelle sur le corpus actuel avant de pouvoir
trancher — exactement la règle 7 de ce dépôt (« mesurer avant d'écrire la règle ») appliquée à un
conseil externe plutôt qu'à un ticket interne.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WRroTE1GUunNK31uvXV6oW
