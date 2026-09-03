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
| run | 108 | 0.98 | 0.94–1.00 | 0 | 0 | 0 | 0.46 | 0 | 85% | 0 | 100 |
| bike | 135 | 0.99 | 0.91–1.00 | 0 | 0 | 0 | 0.43 | 0 | 91% | 0 | 99 |
| swim | 108 | 0.97 | 0.91–0.99 | 0 | 0 | 0 | 0.48 | 1 | 66% | 3 | 93 |
| tri | 108 | 0.98 | 0.92–1.00 | 0 | 0 | 0 | 0.47 | 6 | 71% | 2 | 90 |
| trail | 27 | 0.96 | 0.94–0.99 | 0 | 0 | 0 | 0.28 | 0 | 96% | 0 | 97 |
| duathlon | 108 | 0.97 | 0.93–0.99 | 0 | 0 | 0 | 0.38 | 0 | 87% | 0 | 99 |

## V1.5 ↔ V2 (même auditeur, mêmes 486 profils)

| Sport | Ratio pic méd V1.5 → V2 | Pire ratio V1.5 → V2 | Score STRUCTUREL moyen V1.5 → V2 |
|---|---|---|---|
| run | 0.98 → 0.98 | 0.88 → 0.88 | 100 → 100 |
| bike | 0.99 → 0.99 | 0.90 → 0.90 | 99 → 99 |
| swim | 0.97 → 0.97 | 0.88 → 0.88 | 93 → 93 |
| tri | 0.98 → 0.98 | 0.89 → 0.90 | 92 → 90 |
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
- **allocation** · Répartition entre les trois disciplines : `vélo 43 % (visé 45) · course 39 % (visé 32) · natation 19 % (visé 23)` — La cible correspond à ton enveloppe déclarée (9 à 13 h/sem) : elle vient du partage du temps de ta COURSE, corrigé pour la natation — la technique se perd par la fréquence, pas par le volume, donc on nage plus que sa part de chrono. Ce que tu lis est ce que ton plan livre : l'écart vient de la structure de ta semaine (combien de créneaux portent quelle discipline), pas d'un réglage — le forcer reviendrait à prendre des minutes sous des planchers de séance qui existent pour te protéger.
- **frequence** · Fréquence par discipline : `30 semaine-discipline(s) sous la cible de 3 séances — au plus bas, natation à 1 séance` — La technique se maintient par la FRÉQUENCE, pas par le volume : c'est pour ça que tu nages plus que ta part de chrono. Ce plan ne force rien — avec 8 séances par semaine, deux séances par discipline deviennent tenables ; en dessous, donner deux créneaux à une discipline qui pèse un huitième de ta course reviendrait à les prendre à celles qui en pèsent sept. Le levier est le nombre de créneaux, donc le doublage, pas un réglage de répartition.
