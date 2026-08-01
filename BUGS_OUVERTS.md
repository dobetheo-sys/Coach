# Bugs constatés et NON corrigés

**État au 01/08/2026, commit `b35169b` + lot R15** (20 gates verts, E2E 8/8, golden 764).

> **Mise à jour R15 :** `O-2` et `O-3` sont traités ci-dessous ; `O-1` reste ouvert et son
> périmètre s'est ÉLARGI (voir la note). Le handoff de revue a aussi apporté deux défauts
> mesurés qui n'étaient pas dans ce registre — ils sont corrigés et donc absents d'ici : le
> plancher de la semaine de course (291/648 configurations sous 30 % du pic) et l'éligibilité
> âge × format (un mineur générait un plan Ironman de 59 semaines).

Ce fichier ne liste que ce qui est **mesuré et reproductible aujourd'hui**. Chaque entrée porte
sa commande de vérification : une dette qu'on ne peut pas re-mesurer en une ligne n'est pas une
dette, c'est un souvenir. Les entrées sont classées par ce qu'elles coûtent à l'athlète, pas par
ancienneté.

Trois choses n'ont **pas** leur place ici et sont rangées à part (§4, §5) : les arbitrages
assumés entre deux règles, les chantiers humains, et les entrées de registre devenues fausses.

---

## §1 — Défauts ouverts, par gravité

### O-1 · Le banc v7 tourne sous le seuil où son propre défaut apparaît ⚠️ **le plus grave**

**Ce qui se passe.** `npm run audit:v7` échantillonne 150 profils par sport. Le check `D-DISC`
(une semaine de charge qui perd une discipline entière — un duathlon sans un coup de pédale)
a un budget de 1. Mesuré en faisant varier le seul nombre de profils :

| profils tirés | `D-DISC` mesuré | verdict CI |
|---|---|---|
| **150 (valeur de la CI)** | **0** | ✅ vert |
| 200 | 1 | ✅ vert (= budget) |
| 253 | **2** | ❌ **dépasserait le budget** |
| 280 | 2 | ❌ |
| 400 | 2 | ❌ |

**Pourquoi c'est grave.** Ce n'est pas « il reste 2 défauts » — c'est que **la CI est verte parce
qu'elle ne regarde pas assez loin**. C'est exactement la famille de défauts que ce dépôt passe son
temps à débusquer (N2 : aucun profil golden ne portait de date de course ; R14 : le golden
regardait P5 au seul point où il ne bouge pas). Un garde-fou calibré sous le seuil d'apparition
de ce qu'il surveille donne une assurance fausse, ce qui est pire que pas de garde-fou.

**Reproduire :**
```bash
ENGINE=$PWD/endurabuild/js/engine.js node audit_v7.cjs duathlon 253
```

**⚠ Périmètre élargi (revue R15).** `D-DISC` n'est pas seul : **tous** les budgets du tableau
v7 sont des compteurs ABSOLUS mesurés à N=150. Un budget de 12 sur 150 tirages vaut
mécaniquement ~20 à N=253. Monter `N` fera donc déborder `U-RACEDATE`, `T-NIGHT`,
`T-DPLUS-WK` et `T-POLES-ADV` **en même temps** — le lot est plus gros que ce que cette entrée
laissait croire, et c'est une raison de plus de le traiter pour lui-même. Trois gestes, dans
cet ordre : (1) **dire si le tirage est semé** — s'il ne l'est pas, `D-DISC = 0` à N=150 est un
coup de dé et la CI est déjà instable ; (2) passer les budgets en **taux** (‰ de profils) et
non en compteurs — un budget qui dépend du paramètre d'échantillonnage est un artefact, pas une
mesure ; (3) **varier les DIMENSIONS, pas seulement leur nombre** (horizon, jour de la semaine
de la course, sport, format, niveau, historique, volume, séances, blessure, drapeau médical).

