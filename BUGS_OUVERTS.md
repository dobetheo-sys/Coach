# Bugs constatés et NON corrigés

**État au 01/08/2026, commit `4222eaf` + lot R15.1** (20 gates verts, E2E 8/8, golden 764, `audit:v7` à N=400).

> **Mise à jour R15 / R15.1 :** les trois entrées de §1 sont traitées — `O-1` et `O-2` sont
> **fermés**, `O-3` attend une mesure nommée. Le handoff de revue a aussi apporté deux défauts
> qui n'étaient pas dans ce registre, corrigés et donc absents d'ici : le plancher de la semaine
> de course (291/648 configurations sous 30 % du pic) et l'éligibilité âge × format (un mineur
> générait un plan Ironman de 59 semaines). **§1 ne contient plus aucun défaut bloquant.**

Ce fichier ne liste que ce qui est **mesuré et reproductible aujourd'hui**. Chaque entrée porte
sa commande de vérification : une dette qu'on ne peut pas re-mesurer en une ligne n'est pas une
dette, c'est un souvenir. Les entrées sont classées par ce qu'elles coûtent à l'athlète, pas par
ancienneté.

Trois choses n'ont **pas** leur place ici et sont rangées à part (§4, §5) : les arbitrages
assumés entre deux règles, les chantiers humains, et les entrées de registre devenues fausses.

---

## §1 — Défauts ouverts, par gravité

### O-1 · Le banc v7 mesurait sous le seuil de ses propres défauts · ✅ **FERMÉ (R15.1)**

Les trois gestes demandés sont faits, **et c'est le troisième qui a tout trouvé.**

**1. Le tirage EST semé** (`audit_v7.cjs` : LCG, graine 1234567). Donc « `D-DISC` = 0 à N=150 »
était déterministe, pas un coup de dé — la CI était stable mais **arbitraire**, exactement le
cas que cette entrée décrivait. C'est maintenant écrit dans le banc.

**2. Les budgets sont des TAUX** (`BUDGET_PERMILLE`, ‰ de profils) et non plus des compteurs
absolus calibrés à N=150. Un budget qui dépend du paramètre d'échantillonnage n'est pas une
mesure : c'était lui qui rendait `N` intouchable, et donc qui figeait cet angle mort. **Zéro
reste zéro** — un garde-fou de sécurité ne tolère aucun cas, quel que soit N.

**3. Les DIMENSIONS varient — et voilà ce que ça a révélé.** Les six `race_date` du banc
(2026-10-04 … 2028-06-11) tombaient **toutes un dimanche** : le jour de la course n'était pas
une dimension du fuzz, c'était une constante. Elles sont désormais relatives à l'ancre
(4 horizons × 7 jours de semaine), ce qui ferme A-6 pour ce banc au passage. Dès ce changement,
à N=150 inchangé :

| | avant | après variation du jour J |
|---|---|---|
| `U-STRUCT` | 0 | **66** |
| `D-DISC` | 0 | **5** |

- **`U-STRUCT` : le banc contredisait un contrat livré.** Il exigeait 7 jours par semaine, alors
  que N2 (31/07) a délibérément rendu la dernière semaine courte — le plan s'arrête le soir du
  jour J. Vérifié : les 66 sont TOUTES la dernière semaine, avec 1 à 6 jours selon le jour de
  course (lundi → 1 jour, samedi → 6). Le check n'avait jamais protesté parce que toutes les
  courses tombaient un dimanche, seul cas qui donne une dernière semaine pleine. **Un check
  périmé depuis un mois, rendu invisible par une dimension non variée.**
- **`D-DISC` : un vrai défaut, cinq fois pire que ce que cette entrée mesurait.** 112 semaines
  d'affûtage de duathlon **sans un seul coup de pédale**, dont 108 en semaine de course.
  Corrigé : le rattrapage de volume comble d'abord un trou de DISCIPLINE (il prenait la
  discipline principale — « rn » en duathlon, celle qui était déjà là), plus une passe de
  couverture indépendante du plancher, et un avertissement nommé quand la semaine est vraiment
  trop courte.

**N passe de 150 à 400**, et la CI reste verte — *après* correction, jamais en baissant le
budget. Rétro-compatible : `npm run audit:v7 150` reste vert lui aussi.

**Re-vérifier :**
```bash
npm run audit:v7            # N=400 par défaut, budgets en ‰
npm run audit:v7 150        # l'ancien échantillon, toujours vert
```

### O-2 · `R14.3-b` — le dénivelé vélo · ✅ **FERMÉ (R15.2)**

Le relief entre désormais dans la **cible d'intensité** vélo : plat 175–191 W · vallonné
173–189 W · montagneux 169–185 W (FTP 230). Le conseil nomme l'indice de variabilité et la
puissance NORMALISÉE. Une seule clé (`courseProfileOf`, la même que la course à pied), et les
trois sports qui prescrivent des watts (tri, vélo, duathlon) passent par le même point —
sans quoi un quatrième producteur divergerait, cette fois sur le PACING.

O-2 disait *« premier geste attendu : écrire le critère, pas le correctif »*. Le critère est
venu avec le handoff de revue (`R15.2-A/B/C/D`, gate `npm run audit:r15`) : c'est lui qui rend
la fermeture vérifiable, et c'est pour ça que l'entrée peut être fermée plutôt que « faite ».

### O-3 · `D10-8` — le créneau facile de repli du trail · 📊 **MESURÉ (R15.3) — mérite son lot**

L'entrée réclamait l'écart de contenu entre `facileR` et `facile2`. Le handoff R15.3 a
repositionné la question, et il avait raison : avant d'arbitrer QUEL créneau sert de repli, il
faut savoir COMBIEN de plans passent par là. **Le critère a été posé avant la mesure** — < 5 %
ferme l'entrée, > 20 % lui donne son lot — pour que le chiffre décide et pas l'inverse.

**Mesure** (`npm run measure:fallback`, balayage complet niveaux × historiques × volumes ×
budgets de séances × disponibilités, 324 plans trail) :

| sport | plans avec ≥1 repli | jours en repli |
|---|---|---|
| **trail** | **81 / 324 = 25,0 %** | 1 287 / 49 896 = 2,6 % |
| swimrun | 576 / 1 296 = 44,4 % | 6 288 / 163 296 = 3,9 % |
| run · bike · swim · tri · duathlon | non mesurables — ces modules ne DÉCLARENT pas de `weekSchema` (ils prennent celui du générateur), donc il n'existe pas de « créneau prévu » à comparer |

**Verdict : 25,0 % > 20 % → l'entrée mérite son lot**, avec mesure avant/après sur le golden.
Le taux par JOUR (2,6 %) dit la forme du défaut : le repli est fréquent à l'échelle du plan et
rare à l'échelle de la semaine — typiquement une séance, sur une semaine, dans un plan sur
quatre. Ça reste au-dessus du seuil posé, et le seuil ne se déplace pas parce que le chiffre
déplaît. Le swimrun, lui, est presque deux fois plus concerné et n'était même pas dans la
question d'origine.

**Méthode, et ce qu'elle a coûté à valider.** Aucune instrumentation dans `src/` : le repli est
détecté post-hoc en comparant le plan émis au `weekSchema` déclaré. Trois pièges rencontrés, les
trois notés parce qu'ils se reproduiront :
1. le premier balayage a rendu **0,0 %** — le domaine de format du trail est un tableau VIDE
   (sa catégorie est déduite, R7), donc la boucle ne produisait aucun profil. Un balayage vide
   qui affiche « 0 % » est le pire des faux verts ; le script échoue désormais s'il ne génère
   aucun plan ;
2. ma « méthode de contrôle » par dénombrement a rendu 0 % contre 25 % pour la méthode par
   position — et c'est **le contrôle** qui était faux : il supposait que les créneaux de repli
   du schéma survivent, alors que le budget de séances en éteint ;
3. la correspondance par position n'est valide que si les jours ne sont pas réordonnés. C'est
   désormais **vérifié à chaque exécution** (les jours portent leur nom canonique), pas supposé.

```verify
id: O-3
quoi: le repli se déclenche encore sur ≥20 % des plans trail
attendu: /mérite son LOT/
cmd: npm run measure:fallback trail
```

