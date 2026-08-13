# RAPPORT PHASE 0 — Vérifications préalables au lot `fix/moteur-physio`

**Date** : 13/08/2026 · **Source** : `HANDOFF_CORRECTIFS_MOTEUR.md` §Phase 0
**Nature** : lecture seule. **Aucun fichier de `src/` n'a été modifié** — vérifié par `git diff --stat -- src/` vide.

Les six vérifications conditionnent le contenu de B-02, B-16, B-20, N-05 et N-08/N-09 en aval.
**Trois d'entre elles invalident la prémisse du ticket qu'elles conditionnent.** C'est exactement
ce que cette phase existe pour trouver, et c'est la raison pour laquelle elle est bloquante.

---

## Tableau de synthèse

| ID | Question | Réponse | Conséquence aval |
|---|---|---|---|
| **V-01** | T3 (48 h après 1000 m D−) est-il appliqué ? | **OUI, en deux endroits** | **B-16 sans objet** — à requalifier |
| **V-02** | `capacityProbe` : un seul `guard()` ? | **AUCUN — flag mort confirmé** | retirer le flag (la sonde tourne pour tous) |
| **V-03** | C26 : facteur fixe ou proportion du volume ? | **Facteur FIXE**, jamais proportionnel | **B-02 confirmé**, chiffres corrigés |
| **V-04** | `RECUP_WEEK_FACTOR` : volume seul ? | **NON** — volume ×0,62 **+** fréquence **+** toute l'intensité | **B-20 à re-motiver**, reste actionnable |
| **V-05** | `ANSWER_SCHEMA` contient-il le sexe ? | **OUI**, déjà consommé | N-05 n'a pas besoin du schéma, mais de consommateurs |
| **V-06** | `dailyAdjuster` peut-il avancer une décharge ? | **NON** — zéro référence | N-09 confirmé comme travail neuf |

---

## V-01 — T3 est appliqué. B-16 est sans objet tel qu'il est écrit.

