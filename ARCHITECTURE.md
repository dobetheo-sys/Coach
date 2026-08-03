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
| I14 | La sortie longue est la plus longue séance de sa semaine, dans sa discipline : les AUTRES sont plafonnées, jamais la longue gonflée. Un bloc en pente se réduit par ses RÉPÉTITIONS (plancher 2, arrondi inférieur), jamais par sa durée — raboter la durée d'un bloc de descente fabriquerait une vitesse impossible. Garantie de SÉANCE, donc appelée AVANT les garanties de semaine, et rappelée en filet après |
| T2/T2b (2e passe) | La progression verticale (D+ ≤ +12 %/sem, D− ≤ +8 %) est re-clampée au point de convergence : réduire une semaine creuse l'écart avec la suivante — une contrainte de croissance ne se viole pas qu'en montant |
| R13.4 | Jamais de force basse cadence (`*.frc`) en affûtage — même coût de récupération que la VO2max (violation dure) ; veille de course ≤ 25 min (plafond de JOUR) ; la course A vaut `min: 0` (hors charge, temps prédits affichés) et n'est JAMAIS victime d'une coupe |
| R13.5 | La sonde de capacité mesure le sommet ET le chemin (promesse ≤ capacité spécifique × 1,15) ; toute coupe de fréquence REND ce qu'elle a pris en trop (re-remplissage vers la cible) ; promesse vs pic livré < 75 % → avertissement nommé ; semaines de charge plates (max/min < 1,35) → avertissement |
| R13.6 | Phases plafonnées en absolu : affûtage ≤ 3 sem (2 si plan < 30 sem), peak ≤ 5, excédent → spécifique ; plafond de séance d'affûtage calé sur la courbe d'affûtage ; semaine de course ∈ [30, 60] % du pic hors jour J |
| N2 | Le plan s'arrête le SOIR DU JOUR J : la dernière semaine est coupée à la date de course (1 à 7 jours), jamais un reliquat de repos après l'objectif ; sa cible de volume est proratisée à sa longueur réelle (`raceTailDays` dans `buildDays` + filet dans `planGenerator`, garde `I18`) |
| R14.3-a | UN SEUL profil de parcours : `courseProfileOf()` (`course_profile` prime, `terrain` en repli) sert le jour J ET la carte Prédiction ; la table de relief couvre tout le domaine `terrain` du schéma et `assertTerrainCovered()` fait échouer `build:app` sur une valeur non classée |
| P1 | L'adhérence du projecteur est une fenêtre glissante des 6 semaines ÉCOULÉES (`adherenceWindow`), jamais `pctLoad` (qui compte le futur) ; aucun ✓ dans le plan = **non jugeable**, pas 0 % |
| P2bis | Gain projeté = `G_plafond(discipline) × h(marge MESURÉE) × k_structure × f_volume`, saturé par `1 − exp(−w/20)` et plafonné à 30 %/an. `h` s'interpole sur des bandes (vélo = profil Coggan ; course et nage = heuristiques assumées), décalées par sexe et âge — on décale LA RÉFÉRENCE, jamais la marge. R14 indexait sur `history` : 2,71 W/kg recevait le plafond « avancé » |
| P2bis-c | `k_structure` mesure le STIMULUS DE LA STRUCTURE (question Profil « tes 12 derniers mois »), pas les années de pratique ; `history` n'en est plus que le repli, et sans réponse la confiance ne monte pas à « bonne » |
| P7bis | La fourchette porte sur le GAIN et elle est ASYMÉTRIQUE : `[0,15 g ; 1,30 g]`, donc **borne haute = la forme d'aujourd'hui** (un plan suivi ne rend pas plus lent). `gainBand` remplace `spreadPct` ; refus si la largeur dépasse 25 points |
| P6bis | Le vélo affiche DEUX lignes : « cible jour J » (ancrée, P6) et « FTP projetée ». Confondre les deux rendait invisible la moitié du temps de course d'un 70.3 |
| P10 | `f_volume` = volume prescrit (dev+spéc+pic) ÷ volume récent, borné [0,75 ; 1,15]. Le plafond est délibéré : le moteur ne récompense pas la surcharge |
| P9 | Levier poids UNIQUEMENT si demandé ET cible saisie par l'athlète ; sensibilité (W/kg, coût énergétique), jamais un objectif, jamais de rythme ni d'apport. Neutralisé en silence si IMC cible < 18,5, perte > 0,5 kg/sem, mineur, ou drapeau médical |
| P3 | ≥ 2 tests datés espacés de ≥ 6 semaines → taux MESURÉ, rétréci vers le prior (`n/(n+2)`) et borné par P2 ; `gainSource` passe à `mesure`/`mixte` et la décision le dit |
| P4 | Le bénéfice d'affûtage (+1,96 %, Bosquet 2007) ne s'ajoute que si l'affûtage est CONFORME sur le plan LIVRÉ : 2-3 semaines et −41 à −60 % vs pic (`taperIsConform`), jamais sur la seule présence d'une phase `taper` |
| P5 | Exposant de Riegel piloté par le volume de course hebdomadaire (1,04 ≥12 h → 1,12 <5 h, interpolé) — **course sèche uniquement** : les legs course du tri/duathlon gardent 1,06, leurs facteurs de fatigue ayant été calibrés contre lui |
| P6 | **Le pacing ne se projette JAMAIS** (règle de sécurité) : tout item qui n'est pas un TEMPS est repris à l'identique de la forme actuelle, avec la mention. Un sport qui ne prédit que des cibles n'a rien à projeter, et le dit |
| P8 | Aucune projection sans référence mesurée ; adhérence < 50 % → gain ramené au seul bénéfice d'affûtage, motif affiché, jamais de reproche |

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

## Écran d'accueil : « Forme du jour » avant toute séance (`tab-week.js`, fondu dans `tab-plan-general.js` + `session-life.js` en R16.9)

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

Barre d'onglets (`tabs.js`), fallback robuste `TABS[TABS.length - 1]` (plus d'index
codé en dur) — 5 onglets alors, 4 depuis R16.9.

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
  avec repli téléchargement ; modal félicitations à la coche ○→✓ (`session-life.js` depuis R16.9).

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
  (heroSessionHTML, exporté par session-life.js depuis R16.9) → checklist en direct → prédiction + chrono
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
  **Supprimé en R16.9** : la grille et le ⇄ sont passés dans `tab-plan-general.js`, le
  quotidien dans `tab-today.js`, les briques communes dans `session-life.js`.
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

## R14 — la prédiction projetée jour J (handoff standalone-5, 01/08/2026)

### Où vit quoi

- **`src/engine/projection.ts`** — les huit règles P1–P8. Ce module ne produit **jamais** un
  chrono : il produit des FRACTIONS DE GAIN et une INCERTITUDE. La séparation est le point
  d'architecture : la façon de passer d'une référence à un temps (Riegel, CSS, %FTP) est déjà
  écrite une fois dans les modules de sport, et une projection ne doit pas en créer une seconde.
  Il porte aussi `adherenceWindow()` (P1) et `taperIsConform()` (P4), tous deux calculés sur le
  plan LIVRÉ.
- **`src/engine/predictor.ts`** — le corps du prédicteur est extrait dans un `render({refs,
  spread, trail})` **rejouable**. La forme actuelle appelle `render` avec les références
  mesurées ; la forme projetée l'appelle avec les références projetées et la fourchette élargie.
  Un seul chemin de calcul, deux jeux d'entrées.
- **`src/app/bridge.ts`** — fournit ce que le prédicteur ne peut pas connaître seul : l'horizon
  (`weeksUntilRace`), l'adhérence, le journal de tests, la conformité d'affûtage, l'âge de la
  référence, et le volume de course qui pilote P5.
- **UI** — `predictionCardHTML()` (plan-view.js) rend les DEUX prédictions étiquetées ; l'onglet
  🎯 Aujourd'hui réutilise la même fonction. Un refus de projeter affiche son MOTIF : « trop tôt
  pour projeter » est une information, le silence n'en est pas une.

### Ce qui fait autorité, et ce qui n'en a pas

Le fichier distingue explicitement trois statuts, et le code le dit :

| statut | ce qui en relève |
|---|---|
| **source primaire** | affûtage +1,96 % (Bosquet 2007, méta-analyse 27 études) · variabilité inter-individuelle (HERITAGE, 483 sujets) · ordre de grandeur de l'incertitude (Rüst 2011, SEE 57 min ≈ ±8 %) · volume ↔ tenue de la distance (Vickers & Vertosick 2016, N=2303) |
| **heuristique convergente** | les plafonds `G_INFINI`, la constante de temps τ = 20 semaines, les ancrages d'exposant de Riegel. Annotés comme tels dans le code, et **remplaçables par la mesure de l'athlète** (P3) |
| **rejeté** | tout chrono dérivé de la CTL/ATL/TSB (Coggan : indicateur RELATIF de forme) · le modèle de Banister (validité prospective non démontrée) |

C'est HERITAGE qui fonde la forme même de la sortie : à programme identique, 7 % des sujets ont
gagné ≤ 0,1 L/min et 8 % ≥ 0,7 L/min. **Une projection ponctuelle est fausse par construction ;
seule une fourchette est honnête.**

### La règle qui prime sur les autres

**P6 — le pacing ne se projette jamais.** Tout item de `projected.items` qui n'est pas un TEMPS
(une puissance en W, une vitesse ascensionnelle, une part de marche) est repris À L'IDENTIQUE de
la forme actuelle, avec la mention. Raison : une cible projetée qui remonte l'IF de 0,73 à 0,78
fait partir trop vite, et le coût se paie au marathon — voire à l'abandon. *Le temps se projette,
l'intensité s'ancre.* Corollaire assumé : un sport qui ne prédit que des cibles (le vélo — le
chrono dépend du parcours, on ne l'invente pas) n'a rien à projeter, et le dit au lieu d'afficher
une projection identique à la forme actuelle sans explication.

### P5, le seul point qui touche l'existant

L'exposant de Riegel devient fonction du volume hebdomadaire de course. Il n'est appliqué qu'à
l'extrapolation d'une **course sèche** : les legs course du triathlon et du duathlon gardent
1,06, parce que leurs facteurs `fatigue` (1,03 à 1,13) ont été calibrés CONTRE cet exposant.
Bouger l'exposant sous eux recalibrerait silencieusement une table validée et compterait deux
fois la même difficulté. Les deux appelants de `predictRace` (bridge et `planGenerator` pour le
texte du jour J) passent les mêmes entrées — sans quoi les deux écrans divergeraient à nouveau,
ce que R14.3-a venait précisément de fermer.

## R14.1 — l'addendum correctif : indexer sur la marge, pas sur l'ancienneté (01/08/2026)

### Ce que R14 avait faux, et pourquoi c'était subtil

R14 a livré le bon MÉCANISME (contrat `projected`, prédicteur rejoué, huit règles tracées) avec
la mauvaise TABLE. Le plafond de gain venait de `history`, et `ancien` — « pratique de longue
date » — était lu comme « proche du plafond physiologique ». Rien dans le code ne signalait
l'erreur : il appliquait fidèlement une table qui ne décrivait pas ce qu'elle prétendait décrire.

C'est le même défaut que R12 avait corrigé sur `level`, un cran plus loin. La règle générale du
dépôt s'énonce maintenant sans exception : **aucune réponse auto-déclarée ne fixe un plafond
physiologique — seule une mesure le fait.** `level` pilote le CONTENU des séances, `history`
pilote les plafonds de VOLUME et le modificateur de structure ; ni l'un ni l'autre ne dit combien
il reste à gagner.

### La chaîne du gain, dans l'ordre

```
h          = marge lue sur la référence MESURÉE (W/kg, allure seuil, CSS)
             bandes interpolées, décalées par sexe et âge — on décale LA RÉFÉRENCE
G_plafond  = 0,25 vélo · 0,22 nage · 0,15 course   (ce qu'un débutant complet peut gagner)
k_structure= 1,00 au feeling · 0,85 par périodes · 0,65 plan suivi   (stimulus de la structure)
f_volume   = prescrit(dev+spéc+pic) ÷ volume récent, borné [0,75 ; 1,15]
──────────────────────────────────────────────────────────────────────────────
G∞         = G_plafond × h × k_structure × f_volume
gain(w)    = G∞ × (1 − exp(−w/20))        puis × adhérence, + affûtage si conforme
             puis PLAFOND ABSOLU de 30 %/discipline/an
gainBand   = [0,15 × gain ; 1,30 × gain]  ← asymétrique : la borne haute est la forme actuelle
```

### Trois principes que ce lot ajoute au dépôt

1. **Une fourchette de progrès est asymétrique.** Le pire cas d'un plan suivi n'est pas de
   régresser, c'est de ne presque rien gagner (HERITAGE : 7 % des sujets à ≤ 0,1 L/min sur un
   programme identique). Une fourchette symétrique produisait −42 s de natation sur 43 semaines,
   c'est-à-dire un chiffre qui dit à l'athlète que sept mois d'entraînement ne servent à rien.
2. **Le moteur ne récompense jamais la surcharge.** `f_volume` plafonne à 1,15 : au-delà, le
   volume supplémentaire ne se convertit plus proportionnellement en performance et fait monter
   le risque de blessure. Priorité n°2 du manifeste, appliquée dans le prédicteur.
3. **Une frontière se garde des DEUX côtés.** Le levier poids (P9) n'existe que si l'athlète l'a
   ouvert lui-même — et le mot « kg » ne doit pas non plus arriver par la porte d'une explication
   de marge : le rapport puissance/masse ne s'écrit nulle part ailleurs que dans ce levier.

### Critères de banc périmés — et pourquoi ils restent affichés

`bench_r14.cjs` conserve `R14.2`, `R14.4` et `R14.6-A/B` avec le statut `----` et leur
justification, plutôt que de les supprimer. `R14.4` n'était pas dans la liste du handoff : ses
plafonds (int ≤ 12 %, avancé ≤ 6 %) sont exactement la table que l'addendum déclare fausse, et ils
imposent un écart ancien/confirmé d'au moins 50 % là où `R14.1-B` en autorise 45 % — deux critères
qui ne peuvent pas être vrais ensemble sans rendre `level` responsable d'un facteur 2 sur le gain.
Un banc dont les tests disparaissent sans laisser de trace est un banc qu'on ne peut plus relire.


## R16 — le lot design visuel (handoff `HANDOFF_R16_design_visuel.md`, 01/08/2026)

Un audit visuel externe, renuméroté R16 (le handoff s'annonçait « R14 », déjà pris trois
fois). Ordre imposé par le handoff lui-même : fixes mécaniques d'abord, restructuration
du Profil ensuite, typographie et fusion d'onglets en dernier, chacune dans son commit.

### R16.8 — l'échelle typographique : 21 tailles → 7 paliers

**Mesuré.** 21 valeurs de `font-size` distinctes dans `styles.css`, dont quatre sous le
pixel (7,5 / 8,5 / 11,5 / 12,5 px), plus 69 tailles inline dans les modules UI. Ce n'est
pas une échelle, c'est une sédimentation : personne n'a jamais décidé qu'un rôle valait
8,5 px, il valait « un peu moins que le voisin ».

**Sept paliers** (`--fs-micro` 9 · `--fs-xs` 11 · `--fs-sm` 12 · `--fs-md` 13 · `--fs-lg`
15 · `--fs-hand` 18 · `--fs-xl` 22), déclarés dans `:root`, un par RÔLE. Deux principes
bornent la liste :

- **l'échelle gouverne le TEXTE.** Un glyphe décoratif — emoji de carte sport, chevron de
  `<details>`, séparateur de progression — se dimensionne en `em` relativement à son
  porteur. Ce n'est pas de la typographie, et ça doit suivre ce qu'il décore. Les titres
  display gardent leur `clamp()` fluide.
- **le remappage se fait rôle par rôle**, jamais par substitution globale : deux rôles qui
  partageaient une taille par accident doivent rester distincts. Le « pourquoi » d'une
  séance (12) reste au-dessus de son détail technique (11) ; l'avertissement (13) au-dessus
  du corps de carte (12).

Une exception NOMMÉE aux variables : le **document exporté** (`plan-view.js`) est autonome
et ne charge pas la feuille — ses tailles restent littérales, sous peine de retomber à la
taille par défaut du navigateur. Même piège que les couleurs en R16.2.

Effet mesuré : le plus petit texte réellement rendu passe de 7,5 px à 9 px sur les quatre
onglets.

**R16.8-a — et deux corrections successives qui ne regardaient pas la cause.** R16.4 avait
« corrigé » les pastilles de phase tronquées en conditionnant l'abréviation à la largeur du
VIEWPORT. La capture de contrôle de R16.8 montrait encore « P… » et « A… » à 1100 px : la
frise répartit la place au prorata des semaines (`flex:N`), donc une phase d'UNE semaine est
étroite à toute taille d'écran. La condition porte désormais sur la largeur du SEGMENT
(`@container`, media query en repli), avec un plancher de 48 px pour le cas mesuré à 390 px
où un segment recevait 23 px pour un libellé de 25. Et la vraie cause de l'écrasement était
encore ailleurs : le bouton « aller à la semaine en cours » de R16.5 était émis À
L'INTÉRIEUR de `.ph-line` (flex) et en devenait un item, raflant la place — corrigé en
R16.9-a.

