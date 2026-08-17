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

---
---

# Addendum 01 — vérifications V-07 → V-10

**Ajoutées par** `HANDOFF_ADDENDUM_01.md` (13/08/2026). Lecture seule, aucun fichier de `src/`
modifié. Chaque section rend la sortie exigée par l'addendum, puis dit ce que la mesure
**contredit** dans la prémisse du ticket — c'est la partie qui a le plus de valeur.

---

## V-07 — Provenance de `TRI_RUN`

> ### `TRI_RUN = a_priori`

**Cinq preuves, aucune contraire.**

1. **La table ne porte aucun commentaire.** `src/engine/predictor.ts:351`. Ses deux voisines
   immédiates en portent un, et il est explicite sur leur provenance : `TRI_BIKE_KM` (« distances
   officielles World Triathlon / Ironman ») et `TRI_TRANSITION` (« MÉDIANES d'âge-groupe lues sur
   les classements publics, pas des optima »). `TRI_RUN` est la seule des trois à être nue.
2. **Aucune entrée `PROVENANCE`.** `grep "PROVENANCE\|rule("` sur `predictor.ts` : zéro résultat.
   Le fichier n'utilise pas le mécanisme de traçabilité du dépôt.
3. **Les valeurs n'ont jamais bougé.** Balayage de toutes les révisions du fichier : **un seul
   jeu de valeurs** dans toute l'histoire, `1.03 / 1.05 / 1.08 / 1.13`. Un ajustement empirique
   laisse des itérations ; il n'y en a aucune.
4. **Aucun jeu de chronos réels n'existe, ni maintenant ni dans aucun commit.** `tests/fixtures/`
   ne contient que `profils30.json` et la référence du lot ; `audit-results/` est régénéré par les
   commandes. **L'ajustement était matériellement impossible.**
5. **Les chiffres sont ronds et `1,13` reprend mot pour mot l'énoncé littéraire** « le marathon
   d'un Ironman coûte ~13 % de plus qu'un marathon sec ».

**Le commentaire de `riegelExponent` (ligne 379) est donc une justification rétrospective.** Il
affirme que les facteurs « ont été calibrés CONTRE cet exposant » — mais `riegelExponent` est une
fonction introduite par **R14**, alors que la table existait déjà avec ces valeurs exactes. Ce qui
est vrai : elles ont été **choisies pendant que l'exposant valait la constante 1,06**. Ce qui est
faux : qu'un ajustement ait eu lieu. **Il n'y a donc pas de double compte à craindre — la branche A
de B-21 s'applique.**

**Et la revendication s'est propagée** : `src/sports/duathlon/tables.ts:32` fonde `DUA_RUN2.fatigue`
sur « l'échelle **validée** du tri ». Aucune des deux tables n'a jamais été validée contre une
donnée. À corriger dans le même lot que B-21, sinon B-21 corrige la source et laisse la copie.

---

## V-08 — Classification par domaine physiologique × discipline

**La prémisse du ticket est fausse : la ligne SEUIL est homogène.** `sw.css` est classé `hard`,
et `bk.thr` / `rn.thr` le sont **aussi** — `.thr` figure dans `HARD_SUFFIX` au même titre que
`.css`. Le ticket supposait `sw.css → hard` contre `bk.thr / rn.thr → mod` ; les trois sont `hard`.

| domaine | course | vélo | nage | homogène ? |
| --- | --- | --- | --- | --- |
| facile / Z2 | `rn.easy` → **easy** | `bk.z2` → **easy** | `sw.easy` → **easy** | ✓ |
| tempo / sweetspot | `rn.mara` → **mod** | `bk.ss` → **mod** | `sw.aero` → **easy** | ✖ **NON** |
| **seuil** | `rn.thr` → **hard** | `bk.thr` → **hard** | **`sw.css` → hard** | ✓ |
| VO2max | `rn.vo2` → **hard** | `bk.vo2` → **hard** | `sw.vo2` → **hard** | ✓ |

**Une divergence existe, mais ailleurs, et dans l'autre sens** : `sw.aero` est rangé **facile**
quand ses homologues sont **modérés**. Ce n'est pas un détail de nommage — en vitesse relative au
seuil, `sw.aero` vaut 1/1,06 = **94,3 % de la vitesse CSS**, soit au moins aussi exigeant que
`bk.ss` (88–94 % de la FTP) et que `rn.mara` (88–93 % de la vitesse seuil). Il est donc classé une
classe trop bas, ce qui **sous-compte** le modéré.

