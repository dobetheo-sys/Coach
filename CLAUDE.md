# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce que ce projet est

**Coach** (EnduraBuild) n'est PAS un générateur de séances : c'est un **coach sportif
intelligent** multisport (triathlon, course, vélo, natation). Chaque décision du moteur doit
être défendable par un entraîneur humain expérimenté. La vision complète, la philosophie et
les règles immuables sont dans **`note.md`** — le lire avant toute décision produit ; il
prime sur la commodité technique.

**Hiérarchie des priorités (immuable)** : 1. Santé · 2. Prévention des blessures ·
3. Régularité · 4. Progression · 5. Performance · 6. Esthétique · 7. Nouvelles fonctionnalités.
Une fonctionnalité ne doit jamais dégrader les quatre premiers points. « Un mauvais plan vaut
mieux qu'un plan dangereux. »

**Informer plutôt que bloquer (décision du fondateur, 02/08/2026 — voir ARCHITECTURE.md
« O-17 »)** : *« notre rôle est d'informer au mieux et de laisser l'athlète choisir entre son
besoin de résultats ou de sécurité ; le but n'est jamais de bloquer mais d'accompagner au mieux,
**sauf si réelle mise en danger** »*. Ce qui BLOQUE reste dur et ne se négocie pas — drapeau
médical, drapeau douleur, mineur × format (R15.7-C), garde IMC, borne d'âge de l'estimation
énergétique (O-16), **course sous le PLANCHER de préparation** (R11.4 borné par R22 — au-dessus
du plancher, le refus devient franchissable sur choix explicite), bornes physiologiques. Leur point commun :
l'athlète ne peut pas évaluer le risque, ou l'erreur est irréversible. **Tout le reste informe**
(canal `warnings`, R11.2). Se tromper de catégorie coûte dans les deux sens : brider un athlète
capable, c'est le plan qu'il quitte pour s'entraîner seul, sans aucun garde-fou — et la
régularité est priorité 3, pas priorité 7.

## Les fichiers qui comptent

| Fichier | Rôle |
|---|---|
| `note.md` | Manifeste : vision, priorités, règles interdites, principes d'or |
| `ZENNA_SPEC_COMPLETE.md` | **Les tokens de design** — palette, charge, disciplines, échelle typographique. GÉNÉRÉ (`npm run build:spec`) et gardé à jour par `npm run check:spec` : on le LIT pour comprendre, on modifie les valeurs dans les fichiers qu'il cite. |
| `Coach_Pro_V1.5.html` | **Le produit** — application autonome (~1600 lignes), tout le moteur |
| `src/sports/registry.ts` + `src/sports/<sport>/` | **Le registre de sports** (R10) : un sport = un module qui DÉCLARE ses séances, sa prédiction, ses tests et ses `guards` (garde-fous). Un sport inconnu lève. |
| `src/engine/trailModel.ts` + `src/generator/trailLibrary.ts` | **Le module trail** (R7) : catégorie déduite, charge à 3 axes (temps/D+/D−), 14 séances |
| `endurabuild/` | **La PWA** — même produit en modules ES, mobile-first, installable/offline, 5 onglets (Profil/Plan/Aujourd'hui/Semaine/Outils, voir ses RAPPORT-MIGRATION-PWA.md, RAPPORT-ONGLETS.md et RAPPORT-R4.md) ; UI = source de vérité désormais |
| `ARCHITECTURE.md` | Choix techniques : pipeline du moteur, registre des règles R3.x/Cn, auditeur, conventions |
| `src/` + `npm run audit:v1` | L'auditeur de cohérence — la spec exécutable (486 combinaisons) |
| `ROADMAP-V2.md` | La cible V2 (raisonner → générer → auditer → adapter) |
| `audit-results/` | Derniers résultats d'audit (régénérés par la commande) |

Le prédécesseur `endurabuild-3.html` et le fichier de spec `audit 2` ont été supprimés du
dépôt — historique git si besoin.

## Commandes

- `npm run audit:v1` — audite les 486 combinaisons contre `Coach_Pro_V1.5.html`, écrit
  `audit-results/v1-audit.{json,md}`, **exit 1 à la moindre violation dure**. Zéro dépendance
  à installer (Node ≥22.18 exécute le TypeScript nativement). La CI l'exécute sur chaque push.
- `npm run audit:v2` — **702 profils** (486 + duathlon + swimrun R10) à travers le **moteur V2** (Sprint 1 :
  raisonnement + génération + réparation), même auditeur, + comparatif V1.5 ↔ V2.
- `npm run demo:repair` — preuve exécutable des garanties de la boucle de réparation.
- `npm run demo:readiness` — spec exécutable de l'adaptation quotidienne (Sprint 2) :
  scénarios de la roadmap assertés + invariants de sécurité.
- `npm run build:app` — bundle le moteur V2 dans `Coach_Pro_V1.5.html` (auto-testé avant
  écriture). **À relancer après toute modification de `src/`** ; `npm run check:app` (CI)
  refuse un HTML désynchronisé.
- `npm run audit:v6` — **banc de régression externe** (audit du 29/07/2026) : 38 tests à
  ID stable contre le bundle du monolithe, zéro dépendance. Exit 1 à la moindre RÉGRESSION
  (test attendu vert qui échoue) ; la dette connue (`expect:'fail'`) ne bloque pas la CI.
  Quand un défaut est corrigé, passer son `expect` à `'pass'` **dans le même commit** :
  il devient un garde-fou permanent.
- `npm run audit:v7` — **banc externe multi-sport** (trail/swimrun/duathlon, harnais
  indépendant `audit_v7.cjs` : 4 580 profils, OFAT + fuzz seedé). Il compare le plan émis aux
  PROMESSES, pas à l'auditeur interne — c'est ainsi qu'il a trouvé le contournement du drapeau
  médical et les doses de 90 min de seuil que `auditPlan()` notait 100/100. **11e gate CI**,
  budget par check dans `scripts/runAuditV7.mjs` (0 = garde-fou définitif).
- `npm run audit:r18` — **banc du retour de TEST du fondateur** (`bench_r18.cjs`, 13 critères,
  21e gate CI). Rouge sur 10 de ses 13 critères contre le moteur d'avant le lot. Il porte aussi
  l'arbitrage qui borne R18.5 (« la cadence gagne sur le placement »), **compté et démontré** à
  chaque exécution — 34 gabarits, chacun vérifié en retirant la décharge litigieuse.
- `npm run audit:r13` / `audit:r14` / `audit:r14.1` — **bancs des handoffs externes**
  (`bench_r13.cjs`, `bench_r14.cjs`, `bench_r14_1.cjs`), 17e à 19e gates CI. R13 : âge, CSS
  print, nage du tri mono-séance, semaine de course, épaule, plafonds de phases. R14 : la
  **prédiction projetée jour J** (contrat `projected`, adhérence glissante, gain saturant,
  pacing jamais projeté) + les non-régressions qui verrouillent la « forme actuelle ».
  R14.1 : le gain s'indexe sur la **distance au potentiel** (références mesurées), fourchette
  asymétrique, vélo en deux lignes, levier poids sous gardes. Les critères que R14.1 périme
  restent AFFICHÉS dans `bench_r14.cjs` avec leur raison (statut `----`), jamais supprimés.
- `npm run audit:invariants` — **20 invariants × 54 configurations** (7 sports × 3 enveloppes ×
  3 niveaux), **22e gate CI depuis R20.6**. Une propriété que le plan tient TOUJOURS : dev ≤ pic,
  échauffement ≤ corps, la sortie longue est la plus longue de sa discipline, le plan s'arrête le
  jour J… Il sortait en code 0 quoi qu'il trouve et n'était pas en CI — d'où les quatre familles
  d'échecs qu'il a portées sous une documentation qui le disait vert (O-9). Il bloque désormais.
- `npm run registry:check` — **le registre s'exécute** (R15.9) : chaque entrée mesurable de
  `BUGS_OUVERTS.md` porte un bloc ` ```verify ` (`id`, `quoi`, `attendu`, `cmd`), le script les
  enchaîne et range chacune en **reproduit** / **ne reproduit plus (→ §4)** / **commande
  cassée**. Volontairement HORS CI : il rejoue des gates qui y tournent déjà. À lancer quand on
  reprend le registre — c'est ce qui empêche une dette de devenir un souvenir.
- `npm run demo:troncature` — **la préparation tronquée** (R22) : le refus « course trop proche »
  devient franchissable AU-DESSUS d'un plancher dérivé (on ne retire que des semaines de mise en
  route, donc au plus la phase `base` — marathon 12, Ironman 26, 5 km 5). **26ᵉ gate CI.** Son
  §5 est la garde qui compte : le plan tronqué est IDENTIQUE, séance par séance, aux dernières
  semaines de celui d'un athlète parti à l'heure — la contrainte « on ne touche qu'à l'entrée et
  à la sortie » devient une propriété mesurée, pas une intention.
- `npm run demo:hrv` — **la VFC devient une mesure** (H-1) : moyenne glissante 7 j en espace
  log (Plews 2013), bande ±0,5 écart-type (plus petit changement qui vaille la peine), refus
  de classer sous 7 matins. **27ᵉ gate CI.** Son §2 est la raison d'être du lot : `hrvStatus`
  pesait −2 sur le registre OBJECTIF — celui que A4 a créé pour qu'un ressenti ne puisse pas
  effacer une mesure — alors qu'il ÉTAIT un ressenti coché à l'œil. Vérifié rouge sur quatre
  cassures.
- `npm run demo:avatartri` — **l'avatar composite** (R25) : XP par discipline recomptée depuis
  `answers.done` (repos = 0, brick +5/+5, tiers partagés), moteur de boucles (5 items × 6
  générations par discipline), passe exhaustive (0..30)³ sur les DEUX rendus (59 582 SVG), et
  l'ATTACHE — chaussures/bas/ceinture calculés depuis la pose rendue, jamais la pose normale.
  **28ᵉ gate CI**, module `avatar-tri.js` PUR (zéro import) donc exécutable en node sans
  navigateur. Vérifié rouge sur cassures (pieds épinglés, cuissard sans genou, crédit du repos).
- `npm run demo:proactif` — **le coach proactif** (R21) : détection de déviation après ingestion
  (allure/puissance > 10 %, séance manquée > 24 h, charge 7 j > 15 %), recalcul BORNÉ à la fenêtre
  de 14 jours, notification en deux lignes. **25ᵉ gate CI.** Sa raison d'être est le §3 : le
  déclencheur ne sait que RÉDUIRE — « on ne rattrape jamais le volume manqué » tenu jusque dans
  l'automatisme. Vérifié rouge sur six cassures délibérées.
- `npm run demo:faisabilite` — **le raisonnement inverse** (RV) : une épreuve, un chrono visé, un
  verdict déroulé à reculons. **23ᵉ gate CI.** Son critère central, `RV-INVARIANT`, assertе que le
  plan émis est IDENTIQUE au bit près avec et sans objectif de temps — la performance reste une
  SORTIE, jamais une entrée qui construit. Aucun modèle nouveau : chaque étape INVERSE un modèle
  déjà sourcé (Riegel/P5, P2bis, régime P11).
- `npm run measure:fallback [sport|tous]` — **mesure R15.3** : à quelle fréquence le créneau
  facile de repli (`easyFallbackSlot`) se déclenche. Détection POST-HOC (plan émis vs
  `weekSchema` déclaré), zéro instrumentation dans `src/`. Vérifie sa propre hypothèse
  (jours non réordonnés) et refuse de publier un taux sur un balayage vide. Trail 25,0 % des
  plans · swimrun 44,4 % — c'est ce chiffre qui a tranché O-3.
- `npm run golden:capture` / `golden:verify` — **golden master** (spec R10) : photographie
  945 plans (6 sports × formats × historiques × niveaux × intentions + passe garde-fous
  blessures/âges/terrain/volumes + **passe « course datée »** : 6 sports × les 7 jours de
  semaine possibles pour le jour J — sans elle, toute la branche ancrée sur une course était
  hors couverture, et c'est ce trou qui a laissé vivre N2 — plus une passe « volume et
  extrapolation » R14, sans laquelle P5 n'était regardé qu'à l'ancrage où il ne bouge pas)
  et détecte tout écart au bit près.
  `golden/hashes.json` est versionné (empreintes) ; la photo complète (~76 Mo) reste locale et
  sert à LOCALISER le champ qui a changé. Bloquant avant toute extraction mécanique.
- `npm run build:standalone` — recoud la **PWA** en UN fichier HTML autonome
  (`EnduraBuild-standalone.html`, ignoré par git) : 23 modules ES en `Blob` + `importmap`
  (instance unique par module, imports circulaires préservés), CSS et polices en `data:`.
  Sert à tester l'app hors ligne d'un double-clic — le monolithe `Coach_Pro_V1.5.html`
  a le moteur à jour mais son UI est gelée à R4 (ni carte Trail, ni étape terrain).
- `npm run test:e2e` — 14 suites Playwright contre la PWA (`tests/e2e/`, vrai Chromium,
  job CI `e2e` séparé). Seule exception au zéro-dépendance : Playwright, devDependency de
  TEST uniquement (`npm install` d'abord ; local : `/opt/pw-browsers/chromium` détecté,
  sinon `EB_CHROMIUM`).

**Règle de travail n°1 : après toute modification du générateur, relancer l'audit et le
laisser vert.** Les règles vérifiées (spec « audit 2 » + manifeste) sont listées dans
`ARCHITECTURE.md` ; toutes sont à 0 échec aujourd'hui.

## Comment travailler dans ce dépôt

- **Une garde se prouve dans les deux sens avant d'être crue** : rouge contre un état connu
  mauvais, verte contre un état connu bon. Un gate non contre-prouvé ne mesure que lui-même.
  (Règle issue de l'arbitrage B-25 §9, 14/08/2026 — démontrée le jour même par deux faux
  positifs d'instrument : une CSP lue dans un commentaire, 62 citations bibliographiques
  prises pour des requêtes.)
- **Une entrée déclarée ne remplace pas une sortie calculée que le moteur possède déjà.**
  Vérifié trois fois : tables MET contre puissance mesurée (N-02), `vol_max` contre le volume
  de course du plan livré (B-21, `runHoursPerWeekOf`), bande statique contre bande du
  prédicteur (B-25). (Même arbitrage.)
- **Un commentaire qui affirme un invariant est accompagné d'un test, ou il est supprimé.**
  Un invariant non gardé n'est pas un invariant : c'est un souhait. Quatrième occurrence
  mesurée en un jour : le « seul classificateur » de nutritionCalculator, l'alignement déclaré
  d'`_IFZ`, « rn.mara n'est prescrit qu'au marathon », et la frontière seuil recopiée — cette
  dernière est la forme correcte, gardée par T-20. (Arbitrage du STOP de Phase 2, 14/08/2026.)
- **Règle 14 — deux grandeurs ne se comparent qu'après conversion dans une monnaie commune,
  et l'exposant appartient à la DISCIPLINE** (arbitrage `sw.aero`, 14/08/2026) : vélo natif en
  puissance (aucune conversion) · course allure → effort avec un exposant ≈ 1 (le coût est
  quasi linéaire en vitesse, ~1 kcal/kg/km) · natation exposant **≈ 3** (traînée
  hydrodynamique). Comparer un rapport d'ALLURE à un rapport de PUISSANCE est une faute
  d'unité — la même « pénalité » de 12-16 % vaut 86 % d'effort en course et 71 % en nage.
  Sept occurrences mesurées dans ce chantier (O-13, le plancher de temps facile de R20.5,
  R20.7, V-11, la table de T-15, `peakH` en O-35, et le retrait de mon propre correctif O-35).
- **La règle 7 (« mesurer avant d'écrire la règle ») vaut aussi pour les tickets
  d'ALIGNEMENT, pas seulement pour les seuils** (même arbitrage). Deuxième fois qu'un correctif
  de cohérence aurait fait des dégâts réels s'il avait été appliqué sans mesure : après B-02
  (45 % de profils touchés), `sw.aero` — le reclasser aurait fait déborder 411 semaines sur
  C26d, donc retiré du volume aérobie de nage, exactement ce dont les nageurs manquent le plus.
  Un ticket d'alignement se mesure avant d'être adopté, sa prémisse comprise.

- **Règle 15 — une garde qui porte sur le COMPORTEMENT du moteur observe la SORTIE LIVRÉE ; elle
  ne lit jamais une table** (arbitrage du 15/08/2026, treize occurrences mesurées). Modéliser
  `blockBounds` au lieu de l'observer a produit un balayage T-28 dont la conclusion était
  INVERSÉE (12 « couples permissifs en affûtage » qui n'atteignaient jamais la branche modélisée).
  Balayer un motif SYNTAXIQUE là où la famille est SÉMANTIQUE a fait rater le fail-open de
  C24/C24b (`if (tot <= 0) continue`). Lire `DOSE_CAP_MIN[suffixe]` quand le code fait une
  résolution par regex a fait déclarer `css` orphelin alors qu'il est plafonné à 40 depuis
  toujours. **Mesurer ce qui est ÉCRIT au lieu de ce qui s'EXÉCUTE donne un rapport faux avec un
  raisonnement juste** — c'est le mode de défaillance le plus coûteux du dépôt, parce qu'il
  survit à la relecture.

- **Règle 16 — la question « qu'est-ce qui produit ceci ? » se pose RÉCURSIVEMENT, jusqu'à un
  point d'entrée produit.** S'arrêter à un niveau rend un fait vrai sur un FICHIER et faux sur le
  PRODUIT. Mesuré : le balayage a répondu « `steps.js` écrit le journal sans promouvoir » — exact
  — et personne n'a demandé qui appelle sa fonction d'import ; son unique appelant promeut dans la
  ligne suivante, et O-41 était réfuté. Test d'arrêt : on s'arrête quand le producteur est une
  ACTION DE L'ATHLÈTE ou un point d'entrée du système, **jamais quand c'est une autre fonction**.
  La technique paie quand elle va au bout — comparer deux mesures au lieu d'en remplacer une,
  balayer les ÉCRIVAINS et non les lecteurs, OBSERVER `blockBounds` au lieu de le modéliser — et
  elle ment quand elle s'arrête à mi-chemin. Corollaire opérationnel : une fixture qui n'est pas
  atteignable par un chemin produit rend un constat sur la fixture (T-33).

- **Règle 17 — après tout déplacement de code, tous les blocs `verify` sont rejoués, et toute
  entrée qui bascule en « ne reproduit plus » est confirmée À LA MAIN avant d'être crue.** Le mode
  de défaillance est silencieux et il a déjà été mesuré deux fois : un `grep` qui ne trouve plus
  son motif **se lit comme un défaut réparé**. Le pas A d'O-41 a déplacé `syncRefsFromTests` et
  invalidé le bloc d'O-23 du même coup ; un refactor est un producteur de MASSE de ce défaut — il
  peut retirer dix entrées du registre en une fois sans que rien ne le signale. (Six blocs à `cmd`
  muet avaient déjà été rangés à tort en « ne reproduit plus » alors qu'ils reproduisaient.)
  **Un RENOMMAGE de donnée produit est le même producteur de masse, en plus discret** (19/08/2026,
  troisième occurrence) : O-79 a renommé « Nage vitesse » pour de bonnes raisons, et deux entrées
  du registre — O-76 et O-78 — ont basculé en « ne reproduit plus » alors que les deux défauts
  étaient intacts (59/130 et `∞` toujours là). Un renommage ne touche aucune structure et passe
  tous les gates. D'où la forme correcte, déjà appliquée à `smoke-r4` et `smoke-avatar` :
  **un critère n'identifie jamais sa cible par un LIBELLÉ** — il la trouve par une propriété
  (une zone, un marqueur de sortie) et PUBLIE le nom qu'il a trouvé.

- **Règle 12, forme nouvelle (arbitrage O-43, 16/08/2026) — une sortie calculée ne se relit jamais
  comme une entrée.** Si une contrainte se dérive du contenu GÉNÉRÉ, elle mesure le générateur et
  non l'athlète. Mesuré : la sonde de capacité lit un clone SATURÉ de la semaine livrée, donc
  recompter le même travail en plus de minutes (O-42) lui fait conclure à une capacité plus grande,
  la courbe monte, et le point fixe **ajoute des séances**. Le plafond est une propriété de
  l'athlète — temps disponible, tolérance tissulaire —, jamais de la façon dont le moteur compte.
  Gardé par **T-34** (`lotPhysio`) : faire varier la conversion d'une discipline ne doit rien
  changer à ce qui est prescrit.

- **Corollaire de la règle 14 — un écart s'exprime dans l'unité de sa CONSÉQUENCE, et un
  pourcentage seul est ininterprétable sans sa base.** Donner l'absolu d'abord, le pourcentage
  ensuite si utile. `swim/demifond` à **+17,6 %** vaut 1,6 min au-dessus d'un clamp qui en accorde
  1 : le pourcentage disait « queue épaisse », la minute disait « bruit de quantification ». Le
  Full à **+21,7 %** vaut `286 → 348 min`, une heure de plus : là les deux disent la même chose, et
  c'est ce qui prouve que la queue était réellement épaisse — jamais le pourcentage seul.

- **Corollaire de la règle 15 — une causalité ne se lit pas sur un diff de LOT. Elle se mesure par
  expérience contrôlée : un seul facteur varie.** Mesuré le 16/08/2026 : j'avais lu
  « `structurel` 1,42 → 2,08 h » sur un diff qui contenait tout O-42 et j'en avais tiré la cause
  d'O-43. L'expérience contrôlée — faire varier la seule CONVERSION — laisse ce maillon à +1,0 % et
  déplace `courbe` (+11 %), `boucle-growth` (+36 %) et le pic livré (+9,1 %). Le diagnostic publié
  était faux et le filtre du fondateur l'a réfuté dans l'heure.

- **Un test d'INVARIANCE a toujours besoin de son jumeau de SENSIBILITÉ** (arbitrage O-44 §4) :
  une constante gelée est trivialement invariante, donc un test d'invariance seul est satisfait par
  la pire des solutions. La propriété réelle est « invariant à ce qui ne le concerne pas, **sensible
  à ce qui le concerne** » — T-34 avec T-36. À appliquer à tout test d'invariance du dépôt.

- **Une table qui croise deux populations porte son AXE dans son en-tête** (arbitrage O-46, §5) :
  transmise, elle est plus dangereuse que commise — celui qui la commet peut encore se souvenir de
  ce qu'il a mélangé, celui qui la reçoit ne le peut pas. Deux occurrences en une journée : une
  table qui mêlait semaines de charge et d'affûtage (O-44 §6a), une qui mêlait formats de nage pure
  et de triathlon sous le seul mot « sprint » (O-44 §9) — la seconde a fait conclure au fondateur
  que 27 profils échappaient à un correctif qui les couvre. L'axe coûte trois mots.

- **Règle 19 — avant d'écrire un test, demander : quel est le correctif le MOINS COÛTEUX qui le
  ferait passer ? Si ce correctif ne résout pas le problème, le test est sous-spécifié.** Deux
  occurrences le même jour, sous deux surfaces qui ne se sont pas connectées : un test d'INVARIANCE
  qu'une constante gelée satisfait (O-43, issue 2), un test de BORNE qu'une valeur épinglée sur la
  borne satisfait (T-38 v1 — et je venais de nommer la première une heure plus tôt). La question du
  correctif minimal les couvre toutes les deux, et elle se pose AVANT d'écrire.

- **Règle 18 — une différence E2E n'est attribuée à un lot qu'après ≥ 3 exécutions de la suite
  concernée DE CHAQUE CÔTÉ du changement.** Une exécution unique de part et d'autre n'est pas une
  comparaison : c'est deux tirages. Une suite E2E est stochastique par nature (réseau, temporisation,
  charge machine), et le coût du faux positif est élevé dans les deux sens — soit on révoque un bon
  lot, soit on cherche des heures une cause qui n'existe pas. Mesuré le 15/08/2026 :
  `smoke-nofallback` (`icon-192.png net::ERR_ABORTED`) rouge après O-42, verte sur le commit
  précédent, **une exécution de chaque côté** — j'allais l'écrire comme régression du lot. Rejouée
  trois fois sur `HEAD` : trois fois verte, puis verte dans la passe complète. C'est le pendant
  TEMPOREL de la règle 15 : celle-ci dit « mesure ce qui s'exécute, pas ce qui est écrit », celle-là
  dit « mesure-le assez de fois pour que le résultat soit du signal ».

- **Corollaire de la règle 14, à cinq secondes : un verdict rendu en POURCENTAGE sur une grandeur
  dont le pas est ABSOLU est faux sur les petites valeurs.** Trois occurrences en une journée
  (15/08/2026) : la tolérance de la ventilation O-42 (205 faux « inexpliqués », tous le même
  arrondi), le classement du dépassement C22 (`swim/demifond` à **+17,6 %** vaut **34 → 40 min**,
  soit 1,6 min au-dessus d'un clamp qui en accorde 1), et le seuil de bande de la même mesure.
  Le test : *dans quelle unité la RÈGLE agit-elle ?* Un clamp qui retire des minutes se juge en
  minutes ; un plancher de séance se compte en minutes ; un pourcentage sur une semaine de 34 min
  amplifie le quantum d'un facteur dix.

- **Règle 21 — une sonde sur une propriété qui varie avec la POSITION se rédige PAR POSITION
  d'abord, et n'agrège qu'après ; jamais agréger puis comparer** (arbitrage du 17/08/2026, après
  trois récidives de la règle 20 dans la garde écrite pour la tester, une heure après l'avoir
  posée). La cause n'est pas l'inattention : **la forme naturelle d'une sonde est SANS position**
  — on écrit `max`, `moyenne`, `compte`, et chacune de ces opérations DÉTRUIT la position avant la
  comparaison. L'écriture par défaut d'une sonde est donc structurellement incompatible avec une
  propriété positionnelle. Mesuré : un `max` sur tout le plan pour une propriété par semaine
  (T-41 aurait rougi sur le comportement voulu), et son corollaire immédiat — `Math.max` sur une
  tranche vide rendant `-Infinity`, qui n'existe que parce qu'on agrège.

- **La moitié SENSIBILITÉ d'un jumeau porte un DOMAINE : où la sensibilité est-elle attendue ?
  Hors de ce domaine, l'insensibilité EST la propriété, pas son absence** (arbitrage du
  17/08/2026, qui corrige la formulation d'O-44 §4). « Invariant à ce qui ne le concerne pas,
  sensible à ce qui le concerne » était incomplet : **une grandeur qui CONVERGE est insensible à
  sa limite, et c'est correct**. Mesuré — sur un sprint, une continuité déclarée à 400 m et une à
  2 000 m arrivent au même plafond à mi-plan parce que la projection converge vers la distance de
  course ; exiger de la sensibilité là revient à signaler une convergence comme un défaut. À
  reporter sur tout jumeau invariance/sensibilité du dépôt.

- **Règle 20 — toute grandeur qui varie avec la POSITION DANS LE PLAN déclare à quelle position
  elle vaut, et tout consommateur la lit à la position où il l'utilise** (arbitrage O-56,
  17/08/2026). Une valeur de fin de rampe n'est pas une borne de semaine 1 ; une déclaration de
  semaine 1 n'est pas une capacité de semaine 30. Les deux occurrences sont symétriques et sont
  arrivées le même jour :
  `atteignableM` — valeur de FIN, appliquée au DÉBUT : un athlète déclarant 400 m de nage continue
  recevait une séance de **4 150 m**, et 2 000 m donnaient un plafond de **32 076 m** sur un Full ;
  `beginner` — valeur du DÉBUT, appliquée à la FIN : le débutant de la semaine 1 l'est encore en
  semaine 30, sur un plan qui prescrit précisément les trente semaines qui devraient le lever.
  C'est le pendant TEMPOREL de la famille fermée douze fois : celle-là portait sur l'ORDRE DES
  PASSES (« une garantie vérifiée au milieu du pipeline ne vérifie que l'avant-dernier état »),
  celle-ci sur la POSITION DANS LE PLAN.

- **Une règle qui échoue trois fois n'est pas une règle mal écrite — c'est un MÉCANISME
  manquant** (arbitrage du fondateur, 17/08/2026, après la troisième perte par `git checkout`
  sur un fichier non commité). La règle « committer avant de casser » est écrite depuis V2 et a
  échoué trois fois : le défaut n'était pas la cassure mais le « défaire à la main ». Le harnais
  `npm run casser` possède désormais le cycle de vie de sa mutation (mute · lance · restaure
  dans un `finally`, Ctrl-C compris) et REFUSE de muter un fichier déjà modifié — l'état exact
  des trois pertes. Même raisonnement que le crochet du journal, `lotPhysio` en CI et
  `check:chemins` : ne pas compter sur la discipline là où un mécanisme suffit.

- **Un ZÉRO a besoin de sa POPULATION** (arbitrage du fondateur, 17/08/2026). L'heuristique
  « un taux saturé accuse l'instrument » a un ANGLE MORT, et il est large : **elle ne peut pas se
  déclencher quand la valeur saturée est la valeur DÉSIRÉE.** Zéro écart, zéro violation, zéro
  erreur, zéro régression — c'est-à-dire la majorité des gates de ce dépôt : l'échec de la mesure
  et sa réussite y sont indiscernables à la lecture. La parade se généralise : *quand le succès
  d'un test est indiscernable de sa vacuité, il faut prouver que la MESURE A EU LIEU, séparément
  de son RÉSULTAT.* Tout gate dont le succès est « zéro » assert donc sa population :
  `golden:verify` et `golden:bundle` 989 profils, `audit:v1` 459 combinaisons, `audit:invariants`
  54 configurations × 22 invariants. Le compte est ÉPINGLÉ et ne se déduit pas de la photo — une
  photo tronquée et un balayage tronqué se valideraient mutuellement (contre-prouvé : 10 contre
  10, 0 écart réel, et le gate rougit). Avec les deux règles voisines, le triptyque est complet :
  **un ratio a besoin de sa base, un compte a besoin de son moment, un zéro a besoin de sa
  population.**

- **Un COMPTE se publie avec ce qu'il compte — brut ou net — et à quel POINT DU PIPELINE il est
  lu** (arbitrage du fondateur, 17/08/2026). C'est le corollaire du dénominateur, un cran plus
  haut : un ratio a besoin de sa base, un compte a besoin de son MOMENT. Mesuré : « 124 retraits »
  lus dans la trace (BRUT, au moment de la coupe) et « −58 sur 59 » lus sur le plan livré (NET,
  après les passes qui réinsèrent) ont été publiés à un jour d'écart sans étiquette, sur le même
  profil. Le lecteur en tire soit une contradiction, soit que l'un est faux — jamais « ce sont
  deux questions ».

- **Une garde qui valide `src/` ne valide pas ce qui est LIVRÉ** (arbitrage du 17/08/2026,
  `npm run golden:bundle`). Le golden importe `src/app/bridge.ts` ; ce qui est déployé est le
  BUNDLE, et la construction n'est pas neutre — elle RETIRE les imports et concatène, donc un
  alias (`record as traceRecord`) ne survit pas. Mesuré le jour même : `audit:v1` à **57
  ReferenceError** pendant que `golden:verify` restait à **0 écart**, parce que l'un lit le
  bundle et l'autre la source. Vérifier la VALIDITÉ du bundle (ce que font `audit:v1` et les
  E2E) et son IDENTITÉ DE SORTIE avec la source sont deux questions différentes ; seule la
  seconde est ce que la photo garantit. Le piège de cette garde-là est qu'un bundle qui ne se
  charge pas rend **0 écart** — le résultat attendu : la référence de `globalThis.EBV2` doit
  donc être vérifiée CHANGÉE entre les deux passes, et une contre-preuve perturbe une constante
  du livré (186 profils divergent sur `B17_ECHAUF_M 200 → 225`).

- **Un ratio se publie avec son dénominateur NOMMÉ, et se lit en le cherchant** (corollaire de la
  règle 14, arbitrage du 17/08/2026). « 231/231 à la borne » comptait *parmi les blocs à la borne,
  combien sont en tri* — pas l'inverse ; il s'est lu comme « le plafond définit la nage seuil du
  triathlète longue distance » et un arbitrage a été rendu dessus. Le réel était 22 % des semaines.
  Un ratio est un chiffre à DEUX nombres ; n'en donner qu'un le fait toujours lire dans le sens le
  plus frappant.

- **Un outil de LOCALISATION et un outil de MESURE ne sont jamais le même outil, et le premier
  produit toujours un nombre qui a l'air d'être le second** (arbitrage du 17/08/2026). `firstDiff`
  du golden documente qu'il rend le PREMIER écart — « où compte plus que combien pour corriger » —
  et c'est en agrégeant ses 87 lignes qu'une ampleur fausse a été publiée puis a fondé une
  décision. Le vrai mouvement était de 6 403 champs. Fermé par O-52 : l'outil a désormais les deux
  sorties.

- **Changer ce dont une valeur DÉRIVE redéfinit silencieusement le sens de tous ses consommateurs
  — y compris les arbitrages rendus dessus.** Aucun test n'attrape ça, puisque rien ne bouge chez
  le consommateur. Trois occurrences en deux jours : `cibleDuNom` comparant une grandeur à
  elle-même après que le titre est devenu dérivé du livré (0/24, trivialement vrai) ; un message
  bâti sur une clé dont la définition avait changé ; et une décision « l'auxiliaire cède jusqu'à
  son plancher » devenue sans objet parce que la borne inclut désormais l'auxiliaire. La seule
  parade est de **relister les lecteurs d'une valeur quand on change sa source**.

- **La nouvelle base d'un cliquet se mesure AVANT que le moteur bouge, jamais après**
  (arbitrage du 17/08/2026, `npm run base:cliquet`). Un cliquet qui monte parce qu'on a ÉLARGI la
  mesure et un cliquet qui monte parce que le MOTEUR a régressé se ressemblent exactement.
  Trancher par inférence — « un autre cliquet est resté fixe, donc c'est le corpus » — marche
  jusqu'au jour où tous montent. La preuve mécanique coûte une passe : rejouer le NOUVEAU corpus
  contre le moteur INCHANGÉ. Vérifiée sur ses trois branches (corpus +20 → 31→69 rabotés ; corpus
  inchangé et moteur inchangé → 0 ; corpus inchangé et garde retirée → +138, « RÉGRESSION »).

- **Un corpus se juge sur l'espace des DÉCISIONS, pas sur celui des saisies**
  (arbitrage A-2, 17/08/2026, `npm run couverture:golden`). Six angles morts du golden en un mois
  ne sont pas six distractions : le corpus a été construit pour couvrir des FORMATS et des NIVEAUX,
  pas les BRANCHES des règles qui les lisent — et chaque fois qu'une règle apprend à lire une clé,
  il devient muet sur son domaine **en silence, parce qu'un corpus incomplet rend des résultats
  verts**. La couverture par CLÉ ne suffit pas : le dernier trou l'aurait passée (`level` avait ses
  3 valeurs, `longest_swim_m` ses 5 branches) — ce qui manquait était le CROISEMENT. Ne sont
  croisés que les couples que le CODE lit ensemble, dérivés par co-occurrence : 238 sur 2 080,
  88 % de bruit retiré sans arbitrage humain.

- **Test de dépistage de la règle 15, à trois secondes : un taux SATURÉ accuse l'instrument — ou
  le MODÈLE MENTAL de ce que l'instrument observe.** (Élargi le 16/08/2026 : `mesure:o46` rendait
  « avec plafond » et « sans plafond » identiques au mètre près ; la sonde fonctionnait, elle
  mesurait une grandeur qui n'agissait pas là où on la croyait — `CAP_SWIM` borne UN BLOC de la
  sortie longue, pas une séance. Les deux se testent par la même question : *quel état, quelle
  grandeur, décrit ce résultat ?*)
  Toute mesure qui rend 0 % ou 100 % est suspecte d'erreur de sonde jusqu'à preuve du contraire —
  et la preuve est de faire VARIER une entrée et de vérifier que le taux bouge. Quatre des
  quatorze occurrences de la règle 15 auraient été attrapées par là : « 1 924 divergents sur
  1 924 » a démasqué un CSS de repli, « 0 collision » mesurait un jour sans vélo, « 0 badge »
  cherchait une classe absente, « 12/12 » photographiait un artefact de date.

- **Les propriétés visuelles LIÉES se mesurent ENSEMBLE, en un seul cycle** (consigne du
  fondateur, 12/08/2026). Couleur de badge, fond de carte et contraste dépendent du même token
  de discipline : les traiter séparément fait payer trois cycles mesure → correction → re-mesure
  là où un seul suffit, et c'est exactement ce que la refonte de la carte de séance a coûté (le
  badge posé en teinte diluée, puis re-mesuré contre un fond qui venait de changer, puis repris
  en tuile pleine). **Avant de toucher une propriété visuelle, lister celles qui partagent son
  token ou son fond, et les mesurer d'un bloc** — la sonde coûte le même prix pour une ou pour
  cinq grandeurs.
- **Un correcteur qui RÉUSSIT efface sa propre trace : sa fréquence se mesure au DÉCLENCHEMENT,
  jamais sur le livré** (arbitrage du fondateur, 18/08/2026, « UN CORRECTEUR SANS TRACE »).
  Le critère qui décide : *laisse-t-il une SIGNATURE ?* `DOSE_CAP_MIN` clampe à 40 — un bloc
  exactement à 40 prouve le clamp, la sortie est lisible. *Ou RESTAURE-t-il un invariant ?*
  C26c coupe jusqu'à « sous le plafond » — or « sous » est aussi l'état normal, et la sortie ne
  dit plus rien. Mesuré deux fois : le taux de déclenchement de C26c au pic valait **7 % lu sur
  le livré contre 18 % mesuré au rayon**, et l'arbitrage B-02 déclarait le plafond de temps dur
  « dormant, 6 profils (0,6 %) » quand la neutralisation en rend **118 sur 985, 12 %** — un
  facteur VINGT sur un chiffre qui a fondé une décision. `npm run mesure:morsure` fait la mesure
  correcte (neutralisation par `npm run casser`, régénération, comptage des plans qui changent) :
  C26c 12 % · C22 17 % · I14 35 % · I14b 30 % — aucun de ces mécanismes n'était dormant.

- **Protéger un seul CANAL ne protège pas un type : ça choisit seulement de quelle façon il
  meurt** (même arbitrage, §2 — le fondateur corrigeant sa propre consigne sur mesure).
  `protéger la taille seule → le type perd ses occurrences` (« Footing facile » : 100 % de sa
  taille, 17 % de ses occurrences) · `protéger l'occurrence seule → le type perd sa substance`
  (« Nage vitesse » : occurrence protégée, et la dose descend quand même sur 58 plans sur 129).
  Un type dont la valeur tient aux deux — la qualité de la discipline limitante, la sortie
  longue — les déclare tous les deux. Et ça remet la politique de financement à sa place : les
  planchers (deux axes) disent **ce qui ne peut pas payer**, `prioriteFinancement` oriente **qui
  paie parmi le reste**, et quand plus personne ne peut payer ce n'est pas un défaut d'arbitrage
  mais **le plafond structurel qui est trop bas** — un signal différent, à traiter comme tel.

- **Rendre une mesure invariante à une tarification et lui faire rendre une grandeur PHYSIQUE
  sont deux exigences qui peuvent être incompatibles — et c'est la GRANDEUR BORNÉE qu'il faut
  alors changer, pas la mesure** (arbitrage O-43 §5, 19/08/2026). La sonde de capacité doit être
  aveugle à la façon dont le moteur tarife une allure (sinon re-tarifer ajoute des séances) ET
  rendre des heures réelles (sinon elle ment sur ce que la semaine prend) ; or les mêmes mètres
  prennent des heures différentes selon la tarification. Écrit et mesuré : neutraliser le ratio
  de zone dans la sonde découple bien la chaîne (`courbe` cesse de bouger) et **casse I14 23 fois
  de plus** — la capacité se lit alors en heures-REPÈRE et se compare à un plafond en heures
  RÉELLES. **Règle 14 commise dans le correctif d'une règle 12.** Le test qui l'attrape en amont :
  *les deux côtés de la comparaison sont-ils dans la même unité APRÈS le correctif ?*

- **Un puits non borné ne cache pas un EXCÈS, il cache un MANQUE — et le borner déplace le
  défaut tant que la cause n'est pas levée** (arbitrage « UN PUITS NON BORNÉ », 19/08/2026,
  `npm run mesure:puits`). Un créneau sans plafond garantit que le plan atteint toujours son
  volume, en mentant sur la façon : 4 025 m de nage VITESSE sur un sprint, et le total est juste.
  Mesuré, borner ne révèle rien et déplace tout — quatre fois de suite : la nage vers le
  sweetspot, le sweetspot vers la nage, et l'ensemble vers le brick, qui tombe alors **SOUS son
  plancher audité** (116 min pour 150 — direction vérifiée avant de conclure, 0 dépassement).
  Ce que le puits dissimulait n'était donc pas du volume mal placé : c'était que **le plan ne
  peut pas placer son volume dans ses bornes de séance**. Corollaire opérationnel : avant de
  borner un puits, vérifier que la CIBLE ne suit pas le livré — si elle le suit (O-43), le
  manque déclaré vaudra zéro par construction, et la mesure sera vacueuse.

