# LOT 1 — LES GARDES INTERROGENT AU LIEU DE SAUTER

**Livré.** Q1 a été re-tranchée le 17/08/2026 : le plafond reste, le golden est recapturé avec la
note d'enchevêtrement O-43. Les §§1 à 8 sont l'état du lot avant cet arbitrage ; le §9 rectifie
une mesure fausse qui avait fondé la première décision, les §§10-12 ce que la règle 17 et le sceau
ont trouvé, et le **§13 l'état final**.

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

> ⚠ **CETTE SECTION ÉTAIT FAUSSE. Voir le §9, qui la remplace.** Elle est conservée telle quelle
> parce qu'elle est ce sur quoi l'arbitrage Q1 a été rendu, et qu'effacer une mesure erronée
> effacerait aussi la trace de ce qui a fondé une décision.


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

---

## 9. RECTIFICATION — le §5 mesurait le PREMIER écart de chaque profil, pas l'ampleur

**La faute est à moi, elle a fondé l'arbitrage Q1, et elle est du type que ce dépôt paie le plus
souvent : une mesure qui NOMME une grandeur et en MESURE une voisine.**

J'ai chiffré l'ampleur du lot en agrégeant les lignes affichées par `golden:verify`, et publié
« médiane 3 min par semaine, max 5 » et « aucune séance n'apparaît ni ne disparaît ». Le golden dit
pourtant lui-même ce qu'il fait — `firstDiff` rend **le PREMIER** écart d'un profil, sous un
commentaire qui l'énonce : *« où compte plus que combien pour corriger »*. C'est un bon choix pour
LOCALISER et un mauvais chiffre pour MESURER. J'ai agrégé 87 *premiers* écarts et je les ai
présentés comme le mouvement total.

Neuvième occurrence de cette famille — et la première où l'outil dont je tirais le chiffre
**documente explicitement** qu'il ne mesure pas ça.

### L'ampleur réelle (`npm run mesure:lot1-ampleur`, témoin sur disque, moteur d'avant)

965 profils générés, **65 bougent** (le golden en compte 87 : il hache plus de champs que le
volume et la structure).

| grandeur | somme | médiane \|écart\| | p90 | max | sens |
|---|---|---|---|---|---|
| volume TOTAL du plan | **−417 min** | 13 min | 64 | **518 min** | 50 ↓ · 13 ↑ · 2 = |
| dont **NAGE** | **−1 420 min** | 5 min | 44 | **272 min** | **38 ↓ · 0 ↑** · 27 = |
| **courbe DÉCLARÉE** | +546 min | 6 min | 66 | **942 min** | 32 ↓ · 10 ↑ · 23 = |

Ramené à la semaine — l'unité dans laquelle la règle agit :

```
G/tri/Full/vol-max      36 sem   total −11 min/sem   nage −7,6 min/sem   (3 483 → 3 211, −7,8 %)
G/tri/Full/dispo-weekend 36 sem   total −6 min/sem    nage −5,2 min/sem
C30/run/semi/4:30       75 sem   total +6,9 min/sem  courbe +12,6 min/sem
```

### Trois énoncés du §5 étaient faux

1. **« Aucune séance n'apparaît ni ne disparaît »** — **2 profils** changent de nombre de séances
   (`G/tri/Full/vol-max` 205 → 206, `G/tri/Full/dispo-weekend` 144 → 143).
2. **« max 5 min par semaine »** — le maximum réel est **518 min sur un plan**, soit 6,9 min par
   semaine sur 75 semaines ; et **−272 min de nage** sur une prépa de Full, soit −7,6 min/semaine.
3. **« du dur devient du facile »** — vrai en intensité, mais incomplet : **la nage ne fait que
   BAISSER (38 profils à la baisse, 0 à la hausse)**, systématiquement, et concentrée sur le Full.

### Ce qui, en revanche, tient — et c'est la moitié qui compte

**Aucun plan ne livre au-dessus de sa cible : il n'y a AUCUNE coupe non réallouée.** Le critère
n°3 d'O-44 — le vrai test — est vert. Le livré suit sa courbe aussi bien qu'avant sur 62 profils
sur 65.

