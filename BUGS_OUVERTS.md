# Bugs constatés et NON corrigés

**État au 02/08/2026, chantier R20 terminé + N11** (22 gates verts, E2E 13/13, golden 900,
`audit:v7` à N=400, `registry:check` 15/15).

> **§1 — 17 entrées, 0 ouverte.** Le chantier R20 avait fermé les six dernières :
> `O-8` (footing swimrun sans bornes), `O-9` (banc d'invariants ni vert ni bloquant), `O-10`
> (`vol_max` inerte), `O-11` (deux allures course à vélo), `O-13` (rampe R10 inerte en
> natation), `O-15` (portée du verrou froid), plus `O-3` (le créneau de repli) et `O-14`
> (`swim_limit`).
>
> **Puis §1 a rouvert et refermé le jour même, et pas depuis un banc.** `O-16` — l'estimation
> énergétique journalière n'opposait aucune borne d'âge, alors que son équation est validée chez
> l'adulte — a été trouvée en **rédigeant le dossier de relecture diététique** : décrire ce que
> chaque règle calcule oblige à refaire ses calculs. Le même passage a corrigé `N11` (le repos
> des heures d'entraînement compté deux fois), et la correction d'`O-16` a elle-même débusqué un
> message de garde que l'UI n'affichait nulle part. Aucun des 22 gates ne regardait rien de tout
> cela.
>
> **Ce que ça confirme.** Un registre vide ne dit pas que le moteur est sans défaut : il dit
> que tout ce qu'on a MESURÉ est traité. Les six lots de R20 ont trouvé la moitié de leurs
> défauts en corrigeant les autres — et trois d'entre eux étaient des INSTRUMENTS qui
> mesuraient autre chose que ce qu'ils annonçaient (`audit:v1` sur le générateur mort, le banc
> R14 dépendant du jour de la semaine, `measure:fallback` suivant la déclaration au lieu du
> plan). La prochaine entrée est venue, comme annoncé, d'ailleurs que de ce fichier.

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

### O-3 · `D10-8` — le créneau facile de repli du trail · ✅ **FERMÉ (R20.9) — et la question posée n'était pas la bonne**

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

---

**FERMETURE (R20.9, 02/08/2026) — et la question de l'entrée n'était pas la bonne.**

L'entrée demandait « quel créneau sert de repli ». En regardant ce que chaque créneau PRODUIT,
le vrai défaut est apparu, et il est plus grave que le choix du slot :

**1. Le repli du trail n'était pas une séance de repli.** `facileR` produit « Marche rapide en
montée (bâtons) » — une sortie avec dénivelé et renfo excentrique. Quand un jour DUR est
déclassé (fatigue, anti-collage, drapeau médical), le remplacer par ça, c'est remplacer une
séance de charge par une autre séance de charge qui porte un nom rassurant. `facile2` produit
« Footing récup », qui est exactement ce qu'un jour déclassé doit devenir. Le trail bascule.

**2. N jours déclassés donnaient N séances IDENTIQUES.** Mesuré sous drapeau médical — le cas où
tous les jours durs tombent d'un coup, et où le plan doit être un plan de MAINTIEN :

| | avant | après |
|---|---|---|
| trail, semaine sous drapeau médical | **3 × « Marche rapide en montée »** | 2 × « Footing récup » + 2 × marche (35 min) |
| swimrun, idem | **4 × « Footing facile »** + 1 nage | 3 × footing + 2 × nage |

Sur le swimrun, dont la spécificité EST d'alterner nage et course, un plan de maintien livrait
quatre footings identiques. La passe de variété ne pouvait rien y faire : tous ces jours
portaient le MÊME créneau, elle n'avait pas d'autre séance à piocher. Le repli alterne désormais
entre les deux créneaux faciles du sport, le créneau déclaré passant en premier.

**3. L'instrument suivait la déclaration, pas le plan.** `measure:fallback` testait
`d.slot === easyFallbackSlot`. En basculant le trail de `facileR` à `facile2`, le taux affiché
est tombé de 25,0 % à **0,0 %** et la ligne de verdict allait fermer cette entrée sur ce chiffre.
Vérifié en comptant sur N'IMPORTE QUEL créneau facile : **25,0 % avant, 25,0 % après, 1 287 jours
dans les deux cas.** La fréquence n'avait pas bougé d'un jour — seule la séance produite avait
changé. Le détecteur regarde désormais ce que le plan fait.

C'est pourquoi cette entrée se ferme sur le CONTENU et non sur la fréquence : 25 % et 44 % de
plans qui passent par un repli ne sont pas un défaut en soi (un jour dur déclassé pour cause de
fatigue, c'est le moteur qui fait son travail). Le défaut était ce que ce repli produisait.

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
quoi: le banc d'invariants est VERT sur ses 22 invariants (le motif acceptait le vert ET le rouge tant qu'O-20 était ouvert — O-20 est fermé depuis I14b)
attendu: /✓ les 22 invariants tiennent/
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

### O-16 · L'estimation énergétique journalière n'opposait aucune borne d'âge · ✅ **FERMÉ (O-16)**

Trouvé en préparant le dossier de relecture diététique (H-3), en décrivant ce que chaque règle
calcule. `dailyEnergy()` repose sur **Mifflin-St Jeor 1990, validée chez l'ADULTE**, et sur le NAP
de la FAO. Ni l'une ni l'autre ne s'applique à un enfant ou à un adolescent en croissance. Le
moteur ne leur oppose pourtant aucune borne :

| âge déclaré (52 kg, 162 cm, F, 1 h d'entraînement) | ce que l'écran affiche |
|---|---|
| **12 ans** | **1 750–2 480 kcal** · protéines 60–90 g/j |
| 15 ans | 2 010–2 560 kcal · protéines 60–90 g/j |
| 35 ans | 1 890–2 400 kcal · protéines 60–90 g/j |

À 12 ans, l'âge sort même de la bande 14–90 de la table de référence : le moteur retombe sur
l'enveloppe 25–55 ans et produit un chiffre **hors du domaine de son équation, sans le dire**.
La garde IMC (15–45) ne voit rien ici — l'IMC de ce profil est parfaitement normal.

C'est le même angle mort que R15.7-C avait fermé côté FORMAT (un mineur ne peut plus générer un
plan Ironman) : la règle croisait âge et format, personne n'a rejoué le croisement sur l'écran de
nutrition, arrivé après.

**Tranché par le fondateur (02/08/2026), sans attendre la réponse du dossier** : la borne est à
**16 ans**, et elle coupe l'ESTIMATION JOURNALIÈRE (N8–N11 + macros) — **pas le ravitaillement
d'effort** (N1–N7). Un adolescent qui roule trois heures a besoin de savoir quoi boire ; il n'a
besoin d'aucun tableau calorique. Le sens de l'erreur tranche : ne rien afficher coûte moins
cher qu'un chiffre faux. Le refus est **motivé et nomme l'âge**, il reste réversible en une
constante si le professionnel répond autre chose (question 3 du dossier reste posée).

Refus seulement sur un âge **connu** et sous la borne : un âge absent n'est pas une preuve de
minorité, et couper dessus retirerait l'écran à des adultes qui n'ont pas rempli le champ.

**Trouvé en le corrigeant — le message d'orientation de la garde IMC n'a JAMAIS été affiché.**
`bmiGuardNotice` porte son texte depuis l'audit v6, et son commentaire dit « l'UI peut afficher
ce message à la place ». L'UI affichait le repli « Renseigne ton **poids** dans l'onglet
📋 Profil » dans les TROIS cas de refus — donc elle envoyait une personne hors bornes de
validation, et maintenant un mineur, corriger une donnée qui n'était pas en cause. Point unique
`energyRefusalNotice()` désormais, lu par la carte 🔥 (`EBV2.energyRefusal`). Un garde-fou dont
personne ne lit le motif est un garde-fou à moitié posé — même famille qu'O-9 (un banc dont
personne ne lit le rapport).

8 critères en CI (`demo:nutrition`), **vérifiés rouges** en abaissant la borne à 0.

```verify
id: O-16
quoi: l'estimation journalière est coupée sous 16 ans, et le ravitaillement d'effort ne l'est pas
attendu: /12 ans : aucune estimation[\s\S]*15 ans : aucune estimation[\s\S]*16 ans : [0-9][\s\S]*35 ans : [0-9][\s\S]*ravitaillement 12 ans : ok/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;for(const age of [12,15,16,35]){const r=E.dailyEnergy({weight:'52',height:'162',age:String(age),sex:'F'},[{d:'rn',min:60}]);console.log(age+' ans : '+(r?r.total.join('-')+' kcal':'aucune estimation'));}const a=E.sessionNutrition({d:'bk',name:'Sortie longue',det:'',min:180,long:true,steps:[{role:'body',durationMin:180,zone:'bk.z2'}]},{tempC:27,weightKg:52});console.log('ravitaillement 12 ans : '+(a&&a.during.drinkMlPerH[1]>0&&a.after?'ok':'COUPE'));"
```

### O-17 · La rampe protège du volume passé, pas de l'écart capacité / tissu · ✅ **FERMÉ — par un avertissement, pas par une contrainte**

Trouvé sur un cas réel rapporté par le fondateur : **ancien sportif de haut niveau** (sélection
nationale junior), **5 ans sans sport**, première course à **5'30/km sur 13 min, terminée à
185 BPM**. Puis **46'30 au 10 km en 8 semaines**.

Ce profil n'est ni un débutant ni un entraîné : c'est un **moteur musculaire et neuromusculaire
largement conservé, posé sur un système aérobie à zéro et sur des tissus conjonctifs qui n'ont
rien encaissé depuis cinq ans**. C'est le patron de blessure classique de la reprise chez
l'ancien athlète : la capacité à pousser dépasse de loin ce que le tendon, l'aponévrose et l'os
tolèrent.

**Mesuré** — deux profils déclarant tous deux `vol_recent = 0`, même format, même volume max :

| | semaine 1 | allure du créneau facile | allure de la séance de SEUIL |
|---|---|---|---|
| ancien sportif, seuil 5'45/km | 4 séances · **118 min** | 6'40-7'15/km | **5'45-6'02/km** |
| vrai débutant, seuil 7'00/km | 4 séances · **118 min** | 7'00-7'21/km | 7'00-7'21/km |

**Le volume est identique — c'est défendable, la rampe R10 lit le volume récent et il est nul
dans les deux cas.** Ce qui ne l'est peut-être pas, c'est que **l'intensité, elle, suit la
capacité mesurée sans rien savoir de l'historique de CHARGE**. L'ancien sportif court son seuil
1'15/km plus vite que le débutant, sur des tissus tout aussi naïfs — et surtout, il en est
physiquement capable, donc rien ne l'arrête.

**Pourquoi ce n'est pas traité d'office.** Trois raisons, toutes bonnes :

1. C'est un changement CÔTÉ PLAN : il toucherait le golden, les 22 gates et la promesse de
   volume. Rien à voir avec le diagnostic `feasibility.ts`, qui ne construit rien.
2. La correction n'est pas évidente. Brider l'intensité d'un athlète capable est aussi un
   risque — celui de lui donner un plan qui ne le fait pas progresser, et qu'il quittera pour
   s'entraîner seul, sans garde-fou du tout. Le manifeste place la régularité en priorité 3.
3. `history = "ancien"` existe déjà dans le schéma, et **R14.1 l'a délibérément dépouillé** de
   son pouvoir sur les chiffres (« un adjectif auto-déclaré ne pilote aucun chiffre »). Y
   revenir demanderait un déclencheur MESURÉ, pas l'adjectif — par exemple l'écart entre la
   capacité mesurée et l'historique de volume, qui sont deux champs déjà collectés.

