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
attendu: /vol_max=16h[^\n]*ce qui borne[\s\S]*Si tu levais cette contrainte/
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
attendu: O13-RAMPE-MORD
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const b={sport:'swim',format:'fond',intent:'competition',dispo:'partielle',doubles:'parfois',off_days:'non',shift_ok:'non',age:'35',sex:'H',css_known:'oui',css:'2:00',milieu:'bassin',swim_limit:'technique',injury:'aucune',med_pain:'non',med_dizzy:'non',med_treat:'non',sessions_max:'6',vol_max:'10',history:'reprise',level:'inter'};const s1=(vr)=>E.buildPlan('swim',{...b,vol_recent:vr}).weeks[0].vol;const a=s1('0'),c=s1('5');console.log('S1 a 0h '+a+'h · a 5h '+c+'h');if(a<c)console.log('O13-RAMPE-MORD');"
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

### O-18 · Le diagnostic RV ne connaît qu'un sport, et sa table de marge sature là où il sert le plus · 🟡 **(1) PARTIELLEMENT FERMÉ (08/08/2026) — (2) OUVERT**

Le raisonnement inverse (`src/engine/feasibility.ts`, carte « 🎯 Ton chrono visé ») est livré avec
**deux limites nommées**. Les écrire ici, c'est la différence entre une portée assumée et un
angle mort.

**(1) Étendu à swim/tri/duathlon (08/08/2026).** `assessFeasibilityMulti` (préfixe de décision
« RVm ») compose un chrono actuel MULTI-SEGMENTS sans réinverser le modèle de puissance vélo
(Martin 1998, coûteux à inverser) : le gain nécessaire se lit sur le RATIO des temps totaux
(actuel vs visé), et le plafond de gain agrégé est une moyenne pondérée par le temps que pèse
chaque segment, en réutilisant tel quel le `margeOf` par segment qui sert déjà à la projection
avant-course (R11.1 — un point unique, jamais une seconde table). `src/app/bridge.ts`
(`legsForFeasibility`) compose les segments avec les MÊMES briques que `predictSwim`/`predictTri`/
`predictDuathlon` appellent pour la prédiction du jour (`SWIM_RACE`, `TRI_SWIM`/`TRI_BIKE`/
`TRI_RUN`, `bikeTimeEstimate`, `riegelSecWith`, tables `DUA_*`), jamais une resaisie du modèle.
**Restent hors périmètre, et le disent :**
- **vélo seul** — aucun format vélo ne porte de DISTANCE connue (PW l'a déjà nommé : « le
  questionnaire ne demande pas la distance d'une cyclosportive »), donc aucun chrono ACTUEL à
  comparer à l'objectif ;
- **trail/swimrun** — l'inversion de Riegel ne s'applique ni au trail (le module dit lui-même que
  Riegel y est inapplicable, T-8) ni au swimrun, dont le temps ne se décompose pas en
  marge/plafond par référence mesurée (trail : temps à plat + VAM ; swimrun : quota de minutes
  par segment fixé par `swimrunModel`) — chacun demande sa PROPRE inversion, pas la
  généralisation multi-segments pondérée écrite ici. La suite naturelle pour le trail reste un
  verdict bâti sur `trailModel`, pas sur Riegel.

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
quoi: la saturation de la table de marge sous 6'00/km, le verdict désormais rendu en natation, et l'absence de verdict vélo seul
attendu: /7:00 = 6:30 : OUI[\s\S]*swim verdict : (atteignable|juste|hors-horizon|hors-modele|indeterminable)[\s\S]*hors vélo seul : null/
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const iso=(d)=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);const b={format:'10k',level:'debutant',history:'reprise',intent:'competition',vol_max:'6',vol_recent:'0',sessions_max:'4',dispo:'quotidienne',age:'30',sex:'H',weight:'78',height:'180',injury:'aucune',off_days:'non',shift_ok:'non',doubles:'non',sleep:'moyen',life_load:'normale',activity:'actif',med_pain:'non',med_dizzy:'non',med_treat:'non',terrain:'plat',pace_known:'oui',race_date:iso(112)};const g=(pace)=>{const a={...b,pace};return E.predict('run',a,E.buildPlan('run',a)).projected.gainPct.thrPace;};console.log('7:00 = 6:30 : '+(Math.abs(g('7:00')-g('6:30'))<1e-9?'OUI':'non'));const sw=E.feasibility('swim',{...b,format:'fond',css_known:'oui',css:'1:35',target_time:'20:00'},null);console.log('swim verdict : '+(sw&&sw.verdict));console.log('hors vélo seul : '+E.feasibility('bike',{...b,format:'gravel',target_time:'2:00:00'},null));"
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


### O-21 · À capacité déclarée plus HAUTE, le plan est plus PETIT — l'inversion sur l'axe allure · 🟡 **TROIS MÉCANISMES CORRIGÉS (03 et 05/08/2026), RÉSIDU RAMENÉ À +5,0 %**