Les 3 restants ne sont pas des coupes : leur livré MONTE (+518 min) et leur courbe monte
**davantage** (+942). C'est la cible déclarée qui court devant le livré, famille T-25/O-35.
*(Mon script rendait d'abord là-dessus un verdict unique — « une coupe n'est pas réallouée » —
parce qu'il mesurait un écart en valeur ABSOLUE : deuxième faute d'instrument du même après-midi,
dans le sens alarmant cette fois. Un écart absolu ne peut pas distinguer les deux sens.)*

### Le mécanisme, mesuré et non déduit

Le volume ne bouge pas parce que le plafond ampute. Il bouge parce que **la COURBE bouge** :

```
G/tri/Full/vol-max   S20  courbe 624 → 606      livré 621 → 608
                     S29  courbe 768 → 744      livré 766 → 746
```

Le livré colle à sa courbe dans les deux états ; c'est la courbe qui a baissé. La sonde de
capacité V2.1 lit un clone SATURÉ de la semaine LIVRÉE : moins de travail dur livré → capacité
mesurée plus basse → courbe plus basse. **C'est O-43 exactement** — *« une sortie calculée ne se
relit jamais comme une entrée ; si une contrainte se dérive du contenu GÉNÉRÉ, elle mesure le
générateur et non l'athlète »* — et c'est un défaut OUVERT.

### Ce que ça change pour l'arbitrage Q1

Ton motif **physiologique** est intact : 50 min de seuil en un bloc est une dose excessive, le CSS
est le seuil (B-02a), le plafond de 40 lui revient. Rien de ce que je viens de mesurer ne le
touche.

Ton motif **de mesure** reposait sur mes chiffres, et ils étaient faux. Ce qu'il faut savoir avant
de recapturer :

```
· la nage ne baisse QUE : 38 profils, 0 hausse, jusqu'à −7,6 min/semaine sur un Full
· 2 plans changent de nombre de séances
· l'effet sur le volume passe ENTIÈREMENT par O-43 — un défaut ouvert. Recapturer le golden
  gèle la sortie de cette boucle en même temps que celle du plafond, et les deux ne se
  séparent plus une fois la photo prise.
```

**Rien n'est recapturé.** La décision te revient à nouveau, sur les bons chiffres.

### La mesure de répartition du §1 — et elle va dans le sens de ton avertissement

```
295 blocs livrés À la borne, sur 49 profils :
   tri/Full   231  (78,3 %)
   tri/70.3    64  (21,7 %)
   run           0
   par séance : « Nage seuil » — 295 sur 295, une seule séance
```

**Concentré, comme tu le craignais.** C'est bien « le plafond mord systématiquement sur un
format », et sur une seule séance : la nage seuil principale du triathlon longue distance y est
désormais TOUJOURS à 40 min de travail au seuil.

Nuance mesurée : au POINT D'ACTION la population est plus large (87 profils, `run/semi` 31,
`run/10k` 6) — la course est écrêtée elle aussi, mais elle est rééchelonnée sous le plafond
ensuite, donc elle ne finit pas à la borne. Les deux vues sont vraies et ne répondent pas à la
même question — c'est le §4b, encore.

### Vérification A du §1 — tenue, et elle ouvre un point

Les **24 paliers de continuité B-17 sont livrés à leur cible au mètre près** (`sonde:b17`, garde
antérieure au lot) : aucune nage continue, aucune simulation de course n'est écrêtée. Elles vivent
en `sw.aero`, hors de la liste des zones plafonnées.

Mais le croisement n'existe pas **par accident de zone**, pas par garde : `DOSE_CAP_MIN` ne teste
pas `pinned`. Un bloc épinglé dit « la distance EST le stimulus » (I14) ; s'il apparaissait un jour
dans une zone plafonnée, il serait raboté en silence. Mesuré aujourd'hui : **0 croisement**.
Enregistré en **O-53**, pas corrigé — périmètre gelé.