**Tranché par le fondateur (02/08/2026), et la décision dépasse ce cas** :

> « Notre rôle est d'informer au mieux et de laisser l'athlète choisir entre son besoin de
> résultats ou de sécurité. Le but n'est jamais de bloquer mais d'accompagner au mieux, **sauf
> si réelle mise en danger**. »

C'est l'option (c) : un **avertissement nommé**, canal 2 de R11.2, et **aucune contrainte**. Le
plan n'est pas bridé d'une minute.

La seconde moitié de la phrase compte autant que la première : les garde-fous DURS existants
relèvent tous de la « réelle mise en danger » et ne bougent pas — drapeau médical, drapeau
douleur, mineur × format (R15.7-C), garde IMC, borne d'âge de l'estimation énergétique (O-16),
course trop proche (R11.4). Ce cas-ci n'en est pas : c'est un risque réel et assumable, et
brider un athlète capable a son propre coût — celui du plan qu'il quitte pour s'entraîner seul,
sans aucun garde-fou. La régularité est priorité 3.

**Le déclencheur est MESURÉ, et il ne pose aucune constante nouvelle.** `history = "ancien"`
existe mais R14.1 l'a délibérément dépouillé de tout pouvoir sur les chiffres. On croise donc
deux mesures déjà collectées — volume récent ≤ 2 h/sem (R10, obligatoire) et une référence
saisie — et le seuil de « capacité réelle » est **la bande de marge du modèle de projection lue
à l'envers** : `margeOf` rend 1,0 à quelqu'un assis sur l'ancre la plus lente de sa discipline,
donc être plus rapide que cette ancre, c'est avoir une capacité au-dessus du repère débutant, par
définition. On hérite gratuitement du décalage par sexe et par âge (R14.1).

**Mesuré après correction** — l'avertissement se déclenche là où il faut et nulle part ailleurs :

| profil | avertissement |
|---|---|
| seuil 5'45/km · 0 h/sem | **oui** |
| seuil 7'00/km · 0 h/sem (vrai débutant) | non |
| seuil 5'45/km · 5 h/sem (régulier) | non |
| seuil 6'30/km · 1 h/sem (reprise douce) | non |

**Golden : 15 profils sur 900 changent, et le SEUL champ qui diffère est `_v2.warnings`** — pas
une séance, pas une minute. C'est la preuve exécutable que l'avertissement n'est pas un blocage
déguisé. Garde `O17` au banc v6, qui assertе les deux moitiés : le message existe, ET le plan ne
rétrécit pas.

Débusqué en écrivant la garde : ma première assertion exigeait l'ÉGALITÉ des volumes entre le
profil capable et le témoin. Elle était fausse — 107 min contre 92 — parce que les bornes de
séance se calculent depuis l'allure. Le risque à garder n'est pas « le plan change », c'est
« le plan RÉTRÉCIT ».

```verify
id: O-17
quoi: la capacité qui dépasse l'historique de charge est-elle SIGNALÉE, sans brider le plan
attendu: /capable : AVERTI[\s\S]*debutant : non[\s\S]*regulier : non[\s\S]*bride : non/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={format:'10k',level:'inter',intent:'competition',vol_max:'6',sessions_max:'4',dispo:'partielle',age:'28',sex:'H',weight:'80',height:'182',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'non',sleep:'moyen',life_load:'normale',activity:'actif',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',pace_known:'oui'};const P=(pace,vr)=>E.buildPlan('run',{...b,pace,vol_recent:vr});const A=(p)=>((p._v2&&p._v2.warnings)||[]).some(w=>/tendons/i.test(w));const M=(p)=>p.weeks[0].days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.d!=='rs'?(s.min||0):0),0),0);const cap=P('5:45','0'),tem=P('7:00','0');console.log('capable : '+(A(cap)?'AVERTI':'non'));console.log('debutant : '+(A(tem)?'AVERTI':'non'));console.log('regulier : '+(A(P('5:45','5'))?'AVERTI':'non'));console.log('bride : '+(M(cap)<M(tem)?'OUI':'non'));"
```

### O-18 · Le diagnostic RV ne connaît qu'un sport, et sa table de marge sature là où il sert le plus · ⏳ **OUVERT — limites déclarées, pas défauts cachés**

Le raisonnement inverse (`src/engine/feasibility.ts`, carte « 🎯 Ton chrono visé ») est livré avec
**deux limites nommées**. Les écrire ici, c'est la différence entre une portée assumée et un
angle mort.

**(1) Course à pied seulement.** L'inversion de Riegel ne s'applique ni au trail (le module dit
lui-même que Riegel y est inapplicable, T-8) ni aux épreuves à enchaînements, dont le temps se
décompose par poste. Sur les six autres sports, `EBV2.feasibility` rend `null` : aucune carte,
aucun verdict prudent. C'est la bonne réponse aujourd'hui — une carte absente se comprend, un
verdict tiède se croit — mais l'athlète de trail qui vise une barrière horaire pose exactement la
même question, et le module trail porte déjà son prédicteur. La suite naturelle est un verdict
trail bâti sur `trailModel`, pas sur Riegel.

**(2) `ANCRES_PACE` sature à 6'00/km.** Mesuré en construisant P11 : un coureur à 7'00/km et un
coureur à 6'30/km reçoivent la MÊME marge (`margeOf` rend 1,0 au-delà de l'ancre la plus lente),
donc **la même projection à volume égal** — 23,5 % dans les deux cas. C'est précisément la zone
où vivent les débutants, c'est-à-dire la population que le régime P11 vient de rendre
distinguable. Le régime discrimine sur le VOLUME et non sur l'allure ; la table de marge, elle,
ne discrimine plus du tout en dessous de 6'00. Conséquence côté RV : deux athlètes de niveaux
réellement différents peuvent recevoir le même verdict.

Ce n'est pas une régression — la table est ainsi depuis R14.1, et son commentaire assume ses
bandes comme des heuristiques. Ce qui est nouveau, c'est qu'on SAIT maintenant que la saturation
tombe au mauvais endroit. Étendre les ancres vers 8'00-9'00/km demande des références, pas une
intuition : c'est la même exigence qui a fait retirer ma première calibration de P11.

```verify
id: O-18
quoi: la saturation de la table de marge sous 6'00/km, et l'absence de verdict hors course
attendu: /7:00 = 6:30 : OUI[\s\S]*hors course : null/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const iso=(d)=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);const b={format:'10k',level:'debutant',history:'reprise',intent:'competition',vol_max:'6',vol_recent:'0',sessions_max:'4',dispo:'quotidienne',age:'30',sex:'H',weight:'78',height:'180',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'non',sleep:'moyen',life_load:'normale',activity:'actif',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',pace_known:'oui',race_date:iso(112)};const g=(pace)=>{const a={...b,pace};return E.predict('run',a,E.buildPlan('run',a)).projected.gainPct.thrPace;};console.log('7:00 = 6:30 : '+(Math.abs(g('7:00')-g('6:30'))<1e-9?'OUI':'non'));console.log('hors course : '+E.feasibility('swim',{...b,target_time:'30:00'},null));"
```

### O-19 · L'affûtage coupe la FRÉQUENCE, que sa propre source dit de maintenir · ⏳ **OUVERT — partiellement traité (C29)**

Trouvé en relisant des plans comme un entraîneur, pas comme un auditeur. `ARCHITECTURE.md` cite
**Bosquet 2007** pour le +1,96 % d'affûtage. Cette méta-analyse — et Mujika — décrivent l'affûtage
par **trois bras** : volume −41/−60 %, **intensité maintenue**, **fréquence maintenue à ≥ 80 %**.
Seul le premier est vérifié (R3.13). Personne ne regarde le troisième.

**Mesuré : fréquence médiane 75 % du pic, 61 profils sur 90 (68 %) sous le seuil de 80 %.**

CHIFFRE CORRIGÉ, ET LA CORRECTION VAUT D'ÊTRE ÉCRITE. La première publication annonçait « 94 sur
180, soit 52 % » — mon instrument datait la course à `aujourd'hui + 140 jours`, donc le JOUR DE
LA SEMAINE dérivait d'une exécution à l'autre. En franchissant minuit UTC, la course est passée
du dimanche au lundi : la dernière semaine est tombée à UN jour (N2), sa fréquence à 0, et la
population mesurée a changé sous la mesure. La date est ancrée sur un dimanche désormais, et la
semaine de course est exclue — elle contient la course, elle n'a pas de fréquence
d'entraînement à mesurer (R13.4). Même famille que R20.7, dans mon propre outillage.

**Corollaire, sur les formats où la sortie longue EST la spécificité** : elle est explicitement
exclue des victimes de la décroissance, donc elle survit pendant que tout le reste disparaît.

| profil | séance longue affûtage/pic | semaine affûtage/pic |
|---|---|---|
| run/marathon | **79 %** (142' / 180') | 46 % |
| run/semi | 70 % | 46 % |
| bike/cyclo | 65 % | 55 % |

Un marathonien recevait donc : lundi OFF, mardi OFF, mercredi OFF, jeudi 48', vendredi OFF,
**samedi 141'**, dimanche 47'. Quatre jours de repos et 2 h 21 de sortie longue huit jours avant
sa course. Ce n'est pas un affûtage, c'est une semaine de repos avec une sortie longue posée
dessus. La cible de volume est tenue ; c'est la MONNAIE qui est fausse.

**DÉCISION DU FONDATEUR (03/08/2026) : des jours plus COURTS, tous gardés.** R3.13 (l'affûtage
pèse au plus 60 % du pic) n'est pas négociée ; c'est la MONNAIE de la réduction qui change.

**C29** — la décroissance réduit au lieu de supprimer sous le plancher de fréquence.
**C29b** — en affûtage, une nage sous le plancher de séance n'est plus SUPPRIMÉE : le plancher
(« sous X mètres, ça ne vaut pas le déplacement ») est une règle de semaine de CHARGE, alors
qu'en affûtage une nage courte EST l'objectif. Trois blocs de suppression identiques traités
d'un coup. Nageur débutant : **33 % → 67 %**.
**C29c** — l'affûtage REND les jours qu'il a pris pour rien. Les deux passes de retrait ont
raison au moment où elles s'exécutent, mais les passes suivantes réduisent encore : mesuré sur
un semi, semaine d'affûtage livrée à **46 % du pic pour un plafond de 60 %, avec deux jours
coupés**. 76 des 95 jours perdus portaient le nom de cette coupe. La réparation se fait au POINT
FIXE (même forme que C28) et elle est **neutre en volume** : on redonne des jours, les minutes
viennent des séances déjà là. Elle porte son propre filet — la semaine est vérifiée après
rééquilibrage et la restitution se RÉTRACTE si R3.13 ne tient pas (première écriture : 35
combinaisons sur 459 au-dessus du plafond).

**Résultat : 68 % → 30 % des profils sous 80 %, médiane 75 % → 83 %.** La sortie longue baisse
avec (semi : 91' → 81').

**CE QUI RESTE : 3 profils sur 12 (25 %), moyenne 80 %.** Ce sont ceux où le rééquilibrage ne
peut pas se payer sans franchir R3.13, et la rétractation joue. Fermer complètement demanderait
de descendre les planchers de step en affûtage — un autre arbitrage.

**ET LA COMMANDE DE VÉRIFICATION, ELLE, MENTAIT — TROISIÈME INSTRUMENT DE CETTE ENTRÉE.**
La prose ci-dessus annonce depuis R20.7 que « la semaine de course est exclue » et que « la date
est ancrée sur un dimanche ». **La commande ne faisait ni l'un ni l'autre** : elle datait la
course à `aujourd'hui + 140 jours` et prenait le MINIMUM sur toutes les semaines d'affûtage, y
compris le moignon d'un jour qui porte la course et n'a, par conception (R13.4), aucun jour
d'entraînement. Elle renvoyait donc **12/12**, contre 30 % annoncés. Balayée sur les sept jours de
la semaine, à moteur inchangé :

