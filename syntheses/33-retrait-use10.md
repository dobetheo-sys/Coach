# 33 — `use10` est RETIRÉ — clôture du chantier cycle 10 jours

**Brief 34** · 25/08/2026 · **`REEL` revient exactement à 12,32 h** · batterie **12/12** ·
diff du retrait conservé dans `use10-cycle-10-jours.patch` (608 lignes)

---

## 1. Le retrait, et ce qu'il change

`use10` n'est plus calculé, plus transporté, plus lu. Le cycle **est** la semaine, pour tout le
monde. Mesuré sur les 31 profils qui l'activaient :

```
REEL/tri/70.3/nage-limitante     11,52 → 12,32 h   ← exactement la valeur 7 jours (critère 5) ✓
somme des 31 pics                224,94 → 224,12 h  (−0,82 h)
                                 9 profils gagnent · 13 perdent · 9 immobiles
```

Les perdants sont exactement ceux qui gagnaient : swimrun −0,75 à −1,10 h, trail −0,04 à −0,39,
`run/marathon` −0,13 à −0,35, `duathlon/L` −0,08 à −0,20. **C'est le miroir de la fiche 28**, et
c'est ce que la décision accepte : le cycle profitait à une minorité et pénalisait les formats
longs à budget élevé.

## 2. Ce qui a été retiré, et pourquoi PAS « laissé inatteignable » (tâche 2)

**Décision : retirer le code, conserver le diff.** C'est le mécanisme que ce dépôt emploie déjà
pour toute pièce écrite puis abandonnée (`e4-phases-en-jours.patch`, `o43-redecoupe.patch`,
`c3-alternance-facile2.patch`, `piste1-gabarits-alternes.patch`), et il satisfait les deux
exigences à la fois : pas de code mort dans le moteur, pas de travail perdu.

Le laisser en place et désactivé au point d'entrée aurait été plus court et plus cher :

- **une branche morte qui produit une sortie est une invitation à la rebrancher** — la leçon V6
  (`discBadgeHTML` retirée plutôt que laissée inutilisée) et O-36 (un chemin non exercé diverge
  en silence de celui qui l'est) ;
- le gabarit de 10 jours **porte les défauts mesurés** (O-102 sur sa position 4, O-103 sur sa
  dérive, O-107 sur le dépassement de tableau). Le garder inatteignable, c'est garder des
  défauts qu'aucun gate ne peut plus voir ;
- et ce lot vient précisément de démontrer qu'un chemin peu exercé rend un banc vert par
  accident (§5, `R23.18-A`).

Retiré : la branche `use10` de `schema()` et sa liste de 10 entrées · les entrées 8-10 du schéma
de récup · le champ `use10` sur `ReasonedPlan` et sur `V1Plan` · la décision `cycle` · la
question `shift_ok` (schéma, questionnaire, libellé) · la carte de règle « Cycles de 10 jours » ·
la pastille « 🔄 Cycles 10j » · les mentions « C<cycle>J<jour> » des deux grilles ·
`scripts/mesureCycle10.mjs` et son entrée npm.

**Conservé** : `cycleLen`, figé à 7 avec la raison écrite. Ce n'est pas du code mort — c'est
l'unité dans laquelle la sonde de capacité et la courbe raisonnent depuis les étapes 1-2, et la
nommer reste juste. Elle vaut 1 dans tous les facteurs, ce que `golden:verify` vérifie.

**Deux textes qui promettaient encore le cycle ont été corrigés** — l'avertissement « jours
bloqués » du schéma et celui de couverture des disciplines proposaient tous deux « passer sur un
cycle de 10 jours (Profil → décalage) ». Famille U9 : un produit ne propose pas un levier qui
n'existe plus.

## 3. Le corpus : les 31 profils sont GARDÉS (tâche 4)

**Décision : garder, convertir, ne pas renommer.**

- Les **26 profils de la passe `CYCLE10`** croisent les **sept sports** avec `dispo:
  quotidienne` + `doubles: oui` et trois couples (niveau, intention). Cette combinaison existe
  toujours et décide toujours du plan ; le corpus ne la couvrait auparavant que par **UN** profil.
  Les retirer parce que le mécanisme qui les avait motivés a disparu rétrécirait la couverture
  d'un espace de **décisions** encore vivant (A-2, « un corpus se juge sur l'espace des
  décisions »).
