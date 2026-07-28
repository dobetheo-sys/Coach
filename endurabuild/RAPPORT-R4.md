# Rapport de livraison — Brief R4 (nutrition, avatar, partage, multi-plans, records)

Validation : 7/7 gardes CI vertes · smoke navigateur dédié **30/30 assertions**
(migration, multi-plans, records, journal+CSV, bandeau, avatar, modal+partage) ·
rendu visuel contrôlé (onglet Suivi, modal, image story 1080×1920).

## 0.1 — Bandeau réserves ✅ FAIT
- `warningsBannerHTML()` dans `tab-plan-general.js` : si `plan._v2.warnings.length > 0`,
  bandeau non-repliable en haut de l'onglet 🗓 Plan (style `momentHTML`, fond `#ffe3e0`),
  avec le TEXTE des réserves (pas juste un renvoi).
- Acquittement : ouvrir le `<details>` « Décisions du moteur » (📈 Avancement, id
  `motorDecisions`) mémorise `S.answers.warningsAck = warnings.join("|")` — le bandeau
  disparaît, et **revient si de nouvelles réserves apparaissent** après régénération
  (comparaison du texte, pas un simple booléen premier-rendu).

## 0.2 — Dette R3 ✅ DÉJÀ RÉSOLUE (confirmation demandée par le brief)
Le fichier `MESSAGE_CLAUDE_CODE_R3.md` n'existe plus dans le dépôt, mais la dette qu'il
décrivait est levée depuis le moteur V2 : le volume est piloté par **champs numériques
structurés** (`steps[{durationMin, distanceM, reps, bnd}]`, règle R3.2/R3.3), jamais par
réécriture de prose — `renderSess()` est le seul producteur de texte, en bout de chaîne.
Registre dans `ARCHITECTURE.md`. Rien à refactorer avant les features R4.

## 5 — Records ✅ FAIT
- `recordsHTML()` dans `tab-profile.js` : pure lecture/agrégation, zéro nouvelle structure.
- Sources : `S.answers.tests` (meilleure FTP = max, meilleure allure/CSS = min — la
  MEILLEURE jamais atteinte, pas la dernière) + séances réellement faites (✓ datés du
  plan + `fitSessions`) pour la plus longue séance par discipline. Dates affichées.
- Section simple (pas de sous-onglet : le contenu tient sur une carte).

## 4 — Multi-plans ✅ FAIT
- `state.js` : `S.plans[] + S.activePlanId` ; `S.sport/S.answers/...` restent l'état de
  travail du plan actif (le code existant les lit tel quel) — `ebSave()` recopie dans
  l'entrée active, `ebActivate()` fait l'inverse et invalide `currentPlan` (régénéré une
  fois au prochain `ensurePlan()`).
- Nuance vs brief : recopie explicite à la sauvegarde plutôt que getters JS — même
  garantie (aucun appelant modifié), moins de magie.