### Conséquence sur B-02 : le raccourci du ticket ne tient pas

L'addendum pose que « les 165 profils nage/swimrun de la première mesure sont probablement un
artefact de V-08 ». **Ils ne le sont pas** : `sw.css` est bien classé, c'est bien du seuil, et ces
minutes comptent légitimement comme dures. La vraie cause est ailleurs et V-09 la donne.

### Portée de la divergence `sw.aero`, mesurée avant toute écriture (règle 7)

| grandeur | valeur |
|---|---|
| profils du golden portant des minutes `sw.aero` | **382 / 945 (40,4 %)** — swim 136, swimrun 136, tri 110 |
| profils dont une semaine de charge franchirait **C26d** (modéré > 40 %) après réalignement | **106 (11,2 %)** |
| plan le plus chargé | 62,1 % de son volume (`G/swim/ow/vol-min`) |

**B-02a n'est donc pas un correctif gratuit** : réaligner `sw.aero` mettrait 11,2 % du catalogue en
violation de C26d — au-dessus du seuil de recevabilité de 10 % que l'addendum se donne lui-même.
Il doit être traité comme un ticket de calibrage à part entière, avec son propre arbitrage sur
C26d, et **non** comme un préalable technique à B-02.

> **Faute d'instrument, à moi, gardée écrite.** Ma première mesure de portée rendait
> « `sw.aero` n'existe qu'en swimrun, 136 profils ». Elle comptait les minutes par
> `st.durationMin` — or **les steps de nage sont exprimés en `distanceM`**, donc tri et swim
> pesaient zéro. Une contre-vérification qui comptait les *occurrences* de zone a montré que le
> **tri en est le premier consommateur** (1 170 occurrences contre 753 en swimrun). Le minutage
> reprend désormais la formule de `intensitySplit` elle-même. Portée réelle : 382 profils, pas 136.
> Encore une mesure qui nommait une grandeur et en mesurait une voisine.

---

## V-09 — Distribution du golden par volume hebdomadaire

**945 plans construits · 4 refus typés · 0 sans semaine de charge.** Grandeur retenue : la
**médiane des semaines de charge** du plan livré, et non `vol_max` — C26 se mesure par semaine sur
ce qui est produit, pas sur ce qui est demandé.

| tranche (h/sem) | profils | part | sports |
|---|---|---|---|
| **< 3 h** | 186 | 19,7 % | **swim 129**, run 37, swimrun 10, duathlon 7, bike 1, tri 1, trail 1 |
| **3–5 h** | 228 | 24,1 % | swimrun 60, tri 53, run 51, duathlon 30, bike 25, swim 7, trail 2 |
| **5–8 h** | 414 | 43,8 % | bike 129, duathlon 78, tri 69, swimrun 66, run 53, trail 19 |
| **8–12 h** | 115 | 12,2 % | trail 31, duathlon 31, tri 24, bike 17, run 12 |
| **> 12 h** | 2 | 0,2 % | trail 1, duathlon 1 |

| sport | n | médiane | min | max |
|---|---|---|---|---|
| bike | 172 | 6,7 h | 2,2 | 11,6 |
| duathlon | 147 | 6,7 h | 2,6 | 12,7 |
| run | 153 | 4,4 h | 2,0 | 8,3 |
| **swim** | 136 | **1,9 h** | 0,6 | 3,2 |
| swimrun | 136 | 4,9 h | 2,4 | 7,2 |
| trail | 54 | 8,0 h | 2,3 | 12,3 |
| tri | 147 | 6,0 h | 2,5 | 9,0 |

### C'est cette table qui explique la concentration nage de B-02, pas une erreur de classe

**La population nage est structurellement la plus basse en volume** : médiane 1,9 h/semaine, max
3,2 h, et **129 des 186 profils sous 3 h sont des nageurs**. Un plafond proportionnel au volume
(`0,10 × minutes`) leur donne mécaniquement le plafond le plus serré du catalogue — 11 min de dur
par semaine à 1,9 h. Le ticket ciblait « la queue basse en volume » : en population réelle, **la
queue basse EST la natation**. Ce n'était pas un effet de bord, c'était la cible.

