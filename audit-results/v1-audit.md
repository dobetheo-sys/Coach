# Audit V1 « coach de charge » — résultats

Généré par `npm run audit:v1` (Sprint 0). 486 combinaisons, 0 erreur(s).

Seuils : sur-prescrit > 1.4, sous-prescrit < 0.5, alerte séance longue > 55% de la semaine. « Hors bande » = semaines normales (hors récup/affûtage) au ratio hors [0.5, 1.4].
« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tri | 108 | 1.02 | 0.96–1.05 | 0 | 0 | 0 | 0.39 | 0 | 0 | 0.0 | 100% | 99 |
| run | 135 | 1.09 | 1.06–1.11 | 0 | 0 | 0 | 0.39 | 0 | 0 | 0.0 | 100% | 99 |
| bike | 135 | 1.05 | 1.04–1.06 | 0 | 0 | 0 | 0.42 | 0 | 0 | 0.0 | 100% | 100 |
| swim | 108 | 0.72 | 0.43–1.01 | 0 | 26 | 154 | 0.51 | 0 | 0 | 0.0 | 100% | 82 |

## Règles d'acceptation (spec « audit 2 »)

- Affûtage <40% de réduction vs pic : **6/486** combinaisons en échec
- VO2max en semaine d'affûtage : **0** combinaisons en échec
- Brick vélo hors bornes format : **0** combinaisons en échec
- Semaine max hors phase « peak » : **0** combinaisons en échec
- Tri : semaine max sans brick : **0** combinaisons en échec

## Règles du manifeste (note.md)

- Saut >+10% de la courbe déclarée entre semaines de charge : **0** combinaisons en échec
- Saut >+25% de volume réel (métrique audit) : **0** en échec (sauts +15–25% tolérés comme bruit de métrique : 91 combos concernés)
- Deux longues CAP consécutives : **0** en échec
- Sortie longue CAP >3h pour un débutant : **0** en échec
- Séance piscine <750m pour un non-débutant : **0** en échec
- Séance sans objectif expliqué (Pourquoi/Bénéfice) : **0** en échec
- Répartition des intensités : part facile <70% : **12** en échec (médiane 82% de temps facile)

Recoupement d'estimateurs : écart médian |nos minutes − s.min du générateur| par plan, médiane globale 0.0min (R5.6a : la récup inter-blocs est désormais comptée des DEUX côtés — les deux estimateurs mesurent la même séance, l'écart attendu est nul).

## Pires cas (ratio pic le plus extrême par sport)

- **tri** : S/ancien/debutant/competition → ratio 1.06 (déclaré 6.4h, prescrit 6.8h), longue 27%
- **run** : 5k/confirme/debutant/competition → ratio 1.15 (déclaré 3.3h, prescrit 3.8h), longue 36%
- **bike** : crit/reprise/debutant/finir → ratio 1.07 (déclaré 4.0h, prescrit 4.3h), longue 33%
- **swim** : fond/ancien/inter/competition → ratio 0.34 (déclaré 10.0h, prescrit 3.4h), longue 28%
