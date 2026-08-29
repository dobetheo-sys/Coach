# 23 — Le corpus `use10` passe de 5 à 31 profils, et les 7 sports sont couverts

**Date** : 24/08/2026 · **`src/` byte-identique** (0 ligne) — corpus et cliquets seuls.
**Gates** : `npm run batterie` **12/12** · `audit:v1` **459 à 0** · `golden:bundle` régénéré.

---

## 1. La condition, et ce que les 5 profils couvraient

```
reasoningEngine.ts:373
use10 = dispo === "quotidienne" && shift_ok === "oui" && offDays.length < 2
```

Les 5 profils existants :

| profil | sport | format | niveau | intention | historique |
|---|---|---|---|---|---|
| `O-21b/run/10k` ×4 | run | 10k | **debutant** | competition | confirme |
| `REEL/tri/70.3` | tri | 70.3 | inter | competition | confirme |

**Deux sports sur sept. Deux formats. Une seule intention.** Les quatre `O-21b` ne diffèrent que
par l'ALLURE — c'est un axe, pas une famille.

### ⚠ Et le corpus portait une garde qui en avait l'air

La passe garde-fous pose `["doubles", { doubles: "oui", dispo: "quotidienne" }]` — **mais jamais
`shift_ok`**. Elle couvre donc le **DOUBLAGE** et pas le **CYCLE**, alors que son nom et sa
`dispo` laissent croire l'inverse. **Dixième occurrence d'A-2 : un angle mort qui ressemble à une
couverture.**

---

## 2. Ce qui manquait, et ce qui a été ajouté

**26 profils**, tous à `use10 = true` (vérifié — aucun fixture inerte) :

| famille | format | variantes |
|---|---|---|
| `run` | marathon | debutant-plaisir · inter-competition · avance-finir |
| `bike` | gravel | idem |
| `swim` | fond | idem |
| `tri` | **S** | idem |
| `tri` | **Full** (ironman complet) | idem |
| `trail` | — | idem |
| `duathlon` | L | idem |
| `swimrun` | series | idem |
| `tri/Full` + `trail` | **datés** | `plan_start` épinglé + `race_date` fixe |

**Méthode : celle du corpus, pas une méthode ad hoc.** Tout vient de `base()` et des
`trailExtras()` / `swimrunExtras()` / `triExtras()` existants ; seuls varient les axes nommés
par le brief (sport, format, niveau, intention) plus les trois clés de `use10`. **Aucune valeur
inventée.**

**Les deux profils datés portent `plan_start`** : sans lui, un profil daté redémarre au lundi
courant et dérive d'une semaine **chaque lundi** — mesuré le 24/08 sur `REEL`, `golden:verify`
rouge un jour sur sept (fiche 15). La branche « course datée » sous `use10` est couverte sans
rendre la photo périssable.

---

## 3. Le résultat

```
corpus      990 → 1 016 profils
use10         5 →    31 profils
sports        2 →     7   (tri 8 · run 7 · trail 4 · bike 3 · duathlon 3 · swim 3 · swimrun 3)
```

**Aucun crash, aucun refus inattendu** : les 26 construisent un plan. `audit:v1` reste à
**459 combinaisons, 0 violation dure** (il balaie son propre espace, pas le golden).

---

## 4. ⚠ Ce que l'élargissement révèle, avant même de toucher au chantier

### a) Deux tiers des nouveaux profils annoncent un plafond que leur plan ne livre pas

Le cliquet `S5` du sceau (plans où `min(plafonds) ≠ pic livré`, T-25) passe de **504 à 521** :
**+17 sur 26 nouveaux profils, soit 65 %**, contre 51 % sur le corpus historique.

Et la mesure directe le confirme, sur des familles jamais testées :

| profil | `structurel` annoncé | pic livré |
|---|---|---|
| `CYCLE10/run/marathon/inter-competition` | **19,7 h** | 9,78 h |
| `CYCLE10/duathlon/L/inter-competition` | **19,9 h** | 9,45 h |
| `CYCLE10/trail/-/inter-competition` | **19,5 h** | 10,22 h |
| `CYCLE10/bike/gravel/inter-competition` | **19,7 h** | 10,00 h |

C'est la famille **O-78** — `blockBounds` rend `cap: 9999` pour les blocs de corps sans `bnd`,
donc la saturation du clone ne rencontre aucun plafond. **Elle était visible sur un sport
(les 4 `O-21b/run`), elle l'est maintenant sur cinq.** Le maillon n'est pas l'argmin sur ces
profils (`declared` ou `caps` gagne), donc l'athlète ne le lit pas — mais c'est une valeur
fausse dans un record que T-25 lit.

### b) Le cycle est plus stable que la semaine — sauf là où la semaine l'était déjà

Créneaux livrés, dernier cycle tronqué exclu :

| famille | par SEMAINE | par CYCLE |
|---|---|---|
| `tri/Full` | 6-6 | **8-10** |
| `run/marathon` | 5-5 | **6-8** |
| `swimrun/series` | 5-6 | **8-8** |
| `bike/gravel` | 5-6 | **8-9** |

Sur les familles à semaine déjà constante (`run`, `tri/Full`), **c'est le CYCLE qui varie**.
Confirmation de l'observation de la fiche 22 : *le cycle est une unité plus stable en moyenne,
pas une unité invariante* — et il faudra en tenir compte pour juger les étapes 3-7.

### ⚠ Une faute d'instrument, publiée

Ma première lecture donnait « créneaux par cycle **2**-10 » : elle **comptait le dernier cycle**,
tronqué par la fin du plan. Corrigée, la fourchette est **6-10**. Le minimum ne mesurait que la
coupe — même famille que l'erreur d'unité que ce chantier corrige.

---

## 5. Les cliquets, ré-épinglés avec leur cause

Le moteur est **byte-identique** dans ce lot (`git diff --stat -- src/` : 0 ligne). C'est la
preuve mécanique qu'exige `base:cliquet` — **le nouveau corpus rejoué contre un moteur
inchangé** : ce qui monte, c'est la population.

| cliquet | avant | après | cause |
|---|---|---|---|
| `POPULATION` (golden + bundle) | 990 | **1 016** | +26 profils |
| sceau `S1` | 4 | **7** | population |
| sceau `S4` | 341 | **342** | population |
| **sceau `S5`** | 504 | **521** | population — **et 65 % des nouveaux, voir §4a** |
| `PIC_ATTENDU.profils` | 188 | **192** | +4 profils tri dans la population du test |
| `PIC_ATTENDU.vo2Min` | 8 244 | **8 292** min | population |
| `PIC_ATTENDU.seuilM` | 411 251 | **425 201** m | population |

`T-60` (plancher de fréquence) et `T-62` (périodisation d'intensité) **ne bougent pas** : les
26 nouveaux profils n'ajoutent ni semaine à zéro ni VO2max en base.

---

## 6. Ce qui n'a PAS été fait

L'**étape 3** (courbe et C22 par cycle, lecture (i) actée) n'est pas touchée — c'est la fiche
suivante, et le brief le demande explicitement. Ce lot est une **mesure de référence** : le
corpus élargi est photographié **avec le code actuel**, avant que le chantier continue.

---

## Vérifications

```
corpus            1 016 profils · 31 à use10 · 7 sports
src/              0 ligne modifiée
audit:v1          459 combinaisons · 0 violation dure
golden:capture    1 016 profils · golden:verify et golden:bundle verts
npm run batterie  12/12
lotPhysio         32 verts · 25 rouges attendus · 0 régression
```
