# HANDOFF R15 — Revue de `BUGS_OUVERTS.md` : ce que le registre ne voit pas encore

**Base :** `BUGS_OUVERTS.md` au 01/08/2026, commit `e9de76a` (19 gates verts, E2E 8/8, golden 758).
**Mesures moteur :** faites sur `EnduraBuild-standalone-5.html`. Les chiffres des chapitres R15.2 et R15.7 sont donc **à re-mesurer sur `e9de76a` avant correction** — s'ils ont déjà été traités, ils basculent au §4 du registre (« entrées devenues fausses »), ce qui est aussi un résultat.
**Banc :** `bench_r15.js` — **6 échecs sur 10** contre le moteur mesuré, 4 non-régressions vertes.

```
node bench_r15.js dist/engine.js
```

Le registre est bon. Sa règle — *« une dette qu'on ne peut pas re-mesurer en une ligne n'est pas une dette, c'est un souvenir »* — est la bonne, et §4 est la partie que presque personne n'écrit. Ce handoff ne le corrige pas : il traite ce qu'il ne voit pas encore.

---

## Avertissement méthodologique : ce handoff a reproduit O-1 avant de le corriger

En écrivant le banc du chapitre R15.7, j'ai d'abord balayé 72 profils à un seul horizon, avec des dates de course tombant sur un jour quelconque. Résultat : **0 défaut, banc vert**. En calant la course **un dimanche** (le cas de la quasi-totalité des épreuves) et en balayant 9 horizons :

| balayage | configs testées | sous le plancher |
|---|---|---|
| 72 profils, 1 horizon, jour quelconque | 72 | **0** |
| 72 profils, 9 horizons, **course le dimanche** | 648 | **291 (45 %)** |

Une dimension non variée — le jour de la semaine — masquait 100 % du défaut. C'est exactement O-1, commis par le document qui vient le dénoncer. **La leçon n'est donc pas « monter N » mais « varier les bonnes dimensions »** : un échantillon dix fois plus grand sur les mêmes axes n'aurait rien trouvé.

---

## R15.1 — O-1 : le problème est plus large que `D-DISC`

**Ce que le registre voit.** `D-DISC` vaut 0 à N=150, 2 à N=253 ; la CI est verte parce qu'elle ne regarde pas assez loin.

**Ce qu'il ne voit pas.** **Tous** les budgets du tableau v7 sont des **compteurs absolus mesurés à N=150**. Un budget de 12 sur un tirage de 150 vaut mécaniquement ~20 à N=253. Monter `N` ne fera pas seulement passer `D-DISC` de 1 à 2 : il fera déborder `U-RACEDATE`, `T-NIGHT`, `T-DPLUS-WK` et `T-POLES-ADV` **en même temps**. Le lot « monter N, constater le rouge, corriger » est donc plus gros que ce que O-1 laisse entendre — et c'est une raison de plus de le faire pour lui-même.

**Trois gestes, dans cet ordre :**

1. **Dire si le tirage est semé.** À écrire en tête de `runAuditV7.mjs`. S'il ne l'est pas, `D-DISC = 0` à N=150 est peut-être un coup de dé et la CI est déjà instable — auquel cas c'est le premier bug à corriger, avant tout budget. S'il l'est, « 0 » est déterministe mais arbitraire, ce qui est le cas décrit par O-1.
2. **Passer les budgets en taux** (`‰ de profils`) et non en compteurs. Un budget qui dépend du paramètre d'échantillonnage n'est pas une mesure, c'est un artefact. Formulation : `budget_‰ × N / 1000`, arrondi au supérieur.
3. **Varier les dimensions, pas seulement leur nombre.** Le balayage doit croiser explicitement : horizon (≥ 6 valeurs), **jour de la semaine de la course**, sport, format, niveau, historique, volume, nombre de séances, blessure, drapeau médical. Vérifier cette couverture est plus rentable que tripler `N` — la démonstration est en tête de ce document.

**Vérifier :** `ENGINE=$PWD/endurabuild/js/engine.js node audit_v7.cjs duathlon 253` doit rester rouge tant que les 2 cas ne sont pas traités, puis vert avec `N` haut **conservé**.

---

## R15.2 — O-2 : le critère du dénivelé vélo existe, la revue manuelle n'est pas nécessaire

O-2 dit : *« il n'existe aucun test qui dise quand c'est fait — premier geste attendu : écrire le critère »*. Le voici, mesuré et exécutable.

**Mesuré aujourd'hui :** pour un même profil 70.3 (FTP 230), `terrain` = plat / vallonné / montagne donne **175–191 W dans les trois cas**. `TRI_BIKE` ne connaît que le format.

**Le correctif.** La bande d'intensité descend avec le relief, le conseil suit :

| `terrain` | décalage d'IF | conseil ajouté |
|---|---|---|
| plat | 0 | inchangé |
| vallonné | −0,01 | mention de l'indice de variabilité |
| montagne | −0,02 à −0,03 | IV + « le coût suit la puissance **normalisée**, pas la moyenne » |