**Reste à faire (le lot), périmètre ARBITRÉ (01/08/2026) : les DEUX sports dans le même
mouvement.** Le swimrun est presque deux fois plus concerné (44,4 % contre 25,0 %) que le sport
qui a ouvert l'entrée ; le traiter séparément referait le même travail deux fois sur le même
mécanisme. Le lot décide `facileR` vs `facile2` pour trail ET swimrun, avec mesure avant/après
sur le golden.

### O-4 · La même coche ne faisait pas la même chose selon l'onglet · ✅ **FERMÉ (R16.9)**

Trouvé en diffant `tab-week.js` contre `tab-plan-general.js` avant leur fusion — pas cherché,
rencontré. Il existait **deux implémentations du geste « ✓ séance faite »** : celle de
📅 Semaine ouvrait le feedback RPE, posait le drapeau douleur le cas échéant, calculait les
badges et célébrait ; celle de 🗓 Plan basculait `S.answers.done[k]` en silence. Deux chemins
pour le même bouton, dessiné pareil, sur des vues du même plan.

Conséquence mesurable : quelqu'un qui cochait ses séances depuis l'onglet Plan ne produisait
**aucun `completions`** — donc aucun RPE, donc l'ajusteur du lendemain travaillait sur une
fatigue sous-estimée, et le drapeau douleur ne pouvait jamais se poser. La boucle
« le plan réagit » était coupée pour cet utilisateur, sans qu'aucun test ne le voie : chaque
suite cochait depuis l'onglet où la coche complète existait.

Fermé par construction : `toggleDone` (`session-life.js`) est le point unique, `weekGridHTML`
le seul producteur de cases. La leçon est celle du dépôt, appliquée à l'UI — **deux chemins
pour un même geste finissent toujours par diverger**, et c'est le chemin le moins testé qui
part en silence.

### O-5 · La règle « rien avant le check-in » ne tenait que par une redirection · ✅ **FERMÉ (arbitrage, 01/08/2026)**

📅 Semaine faisait respecter la règle produit R5 en REDIRIGEANT tout l'onglet vers Aujourd'hui.
🗓 Plan, lui, affichait la saison entière — séances comprises — sans aucune porte. La règle n'a
donc jamais tenu « partout » comme le prétendait ARCHITECTURE.md : elle tenait dans un onglet
sur deux, et personne ne l'avait remarqué parce que les deux écrans n'étaient jamais comparés.

**Arbitrage retenu, et il est explicite :** une séance **PLANIFIÉE** dans une vue de saison
n'est pas une séance **PRESCRITE** pour aujourd'hui. Ce que la règle vise, c'est l'écran du
matin — la séance du jour montrée sans avoir été adaptée à la forme réelle. Elle ne vise pas la
consultation de son calendrier, qui est au contraire ce que l'athlète a payé.

Ce qui est donc en place et ne bougera pas sans nouvelle décision :
- la carte « Ta semaine » (tête de 🗓 Plan) reste **vide** tant que le point du matin n'est pas
  fait, et propose le check-in ;
- 🎯 Aujourd'hui garde son gate en diaporama, inchangé ;
- la vue de saison dépliée montre les séances, **y compris celles de la semaine courante**.

Les deux autres issues ont été écartées en connaissance de cause : masquer la semaine courante
dans la saison creuse un trou au milieu du calendrier pour une cohérence de principe ; rétablir
la redirection de tout l'onglet prend le plan en otage pour consulter sa propre préparation.

### O-6 · `golden:verify` — un gate de CI rouge en permanence depuis R15.7-C · ✅ **FERMÉ (R16.10-a)**

Trouvé en revérifiant les vingt gates un par un avec le bon code de sortie (une boucle
antérieure lisait `$?` après une substitution de commande et rapportait « OK » pour tout le
monde — l'instrument de vérification était lui-même faux, ce qui est la version la plus
gênante du défaut).

`golden:verify` annonçait « 900 profils, 0 écart » **puis sortait en code 1**. Cause : R15.7-C
a ajouté quatre profils `mineur` dont la génération se termine par un REFUS typé
(`ENTREE_INVALIDE`) — le comportement voulu, ajouté exprès — que le golden comptait comme une
erreur de génération. `.github/workflows/audit.yml` gate sur cette commande : **le job était
donc rouge depuis R15.7-C**, et mes propres messages de commit annonçaient « 20 gates verts »
sans que ce soit vrai pour celui-là.

Fermé en distinguant le refus typé de l'erreur, comme `U-REFUS:` au banc v7 depuis R11 : on
compte, on affiche, on hache — on ne confond pas. **Leçon à garder : un gate qui échoue en
permanence ne signale plus rien, et une vérification en boucle shell doit tester le code de
sortie de la commande, pas celui de son enrobage.**

```verify
id: O-6
quoi: golden:verify sort en 0 et annonce 0 écart
attendu: /0 écart/
cmd: npm run golden:verify
```


### O-7 · La structure hebdomadaire du swimrun ne lisait pas l'objectif · ✅ **FERMÉ (R16.10, S13)**

`swimrunWeekSchema(phase, isRecup)` ne voit jamais la course. Mesuré : la part de course dans
le plan valait **63-64 % pour toute épreuve**, alors que la part de course dans l'épreuve va de
45 % (5 000 m de nage / 5 km) à 94 % (800 m / 30 km) — 31 points de sous-entraînement du
limiteur réel sur une épreuve course-dominante. Fermé par `S13_MIX_FOLLOWS_RACE`.
Voir ARCHITECTURE.md « R16.10 » pour la table avant/après et les deux verrous.

---

### O-8 · Le footing du swimrun n'a pas de bornes · ✅ **FERMÉ (R20.3) — après deux bornes fausses**

Trouvé en lisant les plans pendant R18.4, pas en cherchant. Sur un swimrun à 12 h/sem, la plus
longue séance du plan est un **« Footing facile »** :

| format | plus longue séance du plan |
|---|---|
| experience | **182 min** |
| sprint | **228 min** |
| series | **226 min** |

Un footing de presque quatre heures n'est pas un footing : c'est une seconde sortie longue
déguisée, et sur les trois formats c'est elle qui domine le plan — devant la séance pivot, qui
est censée être LA séance spécifique du swimrun.

C'est **exactement** le défaut que R13 a corrigé pour le triathlon (« Footing facile 213 min »,
banc v6, D7) : le bloc du créneau facile n'a **pas de `bnd`**, il devient donc le déversoir de
toutes les passes de remplissage. La correction du tri a posé `ftCaps` en bornes ; celle du
swimrun n'a jamais été faite, parce que le module est arrivé plus tard et que personne n'a
rejoué la liste des leçons du sport précédent.

Ce n'est pas dans R18 parce que R18 traite six constats de test nommés, et que celui-ci n'en
fait pas partie — l'élargir en silence est précisément ce que ce registre existe pour empêcher.

---

**FERMETURE (R20.3, 01/08/2026) — et deux bornes réfutées avant la bonne.**

Le créneau facile porte désormais un `bnd` (S14). Mesuré sur les quatre formats : le footing
passe de 179-226 min à **115-150 min**, et la séance la plus longue du plan est la **pivot**
partout — c'est-à-dire la séance qui EST la spécificité du sport.