**Garde : `tests/e2e/smoke-typo.mjs`** (9e suite E2E). Elle ne vérifie pas des valeurs
absolues — un palier peut bouger, c'est le but d'avoir une échelle — mais les deux choses
qu'une refonte typographique casse en silence : les RELATIONS d'ordre entre rôles, et le
plancher de lisibilité. Plus le débordement réel des libellés de phase sur trois largeurs,
et l'absence de taille littérale hors du document exporté.

### R16.9 — fusion 📅 Semaine dans 🗓 Plan (5 onglets → 4)

**C'est « Plan » qui survit** (choix confirmé) : il portait déjà la vue d'ensemble complète
— saison, phases, décisions, exports — là où Semaine n'ajoutait qu'un recentrage.

Le diff a révélé mieux qu'un recentrage : **la coche existait en deux versions.** Celle de
Semaine ouvrait le feedback RPE, la célébration et le calcul de badges ; celle de Plan
basculait un booléen en silence. Cocher la même séance ne faisait pas la même chose selon
l'onglet par lequel on passait. Il n'en reste qu'une — `toggleDone`, dans `session-life.js`
— et elle vaut pour TOUTE semaine affichée, pas seulement la courante.

Découpage :

- **`js/ui/session-life.js`** (nouveau) — la séance VÉCUE : `feedbackModal`, `showCongrats`,
  `toggleDone`, `momentHTML`, `painBannerHTML`/`bindPainBanner`, `sickToggleHTML`/
  `bindSickToggle`, `heroSessionHTML`. Ces fonctions vivaient dans `tab-week.js` et étaient
  importées par `tab-today.js` : les laisser mourir avec l'onglet aurait fait disparaître la
  boucle validation → feedback → célébration, qui n'a rien à voir avec un onglet. Étape 2 du
  handoff : un module ne se supprime pas, il se vide d'abord.
- **`js/ui/tab-plan-general.js`** — absorbe la carte « Ta semaine » (semaine courante, jour
  du jour marqué), l'échange de deux jours ⇄, et la vraie coche. `weekGridHTML` devient le
  SEUL producteur de cases : Plan et Semaine en dessinaient chacun une, avec la divergence
  qui va avec.
- **`js/ui/tab-today.js`** — reçoit ce qui relevait du QUOTIDIEN et pas du plan : contenu du
  jour, bilan hebdo, réglage du rappel, déclaration de maladie, journal des adaptations,
  « Modifier ma forme du jour ». Ils parlent de la journée, pas de la saison.
- **`js/ui/tabs.js`** — `TABS` passe à 4 ; un identifiant d'onglet inconnu (un « week »
  resté dans un état sauvegardé) retombe sur le repli déjà en place.

**La règle « aucune séance avant le point du matin » s'assouplit et se resserre en même
temps** (arbitrage confirmé, O-5 clos). Semaine la faisait respecter par une REDIRECTION de tout l'onglet vers Aujourd'hui.
Ce que la règle vise, c'est la séance du JOUR montrée non adaptée — pas la consultation de
sa saison. La carte « Ta semaine » reste donc vide (avec un bouton vers le check-in) tant
que le point du matin n'est pas fait, et l'onglet n'est plus pris en otage.

Critères d'acceptation du handoff, tous assertés dans `smoke-checkin.mjs` : `TABS.length
=== 4`, aucune erreur console sur les 4 onglets, cocher une séance ET voir la vue d'ensemble
depuis le seul onglet Plan, aucun import restant vers `tab-week.js`.


### R16.10 — swimrun réintégré, mais la dette d'abord

Décision de périmètre R12 §0 (30/07/2026) : le swimrun était **sorti du bundle**, pas masqué
dans l'UI — 78 % de profils propres au banc v7, quatre checks budgétés à 53-80 ‰, et le
principe du dépôt (« du code expédié mais non exercé est ce qu'on refuse ») tranchait dans ce
sens. La condition de retour posée était de traiter la dette, pas de retirer le drapeau.

**Mesure d'abord.** Reconstruit avec le module, le banc donnait `S-LONGSWIM` 16 ‰, `S-MIX`
23 ‰, `S-RUN-STARVED` 18 ‰, `S-PREREQ` 0 — pour des budgets de 53 à 80 ‰. Un filet trois à
cinq fois plus large que ce qu'il attrape ne protège de rien : c'est la leçon O-1, à nouveau.

**Deux causes, une par côté.**

*Côté moteur — S13, la structure hebdomadaire ne lisait pas l'objectif.* `swimrunWeekSchema`
a pour signature `(phase, isRecup)` : elle ne voit jamais la course. Mesuré sur un balayage du
mix d'épreuve à profil constant :

| épreuve | course dans la COURSE | course dans le PLAN (avant) | (après) |
|---|---|---|---|
| 800 m / 30 km | 94 % | 63 % | 84 % |
| 1 500 m / 20 km | 85 % | 64 % | 85 % |
| 2 600 m / 12 km | 71 % | 64 % | 64 % |
| 3 000 m / 8 km | 63 % | 64 % | 64 % |
| 5 000 m / 5 km | 45 % | 64 % | 64 % |

Le plan valait 63-64 % de course quelle que soit l'épreuve. `S13_MIX_FOLLOWS_RACE` fait
basculer le SECOND créneau facile (une nage de récupération) en course au-delà de 78 % de
course dans l'épreuve. Pas de rééquilibrage au prorata — nager 6 % du temps parce que la
course nage 6 % du temps serait absurde, la technique se perd par manque de **fréquence** —
et aucune discipline ne descend jamais sous deux rendez-vous hebdomadaires.

Deux choses apprises en le faisant, toutes deux écrites dans le code :
- **la règle miroir a été écrite, mesurée, et retirée.** Côté épreuve dominée par la nage, le
  plan était déjà à 64 % pour 45-53 % dans la course : au-dessus, jamais en dessous, donc
  jamais le sens qui sous-entraîne. Basculer par symétrie faisait tomber la part de course à
  17 %. Une règle qu'aucun défaut ne réclame est une règle qui en crée un.
- **la bascule ne s'applique ni au froid ni sous drapeau médical.** Sans ce second verrou,
  71 profils sous drapeau perdaient leur seule nage continue — la spécificité est la priorité
  5 du manifeste, la santé la 1.

*Côté banc — l'instrument punissait les règles de sécurité.* `S-MIX`, `S-RUN-STARVED` et
`S-LONGSWIM` comparent le plan à la course sans savoir que le moteur a délibérément allégé une
discipline. Mesuré : **71 des 73 hits de S-LONGSWIM et 5 des 7 de S-RUN-STARVED** portaient un
drapeau médical ou une blessure de la discipline en cause. Un plan qui s'écarte de la course
POUR CETTE RAISON est conforme. Même famille de défaut que `U-STRUCT` en R15.1.

**Résultat : 78 % → 89 % de profils propres** (au niveau du duathlon), résidu 5-8 ‰ stable sur
trois tailles d'échantillon (N=250 / 400 / 600), **budgets 53-80 ‰ → 12 ‰**, `S-PREREQ` à 0
(garde-fou permanent). Le drapeau `EB_SWIMRUN` disparaît de `buildApp.mjs`, `runAuditV7.mjs`,
`goldenMaster.mjs` et `run-all.mjs` : sept sports au sélecteur, dixième suite E2E, golden
**764 → 900 profils**.

**R16.10-a — et le golden était rouge depuis R15.7-C.** Trouvé en vérifiant les gates un par
un avec le bon code de sortie : `golden:verify` annonçait « 0 écart » puis sortait en code 1,
parce que les quatre profils `mineur` ajoutés à la passe de garde-fous se terminent désormais
par un REFUS typé (`ENTREE_INVALIDE`) — le comportement voulu de R15.7-C — que le golden
comptait comme une erreur de génération. La CI gate sur cette commande : **ce gate était donc
rouge en permanence**, et un gate rouge en permanence est un gate que plus personne ne lit. Un
refus typé est désormais compté, affiché et haché à part, exactement comme `U-REFUS:` au banc
v7 depuis R11.


## R15.3 — mesurer la fréquence du repli avant d'arbitrer son contenu

O-3 traînait depuis R10 avec la mention « coût faible et non chiffré ». Le handoff R15.3 a
montré que l'entrée posait la mauvaise question : elle réclamait l'écart de CONTENU entre
`facileR` et `facile2`, alors que ce qui décide est la FRÉQUENCE de déclenchement du repli.

`scripts/measureFallback.mjs` (`npm run measure:fallback`) répond, avec le critère posé
**avant** la mesure : < 5 % ferme l'entrée, > 20 % lui donne son lot. Résultat : **trail
25,0 % des plans** (2,6 % des jours), **swimrun 44,4 %** (3,9 %) — l'entrée mérite son lot, et
le sport le plus concerné n'était pas celui qui l'avait ouverte.

**La méthode compte autant que le chiffre.** Aucune instrumentation dans `src/` : le repli est
détecté post-hoc en comparant le plan émis au `weekSchema` que le module déclare — mesurer sans
toucher au code mesuré, comme `npm run trace`. Trois pièges, tous conservés dans le script sous
forme de gardes :

1. **le balayage vide qui ressemble à un résultat.** Premier passage : 0,0 %. Cause — le
   domaine de format du trail est un tableau vide (sa catégorie d'effort est déduite, R7), donc
   la boucle ne produisait aucun profil. Le script sort désormais en erreur si un sport ne
   génère aucun plan.
2. **le contrôle croisé qui accuse la mauvaise méthode.** J'avais doublé la mesure par un
   dénombrement insensible à l'ordre, qui rendait 0 % contre 25 %. C'est le contrôle qui était
   faux : il supposait que les créneaux de repli DÉCLARÉS dans le schéma survivent au rendu,
   alors que le budget de séances en éteint. Deux mesures qui divergent ne désignent pas
   laquelle ment — il faut aller regarder les données brutes, ce qui a pris trois lignes.
3. **l'hypothèse non testée.** La correspondance prévu ↔ rendu se fait par position ; elle ne
   vaut que si les jours ne sont pas réordonnés. C'est vérifié à chaque exécution (les jours
   portent leur nom canonique Lun→Dim) et le script refuse de publier si l'hypothèse tombe.

Cinq sports sur sept ne déclarent pas de `weekSchema` (ils prennent celui du générateur) : la
méthode ne peut rien en dire, et le script l'affiche au lieu de rendre un zéro.


## R15.9 — le registre des bugs s'exécute (`npm run registry:check`)

`BUGS_OUVERTS.md` dit de lui-même qu'« une dette qu'on ne peut pas re-mesurer en une ligne
n'est pas une dette, c'est un souvenir ». R15.9 applique la phrase au document.

Chaque entrée mesurable porte un bloc ` ```verify ` — `id`, `quoi`, `attendu` (motif attendu
dans la sortie), `cmd`. Le script les exécute et range chacune en trois colonnes :

| colonne | signification |
|---|---|
| **reproduit** | la mesure retrouve ce que l'entrée décrit — l'entrée est à jour |
| **ne reproduit plus** | la commande tourne, le motif a disparu : l'entrée est devenue fausse et doit passer au §4. **C'est un résultat, pas un échec** — le §4 était rempli à la main jusqu'ici, en compilant le fichier |
| **commande cassée** | la commande ne produit plus rien : le registre pointe dans le vide |

Une entrée FERMÉE écrit le motif de sa CORRECTION : elle « reproduit » son état corrigé. Sortie
en code 1 sur une commande cassée seulement ; `--strict` fait aussi échouer sur une entrée
périmée.

**Le vérificateur a été vu rouge avant d'être publié.** Un bloc au motif introuvable et un bloc
à la commande inexistante ont été ajoutés temporairement : les trois colonnes se remplissent
correctement et le code de sortie passe à 1. Un contrôleur qui n'a jamais échoué ne prouve rien
— c'est la même leçon que R16.10-a, où un gate sortait en 1 depuis des semaines sans que
personne ne le lise.

**Hors CI, délibérément** : les commandes du registre rejouent `audit:v6`, `audit:v7` et
`golden:verify`, qui sont déjà des gates. L'intérêt de `registry:check` est de re-vérifier le
document quand on le REPREND, pas d'ajouter dix minutes à chaque push.

## R15.5 — l'`expect:'fail'` qui passe : vérifié, aucun travail nécessaire

Le handoff craignait que le jour où quelqu'un corrige `F2`, le test rougisse et la correction
soit annulée comme une régression. Vérifié en forçant le seuil de `F2` de 45 % à 40 % :
`audit_v6.mjs` affiche `★ F2 … ← CORRIGÉ : passer expect à 'pass'`, compte le test comme VERT,
annonce **0 régression** et sort en code 0. Le mécanisme est correct. Les cinq autres bancs
(`r13`, `r14`, `r14.1`, `r15`, `v7`) n'ont pas de mécanisme `expect` du tout : chez eux, tout
doit passer. L'entrée est classée §4 (« devenue fausse ») avec sa vérification.

## R15.6 — swimrun : réglé par R16.10, pas par un job séparé

Le handoff proposait deux sorties : un job CI séparé non bloquant, ou une branche dédiée. La
troisième a été prise — **traiter la dette et réintégrer le module** (R16.10). Les budgets ne
surveillent plus du code non exécuté : le code est expédié, les checks tournent dans l'audit
principal, et les budgets sont à la taille du résidu réel. Le « pire des deux mondes » que le
handoff décrivait n'existe plus.


## R17.1 — l'avatar gagne un canal « forme du jour » (brief avatar, §AV1/AV2/AV6)

Le brief avatar arrive avec quinze décisions actées. **Trois seulement sont implémentables en
l'état** ; le reste bute sur des dépendances de production (assets illustrés) ou sur une règle
du dépôt. Ce chapitre livre les trois, et nomme les blocages plutôt que de les contourner.

### Ce qui manquait vraiment