**Réponse : la règle des 48 h EST câblée**, en deux mécanismes complémentaires, tous deux dans
`src/generator/planGenerator.ts` (le scheduler — d'où le fait que l'audit source, limité aux trois
fichiers trail, ne l'ait pas vue).

1. **`applyEccentricRecovery()`** (`planGenerator.ts:2784-2824`) — passe structurelle, balaye
   **tous les jours du plan** (`wl.flatMap`, donc à travers les frontières de semaine). Après un
   jour à ≥ 1000 m de D−, sur les 2 jours suivants : si le jour porte la sortie longue, elle est
   **conservée mais mise à plat** (`dmoinsM = 0`, gradient → `flat`, zone → `tr.easyup`) avec sa
   consigne d'origine préservée et le motif ajouté ; sinon le jour est remplacé par un footing plat
   de récupération. Le seuil de conflit est `charge === "dur"` ou `dayDown > 200 m`.

2. **`clampEccentricDays()`** (`planGenerator.ts:2835-2847`) — filet **dans la boucle de courbe**,
   parce que la mise à l'échelle verticale peut repousser un jour au-dessus du seuil après coup.
   Le commentaire cite le défaut mesuré qui l'a motivé : « 1 040 m de D− suivis d'une séance de
   qualité 48 h après ». Ramène la descente du jour à 95 % du seuil.

**Ce qui reste à mesurer, et qui n'est pas dans le ticket** : `clampEccentricDays(w)` travaille sur
`wd = w.days` et ne slice que dans la semaine courante (`wd.slice(i+1, i+1+minGapDays)`). Par
construction, **il ne peut pas voir un conflit qui tombe le lundi de la semaine suivante** quand la
grosse descente est le dimanche. La passe structurelle, elle, traverse les semaines — mais elle
tourne AVANT la courbe. Il existe donc une fenêtre théorique : descente de fin de semaine repoussée
au-dessus du seuil par la courbe, conflit le premier jour de la semaine d'après.

**Recommandation** : B-16 ne doit pas être « câbler la règle » (elle l'est) mais **« mesurer et
fermer le cas de bord de semaine »** — un test dédié qui balaye les frontières de semaine sur les
profils trail. Le coût est très inférieur à celui du ticket tel qu'écrit, et la justification du
ticket (« une règle documentée mais non appliquée donne une fausse assurance ») reste valable dans
sa version réduite.

---

## V-02 — `capacityProbe` est un flag mort. Confirmé exhaustivement.

**Tous les appels `guard()` du dépôt** (`src/`, recherche exhaustive) :

| Flag | Consommé ? | Points d'appel |
|---|---|---|
| `stripLongOnMedHold` | ✅ | weekBuilder.ts:255 |
| `singleRunVo2PerWeek` | ✅ | weekBuilder.ts:299 |
| `runImpactCap` | ✅ | weekBuilder.ts:554 · reasoningEngine.ts:226 |
| `swimRacePrepFrequency` | ✅ | weekBuilder.ts:688 · planGenerator.ts:2051, 3335 |
| `smoothOnAuditMetric` | ✅ | planGenerator.ts:1897 |
| `swimSessionFloors` | ✅ | planGenerator.ts:2196, 2305, 2559 |
| `doublesAddVolume` | ✅ | planGenerator.ts:2955 |
| `swimTimeFactor` | ✅ | reasoningEngine.ts:189, 193, 300, 442 |
| **`capacityProbe`** | ❌ **JAMAIS** | déclaré par `tri` et `swim`, lu nulle part |

**Et la sonde tourne pour tout le monde** : `planGenerator.ts:1927-1932` ouvre un bloc nu
(`{ ... }`) sans aucune condition de sport. La sonde V2.1 s'applique donc aux sept sports,
indépendamment du drapeau.

**Conséquence** : le flag ne décrit aucune différence réelle entre sports. Il ment sur une
distinction qui n'existe pas — exactement ce que l'en-tête de `registry.ts` interdit
(« l'absence de drapeau est un choix EXPLICITE, pas un oubli » n'a de sens que si la présence en
est un aussi).

**Recommandation** : **retirer** `capacityProbe` de l'interface `SportGuards` et des deux modules
qui le déclarent, plutôt que de le câbler. Câbler reviendrait à *désactiver* la sonde pour les cinq
autres sports — un changement de comportement non demandé, et probablement une régression (la sonde
corrige des promesses de volume inatteignables ; rien n'indique que run/bike/trail/duathlon/swimrun
doivent en être privés). Ticket à basculer du lot « à câbler » vers **lot A** (sans effet sur le
plan livré, vérifiable par golden master).

---

## V-03 — Le plafond de temps dur est un facteur FIXE. B-02 est confirmé, ses chiffres sont à corriger.

`hardTimeCapMin()` (`constraintMatrix.ts:403-408`) ne prend **jamais le volume en argument** :

```ts
export function hardTimeCapMin(ctx?: EasyFloorCtx): number {
  let cap = C26b_HARD_TIME_BY_HISTORY[ctx?.history || "confirme"] ?? C26_HARD_TIME_CAP_MIN;
  if (ctx?.level === "debutant") cap = Math.min(cap, C26b_HARD_TIME_BEGINNER_MIN);
  if (ctx?.injured) cap = Math.round(cap * C26b_INJURY_FACTOR);
  return cap;
}
```

Seul `easyShareFloor()` introduit le volume, et **en aval**, pour en dériver une proportion bornée
à [60 %, 70 %].

### Table du plafond dur effectif (calculée en exécutant le vrai code, pas à la main)

Tolérance C26c (×1,1) incluse — c'est elle qui décide de la coupe réelle.

| vol/sem | historique | cap (min) | cap ×1,1 | **% du volume** | easyFloor |
|---|---|---|---|---|---|
| 2 h | reprise | 35 | 39 | **32,5 %** | 70,0 % |
| 2 h | confirmé / ancien | 60 | 66 | **55,0 %** | 60,0 % |
| 2 h 30 | reprise | 35 | 39 | **26,0 %** | 70,0 % |
| 2 h 30 | confirmé / ancien | 60 | 66 | **44,0 %** | 60,0 % |
| 4 h | reprise | 35 | 39 | 16,3 % | 70,0 % |
| 4 h | confirmé / ancien | 60 | 66 | 27,5 % | 70,0 % |
| 6 h | reprise | 35 | 39 | 10,8 % | 70,0 % |
| 6 h | confirmé / ancien | 60 | 66 | 18,3 % | 70,0 % |
| 10 h | reprise | 35 | 39 | 6,5 % | 70,0 % |
| 10 h | confirmé / ancien | 60 | 66 | 11,0 % | 70,0 % |
| 15 h | reprise | 35 | 39 | 4,3 % | 70,0 % |
| 15 h | confirmé / ancien | 60 | 66 | 7,3 % | 70,0 % |

Cas particuliers : débutant → 25 min plafond (22,9 % à 2 h) · confirmé + blessé → 36 min (33,0 % à 2 h).

### Deux corrections à apporter au ticket B-02

1. **Le handoff annonce « 40 % → 13 % » à 2 h 30. Mesuré : 44 % → 14,7 %.** L'écart vient de la
   tolérance C26c (×1,1), que le calcul du handoff n'inclut pas. 60/150 = 40 % est le plafond
   *déclaré* ; 66/150 = 44 % est le plafond *appliqué*. Sur une règle dont tout l'objet est de
   borner le dur, c'est la valeur appliquée qui compte.
2. **Le pire cas n'est pas le débutant, c'est le « confirmé » à bas volume** : 55 % de temps dur
   autorisé à 2 h/semaine. Le débutant est protégé par son propre plancher (25 min → 22,9 %).
   Le profil de test critique de la Phase 1 devrait donc être **un confirmé à 2 h**, pas seulement
   le débutant à 2 h 30 que le handoff nomme.

### Effet de la proposition B-02 (`clamp(0,10 × minutes_hebdo, 20, 60)`)

| vol/sem | actuel (confirmé) | B-02 | écart |
|---|---|---|---|
| 2 h | 60 min | 20 min | −40 |
| 2 h 30 | 60 min | 20 min | −40 |
| 4 h | 60 min | 24 min | −36 |
| 6 h | 60 min | 36 min | −24 |
| 10 h | 60 min | **60 min** | 0 |
| 15 h | 60 min | **60 min** | 0 |

La proposition ne touche donc **aucun plan au-dessus de 10 h/semaine** — le blast radius est
entièrement concentré sur les petits volumes. C'est une bonne nouvelle pour le diff du lot B.

**Point à trancher, non résolu ici** : à 2 h/semaine, `easyShareFloor` retombe sur son plancher
de 60 % pendant que le plafond dur en autorise 55 %. Les deux règles portent sur des dénominateurs
différents (cf. §9.3 de l'audit source), mais la coexistence de ces deux chiffres sur le même profil
mérite un arbitrage explicite avant B-03.

---

## V-04 — `RECUP_WEEK_FACTOR` n'agit pas seul. La prémisse de B-20 est fausse ; le ticket reste utile.

**Points de consommation de `0.62`** :
- `planGenerator.ts:2133` — `targetH *= RECUP_WEEK_FACTOR` (volume cible de la semaine)
- `planGenerator.ts:2137` — `capW` (plafond de rampe de départ)
- `planGenerator.ts:2860` — `tgtUp` / `tgtDown` (cibles D+/D− trail)

**Mais la fréquence et l'intensité sont coupées AILLEURS**, par le schéma de semaine
(`weekBuilder.ts:23-36`) :

| | Semaine de charge (7 j) | Semaine de récup (7 j) |
|---|---|---|
| Créneaux durs | `dur1`, `dur2`, `durLong` → **3** | **0** |
| Sortie longue | oui (`durLong`) | **absente** |
| Jours actifs | 6 (+1 `recup`) | **5** (+2 `off`) |
| Volume | 100 % | ×0,62 |

Une semaine de décharge perd donc **les trois séances de qualité, la sortie longue, un jour actif
et 38 % du volume** — quatre leviers simultanés, pas un.

**Nuance importante** : ce schéma est le **générique**. `trail` et `swimrun` déclarent leur propre
`weekSchema` (`registry.ts` / `sportModule().weekSchema`) et ne suivent pas cette table — le constat
ci-dessus ne vaut pas pour eux sans vérification séparée.

**Recommandation** : B-20 garde son objectif (« couper le volume, pas la fréquence ») mais **change
de motif**. Il ne s'agit pas de corriger une application uniforme de 0,62 : il s'agit d'arbitrer si
la décharge doit conserver un plancher de fréquence et un bloc court d'intensité, alors qu'elle
supprime aujourd'hui **toute** intensité par construction du schéma. C'est un changement plus lourd
que ne le laisse penser le ticket (il touche `schema()`, pas une constante), et son diff sera large :
**toutes** les semaines de récup de **tous** les plans. À reclasser en P1 avec diff obligatoire.

---

## V-05 — Le sexe existe déjà dans le schéma, et il est déjà consommé.

`answerSchema.ts:152` :
```ts
sex: { ...enumF("ton sexe", ["F", "H", "np"]), nature: "vecue" },
```

Trois valeurs, dont un `np` (non précisé) — le domaine gère déjà le refus de répondre.

**Il est déjà lu** : `constraintMatrix.ts:562-573` le passe à `margeOf()` pour décaler les bandes de
référence (R14.1 — « une femme de 50 ans n'est pas jugée contre la même référence »). Le commentaire
insiste sur le principe : on décale **la référence**, jamais la marge de l'athlète.

**Conséquence pour N-05** : le ticket n'a pas besoin d'ajouter un champ. Ce qu'il demande
(normes, RED-S, carence martiale) est du **consommateur nouveau sur une donnée existante**. Cela
réduit son coût et supprime la migration d'état (`localStorage`) que l'ajout d'un champ aurait
impliquée. À requalifier de « ajouter au schéma » vers « brancher des règles sur un champ déjà là ».

---

## V-06 — `dailyAdjuster` ne peut pas avancer une décharge.

Recherche de `isRecup|recupEvery|deload|décharge` dans `src/readiness/dailyAdjuster.ts` :
**aucune occurrence**. Le module ne connaît pas la notion de semaine de décharge ; il ajuste la
**journée** (remplacer / réduire / reposer) et ne touche jamais à la structure du plan.

C'est cohérent avec la garantie du Sprint 2 (« on ne rattrape jamais le volume manqué ») et avec
`coachOnIngest` (R21), dont la fenêtre de recalcul est bornée à 14 jours et **ne sait que réduire**.

**Conséquence pour N-09** : c'est du travail entièrement neuf, et il touche une frontière sensible —
faire bouger la périodisation depuis un signal quotidien. À spécifier séparément, avec la question
préalable : une décharge avancée est-elle *avancée* (le plan raccourcit) ou *insérée* (le plan
s'allonge d'une semaine, ce qui déplace le jour J) ? Le moteur n'a aujourd'hui aucun mécanisme pour
l'un ni pour l'autre.

---

## Ce que la Phase 0 change au plan de charge

| Ticket | Statut après Phase 0 |
|---|---|
| **B-16** (T3) | ⬇️ **Fortement réduit** — la règle existe ; reste un cas de bord de semaine à mesurer |
| **V-02 → nouveau ticket** | ➡️ **Bascule en lot A** : retirer le flag mort plutôt que le câbler |
| **B-02** (C26) | ✅ **Confirmé**, chiffres corrigés (44 % et non 40 %), profil critique redéfini (confirmé 2 h) |
| **B-20** (décharge) | ⬆️ **Alourdi** — touche `schema()`, diff sur toutes les semaines de récup, motif réécrit |
| **N-05** (sexe) | ⬇️ **Réduit** — champ déjà présent et déjà consommé |
| **N-09** (décharge auto) | ➡️ **Confirmé neuf**, avec une question de conception préalable non tranchée |

**Deux des vingt tickets se dégonflent, un s'alourdit, un change de lot.** Aucun code n'a été écrit —
c'est le retour sur investissement de la phase.

---

## Questions ouvertes avant Phase 1

1. **Branche.** Le handoff recommande `fix/moteur-physio` (« distincte de `design/zenna` »). Cette
   session est assignée à `claude/mockup-engine-integration-ftnf7f`, et mes consignes interdisent de
   pousser ailleurs sans accord explicite. À confirmer.
2. **Gel de `src/`.** Toute cette session tenait `src/` pour gelé (chaque lot vérifiait un diff vide).
   Le handoff lève ce gel (« tout passe par `src/` »). Je le prends pour acquis à partir de la
   Phase 2 — mais il faut noter que **toute modification de `src/` oblige à reconstruire**
   `endurabuild/js/engine.js` **et** `Coach_Pro_V1.5.html` (`npm run build:app`, gate `check:app`).
   Le monolithe ne peut pas rester byte-identique ; seul son *édition manuelle* est interdite.
3. **Golden master.** 949 profils figés servent aujourd'hui de garde anti-régression. Le lot B va
   les faire bouger massivement et légitimement. Faut-il recapturer après chaque ticket B (traçable
   mais bruyant) ou une seule fois en fin de lot (lisible mais moins précis) ?