**Conséquence directe sur le critère 2 de recevabilité de l'addendum** (« ≥ 70 % des profils
touchés concentrés sous 5 h/semaine ») : il est **presque automatiquement satisfait par
construction** dès qu'un plafond est proportionnel au volume, et il sélectionnera la natation à
chaque fois. Le critère ne discrimine donc pas — il faudra le lire ensemble avec le critère 3
(« zéro profil touché uniquement à cause de la nage »), qui est le seul des trois à mordre, et qui
est **en tension avec le critère 2** puisque la population sous 5 h est majoritairement nageuse.
À arbitrer avant B-02.

### Ce que B-21 branche B demandait : le volume de course des profils tri

| sport | n | vol TOTAL médian | vol **COURSE** médian | part course | exposant que ce volume appelle | exposant appliqué |
|---|---|---|---|---|---|---|
| tri | 147 | 6,00 h | **2,03 h** | 34 % | **1,1200** | 1,0600 |
| duathlon | 147 | 6,68 h | **2,17 h** | 32 % | **1,1200** | 1,0600 |

Étendues mesurées : tri 0,62 → 4,72 h de course/semaine · duathlon 0,58 → 4,15 h.
**Zéro profil sur 294 n'approche les 10 h/semaine que l'exposant appliqué suppose.** Tous, sans
exception, tombent au **plancher** de la table d'ancrages (≤ 4 h → 1,12). L'intuition de
l'addendum (« un triathlète à 10 h au total court typiquement 3-4 h ») est confirmée et même
dépassée : la médiane est à **2,0 h**.

---

## V-10 — Ancrage du prédicteur course

### La chaîne complète, pour l'athlète témoin (seuil 4'15/km = 255 s/km)

| étape | code | valeur |
|---|---|---|
| 1. ancrage | `answers.pace` → `thrPace` | 255 s/km |
| 2. distance-heure | `d1h = 3600 / thrPace` | **14,118 km** — « l'allure seuil est tenable **exactement** 1 h » |
| 3. exposant | `riegelExponent(runHoursPerWeek)` | 1,12 (≤ 4 h) … 1,04 (≥ 12 h) |
| 4. Riegel | `3600 × (D / d1h)^exp` | voir table |
| 5. fourchette | `range()` autour du point | ±≈3,5 % |

**Le prédicteur ancre bien sur `thrPace`**, et sur rien d'autre : ni résultat récent déclaré, ni
VMA. Aucun résultat de course n'entre dans `predict()` pour la course sèche.

### Le ratio prédit / seuil, mesuré (chiffres bruts, avant fourchette)

| volume course | exposant | 10 km | semi | **marathon** | dans `rn.mara` (1,08–1,13) ? |
|---|---|---|---|---|---|
| 3–4 h/sem | 1,1200 | 4'05 (0,960) | 4'28 (1,049) | **4'51 (1,1404)** | ✖ trop lent |
| 6,5 h/sem | 1,0900 | 4'07 (0,969) | 4'24 (1,037) | **4'41 (1,1036)** | ✓ |
| 10 h/sem | 1,0600 | 4'10 (0,980) | 4'21 (1,024) | **4'32 (1,0679)** | ✖ trop rapide |
| 12 h/sem | 1,0400 | 4'12 (0,986) | 4'19 (1,016) | **4'26 (1,0448)** | ✖ trop rapide |

### Et ce que l'écran affiche réellement, fourchette comprise

| format | volume déclaré | chrono affiché | ratio bas | ratio haut | bande `rn.mara` |
|---|---|---|---|---|---|
| marathon | 4 h | 3h18–3h30 | 1,104 | 1,171 | 1,08–1,13 |
| marathon | 8 h | 3h09–3h20 | 1,054 | 1,115 | 1,08–1,13 |
| marathon | 12 h | 3h01–3h12 | 1,009 | 1,071 | 1,08–1,13 |

### Le diagnostic, et il n'est aucun des trois que l'addendum propose

> **L'incohérence n'est pas un chiffre faux. C'est qu'une des deux grandeurs connaît le volume
> et l'autre pas.**

`rn.mara` est un multiplicateur **constant** du seuil (1,08–1,13). L'exposant de Riegel **varie
avec le volume** (1,04 → 1,12). Deux grandeurs dont l'une dépend d'une variable que l'autre ignore
ne peuvent coïncider qu'en un point — mesuré, ce point est autour de **6,5–8 h/semaine**, et c'est
exactement là que l'accord est bon. En dessous, la prédiction est plus lente que l'entraînement ;
au-dessus, plus rapide. **Le désaccord est structurel, pas numérique** : reculer `rn.mara` d'un
cran déplacerait simplement le point d'accord sans supprimer la divergence.