Ce qui a coûté deux tentatives, c'est de trouver **sur quoi** indexer la borne. Le banc v7 a
réfuté les deux premières, sur le même check `S-MIX` (part de course du plan vs part de course
de l'épreuve, 4 profils en défaut avant le lot) :

| écriture de la borne | S-MIX |
|---|---|
| relative à la pivot de la MÊME semaine, ×0,70 | **158** |
| indexée sur le temps de course à pied de l'épreuve, ×0,55 | **152** |
| **relative à la pivot du PIC, ×0,90** | **0** |

Les deux premières serraient le footing pendant la construction, là où il n'a aucune raison de
suivre la rampe de spécificité de la pivot. En swimrun, les deux créneaux faciles PORTENT la
course à pied du plan — il n'y a ni sortie longue course ni footing supplémentaire pour
compenser. Les serrer, c'est sous-entraîner le limiteur réel du sport : j'aurais échangé un
footing fictif contre un sous-entraînement réel, soit exactement le défaut que S13 venait de
corriger en R16.10.

Le défaut n'était pas qu'un footing soit LONG : c'était qu'il soit **la plus longue séance du
plan**. La borne porte donc là-dessus.

**Et le banc punissait une quatrième règle de sécurité.** Les 26 hits résiduels de S-MIX
portaient **tous** une eau sous le seuil d'acclimatation S7 (25 à 16 °C, 1 à 13 °C) : sous
17 °C, le module verrouille le second créneau facile sur une exposition au froid, au nom de la
hiérarchie du manifeste — l'hypothermie n'est pas un arbitrage de spécificité. Même famille que
le drapeau médical et les deux familles de blessures, exemptées en R16.10 ; le check ne le
voyait pas parce que le footing sans bornes masquait le déséquilibre avec du volume fictif.
**L'instrument était d'accord avec le moteur pour la mauvaise raison.** L'exemption se lit sur
le PLAN (présence effective de la séance d'acclimatation), pas sur la température déclarée.

Résultat : swimrun **89 % de profils propres** au banc v7 (contre 88 % avant le lot), **S-MIX
0 aux trois tailles d'échantillon** (N=250/400/600) — son budget passe de 12 ‰ à **0, garde-fou
définitif**.

Reste ouvert, et c'est une question produit : voir **O-15**.

```verify
id: O-8
quoi: la plus longue séance d'un plan swimrun est la pivot, pas un footing
attendu: /^(experience|sprint|series|championship) : pivot(\n|$)/m
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swimrun',level:'inter',history:'confirme',intent:'competition',vol_max:'12',sessions_max:'7',dispo:'quotidienne',age:'35',sex:'H',pace:'4:50',pace_known:'oui',css:'2:00',css_known:'oui',vol_recent:'8',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'parfois',swim_total_m:'2000',run_total_km:'12',segments_n:'10',longest_swim_m:'600',water_temp_c:'18',team_mode:'solo',openwater_access:'saisonnier',swim_continuous:'oui',run_continuous:'oui',gear_test:'oui',race_date:'2027-11-24'};for(const f of ['experience','sprint','series','championship']){const p=E.buildPlan('swimrun',{...b,format:f});let mx=0,nm='';for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions||[])if((s.min||0)>mx){mx=s.min;nm=s.name;}console.log(f+' : '+(/Footing/.test(nm)?'FOOTING '+mx+' min':'pivot')); }"
```

### O-9 · Le banc d'invariants n'est pas vert, et la documentation dit qu'il l'est · ✅ **FERMÉ (R20.6)**

`CLAUDE.md` annonce « Banc d'invariants vert sur ses 19 tests ». Il ne l'est pas, et ne l'était
pas avant R18 non plus (vérifié en rejouant le banc contre le moteur d'avant le lot : **mêmes**
quatre échecs, aux mêmes comptes). Ce sont donc quatre dettes silencieuses, pas une régression :

| id | ce qu'il dit | échecs | lecture |
|---|---|---|---|
| I6 | séance non vide | 54 | la course objectif est à `min: 0` **par conception** (R13.4) — c'est l'INVARIANT qui est périmé, pas le moteur |
| I8 | plafond de séances | 15 | la course objectif s'ajoute au budget de la semaine ; même famille que I6 |
| I12 | sortie longue ≤ 60 % | 3 | trail, petite enveloppe : 54 min sur 4 séances — c'est de la granularité, `GRAIN_MIN` ne couvre pas ce cas |
| I14 | la longue est la plus longue | 6 | trail, grosse enveloppe, débutant : « Sortie longue trail » plafonnée à 180 min pendant qu'un autre bloc monte à 295 |

I6 et I8 se corrigent dans le BANC (exclure la course, comme le fait déjà `wmin` ailleurs).
I12 et I14 sont à re-mesurer : I14 a été déclaré fermé en R14, il ne l'est pas pour le trail
débutant à grosse enveloppe. Le banc sort en 0 quoi qu'il arrive — il RAPPORTE, il ne garde
pas —, ce qui explique que personne ne l'ait vu : un rapport que rien ne lit vaut zéro.

---

**FERMETURE (R20.6, 01/08/2026).** Trois invariants PÉRIMÉS, un VRAI défaut, et le banc devient
bloquant — dans cet ordre, parce que rendre bloquant un banc dont on n'a pas trié les échecs
revient à figer la dette au lieu de la traiter.

**Périmés — la course objectif n'est pas une séance d'entraînement.**
- `I6` (54 échecs) réclamait une durée non nulle : le jour J porte `min: 0` **par conception**
  depuis R13.4 — c'est ce qui l'empêche d'être la victime des passes de coupe.
- `I8` (15) comptait la course dans le budget `sessions_max`, un budget d'entraînement : la
  course a lieu, elle ne se décide pas. Le moteur l'exclut déjà (R15.7-A).
- `I12` (3) mesurait la dominance d'une sortie longue… dans la **semaine de course** d'un trail
  à petite enveloppe : « Endurance allégée » 54 min sur 80 au total. Il n'y a pas de sortie
  longue dans cette semaine — ce qu'on mesurait est une structure d'affûtage voulue. Les
  semaines de décharge sortent du champ, comme dans toutes les règles de volume du dépôt.

**Vrai défaut — `I14` (6), et il était plus large que « du trail débutant ».** « Marche rapide
en montée (bâtons) » atteignait **295 min pendant que la « Sortie longue trail » du même athlète
est plafonnée à 180** (C23, débutant) : la séance qui donne son nom à la semaine n'était plus la
plus longue, sur le sport où la sortie longue EST la séance de référence. `enforceLabelVsDose`
ne la réduisait pas parce que la 2ᵉ passe d'I14 (R14) interdisait de toucher un bloc en pente
non répété — son commentaire assumait explicitement le résidu.

Ce qui était interdit, c'était de changer la VITESSE ASCENSIONNELLE (raboter la durée en gardant
le D+ ferait gravir les mêmes 400 m en moins de temps). Réduire durée **et** dénivelé du même
facteur la laisse strictement identique : c'est la même montée, plus courte. Troisième passe
d'I14, et le résidu tombe à zéro.

**Puis le banc garde.** Il sort en code 1 (vérifié rouge en cassant un seuil) et **entre en CI**
— il n'y était pas, ce qui est la vraie raison pour laquelle quatre familles d'échecs ont vécu
sous une documentation qui le disait vert. **20 invariants × 54 configurations, 0 échec.**

```verify
id: O-9
quoi: le banc d'invariants est vert ET bloquant
attendu: /✓ les 20 invariants tiennent sur les 54 configurations/
cmd: npm run audit:invariants
```

### O-10 · `vol_max` ne pilote plus rien au-delà de 10 h, et l'annonce ne colle pas au livré · ✅ **FERMÉ (R20.2) — et ma colonne 2 était fausse**

Constat de test du fondateur : « Volume max à 12 h au lieu de 14, acceptable pour le 70.3 ».
La mesure dit autre chose que le constat, et **autre chose que ce que j'avais écrit d'abord** :
ma première mesure passait `intent: "perf"`, qui n'est pas dans le domaine (`competition /
finir / plaisir`) — le chemin validé la refuse, le chemin interne la tolérait. Refaite sur une
entrée valide, sur un 70.3 historique `ancien` :

| `vol_max` déclaré | pic ANNONCÉ | pic LIVRÉ |
|---|---|---|
| 10 h | 8,8 h | 9,6 h |
| 12 h | 8,7 h | 9,5 h |
| 14 h | 8,7 h | 9,5 h |
| 16 h | 8,7 h | 9,5 h |

Deux choses, et aucune n'est celle qu'on croyait :
1. **au-delà de 10 h, `vol_max` ne change plus rien** — le limiteur est ailleurs (budget de
   séances × plafonds de la bibliothèque 70.3), et la question continue d'être posée comme si
   elle décidait ;
2. le pic **livré dépasse le pic annoncé** de ~0,8 h, systématiquement. C'est l'inverse du sens
   redouté, mais c'est le même défaut : la **sonde de capacité V2.1** existe pour que « la
   promesse suive ce que les plafonds permettent », et ici les deux ne se rejoignent pas.

Le fondateur a tranché « acceptable » sur l'écart de volume ; l'entrée reste ouverte parce que
le point 1 rend une question du questionnaire inerte au-delà d'un seuil que rien n'annonce.

---

**FERMETURE (R20.2, 01/08/2026) — et d'abord une rectification de ma propre mesure.**

**Le point 2 ci-dessus est faux, et il l'est par un titre de colonne.** `p.volPeak` est le pic
RÉELLEMENT LIVRÉ (le max des `w.vol`, et c'est lui que l'UI affiche partout) ; `w.vol_declared`
est la CIBLE de la courbe de charge, une valeur interne que l'athlète ne voit nulle part. Mes
deux colonnes étaient donc inversées : le livré (8,7 h) est légèrement EN DESSOUS de la cible
(9,5 h), pas au-dessus. Le sens était l'inverse de ce que j'avais écrit, et c'est le sens
attendu — la sonde de capacité V2.1 abaisse ce qu'elle ne sait pas porter. Il n'y a pas de
défaut ici, seulement une mesure mal étiquetée, publiée telle quelle dans ce registre. Une
mesure dont on ne vérifie pas ce que chaque champ veut dire ne mesure rien.

**Le point 1 est réel, et il est traité — sans toucher un seul chiffre du plan.** Forcer le
volume vers le plafond demandé reviendrait à gonfler des séances au-delà de leurs bornes,
c'est-à-dire à défaire exactement ce que V2.1 protège. Le moteur DIT donc ce qui borne :
il reconstruit la chaîne de réduction maillon par maillon (historique → volume utile du format
→ marge hors compétition → récupération → temps dans l'eau → drapeau médical → blessure/âge →
structure de la semaine) et nomme celui qui a **le plus retiré, en heures**. Décision `R20.2`,
affichée en tête de « Pourquoi ce plan », pas au fond d'un volet.

Ma première écriture testait les plafonds dans l'ORDRE DU CALCUL et nommait le premier qui
mord : sur la natation, elle annonçait « c'est ton historique qui borne » (10 h) pour un pic
livré à 3,3 h — faux de 7 h, et surtout elle envoyait l'athlète corriger la mauvaise réponse.
Une explication approximative sur un chiffre qu'il a lui-même saisi est pire qu'un silence.

Le levier des doubles est proposé **là où il existe** : garde de module `doublesAddVolume`,
déclaré par le seul triathlon, et **mesuré dans les deux sens** à chaque `npm run
audit:sensibilite` (déclaré ⟺ le pic monte d'au moins 5 %). Sur le 70.3 de la mesure ci-dessus,
`doubles: "oui"` fait passer le pic de 8,7 h à **13,5 h** — la question n'était pas inerte, son
levier était ailleurs et personne ne le disait. Le diagnostic reste honnête sous drapeau
médical, blessure ou âge, mais **aucun levier n'y est jamais proposé** : on n'invite pas à
charger davantage quelqu'un dont le plan a été réduit pour le protéger.

Trouvé au passage, même famille : la carte « Pourquoi ce plan » appelait le plafond
d'historique « ton volume déclaré » depuis l'origine — corrigé.

```verify
id: O-10
quoi: au-delà de 10h le pic ne bouge plus, mais le moteur NOMME le limiteur et son levier
attendu: /nombre de séances[\s\S]*deux séances certains jours/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const a={sport:'tri',format:'70.3',level:'avance',history:'ancien',intent:'competition',sessions_max:'7',dispo:'quotidienne',age:'35',sex:'H',pace:'4:50',pace_known:'oui',ftp:'230',ftp_known:'oui',css:'2:00',css_known:'oui',vol_recent:'10',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'parfois',race_date:'2027-01-24'};for(const v of ['10','16']){const p=E.buildPlan('tri',{...a,vol_max:v});const d=(p._v2.decisions||[]).find(x=>x.id==='R20.2');console.log('vol_max='+v+'h → pic livré '+p.volPeak+' h'+(d?' · '+d.val+' · '+d.why:' · (rien à expliquer)'));}"
```

### O-11 · Deux définitions de « l'allure course » à vélo, et une prose qui promet la mauvaise · ✅ **FERMÉ (R20.5)**

Le brick disait dans sa NOTE « vélo en endurance, **dernier tiers @ allure course** » pendant que
son step portait `bk.z2` sur la totalité. Mesuré sur un plan 70.3 : **881 min (14,7 h) d'allure
course annoncées à l'athlète, portées par aucun step, comptées 100 % facile** par la répartition
d'intensité. Un commentaire du module l'assumait — pour ne pas faire tomber la part de temps
facile. C'est protéger la MÉTRIQUE et pas le plan, et c'est la leçon de R7 TRAIL non apprise
ici : une intensité portée par une phrase n'existe pas.

**Fait en R19 :** la note dit désormais ce que la séance fait. Le trou prose/structure est
fermé, dans le sens qui ne coûte rien à personne.

**Pas fait, et le motif est mesuré :** poser le tiers en `bk.rp` met **58 combinaisons de tri
sous le plancher C26** (tri/70.3 : 27, tri/M : 16, tri/S : 15). Et surtout, en le construisant
on découvre le vrai blocage :

| source | « allure course » vélo |
|---|---|
| `renderer.ts` zone `bk.rp` | **0,80–0,88 × FTP** |
| `predictor.ts` `TRI_BIKE["70.3"]` (jour J) | **0,752–0,822 × FTP** |

Le moteur porte **deux définitions du même effort**, et la zone d'entraînement est plus dure
que l'allure qu'il prescrit pour la course. Construire une séance sur `bk.rp` en croyant
reproduire le jour J revient donc à faire rouler plus dur que le jour J — exactement le défaut
que R15.2 a corrigé pour le relief, à un autre endroit.

Trois choses à trancher ensemble, pas séparément : (1) réconcilier les deux définitions ;
(2) décider si le plancher de temps facile doit rester uniforme, alors que la littérature
décrit l'entraînement de longue distance comme PYRAMIDAL et non polarisé ; (3) alors seulement,
reconstruire le tiers à allure course.

---

**FERMETURE (R20.5, 01/08/2026) — les trois points, dans cet ordre.**

**(1) Une seule définition.** `raceBikeBand(sport, format)` est le point unique ; les trois
tables de puissance de course (`TRI_BIKE`, `DUA_BIKE_POWER` × pré-fatigue, `BIKE_POWER`) y
convergent, et la zone `bk.rp` la lit — **relief compris**, par le même résolveur de parcours
que la prédiction (R15.2). Résultat : la zone d'entraînement EST la cible du jour J.

| | avant (toutes épreuves) | après |
|---|---|---|
| tri/S | 184–202 W | **196–214 W** |
| tri/70.3 | 184–202 W | **175–191 W** |
| tri/Full | 184–202 W | **161–175 W** |
| duathlon/PM | 184–202 W | **154–171 W** |
| bike/cyclo | 184–202 W | **168–191 W** |

(FTP 230 W, parcours plat. En montagne, 70.3 → 169–185 W : les mêmes chiffres que ceux que
R15.2 avait documentés pour la prédiction.)

**(2) Le plancher de temps facile mesurait le mauvais rapport.** `easyShareFloor` vaut
`1 − plafondDur / minutesHebdo` : la formule est dérivée du plafond de temps DUR, et de lui
seul — elle décrit donc `facile / (facile + dur)`. Elle était comparée à
`facile / (facile + modéré + dur)` : une formule à deux seaux confrontée à une mesure sur trois.
Erreur d'unité, même espèce qu'O-13. Mesuré sur un tri/70.3 confirmé/débutant : **70 % facile ·
27 % modéré · 3 % DUR**, refusé par une règle dont la justification écrite est de borner le
travail dur ; le même plan vaut **96 %** sur le rapport que la formule décrit. Le modéré n'est
pas libéré pour autant — **C26d** (R20.4) le borne pour lui-même à 40 %. La question « pyramidal
vs polarisé » se dissout : le plancher gouverne la polarisation (facile vs dur), C26d gouverne
la pyramide (le volume de modéré).

**(3) Le tiers à allure course existe — là où il veut dire quelque chose.** Un seul critère
gouverne deux décisions : la bande de l'épreuve. Au-dessus de 0,85 × FTP (bas de la zone seuil
de Coggan), « l'allure course » est une intensité qu'on SURVIT — elle compte alors DUR
(`zoneClass` lit la bande, R20.5), et le tiers ne se construit pas : sur un sprint, le segment
vélo dure vingt minutes et les séances de qualité portent déjà ce stimulus. En dessous, c'est
une allure qu'on TIENT, et l'apprendre pendant des heures est l'objet même de la séance.

| | vélo du brick en semaine de pic |
|---|---|
| tri/S | `bk.z2` 90 min |
| tri/M | `bk.z2` 120 min |
| tri/70.3 | `bk.z2` 120 min + **`bk.rp` 60 min** |
| tri/Full | `bk.z2` 200 min + **`bk.rp` 100 min** |

Mesuré en chemin, et corrigé : poser le tiers sans (2) mettait 30 combinaisons de tri/S sous le
plancher ; le poser sans faire suivre la CLASSIFICATION laissait `enforceHardTimeCap` aveugle au
bloc que l'auditeur comptait — deux définitions du mot « dur », le défaut O-11 reproduit à
l'intérieur de son propre correctif.

```verify
id: O-11
quoi: la zone d'entraînement « allure course » vélo lit le format, comme la cible du jour J
attendu: /tri\/S 196-214W[\s\S]*tri\/70\.3 175-191W[\s\S]*tri\/Full 161-175W/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={intent:'competition',dispo:'partielle',doubles:'parfois',off_days:'non',shift_ok:'non',age:'35',sex:'H',pace_known:'oui',pace:'4:50',ftp_known:'oui',ftp:'230',css_known:'oui',css:'2:00',vol_recent:'8',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',history:'confirme',level:'inter',vol_max:'12',sessions_max:'6'};for(const f of ['S','M','70.3','Full']){const p=E.buildPlan('tri',{...b,sport:'tri',format:f});let rp=null;for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions||[]){const st=(s.steps||[]).find(x=>x.zone==='bk.rp');if(st&&!rp){const all=(s.det||'').match(/[0-9]+-[0-9]+ ?W/g)||[];rp=all[all.length-1];}}console.log('tri/'+f+' '+(rp||'pas de bloc allure course'));}"
```

### O-12 · Ma mesure d'intensité d'affûtage était fausse — et j'ai failli « corriger » un moteur sain · ✅ **FERMÉ (R19, par rétractation)**

Enregistré parce que c'est une leçon de MESURE, et que ce fichier existe pour ça.

Audit du 01/08/2026 : j'ai conclu que « l'affûtage coupe l'intensité plus vite que le volume »
sur la foi d'un compteur de **minutes DURES** (`.vo2 / .thr / .speed / .css`) tombant à zéro sur
14 plans course et vélo. J'ai écrit une correction (coupe d'affûtage en deux passes, épargne du
dernier jour de qualité), puis je l'ai mesurée :

| | qualité en 1re semaine d'affûtage | semaines à zéro |
|---|---|---|
| moteur avant | 45 min | 2 |
| **avec ma « correction »** | **38 min** | **4** |
| moteur après retrait | 43 min | 0 |

Le constat était un **artefact de la métrique** : `bk.rp`, `bk.ss` et `rn.mara` — c'est-à-dire
le travail d'allure spécifique, exactement ce qu'un affûtage doit garder — sont classés
MODÉRÉS, pas durs. Sur le bon critère (modéré + dur), le moteur d'avant était déjà **59/59
conforme**. Ma correction était une régression ; elle est retirée.

Ce qui reste vrai et acquis : `zoneClass()` a failli être dupliqué dans le générateur, et
`bike/crit` — l'épreuve la plus dépendante de la puissance — n'a effectivement aucune minute
de zone HAUTE en affûtage. C'est défendable (sweetspot + rappel d'allure), mais c'est le seul
point de ce constat qui mériterait un regard d'entraîneur de piste.

```verify
id: O-12
quoi: sur le critère corrigé (modéré + dur), l'affûtage garde sa qualité
attendu: /, 0 sans aucune qualite/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const iso=w=>{const d=new Date(Date.now()+w*7*864e5);d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7));return d.toISOString().slice(0,10)};const B={level:'inter',history:'confirme',intent:'competition',vol_max:'10',sessions_max:'6',dispo:'quotidienne',age:'35',sex:'H',pace:'4:50',pace_known:'oui',ftp:'230',ftp_known:'oui',css:'2:00',css_known:'oui',vol_recent:'7',injury:'aucune',off_days:'non',shift_ok:'non',terrain:'plat'};const S={run:['5k','semi','marathon'],bike:['crit','cyclo'],tri:['M','70.3']};let n=0,vide=0;for(const sp of Object.keys(S))for(const f of S[sp])for(const sem of [22,30,40]){let p;try{p=E.buildPlan(sp,{...B,format:f,race_date:iso(sem)})}catch(e){continue}const wk=p._v2.intensity.weekly,T=p.weeks.map((w,i)=>({i,ph:w.phase.id})).filter(x=>x.ph==='taper').slice(0,-1);for(const x of T){n++;if(wk[x.i].m+wk[x.i].h===0)vide++}}console.log(n+' semaines d affutage, '+vide+' sans aucune qualite')"
```

### O-13 · La rampe R10 ne mord jamais en natation — erreur d'unité · ✅ **FERMÉ (R20.7)**

Trouvé par le balayage dérivé du schéma, pas en cherchant : `vol_recent` est la seule clé du
schéma qui reste inerte dans un sport (la natation) une fois les exemptions posées.

Mesuré sur un profil `swim / fond / reprise` : semaine 1 = **1,6 h quelle que soit la réponse**
(0, 1, 4 ou 8 h/sem de volume récent). Aucune décision `R10-depart` n'est émise.

La cause est une **erreur d'unité**. Le plafond de rampe vaut `max(2 h, vol_recent × 1,1)` et
se compare aux heures du PLAN ; or le volume de nage est déjà converti en heures d'EAU par
`SWIM_TIME_FACTOR` (0,4). Une semaine 1 de nage dépasse donc rarement 2 h, et le plancher de la
rampe l'absorbe toujours. Les deux nombres ne mesurent pas la même chose.

Corriger demande de **décider ce que `vol_recent` veut dire pour un nageur** — des heures dans
l'eau, ou des heures d'entraînement toutes disciplines ? C'est une question de produit avant
d'être une ligne de code, d'où l'entrée plutôt qu'un correctif rapide. Elle est portée comme
DETTE DÉCLARÉE dans `banc_sensibilite.cjs` : le banc l'affiche à chaque exécution.

---

**FERMETURE (R20.7, 02/08/2026) — décision du fondateur : c'est au MOTEUR de convertir.**

La question posée à l'athlète ne bouge pas. Lui demander de retrancher ses temps d'arrêt serait
lui demander un calcul qu'il ne peut pas faire, et la plupart répondraient de toute façon le
temps passé à la piscine. Le moteur applique `SWIM_TIME_FACTOR` au chiffre déclaré **avant** de
le comparer, et le plancher de la rampe suit la même unité — sinon un plancher de 2 h
« génériques » vaudrait 5 h de piscine et ne bornerait toujours rien.

| `vol_recent` déclaré | semaine 1, avant | semaine 1, après | pic, après |
|---|---|---|---|
| 0 h | 1,6 h | **1,3 h** | 1,6 h |
| 2 h | 1,6 h | **1,4 h** | 1,7 h |
| 5 h | 1,6 h | 1,6 h | 2,7 h |
| 10 h | 1,6 h | 1,6 h | 2,7 h |

Le comportement au-dessus de 5 h est INCHANGÉ, et c'est la vérification qui compte : un nageur
qui fait déjà cinq heures de piscine par semaine est au-dessus de la semaine 1 du plan, la rampe
n'a rien à borner chez lui. Elle ne mord que là où elle doit — sur celui qui repart de rien.

**Trouvé en corrigeant** : la chaîne d'explication de R20.2 souffrait de la MÊME faute d'unité.
Elle comparait des baisses d'avant la conversion (heures « génériques ») à des baisses d'après
(heures d'eau) et annonçait « c'est ton historique, −5 h » pour un pic livré à 1,6 h — ces 5 h
n'existent pas dans l'unité du chiffre affiché. Chaque baisse est désormais ramenée à l'unité
du pic. Et la rampe est devenue un MAILLON de cette chaîne : sur une prépa courte, c'est elle
qui décide du pic, et elle n'était nommée nulle part.

```verify
id: O-13
quoi: en natation, le volume récent déclaré change la semaine 1
attendu: /vol_recent= 0h → S1 1[.,]3h[\s\S]*vol_recent= 5h → S1 1[.,]6h/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swim',format:'fond',intent:'competition',dispo:'partielle',doubles:'parfois',off_days:'non',shift_ok:'non',age:'35',sex:'H',css_known:'oui',css:'2:00',milieu:'bassin',swim_limit:'technique',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',sessions_max:'6',vol_max:'10',history:'reprise',level:'inter'};for(const vr of ['0','2','5','10']){const p=E.buildPlan('swim',{...b,vol_recent:vr});console.log('vol_recent='+vr.padStart(2)+'h → S1 '+p.weeks[0].vol+'h · pic '+p.volPeak+'h');}"
```

### O-14 · `swim_limit` n'agissait que pour les débutants · ✅ **FERMÉ (R20.1-d)**

`CLAUDE.md` affirmait que `swim_limit` était « câblé sur ses 4 valeurs ». Il l'était sur un
QUART de la population : les deux seuls endroits qui consommaient le focus (`limFocus`) étaient
derrière `if (beginner)`. Un nageur intermédiaire qui déclare « ma limite, c'est la
respiration » recevait « éducatifs », sans plus. Une limite ne disparaît pas quand on progresse.
Trouvé par la garde R20.1, corrigé dans le même lot.

### O-15 · L'eau froide fait passer le plan sous le seuil de spécificité, et l'exemption du banc le rend invisible · ✅ **FERMÉ (R20.8)**

Découvert en fermant O-8, et seulement parce que le footing sans bornes le masquait avec du
volume fictif. Après la pose des bornes S14, **26 profils** du banc v7 tombaient plus de
15 points sous la part de course de leur épreuve — et **les 26 portaient une eau sous le seuil
d'acclimatation S7** (25 à 16 °C, 1 à 13 °C). Isolé toutes choses égales par ailleurs
(15 profils : 5 blessures × 3 niveaux, mêmes distances, même épreuve) :

| température de l'eau | profils sous le seuil |
|---|---|
| 16 °C | **3 / 15** |
| 20 °C | **0 / 15** |

Le mécanisme est identifié, son AMPLEUR ne l'est pas entièrement — sur le profil de référence
l'écart entre 16 °C et 20 °C ne vaut que 3 points (56 % contre 59 % de course, pour une épreuve
à 68 %), donc le froid ne CRÉE pas l'écart : il fait basculer au-dessus du seuil des plans déjà
proches. Sous 17 °C, le module verrouille le second créneau facile sur l'exposition au froid et
neutralise la bascule S13 (« ce créneau revient à la course quand l'épreuve est
course-dominante »). Ce que la mesure ne dit pas encore : quelle part revient au verrou lui-même
et quelle part au fait que ces épreuves sont déjà limites.

Le verrou est JUSTE dans son principe — l'hypothermie est un risque vital, la spécificité une
priorité 5. C'est sa PORTÉE qui n'a jamais été décidée : il s'applique à toutes les semaines,
de la première à la dernière. Or S7 demande une exposition *régulière* (1 à 2 séances par
semaine), pas la confiscation permanente d'un créneau : sur une prépa de 26 semaines, une
acclimatation faite en semaine 1 ne vaut rien le jour J (l'adaptation au froid se perd), et
c'est celle des dernières semaines qui compte.

Trois choses à trancher ensemble, pas séparément :
1. **à partir de quand** l'acclimatation entre dans le plan — une phase ? un nombre de semaines
   avant le jour J ? et sur la température de l'eau à la DATE de la course, pas celle saisie
   aujourd'hui ;
2. **combien de semaines** elle occupe le créneau, et si elle peut cohabiter avec la bascule S13
   au lieu de l'annuler ;
3. **ce que le plan DIT** — aujourd'hui il ne dit rien de cet arbitrage, alors que c'est le seul
   endroit du moteur où une règle de sécurité coûte de la spécificité en silence.

Tant que ce n'est pas tranché, le banc v7 exempte ces plans de `S-MIX` : l'instrument ne doit pas
punir une règle de sécurité (R16.10), mais l'exemption rend l'écart INVISIBLE au banc. C'est
exactement pourquoi cette entrée existe — **une exemption sans entrée de registre est un défaut
effacé.**

---

**FERMETURE (R20.8, 02/08/2026) — décision du fondateur : seulement les dernières semaines.**

L'adaptation au froid s'installe en quelques semaines d'exposition régulière et se PERD à
l'arrêt : celle de la semaine 1 d'une prépa de 26 semaines ne vaut rien le jour J, pendant
qu'elle coûte de la spécificité toutes les semaines. Le verrou démarre désormais à **8 semaines
du jour J** (`S7bis.acclimationWeeksBeforeRace`) ; avant, la bascule S13 reprend son droit.

Le calcul se fait en semaines RESTANTES, pas en phases : une prépa de 12 semaines et une de 40
n'ont pas les mêmes phases au même endroit, mais elles ont toutes les deux un « J-8 semaines ».
Sur une prépa plus courte que 8 semaines la condition est vraie partout — et c'est voulu, il n'y
a alors plus de marge à arbitrer.

8 semaines : au-dessus de la fenêtre d'installation décrite (2 à 6 semaines), avec la marge
d'une prépa réelle où l'on rate des séances. Le choix penche délibérément du côté long — c'est
une règle de sécurité, et une acclimatation trop courte coûte plus cher qu'une semaine de
spécificité en moins.

| | avant | après |
|---|---|---|
| profils sous le seuil de spécificité à 16 °C | **3 / 15** | **0 / 15** |
| séances d'acclimatation sur une prépa de 41 semaines | 51 | **10** |

**Et l'exemption du banc v7 ne masque presque plus rien** — c'était la vraie raison d'être de
cette entrée. Mesurée en la désactivant, elle cachait **26 profils** en R20.3 ; elle en cache
**1 à 4** aujourd'hui (N = 250 / 400 / 600), tous dans la fenêtre des 8 dernières semaines,
c'est-à-dire là où le verrou fait exactement son travail. L'exemption reste (l'instrument ne
doit pas punir une règle de sécurité — R16.10) et `S-MIX` garde son budget à 0.

```verify
id: O-15
quoi: l'acclimatation ne déplace plus la spécificité hors des dernières semaines
attendu: /eau 16C : 0\/15[\s\S]*eau 20C : 0\/15/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swimrun',format:'sprint',level:'inter',history:'confirme',intent:'competition',vol_max:'10',sessions_max:'7',dispo:'partielle',age:'30',sex:'H',weight:'79',pace:'4:50',pace_known:'oui',css:'1:45',css_known:'oui',vol_recent:'7',off_days:'non',shift_ok:'non',doubles:'oui',swim_total_m:'2600',run_total_km:'9.2',race_dplus_m:'250',segments_n:'10',longest_swim_m:'600',team_mode:'binome',team_swim_gap_sec:'5',openwater_access:'saisonnier',swim_continuous:'oui',run_continuous:'oui',gear_test:'non',race_date:'2027-05-09'};const part=(p)=>{let rn=0,sw=0;for(const w of p.weeks){if(w.isRecup||w.phase.id==='taper')continue;for(const d of w.days)for(const s of d.sessions||[]){if(s.d==='rs')continue;if(s.d==='br'){for(const st of s.steps||[])if(st.leg||st.d){const m=(st.reps||1)*(st.durationMin||0);if(st.d==='sw')sw+=m;else rn+=m;}}else if(s.d==='sw')sw+=s.min||0;else if(s.d==='rn')rn+=s.min||0;}}return rn/(rn+sw);};for(const t of ['16','20']){let n=0,tot=0;for(const inj of ['aucune','hanche','tibia','genou','dos'])for(const lv of ['debutant','inter','avance']){const a={...b,water_temp_c:t,injury:inj,level:lv};try{const o=E.swimrunObjective(a);const p=E.buildPlan('swimrun',a);tot++;if(part(p)<(1-o.swimTimeShare)-0.15)n++;}catch(e){}}console.log('eau '+t+'C : '+n+'/'+tot+' profils sous le seuil de specificite');}"
```

## §2 — Dette CHIFFRÉE et verrouillée (ne peut pas remonter)

Ces défauts sont connus, comptés, et un budget en CI les empêche d'empirer. Ils ne font pas
échouer la CI **par décision explicite**, pas par oubli.

### Banc v6 — 3 dettes (`npm run audit:v6` → « 55 vert · 3 dette connue · 0 régression »)

| id | ce qui reste | pourquoi c'est laissé |
|---|---|---|
| **D2** | 2 configurations sur 153 (`swim/sprint\|demifond/debutant/reprise`) portent encore une violation dure | Tout le plan tient entre 45 min et 1 h de nage par semaine, les 4 séances sont AU plancher (C15 : 850 m ; C20 : 0,42 h/séance) et l'écart semaine max ↔ pic est de 5 minutes. **Il n'y a plus de marge sous les planchers pour exprimer une hiérarchie.** Un rabotage a été tenté : sans effet, les planchers le reprennent immédiatement ; le code a été retiré plutôt que laissé inerte. |
| **D3** | 4 sauts de charge à **+11 %** au lieu de +10 % | Le rapport dev→peak de la courbe vaut 1,18, donc **supérieur à C22 par construction**. Sur un plan court à deux récups consécutives, C22 voudrait le pic ≤ 273 min quand la hiérarchie du plan le veut > 248 : les deux tiennent dans 25 minutes et les planchers de séance interdisent de descendre. Réduire encore ferait passer le pic SOUS une semaine de base — on échangerait une violation contre une pire. **La correction de fond est dans la FORME de la courbe, pas dans une passe de rattrapage.** |
| **F2** | 7 séances de qualité à ~42 % de temps en zone cible au lieu de 45 % | **Contradiction assumée entre deux règles.** Ces séances ont déjà leur échauffement et leur retour au calme à leur plancher (C13/C13b) ; atteindre 45 % demanderait exactement ce que C13c interdit (échauffer moins de 10 min avant un effort maximal). La priorité n°2 du manifeste (prévention des blessures) tranche. Le test reste en `expect:'fail'` **pour garder le chiffre sous les yeux**, pas parce qu'on l'a oublié. |

```verify
id: DETTE-v6
quoi: 3 dettes connues, 0 régression
attendu: /3 dette connue · ✖ 0 régression/
cmd: npm run audit:v6
```


### Banc v7 — budgets non nuls (`scripts/runAuditV7.mjs`, en ‰ de profils depuis R15.1)

> **R16.10** — les quatre budgets swimrun (`S-LONGSWIM` 53 ‰, `S-MIX` 60 ‰, `S-RUN-STARVED`
> 67 ‰, `S-PREREQ` 80 ‰) sont tombés à **12 / 12 / 12 / 0 ‰** après traitement de la dette :
> une correction moteur (S13) et une correction d'instrument (les checks de spécificité ne
> punissent plus les règles de sécurité). Résidu 5-8 ‰ vérifié sur N=250 / 400 / 600.

| check | budget | nature |
|---|---|---|
| `U-RACEDATE` | 80 ‰ | Course très lointaine : plafond de durée assumé + avertissement (R4.8b). Comportement voulu. |
| `U-DECL` | 13 ‰ | Lissage d'affûtage mesuré récups comprises (R4.8c). |
| `T-NIGHT` | 13 ‰ | Consigne de nuit portée en ATTRIBUT sur les séances survivantes (R4.7b) plutôt que par une séance dédiée. |
| `T-DPLUS-WK`, `T-POLES-ADV` | 13 ‰ chacun | Résiduels trail sur profils extrêmes. |
| `D-DISC` | 7 ‰ | Corrigé en R15.1 (couverture de discipline en semaine de course) — mesuré 0 à N=400. |
| `S-LONGSWIM` `S-MIX` `S-RUN-STARVED` `S-PREREQ` | ~~54 · 60 · 67 · 80 ‰~~ → **12 · 12 · 12 · 0 ‰** | ✅ **R16.10** : le module est expédié, les checks sont donc exercés, et les budgets sont à la taille du résidu réel (5-8 ‰, vérifié sur N=250 / 400 / 600) au lieu de trois à cinq fois au-dessus. |

> ⚠️ La ligne swimrun mérite d'être lue deux fois : ce sont 39 défauts budgétés sur du code
> **expédié dans `src/` mais absent du produit**. Ce n'est pas une dette du produit, c'est une
> dette du dépôt — et elle redeviendra une dette du produit le jour où swimrun rentrera en V1.

---

```verify
id: DETTE-v7
quoi: tous les checks dans leur budget (swimrun compris depuis R16.10)
attendu: /tous les checks dans leur budget/
cmd: npm run audit:v7
```

---


### D3 · C22 — 7 sauts de +11 à +17 % · 📊 **DIAGNOSTIQUÉ (R15.4) — deux causes, pas une**

Le handoff R15.4 proposait une cause et un correctif : *« C22 contraint les TRANSITIONS,
les ratios de phase contraignent les NIVEAUX ; deux spécifications indépendantes de la même
quantité »*, à résoudre en générant les niveaux par produit cumulé des incréments autorisés.
Avant de refaire la courbe, j'ai instrumenté le test D3 pour qu'il dise QUELLES configurations
sautent, et de combien — puis comparé, sur chacune, la courbe **DÉCLARÉE** (`w.vol`, ce que le
moteur promet) au **PRESCRIT** (somme des minutes réellement posées).

Les 7 sauts, tous entre semaines **consécutives** (aucun ne franchit une semaine de récup) :

| configuration | saut |
|---|---|
| tri/M (12 sem) S8→S9 puis S9→S10 | +11 % · +11 % |
| tri/70.3 (20 sem) S12→S13 | +12 % |
| swim/sprint (8 sem) S3→S4 | +17 % |
| swim/demifond (10 sem) S2→S3, S3→S4, S7→S8 | +13 % · +13 % · +11 % |

**Et la comparaison déclaré ↔ prescrit sépare les cas en deux familles.** Le test D3 le dit
désormais lui-même (`npm run audit:v6 -- --verbose`), sur son propre profil de référence :

| configuration | déclaré | prescrit | cause |
|---|---|---|---|
| tri/M S8→S9 | +6 % | +11 % | **discrétisation** |
| tri/M S9→S10 | +7 % | +11 % | **discrétisation** |
| tri/70.3 S12→S13 | +16 % | +12 % | **courbe** |
| swim/sprint S3→S4 | +18 % | +17 % | **courbe** |
| swim/demifond S2→S3 | +24 % | +13 % | **courbe** |
| swim/demifond S3→S4 | +5 % | +13 % | **discrétisation** |
| swim/demifond S7→S8 | +8 % | +11 % | **discrétisation** |

**4 discrétisation · 3 courbe.**

**Conséquence pour le correctif : la sortie proposée par le handoff ne fermerait que 3 des
7 sauts.** Générer les niveaux par produit cumulé rend la courbe DÉCLARÉE conforme par
construction — ça traite la seconde famille. Ça ne touche pas la première, où la courbe est
déjà conforme et où le dépassement vient de ce que la semaine ne peut pas se diviser plus fin :
sur 90 min hebdomadaires en natation, une séance à son plancher (C15 850 m / C24b 750 m) pèse
plus de 10 % de la semaine, donc toute recomposition casse mécaniquement le seuil.

**Le lot R15.4 se dédouble donc**, et c'est la mesure qui l'a dit, pas une intuition :
1. **forme de la courbe** — niveaux par produit cumulé des incréments autorisés, puis mise à
   l'échelle sur le pic. Le ratio dev→peak devient une conséquence de la longueur du plan.
2. **granularité** — décider ce que C22 signifie quand l'unité indivisible dépasse le seuil.
   Trois issues possibles, à trancher avec les chiffres : tolérer un plancher absolu en minutes
   sous un certain volume hebdo ; exempter explicitement les semaines dont la plus petite
   séance dépasse 10 % du total ; ou accepter que C22 ne s'applique qu'au déclaré. **Aucune ne
   doit être choisie sans mesurer combien de configurations chacune laisse passer.**

**Ordre ARBITRÉ (01/08/2026) : la granularité d'abord.** C'est une question de DÉFINITION, pas
de code — elle ferme 4 sauts sur 7 et ne touche aucun plan, donc aucune empreinte du golden ne
bouge. Les trois issues (plancher absolu en minutes sous un certain volume · exemption nommée
des semaines dont la plus petite séance dépasse 10 % du total · C22 ne s'applique qu'au
déclaré) doivent être MESURÉES l'une après l'autre — combien de configurations chacune laisse
passer — avant qu'aucune ne soit choisie. La refonte de la courbe vient ensuite, en lot isolé,
parce qu'elle re-hache les 900 empreintes et traverse les 20 gates.

Ni l'un ni l'autre n'est fait : ce sont deux chapitres ouverts, désormais correctement séparés.
`D2` (3/153 configurations avec ≥1 violation dure) et `F2` (8 séances à 40-43 % au lieu de
45 %) restent inchangés et doivent le rester quand ces lots seront pris.

```verify
id: D3
quoi: 7 sauts C22 encore présents, D2 et F2 inchangés
attendu: /3 dette connue/
cmd: npm run audit:v6
```

---

## §3 — Angles morts connus de la mesure

Ce ne sont pas des bugs : ce sont des endroits où **on ne saurait pas** qu'il y a un bug.

| # | angle mort | conséquence |
|---|---|---|
| ~~A-1~~ | ~~`audit:v7` tourne à N=150~~ | ✅ **Fermé (R15.1)** : N=400, budgets en taux, jour de course varié. |
| A-2 | Le golden master fige `vol_max` au profil de base sur presque toutes ses passes | Deux passes correctives ont déjà dû être ajoutées pour cette raison (« course datée » en N2, « volume et extrapolation » en R14). Le prochain paramètre figé produira le même angle mort. |
| A-3 | `R14.3-b` n'a **aucun critère automatique** | Personne ne saura si le dénivelé vélo est traité, sauf à relire le code. |
| A-4 | Le monolithe `Coach_Pro_V1.5.html` a le moteur à jour mais son **UI est gelée à R4** | Les régressions d'interface introduites depuis (les onglets — 5 puis 4 en R16.9 —, carte Trail, étape terrain) ne s'y voient pas. C'est documenté et voulu — mais un utilisateur qui ouvrirait ce fichier verrait un produit d'il y a plusieurs lots. |
| A-5 | **Aucune vérité terrain pour la projection R14/R14.1** — l'angle mort le plus profond du prédicteur | Les bandes `h`, `G_plafond`, `k_structure` sont des heuristiques que **rien ne valide**. On ne saura jamais qu'elles sont fausses tant que les projections ne seront pas confrontées aux résultats réels. *Premier geste, et il doit être fait MAINTENANT :* journaliser à chaque génération `{date, sport, format, horizon, refs mesurées, gainPct, gainBand, adhérence}` et, au passage du jour J, `{temps réel par leg}`. Sans cette ligne écrite aujourd'hui, la calibration sera impossible dans deux ans — les données n'existeront pas. |
| A-6 | **Dates absolues** dans le golden et les scripts (`RACE_PASS_DATES`, `scripts/trace.mjs`, profils `measured`) — ⚠ **partiellement fermé** : `audit_v7.cjs` est passé en dates RELATIVES (R15.1), le golden et `trace.mjs` restent en absolu | Un profil dont la course est « à 43 semaines » aujourd'hui sera à 30 semaines dans trois mois : le golden dérive tout seul, ou pire, **exerce silencieusement d'autres branches en gardant la même empreinte**. Le garde-fou d'échéance existe (`goldenMaster.mjs` prévient 8 semaines avant), mais il traite la panne, pas la dérive. Vérifier : `grep -rn "20[23][0-9]-[01][0-9]-[0-3][0-9]" scripts/ tests/` — toute date en dur est un futur A-2. |

---

## §4 — Entrées de registre devenues FAUSSES (trouvées en compilant ce fichier)

Elles décrivent des défauts **déjà corrigés** ; les laisser telles quelles fait croire à une dette
qui n'existe plus, ce qui est le symétrique exact d'un défaut caché.

| entrée | ce qu'elle affirme | ce qui est mesuré aujourd'hui |
|---|---|---|
| `R10_DEFECTS.md` **D10-9** (statut « ouvert ») | « Aucun garde-fou n'empêche la prochaine collision de noms dans le bundle : à ajouter » | **Corrigé.** `checkCollisions()` existe (`scripts/buildApp.mjs:94`, appelée l. 116) et fait échouer le build en nommant le doublon. |
| **question R15.5** — « le harnais distingue-t-il un `xfail` qui PASSE d'un échec attendu ? » | Risque soulevé : le jour où quelqu'un corrige F2, le test rougirait et la correction serait annulée comme une régression | **Déjà correct, vérifié.** `audit_v6.mjs:942` : un test `expect:'fail'` qui passe s'affiche `★` et porte la note « ← CORRIGÉ : passer expect à 'pass' ». Il compte comme VERT, pas comme échec. Aucun travail nécessaire. |
| `R10_DEFECTS.md` §C13e | « Reste 307 séances sous 10 min d'échauffement, toutes en trail… leur récupération n'est PAS chiffrée (7 % des blocs) » | **Corrigé** par le lot « la récupération devient une donnée » : sur 344 blocs à répétitions multiples mesurés (6 sports), **0 récupération non chiffrée**, et `F4` mesure **0 violation** du plancher de 10 min. |

```verify
id: §4-D10-9
quoi: le garde-fou de collision de noms existe — l'entrée D10-9 est bien périmée
attendu: /checkCollisions/
cmd: grep -n checkCollisions scripts/buildApp.mjs
```

```verify
id: §4-R15.5
quoi: le harnais v6 distingue un xfail QUI PASSE d'une régression
attendu: /CORRIGÉ : passer expect à 'pass'|expect === "fail"/
cmd: grep -n "CORRIGÉ : passer expect" audit_v6.mjs
```


*(Ces deux corrections de registre ne sont pas appliquées dans ce fichier : le registre est le
document historique du dépôt, il se corrige dans son propre commit avec la mesure à l'appui.)*

---

## §5 — Hors périmètre du moteur (ce ne sont PAS des bugs)

| # | sujet | nature |
|---|---|---|
| H-1 | `STRAVA_RELAY_DEFAULT = ""` dans `endurabuild/js/config.js` | **Déploiement humain, 15 min** : créer l'app Strava + déployer le worker (`server/README.md`). Le code est livré et testé ; il attend un secret. |
| H-2 | Notifications push app fermée | Demande un backend. Décision produit assumée : on n'annonce pas ce qu'on ne peut pas tenir. |
| H-3 | CONSEIL nutritionnel (par opposition aux ESTIMATIONS, livrées) | Bloqué sur avis diététicien. **Ligne à ne pas franchir**, manifeste. |
| H-4 | Candidature API MyFitnessPal | Démarche humaine. |
| ~~H-5~~ | ~~Swimrun hors V1~~ | ✅ **R16.10** : réintégré après traitement de la dette (78 % → 89 % de profils propres). Le drapeau `EB_SWIMRUN` n'existe plus. |

---

## Comment re-vérifier ce fichier

```bash
npm run registry:check     # exécute TOUS les blocs ```verify``` de ce fichier (R15.9)
npm run registry:check --strict   # + échoue si une entrée ne reproduit plus
```

Depuis R15.9, ce fichier **s'exécute**. Chaque entrée mesurable porte un bloc ```` ```verify ````
(`id`, `quoi`, `attendu` = motif attendu dans la sortie, `cmd`). `npm run registry:check` les
enchaîne et range chaque entrée en **reproduit** / **ne reproduit plus (→ §4)** / **commande
cassée**. Le §4 de ce document a été rempli à la main jusqu'ici, en compilant le fichier — il
devient un résultat automatique au lieu d'un heureux accident.

**Rappel de méthode, qui vaut pour toute reprise de cette liste :** mesurer d'abord, corriger
ensuite, re-mesurer, garder le vert. Un défaut dont on ne sait pas dire le chiffre AVANT n'est pas
prêt à être corrigé — c'est ce qui a fait tomber les vraies causes en R13, R14 et R14.1.