`avatarSVG` pilotait la posture par les **séances des 7 derniers jours**. Ce signal n'est ni
la forme d'aujourd'hui ni la progression long terme : c'est un troisième axe, corrélé au
premier (l'XP compte aussi les séances faites) et sans rapport avec le second. L'avatar ne
disait donc pas comment l'athlète va AUJOURD'HUI — alors que la donnée est collectée chaque
matin depuis R5, au check-in.

Conséquence directe : le critère **AV1-B** (« à forme du jour égale, la posture ne change pas
quand le palier change ») était **structurellement infalsifiable** — la posture bougeait avec
le nombre de séances, donc avec le palier.

### Les deux canaux, et ce qu'ils ne partagent pas

| canal | ce qui le pilote | ce qu'il rend |
|---|---|---|
| **forme du jour** | le check-in du matin (`readiness.energy`) | posture (5 variantes) + expression (calque tête, 5 états) |
| **progression** | le niveau `EBV2.avatar` (16 paliers, régularité, cumulatif) | équipement, décor, aura, couleur |

Deux garde-fous, tous deux au nom du manifeste :
- **sans check-in du jour, le visage est NEUTRE** — jamais un sourire par défaut. L'app ne
  prétend pas savoir comment tu vas si elle ne l'a pas demandé ;
- **drapeau douleur actif → l'état plafonne à « fatigué·e »**. Un avatar souriant pendant
  qu'un bandeau annonce une douleur, c'est le produit qui se contredit à l'écran.

### Le contrat de calques, et pourquoi il n'est pas cosmétique

Le SVG porte désormais `data-layer` (`decor`, `maillot`, `posture`, `gear`) et `data-piece`
par pièce d'équipement. Ça sert deux choses : le test lit des CALQUES au lieu de deviner par
expressions régulières, et une future bibliothèque de composants illustrés se branche sur la
même structure. `HEAD_ANCHOR` est exporté (AV6) : le crâne et les cinq expressions le lisent
tous les deux, donc l'ajout de morphologies ne redessinera pas les expressions.

### Ce que l'implémentation a appris au critère

**AV1-A ne peut pas se lire au pixel.** « À palier égal, équipement identique » : les
chaussures se posent au bout des jambes ; si les jambes bougent, elles bougent. Le critère
porte donc sur les **pièces présentes et leur couleur** — ce qu'on possède — pas sur leur
position — où le corps les porte. Un test écrit sur les coordonnées aurait forcé des
chaussures flottantes pour rester vert : l'instrument aurait dicté un défaut visuel.

**Garde : `tests/e2e/smoke-avatar.mjs`** (11e suite E2E, 19 assertions) — AV1-A, AV1-B, AV6-A
avec leurs identifiants d'origine, plus les deux garde-fous et l'annonce de l'état aux
lecteurs d'écran.

### Ce qui reste bloqué, et pourquoi

| décision | blocage |
|---|---|
| ~~**AV3 / AV4**~~ | ✅ **Tranché en R17.2 par un TROISIÈME CANAL** — voir ci-dessous. |
| **AV7 / AV8** — assets raster générés SDXL | Production d'images, hors périmètre du code (le brief le dit lui-même, étape 1). Et le standalone fait 1,57 Mo tout inline : 45 pièces raster en `data:` changent la nature du livrable offline — à chiffrer avant de s'engager. |
| **AV11 / AV12** — badges par zone du corps | Les 7 badges de `badgesV2` sont **tous** de la régularité (`streak3`, `bloc-base`, `recup`…) : aucun ne porte de discipline. AV12 les mettrait donc tous sur le torse. Il faut d'abord créer des badges par discipline — ce que le brief ne prévoit pas. |


## R17.2 — le troisième canal : montrer la performance sans rien retirer

**Le blocage.** AV3/AV4 voulaient piloter l'ÉQUIPEMENT de l'avatar par un palier de
performance (allure seuil, CSS, FTP/kg). Refusé, pour une raison qui tient en une phrase :
**une allure seuil monte ET DESCEND.** Une blessure, une maladie, une grossesse, une charge
de travail, ou simplement l'âge la font baisser — et l'athlète verrait son avatar **se
déshabiller** au moment précis où il a le plus besoin d'être encouragé à revenir. Le scénario
n'est pas théorique : quelqu'un au seuil à 4:30/km revient d'une blessure à 5:10/km et
repasserait du palier 7 au palier 4, perdant dossard et lunettes, sans avoir cessé d'être
régulier.

**L'arbitrage retenu** (option C) : l'information de performance est réelle et l'athlète a le
droit de la voir — mais elle a son **propre canal**, construit pour être réversible sans
perte.

| canal | source | rendu | peut baisser ? |
|---|---|---|---|
| forme du jour | check-in du matin | posture + expression | oui, chaque jour |
| progression | XP (régularité, cumulatif) | équipement, décor, aura | **jamais** |
| **forme physique** | `margeOf` (R14.1) | **un repère gradué au sol** | **oui — et il ne retire rien** |

La différence est structurelle, pas cosmétique : le troisième canal est une **position sur
une échelle**, pas une possession. Il se déplace. Il peut reculer sans que quoi que ce soit
disparaisse de l'avatar — c'est la différence entre « tu es ici aujourd'hui » et « on te
retire ce que tu avais gagné ».

**La source n'est pas un nouveau calcul.** `perfTierV2` s'appuie sur `margeOf` (R14.1), déjà
sourcé — profil de puissance Coggan pour le vélo, heuristiques assumées et écrites comme
telles pour course et nage — et déjà **décalé par sexe et par âge**. Un master de 55 ans n'est
donc pas jugé contre une référence de 25 ans, et une femme n'est pas jugée contre une
référence masculine : on décale la RÉFÉRENCE, jamais la personne. C'est la leçon de R14.1,
réutilisée telle quelle au lieu d'être réinventée.

Trois règles dans le rendu, toutes assertées :
- **`null` quand aucune référence n'est mesurée** — pas de palier 1 par défaut. On ne montre
  pas une position qu'on n'a pas mesurée ;
- **jamais de rouge, aucun mot d'échec** — c'est un constat, pas une note ;
- **aucun effet sur les deux autres canaux** — l'équipement, la posture et l'expression sont
  strictement identiques entre un palier 2 et un palier 9.

**Garde : `AV3-C`** dans `tests/e2e/smoke-avatar.mjs` (25 assertions au total). C'est
l'assertion qui protège l'athlète : elle compare deux rendus à niveau et forme du jour égaux
mais à paliers de forme physique opposés, et exige que l'équipement soit identique. Tant
qu'elle est verte, une baisse de performance ne peut pas déshabiller quelqu'un.

---

## R18 — le lot du retour de TEST (fondateur, 01/08/2026)

Six constats sont revenus d'un test de l'application livrée. Cinq étaient des défauts, et deux
d'entre eux se sont révélés plus larges que ce que le test avait pu voir. Le sixième était une
demande produit. C'est le premier lot du dépôt qui ne vient ni d'un audit externe ni d'un
handoff : il vient de quelqu'un qui a ouvert l'app et l'a utilisée.

**Banc : `npm run audit:r18` (`bench_r18.cjs`, 13 critères, 21e gate CI).** Rouge sur 10 de ses
13 critères contre le moteur d'avant le lot.

### R18.1 — le zoom involontaire

Constat : « pas d'antizoom sur le html ». Le `<meta viewport>` était pourtant correct. La cause
est ailleurs et elle est mécanique : **iOS zoome automatiquement sur un champ dont la taille de
texte est sous 16 px**, à la mise au point, et ne dézoome jamais après. Mesuré au pointeur
tactile : 17 champs au Profil, 5 dans 🎯 Aujourd'hui — dont les quatre sélecteurs du check-in
du matin, l'écran touché tous les jours.

`css/mobile.css` posait pourtant la bonne valeur sur `input, select` **depuis l'origine**. Elle
ne s'appliquait à rien de ce qui compte : `.opt` (0,1,0) et `input[type=text]` (0,1,1 — un
sélecteur d'attribut pèse autant qu'une classe) battent tous deux `select` (0,0,1). Un
correctif que la cascade annule est un correctif qu'on croit avoir. D'où le bloc `--fs-field`
en **fin** de `styles.css` (à spécificité égale, l'ordre source tranche) et la répétition
explicite des deux formes.

**Ce qu'on ne fait pas : `user-scalable=no`.** Interdire le pinch-to-zoom retire le zoom SUBI
en retirant aussi le zoom VOULU — c'est la seule loupe d'un malvoyant sur mobile, et le
manifeste met la santé avant l'esthétique. `smoke-typo` asserte les deux moitiés.

**R18.1-a, trouvé en chemin :** la garde `smoke-typo` ne lisait pas `css/mobile.css`, qui
portait un `font-size:8px` (le libellé « détail » des séances repliables) — sous le plancher de
9 px que R16.8 affirme tenir. La mesure de rendu ne le voyait pas non plus : un `::after` n'est
pas un nœud de texte. **Les deux mesures le manquaient.** La couche mobile garde le droit
d'écrire des valeurs concrètes (elle survit délibérément à une régénération de `styles.css`) :
on n'y exige donc pas zéro littéral, on y exige le **plancher** — c'est la propriété qui
protège quelqu'un, pas la propreté du fichier.

### R18.2 — le profil de course PAR DISCIPLINE

Demande : « dans la construction avancée je veux qu'on définisse le profil de la course
(ex triathlon : eau vive, vélo montagneux, course plate) ».

R14.3-a avait unifié `terrain` et `course_profile` en UNE clé — le bon geste contre la
divergence silencieuse. Mais cette clé unique décrit le parcours **comme s'il était homogène**,
et un triathlon ne l'est jamais : les trois corrections sont indépendantes, et une clé globale
en appliquait une troisième, fausse pour les trois.

Trois clés de schéma (`leg_swim_env`, `leg_bike_prof`, `leg_run_prof`) et **un résolveur
unique**, `legProfileOf(a, leg)`, qui prolonge la cascade de R14.3-a d'un cran : réponse du leg
→ profil de course global → terrain d'entraînement. Un seul chemin, trois niveaux de précision ;
on ne recrée pas deux vocabulaires. La nage ne retombe sur rien — un relief ne décrit pas un
plan d'eau, et « lac montagneux » serait traité comme du plat.

`SWIM_ENV` mérite sa note : **la référence n'est pas le bassin**. `TRI_SWIM[format].factor` est
calibré « peloton, combinaison et navigation compris », donc sur de l'eau libre calme — le lac
vaut 1,00 et le bassin est plus RAPIDE. Se tromper de point d'ancrage aurait ralenti tout le
monde de 5 % en croyant corriger. Et `eau_vive`, le cas cité, est le seul dont le **signe** est
inconnu : un courant porte autant qu'il freine. Sa bande est donc asymétrique et large **des
deux côtés** (0,95–1,20), comme `RELIEF` élargit au lieu de décaler pour la course à pied.

Effet mesuré sur un 70.3, entre « tout vallonné » et « eau vive · vélo montagneux · course
plate » : natation 39'04–41'29 → 37'07–49'47, vélo 173–189 W → 169–185 W, CAP 1h53–2h04 →
1h50–1h57. Les trois legs bougent séparément, **et sur la séance du jour J du plan**, pas
seulement sur une carte d'affichage — c'est pour ça que le banc de sensibilité lit désormais le
`det` de la course : une réponse qui change les temps prescrits passait auparavant pour « sans
effet sur le plan ».

### R18.3 — retour à cinq onglets

« Je préférais 5 onglets que 4, l'œil humain aime les chiffres impairs. » Il y a une raison de
plus que l'esthétique : 🎯 Aujourd'hui est l'onglet **central** du produit depuis R5, et avec
quatre onglets « central » n'existe pas. L'ordre est **Profil · Plan · Aujourd'hui · Semaine ·
Nutrition** — troisième sur cinq, donc réellement au milieu.

**Ce que la restauration ne ramène pas.** R16.9 avait fondu 📅 Semaine dans 🗓 Plan et, ce
faisant, trouvé un vrai défaut : la coche existait en DEUX versions, dont l'une ne produisait
aucun `completion` — donc aucun RPE, donc un ajusteur qui sous-estimait la fatigue le lendemain.
`tab-week.js` ne redessine rien : il consomme `weekGridHTML` et `toggleDone`, les mêmes que
🗓 Plan. Répartition : Semaine apporte la **navigation** de semaine en semaine (ce que ni Plan
ni Aujourd'hui ne donnaient), le quotidien reste dans 🎯 Aujourd'hui, Plan redevient la saison.

Débusqué en le faisant : `handleSwapClick` re-rendait `renderTabPlanGeneral` **en dur** — un ⇄
touché depuis Semaine faisait disparaître Semaine. Même classe de défaut (un geste, deux
comportements selon l'écran), par l'autre bout.

### R18.4 — le brick disparaissait de l'affûtage

Constat : « Sur mon profil perso, 0 brick en affûtage ? ». Mesuré : sur les **4 formats de tri
et les 4 de duathlon, tous niveaux**, le dernier enchaînement vélo↔course tombait **trois
semaines** avant le jour J.

R13.4 avait branché l'affûtage explicitement sur `dur1` et `dur2` ; `durLong` retombait encore
dans la branche générique et rendait une sortie longue à pied. Le triathlète arrivait donc au
départ sans avoir posé le pied par terre après le vélo depuis 21 jours — sur la transition qui
est la difficulté propre du sport. Le swimrun, lui, gardait sa séance pivot en affûtage : le
modèle existait déjà dans le dépôt, il n'était pas appliqué ici.

**C21c** déclare la bande du brick d'affûtage, et sa forme est le point intéressant : son
**plafond est le plancher de la bande de charge du même format** (`BRICK_TAPER_BIKE_BOUNDS`
dérive de `BRICK_BIKE_BOUNDS`). Le brick le plus long qu'autorise l'affûtage est donc le plus
court qu'exigeait la construction — vrai par construction sur les six formats, impossible à
faire diverger. L'affûtage n'est **pas** exempté de C21b : une exemption serait le trou par
lequel une sortie de 2 h reviendrait en semaine d'affûtage sans un mot.

Écart ramené de 3 semaines à 1 (la semaine de course est exclue : sa spécificité, c'est la
course, et c'est aussi la semaine que R13.4/R15.7 remodèlent).

**Une erreur de conception, trouvée par le banc v7 et gardée écrite.** La première écriture
mettait le leg vélo entier en `bk.rp` : 38 à 48 minutes **continues** en zone haute, dans une
semaine d'affûtage — 158 profils de duathlon en violation de dose (`U-DOSE`, 59 % de profils
propres). Le banc avait raison au-delà de sa règle : 45 minutes à allure course EST une séance
dure, c'est-à-dire l'exact contraire de ce que la séance prétend faire. Le leg vélo roule donc
en Z2, l'allure course est rappelée par la **consigne** sur la fin — même structure que le brick
de pic. Duathlon 59 % → 89 %. Critère `R18.4-D` posé pour que ça ne revienne pas.

### R18.5 — la cadence de récupération ignorait les phases

Constat : « 2 semaines de récup en spécifique (peut-être lié au roulement sur 10 jours) ». Ce
n'était pas le cycle de 10 jours, et le défaut était plus large : sur un balayage de plans,
**75 % portaient une décharge DANS la phase pic** et 75 % ouvraient une phase sur une décharge.
Une seule cause : `sinceR` comptait les cycles depuis la dernière récup, globalement, sans
jamais regarder où on se trouvait dans le plan.

Trois règles, et **aucune ne supprime de récupération** — une décharge perdue est de la charge
ajoutée en silence :

- **C27a** — une phase ne s'ouvre jamais sur une décharge. Elle est **anticipée** au dernier
  cycle de la phase qui se termine, jamais reportée : la première écriture reportait, et la
  mesure a montré que ça faisait passer la plus longue série de semaines de charge de 4 à 5.
- **C27b** — aucune récupération dans le pic tant que l'affûtage peut en tenir lieu ; elle est
  anticipée au dernier cycle du spécifique. Le garde `cyclesDansPic <= recupEvery` **sert** :
  sur les longues préparations le pic monte à cinq semaines (R13.6), et là il mérite vraiment
  sa décharge — la règle se désactive d'elle-même.
- **C27c** — une récupération ne se colle jamais à l'affûtage (deux à trois semaines de
  décharge d'affilée avant le départ, sur la fin de plan où la spécificité est maximale).

**Et un garde domine les trois** : `chargeStreak < recupEvery`. Aucune règle de placement n'a le
droit de faire dépasser à l'athlète sa propre cadence de récupération — c'est l'ordre du
manifeste, santé avant progression. Quand les deux exigences sont incompatibles (cadence 3 +
spécifique de 4 semaines + pic de 2), la cadence gagne et le placement cède. Le banc **compte
et affiche** ces arbitrages (34), et chacun est **démontré** : il retire la décharge litigieuse
et vérifie que la série de charge dépasserait alors la cadence. C'est la différence entre une
exception posée d'avance et un test affaibli pour devenir vert.

Trois erreurs dans mes propres règles, trouvées à la trace et gardées écrites dans le code :
une anticipation qui doublait une décharge déjà prise, une autre qui visait le cycle qu'elle
était censée protéger, et C27c qui rouvrait ce que C27b venait de fermer.

### Le sixième constat, et ce qu'il a coûté de vérifier

« Volume max à 12 h au lieu de 14, acceptable pour le 70.3 » — arbitré « acceptable » par le
fondateur. La mesure dit autre chose que le constat : **au-delà de 10 h, `vol_max` ne change
plus rien** sur un 70.3, et le pic livré dépasse le pic annoncé de ~0,8 h. Enregistré en `O-10`
avec sa commande de re-mesure, pas corrigé — c'est un chantier de sonde de capacité, pas une
ligne.

Deux autres défauts trouvés **en lisant les plans** pendant le lot, enregistrés et non traités :
`O-8` (le footing du swimrun n'a pas de bornes : 182 à 228 min, c'est la plus longue séance du
plan sur les trois formats — exactement le défaut que R13 a corrigé pour le tri) et `O-9` (le
banc d'invariants porte quatre familles d'échecs pendant que la documentation le dit vert ;
vérifié identique contre le moteur d'avant R18, donc dette et non régression).

---

## R19 — l'audit de mes propres résultats (01/08/2026)

R18 livré, les résultats ont été repassés au crible de six regards de spécialistes —
physiologie de l'entraînement, triathlon, course, vélo, natation, swimrun — **en mesurant sur
le bundle livré**. Six incohérences en sont sorties. Trois étaient réelles et sont corrigées ;
une était réelle et attend d'être tranchée ; **une était fausse, et c'est ma mesure qui
l'était**.

### R19.1 — deux questions inertes en swimrun (défaut introduit par R18.2)

`leg_swim_env` et `leg_run_prof` ne changeaient **rien** en swimrun : son prédicteur additionne
trois postes qu'il met en forme lui-même (`fmtHM`) et ne passe donc ni par `swimRange` ni par
`runRange`, les deux seuls endroits où les corrections étaient appliquées. Les questions étaient
pourtant posées au questionnaire ET au Profil.

Le pire était du côté des gardes : la suite E2E swimrun assertait que le champ **existe**,
jamais qu'il **agit**, et le critère `R18.2-A` ne couvrait que le tri. J'avais façonné la garde
sur le code au lieu de la façonner sur la promesse. Le kit expose désormais `legBands` (les
bandes brutes) pour les modules qui ont leur propre mise en forme.

### R19.2 — la combinaison n'existait pas (et R18.2 avait affiné par-dessus)

`water_temp_c` n'était déclaré que pour le swimrun. En triathlon : pas de température d'eau,
donc pas de combinaison, donc pas de seuil de légalité. C'est la variable **dominante** du leg
natation — 4 à 7 % de temps, et une bascule réglementaire à 24,5 °C — et R18.2 avait ajouté
par-dessus un raffinement de ±5 % (mer calme vs mer agitée). **L'ordre de grandeur était
inversé : on affinait le détail en ignorant le principal.**

`WETSUIT` compose avec `SWIM_ENV` (deux causes physiquement indépendantes : flottaison d'un
côté, navigation et respiration de l'autre). Et sous 15 °C le moteur **ne raffine pas une
estimation, il prévient** — choc thermique, hyperventilation, acclimatation obligatoire. La
santé avant le chrono.

### R19.3 — la durée d'affûtage suivait la préparation, pas la course

Mesuré : un **Sprint préparé sur 47 semaines recevait 3 semaines d'affûtage**, pour une épreuve
de vingt minutes d'effort. R13.6 avait corrigé un vrai défaut (six semaines d'affûtage sur un
plan de 59 semaines) mais sur le **mauvais axe** : son plafond ne lisait que `weeks`.

`TAPER_WEEKS_BY_FORMAT` indexe désormais sur l'épreuve (sprint/olympique ~1 semaine, demi-fond
long ~2, très long ~3), et le plafond de la préparation s'applique **en plus** (min des deux) :
un plan court ne donne pas trois semaines d'affûtage à un Ironman.

### R19.4 — LE CONSTAT ÉTAIT FAUX, ET LA CORRECTION ÉTAIT UNE RÉGRESSION

À garder écrit, parce que c'est une leçon de mesure et que ce dépôt en vit.

J'avais conclu que « l'affûtage coupe l'intensité plus vite que le volume », sur la foi d'un
compteur de **minutes DURES** tombant à zéro sur 14 plans. J'ai écrit la correction, puis je
l'ai mesurée :

| | qualité en 1re semaine d'affûtage | semaines à zéro |
|---|---|---|
| moteur avant | 45 min | 2 |
| **avec ma « correction »** | **38 min** | **4** |
| après retrait | 43 min | 0 |

Artefact de métrique : `bk.rp`, `bk.ss` et `rn.mara` — le travail d'allure spécifique, exactement
ce qu'un affûtage doit garder — sont classés MODÉRÉS, pas durs. Sur le bon critère
(modéré + dur), le moteur d'avant était **déjà 59/59 conforme**. Retiré. Suivi en `O-12`.

### R19.5 — la prose promettait une allure que la structure ne portait pas

La note du brick disait « vélo en endurance, **dernier tiers @ allure course** » et le step
portait `bk.z2` sur la totalité : **881 min (14,7 h) d'allure course annoncées à l'athlète sur
un plan 70.3, portées par aucun step, comptées 100 % facile**. Un commentaire l'assumait pour
ne pas faire tomber la part de temps facile — protéger la MÉTRIQUE, pas le plan.

**Fait :** la note dit ce que la séance fait. **Pas fait, et le motif est mesuré :** poser le
tiers en `bk.rp` met 58 combinaisons de tri sous le plancher C26, et surtout la construction
révèle que `bk.rp` vaut **0,80–0,88 × FTP** quand le prédicteur prescrit **0,752–0,822** pour
le jour J d'un 70.3. Le moteur porte **deux définitions de « l'allure course »**, et la zone
d'entraînement est plus dure que l'allure de course qu'il annonce. Il faut les réconcilier
avant de construire une séance dessus — suivi en `O-11` avec sa commande de re-mesure.

---

## R20.1 — les gardes cessent de couvrir « là où le code a été écrit »

Mes deux défauts de R19 avaient la **même forme** : la garde couvrait le sport où le code avait
été écrit, pas celui où il servait. `leg_swim_env` agissait en triathlon et pas en swimrun ; le
champ « température de l'eau » plantait le questionnaire triathlon, qu'aucune suite E2E ne
traversait. Deux gardes, parce que les deux défauts étaient de deux types distincts — **une
réponse qui n'agit pas** et **un écran qui ne s'affiche pas**. Une seule des deux n'en aurait
attrapé qu'un.

### La garde dérivée du schéma

`audit:sensibilite` gardait une **liste écrite à la main**, sur **un seul sport**. Elle
n'attrapait donc que ce dont on s'était souvenu, là où on l'avait écrit. Le balayage est
désormais dérivé d'`ANSWER_SCHEMA` : pour chaque sport, pour chaque clé que le schéma déclare
applicable à ce sport, il fabrique une valeur différente et exige que le plan change.
**148 couples sport × clé**, aucune liste à maintenir — une clé ajoutée au schéma est testée le
jour même.

Trois mécanismes le rendent honnête plutôt que bruyant :
- l'empreinte lit le **texte rendu** des séances, pas seulement leur structure : une réponse
  qui change les watts ou l'allure sans déplacer une séance ne passe plus pour inerte ;
- les clés **conditionnelles** (`off_days` sans `off_which`, `vam` sans `vam_known`…) sont
  exemptées ET testées **en paires** — une exemption sans sa paire serait une porte de sortie ;
- une clé inerte connue est une **DETTE DÉCLARÉE**, affichée à chaque exécution avec son entrée
  de registre. Jamais un silence.

Le schéma a aussi cessé de **sur-déclarer** : la FTP était déclarée pour la course à pied et la
natation, `terrain` pour la natation, l'accès au tapis pour les sept sports. Ces clés y étaient
évidemment inertes, et elles noyaient le signal des vraies inerties.

### La garde des sept questionnaires

`tests/e2e/smoke-questionnaires.mjs` va du choix du sport jusqu'au plan généré, **pour les sept
sports**, et échoue sur la moindre erreur JavaScript. Son répondeur est **générique** : il ne
connaît pas la liste des questions, il répond à ce que l'écran présente. C'est volontaire — une
suite qui connaîtrait les questions cesserait de traverser le jour où on en ajoute une, et
c'est exactement le trou qu'elle ferme. Vérifiée **rouge** en réintroduisant le défaut de R19.2.

### Ce que les deux gardes ont trouvé le jour même

| défaut | mesure |
|---|---|
| **`vol_recent: 0` lu comme « pas de réponse »** | semaine 1 à **3,9 h au lieu de 2,0 h** sur un profil `reprise` — le `\|\| undefined` traitait le zéro comme une absence, et privait de rampe exactement la population qu'elle protège |
| **le jour J du swimrun sans temps prédits** | le générateur ne passait pas l'objectif décodé à `predictRace` — d'où aussi `leg_swim_env`/`leg_run_prof` inertes sur le plan malgré R19.1 |
| **`gear_test` lu nulle part** | le module dit lui-même que sans test en tenue les allures ne transfèrent pas ; la réponse entre donc dans la confiance accordée aux références |
| **`swim_limit` réservé aux débutants** (O-14) | les deux seuls consommateurs étaient derrière `if (beginner)` — une limite ne disparaît pas quand on progresse |

Dette déclarée : **`O-13`**, la rampe R10 ne mord jamais en natation. Le plafond est en heures
de PLAN, or la nage est déjà convertie en heures d'EAU (`SWIM_TIME_FACTOR`) : les deux nombres
ne mesurent pas la même chose. Corriger demande de décider ce que `vol_recent` veut dire pour un
nageur — une question de produit avant d'être une ligne de code.

## R20.2 — le volume max dit ce qui le bloque, et ce qui le débloquerait

**Le constat de test** : « volume max à 12 h au lieu de 14 ». La mesure (O-10) allait plus loin
que le constat — sur un 70.3, `vol_max` ne changeait plus RIEN au-delà de 10 h : 10, 12, 14,
16 h donnaient le même plan à 0,1 h près. Une question du questionnaire devenait inerte au-delà
d'un seuil que rien n'annonçait, et le moteur livrait un pic bas sans un mot.

**Ce que le lot NE fait PAS** : forcer le volume vers le plafond demandé. Ce serait gonfler des
séances au-delà de leurs bornes, c'est-à-dire défaire exactement ce que la sonde de capacité
V2.1 protège. Aucun chiffre du plan ne bouge — le golden master le confirme : sur 900 profils,
515 changent, et **le seul champ qui diffère est le nombre de décisions**. Pas une séance, pas
une minute.

### La chaîne de réduction, maillon par maillon

`ReasonedPlan.volLimits` transmet désormais les MAILLONS, pas seulement leur produit :
`declared`, `caps` (historique), `util` (volume utile du format), `marg`, `recup` (1B),
`swimTime`, `med`, plus `sessionsMax`/`budget`. Le générateur reconstruit la chaîne, mesure ce
que chaque maillon a retiré **en heures**, et nomme le plus gros. Le reste — l'écart entre le
dernier plafond et le pic réellement livré — est attribué à la STRUCTURE de la semaine
(nombre de séances × durée maximale de chacune), qui est le cas d'O-10.

**Ma première écriture testait les plafonds dans l'ordre du calcul et nommait le premier qui
mord.** Sur la natation, `caps` (10 h) mord avant `util` sur 14 h demandées : le moteur
annonçait « c'est ton historique qui borne » pour un pic livré à **3,3 h** — faux de 7 h. Le
vrai maillon y est la conversion en temps DANS l'eau (`SWIM_TIME_FACTOR`). Une explication
approximative sur un chiffre que l'athlète a lui-même saisi est pire qu'un silence : elle
l'envoie corriger la mauvaise réponse.

Ce que ça donne, à `vol_max: 14 h`, profil `ancien`/`avancé` :

| sport | pic livré | maillon nommé |
|---|---|---|
| course | 11,8 h | ton historique (−2 h) |
| natation | 3,3 h | le temps réellement passé dans l'eau (−6 h) |
| triathlon | 8,6 h | le nombre de séances (−5,4 h) → **levier proposé** |
| duathlon | 9,4 h | ton historique (−3 h) |
| vélo · trail · swimrun | ≥ 12,9 h | rien à expliquer (seuil : 85 % du demandé) |

### Le levier n'est proposé que là où il existe

Sur le 70.3 de la mesure, `doubles: "oui"` fait passer le pic de **8,7 h à 13,5 h**. La question
n'était donc pas inerte : son levier était ailleurs, et personne ne le disait. Mais ce levier
n'est réel que dans les sports dont les builders posent une seconde séance sous `dbl` — le
triathlon, aujourd'hui seul. Proposer ailleurs « fais deux séances certains jours » enverrait
l'athlète modifier une réponse pour rien, sans aucun moyen de savoir que le moteur s'est trompé.

D'où le garde de module `doublesAddVolume`, **mesuré dans les deux sens** à chaque
`npm run audit:sensibilite` : déclaré ⟺ le pic monte d'au moins 5 %. Vérifié rouge en retirant
la déclaration du triathlon (« non déclaré alors que le pic monte de 55 % »). C'est la leçon
R12 appliquée à un drapeau de module — une déclaration que rien ne vérifie finit par décrire
le code d'hier.

Deux gardes de fond, non négociables :

- **Le diagnostic est honnête quel que soit le maillon** — drapeau médical, blessure et âge
  sont nommés comme les autres, avec leur raison. Un athlète a le droit de savoir pourquoi son
  plan est allégé.
- **La PROPOSITION, elle, est gardée** : aucun levier n'est jamais suggéré à quelqu'un dont le
  plan a été réduit pour le protéger. La phrase devient « ton plan est déjà allégé pour te
  protéger : ce n'est pas le moment d'en ajouter ». Hiérarchie du manifeste, santé d'abord.

### Deux rectifications trouvées en chemin

1. **Le point 2 d'O-10 était faux, par un titre de colonne.** `p.volPeak` est le pic RÉELLEMENT
   LIVRÉ (et c'est lui que l'UI affiche partout) ; `w.vol_declared` est la CIBLE de la courbe,
   valeur interne invisible pour l'athlète. Mes colonnes étaient inversées : le livré (8,7 h)
   est légèrement EN DESSOUS de la cible (9,5 h), pas au-dessus — soit le sens attendu, celui
   d'une sonde de capacité qui fait son travail. Il n'y avait pas de défaut, seulement une
   mesure mal étiquetée publiée telle quelle dans le registre.
2. **La carte « Pourquoi ce plan » appelait le plafond d'historique « ton volume déclaré »**
   depuis l'origine. Sur tout profil où les deux diffèrent — le cas courant — elle renvoyait
   l'athlète vers un curseur qui n'était pas celui qui bornait. Même défaut que R20.2 traite
   dans le moteur, un cran plus haut, à l'affichage.

La décision `R20.2` s'affiche **en tête de « Pourquoi ce plan »**, pas au fond du volet des
décisions : c'est une réponse que l'athlète a saisie lui-même et dont il attend un effet.

## R20.3 — le footing du swimrun reçoit ses bornes, après deux bornes fausses

**Le défaut (O-8)** : le créneau facile course n'avait aucun `bnd`. Il était donc le seul bloc
sans plafond de la semaine, c'est-à-dire le déversoir de toutes les passes de remplissage du
générateur. Mesuré à 12 h/sem : « Footing facile » de **179 à 226 min** selon le format, médiane
138-161 min, devant la pivot (110-180 min). Le même défaut que R13 avait corrigé pour le
triathlon (« Footing facile 213 min », D7 du banc v6) : le module swimrun est arrivé plus tard
et personne n'a rejoué la liste des leçons du sport précédent.

### Ce qui a coûté deux tentatives : sur QUOI indexer la borne

Le banc v7 a réfuté les deux premières écritures, sur le même check `S-MIX` — la part de course
du plan comparée à celle de l'épreuve, 4 profils en défaut avant le lot :

| écriture | S-MIX |
|---|---|
| relative à la pivot de la MÊME semaine, ×0,70 | **158** |
| indexée sur le temps de course à pied de l'épreuve, ×0,55 | **152** |
| **relative à la pivot du PIC, ×0,90** | **0** |

La première serrait le footing à ~38 min pendant toute la phase de base, parce que la pivot y
démarre à 20-35 % du temps de course : le footing n'a aucune raison de suivre la rampe de
SPÉCIFICITÉ de la pivot, il construit l'endurance de base, qui est là dès la semaine 1. La
seconde a montré que le problème n'était pas la rampe mais le NIVEAU : en swimrun, les deux
créneaux faciles PORTENT la course à pied du plan — il n'y a ni sortie longue course ni footing
supplémentaire pour compenser. Les serrer, c'est sous-entraîner le limiteur réel du sport,
c'est-à-dire refaire le défaut que S13 venait de corriger en R16.10.

Ce que ces deux échecs disent, et qu'O-8 disait déjà dans sa formulation : **le défaut n'est pas
qu'un footing soit LONG, c'est qu'il soit la plus longue séance du plan**, devant la séance qui
porte la spécificité. La borne finale porte exactement là-dessus — le footing plafonne juste sous
la **pivot du PIC**, la plus longue séance que ce plan produira, plus un plafond absolu de 2 h 30
pour qu'un ultra-swimrun ne rouvre pas le déversoir par le haut.

Résultat : footing **179-226 → 115-150 min**, et la pivot est la séance la plus longue du plan
sur les quatre formats.

`pivotDurationMin()` devient le point unique où la durée de la pivot se calcule (elle était en
ligne dans `durLong`), avec un paramètre de phase pour l'interroger au pic. Deux copies auraient
divergé au premier ajustement de S9, et **silencieusement** : un footing plafonné sur une pivot
d'hier reste un footing plafonné, il ne lève rien.

### La quatrième règle de sécurité que le banc punissait

Les 26 hits résiduels de `S-MIX` portaient **tous** une eau sous le seuil d'acclimatation S7
(25 à 16 °C, 1 à 13 °C). Sous 17 °C le module verrouille le second créneau facile sur une
exposition au froid, au nom de la hiérarchie du manifeste — l'hypothermie n'est pas un arbitrage
de spécificité. Même famille que le drapeau médical et les deux familles de blessures, exemptées
en R16.10 ; le check ne le voyait pas parce que le footing sans bornes masquait le déséquilibre
avec du volume fictif. **L'instrument était d'accord avec le moteur pour la mauvaise raison.**

L'exemption se lit sur le **PLAN** (présence effective de la séance d'acclimatation), pas sur la
température déclarée : une règle qui ne s'applique pas n'exempte rien.

Et parce qu'une exemption sans entrée de registre est un défaut effacé, ce que l'exemption cache
est enregistré en **O-15** : la portée du verrou froid (toutes les semaines, de la première à la
dernière) n'a jamais été décidée, alors que S7 demande une exposition régulière et pas une
confiscation permanente. Isolé toutes choses égales par ailleurs : **3/15 profils sous le seuil
à 16 °C, 0/15 à 20 °C.**

### Bilan

swimrun **88 % → 89 %** de profils propres au banc v7 · `S-MIX` **0 aux trois tailles
d'échantillon** (N=250/400/600), son budget passe de 12 ‰ à **0, garde-fou définitif** · golden
**136 écarts, tous en swimrun** — aucun autre sport n'est touché.

## R20.4 — C26 mesure enfin ce que sa propre justification dit

**Le défaut.** C26 déclare depuis son écriture, noir sur blanc : *« la règle physiologiquement
vraie est le PLAFOND DE TEMPS DUR (≈60 min/semaine) ; la part de facile en est la conséquence
arithmétique »*. Et la seule chose que l'auditeur mesurait était la part de facile —
c'est-à-dire la grandeur DÉRIVÉE, et sur un dénominateur qui mélange le modéré et le dur.
La grandeur que la justification désigne comme physiologique n'était vérifiée nulle part.

Mesuré sur **7 356 semaines de charge** (7 sports × formats × historiques × niveaux ×
4 enveloppes de volume) :

| | avant | après |
|---|---|---|
| semaines au-dessus du plafond de temps DUR que C26 déclare | **1 095 (15 %)** | 0 hors tolérance |
| pire cas | **112 min chez un DÉBUTANT** (plafond 25) | 6 min au-dessus de 60, dans la tolérance |
| semaines au-dessus de 35 % de temps MODÉRÉ | 2 sur 7 356 | 2 sur 7 356 |

La règle punissait donc la grandeur inoffensive et ne regardait jamais la dangereuse. Le pire
cas est le profil que C26b décrit lui-même comme limité par son **tissu conjonctif** — celui qui
ne prévient pas avant la tendinopathie.

C'est la leçon d'**O-12** payée une seconde fois : `bk.rp`, `bk.ss`, `rn.mara` sont MODÉRÉS, et
les mettre dans le même sac que la VO2max fait dire à une mesure autre chose que ce qu'on croit
lire. Mon erreur R19.4 venait de là ; ici c'était l'auditeur qui la portait depuis l'origine.

### Deux invariants au lieu d'un

- **C26c** — le temps DUR hebdomadaire ne dépasse pas `hardTimeCapMin()` (le plafond que
  C26/C26b déclaraient déjà : 60 min, 35 en reprise, 25 chez un débutant, ×0,6 sous blessure),
  à une tolérance de ×1,1 près — le temps dur se quantifie par répétitions, exiger la minute
  exacte ferait retirer une répétition entière pour deux minutes d'écart.
- **C26d** — le modéré a sa PROPRE borne, plus large (40 %), et c'est délibéré : il coûte peu en
  récupération centrale et beaucoup moins en charge tissulaire, donc il n'a pas à partager le
  plafond du dur ; mais une semaine majoritairement modérée est la zone grise que le manifeste
  refuse. La borne est posée **au-dessus** de ce que le moteur produit aujourd'hui (2 semaines
  sur 7 356) : elle existe pour empêcher une dérive future, pas pour valider l'état présent.
  Une borne calibrée au ras du comportement actuel se contente de photographier ce qu'elle juge.

Les deux se mesurent **par semaine**, pas en moyenne de plan : deux semaines à 20 et 100 min ont
la même moyenne qu'un plan sage à 60, et ce n'est pas le même plan.

### La coupe : par RÉPÉTITIONS, jamais par durée de répétition

`enforceHardTimeCap()` tourne au point de convergence, avant le point fixe C22. Elle retire des
répétitions en commençant par la séance qui porte le plus de temps dur — écorner la plus grosse
coûte moins à la structure que d'écorner trois séances pour le même total.

C'est la leçon d'**I14** sur un autre axe : dans un bloc d'intervalles, la durée de la répétition
EST le stimulus. Un 5×4 min à VO2max ramené à 5×2 min n'entraîne plus rien et porte encore son
nom. Le nombre de répétitions, lui, est le dosage.

Deux exceptions nommées : un bloc CONTINU (une répétition unique — seuil tenu) n'a pas de dosage
à retirer, on le raccourcit jusqu'à un plancher de 8 min ; en dessous, la séance est **déclassée
en endurance** plutôt que de garder son nom sur un contenu qui ne le porte plus (arbitrage C13d).
Ma première écriture PRÉFIXAIT le nom et produisait « Endurance nage seuil (+dist) » — une séance
qui se contredit dans son propre titre. Le nom est remplacé : une séance déclassée n'est pas
l'ancienne avec un adjectif, c'est une autre séance.

Résultat : **314 séances déclassées sur 648 plans** (≈ 0,5 par plan), **aucun plan ne perd toute
sa qualité** (le piège d'O-12, vérifié explicitement), part de temps facile médiane 83 % → **86 %**.

`zoneClass()` est exporté de `loadModel.ts` : le générateur doit reconnaître un bloc dur, ce que
`intensitySplit` savait déjà faire. Recopier la liste des suffixes aurait donné deux définitions
du mot « dur » dans le même moteur — le défaut O-11 exactement, et il n'y a aucune raison de le
refaire en le voyant venir.

### Ce que C26c a débusqué : `audit:v1` mesurait le générateur MORT

`loadV1()` charge bien le bundle V2 et **lève** s'il n'y arrive pas — c'est le correctif de la
série « mesures rendues honnêtes ». Mais il appelait ensuite `buildPlan` du HTML, qui est un
**wrapper** : il tente `EBV2.buildPlan`, **attrape toute exception** et retombe sur
`buildPlanLegacy`. Un refus d'entrée typé — le contrat R11, celui qui dit « ce format n'existe
pas » — était donc avalé.

`SPORTS.run.formats` du HTML gelé contient encore `trail`, sorti de `run` depuis R7 : **27 des
486 combinaisons** de `audit:v1` mesuraient le générateur legacy en croyant mesurer le produit.
Personne ne l'avait vu parce que le legacy satisfaisait toutes les règles auditées jusqu'ici ;
C26c est la première qu'il ne satisfait pas, et c'est elle qui l'a révélé.

Le harnais appelle désormais le moteur DIRECTEMENT, et un refus typé est un **comportement** —
compté et affiché, comme au golden et au banc v7 — jamais une erreur et jamais un plan de repli.
`audit:v1` passe de 486 à **459 combinaisons auditées + 27 refus déclarés**.

## R20.5 — « l'allure course » à vélo n'a plus qu'une seule définition (O-11 fermé)

**Le défaut.** Le moteur portait DEUX définitions du même effort, et la zone d'entraînement
était la plus dure des deux :

| source | « allure course » vélo |
|---|---|
| `ZDEF["bk.rp"]` — la zone prescrite à l'entraînement | **0,80–0,88 × FTP, du sprint à l'Ironman** |
| `TRI_BIKE["Full"]` — la cible du jour J | **0,70–0,76 × FTP** |

Sur un Ironman, une séance nommée « Rappel race-pace » faisait rouler **~15 % au-dessus de
l'intensité que le moteur prescrit lui-même pour la course**. Sur un sprint, l'inverse : la
séance était plus FACILE que la course (0,80–0,88 contre 0,85–0,93). Une zone figée ne peut pas
décrire un effort dont la durée va de trente minutes à six heures.

### (1) Un seul point

`raceBikeBand(sport, format)` : les trois tables de puissance de course (`TRI_BIKE`,
`DUA_BIKE_POWER` × pré-fatigue, `BIKE_POWER`) y convergent, et `bk.rp` la lit — **relief
compris**, par le même résolveur de parcours que la prédiction (R15.2). Un seul point de
substitution (`zoneOf`) traversé par les trois lecteurs de zone : une substitution faite dans
deux d'entre eux aurait été une troisième définition.

| FTP 230 W, plat | avant | après |
|---|---|---|
| tri/S | 184–202 W | **196–214 W** |
| tri/70.3 | 184–202 W | **175–191 W** |
| tri/Full | 184–202 W | **161–175 W** |
| duathlon/PM | 184–202 W | **154–171 W** |
| bike/cyclo | 184–202 W | **168–191 W** |

### (2) Le plancher de temps facile mesurait le mauvais rapport

`easyShareFloor` vaut `1 − plafondDur / minutesHebdo` : dérivé du plafond de temps DUR, et de
lui seul, il décrit `facile / (facile + dur)`. Il était comparé à `facile / (facile + modéré +
dur)` — une formule à deux seaux confrontée à une mesure sur trois. **Erreur d'unité**, même
espèce qu'O-13.

Mesuré sur un tri/70.3 confirmé/débutant : **70 % facile · 27 % modéré · 3 % DUR**, refusé par
une règle dont la justification écrite est de borner le travail dur. Le même plan vaut **96 %**
sur le rapport que la formule décrit. Le modéré n'est pas libéré pour autant : **C26d** (R20.4)
le borne pour lui-même. La question ouverte d'O-11 — « pyramidal ou polarisé ? » — se dissout :
le plancher gouverne la polarisation (facile vs dur), C26d gouverne la pyramide (le volume de
modéré). `easyShare` (facile / tout) continue d'être calculé et exposé tel quel : c'est ce que
le dashboard montre à l'athlète. **On change ce sur quoi on juge, pas ce qu'on montre.**

### (3) Le tiers à allure course, là où il veut dire quelque chose

Un seul critère gouverne deux décisions : la bande de l'épreuve. Au-dessus de **0,85 × FTP**
(bas de la zone seuil de Coggan), « l'allure course » est une intensité qu'on SURVIT — elle
compte alors DUR (`zoneClass` lit la bande) et le tiers ne se construit pas : sur un sprint le
segment vélo dure vingt minutes, et les séances de qualité portent déjà ce stimulus. En dessous,
c'est une allure qu'on TIENT, et l'apprendre pendant des heures est l'objet même de la séance.

| vélo du brick, semaine de pic | |
|---|---|
| tri/S · tri/M | `bk.z2` seul |
| tri/70.3 | `bk.z2` 120 min + **`bk.rp` 60 min @ 175–191 W** |
| tri/Full | `bk.z2` 200 min + **`bk.rp` 100 min @ 161–175 W** |

### Trois choses trouvées en le construisant

1. **Le rendu ne montrait pas le second bloc.** Il lisait le PREMIER leg vélo et ajoutait, en
   dur, « dernier tiers @ allure course » — sans chiffre. C'est exactement le trou que R19.5 a
   fermé côté structure, resté ouvert côté texte : une intensité annoncée par une phrase. Le
   texte affiche désormais les deux blocs avec leur puissance, et la phrase en dur disparaît.
2. **La coupe et la mesure ne classaient pas pareil.** `enforceHardTimeCap` appelait
   `zoneClass` sans la bande : il ne trouvait jamais le bloc que l'auditeur comptait comme dur.
   Deux définitions du mot « dur » — le défaut O-11 reproduit à l'intérieur de son propre
   correctif, en une seule séance de travail.
3. **La borne du brick lisait un morceau de ce qu'elle nommait.** `brickCapViolations` prenait
   `steps.find(leg === "bike")` : le jour où le leg est coupé en deux, un brick conforme devient
   « trop court ». Elle SOMME désormais, et chaque bloc porte sa part des bornes du format.

## R20.6 — le banc d'invariants garde enfin (O-9 fermé)

`CLAUDE.md` annonçait « banc d'invariants vert sur ses 19 tests ». Il ne l'était pas, et ne
l'était pas avant R18 non plus. Quatre familles d'échecs vivaient sous une documentation qui les
niait — la forme la plus coûteuse de dette : elle ne se signale pas, et elle rend fausse la
phrase qui la cite.

**Le mécanisme du silence, et c'est lui le vrai défaut** : le banc sortait en code 0 quoi qu'il
trouve, **et il n'était pas en CI**. Un rapport que rien ne lit vaut zéro.

### Trois invariants périmés — la course objectif n'est pas une séance d'entraînement

| id | échecs | ce qu'il mesurait vraiment |
|---|---|---|
| I6 | 54 | réclamait une durée non nulle ; le jour J porte `min: 0` **par conception** (R13.4) — c'est ce qui l'empêche d'être la victime de toutes les passes de coupe |
| I8 | 15 | comptait la course dans `sessions_max`, un budget d'ENTRAÎNEMENT : la course a lieu, elle ne se décide pas (le moteur l'exclut déjà, R15.7-A) |
| I12 | 3 | mesurait la dominance d'une sortie longue… dans la **semaine de course** : « Endurance allégée » 54 min sur 80 au total, sur un trail à petite enveloppe. Il n'y a pas de sortie longue dans cette semaine |

Les trois se corrigent dans le BANC, avec leur raison écrite. Aucune règle du moteur ne bouge.

### Un vrai défaut — I14, plus large que « le trail débutant »

« Marche rapide en montée (bâtons) » atteignait **295 min pendant que la « Sortie longue trail »
du même athlète est plafonnée à 180** (C23, débutant). La séance qui donne son nom à la semaine
n'était plus la plus longue — sur le sport où la sortie longue EST la séance de référence.

`enforceLabelVsDose` ne la réduisait pas : la 2ᵉ passe d'I14 (R14) interdit de toucher un bloc en
pente non répété, et son propre commentaire assumait le résidu (« un résidu mesuré vaut mieux
qu'une séance dénaturée »).

**Ce qui était interdit, c'était de changer la VITESSE ASCENSIONNELLE.** Raboter la durée en
gardant le D+ ferait gravir les mêmes 400 m en moins de temps — une vitesse que l'athlète ne
peut pas produire. Réduire durée **et** dénivelé du même facteur la laisse strictement
identique : c'est la même montée, plus courte. Troisième passe d'I14, plancher à 20 min, résidu
à zéro. Golden : **un seul profil change, de 5 minutes.**

### Puis le banc garde

Exit 1 sur le moindre échec (vérifié rouge en cassant un seuil), et **entrée en CI** — 22ᵉ gate.
**20 invariants × 54 configurations (7 sports × 3 enveloppes × 3 niveaux), 0 échec.**

L'ordre comptait : rendre bloquant un banc dont on n'a pas trié les échecs revient à figer la
dette au lieu de la traiter.

## R20.7 — la rampe de départ mord enfin en natation (O-13), et un gate qui dépendait du jour

### Le défaut : l'athlète et le moteur ne parlaient pas la même unité

Le nageur répond en heures de PISCINE. Le moteur compte la natation en heures DANS L'EAU
(`SWIM_TIME_FACTOR = 0,4` : les consignes, les départs et les temps d'arrêt ne sont pas du
volume d'entraînement). La rampe R10 comparait les deux — des euros à des dollars — et le
chiffre déclaré arrivait donc toujours au-dessus de la courbe.

| `vol_recent` déclaré | semaine 1, avant | après | pic, après |
|---|---|---|---|
| 0 h | 1,6 h | **1,3 h** | 1,6 h |
| 2 h | 1,6 h | **1,4 h** | 1,7 h |
| 5 h | 1,6 h | 1,6 h | 2,7 h |
| 10 h | 1,6 h | 1,6 h | 2,7 h |

Le comportement au-dessus de 5 h est INCHANGÉ, et c'est la vérification qui compte : un nageur
qui fait déjà cinq heures de piscine est au-dessus de la semaine 1 du plan. La rampe ne mord que
là où elle doit.

**Décision produit (fondateur)** : la question posée à l'athlète ne change pas. Lui demander de
retrancher ses temps d'arrêt serait lui demander un calcul qu'il ne peut pas faire. C'est au
moteur de convertir.

### Deux corrections que ce défaut a entraînées

1. **La chaîne d'explication de R20.2 souffrait de la même faute d'unité.** Elle comparait des
   baisses d'AVANT la conversion à des baisses d'APRÈS et annonçait « c'est ton historique,
   −5 h » pour un pic livré à 1,6 h — ces 5 h n'existent pas dans l'unité du chiffre affiché.
   Chaque baisse est désormais multipliée par le produit des facteurs qui la suivent.
2. **La rampe est devenue un MAILLON de cette chaîne.** Sur une prépa courte, un athlète qui
   repart de zéro n'a pas le temps de rejoindre la courbe : c'est la rampe qui décide du pic, et
   elle n'était nommée nulle part. `_rampCeilH` retient le plus haut plafond réellement imposé —
   `_rampCap` en fin de boucle vaut souvent `Infinity` et ne dirait plus rien.

### Ce que la CI a révélé : `audit:r14` dépendait du JOUR DE LA SEMAINE

En passant les gates, `audit:r14` est apparu rouge. Vérification faite, **le rouge n'était pas
dans mon diff** : le banc était déjà rouge au commit précédent — il l'était devenu en passant
minuit UTC pendant la session.

Ses dates sont des décalages sur `Date.now()`. Or le moteur compte les semaines entre le LUNDI
de l'ancrage et le LUNDI de la course (R8) : selon le jour où la CI tourne, le même critère
décrit un plan de N ou de N+1 semaines. Balayé sur les sept jours, moteur inchangé :

| critère | lundi → jeudi | vendredi → dimanche |
|---|---|---|
| `R14.3-B` (gain à J-10) | 2,6-2,8 % → **ROUGE** (seuil 2,5) | 2,3-2,4 % → vert |
| `R14.5-A` / `R14.5-B` (adhérence) | **ROUGE** | vert |

C'est la famille de défaut d'**O-1** (les six `race_date` du banc v7 tombaient toutes un
dimanche) : une dimension que la mesure ne contrôle pas et qui décide de son verdict.

Trois corrections, toutes dans le BANC :

- **l'ancrage passe au lundi de la semaine courante** — le banc reste relatif (il ne périme pas
  avec le temps) et devient déterministe sur la longueur de plan ;
- **`R14.3-B` porte sur le RAPPORT**, pas seulement sur une valeur absolue. Mesuré : le gain
  J-10 dérive de 2,3 à 2,8 % selon le jour, mais le rapport J-10 / J-60 reste à **0,40-0,45**.
  C'est lui que la règle énonce (« à l'approche de la course, le gain se réduit »). Le plafond
  absolu passe à 3 % — la plage réelle du moteur est 2,3-2,8 % pour un bénéfice d'affûtage de
  1,96 % et ~1,4 semaine de prépa encore devant ; 2,5 % était une marge choisie à l'écriture,
  pas une valeur mesurée. **Le critère est plus fort qu'avant : deux assertions au lieu d'une,
  et la principale est insensible au calendrier.**
- **`R14.5` reçoit un passé.** Les deux critères comparent des taux d'adhérence sur les 6
  semaines écoulées ; sans `plan_start`, le plan démarre la semaine COURANTE et la fenêtre est
  vide le lundi. Le commentaire de `markDone` décrivait déjà ce piège — il n'avait réparé que
  l'échantillonneur, pas la FENÊTRE. Le plan est désormais ancré huit semaines en arrière.

Vérifié : `audit:r14` est vert **les sept jours**, et les quatre autres bancs datés
(`r14.1`, `r15`, `r18`, `sensibilite`) le sont aussi — balayés de la même façon.

## R20.8 — l'acclimatation au froid n'occupe que les dernières semaines (O-15 fermé)

Sous 17 °C d'eau, le module verrouillait le second créneau facile sur une exposition au froid —
**de la première à la dernière semaine**. Le principe est juste (l'hypothermie est un risque
vital, la spécificité une priorité 5) ; c'est sa PORTÉE qui n'avait jamais été décidée.

L'adaptation au froid — vasoconstriction périphérique, réponse au choc thermique, tolérance du
réflexe inspiratoire — s'installe en quelques semaines d'exposition régulière et **se perd tout
aussi vite à l'arrêt**. Celle de la semaine 1 d'une prépa de 26 semaines ne vaut rien le jour J,
pendant qu'elle coûte de la spécificité toutes les semaines.

**Décision (fondateur)** : le verrou démarre à **8 semaines du jour J** ; avant, la bascule S13
reprend son droit et le créneau retourne à la discipline que l'épreuve demande.

Le calcul se fait en semaines RESTANTES, pas en phases : une prépa de 12 semaines et une de 40
n'ont pas les mêmes phases au même endroit, mais elles ont toutes les deux un « J-8 semaines ».
Sur une prépa plus courte que 8 semaines la condition est vraie partout — et c'est voulu, il n'y
a alors plus de marge à arbitrer.

8 semaines : au-dessus de la fenêtre d'installation décrite (2 à 6 semaines), avec la marge
d'une prépa réelle où l'on rate des séances. Le choix penche délibérément du côté long — c'est
une règle de sécurité, et une acclimatation trop courte coûte plus cher qu'une semaine de
spécificité en moins.

| | avant | après |
|---|---|---|
| profils sous le seuil de spécificité à 16 °C | **3 / 15** | **0 / 15** |
| séances d'acclimatation sur une prépa de 41 semaines | 51 | **10** |

### Ce que ça change pour l'instrument

L'exemption `S-MIX` du banc v7 (R20.3) existait parce que les 26 hits résiduels portaient tous
une eau froide. Mesurée en la désactivant, elle cache aujourd'hui **1 à 4 profils** (N = 250 /
400 / 600) contre 26 — et tous dans la fenêtre des 8 dernières semaines, c'est-à-dire là où le
verrou fait exactement son travail. L'exemption reste (l'instrument ne doit pas punir une règle
de sécurité, R16.10) et `S-MIX` garde son budget à 0, mais **elle est passée d'un angle mort à
une marge**.

