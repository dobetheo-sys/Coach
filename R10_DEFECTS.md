# R10 — défauts découverts pendant l'extraction

Registre imposé par la spec R10 (§ non-objectifs) : tout défaut trouvé pendant une phase est
**noté ici et corrigé après**, dans un commit séparé, jamais mélangé à une extraction
mécanique. Un écart au golden master doit toujours pouvoir s'expliquer par un changement
VOULU.

| id | phase | défaut | statut |
|---|---|---|---|
| D10-1 | 0 (corrigé) | Le harnais d'audit (`src/audit/runV2Audit.ts`) déclare encore `run: [… "trail"]` et **aucun** `sport: "trail"`. Depuis R7 le trail est un sport : les 486 combinaisons auditent donc un format `run/trail` qui n'existe plus dans l'UI, et n'auditent jamais le vrai module trail (couvert seulement par le banc v6 et l'E2E). **Corrigé** : le format `run/trail` disparaît, le sport `trail` prend sa place avec de vraies données de course (62 km / 3 200 m D+) — 486 combinaisons inchangées, trail à 0 violation dure, score 100. | corrigé |
| D10-2 | 0 | La spec annonce « le harnais `audit:v2` couvre déjà 10 800 configurations » : il en couvre **486** (4 sports × formats × 3 historiques × 3 niveaux × 3 intentions). Le golden master balaye donc un espace explicitement élargi (voir `scripts/goldenMaster.mjs`), sans prétendre à 10 800. | résolu par construction |
| D10-3 | 0 | `applyRunImpactCap()` sort si `sport !== "run"` : le **trail** (impact + charge excentrique) n'est donc pas plafonné en jours d'impact depuis R7. Le drapeau `guards.runImpactCap` de la phase 1 corrige la cause ; le comportement change alors pour le trail — écart au golden master **voulu**, validé séparément. | corrigé |
| D10-4 | 0 | **Les deux tables de plafonds avaient déjà divergé** : `steps.js` annonçait `bike/reprise/route = 8h`, `cyclo 9h`, `clm 7h`, `gravel 11h` là où le moteur applique `9 / 11 / 8 / 13`. Les règles pédagogiques mentaient donc sur les plafonds réellement appliqués, dans le sens le plus trompeur (sous-annoncer ce que le plan prescrit). Réconcilié en phase 0 : `EBV2.volumeCaps` est la source unique. Les chiffres AFFICHÉS changent (ils deviennent vrais) ; les plans, eux, sont inchangés — golden master à 0 écart. | corrigé (phase 0) |
| D10-5 | 0 | `plan-view.js:downloadPlan()` appelait `buildPlan()` une SECONDE fois : l'export HTML pouvait donc différer du plan affiché, et un échec de génération y passait inaperçu. Bascule sur `ensurePlan()` (le plan affiché). | corrigé (phase 0) |
| D10-6 | 0 (corrigé) | **Le modèle de charge ne connaissait pas les zones trail.** `tr.vam` / `tr.asc` / `tr.flatthr` ne portent aucun des suffixes de `HARD_SUFFIX` (`.vo2`, `.thr`, …) : tout le travail trail tombait en « facile ». Mesure avant correction : **100 % de facile** sur les 27 profils trail — la répartition 80/20 affichée à l'athlète et le garde-fou de polarisation étaient donc AVEUGLES sur tout un sport depuis R7. Classement ajouté par ce que l'effort coûte (VAM/seuils = dur, allure de course en montée = modéré, marche et footing = facile) ; la descente reste hors intensité, sa charge est portée par l'axe D− (T2b) — la compter deux fois serait faux. | corrigé |
| D10-7 | 1 (corrigé) | **22 jours de plan trail étaient COMPLÈTEMENT VIDES.** Plusieurs passes (anti-collage, garde de polarisation, C18b) reconstruisent les séances d'un jour via `buildSessions(...)` — qui, pour un plan trail, ne matchait AUCUNE branche (`sp === "trail"` n'existait pas dans `sessionLibrary`) et retournait un tableau VIDE. Résultat mesuré sur un profil trail à petit volume : 22 jours (tous les jeudis, le jour de descente) sans aucune séance. Le registre corrige la cause : le dispatch connaît tous les sports par construction. Seul écart au golden master de la phase 1, et c'est une CORRECTION. | corrigé |
| D10-8 | 1 (noté) | Le créneau facile de repli du trail est `facileR` (héritage de `sport === "run" ? "facile2" : "facileR"`, qui ne connaissait que la course). Pour un traileur, `facile2` (footing court de récup) serait sans doute plus juste qu'une séance facile pleine. Non touché : l'extraction devait rester mécanique — c'est une décision d'entraînement, à trancher pour elle-même. | ouvert |
| D10-9 | 1 (noté) | Le bundle (`npm run build:app`) concatène tous les modules dans UNE portée : un nom de fonction dupliqué au niveau racine écrase silencieusement l'autre. Rencontré pendant la phase 1 (un `buildSessions` local dans le module trail a remplacé le dispatch — l'auto-test du bundle l'a attrapé). Aucun garde-fou n'empêche la prochaine collision : à ajouter (détection de doublons dans `buildApp.mjs`). | ouvert |

## Note de mesure (pas un défaut)

Une fois les zones trail reconnues, un plan d'ultra mesure **97 % facile / 1 % modéré / 2 % dur**.
Ce n'est pas une anomalie : sur un plan à 11 h/semaine, « une séance de qualité par semaine »
FAIT arithmétiquement 3-4 % du temps. La part facile élevée est le propre de la préparation
d'ultra (le volume est le stimulus). L'auditeur exige une part facile ≥ 70 % : le trail la
respecte largement, et le chiffre est désormais MESURÉ au lieu d'être supposé.