### Vérification B du §1 — la valeur 40 pour un Full

À écrire dans l'entrée `C25` une fois Q1 re-tranché, avec le chiffre qui la rend révocable : sur
`tri/Full`, ce plafond n'est plus une exception mais **le régime permanent** de la nage seuil
(231 blocs sur 231 à la borne). La question « 40 est-il la bonne valeur » ne porte donc pas sur des
cas extrêmes : elle porte sur la dose hebdomadaire de seuil en nage de tout athlète de longue
distance.

---

## 10. RÈGLE 17 — les blocs `verify` rejoués, et ce qu'ils ont trouvé

*« Après tout déplacement de code, tous les blocs `verify` sont rejoués, et toute entrée qui
bascule en “ne reproduit plus” est confirmée À LA MAIN avant d'être crue. »* Fait. **Aucune des
deux bascules n'était une réparation, et l'une des deux dit l'inverse de ce que le registre en a
conclu.**

### O-21 — le bloc épinglait un COMPTE sur un échantillon de deux points

Le registre a rangé l'entrée en « ne reproduit plus » parce que sa sortie ne contenait plus
« inversions d'allure : 1 ». À la main : **elle rend 2**. L'entrée ne reproduit pas moins, elle
reproduit **plus** — le motif absent se lisait comme un défaut réparé, c'est le mode de défaillance
exact que la règle 17 nomme.

Élargi de 2 à **60 couples voisins** (4 formats × 5 volumes récents × 4 allures), le verdict
**s'inverse** :

```
                    inversions      écart max
avant lot 1         22 / 60           2,7 %
après lot 1         13 / 60           4,6 %
```

Moins nombreuses, une pire. Un échantillon de deux points ne mesure pas une monotonie : il tire à
pile ou face, et il a fait basculer l'entrée dans les deux sens sans rien dire du défaut. Le bloc
porte désormais sur la **propriété** (« il reste des inversions ») et la sonde est enregistrée
(`npm run sonde:o21`).

### D3-couverture — l'attente « 0 » était fausse dès son écriture

`PROMESSES NON TENUES : 0` attendu, **2 mesuré**. Vérifié à la main contre le moteur d'avant :
**2 avant comme après** — le lot n'y est pour rien. La sonde elle-même nomme ces 2 plans (format
S, le véhicule `facile2` n'existe pas en phase spécifique) et conclut *« le fait est NOMMÉ et
chiffré, pas corrigé sans mandat »*, le placement étant gelé par le §4 de l'arbitrage D3. Le bloc
attendait donc un chiffre que la mesure qu'il invoque contredit dans le même écran. Réécrit sur le
TAUX, la grandeur que la sonde publie et défend.

### Six commandes cassées — une seule vient de ce lot

`O-39-d` grepait `reps * b.durationMin > doseCap`, **la ligne exacte que le lot a réécrite**. Cas
d'école : le motif disparaît, l'entrée se lirait comme réparée, et c'est le CODE qui a changé de
forme. Sa moitié « les blocs en distance sont invisibles » est effectivement FERMÉE par le lot
(244 dépassements → 0) ; sa moitié « `css` est résolu sur `thr` » reste vraie, et le bloc porte
désormais là-dessus, sur la propriété.

Les cinq autres sont antérieures et diagnostiquées : `O-44` et `B-17-D3` grepent des noms et des
sorties que les lots précédents de cette session ont renommés ; `O-43-frequence` exige l'absence de
`MAX_SWIM_DAYS`, qui existe désormais ; `O-37` et `T-27b` attendent `✓ T-27`, qui est rouge — voir
juste en dessous. Elles ne sont pas réparées ici : le périmètre est gelé et aucune ne concerne le
lot.

---

## 11. RÉGRESSION — le sceau. Et je ne l'avais pas vue parce que `lotPhysio` n'était pas dans ma boucle

`npm run audit:v6` et les 26 autres gates étaient verts. **`scripts/lotPhysio.mjs` ne l'est pas**,
et il déclare une régression franche. Il n'est pas dans `.github/workflows/audit.yml` — je l'avais
donc omis de ma passe, et c'est une omission de ma part, pas une absence de signal.