> **CORRECTION DU 05/08/2026, 3ᵉ MÉCANISME — ET « DU BRUIT DE CONVERGENCE » ÉTAIT UN DIAGNOSTIC
> PARESSEUX.** Cette entrée concluait, après la 2ᵉ correction, que les séquences résiduelles
> « ne sont pas monotones dans un sens ou dans l'autre, elles sont ERRATIQUES — du bruit de
> convergence entre passes », et renvoyait le traitement à « un chantier à part entière, pas une
> correction ». **C'était faux.** Instrumenté passe par passe sur `10k/debutant/confirme/3s/6h/vr5`
> (`4:30 → 1282 · 5:45 → 1061 · 7:00 → 1319 · 8:30 → 1077`), il n'y avait ni bruit ni chantier :
> **une seule règle, une seule ligne, et un seuil.**
>
> **CE QUE LA MESURE A DIT, DANS L'ORDRE.** Avant réparation les quatre plans sont presque
> identiques (1311 · 1270 · 1340 · 1269, soit 5,6 % d'écart) : la divergence est CRÉÉE plus loin.
> La semaine de récup S7 délivre **190 min à 4:30 et 143 à 5:45** pour une cible identique de
> 198 — et le détail dit tout : **trois séances d'un côté, deux de l'autre**. La règle « une
> récup ne dépasse jamais sa voisine » trouvait S7 à **198 min contre 192 chez la voisine** —
> SIX minutes au-dessus de sa borne — et les payait avec une séance de **55 min**. Un
> dépassement de 3 % réglé par une coupe de 25 %, neuf fois trop.
>
> **`cutSmallestSessionIn` est TOUT-OU-RIEN**, donc une minute d'écart chez la voisine bascule
> une séance entière hors de la semaine ; et la semaine de récup ainsi amputée devient la
> référence de tout ce qui suit. Aucune règle ne « penchait » selon l'allure : c'est le SEUIL qui
> est brutal, et l'allure ne faisait que décider de quel côté on tombe. Ce que l'entrée lisait
> comme du bruit était une marche.
>
> **LE CORRECTIF ÉTAIT DÉJÀ ÉCRIT QUINZE LIGNES PLUS HAUT.** La règle de monotonie de l'AFFÛTAGE,
> dans le même bloc, réduit d'abord le corps des séances (`scaleWeekBody`) et ne coupe un jour que
> si les planchers empêchent d'y arriver. La règle de la récup sautait directement à la coupe.
> C'est aussi la décision déjà prise deux fois dans ce dépôt — **C29/C29b/C29c : « l'affûtage
> réduit le VOLUME, pas la FRÉQUENCE »** — jamais rejouée ici. La borne se paie donc en volume,
> la fréquence ne cédant qu'en dernier recours.
>
> | sur 432 profils × 4 allures | avant | après |
> |---|---|---|
> | **pire inversion entre deux allures voisines** | **+24,3 %** | **+5,0 %** |
> | dispersion p90 | 5,0 % | 4,6 % |
> | dispersion médiane | 0,7 % | 0,6 % |
> | profils non monotones (> +2 %) | 73 (16,9 %) | 67 (15,5 %) |
>
> **CE QUI NE BOUGE PAS, ET POURQUOI CE N'EST PAS UN DÉFAUT.** La dispersion MAX reste à 36,1 %,
> et le profil qui la porte est `semi/inter/reprise/3s/6h/vr5 : 2413 2291 2188 1773` —
> **strictement DÉCROISSANT** de l'allure rapide à l'allure lente. Ce n'est pas une inversion :
> c'est la variation monotone que les bornes de séance produisent légitimement (O17 l'a déjà
> arbitrée). La grandeur qu'O-21 nomme est l'INVERSION, et c'est elle qui tombe de 24,3 à 5,0 %.
> Le compte de profils non monotones bouge peu parce que les résidus sont désormais de petites
> oscillations à ±4 % (`937 928 970 896`), pas des marches de 20 %.
>
> **ET LE GOLDEN A REFAIT L'ANGLE MORT QUE CETTE ENTRÉE AVAIT ELLE-MÊME NOMMÉ.** Sa 1ʳᵉ
> correction écrivait « le golden ne bouge pas parce que ses profils portent tous une date » —
> la leçon n'avait pas été appliquée, et les 945 profils rendaient **0 écart** face à ce
> correctif. Une sous-passe `O-21b` est ajoutée (**945 → 949**). **Ma première écriture de cette
> passe était DÉCORATIVE et c'est mesuré** : elle héritait du `dispo: "semaine"` du profil de
> base, sous lequel les quatre allures rendent le MÊME plan à la minute près (1 487 min) — elle
> surveillait du vide, pendant que son commentaire affirmait le contraire. Avec
> `dispo: "quotidienne"` elle discrimine, **vérifiée en retirant le correctif : 2 écarts, sur
> 5:45 et 8:30 exactement.** Cinquième occurrence de cette famille (A-2, N2, C30b, PW).
>
> Garde CI : **`O-21b`** au banc v6, deux moitiés — la fréquence des semaines de récup ne dépend
> pas de l'allure (le mécanisme) ET aucune allure plus lente ne reçoit un plan plus gros de plus
> de 6 % (l'inversion) —, **vérifiée rouge** en repassant la borne au paiement par la fréquence.
>
> ─────────────────────────────────────────────────────────────────────────────────────────────

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
>
> ─────────────────────────────────────────────────────────────────────────────────────────────
>
> **CORRECTION DU 05/08/2026 (« corrige », fondateur) — ET LA QUESTION CI-DESSUS N'ÉTAIT PAS LA
> BONNE.** C30 a mesuré depuis que la sortie longue est prescrite en TEMPS depuis toujours
> (`durCaps` en minutes) : entre 5:45/km et 7:00/km sur un 10 km elle fait 178 min contre 176.
> Le dilemme « distance ou temps » n'était donc pas le mécanisme. Instrumenté passe par passe sur
> le même profil à deux allures, il y en avait **deux**, et aucun n'est un arbitrage :
>
> **(1) Le remplissage d'I14b est structurellement MORT sur une semaine plate.** I14 ramène chaque
> séance à la durée de la sortie longue ; le plafond des receveuses du remplissage
> (`0,80 × longue`, R20.3) tombe alors SOUS cette valeur, `place` est négatif, et rien n'est rendu.
> Mesuré sur un 10 km à 4 séances : quatre séances à 41-43 min pour une longue de 41, `_labelCut`
> à **27 min par semaine**, et le remplissage en rendait **zéro**. Ce sont les semaines de PIC et de
> SPÉCIFIQUE qui portent le plus de qualité par rapport à leur longue, donc ce sont elles que I14
> coupe le plus — la périodisation s'inversait. Ce qui reste à rendre va désormais à la **sortie
> longue elle-même** : ce ne sont pas des minutes ajoutées, ce sont celles que la même passe vient
> de retirer à la même semaine, et une longue plus longue RELÈVE le plafond d'I14 au lieu de le
> violer.
>
> **(2) La garantie A2/I1 se rabattait sur une semaine de pic en RÉCUPÉRATION.** Son `peakBest`
> lisait `peakAny` faute de `peakNR` : sur une prépa dont l'unique semaine de pic est une décharge
> — le cas exact que la première moitié de cette entrée avait documenté côté AUDITEUR — tout le
> plan était raboté au volume d'une semaine de récup. **Et deux fois** : `D4` réduit ensuite cette
> semaine, donc le second passage de `reconcileDeclaredVolume` repart d'un plafond plus bas.
> Mesuré sur un 10 km à 6 séances : **1032 → 807 min au deuxième passage, sur une entrée
> IDENTIQUE**, quand le même profil à une allure plus lente (donc avec un pic en charge) ne perdait
> que 36 min. L'auditeur avait déjà tranché ce cas en AVERTISSEMENT ; le générateur dit maintenant
> la même chose que lui — deux réponses à la même question, c'est ce que R11.1 interdit.
>
> **PORTÉE, sur 432 profils × 4 allures** (la dispersion du total livré sur l'axe allure, à
> entrées identiques par ailleurs) :
>
> | | avant | après |
> |---|---|---|
> | dispersion médiane | 0,7 % | **0,7 %** |
> | dispersion p90 | 16,2 % | **5,0 %** |
> | dispersion max | 44,1 % | **36,1 %** |
> | pire inversion entre deux allures voisines | +38,7 % | **+24,3 %** |
> | profils non monotones (> +2 %) | 83 (19,2 %) | 73 (16,9 %) |
>
> **CE QUI RESTAIT APRÈS CE 2ᵉ MÉCANISME.** Le p90 tombe de deux tiers — la queue longue est
> traitée — mais le **compte** de profils non monotones bouge à peine, et le maximum reste à 36 %.
> Les séquences résiduelles ne sont pas monotones dans un sens ou dans l'autre, elles paraissent
> **erratiques** (`845 846 847 903`, `1282 1061 1319 1077`), d'où le diagnostic posé ici :
> « du bruit de convergence entre passes », à traiter en rendant le point de convergence
> idempotent — « un chantier à part entière, pas une correction ».
>
> ⚠️ **CE DIAGNOSTIC ÉTAIT FAUX, et le bloc en tête de cette entrée le remplace.** Il n'y avait
> ni bruit ni chantier : une seule règle (« une récup ne dépasse jamais sa voisine ») qui payait
> six minutes de dépassement avec une séance de 55 min. Ce qui ressemblait à du bruit était une
> MARCHE, et l'allure ne faisait que décider de quel côté on tombe. La leçon est gardée écrite :
> conclure « c'est du bruit » sans avoir instrumenté passe par passe, c'est refermer une piste
> avec une hypothèse — et ici cette hypothèse a coûté une correction reportée.
>
> **La dette `O17` du banc v6 est PAYÉE dans le commit de la correction** (protocole du dépôt) :
> son `expect` repasse à `'pass'`, et le témoin n'a pas été réécrit — c'est le moteur qui a changé.


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
quoi: le résidu d'inversion sur l'axe allure, après les TROIS mécanismes corrigés (05/08/2026). Ce profil-ci (inter, 4 séances) n'était pas de ceux que le 3e touche — son résidu de 0,2 % est inchangé, et c'est la raison pour laquelle il reste le témoin : il mesure la queue, pas la marche. La marche, elle, est épinglée par `O-21b` au banc v6 et par la sous-passe golden du même nom.
attendu: /inversions d'allure : 1 /
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const P=(pace,vr)=>({intent:'competition',format:'10k',med_pain:'non',med_dizzy:'non',med_treat:'non',age:'32',sex:'H',weight:'75',height:'178',level:'inter',history:'confirme',injury:'aucune',sessions_max:'4',vol_max:'6',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',pace_known:'oui',pace,vol_recent:String(vr),terrain:'route'});const tot=(p)=>p.weeks.reduce((t,w)=>t+w.days.reduce((a,d)=>a+d.sessions.reduce((u,s)=>u+(s.race?0:s.min||0),0),0),0);let ko=0,mx=0;for(const vr of [0,5]){const rapide=tot(E.buildPlan('run',P('5:45',vr))),lent=tot(E.buildPlan('run',P('7:00',vr)));if(rapide<lent){ko++;mx=Math.max(mx,100*(lent/rapide-1));}}console.log(\"inversions d'allure : \"+ko+' · écart max '+mx.toFixed(1).replace('.',',')+' %');"
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
cmd: grep -n "y.i - x.i" endurabuild/js/state.js
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

### O-26 · La sortie longue n'atteignait pas sa cible de spécificité · ✅ **FERMÉ — C30b (décision du fondateur, 05/08/2026)**

Trouvé en implémentant **C30** (« se rapprocher du temps visé sur l'épreuve a minima, et au moins
70 % de la distance »). La règle était écrite, juste, et ne faisait presque rien : **7 profils
déplacés sur 180**, cibles atteintes **31/48**.

**Décision du fondateur (05/08/2026)** : *« oui si elle respecte les plafonds ; en semaine de pic,
la sortie longue peut représenter 70 % du volume de semaine si nécessaire »*. Livré sous **C30b**
(`raiseLongRunToSpecificity`, `planGenerator.ts`) : la longue monte vers sa cible, et les minutes
sont **PRISES aux séances faciles de la même semaine** (R4.1 — jamais à la qualité). Le volume de
la semaine ne bouge pas d'une minute : c'est une redistribution, pas une charge en plus, et c'est
ce qui la rend compatible avec « si elle respecte les plafonds ».

**Cibles atteintes 31/48 → 46/48 ; 28 profils déplacés sur 96** (4 formats × 3 niveaux ×
4 allures × 2 enveloppes), tous en 10 km et en semi, tous chez des coureurs à 5:45/km et plus
lents. Le plus gros déplacement : **10 km @ 8:30/km, 47 → 76 min**, +62 %, sur exactement la
population pour laquelle C30 avait été écrit. Aucun profil à 4:30/km (le rapide atteignait déjà
sa cible), aucun sur marathon (la longue y est au plafond C23 depuis toujours, C31 prend le
relais). Les **2 profils restants** manquent leur cible de **2 minutes** : les séances donneuses
sont à leur plancher, il n'y a plus rien à déplacer.

**Trois choses que la mesure a corrigées dans mon travail, gardées écrites.**

**(a) Ma première écriture faisait son travail puis se le faisait annuler.** Placée juste après
`refillEasyAfterLabelCap`, elle montait bien la longue d'un débutant sur 10 km de 55 à 64 min sur
quatre semaines — puis `enforceHardTimeCap` rabotait le total de la semaine et le point fixe C22
la rescalait **proportionnellement** : 64 → 57, 53, 55. Trois gains sur quatre effacés, et la
mesure finale disait « la passe est inerte » alors qu'elle agissait puis était défaite.
**Douzième paiement de la leçon du point fixe**, cette fois sur ma propre passe. Elle est rejouée
après le point fixe — ce qu'elle peut se permettre parce qu'elle est neutre en volume, ne déplace
que des minutes faciles (donc hors d'atteinte de C26c/C26d) et ne fait que MONTER la longue (donc
va dans le sens d'I14 au lieu de le rouvrir). Elle est aussi rejouée dans le **dernier**
`reconcileDeclaredVolume`, celui du `repairLoop` : c'est lui dont la sortie est livrée.

**(b) « Semaine de pic » n'existe pas comme phase sur une prépa courte.** Restreinte à
`phase.id === "peak"`, la passe se déclenchait **0 fois sur les 48 profils de la grille** — parce
qu'une prépa de 5 km ou de 10 km n'a **aucune** semaine de phase `peak` (base → dev → spec →
taper), et que c'est justement la population que C30 sert le plus mal. « En semaine de pic » se
lit donc sur la CHARGE quand la phase n'existe pas : les semaines les plus lourdes du plan, celles
que l'athlète appelle sa plus grosse semaine. Même famille qu'**O-21**, qui a dû dire ce que vaut
« dev ≤ pic » quand aucune semaine de pic ne porte de charge. La cohorte se lit sur la courbe
**déclarée** et non sur les minutes livrées — mesuré, une cohorte calculée sur les minutes changeait
entre deux passages et une semaine portée à sa cible en sortait au second.

**(c) La borne des 70 % n'a encore jamais mordu, et c'est publié.** Part de la longue mesurée :
**médiane 33 %, maximum 55 %** — la permission du fondateur laisse 15 points inutilisés. Cassure
délibérée : porter la borne à ×9 (donc la retirer) **ne change rien** (`K4` verte). Ce qui borne
réellement, c'est le **plafond de séance du format** (5 km 74, 10 km 90, semi 130, marathon 180).
C'est le pendant exact de la moitié « 70 % de la distance » de C30, elle aussi jamais mordante :
la règle du fondateur est respectée dans les deux sens, et le facteur limitant est ailleurs.

**Ce qui n'a PAS été fait, et pourquoi.** Les trois issues envisagées en ouvrant cette entrée —
indexer le volume utile sur le TEMPS de course (1), élargir la part hebdomadaire (2), assumer et
le dire (3) — sont tranchées par la mesure : (2) est livré et suffit, (1) reste une refonte de
`UTIL` et de la sonde de capacité que rien ne réclame plus, (3) n'a plus d'objet sur 46 profils
sur 48. `blockBounds` continue de remplacer le plancher déclaré par son « plancher digne »
forfaitaire (décision D3-D7/D10 de l'audit v6) et **c'est très bien ainsi** : forcer ce plancher
avait été mesuré et rendait les choses PIRES (30/48 au lieu de 31). Le correctif ne passe pas par
le plancher, il passe par la répartition.

**Gardes** : `C30-A` (banc v6) re-épinglé sur les valeurs livrées, avec les **trois états
successifs** écrits (sans rien → C30 seul → C30b) et quatre témoins qui ne doivent pas bouger ;
`C30b-A` (nouveau) porte le mécanisme — part ≤ 70 %, chiffre de la décision relu sur le plan
LIVRÉ, et neutralité en volume vue du dehors (la semaine ne dépasse pas sa courbe annoncée).
**Vérifiées rouges sur trois cassures sur quatre** ; la quatrième est le résultat (c) ci-dessus.
Le golden gagne une sous-passe `C30b/run/10k` — sa passe « allure » existante regardait
`vol_max: 10`, la bonne enveloppe pour C31 mais la mauvaise pour C30b (à 10 h la longue est déjà
butée sur son plafond aux trois formats), **quatrième occurrence du même angle mort qu'A-2**,
vérifié en retirant C30b du moteur.

```verify
id: O-26
quoi: C30b porte la sortie longue à sa cible de spécificité et la garde sous 70 % de la semaine
attendu: /cibles C30b : 6\/6 · part max \d+ %/m
cmd: node -e "require('./endurabuild/js/engine.js');const E=globalThis.EBV2;const P=(o)=>E.buildPlan('run',Object.assign({intent:'competition',med_pain:'non',med_dizzy:'non',med_treat:'non',age:'32',sex:'H',weight:'75',height:'178',history:'confirme',level:'inter',injury:'aucune',sessions_max:'5',dispo:'quotidienne',shift_ok:'oui',off_days:'non',doubles:'oui',pace_known:'oui',vol_recent:'3',terrain:'route'},o));const M={'10k/8:30/8':79,'10k/7:00/6':64,'semi/8:30/8':130,'semi/7:00/6':130,'10k/4:30/8':59,'marathon/4:30/8':180};let ok=0,part=0;for(const k in M){const [format,pace,vol_max]=k.split('/');const p=P({format,pace,vol_max});let s=0;p.weeks.forEach(w=>{const ss=w.days.flatMap(d=>d.sessions).filter(x=>x.d!=='rs');const t=ss.reduce((a,x)=>a+(x.min||0),0);ss.forEach(x=>{if(x.long&&(x.min||0)>s)s=x.min;if(x.long&&t)part=Math.max(part,100*(x.min||0)/t);})});if(s===M[k])ok++;}console.log('cibles C30b : '+ok+'/6 · part max '+Math.round(part)+' %');"
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

### O-30 · Les seuils XP 17-30 de l'avatar composite sont une extrapolation NON calibrée · ⏳ **OUVERT — dette déclarée, décision produit**

R25 fait passer l'avatar de 16 à **30 niveaux par discipline**. Les 16 premiers seuils sont les
seuils HISTORIQUES décalés d'un cran (le niveau 0 — silhouette nue — existe désormais) : pour un
compte existant, même XP → même visuel, c'est la non-régression, elle se lit en XP et non en
numéro de niveau, et elle est gardée par `demo:avatartri` (10 XP → niveau 1, 3 500 → 15).

Les seuils **17 à 30** (4 500 … 120 000) n'ont, eux, AUCUNE base mesurée : ils prolongent la
courbe des 16 premiers par une progression « qui a l'air raisonnable ». À 10 XP la séance
(repos exclu), le niveau 30 d'une discipline demande ~12 000 séances validées — c'est
délibérément « une carrière », mais personne n'a décidé si la carrière visée est de 5 ans ou de
30. Le risque n'est pas technique : un palier trop lointain cesse de motiver (le teaser
« prochain : … » devient un horizon), un palier trop proche brade l'or. La calibration demande
des données d'usage réelles qui n'existent pas encore — la même exigence qui a fait retirer ma
première calibration de P11 (un cas unique ne calibre rien, HERITAGE).

Ce qui est VERROUILLÉ en attendant : les seuils sont épinglés (le bloc ci-dessous rougit si
quelqu'un les bouge « en passant »), monotones, bornés à 30, et le niveau ne décroît jamais
(l'XP est un cumul). Réviser les seuils 17-30 est une décision PRODUIT du fondateur, pas un
correctif — le jour venu, la migration devra relire ce paragraphe : changer un seuil change le
niveau AFFICHÉ d'athlètes existants, et l'avatar ne doit jamais se déshabiller (la règle
d'AV3-C, étendue à une refonte de barème).

```verify
id: O-30
quoi: les seuils 17-30 restent épinglés tels que déclarés (extrapolation assumée, pas calibrée)
attendu: /10->1 · 3500->15 · 119999->29 · 120000->30 · monotone OUI/
cmd: node -e "import('./src/app/bridge.ts').then(m=>{const L=m.avatarTriLevel;let mono=true;for(let x=0,p=0;x<=130000;x+=250){const l=L(x);if(l<p)mono=false;p=l;}console.log('10->'+L(10)+' · 3500->'+L(3500)+' · 119999->'+L(119999)+' · 120000->'+L(120000)+' · monotone '+(mono?'OUI':'non'));})"
```

### O-31 · `#ff3d00` porte TROIS sens sur le même écran · ⏳ **OUVERT — arbitrage de vocabulaire, décision fondateur**

Les trois accents de discipline ont été alignés sur la maquette (fondateur, 12/08/2026) après
mesure de leur contraste — natation 5,52 · vélo 4,34 · course 10,67, les trois au-dessus des 3:1
que WCAG 1.4.11 demande à un composant porteur d'information. La condition posée était donc
remplie, et les trois valeurs sont adoptées. Le fondateur avait joint un avertissement : *« #FF3D00
est déjà utilisé comme --zn-orange (couleur de marque/CTA) ; vérifie qu'aucune confusion visuelle
n'apparaît »*. **Elle apparaît, et elle est plus large que prévu** — ce n'est pas une collision à
deux termes mais à trois.

`#ff3d00` signifie désormais, sur la MÊME grille de semaine :

| sens | où | rendu |
|---|---|---|
| **attention / marque** | anneau de la carte du jour, héros 🎯, onglet actif, CTA | `#ff3d00` plein |
| **charge DURE** | bordure de carte d'un jour dur (`CHARGE.dur.rgb`) | `rgb(255 61 0 / .34)` |
| **discipline VÉLO** | tuile de badge (`DISC.bk.ac`) | `#ff3d00` plein |

Les deux premiers coexistaient déjà (la charge dure emploie ce triplet depuis avant V4, à 34 %
d'opacité — donc distinguable) ; **c'est le troisième qui est nouveau, et il est à pleine
saturation, comme le premier.**

**Mesuré, plutôt qu'estimé.** Sur 🗓 Plan : **2 éléments** portent l'orange au sens « attention »
contre **24 badges vélo** de la teinte identique — la couleur d'attention de la marque devient
12 fois plus fréquente comme *décoration* que comme *signal*. Sur 📅 Semaine, le balayage des sept
jours donne **2 jours sur 7** (mardi, jeudi) où l'anneau « aujourd'hui » entoure une carte dont le
badge est exactement de sa couleur — le seul cas mesuré où deux sens se superposent sur un même
objet. Et sur 🎯 Aujourd'hui un jour de vélo, le cas que le fondateur avait lui-même nommé
(« carte de séance avec CTA à proximité ») : le héros est peint du dégradé de marque partant de
`#ff3d00`, et le badge vélo est **79 px sous lui**, à la même valeur.

**Ce que ça coûte, dit franchement** : rien n'induit en erreur au sens fort — le badge est une
tuile de 26 px avec un pictogramme, l'anneau est un trait de 2 px sur un bord, le héros fait
362×348. La forme et la position les séparent. Ce qui se perd est plus discret : la couleur
CESSE de porter le signal à elle seule. Un athlète qui a appris « l'orange, c'est ce qui
m'appelle » doit désormais lire la forme pour trancher, et sur un jour de vélo l'écran 🎯 devient
quasi monochrome au moment précis où le badge devrait dire « c'est du vélo ».

**Pourquoi ce n'est pas corrigé ici** : les trois issues touchent au VOCABULAIRE de la marque, pas
à un défaut. (1) Ne rien changer — la maquette a été validée telle quelle, et la forme suffit
peut-être. (2) Sortir le marqueur « aujourd'hui » de l'orange — mais `zenna-tabs.css` écrit
explicitement « l'orange du thème EST déjà son vocabulaire d'attention, on n'invente pas une
seconde couleur d'accent », et le seul autre marqueur existant (`--zn-gold`) veut déjà dire
« échange en attente ». (3) Décaler le vélo hors de l'orange de marque — mais ce serait inventer
une couleur que la maquette ne porte pas, ce que ce lot s'est interdit. Aucune n'est un correctif
évident, les trois sont des décisions de design.

**Ce qui est verrouillé en attendant** : les cinq accents sont deux à deux distincts et chacun
tient ses 3:1 (`smoke-carte-seance` §3 et §6, vérifiés rouges) — donc la lisibilité est gardée
même si le vocabulaire ne l'est pas.

```verify
id: O-31
quoi: les trois sens partagent-ils toujours le triplet 255 61 0 ?
attendu: /marque #ff3d00 · charge dure 255 61 0 · velo #ff3d00 → COLLISION 3 sens/
cmd: node -e "import('./endurabuild/js/ui/icons.js').then(m=>{const fs=require('node:fs');const css=fs.readFileSync('endurabuild/css/zenna-today.css','utf8');const o=(css.match(/--zn-orange:\s*(#[0-9a-f]{6})/i)||[])[1];const d=m.CHARGE.dur.rgb,v=m.DISC.bk.ac;const t=d.split(/\s+/).map(Number);const coll=(o.toLowerCase()===v.toLowerCase())+(t[0]===255&&t[1]===61&&t[2]===0?1:0)+1;console.log('marque '+o+' · charge dure '+d+' · velo '+v+' → COLLISION '+coll+' sens');})"
```

### O-32 · Les quatre polices de R-ZENNA n'ont jamais été précachées · ✅ **FERMÉ (12/08/2026)**

Trouvé en ajoutant Poppins : `npm run build:sw` annonçait **57 assets** avant comme après l'ajout
de deux fichiers `.woff2`. La cause est le SECOND trou d'O-24, dans sa forme exacte. O-24 a rendu
la `VERSION` du service worker dérivée du contenu et la liste `ASSETS` dérivée du DISQUE — mais
seulement pour le `.js` et le `.css`. Les polices restaient écrites **à la main** dans `EN_DUR`,
sous un commentaire qui les déclarait « non listables par extension » : c'est faux, `.woff2` est
une extension comme une autre, et c'est cette justification erronée qui a fait passer la liste
pour intentionnelle.

La liste était restée à **trois** polices (Archivo Black, Space Grotesk, Caveat) — celles d'avant
R-ZENNA. Les **quatre** de R-ZENNA (`bebas-neue-400`, `inter-400-800`, `ibm-plex-mono-400`,
`ibm-plex-mono-700`) n'ont jamais été mises en cache depuis leur arrivée. **Le défaut est
invisible en ligne et net hors ligne** : l'app tient sa promesse « ça marche sans réseau », mais
pas avec sa typographie — tout le thème sombre retombait sur Archivo Black et une pile monospace
système. C'est la même famille que les trois modules vivants qu'O-24 avait trouvés dans cette
même liste, et la démonstration que le correctif d'alors était incomplet.

Correctif : les polices se lisent sur le disque comme le reste (`modules(dir, /\.woff2$/)`).
**57 → 63 assets** (les 4 oubliées + les 2 de Poppins). Au passage, `ASSETS` composait ses groupes
par `EN_DUR.slice(0, 3)` / `EN_DUR.slice(3)` — des indices qui devenaient faux dès qu'on ajoutait
une ligne à `EN_DUR`, ce que ce lot faisait justement ; les trois groupes sont NOMMÉS.

```verify
id: O-32
quoi: toutes les polices du disque sont précachées par le service worker
attendu: /manquantes 0$/m
cmd: node -e "const fs=require('node:fs');const d=fs.readdirSync('endurabuild/assets/fonts').filter(f=>f.endsWith('.woff2'));const sw=fs.readFileSync('endurabuild/sw.js','utf8');const m=d.filter(f=>!sw.includes('assets/fonts/'+f));console.log('disque '+d.length+' · precachees '+(d.length-m.length)+' · manquantes '+m.length+(m.length?' ('+m.join(', ')+')':''))"
```

### O-33 · La traçabilité sourcé/heuristique de `projection.ts` n'est fiable qu'au niveau du chapeau

Trouvé en expliquant P2/P2bis (retour du fondateur, 13/08/2026, sur un chrono projeté) : le
chapeau du fichier classe correctement `G_PLAFOND`, `k_structure`, `τ=20 semaines` et les bandes
de marge course/nage comme « heuristique convergente, pas d'étude princeps » — mais AU MOINS un
commentaire attaché à une constante individuelle contredisait cette classification. Le
commentaire sur `G_PLAFOND.ftp = 0.25` citait une plage « 20-30 %/an chez le NON-entraîné »,
alors que `G_PLAFOND` sert le régime ENTRAÎNÉ (`G_PLAFOND_DEBUTANT` est la table séparée pour le
non-entraîné) — corrigé le jour même (commentaire seul, aucun chiffre changé).

**Ce qui reste ouvert, et n'a pas été traité ici (décision du fondateur : pas urgent, pas cette
session)** : rien ne garantit que ce soit la SEULE incohérence du genre dans le module. Une
relecture complète voudrait vérifier, constante par constante (`K_STRUCTURE`, `ANCRES_VOLUME`,
`ANCRES_WKG`/`ANCRES_PACE`/`ANCRES_CSS`, `GAIN_BAND_LO/HI`, `ADHERENCE_FLOOR`…), que le
commentaire attaché dit correctement (a) sourcé vs heuristique et (b) à QUEL régime/discipline il
s'applique — le même type de confusion qu'O-33 a trouvé pour `ftp`, potentiellement ailleurs.
Aucune commande de vérification mécanisable : c'est une relecture humaine (ou par un futur agent)
de la cohérence prose ↔ usage réel, pas une propriété qu'un script peut trancher seul.

## §2 — Dette CHIFFRÉE et verrouillée (ne peut pas remonter)

Ces défauts sont connus, comptés, et un budget en CI les empêche d'empirer. Ils ne font pas
échouer la CI **par décision explicite**, pas par oubli.

### Banc v6 — 3 dettes (`npm run audit:v6` → « 64 vert · 3 dette connue · 0 régression »)

| id | ce qui reste | pourquoi c'est laissé |
|---|---|---|
| **D2** | 2 configurations sur 153 (`swim/sprint\|demifond/debutant/reprise`) portent encore une violation dure | Tout le plan tient entre 45 min et 1 h de nage par semaine, les 4 séances sont AU plancher (C15 : 850 m ; C20 : 0,42 h/séance) et l'écart semaine max ↔ pic est de 5 minutes. **Il n'y a plus de marge sous les planchers pour exprimer une hiérarchie.** Un rabotage a été tenté : sans effet, les planchers le reprennent immédiatement ; le code a été retiré plutôt que laissé inerte. |
| **D3** | 4 sauts de charge à **+11 %** au lieu de +10 % | Le rapport dev→peak de la courbe vaut 1,18, donc **supérieur à C22 par construction**. Sur un plan court à deux récups consécutives, C22 voudrait le pic ≤ 273 min quand la hiérarchie du plan le veut > 248 : les deux tiennent dans 25 minutes et les planchers de séance interdisent de descendre. Réduire encore ferait passer le pic SOUS une semaine de base — on échangerait une violation contre une pire. **La correction de fond est dans la FORME de la courbe, pas dans une passe de rattrapage.** |
_`O17` a quitté cette table le 05/08/2026 : sa dette est payée par la correction d'O-21, et son
`expect` est repassé à `'pass'` dans le même commit._

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
| ~~A-3~~ | ~~`R14.3-b` n'a **aucun critère automatique**~~ | ✅ **FAUX depuis R15.2 — déplacée au §4** : les critères existent (`R15.2-A/B/C/D`, gate `audit:r15`) et sont verts. |
| A-4 | Le monolithe `Coach_Pro_V1.5.html` a le moteur à jour mais son **UI est gelée à R4** | Les régressions d'interface introduites depuis (les onglets — 5 puis 4 en R16.9 —, carte Trail, étape terrain) ne s'y voient pas. C'est documenté et voulu — mais un utilisateur qui ouvrirait ce fichier verrait un produit d'il y a plusieurs lots. |
| ~~A-5~~ | ~~**Aucune vérité terrain pour la projection R14/R14.1**~~ ✅ **PREMIER GESTE FAIT (03/08/2026)** | `endurabuild/js/projection-log.js` — le journal existe. **Une entrée par semaine ISO** (la projection ne bouge pas d'un jour à l'autre : l'adhérence est une fenêtre glissante de six semaines, P1 — journaliser chaque ouverture coûterait sept fois le stockage pour la même information), portant de quoi REFAIRE le calcul sans le code de l'époque : horizon, références mesurées qui ont servi d'ancre, `gainPct`, `gainBand`, adhérence, confiance, temps annoncés par discipline, et le MOTIF quand le moteur refuse de projeter (P8 — un refus est une donnée). `noteRaceResult()` referme la boucle au passage du jour J en attachant le temps réel à la projection journalisée **à son horizon d'origine** : `raceResult.predicted` ne contenait que la prédiction RECALCULÉE le jour J, laquelle ne dit rien de ce que le moteur annonçait quatre mois plus tôt. **Ce qui reste à faire est HUMAIN** : la calibration se fait hors ligne, sur les données exportées, et seulement quand une POPULATION aura couru — P11 a montré qu'un cas unique ne calibre rien (HERITAGE). ⚠ **Le journal n'est relu par AUCUNE partie du moteur, et c'est sa garde principale** : un journal qui influencerait la projection serait une seconde source de vérité (R11.1/R20.5/U9) et, pire, une boucle qui se confirme elle-même — le moteur calibré sur ses propres annonces mesurerait sa cohérence au lieu de sa justesse. `A5-B` l'asserte au caractère près (`tests/e2e/smoke-projlog.mjs`, 16ᵉ suite E2E), avec le critère « l'empreinte SAIT voir un changement » sans lequel elle serait satisfaite par une mesure aveugle. Suite **vérifiée rouge** (7 critères sur 11) en désactivant le journal.
| A-7 | **Trois bancs datent encore leur `race_date` depuis `Date.now()` brut** — `bench_r15.cjs` (`iso(wk*7)`, trois usages), `audit_v6.mjs` (`isoIn`), `audit_amont.cjs` (« dans 3 semaines ») | La bombe A-6/R20.7 a mordu une **septième fois** le vendredi 07/08/2026 : `bench_r14_1.cjs` datait ainsi, et `R14.1-G` comparait deux plans dont les horizons ne basculaient pas le même jour — **rouge ce jour-là uniquement**, vert les six autres (vérifié en rejouant le banc aux sept dates). Corrigé pour r14.1 (ancré sur `courseDans`, vérifié vert les 7 jours). Les trois restants sont VERTS aujourd'hui et leurs critères semblent moins sensibles à l'horizon (refus mineurs, mutations d'entrée) — mais « semble » est exactement ce que cette famille punit. Les ancrer demande de re-vérifier chaque banc sur les sept jours, pas un `sed`. |
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

---

## O-34 — `RN_MARA_RATIO_PLANCHER` est un PANSEMENT, sa condition de sortie est écrite

**Ouvert le 14/08/2026** (arbitrage B-22, `ARBITRAGE_B22_PHASE2.md` §1).

Le plancher `1,05` sur la bande d'allure marathon dérivée (B-22) coupe l'extrémité
inatteignable de la prescription à haut volume (bord bas mesuré : 1,044 à 10 h/sem, 1,021 à
12 h). **Sa valeur est `inherited`** — un souvenir de littérature du fondateur, requalifié par
lui-même comme n'étant pas une source — et il **masque** le vrai défaut : l'extrémité rapide de
`RIEGEL_ANCRES` (10 h → 1,06 ; 12 h → 1,04) est une heuristique jamais calibrée, dont B-22 a
élevé l'enjeu en la faisant passer de la prédiction à la prescription.

**Condition de sortie** : la recalibration de `RIEGEL_ANCRES` (chantier B-21/B-04). Le jour où
elle est faite, ce plancher se RETIRE — le laisser deviendrait un deuxième modèle du même
phénomène. Préalable mesuré (§3.1 du même arbitrage) : le golden ne peut pas mesurer ces
chantiers — **96,7 % de ses profils portent `vol_max: 10`**, le défaut du profil de base
(famille A-2). Le premier livrable de B-21 est donc l'enrichissement du golden en volumes de
course variés, pas un correctif.

```verify
id: O-34
quoi: le plancher existe, est étiqueté inherited/PANSEMENT, et T-16b le garde
attendu: O34-REPRODUIT
cmd: grep -q "inherited" src/engine/predictor.ts && grep -q "RN_MARA_RATIO_PLANCHER" src/engine/predictor.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "T-16b \[vert" && echo "O34-REPRODUIT"
```

## O-35 — la chaîne de volume R20.2 ne se ferme pas en unité sur la natation (et le trail)

**Ouvert le 14/08/2026** (en écrivant T-25, le test d'identité `min(plafonds) × ∏(facteurs)
=== volPeak` du DOC_UNIQUE §3).

L'identité a mordu **dans les deux sens sur le même sport**, ce qui prouve une faute d'UNITÉ
et non un maillon manquant simple (cinquième occurrence de la famille V-11/O-13) :

- **natation débutant** : la chaîne annonce un « min » de plafonds à **1,44–2,03 h** pour des
  pics livrés à **0,7–0,9 h** (pire : `swim/fond/reprise/debutant`, 61 % d'écart). La sonde
  V2.1 elle-même y mesure **2,0 h** de capacité structurelle pour des semaines qui livrent
  0,5–0,7 h — son clone saturé en continu ne voit pas les plafonds C15/C24b du rendu discret.
- **natation inter/avancé** : les mêmes formules donnent des « plafonds » à **2,16 h** pour
  des pics livrés à **3,7 h** — le plan dépasse son propre plafond annoncé, donc le facteur
  `swimTime` est appliqué à une grandeur qui ne le porte pas (81 profils, + 38 en trail où la
  charge 3 axes fait la même chose).
- Une conversion `× swimTime` de la courbe a été **essayée puis retirée** : ajustée sur UN cas
  (le débutant), elle inversait l'identité sur 148 profils — calibrer sur un cas est
  exactement ce que P11/HERITAGE interdit.

**Mitigation en place** : la GARDE D'OBSERVATION du sélecteur — un plafond que le pic livré
dépasse n'a pas borné le plan et sort des candidats au message. Le record `plan._r202` expose
l'énumération complète, écarts compris.

---

### ✅ MOITIÉ FERMÉE le 14/08/2026 — la conversion portait sur les TABLES, pas seulement sur la
### déclaration (§5 de l'arbitrage `sw.aero`)

**Le test décisif exigé** (« `capacityH` est-il en heures génériques ou en heures d'eau ? ») a
une réponse mesurée : `capacityH` est en heures d'EAU (il compte des minutes réellement
prescrites). **C'est `peakH` qui était générique** — mesuré sur `swim/demifond` non-débutant :
`peakH` = 6,00 h pour un `volPeak` de 2,40, **rapport 2,50 = 1/0,4 au chiffre près**, quand le
témoin course rend 1,00. Et l'unité changeait avec le NIVEAU : C20 rabote `peakH` avec une
grandeur en heures d'eau (25 min/séance), donc le débutant avait déjà l'unité d'arrivée.
Conséquence : **la sonde V2.1 mordait TOUJOURS en natation** et servait de convertisseur
d'unité par accident — un garde-fou de sécurité qu'on ne pouvait plus lire.

**Trois modèles ont été mesurés avant d'en adopter un** (règle 7 étendue aux alignements) :

| | modèle | rayon sur les 949 | verdict |
|---|---|---|---|
| A | l'état d'avant (`peakH` générique) | — | la promesse ment de 1,6× |
| B | convertir `peakH` comme `volPeak` | 123 profils, **92 baisses jusqu'à −55 %** | **REFUSÉ** — le plan tombe à 3 séances de 15 min |
| **C** | **convertir la seule DÉCLARATION** | **88 profils, 47 au plan intact, 41 à ±6 %** | **ADOPTÉ** |

**Pourquoi C** : `SWIM_TIME_FACTOR` code « 60 % du temps déclaré en BASSIN n'est pas de la
nage » — c'est une conversion de la grandeur que l'ATHLÈTE déclare, pas des tables du moteur.
`HISTORY_CAPS`/`UTIL` sont du volume d'entraînement, au même titre que les lignes course et
vélo qui ne subissent aucune conversion ; les convertir pénalisait une seconde fois. R20.7
avait déjà posé ce principe sur la rampe (elle convertit `vol_recent`, jamais une table) —
C ne fait que l'appliquer partout. Et l'argument décisif : **sous C, le plan livré ne bouge
pratiquement pas**, parce que la courbe est pilotée par `peakH`, qui n'a jamais été converti :
le moteur traite les tables comme des heures d'eau **depuis toujours**. C ne change pas le
plan, il aligne la PROMESSE sur le plan déjà livré (`swim/sprint/reprise/inter` : 700 min
avant, 700 min après ; promesse 1,1 h → 2,0 h, pic réel 1,78 h).

**Conséquence sur B-09** : la sur-pénalisation redoutée (« 0,4 trop bas pour un nageur en
club ») venait de l'application aux TABLES, pas de la valeur. B-09 (facteur indexé sur
l'historique + activé en tri) n'est pas fermé, mais il perd son urgence — et sa valeur reste
une constante nouvelle, donc un arbitrage.

`swimTime` a QUITTÉ la liste des facteurs de la chaîne R20.2 : ce n'est pas une réduction,
c'est une conversion, et annoncer « ce qui réduit le plus, c'est le temps passé dans l'eau »
était faux — rien n'est retiré. L'explication vit sur le plafond `declared`.

**T-25 : 439 → 368.** **T-23 passe de 22/218 (10 %) à 61/177 (34 %) — et 34 % est le taux
HONNÊTE, 10 % était le mensonge** (rectification du fondateur, 14/08) : le correctif retire une
compensation qui MASQUAIT l'autre moitié du défaut. Deux erreurs qui se compensent ne font pas
un modèle juste, elles font un modèle dont on ne peut plus mesurer l'erreur — la forme de
`ρ = 1,225` compensant `Crr = 0,004`. Un taux qui monte quand on corrige est le signe que la
mesure devient exploitable, pas une aggravation.
Les plafonds n'étant plus déflatés par 0,4, l'écart entre ce que la sonde annonce et ce que la
semaine livre devient visible (nage débutant : « la durée de ta préparation, 1,6 h/sem » pour un
pic livré à 0,7). Deux erreurs se compensaient ; en corriger une seule expose la seconde. Elles
ont le même ticket — la suite d'O-35 ci-dessous.

**Un site NON converti, et c'est une mesure, pas un oubli** : `sessionScale` compare bien
`volMax` (piscine) à `util` (table) quand la déclaration borde. P11 exige de corriger un piège
d'unité sur TOUT le chemin, la conversion a donc été écrite — puis **RÉFUTÉE** : `audit:v1`
remonte alors une violation DURE du manifeste (`swim/sprint/ancien/debutant`, « 1 saut > +25 %
de volume réel entre semaines de charge »). Diviser l'échelle des séances par 2,5 les envoie
toutes sur leurs planchers C24/C24b, et une semaine épinglée au plancher ne suit plus la
courbe : la progression devient un escalier. Priorité 2 du manifeste contre cohérence d'unité —
la sécurité gagne. Il ne mord que sur les profils déclarant PEU de piscine, que le golden ne
contient pas (tous à `vol_max: 10`, famille A-2).

**Cette dette a un BLOQUEUR qui est une autre garde, donc elle ne se paiera jamais toute
seule** (exigence du fondateur, 14/08/2026) — elle porte sa condition de sortie, comme le
plancher 1,05 (O-34) et l'ancrage `[1,5 h → 1,15]` :

```
sessionScale — unité non convertie
  cause du blocage : la conversion produit un saut > +25 % entre semaines de charge
                     (audit:v1, swim/sprint/ancien/debutant) parce que les séances tombent
                     toutes sur leurs planchers C24/C24b et cessent de suivre la courbe
  hypothèse de sortie : convertir ET re-dériver la rampe R10 depuis la base convertie, pour
                        que la progression soit RECALCULÉE au lieu de sauter
  condition de sortie : le saut inter-semaines reste sous le plafond C22 après re-dérivation,
                        mesuré sur les 949 — et `audit:v1` reste à 0 violation dure
  si l'hypothèse est fausse : la dette devient une DÉCISION permanente et se requalifie comme
                        telle (« sessionScale reste en unité déclarée, par arbitrage »), elle
                        ne reste pas en attente
```

### 2ᵉ MOITIÉ (14/08, même jour) — la sonde n'était pas la cause principale : LE DIAGNOSTIC
### ENTIER VIVAIT AU MILIEU DU PIPELINE

La re-sonde demandée est écrite (clone SATURÉ de la semaine LIVRÉE — mesurer les minutes
livrées rendrait l'identité vraie par construction, donc vide ; une passe, jamais de point fixe,
résolution B-25). Elle corrige ce qu'elle devait corriger — plafond structurel 2,03 h → **0,85 h**
chez le nageur débutant. Mais T-25 est MONTÉ (368 → 432), et l'instrumentation a désigné plus
gros : **`reconcileDeclaredVolume` — le point fixe — tourne à la ligne 3322, le bloc « C6 +
R20.2 » était à 2998.** Le pic annoncé et toute la chaîne d'explication décrivaient donc
l'avant-dernier état du plan, avant I14, C26c/d, le rattrapage d'I14b, C30b, les planchers et la
fréquence. Onze fois ce dépôt a payé cette leçon sur des GARANTIES ; ici c'était le DIAGNOSTIC.

**Déplacé après le point fixe**, `volPeak` recompté sur les séances livrées (`w.vol` est un
instantané figé à la construction de la semaine). Ce que ça découvre :

| | |
|---|---|
| profils dont le pic ANNONCÉ change | **350 / 945 (37 %)** |
| sens | **350 baisses, 0 hausse** |
| écart médian · pire cas | **7,1 %** · `run/10k/ancien/debutant` **4,9 h annoncées → 3,4 (−30,6 %)** |

Le moteur promettait plus qu'il ne livre sur 37 % des profils, toujours vers le haut, sur le
seul chiffre que l'athlète lit comme « son pic » — la doctrine V2.1 dit « promettre davantage
serait mentir ».

### Ce qui RESTE ouvert — CE QUE LE POINT FIXE RETIRE n'est porté par aucun maillon

T-25 monte à **608** avec le `volPeak` honnête, et c'est le taux exploitable : rendre un membre
de l'identité exact élargit l'écart avec l'autre, qui décrit toujours un état d'avant le point
fixe. La cause n'est plus « le rendu discret » en général — elle est nommée : **I14, C26c/d, les
planchers et la fréquence retirent des minutes qu'aucun plafond de la chaîne ne déclare.**

**Condition de sortie** : instrumenter `reconcileDeclaredVolume` pour qu'il DÉCLARE ce qu'il
retire et pourquoi (un maillon par garantie, dans l'unité du pic), puis passer `T-25` et `T-23`
à `attendu: "vert"` dans le même commit. Le trail (38 profils livrant au-dessus de leur plafond
annoncé) relève de la charge à 3 axes, non traitée.

**Condition de sortie** : faire mesurer à la sonde V2.1 ce que la semaine RENDUE livre
réellement, puis passer `T-25` et `T-23` à `attendu: "vert"` dans le même commit.

```verify
id: O-35
quoi: la conversion ne porte que sur la declaration, et le residu « rendu discret » garde T-25 rouge
attendu: O35-REPRODUIT
cmd: grep -q "GARDE D'OBSERVATION" src/generator/planGenerator.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -A1 "T-25" | grep -q "identité(s) cassée(s)" && echo "O35-REPRODUIT"
```

## O-36 — la coupe et l'auditeur ne comptent PAS dans la même unité, et les aligner casse O-21

**Ouvert le 14/08/2026** (trouvé en isolant les régressions de B-02).

`enforceHardTimeCap` (la coupe) mesure les minutes dures avec `intensitySplit(s)` — donc les
**refs de repli** (130 s/100 m, 330 s/km). L'auditeur, lui, mesure avec les **refs de
l'athlète** (`reasoned.baseRefs`). Deux définitions du mot « minute dure » dans le même moteur,
sur un bloc exprimé en DISTANCE : `5×1000 m` compte 27,5 min pour la coupe quelle que soit
l'allure, 22,5 min à 4:30/km et 42,5 min à 8:30/km pour l'auditeur.

C'est exactement la faute que R20.5 a fermée sur la CLASSE (`bk.rp` dur ou modéré selon la
bande) — ici elle porte sur l'UNITÉ, et elle a survécu.

**Et la corriger casse une autre garantie, mesuré** : threader les refs de l'athlète jusqu'à la
coupe rend le plan SENSIBLE À L'ALLURE, ce que la famille O-21 interdit. Banc v6 avec
l'alignement : `O-21b` rouge (« la fréquence des semaines de récup dépend de l'allure :
4:30 → 3, les trois autres → 2 ») et `C30-A` rouge (`semi/inter/4:30` 120 → 128). Sans
l'alignement : **73 verts, 0 régression**.

Autrement dit : **l'incohérence d'unité est ce qui rend aujourd'hui le plan indépendant de
l'allure déclarée.** Le repli aveugle de la coupe fait office de neutralisation.

**Ce que ça demande** : trancher lequel des deux invariants prime, et l'écrire.
- soit la coupe est aveugle à l'allure PAR CONCEPTION (et le commentaire doit le dire, avec
  O-21 comme raison — aujourd'hui c'est un accident) ;
- soit les deux unités s'alignent et O-21 se rediscute pour les blocs en distance, dont la
  durée dépend RÉELLEMENT de l'allure — un 5×1000 m ne coûte pas le même temps à 4:30 et à
  8:30, et prétendre le contraire est aussi une fiction.

Non tranché ici : c'est un arbitrage d'entraînement, pas un correctif.

```verify
id: O-36
quoi: la coupe mesure sans les refs de l'athlete, et c'est ce qui garde O-21b vert
attendu: O36-REPRODUIT
cmd: grep -q "intensitySplit(s as never).hardByDisc" src/generator/planGenerator.ts && npm run audit:v6 2>/dev/null | grep -q "0 régression" && echo "O36-REPRODUIT"
```

---

## O-37 — I14 est rouvert APRÈS sa propre application, sur 441 semaines du golden

**Trouvé par le sceau T-27 le jour où il a été posé** (15/08/2026), c'est-à-dire par exactement
le mécanisme pour lequel il existe : un invariant tenu au milieu du pipeline, rouvert par ce qui
vient après, sans que rien ne l'attrape.

I14 déclare que **la sortie longue est la plus longue séance de sa discipline dans sa semaine**.
`enforceLabelVsDose` l'applique, deux fois, et le prédicat du sceau est RECOPIÉ du sien (mêmes
exclusions : `race`, `brick`, `long`, même discipline) — ce n'est donc pas une règle voisine
mesurée à la place de la bonne.

| | |
|---|---|
| semaines en violation, golden | **441** (sur 945 profils) |
| profils touchés, balayage 702 | **151** |
| exemples | `run/5k/reprise/debutant/competition` S2 : « Seuil doux » **52 min** > longue 48 · `run/5k/confirme/inter/finir` S5 : « VO2max » **45** > longue 44 |

**Les écarts sont petits** (quelques minutes) et c'est ce qui les a laissés passer : aucun gate
ne compare ces deux séances à la SORTIE. `audit:invariants` porte bien I14, mais sur
**54 configurations** ; le sceau le mesure sur les 945.

**Piste, non vérifiée** : `enforceLabelVsDose` compare des `sx.min` et réduit sur
`totalOf(sx)` = somme des `st._min`. Si les deux grandeurs diffèrent (la récup inter-blocs entre
dans `_min` depuis R5.6a), la passe vise un nombre et en mesure un autre — la onzième occurrence
de cette famille. À vérifier avant d'écrire un correctif : ce serait une cause, pas la seule
possible (les planchers de `shrinkTo`, `Math.max(5, …)` et `if (!touched) break`, laissent un
résidu que le commentaire de la passe assume déjà).

**Non corrigé délibérément** : rendre bloquant un invariant dont on n'a pas trié les 441 échecs
figerait la dette au lieu de la traiter — c'est la leçon de R20.6, et l'ordre qu'elle impose est
« mesurer, trier, PUIS bloquer ». Le compte est épinglé au cliquet de T-27 : il ne peut plus
monter en silence.

### Le DOMMAGE, mesuré (§5 de l'arbitrage du 15/08) — et il déclasse le ticket

« I14 rouvert » décrit un état du CODE, pas un dommage. R20.6 avait appris à trier avant de
bloquer ; la règle s'étend : **trier aussi avant de prioriser** (`npm run mesure:o37`).

| ampleur du dépassement, sur 494 cas | |
|---|---|
| médiane | **2,0 min** |
| p90 | 5,0 min |
| maximum | **18,0 min** |
| ≥ 5 min | 52 · **≥ 15 min : 12** · ≥ 30 min : **0** |
| séance qui dépasse = séance de QUALITÉ | 282 (57 %) |
| discipline de la longue | nage 306 · course 158 · vélo 30 |

**Verdict : c'est de la DETTE, pas un ticket.** L'écart médian est de deux minutes — invisible
pour l'athlète, et le plan reste cohérent. Les 12 cas au-dessus d'un quart d'heure sont tous en
trail (« Descente en charge » 78 min contre « Longue trail + ravito réel » 60), c'est-à-dire le
résidu que le commentaire d'`enforceLabelVsDose` assume déjà explicitement : les planchers de
`shrinkTo` (`Math.max(5, …)`, `if (!touched) break`) laissent un reste plutôt que de dénaturer
une séance.

**Ce qui mériterait un ticket, si on y revient, est la population TRAIL** — pas les 441. Le reste
attend derrière tout ce qui déplace de vraies minutes.

*(Note d'instrument : ma première écriture de la mesure rendait « médiane 2,0 · p90 1,0 » — un p90
SOUS la médiane. Le tableau est trié DÉCROISSANT et j'indexais le quantile à `p` au lieu de
`1 − p`. Corrigé avant publication ; onzième occurrence de la famille « une mesure qui nomme une
grandeur et en rend une voisine ».)*

```verify
id: O-37
quoi: I14 est rouvert apres son application, compte epingle au cliquet T-27
attendu: O37-REPRODUIT
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep -q "✓ T-27" && echo "O37-REPRODUIT"
```

---

## O-37a — un brick d'affûtage passe 1 min SOUS son plancher audité, sur 4 profils

Même origine que ci-dessus : trouvé par le sceau, invisible aux gates.

`tri/Full/reprise/{inter,avance}/{finir,plaisir}` : « Brick d'affûtage (rappel de transition) »
livre **39 min de vélo** pour une bande `C21c` de **[40, 150]**. Une minute.

`audit:v2` balaie pourtant `tri/Full/reprise/inter/finir` — et il est VERT. La différence est le
PROFIL DE BASE : son `baseProfile()` ne porte pas les mêmes `vol_max`/`pace`/`weight` que le
balayage du sceau, et l'état à 39 min n'y est pas atteint. Ce n'est donc pas un trou de l'auditeur
mais un trou de COUVERTURE — famille A-2, sixième occurrence.

**Non corrigé** : un plancher manqué d'une minute sur un brick d'affûtage ne met personne en
danger (il va dans le sens de la fraîcheur, que l'affûtage cherche), et le corriger demande de
savoir laquelle des deux bandes fait foi — c'est T-28. Compté au cliquet de T-27.

---

## T-27b — le sceau pose son drapeau, mais aucune lecture ne l'exige encore

`sealPlan` pose `_sealed` et attache `_seal` au plan livré, et sa batterie tourne au seul point
du pipeline où « après » n'existe pas. **La seconde moitié du §3 n'est pas écrite** : « toute
fonction de diagnostic, de message, de record ou d'export assert `_sealed` à l'entrée, et échoue
bruyamment sinon ».

Sans elle, le drapeau ne garde rien tout seul — il constate, il n'interdit pas. C'est écrit ici
pour que personne ne prenne sa présence pour la garantie qu'il ne donne pas encore.

**Ce que ça demande** : recenser les surfaces de lecture du plan (les cartes « Pourquoi ce plan »,
les records `_r202`/`_v2`, l'export iCal, la prédiction), et poser l'assertion à leur entrée. La
variante forte — le plan final est un TYPE distinct du plan en construction, et les diagnostics
ne prennent que le premier — rendrait l'erreur impossible à ÉCRIRE et pas seulement à exécuter.

```verify
id: T-27b
quoi: le sceau existe et est pose sur le plan livre (moitie 1), les assertions de lecture non
attendu: T27B-REPRODUIT
cmd: grep -q "sealPlan(best.plan" src/generator/repairLoop.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "✓ T-27" && echo "T27B-REPRODUIT"
```

---

## O-38 — ⚠ MA MESURE ÉTAIT FAUSSE : il n'y avait pas 12 bornes permissives, il y avait DEUX TABLES · ✅ **FERMÉ (15/08/2026)**

**L'entrée d'origine annonçait « 12 couples permissifs, tous en AFFÛTAGE ». C'est faux, et la
correction est plus instructive que le constat.**

### Ce que le balayage prétendait, et pourquoi il se trompait

Ma première écriture de `balayageT28.mjs` **MODÉLISAIT** `blockBounds` au lieu de l'observer :
elle recalculait ses deux bornes à partir des tables et concluait que l'affûtage était ouvert
d'un facteur deux (Full : générateur 300, auditeur 150).

Or `blockBounds` a **deux branches** — `b.bnd` quand le step DÉCLARE ses bornes, `s.brick`
sinon — et je n'avais modélisé que la seconde. Mesuré sur les plans LIVRÉS (216 profils
tri + duathlon) :

| | legs vélo de brick | branche empruntée |
|---|---|---|
| affûtage | **135** | **toutes** `b.bnd` — R18.4 pose déjà le `bnd` audité C21c |
| charge | **1 476** | **toutes** `s.brick` |

**Les lignes que je signalais n'atteignent jamais la branche que je mesurais.** Dixième
occurrence dans ce dépôt d'un critère qui nomme une grandeur et en mesure une voisine — cette
fois dans le balayage écrit précisément pour fermer cette classe, ce qui est le pire endroit
possible, et la conclusion publiée était INVERSÉE (le problème était en charge, pas en affûtage).

### Le défaut réel, plus discret et réel quand même

Sur la branche effectivement empruntée, le **plancher** lisait `BRICK_BIKE_BOUNDS` (la table de
l'auditeur, C21b) et le **plafond** lisait `CAP_BRICK_BIKE`, une SECONDE table :

```
S: 90 · M: 120 · 70.3: 180 · Full: 300 · L: 150 · PM: 300   ← CAP_BRICK_BIKE
S: 90 · M: 120 · 70.3: 180 · Full: 300 · L: 150 · PM: 300   ← BRICK_BIKE_BOUNDS[1]
```

Six valeurs identiques, donc **zéro permissivité vivante** — et deux vérités pour une borne,
libres de diverger au premier format ajouté. C'est `_IFZ` sous une autre forme, exactement la
classe que T-28 existe pour traquer, simplement pas au stade où je l'avais annoncée.

### Correctif

`CAP_BRICK_BIKE` est **supprimée** (elle n'avait que cet unique consommateur) plutôt que dérivée
— une table dérivée reste une table qu'on peut réécrire. Le plafond lit `BRICK_BIKE_BOUNDS[1]`,
comme le plancher et comme l'auditeur.

**Golden : 0 écart supplémentaire.** Le correctif ne change aucun plan, ce qui était prévisible
puisque les valeurs coïncidaient — et le vérifier est ce qui distingue « prévisible » de « vrai ».

`T-28` passe **rouge → vert** et garde la PROPRIÉTÉ (« une borne, une source »), pas le nombre de
tables : il reste vrai si quelqu'un ajoute un format. Son critère a d'ailleurs rougi en naissant
sur le **commentaire** qui explique la suppression — troisième faux positif de cette famille dans
ce chantier, corrigé en retirant les commentaires avant de chercher.

### Ce qui reste, nommé

Les **4 legs hors bornes** que le balayage corrigé signale encore sont `tri/Full/affûtage` à
39 min pour `[40, 150]` — c'est **O-37a**, suivi par `S1` au cliquet du sceau, pas par T-28
(deux gardes qui mesurent la même chose, c'est une garde de trop). Et le **leg COURSE** du brick
reste borné par le générateur (`CAP_BRICK_RUN`) sans être vérifié par l'auditeur : dette nommée,
pas une divergence.

```verify
id: O-38
quoi: une borne, une source — CAP_BRICK_BIKE supprimee, T-28 vert
attendu: O38-FERME
cmd: ! grep -q "export const CAP_BRICK_BIKE" src/engine/constraintMatrix.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "✓ T-28" && echo "O38-FERME"
```

---

## O-37b — les 12 dépassements ≥ 15 min sont TOUS en trail : ce n'est pas O-37

Séparé d'O-37 sur consigne du fondateur (15/08) : *« un défaut qui se concentre entièrement dans
une discipline n'est presque jamais un bug général — c'est une lacune de modélisation propre à
cette discipline »*. Ranger les 12 avec les 441 les enterrerait.

| | |
|---|---|
| cas ≥ 15 min | **12, tous en trail** |
| le pire | « Descente en charge » **78 min** > « Longue trail + ravito réel » **60** (+30 %) |
| profils | `trail/confirme/{debutant,inter,avance}/{finir,plaisir}` S16 |

Le trail a sa propre arithmétique de dose (km-effort, D+, part de marche) et `enforceLabelVsDose`
réduit un bloc en pente par ses RÉPÉTITIONS avec un plancher à 2 (I14, 2ᵉ passe) — en dessous,
« une séance de descente avec une seule descente n'est plus une séance de descente ». Le résidu
de 18 min est donc probablement CE plancher, atteint sur une longue trail elle-même courte
(60 min). À vérifier avant d'écrire quoi que ce soit : c'est une hypothèse, pas un diagnostic.

Petit, borné, et il a une cause nommable — contrairement aux 441, qui sont de la dette à 2 min.

```verify
id: O-37b
quoi: les 12 depassements >= 15 min sont tous en trail
attendu: O37B-REPRODUIT
cmd: npm run mesure:o37 2>/dev/null | grep -q "≥ 15 min : 12" && npm run mesure:o37 2>/dev/null | grep -A2 "les 6 pires" | grep -q trail && echo "O37B-REPRODUIT"
```

---

## O-36 — ⚠ TROIS PRÉMISSES VÉRIFIÉES AVANT D'ÉCRIRE, ET LA POPULATION N'EST PAS CELLE QU'ON CROYAIT

Le fondateur a exigé (15/08, §5) que trois points soient tranchés avant toute ligne d'O-36. Ils
le sont, et deux d'entre eux changent le périmètre du ticket. **Rien n'est écrit** : l'arbitrage
lui revient.

### §5.1 et §5.2 — le scénario redouté n'existe pas

Le risque énoncé était : « O-36 ramène la séance du coureur lent de 42,5 à 20 min →
`enforceLabelVsDose` la juge sous-dosée → il l'étend → la dose double revient ».

**`enforceLabelVsDose` n'a AUCUNE cible de dose.** Ses deux seules cibles sont des PLAFONDS :
`C25_RECOVERY_SESSION_CAP_MIN` (absolu) et `lg.min` (relatif à la sortie longue livrée). Et ses
**cinq mutations de dose sont toutes gardées par `if (next < courant)`** — vérifié
mécaniquement, pas à la lecture : elle ne peut que RÉDUIRE. Le scénario n'a pas de mécanisme.

### §5.3 — le balayage, et il déplace le périmètre

| blocs de corps | |
|---|---|
| prescrits en DISTANCE | **12 278** |
| prescrits en TEMPS | 66 112 |
| répartition de la distance | **nage 10 982 (89 %)** · course 1 296 (11 %) |

**O-36 vise 1 296 blocs, pas 12 278.** Les 89 % restants sont de la NAGE, où le mètre est l'unité
juste (un bassin se mesure en mètres) — et deux choses y pendent :

- **3 696 blocs de nage portent un `bnd` en MÈTRES** (planchers 150-400, plafonds 315-850) :
  les convertir sans convertir leurs bornes serait une faute d'unité au sens de la règle 14 ;
- **C24/C24b se mesurent en mètres SUR LA SÉANCE** (`metersOf(sx)`), sur 10 593 séances de nage.
  Si les blocs passaient au temps, `metersOf` rendrait 0 et la passe sortirait par son
  `if (tot <= 0) continue` : **un plancher de SÉCURITÉ cesserait de s'appliquer en silence.**

Les **1 296 blocs de course** que le ticket vise, eux, ne portent **aucun `bnd`** : ils tombent
sur le repli `{ floor: 3 }` en minutes. Rien ne les rallongerait.

### §2.5 — la thèse tient en DIRECTION, pas en magnitude

| allure seuil | blocs | temps de TRAVAIL | door-to-door | km de qualité | reps |
|---|---|---|---|---|---|
| 4:30 | 108 | 28,9 min | 37,4 | 6,43 | 3,84 |
| 5:45 | 108 | 33,1 | 40,4 | 5,76 | 3,44 |
| 7:00 | 108 | 38,0 | 44,6 | 5,43 | 3,21 |
| 8:30 | 108 | **43,3** | 49,3 | 5,09 | 3,01 |
| **rapport lent/rapide** | | **×1,50** | ×1,32 | **×0,79** | ×0,78 |

**Monotone et concentré sur les allures lentes : l'argument du fondateur n'est pas faux.** Mais
sa magnitude illustrative (42,5 → 20 min, soit ×2,1) n'est pas ce que le moteur livre — parce
qu'une **compensation partielle existe déjà** : le nombre de répétitions tombe de 3,84 à 3,01
(−22 %) à distance par répétition constante (~1 672 m).

Le coureur lent reçoit donc **+50 % de temps de travail et −21 % de kilomètres de qualité**. Le
résidu à corriger vaut 50 %, pas 110 %.

**Ce que ça change pour l'arbitrage** : un résidu de 50 % sur 1 296 blocs de course est un
dossier plus mince qu'un doublement sur « toutes les prescriptions à intervalles », et la partie
nage — 89 % du volume concerné — est celle qu'il ne faut PAS convertir. Décision au fondateur.

```verify
id: O-36-amont
quoi: les trois premisses du §5 sont mesurees et publiees
attendu: O36-AMONT-MESURE
cmd: npm run mesure:o36 2>/dev/null | grep -qE "sw 1[0-9]{4} · rn 1[0-9]{3}" && echo "O36-AMONT-MESURE"
```

---

## O-36 (re-cadré) — les trois mesures du §5, et deux trouvailles qui ne sont pas O-36

Le ticket a changé d'énoncé (arbitrage du 15/08) : **ce n'est pas une conversion d'unité, c'est
un mécanisme d'adaptation SOUS-CALIBRÉ.** Le moteur adapte déjà le NOMBRE de répétitions
(3,84 → 3,01 entre 4:30 et 8:30) mais pas leur LONGUEUR (~1 672 m partout). Décision : rendre la
distance par répétition dépendante de l'allure. **Rien n'est écrit** — voici les mesures.

### (a) l'équivalent course de `metersOf` : deux consommateurs, un seul qui compte

Hors générateur, la distance de bloc en course n'est lue que par **`weekDistances`** (le récap
hebdomadaire affiché) — et c'est correct qu'il bouge : un coureur lent couvrira réellement moins
de kilomètres de qualité. **C30 ne lit PAS la distance prescrite** mais `RUN_KM[fmt]`, la
distance de la COURSE : la distance adaptative ne l'atteint pas.

**Le consommateur à surveiller est `runHoursPerWeekOf`** : il alimente `riegelExponent`
(P5/B-21). Réduire la distance des répétitions réduit les heures de course hebdomadaires, donc
déplace l'exposant de Riegel, donc la PRÉDICTION. Boucle de retour réelle, à mesurer dans le lot.

### (b) plage des distances résultantes — le plancher ne mordrait pas, mais il doit exister

| allure | dose moyenne | facteur d'égalisation | distance médiane visée |
|---|---|---|---|
| 4:30 | 37,4 min | ×1,000 | 2 000 m |
| 5:45 | 40,4 | ×0,926 | 1 851 m |
| 7:00 | 44,6 | ×0,839 | 1 678 m |
| 8:30 | 49,3 | **×0,759** | **1 519 m** |

Distances actuelles : 1 000 et 2 000 m. **La plus courte que l'égalisation produirait est 759 m**
— très au-dessus du seuil de bon sens de ~400 m évoqué. Le plancher reste nécessaire (il devra
être un MAILLON DÉCLARÉ quand il mord) mais il ne mordrait sur aucun profil actuel.

### (c) C25 / dose — pourquoi le plafond n'a pas mordu, et ce qu'il ne couvre pas

`DOSE_CAP_MIN` déclare **`thr` 40 min · `vo2` 25 min**, par BLOC et par ZONE — la dose de 43,3 min
du profil lent est une MOYENNE sur toutes les zones de qualité, pas 43 min de seuil d'un bloc.

| allure | `rn.thr` | `rn.mara` |
|---|---|---|
| 4:30 | 25,7 min/bloc (plafond 40, respecté) | **61,0 min/bloc — aucun plafond déclaré** |
| 8:30 | **37,1** min/bloc (plafond 40, respecté **à 3 min près**) | **73,7 min/bloc — aucun plafond** |

**Deux trouvailles qui ne sont pas O-36 :**

1. **`rn.mara` n'a aucun plafond de dose** et porte la plus grosse dose de qualité du moteur
   (61-74 min/bloc). C'est peut-être délibéré — 16 km à allure marathon est une séance
   marathon légitime — mais ce n'est **écrit nulle part**, donc c'est une absence non arbitrée.
   Suivi en **O-39**.
2. **Le plafond `thr` est à 3 minutes de mordre** chez le coureur lent. Il mordra au premier lot
   qui allonge un peu les séances de seuil — et l'égalisation d'O-36 va justement dans l'autre
   sens, ce qui est un argument de plus en sa faveur.

```verify
id: O-36-cible
quoi: les trois mesures (a)(b)(c) du recadrage sont publiees
attendu: O36-CIBLE-MESURE
cmd: node scripts/mesureO36cible.mjs 2>/dev/null | grep -qE "PLUS COURTE que l.égalisation produirait : [0-9]{3} m" && node scripts/mesureO36cible.mjs 2>/dev/null | grep -q "aucun plafond déclaré pour cette zone" && echo "O36-CIBLE-MESURE"
```

---

## O-39 — `rn.mara` porte la plus grosse dose de qualité du moteur, sans aucun plafond déclaré

Trouvé en mesurant (c) ci-dessus. `DOSE_CAP_MIN` plafonne `thr` à 40 min et `vo2` à 25 ; **`mara`
n'y figure pas**, et les blocs `rn.mara` livrent **61,0 min à 4:30 et 73,7 min à 8:30** par bloc.

Le commentaire de `DOSE_CAP_MIN` justifie ses deux entrées (« une dose de seuil au-delà de ~40 min
ou de VO2 au-delà de ~25 min n'est pas un entraînement, c'est une course ») sans dire pourquoi
l'allure marathon en est exempte. **L'exemption est probablement juste** — courir 16 km à allure
marathon est le cœur d'une préparation marathon — mais une exemption non écrite est
indistinguable d'un oubli, et `IS_QUALITY_ZONE` classe pourtant `.mara` en qualité.

**Ce que ça demande** : soit un plafond, soit une ligne qui dit pourquoi il n'y en a pas.

```verify
id: O-39
quoi: rn.mara n'a pas d'entree dans DOSE_CAP_MIN alors qu'il est classe qualite
attendu: O39-REPRODUIT
cmd: grep -q "QUALITY_SUFFIX" src/generator/planGenerator.ts && node -e "import('./src/engine/constraintMatrix.ts').then(m=>process.exit(m.DOSE_CAP_MIN.mara===undefined?0:1))" && echo "O39-REPRODUIT"
```

---

## O-36 §1 — LES DEUX MESURES BLOQUANTES PASSENT, ET LA SECONDE PAR UNE RAISON STRUCTURELLE

`npm run mesure:o36b`. Les deux verrous du feu vert conditionnel (15/08) sont levés.

### §1.1 — la boucle `runHoursPerWeekOf → riegelExponent` : Δ maximal **+0,48 %**

| profil marathon | h/sem avant → après | exposant | chrono | Δ |
|---|---|---|---|---|
| 8:30 / inter | 5,55 → 5,32 | 1,1014 → 1,1041 | 6h46 → 6h48 | **+0,48 %** |
| 7:00 / inter | 5,50 → 5,37 | 1,1020 → 1,1035 | 5h28 → 5h29 | +0,24 % |
| 5:45 / inter | 5,50 → 5,45 | 1,1020 → 1,1026 | 4h24 → 4h24 | +0,08 % |

**Sous le seuil de 1 % : bruit de calcul.** L'effet pervers redouté — « prédire une course plus
lente parce qu'on a cessé de sur-prescrire » — existe, va bien dans le sens annoncé, et vaut
deux minutes sur un marathon de 6h46.

### §1.2 — la circularité B-25 : **O-36 n'entre pas dans la boucle**

Déplacement d'exposant sur 8 profils tri : **+0,0000, exactement**. La raison est structurelle et
elle a été VÉRIFIÉE plutôt que déduite d'un zéro (un zéro peut aussi vouloir dire que la sonde ne
trouve rien) :

```
tri/Full      : 19 blocs de qualité COURSE, dont 0 prescrits en DISTANCE
run/marathon  : 26 blocs de qualité COURSE, dont 4 prescrits en DISTANCE
```

Le leg course du tri ne porte **aucun** bloc de qualité en distance — la bande B-25 les prescrit
en temps. O-36 n'ajoute donc aucun terme à la boucle fermée `plan → heures → exposant →
prédiction → bande → plan`, et la résolution à une itération est intacte. Ce n'est pas « l'effet
est petit », c'est « il n'y a pas d'effet ».

**Feu vert : les deux verrous du §1 sont levés.** Reste à écrire (item 3) : la distance de
répétition dépendante de l'allure, son plancher déclaré comme maillon, le diff sur les 949
ventilé par tranche d'allure, et la mesure §4 (profils à moins de 5 min de `DOSE_CAP_MIN`).

```verify
id: O-36-boucle
quoi: les deux verrous du §1 sont mesures et passent
attendu: BRUIT DE CALCUL
cmd: node scripts/mesureO36boucle.mjs 2>/dev/null | grep -o "BRUIT DE CALCUL"
```


---

## O-39 (élargi) — ⚠ `rn.mara` N'EST PAS LA SEULE : `rp` ET `css` AUSSI

Ta vérification §3.1 était la bonne question, et la réponse est non. La garde `O-39`, écrite sur
la PROPRIÉTÉ (« toute zone de qualité émise est plafonnée ou exemptée »), balaie les zones
réellement ÉMISES sur les 949 :

```
5 suffixes de qualité émis : css · mara · rp · thr · vo2
  · thr  40 min   (DOSE_CAP_MIN)
  · vo2  25 min   (DOSE_CAP_MIN)
  · mara EXEMPTÉ  (DOSE_EXEMPT — écrit ce jour, raison physiologique)
  · rp   ⚠ ni plafond ni exemption
  · css  ⚠ ni plafond ni exemption
```

`rp` est l'allure course VÉLO (R20.5 : 0,70-0,88 × FTP selon le format) et `css` le seuil NAGE.
Les deux sont classés qualité par `IS_QUALITY_ZONE` et aucun ne porte de borne de dose.

**Je n'invente pas leur exemption.** `mara` avait une raison physiologique claire et mesurée ;
`rp` et `css` demandent un arbitrage — un bloc de 60 min à allure course d'Ironman est normal,
un bloc de 60 min de CSS ne l'est probablement pas, et la règle 14 dit que ces deux disciplines
ne se comparent pas dans la même monnaie. Décision au fondateur.

Statut : `O-39` est un rouge ATTENDU du banc, avec son ticket — il ne peut plus passer inaperçu,
et il redeviendra vert le jour où les deux zones sont tranchées.

---

## T-30 — écrit ROUGE, et le rapport n'est pas ×1,50 mais ×1,09

La propriété que l'item 3 d'O-36 doit rendre vraie : *à profil et format égaux, le temps de
travail d'un bloc de qualité est invariant par variation de `thrPace`*.

**Deux chiffres cohabitent et il faut dire lequel est lequel** :

| population mesurée | rapport lent/rapide |
|---|---|
| blocs de qualité prescrits en DISTANCE (§2.5) | **×1,50** |
| TOUS les blocs de qualité course (T-30) | **×1,09** |

Ils ne se contredisent pas : les blocs prescrits en TEMPS ne varient pas avec l'allure, et ils
diluent le résidu. **×1,50 est l'ampleur du défaut là où il vit ; ×1,09 est ce que l'athlète subit
en moyenne sur sa qualité.** T-30 mesure le second parce que c'est la propriété finale ; le
premier reste le bon chiffre pour dimensionner le correctif.

```verify
id: T-30
quoi: la propriete est ecrite ROUGE avant le correctif
attendu: T30-ROUGE
cmd: node scripts/lotPhysio.mjs 2>/dev/null | grep -q "· T-30 \[ROUGE\]" && echo "T30-ROUGE"
```

---

## O-39 §4(d) — ⚠ MA GARDE MESURAIT LA TABLE, PAS LE CODE : `css` EST DÉJÀ PLAFONNÉ

La mesure (d) — « `DOSE_CAP_MIN` compte-t-il le temps de TRAVAIL ou le temps TOTAL ? » — répond,
et elle corrige au passage mon propre périmètre d'O-39.

### (d) : c'est le temps de TRAVAIL, et le plafond ne voit pas les blocs en distance

```ts
if (b.durationMin != null) {                      // ← les blocs en DISTANCE n'entrent jamais ici
  const doseCap = /\.vo2$/…  : /\.thr$|\.css$/…   // ← `css` est mappé sur DOSE_CAP_MIN.thr
  if (reps * b.durationMin > doseCap) …           // ← reps × durée = TRAVAIL, récup exclue
}
```

**Trois conséquences, dans l'ordre d'importance :**

1. **`css` N'EST PAS orphelin** : il est plafonné à 40 min via la branche `thr`. Il n'a pas de
   CLÉ propre, et ma garde lisait `DOSE_CAP_MIN[suffixe]` — **elle mesurait la TABLE quand le
   code fait une RÉSOLUTION**. Treizième occurrence de « un critère qui nomme une chose et en
   mesure une voisine », dans la garde écrite pour trancher O-39. Corrigée : le prédicat lit
   désormais la résolution. **Périmètre réel d'O-39 : `rp` SEUL.**
2. Le plafond compte **`reps × durationMin`**, donc le travail, récupérations exclues. Les 40 min
   veulent bien dire la même grandeur en course et en nage — pas de treizième faute d'unité.
3. **Mais il est structurellement inatteignable en nage** : les blocs `sw.css` sont prescrits en
   MÈTRES, donc `b.durationMin` est `null` et la branche n'est jamais prise. Le plafond de 40 min
   pour `css` existe, il est correct, et il est **dormant par construction** — pas par calibrage.
   C'est une décision écrite, ce qui est l'objet d'O-39 ; mais qu'elle soit inatteignable mérite
   d'être su, et c'est la deuxième fois que la prescription en distance rend une règle muette
   (après C24/C24b et son `metersOf`).

**Ton arbitrage sur `css` est donc sans objet** : la décision existait déjà dans le code, elle
valait 40, et elle correspond à ce que tu aurais tranché. Reste `rp`, et la règle structurelle du
§2 (« le plafond suit la bande à laquelle `rp` se résout ») est à écrire — non fait ici.

```verify
id: O-39-d
quoi: DOSE_CAP_MIN compte le TRAVAIL et ne voit pas les blocs en distance ; css est resolu sur thr
attendu: O39D-REPRODUIT
cmd: grep -q "reps \* b.durationMin > doseCap" src/generator/planGenerator.ts && grep -q "css" src/generator/planGenerator.ts && node scripts/lotPhysio.mjs 2>/dev/null | grep -q "1 sans plafond NI exemption" && echo "O39D-REPRODUIT"
```

---

## O-40 — les deux gardes qui abandonnent quand l'unité ne leur convient pas · MESURE FAITE, ÉCRITURE À SCINDER

| garde | condition d'abandon | population muette |
|---|---|---|
| C24/C24b (plancher) | `if (tot <= 0) continue` | blocs prescrits en **temps** |
| `DOSE_CAP_MIN` (plafond) | `if (b.durationMin != null)` | blocs prescrits en **mètres** |

Les deux unités perdent une garde, **en sens opposés** : ce n'est pas un problème de choix
d'unité, c'est que chaque garde RENONCE au lieu de dériver la grandeur qui lui manque — alors que
le moteur connaît les vitesses (CSS, allure seuil) et convertit déjà dans les deux sens
(`weekDistances` le fait).

### La mesure préalable (`npm run mesure:o40`) : le plafond MORD, étroitement

| | |
|---|---|
| blocs de corps prescrits en mètres | 11 890 |
| … portant une zone à plafond | 1 924 |
| … que le plafond mordrait | **42** |
| profils touchés | **12** |

**Tous en `tri/70.3` et `tri/Full`, tous sur « Nage seuil (+dist) » en `sw.css`**, entre 40 et
46 min de travail pour un plafond de 40. Le dépassement est de 0 à 6 minutes.

### Ce que ça impose à l'écriture — et c'est ta propre consigne

Le plafond mord, donc **c'est un changement de PLAN** : il demande son propre diff ventilé, et il
ne doit **pas** être posé dans le même geste que la garde. Le lot se scinde en deux :

1. **la garde**, indifférente à l'unité, sans effet de plan là où elle ne mord pas (C24/C24b
   étendu aux blocs en temps — à mesurer de la même façon avant d'écrire) ;
2. **le plafond nage effectif**, avec son diff sur les 12 profils.

**Réserve d'instrument, à lever avant d'écrire (2)** : mon temps de travail vaut
`_min − recoveryMin × (reps − 1)`. Le dépassement étant de 0 à 6 min et trois blocs tombant
*exactement* à 40, le verdict « 42 blocs » est SENSIBLE à cette définition. La branche course
compare `reps × durationMin` ; la mesure nage doit être alignée sur elle à la source avant de
décider — sinon c'est une quatorzième occurrence de la règle 15, dans la mesure qui sert à
trancher O-40.

```
T-31   Aucune garde ne traite comme absente une grandeur PRÉSENTE dans une autre
       unité et convertible avec ce que le moteur connaît déjà.
       T-29 : « donnée manquante ⇒ contrôle sauté ».
       T-31 : « donnée dans l'AUTRE UNITÉ ⇒ contrôle sauté ».
       🔴 rouge aujourd'hui sur les deux gardes ci-dessus.
```

```verify
id: O-40
quoi: les deux gardes abandonnent selon l'unite, et le plafond nage mordrait sur 12 profils
attendu: LE PLAFOND MORD
cmd: node scripts/mesureO40.mjs 2>/dev/null | grep -o "LE PLAFOND MORD"
```

---

## O-40 §1 — LES DEUX MESURES COÏNCIDENT, ET LE PÉRIMÈTRE TOMBE DE 42 À 12 : MON BALAYAGE MESURAIT UN NAGEUR DE REPLI

Ta prédiction falsifiable est tranchée, et la vérification a trouvé plus gros que la question.

### La prédiction : IDENTIQUES

`stepMin` est la source unique et vaut **`travail + rec`, rien d'autre** :

```ts
const rec = st.role === "body" && reps > 1 ? (reps - 1) * (st.recoveryMin || 0) : 0;
if (st.durationMin) return reps * st.durationMin + rec;
if (st.distanceM)   return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60) + rec;
```

Mesuré sur les **1 922 blocs** à zone plafonnée : **0 divergent, écart max 0,0000 min**. Les blocs
ne portent que du travail et des récupérations — rien à nommer, comme ta branche « identiques » le
prévoyait.

### ⚠ Mais la vérification a démasqué ma propre mesure — et le périmètre change

Ma première écriture posait `CSS_SEC = 110` (la valeur DÉCLARÉE dans le balayage) et rendait
**1 924 divergents sur 1 924**. Un taux de 100 % accuse l'instrument, pas les blocs : le moteur
employait **130 s/100 m**, le REPLI de `stepMin` (`baseRefs.css || 130`), parce que mon `BASE` ne
passait pas `css_known: "oui"` — la CSS déclarée était ignorée.

**Le balayage mesurait donc un nageur 18 % plus lent que celui qu'il croyait décrire**, ce qui
gonfle mécaniquement le temps de travail. Même famille que le harnais E2E qui fabriquait un
athlète de 138 kg (U14).

| | hier (nageur de repli, css 130) | corrigé (css déclarée, 110) |
|---|---|---|
| blocs que le plafond mordrait | **42** | **12** |
| profils touchés | **12** | **4** |

**Quatorzième occurrence de la règle 15**, et elle est survenue dans la mesure écrite pour lever
une réserve sur une autre mesure. La réserve était fondée ; sa cause n'était pas celle que je
soupçonnais.

### Ce que ça ne change pas, et ce que ça change

- **La scission tient** : le plafond mord encore (12 blocs, 4 profils), donc c'est toujours un
  changement de plan qui demande son propre diff, et il ne va pas dans le même geste que la garde.
- **Le lot 2 est quatre fois plus petit** que ce que le chiffre d'hier laissait croire, et il reste
  entièrement en `tri/70.3` et `tri/Full` sur « Nage seuil (+dist) ».
- **Le lot 1 (la garde) est inchangé** : son test d'acceptation reste golden 0 écart.

```verify
id: O-40-perimetre
quoi: les deux mesures coincident, et le perimetre reel est de 12 blocs sur 4 profils
attendu: 0 divergent
cmd: node scripts/mesureO40.mjs 2>/dev/null | grep -o "divergents (> 0,05 min) : 0" | head -1 | sed "s/.*: /0 divergent/"
```

---

## O-41 (a) — LE REPLI TIRE, ET IL TIRE SUR UN ATHLÈTE QUI A FOURNI SA DONNÉE

`stepMin` retombe sur **130 s/100 m** quand `baseRefs.css` n'est pas peuplé. Ce n'est pas un
contrôle sauté — c'est une **donnée fabriquée** : le plan est calculé pour un nageur qui n'est pas
l'athlète, et rien à l'écran ne le distingue d'un plan juste.

La sonde n'interroge pas `baseRefs` (règle 15) : elle **inverse `stepMin`** sur les blocs de nage
prescrits en mètres, ce qui rend la vitesse RÉELLEMENT employée.

| déclaration | profils | repli | css employée |
|---|---|---|---|
| `css` + `css_known: "oui"` | 324 | **0 %** | 110 |
| **`css` saisie SANS `css_known`** | 324 | **100 %** | **130** |
| aucune `css` | 324 | 100 % | 130 |

**⚠ ET LA VÉRIFICATION SUIVANTE CORRIGE MON PROPRE CADRAGE.** J'allais écrire « l'athlète a
fourni sa donnée et le moteur la remplace ». C'est faux tel quel : la lecture est **gatée sur
`css_known === "oui"`** en QUATRE endroits (`bridge` ×3, `weekDistances`, `reasoningEngine`), et le
questionnaire pose le drapeau avant la valeur. L'état « `css` saisie sans `css_known` » est donc
un état que **mon balayage a fabriqué**, pas un état du produit — quinzième occurrence de la
règle 15, et cette fois dans la conclusion, pas dans la mesure.

**Ce qui reste vrai et ce qui reste à vérifier :**

- la ligne 3 (aucune CSS déclarée) est **légitime** — il faut bien une valeur — et c'est la
  branche **(b)** : `130` est alors une constante non sourcée de plus, qui mérite sa provenance
  écrite et probablement une indexation sur le niveau ;
- **le chemin qui reste soupçonné est l'IMPORT.** O-22/O-25 écrivent des références MESURÉES
  (Strava, FIT) dans le journal. Si un import peuple `css` **sans** poser `css_known`, la valeur
  mesurée est ignorée et le repli tire sur un athlète qui a bel et bien fourni sa donnée — le
  scénario que je décrivais, au bon endroit cette fois. **Non mesuré**, et c'est ce qui décide de
  la priorité.

**Les trois lignes DIFFÈRENT, donc la sonde discrimine** : la saturation à 100 % est réelle, pas
un artefact — c'est précisément le test de dépistage que ce lot ajoute à `CLAUDE.md`.

**Priorité, révisée par la vérification ci-dessus** : ce n'est PAS un P1 sur le questionnaire.
Le ticket se réduit à (b) — provenance de `130` — plus la vérification du chemin d'import, qui
est le seul endroit où le scénario « donnée fournie, donnée remplacée » peut encore vivre.

Le sens de l'erreur, pour (b) : 130 s/100 m est **plus rapide** qu'un vrai débutant, donc ses
durées de bloc sont **sous-estimées** — sa séance déborde dans la vraie vie.

```verify
id: O-41
quoi: le repli css tire a 100 % des que css_known manque, et a 0 % quand il est pose
attendu: repli    0 (  0 %)
cmd: node scripts/mesureO41.mjs 2>/dev/null | grep "CSS DÉCLARÉE" | grep -o "repli    0 (  0 %)"
```


---

## O-41 §2 — LES DRAPEAUX FRÈRES : AUCUN CHEMIN N'ÉCRIT LA VALEUR SANS LE DRAPEAU · **PAS DE P0**

La question qui décidait de la sévérité — *« un chemin d'écriture de la VALEUR existe-t-il sans
écriture du DRAPEAU ? »*, en particulier pour la FTP — est tranchée par balayage des écritures.

**Les drapeaux frères existent** : `ftp_known`, `pace_known`, `css_known`, `vam_known`.

**Écrivains recensés de `answers.{ftp,css,pace}`** — il n'y en a que deux, et les deux posent le
drapeau **dans la même instruction** :

```js
// questionnaire (steps.js) — la branche ne s'ouvre que si le drapeau vaut "oui"
branch("cssB", a.css_known === "oui", '<input data-input="css">')

// édition du Profil (tab-profile.js:83-87 et 1145-1154, saisie manuelle ET retest)
S.answers.css = v; S.answers.css_known = "oui";
```

**Et les modules d'import n'écrivent PAS `answers.ftp/css/pace` du tout** : `measured.js`,
`strava.js` et `retest.js` alimentent le **journal** (`answers.tests`), qui est un autre canal.

→ **Le scénario « l'import peuple la valeur sans poser le drapeau » n'existe pas**, ni pour la
FTP ni pour les autres. **Pas de P0**, et l'ordre du §5 est inchangé : le lot 1 peut passer.

### Ce qui reste à vérifier, et c'est un cran plus loin que ma question

Puisque l'import écrit dans le JOURNAL et non dans `answers`, la question devient : **la promotion
journal → `answers` pose-t-elle le drapeau ?** R20.1 a déjà corrigé une fois « l'import qui
n'atteignait jamais le plan généré, le moteur ne lisant que `a.ftp/pace/css` » — donc un mécanisme
de promotion existe, et c'est LUI qu'il faut regarder. **Non mesuré ici** (fin de budget), et c'est
la première chose à faire à la reprise d'O-41.

La distinction de fond que tu poses reste la bonne et n'est pas tranchée : **`css_known` veut-il
dire « on a une valeur » ou « l'athlète l'a déclarée » ?** Aujourd'hui les deux coïncident parce
que seul l'athlète écrit. Le jour où la promotion écrit aussi, il faudra choisir — et la bonne
forme est celle que tu décris : le moteur UTILISE la valeur quelle que soit son origine, et trace
l'origine à part, comme `source`/`inherited` dans `PROVENANCE`.

```verify
id: O-41-freres
quoi: aucun chemin n'ecrit la valeur de reference sans poser son drapeau
attendu: O41-FRERES-OK
cmd: test $(grep -rnE "S\.answers\.(ftp|css|pace) *=" endurabuild/js/ 2>/dev/null | grep -v engine.js | grep -cv "_known *= *\"oui\"") -eq 0 && echo "O41-FRERES-OK"
```


---

## O-41 §1 — LA PROMOTION EXISTE, COUVRE LES QUATRE RÉFÉRENCES, ET POSE LE DRAPEAU · ✅ **FERMÉ**

Le pont est `syncRefsFromTests()` (`tab-profile.js`), et son en-tête énonce exactement le défaut
qu'il ferme : *« le moteur V2 ne lit QUE les valeurs courantes — jamais le journal daté. Sans ce
pont, un import écrirait le journal mais le plan généré ne changerait JAMAIS. »*

| référence | promotion | pose le drapeau |
|---|---|---|
| `ftp` | ✅ | ✅ `ftp_known = "oui"` |
| `thrPace` → `pace` | ✅ | ✅ `pace_known = "oui"` |
| `css` | ✅ | ✅ `css_known = "oui"` |
| `vam` | ✅ (R12.2/R12.3) | ✅ `vam_known = "oui"` |

**Les quatre, dans la même instruction que la valeur.** C'est ta première issue — *« la promotion
existe et pose le drapeau → le ticket se ferme »*. Aucune référence n'est laissée derrière : la
VAM porte même un commentaire disant que c'est « le bug déjà corrigé une fois » qu'on ne refait pas.

**Et la sémantique ne se pose donc pas encore** : `*_known` reste cohérent parce que la promotion
le pose comme le ferait l'athlète. La distinction présence/provenance que tu proposes
(`css_origin: "declared" | "measured" | "retest"`) reste la bonne forme pour le jour où l'on
voudra afficher la confiance ou la fraîcheur — **elle n'est pas requise par un défaut**, et
l'ajouter maintenant serait du travail sans mesure derrière.

### §3 — la politique de sélection est EXPLICITE, contrairement à l'attente

Tu écrivais : *« il y a forcément une réponse dans le code, et il y a peu de chances qu'elle soit
écrite quelque part comme une décision. »* Elle l'est, et longuement — c'est le produit d'O-23
puis d'O-25 :

```js
c.sort((x, y) =>
  String(y.t.date).localeCompare(String(x.t.date))          // 1. le plus RÉCENT
  || (DELIBERE(y.t) ? 1 : 0) - (DELIBERE(x.t) ? 1 : 0)      // 2. à date égale, la saisie
                                                            //    DÉLIBÉRÉE (profil/retest)
                                                            //    prime sur l'import — O-25
  || (y.i - x.i));                                          // 3. sinon la POSITION, le journal
                                                            //    étant append-only — O-23
```

Ce n'est **ni** « le meilleur » **ni** « une moyenne sur une fenêtre » : c'est **le plus récent, la
saisie délibérée primant à date égale**. Ton arbitrage physiologique (le meilleur test surestime,
le plus récent est sensible à un mauvais jour, une fenêtre lisse mais retarde) reste ouvert comme
QUESTION — mais la décision actuelle est écrite, sourcée par deux tickets, et défendable.

**Réserve honnête** : `syncRefsFromTests` vit dans l'UI et n'est appelée que depuis trois points
(deux dans `tab-profile`, un dans `retest`). Un chemin d'import qui écrirait le journal **sans**
passer par l'un d'eux laisserait la promotion muette — non balayé ici, et c'est le seul angle qui
reste sur ce ticket.

```verify
id: O-41-promotion
quoi: le pont promeut les QUATRE references et pose le drapeau a chaque fois
attendu: 4
cmd: grep -c "_known = \"oui\"; n++" endurabuild/js/state.js
```


---

## O-41 §1bis — LE BALAYAGE DES ÉCRIVAINS TROUVE UN TROU : `steps.js` REMPLIT LE JOURNAL SANS PROMOUVOIR

Le §1 du dernier arbitrage demandait de lister les ÉCRIVAINS du journal, pas les lecteurs. Fait :

| écrivain | ce qu'il pousse | promotion qui suit |
|---|---|---|
| `tab-profile.js:1040` (restauration/import de sauvegarde) | tests importés | ✅ `syncRefsFromTests()` l.1073 |
| `tab-profile.js:1139` (saisie manuelle du Profil) | `ftp`/`thrPace`/`css` | ✅ l.1090 + écriture directe de la valeur |
| `tab-profile.js:725` | `profil:race_inter` | — sans objet (pas une référence) |
| `retest.js:114` (retest guidé) | `r.type` | ✅ `syncRefsFromTests()` l.116 |
| **`steps.js:640` et `695`** | **`ftp` et `thrPace`** | **❌ AUCUNE — le fichier n'appelle jamais la promotion** |

**`steps.js` est le chemin d'IMPORT dans le questionnaire** : ses sources le disent en toutes
lettres (`"Strava (ton meilleur 10 min continu)"`), et c'est là que vivent O-22 et O-25 — la FTP
déclarée puis la meilleure moyenne 20 min, l'allure seuil depuis une course déclarée ou le
meilleur 10 min. Il pousse les valeurs MESURÉES dans le journal, **et n'écrit ni la valeur
courante ni le drapeau**.

C'est le scénario que le §1 de `O41_PROMOTION_JOURNAL` classait « la plus probable et la plus
discrète » : *rien ne casse, l'athlète importe, le journal se remplit, et le plan ne bouge pas.*

**⚠ TROUVÉ, PAS CONFIRMÉ DE BOUT EN BOUT.** Le balayage est statique : il montre qu'aucun appel
à la promotion n'existe dans ce fichier et qu'aucune écriture de `S.answers.ftp` n'y figure. Il ne
prouve pas que le flux d'interface ne repasse pas par `tab-profile` après coup (un retour au
Profil déclencherait la promotion). **À confirmer par un parcours E2E** avant d'écrire le
correctif — sinon c'est un constat sur le fichier, pas sur le produit (T-33).

**Le correctif, s'il est confirmé, est celui du §2 et pas un quatrième appel** : accrocher la
promotion à la fonction d'AJOUT au journal elle-même. Un seul point, impossible à oublier, et les
futurs chemins d'import en héritent — la géométrie du sceau, appliquée au journal.

```
(bloc `verify` RETIRÉ — le constat est réfuté, voir « O-41 RÉFUTÉ » plus bas)
```


---

## O-41 §1bis — E2E : LES DEUX VARIANTES ÉCHOUENT · **TROU FRANC**, avec une réserve d'instrument

Suite `tests/e2e/smoke-import-ref.mjs`, écrite avec le piège du §1 en tête : ouvrir le Profil
déclenche la promotion, donc un test qui y passe FABRIQUE le résultat qu'il mesure.

L'état posé est **exactement** ce que fait le chemin d'import de `steps.js` — les deux entrées de
journal (`ftp: 250` source Strava, `thrPace: 260` source Strava) et **rien d'autre** : ni `ftp`,
ni `ftp_known`.

| variante | `answers.ftp` | `ftp_known` | verdict |
|---|---|---|---|
| **(a)** génération directe, sans ouvrir le Profil | `null` | `non` | ✖ non promue |
| **(b)** après être passé par le Profil | `null` | `non` | ✖ non promue |

Selon la table de l'arbitrage, c'est **`(a) ✗ et (b) ✗` → trou franc, aucun masquage**.

Et la lecture du code le confirme : `syncRefsFromTests()` n'est appelée qu'aux lignes 1073 et 1090
de `tab-profile.js` — dans les **handlers** de restauration de sauvegarde et d'enregistrement
manuel — plus `retest.js:116`. **Elle ne tourne pas au rendu de l'onglet.** Visiter le Profil ne
suffit donc pas ; il faut y enregistrer quelque chose.

### ⚠ La réserve, et elle suit la règle du taux saturé

**Deux variantes sur deux qui échouent est le genre de résultat qui accuse l'instrument.** Ma
lecture se fait dans `localStorage`, qui n'est écrit que par `ebSave` : si la variante (b) avait
promu **en mémoire** sans persister, je lirais quand même `null`. Le verdict « trou franc » est
donc solide sur (a) — c'est là que le dommage vit — et **à confirmer sur (b)** par une lecture
en mémoire plutôt qu'en storage.

Ça ne change pas le correctif, seulement l'étiquette de (b) : trou franc, ou trou masqué par une
navigation qui inclut un enregistrement.

### Le correctif reste celui du §2, dans les trois cas

Accrocher la promotion à la fonction d'**ajout au journal**, pas un quatrième appel. Et la raison
de fond est mesurée : **O-22 et O-25 ont travaillé dans `steps.js` même**, et ni l'un ni l'autre
n'a relié l'écriture du journal à la promotion — parce que `syncRefsFromTests` vient de R20.1,
ailleurs et plus tard. Une couture de ce type ne se referme que par la structure.

```
(bloc `verify` RETIRÉ — le constat est réfuté, voir « O-41 RÉFUTÉ » plus bas)
```


---

## O-41 — ⚠ **RÉFUTÉ. LE TROU N'EXISTE PAS DANS LE PRODUIT** · ✅ FERMÉ (16/08/2026)

La mesure du §3 (« le journal est-il écrit avant ou après la pose du drapeau ? ») a renversé ma
propre conclusion, et la réponse est plus simple que les deux branches prévues.

**`stravaImport` n'a qu'UN SEUL appelant**, `runStravaImport` (`tab-profile.js:1033`), et il
promeut immédiatement :

```js
await stravaImport(tok);            // écrit S.answers.tests
if (!added) return;                 // rien de neuf → rien à promouvoir
const nRef = syncRefsFromTests();   // ← la promotion, juste après
ebSave();
if (nRef) invalidatePlan();         // et le plan est RÉGÉNÉRÉ sur la nouvelle référence
```

Le balayage statique disait vrai **du fichier** — `steps.js` n'appelle jamais la promotion — et
faux **du produit** : sa seule voie d'entrée le fait pour lui. La fonction vit dans `steps.js`
pour des raisons d'historique, elle n'y est pas invoquée.

### Ma « confirmation E2E » était une fixture synthétique — c'est T-33, mot pour mot

J'ai injecté des entrées de journal **directement dans `localStorage`**, un état qu'aucun chemin
produit ne fabrique : le seul qui écrit ces entrées promeut dans la foulée. La suite mesurait donc
la fixture, pas le produit — exactement la règle que ce chantier venait d'écrire :

> **T-33** — *toute fixture de mesure est atteignable par un chemin produit, ou explicitement
> étiquetée état synthétique. Une fixture inatteignable rend un constat sur la fixture, jamais
> sur le produit.*

Je l'ai écrite au tour précédent et enfreinte au suivant. C'est la seizième occurrence de la
famille, et la première où la règle violée était déjà nommée dans le dépôt.

**Ce qui aurait dû m'alerter, et c'est écrit dans `CLAUDE.md` depuis ce lot** : les DEUX variantes
échouaient. Un résultat saturé accuse l'instrument — j'ai appliqué la première moitié de
l'heuristique (« l'instrument discrimine-t-il ? ») et sauté la seconde (« quel état PRODUIT ce
résultat décrit-il ? »).

### Conséquences

- **Les pas B et C sont RETIRÉS.** Pas de crochet à poser : la promotion suit déjà l'écriture sur
  le seul chemin qui existe. Pas de réconciliation au chargement : sans trou, il n'y a pas de
  dommage passé à rattraper, donc pas de compteur à poser.
- **`tests/e2e/smoke-import-ref.mjs` est SUPPRIMÉE.** Une suite qui mesure un état inatteignable
  ne garde rien ; la laisser en « rouge attendu » figerait un faux défaut dans le cliquet.
- **Le pas A reste, et sa justification tient sans le trou** : les trois mécanismes qui touchent
  aux références de l'athlète cohabitent désormais, ce qui est la cause de fond de la couture
  O-22/O-25. Le regroupement empêche qu'un futur chemin d'import oublie la promotion — c'est
  maintenant de la prévention, plus une réparation.


---

## O-42 — ⚠ `stepMin` ET `weekDistances` CONVERTISSENT DÉJÀ LA MÊME GRANDEUR, ET PAS PAREIL

**Trouvé en vérifiant la prémisse du §2 du lot 1** — *« `stepMin` fait déjà cette résolution
puisqu'elle produit les durées d'aujourd'hui »*. Elle est FAUSSE, et c'est bloquant pour le lot 1.

```ts
// stepMin (renderer.ts) — la durée qui pilote TOUT le plan
if (d === "sw") return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60) + rec;
//                                                      ↑ le CSS BRUT, quelle que soit la zone

// weekDistances (engine) — le récap hebdomadaire affiché
const min = (km * 10 * css / 60) / (SWIM_SPEED_RATIO[st.zone] ?? SWIM_SPEED_RATIO["sw.easy"]);
//                                  ↑ le ratio DE LA ZONE
```

**`stepMin` traite chaque mètre de nage comme nagé au CSS.** `weekDistances` applique
`SWIM_SPEED_RATIO` = {`sw.easy` 0,80 · `sw.aero` 0,88 · `sw.css` 1,00 · `sw.speed` 1,02} et
`RUN_SPEED_RATIO` en course.

Conséquence arithmétique : pour un bloc `sw.easy`, `weekDistances` rend **1 ÷ 0,80 = +25 %** de
durée par rapport à `stepMin`. Deux vérités pour une même conversion, et l'écart change de signe
selon la zone — c'est `_IFZ` sous une troisième forme, **déjà en place**, indépendamment d'O-40.

### Pourquoi ça bloque le lot 1

La forme proposée — « une garde ne convertit pas, elle demande à `stepMin` » — est la bonne
géométrie, mais elle ferait hériter le plafond de dose d'une conversion qui **contredit déjà**
l'autre. On fermerait une divergence d'unité en propageant une divergence de vitesse.

Et le sens compte : `stepMin` SOUS-ESTIME la durée des blocs de nage faciles (il les compte au
CSS alors qu'ils se nagent plus lentement), donc il sous-estime le volume de nage du plan — sur
la discipline où 89 % des blocs sont prescrits en mètres.

### Ce que ça demande, et je ne le tranche pas

Laquelle des deux conversions fait foi ? `weekDistances` est physiologiquement plus juste (un
bloc facile ne se nage pas au CSS) ; `stepMin` est celle qui pilote le plan depuis toujours, donc
l'aligner CHANGE le volume livré de toutes les séances de nage. C'est un arbitrage d'entraînement
avec un rayon large, à mesurer avant d'écrire — pas un correctif à glisser dans le lot 1.

**Le lot 1 attend cette décision** : il n'y a pas de « source unique » à laquelle demander tant
qu'il y en a deux qui se contredisent.

```verify
id: O-42
quoi: stepMin convertit au CSS brut, weekDistances applique le ratio de zone
attendu: O42-CORRIGE
cmd: grep -q "zoneSpeedRatio(st.zone, undefined, \"css\")" src/generator/renderer.ts && ! grep -q "SWIM_SPEED_RATIO" src/engine/weekDistances.ts && echo "O42-CORRIGE"
```


---

## O-42 §2 — CONFIRMÉ : IL Y A BIEN **TROIS** VALEURS, ET `weekDistances` EST FAUSSE AUSSI

Ta suspicion était fondée. `ZDEF` définit les zones en multiplicateurs d'**ALLURE** (secondes au
100 m / au km), donc la vitesse implicite est **1 ÷ ce multiplicateur**. Comparée aux tables de
`weekDistances`, zone par zone :

| zone | `ZDEF` (allure ×) | vitesse implicite | `*_SPEED_RATIO` | écart |
|---|---|---|---|---|
| `sw.easy` | 1,12 | **0,893** | **0,80** | −10,4 % |
| `sw.aero` | 1,06 | **0,943** | **0,88** | −6,7 % |
| `sw.css` | 1,00 | 1,000 | 1,00 | ✓ |
| `sw.speed` | 0,94 | **1,064** | **1,02** | −4,1 % |
| `rn.easy` | 1,16–1,26 (méd. 1,21) | **0,826** | **0,78** | −5,6 % |
| `rn.rec` | 1,28–1,40 (méd. 1,34) | **0,746** | **0,70** | −6,2 % |
| `rn.mara` | 1,08–1,13 (méd. 1,105) | **0,905** | **0,92** | +1,7 % |
| `rn.thr` | 1,00–1,05 (méd. 1,025) | **0,976** | **1,00** | +2,5 % |
| `rn.vo2` | 0,92–0,97 (méd. 0,945) | **1,058** | **1,05** | −0,8 % |

**Trois conversions pour une grandeur** — `stepMin` (ratio 1,00 partout), `weekDistances` (sa
table), `ZDEF` (les allures que l'athlète LIT). Et `weekDistances` diverge de `ZDEF` sur **8 zones
sur 9**, jusqu'à 10,4 % en nage facile. Elle est moins fausse que `stepMin`, mais fausse.

**Donc ta §3 est la seule issue** : l'autorité n'est ni l'une ni l'autre, c'est la définition de
zone. Aucune fonction ne porte sa propre table ; les deux dérivent depuis `ZDEF` — celle qui
produit les allures affichées. Le plan cesse alors d'afficher une allure et d'en compter une
autre, ce qui est le défaut que ce chantier corrige depuis le premier jour, appliqué à la
conversion plutôt qu'au message.

*(Note de méthode : pour la nage, `ZDEF` porte `lo === hi`, la vitesse implicite est donc exacte.
Pour la course, les bandes ont une largeur et j'ai pris la MÉDIANE — c'est un choix, pas une
lecture, et il devra être tranché avec le correctif : médiane, borne lente, ou bande conservée.)*

**Le sens du biais, troisième instance** — à noter comme famille : quand ce moteur se trompe sur
le volume, il se trompe **vers le haut de la charge**. Les 350 profils annonçant un pic
supérieur au livré · le repli `css || 130`, plus rapide qu'un vrai débutant · `stepMin`, qui
compte un bloc facile comme nagé au seuil. Trois mécanismes indépendants, une seule direction.

**Et le périmètre du lot 2 est périmé** : les 12 blocs / 4 profils ont été comptés sur les durées
de `stepMin`. Les durées de nage montant, le nombre de blocs au-dessus de 40 min augmentera —
à re-mesurer après O-42, jamais à réutiliser.

```verify
id: O-42-trois
quoi: weekDistances porte une table de ratios qui diverge de ZDEF sur 8 zones sur 9
attendu: O42-TROIS-CORRIGE
cmd: ! grep -q '"sw.easy": 0.80' src/engine/weekDistances.ts && grep -q '"sw.easy": { ref: "css", lo: 1.12' src/generator/renderer.ts && echo "O42-TROIS-CORRIGE"
```


---

## O-42 §3 — IL Y EN A **QUATRE**, PAS TROIS : L'AUDITEUR PORTE LA SIENNE, ÉCRITE DEUX FOIS

Trouvé en cherchant qui d'autre convertit des mètres en minutes (règle 16 : la question du
producteur se pose récursivement). Le compte n'est pas de trois :

| lieu | conversion mètres → durée | forme |
|---|---|---|
| `stepMin` (générateur) | ancre BRUTE, ratio 1,00 | implicite |
| `loadModel.stepMinutes` (auditeur) | ancre BRUTE, ratio 1,00 | implicite |
| `loadModel` ligne 358 (auditeur, refente d'intensité) | ancre BRUTE, ratio 1,00 | **recopiée** de la précédente |
| `weekDistances` (UI, km de la semaine) | sa table `*_SPEED_RATIO` | explicite |
| `ZDEF` | ce que l'athlète LIT | l'autorité |

Quatre sites, trois comportements distincts, une seule grandeur. Et deux des quatre sont une
**copie littérale** l'une de l'autre à quinze lignes d'écart, dans le même fichier.

**Conséquence pour le correctif** : corriger `stepMin` sans corriger `loadModel` ferait diverger
le volume que le générateur BUDGÉTISE de celui que l'auditeur MESURE — c'est-à-dire rouvrir
exactement la famille que T-25 suit. Les quatre bougent ensemble ou aucun ne bouge.

**Et un commentaire de `loadModel` est FAUX** (règle 13) : *« Différence méthodologique ASSUMÉE
avec le `stepMin` du générateur : nous comptons la récup entre répétitions (N-1 × récup), lui
non »*. `stepMin` la compte depuis **R5.6a** — c'est même la dette la plus ancienne du dépôt,
fermée il y a des mois. Le commentaire décrit un état du moteur qui n'existe plus et invite à
tolérer un écart qui n'a plus de cause.

### Ce que le choix de bande coûte, mesuré (`npm run mesure:o42`)

`ZDEF` porte `lo === hi` en NAGE (vitesse implicite exacte) et des BANDES en course. Une durée
dérivée d'une distance doit choisir un point dans la bande — c'est le seul choix que la lecture
ne donne pas. Mesuré sur 171 plans, 4 259 blocs de corps prescrits en mètres :

```
blocs dont la zone porte une bande : 108 / 4 259  (2,5 %)
borne RAPIDE (lo)  : +7,8 %  de minutes vs aujourd'hui
CENTRE      (mid)  : +7,9 %
borne LENTE (hi)   : +8,0 %
→ l'écart lo↔hi vaut 0,2 % du total, contre 7,9 % pour la correction elle-même.
```

**Le choix est donc quarante fois plus petit que la correction.** Il se tranche sur un principe
plutôt que sur un arbitrage : `longRunSpecificity` a déjà posé la règle — *« un plancher se
calcule sur l'hypothèse la moins gourmande »*, donc il prend `lo`. `stepMin` ne produit ni
plancher ni plafond mais une **comptabilité** : une comptabilité prend la valeur attendue, donc
le CENTRE. La borne LENTE (`hi`, la plus prudente au sens du manifeste) coûte **+0,1 %** de plus :
elle est chiffrée ici pour que la décision reste révocable sans re-mesure.

### L'ampleur par zone, telle que le §6 la demande vérifiable

```
sw.easy   2 130 blocs   44 357 → 49 680 min   +12,0 %   (1/1,12 − 1)
sw.aero     975 blocs   20 814 → 22 063 min    +6,0 %   (1/1,06 − 1)
sw.css      797 blocs   14 177 → 14 177 min     0,0 %   ancrage, inchangé
sw.speed    249 blocs    1 772 →  1 666 min    −6,0 %   (1/0,94 − 1)
rn.thr       72 blocs    1 530 →  1 568 min    +2,5 %
rn.mara      36 blocs    1 860 →  2 055 min   +10,5 %
TOTAL      4 259 blocs   84 510 → 91 209 min    +7,9 %
```

**`sw.speed` BAISSE, et c'est attendu** : c'est la seule zone prescrite en mètres qui se nage
plus VITE que le CSS. Le critère du §6 (« les durées montent, jamais ne baissent, hors `sw.css` »)
doit donc s'entendre « suit le ratio de la zone » — ce que sa deuxième ligne dit déjà. Signalé
plutôt que corrigé en silence.

```verify
id: O-42-quatre
quoi: loadModel porte sa propre conversion metres→minutes, ecrite deux fois, a l'ancre brute
attendu: O42-QUATRE-CORRIGE
cmd: test $(grep -c 'refs.cssSecPer100m) / 100 / 60' src/engine/loadModel.ts) -eq 1 && echo "O42-QUATRE-CORRIGE"
```

### Règle 17 appliquée — **quatre** blocs ont basculé, **quatre** étaient des faux positifs

`registry:check` a rangé quatre entrées en « ne reproduit plus » dans la même exécution. Confirmées
À LA MAIN, comme la règle 17 l'exige : **aucune n'est un défaut corrigé.**

| entrée | ce que le bloc cherchait | ce qui a bougé | le défaut ? |
|---|---|---|---|
| `O-41-promotion` | le motif dans `tab-profile.js` | le **pas A** a déplacé `syncRefsFromTests` vers `state.js` | intact (4 occurrences, dans l'autre fichier) |
| `O-32` | `disque 9 · precachees 9` | `bebas-neue-400.woff2` **supprimée** (Z-01, police morte) | intact — `manquantes 0` tient, 8 sur 8 |
| `O-13` | `S1 1,3h` à `vol_recent = 0` | O-35 convertit la DÉCLARATION de nage → 1,4 h | intact — la rampe mord toujours (1,4 < 1,6) |
| `O-10` | « deux séances certains jours » | R20.2 (2ᵉ correction) : l'argmin nomme un AUTRE maillon | intact — 10 h → 8,8 · 16 h → 8,7, toujours inerte |

**Les quatre blocs épinglaient une VALEUR ou un CHEMIN là où l'entrée décrit une PROPRIÉTÉ** —
c'est la même faute que la règle 15 nomme côté mesure, appliquée au registre lui-même. Réécrits
sur la propriété : `manquantes 0` sans compte, « ce qui borne … Si tu levais cette contrainte »
sans nommer le maillon, le motif de promotion cherché là où il vit.

**Condition d'automatisation de `registryCheck` (LOT 1 §3)** : le déclencheur posé est « un SEUL
commit fait basculer ≥ 2 blocs ». Il n'est pas atteint — les quatre viennent de quatre lots
différents étalés sur la session, et le processus les a tous rattrapés. Le seuil reste posé tel
quel ; ce qui est mesuré ici, c'est qu'une exécution rend **4 faux positifs pour 0 vrai**, donc
que le coût du processus est entièrement dans la confirmation manuelle, pas dans la détection.


---

## O-42 §4 — LIVRÉ : une conversion, cinq sites, et deux gardes qui ont trouvé le reste

`zoneSpeedRatio(zone, refs?, expectRef?)` vit dans `renderer.ts`, aux côtés de `ZDEF` dont elle
dérive : `2 / (lo + hi)`, l'inversion allure → vitesse faite **une seule fois**. Les cinq sites
qui convertissaient la lisent :

| site | avant | après |
|---|---|---|
| `stepMin` (générateur) | ancre brute | `÷ zoneSpeedRatio` |
| `loadModel.stepMinutes` (auditeur) | ancre brute | `metresEnMinutes`, point unique du fichier |
| `loadModel` ligne 358 (copie) | ancre brute | la copie est **retirée** |
| `weekDistances` | table `*_SPEED_RATIO` | la table est **retirée** |
| `dailyAdjuster.enduranceReplacement` | ancre brute | `× zoneSpeedRatio` |

Le cinquième n'était pas dans l'inventaire : **c'est la garde `A3` du banc v6 qui l'a trouvé**
(« jour rouge : jamais plus de minutes qu'avant ajustement » — 23 min demandées, **25 livrées**).
La séance de remplacement dérivait ses mètres du CSS brut ; `sw.easy` se nageant à ×1,12, elle
durait 12 % de plus que le budget qu'on lui donnait — sur un jour ROUGE, c'est-à-dire là où
l'invariant existe. Une garde de sécurité écrite il y a des mois a payé son écriture ici.

### Ce que la ventilation dit (`npm run ventile:o42`, les quatre critères du §6)

```
[1][2] zone       blocs   ancre brute → livré    écart    attendu (mult−1)
       sw.easy     2122     42356 → 47439       +12,0 %      +12,0 %   ✓
       sw.aero      974     20681 → 21922        +6,0 %       +6,0 %   ✓
       sw.css       795     14087 → 14087         0,0 %        0,0 %   ✓
       sw.speed     249      1788 →  1681        −6,0 %       −6,0 %   ✓
       rn.thr        72      1430 →  1466        +2,5 %       +2,5 %   ✓
       rn.mara       36      1720 →  1901       +10,5 %      +10,5 %   ✓
       identité durée = distance × allure de ZONE : 4 248 / 4 248 blocs

[3][4] 189 profils · 96 montent · 22 baissent · 71 inchangés · 0 changement de structure
       2 682 semaines · 54 (2,0 %) s'éloignent de plus de 6 min de leur cible
         · 50 parce que la cible DÉCLARÉE monte plus vite que le livré (famille T-25/O-35 :
           la sonde de capacité lit un clone SATURÉ, le livré reste tenu par ses plafonds)
         · 4 parce qu'un plafond qui SE NOMME apparaît (« OFF (lissage) », « OFF (équilibre
           du bloc) ») — le moteur écrit sa raison dans le nom de la séance qu'il retire
```

`sw.speed` BAISSE : c'est la seule zone prescrite en mètres qui se nage plus VITE que le CSS.
Le §6 dit « les durées montent, jamais ne baissent » ; sa seconde ligne — « l'ampleur suit le
ratio de la zone » — est la formulation exacte, et c'est elle qui est gardée.

**Contre-preuve** : la ventilation rejouée contre le moteur d'AVANT (copié sur le disque) rend
« RÉSIDU » et les six zones en ✖.

### Le second défaut, trouvé par `ANX-C22` : un clamp qui ne savait pas réduire des mètres

Le Full de référence passait de **+10,4 % à +10,6 %** d'une semaine de charge à la suivante,
pour un plafond que le manifeste fixe à +10 %. Instrumenté : `enforceC22Final` n'avait que deux
branches, `reps > 1` et `durationMin`. **Un bloc en mètres à `reps === 1` ne tombait dans
aucune** — la boucle sortait par « les planchers bloquent : rien de plus à prendre », un
fail-open de la forme exacte de C24/C24b (T-29). La nage prescrivant 89 % de ses blocs en mètres,
c'est la moitié de l'objet du clamp qui lui manquait ; O-42 l'a seulement rendu visible.
Branche `distanceM` ajoutée, plancher C24/C24b respecté par annulation intégrale de la réduction.
**Effet mesuré au-delà du symptôme : `audit:v1` passe de 22 à 18 combinaisons au-dessus de +10 %.**
Le plancher est écrit en MÈTRES et non repris de `bnd.floor`, qui est en MINUTES — la faute
d'unité de la règle 14 existe déjà quinze lignes plus bas, elle n'est pas recopiée.

### `C30-A` : cinquième état, deux témoins ré-épinglés

`10k/avance/5:45/8h` **59 → 61** et `semi/inter/4:30/8h` **119 → 120**. Les deux sont des
coureurs dont la cible de spécificité est déjà atteinte : ils ne doivent rien à C30, ils suivent
la recomposition de leur semaine (`rn.thr`/`rn.mara` coûtent plus de minutes DURES, donc
`enforceHardTimeCap` en rend plus en facile, et le tail O-21 les fait remonter à la longue).
Ré-épinglés avec leur raison, jamais exemptés.

### Quatre fautes d'instrument, dans le script qui devait juger le lot

1. `mult()` lisait `APRES.intOf(z)` « pour interroger ce qui s'exécute » — `intOf` n'est pas
   exposée sur `EBV2`. Table par zone **vide**, et le verdict s'affichait « VENTILÉ » quand même,
   parce qu'il testait `c2ko === 0` : un critère satisfait par l'absence de mesure. Taux saturé
   0/0. Garde de population ajoutée.
2. La colonne « ampleur par zone » sommait `_min` **récup comprise** contre une ancre brute récup
   comprise — la récup ne suit pas le ratio d'une zone. Quatre ✖ affichés qui étaient ma somme.
3. La classification des baisses nommait « un plafond mord » et mesurait « le pic a baissé » —
   un plafond mord sur n'importe quelle semaine. 9 « inexpliqués » qui perdaient 1 à 5 minutes.
4. La tolérance était un POURCENTAGE de la cible quand le pas du point fixe est ABSOLU (25 m,
   une répétition). Sur une semaine de nage de 1,2 h un seul pas vaut 8 % : 205 « inexpliqués »
   qui étaient tous le même arrondi. Faute d'unité, règle 14, dans le juge du ticket qui corrige
   une faute d'unité.

### Règle 17, seconde application du jour : **six** blocs ont rebasculé après le correctif

`registry:check` rejoué APRÈS le lot range six entrées en « commande cassée ». Confirmées à la
main, comme la règle l'exige :

| entrée | ce qui a bougé | le défaut ? |
|---|---|---|
| `O-42`, `O-42-trois`, `O-42-quatre` | le correctif | **corrigé** — les trois blocs écrivent désormais le motif de leur CORRECTION |
| `O-21` | 1 inversion d'allure, écart max **0,2 % → 1,8 %** | intact : c'est le compte qui porte la propriété, pas la magnitude |
| `O-36-amont` | blocs de nage en distance **10 982 → 10 953** | intact : les blocs sont plus longs, le point fixe en produit 29 de moins |
| `O-36-cible` | répétition la plus courte **759 → 733 m** | intact : la mesure suit les durées, la conclusion ne bouge pas |

Trois faux positifs de plus, **et la même cause que ce matin** : le bloc épinglait une VALEUR là
où l'entrée décrit une PROPRIÉTÉ. Sept sur dix en une journée. Le déclencheur d'automatisation
posé par le LOT 1 (« un SEUL commit fait basculer ≥ 2 blocs ») est cette fois **atteint** — ce
commit en fait basculer trois — mais ce qu'il déclencherait (distinguer « motif absent » de
« chemin invalide ») n'aurait rien attrapé ici : les six chemins étaient valides, ce sont les
motifs qui étaient trop précis. La leçon utile est en amont du script : **un bloc `verify`
s'écrit sur la propriété, jamais sur le chiffre du jour.**

### Le résidu NOMMÉ : les bandes SUBSTITUÉES ne pilotent pas la durée

`zoneOf` substitue deux bandes à l'affichage — `bk.rp` par `raceBikeBand` (R20.5) et `rn.mara`
par le prédicteur (B-22/B-25). La conversion, elle, lit `ZDEF` **statique** : `zoneSpeedRatio`
est appelée sans `refs` sur les cinq sites.

C'est un CHOIX, pas un oubli. `bk.rp` est ancrée sur la FTP, donc `zoneSpeedRatio` rend `null`
de toute façon (la vitesse ne suit pas la puissance linéairement — c'est le modèle de Martin qui
répond). Reste `rn.mara` : **36 blocs sur 4 259 (0,85 %)** du balayage, tous en marathon et en
tri. Leur passer la bande substituée demanderait que les CINQ sites la reçoivent — or `baseRefs`
(`{ftp, thrPace, css}`) ne la porte pas et l'auditeur n'en a aucune notion. La donner au seul
générateur rouvrirait l'écart générateur ↔ auditeur que T-25 surveille : c'est précisément le
défaut que ce ticket ferme. Résidu nommé, chiffré, non traité ici.

```verify
id: O-42-unique
quoi: une seule derivation allure→vitesse, et les tables ont disparu
attendu: O42-UNIQUE
cmd: test $(grep -c "SWIM_SPEED_RATIO\|RUN_SPEED_RATIO" src/engine/weekDistances.ts) -eq 0 && test $(grep -c "zoneSpeedRatio" src/generator/renderer.ts src/engine/weekDistances.ts src/engine/loadModel.ts src/readiness/dailyAdjuster.ts | grep -c ":0") -eq 0 && echo "O42-UNIQUE"
```

```verify
id: O-42-c22-metres
quoi: le clamp C22 final sait reduire un bloc prescrit en metres
attendu: O42-C22M
cmd: grep -q "CE CLAMP NE SAVAIT PAS RÉDUIRE DES MÈTRES" src/generator/planGenerator.ts && echo "O42-C22M"
```
