# 24 — O-78 : la correction est ÉCRITE et MESURÉE, elle tient son critère principal, et elle en casse un autre

**Date** : 24/08/2026 · **Moteur RESTAURÉ** — `src/` byte-identique, patch conservé dans
`o78-sonde-sans-borne.patch` · **batterie 12/12**
**Ce lot demande un arbitrage** : le correctif fait exactement ce que le brief demande sur son
critère central (**0 plan livré changé sur 1 016**) et fait **monter** le cliquet `S5` au lieu
de le faire baisser. Je ne livre pas ça en silence.

---

## 1. Diagnostic — mesuré, pas supposé

### Le mécanisme, confirmé

`planGenerator.ts`, `blockBounds` — **trois** replis rendent une borne absente :

```
if (s.long) { … cap: CAP_LONG[fmt] || 9999 }          sortie longue d'un format sans entrée
if (b.distanceM != null) return { …, cap: 9999 }      tout bloc prescrit en MÈTRES (C24)
return { floor: 3, cap: 9999 }                        tout bloc de corps sans `bnd`
```

`9999` n'est pas une borne haute : c'est **l'absence de borne**. Dans le plan, `scaleBlock` s'en
sert comme plafond de croissance ; dans la sonde structurelle, la saturation ne rencontre alors
**aucun plafond**.

### Les 8 profils nommés par le brief — vérifiés, pas supposés

| profil | argmin | `structurel` | pic livré |
|---|---|---|---|
| `O-21b/run/10k` ×4 | `boucle-growth` | **60,8 h** | 3,68 h |
| `CYCLE10/run/marathon/inter-competition` | `declared` | **19,7 h** | 9,78 h |
| `CYCLE10/bike/gravel/inter-competition` | `declared` | **19,7 h** | 10,00 h |
| `CYCLE10/duathlon/L/inter-competition` | `declared` | **19,9 h** | 9,45 h |
| `CYCLE10/trail/-/inter-competition` | `caps` | **19,5 h** | 10,22 h |

**Aucun n'a `structurel` comme argmin** — l'affirmation de la fiche 23 est confirmée par la
mesure. La correction ne peut donc pas changer leur plan.

### Le balayage des 1 016

**56 profils sur 1 012 ont `structurel` comme argmin** (swim 23 · tri 18 · swimrun 8 · autres),
dont **13** avec `structurel > 1,3 × pic livré` — c'est-à-dire là où la valeur non bornée est
probablement ce qui parle à l'athlète.

---

## 2. ⚠ Ce que le registre disait déjà, et que le brief ne pouvait pas savoir

**O-78 a déjà été traité — trois correctifs, trois mesures, tous retirés** (entrée
`BUGS_OUVERTS.md` § « O-78 ») :

```
borner « Nage vitesse » seule                → le puits SUIVANT prend le relais (96 → 144 min)
geler la durée des blocs mono-répétition     → il revient sur la nage (144 → 206 min)
borner les 6 créneaux vélo + nage            → 18 VIOLATIONS DURES (brick sous son plancher
                                               audité : 116 min pour 150)
```

**Borner `blockBounds` dans le PLAN est une décision déjà prise et déjà refusée, avec ses
chiffres.** Ce lot ne la rouvre pas.

Ce qui restait non traité est l'autre moitié — **la sonde**, où `9999` produit une affirmation
de capacité que rien ne justifie. C'est là que j'ai écrit le correctif.

---

## 3. Le correctif écrit : la sonde ne prête pas de croissance à un bloc sans borne

Un drapeau levé **uniquement** autour du clone de la re-sonde structurelle : quand il est levé,
un bloc dont aucune borne n'est déclarée garde **sa taille livrée** au lieu de recevoir 9999.
Justification, et elle n'est pas arbitraire : *une capacité est une AFFIRMATION ; un bloc dont
aucune borne n'est déclarée n'autorise aucune affirmation.* Hors sonde, le comportement est
**inchangé** — c'est ce qui garantit le critère central.

### Résultat sur les profils du §1

