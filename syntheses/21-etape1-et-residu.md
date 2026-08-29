# 21 — Étape 1 (unité explicite) livrée · et le résidu `dur2→dur1` est LOCALISÉ

**Date** : 24/08/2026 · **Gates** : `npm run batterie` **12/12** · `golden:verify` **990/990, 0 écart**

---

## Tâche B — le producteur est `applyWeeklyVariety`, et il emporte 12 des 13 jours

`weekBuilder.ts:573`. La passe boucle **`for (let w = 1; w <= r.weeks; w++)` sur les SEMAINES
CALENDAIRES**, avec un `seen` de noms de séance **par semaine**. Quand un nom de séance de
qualité se répète dans la semaine, elle bascule le créneau du jour :

```js
const alt = d.slot === "dur1" ? "dur2" : d.slot === "dur2" ? "dur1" : null;
// …et à défaut de séance inédite dans le créneau alternatif : easyFallbackSlot
```

**C'est exactement `dur2 → dur1`.** Et le mécanisme est l'interaction que l'étape 0 avait
nommée sans pouvoir la localiser : **le schéma de 10 pose DEUX `dur2` (j3 et j7)**, donc une
semaine calendaire de 7 jours peut en contenir deux, le second répète un nom, et la passe le
convertit. **Le schéma de 7 n'en pose qu'un — la passe ne se déclenche jamais.** D'où 0 % de
dérive à `cycleLen = 7` avec la même passe qui tourne.

### Les neutralisations, une à la fois

| état | dérive totale | positions clés |
|---|---|---|
| courant | **13/217 (6,0 %)** | 13/82 (15,9 %) |
| `applyWeeklyVariety` neutralisée | **1/217 (0,5 %)** | **1/82 (1,2 %)** |
| `applyPeakSignature` neutralisée | 12/217 (5,5 %) | 12/82 |

`jc = 7` passe de `dur2 ×13 · dur1 ×6 · facileR ×3` à **`dur2 ×22`**. Le 13ᵉ jour est
`applyPeakSignature` (`dur2→durLong`, la signature de pic — délibérée).

**Pistes épuisées avant celle-ci**, chacune par neutralisation : la passe VO2 de développement
(`weekBuilder.ts:535`, le seul autre site qui écrive `slot = "dur1"`) — **exonérée** ; le
gabarit 7 jours de la branche `reprise` (`weekBuilder.ts:296`) — hors domaine, `REEL` est
`confirme` ; le repli `medHold` (`weekBuilder.ts:328`) — hors domaine.

### ⚠ Et la moitié de la « dérive » n'est PAS une perte

Sur les 13 jours : **6 restent sur un créneau CLÉ** (`dur2→dur1`), **1 aussi**
(`dur2→durLong`), et **6 seulement basculent vers du facile** (`dur2→facileR`, la branche de
repli). **La perte réelle de positions clés sur `REEL` est de 6 jours sur 82 — 7,3 %, pas
15,9 %.** L'indicateur d'O-103 compte comme dérive des conversions **entre créneaux clés** :
à corriger dans la sonde, et à retenir avant de juger le chantier sur ce chiffre.

### Verdict sur l'étape 5

**Elle reste inutile en l'état, et pour une raison désormais démontrée** plutôt que déduite :
la passe n'a pas d'effet propre — elle a un effet **conditionné par le chevauchement**. Faire
du cycle l'unité (étapes 2-4) fera voir à `applyWeeklyVariety` un cycle complet, donc un seul
`dur2` par fenêtre, donc aucun déclenchement — l'état exact mesuré à `cycleLen = 7`.

**Ce qui change quand même** : il y avait bien **6 jours de perte réelle** à récupérer, et
c'est le seul gain chiffré du chantier sur `REEL` côté positions clés.

---

## Tâche A — l'unité est explicite, et rien n'a bougé

**`src/engine/types.ts`** — cinq alias qui NOMMENT l'unité sans rien contraindre :
`HParSemaine`, `MinParSemaine`, `SeancesParSemaine`, `Jours`, `Facteur`, avec le bloc qui dit
pourquoi ils existent (le diagnostic 18 : `peakH` est-il par semaine, par cycle, par jour ?).
Appliqués à `volPeak`, `volBase`, `peakH` et aux dix champs de `volLimits` — `declared`,
`caps`, `util`, `c20` en `HParSemaine` ; `marg`, `recup`, `swimTime`, `med` en `Facteur` ;
`sessionsMax`, `budget` en `SeancesParSemaine`.

**Les bornes de phase en jours** : `phaseJours(p)` rend `{ startJ, endJ, joursTotal }`.

### ⚠ Un écart avec le brief, et il est mesuré

Le brief demandait des **champs** `startJ`/`endJ` posés à côté de `start`/`end`. **Écrits,
ils produisent 986 écarts sur 990** — les phases sont **photographiées** dans le plan, et le
critère d'acceptation de l'étape 1 est « 0 écart ». Une étape de lisibilité qui déplace la
photo n'est plus une étape de lisibilité.

C'est aussi la forme juste au sens de **R11.1** : un champ stocké à côté de `start`/`end`
serait une **seconde source**, libre de diverger le jour où C19 ou R13.6 réécrit l'un sans
l'autre. `phaseJours()` dérive à la demande, depuis la seule source.

**Où la dérivation est posée compte aussi** : les phases sont encore réécrites après leur
construction par C19 (semaine de peak garantie) et R13.6 (plafonds absolus). Une dérivation
figée plus haut décrirait un état intermédiaire — la leçon payée douze fois dans ce dépôt,
qui vaut aussi pour un **descripteur**.

### Vérifications

```
golden:verify      990/990 · 0 écart          ← le critère d'acceptation de l'étape 1
npm run batterie   12/12 verts
build:app + build:sw refaits — sw.js eb-pwa-e54d31017140
```

---

## Ce que le chantier 19 devient

| étape | état |
|---|---|
| 0 — partage de la dérive | **fait** (fiche 20), complété ici par la localisation |
| **1 — unité explicite** | **✅ LIVRÉ**, 0 écart |
| 2 — `structurel` cloné sur le cycle | prochaine |
| 3 — courbe et C22 par cycle | **en attente de ton arbitrage C22** (pente quotidienne +14,6 %/10 j) |
| 4 — phases en jours | après 3 |
| **5 — passes sur le cycle** | **DÉMONTRÉE inutile en l'état** — à retirer du plan, sauf si le §4 reste sous 95 % après 2-4 |
| 6 — affichage | inchangé |
| 7 — clôture | critère : pic de `REEL` sous `use10` ≥ mode 7 jours |
