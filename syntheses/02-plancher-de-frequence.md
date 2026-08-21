# Le plancher de fréquence — deux est la borne, trois est la cible

**Commit** `a12173c` · 21/08/2026 · **arbitrage** `PLANCHER_FREQUENCE.md`
**Livré** : `src/engine/plancherFrequence.ts` · décision `frequence` · garde **T-60** · pièce **C3**
livrée bornée

---

## 1. La valeur a bougé une troisième fois

Tu avais mesuré que **3** condamnait 42 % des semaines de ton profil, et redescendu à **2**. Mesuré
sur le **corpus** — 3 522 semaines de charge, 188 profils tri :

```
sous 3 nages   3 502 / 3 522   99,4 %     la « cible » n'est pas approchée, elle est hors d'atteinte
sous 2 nages   2 261 / 3 522   64,2 %     poser 2 en dur condamnerait DEUX TIERS du corpus
à ZÉRO nage       22 / 3 522    0,6 %
```

Poser « 2 en dur » referait, un cran plus bas, exactement ce que tu refusais pour 3.

### Ce qui sépare les populations n'est pas l'athlète, c'est le BUDGET

```
≤5 séances/sem   nage moy 1,24   ·   sous 2 : 70,9 %
6-7 séances      nage moy 1,37   ·   sous 2 : 63,7 %
8-9 séances      nage moy 3,05   ·   sous 2 :  0,0 %      ← le plancher y est DÉJÀ tenu
≥10 séances      nage moy 2,00   ·   sous 2 :  0,0 %
```

Avec 6 créneaux pour 3 disciplines, deux nages c'est un tiers des séances pour une discipline qui
pèse 12 % du chrono : ce n'est pas un défaut, c'est l'allocation qui fait son travail. **Au-dessus
de 8 séances le plancher est tenu par 100 % du corpus sans qu'aucune règle ne l'impose** — il ne
condamne rien et il borne ce qui viendrait le franchir. C'est l'usage exact que ton document lui
assigne : *« posé avant, il borne la pièce ; posé après, il est franchi par elle. »*

---

## 2. Les trois niveaux livrés

```
ZÉRO  (dur)       jamais une semaine de charge sans une seule séance d'une discipline de l'épreuve
                  → DÉRIVÉ : aucun nombre à choisir, vaut pour les 3 disciplines et tout sport multi
DEUX  (plancher)  sur la discipline la plus basse, quand le budget ≥ 8 séances le rend tenable
TROIS (cible)     publiée par la décision `frequence`, JAMAIS forcée (O-17)
```

**Ce module n'est pas une passe** : il ne rattrape aucune semaine. Nommer une borne « dure » sans
l'appliquer serait malhonnête si ce n'était pas écrit — c'est écrit, dans le module et au registre.

---

## 3. Tes deux questions du §3

### `swim_limit` ne peut pas porter le domaine — deux mesures l'écartent

1. **La clé n'est déclarée que pour le sport `swim`.** `ANSWER_SCHEMA` ne la pose pas en triathlon :
   sur ton profil elle n'existe pas, le plancher serait inerte là où il doit border.
2. **La borne d'épaule ne lit PAS un adjectif déclaré.** Son propre en-tête (O-85 §1) dit l'inverse
   mot pour mot : elle lit la continuité **mesurée** rapportée à la distance de course, *« jamais
   sur un adjectif auto-déclaré — c'est la leçon R14.1, payée quatre fois »*. Ton analogie pointe
   donc vers la mesure, pas vers la clé.

Et le proxy mesuré **ne sépare rien** : nage limitante **63,2 %** sous 2 nages, les autres
**77,4 %** — la classe « nage limitante » n'est pas celle qui nage le moins.

### Il n'est pas le premier — la réponse est non, deux fois

`C29`/`C29b`/`C29c` tiennent un plancher de fréquence en **affûtage** (Bosquet 2007, ≥ 80 %), et
`S7_COLD` du swimrun porte déjà la forme à deux grandeurs (`minSessionsPerWeek` /
`idealSessionsPerWeek`). **La forme retenue est celle de `S7`** — un troisième vocabulaire pour la
même idée serait ce que R11.1 interdit.

---

## 4. ⚠ L'unité décide du verdict

```
sans les legs de brick   119 semaines de charge tri à zéro séance d'une discipline
avec les legs             30
```

Un brick EST du travail de vélo et de course ; il ne contient jamais de natation.
`seancesDiscipline` est le point unique — le module, la décision et la garde comptent tous par lui.

---

## 5. Le plancher a fait son travail AVANT la pièce

`C3` rejouée telle quelle vidait complètement la natation de **`G/tri/Full/doubles` S12 et S14** :
deux semaines de préparation d'Ironman sans une seule nage — exactement ce que ton §2 déclare
inacceptable. Le niveau ZÉRO passait de 30 à **32**.

La pièce consulte donc un **neuvième paramètre**, `creneauxDuSlot` : elle ne convertit le premier
exemplaire d'un créneau que si un second subsiste. **Une** condition, pas une exclusion.

| état | pic | nage | vélo | course | nages/sem | ZÉRO | sous plancher 2 |
|---|---|---|---|---|---|---|---|
| sans C3 | 11,2 h | 28,0 % | 39,9 % | 32,1 % | 2,84 | 30 | **4** |
| C3 non bornée | 11,5 h | 25,0 % | 45,2 % | 29,9 % | 2,35 | **32** ✗ | 1 |
| **C3 bornée (livrée)** | **11,5 h** | 26,5 % | **43,3 %** | 30,1 % | 2,48 | **30** ✓ | **1** |

