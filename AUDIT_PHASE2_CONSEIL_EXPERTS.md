# Audit du moteur — Phase 2 : le conseil d'experts simulé

*01/09/2026 · corpus **1 071 profils** (fiches 34-40), moteur au commit `8882382` · document
d'AVIS : `src/` est byte-identique, aucune correction n'est appliquée ici.*

---

## 0. Méthode — ce que « exhaustif » veut dire ici, et ce qui a été publié en chemin

**Le balayage est exhaustif par AGRÉGATS, pas ligne à ligne.** Les 1 071 plans de la photo
golden (`golden/plans.full.json`, vérifiée `1071/1071 · 0 écart` contre le moteur avant toute
mesure) sont joints à leurs réponses (`profiles()` de `goldenMaster.mjs`) et traversés par un
script unique (`sweep.mjs`) qui calcule, pour CHAQUE profil : pic hebdomadaire, part
facile/modéré/dur par semaine (classificateur du moteur, `intensitySplit` — jamais une seconde
liste), minutes par discipline avec les legs de brick ventilés, ratio de chaque semaine de récup
à ses voisines de charge, ratio d'affûtage au pic, sauts de croissance à la définition de
l'AUDITEUR (`coherenceScorer.ts:328-341`), présence de VO2, séances extrêmes. Les distributions
sont données avec min / médiane / p90 / max, et **toutes les valeurs extrêmes ont été extraites
nominativement** — c'est le sens de « les extrêmes systématiquement vérifiés » du brief. Lire
les ~40 000 séances une à une n'aurait pas été une meilleure mesure : ce serait la même somme,
sans la garantie d'uniformité de l'instrument.

**Trois fautes de mes propres instruments, trouvées et publiées avant tout verdict** — le
document n'aurait pas la même conclusion sans elles :

1. mon premier compteur de croissance comparait les semaines de charge **adjacentes** au seuil
   ×1,10 et annonçait 39 à 78 « violations C22 » par sport ; la définition de l'AUDITEUR
   (`coherenceScorer.ts:328-341`) saute récup et affûtage, porte la semaine précédente à
   travers, et son seuil DUR est ×1,25 (le ×1,10 est la CIBLE du générateur). Remesué à sa
   définition : **0 saut dur sur tout le corpus, 9 doux (15-25 %)**. Règle 15 — j'avais mesuré
   ma définition, pas la sienne ;
2. ma première lecture des phases lisait `phase.id`, un champ que la photo n'a pas
   (`phase.nom`) : tous les ratios d'affûtage sortaient vides (« — ») et l'affûtage était
   compté comme de la charge. Corrigé avant toute conclusion ;
3. mon premier compteur du repli FC vélo cherchait « FC / ressenti » dans les textes et rendait
   11/69 ; la consigne réelle écrit des bandes en **bpm** (« 11min @ 147-160 bpm »). Recompté :
   **45/69**. Le verdict du rôle vélo s'inverse avec l'instrument.

---

## 1. Les avis, rôle par rôle

Chaque point porte un verdict : **CONFORME** · **À SURVEILLER** · **PROBLÉMATIQUE**.

---

### 1.1 Médecin du sport

**a) Les trois correctifs de la Phase 1 — le correctif est-il suffisant ?**

- **Contre-indication multisport (R6.1b, fiche 39)** : **CONFORME sur le mécanisme, À
  SURVEILLER sur la dose.** Les treize zones déplacent désormais le mix dans leur sens déclaré
  (course d'un 70.3 : 36,22 → 25,42 % sur les zones d'appui), la passe ne supprime jamais un
  jour (elle substitue), n'entre pas dans l'affûtage, et `epaule` reste sur son mécanisme O-85 —
  vérifié inchangée au centième. Ma réserve de médecin : **un jour par semaine est un
  plafond de PRUDENCE, pas une posologie.** Une aponévrosite plantaire en poussée ne se
  contente pas de −1 jour de course ; mais le produit dit lui-même, dans la décision R6.1b,
  qu'« un avis médical reste la vraie réponse ». La graduation (1 jour vs tout retirer) est le
  bon régime O-17 tant que ce message reste affiché. Verdict : suffisant comme geste par
  défaut, à condition de ne jamais le présenter comme un traitement.
- **Zones sans entrée (fiche 39)** : **CONFORME.** `cheville`/`fascia`/`quadriceps`/`velo`
  calquées sur des zones arbitrées, et surtout `readInjuries` DÉRIVE désormais
  `impact`/`impactAny` de la table (`constraintMatrix.ts:918-931`) — c'est la moitié durable du
  correctif : la prochaine zone ajoutée ne pourra plus être invisible au plafond d'appuis.
- **Borne d'âge trail (O-112, fiche 40)** : **CONFORME.** 42 km aligné sur le marathon, colonne
  18 ans inchangée au centième, frontière photographiée dans les deux sens.

**b) Le facteur d'âge gradué (×0,85² à 75 ans, ×0,70² à 13 ans) — défendable médicalement ?**

