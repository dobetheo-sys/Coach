# ZENNA_EXACTITUDE — Phase 2 : la traçabilité des valeurs affichées, mesurée

**Date** : 14/08/2026 · **SHA de référence** : voir `diffs/merge-noop.md`.
**Méthode** : chaque catégorie de valeur affichée est TRACÉE du pixel à son origine, le nombre
de définitions est COMPTÉ, et chaque crible automatique est QUALIFIÉ sur échantillon avant
publication — deux de mes cribles sur trois ont sur-signalé, et c'est écrit.

---

## BLOQUEURS (lignes à > 1 définition), en tête comme exigé

| # | valeur affichée | définitions | détail |
|---|---|---|---|
| **B1** | **Le graphe Fitness/Fatigue/Forme entier** (courbes CTL/ATL/TSB, 🎯 Aujourd'hui + 🗓 Plan) | **modèle entier côté UI** — `_IFZ` ×3 + `estimateTSS` + marche CTL 42 j/ATL 7 j (`_loadSeriesDaily`, plan-view.js) | Le cas modèle du prompt, et il est PIRE qu'annoncé : ce n'est pas une table recopiée, c'est un **modèle de charge complet qui ne vit que dans l'affichage**. Le moteur a le sien (`sessionLoad`/`loadWindow`) — deux physiologies pour le même mot « charge ». Et **doctrine contre doctrine** : R14 a explicitement REJETÉ CTL/ATL/Banister dans le moteur, avec la raison écrite — pendant que l'UI le trace à l'écran. |
| **B2** | Règle « FTP ≈ 95 % des 20 min » | **2 sites de code** — `src/readiness/fitParser.ts:156` (import FIT) + `endurabuild/js/ui/steps.js:624` (import Strava du questionnaire) | La règle d'O-22, écrite deux fois de part et d'autre de la frontière moteur/UI. `bestRollingMean` (steps.js:726) n'existe qu'en UI — le FIT passe par un autre chemin. |
| **B3** | Multiplicateurs de zones | **3 écritures** — `ZDEF` (renderer, l'autorité) + `_IFZ` (plan-view, « aligné sur rn.easy/rn.thr » par COMMENTAIRE) + copie du monolithe gelé | Sous-cas de B1 ; le commentaire d'alignement est une promesse manuelle, rien ne la garde. |

`check:dup` (Z-03, cliquet) porte `_IFZ` plafond 3 ; **B2 y entre** (plafond 2, ne peut que
descendre) au prochain commit du gate.

## Lignes à UNE définition (vérifiées, pas supposées)

| valeur affichée | origine | preuve |
|---|---|---|
| Allures/puissances des séances (`det`) | `renderer.ts` (fmtInt/ZDEF), substitutions `bikeRp`/`runMara` — points uniques R20.5/B-22/B-25 | T-16/T-16c de bout en bout |
| Chronos prédits + fourchettes | `EBV2.predict` (predictor.ts) | retest + T-17 |
| Chiffres du message de volume | `volLimits` × `queue` (V-11) | T-19, 0/247 + 161/161 fermé |
| Répartition d'intensité (dashboard) | `_v2.intensity` (loadModel, bande comprise depuis le correctif famille) | diff 949 : champs `_v2.intensity.*` seuls |
| Verdict readiness, nutrition | `EBV2` (adjuster, N1-N11) | gates dédiés |
| Couleurs de zone/charge/discipline | `icons.js` (CHARGE/DISC) — présentation, une écriture + copie CI d'`avatar-tri` documentée | inventaire Phase 1 + Z-11 |

## 2.3 — Cohérence affichage/calcul sur les 949 (945 construits, 4 refus typés)

**Trois balayages, chacun qualifié sur échantillon avant d'être cru** :

1. **« Toute consigne rédigée a un step correspondant »** — crible : promesse « dernier tiers »
   sans step porteur. Résultat brut : 416 séances. Qualifié : **416/416 sont le brick duathlon
   « vélo → R2 »** — sa note promet « vélo en endurance, dernier tiers à l'allure course, puis
   R2 à l'allure cible », ses steps sont `bk.z2` + un R2 **sans zone**. C'est le crime exact de
   R19.5 (corrigé côté tri par R20.5, avec le step `share: 1/3` + `rpBand`), vivant dans le seul
   duathlon. **Périmètre B-26**, désormais chiffré : 416 séances sur 147 profils.
2. **« Allure course promise ⇒ step rp/mara »** — brut : 1 703. Qualifié : **faux positifs de
   MON crible en masse** — l'exemple type est « Seuil / race-pace » d'un critérium, dont la note
   dit « allure de course soutenable ~1h » et le step est `bk.thr` : un crit SE court au seuil,
   la promesse et le step disent la même chose sous deux noms. Mon critère exigeait une zone
   `.rp`/`.mara` là où le moteur a raison d'écrire du seuil. Non retenu comme défaut ; la
   version juste de ce critère est T-16c (recouvrement bande émise / leg prédit), qui est vert.
3. **Steps de corps sans zone** — brut : 11 034 (bike 3 658, duathlon 4 657, tri 1 399, trail
   1 316). Qualifié : l'échantillon type est « Récup active » (`très souple`) — le repli « easy »
   de `zoneClass` est la BONNE classe, par conception documentée. L'exception qui compte : le
   **R2 du brick duathlon** (leg course sans zone → « mod » par `runLegNoZone`) — une allure de
   course comptée par repli, rattachée à B-26. T-20 borne désormais la famille (toute zone POSÉE
   doit résoudre) ; « aucun step de qualité sans zone » serait le critère suivant, à écrire
   avec B-26.

**Le (a) du cahier des charges** (« tout nombre d'une phrase = la valeur utilisée ») est couvert
par V-11/T-19 pour le message de volume — vert sur les 949 — et par T-16c pour les allures.
L'extension aux AUTRES messages de décision reste ouverte (dette de phase, listée au STOP).
