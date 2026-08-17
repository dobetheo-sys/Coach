# Arbitrages du lot `fix/moteur-physio`

Les décisions prises en cours de lot, avec **la mesure qui les a motivées**. Un chiffre sans sa
raison redevient un littéral non sourcé au premier relecteur — c'est précisément le défaut que ce
lot corrige, on ne le reproduit pas dans ses propres décisions.

Chaque entrée porte : ce que le handoff proposait · ce que la mesure a montré · ce qui est retenu.

---

## B-01 — Plafond de la sortie longue · **indexé sur le volume**

**Handoff** : `≤ 70 % du volume de la semaine pic` → `≤ 35 %` du volume hebdomadaire de la
discipline, dérogation ultra à 45 %, « si le plancher C30 devient inatteignable, ne pas relever le
plafond — remonter le volume ou allonger la préparation ».

**Ce que la mesure a montré** (30 profils de référence + calcul de `longRunSpecificityFloor`) :

- **23 profils sur 30 sont au-dessus de 35 %**, et **15 au-dessus même de la dérogation ultra à
  45 %**. Le rayon d'action est celui d'une refonte, pas d'un correctif ciblé.
- **B-01 entre en collision frontale avec C30**, votre décision du 04/08 (plancher de spécificité
  de la sortie longue). Mesuré sur les 6 profils course : **4 conflits**.

| profil | pic | longue actuelle | plafond B-01 | plancher C30 | conflit |
|---|---|---|---|---|---|
| P01 run 10k confirmé 2 h | 1,6 h | 58 min (63,8 %) | 34 min | 42 min | +8 |
| P02 run 10k débutant 2 h 30 | 1,5 h | 51 min (62,5 %) | 31 min | 59 min | +28 |
| **P03 run marathon reprise** | 4,5 h | **180 min (67,2 %)** | **95 min** | **180 min** | **+85** |
| P05 run semi genou | 3,6 h | 104 min (51,5 %) | 76 min | 105 min | +29 |

- **L'échappatoire du handoff est inutilisable sur le profil qui en aurait le plus besoin.**
  Pour que C30 tienne sous 35 % sur P03, il faudrait passer de 4,5 h à **8,6 h/semaine** — chez un
  marathonien *en reprise*. C'est la priorité n°2 du manifeste (prévention des blessures) et toute
  la raison d'être de la rampe R10 qui l'interdisent. Sur P03, C30 est d'ailleurs déjà saturé au
  plafond de sécurité C23 (180 min débutant) : les deux règles sont au contact.

**Retenu** : **plafond indexé sur le volume** — `50 %` sous 5 h/semaine, `35 %` au-dessus,
`45 %` pour les catégories trail `ultra` / `ultra_long`.

**Motif** : à bas volume, la sortie longue domine *légitimement* la semaine — on ne construit pas
un marathon dans une semaine de 4,5 h autrement, et le plafond plat punissait exactement la
population que C30 protège. Au-dessus de 5 h, la domination n'a plus d'excuse structurelle et
l'objectif du ticket tient. Le back-to-back reste préféré au dépassement partout où il est
disponible, comme le handoff le demande.

**Ce qui reste à vérifier à l'implémentation** : le plafond ne doit jamais passer devant le
plancher C30 (`max(plafond, plancherC30)`), sinon on réintroduit le conflit par une autre porte.

---

## B-02 — Plafond de temps dur · **12 %, bornes 25-60, disciplines d'impact seulement**