**À SURVEILLER — défendable comme construction, indéfendable comme référence.** Le choix de NE
PAS inventer une formule continue sans source est exactement ce qu'un comité médical demanderait
— répéter le pas déjà arbitré est l'option la plus prudente disponible
(`constraintMatrix.ts:855-880`, l'avertissement est écrit dans le code). Mais trois faits
restent à charge : (1) **aucune référence externe n'existe dans le dépôt pour l'âge et la
charge**, alors que Bosquet, Coggan, Nielsen, Plews existent ailleurs — c'est LA lacune de
sourcing prioritaire, avant même les constantes du physiologiste, parce qu'elle touche des
populations vulnérables ; (2) les seuils 13 et 75 sont posés « au milieu de l'intervalle
plat », pas sur une donnée ; (3) mesuré sur le corpus, **le plafond de temps DUR n'est pas
modulé par l'âge** : `G/duathlon/PM/mineur-format-ouvert` (16 ans) livre jusqu'à **65 min
pondérées de dur par semaine**, au ras du plafond adulte confirmé (60 ×1,1 = 66 —
`C26b_HARD_TIME_BY_HISTORY`, `constraintMatrix.ts:547`). R6.3 retire la VO2max et scale le
VOLUME (×0,7) mais laisse le seuil au tarif adulte. Chez un adolescent, le travail au seuil
répété est précisément ce que les recommandations pédiatriques (ex. consensus AAP/CIO sur la
spécialisation précoce) demandent de doser à part. **Recommandation : un plafond de dur
spécifique mineur, ou au minimum le facteur ×0,7 appliqué AUSSI au plafond de dur.**

**c) Les drapeaux médicaux, balayés sur les 16 profils MED du corpus** : **CONFORME.** Les
16 profils (`MED/tri/70.3/*`, `MED/run/semi/*`, `MED/bike/route/*`, `MED/trail/-/*` — pain,
dizzy, treat, tous, croisés débutant/inter) livrent **0 minute dure et 0 minute de VO2, sans
exception**. Le contournement trouvé jadis par `audit:v7` (U-MED, budget zéro) ne se reproduit
pas sur le corpus.

**d) Les mineurs, balayés (7 profils)** : **CONFORME sur la VO2** — zéro bloc VO2 sur les sept.
Voir b) pour la réserve sur le seuil.

**e) Les masters (9 profils 60-100 ans)** : **CONFORME.** Cadence de récup observée : jamais
plus de 4 semaines entre deux décharges (= 3 semaines de charge + la décharge — c'est bien
« récup toutes les 3 semaines »), et le second palier ×0,72 agit à 75+ (pic 4,48 → 3,85 h sur
`AGE/run/semi/80` vs `/70`).

**f) O-97 (budget de séances annoncé non borné par le calendrier)** : **À SURVEILLER, pas
dangereux.** Depuis O-87 la carte affiche le couple étiqueté (« 11 prescrites — ta semaine la
plus fournie en livre 10 ») : l'athlète voit le livré. Le défaut est un défaut d'HONNÊTETÉ du
prescrit, pas de sécurité — le plan livré, lui, est borné. À corriger pour la précision, avec la
mesure d'entrée que le ticket réclame (l'effet sur les 70/986 profils où `applySessionBudget`
mord déjà).