Expérience contrôlée, un seul facteur :

```
avant lot 1   ✓ T-27  le sceau est posé sur le plan livré      14 verts · 0 régression
après lot 1   ✖ T-27  cliquet : S4 352 au lieu de 351          13 verts · 1 RÉGRESSION
                                S5 508 au lieu de 500
```

Les invariants DURS restent à **zéro** — ce n'est pas une violation de sécurité. Ce qui monte est
le cliquet des invariants DÉCLARÉS :

- **S5 (T-25) : 500 → 508**, huit profils de plus où `min(plafonds)` du record R20.2 ne vaut pas le
  pic livré. C'est **exactement le mécanisme du §9** : la courbe bouge sous la sonde de capacité,
  la chaîne déclarée et le livré s'écartent. T-25 est une entrée OUVERTE dont la cause est nommée
  depuis O-35 ; le lot l'élargit de 8.
- **S4 (I14) : 351 → 352**, une semaine de plus où la sortie longue n'est pas la plus longue de sa
  discipline. La famille est connue (`mesure:sceau` en montre le type : une VO2max de 45 min contre
  une longue de 44 sur un 5 km) ; un cas de plus, non nommé — je ne l'ai pas isolé.

Le cliquet est un cliquet : il refuse une hausse, et il a raison de la refuser. **Non modifié** —
relever un cliquet pour faire passer un lot est précisément ce qu'il existe pour empêcher.
C'est le troisième élément qui dépend de l'arbitrage Q1 : si le plafond de dose reste, le cliquet
se réépingle avec ces deux chiffres et leur raison ; s'il est révoqué, il n'y a rien à faire.

---

## 12. État, et ce qui attend une décision

```
audit:v6            73 verts · 0 régression   (C30-A ré-épinglé, C30b-A reformulé)
26 autres gates     verts
golden:verify       87 écarts   ← NON recapturé, § 9
lotPhysio           1 régression (T-27, cliquet du sceau)   ← NON ré-épinglé, § 11
```

Trois choses attendent la même décision, et une seule :

```
Q1 · le plafond de dose sur les blocs en MÈTRES reste-t-il, sachant que :
     · il corrige 244 blocs réellement sur-dosés, jusqu'à 49,4 min de seuil en un bloc
     · sur tri/Full il devient le RÉGIME PERMANENT de la nage seuil (231/231 à la borne)
     · la nage ne fait que baisser (38 profils, 0 hausse, jusqu'à −7,6 min/semaine)
     · son effet sur le volume passe entièrement par O-43, un défaut ouvert
     · il élargit T-25 de 8 profils et I14 d'un

   si OUI  → recapturer le golden · réépingler le cliquet S4/S5 avec leur raison
   si NON  → livrer la moitié C24/C24b seule (0 écart, no-op mesuré exact) et
             porter le plafond au lot 2 avec la mesure déjà faite
```

---

## 13. Q1 RE-TRANCHÉE — livré, avec l'enchevêtrement enregistré

Les six premiers items de l'ordre sont faits.

```
1. golden recapturé, 969 profils, 0 écart — AVEC la note d'enchevêtrement O-43, écrite
   dans l'en-tête de goldenMaster.mjs, là où quelqu'un la lira en cherchant pourquoi
   la photo dit ce qu'elle dit
2. cliquet du sceau ré-épinglé : S4 351 → 352, S5 500 → 508, chacun avec sa cause
3. C30-A ré-épinglé · C30b-A reformulé avec sa contre-preuve      (faits au tour précédent)
4. lotPhysio ajouté à .github/workflows/audit.yml                  ← 29ᵉ gate
5. O-53 fermé : le plafond de dose teste `pinned`, gardé par T-39
6. O-52 fermé (b) · (a) réfuté                                     (fait au tour précédent)
```

**S4 est ré-épinglé en disant « un cas de plus, non isolé »** plutôt qu'habillé d'une cause
plausible — c'est ta formulation, et elle est meilleure que ce que j'aurais écrit.

