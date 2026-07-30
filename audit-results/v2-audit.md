# Audit V2 (Sprint 1) — moteur de raisonnement + générateur

Généré par `npm run audit:v2`. 486 combinaisons via le moteur V2, scorées par l'auditeur inchangé. 0 erreur(s).

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Longue >55% | Facile (méd) | Réparations | Score moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|
| run | 108 | 1.15 | 1.11–1.21 | 0 | 0 | 0 | 0.38 | 0 | 79% | 0 | 97 |
| bike | 135 | 1.09 | 1.08–1.11 | 0 | 0 | 0 | 0.41 | 0 | 88% | 0 | 100 |
| swim | 108 | 1.09 | 0.69–1.16 | 0 | 0 | 4 | 0.45 | 0 | 85% | 0 | 98 |
| tri | 108 | 1.02 | 0.97–1.07 | 0 | 0 | 0 | 0.42 | 0 | 77% | 8 | 97 |
| trail | 27 | 1.07 | 0.96–1.07 | 0 | 0 | 0 | 0.32 | 0 | 96% | 0 | 100 |

## V1.5 ↔ V2 (même auditeur, mêmes 486 profils)

| Sport | Ratio pic méd V1.5 → V2 | Pire ratio V1.5 → V2 | Score moyen V1.5 → V2 |
|---|---|---|---|
| run | 1.13 → 1.15 | 1.25 → 1.28 | 100 → 97 |
| bike | 1.09 → 1.09 | 1.16 → 1.19 | 100 → 100 |
| swim | 0.77 → 1.09 | 0.36 → 0.65 | 88 → 98 |
| tri | 1.02 → 1.02 | 1.06 → 0.61 | 99 → 97 |
| trail | NaN → 1.07 | 1.00 → 1.07 | NaN → 100 |

## Décisions du moteur — exemple (tri / 70.3 / confirme / inter / competition)

- **duree** · Durée de préparation : `20 semaines` — Minimum 20 pour 70.3
- **capacite** · Plafond historique : `13h/sem` — Ce que l'historique « confirme » permet d'encaisser sur 70.3
- **utile** · Volume utile du format : `14h/sem` — Au-delà, les heures ne servent plus l'objectif 70.3
- **recup** · Semaine de récupération : `toutes les 4 semaines` — Assimilation régulière de la charge
- **budget** · Séances par semaine : `6` — Budget déclaré ∧ budget implicite du volume (10.0h ÷ 1.2h/séance)
- **courbe** · Courbe de charge : `base 0.5→peak 1.0→affûtage 0.3` — Bandes normalisées × pic, récup ×0.62, lissage C22 ≤+10%/sem