**Handoff** : `60 min fixes` → `clamp(0,10 × minutes_hebdo, 20, 60)`, « à 2 h 30/semaine le
plafond passe de 60 à 20 min (40 % → 13 % d'intensité) ».

**Ce que la mesure a montré** :

1. **Le plafond actuel est dormant.** Sur les 945 profils du golden, il ne mord que sur **6
   profils (0,6 %)**. Sur les 30 profils de référence : **aucun** (63 min observés au maximum pour
   66 tolérés). La règle ne protège aujourd'hui presque personne.
2. **Le ticket vise la mauvaise population.** À 2 h comme à 2 h 30, le générateur produit déjà
   **9 min de temps dur** — très loin des deux plafonds, l'ancien comme le nouveau. Le correctif
   serait **inerte sur les profils que le ticket nomme**. Les profils réellement contraints sont à
   **volume moyen et forte intensité** (semi genou 34 min, 5 km avancé 34, CLM 52, eau libre 48,
   tri M 61, duathlon M 63).
3. **Les chiffres du handoff omettent la tolérance C26c.** 60/150 = 40 % est le plafond *déclaré* ;
   66/150 = **44 %** est le plafond *appliqué*. Sur une règle dont tout l'objet est de borner le
   dur, c'est la valeur appliquée qui compte.
4. **Le calibrage proposé toucherait 45 % du catalogue, dont 64 % de la population nage.**

| calibrage | profils touchés | coupe moyenne | pire | nage/swimrun |
|---|---|---|---|---|
| 10 %, 20-60, tous sports *(handoff)* | 427 (45 %) | 12,6 min | 34 min | 165/258 |
| 12 %, 25-60, tous sports | 340 (36 %) | 8,5 min | 28 min | 154/258 |
| 15 %, 25-60, tous sports | 194 (21 %) | 7,2 min | 19 min | 95/258 |
| 10 %, 20-60, impact seulement | 132 (14 %) | 13,1 min | 34 min | 0/258 |
| **12 %, 25-60, impact seulement** ✅ | **86 (9 %)** | **11,5 min** | **28 min** | **0/258** |

**Retenu** : `clamp(0,12 × minutes_hebdo, 25, 60)`, appliqué aux **disciplines d'impact**
(`run`, `trail`, `duathlon`). Les modulations existantes (historique / débutant / blessure)
s'appliquent ensuite multiplicativement, inchangées.

**Motif** : la concentration sur la nage était un **artefact de classification**, pas une intention
physiologique. `sw.css` figure dans `HARD_SUFFIX`, donc une série au CSS compte intégralement comme
temps dur — ce qui est défendable en soi (c'est du seuil), mais 48 min de seuil en bassin ne coûtent
pas ce que coûtent 48 min de seuil en course. Un plafond discipline-aveugle traitait les deux à
l'identique. Le ticket est motivé par la contrainte mécanique ; il s'applique donc là où elle existe.

**Conséquence de conception, à assumer explicitement** : cela introduit dans C26 une notion de
**discipline d'impact** que la règle n'avait pas. Elle doit être déclarée par `rule()` avec son
`why`, et non écrite en dur dans une condition — sinon on crée exactement le littéral non documenté
que ce lot passe son temps à débusquer. Elle recoupe `runImpactCap` (déjà déclaré par `run`, `trail`
et `duathlon`) : **la lire depuis les guards existants plutôt que d'écrire une seconde liste de
sports** est la seule écriture acceptable (R11.1).

---

## Décisions de conduite du lot (13/08)

| Sujet | Retenu |
|---|---|
| Branche | `fix/moteur-physio`, créée depuis la branche design (autorisation explicite) |
| Golden master | **Figé** pendant tout le lot ; chaque ticket B produit son `diffs/B-XX.md` ; une seule recapture en fin de lot |
| B-16 (T3) | **Réduit** à la mesure du cas de bord de semaine — la règle est appliquée (V-01) |
| `capacityProbe` | **Retirer** le flag (V-02 : mort, et le câbler désactiverait la sonde pour 5 sports) |

---

# Arbitrages de l'addendum 01 (13/08/2026)

Quatre décisions prises après les vérifications V-07 → V-11, chacune sur une mesure et non sur
l'intention du ticket. **Trois des quatre tickets ont vu leur prémisse réfutée par la mesure** ;
c'est ce que les décisions ci-dessous prennent en compte.

## B-21 — Exposant de Riegel en tri/duathlon · **découpler ET recalibrer** (branche B)

**Mesuré** : les 294 profils tri/duathlon du golden courent **2,03 h/semaine** (médiane ;
étendue 0,58 → 4,72), ce qui appelle l'exposant **1,12**. Le moteur applique **1,06**, celui d'un
coureur à 10 h/semaine — **zéro profil sur 294** n'en approche.

**V-07 a établi que `TRI_RUN` est `a_priori`**, donc la branche A (découpler sans toucher la
table) était applicable sans risque de double compte. **Décision du fondateur : branche B.**

Le motif retenu est la prudence sur l'existant : la recalibration par construction
`TRI_RUN_new[f] = TRI_RUN_old[f] × Riegel(ref, d_f, 1,06) / Riegel(ref, d_f, expo(h_ref))`
garantit que le **triathlète médian conserve exactement son chrono actuel**, et fait enfin diverger
les atypiques — celui qui court 4,7 h devient plus rapide, celui qui court 0,6 h plus lent. Aucune
des deux tables n'étant validée par une donnée, on ne perd aucune validité en ajustant l'une contre
l'autre ; on gagne une différenciation que le modèle actuel est incapable de produire.

`h_ref` = **2,03 h/semaine** (médiane mesurée, V-09).

⚠ **La branche A aurait été inerte telle qu'écrite** : `bridge.ts:665` passe `undefined` hors
course sèche, et `riegelExponent(undefined)` rend 1,06 par repli. Aucune réponse du questionnaire
ne donne les heures de course d'un triathlète — **la grandeur doit être mesurée sur le plan livré**.
C'est un ticket de plomberie distinct, préalable au recalibrage.

## B-22 — Allure marathon · **point unique, la bande DÉRIVE du prédicteur**

**Mesuré** : `rn.mara` est un multiplicateur **constant** (1,08–1,13 × seuil) ; l'exposant de
Riegel **varie avec le volume** (1,04 → 1,12). Deux grandeurs dont l'une ignore une variable dont
l'autre dépend ne coïncident qu'en un point — mesuré vers **6,5–8 h/semaine**. En dessous, la
prédiction est plus lente que l'entraînement ; au-dessus, plus rapide (12 h/sem : entraîné à
4'35–4'48, course prédite à 4'26).

**Décision : une seule écriture de « l'allure marathon »**, la bande d'entraînement dérivant du
prédicteur. C'est R11.1, et c'est le geste que le dépôt a déjà fait deux fois sur exactement cette
forme — **O-11 / R20.5** (deux définitions de « l'allure course » à vélo, fermées par
`raceBikeBand()`). Reculer `rn.mara` d'un cran n'aurait fait que déplacer le point d'accord.

**Rayon d'action à mesurer avant d'écrire** : les séances d'allure spécifique du marathon, et le
trail (qui lit `rn.mara` lui aussi). `rn.thr` — prescrit aux 5 km / 10 km / semi — **n'est pas
concerné** : c'est une séance au seuil, pas une prescription d'allure de course.

## B-02 — Plafond de temps dur · **arbitrage du 13/08 confirmé**

`clamp(0,12 × minutes_hebdo, 25, 60)`, **disciplines d'impact** (`run`, `trail`, `duathlon`),
lues depuis les guards existants (`runImpactCap`) et jamais depuis une seconde liste de sports.

**Confirmé après V-08 et V-09**, qui ont retiré au ticket sa justification de repli :
la concentration nage **n'était pas** un artefact de classification (`sw.css` est correctement
classé `hard`, comme `bk.thr` et `rn.thr`) mais le reflet de la distribution réelle — la natation
**est** la queue basse du catalogue (médiane 1,9 h/sem, 129 des 186 profils sous 3 h). Tout
plafond proportionnel au volume la visera, quel que soit son calibrage.

**Conséquence sur les critères de recevabilité de l'addendum** : le critère 2 (« ≥ 70 % des
profils touchés sous 5 h/semaine ») est satisfait **par construction** dès qu'un plafond est
proportionnel, et ne discrimine donc pas. Seul le critère 3 (« zéro profil touché uniquement à
cause de la nage ») mord — et l'option retenue est la seule mesurée à le satisfaire (0/258).

