# ARCHITECTURE.md — choix techniques

> Pendant de `note.md` (vision, principes immuables) et de `CLAUDE.md` (guide opérationnel).
> Ici : comment le produit est construit, où vivent les invariants, comment on les vérifie.

## Vue d'ensemble

| Élément | Choix |
|---|---|
| Produit courant | `Coach_Pro_V1.5.html` — application monolithique HTML/JS (~1600 lignes), 100% client |
| Persistance | `localStorage` (`eb_state_v1`), restauration à l'ouverture (IIFE finale du script) |
| Exports | HTML imprimable, ICS (calendrier), JSON |
| Dépendance externe | Google Fonts uniquement (dégradation gracieuse) |
| Audit / garde-fous | TypeScript zéro-dépendance dans `src/`, exécuté par Node ≥22.18 (type stripping natif) |
| CI | `.github/workflows/audit.yml` — `npm run audit:v1` sur chaque push/PR, échec si violation dure |
| Prédécesseur | `endurabuild-3.html` — supprimé du dépôt, disponible dans l'historique git |
| Cible V2 | TypeScript modulaire (`src/engine`, `src/generator`, `src/audit`, `src/readiness`) — voir `ROADMAP-V2.md` |

## Le générateur V1.5 (dans `Coach_Pro_V1.5.html`)

### Pipeline de génération

```
questionnaire (S.answers)
  → evalRules()            règles pédagogiques {id, what, val, why}
  → buildPlan(a)
      phases (base/dev/spec/peak/taper, C19 : peak ≥ 1 semaine)
      → schema() + boucle jours (charges dur/facile/récup/off, anti-collage)
      → sess(slot, phase, prog)   séances en STEPS structurés (R3.2)
      → passes de correction (impact course, budget séances, polarisation)
      → boucle semaines : courbe de charge (bands) → cible → R3.3 scaleWeekBody
        → clampWeekBody (planchers/plafonds) → garde vol_max (C3) → R3.13 (affûtage)
      → renderSess()       SEUL producteur de texte ; calcule s.min et s.det
```

### Le modèle de steps (R3.2)

Chaque séance porte `steps: [{role: warmup|body|cooldown, durationMin|distanceM, reps, zone,
recoveryText, bnd:{floor,cap}}]`, construits par les helpers `W/Wm/B/Bd/C/Cm` dans `sess()`.
Aucun reparse de texte nulle part : le volume hebdo est la somme des champs (`weekMin`).
`renderSess()` rend le texte français et calcule `s.min` — **qui exclut la récup inter-blocs**
(choix assumé ; l'auditeur la compte, d'où un écart de métrique documenté).

### La courbe de charge (R3.3) et ses bornes

- Bandes normalisées par phase : `{base:[0.50,0.68], dev:[0.68,0.92], spec:[0.94,1.0],
  peak:[1.0,1.0], taper:[0.55,0.30]}` × pic réel (h) → cible hebdo.
- **C22** lisse la cible : jamais +10% d'une semaine de charge à la suivante (les plans courts
  plafonnent sous le pic théorique — santé avant performance).
- `scaleWeekBody` ajuste itérativement les steps `body` jusqu'à la cible ; les blocs
  d'intervalles ajustent leurs `reps` (≤15), les blocs uniques leur durée/distance.
- `blockBounds` centralise planchers/plafonds (R3.4b/R3.11) : bornes issues de la même source
  que la génération (`bnd` posé dans `sess()`), plafond de la longue suivant la phase (R3.12).

### Registre des règles (commentaires `R3.x` / `Cn` dans le code)

Les invariants sont marqués dans le code par leur identifiant. Ceux actuellement documentés :

