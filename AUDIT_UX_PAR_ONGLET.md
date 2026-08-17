# Audit UX par onglet — 11/08/2026

Mesuré, pas jugé au doigt mouillé. Chaque constat porte son chiffre ; quand c'est un avis, c'est
écrit comme tel.

**Profil de test** : triathlon 70.3, course le 16/05/2027 (J−278), 40 semaines, poids/taille/âge
renseignés, check-in du matin fait, 2 séances validées. Viewport 390 × 844 (iPhone 12/13/14),
`deviceScaleFactor` 2.

**Ce qui est mesuré** : hauteur de défilement, ce qu'on voit sans défiler, densité de texte
(caractères par pixel de hauteur rendue — la métrique de U16), cibles tactiles sous 44 px (le
seuil que U4 a tranché pour ce dépôt), répétitions littérales, nombre d'éléments cliquables,
erreurs JS.

**Aucune erreur JS sur les cinq onglets.** Contraste AA : 0 échec (gardé en CI par `smoke-zenna`).

---

## Vue d'ensemble

| Onglet | Hauteur | Cartes | Cliquables | Densité max | Cibles < 44 px |
|---|---|---|---|---|---|
| 🎯 Aujourd'hui | 2 083 px — **2,5 écrans** | 13 | 10 | 2,76 | 3 |
| 📋 Profil | 2 310 px — **2,7 écrans** | 12 | 28 | 2,96 | **10 replis /10** |
| 🗓 Plan | 2 316 px — **2,7 écrans** | 12 | **227** | 3,00 | **12 replis /13** |
| 📅 Semaine | 2 172 px — **2,6 écrans** | 2 | 23 | 2,58 | 6 (les coches) |
| 🧰 Outils | 1 635 px — **1,9 écran** | 4 | 5 | 2,81 | **aucune ✓** |

Les longueurs sont homogènes et raisonnables (1,9 à 2,7 écrans) — c'est le résultat de U15/U16.
Outils est le seul onglet sans aucune cible sous le seuil : c'est celui qui vient d'être
recomposé, et il sert de référence à ce que les autres devraient être.

---

## 🎯 Aujourd'hui — le meilleur des cinq, avec une redondance

**Ce qui marche.** Le héros donne la séance en trois lignes sans défiler : verdict de forme,
titre, durée, structure. Le bouton de validation est atteignable sans défiler. La densité max
(2,76) est la deuxième plus basse de l'app.

### 1. La séance est écrite DEUX FOIS, à un écran d'intervalle — *mesuré*

Le héros affiche `Échauffement 10min montée progressive · 18min @ 147-160 bpm · Retour au calme
4min` ; la carte « Le détail de la séance », juste en dessous, affiche **les trois mêmes blocs**,
en liste. Vérifié : `blocsCommuns: 3` sur 3.

La carte de détail apporte pourtant deux choses que le héros n'a pas — la barre de zones et le
pictogramme de discipline. C'est le TEXTE qui fait doublon, pas la carte.
*Piste* : la carte de détail garde la barre de zones et perd la répétition des steps.

### 2. Trois cibles sous le seuil — *mesuré*

`🔬 Ce que ton corps fabrique` (328 × **34** px), `🌡 Modifier ma forme du jour` (294 × **17** px),
et la case « Malade aujourd'hui » (24 × 24 — au minimum WCAG absolu, sous le confort de 44).

### 3. La barre de zones n'a pas de légende — *avis*

Elle affiche `1 | 3 | 1` sans dire que ce sont des zones ni ce que valent les segments. Sur
l'écran qui explique la séance du jour, c'est le seul élément muet.

---

## 📋 Profil — le plus dense, et sa hiérarchie est inversée

### 1. « + Nouveau plan » est le contrôle le plus visible de l'écran — *avis, appuyé sur le rendu*

Bouton pleine largeur, **or**, immédiatement sous le sélecteur de plan. Sur un onglet où l'on
vient d'abord consulter ses réglages, l'action visuellement dominante est celle qui **crée un
brouillon et quitte le plan en cours**. Le bouton « Se connecter avec Strava », en accent
saumon pleine largeur lui aussi, entre en concurrence directe.

*Piste* : « Nouveau plan » en bouton secondaire, l'or réservé à ce qui est rare et voulu.

### 2. Les DIX replis de l'onglet sont sous le seuil tactile — *mesuré*

10 `<summary>` sur 10, entre **17 et 22 px** de haut : « Ta course », « Courses intermédiaires »,
« Records personnels », « Sauvegarde », « Journal d'évolution », « Réglages avancés »,
« Les 30 niveaux de chaque discipline »… U17 a corrigé ce défaut pour **les titres de séance**
uniquement ; la même faute vit partout ailleurs.

### 3. Répétitions littérales — *mesuré*

