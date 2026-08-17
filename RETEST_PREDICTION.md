# Retest complet du système de prédiction de chrono — focus triathlon

**Date** : 13/08/2026 · **Périmètre** : `predict()` sur les 7 sports, batterie centrée sur le tri.
**Nature** : lecture seule, aucun fichier de `src/` modifié.

Athlète témoin utilisé partout : **75 kg · FTP 250 (3,33 W/kg) · CSS 1'40/100 m · seuil 4'15/km ·
confirmé · 10 h/sem**. Un âge-groupe compétent, ni élite ni débutant — le profil où une erreur de
modèle se voit sans être masquée par les bornes.

---

## Verdict en une ligne

**Six propriétés sur sept tiennent.** La septième n'est pas un défaut mais **un choix de
conception documenté qui mérite d'être rediscuté**, et il coûte ~13 min sur le marathon d'un
Ironman. Une seconde question, mineure, remonte de l'affichage swimrun.

---

## 1. Additivité des segments ✓

Le total annoncé est bien la somme des trois segments plus les transitions déclarées.

| format | somme des 3 segments | total annoncé | transitions implicites | table déclarée |
|---|---|---|---|---|
| S | 1h06–1h11 | 1h09–1h14 | 3 / 3 min | 120 + 75 s = 3,25 min ✓ |
| M | 2h16–2h26 | 2h20–2h30 | 4 / 4 min | 150 + 90 s = 4 min ✓ |
| 70.3 | 4h38–5h02 | 4h46–5h10 | 8 / 8 min | 300 + 210 s = 8,5 min ✓ |
| Full | 9h44–10h33 | 9h59–10h49 | 15 / 16 min | 480 + 360 s = 14 min ✓ |