C'est **la forme exacte d'O-11** (deux définitions de « l'allure course » à vélo, l'une dans la
zone d'entraînement, l'autre dans la prescription du jour J), que **R20.5** a fermée en créant un
point unique `raceBikeBand()`. Ici, « l'allure marathon » est écrite deux fois : une fois dans
`ZDEF["rn.mara"]`, une fois dans le prédicteur. La correction dans l'esprit du dépôt (R11.1) est
donc de **dériver la bande d'entraînement du prédicteur**, pas de re-calibrer l'une contre l'autre.

### Rectification d'un chiffre du retest, à moi

`RETEST_PREDICTION.md` §7 annonce « marathon prédit **185 min** » à l'exposant 1,06, d'où le ratio
1,032 que l'addendum reprend. **185 min est la borne BASSE de la fourchette** (−3,5 %), pas
l'estimation ponctuelle. Le point vaut **191,5 min**, ratio **1,068**. Le fond de l'observation de
l'addendum tient (1,068 reste sous la bande 1,08–1,13), mais l'écart réel est de **0,012, pas de
0,048** — quatre fois moins que ce que le chiffre laissait croire. Le retest sera corrigé.

### Corollaire pour B-21 : la branche A serait INERTE telle qu'elle est écrite

`src/app/bridge.ts:665` :

```ts
runHoursPerWeek: sport === "run" ? parseFloat(String(answers.vol_max || "")) || undefined : undefined,
```

Hors course sèche, le paramètre vaut **`undefined`** dès le pont — et `riegelExponent(undefined)`
rend `1.06` par repli documenté. Remplacer la ligne 501 par `riegelExponent(opts.runHoursPerWeek)`
ne changerait donc **pas un seul chrono** : le correctif serait mort. La correction doit remonter
au pont, et il n'y a **aucune réponse du questionnaire** qui donne les heures de course d'un
triathlète — la grandeur doit être **mesurée sur le plan livré** (V-09 le fait déjà : médiane
2,03 h). Deux tickets, pas un.

Deux autres remarques sur ce paramètre, trouvées en le suivant :
- il lit **`vol_max`** (le plafond demandé) à la ligne 665 et **`vol_recent`** (le volume réel) à
  la ligne 938. Deux sources pour un paramètre qui a un seul sens ;
- il lit un **volume déclaré toutes disciplines confondues** même en course sèche, où un plan de
  10 h/semaine ne fait pas 10 h de course non plus (renfo, vélo croisé).

---

## Ce que l'addendum doit corriger, en une table

| affirmation de l'addendum | mesure | suite |
|---|---|---|
| `sw.css` classé `hard` alors que `bk.thr`/`rn.thr` sont `mod` | **faux** — les trois sont `hard` | B-02a perd son objet tel qu'écrit |
| les 165 profils nage de B-02 sont « un artefact de V-08 » | **faux** — c'est la distribution des volumes (V-09) | B-02 se décide sur la distribution, pas après B-02a |
| B-02a est un préalable technique à B-02 | **non** — 106 profils (11,2 %) franchiraient C26d | ticket de calibrage autonome |
| `TRI_RUN` peut-être `fitted` | **`a_priori`**, cinq preuves | branche A de B-21 |
| branche A = changer la ligne 501 | **inerte** — le paramètre est `undefined` en amont | corriger le pont, mesurer sur le plan |
| prédicteur marathon à 1,032 × seuil | **1,068** (1,032 était la borne basse) | écart 4× plus petit |
| « l'un des deux chiffres est faux » | **aucun des deux** — l'un est volume-aware, l'autre non | point unique (R11.1), forme O-11/R20.5 |

---

## V-11 — Le calcul de volume retourne-t-il QUELLE contrainte a mordu ?

> ### Réponse : **ni l'un ni l'autre**. Le message ne devine pas — il **recalcule**.

**Il n'existe pas de fonction `volumeMax()`.** Le calcul est réparti sur deux fichiers :
`reasoningEngine.ts:188` produit le nombre — `volPeak = min(volMax, caps, util) × marg ×
recupFactor`, puis `× SWIM_TIME_FACTOR`, `× medFactor` — et `planGenerator.ts:2949-3040`
reconstruit la chaîne **maillon par maillon** pour l'expliquer. Ce que la première transmet à la
seconde, c'est `volLimits` : les **entrées** (`declared`, `caps`, `util`, `marg`, `recup`,
`swimTime`, `med`, `sessionsMax`, `budget`), jamais le verdict.