## R20.9 — le créneau de repli (O-3 fermé), et la question posée n'était pas la bonne

O-3 demandait « quel créneau facile sert de repli, `facileR` ou `facile2` ». En regardant ce que
chaque créneau PRODUIT, trois défauts sont apparus, dont deux plus graves que le choix du slot.

### 1. Le repli du trail n'était pas une séance de repli

`easyFallbackSlot` est le créneau construit quand un jour DUR est déclassé — fatigue,
anti-collage, drapeau médical. En trail, `facileR` produit **« Marche rapide en montée
(bâtons) »** : une sortie avec dénivelé et renfo excentrique. Remplacer une séance de charge par
une autre séance de charge qui porte un nom rassurant, ce n'est pas un repli.

`facile2` produit « Footing récup ». Le trail bascule.

### 2. N jours déclassés donnaient N séances IDENTIQUES

Mesuré sous drapeau médical — le cas où tous les jours durs tombent d'un coup, et où le plan
doit être un plan de MAINTIEN :

| | avant | après |
|---|---|---|
| trail, semaine sous drapeau médical | **3 × « Marche rapide en montée »** | 2 × « Footing récup » + 2 × marche (35 min) |
| swimrun, idem | **4 × « Footing facile »** + 1 nage | 3 × footing + 2 × nage |

