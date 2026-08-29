# 17 — Diagnostic : pourquoi le pic plafonne à 11,5 h · et pourquoi `G_PLAFOND` n'y est pour rien

**Date** : 24/08/2026 · **Aucune correction** — diagnostic seul, `src/` byte-identique.
**Profil tracé** : `REEL/tri/70.3/nage-limitante` (le profil du fondateur, celui qui plafonne).

---

## ⚠ En une ligne : la prémisse de la mission est réfutée

**`G_PLAFOND` ne borne aucun volume d'entraînement.** C'est le plafond du **GAIN PRÉDIT**
(une fraction : `0,25` = « au plus +25 % de FTP sur un cycle »), consommé uniquement par le
prédicteur et par le raisonnement inverse. Le générateur de plan ne l'importe **nulle part**.

Prouvé par expérience contrôlée (`npm run casser`, `ftp: 0,25 → 0,90`) — le **jumeau
invariance / sensibilité**, les deux moitiés :

| | état courant | `G_PLAFOND.ftp = 0,90` |
|---|---|---|
| **plan livré** (empreinte séances/durées/noms) | `423cccffcebb8c62` | **`423cccffcebb8c62`** |
| pic livré | 11,517 h | **11,517 h** |
| total de la préparation | 363 h | **363 h** |
| **projection `gainPct.ftp`** | 0,109 | **0,300** |

La constante est bien ATTEINTE (la projection triple), et **le plan ne bouge pas d'un bit**.
Le plafond de 11,5 h vient d'ailleurs — c'est l'objet du §3.

---

## 1. Les occurrences de `G_PLAFOND` — 3 fichiers, 4 sites de calcul

```
src/engine/projection.ts:155    export const G_PLAFOND          ← la table (régime ENTRAÎNÉ)
src/engine/projection.ts:295    export const G_PLAFOND_DEBUTANT ← la table (régime « part de zéro »)
src/engine/projection.ts:594    gainInfini()      — interpolation entre les deux régimes
src/engine/feasibility.ts:162   RV3 (course)      — inversion du même modèle
src/engine/feasibility.ts:364   RV3 (legs tri)    — idem, par discipline d'épreuve
src/audit/feasibilityDemo.ts:54 commentaire (note d'erreur historique)
bench_r14_1.cjs:239             critère de banc
```

**Consommateurs : `predictor.ts` et `feasibility.ts`. Zéro occurrence dans `src/generator/` et
`src/sports/`** (vérifié : `grep -rn "G_PLAFOND" src/generator/ src/sports/` → 0).

---

## 2. La formule complète

```
G∞(discipline) = G_plafond(discipline) × h(marge MESURÉE) × k_structure × f_volume
```

**`G_plafond`** — interpolé entre deux régimes selon le volume RÉCENT, jamais un adjectif
déclaré (leçon R14.1/P11) :

```
rg = regimeDebutant(vol_recent)      0 à 4 h/sem → 1 (part de zéro) … ≥ 4 h/sem → 0 (entraîné)
G_plafond(k) = G_PLAFOND[k] + rg × (G_PLAFOND_DEBUTANT[k] − G_PLAFOND[k])

              ENTRAÎNÉ   DÉBUTANT     source
   ftp          0,25       0,32       heuristique de coachs (assumée)
   css          0,22       0,30       heuristique — la technique domine
   thrPace      0,15       0,25       Barnes & Kilding 2015 (économie de course)
   vam          0,20       0,27       heuristique, famille course
```

**`h(marge)`** — interpolé sur des ancres, sur une grandeur **mesurée** : vélo = W/kg au seuil
(profil de Coggan publié : `[2,25 → 1,0] [2,875 → 0,75] [3,625 → 0,5] [4,375 → 0,28]
[5,125 → 0,12]`), course et nage = heuristiques déclarées comme telles. Ancré au MILIEU de
chaque bande, jamais à seuil franc.
**`k_structure`** — le stimulus de la structure d'entraînement des 12 derniers mois.
**`f_volume`** — prescrit ÷ récent, borné `[0,75 ; 1,15]` (le plafond est délibéré : le moteur
ne récompense pas la surcharge).