C'est déjà la moitié de ce que B-24 demande, posé par **R20.2** pour la raison exacte du ticket
(« nommer celui qui a réellement retiré le plus — et pas simplement le premier qui mord »).
Ce qui manque, c'est le **retour du verdict** : l'argmin est recalculé dans le générateur de
message, il n'est pas rendu par le calcul.

### (a) La contrainte nommée est-elle l'argmin ? — **oui, 0 désaccord sur 247**

| mesure sur les 945 profils du golden | |
|---|---|
| plans portant une décision `R20.2` | **583 (61,7 %)** |
| dont le moteur nomme l'un des trois plafonds | **247** |
| **désaccords entre le nommé et l'argmin de `min(declared, caps, util)`** | **0** |
| cas où la question est sans objet (le moteur nomme un facteur ×, la rampe, ou la structure) | **336 (57,6 %)** |

**T-19 première moitié est donc VERTE, pas rouge.** Elle entre au banc comme garde-fou de
non-régression — la propriété est vraie, il s'agit de ne pas la perdre.

**Mais elle ne couvre que 42 % des messages.** Dans 336 cas, ce qui borne n'est pas un plafond
mais un facteur multiplicatif (`swimTime` 118 fois, `marg` 36), la rampe de départ (7), l'âge ou
une zone fragile (16), ou la structure de la semaine (159). Pour ceux-là « l'argmin des plafonds »
n'est pas défini : un facteur s'applique à *tous* les plafonds, il ne peut pas être l'argmin d'un
`min()`. **T-19 tel que spécifié est muet sur la majorité des messages** — à savoir avant de le
considérer comme une garantie complète.

Répartition de ce que le moteur nomme :

| ce qui borne | messages |
|---|---|
| ton historique | 247 |
| le nombre de séances (structure) | 159 |
| le temps réellement passé dans l'eau | 118 |
| la marge de sécurité hors compétition | 36 |
| tes zones fragiles / ton âge | 16 |
| ton point de départ (rampe R10) | 7 |

### (b) Le nombre affiché est-il la valeur modulée ? — **non, dans 161 cas sur 247 (65,2 %)**

**C'est le défaut, et il est réel.** La phrase d'explication cite `h(L.caps)` et `h(L.util)`,
c'est-à-dire la **valeur de table brute**, avant `marg × recup × swimTime × med × loadFactor`.

Vérifié : sur les 161 cas rouges, le chiffre cité vaut **exactement** la valeur de table
(161/161, 100 %), et la valeur modulée satisferait le critère dans 161 cas sur 161. Le test
mesure donc précisément la grandeur qu'il nomme.

Pire écart mesuré — `swim/demifond/reprise/debutant/finir` :

| ce que l'athlète lit | valeur |
|---|---|
| la phrase | « l'historique « reprise » permet d'encaisser **4 h/sem** » |
| le plafond réellement appliqué (× 0,360) | **1,44 h/sem** |
| le pic que son plan livre | **0,7 h/sem** |

**Les « 4 h » n'existent dans aucune unité que l'athlète puisse rapprocher de son plan.** C'est
mot pour mot la faute que **R20.7** a diagnostiquée et corrigée — sur le RETRAIT
(`p.retire × queue`), jamais sur la PHRASE. Le mécanisme `queue` est déjà écrit, à quinze lignes
de là ; il n'a simplement pas été appliqué aux deux littéraux du texte. **Quatrième occurrence
de cette faute d'unité** dans ce chantier, après O-13, le plancher de temps facile de R20.5, et
la chaîne de R20.7 elle-même.

### Ce que B-24 doit devenir

La spécification décrit `volumeMax() → { valeur, bindingConstraint, capBrut, capModule }`. Deux
écarts avec le code réel, à trancher :

1. **La fonction n'existe pas** et le calcul traverse deux modules. Soit on la crée (extraction
   depuis `reasoningEngine.ts:188`), soit `volLimits` gagne les trois champs manquants
   (`binding`, `capBrut`, `capModule`) et le générateur cesse de recalculer l'argmin. La seconde
   est plus petite et va dans le sens de R20.2, qui a déjà choisi de faire transiter les maillons.
