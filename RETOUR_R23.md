# Retour du fondateur du 06/08/2026 — triage

Retour long, structuré par onglet, reçu avec deux captures et l'image de partage. Ce document
existe pour qu'aucun point ne se perde : chaque item porte un ID, ma LECTURE (ce que j'ai compris),
et sa NATURE — **défaut** (le produit ne fait pas ce qu'il promet), **déplacement** (l'information
existe mais au mauvais endroit), **arbitrage** (une décision produit à prendre), **chantier**
(plusieurs jours de travail).

Rien n'est fermé ici. Ce qui est livré migre vers `ARCHITECTURE.md` avec sa mesure ; ce qui est
refusé ou reporté reste écrit AVEC sa raison.

---

## Ordre de traitement

Le manifeste range santé > prévention > régularité > progression > performance > esthétique >
nouveautés. L'ordre ci-dessous en découle, il n'est pas celui du retour :

1. **R23.1** — un seuil aberrant entre dans les références et pilote les zones. *Défaut de
   sécurité.* → **en cours**
2. **R23.2 / R23.3 / R23.4** — les trois défauts d'usage qui bloquent ou piègent (portillon du
   check-in, modale de validation sans sortie, image de partage).
3. **R23.5 → R23.12** — les déplacements de cartes entre onglets. Mécaniques, à faire d'un bloc
   pour ne pas laisser l'app dans un état intermédiaire.
4. **R23.13 → R23.17** — les ajouts (protocoles, dénivelé exact, calculateur…).
5. **R23.18 → R23.20** — les arbitrages et chantiers (multi-objectif A, canal de vente, bikefitting).

---

## 1. Sécurité — ce qui fausse un plan

### R23.1 · Un seuil sous 1 min/km entre dans les records, et dans les zones · **DÉFAUT**

> *« l'onglet record personnel bug d'affichage, il note également un seuil a moins d'une minute au
> kilomètre, sans doute l'artefact d'une course »*

Diagnostic : `PHYSIO_BOUNDS` (règle E3, audit v6 — « une FTP de 9999 W produit des zones absurdes
affichées sans bruit ») borne `ftp`, `hrMax`, `hrRest`, `weight`, `height`, `age`. Elle **ne borne
ni `thrPace` ni `css`** — les deux références qui pilotent toutes les zones de course et de nage.
Et l'import écrit `Math.round(1000 / avgSpeedMs)` sans aucun contrôle.

C'est grave parce que la valeur est PROMUE en référence vivante : un artefact (GPS, sortie vélo
étiquetée course, portion en voiture) devient l'allure sur laquelle tout le plan calcule.

Même famille que **R20.1** (« la garde couvrait le sport où le code a été écrit, pas celui où il
sert ») et **O-16** (« la borne d'âge fermée côté format, jamais rejouée sur l'écran de nutrition
arrivé après »).

### R23.1b · Le bug d'AFFICHAGE des records · **DÉFAUT**

Signalé dans la même phrase, à traiter avec — mais c'est un second symptôme, pas le même défaut.

---

## 2. Défauts d'usage

### R23.2 · Le portillon du check-in se déclenche à minuit · ✅ **LIVRÉ (06/08/2026)**

> *« Blocage de l'onglet avec les questions "sommeil.. etc" alors que j'ai ouvert l'application
> hier à minuit donc avant même de dormir »*

Le check-in est indexé sur la DATE (`S.answers.readiness.date`). Ouvrir l'app à 00 h 10 déclenche
« comment as-tu dormi ? » avant même d'être allé se coucher. La journée d'entraînement ne commence
pas à minuit — il faut une frontière de jour qui suive l'usage, pas le calendrier.

**Livré** : `jourEntrainementISO()` (point unique, `state.js`), frontière à **4 h locales**. Ce
n'est pas un réglage arbitraire — c'est l'heure après laquelle un réveil est un vrai réveil (les
départs les plus matinaux, Ironman et ultra, sont à 5-6 h, et on se lève une à deux heures avant).
Portée volontairement étroite : la frontière ne sert QU'AU portillon et à l'horodatage de la
réponse (un seul repère, R11.1) ; elle ne touche ni le jour du plan, ni la séance affichée, ni les
séries — décaler ces notions changerait quelle séance est « celle du jour ».

Mesuré, à check-in répondu le mardi 20 h : **23 h 40 visible · 00 h 10 visible · 03 h 50 visible ·
04 h 10 portillon · 08 h 00 portillon**. Avant le correctif, tout ce qui suivait minuit était un
portillon. Garde `R23.2` dans `smoke-checkin` (6 critères balayant la frontière **des deux
côtés**), vérifiée rouge sur deux cassures.

