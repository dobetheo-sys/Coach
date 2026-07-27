# EnduraBuild — Contexte pour Claude Code

## L'outil
Générateur de plans d'entraînement multisport (tri/run/bike/swim), 
100% autonome dans endurabuild.html (1 seul bloc <script>, ~1100 lignes).
Seule dépendance externe : Google Fonts (dégradation gracieuse).

## Corrections déjà faites (4 marqueurs "FIX cohérence" dans le code)
Cause racine : le helper P(lo,hi) des séances longues ignorait `fmt` (format objectif).
Corrigé par tables de bornes {lo,hi} par format, interpolées par prog :
- Swim durLong : débutant plafonné 200-900m ; sinon sprint 600-1400, 
  demifond 1000-2000, fond 1500-3000, ow 1500-4500m
- Run durLong : 5k 40-75, 10k 50-90, semi 70-130, marathon 90-180, trail 120-270 min
- Bike durLong : crit 60-150, clm 75-165, route 90-180, cyclo 120-240, gravel 150-330 min
- Tri durLong : brick vélo S 45-90 / M 60-120 / 70.3 90-180 / Full 150-300 min
  + segment CAP S 10-20 / M 15-30 / 70.3 20-45 / Full 30-75 min
Validé par fuzzing 486 combinaisons (4 sports × formats × 3 historiques × 3 niveaux 
× 3 intentions), 0 erreur, progression monotone partout.

## Chantier TERMINÉ (Sprint 0 V2) — audit "coach de charge"
Harnais reconstruit en TypeScript : `npm run audit:v1` (src/harness, src/engine/loadModel,
src/audit). Tous les pièges listés ici sont encodés dans le code. Résultats
(486 combinaisons, 0 erreur, couverture parsing run/bike ~100%) dans audit-results/ :
- **RUN** : pics OK (méd 0.87), mais 50 semaines sur-prescrites / 18 sous- hors pic
- **BIKE** : SUR-PRESCRIT confirmé — méd pic 1.25, 33 pics >1.4, 302 semaines
  hors bande (toutes over), pire cas clm/reprise/debutant : 5.9h déclarées → 10h prescrites
- **SWIM** : SOUS-PRESCRIT confirmé — méd pic 0.62, 20 pics <0.5 ; la bibliothèque
  de séances ne peut physiquement pas remplir les heures déclarées (fond/ancien :
  10h déclarées → 3.9h prescrites). Couverture 35% : beaucoup de séances SANS
  métrage prescrit (Technique souple, Récup eau) — défaut V1 en soi.
- **TRI** : sain au pic (méd 1.05), mais ~42 séances/plan sans durée prescrite
  (footings "@ allure" sans minutes)
- **DÉCOUVERTE MAJEURE (non cherchée)** : l'AFFÛTAGE EST INOPÉRANT dans 243/486
  plans — sess() ne traite pas la phase "taper", les séances restent pleine
  taille alors que le volume déclaré chute (ex : 1.8h déclarées, 7h prescrites).
  L'athlète arrive fatigué le jour J. À corriger en V1 ou à couvrir en V2.
- 90 combos (bike/swim) ont une semaine de récup plus chargée que la semaine
  précédente : le budget de séances saute les semaines récup (`if(wd[0]?.isR)continue`).

## Gisement connu non traité
Dans la branche TRIATHLON, la nage ne passe pas par durLong : répétitions 
fixes de 100m qui ne progressent jamais vers la distance de course. 
À corriger (le nageur d'un Full devrait construire vers 3800m).

## Avertissement
Les bornes {lo,hi} sont des estimations raisonnables de non-expert, 
à faire relire par un vrai coach avant diffusion large de l'outil.
