# Alternance `facile2` — la pièce écrite, mesurée, RETIRÉE

**Commit** `f60f5f2` · 21/08/2026 · **arbitrage** `ALTERNANCE_FACILE2.md`
**Moteur RETIRÉ** — `src/` byte-identique, diff conservé dans `c3-alternance-facile2.patch`

> Ce lot est le prédécesseur immédiat du plancher de fréquence : c'est lui qui a fait
> recommander de poser le plancher AVANT de reprendre la pièce. La pièce a été reprise et
> livrée bornée au lot suivant (`a12173c`).

---

## 1. La vérification demandée avant d'écrire (ton §3)

`facile2` ne contient pas la même chose selon que le profil double ou non :

| population | contenu de `facile2` |
|---|---|
| profil réel (`doubles: oui`) | **92 % « Nage récup courte »** |
| corpus tri (sans doubles) | nage aérobie 35 % · **nage seuil 30 %** · éducatifs 18 % |

Ton §3 tranchait : *« si c'est une Nage récup courte → excellent échange ; si c'est une séance de
qualité ou un porteur de palier B-17 → ne pas y toucher »*. C3 a donc été bornée à la branche `dbl`
(la récup), avec `b17Pose` prioritaire — **aucun palier annoncé n'est jamais converti**.

---

## 2. Puis la mesure a réfuté la prémisse de la pièce

**Avant C3**, sur les 31 semaines de charge du profil réel :

```
semaines PAIRES    3,50 nages/sem   (1 seule sous 3)
semaines IMPAIRES  2,13 nages/sem   (11 des 15 sous 3)
```

**Le plan alterne déjà** — parce que `B2` (livrée au lot volume+répartition) convertit un double de
nage les semaines **IMPAIRES**. C3 convertissait les **PAIRES** : les deux pièces ne se superposent
pas, elles **pavent les deux parités**, et ensemble elles retirent une nage à **toutes** les semaines
de charge. C'est-à-dire exactement la conversion totale que ton §4 réservait à une décision
ultérieure.

⚠ **Ton §4 avertissait du décalage de phase — son signe était inverse.** *« Si une autre pièce ajoute
de la charge en semaines paires, les deux s'empileront. »* Ce qui arrive n'est pas un empilement sur
une parité (une semaine sur deux serait épargnée) : c'est un pavage des deux, où **aucune semaine
n'est épargnée**.

---

## 3. Les trois états, mesurés à facteur unique

Fixture `REEL/tri/70.3/nage-limitante`, `history: confirme`, 31 semaines de charge, legs de brick
attribués :

| état | pic | total | nage | vélo | course | nages/sem | min | < 3 nages | V2.1 | manque |
|---|---|---|---|---|---|---|---|---|---|---|
| **sans C3** (B2 seule) | 11,2 h | 360,3 h | 28,0 % | 39,9 % | 32,1 % | 2,84 | 1 | **13/31** | présente | absent |
| **C3 en PAIRES** (anti-phase) | **11,5 h** | 373,5 h | 25,0 % | 45,2 % | 29,9 % | 2,35 | 1 | **21/31** | absente | **1,5 h/sem** |
| **C3 en IMPAIRES** (même parité) | 11,1 h | 362,8 h | **23,2 %** | **46,0 %** | 30,8 % | 2,42 | **0** | 16/31 | présente | absent |

### Tes prédictions contre la mesure

```
prédit    alternance   nage ~24 %  vélo ~45 %      mesuré  25,0 / 45,2   ✓
prédit    conversion   nage ~21 %  vélo ~50 %      non mesuré (non écrite)
prédit    séances de nage  4/sem → 4 puis 3
mesuré    séances de nage  3,50 / 2,13  →  2,56 / 2,13
```

**L'estimation des PARTS est bonne à un point près ; celle de la FRÉQUENCE est décalée d'une
séance.** Le plan n'a jamais porté 4 nages par semaine en moyenne.

⚠ **Une erreur à moi, publiée** : j'avais annoncé la variante « même parité » comme *« parts
~inchangées »* — une supposition, pas une mesure. Mesurée, elle va **plus loin** vers la cible
(23,2 %). Elle reste la pire des trois pour une raison qui n'est pas un arbitrage : elle produit
**une semaine de charge à ZÉRO nage** sur un plan de triathlon. Une discipline qui disparaît d'une
semaine n'est pas une part qui baisse.

---

## 4. Le plancher de trois nages était DÉJÀ franchi, et par B2

```
sans C3   13 semaines sur 31 sous 3 nages   —  et 11 des 13 sont des semaines IMPAIRES,
                                               c'est-à-dire celles que B2 convertit déjà
```

