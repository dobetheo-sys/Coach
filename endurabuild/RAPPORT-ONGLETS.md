# Rapport — Refonte en 4 onglets (brief `BRIEF_CLAUDE_CODE_ONGLETS.md`)

## Ce qui a été livré

La vue plan de la PWA est réorganisée en **4 onglets**, barre fixe en bas d'écran
(usage à une main, `env(safe-area-inset-bottom)` pour la zone gestuelle iOS) :

| Onglet | Fichier | Contenu |
|---|---|---|
| 📋 Profil | `js/ui/tab-profile.js` | Résumé des réponses, références éditables (FTP / allure seuil / CSS / volume max / séances max), **journal d'évolution horodaté** |
| 🗓 Plan | `js/ui/tab-plan-general.js` | Bandeau « ce qui pilote ton plan », phases, barres de volume, calendrier (3 premières semaines + dernière, dépliable), exports |
| 📈 Avancement | `js/ui/tab-progress.js` | Charge CTL/ATL/TSB + compliance, régularité/streak/badges, **prédiction de course (déplacée ici)**, historique prévu vs réel, intensités 80/20, décisions du moteur |
| 📅 Semaine (RETIRÉ en R16.9, fondu dans 🗓 Plan) | `js/ui/tab-week.js` (supprimé) | **Onglet par défaut** — uniquement la semaine en cours, coche des séances (○→✓), « Forme du jour » au plus près de l'action |

Le conteneur `js/ui/tabs.js` gère la navigation et l'état de l'onglet actif — zéro
logique métier. `plan-view.js` garde les calculs partagés (`loadSeries`,
`loadChartSVG`, `estimateTSS`, `driverBand`, `downloadPlan`) ; son ancien
`v2ExtrasHTML` est scindé en `readinessCardHTML()` (Semaine) et
`progressCardsHTML()` (Avancement). `renderPlan()` reste le point d'entrée
historique (app.js, steps.js) et délègue au conteneur — aucun appelant modifié.

## Confirmation : aucun `buildPlan()` au changement d'onglet (mesuré)

**Par construction** : le plan vit dans `S.currentPlan` (jamais persisté — recalculé
au chargement) ; `ensurePlan()` dans `tabs.js` est le SEUL chemin de (re)génération et
ne rappelle `buildPlan` que si `S.currentPlan` est nul. `setTab()` ne fait que
re-rendre la vue. Les invalidations sont explicites : retour questionnaire
(`renderPlan` ré-invalide avant de régénérer), `reset()`, édition du profil.

**Par mesure** (Chromium headless, `smoke` de validation) : `EBV2.buildPlan`
instrumenté par un compteur, puis 8 changements d'onglet (2 tours complets) →
**0 appel**. Coche d'une séance dans Semaine (re-rendu de la vue) → **0 appel**.
Édition d'une valeur de profil → **exactement 1 appel** (la régénération voulue).
29/29 assertions vertes, + 3/3 sur le flux d'onboarding.

## Confirmations demandées par le brief

- **Onboarding intact** : `renderStep`/`renderBlueprint` inchangés ; `renderStep`
  retire la barre (`hideTabs`) — vérifié : aucun onglet ne s'affiche avant la
  génération, le premier `renderPlan()` bascule vers la vue à onglets (défaut :
  📅 Semaine, l'écran du quotidien).
- **Exports identiques** : JSON / ICS / PNG / HTML inchangés (`js/export.js` non
  modifié), boutons dans l'onglet 🗓 Plan — présence et branchement vérifiés au smoke.
  Ils fonctionnent quel que soit l'onglet actif (actions ponctuelles, pas des vues).
- **« Forme du jour » identique** : `js/ui/readiness.js` non modifié ; la carte est
  rendue par l'onglet 📅 Semaine et `rdApply` re-branché à chaque rendu — vérifié.
- **Moteur V2 et générateur legacy non touchés** : `js/engine.js` (bundle) et
  `js/legacy-fallback.js` inchangés ; `audit:v1` + `audit:v2` 486/486 verts,
  `check:app` vert.
- **Journal d'évolution = extension de `S.answers.tests`** : pas de nouvelle
  structure. Une modification manuelle pousse `{type, value, prev, date,
  source:"profil (modification manuelle)"}` — mêmes types que `ebAddTest`/
  `stravaImport` pour FTP/allure/CSS (`ftp`, `thrPace`, `css`), types `profil:*`
  pour le reste (volume, séances). Vérifié : « allure 4'30 → 4'20 » consigné et affiché.
- **Anti-XSS** : toute donnée utilisateur réaffichée dans les nouveaux onglets passe
  par `esc()` (state.js) — testé avec une entrée hostile dans le journal : neutralisée.
- **Service worker** : version `eb-pwa-v2`, les 5 nouveaux modules ajoutés au cache.

## Compléments après la refonte

- **Mode 10 jours (`use10`) vérifié de bout en bout** dans la vue à onglets : marqueurs
  de cycle C×J×, case « aujourd'hui » surlignée, semaine courante correcte —
  11/11 assertions Chromium (profil vélo, dispo quotidienne).
- **Célébrations « moment »** (`momentHTML`, dans `session-life.js` depuis R16.9) : bannière ponctuelle le
  jour de course, la veille de course (courses intermédiaires `plan.races` ET course
  principale `race_date`), et le premier jour d'affûtage. Silencieux les jours ordinaires,
  dégrade proprement si le plan n'a pas de dates (repli legacy).

## Détails d'implémentation notables

- La coche des séances reste possible aussi dans le calendrier de l'onglet 🗓 Plan
  (semaines passées : sans ça, une semaine sortie de « Semaine » deviendrait
  incochable et casserait le streak).
- `body.has-tabs` masque le hero et la barre de progression du questionnaire
  (écran du quotidien léger) et réserve la place de la barre
  (`padding-bottom: calc(64px + env(safe-area-inset-bottom))`).
- `S.currentPlan` n'est PAS écrit dans `localStorage` (`ebSave` liste ses clés) :
  au rechargement le plan est régénéré une fois — mêmes réponses ⇒ même plan
  (générateur déterministe), et le format stocké `eb_state_v1` reste inchangé.
