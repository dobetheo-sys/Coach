# LOT 1 — LES GARDES INTERROGENT AU LIEU DE SAUTER

**Écrit, mesuré, NON accepté.** L'acceptation du brief est « golden 969 à 0 écart » ; il y a
**87 écarts**. Le brief prévoit ce cas et dit quoi en faire : *« un écart n'est pas une régression
— c'est une population que la mesure préalable n'a pas vue, et elle vaut plus que le lot. Dans ce
cas : ne pas corriger, mesurer qui et pourquoi, et remonter. »* C'est ce document.

Rien n'est recapturé, rien n'est ré-épinglé. La branche porte le code, l'arbitrage revient au
fondateur.

---

## 1. Ce qui est écrit

Les deux fonctions de vérité répondent désormais quelle que soit l'unité de prescription, et les
deux gardes lisent depuis elles. **La conversion n'est écrite dans aucune garde** — ce serait une
dérivation de plus à côté de celles qui existent (famille `_IFZ`) ; elle vit dans `stepMeters`,
inverse exact de `stepWorkMin`, la seule conversion allure → vitesse du dépôt depuis O-42.

```
stepWorkMin  durée de TRAVAIL d'un bloc, en minutes, quelle que soit l'unité
stepMeters   mètres d'un bloc, quelle que soit l'unité            ← nouvelle
stepMin      = stepWorkMin + récup inter-répétitions (R5.6a)      ← dérive de la première
```

Le `continue` de C24/C24b **reste** et devient inatteignable pour la raison qui le motivait : le
cas « bloc prescrit en TEMPS » ne se présente plus, et un zéro résiduel est désormais une absence
RÉELLE, que le sceau asserte (S7, rang DUR).

Les trois fonctions ne demandent plus qu'un `PaceRefs` (`css`/`thrPace`). Elles ne lisent pas la
FTP, et le point fixe — fonction de MODULE — n'en a pas sous la main : exiger un `Refs` entier
l'aurait forcé à **fabriquer** une FTP pour satisfaire un type, c'est-à-dire à inventer une donnée
pour appeler une garde.

---

## 2. Faute d'instrument, publiée — et c'est elle qui a coûté le plus

Ma première écriture appelait `stepMeters(st, sx.d, r.baseRefs)` **dans
`reconcileDeclaredVolume`**, où `r` n'existe pas : le point fixe est une fonction de module, il
reçoit ce qu'il lui faut par son `ctx`.

Elle **LEVAIT**. Et le symptôme était trompeur dans le sens le plus dangereux : `golden:verify`
affichait **476 écarts**, ce qui se lit comme « le lot change 476 plans ». Ce n'était pas un plan
qui change — c'était une exception avalée par le wrapper de `buildPlan`, visible seulement au
détail des champs, tous à `._r202 → undefined`. Un compte d'écarts élevé ressemble à un gros
rayon ; ici il ressemblait à un gros rayon **et il n'y avait aucun plan derrière**.

Les références transitent par `ctx.refs`, posées par l'unique appelant à côté de celles données à
`renderSess` — donc les deux mêmes valeurs, pas une source de plus.

---

## 3. La séparation des deux moitiés — expérience contrôlée, un seul facteur varie

Le lot touche deux gardes. Attribuer les 87 écarts à « le lot » aurait été un diff de LOT, pas une
causalité (corollaire de la règle 15). Chaque moitié a donc été neutralisée séparément, en
restaurant **exactement** son ancienne condition — et non en la supprimant : ma première cassure
retirait le plafond de dose *en entier*, y compris sa moitié ancienne qui agissait déjà sur les
blocs en minutes, et rendait **378 écarts** qui ne mesuraient pas ce que je croyais.

| moitié | cassure | golden |
|---|---|---|
| C24/C24b seule (plafond de dose restauré à `b.durationMin != null`) | ancienne garde | **0 écart / 969** |
| les deux | — | **87 écarts / 969** |

**La moitié C24/C24b est un no-op exact.** Le brief l'annonçait (« le no-op est prédit, pas
garanti ») : les séances qui rendaient zéro mètre sont des « Entretien (affûtage) » de 10-14 min,
soit 600-900 m de nage, très au-dessus d'un plancher de 150-400.

**Les 87 écarts viennent donc entièrement du plafond de dose.**