Le troisième point est le plus important, et il a été démontré à nos dépens : le banc R15 lui-même
a d'abord rendu **0 défaut sur 72 profils à un seul horizon**, puis **291 sur 648** en calant la
course un DIMANCHE et en balayant 9 horizons. Une dimension non variée masquait 100 % du défaut.
**La leçon n'est donc pas « monter N » mais « varier les bonnes dimensions »** — un échantillon
dix fois plus grand sur les mêmes axes n'aurait rien trouvé.

**Pourquoi ce n'est pas corrigé ici.** Deux corrections possibles et elles ne se valent pas :
monter `N` en CI (honnête, mais fait passer la CI au rouge tant que les 2 cas ne sont pas
traités), ou traiter les 2 cas d'abord. Le bon ordre est : monter `N`, constater le rouge,
corriger, garder `N` haut. C'est un lot à part entière — le faire en passant reviendrait à
choisir le `N` qui arrange, c'est-à-dire à reproduire le défaut.

---

### O-2 · `R14.3-b` — le dénivelé vélo · ✅ **FERMÉ (R15.2)**

Le relief entre désormais dans la **cible d'intensité** vélo : plat 175–191 W · vallonné
173–189 W · montagneux 169–185 W (FTP 230). Le conseil nomme l'indice de variabilité et la
puissance NORMALISÉE. Une seule clé (`courseProfileOf`, la même que la course à pied), et les
trois sports qui prescrivent des watts (tri, vélo, duathlon) passent par le même point —
sans quoi un quatrième producteur divergerait, cette fois sur le PACING.

O-2 disait *« premier geste attendu : écrire le critère, pas le correctif »*. Le critère est
venu avec le handoff de revue (`R15.2-A/B/C/D`, gate `npm run audit:r15`) : c'est lui qui rend
la fermeture vérifiable, et c'est pour ça que l'entrée peut être fermée plutôt que « faite ».

### O-3 · `D10-8` — le créneau facile de repli du trail · ⏳ **la mesure manquante est nommée**