**g) O-111 (le `det` d'une course intermédiaire réécrit)** : **PROBLÉMATIQUE, et c'est le
ticket ouvert le plus proche d'un enjeu de sécurité.** La consigne écrasée est précisément
celle qui dit à l'athlète de PARTIR CONTRÔLÉ sur une course intermédiaire (« Départ contrôlé,
première moitié retenue… ») ; à la place il lit « la semaine est allégée autour ». Une course B
courue à fond sans consigne de retenue, au milieu d'une préparation, est le scénario de
sur-sollicitation que le module course intermédiaire existe pour encadrer. Le correctif proposé
au registre (« `renderSess` ne réécrit jamais le `det` d'une séance `race` ») est un point
unique, la dette est déjà déclarée au banc v6 (`R23.18-A`, `expect: "fail"`). **À traiter en
tête de file.**

---

### 1.2 Physiologiste de l'exercice

**Balayage d'appui** : distributions sur les ~7 000 semaines de charge du corpus (voir §0).
Aucun saut de volume > +25 % entre semaines de charge (0/corpus, définition de l'auditeur),
9 sauts doux 15-25 % (4 swim, 5 tri) : la promesse de progression lissée est **tenue sur le
livré**, pas seulement déclarée.

**Les onze constantes non sourcées de la Phase 1, une par une** :

| constante (fichier:ligne) | valeur | verdict | pourquoi |
|---|---|---|---|
| `C22_MAX_WEEKLY_GROWTH` (`constraintMatrix.ts:113`) | ×1,10 | **CONFORME** | la « règle des 10 % » est un consensus d'enseignement ; sa validation empirique est faible (les études type Buist 2008 ne montrent pas moins de blessures à 10 % qu'à plus), mais comme BORNE elle est du bon côté, et le livré la tient (0 saut dur) |
| `RECUP_WEEK_FACTOR` (`:120`) | 0,62 | **À SURVEILLER** | 0,6-0,7 est la fourchette d'usage (décharge à −30/−40 %) — plausible. Le problème n'est pas la constante, c'est que le LIVRÉ ne la suit pas : voir le point suivant |
| `C26_HARD_TIME_CAP_MIN` (`:526`) | 60 min | **CONFORME** | cohérent avec ~2 séances de qualité de 25-35 min de temps dur effectif ; Seiler compte en séances (2-3/sem), la traduction en minutes est défendable |
| `C26b_HARD_TIME_BEGINNER_MIN` (`:552`) | 25 min | **CONFORME** | la justification interne (tissu conjonctif avant puissance) est le bon argument, et le corpus la livre (dur max mineurs/débutants bien sous les adultes) |
| `C26b_HARD_TIME_BY_HISTORY` (`:547`) | 35/60/60 | **À SURVEILLER** | reprise 35 est prudent et bien ; « confirmé = ancien = 60 » écrase une distinction que le reste du moteur honore (SWIM_TIME_FACTOR distingue les trois) |
| `DOSE_CAP_MIN` (`:425`) | seuil 40 · VO2 25 | **CONFORME** | 40 min de seuil et 25 de VO2 par séance sont des doses hautes mais classiques (2×20, 5×5) ; le banc v7 les garde à budget zéro |
| `HARD_DISC_WEIGHT` (`:636`) | rn 1 · bk 0,75 · sw 0,5 | **À SURVEILLER** | l'ORDRE est incontestable (impact > pédalage > flottaison) ; les VALEURS 0,75/0,5 sont posées. C'est la constante dont dépend le plafond de dur multisport : elle mérite une justification écrite, même interne |
| `SWIM_TIME_FACTOR` (`:200-208`) | 0,45/0,60/0,70 | **CONFORME** | la part de temps effectif de nage dans une heure de bassin croît avec l'expérience : ordre et grandeurs plausibles, et le choix du repli sur la valeur la plus prudente (0,45) est le bon |
| `C24_MIN_SWIM_SESSION_M` (`:215`) | 750 m | **CONFORME** | vient du manifeste (« sortie piscine de 600 m » interdite) — c'est une source interne, mais c'en est une |
| `O81_FOOTING_CIBLE_PIC_MIN` (`:368`) | 50 min | **CONFORME** | une sortie facile de référence à 50 min au pic est du milieu de gamme |
| `ALLOC_CIBLE` (`:406`) | 50/30/20 | voir le débat §2.4 — la cible est plausible, le corpus en est LOIN à médiane |

**Le point NOUVEAU du balayage — la semaine de décharge livrée descend bien sous sa constante,
et en tri elle tombe à 12 %** : **PROBLÉMATIQUE.**

```
ratio récup / voisines de charge (min · méd · p90 · max)
run 0,37·0,64·0,68·0,81   bike 0,41·0,62·0,67·0,70   swim 0,18·0,55·0,74·0,91
tri 0,12·0,49·0,60·0,72   duathlon 0,17·0,54·0,63·0,70   swimrun 0,17·0,55·0,60·0,64   trail 0,24·0,50·0,61·0,95
```

`RECUP_WEEK_FACTOR = 0,62` : run et bike livrent leur médiane DESSUS (0,64 · 0,62) ; **tri,
duathlon, swimrun et trail livrent 0,49-0,55 en médiane, et la queue basse du tri atteint
0,12** — `tri/M/reprise/inter/competition` S3 : **30 minutes** de semaine de récup entre deux
semaines à 242 et 250 min, et 30 profils tri sous 0,25 (nommés dans l'annexe de mesure). Une
« décharge » à −88 % n'est plus une décharge, c'est une interruption : on y perd les
adaptations de la semaine sans le bénéfice d'un vrai repos, et la reprise à 250 min derrière
est un à-coup que C22 ne voit pas (il saute les récups — par construction). O-93/T-56 a réglé
le CONTENU des décharges (plus dures que les charges), pas leur PLANCHER de volume. **Aucun
plancher de récup n'existe** : c'est symétrique au plafond (0,62) qui, lui, existe.
**Recommandation : un plancher de semaine de décharge (ex. ≥ 0,40 × voisines, à mesurer
d'abord), en commençant par le tri `reprise` où la queue vit.**

**L'affûtage** : **CONFORME** — max 0,55 partout (= `R313_TAPER_MAX_VS_PEAK`, Bosquet 2007,
tenu au max sur ~1 800 semaines d'affûtage), médianes 0,40-0,53, **avec UNE exception** :
`G/trail/-/measured-bas` S27 à **0,78 du pic** (336' pour 429'). Un seul profil sur 1 071, mais
c'est un dépassement d'une borne SOURCÉE : à regarder (la piste : un pic petit — 7,2 h — contre
des planchers de séance trail qui ne descendent pas). Transmis à l'entraîneur trail (§1.4).

---

### 1.3 Entraîneur triathlon

**a) `ALLOC_CIBLE` 50/30/20 (`constraintMatrix.ts:406`) — la cible est bonne, le corpus en est
loin** : **À SURVEILLER.** La cible colle au partage du TEMPS DE COURSE d'un long (vélo ~52 %,
course ~36 %, nage ~12 % — pondérer la nage au-dessus de sa part de course est un choix
d'entraîneur défendable : c'est la discipline technique). Mais mesuré sur les **206 profils
tri**, legs de brick ventilés :

```
part livrée      min      médiane      max        cible
nage            4,4 %      15,0 %     32,0 %      20 %
vélo           25,0 %      41,9 %     61,2 %      50 %
course         13,1 %      44,7 %     64,7 %      30 %
```

**À la médiane du corpus, la course DÉPASSE la cible de 15 points et le vélo est 8 points
dessous ; 47 profils sur 206 seulement atteignent ≥ 45 % de vélo.** La raison est connue du
dépôt (le footing est le déversoir des petites enveloppes, la cible « ne tient qu'à partir de
~13 h » — réserve écrite à côté de la constante), et la décision `allocation` PUBLIE l'écart
(O-17, informer). Mon avis d'entraîneur : c'est le bon régime pour une enveloppe de 6 h — un
triathlète à 6 h/sem court plus que 30 % parce que le vélo utile coûte des blocs de 90 min
qu'il n'a pas — mais **la cible devrait être déclarée fonction de l'enveloppe** (une cible
unique 50/30/20 confrontée à un corpus dont la médiane de pic est 8 h produit un écart publié
sur presque tous les plans, ce qui érode la valeur du message).

