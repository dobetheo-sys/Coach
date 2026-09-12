# Plan du rapport 06 — produit/rétention & explicabilité

Ce que j'entreprends de modifier, **comment**, et là où plusieurs voies existent, les points
faibles et forts de chacune. Rien n'est écrit dans le moteur avant votre feu vert sur les options.

Les prémisses du rapport ont été **mesurées avant** d'être planifiées, sur le profil qu'il déclare
(`tri/70.3/confirme/inter/competition`, 12 h, 8 h récents, 10 séances, course 23/05/2027) **et sur
le corpus du golden (1 066 plans générés)**. Deux d'entre elles étaient fausses ou mal cadrées.

---

## 0. Ce que la mesure confirme, rectifie ou réfute

| Point | Le rapport dit | Mesuré | Verdict |
|---|---|---|---|
| B1 volume | 48 décisions, 56 % répétées | 48 décisions · **69 % de `why` dupliqués** sur ce profil · **40 % sur le corpus** · pire cas **RC1 ×57** (vélo) · moyenne 21,5, max **87** | **confirmé et plus large** |
| B2 identifiants | jargon visible « une fois Pourquoi ce plan ouvert » | **100 % des 1 066 profils** portent un identifiant de règle ET du jargon interne dans un texte athlète | **confirmé, population totale** |
| B2 `**` markdown | « le premier avertissement … 4 astérisques à l'écran » | **28 profils sur 1 066 (2,6 %)** — uniquement l'avertissement d'eau libre quand la continuité de nage n'est **pas renseignée**. Sur le profil audité : **0** | **vrai, mais population 40× plus étroite** |
| B2 `C29d —` | avertissement préfixé d'un identifiant | **117 profils (11 %)** — la chaîne est bien émise (`planGenerator.ts:2090`) | **confirmé, population chiffrée** |
| B3 notes | 27 notes pour 215 séances | **25 notes distinctes pour 214 séances**, 0 muette · « Footing facile » **×62, une seule note**, de la base à l'affûtage | **confirmé** |
| B4 noms | jargon dans les titres | **8 noms techniques sur 22** distincts, dont `Nage seuil (+dist)` | **confirmé** |
| A1 Strava | n'écrit que les tests | `stravaImport` n'écrit que `S.answers.tests` ; `coachOnIngest` n'a **qu'un appelant**, l'import FIT | **confirmé** |

**Deux rectifications qui changent le plan.** (1) Le `**` n'est pas « le premier avertissement de
tout le monde » : c'est un cas de saisie précise, donc un correctif d'une ligne, pas un chantier
d'assainissement du rendu. (2) Le jargon, lui, est **universel** — deux décisions émises pour
*chaque* plan le portent (`courbe` : « Bandes normalisées × pic, récup ×0.62, lissage C22 » ;
`budget` : « Budget déclaré ∧ budget implicite »). B2 est donc plus gros que B1 en portée, et
c'est l'inverse du classement du rapport.

*(Un taux de 100 % est suspect par principe ici. Vérifié : il vient de ces deux décisions
présentes partout, pas d'une sonde trop large — `courbe` compte 2 132 occurrences pour 1 066
plans, exactement 2 par plan.)*

---

## 1. B2 — le vocabulaire interne quitte le texte athlète

**Ce que je modifie.** Les chaînes ÉMISES vers l'athlète dans `src/` : `why`/`val` des décisions,
`warnings`, notes de séance. Pas les commentaires, pas les identifiants dans le code.