Inchangé dans le code, mais l'entrée était mal posée : elle réclamait l'écart entre `facileR`
et `facile2` alors que la question qui décide est **la fréquence de déclenchement du repli**.
Tant que ce taux n'existe pas, l'arbitrage d'entraînement n'est pas mûr — c'est la règle du
dépôt (« mesurer d'abord ») appliquée à cette entrée elle-même.

**Critère de sortie chiffré, à produire avant tout correctif :** instrumenter
`easyFallbackSlot`, balayer la matrice trail (niveaux × historiques × volumes × horizons),
publier le taux. **< 5 %** → l'entrée se ferme en « sans impact mesurable », et c'est une
décision. **> 20 %** → elle mérite son lot, avec mesure avant/après sur le golden.

## §2 — Dette CHIFFRÉE et verrouillée (ne peut pas remonter)

Ces défauts sont connus, comptés, et un budget en CI les empêche d'empirer. Ils ne font pas
échouer la CI **par décision explicite**, pas par oubli.

### Banc v6 — 3 dettes (`npm run audit:v6` → « 55 vert · 3 dette connue · 0 régression »)

| id | ce qui reste | pourquoi c'est laissé |
|---|---|---|
| **D2** | 2 configurations sur 153 (`swim/sprint\|demifond/debutant/reprise`) portent encore une violation dure | Tout le plan tient entre 45 min et 1 h de nage par semaine, les 4 séances sont AU plancher (C15 : 850 m ; C20 : 0,42 h/séance) et l'écart semaine max ↔ pic est de 5 minutes. **Il n'y a plus de marge sous les planchers pour exprimer une hiérarchie.** Un rabotage a été tenté : sans effet, les planchers le reprennent immédiatement ; le code a été retiré plutôt que laissé inerte. |
| **D3** | 4 sauts de charge à **+11 %** au lieu de +10 % | Le rapport dev→peak de la courbe vaut 1,18, donc **supérieur à C22 par construction**. Sur un plan court à deux récups consécutives, C22 voudrait le pic ≤ 273 min quand la hiérarchie du plan le veut > 248 : les deux tiennent dans 25 minutes et les planchers de séance interdisent de descendre. Réduire encore ferait passer le pic SOUS une semaine de base — on échangerait une violation contre une pire. **La correction de fond est dans la FORME de la courbe, pas dans une passe de rattrapage.** |
| **F2** | 7 séances de qualité à ~42 % de temps en zone cible au lieu de 45 % | **Contradiction assumée entre deux règles.** Ces séances ont déjà leur échauffement et leur retour au calme à leur plancher (C13/C13b) ; atteindre 45 % demanderait exactement ce que C13c interdit (échauffer moins de 10 min avant un effort maximal). La priorité n°2 du manifeste (prévention des blessures) tranche. Le test reste en `expect:'fail'` **pour garder le chiffre sous les yeux**, pas parce qu'on l'a oublié. |

### Banc v7 — budgets non nuls (`scripts/runAuditV7.mjs`)

| check | budget | nature |
|---|---|---|
| `U-RACEDATE` | 12 | Course très lointaine : plafond de durée assumé + avertissement (R4.8b). Comportement voulu. |
| `U-DECL` | 2 | Lissage d'affûtage mesuré récups comprises (R4.8c). |
| `T-NIGHT` | 2 | Consigne de nuit portée en ATTRIBUT sur les séances survivantes (R4.7b) plutôt que par une séance dédiée. |
| `T-DPLUS-WK`, `T-POLES-ADV` | 2 chacun | Résiduels trail sur profils extrêmes. |
| `D-DISC` | 1 | **Voir O-1 : le budget est respecté à N=150 et dépassé à N=253.** |
| `S-LONGSWIM` `S-MIX` `S-RUN-STARVED` `S-PREREQ` | 8 · 9 · 10 · 12 | **Swimrun uniquement — donc NON EXERCÉS dans le produit V1** (le module est exclu du bundle, R12 §0). Ces budgets ne protègent rien tant que `EB_SWIMRUN=1` n'est pas activé. |

> ⚠️ La ligne swimrun mérite d'être lue deux fois : ce sont 39 défauts budgétés sur du code
> **expédié dans `src/` mais absent du produit**. Ce n'est pas une dette du produit, c'est une
> dette du dépôt — et elle redeviendra une dette du produit le jour où swimrun rentrera en V1.

---

## §3 — Angles morts connus de la mesure

Ce ne sont pas des bugs : ce sont des endroits où **on ne saurait pas** qu'il y a un bug.

| # | angle mort | conséquence |
|---|---|---|
| A-1 | `audit:v7` tourne à N=150 (voir O-1) | Un défaut qui n'apparaît qu'au-delà ne sera jamais vu en CI. |
| A-2 | Le golden master fige `vol_max` au profil de base sur presque toutes ses passes | Deux passes correctives ont déjà dû être ajoutées pour cette raison (« course datée » en N2, « volume et extrapolation » en R14). Le prochain paramètre figé produira le même angle mort. |
| A-3 | `R14.3-b` n'a **aucun critère automatique** | Personne ne saura si le dénivelé vélo est traité, sauf à relire le code. |
| A-4 | Le monolithe `Coach_Pro_V1.5.html` a le moteur à jour mais son **UI est gelée à R4** | Les régressions d'interface introduites depuis (5 onglets, carte Trail, étape terrain) ne s'y voient pas. C'est documenté et voulu — mais un utilisateur qui ouvrirait ce fichier verrait un produit d'il y a plusieurs lots. |
| A-5 | **Aucune vérité terrain pour la projection R14/R14.1** — l'angle mort le plus profond du prédicteur | Les bandes `h`, `G_plafond`, `k_structure` sont des heuristiques que **rien ne valide**. On ne saura jamais qu'elles sont fausses tant que les projections ne seront pas confrontées aux résultats réels. *Premier geste, et il doit être fait MAINTENANT :* journaliser à chaque génération `{date, sport, format, horizon, refs mesurées, gainPct, gainBand, adhérence}` et, au passage du jour J, `{temps réel par leg}`. Sans cette ligne écrite aujourd'hui, la calibration sera impossible dans deux ans — les données n'existeront pas. |
| A-6 | **Dates absolues** dans le golden et les scripts (`RACE_PASS_DATES`, `scripts/trace.mjs`, profils `measured`) | Un profil dont la course est « à 43 semaines » aujourd'hui sera à 30 semaines dans trois mois : le golden dérive tout seul, ou pire, **exerce silencieusement d'autres branches en gardant la même empreinte**. Le garde-fou d'échéance existe (`goldenMaster.mjs` prévient 8 semaines avant), mais il traite la panne, pas la dérive. Vérifier : `grep -rn "20[23][0-9]-[01][0-9]-[0-3][0-9]" scripts/ tests/` — toute date en dur est un futur A-2. |

---

## §4 — Entrées de registre devenues FAUSSES (trouvées en compilant ce fichier)

Elles décrivent des défauts **déjà corrigés** ; les laisser telles quelles fait croire à une dette
qui n'existe plus, ce qui est le symétrique exact d'un défaut caché.

| entrée | ce qu'elle affirme | ce qui est mesuré aujourd'hui |
|---|---|---|
| `R10_DEFECTS.md` **D10-9** (statut « ouvert ») | « Aucun garde-fou n'empêche la prochaine collision de noms dans le bundle : à ajouter » | **Corrigé.** `checkCollisions()` existe (`scripts/buildApp.mjs:94`, appelée l. 116) et fait échouer le build en nommant le doublon. |
| **question R15.5** — « le harnais distingue-t-il un `xfail` qui PASSE d'un échec attendu ? » | Risque soulevé : le jour où quelqu'un corrige F2, le test rougirait et la correction serait annulée comme une régression | **Déjà correct, vérifié.** `audit_v6.mjs:942` : un test `expect:'fail'` qui passe s'affiche `★` et porte la note « ← CORRIGÉ : passer expect à 'pass' ». Il compte comme VERT, pas comme échec. Aucun travail nécessaire. |
| `R10_DEFECTS.md` §C13e | « Reste 307 séances sous 10 min d'échauffement, toutes en trail… leur récupération n'est PAS chiffrée (7 % des blocs) » | **Corrigé** par le lot « la récupération devient une donnée » : sur 344 blocs à répétitions multiples mesurés (6 sports), **0 récupération non chiffrée**, et `F4` mesure **0 violation** du plancher de 10 min. |

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
| H-5 | Swimrun hors V1 | Décision de périmètre (R12 §0), réversible par `EB_SWIMRUN=1`. Voir la note du §2. |

---

## Comment re-vérifier ce fichier

```bash
npm run audit:v6                                   # → 55 vert · 3 dette · 0 régression (§2)
npm run audit:v7                                   # → vert à N=150
ENGINE=$PWD/endurabuild/js/engine.js \
  node audit_v7.cjs duathlon 253                   # → D-DISC = 2  (O-1)
grep -n easyFallbackSlot src/sports/*/index.ts     # → trail: facileR, run: facile2  (O-3)
grep -n checkCollisions scripts/buildApp.mjs       # → existe  (§4, D10-9 périmée)
```

**Rappel de méthode, qui vaut pour toute reprise de cette liste :** mesurer d'abord, corriger
ensuite, re-mesurer, garder le vert. Un défaut dont on ne sait pas dire le chiffre AVANT n'est pas
prêt à être corrigé — c'est ce qui a fait tomber les vraies causes en R13, R14 et R14.1.