- **`REEL`** est le profil réel du fondateur : il reste, quoi qu'il arrive.
- Les **4 `O-21b/run/10k`** gardent O-21b (l'inversion sur l'axe allure), antérieure au cycle.
- **Les clés ne sont pas renommées** : un renommage de donnée produit est un producteur de masse
  de faux positifs (règle 17). Le commentaire de la passe dit ce qu'elle balaie aujourd'hui.
- La clé `shift_ok` est retirée des réponses du corpus — elle n'existe plus dans le schéma.

## 4. `golden:verify` — l'état final, et pourquoi 1012 profils changent

```
1016 profils · 4 refus d'entrée typés (non comparés) · 1012 écarts
   981 profils : UN seul champ en écart — `.use10 : false → undefined`, le champ retiré
    31 profils : leur PLAN change (ceux dont les réponses activaient le cycle)
   ampleur : champs en écart par profil — médiane 1 · p90 1 · max 9 769 · total 76 024
```

**Aucun écart inexpliqué.** Le champ `use10` était photographié sur chaque plan ; le retirer
touche donc tout le corpus, et la médiane à 1 le prouve. Recapturé.

⚠ **Diagnostic rectifié en cours de lot, publié** : mon premier verdict a été « 1012 écarts, la
règle d'arrêt s'applique ». La bisection par fichier a montré que `reasoningEngine` seul faisait
passer de 31 à 1012 — non pas parce qu'il change les plans, mais parce qu'il cesse d'alimenter
un champ photographié. La localisation (`golden:capture` en local puis `--verify`) l'a nommé en
une ligne. **Un « écart » de photo n'est pas un « écart » de plan**, et l'outil qui les distingue
existait.

## 5. L'effet de bord révélé — et il est PRÉEXISTANT (O-111)

Le brief demandait de signaler tout effet inattendu. En voici un, et il compte.

`R23.18-A` (banc v6) est passé rouge : le `det` de la course A− ne porte plus « POUR DE VRAI ».
Livré : `"36min — 💡 Course A- placée à sa vraie date — la semaine est allégée autour."` — un
re-rendu aval (`renderSess`) **réécrit le `det` écrit à la main**.

**Vérifié préexistant par expérience à facteur unique** : la même fixture en `dispo: "semaine"`
perd déjà le texte **sur le moteur d'avant le retrait**. Le test était vert par **accident de
couverture** — la fixture de base du banc v6 déclare `dispo: quotidienne` + `shift_ok: oui`,
donc **tous ses témoins tournaient sous le cycle de 10 jours**, le seul régime où ce jour
n'était pas re-rendu. **Le défaut touchait déjà la majorité des athlètes** ; le retrait ne l'a
pas créé, il l'a rendu visible.