**b) `R6.1b` en tri** : **CONFORME** — voir médecin ; j'ajoute la vérification d'entraîneur :
la substitution passe par les créneaux que la couverture des disciplines emploie déjà
(`facile2` → nage, cross-training → vélo), donc le vocabulaire reste celui du sport, pas une
séance inventée.

**c) Vocabulaire de séances tri (photo Phase 1, §3)** : **CONFORME dans l'ensemble** — dur1 à
dominante vélo (VO2/sweetspot), `durLong` qui bascule sortie longue → brick en spec/pic,
`facile2` = le créneau nage. **Deux réserves déjà tickétées que je confirme en tant
qu'entraîneur** : « Nage aérobie + accélérations » à **210 min max** (déversoir O-78 — aucun
entraîneur n'écrit 3 h 30 de nage aérobie à un groupe d'âge) et **O-102** : `facile2` étiqueté
`facile` alors qu'un jour sur trois y est dur (nage seuil) — la courbe de volume est alimentée
par une étiquette fausse. Les deux sont au registre ; je les hisse au rang de **PROBLÉMATIQUE**
côté entraînement, parce qu'ils faussent la lecture de la semaine.

**d) Semaines de pic à 55-60 % de facile** (11 semaines sur 3 823 : `G/tri/Full/off-2j` S29-33,
`G/tri/Full/dispo-partielle` idem, `INJ/tri/70.3/course` S16-18) : **CONFORME, à savoir lire.**
Le « dur » y est stable (64-66'), c'est le MODÉRÉ qui monte (176-213' d'allure spécifique) —
en phase de pic d'un Full, c'est exactement ce qu'on veut voir. La lettre des règles du moteur
est tenue (C26d : modéré ≤ 40 % — 36 % ici). Le physiologiste et moi sommes d'accord (§2.2).

---

### 1.4 Entraîneur course à pied / trail

**a) Vocabulaire course** : **CONFORME** — VO2/seuil progressif/seuil doux en dur1, allure
spécifique en dur2, longue à 99 %, part facile p10 77 %. La progression est tenue (0 saut dur).

**b) Le cas `run/10k`** : **À SURVEILLER, dette connue et bornée.** L'inversion d'allure O-21 a
été corrigée trois fois (pire inversion entre allures voisines +38,7 → +5,0 %) et le résidu est
publié comme du bruit de convergence, gardé par `O-21b` (banc v6). Rien de neuf au balayage :
les pics run vont de 2,2 h (5 km débutant) à 9,9 h — ordonnés par format et volume. Mon point
d'entraîneur rejoint **O-101** : un marathonien plafonné à **9,8 h** structurelles (7 jours ×
1 séance) est un VRAI manque — 10-14 h est courant en préparation marathon sérieuse — et
« rien ne le dit » est la moitié corrigeable immédiatement (O-17 : informer).
Verdict O-101 : **PROBLÉMATIQUE en performance**, voir débat §2.5.

**c) Trail et O-112** : **CONFORME** — 42 km aligné sur le marathon ; et le choix de borner par
la DISTANCE plutôt qu'un format est le bon pour ce sport. Je signale la suite logique, sans la
trancher : un trail de 41,9 km à D+ 2 500 m reste ouvert à 16 ans alors qu'il coûte plus qu'un
marathon — **si on veut aller au bout, la borne trail devrait être en km-EFFORT** (le moteur
possède déjà cette grandeur, `trailModel.ts:265`), pas en km. À l'état de proposition.

**d) NOUVEAU (balayage) — l'affûtage trail qui déborde** : `G/trail/-/measured-bas` S27 à
**0,78 du pic** (336'/429'). **À SURVEILLER** : un seul profil, mais la borne violée est la
seule borne SOURCÉE du moteur (Bosquet). Le profil est celui aux références mesurées BASSES —
pic 7,2 h — et les planchers de séance trail (marche bâtons, longue) ne descendent pas au
prorata : c'est le mécanisme « le profil le plus plafonné tombe dans toutes les coupes »
inversé — ici il ÉCHAPPE à la décroissance. Mérite un ticket.

**e) Gestion du dénivelé** : **CONFORME** — la charge à trois axes est gardée par T1/T2/T2b et
le banc v6 (17 tests trail), `T-DPLUS` à budget 0 au banc v7. Pas de nouvelle anomalie au
balayage (médiane pic trail 9,2 h, max 14,2 sur `vol-max`).

---

### 1.5 Entraîneur cyclisme

**a) Zones de puissance** : **CONFORME** — les %FTP sont recalibrés sur Coggan depuis R10,
`raceBikeBand()` est le point unique de « l'allure course » (R20.5), le relief entre dans la
cible d'intensité (R15.2), et la puissance est annoncée NORMALISÉE partout.

