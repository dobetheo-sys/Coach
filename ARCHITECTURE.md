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
| `readiness/dailyAdjuster.ts` | `adjustDay(reasoned, plan, date, snapshot)` : rouge → la qualité est REMPLACÉE par de l'endurance (jour facile → repos actif ; affûtage → OFF), orange → corps ×0.7 structure conservée, verte → séance GARDÉE et dit explicitement. Écart prévu/réel 7j : >130% réalisé → verdict durci d'un cran ; <60% → **on ne rattrape jamais le volume manqué**. Chaque ajustement est un `{id, what, val, why}` |
| `audit/readinessDemo.ts` | Spec exécutable (`npm run demo:readiness`, en CI) : les scénarios de la roadmap assertés + invariants (hors verte jamais plus de minutes, jamais d'intensité supérieure, affûtage jamais chargé, toujours une décision) |

« Recalcul chaque matin » = recalcul à l'ouverture de l'appli (pas de backend ; persistance
localStorage côté produit).

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
