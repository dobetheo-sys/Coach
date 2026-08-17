# Audit V2 (Sprint 1) — moteur de raisonnement + générateur

Généré par `npm run audit:v2`. 594 combinaisons via le moteur V2, scorées par l'auditeur inchangé. 0 erreur(s).


⚠ **Le score est STRUCTUREL, et il IGNORE les alertes.** Il part de 100 et ne se décrémente que sur
des grandeurs de structure — sauts de charge, ratio du pic, semaines hors bande, part de la sortie
longue, jours durs adjacents, part de facile. Le canal `warnings` (R11.2) n'entre dans AUCUN de ces
termes. Un lot dont le changement principal est une alerte HONNÊTE ne bouge donc pas ce chiffre, et
une hausse concomitante a nécessairement une autre cause — sans ce libellé, on relit le rapport six
mois plus tard en concluant que le lot a amélioré la qualité des plans alors qu'il a ajouté une
alerte. Mesuré (`npm run mesure:score-alertes`, 108 profils tri) : AUCUNE relation monotone entre
le nombre d'alertes et le score, écarts-types 5,6 à 10,6 — les moyennes se recouvrent largement,
aucune ne se cite seule comme un effet.

| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Longue >55% | Facile (méd) | Réparations | Score STRUCTUREL moyen |
|---|---|---|---|---|---|---|---|---|---|---|---|
| run | 108 | 0.98 | 0.94–0.99 | 0 | 0 | 0 | 0.47 | 0 | 84% | 0 | 100 |
| bike | 135 | 0.99 | 0.97–1.00 | 0 | 0 | 0 | 0.44 | 0 | 91% | 0 | 99 |
| swim | 108 | 0.97 | 0.91–1.00 | 0 | 0 | 0 | 0.49 | 0 | 86% | 18 | 98 |
| tri | 108 | 0.97 | 0.92–1.00 | 0 | 0 | 0 | 0.45 | 11 | 76% | 14 | 94 |
| trail | 27 | 0.96 | 0.94–0.99 | 0 | 0 | 0 | 0.28 | 0 | 96% | 0 | 97 |
| duathlon | 108 | 0.97 | 0.92–1.00 | 0 | 0 | 0 | 0.38 | 0 | 87% | 0 | 99 |

## V1.5 ↔ V2 (même auditeur, mêmes 486 profils)

| Sport | Ratio pic méd V1.5 → V2 | Pire ratio V1.5 → V2 | Score STRUCTUREL moyen V1.5 → V2 |
|---|---|---|---|
| run | 0.98 → 0.98 | 0.89 → 0.89 | 100 → 100 |
| bike | 0.99 → 0.99 | 0.97 → 0.97 | 99 → 99 |
| swim | 0.97 → 0.97 | 0.83 → 0.83 | 98 → 98 |
| tri | 0.97 → 0.97 | 0.90 → 0.89 | 95 → 94 |
| trail | NaN → 0.96 | 1.00 → 0.91 | NaN → 97 |
| duathlon | NaN → 0.97 | 1.00 → 0.90 | NaN → 99 |

## Décisions du moteur — exemple (tri / 70.3 / confirme / inter / competition)

- **duree** · Durée de préparation : `20 semaines` — Minimum 20 pour 70.3
- **capacite** · Plafond historique : `13h/sem` — Ce que l'historique « confirme » permet d'encaisser sur 70.3
- **utile** · Volume utile du format : `14h/sem` — Au-delà, les heures ne servent plus l'objectif 70.3
- **recup** · Semaine de récupération : `toutes les 4 semaines` — Assimilation régulière de la charge
- **budget** · Séances par semaine : `6` — Budget déclaré ∧ budget implicite du volume (10.0h ÷ 1.2h/séance)
- **B17-paliers** · Nages continues prescrites : `1 palier(s) en phase spécifique` — La continuité se construit par une MONTÉE, jamais par un test unique à la fin : découvrir la distance trois semaines avant l'épreuve laisse le temps de s'inquiéter, pas celui de s'adapter — et le nombre est borné par la place réellement disponible
- **courbe** · Courbe de charge : `base 0.5→peak 1.0→affûtage 0.3` — Bandes normalisées × pic, récup ×0.62, lissage C22 ≤+10%/sem
- **R12-ref** · Tes références d'intensité : `CSS · FTP · allure seuil (déclarées)` — Toutes tes références sont déclarées : les séances portent des cibles chiffrées et le volume promis est calé sur ta vraie vitesse.