**Règle non négociable : une seule clé.** Le relief vélo lit **`terrain`**, la même source que le relief course après R14.3-a. Si un troisième champ apparaît, on recrée le bug qu'on vient de fermer (`montagne` vs `montagneux`) — et cette fois sur le pacing, pas sur l'affichage. Le critère `R15.2-D` vérifie qu'un `course_profile` renseigné ne change **rien** au résultat.

**Critères :** `R15.2-A` (écart ≥ 4 W = 0,02 × FTP entre plat et montagne), `R15.2-B` (vallonné strictement entre les deux), `R15.2-C` (le conseil mentionne la variabilité), `R15.2-D` (clé unique).

**Portée.** Le module a raison de ne pas prédire un temps de vélo. C'est la **cible d'intensité** qui bouge — même famille de risque que P6, traitée comme règle de sécurité.

---

## R15.3 — O-3 : la mesure manquante n'est pas l'écart, c'est la fréquence

O-3 dit le coût « faible et non chiffré ». Avant d'arbitrer `facileR` contre `facile2` pour le trail, la question à trancher est : **combien de plans trail déclenchent réellement le repli ?**

- Si < 5 % : l'entrée se ferme comme « sans impact mesurable », et c'est une décision, pas un oubli.
- Si > 20 % : elle mérite son lot, avec mesure avant/après sur le golden.

**Vérifier :** instrumenter `easyFallbackSlot` d'un compteur, balayer la matrice trail (niveaux × historiques × volumes × horizons), publier le taux. Une passe, dix minutes. **Tant que ce chiffre n'existe pas, l'arbitrage d'entraînement n'est pas mûr** — c'est la règle du dépôt appliquée à O-3 lui-même.

---

## R15.4 — D3 : la correction de fond, rendue opératoire

Le registre dit juste : *« la correction est dans la FORME de la courbe, pas dans une passe de rattrapage »*. Formulation exécutable :

**C22 contraint les *transitions* (+10 % max), les ratios de phase contraignent les *niveaux* (dev→peak = 1,18).** Deux spécifications indépendantes de la même quantité : elles se contredisent nécessairement dès que le plan est court ou porte deux récups consécutives. Aucun clamp postérieur ne peut les réconcilier — il ne peut que choisir laquelle trahir.

**Sortie :** générer les niveaux **par produit cumulé des incréments autorisés** (donc C22 par construction), puis mettre à l'échelle sur le pic visé. Le ratio dev→peak devient une **conséquence** de la longueur du plan, plus une cible indépendante. Sur plan court, il vaudra naturellement moins de 1,18 — ce qui est la bonne réponse physiologique, pas une concession.

**Vérifier :** `npm run audit:v6` → `D3` doit tomber à 0 sans que `D2` ni `F2` bougent, et `bench_r13.js` `ANX-C22` doit rester vert.

---

## R15.5 — F2 : le piège de l'`expect:'fail'`

`F2` est en `expect:'fail'` **pour garder le chiffre sous les yeux** — excellente pratique. Une seule question à vérifier : **le harnais distingue-t-il « échec attendu » de « attendu en échec mais passé » ?**

Si non, le jour où quelqu'un corrige les 42 % (par exemple en assouplissant C13c, ou en rallongeant le bloc utile), le test **rougira** et la correction ressemblera à une régression — elle sera annulée. Un `xfail` qui passe doit produire un message distinct : *« F2 ne viole plus le seuil : retirer l'attente d'échec »*.

**Vérifier :** forcer artificiellement le seuil de F2 à 40 % et confirmer que la CI dit « attente d'échec périmée » et non « régression ».

---

## R15.6 — Swimrun : 39 défauts budgétés sur du code jamais exercé

Le registre le signale déjà (« dette du dépôt, pas du produit »), et la note en encadré est juste. Mais l'état actuel est **le pire des deux mondes** : le budget ne protège rien, et le code peut pourrir sans aucun signal jusqu'au jour où `EB_SWIMRUN=1` le ramène dans le produit — avec, à ce moment-là, une dette inconnue et non plus 39.

**Deux sorties acceptables, une seule à choisir :**
- **Job CI séparé, non bloquant**, avec `EB_SWIMRUN=1`, qui publie les 4 chiffres. La dette reste visible et ne peut pas croître en silence.
- **Branche dédiée**, et retrait de `src/` et de la config d'audit principale.

Ce qui n'est pas acceptable, c'est de garder des budgets non nuls dans l'audit principal pour du code que l'audit principal n'exécute pas : c'est une surveillance qui n'en est pas une.

---

## R15.7 — Deux entrées manquantes au registre (mesurées, à re-vérifier sur `e9de76a`)

### a) La semaine de course passe sous son plancher — 45 % des profils 70.3

**Mesuré :** 9 horizons × 72 profils, course calée un dimanche → **291/648 configurations sous 30 % du pic**. Cas le plus net : `70.3 / débutant / reprise / 10 h / 7 séances`, horizon 41 semaines → **pic 5,8 h, semaine de course 1,4 h = 24 %**.