| Id | Invariant |
|---|---|
| R3.2 | Séances en steps structurés, volume par sommation, zéro reparse de texte |
| R3.3 | La courbe de charge pilote le contenu de chaque semaine (scaling itératif) |
| R3.4b | Scaling borné aux steps body, planchers ET plafonds symétriques |
| R3.11 | Bornes dérivées de la même source que la génération (pas de tables parallèles) |
| R3.12 | Plafond de la séance longue progressif avec la phase (`_capScale`) |
| R3.13 | Affûtage : si les planchers bloquent la réduction, la fréquence cède (jours → OFF) |
| C3 | `vol_max` déclaré = plafond dur du volume hebdo |
| C6 | `volPeak` affiché = pic réel des semaines générées |
| C8/C12/C13 | Planchers de séance dignes / plafonds garantis / échauffement ≤25min et ≤ corps |
| C15 | Nage débutant : ≤850m/séance, tous blocs confondus (technique avant volume) |
| C16 | La longue progresse réellement (plancher digne, pas la borne basse du format) |
| C17 | La VO2 se maintient jusqu'à l'affûtage (jamais dans l'affûtage) |
| C18 | Tri : un créneau course de qualité garanti qui survit au budget |
| C19 | Tout plan a ≥1 semaine de phase peak (plans courts : dernière semaine de spec) |
| C20 | Nage débutant : la promesse déclarée suit la capacité C15 (~0.42h × séances/sem) |
| C21 | Historique « reprise » : plafonds brick ×0.8, leg CAP du brick borné par format |
| C22 | Progression lissée : jamais +10% entre semaines de charge (courbe déclarée) |
| C23 | Sortie longue CAP ≤3h pour un débutant |
| C24 | Piscine ≥750m par séance pour un non-débutant (plancher blocs distance 750) |
| C18b | Un seul « VO2max course » garanti par semaine de peak tri (le second créneau reste footing) |
| V2.1 | Sonde de capacité : la promesse déclarée suit ce que les plafonds de séance permettent |
| V2.2 | `repCap` : un bloc de qualité ne dépasse jamais son gabarit — l'excédent de volume va aux séances faciles, pas en zone grise |

La liste n'est pas exhaustive (certains C1–C14 vivent seulement dans le code) : en cas de
doute, chercher `// C` et `// R3.` dans `Coach_Pro_V1.5.html`.

## L'auditeur (`src/`, `npm run audit:v1`)

Spec exécutable indépendante du générateur — il recalcule tout bottom-up et ne croit jamais
les chiffres internes du moteur.

| Fichier | Rôle |
|---|---|
| `src/harness/v1Harness.ts` | Charge le moteur depuis le HTML dans Node : extraction `<script>` par regex, retrait de l'IIFE d'init, stubs DOM/localStorage, eval indirect + ligne d'export |
| `src/engine/loadModel.ts` | Quantification par séance : somme des steps (durée×reps, distance→temps via allures athlète) **+ récup inter-blocs** ; recoupe `s.min` ; chemin texte legacy conservé |
| `src/audit/coherenceScorer.ts` | Toutes les règles (voir ci-dessous), violations dures séparées du score /100 provisoire |
| `src/audit/runV1Audit.ts` | Fuzz 486 combinaisons (sports × formats × 3 historiques × 3 niveaux × 3 intentions), rapport `audit-results/v1-audit.{json,md}`, exit 1 si violation dure |

### Règles vérifiées (toutes à 0 échec sur 486 — CI les garde vertes)

Spec « audit 2 » (historique, fichier supprimé — mécanisée ici) : affûtage ≥40% de réduction
vs pic ; zéro VO2max en affûtage ; brick vélo dans les bornes du format ; semaine max en
phase peak (tolérance 5% de bruit de métrique) ; toute séance chiffrée (durée OU distance).

Manifeste `note.md` : courbe déclarée jamais +10% entre semaines de charge ; volume réel
jamais +25% (la bande +15–25% est tolérée comme bruit de métrique) ; jamais deux longues CAP
consécutives ; longue CAP ≤3h débutant ; piscine ≥750m non-débutant ; chaque séance explique
son objectif (`note`/💡) ; une nage facile/récup ne dépasse jamais la longue de sa semaine.

Garde-fous structurels : jamais deux jours durs adjacents ; semaine de récup jamais plus
chargée que la précédente ; ratio prescrit/déclaré par semaine dans [0.5, 1.4] ; part du plus
gros jour ≤55% de la semaine. **Répartition des intensités** (manifeste ~80/20) : part du
temps FACILE des semaines de charge ≥70% (dur), 70-73% toléré (souple) — médiane mesurée 83%.

### L'écart de métrique, documenté une fois pour toutes

L'auditeur compte la récup inter-blocs (temps réel passé à la séance) ; le `s.min` du
générateur ne la compte pas (charge d'entraînement). Les deux sont cohérents par construction
(recoupés séance par séance, écart médian ~0) mais les ratios audités dépassent légèrement
1.0 sur les semaines riches en intervalles. Les seuils des règles intègrent cette marge —
ne pas « corriger » l'un pour l'autre.

## Conventions de code

- **Français** partout (UI, commentaires, rapports d'audit).
- **Identifiants de règle** : tout invariant ajouté au générateur porte un commentaire
  `// Cn — …` ou `// R3.x — …` expliquant le pourquoi ; le scorer le vérifie ; la table
  ci-dessus le documente. C'est le format `{id, what, val, why}` de `evalRules` appliqué au code.
- **TypeScript effaçable** : Node exécute `src/` sans build — pas d'enum/namespace, imports
  avec extension `.ts` explicite, types only-erasable (`erasableSyntaxOnly` dans tsconfig).
- **Zéro dépendance npm** : le `package.json` n'installe rien ; ça doit rester vrai jusqu'au
  chantier V2 (et se discuter là).
- **Après toute modification du générateur** : `npm run audit:v1` doit rester vert ; la CI
  refuse le rouge.

## Moteur V2 (Sprint 1) — raisonner → générer → auditer → réparer

Le moteur V2 vit dans `src/engine/` + `src/generator/`, en TypeScript modulaire zéro-dépendance.
**Contrat de compatibilité** : il émet des plans à la forme V1Plan exacte, validés par
l'auditeur INCHANGÉ (`npm run audit:v2` — mêmes 486 profils, mêmes règles, 0 violation dure).

| Module | Rôle |
|---|---|
| `engine/types.ts` | Profil athlète typé (miroir S.answers), `Decision {id,what,val,why}`, ré-export du contrat V1Plan |
| `engine/constraintMatrix.ts` | Le savoir V1.5 en DONNÉES avec provenance (caps, bandes, C15–C24, interdits du manifeste) |
| `engine/reasoningEngine.ts` | `TrainingReasoningEngine.analyze(profil)` → décisions journalisées + paramètres du plan (durée, phases C19, pic, budget, courbe C22) |
| `generator/sessionLibrary.ts` | Les gabarits de séances (port de `sess()`) : steps structurés, notes systématiques, bornes sourcées de la matrice |
| `generator/renderer.ts` | `renderSess`/`stepMin`/ZDEF — même texte français que le produit, C13 |
| `generator/weekBuilder.ts` | Schémas 7j/10j, redistribution sans adjacence, fix peak « reprise », neutralisation médicale, plafond d'impact course, budget de séances, greffes renfo, anti-collage, polarisation |
| `generator/planGenerator.ts` | Pipeline : courbe (bands+C22) → scaling R3.3 borné → garde C3 → plancher C24 de séance → R3.13 → assemblage V1Plan. **V2.1 : sonde de capacité** — le moteur génère la semaine pic, mesure ce que les plafonds permettent réellement, et abaisse sa promesse si besoin (corrige l'écart V1.5 nage : 6.3h déclarées / 3.6h livrables → ratios ~1.15 en V2) |
| `generator/repairLoop.ts` | `generateAudited()` : génère → audite → **réparations ciblées** (jamais de régénération aveugle — un générateur déterministe rebouclerait à l'identique), ≤3 itérations, sinon **meilleur plan + avertissements explicites** |
| `audit/runV2Audit.ts` | Fuzz 486 combos du moteur V2 + tableau comparatif V1.5 ↔ V2 + journal de décisions d'un profil exemple → `audit-results/v2-audit.{json,md}` |
| `audit/repairDemo.ts` | Preuve exécutable des deux garanties de la boucle (sabotage → réparation convergente ; irréparable → avertissements) — `npm run demo:repair`, en CI |

## Adaptation readiness (Sprint 2) — `src/readiness/`

| Module | Rôle |
|---|---|
| `readiness/readinessSource.ts` | **Source enfichable** (`ReadinessSource`) : saisie manuelle (MVP, implémentée) → FIT → API Garmin si accès accordé (B2B sous agrément, non garanti). `assessReadiness()` dérive un verdict `verte/orange/rouge` TOUJOURS motivé (drivers) à partir de sommeil/HRV/FC repos/énergie/sensation — la logique d'ajustement ne sait jamais d'où viennent les chiffres |
| `readiness/fitParser.ts` | **Source « upload FIT » (implémentée)** : décodeur binaire FIT minimal zéro-dépendance (en-tête, définitions LE/BE, champs développeur sautés, valeurs invalides 0xFF…) limité aux messages `session` → sport/date/durée/distance/vitesse/FC/puissance. `fitToImport()` produit des `CompletedSession` (même contrat que les ✓) + estimations de références aux MÊMES règles prudentes que Strava (FTP = 95 % NP seulement si puissance ; allure moyenne = plancher). Un FIT d'activité ne contient PAS sommeil/HRV (fichiers monitoring Garmin, non exportables) — saisie manuelle maintenue pour ces signaux. Spec exécutable : `npm run demo:fit` (CI) |
| `readiness/dailyAdjuster.ts` | `adjustDay(reasoned, plan, date, snapshot)` : rouge → la qualité est REMPLACÉE par de l'endurance (jour facile → repos actif ; affûtage → OFF), orange → corps ×0.7 structure conservée, verte → séance GARDÉE et dit explicitement. Écart prévu/réel 7j : >130% réalisé → verdict durci d'un cran ; <60% → **on ne rattrape jamais le volume manqué**. Chaque ajustement est un `{id, what, val, why}` |
| `audit/readinessDemo.ts` | Spec exécutable (`npm run demo:readiness`, en CI) : les scénarios de la roadmap assertés + invariants (hors verte jamais plus de minutes, jamais d'intensité supérieure, affûtage jamais chargé, toujours une décision) |

« Recalcul chaque matin » = recalcul à l'ouverture de l'appli (pas de backend ; persistance
localStorage côté produit).

## Nutrition — ravitaillement d'effort (`src/nutrition/`)

**Périmètre volontairement limité** (frontière du conseil diététique — priorité n°1 du
manifeste) : le module couvre UNIQUEMENT le ravitaillement lié à la séance. Il ne prescrit
JAMAIS d'apport calorique journalier, de macros de régime, ni de restriction/déficit —
cette partie reste bloquée tant qu'un(e) nutritionniste n'a pas validé l'approche
(RESTE-A-FAIRE « À TOI »). Chaque conseil sort avec un avertissement obligatoire
(« ne remplace pas l'avis d'un professionnel ») que l'UI affiche tel quel.

| Module | Rôle |
|---|---|
| `nutrition/nutritionCalculator.ts` | `sessionNutrition()` : glucides pendant l'effort, hydratation, récupération, dépense estimée — repères des consensus publiés (ACSM 2016/2007, ISSN 2017, Jeukendrup 2014), jamais d'invention maison. `classifyIntensity()` réutilise `intensitySplit` (SEUL classificateur d'intensité du moteur — pas de deuxième chemin). `nutritionForSession()` = point d'entrée UI (V1Session → conseil, `rs` → null) |
| `audit/nutritionDemo.ts` | Spec exécutable (`npm run demo:nutrition`, en CI) : bornes dures + balayage 1440 entrées + invariants ci-dessous |

### Registre des règles nutrition (`N1`–`N7`)

| Id | Règle | Source |
|---|---|---|
| N1 | <1h (ou <1h15 facile) : aucun glucide nécessaire (rinçage de bouche possible si intense) | ACSM 2016 |
| N2 | 1h–2h30 : 30–60 g/h de glucides | Jeukendrup 2014 |
| N3 | >2h30 : 60–90 g/h, mix glucose:fructose au-delà de 60, tube digestif à entraîner | Jeukendrup 2014 |
| N4 | Hydratation à la soif 400–800 ml/h ; chaleur (≥25°C) → +200 ml/h + sodium ; **plafond dur 1000 ml/h** (hyponatrémie) | ACSM 2007 |
| N5 | Après dur/long : fenêtre 30–60 min, ~1–1.2 g/kg glucides + ~0.3 g/kg protéines (chiffré seulement si poids connu) | ISSN 2017 |
| N6 | **Jamais à jeun** sur séance dure ou longue (hypoglycémie d'effort = risque évitable) | manifeste, priorité n°1 |
| N7 | Dépense estimée en fourchette (MET × poids × durée) — une information, jamais une cible à compenser ni à creuser | compendium Ainsworth |

Invariants assertés en CI : glucides ≤90 g/h et boisson ≤1000 ml/h quelles que soient les
entrées ; avertissement toujours présent ; aucun vocabulaire de restriction en sortie
(`FORBIDDEN_OUTPUT`) ; dur/long → jamais à jeun + récupération toujours proposée ; chaque
conseil motivé `{id, what, val, why}`. Côté UI (PWA) : carte « 🥤 Ravitaillement
d'aujourd'hui » dans l'onglet 📅 Semaine (température Open-Meteo en différé, dégrade
proprement), poids optionnel dans 📋 Profil (journalisé `profil:weight`, n'affecte QUE le
ravitaillement — le plan n'est pas régénéré).

## Branchement UI ↔ moteur V2 (`src/app/` + `scripts/buildApp.mjs`)

Le produit reste UN fichier HTML autonome, mais sa génération passe par le moteur V2 :

- **`src/app/bridge.ts`** — la SEULE surface exposée à l'UI (`globalThis.EBV2`) :
  `buildPlan(sport, answers)` (→ V1Plan + `_v2 {decisions, warnings, score}`),
  `adjustToday(sport, answers, snapshot)` (→ journée adaptée), `assessReadiness`.
  Aucune logique métier dans l'UI (manifeste §9).
- **`scripts/buildApp.mjs`** (`npm run build:app`, zéro dépendance) — concatène les modules
  `src/` dans l'ordre des dépendances, retire types (node:module.stripTypeScriptTypes) et
  imports/exports, enveloppe en IIFE, **auto-teste le bundle** (plan généré + adaptation)
  avant d'écrire, puis l'injecte entre marqueurs `__EBV2_START__/__EBV2_END__` APRÈS le
  script principal (le harnais d'audit extrait le premier `<script>` : il doit rester le
  legacy). `npm run check:app` (CI) refuse un HTML désynchronisé des sources.
- **Dans le HTML** : `buildPlan` est réassigné vers `EBV2.buildPlan` avec le générateur
  legacy en REPLI ; `renderPlan` affiche la carte « 🌡 Forme du jour » (readiness → 
  `adjustToday`) et le panneau « 🧠 Les décisions du moteur » (raisonnement + score d'audit).

**Règle de travail : après toute modification de `src/`, lancer `npm run build:app`** —
sinon `check:app` échoue en CI. Le générateur legacy dans le HTML est du code de repli :
ne plus le faire évoluer (le moteur V2 est la source de vérité).

Étapes suivantes : chantiers différés (nutrition — avis nutritionniste requis, dashboard,
gamification, partage) et sources readiness FIT/Garmin quand l'accès existe.

## Écran d'accueil : « Forme du jour » avant toute séance (`endurabuild/js/ui/tab-week.js`)

Demande produit : à l'ouverture, l'app demande d'abord sommeil/VFC/énergie/ressenti, et
n'affiche la séance qu'après. `renderTabWeek()` (l'onglet 📅 Semaine, écran par défaut)
se scinde en deux écrans exclusifs :

- **Check-in** (`checkinGateHTML()`) — tant que `S.answers.readiness.date` n'est pas
  aujourd'hui (`readinessDoneToday()` dans `readiness.js`) : SEULE la carte « Forme du
  jour » est visible, aucune séance, aucune grille — pas de spoiler avant d'avoir répondu.
  Une fois par jour, jamais insistant (pas de nouvelle question tant que le jour ne change
  pas). Validée (`rdApply`) → `applyReadiness()` date le snapshot et sauvegarde.
- **Vue complète** — une fois le check-in fait : `heroSessionHTML()` (la séance du jour
  DÉJÀ adaptée au verdict via `EBV2.adjustToday`, badge verdict 🟢/🟠/🔴 + action ; si
  repos, cherche et affiche la PROCHAINE séance non-repos dans le plan — jamais un écran
  sans direction), puis la semaine complète, puis nutrition, puis un `<details>`
  « Modifier ma forme du jour » (le formulaire complet, replié).

Le sélecteur **VFC** (`rdHrv`, `hrvStatus: "basse"|"normale"|"haute"`) est désormais
montré à TOUT LE MONDE dans cette carte (plus de question premium séparée qui ne servait
qu'à un rappel manuel — voir audit ci-dessous) : il agit directement sur
`assessReadiness`/`adjustToday`, défaut neutre « normale » pour qui ne suit pas cette
donnée.

## Audit d'influence des paramètres — chaque réponse doit agir sur le plan

Passage systématique : pour chaque champ du questionnaire, vérifié dans `src/engine` +
`src/generator` qu'il influence réellement le plan généré (pas seulement une carte de
décision non affichée). Trouvailles et correctifs :

| Paramètre | Constat | Correctif |
|---|---|---|
| `S.answers.tests` (FIT/Strava) | **Bug** : le moteur V2 ne lit QUE `a.ftp/pace/css` (valeur courante), jamais le journal daté — un import poussait au journal mais ne changeait JAMAIS le plan généré, malgré le message affiché disant le contraire. | `tab-profile.js: syncRefsFromTests()` — pousse le test le PLUS RÉCENT de chaque type vers `a.ftp/pace/css` + `*_known` après tout import (FIT ou Strava), avant régénération. |
| `swim_limit` | 1 valeur sur 4 (« peur ») avait un effet, et seulement en eau libre — bassin + les 3 autres limites (respiration/technique/endurance) ne changeaient rien. | `sessionLibrary.ts` : les 4 valeurs orientent réellement les éducatifs (dur1 débutant, facileR bassin/OW) avec une note dédiée. |
| `availability` (grille « Contraintes de semaine ») | Étape premium entière (jours bloqués/club) écrite dans `S.answers.availability`, lue par le générateur **legacy uniquement** — jamais par le moteur V2 réellement utilisé. | Étape retirée (redondante avec `off_which`, déjà gratuit et réellement branché, pour le cas « bloqué » ; le cas « club à durée fixe » n'était pas porté par V2 et sortait du périmètre de ce correctif). |
| Calculateurs de tests (P20/CSS 400-50/3-10min/VMA) | UI de calcul manuel, dans la même étape que ci-dessus. | Retirés ; remplacés par `protocolHTML()` dans `steps.js` — la MÉTHODE pour aller chercher soi-même FTP/allure/CSS (test réel), avec renvoi explicite vers l'onglet 📋 Profil pour la saisir plus tard. |
| `hrv` (« Suivi HRV quotidien ? ») | Question premium n'affectant jamais le plan (l'evalRules le disait lui-même : « à appliquer toi-même »). | Retirée ; remplacée par le sélecteur VFC toujours visible dans « Forme du jour » (effet réel, voir section précédente). |
| `daily_burn` (« Activité hors sport ») | Aucun consommateur nulle part (vestige d'un futur module calories, hors périmètre). | Retiré. |
| `height` (Taille) | Aucun consommateur nulle part, aucune advisory. | Retiré. |
| `weight_lever`, `cycle_sync`, `sex` (ferritine), etc. | Effet réel = une carte `evalRules()` — mais cette liste n'était **affichée nulle part dans l'app** depuis la suppression du « mur de règles » (seulement dans l'export HTML). Répondre à la question n'avait aucune conséquence visible. | `tab-progress.js` : section repliable « 🧭 Conseils personnalisés » (`evalRules()` + `rulesGrouped()`, code déjà existant mais orphelin) — désormais visible dans l'app. |

Conséquence : l'onboarding premium passe de 5 à 3 écrans (sommeil/vie, poids, courses
intermédiaires) — chacun à effet vérifié.

## 5e onglet 🎮 Suivi — avatar évolutif + monitoring séance (`endurabuild/js/ui/tab-monitor.js`)

Demande produit : gamifier davantage, avec un avatar qui évolue. Ajouté SANS nouvelle
collecte de données — tout dérive des métriques déjà calculées (`progressV2`/`badgesV2`).

- **`src/app/bridge.ts` : `avatarV2(plan, answers, todayISO)`** — XP CUMULATIF (jamais
  décroissant, même philosophie que les badges « gagné-jamais-perdu ») : `semaines
  régulières × 120 + badges × 80 + %charge × 3 + minutes accomplies / 15`. 7 paliers
  (🥚 Premier pas → 🌱 → 🌿 → 🌳 → 🔥 → 🥈 → 🏆 Vétéran). Aucune performance brute
  (chrono/FTP) dans le calcul — uniquement régularité, conforme à la priorité n°3 du
  manifeste. Exposé `EBV2.avatar`.
- **Monitoring de la séance** : les steps de la séance DU JOUR (déjà adaptée par
  `adjustToday`, même donnée que la carte « Aujourd'hui » de l'onglet Semaine) sont
  regroupés par rôle (échauffement/corps/retour au calme) en 3 cases à cocher, suivi
  LOCAL en temps réel — ne nourrit PAS directement la fatigue de l'ajusteur (ça reste le
  rôle du ✓ de l'onglet Semaine). Quand toutes les cases d'une séance sont cochées,
  **le ✓ existant se coche automatiquement** pour toutes les séances planifiées du jour
  (pas de correspondance index-à-index fragile entre séance adaptée et séances d'origine
  — un remplacement readiness peut fusionner plusieurs séances prévues en une seule ;
  la synchronisation reste globale au jour, jamais un mauvais index mal coché).
- **Badges** : galerie complète déplacée ici (design du tab dédié à la gamification) ;
  l'aperçu compact dans l'onglet Avancement reste en place (contexte différent, pas une
  duplication gênante).

Barre à 5 onglets (`tabs.js`), fallback robuste `TABS[TABS.length - 1]` (plus d'index
codé en dur qui casserait à un futur 6e onglet).

## Séances repliables + glossaire éducatifs détaillé

Demande produit : réduire l'affichage des séances (liste dense) et les rendre cliquables
pour voir le détail. `<details>/<summary>` natif (pas de JS de toggle à maintenir),
fermé par défaut partout (grille de la semaine ET carte « Aujourd'hui ») — chevron `▸`
en CSS (`.gd-sess`, `styles.css`).

Les éducatifs de natation (respiration/technique/endurance/peur, `sessionLibrary.ts`)
ne se contentent plus de NOMMER le geste : chaque description dit COMMENT le faire
(ex. « rattrapé : le bras devant reste tendu jusqu'au contact des mains avant de
repartir — corrige le timing »). Un seul glossaire (`swimDrillGlossary`, hissé au niveau
du module pour être accessible aux branches swim ET tri) évite la duplication de texte
entre les deux sports.

## R4 — multi-plans, journal nutrition, avatar SVG, partage (endurabuild/)

Livraison détaillée dans `endurabuild/RAPPORT-R4.md`. Points structurants :
- **Multi-plans** : `state.js` passe à `eb_state_v2` (`S.plans[] + S.activePlanId`),
  l'état de travail (`S.sport/S.answers/...`) reste celui du plan actif — recopie à
  `ebSave()`, hydratation à `ebActivate()` (invalide `currentPlan`). Migration automatique
  v1→v2 au chargement. « Changer de sport » ne touche que le plan actif.
- **Bandeau réserves** (`tab-plan-general.js: warningsBannerHTML`) : `plan._v2.warnings`
  affichées en bandeau non-repliable sur l'onglet Plan, acquittées par l'ouverture du
  `<details>` `#motorDecisions` (ack = texte des warnings, pas un booléen).
- **Journal nutrition** (`nutrition-journal.js`) : journal personnel (jamais de cible
  calorique — frontière nutritionniste), recherche Open Food Facts, import CSV
  MyFitnessPal local, delta glucides vs module ravitaillement. Rétention 30 jours.
- **Avatar SVG** (`avatar.js`) : chaque variable visuelle traçable à une donnée réelle
  (posture=7 jours réels, aura=streak, accessoires=badges, thème=accents sport).
- **Partage story** (`export.js: storyBlob/shareStory`) : PNG 1080×1920, Web Share API
  avec repli téléchargement ; modal félicitations à la coche ○→✓ (`tab-week.js`).

## Spec rétention (MESSAGE_CLAUDE_CODE_R4) — livraison

Rapport détaillé : `endurabuild/RAPPORT-R4-RETENTION.md`. Points structurants :
- `src/engine/disciplineRegistry.ts` — disciplines déclaratives (trail modulaire :
  temps+D+, GAP, compétence descente, prudence excentrique) ; ajouter une discipline =
  une entrée + gabarits, sans toucher au moteur (asserté).
- `assessReadiness` : `painFlag` → rouge forcé ; `lastRpe ≥8` → signal annoncé. Le bridge
  les injecte automatiquement depuis `answers` (aucun appelant ne peut les oublier).
- `EBV2.adherence` — streak par jour (repos compris, gel douleur/maladie, zéro récompense
  hors plan) ; garde CI `npm run demo:retention` (critères §14 de la spec).
- PWA : `celebrations.js` (15×4), `retest.js` (cycle boss fight sur journal+syncRefs),
  `daily-content.js` (90 anecdotes/physio par phase/stat perso/micro-défis, rotation
  déterministe par date), `notifications.js` (limites sans backend documentées dans l'UI).

## Lot améliorations (juillet 2026) — solidité avant nouveauté

Passage systématique sur les fragilités relevées à l'auto-revue ; aucun nouveau périmètre
produit, que du durcissement. Points structurants :

- **Ancrage du calendrier (`plan_start`)** — bug critique corrigé : sans date de course, le
  plan se ré-ancrait sur le lundi COURANT à chaque régénération (semaine 1 éternelle,
  streak/progression faussés). `ensurePlan()` pose `answers.plan_start` UNE fois ; le
  générateur (`weekBuilder.ts`) ancre dessus. Asserté dans `demo:retention` (plan démarré
  il y a 3 semaines → aujourd'hui en semaine 4 + déterminisme de régénération).
- **État partagé entre plans (`S.shared`)** — la personne est une, ses plans sont
  plusieurs : readiness du jour, drapeau douleur, jours malades, poids, réglages de rappel
  vivent dans `eb_state_v2.shared` (SHARED_KEYS dans `state.js`, lift à la sauvegarde /
  overlay à l'activation). Changer de plan ne « guérit » plus une douleur signalée.
- **Sauvegarde/restauration** (Profil) : export JSON de tout `eb_state_v2`, restauration
  validée + confirmée — le seul filet tant que tout vit en localStorage.
- **Auto-✓ FIT** : un fichier importé coche automatiquement la séance planifiée
  correspondante (même date + même sport + durée à ±30 %/15 min) — la boucle prévu/réel
  se ferme sans double saisie.
- **Échange de jours persistant (⇄, `answers.daySwaps`)** : deux taps dans la grille
  semaine ; réappliqué après CHAQUE régénération (`applyDaySwaps` dans `tabs.js`), ✓ et
  feedbacks remappés une fois à la création, garde-fou « deux jours durs consécutifs »
  avec confirmation et annulation complète. Re-taper le même échange l'annule.
- **Journal des verdicts (`answers.readinessLog`)** : chaque check-in archive
  {date, niveau, action} (90 jours) ; carte « 🤖 Adaptations quotidiennes » dans
  Avancement — la preuve visible que le plan n'est pas un PDF.
- **Résultat de course réel (`answers.raceResult`)** : course passée → saisie du chrono
  dans Avancement, affiché face à la prédiction de l'époque — calibration honnête.
- **Accessibilité des modales (`js/ui/modal.js`, `trapModal`)** : aria-modal sur la boîte
  de dialogue, focus déplacé à l'ouverture, piège Tab/Shift+Tab, Échap ferme. Branché sur
  feedback RPE, félicitations et révélation de retest.
- **Monolithe gelé** : commentaire d'en-tête dans `Coach_Pro_V1.5.html` — la PWA est la
  source de vérité UI ; le fichier reste parce que `audit:v1` s'exécute contre lui et que
  `build:app` y réinjecte le bundle. Ne plus y développer d'UI.
- **E2E en CI (`tests/e2e/`, `npm run test:e2e`)** : 4 suites Playwright (check-in, R4,
  rétention, améliorations — 74 assertions) contre la PWA servie localement, dans un vrai
  Chromium. Playwright est une devDependency de TEST uniquement — le produit et l'audit
  restent à zéro dépendance. Job CI `e2e` séparé (9 contrôles au total sur chaque push).