**b) Le repli FC quand la FTP est inconnue (fiche 35)** : **CONFORME, mesuré.**
`REF/bike/route/ftp` : structure identique au témoin à la minute près (le comportement voulu),
**45 séances vélo sur 69 portent une bande FC chiffrée en bpm** (« 11min @ 147-160 bpm »),
**zéro** affiche des watts. Les 24 restantes sont des récups/déverrouillages pilotés au
ressenti, ce qui est correct. ⚠ Mon premier comptage disait 11/69 — il cherchait le MOT « FC »
quand la consigne écrit « bpm » ; publié en §0. Une seule réserve : ces bandes bpm dérivent de
l'âge quand `hr_max` manque (220−âge est grossier, ±12 bpm d'écart-type) — la question
`hr_max` existe et les 4 profils HRMAX de la fiche 38 la photographient : **le repli du repli
est couvert.** Verdict global : conforme.

**c) O-99 vu du vélo** : la seule ligne du tableau O-99 où l'offre et le livrable se
rejoignent presque est le vélo (16,8 h livrables pour 40 offerts — l'écart reste ×2,4).
Même recommandation que le rôle course : **informer** (« au-delà de N h, le moteur ne pourra
pas placer ce volume »), pas brider — la réserve (2) du ticket est la bonne.

---

### 1.6 Entraîneur natation

**a) Le −52 % du débutant demi-fond sans CSS (fiche 35 §3c)** : **PROBLÉMATIQUE — c'est, avec
O-111, le défaut ouvert le plus grave du registre, et il s'est légèrement AGGRAVÉ.** Remesué au
moteur courant, à facteur unique (`css_known` seul varie) :

```
REF/swim/demifond (débutant, 10 h déclarées)
  css connu    pic 1,82 h · total 12,6 h · 47 séances
  css INCONNU  pic 0,77 h · total  5,5 h · 20 séances     —56 % de total, −57 % de séances
```

La population touchée est **exactement celle que le produit dit servir en premier** : le
débutant qui n'a jamais fait de test de 400/200. Partout ailleurs, « je ne connais pas ma
référence » donne +11 à +18 % (l'estimation prudente coûte plus de minutes) ; ici la cellule
s'effondre. **Recommandation de correction, précise** : mesurer d'abord OÙ la chaîne perd —
l'hypothèse la plus probable est le CSS estimé par défaut (très lent) croisé aux plafonds de
séance en MÈTRES du débutant (C15 : 850 m — voir b) : les mêmes mètres coûtent tant de minutes
que la sonde de capacité V2.1 conclut à une capacité minuscule et la boucle jette des séances.
Si c'est confirmé, le correctif est que **la fenêtre [600 ; 850] m se convertisse en TEMPS au
CSS estimé** comme le reste du moteur (règle 14 : la borne doit vivre dans l'unité de sa
conséquence), pas un gonflement du CSS par défaut. Le profil `REF/swim/demifond/css` est dans
le golden : le correctif sera visible au bit près.

**b) La fenêtre débutant [600 ; 850] m (Phase 1 §5.7)** : **À SURVEILLER, confirmée par le
corpus entier.** Sur **1 819 séances de nage** livrées aux débutants : p10 600 · médiane 700 ·
p90 850. Autrement dit, **l'essentiel de l'expérience de nage d'un débutant vit dans un
corridor de 250 m**. Comme entraîneur : 600-850 m par séance pour un vrai débutant est
DÉFENDABLE en début de cycle (30-40 min d'eau à son allure), mais un plan de 30 semaines qui ne
sort JAMAIS de ce corridor n'apprend pas la continuité — et c'est cohérent avec ce que le
chantier B-17 a déjà trouvé (les paliers annoncés 800/1350/2250 livrés à 500, §5 de l'entrée
ENTREE_PLAN_DEBUTANT). Ce n'est pas un ticket nouveau : c'est la confirmation chiffrée que la
fenêtre est le VRAI plafond du nageur débutant, et qu'elle devrait s'OUVRIR avec la position
dans le plan (le patron O-56/`swimSessionCapAtWeek` existe déjà pour ça).

**c) Balayage swim généraliste** : **CONFORME** — pics 0,7-4,0 h (le plafond ~4 h est la borne
de créneaux connue), facile p10 92 %, 4 sauts doux 15-25 % (aucun dur), affûtage ≤ 0,55.

---

### 1.7 Spécialiste duathlon / swimrun

**La question posée : faut-il une `ALLOC_CIBLE` pour ces deux sports ?** **Non pour le
swimrun, oui-mais pour le duathlon — et dans les deux cas ce n'est pas la priorité.**