- Persistance `eb_state_v2` + **migration automatique** de `eb_state_v1` au premier
  chargement (vérifiée en navigateur : l'utilisateur existant retrouve son plan).
  L'ancienne clé v1 est laissée en place par prudence (plus jamais lue dès que v2 existe).
- Sélecteur dans 📋 Profil (pas dans la barre de nav — `tabs.js` reste navigation seule) :
  basculer, créer (questionnaire vierge), renommer (✏️), supprimer un plan NON actif (🗑
  avec confirmation). Chaque plan garde réponses, journal, ✓, records, thème d'avatar.
- « Changer de sport » ne réinitialise plus que le plan ACTIF (les autres sont préservés).

## 1 — Nutrition ✅ FAIT (version Open Food Facts + CSV, comme cadré)
- `nutrition-journal.js`, carte repliable dans 📅 Semaine (pas de 6e onglet — la barre à
  5 est déjà dense sur 375px).
- Journal petit-déj/déjeuner/dîner/collations, saisie manuelle + macros optionnelles,
  totaux du jour, rétention 30 jours (borne localStorage).
- Recherche **Open Food Facts** sans clé : texte (`cgi/search.pl`, l'endpoint de
  recherche libre réellement public — le `/api/v2/search` cité dans le brief ne fait que
  du filtrage par tags) et **code-barres** (`/api/v2/product/{code}`) ; pré-remplit les
  macros au prorata de la quantité (g), éditables avant ajout. Dégradation propre
  hors-ligne.
- **Import CSV MyFitnessPal** : parseur CSV local (guillemets gérés), colonnes détectées
  par en-tête (Date/Meal/Calories/Carbohydrates/Protein/Fat), dates US normalisées,
  import idempotent (pas de doublons au ré-import). Aucune promesse de « connexion
  MyFitnessPal » dans l'UI — l'API MFP est privée et fermée aux candidatures.
- **Delta ravito** : « X–Y g de glucides visés pendant l'effort » (module
  `sessionNutrition` existant × durée des séances du jour) vs total loggé. PAS de cible
  calorique/macros journalière — frontière nutritionniste inchangée, avertissement affiché.

## 2 — Avatar ✅ FAIT
- `avatar.js` : silhouette **SVG inline** (offline, dessinable sur canvas), variables
  100 % traçables : posture (séances réellement faites sur 7 jours : repos/marche/bras
  en V), aura (streak : verte ≥1, or ≥3, feu ≥6), accessoires (badges gagnés : bandeau/
  médaille/étoile), couleur du maillot = thème choisi parmi les **accents sport de
  `config.js`** (pas de nouveau système de couleurs), persisté par plan (`avatarTheme`).
- `EBV2.avatar` (niveaux/XP) conservé comme palier d'évolution : l'XP dérive de données
  réelles (semaines régulières, badges, charge) — pas d'XP arbitraire.
- Onglet 🎮 Suivi : avatar SVG + sélecteur de thème + bouton 📸 Partager (même moteur
  d'export que le point 3).

## 3 — Félicitations + partage ✅ FAIT
- Déclencheur : coche ○→✓ dans 📅 Semaine uniquement (pas à la dé-coche).
- Modal courte (`.eb-overlay/.eb-modal`) : avatar, nom/détail de séance, streak, **badge
  réellement débloqué par cette coche** (diff badges avant/après).
- `export.js` étendu (pas de nouveau module) : `storyBlob()` **1080×1920** (9:16) —
  dégradé à l'accent du sport, avatar SVG dessiné sur canvas, séance, streak, badge,
  date, signature. `shareStory()` : **Web Share API** avec `files:[PNG]` si
  `navigator.canShare`, sinon repli téléchargement (Safari desktop, headless…).
  Annulation utilisateur (AbortError) traitée comme un non-échec.
- Pas de SDK Instagram/Strava (aucune API publique de post direct côté web) ; pas de
  carte GPS (l'import FIT actuel ne lit que le résumé de séance, pas le tracé — on
  n'affiche pas ce qu'on n'a pas).

## Laissé de côté (assumé)
- Candidature API MyFitnessPal (action humaine, hors code).
- Tracé GPS sur l'image story (nécessiterait le parsing des records GPS du FIT).
- Sous-onglets internes (Records, Nutrition) : contenus encore assez compacts pour des
  cartes ; à scinder si ça grossit.

## Anomalies rencontrées en implémentation
- L'endpoint de recherche libre Open Food Facts est `cgi/search.pl` (JSON), pas
  `/api/v2/search` (filtrage par tags uniquement) — corrigé silencieusement, les deux
  hôtes sont bien publics et sans clé.
- Modal félicitations : la séance est retrouvée par sa clé `sem|jour|idx` dans le PLAN
  (pas la vue) — sinon la coche depuis une semaine passée pointait sur la mauvaise séance.
- Congrats/partage testés en headless : `navigator.share` indisponible → le repli
  téléchargement a été vérifié comme le chemin par défaut (30/30 au smoke).