| profil | `structurel` avant | après | pic livré |
|---|---|---|---|
| `O-21b/run/10k` ×4 | 60,8 h | **4,3 h** | 3,68 h |
| `run/marathon/inter-competition` | 19,7 h | **9,4 h** | 9,78 h |
| `bike/gravel/inter-competition` | 19,7 h | **9,0 h** | 10,00 h |
| `duathlon/L/inter-competition` | 19,9 h | **8,2 h** | 9,45 h |
| `trail/-/inter-competition` | 19,5 h | **14,3 h** | 10,22 h |

Profils avec `structurel > 1,3 × pic` : **13 → 5**.

### Le critère central est tenu, et mesuré directement

**0 plan livré changé sur 1 016.** Empreinte des séances (discipline, nom, minutes, nombre de
steps) calculée sur tout le corpus avant et après : **aucune différence**. Le golden bouge sur
**866 profils**, mais uniquement par les **décisions** — la chaîne R20.2 dit maintenant autre
chose, ce qui est l'objet du lot.

---

## 4. ⚠ Ce qui casse, et pourquoi je ne le livre pas seul

**Le cliquet `S5` monte : 521 → 670.** Le brief attendait une baisse.

Le mécanisme, mesuré : `S5` compte les plans où `min(plafonds) ≠ pic livré`. Une fois la sonde
bornée, `structurel` tombe **sous** le pic livré sur beaucoup de profils (9,4 pour 9,78 ; 8,2
pour 9,45) — donc le `min()` brut s'écarte du pic plus souvent.

**Et la cause profonde est une SECONDE COMPUTATION** (`seal.ts:159`, `s5IdentiteR202`) :

```js
const min = Math.min(...actifs);        // le GARDE recalcule le minimum BRUT
```

alors que le moteur, lui, ne nomme jamais ce minimum-là :

```js
const candidats = actifs.filter((p) => p.livre >= volPeak - 0.1);   // garde d'observation
const minP = (candidats.length ? candidats : actifs).reduce(min);   // l'argmin PUBLIÉ
```

**Le garde mesure une grandeur que le produit n'affiche pas.** C'est la forme R11.1 que ce dépôt
refuse partout ailleurs — et elle était invisible tant que tous les plafonds étaient au-dessus du
pic livré.

### Les deux états mesurés, pour l'arbitrage

| | `structurel` réaliste | `S5` | `argmin = structurel` |
|---|---|---|---|
| **aujourd'hui** (`main`) | non — 19,7 h pour 9,78 | **521** | 56 / 1 012 |
| **sonde bornée** (le patch) | **oui** — 9,4 h pour 9,78 | **670** | 167 / 1 012 |
| sonde bornée **+ plancher au pic livré** | oui, mais jamais sous le livré | **521** (inchangé) | **498 / 1 012** |

La troisième ligne est la variante que j'ai écrite en premier puis **retirée** : elle garde `S5`
intact, mais en clampant la capacité au pic livré elle rend `structurel` argmin sur **la moitié
du corpus** — c'est-à-dire qu'elle fabrique la conclusion « ce qui te borne, c'est le nombre de
séances » par construction. **C'est O-43 dans sa forme exacte** (*« une sortie calculée ne se
relit jamais comme une entrée »*), et c'est pour ça qu'elle est dehors.

---

## 5. Ce que je te demande de trancher

**Une question, deux options, toutes deux mesurées :**

**(A)** Livrer le patch **et** corriger `s5IdentiteR202` pour qu'il lise l'argmin **publié par le
moteur** au lieu de recalculer un `min()` brut. Défendable indépendamment (R11.1 : une seule
computation), mais c'est **modifier un garde dans le commit qui le fait rougir** — la chose que
ce dépôt surveille le plus.

**(B)** Livrer le patch et **déclarer `S5` en rouge attendu** avec son ticket, comme les 25
autres du banc, en laissant le garde intact jusqu'à ce que l'identité T-25 soit reformulée à
part.

**En attendant : rien n'est livré côté moteur.** `src/` est byte-identique, le patch est conservé
dans `o78-sonde-sans-borne.patch`, la batterie est **12/12**.

---

## Vérifications

```
src/                0 ligne modifiée · patch conservé (65 lignes)
plans livrés        0 changement sur 1 016 (empreinte séances avant/après)
npm run batterie    12/12 verts
audit:v1            459 combinaisons · 0 violation dure
```
