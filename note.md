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

## Chantier en cours (interrompu)
Audit "coach de charge" : vérifier que le volume réellement prescrit dans la 
semaine du pic ≈ volume hebdo déclaré (w.vol), + part de la séance longue.
Harnais Node à reconstruire. Pièges connus :
- extraire le <script> du HTML, retirer le `renderStep();` final (par REGEX, 
  pas par numéro de ligne)
- eval INDIRECT `(0,eval)(code)` + ajouter à la chaîne évaluée :
  `global.S=S; global.SPORTS=SPORTS; global.buildPlan=buildPlan;`
  (les const/let top-level ne s'attachent pas à global)
- stub DOM minimal requis (document/window/Blob/URL)
- PARSEURS : sommer réellement les séances (N×Mmin + minutes isolées + 
  échauffement/retour au calme), PAS le max isolé — le max sous-estime 
  massivement les séances structurées. Pour la nage : sommer les mètres 
  et convertir via l'allure X'YY/100m du texte.
- Seuils indicatifs : ratio prescrit/déclaré >1.4 = sur-prescrit, 
  <0.5 = sous-prescrit ; part séance longue >45-55% de la semaine = alerte.
- Un premier passage (parseurs naïfs, résultats INVALIDES à refaire) suggérait :
  RUN ok (~1.00), BIKE possiblement sur-prescrit, SWIM/TRI sous-prescrits.

## Gisement connu non traité
Dans la branche TRIATHLON, la nage ne passe pas par durLong : répétitions 
fixes de 100m qui ne progressent jamais vers la distance de course. 
À corriger (le nageur d'un Full devrait construire vers 3800m).

## Avertissement
Les bornes {lo,hi} sont des estimations raisonnables de non-expert, 
à faire relire par un vrai coach avant diffusion large de l'outil.