| jour de la course | lun | mar | mer | jeu | ven | sam | dim |
|---|---|---|---|---|---|---|---|
| sous 80 % | 12/12 | 12/12 | 12/12 | 12/12 | 5/12 | 2/12 | 2/12 |
| moyenne | **0 %** | **0 %** | 41 % | 61 % | 77 % | 82 % | 82 % |

C'est exactement ce que R20.6 a retiré du banc d'invariants (I6/I8/I12 : « la course objectif
n'est pas une séance d'entraînement »), jamais rejoué sur cette mesure-ci.

**Deux corrections d'instrument, et la première était insuffisante.** Exclure « la semaine qui
porte la course » est trop grossier : sur un 10 km, l'unique semaine d'affûtage EST la semaine de
course, elle fait sept jours et se termine par l'épreuve — l'exclure supprimait trois profils
légitimes. Normaliser par jour DISPONIBLE ne suffit pas non plus (un moignon de deux jours dont le
seul jour libre est un repos donne 0 %). Bosquet compte des séances **par semaine** : une semaine
de un ou deux jours n'en est pas une. La mesure DÉCLARE donc son domaine — **au moins 5 jours
disponibles** — et la date est **ancrée au lundi courant, en semaines entières** (recette R20.7).
Vérifiée identique les sept jours : **3/12, moyenne 80 %**.

**Mise à jour du 04/08/2026 — C30 a fait baisser ce chiffre sans le viser : 3/12 → 2/12.** La
sortie longue d'un coureur lent est plus longue au pic ET en affûtage (le plancher de spécificité
progresse avec la phase, il ne s'éteint pas à l'affûtage), donc le rapport affûtage/pic monte.
C'est une bonne nouvelle et un rappel : ce compteur mesure un RAPPORT, il bouge quand l'un ou
l'autre de ses deux termes bouge. Le reste d'O-19 est inchangé — la cause n'est pas traitée.

```verify
id: O-19
quoi: la fréquence d'affûtage face au plancher de 80 % que Bosquet/Mujika déclarent
attendu: /sous 80 % : 2\/12/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const lun=new Date();lun.setUTCDate(lun.getUTCDate()-((lun.getUTCDay()+6)%7));const c=new Date(lun);c.setUTCDate(c.getUTCDate()+20*7-1);const iso=c.toISOString().slice(0,10);const B={intent:'competition',dispo:'quotidienne',shift_ok:'non',doubles:'non',off_days:'non',sex:'H',sleep:'moyen',life_load:'normale',activity:'actif',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',weight_lever:'non',age:'35',weight:'75',height:'178'};const R={run:{pace_known:'oui',pace:'4:40',terrain:'plat'},bike:{ftp_known:'oui',ftp:'240',terrain:'plat'}};const F={run:['10k','semi','marathon'],bike:['cyclo']};const nb=(w)=>w.days.filter(d=>d.sessions.some(s=>s.d!=='rs'&&(s.min||0)>0&&!s.race)).length;const dispo=(w)=>w.days.filter(d=>!d.sessions.some(s=>s.race)).length;let n=0,sous=0;for(const sp of Object.keys(F))for(const f of F[sp])for(const lv of ['debutant','inter','avance']){let p;try{p=E.buildPlan(sp,Object.assign({},B,{level:lv,history:lv==='debutant'?'reprise':'confirme',format:f,vol_max:'10',vol_recent:'6',sessions_max:'6',race_date:iso},R[sp]));}catch(e){continue;}const pk=p.weeks.filter(w=>w.phase.id==='peak'&&!w.isRecup&&dispo(w)>=5);const tp=p.weeks.filter(w=>w.phase.id==='taper'&&dispo(w)>=5);if(!pk.length||!tp.length)continue;const np=Math.max(...pk.map(nb));if(!np)continue;n++;if(Math.min(...tp.map(nb))/np<0.8)sous++;}console.log('profils : '+n);console.log('sous 80 % : '+sous+'/'+n);"
```

### O-20 · En trail, un DÉBUTANT reçoit un pic plus lourd qu'un INTER — et le banc ne le voit qu'un jour sur deux · ✅ **FERMÉ (I14b, 03/08/2026)**

> **RÉSOLU — la cause est `enforceLabelVsDose`, et le débutant y échappe à cause d'un plafond de
> SÉCURITÉ.** Cinquième hypothèse, et la bonne : mesurée pas à pas, la semaine de l'inter SORT de
> la boucle R3.3 à **603 min pour une cible de 600** — la courbe et le remplissage n'ont jamais
> été en cause. C'est I14 (« la sortie longue est la plus longue de sa semaine ») qui ramène
> ensuite « Descente en charge » de **210 à 159 min**, et **plus aucune passe ne rend ces 51
> minutes**. Le débutant y échappe parce que le plafond que I14 impose aux autres séances EST la
> durée livrée de sa sortie longue : la sienne est épinglée à 180 min par **C23**, celle de
> l'inter s'arrête librement à 167. Le débutant hérite du plafond le PLUS HAUT, ne se fait rien
> retirer, et passe devant — un plafond de sécurité qui augmente la charge de celui qu'il protège.
>
> La forme est connue **dans l'autre sens** : ce dépôt a payé onze fois « une garantie vérifiée au
> milieu du pipeline ne vérifie que l'avant-dernier état », et y a toujours répondu en REJOUANT la
> garantie au point fixe. Ici c'est le miroir — une garantie de SÉANCE retire des minutes après la
> boucle de volume, et c'est la BOUCLE qui n'est jamais rejouée.
>
> **`I14b`** rend ce que le plafond a pris, aux séances FACILES et à elles seules (R4.1), sans
> jamais dépasser la sortie longue (×0,80 : R20.3 — une facile ne rivalise pas avec la pivot), ni
> la courbe déclarée, ni le pic livré. Mesuré : **13 échecs sur 114 combinaisons → 0**, balayé sur
> 6 sports × 21 horizons — donc traité SYSTÉMIQUEMENT, pas au seul point d'échantillonnage.
> Le pic de l'inter passe de 547 à 596 min ; celui du débutant ne bouge pas (575).
>
> **Deux erreurs à moi, gardées écrites.** (1) Ma première écriture était **inerte** : j'ai filtré
> les blocs receveurs sur `!st.gradient` en pensant « sans pente », alors que `flat` EST une valeur
> de `gradient` — j'excluais donc le footing PLAT, précisément le bloc que R4.1 désigne. Receveuses
> vides sur les 41 semaines. `EN_PENTE()` est désormais la seule définition (R11.1). (2) Ma
> deuxième écriture remplissait fidèlement une courbe qui DÉCROÎT sur certains profils et
> amplifiait l'inversion ; la borne « dev ≤ pic » — qui existait déjà, mais n'était vérifiée
> qu'APRÈS, par la boucle de réparation — est lue au moment où la passe agit. Elle mord 10 fois
> sur 702 profils (vérifié non inerte).
>
> **Ce que la fermeture a fait remonter : voir O-21.**

*(Diagnostic d'origine conservé ci-dessous — les quatre hypothèses réfutées sont ce qui a empêché
la cinquième d'être tentée deux fois.)*

Trouvé en passant les gates après le lot O-19. `audit:invariants` **I13** (« monotonie du niveau :
plus l'athlète est fort, plus la charge est élevée ») est **rouge**, et il l'était déjà avant ce
lot — vérifié en le rejouant contre le moteur committé.

**Mesuré** (profil du banc, `history: confirme` fixe, seul `level` varie, `vol_max: 10`) :

| niveau | pic livré (min) | D+ de cette semaine | cible de la courbe |
|---|---|---|---|
| débutant | **575** | **1 130 m** | 9,6 h = 576 min |
| inter | 547 | 860 m | 10,2 h = 612 min |
| avancé | 547 | 860 m | 10,2 h = 612 min |

**Le défaut est réel, et sur LES DEUX AXES.** Ma première hypothèse était que le débutant reçoit
plus de MINUTES parce que ses séances sont moins denses en dénivelé — le module trail dit
lui-même que la charge se mesure en temps, D+ et D− (R7 TRAIL), donc « plus de minutes » n'aurait
pas suffi à conclure. Mesuré : le débutant reçoit **aussi plus de D+** (1 130 contre 860 dans la
semaine de pic, 1 320 contre 980 sur le plan). Hypothèse réfutée, l'invariant a raison.

**LA COURBE EST BONNE, C'EST LA LIVRAISON QUI NE SUIT PAS.** Le pic DÉCLARÉ est correctement
ordonné (débutant 9,6 h < inter 10,2 h). Le débutant livre exactement sa cible (575 pour 576) ;
**l'inter est 53 minutes en dessous de la sienne** (547 pour 612). Ce n'est donc pas le débutant
qui est sur-servi, c'est l'inter qui n'arrive pas à remplir sa courbe.

**L'ÉCART SE CONCENTRE SUR LA SORTIE LONGUE, ET IL RESTE DE LA PLACE.**

| | débutant | inter |
|---|---|---|
| Longue trail | **180'** (borne : cap 180, `hard: true`) | 167' (borne : cap **312**, `hard: false`) |
| Montées | 78' (12'×3) | 97' (12'×4) |
| Footing plat | 79' | 55' |
| Descente en charge | 130' | 159' |
| Back-to-back | 108' | 69' |

La longue du débutant est **exactement sur son plafond C23** (180) ; celle de l'inter s'arrête à
167 avec **145 minutes de marge inutilisée**. Le surplus du débutant se redistribue sur le
footing plat et le back-to-back, qui l'absorbent ; chez l'inter, la mise à l'échelle s'arrête
sans avoir utilisé la marge disponible. C'est là qu'il faut chercher — pas dans les plafonds,
qui sont corrects, mais dans la passe qui remplit la semaine.

**ET LE DERNIER MORCEAU : `level` N'AGIT PAS SUR LA COURBE TRAIL.** Charge des dix premières
semaines, débutant et inter, même profil :

```
D+ : 770 770 740 600 730 700 710 600 730 730   ← IDENTIQUE aux deux niveaux
D- : 860 860 910   0 1000 1090 1140   0 1180 1220   ← IDENTIQUE aux deux niveaux
```

Les deux plans sont **rigoureusement identiques jusqu'à la semaine ~36**. Le niveau ne diverge
qu'au bloc de pic. Le seul endroit où `level` mord vraiment en trail est **C23** — le plafond de
sortie longue du débutant (180 min).