R3.13 borne l'affûtage **par le haut** (≤ 60 % du pic) ; le plancher de 30 %, lui, est un invariant **déclaré dans R13.6-P3 mais jamais vérifié sur la matrice**. Le rattrapage doit remonter les trois rappels (nage, race-pace, allure course) plutôt que d'ajouter une séance : la fréquence est déjà contrainte.

**Critère :** `R15.7-A`.

### b) Aucune séance dans les 3 derniers jours — 12/648

**Mesuré :** `70.3 / débutant / reprise / 10–12 h`, horizon 32 et 44 semaines → dernière séance **J-3**, puis deux jours vides avant le départ. Deux jours off pré-course sont défendables ; trois, avec zéro déverrouillage, ne le sont pas — et surtout, l'invariant R13.4-C2 (« veille ≤ 25 min ») ne dit rien du cas où la veille est **vide**. Un plafond sans plancher.

**Critère :** `R15.7-B`.

### c) Un mineur peut générer un plan Ironman

**Mesuré :** `age 15` + `tri/Full` → **accepté, 59 semaines, pic 7,7 h**. Idem `tri/70.3` et `run/marathon`. R6.3 module correctement la charge (×0,70, zéro VO2max) — mais **rien ne croise l'âge et le format**. Or IRONMAN exige 18 ans, comme la quasi-totalité des marathons.

Un moteur qui refuse de *« vendre une préparation d'Ironman en un mois »* parce que ce serait mentir devrait refuser, avec le même argument, de préparer douze mois une épreuve où l'athlète ne pourra pas s'inscrire.

**Le correctif.** Refus motivé (`EBInputError`, famille `ENTREE_INVALIDE`) pour mineur × format à minimum d'âge quasi universel : `tri/Full`, `tri/70.3`, `run/marathon`, `trail ≥ 50 km`, `duathlon/PM`. Message dans le ton du moteur : nommer la règle d'inscription, proposer le format accessible immédiatement, dire que le plan long redeviendra possible à 18 ans. Formats courts : **inchangés** — R6.3 fait déjà le travail.

**Critères :** `R15.7-C1` (refus motivé), `R15.7-C2` et `C3` (non-régressions : mineur sur format court toujours autorisé et protégé, adulte sur format long inchangé).

---

## R15.8 — Deux angles morts à ajouter au §3

**A-5 — aucune vérité terrain pour la projection R14/R14.1.** Les bandes `h`, `G_plafond`, `k_structure` sont des heuristiques que **rien ne valide**. On ne saura jamais qu'elles sont fausses tant que les projections ne sont pas confrontées aux résultats réels. C'est l'angle mort le plus profond du prédicteur, et il n'est aujourd'hui écrit nulle part.

*Premier geste, aujourd'hui :* journaliser à chaque génération `{date, sport, format, horizon, refs mesurées, gainPct, gainBand, adhérence}`, et au passage du jour J `{temps réel par leg}`. Sans cette ligne écrite maintenant, la calibration sera impossible dans deux ans — les données n'existeront pas.

**A-6 — dates absolues dans le golden et les audits.** Un profil dont la course est « à 43 semaines » aujourd'hui sera à 30 semaines dans trois mois : le golden dérive tout seul, ou pire, **exerce silencieusement d'autres branches en gardant la même empreinte**. J'ai dû passer mes propres bancs en dates relatives pour cette raison, et R15.7 montre que la longueur du plan et le jour de la course changent le résultat.

*Vérifier :* `grep -rn "20[23][0-9]-[01][0-9]-[0-3][0-9]" golden/ scripts/ tests/` — toute date en dur est un futur A-2.

---

## R15.9 — Rendre le registre exécutable

Chaque entrée de `BUGS_OUVERTS.md` porte déjà sa commande. Il manque le script qui les enchaîne et signale celles dont la mesure ne reproduit plus. §4 (deux entrées devenues fausses, trouvées à la main en compilant le fichier) deviendrait alors un **résultat automatique** au lieu d'un heureux accident.

Forme minimale : un bloc ```verify``` sous chaque entrée, un `npm run registry:check` qui les exécute, et une sortie en trois colonnes — `reproduit` / `ne reproduit plus (→ §4)` / `commande cassée`. C'est exactement ce que le document dit qu'il faut faire, appliqué à lui-même.

---

## Ordre d'exécution

1. **R15.7-C** (éligibilité âge × format) — c'est le seul point qui touche à la sécurité, et il est petit.
2. **R15.2** (relief vélo) — critère d'abord, correctif ensuite, comme O-2 le demande.
3. **R15.7-A/B** (plancher et déverrouillage de la semaine de course).
4. **R15.1** (budgets en taux + semis + dimensions) — lot à part entière, la CI passera au rouge en cours de route ; c'est le but.
5. **R15.4** (forme de la courbe) — le plus structurant, à faire quand la CI est de nouveau digne de confiance.
6. **R15.5, R15.6, R15.8, R15.9** — hygiène de mesure, peuvent avancer en parallèle.

Après chaque chapitre : `bench_r15.js`, puis `bench_r13.js`, `bench_r14.js` (moins les trois critères périmés par R14.1), `bench_r14_1.js`, puis `audit:v6 / audit:v7`.
