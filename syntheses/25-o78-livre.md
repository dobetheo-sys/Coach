# 25 — O-78 livré : la sonde ne prête plus de croissance à un bloc sans borne

**Date** : 24/08/2026 · **batterie 12/12** · **0 plan livré changé sur 1 016**
**⚠ L'option (B) n'a pas eu lieu, et c'est une garde du dépôt qui l'a empêchée** — le résultat
est meilleur que les deux options proposées.

---

## Ce qui est livré

Un drapeau levé **uniquement** autour du clone de la re-sonde structurelle : un bloc dont
**aucune borne n'est déclarée** garde **sa taille livrée** au lieu de recevoir `cap: 9999`.
Hors sonde, le comportement est **inchangé** — `blockBounds` n'est pas touché dans le plan, et
la décision déjà prise et refusée trois fois par O-78 (borner le puits) **n'est pas rouverte**.

---

## ⚠ L'option (B) n'était pas livrable : `T-57` la refuse

Ta décision — « livrer le patch, déclarer `S5` en rouge attendu » — reposait sur un état que
**`T-57` branche (3) refuse depuis qu'elle est écrite** :

```
✖ T-57  structurel 9,3 h SOUS le pic livré 11,5 — une capacité que le livré réfute
```

C'est la leçon d'O-94, déjà gardée : **une capacité ne descend jamais sous ce qui a été fait**
(le livré est le témoin, règle 15). Sans plancher, la sonde bornée violait cette propriété, et
la garde l'a attrapé — pas moi.

**Le plancher (O-94, généralisé) rétablit la propriété, et change le verdict du lot :**

| | `S5` | `structurel` réaliste | `argmin = structurel` |
|---|---|---|---|
| avant O-78 | 521 | non — 19,7 h pour 9,78 livrées | 56 / 1 012 |
| option (B), sans plancher | **670** ❌ | oui | 167 / 1 012 |
| **livré** (avec plancher) | **218** ✅ | **oui** | **498 / 1 012** |

**`S5` ne monte pas : il TOMBE de 521 à 218** — la direction que ton brief espérait, obtenue par
l'autre bout. `structurel` étant borné en bas par le pic livré et en haut par des blocs qui ne
grandissent plus sans borne, **il VAUT le pic livré sur bien plus de profils** : l'identité
`min(plafonds) = pic` est satisfaite au lieu d'être contournée.

**Aucun rouge attendu à déclarer. Ta tâche 2 est sans objet — et c'est mieux ainsi.**

---

## Le résultat sur les profils du diagnostic

| profil | `structurel` avant | après | pic livré |
|---|---|---|---|
| `O-21b/run/10k` ×4 | 60,8 h | **4,3 h** | 3,68 h |
| `CYCLE10/run/marathon/inter-competition` | 19,7 h | **9,8 h** | 9,78 h |
| `CYCLE10/bike/gravel/inter-competition` | 19,7 h | **10,0 h** | 10,00 h |
| `CYCLE10/duathlon/L/inter-competition` | 19,9 h | **9,5 h** | 9,45 h |
| `CYCLE10/trail/-/inter-competition` | 19,5 h | **14,3 h** | 10,22 h |

Profils avec `structurel > 1,3 × pic livré` : **13 → 5**.

---

## Ta tâche 4, reconfirmée après intégration finale

**0 plan livré changé sur 1 016.** Empreinte des séances (discipline · nom · minutes · nombre de
steps) calculée sur tout le corpus avant et après l'intégration : **aucune différence**. Le
golden bouge par les **décisions** seules, et il est recapturé.

---

## ⚠ Une conséquence publiée, pas subie

`structurel` devient l'argmin de la chaîne R20.2 sur **498 profils sur 1 012**, contre 56 avant.
La carte « ce qui borne » dit donc bien plus souvent **« le nombre de séances »**.

C'est la lecture juste — un bloc sans borne n'autorise aucune affirmation de capacité, donc la
semaine ne peut pas porter plus. Mais **elle voisine avec O-43** (*« une sortie calculée ne se
relit jamais comme une entrée »*) : le plancher au pic livré rend `structurel` partiellement
dérivé du livré. C'est écrit à la ligne, dans le code, pour que ce soit re-regardé si la carte se
met à dire la même chose partout.

---

## Ta tâche 3 : **O-105 ouvert**

`seal.ts:159` recalcule `Math.min(...actifs)` — un minimum **brut** — alors que le moteur nomme
l'argmin parmi les seuls candidats que l'observation ne réfute pas. **Le garde mesure une
grandeur que le produit n'affiche pas** : deux computations de « le maillon qui borne », libres
de diverger. Forme R11.1, invisible tant que tous les plafonds étaient au-dessus du pic livré.

**Non implémenté ici, comme demandé.** Et le ticket dit ce qu'il faut pour ne pas se tromper plus
tard : **ce lot le rend moins VISIBLE, il ne le corrige pas** — `S5` tombe parce que `structurel`
vaut le pic livré, pas parce que le garde s'est mis à lire la bonne grandeur.

---

## État final des gates

```
npm run batterie   12/12 verts · 0 rouge
audit:v1           459 combinaisons · 0 violation dure
golden:verify      1 016 profils · 0 écart (recapturé)
golden:bundle      1 016 · 0 écart
lotPhysio          32 verts · 25 rouges attendus · 0 régression
                   cliquet S5 ré-épinglé 521 → 218 avec sa cause
plans livrés       0 changement sur 1 016
sw.js              eb-pwa-58054cdee2ab
```

**`S5` n'est PAS listé en rouge attendu** — il est vert, à un cliquet plus bas qu'avant le lot.

---

## Ensuite

L'étape 3 du chantier (courbe et C22 par cycle) peut reprendre sur une base propre :
`structurel` n'affiche plus de valeur aberrante sur les familles touchées par O-78.
