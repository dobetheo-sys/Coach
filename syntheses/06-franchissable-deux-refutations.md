# `franchissable` — les deux prémisses réfutées par la mesure

**Commit** `cd1a483` · 21/08/2026 · **arbitrage** `FRANCHISSABILITE_VACUEUSE.md`
**Moteur INCHANGÉ** — `src/` byte-identique. Lot de mesure.

Ordre demandé : 1. *« qui lit `franchissable`, et que fait-il de `false` ? »* — le point désigné
comme *« le seul des cinq où un mécanisme de sécurité rend le bon verdict et où rien ne
l'utilise »* · 2. le `min()` de livrabilité, **rayon mesuré à part avant de poser**.

**Les deux se sont retournés à la mesure.**

---

## 1. Le verdict n'est PAS ignoré — il est consommé à 100 %

`reasoningEngine.ts:159` porte un consommateur complet : `if (g0.franchissable === false)` → il
cherche le plus long format que la rampe atteint (bornée aux formats **à ou sous** celui demandé —
la garde d'O-57), rabat, publie un `warning` et une décision `B17-continuite`.

```
tri · franchissable = false 14 · = true 146 · = null 28

  parmi les 14 « false » :   10  rabattus
                              4  « le format le plus court est déjà le tien, on construit »
                              0  SANS conséquence
```

Le cas cité dans l'arbitrage est dans les **4** :

```
B17/tri/S/debutant/basse-100m
  gate      satisfait=false · franchissable=false · source=mesure
            departM 200 · atteignableM 354 · courseM 750
  décision  « Continuité de nage à construire | 15 min visées »
  warning   « …tu déclares 2 min de nage en continu (200 m) pour un seuil de 15 min : le format
               le plus court est déjà le tien, ton plan construit cette continuité semaine après
               semaine, et une nage continue à la distance de course avant le jour J n'est pas
               une option. »
```

**Le rabattement ne s'applique pas parce qu'il n'y a nulle part où rabattre** — le sprint EST le
format le plus court — **et le plan le dit**. C'est O-17 dans sa forme exacte : informer, ne pas
bloquer.

### ⚠ C'est ma formulation d'hier qui a produit cette lecture

J'avais écrit : *« l'écart EST déclaré infranchissable et le rabattement ne s'applique pas »*.
Littéralement vrai, et **trompeur par omission** — je n'ai dit ni que le format était déjà le plus
court, ni que le plan publie un avertissement et une décision.

**Un fait vrai présenté sans sa cause se lit comme un défaut.** C'est ce qui a fait désigner ce
point comme le plus grave des cinq.

---

## 2. Le `min()` de livrabilité est INERTE — 0 sur 188, et pour une raison structurelle

Le correctif proposé :

```
atteignableM = min( departM × C22^spanSem , plafond de séance applicable AU PIC )
```

Mesuré avant d'écrire, comme tu le demandais : **0 profil sur 188 bascule**. Et ce n'est pas un
hasard empirique — les deux grandeurs sont **la même projection** :

```
atteignableM             = departM × C22^spanSem
swimSessionCapAtWeek(k)  = min( courseM , departM × C22^(k−1) ) + auxiliaire
```

`min(atteignableM, capPic)` ne peut donc **jamais** descendre sous `courseM` quand `atteignableM`
l'atteint : l'une est la rampe, l'autre est la même rampe plafonnée à la distance de course. La
pièce n'aurait rien borné **et se serait lue comme une garde** — le pire des deux mondes.

C'est exactement le geste que tu avais demandé, et il a évité un quatrième mauvais lot.

### Ce que ça laisse intact, et la contrainte que ça pose

La vacuité que tu décris est **réelle** : sur un plan long, `C22^40 = ×45` donne **26 220 m
atteignables pour une course de 3 800**, et `franchissable` rend `true` sans rien mesurer.

Mais **le plafond de séance n'est pas le bon co-facteur pour la borner**, puisqu'il projette au même
taux. Il en faut un qui **ne dérive PAS de C22** — et il reste à identifier. Le ticket est rouvert
avec cette contrainte écrite dedans.

---

## 3. Ce que la mesure confirme de ton arbitrage

**Le `null` est correct par conception.** 28 profils, source non mesurée, et chacun reçoit la
décision « Évaluation de la nage EN ATTENTE » plus le test prescrit — D3 appliquée. Le défaut de
`B17/tri/S/debutant/inconnue` n'est donc pas le `null` : c'est la **progression plate**, ta cause 3.

**Les causes 3 et 4 restent ouvertes**, non touchées par ce lot :

```
PW/tri/M/plat         550 → 900 → 1225    pour 1500    TRONQUÉE — viole D2
G/tri/Full/vol-min   2275 → 3050 → 2150   pour 3800    NON MONOTONE
```

La seconde est bien la **cinquième inversion de monotonie** du dépôt, sur un cinquième axe : *à
l'intérieur d'une séquence annoncée comme croissante*.

---

## 4. Acquis pour la suite : la décision ment là où les titres ne mentent pas

`T-40` garde le **titre** — aucune séance n'annonce une distance qu'elle ne contient pas, vert.
Mais la **décision** `B17-paliers` annonce « N paliers » et le plan peut livrer N séances
identiques. Un palier implique une montée.

Même famille que `T-40`, autre surface, même correctif : **la décision se dérive du livré**. C'est
le point 3 de ta file.

---

## Garde

Bloc `verify` `franchissable-consomme` au registre : *tout verdict `false` produit une conséquence*
— **14/14 aujourd'hui**, et le critère rougit si un seul devient muet.

## File restante

```
1. ✅ qui lit franchissable                       → consommé à 100 %, prémisse réfutée
2. ✅ le min() de livrabilité                     → inerte par construction, pièce non écrite
                                                     (co-facteur hors-C22 à trouver)
3. ⬜ la décision « N paliers » se dérive du livré   (T-40, surface décision)
4. ⬜ les causes 3 et 4 — tronquée et non monotone
5. ⬜ le cliquet sur les 23 comptes
```

**Aucune ligne de moteur écrite** : `src/` byte-identique, gates inchangés.
