# Fiche 47 — Le gate de monotonie, et la cause d'O-77 enfin nommée

**Date : 01/09/2026.** Tâche 1 : un gate livré, intégré à la batterie. Tâche 2 : mesure seule,
aucune ligne de moteur — `src/` est byte-identique (vérifié), toutes les mutations sont passées
par `npm run casser`.

---

## Tâche 2 — La cause d'O-77 : `_capScale` compare une semaine à l'AMBITION du plan

**La bisection converge en trois neutralisations à facteur unique.** Premier pas : diffe le
`ReasonedPlan` complet entre `vol_max` 9 et 13 — seuls **cinq champs** diffèrent, tous dérivés de
`vol_max` (`volPeak`, `volBase`, `peakH`, `sessionScale`, `volLimits.declared`). `sessionScale`
était déjà réfuté (fiche 46). Restait la COURBE.

```
S1 · tri/70.3 · vol_recent 9 · un seul facteur varie
état                              vol_max 9   vol_max 13   écart
moteur intact                       82 min       51 min      −31
sessionScale forcé à 1              82 min       51 min      −31   ⇒ pas lui (fiche 44 réfutée)
peakH gelé (les deux à 9)           82 min       82 min        0   ⇒ la COURBE porte TOUT
                                                                    (semaine identique : 455 = 455)
_capScale = 1                       82 min       90 min       +8   ⇒ l'inversion CHANGE DE SIGNE
```

**La cause, nommée : `planGenerator.ts:3341`.**

```js
_capScale = Math.max(0.4, Math.min(1, (Lw - 0.5) * 1.2 + 0.4));   //  Lw = cible / peakH
```

`_capScale` met à l'échelle le **plafond de séance** de la semaine, et il est dérivé de `Lw`, une
position **RELATIVE au pic DÉCLARÉ**. Or la cible ABSOLUE de la semaine 1 ne bouge pas (le
plancher O-69 la fige à 0,85 × volume récent) : déclarer un pic plus haut abaisse donc la place
relative de cette semaine, et avec elle son plafond de séance.

```
                Lw       _capScale   plafond de la longue (100 min)   LIVRÉ
vol_max  9     0,85        0,82                 82 min                 82
vol_max 13     0,588       0,506                51 min                 51
```

**L'identité est arithmétique, pas approchée** : 100 × 0,82 = 82 et 100 × 0,506 = 51 SONT les
valeurs livrées. C'est une faute de MONNAIE (règle 14) : le plafond d'une séance doit suivre ce
que l'athlète peut faire CETTE semaine — une grandeur absolue —, pas la place de cette semaine
dans une ambition déclarée.

**⚠ RECTIFICATION de ma fiche 46** : j'y écrivais « la longue est livrée à son PLANCHER de
format ». C'est faux — elle est livrée à son **plafond mis à l'échelle**. Le plancher (50 min)
n'a jamais mordu ; la coïncidence 51 ≈ 50 m'avait trompé.

### Le défaut n'est pas propre à `vol_max` — et c'est le gate qui l'a montré

Le gate de la tâche 1 trouve la MÊME racine sur l'axe **`history`** en swimrun : elle ferme
entièrement sous `_capScale = 1`. `history` déplace `peakH` par les plafonds, donc `Lw`, donc le
plafond de séance de toutes les semaines. **Toute entrée qui déplace le pic déforme la taille des
séances du début du plan.**

### Premier avis sur le correctif (demandé §2.3) — local en surface, structurel au fond

Une formule, une ligne. Mais `_capScale` **EST** la trajectoire positionnelle du plafond de
séance : la corriger, c'est choisir sur quoi elle s'ancre — donc rouvrir l'approche A du
diagnostic. Deux ancrages, à arbitrer par le fondateur :

- **sur la POSITION** (semaine k sur n, indépendante de l'ambition déclarée) — cohérent avec le
  patron `swimSessionCapAtWeek` déjà dans le dépôt ;
- **sur l'ABSOLU de l'athlète** (la cible de la semaine rapportée à son volume récent) — cohérent
  avec O-69, qui fige déjà le départ sur cette référence.

Non écrit dans cette fiche, conformément au diagnostic.

### §2.4 — Ce que la cause explique parmi les 283 « pics précoces »

```
                        moteur intact   _capScale = 1
profils touchés              283            269
   dont NAGE                   81             19      ⇒ −77 % : la cause explique 62 cas sur 81
   dont VÉLO                  250            258      ⇒ inchangé — c'est O-91 (le brick prend
                                                        le créneau long), comme prévu
   dont COURSE                 15             23      ⇒ inchangé
```

**La cause d'O-77 explique la grande majorité des pics précoces en NATATION** (les cas que la
fiche 46 signalait comme non expliqués par O-91), et **aucun** de ceux du vélo — ce qui confirme
au passage que la lecture « les 250 cas vélo sont la substitution voulue » était juste.

---

## Tâche 1 — Le gate de monotonie (`npm run audit:monotonie`, 13ᵉ gate)

**Ce qu'il garde** : quatre inversions ont été trouvées dans ce dépôt, sur quatre axes, et
**aucune par un gate** — chacune l'a été parce que quelqu'un a pensé un jour à faire varier cette
entrée-là. Le diagnostic 46 a mesuré que leurs racines sont distinctes ; ce qu'elles partagent est
une ABSENCE. Ce banc est cette absence comblée.