**Et ce plafond se REMBOURSE ailleurs.** Le surplus que C23 retire de la longue est redistribué
sur le footing plat (79' contre 55') et le back-to-back (108' contre 69'), si bien que la semaine
du débutant finit **au-dessus** de celle de l'inter — sur les minutes ET sur le D+. Un plafond de
sécurité qui se rembourse sur les autres séances n'est pas un plafond : c'est un déplacement.
Même famille que R15.7-A (le plancher posait des séances que la décroissance retirait juste
après) ou C28 (le plafond d'approche appliqué avant le plancher qui le défaisait).

**L'ISSUE 1 A ÉTÉ CHOISIE, IMPLÉMENTÉE — ET RÉFUTÉE PAR LA MESURE.**

Décision du fondateur (03/08/2026) : « le plafond ne se rembourse pas ». Implémenté (`C23b`) :
`blockBounds` remonte le drapeau `hard`, `scaleBlock` COMPTE les minutes qu'une borne dure
refuse, et la boucle R3.3 abaisse sa cible d'autant — les minutes retirées par un plafond du
manifeste ne repartent plus dans les autres séances.

**Mesuré : zéro refus.** Le compteur n'a été alimenté sur AUCUNE semaine, et le golden n'a
bougé sur aucun des 900 profils. Le plafond dur ne mord jamais pendant la mise à l'échelle : la
longue du débutant atteint 180 par un autre chemin (la passe D7, qui coupe APRÈS), et il n'y a
donc aucun remboursement à empêcher. **Le correctif est inerte, il a été retiré** — expédier du
code qui ne change rien est précisément ce que ce dépôt refuse.

**Quatrième hypothèse réfutée sur cette entrée**, après T1, T2b et « le débutant a des séances
moins pentues ». Ce que chaque réfutation a coûté est écrit ici exprès : c'est ce qui empêche la
cinquième d'être tentée deux fois.

**CE QUE LA MESURE DIT MAINTENANT.** Le déséquilibre ne vient pas d'un plafond qui déborde mais
de la COMPOSITION des semaines :

| | débutant | inter |
|---|---|---|
| Montées (qualité, `repCap`) | 78' | 97' |
| Footing plat (facile) | **79'** | 55' |
| Back-to-back (facile) | **108'** | 69' |
| total | **575'** | 547' |

La semaine de l'inter est dominée par des blocs de QUALITÉ, plafonnés en répétitions (R4.1) ;
celle du débutant par des blocs FACILES, qui peuvent absorber du volume (`repMax` 15). Quand
R3.3 vise 600 min, les blocs de qualité de l'inter refusent — et R4.1 dit que « le déversement
doit aller vers les séances FACILES ». **Il n'y va pas** : le footing plat de l'inter reste à
55' quand celui du débutant monte à 79'. C'est là qu'il faut chercher la prochaine fois : ce
qui empêche les séances faciles de l'inter d'absorber ce que sa qualité refuse.

**L'ARBITRAGE INITIAL, gardé pour mémoire.** Deux issues étaient envisagées :

1. **Le plafond ne se rembourse pas** — quand C23 coupe la longue d'un débutant, la semaine reste
   plus légère d'autant. C'est la lecture stricte de la priorité n°2 (prévention) : si on juge
   qu'un débutant ne doit pas dépasser 3 h de sortie longue, lui rendre ces minutes en dénivelé
   ailleurs annule la décision. Effet de bord : le débutant reçoit un volume total plus bas que
   ce que sa courbe annonce — il faudra que la courbe le dise (R20.2).
2. **La courbe de l'inter devient atteignable** — le pic déclaré 10,2 h n'est pas livrable
   (547 min pour 612), et c'est ce trou qui laisse le débutant passer devant. Rendre la courbe
   honnête (annoncer ce qui est livrable) ne suffirait PAS : l'inter livrerait 9,1 h contre 9,6
   au débutant, et I13 resterait rouge. Il faudrait donc DÉBLOQUER ce qui plafonne l'inter — et
   ce n'est ni T1 (indexé sur `history`, jamais atteint : 860 pour un plafond à 3 000) ni T2b
   (mesuré, il clampe mais pas au pic).

**Recommandation : l'issue 1.** Elle est plus courte, elle va dans le sens de la sécurité, et
elle corrige la cause plutôt que le symptôme. L'issue 2 demande de comprendre pourquoi la mise à
l'échelle laisse 145 min de marge inutilisée sur la longue de l'inter — un chantier à part.

**LE BANC BASCULE AVEC LE CALENDRIER, ET C'EST LA SECONDE MOITIÉ.** `BASE.race_date` est
figée au 2027-06-13, mais la LONGUEUR du plan se compte depuis aujourd'hui : l'horizon raccourcit
d'une semaine tous les sept jours, et l'allocation de phases bascule avec lui. La CI est **verte
sur le dernier commit** (exécutée le 02/08) et le même code est **rouge en local** le 03/08.

Balayé sur 21 horizons (12 à 52 semaines) × 6 sports : **13 échecs sur 114 combinaisons, TOUS en
trail.** Le défaut est donc réel et systémique côté trail ; c'est l'échantillonnage à un seul
horizon qui le rend intermittent.

**Quatrième instrument de ce dépôt à dépendre de la date**, après le banc R14 (R20.7), mon
balayage de fréquence de C29 et l'assertion « le pourquoi est visible » de `smoke-r4` (qui
supposait que le jour courant portait une séance — un jour sur trois est un jour de repos). Les
deux derniers sont corrigés ; celui-ci demande de traiter le défaut trail AVANT de rendre le
banc déterministe, sinon on fige la dette au lieu de la traiter (leçon R20.6).

```verify
id: O-20
quoi: la monotonie du niveau en trail, balayée sur tous les horizons plutôt qu'un seul
attendu: /trail : 0 horizons? non monotones?/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const B={intent:'competition',history:'confirme',injury:'aucune',dispo:'partielle',doubles:'parfois',off_days:'non',sleep:'moyen',life_load:'normale',age:'38',weight:'79',sex:'H',weight_lever:'non',sessions_max:'7',vol_max:'10',vol_recent:'5',race_distance_km:'45',race_dplus_m:'2200',race_technicity:'mixte',race_night:'non',train_dplus_access:'collines',poles:'oui',vam_known:'non',pace_known:'oui',pace:'4:50'};const mx=(p)=>Math.max(...p.weeks.map(w=>w.days.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.race?0:s.min||0),0),0)));let ko=0;for(let sem=12;sem<=52;sem+=2){const rd=new Date(Date.now()+sem*7*864e5).toISOString().slice(0,10);let v=[];try{for(const lv of ['debutant','inter','avance'])v.push(mx(E.buildPlan('trail',Object.assign({},B,{level:lv,race_date:rd}))));}catch(e){continue;}if(!(v[0]<=v[1]&&v[1]<=v[2]))ko++;}console.log('trail : '+ko+' horizons non monotones');"
```


### O-21 · À capacité déclarée plus HAUTE, le plan est plus PETIT — l'inversion sur l'axe allure · 🟡 **MÉCANISME CORRIGÉ (03/08/2026), RÉSIDU = UN ARBITRAGE**

> **CE QUI EST CORRIGÉ, ET MA PISTE DU MATIN ÉTAIT FAUSSE.** J'avais écrit « la courbe déclarée
> décroît (base au-dessus du pic) ». Mesuré : elle ne décroît pas. **La seule semaine de PIC de
> ces plans est une semaine de RÉCUPÉRATION** (102 min) pendant que les semaines de dev montent à
> 162. Or l'auditeur exclut — à juste titre — les semaines de décharge de ses candidats : le pic
> ne contribuait alors AUCUN candidat, et la règle concluait « la semaine de volume max dépasse
> la meilleure semaine peak ». Énoncé **faux** : il n'y a pas de semaine de pic à dépasser.
>
> La récup dans le pic est **voulue** : C27b la refuse, mais son garde dominant dit que la CADENCE
> de l'athlète l'emporte sur toute règle de placement (R18.5, arbitrage compté et démontré). Ce
> qui n'avait jamais été considéré, c'est sa conséquence sur une prépa COURTE, où le pic tient en
> une seule semaine : le plan n'a plus aucune semaine de pic en charge.
>
> La règle dit désormais **ce qui est vrai** — « aucune semaine de PIC en charge » — et le dit
> dans le canal des AVERTISSEMENTS, la cause étant un arbitrage assumé et non un défaut de
> génération. Même famille que les trois invariants retirés par R20.6 (I6/I8/I12) : une règle
> appliquée là où son objet n'existe pas.
>
> **Mesuré sur 729 plans sans date de course : 216 profils portaient cette violation dure
> insatisfiable → 0, et les réparations tombent de 952 à 356** — 596 coupes de semaines qui ne
> réparaient rien, et qui ne coupaient PAS LA MÊME semaine selon l'allure déclarée. C'était le
> mécanisme de l'inversion.
>
> **TROIS DE MES MESURES ONT VISÉ LA MAUVAISE POPULATION, DANS LA MÊME HEURE.** Le corpus V2
> (702 profils) et mon premier balayage (486) donnaient **0 occurrence**, et j'ai failli retirer
> le correctif comme inerte (le sort de C23b). Les deux portaient sur des plans DATÉS ; le défaut
> ne vit que sur les plans **sans date de course**, construits sur `minWeeks` — c'est-à-dire
> l'athlète qui n'a pas encore d'objectif calé. Là, il touche **29,6 %** des plans. Le golden ne
> bouge pas d'un profil pour la même raison : ses 900 profils portent tous une date.
>
> **CE QUI RESTE — ET C'EST UN ARBITRAGE, PAS UN DÉFAUT.** L'inversion elle-même persiste
> (`inversions d'allure : 2`), et sa cause est en AMONT de la réparation : les courbes DÉCLARÉES
> diffèrent (786 min pour 5:45/km contre 852 pour 7:00/km, à `vol_max` identique). C'est la sonde
> de capacité (V2.1, « la promesse suit ce que les plafonds permettent ») qui lit des plafonds de
> séance dépendants de l'allure — un plafond exprimé en **distance** donne mécaniquement plus de
> MINUTES à qui court moins vite.
>
> La question à trancher est d'entraînement, pas de code : **la sortie longue d'un 10 km se
> prescrit-elle en distance ou en temps ?** En distance, le coureur lent passe plus de temps sur
> ses appuis pour le même « stimulus kilométrique » — plus de fatigue et plus de risque, ce qui
> heurte les priorités 1 et 2 du manifeste. En temps, les deux reçoivent la même charge et le
> kilométrage suit. Tout le moteur compte déjà en TEMPS (`vol_max` est en heures), ce qui plaide
> pour le temps — mais c'est une décision de fond, elle revient au fondateur.


Trouvée en fermant O-20, par le critère `O17` du banc v6 qui est passé rouge. Le réflexe aurait
été de conclure « I14b a bridé le plan » : **c'est faux, et c'est mesuré**. Le plan de l'athlète
capable fait **107 min avant comme après**, au caractère près. C'est le TÉMOIN d'O17 qui a bougé
(92 → 120 min), parce que I14b lui rend enfin ce que le plafond de libellé lui prenait. Le
critère nomme « le plan a rétréci » et mesure « le témoin a changé » — sixième occurrence dans ce
dépôt d'une mesure qui porte sur une grandeur voisine de celle qu'elle nomme.

**Mais ce qu'il expose est un vrai défaut, et il PRÉEXISTE à I14b.** Profil 10 km, `vol_max: 6`,
`sessions_max: 4`, seule l'allure seuil déclarée varie :

| `vol_recent` | allure | S1 livrée | plan total | avant I14b | après I14b |
|---|---|---|---|---|---|
| 5 h | **5:45/km** (rapide) | 100 min | 746 min | identique | identique |
| 5 h | 7:00/km (lent) | **106 min** | **772 min** | identique | identique |
| 0 h | 5:45/km | 107 min | 754 min | 107 / 699 | 107 / 754 |
| 0 h | 7:00/km | 120 min | 790 min | 92 / 706 | 120 / 790 |

Les deux lignes `vol_recent: 5` sont **rigoureusement inchangées** par ce lot : l'inversion y est
antérieure. O17 ne la voyait que sur la cellule `vol_recent: 0`, et seulement parce que son témoin
était lui-même sous-servi — un défaut en masquait un autre.

**C'est une inversion de monotonie sur l'axe ALLURE, cousine d'I13 (axe NIVEAU)** que ce lot vient
de fermer. Le mécanisme n'est pas le même : les deux profils portent ici une **violation dure non
réparée** (« la semaine de volume max dépasse la meilleure semaine peak de >5 % »), parce que la
courbe DÉCLARÉE décroît — S1 en base à 120 min au-dessus de la phase de pic. La boucle de
réparation coupe alors une semaine, et **elle ne choisit pas la même victime selon l'allure** :
S1 chez le rapide, S4/S5 chez le lent.