Le plancher que tu nommais **n'existait nulle part dans le moteur**, ni avant ni après la pièce. B2
l'a franchi le premier, sur la moitié impaire ; C3 l'étendait à la moitié paire.

---

## 5. Pourquoi la pièce a été RETIRÉE plutôt que livrée

1. **elle dégrade le plancher que tu as nommé** (13/31 → 21/31) ;
2. **son effet n'est pas « l'alternance » mais la conversion totale** — ton §4 la réservait
   explicitement à une décision ultérieure, et la livrer aurait substitué mon jugement à une
   décision réservée ;
3. **elle fait rougir `T-57` sur ses deux branches REEL** (§6).

Ce qu'elle achète est réel et est resté sur la table : **+0,3 h de pic** et **+5,3 points de vélo**.

**Recommandation faite** : poser le plancher de fréquence AVANT de reprendre la pièce — il se pose
de toute façon, et posé d'abord il borne la pièce au lieu d'être franchi par elle. *(C'est ce qui a
été fait au lot suivant.)*

---

## 6. Ce que C3 a révélé sur `T-57`

Attribué par expérience à facteur unique (neutraliser C3 seule) :

```
avec C3     V2.1 ABSENTE   ·  cible de boucle 13 h  ·  livré 11,5  ·  manque 1,5 h/sem DÉCLARÉ
sans C3     V2.1 11,2 h (au lieu de 13,0)  ·  livré 11,2  ·  manque absent
```

**La borne d'épaule n'a pas été perdue** — elle est comptée sur **217 plans du corpus, dont 54 en
tri**. Elle **cesse de mordre sur REEL** parce que C3 retire de la nage : le clone saturé n'atteint
plus le plafond d'épaule, la sonde ne rabat plus, la cible reste à 13, et l'écart au livré redevient
visible.

**Le « manque absent » du lot précédent était donc obtenu parce qu'une PROTECTION avait abaissé la
cible jusqu'au livré, pas parce que le plan plaçait tout.** Les deux lectures sont honnêtes — ce
sont deux questions différentes (« un compte a besoin de son moment ») —, mais `T-57` branche (2)
épinglait un ÉTAT là où la propriété est « l'écart se lit sur la cible de BOUCLE ». Le correctif le
moins coûteux qui garde cet état est d'abaisser la cible : le défaut exact que la décision `manque`
existe pour exposer (règle 19).

---

## 7. Trouvé en passant les gates : `check:sw` était ROUGE sur `main`

Le lot ne touchait aucun fichier servi, et `npm run check:sw` sortait pourtant en échec — donc il
l'était **déjà** :

```
b86df3a   +12 lignes de COMMENTAIRE dans src/engine/constraintMatrix.ts
          → bundlées dans endurabuild/js/engine.js (fichier SERVI)
          → sw.js non reconstruit  →  VERSION inchangée  →  cache-first sert l'ancien
```

**Un changement de COMMENTAIRE dans `src/` change le contenu SERVI.** Troisième habillage d'O-24 ;
le mécanisme a fait son travail. `sw.js` reconstruit (`eb-pwa-330a8da64d24`, 63 assets).

## 8. Règle 17 appliquée — trois blocs `verify` réancrés

`O-94`, `MANQUE-DECLARE` et `V21-BORNE` basculaient en « ne reproduit plus » : leur `attendu` citait
la valeur du jour de leur fermeture, que deux lots ont déplacée. **Un `attendu` chiffré bascule donc
en « défaut réparé » sur un PROGRÈS.** Réancrés sur la propriété, ils publient ce qu'ils trouvent :

```
O-94             structurel 11,2 · pic livré 11,2 · écart 0,1 h · BORNE-COMPTEE
MANQUE-DECLARE   115 déclarent · 871 rien à déclarer · écart max 3,4 h/sem · DEUX-BRANCHES
V21-BORNE        V2.1 comptée sur 218 plans (dont tri 55) · 0 sans descente · BORNE-DANS-LA-CONSTRUCTION
```

⚠ **Une faute de mon écriture** : j'avais posé l'annotation sur la ligne `attendu:` elle-même. Le
parseur coupe chaque ligne au premier `:` — le motif est devenu l'annotation entière, et `V21-BORNE`
est ressorti « ne reproduit plus » alors que sa commande imprimait le bon verdict. **Un faux positif
de règle 17 fabriqué dans le correctif de règle 17.**

---

## Gates

`batterie` 11/11 · `lotPhysio` 31 verts · 24 rouges attendus · 0 régression · `audit:v1` 459 à 0 ·
golden 990/990 · 0 écart · `registry:check` vert · E2E 25/25.
