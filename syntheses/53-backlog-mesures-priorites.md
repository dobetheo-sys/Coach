# Backlog de mesures — résultats

**06/09/2026 — suite directe de `52-analyse-priorites-moteur-conseiller-externe.md` et du backlog
transmis en retour (`backlogmesuresavantregles.md`).** Toutes les mesures listées comme
« à faire tourner sur le golden » ont été exécutées — `scripts/mesureBacklogPriorites.mjs`
(`npm run mesure:backlog-priorites [section]`), sur les **1060 profils** générés par
`profiles()` (`scripts/goldenMaster.mjs`, le même corpus que l'auditeur). Aucune règle n'a été
écrite : ce document ne fait que remplacer les hypothèses du document 52 par des chiffres, et
corrige deux endroits où l'hypothèse initiale était fausse. `src/` n'a pas bougé — seul le
script de mesure et son entrée `package.json` sont nouveaux.

**Méthode et un incident de mesure, publié plutôt que caché** : la première écriture du volet
« rebond post-récup » lisait un champ `w.prescribedMin` qui n'existe que sur le résultat de
`auditPlan()` (`WeekAudit`), pas sur les semaines brutes rendues par `buildPlan()` — elle rendait
**0/0 paires trouvées**, un zéro qui aurait pu se lire comme « le rebond n'existe jamais » alors
qu'il mesurait une grandeur absente (`undefined`). Corrigé en recalculant la charge directement
depuis les séances (`chargeMinOf`), le volet est repassé à 4658 paires trouvées — c'est
exactement le mode de défaillance que ce dépôt appelle « un zéro saturé accuse l'instrument »
(règle 15 de CLAUDE.md), attrapé avant publication.

---

## Déjà couvert — le déclencheur/la fréquence, vérifiés

### Retest périodique — le déclencheur EST temporel, et il est purement passif

Lu directement dans le code (`endurabuild/js/ui/tab-profile.js:462`, `retestSuggestionHTML()`) :
la suggestion se calcule bien sur un critère temporel automatique — **dernière référence
mesurée + 42 jours**, avec un marqueur « c'est le moment ! » si la date est dépassée. Ce n'était
donc pas une hypothèse à confirmer par le golden (aucune mesure sur plan n'y répond), c'est une
lecture directe du code qui tranche : **le calcul est temporel, mais son affichage est
entièrement PASSIF** — la fonction n'est appelée que quand l'athlète ouvre l'onglet Profil
(`tab-profile.js:1141`). Rien ne pousse cette information ailleurs (pas de notification, pas de
signal R21). Un athlète qui n'ouvre jamais son Profil ne voit jamais la suggestion, même
« en retard » de plusieurs mois.

**Verdict confirmé (pas seulement plausible)** : le mécanisme de calcul est bon, le
raccordement à une notification proactive manque réellement. Décision reprise du document 52 :
coupler à R21 (`coachOnIngestV2`) plutôt que réinventer le calcul de date.

### Force vélo (`bk.frc`) — le mécanisme existe et disparaît totalement en spec/peak/taper

| Phase | Semaines avec ≥1 séance de force vélo |
|---|---|
| base | 96,7 % (2739/2832) |
| dev | 26,1 % (582/2231) |
| spec | **0,0 %** (0/2369) |
| peak | **0,0 %** (0/1310) |
| taper | 0,0 % (0/890 — attendu, l'affûtage ne pose jamais de force) |

Le document 52 hésitait (« probablement présent par défaut en base/dev, à vérifier en
spec/peak »). La mesure tranche net : **0,0 % exactement**, pas une rareté — une absence totale.
La cause n'est pas un défaut caché, elle est lisible dans la cascade de routage
(`src/sports/bike/index.ts`, slot `dur2`) : en spec/peak, la branche `clm && (spec||peak)` et la
branche générale `spec||peak` renvoient TOUJOURS vers `bk.thr` (seuil/race-pace) avant que la
branche finale qui porte `bk.frc` (le `else` de la cascade) ne soit jamais atteinte — la force
n'est câblée que dans les branches basses de priorité (base/dev/blessure/taper), qui ne
s'exécutent jamais en spec/peak sur un profil standard.

**Verdict révisé par rapport au document 52** : ce n'est plus « à vérifier » — c'est confirmé.
Que ce soit un défaut ou un choix assumé (le travail de force neuromusculaire cède la place au
seuil/VO2max spécifique une fois la période de spécificité entamée, ce qui est défendable en
soi) est une question d'arbitrage, pas de mesure — mais le fait que la proposition P2.4 pointait
juste sur un point précis (« au-delà du sweetspot/seuil qui domine ») est maintenant chiffré : le
seuil/VO2max domine à 100 % en spec/peak, la force à 0 %, pas de zone grise entre les deux.

### Go/Adapt/Recover — pas de nouvelle mesure, la question posée au conseiller reste ouverte

Rien à mesurer sur le golden pour ce point (c'est une question de couverture fonctionnelle, pas
de statistique de corpus). Le document 52 reste la référence : demander au conseiller un exemple
concret de comportement que `assessReadiness`/`dailyAdjuster`/`proactiveCoach` ne couvrirait pas.

---

## Angles morts réels — calibrés

### Budget de séances qualitatives — concentré dans le multisport, jamais dans le monosport

| Sport | % de semaines de charge à ≥3 créneaux qualitatifs (dur/modéré) | Distribution (nombre de créneaux → count) |
|---|---|---|
| swim | **84,2 %** | 0:104 · 1:67 · 2:63 · **3:1250** |
| tri | **81,0 %** | 0:56 · 1:23 · 2:647 · 3:1608 · 4:639 · 5:840 · 6:10 |
| swimrun | **77,0 %** | 2:346 · **3:1161** |
| duathlon | 39,7 % | 1:22 · 2:1529 · **3:1020** |
| run | **0,0 %** | 0:36 · 1:194 · 2:2076 (jamais 3+) |
| bike | **0,0 %** | 0:36 · 1:38 · 2:2274 (jamais 3+) |
| trail | 0,0 % | 0:82 · 1:1406 · 2:100 (jamais 3+) |

**Confirmation nette et localisée** : les sports MONOSPORT ne dépassent jamais 2 créneaux
qualitatifs par semaine (plafonnés structurellement par le nombre de slots `dur1`/`dur2` du
schéma) — la préoccupation du conseiller n'a AUCUNE prise sur eux. Elle se concentre entièrement
sur les sports MULTIDISCIPLINE, où chaque discipline apporte son propre créneau qualitatif
indépendamment des autres — jusqu'à 6 créneaux/semaine en triathlon (10 profils). C'est
exactement le mécanisme que le conseiller décrivait (une somme de coûts de récupération
indépendants de la durée), et c'est désormais localisé : **si une règle de compte doit être
écrite, elle ne concerne que tri/swimrun/duathlon/swim**, pas le reste du registre de sports.

### Repos complet — jamais absent, mais rarement « complet » en multisport

| Sport | Semaines sans jour `off` (repos total) | Semaines sans NI off NI récup active |
|---|---|---|
| duathlon | 94,7 % | 0,0 % |
| bike | 92,0 % | 0,0 % |
| tri | 90,7 % | 0,0 % |
| swim | 79,3 % | 0,0 % |
| run | 10,8 % | 0,0 % |
| trail | 0,4 % | 0,0 % |
| swimrun | 0,4 % | 0,0 % |

**Résultat plus nuancé que ce que le document 52 anticipait.** Il n'existe **aucune** semaine de
charge du corpus sans une journée de décharge d'une forme ou d'une autre (0,0 % partout sur la
colonne « ni off ni récup ») — le repos n'est jamais structurellement absent. Mais pour
bike/tri/duathlon/swim, cette décharge est presque toujours de la **récupération active**
(`charge: "recup"` — moulinage léger, nage récup courte), quasiment jamais un **repos total**
(`charge: "off"`). Le monosport course à pied et le trail/swimrun, à l'inverse, posent un vrai
jour `off` presque systématiquement. La proposition P2.9 (« sortie explicite du moteur ») trouve
donc sa vraie cible : pas « ajouter du repos là où il n'y en a pas », mais **transformer, sur les
sports multidiscipline, au moins une décharge par semaine en repos TOTAL plutôt qu'en
récupération active** — un arbitrage d'entraînement (est-ce souhaitable ?), pas une correction de
bug, et à trancher avec le fondateur avant d'écrire quoi que ce soit.

---

## À mesurer avant de trancher — verdicts

### Rebond post-récup — la borne existe, la marge de dépassement observée est minime

**4658 paires** (semaine de charge → récup → semaine de charge suivante) trouvées sur le corpus.
**116 (2,5 %)** dépassent le facteur C22 (×1,10) appliqué à la charge D'AVANT la récupération —
mais le pire cas mesuré est **×1,11**, soit un point au-dessus du seuil, jamais un rebond violent
(le conseiller craignait potentiellement un rattrapage brutal ; ce n'est pas ce qui est trouvé).
Concentré sur des profils `vol-min`/blessure/débutant à petites minutes, où l'arrondi d'un
créneau entier (pas de fraction de séance) peut facilement faire franchir un ratio de +1 point.

**Verdict** : la préoccupation est réelle mais son ampleur mesurée est faible — un plafond à
3 termes (charge-après ≤ charge-avant × C22) fermerait ce résidu, mais le gain serait marginal
(116 cas, tous à ×1,11 maximum) comparé au coût d'une nouvelle règle qui devrait, comme les
fiches 50-51 l'ont déjà payé pour T-56, exclure soigneusement les séances protégées/épinglées de
son calcul de référence. **Recommandation : ne pas écrire de règle pour ce résidu tant qu'il
reste sous ce seuil d'ampleur** — le republier si une future mesure montre une population ou une
amplitude plus grande.

### Pic juste avant le taper — le placement est déjà correct, la crainte est réfutée

**1060 transitions peak→taper**, et le dernier jour de la dernière semaine de peak est **soit
`facile` (79,9 %), soit `off` (20,0 %) — jamais `dur` (0,0 %, hors une exception `recup` à
0,1 %)**. Contrairement à l'hypothèse ouverte du document 52, il n'y a **aucun cas** où le plan
enchaîne un jour dur en fin de peak avec le premier jour réduit de taper sans transition.

**Verdict : la préoccupation P0.3 est réfutée sur le placement.** Le mur de volume
(`BANDS.peak=[1,1]` → `BANDS.taper=[0.55,0.3]`, une réduction de 45 % dès la première semaine
d'affûtage) reste réel et voulu (c'est la définition même de l'affûtage, Bosquet 2007) — mais ce
n'est pas un problème de PLACEMENT comme le document 52 le soupçonnait : aucune règle
supplémentaire n'est nécessaire ici. **Ce point sort du backlog.**

### Seuil/économie de course en CAP (spec/peak) — présent, mais classé « dur », pas « modéré »

| Sport | facile | modéré | dur |
|---|---|---|---|
| run | 82,6 % | 11,8 % | 5,6 % |
| bike | 93,2 % | **0,0 %** | 6,7 % |
| swim | 51,1 % | 32,8 % | 16,1 % |
| tri | 60,7 % | 30,6 % | 8,6 % |
| trail | 93,1 % | 3,3 % | 3,7 % |
| duathlon | 86,3 % | 4,6 % | 9,1 % |
| swimrun | 74,7 % | 20,5 % | 4,8 % |

**Le 0,0 % de modéré en vélo a été vérifié comme un fait réel, pas une erreur de mesure** (voir
règle 15 : un taux saturé se prouve avant d'être cru) — lu dans le code
(`src/engine/loadModel.ts:323-324`, `HARD_SUFFIX = [".vo2",".thr",".speed",".css"]` vs
`MOD_SUFFIX=[".ss",".rp",".frc",".mara"]`), les deux séances qui occupent les créneaux qualitatifs
du vélo en spec/peak sont VO2max (`.vo2`, dur) et Seuil/race-pace (`.thr`, dur) — le sweetspot
(`.ss`, modéré) n'apparaît que sur les branches minoritaires (genou fragile, débutant, finisher).
**Ce n'est donc pas une absence de travail de seuil/économie en phase CAP** — il existe, il est
simplement classé « dur » plutôt que « modéré » par la taxonomie de zones de ce moteur, qui
range le seuil (`.thr`) au même niveau que le VO2max. Le tri et la nage, à l'inverse, portent une
part modérée substantielle en spec/peak (30,6 % et 32,8 %) — en grande partie grâce à la
reclassification `sw.aero` de la fiche 55 (avant cette fiche, ce modéré nageur aurait été compté
« facile »).

**Verdict révisé par rapport au document 52** : la proposition P0.5 semblait pointer un manque
réel ; la mesure montre qu'il n'y a pas de trou de contenu — il y a un désaccord possible sur le
VOCABULAIRE (« modéré » vs « dur » pour le seuil), qui n'a pas de conséquence sur ce que
l'athlète reçoit, seulement sur la façon dont ce dépôt classe l'effort en interne. **Ce point sort
du backlog en l'état** — rouvrable seulement si le conseiller précise qu'il vise un manque de
contenu (aucun trouvé) plutôt qu'un désaccord de classification (non actionnable sans
redéfinir C26/C26d, ce que rien ne justifie ici).

### Répétitions générales généralisées (T7) — non mesuré dans cette passe

Cette question exige de faire tourner le prédicteur de temps de course (`predict()`) sur chaque
profil tri/70.3/Full pour savoir combien franchissent le seuil de 6h qui déclenche T7 en trail —
un calcul plus lourd que les six autres (il engage la chaîne de prédiction complète, pas
seulement le plan). **Non fait dans cette passe**, faute de temps ; reste au backlog tel quel,
avec la même recommandation qu'au document 52 (généraliser T7 au seuil de durée d'effort plutôt
qu'au sport, calibré par format).

---

## Backlog mis à jour

| # | Statut avant cette passe | Statut après mesure |
|---|---|---|
| Retest — déclencheur | à vérifier | **Confirmé : temporel mais passif** → coupler à R21 |
| Force vélo — fréquence par phase | à vérifier | **Confirmé : 0,0 % en spec/peak/taper**, cause identifiée dans le routage |
| Repos complet — garantie hebdo | à mesurer | **Mesuré : 0 semaine sans décharge, mais decharge = récup active à 79-95 % en multisport** — arbitrage d'entraînement à poser |
| Budget séances qualitatives | angle mort déclaré | **Calibré : concentré sur swim/tri/swimrun/duathlon (39-84 %), nul sur run/bike/trail (0 %)** |
| Rebond post-récup | à mesurer | **Mesuré : 2,5 % des cas, amplitude minime (max ×1,11)** — pas prioritaire |
| Pic avant taper | à mesurer | **Réfuté : 0 % de cas, placement déjà sûr** — sorti du backlog |
| Seuil CAP en spec/peak | à mesurer | **Présent mais classé "dur"** — pas un manque de contenu, sorti du backlog en l'état |
| Répétitions générales (T7) | à mesurer | **Non fait** — nécessite le prédicteur, reporté |
| Go/Adapt/Recover | question à renvoyer | **Inchangé** — en attente d'un exemple concret du conseiller |

Sur neuf lignes du backlog, deux sont désormais closes par une mesure négative (pic-avant-taper,
seuil-CAP), deux sont confirmées et prêtes pour un arbitrage de conception plutôt qu'une nouvelle
mesure (force vélo, retest), une est calibrée et prête à devenir une règle si le fondateur le
décide (budget qualitatif), une reste ouverte mais de faible priorité (rebond post-récup), une
n'a pas pu être mesurée dans cette passe (T7), et une reste une question pour le conseiller
(Go/Adapt/Recover).

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WRroTE1GUunNK31uvXV6oW
