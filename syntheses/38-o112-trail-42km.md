# 38 — Fiche 40 : O-112 fermé — le seuil d'âge du trail passe de 50 à 42 km

*Livré le 01/09/2026 · batterie **12/12** · `audit:v1` 459 à 0 · golden **1069 → 1071**,
**0 écart** sur les 1069 existants · `audit:sensibilite`, `check:app`, `check:sw` verts.*

---

## Ce qui a été changé

Une constante, `src/engine/answerSchema.ts` :

```
AGE_MINI_TRAIL_KM = 50   →   42
```

La borne d'âge × format (R15.7-C) travaille sur des FORMATS pour les six autres sports. Le
trail n'en a pas — sa distance est une réponse libre de 1 à 500 km — il est donc borné par une
DISTANCE. À 50 km, un trail de 42 km était générable dès 16 ans quand `run/marathon`, la même
distance avec **moins** de dénivelé et **moins** de temps d'effort, est fermé jusqu'à 18 ans.

---

## §2-§3 — la mesure avant/après

Profil identique de part et d'autre (`inter`, `confirme`, 8 h/sem, 5 séances, D+ 1 800 m,
terrain vallonné, accès collines) — seuls la distance et l'âge varient.

| km | 16 ans | 17 ans | 18 ans |
|---|---|---|---|
| | avant → après | avant → après | avant → après |
| 21 | plan 5,08 h → **plan 5,08 h** | plan 5,08 h → **plan 5,08 h** | plan 7,38 h → plan 7,38 h |
| 30 | plan 5,08 h → **plan 5,08 h** | plan 5,08 h → **plan 5,08 h** | plan 7,38 h → plan 7,38 h |
| 41 | plan 5,07 h → **plan 5,07 h** | plan 5,07 h → **plan 5,07 h** | plan 7,17 h → plan 7,17 h |
| **42** | plan 5,07 h → **REFUS ÂGE** | plan 5,07 h → **REFUS ÂGE** | plan 7,17 h → plan 7,17 h |
| **45** | plan 5,07 h → **REFUS ÂGE** | plan 5,07 h → **REFUS ÂGE** | plan 7,15 h → plan 7,15 h |
| **49** | plan 5,07 h → **REFUS ÂGE** | plan 5,07 h → **REFUS ÂGE** | plan 7,22 h → plan 7,22 h |
| 50 | REFUS ÂGE → REFUS ÂGE | REFUS ÂGE → REFUS ÂGE | plan 7,22 h → plan 7,22 h |
| 62 | REFUS ÂGE → REFUS ÂGE | REFUS ÂGE → REFUS ÂGE | plan 7,22 h → plan 7,22 h |
| 100 | REFUS ÂGE → REFUS ÂGE | REFUS ÂGE → REFUS ÂGE | plan 6,90 h → plan 6,90 h |

**La bande [42, 50) bascule aux deux âges mineurs, et rien d'autre ne bouge.** Sous 42 km, le
plan est rendu à l'identique ; au-dessus, le refus existait déjà.

### §4 — aucun adulte touché

La colonne **18 ans est identique au centième** sur les neuf distances balayées : 7,38 · 7,38 ·
7,17 · 7,17 · 7,15 · 7,22 · 7,22 · 7,22 · 6,90 h avant comme après. Confirmé par le golden
(voir ci-dessous) : aucun des 1 069 profils existants ne change d'un bit, y compris les 68
profils trail, tous à 62 km et tous adultes sauf `AGE/trail/-/12` — déjà refusé avant le lot.

### Le message de refus se dérive, il ne se recopie pas

Le repli proposé à l'athlète est calculé à partir de la constante, donc il suit tout seul :

> « À 16 ans, l'inscription à un trail de 42 km est refusée par la quasi-totalité des
> organisateurs : l'âge minimum y est de 18 ans. […] Ce qui est possible tout de suite : **des
> distances plus courtes (jusqu'à 41 km)** — et le plan long redeviendra disponible à tes
> 18 ans, sans rien perdre de ce que tu auras construit d'ici là. C'est une règle d'inscription,
> pas un jugement sur ton niveau. »

Il n'y a pas de second nombre à tenir à jour.

---

## Le golden ne pouvait pas voir ce changement — deux profils ajoutés

`golden:verify` rendait **0 écart** sur les 1 069 profils. C'est le résultat attendu **et il ne
prouvait rien** : les 68 profils trail du corpus courent tous 62 km, c'est-à-dire au-dessus de
l'ancien seuil comme du nouveau. Un « 0 » dont le succès est indiscernable de la vacuité —
exactement ce que la règle « un zéro a besoin de sa population » vise.

Deux profils encadrent donc désormais la frontière, dans les deux sens :

| clé | résultat photographié |
|---|---|
| `AGE/trail/45km/17` | `{"REFUS":"format","ATTENDU":"un format ouvert à 17 ans"}` |
| `AGE/trail/45km/18` | plan de 22 semaines, pic 8,93 h |

`POPULATION` passe de **1069 à 1071** dans `goldenMaster.mjs` et `goldenBundle.mjs`, avec sa
raison écrite à côté du nombre. Le diff de `golden/hashes.json` est de **+2 lignes, 0
modification** : les 1 069 profils existants sont inchangés au bit près, ce qui est le critère
d'acceptation de la fiche.

*Détail d'écriture publié : ma première version mettait `"45km"` dans le champ `format` du
profil pour que la clé le porte. Le trail n'a pas de format — le schéma l'aurait refusé.
L'étiquette de clé est donc portée à part, et `a.format` reste vide.*

---

## Gates

`audit:v1` **459 à 0 violation dure** · `npm run batterie` **12/12** · `audit:sensibilite` vert ·
`check:app` vert · `check:sw` vert (`eb-pwa-c1366ef48ab1`, 63 assets).

---

## Registre

**O-112 fermé.** Restent ouverts : O-77, O-97, O-99, O-100a/b, O-101, O-102, O-105, O-111.