- **Duathlon** : livré (153 profils, legs ventilés) : vélo min 48 · **méd 56** · max 75 %,
  course 25-**44**-52 %. Un PM (10/60/10) se court ~55 % vélo / 45 % course en temps : **la
  médiane livrée est DÉJÀ sur la cible qu'on écrirait.** Une cible expliciterait l'intention
  (et éviterait qu'un futur mécanisme la dérive en silence — l'argument fort), mais elle ne
  corrigerait rien aujourd'hui. Verdict : **CONFORME**, cible souhaitable comme GARDE
  (déclarer l'intention), pas comme correctif.
- **Swimrun** : livré : course 36-**61**-71 %, nage 29-**39**-64 %. Ici une cible STATIQUE
  serait une erreur : la part de course d'une épreuve va de 45 à 94 % selon la course déclarée,
  et le moteur possède déjà mieux qu'une constante — `swimrunObjective(a)` calcule la part de
  l'ÉPREUVE, et le banc v7 la confronte au plan (`S-MIX`, **budget 0 depuis R20.3**). La cible
  existe donc, elle est PAR PROFIL, et elle est gardée. Verdict : **CONFORME** ; écrire une
  `ALLOC_CIBLE.swimrun` constante serait un recul.
- Ce qui MANQUE réellement à ces deux sports, vu du balayage : le duathlon porte les récups
  extrêmes du tri en écho (min 0,17) et la plus grosse séance du corpus
  (`G/duathlon/PM/vol-max` : **443 min** — 7 h 23 de brick pour un PM dont l'épreuve dure
  ~4 h). **7 h 23 d'entraînement continu pour un powerman est au-delà de ce qu'un entraîneur
  écrit** (la sortie dépasse la durée de course de 80 %) : à borner par le temps de course de
  l'épreuve, comme le trail le fait déjà (T4/T5 : « reproduire la durée de course à
  l'entraînement est contre-productif »). **À SURVEILLER, ticket recommandé.**

---

### 1.8 Nutritionniste du sport

**a) La clé `activity` sans lecteur (Phase 1 §5.1)** : **PROBLÉMATIQUE au sens du contrat,
simple à trancher.** Vérifié au commit courant : `answerSchema.ts:183` la déclare, **zéro
lecteur** dans `src/` hors schéma et une fixture de démo ; l'estimateur applique une bande NAP
constante **1,35-1,55** (`energyEstimator.ts:151`) à tout le monde. Ce que la clé DEVRAIT
faire si elle doit exister : piloter cette bande — les référentiels FAO/WHO qu'`energyEstimator`
cite déjà donnent précisément les paliers (sédentaire 1,40-1,69 · actif 1,70-1,99 ·
vigoureux 2,00-2,40 ; la bande actuelle 1,35-1,55 correspond à « assis à modérément actif »).
Deux issues propres, au choix du fondateur : **(1)** brancher `activity` sur trois bandes
FAO/WHO — c'est UNE table, la source est déjà dans le fichier, et la carte 🔥 gagne en
précision réelle ; **(2)** retirer la question (une question sans effet est interdite par les
règles du dépôt — « toute question doit avoir un effet »). Mon avis de nutritionniste : (1),
parce que la dépense hors entraînement varie du simple au double entre un livreur à vélo et un
développeur, et qu'une bande unique est le plus gros terme d'erreur restant de la carte.
**Attention à l'interaction N9/N11** : la bande FAO couvre les 24 h, l'entraînement est ajouté
net (N11) — si `activity` monte la bande, vérifier qu'on ne recompte pas l'entraînement qu'un
« actif » a déjà inclus dans sa perception de lui-même ; le libellé de la question doit dire
« HORS entraînement ».

**b) Le reste du module** : **CONFORME** — N11 (recouvrement publié), O-16 (borne d'âge,
ravitaillement maintenu), bornes N1-N7 sourcées et gardées par `demo:nutrition`. La frontière
« jamais de cible d'apport » est respectée ; le point en attente (macros N10 = cible de facto)
est correctement bloqué sur avis diététicien humain (H-3) — un conseil simulé ne le remplace
pas, et je ne le tranche pas ici.

---

## 2. Le contradictoire — les débats, avec résolution

### 2.1 Le facteur d'âge (médecin vs physiologiste)

- **Médecin** : les paliers ×0,85²/×0,70² sont la construction la plus prudente SANS source,
  mais l'absence de source sur des populations vulnérables est en soi le défaut ; et le plafond
  de dur non modulé par l'âge est un trou concret (65' pondérées à 16 ans).
- **Physiologiste, objection** : une source unique n'existe pas — la littérature master
  documente surtout la baisse de VO2max (~10 %/décennie) et l'allongement de la récupération,
  pas un facteur de volume ; inventer une citation d'habillage serait pire que l'aveu actuel.
  Et le corpus montre que les masters récupèrent plus souvent (gap ≤ 4) — le levier récup est
  déjà le bon.
- **Médecin, réponse** : d'accord sur le refus d'habillage ; mais le dur du mineur n'est pas
  une affaire de littérature fine — « un adolescent ne fait pas les séances de seuil d'un
  adulte confirmé » est un consensus d'encadrement fédéral. Ce n'est pas un facteur à sourcer,
  c'est une borne à poser.
- **RÉSOLUTION — ACCORD** : (1) garder les paliers de volume tels quels, avec leur
  avertissement ; (2) **ajouter la modulation d'âge au plafond de temps dur** (mineur : au
  moins ×0,7, comme le volume) — brief de correction dédié ; (3) documenter dans le code que
  la référence externe n'existe pas ENCORE et ce qu'on chercherait (une revue master/jeunes).

### 2.2 Les 55-60 % de facile au pic (physiologiste vs entraîneur tri)

- **Physiologiste** : 11 semaines sous le plancher de 60 % de facile, toutes au pic — le
  80/20 n'est pas tenu là.
- **Entraîneur tri, objection** : regardez la composition — le DUR est constant (64-66',
  sous C26), c'est l'allure SPÉCIFIQUE (modérée) qui monte, et c'est le but d'une phase de
  pic : la spécificité remplace du facile, pas du dur. Le 80/20 de Seiler se compte
  d'ailleurs par SÉANCES, pas par minutes — à la séance, ces semaines restent polarisées.