- **Un facteur de TAILLE ne multiplie jamais un COMPTE** (même arbitrage, la règle 14 sur un
  troisième objet). `PT(lo, hi)` multiplie par `sessionScale` — juste pour une durée ou une
  distance, faux pour un nombre de répétitions : `B(PT(2, 3), …)` naît à UNE répétition dès que
  l'enveloppe se resserre, et **37 % des blocs de qualité du golden sont dans ce cas** (course
  55 %, vélo 72 %). La conséquence n'est pas cosmétique : `repCap` (R4.1) ne vit que dans la
  branche `reps > 1`, donc ces blocs sortent de leur protection et croissent en durée sous un
  plafond de 9999 — 19 → 67 min mesuré sur un profil. Une séance d'intervalles réduite à une
  répétition n'est plus une séance d'intervalles, c'est un bloc continu qui en porte le nom.

- **Un objet qui MODIFIE le plan et un objet qui le DÉCRIT ne se calculent pas au même moment,
  même quand c'est le même objet** (arbitrage T-16c, 19/08/2026). Ce qui modifie va DANS la boucle
  du point fixe, sinon le total bouge sans rééquilibrage ; ce qui décrit va APRÈS convergence,
  sinon il décrit un état intermédiaire. Confondre les deux coûte dans les deux sens — mettre un
  descripteur dans la boucle le fait participer à ce qu'il décrit (la boucle d'O-43 sous une autre
  forme). Mesuré : la bande « allure du jour J » sert les DEUX rôles — `zoneClass` la lit pour
  classer `rn.mara` en dur/modéré (donc C26c en dépend), `zoneOf` l'écrit dans le texte. Une seule
  source, `raceRunBand`, évaluée deux fois. Corollaire opérationnel : **quand un pipeline
  reconstruit ses `refs` en cours de route, la liste des substitutions qu'il transporte doit être
  RELUE** — celle de la boucle de réparation portait `bikeRp` et pas `runMara`, sous un commentaire
  qui énonçait la règle pour les deux, et 4 séances sur 5 affichaient la table statique.

- **Une observation sur UN point n'est pas une mesure, et elle ment le plus souvent dans le sens
  rassurant** (même arbitrage, §3). Sur une semaine d'un profil, les pièces du lot vélo faisaient
  passer « Nage vitesse » de 149 à 93 min et j'allais publier « elles empêchent le plan de parquer
  une heure dans une séance absurde » ; sur les 187 profils tri, elles font l'INVERSE — séances
  > 90 min 1,9 % → 5,1 %, maximum 144 → 210 min. C'est la règle 15 dans sa forme la plus simple :
  avant de tirer une tendance d'un cas, la rejouer sur la population.

- **Toute protection qui dépend d'une SÉANCE SURVIVANTE rate le profil qui a le moins de
  séances** (arbitrage du fondateur, 18/08/2026, « C26c AU PIC » §5) — cinq occurrences, une
  seule cause : `sonde:b17` sans débutant · 53 titres menteurs sur C15 · zéro palier sur M à
  budget serré · la coupe qui retire 98 % de nage (O-66) · et O-74, la nage seuil absente des
  semaines de charge du pic en `reprise`. Le profil le plus PLAFONNÉ — moins de séances, budget
  dur plus serré, capacité la plus basse — tombe dans TOUTES les coupes à la fois, et c'est
  structurel, pas accidentel. Une règle formulée « la séance X est protégée » ne protège rien
  chez qui n'a pas de séance X : elle doit se formuler sur ce qui doit EXISTER, pas sur ce qui
  doit survivre. Corollaire de test : tout critère écrit sur un type de séance déclare ce qu'il
  fait quand ce type est ABSENT — sinon il mesure l'absence et l'appelle un défaut (trois
  occurrences le 18/08 dans les gardes T-47 et T-48 elles-mêmes).

- **Tout script qui MUTE une source pour mesurer passe par `npm run casser`, jamais par un `sed`
  ad hoc** (arbitrage du fondateur, 18/08/2026, « DEUX CANAUX » §4). Le harnais possède le cycle
  de vie de la mutation (mute · lance · restaure dans un `finally`, Ctrl-C compris) et refuse de
  muter un fichier déjà modifié — mais **il ne protège que le chemin qu'il couvre** : la
  contre-preuve vacueuse du 18/08 (un `|` non échappé, rien muté, verdict VERT) était un `sed`
  écrit à la main, hors du harnais. Même conclusion que pour le `git checkout` : la classe se
  referme d'un côté et rouvre de l'autre tant qu'un chemin reste à la discipline. À défaut,
  toute mutation manuelle ASSERTE que son motif existe avant de remplacer — un remplacement qui
  ne trouve rien doit LEVER, jamais rendre vert.

- **Poser un plancher est un acte de priorisation GLOBALE, jamais une protection locale**
  (arbitrage du fondateur, 18/08/2026, « L'INVENTAIRE DES PLANCHERS *EST* LA POLITIQUE ») :
  *« qui a un plancher ne paie pas, qui n'en a pas paie tout »*. L'ordre de compression du
  moteur n'est écrit nulle part et il est pourtant complet — il se lit dans la liste des
  protections. Chaque plancher posé pour une bonne raison LOCALE a déprioritisé en silence tout
  ce qui n'en avait pas, et personne ne l'a décidé. Avant d'en poser un : `npm run
  inventaire:planchers` dit qui paie aujourd'hui ; après, il doit dire ce qu'on a voulu.
  **Deux canaux, jamais un** — un plancher de MINUTES ne protège pas des OCCURRENCES : mesuré,
  « Footing facile » garde 100 % de sa taille et perd 83 % de ses occurrences, parce qu'un type
  qui ne peut plus rétrécir ne peut plus que disparaître. Un plancher ne supprime pas le
  paiement, il en change la MONNAIE.

- **Tout mécanisme qui sélectionne par POSITION, TAILLE ou ORDRE frappe la natation par défaut**
  (arbitrage du fondateur, 19/08/2026, « LA NAGE EST LA VICTIME PAR DÉFAUT DE TOUT MÉCANISME QUI
  CHOISIT ») — c'est une PRÉDICTION, pas une observation rétrospective : quatre mécanismes l'ont
  déjà fait, aucun ne l'a décidé. `applySessionBudget` coupe par minimum de minutes, et la nage a
  les séances les plus courtes (50' contre 68' et 203') · le routage des doubles ajoute deux
  séances par semaine, toutes en natation, sur une épreuve qui en demande 12 % · le financement
  fait payer qui n'a pas de plancher, et la qualité nage n'en a aucun · l'affichage repliait la
  première séance du jour, qui sous doubles est la nage 66 jours sur 66 (O-60). Chacun choisit par
  une propriété STRUCTURELLE et la nage est à l'extrémité perdante des quatre.
  C'est aussi pourquoi `prioriteFinancement` était nécessaire et pas suffisante : **elle oriente UN
  mécanisme**, les trois autres choisissent sans elle. Avant d'écrire une élection, une coupe, un
  routage ou un repli, se demander où tombe la natation — la réponse par défaut est « elle paie ».

- **Une protection qui vit dans les conditions de N passes n'est pas une protection, c'est une
  coïncidence** (même arbitrage, §3) : *protégé par le chemin, pas par la borne*. Mesuré —
  **onze sites élisent une victime par minimum de minutes**, chacun portait sa propre liste
  d'exclusions, deux pouvaient encore supprimer le déverrouillage de la veille. Le plancher
  absolu (repos · course · veille) vit désormais en UN point,
  `src/engine/prioriteFinancement.ts`, et **T-46** refuse toute élection qui ne passe pas par
  lui. Le mode de défaillance est asymétrique dans le temps : une séance perdue en semaine 5 se
  rattrape sur trente-cinq semaines, une séance perdue la veille du départ, jamais.

- **Le moteur réfléchit avant de générer, se vérifie, se corrige** — jamais l'inverse. Toute
  nouvelle contrainte de génération suit le cycle : mesurer d'abord (l'auditeur dit qui viole
  quoi), corriger dans le générateur, re-mesurer, garder le vert.
- **Chaque invariant porte un identifiant** (`// C24 — …`, `// R3.13 — …`) avec sa
  justification dans le code, sa vérification dans `src/audit/coherenceScorer.ts`, et sa ligne
  dans le registre d'`ARCHITECTURE.md`. Suivre ce format pour tout ajout — c'est l'extension
  au code du format `{id, what, val, why}` des règles pédagogiques.
- **Chaque séance générée explique son objectif** (champ `note`, rendu « — 💡 … ») : Pourquoi,
  Comment, Quel bénéfice. L'auditeur refuse une séance muette.
- **Français partout** : UI, commentaires, notes de séance, rapports.
- **Aucune dépendance externe** au-delà de Google Fonts pour le produit, zéro paquet npm pour
  l'audit — ça se discute au chantier V2, pas avant.
- **Séparation des rôles dans le moteur** : `sess()` construit des steps structurés,
  `renderSess()` est le SEUL producteur de texte, `blockBounds` la SEULE source de bornes,
  la courbe (bands + C22) le SEUL pilote de volume. Ne pas créer de deuxième chemin.
- **Compatibilité** : l'outil est déployé ; l'état utilisateur vit dans `localStorage`
  (`eb_state_v2`, multi-plans ; migration automatique depuis `eb_state_v1`) — toute
  évolution du format doit dégrader proprement.
- **Design responsive** : tester mobile/tablette/desktop pour toute retouche UI (grilles CSS,
  variables). L'esthétique « papier/collage » (`styles.css`/`mobile.css`) reste la référence des
  onglets Profil/Plan/Semaine/Outils ; 🎯 Aujourd'hui porte depuis R-ZENNA le nouveau système
  sombre du fondateur (`css/zenna-today.css`, scopé à `body.theme-zenna`) — la direction retenue
  pour la suite du produit, migration des quatre autres onglets non commencée (voir « État
  courant »).

## Modifier le moteur — les deux gestes courants

**Ajuster une séance** : trouver la branche sport dans `sess()` (`if(sp==="run")` …), le slot
(`dur1`/`dur2`/`durLong`/`facileR`/`facile2`), modifier les steps construits par `W/Wm/B/Bd/C/Cm`
— jamais le texte rendu. Si la modification touche un plafond/plancher, il doit passer par
`bnd`/`blockBounds`, sinon R3.3 annulera l'intention au scaling suivant.

**Ajouter une question** : objet dans `buildFreeSteps()`/`buildPremiumSteps()` (`id`, `label`,
`q`, `type`, `options`, `valid(a)`), réponse lue dans `S.answers.<id>`, effet branché dans
`evalRules()` (règle pédagogique) et/ou `buildPlan()` (effet sur le plan). Toute question doit
avoir un effet — sinon la documenter comme UI pure.

## État courant

**O-84 + O-95 FERMÉS (doc O72_O84_O95) — l'annonce B-17 se redérive du livré, le repli de
« dev ≤ pic » ne mange plus le palier, et l'eau libre tombe TÔT** (20/08/2026 — voir
`BUGS_OUVERTS.md` « O-84 FERMÉ », « O-95 FERMÉ », « O-72 RÉVISÉ », gardes **T-06 passé VERT**
(attendu basculé dans le commit, cliquet §6.3) et **T-46 élargi**) : **O-84a** — l'annonce dit
« 1 test + N−1 palier(s) » (D3 : le test MESURE, le palier CONSTRUIT) via **`palierLayout`**,
point unique lu par l'annonce ET la pose ; **O-84b** — sous épaule/drapeau médical l'annonce dit
« suspendues », mêmes conditions que la pose ; **O-84c** — le repli fréquence de « dev ≤ pic »
passe par `jourIntouchable` et ÉPARGNE le jour d'un bloc épinglé tant qu'une autre victime existe
(forme T-45). **La réponse à la question T-46 : LES DEUX** — motif syntaxique (`dayMin(` ratait
`dayMinOf`, règle 15) élargi, ET site routé. **O-95** — les 8 profils avaient TOUS une spec de
2 semaines (les deux pistes du ticket étaient vides) : le TEST glisse en fin de dev, la spec
garde 2 vrais paliers — eau libre en PREMIÈRE semaine, distance de course en dernière, et les
S/M « inconnus » ATTEIGNENT leur distance (750/1500 au lieu de 500-600). Re-mesuré : **O-84
29 → 0 sur 187 · tests annonce=livré 188/188 · eau libre tardive 8 → 0.** **T-58 (O-72 révisé)
mesuré sur REEL, rapporté sans ajuster** : plateau tenu par S39/S40, **rouge d'une semaine**
(S38 à 12 % sous le max, 11 min sous la ligne) — la garde s'écrit au lot progression. Cliquets
ré-épinglés avec cause : S5 502 (baisse — l'identité T-25 redevient vraie sur 2 profils) ·
T-39 26 (les nouvelles cibles des débutants clampées par C15, mécanisme O-54 §2) · T-48
8 720 / 428 603. Banc 31 verts · 22 rouges attendus · 0 régression.

**RE-VÉRIFICATION B-17 livrée — les 7 critères rejoués, le diagnostic d'O-84 était FAUX pour 22
de ses 29 profils, et le site de la perte réelle est IDENTIFIÉ** (V21_ET_REVERIF_B17 §3,
20/08/2026 — voir `BUGS_OUVERTS.md` « RE-VÉRIFICATION B-17 », O-84 réécrit, **O-95** ouvert,
addendum O-54) : balayage des 188 profils tri à décision `B17-paliers`, AUCUN correctif moteur
(la passe rejoue, elle n'écrit pas). **O-84 décomposé** : (a) **22/29 ne perdent RIEN** —
l'annonce compte le TEST comme un palier (D3 dit lui-même « la première séance est un test, pas
un palier ») : c'est pourquoi le correctif `canauxProteges` avait été mesuré INERTE, il protégeait
une occurrence que personne ne supprimait ; (b) **1/29** : l'annonce ignore l'exemption épaule
(3 annoncés, 0 posés — la pose est délibérée, la décision ne le sait pas) ; (c) **6/29, perte
réelle, site identifié avec preuve** : le repli FRÉQUENCE de « dev ≤ pic » élit par minimum de
minutes SANS passer par `prioriteFinancement` — le palier épinglé est intouchable en TAILLE donc
son JOUR saute (« OFF (la semaine de pic reste la plus grosse) » sur le jour du palier de la
DISTANCE DE COURSE, PW/tri/S : 550 m max pour 750). Les autres critères : épinglés tenus par les
passes surveillées MAIS le budget clampe sous l'épingle (`vol-min` : 2 275 · 3 050 · **2 150** m
pour une épingle à 3 800 — suite NON monotone, 0 avertissement → addendum O-54, avec la branche
« rabattu au plancher S non atteignable, 0 avertissement ») · **O-95** : 8 profils courts
reçoivent l'eau libre à 100 % de la spec (test en k0 + positions [0, len−1]) · gate 188/188,
test « je ne sais pas » 28/28, débutants couverts (56). **Deux fautes de mon instrument
publiées** : jugé contre le format DEMANDÉ (la faute T-50 exacte, dans la sonde qui vérifie
B-17) puis « test prescrit, hypothèse 290 m » avalé comme un format. File : correctifs O-84
(a/b/c) à arbitrer avec le lot progression (c possède la forme du pic).