`3× « prochain : (encore 10 XP) »` (une fois par discipline, à l'identique), et deux phrases
adjacentes qui disent la même chose : « Il évoluera avec ta régularité » puis « Nouvelle série —
la régularité sur toute la préparation compte plus qu'une série parfaite. »

Plus `2×` chacun des libellés de priorité de course (« A− — objectif secondaire », « B —
préparation », « C — laboratoire ») : ils sont rendus une fois pour la course principale et une
fois pour les intermédiaires.

### 4. Densité la plus haute de l'app — *mesuré*

2,96 c/px sur la ligne `Intention : Compétition · Objectif : 70.3 · Historique : Régulier 1-3 ans
· Niveau : Intermédiaire · Disponibilité : Quotidienne contrainte · Blessures : Aucune`. Six
couples intitulé/valeur enchaînés en une phrase — exactement ce que la primitive `.kv` d'Outils
existe pour résoudre.

---

## 🗓 Plan — 201 coches invisibles, et un graphique arc-en-ciel

### 1. 201 boutons de validation dans le DOM — *mesuré*

Sur 227 éléments cliquables, **201 sont des `doneBtn`** : les sous-objectifs de phase montent
la grille des **40 semaines** dans le DOM, repliée. Le contenu d'un `<details>` fermé n'est pas
rendu (pas de problème d'accessibilité), mais 201 boutons sont créés et 201 gestionnaires de
clic sont liés **à chaque rendu de l'onglet**.

*Piste* : ne construire le programme d'une phase qu'à son ouverture.

### 2. Le graphique de volume a 5 teintes et une légende qui en explique une — *mesuré*

40 barres, **5 couleurs** (une par phase), légende : « 1 barre = 1 semaine · violet = récup ».
Les quatre autres teintes ne sont expliquées nulle part sur cet écran. La maquette n'en utilise
que deux (violet = récup, orange = semaine en cours), ce qui rend la lecture immédiate.

*Arbitrage à trancher* : la couleur de phase porte du sens (c'est le principe qu'on a gardé
partout), mais ici elle sature un graphique de 40 éléments. Soit on complète la légende, soit on
passe à deux teintes et la phase se lit sur la frise juste au-dessus.

### 3. Deux chemins superposés vers la même chose — *avis*

La frise de phases (cliquable) et la carte « Sous-objectifs — une phase à la fois » (cliquable)
ouvrent le même programme, l'une sous l'autre.

### 4. « TON OBJECTIF · TON CHRONO VISÉ » — *mesuré*

Le sur-titre et le titre commencent tous deux par « TON ». Deux répétitions mesurées par
ailleurs : `2× « Performance — chrono cible »`, `2× « Marges resserrées — assumées »`.

### 5. 12 replis sur 13 sous le seuil tactile — *mesuré*

Même famille qu'au Profil : « 🎯 Prédiction de course » (17 px), « ⚡ Répartition des intensités »
(17 px), « Conseils personnalisés » (17 px), « Pourquoi ce plan », « Les décisions du moteur »…

---

## 📅 Semaine — propre, sauf la coche

**Ce qui marche.** Deux cartes seulement, densité la plus basse de l'app (2,58), zéro
répétition, **7 replis sur 7 au-dessus du seuil** (c'est l'onglet qu'U17 a traité). Les anneaux
par discipline et la ligne de distances situent la semaine avant le détail.

### 1. La coche fait 42 px, pas 44 — *mesuré, et la documentation dit 44*

`.doneBtn` fait 26 px avec une extension `::after { inset: -9px }`, soit 26 + 18 = 44 **en
théorie**. Au rendu : **42 × 42**. Cause : `inset` se calcule sur la boîte de *padding*, et la
bordure de 1,5 px est retranchée de chaque côté.

Ce n'est pas grave (WCAG 2.5.8 exige 24), mais c'est **la note d'U8 qui est fausse** — elle
affirme « sa `::after` la porte à 44 × 44 ». Correctif : `inset: -10.5px`, ou `box-sizing`
explicite. Six coches concernées sur l'écran.

---

## 🧰 Outils — la référence

Le plus court (1,9 écran), **aucune cible sous le seuil**, aucune répétition, deux replis sur
deux conformes. C'est l'onglet recomposé sur la maquette, et il montre ce que les primitives
`fold` + `.kv` apportent : on lit les chiffres en diagonale, le sommaire porte la valeur.

**Seul reproche** : la densité y reste haute (2,81) sur les avertissements de nutrition — mais
ce sont des textes qu'on ne peut pas raccourcir sans les affaiblir, et ils sont dans un repli.

---

## Ce qui traverse les cinq onglets

### A. Le seuil tactile n'a été appliqué qu'aux titres de séance

**24 replis sur 36** sont sous 44 px. La répartition est nette : Semaine 0/7, Outils 0/2 (les
deux onglets retravaillés), contre Profil 10/10, Plan 12/13, Aujourd'hui 2/4.

U17 a mesuré et corrigé le problème pour `.gd-sess summary` en concluant « c'était un standard
à appliquer, pas une décision de design ». La conclusion vaut pour les autres — **c'est le
correctif au meilleur rapport effort/effet de cet audit** : une règle sur `summary`, et les 24
passent d'un coup.

### B. La primitive `.kv` n'existe que dans Outils

Les trois densités les plus hautes de l'app (2,96 / 3,00 / 2,81) sont toutes des **suites de
couples intitulé/valeur écrites en prose**. Outils a résolu exactement ça.

### C. Le format de date des champs natifs suit la langue du NAVIGATEUR

Mesuré `mm/dd/yyyy` sur un contexte `fr-FR` : Chromium prend la langue de son interface, pas
celle de la page. **Hors de notre contrôle** — noté pour qu'on ne le prenne pas pour un bug.

---

## Par où je commencerais

1. **Le seuil tactile sur tous les `summary`** — une règle, 24 cibles corrigées, zéro arbitrage.
2. **Les 201 coches de l'onglet Plan** — construire le programme d'une phase à son ouverture.
3. **La répétition de la séance sur Aujourd'hui** — le texte, pas la carte.
4. **La hiérarchie du Profil** — « Nouveau plan » en secondaire.
5. **`.kv` au Profil et au Plan** — la brique existe déjà.
6. **La coche à 44 px** — deux pixels, et une note de documentation à corriger.
7. **Le graphique de volume** — le seul point qui demande ton arbitrage (sens contre lisibilité).