- **RÉSOLUTION — ACCORD (verdict CONFORME)**, avec une trace : la règle du moteur qui rend ça
  légitime est le choix « le plafond est un TEMPS de dur, la part de facile en découle »
  (C26) — c'est précisément le cas où ce choix, déjà arbitré, montre sa valeur. Rien à
  corriger ; à citer si un futur audit relit « facile < 60 % » comme un défaut.

### 2.3 Le plancher de décharge (physiologiste vs entraîneur tri, médecin en appui)

- **Physiologiste** : une récup à 12-25 % des voisines (30 profils tri) est une interruption,
  pas une décharge — perte d'adaptations, à-coup à la reprise.
- **Entraîneur tri, objection** : sur ces profils la semaine de charge fait 4 h (242') — la
  récup à 60' est UNE séance. À petit volume, la décharge « naturelle » est structurellement
  grossière : on ne coupe pas 38 % de 4 h sans tomber sur les planchers de séance. Le vrai
  choix à petit volume est décharger par le CONTENU (tout facile, même volume), pas par le
  volume.
- **Médecin** : peu importe la forme — ce qui compte est qu'une semaine à 30' suivie d'une
  semaine à 250' est un ratio de reprise de ×8, exactement ce que C22 existe pour interdire,
  et il ne le voit pas parce qu'il saute les récups.
- **RÉSOLUTION — DÉSACCORD PARTIEL, MESURE REQUISE** : accord sur le fait qu'un plancher nu
  (≥ 0,40) déplacerait le problème sur les planchers de séance (la famille « borner un puits
  déplace le défaut »). La mesure d'entrée du brief de correction : sur les 30 profils, la
  décharge par le contenu (semaine à volume ≥ 0,5 × voisines, 100 % facile) est-elle
  constructible dans leurs créneaux ? Si oui, c'est le correctif ; sinon, les deux positions
  sont rapportées au fondateur.

### 2.4 `ALLOC_CIBLE` unique vs fonction de l'enveloppe (entraîneur tri vs physiologiste)

- **Entraîneur tri** : une cible 50/30/20 confrontée à un corpus à médiane 42/45/15 publie un
  écart sur presque tous les plans — la cible devrait dépendre de l'enveloppe.
- **Physiologiste, objection** : une cible qui suit le livré cesse d'être une cible (règle 12
  du dépôt — une sortie calculée ne se relit pas comme une entrée). La valeur de 50/30/20 est
  justement de MONTRER qu'à 6-8 h on n'y est pas.
- **RÉSOLUTION — DÉSACCORD ASSUMÉ, les deux positions au fondateur** : soit une cible par
  palier d'enveloppe DÉCLARÉE À L'AVANCE (pas dérivée du livré — compatible règle 12), soit la
  cible unique assumée comme aspiration avec son écart publié. Les deux sont défendables ; le
  choix est produit, pas technique.

### 2.5 O-101 / O-99 — le plafond du marathonien (entraîneur course vs médecin)

- **Entraîneur course** : 9,8 h de plafond structurel pour un marathon est un manque de
  PERFORMANCE réel ; il faut ouvrir le doublage (ou des séances plus longues) en course à pied.
- **Médecin, objection** : le doublage en course à pied est le levier le plus blessogène qui
  soit (impact ×2 le même jour) ; le moteur qui ne le propose PAS à un coureur est peut-être
  du bon côté. Et O-100b montre que le mécanisme de doublage actuel a déjà un défaut de
  densité non résolu — l'étendre avant de le réparer serait construire sur le défaut.
- **Entraîneur course, réponse** : accord pour ne pas étendre MAINTENANT ; mais alors la
  moitié « le dire » devient obligatoire — un marathonien qui déclare 14 h doit lire « le
  moteur n'ira pas au-delà de ~9,8 h, et pourquoi ».