**« V2.1 REÇOIT LA BORNE » livré — la construction cesse de viser ce qu'une protection interdit,
et sur REEL le manque N'EXISTE PLUS** (arbitrage du fondateur, 19/08/2026 — voir `BUGS_OUVERTS.md`
« V2.1 REÇOIT LA BORNE », garde **T-57 réécrite**) : *« construire une cible qu'une protection
interdit d'atteindre est ce qui produit les 3,4 h de manque »*. La sonde V2.1 applique le plafond
de CLIQUET d'épaule (la bande que l'athlète peut GAGNER en livrant, O-89 — pas le départ) aux deux
clones de saturation, excédent retranché à l'allure du clone (règle 14), zéro circularité O-43
(borne dérivée de la continuité DÉCLARÉE, lecture arrière). Sur REEL : **cible 13,0 → 9,7 h ·
manque absent (déclarait 3,4 h/sem, 101,9 h) · structurel 12,4 → 9,4 = pic livré · R20.2 « pic à
9,4 — le nombre de séances (−10,6 h/sem) », secours 13 h intact**. **§2 mesuré, rapporté sans
ajuster** : le plan ne s'aplatit PAS (charges 6,2-9,1 h, amplitude 2,9, `O69-plat` absente), la
rampe mord encore (7,8 → 8,3 → 9,0), semaines assises sur la borne **16 → 4** (la direction du
critère de sortie de l'allocation), répartition nage **42,4 %** (de 45,5) — et **⚠ le max quitte
la dernière semaine de charge** (S40 9,4 → S37 9,1, S40 8,7 ; prouvé par expérience contrôlée,
à peser au lot progression). Rayon golden : **75 profils, tous en tri** (duathlon sans nage,
swimrun sous son plafond). Cliquets ré-épinglés avec cause + attribution un-facteur (borne
neutralisée → tout revient) : S4 357 · S5 504 · T-48 8 704 min / 429 703 m. **T-57 quatre
moitiés, contre-prouvée** (neutralisation → rouge sur V2.1-disparue ET manque-redéclaré) ;
population 90 déclarent / 896 rien, écart max ≥ 2 h/sem (un manque qui lirait le rabattu
s'effondrerait vers son quantum). File : re-vérification B-17 (O-84 en tête) → lot progression →
les deux pièces → l'allocation (~0 semaine assise).

**LE MANQUE DÉCLARÉ livré + O-94 FERMÉ — l'écart se lit sur la CIBLE DE BOUCLE, et la carte ne
promet plus une heure qu'une protection interdit** (ordre du fondateur, 19/08/2026 — voir
`BUGS_OUVERTS.md` « LE MANQUE DÉCLARÉ + O-94 », garde **T-57**) : la cible de boucle est archivée
à la construction (avant le rabattement de `vol_declared`, qui RESTE — la courbe affichée décrit
le plan) et une décision `manque` se pose au gabarit O-87 quand l'écart au pic ≥ 0,5 h/sem :
sur REEL **« pic visé 13 h/sem — livré 9,6 (écart 3,4 h/sem, 101,9 h sur la préparation) »** —
la courbe rabattue disait 0,6. Population : **99/986 déclarent · 887 rien à déclarer** (les deux
branches vivent). **O-94** : la re-sonde écrête la nage du clone saturé à la borne O-85
(excédent converti à l'allure du clone — règle 14) ET le livré borne la correction par en bas
(ma première écriture rendait 9,1 h sous un pic livré à 9,6 — une capacité que le livré réfute) :
**structurel 12,4 → 9,6**, la carte dit « ce qui borne, c'est le nombre de séances (−10,4 h/sem) »
avec le secours 13 h. V2.1 (qui pilote `peakH`) garde sa mesure — l'y appliquer changerait la
construction, décision à part. Sceau : **S5 512 → 496, ré-épinglé avec sa cause** (l'identité
T-25 « min(plafonds) = pic livré » DEVIENT vraie sur 16 profils). **T-57 contre-prouvé deux
fois** (manque branché sur le rabattu → rouge · correction O-94 retirée → rouge). File à venir :
re-vérification B-17 (O-84 en tête) → lot progression (footing repris · sortie longue AVEC
présence · récup) → les deux pièces sur le socle O-85/O-89 → l'allocation, critère de sortie :
~0 semaine assise sur la borne.

**O-89 + O-93 FERMÉS — la borne d'épaule CLIQUETTE sur le LIVRÉ, et l'inversion des décharges
tombe de 4 320 à 0** (arbitrage O89_ET_INVERSION_DECHARGES, 19/08/2026 — voir `BUGS_OUVERTS.md`
« O-89 FERMETURE », « O-93 », « O-91 §3 », « R20.2/REEL », « O-94 », gardes **T-53 réécrit** et
**T-56**, mécanisme `npm run batterie`) : **O-89** — *« une borne de sécurité ne projette pas »* —
le plafond hebdo de nage devient `min(bande suivante, max(départ déclaré, maxLivré × C22))`,
lecture ARRIÈRE comme la rampe C22 ; l'escalier est GAGNÉ (7 600 → 8 347 → 9 172 → 10 079,
marches ≤ +10 % du démontré contre un saut calendaire de +50 % à S8), les récups GÈLENT le
cliquet, semaines assises 27 → 16 ; **le rayon a resserré la tête deux fois en l'écrivant**
(la bande ×8 ne s'ouvre que sous ratio < 1 ET source mesurée — un sprint gagnait +36,6 km, les
continuités inconnues passaient ×6) : 471 profils multi, **1 touché — REEL** (+11 km, nage
44,3 → 45,5 %, publié : direction inverse de la cible d'allocation, à peser au lot allocation).
**O-93** — T-56 écrit ROUGE d'abord (1 724 inversions de discipline + 2 596 de type : VO2 6×4 en
récup vs 5×4 en charge, seuil nage max du plan en récup, les 3 seules vraies sorties vélo toutes
en récup — 4ᵉ inversion de monotonie, axe PHASE), passe `enforceRecupSousCharges` au point fixe
(type puis discipline, adjacence, répétitions d'abord, jamais un épinglé, jamais la fréquence,
cible = égalité voisine) ; **deux interactions fermées avec leur raison** (la récup-référence de
dominance des prépas courtes EXEMPTÉE et comptée — le désastre O-21 rejoué sinon, dev 3,7 h →
1,5 h mesuré ; le plafond A− extrait en fonction et REJOUÉ après la passe) ; le résidu est une
CLASSE : les continues B-17 épinglées en récup sont un TEST annoncé, hors champ et comptées.
**Sur REEL : couverture vélo en récup 225' → 112', sortie longue de récup 85' → 66'.** **Le
diagnostic des 2,7 h demandé mi-lot est au registre** (« R20.2/REEL ») : cible de pic 13,0 h ·
construit 10,8-12,6 · livré 8,0-9,4 — chaque passe aval neutralisée UNE PAR UNE (growth 0 ·
rampe 0 · C22Final 0 · C26c 0 · I14 0 · budget 0 · **O-85 −1,7 h**, le reste interactionnel),
la cible affichée rabattue sur le livré efface la trace, et le « structurel 12,4 » de la carte
IGNORE la borne O-85 (**O-94** ouvert — la sonde sature sans elle) ; le manque réel de REEL au
pic vaut 3,6-5,0 h/sem, queue haute de la mesure d'époque — pas de fuite de volume non nommée.
**O-91 §3 mesuré** : le brick PREND le créneau `durLong` en spec/pic — décision délibérée jamais
écrite, désormais écrite à la branche ; la pièce sortie-longue devra inclure la PRÉSENCE.
**Trois fautes d'instrument publiées** : mes probes « bundle HEAD » écrasées par le bridge de
`goldenMaster` (le rayon comparait la source à elle-même — 0 touché par construction), les
compteurs `_o85`/`_o93` effacés par le second reconcile de `repairLoop`, et le batch au `;` —
fermé par un MÉCANISME, `npm run batterie` (chaque gate son code de sortie, rouge si un seul
l'est). **`audit:v1` 459 à 0 · invariants 22×54 · v6 74 · 0 régression · v7 · r13/r14/r14.1/r18 ·
lotPhysio 29 verts · 23 rouges attendus · 0 régression · T-53/T-56 contre-prouvés (2 cassures,
2 rouges) · golden 990 recapturé (734 empreintes : les récups de tous les sports + la nage
multi) · E2E.**

**RELECTURE COMPLÈTE DU PLAN REEL livrée + O-88 FERMÉ — le compte d'accélérations est borné en
absolu, et la relecture a trouvé ce que personne n'avait nommé** (O88_ET_RELECTURE, 19/08/2026 —
voir `RAPPORT_RELECTURE_REEL.md`, annexes `relecture/REEL-plan.{json,rendu.txt}`, gardes **T-55**,
tickets **O-89 à O-92**) : le plan des 43 semaines lu INTÉGRALEMENT (4 lecteurs par quadrant +
contre-vérification de chaque constat sur le livré — 1 constat d'agent REJETÉ, 2 rectifiés).
**O-88** : « la moitié en accélérations de 50 m » donnait 4 à **81** accélérations selon le bloc
(pire que les 32 du constat) — `O88_NB_ACCELERATIONS = 10` (fourchette 8-12 du fondateur, ordre
de grandeur révocable), texte « en 50 m accéléré / 50 m souple au début du bloc — 10 au plus,
puis aérobie continu », **T-55 contre-prouvée deux fois** (fraction → rouge, constante 60 →
rouge), balayage famille fait (le « dont ~N % plaquettes » swimrun est BORNÉ par repCap 11 —
vérifié ; le reste est O-78). **B-17 sur REEL : 3 paliers annoncés · 3 livrés** (1250 eau libre
en PREMIÈRE semaine de spec → 1550 → 1900), REEL hors des 29 d'O-84. **Ce que la relecture
nomme** : la nage ASSISE sur sa borne O-85 27 semaines sur 43 (et **O-89** : la borne lit une
PROJECTION C22^k qui atteint ×6 dès S8 quand les paliers du même plan posent la première
continue en S25 — deux courbes pour la même grandeur, décision fondateur) ; **O-90** : 6
semaines de charge à 237-252 min de nage SANS un mètre au seuil + les décharges portent des
doses plus grosses que les charges (VO2 6×4 en récup vs 5×4 en charge, seuil nage max 1625 m en
récup) ; **O-91** : la sortie longue CAP s'ARRÊTE en S22 — 20 semaines sans course > 68 min
avant un semi ; **O-92** : 9 semaines de charge sans jour OFF, la REPRISE comprise, et 3 jours
durs consécutifs en pic. Répartition livrée (legs de brick attribués) : **nage 44,3 % · vélo
28,6 % · course 27,1 %** pour une épreuve à ~12/52/36 — l'inversion de la dernière lecture est
intacte. **Trois textes faux corrigés en chemin (famille U9)** : O-88, la note de couverture
vélo qui disait « duathlon » sur le plan de tri du fondateur, la veille de course qui parlait de
CHAUSSURES sur une veille en NATATION (le défaut que R13.4 avait corrigé pour la ZONE, jamais
rejoué sur la NOTE — la chute suit désormais la discipline). **Et les deux exports du fondateur
divergent par UNE réponse** : `history` confirme → plafond 13 h · ancien → 15 h (mesuré au
dixième près sur les deux exports) — c'est le budget de l'allocation, **troisième clé à RELEVER**
avec `longest_swim_m` et `milieu` (§4 du ticket : la fixture reste reconstituée). **Et la batterie complète a trouvé DEUX GATES ROUGES depuis ee40395** (les fermetures O-85/O-87
n'avaient pas rejoué les bancs R14.x ni `golden:verify` — la CI de main était rouge deux
commits, et mon premier batch de vérification l'a masqué une fois de plus : commandes au `;`,
code de sortie du dernier — famille O-9, publié) : l'épingle POPULATION du golden restée à 989
pour 990 profils (montée avec sa raison — le gate faisait exactement son travail), et
**R14.1-G**, attribué par bisection de moteur à O-85 : la borne d'épaule retire au plan
« montée » la nage-déversoir qui absorbait `vol_max`, le livré ne monte plus que de +6 % (contre
+22 %), et la projection qui ne récompense plus un volume non livré est HONNÊTE (P8) — critère
rectifié sur le LIVRÉ, deux branches (livre plus → projette plus · refuse → projection collée),
**prouvé vert par sa branche 1 contre le moteur d'avant O-85 et par sa branche 2 contre
l'actuel**. Leçon : les bancs R14.x lisent le plan livré à travers la projection — tout lot qui
change le livré les concerne. **`audit:v1` 459 à 0, invariants 22×54, v6 74 · 0 régression, v7
budgets tenus, r13/r14/r18 verts, `lotPhysio` 28 verts · 23 rouges attendus · 0 régression,
golden 990 recapturé (203 empreintes : tri = texte O-88, passes datées = veille), golden:verify
990/990 · 0 écart, golden:bundle 990 · 0 écart, E2E 25/25.**

**O-87 FERMÉ — la carte « Pourquoi ce plan » portait deux comptes de séances sans étiquette, sur
la grandeur qui BORNE le plan** (constat du fondateur sur son profil réel, build déployée,
19/08/2026 — voir `BUGS_OUVERTS.md` « O-87 », garde **T-54**) : « 11 séances par semaine »
(bloc BUDGET) contre « une semaine ne contient que 10 séances » (bloc VOLUME MAX). Mesuré :
**11 = le PRESCRIT du raisonnement** (`min(12 déclarées, 13,0 h ÷ 1,2 h/séance)`), **10 = le
maximum LIVRÉ** après le point fixe. La décision `budget` gagne un champ `livre`, posé par le
générateur après le point fixe et alimenté par **le même `nSess`** que le message structurel —
une dérivation pour les deux blocs (R11.1). Affiché : *« 11 séances par semaine prescrites — ta
semaine la plus fournie en livre 10 »*. **§2 confirmé** : le plafond visé après le lot
progression est **13 h** (la contrainte de secours), pas 9,7 — et la validation la plus directe
du lot sera le maillon qui change de NOM à l'écran. **T-54** protège les trois choses que le
fondateur demandait de ne pas casser (maillon chiffré · secours nommé · le message B-17 « peut
construire la distance, pas le milieu » — la seule sortie du produit qui dise ce qu'il ne sait
pas faire) plus la cohérence du nouveau champ (le livré se redérive du plan, famille T-16d) —
**contre-prouvée sur deux cassures, deux rouges**. Golden 990 recapturé (986 empreintes,
décisions seules). **`audit:v1` 459 à 0, invariants 22×54, v6 74 · 0 régression, `lotPhysio`
27 verts · 23 rouges attendus · 0 régression.**

**O-85 FERMÉ — la charge d'ÉPAULE a sa borne, et son multiplicateur suit l'expérience en NAGE**
(arbitrage « O-85 AVANT LE LOT PROGRESSION », 19/08/2026 — voir `BUGS_OUVERTS.md` « O-85 », garde
**T-53**, mesure `npm run mesure:epaule`) : *« ce qui fait le risque n'est pas la distance seule,
c'est le volume × la qualité du geste »*. `volume hebdo de nage ≤ k × distance de course`, `k` lu
sur une grandeur **MESURÉE** (la continuité rapportée à la distance de course), jamais sur un
adjectif — leçon R14.1 ; **plus SERRÉ chez le débutant**, l'inverse du réflexe ; et il **se lève
avec la position** (O-56, même patron que `swimSessionCapAtWeek`) : 7,6 km en semaine 1 → 11,4 au
pic pour 1 000 m déclarés sur un 70.3. **Le domaine est DÉRIVÉ** (`disciplines.length > 1`), pas
une liste de sports — un sprinteur qui prépare un 100 m nage trente fois sa distance, et T-53 §3
le VÉRIFIE au lieu de l'exclure en silence. La passe prend dans les **déversoirs d'abord**, jamais
un bloc épinglé, jamais la sortie longue, jamais sous le plancher — et **jamais la FRÉQUENCE** :
la retirer serait la prédiction du 19/08 commise par la garde censée protéger. **Mesuré** : le
plateau passe de **14,68 à 11,41 km** ; rayon **37 profils, tous en tri**, médiane 0,00 %, et la
plus forte baisse gagne une séance en perdant des mètres. **Sur la fixture de l'athlète réel :
nage 54 % → 35 %, vélo 33 % → 39 %, course 13 % → 25 %** — borner le volume de nage rapproche à
lui seul la répartition de la cible, sans toucher à aucune règle d'allocation. **Une erreur
corrigée en l'écrivant** : plafonner le ratio à la distance de course rendait la bande « nageur de
formation » inatteignable. **§2 : le corpus contenait 989 profils et pas l'utilisateur** — passe
`REEL/tri/70.3/nage-limitante` ajoutée (990), **reconstituée et non relevée, avec son écart
publié** (le dépôt portait DEUX « profils du fondateur » divergents, aucun ne reproduisant ses
chiffres ; l'écart le plus visible est la part de course, 13 % contre 24 %). **`audit:v1` 459 à 0,
invariants 22×54, v6 74 · 0 régression, `lotPhysio` 25 verts · 23 rouges attendus · 0 régression,
golden 990.**

**§3 de « LA RÉPARTITION » mesuré — la charge d'ÉPAULE n'est bornée nulle part, et ce qui
ressemble à une borne est le nombre de créneaux** (`npm run mesure:epaule`, voir `BUGS_OUVERTS.md`
« O-85 ») : sur les 989 profils, 458 nagent, médiane 2,6 km/sem, p99 11,2 km, **0 profil au-dessus
de 12 km** — mais le corpus ne contient PAS la configuration du fondateur (`sessions_max` élevé +
`doubles`), angle mort de couverture A-2. Cherchée par SATURATION plutôt que lue dans une table,
la borne existe à **14,68 km et ne bouge plus de 14 à 30 h déclarées** : ce n'est pas une règle de
charge articulaire, c'est **le nombre de créneaux de nage du schéma (5)**. Les cinq séances de la
semaine saturée pèsent 3 075 · 2 625 · 3 075 · 3 275 · 2 625 m, toutes très au-dessus de
`CAP_SWIM[70.3] = 1 900` (qui ne borne qu'un BLOC de la sortie longue, réfutation O-46) — et
**« Nage récup courte » y vaut 2 625 m**, O-78 exprimé en natation. **La conséquence à ne pas
manquer** : le lot PROGRESSION existe pour lever le plafond structurel, or **la seule chose qui
protège l'épaule aujourd'hui est précisément ce que ce lot a pour objet de retirer.** O-86 ouvert
pour les deux nombres d'interface du §4.

**O-82 FERMÉ — le plancher cède en affûtage, borné au défaut ; une FUITE D'ÉTAT et deux défauts
de mon lot précédent trouvés en chemin** (arbitrage « LE PLANCHER CÈDE EN AFFÛTAGE, ET A3 LE
DISAIT DÉJÀ », 19/08/2026 — voir `BUGS_OUVERTS.md` « O-82 », « O-84 », garde **T-52** promue) :
*« un plancher dont le remède nuit ne doit pas s'appliquer »* — hors affûtage le remède est
d'allonger la séance (bénin), en affûtage c'était **30 min continues à l'allure du jour J** pour
une dose conçue à 2×7-10. `A3` portait déjà la décision, jamais rejouée sur le plancher de
dignité. **Ma première écriture était plus large que le remède** (suspension totale en décharge)
et `audit:v1` est passé à **16 violations DURES** : le plancher fait aussi un travail légitime en
décharge, ce qui nuit est qu'il DÉPASSE un plafond délibérément bas — il cède donc **jusqu'au
plafond, jamais en dessous** (`min(dignité, plafond)`). **269 blocs → 0**, sur 21 950 bornés.
**La fuite d'état est la vraie leçon** : le bloc de dominance D2 tourne APRÈS la boucle de
semaines et rejoue `scaleWeekBody` sur toutes, où le drapeau gardait la valeur de la DERNIÈRE
(l'affûtage) — planchers suspendus partout, `tri/S` semaine 4 (`dev`) **219 → 118 min**, v6 rouge
sur C22 et C30-A. Attribution par **expérience à facteur unique** (retirer le câblage `progCap`
laissait les deux rouges : ce n'était pas lui). Règle 20 sur un troisième objet : *toute passe qui
traverse les semaines APRÈS la boucle repose le drapeau à la semaine qu'elle traite.* **Deux
défauts de mon lot O-81, publiés** : `progCap` n'était **pas consommé** sur la branche C8/C16, donc
la trajectoire du footing était **INERTE** (le 30 → 50 venait de la seule hausse du plafond) ; et
le plancher de semaine de course regonflait les blocs faciles **sans lire leur plafond déclaré**,
seul des trois regonflages à ne pas le faire. **O-53 rejouée sur un troisième site** :
`enforceC22Final` rabotait des blocs ÉPINGLÉS (une continue de 1 550 m ramenée à 1 500, alors que
le plan a annoncé le palier) — rabotages 27 → 25. **O-84 ouvert** : le plan annonce N paliers et
en livre N−1 sur **29 profils tri sur 187, mesuré IDENTIQUE avant et après** — le palier est élu
par une coupe qui ne passe pas par `prioriteFinancement` (5ᵉ mécanisme de la prédiction « la nage
est la victime par défaut ») ; le correctif évident a été écrit, mesuré **INERTE**, et RETIRÉ.
**T-52 promu garde permanente**, critère rectifié : il testait `plancher >= plafond` et rougissait
sur l'état RÉPARÉ — le défaut est le DÉPASSEMENT, pas l'égalité. **`audit:v1` 459 à 0, invariants
22×54, v6 74 verts · 0 régression, `lotPhysio` 25 verts · 23 rouges attendus · 0 régression,
golden 989 recapturé (231 empreintes).**

**O-81 FERMÉ — le plafond du footing monte, le plancher ne cède pas ; et l'invariant demandé a
trouvé DEUX familles de plus** (arbitrage « LE PLAFOND MONTE, LE PLANCHER NE CÈDE PAS »,
19/08/2026 — voir `BUGS_OUVERTS.md` « O-81 », « O-82 », « O-83 », garde **T-52** au banc
`lotPhysio`) : sur un 70.3 le footing déclarait `22 × 1,3 = 29` min face au plancher de dignité
de 30 — `blockBounds` tranchait par `Math.max` **en silence**, et le type valait exactement
30 min sur tout le plan, pour tout athlète. **Issue (a)** : le plafond monte à la sortie facile
de référence (`O81_FOOTING_CIBLE_PIC_MIN = 50`), le plancher ne bouge pas — *« baisser le
plancher ABAISSE le plafond structurel, le lever le MONTE »*. **La pièce n'est pas uniforme** :
la condition est DÉRIVÉE (le plafond du format dégage-t-il ?), jamais une liste de formats — S et
Full, où le footing est LIBRE et absorbe (receveur R4.1), ne sont pas touchés, la mesure de la
veille ayant chiffré à **−28 % sur tout un plan `tri/S`** ce que coûte de les borner. Mesuré :
footing **1 valeur / 75 occurrences → 16 valeurs, 30 → 50 min** ; **70 profils bougent, tous en
tri, tous vers le HAUT**, 76 pics qui montent, 0 baisse. **T-52** (« aucun plafond de type n'est
inférieur à son plancher », non indexé sur le format, lisant `plancherDeDignite` — point unique
extrait, R11.1) a fermé la famille footing (1 931 → 0) et **en a trouvé deux autres, en
AFFÛTAGE** : **269 blocs livrés jusqu'à ×3,8 leur plafond déclaré** — un brick de rappel à 30 min
pour un plafond C21c de 16, et `Rappel allure course CAP` à **30 min continues à l'allure du jour
J** pour une dose conçue de 2×7-10. **Elles RÉFUTENT la direction générale du §2** (« c'est le
plafond qui a tort ») : en affûtage le plafond EST une règle de sécurité, c'est le plancher qui
doit céder — et cette décision existe déjà sous le nom **A3**, jamais rejouée sur le plancher de
dignité (O-82, arbitrage en attente). Les deux cliquets sont ré-épinglés avec leur cause
**attribuée par expérience contrôlée** : S4 349 → 357 vient d'O-82 et non du footing (**0 des 357**
violations I14 le concernent), S5 504 → 513 parce qu'**aucun maillon de la chaîne R20.2 ne déclare
un plafond de TYPE** (moitié ouverte d'O-35). Et le §5 du fondateur devient **O-83** : **92 profils
sur 985, tous en natation débutant, livrent 2 à 5 séances de 15 min pour 10 h déclarées** — chaque
règle de la chaîne est défendable seule, leur composition rend un plan qui n'entraîne personne.
**Ton profil répond au §4 : max en S38, la dernière semaine de charge, en phase de pic** — dans
les 72 %, pas dans les 28 % ; la seule semaine de pic sous ta semaine 1 est une RÉCUP (R18.5).
**`audit:v1` 459 à 0, invariants 22×54, v6 74 verts · 0 régression, `lotPhysio` 25 verts ·
23 rouges attendus · 0 régression, golden 989 recapturé (187 empreintes = la population tri).**

**LOT 1 (redécoupe O-43) écrit en trois temps, mesuré, et ARRÊTÉ par la règle d'arrêt — la
tarification réelle FINANÇAIT le manque structurel** (file « O-43 ET LA SUITE », 19/08/2026 —
voir `BUGS_OUVERTS.md` « O-43 §6 », diff complet conservé dans `o43-redecoupe.patch`, moteur
RETIRÉ, `src/` byte-identique) : la forme complète (monnaie de COMPTE — blocs en distance au
repère déclaré — dans les sondes, les cibles, les cliquets, les DOUZE électeurs et
`reconcileDeclaredVolume`) rend la contre-preuve verte pour sa moitié capacité : sous
re-tarification de `sw.easy` +16 %, **tous les maillons R20.2 immobiles, jours 5→5, 9 semaines
sur 12 identiques au mètre près** — seul le descripteur d'heures réelles suit le prix, et c'est
correct. Mais chaque incrément a trouvé un mur : la semaine 1 débutant **sous-livre sa cible de
15 % par construction** (les caps de séance en mètres ne tiennent pas la courbe en unités de
compte) et le cliquet de croissance aplatit tout ; la dominance trouve un pic structurellement
SOUS ses semaines de dev (O-72/O-74) et rabote le plan à 2 séances de 15 min ; et `audit:v1`
passe à **6 violations DURES** quand D4 tient « récup ≤ charge » en compte pendant que
l'auditeur la vérifie en réel (O-36 mot pour mot). Rayon : médiane 0,0 %, 9 profils s'effondrent
(−24 à −54 %, tous swim/débutant), 4 se réparent (+39 à +108 % — `demifond/ancien/debutant`
livre AUJOURD'HUI 2,4 séances de 15 min : la cascade existe avant le lot, la tarification décide
qui tombe dedans). **L'ordre de la file s'inverse : le lot PROGRESSION (plafond structurel, pic
dominant) vient AVANT la redécoupe.** Trouvé en chemin : `raised.sort` est un 12ᵉ électeur hors
du point unique T-46. Cadrage §5bis acquis (la circularité est propre à la nage — mesuré,
`npm run mesure:circularite`). **Gates verts sur le moteur rétabli, `audit:v1` 459 à 0.**

**Pièce « trajectoire du footing » (lot PROGRESSION) écrite, mesurée, RETIRÉE le même jour —
et le pincement O-81 nommé** (voir `BUGS_OUVERTS.md` « O-81 ») : la géométrie du brick posée sur
la borne du footing est INERTE là où le type est réellement figé (M/70.3 : `ftCaps.hi × 1,3` =
34 et 29, au ras ou SOUS le plancher de dignité de 30 min — plancher ≥ plafond, contradiction
statique, le type vaut 30 min sur tout le plan) et NOCIVE là où il ne l'est pas (S/Full : le
footing progressait déjà avec la courbe, sa liberté est l'élasticité de la semaine — la borner
donne −28 % sur tout le plan tri/S via le cliquet de croissance). Cinquième occurrence de la
leçon O-78. Le levier du footing est la résolution du pincement — décision de VALEURS,
fondateur. Acquis pour la suite du lot : la pente d'une trajectoire de borne respecte C22
semaine par semaine (la position par PHASE saute aux frontières), et une semaine de DÉCHARGE
garde le plafond de départ. Moteur byte-identique, v6 74 verts · 0 régression.

**LOT INTERFACE livré — trois défauts d'usage, et l'hypothèse du premier était fausse** (document
« LOT INTERFACE », 19/08/2026 — voir `BUGS_OUVERTS.md` « LOT INTERFACE », gardes `§1quater` de
`smoke-zenna` et le bloc O-59 de `smoke-questionnaires`) : **O-60** — le détail de séance
« absent en natation » : l'hypothèse du ticket (« le rendu teste `durationMin` ») MESURÉE AVANT
D'ÉCRIRE et **réfutée** (0 det vide). Le mécanisme est la POSITION : sur un jour multi-séances, le
héros affiche « puis X » à la place du déroulé de la 1re, et la carte sautait `actives[0]` — le
déroulé de la première séance n'existait NULLE PART, et sous doubles la première est la NAGE
66/66. La carte porte désormais le déroulé de toutes les séances. **O-61** — la barre de zones
porte libellés et grandeurs lus sur le BLOC (« Éch 300m │ Aéro 1975m │ RC 200m ») ; les cinq mots
sont la légende de l'axe `ZONE_LEVEL` déjà affiché, pas une table parallèle ; un segment étroit
tronque, le déroulé vit dessous. **O-59** — la cause du constat était `e.step = S.step` dans
`state.js` : l'INDICE persisté et restauré contre une liste que chaque déploiement recompose.
`S.stepId` est enregistré au rendu, persisté, et la position se résout par IDENTITÉ (rendu et
clic) ; l'indice n'est qu'un repli. Contre-preuve du mécanisme : indice corrompu (+3), identité
intacte → l'écran suit l'identité ; sans le correctif, il atterrit trois écrans plus loin.
**Pièce 4** — balayage moteur→affiché : une seule instance, `_blkMin` (2 min/100 m pour tout
athlète) ; sémantique de `st._min` mesurée (2 088/2 088 = total du bloc, récup comprise) puis
branchée — la barre de zones d'une nage était fausse en proportions pour tout CSS ≠ 2:00.
**Quatre fautes d'instrument publiées**, dont deux fois la même : une valeur déclarée par un canal
qui ne la lit pas (`sessions_max` en saisie alors que c'est une OPTION → « 3 » pris en silence ;
puis `vol_max`/`vol_recent`, aussi des options → plan minuscule sans jour double). À chaque fois
c'est le TÉMOIN qui l'a dit. Moteur INTACT (`src/` byte-identique, golden 0 écart).

**O-43 §5 + O-79 — l'issue 1 écrite puis RETIRÉE, et une séance qui mentait sur son intensité**
(arbitrage « O-43 EST SUR LE CHEMIN CRITIQUE », 19/08/2026 — voir `BUGS_OUVERTS.md` « O-43 §5 »
et « O-79 », mesures `npm run mesure:manque`) : le §4 d'O-43 avait retenu l'issue 1 comme la seule
à survivre au filtre. **Écrite, elle atteint la moitié visée et casse l'autre.** `stepWorkMin`
gagne un drapeau `auRepere` (la même formule, ratio de zone neutralisé) et la sonde V2.1 pèse la
semaine au repère mesuré de l'athlète : le maillon `courbe` cesse de bouger sous re-tarification
— **la sonde est découplée**. Mais le sceau `S4` passe de **349 à 372** (+23 violations d'I14) sur
**579 profils**, parce que `sw.easy` vaut 0,893 × CSS : au repère, un bloc facile pèse MOINS de
minutes qu'il n'en prendra, la sonde sous-estime, la promesse descend, les plans tombent sur leurs
planchers. **Faute d'unité commise dans le correctif d'une faute de circularité.** Retiré, `src/`
byte-identique. Ce qu'on en apprend est écrit : ce n'est pas la MESURE de la sonde qu'il faut
rendre invariante mais la GRANDEUR qu'elle borne — la nage doit entrer par ses MÈTRES, le plafond
en heures venant des déclarations. **§2 mesuré et il confirme la prédiction du fondateur** :
**58 % des plans** laissent plus de 0,5 h non plaçable (38 % plus d'1 h, 14 % plus de 3 h ; méd
0,6 h, p90 4,2 h, **max 36,6 h**) — c'est la majorité, donc le manque se déclare **une fois par
plan avec son ampleur totale**, jamais par semaine. **O-79** : « Nage vitesse » a un corps en
`sw.aero`, une zone que le moteur classe FACILE — le nom annonçait une intensité absente et il a
trompé le fondateur dans son propre compte (46 % de facile lu par les noms, **78 %** lu par les
zones). Renommée « Nage aérobie + accélérations » ; contenu inchangé, mesuré : 129 profils,
9 516 champs, **plus grand écart numérique 0**. **31 gates verts, golden 989 recapturé.**

**O-78 mesuré, moteur INCHANGÉ — le puits ne cache pas un excès, il cache un manque**
(arbitrage « UN PUITS NON BORNÉ CACHE CE QU'IL ABSORBE », 19/08/2026 — voir `BUGS_OUVERTS.md`
« O-78 », instrument `npm run mesure:puits`) : le §1 posait trois issues et en retenait une —
déclarer le manque. **La mesure valide l'analyse et en durcit la conclusion.** `blockBounds` rend
`cap: 9999` pour tout bloc de corps sans `bnd` hors brick et hors `long` : **17 types de séance
tri l'atteignent, sur 38 % des séances**, dont « Nage vitesse » à **4 025 m sur un SPRINT** (course
de 750 m), soit ×3,8 le plafond de la nage principale du format. La porte d'entrée est une faute
d'unité : `PT(lo,hi)` multiplie par `sessionScale` — un facteur de TAILLE — un NOMBRE DE
RÉPÉTITIONS, donc **37 % des blocs de qualité naissent à `reps = 1`** (course 55 %, vélo 72 %),
sortent de `repCap` qui ne vit que dans la branche `reps > 1`, et croissent en durée sans borne
(19 → 67 min mesuré). **Trois correctifs essayés, trois déplacements** : borner la nage envoie la
queue sur le sweetspot (96 → 144 min), geler la durée des blocs mono-répétition la renvoie sur la
nage (144 → 206), et tout borner fait tomber le brick **SOUS son plancher audité** — `audit:v1`
0 → **18 violations DURES**, direction vérifiée (116 min pour un plancher à 150, 0 dépassement).
Le puits dissimulait donc que **le plan ne peut pas placer son volume dans ses bornes de séance**.
**Une prémisse à moi corrigée et publiée** : `sw.aero` n'est pas une zone de QUALITÉ pour le
moteur — « Nage vitesse » est classée facile, et le déversement y est conforme à R4.1 ; le défaut
est qu'une séance NOMMÉE « vitesse » sert de déversoir (famille T-40, sur l'intensité).
**Rien n'est livré côté moteur** (`src/` byte-identique) : les bornes transforment un manque
silencieux en violations d'un plancher de SÉCURITÉ, ce qui est plus grave que le défaut. Et la
moitié « déclarer le manque » est **bloquée par O-43** — mesuré, la cible déclarée SUIT le livré
(23 164 → 22 447 h quand on borne), donc le maillon lirait ≈ 0 par construction. L'ordre juste
s'inverse : **O-43 d'abord, le plafond structurel ensuite, les bornes après, les pièces en
dernier.** **31 gates verts, `audit:v1` 459 à 0 violation dure, golden 989 inchangé.**

**T-16d livré — le descripteur décrivait un autre plan que celui qu'il accompagne** (arbitrage
« T-16c — MESURER LE RAYON AVANT DE L'APPELER UN CHANTIER », 19/08/2026 — voir `BUGS_OUVERTS.md`
« T-16d », garde `T-50` au banc `lotPhysio`) : le fondateur posait la question qui décide — *« qui
lit la bande d'allure entre sa position et le point fixe ? personne → c'est un déplacement ; un ou
deux sites → le chantier est là »*. **La mesure a renversé la prémisse** : la bande a DEUX familles
de lecteurs, et une seule est un descripteur. `zoneClass` la lit pour classer `rn.mara` en
dur/modéré — donc C26c, C26d et la part de facile en dépendent, et elle doit être connue PENDANT la
construction ; `zoneOf` l'écrit dans le texte, et celle-là doit décrire l'état FINAL. Une seule
source (`raceRunBand`), évaluée aux deux instants où sa réponse est la bonne pour son usage.
**Deux défauts vivants depuis B-22, tous deux invisibles à la relecture.** (1) `generateAudited`
reconstruit ses `refs` sous un commentaire qui énonce la règle POUR LES DEUX substitutions — il ne
portait que `bikeRp`. Chaque re-rendu de la boucle de réparation retombait donc sur `ZDEF["rn.mara"]`,
la table statique que B-22 existe pour remplacer : sur un `tri/M`, **4 séances sur 5** affichaient
`4'35-4'48/km` là où la bande de l'athlète vaut `4'09-4'20`. (2) La bande PRESCRITE et le leg PRÉDIT
lisaient deux STATISTIQUES du même volume sur deux POPULATIONS de semaines — moyenne de toutes les
semaines (**1,26 h**) contre médiane des semaines de charge dev/spec/peak (**1,62 h**) — au point
d'être DISJOINTS sur le format M (prescrit 275-288 s/km, prédit 247-262). `src/engine/planVolume.ts`
porte désormais la seule définition, importée par le pont ET par la boucle (R11.1).
La garde porte sur la CLASSE : **ce qui est affiché se redérive du plan LIVRÉ**, 187 profils tri et
1 812 séances. Le correctif le moins coûteux qui la ferait passer EST la propriété (règle 19), et
une constante gelée ne la satisfait pas. **Deux fautes d'instrument à moi, publiées** : ma sonde de
type a d'abord rendu « 0 profil bouge · ✓ » — un ZÉRO SATURÉ, elle lisait `p.k` quand le champ
s'appelle `key` ; et `T-50` lisait `a.format`, le format DEMANDÉ, alors que B-17 rabat un Full sur
un 70.3 — 79 affichages déclarés faux quand c'était la sonde qui jugeait le plan livré contre
l'intention de l'athlète, exactement la faute que le critère mesure.
**Portée : 160 profils du golden, 1 690 feuilles, TOUTES des chaînes `.det`** — vérifié par une
sonde qui énumère les feuilles PAR TYPE (l'agrégat « plus grand écart numérique 0 » ne voit pas un
nombre devenu chaîne). Les cliquets du sceau et la composition du pic sont inchangés : un
descripteur ne modifie pas le plan qu'il décrit, mesuré et non supposé.
**Les pièces du lot vélo restent NON LIVRÉES, et leur cause descend d'un cran** : T-16c passe bien
au vert avec elles, mais `R14.1-G` rougit — la sensibilité de la projection au volume demandé tombe
de **×1,13 à ×1,05** (attribution prouvée par retrait du seul facteur, témoin immobile à 12,1 %).
La cause n'est pas dans les pièces : **« Nage vitesse » est le DÉVERSOIR du plan tri et n'a aucune
borne haute** — jusqu'à **210 min** de nage VITESSE, et les pièces routent plus de volume à travers
lui (séances > 90 min : 1,9 % → 5,1 %). Troisième occurrence de la famille fermée par R13 (footing
tri, 213 min) et R20.3 (footing swimrun, O-8) : *une réallocation a besoin d'un puits BORNÉ*. C'est
le lot suivant, et il vient avant les pièces. **Trouvé en chemin, préexistant : O-77** — la sortie
longue RÉTRÉCIT quand `vol_max` augmente (82 → 62 min de 9 à 13 h/sem), troisième inversion de
monotonie du dépôt après `I13` (niveau) et `O-21` (allure), sur un troisième axe.
**31 gates verts, golden 989 recapturé (160 profils, texte seul), `audit:v1` 459 à 0 violation
dure, `lotPhysio` 25 verts · 0 régression.**

**O-42 livré — il y avait QUATRE conversions mètres ↔ minutes pour une seule grandeur, et aucune
n'était celle que l'athlète lit** (arbitrage `O42_AUTORITE_DEFINITION_ZONE`, 15/08/2026 — voir
`BUGS_OUVERTS.md` « O-42 », mesures `npm run mesure:o42` et `npm run ventile:o42`) : `stepMin`
comptait chaque mètre de nage comme nagé au CSS — un bloc facile n'est pas nagé au CSS, c'est un
fait, pas une convention. Le contrôle que le fondateur a demandé de passer EN PREMIER a confirmé
sa suspicion et l'a élargie : `weekDistances` portait sa propre table, divergente de `ZDEF` sur
**8 zones sur 9** (`sw.easy` 0,80 contre 0,893 — 10,4 %), et la recherche récursive du producteur
(règle 16) en a trouvé une quatrième, dans l'AUDITEUR, **écrite deux fois à quinze lignes
d'écart**. L'autorité n'est aucune table : c'est la définition de zone, celle qui produit les
allures affichées. `zoneSpeedRatio` est la seule dérivation (R11.1) ; les deux tables
disparaissent. **Le choix de bande a été mesuré avant d'être fait** — la nage porte `lo === hi`
(exact), la course des bandes ; sur 4 259 blocs prescrits en mètres, 108 (2,5 %) sont concernés et
l'écart borne rapide ↔ borne lente vaut **0,2 % du total contre 7,9 % pour la correction** : on
prend le CENTRE (`longRunSpecificity` prend `lo` parce qu'elle calcule un PLANCHER ; ceci est une
COMPTABILITÉ, qui prend la valeur attendue), la borne prudente coûtant +0,1 %, chiffrée pour que
la décision reste révocable sans re-mesure.
**Deux gardes existantes ont trouvé ce que l'inventaire n'avait pas.** `A3` (banc v6, « jour
rouge : jamais plus de minutes qu'avant ajustement ») a débusqué un **cinquième site** —
`enduranceReplacement` dérivait ses mètres du CSS brut, donc la séance de remplacement durait
**25 min pour 23 allouées**, sur le jour ROUGE, là où l'invariant existe. `ANX-C22` (banc R13) a
débusqué un défaut ANTÉRIEUR et plus large : `enforceC22Final` n'avait que deux branches, `reps`
et `durationMin` — **un bloc en mètres à `reps === 1` ne tombait dans aucune**, et la boucle
sortait par « les planchers bloquent », un fail-open de la forme exacte de C24/C24b. La nage
prescrivant 89 % de ses blocs en mètres, c'est la moitié de l'objet du clamp qui lui manquait ;
`audit:v1` passe de **22 à 18** combinaisons au-dessus de +10 %.
**L'acceptation n'est PAS « 0 écart » et ne pouvait pas l'être** : identité durée = distance ×
allure de zone **4 248 / 4 248 blocs**, ampleur par zone égale au ratio de la zone au dixième de
point près (`sw.easy` +12,0 %, `sw.speed` **−6,0 %** — la seule zone en mètres plus rapide que le
CSS), 0 changement de structure, et **54 semaines sur 2 682 (2,0 %)** qui s'éloignent de plus de
6 min de leur cible — 50 parce que la cible DÉCLARÉE monte plus vite que le livré (famille
T-25/O-35), 4 parce qu'un plafond **qui se nomme** apparaît dans le plan. **Quatre fautes
d'instrument dans le script qui devait juger le lot, toutes publiées** : un verdict « VENTILÉ »
rendu sur une table VIDE (`intOf` n'est pas exposée sur `EBV2` — taux saturé 0/0), une colonne
« ampleur » qui sommait la récup, une classification qui nommait « un plafond mord » et mesurait
« le pic a baissé », et une tolérance en POURCENTAGE quand le pas du point fixe est ABSOLU —
faute d'unité (règle 14) dans le juge du ticket qui corrige une faute d'unité.
Et la règle 17 a servi : `registry:check` a fait basculer **quatre** blocs en « ne reproduit
plus », **quatre faux positifs** (un refactor, une police supprimée, deux valeurs devenues
périmées) — réécrits sur la PROPRIÉTÉ au lieu d'une valeur ou d'un chemin.
**28 gates verts, golden 949 recapturé (560 profils), `audit:v1` 459 à 0 violation dure.**

**O-35 (2ᵉ moitié) + B-09 + la mesure de B-02 livrés — le DIAGNOSTIC de volume vivait avant le
point fixe, et 350 profils annonçaient un pic qu'ils ne livrent pas** (arbitrages `sw.aero` et
`B02_DEBLOQUE_APRES_B02A`, 14/08/2026 — voir `RAPPORT_O35B_B09.md` et
`RAPPORT_B02_PONDERATION.md`) : la re-sonde demandée est écrite (clone SATURÉ de la semaine
LIVRÉE — mesurer les minutes livrées rendrait l'identité vraie par construction ; une passe,
résolution B-25) et corrige ce qu'elle visait (plafond structurel 2,03 → **0,85 h** chez le
nageur débutant), mais T-25 est MONTÉ et l'instrumentation a désigné plus gros :
**`reconcileDeclaredVolume` tourne à la ligne 3322, le bloc « C6 + R20.2 » était à 2998** — le
pic annoncé et toute la chaîne décrivaient l'avant-dernier état, avant I14, C26c/d, I14b, C30b,
planchers et fréquence. Onze fois ce dépôt a payé cette leçon sur des GARANTIES ; ici c'était le
DIAGNOSTIC. Déplacé après le point fixe, `volPeak` recompté sur les séances livrées : **350
profils sur 945 (37 %) annonçaient plus qu'ils ne livrent — 350 baisses, 0 hausse, médiane
7,1 %, pire cas 4,9 h annoncées pour 3,4 (−30,6 %)**, toujours vers le haut, sur le chiffre que
l'athlète lit comme « son pic » quand V2.1 déclare que promettre davantage serait mentir.
**B-09** : facteur indexé sur l'historique (`swimTimeFactorOf`, reprise 0,45 · confirme 0,60 ·
ancien 0,70, repli sur la valeur la plus prudente) — presque inerte sur le golden (42 profils,
±6 %, famille A-2 : tous à `vol_max: 10`), **+42 % de pic entre reprise et ancien** là où la
déclaration mord (3 h/sem). **L'activation pour `tri` est REFUSÉE, chiffrée** : `vol_max` y
couvre les TROIS disciplines, le guard amputerait un Ironman de **17 266 à 7 881 min (−54 %)**,
vélo et course compris. **B-02** : la pondération ×1/×0,75/×0,5 **échoue les deux critères
maintenus** (118/945 = 12,5 % contre < 10 % · 69,5 % contre ≥ 70 %) — rien écrit ; le seul jeu
recevable (×0,4/×0,25) est celui qui ressemble le plus au drapeau binaire qu'il devait remplacer,
et les deux variantes touchent des populations DIFFÉRENTES (le drapeau punit 34 duathlons pour
leur intensité vélo, la pondération n'en touche aucun et prend 22-38 triathlons). **T-25 monte à
608 et c'est le taux exploitable** — rendre un membre de l'identité exact élargit l'écart avec
une énumération encore périmée ; la cause restante est nommée (ce que le point fixe RETIRE n'est
déclaré par aucun maillon). `sessionScale` porte sa condition de sortie, T-23 est rectifié (34 %
est le taux honnête, 10 % était le mensonge), et `smoke-questionnaires` cesse de MOURIR sur une
course de navigation.
**28 gates verts, E2E 25/25, `audit:v1` 459, invariants 22×54, v6 73 verts, golden 949 recapturé.**

**R20.2 (2ᵉ correction) + O-35 livrés — « ce qui borne » devient l'argmin d'un min(), et deux
fautes d'unité se compensaient en natation** (DOC_UNIQUE + arbitrage `sw.aero`, 14/08/2026, voir
`RAPPORT_DOC_UNIQUE.md`, banc `scripts/lotPhysio.mjs`) : le message de volume prenait **la plus
grosse baisse** sous un texte qui promet « ce qui borne » — la contrainte FINALE —, et
l'attribution dépendait de l'**ordre des appels** (permuter caps/util changeait le coupable sur
le même plan). Cause racine : des plafonds **parallèles** traités en chaîne séquentielle. Ils
deviennent un `min()` dont l'argmin parle, les autres contribuant zéro ; les facteurs restent un
produit ; le message gagne la ligne levier (« Si tu levais cette contrainte, X te plafonnerait à
Y ») et le plan émet le record `_r202`. **T-25/T-26/T-23 écrits ROUGES d'abord** (945 · 583 ·
22/218) ; T-26 fermé le jour même. **T-25 a trouvé deux maillons absents de l'énumération** — la
COURBE déclarée (run/5k : Lw 0,67 au pic, « ton historique » 4 h annoncé pour un pic à 2,6) et la
croissance D3/D4 sur le livré, mesurée à l'écrêtage.
**O-35** : `peakH` (qui pilote la courbe) n'était **jamais** converti en heures d'eau quand
`volPeak` (la promesse) l'était — rapport **2,50 = 1/0,4 au chiffre près**, et l'unité changeait
avec le NIVEAU (C20 rabote `peakH` avec 25 min/séance). La sonde V2.1 rattrapait tout **par
accident** : elle mordait donc toujours en nage et servait de convertisseur d'unité. **Trois
modèles mesurés avant d'en adopter un** — convertir `peakH` (la correction symétrique) fait
tomber **92 profils jusqu'à −55 %**, soit 3 séances de 15 min : REFUSÉ ; convertir la seule
DÉCLARATION (`SWIM_TIME_FACTOR` code « 60 % du temps de BASSIN n'est pas de la nage », les tables
sont du volume d'entraînement comme les lignes course et vélo) laisse **47 profils au plan
intact sur 88** et aligne la promesse sur le plan livré depuis toujours : ADOPTÉ. `swimTime`
quitte les FACTEURS de la chaîne — une conversion ne retire rien. **`sessionScale` reste NON
converti, réfuté par `audit:v1`** : la conversion y produit un saut > +25 % de volume entre
semaines de charge (violation dure du manifeste — les séances tombent toutes sur leurs planchers
C24/C24b et la progression devient un escalier). Priorité 2 contre cohérence d'unité, la sécurité
gagne, l'écart est nommé. **T-25 439 → 368 ; T-23 EMPIRE en taux (10 % → 34 %) et c'est publié** :
le correctif retire une compensation qui masquait la seconde moitié du défaut — la sonde mesure
un clone SATURÉ quand le plan rend des séances discrètes (O-35, reste ouvert).
Au passage : **B-02a fermé sur sa propre mesure** (`sw.css`/`bk.thr`/`rn.thr` tous `hard`, et
8 séances sur 8 comptent du dur en pratique) ; **V-08 réfuté** — comparer un rapport d'ALLURE à un
rapport de PUISSANCE est une faute d'unité, `sw.aero` vaut **84 %** de l'effort seuil (P ∝ v³) et
le reclasser aurait fait déborder 411 semaines sur C26d ; **règle 14** écrite. **T-21** (28
littéraux à unité dans les gabarits) et **T-22** (14 steps sans zone dans une séance qui nomme une
allure — le périmètre B-26 s'élargit aux bricks TRI) écrits rouges. **§6.3** : les rouges attendus
sont une liste nommée en cliquet. **Z-11 étendu aux trois espaces de noms** — il a trouvé une
troisième collision en naissant (`#9b72ff` : brick = charge récup = violet) ; `--zn-fatigue`/
`--zn-form` retirés (morts depuis B1).
**28 gates verts, E2E 25/25, `audit:v1` 459, invariants 22×54, golden 949 recapturé — 88 profils,
tous en natation.**

**V5 livré — les accents de discipline passent à la maquette, et l'orange porte désormais TROIS
sens** (brief du fondateur, 12/08/2026, conditionné à une mesure : *« SI TOUT PASSE 3:1 »*) : les
trois accents (`DISC[*].ac`) sont alignés sur la maquette — natation `#00b8d9 → #3b9eff`, vélo
`#2e6bff → #ff3d00`, course `#ff7a1a → #ffd23d`. **La condition a été mesurée AVANT d'écrire une
ligne**, en tuile pleine sur `--zn-surface-3` comme V3 l'a décidé : **5,52 · 4,34 · 10,67** contre
les 3:1 de WCAG 1.4.11 — les trois passent, marges +2,52 / +1,34 / +7,67, donc les trois sont
adoptés et la branche « ne remplace pas ce qui échoue » n'a pas d'objet.
**L'avertissement du fondateur était fondé, et la collision est plus large que ce qu'il visait** :
`#ff3d00` ne porte pas deux sens mais **trois** sur la même grille — l'orange de MARQUE (anneau
« aujourd'hui », héros 🎯, onglet actif, CTA), la charge DURE (`CHARGE.dur.rgb` vaut `255 61 0`,
à 34 % d'opacité) et maintenant la discipline VÉLO, à pleine saturation comme le premier. Mesuré
plutôt qu'estimé : sur 🗓 Plan, **2 éléments** portent l'orange au sens « attention » contre
**24 badges vélo** de la teinte identique ; sur 📅 Semaine, **2 jours sur 7** (mardi, jeudi) voient
l'anneau du jour entourer une carte dont le badge est exactement de sa couleur ; sur 🎯 Aujourd'hui
un jour de vélo — le cas que le fondateur avait lui-même nommé —, le héros part de `#ff3d00` et le
badge vélo est **79 px sous lui**, à la même valeur. **Non corrigé délibérément** : les trois
issues touchent au VOCABULAIRE de la marque, pas à un défaut (`zenna-tabs.css` écrit que l'orange
EST le vocabulaire d'attention et qu'on n'en invente pas un second ; `--zn-gold` veut déjà dire
« échange en attente » ; décaler le vélo inventerait une couleur absente de la maquette).
Enregistré en **O-31** avec ses chiffres et son bloc `verify`.
**Deux de mes sondes mesuraient un écran qui ne montrait pas la chose.** La première rendait
« 0 collision » — le 12/08 tombe sur une séance de COURSE ; balayée sur les sept jours, la
collision existe 2 jours sur 7 (famille R20.7, une dimension que la mesure ne contrôle pas et qui
décide de son verdict). La seconde rendait « 0 badge, 0 orange » sur 🎯 Aujourd'hui pour DEUX
raisons cumulées : elle cherchait `.gd-ic`, classe que le badge du héros ne porte pas (c'est un
`<div>` inline de `session-life.js` — **un second peintre de badge que j'avais manqué**), et elle
mesurait un écran GATÉ par le portillon du check-in. C'est en la corrigeant que le cas nommé par
le fondateur est apparu.
**Deux commentaires devenus FAUX sont réécrits plutôt que laissés** : `icons.js` affirmait que les
accents étaient « repris de `SPORTS[*].accent`, pas une troisième palette » et `plan-view.js` que
le badge venait « du même endroit que l'avatar et les cartes de sport ». `config.js` garde les
anciennes valeurs — c'est un AUTRE axe (le sport préparé, pas la discipline d'une séance) que le
fondateur n'a pas arbitré. Mesuré : les deux axes ne se rencontrent sur **aucun** écran.
**Et `--acc` ne porte plus aucune couleur de sport dans l'app** : mesuré sur les trois sports,
`body[data-sport="bike"]{--acc:#2e6bff}` rend `#ff3d00`, parce que `zenna-today.css` redéfinit
`--acc` sous `body.theme-zenna`, qui est toujours posée. Ces règles de `styles.css` sont mortes en
app et ne survivent que pour le thème papier — la cascade mesurée, pas déduite (leçon R18.1).
`avatar-tri.js` garde sa copie littérale **par contrainte de CI** : le module est PUR (zéro
import) pour que `demo:avatartri` exécute sa passe exhaustive en node.
**`check:sw` a fait son travail** : les nouvelles couleurs n'auraient atteint aucun navigateur
ayant déjà ouvert l'app (O-24) — `sw.js` reconstruit, VERSION `eb-pwa-36dbde7c4996`.
Garde : `smoke-carte-seance` **§6**, 19 → **23 assertions** — l'accent DESCEND de la table
(témoin : changer `DISC.bk.ac` à chaud repeint la tuile, sinon la peinture vient d'ailleurs) et
les cinq accents sont deux à deux distincts (critère dérivé de la table, aucune liste à tenir).
**Deux cassures, deux rouges.**
**28 gates verts, E2E 23/23, `audit:v1` 459 et golden 949 inchangés — `src/`, `engine.js` et le
monolithe byte-identiques.**

**R27 livré — le badge-anneau, et la décision de l'adopter avait été prise sur un rendu CASSÉ**
(brief du fondateur, 12/08/2026 — garde `smoke-ring.mjs`, **24ᵉ suite E2E**) : `avatarRingSVG` +
`avatarGlobalScore` remplacent le rendu PERSONNAGE sur 📋 Profil. Trois anneaux concentriques (un
par discipline), l'extérieur **toujours** celui de la discipline meneuse — décidée par
`meneuseDe()`, la fonction que `avatarTriAccent` emploie déjà (R11.1), jamais un ordre fixe —,
plus un anneau fin de score global. **Le moteur de données n'a pas bougé d'une ligne** et
`demo:avatartri` passe sans modification, comme le brief l'exigeait.
**La prémisse du brief était vraie, et pire que ce qu'elle disait** : `avatar-tri.js` émettait
**44** attributs `stroke=BLANC` / `fill=VERRE` — la variable non concaténée, donc le TEXTE
« BLANC » posé comme valeur de couleur. Mesuré au rendu : `fill=BLANC` rend **NOIR** (valeur
initiale de `fill`) et `stroke=BLANC` rend **`none`** — le trait DISPARAÎT ; **6,4 attributs
invalides par avatar**. Corrigé (le brief le demandait dès lors que la carte de partage en dépend
— vérifié : `avatarTriStorySVG` est encore consommée par `session-life.js`, `retest.js` et
`tab-profile.js`). **Le personnage réparé est visiblement plus riche que celui qui a été jugé**
« stick-figure trop simple » : bandeau DÉPART lisible, dossards, lunettes, chaussures réapparus.
La décision reste au fondateur, mais elle se prend maintenant sur les deux rendus réels.
**Le barème est motivé, pas posé** : moyenne des `(niveau/30)^0,65`. `k < 1` relève le début de
parcours (l'exemple du brief, 9/4/6, passe de **21 en somme brute à 36**) sans écraser le milieu
(15/15/15 reste à 64). **Vérifié exhaustivement sur les 29 791 triplets** : 0/0/0 rend 0,
30/30/30 rend 100, et **le meilleur score non légendaire est 99** — « 100 » ne peut donc pas
mentir, sans garde-fou artificiel.
**Deux écarts avec le brief, mesurés puis assumés.** (1) Il fixait l'or légendaire à `#ffd23d` —
c'est **exactement `DISC.rn.ac` depuis V5**, donc un badge légendaire porterait la couleur de la
discipline COURSE ; l'or du module (`OR`, `#f0b429`) est utilisé à la place, aucune couleur
nouvelle. (2) Les couleurs arrivent **par paramètre** et non par import : le module est PUR (zéro
import, c'est ce qui fait tourner `demo:avatartri` en node), donc l'UI passe `DISC[*].ac` — plutôt
qu'une copie locale qui divergerait en silence, le défaut que V5 a justement mesuré.
**Trois défauts de ma propre écriture, trouvés au rendu.** (a) La rotation légendaire portait un
`transform` CSS sur le cercle, ce qui **écrase le `transform` ATTRIBUT** de SVG : l'anneau partait
du mauvais angle et pivotait autour du mauvais point — elle porte désormais sur un `<g>`.
(b) Le « 100 » or se posait sur un anneau intérieur PLEIN et or : illisible, d'où un disque sombre
sous le chiffre, dans tous les états. (c) **R16.8 a mordu** : l'icône à 8 et le libellé à 5 unités
rendaient **7,7 px et 4,8 px** une fois le viewBox mis à l'échelle — sous le plancher de 9 px, et
le badge n'est pas exempté (l'exemption de V2 vise `svg[aria-hidden]`, or celui-ci porte le score
dans son `aria-label`). L'icône passe à 10 ; « LÉGENDE ZENNA » **quitte le SVG** pour du HTML, où
l'échelle typographique le gouverne — il ne pouvait tenir à aucune taille utilisable.
**Et ma sonde de typo m'avait fait publier un faux chiffre** : elle appelait `setTab("profil")`
quand l'identifiant est `"profile"` — `setTab` retombe sur le DERNIER onglet, donc elle mesurait
🧰 Outils deux fois et **n'a jamais regardé 📋 Profil**. Trouvé en écrivant `smoke-ring`, qui
échouait pour la même raison. Chiffres de V7 corrigés de « 6 → 8 » à **7 → 8**.
**Deux gardes RÉÉCRITES, pas supprimées** : `smoke-r4` cherchait les trois hex de discipline EN
DUR — **périmé depuis V5**, et vert seulement parce que le personnage lisait la copie locale du
module ; il dérive maintenant de la table. `smoke-avatar` cherchait le personnage par sa PLACE
(`#screen svg[aria-label^="Avatar"]`) : il le FABRIQUE et l'injecte désormais, parce que la
propriété gardée est sa PALETTE (le repli hors thème qui protège la carte de partage), pas son
emplacement — un lot de mise en page faisait rougir une garde de couleur.
**Non fait, délibérément** : la variante compacte 36 px n'est branchée nulle part — le brief
demande de trancher avec le fondateur, et mesuré, **36 px ne permet pas un chiffre lisible**
(il faudrait ≥ 53 px pour tenir le plancher de 9 px). `avatarTriSVG`/`avatarTriStorySVG` restent
en place et servent toujours la carte de partage.
**28 gates verts, E2E 24/24, `audit:v1` 459 et golden 949 inchangés, `src/`, `engine.js` et le
monolithe byte-identiques.**

**V7 livré — Poppins remplace Bebas Neue, et quatre polices n'étaient pas dans le cache**
(brief du fondateur + graphiste, 12/08/2026 : palette INCHANGÉE, seule la police d'affichage
change) : `--zn-display` passe de `'Bebas Neue'` à `'Poppins'`, sur les cinq onglets, partout où
la variable est consommée (15 règles).
**Deux prémisses du brief ne tenaient pas, et les corriger EST le lot.** (1) « ajouter Poppins au
lien Google Fonts existant » — **il n'y a pas de lien Google Fonts**, et il ne doit pas y en avoir :
c'est D19, et R-ZENNA a déjà payé cette faute une fois (deux hôtes tiers dans la CSP, une requête
bloquante au premier rendu, le fichier autonome cassé). Poppins est donc **auto-hébergée** comme
les six autres, sous-ensemble LATIN pris explicitement dans le bloc annoté « latin » — le premier
bloc servi par l'API pour Poppins est le DEVANAGARI, et le prendre aurait donné une police sans un
seul accent français. (2) Le brief soupçonnait Poppins Bold « probablement trop léger » : mesuré,
c'est pire que ça — **la plupart des règles display rendaient en poids 400** (« Sweetspot vélo »
30px/400, le grand chiffre du héros 50px/400), parce que Bebas n'a QU'UNE graisse et que personne
n'avait jamais eu à déclarer un `font-weight`. Basculer sans y toucher aurait demandé un Poppins
REGULAR qu'on n'embarque même pas (700 et 800 seulement), donc un repli silencieux sur Archivo
Black. Le poids devient une variable, **`--zn-display-weight: 800`** — le régler est le changement
d'un chiffre.
**Mesuré avant/après, fonts chargées** : Poppins rend **405 px** là où Bebas rendait **246** pour
le même texte à 40 px, soit **+65 % de largeur**. Conséquence sur les cinq onglets : **7 → 8
éléments sur deux lignes**, un seul élément concerné (`.shop-title`, « S'abonner au
ravitaillement », sur 🧰 Outils).
**Ma sonde a sur-rapporté trois fois, et c'est écrit.** (1) Elle annonçait « 2 qui débordent » :
mesuré au caractère, `scrollWidth == clientWidth == 258` — **aucun débordement de contenu**, les
2 px d'excédent sont le cisaillement du `skewX(-4deg)`, qui croît avec la HAUTEUR et n'apparaît
donc qu'une fois le titre passé à deux lignes. (2) Sa première exécution rendait « déclarée 474 »
(= Archivo Black) sur le PREMIER onglet et 405 sur les quatre suivants : une course de chargement
(`font-display: swap`), pas un état du produit — corrigée par `document.fonts.ready`. (3) Et elle
**n'a jamais regardé 📋 Profil** : elle appelait `setTab("profil")`, or l'identifiant est
`"profile"` — `setTab` retombe alors sur le DERNIER onglet, donc elle mesurait 🧰 Outils DEUX
fois. Les deux écrans rendaient un contenu identique et je ne l'ai pas questionné. Chiffres
d'abord publiés « 6 → 8 », corrigés en **7 → 8** après re-mesure des deux états. Trouvé en
écrivant la garde du lot suivant, qui échouait pour la même raison.
**Le skew (point 2 du brief) n'est PAS tranché ici** : il reste posé, il rend correctement, mais
« a-t-il du sens sur une géométrique arrondie » est un choix de direction artistique, pas une
mesure. Capture fournie pour arbitrer.
**Et le lot a débusqué O-32, un défaut ANTÉRIEUR** : `build:sw` annonçait **57 assets avant comme
après** l'ajout de deux `.woff2`. Les polices étaient écrites À LA MAIN dans `EN_DUR`, sous un
commentaire qui les disait « non listables par extension » — c'est faux —, et la liste était
restée aux **trois** polices d'avant R-ZENNA : `bebas-neue`, `inter` et les deux `ibm-plex-mono`
**n'ont jamais été précachées depuis leur arrivée**. Invisible en ligne, net hors ligne : l'app
tenait « ça marche sans réseau » mais pas avec sa typographie. C'est le SECOND trou d'O-24 dans sa
forme exacte, resté ouvert parce qu'O-24 n'avait dérivé du disque que le `.js` et le `.css`.
**57 → 63 assets.** `ASSETS` composait aussi ses groupes par `EN_DUR.slice(0, 3)`/`slice(3)`, des
indices qui devenaient faux dès qu'on ajoutait une ligne — les trois groupes sont NOMMÉS.
**28 gates verts, E2E 23/23, `audit:v1` 459 et golden 949 inchangés, spec régénérée, `src/`,
`engine.js` et le monolithe byte-identiques.**

**V6 livré — le badge de discipline dupliqué quitte 🎯 Aujourd'hui** (brief du fondateur,
12/08/2026, suite à O-31) : la carte « Le détail de la séance » portait une TUILE de discipline
pleine de 38 px, en plus de la pile `.zn-disc-chip` du héros — deux fois la même information à
**79 px d'écart**, et depuis V5 la tuile porte **exactement** la couleur du héros, où elle se noie
au lieu de signaler. **Vérifié à la source** : la maquette (`zenna-maquette-v4-audit-experts.html`,
`.hero`) ne porte qu'un seul indicateur, la pile sur fond neutre `rgba(10,10,10,.16)`, et sa carte
de détail ne contient que la barre de zones. La tuile était un ajout du 07/08, pas un manque.
**Aucun gate ne la référençait** (`smoke-carte-seance` ne regarde que `.gd-ic`, sur Plan et
Semaine) — vérifié avant de retirer, comme le brief le demandait.
**La mesure a failli me faire écrire un faux** : sur le profil par défaut, **0 jour sur 350** porte
plusieurs séances, ce qui rendait la tuile toujours redondante… mais `runnerStateV1` déclare
`doubles: "non"`, et c'est cette dimension qui décide. Avec `doubles: "oui"`, **27,8 % des jours
d'un 70.3** portent deux séances (`sw+bk` ×24, `sw+rn` ×8), et là le héros ne nomme que la
PREMIÈRE. Le cas a donc été capturé et regardé : les deux séances restent nommées en toutes
lettres, chacune avec son pourquoi et sa barre de zones, et le héros annonce « puis Sweetspot
vélo » — **la discipline est portée par le NOM**, ce qui est déjà l'argument qui rend le badge
`aria-hidden` partout ailleurs. Rien n'est perdu, y compris pour un lecteur d'écran.
`discBadgeHTML` est **retirée** et non laissée inutilisée : une fonction morte qui rend un badge
est une invitation à la rebrancher.
Garde : `smoke-zenna` **§1bis**, 64 → **67 assertions**, portant sur la PROPRIÉTÉ (« un seul
indicateur ») et non sur l'absence d'une classe — **vérifiée rouge** en réintroduisant la tuile
sous un balisage DIFFÉRENT (inline, sans `discBadgeHTML`, sans classe), ce qu'un critère nommant
la classe aurait laissé passer. Le premier volet garde l'autre moitié : retirer la tuile ne doit
pas emporter la pile.
**28 gates verts, E2E 23/23, golden 949 inchangé, moteur byte-identique.**

**V3 livré — la carte de séance : repliée par défaut, la couleur dans le badge** (brief du
fondateur, 12/08/2026, maquette « structure interne réelle » — voir ARCHITECTURE.md « V3 ») :
la carte exposait titre + conseil + blocs détaillés d'office, sur un fond pleine largeur teinté
par la charge du jour. Mesuré avant : **7 séances sur 7 dépliées** en 📅 Semaine, 161 px par
carte, **2 009 px d'onglet**, 4 fonds distincts. Après : 0 dépliée, 97 px, **1 127 px (−44 %)**,
1 seul fond. **Le renversement est assumé et écrit** — l'ouverture d'office venait d'une demande
du 08/08 qui visait précisément cet onglet ; l'ancienne raison (Semaine n'affiche qu'UNE semaine)
reste vraie, elle ne suffisait pas à justifier sept blocs techniques ouverts.
**`ZENNA_SPEC_COMPLETE.md` n'existait pas dans le dépôt AU MOMENT DE V3** : faute de fichier, les
valeurs venaient des `--zn-*` existants et des accents `DISC[*].ac` — aucune couleur inventée.
(Il a été reconstruit depuis, voir « V4 » : généré depuis les sources, gardé par `check:spec`.)
**La teinte de charge survit dans la BORDURE** : elle porte du SENS (dur/facile/récup) et une
bordure de 1 px n'est pas un fond pleine largeur — arbitrage à connaître, 4 lignes de CSS à
retirer si elle doit disparaître aussi.
**Une mesure a changé ma décision sur le badge** : je l'avais posé en teinte DILUÉE (22 %), le
réflexe sur fond sombre — mesuré **1,26 à 1,48:1** contre la carte, quand WCAG 1.4.11 demande
**3:1** pour un composant qui porte de l'information. Aucune dilution n'y arrive (le bleu du vélo
plafonne à 3,33:1 **même en plein**) : tuile pleine, comme la maquette — 3,42 · 4,77 · 5,91 ·
6,50. `trail` et `swimrun` n'ont pas de code propre (le moteur les émet en `rn`/`sw`) et héritent
de ces badges.
**Le composant vit dans DEUX onglets, pas cinq** (le brief en demandait cinq) : 140 cartes en
🗓 Plan, 7 en 📅 Semaine, zéro ailleurs — 🎯 Aujourd'hui porte un héros, autre composant, non
touché. Garde `smoke-carte-seance.mjs`, **22ᵉ suite**, 19 assertions, quatre cassures quatre
rouges. **Deux fautes d'instrument à moi** : « aucun conseil n'occupe l'écran » sommait des
`.gd-why` en supposant qu'un `<details>` fermé ne rend rien — Chromium leur donne 37 à 56 px
(`content-visibility` saute le contenu sans annuler les boîtes), le critère rougissait sur un
repli qui marche ; et son témoin visait la séance la plus COURTE de la semaine. Et `smoke-usage`
U16 a cassé pour la bonne raison — il retrouvait les séances par `startsWith(nom)`, or le résumé
commence désormais par le badge ; il lit maintenant le `<b>` qui porte le nom.
**28 gates verts, E2E 22/22, `audit:v1` et golden 949 inchangés — `src/`, `engine.js` et le
monolithe byte-identiques (contrainte de gel du brief).**

**V2 livré — le produit se montre : le sachet Zenna dans la carte de vente** (maquettes produit
du fondateur, 12/08/2026 : « travail maintenant l'interface graphique de vente » — voir
ARCHITECTURE.md « V2 ») : la carte vendait une abstraction — le créneau produit portait un
« flacon » générique dessiné faute de produit à montrer, et le devis parlait de « gel (30 g) ».
L'identité (4 saveurs, 30 g de glucides, 40 g net, sans colorant, fabriqué en France) se pose
dans **`shop-catalog.js`**, qui se déclare depuis son écriture « le SEUL endroit où un produit
réel existe » ; le dessin, les puces, le devis et les arguments la lisent tous (R11.1).
**`CATALOG` reste à `null`** : on décrit un produit DESSINÉ, pas DISPONIBLE — ni fournisseur, ni
prix ferme, ni expédition, et la carte continue de le dire. **Deux encres par saveur** parce que
l'olive du citron rend **3,08:1** sur le crème, sous le seuil AA : `bloc` pour le pan de couleur,
`texte` assombri pour écrire dessus. Le sachet est dessiné en SVG (`js/ui/sachet.js`) et **le Z
vient de `brand.js`** — la leçon de v8, où la géométrie du logo avait fini par exister en trois
endroits. Deux niveaux de détail par LISIBILITÉ : à 24 px, « ZENNA / GEL GLUCIDE / 30 G » se rend
en traits de moins d'un pixel. La rangée des goûts montre les sachets (`aria-hidden` : on entend
« Citron », pas « image, Citron »), « peu d'importance » n'en invente aucun, l'ordre suit la gamme
(citron d'abord — c'est aussi le défaut proposé), et les faits produit passent en **bandeau d'une
ligne** : six encadrés empilés faisaient 210 px de promesses avant le premier chiffre.
**Deux défauts de ma première écriture** : le chiffre « 30 G » était posé DANS le pan de couleur
et s'y noyait (c'est le rendu qui l'a montré, pas la relecture) ; et `var(--zn-mono)` dans un
attribut de présentation SVG ne résout rien — un attribut SVG est parsé comme du XML, la police
retombait en silence. **`smoke-typo` a rougi à 4,4 px** : l'exemption est bornée à
`svg[aria-hidden]` et **reste conditionnelle** — `smoke-shop` vérifie que chaque sachet l'est ;
vérifié en retirant l'attribut, **les DEUX gardes rougissent**.
**Et un `git checkout` a effacé une heure de travail** : restaurer une cassure de contre-preuve
avec `git checkout` sur un fichier NON COMMITÉ a emporté tout le câblage du sachet — ce sont les
gardes qui l'ont dit (« 0 sachets »), pas moi. Plus un critère satisfait par un voisin (« le
produit est nommé » cherchait deux motifs, dont un que le bandeau de faits satisfait : retirer le
nom du devis le laissait VERT). `smoke-shop` 37 → **42 assertions**, trois cassures trois rouges.
**28 gates verts, E2E 21/21, `audit:v1` et golden 949 inchangés.**