*Note d'instrument, gardée écrite* : ma première sonde étiquetait « 03 h 30 » ce qui était en fait
05 h 30 — j'avais compté les décalages comme des heures de Paris alors que l'ancre est en UTC. Et
ma toute première version ne parvenait pas à répondre au check-in dans le contexte de départ : le
témoin (mardi 23 h 40, réponse donnée) sortait « portillon », ce qui a suffi à la disqualifier
avant qu'elle ne serve à conclure quoi que ce soit.

### R23.3 · On ne peut pas sortir de la validation de séance · ✅ **LIVRÉ (06/08/2026)**

> *« une fois clicker On ne peut pas sortir de la validation de la scéance en cas d'erreur de clic »*
> *« Interphase de validation trop imposant »*

Un geste involontaire enferme. Deux choses : une sortie, et une interface moins imposante.

**La cause, mesurée** : les trois modales du produit (feedback post-séance, félicitations,
révélation de retest) n'offraient **qu'Échap** — une touche qui n'existe pas sur un téléphone,
c'est-à-dire sur le seul appareil où ce produit se vit. Aucune croix, aucun clic sur le voile.
La sortie EXISTAIT donc, et ne servait à personne : même forme qu'**U8** (« le bon message existait
et était mort ») — ce n'est pas une fonctionnalité manquante, c'est une fonctionnalité
inatteignable. Et les critères E2E d'accessibilité passaient tous, puisqu'ils testent Échap.

**Livré** : deux sorties posées dans `trapModal` — le point unique, plutôt que dans les trois
appelants (c'est justement l'absence de point unique qui leur avait fait partager le même trou).
Une **croix** (44×44, le standard U4, `aria-label="Fermer"`, le focus allant toujours au premier
contrôle UTILE et non à elle) et le **clic sur le voile**.

Garde `R23.3` dans `smoke-improvements` (8 critères), vérifiée rouge sur deux cassures — croix
retirée (5 rouges) et clic sur le voile débranché (1 rouge).

**Une limite PUBLIÉE** : `trapModal` ne ferme sur le voile que si le geste commence ET finit sur
lui, sans quoi un glissement parti d'un bouton fermerait la modale — le défaut symétrique. Le
mécanisme est réel (mesuré en isolé : un `mousedown` sur un bouton suivi d'un `mouseup` sur le
voile produit bien un `click` ciblant le voile). Mais **le critère que j'avais écrit pour lui ne
discriminait pas** : vérifié en retirant la garde, il sortait vert. Il est retiré plutôt que gardé
en décoration, et la limite est écrite dans la suite : cette garde-là n'est couverte par aucun
test. À reprendre avec un harnais qui sait rejouer un glissement dans la modale réelle.

**Reste de R23.3** : « interface trop imposante » — non traité dans ce lot.

### R23.4 · L'image de partage : fond transparent · ✅ **LIVRÉ (06/08/2026)**

> *« Problème d'affichage du texte, je voudrait que ça soit en transparence, que l'on puisse
> l'ajouter par dessus une photo, pas un fond coloré, retravaille peut être l'esthétique »*

PNG à fond transparent pour surimpression sur une photo — donc typographie qui tient sur clair
comme sur sombre, et pas seulement sur le beige actuel.