**Ce qu'il faudra regarder** — dans cet ordre, la première ligne étant probablement la cause :
1. **pourquoi la courbe déclarée décroît** sur ce profil (6 semaines, 10 km, 6 h/sem) : une phase
   de base au-dessus de la phase de pic est une inversion de périodisation à la SOURCE, pas une
   affaire de réparation. La sonde de capacité (V2.1) fait dépendre la courbe déclarée de
   l'allure — d'où deux courbes différentes pour deux allures ;
2. pourquoi la boucle de réparation choisit S1 comme victime chez le rapide ;
3. seulement ensuite, si l'inversion persiste, un invariant de monotonie sur l'allure — le
   pendant d'I13.

**Le critère `O17` est passé en `expect: 'fail'`** (dette déclarée, décision du fondateur du
03/08/2026) : il reste AFFICHÉ avec son chiffre, comme D2/D3/F2, plutôt que réécrit — ré-ancrer
son témoin effacerait ce qu'il vient de trouver, et les deux candidats de témoin mesurés étaient
instables (la rampe R10 fait légitimement baisser un plan à faible `vol_recent`). À repasser en
`'pass'` **dans le même commit** que sa correction.

```verify
id: O-21
quoi: à allure seuil plus rapide, le plan livré n'est pas plus petit (axe allure, cousin d'I13)
attendu: /inversions d'allure : 2$/m
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const P=(pace,vr)=>({intent:'competition',format:'10k',med_pain:'non',med_dizzy:'non',med_treat:'non',age:'32',sex:'H',weight:'75',height:'178',level:'inter',history:'confirme',injury:'aucune',sessions_max:'4',vol_max:'6',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',pace_known:'oui',pace,vol_recent:String(vr),terrain:'route'});const tot=(p)=>p.weeks.reduce((t,w)=>t+w.days.reduce((a,d)=>a+d.sessions.reduce((u,s)=>u+(s.race?0:s.min||0),0),0),0);let ko=0;for(const vr of [0,5]){const rapide=tot(E.buildPlan('run',P('5:45',vr))),lent=tot(E.buildPlan('run',P('7:00',vr)));if(rapide<lent)ko++;}console.log(\"inversions d'allure : \"+ko);"
```


### O-22 · L'import Strava appelle « FTP » la puissance d'une sortie entière · ✅ **FERMÉ (03/08/2026) — issues 3 puis 2, et sa fermeture a découvert O-23**

Trouvé par le fondateur le 03/08/2026, en branchant son propre compte — **premier défaut du dépôt
remonté par une donnée réelle** plutôt que par un banc.

**Mesuré sur son compte** : l'import annonce **188 W** quand sa FTP déclarée sur Strava est
**230 W** — 18 % en dessous. Et ce n'est pas cosmétique : la valeur importée est PROMUE en
référence vivante (`tab-profile.js:31` pose `S.answers.ftp` et `ftp_known = "oui"`), donc **toutes
les zones vélo du plan sont calculées dessus**.

**La cause est une erreur de grandeur**, `steps.js:498` :

```js
const best = powRides.reduce((m, a) => Math.max(m, a.weighted_average_watts || a.average_watts || 0), 0);
const ftp  = Math.round(best * 0.95);
```

Le coefficient 0,95 est la règle classique « FTP ≈ 95 % de la meilleure puissance sur **20
MINUTES** », c'est-à-dire d'un test maximal de vingt minutes. Il est ici appliqué à la puissance
NORMALISÉE d'une **sortie entière** — qui peut durer trois heures en endurance. 188 ÷ 0,95 = 198 W
= la meilleure NP de sortie du fondateur, sur une sortie de 1 h 17.

Le libellé entretient la confusion : `source: "Strava (meilleure sortie ≥20min)"` se lit comme
« meilleure puissance sur 20 min » alors qu'il signifie « meilleure sortie de plus de 20 min ».
Même famille que les six mesures démasquées en R20 : **une grandeur nommée pour une grandeur
voisine**.

**LE SENS DE L'ERREUR CHANGE AVEC L'ATHLÈTE, ET C'EST CE QUI LE REND DANGEREUX.**
Pour qui roule surtout en endurance, l'estimation est BASSE : zones trop faciles, sous-charge —
désagréable, pas risqué. Pour qui a fait une seule sortie courte et très dure dans ses 50
dernières activités, elle est HAUTE : le plan prescrit alors des watts que l'athlète ne tient
pas, sur toutes ses séances de vélo. C'est ce second cas qui heurte les priorités 1 et 2 du
manifeste, et rien ne le distingue du premier aujourd'hui.

**TROIS ISSUES, À ARBITRER.**