Ouvert en **O-111** avec son correctif proposé en un point (`renderSess` ne réécrit jamais le
`det` d'une séance `race` — le code argumente déjà qu'une course « n'est pas une séance dosée,
c'est un événement »). **Non appliqué ici** : mélanger un correctif de rendu à un retrait de
mécanisme rendrait l'attribution impossible. `R23.18-A` porte `expect: "fail"` avec cette raison,
à repasser à `"pass"` dans le commit qui corrige.

## 6. Les cliquets ré-épinglés, avec leur cause

Tous DESCENDENT ou vont dans le sens attendu — jamais assouplis.

| garde | avant | après | cause |
|---|---|---|---|
| `T-27` sceau `S1` | 7 | **4** | le chevauchement des semaines calendaires disparaît |
| `T-27` sceau `S4` | 342 | **340** | idem |
| `T-27` sceau `S5` | 218 | **211** | idem |
| `T-48` population tri au pic | 192 | **195** | 3 profils livrent une semaine de pic qualifiante |
| `T-48` VO2 | 8 292 min | **8 400** | `dur1` retrouve sa densité (−30 %/jour sous le cycle) |
| `T-48` nage seuil | 425 201 m | **432 376** | idem |
| `C30-A` (v6) | 7 témoins | **6 montent, 1 descend** | `durLong` retrouve sa densité : la longue des coureurs LENTS de 10 km passe de 81 à 90 min — ce que C30 existe pour faire |
| **`T-58`** | rouge attendu | **PROMU garde-fou** | ses 3 plans sous la ligne du plateau se referment tous les trois, sans qu'une ligne du plateau soit touchée |

## 7. Le registre (tâche 3)

**Fermés — sans objet** (le mécanisme n'existe plus ; les tickets sont conservés, pas supprimés,
pour rester pertinents si le sujet est rouvert) :

| ticket | |
|---|---|
| **O-103** | la dérive des positions clés du cycle de 10 |
| **O-104** | le volume d'une semaine variant de 86 à 543 min selon le jour de course |
| **O-106** | phases et courbe désynchronisées — les deux sont hebdomadaires, donc alignées |
| **O-107** | le dépassement de tableau trail/swimrun — plus aucun cycle ne lit au-delà de la 7ᵉ position |
| **O-109** | la piste 1 (gabarits alternés) |

**Laissés ouverts, chacun vérifié indépendant du cycle** :

| ticket | vérification |
|---|---|
| **O-97** | le budget annoncé n'est pas borné par le calendrier — la borne est le nombre de jours, pas la longueur du cycle |
| **O-102** | ⚠ **il ne parle PAS du gabarit de 10** (je l'ai vérifié avant de le fermer par erreur) : `facile2` est étiqueté `facile` et livre du dur 34,5 % du temps en tri, quelle que soit la longueur du cycle |
| **O-105** | `Math.min(...actifs)` est toujours dans `seal.ts:165` — le garde recalcule un minimum brut indépendamment du cycle |
| **O-99 · O-100 · O-101** | `vol_max` vs disponibilité · deux inversions · `doubles` posée à tous les sports — aucun ne lit le cycle |
| **O-78 · O-110** | corrigés, sans lien |

**Ouvert** : **O-111** (§5).

## 7 bis. Une faute d'écriture à moi, publiée — et le gate qui l'a attrapée n'était pas dans la batterie

Ma substitution qui retire la mention `· C<cycle>J<jour>` de la grille a supprimé
`(plan.use10?" · C"+d.cyc+"J"+d.jc:"")` **entre deux opérateurs de concaténation**, laissant
`d.jour++'</div>'` : une **erreur de syntaxe** qui empêchait tout `plan-view.js` de charger.

**Les douze gates de la batterie sont restés VERTS** — ils mesurent le moteur, jamais le module
servi. C'est une suite E2E qui l'a dit, et pas en le nommant : elle a **expiré en attendant la
carte de sport**, parce que l'app ne démarrait pas. `node --check` sur les fichiers servis l'a
localisé en une ligne.

Corrigé et poussé immédiatement, `sw.js` reconstruit (`eb-pwa-2a7ae7225f37`). La leçon est celle
que ce dépôt écrit depuis O-24 sous un autre habillage : **une substitution textuelle sur du code
SERVI se vérifie par un parseur, pas par la relecture** — et aucun des douze gates ne le fait.

## 8. Vérifications

```
audit:v1              459 combinaisons · 0 violation dure
npm run batterie      12/12 verts · 0 rouge
audit:sensibilite     vert — `shift_ok` retirée du schéma, donc aucune clé orpheline
check:sw              sw.js reconstruit · VERSION eb-pwa-fd9b97c334ec · 63 assets
check:app             vert
node --check          tous les fichiers servis de endurabuild/js — 0 erreur de syntaxe
E2E                   25/25 suites vertes après correctif (smoke-questionnaires 33/33,
                      smoke-zenna 70/70, aucune erreur console sur la traversée)
golden                1016 profils recapturés · écarts tous expliqués (§4)
lotPhysio             33 verts · 24 rouges attendus · 0 régression · 0 accroc au cliquet
audit:v6              74 verts · 2 dettes déclarées · 0 régression
```