---

## 4. Qui — la population que la mesure préalable ne voyait pas

### 4a. Ce que l'ancienne garde laissait passer

Rejeu de la règle sur les blocs livrés, moteur d'AVANT (`scripts/mesureLot1.mjs`) :

```
blocs de qualité plafonnables : 19 080
…dont prescrits en MÈTRES     :  4 446  (23,3 %)   ← invisibles pour l'ancienne garde
…dont qui DÉPASSENT           :    244  sur 39 profils

total du dépassement : +2 273 min          pire bloc : +29,7 min
par zone   : sw.css 177 · rn.thr 67
par sport  : tri 177 · run 67
par niveau : inter 234 · avancé 10

  tri/Full/confirme/inter · « Nage seuil (+dist) » · sw.css · 1×2575 m = 49,4 min  (plafond 40)
```

Moteur d'APRÈS, même sonde : **0 dépassement**, 295 blocs livrés à la borne.

L'ampleur est donnée en **minutes d'abord** : le plafond est une borne absolue (40 min de seuil,
25 de VO2), donc un pourcentage y serait ininterprétable — corollaire de la règle 14.

### 4b. Pourquoi 87 profils pour 39 porteurs — mesuré, pas déduit

Ma sonde lit le plan **livré** ; la garde agit **pendant** la boucle R3.3, à chaque appel de
`scaleBlock`. Un bloc peut donc franchir le plafond à une échelle intermédiaire, être écrêté, et
changer toute la trajectoire, sans qu'aucun dépassement ne subsiste dans le plan final.

L'hypothèse a été **mesurée au point d'action** (compteur sur la branche mètres du plafond) plutôt
que supposée :

```
profils où la branche MÈTRES s'active : 87        ← exactement les 87 écarts
total d'activations                   : 2 453
par sport  : tri 50 · run 37
par format : tri/Full 38 · run/semi 31 · tri/70.3 12 · run/10k 6
par niveau : inter 60 · avancé 15 · débutant 12
```

C'est la même leçon que la règle 15, prise par l'autre bout : mesurer la SORTIE livrée est juste
pour juger un plan, et insuffisant pour compter les DÉCLENCHEMENTS d'une garde qui agit en cours
de construction.

---

## 5. Quoi — ce qui bouge dans les 87

87 profils, **7 familles de champs**, 87 champs au total :

| champ | n | amplitude |
|---|---|---|
| `_v2.intensity.weekly[N].e` / `.h` | 41 | médiane 3 min, **max 5 min** par semaine |
| `_r202.plafonds[N].brut` | 38 | médiane **0,15 h**, p90 0,50 h — 3 valeurs aberrantes, § ci-dessous |
| `_v2.intensity.hardPct` | 3 | 9 → 8 % |
| `_v2.intensity.easyPct` | 2 | 71 → 70 % |
| `_r202.argmin` | 2 | `"caps"` → `"boucle-growth"` |
| `_r202.volPeak` | 1 | 9,7 → 9,5 h |

**Aucune séance n'apparaît ni ne disparaît** ; le mouvement est du DUR qui devient du FACILE, ce
que le plafond de dose est fait pour produire.

### Les 3 valeurs aberrantes de `plafonds[N].brut` (24 → 72 h) ne sont pas ce qu'elles semblent

Elles portent toutes sur le maillon **`structurel`** (« le nombre de séances ») des profils
`O-21b/run/10k/*`, et ce maillon **ne borne rien** : `retire: 0`, l'argmin est `boucle-growth` à
4,51 h. Un `brut` de 71,7 h veut dire « si seul le nombre de séances te limitait, tu serais à
71,7 h » — c'est un diagnostic non contraignant, et son amplitude n'a aucune traduction dans le
plan. La médiane de la famille, 0,15 h, est le chiffre qui décrit les 35 autres.

### Les 2 bascules d'`argmin` sont HONNÊTES — vérifié en faisant varier le seul facteur

`run/semi/ancien/{inter,avance}/finir`. La carte « Pourquoi ce plan » passe de *« ton historique
te plafonne »* à *« la durée de ta préparation te plafonne »*. La chaîne dit pourquoi :

