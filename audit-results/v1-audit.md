# Audit V1 « coach de charge » — résultats

Généré par `npm run audit:v1` (Sprint 0). 486 combinaisons, 0 erreur(s).

Seuils : sur-prescrit > 1.4, sous-prescrit < 0.5, alerte séance longue > 55% de la semaine. « Hors bande » = semaines normales (hors récup/affûtage) au ratio hors [0.5, 1.4].
« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tri | 108 | 0.95 | 0.91–1.00 | 0 | 0 | 0 | 0.41 | 0 | 0 | 0.0 | 100% | 97 |
| run | 135 | 0.98 | 0.93–1.05 | 0 | 0 | 0 | 0.41 | 0 | 0 | 0.0 | 100% | 98 |
| bike | 135 | 1.00 | 0.98–1.00 | 0 | 0 | 0 | 0.45 | 0 | 0 | 0.0 | 100% | 99 |
| swim | 108 | 0.97 | 0.92–0.99 | 0 | 0 | 0 | 0.42 | 0 | 0 | 0.0 | 100% | 98 |

## Règles d'acceptation (spec « audit 2 »)

- Affûtage <40% de réduction vs pic : **0/486** combinaisons en échec
- VO2max en semaine d'affûtage : **0** combinaisons en échec
- Brick vélo hors bornes format : **0** combinaisons en échec
- Semaine max hors phase « peak » : **0** combinaisons en échec
- Tri : semaine max sans brick : **0** combinaisons en échec

## Règles du manifeste (note.md)

- Saut >+10% de la courbe déclarée entre semaines de charge : **38** combinaisons en échec
- Saut >+25% de volume réel (métrique audit) : **0** en échec (sauts +15–25% tolérés comme bruit de métrique : 19 combos concernés)
- Deux longues CAP consécutives : **0** en échec
- Sortie longue CAP >3h pour un débutant : **0** en échec
- Séance piscine <750m pour un non-débutant : **0** en échec
- Séance sans objectif expliqué (Pourquoi/Bénéfice) : **0** en échec
- Répartition des intensités : part facile <70% : **0** en échec (médiane 84% de temps facile)

Recoupement d'estimateurs : écart médian |nos minutes − s.min du générateur| par plan, médiane globale 0.0min (R5.6a : la récup inter-blocs est désormais comptée des DEUX côtés — les deux estimateurs mesurent la même séance, l'écart attendu est nul).

## Pires cas (ratio pic le plus extrême par sport)

- **tri** : 70.3/confirme/inter/competition → ratio 0.90 (déclaré 9.1h, prescrit 8.2h), longue 43%
- **run** : 10k/ancien/inter/finir → ratio 0.90 (déclaré 4.1h, prescrit 3.7h), longue 24%
- **bike** : crit/confirme/debutant/finir → ratio 0.92 (déclaré 5.3h, prescrit 4.9h), longue 28%
- **swim** : sprint/confirme/debutant/finir → ratio 0.86 (déclaré 1.1h, prescrit 0.9h), longue 33%
