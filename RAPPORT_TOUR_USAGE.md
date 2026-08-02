# Tour du produit côté usage — ce qui accroche quand on traverse l'app sur un téléphone

**02/08/2026 — corrigé le jour même.** Pas un audit du moteur : une traversée de la PWA comme
le ferait quelqu'un qui l'installe, dans un vrai Chromium, en 390×844 (iPhone 13/14/15) et en
320×568 (iPhone SE). Profil de référence : triathlon 70.3, intermédiaire, 6 séances, 10 h/sem.

> **Cinq des sept points sont corrigés** (`U1` à `U7`) et gardés par une 14ᵉ suite E2E,
> `tests/e2e/smoke-usage.mjs`, **vérifiée rouge** en réintroduisant les cinq défauts (5 échecs
> sur 9 assertions). Les deux restants sont des arbitrages produit, pas des défauts.
>
> **Deux de mes constats initiaux étaient FAUX** et sont rectifiés ci-dessous à leur place : la
> coche ○ n'a jamais été une cible trop petite, et l'attente de 3,2 s n'était pas une
> temporisation. Les deux erreurs venaient de mon instrument, pas du produit — je les laisse
> écrites plutôt que de les effacer.

Tout ce qui suit est **mesuré**, pas supposé. Les scripts de mesure sont reproductibles ; ce qui
n'a pas pu être établi est dit comme tel, et deux pistes que j'ai suivies puis **réfutées** sont
consignées à la fin — elles auraient fait deux faux défauts dans ce rapport.

Classé par ce que ça coûte à la personne, pas par difficulté de correction.

---

## 1. Un plan créé un dimanche accueille par « la vie a pris le dessus » · ✅ CORRIGÉ (U1)

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

**Corrigé (U1)** : `missedSessionsCheck` ne regarde plus que les jours **postérieurs à
`plan_start`** — le champ existait déjà et portait exactement l'information manquante. Sans lui
(plans antérieurs à ce champ), le comportement d'origine reste le repli, donc aucun plan existant
ne change de comportement. Re-balayé sur les sept jours : **0/7**.

---

## 2. « Bonsoir 🌙 C'est l'heure du point du matin » · ✅ CORRIGÉ (U2)

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

**Corrigé (U2)** : un point unique, `pointLabel()`, qui suit l'heure comme le salut le faisait
déjà — **Point du matin** avant midi, **Point du jour** l'après-midi, **Point du soir** ensuite.
Les cinq occurrences le consomment (bandeau, phrase de coach, écran de fin, onglet Semaine,
bouton « refaire »). Vérifié aux trois heures.

---

## 3. L'app annonce à l'athlète que son plan vaut 70/100 · ✅ CORRIGÉ (U3)

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

**Corrigé (U3)** : le score ne s'affiche plus. Il reste dans `plan._v2.score` pour le
développement et les bancs — il est précieux là. Les **violations dures** restent listées en tête
des décisions : c'est la seule information de cette famille sur laquelle l'athlète puisse agir, et
la carte « Pourquoi ce plan » de R20.2, juste au-dessus, fait déjà le travail d'explication.

---

## 4. Une cible tactile à 18×14 px · ✅ CORRIGÉ (U4) — et une erreur de mesure de ma part

**Ma première mesure lisait le mauvais rectangle.** Elle prenait le `getBoundingClientRect()`
du bouton seul — or la coche ○ porte depuis son écriture un `::after` invisible en
`inset: -9px` qui **étend sa zone de toucher à 44 × 44** tout en la gardant discrète à 26 px.
Le commentaire du CSS le dit noir sur blanc. La coche n'a donc **jamais** été un défaut, et les
« 220 contrôles sous 44 px » de mon premier comptage sont un artefact du même biais.

Ce qui était réel : le **⇄**, arrivé après, n'avait jamais reçu ce traitement.

| contrôle | à l'œil | au doigt (avant) | au doigt (après) |
|---|---|---|---|
| **⇄** (échanger deux jours) | 18 × 14 | **22 × 18** | **44 × 44** |
| ○ / ✓ (marquer fait) | 26 × 26 | 44 × 44 (déjà) | 44 × 44 |

Le minimum de la WCAG 2.5.8 est 24 × 24 ; le confort tactile retenu est 44 × 44. Le ⇄ était sous
les deux — et c'est le geste introduit pour réparer une semaine qui ne tombe pas bien, donc un
geste qu'on fait précisément quand on est déjà contrarié.

