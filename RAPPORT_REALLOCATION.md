# §3 — LA RÉALLOCATION N'EXISTE PAS, ET LA COUPE COÛTE PLUS QUE CE QU'ELLE RETIRE

**Le vrai livrable du lot**, comme tu l'avais prévu. Ton hypothèse est confirmée, et le chiffre
est pire que l'énoncé.

## La mesure

**Isolation stricte** : le MÊME profil, sous deux plafonds de temps dur — 60 min (le plafond
réel) et 600 min (inatteignable, donc « sans plafond »). Rien d'autre ne change : ni
l'historique, ni la cadence de récup, ni le volume déclaré. La sonde était un override
temporaire de `hardTimeCapMin`, **retiré après mesure** (`src/` est vérifié identique, audit
459 vert).

*(Ma première tentative comparait `reprise` et `confirme` pour obtenir deux plafonds : elle
change AUSSI `HISTORY_CAPS` et `RECUP_EVERY`. Elle rendait « partielle » partout, ce qui ne
voulait rien dire — trois grandeurs bougeaient ensemble.)*

### Le témoin du §3 — `semi/inter/4:30`

| plafond de dur | pic livré | facile | dur (pondéré) | sortie longue |
|---|---|---|---|---|
| 600 (sans plafond) | **386 min** | 310 | 76 | 130 min |
| 60 (le vrai) | **365 min** | 300 | 65 | 126 min |
| **effet du plafond** | **−21 min** | **−10** | **−11** | **−4** |

Le plafond retire **11 minutes de qualité, et la semaine en perd 21**. Non seulement rien ne
remplace ce qui est retiré — **la coupe emporte 10 minutes de facile avec elle**.

### Sur les 949 profils

| | |
|---|---|
| profils où le plafond retire du dur | **44** |
| dur retiré, total | 8 097 min |
| volume perdu, total | **13 009 min** |
| ratio volume perdu / dur retiré | **médiane 1,27 · moyenne 1,61 · max 2,43** |
| profils où le volume perdu dépasse le dur retiré | **28 / 44** |
| pire cas | `PW/tri/S/plat` : dur −440 min → **volume −1 068 min** |

## Le verdict

**Il manque une règle de réallocation, et c'est un défaut à part entière** — exactement la
branche que ton §3 désignait. Mais le chiffre dit plus : le mécanisme ne se contente pas
d'oublier de remplacer, il **amplifie**. Retirer une minute de qualité coûte en moyenne 1,6
minute de semaine.

La cause est mécanique et se lit dans l'ordre des passes : `enforceHardTimeCap` retire des
répétitions, le total de la semaine baisse, puis le point fixe (C22, « dev ≤ pic », le lissage
sur le LIVRÉ) recale les semaines voisines sur ce total plus bas, et la sortie longue — bornée
en part de semaine — suit. Une seule coupe se propage.

**Physiologiquement, c'est à l'envers**, et ta formulation est la bonne : un entraîneur qui
retire une séance de qualité la remplace par de l'endurance de durée au moins égale. Ici, la
séance tombe et la semaine tombe avec elle.

## Ce que ça implique pour la suite

1. **B-02c (plafond proportionnel) reste gaté**, et cette mesure en est la deuxième raison :
   tout resserrement de C26, par quelque chemin que ce soit, produira les mêmes régressions
   tant que la coupe amplifie. Ce n'est pas propre à 12 % — c'est propre au mécanisme.
2. **Le ticket de réallocation est plus important que le calibrage** : `enforceHardTimeCap`
   doit RENDRE en facile ce qu'il retire en dur (le patron existe déjà dans le dépôt —
   `refillEasyAfterLabelCap` fait exactement ça pour I14b, et C30b redistribue en restant
   neutre en volume).
3. **Il touche 44 profils sur 949 aujourd'hui**, mais il gouverne tout resserrement futur.

**Non écrit** : la règle de réallocation elle-même. Elle change le volume livré de 44 profils
et son plancher (« au moins égale » ? « exactement égale » ?) est un arbitrage d'entraînement,
pas une évidence — et c'est le genre de décision que ce chantier a appris à ne pas prendre à ta
place.