Sur le swimrun, dont la spécificité EST d'alterner nage et course, un plan de maintien livrait
quatre footings identiques. `applyWeeklyVariety` ne pouvait rien y faire : tous ces jours
portaient le MÊME créneau, elle n'avait aucune autre séance à piocher.

Le repli alterne désormais entre les deux créneaux faciles du sport, **le créneau déclaré
passant en premier** (c'est le choix du module, il garde la main). La variété n'est pas un
confort ici : un plan de maintien qui répète la même sortie est un plan qu'on arrête de suivre.

### 3. L'instrument suivait la déclaration, pas le plan

`measure:fallback` testait `d.slot === easyFallbackSlot`. En basculant le trail de `facileR` à
`facile2`, le taux affiché est tombé de **25,0 % à 0,0 %** — et sa ligne de verdict allait
fermer O-3 sur ce chiffre.

Vérifié en comptant sur N'IMPORTE QUEL créneau facile : **25,0 % avant, 25,0 % après, 1 287 jours
dans les deux cas.** La fréquence n'avait pas bougé d'un jour ; seule la séance produite avait
changé. Un instrument dont le verdict suit la valeur déclarée par le module mesure la
déclaration, pas le comportement — troisième occurrence de cette famille dans le chantier R20,
après `audit:v1` (R20.4) et l'ancrage calendaire du banc R14 (R20.7).

### Pourquoi l'entrée se ferme sur le CONTENU et pas sur la fréquence

25 % et 44 % de plans qui passent par un repli ne sont pas un défaut en soi : un jour dur
déclassé pour cause de fatigue ou de collage, c'est le moteur qui fait son travail. Le défaut
était ce que ce repli PRODUISAIT.

## N11 — le repos des heures d'entraînement n'est plus compté deux fois

Trouvé en préparant le dossier de relecture diététique (H-3) : pour écrire ce que chaque règle
calcule, il a fallu refaire les calculs à la main. C'est de l'arithmétique, pas de la diététique
— et c'est pour cette raison que la correction n'attend pas l'avis du professionnel.

### Le défaut

Deux grandeurs se sommaient dans `dailyEnergy()` :

- **`daily`** = BMR × NAP (1,35–1,55). Le NAP de la FAO/WHO/UNU est le rapport de la dépense
  **totale des 24 heures** au métabolisme de base. Il couvre donc déjà toute la journée.
- **`training`** = la somme des dépenses N7, calculées en **MET**. Un MET est par définition le
  métabolisme de repos (3,5 mL O₂/kg/min ≈ 1 kcal/kg/h) : une heure de course à 10 MET coûte
  10 × poids kcal, **dont 1 × poids que la personne aurait dépensés allongée sur son canapé**.

Le repos de chaque heure d'entraînement était donc compté une fois dans `daily` et une seconde
fois dans `training`.

| jour (75 kg, 180 cm, 35 ans, H) | avant | après | écart |
|---|---|---|---|
| repos | 2 190–2 770 | 2 190–2 770 | 0 |
| 1 h facile | 2 490–3 170 | 2 410–3 090 | −80 kcal (2,5 %) |
| 2 h moyenne | 2 790–3 570 | 2 640–3 420 | −150 kcal (4,2 %) |
| 5 h de sortie longue | 3 590–4 670 | 3 210–4 290 | −380 kcal (**8,1 %**) |

L'erreur croît avec le volume et **va toujours dans le sens qui gonfle la dépense**. Sur un écran
de nutrition, le sens compte autant que la taille : une dépense surestimée se lit comme une
autorisation, et l'athlète qui s'entraîne le plus était le plus mal servi.

### La règle

```
recouvrement = 1 kcal/kg/h × poids × heures d'entraînement
total        = daily + (training − recouvrement)
```

`REST_MET_KCAL_PER_KG_H = 1` porte sa provenance : ce n'est pas un coefficient d'ajustement,
c'est la définition du MET.

### Ce qui NE change pas, et pourquoi

**La dépense affichée pour UNE séance (N7) reste brute.** C'est la bonne réponse à « combien
coûte cette séance » ; le recouvrement n'existe que lorsqu'on additionne la séance à une journée
déjà comptée en entier. `training` reste donc la valeur brute dans la sortie.

**Le recouvrement est PUBLIÉ, pas retranché en silence** : `restOverlap` et `trainingNet`
s'ajoutent au contrat, la carte 🔥 affiche la ligne `− 90 kcal : le repos de ces heures-là est
déjà compté dans ta journée (un MET, c'est le repos)`, et la décision `N11` la motive. Une carte
dont les trois lignes affichées ne s'additionnent pas est une carte qu'on soupçonne — et
l'explication apprend au passage ce qu'est un MET.

### La garde

`demo:nutrition` (CI) portait une assertion qui **encodait le défaut** :
`total[0] === daily[0] + training[0]`. Elle est réécrite sur `trainingNet`, avec cinq critères
N11 : le recouvrement existe et vaut 1 MET × poids × heures, le net est strictement sous le brut,
un jour de repos ne retranche rien, la décision est tracée, et le total ne passe jamais sous la
journée seule. **Vérifiée rouge** en forçant `REST_MET_KCAL_PER_KG_H = 0` (2 critères tombent).

### Ce que le lot ne corrige PAS, délibérément

Le même passage en revue a montré que **les macros N10 sont en substance une cible d'apport** :
protéines 1,2–1,7 g/kg, lipides 20–35 % de l'énergie, glucides 3–10 g/kg sont toutes des
références d'APPORT dans leurs sources, et leur somme en kcal ne coïncide pas avec la dépense
affichée sur la même carte (55 kg : 1 235–2 200 contre 1 670–2 120 ; 95 kg : 4 135–7 410 contre
6 940–8 470). C'est la frontière que `CLAUDE.md` déclare bloquée par un avis diététicien, donc
rien n'a été touché : la question part telle quelle au professionnel — « ces trois chiffres
sont-ils affichables sans encadrement, et si oui sous quelle forme ? »

## O-16 — l'estimation énergétique n'oppose plus « aucune » borne d'âge

Trouvé en rédigeant le dossier de relecture diététique, comme N11 : décrire ce qu'une règle
calcule oblige à refaire ses calculs.

### Le défaut

`dailyEnergy()` repose sur **Mifflin-St Jeor**, validée chez l'ADULTE, et sur le **NAP de la
FAO**, qui décrit une dépense d'adulte. Ni l'une ni l'autre ne s'applique à un organisme en
croissance. Le moteur ne leur opposait aucune borne :

| âge déclaré (52 kg, 162 cm, F, 1 h) | ce que l'écran affichait |
|---|---|
| **12 ans** | **1 750–2 480 kcal** · protéines 60–90 g/j |
| 15 ans | 2 010–2 560 kcal · protéines 60–90 g/j |
| 35 ans | 1 890–2 400 kcal · protéines 60–90 g/j |

À 12 ans l'âge sort même de la bande 14–90 de `basalRange` : le moteur retombait sur l'enveloppe
25–55 ans et produisait un chiffre **hors du domaine de son équation, sans le dire**. La garde
IMC ne voyait rien — l'IMC d'un adolescent de gabarit normal l'est aussi.

C'est le même angle mort que **R15.7-C** avait fermé côté FORMAT (un mineur ne peut plus générer
un plan Ironman). La règle croisait âge et format ; personne n'a rejoué le croisement sur l'écran
de nutrition, arrivé après. Troisième occurrence dans le dépôt de « la garde couvre là où le code
a été écrit, pas là où il sert » (R20.1).

### La règle

`MIN_AGE_FOR_ENERGY_ESTIMATE = 16`. La coupe porte sur l'**estimation journalière** (N8–N11 et
les macros) — **jamais sur le ravitaillement d'effort** (N1–N7). Un adolescent qui roule trois
heures a besoin de savoir quoi boire ; il n'a besoin d'aucun tableau calorique.

