# 20 — Étape 0 : le partage de la dérive O-103 · **non additif, et le chevauchement est la condition nécessaire**

**Date** : 24/08/2026 · **Mesure seule** — `src/` byte-identique.
**Population** : les **5 profils qui activent `use10`** (`O-21b/run/10k` ×4, `REEL/tri/70.3`).

---

## 1. Méthode

**L'attendu d'une position est OBSERVÉ, jamais modélisé** : pour chaque `(jc, isR)`, le créneau
attendu est celui que la **majorité** des cycles y pose. Recopier la table de `schema()` dans la
sonde ferait une seconde source de vérité (R11.1) — et la table n'est pas exportée.

**Neutralisation de la cause 1 (chevauchement)** : `dispo: "semaine"` sur le MÊME profil →
`use10 = false`, `cycleLen = 7`, plus aucun chevauchement cycle ↔ semaine. Tout le reste
identique. Reproductible en une ligne.

**Neutralisation de la cause 2 (passes)** : deux voies, parce qu'aucune ne suffit seule.
(a) **un traceur non ambigu** — un jour `off` avec `forced = false` ne peut pas venir du schéma
de charge (il n'en contient aucun) : c'est nécessairement une passe. *(Poser `facileR` sur un
jour déjà `facileR` ne laisse aucune trace : un correcteur qui réussit efface la sienne.)*
(b) **`npm run casser`** sur la passe suspectée, une à la fois.

---

## 2. Le tableau

| | jours de charge | **dérive totale** | **dérive sur position CLÉ** |
|---|---|---|---|
| `REEL/tri/70.3` · **cycle 10** | 217 | **13 (6,0 %)** | **13/82 (15,9 %)** |
| `REEL/tri/70.3` · cycle 7 | 217 | **0 (0,0 %)** | **0/93 (0,0 %)** |
| `O-21b/run/10k` ×4 · **cycle 10** | 42 | **7 (16,7 %)** | **3/12 (25,0 %)** |
| `O-21b/run/10k` ×4 · cycle 7 | 42 | **0 (0,0 %)** | **0/12 (0,0 %)** |

Détail des dérives sur positions clés :
`REEL` — `dur2→facileR` ×6 · `dur2→dur1` ×6 · `dur2→durLong` ×1.
`run` — `dur2→facileR` ×2 · `dur1→off` ×1.

### Part attribuable au chevauchement seul

**100 % — la dérive est nulle dès que `cycleLen = 7`, sur les cinq profils, sans rien d'autre
changer.**

### Part attribuable aux passes seules

**0 % mesuré — et c'est le résultat le plus important du §2, parce qu'il réfute le partage
additif.** Les passes **tournent dans les deux états** :

| | OFF posés par une passe | dont sur une position **clé** |
|---|---|---|
| `run` · cycle 10 | **20** | **1** |
| `run` · cycle 7 | **18** | **0** |
| `REEL` · cycle 10 | **0** | 0 |
| `REEL` · cycle 7 | **0** | 0 |

Les passes ne sont donc **pas activées par le cycle** : elles s'exécutent 18 fois à 7 jours et
20 fois à 10, et ne touchent une position clé **que sous le cycle de 10**.

⚠ **Et sur `REEL`, aucune passe n'a posé un seul `off`** — ses 13 jours de dérive ne viennent
donc pas de cette famille-là.

---

## 3. Les deux causes INTERAGISSENT — le partage additif ne tient pas

C'est la réponse explicite à la tâche 4 du brief.

```
sans chevauchement  →  les passes tournent, dérive 0
avec chevauchement  →  les passes tournent, dérive 6 à 17 %
```

**Le chevauchement est la condition NÉCESSAIRE ; les passes sont le MÉCANISME.** Aucune des deux
ne produit la dérive seule :

- retirer les passes sans toucher au cycle : rien ne réécrirait plus un créneau — mais rien ne
  poserait plus les `off` d'impact ni les planchers de volume, ce qui casse des règles de
  sécurité. **Ce n'est pas une option**, et c'est pourquoi je ne l'ai pas mesuré ainsi ;
- retirer le chevauchement sans toucher aux passes : **dérive 0, mesuré**.

**Écrire « X % au chevauchement, Y % aux passes » serait faux.** Le partage juste est :
*le chevauchement explique 100 % de la présence de la dérive ; les passes en expliquent 100 %
de la forme* (quel créneau devient quoi).

### Ce qui rend l'interaction concrète : les passes sont clés sur la SEMAINE

Mesuré : **31 sites** de `src/` filtrent ou testent une **semaine calendaire**
(`d.week === w`, `w % 2`, `weekNum % 2`), dont **6 dans les modules de sport** (l'alternance
B1/B2, la nuit du trail). Tant qu'un cycle de 10 jours est découpé en semaines de 7, chacun de
ces sites voit une tranche différente du cycle à chaque semaine.

---

## 4. Une hypothèse à moi, REFUTÉE par la mesure

J'ai suspecté la passe VO2 de développement (`weekBuilder.ts:535-556`) : elle est clé sur
`w % 2`, elle filtre `days.filter(d => d.week === w)`, et **elle est le seul site de `src/` qui
écrit `slot = "dur1"`** — ce qui collait exactement aux 6 `dur2→dur1` de `REEL`.

**Neutralisée par `npm run casser` (`if (days.some(isVo2)) return;` → sortie immédiate) : la
dérive ne bouge pas d'un jour — 13/217, 13/82, mêmes trois motifs.** La passe est exonérée.

**Résidu non expliqué : les 6 jours `dur2→dur1` de `REEL`.** Aucun autre site de `src/` n'écrit
`"dur1"` dans un `slot` ; leur producteur reste à localiser. Je le publie comme résidu plutôt
que de l'attribuer à la famille voisine — c'est 46 % de la dérive de ce profil, et un chiffre
attribué à tort vaudrait moins que rien pour juger l'étape 5.

---

## 5. Le gain attendu de l'étape 5 seule

**Fourchette : 0 à 6 % des jours de charge — et l'estimation honnête est PROCHE DE ZÉRO.**

Le raisonnement se lit dans le tableau du §2 : si les étapes 2-4 font du **cycle** l'unité de
volume, alors les passes qui découpent aujourd'hui par semaine calendaire verront un cycle
complet, et la dérive devrait **déjà** être nulle — c'est exactement l'état mesuré à
`cycleLen = 7`, où les mêmes passes tournent et ne dérivent pas.

**Donc l'étape 5 n'est pas une étape de GAIN : c'est une étape de NON-RÉGRESSION.** Son contenu
réel est de **re-clés les 31 sites** qui filtrent sur `d.week` / testent une parité de semaine,
faute de quoi ils continueront de voir des tranches de cycle. Son contrat mesurable :

```
critère d'entrée (après étapes 2-4)   `mesure:cycle10` §4 ≥ 95 % de positions clés conformes
critère de sortie (après étape 5)     `mesure:cycle10` §4 = 100 %, comme le schéma de 7
si l'entrée est déjà à 100 %          l'étape 5 se réduit à la re-clé + sa garde, sans gain
```

**Et le corollaire pour juger le chantier** : si, après les étapes 2-4, `mesure:cycle10` §4
reste sous 95 %, alors une cause TROISIÈME existe — probablement le résidu du §4 — et il faudra
la localiser avant d'écrire l'étape 5, pas après.

---

## 6. Ce que l'étape 0 change au plan 19

| | avant l'étape 0 | après |
|---|---|---|
| étape 5 | « les passes travaillent sur le cycle » — gain supposé | **non-régression**, gain attendu ≈ 0, contrat = 100 % au §4 |
| ordre | 0 → 1 → 2 → 3 → 4 → 5 | **inchangé** — mais l'étape 5 devient bon marché et non risquée |
| risque nouveau | — | **le résidu `dur2→dur1` (6 jours, 46 % de la dérive de `REEL`) n'a pas de producteur identifié** : à localiser avant l'étape 5 |

---

## Reproduire

```bash
npm run mesure:cycle10   # §4 : la dérive par profil et par position
# neutralisation de la cause 1 : rejouer le même profil avec dispo: "semaine"
# neutralisation d'une passe :
npm run casser -- --fichier src/generator/weekBuilder.ts \
  --avant '  if (days.some(isVo2)) return; // le plan en a déjà : rien à forcer' \
  --apres '  if (true) return; if (days.some(isVo2)) return; // le plan en a déjà : rien à forcer' \
  -- node scripts/mesureCycle10.mjs
```