Les transitions sont **identiques sur les deux bornes** de la fourchette — l'incertitude porte sur
les segments, pas sur les transitions, ce qui est le comportement correct (une transition ne
s'étire pas avec la forme du jour).

## 2. Monotonie face aux références ✓

Sur les quatre axes, une meilleure référence donne un meilleur chrono, sans inversion :

| axe | valeurs | chronos | verdict |
|---|---|---|---|
| FTP | 200 → 250 → 300 W | vélo 2h44 → 2h29 → 2h18 | ✓ |
| CSS | 2'00 → 1'40 → 1'20 /100 m | nage 39'04 → 32'34 → 26'03 | ✓ |
| seuil | 5'00 → 4'15 → 3'40 /km | CAP 1h54 → 1h36 → 1h22 | ✓ |
| poids | 65 → 75 → 95 kg | vélo 2h26 → 2h29 → 2h34 | ✓ (sens inverse, correct) |

## 3. Facteurs de fatigue course-après-vélo ✓ — et ma première mesure était fausse

| format | ratio observé | déclaré | écart |
|---|---|---|---|
| S | 1,048 | 1,03 | +0,018 |
| M | 1,056 | 1,05 | +0,006 |
| 70.3 | 1,079 | 1,08 | −0,001 |
| Full | **1,106** | **1,13** | **−0,024** ⚠ |

Le Full paraissait dévier. **C'était mon témoin.** Je comparais le marathon du tri (plan à 10 h)
à un marathon sec construit sur un plan à 8 h — or l'exposant de Riegel d'une course sèche dépend
du volume. En balayant le volume du plan sec, le ratio croise **exactement 1,130 à vol_max = 10 h**,
c'est-à-dire le volume du profil tri. Le facteur est appliqué au chiffre près sur les quatre
formats ; il n'y a pas de défaut ici.

## 4. Dégradation quand une référence manque ✓

| cas | total | comportement |
|---|---|---|
| tout connu | 4h46–5h10 | 5 items |
| sans FTP | — | refus, 2 items |
| sans CSS | — | refus, 3 items |
| sans allure | — | refus, 3 items |
| **sans poids** | — | refus, 3 items |
| rien de connu | — | refus, 0 item |

Aucun total n'est inventé dès qu'un segment manque. Le refus sur le **poids** est notable et
correct : le modèle de Martin en a besoin pour le roulement et la pente, et PW a explicitement
décidé de refuser plutôt que d'inventer un gabarit.

## 5. Relief ✓

| parcours | vélo | total |
|---|---|---|
| plat | 2h29–2h45 | 4h46–5h10 |
| vallonné | 2h43–3h00 | 5h03–5h32 |
| montagne | 3h13–3h33 | 5h38–6h14 |

+29 % de temps vélo entre plat et montagne, cohérent avec les +27 % que `cyclingSpeed.ts` annonce
lui-même sur sa calibration.

## 6. Cohérence de l'allure de nage entre formats ✓

100,9 → 101,9 → 102,8 → 104,2 s/100 m de S à Full (bornes basses), pour un CSS de 100 s/100 m.
C'est exactement la table `TRI_SWIM` (×1,04 → ×1,08) appliquée en croissant avec la distance.

---

## 7. LE POINT À REDISCUTER — l'exposant de Riegel est figé à 1,06 hors course sèche

`src/engine/predictor.ts:501` :

```ts
// R14 P5 — l'exposant de Riegel suit le volume, et SEULEMENT pour une course sèche :
// les legs course du tri/duathlon portent déjà leurs facteurs de fatigue calibrés à 1,06.
const expo = sport === "run" ? riegelExponent(opts.runHoursPerWeek) : 1.06;
```

**Ce n'est pas un oubli** : la raison est écrite, et elle est cohérente — les facteurs de fatigue
`TRI_RUN` (1,03 / 1,05 / 1,08 / 1,13) ont été calibrés en supposant une base à 1,06, donc faire
varier l'exposant en plus reviendrait à compter deux fois.

**Pourquoi ça mérite quand même d'être rediscuté** : les deux grandeurs modélisent des phénomènes
différents. Le facteur de fatigue dit « courir après avoir roulé coûte plus cher » — c'est un
multiplicateur constant par format. L'exposant de Riegel dit « à quel point tu tiens la distance
quand elle s'allonge », et **cela dépend du volume de course**, pas du fait qu'on ait roulé avant.

Conséquence mesurée, à références identiques :

| exposant | marathon prédit (point) | correspond à |
|---|---|---|
| 1,06 *(appliqué à tout triathlète)* | **191,5 min** | un coureur à **10 h/semaine** |
| 1,09 | 198 min | 6,5 h/semaine |
| 1,12 | **205 min** | **≤ 4 h/semaine** |

> **⚠ Rectification (V-10, 13/08/2026).** Cette table annonçait d'abord « 185 min » à
> l'exposant 1,06. **185 min est la BORNE BASSE de la fourchette** (−3,5 %), pas l'estimation
> ponctuelle, qui vaut **191,5 min**. Le ratio à l'allure seuil est donc **1,068** et non 1,032 —
> l'écart avec la bande `rn.mara` prescrite (1,08–1,13) est **quatre fois plus petit** que ce que
> le chiffre laissait croire. L'observation de fond tient (1,068 reste sous la bande) ; sa
> magnitude non. Un chiffre repris d'une fourchette comme s'il était un point est la même faute
> d'unité que celles que ce dépôt documente depuis O-13.

Un triathlète à 10 h **au total** court typiquement 3 à 4 h/semaine. **Mesuré sur les 294 profils
tri/duathlon du golden (V-09) : la médiane est à 2,03 h de course/semaine, l'étendue va de 0,58 à
4,72 h, et ZÉRO profil n'approche les 10 h que l'exposant suppose.** Tous, sans exception, tombent
au plancher de la table d'ancrages. Le moteur applique pourtant à tous l'exposant d'un coureur à
10 h. **Écart : ~13,5 min sur le marathon brut**, et ~15 min sur le total d'un Ironman après
application du facteur ×1,13 — dans le sens optimiste.

C'est la forme exacte du défaut que **P5 a corrigé pour la course sèche** en R14 (« Riegel figé à
1,06 donnait le même marathon à 4 h et à 14 h de course par semaine »), conservé volontairement
pour le tri. La question n'est donc pas « faut-il corriger un oubli » mais **« la calibration
entremêlée est-elle le bon compromis, ou faut-il découpler l'exposant du facteur de fatigue et
recalibrer les deux ? »**.

Le même `sport === "run"` gouverne le **duathlon**, dont les deux segments à pied sont pourtant
ce qui décide la course.

> **À trancher.** Découpler demande de recalibrer `TRI_RUN` (sinon on double effectivement le
> compte) — ce n'est pas un correctif d'une ligne, et le gain d'exactitude se paie en risque de
> régression sur une table déjà validée par l'audit. Ne rien faire est défendable **à condition
> que ce soit un choix, pas un impensé** : c'est ce que ce retest établit.

---

## 8. Question mineure — les segments swimrun sans fourchette

Le banc du lot (T-12) trouve **9 chronos sans fourchette sur 58 examinés**, tous des
décompositions swimrun d'un total qui, lui, en porte une :

```
Dont nage        : 3h34 (31% du temps)
Dont course      : 6h39
Dont transitions : 1h12 (48 passages)
```

Faut-il une fourchette sur chaque sous-segment, ou le total suffit-il à porter l'incertitude ?
Les items non chronométriques (« Vitesse cible », « Part de marche ~35 % », « Effet de binôme
−18 % ») sont hors sujet et exclus du critère : exiger une fourchette sur une cible d'allure
forcerait à projeter le pacing, ce que **P6 interdit explicitement**.

---

## Ce qui n'a PAS été retesté ici

- La **projection au jour J** (`projected`, P1→P11) : elle a son propre banc (`audit:r14`,
  `audit:r14.1`) et a été revue le 13/08 (correctif R30 sur l'affichage des allures).
- Les **prédictions trail** : couvertes par leur module dédié et son mécanisme d'incertitude
  propre (±10 / ±14 / ±20 % selon catégorie), vérifié comme portant toujours une fourchette.