La variante « pondérer les minutes dures par discipline (×1,00 / 0,75 / 0,50) » est **écartée pour
ce lot**, pas réfutée : elle garde C26 discipline-aveugle avec un chiffre unique, ce qui a de la
valeur, mais c'est un changement plus profond que le calibrage d'un scalaire. À rouvrir si la
notion de discipline d'impact s'avère mal porter ailleurs dans la matrice.

## B-02a — `sw.aero` · **aligner, et arbitrer C26d dans le même ticket**

**La prémisse du ticket est inversée** : `sw.css` n'est pas mal classé. La divergence est sur la
ligne **tempo** — `sw.aero` est rangé `easy` quand `rn.mara` et `bk.ss` sont `mod`, pour un effort
à **94,3 % de la vitesse seuil**, soit au moins aussi exigeant que `bk.ss` (88–94 % FTP).

**Portée mesurée avant décision** : 382 profils du golden portent des minutes `sw.aero` (40,4 % —
swim 136, swimrun 136, tri 110), et **106 (11,2 %)** verraient une semaine de charge franchir le
plafond de modéré **C26d** (40 %) après réalignement.

**Décision : aligner, et traiter les 106 franchissements dans le même ticket** plutôt que de les
laisser à la boucle de réparation, qui déclasserait des séances de nage — un effet que le ticket
ne vise pas. Deux issues à mesurer : relever C26d pour la nage (avec sa justification :
une minute de modéré en bassin ne coûte pas ce que coûte une minute de modéré en course, c'est
l'argument même qui a fondé B-02), ou accepter le déclassement en le chiffrant.

Rapport de diff obligatoire sur les 945.
