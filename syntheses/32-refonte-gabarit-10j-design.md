# 32 — Refonte du gabarit 10 jours : **une impossibilité à énoncer d'abord, puis trois designs**

**Brief 33** · 25/08/2026 · **aucun code, `src/` byte-identique à `2b87e10`.** Les densités
théoriques sont calculées sur la période de **70 jours** — le ppcm de 7 et 10, la seule fenêtre
où un cycle de 10 et une semaine de 7 sont commensurables. Les densités mesurées viennent des
fiches 29-31.

---

## 0. Le résultat qui contraint tout le reste

> **Un créneau à la densité du 7 jours (1 par 7 jours) dont deux exemplaires ne tombent JAMAIS
> dans la même fenêtre de 7 jours est forcément un créneau HEBDOMADAIRE.**
>
> Preuve : sur 70 jours il en faut 10. Leurs 10 espacements somment à 70. S'ils sont tous ≥ 7,
> ils valent tous exactement 7 — c'est-à-dire un rendez-vous fixe chaque semaine.

**Conséquence directe : aucun gabarit de 10 jours ne peut à la fois (a) tenir la densité du
7 jours sur `dur1`/`dur2`/`durLong` ET (b) ne jamais placer deux exemplaires du même créneau
dans une même semaine calendaire.** Les trois tentatives des fiches 29-31 n'ont pas échoué par
maladresse : elles se heurtaient à ça.

Il faut donc choisir laquelle des trois contraintes on relâche :

| on relâche | c'est | mesuré |
|---|---|---|
| la **densité** | le gabarit d'aujourd'hui | `dur1` −30 %, `durLong` −30 % → `REEL` −0,80 h |
| la **répétition** (deux fois le même nom dans une semaine) | l'option 2 (fiche 31) | densité réparée, **66 semaines** à séance longue répétée |
| l'**identité** (deux exemplaires, deux séances différentes) | l'option 1 (fiche 31) | **aucun contenu ne l'offre** — 66/66 mêmes noms |
| **la fenêtre** de la contrainte pédagogique | design B ci-dessous | la cadence de qualité redevient hebdomadaire |

---

## 1. Une conséquence à voir avant de dessiner : un gabarit à densité EXACTE est une permutation

Si un gabarit de 10 jours reproduit **toutes** les densités du 7 jours, alors sur 70 jours il
contient exactement le même sac de journées — 10 `dur1`, 10 `dur2`, 10 `durLong`, 10 `facile2`,
20 `facileR`, 10 `recup` — et **sa seule liberté est l'ORDRE**.

> **Un cycle de 10 à densité exacte n'ajoute rien : il réarrange.** Tout ce que le cycle peut
> APPORTER vient de ce qu'il choisit de NE PAS reproduire à l'identique.

Le gabarit d'aujourd'hui l'a d'ailleurs compris à moitié : il pose **1 récup par 10 jours** au
lieu de 1 par 7 (0,100 contre 0,143), ce qui libère 3 journées par 70. **Le défaut n'est pas
d'avoir libéré ces journées, c'est de les avoir dépensées en `dur2` et `facile2`** — les deux
créneaux dont les séances sont les plus petites — au lieu de les rendre au volume.

```
                 dur1    dur2   durLong  facile2  facileR  recup      (par jour, sur 70 j)
7 jours          0,143   0,143   0,143    0,143    0,286    0,143
gabarit actuel   0,100   0,200   0,100    0,200    0,300    0,100
```

---

## 2. Les vraies contraintes, réécrites

Ce que le gabarit doit tenir — et rien de plus :

1. **Densité de charge dure par JOUR** égale au 7 jours : `dur1`, `dur2` et `durLong` à 0,143.
   C'est la seule contrainte physiologique du lot ; les fiches 29-31 la mesurent comme la cause
   de la perte.
2. **Jamais deux jours durs consécutifs** — le 7 jours ne le fait jamais (positions 1, 3, 5), et
   c'est une propriété de sécurité, pas une habitude.
3. **La contrainte pédagogique de R5.5, mais formulée à la CONCEPTION** : « deux exemplaires du
   même créneau ne tombent pas dans la même fenêtre de 7 jours » — et le §0 dit à quel prix.
4. **Aucun contenu nouveau requis dans les 5 modules** (`tri`, `run`, `bike`, `swim`,
   `duathlon`). Toute proposition qui en demande doit le DIRE — c'est ce qui a disqualifié
   l'option 1.
