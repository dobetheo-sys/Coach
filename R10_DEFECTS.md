# R10 — défauts découverts pendant l'extraction

Registre imposé par la spec R10 (§ non-objectifs) : tout défaut trouvé pendant une phase est
**noté ici et corrigé après**, dans un commit séparé, jamais mélangé à une extraction
mécanique. Un écart au golden master doit toujours pouvoir s'expliquer par un changement
VOULU.

| id | phase | défaut | statut |
|---|---|---|---|
| D10-1 | 0 | Le harnais d'audit (`src/audit/runV2Audit.ts`) déclare encore `run: [… "trail"]` et **aucun** `sport: "trail"`. Depuis R7 le trail est un sport : les 486 combinaisons auditent donc un format `run/trail` qui n'existe plus dans l'UI, et n'auditent jamais le vrai module trail (couvert seulement par le banc v6 et l'E2E). Corriger changerait le nombre de combinaisons — donc hors extraction. | ouvert |
| D10-2 | 0 | La spec annonce « le harnais `audit:v2` couvre déjà 10 800 configurations » : il en couvre **486** (4 sports × formats × 3 historiques × 3 niveaux × 3 intentions). Le golden master balaye donc un espace explicitement élargi (voir `scripts/goldenMaster.mjs`), sans prétendre à 10 800. | résolu par construction |
| D10-3 | 0 | `applyRunImpactCap()` sort si `sport !== "run"` : le **trail** (impact + charge excentrique) n'est donc pas plafonné en jours d'impact depuis R7. Le drapeau `guards.runImpactCap` de la phase 1 corrige la cause ; le comportement change alors pour le trail — écart au golden master **voulu**, à valider séparément. | ouvert (phase 1) |
| D10-4 | 0 | **Les deux tables de plafonds avaient déjà divergé** : `steps.js` annonçait `bike/reprise/route = 8h`, `cyclo 9h`, `clm 7h`, `gravel 11h` là où le moteur applique `9 / 11 / 8 / 13`. Les règles pédagogiques mentaient donc sur les plafonds réellement appliqués, dans le sens le plus trompeur (sous-annoncer ce que le plan prescrit). Réconcilié en phase 0 : `EBV2.volumeCaps` est la source unique. Les chiffres AFFICHÉS changent (ils deviennent vrais) ; les plans, eux, sont inchangés — golden master à 0 écart. | corrigé (phase 0) |
| D10-5 | 0 | `plan-view.js:downloadPlan()` appelait `buildPlan()` une SECONDE fois : l'export HTML pouvait donc différer du plan affiché, et un échec de génération y passait inaperçu. Bascule sur `ensurePlan()` (le plan affiché). | corrigé (phase 0) |

