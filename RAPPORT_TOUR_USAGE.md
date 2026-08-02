# Tour du produit côté usage — ce qui accroche quand on traverse l'app sur un téléphone

**02/08/2026.** Pas un audit du moteur : une traversée de la PWA comme le ferait quelqu'un qui
l'installe, dans un vrai Chromium, en 390×844 (iPhone 13/14/15) et en 320×568 (iPhone SE).
Profil de référence : triathlon 70.3, niveau intermédiaire, 6 séances, 10 h/sem.

Tout ce qui suit est **mesuré**, pas supposé. Les scripts de mesure sont reproductibles ; ce qui
n'a pas pu être établi est dit comme tel, et deux pistes que j'ai suivies puis **réfutées** sont
consignées à la fin — elles auraient fait deux faux défauts dans ce rapport.

Classé par ce que ça coûte à la personne, pas par difficulté de correction.

---

## 1. Un plan créé un dimanche accueille par « la vie a pris le dessus »

**Le premier écran d'un plan créé à l'instant peut annoncer trois séances manquées.**

```
🌿 La vie a pris le dessus — ça arrive. Trois séances sont passées, et ce n'est
ni grave ni un échec : le plan encaisse. Reprends par la prochaine séance FACILE…
```

C'est le message de relance de `missedSessionsCheck` (`notifications.js:87`), et il s'affiche
**au-dessus de la séance du jour, le jour même de la création du plan**.

