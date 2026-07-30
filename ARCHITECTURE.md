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
`renderSess()` rend le texte français et calcule `s.min` — **récup inter-blocs comprise**
(R5.6a) : le `_min` d'un bloc répété vaut `reps × durée + (reps−1) × récup`. La durée annoncée
est donc la durée porte-à-porte, la même que celle de l'auditeur.

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

### R5.6a — l'écart de métrique récup, fermé (30/07/2026)

**Ce que c'était.** L'auditeur comptait la récup inter-blocs (temps réel passé à la séance),
`s.min` non (charge d'entraînement). Deux lectures de la même séance, écart documenté depuis des
mois, à l'origine de `U-DECL` (semaines prescrivant plus qu'annoncé) et de la dette F2 du banc v6.
Chiffré avant correction : **+3 % sur un plan entier, mais +22 % en moyenne et jusqu'à +50 %** sur
les 356 séances à récup chiffrée — une séance annoncée 30 min en durait 45. L'athlète ne vit pas la
moyenne du plan : il vit son mardi soir.

**Pourquoi la première tentative avait échoué** (elle est instructive). Ajouter un champ
`recoveryMin` au niveau de la SÉANCE donnait 9 violations dures : la courbe met à l'échelle la
durée des blocs, pas une constante posée à côté. Le livré valait `corps × f + récup` alors que `f`
était calculé sur le total — sous-correction systématique, d'autant plus grande que la part de
récup est grande.

**Ce qui la fait marcher.** La récup entre dans le `_min` du BLOC qui la porte
(`stepMin` : `reps × durée + (reps−1) × récup`), pas de la séance. Le facteur R3.3 agit sur les
RÉPÉTITIONS : la récup suit donc l'échelle au lieu de lui résister, et les cinq itérations de la
boucle convergent comme avant. Résultat mesuré : **0 violation dure** sur les 594 combinaisons de
`audit:v2`, 486/486 sur `audit:v1`, et l'écart médian entre les deux estimateurs tombe à **0,0 min**
— les recoupements de `sessionLoadFromSteps` mesurent enfin la même séance que le générateur.

Trois conséquences dans le même lot :
- **F2** (banc v6) passe de 28 séances sous 45 % de zone cible à **7**, toutes minuscules
  (1×4min de VO2) avec échauffement/retour déjà au plancher — dette conservée sciemment ;
- **D4** devient une RÈGLE au lieu d'un effet de bord (voir ci-dessous) ;
- les clamps C13/C13b restent calculés sur le TRAVAIL, récup exclue — sinon l'écart qu'on
  vient de fermer se rouvrirait sur l'échauffement.

### C13c / C13d / C13e — l'échauffement, ses bornes et leur ordre

Trois bornes, priorité décroissante, toutes appliquées dans `renderSess` (seul producteur de texte) :

| id | règle | statut |
|---|---|---|
| **C13e** | échauffement **≤ corps de séance**, 6 sports, minutes ET mètres | invariant DUR (`F6`) |
| **C13** | ≤ 25 min, et ≤ 80 % du corps quand celui-ci est confortable | plafond |
| **C13c** | **≥ 10 min**… mais **cède** à C13e quand le corps est plus court | plancher (`F4`) |

Mesuré : 840 séances sur 40 550 sortaient avec un échauffement plus long que leur corps →
**0**. Le « corps » de C13e est le corps TEL QU'IL EST ÉCRIT, récupération comprise (R5.6a) ; la
clause de proportion, elle, reste adossée au TRAVAIL — son objet est que le stimulus reste
majoritaire. Résidu : 307 séances de trail sous 10 min, dont la récupération de descente n'est
pas chiffrée (leur corps est mesuré à 4 min pour ~20 min réelles).

`C13c` avant C13e : le plancher était à 3 min et la clause de proportion l'y ramenait dès que la
courbe réduisait la séance — 1 213 séances de QUALITÉ s'échauffaient moins de 10 min, 663 moins
de 5.

`C13d` : corollaire obligatoire. Avec 10 + 3 min incompressibles, une séance de 17 min ne contient
plus que 4 min de travail — elle est **déclassée en endurance**, pas rabotée (128 séances, 4,6 %).
Exclusions mesurées : le trail (charge verticale) et tout bloc en DISTANCE (la nage a sa propre
dose minimale, C24/C15 — déclasser un 8×50 m VO2 supprimait le seul stimulus aérobie maximal de
trois plans swimrun). Le seuil reste à **8 min**, délibérément PAS aligné sur les 10 min de C13c :
les aligner faisait passer toutes les séances de qualité d'une petite enveloppe sous le seuil, et
le plan perdait son unique stimulus VO2 sur 41 semaines. Un plan petit reste un plan.
Gardes CI : `F4`, `F5`, `F6` au banc v6.

### Le retrait de volume vient des séances faciles — la règle symétrique de R4.1

R4.1 disait « le déversement de volume va vers les séances FACILES, jamais vers un bloc de
qualité ». Le sens inverse manquait, et quatre passes s'en servaient pour sacrifier le stimulus :
la coupe du plancher piscine prenait la plus COURTE des séances remontées (donc la VO2 en nage,
8×50 m) ; le budget de séances comptait les jours de récup sans pouvoir les couper, si bien qu'un
jour de récupération survivait au créneau de qualité ; `repMax` valait le nombre de répétitions
COURANT à défaut de `repCap`, créant un cliquet qui empêchait un bloc réduit à 1×3min de jamais
remonter ; et un bloc de qualité n'avait aucun plancher de dose. Corrigés ensemble : le retrait
vient des séances faciles, un bloc de qualité ne descend pas sous 8 min de dose, et si la seule
victime possible est une séance de qualité, on ne coupe pas — la semaine reste au-dessus de sa
cible et le chiffre ANNONCÉ s'aligne (avec son avertissement). Une promesse d'heures se corrige ;
un stimulus supprimé pendant 20 semaines ne se rattrape pas.

