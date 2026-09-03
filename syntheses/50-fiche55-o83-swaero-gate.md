# Fiche 55 — O-83 (informer + progression bornée de C15), sw.aero (reclasser + table C26d par
discipline), et la réparation du gate de monotonie

**Contexte.** Fiche 54 avait diagnostiqué sans corriger : le trou O-83 (92→78 profils de nage
débutant livrant 2 à 5 séances de 15 min pour un volume déclaré bien plus haut) et l'arbitrage
rouvert V-08/B-02a (`sw.aero`, refusé le 14/08/2026, mesuré comme sous-estimant physiologiquement
son coût). Le fondateur a tranché sur les deux, et cette fiche livre le tout : quatre tâches,
chacune mesurée avant/après, autonomie accordée.

## Tâche 0 — le gate de monotonie ne saute plus un axe en silence

`css` et `pace` sont des VALEURS libres (gate par `pace_known`/`css_known`), pas des entrées
d'`ANSWER_SCHEMA` — la boucle de `scripts/monotonie.mjs` faisait `const spec =
ANSWER_SCHEMA[axe.cle]; if (!spec) continue;`, donc ces deux axes étaient sautés SANS AVERTISSEMENT
depuis la création du gate (fiche 47). Personne ne l'avait vu parce qu'un axe sauté ne produit ni
vert ni rouge : rien à lire.

**Corrigé** : une passe préalable lève bruyamment (`process.exitCode = 1`) si un axe déclaré n'a
ni entrée `ANSWER_SCHEMA` ni résolution `AXE_SPORTS` explicite. `css`, `pace` (résolus via une table
`AXE_SPORTS` dédiée, hors schéma) et un croisement `level: debutant` sont ajoutés au balayage.

**Vérifié** : le gate détecte-t-il déjà les inversions de fiche 54 (discontinuité CSS≈2:06,
inversion vol_max 5h/25h) ? **Non**, et c'est attendu tant que les tâches 1-2 ne sont pas
livrées : le CORPUS RÉEL déclare tous ses CSS de nage ≤ 2:00, sous le seuil d'activation ~2:06
que `swimCapDebutantM` (D5, fiche 44 T1) protège — le gate ne peut littéralement pas voir une
discontinuité que la population ne traverse jamais. Dettes déclarées dans `DETTES` avec leur
ticket (O-83), plutôt que masquées ou ignorées.

## Tâche 1 — O-83, informer (option 3)

Message explicite dans « Pourquoi ce plan » quand une semaine de charge nage tombe sous
`O83_SEANCE_COHERENCE_MIN` (25 min/séance, `constraintMatrix.ts`) OU `O83_SEMAINE_COHERENCE_MIN`
(60 min/semaine) — les deux constantes que le comptage ET le message partagent (R11.1) : *« Ton
plan de nage est borné à ~X min par séance : ta technique passe avant le volume »*, avec la cause
nommée (le plafond C15). Jamais un refus dur — même forme que O-99/O-101 (fiche 44 T7), conforme
à O-17 (informer plutôt que bloquer).

**Mesure** : le message s'affiche sur **78 des profils du golden** correspondant au constat
original (92 profils, corpus d'alors — même population qualitative, natation débutant).

## Tâche 2 — O-83, C15 progresse avec la position (option 2, famille O-56)

**Décision explicite sur ce qui pilote la progression**, demandée par le brief et motivée contre
la leçon O-89 (« une borne de sécurité ne projette pas ») : la POSITION dans le plan, mais
seulement en REPLI. `swimSessionCapAtWeek` (déjà écrite en fiche 48/O-89, lit une continuité
MESURÉE — `longest_swim_m`/`longest_swim_known`) reste PRIORITAIRE quand elle est disponible ;
`swimSessionCapCoherenceAtWeek` (nouvelle fonction, `planGenerator.ts`) ne s'active que quand
aucune continuité mesurée n'existe, et fait croître le plafond de séance **au taux C22** — le même
taux de rampe qu'utilise déjà toute trajectoire de plafond du moteur (fiche 48's
`capScaleAtWeek`), jamais un chiffre neuf ni une projection libre. C'est la réponse à la question
posée : la position sert de repli borné par une mesure déjà auditée (C22), pas de source
indépendante d'autorité sur une borne de sécurité.

**Deux régressions trouvées EN ÉCRIVANT, corrigées avant livraison** (méthode : mesurer, casser,
corriger, re-mesurer — jamais livrer sans repasser les gates) :

1. **`audit:v1` cassé** — appliquer la nouvelle fonction à TOUS les sports (pas seulement la
   natation) faisait disparaître une « Footing facile » de `tri/S/ancien/debutant/competition`
   (le budget de créneaux réagissait au nouveau plafond de nage, gonflant la part modérée
   pooled au-delà de C26d). Corrigé en scopant à `a.sport === "swim"` seul.
2. **`D5` (banc v6) cassé, plus grave** — ma première écriture RETIRAIT le garde
   `tempsBaseMin < SWIM_SESSION_FLOOR_MIN → return baseM` hérité de `swimCapDebutantM`. C'est
   EXACTEMENT la protection contre les **86 débutants rapides** de la fiche 44 T1 (une croissance
   instantanée 850 → 1325 m pour un nageur à CSS < 2:06) : sans le garde, un nageur rapide
   recevait une croissance GRADUELLE vers le même dépassement — « le même contournement, étalé
   dans le temps ». Le garde est restauré verbatim, `D5`/`D6` revérifiés verts, et une contre-preuve
   directe (CSS 1:35, 30 semaines) confirme le plafond reste plat à 850 m sur tout le plan.

**Mesure honnête, publiée sans arrondir dans le bon sens** : sur le corpus RÉEL, la population de
78 profils déclare toute des CSS ≤ 2:00 — sous le seuil d'activation D5 protégé ci-dessus. **Le
mécanisme ferme 0 des 78 profils aujourd'hui.** Il est réel, testé, contre-prouvé, et attend une
population qui franchit le seuil (le rayon golden le confirme : 1 profil touché, une fixture
`REF/swim/…/css` dédiée à la frontière). La tâche 1 (informer) reste donc ce qui sert réellement
les 78 profils sur le corpus d'aujourd'hui.

## Tâche 3 — sw.aero, reclasser + table C26d par discipline (option 4)

**Reclassement** (`src/engine/loadModel.ts`, `zoneClass`) : `sw.aero` classe désormais **modéré**.
La mesure du 14/08/2026 (P ∝ v³ en natation, sw.aero coûte 83,96 % de l'effort au seuil) reste
juste — mais elle avait alors servi à GARDER sw.aero en facile (83,96 % < 86,21 %, le plafond de
`rn.easy`) ; le fondateur tranche dans l'autre sens : 83,96 % est de l'ordre de `bk.ss` (88-94 %)
et `rn.mara` (88-93 %), jamais un simple facile.

**Le coût mesuré le 14/08 (411 semaines au-dessus de C26d à 40 %) est évité, pas ignoré** :
`C26D_MOD_SHARE_MAX_PAR_DISCIPLINE` (`constraintMatrix.ts`) donne à chaque discipline sa PROPRE
borne au lieu d'un plafond unique. Construction (`coherenceScorer.ts`) :

- Le check GÉNÉRAL (pooled, toutes disciplines) **soustrait explicitement** la part modérée que le
  reclassement ajoute (`modByDisc.sw`) avant de comparer à 40 % — une identité mathématique avec le
  comportement d'AVANT ce ticket (`modByDisc.sw` valait 0 pour toute séance avant reclassement), pas
  une nouvelle tolérance. **Vérifié byte-à-byte** : les `hardViolations` des 459 combinaisons
  `audit:v1` sont identiques avant/après, champ par champ.
- La nage reçoit un check SÉPARÉ, sur SON PROPRE volume (`modByDisc.sw / totByDisc.sw`), jamais
  mélangé au reste de la semaine (règle 14 : deux disciplines ne se comparent pas sans conversion
  commune, et une semaine multisport mélangerait des coûts physiologiques différents).

**Calibration mesurée AVANT d'écrire (règle 7), pas présumée** — la question posée : quelle valeur
défendable pour la nage ? Sur `audit:v1` (459 combinaisons canoniques), transplanter le plafond
pooled à 40 % casse **38 combinaisons**. Sur le corpus complet, **819 semaines de charge nageuses
sur 2 277 (36 %)** tombent à 100 % de modéré — réparties sur les QUATRE phases (base 42,6 % · dev
31,2 % · spec 38,7 % · peak 27,9 % des semaines nageuses : **ce n'est pas un effet de rampe de
début de plan**), et le clivage réel est le NIVEAU (débutant 1,3 % contre confirmé/avancé 53,5 %).
Borner à un volume ≥ 60 min laisse encore 12,5 % du groupe intact à 100 %.

**La cause n'est pas une dérive, elle est structurelle** : contrairement au vélo/course, la nage
n'a pas l'équivalent d'un chauffe/retour au calme assez gros pour diluer son ratio quand une
semaine multisport ne lui confie qu'UNE séance technique courte — le cas normal en triathlon, où
la qualité de la semaine se joue sur une AUTRE discipline. Poser malgré tout un plafond nage
inférieur à 100 % aurait donc soit coupé du volume d'endurance légitime (l'interdiction explicite
du ticket), soit choisi un chiffre juste au-dessus du comportement actuel — **le piège nommé en
fiche 39** (« une borne calibrée au ras du comportement actuel se contente de le photographier »).
`C26D_MOD_SHARE_MAX_PAR_DISCIPLINE.sw = 1` documente donc une **absence de plafond ASSUMÉE et
MESURÉE**, pas un oubli : la table reste réelle et vérifiée, un chiffre futur sourcé n'est qu'une
ligne à changer.

**Conséquence trouvée en repassant `lotPhysio`, corrigée dans le même commit** : `T-15` — le test
qui garde l'ordre des efforts entre disciplines — est passé rouge. Exact : `rn.easy` (facile,
plafond 86,21 %) chevauche `sw.aero` (modéré, valeur fixe 83,96 %) de **2,25 points**. Ce n'est pas
la confusion vitesse/puissance que le 14/08 refusait (l'écart le plus large du tableau, VO2max,
reste à des dizaines de points) : c'est un chevauchement de deux modèles d'effort DISTINCTS
(vitesse linéaire pour la course, puissance cubique pour la nage) à leur frontière — exactement
l'« arrondi de table » que la tolérance existante de 2 points de T-15 avait été écrite pour
absorber. Tolérance portée à 3 points, avec les deux nombres exacts documentés dans le
commentaire ; re-vérifié qu'aucune autre paire ne se glisse dans la marge élargie (`sw.aero` reste
le SEUL écart trouvé).

**Vérifié : vélo/course gardent leur plafond à 40 % inchangé** — confirmé par construction
(identité mathématique) ET empiriquement (0 changement sur les `hardViolations` d'`audit:v1`).

**Mesure de l'effet sur ce que l'athlète LIT** (le point que la fiche 39 avait laissé ouvert) :
`easyShare` (facile/tout, le chiffre du dashboard « répartition des intensités ») passe d'une
moyenne de **88,4 % à 82,3 %** sur les profils qui nagent. `sw.aero` pesait 44,6 % du volume de
nage total (11,0 % du volume total du plan tous sports confondus) et n'était pas du repos — le
split devient plus honnête, exactement l'effet visé. `golden:verify` confirme que **seuls**
`._v2.intensity.*` et `._v2.score` bougent (14 979 champs sur 481 profils) : aucune séance, aucun
texte de séance, aucune décision autre que la nouvelle O-83 n'est touchée — la reclassification
n'affecte que l'audit et l'affichage, jamais la génération du plan (`intensitySplit`/`zoneClass`
ne sont lus par aucune passe de génération active, seulement par `enforceHardTimeCap` qui ne lit
que `hardMin`/`hardByDisc`, inchangés).

## Critère d'acceptation global — vérifié

- **Tâche 0** : gate corrigé, axes vivants confirmés (`css`/`pace`/`level:debutant`), dettes
  documentées plutôt que silencieuses.
- **Tâches 1-3** : chacune mesurée avant/après, publiée ci-dessus dans sa section.
- **`golden:verify`** : rayon publié par tâche — T1 : 156 profils · T2 : 1 profil · T3 : 481
  profils (recapture unique pour T1+T2 en cours de fiche, seconde recapture pour T3).
- **`audit:v1` 459 à 0** : vérifié à chaque étape (0 violation dure, `hardViolations` identiques
  aux 459 combinaisons avant/après T3).
- **`npm run batterie` complet vert** (13/13, gate de monotonie compris) — deux régressions
  trouvées et corrigées en cours de route (T2 : `audit:v1`/`D5` ; T3 : `T-15` de `lotPhysio`),
  aucune n'a été livrée sans correction.
- **Aucune régression de sécurité** : le risque épaule de la tâche 2 est vérifié explicitement
  (le garde D5/86-débutants-rapides restauré et revérifié), pas supposé réglé — c'est la
  régression même qui a été trouvée et corrigée avant livraison.
- **Registre** : `BUGS_OUVERTS.md` — O-83 fermé (deux sections : fermeture tâches 1-2, et tâche 0)
  et V-08/B-02a fermé, avec leur résolution complète. `CLAUDE.md` mis à jour.

## Récapitulatif des fichiers touchés

- `scripts/monotonie.mjs` — tâche 0 (axes vivants, dettes déclarées).
- `src/engine/constraintMatrix.ts` — `O83_SEANCE_COHERENCE_MIN`/`O83_SEMAINE_COHERENCE_MIN`
  (tâche 1), `C26D_MOD_SHARE_MAX_PAR_DISCIPLINE` (tâche 3).
- `src/generator/planGenerator.ts` — décision O-83 (tâche 1), `swimSessionCapCoherenceAtWeek` et
  le branchement de `_swimCapW` (tâche 2).
- `src/engine/loadModel.ts` — `modByDisc`/`totByDisc` sur `IntensitySplit`, reclassement
  `sw.aero` (tâche 3).
- `src/audit/coherenceScorer.ts` — pooling par discipline, check général préservé par
  soustraction, nouveau check swim séparé (tâche 3).
- `scripts/lotPhysio.mjs` — `T-15` : tolérance et commentaire mis à jour avec la mesure exacte
  (tâche 3).
- `BUGS_OUVERTS.md`, `CLAUDE.md` — registre.
- `golden/hashes.json`, `audit-results/v1-audit.{json,md}`, `Coach_Pro_V1.5.html`,
  `endurabuild/js/engine.js`, `endurabuild/sw.js` — artefacts régénérés.