- **RÉSOLUTION — ACCORD** : court terme, INFORMER (la forme O-17, réserve (2) d'O-99) ; le
  doublage course reste fermé tant qu'O-100b n'est pas réparé. C'est aussi l'ordre que le
  registre propose déjà.

---

## 3. Synthèse transversale

**Convergences (signal fort)** :

1. **O-111 en tête de file** (médecin seul à le porter, mais à verdict maximal et correctif
   d'une ligne, déjà spécifié au registre) — la consigne de retenue d'une course B est
   remplacée par une phrase de calendrier.
2. **Le nageur débutant est la population la plus mal servie du moteur**, par convergence de
   trois faits indépendants : le −56 % sans CSS (fiche 35, remesuré), la fenêtre [600 ; 850] m
   confirmée sur 1 819 séances, et l'histoire du chantier B-17 (paliers livrés à 500 m). Trois
   symptômes, probablement une cause commune : les bornes de nage débutant vivent en MÈTRES
   dans un moteur qui raisonne en temps (règle 14).
3. **La décharge n'a pas de plancher** (physiologiste + médecin) — 30 profils tri sous 0,25,
   min 0,12.
4. **L'âge ne module que le volume, jamais le dur** (médecin + physiologiste, accord après
   débat).
5. **Informer sur les plafonds structurels** (O-99/O-101, trois rôles) : la moitié « le dire »
   est consensuelle, la moitié « l'ouvrir » ne l'est pas.

**Désaccords assumés** : la forme d'`ALLOC_CIBLE` (§2.4) ; le plancher de décharge nu vs
décharge par le contenu (§2.3, mesure requise).

**Ce que le balayage exhaustif a trouvé de NEUF** (aucun de ces cinq points n'était en
Phase 1) : les récups à 0,12-0,25 (tri, 30 profils) · l'affûtage trail à 0,78
(`G/trail/-/measured-bas`) · l'absence de modulation d'âge sur le plafond de dur (65' pondérées
à 16 ans) · la séance de 443 min du duathlon `vol-max` (×1,8 la durée de l'épreuve) · la
quantification corpus entier de l'écart à `ALLOC_CIBLE` (médiane 42/45/15 pour 50/30/20).

---

## 4. Recommandations priorisées — chacune prête à devenir une fiche

**Sécurité d'abord :**

1. **O-111** — `renderSess` ne réécrit jamais le `det` d'une séance `race` ; repasser
   `R23.18-A` à `pass` dans le même commit. (Correctif déjà spécifié au registre.)
2. **Plafond de temps dur modulé par l'âge** — mineur ×0,7 minimum (aligné sur le facteur de
   volume), mesure avant/après sur les 7 profils mineurs + `AGE/*`. (§2.1.)
3. **Plancher de décharge** — mesure d'entrée d'abord (§2.3) : sur les 30 profils tri sous
   0,25, la décharge par le CONTENU est-elle constructible ? Puis correctif selon le résultat.

**Précision ensuite :**

4. **Le nageur débutant sans CSS (−56 %)** — localiser le maillon qui s'effondre (hypothèse :
   bornes en mètres × CSS par défaut), corriger dans l'unité de la conséquence (règle 14).
   `REF/swim/demifond/css` photographié : le correctif sera visible au bit près.
5. **`activity` branchée sur les paliers NAP FAO/WHO** (ou retirée — décision fondateur) ;
   libellé « hors entraînement » ; vérifier l'interaction N9/N11. (§1.8.)
6. **Informer sur le plafond structurel** — O-99 réserve (2) + O-101 : une ligne dans la carte
   R20.2 quand `vol_max` déclaré dépasse le plafond livrable du sport.
7. **O-102** — l'étiquette de charge de `facile2` suit le contenu (ou le contenu suit
   l'étiquette) : trancher, puis O-100b derrière (le registre lie déjà les deux).
8. **Affûtage trail > 0,55** — ticket sur `G/trail/-/measured-bas` (planchers de séance trail
   vs petit pic).

**Performance enfin :**

9. **Longue duathlon bornée par la durée d'épreuve** (443 min sur un PM) — reprendre le patron
   trail T4/T5.
10. **`ALLOC_CIBLE`** — trancher §2.4 (par palier d'enveloppe déclaré, ou unique assumée) ;
    dans les deux cas la fenêtre débutant nage s'ouvre avec la position (patron O-56).
11. **O-100b puis, seulement ensuite, la question du doublage course** (§2.5).

---

## 5. Jugement des tickets ouverts, un par un

| ticket | verdict du conseil | rôle porteur |
|---|---|---|
| **O-111** | **PROBLÉMATIQUE — priorité 1** : seule consigne de sécurité de course effacée par un re-rendu ; correctif d'un point, spécifié | médecin |
| **fiche 35 §3c (−52 → −56 %)** | **PROBLÉMATIQUE — priorité précision 1** ; aggravé à la remesure, population cible du produit | natation |
| **O-102** | **PROBLÉMATIQUE** : une étiquette qui alimente la courbe de volume et ment un jour sur trois ; à trancher avant O-100b | tri |
| **O-100b** | **PROBLÉMATIQUE, mais après O-102** : le choix « densité préservée ou cycle plus facile assumé » dépend de l'étiquetage | physiologiste |
| **O-101** | **PROBLÉMATIQUE en performance, réglé en deux temps** : informer maintenant, doublage course seulement après O-100b (accord médecin/entraîneur) | course |
| **O-99** | **À SURVEILLER — arbitrage** : informer, ne pas brider (réserve (2) du ticket validée par trois rôles) | vélo/course |
| **O-100a** | **CONFORME une fois DIT** : le modèle est correct, la carte doit l'énoncer | physiologiste |
| **O-97** | **À SURVEILLER** : honnêteté du prescrit, pas sécurité (le livré est borné et affiché depuis O-87) ; mesurer sur les 986 avant de poser | médecin |
| **O-105** | **À SURVEILLER — hygiène R11.1** : le garde S5 doit lire l'argmin publié ; à faire dans un lot calme, pas dans un lot qui le fait bouger | physiologiste |
| **O-77** | **À SURVEILLER** : inversion réelle (82 → 62 min de longue quand vol_max monte de 4 h), piste écrite au registre, à mesurer avant correctif ; s'articule avec la reco 10 | course |

---

## 6. Ce que ce document ne tranche PAS

Les macros N10 (bloquées sur avis diététicien humain — H-3, un conseil simulé ne s'y
substitue pas) ; la forme finale d'`ALLOC_CIBLE` (§2.4, décision produit) ; le plancher de
décharge (mesure d'entrée requise, §2.3) ; et la validité externe des paliers d'âge — le
conseil a validé la MÉTHODE (répéter le pas arbitré plutôt qu'inventer), pas les VALEURS, qui
restent révocables comme le code le dit.
