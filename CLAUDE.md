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
| `endurabuild/` | **La PWA** — même produit en modules ES, mobile-first, installable/offline, vue plan en 5 onglets (voir ses RAPPORT-MIGRATION-PWA.md, RAPPORT-ONGLETS.md et RAPPORT-R4.md) ; UI = source de vérité désormais |
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
- `npm run audit:v2` — mêmes 486 profils à travers le **moteur V2** (Sprint 1 :
  raisonnement + génération + réparation), même auditeur, + comparatif V1.5 ↔ V2.
- `npm run demo:repair` — preuve exécutable des garanties de la boucle de réparation.
- `npm run demo:readiness` — spec exécutable de l'adaptation quotidienne (Sprint 2) :
  scénarios de la roadmap assertés + invariants de sécurité.
- `npm run build:app` — bundle le moteur V2 dans `Coach_Pro_V1.5.html` (auto-testé avant
  écriture). **À relancer après toute modification de `src/`** ; `npm run check:app` (CI)
  refuse un HTML désynchronisé.
- `npm run test:e2e` — 4 suites Playwright contre la PWA (`tests/e2e/`, vrai Chromium,
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
affûtage garanti ≥40% de réduction (R3.13), règles du manifeste mécanisées. Seul signal
résiduel documenté : l'écart de métrique récup inter-blocs (voir `ARCHITECTURE.md`) — ce
n'est pas un défaut, ne pas le « corriger ».

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
📋 Profil · 🗓 Plan · 🎯 Aujourd'hui (CENTRAL, mis en valeur) · 📅 Semaine · 🥗 Nutrition.
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