5. **`cycleLen = 7` doit rendre le schéma de 7 jours à l'identique** — la garantie qui a tenu
   pour `structurel` (étape 2) et pour C22 (étape 3), et qui protège les 981 profils non-`use10`.
6. Le régime trail/swimrun ne dépend plus d'un **dépassement de tableau** (O-107) : ce que ces
   sports reçoivent sur 10 jours doit être ÉCRIT, pas hérité d'un `sch[7] === undefined`.

---

## 3. Design A — le gabarit exact, par BUDGET plutôt que par littéral

**Principe.** Le gabarit cesse d'être une liste écrite à la main : il DÉRIVE du vocabulaire de
créneaux du 7 jours, par répartition d'erreur (Bresenham) sur la longueur de cycle.

```
n(créneau, cycle k) = round(d7 × L × (k+1)) − round(d7 × L × k)
        avec d7 = la densité du créneau en 7 jours, L = cycleLen
```

Sur 10 jours ça donne 1 ou 2 exemplaires selon le cycle, et **exactement 10 par 70 jours**. Sur
`L = 7`, ça rend le schéma de 7 jours au littéral près — la garantie (5) est **structurelle**,
pas à espérer.

**Densité obtenue** : `dur1` 0,143 · `dur2` 0,143 · `durLong` 0,143 · `facile2` 0,143 ·
`facileR` 0,286 · `recup` 0,143 — la cible, exactement.

**Ce qu'il coûte.**
- C'est une **permutation** (§1) : il ne rend rien de plus que le 7 jours en volume. Il rend la
  densité, il n'ajoute pas de journée d'entraînement.
- **Il viole nécessairement la contrainte 3** (§0). `R5.5` doit donc être INFORMÉE — le drapeau
  `voulu` de l'option 2, posé par le gabarit qui SAIT qu'il a placé un doublon. Mesuré sous
  piste 1 : **66 semaines** porteraient deux fois la même séance longue ou de qualité.
- La position exacte des exemplaires reste à écrire (contrainte 2), et c'est là que le design se
  gagne ou se perd.

---

## 4. Design B — **découpler les deux cadences** (celui que je recommande)

**L'idée.** Le §0 dit qu'une cadence de qualité à 1/7 sans répétition EST une cadence
hebdomadaire. Alors on l'assume : **la qualité garde son rythme de 7 jours, et le cycle de
10 jours gouverne ce pour quoi l'athlète l'a demandé — la RÉCUPÉRATION et les jours faciles.**

```
jours DURS      : rythme de 7 jours, rôles en rotation dur1 → dur2 → durLong
                  (positions 1, 3, 5 de chaque semaine, exactement comme le 7 jours)
jour de RÉCUP   : 1 par CYCLE de 10 (au lieu de 1 par 7), glissé au premier jour non dur
jours restants  : faciles, répartis facile2 / facileR dans le rapport 1 : 2 du 7 jours
```

**Densité obtenue, calculée sur 70 jours :**

| | `dur1` | `dur2` | `durLong` | `facile2` | `facileR` | `recup` |
|---|---|---|---|---|---|---|
| 7 jours (cible) | 0,143 | 0,143 | 0,143 | 0,143 | 0,286 | 0,143 |
| **design B** | **0,143** | **0,143** | **0,143** | 0,157 | 0,314 | 0,100 |
| gabarit actuel | 0,100 | 0,200 | 0,100 | 0,200 | 0,300 | 0,100 |

Les trois créneaux durs sont **exacts**. Les 3 journées libérées par la récup à 1/10 vont
**intégralement au FACILE** (+10 % de `facile2` et de `facileR`).

**Pourquoi c'est la bonne dépense, et ce n'est pas une opinion** : c'est exactement le mécanisme
qui fait GAGNER les 7 profils du régime trail/swimrun aujourd'hui — leur schéma de 7 entrées
déborde et le repli leur ajoute trois `facileR` par cycle (O-107), et ils gagnent **+0,03 à
+1,10 h** de pic. Design B fait délibérément, pour les 5 sports génériques, ce que l'accident
fait pour deux d'entre eux. **Et il ferme O-107 par la même occasion** : ce que trail et swimrun
reçoivent sur 10 jours devient écrit au lieu d'être hérité d'un `undefined`.

**Ce qu'il gagne encore :**
- **`R5.5` ne se déclenche JAMAIS sur le gabarit**, par construction : chaque rôle dur revient
  exactement tous les 7 jours, donc jamais deux fois dans une fenêtre de 7. Pas de drapeau, pas
  d'exemption, pas de contournement — la passe garde son domaine intact pour les vrais accidents.