**Comment.** Trois pièces :
1. Réécrire les textes porteurs (`courbe`, `budget`, `V2.1` « C15/C21/C24 », l'avertissement
   `C29d — …`, « si le readiness n'est pas vert » de RN1, « Une séance C15 ≈ 25 min »).
   L'identifiant reste dans le champ `id` de la décision — il sert au registre et aux gardes ;
   c'est le `why` LU par l'athlète qui doit parler français.
2. Retirer le `**` de l'avertissement d'eau libre à la source.
3. Un gate `lint:athlete` qui refuse qu'un identifiant revienne.

**Options pour le gate :**

| | Points forts | Points faibles |
|---|---|---|
| **(a) Gate sur la SORTIE** — générer N plans du corpus et scanner `decisions/warnings/notes` | Mesure ce qui s'exécute (règle 15) ; ne peut pas être trompé par un commentaire — précisément l'erreur que le rapport a commise sur le `**` | Coûte une génération (~40 s) ; doit déclarer sa population pour ne pas être vacueux |
| **(b) Gate sur la SOURCE** — regex sur les littéraux de `src/` | Instantané | Doit distinguer commentaire et chaîne, littéral athlète et littéral de banc (`seal.ts`, `audit/*` en portent légitimement) ; ma sonde brute a déjà rendu 54 faux positifs |
| **(c) Les deux** | Le gate de sortie décide, celui de source localise | Deux gardes à tenir |

→ **Je recommande (a)**, avec population épinglée. C'est la forme que le dépôt a déjà payée trois
fois (« une CSP lue dans un commentaire »).

**La liste de jargon est le piège.** Une liste écrite à la main diverge (R11.1). Les identifiants
se dérivent par motif (`C\d+`, `R\d+\.\d+`) ; les mots de métier interne (« sonde de capacité »,
« budget implicite », « readiness », « bandes normalisées ») n'ont pas de source dérivable — je
les déclarerai **avec leur remplacement français à côté**, pour que la liste soit un dictionnaire
et pas un interdit.

**Risque.** Règle 17 : des bancs cherchent ces textes par libellé. `T-54` garde le message B-17,
`smoke-usage` O-96 compte les décisions. Tous les blocs `verify` seront rejoués.
**Coût golden** : recapture sur le champ texte des décisions, ~1 066 profils.

---

## 2. B1 — « Les décisions du moteur (48) » cesse d'être un mur

**Ce que je modifie.** Le nombre de lignes émises, et la façon dont l'écran les classe.

**Options :**

| | Points forts | Points faibles |
|---|---|---|
| **(a) Agréger dans le MOTEUR** — une décision par `id`+`why` identique, avec son compte (« 27 semaines de charge, chacune avec un jour OFF ») | Une seule source (R11.1) ; l'export, le journal et l'écran en profitent ; le compte affiché redevient honnête | `decisions.length` change → `T-54`, `smoke-usage` O-96 et le golden bougent ; il faut décider ce qu'on garde de la **position** (quelles semaines) sous peine de perdre de l'information |
| **(b) Agréger à l'AFFICHAGE** (`plan-view.js`) | `src/` byte-identique, golden inchangé, risque moteur nul | **Deux comptes pour une grandeur** : le moteur en annonce 48, l'écran 21 — c'est exactement O-96, déjà payé une fois sur ce même écran. L'export garde le mur |
| **(c) Ne rien agréger, replier un « journal technique »** | La pièce la plus petite | Ne traite pas la cause : 27 lignes identiques restent, cachées. Une liste qu'on replie est une liste qu'on n'a pas corrigée |

→ **Je recommande (a)**, avec le compte publié en deux nombres (« 21 décisions · 27 répétitions
agrégées ») plutôt qu'un seul — la leçon du ratio sans son dénominateur.

**Deuxième moitié, indépendante de l'option** : trier en deux niveaux — *ce qui te concerne*
(B-17, R20.2, manque, fréquence, allocation) / *le reste*, replié. Le critère de tri doit être
**dérivé** (une décision qui nomme un levier ou une borne que l'athlète a déclarée), jamais une
liste d'identifiants tenue à la main.

---

## 3. B3 — « pourquoi aujourd'hui » à côté de « pourquoi »

**Le constat qui décide** : « Footing facile » ×62 porte **la même note** en base et en affûtage.

**Options — et il y a une vraie tension de règle ici :**

| | Points forts | Points faibles |
|---|---|---|
| **(a) Composer à l'AFFICHAGE** depuis `phase.id`, `isRecup`, la veille/le lendemain | Zéro texte moteur, golden intact, aucune recapture | **Contredit une règle du dépôt** : « `renderSess()` est le SEUL producteur de texte ». Le précédent accepté (`techListHTML`) *reformate* sans rien fabriquer ; ici on fabriquerait une phrase |
| **(b) Émettre la phrase dans le MOTEUR** (champ `note` ou un second champ `pourquoiAujourdhui`) | Respecte le producteur unique ; l'export ICS et le partage en profitent | Recapture golden large ; 214 séances × une phrase = risque de densité (U16 : on a retiré du texte de cet écran il y a un mois) |
| **(c) Le moteur émet la DONNÉE, l'écran choisit la phrase** dans une table de ~8 formulations | Pas de texte fabriqué : l'écran choisit parmi des phrases écrites, comme `PHASE_GOALS` le fait déjà côté affichage | Deux fichiers à lire pour comprendre une phrase |

→ **Je recommande (c)** : c'est la seule qui respecte à la fois « un seul producteur » et « pas de
recapture massive », et elle reprend un patron déjà présent (`PHASE_GOALS`).
**Contrainte que je m'impose** : une ligne, jamais un paragraphe (U16), et elle n'apparaît que si
elle dit quelque chose de NON déductible du titre.

---

## 4. B4 — le jargon des titres reçoit une porte d'entrée

**Ce que je modifie.** Un glossaire d'une dizaine de termes (sweetspot, VO2max, seuil, Z2/Z4,
brick, race-pace, CSS, FTP), et un « ? » dans le titre de séance qui l'ouvre.

**Options :**

| | Points forts | Points faibles |
|---|---|---|
| **(a) Glossaire DÉRIVÉ de `ZDEF`** (les zones que le moteur prescrit déjà) | Une source ; un terme ajouté au moteur apparaît au glossaire | `ZDEF` ne couvre pas « brick », « sweetspot » comme MOT, ni « (+dist) » — il faudra un complément écrit |
| **(b) Glossaire écrit à la main** | Couvre tout, ton maîtrisé | Diverge du moteur à la première zone ajoutée |
| **(c) Dérivé + complément déclaré, le complément étant GARDÉ** (tout terme d'un titre de séance doit avoir une entrée) | La garde ferme le trou de (b) et l'incomplétude de (a) | Un gate de plus |

→ **Je recommande (c)**.

**⚠ Le renommage de « Nage seuil (+dist) » est traité à part.** Renommer une séance est le
producteur de masse de règle 17 déjà mesuré ici (O-79 : deux entrées du registre ont basculé en
« ne reproduit plus » alors que les défauts étaient intacts). Si vous le voulez, il part **dans
son propre commit**, avec rejeu complet des blocs `verify` et des bancs qui identifient par
libellé. Sinon je laisse le nom et le glossaire l'explique.

---

## 5. B5 — le pont Éducatifs ↔ séance dans les deux sens

**Ce que je modifie.** Le héros d'une séance de nage nomme le palier en cours (`S.answers.educatifs`)
et la fiche renvoie au jour où l'appliquer. Affichage seul, aucun texte moteur.
**Point faible connu** : trail et swimrun n'ont ni couleur de discipline ni écran Éducatifs —
je le signalerai plutôt que de fabriquer un écran non commandé.

---

## 6. A1 — Strava ferme la boucle quotidienne

**Le plus gros gain produit du rapport**, et celui qui touche la monnaie du système : la coche ✓
(XP, série, badges, graphe, R21).

**Options :**

| | Points forts | Points faibles |
|---|---|---|
| **(a) Auto-✓ silencieux**, comme l'import FIT le fait déjà | Le geste disparaît vraiment ; réutilise du code testé (R11.1) | Une coche FAUSSE est coûteuse : elle gonfle l'XP et la série, et **nourrit R21**, qui ne sait que RÉDUIRE. Sur un jour double (deux séances proches en durée) l'appariement peut se tromper |
| **(b) Ingestion sans coche** (fatigue + références seulement) | Aucun faux positif | Ne ferme pas la boucle : la coche reste à faire 215 fois. C'est le problème, pas sa moitié |
| **(c) Coche PROPOSÉE** — « 3 activités détectées, on coche ? » | Aucun faux positif silencieux ; l'athlète reste décideur (O-17, informer plutôt que décider à sa place) | Une interruption de plus, alors qu'A5 dit qu'il y en a déjà sept |

→ **Je recommande (a) avec la tolérance d'appariement de FIT, et un repli (c) quand
l'appariement est ambigu** (deux séances de la même discipline le même jour). C'est la forme qui
ferme la boucle sans inventer de certitude.

**Risques mesurés à l'avance** : quota API (429 déjà géré), `applyDaySwapsToPlan` doit être
appliqué avant l'appariement (le bug latent déjà nommé pour R21), et **le passé ne doit jamais
être réécrit**.

---

## 7. A3 · A4 — deux petites pièces à décision claire

**A3 — la règle du jeu s'écrit.** Une ligne sous les jauges (« +10 XP par séance validée, repos
compris ; 3 disciplines, 30 niveaux »), le +10 montré dans la célébration, et un badge « Première
séance ». *Point faible à connaître* : ajouter un badge touche `badgesV2`, donc `demo:retention`
et l'XP (un badge vaut +80 XP) — le barème de l'avatar est figé par `demo:avatartri`, je vérifie
que le niveau 1 n'arrive pas plus tôt qu'aujourd'hui, ou je le dis.

**A4 — la boutique cesse de vendre un service qui n'existe pas.** Tant que `CATALOG` est `null` :
carte courte, un seul bouton « Me prévenir au lancement », ni prix ni « ACTIVER ».
*Point faible* : `smoke-shop` (42 assertions) est écrit sur l'état actuel — **réécrit, pas
supprimé**, comme les deux critères de PW et celui de `smoke-improvements` hier.

**Option alternative pour A4** : garder le prix en le marquant « indicatif ». *Fort* : conserve
la mesure d'intérêt. *Faible* : le rapport a raison — un prix affiché est lu comme LE prix, et le
CTA « ACTIVER » sur un service inexistant use la crédibilité que le reste du produit construit.

---

## 8. A5 — le budget d'interruption (à arbitrer, je ne le ferais pas en premier)

Sept mécanismes, chacun avec son dédoublonnage, aucun budget commun. Le point unique
`interruptions.js` (file par priorité : sécurité > relance > bilan > moments > vente, au plus une
par visite) est la bonne forme — c'est le patron de `prioriteFinancement.ts`.

*Point faible* : c'est un **refactor de sept surfaces**, donc un producteur de masse de règle 17,
et plusieurs suites E2E testent ces mécanismes un par un. Fait **après** B1-B5 et A1-A4, il
intègre leurs ajouts ; fait avant, il sera à refaire.

---

## 9. A2 — le rappel hors app : je ne tranche pas

(a) `VALARM` dans l'export iCalendar (effort S) : *fort*, ça existe déjà et ça mesure si le rappel
change l'adhérence avant d'investir ; *faible*, ne touche que ceux qui exportent leur agenda.
(b) Worker Push (effort L) : *fort*, c'est le vrai rappel ; *faible*, **ça rouvre S-1** (« zéro
serveur »), que vous avez arbitré, et demande un backend qui n'existe pas.

→ Je propose **(a) seulement**, et (b) reste une décision produit.

---

## 10. Ordre proposé, et pourquoi

1. **B2** (jargon) — la plus grande portée mesurée : 100 % des plans.
2. **B1** (agrégation) — même fichier, même recapture golden : **les deux dans le même lot**
   évite de photographier deux fois 1 066 profils.
3. **B3** puis **B4/B5** — affichage, risque moteur nul.
4. **A3**, **A4** — petites pièces, gardes à réécrire.
5. **A1** — le gain produit, isolé dans son commit parce qu'il touche la coche.
6. **A5** — le refactor, en dernier pour qu'il absorbe tout le reste.
7. **A2** (a) si vous le voulez.

**Ce que je ne ferai pas sans votre mot** : renommer une séance (B4), toucher au barème de
l'avatar (A3), poser un serveur Push (A2b), retirer le prix de la boutique (A4) — ce dernier est
recommandé mais c'est une décision commerciale.

**Ce que chaque lot livrera, comme d'habitude** : mesure avant/après, garde contre-prouvée ROUGE
sur l'ancien code, sortie complète de `npm run batterie` (13 gates nommés), E2E, et le rayon
golden publié.
