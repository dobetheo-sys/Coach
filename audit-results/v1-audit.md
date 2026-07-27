# Audit V1 « coach de charge » — résultats

Généré par `npm run audit:v1` (Sprint 0). 486 combinaisons, 0 erreur(s).

Seuils : sur-prescrit > 1.4, sous-prescrit < 0.5, alerte séance longue > 55% de la semaine. « Hors bande » = semaines normales (hors récup/affûtage) au ratio hors [0.5, 1.4].
« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tri | 108 | 1.05 | 0.84–1.25 | 0 | 0 | 8 | 0.61 | 0 | 3 | 42.3 | 70% | 96 |
| run | 135 | 0.87 | 0.71–1.18 | 0 | 0 | 68 | 0.94 | 0 | 13 | 0.0 | 99% | 76 |
| bike | 135 | 1.25 | 0.86–1.42 | 33 | 0 | 302 | 0.91 | 54 | 0 | 0.0 | 100% | 65 |
| swim | 108 | 0.62 | 0.45–0.96 | 0 | 20 | 106 | 0.85 | 36 | 0 | 37.7 | 35% | 70 |

## Affûtage

243/486 combinaisons ont une dernière semaine d'affûtage prescrite à >85% du pic (défaut V1 : `sess()` ne traite pas la phase `taper`, les séances restent pleine taille alors que le volume déclaré chute).

## Pires cas (ratio pic le plus extrême par sport)

- **tri** : Full/reprise/inter/finir → ratio 1.35 (déclaré 9.0h, prescrit 12.2h), longue 53%
- **run** : marathon/confirme/inter/competition → ratio 0.63 (déclaré 10.0h, prescrit 6.3h), longue 48%
- **bike** : clm/reprise/debutant/finir → ratio 1.69 (déclaré 5.9h, prescrit 10.0h), longue 28%
- **swim** : fond/ancien/inter/competition → ratio 0.39 (déclaré 10.0h, prescrit 3.9h), longue 26%
