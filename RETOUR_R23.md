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

### R23.2 · Le portillon du check-in se déclenche à minuit · **DÉFAUT**

> *« Blocage de l'onglet avec les questions "sommeil.. etc" alors que j'ai ouvert l'application
> hier à minuit donc avant même de dormir »*

Le check-in est indexé sur la DATE (`S.answers.readiness.date`). Ouvrir l'app à 00 h 10 déclenche
« comment as-tu dormi ? » avant même d'être allé se coucher. La journée d'entraînement ne commence
pas à minuit — il faut une frontière de jour qui suive l'usage, pas le calendrier.

### R23.3 · On ne peut pas sortir de la validation de séance · **DÉFAUT**

> *« une fois clicker On ne peut pas sortir de la validation de la scéance en cas d'erreur de clic »*
> *« Interphase de validation trop imposant »*

Un geste involontaire enferme. Deux choses : une sortie (Échap / fermeture / retour), et une
interface moins imposante.

### R23.4 · L'image de partage : fond transparent, et le texte déborde · **DÉFAUT + esthétique**

> *« Problème d'affichage du texte, je voudrait que ça soit en transparence, que l'on puisse
> l'ajouter par dessus une photo, pas un fond coloré, retravaille peut être l'esthétique »*

PNG à fond transparent pour surimpression sur une photo — donc typographie qui tient sur clair
comme sur sombre (contour ou ombre portée), et pas seulement sur le beige actuel.

---

## 3. Déplacements — l'information existe, elle est au mauvais endroit

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

### R23.17 · Séances cliquables dans le détail (onglet Plan) · **à VÉRIFIER d'abord**

> *« J'aimerai que l'on puisse voir le détail des séances en cliquant dessus »*

U16 a livré exactement ça (séances repliables partout, `<details>`). Soit c'est une régression, soit
l'affordance ne se voit pas sur la vue concernée. **À mesurer avant d'écrire une ligne.**

---

## 5. Arbitrages et chantiers

### R23.18 · Deux objectifs A sur un seul plan · **CHANTIER + arbitrage**

> *« est ce qu'on peut faire une prépa multi course ? Comme deux objectifs A ? Calibrer 2 objectifs
> sur 1 seul plan (ça serait une option premium à terme si on y arrive) »*

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

### R23.20 · La nutrition devient un canal de vente · **arbitrage, HORS PÉRIMÈTRE ACTUEL**

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