1. **Ne plus estimer du tout** et le DIRE. Le message existe déjà pour le cas sans capteur
   (« FTP non estimée : pas de capteur de puissance »). L'étendre : une sortie entière ne dit
   pas la FTP. Honnête, gratuit, et cohérent avec P7/P8 (refuser d'estimer en disant pourquoi).
2. **Estimer pour de vrai** : lire les flux de puissance (`/activities/{id}/streams`) et chercher
   la meilleure moyenne glissante sur 20 min. C'est la grandeur que le 0,95 attend. Coût : un
   appel API par activité, donc un quota et une latence.
3. **Lire la FTP DÉCLARÉE sur Strava** (`/athlete` rend `ftp`). Demande le périmètre
   `profile:read_all` en plus d'`activity:read_all`, donc une ré-autorisation de tous les
   comptes déjà connectés. À noter : c'est une valeur DÉCLARÉE — R14.1 a payé cher la leçon
   « un chiffre auto-déclaré ne pilote rien » —, mais contrairement à un adjectif, elle vient
   le plus souvent d'un vrai test, et l'athlète peut la corriger.

**Recommandation : 1 immédiatement, puis 2.** Ne pas afficher un chiffre faux coûte moins qu'un
chiffre faux qui pilote des zones ; et l'issue 2 rend la grandeur que le coefficient attend.

**Contournement pour l'athlète, aujourd'hui** : saisir la FTP à la main au Profil — la saisie
prime sur l'import et régénère le plan.

Les deux autres références importées portent le même soupçon et n'ont PAS été mesurées :
`thrPace` prend la course la plus rapide EN MOYENNE (le code le dit lui-même : « estimation
basse »), `css` la nage la plus rapide en moyenne. Leur libellé est plus honnête, leur méthode
reste une moyenne de sortie.

**FERMÉ le 03/08/2026 — les issues 3 PUIS 2, dans cet ordre, et pas l'issue 1.** L'arbitrage
recommandé ci-dessus (« 1 immédiatement ») supposait que l'issue 3 coûtait une ré-autorisation de
tous les comptes connectés : au moment où le défaut a été trouvé, **aucun compte n'était encore
connecté** — le relais venait d'être déployé (H-1). Le coût de l'issue 3 était donc nul, et elle
donne la valeur que l'athlète attend. Cascade livrée dans `stravaImport` :

1. **La FTP déclarée du profil** (`/athlete`, périmètre `profile:read_all`) — `ftpSrc = "Strava
   (FTP de ton profil)"`. C'est une valeur déclarée, et R14.1 dit qu'un chiffre auto-déclaré ne
   pilote rien ; la différence est qu'elle est CORRIGEABLE par l'athlète, sur son propre écran, et
   qu'elle vient le plus souvent d'un test.
2. **À défaut : la meilleure moyenne glissante sur 20 minutes RÉELLES** (`/activities/{id}/streams`,
   `bestRollingMean` borné par le TEMPS et non par le nombre d'échantillons — les flux Strava ne
   sont pas à pas constant), × 0,95. C'est la grandeur que le coefficient attend depuis toujours.
   Bornée à six sorties pour ne pas exploser le quota API.
3. `thrPace` cesse de lire « la course la plus rapide en moyenne » : elle ne retient que les
   sorties de **10 à 15 km**, le raccourci de protocole que le dépôt utilise déjà ailleurs.

**Ce qui n'est PAS traité, et reste ouvert** : `css` est toujours estimée depuis la nage la plus
rapide EN MOYENNE, ce qui n'est pas un CSS (le CSS se mesure sur un 400 m et un 200 m). Même
famille que le défaut fermé ici. Non mesuré sur donnée réelle, pas de compte de test avec de la
natation — suivi ici plutôt que dans une entrée neuve tant que le chiffre n'existe pas.

**Et sa fermeture a découvert O-23** : le correctif serait resté INVISIBLE. Voir ci-dessous.

```verify
id: O-22
quoi: l'import Strava lit la FTP déclarée, sinon la meilleure moyenne sur 20 min réelles
attendu: /FTP de ton profil[\s\S]*bestRollingMean|bestRollingMean[\s\S]*FTP de ton profil/
cmd: grep -n "FTP de ton profil\|bestRollingMean\|meilleure sortie ≥20min" endurabuild/js/ui/steps.js
```

---

### O-23 · La fonction nommée `latest` rendait le test le plus ANCIEN · ✅ **FERMÉ (03/08/2026)**

Trouvé en regardant la capture du journal du fondateur après le correctif d'O-22 : trois imports
Strava du **même jour**, et la référence vivante affichée n'était pas celle du dernier.

**Le mécanisme est un tri incomplet**, `tab-profile.js` :

```js
c.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
return c[0];        // « le plus récent »
```

Le tri ne porte que sur la DATE. `Array.prototype.sort` est **STABLE depuis ES2019** : à date
égale, l'ordre d'insertion est conservé — donc `c[0]` est le **PREMIER inséré**, c'est-à-dire le
plus VIEUX. Une fonction nommée `latest` qui rend le plus ancien.

Reproduit sur trois tests, dont deux le même jour :

```
Trois tests le MÊME jour ; le plus récent est le 3e (230 W).
  latest() rend : 188 W — « import 1 »
  DÉFAUT : la fonction nommée « latest » rend le PLUS ANCIEN
```

**LA CONSÉQUENCE EST QUE LE CORRECTIF D'O-22 SERAIT RESTÉ INVISIBLE.** Un nouvel import aurait
écrit 230 W dans le journal, `latest("ftp")` aurait continué de rendre le 188 W du premier import
du jour, et `S.answers.ftp` — la référence que le moteur lit vraiment — n'aurait pas bougé. On
aurait cherché le défaut dans l'import, qui venait d'être corrigé. Plusieurs tests le même jour
n'est pas un cas de bord : c'est ce que produit quiconque branche un compte et relance l'import
pour voir.

**Le moteur, lui, avait raison depuis toujours** : `measuredRate` (`src/engine/projection.ts`)
trie en ordre CROISSANT et prend le **dernier** élément, donc à date égale il obtient bien le plus
récent. Les deux chemins lisaient déjà le même journal et en tiraient deux valeurs différentes —
la forme exacte que R11.1 interdit, ici entre le moteur et l'UI plutôt qu'entre deux tables.

**Correctif** : départage par POSITION à date égale (`(y.i - x.i)`). Le journal est append-only,
l'ordre du tableau EST l'ordre chronologique à l'intérieur d'une journée — aucune horloge à
ajouter, aucun format d'entrée à changer. Garde `O-23` dans `tests/e2e/smoke-improvements.mjs` :
trois tests dont deux le même jour, `syncRefsFromTests()`, la référence doit valoir 230.
**Vérifiée rouge** contre le code d'avant (elle rendait 188).

```verify
id: O-23
quoi: à date égale, `latest` départage par position et rend le DERNIER test inscrit
attendu: /y\.i - x\.i/
cmd: grep -n "y.i - x.i" endurabuild/js/ui/tab-profile.js
```

---

### O-24 · Le cache de l'app servait la version d'il y a neuf lots · ✅ **FERMÉ (03/08/2026)**

**Le défaut le plus coûteux trouvé jusqu'ici, parce que c'est le seul dont la mesure ne pouvait
rien dire.** Les 23 gates étaient verts, le golden était vert, le correctif était sur `main` — et
l'utilisateur voyait toujours l'ancien comportement.

Trouvé en cherchant pourquoi O-22 et O-23, tous deux livrés et mergés, ne changeaient rien sur le
téléphone du fondateur.

**Le mécanisme.** `endurabuild/sw.js` sert l'app en **cache-first** : un asset trouvé en cache est
rendu sans jamais interroger le réseau. C'est le bon choix — l'app doit marcher hors ligne — et il
a un corollaire qui n'était tenu par rien : le cache n'est purgé qu'au changement de `VERSION`, et
`VERSION` était une constante que quelqu'un devait penser à incrémenter à la main.

Personne n'y pensait. Mesuré :

```
Dernier bump de VERSION : 8ba7c3d — RV (« eb-pwa-v17 »)
Commits touchant un asset CACHÉ depuis : 12
Modules servis modifiés depuis        : 14
```

Soit **U14, U15, U16, I14b, O-21, A-5, A-6, O-22, O-23** — neuf lots de correctifs qui
n'atteignaient aucun navigateur ayant déjà ouvert l'app. Le fondateur a redéployé son worker
Strava, s'est déconnecté, reconnecté, réimporté, et a revu 188 W : il testait le code d'avant O-22.

**Et un second trou, dans la même liste.** `ASSETS` était écrite à la main elle aussi ; il y
manquait `js/measured.js`, `js/projection-log.js` et `js/ui/tab-week.js` — trois modules VIVANTS,
importés au démarrage. Un cache qui oublie un module ne casse pas en ligne : il casse chez
quelqu'un, dans le métro.

**La forme est connue, l'habillage est nouveau.** « Un correctif que la cascade annule est un
correctif qu'on croit avoir » (R18.1), `.gd-det { font-size: 11px }` qui écrasait sur mobile
l'aération posée deux étages plus haut (U16). Ici c'est le CACHE qui annule, et il annule **tout**
— pas une règle CSS, la totalité du produit.

**Correctif : la VERSION est l'empreinte.** `scripts/buildSW.mjs` calcule `VERSION` comme le
hachage du CONTENU de tous les assets servis, et dérive `ASSETS` du disque. Elle change si et
seulement si un fichier change ; il n'y a plus d'état « à jour dans le dépôt, périmé dans le
service worker » (R11.1 appliqué au couple fichiers ↔ numéro qui les version). Le nom entre dans
le hachage autant que le contenu : retirer un module change ce que l'app sert hors ligne, même si
aucun autre octet ne bouge.

**Garde : `npm run check:sw`, 24ᵉ gate CI**, exactement le motif déjà éprouvé de
`build:app`/`check:app`. **Vérifiée rouge** en modifiant un module sans reconstruire (code de
sortie 1, message qui nomme la conséquence plutôt que le symptôme). L'oubli devient impossible au
lieu d'improbable — c'est la seule forme de correction qui vaille pour un défaut dont la cause
était « quelqu'un doit s'en souvenir ».

```verify
id: O-24
quoi: la VERSION du service worker est dérivée du contenu servi, et un gate refuse un sw.js périmé
attendu: /✓ sw\.js à jour/
cmd: npm run --silent check:sw
```

---

### O-25 · L'allure seuil importée n'était pas un effort maximal, et l'import défaisait la correction · ✅ **FERMÉ (03/08/2026)**

Remonté par le fondateur une fois O-24 fermé — donc **le premier retour où il voyait enfin le code
qu'on lui livrait**. Deux défauts distincts, qui se combinaient pour produire un seul symptôme :
« mon seuil passe à 5'37 au lieu de 4'42 ».

#### (a) La fenêtre de distance sans le « à fond »

`disciplineRegistry.ts` énonce le raccourci en entier : *« un 10-15 km récent **À FOND** est une
bonne estimation »*. O-22 avait posé la fenêtre de distance — c'était juste, et c'était la moitié
de la règle. L'autre moitié n'était vérifiée par rien : **une sortie longue tranquille de 12 km
entre exactement dans la fenêtre et n'est pas un test.**

Mesuré sur le compte du fondateur : **5'37/km annoncé pour un seuil réel à 4'42**, soit 55 s/km
d'écart et toutes les zones de course décalées d'un cran. C'est exactement le défaut d'O-22 sur un
autre poste : **un raccourci de protocole appliqué à une grandeur qui n'est pas celle qu'il
attend.** Le sens de l'erreur est cette fois systématiquement BAS — on prend une moyenne de
sortie, elle ne peut qu'être plus lente que le seuil — donc sous-charge silencieuse.

**Cascade livrée**, calquée sur celle de la FTP :

1. **Une COURSE, déclarée telle sur Strava** (`workout_type === 1`), entre 10 et 15 km. C'est le
   « à fond » du protocole, attesté par l'athlète lui-même.
2. **La meilleure moyenne glissante de 10 minutes**, lue dans le flux de vitesse
   (`velocity_smooth`). Le protocole du seuil est « 3 min + 10 min à fond » : c'est la grandeur
   qu'il attend, et elle vit **à l'intérieur** des séances (un tempo, une côte, une fin de sortie)
   au lieu d'être noyée dans une moyenne de sortie. Même fonction que pour la puissance —
   `bestRollingMean`, une seule fois écrite (R11.1).
3. **Aucune estimation, et on le dit** (P7/P8), avec les deux issues : corriger au Profil, ou
   faire le test.

#### (b) « La saisie manuelle prime toujours sur l'import » était faux

Le message de l'import le promet depuis son écriture. Il ne primait pas : la saisie et l'import
atterrissent dans le **même journal**, à la **même date**, et le départage par position posé par
O-23 fait gagner le dernier inséré — c'est-à-dire l'import, puisque l'ordre naturel est de
corriger d'abord et de réimporter ensuite.

Mesuré, et le banc rend le chiffre exact du symptôme :

```
FAIL O-25 — un import du même jour ne défait pas ta correction (5:37, attendu 4:42)
```

C'est une **conséquence directe d'O-23** : en réparant « latest rend le plus ancien », j'ai fait
gagner l'import contre la correction. Le correctif était juste et incomplet — il fallait dire ce
que « le plus récent » signifie quand deux sources parlent le même jour.

**Règle livrée** : une valeur **saisie** (ou issue d'un **retest guidé** — un protocole exécuté
volontairement) bat tout import de la même date. Au-delà, la date reprend la main : un import
postérieur dit quelque chose de neuf, et geler la valeur à vie serait le défaut symétrique. Les
deux moitiés sont assertées. Le message d'interface cesse de promettre « toujours » et dit ce qui
est vrai : « ta correction prime sur cet import et sur tout import du même jour ».

**Gardes** : cinq critères `O-25` dans `tests/e2e/smoke-improvements.mjs` — les deux moitiés de la
règle de priorité, plus trois sur `bestRollingMean` (elle trouve le bloc rapide ; un effort de
8 min ne rend PAS une « moyenne de 10 min » ; la fenêtre est bornée par le TEMPS et non par le
nombre de points). Le critère (b) **vérifié rouge** contre le moteur d'avant.

```verify
id: O-25
quoi: l'allure seuil vient d'une course déclarée ou du meilleur 10 min, jamais d'une moyenne de sortie
attendu: /velocity_smooth[\s\S]*workout_type|workout_type[\s\S]*velocity_smooth/
cmd: grep -n "workout_type\|velocity_smooth\|meilleur 10 min" endurabuild/js/ui/steps.js
```

### O-26 · Le plancher d'une séance n'atteint jamais la boucle de volume — C30 en est à 4 % de sa portée · ⏳ **OUVERT — mesuré, et il demande un arbitrage**

Trouvé en implémentant **C30** (décision du fondateur du 04/08/2026 : « se rapprocher du temps
visé sur l'épreuve a minima, et au moins 70 % de la distance »).

**La règle est écrite, elle est juste, et elle ne fait presque rien.** Mesuré sur 180 profils de
course (4 formats × 3 niveaux × 5 allures × 3 enveloppes) : C30 en déplace **7**, de 2 à 6
minutes. Sur la grille de spécificité (24 profils × 2 cibles), les cibles atteintes passent de
**24/48 à 31/48** — un progrès réel, mais concentré sur les débutants, c'est-à-dire pas sur la
population que la mesure désignait.

**La cause est nommée, et elle est en aval du module de sport.** `blockBounds`
(`planGenerator.ts`) est la SEULE source de bornes du scaling — c'est une bonne chose. Mais pour
un bloc de sortie longue ordinaire (sans pente, `reps = 1`), elle **jette le plancher déclaré
par le bloc** et le remplace par un « plancher digne » forfaitaire :

```ts
const fl = s.d === "bk" ? 35 : 30; // C8/C16 — plancher digne, pas la borne basse du format
return { floor: fl, cap: Math.max(fl, Math.round(b.bnd.cap * sc)) };
```

Le `bnd.floor` que C30 calcule n'arrive donc jamais jusqu'à R3.3. Ce n'est pas un oubli : c'est
la décision **D3-D7/D10 de l'audit v6**, « les planchers de séance ne gagnent plus contre la
courbe ». C30 demande l'inverse pour une séance.

**ET FORCER LE PLANCHER NE MARCHE PAS — c'est le résultat qui compte.** Testé
(`floor = max(30, bnd.floor)` pour les blocs longs) : les cibles atteintes passent de **31/48 à
30/48**, donc *moins bien*. La longue du 10 km à 7:00/km monte de 48 à 55 min pour une cible de
64, et s'arrête là. Le facteur limitant n'est pas le plancher : c'est le **volume hebdomadaire
d'une prépa de format court**. Sur ce profil, la semaine de pic livrée fait **140-152 min** et la
longue y pèse déjà **36-39 %**. La porter à 64 min en ferait 44 % de la semaine.

**Ce qui reste à trancher, et c'est une question d'entraînement :** une prépa 10 km pour
quelqu'un qui court 71 min sur l'épreuve doit-elle rester à **2,4 h/semaine** ? `R20.2` répond
déjà *pourquoi* elle y reste (« ce qui borne, c'est le nombre de séances : 5 séances, et aucune
ne peut s'allonger indéfiniment »), et cette réponse est cohérente — mais elle ne dit pas si
c'est **souhaitable**. Trois issues, aucune gratuite :

1. **le volume utile d'un format court s'indexe sur le TEMPS de course** et non sur sa seule
   distance (le coureur lent reçoit plus de minutes) — c'est la lecture la plus proche de
   l'arbitrage du fondateur, et elle rouvre l'inversion d'O-21 dans le sens qu'il assume ;
2. **la sortie longue a droit à une part plus grande de la semaine** sur les formats courts —
   plus local, mais déséquilibre la semaine et heurte D3-D7/D10 ;
3. **on assume** que la spécificité complète n'est pas atteignable sous 5 séances, et on le
   DIT dans « Pourquoi ce plan » (le motif de R20.2 étendu à la sortie longue).

Ma préférence va à **(3) puis (1)** : (3) est honnête et coûte peu, (1) est la vraie réponse
mais demande de reprendre `UTIL` et la sonde de capacité, donc un lot à part entière.

**Note de méthode — ma première garde valait zéro.** Écrite sur l'INTENTION (« la longue couvre
70 % de la distance »), elle était satisfaite par le moteur d'AVANT C30 : trois cassures
délibérées, **trois verts**. Septième occurrence dans ce dépôt d'un critère qui nomme une
grandeur et en mesure une voisine. Réécrite sur les 7 profils que C30 déplace réellement, avec
leurs valeurs, elle rougit sur trois cassures (C30 retiré, plancher devant plafond, part du temps
de course 0,9 → 0,6). **Une quatrième reste verte et c'est un résultat** : passer la part de
distance de 70 % à 50 % ne change rien, parce que sur ces 7 profils le repère TEMPS domine
toujours. La moitié « distance » de la règle n'a encore jamais mordu.

```verify
id: O-26
quoi: C30 ne déplace qu'une poignée de profils, le plancher n'atteignant pas la boucle de volume
attendu: /déplacés par C30 : 7$/m
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const L=(o)=>{const a=Object.assign({intent:'competition',med_pain:'non',med_dizzy:'non',med_treat:'non',age:'32',sex:'H',weight:'75',height:'178',history:'confirme',injury:'aucune',sessions_max:'5',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',pace_known:'oui',vol_recent:'3',terrain:'route'},o);let s=0;try{const p=E.buildPlan('run',a);p.weeks.forEach(w=>w.days.forEach(d=>d.sessions.forEach(x=>{if(x.long&&(x.min||0)>s)s=x.min;})))}catch(e){s=-1}return s};let n=0,b=0;for(const format of ['5k','10k','semi','marathon'])for(const level of ['debutant','inter','avance'])for(const pace of ['4:00','4:30','5:45','7:00','8:30'])for(const vol_max of ['4','6','8']){n++;}console.log('profils : '+n);const M={'10k/debutant/8:30/6':63,'10k/debutant/8:30/8':63,'semi/debutant/8:30/8':117,'semi/inter/7:00/8':124,'semi/inter/8:30/8':119,'semi/avance/7:00/8':124,'semi/avance/8:30/8':119};let ok=0;for(const k in M){const [format,level,pace,vol_max]=k.split('/');if(L({format,level,pace,vol_max})===M[k])ok++;}console.log('déplacés par C30 : '+ok);"
```


### O-27 · Pendant une passe de RÉDUCTION, un plancher absolu peut AUGMENTER un step court · ✅ **FERMÉ (fondateur, 05/08/2026 : « pas très dangereux mais corrige si facile »)**

Trouvé en créant le point unique `src/engine/stepScale.ts` (25 écritures de « réduire un step
d'un facteur », 6 variantes qui n'étaient pas d'accord). Le point unique porte un drapeau
`clampToOriginal` — la promesse A3 de l'audit v6 : *« les planchers ne remontent JAMAIS
au-dessus de la valeur d'origine »*. Ce drapeau a fermé un bug réel : `reduceDay(f = 1,2)`
faisait passer un bloc de **5 à 6 répétitions** (le `Math.min` protégeait durée et distance,
pas `reps`) pendant que son commentaire promettait le contraire. Fermé, garde au banc R21,
vérifiée rouge.

**Mais activer le même clamp sur les cinq trios du GÉNÉRATEUR n'est pas gratuit : 19 profils
golden bougent.** Le mécanisme : `Math.max(10, round(dur × f))` sur une durée de 9 min à
f = 0,9 rend **10** — une passe de réduction qui ALLONGE un step court jusqu'à son plancher
« digne ». Sémantiquement, c'est ce qu'A3 appelle un défaut ; historiquement, c'est un
comportement validé, photographié dans le golden, et possiblement porteur (les planchers de
dignité de l'audit v6 D3-D7/D10 interagissent avec les fenêtres de séance).

**TRANCHÉ.** Les cinq trios du générateur posent `clampToOriginal` — vérifié d'abord que les
cinq sont bien des passes de RÉDUCTION (`f < 1` dans les cinq contextes : décroissance
d'affûtage, R3.13, et les trois coupes de la boucle de réparation). Une réduction ne peut plus
rendre plus qu'elle a reçu, et c'est désormais **structurel** : le point unique `stepScale`
l'applique aux trois champs, il n'y a plus de site où l'écrire autrement.

**Ce que ça déplace, mesuré sur 189 profils de contrôle (7 sports × historiques × niveaux ×
intentions)** : **173 inchangés, 15 en baisse, 1 en hausse** — `duathlon/S/reprise/debutant`,
1268 → 1277 min, soit **+0,7 %**. Golden : 19 empreintes, toutes sur les minutes FACILES, de 1 à
4 min par semaine.

**La hausse résiduelle est signalée sans être attribuée.** Le mécanisme plausible est un effet de
second ordre — le clamp laisse un état intermédiaire plus petit, et une passe de PLANCHER en aval
(qui a le droit d'ajouter) occupe le budget libéré ; la seule semaine concernée est en phase
d'affûtage, où ces passes se croisent le plus. Mais l'attribution n'a pas été tracée, et écrire
« c'est le plancher » sans l'avoir mesuré serait exactement ce que ce registre reproche ailleurs.
Ce qui EST établi : aucune violation dure sur les 27 gates, et l'invariant de step tient
partout.

```verify
id: O-27
quoi: le clamp A3 est posé sur le chemin d'adaptation, et le comportement est asserté par le gate R21
attendu: /cablage clampToOriginal : 1$/m
cmd: node -e "const fs=require('fs');const n=(fs.readFileSync('src/readiness/dailyAdjuster.ts','utf8').match(/clampToOriginal: true/g)||[]).length;console.log('cablage clampToOriginal : '+n);"
```


### O-28 · `audit:amont` ne voit pas une dérive silencieuse sur les bornes numériques · ✅ **FERMÉ (04/08/2026) — et ma première correction était INERTE**

Trouvé par l'audit des gardes (04/08/2026) : pour chacun des huit gates jamais vérifiés rouges,
casser exprès ce qu'il prétend protéger et vérifier qu'il rougit. Six mordent (`audit:v1` sur la
garantie R3.13 finale, `demo:repair` sur `applyTargetedRepairs`, `demo:readiness` sur le registre
objectif, `demo:fit` sur la signature, `demo:measured` sur l'arbitrage, `demo:retention` sur la
série gratuite). Deux sont muets — celui-ci et O-29.

**La cassure, vérifiée ACTIVE avant le verdict** (la leçon a coûté trois faux verdicts dans ce
même audit : un `reduire(f=1)` réparé par la garantie aval, un bundle refusé par l'auto-test du
build, un `coerce` que personne ne lit) : remplacer le refus typé hors bornes d'`answerSchema`
par un clamp silencieux — `vol_max: "999"` **accepté, clampé à 40, plan généré, aucun journal**.
Mesuré : le comportement change (« vol_max=999 accepté en silence »), le build passe, et
`audit:amont` — dont la promesse est « 551 entrées fausses → refus MOTIVÉ, sans effet, ou dérive
ANNONCÉE ; zéro dérive silencieuse » — reste **vert**.

**CE QUI L'A FERMÉ — après une correction retirée.** Ma première idée était de resserrer le
prédicat : une explication ne compterait que si elle NOMME la clé mutée (mots dérivés de
`answerSchema[k].label`). Écrite, puis **mesurée : 0 verdict changé sur 472** contre le moteur
intact, **et toujours verte contre la cassure** — parce que `R20.2` parle légitimement de « ton
volume max » dans chaque plan, donc le prédicat par mots-clés était satisfait par une explication
présente des deux côtés. Correction inerte, retirée comme C23b et R19.4/O-12.

Ce qui ferme le trou ne devine rien : le schéma DÉCLARE des bornes, donc une valeur hors bornes
doit être **refusée, typée, en nommant sa clé**. Nouvelle section **T5** dans `audit_amont.cjs`,
dérivée du schéma (`answerSchema`, R11.1 — la recette d'`audit:sensibilite`) : pour chaque clé
numérique bornée présente dans le questionnaire du sport, `min − 1` et `max + 1` doivent lever un
`ENTREE_INVALIDE` **portant cette clé**. `70 bornes éprouvées (22 clés) · 0 non tenue`.
**Vérifié rouge contre la recette ci-dessus : 70/70.**

*Note d'instrument, gardée écrite : mes deux premières écritures du critère cherchaient la clé
dans le MESSAGE du refus par regex, et toutes deux ont échoué sur l'échappement — `"\\\\b"` dans le
fichier JS vaut « antislash littéral + b », `"\\b"` vaut le caractère retour arrière. Résultat :
70 refus bien réels comptés comme absents, un banc rouge pour rien. La clé est lue sur la
propriété `EBInputError.key` — un contrat typé se lit sur son type, pas dans sa prose.*

### O-29 · `audit:public` ne voit pas une séance au repère d'intensité VIDE · ✅ **FERMÉ (04/08/2026)**

Même méthode, même statut. La cassure : vider le repli RPE de la zone `rn.thr`
(`fb: ""`, `hr: null`) — pour l'athlète sans allure déclarée, la séance rend littéralement
**« 3×5min @  »**, un `@` suivi de rien. C'est mot pour mot le défaut que le banc existe pour
empêcher (« 0 séance sans repère exécutable », R12). Vérifié : le rendu porte bien le trou, le
build passe, et `audit:public` reste **vert**.

**La cause, mesurée** : le §A teste la SÉANCE ENTIÈRE contre une alternance de mots-repères. Il
suffit qu'un échauffement dise « progressif » pour que la séance passe — même si son bloc de
travail annonce « 3×5min @  ». Le banc vérifiait la présence d'un chemin de repli, pas le CONTENU
rendu : une mesure qui porte sur une grandeur voisine de celle qu'elle nomme.

**Section E** ajoutée à `banc_grand_public.cjs` : dans le texte que l'athlète a sous les yeux,
chaque `@` doit être suivi d'un repère avant le prochain séparateur (`·`, `(`, `—`, fin). C'est
une propriété du LIVRÉ — elle ne suppose rien du chemin qui l'a produite — et elle est éprouvée
sur les 6 sports × 3 niveaux × {sans références, avec références}, un `@` vide n'étant jamais
acceptable. **Vérifiée rouge contre la recette ci-dessus.**

## §2 — Dette CHIFFRÉE et verrouillée (ne peut pas remonter)

Ces défauts sont connus, comptés, et un budget en CI les empêche d'empirer. Ils ne font pas
échouer la CI **par décision explicite**, pas par oubli.

### Banc v6 — 4 dettes (`npm run audit:v6` → « 57 vert · 4 dette connue · 0 régression »)

| id | ce qui reste | pourquoi c'est laissé |
|---|---|---|
| **D2** | 2 configurations sur 153 (`swim/sprint\|demifond/debutant/reprise`) portent encore une violation dure | Tout le plan tient entre 45 min et 1 h de nage par semaine, les 4 séances sont AU plancher (C15 : 850 m ; C20 : 0,42 h/séance) et l'écart semaine max ↔ pic est de 5 minutes. **Il n'y a plus de marge sous les planchers pour exprimer une hiérarchie.** Un rabotage a été tenté : sans effet, les planchers le reprennent immédiatement ; le code a été retiré plutôt que laissé inerte. |
| **D3** | 4 sauts de charge à **+11 %** au lieu de +10 % | Le rapport dev→peak de la courbe vaut 1,18, donc **supérieur à C22 par construction**. Sur un plan court à deux récups consécutives, C22 voudrait le pic ≤ 273 min quand la hiérarchie du plan le veut > 248 : les deux tiennent dans 25 minutes et les planchers de séance interdisent de descendre. Réduire encore ferait passer le pic SOUS une semaine de base — on échangerait une violation contre une pire. **La correction de fond est dans la FORME de la courbe, pas dans une passe de rattrapage.** |
| **F2** | 7 séances de qualité à ~42 % de temps en zone cible au lieu de 45 % | **Contradiction assumée entre deux règles.** Ces séances ont déjà leur échauffement et leur retour au calme à leur plancher (C13/C13b) ; atteindre 45 % demanderait exactement ce que C13c interdit (échauffer moins de 10 min avant un effort maximal). La priorité n°2 du manifeste (prévention des blessures) tranche. Le test reste en `expect:'fail'` **pour garder le chiffre sous les yeux**, pas parce qu'on l'a oublié. |

```verify
id: DETTE-v6
quoi: 3 dettes connues, 0 régression
attendu: /4 dette connue · ✖ 0 régression/
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
attendu: /4 dette connue/
cmd: npm run audit:v6
```

---

## §3 — Angles morts connus de la mesure

Ce ne sont pas des bugs : ce sont des endroits où **on ne saurait pas** qu'il y a un bug.

| # | angle mort | conséquence |
|---|---|---|
| ~~A-1~~ | ~~`audit:v7` tourne à N=150~~ | ✅ **Fermé (R15.1)** : N=400, budgets en taux, jour de course varié. |
| A-2 | Le golden master fige `vol_max` au profil de base sur presque toutes ses passes | Deux passes correctives ont déjà dû être ajoutées pour cette raison (« course datée » en N2, « volume et extrapolation » en R14). Le prochain paramètre figé produira le même angle mort. |
| ~~A-3~~ | ~~`R14.3-b` n'a **aucun critère automatique**~~ | ✅ **FAUX depuis R15.2 — déplacée au §4** : les critères existent (`R15.2-A/B/C/D`, gate `audit:r15`) et sont verts. |
| A-4 | Le monolithe `Coach_Pro_V1.5.html` a le moteur à jour mais son **UI est gelée à R4** | Les régressions d'interface introduites depuis (les onglets — 5 puis 4 en R16.9 —, carte Trail, étape terrain) ne s'y voient pas. C'est documenté et voulu — mais un utilisateur qui ouvrirait ce fichier verrait un produit d'il y a plusieurs lots. |
| ~~A-5~~ | ~~**Aucune vérité terrain pour la projection R14/R14.1**~~ ✅ **PREMIER GESTE FAIT (03/08/2026)** | `endurabuild/js/projection-log.js` — le journal existe. **Une entrée par semaine ISO** (la projection ne bouge pas d'un jour à l'autre : l'adhérence est une fenêtre glissante de six semaines, P1 — journaliser chaque ouverture coûterait sept fois le stockage pour la même information), portant de quoi REFAIRE le calcul sans le code de l'époque : horizon, références mesurées qui ont servi d'ancre, `gainPct`, `gainBand`, adhérence, confiance, temps annoncés par discipline, et le MOTIF quand le moteur refuse de projeter (P8 — un refus est une donnée). `noteRaceResult()` referme la boucle au passage du jour J en attachant le temps réel à la projection journalisée **à son horizon d'origine** : `raceResult.predicted` ne contenait que la prédiction RECALCULÉE le jour J, laquelle ne dit rien de ce que le moteur annonçait quatre mois plus tôt. **Ce qui reste à faire est HUMAIN** : la calibration se fait hors ligne, sur les données exportées, et seulement quand une POPULATION aura couru — P11 a montré qu'un cas unique ne calibre rien (HERITAGE). ⚠ **Le journal n'est relu par AUCUNE partie du moteur, et c'est sa garde principale** : un journal qui influencerait la projection serait une seconde source de vérité (R11.1/R20.5/U9) et, pire, une boucle qui se confirme elle-même — le moteur calibré sur ses propres annonces mesurerait sa cohérence au lieu de sa justesse. `A5-B` l'asserte au caractère près (`tests/e2e/smoke-projlog.mjs`, 16ᵉ suite E2E), avec le critère « l'empreinte SAIT voir un changement » sans lequel elle serait satisfaite par une mesure aveugle. Suite **vérifiée rouge** (7 critères sur 11) en désactivant le journal.
| ~~A-6~~ | ~~**Dates absolues** dans le golden et les scripts~~ ✅ **FERMÉ (03/08/2026) — et l'application mécanique aurait cassé le golden** | Point unique `bench-dates.cjs`. **Mesuré : ce n'était pas de l'hygiène, c'était une échéance datée** — `banc_grand_public` et `bench_r13` MOURAIENT à +90 jours, `banc_invariants` à +200, sur une exception non rattrapée (`ENTREE_INVALIDE : au moins 22 semaines avant la course`) et non sur un défaut. Cinq bancs ancrés, **vérifiés verts à +400 jours**, contre-preuve faite (les mêmes, non ancrés, rouges à +90/+200). **Le golden reste en dates ABSOLUES, délibérément** : mesuré 0 écart à +200 jours — un golden doit être REPRODUCTIBLE, pas suivre le calendrier ; le rendre relatif l'aurait fait dériver chaque semaine. Sa seule exposition (l'horizon de `RACE_PASS_DATES`) est couverte par sa garde d'échéance, vérifiée déclenchante à +290 jours.

---

## §4 — Entrées de registre devenues FAUSSES (trouvées en compilant ce fichier)

Elles décrivent des défauts **déjà corrigés** ; les laisser telles quelles fait croire à une dette
qui n'existe plus, ce qui est le symétrique exact d'un défaut caché.

| entrée | ce qu'elle affirme | ce qui est mesuré aujourd'hui |
|---|---|---|
| **A-3** (§3, statut « angle mort ») | « `R14.3-b` n'a aucun critère automatique : personne ne saura si le dénivelé vélo est traité, sauf à relire le code » | **Faux depuis R15.2, mesuré le 05/08/2026.** O-2 EST R14.3-b, et sa fermeture a livré ses critères — `R15.2-A/B/C/D` dans `npm run audit:r15`, les quatre verts : bande de puissance qui descend avec le relief (plat 175–191 W, montagne 169–185, écart 6 W), vallonné strictement entre les deux, conseil de pacing qui nomme la puissance normalisée, clé unique `terrain`. L'entrée O-2 le disait déjà en toutes lettres (« le critère est venu avec le handoff de revue ») ; c'est le tableau des angles morts qui n'avait pas suivi. Un angle mort qui n'en est plus fait croire à une cécité qu'on n'a pas — le symétrique du défaut caché, et la raison d'être de ce §4. |
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

### S-1 · Le moteur tourne dans le navigateur, et il y reste · ✅ **ARBITRÉ (04/08/2026) — décision RÉVISABLE**

> « Restons en public pour le moment »

La grille de sécurité ouvre sur « le moteur tourne exclusivement côté serveur ». Cette case
ne pouvait pas être cochée : **il n'y a pas de serveur.** Mesuré sur le fichier réellement
servi (`endurabuild/js/engine.js`, 925 Ko) : `Bosquet` ×21, `Riegel` ×25, `G_PLAFOND` ×7,
`HISTORY_CAPS` ×8 — les règles, les seuils, et les commentaires qui les justifient.

**Décision : on assume.** Ce que ça achète — hors-ligne, zéro-compte, zéro-infra, et
l'explicabilité qui est le contre-positionnement du produit. Ce que ça coûte — le moteur est
copiable, et **le « secret des affaires » (loi 2018) ne s'applique pas** : il exige des
mesures de protection raisonnables, or un moteur publié n'en est pas une. La protection
réelle est le **droit d'auteur** (`LICENSE`, déjà en place) et la **concurrence déloyale**.

Conséquence de registre : les §1, §2, §5 et §6 de la grille deviennent **hors architecture**
plutôt que « en retard ». Ce qui reste est HUMAIN et suivi en §5 : `H-6` (CGU) et `H-7`
(Soleau). Détail et déclencheurs de réouverture dans ARCHITECTURE.md « S-1 ».

**Pas de bloc `verify` ici, et c'est une conclusion, pas un oubli.** J'ai essayé deux fois de
mécaniser « aucun document ne revendique le secret des affaires ». La première comptait les
OCCURRENCES du terme et rendait 1 — le paragraphe qui explique que la protection ne s'applique
PAS le mentionne forcément : une mesure qui compte une négation comme une revendication. La
seconde cherchait les mentions non niées et en trouvait trois, dont **deux étaient le motif de
la garde elle-même** : l'instrument se mesurait. Cette affirmation porte sur de la prose
nuancée, et ce dépôt sait ce que ça coûte de faire servir de la prose de donnée (R3-final,
1 740 récupérations comptées 0 min). Elle reste donc une vérification HUMAINE, à faire si une
stratégie juridique se construit — le point à ne pas perdre étant qu'un moteur publié n'ouvre
pas droit à cette protection, quelles que soient les CGU.

---

## §5 — Hors périmètre du moteur (ce ne sont PAS des bugs)

| # | sujet | nature |
|---|---|---|
| ~~H-1~~ | ~~`STRAVA_RELAY_DEFAULT = ""` dans `endurabuild/js/config.js`~~ | ✅ **FAIT le 03/08/2026** : app Strava créée (client `269639`), worker Cloudflare déployé, `STRAVA_RELAY_DEFAULT` renseigné, connexion confirmée en production (`✓ Connecté`). Le `client_secret` vit UNIQUEMENT en variable de type *Secret* côté Cloudflare — jamais dans le dépôt, jamais dans un commit. Périmètre `activity:read_all,profile:read_all` (le second ajouté par O-22). Une garde E2E qui supposait le relais ABSENT a dû être réécrite : elle mesurait l'absence de déploiement, pas un comportement. |
| H-2 | Notifications push app fermée | ✅ **POSITION CONFIRMÉE (fondateur, 05/08/2026)**. Demande un backend ; S-1 a acté qu'il n'y en a pas. On n'annonce pas ce qu'on ne peut pas tenir — l'entrée reste ouverte comme RAPPEL, pas comme dette. |
| H-3 | CONSEIL nutritionnel (par opposition aux ESTIMATIONS, livrées) | ✅ **POSITION CONFIRMÉE (fondateur, 05/08/2026)** : reste **bloqué sur avis diététicien**. ⚠ « Validé » désigne la POSITION, pas l'obtention de l'avis — aucun conseil nutritionnel ne peut être livré tant qu'un professionnel n'a pas tranché, et notamment la question ouverte par N11 : les macros N10 sont en substance une **cible d'apport** (leurs trois sources sont des références d'apport, et leur somme en kcal ne coïncide pas avec la dépense affichée sur la même carte). **Ligne à ne pas franchir**, manifeste. |
| ~~H-6~~ | ~~**CGU/CGV** — clauses anti-reverse-engineering, anti-scraping, anti-réutilisation commerciale~~ | 🚫 **ABANDONNÉ (fondateur, 05/08/2026) — et sa conséquence est écrite ici.** L'entrée disait que les CGU deviennent le levier PRINCIPAL depuis `S-1` (le moteur étant public, le secret des affaires ne s'applique pas). Les abandonner laisse **`LICENSE` — le droit d'auteur — comme seule protection**, sans le support contractuel qui rend une réutilisation attaquable. C'est un arbitrage assumé, pas un oubli. Réouverture naturelle : modèle payant, copie constatée, ou première levée de fonds (la due diligence les demandera). |
| ~~H-7~~ | ~~**Enveloppe Soleau / dépôt INPI**~~ | 🚫 **ABANDONNÉ (fondateur, 05/08/2026).** Ne protégeait pas l'algorithme : il DATAIT la méthode, ce qui appuie une action en concurrence déloyale. Sans lui, l'antériorité devra s'établir autrement — l'historique git public du dépôt en est une trace horodatée, plus faible qu'un dépôt INPI mais non nulle. |
| ~~H-4~~ | ~~Candidature API MyFitnessPal~~ | 🚫 **ABANDONNÉ (fondateur, 05/08/2026).** Sans objet depuis R6 : le journal alimentaire a été retiré du produit sur décision utilisateur, donc il n'y a plus rien à alimenter. L'entrée avait survécu à la fonctionnalité qu'elle servait. |
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
