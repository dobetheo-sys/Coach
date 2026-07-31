# Audit V2 (Sprint 1) — moteur de raisonnement + générateur

Généré par `npm run audit:v2`. 594 combinaisons via le moteur V2, scorées par l'auditeur inchangé. 0 erreur(s).

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Longue >55% | Facile (méd) | Réparations | Score moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|
| run | 108 | 0.98 | 0.93–1.00 | 0 | 0 | 0 | 0.45 | 0 | 82% | 12 | 98 |
| bike | 135 | 1.00 | 0.98–1.00 | 0 | 0 | 0 | 0.45 | 0 | 91% | 0 | 99 |
| swim | 108 | 0.97 | 0.92–0.99 | 0 | 0 | 0 | 0.44 | 0 | 86% | 8 | 98 |
| tri | 108 | 0.95 | 0.91–1.00 | 0 | 0 | 0 | 0.41 | 0 | 77% | 0 | 97 |
| trail | 27 | 0.99 | 0.90–1.01 | 0 | 0 | 0 | 0.28 | 0 | 96% | 0 | 89 |
| duathlon | 108 | 0.97 | 0.91–1.00 | 0 | 0 | 0 | 0.38 | 0 | 86% | 0 | 99 |

## V1.5 ↔ V2 (même auditeur, mêmes 486 profils)

| Sport | Ratio pic méd V1.5 → V2 | Pire ratio V1.5 → V2 | Score moyen V1.5 → V2 |
|---|---|---|---|
| run | 0.99 → 0.98 | 0.86 → 0.86 | 98 → 98 |
| bike | 1.00 → 1.00 | 0.92 → 0.92 | 99 → 99 |
| swim | 0.97 → 0.97 | 0.86 → 0.86 | 98 → 98 |
| tri | 0.95 → 0.95 | 0.90 → 0.90 | 97 → 97 |
| trail | NaN → 0.99 | 1.00 → 0.90 | NaN → 89 |
| duathlon | NaN → 0.97 | 1.00 → 0.89 | NaN → 99 |

## Décisions du moteur — exemple (tri / 70.3 / confirme / inter / competition)

- **duree** · Durée de préparation : `20 semaines` — Minimum 20 pour 70.3
- **capacite** · Plafond historique : `13h/sem` — Ce que l'historique « confirme » permet d'encaisser sur 70.3
- **utile** · Volume utile du format : `14h/sem` — Au-delà, les heures ne servent plus l'objectif 70.3
- **recup** · Semaine de récupération : `toutes les 4 semaines` — Assimilation régulière de la charge
- **budget** · Séances par semaine : `6` — Budget déclaré ∧ budget implicite du volume (10.0h ÷ 1.2h/séance)
- **courbe** · Courbe de charge : `base 0.5→peak 1.0→affûtage 0.3` — Bandes normalisées × pic, récup ×0.62, lissage C22 ≤+10%/sem
- **R12-ref** · Tes références d'intensité : `CSS · FTP · allure seuil (déclarées)` — Toutes tes références sont déclarées : les séances portent des cibles chiffrées et le volume promis est calé sur ta vraie vitesse.