- **Aucun contenu nouveau** dans les modules.
- **Il réaligne l'implémentation sur l'intention documentée.** `answerSchema` dit « répartirait
  mieux le peu de créneaux disponibles », la décision `cycle` dit « densité mieux RÉPARTIE »,
  et l'avertissement de couverture dit « ESPACER les séances clés ». Le bloc d'en-tête de
  `weekBuilder.ts` note lui-même que **tous les textes décrivent un cycle d'espacement et que
  l'implémentation n'en est pas un**. Design B en fait un.

**Ce qu'il coûte, dit franchement :**
- **Les jours durs retombent sur des jours de semaine FIXES** (mardi/jeudi/samedi, comme en
  7 jours). Un athlète qui coche `shift_ok: oui` — « je peux décaler mes jours » — n'obtient
  plus un décalage de ses séances clés, mais une récupération plus espacée et plus de jours
  faciles. **C'est un changement de ce que la question PROMET, et c'est un arbitrage produit,
  pas technique.** Il faut soit l'assumer, soit reformuler la question.
- Le jour de récup doit glisser quand sa position tombe sur un jour dur : mesuré sur les
  7 cycles d'une période, **3 collisions sur 7**. La règle de glissement (« premier jour non dur
  à partir de la position 9 ») fait partie du design et doit être écrite, pas improvisée.

---

## 5. Design C — le minimum : garder le gabarit et informer `R5.5`

C'est l'option 2 de la fiche 31, **déjà mesurée** : `dur1` 0,101 → **0,116** (cible 0,114),
`durLong` 0,128, mais `dur2` écrasé à 0,067, et le pic cumulé des 31 profils à **−0,12 h** de la
ligne de base, `REEL` à **11,32 h**. Quatre points de contact dans un fichier.

Il est ici comme **référence de comparaison**, pas comme proposition : il achète la densité de
`dur1` en cassant celle de `dur2`, parce qu'il travaille dans un gabarit qui n'a que 10 cases.

---

## 6. Comparaison

| | **A — budget exact** | **B — cadences découplées** | **C — minimum (mesuré)** |
|---|---|---|---|
| `dur1` / `dur2` / `durLong` | 0,143 · 0,143 · 0,143 | **0,143 · 0,143 · 0,143** | 0,116 · 0,067 · 0,128 |
| `facile2` / `facileR` | 0,143 · 0,286 | 0,157 · 0,314 | 0,170 · — |
| `recup` | 0,143 | 0,100 | 0,100 |
| journées d'entraînement en plus vs 7 j | **0** | **+3 par 70 jours** | +3 par 70 jours |
| `R5.5` | doit être informée (drapeau) | **jamais déclenchée** | doit être informée |
| contenu de module à écrire | non | non | non |
| `cycleLen = 7` rend le 7 jours | **par construction** | par construction | oui |
| ferme O-107 (trail/swimrun) | non | **oui** | non |
| ce que perd l'athlète | la variété sur 66 semaines | **le décalage de ses jours durs** | la variété + `dur2` |

---

## 7. Le gabarit B peut-il ramener `REEL` à 12,32 h ? — réponse honnête

**Il retire la cause mesurée du déficit, et il n'en garantit pas le résultat. Voici pourquoi, et
jusqu'où je peux aller sans implémenter.**

Ce qui plaide pour :
- Le mode 7 jours livre **12,32 h avec exactement ces densités de créneaux durs**. Design B les
  reproduit au millième.
- Il ajoute **3 journées faciles par 70 jours**, et l'ajout de journées faciles a été mesuré
  comme un gain de pic partout où il s'est produit (swimrun **+0,75 à +1,10 h**, O-107).

Ce qui plaide contre, et qui est mesuré aussi :
- La semaine de pic de `REEL` sous `use10` porte **9 créneaux à 76,8 min** contre **8 à 92,4 min**
  en 7 jours (fiche 28). **Plus de créneaux y produit des séances plus COURTES**, et le total
  baisse. Ce second mécanisme n'a rien à voir avec le gabarit : il vit dans les bornes de séance
  et dans le budget annoncé (**O-97**, non corrigé). Design B ajoute encore des journées ; il
  pourrait donc en récolter moins que l'arithmétique ne le suggère.
- La chaîne R20.2 nomme `structurel` comme le maillon qui borne `REEL` dans **les deux** modes.
  Un gabarit ne déplace pas un maillon.

