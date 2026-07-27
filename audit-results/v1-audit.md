# Audit V1 « coach de charge » — résultats

Généré par `npm run audit:v1` (Sprint 0). 486 combinaisons, 0 erreur(s).

Seuils : sur-prescrit > 1.4, sous-prescrit < 0.5, alerte séance longue > 55% de la semaine. « Hors bande » = semaines normales (hors récup/affûtage) au ratio hors [0.5, 1.4].
« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tri | 108 | 1.08 | 1.03–1.12 | 0 | 0 | 0 | 0.35 | 0 | 9 | 0.0 | 100% | 98 |
| run | 135 | 1.13 | 1.08–1.20 | 0 | 0 | 0 | 0.36 | 0 | 0 | 0.0 | 100% | 99 |
| bike | 135 | 1.09 | 1.07–1.10 | 0 | 0 | 0 | 0.40 | 0 | 0 | 0.0 | 100% | 100 |
| swim | 108 | 1.05 | 0.32–1.10 | 0 | 26 | 178 | 0.42 | 0 | 0 | 0.0 | 100% | 87 |

## Règles d'acceptation (spec « audit 2 »)

- Affûtage <40% de réduction vs pic : **0/486** combinaisons en échec
- VO2max en semaine d'affûtage : **0** combinaisons en échec
- Brick vélo hors bornes format : **0** combinaisons en échec
- Semaine max hors phase « peak » : **0** combinaisons en échec
- Tri : semaine max sans brick : **0** combinaisons en échec

Recoupement d'estimateurs : écart médian |nos minutes − s.min du générateur| par plan, médiane globale 0.0min (l'écart attendu vient de la récup inter-blocs, que le générateur ne compte pas).

## Pires cas (ratio pic le plus extrême par sport)

- **tri** : M/reprise/debutant/competition → ratio 1.14 (déclaré 8.0h, prescrit 9.1h), longue 32%
- **run** : 5k/confirme/debutant/finir → ratio 1.24 (déclaré 4.5h, prescrit 5.6h), longue 31%
- **bike** : crit/reprise/debutant/finir → ratio 1.15 (déclaré 5.4h, prescrit 6.2h), longue 34%
- **swim** : fond/ancien/debutant/competition → ratio 0.23 (déclaré 10.0h, prescrit 2.3h), longue 26%
