# Audit V1 « coach de charge » — résultats

Généré par `npm run audit:v1` (Sprint 0). 459 combinaisons, 0 erreur(s).

Seuils : sur-prescrit > 1.4, sous-prescrit < 0.5, alerte séance longue > 55% de la semaine. « Hors bande » = semaines normales (hors récup/affûtage) au ratio hors [0.5, 1.4].
« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).


⚠ **Le score est STRUCTUREL, et il IGNORE les alertes.** Il part de 100 et ne se décrémente que sur
des grandeurs de structure — sauts de charge, ratio du pic, semaines hors bande, part de la sortie
longue, jours durs adjacents, part de facile. Le canal `warnings` (R11.2) n'entre dans AUCUN de ces
termes. Un lot dont le changement principal est une alerte HONNÊTE ne bouge donc pas ce chiffre, et
une hausse concomitante a nécessairement une autre cause — sans ce libellé, on relit le rapport six
mois plus tard en concluant que le lot a amélioré la qualité des plans alors qu'il a ajouté une
alerte. Mesuré (`npm run mesure:score-alertes`, 108 profils tri) : AUCUNE relation monotone entre
le nombre d'alertes et le score, écarts-types 5,6 à 10,6 — les moyennes se recouvrent largement,
aucune ne se cite seule comme un effet.
| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score STRUCTUREL moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tri | 108 | 0.97 | 0.91–1.00 | 0 | 0 | 0 | 0.41 | 0 | 6 | 0.0 | 100% | 95 |
| run | 108 | 0.98 | 0.94–0.99 | 0 | 0 | 0 | 0.47 | 0 | 0 | 0.0 | 100% | 100 |
| bike | 135 | 0.99 | 0.97–1.00 | 0 | 0 | 0 | 0.44 | 0 | 0 | 0.0 | 100% | 99 |
| swim | 108 | 0.97 | 0.91–1.00 | 0 | 0 | 0 | 0.49 | 0 | 0 | 0.0 | 100% | 98 |

## Règles d'acceptation (spec « audit 2 »)

- Affûtage <40% de réduction vs pic : **0/459** combinaisons en échec
- VO2max en semaine d'affûtage : **0** combinaisons en échec
- Brick vélo hors bornes format : **0** combinaisons en échec
- Semaine max hors phase « peak » : **0** combinaisons en échec
- Tri : semaine max sans brick : **0** combinaisons en échec

## Règles du manifeste (note.md)

- Saut >+10% de la courbe déclarée entre semaines de charge : **19** combinaisons en échec
- Saut >+25% de volume réel (métrique audit) : **0** en échec (sauts +15–25% tolérés comme bruit de métrique : 3 combos concernés)
- Deux longues CAP consécutives : **0** en échec
- Sortie longue CAP >3h pour un débutant : **0** en échec
- Séance piscine <750m pour un non-débutant : **0** en échec
- Séance sans objectif expliqué (Pourquoi/Bénéfice) : **0** en échec
- Répartition des intensités : part facile <70% : **5** en échec (médiane 86% de temps facile)

Recoupement d'estimateurs : écart médian |nos minutes − s.min du générateur| par plan, médiane globale 0.0min (R5.6a : la récup inter-blocs est désormais comptée des DEUX côtés — les deux estimateurs mesurent la même séance, l'écart attendu est nul).

## Pires cas (ratio pic le plus extrême par sport)

- **tri** : M/reprise/inter/finir → ratio 0.90 (déclaré 6.1h, prescrit 5.5h), longue 35%
- **run** : 5k/confirme/debutant/competition → ratio 0.89 (déclaré 3.0h, prescrit 2.7h), longue 41%
- **bike** : route/confirme/debutant/competition → ratio 0.97 (déclaré 10.0h, prescrit 9.8h), longue 30%
- **swim** : demifond/ancien/debutant/competition → ratio 0.83 (déclaré 0.8h, prescrit 0.7h), longue 35%