**Corrigé (U4)** : `.swapBtn` reçoit le même traitement que `.doneBtn` — 24 px à l'œil, 44 × 44
au doigt via un `::after`. Tous ces contrôles portaient déjà un `aria-label` correct :
l'accessibilité au lecteur d'écran était faite depuis le début, c'est la taille du doigt qui
manquait.

**La leçon est la quatrième du même genre dans ce dépôt** : un instrument qui mesure une
grandeur voisine de celle qu'il nomme produit un faux défaut aussi facilement qu'il en cache un
vrai.

Aucun débordement horizontal nulle part, à 390 px comme à 320 px : la leçon de R18.1 tient.

---

## 5. Le plan est un mur de 5 310 px · ⚖️ arbitrage, non corrigé

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

## 6. Le questionnaire : 8 écrans, 37 gestes · ⚖️ arbitrage, non corrigé

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

## 7. Trois secondes d'attente avant de voir sa séance · ✅ CORRIGÉ (U7)

Après la dernière question du check-in :

> **C'est noté 👍** — Je regarde ta forme, ta fatigue des derniers jours et la météo — ta séance
> arrive…

La séance apparaissait **3,26 s** plus tard, à la milliseconde près dans trois conditions réseau
(normal, hors ligne, réseau qui ne répond jamais), sans **aucun** appel externe.

**J'en avais conclu « temporisation fixe ». C'était faux**, et l'absence d'appels réseau aurait
dû me mettre la puce à l'oreille : s'il n'y a aucun appel, c'est que rien n'est jamais parti.
En lisant le code, la cause est nette — `applyReadinessSnap` fait `await fetchWeather()` **avant**
de calculer la séance, et `fetchWeather` attend la géolocalisation avec un `timeout: 3000`. Dans
mon environnement la permission n'était jamais accordée : le timeout expirait, d'où les 3,26 s
identiques. Sur un vrai téléphone avec la localisation accordée, c'est un vrai appel réseau — et
alors mon test « hors ligne » n'a **pas** testé ce qu'il prétendait.

**Corrigé (U7)** : on ne retire pas la météo (manifeste §6 — la canicule durcit le verdict, la
pluie donne des consignes) et on ne réduit pas le timeout — un vrai téléphone met parfois deux
secondes à se localiser. On la lance simplement **à l'ouverture du diaporama** : l'athlète répond
à trois questions pendant ce temps, et la réponse est là quand le moteur en a besoin.

| | avant | après |
|---|---|---|
| délai après la dernière réponse | **3 262 ms** | **782–957 ms** |

Zéro seconde ajoutée à qui que ce soit, zéro comportement changé — l'attente est simplement
déplacée là où elle ne se voit pas. Le cache vaut pour la journée, puisque le check-in est
rejouable.

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

**Une troisième s'est ajoutée en corrigeant** (§4 et §7 ci-dessus) : la coche ○ n'était pas trop
petite — mon instrument ne voyait pas son `::after` —, et l'attente de 3,2 s n'était pas une
temporisation mais un `await` sur la géolocalisation. Trois faux constats sur sept, tous de la
même famille : **une mesure qui porte sur une grandeur voisine de celle qu'elle nomme**. C'est la
leçon centrale du chantier R20, et elle vaut aussi quand c'est moi qui tiens l'instrument.

**Aucune erreur JavaScript** sur toute la traversée, dans aucune des sept exécutions.
**Onglet actif correctement marqué** (`class="active"`, `aria-current`, graisse 700, contraste
renforcé) — mon premier sélecteur était faux, pas l'app.

---

## Ce que je n'ai pas pu mesurer

- **La fenêtre du point n°1 selon la densité de la semaine.** Elle n'a plus d'objet pour
  dimensionner la correction — U1 supprime la cause quelle que soit la densité, puisqu'il ne
  reste plus aucun jour antérieur au plan dans le compte. Elle resterait utile pour savoir
  combien d'utilisateurs l'ont rencontrée avant le correctif ; ce n'est pas mesurable a
  posteriori.
- **Le rendu sur un vrai iPhone.** Chromium n'est pas Safari : le zoom involontaire (R18.1), le
  rebond de défilement et le comportement du clavier ne se mesurent honnêtement que sur
  l'appareil.
- **La deuxième journée d'usage.** Tout ce rapport porte sur le premier contact. Ce que devient
  l'app au bout d'une semaine — quand des séances sont cochées, quand un verdict rouge tombe —
  demande une traversée sur plusieurs jours simulés.

---

# Deuxième partie — la deuxième semaine d'usage