**V1 livré — le canal de vente : le tunnel était infranchissable** (retour du fondateur,
12/08/2026 : « travail l'ux du canal de vente » — voir ARCHITECTURE.md « V1 ») : la carte
d'abonnement au ravitaillement (🧰 Outils › Nutrition) n'avait jamais été TRAVERSÉE comme un
athlète le fait, seulement composée puis gardée par des critères d'état. Mesuré geste par geste :
on arrive sur la carte dépliée (811 px, devis et bouton présents), **on clique une cadence et
elle se REFERME** (190 px, plus de devis, plus de bouton) — les gestes suivants sont sans effet.
**Il était donc impossible de s'abonner** par le chemin où le produit propose lui-même l'offre.
Les trois gestes écrivaient `lastPromptAt`, ce qui est juste (« une proposition qu'on manipule
est une proposition vue »), mais c'est le MÊME champ que lit `shopPromptDue` pour ouvrir la
carte ; `shopExpanded` n'était posé que par le bouton manuel. Point unique `noterGesteCarte()`.
**Trois autres promesses fausses ou muettes** : « envoi le samedi » / « envoi le 1er » (balayé sur
les 7 jours — l'échéance tombe le jour de l'abonnement, « samedi » vrai **1 fois sur 7**, et le
mensuel valant 30 jours FIXES les quantièmes sont 31, 30, 30) ; le devis **jetait toute
l'hydratation** hors vélo (1 540 ml sur une sortie longue de 2 h 34) et vendait **2 gels pour une
nage de 70 min en bassin** ; le bouton annonçait « 1er ENVOI le 19/08 » quand aucun fournisseur
n'existe. Arbitrages du fondateur : boisson en « trail + sorties > 90 min », garde d'âge à 16 ans
alignée sur O-16 (le ravitaillement N1-N7 reste servi à tout âge — c'est la VENTE qui se retire).
Pour les gels en nage, le premier réflexe — lire `milieu` — était le **mauvais signal** (chez un
triathlète il décrit la course, pas l'entraînement) : on reprend le seuil de 90 min plutôt que
d'en inventer un second. **A11y** : `role="tablist"` sans aucun `tabpanel`, 8 puces sans
`aria-checked` (la sélection n'existait que par la couleur), focus perdu sur `<body>` à chaque
choix. **Densité** `.shop-fine` 3,63 → 3,18 car./px (le pire de l'app ; l'audit par onglet
plafonnait à 3,00), la réserve qui décide passant AVANT le bouton.
**Quatre de mes instruments étaient faux** et restent écrits : le contraste rendu à 1,28 puis
1,01 sur un texte qui vaut **11,3** (la remontée par ancêtres ne voit pas un frère peint dessous ;
`elementsFromPoint` rend une liste vide hors écran) ; une sonde qui portait sa PROPRE copie de la
règle et affichait « boisson jetée » après correction ; une contre-preuve dont le `perl` ne
remplaçait rien et sortait verte ; un critère « rien d'autre ne disparaît pour le mineur » qui
mesurait en fait le CALENDRIER. Et un critère **vacueux** démontré tel : « aucun rôle d'onglet »
lisait l'état ABONNÉ, où le segmenté n'existe pas — il restait vert avec `role="tablist"`
réintroduit. `smoke-shop` 20 → **37 assertions**, cinq cassures cinq rouges, K1 rendant 7 lignes
de verdict là où elle faisait MOURIR la suite avant `report()`.
**Trouvé en chemin, sans rapport** : dans le questionnaire, `.row` est un flex à deux colonnes
mais l'`input` porte une largeur FIXE de 200 px — sur 390 px de large les champs Âge et Poids se
**chevauchent de 28 px** et le second sort de l'écran de 12. `max-width:100%`.
**28 gates verts, E2E 21/21, `audit:v1` et golden 949 inchangés** — le canal de vente ne touche
aucune séance.

**R-ZENNA v8 livré — le logo, le renommage en Zenna, et deux gates qui dépendaient du calendrier**
(logo fourni par le fondateur, 12/08/2026 : « le logo, remplace tout les endurabuild par Zenna » —
voir ARCHITECTURE.md « R-ZENNA (v8) ») : la marque fournie (coureur stylisé formant un « Z »)
devient la source unique dans `endurabuild/js/ui/brand.js`, qui portait déjà le MOT depuis v7 et
porte désormais aussi le SYMBOLE. `MARQUE.contours` est une paire de **contours** (0-100) et non un
chemin SVG, parce que DEUX rendus doivent les lire — le SVG de l'app et le générateur d'icônes PNG,
qui teste pixel par pixel (pair-impair **par contour puis OU logique**, les deux formes étant
disjointes). `#f04808` est ÉCHANTILLONNÉ sur le logo, pas choisi à l'œil. L'en-tête du fichier dit
ce que le logo EST : un TRACÉ (marching squares + Douglas-Peucker) légèrement plus gras que
l'original, le seuil mordant dans le bord adouci du JPEG — remplacer les contours par la source
vectorielle est strictement meilleur, et c'est écrit là où quelqu'un le lira.
**Deux identifiants gardent leur ancien nom, délibérément** : `eb_state_v1`/`eb_state_v2`
(renommer la clé perd le plan de chaque utilisateur existant — l'app démarrerait proprement, sur
un état vide, et aucune garde ne le verrait) et `UID:…@endurabuild` de l'export iCalendar (un UID
est une IDENTITÉ : le changer met la préparation en DOUBLE dans l'agenda au ré-import). Le
répertoire `endurabuild/` non plus. Tout ce qui est VISIBLE est renommé, monolithe gelé compris —
le geler concerne son moteur et son UI, pas le nom du produit.
**Deux gates rouges, aucun causé par le lot, tous deux de la famille R20.7** — et dans les deux cas
la vérification a été la même : rejouer la garde sur le `HEAD` d'AVANT, qui rend exactement les
mêmes échecs. **(1) `smoke-zenna`** ne pinçait aucune date et le plan démarre au lundi de la
semaine en cours : balayé sur les sept jours, **quatre sur sept** (Lun/Mer/Ven/Dim) tombent sur un
« Repos » — pas d'XP, pas de grand chiffre, 3 échecs. La suite passait sur la bonne volonté du
calendrier depuis son écriture. Ancrage par `page.clock.setFixedTime` (et non `install`, qui
gèlerait les MINUTERIES, c'est-à-dire la cascade et le nettoyage des particules que cette suite
mesure), sur **DEUX jours et pas un** : n'ancrer que le mardi couvrirait « le jour où le code a été
écrit » (R20.1) et la branche REPOS — celle qui venait de faire rougir la suite — ne serait jamais
exercée. Le **§1ter** la garde avec la décision R25 : un repos validé se fête et ne donne PAS d'XP.
Un témoin précède chaque moitié, pour qu'un changement de périodisation désigne sa cause au lieu
d'accuser le mouvement. **(2) `golden:verify`**, 7 profils sur 949, tous `*/cycle` : le seul profil
dont le CONTENU dépend de dates absolues (`phaseOf` lit le jour du cycle sur chaque date du plan),
et le seul sans `plan_start` — `weekBuilder` retombe alors sur `Date.now()`. **Le témoin a corrigé
le diagnostic que j'allais écrire** : ce n'est pas « un jour par jour » mais **une fois par
semaine** (empreintes des 10, 11 et 12/08 identiques, celle du 17/08 différente — la grille se cale
sur le lundi d'ancrage), ce qui est plus pernicieux : un gate rouge tous les lundis ressemble à une
régression du lot en cours. Contre-preuves : XP recâblé sur le repos → 1 rouge ; ancrage retiré →
4 rouges, témoin en tête.
**Et la favicone pesait 81 % du HTML servi** : le tracé fait ~750 points, posé en `data:` il
occupait **21,6 Ko des 26,7 Ko** du document — quatre cinquièmes du chemin critique du premier
rendu pour une icône de 16 px, sur l'onglet dont U7 mesure le budget à 2 000 ms avec une marge
déjà déclarée quasi nulle ; et c'était un SECOND encodage de la géométrie, ce que `brand.js`
existe pour empêcher. `assets/icon-192.png` (déjà généré depuis `brand.js`, **1,2 Ko**) le
remplace — **HTML 26,7 → 5,1 Ko** ; le fichier autonome l'EMBARQUE en base64 plutôt que de la
retirer, la promesse « zéro requête réseau » restant vérifiée sur le fichier produit.
**28 gates verts, E2E 21/21 (`smoke-zenna` 57 → 64 assertions), golden 949 recapturé (7 empreintes).**

**R-ZENNA (POC) livré — nouvelle direction visuelle, un onglet** (maquette du fondateur,
10-11/08/2026) : le style « papier/collage » que ce fichier disait à préserver cède la place à
un nouveau système visuel sombre (fond noir, accent orange, cartes `--zn-*`) — **décision du
fondateur : c'est la nouvelle direction**, à étendre aux quatre autres onglets ensuite. Démarré
sur le SEUL onglet 🎯 Aujourd'hui, comme preuve de concept scopée pour limiter le risque sur un
dépôt à 27 gates CI et 20 suites E2E. Technique : tout est scopé sous `body.theme-zenna` (posée
par `tabs.js` uniquement quand l'onglet actif est « today », retirée ailleurs) ; les modules qui
composent l'onglet (session-life.js, checkin.js, plan-view.js, daily-content.js, retest.js,
tab-nutrition.js, readiness.js) portent leurs couleurs en `var(--zn-x, #hex-d-origine)` — sans
`css/zenna-today.css`, le rendu redevient EXACTEMENT celui d'avant (repli identique, R11.1).
Aucune classe/id fonctionnel touché, aucun autre onglet modifié, moteur intact (`audit:v1`
inchangé). **19/20 suites E2E vertes** (voir dette ci-dessous pour la 20e).
Deux défauts trouvés et corrigés EN CONSTRUISANT, gardés écrits : la première écriture chargeait
Bebas Neue/Inter/IBM Plex Mono depuis Google Fonts — contredit D19 (polices auto-hébergées,
`styles.css`, zéro requête externe) et produisait des erreurs console mesurées par
`smoke-checkin.mjs` en réseau bridé ; corrigé en réutilisant les polices déjà embarquées
(Archivo Black, Space Grotesk) et une pile monospace système. Et la feuille se charge en SCRIPT
(`js/app.js`), jamais en `<link>` statique dans `<head>` : un `<link>` de plus y est bloquant
pour le premier rendu (mesuré : `smoke-usage.mjs` U7 passait de 1720 ms à ~2000 ms rien qu'avec
le `<link>` en tête de page).
**Dette déclarée** : `smoke-usage.mjs` (U7, « la séance apparaît sans attendre la météo ») mesure
~1990-2020 ms dans ce sandbox de développement contre un plafond de 2000 ms — flaky, tantôt vert
tantôt rouge. Isolé fichier par fichier : le JS seul (sans `zenna-today.css`) reste à
~1720-1845 ms, donc le surcoût vient du RECALCUL DE STYLE de la feuille ajoutée (une cinquantaine
de règles ciblant des éléments réellement présents dans l'onglet), pas d'une attente réseau
réintroduite — le PRINCIPE qu'U7 garde reste intact (vérifié dans le code : aucun nouvel `await`
ne bloque le rendu). La marge d'origine (280 ms) est devenue quasi nulle ; probablement plus
large sur un CI non bridé, non vérifié faute d'accès. À traiter avant d'étendre le reskin aux
quatre autres onglets : alléger `zenna-today.css` (moins de sélecteurs ciblant des éléments
réels) ou réviser la marge du seuil — décision du fondateur, pas tranchée ici.

**R26 livré — le module Éducatifs, six disciplines, un seul schéma** (brief
`BRIEF_CLAUDE_CODE_R16.md` + `AUDIT_CROISE_EDUCATIFS.md` — le fichier source s'appelle lui-même
« R16 », mais ce numéro est déjà pris par le lot design visuel du 01/08/2026 (R16.4-R16.10, encore
cité 8 fois dans `styles.css`) ; documenté ici sous **R26** pour ne pas créer deux lots identiques
sous le même nom, voir ARCHITECTURE.md « R26 (Éducatifs) », suite `npm run test:e2e` →
`smoke-educatifs.mjs`, **20e suite E2E**) : 🧰 Outils › 📚 Éducatifs
rend désormais le contenu pédagogique complet des six disciplines (natation, vélo, course, trail,
enchaînements, swimrun) à partir d'un schéma unique et d'UN SEUL composant de rendu — aucune
branche par discipline hors couleur/icône (A1). Contenu repris **intégralement, sans
reformulation**, des six maquettes fournies, chaque phrase étant pré-vérifiée contre son
sourcing. Verrouillage par prérequis avec cascade de dévalidation (parcours du graphe, comme la
maquette natation le faisait déjà en JS, généralisé au composant), `LOCKED_PREVIEW=true` par
défaut (le contenu verrouillé reste intégralement lisible, seul le bouton de validation est
désactivé — informer plutôt que bloquer, O-17), trois badges de preuve fixes (« Preuves
solides » / « Mesures de terrain » / « Consensus d'enseignement », B2), barre de disciplines
générique pilotée par `S.sport` (§4 du brief : triathlon → 4 disciplines, course seule → 1),
progression et verrouillage par personne et non par plan (`educatifs` ajouté à `SHARED_KEYS` —
savoir nager décrit l'athlète, pas un plan particulier).
**Une collision a été trouvée en explorant `main` avant d'écrire une ligne** : une session
concurrente avait déjà posé un sous-onglet « Éducatifs » plus simple au même endroit
(`tab-eduglossaire.js`, un glossaire `{name,how}` par discipline dérivé de
`src/engine/eduLibrary.ts` — un import ENGINE, puisque `swimDrillGlossaryText()` compose le
texte des notes de séance « Nage éducatifs »). Décision du fondateur (question posée
explicitement) : **remplacer**, `eduLibrary.ts` restant intact. Vérifié contenu par contenu
avant de trancher : vélo/trail/natation absorbent déjà presque mot pour mot les gestes de
`BIKE_DRILLS`/`TRAIL_DRILLS`/`SWIM_DRILLS` ; seul `RUN_DRILLS` (strides, gammes, foulées
bondissantes) n'a aucun équivalent dans le nouveau contenu course — une section « Vocabulaire de
séance » a donc été ajoutée, lisant `EBV2.eduLibrary` EN DIRECT (R11.1, jamais une resaisie du
texte). SVG des six maquettes portés verbatim, identifiants `<marker>` et classes de dessin
préfixés par discipline pour garantir zéro collision (A3, 11 identifiants renommés, vérifié à 0
doublon). `engine.js`/`Coach_Pro_V1.5.html`/`src/` garantis byte-identiques (A14) : le module vit
entièrement sous `endurabuild/js/`, jamais sous `src/` — vérifié par diff vide.
**27 gates verts, E2E 20/20, golden 949 inchangé.**

Audit **100% vert** : 486/486 combinaisons, 0 violation dure, 0 semaine hors bande [0.5, 1.4],
0 alerte, **répartition des intensités mécanisée** (~80/20 : part facile ≥70%, médiane 83% —
repCap V2.2 + brick Z2 + C18b). Couverture structurée 100%, promesses calibrées (C20/C22),
affûtage garanti ≥40% de réduction (R3.13), règles du manifeste mécanisées. **C13c/C13d livrés** :
plancher d'échauffement à 10 min sur toute séance qui en porte un (1 213 séances de qualité
s'échauffaient moins, 663 moins de 5 min) — et son corollaire, une séance de qualité qui ne
garde plus 8 min de travail est DÉCLASSÉE en endurance plutôt que rabotée. **C13e livré** :
l'échauffement n'est JAMAIS plus long que le corps de séance, sur les 6 sports et dans les deux
unités (840 séances sur 40 550 → 0, garde `F6`) ; le plancher de 10 min cède à cet invariant. **R5.6a livré** :
la récup inter-blocs entre dans la métrique du générateur (dans le `_min` du bloc qui la porte,
donc elle suit la mise à l'échelle) — la durée annoncée est la durée porte-à-porte, et l'écart
médian entre les deux estimateurs tombe à 0,0 min. C'était la plus vieille dette du dépôt.

**Sprint 1 V2 : FAIT.** Le moteur de raisonnement (`src/engine/`) et le générateur V2
(`src/generator/`) produisent les 486 plans à 0 violation dure via `npm run audit:v2`,
avec sonde de capacité (V2.1 — la promesse suit ce que les plafonds permettent : nage
V1.5 0.77 méd → 1.15 en V2) et boucle de réparation ciblée démontrée (`npm run demo:repair`).

**Sprint 2 V2 (moteur) : FAIT.** Adaptation readiness quotidienne dans `src/readiness/` :
source enfichable (saisie manuelle MVP → FIT → Garmin si accès), verdict motivé
verte/orange/rouge, ajustement du jour (remplacer/réduire/reposer, jamais rattraper le
volume manqué), invariants de sécurité assertés par `npm run demo:readiness` (CI).

**UI ↔ moteur V2 : BRANCHÉ.** `Coach_Pro_V1.5.html` génère via `EBV2.buildPlan`
(bundle auto-testé de `src/`, legacy en repli), affiche les décisions du moteur, la
carte « Forme du jour » (adaptation quotidienne), le dashboard « Répartition des
intensités », la **prédiction de course** (fourchettes justifiées : Riegel/CSS/%FTP,
resserrées si le plan est suivi), l'**historique prévu vs réel** par semaine, et la
carte régularité/avancement (streak ≥80%, charge accomplie, badges gagnés-jamais-perdus).
**Météo intégrée** (manifeste §6) : Open-Meteo sans clé côté client, dégradation propre —
canicule ≥35°C durcit le verdict des séances extérieures, chaleur/pluie donnent des consignes. **Boucle prévu/réel
fermée** : les séances cochées (✓) nourrissent le calcul de fatigue de l'ajusteur
(`completedFromDone`) — même contrat qu'un futur import Strava.
Voir ARCHITECTURE.md « Branchement UI ».
**Import FIT** : upload d'un fichier d'activité de n'importe quelle montre (onglet Profil,
parseur zéro-dépendance `src/readiness/fitParser.ts`, spec `npm run demo:fit` en CI) —
références estimées au journal + séances réelles dans la fatigue de l'ajusteur.
**Nutrition (ravitaillement d'effort)** : `src/nutrition/nutritionCalculator.ts` — règles
N1–N7 sourcées (ACSM/ISSN/Jeukendrup), glucides/h par durée-intensité, hydratation par
température (météo), récupération, dépense estimée ; carte « 🥤 Ravitaillement » dans
l'onglet Semaine, poids optionnel au Profil ; invariants (bornes dures, jamais de
restriction, avertissement obligatoire) assertés par `npm run demo:nutrition` (CI).
**Périmètre étendu par décision utilisateur (28/07/2026)** : ESTIMATION de la dépense
journalière (base Mifflin-St Jeor N8 + vie quotidienne N9 + entraînement N7) et
répartition INDICATIVE des macros (N10, `src/nutrition/energyEstimator.ts`, carte
« 🔥 Dépense estimée » dans l'onglet 🥗 Nutrition, taille optionnelle au Profil). La frontière qui
RESTE : jamais de cible d'apport, jamais de menu, jamais de conseil de nutrition à
proprement parler — tout est présenté comme dépense/photographie des consensus,
avertissement renforcé obligatoire, invariants en CI (`demo:nutrition`). Le CONSEIL
nutritionnel reste bloqué avis diététicien — ne pas franchir cette ligne.
**Écran d'accueil (PWA, refonte R5)** : l'app s'ouvre sur l'onglet CENTRAL 🎯 Aujourd'hui
avec un check-in en DIAPORAMA cliquable (sommeil → VFC optionnelle → ressenti, phrases de
coach) ; aucune séance visible avant d'avoir répondu, une fois par jour
(`S.answers.readiness.date`). Une fois répondu : séance du jour DÉJÀ adaptée, prédiction
de course, courbe charge/fatigue, barre d'avancement, répartition des intensités.
Voir ARCHITECTURE.md « Refonte R5 ».
**Audit d'influence des paramètres (PWA)** : passage systématique — chaque réponse du
questionnaire doit agir sur le plan généré, pas seulement produire une carte non affichée.
Bug corrigé (import FIT/Strava qui n'atteignait jamais le plan généré — le moteur ne lit
que les valeurs courantes `a.ftp/pace/css`, jamais le journal daté), `swim_limit` câblé
sur ses 4 valeurs, 3 champs morts retirés, calculateurs de test remplacés par la méthode
pour obtenir soi-même FTP/allure/CSS, conseils personnalisés (`evalRules`) enfin visibles
dans l'onglet Avancement. Détail dans ARCHITECTURE.md « Audit d'influence des paramètres ».
**Gamification (refonte R5 : au Profil)** : avatar évolutif (`EBV2.avatar`, 7 paliers
🥚→🏆, XP cumulatif basé uniquement sur la régularité — jamais un chrono, jamais
décroissant), teaser du niveau suivant, niveaux intermédiaires PAR DISCIPLINE en
triathlon (séances validées), badges, efficience. Le monitoring en direct de la séance
(échauffement/corps/retour au calme, répercute sur le ✓) vit dans 🎯 Aujourd'hui.
**Séances repliables + glossaire éducatifs** : toutes les séances (grille semaine + carte
« Aujourd'hui ») en `<details>` fermés par défaut, cliquables pour le détail. Les
éducatifs de natation expliquent désormais COMMENT faire le geste, pas juste son nom.
**R4 livré** (brief `BRIEF_CLAUDE_CODE_R4.md`, rapport `endurabuild/RAPPORT-R4.md`) :
bandeau réserves moteur non-repliable (onglet Plan, acquitté à l'ouverture des décisions),
records personnels (Profil, lecture seule), **multi-plans** (`S.plans`/`eb_state_v2`,
migration auto v1, sélecteur au Profil), **avatar SVG**
personnalisable 100% traçable aux données (posture=7j réels, aura=streak, accessoires=
badges, thème=accents sport), **félicitations + partage story** 1080×1920 (Web Share API,
repli téléchargement). **Spec rétention livrée** (MESSAGE_CLAUDE_CODE_R4, rapport
`endurabuild/RAPPORT-R4-RETENTION.md`) : registre de disciplines (`src/engine/
disciplineRegistry.ts`, trail en temps+D+/GAP/descente, extensibilité assertée),
boucle validation→feedback RPE→célébration→teaser, drapeau douleur (rouge forcé,
qualité verrouillée, levée confirmée), streak par JOUR (repos validable, gel
douleur/maladie, jamais de récompense hors plan — `EBV2.adherence`, garde CI
`demo:retention`), célébrations 15×4 ton sobre, retests « boss fight » (J-7 →
protocole guidé → zones recalées en direct → régression sans langage d'échec),
efficience à charge égale (fitRich), contenu du jour (90 anecdotes + physio par
phase + stat perso + micro-défis), notifications honnêtes (pas de push app fermée
sans backend).
**Lot améliorations livré** (voir ARCHITECTURE.md « Lot améliorations ») : ancrage
calendrier `plan_start` (bug « semaine 1 éternelle » corrigé, asserté en CI), état
partagé entre plans `S.shared` (douleur/maladie/readiness suivent la personne),
sauvegarde/restauration JSON (Profil), auto-✓ des séances depuis un fichier FIT,
échange de jours persistant (⇄, `answers.daySwaps`, garde-fou jours durs consécutifs),
journal des verdicts readiness (carte Avancement), saisie du chrono de course réel
(calibration face à la prédiction), modales accessibles (`js/ui/modal.js` — focus,
Échap, aria), monolithe explicitement gelé (commentaire d'en-tête), **E2E Playwright
en CI** (`tests/e2e/`, 4 suites, 74 assertions — seule devDependency, test uniquement).
**Strava OAuth livré** : relais serveur `server/strava-relay.js` (Cloudflare Worker
zéro dépendance — seul composant serveur du projet, secret jamais côté client,
liste blanche d'origines, tokens par fragment, sans état) + `server/README.md`
(déploiement pas-à-pas) + PWA (`js/strava.js`, bouton « Se connecter avec Strava »
au Profil, refresh auto, repli jeton manuel conservé). Reste HUMAIN : créer l'app
Strava + déployer le worker (15 min, README).
**Refonte R5 livrée** (premier retour du fondateur, 28/07/2026) : navigation en 5 onglets
📋 Profil · 🗓 Plan · 🎯 Aujourd'hui (CENTRAL, mis en valeur) · 📅 Semaine · 🥗 Nutrition
(📅 Semaine fondue dans 🗓 Plan en R16.9 — quatre onglets à l'époque ; 🧰 Outils est arrivé
depuis avec la Nutrition en sous-onglet, cinq onglets aujourd'hui — voir `tabs.js`).
Check-in en diaporama coach (`js/ui/checkin.js`), Aujourd'hui = séance du jour → prédiction
→ charge → avancement → intensités (`tab-today.js`), Profil = avatar/XP/teaser + niveaux
par discipline (tri) + échéance + historique + retest suggéré + records, Plan = phases
cliquables en sous-objectifs validables + décisions moteur en langage neutre (bandeau
rouge « réserves » SUPPRIMÉ — retour utilisateur), séances partout cliquables avec
affordance, bouton ✓ redessiné, Nutrition = dépense + macros + ravito + journal.
Voir ARCHITECTURE.md « Refonte R5 ». Les anciens `tab-progress.js`/`tab-monitor.js`
sont supprimés (contenu redistribué).
Chantiers restants : candidature API MyFitnessPal (humain), push serveur,
avis diététicien pour le CONSEIL nutritionnel (les estimations sont livrées).
**R6 livré** (2e retour du fondateur) : fix avatar (div non fermé) + `html{overflow-x:hidden}`
(barre d'onglets « disparue » = pan horizontal iOS), validation de séance DANS Aujourd'hui
(gros boutons, même boucle feedback→célébration), **3 formats de partage** (story 9:16,
carte 1:1, texte — `export.js`), frise de phases cliquable → déroule le PROGRAMME de la
phase (coches ✓ incluses), **phase validée quand TOUTES ses séances sont cochées**,
nouveau plan PRÉ-REMPLI (données de la personne) + bouton « Revenir à mon plan en cours »
(brouillon abandonné retiré), **profil du parcours** (plat/vallonné/montagneux, Profil)
→ prédiction course à pied ajustée et élargie (PRED-parcours), Strava en 1 bouton
(relais par défaut dans `config.js` STRAVA_RELAY_DEFAULT — à renseigner au déploiement
du worker ; URL en réglages avancés), « ↻ Refaire mon point du matin » (diaporama
re-jouable), **journal alimentaire RETIRÉ** (décision utilisateur — module supprimé).
**R7 livré** (3e retour) : dates en heure LOCALE partout (`todayISO()` dans state.js +
`localTodayISO` bridge — fini l'app qui vit « hier » entre 22h et minuit heure française),
jours du plan annotés de leur vraie date calendrier (`fmtDay` : grilles, programme de
phase, en-têtes « du … au … », héros, validation), garde CI 2 fuseaux (smoke-dates).
**R8+R9 livrés** : départ du plan CETTE semaine (durée = lundi courant → lundi de course,
garde CI 5 fractions) ; avatar **16 niveaux** mix « équipement + décor » (choix
utilisateur), XP immédiat (+10/séance validée, repos compris — niveau 2 dès la 1re
séance), seuils non linéaires croissants, chaque niveau débloque UN paramètre visuel
(`unlock`), teaser « débloque … » au Profil, 6 gardes CI (demo:retention).
**R7 TRAIL livré** (spec SPEC_R7_TRAIL, voir ARCHITECTURE.md « R7 TRAIL ») : le trail est
un **SPORT** (`SPORTS.trail`), plus un format de course à pied. Le verrou levé : l'intensité
dépend de la PENTE (`gradient` sur les steps) — VAM en montée, consigne technique SANS
chiffre en descente, FC + D+ en vallonné ; avant, 86 séances sur 86 portaient une allure au
sol, dont une longue à 5'36/km pour 1 650 m de D+. L'objectif se décrit par ses DONNÉES
(distance, D+, technicité, nuit) et la **catégorie d'effort est déduite** (kv → ultra_long),
avec le km-effort comme repère. Charge à **trois axes** : temps (+10 %), D+ (+12 %, T1/T2),
D− (+8 %, T2b — le plus lent : la descente casse en premier). Constantes T1-T7 avec
provenance, 14 séances dédiées (`src/generator/trailLibrary.ts` : longue, back-to-back,
côtes VAM progressives, descente technique et en charge, marche rapide bâtons, ravito réel,
nuit, renfo excentrique, tapis, escaliers), récup excentrique 48 h (T3), sortie longue en %
du temps de course (T4), terrain plat → substituts + limite NOMMÉE, prédicteur trail (Riegel
inapplicable) avec fourchette large assumée et barrière horaire en tête. Moteur plafonné à
`ultra_long` (décision produit : au-delà de 24 h, on nomme la limite). Migration des plans
`run/trail` + carte Profil « ⛰ Ta course et ton terrain ». Gardes : 17 tests T1-T17 (banc v6)
+ `smoke-trail.mjs` (35 assertions, 6e suite E2E).
**Audit externe v6 livré** (29/07/2026, voir ARCHITECTURE.md « Audit externe v6 ») : un
audit indépendant est arrivé avec son banc de régression exécutable (`audit_v6.mjs`,
38 tests à ID stable, `npm run audit:v6` — **9e gate CI**, exit 1 à la moindre
RÉGRESSION ; la dette connue ne bloque pas). Passé de 10 verts/28 dettes à
**35 verts · 3 dettes · 0 régression**. Sécurité d'abord : la douleur localisée change
de DISCIPLINE (R6.1), un jour rouge ne peut plus augmenter la charge (invariant asserté),
une blessure allège toujours (R6.2 + passe de référence), l'épaule marche en tri, les
4 localisations donnent 4 plans. Promesses : `sessions_max` compte des SÉANCES (C1), la
date de course a 3 branches explicites (C2/C3), l'âge module (R6.3 : mineur sans VO2max,
master 60+), bornes physiologiques et garde IMC, parseur d'allure UNIQUE. Les planchers de
séance ne gagnent plus contre la courbe (C15/C23 au niveau séance, plancher C24b, lissage
sur le livré). Readiness : objectif vs subjectif séparés, heures de sommeil et FC au réveil
enfin collectées, validation de schéma. Export : contrat `durationMin`/`_min` réparé, ICS
conforme RFC 5545. **3 dettes documentées avec leur arbitrage** (D2, D3 : structure du pic
vs C22 sur plans saturés, F2 : 43-44% au lieu de 45%).
**Mesures rendues honnêtes (série d'audits externes, 31/07/2026)** : `recoveryMin` porté par le
step (la récup n'est plus lue dans une phrase — 1 740 récupérations de trail comptées 0 min),
`enforceMedicalHold` (une PORTE dans les builders + un FILET au point de convergence : le garde
s'était rouvert deux fois, il énumère désormais ce qui est PERMIS), la course objectif dans le
calendrier (N1, elle n'y était sur AUCUN des 6 sports), `npm run trace` — la trace ordonnée des
mutations, activable par combinaison, prouvée sans effet sur la sortie à chaque exécution.
Deux mesures mentaient : `v1Harness` auditait le générateur de repli (il charge le bundle
maintenant, et LÈVE s'il ne peut pas), et `generateAudited` rendait le verdict d'un état
intermédiaire (re-mesuré à la sortie). **15 gates verts.**

**R10 livré** (retour d'un ami entraîneur, voir ARCHITECTURE.md « R10 ») : **rampe
`vol_recent`** — le plan part du volume RÉEL des 3-6 derniers mois (question obligatoire
du questionnaire + Profil, semaine 1 ≤ ×1.1 puis ≤ +10 %/sem jusqu'à rejoindre la courbe,
décision `R10-depart`, comportement inchangé sans la réponse — 486 combos intactes,
gardes CI) ; **courses intermédiaires pour tous** (carte 🏁 au Profil, jour J matérialisé
en séance « 🏁 Course B/C » avec pacing, semaine allégée + récup ensuite, gardes CI) ;
**%FTP recalibré** sur les facteurs Coggan + « puissance NORMALISÉE » explicité partout ;
`adjustTodayV2` applique les échanges ⇄ (héros Aujourd'hui = grille) ; **LICENSE** tous
droits réservés + mention pied de page.

**N2 livré** (registre externe, voir R10_DEFECTS.md « N2 ») : **le plan s'arrête le jour de la
course**. La dernière semaine était la semaine CALENDAIRE de l'objectif — une course un
mercredi laissait quatre jours de « Repos post-course », une course un lundi en laissait SIX
(mesuré : 126 jours morts sur 42 plans). La grille ne bouge pas, elle est coupée au soir du
jour J : la dernière semaine fait 1 à 7 jours, et sa cible de volume est proratisée à sa
longueur réelle (elle promettait 3 h pour trois jours, et la boucle R3.3 gonflait les deux
derniers jours avant la course pour « remplir »). Angle mort fermé au passage : **aucun** des
714 profils du golden ne portait de date de course — passe « course datée » ajoutée
(6 sports × 7 jours de semaine, **714 → 756**), garde permanent `I18` (72 échecs → 0).

**I14 fermé** (voir R10_DEFECTS.md « I14 ») : la sortie longue est désormais la plus longue
séance de sa semaine sur les 6 sports. Les 18 échecs restants étaient tous en trail et venaient
d'une exclusion posée par prudence — le plafond ne touchait aucun bloc en pente : « Descente en
charge » montait à **5 h 16 contre 4 h 04** pour la sortie longue, sur l'axe dont le module dit
lui-même qu'il casse en premier. Un bloc en pente se réduit par ses RÉPÉTITIONS (le total de D+/D−
suit au prorata, la vitesse ascensionnelle de chaque répétition ne bouge pas), jamais par sa durée.
Deux rappels de la même leçon au passage : une contrainte de croissance ne se viole pas qu'en
montant (réduire la semaine N creuse l'écart avec N+1 → T2/T2b re-clampées au point de
convergence), et une garantie de SÉANCE doit précéder les garanties de SEMAINE (sinon la semaine
est validée sur un contenu qui va encore changer). **Banc d'invariants vert sur ses 19 tests.**

**R13 livré** (handoff standalone-4, voir R10_DEFECTS.md « R13 » — banc `npm run audit:r13`,
17e gate CI) : **l'âge n'a plus qu'un domaine** (PHYSIO_BOUNDS dérive d'ANSWER_SCHEMA, un
enfant de 10 ans recevait le plan adulte complet — garde de build anti-divergence) ; **CSS
print** retirée de styles.css + garde de build ; **la nage du tri mono-séance existe**
(facile2 par phase, 2e nage en spec/pic, rappel nage CHAQUE semaine d'affûtage, l'intensité
suit l'intention) ; **semaine de course réparée** (force basse cadence bannie de l'affûtage
en violation DURE — le même fall-through vivait dans TROIS sports —, veille ≤ 25 min, jour J
`min:0` + temps prédits, plancher 30 % du pic hors jour J) ; **l'effondrement épaule+natation
corrigé à la cause** (sonde de capacité qui mesure aussi le CHEMIN, coupes qui RENDENT ce
qu'elles prennent en trop — confirme : 20 semaines plates 0,8 h → courbe 1,4→2,9 h, 0
réparation) ; **phases plafonnées en absolu** (taper ≤ 3, peak ≤ 5, Bosquet 2007) ; C22 au
point fixe en tout dernier ; genou+vélo pur = avertissement nommé. Et la vague de vert a
débusqué : la course `min:0` devenue victime idéale de toutes les coupes (jamais une victime
désormais), la protection anti-orphelin généralisée à TOUTES les disciplines, le footing tri
sans bornes (déversoir des remplissages, 213 min mesurées), le seuil nage compté 100 % dur
(70/30 désormais). **17 gates verts, E2E 8/8, golden 756 recapturé.**

**R14 livré** (handoff standalone-5, voir R10_DEFECTS.md « R14 » — banc `npm run audit:r14`,
**18e gate CI**) : **la prédiction connaît enfin le plan qu'elle accompagne**. Elle ne lisait que
les références saisies AUJOURD'HUI : sur un Ironman à 59 semaines avec 30 semaines intégralement
cochées, le chrono affiché était identique au caractère près entre la semaine 1 et la semaine 31.
`predict()` garde sa sortie intacte (la forme actuelle reste l'ancre mesurée) et gagne
`projected` — le MÊME prédicteur rejoué sur des références projetées, jamais une seconde méthode
d'extrapolation. Huit règles tracées (`src/engine/projection.ts`) : adhérence en **fenêtre
glissante de 6 semaines écoulées** (P1 — `pctLoad` comptait le futur, donc 30 semaines parfaites
sur 59 donnaient 43 %) ; gain **plafonné et saturant** au profil le plus prudent entre `level` et
`history` (P2) ; **tes tests datés priment** sur l'heuristique (P3) ; **+1,96 % d'affûtage
seulement s'il est conforme** (P4, Bosquet 2007 vérifié sur le plan livré) ; **exposant de Riegel
piloté par le volume** (P5 — figé à 1,06, il donnait le même marathon à 4 h et à 14 h/semaine ;
seule la course sèche est touchée, les legs tri/duathlon gardent leurs facteurs calibrés) ; **le
pacing ne se projette JAMAIS** (P6, la règle de sécurité : le temps se projette, l'intensité
s'ancre) ; incertitude calculée avec **refus motivé au-delà de ±12 %** (P7) ; aucune projection
sans matière et gain annulé sous 50 % d'adhérence, motif affiché, jamais de reproche (P8). CTL/ATL/TSB
et Banister explicitement rejetés, dans le code, avec la raison. **R14.3-a** : `terrain` et
`course_profile` étaient deux champs pour la même idée avec des clés qui ne se recouvraient pas —
`montagne` ne déclenchait AUCUNE correction de relief (plat 240 min, montagne 240 min) ; résolveur
unique partagé par le jour J et la carte Prédiction, garde de build sur le domaine.
Débusqué en chemin : le banc rendait deux critères **insatisfiables** (son échantillonneur
d'adhérence marquait 6/6 séances à tous les taux — instrument corrigé, ID et assertions gardés),
et le golden regardait P5 au seul point où il ne bouge pas (`vol_max: 10` = l'ancrage 1,06) —
passe « volume et extrapolation » ajoutée, **756 → 758**. **18 gates verts, E2E 8/8, golden 758.**

**R14.1 livré** (addendum correctif, voir R10_DEFECTS.md « R14.1 » — banc `npm run audit:r14.1`,
**19e gate CI**) : **le plafond de gain s'indexait sur l'ancienneté, pas sur la marge**. Mesuré sur
un écran de production (70.3 à 43 semaines, FTP 230 W pour 85 kg = 2,71 W/kg) : +4,6 % de CAP,
+4,5 % de nage, **0 % de vélo** — la moitié du temps de course d'un 70.3, immobile. Le code
appliquait fidèlement la table R14 ; c'est la TABLE qui était fausse, parce qu'elle lisait
`history = ancien` comme « proche du plafond physiologique ». 2,71 W/kg est en bas de la bande
« fair » de Coggan : la marge était grande, la table disait l'inverse. Troisième paiement de la
leçon R12 — un adjectif auto-déclaré ne pilote aucun chiffre, et `history` en est un.
**P2bis** : `G∞ = G_plafond × h(marge MESURÉE) × k_structure × f_volume`, `h` interpolé sur des
bandes (vélo = profil Coggan publié ; course et nage = heuristiques assumées, écrites comme telles),
décalées par sexe et âge — on décale LA RÉFÉRENCE, jamais la marge de l'athlète. `k_structure`
mesure le stimulus de la STRUCTURE (nouvelle question Profil « tes 12 derniers mois ») et non les
années ; `history` n'en est plus que le repli. **P7bis** : la fourchette porte sur le GAIN et devient
ASYMÉTRIQUE — borne haute = ta forme d'aujourd'hui, parce que le pire cas d'un plan suivi n'est pas
de régresser mais de ne presque rien gagner (HERITAGE) ; `gainBand` remplace `spreadPct`. **P6bis** :
le vélo affiche DEUX lignes (« cible jour J » ancrée + « FTP projetée » 234–265 W) — P6 reste la
règle de sécurité, on cesse seulement de la faire passer pour une projection. **P10** : facteur
volume (prescrit ÷ récent, borné [0,75 ; 1,15] — le plafond est délibéré, le moteur ne récompense
pas la surcharge). **P9** : levier poids uniquement si demandé ET cible saisie, en SENSIBILITÉ,
sans calendrier ni apport, neutralisé en silence sur IMC cible < 18,5 / mineur / drapeau médical /
perte > 0,5 kg/sem. Confiance « faible » tant qu'aucune semaine n'est écoulée.
Débusqué au passage : le §6 du handoff oubliait `R14.4` dans sa liste de critères périmés — ses
plafonds SONT la table déclarée fausse, et ils sont arithmétiquement incompatibles avec le nouveau
`R14.1-B` (50 % d'écart exigé contre 45 % autorisé). **19 gates verts, E2E 8/8 (55 assertions),
golden 758 inchangé** — la projection ne touche aucune séance.

**R20.1 livré — les gardes cessent de couvrir « là où le code a été écrit »** (décision du
fondateur, voir ARCHITECTURE.md « R20.1 ») : mes deux défauts de R19 avaient la MÊME forme —
la garde couvrait le sport où le code avait été écrit, pas celui où il servait. Deux gardes,
parce que les deux défauts étaient de deux types. **`audit:sensibilite` est dérivé du SCHÉMA** :
toute clé déclarée doit agir dans CHAQUE sport où elle est déclarée (148 couples sport × clé,
aucune liste à maintenir, 5 paires pour les clés conditionnelles, exemptions nommées une par
une). **`smoke-questionnaires`** (13e suite E2E) traverse les SEPT questionnaires — aucune ne
passait par le triathlon, ce qui avait laissé filer le `ReferenceError` de R19.2 ; vérifiée
ROUGE en réintroduisant ce défaut. Quatre défauts trouvés le jour même par ces gardes :
**`vol_recent: 0`** — « je ne m'entraîne pas du tout » était lu comme « pas de réponse » (le
piège du `|| undefined` sur un zéro) : semaine 1 à **3,9 h au lieu de 2,0 h** sur un profil
`reprise`, exactement la population que la rampe R10 protège ; **le jour J du swimrun ne
portait aucun temps prédit** (le générateur ne lui passait pas son objectif décodé) — ce qui
rendait aussi `leg_swim_env`/`leg_run_prof` inertes sur le plan malgré R19.1 ; **`gear_test`
n'était lu nulle part** alors que le module dit lui-même que sans test en tenue les allures ne
sont pas des références ; **`swim_limit` n'agissait que pour les débutants** (O-14) alors que
CLAUDE.md le disait « câblé sur ses 4 valeurs ». Le schéma cesse aussi de sur-déclarer (la FTP
n'est plus demandée en course à pied ni en natation). Dette déclarée : `O-13`, la rampe R10 ne
mord jamais en natation — erreur d'unité, décision produit à prendre.
**21 gates verts, E2E 13/13, golden 900 recapturé, registre 13/13 re-mesuré.**

**R20.2 livré — le volume max dit ce qui le bloque, et ce qui le débloquerait** (O-10 fermé,
voir ARCHITECTURE.md « R20.2 ») : sur un 70.3, `vol_max` ne changeait plus RIEN au-delà de
10 h — 10, 12, 14, 16 h donnaient le même plan à 0,1 h près, et la question continuait d'être
posée comme si elle décidait. Le lot ne force AUCUN chiffre vers le plafond demandé (ce serait
défaire la sonde de capacité V2.1) : il rend le chiffre explicable. `volLimits` transmet les
MAILLONS de la réduction (historique · volume utile du format · marge hors compétition ·
récupération · temps dans l'eau · drapeau médical · blessure/âge · structure de la semaine),
le générateur mesure ce que chacun a retiré **en heures** et nomme le plus gros — décision
`R20.2`, en tête de « Pourquoi ce plan ». Ma première écriture nommait le PREMIER plafond qui
mord au lieu du plus gros : en natation elle annonçait « c'est ton historique » (10 h) pour un
pic livré à 3,3 h, faux de 7 h — une explication approximative sur un chiffre que l'athlète a
saisi lui-même l'envoie corriger la mauvaise réponse. Le levier des doubles n'est proposé que
là où il existe (`doubles: "oui"` fait passer le 70.3 de **8,7 h à 13,5 h**) : garde de module
`doublesAddVolume`, **mesuré dans les deux sens** par `audit:sensibilite`, vérifié rouge en
retirant la déclaration du tri. Le diagnostic reste honnête sous drapeau médical, blessure ou
âge ; **aucun levier n'y est jamais proposé**. Deux rectifications au passage : le point 2
d'O-10 était faux **par un titre de colonne** (`volPeak` est le livré, `vol_declared` la cible
interne — mes colonnes étaient inversées, il n'y avait pas de défaut), et la carte « Pourquoi
ce plan » appelait le plafond d'historique « ton volume déclaré » depuis l'origine.
**21 gates verts, E2E 13/13, golden 900 recapturé — 515 profils changent, et le SEUL champ qui
diffère est le nombre de décisions : pas une séance, pas une minute.**

**R20.3 livré — le footing du swimrun reçoit ses bornes** (O-8 fermé, voir ARCHITECTURE.md
« R20.3 ») : le créneau facile course n'avait AUCUN `bnd`, il était donc le seul bloc sans
plafond de la semaine et le déversoir de toutes les passes de remplissage — « Footing facile »
de **179 à 226 min**, devant la pivot, sur le sport dont la pivot EST la spécificité. Le défaut
que R13 avait corrigé pour le triathlon, jamais rejoué sur le module arrivé après.
**Deux écritures de la borne ont été mesurées et RÉFUTÉES** par le banc v7 sur le même check
`S-MIX` (part de course du plan vs part de course de l'épreuve, 4 profils en défaut avant le
lot) : relative à la pivot de la même semaine → **158** ; indexée sur le temps de course de
l'épreuve → **152**. Les deux serraient le footing pendant la construction, or en swimrun les
deux créneaux faciles PORTENT la course à pied du plan — les serrer refait le défaut que S13
venait de corriger. Le défaut n'était pas qu'un footing soit LONG mais qu'il soit **la plus
longue séance du plan** : la borne est donc la **pivot du PIC** (×0,90, plafond absolu 2 h 30),
et le footing passe à **115-150 min** avec la pivot en tête sur les quatre formats.
Les 26 hits résiduels portaient **tous** une eau sous le seuil d'acclimatation : c'est la
**quatrième règle de sécurité** que ce check punissait, après le drapeau médical et les deux
familles de blessures (R16.10) — exemption lue sur le PLAN, jamais sur la température déclarée.
Ce que l'exemption cache est enregistré (**O-15** : la portée du verrou froid n'a jamais été
décidée — 3/15 profils sous le seuil à 16 °C, 0/15 à 20 °C) : une exemption sans entrée de
registre est un défaut effacé. **swimrun 88 % → 89 % au banc v7, `S-MIX` à 0 aux trois tailles
d'échantillon → budget 12 ‰ → 0 (garde-fou définitif), 21 gates verts, E2E 13/13, golden 900
recapturé (136 écarts, TOUS en swimrun).**

**R20.4 livré — C26 mesure enfin ce que sa propre justification dit** (voir ARCHITECTURE.md
« R20.4 ») : C26 déclare depuis son écriture que la grandeur physiologique est le **plafond de
temps DUR** hebdomadaire et que la part de facile n'en est que la conséquence. Seule la
conséquence était vérifiée — et sur un dénominateur qui mélange le modéré et le dur. Mesuré sur
**7 356 semaines de charge : 1 095 (15 %) au-dessus du plafond que la règle déclare**, jusqu'à
**112 min de travail dur chez un DÉBUTANT dont le plafond est 25** — le profil que C26b décrit
lui-même comme limité par son tissu conjonctif. Pendant ce temps le modéré, seul puni par
l'ancienne formulation, ne débordait que 2 fois sur 7 356 : la règle punissait la grandeur
inoffensive et ne regardait jamais la dangereuse. Leçon d'O-12 payée une seconde fois.
**C26c** borne le temps dur pour lui-même (tolérance ×1,1 — il se quantifie par répétitions) ;
**C26d** donne au modéré sa propre borne, plus large (40 %), posée AU-DESSUS de ce que le moteur
produit : une borne calibrée au ras du comportement actuel se contente de le photographier. Les
deux se mesurent PAR SEMAINE, pas en moyenne. La coupe retire des **RÉPÉTITIONS, jamais la durée
d'une répétition** (leçon I14 : dans un intervalle, la durée EST le stimulus) ; sous le plancher,
la séance est DÉCLASSÉE en endurance et **change de nom** — ma première écriture préfixait et
produisait « Endurance nage seuil », une séance qui se contredit dans son titre. 314 séances
déclassées sur 648 plans, **aucun plan ne perd toute sa qualité** (le piège d'O-12, vérifié),
part facile médiane 83 % → 86 %.
Débusqué par C26c : **`audit:v1` mesurait le générateur MORT sur 27 de ses 486 combinaisons.**
Le harnais chargeait bien le bundle, mais appelait le `buildPlan` du HTML — un wrapper qui
attrape TOUTE exception et retombe sur le legacy, y compris un refus d'entrée typé. `run/trail`
n'existe plus depuis R7 ; le legacy satisfaisait toutes les règles auditées jusqu'ici, C26c est
la première qu'il rate. Le harnais appelle le moteur directement : **459 combinaisons auditées +
27 refus DÉCLARÉS.** **21 gates verts, E2E 13/13, golden 900 recapturé (259 écarts).**

**R20.5 livré — « l'allure course » à vélo n'a plus qu'une seule définition** (O-11 fermé, voir
ARCHITECTURE.md « R20.5 ») : le moteur portait DEUX définitions du même effort et la zone
d'entraînement était la plus dure — `bk.rp` valait **0,80–0,88 × FTP du sprint à l'Ironman**
quand le jour J d'un Ironman se roule à **0,70–0,76**. Une séance nommée « Rappel race-pace »
faisait donc rouler **15 % au-dessus de l'intensité que le moteur prescrit lui-même pour la
course** ; sur un sprint, l'inverse. **(1)** `raceBikeBand()` est le point unique — les trois
tables de puissance de course y convergent, `bk.rp` la lit, relief compris (tri/Full 184–202 W →
**161–175 W**, tri/S → **196–214 W**). **(2)** Le plancher de temps facile mesurait le mauvais
rapport : `1 − plafondDur/minutes` est dérivé du plafond de DUR, il décrit
`facile/(facile+dur)`, il était comparé à `facile/(facile+modéré+dur)` — erreur d'unité, même
espèce qu'O-13. Mesuré : un tri/70.3 à **70 % facile · 27 % modéré · 3 % DUR** refusé par une
règle censée borner le dur ; **96 %** sur le rapport que la formule décrit. C26d borne le modéré
séparément, et la question « pyramidal vs polarisé » se dissout. `easyShare` reste affiché tel
quel — on change ce sur quoi on JUGE, pas ce qu'on MONTRE. **(3)** Le tiers du brick à allure
course existe là où il veut dire quelque chose : un seul critère (bande > 0,85 × FTP = du seuil)
décide À LA FOIS de sa classe et de son existence — pas de tiers sur un sprint dont le vélo dure
20 min, tiers sur 70.3 et Full où l'allure se TIENT. Trois défauts trouvés en le construisant :
le rendu n'affichait pas le second bloc et gardait « dernier tiers @ allure course » **sans
chiffre** (le trou de R19.5, resté ouvert côté texte) ; `enforceHardTimeCap` ne classait pas
comme l'auditeur (O-11 reproduit dans son propre correctif) ; la borne du brick lisait le
premier leg vélo au lieu de sommer. **21 gates verts, E2E 13/13, golden 900.**

**R20.6 livré — le banc d'invariants garde enfin** (O-9 fermé, voir ARCHITECTURE.md « R20.6 ») :
`CLAUDE.md` annonçait « banc d'invariants vert sur ses 19 tests » — il ne l'était pas, et ne
l'était pas avant R18 non plus. Le mécanisme du silence EST le défaut : le banc sortait en code
**0 quoi qu'il trouve**, et **il n'était pas en CI**. Un rapport que rien ne lit vaut zéro.
**Trois invariants PÉRIMÉS** — la course objectif n'est pas une séance d'entraînement : `I6` (54)
réclamait une durée non nulle quand le jour J porte `min: 0` par conception (R13.4) ; `I8` (15)
comptait la course dans un budget d'entraînement ; `I12` (3) mesurait la dominance d'une sortie
longue dans la SEMAINE DE COURSE, où il n'y en a pas. **Un VRAI défaut — `I14`** (6), plus large
que « le trail débutant » : « Marche rapide en montée » à **295 min quand la sortie longue du
même athlète est plafonnée à 180** (C23). La 2ᵉ passe d'I14 interdisait de toucher un bloc en
pente non répété et son commentaire assumait le résidu ; or ce qui était interdit, c'était de
changer la VITESSE ASCENSIONNELLE — réduire durée ET dénivelé du même facteur la laisse
identique, c'est la même montée, plus courte. **Puis le banc garde** : exit 1 (vérifié rouge),
**22ᵉ gate CI**, 20 invariants × 54 configurations, 0 échec. L'ordre comptait : rendre bloquant
un banc dont on n'a pas trié les échecs fige la dette au lieu de la traiter.
**22 gates verts, E2E 13/13, golden 900 (un seul profil change, de 5 min).**

**R20.7 livré — la rampe de départ mord enfin en natation (O-13), et un gate qui dépendait du
JOUR** (voir ARCHITECTURE.md « R20.7 ») : le nageur répond en heures de PISCINE, le moteur
compte en heures DANS L'EAU (`SWIM_TIME_FACTOR`) — la rampe R10 comparait les deux et le chiffre
déclaré arrivait toujours au-dessus de la courbe. `vol_recent` à 0, 2, 5 ou 10 h donnait le même
plan à la minute près. **Décision du fondateur : c'est au MOTEUR de convertir**, pas à l'athlète
de retrancher ses temps d'arrêt. Semaine 1 passe de 1,6 h à **1,3 h** pour qui repart de zéro,
et reste inchangée au-dessus de 5 h — la rampe ne mord que là où elle doit. Deux corrections
entraînées : la chaîne d'explication de R20.2 souffrait de la MÊME faute d'unité (elle annonçait
« ton historique, −5 h » pour un pic livré à 1,6 h — ces 5 h n'existent pas dans l'unité du
chiffre affiché), et la rampe est devenue un maillon de cette chaîne.
**Trouvé en passant les gates : `audit:r14` dépendait du jour de la semaine.** Ses dates sont
des décalages sur `Date.now()` quand le moteur compte les semaines de LUNDI à LUNDI : balayé sur
les sept jours à moteur inchangé, le banc était **rouge du lundi au jeudi et vert du vendredi au
dimanche**. Famille d'O-1 — une dimension que la mesure ne contrôle pas et qui décide de son
verdict. Ancrage au lundi ; `R14.3-B` porte désormais sur le RAPPORT J-10/J-60 (stable à
0,40-0,45 quand la valeur absolue dérive de 2,3 à 2,8 %), donc **deux assertions au lieu d'une**;
`R14.5` reçoit un passé de 8 semaines, sans quoi sa fenêtre d'adhérence est vide le lundi.
Vérifié vert **les sept jours**, et les quatre autres bancs datés balayés de même.
**22 gates verts, E2E 13/13, golden 900 recapturé.**

**R20.8 livré — l'acclimatation au froid n'occupe que les dernières semaines** (O-15 fermé, voir
ARCHITECTURE.md « R20.8 ») : sous 17 °C, le module verrouillait le second créneau facile sur une
exposition au froid **de la première à la dernière semaine**. Le principe est juste ; c'est sa
PORTÉE qui n'avait jamais été décidée — l'adaptation au froid s'installe en quelques semaines et
se PERD à l'arrêt, donc celle de la semaine 1 d'une prépa de 26 semaines ne vaut rien le jour J
pendant qu'elle coûte de la spécificité tout du long. **Décision du fondateur** : le verrou
démarre à **8 semaines du jour J**, en semaines RESTANTES et non en phases (une prépa de 12 et
une de 40 n'ont pas les mêmes phases au même endroit, mais toutes deux un « J-8 semaines »).
Profils sous le seuil de spécificité à 16 °C : **3/15 → 0/15** ; séances d'acclimatation sur une
prépa de 41 semaines : **51 → 10**. Et l'exemption `S-MIX` du banc v7 passe d'un angle mort à une
marge : mesurée en la désactivant, elle cachait 26 profils, elle en cache **1 à 4** (N =
250/400/600), tous dans la fenêtre où le verrou fait son travail.
**22 gates verts, E2E 13/13, golden 900 recapturé.**

**R20.9 livré — le créneau de repli, et la question posée n'était pas la bonne** (O-3 fermé, voir
ARCHITECTURE.md « R20.9 ») : l'entrée demandait « `facileR` ou `facile2` ». En regardant ce que
chaque créneau PRODUIT, trois défauts sont apparus, dont deux plus graves que le choix du slot.
**(1)** le repli du trail n'était pas un repli : `facileR` produit « Marche rapide en montée
(bâtons) », une sortie avec dénivelé et renfo excentrique — remplacer une séance de charge par
une autre séance de charge qui porte un nom rassurant. Le trail bascule sur `facile2`
(« Footing récup »). **(2)** N jours déclassés donnaient **N séances IDENTIQUES** : mesuré sous
drapeau médical, **3 × « Marche rapide en montée »** en trail et **4 × « Footing facile »** en
swimrun — sur le sport dont la spécificité EST d'alterner nage et course. `applyWeeklyVariety`
ne pouvait rien y faire : tous ces jours portaient le même créneau. Le repli ALTERNE désormais
entre les deux créneaux faciles, le déclaré passant en premier. **(3) l'instrument suivait la
déclaration, pas le plan** : `measure:fallback` testait `d.slot === easyFallbackSlot`, donc en
changeant le repli du trail le taux est tombé de 25,0 % à **0,0 %** et le verdict allait fermer
O-3 sur ce chiffre. Compté sur n'importe quel créneau facile : **25,0 % avant, 25,0 % après,
1 287 jours dans les deux cas** — la fréquence n'avait pas bougé d'un jour. Troisième occurrence
de cette famille dans R20, après `audit:v1` (R20.4) et l'ancrage calendaire du banc R14 (R20.7).
L'entrée se ferme donc sur le CONTENU : 25 % et 44 % de plans qui passent par un repli ne sont
pas un défaut — un jour dur déclassé, c'est le moteur qui fait son travail.
**22 gates verts, E2E 13/13, golden 900 recapturé (2 profils).**

**N11 livré — le repos des heures d'entraînement n'était compté deux fois** (voir
ARCHITECTURE.md « N11 ») : trouvé en préparant le dossier de relecture diététique, en refaisant
les calculs à la main pour les décrire. `daily` = BMR × NAP couvre les **24 heures** (le NAP de
la FAO est le rapport de la dépense TOTALE au métabolisme de base) et `training` vient des
**MET**, qui sont une dépense BRUTE — un MET EST le métabolisme de repos. Le repos de chaque
heure d'entraînement était donc additionné deux fois : **+80 kcal sur 1 h, +150 sur 2 h, +380 sur
5 h, soit 2,5 % à 8,1 % du total affiché**, et toujours dans le sens qui GONFLE la dépense — sur
un écran de nutrition, une dépense surestimée se lit comme une autorisation, et l'athlète qui
s'entraîne le plus était le plus mal servi. Correction : `total = daily + (training − 1 kcal/kg/h
× poids × heures)`, `REST_MET_KCAL_PER_KG_H` portant sa provenance (c'est la définition du MET,
pas un coefficient d'ajustement). **Ce qui ne change pas** : la dépense d'UNE séance (N7) reste
BRUTE — c'est la bonne réponse à « combien coûte cette séance », le recouvrement n'existe qu'en
l'ajoutant à une journée déjà comptée en entier. Et le recouvrement est **publié**
(`restOverlap`/`trainingNet`, ligne affichée sur la carte 🔥, décision `N11`) plutôt que
retranché en silence : une carte dont les trois lignes ne s'additionnent pas est une carte qu'on
soupçonne. `demo:nutrition` portait une assertion qui **encodait le défaut**
(`total = daily + training`) — réécrite sur le net, 5 critères N11, **vérifiée rouge** en forçant
la constante à 0. Frontière NON franchie, délibérément : le même passage a montré que les macros
N10 sont en substance une **cible d'apport** (leurs trois sources sont des références d'apport, et
leur somme en kcal ne coïncide pas avec la dépense affichée sur la même carte) — c'est la ligne
que seul un avis diététicien peut trancher, la question part telle quelle au professionnel.
**22 gates verts, E2E 13/13, golden 900 inchangé** — la nutrition ne touche aucune séance.

**O-16 livré — l'estimation énergétique n'oppose plus « aucune » borne d'âge** (voir
ARCHITECTURE.md « O-16 ») : trouvé dans le même passage que N11. `dailyEnergy()` repose sur
**Mifflin-St Jeor, validée chez l'ADULTE**, et sur le NAP de la FAO — et n'opposait **aucune**
borne d'âge : un profil de 12 ans recevait « 1 750–2 480 kcal » et « protéines 60–90 g/j », un
chiffre qui a l'air précis alors que l'équation est hors de son domaine (à 12 ans l'âge sort même
de la bande 14–90 de `basalRange`, donc le moteur retombait sur l'enveloppe 25–55 ans sans le
dire). La garde IMC ne voyait rien : l'IMC d'un adolescent de gabarit normal l'est aussi. Même
angle mort que **R15.7-C** avait fermé côté FORMAT, jamais rejoué sur l'écran de nutrition arrivé
après. **Décision du fondateur** : borne à 16 ans, coupant l'estimation journalière (N8–N11 +
macros) et **jamais le ravitaillement d'effort** (N1–N7) — un adolescent qui roule trois heures a
besoin de savoir quoi boire, pas d'un tableau calorique ; refus sur un âge **connu** seulement
(un âge absent n'est pas une preuve de minorité). Débusqué en le corrigeant : **le message
d'orientation de la garde IMC n'a JAMAIS été affiché** — `bmiGuardNotice` le porte depuis l'audit
v6 et son commentaire dit « l'UI peut afficher ce message à la place », mais la carte montrait
« Renseigne ton poids » dans les TROIS cas de refus, renvoyant une personne hors bornes (et
maintenant un mineur) corriger une donnée qui n'était pas en cause. Point unique
`energyRefusalNotice()`, exposé par `EBV2.energyRefusal`. Un garde-fou dont personne ne lit le
motif est un garde-fou à moitié posé — la forme d'O-9 appliquée à un message d'interface.
8 critères en CI, **vérifiés rouges** en abaissant la borne à 0.
**22 gates verts, E2E 13/13, golden 900 inchangé, registre 15/15.**

**U1–U7 livré — le premier contact** (traversée côté usage, voir `RAPPORT_TOUR_USAGE.md` et
ARCHITECTURE.md « U1–U7 ») : cinq corrections qui ne viennent d'aucun banc, mais d'avoir traversé
la PWA **comme un utilisateur sur téléphone**. Aucun des 22 gates ne les regardait — ils mesurent
tous ce que le moteur PRODUIT, jamais ce que la personne LIT. **U1** : le premier écran d'un plan
créé à l'instant pouvait annoncer « 🌿 La vie a pris le dessus — trois séances sont passées ». Le
plan démarre au lundi de la semaine en cours (R8/R9, décision juste) et `missedSessionsCheck` ne
distinguait pas « tu as décroché » de « ton plan n'existait pas encore » — **1 jour sur 7
(dimanche) → 0 sur 7**, en lisant `plan_start` qui portait déjà l'information. C'est le plus grave
du lot : toute la boucle R4 est construite pour ne jamais reprocher, et consoler quelqu'un qui n'a
rien fait de mal est pire qu'un reproche. **U2** : `greeting()` connaît l'heure depuis toujours,
mais la phrase disait « point du **matin** » en dur — à 14 h l'écran affichait « Bon après-midi
C'est l'heure du point du matin » ; point unique `pointLabel()` (matin/jour/soir). **U3** : le
« score d'audit 70/100 » était montré à l'athlète — mesuré sur 30 profils, médiane 100, et les
3 plans sous 80 sont **les trois Ironman**, avec **0 violation dure** : celui qui prépare
l'épreuve la plus dure recevait la note la plus basse, pour un plan valide. **U4** : le ⇄
d'échange de jours faisait **18×14 px** (WCAG 2.5.8 : 24×24 minimum) — 44×44 au doigt désormais.
**U7** : la séance attendait la météo (`await fetchWeather()` avant le calcul, timeout de
géolocalisation) — **3 262 ms → 782-957 ms** en lançant la recherche à l'ouverture du diaporama,
zéro comportement changé. Garde : `tests/e2e/smoke-usage.mjs`, **14e suite E2E**, U1 balayé sur
les **sept jours** (la fenêtre dépendait du jour — même leçon que le banc R14 en R20.7),
**vérifiée rouge** en réintroduisant les cinq défauts (5 échecs sur 9). **Deux de mes constats
initiaux étaient FAUX** et restent écrits dans le rapport : la coche ○ n'a jamais été trop petite
(son `::after` la porte à 44×44, mon instrument lisait le mauvais rectangle) et les 3,2 s
n'étaient pas une temporisation. Trois faux constats sur sept, tous de la même famille — une
mesure qui porte sur une grandeur voisine de celle qu'elle nomme.
**22 gates verts, E2E 14/14, golden 900 inchangé.**

**U8 + U1b livré — la deuxième semaine d'usage** (voir `RAPPORT_TOUR_USAGE.md` 2ᵉ partie) : dix
jours vécus dans l'app — séances validées, verdict rouge, décrochage réel, drapeau douleur.
**Cinq soupçons, UN défaut réel : quatre étaient mon instrument**, et c'est le résultat le plus
utile du tour. **U8** : le moteur matérialise le repos par une séance `{d:"rs", name:"OFF"}` —
bon choix côté plan (le repos se VALIDE et compte dans la série), mais le héros du jour testait
`res.sessions.length`, qui vaut donc 1. L'athlète lisait un **« OFF »** sec avec un « Le détail de
la séance » qui n'ouvre rien, pendant que la branche écrite exactement pour ce cas — « 😌 Repos
aujourd'hui. Prochaine séance : Mar 04/08 · Sweetspot vélo » — n'était **jamais atteinte** : le
bon message existait et était mort. Mesuré : **153 jours de repos sur 441** en semaine 1 (un tiers
des ouvertures) et **63 profils sur 63 démarrent par un lundi de repos** — quelqu'un qui crée son
plan un lundi, après 37 questions, recevait « OFF » comme tout premier écran. Aucune minute
ajoutée : on ne fabrique pas une séance pour occuper quelqu'un. **U1b** : `smoke-usage`
n'assertait que « la relance ne se déclenche PAS sur un plan neuf » — critère **satisfait en
supprimant la fonctionnalité**, vérifié (U1 reste vert avec `missedSessionsCheck` vidée). Le
miroir manquait : on décroche neuf jours pour de vrai, la relance doit apparaître. Les quatre faux
constats, consignés : la validation enregistre bien (je lisais le haut de page non défilé), la
relance ne manquait pas (seuls 2 jours d'entraînement avaient été ratés), le drapeau douleur se
lève bien (`confirm()` natif, que Playwright rejette par défaut), et le chemin pour signaler une
douleur existe (feedback post-séance). Règle qui en sort : **avant d'écrire qu'une chose est
cassée, la casser exprès et vérifier que la mesure change** — c'est ce qui a démasqué les quatre.
**22 gates verts, E2E 14/14 (12 assertions d'usage), golden 900 inchangé.**

**U9 + U10 livré — la fin du plan** (voir `RAPPORT_TOUR_USAGE.md` 3ᵉ partie) : affûtage, veille,
jour J. Les bandeaux de fin sont bons et tombent au bon jour (« ✂️ L'affûtage commence », « 🎉
Veille de course », « 🏁 Jour de course »). Deux défauts derrière. **U10** : l'en-tête de
`notifications.js` promet depuis son écriture « UNE seule fois, jamais de rafale » — le garde
`relanceSent` ne couvrait que la NOTIFICATION, le bandeau se ré-affichait à chaque rendu. Mesuré
sur un plan de 10 semaines sans rien cocher : présent de **J+7 à J+70, soit 64 jours d'affilée**,
veille et JOUR J compris. Le matin de sa course, la personne lisait « 🏁 Jour de course… » suivi de
« 🌿 La vie a pris le dessus — trois séances sont passées ». Même famille qu'U1, au pire moment
possible. La clé du « déjà dit » devient le **premier** jour du décrochage et non le dernier —
c'était le point, le dernier change tous les jours donc ne dampait rien ; **14 jours affichés sur 16
échantillonnés → 1**, et **jamais la veille ni le jour J** (R13.4 : le jour J n'est pas un jour
d'entraînement). Vérifié que le message **revient pour un nouveau décrochage** (épisode 1 J+7,
cinq jours de séances validées, épisode 2 J+22) — un correctif qui l'éteint à vie serait pire que
le défaut. **U9** : le refus « course trop proche » est le moment le plus honnête du produit (il
décline pour ne pas blesser, explique, propose deux issues, offre « Corriger ma réponse ») — et sa
dernière phrase était écrite en dur : « Te vendre une préparation **d'Ironman** en un mois serait
te mentir ». **9 refus sur 9**, sur les sept sports : un nageur qui prépare un 1500 m et un coureur
qui prépare un 10 km s'entendaient parler d'Ironman. Devient « te vendre **cette préparation** en
3 semaines » — aucune table de libellés créée dans le schéma (ils vivent dans `config.js`, en
dupliquer une copie ferait deux sources de vérité). **U9b** : plus de « format plus court » proposé
à qui a déjà le plus court du sport. Gardes : `U9` au banc v6 (9 sports), `U10` dans `smoke-usage`
— **vérifiés rouges** (U10 : 4 affichages sur 4 sans le correctif).
**22 gates verts, E2E 14/14 (13 assertions d'usage), golden 900 inchangé, registre 15/15.**

**P11 livré — le modèle de gain n'avait qu'un régime, celui de l'entraîné** (voir ARCHITECTURE.md
« P11 ») : `G_PLAFOND.thrPace = 0,15` vient de Barnes & Kilding 2015, qui mesure ce que gagne
l'**économie de course** — le raffinement à la marge d'un geste déjà acquis. Les premiers mois de
quelqu'un qui part de zéro sont un autre phénomène (débit cardiaque, capillarisation, densité
mitochondriale, apprentissage du geste), donc pas la même borne. `regimeDebutant(volRecentH)` rend
une position **interpolée** entre 4 h/sem (entraîné, modèle publié inchangé) et 1,5 h/sem (part de
zéro) ; trois grandeurs la suivent — plafond de discipline (thrPace 0,25), constante de temps
(τ 20 → 9 semaines), plafond absolu (0,32). **Le déclencheur est MESURÉ, pas déclaré** : il se lit
sur `vol_recent`, jamais sur `history` — troisième application de la leçon R14.1.
**Ma première calibration était fautive et est retirée** : elle visait à faire entrer dans la
fourchette la trajectoire réelle du fondateur (0 → 46'30 au 10 km en 8 semaines, sur un passé de
sélectionné en équipe de France junior) et donnait **32,1 % de gain sur 16 semaines**, affiché à
tout le monde. Calibrer sur UN cas, et le plus favorable qui soit, c'est exactement ce que
HERITAGE interdit — 7 % des sujets gagnent ≤ 0,1 L/min et 8 % ≥ 0,7 L/min sous programme
identique. Le cas réel reste donc **dehors** de la fourchette, et le code le dit.
**Le piège du zéro, deux maillons de plus** : `bridge.ts` effaçait `vol_recent = 0` (`|| null`) —
0 h projetait **7,43 %** contre **8,55 %** à 1 h, déclarer zéro donnait moins que déclarer une
heure — et `volumeFactor` portait le même défaut, LATENT, qui aurait mordu dès la correction du
pont. C'est le piège que R20.1 avait nommé sur la rampe R10 ; la leçon n'est pas de le corriger,
c'est de le corriger **sur tout le chemin**. Mesuré après : 7'00/0 h/16 sem passe de 7,43 % à
**21,50 %**, et au-dessus de 4 h/sem **rien ne bouge au chiffre près** (5,18 % · 3,02 % · 2,05 %).
Le prototype `feasibility.ts` cesse de porter sa copie des constantes et les IMPORTE (R11.1).
Gardes **P11-A à P11-F** au banc `audit:r14.1`, qui assertent les DEUX moitiés — l'inversion
disparue ET l'entraîné intact — **vérifiées rouges** (3 sur 6) contre le moteur d'avant P11.
**22 gates verts, E2E 14/14, golden 900 inchangé** — la projection ne touche aucune séance.

**O-21 : mécanisme corrigé — « dev ≤ pic » n'a pas d'objet quand le pic n'a aucune semaine de
charge** (voir `BUGS_OUVERTS.md` « O-21 ») : **ma piste du matin était fausse et c'est écrit.**
J'avais noté « la courbe déclarée décroît » ; mesuré, elle ne décroît pas — **la seule semaine de
PIC de ces plans est une semaine de RÉCUPÉRATION** (102 min) quand les semaines de dev montent à
162. L'auditeur exclut les décharges de ses candidats (à juste titre), le pic ne contribuait donc
AUCUN candidat, et la règle concluait « la semaine de volume max dépasse la meilleure semaine
peak » — énoncé **faux** : il n'y a pas de semaine de pic à dépasser. La récup dans le pic est
VOULUE (C27b la refuse, mais R18.5 a tranché que la cadence de l'athlète l'emporte sur tout
placement) ; ce qui n'avait jamais été considéré, c'est sa conséquence sur une prépa courte, où le
pic tient en une seule semaine. La règle dit désormais ce qui est vrai — « aucune semaine de PIC
en charge » — dans le canal des AVERTISSEMENTS, la cause étant un arbitrage assumé. Même famille
que les trois invariants retirés par R20.6. **Mesuré sur 729 plans sans date : 216 profils
portaient cette violation dure insatisfiable → 0, réparations 952 → 356** (596 coupes qui ne
réparaient rien, et qui ne coupaient pas la même semaine selon l'allure).
**Trois de mes mesures ont visé la mauvaise population dans la même heure** : le corpus V2 (702)
et mon premier balayage (486) donnaient **0 occurrence** et j'ai failli retirer le correctif comme
inerte (le sort de C23b) — les deux portaient sur des plans DATÉS, or le défaut ne vit que sur les
plans **sans date de course** (`minWeeks`), où il touche **29,6 %**. Le golden ne bouge pas pour
la même raison : ses 900 profils portent tous une date.
**Ce qui reste est un ARBITRAGE, pas un défaut** : l'inversion persiste (2 cas) et sa cause est en
amont — les courbes déclarées diffèrent (786 min à 5:45/km contre 852 à 7:00/km, à `vol_max`
identique) parce que la sonde de capacité lit des plafonds de séance **exprimés en distance**, qui
donnent mécaniquement plus de minutes à qui court moins vite. La question est d'entraînement : la
sortie longue d'un 10 km se prescrit-elle en distance ou en temps ? Tout le moteur compte déjà en
TEMPS, ce qui plaide pour le temps — mais c'est une décision de fond.
**23 gates verts, E2E 16/16, golden 900 inchangé, registre 20/20.**

**A-5 · A-6 · O-19 livrés — les trois angles morts de la mesure** (audit complet du 03/08/2026,
voir ARCHITECTURE.md et `BUGS_OUVERTS.md` §3) :

**A-5 — le journal de projection existe enfin.** Le registre l'appelait « l'angle mort le plus
profond du prédicteur » : les bandes `h`, `G_plafond`, `k_structure` de P2bis et le régime P11
sont des heuristiques que **rien ne valide**. C'est le seul chantier du dépôt dont le coût
AUGMENTE avec l'attente — tous les autres défauts restent aussi chers demain, celui-ci détruit
chaque jour une donnée qui n'existera plus jamais. `endurabuild/js/projection-log.js` écrit **une
entrée par semaine ISO** (la projection ne bouge pas d'un jour à l'autre : l'adhérence est une
fenêtre glissante de six semaines, P1) portant de quoi REFAIRE le calcul sans le code de
l'époque : horizon, références mesurées, `gainPct`, `gainBand`, adhérence, confiance, temps
annoncés, et le MOTIF quand le moteur refuse de projeter. `noteRaceResult()` referme la boucle au
jour J en attachant le temps réel **à son horizon d'origine** — `raceResult.predicted` ne
contenait que la prédiction RECALCULÉE le jour même, qui ne dit rien de ce qui était annoncé
quatre mois plus tôt. **Il n'est relu par AUCUNE partie du moteur, et c'est sa garde principale** :
un journal qui rebouclerait serait une seconde source de vérité (R11.1/R20.5/U9) et, pire, une
boucle qui se confirme elle-même. `smoke-projlog.mjs` (**16ᵉ suite E2E**) l'asserte sur ses deux
moitiés, **vérifiée rouge** (7 critères sur 11). La calibration reste HUMAINE et hors ligne : P11
a montré qu'un cas unique ne calibre rien (HERITAGE).

**A-6 — ce n'était pas de l'hygiène, c'était une échéance datée.** Simulé le temps qui passe :
`banc_grand_public` et `bench_r13` MOURAIENT dès **+90 jours**, `banc_invariants` à **+200** — sur
une exception non rattrapée (`ENTREE_INVALIDE : au moins 22 semaines avant la course`), donc un
gate rouge avec une trace de pile à la place d'un verdict, et `banc_invariants` avait **neuf
semaines** devant lui. Point unique `bench-dates.cjs` : `courseDans(N)` rend le dimanche situé
exactement N semaines entières après le lundi courant — jour fixe ET horizon fixe, les deux
mécanismes réglés d'un coup. Cinq bancs ancrés, **vérifiés verts à +400 jours**, contre-preuve
faite. **Le golden garde ses dates ABSOLUES, délibérément** : mesuré 0 écart à +200 jours — un
golden doit être REPRODUCTIBLE, pas suivre le calendrier ; l'application mécanique l'aurait fait
dériver chaque semaine. Trouvé en chemin : la prose d'`audit_v7` annonçait depuis R15.1 « elles
sont désormais RELATIVES » alors que **quatre dates absolues subsistaient**.

**O-19 — la prose décrivait une correction que la commande n'avait jamais reçue.** L'entrée
annonce depuis R20.7 que « la semaine de course est exclue » et que « la date est ancrée » ; sa
commande ne faisait ni l'un ni l'autre et renvoyait **12/12** contre 30 % annoncés. Balayée sur
les sept jours, à moteur inchangé : de **2/12 (82 %) à 12/12 (0 %)** selon le seul jour de la
course. Le 0 % est l'artefact que R20.6 avait retiré du banc d'invariants (I6/I8/I12 : « la course
objectif n'est pas une séance d'entraînement »), jamais rejoué ici — **sixième occurrence de la
famille R20.7**. Ma première correction était insuffisante et c'est dit : exclure « la semaine qui
porte la course » supprime trois profils légitimes (sur un 10 km, l'unique semaine d'affûtage EST
la semaine de course, sept jours terminés par l'épreuve), et normaliser par jour disponible ne
suffit pas non plus. Bosquet compte des séances PAR SEMAINE : la mesure DÉCLARE son domaine (≥ 5
jours) et s'ancre au lundi. **3/12 sous 80 %, moyenne 80 %, identique les sept jours.**

**Et 2 motifs de garde sur 20 n'en étaient pas** : `O-9` acceptait le VERT ET LE ROUGE (écrit
ainsi tant qu'O-20 rendait le banc rouge), `O-21` — le mien, écrit le matin même avec le défaut
que j'auditais — acceptait n'importe quel nombre. Les deux épinglés sur la valeur mesurée.
**23 gates verts, E2E 16/16, golden 900 inchangé, registre 20/20.**

**H-1 · O-22 · O-23 livrés — Strava est branché, et le premier défaut remonté par une DONNÉE
RÉELLE** (03/08/2026, voir ARCHITECTURE.md « O-22 / O-23 ») : le relais est déployé (app Strava,
worker Cloudflare, `STRAVA_RELAY_DEFAULT` renseigné — le `client_secret` vit uniquement en
variable de type *Secret* côté Cloudflare, jamais dans le dépôt), et le fondateur a branché son
compte. **O-22** : l'import annonçait **188 W** pour une FTP déclarée à **230** — 18 % en dessous,
sur une valeur PROMUE en référence vivante, donc toutes les zones vélo du plan. La cause est une
erreur de grandeur : le coefficient 0,95 code la règle « FTP ≈ 95 % de la meilleure puissance sur
20 MINUTES », il était appliqué à la puissance normalisée d'une **sortie entière** (188 ÷ 0,95 =
198 W = la meilleure NP du fondateur, sur 1 h 17), et le libellé « meilleure sortie ≥20min » se
lisait comme « meilleure puissance sur 20 min ». **Le sens de l'erreur change avec l'athlète, et
c'est ce qui la rend dangereuse** : basse pour qui roule en endurance (sous-charge), HAUTE pour qui
a une seule sortie courte et dure dans ses 50 dernières activités — le plan prescrit alors des
watts qu'il ne tient pas. Cascade livrée : FTP déclarée du profil (`/athlete`, périmètre
`profile:read_all`), sinon la **meilleure moyenne glissante sur 20 min réelles** (`streams`,
`bestRollingMean` borné par le TEMPS et non par le nombre d'échantillons) × 0,95 ; `thrPace` ne
retient plus que les sorties de 10-15 km. Le registre recommandait « ne plus estimer, et le dire »
d'abord, parce qu'il chiffrait le coût de la FTP déclarée à une ré-autorisation de tous les
comptes connectés — **il n'y en avait aucun**, le relais venait d'être déployé.
**O-23, et sans lui le correctif d'O-22 serait resté INVISIBLE** : trouvé sur la capture du journal
du fondateur, trois imports du même jour. `latest()` triait sur la seule DATE, et
`Array.prototype.sort` est **stable depuis ES2019** — à date égale l'ordre d'insertion est
conservé, donc `[0]` est le PREMIER inséré, le plus VIEUX. Une fonction nommée `latest` qui rend le
plus ancien. Un nouvel import aurait écrit 230 W dans le journal et `S.answers.ftp` serait resté à
188. Le moteur, lui, avait raison depuis toujours (`measuredRate` trie en croissant et prend le
dernier) : deux chemins lisaient le même journal et en tiraient deux valeurs — la forme que R11.1
interdit, ici entre le moteur et l'UI. Départage par POSITION, le journal étant append-only.
**Ce qui reste** : `css` est encore estimée depuis la nage la plus rapide EN MOYENNE, qui n'est pas
un CSS — non mesuré sur donnée réelle, suivi dans O-22.
**23 gates verts, E2E 16/16, golden 900 inchangé, registre 22/22.**

**O-24 livré — le cache de l'app servait la version d'il y a neuf lots** (voir ARCHITECTURE.md
« O-24 ») : **le défaut le plus coûteux trouvé jusqu'ici, parce que c'est le seul dont aucune
mesure ne pouvait rien dire.** Les 23 gates verts, le golden vert, le correctif sur `main` — et
l'utilisateur voyait toujours l'ancien comportement. Trouvé en cherchant pourquoi O-22 et O-23,
tous deux livrés et mergés, ne changeaient rien sur le téléphone du fondateur. `endurabuild/sw.js`
sert l'app en **cache-first** (bon choix : l'app doit marcher hors ligne) et son corollaire n'était
tenu par rien — le cache n'est purgé qu'au changement de `VERSION`, et `VERSION` était une
constante à incrémenter **de mémoire**. Mesuré : dernier bump à RV, depuis **12 commits touchant
14 modules servis** — U14, U15, U16, I14b, O-21, A-5, A-6, O-22, O-23, neuf lots qui n'atteignaient
aucun navigateur ayant déjà ouvert l'app. Le fondateur a redéployé son worker, s'est reconnecté, a
réimporté, et a revu 188 W : il testait le code d'avant O-22. Second trou dans la même liste :
`ASSETS`, écrite à la main aussi, oubliait `measured.js`, `projection-log.js` et `tab-week.js` —
trois modules VIVANTS, donc trois trous dans la promesse « ça marche hors ligne ». La forme est
connue, l'habillage est nouveau : « un correctif que la cascade annule est un correctif qu'on croit
avoir » (R18.1, U16) — ici c'est le CACHE qui annule, et il annule **tout**, pas une règle CSS.
**Correctif : la VERSION est l'empreinte** — `scripts/buildSW.mjs` la calcule comme le hachage du
contenu servi et dérive `ASSETS` du disque ; elle change si et seulement si un fichier change, il
n'y a plus d'état « à jour dans le dépôt, périmé dans le service worker » (R11.1 appliqué au couple
fichiers ↔ numéro qui les version). Le NOM entre dans le hachage autant que le contenu : retirer un
module change ce que l'app sert hors ligne. **`npm run check:sw`, 24ᵉ gate CI**, même motif que
`check:app`, **vérifiée rouge** en modifiant un module sans reconstruire. L'oubli devient
impossible au lieu d'improbable — la seule correction qui vaille pour un défaut dont la cause était
« quelqu'un doit s'en souvenir ».
**24 gates verts, E2E 16/16, golden 900 inchangé, registre 23/23.**

**O-25 livré — le seuil importé n'était pas un effort maximal, et l'import défaisait la
correction** (voir ARCHITECTURE.md « O-25 ») : remonté par le fondateur une fois O-24 fermé, donc
**le premier retour où il voyait enfin le code livré**. Un symptôme, deux causes. **(a)**
`disciplineRegistry.ts` énonce le raccourci en entier — « un 10-15 km récent **À FOND** est une
bonne estimation » — et O-22 n'avait posé que la fenêtre de distance : une sortie longue tranquille
de 12 km y entre et n'est pas un test. Mesuré : **5'37/km annoncé pour un seuil réel à 4'42**,
55 s/km, toutes les zones de course décalées d'un cran, et l'erreur est systématiquement BASSE
(une moyenne de sortie ne peut qu'être plus lente que le seuil) donc sous-charge silencieuse. Même
défaut qu'O-22 sur un autre poste : **un raccourci de protocole appliqué à une grandeur qui n'est
pas celle qu'il attend.** Cascade calquée sur celle de la FTP : une COURSE déclarée telle sur
Strava (`workout_type === 1`, 10-15 km), sinon la **meilleure moyenne glissante de 10 min** lue
dans le flux de vitesse — le protocole du seuil est « 3 min + 10 min à fond », et cette grandeur
vit À L'INTÉRIEUR des séances au lieu d'être noyée dans une moyenne —, sinon **aucune estimation
et on le dit** (P7/P8). `bestRollingMean` sert les deux références, écrite une seule fois (R11.1).
**(b)** « la saisie manuelle prime TOUJOURS sur l'import » était faux : saisie et import atterrissent
dans le MÊME journal à la MÊME date, et le départage par position posé par O-23 fait gagner le
dernier inséré — l'import, puisqu'on corrige d'abord et qu'on réimporte ensuite. **Conséquence
directe de mon correctif O-23** : juste, mais incomplet — il fallait dire ce que « le plus récent »
signifie quand deux sources parlent le même jour. Une valeur **saisie** (ou issue d'un retest guidé)
bat désormais tout import de la même date ; au-delà la date reprend la main, un import postérieur
dit quelque chose de neuf et geler la valeur à vie serait le défaut symétrique. Le message cesse de
promettre « toujours » et dit ce qui est vrai. Cinq critères `O-25`, dont trois sur
`bestRollingMean` (elle trouve le bloc rapide ; un effort de 8 min ne rend PAS une « moyenne de
10 min » ; la fenêtre est bornée par le TEMPS et non par le nombre de points), le critère (b)
**vérifié rouge** — il rendait exactement le 5'37 du symptôme.
**24 gates verts, E2E 16/16, golden 900 inchangé, registre 24/24.**

**R21 livré — le coach proactif : détecter, recalculer, prévenir** (handoff « notifications +
recalcul déclenché », voir ARCHITECTURE.md « R21 » — banc `npm run demo:proactif`, **25ᵉ gate CI**) :
`src/coach/` détecte une déviation après chaque ingestion de séance, recalcule la fenêtre de
14 jours et notifie en deux lignes. **Trois des quatre prémisses du handoff ne tenaient plus et
c'est dit** : « R13 » est pris (17ᵉ gate, 22 occurrences en doc) → livré sous **R21** ; « Strava
hors scope, décision juin 2026 » est périmé (OAuth déployé le 03/08) — aucune intégration n'est
AJOUTÉE, mais le détecteur consomme `IngestedSession` **sans regarder la provenance**, sans quoi un
athlète connecté recevrait moins de coaching qu'un athlète qui téléverse ; « le module de recalcul
existant (floors de récup) » n'existe pas sous ce nom — le vrai est `adjustDay`, qui ajuste UN jour,
donc la fenêtre est construite ici en réutilisant `reduceDay()` (aucune re-génération) ; et
**GPX/TCX étaient absents** alors que `measured.ts` les annonce depuis son écriture (écrits,
zéro dépendance). **La garantie commande tout le reste** : le Sprint 2 pose « on ne rattrape JAMAIS
le volume manqué », donc **ce module ne sait que réduire** — un signal « en-dessous » allège la
rampe à venir au lieu de la charger. Trois règles pures à seuil, sans score composite (un agrégat
serait inauditable) : intensité > 10 % comptée **au bord de la bande** et non à son centre, séance
manquée après 24 h (jamais la veille — c'est le reproche faux d'U1), charge 7 j > 15 % via
`loadWindow` **importée de l'ajusteur**. Les 14 jours sont une BORNE : au plus 3 jours de qualité
touchés, jamais le passé, tout journalisé.
**Un défaut dans mon propre module, et ma contre-preuve était fausse d'abord.** La garantie était
placée APRÈS la sortie anticipée (`if (rien n'a bougé) continue;` puis `if (hausse) throw`) : une
hausse sortait par le `continue`, était appliquée au plan et l'assertion était du **code mort** —
et elle n'est pas structurelle, mesuré, `reduceDay(f = 1.2)` fait passer un bloc de **5 à 6
répétitions** (le `Math.min` protège `durationMin` et `distanceM`, **pas `reps`**). Douzième
paiement de la leçon. Puis mes trois premières cassures délibérées sont sorties **VERTES** : le
critère de fenêtre **recalculait sa borne depuis la constante testée** (400 déplaçait le poteau avec
le ballon), et mon instrument **comptait les lignes `✖`** alors qu'une exception n'en produit
aucune — la garde avait levé, ma mesure regardait ailleurs. Sixième occurrence d'une mesure portant
sur une grandeur voisine de celle qu'elle nomme, cette fois dans l'instrument que je venais
d'écrire. **Six cassures, six rouges** après correction.
**25 gates verts, E2E 16/16, golden 900 inchangé, registre 24/24.**

**R22 livré — la préparation tronquée : le refus « course trop proche » devient franchissable**
(brief « transformer ce hard block en option de bypass contrôlée », **décision du fondateur du
04/08/2026 : on garde le plancher et on autorise tout ce qui est au-dessus** — voir
ARCHITECTURE.md « R22 », banc `npm run demo:troncature`, **26ᵉ gate CI**) : sans le drapeau
`truncate_prep`, le refus R11.4 est **intact mot pour mot**, jusqu'à sa dernière phrase (« serait
te mentir, et te blesser »). Avec lui, le pont pose une `plan_start` VIRTUELLE, laisse le
générateur produire le plan complet, puis **coupe le début et renumérote** — la périodisation
n'est pas touchée, et `§5` du banc le prouve : le plan tronqué est identique séance par séance aux
dernières semaines de celui d'un athlète parti à l'heure. **Trois écarts avec le brief, mesurés
avant d'écrire** : le seuil n'est pas 16 semaines mais dépend du sport ET du format (6 pour un
5 km, 36 pour un Ironman — « 16 » est le cas du marathon, et une date virtuelle à `course − 16`
donnerait 20 semaines de trop à un Ironman) ; « tronquer les 2 premières semaines » est le cas
particulier de 14/16, le nombre retiré est `need − reste` ; et **un plancher absolu unique de
8 semaines ne tient pas** — il autoriserait un Ironman préparé en 8 semaines, exactement ce que
R11.4 existe pour refuser. Le plancher est donc **dérivé** plutôt qu'inventé : on ne retire que des
semaines de MISE EN ROUTE, donc au plus la durée de la phase `base` (30 %) — la formulation du
bandeau que le brief demande lui-même. Vérifié sur les **12 formats** : tout ce qui est au-dessus
du plancher est autorisé, tout ce qui est en dessous refusé avec un motif dédié, et le bouton
n'apparaît PAS quand le contournement serait de toute façon refusé (`bypass.possible`, transporté
par l'erreur — le recalculer côté UI ferait deux règles de plancher, R11.1).
**Une erreur à moi, attrapée par la spec** : ma première date virtuelle reculait de `need` et
livrait 15 semaines au lieu de 14 — le moteur compte sa travée INCLUSIVEMENT ; le témoin du §5
portait la même faute, et le corriger là aussi importait, sinon la comparaison aurait été fausse
**dans le sens rassurant**.
**Conséquence sur le manifeste, assumée** : « course trop proche » quitte la liste des blocages
durs pour devenir « course sous le PLANCHER de préparation ». C'est un alignement sur O-17 — le
critère de dureté est « l'athlète ne peut pas évaluer le risque, ou l'erreur est irréversible », or
« ai-je déjà une base ? » se tranche et rater sa course se rattrape.
**26 gates verts, E2E 16/16, golden 900 inchangé, registre 24/24.**

**R22b livré — le refus emmène sur la réponse en cause, et SEPT suites E2E sortaient en code 0**
(retour du fondateur sur capture, voir ARCHITECTURE.md « R22b ») : le bouton « Corriger ma
réponse » renvoyait à la **dernière** étape du questionnaire quelle que soit la clé refusée — sur
un refus `race_date`, l'athlète atterrissait sur une étape sans date et devait la chercher. Le
refus NOMME pourtant la clé et l'affiche juste sous le bouton : l'information était là, le bouton
ne la lisait pas. L'étape est désormais **trouvée** (on cherche laquelle rend `data-input="<clé>"`)
et non déclarée — une table « clé → étape » deviendrait fausse à la première réorganisation, et
U14 en a justement réorganisé l'ordre. Le champ est focalisé, `showPicker()` ouvre le calendrier
natif, le focus reste le repli. Vaut pour TOUTE clé refusée, pas seulement la date.
**Et la contre-preuve a trouvé plus grave.** En cassant le ciblage, la suite est sortie **verte** :
elle MOURAIT au lieu de rapporter (exception non rattrapée, aucune ligne `FAIL`, et mon comptage de
lignes en concluait « vert » — **la faute d'instrument de R21, refaite le même jour**). Remesuré
sur le CODE DE SORTIE, la vraie grandeur : `run-all.mjs` lit `r.status`, mais `report()` se
contente de RENDRE 0/1 sans jamais sortir — **sept suites sur dix-sept finissaient par
`report();`**, donc sortaient en 0 quoi qu'elles trouvent, CI comprise. Parmi elles les gardes
d'U1/U8/U10/U14/U15/U16, des sept questionnaires (R20.1), du plancher typographique (R16.8), et
celle écrite le matin même (A-5). Même mécanisme qu'O-9/R20.6. **L'ordre de R20.6 a été respecté** :
les sept mesurées d'abord — **0 échec sur 137 assertions**, aucune dette cachée — AVANT d'être
rendues bloquantes. Garde `smoke-refus.mjs` (**17ᵉ suite**), 8 critères, **vérifiée rouge** sur
deux cassures.
**26 gates verts, E2E 17/17, golden 900 inchangé, registre 24/24.**

**S-4 · S-8 · S-CACHE livrés — les quatre correctifs de la grille de sécurité** (voir
ARCHITECTURE.md « S-4 / S-8 / S-CACHE », garde `tests/e2e/smoke-securite.mjs`, **18ᵉ suite**) :
**(1)** le bouton d'import FIT disait « Importer **un** fichier » alors que le lot MARCHE depuis
le 28/07 (`multiple` + `for (const f of files)`) — la priorité n°1 de l'état des lieux
(« fastidieux, fichier par fichier ») était **un mot**, pas une fonctionnalité manquante.
**(2)** Borne de taille d'import (25 Mo, `src/readiness/importLimits.ts`), contrôlée AVANT
`arrayBuffer()` et **rejouée dans les trois parseurs** — une garde qui dépend de son appelant n'est
pas une garde. Ce n'est pas une faille (l'app est locale, le fichier vient de l'athlète) mais un
déni de service contre soi-même, au pire symptôme : une app qui ne répond plus, sans un mot.
**(3)** CSP en `<meta>` : `connect-src` borné aux hôtes réellement appelés, relus DEPUIS LE CODE
par la garde. **Ma première écriture y mettait `https:` en plus** « parce que l'URL du relais est
configurable » — c'était se tromper de compromis, `https:` autorise l'exfiltration vers n'importe
quel hôte, soit exactement ce que la ligne existe pour empêcher ; `*.workers.dev` couvre le relais
déployé et tout worker monté selon `server/README.md`, et un critère interdit désormais le joker.
**(4)** Le service worker ne fait plus `skipWaiting()` : il attend que la page le demande. Il
prenait le contrôle EN PLEIN MILIEU d'une session — la page ouverte restait ancienne mais son
prochain import dynamique (`await import("./steps.js")`) venait du nouveau cache : une page
ancienne chargeant un module neuf. Bandeau « ✨ Nouvelle version prête », rechargement sur
`controllerchange` (jamais avant la bascule), `reg.update()` au retour dans l'app (une PWA installée
est gelée puis reprise, pas renavigée), et **rien à la première installation** — proposer « nouvelle
version » à qui vient d'ouvrir l'app serait faux. C'est la moitié qui manquait à O-24 : la version
du cache était devenue juste, sa PROPAGATION restait muette.
**Deux erreurs à moi, attrapées par les suites existantes** : `frame-ancestors` est **ignoré** en
`<meta>` (il exige un en-tête HTTP) — il ne protégeait de rien ET produisait une erreur de console
à chaque chargement, ce que les suites détectent comme « erreur JS » (**6/18 suites rouges** avant
de le retirer) ; et mon bandeau portait une taille littérale `14px`, refusée par le plancher
typographique de R16.8 — l'échelle `--fs-*` est la seule source. L'anti-cadrage reste donc une
limite d'hébergement NOMMÉE : GitHub Pages ne permet pas de poser cet en-tête.
**26 gates verts, E2E 18/18, golden 900 inchangé, registre 24/24.**

**H-1 livré — la VFC devient une MESURE, plus un adjectif** (voir ARCHITECTURE.md « H-1 (VFC) »,
banc `npm run demo:hrv`, **27ᵉ gate CI**) : l'état des lieux appelait le HRV « l'écart
connaissance/implémentation le plus ancien ». Le défaut mesuré n'est pas « le HRV manque » —
`hrvStatus` est collecté depuis le Sprint 2 et pèse **−2 sur le registre OBJECTIF**, celui que
l'audit v6 (A4) a créé précisément pour qu'*« un ressenti déclaratif ne puisse pas effacer une
mesure »*. Or `hrvStatus` EST un ressenti déclaratif : son propre type annonce « vs moyenne
glissante 7j de l'athlète » et **rien dans le dépôt ne calculait cette moyenne**. L'athlète
cochait « basse » à l'œil, et ça valait deux points de mesure. **Quatrième paiement de la leçon
R14.1** — un adjectif auto-déclaré ne pilote aucun chiffre — avec l'ironie que le signal voisin,
la FC de repos, fait la bonne chose depuis l'audit v6.
`src/readiness/hrvBaseline.ts` : moyenne glissante **7 jours en espace log** (le rMSSD est très
asymétrique ; Plews et al. 2013 — la valeur d'un matin isolé est trop bruitée, c'est sa moyenne
hebdomadaire qui suit l'adaptation), bande « normale » = **±0,5 écart-type** (plus petit
changement qui vaille la peine, convention Hopkins), écart-type mesuré sur **28 jours** et non 7
(une bande calculée sur la même fenêtre que la moyenne se rétrécirait à chaque semaine calme —
le plan deviendrait hypersensible au moment où l'athlète va bien), et **refus de classer sous
7 matins** avec son motif (P7/P8). Le classement se fait en **un point**, dans le pont, comme le
drapeau douleur et le RPE. Comparée à la base → registre OBJECTIF, poids inchangé ; simplement
cochée → registre SUBJECTIF, et **le driver l'annonce** pour que l'athlète sache ce qui a compté.
Le piège du zéro est fermé aux deux bouts : 0, négatif et aberrant sont refusés (un 0 n'est pas
une VFC nulle), et la mesure du jour n'entre pas dans sa propre base — elle amortirait l'écart
qu'on cherche à voir.
**Le banc v6 a rougi, et le corriger valait mieux que le contourner** : `A4` s'appelle « signal
OBJECTIF non annulable par le déclaratif » et sa fixture passait une VFC **sans valeur ni base**
— elle utilisait donc un déclaratif comme signal objectif, la confusion même que le lot corrige.
Fixture alignée sur le titre, et **`A4b` ajouté** pour épingler la moitié nouvelle (une VFC
déclarée ne pèse pas comme une mesurée) : le banc couvre les deux faces au lieu de les confondre,
et `A4b` est **vérifié rouge** contre le moteur d'avant.
**27 gates verts, E2E 18/18, golden 900 inchangé, registre 24/24.**

**C30 livré — la sortie longue connaît l'épreuve, et n'y arrive qu'à moitié** (décision du
fondateur, 04/08/2026 : « quelque chose entre les deux : se rapprocher du temps visé sur l'épreuve
a minima, et au moins 70 % de la distance », voir ARCHITECTURE.md « C30 » et BUGS_OUVERTS.md
« O-26 ») : **la prémisse d'O-21 était fausse et elle reste écrite** — la sortie longue est
prescrite en TEMPS depuis toujours (`durCaps` en minutes), et entre 5:45/km et 7:00/km sur un
10 km elle fait **178 min contre 176** ; l'inversion résiduelle venait du SEUIL. Ce que la règle
du fondateur corrige est un AUTRE défaut, réel : la longue ne connaissait pas l'épreuve, et le
coureur **lent** était le plus mal servi — **47-50 min pour une course de 71 min** sur 10 km,
115-125 pour 156 sur semi. `src/engine/longRunSpecificity.ts` : le plancher vise le plus exigeant
de deux repères (90 % du temps de course PRÉDIT, 70 % de la distance en Z2), **jamais au-dessus du
plafond** — sur marathon, « se rapprocher du temps de course » voudrait dire 3 h 20 à 5 h 25 de
sortie longue, C23 plafonne à 180 et un plancher ne passe jamais devant un plafond. Il PROGRESSE
avec la phase (la cible est celle du pic ; un plancher plat contredirait la rampe R10), et
**`target_time` n'est pas lu** — laisser un objectif de chrono augmenter une charge, c'est ce que
`RV-INVARIANT` interdit sous CI.
**PORTÉE MESURÉE : 7 profils sur 180, et c'est le résultat le plus important du lot.** Cibles de
spécificité atteintes 24/48 → **31/48**, concentrées sur les débutants — pas sur la population que
la mesure désignait. La cause est nommée (**O-26**) : `blockBounds` jette le plancher déclaré par
le bloc et le remplace par un « plancher digne » de 30 min, par décision de l'audit v6 (D3-D7/D10,
« les planchers de séance ne gagnent plus contre la courbe »). Et **forcer le plancher ne marche
pas** — mesuré, les cibles tombent à **30/48** : le facteur limitant est le volume hebdomadaire
d'une prépa de format court (pic à 140-152 min, la longue y pèse déjà 36-39 %). La suite est un
arbitrage d'entraînement, pas du code — trois issues chiffrées dans O-26.
**Ma première garde valait zéro** : écrite sur l'INTENTION, elle était satisfaite par le moteur
d'AVANT — trois cassures, **trois verts**. Septième occurrence d'un critère qui nomme une grandeur
et en mesure une voisine, cette fois dans la garde d'un correctif que je venais d'écrire. Réécrite
sur les 7 profils déplacés avec leurs valeurs (`C30-A`, banc v6), **vérifiée rouge sur trois
cassures** ; **une quatrième reste verte et c'est publié** — passer la part de distance de 70 % à
50 % ne change rien, le repère TEMPS dominant partout : la moitié « distance » de la règle n'a
encore jamais mordu. Effet de bord favorable non visé : **O-19 passe de 3/12 à 2/12** profils sous
le plancher d'affûtage de Bosquet. Au passage, Riegel n'a plus qu'une écriture (R11.1) — la copie
de `feasibility` délègue au prédicteur.
**27 gates verts, E2E 18/18, golden 900 recapturé (121 profils, tous en course), registre 25/25.**

**U19 livré — « Continuer » désactivé disait non, sans dire pourquoi** (retour du fondateur,
06/08/2026 : *« questionnaire pour avancer »* — voir ARCHITECTURE.md « U19 ») : mesuré en
traversant les six écrans du triathlon, on **ARRIVE sur cinq d'entre eux avec « Continuer → »
désactivé** (opacité 0,4, `cursor: not-allowed` — c'est-à-dire rien au doigt), et **rien à l'écran
ne dit ce qui manque** ; l'un d'eux porte **six questions**, donc on ne sait même pas laquelle
bloque. Le blocage lui-même RESTE — ce sont des réponses dont le moteur a besoin, et une garde E2E
de swimrun dit déjà « impossible de continuer sur un format long sans les bases ». Ce qui n'était
pas défendable, c'est le silence : le manifeste range « informer » avant tout, et un bouton mort et
muet ne fait ni l'un ni l'autre. **Ce qui manque est DÉRIVÉ, pas déclaré** : aucune liste de clés
obligatoires n'est écrite dans l'UI (deux listes à deux endroits divergent toujours, R11.1) —
« obligatoire » est déjà encodé dans le `valid(a)` de l'étape, qui est une fonction PURE, donc on
la sonde : on remplit les réponses absentes avec une valeur plausible, puis on retire les clés une
à une ; une clé dont le retrait rend l'étape invalide est requise. C'est ce qui fait que « Poids
(kg, optionnel) » et « Date (si connue) » ne sont **jamais** réclamées, sans qu'aucun code n'ait à
savoir qu'elles sont facultatives. **Et le message arrive au moment où la question se pose** : sur
un écran vierge tout manque par construction, le dire serait réclamer avant qu'on ait commencé (ce
produit ne reproche rien — U1) ; il n'apparaît qu'une fois l'écran ENTAMÉ — une réponse donnée, et
ça bloque encore. `aria-live="polite"`, sans quoi rien ne l'annoncerait (aucun élément ne prend le
focus). Garde `U19` dans `smoke-questionnaires` (6 critères), **vérifiée rouge sur trois
cassures** — message retiré (2 rouges), sonde du `valid()` court-circuitée donc l'optionnel
réclamé (1), message affiché sur écran vierge (1).
**24 gates verts, E2E 18/18, golden 949 inchangé** — le questionnaire ne touche aucune séance.

**R25 livré — l'avatar composite : trois disciplines, trente niveaux, un système en boucles**
(spec validée sur MAQUETTES par le fondateur, 07-08/08/2026 — voir ARCHITECTURE.md « R25 »,
banc `npm run demo:avatartri`, **28ᵉ gate CI**) : l'avatar 16 niveaux de R9 laisse place à
**trois jauges par discipline** (natation/vélo/course, 0..30 chacune). Le système est en
BOUCLES : 5 items par discipline, chaque niveau fait passer UN item à sa génération suivante,
6 générations = 30 niveaux, aucun niveau vide — `AVATAR_TRI_ROULEMENTS` est la source unique
(le libellé « prochain niveau » s'en DÉRIVE, jamais une seconde table), quatre cumulatifs
décidés un par un, l'or partout en génération 6, trois **marqueurs de niveau** (bonnet, dossard
de poitrine, ceinture-dossard) dès le niveau 1. Quatre décisions fondateur : migration =
recomptage EXACT de l'historique par discipline, **le repos ne donne pas d'XP** (il reste
compté par la streak), le maillot suit la génération vélo (l'accent choisi reste celui des
partagés), badges/semaines régulières en tiers égaux. **Le niveau 0 existe** (silhouette nue) :
les 16 seuils historiques sont décalés d'un cran — même XP, même visuel pour un compte
existant ; les seuils 17-30 (jusqu'à 120 000) sont une extrapolation NON calibrée, dette
déclarée (**O-30**). Deux rendus dans `avatar-tri.js`, module **PUR** (zéro import — la passe
exhaustive (0..30)³ tourne en node : 59 582 SVG bien formés) : composite carré pour les cartes,
**triptyque story** (tête = natation, torse = vélo, jambes = course) pour le partage 9:16 et le
plein écran. Les trois canaux R17.1/R17.2 sont préservés. **Et l'ATTACHE, défaut de ma propre
étape 3** : les postures bougeaient les jambes mais chaussures/bas/ceinture restaient aux
coordonnées de la pose normale — en « feu », les chaussures flottaient à côté des pieds, la
règle que `smoke-avatar` énonce depuis R17.1 sans garder ce module. La pose devient une DONNÉE
(hanche, genou, pied) et chaque pièce se CALCULE depuis elle ; le triptyque reçoit les cinq
poses à son échelle. Ancrages attendus **calculés, pas recopiés du rendu**, vérifiés rouges sur
deux cassures (pieds épinglés → 4 ✖, cuissard sans genou → 1 ✖). En passant les gates : cinq
suites E2E attendaient « 5 onglets » (dette R24 jamais rejouée) — mises à 4 ; assertions avatar
de `smoke-r4` réécrites sur le contrat composite.
**27 gates verts, E2E 18/18, golden 949 inchangé** — l'avatar ne touche aucune séance.

**O-21 (3e correction) — « du bruit de convergence » était un diagnostic paresseux** (voir
ARCHITECTURE.md « O-21 (3e correction) ») : la 2ᵉ correction laissait un résidu qu'elle
qualifiait de **bruit entre passes**, à traiter par « un chantier à part entière ». Instrumenté
passe par passe sur `10k/debutant/confirme/3s/6h/vr5` (`1282 · 1061 · 1319 · 1077` selon la seule
allure déclarée), il n'y avait ni bruit ni chantier : **une règle, une ligne, un seuil**. Avant
réparation les quatre plans sont presque identiques (5,6 % d'écart) et la courbe déclarée est
IDENTIQUE au moment où elle est calculée — la divergence naît plus loin. La semaine de récup
délivre **190 min à 4:30 et 143 à 5:45** pour la même cible de 198, avec **trois séances d'un
côté et deux de l'autre** : la règle « une récup ne dépasse jamais sa voisine » la trouvait
**6 minutes** au-dessus de sa borne (198 contre 192) et les payait avec une séance de **55 min**.
`cutSmallestSessionIn` étant TOUT-OU-RIEN, une minute d'écart chez la voisine bascule 55 minutes
hors de la semaine, et cette récup amputée devient la référence de tout ce qui suit. Aucune règle
ne « penchait » selon l'allure : **c'est le seuil qui est brutal**, l'allure ne décidant que du
côté où l'on tombe — ce qui ressemblait à du bruit était une marche. **Le correctif était déjà
écrit quinze lignes plus haut** : la règle de monotonie de l'AFFÛTAGE, dans le même bloc, réduit
d'abord le corps des séances et ne coupe un jour que si les planchers l'exigent ; c'est aussi la
décision prise deux fois dans ce dépôt (**C29/C29b/C29c**, « on réduit le VOLUME, pas la
FRÉQUENCE »), jamais rejouée ici. **Pire inversion entre deux allures voisines : +24,3 % →
+5,0 %** (p90 5,0 → 4,6 %, non monotones 73 → 67 sur 432 profils). Ce qui ne bouge pas est
PUBLIÉ : la dispersion max reste à 36,1 %, portée par un profil **strictement décroissant**
(`2413 2291 2188 1773`) — variation monotone légitime, pas une inversion. **Et le golden a refait
l'angle mort que l'entrée avait elle-même nommé** (« ses profils portent tous une date ») : 0
écart sur 945 face à ce correctif → sous-passe `O-21b`, **945 → 949**. **Ma première écriture de
cette passe était DÉCORATIVE et c'est mesuré** — elle héritait du `dispo: "semaine"` du profil de
base, sous lequel les quatre allures rendent le MÊME plan à la minute près (1 487 min) ; avec
`dispo: "quotidienne"` elle discrimine, vérifiée en retirant le correctif : **2 écarts, sur 5:45
et 8:30 exactement**. Cinquième occurrence de cette famille (A-2, N2, C30b, PW). Garde `O-21b` au
banc v6 (fréquence indépendante de l'allure ET aucun plan plus gros de >6 % à allure plus lente),
**vérifiée rouge**.
**24 gates verts, E2E 18/18, golden 949 recapturé, registre 26/26.**

**U17 · A-2 · A-3 livrés — trois blocages levés sans arbitrage** (voir ARCHITECTURE.md
« U17 / A-2 / A-3 ») : **U17** — le titre de séance, cible la plus FRÉQUENTE de l'app (ouvrir le
détail, replié par défaut depuis U16), mesuré au rendu à **254 × 17 px** : la seule cible tactile
du produit sans marge verticale, quand la carte repliable voisine a 8 px. Ce n'était pas une
décision de design mais un standard à appliquer — **U4 a tranché 44 px pour ce dépôt** ; on passe
à **45**. Garde `U17` sur le rectangle RENDU (pas sur la règle CSS : la hauteur dépend aussi de
la police, que R16.8 peut bouger), **vérifiée rouge** à 17 px. **A-2** — le golden ne regardait
**aucun coureur lent** (profil de base à 4:30/km), or C30 et C31 ne mordent que là : troisième
occurrence de cet angle mort, et elle était PUBLIÉE comme une limite en livrant C31. Passe
« allure » (2 formats × 4 allures à `vol_max: 10`, l'enveloppe où le back-to-back peut se payer),
**900 → 908 profils**, et la photo DISCRIMINE — back-to-back à 5:45/7:00/8:30, absent à 4:30.
**A-3** — l'entrée affirmait que `R14.3-b` n'a aucun critère automatique : **faux depuis R15.2**
(`R15.2-A/B/C/D`, quatre verts). Déplacée au §4 — un angle mort qui n'en est plus fait croire à
une cécité qu'on n'a pas.
**27 gates verts, E2E 18/18, golden 908, registre 26/26.**

**PW livré — le vélo a un CHRONO, et le triathlon un TOTAL avec transitions** (demande du
fondateur, 05/08/2026 : « j'ai juste les watt pas le temps… le temps total estimé notamment sur
le triathlon, en incluant les transitions », voir ARCHITECTURE.md « PW ») : le prédicteur rendait
un chrono pour la nage et la course, et des WATTS pour le vélo — c'est-à-dire rien pour le
segment qui pèse **48 à 55 % du temps total**. `src/engine/cyclingSpeed.ts` est le point unique
« une puissance, une vitesse » : modèle de **Martin et al. (1998)**, validé à ±2,7 %, résolu par
bissection. Ce qui n'est pas mesurable — CdA, Crr, masse du vélo — est déclaré comme HYPOTHÈSE
avec sa fourchette, et **c'est cette fourchette qui devient l'incertitude annoncée**, pas un ±x %
décoratif ; l'hypothèse est AFFICHÉE avec le chrono. Le poids, lui, est une entrée réelle : sans
lui le module REFUSE et le dit (P7/P8) — un poids inventé fausserait le roulement ET la pente,
dans le sens rassurant. Livré : **Sprint 1h10–1h16 · Olympique 2h23–2h33 · 70.3 4h52–5h16 ·
Ironman 10h13–11h03** (FTP 250, 75 kg, plat), duathlon compris ; le vélo seul ne reçoit qu'une
VITESSE, le questionnaire ne demandant pas la distance d'une cyclosportive.
**Le relief SORT du modèle** au lieu d'être un coefficient posé à côté (R11.1) — et **deux
calibrations fausses avant la bonne, gardées écrites** : « pente moyenne 2,5 % et 5 % » posée au
jugé (absurde : 5 % sur 90 km = 2 250 m de D+), puis les vraies pentes moyennes 1 % et 2 % avec un
commentaire annonçant « +9 % et +23 % » quand le code produisait **+3 % et +11 %**. La cause est
que **le D+ n'est pas étalé sur la moitié du parcours** : 1 800 m se montent sur 25 km à 7 %, et la
vitesse s'effondre non linéairement avec la pente. Le profil se décrit donc par deux grandeurs
PUBLIÉES — D+ pour 100 km et part de la distance montante — dont la pente découle : **plat 157 min
· vallonné 171 (+9 %) · montagne 199 (+27 %)**. **La fourchette du total est la SOMME des bornes**
et non leur composition en quadrature : la principale incertitude n'est pas le hasard segment par
segment, c'est la forme du jour, et ce jour-là elle l'est ou elle ne l'est pas sur les trois à la
fois. Le total ne sort que si les TROIS segments sont estimés.
**Deux angles morts trouvés en posant les gardes.** Le golden ne bougeait pas d'un bit quand on
changeait le CdA de 10 % : il photographie le **PLAN, pas la prédiction** — les temps prédits n'y
entrent que par la ligne « ⏱ Prévu » du jour J, donc la passe avait besoin d'une date de course
(cinquième occurrence de la famille A-2). Et cette passe en a débusqué un **réel** : le jour J ne
recevait pas le poids, donc la carte Prédiction affichait un chrono pendant que la ligne du jour J
affichait des watts — deux écrans de la même app, deux réponses (forme exacte de R20.1-b).
**Et le harnais E2E fabriquait un athlète de 138 kg** : il remplit tout champ libre non déclaré par
le MILIEU de ses bornes, soit 138 pour `weight` (25-250) — 40 km en **1 h 57 au lieu de 1 h 14**,
le modèle ayant raison sur une entrée absurde que rien ne signalait (famille U14). Deux critères
E2E encodaient la décision renversée (« aucun total ») : **réécrits, pas supprimés**.
Gardes `PW-A`/`PW-B`/`PW-C` au banc v6, **vérifiées rouges sur quatre cassures** ; `R14.1-I1`
a rougi à tort (elle nommait « le levier poids fuite » et mesurait « le mot *kg* apparaît » —
neuvième occurrence de cette famille) et porte désormais sur le vocabulaire du levier.
**27 gates verts, E2E 18/18, golden 945 recapturé.**

**O-21 (2e correction) — deux passes se rabattaient sur un état estropié, et « distance ou temps »
n'était pas la question** (« corrige », fondateur — voir ARCHITECTURE.md « O-21 (2e correction) ») :
l'entrée laissait un « résidu = arbitrage » (la sortie longue se prescrit-elle en distance ou en
temps ?). **C30 y avait déjà répondu** — elle se prescrit en TEMPS depuis toujours, 178 min contre
176 entre 5:45/km et 7:00/km. Instrumenté passe par passe, il y avait **deux** mécanismes, aucun
n'étant un arbitrage. **(1)** Le remplissage d'I14b est **mort sur une semaine plate** : I14 ramène
chaque séance à la durée de la sortie longue, et le plafond des receveuses (`0,80 × longue`, R20.3)
tombe alors SOUS cette valeur — mesuré, quatre séances à 41-43 min pour une longue de **41**,
`_labelCut` à **27 min par semaine**, et **zéro** rendu. Ce sont les semaines de pic et de
spécifique qui portent le plus de qualité par rapport à leur longue, donc celles que I14 coupe le
plus : la périodisation s'inversait, et A2/I1 rabotait TOUT le plan jusqu'au pic estropié —
**−263 min (−19 %) à 5:45/km, 0 à 7:00/km**. Ce qui reste à rendre va désormais à la sortie longue
elle-même : ce sont les minutes que la même passe vient de retirer à la même semaine, et une longue
plus longue RELÈVE le plafond d'I14 au lieu de le violer. **(2)** A2/I1 se rabattait sur une semaine
de pic en **RÉCUPÉRATION** (`peakAny` faute de `peakNR`) — le cas exact que la première moitié d'O-21
avait documenté côté AUDITEUR — et rabotait deux fois, `D4` abaissant le plafond entre les deux
passages : **1032 → 807 min au deuxième passage sur une entrée IDENTIQUE**, quand le profil voisin
ne perdait que 36 min. L'auditeur avait déjà tranché ce cas en avertissement ; le générateur dit
maintenant la même chose que lui (R11.1).
**Portée sur 432 profils × 4 allures** — dispersion du total livré : **p90 16,2 % → 5,0 %**, max
44,1 → 36,1 %, pire inversion entre allures voisines +38,7 → **+24,3 %**, profils non monotones
83 → 73. **Le compte bouge à peine et c'est publié** : les séquences résiduelles ne sont pas
monotones dans un sens ou dans l'autre, elles sont ERRATIQUES (`845 846 847 903`) — du bruit de
convergence entre passes, dont le traitement demande de rendre le point de convergence idempotent.
**O-21 reste ouverte avec ce chiffre plutôt qu'avec une promesse.** La dette `O17` du banc v6,
déclarée par O-21, est **payée dans le même commit** (`expect` → `'pass'`, témoin NON réécrit —
c'est le moteur qui a changé) ; le banc passe de 4 à 3 dettes.
**27 gates verts, E2E 18/18, golden 912 recapturé (115 profils, tous vers plus de facile),
registre 26/26.**

**C30b livré — O-26 fermé : la sortie longue atteint sa cible, et les minutes viennent des
séances faciles** (décision du fondateur, 05/08/2026 : « oui si elle respecte les plafonds ; en
semaine de pic, la sortie longue peut représenter 70 % du volume de semaine si nécessaire », voir
ARCHITECTURE.md « C30b ») : C30 calculait la bonne cible et ne l'atteignait presque jamais —
**7 profils déplacés sur 180**. `raiseLongRunToSpecificity()` monte la longue vers sa cible et
**PREND les minutes aux séances faciles de la même semaine** (R4.1, dans l'autre sens) : le total
de la semaine ne bouge pas d'une minute, c'est une redistribution, et c'est ce qui la rend
compatible avec « si elle respecte les plafonds ». **Cibles atteintes 31/48 → 46/48 · 28 profils
déplacés sur 96**, tous en 10 km et en semi, tous chez des coureurs à 5:45/km et plus lents —
**10 km @ 8:30/km passe de 47 à 76 min**, exactement la population pour laquelle C30 avait été
écrit. Les 2 restants manquent de 2 min : les donneuses sont à leur plancher.
**Ma première écriture faisait son travail puis se le faisait annuler.** Placée juste après
`refillEasyAfterLabelCap`, elle montait bien la longue de 55 à 64 min sur quatre semaines — puis
`enforceHardTimeCap` rabotait le total et le point fixe C22 la rescalait **proportionnellement** :
64 → 57, 53, 55. Trois gains sur quatre effacés, et ma mesure concluait « passe inerte » alors
qu'elle agissait puis était défaite. **Douzième paiement de la leçon du point fixe**, sur ma propre
passe. Rejouée après le point fixe — ce qu'elle peut se permettre parce qu'elle est neutre en
volume, ne déplace que du FACILE (donc hors d'atteinte de C26c/C26d) et ne fait que MONTER la
longue (donc va dans le sens d'I14) — et aussi dans le **dernier** `reconcileDeclaredVolume`,
celui dont la sortie est livrée. **Deuxième correction : « semaine de pic » n'existe pas comme
PHASE sur une prépa courte** — restreinte à `phase.id === "peak"`, la passe se déclenchait **0 fois
sur 48 profils**, une prépa de 5 ou 10 km n'ayant aucune semaine `peak` ; elle se lit donc sur la
CHARGE à défaut de phase, cohorte prise sur la courbe DÉCLARÉE (sur les minutes livrées, elle
changeait entre deux passages). **Et la borne des 70 % n'a encore jamais mordu, c'est publié** :
part médiane 33 %, max 55 % ; la retirer (borne à ×9) ne change RIEN — ce qui borne est le plafond
de séance du format, comme la moitié « 70 % de la distance » de C30 qui n'a jamais mordu non plus.
Gardes : `C30-A` re-épinglé avec ses **trois états successifs** (sans rien → C30 → C30b) et quatre
témoins immobiles, `C30b-A` sur le mécanisme (part ≤ 70 %, chiffre de la décision **relu sur le
plan livré**, neutralité en volume vue du dehors), **vérifiées rouges sur 3 cassures sur 4**. Le
golden gagne une sous-passe `C30b/run/10k` — sa passe « allure » regardait `vol_max: 10`, la bonne
enveloppe pour C31 mais la mauvaise pour C30b (à 10 h la longue est déjà butée sur son plafond aux
trois formats) : **quatrième occurrence du même angle mort qu'A-2**, vérifié en retirant C30b.
**27 gates verts, E2E 18/18, golden 912 recapturé, registre 26/26.**

**C31 livré — le back-to-back marathon : la longue trop longue se coupe en deux jours d'affilée**
(décision du fondateur, 04/08/2026, populations bornées par un audit de littérature préalable —
voir ARCHITECTURE.md « C31 ») : quand C30 est refusé par le plafond C23 (marathon @ 7:00/km :
cible 334 min, plafond 180), **ce qui manque se court le lendemain** de la longue, en Z2, jambes
fatiguées — `min(manque, 0,6 × 180)`, soit 180 + 108 @ 7:00, 180 + 63 @ 5:45. **Marathon
seulement** (le mécanisme est la déplétion glycogénique — sous ~2 h 30 d'épreuve il n'opère pas,
le semi est dehors), **jamais un débutant** (Nielsen 2014 : la fluctuation de charge est LE
mécanisme de blessure du novice, et un week-end doublé en est un pic), jamais sous drapeau
médical ni blessure d'impact, **≤ 3 week-ends par prépa** (semaines de pic en charge). Le conflit
avec la garde d'impact (`runImpactCap` pose un OFF après la longue) est résolu par ÉCHANGE : la
récup se décale d'un jour, elle n'est pas supprimée. La passe tourne AVANT la boucle R3.3 —
charge redistribuée, jamais ajoutée. **Deux défauts de ma première écriture, trouvés par le banc
d'invariants** : poser-puis-écraser n'est pas poser (I14 a vu un « jour 2 » compressé à 30 min
sous un nom qu'il ne tenait plus → la paire ne se pose que si 180 + jour 2 ≤ 60 % du pic promis),
et le seuil de pose doit ÊTRE le seuil du filet (poser dès 15 min de manque puis déclasser
laissait l'échange de jours orphelin — l'inversion I13 de 4 min venait de là ;
`C31_MIN_JOUR2_MIN = 45`, une constante pour les deux). Gardes `C31-A`/`C31-B` au banc v6,
**vérifiées rouges sur trois cassures** ; deux limites PUBLIÉES — le filet du point fixe n'a
aucun déclencheur actuel (défense en profondeur, cassure K4 verte et c'est dit), et le golden ne
couvre pas C31 (aucun profil marathon + allure lente : famille A-2).
**27 gates verts, E2E 18/18, golden 900 : 0 écart, registre 26/26.**

**H-1b livré — la VFC devient un CHOIX, posé une fois** (retour du fondateur : *« déjà la VFC est
un point avancé, je me demande s'il ne vaut pas mieux le demander comme une option »*, voir
ARCHITECTURE.md « H-1b ») : elle occupait **une diapo sur trois du check-in quotidien de TOUT LE
MONDE** pour un signal qui demande une montre, un protocole stable et un relevé chaque matin —
une friction imposée à tous pour une minorité, et posée tous les jours plutôt qu'une fois. La
question est désormais unique (`hrv_track`, dernière étape du questionnaire, optionnelle) ; sans
« oui » la diapo **n'existe pas** et le check-in retombe à deux écrans, sommeil → ressenti.
**Mesuré avant de retirer quoi que ce soit** : sur les **36 combinaisons** de sommeil × énergie ×
ressenti, l'absence de la diapo ne change **aucun verdict** — ni niveau, ni score, ni drivers ;
l'ancien « je ne la suis pas » écrivait `"normale"`, qui depuis H-1 ne pèse rien. Et ce qu'on
demande à qui l'active est la **VALEUR en ms**, pas un adjectif — retiré des **deux** endroits où
il vivait (diaporama et panneau « Modifier ma forme du jour »), en corriger un seul étant le
correctif qu'on croit avoir (R18.1). Deux effets de bord traités : **la FC au réveil déménage sur
la diapo sommeil** — elle vivait sur la diapo VFC et aurait disparu avec elle pour tous les
non-suiveurs, soit un signal OBJECTIF (audit v6, A6) perdu au passage d'un lot qui ne le visait
pas — et **`hrvStatus` n'a plus de valeur par défaut** (`|| "normale"` écrivait un adjectif que
personne n'avait déclaré : inerte, mais la première règle qui lirait `hrvStatus` sans regarder
`hrvSource` y verrait une déclaration fantôme).
**Le harnais répondait « oui » à ma place** : `traverserQuestionnaire` coche la PREMIÈRE option de
tout groupe qu'on ne lui a pas nommé (U14), donc la suite aurait mesuré le comportement de
l'opt-in en croyant mesurer celui du défaut — et serait passée verte. La clé est effacée
explicitement, et le « non » explicite est mesuré **séparément** de l'absence. Garde dans
`smoke-checkin.mjs` (47 assertions), **vérifiée rouge sur quatre cassures** : diapo redevenue
inconditionnelle (16 ✖), opt-in lu à l'envers (15 ✖), FC au réveil renvoyée sur la diapo VFC
(3 ✖), adjectifs de retour (5 ✖). Note d'instrument : les trois premières sortaient bien en code
1, mais sur un `TimeoutError` — donc **aucune ligne de rapport** (le collecteur n'imprime qu'à
`report()`) ; les taps passent maintenant par un helper qui NOMME l'option manquante.
**27 gates verts, E2E 18/18, golden 900 inchangé, registre 24/24.**

**S-1 arbitré — le moteur reste PUBLIC** (décision du fondateur, 04/08/2026 : « restons en public
pour le moment », voir ARCHITECTURE.md « S-1 » et BUGS_OUVERTS.md) : la grille de sécurité ouvrait
sur « le moteur tourne exclusivement côté serveur » — case inchochable, et pas par oubli : **il n'y
a pas de serveur**. Mesuré sur le fichier servi (`engine.js`, 925 Ko) : `Bosquet` ×21, `Riegel`
×25, `G_PLAFOND` ×7, `HISTORY_CAPS` ×8, commentaires compris. **On assume**, à titre révisable.
Ce que ça ACHÈTE : hors-ligne, zéro-compte (aucune donnée ne quitte le téléphone), zéro-infra, et
l'explicabilité qui EST le contre-positionnement du produit. Ce que ça COÛTE, dit franchement : le
moteur est copiable, et le **« secret des affaires » (loi 2018) ne s'applique pas** — il exige des
mesures de protection raisonnables, or un moteur publié n'en est pas une. La protection réelle est
le **droit d'auteur** (`LICENSE`, déjà cohérente) et la **concurrence déloyale** ; vérifié qu'aucun
document ne revendique le contraire, et gardé par un bloc `verify`. Les §1/§2/§5/§6 de la grille
deviennent **hors architecture** plutôt qu'« en retard » ; le §6 garde sa valeur préventive (`src/`
ne contient aucune notion de produit ni de prix — à PRÉSERVER). Réouverture si modèle payant à
l'usage ou copie constatée — **et le retour arrière coûte d'autant plus cher qu'il y a
d'utilisateurs** (un backend introduit après coup demande de migrer l'état de chacun depuis son
`localStorage`).
**Suite donnée aux démarches humaines (fondateur, 05/08/2026)** : `H-6` (CGU) et `H-7` (Soleau)
sont **abandonnés**, `H-4` (MyFitnessPal) aussi — sans objet depuis que R6 a retiré le journal
alimentaire. `H-2` (push serveur) et `H-3` (conseil nutritionnel) voient leur POSITION confirmée
et restent en l'état. **La conséquence de l'abandon de H-6 est écrite plutôt que tue** : S-1
avait identifié les CGU comme le levier PRINCIPAL une fois le moteur public, puisque le secret
des affaires ne s'applique pas ; sans elles, **`LICENSE` — le droit d'auteur — est la seule
protection**, sans le support contractuel qui rend une réutilisation attaquable. Arbitrage
assumé, pas un oubli. Et `H-3` reste **bloqué sur avis diététicien** : « validé » y désigne la
position, jamais l'obtention de l'avis.

**I14b livré — O-20 fermé : ce que le plafond de libellé retire, la semaine le récupère** (voir
ARCHITECTURE.md « I14b ») : `audit:invariants` **I13** était le SEUL gate rouge du dépôt — en
trail, un DÉBUTANT recevait un pic de **575 min** contre **547** pour un INTER, et sur le D+ aussi
(1 130 m contre 860). Quatre hypothèses avaient déjà été réfutées (T1, T2b, « des séances moins
pentues », et le correctif `C23b` mesuré INERTE puis retiré). La cinquième se lit en instrumentant
le pipeline : la semaine de l'inter **sort de la boucle R3.3 à 603 min pour une cible de 600** — la
courbe et le remplissage n'ont jamais été en cause. C'est `enforceLabelVsDose` (I14, « la sortie
longue est la plus longue de sa semaine ») qui ramène ensuite « Descente en charge » de **210 à
159 min**, et **plus aucune passe ne rend ces 51 minutes**. **Pourquoi le débutant y échappe est
le cœur de l'affaire** : le plafond que I14 impose aux autres séances EST la durée livrée de la
sortie longue, et la sienne est épinglée à 180 min par **C23, un plafond de SÉCURITÉ**, quand
celle de l'inter s'arrête librement à 167. Le débutant hérite du plafond le PLUS HAUT, ne se fait
rien retirer, et passe devant — **un plafond de sécurité qui augmente la charge de celui qu'il
protège**. La forme est connue **dans l'autre sens** : onze fois « une garantie vérifiée au milieu
du pipeline ne vérifie que l'avant-dernier état », onze fois la réponse a été de REJOUER la
garantie au point fixe ; ici c'est le miroir — une garantie de SÉANCE retire des minutes après la
boucle de volume, et c'est la BOUCLE qui n'est jamais rejouée. `refillEasyAfterLabelCap()` rend
ces minutes aux séances FACILES et à elles seules (R4.1), sous quatre bornes qui viennent toutes
d'une règle existante : blocs plats et non-qualité, jamais plus de 0,80 × la sortie longue
(R20.3), jamais au-dessus de la courbe déclarée, jamais une semaine hors pic au-dessus du pic
livré. **I13 passe de 13 échecs sur 114 combinaisons à 0**, balayé sur 6 sports × 21 horizons —
traité systémiquement, pas au point d'échantillonnage qui rendait le défaut intermittent ; pic de
l'inter 547 → **596** (déclaré 600), débutant inchangé à 575 ; **62 semaines regarnies, 1 365
minutes rendues** sur les 702 profils.
**Deux erreurs à moi, gardées écrites.** Ma première écriture était **inerte** : j'ai filtré les
blocs receveurs sur `!st.gradient` en pensant « sans pente », alors que **`flat` EST une valeur de
`gradient`** — j'excluais donc le footing PLAT, précisément le bloc que R4.1 désigne. Receveuses
vides sur les 41 semaines ; `EN_PENTE()` est désormais la seule définition (R11.1). Ma deuxième
remplissait fidèlement une courbe qui DÉCROÎT sur les profils courts et amplifiait l'inversion —
la borne « dev ≤ pic », qui existait mais n'était vérifiée qu'APRÈS par la boucle de réparation,
est lue au moment où la passe agit (onzième application de la leçon, à ma propre passe ; vérifiée
non inerte : elle mord 10 fois sur 702).
**Ce que la fermeture a fait remonter — O-21.** Le critère `O17` du banc v6 est passé rouge. Le
réflexe aurait été de conclure « I14b a bridé le plan » : **c'est faux, et c'est mesuré** — le plan
de l'athlète capable fait **107 min avant comme après**, au caractère près ; c'est le TÉMOIN qui a
bougé (92 → 120), parce qu'il livre enfin sa propre courbe. Le critère nomme « le plan a rétréci »
et mesure « le témoin a changé » — sixième occurrence d'une mesure portant sur une grandeur
voisine de celle qu'elle nomme. Mais ce qu'il expose est un VRAI défaut, **antérieur à ce lot** :
à `vol_recent: 5`, avant comme après, le coureur à 5:45/km reçoit **100 min** et celui à 7:00/km
**106** — chiffres identiques dans les deux états. Inversion de monotonie sur l'axe **ALLURE**,
cousine d'I13 (axe NIVEAU). Décision du fondateur (03/08/2026) : **dette déclarée plutôt que
témoin réécrit** — `O17` passe en `expect: 'fail'` et reste AFFICHÉ avec son chiffre, comme
D2/D3/F2 ; ré-ancrer son témoin effacerait ce qu'il vient de trouver, et les deux candidats
mesurés étaient instables. Suivi en **O-21**, avec sa piste : la courbe déclarée décroît sur ce
profil (base au-dessus du pic).
**23 gates verts — plus aucun rouge —, E2E 15/15, golden 900 recapturé (59 profils : trail 35,
course 14, vélo 9), registre 20/20.**

**U16 livré — le déroulement d'une séance se déroule, il ne s'entasse pas** (retour du
fondateur : « trop dense », voir ARCHITECTURE.md « U16 ») : aucun des 23 gates ne regarde ça —
ils mesurent tous ce que le moteur PRODUIT, jamais la forme sous laquelle une personne le LIT.
Mesuré en **caractères par pixel rendu** (pas en caractères : on ne retire pas un mot d'une
explication) : le pire cas était une VO2max à **296 caractères d'un seul tenant**, quatre blocs
collés par des points médians, en 11 px gris à interligne 1,35 — **1,61 c/px**, devant tout le
reste, y compris le mur des décisions du moteur (1,60). **Le déroulement devient une LISTE**, une
ligne par bloc, ce qui est la façon dont un entraîneur écrit une séance ; `techListHTML()` ne
fabrique AUCUN texte (`renderSess` reste le seul producteur) et coupe sur le séparateur que le
moteur pose déjà. Pour que cette coupe soit exacte, **le point médian cesse d'avoir deux sens** :
le rendu vallonné du trail l'utilisait aussi À L'INTÉRIEUR d'un bloc, ces deux compléments passent
à la virgule — R11.1 appliquée à un caractère. Décisions du moteur à trois niveaux (1,60 → 1,17),
séance dépliée 1,61 → 1,17, « Pourquoi ce plan » 1,58 → 1,44. **Une règle mobile retirée** :
`.gd-det { font-size: 11px }` était la valeur EXACTE de `--fs-xs` (le doublon littéral chassé par
R16.8) ; il ne restait que `line-height: 1.35`, qui écrasait sur MOBILE — le seul endroit où le
produit se lit — l'aération posée dans `styles.css`. Un correctif que la cascade annule est un
correctif qu'on croit avoir : R18.1, deux étages plus bas.
**Deux fois mon propre travail dans le viseur** : ma première écriture de « Pourquoi ce plan »
était **inerte** (513 → 514 px — les puces retirées rendaient exactement ce que les marges
prenaient), et le plus long pavé de tout l'onglet n'était pas produit par le moteur mais par
**mes 265 caractères** d'introduction du chrono visé. Coût dit : tout déplié +5 % de hauteur, mais
**3,7 écrans à l'arrivée** — l'air ne coûte qu'à qui ouvre. Garde `U16` dans `smoke-usage`,
**vérifiée rouge** (2 critères sur 3), portant sur la PROPRIÉTÉ et non sur ma mise en page.
**Mon instrument était faux d'abord** : il comptait les points médians dans le texte RENDU,
c'est-à-dire ce que la mise en page venait de remplacer par des retours à la ligne — **0 séance à
plusieurs blocs** sur un plan qui en est plein, donc satisfait par n'importe quoi. Cinquième
occurrence dans ce dépôt d'une mesure lue APRÈS la transformation qu'elle juge.
**22 gates verts sur 23** (`audit:invariants` rouge sur I13/O-20, pré-existant et indépendant),
**E2E 15/15 (30 assertions d'usage), golden 900 recapturé — 54 profils, tous en trail, ce seul
champ.**

**U15 livré — l'onglet Plan ouvre sur la semaine en cours** (voir ARCHITECTURE.md « U15 ») :
troisième arbitrage du fondateur (« tout replier sauf la semaine en cours »). La mesure a dit où
était le poids : sur un marathon à 390 px, l'onglet faisait **5 164 px (6,1 écrans)** et **56 %
de cette hauteur était les grilles de semaines** — quatre dépliées d'office (les trois premières
plus la dernière). Ni le « pourquoi » (10 %) ni le graphique (1 %) ne faisaient le mur : ce sont
les semaines qu'on ne regarde pas. **5 164 → 3 086 px, 6,1 → 3,7 écrans** ; le bouton « Voir les
N semaines » n'a pas bougé — on change le défaut, pas la possibilité.
**Ce que je n'ai PAS fait, et pourquoi** : « tout replier » inclurait « Pourquoi ce plan »
(513 px, deuxième poste), mais **R6 a décidé l'inverse explicitement** (« l'explicabilité est le
contre-positionnement du produit, pas une option de confort »). Le poste mesuré était ailleurs et
il est traité ; l'arbitrage entre les deux décisions revient au fondateur. Corollaire retiré : le
raccourci « ↓ aller à la semaine en cours » (R16.5) n'a plus d'objet quand cette semaine est la
seule affichée — il reste dans la vue complète. Garde `U15` sur les deux moitiés : vue par défaut
courte ET plan ENTIER à un bouton (43 semaines dépliées).
**22 gates verts sur 23, E2E 15/15, golden 900 inchangé.**

**U14 (préalable) livré — un défaut tacite va vers la prudence, et il est dit** (voir
ARCHITECTURE.md « U14 ») : avant de laisser sauter une question, il faut savoir ce que vaut son
absence. Mesuré : un plan construit SANS réponse à « ta disponibilité » était identique au
caractère près à `dispo: "quotidienne"` — **la valeur la plus permissive de son domaine**. Sauter
la question donnait le plan de quelqu'un qui peut s'entraîner tous les jours, et rien ne le
disait. Le repli devient **`partielle`** (médiane du domaine) : un défaut se choisit dans le sens
de la sécurité, pas dans celui de la commodité de code. `dispo` et `doubles` n'avaient en outre
**aucun `fallback` déclaré** — leur repli n'était donc pas journalisé, alors que c'est la seule
raison d'être de ce champ (R11.2). Ma suspicion de départ était fausse et c'est dit : les replis
SONT journalisés, comme décisions `R11-defaut-*` ; seules ces deux clés manquaient.
Blast radius isolé : golden **889 écarts sur 900**, venant **entièrement** de la ligne de
journalisation `doubles` (le profil de base ne renseigne pas cette clé) — le changement de défaut
`dispo` ne touche AUCUN plan du golden, tous le déclarent. Garde `U14` au banc v6, **vérifiée
rouge** (4 échecs).
**Et le chemin court est livré : 8 écrans / 30 gestes → 4 écrans / 16 gestes.** L'ordre met en
tête ce dont l'absence coûte une garde de sécurité (format + date, les trois drapeaux médicaux,
l'âge, le trio volume/séances/volume récent) ; la validation de l'écran « capacité » ne retient
que ses trois réponses structurantes ; « ⚡ Générer mon plan maintenant » apparaît dès le socle
complet. Aucune question n'est SUPPRIMÉE : elles passent après le moment où le plan devient
montrable. Le bouton a coûté un écran de plus à ma première écriture — calculé au rendu, il
n'apparaissait qu'à l'écran SUIVANT celui qui complétait le socle ; sa visibilité suit désormais
les réponses (`refreshNav`).
Deux défauts trouvés en construisant : **le champ « poids » n'avait ni `min` ni `max`** (le
navigateur laissait saisir 10 kg, l'athlète récoltait un refus typé au lieu d'être empêché), et
**quatre suites E2E codaient la SÉQUENCE des écrans en dur** — toutes tombées sur une
réorganisation légitime, alors qu'aucune ne mesure l'ordre. `traverserQuestionnaire()` répond
désormais à ce qui est À L'ÉCRAN, avec un crochet pour les assertions qui visent un écran
précis. Garde `U14` dans `smoke-usage` : ≤ 5 écrans, un vrai plan au bout, **et le socle contient
toujours** les drapeaux médicaux, l'âge et l'enveloppe.
**22 gates verts sur 23** (`audit:invariants` rouge sur I13/O-20), **E2E 15/15, golden 900
recapturé, registre 19/19.**

**C29b/C29c livrés — l'affûtage garde ses jours et les raccourcit** (décision du fondateur,
03/08/2026, voir ARCHITECTURE.md « C29b / C29c ») : l'affûtage réduit le VOLUME, pas la
FRÉQUENCE — R3.13 n'est pas négociée, c'est la MONNAIE de la réduction qui change. **Trois
hypothèses, deux fausses, chacune réfutée par la mesure** : la décroissance (C29, aucun des 15
profils mesurés n'a bougé) ; le plancher de séance piscine (**C29b**, vrai mais partiel — nageur
débutant 33 % → 67 %, et mon premier `grep` ne voyait qu'un des TROIS blocs de suppression
identiques) ; les deux passes R3.13 (**C29c**, 76 des 95 jours perdus). Ces passes ont raison au
moment où elles s'exécutent — puis les suivantes réduisent encore, et le jour a été sacrifié pour
rien : semaine d'affûtage livrée à **46 % du pic pour un plafond de 60 %, deux jours coupés**.
Forme exacte de C28. On rend donc les jours **au point fixe**, **neutre en volume** (on redonne
des JOURS, les minutes viennent des séances déjà là), avec un filet qui **se rétracte** si R3.13
ne tient plus — ma première écriture mettait 35 combinaisons sur 459 au-dessus du plafond.
**68 % → 30 % des profils sous le plancher de fréquence, médiane 75 % → 83 %**, sortie longue en
baisse (semi 91' → 81'). Reste 30 % là où le rééquilibrage ne peut pas se payer — suivi en O-19.
**Trois instruments de plus démasqués comme dépendants de la DATE** (famille R20.7) : mon propre
balayage de fréquence (la course est passée du dimanche au lundi en franchissant minuit — la
médiane est tombée de 75 % à 0 %, et **les chiffres que j'avais publiés dans O-19 étaient faux**,
corrigés) ; l'assertion `smoke-r4` « le pourquoi est visible » qui supposait que le jour courant
portait une séance (un tiers sont des jours de repos) ; et **`audit:invariants` I13**, vert en CI
le 02/08 et rouge en local le 03/08 à code identique. Balayé sur 21 horizons × 6 sports :
**13 échecs sur 114, tous en trail** — un débutant reçoit un pic de 575 min quand un inter en
reçoit 547. Enregistré en **O-20**, non traité : rendre le banc déterministe avant d'avoir
corrigé le défaut figerait la dette (leçon R20.6).
**21 gates verts sur 22** (`audit:invariants` rouge sur I13/O-20, pré-existant et indépendant de
ce lot — vérifié contre le moteur committé), **E2E 15/15, golden 900 recapturé, registre 19/19.**

**C28/C29 + U11–U13 + D1/D2 livrés — le lot des trois relectures** (coach · développeur · client,
voir ARCHITECTURE.md « C28 / C29 / U11–U13 ») : traversée du produit sous trois regards, chacun
mesurant ce qu'aucun des 22 gates ne regarde — ils vérifient tous ce que le moteur PRODUIT,
jamais ce qu'un entraîneur DÉFENDRAIT ni ce qu'une personne LIT.
**C28 — une course en milieu de semaine mettait 156 min à J-2** (168 pour une cyclosportive ;
36 profils sur 84 au-dessus de 45 min). Deux causes : le plancher de semaine de course
appliquait 30 % du pic à une semaine TRONQUÉE sans prorata — relation **non monotone**, trois
jours portaient 2,9 h quand sept jours en portaient 2,3 — et surtout **les plafonds d'approche
existaient déjà** (J-1 ≤ 25, J-2/J-3 ≤ 62) mais tournaient AVANT le plancher : bisecté, la
séance était créée à 30 min et ressortait à 156. **Onzième paiement de la même leçon** — une
garantie vérifiée au milieu du pipeline ne vérifie que l'avant-dernier état ; le plafond se
REJOUE au point fixe. J-2 max **168' → 63'**, et la veille cesse de fuir elle aussi (36' → 23'
pour une borne déclarée à 25). Garde `I21` (7 jours × 6 sports), **vérifiée rouge** (10 échecs).
**C29 — l'affûtage coupe la fréquence, que Bosquet 2007 dit de maintenir** : la source citée ici
pour le +1,96 % décrit TROIS bras (volume −41/−60 %, intensité maintenue, **fréquence ≥ 80 %**),
seul le premier était vérifié. Mesuré : médiane **75 %**, 52 % des profils sous 80 %, et la
sortie longue — exclue des victimes — survivait à **79 % du pic** quand la semaine tombait à
46 %. La décroissance réduit désormais au lieu de supprimer sous le plancher de fréquence
(3 profils améliorés, 0 dégradé). **Partiellement traité, et c'est dit** : ma première hypothèse
était fausse (le correctif n'a bougé aucun des 15 profils mesurés), les jours OFF viennent de
deux autres passes adossées à R3.13 — entrée **O-19** au registre avec ses chiffres.
**U11 — après 8 écrans et 30 gestes, le premier écran était un quatrième questionnaire.** Le
jour de la création, on arrive sur 🗓 Plan ; le portillon du check-in ne bouge pas, il cesse
seulement d'être l'écran d'arrivée. Écrit faux du premier coup et gardé écrit : mon test lisait
`plan_start` en supposant qu'`ensurePlan()` l'avait posé — c'est `renderTabs` qui le déclenche,
l'ancre n'existe pas encore. **U12** : la carte « chrono visé » se replie (462 px, 7 % d'un
onglet qui fait 7,7 écrans). **U13** : « premium » disparaît — il fabriquait une objection
commerciale que le produit dément deux lignes plus bas. **D1** : un état illisible ne s'efface
plus en silence (il était ÉCRASÉ au premier `ebSave` — mesuré), et l'échec d'écriture cesse
d'être muet. **D2** : `feasibility.js` importe `esc` au lieu de le redéfinir (R11.1, enfreint
dans le code qui venait de l'invoquer).
Validé au passage, et dit aussi : l'état hostile produit un refus typé sans injection ni erreur
JS, le garde-fou de collision du bundle MORD (vérifié en provoquant une collision), les cibles
tactiles tiennent le 44×44.
**22 gates verts, E2E 15/15, golden 900 recapturé (31 profils), registre 18/18.**

**RV livré — le raisonnement inverse, et il ne construit rien** (voir ARCHITECTURE.md « RV ») :
le moteur ne savait construire QUE en avant — d'où tu pars, jusqu'où la courbe peut monter.
`src/engine/feasibility.ts` prend le problème par l'autre bout : une épreuve, un chrono visé, et
ce que ça EXIGE déroulé à reculons jusqu'à aujourd'hui. **Aucun modèle nouveau** — chaque étape
INVERSE un modèle déjà sourcé et déjà audité (Riegel avec l'exposant piloté par le volume P5,
inversé en forme close ; P2bis pour ce que le profil peut produire, régime P11 compris). Un
second modèle de performance serait un second jeu de vérités, ce que R11.1/R20.5/U9 interdisent
partout ailleurs. Cinq verdicts : `atteignable` · `juste` · `hors-horizon` · `hors-modele` ·
`indeterminable`, chacun motivé par ses décisions `RV1`–`RV6`.
**Ce qu'il ne fait PAS est sa raison d'être** : il ne construit aucun plan et ne touche aucun
plafond. Le chrono visé n'entre dans AUCUNE entrée de `buildPlan` — laisser un objectif de temps
augmenter une charge, ce serait la priorité n°5 du manifeste qui écrase les quatre premières, et
c'est ce qu'un athlète motivé ferait à notre place si on lui en donnait le bouton. Deux gardes,
à deux niveaux : `RV-INVARIANT` (moteur, plan identique au bit près) et **`RV-UI-B`** (le plan
AFFICHÉ ne bouge pas d'un caractère) — c'est par l'écran qu'un défaut arriverait, et c'est la
forme de trou que R19.1 a laissée passer. La suite garde aussi **son propre instrument** : elle
change un volume (6 h → 3 h) et exige que l'empreinte le voie — sans quoi « rien n'a bougé »
serait ce que dirait une empreinte aveugle.
**Une erreur corrigée en l'écrivant, gardée écrite** : ma première version lisait `G_PLAFOND`
comme un plafond de CARRIÈRE et concluait « impossible quelle que soit la durée de préparation ».
Sa provenance dit autre chose — Barnes & Kilding 2015 mesure un CYCLE. Mesuré : un marathon de
4 h 01 visé en 3 h 30 sur 16 semaines sortait « impossible », 7 cas sur 9 aussi. Un verdict faux
dans ce sens-là décourage quelqu'un dont l'objectif tient debout ; la réponse honnête est celle
de P7/P8 — **refuser d'estimer en disant pourquoi**.
Carte « 🎯 Ton chrono visé » dans l'onglet 🗓 Plan, saisie DANS la carte (un champ au Profil et un
verdict trois onglets plus loin, c'est deux écrans pour une idée), `h:mm:ss` ou `mm:ss` avec
levée d'ambiguïté par le domaine et non par la devinette, illisible → le dit. Course à pied
seulement : ailleurs `null`, pas un verdict prudent — une carte absente se comprend, un verdict
tiède se croit. `target_time` reste HORS `ANSWER_SCHEMA`, comme `pace` et `css`.
**23 gates verts, E2E 15/15, golden 900 inchangé.**

**R19 livré — l'audit de mes propres résultats** (voir ARCHITECTURE.md « R19 ») : les livrables
de R18 repassés au crible de six regards de spécialistes, en MESURANT. Trois défauts réels
corrigés — **R19.1** deux questions livrées par R18.2 étaient INERTES en swimrun (son prédicteur
met en forme ses propres postes, donc ne passait ni par `swimRange` ni par `runRange`) et ma
garde E2E vérifiait que le champ existe, jamais qu'il agit ; **R19.2** la combinaison n'existait
pas dans le modèle de natation tri — 4 à 7 % de temps et un seuil réglementaire à 24,5 °C —
pendant que R18.2 affinait à ±5 % par-dessus, ordre de grandeur inversé (et sous 15 °C le moteur
prévient au lieu d'estimer) ; **R19.3** la durée d'affûtage suivait la longueur de la PRÉPA et
non la course (un Sprint sur 47 semaines recevait 3 semaines d'affûtage). **R19.4 : le constat
était FAUX et ma correction était une régression** — j'avais compté les minutes « dures » alors
que le travail d'allure spécifique est classé MODÉRÉ ; sur le bon critère le moteur était déjà
59/59 conforme, et ma correction faisait passer la qualité d'affûtage de 45 à 38 min avec 4
semaines à zéro. Retirée (`O-12`). **R19.5** : la note du brick promettait « dernier tiers @
allure course » sur un step 100 % `bk.z2` — 14,7 h annoncées et comptées facile sur un 70.3 ; la
note est corrigée, la structure attend `O-11`, parce que la construire révèle que `bk.rp` vaut
0,80-0,88 FTP quand le jour J d'un 70.3 est prescrit à 0,752-0,822 : **deux définitions de
« l'allure course » dans le même moteur**.
**21 gates verts, E2E 12/12, golden 900 recapturé, registre 12/12 re-mesuré.**

**R18 livré — le premier lot qui vient d'un TEST, pas d'un audit** (retour du fondateur,
01/08/2026, voir ARCHITECTURE.md « R18 » — banc `npm run audit:r18`, **21e gate CI**) : six
constats, cinq défauts, dont deux plus larges que ce que le test pouvait voir.
**R18.1** le zoom involontaire — le viewport était bon, la cause est qu'iOS zoome sur tout champ
sous 16 px et ne dézoome jamais ; 22 champs concernés, dont les quatre sélecteurs du check-in du
matin. `css/mobile.css` posait la bonne valeur depuis l'origine mais **perdait la cascade**
contre `.opt` et contre `input[type=text]` — un correctif que la cascade annule est un correctif
qu'on croit avoir. On ne pose PAS `user-scalable=no` : retirer le zoom subi en retirant le zoom
voulu supprime la seule loupe d'un malvoyant. En chemin, `smoke-typo` ne lisait pas
`css/mobile.css`, qui portait un texte à 8 px sous le plancher de 9 que R16.8 affirme tenir —
et la mesure de rendu ne le voyait pas non plus (un `::after` n'est pas un nœud de texte).
**R18.2** le profil de course **par discipline** — R14.3-a avait unifié `terrain` et
`course_profile` en une clé, ce qui était juste, mais cette clé décrit le parcours comme s'il
était homogène ; un triathlon ne l'est jamais. `legProfileOf()` prolonge la cascade d'un cran
(leg → global → terrain), la nage a son propre domaine (un relief ne décrit pas un plan d'eau),
et `eau_vive` élargit **des deux côtés** parce qu'un courant porte autant qu'il freine.
**R18.3** retour à cinq onglets — 🎯 Aujourd'hui redevient réellement central (3e sur 5) ;
📅 Semaine revient SANS la coche en deux versions que R16.9 avait débusquée (elle consomme
`weekGridHTML`/`toggleDone`). Débusqué au passage : `handleSwapClick` re-rendait Plan en dur.
**R18.4** le brick disparaissait de l'affûtage — mesuré sur 4 formats de tri × 4 de duathlon,
tous niveaux : **trois semaines** sans enchaînement avant le jour J, parce que `durLong`
retombait dans la branche générique là où R13.4 n'avait branché que `dur1`/`dur2`. **C21c** :
le plafond du brick d'affûtage EST le plancher de la bande de charge — la relation ne peut pas
dériver. Ma première écriture mettait 48 min continues à allure course dans une semaine
d'affûtage ; le banc v7 l'a trouvée (158 profils duathlon, 59 % → 89 %) et avait raison au-delà
de sa règle.
**R18.5** la cadence de récup ignorait les phases — 75 % des plans déchargeaient DANS le pic.
C27a/b/c **déplacent** sans jamais supprimer, et un garde les domine : aucune règle de placement
ne fait dépasser à l'athlète sa propre cadence. Les 34 arbitrages où la cadence gagne sont
comptés ET démontrés à chaque exécution du banc.
Enregistrés non traités (`BUGS_OUVERTS.md`) : **O-8** le footing swimrun sans bornes (182-228
min, la plus longue séance du plan — le défaut que R13 a corrigé pour le tri), **O-9** le banc
d'invariants porte quatre familles d'échecs pendant que la doc le dit vert (dette, pas
régression : identique contre le moteur d'avant R18), **O-10** `vol_max` inerte au-delà de 10 h.
**21 gates verts, E2E 12/12 suites, golden 900 recapturé.**

**R17.1 livré — l'avatar sait enfin comment tu vas AUJOURD'HUI** (brief avatar, voir
ARCHITECTURE.md « R17.1 ») : la posture était pilotée par les séances des 7 derniers jours —
ni la forme du jour, ni la progression, et corrélée à l'XP qui compte les mêmes séances. Deux
canaux séparés désormais : **forme du jour** (posture + expression, 5 états lus au check-in du
matin) et **progression** (équipement/décor/aura, le niveau cumulatif inchangé). Sans check-in,
le visage est NEUTRE — jamais un sourire par défaut ; sous drapeau douleur, l'état plafonne à
« fatigué·e ». Contrat de calques (`data-layer`, `data-piece`, `HEAD_ANCHOR` exporté) pour que
le test lise des calques au lieu de deviner. Garde `tests/e2e/smoke-avatar.mjs` (11e suite,
19 assertions) : AV1-A, AV1-B, AV6-A. **R17.2 — AV3/AV4 tranché par un TROISIÈME CANAL** (choix utilisateur) : piloter l'équipement
par la performance aurait rendu l'avatar DÉCROISSANT — une blessure, une maladie, l'âge font
baisser une allure seuil, et l'athlète se serait vu déshabiller au moment où il a le plus
besoin de revenir. L'équipement reste donc la régularité ; la performance a son propre canal,
un **repère gradué au sol qui se DÉPLACE** — il monte, il descend, il ne retire rien. Source :
`margeOf` (R14.1), déjà sourcée et déjà décalée par sexe et âge, donc un master n'est pas jugé
contre une référence de 25 ans. `null` sans référence mesurée (pas de palier 1 par défaut),
jamais de rouge, aucun effet sur les deux autres canaux — garde `AV3-C`.
**Bloqué et non contourné** : AV7/AV8 (45 assets raster) sort du périmètre code ; AV11/AV12 (badges par
zone) attend des badges par discipline, qui n'existent pas.

**R16 (lot design visuel) livré** (handoff `HANDOFF_R16_design_visuel.md`, voir ARCHITECTURE.md
« R16 ») : **R16.8** l'échelle typographique — 21 tailles distinctes dont quatre sous le pixel
(7,5 / 8,5 / 11,5 / 12,5) → **7 paliers `--fs-*` déclarés**, un par rôle, plus un principe qui
borne la liste (l'échelle gouverne le TEXTE ; un glyphe décoratif se dimensionne en `em`
relativement à son porteur). Les 69 tailles inline des modules y passent aussi, avec UNE
exception nommée : le document exporté, autonome, qui n'a pas les variables. Le plus petit
texte réellement rendu passe de 7,5 px à 9 px. **R16.9** la **fusion 📅 Semaine → 🗓 Plan**
(5 onglets → 4) : le diff a montré que **la coche existait en deux versions** — celle de
Semaine ouvrait feedback + célébration + badges, celle de Plan basculait un booléen en silence ;
il n'en reste qu'une (`toggleDone`, `session-life.js`), et elle vaut pour toute semaine
affichée. Les briques de la séance VÉCUE sont extraites AVANT suppression (`session-life.js`),
le quotidien part dans 🎯 Aujourd'hui, la grille et le ⇄ dans 🗓 Plan. Deux corrections
successives des pastilles de phase tronquées ne regardaient pas la cause : ni le viewport
(R16.4) ni l'abréviation, mais le bouton de R16.5 émis DANS la frise flex. Garde :
`tests/e2e/smoke-typo.mjs` (9e suite E2E) — relations d'ordre entre rôles + plancher de
lisibilité, jamais des valeurs absolues.

**R16.10 livré — swimrun réintégré, la dette traitée d'abord** (voir ARCHITECTURE.md
« R16.10 ») : R12 §0 avait SORTI le module du bundle (78 % de profils propres au banc v7,
quatre checks budgétés 53-80 ‰) ; la condition de retour était de traiter la dette, pas de
retirer le drapeau. **S13** côté moteur — la structure hebdomadaire ne lisait pas l'objectif :
le plan valait 63-64 % de course que l'épreuve en demande 45 % ou 94 %, soit 31 points de
sous-entraînement du limiteur réel sur une épreuve course-dominante ; le second créneau facile
bascule désormais avec la course, sans rééquilibrage au prorata (la technique de nage se perd
par FRÉQUENCE) et sans jamais s'appliquer au froid ni sous drapeau médical. La règle miroir a
été écrite, mesurée (la part de course tombait à 17 %) et RETIRÉE — une règle qu'aucun défaut
ne réclame est une règle qui en crée un. Côté banc, l'instrument punissait les règles de
sécurité : **71 des 73 hits de S-LONGSWIM** portaient un drapeau médical (même famille que
`U-STRUCT` en R15.1). Résultat **78 % → 89 %**, budgets **53-80 ‰ → 12 ‰**, résidu vérifié
stable sur trois tailles d'échantillon. Sept sports, 10 suites E2E, golden **764 → 900**.
**R16.10-a** : `golden:verify` — un gate de CI — sortait en code 1 **depuis R15.7-C** tout en
annonçant « 0 écart », parce qu'il comptait les quatre refus typés `mineur` comme des erreurs
de génération. Un gate rouge en permanence est un gate que plus personne ne lit.

**R15 (chapitres moteur) livré** (revue externe de `BUGS_OUVERTS.md`, voir R10_DEFECTS.md « R15 »
— banc `npm run audit:r15`, **20e gate CI**) : **R15.7-C** un mineur pouvait générer un plan
Ironman (15 ans + tri/Full accepté, 59 semaines, pic 7,7 h) — R6.3 modulait la charge mais rien
ne croisait âge et FORMAT ; refus typé qui nomme la règle d'inscription et propose le format
accessible, formats courts inchangés. **R15.2** le relief entre dans la cible d'intensité VÉLO
(plat 175–191 W ↔ montagne 169–185 W, là où les deux donnaient 175–191) — un point unique
`bikeIF` pour les trois sports qui prescrivent des watts, une seule clé de parcours.
**R15.7-A/B** la semaine de course : **291/648 configurations sous 30 % du pic → 0**, et 12
plans arrivaient au départ après 3 à 5 jours sans rien → 0. Quatre causes empilées, dont la
dernière est la dixième occurrence de la même leçon : **le plancher tournait AVANT la
décroissance d'affûtage**, qui retirait ce qu'il venait de poser — il passe après, et la
décroissance reçoit le plancher comme borne basse. Le déverrouillage de la veille est protégé
comme la course (R13.4) : la séance la plus courte par CONCEPTION est la victime idéale de toute
règle « retirer la plus petite ». Golden **758 → 764** (le cas `mineur` se dédouble : le refus
ET la protection R6.3 restent photographiés — une règle nouvelle ne doit pas effacer la
surveillance d'une ancienne). Chapitres d'infrastructure R15.1/R15.3/R15.4/R15.6/R15.9 **ouverts**,
suivis dans `BUGS_OUVERTS.md`.