### O-53 : la garde ne prouvait rien, la contre-preuve a dû rendre le croisement non vide

Une condition sur un croisement vide est satisfaite par un moteur sans aucune garde. `sw.aero` a
donc été ajoutée aux zones plafonnées pour mesurer :

```
(a) `sw.aero` hors liste, garde posée .....  57 rabotés / 308   ← état livré
(b) `sw.aero` PLAFONNÉE, garde posée ......  57 rabotés / 308   ← inchangé : elle tient
(c) `sw.aero` PLAFONNÉE, garde RETIRÉE .... 195 rabotés / 308   ← +138 : elle sert
```

### Et cette mesure a trouvé O-54, plus gros que le ticket qu'elle servait

Pour que la garde ne soit pas vacue, il fallait connaître la population des blocs épinglés.
**57 sur 308 (18,5 %) ne sont pas livrés à leur épingle — avant comme après le lot**, donc défaut
antérieur. Cause : **53 des 57 tombent sur une séance de exactement 850 m**, la borne C15 du
débutant. Une nage continue épinglée à **3 800 m est livrée à 500**.

Que C15 gagne est probablement juste — un débutant ne nage pas 3 800 m en continu, et c'est la
doctrine de `C30-B`. Ce qui ne l'est pas : **le titre dit « Nage continue en eau libre — 3800 m
d'affilée » et la séance en contient 500.** L'athlète lit un nombre que son plan ne contient pas,
dans le nom de la séance. Famille R19.5 et U9.

`sonde:b17` annonçait « 0 écart cible↔livré » : elle n'échantillonne **aucun débutant**.
Cinquième occurrence de la famille A-2.

### §4b mesuré — et ma formulation était encore trop forte

J'avais écrit que le plafond « devient le RÉGIME PERMANENT de la nage seuil sur tri/Full
(231/231 à la borne) ». **C'est faux, et c'est la même faute que les trois précédentes** : 231/231
comptait « parmi les blocs À LA BORNE, combien sont en tri » — pas « parmi les blocs de tri,
combien sont à la borne ». Ton §4 raisonne sur ma phrase.

Mesuré (`npm run mesure:dosefull`) :

```
                semaines à la borne     première semaine à la borne
   Full             22 %                médiane S17 · phase `dev` pour 31 profils sur 37
   70.3             25 %                médiane S15 · phase `spec` pour 10 sur 12

   295 semaines à la borne sur 1 333 qui portent du seuil (22 %), sur 49 profils
   exemple Full : 17 semaines de seuil, 2 à la borne, dose 28,8 → borne → 9,6 (affûtage)
```

**La progression existe avant la borne.** La dose monte de la base au développement, et c'est là —
S17 en médiane — que le plafond la fige. Ce n'est pas « constante sur neuf mois », c'est « plate
sur le dernier tiers de la montée ». Le ticket reste valable, son ampleur est plus petite que ce
que ma phrase annonçait : **O-55**, avec la contrainte que si la progression doit continuer, c'est
le NOMBRE de blocs qui monte et pas la dose d'un bloc — C26c prise dans l'autre sens.

### Quatre fautes d'instrument sur ce lot, et la quatrième est la même que les trois autres

```
1. `stepMeters(…, r.baseRefs)` dans une fonction de module   → 476 « écarts » qui étaient un crash
2. l'ampleur lue sur `firstDiff`                              → 87 champs annoncés, 6 403 réels
3. un écart en valeur ABSOLUE                                 → « coupe non réallouée » à l'envers
4. « 231/231 à la borne »                                     → dénominateur inversé
```

Ta formulation du §8 les couvre toutes : *un outil de localisation et un outil de mesure ne sont
jamais le même outil, et le premier produit toujours un nombre qui a l'air d'être le second.* La
quatrième ajoute son propre corollaire — **un ratio dont on ne dit pas le dénominateur est un
nombre sans grandeur**, et il se lit toujours dans le sens le plus frappant.