```
AVANT   4 maillons   argmin = caps            caps retire 0,900 h    volPeak 8,0
APRÈS   5 maillons   argmin = boucle-growth   boucle-growth 7,92 h < caps 8,10   volPeak 7,8
                                              et c'est le SEUL maillon à retire > 0 (1,080 h)
```

Le `min()` a réellement bougé, R20.2 le rapporte fidèlement. Le message change parce que la
contrainte a changé, pas parce que le diagnostic dérive.

---

## 6. Les deux rouges du banc v6 — et l'un des deux n'est pas une perte

`audit:v6` passe de **73 verts / 0 régression** à **71 verts / 2 régressions**. Vérifié dans les
deux états à moteur alterné : les deux étaient VERTS avant le lot.

### `C30-A` — le témoin du coureur RAPIDE bouge une troisième fois, par la même cause

`semi/inter/4:30/8h : 120 → 130` (le plafond de format).

Ce témoin porte déjà sa doctrine dans le banc, écrite deux fois : *« il ne doit RIEN à la
spécificité, sa cible est déjà atteinte ; il monte parce que du dur devient du facile et que le
tail O-21 le fait remonter à la sortie longue »* — c'est le mécanisme du quatrième état (B-02) et
du cinquième (O-42). **Troisième occurrence, cause nouvelle, mécanisme identique.** Le banc dit
lui-même quoi en faire : *« ré-épinglés avec leur raison, jamais exemptés »*. **Je ne l'ai pas
fait** — le périmètre est gelé et le brief demande de remonter, pas de corriger.

### `C30b-A` — le critère mesure « la passe s'est déclenchée », pas « la longue atteint sa cible »

`semi@7:00/6h : aucune décision C30b`. Expérience contrôlée, profil exact du banc :

```
             S 9 spec     S10 peak     S11 peak     décisions C30b
AVANT        106 min       129 min      130 min       1
APRÈS        115 min       129 min      130 min       0
```

**La sortie longue est identique au pic (130 min) et plus longue de 9 min en spécifique.** C30b ne
se déclenche plus parce qu'elle n'a plus rien à faire : la cible est atteinte sans elle. Le critère
rougit sur sa garde de non-vacuité (`vus < 4`), qui est exactement la garde que la règle 19 réclame
— et qui, ici, désigne un critère **sous-spécifié** : la propriété réelle est *« la longue atteint
sa cible de spécificité »*, dont *« C30b se déclenche »* n'est qu'un des chemins.

Réécrire ce critère sur la propriété serait un progrès, pas un affaiblissement. C'est aussi une
refonte de critère, pas un ré-épinglage mécanique : elle est enregistrée en **O-51** et laissée à
l'arbitrage.

---

## 7. État des gates

```
28 gates : 26 verts
  ✖ golden:verify   87 écarts / 969  — non recapturé, § 4-5
  ✖ audit:v6        2 régressions    — non ré-épinglé, § 6
```

`audit:v1` 459 · `audit:invariants` 20×54 · `audit:v7` · `audit:r13/r14/r14.1/r15/r18` ·
`audit:sensibilite` · les 9 `demo:*` · `mesure:sceau` · `check:app` · `check:sw` (reconstruit,
les fichiers servis ont changé) · `check:spec`/`tokens`/`disc`/`dup`/`hosts`/`noop` : **verts**.

---

## 8. Ce qui reste à décider — trois questions, dans cet ordre

1. **Le plafond de dose sur les blocs en mètres est-il voulu tel quel ?** Le brief le classait
   comme une garde à rendre *lisible* (lot 1) et réservait le *plafond effectif* au lot 2, dont le
   périmètre est « à re-mesurer de zéro depuis O-42 ». Or rendre la garde lisible **est**, sur les
   4 446 blocs en mètres, la rendre effective : les deux ne se séparent pas. Si la réponse est oui,
   le golden se recapture avec ces 87 profils. Si elle est non, la moitié C24/C24b se livre seule
   (0 écart) et la moitié plafond attend le lot 2 avec sa mesure déjà faite.
2. **`C30-A`** : ré-épingler `semi/inter/4:30/8h` à 130 avec sa raison, selon le précédent du banc.
3. **`C30b-A`** (O-51) : réécrire le critère sur la propriété plutôt que sur le déclenchement.

Les trois sont indépendantes. La première commande les deux autres.