**02/08/2026.** Le premier tour ne couvrait que le premier contact. Celui-ci vit **dix jours** :
séances validées, verdict rouge, décrochage réel, drapeau douleur, levée du drapeau. La date du
navigateur est figée puis avancée jour après jour, l'état persiste comme chez un vrai
utilisateur.

**Résultat brut : cinq soupçons, un seul défaut réel. Quatre étaient mon instrument.**

C'est le résultat le plus utile de ce tour, et il mérite d'être dit avant les corrections.

## Le défaut réel — U8 : un jour de repos s'affiche « OFF »

Le moteur matérialise le repos par une séance `{d:"rs", name:"OFF", min:0}`. C'est le bon choix
côté plan : la grille a une case par jour, et le repos se **valide** comme le reste (R4 — le
repos validé compte dans la série).

Mais le héros du jour testait `res.sessions.length`, qui vaut donc 1. L'athlète lisait :

> **AUJOURD'HUI · LUN · 03/08**
> **OFF**
> Le détail de la séance ▸ *(n'ouvre rien)*

…pendant que la branche écrite exactement pour ce cas, juste en dessous dans le même fichier,
n'était **jamais atteinte** :

> 😌 Repos aujourd'hui. Prochaine séance : **Mar 04/08** · Sweetspot vélo

**Le bon message existait et était mort.**

| | |
|---|---|
| jours de repos en semaine 1 (7 sports × niveaux × densités) | **153 / 441** — un tiers des ouvertures |
| profils dont le **jour 1** est un repos | **63 / 63 — 100 %** |

Le second chiffre est le plus dur : le lundi est un jour de récupération dans tous les gabarits
hebdomadaires, ce qui est juste en régime établi. Mais en semaine 1 d'un plan créé le jour même,
il n'y a rien à récupérer — et quelqu'un qui vient de répondre à 37 questions recevait **« OFF »**
comme tout premier écran.

**Corrigé (U8)** : un jour dont toutes les séances sont des `rs` n'est pas « une séance », donc la
branche existante s'affiche. La prochaine séance est nommée **avec sa date**. Aucun changement au
plan, aucune minute ajoutée — on ne fabrique pas une séance pour occuper quelqu'un.

## Le trou dans ma propre garde — U1b

`smoke-usage` n'assertait que « la relance ne se déclenche pas sur un plan neuf ». Pris seul, ce
critère est **satisfait en supprimant la fonctionnalité**.

Vérifié : en remplaçant le corps de `missedSessionsCheck` par `return ""`, **U1 reste vert**.

`U1b` ajoute le miroir — on décroche pour de vrai (neuf jours sans rien), la relance **doit**
apparaître. Les deux critères ensemble tiennent la règle ; l'un sans l'autre ne tient rien.

C'est la forme des trois instruments démasqués en R20, appliquée à une garde que je venais
d'écrire la veille.

## Les quatre soupçons qui étaient mon instrument

| ce que j'avais noté | ce qui se passait vraiment |
|---|---|
| « la validation ne change rien à l'écran » | elle enregistre (`done` 0→1), ouvre le feedback RPE et célèbre — je lisais le haut de page non défilé |
| « aucune relance après 3 séances manquées » | seuls **2** jours d'entraînement avaient été manqués (les autres étaient des jours de repos) — le compte était juste |
| « le drapeau douleur ne se lève pas » | la levée passe par un `confirm()` natif, que Playwright **rejette par défaut** ; avec le dialogue accepté, le drapeau se lève et le bandeau disparaît |
| « aucun chemin pour signaler une douleur » | il est dans le feedback post-séance (`🩹 Douleur pendant ou après`), exactement là où la spec R4 le place |

Vérifié aussi, et conforme : le verdict rouge **repose** vraiment (vert → `keep`, orange →
`reduce`, rouge → `rest`). Mon « 🔴 séance maintenue » venait d'un jour qui était déjà un repos.

## Ce que ce tour apprend sur la méthode

Sept observations au premier tour, cinq réelles. Cinq au second, une réelle. Le rendement chute —
c'est normal, les défauts faciles sont pris. **Mais le taux de faux constats, lui, monte** : trois
sur sept, puis quatre sur cinq.

La cause est toujours la même : **une mesure qui porte sur une grandeur voisine de celle qu'elle
nomme**. Lire le haut d'une page et croire lire l'écran. Compter des jours et croire compter des
séances. Cliquer un bouton et croire avoir confirmé.

La règle pratique qui en sort : **avant d'écrire qu'une chose est cassée, la casser exprès et
vérifier que la mesure change.** C'est ce qui a démasqué les quatre.