**Dérivé du schéma** : les VALEURS de chaque axe viennent d'`ANSWER_SCHEMA` (`domain` d'un enum,
`min`/`max` d'un nombre). Ce qui ne peut pas s'en dériver est le SENS de l'ordre — aucun champ ne
dit « avancé, c'est plus que débutant » : `AXES` ne déclare que ça, une ligne par axe.

**Trois familles de propriétés**, parce qu'elles ne sont pas la même :

```
plus        déclarer PLUS ne doit jamais livrer MOINS          vol_max · level · history
invariant   changer la valeur ne change pas le VOLUME livré    pace · css   (propriété d'O-21b)
position    une décharge ne pèse jamais plus que sa charge     phase        (propriété d'O-93)
            voisine, PAR TYPE et PAR DISCIPLINE
```

**Mesuré PAR POSITION, jamais en agrégat (règle 21)** — c'est la leçon la plus chère du chantier :
la médiane de la sortie longue d'O-77 est MONOTONE (82 → 93 → 93) pendant que la semaine 1
s'effondre de 82 à 51. On compare semaine de charge par semaine de charge, à rang égal.

### Résultat

```
24 vert(s) · 4 dette(s) déclarée(s) · 0 régression(s)
population : 1 628 comparaisons de position sur 28 critères, 7 sports
```

Dette triée AVANT de rendre le banc bloquant (leçon R20.6), chacune avec son ticket ET son
attribution mesurée :

| critère | ticket | attribution |
|---|---|---|
| `MONO-tri-vol_max` | O-77 | ferme sous `_capScale = 1` (et change de signe) |
| `MONO-swimrun-history` | O-77 | **même racine, autre axe** — ferme entièrement |
| `MONO-bike-vol_max` | O-77 + **O-113** | 7 inversions sur 10 ferment ; 3 survivent (≈ −9 %), cause inconnue |
| `MONO-trail-phase` | **O-114** | 5 inversions de type que T-56 ne ferme PAS |

### Quatre fautes de MON instrument, trouvées en le mesurant et publiées

1. **Portée trop large.** Première écriture : tous les axes jugés aussi sur la plus grosse séance
   de chaque discipline. Elle rendait 15 « inversions » sur `level` et `history` — or un débutant
   qui reçoit une sortie facile PLUS LONGUE qu'un confirmé n'est pas une inversion, c'est la
   restructuration voulue. La portée appartient à l'axe : `semaine` pour `level`/`history`/allure,
   `semaine+seance` pour `vol_max` seul (déclarer plus de temps ne doit raccourcir aucune séance).
2. **Bande de balayage inerte.** Les valeurs tirées des bornes du schéma (`vol_max` 1 à 40 h)
   donnaient 15, 24 et 36 h — trois valeurs au-delà de tout ce qu'un plan peut livrer, donc trois
   plans identiques : **le banc rendait « monotone » et ne voyait pas O-77**, l'inversion qu'il
   existe pour voir. Un axe se balaie sur la bande où il AGIT (angle mort A-2).
3. **Une condition de visibilité prise pour un réglage.** À `vol_recent: 6`, `tri · vol_max`
   ressortait VERT — sur le profil même où O-77 se reproduit. C'est le plancher O-69 qui fige la
   cible et révèle l'inversion : sans un volume récent fixe et non trivial, cible et plafond
   bougent ensemble et se compensent.
4. **Le critère de phase était VACUEUX, et c'est la contre-preuve qui l'a dit.** Il comparait le
   TOTAL de la semaine : retirer la garde T-56 le laissait VERT. O-93 porte sur le TYPE et la
   DISCIPLINE, pas sur le total — que garde déjà `recupHeavier`, côté auditeur. Réécrit, il rougit
   bien sur tri, duathlon et swimrun quand T-56 est retirée.

**Contre-preuve, dans les deux sens** : garde T-56 retirée → tri, duathlon et swimrun passent au
ROUGE (le critère est sensible) ; trail reste rouge **dans les deux états** — c'est ce qui range
ses 5 inversions en défaut PRÉEXISTANT (O-114) plutôt qu'en régression.

### Deux inversions nouvelles, signalées et NON corrigées (comme la fiche le demande)

- **O-113** — résidu de `vol_max` en vélo : 3 inversions sur 10 survivent à `_capScale = 1`,
  autour de −9 % (200 → 183 min). Cause non identifiée.
- **O-114** — cinq inversions de récupération en trail que T-56 ne ferme pas : « Back-to-back
  (sur jambes fatiguées) » **92 min en décharge contre 80 en charge**, « Marche rapide en
  montée » 90 contre 81, « Footing récup » 40 contre 30.

---

## Critères d'acceptation

- **Tâche 1** : gate livré, intégré à `npm run batterie`, **0 faux positif** sur les inversions
  fermées (I13/niveau, O-21/allure, O-93/phase — tous verts sur les 7 sports), **O-77 détectée**
  (dette déclarée avec son ticket). Deux inversions nouvelles trouvées par construction, §4 servi.
- **Tâche 2** : cause nommée avec sa mesure d'isolation (4 neutralisations à facteur unique),
  avis sur le correctif donné, §2.4 mesuré.
- **`golden:verify` 0 écart** — aucune des deux tâches ne change un plan livré (`src/`
  byte-identique).
- **`audit:v1` 459 à 0** et **batterie complète**, gate de monotonie compris.