Puis `GAIN_MAX_ABSOLU` (0,32 en régime débutant) et la saturation temporelle `TAU_WEEKS`
(20 semaines entraîné, 9 débutant) ; `TAPER_GAIN` +1,96 % si l'affûtage est conforme.

**Aucune de ces grandeurs n'est une heure d'entraînement.** Ce sont des pourcentages de
performance.

---

## 3. La VRAIE chaîne du plafond de volume, tracée pas à pas

Entrées déclarées par le profil : `vol_max 20 h` · `vol_recent 13 h` · `sessions_max 12` ·
`dispo quotidienne` · `shift_ok oui` · `doubles oui` · `history confirme` · `level inter` ·
`format 70.3` · `intent competition` · 43 semaines.

La chaîne est un **`min()` de plafonds** puis un **produit de facteurs** (R20.2, 2ᵉ correction) :

| maillon | formule | valeur | retiré |
|---|---|---|---|
| `declared` | `vol_max` saisi | **20,0 h** | — |
| `caps` | `HISTORY_CAPS.tri.confirme["70.3"]` — **une CONSTANTE de table** | **13,0 h** | 7,0 h |
| `util` | `UTIL.tri["70.3"]` — volume au-delà duquel les heures ne servent plus le format | **14,0 h** | — |
| **`structurel`** | **sonde V2.1 : clone SATURÉ de la semaine de pic livrée** | **11,81 h** | **8,19 h** |
| `marg` `recup` `med` `load` | facteurs multiplicatifs | **×1 · ×1 · ×1 · ×1** | 0 |

```
min(20 ; 13 ; 14 ; 11,81) = 11,81  →  × 1 × 1 × 1 × 1  →  volPeak annoncé 11,5 h
                                                          pic LIVRÉ        11,52 h
argmin = structurel · maillon suivant = caps (13 h)
```

La carte l'affiche mot pour mot : *« pic à 11,5 h — ce qui borne, c'est **le nombre de séances**
(−8,2 h/sem) »*.

### Ce qu'est `structurel`, précisément

`planGenerator.ts:4583-4634`. Ce n'est pas une constante : c'est une **mesure**. On clone la
semaine de pic LIVRÉE, on sature chaque séance à son plafond de séance (4 itérations vers une
cible inatteignable), on clampe, et on lit ce que la semaine porte alors :

```
structurel = min( sonde V2.1 initiale , C20 ) puis re-sondé sur la semaine LIVRÉE saturée
           = « ce que cette semaine pourrait porter si chaque séance allait à son plafond »
```

Autrement dit : **nombre de créneaux × durée maximale de chacun**. C'est bien « le nombre de
séances » que la carte nomme.

---

## 4. Global ou par discipline ? — **global**, et c'est mesuré

Les quatre maillons ci-dessus sont **toutes disciplines confondues**. Il n'existe **aucune
somme de plafonds par discipline** dans le moteur : la répartition nage/vélo/course est une
CIBLE (`ALLOC_CIBLE`, décision `allocation`), publiée et jamais forcée — pas un plafond.

Une seule borne est par discipline et touche cette chaîne : **la borne d'épaule** (O-85/O-89,
volume hebdo de nage ≤ k × distance de course), que la re-sonde applique au clone (O-94).
Expérience contrôlée — `swimWeeklyLoadCapM` neutralisée :

| | `structurel` | argmin | **pic LIVRÉ** |
|---|---|---|---|
| état courant | 11,81 h | `structurel` | **11,52 h** |
| borne d'épaule neutralisée | **14,91 h** | `caps` (13 h) | **11,52 h** |

**La borne par discipline déplace le DIAGNOSTIC de +3,1 h et le plan livré de 0,00 h.**