Refus seulement sur un âge **connu** et sous la borne : un âge absent n'est pas une preuve de
minorité, et couper dessus retirerait l'écran à des adultes qui n'ont pas rempli le champ. Même
forme que la garde IMC, qui ne refuse que sur des valeurs saisies.

C'est une décision produit, pas une conclusion de la littérature — la question 3 du dossier reste
posée au professionnel, et la borne est une constante qu'une réponse déplace en une ligne.

### Ce que la correction a débusqué : un motif que rien n'affichait

`bmiGuardNotice` porte son message d'orientation depuis l'audit v6, et son commentaire dit
« l'UI peut afficher ce message à la place ». **L'UI ne l'a jamais affiché.** `energyCardHTML`
montrait le même repli dans les trois cas de refus :

> Renseigne ton **poids** dans l'onglet 📋 Profil pour voir l'estimation.

Donc une personne dont le gabarit sort des bornes de validation — et, depuis ce lot, un mineur —
était renvoyée corriger une donnée qui n'était pas en cause. `energyRefusalNotice()` devient le
point unique (âge d'abord, IMC ensuite), exposé par `EBV2.energyRefusal` et lu par la carte 🔥.

Un garde-fou dont personne ne lit le motif est un garde-fou à moitié posé : c'est la forme d'O-9
(un banc dont personne ne lit le rapport) appliquée à un message d'interface.

### Les gardes

8 critères dans `demo:nutrition` (CI) : la coupe existe sous la borne, elle s'arrête à la borne,
l'âge inconnu n'est pas traité comme une minorité, le ravitaillement d'effort survit, le refus
nomme l'âge et **ne parle pas du poids**, le motif IMC est enfin lisible, l'absence de motif se
distingue du refus, et aucun refus ne contient de vocabulaire de restriction. **Vérifiés rouges**
en abaissant la borne à 0.

## U1–U7 — le premier contact (traversée côté usage)

Cinq corrections qui ne viennent d'aucun banc du moteur, mais d'une **traversée de la PWA comme
utilisateur** (`RAPPORT_TOUR_USAGE.md`), en 390×844 et 320×568. Leur point commun : **aucun des
22 gates ne les regardait**, parce qu'ils mesurent tous ce que le moteur PRODUIT — jamais ce que
la personne LIT, ni ce qu'elle attend.

### U1 — une séance antérieure au plan n'est pas une séance manquée

Le premier écran d'un plan créé à l'instant pouvait annoncer : « 🌿 **La vie a pris le dessus** —
trois séances sont passées ». Le plan démarre au lundi de la semaine en cours (R8/R9, décision
juste) ; `missedSessionsCheck` comptait tout jour passé non coché, sans distinguer « tu as
décroché » de « ton plan n'existait pas encore ».

Balayé sur les sept jours à date figée : **1 jour sur 7** (dimanche) avant, **0 sur 7** après.
La correction lit `plan_start`, qui portait déjà l'information ; sans lui, le comportement
d'origine reste le repli, donc aucun plan existant ne change.

C'est le point le plus grave du lot, et pas pour sa fréquence : toute la boucle de rétention R4
est construite pour ne jamais reprocher, et consoler quelqu'un qui n'a rien fait de mal est pire
qu'un reproche — ça se produit à la seconde où il accorde sa confiance.

### U2 — le nom du check-in suit l'heure, comme le salut

`greeting()` connaît l'heure depuis toujours (cinq états). La phrase qui le suivait disait
« point du **matin** » en dur, à cinq endroits : à 14 h l'écran affichait mot pour mot « Bon
après-midi C'est l'heure du point du matin. » Point unique `pointLabel()` — Point du matin /
du jour / du soir.

### U3 — le score d'audit n'est plus montré à l'athlète

Le titre affichait « score d'audit 70/100 ». Mesuré sur 30 profils : **médiane 100**, 3 sous 80,
et ces trois-là sont **les trois Ironman**, à tous les niveaux, avec **0 violation dure**. La
personne qui prépare l'épreuve la plus dure recevait la note la plus basse, pour un plan valide.

Le chiffre est juste (critères souples, bas parce qu'un Ironman sature les plafonds) mais un
score sur 100 ne se lit que comme une note, et l'athlète n'a rien à en faire : la question « ce
plan est-il suivable » est tranchée par les violations DURES, listées juste en dessous. Le score
reste dans `plan._v2.score` pour le développement.

### U4 — le ⇄ d'échange de jours atteint le minimum tactile

18 × 14 px au rendu, quand la WCAG 2.5.8 pose 24 × 24 en minimum. C'est le geste introduit pour
réparer une semaine qui ne tombe pas bien — donc un geste qu'on fait quand on est déjà contrarié.
`.swapBtn` reçoit le traitement de `.doneBtn` : discret à l'œil, **44 × 44 au doigt** via un
`::after` invisible.

### U7 — la séance n'attend plus la météo

`applyReadinessSnap` faisait `await fetchWeather()` **avant** de calculer la séance, et
`fetchWeather` attend la géolocalisation (`timeout: 3000`) : **3 262 ms** d'écran « ta séance
arrive… » après la dernière réponse, chaque matin, pour une donnée d'appoint.

On ne retire pas la météo (manifeste §6) et on ne réduit pas le timeout — un vrai téléphone met
parfois deux secondes à se localiser. `primeWeather()` la lance **à l'ouverture du diaporama** :
l'athlète répond à trois questions pendant ce temps. **3 262 ms → 782-957 ms**, zéro comportement
changé.

### La garde

`tests/e2e/smoke-usage.mjs` — **14ᵉ suite E2E**, 9 assertions. U1 balaie les **sept jours de la
semaine** à date figée : la fenêtre dépendait du jour, donc six jours sur sept un test l'aurait
ratée (même leçon que le banc R14 en R20.7). **Vérifiée rouge** en réintroduisant les cinq
défauts : 5 échecs sur 9.

### Deux constats initiaux qui étaient FAUX

Ils sont laissés écrits dans le rapport plutôt qu'effacés, parce qu'ils sont de la même famille
que les trois instruments démasqués en R20 — **une mesure qui porte sur une grandeur voisine de
celle qu'elle nomme** :

- **la coche ○ n'a jamais été trop petite** : elle porte un `::after` en `inset: -9px` depuis son
  écriture, donc 44 × 44 au doigt. Mon instrument lisait le `getBoundingClientRect()` du bouton
  seul — d'où aussi les « 220 contrôles sous 44 px » de mon premier comptage, un artefact ;
- **les 3,2 s n'étaient pas une temporisation** : j'avais conclu « délai fixe » de ce que la
  mesure était identique hors ligne et avec un réseau bloqué. L'absence de tout appel réseau
  aurait dû me mettre en alerte — s'il n'y a aucun appel, c'est que rien n'est jamais parti. La
  cause était l'`await` sur la géolocalisation, et mon test « hors ligne » n'a donc pas testé ce
  qu'il prétendait.

Trois faux constats sur sept. La leçon centrale de R20 vaut aussi quand c'est moi qui tiens
l'instrument.

## U9 + U10 — la fin du plan

Troisième traversée côté usage (`RAPPORT_TOUR_USAGE.md`), sur l'autre extrémité : affûtage,
semaine de course, veille, jour J. Le moteur y avait beaucoup travaillé (R13.4, R15.7-A/B,
R19.3) ; personne n'avait regardé les écrans.

**Ce qui marche** : les trois bandeaux de fin tombent au bon jour et disent ce qu'il faut
(« ✂️ L'affûtage commence… ne rajoute rien », « 🎉 Veille de course… des jambes fraîches »,
« 🏁 Jour de course… départ prudent, finis fort »).

### U10 — la relance ne s'éteignait jamais

L'en-tête de `notifications.js` promet, depuis son écriture, « **UNE seule fois, jamais de
rafale** ». `relanceSent` ne gardait que la NOTIFICATION ; le bandeau était recalculé à chaque
rendu.

| | avant | après |
|---|---|---|
| premier → dernier affichage | J+7 → **J+70** (64 jours) | J+7, puis silence |
| jours affichés (16 échantillonnés) | **14** | **1** |
| veille de course · jour J | oui · **oui** | non · non |

Le matin de sa course, l'athlète lisait le bandeau de course suivi de « 🌿 La vie a pris le
dessus — trois séances sont passées ». Même famille qu'U1 — la boucle de rétention retournée
contre celui qu'elle protège — au pire moment disponible.

**La clé est le PREMIER jour du décrochage, pas le dernier.** C'est tout le correctif : le
dernier change chaque jour, donc y indexer un « déjà montré » ne dampait rien. Avec le premier,
la clé reste stable tant que l'athlète ne reprend pas → un message par ÉPISODE.

**U10b** : jamais la veille ni le jour d'une course (R13.4 — le jour J n'est pas un jour
d'entraînement).

**Vérifié dans les deux sens**, parce qu'un correctif qui éteint le message à vie serait pire que
le défaut : épisode 1 à J+7 → silence → cinq jours de séances validées → **épisode 2 à J+22**.

### U9 — le refus nomme ce que l'athlète a demandé

Le refus « course trop proche » est le moment le plus honnête du produit : il décline une
préparation pour ne pas blesser, explique le minimum requis, propose deux issues, conserve le
profil, et offre « Corriger ma réponse » / « Réessayer ». Sa dernière phrase était écrite en dur :

> Te vendre une préparation **d'Ironman** en un mois serait te mentir, et te blesser.

**9 refus sur 9**, sur les sept sports. Un nageur qui prépare un 1500 m, un coureur qui prépare
un 10 km. La crédibilité d'un « non » tient à ce que la personne se reconnaisse dans ce qu'on lui
refuse.

Elle devient : « Te vendre **cette préparation** en 3 semaines serait te mentir, et te blesser. »
**Aucune table de libellés n'est créée ici** — les noms lisibles des formats vivent dans
`config.js`, côté UI ; en dupliquer une copie dans le schéma ferait deux sources de vérité pour
la même chose, ce que R11.1 interdit explicitement.

**U9b** : plus de « viser un format plus court » proposé à qui a déjà le plus court du sport
(`tri/S` mesuré) — le message dit alors « Une seule issue : viser une course à partir du … ».

### Les gardes

`U9` entre au banc v6 (9 sports balayés) ; `U10` entre dans `smoke-usage` (quatre jours
échantillonnés après le décrochage, exactement un affichage attendu). **Vérifiés rouges** en
réintroduisant chaque défaut — U10 remonte à 4 affichages sur 4, U9 redevient une régression.

## O-17 — informer plutôt que bloquer : la règle qui tranche cette famille de choix

### Le principe (décision du fondateur, 02/08/2026)

> « Notre rôle est d'informer au mieux et de laisser l'athlète choisir entre son besoin de
> résultats ou de sécurité. Le but n'est jamais de bloquer mais d'accompagner au mieux, **sauf
> si réelle mise en danger**. »

Cette phrase gouverne une famille entière de décisions, pas seulement O-17. Elle sépare deux
choses que le moteur mélangeait jusqu'ici implicitement :

**Ce qui BLOQUE — la « réelle mise en danger ».** Ces garde-fous restent durs et ne se
négocient pas : drapeau médical (plan de maintien), drapeau douleur (qualité verrouillée),
mineur × format (R15.7-C), garde IMC (E4), borne d'âge de l'estimation énergétique (O-16),
course trop proche (R11.4), bornes physiologiques (E3). Leur point commun : l'athlète ne peut
pas évaluer le risque, ou le coût de l'erreur est irréversible.

**Ce qui INFORME — tout le reste.** Un risque réel, compréhensible, dont l'athlète peut peser
le coût contre ce qu'il vient chercher. Le moteur explique, nomme le mécanisme, et laisse
décider. Canal 2 de R11.2 (`warnings`).

Le coût de se tromper de catégorie est symétrique et il faut le dire : brider un athlète capable
n'est pas neutre — c'est le plan qu'il quitte pour s'entraîner seul, sans aucun garde-fou. La
régularité est priorité 3 du manifeste, pas priorité 7.

### Le cas qui l'a fait écrire

Ancien sportif de haut niveau (sélection nationale junior), cinq ans sans rien, première course à
**5'30/km sur 13 min terminée à 185 BPM**, puis **46'30 au 10 km en 8 semaines**.

Moteur musculaire et neuromusculaire conservé, système aérobie à zéro, tissus conjonctifs qui
n'ont rien encaissé depuis cinq ans. Mesuré — deux profils déclarant tous deux `vol_recent = 0` :

| | semaine 1 | séance de seuil |
|---|---|---|
| capacité réelle (seuil 5'45) | 4 séances · **118 min** | **@ 5'45-6'02/km** |
| vrai débutant (seuil 7'00) | 4 séances · **118 min** | @ 7'00-7'21/km |

Le VOLUME est bien protégé — la rampe R10 lit le volume récent, nul dans les deux cas.
L'INTENSITÉ, elle, suit la capacité mesurée sans rien savoir de l'historique de charge. Et rien
n'arrête cet athlète, puisqu'il en est physiquement capable : c'est le patron de blessure le plus
fréquent de la reprise chez l'ancien sportif.

### Le déclencheur ne pose aucune constante nouvelle

`history = "ancien"` existe dans le schéma, et **R14.1 l'a délibérément dépouillé** de tout
pouvoir sur les chiffres — « un adjectif auto-déclaré ne pilote aucun chiffre ». On ne le
réhabilite pas. On croise deux MESURES déjà collectées :

- **volume récent ≤ 2 h/sem** (R10, obligatoire) ;
- **une référence saisie plus rapide que l'ancre la plus lente de sa discipline**, lue par
  `margeOf` : cette fonction rend 1,0 à quelqu'un assis sur cette ancre — le repère « débutant »
  du modèle. Être plus rapide, c'est avoir une capacité au-dessus de ce repère, **par
  définition**. On réutilise la table de R14.1 au lieu d'en poser une seconde (R11.1), et on
  hérite gratuitement de son décalage par sexe et par âge.

### La preuve que ce n'est pas un blocage déguisé

**Golden : 15 profils sur 900 changent, et le SEUL champ qui diffère est `_v2.warnings`.** Pas
une séance, pas une minute. Le message s'ajoute, il ne retire rien.

Garde `O17` au banc v6, qui assertе les DEUX moitiés de la décision : l'avertissement existe pour
qui en a besoin (et pas pour les autres — vrai débutant, coureur régulier, reprise douce : aucun),
le message rend explicitement la décision à l'athlète, il n'ordonne pas, **et le plan ne rétrécit
pas**.

Débusqué en écrivant cette garde : ma première assertion exigeait l'ÉGALITÉ des volumes entre le
profil capable et le témoin. Fausse — 107 min contre 92 — parce que les bornes de séance se
calculent depuis l'allure. Le risque à garder n'est pas « le plan change », c'est « le plan
RÉTRÉCIT ».

## P11 — le régime débutant entre dans la prédiction livrée, et le piège du zéro se ferme

Le modèle de gain de R14/R14.1 n'avait qu'un seul régime : celui de l'athlète **entraîné**. Sa
constante de tête pour la course, `G_PLAFOND.thrPace = 0,15`, vient de Barnes & Kilding 2015 —
qui mesure ce que gagne l'**économie de course**, c'est-à-dire le raffinement à la marge d'un
geste déjà acquis. Les premiers mois de quelqu'un qui part de zéro ne sont pas ce phénomène :
c'est du débit cardiaque, de la capillarisation, de la densité mitochondriale et l'apprentissage
d'un geste. Pas le même phénomène, donc pas la même borne.

### Le déclencheur, et pourquoi il ne calibre PAS le modèle

Un cas réel rapporté par le fondateur : première sortie de 13 min à 5'30/km terminée à 185 BPM,
puis **46'30 au 10 km huit semaines plus tard**, en partant de zéro course — sur un passé de
sportif de haut niveau (sélection équipe de France junior) après cinq ans d'arrêt.

Ma première écriture visait à faire entrer ce chrono dans la fourchette basse : `thrPace = 0,35`,
cap absolu 0,42. Mesuré : **32,1 % de gain projeté sur 16 semaines**. Un tiers de son allure
seuil en quatre mois, affiché à tout le monde. Retirée, parce que la méthode est fautive —
calibrer sur UN cas, et le plus favorable qui soit. **HERITAGE** (Bouchard, 483 sujets, programme
identique) dit précisément pourquoi : 7 % des sujets gagnent ≤ 0,1 L/min et 8 % ≥ 0,7 L/min ; la
variabilité inter-individuelle EST le phénomène. Un modèle calé sur le 92ᵉ centile promet à tout
le monde ce qu'un sur douze obtiendra, et l'athlète à qui on l'a promis ira chercher la différence
dans la charge — priorité n°2 du manifeste.

Le cas réel reste donc **dehors** : depuis 6'30/km à 8 semaines, le modèle projette aujourd'hui
53'14 – 1 h 04 là où il autorisait 1 h 01 – 1 h 05. Le défaut corrigé n'est pas « le modèle ne
prédit pas cet athlète-là », c'est « le modèle applique un plafond d'entraîné à quelqu'un qui n'en
est pas un ».

### La règle

`regimeDebutant(volRecentH)` rend une position dans le régime — **0 = entraîné, 1 = part de
zéro** — interpolée linéairement entre `RG_VOL_ENTRAINE_H = 4` et `RG_VOL_DEBUTANT_H = 1,5`
h/semaine. Trois grandeurs suivent cette position, chacune interpolée, **jamais à seuil franc** :

| grandeur | entraîné | débutant | pourquoi |
|---|---|---|---|
| plafond de discipline | `G_PLAFOND` | `G_PLAFOND_DEBUTANT` (thrPace 0,25 · ftp 0,32 · css 0,30 · vam 0,27) | pas le même phénomène physiologique |
| constante de temps τ | 20 semaines | 9 semaines | le gain du débutant est bien plus précoce |
| plafond absolu | `GAIN_MAX_ABSOLU` | 0,32 | celui de l'entraîné a été écrit pour l'entraîné |

**Le déclencheur est MESURÉ, pas déclaré** — c'est toute la leçon de R14.1, qui a dépouillé
`history` de son pouvoir sur les chiffres. Le régime se lit sur `vol_recent`, une donnée que le
questionnaire collecte déjà et rend obligatoire (R10). Quelqu'un à 0-2 h/semaine depuis des mois
EST un débutant au sens de la physiologie, quoi qu'il coche par ailleurs.

**Statut des constantes.** `thrPace = 0,25` est une borne DÉCLARÉE, pas une mesure : ordre de
grandeur cohérent avec « VO2max +15 à 25 % chez le sédentaire sur 8 à 12 semaines », majoré de ce
que gagnent l'économie et le geste depuis une base basse. Les trois autres reprennent le même
rapport. Même statut assumé que les bandes de marge course et nage de R14.1, et le code le dit.

### Le piège du zéro, sur TOUT le chemin

Le régime ne servait à rien tant que le zéro n'atteignait pas le modèle. Il était effacé **deux
fois**, à deux maillons différents :

1. `src/app/bridge.ts` — `parseFloat(String(answers.vol_recent || "")) || null` : « je ne
   m'entraîne pas du tout » arrivait au projecteur comme « je n'ai pas répondu ». C'est celui qui
   se voyait à l'écran. Mesuré avant correction, 10 km à 16 semaines depuis 7'00/km :
   **0 h → 7,43 % de gain, 1 h → 8,55 %**. Déclarer zéro donnait moins que déclarer une heure.
2. `volumeFactor()` — le test était `volRecentH > 0`, donc le facteur volume disparaissait pour
   exactement la population dont le plan multiplie le volume le plus. Défaut **latent** : sur le
   chemin livré, le zéro n'arrivait même pas jusque-là. Il aurait mordu dès la correction du pont.

C'est le piège que **R20.1** avait nommé sur la rampe R10 (« le piège du `|| undefined` sur un
zéro »). La leçon utile n'est pas « corriger le piège » mais **le corriger sur tout le chemin** :
une valeur légitime effacée à n'importe quel maillon est effacée pour de bon. Point unique
`readNumber()` dans le pont, qui sait que zéro est une réponse.

### Mesures (prédiction livrée, 10 km, allure seuil 5'45/km sauf mention)

| profil | avant | après |
|---|---|---|
| 7'00 · 0 h · 16 sem | 7,43 % | **21,50 %** |
| 7'00 · 1 h · 16 sem | 8,55 % | 21,50 % |
| 5'45 · 0 h · 16 sem | 6,90 % | 19,97 % |
| 5'45 · 0 h · 8 sem | 4,13 % | 14,15 % |
| 5'45 · 2 h · 16 sem | 7,94 % | 16,81 % |
| 5'45 · 4 h · 16 sem | 5,18 % | **5,18 %** |
| 4'30 · 6 h · 16 sem | 3,02 % | **3,02 %** |
| 4'00 · 10 h · 16 sem | 2,05 % | **2,05 %** |

Au-delà de 4 h/semaine, **rien ne bouge, au chiffre près** : le modèle publié s'applique tel
quel. **Golden : 900 profils, 0 écart** — la projection ne touche aucune séance.

### Les gardes (banc `audit:r14.1`, P11-A à P11-F)

Elles assertent les **deux moitiés**, pas une seule — une garde qui ne vérifierait que « le
débutant gagne plus » laisserait passer une régression sur l'entraîné, et c'est exactement la
forme de défaut que R20.1 a nommée.

- **P11-A** : déclarer 0 h ne projette jamais moins que déclarer 1 h (l'inversion).
- **P11-B** : au-delà de 4 h/sem, plateau strict (4 h = 6 h = 10 h) et sous le plafond publié.
- **P11-C** : décroissance monotone sur dix paliers, aucun saut relatif > 40 % (une bascule d'un
  modèle à l'autre en ferait ~75 %). La borne vise le seuil franc, **pas** le comportement actuel
  — une borne posée au ras de ce que le moteur produit ne fait que le photographier (leçon C26d).
- **P11-D** : partir de zéro projette ≥ 2× l'entraîné — sinon le régime ne sert à rien.
- **P11-E** : le gain du débutant est précoce (rapport 8/16 sem 0,709 contre 0,598).
- **P11-F** : le plafond absolu tient, aucun gain > 32 %.

**Vérifiées rouges** contre le moteur d'avant P11 : A, C et D échouent (3 sur 6). B, E et F
passent des deux côtés — B est une non-régression par construction, F une borne.

### Le prototype cesse de porter sa propre copie

`src/engine/feasibility.ts` avait écrit le régime en local, sous portée limitée (« un prototype
apprend, le produit ne change que sur décision »). La décision prise, il **importe** désormais les
constantes de `projection.ts` et n'en garde aucune copie — R11.1 / R20.5 / U9. Deux tables
identiques dans deux fichiers, c'est la garantie que le jour où la calibration bouge d'un côté,
l'autre répond encore l'ancien chiffre ; et ce serait le **diagnostic**, celui qu'on lit AVANT de
s'engager, qui mentirait.

## RV — le raisonnement inverse : une épreuve, un chrono visé, un verdict

Le moteur construit **en avant** : d'où tu pars (rampe R10), jusqu'où la courbe peut monter.
Ce module prend le problème par l'autre bout — une épreuve, un chrono visé — et déroule à
reculons ce que ça EXIGE, jusqu'à aujourd'hui.

### Ce qu'il ne fait pas, et c'est sa raison d'être

**Il ne construit AUCUN plan et ne touche à AUCUN plafond.** Le chrono visé n'entre dans aucune
entrée de `buildPlan` : le plan est construit d'abord, la carte le lit, le verdict s'écrit
par-dessus. Tout R14/R14.1 existe pour que la performance soit une **sortie estimée** et jamais
une cible qui construit — P6 le résume : « le temps se projette, l'intensité s'ancre ». Laisser
un objectif de temps augmenter une charge, ce serait la priorité n°5 du manifeste qui écrase les
quatre premières, et c'est très exactement ce qu'un athlète motivé ferait à notre place si on lui
en donnait le bouton.

Deux gardes mesurent cette propriété, à deux niveaux :
- `RV-INVARIANT` (`npm run demo:faisabilite`, **23ᵉ gate CI**) — le plan émis par le moteur est
  identique **au bit près** avec et sans `target_time`.
- `RV-UI-B` (`tests/e2e/smoke-feasibility.mjs`, **15ᵉ suite E2E**) — le plan **affiché** ne bouge
  pas d'un caractère quand le chrono est saisi. C'est par l'écran qu'un défaut arriverait
  réellement, et c'est la forme de trou que R19.1 a laissée passer (la garde vérifiait que le
  champ existe, jamais qu'il agissait — ici, jamais qu'il **n'**agissait **pas**).

### Aucun modèle nouveau

Chaque étape **inverse** un modèle déjà sourcé et déjà audité. Un second modèle de performance
serait un second jeu de vérités, ce que R11.1, R20.5 et U9 interdisent partout ailleurs.

| étape | ce qu'elle rend | modèle inversé |
|---|---|---|
| RV1 | allure seuil requise le jour J | Riegel, exposant piloté par le volume (P5), inversion en forme close |
| RV2 | écart à combler, en % | comparaison à l'allure seuil MESURÉE |
| RV3 | gain maximal du profil (asymptote) | P2bis : `G∞ = plafond × marge mesurée × structure × volume`, régime P11 compris |
| RV4 | refus d'estimer | au-delà de ce qu'un CYCLE produit |
| RV5 | semaines nécessaires | saturation exponentielle en τ (P11 : τ suit le régime) |
| RV6 | verdict | `atteignable` · `juste` · `hors-horizon` · `hors-modele` · `indeterminable` |

### L'erreur que j'ai faite en l'écrivant, et qui vaut d'être gardée

Ma première version concluait « impossible **quelle que soit la durée de préparation** » — elle
lisait `G_PLAFOND` comme un plafond de **carrière**. Or sa provenance dit autre chose : Barnes &
Kilding 2015 mesure ce que gagne l'économie de course **sur un cycle**, et la projection
l'utilise sur l'horizon d'UNE préparation. Rien dans ce dépôt ne mesure « de combien cette
personne peut progresser, un jour ».

Mesuré avec la lecture fautive : un marathon de 4 h 01 visé en 3 h 30 sur 16 semaines — objectif
banal, atteint par des milliers de coureurs — sortait « impossible ». Sept cas sur neuf
sortaient ainsi. Un verdict faux **dans ce sens-là** est pire que pas de verdict : il décourage
quelqu'un dont l'objectif tient debout. La réponse honnête est celle que P7/P8 emploient déjà —
**refuser d'estimer, en disant pourquoi** (« ça se joue sur plusieurs saisons »), plutôt
qu'estimer mal.

### La carte

`endurabuild/js/ui/feasibility.js`, dans l'onglet 🗓 Plan, juste après « Pourquoi ce plan » — la
même question posée dans l'autre sens. La **saisie vit dans la carte**, pas au Profil : un champ
au Profil et un verdict trois onglets plus loin, c'est deux écrans pour une seule idée.

- **Champ optionnel.** Sans chrono, la carte se réduit à sa question ; le plan est déjà complet
  sans elle.
- **`target_time` est HORS `ANSWER_SCHEMA`**, au même titre que `pace` et `css` : le schéma ne
  connaît pas le type « durée », et lui en inventer un ferait payer à un champ d'affichage le
  prix d'une clé de schéma (validation dure, refus d'entrée typé) pour zéro séance pilotée. Il
  échappe donc aussi, légitimement, au balayage `audit:sensibilite` — dont la question est
  « cette clé agit-elle sur le plan ? », à laquelle la réponse doit ici être **non**.
- **`h:mm:ss` ou `mm:ss`.** `X:YY` est ambigu (« 46:30 » = 46 min 30, « 3:30 » = 3 h 30) : on ne
  devine pas, on **écarte la lecture hors domaine** — aucun format de course à pied du moteur
  n'est courable en moins de 10 minutes, donc une lecture mm:ss sous ce plancher n'en est pas
  une. Une seule des deux tient debout à la fois. Une saisie illisible le **dit**.
- **Course à pied seulement.** Ailleurs, `EBV2.feasibility` rend `null` — pas un verdict prudent,
  RIEN : une carte absente se comprend, un verdict tiède se croit. Riegel ne s'applique ni au
  trail (T-8) ni aux épreuves à enchaînements.

### Le critère qui garde l'instrument lui-même

`RV-UI-B` compare deux empreintes de l'écran et conclut « rien n'a bougé ». **Une empreinte
aveugle dirait exactement la même chose.** La suite change donc une réponse dont on sait qu'elle
déplace le plan (volume 6 h → 3 h) et exige que l'empreinte le voie. Sans ce critère, `RV-UI-B`
ne prouverait rien — c'est la leçon des trois instruments démasqués en R20 (`audit:v1`,
l'ancrage calendaire du banc R14, `measure:fallback`), appliquée d'avance.

## C28 / C29 / U11–U13 — le lot des trois relectures (coach, développeur, client)

Traversée du produit sous trois regards successifs, chacun mesurant ce que les 22 gates ne
regardent pas : ils vérifient tous ce que le moteur PRODUIT, jamais ce qu'un entraîneur
DÉFENDRAIT ni ce qu'une personne LIT.

### C28 — une course en milieu de semaine mettait 156 minutes à J-2

Le plus grave du lot. Marathon, dernière semaine, selon le jour du départ :

| jour J | jours | volume | % du pic | plus grosse séance |
|---|---|---|---|---|
| dimanche | 7 | 2,3 h | 23 % | 63' à J-6 |
| **mercredi** | **3** | **2,9 h** | **30 %** | **156' à J-2** |
| jeudi | 4 | 2,9 h | 30 % | 98' à J-3 |
| vendredi | 5 | 2,9 h | 30 % | 82' à J-4 |

Une cyclosportive un mercredi : **168 minutes deux jours avant le départ**. Sur 84 profils
balayés sur les sept jours possibles, **36 dépassaient 45 minutes à J-2**.

**Deux causes, et la seconde est la leçon.**

1. **Le plancher ne se proratisait pas.** N2 coupe la dernière semaine au soir du jour J : une
   course un mercredi laisse trois jours. Le plancher R15.7-A réclamait 30 % du pic sans
   regarder cette longueur, et il n'y avait que deux jours pour le porter, dont la veille
   plafonnée à 25 min. Le signe qui ne trompe pas : **la relation était non monotone** — trois
   jours portaient 2,9 h, sept jours 2,3 h. Plus la semaine est courte, plus elle est chargée.
   Correctif : prorata sur les jours d'entraînement réels, qui ne change **rien** à une course
   le dimanche — le cas de très loin le plus fréquent.
2. **Les plafonds de la fenêtre d'approche EXISTAIENT et arrivaient trop tôt.** N3/N4 borne
   J-1 à 25 min et J-2/J-3 à 62 — mais cette passe tourne pendant la construction, avant le
   plancher et avant la mise à l'échelle. Vérifié en bisectant : la séance de rattrapage était
   **créée à 30 min et ressortait à 156**. Elle n'était pas fabriquée trop grosse, elle était
   grossie après coup. **Onzième fois que ce dépôt paie la même leçon** (R13.6-A1 sur C22,
   R15.7-A sur ce plancher exact, I14 sur les garanties de séance) : une garantie vérifiée au
   milieu du pipeline ne vérifie que l'avant-dernier état. Le plafond ne se déplace pas, il se
   **rejoue au point fixe**.

**Résultat : J-2 max 168' → 63'.** Et un défaut voisin tombe avec : **la veille elle-même
dépassait sa borne** (36' mesurés contre 25 déclarés) — R13.4 fuyait par le même trou.

**Garde `I21`** (banc d'invariants, 7 jours de la semaine × 6 sports) — **vérifiée rouge** contre
le moteur d'avant : 10 échecs. Débusqué en l'écrivant : le banc annonçait « les **20**
invariants » alors que sa table en déclarait 22 — un compte écrit à la main qui ment dès qu'on
lui ajoute une ligne. Il est dérivé désormais.

### C29 — l'affûtage coupe la fréquence, que sa propre source dit de maintenir

Bosquet 2007, cité ici pour le +1,96 %, décrit **trois bras** : volume −41/−60 %, intensité
maintenue, **fréquence ≥ 80 %**. Seul le premier était vérifié. Mesuré : **médiane 75 %, 52 %
des profils sous 80 %**. La décroissance réduit désormais au lieu de supprimer quand le retrait
passerait sous ce plancher — **3 profils améliorés, 0 dégradé**.

**Partiellement traité, et c'est dit** : ma première hypothèse (la décroissance est la cause)
était fausse, le correctif l'a montré en ne bougeant aucun des 15 profils mesurés. Les jours OFF
viennent de deux autres passes adossées à R3.13. Entrée `O-19` au registre, avec ses chiffres.

### U11 — le jour où le plan est créé, on montre le plan

Mesuré côté client : **8 écrans, 30 gestes** pour finir le questionnaire — et le premier écran
affiché ensuite était le check-in, donc **trois questions de plus**. Le portillon est juste pour
qui REVIENT ; il est faux à la seconde zéro, et c'est cette seconde qui décide si la personne
reste. Même famille qu'U1 : une mécanique bonne au régime permanent, appliquée à un instant où
elle n'a pas de sens.

**Ce qui ne change pas** : le portillon lui-même. 🎯 Aujourd'hui demande toujours le point du
jour avant de montrer la séance. On change l'onglet d'ARRIVÉE, pas la règle — et seulement le
jour de la création.

Écrit faux du premier coup, et gardé écrit : mon test lisait `plan_start`, en commentant que
`ensurePlan()` l'avait déjà posé. Faux — `renderPlan()` fait `invalidatePlan(); renderTabs();`
et c'est `renderTabs` qui déclenche `ensurePlan`. L'ancre n'existe pas encore au moment du test.
La garde E2E est sortie rouge sur ses trois critères.

### U12 / U13 — la place et les mots

- **U12** : la carte « chrono visé » se replie tant qu'aucun chrono n'est saisi. L'onglet 🗓 Plan
  fait **7,7 écrans de défilement** sur un téléphone et cette carte y ajoutait **462 px (7 %)**
  pour une question optionnelle. Une fonctionnalité facultative ne coûte pas de place à ceux qui
  ne l'utilisent pas. Ouverte d'office dès qu'un chrono existe : replier ce qu'on vient de
  demander serait cacher la réponse.
- **U13** : le mot « premium » disparaît. Il fabriquait une objection commerciale que le produit
  dément deux lignes plus bas (« Gratuit — “premium” veut juste dire “plus poussé” »). Devient
  « l'essentiel » / « réglage fin », et « Tout est inclus — il n'y a rien à payer, ici ni
  ailleurs ».

### D1 / D2 — le développeur

- **D1** : un état illisible ne s'efface plus en silence. Testé en écrivant du JSON tronqué dans
  `eb_state_v2` : l'app repartait de zéro sans un mot **et le premier `ebSave` écrasait les
  octets d'origine**. Le chemin est atteignable — la restauration JSON du Profil fait d'un
  fichier édité à la main une entrée officiellement supportée. La copie part sous une clé datée.
  `ebSave` cesse aussi d'avaler tout échec d'écriture (Safari en navigation privée : l'athlète
  voyait ses ✓, rien n'était persisté).
- **D2** : `feasibility.js` cesse de redéfinir son échappeur et importe `esc` (R11.1) — la règle
  « jamais deux fois la même table », enfreinte dans le code qui venait de l'invoquer.

### Ce que ces relectures ont validé, et qu'il faut dire aussi

L'état hostile est bien traité : `pace: "<img src=x onerror=…>"` et `level: "martien"` produisent
un **refus typé en français clair**, zéro injection, zéro erreur JS. Le garde-fou de collision de
noms du bundle **mord** (vérifié en provoquant une collision). Les cibles tactiles tiennent le
44×44. La progression de fond des plans est saine (longue 72' → 180' sur 13 semaines, récup bien
placées, allures correctement dérivées du seuil).

## C29b / C29c — l'affûtage garde ses jours et les raccourcit (décision du fondateur)

**Décision du fondateur (03/08/2026)** : l'affûtage réduit le **volume**, pas la **fréquence** —
des jours plus courts, tous gardés. R3.13 (l'affûtage pèse au plus 60 % du pic) n'est pas
négociée : c'est la MONNAIE de la réduction qui change.

Bosquet 2007 et Mujika — la source déjà citée ici pour le +1,96 % — décrivent trois bras :
volume −41/−60 %, **intensité maintenue**, **fréquence ≥ 80 %**. Seul le premier était vérifié.

### Ce que j'ai cru, et ce qui était vrai

Trois hypothèses successives, deux fausses, chacune réfutée par la mesure :

1. « C'est la décroissance d'affûtage » → **faux**. C29 n'a bougé aucun des 15 profils mesurés.
2. « C'est le plancher de séance piscine » → **vrai, mais partiel** (C29b, nageur débutant
   33 % → 67 %). Trois blocs de suppression **identiques** dans le même fichier, et mon premier
   `grep` n'en voyait qu'un : le bundle en contenait trois.
3. « Ce sont les deux passes R3.13 » → **vrai, et c'est le gros** : 76 des 95 jours perdus
   portent le nom de cette coupe.

### C29c — la réparation au point fixe, neutre en volume

Les deux passes de retrait ont **raison au moment où elles s'exécutent** : la semaine dépasse
alors le plafond. Mais les passes suivantes réduisent encore, et le jour a été sacrifié pour
rien. Mesuré sur un semi : semaine d'affûtage livrée à **46 % du pic pour un plafond de 60 %,
avec deux jours coupés**. Forme exacte de C28 — une décision prise au milieu du pipeline sur un
état qui va encore changer.

On ne touche donc pas aux passes : on **rend les jours au point fixe**, et la restitution est
**neutre en volume** — on redonne des JOURS, les minutes viennent des séances déjà là. La
semaine retrouve son total, répartie sur plus de jours plus courts. C'est la définition de
l'affûtage de Bosquet/Mujika.

**Elle porte son propre filet.** Première écriture : **35 combinaisons sur 459 au-dessus de
R3.13**, parce que les planchers de step (corps ≥ 10 min, C13c/C13e sur l'échauffement)
empêchent parfois la semaine de redescendre après l'ajout. R3.13 est une règle de SÉCURITÉ ; on
ne la négocie pas contre une règle de qualité. La semaine est donc photographiée avant, vérifiée
après rééquilibrage, et la restitution **se rétracte** si le plafond ne tient pas.

**Résultat : 68 % → 30 % des profils sous le plancher de fréquence, médiane 75 % → 83 %.** La
sortie longue baisse avec (semi : 91' → 81'). Il reste 30 % : ceux où le rééquilibrage ne peut
pas se payer sans franchir R3.13, et où la rétractation joue. Suivi en `O-19`.

### Quatre instruments qui dépendaient de la date

Ce lot en a démasqué **trois de plus**, tous de la famille R20.7 (« une dimension que la mesure
ne contrôle pas décide de son verdict ») :

- **Mon balayage de fréquence** datait la course à `aujourd'hui + 140 jours`. En franchissant
  minuit UTC pendant la session, elle est passée du dimanche au lundi : la dernière semaine est
  tombée à un jour (N2), sa fréquence à 0, et **la médiane de 75 % à 0 %**. Les chiffres publiés
  dans `O-19` (« 52 % sur 180 profils ») étaient faux et sont corrigés (68 % sur 90 profils
  comparables). Date ancrée sur un dimanche, semaine de course exclue.
- **`smoke-r4`** assertait « le POURQUOI de la séance est visible sans rien ouvrir » — en
  supposant que le jour courant portait une séance. Un tiers des jours de plan sont des jours de
  repos (mesuré en U8 : 153 sur 441). Le critère distingue désormais les deux cas.
- **`audit:invariants` I13** est vert en CI (exécutée le 02/08) et rouge en local le 03/08, à
  code identique : `race_date` est figée mais la LONGUEUR du plan se compte depuis aujourd'hui.
  Balayé sur 21 horizons × 6 sports : **13 échecs sur 114, tous en trail** — un débutant reçoit
  un pic de 575 min quand un inter en reçoit 547. Défaut réel et systémique côté trail, rendu
  intermittent par un échantillonnage à un seul horizon. Enregistré en `O-20`, **non traité** :
  rendre le banc déterministe avant d'avoir corrigé le défaut figerait la dette (leçon R20.6).