La version bornée est **strictement meilleure** que la non bornée sur tous les axes sauf l'ampleur
de l'allocation : même pic, aucune semaine vidée, et 0,13 nage/semaine de plus.

---

## 6. ⚠ La surprise : la discipline sous le plancher est le VÉLO

```
sans C3   4 semaine-disciplines sous 2 alors que le budget le permet
          REEL S4 · S14 · S24 : le VÉLO à 1 séance    ·    REEL S2 : la COURSE à 1
avec C3   1  (la course de S2)
```

**Aucune des quatre n'est la natation.** C3 — qui ajoute du vélo — en répare trois. La prédiction
« la nage est la victime par défaut » **ne tient pas sur cet axe** : sur le profil à gros budget,
c'est le vélo qui manque de fréquence.

⚠ **Faute de mon instrument, publiée** : ma première sonde testait `sw < 2` — elle ne regardait QUE
la natation et rendait « 0 sous le plancher » pour les deux variantes. Le cadrage du document
(« trois nages », « `swim_limit` ») m'y avait conduit, et un critère qui NOMME un plancher de
fréquence en MESURE une seule discipline est la faute mesurée treize fois dans ce dépôt.

---

## 7. La contradiction de ton §4, chiffrée

```
C3 rapproche de l'allocation      vélo 39,9 → 43,3 %      nage 28,0 → 26,5 %
C3 éloigne de la cible de freq.   13/31 → 18/31 semaines sous 3 nages
```

Ta position est retenue telle quelle : *« à volume constant, l'allocation prime — 2,48 nages restent
au-dessus du plancher »*. La borne, elle, n'a pas été franchie. **Et à 13 h la contradiction
disparaît** : quatrième fois que le volume et la répartition se révèlent inséparables.

---

## 8. Deux défauts de MON écriture, trouvés par la mesure de sortie

1. **Ma première borne passait le BUDGET DE SÉANCES de la semaine — inerte par construction.**
   Le doublage n'est pas représenté par des `GenDay` supplémentaires (un jour porte plusieurs
   séances), donc le compte plafonnait à **7** là où la semaine livre 8 à 10 : toute condition
   « budget ≥ 8 » ne pouvait jamais être vraie. Mesuré, C3 devenait totalement inerte. **Règle 15
   dans mon propre instrument** — j'ai MODÉLISÉ le budget au lieu de l'OBSERVER, et le modèle ne
   pouvait pas atteindre le seuil.
2. **Le module manquait au BUNDLE, et rien ne l'a signalé au build.** `scripts/buildApp.mjs`
   maintient sa liste `ORDER` à la main : le bundle a reçu les *appels* sans les *définitions*, et
   il a annoncé « ✓ bundle injecté ». C'est `audit:v1` qui l'a dit, à **108 erreurs et 351
   combinaisons au lieu de 459**. Quatrième habillage de « une garde qui valide `src/` ne valide pas
   ce qui est LIVRÉ » — ici la construction ne perd pas un alias, elle perd un fichier entier.

---

## 9. Trouvé en chemin — le ticket de `T-58` portait un compte périmé

Le banc ne compare que le ROUGE au ROUGE : **un test attendu rouge peut voir son compte doubler sans
que rien ne le dise.** Le ticket annonçait « 2 plans sur 68 », chiffre écrit le jour de sa pose et
jamais re-mesuré ; `HEAD` en rendait **3**, REEL compris (S38, 37 min sous la ligne). Le creux de
REEL est **antérieur** à C3 — vérifié à facteur unique — et C3 le creuse de 18 min (37 → 55), il ne
le crée pas. Le compte est désormais un **cliquet publié dans la sortie du test**.

## 10. `T-57` réécrit sur la POPULATION

Ses deux moitiés épinglaient un **état de REEL** (« la décision V2.1 existe », « le manque a
disparu ») là où la propriété est « la borne est comptée dans la CONSTRUCTION ». C3 l'a démontré :
elle retire une nage une semaine sur deux, la borne **cesse de mordre sans avoir été perdue**, et
les deux moitiés rougissaient sur un progrès. Pire, le correctif le moins coûteux qui les garde
vertes est d'**abaisser la cible** — le défaut exact que la décision `manque` existe pour exposer
(règle 19). Mesuré : V2.1 comptée sur **217 plans, dont 54 en tri, 0 sans descente**.

---

## Gates

`batterie` 11/11 · `lotPhysio` 31 verts · 25 rouges attendus · 0 régression · `audit:v1` 459 à 0 ·
golden **990 recapturé** (188 profils = toute la population tri ; 186 ne changent que par la
décision ajoutée, seuls 2 profils doublent) · `sw.js` `eb-pwa-69bd7d44ec29` · E2E 25/25.

**Contre-preuves de T-60**, sur des variantes RÉELLES et non des mutations : C3 sans sa borne →
ZÉRO 32 · C3 en même parité que B2 → 13 sous le plancher.

**Cliquets ré-épinglés avec cause** : S5 504 → **505** · nage seuil du pic 410 901 → **411 251 m**
(la nage perd du FACILE, la part de seuil monte, C26c coupe moins ; VO2 immobile à 8 244).