2. **`bindingConstraint` doit couvrir les six familles**, pas seulement les trois plafonds —
   sinon 58 % des messages ne recevront pas de verdict et le générateur gardera sa chaîne en
   parallèle, c'est-à-dire deux calculs pour une réponse (R11.1).

**Le correctif minimal qui ferme la moitié rouge de T-19 est indépendant de tout ça** : appliquer
`queue` aux deux littéraux du texte. Une ligne chacun, aucun nombre du plan ne bouge, aucune
séance n'est touchée. Il peut partir avant B-24 sans rien préempter.

> **Deux fautes d'instrument à moi, dans cette seule vérification.**
> (1) Ma première mesure du pire cas affichait « pic réellement livré 2,2 h » — elle lisait le
> **retrait** (« −2,2 h/sem ») et non le pic (0,7 h), les deux étant écrits dans la même phrase
> au même format. (2) Ma contre-preuve de T-15 est sortie « ROUGE (facile) » sur un moteur où les
> quatre lignes étaient homogènes : elle écrivait `z.map(zoneClass)`, et `Array.map` passe
> l'**index** en deuxième argument — que `zoneClass(zone, runLegNoZone)` lit comme un drapeau,
> donc tout élément d'indice ≥ 1 était forcé en `mod`. Le banc, lui, enveloppe correctement
> (`z => zoneClass(z)`). Deux instruments faux en une heure, tous deux du même genre que ce que
> ce dépôt documente depuis R20.1.

### `scripts/goldenMaster.mjs` devient importable

T-19 doit se mesurer « sur le golden 945 » et l'addendum interdit de créer une seconde population
(§9). Le générateur de profils est donc **exporté** ; la garde d'usage du script ne s'applique
plus qu'au lancement direct. `golden:verify` reste vert, 949 profils, 0 écart.

**Ma première écriture de T-19 tournait sur `profils30` et s'est affichée ROUGE en examinant
ZÉRO profil** : les 20 décisions `R20.2` que ces trente portent nomment toutes « le nombre de
séances », qui n'est pas un plafond. Un rouge obtenu ainsi est pire qu'un vert vacueux — il a
l'air d'avoir trouvé quelque chose. Le test déclare désormais **« banc cassé »** plutôt que
« rouge » quand il n'examine rien.

---

## Banc après l'addendum : T-15 → T-19

| test | état | mesure |
|---|---|---|
| **T-15** classe homogène par domaine | 🔴 | 1 domaine sur 4 — `sw.aero=easy` contre `rn.mara=mod` / `bk.ss=mod`. Contre-preuve : ✓ vert en rangeant `sw.aero` en `mod` |
| **T-16** chrono prédit dans la bande prescrite | 🔴 | 7 combinaisons hors bande, **dont 3 sur marathon** — le seul cas visible à l'écran |
| **T-17** tout sous-segment chronométré porte une fourchette | 🔴 | 3 / 52 (les « Dont course » swimrun) |
| **T-18** un fait physique estimé porte une bande | 🔴 | 9 / 9 — part de marche ×4, transitions ×3, effet de binôme |
| **T-19** message de volume | 🔴 | (a) **0 / 247 désaccord** ✓ · (b) **161 / 247 (65,2 %)** citent la table |

**19 tests · 1 vert · 18 rouges attendus · 0 régression.**

### Une réserve sur T-16, à lever avant de le traiter comme une dette

Les 4 échecs `10k` ne sont **pas** un défaut. Le module de course prescrit `rn.mara` au **seul
marathon** ; pour 5 km, 10 km et semi, la séance d'allure spécifique est prescrite à `rn.thr`
(1,00–1,05 × seuil) — c'est une séance **au seuil**, pas une prescription d'allure de course.
Courir son 10 km plus vite que son allure seuil est de la physiologie normale. Le critère
littéral de l'addendum compare donc, sur ces distances, deux grandeurs qui n'ont pas à coïncider.

Le semi, lui, tombe **dans la bande à tous les volumes** (1,016–1,049).

**Le seul cas qui se voit à l'écran est le marathon**, et il est bien réel : un athlète entraîné
à 4'35–4'48 « allure marathon » se voit prédire sa course à 4'26 (12 h/sem) ou 4'32 (10 h/sem).
Recommandation : **restreindre T-16 au marathon** avec sa raison écrite, plutôt que de figer
quatre rouges structurels — c'est ce que R20.6 a fait des invariants I6/I8/I12.
