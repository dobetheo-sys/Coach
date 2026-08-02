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

## Les fichiers qui comptent

| Fichier | Rôle |
|---|---|
| `note.md` | Manifeste : vision, priorités, règles interdites, principes d'or |
| `Coach_Pro_V1.5.html` | **Le produit** — application autonome (~1600 lignes), tout le moteur |
| `src/sports/registry.ts` + `src/sports/<sport>/` | **Le registre de sports** (R10) : un sport = un module qui DÉCLARE ses séances, sa prédiction, ses tests et ses `guards` (garde-fous). Un sport inconnu lève. |
| `src/engine/trailModel.ts` + `src/generator/trailLibrary.ts` | **Le module trail** (R7) : catégorie déduite, charge à 3 axes (temps/D+/D−), 14 séances |
| `endurabuild/` | **La PWA** — même produit en modules ES, mobile-first, installable/offline, vue plan en 4 onglets (voir ses RAPPORT-MIGRATION-PWA.md, RAPPORT-ONGLETS.md et RAPPORT-R4.md) ; UI = source de vérité désormais |
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
- `npm run measure:fallback [sport|tous]` — **mesure R15.3** : à quelle fréquence le créneau
  facile de repli (`easyFallbackSlot`) se déclenche. Détection POST-HOC (plan émis vs
  `weekSchema` déclaré), zéro instrumentation dans `src/`. Vérifie sa propre hypothèse
  (jours non réordonnés) et refuse de publier un taux sur un balayage vide. Trail 25,0 % des
  plans · swimrun 44,4 % — c'est ce chiffre qui a tranché O-3.
- `npm run golden:capture` / `golden:verify` — **golden master** (spec R10) : photographie
  758 plans (6 sports × formats × historiques × niveaux × intentions + passe garde-fous
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
  variables, esthétique « papier/collage » à préserver).

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
(📅 Semaine fondue dans 🗓 Plan en R16.9 — quatre onglets aujourd'hui).
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