Mécanisme : le plan démarre au **lundi de la semaine en cours** (R8/R9 — décision juste, elle
évite d'attendre une semaine pour commencer). `missedSessionsCheck` parcourt ensuite tous les
jours dont la date est antérieure à aujourd'hui et compte les séances non cochées. Il ne peut pas
distinguer **« tu as décroché »** de **« ton plan n'existait pas encore »**.

Balayé sur les sept jours de la semaine, à moteur inchangé (date du navigateur figée) :

| jour de création | ce que dit l'écran d'accueil |
|---|---|
| lundi → samedi | la séance du jour, normalement |
| **dimanche** | **« La vie a pris le dessus — trois séances sont passées »** |

**1 jour sur 7** sur ce profil. La fenêtre dépend de la densité de la semaine : plus il y a de
jours d'entraînement dans la semaine 1, plus tôt le compteur atteint 3 — un profil à 6 ou
7 séances déclencherait dès le vendredi ou le jeudi. Je n'ai pas pu chiffrer cette variante :
mon automate ne franchit pas le questionnaire sur ces réglages (voir « ce que je n'ai pas pu
mesurer »).

**Pourquoi c'est le point n°1.** Le manifeste met la régularité en priorité 3 et toute la boucle
de rétention (R4) est construite pour ne jamais reprocher. Ici l'app fait pire qu'un reproche :
elle console quelqu'un qui n'a rien fait de mal, sur son tout premier écran, à la seconde où il
vient de nous accorder sa confiance. Le message est bienveillant ; c'est son déclenchement qui
ne l'est pas.

**Direction de correction** : ne compter comme manquée qu'une séance dont la date est
**postérieure à la création du plan** (`plan_start` existe déjà et porte cette information depuis
le lot « Améliorations »).

---

## 2. « Bonsoir 🌙 C'est l'heure du point du matin »

Le salut est **conscient de l'heure** — cinq états dans `checkin.js:11` :

| heure | salut |
|---|---|
| < 5 h | Debout tôt 🌙 |
| 5–12 h | Salut ☀️ |
| 12–18 h | Bon après-midi |
| 18–22 h | Bonsoir 🌙 |
| ≥ 22 h | Encore debout 🦉 |

…mais la phrase qui le suit et le bandeau qui le surmonte disent **« point du matin »** en dur,
à quatre endroits (`checkin.js` lignes 22, 78, 114 ; `tab-week.js` ligne 79).

Mesuré à 14 h 30, tel quel à l'écran :

> **POINT DU MATIN · 1/3**
> **Bon après-midi** C'est l'heure du **point du matin**. Première question : tu as dormi
> combien de temps ?

Le check-in se re-joue à la demande (« ↻ Refaire mon point du matin ») et l'app s'ouvre dessus à
toute heure : la contradiction est visible dès qu'on ouvre l'app l'après-midi ou le soir,
c'est-à-dire souvent. Quelqu'un a pris soin d'écrire cinq saluts ; le reste de la phrase annule
ce soin.

**Direction** : nommer la chose par ce qu'elle est (« ton point », « point du jour »), ou faire
suivre l'heure aux quatre occurrences comme elle est déjà suivie au salut.

---

## 3. L'app annonce à l'athlète que son plan vaut 70/100

Onglet 🗓 Plan, en clair dans le titre d'une section (`plan-view.js:321`) :

> 🧠 Les décisions du moteur (9) — **score d'audit 70/100**

Mesuré sur 30 profils (10 formats × 3 niveaux) :

| | |
|---|---|
| médiane | **100** |
| sous 80 | **3 / 30** |
| violations dures | **0 sur 30** |

Et les trois plans à 70, ce sont **les trois Ironman** — `tri/Full` à tous les niveaux. Donc la
personne qui prépare l'épreuve la plus dure du catalogue, sur onze mois, est précisément celle à
qui l'app annonce le score le plus bas — pour un plan qui ne porte **aucune violation dure**.

Le chiffre est juste : c'est un score de critères souples, et il est bas parce qu'un Ironman
sature les plafonds. Mais l'athlète ne dispose d'aucun moyen de le savoir, et un score sur 100 ne
se lit que d'une façon : comme une note. Or il n'y a rien à en faire — le plan est soit assez bon
pour être suivi, soit il ne l'est pas.

**Direction** : garder le score pour le développement (il est précieux) et ne montrer à l'athlète
que ce sur quoi il peut agir. La carte « Pourquoi ce plan » de R20.2 fait déjà exactement ça,
juste au-dessus, et bien.

---

## 4. Des cibles tactiles sous le minimum, dont une à 18×14 px

Mesuré au rendu réel, en pixels CSS, sur un viewport tactile :

| contrôle | taille | où | libellé accessible |
|---|---|---|---|
| **⇄** (échanger deux jours) | **18 × 14** | 📅 Semaine, une par jour | oui |
| ○ / ✓ (marquer fait) | 26 × 26 | Semaine et Plan | oui |
| boutons de la frise de phases | 26 × 26 | 🗓 Plan | oui |

Le minimum de la WCAG 2.5.8 est **24 × 24** ; le confort tactile communément retenu est 44 × 44.
Le **⇄ est sous les deux**, et c'est le geste que R18/R16 ont introduit pour réparer une semaine
qui ne tombe pas bien — donc un geste que l'on fait précisément quand on est contrarié.

Volumétrie : **220 contrôles sous 44 px sur l'onglet 🗓 Plan**, 21 sur 📅 Semaine, 12 sur
📋 Profil. Tous portent un `aria-label` correct — l'accessibilité au lecteur d'écran est faite,
c'est **la taille du doigt** qui manque.

Aucun débordement horizontal nulle part, à 390 px comme à 320 px : la leçon de R18.1 tient.

---

## 5. Le plan est un mur de 5 310 px

Hauteur de page mesurée, à 390 px de large :

| onglet | hauteur | mots |
|---|---|---|
| 🗓 Plan | **5 310 px** (≈ 6 écrans) | 602 |
| 📋 Profil | **4 030 px** | 593 |
| 📅 Semaine | 1 443 px | 154 |
| 🥗 Nutrition | 986 px | 226 |
| 🎯 Aujourd'hui | 3 261 px (après check-in) | 679 |

L'onglet Plan replie déjà les semaines 4 à 43 — sans ça il serait bien pire. Mais on y trouve
encore, à la suite : la frise de saison, « Pourquoi ce plan », les sous-objectifs, trois semaines
détaillées jour par jour, la semaine 44, les décisions du moteur, six boutons d'export. Ce n'est
pas illisible ; c'est simplement beaucoup pour un écran qu'on consulte debout.

Rien de cassé ici — c'est une observation, à arbitrer contre le fait que tout y est réellement
utile.

---

## 6. Le questionnaire : 8 écrans, 37 gestes

Chronométré de bout en bout, sport choisi → plan affiché : **8 s** de machine, mais **37 gestes**
humains.

| écran | titre | questions | champs | hauteur |
|---|---|---|---|---|
| 1 | L'intention | 2 | 1 | 763 px |
| 2 | Sécurité d'abord | 3 | 0 | 677 px |
| 3 | Le profil de ta course | 3 | 1 | **1 184 px** |
| 4 | Profil physique | 1 | 2 | 715 px |
| 5 | Tes niveaux (3 disciplines) | 4 | 0 | 793 px |
| 6 | Historique & blessures | 2 | 0 | 659 px |
| 7 | Ta capacité réelle | **6** | 0 | **1 252 px** |
| 8 | Ton plan est prêt 🎯 | — | — | 734 px |

Les écrans 3 et 7 font une fois et demie la hauteur de l'écran : on répond à des questions qu'on
ne voit pas encore. L'écran 7 en porte six d'un coup.

C'est le prix d'un plan qui tient compte de tout, et le fondateur a explicitement voulu que
chaque réponse agisse (garde `audit:sensibilite`). À arbitrer, pas à corriger d'office.

---

## 7. Trois secondes fixes avant de voir sa séance

Après la dernière question du check-in :

> **C'est noté 👍** — Je regarde ta forme, ta fatigue des derniers jours et la météo — ta séance
> arrive…

La séance apparaît **3,26 s** plus tard. J'ai d'abord cru à une attente réseau (la phrase parle
de météo) et j'ai vérifié dans trois conditions :

| condition | séance affichée après | appels réseau externes |
|---|---|---|
| réseau normal | 3 262 ms | **aucun** |
| hors ligne (requêtes coupées) | 3 261 ms | aucun |
| réseau qui ne répond jamais | 3 259 ms | aucun |

**C'est une temporisation fixe, pas une attente réseau** — l'app ne se bloque donc jamais hors
ligne sur cet écran, ce qui est la bonne nouvelle du test. Reste que 3,2 s d'attente répétés
chaque matin, pour une donnée déjà calculée, se paient en agacement au bout d'une semaine.

---

## Ce que j'ai vérifié et ce qui n'était PAS un défaut

Deux pistes qui auraient fait deux faux défauts dans ce rapport si je m'étais arrêté au premier
signal :

**L'attente après le check-in n'est pas un blocage réseau.** Mon premier passage attendait 2 s,
voyait « ta séance arrive… », et concluait que la séance n'arrivait jamais. La mesure sous trois
conditions réseau a montré une temporisation fixe de 3,26 s. La phrase mentionne la météo, ce qui
rendait l'hypothèse crédible — elle était fausse.

**Le questionnaire ne bloque pas sur `dispo = quotidienne`.** Mon automate restait coincé à
l'écran 7 sur la question `shift_ok`, bouton « suivant » désactivé. Un **vrai clic** (Playwright,
pas un `click()` injecté) sélectionne l'option et débloque le bouton immédiatement. C'était mon
instrument : cliquer un groupe re-rend l'écran, et ma liste de nœuds devenait obsolète en cours
d'itération.

**Aucune erreur JavaScript** sur toute la traversée, dans aucune des sept exécutions.
**Onglet actif correctement marqué** (`class="active"`, `aria-current`, graisse 700, contraste
renforcé) — mon premier sélecteur était faux, pas l'app.

---

## Ce que je n'ai pas pu mesurer

- **La fenêtre du point n°1 selon la densité de la semaine.** Il faudrait un automate qui
  franchisse le questionnaire à 7 séances / disponibilité quotidienne ; le mien n'y arrive pas
  pour la raison expliquée ci-dessus. À faire avant de dimensionner la correction : si la fenêtre
  est de 3 ou 4 jours sur 7 pour un profil courant, le point monte encore en gravité.
- **Le rendu sur un vrai iPhone.** Chromium n'est pas Safari : le zoom involontaire (R18.1), le
  rebond de défilement et le comportement du clavier ne se mesurent honnêtement que sur
  l'appareil.
- **La deuxième journée d'usage.** Tout ce rapport porte sur le premier contact. Ce que devient
  l'app au bout d'une semaine — quand des séances sont cochées, quand un verdict rouge tombe —
  demande une traversée sur plusieurs jours simulés.