Donc, à la question posée : **non, aucune somme de plafonds par discipline ne peut passer sous
la cible** — le mécanisme n'existe pas. Mais la mesure expose autre chose, et je le signale
comme **hypothèse à vérifier, pas comme conclusion** : sans la borne d'épaule, la chaîne
annoncerait « ce qui borne, c'est ton historique — 13 h » sur un plan qui en livre 11,5. Le
maillon nommé serait alors 1,5 h au-dessus du livré, et la garde d'observation ne le verrait
pas (elle ne refuse qu'un plafond que le plan DÉPASSE).

---

## 5. L'écart avec l'attendu — ni une constante, ni une contrainte de récup

Attendu : 12-14 h+. Livré : 11,5 h. **L'écart se décompose exactement :**

```
20,0 h déclarées
 →  13,0 h   `caps`        CONSTANTE de table (HISTORY_CAPS tri/confirme/70.3)   −7,0 h
 →  11,81 h  `structurel`  MESURE (créneaux × plafonds de séance)                −1,2 h
 →  11,52 h  livré         point fixe (C22, I14, C26c, budget…)                  −0,3 h
```

**Ce n'est PAS une contrainte de récupération** : les quatre facteurs valent ×1 — `marg` (marge
hors compétition, ×1 parce que `intent = competition`), `recup`, `med`, `load` (âge) retirent
**zéro**.

**Ce n'est PAS non plus, principalement, une constante trop basse.** `caps = 13 h` est bien une
constante et elle mord en second — mais même en la levant, le plafond effectif resterait
`structurel` à 11,81. Mesuré ce jour (fiche 08) : en neutralisant **TOUS** les plafonds de durée
de séance (`blockBounds` → `cap: 999999`, facteur unique), le pic de ce profil monte à
**13,00 h** et pas au-delà, et la moyenne de créneaux du corpus est **immobile** (5,46 → 5,47).

### Cause racine (hypothèse la mieux étayée)

**Le nombre de CRÉNEAUX, fixé par le calendrier, pas par une constante.**

```
7 jours × (au plus 3 jours doublés)         →  10 créneaux théoriques
créneaux réellement livrés au pic sur REEL  →   9        (le seul profil du corpus qui double)
moyenne du corpus                           →   5,46
sessions_max déclaré 12  ·  budget annoncé 11  ·  livré 10
```

Trois mesures convergentes le disent :
1. `sessions_max` **sature à 10** : 10, 12 et 14 rendent le même plan (fiche 09, §D) ;
2. le doublage n'ajoute des créneaux qu'aux **3 créneaux** dont la branche `dbl` est ADDITIVE
   (`dur1`, `dur2`, `facileR`) — `facile2` ne double jamais (fiche 09, §1) ;
3. neutraliser tous les plafonds de séance rend **+1,5 h** et rien de plus (fiche 08, §4).

**Il ne manque pas 8 min par séance : il manque UNE séance.** Et l'ajouter n'est pas un réglage,
c'est une branche à écrire dans le module de sport.

---

## 6. Résumé

| question | réponse mesurée |
|---|---|
| `G_PLAFOND` borne-t-il le volume ? | **Non.** Plan byte-identique sous `0,25 → 0,90`, projection ×2,75. Zéro consommateur dans le générateur. |
| Qu'est-ce qui borne, alors ? | `structurel` = créneaux × plafonds de séance = **11,81 h**, devant `caps` 13 h et `util` 14 h |
| Global ou par discipline ? | **Global.** Aucune somme par discipline. La seule borne par discipline (épaule) déplace le diagnostic de +3,1 h et le livré de **0,00 h** |
| Constante trop basse ? | `caps = 13 h` en est une, mais elle n'est pas le maillon mordant |
| Contrainte de récup trop conservatrice ? | **Non** — `recup`, `marg`, `med`, `load` valent tous ×1, ils retirent zéro |
| Cause racine | **le nombre de créneaux**, fixé par le calendrier (7 jours, ≤ 3 doublés) et par le nombre de branches additives du module de sport |

**Aucune correction appliquée.** Les tickets correspondants sont déjà ouverts au registre :
**O-97** (budget annoncé non borné par le calendrier), **O-103** (le cycle de 10 ne livre que
77-82 % de ses positions clés), **O-99** (`vol_max` propose une plage inatteignable).