### Cinq règles de sécurité, un seul point de convergence

`reconcileDeclaredVolume()` est appelée EN DERNIER, après la boucle de réparation, et porte
désormais cinq garanties qui étaient chacune ÉMERGENTES avant de casser :
C22 (progression ≤ +10 % entre semaines de charge), **D4 (une semaine de récup n'est jamais plus
lourde que celle qu'elle assimile)**, R5.3 (l'affûtage décroît strictement), **R3.13 (l'affûtage
pèse ≤ 60 % du pic livré)** et l'alignement du volume déclaré sur le prescrit. Même leçon cinq
fois : *une règle de sécurité vérifiée au milieu du pipeline ne vérifie que l'avant-dernier état.*

- **D4** vivait dans le calcul de la cible ; quand les planchers de séance saturent la semaine
  (deux récups consécutives d'un cycle de 10 jours, réduites à leurs deux séances minimales), la
  cible n'a plus prise et la composition décide seule — 33 min puis 36 min, une « récupération »
  qui remonte.
- **R3.13** était tenue par des coupes réparties dans la boucle, qui s'arrêtaient toutes aux
  planchers de séance. Le point aveugle : un plancher dit « en dessous, la séance ne vaut pas le
  déplacement » — c'est une règle de semaine de CHARGE. L'affûtage a pour objet même de
  raccourcir ; une sortie longue d'affûtage EST une sortie longue réduite. Les corps s'y réduisent
  donc jusqu'à un plancher d'affûtage explicite (10 min), et la fréquence ne cède qu'après.

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

### Registre des règles nutrition (`N1`–`N10`)

| Id | Règle | Source |
|---|---|---|
| N1 | <1h (ou <1h15 facile) : aucun glucide nécessaire (rinçage de bouche possible si intense) | ACSM 2016 |
| N2 | 1h–2h30 : 30–60 g/h de glucides | Jeukendrup 2014 |
| N3 | >2h30 : 60–90 g/h, mix glucose:fructose au-delà de 60, tube digestif à entraîner | Jeukendrup 2014 |
| N4 | Hydratation à la soif 400–800 ml/h ; chaleur (≥25°C) → +200 ml/h + sodium ; **plafond dur 1000 ml/h** (hyponatrémie) | ACSM 2007 |
| N5 | Après dur/long : fenêtre 30–60 min, ~1–1.2 g/kg glucides + ~0.3 g/kg protéines (chiffré seulement si poids connu) | ISSN 2017 |
| N6 | **Jamais à jeun** sur séance dure ou longue (hypoglycémie d'effort = risque évitable) | manifeste, priorité n°1 |
| N7 | Dépense estimée en fourchette (MET × poids × durée) — une information, jamais une cible à compenser ni à creuser | compendium Ainsworth |
| N8 | Métabolisme de base en enveloppe (Mifflin-St Jeor ; donnée manquante → fourchette élargie, jamais de fausse précision) | Mifflin 1990, ADA 2005 |
| N9 | Dépense du jour = base × NAP 1.35–1.55 (hors sport) + entraînement (N7) — information, jamais une cible | FAO/WHO/UNU 2001 |
| N10 | Macros en RÉPARTITION indicative : protéines 1.2–1.7 g/kg, lipides 20–35 % (plancher 20 %), glucides 3–10 g/kg selon le volume du jour — « photographie de la littérature, pas un menu » | ACSM/AND/DC 2016, AMDR, Burke 2011 |

N8–N10 (`nutrition/energyEstimator.ts`) débloqués par **décision utilisateur du
28/07/2026** (« estimation des calories dépensées de base + entraînement + macros,
jamais de conseil de nutrition ») : tout est ESTIMATION de dépense ou répartition
observée, jamais une consigne d'apport ; sans poids → null (l'UI renvoie au Profil) ;
avertissement renforcé `ENERGY_DISCLAIMER` obligatoire. Le CONSEIL nutritionnel
(cibles d'apport, menus) reste bloqué avis diététicien.

Invariants assertés en CI : glucides ≤90 g/h et boisson ≤1000 ml/h quelles que soient les
entrées ; avertissement toujours présent ; aucun vocabulaire de restriction en sortie
(`FORBIDDEN_OUTPUT`) ; dur/long → jamais à jeun + récupération toujours proposée ; chaque
conseil motivé `{id, what, val, why}` ; N8–N10 : jamais de cible, planchers de sécurité
macros tenus, fourchette élargie si données incomplètes, null sans poids. Côté UI (PWA) :
carte « 🥤 Ravitaillement d'aujourd'hui » + carte « 🔥 Dépense estimée du jour »
(`EBV2.dailyEnergy`) dans l'onglet 📅 Semaine, poids et taille optionnels dans 📋 Profil
(n'affectent QUE ravitaillement/dépense — le plan n'est pas régénéré).

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

## Relais OAuth Strava (`server/`) — le seul composant serveur du projet

`server/strava-relay.js` : Cloudflare Worker d'un fichier, zéro dépendance, SANS ÉTAT
(rien n'est stocké ni journalisé). Raison d'être : le `client_secret` Strava ne doit
jamais apparaître dans une app 100 % côté client — le worker est le seul à le connaître
(variable *Secret* Cloudflare). Endpoints : `/auth` (redirection vers l'autorisation
Strava, origine de retour validée contre la liste blanche `APP_ORIGINS`), `/callback`
(échange du code, tokens renvoyés à l'app dans le FRAGMENT d'URL — un fragment ne quitte
pas le navigateur), `/refresh` (renouvellement, CORS restreint). Scope `activity:read_all`
uniquement — l'app n'écrit jamais sur Strava. Déploiement pas-à-pas : `server/README.md`
(≈15 min, offre gratuite Cloudflare, étape humaine : créer l'app Strava).

Côté PWA : `js/strava.js` (`stravaAuthFromHash` au démarrage — après restauration
d'état, `stravaAccessToken` avec refresh auto, `stravaConnect`/`stravaDisconnect`),
carte « 🔗 Strava » au 📋 Profil (URL du relais configurable `answers.stravaRelay`,
clé PARTAGÉE entre plans comme `stravaAuth`), import réutilisant le même
`stravaImport` → pont `syncRefsFromTests` que le jeton manuel — lequel reste le
repli assumé sans serveur. Testé E2E (retour OAuth simulé par fragment).

## Refonte R5 — navigation guidée par le premier retour du fondateur (28/07/2026)

Retour intégral : accueil en diaporama, onglet central mis en valeur, Profil = identité,
Plan = macro cliquable, Nutrition dédiée. Ordre des onglets : **📋 Profil · 🗓 Plan ·
🎯 Aujourd'hui (central, `tab-central` dans la barre) · 📅 Semaine · 🥗 Nutrition** ;
onglet par défaut : Aujourd'hui.

- **`js/ui/checkin.js`** — check-in du matin en diaporama : 3 écrans (sommeil → VFC
  optionnelle avec « je ne la suis pas » → ressenti), phrases de coach qui réagissent à
  la réponse précédente, brouillon dans `S._ck` (jamais persisté). Le ressenti règle
  aussi l'énergie du snapshot moteur (1 question athlète = 2 signaux moteur).
  `applyReadinessSnap()` (readiness.js) est le cœur commun diaporama/carte « Modifier ».
- **`js/ui/tab-today.js`** — l'écran du quotidien : gate diaporama → séance du jour
  (heroSessionHTML, exporté par tab-week) → checklist en direct → prédiction + chrono
  réel → courbe CTL/ATL/TSB → barre d'avancement → intensités → historique prévu/réel.
- **`js/ui/tab-profile.js`** — identité d'abord : avatar + niveau + XP + teaser du
  niveau suivant (`EBV2.avatar.nextName/levels`), niveaux intermédiaires PAR DISCIPLINE
  en tri (séances ✓ par sport, seuils déclaratifs `DISC_LEVELS`), échéance du plan,
  retest suggéré (dernière référence + 42 j), records, badges, efficience, conseils
  personnalisés, journal (FTP/seuil/CSS/poids).
- **`js/ui/tab-plan-general.js`** — bandeau rouge « réserves » SUPPRIMÉ (langage
  développeur) ; les limites restent lisibles dans « Les décisions du moteur » (déplacé
  ici), en langage neutre. Phases cliquables = sous-objectifs (`phaseObjectivesHTML`) :
  intention en une phrase (PHASE_GOALS), semaines et états, validation = toutes les
  semaines passées ET régulières (≥80 %). Séances de la grille en `<details>` partout.
- **`js/ui/tab-nutrition.js`** — dépense estimée (ouverte) + macros indicatives +
  ravitaillement par séance (météo différée) + journal alimentaire. Les garde-fous
  N8–N10 ne bougent pas (CI).
- **`js/ui/tab-week.js`** — la grille de semaine, ⇄, bilan hebdo, contenu du jour,
  rappels, journal des verdicts, « Modifier ma forme du jour ». Sans check-in du jour →
  redirection vers Aujourd'hui (la règle « rien avant le check-in » tient partout).
- **CSS (mobile.css)** — `tab-central` (icône ronde surélevée), `.doneBtn` redessiné
  (cercle fin, coche animée `ck-pop`), affordance `.gd-sess` (« détail »/« replier »),
  gros boutons du diaporama.
- **Supprimés** : `tab-progress.js`, `tab-monitor.js` (contenu redistribué),
  `warningsBannerHTML`/`warningsAck` (remplacés par le langage neutre des décisions).
- E2E réécrits pour la nouvelle navigation (4 suites, 109 assertions).

## R6 — deuxième retour du fondateur (28/07/2026, soir)

Dix points, tous traités :
- **Bug avatar** : `</div>` manquant dans le teaser XP (tout le reste de la carte se
  retrouvait DANS la ligne flex → colonnes écrasées, débordement horizontal) ; corrigé,
  + `html{overflow-x:hidden}` (le débordement expliquait la « barre d'onglets disparue » :
  pan horizontal iOS, la barre restait au viewport d'origine).
- **Validation dans 🎯 Aujourd'hui** : `todayValidateHTML` — un gros bouton par séance du
  jour (repos compris), même clé `done`, même boucle feedback→célébration que la grille.
- **Partages multiples** (`export.js`) : `storyBlob(o, format)` — story 9:16 (défaut) et
  carte carrée 1:1 ; `shareText` (feuille native, repli presse-papiers). La célébration
  propose 📸 Story · 🖼 Carte · 💬 Texte.
- **Phases → programme** (`tab-plan-general.js`) : la frise (`[data-phseg]`) est cliquable
  et ouvre/descend vers le `.ph-obj` correspondant, qui liste LE PROGRAMME (semaines, jour
  par jour, coches ✓ actives). **Validation = toutes les séances de la phase cochées**
  (remplace le critère ≥80 % hebdo — demande explicite).
- **Nouveau plan** : données de la PERSONNE pré-remplies (âge/sexe/poids/taille/refs/
  parcours/dépistage médical) + `prevPlanId` ; bouton « ← Revenir à mon plan en cours »
  sur tous les écrans du questionnaire (steps.js `backToPlanHTML`), brouillon abandonné
  retiré de la liste.
- **Profil du parcours** (`predictor.ts` PRED-parcours) : plat/vallonné (+3–6 %)/montagneux
  (+8–15 %) appliqué aux temps course à pied en DÉCALANT ET ÉLARGISSANT la fourchette
  (l'incertitude monte avec le relief) ; sélecteur au Profil (`answers.course_profile`),
  n'affecte que la prédiction.
- **Strava 1 clic** : `STRAVA_RELAY_DEFAULT` dans `config.js` (à renseigner au déploiement
  du worker — plus rien à coller pour les utilisateurs), gros bouton unique, URL du relais
  reléguée en « Réglages avancés », message pédagogique si aucun relais.
- **Check-in re-jouable** : « ↻ Refaire mon point du matin » (Aujourd'hui) — efface la
  readiness du jour (le journal des verdicts garde l'historique) et relance le diaporama.
- **Journal alimentaire RETIRÉ** (décision utilisateur) : module `nutrition-journal.js`
  supprimé, l'onglet Nutrition garde estimations + ravitaillement. `answers.foodLog`
  éventuel reste inerte dans l'état.
- E2E : 121 assertions (validation Aujourd'hui + 3 partages, programme de phase + phase
  validée, pré-remplissage + retour, journal retiré).

## R7 — le calendrier de l'athlète, pas celui de Greenwich (3e retour)

« Encore un problème de jour réel et de jour du plan » — cause : `new Date().toISOString()`
donne la date UTC ; entre 22 h et minuit (heure d'été française) l'app vivait encore LA
VEILLE (mauvaise séance du jour, mauvaise case « aujourd'hui », readiness re-demandée…).
- **`todayISO()` (state.js)** : date du jour en heure LOCALE — remplace toISOString dans
  TOUTE l'UI (tabs/semaine/aujourd'hui/profil/plan-view/readiness/retest/steps/nutrition/
  export/notifications) et dans le bridge (`localTodayISO`). Règle : toute comparaison
  avec les dates du plan passe par ce helper, jamais par toISOString.
- **`fmtDay(iso)`** : chaque jour du plan est annoté de sa vraie date calendrier (dd/mm) —
  grille Semaine (+ « auj. »), grille Plan, programme de phase, en-têtes de semaine
  (« du 28/07 au 03/08 »), héros Aujourd'hui, carte « Valider ma journée ».
- **Garde CI `tests/e2e/smoke-dates.mjs`** : deux fuseaux extrêmes (UTC+14 et UTC−11 — à
  toute heure réelle, au moins un diffère de la date UTC) vérifient todayISO() = date
  locale, case « aujourd'hui » sur le bon jour, étiquettes Lun/Mar alignées sur les
  vraies dates, annotations présentes. Toute régression UTC casse la CI.

## R8 — l'entraînement commence cette semaine (fix durée avec date de course)

4e retour : « l'entraînement commence la semaine prochaine et pas aujourd'hui ». Cause :
`floor((course − maintenant)/7 j)` perdait la fraction de semaine — course dans 8,5
semaines → plan de 8 semaines ancré sur la course → semaine 1 au lundi SUIVANT. La durée
est désormais le **nombre de semaines calendaires entre le lundi de l'ancrage
(plan_start) et le lundi de course, inclus** (reasoningEngine) : la semaine 1 contient
toujours aujourd'hui, la course tombe toujours dans la dernière semaine. Garde CI dans
`demo:retention` (5 fractions de semaine différentes testées, départ immédiat + course
en dernière semaine assertés).

## R9 — avatar 16 niveaux : l'athlète s'équipe, le décor évolue (choix utilisateur A+C)

- **XP (bridge `avatarV2`)** : +10 par séance du plan validée (repos respecté compris —
  seules les coches correspondant à une vraie séance comptent, garde « zéro hors plan »
  re-vérifiée), +80 par badge, +120 par semaine régulière. 100 % régularité, jamais un
  chrono, jamais décroissant.
- **Seuils NON linéaires** (0·10·25·50·90·150·230·340·480·660·900·1200·1600·2100·2700·
  3500) : niveau 2 dès la PREMIÈRE séance, un niveau tous les 2-3 jours en semaine 1,
  puis les paliers s'étirent (écarts croissants, asserté en CI).
- **Chaque niveau débloque UN paramètre visuel** (`AVATAR_LEVELS[].unlock`, rendu par
  couches dans `avatar.js`) — équipement en alternance avec décor : chaussures → parc →
  bandana → piste → aura fine → lunettes → stade → maillot bicolore → dossard (numéroté
  du niveau) → nocturne aux projecteurs → aura pleine + vitesse → étoiles → médaille →
  arche d'arrivée → laurier + piédestal doré. Cumulatif : au niveau 12 on voit ses 11 acquis.
- Traçabilité maintenue : posture = 7 derniers jours réels, couleur d'aura = streak,
  couleur du maillot = thème choisi. Teaser Profil « Prochain : … — débloque … » +
  liste des 16 niveaux consultable. Gardes CI : 6 assertions demo:retention (16 niveaux
  documentés, niveau 2 à la 1re séance, courbe croissante, monotonie, hors-plan = 0 XP).

## R10 — le point de départ de l'athlète + courses intermédiaires réelles (retour ami coach)

Un ami entraîneur a passé l'app au crible de son protocole d'analyse d'athlète. Quatre
corrections mécanisées, chacune avec sa garde :

- **Rampe `vol_recent` (le point de départ)** : nouvelle question OBLIGATOIRE du
  questionnaire gratuit (« Volume RÉEL des 3-6 derniers mois ? ») + champ éditable au
  Profil. Dans `planGenerator`, la courbe de volume est plafonnée par une rampe qui part
  de `vol_recent × 1.1` en semaine 1 et monte de ≤ C22 (+10 %) par semaine de charge
  jusqu'à rejoindre la courbe théorique (elle s'efface alors) ; semaines de récup ×0.62
  comme le reste, affûtage non concerné. Décision `R10-depart` consignée. Sans
  `vol_recent`, comportement STRICTEMENT identique — les 486 combinaisons d'audit ne
  bougent pas (asserté). Gardes CI demo:retention : semaine 1 ≤ ×1.1, croissance ≤ +10 %,
  décision présente, plan identique sans la réponse.
- **Courses intermédiaires pour tous** : carte « 🏁 Courses intermédiaires » au Profil
  (2 dates + priorité B/C, `races="oui"` posé automatiquement) — avant, seul le
  questionnaire premium posait la question, donc « demandé sans détail, adaptation ? ».
  Et le JOUR de course est désormais matérialisé dans la grille : la séance de ce jour
  devient « 🏁 Course B/C » avec sa consigne de pacing (B : mini-affûtage fait, départ
  prudent, finir fort · C : course laboratoire, on s'entraîne à travers), semaine
  allégée ×0.75 si B, semaine suivante ×0.7 (postRace). Gardes CI : séance 🏁 le jour J,
  pacing présent, taperRace/postRace posés.
- **%FTP recalibré + langage NP** (`predictor.ts`) : un ami lisait « 80 % FTP » comme
  une cible molle. Bandes relevées sur les facteurs d'intensité de référence (Coggan) —
  route 0.85-0.95, CLM 0.95-1.02, cyclo 0.73-0.83, gravel 0.68-0.78 ; tri S 0.85-0.93,
  M 0.82-0.88, 70.3 0.76-0.83, Full 0.70-0.76 — et le « pourquoi » précise partout que
  c'est de la puissance NORMALISÉE (les pointes montent au-dessus du seuil).
- **Séance du jour = grille** : `adjustTodayV2` (bridge) applique désormais
  `answers.daySwaps` avant de chercher le jour — après un échange ⇄, le héros
  « Aujourd'hui » montrait l'ancienne séance alors que la grille montrait la bonne.
- **Licence** : fichier `LICENSE` « tous droits réservés » (dépôt public pour
  hébergement/consultation uniquement) + mention pied de page dans l'app.

Reste du protocole de l'ami : couvert pour l'essentiel (âge, blessures, dispo réelle,
FTP/allure/CSS + méthode de test, objectif A + profil de parcours, échéance). En
backlog assumé : FC max/repos → zones FC, VDOT, profil diesel/explosif, préférence de
régulation Watts/FC/RPE par discipline, plan strict vs flexible, créneaux des sorties
longues, inventaire matériel (home-trainer/capteurs).

## Audit externe v6 (29/07/2026) — corrections et arbitrages

Un audit externe est arrivé avec son **banc de régression exécutable** (`audit_v6.mjs`,
38 tests à ID stable au départ — 55 aujourd'hui avec le groupe trail, zéro dépendance,
`npm run audit:v6` en CI). Règle du banc : un test
attendu vert qui échoue = **régression** (exit 1) ; la dette connue (`expect:'fail'`) ne
casse pas la CI, elle documente l'écart. À la livraison : **35 verts · 3 dettes ·
0 régression** (état initial : 10 verts · 28 dettes).

### Sécurité (P0)

- **A2/R6.1** — `R6_PAIN_CONTRAINDICATION` (matrice de contraintes) : chaque localisation
  de douleur interdit la ou les disciplines qui la sollicitent. `adjustDay` change la
  DISCIPLINE de remplacement (tibia → vélo/nage, épaule → vélo/course, genou → nage) ;
  si aucune n'épargne la zone (cou sur un plan nage+vélo) → **repos complet explicite**,
  jamais une séance dégradée.
- **A3** — un jour rouge ne peut plus AUGMENTER la charge : plancher de 25min borné par la
  séance d'origine, plancher C24 retiré des remplacements (un remplacement de récupération
  n'est pas une séance de plan), et l'invariant d'en-tête est **asserté** (`throw`) dans
  `adjustDay` — il ne peut plus se perdre en silence.
- **B1/R6.2** — `readInjuries()` unique (le motif était dupliqué 4 fois, avec des ensembles
  différents), facteur de volume 0.9 (une zone) / 0.8 (plusieurs) appliqué **après la sonde
  de capacité**, plafond `vol_max` abaissé du même facteur, et surtout **passe de
  référence** : un plan blessé est plafonné semaine par semaine par le même plan SANS
  blessure. Une blessure allège toujours, jamais l'inverse (+68% mesuré avant).
- **B1c** — l'épaule fonctionne enfin en triathlon (branche morte : le traitement vivait
  sous `sp === "swim"` alors que le questionnaire proposait « Épaule (nage) » aux tri).
- **B2** — 4 localisations → 4 plans distincts : tibia (-1 jour d'impact de plus), genou
  (seuil contrôlé au lieu de VO2 : pas d'à-coups), pied (longue ×0.85), hanche (longue
  ×0.9 + greffe gainage hanche/ITB).
- **B3** — la carte de règle « Blessures multiples → ultra-conservateur » existe enfin :
  -20% de volume + avertissement « bilan médical avant montée en charge ».

### Promesses tenues

- **C1** — `sessions_max` compte des SÉANCES, pas des jours actifs (« ≤3 tenables » livrait
  5 séances ; 7 en livrait 9). Retrait du moins coûteux au plus coûteux : 2ᵉ séance des
  jours doubles → jours faciles → jours durs hors longue. `durLong` jamais touché.
- **C2/C3** — la date de course a trois branches EXPLICITES, jamais un silence : trop
  proche → plan partiel sur le temps disponible (fini les 13 semaines dans le passé) ;
  au-delà de 80 semaines → départ MAINTENANT en base longue (`raceBeyondPlan`) ; sinon la
  durée réelle. Chaque branche produit une décision et un avertissement.
- **A7/R6.3** — l'âge module : mineur → volume ×0.70 et **aucune VO2max** (6 branches de la
  bibliothèque), avertissement affiché ET appliqué ; master 60+ → ×0.85 et récup /3 semaines.
- **E3/E4** — bornes de plausibilité (`PHYSIO_BOUNDS`) côté moteur, garde IMC [15, 45] dans
  l'estimation énergétique (hors bornes : **aucune** estimation, pas d'estimation dégradée).
- **E1/E2** — un SEUL parseur d'allure (`parsePaceSec`), tolérant en entrée (`4'50` accepté
  — c'est la notation que l'app affiche) et strict en validation ; le plan et la prédiction
  ne peuvent plus décrire deux athlètes différents, et une saisie illisible est signalée.

### Les planchers ne gagnent plus contre la courbe

Classe de bug commune (D3-D7, D10) : les caps s'appliquaient au BLOC, la courbe à la
semaine. Correctifs : C15 et C23 au niveau **séance**, plancher débutant C24b (600m,
sinon la fréquence cède), lissage sur les minutes **livrées**, monotonie récup/affûtage,
et — en natation/triathlon — lissage sur la **métrique de l'auditeur** (récup entre
répétitions comprise) : on lisse ce qui est mesuré. Le seuil dur de l'auditeur dérive
d'une constante nommée (`C22_AUDIT_HARD_JUMP`) — plus de littéral divergent.

### Readiness : le modèle n'est plus complaisant

- **A4** — deux registres : un signal OBJECTIF négatif (HRV, FC repos, heures de sommeil
  mesurées) ne peut plus être annulé par du déclaratif positif ; le subjectif ne fait alors
  qu'aggraver. « HRV basse + je me sens bien » → orange, plus jamais verte.
- **A5** — le check-in demande les HEURES de sommeil (un tap) : sous 4h30 → rouge en soi.
- **A6** — FC au réveil collectée (champ optionnel) + baseline glissante 7 jours
  (`S.shared.hrRestLog`, dès la 3ᵉ mesure) ; sans baseline, seuil absolu prudent.
- Validation de schéma (`SNAPSHOT_KEYS`/`validateSnapshot`) : une clé inconnue est
  signalée — elle ne fait plus disparaître un signal de sécurité sans bruit.

### Interopérabilité

- **F1** — le clamp C13 est écrit dans `durationMin`, plus seulement dans le champ dérivé
  `_min` : l'écran et l'export décrivaient deux séances différentes. `durationMin` = durée
  d'UNE répétition (exportée avec `reps`), `_min` = total du bloc — sémantique explicitée
  dans le banc.
- **F3** — minutes entières dès le calcul (les flottants polluaient les totaux et le cap).
- **ICS RFC 5545** — `DTSTAMP` ajouté (obligatoire), UID portant sport + format + id de plan
  (deux plans ne s'écrasent plus à l'import), `DTEND` = J+1 (exclusif).
- **D1** — le score d'audit est plafonné par le nombre de violations dures (≤70 dès la
  première) ; violations et réparations sont RENDUES dans la carte « décisions du moteur »
  (langage neutre, sans bandeau rouge — décision R5 du fondateur).

### Dette résiduelle assumée (3 tests, documentés)

| Test | Écart | Pourquoi on s'arrête là |
|---|---|---|
| `D2` | violations dures sur la matrice standard du banc | Agrégat des règles ci-dessus mesurées avec des profils différents des 486 d'`audit:v2` (qui est à **0 violation dure**) ; les cas restants sont des plans saturés par les planchers. |
| `D3` | 4 profils tri à +11 à +19% au pic | **Arbitrage** : « la semaine max est en phase peak » (structure) et C22 (+10%) ne sont pas toujours satisfiables ensemble sur un plan saturé. On tient la structure ET le seuil DUR (+25%, jamais franchi) : mieux vaut un pic marqué qu'un pic plus léger que la base. |
| `F2` | 42 séances à 43-44% au lieu de 45% de temps en zone cible | C13b ajouté (échauffement ≤0.8× corps, retour au calme ≤0.5×) : serrer davantage déstabilise le plafond `vol_max` et la courbe. Écart d'1 à 2 points, sans conséquence de sécurité. |

## R7 TRAIL — le trail devient un sport (spec SPEC_R7_TRAIL, 29/07/2026)

Diagnostic de départ : traité comme un FORMAT de course à pied, le trail prescrivait
**86 séances sur 86 avec une allure en min/km** — dont une sortie longue de 255 min à
5'36/km pour 1 300 à 1 650 m de dénivelé. Zéro marche rapide, zéro bâton, zéro
ravitaillement, zéro nuit sur une préparation d'ultra ; 6 séances de côtes strictement
identiques figées à 15×3min ; `terrain=trail`/`route`/`piste` produisaient le **même plan
à la minute** ; et un 23 km/900 m recevait la même durée de préparation qu'un 100 miles.

### Le verrou : l'intensité dépend de la pente

`V1Step` porte désormais `gradient` (up/down/flat/rolling), `dplusM`, `dmoinsM`, `mode`
(course / marche rapide / alternance), `poles`, `surface`. Table de résolution du rendu
(`renderer.ts`) :

| pente | référence | rendu |
|---|---|---|
| `flat` | allure seuil | `5'36-6'05/km` |
| `up` | **VAM** (zones `tr.vam`/`tr.asc`/`tr.climb`/`tr.hike`) | `720-790 m/h de D+`, repli FC puis RPE |
| `down` | **aucune** | consigne technique (`TRAIL_DOWN_CUE`), jamais de cible chiffrée |
| `rolling` | FC (`fmtIntHr`) + D+/D− cible | `Z2 · D+ 630m / D− 510m cible` |

Chiffrer une descente est activement nuisible : ça pousse à courir vite là où la casse
musculaire et le risque de chute sont maximaux. `loadModel` (l'auditeur) mesure les deux
axes verticaux — sans ça, les règles de dénivelé resteraient déclaratives comme
`primaryMetric: "gap_pace"` l'était depuis R4 (jamais lu par le moteur).

### Objectif décrit par ses DONNÉES, catégorie déduite

Le questionnaire ne demande plus un format : il demande **distance, D+, technicité, nuit**
(+ barrière horaire optionnelle). La catégorie d'effort (`kv` · `court` · `long` · `ultra` ·
`ultra_long`) est **déduite du temps estimé** et affichée comme une décision, avec le
km-effort (`distance + D+/100`) comme repère. Deux références au lieu d'une : allure seuil
**sur plat** et **VAM** (m D+/h). Nouvelle étape « ton terrain d'entraînement » (accès réel
au dénivelé, tapis, bâtons) — la contrainte la plus déterminante d'une prépa trail, et elle
n'existait pas.

### Modèle de charge à TROIS axes (`src/engine/trailModel.ts`)

| axe | plafond | progression max |
|---|---|---|
| temps | `TRAIL_HISTORY_CAPS` par catégorie × historique | +10 % (C22) |
| **D+** | `T1_DPLUS_CAPS` + plafond du terrain d'entraînement | **+12 %** (T2) |
| **D−** | dérivé du D+, plafonné | **+8 %** (T2b) |

**T2c — une boucle ne descend jamais plus qu'elle ne monte** : les deux axes verticaux sont
mis à l'échelle indépendamment (chacun a sa courbe et son plafond), ce qui pouvait afficher
« D+ 460 m / D− 540 m » sur une sortie longue — impossible sur le terrain. Sur un bloc
`rolling`/`flat`, le D− est borné par le D+ ; seuls les blocs de **descente dédiée** (navette,
remontée mécanique) portent du D− sans D+, c'est leur raison d'être. Vérifié par le test
**T17** du banc v6 et par `smoke-retention` (assertion sur le plan rendu).

Le négatif progresse le plus lentement : c'est délibéré (dommages excentriques à 24-48 h,
récupération complète en 3 à 7 jours). Autres constantes avec provenance : **T3** (aucune
qualité ni descente dans les 48 h suivant >1 000 m D− — la sortie longue n'est jamais
supprimée, elle passe à plat), **T4** (sortie longue en % du temps de course estimé :
0,55× sur un ultra, jamais un absolu), **T5** (part de marche rapide attendue),
**T6** (durée de préparation par catégorie : 10 à 28 semaines), **T7** (répétitions
ravitaillement au-delà de 6 h d'effort).

### Bibliothèque (`src/generator/trailLibrary.ts`)

14 séances : sortie longue (temps + D+ + D−), back-to-back, côtes courtes VAM, seuil
ascensionnel, descente technique, descente en charge, marche rapide (bâtons), longue avec
ravitaillement réel, sortie de nuit, renfo excentrique, proprioception, footing plat,
tapis incliné, escaliers. La séance de côtes suit une **progression explicite**
(`HILL_PROGRESSION` : 6×45 s → 10×90 s → 4×9 min seuil → 3×12 min allure de course), avec
`repCap` et bornes de durée — le plancher « séance digne » de 30 min ne l'écrase plus.
Contre-indications par zone : quadriceps → D− à 35 % et descentes longues retirées,
cheville → sentier roulant + proprioception, tibia → descente rapide supprimée, fascia →
terrain souple.

### Terrain plat : nommer la limite

Quand le dénivelé cible est inatteignable, le moteur plafonne au réalisable, **substitue**
(tapis 10-15 %, escaliers, côtes répétées, renfo excentrique) et le **dit** : « ton terrain
ne permet pas les 3 000 m D+/semaine que ton objectif demanderait… si tu peux caler 2 ou 3
week-ends en relief pendant la phase spécifique, c'est le meilleur investissement de ta
préparation. » C'est le type de décision qui appartient à un moteur « raisonné ».

### Prédiction : Riegel ne s'applique pas

Modèle en km-effort pondéré par la part verticale (moyenne harmonique entre vitesse au sol
tenable et VAM tenable), pénalisé par la technicité (roulant 1,00 → alpin 1,30) et la nuit.
Calibré sur des repères connus (56-101 km de montagne : 7-8 km-effort/h pour un coureur
intermédiaire). Sorties : temps estimé (**fourchette large et annoncée comme telle** : ±20 %
sur un ultra), vitesse en km-effort/h, vitesse ascensionnelle cible, part de marche, et une
consigne de répartition par tiers (partir 5 % trop vite coûte 20 % sur la fin). Barrière
horaire dépassée → avertissement **en tête**, pas dans une carte repliée.

### Périmètre assumé

Le moteur s'arrête à `ultra_long` (12-24 h) : au-delà, sommeil fractionné, assistance et
ravitaillement par base-vie dépassent ce qu'un plan automatique peut honnêtement produire —
l'outil construit l'endurance et **nomme la limite** au lieu de deviner. Hors périmètre
également (dit, pas approximé) : skyrunning technique, protocole d'acclimatation en
altitude (au-delà d'un avertissement > 2 500 m), courses par étapes.

### Migration et garanties

`SPORTS.run` perd le format `trail` ; les plans existants `sport=run, format=trail` sont
**migrés** (`migrateTrailPlans`) avec des valeurs par défaut et un avertissement au Profil
demandant la vraie distance et le vrai D+. Nouvelle carte Profil « ⛰ Ta course et ton
terrain » (tout éditable, régénère le plan). Gardes : **17 tests T1-T17** du banc v6 (spec
écrite AVANT le code, en dette, passée au vert lot par lot) + suite E2E `smoke-trail.mjs`
(35 assertions, parcours complet dans un vrai navigateur).

Conséquence à ne pas oublier quand on ajoute un sport : **toute table indexée par sport**
doit être étendue, y compris côté UI. Les règles pédagogiques de l'onglet Plan (`evalRules`,
`endurabuild/js/ui/steps.js`) lisaient leurs plafonds dans une table `{run, bike, swim, tri}`
et plantaient tout le rendu du Profil sur `sport="trail"`. Corrigé en deux temps : le trail
n'a **pas de format** (ses plafonds suivent la catégorie d'effort déduite, lue via
`EBV2.trailObjective` / `EBV2.trailCaps` — une seule table de chiffres dans le projet, celle
du moteur), et un sport ou un format inconnu **retombe sur un repli documenté** au lieu de
lever une exception. Garde : `smoke-retention` assertait déjà « aucune erreur JS ».

## Audit externe v7 — les points de convergence (30/07/2026)

Deux passes de l'audit multi-sport (harnais `audit_v7.cjs`, 4 580 profils) ont fait émerger une
règle d'architecture que le registre ne portait pas encore : **tout chiffre DÉRIVÉ se réconcilie
en dernier**. Trois défauts distincts avaient la même racine — une valeur calculée trop tôt, puis
invalidée par une passe qui tournait après elle :

| dérivé | fonction | appelée depuis |
|---|---|---|
| prose issue d'un nombre (« 4 transitions ») | `syncDerivedLabels(plan)` | `generateAudited`, après les réparations |
| courbe ANNONCÉE vs prescrit + décroissance de l'affûtage | `reconcileDeclaredVolume(plan, warnings)` | `generatePlan` **et** `generateAudited` |
| couverture des disciplines | `applyDisciplineCoverage` | fin de `buildDays`, après budget/anti-collage/polarisation |

Corollaire, appris deux fois : **ne jamais DEVINER un état qu'on peut LIRE** (une semaine de
récup était identifiée par comptage de jours de repos — une semaine d'affûtage en a autant), et
**une règle de sécurité ne doit pas être émergente** (la décroissance de l'affûtage tenait à la
combinaison courbe + coupe R3.13 ; le glissement des créneaux d'un cycle de 10 jours suffisait à
la casser). Elle s'énonce, elle se vérifie, elle a un test.

Deux invariants de contenu s'y ajoutent, valables pour toute passe de reconstruction :
`applyWeeklyVariety` (jamais deux fois la même séance de QUALITÉ dans une semaine — les doublons
faciles sont normaux) et la règle des variantes : **faire varier le contenu, jamais la charge**
(une substitution plus longue que celle qu'elle remplace rendait un plan « deux blessures » plus
lourd qu'un plan « une blessure »). Détail et chiffres avant/après dans `R10_DEFECTS.md`.

## Décisions produit R6 — explicabilité et données réalisées (30/07/2026)

Deux chantiers issus de `MESSAGE_CLAUDE_CODE_R6_produit.md` (le premier document du projet qui
porte des décisions de PRODUIT et non des correctifs de moteur).

### §5 — l'explicabilité en surface

Le moteur produisait déjà tout le « pourquoi » : `decisions[]`, `warnings`, et une `note` de
justification sur chaque séance (l'auditeur refuse une séance muette). Ça vivait dans `_v2`,
derrière un repli fermé, en bas de l'onglet Plan. La critique standard des coachs automatiques
est l'opacité — nous avions la réponse en base sans la montrer.

- `whyPlanCardHTML(plan)` — « 🧭 Pourquoi ce plan », **en tête** de l'onglet Plan, dépliée, en
  langage d'athlète. Aucune phrase n'est inventée : chacune cite la décision qui la produit.
- `sessDetailsHTML(s)` — le **POURQUOI passe devant le QUOI** dans le détail d'une séance ;
  `whyOf`/`techOf` séparent la justification de la description technique (le moteur les colle
  dans `det`, l'affichage les redistribue — le contrat de données ne bouge pas).
- Dans le héros d'**Aujourd'hui**, le pourquoi est **visible sans rien ouvrir** : c'est l'écran
  du matin, et « pourquoi cette séance » y vaut plus que la liste des blocs.

### §2-§3 — `measured` : l'ingestion souveraine des données réalisées

`src/engine/measured.ts` — un instantané de scalaires **dérivés**, daté et versionné, rangé dans
`answers.measured`. Trois règles fondent le module :

1. **Une observation ne remplace jamais une contrainte.** Seul `vol_recent` — le point de départ
   de la rampe R10, et le champ le plus souvent mal déclaré — est mesurable. `vol_max`,
   `sessions_max`, `dispo`, `off_days`, `injury`, `history` et les drapeaux médicaux restent
   DÉCLARÉS : ce que quelqu'un a fait le mois dernier ne dit pas ce qu'il peut soutenir.
2. **Le moteur reste une fonction pure.** Instantané, jamais flux. C'est ce qui garde `audit_v7`
   et le golden master possibles. Corollaire **testé** : sans `measured`, le plan est exactement
   celui d'avant (les 820 profils du golden sont bit-identiques après ce lot).
3. **La source est un adaptateur interchangeable.** Voie par défaut : l'athlète apporte ses
   fichiers (FIT aujourd'hui) — souverain, aucun plafond d'athlètes, aucune clause d'usage. Un
   connecteur de plateforme reste optionnel et le moteur ne suppose JAMAIS sa présence.

`arbitrateVolRecent()` est le seul endroit qui décide du point de départ : une mesure fiable
(`confidence: "high"`) remplace la déclaration dans les deux sens ; une fenêtre incomplète
sous-compte par construction, elle ne peut donc que corriger une SOUS-estimation — **jamais
alléger un plan sur une donnée manquante**. Tout écart produit une entrée `decisions[]` visible.

Cadence (§3.3) : `endurabuild/js/measured.js` rafraîchit l'instantané à la première donnée, puis
**en semaine de décharge** seulement — pas tous les matins. Un plan qui bouge chaque jour est
anxiogène et invérifiable.

Gardes : `npm run demo:measured` (22 garanties, 12ᵉ gate CI), 3 profils `measured-*` ajoutés au
golden master (fiable bas / fiable haut / partiel), 7 assertions E2E dans `smoke-improvements`.