**Ce que je peux dire sans mentir** : design B doit au minimum ramener `REEL` au niveau de sa
ligne de base 7 jours **sur les densités**, et il devrait la dépasser sur le volume grâce aux
journées libérées — mais **la fourchette réaliste va de 11,5 à 12,3 h, et je ne peux pas la
resserrer sans l'implémenter**. Annoncer 12,32 h serait une promesse invérifiable ; le brief
demande explicitement de ne pas en faire.

---

## 8. Plan d'implémentation et de test, si une direction est validée

**Découpage en 4 pas livrables séparément**, chacun mesurable seul :

1. **Pas 1 — la dérivation, sans changer le comportement.** Écrire `schema()` comme une
   dérivation depuis le vocabulaire du 7 jours, et **vérifier qu'à `cycleLen = 7` elle rend le
   littéral actuel caractère pour caractère** (test d'égalité de tableaux, pas d'inspection).
   `golden:verify` doit rendre **0 écart sur les 1 012 profils**, `use10` compris : à ce stade
   rien ne doit bouger. C'est le pas qui rend les trois suivants sûrs.
2. **Pas 2 — la cadence de qualité hebdomadaire** (design B) pour le régime générique, sous
   `use10` uniquement. Mesures : densité des 4 créneaux sur les 31 profils, pic livré avant/après
   profil par profil, et **le compte de jours durs consécutifs** (contrainte 2) qui doit rester à
   zéro. `golden:verify` doit rendre **0 écart sur les 981 non-`use10`** et recapturer les 31.
3. **Pas 3 — la récup au cycle et la règle de glissement.** Mesures : nombre de collisions
   résolues, longueur maximale de série de charge (elle ne doit pas dépasser `recupEvery` — c'est
   le garde R18.5, qui domine toutes les règles de placement).
4. **Pas 4 — écrire ce que trail et swimrun font sur 10 jours** (O-107), en partant de ce que le
   dépassement leur donne aujourd'hui, pour que le comportement soit **conservé volontairement**
   plutôt que subi. Critère : les 7 profils du régime A gardent leur pic à ±0,05 h.

**Gardes à écrire dans le même commit que le pas 2** (une garde se prouve dans les deux sens) :

- **T-6x — la densité est une propriété du gabarit, mesurée sur le LIVRÉ** : pour chaque créneau
  dur, densité `use10` = densité 7 jours à ±5 % sur les 31 profils. Contre-preuve : remettre un
  seul `dur1` par cycle → rouge.
- **T-6x+1 — `cycleLen = 7` est l'identité** : le gabarit dérivé à 7 égale le littéral. Contre-
  preuve : perturber un terme de la dérivation → rouge. **Et son jumeau de SENSIBILITÉ** : à
  `cycleLen = 10` il en DIFFÈRE (sans quoi une constante gelée satisfait le test — règle 19).
- **T-6x+2 — `R5.5` ne se déclenche plus sur le gabarit** : compter ses interventions sur les
  31 profils, attendu 0 sur `dur1`/`durLong`. Contre-preuve : rapprocher deux rôles à 6 jours →
  la passe se déclenche → rouge. **Ce compte doit publier sa population** (un zéro a besoin de sa
  population) : « 0 sur N semaines de charge inspectées ».
- **T-6x+3 — aucun jour dur consécutif** sur les 1 012 profils, `use10` et 7 jours.

**Et une mesure préalable AVANT le pas 2**, qui décide s'il faut aller plus loin : rejouer la
fiche 28 sur un plan à densité corrigée — **combien de créneaux la semaine de pic de `REEL`
porte-t-elle, et à quelle durée moyenne ?** Si elle repasse à 8 créneaux à ~92 min, le gabarit
suffit ; si elle reste à 9 à ~77 min, **c'est O-97 qui commande la suite** et le gabarit aura
fait tout ce qu'il pouvait.

---

## 9. Ce que je ne recommande pas, et pourquoi

- **Design A seul** : il rend la densité mais c'est une permutation (§1) — il n'ajoute aucune
  journée d'entraînement et il coûte quand même la variété sur 66 semaines. On paie un prix
  pédagogique pour un réarrangement.
- **Option 1 (contenu)** : mesurée à **+0,04 h** dans son meilleur cas (fiche 31). Elle a une
  vraie valeur — ne pas afficher deux fois la même carte — mais elle appartient à un lot de
  contenu, pas au chantier du volume.

**La décision reste ouverte.** Design B est celui que la mesure soutient le mieux, et il a un
coût produit qui n'est pas à moi de trancher : **un athlète qui a répondu « je peux décaler mes
jours » recevrait des jours durs fixes.** Si cette promesse doit être tenue, c'est le design A
qu'il faut prendre, avec sa facture pédagogique.