**Livré, trois choses.** Le beige `#f1eadb` disparaît (l'alpha est conservé par `toBlob`). Le
texte passe en **blanc avec un halo sombre** — c'est la solution des sous-titres vidéo, la seule
qui tienne sur un fond qu'on ne contrôle pas ; l'encre sombre d'origine était illisible dès que la
photo est sombre, et une carte qu'on ne peut poser que sur une photo claire n'est pas une carte
transparente. Ce n'est donc pas un choix de goût mais une conséquence de la transparence. Les
couleurs de phases et les barres restent : elles sont saturées, elles se lisent des deux côtés.
Enfin `txt()` devient le point unique du texte, avec **rétrécissement** si une ligne dépasse la
largeur utile.

Mesuré : alpha 0 aux quatre coins, 242 369 pixels d'encre, pixel opaque le plus à droite **1019
sur 1080**. Garde `R23.4` dans `smoke-usage` (4 critères), vérifiée rouge sur deux cassures — fond
beige remis (2 rouges), rétrécissement retiré avec une ligne trop longue (1 rouge).

**Ce que je n'ai PAS démontré, et c'est écrit dans le code.** Le canvas dessinait sans jamais
attendre les polices (`document.fonts.ready` absent) : `fillText` utilise ce qui est chargé à cet
instant, et une police de repli a d'autres métriques. L'attente est ajoutée — c'est juste — mais
**je n'ai pas reproduit le débordement** : ma simulation d'absence de police (retrait de la
feuille de style + `document.fonts.clear()`) rendait une mesure IDENTIQUE au cas normal, parce
que retirer un `<link>` ne décharge pas des polices déjà chargées. Je ne peux donc pas affirmer
que c'était la cause du « problème d'affichage » que tu as vu. Ce qui garantit le cadre quoi qu'il
arrive, c'est le rétrécissement — lui est mesuré.

**Pas touché** : le fond dégradé de l'image de partage post-séance (`storyBlob`). Elle reçoit
l'attente des polices, mais transformer son esthétique sans décision serait déborder de la
demande, qui portait sur la carte du PLAN.

---

## 3. Déplacements — ✅ **LIVRÉS (06/08/2026)**, sauf R23.10 / R23.11 / R23.13

Livrés : **R23.5** (décompte J−N + avancement en tête de 🗓 Plan) · **R23.6** (« Pourquoi ce
plan » descend juste avant le détail des décisions) · **R23.7** et **R23.9** (prédiction et
intensités quittent 🎯 Aujourd'hui pour 🗓 Plan, **repliées** — la version compacte que tu
demandais) · **R23.12** (le bouton devient « 📤 Partage », sous l'avancement) · **R23.12b** (« suivre
ma séance en direct » supprimé) · **R23.12c** (« Voir tout le plan », « Version imprimable »,
« Ajouter à mon agenda »).

**R23.6 révise une décision antérieure, et c'est assumé** : R6 avait mis « Pourquoi ce plan » en
tête au motif que « l'explicabilité est le contre-positionnement du produit ». Les deux ont raison
sur leur objet — l'explicabilité RESTE (ni repliée ni retirée), elle cesse seulement d'être ce
qu'on lit AVANT son plan.

**La garde U15 a fait son travail** : déployées, les cartes déplacées faisaient passer 🗓 Plan de
3,8 à **5,2 écrans** et U15 est passée rouge. On n'a pas relâché la garde — on a tenu la demande
(« version plus compacte, puis un déroulable ») : les deux cartes arrivent repliées, **4,3 écrans**.

**R23.10 · R23.11 · R23.12b (reste) — livrés le 06/08/2026 aussi.** Les conseils personnalisés
partent du Profil pour 🗓 Plan (repliés) : ce sont des conseils sur la PRÉPARATION, pas des données
d'identité — le Profil raconte qui tu es, le Plan dit ce qu'on en fait. Le rappel quotidien prend
sa propre carte : il vivait entre le CSS et le poids cible, et depuis U18b cette carte est
REPLIÉE — il y serait devenu invisible. « Modifier mes réponses » et « changer de sport » quittent
le Profil : 🗓 Plan les porte déjà, et deux chemins vers le même geste dans deux onglets, c'est un
de trop.

Débusqué en le faisant : retirer les deux boutons sans retirer leurs gestionnaires levait un
`null` **à chaque rendu de l'onglet** — trois erreurs console par visite, attrapées par
`smoke-r4` (« aucune erreur console »).

**Encore ouvert** : R23.13 (séparer athlète / course, avec le dénivelé exact).

### (détail d'origine)

| ID | Ce qui bouge | D'où | Vers | Note |
|---|---|---|---|---|
| **R23.5** | Avancement du plan + **décompte des jours avant la course** | — | **haut de 🗓 Plan** | c'est la première chose qu'on veut voir |
| **R23.6** | « Pourquoi ce plan » | haut de Plan | **plus bas** | *« trop tôt, l'utilisateur veut d'abord les infos »* — révise R6/U15, qui avaient tranché l'inverse |
| **R23.7** | Prédiction + charge | 🎯 Aujourd'hui | **🗓 Plan**, sous l'avancement | version COMPACTE : temps actuel + temps projeté, explications dans un déroulable |
| **R23.8** | Mini-graphique de charge (phase en cours + avancement) | — | 🗓 Plan | complément de R23.7 |
| **R23.9** | Répartition des intensités | 🎯 Aujourd'hui | **🗓 Plan** | |
| **R23.10** | Conseils personnalisés | 📋 Profil | **🗓 Plan** | |
| **R23.11** | Rappel quotidien | (Références) | **📋 Profil**, à part | |
| **R23.12** | Export PNG → renommé **« Partage »** | bas de Plan | sous l'avancement | *« intéressant dans l'idée mais mal nommé »* |

### R23.12b · À SUPPRIMER

- **« Suivre ma séance en direct »** — *« personne ne fait ça »*
- **« Régularité d'avancement »** — *« peu visuel et important pour l'utilisation »*
- **« Modifier mes réponses » et « changer de plan »** au Profil — *« n'a pas sa place ici »*

### R23.12c · À RENOMMER

- « Voir les 42 semaines » — *« très peu ergonomique »*
- l'export HTML — *« pas mal, mais peu parlant pour l'utilisateur lambda ; peut-être "imprimable" ? »*
- l'agenda — *« marche bien, mais pareil nom à revoir »*

---

## 4. Séparations et ajouts

### R23.13 · Séparer l'ATHLÈTE de la COURSE · **déplacement structurant**

> *« j'aimerai qu'on sépare les caractéristiques de l'athlète de celles de la course, j'aimerai même
> que les caractéristiques de course remontent "les plans" avec une option avancée pour les
> paramètres de sa course, peut être pouvoir indiquer le dénivelé exact »*

La carte « ⚙ Références d'entraînement » mélange les deux depuis l'origine (FTP + profil du
parcours + température de l'eau). Séparation nette, et les paramètres de COURSE remontent dans
🗓 Plan, avec une section « avancé » (dénivelé exact, etc.).

### R23.14 · Les protocoles de mesure (seuil, FTP, CSS) · **ajout**

> *« J'aimerai qu'on ajoute, quelque part, les protocoles simples de calcul seuil, ftp et css »*

À croiser avec **R23.15** : les retests doivent PORTER ces protocoles, pas juste dire « refais un
test ». Et une option « ajouter automatiquement des retests dans le plan ».

### R23.15 · Retest = protocole + insertion automatique optionnelle · **ajout**

### R23.16 · Strava plus accessible · **déplacement**

> *« J'aimerai que la connexion à Strava soit plus accessible dans l'app, c'est un outil important »*

### R23.17 · Séances cliquables · 🔍 **MESURÉ (06/08/2026) — le diagnostic change**

> *« J'aimerai que l'on puisse voir le détail des séances en cliquant dessus »*

U16 a livré exactement ça (séances repliables partout, `<details>`). Soit c'est une régression, soit
l'affordance ne se voit pas sur la vue concernée. **À mesurer avant d'écrire une ligne.**

**Mesuré, sur un semi à 5 séances :**

| onglet | blocs `<details>` | ce qu'ils portent |
|---|---|---|
| 🗓 Plan | **19** | cartes (chrono visé, prédiction, intensités, phases) **et** les séances de la grille |
| 📅 Semaine | **9** | « Seuil progressif », « Endurance soutenue », « Footing récup »… — les séances |
| 🎯 Aujourd'hui | **0** | rien n'est repliable |

Donc **ce n'est pas une régression** : les séances SONT cliquables là où il y a une grille. Le trou
réel est 🎯 Aujourd'hui — la séance du jour y est affichée en héros, dépliée, et **n'a aucun
`<details>`** : il n'y a rien à ouvrir, donc rien qui invite à le faire. C'est cohérent avec le
reste du lot (l'onglet est désormais « ce que je fais maintenant »), mais le détail complet d'une
séance ne s'y atteint pas.

*Note d'instrument, gardée écrite* : ma première sonde filtrait les `<summary>` sur `/min|km|@/`
et comptait **0 séance cliquable partout** — y compris dans 📅 Semaine où elles le sont
manifestement. Les titres de séance ne contiennent ni minutes ni kilomètres (« Seuil
progressif »), le filtre ne mesurait donc rien. Sans l'affichage des `summary` bruts, j'aurais
conclu à une régression générale et corrigé un défaut qui n'existe pas.

**Reste à faire** : rendre la séance du jour dépliable dans 🎯 Aujourd'hui.

---

## 5. Arbitrages et chantiers

### R23.18 · Deux objectifs A sur un seul plan · **CHANTIER + arbitrage**

> *« est ce qu'on peut faire une prépa multi course ? Comme deux objectifs A ? Calibrer 2 objectifs
> sur 1 seul plan (ça serait une option premium à terme si on y arrive) »*
>
> **Cadrage du fondateur (06/08/2026)** : *« la course renseignée serait la course optimale et
> l'intermédiaire un objectif A- »*.

Ce cadrage tranche la question la plus difficile, celle de la hiérarchie : il n'y a pas deux pics
égaux à concilier. La course déclarée reste **l'objectif A** — c'est elle qui gouverne la durée de
préparation, la spécificité et le vrai affûtage. L'intermédiaire devient un **A-** : plus qu'une
course B (elle mérite une décharge réelle avant, pas un simple allègement, et une récupération
dimensionnée derrière), moins qu'un A (elle ne déplace pas le pic et ne s'approprie pas la
spécificité).

Reste à décider avant d'écrire : l'écart minimal entre A- et A (trop près, l'affûtage du A- mange
la dernière phase de charge du A ; trop loin, c'est une course B), et ce qu'on fait quand les
formats diffèrent (un 10 km en A- pendant une prépa Ironman ne demande pas le même aménagement
qu'un semi).

Réponse courte : **oui, c'est faisable, et c'est un vrai chantier de périodisation**, pas une option
d'affichage. Le moteur construit une courbe UNIQUE qui monte vers un pic puis affûte. Deux
objectifs A demandent deux pics et un mini-affûtage + réaffûtage entre les deux — ce que la
littérature appelle une double périodisation.

Ce qui existe déjà et qu'il faut distinguer : les **courses intermédiaires** (R10) sont des courses
B/C, avec allègement de la semaine et récup derrière — ce n'est PAS un second objectif A.

Ce qu'il faudra décider avant d'écrire : l'écart minimal entre deux A (sous ~8 semaines, le
deuxième n'est plus un objectif A mais une course B), et lequel des deux gouverne la spécificité
si les formats diffèrent.

### R23.19 · L'onglet 📅 Semaine devient un onglet OUTILS · **arbitrage + chantier**

> *« L'onglet semaine perd son intérêt, il sera sans doute transformé en onglet outil à terme :
> protocoles de retest, un calculateur virtuel d'allure/distance/temps à titre purement informatif.
> Je travaille sur un outil de bikefitting qui n'est pas prêt. Si tu as d'autres idées je suis
> preneur »*

Idées à proposer (aucune n'est décidée) : convertisseur allure ↔ vitesse ↔ chrono par distance ;
calculateur de zones depuis une référence saisie ; équivalences de chrono entre distances (Riegel,
déjà dans le moteur) ; table des barrières horaires ; simulateur « et si je perds 2 kg » (le levier
P9 existe déjà, sous gardes) ; convertisseur température/combinaison (le seuil 24,5 °C est déjà
codé) ; estimation du D+ effort (km-effort, déjà dans le module trail).

### R23.20 · La nutrition devient un canal de vente · ⛔ **ABANDONNÉ (décision du fondateur, 06/08/2026)**

> *« ok annule le canal de vente pour le moment »*

Décision prise, entrée close. Ce qui RESTE ouvert de ce point, et qui n'est pas la même chose : la
**densification** du ravitaillement dans 🎯 Aujourd'hui (juste les informations du jour). Elle est
un déplacement, elle ne touche aucune frontière, et elle reste à faire.

La raison pour laquelle je l'avais signalé reste écrite ci-dessous — non pas pour rouvrir le sujet,
mais parce qu'une décision sans son motif est une décision qu'on reprend par erreur dans six mois.



> *« L'onglet nutrition est très dense aussi, il mérite peut-être d'être plus direct dans l'onglet
> aujourd'hui dans un premier temps avec juste les informations du jour ? Remplacer à terme par le
> canal de vente/commande ? »*

Deux choses très différentes, à ne pas traiter ensemble :

- **la densification** (ravito du jour dans 🎯 Aujourd'hui) : faisable, c'est un déplacement.
- **le canal de vente** : ça sort du périmètre du produit tel qu'il est écrit, et ça touche la
  ligne que `H-3` tient depuis l'origine — *le CONSEIL nutritionnel reste bloqué sur avis
  diététicien*. Vendre un produit nutritionnel À CÔTÉ d'une estimation de dépense qu'on affiche
  soi-même change la nature de l'estimation : elle cesse d'être une photographie des consensus pour
  devenir un argument. À trancher explicitement, pas à glisser.

### R23.21 · Modifier les paramètres directement dans le plan · **arbitrage**

> *« Dans les plans, j'aimerai qu'on puisse modifier directement les paramètres »*

Recoupe R23.13. Le point à trancher : une modification depuis le plan REGÉNÈRE le plan (donc les ✓
et le journal doivent survivre — ils vivent déjà par plan) ou bien elle n'agit qu'à la prochaine
génération. Le premier est ce qu'attend l'utilisateur ; le second est ce que fait le bouton actuel.
